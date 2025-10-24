-- Quick MySQL Setup for Inventory System
-- Run these commands in MySQL Command Line or MySQL Workbench

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS inventory_db;

-- 2. Use the database
USE inventory_db;

-- 3. Fix authentication plugin for root user (replace 'your_password' with your actual password)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;

-- 4. Grant all privileges (if needed)
GRANT ALL PRIVILEGES ON inventory_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- 5. Verify the setup
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';
