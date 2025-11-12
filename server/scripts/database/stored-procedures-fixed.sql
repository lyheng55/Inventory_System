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

-- 4. Inventory Value Report with Profit Calculations
DROP PROCEDURE IF EXISTS GetInventoryValueReport;
DELIMITER $$
CREATE PROCEDURE GetInventoryValueReport(
    IN p_warehouse_id INT,
    IN p_category_id INT,
    IN p_valuation_method VARCHAR(20)
)
BEGIN
    -- Get inventory items with valuation
    SELECT 
        s.id,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        COALESCE(c.name, 'Uncategorized') as category,
        w.name as warehouse,
        s.quantity,
        p.cost_price,
        p.unit_price,
        (s.quantity * COALESCE(p.cost_price, 0)) as cost_value,
        (s.quantity * COALESCE(p.unit_price, 0)) as retail_value,
        CASE 
            WHEN p.unit_price > 0 AND p.cost_price > 0 THEN 
                ((p.unit_price - p.cost_price) / p.unit_price) * 100
            ELSE 0 
        END as profit_margin,
        ((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as profit_amount
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY 
        CASE p_valuation_method
            WHEN 'cost' THEN (s.quantity * COALESCE(p.cost_price, 0))
            WHEN 'retail' THEN (s.quantity * COALESCE(p.unit_price, 0))
            ELSE p.name
        END DESC;
    
    -- Get summary statistics
    SELECT 
        COUNT(*) as total_products,
        SUM(s.quantity) as total_quantity,
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as total_cost_value,
        SUM(s.quantity * COALESCE(p.unit_price, 0)) as total_retail_value,
        SUM((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as total_profit_amount,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                AVG(CASE 
                    WHEN p.unit_price > 0 AND p.cost_price > 0 THEN 
                        ((p.unit_price - p.cost_price) / p.unit_price) * 100
                    ELSE 0 
                END)
            ELSE 0 
        END as average_profit_margin
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
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as cost_value,
        SUM(s.quantity * COALESCE(p.unit_price, 0)) as retail_value,
        SUM((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as profit_amount
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    GROUP BY c.id, c.name
    ORDER BY category_name;
    
    -- Get warehouse summary
    SELECT 
        w.name as warehouse_name,
        COUNT(*) as count,
        SUM(s.quantity) as quantity,
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as cost_value,
        SUM(s.quantity * COALESCE(p.unit_price, 0)) as retail_value
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    GROUP BY w.id, w.name
    ORDER BY warehouse_name;
END$$
DELIMITER ;

-- 5. Purchase Orders Report with Performance Metrics
DROP PROCEDURE IF EXISTS GetPurchaseOrdersReport;
DELIMITER $$
CREATE PROCEDURE GetPurchaseOrdersReport(
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_supplier_id INT,
    IN p_warehouse_id INT,
    IN p_status VARCHAR(20),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    SET v_offset = (p_page - 1) * p_limit;
    
    -- Get purchase orders data
    SELECT 
        po.id,
        po.order_number,
        po.order_date,
        po.status,
        po.total_amount,
        po.final_amount,
        s.name as supplier_name,
        w.name as warehouse_name,
        COUNT(poi.id) as item_count,
        SUM(poi.quantity) as total_quantity,
        DATEDIFF(COALESCE(po.actual_delivery_date, NOW()), po.order_date) as days_to_receive
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN warehouses w ON po.warehouse_id = w.id
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
    GROUP BY po.id, po.order_number, po.order_date, po.status, po.total_amount, po.final_amount, s.name, w.name, po.actual_delivery_date
    ORDER BY po.order_date DESC
    LIMIT p_limit OFFSET v_offset;
    
    -- Get total count
    SELECT COUNT(*) as total_orders
    FROM purchase_orders po
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status);
    
    -- Get summary statistics
    SELECT 
        COUNT(*) as total_orders,
        SUM(COALESCE(po.final_amount, 0)) as total_value,
        AVG(COALESCE(po.final_amount, 0)) as average_order_value,
        COUNT(CASE WHEN po.status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN po.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN po.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN po.status = 'received' THEN 1 END) as received_count,
        COUNT(CASE WHEN po.status = 'cancelled' THEN 1 END) as cancelled_count,
        AVG(CASE WHEN po.actual_delivery_date IS NOT NULL THEN DATEDIFF(po.actual_delivery_date, po.order_date) ELSE NULL END) as avg_days_to_receive
    FROM purchase_orders po
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status);
    
    -- Get status summary
    SELECT 
        po.status,
        COUNT(*) as count,
        SUM(COALESCE(po.final_amount, 0)) as total_value
    FROM purchase_orders po
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
    GROUP BY po.status;
    
    -- Get supplier summary
    SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        COUNT(po.id) as order_count,
        SUM(COALESCE(po.final_amount, 0)) as total_value,
        AVG(COALESCE(po.final_amount, 0)) as average_order_value,
        AVG(CASE WHEN po.actual_delivery_date IS NOT NULL THEN DATEDIFF(po.actual_delivery_date, po.order_date) ELSE NULL END) as avg_delivery_days
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
    GROUP BY s.id, s.name
    ORDER BY total_value DESC;
END$$
DELIMITER ;

-- 6. Supplier Performance Report with Delivery Metrics
DROP PROCEDURE IF EXISTS GetSupplierPerformanceReport;
DELIMITER $$
CREATE PROCEDURE GetSupplierPerformanceReport(
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    -- Get supplier performance data
    SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.email,
        s.phone,
        s.rating,
        COUNT(po.id) as total_orders,
        SUM(COALESCE(po.final_amount, 0)) as total_order_value,
        AVG(COALESCE(po.final_amount, 0)) as average_order_value,
        COUNT(CASE WHEN po.status = 'received' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN po.status = 'cancelled' THEN 1 END) as cancelled_orders,
        AVG(CASE WHEN po.actual_delivery_date IS NOT NULL THEN DATEDIFF(po.actual_delivery_date, po.order_date) ELSE NULL END) as avg_delivery_days,
        COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND DATEDIFF(po.actual_delivery_date, po.order_date) <= 7 THEN 1 END) as on_time_deliveries,
        CASE 
            WHEN COUNT(po.id) > 0 THEN 
                (COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND DATEDIFF(po.actual_delivery_date, po.order_date) <= 7 THEN 1 END) * 100.0 / COUNT(po.id))
            ELSE 0 
        END as on_time_percentage
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
        AND po.order_date BETWEEN p_start_date AND p_end_date
    WHERE s.is_active = 1
    GROUP BY s.id, s.name, s.email, s.phone, s.rating
    ORDER BY total_order_value DESC;
    
    -- Get summary statistics
    SELECT 
        COUNT(DISTINCT s.id) as total_suppliers,
        COUNT(DISTINCT CASE WHEN po.id IS NOT NULL THEN s.id END) as active_suppliers,
        AVG(s.rating) as average_rating,
        AVG(CASE WHEN po.actual_delivery_date IS NOT NULL THEN DATEDIFF(po.actual_delivery_date, po.order_date) ELSE NULL END) as average_delivery_performance,
        SUM(COALESCE(po.final_amount, 0)) as total_supplier_value
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
        AND po.order_date BETWEEN p_start_date AND p_end_date
    WHERE s.is_active = 1;
END$$
DELIMITER ;

-- 7. Dashboard Summary Report with Calculations
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
