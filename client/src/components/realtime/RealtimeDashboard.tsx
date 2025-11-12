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
import { DashboardData } from '../../types';

interface DashboardDataWithTimestamp extends DashboardData {
  timestamp?: string | Date;
  data?: {
    totalProducts?: number;
    productsChange?: number;
    lowStockAlerts?: number;
    alertsChange?: number;
    recentMovements?: number;
    movementsChange?: number;
    activeOrders?: number;
    ordersChange?: number;
  };
}

const RealtimeDashboard: React.FC = () => {
  const { connected, dashboardData, emitUserActivity } = useRealtime();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (dashboardData && (dashboardData as DashboardDataWithTimestamp).timestamp) {
      setLastUpdate(new Date((dashboardData as DashboardDataWithTimestamp).timestamp as string));
    }
  }, [dashboardData]);

  const handleRefresh = (): void => {
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
      color: connected ? 'success' : 'error' as 'success' | 'error',
      icon: connected ? <Wifi /> : <WifiOff />,
      text: connected ? 'Connected' : 'Disconnected'
    };
  };

  const status = getConnectionStatus();
  const data = (dashboardData as DashboardDataWithTimestamp)?.data;

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
                  {data?.totalProducts || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Total Products
                </Typography>
                {data?.productsChange !== undefined && (
                  <Chip
                    icon={data.productsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${data.productsChange > 0 ? '+' : ''}${data.productsChange}`}
                    color={data.productsChange > 0 ? 'success' : 'error'}
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
                  {data?.lowStockAlerts || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Low Stock Alerts
                </Typography>
                {data?.alertsChange !== undefined && (
                  <Chip
                    icon={data.alertsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${data.alertsChange > 0 ? '+' : ''}${data.alertsChange}`}
                    color={data.alertsChange > 0 ? 'error' : 'success'}
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
                  {data?.recentMovements || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Recent Movements
                </Typography>
                {data?.movementsChange !== undefined && (
                  <Chip
                    icon={data.movementsChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${data.movementsChange > 0 ? '+' : ''}${data.movementsChange}`}
                    color={data.movementsChange > 0 ? 'success' : 'error'}
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
                  {data?.activeOrders || 0}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Active Orders
                </Typography>
                {data?.ordersChange !== undefined && (
                  <Chip
                    icon={data.ordersChange > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${data.ordersChange > 0 ? '+' : ''}${data.ordersChange}`}
                    color={data.ordersChange > 0 ? 'success' : 'error'}
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

