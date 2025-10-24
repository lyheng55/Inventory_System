const mysql = require('mysql2/promise');
require('dotenv').config();

const setupMySQLOnly = async () => {
  try {
    console.log('🗄️  Setting up MySQL database...');
    
    // Connect to MySQL server
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '@dm!n'
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'inventory_db';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);

    // Use the database
    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Using database '${dbName}'`);

    // Create all tables
    console.log('🔧 Creating database tables...');
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role ENUM('admin', 'inventory_manager', 'sales_staff', 'auditor') NOT NULL DEFAULT 'sales_staff',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Suppliers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        country VARCHAR(50),
        payment_terms VARCHAR(50),
        rating INT DEFAULT 5,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
        zip_code VARCHAR(20),
        country VARCHAR(50),
        capacity INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sku VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        category_id INT,
        supplier_id INT,
        unit_price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        min_stock_level INT DEFAULT 0,
        max_stock_level INT,
        unit VARCHAR(20) DEFAULT 'pcs',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);

    // Stock table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        reserved_quantity INT DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        UNIQUE KEY unique_product_warehouse (product_id, warehouse_id)
      )
    `);

    // Stock Movements table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        type ENUM('in', 'out', 'transfer', 'adjustment') NOT NULL,
        quantity INT NOT NULL,
        reason VARCHAR(255),
        reference VARCHAR(100),
        user_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Purchase Orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INT NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'draft',
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expected_date DATETIME,
        total_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Purchase Order Items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        received_quantity INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('✅ All tables created successfully');

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
        INSERT INTO users (username, email, password, first_name, last_name, role)
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
        INSERT INTO warehouses (name, code, address, city, state, zip_code, country)
        VALUES ('Main Warehouse', 'MAIN', '123 Business St', 'Business City', 'BC', '12345', 'USA')
      `);
      console.log('✅ Default warehouse created');
    }

    // Create default supplier
    const [supplierCount] = await connection.execute('SELECT COUNT(*) as count FROM suppliers');
    if (supplierCount[0].count === 0) {
      await connection.execute(`
        INSERT INTO suppliers (name, contact_person, email, phone, address, city, state, zip_code, country, payment_terms, rating)
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
    console.log('3. Fix authentication plugin:');
    console.log('   ALTER USER "root"@"localhost" IDENTIFIED WITH mysql_native_password BY "root";');
    console.log('   FLUSH PRIVILEGES;');
    return false;
  }
};

module.exports = { setupMySQLOnly };

// Run setup if called directly
if (require.main === module) {
  setupMySQLOnly().then(success => {
    if (success) {
      console.log('✅ MySQL is ready to use');
      process.exit(0);
    } else {
      console.log('❌ MySQL setup failed');
      process.exit(1);
    }
  });
}
