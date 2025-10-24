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
  Paper,
  Pagination,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  ShoppingCart,
  CheckCircle,
  LocalShipping,
  Visibility,
  Receipt,
  Cancel,
  ArrowBack,
  ArrowForward
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import axios from '../../utils/axios';
import FileUpload from '../../components/forms/FileUpload';

const PurchaseOrders = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDeliveryDate: '',
    notes: '',
    items: []
  });
  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    expiryDate: '',
    batchNumber: ''
  });

  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery(
    ['purchaseOrders', page, search, statusFilter, supplierFilter, warehouseFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(supplierFilter && { supplierId: supplierFilter }),
        ...(warehouseFilter && { warehouseId: warehouseFilter })
      });

      const response = await axios.get(`/purchase-orders?${params}`);
      return response.data;
    }
  );

  const { data: suppliers } = useQuery(
    'suppliers',
    async () => {
      const response = await axios.get('/suppliers');
      return response.data;
    }
  );

  const { data: warehouses } = useQuery(
    'warehouses',
    async () => {
      const response = await axios.get('/warehouses');
      return response.data;
    }
  );

  const { data: products } = useQuery(
    'products',
    async () => {
      const response = await axios.get('/products?limit=1000');
      return response.data.products;
    }
  );

  const createOrderMutation = useMutation(
    (orderData) => axios.post('/purchase-orders', orderData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        setOpenDialog(false);
        resetForm();
        alert('Purchase order created successfully!');
      },
      onError: (error) => {
        console.error('Create order error:', error);
        alert('Failed to create purchase order: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const updateOrderMutation = useMutation(
    ({ id, orderData }) => axios.put(`/purchase-orders/${id}`, orderData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        setOpenDialog(false);
        setEditingOrder(null);
        resetForm();
      }
    }
  );

  const approveOrderMutation = useMutation(
    (id) => axios.post(`/purchase-orders/${id}/approve`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
      }
    }
  );

  // const receiveOrderMutation = useMutation(
  //   ({ id, receivedItems }) => axios.post(`/api/purchase-orders/${id}/receive`, { receivedItems }),
  //   {
  //     onSuccess: () => {
  //       queryClient.invalidateQueries('purchaseOrders');
  //       queryClient.invalidateQueries('stock');
  //       setViewingOrder(null);
  //     }
  //   }
  // );

  const cancelOrderMutation = useMutation(
    (id) => axios.delete(`/purchase-orders/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      supplierId: '',
      warehouseId: '',
      expectedDeliveryDate: '',
      notes: '',
      items: []
    });
    setNewItem({
      productId: '',
      quantity: '',
      unitPrice: '',
      expiryDate: '',
      batchNumber: ''
    });
    setActiveStep(0);
    setTabValue(0);
  };

  const handleOpenDialog = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        supplierId: order.supplierId,
        warehouseId: order.warehouseId,
        expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
        notes: order.notes || '',
        items: order.PurchaseOrderItems || []
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrder(null);
    resetForm();
  };

  const handleAddItem = () => {
    if (newItem.productId && newItem.quantity && newItem.unitPrice) {
      const product = products.find(p => p.id === parseInt(newItem.productId));
      setFormData({
        ...formData,
        items: [...formData.items, {
          ...newItem,
          productId: parseInt(newItem.productId),
          quantity: parseInt(newItem.quantity),
          unitPrice: parseFloat(newItem.unitPrice),
          productName: product?.name,
          productSku: product?.sku
        }]
      });
      setNewItem({
        productId: '',
        quantity: '',
        unitPrice: '',
        expiryDate: '',
        batchNumber: ''
      });
    }
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.supplierId || !formData.warehouseId) {
      alert('Please select a supplier and warehouse');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    const orderData = {
      ...formData,
      supplierId: parseInt(formData.supplierId),
      warehouseId: parseInt(formData.warehouseId),
      items: formData.items.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        expiryDate: item.expiryDate || null,
        batchNumber: item.batchNumber || null
      }))
    };

    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'ordered': return 'primary';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Edit />;
      case 'pending': return <ShoppingCart />;
      case 'approved': return <CheckCircle />;
      case 'ordered': return <LocalShipping />;
      case 'received': return <Receipt />;
      case 'cancelled': return <Cancel />;
      default: return <ShoppingCart />;
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading purchase orders...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Purchase Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create Order
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search orders"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  label="Supplier"
                >
                  <MenuItem value="">All Suppliers</MenuItem>
                  {suppliers?.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Warehouse</InputLabel>
                <Select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  label="Warehouse"
                >
                  <MenuItem value="">All Warehouses</MenuItem>
                  {warehouses?.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order Number</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Expected Delivery</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordersData?.orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{order.orderNumber}</Typography>
                  </TableCell>
                  <TableCell>{order.Supplier?.name}</TableCell>
                  <TableCell>{order.Warehouse?.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                      icon={getStatusIcon(order.status)}
                    />
                  </TableCell>
                  <TableCell>${order.finalAmount ? parseFloat(order.finalAmount).toFixed(2) : '0.00'}</TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate ? 
                      new Date(order.expectedDeliveryDate).toLocaleDateString() : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => setViewingOrder(order)}
                    >
                      <Visibility />
                    </IconButton>
                    {['draft', 'pending'].includes(order.status) && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(order)}
                      >
                        <Edit />
                      </IconButton>
                    )}
                    {order.status === 'approved' && (
                      <IconButton 
                        size="small" 
                        onClick={() => approveOrderMutation.mutate(order.id)}
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                    {['draft', 'pending', 'approved'].includes(order.status) && (
                      <IconButton 
                        size="small" 
                        onClick={() => cancelOrderMutation.mutate(order.id)}
                      >
                        <Cancel />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Pagination */}
      {ordersData?.pagination && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={ordersData.pagination.totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Create/Edit Order Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>Order Details</StepLabel>
              </Step>
              <Step>
                <StepLabel>Add Items</StepLabel>
              </Step>
              <Step>
                <StepLabel>Review & Submit</StepLabel>
              </Step>
            </Stepper>

            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Supplier</InputLabel>
                    <Select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      label="Supplier"
                    >
                      {suppliers?.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Warehouse</InputLabel>
                    <Select
                      value={formData.warehouseId}
                      onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                      label="Warehouse"
                    >
                      {warehouses?.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expected Delivery Date"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Attach Documents (Optional)
                  </Typography>
                  <FileUpload
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple={true}
                    maxFiles={5}
                    maxSize={10 * 1024 * 1024} // 10MB
                    uploadType="document"
                    referenceId={editingOrder?.id}
                    description="Purchase order documents"
                    onUpload={(data) => {
                      console.log('Documents uploaded:', data);
                    }}
                    onError={(error) => setUploadError(error)}
                  />
                  {uploadError && (
                    <Alert severity="error" sx={{ mt: 1 }} onClose={() => setUploadError('')}>
                      {uploadError}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Add Items to Order
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={newItem.productId}
                        onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                        label="Product"
                      >
                        {products?.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Unit Price"
                      type="number"
                      step="0.01"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Expiry Date"
                      type="date"
                      value={newItem.expiryDate}
                      onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddItem}
                      sx={{ height: '56px' }}
                    >
                      Add Item
                    </Button>
                  </Grid>
                </Grid>

                {formData.items.length > 0 && (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="subtitle2">{item.productName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.productSku}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'}</TableCell>
                            <TableCell>${item.quantity && item.unitPrice ? (parseInt(item.quantity) * parseFloat(item.unitPrice)).toFixed(2) : '0.00'}</TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Review Order
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Supplier:</Typography>
                    <Typography>
                      {suppliers?.find(s => s.id === formData.supplierId)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Warehouse:</Typography>
                    <Typography>
                      {warehouses?.find(w => w.id === formData.warehouseId)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Items ({formData.items.length}):</Typography>
                    <List dense>
                      {formData.items.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`${item.productName} (${item.productSku})`}
                            secondary={`${item.quantity} × $${item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'} = $${item.quantity && item.unitPrice ? (parseInt(item.quantity) * parseFloat(item.unitPrice)).toFixed(2) : '0.00'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="h6">Total Amount:</Typography>
                      <Typography variant="h6">${calculateTotal().toFixed(2)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep(activeStep - 1)}>
                <ArrowBack /> Back
              </Button>
            )}
            {activeStep < 2 ? (
              <Button 
                variant="contained" 
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={activeStep === 0 && (!formData.supplierId || !formData.warehouseId)}
              >
                Next <ArrowForward />
              </Button>
            ) : (
              <Button type="submit" variant="contained">
                {editingOrder ? 'Update Order' : 'Create Order'}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={!!viewingOrder} onClose={() => setViewingOrder(null)} maxWidth="md" fullWidth>
        {viewingOrder && (
          <>
            <DialogTitle>
              Purchase Order: {viewingOrder.orderNumber}
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
                <Tab label="Order Details" />
                <Tab label="Items" />
                <Tab label="Actions" />
              </Tabs>

              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Status:</Typography>
                    <Chip
                      label={viewingOrder.status}
                      color={getStatusColor(viewingOrder.status)}
                      icon={getStatusIcon(viewingOrder.status)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Total Amount:</Typography>
                    <Typography variant="h6">${viewingOrder.finalAmount ? parseFloat(viewingOrder.finalAmount).toFixed(2) : '0.00'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Supplier:</Typography>
                    <Typography>{viewingOrder.Supplier?.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Warehouse:</Typography>
                    <Typography>{viewingOrder.Warehouse?.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Order Date:</Typography>
                    <Typography>{new Date(viewingOrder.orderDate).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Expected Delivery:</Typography>
                    <Typography>
                      {viewingOrder.expectedDeliveryDate ? 
                        new Date(viewingOrder.expectedDeliveryDate).toLocaleDateString() : 
                        'Not specified'
                      }
                    </Typography>
                  </Grid>
                  {viewingOrder.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Notes:</Typography>
                      <Typography>{viewingOrder.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}

              {tabValue === 1 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Received</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewingOrder.PurchaseOrderItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="subtitle2">{item.Product?.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.Product?.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${item.receivedQuantity}/${item.quantity}`}
                              color={item.receivedQuantity === item.quantity ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>${item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'}</TableCell>
                          <TableCell>${item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Available Actions
                  </Typography>
                  <Grid container spacing={2}>
                    {viewingOrder.status === 'draft' && (
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<CheckCircle />}
                          onClick={() => approveOrderMutation.mutate(viewingOrder.id)}
                        >
                          Approve Order
                        </Button>
                      </Grid>
                    )}
                    {viewingOrder.status === 'approved' && (
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Receipt />}
                          onClick={() => {
                            // This would open a receipt dialog
                            alert('Receipt processing would be implemented here');
                          }}
                        >
                          Process Receipt
                        </Button>
                      </Grid>
                    )}
                    {['draft', 'pending', 'approved'].includes(viewingOrder.status) && (
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => cancelOrderMutation.mutate(viewingOrder.id)}
                        >
                          Cancel Order
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewingOrder(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PurchaseOrders;
