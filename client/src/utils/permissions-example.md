# Permission System Usage Guide

This guide shows how to use the role-based permission system in the application.

## Overview

The permission system provides:
1. **Route-level protection** - Protect entire pages/routes
2. **Menu visibility** - Show/hide menu items based on roles
3. **Function-level permissions** - Control specific actions (create, edit, delete buttons)

## Available Roles

- `admin` - Full access to all features
- `inventory_manager` - Manage inventory, products, stock, purchase orders
- `sales_staff` - View products, process sales, view reports
- `auditor` - View-only access to reports and analytics

## Usage Examples

### 1. Using ProtectedRoute (Route-level protection)

```jsx
import ProtectedRoute from '../components/common/ProtectedRoute';
import { PERMISSIONS } from '../config/permissions';

// In your App.js or route configuration
<Route 
  path="/products" 
  element={
    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_PRODUCTS]}>
      <Products />
    </ProtectedRoute>
  } 
/>

// Using roles instead
<Route 
  path="/users" 
  element={
    <ProtectedRoute requiredRoles={['admin']}>
      <Users />
    </ProtectedRoute>
  } 
/>
```

### 2. Using PermissionGuard (Function-level permissions)

```jsx
import PermissionGuard from '../components/common/PermissionGuard';
import { PERMISSIONS } from '../config/permissions';

// Hide/show buttons based on permissions
<PermissionGuard permission={PERMISSIONS.CREATE_PRODUCTS}>
  <Button 
    variant="contained" 
    startIcon={<Add />}
    onClick={() => handleOpenDialog()}
  >
    {t('common.add')} {t('common.products')}
  </Button>
</PermissionGuard>

// Edit button
<PermissionGuard permission={PERMISSIONS.EDIT_PRODUCTS}>
  <IconButton onClick={() => handleEdit(product)}>
    <Edit />
  </IconButton>
</PermissionGuard>

// Delete button
<PermissionGuard permission={PERMISSIONS.DELETE_PRODUCTS}>
  <IconButton onClick={() => handleDelete(product)}>
    <Delete />
  </IconButton>
</PermissionGuard>

// Using multiple permissions (user needs ANY of them)
<PermissionGuard permission={[PERMISSIONS.EDIT_PRODUCTS, PERMISSIONS.DELETE_PRODUCTS]}>
  <Button>Action</Button>
</PermissionGuard>

// Using roles
<PermissionGuard roles={['admin', 'inventory_manager']}>
  <Button>Admin/Manager Only</Button>
</PermissionGuard>
```

### 3. Using usePermissions Hook

```jsx
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../config/permissions';

const MyComponent = () => {
  const { 
    checkPermission, 
    checkAnyPermission, 
    checkAllPermissions,
    hasRole,
    hasAnyRole,
    permissions 
  } = usePermissions();

  // Check single permission
  const canCreate = checkPermission(PERMISSIONS.CREATE_PRODUCTS);
  
  // Check multiple permissions (needs ANY)
  const canModify = checkAnyPermission([
    PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS
  ]);
  
  // Check multiple permissions (needs ALL)
  const canManage = checkAllPermissions([
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCTS
  ]);
  
  // Check role
  const isAdmin = hasRole('admin');
  
  // Check multiple roles
  const isManager = hasAnyRole(['admin', 'inventory_manager']);

  return (
    <div>
      {canCreate && (
        <Button onClick={handleCreate}>Create</Button>
      )}
      
      {canModify && (
        <Button onClick={handleModify}>Modify</Button>
      )}
      
      {isAdmin && (
        <Button onClick={handleAdminAction}>Admin Action</Button>
      )}
    </div>
  );
};
```

### 4. Conditional Rendering in Components

```jsx
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../config/permissions';

const ProductsPage = () => {
  const { checkPermission } = usePermissions();
  
  const canCreate = checkPermission(PERMISSIONS.CREATE_PRODUCTS);
  const canEdit = checkPermission(PERMISSIONS.EDIT_PRODUCTS);
  const canDelete = checkPermission(PERMISSIONS.DELETE_PRODUCTS);

  return (
    <Box>
      {canCreate && (
        <Button onClick={handleCreate}>Add Product</Button>
      )}
      
      <Table>
        {products.map(product => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>
              {canEdit && (
                <IconButton onClick={() => handleEdit(product)}>
                  <Edit />
                </IconButton>
              )}
              {canDelete && (
                <IconButton onClick={() => handleDelete(product)}>
                  <Delete />
                </IconButton>
              )}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </Box>
  );
};
```

## Available Permissions

All permissions are defined in `client/src/config/permissions.js`:

- `VIEW_DASHBOARD`
- `VIEW_PRODUCTS`, `CREATE_PRODUCTS`, `EDIT_PRODUCTS`, `DELETE_PRODUCTS`
- `VIEW_STOCK`, `MANAGE_STOCK`, `TRANSFER_STOCK`
- `VIEW_CATEGORIES`, `MANAGE_CATEGORIES`
- `VIEW_SUPPLIERS`, `MANAGE_SUPPLIERS`
- `VIEW_WAREHOUSES`, `MANAGE_WAREHOUSES`
- `VIEW_PURCHASE_ORDERS`, `CREATE_PURCHASE_ORDERS`, `APPROVE_PURCHASE_ORDERS`
- `VIEW_POS`, `PROCESS_SALES`, `VOID_SALES`
- `VIEW_REPORTS`, `EXPORT_REPORTS`
- `VIEW_ANALYTICS`
- `VIEW_USERS`, `CREATE_USERS`, `EDIT_USERS`, `DELETE_USERS`
- `VIEW_BARCODES`, `GENERATE_BARCODES`
- `USE_SEARCH`

## Best Practices

1. **Always use ProtectedRoute for routes** - Don't rely only on menu hiding
2. **Use PermissionGuard for UI elements** - Buttons, actions, etc.
3. **Check permissions before API calls** - Even if UI is hidden, check on server too
4. **Use descriptive permission names** - Makes it clear what each permission does
5. **Test with different roles** - Ensure permissions work correctly for each role

## Server-Side Protection

Remember to also protect routes on the server side using middleware:

```javascript
// server/middleware/auth.js
const { requireAdmin, requireManager, requireStaff } = require('./auth');

// Protect route
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.post('/products', authenticateToken, requireManager, createProduct);
```

