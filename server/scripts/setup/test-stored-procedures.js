const sequelize = require('./config/database');

async function testStoredProcedures() {
  try {
    console.log('🧪 Testing stored procedures...');
    
    // Test 1: Check if procedures exist
    console.log('\n1. Checking if procedures exist...');
    const procedures = await sequelize.query(
      "SHOW PROCEDURE STATUS WHERE Db = 'inventory_db'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Available procedures:', procedures.map(p => p.Name));
    
    // Test 2: Simple stock report test
    console.log('\n2. Testing stock report...');
    try {
      const stockResult = await sequelize.query(
        'CALL GetStockReport(NULL, NULL, FALSE)',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('✅ Stock report procedure works!');
      console.log('Stock data count:', stockResult[0]?.length || 0);
      console.log('Summary data:', stockResult[1]?.[0] || 'No summary data');
    } catch (error) {
      console.log('❌ Stock report error:', error.message);
    }
    
    // Test 3: Dashboard summary test
    console.log('\n3. Testing dashboard summary...');
    try {
      const dashboardResult = await sequelize.query(
        'CALL GetDashboardSummary(?, ?)',
        {
          replacements: [
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            new Date()
          ],
          type: sequelize.QueryTypes.SELECT
        }
      );
      console.log('✅ Dashboard summary procedure works!');
      console.log('Summary data:', dashboardResult[0]?.[0] || 'No summary data');
    } catch (error) {
      console.log('❌ Dashboard summary error:', error.message);
    }
    
    // Test 4: Direct SQL query to verify table structure
    console.log('\n4. Checking table structure...');
    try {
      const stockMovements = await sequelize.query(
        'DESCRIBE stock_movements',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('Stock movements columns:', stockMovements.map(col => col.Field));
    } catch (error) {
      console.log('❌ Table structure error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStoredProcedures()
  .then(() => {
    console.log('\n🎉 Testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });
