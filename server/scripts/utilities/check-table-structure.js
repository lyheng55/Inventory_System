const mysql = require('mysql2/promise');
require('dotenv').config();

const checkTableStructure = async () => {
  try {
    console.log('🔍 Checking table structure...');
    
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

    // Check if users table exists and get its structure
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist');
    } else {
      console.log('✅ Users table exists');
      
      // Get table structure
      const [columns] = await connection.execute("DESCRIBE users");
      console.log('\n📋 Users table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    }

    await connection.end();
    return true;

  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
    return false;
  }
};

// Run if called directly
if (require.main === module) {
  checkTableStructure().then(success => {
    if (success) {
      console.log('✅ Table structure check completed');
      process.exit(0);
    } else {
      console.log('❌ Table structure check failed');
      process.exit(1);
    }
  });
}

module.exports = { checkTableStructure };
