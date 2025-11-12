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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import { useQuery } from 'react-query';
import axios from '../../utils/axios';
import { useTranslation } from 'react-i18next';
import { Warehouse, Category, Supplier } from '../../types';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ReportFilters {
  warehouseId: string;
  categoryId: string;
  supplierId: string;
  status: string;
  lowStockOnly: boolean;
  criticalOnly: boolean;
}

interface ReportType {
  id: string;
  name: string;
  icon: JSX.Element;
  color: 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'error';
}

interface ReportData {
  summary?: any;
  stocks?: any[];
  movements?: any[];
  alerts?: any[];
  items?: any[];
  orders?: any[];
  suppliers?: any[];
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string>('stock');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState<ReportFilters>({
    warehouseId: '',
    categoryId: '',
    supplierId: '',
    status: '',
    lowStockOnly: false,
    criticalOnly: false
  });
  const [exportDialog, setExportDialog] = useState<boolean>(false);

  const reportTypes: ReportType[] = [
    { id: 'stock', name: t('reports.stockLevels'), icon: <Inventory />, color: 'primary' },
    { id: 'movements', name: t('reports.stockMovements'), icon: <TrendingUp />, color: 'success' },
    { id: 'low-stock', name: t('reports.lowStockAlertsTitle'), icon: <Warning />, color: 'warning' },
    { id: 'inventory-value', name: t('reports.inventoryValuation'), icon: <Assessment />, color: 'info' },
    { id: 'purchase-orders', name: t('reports.purchaseOrders'), icon: <LocalShipping />, color: 'secondary' },
    { id: 'suppliers', name: t('reports.supplierPerformance'), icon: <People />, color: 'error' }
  ];

  // Fetch data based on selected report
  const { data: reportData, isLoading, error, refetch } = useQuery<ReportData>(
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
  const { data: warehouses } = useQuery<{ warehouses: Warehouse[] }>('warehouses', () => axios.get('/warehouses').then(res => res.data));
  const { data: categories } = useQuery<{ categories: Category[] }>('categories', () => axios.get('/categories').then(res => res.data));
  const { data: suppliers } = useQuery<{ suppliers: Supplier[] }>('suppliers', () => axios.get('/suppliers').then(res => res.data));

  const handleReportChange = (reportId: string): void => {
    setSelectedReport(reportId);
  };

  const handleFilterChange = (filterName: keyof ReportFilters, value: string | boolean): void => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleChange = (field: keyof DateRange, value: string): void => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = (): void => {
    setExportDialog(true);
  };

  const handleExportFormat = async (format: string): Promise<void> => {
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
        throw new Error(t('reports.exportFailed'));
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
      alert(t('reports.exportFailed'));
    }
  };

