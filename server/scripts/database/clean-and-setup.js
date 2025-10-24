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
    
    const { User, Category, Warehouse, Supplier, Product, Stock, PurchaseOrder, PurchaseOrderItem, StockMovement } = require('../../models');
    
    // Delete all data in reverse dependency order
    await StockMovement.destroy({ where: {}, force: true });
    console.log('✅ Stock movements cleaned');
    
    await PurchaseOrderItem.destroy({ where: {}, force: true });
    console.log('✅ Purchase order items cleaned');
    
    await Stock.destroy({ where: {}, force: true });
    console.log('✅ Stock records cleaned');
    
    await PurchaseOrder.destroy({ where: {}, force: true });
    console.log('✅ Purchase orders cleaned');
    
    await Product.destroy({ where: {}, force: true });
    console.log('✅ Products cleaned');
    
    await Supplier.destroy({ where: {}, force: true });
    console.log('✅ Suppliers cleaned');
    
    await Warehouse.destroy({ where: {}, force: true });
    console.log('✅ Warehouses cleaned');
    
    await Category.destroy({ where: {}, force: true });
    console.log('✅ Categories cleaned');
    
    await User.destroy({ where: {}, force: true });
    console.log('✅ Users cleaned');
    
    console.log('🎉 All data cleaned successfully!');
    
    // Now create fresh admin user and default data
    console.log('🔄 Creating fresh admin user and default data...');
    
    // Create admin user
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
    
    // Create default categories
    console.log('🔄 Creating default categories...');
    await Category.bulkCreate([
      { name: 'Electronics', description: 'Electronic devices and components' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Food & Beverages', description: 'Food items and drinks' },
      { name: 'Books', description: 'Books and publications' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' }
    ]);
    console.log('✅ Default categories created');
    
    // Create default warehouse
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
    
    // Create default supplier
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
    
    console.log('🎉 Database cleaned and setup completed successfully!');
    console.log('👤 Admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database clean and setup failed:', error.message);
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
