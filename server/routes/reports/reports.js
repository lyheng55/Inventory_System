const express = require('express');
const { Product, Category, Stock, Warehouse, StockMovement, PurchaseOrder, PurchaseOrderItem, Supplier, User } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

// Helper function to get date range
const getDateRange = (req) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  // Set time to start/end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

// Stock level reports
router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, categoryId, lowStockOnly } = req.query;
    let lowStockFilter = false;
    
    const whereClause = {};
    const productWhereClause = { isActive: true };
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }
    
    if (categoryId) {
      productWhereClause.categoryId = categoryId;
    }
    
    if (lowStockOnly === 'true') {
      // Filter low stock items after query
      lowStockFilter = true;
    }

    const stocks = await Stock.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          where: productWhereClause,
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }]
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['quantity', 'ASC']]
    });

    // Calculate summary statistics
    const totalProducts = stocks.length;
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const lowStockCount = stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint).length;
    const outOfStockCount = stocks.filter(stock => stock.quantity === 0).length;
    
    // Calculate total value
    const totalValue = stocks.reduce((sum, stock) => {
      return sum + (stock.quantity * (stock.Product.costPrice || 0));
    }, 0);

    // Group by category
    const categorySummary = stocks.reduce((acc, stock) => {
      const categoryName = stock.Product.Category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          count: 0,
          quantity: 0,
          value: 0,
          lowStock: 0
        };
      }
      acc[categoryName].count++;
      acc[categoryName].quantity += stock.quantity;
      acc[categoryName].value += stock.quantity * (stock.Product.costPrice || 0);
      if (stock.quantity <= stock.Product.reorderPoint) {
        acc[categoryName].lowStock++;
      }
      return acc;
    }, {});

    res.json({
      summary: {
        totalProducts,
        totalQuantity,
        totalValue,
        lowStockCount,
        outOfStockCount,
        averageStockLevel: totalProducts > 0 ? totalQuantity / totalProducts : 0
      },
      categorySummary,
      stocks: (lowStockFilter ? stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint) : stocks).map(stock => ({
        id: stock.id,
        productName: stock.Product.name,
        productSku: stock.Product.sku,
        category: stock.Product.Category?.name,
        warehouse: stock.Warehouse.name,
        quantity: stock.quantity,
        reorderPoint: stock.Product.reorderPoint,
        costPrice: stock.Product.costPrice,
        totalValue: stock.quantity * (stock.Product.costPrice || 0),
        isLowStock: stock.quantity <= stock.Product.reorderPoint,
        location: stock.location
      }))
    });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stock movement reports
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { productId, warehouseId, movementType, page = 1, limit = 50 } = req.query;
    
    const whereClause = {
      movementDate: {
        [Op.between]: [startDate, endDate]
      }
    };
    
    if (productId) whereClause.productId = productId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (movementType) whereClause.movementType = movementType;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
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
      limit: parseInt(limit),
      offset,
      order: [['movementDate', 'DESC']]
    });

    // Calculate summary statistics
    const totalMovements = count;
    const totalInQuantity = movements
      .filter(m => m.movementType === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalOutQuantity = movements
      .filter(m => m.movementType === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);
    
    // Group by movement type
    const movementTypeSummary = movements.reduce((acc, movement) => {
      if (!acc[movement.movementType]) {
        acc[movement.movementType] = { count: 0, quantity: 0 };
      }
      acc[movement.movementType].count++;
      acc[movement.movementType].quantity += movement.quantity;
      return acc;
    }, {});

    // Group by product
    const productSummary = movements.reduce((acc, movement) => {
      const productName = movement.Product.name;
      if (!acc[productName]) {
        acc[productName] = { in: 0, out: 0, net: 0 };
      }
      if (movement.movementType === 'in') {
        acc[productName].in += movement.quantity;
        acc[productName].net += movement.quantity;
      } else {
        acc[productName].out += movement.quantity;
        acc[productName].net -= movement.quantity;
      }
      return acc;
    }, {});

    res.json({
      summary: {
        totalMovements,
        totalInQuantity,
        totalOutQuantity,
        netQuantity: totalInQuantity - totalOutQuantity,
        dateRange: { startDate, endDate }
      },
      movementTypeSummary,
      productSummary,
      movements: movements.map(movement => ({
        id: movement.id,
        productName: movement.Product.name,
        productSku: movement.Product.sku,
        warehouse: movement.Warehouse.name,
        movementType: movement.movementType,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        reason: movement.reason,
        notes: movement.notes,
        movementDate: movement.movementDate,
        performer: movement.performer ? 
          `${movement.performer.firstName} ${movement.performer.lastName}` : 
          'System'
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Stock movements report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Low stock alerts report
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, categoryId, criticalOnly } = req.query;
    
    const whereClause = {};
    const productWhereClause = { isActive: true };
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }
    
    if (categoryId) {
      productWhereClause.categoryId = categoryId;
    }
    
    // Filter will be applied after query

    const lowStockItems = await Stock.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          where: productWhereClause,
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }]
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['quantity', 'ASC']]
    });

    const filteredItems = criticalOnly === 'true' 
      ? lowStockItems.filter(item => item.quantity <= item.Product.minStockLevel)
      : lowStockItems.filter(item => item.quantity <= item.Product.reorderPoint);

    const alerts = filteredItems.map(item => {
      const isCritical = item.quantity <= item.Product.minStockLevel;
      const daysUntilReorder = item.Product.reorderPoint > 0 ? 
        Math.ceil(item.quantity / (item.Product.reorderPoint / 30)) : 0; // Rough estimate
      
      return {
        productId: item.productId,
        productName: item.Product.name,
        productSku: item.Product.sku,
        category: item.Product.Category?.name,
        warehouse: item.Warehouse.name,
        currentStock: item.quantity,
        reorderPoint: item.Product.reorderPoint,
        minStockLevel: item.Product.minStockLevel,
        isCritical,
        daysUntilReorder,
        suggestedOrderQuantity: Math.max(
          item.Product.reorderPoint * 2 - item.quantity,
          item.Product.reorderPoint
        ),
        costPrice: item.Product.costPrice,
        estimatedCost: (item.Product.reorderPoint * 2 - item.quantity) * (item.Product.costPrice || 0)
      };
    });

    // Summary statistics
    const criticalCount = alerts.filter(alert => alert.isCritical).length;
    const totalEstimatedCost = alerts.reduce((sum, alert) => sum + alert.estimatedCost, 0);
    
    // Group by category
    const categoryAlerts = alerts.reduce((acc, alert) => {
      const category = alert.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, critical: 0, estimatedCost: 0 };
      }
      acc[category].count++;
      if (alert.isCritical) acc[category].critical++;
      acc[category].estimatedCost += alert.estimatedCost;
      return acc;
    }, {});

    res.json({
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: criticalCount,
        totalEstimatedCost,
        averageDaysUntilReorder: alerts.length > 0 ? 
          alerts.reduce((sum, alert) => sum + alert.daysUntilReorder, 0) / alerts.length : 0
      },
      categoryAlerts,
      alerts
    });
  } catch (error) {
    console.error('Low stock alerts report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory valuation report
router.get('/inventory-value', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, categoryId, valuationMethod = 'cost' } = req.query;
    
    const whereClause = {};
    const productWhereClause = { isActive: true };
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }
    
    if (categoryId) {
      productWhereClause.categoryId = categoryId;
    }

    const stocks = await Stock.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          where: productWhereClause,
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }]
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    const valuationData = stocks.map(stock => {
      const costValue = stock.quantity * (stock.Product.costPrice || 0);
      const retailValue = stock.quantity * (stock.Product.unitPrice || 0);
      const profitMargin = stock.Product.unitPrice && stock.Product.costPrice ? 
        ((stock.Product.unitPrice - stock.Product.costPrice) / stock.Product.unitPrice) * 100 : 0;
      
      return {
        productId: stock.productId,
        productName: stock.Product.name,
        productSku: stock.Product.sku,
        category: stock.Product.Category?.name,
        warehouse: stock.Warehouse.name,
        quantity: stock.quantity,
        costPrice: stock.Product.costPrice,
        unitPrice: stock.Product.unitPrice,
        costValue,
        retailValue,
        profitMargin,
        profitAmount: retailValue - costValue
      };
    });

    // Calculate totals
    const totalCostValue = valuationData.reduce((sum, item) => sum + item.costValue, 0);
    const totalRetailValue = valuationData.reduce((sum, item) => sum + item.retailValue, 0);
    const totalProfitAmount = valuationData.reduce((sum, item) => sum + item.profitAmount, 0);
    const averageProfitMargin = valuationData.length > 0 ? 
      valuationData.reduce((sum, item) => sum + item.profitMargin, 0) / valuationData.length : 0;

    // Group by category
    const categoryValuation = valuationData.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalQuantity: 0,
          costValue: 0,
          retailValue: 0,
          profitAmount: 0
        };
      }
      acc[category].count++;
      acc[category].totalQuantity += item.quantity;
      acc[category].costValue += item.costValue;
      acc[category].retailValue += item.retailValue;
      acc[category].profitAmount += item.profitAmount;
      return acc;
    }, {});

    // Group by warehouse
    const warehouseValuation = valuationData.reduce((acc, item) => {
      const warehouse = item.warehouse;
      if (!acc[warehouse]) {
        acc[warehouse] = {
          count: 0,
          totalQuantity: 0,
          costValue: 0,
          retailValue: 0,
          profitAmount: 0
        };
      }
      acc[warehouse].count++;
      acc[warehouse].totalQuantity += item.quantity;
      acc[warehouse].costValue += item.costValue;
      acc[warehouse].retailValue += item.retailValue;
      acc[warehouse].profitAmount += item.profitAmount;
      return acc;
    }, {});

    res.json({
      summary: {
        totalProducts: valuationData.length,
        totalQuantity: valuationData.reduce((sum, item) => sum + item.quantity, 0),
        totalCostValue,
        totalRetailValue,
        totalProfitAmount,
        averageProfitMargin,
        valuationMethod
      },
      categoryValuation,
      warehouseValuation,
      items: valuationData
    });
  } catch (error) {
    console.error('Inventory valuation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Purchase orders report
router.get('/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { supplierId, warehouseId, status, page = 1, limit = 50 } = req.query;
    
    const whereClause = {
      orderDate: {
        [Op.between]: [startDate, endDate]
      }
    };
    
    if (supplierId) whereClause.supplierId = supplierId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (status) whereClause.status = status;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: orders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contactPerson']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku']
          }]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['orderDate', 'DESC']]
    });

    // Calculate summary statistics
    const totalOrders = count;
    const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.finalAmount) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    
    // Group by status
    const statusSummary = orders.reduce((acc, order) => {
      if (!acc[order.status]) {
        acc[order.status] = { count: 0, value: 0 };
      }
      acc[order.status].count++;
      acc[order.status].value += parseFloat(order.finalAmount) || 0;
      return acc;
    }, {});

    // Group by supplier
    const supplierSummary = orders.reduce((acc, order) => {
      const supplierName = order.Supplier.name;
      if (!acc[supplierName]) {
        acc[supplierName] = { count: 0, value: 0 };
      }
      acc[supplierName].count++;
      acc[supplierName].value += parseFloat(order.finalAmount) || 0;
      return acc;
    }, {});

    // Calculate delivery performance
    const deliveredOrders = orders.filter(order => order.actualDeliveryDate);
    const onTimeDeliveries = deliveredOrders.filter(order => {
      if (!order.expectedDeliveryDate) return false;
      return new Date(order.actualDeliveryDate) <= new Date(order.expectedDeliveryDate);
    });
    const deliveryPerformance = deliveredOrders.length > 0 ? 
      (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;

    res.json({
      summary: {
        totalOrders,
        totalValue,
        averageOrderValue,
        deliveryPerformance,
        dateRange: { startDate, endDate }
      },
      statusSummary,
      supplierSummary,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        supplier: order.Supplier.name,
        warehouse: order.Warehouse.name,
        status: order.status,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        actualDeliveryDate: order.actualDeliveryDate,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        itemCount: order.PurchaseOrderItems?.length || 0,
        creator: order.creator ? 
          `${order.creator.firstName} ${order.creator.lastName}` : 
          'Unknown',
        approver: order.approver ? 
          `${order.approver.firstName} ${order.approver.lastName}` : 
          null,
        approvedAt: order.approvedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Purchase orders report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supplier performance report
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    
    const suppliers = await Supplier.findAll({
      where: { isActive: true },
      include: [
        {
          model: PurchaseOrder,
          where: {
            orderDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          required: false,
          include: [{
            model: PurchaseOrderItem,
            include: [{
              model: Product,
              attributes: ['id', 'name', 'sku']
            }]
          }]
        }
      ]
    });

    const supplierPerformance = suppliers.map(supplier => {
      const orders = supplier.PurchaseOrders || [];
      const totalOrders = orders.length;
      const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.finalAmount) || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
      
      // Calculate delivery performance
      const deliveredOrders = orders.filter(order => order.actualDeliveryDate);
      const onTimeDeliveries = deliveredOrders.filter(order => {
        if (!order.expectedDeliveryDate) return false;
        return new Date(order.actualDeliveryDate) <= new Date(order.expectedDeliveryDate);
      });
      const deliveryPerformance = deliveredOrders.length > 0 ? 
        (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;
      
      // Calculate average delivery time
      const deliveryTimes = deliveredOrders
        .filter(order => order.expectedDeliveryDate)
        .map(order => {
          const expected = new Date(order.expectedDeliveryDate);
          const actual = new Date(order.actualDeliveryDate);
          return Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)); // days
        });
      const averageDeliveryTime = deliveryTimes.length > 0 ? 
        deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        rating: supplier.rating,
        totalOrders,
        totalValue,
        averageOrderValue,
        deliveryPerformance,
        averageDeliveryTime,
        onTimeDeliveries: onTimeDeliveries.length,
        totalDeliveries: deliveredOrders.length,
        lastOrderDate: orders.length > 0 ? 
          new Date(Math.max(...orders.map(o => new Date(o.orderDate)))) : null
      };
    });

    // Sort by performance metrics
    const sortedSuppliers = supplierPerformance.sort((a, b) => {
      // Sort by delivery performance first, then by total value
      if (a.deliveryPerformance !== b.deliveryPerformance) {
        return b.deliveryPerformance - a.deliveryPerformance;
      }
      return b.totalValue - a.totalValue;
    });

    // Summary statistics
    const totalSuppliers = sortedSuppliers.length;
    const activeSuppliers = sortedSuppliers.filter(s => s.totalOrders > 0).length;
    const averageDeliveryPerformance = sortedSuppliers.length > 0 ? 
      sortedSuppliers.reduce((sum, s) => sum + s.deliveryPerformance, 0) / sortedSuppliers.length : 0;
    const totalSupplierValue = sortedSuppliers.reduce((sum, s) => sum + s.totalValue, 0);

    res.json({
      summary: {
        totalSuppliers,
        activeSuppliers,
        averageDeliveryPerformance,
        totalSupplierValue,
        dateRange: { startDate, endDate }
      },
      suppliers: sortedSuppliers
    });
  } catch (error) {
    console.error('Supplier performance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard summary report
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    
    // Get basic counts
    const [
      totalProducts,
      totalSuppliers,
      totalWarehouses,
      totalOrders,
      lowStockCount,
      recentMovements
    ] = await Promise.all([
      Product.count({ where: { isActive: true } }),
      Supplier.count({ where: { isActive: true } }),
      Warehouse.count({ where: { isActive: true } }),
      PurchaseOrder.count({
        where: {
          orderDate: {
            [Op.between]: [startDate, endDate]
          }
        }
      }),
      Stock.count({
        include: [{
          model: Product,
          where: {
            isActive: true
          }
        }]
      }).then(count => {
        // Filter low stock items after count
        return Stock.findAll({
          include: [{
            model: Product,
            where: { isActive: true }
          }]
        }).then(stocks => 
          stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint).length
        );
      }),
      StockMovement.count({
        where: {
          movementDate: {
            [Op.between]: [startDate, endDate]
          }
        }
      })
    ]);

    // Get recent low stock alerts
    const lowStockAlerts = await Stock.findAll({
      include: [
        {
          model: Product,
          where: {
            isActive: true
          },
          attributes: ['id', 'name', 'sku', 'reorderPoint']
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      limit: 5,
      order: [['quantity', 'ASC']]
    }).then(stocks => 
      stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint)
    );

    // Get recent stock movements
    const recentStockMovements = await StockMovement.findAll({
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
      limit: 10,
      order: [['movementDate', 'DESC']]
    });

    // Get pending purchase orders
    const pendingOrders = await PurchaseOrder.count({
      where: {
        status: {
          [Op.in]: ['draft', 'pending', 'approved']
        }
      }
    });

    res.json({
      summary: {
        totalProducts,
        totalSuppliers,
        totalWarehouses,
        totalOrders,
        lowStockCount,
        recentMovements,
        pendingOrders
      },
      lowStockAlerts: lowStockAlerts.map(alert => ({
        productName: alert.Product.name,
        productSku: alert.Product.sku,
        warehouse: alert.Warehouse.name,
        currentStock: alert.quantity,
        reorderPoint: alert.Product.reorderPoint
      })),
      recentMovements: recentStockMovements.map(movement => ({
        productName: movement.Product.name,
        productSku: movement.Product.sku,
        warehouse: movement.Warehouse.name,
        movementType: movement.movementType,
        quantity: movement.quantity,
        reason: movement.reason,
        movementDate: movement.movementDate,
        performer: movement.performer ? 
          `${movement.performer.firstName} ${movement.performer.lastName}` : 
          'System'
      }))
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export report as Excel
router.get('/export/:reportType/excel', authenticateToken, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, warehouseId, categoryId, supplierId, status, lowStockOnly, criticalOnly } = req.query;
    
    // Get report data using existing logic
    let reportData;
    const params = {
      startDate,
      endDate,
      warehouseId,
      categoryId,
      supplierId,
      status,
      lowStockOnly,
      criticalOnly
    };

    // Create a mock request object for existing functions
    const mockReq = { query: params };
    
    // Get data based on report type
    switch (reportType) {
      case 'stock':
        reportData = await getStockReportData(mockReq);
        break;
      case 'movements':
        reportData = await getMovementsReportData(mockReq);
        break;
      case 'low-stock':
        reportData = await getLowStockReportData(mockReq);
        break;
      case 'inventory-value':
        reportData = await getInventoryValueReportData(mockReq);
        break;
      case 'purchase-orders':
        reportData = await getPurchaseOrdersReportData(mockReq);
        break;
      case 'suppliers':
        reportData = await getSuppliersReportData(mockReq);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`);

    // Add headers and data based on report type
    await addReportDataToExcel(worksheet, reportType, reportData);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export report as PDF
router.get('/export/:reportType/pdf', authenticateToken, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, warehouseId, categoryId, supplierId, status, lowStockOnly, criticalOnly } = req.query;
    
    // Get report data using existing logic
    let reportData;
    const params = {
      startDate,
      endDate,
      warehouseId,
      categoryId,
      supplierId,
      status,
      lowStockOnly,
      criticalOnly
    };

    // Create a mock request object for existing functions
    const mockReq = { query: params };
    
    // Get data based on report type
    switch (reportType) {
      case 'stock':
        reportData = await getStockReportData(mockReq);
        break;
      case 'movements':
        reportData = await getMovementsReportData(mockReq);
        break;
      case 'low-stock':
        reportData = await getLowStockReportData(mockReq);
        break;
      case 'inventory-value':
        reportData = await getInventoryValueReportData(mockReq);
        break;
      case 'purchase-orders':
        reportData = await getPurchaseOrdersReportData(mockReq);
        break;
      case 'suppliers':
        reportData = await getSuppliersReportData(mockReq);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    await addReportDataToPDF(doc, reportType, reportData);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export report as CSV
router.get('/export/:reportType/csv', authenticateToken, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, warehouseId, categoryId, supplierId, status, lowStockOnly, criticalOnly } = req.query;
    
    // Get report data using existing logic
    let reportData;
    const params = {
      startDate,
      endDate,
      warehouseId,
      categoryId,
      supplierId,
      status,
      lowStockOnly,
      criticalOnly
    };

    // Create a mock request object for existing functions
    const mockReq = { query: params };
    
    // Get data based on report type
    switch (reportType) {
      case 'stock':
        reportData = await getStockReportData(mockReq);
        break;
      case 'movements':
        reportData = await getMovementsReportData(mockReq);
        break;
      case 'low-stock':
        reportData = await getLowStockReportData(mockReq);
        break;
      case 'inventory-value':
        reportData = await getInventoryValueReportData(mockReq);
        break;
      case 'purchase-orders':
        reportData = await getPurchaseOrdersReportData(mockReq);
        break;
      case 'suppliers':
        reportData = await getSuppliersReportData(mockReq);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Generate CSV content
    const csvContent = generateCSVContent(reportType, reportData);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`);

    // Send CSV content
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for export functionality
async function getStockReportData(req) {
  const { warehouseId, categoryId, lowStockOnly } = req.query;
  let lowStockFilter = false;
  
  const whereClause = {};
  const productWhereClause = { isActive: true };
  
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }
  
  if (categoryId) {
    productWhereClause.categoryId = categoryId;
  }
  
  if (lowStockOnly === 'true') {
    lowStockFilter = true;
  }

  const stocks = await Stock.findAll({
    where: whereClause,
    include: [
      {
        model: Product,
        where: productWhereClause,
        include: [{
          model: Category,
          attributes: ['id', 'name']
        }]
      },
      {
        model: Warehouse,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['quantity', 'ASC']]
  });

  const totalProducts = stocks.length;
  const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const lowStockCount = stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint).length;
  const totalValue = stocks.reduce((sum, stock) => {
    return sum + (stock.quantity * (stock.Product.costPrice || 0));
  }, 0);

  return {
    summary: {
      totalProducts,
      totalQuantity,
      totalValue,
      lowStockCount
    },
    stocks: (lowStockFilter ? stocks.filter(stock => stock.quantity <= stock.Product.reorderPoint) : stocks).map(stock => ({
      id: stock.id,
      productName: stock.Product.name,
      productSku: stock.Product.sku,
      category: stock.Product.Category?.name,
      warehouse: stock.Warehouse.name,
      quantity: stock.quantity,
      reorderPoint: stock.Product.reorderPoint,
      costPrice: stock.Product.costPrice,
      totalValue: stock.quantity * (stock.Product.costPrice || 0),
      isLowStock: stock.quantity <= stock.Product.reorderPoint,
      location: stock.location
    }))
  };
}

async function getMovementsReportData(req) {
  const { startDate, endDate } = getDateRange(req);
  const { productId, warehouseId, movementType, page = 1, limit = 1000 } = req.query;
  
  const whereClause = {
    movementDate: {
      [Op.between]: [startDate, endDate]
    }
  };
  
  if (productId) whereClause.productId = productId;
  if (warehouseId) whereClause.warehouseId = warehouseId;
  if (movementType) whereClause.movementType = movementType;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
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
    limit: parseInt(limit),
    offset,
    order: [['movementDate', 'DESC']]
  });

  const totalMovements = count;
  const totalInQuantity = movements
    .filter(m => m.movementType === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);
  const totalOutQuantity = movements
    .filter(m => m.movementType === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  return {
    summary: {
      totalMovements,
      totalInQuantity,
      totalOutQuantity,
      netQuantity: totalInQuantity - totalOutQuantity,
      dateRange: { startDate, endDate }
    },
    movements: movements.map(movement => ({
      id: movement.id,
      productName: movement.Product.name,
      productSku: movement.Product.sku,
      warehouse: movement.Warehouse.name,
      movementType: movement.movementType,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      reason: movement.reason,
      notes: movement.notes,
      movementDate: movement.movementDate,
      performer: movement.performer ? 
        `${movement.performer.firstName} ${movement.performer.lastName}` : 
        'System'
    }))
  };
}

async function getLowStockReportData(req) {
  const { warehouseId, categoryId, criticalOnly } = req.query;
  
  const whereClause = {};
  const productWhereClause = { isActive: true };
  
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }
  
  if (categoryId) {
    productWhereClause.categoryId = categoryId;
  }

  const lowStockItems = await Stock.findAll({
    where: whereClause,
    include: [
      {
        model: Product,
        where: productWhereClause,
        include: [{
          model: Category,
          attributes: ['id', 'name']
        }]
      },
      {
        model: Warehouse,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['quantity', 'ASC']]
  });

  const filteredItems = criticalOnly === 'true' 
    ? lowStockItems.filter(item => item.quantity <= item.Product.minStockLevel)
    : lowStockItems.filter(item => item.quantity <= item.Product.reorderPoint);

  const alerts = filteredItems.map(item => {
    const isCritical = item.quantity <= item.Product.minStockLevel;
    const daysUntilReorder = item.Product.reorderPoint > 0 ? 
      Math.ceil(item.quantity / (item.Product.reorderPoint / 30)) : 0;
    
    return {
      productId: item.productId,
      productName: item.Product.name,
      productSku: item.Product.sku,
      category: item.Product.Category?.name,
      warehouse: item.Warehouse.name,
      currentStock: item.quantity,
      reorderPoint: item.Product.reorderPoint,
      minStockLevel: item.Product.minStockLevel,
      isCritical,
      daysUntilReorder,
      suggestedOrderQuantity: Math.max(
        item.Product.reorderPoint * 2 - item.quantity,
        item.Product.reorderPoint
      ),
      costPrice: item.Product.costPrice,
      estimatedCost: (item.Product.reorderPoint * 2 - item.quantity) * (item.Product.costPrice || 0)
    };
  });

  const criticalCount = alerts.filter(alert => alert.isCritical).length;
  const totalEstimatedCost = alerts.reduce((sum, alert) => sum + alert.estimatedCost, 0);

  return {
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: criticalCount,
      totalEstimatedCost,
      averageDaysUntilReorder: alerts.length > 0 ? 
        alerts.reduce((sum, alert) => sum + alert.daysUntilReorder, 0) / alerts.length : 0
    },
    alerts
  };
}

async function getInventoryValueReportData(req) {
  const { warehouseId, categoryId, valuationMethod = 'cost' } = req.query;
  
  const whereClause = {};
  const productWhereClause = { isActive: true };
  
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }
  
  if (categoryId) {
    productWhereClause.categoryId = categoryId;
  }

  const stocks = await Stock.findAll({
    where: whereClause,
    include: [
      {
        model: Product,
        where: productWhereClause,
        include: [{
          model: Category,
          attributes: ['id', 'name']
        }]
      },
      {
        model: Warehouse,
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  const valuationData = stocks.map(stock => {
    const costValue = stock.quantity * (stock.Product.costPrice || 0);
    const retailValue = stock.quantity * (stock.Product.unitPrice || 0);
    const profitMargin = stock.Product.unitPrice && stock.Product.costPrice ? 
      ((stock.Product.unitPrice - stock.Product.costPrice) / stock.Product.unitPrice) * 100 : 0;
    
    return {
      productId: stock.productId,
      productName: stock.Product.name,
      productSku: stock.Product.sku,
      category: stock.Product.Category?.name,
      warehouse: stock.Warehouse.name,
      quantity: stock.quantity,
      costPrice: stock.Product.costPrice,
      unitPrice: stock.Product.unitPrice,
      costValue,
      retailValue,
      profitMargin,
      profitAmount: retailValue - costValue
    };
  });

  const totalCostValue = valuationData.reduce((sum, item) => sum + item.costValue, 0);
  const totalRetailValue = valuationData.reduce((sum, item) => sum + item.retailValue, 0);
  const totalProfitAmount = valuationData.reduce((sum, item) => sum + item.profitAmount, 0);
  const averageProfitMargin = valuationData.length > 0 ? 
    valuationData.reduce((sum, item) => sum + item.profitMargin, 0) / valuationData.length : 0;

  return {
    summary: {
      totalProducts: valuationData.length,
      totalQuantity: valuationData.reduce((sum, item) => sum + item.quantity, 0),
      totalCostValue,
      totalRetailValue,
      totalProfitAmount,
      averageProfitMargin,
      valuationMethod
    },
    items: valuationData
  };
}

async function getPurchaseOrdersReportData(req) {
  const { startDate, endDate } = getDateRange(req);
  const { supplierId, warehouseId, status, page = 1, limit = 1000 } = req.query;
  
  const whereClause = {
    orderDate: {
      [Op.between]: [startDate, endDate]
    }
  };
  
  if (supplierId) whereClause.supplierId = supplierId;
  if (warehouseId) whereClause.warehouseId = warehouseId;
  if (status) whereClause.status = status;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  const { count, rows: orders } = await PurchaseOrder.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Supplier,
        attributes: ['id', 'name', 'contactPerson']
      },
      {
        model: Warehouse,
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: PurchaseOrderItem,
        include: [{
          model: Product,
          attributes: ['id', 'name', 'sku']
        }]
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['orderDate', 'DESC']]
  });

  const totalOrders = count;
  const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.finalAmount) || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

  const deliveredOrders = orders.filter(order => order.actualDeliveryDate);
  const onTimeDeliveries = deliveredOrders.filter(order => {
    if (!order.expectedDeliveryDate) return false;
    return new Date(order.actualDeliveryDate) <= new Date(order.expectedDeliveryDate);
  });
  const deliveryPerformance = deliveredOrders.length > 0 ? 
    (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;

  return {
    summary: {
      totalOrders,
      totalValue,
      averageOrderValue,
      deliveryPerformance,
      dateRange: { startDate, endDate }
    },
    orders: orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      supplier: order.Supplier.name,
      warehouse: order.Warehouse.name,
      status: order.status,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      itemCount: order.PurchaseOrderItems?.length || 0,
      creator: order.creator ? 
        `${order.creator.firstName} ${order.creator.lastName}` : 
        'Unknown',
      approver: order.approver ? 
        `${order.approver.firstName} ${order.approver.lastName}` : 
        null,
      approvedAt: order.approvedAt
    }))
  };
}

