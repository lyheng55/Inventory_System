const express = require('express');
const { PurchaseOrder, PurchaseOrderItem, Product, Supplier, Warehouse, User, Stock, StockMovement } = require('../models');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { validateRequest, purchaseOrderSchema } = require('../middleware/validation');
const { Op } = require('sequelize');
const realtimeService = require('../services/realtimeService');
const mysql = require('mysql2/promise');

const router = express.Router();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_db',
  multipleStatements: true
};

// Generate unique order number using stored procedure logic
const generateOrderNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Get count of orders created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const count = await PurchaseOrder.count({
    where: {
      orderDate: {
        [Op.gte]: startOfDay,
        [Op.lt]: endOfDay
      }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `PO-${year}${month}${day}-${sequence}`;
};

// Calculate purchase order totals using stored procedure
const calculatePurchaseOrderTotals = async (purchaseOrderId) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL CalculatePurchaseOrderTotals(?)',
      [purchaseOrderId]
    );
    
    return results[0][0];
  } catch (error) {
    console.error('Error calculating purchase order totals:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Calculate purchase order item totals using stored procedure
const calculateItemTotals = async (quantity, unitPrice, taxRate = 0, discountPercent = 0) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL CalculatePurchaseOrderItemTotals(?, ?, ?, ?)',
      [quantity, unitPrice, taxRate, discountPercent]
    );
    
    return results[0][0];
  } catch (error) {
    console.error('Error calculating item totals:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get all purchase orders with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const supplierId = req.query.supplierId;
    const warehouseId = req.query.warehouseId;
    const search = req.query.search || '';

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    if (search) {
      whereClause['$Supplier.name$'] = { [Op.like]: `%${search}%` };
    }

    const { count, rows: orders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contactPerson', 'email', 'phone'],
          where: search ? { name: { [Op.like]: `%${search}%` } } : undefined
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit', 'costPrice']
          }]
        }
      ],
      limit,
      offset,
      order: [['orderDate', 'DESC']]
    });

    // Transform numeric fields to ensure they're numbers
    const transformedOrders = orders.map(order => ({
      ...order.toJSON(),
      totalAmount: parseFloat(order.totalAmount) || 0,
      finalAmount: parseFloat(order.finalAmount) || 0,
      taxAmount: parseFloat(order.taxAmount) || 0,
      discountAmount: parseFloat(order.discountAmount) || 0,
      PurchaseOrderItems: order.PurchaseOrderItems?.map(item => ({
        ...item.toJSON(),
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0
      }))
    }));

    res.json({
      orders: transformedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contactPerson', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code', 'address', 'city', 'state', 'zipCode', 'country']
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit', 'costPrice']
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Transform numeric fields to ensure they're numbers
    const transformedOrder = {
      ...order.toJSON(),
      totalAmount: parseFloat(order.totalAmount) || 0,
      finalAmount: parseFloat(order.finalAmount) || 0,
      taxAmount: parseFloat(order.taxAmount) || 0,
      discountAmount: parseFloat(order.discountAmount) || 0,
      PurchaseOrderItems: order.PurchaseOrderItems?.map(item => ({
        ...item.toJSON(),
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0
      }))
    };

    res.json(transformedOrder);

  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new purchase order with optimized calculations
router.post('/', authenticateToken, requireStaff, validateRequest(purchaseOrderSchema), async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const { supplierId, warehouseId, expectedDeliveryDate, notes, items } = req.body;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Calculate totals using stored procedure approach
    let totalAmount = 0;
    const processedItems = [];
    
    for (const item of items) {
      // Calculate item totals using stored procedure
      const itemTotals = await calculateItemTotals(
        item.quantity,
        item.unitPrice,
        item.taxRate || 0,
        item.discountPercent || 0
      );
      
      totalAmount += itemTotals.total_amount;
      
      processedItems.push({
        ...item,
        totalPrice: itemTotals.total_amount,
        subtotal: itemTotals.subtotal,
        taxAmount: itemTotals.tax_amount,
        discountAmount: itemTotals.discount_amount
      });
    }

    // Create purchase order
    const order = await PurchaseOrder.create({
      orderNumber,
      supplierId,
      warehouseId,
      expectedDeliveryDate,
      notes,
      totalAmount,
      finalAmount: totalAmount,
      createdBy: req.user.id,
      status: 'draft'
    }, { transaction });

    // Create order items
    const orderItems = await Promise.all(
      processedItems.map(item => 
        PurchaseOrderItem.create({
          purchaseOrderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxAmount: item.taxAmount || 0,
          discountAmount: item.discountAmount || 0,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber
        }, { transaction })
      )
    );

    await transaction.commit();

    // Fetch the complete order with relations
    const completeOrder = await PurchaseOrder.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contactPerson', 'email', 'phone']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit', 'costPrice']
          }]
        }
      ]
    });

    // Emit real-time notification for new purchase order
    realtimeService.emitNewPurchaseOrder(completeOrder);

    res.status(201).json({
      message: 'Purchase order created successfully',
      order: completeOrder
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update purchase order with optimized calculations
router.put('/:id', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Only allow updates for draft and pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot update order in current status' });
    }

    const { supplierId, warehouseId, expectedDeliveryDate, notes, items } = req.body;

    // Update order details
    await order.update({
      supplierId,
      warehouseId,
      expectedDeliveryDate,
      notes
    }, { transaction });

    // Update items if provided
    if (items) {
      // Delete existing items
      await PurchaseOrderItem.destroy({
        where: { purchaseOrderId: order.id },
        transaction
      });

      // Calculate new totals using stored procedure approach
      let totalAmount = 0;
      const processedItems = [];
      
      for (const item of items) {
        // Calculate item totals using stored procedure
        const itemTotals = await calculateItemTotals(
          item.quantity,
          item.unitPrice,
          item.taxRate || 0,
          item.discountPercent || 0
        );
        
        totalAmount += itemTotals.total_amount;
        
        processedItems.push({
          ...item,
          totalPrice: itemTotals.total_amount,
          subtotal: itemTotals.subtotal,
          taxAmount: itemTotals.tax_amount,
          discountAmount: itemTotals.discount_amount
        });
      }

      // Create new items
      await Promise.all(
        processedItems.map(item => 
          PurchaseOrderItem.create({
            purchaseOrderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxAmount: item.taxAmount || 0,
            discountAmount: item.discountAmount || 0,
            expiryDate: item.expiryDate,
            batchNumber: item.batchNumber
          }, { transaction })
        )
      );

      // Update order totals using stored procedure
      await calculatePurchaseOrderTotals(order.id);
    }

    await transaction.commit();

    // Fetch updated order
    const updatedOrder = await PurchaseOrder.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contactPerson', 'email', 'phone']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit', 'costPrice']
          }]
        }
      ]
    });

    // Emit real-time notification for purchase order update
    realtimeService.emitPurchaseOrderUpdate(order.id, 'updated', {
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    res.json({
      message: 'Purchase order updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve purchase order
router.post('/:id/approve', authenticateToken, requireStaff, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be approved' });
    }

    await order.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    // Emit real-time notification for purchase order approval
    realtimeService.emitPurchaseOrderUpdate(order.id, 'approved', {
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    res.json({
      message: 'Purchase order approved successfully',
      order
    });

  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process order receipt with stock updates
router.post('/:id/receive', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const { receivedItems } = req.body;
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{
        model: PurchaseOrderItem,
        include: [{
          model: Product,
          attributes: ['id', 'name', 'sku']
        }]
      }]
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (!['approved', 'partial'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order cannot be received in current status' });
    }

    // Process each received item
    for (const receivedItem of receivedItems) {
      const orderItem = order.PurchaseOrderItems.find(
        item => item.id === receivedItem.orderItemId
      );

      if (!orderItem) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Order item not found' });
      }

      // Update received quantity
      const newReceivedQuantity = orderItem.receivedQuantity + receivedItem.quantity;
      await orderItem.update({
        receivedQuantity: newReceivedQuantity
      }, { transaction });

      // Update stock using stored procedure
      let connection;
      try {
        connection = await mysql.createConnection(dbConfig);
        
        await connection.execute(
          'CALL CalculateStockMovementImpact(?, ?, ?, ?, ?, ?, ?)',
          [
            orderItem.productId,
            order.warehouseId,
            'in',
            receivedItem.quantity,
            'Purchase Order Receipt',
            `PO: ${order.orderNumber}`,
            req.user.id
          ]
        );
      } catch (error) {
        console.error('Error updating stock:', error);
        throw error;
      } finally {
        if (connection) {
          await connection.end();
        }
      }
    }

    // Check if all items are fully received
    const allItemsReceived = order.PurchaseOrderItems.every(
      item => item.receivedQuantity >= item.quantity
    );

    // Update order status
    await order.update({
      status: allItemsReceived ? 'received' : 'partial',
      actualDeliveryDate: new Date()
    }, { transaction });

    await transaction.commit();

    // Emit real-time notification for order receipt
    realtimeService.emitPurchaseOrderUpdate(order.id, 'received', {
      receivedBy: req.user.id,
      receivedAt: new Date()
    });

    res.json({
      message: 'Order items received successfully',
      order
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Receive order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel purchase order
router.post('/:id/cancel', authenticateToken, requireStaff, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (!['draft', 'pending', 'approved'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled in current status' });
    }

    await order.update({
      status: 'cancelled',
      cancelledBy: req.user.id,
      cancelledAt: new Date()
    });

    // Emit real-time notification for order cancellation
    realtimeService.emitPurchaseOrderUpdate(order.id, 'cancelled', {
      cancelledBy: req.user.id,
      cancelledAt: new Date()
    });

    res.json({
      message: 'Purchase order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
