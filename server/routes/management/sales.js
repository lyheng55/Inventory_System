const express = require('express');
const { Sale, SaleItem, Product, Warehouse, User, Stock, StockMovement } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { Op } = require('sequelize');
const realtimeService = require('../../services/realtimeService');

const router = express.Router();

// Generate unique sale number
const generateSaleNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Get count of sales created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const count = await Sale.count({
    where: {
      saleDate: {
        [Op.gte]: startOfDay,
        [Op.lt]: endOfDay
      }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `SALE-${year}${month}${day}-${sequence}`;
};

// Get all sales with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const warehouseId = req.query.warehouseId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = req.query.search || '';

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      whereClause.saleDate = {};
      if (startDate) {
        whereClause.saleDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.saleDate[Op.lte] = new Date(endDate);
      }
    }

    if (search) {
      whereClause[Op.or] = [
        { saleNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: sales } = await Sale.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'voider',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: SaleItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ],
      limit,
      offset,
      order: [['saleDate', 'DESC']]
    });

    // Transform numeric fields to ensure they're numbers
    const transformedSales = sales.map(sale => ({
      ...sale.toJSON(),
      subtotal: parseFloat(sale.subtotal) || 0,
      totalAmount: parseFloat(sale.totalAmount) || 0,
      taxAmount: parseFloat(sale.taxAmount) || 0,
      discountAmount: parseFloat(sale.discountAmount) || 0,
      paymentAmount: parseFloat(sale.paymentAmount) || 0,
      changeAmount: parseFloat(sale.changeAmount) || 0,
      SaleItems: sale.SaleItems?.map(item => ({
        ...item.toJSON(),
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0,
        discount: parseFloat(item.discount) || 0
      }))
    }));

    res.json({
      sales: transformedSales,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single sale transaction details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code', 'address', 'city', 'state']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'voider',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: SaleItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit', 'unitPrice', 'image']
          }]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Transform numeric fields
    const transformedSale = {
      ...sale.toJSON(),
      subtotal: parseFloat(sale.subtotal) || 0,
      totalAmount: parseFloat(sale.totalAmount) || 0,
      taxAmount: parseFloat(sale.taxAmount) || 0,
      discountAmount: parseFloat(sale.discountAmount) || 0,
      paymentAmount: parseFloat(sale.paymentAmount) || 0,
      changeAmount: parseFloat(sale.changeAmount) || 0,
      SaleItems: sale.SaleItems?.map(item => ({
        ...item.toJSON(),
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0,
        discount: parseFloat(item.discount) || 0
      }))
    };

    res.json(transformedSale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available products for sale
router.get('/products/available', authenticateToken, async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId;
    const search = req.query.search || '';

    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required' });
    }

    const whereClause = {
      isActive: true
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Stock,
          where: {
            warehouseId: warehouseId,
            quantity: { [Op.gt]: 0 }
          },
          required: true,
          attributes: ['id', 'quantity', 'reservedQuantity']
        }
      ],
      attributes: ['id', 'name', 'sku', 'unit', 'unitPrice', 'barcode', 'image'],
      limit: 50
    });

    const availableProducts = products.map(product => {
      const stock = product.Stocks[0];
      const availableQuantity = stock.quantity - stock.reservedQuantity;
      
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        unitPrice: parseFloat(product.unitPrice) || 0,
        barcode: product.barcode,
        image: product.image,
        availableQuantity: availableQuantity,
        stockQuantity: stock.quantity
      };
    });

    res.json({ products: availableProducts });
  } catch (error) {
    console.error('Get available products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sale transaction
router.post('/', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await Sale.sequelize.transaction();
  
  try {
    const { 
      warehouseId, 
      items, 
      subtotal, 
      taxAmount, 
      discountAmount, 
      totalAmount,
      paymentMethod,
      paymentAmount,
      customerName,
      customerEmail,
      customerPhone,
      notes
    } = req.body;

    if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'warehouseId and items are required' });
    }

    // Validate stock availability
    for (const item of items) {
      const stock = await Stock.findOne({
        where: {
          productId: item.productId,
          warehouseId: warehouseId
        },
        transaction
      });

      if (!stock) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Stock not found for product ID ${item.productId} in warehouse ${warehouseId}` 
        });
      }

      if (stock.quantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for product ID ${item.productId}. Available: ${stock.quantity}, Requested: ${item.quantity}` 
        });
      }
    }

    // Generate sale number
    const saleNumber = await generateSaleNumber();

    // Calculate change amount
    const changeAmount = Math.max(0, paymentAmount - totalAmount);

    // Create sale
    const sale = await Sale.create({
      saleNumber,
      warehouseId,
      subtotal: subtotal || 0,
      taxAmount: taxAmount || 0,
      discountAmount: discountAmount || 0,
      totalAmount: totalAmount || 0,
      paymentMethod: paymentMethod || 'cash',
      paymentAmount: paymentAmount || totalAmount,
      changeAmount,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      soldBy: req.user.id,
      status: 'completed'
    }, { transaction });

    // Create sale items and update stock
    const saleItems = [];
    for (const item of items) {
      // Create sale item
      const saleItem = await SaleItem.create({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        totalPrice: item.totalPrice
      }, { transaction });
      saleItems.push(saleItem);

      // Update stock
      const stock = await Stock.findOne({
        where: {
          productId: item.productId,
          warehouseId: warehouseId
        },
        transaction
      });

      if (!stock) {
        throw new Error(`Stock not found for product ID ${item.productId} in warehouse ${warehouseId}`);
      }

      const previousQuantity = stock.quantity;
      const newQuantity = previousQuantity - item.quantity;

      if (newQuantity < 0) {
        throw new Error(`Insufficient stock for product ID ${item.productId}. Cannot have negative quantity.`);
      }

      await stock.update({
        quantity: newQuantity
      }, { transaction });

      // Create stock movement record
      await StockMovement.create({
        productId: item.productId,
        warehouseId: warehouseId,
        movementType: 'out',
        quantity: item.quantity,
        previousQuantity,
        newQuantity,
        referenceType: 'sale',
        referenceId: sale.id,
        reason: 'Sale transaction',
        performedBy: req.user.id
      }, { transaction });

      // Emit real-time stock update for this product
      try {
        realtimeService.emitStockUpdate(
          item.productId,
          warehouseId,
          newQuantity,
          previousQuantity,
          'out'
        );
      } catch (emitError) {
        console.error('Error emitting stock update:', emitError);
        // Don't fail the sale if realtime update fails
      }
    }

    await transaction.commit();

    // Fetch the complete sale with relations
    const completeSale = await Sale.findByPk(sale.id, {
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: SaleItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ]
    });

    // Emit real-time notification for new sale
    if (req.io) {
      req.io.emit('sale:created', completeSale);
    }

    res.status(201).json({
      message: 'Sale transaction completed successfully',
      sale: completeSale
    });
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    console.error('Create sale error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while processing the sale'
    });
  }
});

