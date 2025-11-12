/**
 * Migration Script: Action-based to CRUD-based Permissions
 * 
 * This script migrates from action-based permissions (VIEW_PRODUCTS, CREATE_PRODUCTS, etc.)
 * to CRUD-based permissions (products with can_create, can_read, can_update, can_delete flags)
 * 
 * It also migrates from role ENUM to roles table with foreign keys.
 * 
 * Usage: node server/scripts/database/migrate-to-crud-permissions.js
 */

require('dotenv').config();
const sequelize = require('../../config/database');
const { Permission, Role, RolePermission, UserPermission, User } = require('../../models');

// Resource definitions for CRUD permissions
const RESOURCES = {
  dashboard: {
    name: 'dashboard',
    displayName: 'Dashboard',
    description: 'Access to view the main dashboard',
    category: 'dashboard'
  },
  products: {
    name: 'products',
    displayName: 'Products',
    description: 'Product management',
    category: 'inventory'
  },
  stock: {
    name: 'stock',
    displayName: 'Stock Management',
    description: 'Stock/inventory management',
    category: 'inventory'
  },
  categories: {
    name: 'categories',
    displayName: 'Categories',
    description: 'Category management',
    category: 'inventory'
  },
  suppliers: {
    name: 'suppliers',
    displayName: 'Suppliers',
    description: 'Supplier management',
    category: 'inventory'
  },
  warehouses: {
    name: 'warehouses',
    displayName: 'Warehouses',
    description: 'Warehouse management',
    category: 'inventory'
  },
  purchase_orders: {
    name: 'purchase_orders',
    displayName: 'Purchase Orders',
    description: 'Purchase order management',
    category: 'inventory'
  },
  pos: {
    name: 'pos',
    displayName: 'Point of Sale',
    description: 'Point of Sale system',
    category: 'sales'
  },
  reports: {
    name: 'reports',
    displayName: 'Reports',
    description: 'Reports access',
    category: 'reports'
  },
  analytics: {
    name: 'analytics',
    displayName: 'Analytics',
    description: 'Analytics access',
    category: 'reports'
  },
  users: {
    name: 'users',
    displayName: 'Users',
    description: 'User management',
    category: 'management'
  },
  barcodes: {
    name: 'barcodes',
    displayName: 'Barcodes',
    description: 'Barcode management',
    category: 'inventory'
  },
  search: {
    name: 'search',
    displayName: 'Search',
    description: 'Search functionality',
    category: 'system'
  }
};

// Role definitions
const ROLES = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions'
  },
  inventory_manager: {
    name: 'inventory_manager',
    displayName: 'Inventory Manager',
    description: 'Manages inventory, products, stock, and purchase orders'
  },
  sales_staff: {
    name: 'sales_staff',
    displayName: 'Sales Staff',
    description: 'Handles point of sale and sales transactions'
  },
  auditor: {
    name: 'auditor',
    displayName: 'Auditor',
    description: 'Read-only access for auditing and reporting'
  }
};

// Mapping from old action-based permissions to new resource-based CRUD permissions
const PERMISSION_MAPPING = {
  // Dashboard
  'view_dashboard': { resource: 'dashboard', crud: { read: true } },
  
  // Products
  'view_products': { resource: 'products', crud: { read: true } },
  'create_products': { resource: 'products', crud: { create: true } },
  'edit_products': { resource: 'products', crud: { update: true } },
  'delete_products': { resource: 'products', crud: { delete: true } },
  
  // Stock
  'view_stock': { resource: 'stock', crud: { read: true } },
  'manage_stock': { resource: 'stock', crud: { create: true, update: true } },
  'transfer_stock': { resource: 'stock', crud: { update: true } },
  
  // Categories
  'view_categories': { resource: 'categories', crud: { read: true } },
  'manage_categories': { resource: 'categories', crud: { create: true, update: true, delete: true } },
  
  // Suppliers
  'view_suppliers': { resource: 'suppliers', crud: { read: true } },
  'manage_suppliers': { resource: 'suppliers', crud: { create: true, update: true } },
  
  // Warehouses
  'view_warehouses': { resource: 'warehouses', crud: { read: true } },
  'manage_warehouses': { resource: 'warehouses', crud: { create: true, update: true } },
  
  // Purchase Orders
  'view_purchase_orders': { resource: 'purchase_orders', crud: { read: true } },
  'create_purchase_orders': { resource: 'purchase_orders', crud: { create: true } },
  'approve_purchase_orders': { resource: 'purchase_orders', crud: { update: true } },
  
  // POS
  'view_pos': { resource: 'pos', crud: { read: true } },
  'process_sales': { resource: 'pos', crud: { create: true } },
  'void_sales': { resource: 'pos', crud: { delete: true } },
  
  // Reports
  'view_reports': { resource: 'reports', crud: { read: true } },
  'export_reports': { resource: 'reports', crud: { read: true } }, // Export uses read
  
  // Analytics
  'view_analytics': { resource: 'analytics', crud: { read: true } },
  
  // Users
  'view_users': { resource: 'users', crud: { read: true } },
  'create_users': { resource: 'users', crud: { create: true } },
  'edit_users': { resource: 'users', crud: { update: true } },
  'delete_users': { resource: 'users', crud: { delete: true } },
  
  // Barcodes
  'view_barcodes': { resource: 'barcodes', crud: { read: true } },
  'generate_barcodes': { resource: 'barcodes', crud: { create: true } },
  
  // Search
  'use_search': { resource: 'search', crud: { read: true } }
};

