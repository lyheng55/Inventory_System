const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'inventory_manager', 'sales_staff', 'auditor'),
    allowNull: true,
    comment: 'Legacy role ENUM - kept for backward compatibility during migration'
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'role_id',
    references: {
      model: 'roles',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Foreign key to roles table'
  },
  permissionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'permission_id',
    references: {
      model: 'permissions',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Foreign key to permissions table'
  },
  canCreate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_create',
    comment: 'Can create resource (CRUD flag)'
  },
  canRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_read',
    comment: 'Can read/view resource (CRUD flag)'
  },
  canUpdate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_update',
    comment: 'Can update/edit resource (CRUD flag)'
  },
  canDelete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_delete',
    comment: 'Can delete resource (CRUD flag)'
  },
  granted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Legacy granted flag - kept for backward compatibility during migration'
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
  tableName: 'role_permissions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['role_id', 'permission_id'],
      name: 'unique_role_id_permission'
    }
  ]
});

module.exports = RolePermission;

