-- Additional Stored Procedures for Inventory Calculations
-- This file contains additional stored procedures to move calculations from JavaScript to database level

DELIMITER $$

-- 1. Purchase Order Calculations and Processing
DROP PROCEDURE IF EXISTS CalculatePurchaseOrderTotals$$
CREATE PROCEDURE CalculatePurchaseOrderTotals(
    IN p_purchase_order_id INT
)
BEGIN
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_final_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_tax_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_discount_amount DECIMAL(10,2) DEFAULT 0;
    
    -- Calculate totals from order items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_total_amount, v_final_amount, v_tax_amount, v_discount_amount
    FROM purchase_order_items 
    WHERE purchase_order_id = p_purchase_order_id;
    
    -- Update the purchase order with calculated totals
    UPDATE purchase_orders 
    SET 
        total_amount = v_total_amount,
        final_amount = v_final_amount + v_tax_amount - v_discount_amount,
        tax_amount = v_tax_amount,
        discount_amount = v_discount_amount,
        updated_at = NOW()
    WHERE id = p_purchase_order_id;
    
    -- Return the calculated values
    SELECT 
        v_total_amount as total_amount,
        v_final_amount + v_tax_amount - v_discount_amount as final_amount,
        v_tax_amount as tax_amount,
        v_discount_amount as discount_amount;
END$$

-- 2. Stock Movement Calculations
DROP PROCEDURE IF EXISTS CalculateStockMovementImpact$$
CREATE PROCEDURE CalculateStockMovementImpact(
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_movement_type VARCHAR(10),
    IN p_quantity INT,
    IN p_reason VARCHAR(255),
    IN p_notes TEXT,
    IN p_performer_id INT
)
BEGIN
    DECLARE v_previous_quantity INT DEFAULT 0;
    DECLARE v_new_quantity INT DEFAULT 0;
    DECLARE v_stock_exists BOOLEAN DEFAULT FALSE;
    
    -- Check if stock record exists
    SELECT COUNT(*) > 0 INTO v_stock_exists
    FROM stocks 
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
    
    -- Get current quantity
    IF v_stock_exists THEN
        SELECT quantity INTO v_previous_quantity
        FROM stocks 
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
    END IF;
    
    -- Calculate new quantity based on movement type
    IF p_movement_type = 'in' THEN
        SET v_new_quantity = v_previous_quantity + p_quantity;
    ELSEIF p_movement_type = 'out' THEN
        SET v_new_quantity = GREATEST(0, v_previous_quantity - p_quantity);
    ELSEIF p_movement_type = 'adjustment' THEN
        SET v_new_quantity = p_quantity;
    END IF;
    
    -- Update or create stock record
    IF v_stock_exists THEN
        UPDATE stocks 
        SET quantity = v_new_quantity, updated_at = NOW()
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
    ELSE
        INSERT INTO stocks (product_id, warehouse_id, quantity, created_at, updated_at)
        VALUES (p_product_id, p_warehouse_id, v_new_quantity, NOW(), NOW());
    END IF;
    
    -- Record the stock movement
    INSERT INTO stock_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, notes, 
        performer_id, movement_date, created_at
    ) VALUES (
        p_product_id, p_warehouse_id, p_movement_type, p_quantity,
        v_previous_quantity, v_new_quantity, p_reason, p_notes,
        p_performer_id, NOW(), NOW()
    );
    
    -- Return the movement details
    SELECT 
        v_previous_quantity as previous_quantity,
        v_new_quantity as new_quantity,
        p_quantity as movement_quantity,
        p_movement_type as movement_type;
END$$

