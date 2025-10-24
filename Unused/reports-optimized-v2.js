const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
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

// Helper function to get date range
const getDateRange = (req) => {
  const { startDate, endDate, period } = req.query;
  
  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
  }
  
  const now = new Date();
  let start, end;
  
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = now;
  }
  
  return { startDate: start, endDate: end };
};

// Stock report using stored procedure
router.get('/stock', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { warehouseId, categoryId, lowStockOnly } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetStockReport(?, ?, ?)',
      [
        warehouseId || null,
        categoryId || null,
        lowStockOnly === 'true' ? 1 : 0
      ]
    );
    
    // Results come back as multiple result sets
    const [stockData, summaryData, categoryData] = results;
    
    res.json({
      summary: summaryData[0],
      categorySummary: categoryData,
      stocks: stockData
    });
    
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Stock movements report using stored procedure
router.get('/stock-movements', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { startDate, endDate } = getDateRange(req);
    const { productId, warehouseId, movementType, page = 1, limit = 50 } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetStockMovementsReport(?, ?, ?, ?, ?, ?, ?)',
      [
        startDate,
        endDate,
        productId || null,
        warehouseId || null,
        movementType || null,
        parseInt(page),
        parseInt(limit)
      ]
    );
    
    // Results come back as multiple result sets
    const [movementsData, totalCountData, summaryData, movementTypeData, productData] = results;
    
    res.json({
      summary: {
        ...summaryData[0],
        dateRange: { startDate, endDate }
      },
      movementTypeSummary: movementTypeData,
      productSummary: productData,
      movements: movementsData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCountData[0].total_movements / parseInt(limit)),
        totalItems: totalCountData[0].total_movements,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Stock movements report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Low stock alerts report using stored procedure
router.get('/low-stock-alerts', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { warehouseId, categoryId, criticalOnly } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetLowStockAlertsReport(?, ?, ?)',
      [
        warehouseId || null,
        categoryId || null,
        criticalOnly === 'true' ? 1 : 0
      ]
    );
    
    // Results come back as multiple result sets
    const [alertsData, summaryData, categoryData] = results;
    
    res.json({
      summary: summaryData[0],
      categoryAlerts: categoryData,
      alerts: alertsData
    });
    
  } catch (error) {
    console.error('Low stock alerts report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Inventory valuation report using stored procedure
router.get('/inventory-value', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { warehouseId, categoryId, valuationMethod = 'cost' } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetInventoryValueReport(?, ?, ?)',
      [
        warehouseId || null,
        categoryId || null,
        valuationMethod
      ]
    );
    
    // Results come back as multiple result sets
    const [valuationData, summaryData, categoryData, warehouseData] = results;
    
    res.json({
      summary: {
        ...summaryData[0],
        valuationMethod
      },
      categoryValuation: categoryData,
      warehouseValuation: warehouseData,
      items: valuationData
    });
    
  } catch (error) {
    console.error('Inventory valuation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Advanced inventory valuation using new stored procedure
router.get('/inventory-value-advanced', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { warehouseId, categoryId, valuationMethod = 'cost' } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetAdvancedInventoryValuation(?, ?, ?)',
      [
        warehouseId || null,
        categoryId || null,
        valuationMethod
      ]
    );
    
    // Results come back as multiple result sets
    const [valuationData, summaryData] = results;
    
    res.json({
      summary: {
        ...summaryData[0],
        valuationMethod
      },
      items: valuationData
    });
    
  } catch (error) {
    console.error('Advanced inventory valuation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Purchase orders report using stored procedure
router.get('/purchase-orders', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { startDate, endDate } = getDateRange(req);
    const { supplierId, warehouseId, status, page = 1, limit = 50 } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetPurchaseOrdersReport(?, ?, ?, ?, ?, ?, ?)',
      [
        startDate,
        endDate,
        supplierId || null,
        warehouseId || null,
        status || null,
        parseInt(page),
        parseInt(limit)
      ]
    );
    
    // Results come back as multiple result sets
    const [ordersData, totalCountData, summaryData, statusData, supplierData] = results;
    
    res.json({
      summary: {
        ...summaryData[0],
        dateRange: { startDate, endDate }
      },
      statusSummary: statusData,
      supplierSummary: supplierData,
      orders: ordersData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCountData[0].total_orders / parseInt(limit)),
        totalItems: totalCountData[0].total_orders,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Purchase orders report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Supplier performance report using stored procedure
router.get('/supplier-performance', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { startDate, endDate } = getDateRange(req);
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetSupplierPerformanceReport(?, ?)',
      [startDate, endDate]
    );
    
    // Results come back as multiple result sets
    const [performanceData, summaryData] = results;
    
    res.json({
      summary: summaryData[0],
      suppliers: performanceData
    });
    
  } catch (error) {
    console.error('Supplier performance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Dashboard summary using stored procedure
router.get('/dashboard', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { startDate, endDate } = getDateRange(req);
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetDashboardSummary(?, ?)',
      [startDate, endDate]
    );
    
    // Results come back as multiple result sets
    const [basicCounts, lowStockItems, recentMovements] = results;
    
    res.json({
      basicCounts: basicCounts[0],
      lowStockItems,
      recentMovements
    });
    
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Comprehensive dashboard using new stored procedure
router.get('/dashboard-comprehensive', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { startDate, endDate } = getDateRange(req);
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL GetDashboardCalculations(?, ?)',
      [startDate, endDate]
    );
    
    // Results come back as multiple result sets
    const [basicCounts, stockStats, orderStats, movementStats, lowStockItems, recentMovements] = results;
    
    res.json({
      basicCounts: basicCounts[0],
      stockStats: stockStats[0],
      orderStats: orderStats[0],
      movementStats: movementStats[0],
      lowStockItems,
      recentMovements
    });
    
  } catch (error) {
    console.error('Comprehensive dashboard report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Reorder suggestions using new stored procedure
router.get('/reorder-suggestions', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const { productId, warehouseId, leadTimeDays = 7, safetyStockPercent = 20 } = req.query;
    
    if (!productId || !warehouseId) {
      return res.status(400).json({ error: 'Product ID and Warehouse ID are required' });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [results] = await connection.execute(
      'CALL CalculateReorderSuggestions(?, ?, ?, ?)',
      [
        parseInt(productId),
        parseInt(warehouseId),
        parseInt(leadTimeDays),
        parseFloat(safetyStockPercent)
      ]
    );
    
    res.json({
      suggestion: results[0][0]
    });
    
  } catch (error) {
    console.error('Reorder suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

module.exports = router;
