import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';
import {
  PERMISSIONS,
  MENU_PERMISSIONS,
} from '../config/permissions';

interface CrudPermission {
  name: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface PermissionsResponse {
  permissions?: string[];
  crud?: CrudPermission[];
  permissionsDetail?: CrudPermission[];
}

interface UsePermissionsReturn {
  permissions: string[];
  crudPermissions: CrudPermission[];
  role: string | undefined;
  loading: boolean;
  checkPermission: (permissionKey: string) => boolean;
  checkAnyPermission: (permissionList: string[]) => boolean;
  checkAllPermissions: (permissionList: string[]) => boolean;
  checkRouteAccess: (path: string) => boolean;
  hasRole: (requiredRole: string) => boolean;
  hasAnyRole: (requiredRoles: string[]) => boolean;
  canCreate: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  getCrudPermissions: (resource: string) => {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  PERMISSIONS: typeof PERMISSIONS;
}

/**
 * Custom hook for checking permissions
 * Fetches permissions from database instead of using hardcoded config
 * @returns Permission checking functions
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  const role = user?.role;
  const [userPermissions, setUserPermissions] = useState<string[]>([]); // Legacy: array of permission keys
  const [crudPermissions, setCrudPermissions] = useState<CrudPermission[]>([]); // New: array of CRUD permission objects
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch permissions from database when user changes
  useEffect(() => {
    const fetchPermissions = async (): Promise<void> => {
      if (!user || !user.id) {
        setUserPermissions([]);
        setCrudPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get<PermissionsResponse>('/auth/permissions/me');
        // Response contains:
        // - permissions: array of permission keys (legacy format)
        // - crud: array of CRUD permission objects with canCreate, canRead, canUpdate, canDelete
        setUserPermissions(response.data.permissions || []);
        setCrudPermissions(response.data.crud || response.data.permissionsDetail || []);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setUserPermissions([]);
        setCrudPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id]);

  // Get all permissions for the current user (from database)
  const permissions = useMemo(() => {
    return userPermissions;
  }, [userPermissions]);

  // Create a map of resource names to CRUD permissions for quick lookup
  const crudMap = useMemo(() => {
    const map = new Map<string, CrudPermission>();
    crudPermissions.forEach(perm => {
      map.set(perm.name, perm);
    });
    return map;
  }, [crudPermissions]);

  /**
   * Check if user has a specific permission
   * @param permissionKey - Permission key (e.g., PERMISSIONS.VIEW_POS which is 'view_pos' or 'pos' for new format)
   */
  const checkPermission = (permissionKey: string): boolean => {
    if (!user || !userPermissions.length || !permissionKey) return false;
    
    // Check if the permission key exists directly in user's permissions
    if (userPermissions.includes(permissionKey)) {
      return true;
    }
    
    // Map old permission format to new resource format
    // e.g., 'view_products' -> 'products', 'view_dashboard' -> 'dashboard'
    const permissionMappings: Record<string, string> = {
      'view_dashboard': 'dashboard',
      'view_products': 'products',
      'view_stock': 'stock',
      'view_categories': 'categories',
      'view_suppliers': 'suppliers',
      'view_warehouses': 'warehouses',
      'view_purchase_orders': 'purchase_orders',
      'view_pos': 'pos',
      'view_reports': 'reports',
      'view_analytics': 'analytics',
      'view_users': 'users',
      'view_barcodes': 'barcodes',
      'use_search': 'search',
    };
    
    // Check if permission key maps to a resource name
    const resourceName = permissionMappings[permissionKey];
    if (resourceName && userPermissions.includes(resourceName)) {
      return true;
    }
    
    // Also check CRUD permissions - if user has canRead on the resource, they have view permission
    if (resourceName) {
      const crudPerm = crudMap.get(resourceName);
      if (crudPerm && crudPerm.canRead) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Check if user has any of the specified permissions
   */
  const checkAnyPermission = (permissionList: string[]): boolean => {
    if (!user || !userPermissions.length) return false;
    return permissionList.some(permission => checkPermission(permission));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const checkAllPermissions = (permissionList: string[]): boolean => {
    if (!user || !userPermissions.length) return false;
    return permissionList.every(permission => checkPermission(permission));
  };

  /**
   * Check if user can access a specific route
   */
  const checkRouteAccess = (path: string): boolean => {
    if (!user || !userPermissions.length) return false;
    
    const requiredPermissions = MENU_PERMISSIONS[path];
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No restrictions
    }
    
    return checkAnyPermission(requiredPermissions);
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (requiredRole: string): boolean => {
    return role === requiredRole;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (requiredRoles: string[]): boolean => {
    return requiredRoles.includes(role || '');
  };

  /**
   * CRUD Permission Helpers
   */
  
  /**
   * Check if user can create a resource
   * @param resource - Resource name (e.g., 'products', 'stock')
   */
  const canCreate = (resource: string): boolean => {
    if (!resource) return false;
    const perm = crudMap.get(resource);
    return perm ? perm.canCreate : false;
  };

  /**
   * Check if user can read/view a resource
   * @param resource - Resource name (e.g., 'products', 'stock')
   */
  const canRead = (resource: string): boolean => {
    if (!resource) return false;
    const perm = crudMap.get(resource);
    return perm ? perm.canRead : false;
  };

  /**
   * Check if user can update/edit a resource
   * @param resource - Resource name (e.g., 'products', 'stock')
   */
  const canUpdate = (resource: string): boolean => {
    if (!resource) return false;
    const perm = crudMap.get(resource);
    return perm ? perm.canUpdate : false;
  };

  /**
   * Check if user can delete a resource
   * @param resource - Resource name (e.g., 'products', 'stock')
   */
  const canDelete = (resource: string): boolean => {
    if (!resource) return false;
    const perm = crudMap.get(resource);
    return perm ? perm.canDelete : false;
  };

  /**
   * Get full CRUD permissions for a resource
   * @param resource - Resource name
   * @returns Object with canCreate, canRead, canUpdate, canDelete flags
   */
  const getCrudPermissions = (resource: string): {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  } => {
    if (!resource) {
      return { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
    }
    const perm = crudMap.get(resource);
    return perm ? {
      canCreate: perm.canCreate || false,
      canRead: perm.canRead || false,
      canUpdate: perm.canUpdate || false,
      canDelete: perm.canDelete || false
    } : {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false
    };
  };

  return {
    permissions, // Legacy: array of permission keys
    crudPermissions, // New: array of CRUD permission objects
    role,
    loading,
    checkPermission, // Legacy permission check
    checkAnyPermission,
    checkAllPermissions,
    checkRouteAccess,
    hasRole,
    hasAnyRole,
    // CRUD permission helpers
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    getCrudPermissions,
    // Export PERMISSIONS for convenience
    PERMISSIONS,
  };
};

