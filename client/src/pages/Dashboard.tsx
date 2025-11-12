import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton
} from '@mui/material';
import {
  Inventory,
  Warning,
  TrendingUp,
  ShoppingCart,
  Notifications,
  Refresh
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '../utils/axios';
import RealtimeDashboard from '../components/realtime/RealtimeDashboard';
import RealtimeStockUpdates from '../components/realtime/RealtimeStockUpdates';

interface DashboardData {
  totalProducts: number;
  lowStockAlerts: Array<{
    productName: string;
    currentStock: number;
    reorderPoint: number;
    critical: boolean;
  }>;
  recentMovements: Array<{
    Product?: {
      name: string;
    };
    movementType: string;
    quantity: number;
  }>;
}

interface Stat {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'error' | 'success' | 'info';
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, refetch } = useQuery<DashboardData>(
    'dashboard',
    async () => {
      const [productsRes, stockRes] = await Promise.all([
        axios.get('/products?limit=5'),
        axios.get('/stock/alerts/low-stock'),
      ]);

      return {
        totalProducts: productsRes.data.pagination.totalItems,
        lowStockAlerts: stockRes.data.alerts,
        recentMovements: stockRes.data.movements
      };
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const stats: Stat[] = [
    {
      title: t('dashboard.totalProducts'),
      value: dashboardData?.totalProducts || 0,
      icon: <Inventory />,
      color: 'primary'
    },
    {
      title: t('dashboard.lowStockAlerts'),
      value: dashboardData?.lowStockAlerts?.length || 0,
      icon: <Warning />,
      color: 'error'
    },
    {
      title: t('dashboard.recentMovements'),
      value: dashboardData?.recentMovements?.length || 0,
      icon: <TrendingUp />,
      color: 'success'
    },
    {
      title: t('dashboard.activeOrders'),
      value: 0, // This would come from purchase orders API
      icon: <ShoppingCart />,
      color: 'info'
    }
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>{t('dashboard.loadingDashboard')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('dashboard.title')}
        </Typography>
        <IconButton onClick={() => refetch()}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Real-time Dashboard */}
      <RealtimeDashboard />

      {/* Real-time Stock Updates */}
      <RealtimeStockUpdates />

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: `${stat.color}.main` }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Low Stock Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.lowStockAlerts')}
              </Typography>
              {dashboardData?.lowStockAlerts && dashboardData.lowStockAlerts.length > 0 ? (
                <List>
                  {dashboardData.lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.productName}
                        secondary={`${alert.currentStock} ${t('dashboard.remaining')} (${t('dashboard.reorder')}: ${alert.reorderPoint})`}
                      />
                      <Chip
                        label={alert.critical ? t('dashboard.critical') : t('dashboard.low')}
                        color={alert.critical ? 'error' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  {t('dashboard.noLowStockAlerts')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Stock Movements */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.recentMovements')}
              </Typography>
              {dashboardData?.recentMovements && dashboardData.recentMovements.length > 0 ? (
                <List>
                  {dashboardData.recentMovements.slice(0, 5).map((movement, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <TrendingUp color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={movement.Product?.name || t('common.noData')}
                        secondary={`${movement.movementType} - ${movement.quantity} ${t('dashboard.units')}`}
                      />
                      <Chip
                        label={movement.movementType}
                        color={movement.movementType === 'in' ? 'success' : 'error'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  {t('dashboard.noRecentMovements')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.quickActions')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/products')}
                  >
                    <Inventory sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1">{t('dashboard.addProduct')}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/purchase-orders')}
                  >
                    <ShoppingCart sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="subtitle1">{t('dashboard.createOrder')}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/reports')}
                  >
                    <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="subtitle1">{t('dashboard.stockReport')}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/stock')}
                  >
                    <Notifications sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="subtitle1">{t('dashboard.viewAlerts')}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

