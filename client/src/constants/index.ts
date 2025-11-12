// Application constants

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  
  // Products
  PRODUCTS: {
    BASE: '/products',
    SEARCH: '/products/search',
    BULK_UPDATE: '/products/bulk-update',
  },
  
  // Stock
  STOCK: {
    BASE: '/stock',
    MOVEMENTS: '/stock/movements',
    ADJUSTMENTS: '/stock/adjustments',
  },
  
  // Categories
  CATEGORIES: {
    BASE: '/categories',
  },
  
  // Suppliers
  SUPPLIERS: {
    BASE: '/suppliers',
  },
  
  // Warehouses
  WAREHOUSES: {
    BASE: '/warehouses',
  },
  
  // Purchase Orders
  PURCHASE_ORDERS: {
    BASE: '/purchase-orders',
    APPROVE: '/purchase-orders/:id/approve',
    RECEIVE: '/purchase-orders/:id/receive',
    CANCEL: '/purchase-orders/:id/cancel',
  },
  
  // Users
  USERS: {
    BASE: '/users',
  },
  
  // Reports
  REPORTS: {
    STOCK: '/reports/stock',
    INVENTORY_VALUE: '/reports/inventory-value',
    LOW_STOCK: '/reports/low-stock-alerts',
    PURCHASE_ORDERS: '/reports/purchase-orders',
    SUPPLIER_PERFORMANCE: '/reports/supplier-performance',
    DASHBOARD: '/reports/dashboard',
  },
  
  // Barcodes
  BARCODES: {
    BASE: '/barcodes',
    GENERATE: '/barcodes/generate',
    SCAN: '/barcodes/scan',
  },
  
  // Uploads
  UPLOADS: {
    BASE: '/uploads',
    PRODUCTS: '/uploads/products',
    DOCUMENTS: '/uploads/documents',
  },
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const;

// User role permissions
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.ADMIN]: [
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'products.create',
    'products.read',
    'products.update',
    'products.delete',
    'stock.create',
    'stock.read',
    'stock.update',
    'stock.delete',
    'suppliers.create',
    'suppliers.read',
    'suppliers.update',
    'suppliers.delete',
    'warehouses.create',
    'warehouses.read',
    'warehouses.update',
    'warehouses.delete',
    'purchase_orders.create',
    'purchase_orders.read',
    'purchase_orders.update',
    'purchase_orders.delete',
    'purchase_orders.approve',
    'reports.read',
  ],
  [USER_ROLES.MANAGER]: [
    'users.read',
    'products.create',
    'products.read',
    'products.update',
    'stock.create',
    'stock.read',
    'stock.update',
    'suppliers.create',
    'suppliers.read',
    'suppliers.update',
    'warehouses.read',
    'purchase_orders.create',
    'purchase_orders.read',
    'purchase_orders.update',
    'purchase_orders.approve',
    'reports.read',
  ],
  [USER_ROLES.STAFF]: [
    'products.read',
    'products.update',
    'stock.read',
    'stock.update',
    'suppliers.read',
    'warehouses.read',
    'purchase_orders.create',
    'purchase_orders.read',
    'purchase_orders.update',
    'reports.read',
  ],
  [USER_ROLES.VIEWER]: [
    'products.read',
    'stock.read',
    'suppliers.read',
    'warehouses.read',
    'purchase_orders.read',
    'reports.read',
  ],
};

// Purchase order statuses
export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  RECEIVED: 'received',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
} as const;

// Stock movement types
export const STOCK_MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
} as const;

// Stock movement reasons
export const STOCK_MOVEMENT_REASONS = {
  PURCHASE: 'Purchase Order Receipt',
  SALE: 'Sale',
  ADJUSTMENT: 'Stock Adjustment',
  TRANSFER: 'Warehouse Transfer',
  DAMAGE: 'Damaged Goods',
  EXPIRED: 'Expired Goods',
  THEFT: 'Theft/Loss',
  RETURN: 'Return',
} as const;

// Table pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
} as const;

// Currency
export const CURRENCY = {
  DEFAULT: 'USD',
  SYMBOL: '$',
  DECIMAL_PLACES: 2,
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
  DASHBOARD_LAYOUT: 'dashboard_layout',
} as const;

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#10B981',
  SUCCESS: '#059669',
  WARNING: '#D97706',
  ERROR: '#DC2626',
  INFO: '#0EA5E9',
  PURPLE: '#8B5CF6',
  PINK: '#EC4899',
  GRAY: '#6B7280',
} as const;

// Export all constants
export default {
  API_ENDPOINTS,
  USER_ROLES,
  ROLE_PERMISSIONS,
  PURCHASE_ORDER_STATUS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_REASONS,
  PAGINATION,
  FILE_UPLOAD,
  DATE_FORMATS,
  CURRENCY,
  NOTIFICATION_TYPES,
  THEME,
  STORAGE_KEYS,
  CHART_COLORS,
};

