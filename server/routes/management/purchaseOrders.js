const express = require('express');
const { PurchaseOrder, PurchaseOrderItem, Product, Supplier, Warehouse, User, Stock, StockMovement } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, purchaseOrderSchema } = require('../../middleware/validation');
const { Op } = require('sequelize');
const realtimeService = require('../../services/realtimeService');

const router = express.Router();

// Generate unique order number
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
      whereClause[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: orders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
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
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
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
          attributes: ['id', 'name', 'code', 'address', 'city', 'state']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'approver',
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

// Create new purchase order
router.post('/', authenticateToken, requireStaff, validateRequest(purchaseOrderSchema), async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const { supplierId, warehouseId, expectedDeliveryDate, notes, items } = req.body;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Calculate totals
    let totalAmount = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      totalAmount += itemTotal;
      return {
        ...item,
        totalPrice: itemTotal
      };
    });

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
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
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
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update purchase order
router.put('/:id', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem }]
    });

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

      // Calculate new totals
      let totalAmount = 0;
      const processedItems = items.map(item => {
        const itemTotal = item.quantity * item.unitPrice;
        totalAmount += itemTotal;
        return {
          ...item,
          totalPrice: itemTotal
        };
      });

      // Create new items
      await Promise.all(
        processedItems.map(item => 
          PurchaseOrderItem.create({
            purchaseOrderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            expiryDate: item.expiryDate,
            batchNumber: item.batchNumber
          }, { transaction })
        )
      );

      // Update order totals
      await order.update({
        totalAmount,
        finalAmount: totalAmount
      }, { transaction });
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
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ]
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

    if (order.status !== 'draft' && order.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be approved in current status' });
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

// Process order receipt
router.post('/:id/receive', authenticateToken, requireStaff, async (req, res) => {
  const transaction = await PurchaseOrder.sequelize.transaction();
  
  try {
    const { receivedItems } = req.body;
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem }]
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status !== 'approved' && order.status !== 'ordered') {
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

      // Update stock
      let stock = await Stock.findOne({
        where: {
          productId: orderItem.productId,
          warehouseId: order.warehouseId,
          location: receivedItem.location || null,
          batchNumber: receivedItem.batchNumber || null
        }
      });

      if (stock) {
        await stock.update({
          quantity: stock.quantity + receivedItem.quantity
        }, { transaction });
      } else {
        stock = await Stock.create({
          productId: orderItem.productId,
          warehouseId: order.warehouseId,
          quantity: receivedItem.quantity,
          location: receivedItem.location,
          expiryDate: receivedItem.expiryDate,
          batchNumber: receivedItem.batchNumber
        }, { transaction });
      }

      // Record stock movement
      await StockMovement.create({
        productId: orderItem.productId,
        warehouseId: order.warehouseId,
        movementType: 'in',
        quantity: receivedItem.quantity,
        previousQuantity: stock.quantity - receivedItem.quantity,
        newQuantity: stock.quantity,
        referenceType: 'purchase_order',
        referenceId: order.id,
        reason: 'Purchase order receipt',
        notes: `Received from PO: ${order.orderNumber}`,
        performedBy: req.user.id
      }, { transaction });
    }

    // Check if all items are fully received
    const allItemsReceived = order.PurchaseOrderItems.every(
      item => item.receivedQuantity >= item.quantity
    );

    if (allItemsReceived) {
      await order.update({
        status: 'received',
        actualDeliveryDate: new Date()
      }, { transaction });
    } else {
      await order.update({
        status: 'ordered'
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      message: 'Order receipt processed successfully',
      order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Process order receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel purchase order
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (!['draft', 'pending', 'approved'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled in current status' });
    }

    await order.update({
      status: 'cancelled'
    });

    res.json({
      message: 'Purchase order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get purchase order items
router.get('/:id/items', authenticateToken, async (req, res) => {
  try {
    const items = await PurchaseOrderItem.findAll({
      where: { purchaseOrderId: req.params.id },
      include: [{
        model: Product,
        attributes: ['id', 'name', 'sku', 'unit', 'costPrice']
      }]
    });

    res.json(items);
  } catch (error) {
    console.error('Get purchase order items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
