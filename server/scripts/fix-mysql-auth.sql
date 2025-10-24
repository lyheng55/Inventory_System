-- Fix MySQL authentication plugin issue
-- This script changes the authentication method to mysql_native_password

-- Change root user authentication method
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;

-- Create inventory user with proper authentication
CREATE USER IF NOT EXISTS 'inventory_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'inventory_pass';
GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify the changes
SELECT user, host, plugin FROM mysql.user WHERE user IN ('root', 'inventory_user');
