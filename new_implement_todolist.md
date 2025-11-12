# Database-Driven Permission System Implementation TODO

## Overview
This document outlines the implementation plan for migrating from hardcoded permissions to a database-driven permission system.

## Database Schema Design

### Tables

1. **permissions** - Stores all available permissions
   - `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
   - `key` (VARCHAR(100), UNIQUE) - Permission key (e.g., VIEW_PRODUCTS)
   - `name` (VARCHAR(200)) - Human-readable name
   - `description` (TEXT) - Detailed description
   - `category` (VARCHAR(50)) - Permission category (products, stock, users, etc.)
   - `is_active` (BOOLEAN) - Whether permission is active
   - `created_at` (DATETIME)
   - `updated_at` (DATETIME)

2. **role_permissions** - Junction table for role-based permissions
   - `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
   - `role` (ENUM: admin, inventory_manager, sales_staff, auditor)
   - `permission_id` (INTEGER, FOREIGN KEY -> permissions.id)
   - `granted` (BOOLEAN) - true = granted, false = explicitly denied
   - `created_at` (DATETIME)
   - `updated_at` (DATETIME)
   - UNIQUE INDEX on (role, permission_id)

3. **user_permissions** (Optional - for custom user-level permissions)
   - `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
   - `user_id` (INTEGER, FOREIGN KEY -> users.id)
   - `permission_id` (INTEGER, FOREIGN KEY -> permissions.id)
   - `granted` (BOOLEAN) - User-level permissions override role permissions
   - `created_at` (DATETIME)
   - `updated_at` (DATETIME)
   - UNIQUE INDEX on (user_id, permission_id)

---

## Implementation Tasks

### Phase 1: Database Setup ✅
- [x] Create Permission model (`server/models/Permission.js`)
- [x] Create RolePermission model (`server/models/RolePermission.js`)
- [x] Create UserPermission model (`server/models/UserPermission.js`)
- [ ] Update `server/models/index.js` to include new models
- [ ] Create database migration script to create tables
- [ ] Create seed script to populate initial permissions
- [ ] Create seed script to populate default role permissions
- [ ] Test database schema creation

### Phase 2: Server-Side API
- [ ] Create permission service (`server/services/permissionService.js`)
  - [ ] `getAllPermissions()` - Get all permissions
  - [ ] `getPermissionsByRole(role)` - Get permissions for a role
  - [ ] `getUserPermissions(userId)` - Get all permissions for a user (role + custom)
  - [ ] `checkPermission(userId, permissionKey)` - Check if user has permission
  - [ ] `grantPermissionToRole(role, permissionId)` - Grant permission to role
  - [ ] `revokePermissionFromRole(role, permissionId)` - Revoke permission from role
  - [ ] `grantPermissionToUser(userId, permissionId)` - Grant custom permission to user
  - [ ] `revokePermissionFromUser(userId, permissionId)` - Revoke custom permission from user

- [ ] Create permission routes (`server/routes/auth/permissions.js`)
  - [ ] `GET /api/auth/permissions` - Get all permissions (admin only)
  - [ ] `GET /api/auth/permissions/role/:role` - Get permissions for a role
  - [ ] `GET /api/auth/permissions/user/:userId` - Get permissions for a user
  - [ ] `POST /api/auth/permissions` - Create new permission (admin only)
  - [ ] `PUT /api/auth/permissions/:id` - Update permission (admin only)
  - [ ] `DELETE /api/auth/permissions/:id` - Delete permission (admin only)
  - [ ] `POST /api/auth/permissions/role/:role` - Grant permission to role (admin only)
  - [ ] `DELETE /api/auth/permissions/role/:role/:permissionId` - Revoke permission from role (admin only)
  - [ ] `POST /api/auth/permissions/user/:userId` - Grant permission to user (admin only)
  - [ ] `DELETE /api/auth/permissions/user/:userId/:permissionId` - Revoke permission from user (admin only)

- [ ] Update authentication middleware
  - [ ] Add permission checking to `authenticateToken` middleware
  - [ ] Create `checkPermission` middleware function
  - [ ] Update existing routes to use permission middleware

### Phase 3: Client-Side Updates
- [ ] Create permission API service (`client/src/services/permissionService.js`)
  - [ ] `getAllPermissions()`
  - [ ] `getPermissionsByRole(role)`
  - [ ] `getUserPermissions(userId)`
  - [ ] `createPermission(data)`
  - [ ] `updatePermission(id, data)`
  - [ ] `deletePermission(id)`
  - [ ] `grantPermissionToRole(role, permissionId)`
  - [ ] `revokePermissionFromRole(role, permissionId)`
  - [ ] `grantPermissionToUser(userId, permissionId)`
  - [ ] `revokePermissionFromUser(userId, permissionId)`

- [ ] Update `usePermissions` hook (`client/src/hooks/usePermissions.js`)
  - [ ] Fetch permissions from API instead of hardcoded config
  - [ ] Cache permissions in context/state
  - [ ] Add loading state
  - [ ] Add error handling
  - [ ] Refresh permissions when user changes

- [ ] Create Permission Management Page (`client/src/pages/management/Permissions.js`)
  - [ ] List all permissions with filters
  - [ ] Create/Edit/Delete permissions (admin only)
  - [ ] Manage role permissions (assign/revoke)
  - [ ] Manage user-specific permissions (optional)
  - [ ] Permission categories grouping
  - [ ] Search and filter functionality

- [ ] Update existing pages
  - [ ] Update `ProtectedRoute` to fetch permissions from API
  - [ ] Update `PermissionGuard` to use API permissions
  - [ ] Add loading states while fetching permissions

### Phase 4: Migration & Data Population
- [ ] Create migration script (`server/scripts/database/migrate-permissions.js`)
  - [ ] Create tables if they don't exist
  - [ ] Migrate existing hardcoded permissions to database
  - [ ] Migrate existing role permissions to database
  - [ ] Handle data migration safely (backup first)

- [ ] Create seed script (`server/scripts/database/seed-permissions.js`)
  - [ ] Insert all permission keys from `client/src/config/permissions.js`
  - [ ] Insert default role permissions based on `ROLE_PERMISSIONS`
  - [ ] Verify data integrity

- [ ] Create rollback script (optional)
  - [ ] Ability to rollback to hardcoded permissions if needed

### Phase 5: Testing & Validation
- [ ] Unit tests for permission service
- [ ] Integration tests for permission API endpoints
- [ ] Test permission checking with different roles
- [ ] Test user-specific permissions override
- [ ] Test permission caching on client
- [ ] Test permission refresh on role change
- [ ] Performance testing (permission lookup speed)

### Phase 6: Documentation & Cleanup
- [ ] Update API documentation
- [ ] Update permission system usage guide
- [ ] Document permission management workflow
- [ ] Remove hardcoded permission config (or keep as fallback)
- [ ] Update README with new permission system

---

## Database Migration Script Structure

```javascript
// server/scripts/database/migrate-permissions.js
// 1. Create permissions table
// 2. Create role_permissions table
// 3. Create user_permissions table
// 4. Insert initial permissions
// 5. Insert default role permissions
```

## Seed Data Structure

### Initial Permissions to Insert
Based on `client/src/config/permissions.js`:
- VIEW_DASHBOARD
- VIEW_PRODUCTS, CREATE_PRODUCTS, EDIT_PRODUCTS, DELETE_PRODUCTS
- VIEW_STOCK, MANAGE_STOCK, TRANSFER_STOCK
- VIEW_CATEGORIES, MANAGE_CATEGORIES
- VIEW_SUPPLIERS, MANAGE_SUPPLIERS
- VIEW_WAREHOUSES, MANAGE_WAREHOUSES
- VIEW_PURCHASE_ORDERS, CREATE_PURCHASE_ORDERS, APPROVE_PURCHASE_ORDERS
- VIEW_POS, PROCESS_SALES, VOID_SALES
- VIEW_REPORTS, EXPORT_REPORTS
- VIEW_ANALYTICS
- VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS
- VIEW_BARCODES, GENERATE_BARCODES
- USE_SEARCH

### Default Role Permissions
Based on `ROLE_PERMISSIONS` in `client/src/config/permissions.js`:
- admin: All permissions
- inventory_manager: Inventory-related permissions
- sales_staff: Sales and view permissions
- auditor: Read-only permissions

---

## API Endpoint Examples

### Get User Permissions
```
GET /api/auth/permissions/user/1
Response: {
  "permissions": [
    { "key": "VIEW_PRODUCTS", "granted": true },
    { "key": "CREATE_PRODUCTS", "granted": true },
    ...
  ],
  "role": "inventory_manager",
  "customPermissions": []
}
```

### Grant Permission to Role
```
POST /api/auth/permissions/role/inventory_manager
Body: { "permissionId": 5 }
Response: { "message": "Permission granted successfully" }
```

### Check Permission
```
GET /api/auth/permissions/check?permission=VIEW_PRODUCTS
Response: { "hasPermission": true }
```

---

## Implementation Priority

1. **High Priority:**
   - Database schema creation
   - Permission service (server-side)
   - Basic API endpoints
   - Update usePermissions hook to fetch from API

2. **Medium Priority:**
   - Permission management UI
   - Migration script
   - Seed script

3. **Low Priority:**
   - User-specific permissions
   - Advanced permission features
   - Performance optimizations

---

## Notes

- Keep hardcoded permissions as fallback during migration
- Implement caching for permissions to reduce database queries
- Consider Redis for permission caching in production
- User-specific permissions should override role permissions
- Admin role should always have all permissions (can be enforced in code)
- Add audit logging for permission changes

---

## Future Enhancements

- Permission groups/categories management
- Permission inheritance
- Time-based permissions (temporary access)
- Permission approval workflow
- Permission usage analytics
- Bulk permission operations