async function migrateToCrudPermissions() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting CRUD permissions migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Step 1: Create roles table and insert default roles
    console.log('\n📋 Step 1: Creating roles table and inserting default roles...');
    await Role.sync({ alter: true, transaction });
    
    const roleMap = new Map();
    for (const [key, roleData] of Object.entries(ROLES)) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          isActive: true
        },
        transaction
      });
      roleMap.set(key, role.id);
      if (created) {
        console.log(`  ✅ Created role: ${roleData.displayName}`);
      } else {
        console.log(`  ℹ️  Role already exists: ${roleData.displayName}`);
      }
    }
    
    // Step 2: Update permissions table structure and create resource-based permissions
    console.log('\n📋 Step 2: Creating resource-based permissions...');
    await Permission.sync({ alter: true, transaction });
    
    const resourceMap = new Map();
    for (const [key, resourceData] of Object.entries(RESOURCES)) {
      const [permission, created] = await Permission.findOrCreate({
        where: { name: resourceData.name },
        defaults: {
          name: resourceData.name,
          displayName: resourceData.displayName,
          description: resourceData.description,
          category: resourceData.category,
          isActive: true
        },
        transaction
      });
      resourceMap.set(key, permission.id);
      if (created) {
        console.log(`  ✅ Created resource permission: ${resourceData.displayName}`);
      } else {
        console.log(`  ℹ️  Resource permission already exists: ${resourceData.displayName}`);
      }
    }
    
    // Step 3: Migrate role_permissions from action-based to CRUD-based
    console.log('\n📋 Step 3: Migrating role permissions to CRUD system...');
    await RolePermission.sync({ alter: true, transaction });
    
    // Get all existing role permissions
    const existingRolePermissions = await RolePermission.findAll({
      include: [{ model: Permission }],
      transaction
    });
    
    // Create a map of old permissions to their CRUD mappings
    const oldPermissionMap = new Map();
    for (const rp of existingRolePermissions) {
      if (rp.Permission && rp.Permission.key) {
        const mapping = PERMISSION_MAPPING[rp.Permission.key];
        if (mapping && rp.granted) {
          const resourceId = resourceMap.get(mapping.resource);
          const roleId = roleMap.get(rp.role);
          
          if (resourceId && roleId) {
            const key = `${rp.role}-${mapping.resource}`;
            if (!oldPermissionMap.has(key)) {
              oldPermissionMap.set(key, {
                roleId,
                resourceId,
                crud: { create: false, read: false, update: false, delete: false }
              });
            }
            
            const entry = oldPermissionMap.get(key);
            if (mapping.crud.create) entry.crud.create = true;
            if (mapping.crud.read) entry.crud.read = true;
            if (mapping.crud.update) entry.crud.update = true;
            if (mapping.crud.delete) entry.crud.delete = true;
          }
        }
      }
    }
    
    // Insert/update CRUD role permissions
    let rolePermCount = 0;
    for (const [key, entry] of oldPermissionMap.entries()) {
      const [rolePermission, created] = await RolePermission.findOrCreate({
        where: {
          roleId: entry.roleId,
          permissionId: entry.resourceId
        },
        defaults: {
          roleId: entry.roleId,
          permissionId: entry.resourceId,
          canCreate: entry.crud.create,
          canRead: entry.crud.read,
          canUpdate: entry.crud.update,
          canDelete: entry.crud.delete
        },
        transaction
      });
      
      if (!created) {
        await rolePermission.update({
          canCreate: entry.crud.create,
          canRead: entry.crud.read,
          canUpdate: entry.crud.update,
          canDelete: entry.crud.delete
        }, { transaction });
      }
      
      rolePermCount++;
    }
    
    // Set default permissions for admin (all CRUD on all resources)
    const adminRoleId = roleMap.get('admin');
    for (const [resourceKey, resourceId] of resourceMap.entries()) {
      await RolePermission.findOrCreate({
        where: {
          roleId: adminRoleId,
          permissionId: resourceId
        },
        defaults: {
          roleId: adminRoleId,
          permissionId: resourceId,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true
        },
        transaction
      });
    }
    
    console.log(`  ✅ Migrated ${rolePermCount} role permissions to CRUD format`);
    
    // Step 4: Migrate user_permissions to CRUD format
    console.log('\n📋 Step 4: Migrating user permissions to CRUD system...');
    // IMPORTANT: Sync User table FIRST before UserPermission (which has FK to users)
    await User.sync({ alter: true, transaction });
    await UserPermission.sync({ alter: true, transaction });
    
    const existingUserPermissions = await UserPermission.findAll({
      include: [{ model: Permission }],
      transaction
    });
    
    let userPermCount = 0;
    for (const up of existingUserPermissions) {
      if (up.Permission && up.Permission.key) {
        const mapping = PERMISSION_MAPPING[up.Permission.key];
        if (mapping && up.granted) {
          const resourceId = resourceMap.get(mapping.resource);
          
          if (resourceId) {
            const [userPermission, created] = await UserPermission.findOrCreate({
              where: {
                userId: up.userId,
                permissionId: resourceId
              },
              defaults: {
                userId: up.userId,
                permissionId: resourceId,
                canCreate: mapping.crud.create || false,
                canRead: mapping.crud.read || false,
                canUpdate: mapping.crud.update || false,
                canDelete: mapping.crud.delete || false
              },
              transaction
            });
            
            if (!created) {
              await userPermission.update({
                canCreate: mapping.crud.create || false,
                canRead: mapping.crud.read || false,
                canUpdate: mapping.crud.update || false,
                canDelete: mapping.crud.delete || false
              }, { transaction });
            }
            
            userPermCount++;
          }
        }
      }
    }
    
    console.log(`  ✅ Migrated ${userPermCount} user permissions to CRUD format`);
    
    await transaction.commit();
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
  // Don't close connection - let the caller manage it
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateToCrudPermissions()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToCrudPermissions };

