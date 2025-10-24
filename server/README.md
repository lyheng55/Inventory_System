# 🏪 Inventory Management System - Server

## 📁 **Organized Folder Structure**

The server has been reorganized into a clean, professional structure for better maintainability and scalability.

### 🎯 **Main Structure**

```
server/
├── 📁 config/                 # Configuration files
│   ├── database.js           # Database configuration
│   ├── database-fallback.js  # Fallback database config
│   └── env.example          # Environment variables example
├── 📁 database/              # Database files
│   └── init.sql             # Database initialization
├── 📁 middleware/            # Express middleware
│   ├── auth.js              # Authentication middleware
│   └── validation.js        # Input validation middleware
├── 📁 models/                # Database models (Sequelize)
│   ├── index.js             # Models index
│   ├── User.js              # User model
│   ├── Product.js           # Product model
│   ├── Category.js          # Category model
│   ├── Stock.js             # Stock model
│   ├── Supplier.js          # Supplier model
│   ├── Warehouse.js         # Warehouse model
│   ├── PurchaseOrder.js     # Purchase order model
│   └── StockMovement.js     # Stock movement model
├── 📁 routes/                # API routes (organized by feature)
│   ├── index.js             # Main routes index
│   ├── 📁 auth/             # Authentication routes
│   │   ├── index.js         # Auth routes index
│   │   ├── auth.js          # Login/logout routes
│   │   └── users.js         # User management routes
│   ├── 📁 inventory/        # Inventory management routes
│   │   ├── index.js         # Inventory routes index
│   │   ├── products.js      # Product routes
│   │   ├── stock.js         # Stock routes
│   │   ├── categories.js    # Category routes
│   │   └── barcodes.js      # Barcode routes
│   ├── 📁 management/       # Business management routes
│   │   ├── index.js         # Management routes index
│   │   ├── suppliers.js     # Supplier routes
│   │   ├── warehouses.js    # Warehouse routes
│   │   └── purchaseOrders.js # Purchase order routes
│   ├── 📁 reports/          # Reports and analytics routes
│   │   ├── index.js         # Reports routes index
│   │   ├── reports.js       # Report generation routes
│   │   └── search.js        # Search functionality routes
│   └── uploads.js           # File upload routes
├── 📁 scripts/               # Utility and setup scripts
│   ├── index.js             # Scripts index
│   ├── 📁 database/         # Database scripts
│   │   ├── init.sql         # Database initialization
│   │   ├── setup.js         # Database setup
│   │   ├── stored-procedures.sql # Stored procedures
│   │   └── STORED_PROCEDURES_README.md
│   ├── 📁 setup/            # Setup and installation scripts
│   │   ├── setup-mysql.js   # MySQL setup
│   │   ├── setup-stored-procedures.js # Stored procedures setup
│   │   ├── test-stored-procedures.js # Test procedures
│   │   ├── mysql-setup-instructions.md
│   │   └── *.sql            # SQL setup files
│   └── 📁 utilities/        # Utility scripts
│       ├── healthcheck.js   # Health check script
│       ├── check-table-structure.js # Table structure checker
│       ├── fix-mysql-auth.js # MySQL auth fix
│       └── reset-database.js # Database reset
├── 📁 services/              # Business logic services
│   └── realtimeService.js   # Real-time service
├── 📁 uploads/               # File uploads storage
│   ├── documents/           # Document uploads
│   └── products/            # Product image uploads
├── index.js                 # Main server file
├── package.json             # Dependencies and scripts
├── Dockerfile              # Docker configuration
└── README.md               # This file
```

## 🚀 **Key Features**

### **1. Organized Routes**
- **Auth Routes**: Authentication and user management
- **Inventory Routes**: Products, stock, categories, barcodes
- **Management Routes**: Suppliers, warehouses, purchase orders
- **Reports Routes**: Analytics, reports, search functionality

### **2. Clean Imports**
```javascript
// Before (messy)
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
// ... many more

// After (clean)
const { 
  authRoutes, 
  inventoryRoutes, 
  managementRoutes, 
  reportRoutes 
} = require('./routes');
```

### **3. Scripts Organization**
- **Database Scripts**: Setup, initialization, stored procedures
- **Setup Scripts**: Installation and configuration
- **Utility Scripts**: Maintenance and troubleshooting

## 🔧 **Usage**

### **Starting the Server**
```bash
npm start
```

### **Development**
```bash
npm run dev
```

### **Database Setup**
```bash
# Run database setup
node scripts/setup/setup-mysql.js

# Run stored procedures setup
node scripts/setup/setup-stored-procedures.js
```

### **Health Check**
```bash
# Check server health
node scripts/utilities/healthcheck.js

# Or via HTTP
curl http://localhost:5000/api/health
```

## 📊 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users` - Get users
- `POST /api/users` - Create user

### **Inventory Management**
- `GET /api/products` - Get products
- `POST /api/products` - Create product
- `GET /api/stock` - Get stock levels
- `POST /api/stock` - Update stock
- `GET /api/categories` - Get categories
- `GET /api/barcodes` - Get barcodes

### **Business Management**
- `GET /api/suppliers` - Get suppliers
- `GET /api/warehouses` - Get warehouses
- `GET /api/purchase-orders` - Get purchase orders

### **Reports & Analytics**
- `GET /api/reports` - Generate reports
- `GET /api/search` - Search functionality

## 🛠️ **Development**

### **Adding New Routes**
1. Create route file in appropriate folder
2. Add to folder's index.js
3. Import in main routes/index.js
4. Register in main index.js

### **Adding New Scripts**
1. Create script in appropriate scripts folder
2. Add to scripts/index.js
3. Document usage in README

## 🎯 **Benefits**

- ✅ **Clean Organization** - Easy to find and maintain code
- ✅ **Scalable Structure** - Easy to add new features
- ✅ **Professional Layout** - Industry-standard organization
- ✅ **Better Imports** - Clean, organized imports
- ✅ **Maintainable Code** - Easy to understand and modify
- ✅ **Team Collaboration** - Clear structure for team development

---

**Your server is now professionally organized and ready for production use!** 🎉
