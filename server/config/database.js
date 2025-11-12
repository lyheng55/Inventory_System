const { Sequelize } = require('sequelize');
require('dotenv').config();

// MySQL-only configuration (no SQLite fallback)
console.log('📝 Configuring MySQL database connection');

// Require database credentials to be set
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Database credentials must be set in environment variables');
  console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD');
  throw new Error('Database configuration is incomplete');
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
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

module.exports = sequelize;