# CRUD Permission System - SQL Implementation Todo List

## Overview
Migrate from action-based permissions (e.g., VIEW_PRODUCTS, CREATE_PRODUCTS) to CRUD-based permissions using 0/1 flags for each resource.

## Permission Structure

### Current System
- Action-based: `VIEW_PRODUCTS`, `CREATE_PRODUCTS`, `EDIT_PRODUCTS`, `DELETE_PRODUCTS`
- Separate permissions for each action

### New CRUD System
- Resource-based with CRUD flags: `products` with flags `create=1`, `read=1`, `update=1`, `delete=0`
- Each resource has 4 boolean flags (0 or 1) for Create, Read, Update, Delete

## Database Schema Design

### 1. Roles Table
```sql
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'admin', 'inventory_manager', 'sales_staff', 'auditor'
  display_name VARCHAR(100) NOT NULL, -- e.g., 'Administrator', 'Inventory Manager'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Permissions Table (Resources)
```sql
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'products', 'stock', 'categories'
  display_name VARCHAR(200) NOT NULL, -- e.g., 'Products', 'Stock Management'
  description TEXT,
  category VARCHAR(50),                -- e.g., 'inventory', 'management', 'reports'
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. Role Permissions Table
```sql
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  can_create BOOLEAN DEFAULT 0,  -- 0 = no, 1 = yes
  can_read BOOLEAN DEFAULT 0,
  can_update BOOLEAN DEFAULT 0,
  can_delete BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);
```

### 4. User Permissions Table (for custom user-level overrides)
```sql
CREATE TABLE user_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  can_create BOOLEAN DEFAULT 0,
  can_read BOOLEAN DEFAULT 0,
  can_update BOOLEAN DEFAULT 0,
  can_delete BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_permission (user_id, permission_id)
);
```

## Permission Mapping (Resources)

### Permissions to Create
1. **dashboard** - Dashboard access
2. **products** - Product management
3. **stock** - Stock/inventory management
4. **categories** - Category management
5. **suppliers** - Supplier management
6. **warehouses** - Warehouse management
7. **purchase_orders** - Purchase order management
8. **pos** - Point of Sale
9. **reports** - Reports access
10. **analytics** - Analytics access
11. **users** - User management
12. **barcodes** - Barcode management
13. **search** - Search functionality

## Migration Steps

### Phase 1: Database Setup
- [ ] Create `roles` table
- [ ] Insert default roles (admin, inventory_manager, sales_staff, auditor) into `roles` table
- [ ] Create `permissions` table (for resources)
- [ ] Create `role_permissions` table (with `role_id` foreign key)
- [ ] Create `user_permissions` table
- [ ] Insert all resources into `permissions` table
- [ ] Create indexes for performance
- [ ] Update `users` table to use `role_id` foreign key instead of `role` ENUM (optional migration)

### Phase 2: Data Migration
- [ ] Map existing permissions to CRUD permissions
  - `VIEW_*` → `can_read = 1`
  - `CREATE_*` → `can_create = 1`
  - `EDIT_*` → `can_update = 1`
  - `DELETE_*` → `can_delete = 1`
- [ ] Migrate role permissions from old `role_permissions` table to new CRUD `role_permissions` table
  - Convert `role` ENUM values to `role_id` foreign keys by joining with `roles` table
- [ ] Migrate user permissions from old `user_permissions` table to new CRUD `user_permissions` table
- [ ] Create migration script to convert old permissions to new format
- [ ] Note: Table names are the same but structure changes from action-based to CRUD-based
- [ ] Note: `role_permissions.role` ENUM is replaced with `role_permissions.role_id` foreign key

### Phase 3: Backend API Updates
- [ ] Create Role model (`server/models/Role.js`) for roles table
- [ ] Update Permission model (`server/models/Permission.js`) to support CRUD structure
- [ ] Update RolePermission model (`server/models/RolePermission.js`) to:
  - Use `role_id` foreign key instead of `role` ENUM
  - Include CRUD flags (can_create, can_read, can_update, can_delete)
  - Add association to Role model
- [ ] Update UserPermission model (`server/models/UserPermission.js`) to include CRUD flags
- [ ] Update User model to use `role_id` foreign key (if migrating from ENUM)
- [ ] Update `/api/auth/permissions/me` endpoint to return CRUD permissions
- [ ] Create new endpoints:
  - `GET /api/auth/permissions` - Get all permissions (resources)
  - `GET /api/auth/permissions/:permissionId/crud` - Get CRUD permissions for a resource
  - `POST /api/auth/permissions/:permissionId/crud` - Update CRUD permissions
  - `GET /api/auth/roles` - Get all roles
  - `GET /api/auth/roles/:roleId/permissions` - Get permissions for a role
- [ ] Update permission checking middleware to use CRUD system

### Phase 4: Frontend Updates
- [ ] Update `usePermissions` hook to work with CRUD permissions
- [ ] Create helper functions:
  - `canCreate(resource)` - Check if user can create
  - `canRead(resource)` - Check if user can read
  - `canUpdate(resource)` - Check if user can update
  - `canDelete(resource)` - Check if user can delete
