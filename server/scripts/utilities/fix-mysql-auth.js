const mysql = require('mysql2/promise');
require('dotenv').config();

const fixMySQLAuth = async () => {
  try {
    console.log('🔧 Fixing MySQL authentication...');
    
    // Connect to MySQL server
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root'
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'inventory_db';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);

    // Fix authentication plugin for root user
    console.log('🔧 Fixing authentication plugin...');
    await connection.execute(`ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${process.env.DB_PASSWORD || 'root'}'`);
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ Authentication plugin fixed');

    // Grant privileges
    await connection.execute(`GRANT ALL PRIVILEGES ON ${dbName}.* TO 'root'@'localhost'`);
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ Privileges granted');

    // Use the database
    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Using database '${dbName}'`);

    // Create tables
    console.log('🔧 Creating tables...');
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(50) NOT NULL,
        lastName VARCHAR(50) NOT NULL,
        role ENUM('admin', 'inventory_manager', 'sales_staff', 'auditor') NOT NULL DEFAULT 'sales_staff',
        isActive BOOLEAN DEFAULT TRUE,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Suppliers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contactPerson VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        zipCode VARCHAR(20),
        country VARCHAR(50),
        paymentTerms VARCHAR(50),
        rating INT DEFAULT 5,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Warehouses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        zipCode VARCHAR(20),
        country VARCHAR(50),
        capacity INT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sku VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        categoryId INT,
        supplierId INT,
        unitPrice DECIMAL(10,2) NOT NULL,
        costPrice DECIMAL(10,2),
        minStockLevel INT DEFAULT 0,
        maxStockLevel INT,
        unit VARCHAR(20) DEFAULT 'pcs',
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id)
      )
    `);

    // Stock table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        warehouseId INT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        reservedQuantity INT DEFAULT 0,
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
        UNIQUE KEY unique_product_warehouse (productId, warehouseId)
      )
    `);

    console.log('✅ All tables created');

    // Create admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Check if admin exists
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@inventory.com']
    );

    if (existingAdmin.length === 0) {
      await connection.execute(`
        INSERT INTO users (username, email, password, firstName, lastName, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@inventory.com', hashedPassword, 'System', 'Administrator', 'admin']);
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create default categories
    const [categoryCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    if (categoryCount[0].count === 0) {
      await connection.execute(`
        INSERT INTO categories (name, description) VALUES
        ('Electronics', 'Electronic devices and components'),
        ('Clothing', 'Apparel and fashion items'),
        ('Food & Beverages', 'Food items and drinks'),
        ('Books', 'Books and publications'),
        ('Home & Garden', 'Home improvement and garden supplies')
      `);
      console.log('✅ Default categories created');
    }

    // Create default warehouse
    const [warehouseCount] = await connection.execute('SELECT COUNT(*) as count FROM warehouses');
    if (warehouseCount[0].count === 0) {
      await connection.execute(`
        INSERT INTO warehouses (name, code, address, city, state, zipCode, country)
        VALUES ('Main Warehouse', 'MAIN', '123 Business St', 'Business City', 'BC', '12345', 'USA')
      `);
      console.log('✅ Default warehouse created');
    }

    // Create default supplier
    const [supplierCount] = await connection.execute('SELECT COUNT(*) as count FROM suppliers');
    if (supplierCount[0].count === 0) {
      await connection.execute(`
        INSERT INTO suppliers (name, contactPerson, email, phone, address, city, state, zipCode, country, paymentTerms, rating)
        VALUES ('ABC Supply Co.', 'John Smith', 'john@abcsupply.com', '555-0123', '456 Supplier Ave', 'Supplier City', 'SC', '67890', 'USA', 'Net 30', 5)
      `);
      console.log('✅ Default supplier created');
    }

    await connection.end();
    console.log('🎉 MySQL setup completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Email: admin@inventory.com');
    console.log('Password: admin123');
    return true;

  } catch (error) {
    console.error('❌ MySQL setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Try connecting with MySQL client first');
    console.log('4. Make sure the user has CREATE DATABASE privileges');
    return false;
  }
};

module.exports = { fixMySQLAuth };

// Run setup if called directly
if (require.main === module) {
  fixMySQLAuth().then(success => {
    if (success) {
      console.log('✅ MySQL is ready to use');
      process.exit(0);
    } else {
      console.log('❌ MySQL setup failed');
      process.exit(1);
    }
  });
}
