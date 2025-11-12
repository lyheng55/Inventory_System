const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Legacy permission key (e.g., VIEW_PRODUCTS, CREATE_PRODUCTS) - kept for backward compatibility'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Resource name for CRUD permissions (e.g., products, stock, categories)'
  },
  displayName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'display_name',
    comment: 'Human-readable permission name (e.g., Products, Stock Management)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of what this permission allows'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Permission category (e.g., products, stock, users)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this permission is active and can be assigned'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  underscored: true
});

module.exports = Permission;

