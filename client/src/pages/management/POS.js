import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
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
  Paper,
  Pagination,
  InputAdornment,
  Alert,
  Tabs,
  Tab,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Search,
  ShoppingCart,
  Receipt,
  Print,
  QrCodeScanner,
  Payment,
  History,
  Assessment,
  Close,
  CheckCircle
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';
import BarcodeScanner from '../../components/barcode/BarcodeScanner';

const POS = () => {
  const { t } = useTranslation();
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  const [page, setPage] = useState(1);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'cash',
    paymentAmount: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading, error: warehousesError, refetch: refetchWarehouses } = useQuery(
    'warehouses',
    async () => {
      const response = await axios.get('/warehouses');
      return response.data; // API returns array directly
    },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch available products
  const { data: productsData, refetch: refetchProducts } = useQuery(
    ['availableProducts', selectedWarehouse, searchQuery],
    async () => {
      if (!selectedWarehouse) return { products: [] };
      const response = await axios.get('/sales/products/available', {
        params: {
          warehouseId: selectedWarehouse,
          search: searchQuery
        }
      });
      return response.data;
    },
    { enabled: !!selectedWarehouse }
  );

  // Fetch sales history
  const { data: salesData, isLoading: salesLoading } = useQuery(
    ['sales', page, selectedWarehouse],
    async () => {
      const params = {
        page: page.toString(),
        limit: '10',
        ...(selectedWarehouse && { warehouseId: selectedWarehouse })
      };
      const response = await axios.get('/sales', { params });
      return response.data;
    },
    { enabled: tabValue === 1 }
  );

  // Fetch daily summary
  const { data: summaryData, refetch: refetchSummary } = useQuery(
    ['dailySummary', selectedWarehouse],
    async () => {
      const params = {
        date: new Date().toISOString().split('T')[0],
        ...(selectedWarehouse && { warehouseId: selectedWarehouse })
      };
      const response = await axios.get('/sales/daily-summary', { params });
      return response.data;
    },
    { enabled: tabValue === 2 }
  );

  // Create sale mutation
  const createSaleMutation = useMutation(
    async (saleData) => {
      const response = await axios.post('/sales', saleData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['sales']);
        queryClient.invalidateQueries(['dailySummary']);
        queryClient.invalidateQueries(['availableProducts']);
        setCurrentSale(data.sale);
        setOpenCheckout(false);
        setOpenReceipt(true);
        setCart([]);
        setPaymentData({
          paymentMethod: 'cash',
          paymentAmount: 0,
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          notes: ''
        });
        setDiscountAmount(0);
        refetchProducts();
        refetchSummary();
      },
      onError: (error) => {
        console.error('Sale processing error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        });
        
        let errorMessage = 'Failed to process sale';
        
        if (error.code === 'ERR_NETWORK' || !error.response) {
          errorMessage = t('pos.networkError');
        } else if (error.response?.status === 400) {
          errorMessage = error.response?.data?.error || error.response?.data?.message || t('pos.badRequest');
        } else if (error.response?.status === 401) {
          errorMessage = t('pos.unauthorized');
        } else if (error.response?.status === 403) {
          errorMessage = t('pos.forbidden');
        } else if (error.response?.status === 500) {
          errorMessage = error.response?.data?.error || error.response?.data?.details || t('pos.serverError');
        } else {
          errorMessage = error.response?.data?.error || 
                        error.response?.data?.details || 
                        error.response?.data?.message ||
                        error.message || 
                        t('pos.saleFailed');
        }
        
        alert(`${t('pos.saleFailed')}: ${errorMessage}`);
      }
    }
  );

  // Void sale mutation
  const voidSaleMutation = useMutation(
    async ({ saleId, voidReason }) => {
      const response = await axios.post(`/sales/${saleId}/void`, { voidReason });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['sales']);
        queryClient.invalidateQueries(['dailySummary']);
        queryClient.invalidateQueries(['availableProducts']);
        refetchProducts();
        refetchSummary();
      }
    }
  );

  // Warehouses data - API returns array directly
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  
  // Debug: Log warehouses data
  useEffect(() => {
    console.log('Warehouses Debug:', {
      warehousesData,
      isArray: Array.isArray(warehousesData),
      warehouses,
      warehousesLength: warehouses.length,
      loading: warehousesLoading,
      error: warehousesError
    });
  }, [warehousesData, warehouses, warehousesLoading, warehousesError]);
  
  const products = productsData?.products || [];
  const sales = salesData?.sales || [];
  const summary = summaryData?.summary;

  // Calculate cart totals
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discountAmount;
  };

  // Add product to cart
  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.availableQuantity) {
        alert(t('pos.insufficientStock'));
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.availableQuantity <= 0) {
        alert(t('pos.productOutOfStock'));
        return;
      }
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        unitPrice: product.unitPrice,
        quantity: 1,
        discount: 0,
        availableQuantity: product.availableQuantity
      }]);
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = (product) => {
    if (product) {
      // Find product in available products
        const availableProduct = products.find(p => p.id === product.id);
        if (availableProduct) {
          handleAddToCart(availableProduct);
        } else {
          alert(t('pos.productOutOfStock'));
        }
    }
  };

  // Update cart item quantity
  const handleUpdateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
          return null;
        }
        if (newQuantity > item.availableQuantity) {
          alert(t('pos.insufficientStock'));
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove item from cart
  const handleRemoveItem = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Update item discount
  const handleUpdateDiscount = (productId, discount) => {
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, discount: parseFloat(discount) || 0 }
        : item
    ));
  };

  // Process checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert(t('pos.cartIsEmptyAlert'));
      return;
    }

    if (!selectedWarehouse) {
      alert(t('pos.selectWarehouseAlert'));
      return;
    }

    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();

    // Validate cart items
    const invalidItems = cart.filter(item => 
      !item.productId || 
      !item.quantity || 
      item.quantity <= 0 || 
      !item.unitPrice || 
      isNaN(item.unitPrice) ||
      isNaN(item.quantity)
    );

    if (invalidItems.length > 0) {
      alert(t('pos.invalidCartItems'));
      console.error('Invalid cart items:', invalidItems);
      return;
    }

    const saleData = {
      warehouseId: parseInt(selectedWarehouse),
      items: cart.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discount: parseFloat(item.discount || 0),
        totalPrice: parseFloat((item.unitPrice * item.quantity) - (item.discount || 0))
      })),
      subtotal: parseFloat(subtotal) || 0,
      taxAmount: parseFloat(tax) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      totalAmount: parseFloat(total) || 0,
      paymentMethod: paymentData.paymentMethod || 'cash',
      paymentAmount: parseFloat(paymentData.paymentAmount || total) || 0,
      customerName: paymentData.customerName || '',
      customerEmail: paymentData.customerEmail || '',
      customerPhone: paymentData.customerPhone || '',
      notes: paymentData.notes || ''
    };

    // Log sale data for debugging
    console.log('Processing sale with data:', saleData);

    createSaleMutation.mutate(saleData);
  };

  // Handle void sale
  const handleVoidSale = (saleId) => {
    const voidReason = prompt(t('pos.enterVoidReason'));
    if (voidReason) {
      if (window.confirm(t('pos.confirmVoidSale'))) {
        voidSaleMutation.mutate({ saleId, voidReason });
      }
    }
  };

  // Print receipt
  const handlePrintReceipt = () => {
    if (currentSale) {
      window.print();
    }
  };

  // Get receipt data
  const fetchReceipt = async (saleId) => {
    try {
      const response = await axios.get(`/sales/${saleId}/receipt`);
      return response.data.receipt;
    } catch (error) {
      console.error('Error fetching receipt:', error);
      return null;
    }
  };

  useEffect(() => {
    if (openReceipt && currentSale) {
      // Receipt will be displayed from currentSale
    }
  }, [openReceipt, currentSale]);

  useEffect(() => {
    // Update payment amount when total changes
    if (openCheckout) {
      setPaymentData(prev => ({
        ...prev,
        paymentAmount: calculateTotal()
      }));
    }
  }, [cart, discountAmount, taxRate, openCheckout]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('pos.title')}
        </Typography>
        <Box>
          <FormControl sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel>{t('pos.warehouse')}</InputLabel>
            <Select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setCart([]);
                refetchProducts();
              }}
              label={t('pos.warehouse')}
              disabled={warehousesLoading}
              displayEmpty
            >
              {warehousesLoading ? (
                <MenuItem disabled value="">
                  <em>{t('pos.loadingWarehouses')}</em>
                </MenuItem>
              ) : warehousesError ? (
                <MenuItem disabled value="">
                  <em>{t('pos.errorLoadingWarehouses')}</em>
                </MenuItem>
              ) : warehouses.length === 0 ? (
                <MenuItem disabled value="">
                  <em>{t('pos.noWarehousesAvailable')}</em>
                </MenuItem>
              ) : (
                warehouses.map(warehouse => (
                  <MenuItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<QrCodeScanner />}
            onClick={() => setOpenScanner(true)}
            disabled={!selectedWarehouse}
          >
            {t('pos.scanBarcode')}
          </Button>
        </Box>
      </Box>

      {warehousesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('pos.errorLoadingWarehouses')}: {warehousesError.message || t('common.error')}
        </Alert>
      )}
      
      {!warehousesLoading && !warehousesError && warehouses.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('pos.noWarehousesFound')}
        </Alert>
      )}
      
      {!selectedWarehouse && warehouses.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('pos.selectWarehouse')}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, newValue) => {
        setTabValue(newValue);
        if (newValue === 1) {
          // Refetch sales when switching to history tab
        }
        if (newValue === 2) {
          // Refetch summary when switching to summary tab
        }
      }} sx={{ mb: 3 }}>
        <Tab icon={<ShoppingCart />} label={t('pos.posTab')} />
        <Tab icon={<History />} label={t('pos.salesHistory')} />
        <Tab icon={<Assessment />} label={t('pos.dailySummary')} />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Product Search and Selection */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder={t('pos.searchProductsPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
                <Grid container spacing={2}>
                  {products.map(product => (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                      <Card variant="outlined" sx={{ cursor: 'pointer' }}>
                        <CardContent>
                          <Typography variant="h6" noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            SKU: {product.sku}
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                            ${product.unitPrice.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color={product.availableQuantity > 0 ? 'success.main' : 'error.main'}>
                            {t('pos.stock')}: {product.availableQuantity} {product.unit}
                          </Typography>
                          <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => handleAddToCart(product)}
                            disabled={product.availableQuantity <= 0}
                            sx={{ mt: 1 }}
                          >
                            {t('pos.addToCart')}
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Shopping Cart */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('pos.shoppingCart')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {cart.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    {t('pos.cartIsEmpty')}
                  </Typography>
                ) : (
                  <>
                    <List>
                      {cart.map((item) => (
                        <ListItem key={item.productId} divider>
                          <ListItemText
                            primary={item.name}
                            secondary={
                              <>
                                <Typography variant="body2">
                                  ${item.unitPrice.toFixed(2)} × {item.quantity} {item.unit}
                                </Typography>
                                {item.discount > 0 && (
                                  <Typography variant="body2" color="error">
                                    {t('pos.discount')}: ${item.discount.toFixed(2)}
                                  </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                  {t('pos.stock')}: {item.availableQuantity}
                                </Typography>
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateQuantity(item.productId, -1)}
                              >
                                <Remove />
                              </IconButton>
                              <Typography>{item.quantity}</Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateQuantity(item.productId, 1)}
                                disabled={item.quantity >= item.availableQuantity}
                              >
                                <Add />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        label={t('pos.taxRate')}
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        label={t('pos.discountAmount')}
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{t('pos.subtotal')}:</Typography>
                        <Typography>${calculateSubtotal().toFixed(2)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{t('pos.tax')}:</Typography>
                        <Typography>${calculateTax().toFixed(2)}</Typography>
                      </Box>
                      {discountAmount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>{t('pos.discount')}:</Typography>
                          <Typography color="error">-${discountAmount.toFixed(2)}</Typography>
                        </Box>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">{t('pos.total')}:</Typography>
                        <Typography variant="h6">${calculateTotal().toFixed(2)}</Typography>
                      </Box>
                    </Box>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<Payment />}
                      onClick={() => setOpenCheckout(true)}
                      disabled={cart.length === 0}
                    >
                      {t('pos.checkout')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('pos.salesHistory')}
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pos.saleNumberLabel')}</TableCell>
                    <TableCell>{t('pos.date')}</TableCell>
                    <TableCell>{t('pos.warehouse')}</TableCell>
                    <TableCell>{t('pos.items')}</TableCell>
                    <TableCell>{t('pos.total')}</TableCell>
                    <TableCell>{t('pos.payment')}</TableCell>
                    <TableCell>{t('pos.status')}</TableCell>
                    <TableCell>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        {t('common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.saleNumber}</TableCell>
                        <TableCell>
                          {new Date(sale.saleDate).toLocaleString()}
                        </TableCell>
                        <TableCell>{sale.Warehouse?.name}</TableCell>
                        <TableCell>{sale.SaleItems?.length || 0}</TableCell>
                        <TableCell>${parseFloat(sale.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={sale.paymentMethod} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sale.status === 'void' ? t('pos.void') : sale.status}
                            color={sale.status === 'void' ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              const receipt = await fetchReceipt(sale.id);
                              setCurrentSale({ ...sale, receipt });
                              setOpenReceipt(true);
                            }}
                          >
                            <Receipt />
                          </IconButton>
                          {sale.status !== 'void' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleVoidSale(sale.id)}
                            >
                              <Close />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {salesData?.pagination && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={salesData.pagination.totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && summary && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('pos.todaysSummary')}
                </Typography>
                <Typography variant="h4" color="primary">
                  ${summary.totalRevenue.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pos.totalRevenue')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('pos.transactions')}
                </Typography>
                <Typography variant="h4" color="primary">
                  {summary.totalSales}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pos.totalSales')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('pos.paymentMethods')}
                </Typography>
                <Typography variant="body2">{t('pos.cash')}: {summary.paymentMethods.cash}</Typography>
                <Typography variant="body2">{t('pos.card')}: {summary.paymentMethods.card}</Typography>
                <Typography variant="body2">{t('pos.other')}: {summary.paymentMethods.other}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Checkout Dialog */}
      <Dialog open={openCheckout} onClose={() => setOpenCheckout(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('pos.checkout')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('pos.total')}: ${calculateTotal().toFixed(2)}
            </Typography>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('pos.paymentMethod')}</InputLabel>
            <Select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              label={t('pos.paymentMethod')}
            >
              <MenuItem value="cash">{t('pos.cash')}</MenuItem>
              <MenuItem value="card">{t('pos.card')}</MenuItem>
              <MenuItem value="other">{t('pos.other')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('pos.paymentAmount')}
            type="number"
            value={paymentData.paymentAmount}
            onChange={(e) => setPaymentData({ ...paymentData, paymentAmount: parseFloat(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          {paymentData.paymentAmount > calculateTotal() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('pos.change')}: ${(paymentData.paymentAmount - calculateTotal()).toFixed(2)}
            </Alert>
          )}
          <TextField
            fullWidth
            label={t('pos.customerName')}
            value={paymentData.customerName}
            onChange={(e) => setPaymentData({ ...paymentData, customerName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('pos.customerEmail')}
            type="email"
            value={paymentData.customerEmail}
            onChange={(e) => setPaymentData({ ...paymentData, customerEmail: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('pos.customerPhone')}
            value={paymentData.customerPhone}
            onChange={(e) => setPaymentData({ ...paymentData, customerPhone: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('pos.customerNotes')}
            multiline
            rows={3}
            value={paymentData.notes}
            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCheckout(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCheckout}
            disabled={createSaleMutation.isLoading || paymentData.paymentAmount < calculateTotal()}
          >
            {createSaleMutation.isLoading ? t('pos.processing') : t('pos.completeSale')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={openReceipt} onClose={() => setOpenReceipt(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>{t('pos.receipt')}</Typography>
            <IconButton onClick={() => setOpenReceipt(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentSale && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('pos.saleNumber')}{currentSale.saleNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {new Date(currentSale.saleDate).toLocaleString()}
              </Typography>
              <Divider sx={{ my: 2 }} />
              {currentSale.SaleItems?.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body1">{item.Product?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.quantity} × ${parseFloat(item.unitPrice || 0).toFixed(2)} = ${parseFloat(item.totalPrice || 0).toFixed(2)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>{t('pos.subtotal')}:</Typography>
                <Typography>${parseFloat(currentSale.subtotal || 0).toFixed(2)}</Typography>
              </Box>
              {parseFloat(currentSale.taxAmount || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{t('pos.tax')}:</Typography>
                  <Typography>${parseFloat(currentSale.taxAmount || 0).toFixed(2)}</Typography>
                </Box>
              )}
              {parseFloat(currentSale.discountAmount || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{t('pos.discount')}:</Typography>
                  <Typography>-${parseFloat(currentSale.discountAmount || 0).toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{t('pos.total')}:</Typography>
                <Typography variant="h6">${parseFloat(currentSale.totalAmount || 0).toFixed(2)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('pos.payment')}: {currentSale.paymentMethod} - ${parseFloat(currentSale.paymentAmount || 0).toFixed(2)}
              </Typography>
              {parseFloat(currentSale.changeAmount || 0) > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('pos.change')}: ${parseFloat(currentSale.changeAmount || 0).toFixed(2)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceipt(false)}>{t('common.close')}</Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrintReceipt}
          >
            {t('common.print')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={openScanner}
        onClose={() => setOpenScanner(false)}
        onProductFound={handleBarcodeScan}
        title={t('barcodes.scanProductBarcode')}
        autoUseProduct={true}
      />
    </Box>
  );
};

export default POS;

