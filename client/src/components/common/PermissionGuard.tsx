import React, { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string | string[];
  roles?: string[];
  fallback?: ReactNode | null;
}

/**
 * PermissionGuard Component
 * Conditionally renders children based on permissions
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  roles = [],
  fallback = null,
}) => {
  const { checkPermission, checkAnyPermission, hasAnyRole } = usePermissions();

  // Check role-based access
  if (roles.length > 0) {
    if (!hasAnyRole(roles)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (!checkAnyPermission(permissions)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;