// Process checkout with payment
router.post('/checkout', authenticateToken, requireStaff, async (req, res) => {
  // This is an alias for POST /sales
  // Redirect to the main create endpoint
  req.url = '/';
  router.handle(req, res);
});

// Void a sale transaction
router.post('/:id/void', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await Sale.sequelize.transaction();
  
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem }],
      transaction
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.status === 'void') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Sale is already voided' });
    }

    const { voidReason } = req.body;

    // Restore stock for each item
    for (const item of sale.SaleItems) {
      const stock = await Stock.findOne({
        where: {
          productId: item.productId,
          warehouseId: sale.warehouseId
        },
        transaction
      });

      if (stock) {
        const previousQuantity = stock.quantity;
        const newQuantity = previousQuantity + item.quantity;

        await stock.update({
          quantity: newQuantity
        }, { transaction });

        // Create stock movement record for void
        await StockMovement.create({
          productId: item.productId,
          warehouseId: sale.warehouseId,
          movementType: 'in',
          quantity: item.quantity,
          previousQuantity,
          newQuantity,
          referenceType: 'return',
          referenceId: sale.id,
          reason: 'Sale voided',
          performedBy: req.user.id
        }, { transaction });

        // Emit real-time stock update for this product
        try {
          realtimeService.emitStockUpdate(
            item.productId,
            sale.warehouseId,
            newQuantity,
            previousQuantity,
            'in'
          );
        } catch (emitError) {
          console.error('Error emitting stock update:', emitError);
          // Don't fail the void if realtime update fails
        }
      }
    }

    // Update sale status
    await sale.update({
      status: 'void',
      voidedBy: req.user.id,
      voidedAt: new Date(),
      voidReason: voidReason || 'Voided by user'
    }, { transaction });

    await transaction.commit();

    // Emit real-time notification
    if (req.io) {
      req.io.emit('sale:voided', sale);
    }

    res.json({
      message: 'Sale voided successfully',
      sale: sale
    });
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    console.error('Void sale error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate sale receipt
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code', 'address', 'city', 'state', 'zipCode']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: SaleItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Format receipt data
    const receipt = {
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      warehouse: sale.Warehouse,
      seller: sale.seller,
      items: sale.SaleItems.map(item => ({
        product: item.Product,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0
      })),
      subtotal: parseFloat(sale.subtotal) || 0,
      taxAmount: parseFloat(sale.taxAmount) || 0,
      discountAmount: parseFloat(sale.discountAmount) || 0,
      totalAmount: parseFloat(sale.totalAmount) || 0,
      paymentMethod: sale.paymentMethod,
      paymentAmount: parseFloat(sale.paymentAmount) || 0,
      changeAmount: parseFloat(sale.changeAmount) || 0,
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone
    };

    res.json({ receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily sales summary
router.get('/daily-summary', authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const warehouseId = req.query.warehouseId;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause = {
      saleDate: {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay
      },
      status: 'completed'
    };

    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const sales = await Sale.findAll({
      where: whereClause,
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: SaleItem,
          include: [{
            model: Product,
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    const summary = {
      date,
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0),
      totalSubtotal: sales.reduce((sum, sale) => sum + parseFloat(sale.subtotal || 0), 0),
      totalTax: sales.reduce((sum, sale) => sum + parseFloat(sale.taxAmount || 0), 0),
      totalDiscount: sales.reduce((sum, sale) => sum + parseFloat(sale.discountAmount || 0), 0),
      paymentMethods: {
        cash: sales.filter(s => s.paymentMethod === 'cash').length,
        card: sales.filter(s => s.paymentMethod === 'card').length,
        other: sales.filter(s => s.paymentMethod === 'other').length
      },
      sales: sales.map(sale => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        saleDate: sale.saleDate,
        warehouse: sale.Warehouse,
        totalAmount: parseFloat(sale.totalAmount) || 0,
        paymentMethod: sale.paymentMethod
      }))
    };

    res.json({ summary });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

