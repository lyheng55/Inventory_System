-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- Create initial admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password, firstName, lastName, role, isActive, createdAt, updatedAt) 
VALUES ('admin', 'admin@inventory.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8', 'System', 'Administrator', 'admin', 1, NOW(), NOW());

-- Create default categories
INSERT IGNORE INTO categories (name, description, isActive, createdAt, updatedAt) VALUES
('Electronics', 'Electronic devices and components', 1, NOW(), NOW()),
('Clothing', 'Apparel and fashion items', 1, NOW(), NOW()),
('Food & Beverages', 'Food items and drinks', 1, NOW(), NOW()),
('Books', 'Books and publications', 1, NOW(), NOW()),
('Home & Garden', 'Home improvement and garden supplies', 1, NOW(), NOW());

-- Create default warehouse
INSERT IGNORE INTO warehouses (name, code, address, city, state, zipCode, country, isActive, createdAt, updatedAt) 
VALUES ('Main Warehouse', 'MAIN', '123 Business St', 'Business City', 'BC', '12345', 'USA', 1, NOW(), NOW());

-- Create sample supplier
INSERT IGNORE INTO suppliers (name, contactPerson, email, phone, address, city, state, zipCode, country, paymentTerms, rating, isActive, createdAt, updatedAt) 
VALUES ('ABC Supply Co.', 'John Smith', 'john@abcsupply.com', '555-0123', '456 Supplier Ave', 'Supplier City', 'SC', '67890', 'USA', 'Net 30', 5, 1, NOW(), NOW());
