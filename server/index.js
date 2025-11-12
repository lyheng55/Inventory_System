const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { syncDatabase } = require('./models');
const sequelize = require('./config/database');

// Import routes from organized structure
const { 
  authRoutes, 
  inventoryRoutes, 
  managementRoutes, 
  reportRoutes,
  uploads: uploadRoutes,
  auditRoutes
} = require('./routes');

// Import audit middleware
const { auditMiddleware } = require('./middleware/audit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://192.168.20.82:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.110.235:3000"
    ],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ];
    
    // Allow any local network IP on port 3000 (for development)
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:3000$/)) {
      return callback(null, true);
    }
    
    // Allow any local network IP on port 3000 (for development)
    if (origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:3000$/)) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // For development, allow any localhost variant
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit middleware - logs all API requests
app.use(auditMiddleware);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user-specific room
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${socket.id} joined user room ${userId}`);
  });

  // Join warehouse room
  socket.on('join-warehouse', (warehouseId) => {
    socket.join(`warehouse-${warehouseId}`);
    console.log(`User ${socket.id} joined warehouse ${warehouseId}`);
  });

  // Leave warehouse room
  socket.on('leave-warehouse', (warehouseId) => {
    socket.leave(`warehouse-${warehouseId}`);
    console.log(`User ${socket.id} left warehouse ${warehouseId}`);
  });

  // Handle user activity
  socket.on('user-activity', (data) => {
    console.log('User activity:', data);
    // You can emit this to other users or log it
    socket.broadcast.emit('user-activity', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes - Organized by feature
// Auth routes
app.use('/api/auth', authRoutes.authRoutes);
app.use('/api/users', authRoutes.userRoutes);
app.use('/api/auth/permissions', authRoutes.permissionRoutes);

// Inventory routes
app.use('/api/products', inventoryRoutes.productRoutes);
app.use('/api/stock', inventoryRoutes.stockRoutes);
app.use('/api/categories', inventoryRoutes.categoryRoutes);
app.use('/api/barcodes', inventoryRoutes.barcodeRoutes);
app.use('/api/units', inventoryRoutes.unitRoutes);

// Management routes
app.use('/api/suppliers', managementRoutes.supplierRoutes);
app.use('/api/warehouses', managementRoutes.warehouseRoutes);
app.use('/api/purchase-orders', managementRoutes.purchaseOrderRoutes);
app.use('/api/sales', managementRoutes.saleRoutes);

// Reports routes
app.use('/api/reports', reportRoutes.reportRoutes);
app.use('/api/search', reportRoutes.searchRoutes);
app.use('/api/analytics', reportRoutes.analyticsRoutes);

// Utility routes
app.use('/api/uploads', uploadRoutes);

// Audit routes
app.use('/api/audit-logs', auditRoutes.auditLogsRoutes);
app.use('/api/backup', auditRoutes.backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL database connected successfully');
      
      // Sync database schema
      await syncDatabase();
      console.log('✅ Database schema synchronized');
      
      // Try to run database setup (create default data)
      try {
        const { setupDatabase } = require('./scripts/database/setup');
        await setupDatabase();
        console.log('✅ Default data setup completed');
      } catch (setupError) {
        console.warn('⚠️  Database setup failed:', setupError.message);
        console.log('📝 Server will continue without default data setup');
      }
    } catch (dbError) {
      console.error('❌ MySQL connection failed:', dbError.message);
      console.error('💡 To fix this:');
      console.error('   1. Ensure MySQL server is installed and running');
      console.error('   2. Create the database: CREATE DATABASE inventory_db;');
      console.error('   3. Create .env file in server folder with your MySQL credentials');
      console.error('   4. Fix authentication: ALTER USER "root"@"localhost" IDENTIFIED WITH mysql_native_password BY "root";');
      console.error('   5. Update DB_PASSWORD in .env to match your MySQL password');
      throw dbError; // Stop server if MySQL connection fails
    }
    
    // Try to start server on specified port, fallback to other ports if needed
    const startOnPort = async (port) => {
      return new Promise((resolve, reject) => {
        const testServer = server.listen(port, '0.0.0.0', () => {
          console.log(`🚀 Server running on port ${port}`);
          console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
          console.log(`📡 API available at: http://localhost:${port}`);
          console.log(`📱 Network access: http://192.168.110.235:${port}`);
          resolve(port);
        });
        
        testServer.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(err);
          }
        });
      });
    };
    
    // Try ports in order: 5000, 5001, 5002, etc.
    let currentPort = PORT;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        await startOnPort(currentPort);
        break;
      } catch (error) {
        if (error.message.includes('EADDRINUSE')) {
          currentPort++;
          attempts++;
          console.log(`Port ${currentPort - 1} is in use, trying port ${currentPort}...`);
        } else {
          throw error;
        }
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Could not find an available port');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
