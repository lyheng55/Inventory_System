const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    }
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'warehouse_id',
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  movementType: {
    type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'return'),
    allowNull: false,
    field: 'type'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previousQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'previous_quantity'
  },
  newQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'new_quantity'
  },
  referenceType: {
    type: DataTypes.ENUM('purchase', 'sale', 'transfer', 'adjustment', 'return', 'waste'),
    allowNull: true,
    field: 'reference_type'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reference_id',
    comment: 'ID of the related record (purchase order, sale, etc.)'
  },
  reason: {
    type: DataTypes.STRING(255)
  },
  notes: {
    type: DataTypes.TEXT
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stock_movements'
});

module.exports = StockMovement;
