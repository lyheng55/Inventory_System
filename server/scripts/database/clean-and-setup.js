const path = require('path');
const fs = require('fs');

// Try to load .env from multiple locations
const rootEnvPath = path.join(__dirname, '../../../.env');
const serverEnvPath = path.join(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else {
  require('dotenv').config();
}

// Check for required environment variables before loading models
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Database credentials must be set in environment variables');
  console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD');
  console.error('');
  console.error('💡 Please create a .env file in either:');
  console.error('   - Project root: .env');
  console.error('   - Server directory: server/.env');
  console.error('');
  console.error('   With the following variables:');
  console.error('   DB_HOST=localhost');
  console.error('   DB_PORT=3306');
  console.error('   DB_NAME=inventory_db');
  console.error('   DB_USER=your_username');
  console.error('   DB_PASSWORD=your_password');
  process.exit(1);
}

const { sequelize } = require('../../models');
const { Op } = require('sequelize');

const cleanAndSetupDatabase = async () => {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Clean all data
    console.log('🧹 Cleaning all existing data...');
    
    const { User, Category, Warehouse, Supplier, Product, Stock, PurchaseOrder, PurchaseOrderItem, StockMovement, Sale, SaleItem, Permission, Role, RolePermission, UserPermission, AuditLog } = require('../../models');
    
    // Delete all data in reverse dependency order
    // Start with permission-related tables
    try {
      await UserPermission.destroy({ where: {}, force: true });
      console.log('✅ User permissions cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean user permissions:', error.message);
    }
    
    try {
      await RolePermission.destroy({ where: {}, force: true });
      console.log('✅ Role permissions cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean role permissions:', error.message);
    }
    
    try {
      await Permission.destroy({ where: {}, force: true });
      console.log('✅ Permissions cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean permissions:', error.message);
    }
    
    try {
      await Role.destroy({ where: {}, force: true });
      console.log('✅ Roles cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean roles:', error.message);
    }
    
    try {
      await AuditLog.destroy({ where: {}, force: true });
      console.log('✅ Audit logs cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean audit logs:', error.message);
    }
    
    // Continue with business data
    try {
      await SaleItem.destroy({ where: {}, force: true });
      console.log('✅ Sale items cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean sale items:', error.message);
    }
    
    try {
      await StockMovement.destroy({ where: {}, force: true });
      console.log('✅ Stock movements cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean stock movements:', error.message);
    }
    
    try {
      await PurchaseOrderItem.destroy({ where: {}, force: true });
      console.log('✅ Purchase order items cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean purchase order items:', error.message);
    }
    
    try {
      await Sale.destroy({ where: {}, force: true });
      console.log('✅ Sales cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean sales:', error.message);
    }
    
    try {
      await Stock.destroy({ where: {}, force: true });
      console.log('✅ Stock records cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean stock records:', error.message);
    }
    
    try {
      await PurchaseOrder.destroy({ where: {}, force: true });
      console.log('✅ Purchase orders cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean purchase orders:', error.message);
    }
    
    try {
      await Product.destroy({ where: {}, force: true });
      console.log('✅ Products cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean products:', error.message);
    }
    
    try {
      await Supplier.destroy({ where: {}, force: true });
      console.log('✅ Suppliers cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean suppliers:', error.message);
    }
    
    try {
      await Warehouse.destroy({ where: {}, force: true });
      console.log('✅ Warehouses cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean warehouses:', error.message);
    }
    
    try {
      await Category.destroy({ where: {}, force: true });
      console.log('✅ Categories cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean categories:', error.message);
    }
    
    try {
      await User.destroy({ where: {}, force: true });
      console.log('✅ Users cleaned');
    } catch (error) {
      console.warn('⚠️  Could not clean users:', error.message);
    }
    
    console.log('🎉 All data cleaned successfully!');
    
    // Sync database schema to ensure all tables are up to date
    console.log('🔄 Syncing database schema...');
    try {
      const { 
        User, Category, Product, Supplier, Warehouse, Stock, 
        PurchaseOrder, PurchaseOrderItem, StockMovement, 
        Sale, SaleItem, Permission, Role, RolePermission, 
        UserPermission, AuditLog 
      } = require('../../models');
      
      // Sync tables individually in dependency order to avoid foreign key constraint errors
      // Base tables (no dependencies)
      await User.sync({ alter: true });
      await Category.sync({ alter: true });
      await Role.sync({ alter: true });
      await Permission.sync({ alter: true });
      await Supplier.sync({ alter: true });
      await Warehouse.sync({ alter: true });
      
      // Tables with foreign keys to base tables
      await RolePermission.sync({ alter: true });
      await UserPermission.sync({ alter: true });
      await Product.sync({ alter: true });
      await Stock.sync({ alter: true });
      await PurchaseOrder.sync({ alter: true });
      await PurchaseOrderItem.sync({ alter: true });
      await StockMovement.sync({ alter: true });
      await Sale.sync({ alter: true });
      await SaleItem.sync({ alter: true });
      await AuditLog.sync({ alter: true });
      
      console.log('✅ Database schema synchronized');
    } catch (error) {
      console.warn('⚠️  Could not sync database schema:', error.message);
      // Continue anyway - migration script will handle table creation
    }
    
    // Run CRUD permissions migration
    console.log('🔄 Setting up CRUD permissions system...');
    try {
      // Import the migration function directly (it will handle its own connection)
      const migrationScript = require('./migrate-to-crud-permissions');
      await migrationScript.migrateToCrudPermissions();
      console.log('✅ CRUD permissions system initialized');
    } catch (error) {
      console.error('❌ Failed to set up CRUD permissions:', error.message);
      // Don't throw - continue with user creation
    }
    
    // Reconnect to database after migration (migration closes connection)
    try {
      await sequelize.authenticate();
      console.log('✅ Database reconnected');
    } catch (error) {
      console.warn('⚠️  Could not reconnect to database:', error.message);
    }
    
    // Now create fresh admin user and default data
    console.log('🔄 Creating fresh admin user and default data...');
    
    // Create admin user
    console.log('🔄 Creating admin user...');
    try {
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
    } catch (userError) {
      console.error('❌ Failed to create admin user:', userError.message);
      console.error('User validation details:', userError.errors || 'No detailed errors');
      throw userError;
    }
    
    // Create test user
    console.log('🔄 Creating test user...');
    try {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'sales_staff',
        isActive: true
      });
      console.log('✅ Test user created');
    } catch (userError) {
      console.error('❌ Failed to create test user:', userError.message);
      console.error('User validation details:', userError.errors || 'No detailed errors');
      // Don't throw error for test user, just log it
    }
    
    // Create default categories
    console.log('🔄 Creating default categories...');
    try {
      await Category.bulkCreate([
        { name: 'Electronics', description: 'Electronic devices and components' },
        { name: 'Clothing', description: 'Apparel and fashion items' },
        { name: 'Food & Beverages', description: 'Food items and drinks' },
        { name: 'Books', description: 'Books and publications' },
        { name: 'Home & Garden', description: 'Home improvement and garden supplies' }
      ]);
      console.log('✅ Default categories created');
    } catch (categoryError) {
      console.error('❌ Failed to create categories:', categoryError.message);
      throw categoryError;
    }
    
    // Create default warehouse
    console.log('🔄 Creating default warehouse...');
    try {
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
    } catch (warehouseError) {
      console.error('❌ Failed to create warehouse:', warehouseError.message);
      throw warehouseError;
    }
    
    // Create default supplier
    console.log('🔄 Creating default supplier...');
    try {
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
    } catch (supplierError) {
      console.error('❌ Failed to create supplier:', supplierError.message);
      throw supplierError;
    }
    
    console.log('🎉 Database cleaned and setup completed successfully!');
    console.log('👤 Admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('👤 Test user credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test123!');
    console.log('   Role: sales_staff');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database clean and setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Database server is not running. Please:');
      console.log('   1. Ensure database server is installed and running');
      console.log('   2. Check connection settings in .env file');
    } else if (error.message.includes('Access denied')) {
      console.log('💡 Authentication failed. Please:');
      console.log('   1. Check username and password in .env file');
      console.log('   2. Ensure user has proper database privileges');
    } else if (error.message.includes('Validation')) {
      console.log('💡 Data validation error. Please check:');
      console.log('   1. Required fields are provided');
      console.log('   2. Data types match model definitions');
      console.log('   3. Unique constraints are not violated');
    }
    
    return false;
  }
};

module.exports = { cleanAndSetupDatabase };

// Run setup if called directly
if (require.main === module) {
  cleanAndSetupDatabase().then(success => {
    if (success) {
      console.log('✅ Database is ready to use with admin user');
      process.exit(0);
    } else {
      console.log('❌ Database clean and setup failed');
      process.exit(1);
    }
  });
}