- [ ] Update `Layout.js` to use CRUD permissions for menu filtering
- [ ] Update `ProtectedRoute` to use CRUD permissions
- [ ] Update all components to use CRUD permission checks

### Phase 5: Permission Management UI
- [ ] Update Permissions page to show CRUD matrix
- [ ] Create UI for managing CRUD permissions per permission (resource)
- [ ] Add role-based CRUD permission editor
- [ ] Add user-specific CRUD permission overrides

### Phase 6: Testing & Cleanup
- [ ] Test all permission checks with new CRUD system
- [ ] Verify menu filtering works correctly
- [ ] Test role-based access control
- [ ] Test user-specific permission overrides
- [ ] Remove old permission tables (optional, keep for rollback)
- [ ] Update documentation

## Permission Mapping Examples

### Example 1: Products Permission
```
Old: VIEW_PRODUCTS, CREATE_PRODUCTS, EDIT_PRODUCTS, DELETE_PRODUCTS
New: products permission with:
  - can_read = 1
  - can_create = 1
  - can_update = 1
  - can_delete = 1
```

### Example 2: POS Permission
```
Old: VIEW_POS, PROCESS_SALES, VOID_SALES
New: pos permission with:
  - can_read = 1 (view POS)
  - can_create = 1 (process sales)
  - can_update = 0
  - can_delete = 1 (void sales)
```

### Example 3: Reports Permission
```
Old: VIEW_REPORTS, EXPORT_REPORTS
New: reports permission with:
  - can_read = 1 (view reports)
  - can_create = 0
  - can_update = 0
  - can_delete = 0
  Note: Export might need separate permission or use can_read
```

## Role Examples

### Admin Role
- All permissions: `can_create=1, can_read=1, can_update=1, can_delete=1`

### Sales Staff Role
- pos: `can_create=1, can_read=1, can_update=0, can_delete=1`
- All other permissions: `can_create=0, can_read=0, can_update=0, can_delete=0`

### Inventory Manager Role
- products: `can_create=1, can_read=1, can_update=1, can_delete=1`
- stock: `can_create=1, can_read=1, can_update=1, can_delete=0`
- categories: `can_create=1, can_read=1, can_update=1, can_delete=1`
- suppliers: `can_create=1, can_read=1, can_update=1, can_delete=0`
- warehouses: `can_create=1, can_read=1, can_update=1, can_delete=0`
- purchase_orders: `can_create=1, can_read=1, can_update=1, can_delete=0`
- reports: `can_read=1, can_create=0, can_update=0, can_delete=0`

## SQL Queries for Common Operations

### Get user permissions for a permission (resource)
```sql
SELECT 
  p.name as permission_name,
  COALESCE(up.can_create, rp.can_create, 0) as can_create,
  COALESCE(up.can_read, rp.can_read, 0) as can_read,
  COALESCE(up.can_update, rp.can_update, 0) as can_update,
  COALESCE(up.can_delete, rp.can_delete, 0) as can_delete
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
  AND rp.role_id = (SELECT role_id FROM users WHERE id = ?)
LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
WHERE p.is_active = 1
ORDER BY p.category, p.name;
```

### Get all permissions for current user
```sql
SELECT 
  p.name,
  p.display_name,
  p.category,
  COALESCE(up.can_create, rp.can_create, 0) as can_create,
  COALESCE(up.can_read, rp.can_read, 0) as can_read,
  COALESCE(up.can_update, rp.can_update, 0) as can_update,
  COALESCE(up.can_delete, rp.can_delete, 0) as can_delete
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
  AND rp.role_id = (SELECT role_id FROM users WHERE id = ?)
LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
WHERE p.is_active = 1
ORDER BY p.category, p.name;
```

### Get permissions for a specific role
```sql
SELECT 
  p.name,
  p.display_name,
  p.category,
  rp.can_create,
  rp.can_read,
  rp.can_update,
  rp.can_delete
FROM permissions p
INNER JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = ? AND p.is_active = 1
ORDER BY p.category, p.name;
```

### Get all roles with permission counts
```sql
SELECT 
  r.id,
  r.name,
  r.display_name,
  COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.is_active = 1
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name;
```

## Notes
- **Table Names**: 
  - `roles` table stores role definitions (admin, inventory_manager, etc.)
  - `permissions` table stores resources (products, stock, etc.)
  - `role_permissions` table stores CRUD flags for each role (uses `role_id` foreign key)
  - `user_permissions` table stores CRUD flags for user-specific overrides
- **Role Permission Process**:
  - Roles are stored in a separate `roles` table for better maintainability
  - `role_permissions` uses `role_id` foreign key instead of `role` ENUM
  - This allows adding new roles without altering database schema
  - Role names are stored in `roles.name` (e.g., 'admin', 'inventory_manager')
- User-specific permissions override role permissions
- 0 = denied, 1 = allowed
- If no permission record exists, default is 0 (denied)
- Admin role can have a special flag to bypass all checks
- Note: These table names match the existing permission system structure but with CRUD flags instead of action-based permissions
- Note: Migration from `role` ENUM to `role_id` foreign key requires data migration script

