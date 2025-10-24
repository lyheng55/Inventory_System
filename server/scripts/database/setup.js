const { sequelize } = require('../../models');
const { Op } = require('sequelize');

const setupDatabase = async () => {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Note: Database schema sync is handled in models/index.js
    // This setup only creates default data
    console.log('🔄 Database schema already synchronized');
    
    // Create default data if tables are empty
    const { User, Category, Warehouse, Supplier } = require('../../models');
    
    console.log('🔄 Creating default data...');
    
    // Check if admin user exists (check both email and username)
    const adminExists = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: 'admin@example.com' },
          { username: 'admin123' }
        ]
      } 
    });
    if (!adminExists) {
      console.log('🔄 Creating default admin user...');
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
        console.log('✅ Default admin user created');
      } catch (userError) {
        console.error('❌ Failed to create admin user:', userError.message);
        console.error('User validation details:', userError.errors || 'No detailed errors');
        throw userError;
      }
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Create a test user for testing
    const testUserExists = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: 'test@example.com' },
          { username: 'testuser' }
        ]
      } 
    });
    if (!testUserExists) {
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
    } else {
      console.log('✅ Test user already exists');
    }
    
    // Check if categories exist
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
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
    }
    
    // Check if warehouse exists
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
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
    }
    
    // Check if supplier exists
    const supplierCount = await Supplier.count();
    if (supplierCount === 0) {
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
    }
    
    console.log('🎉 Database setup completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    return false;
  }
};

module.exports = { setupDatabase };

// Run setup if called directly
if (require.main === module) {
  setupDatabase().then(success => {
    if (success) {
      console.log('✅ Database is ready to use');
      process.exit(0);
    } else {
      console.log('❌ Database setup failed');
      process.exit(1);
    }
  });
}
