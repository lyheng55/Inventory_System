# Deployment Guide

This guide covers different deployment options for the Inventory Management System.

## 🚀 Quick Start (Development)

1. **Run the setup script:**
   ```bash
   node setup.js
   ```

2. **Configure your database:**
   - Update `server/.env` with your MySQL credentials
   - Create the database: `CREATE DATABASE inventory_db;`

3. **Start the application:**
   ```bash
   npm run dev
   ```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd inventory-management-system
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MySQL: localhost:3306

### Manual Docker Build

1. **Build and run MySQL:**
   ```bash
   docker run --name inventory_mysql \
     -e MYSQL_ROOT_PASSWORD=rootpassword \
     -e MYSQL_DATABASE=inventory_db \
     -e MYSQL_USER=inventory_user \
     -e MYSQL_PASSWORD=inventory_password \
     -p 3306:3306 \
     -d mysql:8.0
   ```

2. **Build and run the backend:**
   ```bash
   cd server
   docker build -t inventory-backend .
   docker run --name inventory_backend \
     --link inventory_mysql:mysql \
     -e DB_HOST=mysql \
     -e DB_NAME=inventory_db \
     -e DB_USER=inventory_user \
     -e DB_PASSWORD=inventory_password \
     -p 5000:5000 \
     -d inventory-backend
   ```

3. **Build and run the frontend:**
   ```bash
   cd client
   docker build -t inventory-frontend .
   docker run --name inventory_frontend \
     --link inventory_backend:backend \
     -p 3000:80 \
     -d inventory-frontend
   ```

## ☁️ Cloud Deployment

### AWS Deployment

1. **Using AWS Elastic Beanstalk:**
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize EB application
   eb init inventory-system
   
   # Create environment
   eb create production
   
   # Deploy
   eb deploy
   ```

2. **Using AWS ECS with Fargate:**
   - Create ECS cluster
   - Define task definitions for frontend, backend, and database
   - Set up Application Load Balancer
   - Configure auto-scaling

### Google Cloud Platform

1. **Using Google Cloud Run:**
   ```bash
   # Build and push images
   gcloud builds submit --tag gcr.io/PROJECT_ID/inventory-backend
   gcloud builds submit --tag gcr.io/PROJECT_ID/inventory-frontend
   
   # Deploy to Cloud Run
   gcloud run deploy inventory-backend --image gcr.io/PROJECT_ID/inventory-backend
   gcloud run deploy inventory-frontend --image gcr.io/PROJECT_ID/inventory-frontend
   ```

### Azure Deployment

1. **Using Azure Container Instances:**
   ```bash
   # Create resource group
   az group create --name inventory-rg --location eastus
   
   # Deploy container group
   az container create \
     --resource-group inventory-rg \
     --name inventory-system \
     --image your-registry/inventory-system \
     --dns-name-label inventory-system \
     --ports 80 443
   ```

## 🔧 Production Configuration

### Environment Variables

Create a production `.env` file:

```env
# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=3306
DB_NAME=inventory_db
DB_USER=production_user
DB_PASSWORD=secure_password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# Email Configuration
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password

# File Upload Configuration
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CLIENT_URL=https://your-frontend-domain.com
```

### Database Setup

1. **Create production database:**
   ```sql
   CREATE DATABASE inventory_db;
   CREATE USER 'inventory_user'@'%' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'%';
   FLUSH PRIVILEGES;
   ```

2. **Run database migrations:**
   ```bash
   cd server
   npm run migrate
   ```

### SSL/HTTPS Configuration

1. **Using Let's Encrypt:**
   ```bash
   # Install Certbot
   sudo apt-get install certbot
   
   # Obtain certificate
   sudo certbot certonly --standalone -d your-domain.com
   
   # Configure nginx with SSL
   ```

2. **Nginx configuration:**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 📊 Monitoring and Logging

### Application Monitoring

1. **Using PM2:**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start server/index.js --name "inventory-api"
   
   # Monitor
   pm2 monit
   
   # Setup auto-restart
   pm2 startup
   pm2 save
   ```

2. **Using Docker with health checks:**
   ```yaml
   services:
     backend:
       healthcheck:
         test: ["CMD", "node", "healthcheck.js"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

### Logging

1. **Configure log rotation:**
   ```bash
   # Install logrotate
   sudo apt-get install logrotate
   
   # Create logrotate config
   sudo nano /etc/logrotate.d/inventory-system
   ```

2. **Log configuration:**
   ```
   /var/log/inventory-system/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 root root
   }
   ```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up database encryption
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up backup procedures
- [ ] Enable CORS properly
- [ ] Use environment variables for secrets

### Database Security

1. **Create dedicated database user:**
   ```sql
   CREATE USER 'inventory_app'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_db.* TO 'inventory_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Enable SSL for database connections:**
   ```env
   DB_SSL=true
   DB_SSL_CA=/path/to/ca-cert.pem
   ```

## 📈 Performance Optimization

### Database Optimization

1. **Add indexes:**
   ```sql
   CREATE INDEX idx_products_sku ON products(sku);
   CREATE INDEX idx_stock_product_warehouse ON stocks(productId, warehouseId);
   CREATE INDEX idx_movements_date ON stock_movements(movementDate);
   ```

2. **Configure connection pooling:**
   ```javascript
   const sequelize = new Sequelize(/* ... */, {
     pool: {
       max: 20,
       min: 5,
       acquire: 30000,
       idle: 10000
     }
   });
   ```

### Application Optimization

1. **Enable gzip compression:**
   ```javascript
   app.use(compression());
   ```

2. **Configure caching:**
   ```javascript
   app.use(express.static('public', {
     maxAge: '1d'
   }));
   ```

## 🔄 Backup and Recovery

### Database Backup

1. **Automated backup script:**
   ```bash
   #!/bin/bash
   mysqldump -u root -p inventory_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Schedule with cron:**
   ```bash
   # Add to crontab
   0 2 * * * /path/to/backup_script.sh
   ```

### Application Backup

1. **Backup uploads directory:**
   ```bash
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz server/uploads/
   ```

2. **Backup configuration:**
   ```bash
   cp server/.env backup_env_$(date +%Y%m%d)
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Check database credentials
   - Verify database is running
   - Check firewall settings

2. **Port conflicts:**
   - Change ports in .env file
   - Kill processes using the ports

3. **Permission errors:**
   - Check file permissions
   - Ensure uploads directory is writable

### Log Analysis

1. **Check application logs:**
   ```bash
   tail -f /var/log/inventory-system/app.log
   ```

2. **Check database logs:**
   ```bash
   tail -f /var/log/mysql/error.log
   ```

## 📞 Support

For deployment issues:
1. Check the logs
2. Verify configuration
3. Test database connectivity
4. Review security settings
5. Create an issue in the repository

---

**Happy Deploying! 🚀**
