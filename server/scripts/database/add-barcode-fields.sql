-- Add barcode and QR code fields to products table
-- This script adds the barcode and qr_code columns if they don't exist

USE inventory_db;

-- Add barcode column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE;

-- Add QR code column if it doesn't exist  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);

-- Add index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Add other missing fields that might be needed
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS reorder_point INT DEFAULT 10;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS expiry_date DATE NULL;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_perishable BOOLEAN DEFAULT FALSE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image VARCHAR(255);

-- Update existing products to have barcodes if they don't have them
UPDATE products 
SET barcode = CONCAT('INV', LPAD(id, 6, '0'), UPPER(SUBSTRING(sku, 1, 4)))
WHERE barcode IS NULL OR barcode = '';

-- Show the updated table structure
DESCRIBE products;
