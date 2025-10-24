const mysql = require('mysql2/promise');
require('dotenv').config();

const setupMySQL = async () => {
  try {
    console.log('🔄 Setting up MySQL database...');
    
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      }
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'inventory_db';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);

    // Use the database
    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Using database '${dbName}'`);

    // Create admin user with proper authentication
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(50) NOT NULL,
        lastName VARCHAR(50) NOT NULL,
        role ENUM('admin', 'inventory_manager', 'sales_staff', 'auditor') NOT NULL DEFAULT 'sales_staff',
        isActive BOOLEAN DEFAULT TRUE,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@inventory.com']
    );

    if (rows.length === 0) {
      // Create admin user with hashed password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await connection.execute(`
        INSERT INTO users (username, email, password, firstName, lastName, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@inventory.com', hashedPassword, 'System', 'Administrator', 'admin']);
      
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    await connection.end();
    console.log('🎉 MySQL setup completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ MySQL setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Try connecting with MySQL client first');
    console.log('4. Make sure the user has CREATE DATABASE privileges');
    return false;
  }
};

module.exports = { setupMySQL };

// Run setup if called directly
if (require.main === module) {
  setupMySQL().then(success => {
    if (success) {
      console.log('✅ MySQL is ready to use');
      process.exit(0);
    } else {
      console.log('❌ MySQL setup failed');
      process.exit(1);
    }
  });
}
