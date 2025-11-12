import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * PermissionGuard Component
 * Conditionally renders children based on permissions
 * 
 * @param {React.ReactNode} children - Content to render if permission is granted
 * @param {string|Array} permission - Permission key(s) required to show content
 * @param {Array} roles - Alternative: roles that can see the content
 * @param {React.ReactNode} fallback - Content to show if permission is denied (optional)
 */
const PermissionGuard = ({
  children,
  permission,
  roles = [],
  fallback = null,
}) => {
  const { checkPermission, checkAnyPermission, hasAnyRole } = usePermissions();

  // Check role-based access
  if (roles.length > 0) {
    if (!hasAnyRole(roles)) {
      return fallback;
    }
  }

  // Check permission-based access
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (!checkAnyPermission(permissions)) {
      return fallback;
    }
  }

  return children;
};

export default PermissionGuard;

