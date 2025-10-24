const mysql = require('mysql2/promise');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    console.log('🔄 Resetting MySQL database...');
    
    // Connect to MySQL server
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '@dm!n'
    });

    console.log('✅ Connected to MySQL server');

    // Use the database
    const dbName = process.env.DB_NAME || 'inventory_db';
    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Using database '${dbName}'`);

    // Drop all tables in correct order (respecting foreign keys)
    console.log('🗑️  Dropping existing tables...');
    
    const tables = [
      'purchase_order_items',
      'purchase_orders', 
      'stock_movements',
      'stocks',
      'products',
      'warehouses',
      'suppliers',
      'categories',
      'users'
    ];

    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }

    await connection.end();
    console.log('🎉 Database reset completed!');
    console.log('Now run: node setup-mysql-only.js');
    return true;

  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    return false;
  }
};

// Run if called directly
if (require.main === module) {
  resetDatabase().then(success => {
    if (success) {
      console.log('✅ Database reset completed');
      process.exit(0);
    } else {
      console.log('❌ Database reset failed');
      process.exit(1);
    }
  });
}

module.exports = { resetDatabase };
