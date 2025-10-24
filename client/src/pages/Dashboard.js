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
import axios from '../utils/axios';
import RealtimeDashboard from '../components/realtime/RealtimeDashboard';
import RealtimeStockUpdates from '../components/realtime/RealtimeStockUpdates';

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, refetch } = useQuery(
    'dashboard',
    async () => {
      const [productsRes, stockRes] = await Promise.all([
        axios.get('/products?limit=5'),
        axios.get('/stock/alerts/low-stock'),
        // axios.get('/api/stock/movements?limit=10')
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

  const stats = [
    {
      title: 'Total Products',
      value: dashboardData?.totalProducts || 0,
      icon: <Inventory />,
      color: 'primary'
    },
    {
      title: 'Low Stock Alerts',
      value: dashboardData?.lowStockAlerts?.length || 0,
      icon: <Warning />,
      color: 'error'
    },
    {
      title: 'Recent Movements',
      value: dashboardData?.recentMovements?.length || 0,
      icon: <TrendingUp />,
      color: 'success'
    },
    {
      title: 'Active Orders',
      value: 0, // This would come from purchase orders API
      icon: <ShoppingCart />,
      color: 'info'
    }
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
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
                Low Stock Alerts
              </Typography>
              {dashboardData?.lowStockAlerts?.length > 0 ? (
                <List>
                  {dashboardData.lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.productName}
                        secondary={`${alert.currentStock} remaining (Reorder: ${alert.reorderPoint})`}
                      />
                      <Chip
                        label={alert.critical ? 'Critical' : 'Low'}
                        color={alert.critical ? 'error' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No low stock alerts
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
                Recent Stock Movements
              </Typography>
              {dashboardData?.recentMovements?.length > 0 ? (
                <List>
                  {dashboardData.recentMovements.slice(0, 5).map((movement, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <TrendingUp color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={movement.Product?.name || 'Unknown Product'}
                        secondary={`${movement.movementType} - ${movement.quantity} units`}
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
                  No recent movements
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
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/products')}
                  >
                    <Inventory sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1">Add Product</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/purchase-orders')}
                  >
                    <ShoppingCart sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="subtitle1">Create Order</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/reports')}
                  >
                    <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="subtitle1">Stock Report</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate('/stock')}
                  >
                    <Notifications sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="subtitle1">View Alerts</Typography>
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
