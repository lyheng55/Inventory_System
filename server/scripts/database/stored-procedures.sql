-- MySQL Stored Procedures for Inventory Reports
-- This file contains stored procedures to optimize report calculations

DELIMITER $$

-- 1. Stock Level Report with Summary Calculations
DROP PROCEDURE IF EXISTS GetStockReport$$
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

-- 2. Stock Movements Report with Summary Calculations
DROP PROCEDURE IF EXISTS GetStockMovementsReport$$
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
        sm.movement_type,
        sm.quantity,
        sm.previous_quantity,
        sm.new_quantity,
        sm.reason,
        sm.notes,
        sm.movement_date,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as performer
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN warehouses w ON sm.warehouse_id = w.id
    LEFT JOIN users u ON sm.performer_id = u.id
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type)
    ORDER BY sm.movement_date DESC
    LIMIT p_limit OFFSET v_offset;
    
    -- Get total count
    SELECT COUNT(*) as total_movements
    FROM stock_movements sm
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type);
    
    -- Get summary statistics
    SELECT 
        SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) as total_in_quantity,
        SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) as total_out_quantity,
        SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END) as net_quantity
    FROM stock_movements sm
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type);
    
    -- Get movement type summary
    SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as quantity
    FROM stock_movements sm
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type)
    GROUP BY movement_type;
    
    -- Get product summary
    SELECT 
        p.name as product_name,
        SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) as in_quantity,
        SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) as out_quantity,
        SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END) as net_quantity
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
        AND (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type)
    GROUP BY p.id, p.name
    ORDER BY product_name;
END$$

-- 3. Low Stock Alerts Report with Calculations
DROP PROCEDURE IF EXISTS GetLowStockAlertsReport$$
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

-- 4. Inventory Valuation Report with Calculations
DROP PROCEDURE IF EXISTS GetInventoryValueReport$$
CREATE PROCEDURE GetInventoryValueReport(
    IN p_warehouse_id INT,
    IN p_category_id INT,
    IN p_valuation_method VARCHAR(20)
)
BEGIN
    -- Get inventory valuation data with calculations
    SELECT 
        s.product_id,
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
    ORDER BY p.name;
    
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
    
    -- Get category valuation summary
    SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(*) as count,
        SUM(s.quantity) as total_quantity,
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
    ORDER BY category;
    
    -- Get warehouse valuation summary
    SELECT 
        w.name as warehouse,
        COUNT(*) as count,
        SUM(s.quantity) as total_quantity,
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as cost_value,
        SUM(s.quantity * COALESCE(p.unit_price, 0)) as retail_value,
        SUM((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as profit_amount
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    GROUP BY w.id, w.name
    ORDER BY warehouse;
END$$

-- 5. Purchase Orders Report with Calculations
DROP PROCEDURE IF EXISTS GetPurchaseOrdersReport$$
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
        s.name as supplier,
        w.name as warehouse,
        po.status,
        po.order_date,
        po.expected_delivery_date,
        po.actual_delivery_date,
        po.total_amount,
        po.final_amount,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) as item_count,
        CONCAT(COALESCE(creator.first_name, ''), ' ', COALESCE(creator.last_name, '')) as creator,
        CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approver,
        po.approved_at
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN warehouses w ON po.warehouse_id = w.id
    LEFT JOIN users creator ON po.created_by = creator.id
    LEFT JOIN users approver ON po.approved_by = approver.id
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
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
        SUM(COALESCE(po.final_amount, 0)) as total_value,
        CASE 
            WHEN COUNT(*) > 0 THEN SUM(COALESCE(po.final_amount, 0)) / COUNT(*)
            ELSE 0 
        END as average_order_value,
        CASE 
            WHEN COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) * 100.0) / 
                COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END)
            ELSE 0 
        END as delivery_performance
    FROM purchase_orders po
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status);
    
    -- Get status summary
    SELECT 
        status,
        COUNT(*) as count,
        SUM(COALESCE(final_amount, 0)) as value
    FROM purchase_orders po
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
    GROUP BY status;
    
    -- Get supplier summary
    SELECT 
        s.name as supplier_name,
        COUNT(*) as count,
        SUM(COALESCE(po.final_amount, 0)) as value
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.order_date BETWEEN p_start_date AND p_end_date
        AND (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
        AND (p_warehouse_id IS NULL OR po.warehouse_id = p_warehouse_id)
        AND (p_status IS NULL OR po.status = p_status)
    GROUP BY s.id, s.name
    ORDER BY supplier_name;
END$$

-- 6. Supplier Performance Report with Calculations
DROP PROCEDURE IF EXISTS GetSupplierPerformanceReport$$
CREATE PROCEDURE GetSupplierPerformanceReport(
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    -- Get supplier performance data with calculations
    SELECT 
        s.id,
        s.name,
        s.contact_person,
        s.email,
        s.phone,
        s.rating,
        COUNT(po.id) as total_orders,
        SUM(COALESCE(po.final_amount, 0)) as total_value,
        CASE 
            WHEN COUNT(po.id) > 0 THEN SUM(COALESCE(po.final_amount, 0)) / COUNT(po.id)
            ELSE 0 
        END as average_order_value,
        CASE 
            WHEN COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) * 100.0) / 
                COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END)
            ELSE 0 
        END as delivery_performance,
        CASE 
            WHEN COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL THEN 1 END) > 0 THEN
                AVG(DATEDIFF(po.actual_delivery_date, po.expected_delivery_date))
            ELSE 0 
        END as average_delivery_time,
        COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) as on_time_deliveries,
        COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END) as total_deliveries,
        MAX(po.order_date) as last_order_date
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
        AND po.order_date BETWEEN p_start_date AND p_end_date
    WHERE s.is_active = 1
    GROUP BY s.id, s.name, s.contact_person, s.email, s.phone, s.rating
    ORDER BY delivery_performance DESC, total_value DESC;
    
    -- Get summary statistics
    SELECT 
        COUNT(*) as total_suppliers,
        COUNT(CASE WHEN total_orders > 0 THEN 1 END) as active_suppliers,
        CASE 
            WHEN COUNT(*) > 0 THEN AVG(delivery_performance)
            ELSE 0 
        END as average_delivery_performance,
        SUM(total_value) as total_supplier_value
    FROM (
        SELECT 
            s.id,
            COUNT(po.id) as total_orders,
            CASE 
                WHEN COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END) > 0 THEN
                    (COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) * 100.0) / 
                    COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END)
                ELSE 0 
            END as delivery_performance,
            SUM(COALESCE(po.final_amount, 0)) as total_value
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
            AND po.order_date BETWEEN p_start_date AND p_end_date
        WHERE s.is_active = 1
        GROUP BY s.id
    ) supplier_stats;
END$$

-- 7. Dashboard Summary Report with Calculations
DROP PROCEDURE IF EXISTS GetDashboardSummary$$
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
        (SELECT COUNT(*) FROM stock_movements WHERE movement_date BETWEEN p_start_date AND p_end_date) as recent_movements,
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
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.movement_date,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as performer
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN warehouses w ON sm.warehouse_id = w.id
    LEFT JOIN users u ON sm.performer_id = u.id
    WHERE sm.movement_date BETWEEN p_start_date AND p_end_date
    ORDER BY sm.movement_date DESC
    LIMIT 10;
END$$

DELIMITER ;
