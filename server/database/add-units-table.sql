-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unit name/code (e.g., pcs, kg, liter, box)',
  display_name VARCHAR(100) NOT NULL COMMENT 'Human-readable unit name (e.g., Pieces, Kilograms, Liters, Boxes)',
  description TEXT COMMENT 'Description of the unit',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this unit is active and can be used'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default units
INSERT INTO units (name, display_name, description, is_active) VALUES
('pcs', 'Pieces', 'Individual items or pieces', TRUE),
('kg', 'Kilograms', 'Weight measurement in kilograms', TRUE),
('g', 'Grams', 'Weight measurement in grams', TRUE),
('liter', 'Liters', 'Volume measurement in liters', TRUE),
('ml', 'Milliliters', 'Volume measurement in milliliters', TRUE),
('box', 'Boxes', 'Items packaged in boxes', TRUE),
('pack', 'Packs', 'Items packaged in packs', TRUE),
('carton', 'Cartons', 'Items packaged in cartons', TRUE),
('bottle', 'Bottles', 'Items packaged in bottles', TRUE),
('can', 'Cans', 'Items packaged in cans', TRUE),
('bag', 'Bags', 'Items packaged in bags', TRUE),
('roll', 'Rolls', 'Items packaged in rolls', TRUE),
('meter', 'Meters', 'Length measurement in meters', TRUE),
('cm', 'Centimeters', 'Length measurement in centimeters', TRUE),
('dozen', 'Dozens', 'Items counted in dozens (12 pieces)', TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

