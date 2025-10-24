const fs = require('fs');
const path = require('path');
const sequelize = require('./config/database');

async function setupStoredProcedures() {
  try {
    console.log('🔄 Setting up stored procedures...');
    
    // Read the stored procedures SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'stored-procedures-fixed.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content by delimiter and execute each procedure
    const procedures = sqlContent.split('$$').filter(proc => proc.trim());
    
    for (const procedure of procedures) {
      if (procedure.trim()) {
        try {
          await sequelize.query(procedure.trim());
          console.log('✅ Stored procedure created successfully');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⚠️  Stored procedure already exists, skipping...');
          } else {
            console.error('❌ Error creating stored procedure:', error.message);
          }
        }
      }
    }
    
    console.log('✅ All stored procedures setup completed!');
    
    // Test one of the procedures to make sure they work
    console.log('🧪 Testing stored procedures...');
    try {
      const result = await sequelize.query('CALL GetDashboardSummary(?, ?)', {
        replacements: [
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date()
        ],
        type: sequelize.QueryTypes.SELECT
      });
      console.log('✅ Stored procedures are working correctly!');
    } catch (error) {
      console.error('❌ Error testing stored procedures:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to setup stored procedures:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupStoredProcedures()
    .then(() => {
      console.log('🎉 Stored procedures setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Stored procedures setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupStoredProcedures;
