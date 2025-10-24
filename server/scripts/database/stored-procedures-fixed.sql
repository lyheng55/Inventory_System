-- MySQL Stored Procedures for Inventory Reports (Fixed Version)
-- This file contains stored procedures to optimize report calculations

-- 1. Stock Level Report with Summary Calculations
DROP PROCEDURE IF EXISTS GetStockReport;
DELIMITER $$
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
END$$
DELIMITER ;

-- 2. Stock Movements Report with Summary Calculations
DROP PROCEDURE IF EXISTS GetStockMovementsReport;
DELIMITER $$
CREATE PROCEDURE GetStockMovementsReport(
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_movement_type VARCHAR(10),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    SET v_offset = (p_page - 1) * p_limit;
    
    -- Get movements data
    SELECT 
        sm.id,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse,
        sm.type as movement_type,
        sm.quantity,
        sm.previous_quantity,
        sm.new_quantity,
        sm.reason,
        sm.notes,
        sm.created_at as movement_date,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as performer
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN warehouses w ON sm.warehouse_id = w.id
    LEFT JOIN users u ON sm.user_id = u.id
    WHERE sm.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.type = p_movement_type)
    ORDER BY sm.created_at DESC
    LIMIT p_limit OFFSET v_offset;
    
    -- Get total count
    SELECT COUNT(*) as total_movements
    FROM stock_movements sm
    WHERE sm.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.type = p_movement_type);
    
    -- Get summary statistics
    SELECT 
        SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in_quantity,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out_quantity,
        SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END) as net_quantity
    FROM stock_movements sm
    WHERE sm.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.type = p_movement_type);
    
    -- Get movement type summary
    SELECT 
        type as movement_type,
        COUNT(*) as count,
        SUM(quantity) as quantity
    FROM stock_movements sm
    WHERE sm.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.type = p_movement_type)
    GROUP BY type;
    
    -- Get product summary
    SELECT 
        p.name as product_name,
        SUM(CASE WHEN sm.type = 'in' THEN sm.quantity ELSE 0 END) as in_quantity,
        SUM(CASE WHEN sm.type = 'out' THEN sm.quantity ELSE 0 END) as out_quantity,
        SUM(CASE WHEN sm.type = 'in' THEN sm.quantity ELSE -sm.quantity END) as net_quantity
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.type = p_movement_type)
    GROUP BY p.id, p.name
    ORDER BY product_name;
END$$
DELIMITER ;

-- 3. Low Stock Alerts Report with Calculations
DROP PROCEDURE IF EXISTS GetLowStockAlertsReport;
DELIMITER $$
CREATE PROCEDURE GetLowStockAlertsReport(
    IN p_warehouse_id INT,
    IN p_category_id INT,
    IN p_critical_only BOOLEAN
)
BEGIN
    -- Get low stock alerts with calculations
    SELECT 
        s.product_id,
        p.name as product_name,
        p.sku as product_sku,
        COALESCE(c.name, 'Uncategorized') as category,
        w.name as warehouse,
        s.quantity as current_stock,
        p.reorder_point,
        p.min_stock_level,
        CASE 
            WHEN s.quantity <= p.min_stock_level THEN 1 
            ELSE 0 
        END as is_critical,
        CASE 
            WHEN p.reorder_point > 0 THEN CEIL(s.quantity / (p.reorder_point / 30))
            ELSE 0 
        END as days_until_reorder,
        GREATEST(p.reorder_point * 2 - s.quantity, p.reorder_point) as suggested_order_quantity,
        p.cost_price,
        (GREATEST(p.reorder_point * 2 - s.quantity, p.reorder_point) * COALESCE(p.cost_price, 0)) as estimated_cost
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (
            (p_critical_only AND s.quantity <= p.min_stock_level) OR
            (NOT p_critical_only AND s.quantity <= p.reorder_point)
        )
    ORDER BY s.quantity ASC;
    
    -- Get summary statistics
    SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN s.quantity <= p.min_stock_level THEN 1 ELSE 0 END) as critical_alerts,
        SUM((GREATEST(p.reorder_point * 2 - s.quantity, p.reorder_point) * COALESCE(p.cost_price, 0))) as total_estimated_cost,
        CASE 
            WHEN COUNT(*) > 0 THEN AVG(CASE WHEN p.reorder_point > 0 THEN CEIL(s.quantity / (p.reorder_point / 30)) ELSE 0 END)
            ELSE 0 
        END as average_days_until_reorder
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (
            (p_critical_only AND s.quantity <= p.min_stock_level) OR
            (NOT p_critical_only AND s.quantity <= p.reorder_point)
        );
    
    -- Get category alerts summary
    SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(*) as count,
        SUM(CASE WHEN s.quantity <= p.min_stock_level THEN 1 ELSE 0 END) as critical,
        SUM((GREATEST(p.reorder_point * 2 - s.quantity, p.reorder_point) * COALESCE(p.cost_price, 0))) as estimated_cost
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (
            (p_critical_only AND s.quantity <= p.min_stock_level) OR
            (NOT p_critical_only AND s.quantity <= p.reorder_point)
        )
    GROUP BY c.id, c.name
    ORDER BY category;
END$$
DELIMITER ;

-- 4. Dashboard Summary Report with Calculations
DROP PROCEDURE IF EXISTS GetDashboardSummary;
DELIMITER $$
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
END$$
DELIMITER ;
