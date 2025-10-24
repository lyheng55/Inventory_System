import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Refresh,
  TrendingUp,
  TrendingDown,
  Inventory,
  Warning,
  ShoppingCart
} from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';

const RealtimeDashboard = () => {
  const { connected, dashboardData, emitUserActivity } = useRealtime();
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (dashboardData) {
      setLastUpdate(new Date(dashboardData.timestamp));
    }
  }, [dashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    emitUserActivity('dashboard-refresh', { timestamp: new Date().toISOString() });
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const getConnectionStatus = () => {
    return {
      connected,
      color: connected ? 'success' : 'error',
      icon: connected ? <Wifi /> : <WifiOff />,
      text: connected ? 'Connected' : 'Disconnected'
    };
  };

  const status = getConnectionStatus();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Real-time Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={status.icon}
              label={status.text}
              color={status.color}
              size="small"
              variant="outlined"
            />
            <Tooltip title="Refresh Dashboard">
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {isRefreshing && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Inventory color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {dashboardData?.data?.totalProducts || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Total Products
                </Typography>
                {dashboardData?.data?.productsChange && (
                  <Chip
                    icon={dashboardData.data.productsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${dashboardData.data.productsChange > 0 ? '+' : ''}${dashboardData.data.productsChange}`}
                    color={dashboardData.data.productsChange > 0 ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {dashboardData?.data?.lowStockAlerts || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Low Stock Alerts
                </Typography>
                {dashboardData?.data?.alertsChange && (
                  <Chip
                    icon={dashboardData.data.alertsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${dashboardData.data.alertsChange > 0 ? '+' : ''}${dashboardData.data.alertsChange}`}
                    color={dashboardData.data.alertsChange > 0 ? 'error' : 'success'}
                    size="small"
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {dashboardData?.data?.recentMovements || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Recent Movements
                </Typography>
                {dashboardData?.data?.movementsChange && (
                  <Chip
                    icon={dashboardData.data.movementsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${dashboardData.data.movementsChange > 0 ? '+' : ''}${dashboardData.data.movementsChange}`}
                    color={dashboardData.data.movementsChange > 0 ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <ShoppingCart color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {dashboardData?.data?.activeOrders || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Active Orders
                </Typography>
                {dashboardData?.data?.ordersChange && (
                  <Chip
                    icon={dashboardData.data.ordersChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${dashboardData.data.ordersChange > 0 ? '+' : ''}${dashboardData.data.ordersChange}`}
                    color={dashboardData.data.ordersChange > 0 ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {lastUpdate && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
          </Box>
        )}

        {!connected && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
            <Typography variant="body2" color="error.contrastText" align="center">
              ⚠️ Real-time updates are disabled. Please check your connection.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeDashboard;