async function getSuppliersReportData(req) {
  const { startDate, endDate } = getDateRange(req);
  
  const suppliers = await Supplier.findAll({
    where: { isActive: true },
    include: [
      {
        model: PurchaseOrder,
        where: {
          orderDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false,
        include: [{
          model: PurchaseOrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'sku']
          }]
        }]
      }
    ]
  });

  const supplierPerformance = suppliers.map(supplier => {
    const orders = supplier.PurchaseOrders || [];
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.finalAmount) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    
    const deliveredOrders = orders.filter(order => order.actualDeliveryDate);
    const onTimeDeliveries = deliveredOrders.filter(order => {
      if (!order.expectedDeliveryDate) return false;
      return new Date(order.actualDeliveryDate) <= new Date(order.expectedDeliveryDate);
    });
    const deliveryPerformance = deliveredOrders.length > 0 ? 
      (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;
    
    const deliveryTimes = deliveredOrders
      .filter(order => order.expectedDeliveryDate)
      .map(order => {
        const expected = new Date(order.expectedDeliveryDate);
        const actual = new Date(order.actualDeliveryDate);
        return Math.ceil((actual - expected) / (1000 * 60 * 60 * 24));
      });
    const averageDeliveryTime = deliveryTimes.length > 0 ? 
      deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0;

    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      rating: supplier.rating,
      totalOrders,
      totalValue,
      averageOrderValue,
      deliveryPerformance,
      averageDeliveryTime,
      onTimeDeliveries: onTimeDeliveries.length,
      totalDeliveries: deliveredOrders.length,
      lastOrderDate: orders.length > 0 ? 
        new Date(Math.max(...orders.map(o => new Date(o.orderDate)))) : null
    };
  });

  const sortedSuppliers = supplierPerformance.sort((a, b) => {
    if (a.deliveryPerformance !== b.deliveryPerformance) {
      return b.deliveryPerformance - a.deliveryPerformance;
    }
    return b.totalValue - a.totalValue;
  });

  const totalSuppliers = sortedSuppliers.length;
  const activeSuppliers = sortedSuppliers.filter(s => s.totalOrders > 0).length;
  const averageDeliveryPerformance = sortedSuppliers.length > 0 ? 
    sortedSuppliers.reduce((sum, s) => sum + s.deliveryPerformance, 0) / sortedSuppliers.length : 0;
  const totalSupplierValue = sortedSuppliers.reduce((sum, s) => sum + s.totalValue, 0);

  return {
    summary: {
      totalSuppliers,
      activeSuppliers,
      averageDeliveryPerformance,
      totalSupplierValue,
      dateRange: { startDate, endDate }
    },
    suppliers: sortedSuppliers
  };
}

