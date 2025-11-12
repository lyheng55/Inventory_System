const sequelize = require('../config/database');

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
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Permission = require('./Permission');
const Role = require('./Role');
const RolePermission = require('./RolePermission');
const UserPermission = require('./UserPermission');
const AuditLog = require('./AuditLog');
const Unit = require('./Unit');

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
Product.hasMany(SaleItem, { foreignKey: 'productId' });

// Supplier associations
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });

// Warehouse associations
Warehouse.hasMany(Stock, { foreignKey: 'warehouseId' });
Warehouse.hasMany(PurchaseOrder, { foreignKey: 'warehouseId' });
Warehouse.hasMany(StockMovement, { foreignKey: 'warehouseId' });
Warehouse.hasMany(Sale, { foreignKey: 'warehouseId' });
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

// Sale associations
Sale.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
Sale.belongsTo(User, { as: 'seller', foreignKey: 'soldBy' });
Sale.belongsTo(User, { as: 'voider', foreignKey: 'voidedBy' });
Sale.hasMany(SaleItem, { foreignKey: 'saleId' });

// Sale Item associations
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });
SaleItem.belongsTo(Product, { foreignKey: 'productId' });

// User associations
User.hasMany(PurchaseOrder, { as: 'createdOrders', foreignKey: 'createdBy' });
User.hasMany(PurchaseOrder, { as: 'approvedOrders', foreignKey: 'approvedBy' });
User.hasMany(StockMovement, { as: 'performedMovements', foreignKey: 'performedBy' });
User.hasMany(Warehouse, { as: 'managedWarehouses', foreignKey: 'managerId' });
User.hasMany(Sale, { as: 'sales', foreignKey: 'soldBy' });
User.hasMany(Sale, { as: 'voidedSales', foreignKey: 'voidedBy' });
User.hasMany(UserPermission, { foreignKey: 'userId' });

// Role associations
Role.hasMany(RolePermission, { foreignKey: 'roleId' });
// Note: User.roleId association commented out - still using role ENUM for backward compatibility
// Role.hasMany(User, { foreignKey: 'roleId' });

// Permission associations
Permission.hasMany(RolePermission, { foreignKey: 'permissionId' });
Permission.hasMany(UserPermission, { foreignKey: 'permissionId' });

// RolePermission associations
RolePermission.belongsTo(Role, { foreignKey: 'roleId' });
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId' });

// UserPermission associations
UserPermission.belongsTo(User, { foreignKey: 'userId' });
UserPermission.belongsTo(Permission, { foreignKey: 'permissionId' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  StockMovement,
  Sale,
  SaleItem,
  Permission,
  Role,
  RolePermission,
  UserPermission,
  AuditLog,
  Unit
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
