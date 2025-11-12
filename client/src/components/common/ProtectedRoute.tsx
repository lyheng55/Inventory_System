import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallback?: ReactNode | null;
}

/**
 * ProtectedRoute Component
 * Protects routes based on permissions or roles
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback = null,
}): JSX.Element => {
  const { checkAnyPermission, hasAnyRole } = usePermissions();
  const { t } = useTranslation();

  // If no restrictions, allow access
  if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
    return <>{children}</> as JSX.Element;
  }

  // Check role-based access
  if (requiredRoles.length > 0) {
    if (!hasAnyRole(requiredRoles)) {
      return (fallback || (
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
      )) as JSX.Element;
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    if (!checkAnyPermission(requiredPermissions)) {
      return (fallback || (
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
      )) as JSX.Element;
    }
  }

  return <>{children}</> as JSX.Element;
};

export default ProtectedRoute;
