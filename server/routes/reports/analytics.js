const express = require('express');
const { Product, Stock, StockMovement, PurchaseOrder, PurchaseOrderItem, Warehouse, Category, Supplier } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');

const router = express.Router();

// Helper function to get date range
const getDateRange = (req) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

// Sales Trend Analysis
router.get('/sales-trends', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { warehouseId, categoryId, productId, interval = 'daily' } = req.query;
    
    const whereClause = {
      movementDate: {
        [Op.between]: [startDate, endDate]
      },
      movementType: 'out' // Sales are outgoing movements
    };
    
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (productId) whereClause.productId = productId;
    
    // Get all sales movements
    const movements = await StockMovement.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'sku', 'unitPrice', 'costPrice', 'categoryId'],
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }],
          where: categoryId ? { categoryId } : {}
        },
        {
          model: Warehouse,
          attributes: ['id', 'name']
        }
      ],
      order: [['movementDate', 'ASC']]
    });

    // Group by time interval
    const salesByInterval = {};
    const salesByProduct = {};
    const salesByCategory = {};
    
    movements.forEach(movement => {
      const date = new Date(movement.movementDate);
      let intervalKey;
      
      switch (interval) {
        case 'hourly':
          intervalKey = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
          break;
        case 'daily':
          intervalKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          intervalKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          intervalKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          intervalKey = date.toISOString().split('T')[0];
      }
      
      if (!salesByInterval[intervalKey]) {
        salesByInterval[intervalKey] = {
          date: intervalKey,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          transactions: 0
        };
      }
      
      const quantity = Math.abs(movement.quantity);
      const unitPrice = parseFloat(movement.Product.unitPrice) || 0;
      const costPrice = parseFloat(movement.Product.costPrice) || 0;
      const revenue = quantity * unitPrice;
      const cost = quantity * costPrice;
      
      salesByInterval[intervalKey].quantity += quantity;
      salesByInterval[intervalKey].revenue += revenue;
      salesByInterval[intervalKey].cost += cost;
      salesByInterval[intervalKey].profit += (revenue - cost);
      salesByInterval[intervalKey].transactions += 1;
      
      // Group by product
      const productKey = movement.Product.id;
      if (!salesByProduct[productKey]) {
        salesByProduct[productKey] = {
          id: movement.Product.id,
          name: movement.Product.name,
          sku: movement.Product.sku,
          quantity: 0,
          revenue: 0,
          profit: 0,
          transactions: 0
        };
      }
      salesByProduct[productKey].quantity += quantity;
      salesByProduct[productKey].revenue += revenue;
      salesByProduct[productKey].profit += (revenue - cost);
      salesByProduct[productKey].transactions += 1;
      
      // Group by category
      const categoryName = movement.Product.Category?.name || 'Uncategorized';
      if (!salesByCategory[categoryName]) {
        salesByCategory[categoryName] = {
          name: categoryName,
          quantity: 0,
          revenue: 0,
          profit: 0,
          transactions: 0
        };
      }
      salesByCategory[categoryName].quantity += quantity;
      salesByCategory[categoryName].revenue += revenue;
      salesByCategory[categoryName].profit += (revenue - cost);
      salesByCategory[categoryName].transactions += 1;
    });

    const timeSeriesData = Object.values(salesByInterval).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    const topProducts = Object.values(salesByProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    const categoryBreakdown = Object.values(salesByCategory)
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate summary statistics
    const totalRevenue = timeSeriesData.reduce((sum, d) => sum + d.revenue, 0);
    const totalCost = timeSeriesData.reduce((sum, d) => sum + d.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalQuantity = timeSeriesData.reduce((sum, d) => sum + d.quantity, 0);
    const totalTransactions = timeSeriesData.reduce((sum, d) => sum + d.transactions, 0);
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calculate growth rate
    let growthRate = 0;
    if (timeSeriesData.length >= 2) {
      const firstPeriod = timeSeriesData[0].revenue;
      const lastPeriod = timeSeriesData[timeSeriesData.length - 1].revenue;
      if (firstPeriod > 0) {
        growthRate = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
      }
    }

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        totalQuantity,
        totalTransactions,
        averageTransactionValue,
        growthRate,
        dateRange: { startDate, endDate },
        interval
      },
      timeSeriesData,
      topProducts,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Sales trends analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory Turnover Analysis
router.get('/inventory-turnover', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { warehouseId, categoryId, minTurnover, maxTurnover } = req.query;
    
    // Get all products with their stock and movements
    const products = await Product.findAll({
      where: {
        isActive: true,
        ...(categoryId && { categoryId })
      },
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: Stock,
          attributes: ['id', 'quantity', 'warehouseId'],
          where: warehouseId ? { warehouseId } : {},
          include: [{
            model: Warehouse,
            attributes: ['id', 'name']
          }],
          required: false
        },
        {
          model: StockMovement,
          attributes: ['id', 'movementType', 'quantity', 'movementDate'],
          where: {
            movementDate: {
              [Op.between]: [startDate, endDate]
            },
            ...(warehouseId && { warehouseId })
          },
          required: false
        }
      ]
    });

    const turnoverData = products.map(product => {
      // Calculate average inventory
      const currentStock = product.Stocks.reduce((sum, stock) => sum + stock.quantity, 0);
      const totalSales = product.StockMovements
        .filter(m => m.movementType === 'out')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      
      const totalPurchases = product.StockMovements
        .filter(m => m.movementType === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      // Days in period
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const averageInventory = currentStock > 0 ? currentStock : (totalPurchases > 0 ? totalPurchases / 2 : 0);
      
      // Inventory Turnover Ratio = Cost of Goods Sold / Average Inventory
      const costPrice = parseFloat(product.costPrice) || 0;
      const cogs = totalSales * costPrice;
      const turnoverRatio = averageInventory > 0 ? cogs / (averageInventory * costPrice) : 0;
      
      // Days to sell = Days / Turnover Ratio
      const daysToSell = turnoverRatio > 0 ? days / turnoverRatio : 0;
      
      // Stock efficiency
      const stockEfficiency = currentStock > 0 ? (totalSales / currentStock) * 100 : 0;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.Category?.name || 'Uncategorized',
        currentStock,
        totalSales,
        totalPurchases,
        averageInventory,
        turnoverRatio: parseFloat(turnoverRatio.toFixed(2)),
        daysToSell: parseFloat(daysToSell.toFixed(1)),
        stockEfficiency: parseFloat(stockEfficiency.toFixed(2)),
        costPrice,
        unitPrice: product.unitPrice,
        inventoryValue: currentStock * costPrice
      };
    });

    // Filter by turnover ratio if specified
    let filteredData = turnoverData;
    if (minTurnover) {
      filteredData = filteredData.filter(d => d.turnoverRatio >= parseFloat(minTurnover));
    }
    if (maxTurnover) {
      filteredData = filteredData.filter(d => d.turnoverRatio <= parseFloat(maxTurnover));
    }

    // Sort by turnover ratio
    filteredData.sort((a, b) => b.turnoverRatio - a.turnoverRatio);

    // Calculate summary statistics
    const averageTurnoverRatio = filteredData.length > 0 ?
      filteredData.reduce((sum, d) => sum + d.turnoverRatio, 0) / filteredData.length : 0;
    const averageDaysToSell = filteredData.length > 0 ?
      filteredData.reduce((sum, d) => sum + d.daysToSell, 0) / filteredData.length : 0;
    const totalInventoryValue = filteredData.reduce((sum, d) => sum + d.inventoryValue, 0);
    const fastMovingProducts = filteredData.filter(d => d.turnoverRatio > 5).length;
    const slowMovingProducts = filteredData.filter(d => d.turnoverRatio < 1 && d.turnoverRatio > 0).length;
    const deadStock = filteredData.filter(d => d.turnoverRatio === 0 && d.currentStock > 0).length;

    // Category-wise turnover
    const categoryTurnover = filteredData.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          name: item.category,
          count: 0,
          averageTurnover: 0,
          totalSales: 0,
          inventoryValue: 0
        };
      }
      acc[item.category].count++;
      acc[item.category].averageTurnover += item.turnoverRatio;
      acc[item.category].totalSales += item.totalSales;
      acc[item.category].inventoryValue += item.inventoryValue;
      return acc;
    }, {});

    Object.values(categoryTurnover).forEach(cat => {
      cat.averageTurnover = cat.averageTurnover / cat.count;
    });

    res.json({
      summary: {
        totalProducts: filteredData.length,
        averageTurnoverRatio: parseFloat(averageTurnoverRatio.toFixed(2)),
        averageDaysToSell: parseFloat(averageDaysToSell.toFixed(1)),
        totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
        fastMovingProducts,
        slowMovingProducts,
        deadStock,
        dateRange: { startDate, endDate }
      },
      products: filteredData,
      categoryTurnover: Object.values(categoryTurnover).sort((a, b) => b.averageTurnover - a.averageTurnover),
      fastMoving: filteredData.filter(d => d.turnoverRatio > 5).slice(0, 10),
      slowMoving: filteredData.filter(d => d.turnoverRatio < 1 && d.turnoverRatio > 0).slice(0, 10),
      deadStockItems: filteredData.filter(d => d.turnoverRatio === 0 && d.currentStock > 0)
    });
  } catch (error) {
    console.error('Inventory turnover analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cost Analysis Report
router.get('/cost-analysis', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { warehouseId, categoryId, analysisType = 'all' } = req.query;
    
    // Get purchase orders and movements
    const [purchaseOrders, stockMovements, currentStock] = await Promise.all([
      PurchaseOrder.findAll({
        where: {
          orderDate: {
            [Op.between]: [startDate, endDate]
          },
          status: 'received',
          ...(warehouseId && { warehouseId })
        },
        include: [
          {
            model: PurchaseOrderItem,
            include: [{
              model: Product,
              include: [{
                model: Category,
                attributes: ['id', 'name']
              }],
              where: categoryId ? { categoryId } : {}
            }]
          },
          {
            model: Supplier,
            attributes: ['id', 'name']
          }
        ]
      }),
      StockMovement.findAll({
        where: {
          movementDate: {
            [Op.between]: [startDate, endDate]
          },
          ...(warehouseId && { warehouseId })
        },
        include: [{
          model: Product,
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }],
          where: categoryId ? { categoryId } : {}
        }]
      }),
      Stock.findAll({
        where: warehouseId ? { warehouseId } : {},
        include: [{
          model: Product,
          where: {
            isActive: true,
            ...(categoryId && { categoryId })
          },
          include: [{
            model: Category,
            attributes: ['id', 'name']
          }]
        }]
      })
    ]);

    // Calculate procurement costs
    const procurementCosts = {};
    let totalProcurementCost = 0;
    
    purchaseOrders.forEach(order => {
      order.PurchaseOrderItems.forEach(item => {
        const product = item.Product;
        const productKey = product.id;
        const cost = parseFloat(item.unitPrice) * item.quantity;
        
        if (!procurementCosts[productKey]) {
          procurementCosts[productKey] = {
            productId: product.id,
            productName: product.name,
            category: product.Category?.name || 'Uncategorized',
            totalCost: 0,
            quantity: 0,
            averageCost: 0,
            orders: 0
          };
        }
        
        procurementCosts[productKey].totalCost += cost;
        procurementCosts[productKey].quantity += item.quantity;
        procurementCosts[productKey].orders += 1;
        totalProcurementCost += cost;
      });
    });

    Object.values(procurementCosts).forEach(item => {
      item.averageCost = item.quantity > 0 ? item.totalCost / item.quantity : 0;
    });

    // Calculate holding costs (storage costs)
    const holdingCostRate = 0.25; // 25% annual holding cost rate
    const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const holdingCosts = {};
    let totalHoldingCost = 0;

    currentStock.forEach(stock => {
      const product = stock.Product;
      const costPrice = parseFloat(product.costPrice) || 0;
      const inventoryValue = stock.quantity * costPrice;
      const holdingCost = (inventoryValue * holdingCostRate * daysInPeriod) / 365;
      
      holdingCosts[product.id] = {
        productId: product.id,
        productName: product.name,
        category: product.Category?.name || 'Uncategorized',
        quantity: stock.quantity,
        inventoryValue,
        holdingCost: parseFloat(holdingCost.toFixed(2))
      };
      
      totalHoldingCost += holdingCost;
    });

    // Calculate shrinkage/loss costs
    const shrinkageCosts = {};
    let totalShrinkageCost = 0;

    stockMovements
      .filter(m => m.movementType === 'adjustment' && m.quantity < 0)
      .forEach(movement => {
        const product = movement.Product;
        const productKey = product.id;
        const costPrice = parseFloat(product.costPrice) || 0;
        const loss = Math.abs(movement.quantity) * costPrice;
        
        if (!shrinkageCosts[productKey]) {
          shrinkageCosts[productKey] = {
            productId: product.id,
            productName: product.name,
            category: product.Category?.name || 'Uncategorized',
            lostQuantity: 0,
            shrinkageCost: 0,
            incidents: 0
          };
        }
        
        shrinkageCosts[productKey].lostQuantity += Math.abs(movement.quantity);
        shrinkageCosts[productKey].shrinkageCost += loss;
        shrinkageCosts[productKey].incidents += 1;
        totalShrinkageCost += loss;
      });

    // Calculate revenue from sales
    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;

    stockMovements
      .filter(m => m.movementType === 'out')
      .forEach(movement => {
        const product = movement.Product;
        const quantity = Math.abs(movement.quantity);
        const unitPrice = parseFloat(product.unitPrice) || 0;
        const costPrice = parseFloat(product.costPrice) || 0;
        
        totalRevenue += quantity * unitPrice;
        totalCostOfGoodsSold += quantity * costPrice;
      });

    // Category-wise cost breakdown
    const categoryCosts = {};
    
    Object.values(procurementCosts).forEach(item => {
      if (!categoryCosts[item.category]) {
        categoryCosts[item.category] = {
          name: item.category,
          procurementCost: 0,
          holdingCost: 0,
          shrinkageCost: 0,
          totalCost: 0
        };
      }
      categoryCosts[item.category].procurementCost += item.totalCost;
    });

    Object.values(holdingCosts).forEach(item => {
      if (!categoryCosts[item.category]) {
        categoryCosts[item.category] = {
          name: item.category,
          procurementCost: 0,
          holdingCost: 0,
          shrinkageCost: 0,
          totalCost: 0
        };
      }
      categoryCosts[item.category].holdingCost += item.holdingCost;
    });

    Object.values(shrinkageCosts).forEach(item => {
      if (!categoryCosts[item.category]) {
        categoryCosts[item.category] = {
          name: item.category,
          procurementCost: 0,
          holdingCost: 0,
          shrinkageCost: 0,
          totalCost: 0
        };
      }
      categoryCosts[item.category].shrinkageCost += item.shrinkageCost;
    });

    Object.values(categoryCosts).forEach(cat => {
      cat.totalCost = cat.procurementCost + cat.holdingCost + cat.shrinkageCost;
    });

    // Overall totals
    const totalCosts = totalProcurementCost + totalHoldingCost + totalShrinkageCost;
    const grossProfit = totalRevenue - totalCostOfGoodsSold;
    const netProfit = grossProfit - (totalHoldingCost + totalShrinkageCost);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Cost efficiency metrics
    const holdingCostPercentage = totalCosts > 0 ? (totalHoldingCost / totalCosts) * 100 : 0;
    const shrinkageCostPercentage = totalCosts > 0 ? (totalShrinkageCost / totalCosts) * 100 : 0;
    const procurementEfficiency = totalRevenue > 0 ? (totalRevenue / totalProcurementCost) * 100 : 0;

    res.json({
      summary: {
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        totalProcurementCost: parseFloat(totalProcurementCost.toFixed(2)),
        totalHoldingCost: parseFloat(totalHoldingCost.toFixed(2)),
        totalShrinkageCost: parseFloat(totalShrinkageCost.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCostOfGoodsSold: parseFloat(totalCostOfGoodsSold.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        holdingCostPercentage: parseFloat(holdingCostPercentage.toFixed(2)),
        shrinkageCostPercentage: parseFloat(shrinkageCostPercentage.toFixed(2)),
        procurementEfficiency: parseFloat(procurementEfficiency.toFixed(2)),
        dateRange: { startDate, endDate }
      },
      costBreakdown: {
        procurement: Object.values(procurementCosts).sort((a, b) => b.totalCost - a.totalCost).slice(0, 20),
        holding: Object.values(holdingCosts).sort((a, b) => b.holdingCost - a.holdingCost).slice(0, 20),
        shrinkage: Object.values(shrinkageCosts).sort((a, b) => b.shrinkageCost - a.shrinkageCost)
      },
      categoryCosts: Object.values(categoryCosts).sort((a, b) => b.totalCost - a.totalCost)
    });
  } catch (error) {
    console.error('Cost analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profitability Analysis
router.get('/profitability', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const { warehouseId, categoryId } = req.query;
    
    // Get sales movements with product details
    const salesMovements = await StockMovement.findAll({
      where: {
        movementDate: {
          [Op.between]: [startDate, endDate]
        },
        movementType: 'out',
        ...(warehouseId && { warehouseId })
      },
      include: [{
        model: Product,
        include: [{
          model: Category,
          attributes: ['id', 'name']
        }],
        where: categoryId ? { categoryId } : {}
      }]
    });

    // Calculate profitability by product
    const productProfitability = {};
    
    salesMovements.forEach(movement => {
      const product = movement.Product;
      const productKey = product.id;
      const quantity = Math.abs(movement.quantity);
      const unitPrice = parseFloat(product.unitPrice) || 0;
      const costPrice = parseFloat(product.costPrice) || 0;
      const revenue = quantity * unitPrice;
      const cost = quantity * costPrice;
      const profit = revenue - cost;
      const margin = unitPrice > 0 ? ((unitPrice - costPrice) / unitPrice) * 100 : 0;
      
      if (!productProfitability[productKey]) {
        productProfitability[productKey] = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.Category?.name || 'Uncategorized',
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          profitMargin: margin
        };
      }
      
      productProfitability[productKey].quantitySold += quantity;
      productProfitability[productKey].revenue += revenue;
      productProfitability[productKey].cost += cost;
      productProfitability[productKey].profit += profit;
    });

    const profitabilityData = Object.values(productProfitability).sort((a, b) => b.profit - a.profit);

    // Category profitability
    const categoryProfitability = profitabilityData.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          name: item.category,
          products: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          profitMargin: 0
        };
      }
      acc[item.category].products++;
      acc[item.category].revenue += item.revenue;
      acc[item.category].cost += item.cost;
      acc[item.category].profit += item.profit;
      return acc;
    }, {});

    Object.values(categoryProfitability).forEach(cat => {
      cat.profitMargin = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;
    });

    // Calculate summary
    const totalRevenue = profitabilityData.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = profitabilityData.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const profitableProducts = profitabilityData.filter(p => p.profit > 0).length;
    const unprofitableProducts = profitabilityData.filter(p => p.profit < 0).length;

    res.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        averageMargin: parseFloat(averageMargin.toFixed(2)),
        profitableProducts,
        unprofitableProducts,
        totalProducts: profitabilityData.length,
        dateRange: { startDate, endDate }
      },
      products: profitabilityData,
      topProfitable: profitabilityData.filter(p => p.profit > 0).slice(0, 10),
      leastProfitable: profitabilityData.filter(p => p.profit > 0).sort((a, b) => a.profit - b.profit).slice(0, 10),
      unprofitable: profitabilityData.filter(p => p.profit < 0),
      categoryProfitability: Object.values(categoryProfitability).sort((a, b) => b.profit - a.profit)
    });
  } catch (error) {
    console.error('Profitability analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

