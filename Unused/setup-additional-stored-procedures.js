const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_db',
  multipleStatements: true,
  authPlugins: {
    mysql_native_password: () => () => Buffer.alloc(0)
  }
};

async function setupAdditionalStoredProcedures() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Reading additional stored procedures file...');
    const sqlFile = path.join(__dirname, 'database', 'additional-stored-procedures.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Executing additional stored procedures...');
    await connection.execute(sqlContent);
    
    console.log('✅ Additional stored procedures created successfully!');
    
    // Test the procedures
    console.log('\nTesting stored procedures...');
    
    // Test CalculatePurchaseOrderItemTotals
    console.log('Testing CalculatePurchaseOrderItemTotals...');
    const [itemTotals] = await connection.execute(
      'CALL CalculatePurchaseOrderItemTotals(?, ?, ?, ?)',
      [10, 25.50, 8.5, 5.0]
    );
    console.log('Item totals result:', itemTotals[0]);
    
    // Test GetDashboardCalculations
    console.log('Testing GetDashboardCalculations...');
    const [dashboardResults] = await connection.execute(
      'CALL GetDashboardCalculations(?, ?)',
      ['2024-01-01 00:00:00', '2024-12-31 23:59:59']
    );
    console.log('Dashboard results:', dashboardResults.length, 'result sets');
    
    console.log('\n✅ All additional stored procedures are working correctly!');
    
  } catch (error) {
    console.error('❌ Error setting up additional stored procedures:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupAdditionalStoredProcedures()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupAdditionalStoredProcedures;
