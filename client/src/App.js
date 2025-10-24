import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { Layout, LoadingSpinner } from './components';
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
  Profile, 
  Users, 
  Search as SearchPage, 
  Barcodes 
} from './pages';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Login />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <RealtimeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={<Users />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/barcodes" element={<Barcodes />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </RealtimeProvider>
    </BrowserRouter>
  );
}

export default App;
