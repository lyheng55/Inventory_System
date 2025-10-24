const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

const router = express.Router();

// Helper function to get date range
const getDateRange = (req) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

// Stock level reports using stored procedure
router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, categoryId, lowStockOnly } = req.query;
    
    console.log('📊 Generating stock report using stored procedure...');
    
    // Call stored procedure
    const result = await sequelize.query(
      'CALL GetStockReport(:warehouseId, :categoryId, :lowStockOnly)',
      {
        replacements: {
          warehouseId: warehouseId || null,
          categoryId: categoryId || null,
          lowStockOnly: lowStockOnly === 'true'
        },
        type: QueryTypes.SELECT
      }
    );

    // Process the results (stored procedures return multiple result sets)
    const stocks = result[0] || [];
    const summary = result[1]?.[0] || {};
    const categorySummary = result[2] || [];

    // Convert category summary array to object
    const categorySummaryObj = {};
    categorySummary.forEach(cat => {
      categorySummaryObj[cat.category_name] = {
        count: cat.count,
        quantity: cat.quantity,
        value: cat.value,
        lowStock: cat.low_stock
      };
    });

    console.log(`✅ Stock report generated: ${stocks.length} items, ${Object.keys(categorySummaryObj).length} categories`);

    res.json({
      summary: {
        totalProducts: summary.total_products || 0,
        totalQuantity: summary.total_quantity || 0,
        totalValue: summary.total_value || 0,
        lowStockCount: summary.low_stock_count || 0,
        outOfStockCount: summary.out_of_stock_count || 0,
        averageStockLevel: summary.average_stock_level || 0
      },
      categorySummary: categorySummaryObj,
      stocks: stocks.map(stock => ({
        id: stock.id,
        productName: stock.product_name,
        productSku: stock.product_sku,
        category: stock.category,
        warehouse: stock.warehouse,
        quantity: stock.quantity,
        reorderPoint: stock.reorder_point,
        costPrice: stock.cost_price,
        totalValue: stock.total_value,
        isLowStock: stock.is_low_stock === 1,
        location: stock.location
      }))
    });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard summary using stored procedure
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    
    console.log('📊 Generating dashboard summary using stored procedure...');
    
    // Call stored procedure
    const result = await sequelize.query(
      'CALL GetDashboardSummary(:startDate, :endDate)',
      {
        replacements: { startDate, endDate },
        type: QueryTypes.SELECT
      }
    );

    const summary = result[0]?.[0] || {};
    const lowStockAlerts = result[1] || [];
    const recentMovements = result[2] || [];

    console.log(`✅ Dashboard summary generated: ${lowStockAlerts.length} low stock alerts, ${recentMovements.length} recent movements`);

    res.json({
      summary: {
        totalProducts: summary.total_products || 0,
        totalSuppliers: summary.total_suppliers || 0,
        totalWarehouses: summary.total_warehouses || 0,
        totalOrders: summary.total_orders || 0,
        lowStockCount: summary.low_stock_count || 0,
        recentMovements: summary.recent_movements || 0,
        pendingOrders: summary.pending_orders || 0
      },
      lowStockAlerts: lowStockAlerts.map(alert => ({
        productName: alert.product_name,
        productSku: alert.product_sku,
        warehouse: alert.warehouse,
        currentStock: alert.current_stock,
        reorderPoint: alert.reorder_point
      })),
      recentMovements: recentMovements.map(movement => ({
        productName: movement.product_name,
        productSku: movement.product_sku,
        warehouse: movement.warehouse,
        movementType: movement.movement_type,
        quantity: movement.quantity,
        reason: movement.reason,
        movementDate: movement.movement_date,
        performer: movement.performer || 'System'
      }))
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Low stock alerts using stored procedure
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, categoryId, criticalOnly } = req.query;
    
    console.log('📊 Generating low stock alerts using stored procedure...');
    
    // Call stored procedure
    const result = await sequelize.query(
      'CALL GetLowStockAlertsReport(:warehouseId, :categoryId, :criticalOnly)',
      {
        replacements: {
          warehouseId: warehouseId || null,
          categoryId: categoryId || null,
          criticalOnly: criticalOnly === 'true'
        },
        type: QueryTypes.SELECT
      }
    );

    const alerts = result[0] || [];
    const summary = result[1]?.[0] || {};
    const categoryAlerts = result[2] || [];

    // Convert category alerts array to object
    const categoryAlertsObj = {};
    categoryAlerts.forEach(cat => {
      categoryAlertsObj[cat.category] = {
        count: cat.count,
        critical: cat.critical,
        estimatedCost: cat.estimated_cost
      };
    });

    console.log(`✅ Low stock alerts generated: ${alerts.length} alerts, ${summary.critical_alerts || 0} critical`);

    res.json({
      summary: {
        totalAlerts: summary.total_alerts || 0,
        criticalAlerts: summary.critical_alerts || 0,
        totalEstimatedCost: summary.total_estimated_cost || 0,
        averageDaysUntilReorder: summary.average_days_until_reorder || 0
      },
      categoryAlerts: categoryAlertsObj,
      alerts: alerts.map(alert => ({
        productId: alert.product_id,
        productName: alert.product_name,
        productSku: alert.product_sku,
        category: alert.category,
        warehouse: alert.warehouse,
        currentStock: alert.current_stock,
        reorderPoint: alert.reorder_point,
        minStockLevel: alert.min_stock_level,
        isCritical: alert.is_critical === 1,
        daysUntilReorder: alert.days_until_reorder,
        suggestedOrderQuantity: alert.suggested_order_quantity,
        costPrice: alert.cost_price,
        estimatedCost: alert.estimated_cost
      }))
    });
  } catch (error) {
    console.error('Low stock alerts report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Performance comparison endpoint
router.get('/performance-test', authenticateToken, async (req, res) => {
  try {
    console.log('⚡ Running performance comparison test...');
    
    const testParams = {
      warehouseId: null,
      categoryId: null,
      lowStockOnly: false
    };
    
    // Test stored procedure performance
    const startTime = Date.now();
    const result = await sequelize.query(
      'CALL GetStockReport(:warehouseId, :categoryId, :lowStockOnly)',
      {
        replacements: testParams,
        type: QueryTypes.SELECT
      }
    );
    const storedProcedureTime = Date.now() - startTime;
    
    console.log(`✅ Stored procedure completed in ${storedProcedureTime}ms`);
    console.log(`📊 Results: ${result[0]?.length || 0} stock items, ${result[1]?.[0]?.total_products || 0} total products`);
    
    res.json({
      performance: {
        storedProcedureTime: `${storedProcedureTime}ms`,
        resultCount: result[0]?.length || 0,
        totalProducts: result[1]?.[0]?.total_products || 0,
        totalValue: result[1]?.[0]?.total_value || 0
      },
      message: 'Stored procedure performance test completed successfully!'
    });
  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
