const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'inventory_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    authPlugins: {
      mysql_native_password: () => () => Buffer.alloc(0)
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
};

const setupMySQLDatabase = async () => {
  try {
    console.log('🔄 Setting up MySQL database...');
    
    // First, try to connect without specifying database to create it
    const adminSequelize = new Sequelize({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        authPlugins: {
          mysql_native_password: () => () => Buffer.alloc(0)
        }
      }
    });

    // Test connection
    await adminSequelize.authenticate();
    console.log('✅ MySQL server connection successful');

    // Create database if it doesn't exist
    try {
      await adminSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
      console.log(`✅ Database '${config.database}' created or already exists`);
    } catch (dbError) {
      console.warn('⚠️  Could not create database:', dbError.message);
    }

    await adminSequelize.close();

    // Now connect to the specific database
    const sequelize = new Sequelize(config);
    
    // Test connection to the specific database
    await sequelize.authenticate();
    console.log(`✅ Connected to database '${config.database}'`);

    // Import models
    const { User, Category, Warehouse, Supplier, Product, Stock, PurchaseOrder, PurchaseOrderItem, StockMovement } = require('../../models');

    // Sync database schema
    await sequelize.sync({ force: false });
    console.log('✅ Database schema synchronized');

    // Create default data
    await createDefaultData();

    console.log('🎉 MySQL database setup completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ MySQL database setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 MySQL server is not running. Please:');
      console.log('   1. Install MySQL server');
      console.log('   2. Start MySQL service');
      console.log('   3. Create a user with proper permissions');
    } else if (error.message.includes('Access denied')) {
      console.log('💡 Authentication failed. Please:');
      console.log('   1. Check username and password in .env file');
      console.log('   2. Ensure user has CREATE DATABASE privileges');
    } else if (error.message.includes('Unknown database')) {
      console.log('💡 Database does not exist. Please:');
      console.log('   1. Create the database manually');
      console.log('   2. Or fix the database name in .env file');
    }
    
    return false;
  }
};

const createDefaultData = async () => {
  const { User, Category, Warehouse, Supplier } = require('../../models');
  const { Op } = require('sequelize');

  try {
    // Create admin user
    const adminExists = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: 'admin@example.com' },
          { username: 'admin' }
        ]
      } 
    });
    
    if (!adminExists) {
      console.log('🔄 Creating admin user...');
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create default categories
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      console.log('🔄 Creating default categories...');
      await Category.bulkCreate([
        { name: 'Electronics', description: 'Electronic devices and components' },
        { name: 'Clothing', description: 'Apparel and fashion items' },
        { name: 'Food & Beverages', description: 'Food items and drinks' },
        { name: 'Books', description: 'Books and publications' },
        { name: 'Home & Garden', description: 'Home improvement and garden supplies' }
      ]);
      console.log('✅ Default categories created');
    } else {
      console.log('✅ Categories already exist');
    }

    // Create default warehouse
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
      console.log('🔄 Creating default warehouse...');
      await Warehouse.create({
        name: 'Main Warehouse',
        code: 'MAIN',
        address: '123 Business St',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'USA'
      });
      console.log('✅ Default warehouse created');
    } else {
      console.log('✅ Warehouse already exists');
    }

    // Create default supplier
    const supplierCount = await Supplier.count();
    if (supplierCount === 0) {
      console.log('🔄 Creating default supplier...');
      await Supplier.create({
        name: 'ABC Supply Co.',
        contactPerson: 'John Smith',
        email: 'john@abcsupply.com',
        phone: '555-0123',
        address: '456 Supplier Ave',
        city: 'Supplier City',
        state: 'SC',
        zipCode: '67890',
        country: 'USA',
        paymentTerms: 'Net 30',
        rating: 5
      });
      console.log('✅ Default supplier created');
    } else {
      console.log('✅ Supplier already exists');
    }

  } catch (error) {
    console.error('❌ Error creating default data:', error.message);
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  setupMySQLDatabase().then(success => {
    if (success) {
      console.log('✅ MySQL database is ready to use');
      process.exit(0);
    } else {
      console.log('❌ MySQL database setup failed');
      process.exit(1);
    }
  });
}

module.exports = { setupMySQLDatabase };
