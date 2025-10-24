const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Supplier = require('./Supplier');
const Warehouse = require('./Warehouse');
const Stock = require('./Stock');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const StockMovement = require('./StockMovement');

// Define associations

// Category associations
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

// Product associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Product.hasMany(Stock, { foreignKey: 'productId' });
Product.hasMany(PurchaseOrderItem, { foreignKey: 'productId' });
Product.hasMany(StockMovement, { foreignKey: 'productId' });

// Supplier associations
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });

// Warehouse associations
Warehouse.hasMany(Stock, { foreignKey: 'warehouseId' });
Warehouse.hasMany(PurchaseOrder, { foreignKey: 'warehouseId' });
Warehouse.hasMany(StockMovement, { foreignKey: 'warehouseId' });
Warehouse.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

// Stock associations
Stock.belongsTo(Product, { foreignKey: 'productId' });
Stock.belongsTo(Warehouse, { foreignKey: 'warehouseId' });

// Purchase Order associations
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
PurchaseOrder.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
PurchaseOrder.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchaseOrderId' });

// Purchase Order Item associations
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
PurchaseOrderItem.belongsTo(Product, { foreignKey: 'productId' });

// Stock Movement associations
StockMovement.belongsTo(Product, { foreignKey: 'productId' });
StockMovement.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
StockMovement.belongsTo(User, { as: 'performer', foreignKey: 'performedBy' });

// User associations
User.hasMany(PurchaseOrder, { as: 'createdOrders', foreignKey: 'createdBy' });
User.hasMany(PurchaseOrder, { as: 'approvedOrders', foreignKey: 'approvedBy' });
User.hasMany(StockMovement, { as: 'performedMovements', foreignKey: 'performedBy' });
User.hasMany(Warehouse, { as: 'managedWarehouses', foreignKey: 'managerId' });

// Export all models
module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Supplier,
  Warehouse,
  Stock,
  PurchaseOrder,
  PurchaseOrderItem,
  StockMovement
};

// Sync database
const syncDatabase = async () => {
  try {
    // Test connection first
    await sequelize.authenticate();
    
    // Sync database schema (use force: false to avoid index conflicts)
    await sequelize.sync({ force: false });
    
    // Note: setupDatabase is called separately in server startup
    
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports.syncDatabase = syncDatabase;
