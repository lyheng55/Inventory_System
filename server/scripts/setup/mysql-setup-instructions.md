# MySQL Setup Instructions

## Option 1: Manual MySQL Setup (Recommended)

1. **Open MySQL Command Line or MySQL Workbench**

2. **Connect to MySQL server:**
   ```sql
   mysql -u root -p
   ```

3. **Create the database:**
   ```sql
   CREATE DATABASE inventory_db;
   ```

4. **Create a user with proper authentication:**
   ```sql
   CREATE USER 'inventory_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'inventory_password';
   GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Update your .env file:**
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=inventory_db
   DB_USER=inventory_user
   DB_PASSWORD=inventory_password
   USE_SQLITE=false
   ```

## Option 2: Fix MySQL Authentication Plugin

If you want to keep using the root user, run this in MySQL:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

## Option 3: Use SQLite (Easiest)

If you want to get started quickly without MySQL setup:

1. **Update your .env file:**
   ```
   USE_SQLITE=true
   ```

2. **Restart the server** - it will automatically use SQLite

## Testing the Connection

After setup, test with:
```bash
node setup-mysql.js
```

## Troubleshooting

- **Authentication Error**: Use `mysql_native_password` instead of `caching_sha2_password`
- **Connection Refused**: Make sure MySQL server is running
- **Access Denied**: Check username and password
- **Database Not Found**: Create the database first
