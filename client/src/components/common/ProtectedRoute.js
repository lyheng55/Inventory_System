import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from 'react-i18next';

/**
 * ProtectedRoute Component
 * Protects routes based on permissions or roles
 * 
 * @param {React.Component} component - The component to render
 * @param {Array} requiredPermissions - Array of permission keys required to access
 * @param {Array} requiredRoles - Array of roles that can access (alternative to permissions)
 * @param {React.Component} fallback - Component to show if access is denied (optional)
 */
const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback = null,
}) => {
  const { checkAnyPermission, hasAnyRole, role } = usePermissions();
  const { t } = useTranslation();

  // If no restrictions, allow access
  if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
    return children;
  }

  // Check role-based access
  if (requiredRoles.length > 0) {
    if (!hasAnyRole(requiredRoles)) {
      return fallback || (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2,
          }}
        >
          <Typography variant="h5" color="error">
            {t('common.accessDenied')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('common.insufficientPermissions')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.history.back()}
          >
            {t('common.goBack')}
          </Button>
        </Box>
      );
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    if (!checkAnyPermission(requiredPermissions)) {
      return fallback || (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2,
          }}
        >
          <Typography variant="h5" color="error">
            {t('common.accessDenied')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('common.insufficientPermissions')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.history.back()}
          >
            {t('common.goBack')}
          </Button>
        </Box>
      );
    }
  }

  return children;
};

export default ProtectedRoute;

