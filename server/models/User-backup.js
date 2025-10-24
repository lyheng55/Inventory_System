const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.ENUM('admin', 'inventory_manager', 'sales_staff', 'auditor'),
    allowNull: false,
    defaultValue: 'sales_staff'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_login_attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_until'
  },
  lastFailedLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_failed_login'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if account is locked
User.prototype.isLocked = function() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

// Increment failed login attempts
User.prototype.incrementFailedAttempts = async function() {
  const attempts = this.failedLoginAttempts + 1;
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + lockoutDuration) : null;
  
  await this.update({
    failedLoginAttempts: attempts,
    lockedUntil: lockedUntil,
    lastFailedLogin: new Date()
  });
  
  return attempts;
};

// Reset failed login attempts
User.prototype.resetFailedAttempts = async function() {
  await this.update({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastFailedLogin: null
  });
};

module.exports = User;
