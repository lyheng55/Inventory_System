/**
 * Permission Configuration
 * Defines what each role can access (menus, routes, and functions)
 */

// Permission keys for different features
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Products
  VIEW_PRODUCTS: 'view_products',
  CREATE_PRODUCTS: 'create_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  
  // Stock
  VIEW_STOCK: 'view_stock',
  MANAGE_STOCK: 'manage_stock',
  TRANSFER_STOCK: 'transfer_stock',
  
  // Categories
  VIEW_CATEGORIES: 'view_categories',
  MANAGE_CATEGORIES: 'manage_categories',
  
  // Suppliers
  VIEW_SUPPLIERS: 'view_suppliers',
  MANAGE_SUPPLIERS: 'manage_suppliers',
  
  // Warehouses
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',
  
  // Purchase Orders
  VIEW_PURCHASE_ORDERS: 'view_purchase_orders',
  CREATE_PURCHASE_ORDERS: 'create_purchase_orders',
  APPROVE_PURCHASE_ORDERS: 'approve_purchase_orders',
  
  // POS (Point of Sale)
  VIEW_POS: 'view_pos',
  PROCESS_SALES: 'process_sales',
  VOID_SALES: 'void_sales',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  
  // Users
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Barcodes
  VIEW_BARCODES: 'view_barcodes',
  GENERATE_BARCODES: 'generate_barcodes',
  
  // Search
  USE_SEARCH: 'use_search',
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS),
  ],
  
  inventory_manager: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.VIEW_STOCK,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.TRANSFER_STOCK,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.VIEW_SUPPLIERS,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.VIEW_WAREHOUSES,
    PERMISSIONS.MANAGE_WAREHOUSES,
    PERMISSIONS.VIEW_PURCHASE_ORDERS,
    PERMISSIONS.CREATE_PURCHASE_ORDERS,
    PERMISSIONS.APPROVE_PURCHASE_ORDERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_BARCODES,
    PERMISSIONS.GENERATE_BARCODES,
    PERMISSIONS.USE_SEARCH,
  ],
  
  sales_staff: [
    // Only POS-related permissions for testing
    PERMISSIONS.VIEW_POS,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.VOID_SALES,
  ],
  
  auditor: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_STOCK,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_SUPPLIERS,
    PERMISSIONS.VIEW_WAREHOUSES,
    PERMISSIONS.VIEW_PURCHASE_ORDERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.USE_SEARCH,
  ],
};

// Menu visibility by role
// Updated to support both old permission keys and new resource-based permissions
export const MENU_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': [PERMISSIONS.VIEW_DASHBOARD, 'dashboard'], // Support both old and new format
  '/products': [PERMISSIONS.VIEW_PRODUCTS, 'products'],
  '/stock': [PERMISSIONS.VIEW_STOCK, 'stock'],
  '/categories': [PERMISSIONS.VIEW_CATEGORIES, 'categories'],
  '/suppliers': [PERMISSIONS.VIEW_SUPPLIERS, 'suppliers'],
  '/warehouses': [PERMISSIONS.VIEW_WAREHOUSES, 'warehouses'],
  '/purchase-orders': [PERMISSIONS.VIEW_PURCHASE_ORDERS, 'purchase_orders'],
  '/pos': [PERMISSIONS.VIEW_POS, 'pos'],
  '/reports': [PERMISSIONS.VIEW_REPORTS, 'reports'],
  '/analytics': [PERMISSIONS.VIEW_ANALYTICS, 'analytics'],
  '/users': [PERMISSIONS.VIEW_USERS, 'users'],
  '/barcodes': [PERMISSIONS.VIEW_BARCODES, 'barcodes'],
  '/search': [PERMISSIONS.USE_SEARCH, 'search'],
};

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = (role: string): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: string, permission: string): boolean => {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
};

/**
 * Check if a role has any of the specified permissions
 */
export const hasAnyPermission = (role: string, permissions: string[]): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a role has all of the specified permissions
 */
export const hasAllPermissions = (role: string, permissions: string[]): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Check if a role can access a specific route/menu
 */
export const canAccessRoute = (role: string, path: string): boolean => {
  const requiredPermissions = MENU_PERMISSIONS[path];
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true; // No restrictions
  }
  return hasAnyPermission(role, requiredPermissions);
};

