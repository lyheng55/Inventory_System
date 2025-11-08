const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sku: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'unit_price'
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'cost_price'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pcs'
  },
  barcode: {
    type: DataTypes.STRING(100),
    unique: true
  },
  qrCode: {
    type: DataTypes.STRING(255),
    field: 'qr_code'
  },
  minStockLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'min_stock_level'
  },
  maxStockLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    field: 'max_stock_level'
  },
  reorderPoint: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'reorder_point'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date'
  },
  isPerishable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_perishable'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  image: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'products'
});

module.exports = Product;
