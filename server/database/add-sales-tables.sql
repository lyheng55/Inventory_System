-- Migration script to add Sales and Sale Items tables
-- This script creates the sales and sale_items tables for the POS system

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_number VARCHAR(50) NOT NULL UNIQUE,
  warehouse_id INT NOT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('completed', 'void', 'refunded') NOT NULL DEFAULT 'completed',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) DEFAULT 0.00,
  discount_amount DECIMAL(12, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('cash', 'card', 'other') NOT NULL DEFAULT 'cash',
  payment_amount DECIMAL(12, 2) NOT NULL,
  change_amount DECIMAL(12, 2) DEFAULT 0.00,
  customer_name VARCHAR(200),
  customer_email VARCHAR(100),
  customer_phone VARCHAR(20),
  notes TEXT,
  sold_by INT NOT NULL,
  voided_by INT,
  voided_at DATETIME,
  void_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (sold_by) REFERENCES users(id),
  FOREIGN KEY (voided_by) REFERENCES users(id),
  INDEX idx_sale_date (sale_date),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0.00,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_sale_id (sale_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

