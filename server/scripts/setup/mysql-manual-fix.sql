-- Manual MySQL Fix for Authentication Issue
-- Run these commands in MySQL Command Line or MySQL Workbench

-- 1. Connect to MySQL as root
-- mysql -u root -p

-- 2. Create the database
CREATE DATABASE IF NOT EXISTS inventory_db;

-- 3. Use the database
USE inventory_db;

-- 4. Fix the authentication plugin for root user
-- Replace 'your_password' with your actual MySQL root password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;

-- 5. Grant all privileges
GRANT ALL PRIVILEGES ON inventory_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- 6. Verify the fix
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';

-- 7. Test connection
SHOW DATABASES;
