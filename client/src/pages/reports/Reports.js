import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  // Table,
  // TableBody,
  // TableCell,
  // TableContainer,
  // TableHead,
  // TableRow,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  Inventory,
  Warning,
  LocalShipping,
  People,
  Download,
  Print,
  Refresh,
  BarChart
} from '@mui/icons-material';
import {useQuery} from 'react-query';
import axios from '../../utils/axios';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('stock');
  // const [tabValue, setValue] = useState(0);
  const [dateRange, set] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    warehouseId: '',
    categoryId: '',
    supplierId: '',
    status: '',
    lowStockOnly: false,
    criticalOnly: false
  });
  const [exportDialog, setExportDialog] = useState(false);

  const reportTypes = [
    { id: 'stock', name: 'Stock Levels', icon: <Inventory />, color: 'primary' },
    { id: 'movements', name: 'Stock Movements', icon: <TrendingUp />, color: 'success' },
    { id: 'low-stock', name: 'Low Stock Alerts', icon: <Warning />, color: 'warning' },
    { id: 'inventory-value', name: 'Inventory Valuation', icon: <Assessment />, color: 'info' },
    { id: 'purchase-orders', name: 'Purchase Orders', icon: <LocalShipping />, color: 'secondary' },
    { id: 'suppliers', name: 'Supplier Performance', icon: <People />, color: 'error' }
  ];

  // Fetch data based on selected report
  const { data: reportData, isLoading, error, refetch } = useQuery(
    ['report', selectedReport, dateRange, filters],
    async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.lowStockOnly && { lowStockOnly: 'true' }),
        ...(filters.criticalOnly && { criticalOnly: 'true' })
      });

      const response = await axios.get(`/reports/${selectedReport}?${params}`);
      return response.data;
    },
    {
      enabled: !!selectedReport,
      retry: 2,
      retryDelay: 1000
    }
  );

  // Fetch reference data
  const { data: warehouses } = useQuery('warehouses', () => axios.get('/warehouses').then(res => res.data));
  const { data: categories } = useQuery('categories', () => axios.get('/categories').then(res => res.data));
  const { data: suppliers } = useQuery('suppliers', () => axios.get('/suppliers').then(res => res.data));

  const handleReportChange = (reportId) => {
    setSelectedReport(reportId);
    // setValue(0);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleChange = (field, value) => {
    set(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    setExportDialog(true);
  };

  const handleExportFormat = async (format) => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.lowStockOnly && { lowStockOnly: 'true' }),
        ...(filters.criticalOnly && { criticalOnly: 'true' })
      });

      const url = `/api/reports/export/${selectedReport}/${format}?${params}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Add authorization header by using fetch first
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and create object URL
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Update link and trigger download
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(blobUrl);
      
      setExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const renderStockReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Products</Typography>
                <Typography variant="h4">{reportData.summary?.totalProducts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Quantity</Typography>
                <Typography variant="h4">{reportData.summary?.totalQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Value</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Low Stock Items</Typography>
                <Typography variant="h4" color="warning.main">{reportData.summary?.lowStockCount || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Product</leCell>
                <leCell>Category</leCell>
                <leCell>Warehouse</leCell>
                <leCell>Quantity</leCell>
                <leCell>Reorder Point</leCell>
                <leCell>Value</leCell>
                <leCell>Status</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.stocks?.map((stock) => (
                <leRow key={stock.id}>
                  <leCell>
                    <Typography variant="subtitle2">{stock.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{stock.productSku}</Typography>
                  </leCell>
                  <leCell>{stock.category}</leCell>
                  <leCell>{stock.warehouse}</leCell>
                  <leCell>{stock.quantity}</leCell>
                  <leCell>{stock.reorderPoint}</leCell>
                  <leCell>${stock.totalValue?.toFixed(2)}</leCell>
                  <leCell>
                    <Chip
                      label={stock.isLowStock ? 'Low Stock' : 'In Stock'}
                      color={stock.isLowStock ? 'warning' : 'success'}
                      size="small"
                    />
                  </leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderMovementsReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Movements</Typography>
                <Typography variant="h4">{reportData.summary?.totalMovements || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Stock In</Typography>
                <Typography variant="h4" color="success.main">{reportData.summary?.totalInQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Stock Out</Typography>
                <Typography variant="h4" color="error.main">{reportData.summary?.totalOutQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Net Change</Typography>
                <Typography variant="h4" color={reportData.summary?.netQuantity >= 0 ? 'success.main' : 'error.main'}>
                  {reportData.summary?.netQuantity || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Date</leCell>
                <leCell>Product</leCell>
                <leCell>Warehouse</leCell>
                <leCell>Type</leCell>
                <leCell>Quantity</leCell>
                <leCell>Reason</leCell>
                <leCell>Performed By</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.movements?.map((movement) => (
                <leRow key={movement.id}>
                  <leCell>{new Date(movement.movementDate).toLocaleDateString()}</leCell>
                  <leCell>
                    <Typography variant="subtitle2">{movement.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{movement.productSku}</Typography>
                  </leCell>
                  <leCell>{movement.warehouse}</leCell>
                  <leCell>
                    <Chip
                      label={movement.movementType}
                      color={movement.movementType === 'in' ? 'success' : 'error'}
                      size="small"
                    />
                  </leCell>
                  <leCell>{movement.quantity}</leCell>
                  <leCell>{movement.reason}</leCell>
                  <leCell>{movement.performer}</leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderLowStockReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Alerts</Typography>
                <Typography variant="h4">{reportData.summary?.totalAlerts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Critical Alerts</Typography>
                <Typography variant="h4" color="error.main">{reportData.summary?.criticalAlerts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Estimated Cost</Typography>
                <Typography variant="h4">${reportData.summary?.totalEstimatedCost?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Avg Days to Reorder</Typography>
                <Typography variant="h4">{Math.round(reportData.summary?.averageDaysUntilReorder || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Product</leCell>
                <leCell>Category</leCell>
                <leCell>Warehouse</leCell>
                <leCell>Current Stock</leCell>
                <leCell>Reorder Point</leCell>
                <leCell>Suggested Order</leCell>
                <leCell>Estimated Cost</leCell>
                <leCell>Priority</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.alerts?.map((alert) => (
                <leRow key={`${alert.productId}-${alert.warehouse}`}>
                  <leCell>
                    <Typography variant="subtitle2">{alert.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{alert.productSku}</Typography>
                  </leCell>
                  <leCell>{alert.category}</leCell>
                  <leCell>{alert.warehouse}</leCell>
                  <leCell>{alert.currentStock}</leCell>
                  <leCell>{alert.reorderPoint}</leCell>
                  <leCell>{alert.suggestedOrderQuantity}</leCell>
                  <leCell>${alert.estimatedCost?.toFixed(2)}</leCell>
                  <leCell>
                    <Chip
                      label={alert.isCritical ? 'Critical' : 'Low Stock'}
                      color={alert.isCritical ? 'error' : 'warning'}
                      size="small"
                    />
                  </leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderInventoryValueReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Products</Typography>
                <Typography variant="h4">{reportData.summary?.totalProducts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Cost Value</Typography>
                <Typography variant="h4">${reportData.summary?.totalCostValue?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Retail Value</Typography>
                <Typography variant="h4">${reportData.summary?.totalRetailValue?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Profit Margin</Typography>
                <Typography variant="h4">{reportData.summary?.averageProfitMargin?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Product</leCell>
                <leCell>Category</leCell>
                <leCell>Warehouse</leCell>
                <leCell>Quantity</leCell>
                <leCell>Cost Value</leCell>
                <leCell>Retail Value</leCell>
                <leCell>Profit Margin</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.items?.map((item) => (
                <leRow key={`${item.productId}-${item.warehouse}`}>
                  <leCell>
                    <Typography variant="subtitle2">{item.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.productSku}</Typography>
                  </leCell>
                  <leCell>{item.category}</leCell>
                  <leCell>{item.warehouse}</leCell>
                  <leCell>{item.quantity}</leCell>
                  <leCell>${item.costValue?.toFixed(2)}</leCell>
                  <leCell>${item.retailValue?.toFixed(2)}</leCell>
                  <leCell>
                    <Chip
                      label={`${item.profitMargin?.toFixed(1)}%`}
                      color={item.profitMargin > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderPurchaseOrdersReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Orders</Typography>
                <Typography variant="h4">{reportData.summary?.totalOrders || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Value</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Avg Order Value</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.averageOrderValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Delivery Performance</Typography>
                <Typography variant="h4">{reportData.summary?.deliveryPerformance?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Order Number</leCell>
                <leCell>Supplier</leCell>
                <leCell>Warehouse</leCell>
                <leCell>Status</leCell>
                <leCell>Order Date</leCell>
                <leCell>Expected Delivery</leCell>
                <leCell>Total Amount</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.orders?.map((order) => (
                <leRow key={order.id}>
                  <leCell>{order.orderNumber}</leCell>
                  <leCell>{order.supplier}</leCell>
                  <leCell>{order.warehouse}</leCell>
                  <leCell>
                    <Chip
                      label={order.status}
                      color={order.status === 'received' ? 'success' : 'default'}
                      size="small"
                    />
                  </leCell>
                  <leCell>{new Date(order.orderDate).toLocaleDateString()}</leCell>
                  <leCell>
                    {order.expectedDeliveryDate ? 
                      new Date(order.expectedDeliveryDate).toLocaleDateString() : 
                      'N/A'
                    }
                  </leCell>
                  <leCell>${parseFloat(order.finalAmount || 0).toFixed(2)}</leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderSuppliersReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Suppliers</Typography>
                <Typography variant="h4">{reportData.summary?.totalSuppliers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Active Suppliers</Typography>
                <Typography variant="h4">{reportData.summary?.activeSuppliers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Avg Delivery Performance</Typography>
                <Typography variant="h4">{reportData.summary?.averageDeliveryPerformance?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Value</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalSupplierValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <leContainer component={Paper}>
          <le>
            <leHead>
              <leRow>
                <leCell>Supplier</leCell>
                <leCell>Contact</leCell>
                <leCell>Rating</leCell>
                <leCell>Total Orders</leCell>
                <leCell>Total Value</leCell>
                <leCell>Delivery Performance</leCell>
                <leCell>Avg Delivery Time</leCell>
              </leRow>
            </leHead>
            <leBody>
              {reportData.suppliers?.map((supplier) => (
                <leRow key={supplier.id}>
                  <leCell>
                    <Typography variant="subtitle2">{supplier.name}</Typography>
                    {supplier.contactPerson && (
                      <Typography variant="caption" color="text.secondary">{supplier.contactPerson}</Typography>
                    )}
                  </leCell>
                  <leCell>
                    <Typography variant="caption">{supplier.email}</Typography>
                    <br />
                    <Typography variant="caption">{supplier.phone}</Typography>
                  </leCell>
                  <leCell>
                    <Chip
                      label={`${supplier.rating}/5`}
                      color={supplier.rating >= 4 ? 'success' : supplier.rating >= 3 ? 'warning' : 'error'}
                      size="small"
                    />
                  </leCell>
                  <leCell>{supplier.totalOrders}</leCell>
                  <leCell>${parseFloat(supplier.totalValue || 0).toFixed(2)}</leCell>
                  <leCell>
                    <Chip
                      label={`${supplier.deliveryPerformance?.toFixed(1)}%`}
                      color={supplier.deliveryPerformance >= 90 ? 'success' : supplier.deliveryPerformance >= 70 ? 'warning' : 'error'}
                      size="small"
                    />
                  </leCell>
                  <leCell>{supplier.averageDeliveryTime?.toFixed(1) || 'N/A'} days</leCell>
                </leRow>
              ))}
            </leBody>
          </le>
        </leContainer>
      </Box>
    );
  };

  const renderReportContent = () => {
    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading report: {error.message}
          <Button onClick={() => refetch()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    switch (selectedReport) {
      case 'stock':
        return renderStockReport();
      case 'movements':
        return renderMovementsReport();
      case 'low-stock':
        return renderLowStockReport();
      case 'inventory-value':
        return renderInventoryValueReport();
      case 'purchase-orders':
        return renderPurchaseOrdersReport();
      case 'suppliers':
        return renderSuppliersReport();
      default:
        return <Typography>Select a report to view data</Typography>;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reports & Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Report Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Report Type
          </Typography>
          <Grid container spacing={2}>
            {reportTypes.map((report) => (
              <Grid item xs={12} sm={6} md={4} key={report.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedReport === report.id ? 2 : 1,
                    borderColor: selectedReport === report.id ? `${report.color}.main` : 'divider',
                    '&:hover': { borderColor: `${report.color}.main` }
                  }}
                  onClick={() => handleReportChange(report.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: `${report.color}.main` }}>
                        {report.icon}
                      </Box>
                      <Typography variant="subtitle1">{report.name}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters & Date Range
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {warehouses && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={filters.warehouseId}
                    onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
                    label="Warehouse"
                  >
                    <MenuItem value="">All Warehouses</MenuItem>
                    {warehouses.map((warehouse) => (
                      <MenuItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {categories && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {suppliers && selectedReport === 'purchase-orders' && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Supplier</InputLabel>
                  <Select
                    value={filters.supplierId}
                    onChange={(e) => handleFilterChange('supplierId', e.target.value)}
                    label="Supplier"
                  >
                    <MenuItem value="">All Suppliers</MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {selectedReport === 'purchase-orders' && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="ordered">Ordered</MenuItem>
                    <MenuItem value="received">Received</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Card>
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderReportContent()
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Choose export format for {reportTypes.find(r => r.id === selectedReport)?.name} report:
          </Typography>
          <List>
            <ListItem button onClick={() => handleExportFormat('pdf')}>
              <ListItemIcon><Assessment /></ListItemIcon>
              <ListItemText 
                primary="Export as PDF" 
                secondary="Portable Document Format - Best for printing and sharing"
              />
            </ListItem>
            <ListItem button onClick={() => handleExportFormat('excel')}>
              <ListItemIcon><BarChart /></ListItemIcon>
              <ListItemText 
                primary="Export as Excel" 
                secondary="Microsoft Excel format - Best for data analysis"
              />
            </ListItem>
            <ListItem button onClick={() => handleExportFormat('csv')}>
              <ListItemIcon><BarChart /></ListItemIcon>
              <ListItemText 
                primary="Export as CSV" 
                secondary="Comma Separated Values - Best for data import"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
