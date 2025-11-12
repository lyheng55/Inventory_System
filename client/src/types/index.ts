// Type definitions for the application

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'inventory_manager' | 'sales_staff' | 'auditor';
  isActive?: boolean;
  lastLogin?: string | Date;
  warehouses?: Warehouse[];
}

export interface Warehouse {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  capacity?: number | null;
  managerId?: number | null;
  isActive?: boolean;
  manager?: User;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (profileData: ProfileData) => Promise<AuthResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
}

export interface Notification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string | Date;
  data?: any;
}

export interface StockUpdate {
  productId: number;
  warehouseId: number;
  quantity: number;
  type: string;
  timestamp: string | Date;
}

export interface DashboardData {
  [key: string]: any;
}

export interface RealtimeContextType {
  socket: any | null; // Socket.IO client type
  connected: boolean;
  notifications: Notification[];
  stockUpdates: StockUpdate[];
  dashboardData: DashboardData | null;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
  joinWarehouse: (warehouseId: number) => void;
  leaveWarehouse: (warehouseId: number) => void;
  emitUserActivity: (activity: string, details?: any) => void;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  unitPrice: number;
  costPrice: number;
  unit: string;
  barcode?: string;
  qrCode?: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  expiryDate?: string | Date;
  isPerishable: boolean;
  isActive: boolean;
  image?: string;
  Category?: Category;
  totalStock?: number;
  isLowStock?: boolean;
}

export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  unitPrice: string;
  costPrice: string;
  unit: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  isPerishable: boolean;
  image?: string;
}

export interface Unit {
  id: number;
  name: string;
  displayName?: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  expiryDate?: string | null;
  batchNumber?: string | null;
  receivedQuantity?: number;
  totalPrice?: number;
  productName?: string;
  productSku?: string;
  Product?: Product;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  warehouseId: number;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  orderDate: string | Date;
  expectedDeliveryDate?: string | Date;
  finalAmount?: number;
  notes?: string;
  Supplier?: Supplier;
  Warehouse?: Warehouse;
  PurchaseOrderItems?: PurchaseOrderItem[];
}

export interface PurchaseOrderFormData {
  supplierId: string;
  warehouseId: string;
  expectedDeliveryDate: string;
  notes: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItemFormData {
  productId: string;
  quantity: string;
  unitPrice: string;
  expiryDate: string;
  batchNumber: string;
}

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  availableQuantity: number;
}

export interface PaymentData {
  paymentMethod: 'cash' | 'card' | 'other';
  paymentAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

export interface SaleItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  Product?: Product;
}

export interface Sale {
  id: number;
  saleNumber: string;
  warehouseId: number;
  saleDate: string | Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  status: string;
  Warehouse?: Warehouse;
  SaleItems?: SaleItem[];
  receipt?: any;
}

export interface DailySummary {
  totalRevenue: number;
  totalSales: number;
  paymentMethods: {
    cash: number;
    card: number;
    other: number;
  };
}

export interface Permission {
  id: number;
  name: string;
  displayName?: string;
  key: string;
  category?: string;
  description?: string;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  granted?: boolean;
  source?: 'user' | 'role' | 'none';
  Permission?: Permission;
}

export interface Role {
  id: number;
  name: string;
  displayName?: string;
}

export interface UserPermission {
  id?: number;
  permissionId?: number;
  userId?: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  granted?: boolean;
  source?: 'user' | 'role';
  Permission?: Permission;
}

export interface RolePermission {
  id?: number;
  permissionId?: number;
  role?: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  Permission?: Permission;
}

export interface AvailableProduct extends Product {
  availableQuantity: number;
}

export interface SalesResponse {
  sales: Sale[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface SummaryResponse {
  summary: DailySummary;
}

export interface AuditLog {
  id: number;
  userId?: number;
  user?: User;
  action: string;
  entity: string;
  entityId?: number;
  status: 'success' | 'failure' | 'error';
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  errorMessage?: string;
  metadata?: any;
  createdAt: string | Date;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export interface AuditStats {
  summary: {
    total: number;
    successRate: number;
    failure: number;
    error: number;
  };
}

export interface Backup {
  filename: string;
  size: number;
  sizeFormatted: string;
  created: string | Date;
  modified: string | Date;
}

export interface BackupsResponse {
  backups: Backup[];
}

export interface BackupStats {
  count: number;
  totalSize: number;
  totalSizeFormatted: string;
  newest?: string | Date;
  oldest?: string | Date;
}

export interface BackupOptions {
  compress: boolean;
  includeData: boolean;
}

export interface RestoreOptions {
  dropDatabase: boolean;
  createDatabase: boolean;
}

