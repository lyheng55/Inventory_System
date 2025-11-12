const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  saleNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'sale_number'
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
  saleDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sale_date'
  },
  status: {
    type: DataTypes.ENUM('completed', 'void', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'tax_amount'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'discount_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'total_amount'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'other'),
    allowNull: false,
    defaultValue: 'cash',
    field: 'payment_method'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'payment_amount'
  },
  changeAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'change_amount'
  },
  customerName: {
    type: DataTypes.STRING(200),
    field: 'customer_name'
  },
  customerEmail: {
    type: DataTypes.STRING(100),
    field: 'customer_email'
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    field: 'customer_phone'
  },
  notes: {
    type: DataTypes.TEXT
  },
  soldBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sold_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  voidedBy: {
    type: DataTypes.INTEGER,
    field: 'voided_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  voidedAt: {
    type: DataTypes.DATE,
    field: 'voided_at'
  },
  voidReason: {
    type: DataTypes.TEXT,
    field: 'void_reason'
  }
}, {
  tableName: 'sales'
});

module.exports = Sale;

