const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unit name/code (e.g., pcs, kg, liter, box)'
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'display_name',
    comment: 'Human-readable unit name (e.g., Pieces, Kilograms, Liters, Boxes)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the unit'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this unit is active and can be used'
  }
}, {
  tableName: 'units',
  timestamps: true,
  underscored: true
});

module.exports = Unit;

