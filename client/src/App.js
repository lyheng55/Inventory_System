import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { Layout, LoadingSpinner } from './components';
import ProtectedRoute from './components/common/ProtectedRoute';
import { PERMISSIONS } from './config/permissions';
import { createAppTheme } from './utils/theme';
import { 
  Login, 
  Dashboard, 
  Products, 
  Stock, 
  Categories, 
  Suppliers, 
  Warehouses, 
  PurchaseOrders, 
  Reports, 
  Analytics,
  Profile, 
  Users, 
  Search as SearchPage, 
  Barcodes,
  POS,
  Permissions,
  AuditLogs,
  BackupRestore
} from './pages';

function App() {
  const { user, loading } = useAuth();
  const { i18n } = useTranslation();
  
  // Create theme with language-specific fonts
  const theme = React.useMemo(
    () => createAppTheme(i18n.language || 'en'),
    [i18n.language]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!user ? (
        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Login />
        </Box>
      ) : (
        <BrowserRouter>
          <RealtimeProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_DASHBOARD]}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/products" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_PRODUCTS]}>
                      <Products />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/stock" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_STOCK]}>
                      <Stock />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/categories" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_CATEGORIES]}>
                      <Categories />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/suppliers" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_SUPPLIERS]}>
                      <Suppliers />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/warehouses" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_WAREHOUSES]}>
                      <Warehouses />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/purchase-orders" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_PURCHASE_ORDERS]}>
                      <PurchaseOrders />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/pos" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_POS]}>
                      <POS />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_REPORTS]}>
                      <Reports />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_ANALYTICS]}>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/profile" element={<Profile />} />
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_USERS]}>
                      <Users />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/audit-logs" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_USERS]}>
                      <AuditLogs />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/permissions" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_USERS]}>
                      <Permissions />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/backup-restore" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_USERS]}>
                      <BackupRestore />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/search" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.USE_SEARCH]}>
                      <SearchPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/barcodes" 
                  element={
                    <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_BARCODES]}>
                      <Barcodes />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </RealtimeProvider>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}

export default App;