-- 3. Advanced Inventory Valuation with Multiple Methods
DROP PROCEDURE IF EXISTS GetAdvancedInventoryValuation$$
CREATE PROCEDURE GetAdvancedInventoryValuation(
    IN p_warehouse_id INT,
    IN p_category_id INT,
    IN p_valuation_method VARCHAR(20)
)
BEGIN
    -- Get detailed inventory valuation with advanced calculations
    SELECT 
        s.product_id,
        p.name as product_name,
        p.sku as product_sku,
        COALESCE(c.name, 'Uncategorized') as category,
        w.name as warehouse,
        s.quantity,
        p.cost_price,
        p.unit_price,
        p.reorder_point,
        p.min_stock_level,
        -- Cost-based valuation
        (s.quantity * COALESCE(p.cost_price, 0)) as cost_value,
        -- Retail-based valuation
        (s.quantity * COALESCE(p.unit_price, 0)) as retail_value,
        -- Profit calculations
        CASE 
            WHEN p.unit_price > 0 AND p.cost_price > 0 THEN 
                ((p.unit_price - p.cost_price) / p.unit_price) * 100
            ELSE 0 
        END as profit_margin_percent,
        ((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as profit_amount,
        -- Stock status indicators
        CASE 
            WHEN s.quantity <= p.min_stock_level THEN 'Critical'
            WHEN s.quantity <= p.reorder_point THEN 'Low'
            ELSE 'Normal'
        END as stock_status,
        -- Turnover calculations (simplified)
        CASE 
            WHEN p.reorder_point > 0 THEN 
                ROUND(s.quantity / (p.reorder_point / 30), 2)
            ELSE 0 
        END as estimated_days_supply,
        -- ABC Analysis (simplified based on value)
        CASE 
            WHEN (s.quantity * COALESCE(p.unit_price, 0)) >= 10000 THEN 'A'
            WHEN (s.quantity * COALESCE(p.unit_price, 0)) >= 1000 THEN 'B'
            ELSE 'C'
        END as abc_classification
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
    
    -- Get comprehensive summary statistics
    SELECT 
        COUNT(*) as total_products,
        SUM(s.quantity) as total_quantity,
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as total_cost_value,
        SUM(s.quantity * COALESCE(p.unit_price, 0)) as total_retail_value,
        SUM((s.quantity * COALESCE(p.unit_price, 0)) - (s.quantity * COALESCE(p.cost_price, 0))) as total_profit_amount,
        -- Average calculations
        CASE 
            WHEN COUNT(*) > 0 THEN 
                AVG(CASE 
                    WHEN p.unit_price > 0 AND p.cost_price > 0 THEN 
                        ((p.unit_price - p.cost_price) / p.unit_price) * 100
                    ELSE 0 
                END)
            ELSE 0 
        END as average_profit_margin,
        -- Stock status counts
        SUM(CASE WHEN s.quantity <= p.min_stock_level THEN 1 ELSE 0 END) as critical_stock_count,
        SUM(CASE WHEN s.quantity <= p.reorder_point THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        -- ABC Analysis counts
        SUM(CASE WHEN (s.quantity * COALESCE(p.unit_price, 0)) >= 10000 THEN 1 ELSE 0 END) as class_a_count,
        SUM(CASE WHEN (s.quantity * COALESCE(p.unit_price, 0)) >= 1000 AND (s.quantity * COALESCE(p.unit_price, 0)) < 10000 THEN 1 ELSE 0 END) as class_b_count,
        SUM(CASE WHEN (s.quantity * COALESCE(p.unit_price, 0)) < 1000 THEN 1 ELSE 0 END) as class_c_count
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE p.is_active = 1
        AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        AND (p_category_id IS NULL OR p.category_id = p_category_id);
END$$

-- 4. Purchase Order Item Calculations
DROP PROCEDURE IF EXISTS CalculatePurchaseOrderItemTotals$$
CREATE PROCEDURE CalculatePurchaseOrderItemTotals(
    IN p_quantity INT,
    IN p_unit_price DECIMAL(10,2),
    IN p_tax_rate DECIMAL(5,2) DEFAULT 0,
    IN p_discount_percent DECIMAL(5,2) DEFAULT 0
)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_discount_amount DECIMAL(10,2);
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    
    -- Calculate subtotal
    SET v_subtotal = p_quantity * p_unit_price;
    
    -- Calculate discount amount
    SET v_discount_amount = v_subtotal * (p_discount_percent / 100);
    
    -- Calculate tax on discounted amount
    SET v_tax_amount = (v_subtotal - v_discount_amount) * (p_tax_rate / 100);
    
    -- Calculate final total
    SET v_total = v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Return calculated values
    SELECT 
        v_subtotal as subtotal,
        v_discount_amount as discount_amount,
        v_tax_amount as tax_amount,
        v_total as total_amount;
END$$

-- 5. Stock Reorder Calculations
DROP PROCEDURE IF EXISTS CalculateReorderSuggestions$$
CREATE PROCEDURE CalculateReorderSuggestions(
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_lead_time_days INT DEFAULT 7,
    IN p_safety_stock_percent DECIMAL(5,2) DEFAULT 20
)
BEGIN
    DECLARE v_current_stock INT DEFAULT 0;
    DECLARE v_reorder_point INT DEFAULT 0;
    DECLARE v_min_stock_level INT DEFAULT 0;
    DECLARE v_avg_daily_usage DECIMAL(10,2) DEFAULT 0;
    DECLARE v_suggested_order_qty INT DEFAULT 0;
    DECLARE v_estimated_cost DECIMAL(10,2) DEFAULT 0;
    DECLARE v_days_until_stockout INT DEFAULT 0;
    
    -- Get current stock and product details
    SELECT 
        COALESCE(s.quantity, 0),
        COALESCE(p.reorder_point, 0),
        COALESCE(p.min_stock_level, 0),
        COALESCE(p.cost_price, 0)
    INTO v_current_stock, v_reorder_point, v_min_stock_level, v_estimated_cost
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id AND s.warehouse_id = p_warehouse_id
    WHERE p.id = p_product_id;
    
    -- Calculate average daily usage (simplified - based on reorder point)
    IF v_reorder_point > 0 THEN
        SET v_avg_daily_usage = v_reorder_point / 30.0; -- Assuming 30-day reorder cycle
    END IF;
    
    -- Calculate days until stockout
    IF v_avg_daily_usage > 0 THEN
        SET v_days_until_stockout = FLOOR(v_current_stock / v_avg_daily_usage);
    ELSE
        SET v_days_until_stockout = 999; -- No usage data
    END IF;
    
    -- Calculate suggested order quantity
    IF v_reorder_point > 0 THEN
        SET v_suggested_order_qty = GREATEST(
            v_reorder_point * 2 - v_current_stock,
            v_reorder_point
        );
    ELSE
        SET v_suggested_order_qty = v_current_stock + 10; -- Default suggestion
    END IF;
    
    -- Calculate estimated cost
    SET v_estimated_cost = v_suggested_order_qty * v_estimated_cost;
    
    -- Return reorder suggestions
    SELECT 
        p_product_id as product_id,
        p_warehouse_id as warehouse_id,
        v_current_stock as current_stock,
        v_reorder_point as reorder_point,
        v_min_stock_level as min_stock_level,
        v_avg_daily_usage as avg_daily_usage,
        v_days_until_stockout as days_until_stockout,
        v_suggested_order_qty as suggested_order_quantity,
        v_estimated_cost as estimated_cost,
        CASE 
            WHEN v_current_stock <= v_min_stock_level THEN 'Critical'
            WHEN v_current_stock <= v_reorder_point THEN 'Low'
            WHEN v_days_until_stockout <= p_lead_time_days THEN 'Reorder Soon'
            ELSE 'Normal'
        END as reorder_status;
END$$

-- 6. Comprehensive Dashboard Calculations
DROP PROCEDURE IF EXISTS GetDashboardCalculations$$
CREATE PROCEDURE GetDashboardCalculations(
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    -- Basic counts
    SELECT 
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
        (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
        (SELECT COUNT(*) FROM warehouses WHERE is_active = 1) as total_warehouses,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users;
    
    -- Stock statistics
    SELECT 
        COUNT(*) as total_stock_items,
        SUM(quantity) as total_quantity,
        SUM(quantity * COALESCE(p.cost_price, 0)) as total_cost_value,
        SUM(quantity * COALESCE(p.unit_price, 0)) as total_retail_value,
        SUM(CASE WHEN s.quantity <= p.reorder_point THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN s.quantity <= p.min_stock_level THEN 1 ELSE 0 END) as critical_stock_count,
        SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE p.is_active = 1;
    
    -- Purchase order statistics
    SELECT 
        COUNT(*) as total_orders,
        SUM(COALESCE(final_amount, 0)) as total_order_value,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
    FROM purchase_orders
    WHERE order_date BETWEEN p_start_date AND p_end_date;
    
    -- Stock movement statistics
    SELECT 
        COUNT(*) as total_movements,
        SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) as total_in_quantity,
        SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) as total_out_quantity,
        SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END) as net_quantity
    FROM stock_movements
    WHERE movement_date BETWEEN p_start_date AND p_end_date;
    
    -- Top 5 low stock items
    SELECT 
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse,
        s.quantity as current_stock,
        p.reorder_point,
        p.min_stock_level,
        CASE 
            WHEN s.quantity <= p.min_stock_level THEN 'Critical'
            WHEN s.quantity <= p.reorder_point THEN 'Low'
            ELSE 'Normal'
        END as status
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE p.is_active = 1 AND s.quantity <= p.reorder_point
    ORDER BY s.quantity ASC
    LIMIT 5;
    
    -- Recent stock movements (last 10)
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
