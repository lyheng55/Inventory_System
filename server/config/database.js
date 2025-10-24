const { Sequelize } = require('sequelize');
require('dotenv').config();

// Simple database configuration with fallback
let sequelize;

const tryMySQL = async () => {
  try {
    console.log('🔄 Attempting MySQL connection...');
    
    const mysqlSequelize = new Sequelize(
      process.env.DB_NAME || 'inventory_db',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306,
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
      }
    );

    // Test connection
    await mysqlSequelize.authenticate();
    console.log('✅ MySQL database connected successfully');
    return mysqlSequelize;
    
  } catch (error) {
    console.warn('⚠️  MySQL connection failed:', error.message);
    return null;
  }
};

const useSQLite = () => {
  console.log('📝 Using SQLite database for testing');
  return new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  });
};

// Initialize database connection
const initializeDatabase = async () => {
  // Try MySQL first
  const mysqlConnection = await tryMySQL();
  
  if (mysqlConnection) {
    return mysqlConnection;
  } else {
    // Fallback to SQLite
    const sqliteConnection = useSQLite();
    
    // Test SQLite connection
    try {
      await sqliteConnection.authenticate();
      console.log('✅ SQLite database connected successfully');
    } catch (error) {
      console.error('❌ SQLite connection failed:', error.message);
      throw error;
    }
    
    return sqliteConnection;
  }
};

// Get or initialize sequelize instance
const getSequelize = async () => {
  if (!sequelize) {
    sequelize = await initializeDatabase();
  }
  return sequelize;
};

// For immediate use (synchronous fallback)
if (!sequelize) {
  sequelize = useSQLite();
}

module.exports = {
  getSequelize,
  sequelize
};