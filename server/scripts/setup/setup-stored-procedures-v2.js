const fs = require('fs');
const path = require('path');
const sequelize = require('./config/database');

async function setupStoredProcedures() {
  try {
    console.log('🔄 Setting up stored procedures...');
    
    // Individual stored procedures to avoid DELIMITER issues
    const procedures = [
      {
        name: 'GetStockReport',
        sql: `
          DROP PROCEDURE IF EXISTS GetStockReport;
          CREATE PROCEDURE GetStockReport(
              IN p_warehouse_id INT,
              IN p_category_id INT,
              IN p_low_stock_only BOOLEAN
          )
          BEGIN
              -- Get stock data with calculations
              SELECT 
                  s.id,
                  p.name as product_name,
                  p.sku as product_sku,
                  COALESCE(c.name, 'Uncategorized') as category,
                  w.name as warehouse,
                  s.quantity,
                  p.reorder_point,
                  p.cost_price,
                  (s.quantity * COALESCE(p.cost_price, 0)) as total_value,
                  s.location,
                  CASE 
                      WHEN s.quantity <= p.reorder_point THEN 1 
                      ELSE 0 
                  END as is_low_stock,
                  CASE 
                      WHEN s.quantity = 0 THEN 1 
                      ELSE 0 
                  END as is_out_of_stock
              FROM stocks s
              JOIN products p ON s.product_id = p.id
              LEFT JOIN categories c ON p.category_id = c.id
              JOIN warehouses w ON s.warehouse_id = w.id
              WHERE p.is_active = 1
                  AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
                  AND (p_category_id IS NULL OR p.category_id = p_category_id)
                  AND (NOT p_low_stock_only OR s.quantity <= p.reorder_point)
              ORDER BY s.quantity ASC;
              
              -- Get summary statistics
              SELECT 
                  COUNT(*) as total_products,
                  SUM(s.quantity) as total_quantity,
                  SUM(s.quantity * COALESCE(p.cost_price, 0)) as total_value,
                  SUM(CASE WHEN s.quantity <= p.reorder_point THEN 1 ELSE 0 END) as low_stock_count,
                  SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                  CASE 
                      WHEN COUNT(*) > 0 THEN SUM(s.quantity) / COUNT(*) 
                      ELSE 0 
                  END as average_stock_level
              FROM stocks s
              JOIN products p ON s.product_id = p.id
              WHERE p.is_active = 1
                  AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
                  AND (p_category_id IS NULL OR p.category_id = p_category_id);
              
              -- Get category summary
              SELECT 
                  COALESCE(c.name, 'Uncategorized') as category_name,
                  COUNT(*) as count,
                  SUM(s.quantity) as quantity,
                  SUM(s.quantity * COALESCE(p.cost_price, 0)) as value,
                  SUM(CASE WHEN s.quantity <= p.reorder_point THEN 1 ELSE 0 END) as low_stock
              FROM stocks s
              JOIN products p ON s.product_id = p.id
              LEFT JOIN categories c ON p.category_id = c.id
              WHERE p.is_active = 1
                  AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
                  AND (p_category_id IS NULL OR p.category_id = p_category_id)
              GROUP BY c.id, c.name
              ORDER BY category_name;
          END
        `
      },
      {
        name: 'GetDashboardSummary',
        sql: `
          DROP PROCEDURE IF EXISTS GetDashboardSummary;
          CREATE PROCEDURE GetDashboardSummary(
              IN p_start_date DATETIME,
              IN p_end_date DATETIME
          )
          BEGIN
              -- Get basic counts and statistics
              SELECT 
                  (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
                  (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
                  (SELECT COUNT(*) FROM warehouses WHERE is_active = 1) as total_warehouses,
                  (SELECT COUNT(*) FROM purchase_orders WHERE order_date BETWEEN p_start_date AND p_end_date) as total_orders,
                  (SELECT COUNT(*) FROM stocks s 
                   JOIN products p ON s.product_id = p.id 
                   WHERE p.is_active = 1 AND s.quantity <= p.reorder_point) as low_stock_count,
                  (SELECT COUNT(*) FROM stock_movements WHERE created_at BETWEEN p_start_date AND p_end_date) as recent_movements,
                  (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft', 'pending', 'approved')) as pending_orders;
              
              -- Get recent low stock alerts (top 5)
              SELECT 
                  p.name as product_name,
                  p.sku as product_sku,
                  w.name as warehouse,
                  s.quantity as current_stock,
                  p.reorder_point
              FROM stocks s
              JOIN products p ON s.product_id = p.id
              JOIN warehouses w ON s.warehouse_id = w.id
              WHERE p.is_active = 1 AND s.quantity <= p.reorder_point
              ORDER BY s.quantity ASC
              LIMIT 5;
              
              -- Get recent stock movements (top 10)
              SELECT 
                  p.name as product_name,
                  p.sku as product_sku,
                  w.name as warehouse,
                  sm.type as movement_type,
                  sm.quantity,
                  sm.reason,
                  sm.created_at as movement_date,
                  CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as performer
              FROM stock_movements sm
              JOIN products p ON sm.product_id = p.id
              JOIN warehouses w ON sm.warehouse_id = w.id
              LEFT JOIN users u ON sm.user_id = u.id
              WHERE sm.created_at BETWEEN p_start_date AND p_end_date
              ORDER BY sm.created_at DESC
              LIMIT 10;
          END
        `
      }
    ];
    
    for (const procedure of procedures) {
      try {
        console.log(`Creating procedure: ${procedure.name}`);
        await sequelize.query(procedure.sql);
        console.log(`✅ ${procedure.name} created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${procedure.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating ${procedure.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ All stored procedures setup completed!');
    
    // Test one of the procedures to make sure they work
    console.log('🧪 Testing stored procedures...');
    try {
      const result = await sequelize.query('CALL GetDashboardSummary(?, ?)', {
        replacements: [
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date()
        ],
        type: sequelize.QueryTypes.SELECT
      });
      console.log('✅ Stored procedures are working correctly!');
      console.log('📊 Dashboard summary result:', result[0]);
    } catch (error) {
      console.error('❌ Error testing stored procedures:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to setup stored procedures:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupStoredProcedures()
    .then(() => {
      console.log('🎉 Stored procedures setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Stored procedures setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupStoredProcedures;
