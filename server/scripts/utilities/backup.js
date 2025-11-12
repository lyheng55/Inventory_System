const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const sequelize = require('../../config/database');
require('dotenv').config();

const execAsync = promisify(exec);

/**
 * Database Backup Utility
 * Creates backups of the MySQL database
 */

const BACKUP_DIR = path.join(__dirname, '../../../backups');
const MAX_BACKUPS = 30; // Keep last 30 backups

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

/**
 * Generate backup filename with timestamp
 */
const getBackupFilename = (prefix = 'backup') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.sql`;
};

/**
 * Find mysqldump executable path
 */
const findMysqldump = () => {
  // Check if MYSQL_BIN_PATH is set in environment
  if (process.env.MYSQL_BIN_PATH) {
    const mysqldumpPath = path.join(process.env.MYSQL_BIN_PATH, 'mysqldump');
    if (fs.existsSync(mysqldumpPath) || fs.existsSync(mysqldumpPath + '.exe')) {
      return fs.existsSync(mysqldumpPath) ? mysqldumpPath : mysqldumpPath + '.exe';
    }
  }

  // Try to find in PATH first (fastest method)
  try {
    const { execSync } = require('child_process');
    if (os.platform() === 'win32') {
      const result = execSync('where mysqldump', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (result && result.trim()) {
        return result.trim().split('\n')[0]; // Return first path found
      }
    } else {
      const result = execSync('which mysqldump', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (result && result.trim()) {
        return result.trim();
      }
    }
  } catch {
    // Not found in PATH, continue to check common paths
  }

  // Common Windows MySQL installation paths
  const commonPaths = [
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.1\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.2\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.3\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    'C:\\wamp64\\bin\\mysql\\mysql8.0.xx\\bin\\mysqldump.exe',
    'C:\\wamp\\bin\\mysql\\mysql8.0.xx\\bin\\mysqldump.exe',
    // Check for MariaDB as well
    'C:\\Program Files\\MariaDB 11.5\\bin\\mysqldump.exe',
    'C:\\Program Files (x86)\\MariaDB\\bin\\mysqldump.exe',
  ];

  // Also check for versioned MySQL directories dynamically
  if (os.platform() === 'win32') {
    const programFiles = [
      process.env['ProgramFiles'] || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    ];
    
    for (const programFile of programFiles) {
      try {
        const mysqlDir = path.join(programFile, 'MySQL');
        if (fs.existsSync(mysqlDir)) {
          const dirs = fs.readdirSync(mysqlDir);
          for (const dir of dirs) {
            if (dir.startsWith('MySQL Server')) {
              const mysqldumpPath = path.join(mysqlDir, dir, 'bin', 'mysqldump.exe');
              if (fs.existsSync(mysqldumpPath)) {
                return mysqldumpPath;
              }
            }
          }
        }
      } catch {
        // Continue if directory doesn't exist or can't be read
      }
    }
  }

  for (const mysqldumpPath of commonPaths) {
    if (fs.existsSync(mysqldumpPath)) {
      return mysqldumpPath;
    }
  }

  return null;
};

/**
 * Create backup using Sequelize (fallback method)
 */
const createBackupWithSequelize = async (options = {}) => {
  const { filename = null, includeData = true } = options;
  
  try {
    ensureBackupDir();
    const backupFile = filename || getBackupFilename('inventory');
    const backupPath = path.join(BACKUP_DIR, backupFile);

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inventory_db'
    };

    // Get all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    const tableNames = tables.map(row => Object.values(row)[0]);

    let sqlContent = `-- Database Backup Created: ${new Date().toISOString()}\n`;
    sqlContent += `-- Database: ${dbConfig.database}\n\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    // Export each table
    for (const tableName of tableNames) {
      sqlContent += `-- Table: ${tableName}\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

      // Get table structure
      const [createTable] = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\``);
      sqlContent += createTable[0]['Create Table'] + ';\n\n';

      if (includeData) {
        // Get table data
        const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
        if (rows.length > 0) {
          sqlContent += `-- Data for table ${tableName}\n`;
          sqlContent += `LOCK TABLES \`${tableName}\` WRITE;\n`;
          
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              return val;
            });
            sqlContent += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
          }
          
          sqlContent += `UNLOCK TABLES;\n\n`;
        }
      }
    }

    sqlContent += `SET FOREIGN_KEY_CHECKS=1;\n`;

    // Write to file
    fs.writeFileSync(backupPath, sqlContent, 'utf8');

    // Compress if requested
    let finalPath = backupPath;
    if (options.compress) {
      try {
        const zlib = require('zlib');
        const gzip = zlib.createGzip();
        const input = fs.createReadStream(backupPath);
        const output = fs.createWriteStream(`${backupPath}.gz`);
        await new Promise((resolve, reject) => {
          input.pipe(gzip).pipe(output);
          output.on('finish', resolve);
          output.on('error', reject);
        });
        fs.unlinkSync(backupPath);
        finalPath = `${backupPath}.gz`;
      } catch (compressError) {
        console.warn('Compression failed, keeping uncompressed backup:', compressError.message);
      }
    }

    const stats = fs.statSync(finalPath);
    
    return {
      success: true,
      filename: path.basename(finalPath),
      path: finalPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      timestamp: new Date().toISOString(),
      method: 'sequelize'
    };
  } catch (error) {
    console.error('Sequelize backup error:', error);
    throw new Error(`Failed to create backup using Sequelize: ${error.message}`);
  }
};

