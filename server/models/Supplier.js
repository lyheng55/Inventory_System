const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  contactPerson: {
    type: DataTypes.STRING(100),
    field: 'contact_person'
  },
  email: {
    type: DataTypes.STRING(100),
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  address: {
    type: DataTypes.TEXT
  },
  city: {
    type: DataTypes.STRING(50)
  },
  state: {
    type: DataTypes.STRING(50)
  },
  zipCode: {
    type: DataTypes.STRING(10),
    field: 'zip_code'
  },
  country: {
    type: DataTypes.STRING(50)
  },
  taxId: {
    type: DataTypes.STRING(50),
    field: 'tax_id'
  },
  paymentTerms: {
    type: DataTypes.STRING(100),
    defaultValue: 'Net 30',
    field: 'payment_terms'
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 5
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'suppliers'
});

module.exports = Supplier;
