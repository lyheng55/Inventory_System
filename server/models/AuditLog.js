const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who performed the action (null for system actions)'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN, LOGOUT)'
  },
  entity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Entity type (e.g., Product, User, PurchaseOrder, Stock)'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'entity_id',
    comment: 'ID of the affected entity'
  },
  changes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string of changes made (before/after values)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IP address of the user'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: 'User agent string from the request'
  },
  status: {
    type: DataTypes.ENUM('success', 'failure', 'error'),
    allowNull: false,
    defaultValue: 'success',
    comment: 'Status of the action'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Error message if action failed'
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional metadata as JSON string'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when the action occurred'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Audit logs are never updated, only created
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_audit_logs_user_id'
    },
    {
      fields: ['entity', 'entity_id'],
      name: 'idx_audit_logs_entity'
    },
    {
      fields: ['action'],
      name: 'idx_audit_logs_action'
    },
    {
      fields: ['created_at'],
      name: 'idx_audit_logs_created_at'
    },
    {
      fields: ['status'],
      name: 'idx_audit_logs_status'
    }
  ]
});

module.exports = AuditLog;