  const renderStockReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalProducts')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalProducts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalQuantity')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalValue')}</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.lowStockItems')}</Typography>
                <Typography variant="h4" color="warning.main">{reportData.summary?.lowStockCount || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('reports.product')}</TableCell>
                <TableCell>{t('reports.category')}</TableCell>
                <TableCell>{t('reports.warehouse')}</TableCell>
                <TableCell>{t('reports.quantity')}</TableCell>
                <TableCell>{t('reports.reorderPoint')}</TableCell>
                <TableCell>{t('reports.value')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.stocks?.map((stock: any) => (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{stock.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{stock.productSku}</Typography>
                  </TableCell>
                  <TableCell>{stock.category}</TableCell>
                  <TableCell>{stock.warehouse}</TableCell>
                  <TableCell>{stock.quantity}</TableCell>
                  <TableCell>{stock.reorderPoint}</TableCell>
                  <TableCell>${stock.totalValue?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={stock.isLowStock ? t('reports.lowStock') : t('reports.inStock')}
                      color={stock.isLowStock ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderMovementsReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalMovements')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalMovements || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.stockIn')}</Typography>
                <Typography variant="h4" color="success.main">{reportData.summary?.totalInQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.stockOut')}</Typography>
                <Typography variant="h4" color="error.main">{reportData.summary?.totalOutQuantity || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.netChange')}</Typography>
                <Typography variant="h4" color={reportData.summary?.netQuantity >= 0 ? 'success.main' : 'error.main'}>
                  {reportData.summary?.netQuantity || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.date')}</TableCell>
                <TableCell>{t('reports.product')}</TableCell>
                <TableCell>{t('reports.warehouse')}</TableCell>
                <TableCell>{t('reports.type')}</TableCell>
                <TableCell>{t('reports.quantity')}</TableCell>
                <TableCell>{t('reports.reason')}</TableCell>
                <TableCell>{t('reports.performedBy')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.movements?.map((movement: any) => (
                <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.movementDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{movement.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{movement.productSku}</Typography>
                  </TableCell>
                  <TableCell>{movement.warehouse}</TableCell>
                  <TableCell>
                    <Chip
                      label={movement.movementType}
                      color={movement.movementType === 'in' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell>{movement.reason}</TableCell>
                  <TableCell>{movement.performer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderLowStockReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalAlerts')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalAlerts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.criticalAlerts')}</Typography>
                <Typography variant="h4" color="error.main">{reportData.summary?.criticalAlerts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.estimatedCost')}</Typography>
                <Typography variant="h4">${reportData.summary?.totalEstimatedCost?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.avgDaysToReorder')}</Typography>
                <Typography variant="h4">{Math.round(reportData.summary?.averageDaysUntilReorder || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('reports.product')}</TableCell>
                <TableCell>{t('reports.category')}</TableCell>
                <TableCell>{t('reports.warehouse')}</TableCell>
                <TableCell>{t('reports.currentStock')}</TableCell>
                <TableCell>{t('reports.reorderPoint')}</TableCell>
                <TableCell>{t('reports.suggestedOrder')}</TableCell>
                <TableCell>{t('reports.estimatedCostLabel')}</TableCell>
                <TableCell>{t('reports.priority')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.alerts?.map((alert: any) => (
                <TableRow key={`${alert.productId}-${alert.warehouse}`}>
                  <TableCell>
                    <Typography variant="subtitle2">{alert.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{alert.productSku}</Typography>
                  </TableCell>
                  <TableCell>{alert.category}</TableCell>
                  <TableCell>{alert.warehouse}</TableCell>
                  <TableCell>{alert.currentStock}</TableCell>
                  <TableCell>{alert.reorderPoint}</TableCell>
                  <TableCell>{alert.suggestedOrderQuantity}</TableCell>
                  <TableCell>${alert.estimatedCost?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={alert.isCritical ? t('reports.critical') : t('reports.lowStock')}
                      color={alert.isCritical ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderInventoryValueReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalProducts')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalProducts || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.costValue')}</Typography>
                <Typography variant="h4">${reportData.summary?.totalCostValue?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.retailValue')}</Typography>
                <Typography variant="h4">${reportData.summary?.totalRetailValue?.toFixed(2) || '0.00'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.profitMargin')}</Typography>
                <Typography variant="h4">{reportData.summary?.averageProfitMargin?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('reports.product')}</TableCell>
                <TableCell>{t('reports.category')}</TableCell>
                <TableCell>{t('reports.warehouse')}</TableCell>
                <TableCell>{t('reports.quantity')}</TableCell>
                <TableCell>{t('reports.costValue')}</TableCell>
                <TableCell>{t('reports.retailValue')}</TableCell>
                <TableCell>{t('reports.profitMargin')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.items?.map((item: any) => (
                <TableRow key={`${item.productId}-${item.warehouse}`}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.productSku}</Typography>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.warehouse}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.costValue?.toFixed(2)}</TableCell>
                  <TableCell>${item.retailValue?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${item.profitMargin?.toFixed(1)}%`}
                      color={item.profitMargin > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderPurchaseOrdersReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalOrders')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalOrders || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalValue')}</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.avgOrderValue')}</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.averageOrderValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.deliveryPerformance')}</Typography>
                <Typography variant="h4">{reportData.summary?.deliveryPerformance?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('purchaseOrders.orderNumber')}</TableCell>
                <TableCell>{t('common.supplier')}</TableCell>
                <TableCell>{t('reports.warehouse')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('purchaseOrders.orderDate')}</TableCell>
                <TableCell>{t('purchaseOrders.expectedDelivery')}</TableCell>
                <TableCell>{t('common.totalAmount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.orders?.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.warehouse}</TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      color={order.status === 'received' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate ? 
                      new Date(order.expectedDeliveryDate).toLocaleDateString() : 
                      t('common.nA')
                    }
                  </TableCell>
                  <TableCell>${parseFloat(order.finalAmount || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderSuppliersReport = (): JSX.Element | null => {
    if (!reportData) return null;

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalSuppliers')}</Typography>
                <Typography variant="h4">{reportData.summary?.totalSuppliers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.activeSuppliers')}</Typography>
                <Typography variant="h4">{reportData.summary?.activeSuppliers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.avgDeliveryPerformance')}</Typography>
                <Typography variant="h4">{reportData.summary?.averageDeliveryPerformance?.toFixed(1) || '0.0'}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{t('reports.totalValue')}</Typography>
                <Typography variant="h4">${parseFloat(reportData.summary?.totalSupplierValue || 0).toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.supplier')}</TableCell>
                <TableCell>{t('reports.contact')}</TableCell>
                <TableCell>{t('reports.rating')}</TableCell>
                <TableCell>{t('reports.totalOrdersLabel')}</TableCell>
                <TableCell>{t('reports.totalValueLabel')}</TableCell>
                <TableCell>{t('reports.deliveryPerformance')}</TableCell>
                <TableCell>{t('reports.avgDeliveryTime')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.suppliers?.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{supplier.name}</Typography>
                    {supplier.contactPerson && (
                      <Typography variant="caption" color="text.secondary">{supplier.contactPerson}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{supplier.email}</Typography>
                    <br />
                    <Typography variant="caption">{supplier.phone}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${supplier.rating}/5`}
                      color={supplier.rating >= 4 ? 'success' : supplier.rating >= 3 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{supplier.totalOrders}</TableCell>
                  <TableCell>${parseFloat(supplier.totalValue || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${supplier.deliveryPerformance?.toFixed(1)}%`}
                      color={supplier.deliveryPerformance >= 90 ? 'success' : supplier.deliveryPerformance >= 70 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{supplier.averageDeliveryTime?.toFixed(1) || t('common.nA')} {t('common.days')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderReportContent = (): JSX.Element => {
    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('reports.errorLoadingReport')}: {(error as any).message}
          <Button onClick={() => refetch()} sx={{ ml: 2 }}>
            {t('reports.retry')}
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
        return renderStockReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      case 'movements':
        return renderMovementsReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      case 'low-stock':
        return renderLowStockReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      case 'inventory-value':
        return renderInventoryValueReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      case 'purchase-orders':
        return renderPurchaseOrdersReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      case 'suppliers':
        return renderSuppliersReport() || <Typography>{t('reports.selectReportToView')}</Typography>;
      default:
        return <Typography>{t('reports.selectReportToView')}</Typography>;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('reports.reportsAnalytics')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            {t('reports.exportReport')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            {t('common.print')}
          </Button>
        </Box>
      </Box>

      {/* Report Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('reports.selectReportType')}
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
            {t('reports.filtersDateRange')}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label={t('reports.startDate')}
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label={t('reports.endDate')}
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {warehouses?.warehouses && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.warehouse')}</InputLabel>
                  <Select
                    value={filters.warehouseId}
                    onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
                    label={t('common.warehouse')}
                  >
                    <MenuItem value="">{t('reports.allWarehouses')}</MenuItem>
                    {warehouses.warehouses.map((warehouse) => (
                      <MenuItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {categories?.categories && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.category')}</InputLabel>
                  <Select
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    label={t('common.category')}
                  >
                    <MenuItem value="">{t('reports.allCategories')}</MenuItem>
                    {categories.categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {suppliers?.suppliers && selectedReport === 'purchase-orders' && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.supplier')}</InputLabel>
                  <Select
                    value={filters.supplierId}
                    onChange={(e) => handleFilterChange('supplierId', e.target.value)}
                    label={t('common.supplier')}
                  >
                    <MenuItem value="">{t('reports.allSuppliers')}</MenuItem>
                    {suppliers.suppliers.map((supplier) => (
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
                  <InputLabel>{t('common.status')}</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label={t('common.status')}
                  >
                    <MenuItem value="">{t('common.allStatus')}</MenuItem>
                    <MenuItem value="draft">{t('common.draft')}</MenuItem>
                    <MenuItem value="pending">{t('common.pending')}</MenuItem>
                    <MenuItem value="approved">{t('common.approved')}</MenuItem>
                    <MenuItem value="ordered">{t('reports.ordered')}</MenuItem>
                    <MenuItem value="received">{t('common.received')}</MenuItem>
                    <MenuItem value="cancelled">{t('common.cancelled')}</MenuItem>
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
        <DialogTitle>{t('reports.exportReport')}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t('reports.chooseExportFormat')} {reportTypes.find(r => r.id === selectedReport)?.name} {t('reports.report')}:
          </Typography>
          <List>
            <ListItem button onClick={() => handleExportFormat('pdf')}>
              <ListItemIcon><Assessment /></ListItemIcon>
              <ListItemText 
                primary={t('reports.exportAsPDF')} 
                secondary={t('reports.pdfDescription')}
              />
            </ListItem>
            <ListItem button onClick={() => handleExportFormat('excel')}>
              <ListItemIcon><BarChart /></ListItemIcon>
              <ListItemText 
                primary={t('reports.exportAsExcel')} 
                secondary={t('reports.excelDescription')}
              />
            </ListItem>
            <ListItem button onClick={() => handleExportFormat('csv')}>
              <ListItemIcon><BarChart /></ListItemIcon>
              <ListItemText 
                primary={t('reports.exportAsCSV')} 
                secondary={t('reports.csvDescription')}
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>{t('common.cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;

