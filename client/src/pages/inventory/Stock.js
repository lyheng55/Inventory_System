import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Warning,
  Inventory
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';

const Stock = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [movementType, setMovementType] = useState('adjustment');
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    quantity: '',
    reason: '',
    notes: '',
    location: ''
  });

  const queryClient = useQueryClient();

  const { data: stockDataRaw, isLoading } = useQuery(
    ['stock', page, search, warehouseFilter, lowStockFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(warehouseFilter && { warehouseId: warehouseFilter }),
        ...(lowStockFilter && { lowStock: 'true' })
      });

      const response = await axios.get(`/stock?${params}`);
      return response.data;
    }
  );

  // Ensure stockData.stocks is always an array
  const stockData = stockDataRaw && stockDataRaw.stocks
    ? { ...stockDataRaw, stocks: Array.isArray(stockDataRaw.stocks) ? stockDataRaw.stocks : [] }
    : { stocks: [] };

  const { data: productsData } = useQuery(
    'products',
    async () => {
      const response = await axios.get('/products?limit=1000');
      return response.data?.products || [];
    }
  );

  // Ensure products is always an array
  const products = Array.isArray(productsData) ? productsData : [];

  const { data: warehousesData } = useQuery(
    'warehouses',
    async () => {
      const response = await axios.get('/warehouses');
      return response.data || [];
    }
  );

  // Ensure warehouses is always an array
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  const { data: lowStockAlertsData } = useQuery(
    'lowStockAlerts',
    async () => {
      const response = await axios.get('/stock/alerts/low-stock');
      return response.data?.alerts || [];
    }
  );

  // Ensure lowStockAlerts is always an array
  const lowStockAlerts = Array.isArray(lowStockAlertsData) ? lowStockAlertsData : [];

  const adjustStockMutation = useMutation(
    (stockData) => axios.post('/stock/adjust', stockData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stock');
        queryClient.invalidateQueries('lowStockAlerts');
        setOpenDialog(false);
        resetForm();
        alert('Stock adjusted successfully!');
      },
      onError: (error) => {
        console.error('Adjust stock error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response,
          config: error.config
        });
        
        let errorMessage = 'Failed to adjust stock: ';
        if (error.code === 'ECONNABORTED') {
          errorMessage += 'Request timeout. Please try again.';
        } else if (error.code === 'ERR_NETWORK' || !error.response) {
          errorMessage += 'Network error. Please check if the server is running.';
        } else if (error.response?.data?.error) {
          errorMessage += error.response.data.error;
        } else if (error.response?.data?.details) {
          errorMessage += error.response.data.details;
        } else {
          errorMessage += error.message || 'Unknown error occurred';
        }
        
        alert(errorMessage);
      }
    }
  );

  const transferStockMutation = useMutation(
    (transferData) => axios.post('/stock/transfer', transferData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stock');
        queryClient.invalidateQueries('lowStockAlerts');
        setOpenDialog(false);
        resetForm();
        alert('Stock transferred successfully!');
      },
      onError: (error) => {
        console.error('Transfer stock error:', error);
        alert('Failed to transfer stock: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const resetForm = () => {
    setFormData({
      productId: '',
      warehouseId: '',
      quantity: '',
      reason: '',
      notes: '',
      location: ''
    });
  };

  const handleOpenDialog = (type = 'adjustment') => {
    setMovementType(type);
    resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.productId || !formData.warehouseId || !formData.quantity) {
      alert('Please fill in all required fields (Product, Warehouse, Quantity)');
      return;
    }

    //itional validation for empty strings
    if (formData.productId === '' || formData.warehouseId === '' || formData.quantity === '') {
      alert('Please select a product, warehouse, and enter a quantity');
      return;
    }

    if (movementType === 'transfer' && !formData.toWarehouseId) {
      alert('Please select destination warehouse for transfer');
      return;
    }

    // Parse and validate numeric values
    const productId = parseInt(formData.productId);
    const warehouseId = parseInt(formData.warehouseId);
    const quantity = parseInt(formData.quantity);

    if (isNaN(productId) || isNaN(warehouseId) || isNaN(quantity)) {
      alert('Please ensure Product, Warehouse, and Quantity are valid numbers');
      return;
    }

    const stockData = {
      productId,
      warehouseId,
      quantity,
      reason: formData.reason || '',
      notes: formData.notes || '',
      location: formData.location || ''
    };


    if (movementType === 'transfer') {
      transferStockMutation.mutate(stockData);
    } else {
      adjustStockMutation.mutate(stockData);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>{t('stock.loadingStockData')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('stock.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TrendingUp />}
            onClick={() => handleOpenDialog('adjustment')}
          >
            {t('stock.adjustStock')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => handleOpenDialog('transfer')}
          >
            {t('stock.transfer')}
          </Button>
        </Box>
      </Box>

      {/* Low Stock Alerts */}
      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('dashboard.lowStockAlerts')} ({lowStockAlerts.length})
          </Typography>
          {lowStockAlerts.slice(0, 3).map((alert, index) => (
            <Typography key={index} variant="body2">
              • {alert.productName} - {alert.currentStock} {t('dashboard.remaining')} ({t('dashboard.reorder')}: {alert.reorderPoint})
            </Typography>
          ))}
          {lowStockAlerts.length > 3 && (
            <Typography variant="body2">
              ... {t('common.and')} {lowStockAlerts.length - 3} {t('common.more')}
            </Typography>
          )}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('stock.searchProducts')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('warehouses.title')}</InputLabel>
                <Select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  label={t('warehouses.title')}
                >
                  <MenuItem value="">{t('common.all')} {t('warehouses.title')}</MenuItem>
                  {warehouses?.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant={lowStockFilter ? 'contained' : 'outlined'}
                startIcon={<Warning />}
                onClick={() => setLowStockFilter(!lowStockFilter)}
                fullWidth
              >
                {t('products.lowStockFilter')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('products.title')}</TableCell>
                <TableCell>{t('products.sku')}</TableCell>
                <TableCell>{t('warehouses.title')}</TableCell>
                <TableCell>{t('stock.location')}</TableCell>
                <TableCell>{t('common.quantity')}</TableCell>
                <TableCell>{t('stock.available')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockData?.stocks?.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{stock.Product?.name}</Typography>
                  </TableCell>
                  <TableCell>{stock.Product?.sku}</TableCell>
                  <TableCell>{stock.Warehouse?.name}</TableCell>
                  <TableCell>{stock.location || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory />
                      {stock.quantity}
                    </Box>
                  </TableCell>
                  <TableCell>{stock.availableQuantity}</TableCell>
                  <TableCell>
                    <Chip
                      label={stock.quantity <= stock.Product?.reorderPoint ? t('stock.lowStock') : t('stock.inStock')}
                      color={stock.quantity <= stock.Product?.reorderPoint ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <TrendingUp />
                    </IconButton>
                    <IconButton size="small">
                      <TrendingDown />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Pagination */}
      {stockData?.pagination && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={stockData.pagination.totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Stock Movement Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {movementType === 'transfer' ? t('stock.transfer') : t('stock.adjustStock')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>{t('products.title')}</InputLabel>
                  <Select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    label={t('products.title')}
                  >
                    {products?.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>{t('warehouses.title')}</InputLabel>
                  <Select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    label={t('warehouses.title')}
                  >
                    {warehouses?.map((warehouse) => (
                      <MenuItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {movementType === 'transfer' && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('stock.toWarehouse')}</InputLabel>
                    <Select
                      value={formData.toWarehouseId || ''}
                      onChange={(e) => setFormData({ ...formData, toWarehouseId: e.target.value })}
                      label={t('stock.toWarehouse')}
                    >
                      {warehouses?.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('common.quantity')}
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  helperText={movementType === 'adjustment' ? t('stock.adjustmentHelper') : t('stock.transferHelper')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('stock.location')}
                  name="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  helperText={t('stock.locationHelper')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('stock.reason')}
                  name="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('common.notes')}
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {movementType === 'transfer' ? t('stock.transfer') : t('stock.adjustment')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Stock;