async function addReportDataToExcel(worksheet, reportType, reportData) {
  // Add title
  worksheet.addRow([`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`]);
  worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
  worksheet.addRow([]);

  // Add summary data
  if (reportData.summary) {
    worksheet.addRow(['Summary']);
    Object.entries(reportData.summary).forEach(([key, value]) => {
      worksheet.addRow([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value]);
    });
    worksheet.addRow([]);
  }

  // Add data based on report type
  switch (reportType) {
    case 'stock':
      if (reportData.stocks) {
        worksheet.addRow(['Product Name', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Reorder Point', 'Cost Price', 'Total Value', 'Status']);
        reportData.stocks.forEach(stock => {
          worksheet.addRow([
            stock.productName,
            stock.productSku,
            stock.category,
            stock.warehouse,
            stock.quantity,
            stock.reorderPoint,
            stock.costPrice,
            stock.totalValue,
            stock.isLowStock ? 'Low Stock' : 'In Stock'
          ]);
        });
      }
      break;
    case 'movements':
      if (reportData.movements) {
        worksheet.addRow(['Date', 'Product Name', 'SKU', 'Warehouse', 'Type', 'Quantity', 'Reason', 'Performer']);
        reportData.movements.forEach(movement => {
          worksheet.addRow([
            new Date(movement.movementDate).toLocaleDateString(),
            movement.productName,
            movement.productSku,
            movement.warehouse,
            movement.movementType,
            movement.quantity,
            movement.reason,
            movement.performer
          ]);
        });
      }
      break;
    case 'low-stock':
      if (reportData.alerts) {
        worksheet.addRow(['Product Name', 'SKU', 'Category', 'Warehouse', 'Current Stock', 'Reorder Point', 'Suggested Order', 'Estimated Cost', 'Priority']);
        reportData.alerts.forEach(alert => {
          worksheet.addRow([
            alert.productName,
            alert.productSku,
            alert.category,
            alert.warehouse,
            alert.currentStock,
            alert.reorderPoint,
            alert.suggestedOrderQuantity,
            alert.estimatedCost,
            alert.isCritical ? 'Critical' : 'Low Stock'
          ]);
        });
      }
      break;
    case 'inventory-value':
      if (reportData.items) {
        worksheet.addRow(['Product Name', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Cost Value', 'Retail Value', 'Profit Margin']);
        reportData.items.forEach(item => {
          worksheet.addRow([
            item.productName,
            item.productSku,
            item.category,
            item.warehouse,
            item.quantity,
            item.costValue,
            item.retailValue,
            `${item.profitMargin.toFixed(1)}%`
          ]);
        });
      }
      break;
    case 'purchase-orders':
      if (reportData.orders) {
        worksheet.addRow(['Order Number', 'Supplier', 'Warehouse', 'Status', 'Order Date', 'Expected Delivery', 'Total Amount']);
        reportData.orders.forEach(order => {
          worksheet.addRow([
            order.orderNumber,
            order.supplier,
            order.warehouse,
            order.status,
            new Date(order.orderDate).toLocaleDateString(),
            order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A',
            order.finalAmount
          ]);
        });
      }
      break;
    case 'suppliers':
      if (reportData.suppliers) {
        worksheet.addRow(['Supplier Name', 'Contact Person', 'Email', 'Phone', 'Rating', 'Total Orders', 'Total Value', 'Delivery Performance', 'Avg Delivery Time']);
        reportData.suppliers.forEach(supplier => {
          worksheet.addRow([
            supplier.name,
            supplier.contactPerson,
            supplier.email,
            supplier.phone,
            supplier.rating,
            supplier.totalOrders,
            supplier.totalValue,
            `${supplier.deliveryPerformance.toFixed(1)}%`,
            `${supplier.averageDeliveryTime.toFixed(1)} days`
          ]);
        });
      }
      break;
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength;
  });
}

async function addReportDataToPDF(doc, reportType, reportData) {
  // Add title
  doc.fontSize(20).text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
  doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Add summary data
  if (reportData.summary) {
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown(0.5);
    
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      doc.text(`${label}: ${value}`, { indent: 20 });
    });
    doc.moveDown(1);
  }

  // Add data based on report type
  doc.fontSize(16).text('Data', { underline: true });
  doc.moveDown(0.5);

  switch (reportType) {
    case 'stock':
      if (reportData.stocks) {
        doc.text('Product Name | SKU | Category | Warehouse | Quantity | Status');
        doc.text('─'.repeat(80));
        reportData.stocks.forEach(stock => {
          doc.text(`${stock.productName} | ${stock.productSku} | ${stock.category} | ${stock.warehouse} | ${stock.quantity} | ${stock.isLowStock ? 'Low Stock' : 'In Stock'}`);
        });
      }
      break;
    case 'movements':
      if (reportData.movements) {
        doc.text('Date | Product | Warehouse | Type | Quantity | Reason');
        doc.text('─'.repeat(80));
        reportData.movements.forEach(movement => {
          doc.text(`${new Date(movement.movementDate).toLocaleDateString()} | ${movement.productName} | ${movement.warehouse} | ${movement.movementType} | ${movement.quantity} | ${movement.reason}`);
        });
      }
      break;
    case 'low-stock':
      if (reportData.alerts) {
        doc.text('Product | Category | Warehouse | Current Stock | Reorder Point | Priority');
        doc.text('─'.repeat(80));
        reportData.alerts.forEach(alert => {
          doc.text(`${alert.productName} | ${alert.category} | ${alert.warehouse} | ${alert.currentStock} | ${alert.reorderPoint} | ${alert.isCritical ? 'Critical' : 'Low Stock'}`);
        });
      }
      break;
    case 'inventory-value':
      if (reportData.items) {
        doc.text('Product | Category | Warehouse | Quantity | Cost Value | Retail Value');
        doc.text('─'.repeat(80));
        reportData.items.forEach(item => {
          doc.text(`${item.productName} | ${item.category} | ${item.warehouse} | ${item.quantity} | $${item.costValue.toFixed(2)} | $${item.retailValue.toFixed(2)}`);
        });
      }
      break;
    case 'purchase-orders':
      if (reportData.orders) {
        doc.text('Order Number | Supplier | Warehouse | Status | Order Date | Total Amount');
        doc.text('─'.repeat(80));
        reportData.orders.forEach(order => {
          doc.text(`${order.orderNumber} | ${order.supplier} | ${order.warehouse} | ${order.status} | ${new Date(order.orderDate).toLocaleDateString()} | $${order.finalAmount.toFixed(2)}`);
        });
      }
      break;
    case 'suppliers':
      if (reportData.suppliers) {
        doc.text('Supplier | Contact | Rating | Total Orders | Total Value | Delivery Performance');
        doc.text('─'.repeat(80));
        reportData.suppliers.forEach(supplier => {
          doc.text(`${supplier.name} | ${supplier.contactPerson} | ${supplier.rating}/5 | ${supplier.totalOrders} | $${supplier.totalValue.toFixed(2)} | ${supplier.deliveryPerformance.toFixed(1)}%`);
        });
      }
      break;
  }
}

function generateCSVContent(reportType, reportData) {
  let csvContent = '';
  
  // Add summary data
  if (reportData.summary) {
    csvContent += 'Summary\n';
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      csvContent += `${label},${value}\n`;
    });
    csvContent += '\n';
  }

  // Add data based on report type
  switch (reportType) {
    case 'stock':
      if (reportData.stocks) {
        csvContent += 'Product Name,SKU,Category,Warehouse,Quantity,Reorder Point,Cost Price,Total Value,Status\n';
        reportData.stocks.forEach(stock => {
          csvContent += `"${stock.productName}","${stock.productSku}","${stock.category}","${stock.warehouse}",${stock.quantity},${stock.reorderPoint},${stock.costPrice},${stock.totalValue},"${stock.isLowStock ? 'Low Stock' : 'In Stock'}"\n`;
        });
      }
      break;
    case 'movements':
      if (reportData.movements) {
        csvContent += 'Date,Product Name,SKU,Warehouse,Type,Quantity,Reason,Performer\n';
        reportData.movements.forEach(movement => {
          csvContent += `"${new Date(movement.movementDate).toLocaleDateString()}","${movement.productName}","${movement.productSku}","${movement.warehouse}","${movement.movementType}",${movement.quantity},"${movement.reason}","${movement.performer}"\n`;
        });
      }
      break;
    case 'low-stock':
      if (reportData.alerts) {
        csvContent += 'Product Name,SKU,Category,Warehouse,Current Stock,Reorder Point,Suggested Order,Estimated Cost,Priority\n';
        reportData.alerts.forEach(alert => {
          csvContent += `"${alert.productName}","${alert.productSku}","${alert.category}","${alert.warehouse}",${alert.currentStock},${alert.reorderPoint},${alert.suggestedOrderQuantity},${alert.estimatedCost},"${alert.isCritical ? 'Critical' : 'Low Stock'}"\n`;
        });
      }
      break;
    case 'inventory-value':
      if (reportData.items) {
        csvContent += 'Product Name,SKU,Category,Warehouse,Quantity,Cost Value,Retail Value,Profit Margin\n';
        reportData.items.forEach(item => {
          csvContent += `"${item.productName}","${item.productSku}","${item.category}","${item.warehouse}",${item.quantity},${item.costValue},${item.retailValue},${item.profitMargin.toFixed(1)}%\n`;
        });
      }
      break;
    case 'purchase-orders':
      if (reportData.orders) {
        csvContent += 'Order Number,Supplier,Warehouse,Status,Order Date,Expected Delivery,Total Amount\n';
        reportData.orders.forEach(order => {
          csvContent += `"${order.orderNumber}","${order.supplier}","${order.warehouse}","${order.status}","${new Date(order.orderDate).toLocaleDateString()}","${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A'}",${order.finalAmount}\n`;
        });
      }
      break;
    case 'suppliers':
      if (reportData.suppliers) {
        csvContent += 'Supplier Name,Contact Person,Email,Phone,Rating,Total Orders,Total Value,Delivery Performance,Avg Delivery Time\n';
        reportData.suppliers.forEach(supplier => {
          csvContent += `"${supplier.name}","${supplier.contactPerson}","${supplier.email}","${supplier.phone}",${supplier.rating},${supplier.totalOrders},${supplier.totalValue},${supplier.deliveryPerformance.toFixed(1)}%,${supplier.averageDeliveryTime.toFixed(1)} days\n`;
        });
      }
      break;
  }

  return csvContent;
}

module.exports = router;