/**
 * Create database backup using mysqldump
 */
const createBackup = async (options = {}) => {
  const {
    filename = null,
    compress = true,
    includeData = true,
    tables = null, // Array of specific tables to backup
    useSequelize = false // Force use Sequelize method
  } = options;

  try {
    ensureBackupDir();

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inventory_db'
    };

    const backupFile = filename || getBackupFilename('inventory');
    const backupPath = path.join(BACKUP_DIR, backupFile);

    // Try to find mysqldump
    const mysqldumpPath = findMysqldump();

    // If mysqldump not found or useSequelize is true, use Sequelize method
    if (!mysqldumpPath || useSequelize) {
      if (!useSequelize) {
        console.log('ℹ️  mysqldump not found in PATH or common locations, using Sequelize-based backup method');
      } else {
        console.log('ℹ️  Using Sequelize-based backup method (requested)');
      }
      return await createBackupWithSequelize({ filename, compress, includeData });
    }

    // Build mysqldump command
    // Use MYSQL_PWD environment variable for password (more secure, especially on Windows)
    const commandEnv = { ...process.env };
    if (dbConfig.password) {
      commandEnv.MYSQL_PWD = dbConfig.password;
    }
    
    let command = `"${mysqldumpPath}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user}`;
    
    // Don't include password in command line for security
    // Password will be read from MYSQL_PWD environment variable
    
    command += ` ${dbConfig.database}`;

    // Add table-specific backup if specified
    if (tables && Array.isArray(tables) && tables.length > 0) {
      command += ` ${tables.join(' ')}`;
    }

    // Add options
    if (includeData) {
      command += ' --complete-insert --routines --triggers';
    } else {
      command += ' --no-data';
    }

    // Handle output redirection based on OS
    if (os.platform() === 'win32') {
      command += ` > "${backupPath}"`;
    } else {
      command += ` > "${backupPath}"`;
    }

    // Execute backup
    try {
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: commandEnv // Use MYSQL_PWD for better security on Windows
      });
    } catch (execError) {
      // If mysqldump fails, fall back to Sequelize method
      console.warn('⚠️  mysqldump execution failed, falling back to Sequelize method:', execError.message);
      return await createBackupWithSequelize({ filename, compress, includeData });
    }

    // Compress if requested
    let finalPath = backupPath;
    if (compress) {
      try {
        if (os.platform() === 'win32') {
          // Use Node.js zlib for compression on Windows
          const zlib = require('zlib');
          const gzip = zlib.createGzip();
          const input = fs.createReadStream(backupPath);
          const output = fs.createWriteStream(`${backupPath}.gz`);
          await new Promise((resolve, reject) => {
            input.pipe(gzip).pipe(output);
            output.on('finish', resolve);
            output.on('error', reject);
          });
          fs.unlinkSync(backupPath);
          finalPath = `${backupPath}.gz`;
        } else {
          const compressedPath = `${backupPath}.gz`;
          await execAsync(`gzip "${backupPath}"`);
          finalPath = compressedPath;
        }
      } catch (compressError) {
        console.warn('Compression failed, keeping uncompressed backup:', compressError.message);
      }
    }

    const stats = fs.statSync(finalPath);
    
    return {
      success: true,
      filename: path.basename(finalPath),
      path: finalPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      timestamp: new Date().toISOString(),
      method: 'mysqldump'
    };
  } catch (error) {
    console.error('Backup error:', error);
    // Try Sequelize fallback as last resort
    if (!options.useSequelize) {
      try {
        console.log('⚠️  Attempting Sequelize fallback method...');
        return await createBackupWithSequelize({ filename, compress, includeData });
      } catch (fallbackError) {
        throw new Error(`Failed to create backup: ${error.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }
    throw new Error(`Failed to create backup: ${error.message}`);
  }
};

/**
 * Restore database from backup file
 */
const restoreBackup = async (backupFile, options = {}) => {
  const {
    dropDatabase = false,
    createDatabase = true
  } = options;

  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inventory_db'
    };

    const backupPath = path.join(BACKUP_DIR, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Check if file is compressed
    const isCompressed = backupPath.endsWith('.gz');
    let sqlFile = backupPath;

    // Decompress if needed
    if (isCompressed) {
      sqlFile = backupPath.replace('.gz', '');
      await execAsync(`gunzip -c "${backupPath}" > "${sqlFile}"`);
    }

    // Build mysql command
    let command = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user}`;
    
    if (dbConfig.password) {
      command += ` -p${dbConfig.password}`;
    }

    if (dropDatabase && createDatabase) {
      command += ` -e "DROP DATABASE IF EXISTS ${dbConfig.database}; CREATE DATABASE ${dbConfig.database};"`;
    }

    command += ` ${dbConfig.database} < "${sqlFile}"`;

    // Execute restore
    await execAsync(command);

    // Clean up decompressed file if it was compressed
    if (isCompressed && fs.existsSync(sqlFile)) {
      fs.unlinkSync(sqlFile);
    }

    return {
      success: true,
      message: 'Database restored successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Restore error:', error);
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
};

/**
 * List all available backups
 */
const listBackups = () => {
  try {
    ensureBackupDir();
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
};

/**
 * Delete old backups, keeping only the most recent N
 */
const cleanupOldBackups = async (keepCount = MAX_BACKUPS) => {
  try {
    const backups = listBackups();
    
    if (backups.length <= keepCount) {
      return { deleted: 0, message: 'No old backups to clean up' };
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        const filePath = path.join(BACKUP_DIR, backup.filename);
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete backup ${backup.filename}:`, error);
      }
    }

    return {
      deleted: deletedCount,
      message: `Deleted ${deletedCount} old backup(s)`
    };
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    throw error;
  }
};

/**
 * Format bytes to human-readable format
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get backup statistics
 */
const getBackupStats = () => {
  try {
    const backups = listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

    return {
      count: backups.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      oldest: backups.length > 0 ? backups[backups.length - 1].created : null,
      newest: backups.length > 0 ? backups[0].created : null
    };
  } catch (error) {
    console.error('Error getting backup stats:', error);
    return {
      count: 0,
      totalSize: 0,
      totalSizeFormatted: '0 Bytes',
      oldest: null,
      newest: null
    };
  }
};

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
  BACKUP_DIR,
  MAX_BACKUPS
};

