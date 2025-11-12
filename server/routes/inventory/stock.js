const express = require('express');
const { Stock, Product, Warehouse, StockMovement, User } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, stockMovementSchema, stockAdjustmentSchema } = require('../../middleware/validation');
const { Op } = require('sequelize');
const realtimeService = require('../../services/realtimeService');

const router = express.Router();

// Test endpoint to verify route is accessible
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Stock route is working',
    timestamp: new Date().toISOString()
  });
});

// Get all stock with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const warehouseId = req.query.warehouseId;
    const lowStock = req.query.lowStock === 'true';
    const search = req.query.search || '';

    const whereClause = {};

    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    if (search) {
      whereClause['$Product.name$'] = { [Op.like]: `%${search}%` };
    }

    const { count, rows: stocks } = await Stock.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'sku', 'reorderPoint', 'minStockLevel'],
          where: search ? { name: { [Op.like]: `%${search}%` } } : undefined
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      limit,
      offset,
      order: [['quantity', 'DESC']]
    });

    // Filter low stock items if requested
    let filteredStocks = stocks;
    if (lowStock) {
      filteredStocks = stocks.filter(stock => 
        stock.quantity <= stock.Product.reorderPoint
      );
    }

    res.json({
      stocks: filteredStocks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock for specific product
router.get('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const stocks = await Stock.findAll({
      where: { productId: req.params.productId },
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['quantity', 'DESC']]
    });

    const totalStock = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const totalAvailable = stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);

    res.json({
      stocks,
      summary: {
        totalStock,
        totalAvailable,
        totalReserved: totalStock - totalAvailable
      }
    });
  } catch (error) {
    console.error('Get product stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Adjust stock quantity
router.post('/adjust', authenticateToken, requireStaff, validateRequest(stockAdjustmentSchema), async (req, res) => {
  console.log('📦 Stock adjustment request received:', {
    productId: req.body.productId,
    warehouseId: req.body.warehouseId,
    quantity: req.body.quantity,
    userId: req.user?.id
  });
  
  const transaction = await Stock.sequelize.transaction();
  
  try {
    const { productId, warehouseId, quantity, reason, notes, location, expiryDate, batchNumber } = req.body;

    // Normalize empty strings to null for optional fields
    const normalizedLocation = location && location.trim() !== '' ? location.trim() : null;
    const normalizedBatchNumber = batchNumber && batchNumber.trim() !== '' ? batchNumber.trim() : null;
    const normalizedExpiryDate = expiryDate || null;

    // Find existing stock record (only by productId and warehouseId, as these are the unique constraint)
    let stock = await Stock.findOne({
      where: { 
        productId, 
        warehouseId
      },
      transaction
    });

    const previousQuantity = stock ? stock.quantity : 0;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Insufficient stock for this adjustment' });
    }

    // Create or update stock
    if (stock) {
      // Update existing stock, optionally update location/batch/expiry if provided
      const updateData = { quantity: newQuantity };
      if (normalizedLocation !== null) updateData.location = normalizedLocation;
      if (normalizedBatchNumber !== null) updateData.batchNumber = normalizedBatchNumber;
      if (normalizedExpiryDate !== null) updateData.expiryDate = normalizedExpiryDate;
      
      await stock.update(updateData, { transaction });
    } else {
      // Create new stock record
      stock = await Stock.create({
        productId,
        warehouseId,
        quantity: newQuantity,
        location: normalizedLocation,
        expiryDate: normalizedExpiryDate,
        batchNumber: normalizedBatchNumber
      }, { transaction });
    }

    // Record stock movement
    await StockMovement.create({
      productId,
      warehouseId,
      movementType: quantity > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity),
      previousQuantity,
      newQuantity,
      referenceType: 'adjustment',
      reason: reason || 'Stock adjustment',
      notes: notes || null,
      performedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    // Operations after transaction commit (these should not cause transaction rollback)
    try {
      // Emit real-time stock update
      realtimeService.emitStockUpdate(
        productId,
        warehouseId,
        newQuantity,
        previousQuantity,
        quantity > 0 ? 'in' : 'out'
      );

      // Check for low stock alert
      const product = await Product.findByPk(productId);
      if (product && newQuantity <= product.reorderPoint) {
        realtimeService.emitLowStockAlert(
          productId,
          product.name,
          newQuantity,
          product.reorderPoint,
          warehouseId
        );
      }

      // Refresh stock to get latest data
      await stock.reload();

      console.log('✅ Stock adjustment successful:', {
        productId,
        warehouseId,
        previousQuantity,
        newQuantity
      });

      res.json({
        message: 'Stock adjusted successfully',
        stock: {
          ...stock.toJSON(),
          availableQuantity: stock.availableQuantity
        }
      });
    } catch (postCommitError) {
      // Log post-commit errors but don't fail the request since transaction already succeeded
      console.error('⚠️ Post-commit error (transaction already committed):', postCommitError);
      
      // Still return success since the database transaction was successful
      res.json({
        message: 'Stock adjusted successfully',
        stock: {
          ...stock.toJSON(),
          availableQuantity: stock.availableQuantity
        },
        warning: 'Stock adjusted but some notifications may not have been sent'
      });
    }
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    console.error('❌ Adjust stock error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      transactionFinished: transaction.finished
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adjusting stock'
    });
  }
});

// Transfer stock between warehouses
router.post('/transfer', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, location, notes } = req.body;

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ error: 'Source and destination warehouses cannot be the same' });
    }

    // Check source stock
    const sourceStock = await Stock.findOne({
      where: { productId, warehouseId: fromWarehouseId }
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock in source warehouse' });
    }

    // Update source stock
    await sourceStock.update({
      quantity: sourceStock.quantity - quantity
    });

    // Find or create destination stock
    let destStock = await Stock.findOne({
      where: { productId, warehouseId: toWarehouseId, location }
    });

    if (destStock) {
      await destStock.update({
        quantity: destStock.quantity + quantity
      });
    } else {
      destStock = await Stock.create({
        productId,
        warehouseId: toWarehouseId,
        quantity,
        location
      });
    }

    // Record stock movements
    await StockMovement.create({
      productId,
      warehouseId: fromWarehouseId,
      movementType: 'out',
      quantity,
      previousQuantity: sourceStock.quantity + quantity,
      newQuantity: sourceStock.quantity,
      referenceType: 'transfer',
      reason: 'Stock transfer',
      notes: `Transferred to warehouse ${toWarehouseId}. ${notes || ''}`,
      performedBy: req.user.id
    });

    await StockMovement.create({
      productId,
      warehouseId: toWarehouseId,
      movementType: 'in',
      quantity,
      previousQuantity: destStock.quantity - quantity,
      newQuantity: destStock.quantity,
      referenceType: 'transfer',
      reason: 'Stock transfer',
      notes: `Transferred from warehouse ${fromWarehouseId}. ${notes || ''}`,
      performedBy: req.user.id
    });

    // Emit real-time stock updates for both warehouses
    realtimeService.emitStockUpdate(
      productId,
      fromWarehouseId,
      sourceStock.quantity,
      sourceStock.quantity + quantity,
      'out'
    );

    realtimeService.emitStockUpdate(
      productId,
      toWarehouseId,
      destStock.quantity,
      destStock.quantity - quantity,
      'in'
    );

    res.json({
      message: 'Stock transferred successfully',
      transfer: {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        sourceStock: sourceStock.quantity,
        destStock: destStock.quantity
      }
    });
  } catch (error) {
    console.error('Transfer stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock movements
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const productId = req.query.productId;
    const warehouseId = req.query.warehouseId;
    const movementType = req.query.movementType;

    const whereClause = {};

    if (productId) whereClause.productId = productId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (movementType) whereClause.movementType = movementType;

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'sku']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'performer',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      limit,
      offset,
      order: [['movementDate', 'DESC']]
    });

    res.json({
      movements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const allStockItems = await Stock.findAll({
      include: [
        {
          model: Product,
          where: {
            isActive: true
          },
          attributes: ['id', 'name', 'sku', 'reorderPoint', 'minStockLevel']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    const lowStockItems = allStockItems.filter(item => item.quantity <= item.Product.reorderPoint);

    const alerts = lowStockItems.map(item => ({
      productId: item.productId,
      productName: item.Product.name,
      sku: item.Product.sku,
      warehouseId: item.warehouseId,
      warehouseName: item.Warehouse.name,
      currentStock: item.quantity,
      reorderPoint: item.Product.reorderPoint,
      minStockLevel: item.Product.minStockLevel,
      needsReorder: item.quantity <= item.Product.reorderPoint,
      critical: item.quantity <= item.Product.minStockLevel
    }));

    res.json({ alerts });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
