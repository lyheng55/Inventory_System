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
  Add,
  Search,
  Edit,
  Delete,
  QrCode,
  Inventory,
  Warning,
  Clear,
  Print,
  Download
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import axios from '../../utils/axios';
import FileUpload from '../../components/forms/FileUpload';
import BarcodeGenerator from '../../components/barcode/BarcodeGenerator';

const Products = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Separate state for the input
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [barcodeGeneratorOpen, setBarcodeGeneratorOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    unitPrice: '',
    costPrice: '',
    unit: 'pcs',
    minStockLevel: 0,
    maxStockLevel: 1000,
    reorderPoint: 10,
    isPerishable: false
  });

  const queryClient = useQueryClient();

  // Search function
  const handleSearch = () => {
    setSearch(searchQuery);
    setPage(1); // Reset to first page when searching
  };

  // Clear search function
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearch('');
    setPage(1);
  };

  // Handle Enter key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const { data: productsData, isLoading } = useQuery(
    ['products', page, search, categoryFilter, lowStockFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(lowStockFilter && { lowStock: 'true' })
      });

      const response = await axios.get(`/products?${params}`);
      return response.data;
    },
    {
      enabled: true // Keep enabled for initial load and filter changes
    }
  );

  const { data: categories } = useQuery(
    'categories',
    async () => {
      const response = await axios.get('/categories');
      return response.data;
    }
  );

  const createProductMutation = useMutation(
    (productData) => axios.post('/products', productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        setOpenDialog(false);
        resetForm();
      }
    }
  );

  const updateProductMutation = useMutation(
    ({ id, productData }) => axios.put(`/products/${id}`, productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        setOpenDialog(false);
        setEditingProduct(null);
        resetForm();
      }
    }
  );

  const deleteProductMutation = useMutation(
    (id) => axios.delete(`/products/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      categoryId: '',
      unitPrice: '',
      costPrice: '',
      unit: 'pcs',
      minStockLevel: 0,
      maxStockLevel: 1000,
      reorderPoint: 10,
      isPerishable: false
    });
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        unitPrice: product.unitPrice,
        costPrice: product.costPrice,
        unit: product.unit,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        reorderPoint: product.reorderPoint,
        isPerishable: product.isPerishable
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const productData = {
      ...formData,
      unitPrice: parseFloat(formData.unitPrice),
      costPrice: parseFloat(formData.costPrice),
      minStockLevel: parseInt(formData.minStockLevel),
      maxStockLevel: parseInt(formData.maxStockLevel),
      reorderPoint: parseInt(formData.reorderPoint)
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleDelete = (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleGenerateBarcode = (product) => {
    setSelectedProductForBarcode(product);
    setBarcodeGeneratorOpen(true);
  };

  const handleBarcodeGenerated = (barcodeData) => {
    queryClient.invalidateQueries('products');
    setBarcodeGeneratorOpen(false);
  };

  const downloadBarcode = async (product) => {
    try {
      const response = await axios.post(`/barcodes/generate/${product.id}`, {
        type: 'code128',
        format: 'svg'
      });

      if (response.data.success) {
        const link = document.createElement('a');
        link.href = `data:image/svg+xml;base64,${btoa(response.data.image)}`;
        link.download = `${product.sku}_barcode.svg`;
        link.click();
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const printBarcode = async (product) => {
    try {
      const response = await axios.post(`/barcodes/generate/${product.id}`, {
        type: 'code128',
        format: 'svg'
      });

      if (response.data.success) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Barcode - ${product.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  margin: 20px;
                }
                .barcode-container {
                  border: 1px solid #ccc;
                  padding: 20px;
                  margin: 20px auto;
                  max-width: 400px;
                }
                .product-info {
                  margin: 10px 0;
                }
                .barcode-image {
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="barcode-container">
                <h2>${product.name}</h2>
                <div class="product-info">
                  <p><strong>SKU:</strong> ${product.sku}</p>
                  <p><strong>Barcode:</strong> ${response.data.barcode}</p>
                </div>
                <div class="barcode-image">
                  ${response.data.image}
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading products...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Product
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton size="small" onClick={handleClearSearch}>
                          <Clear />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={handleSearch}
                        disabled={!searchQuery.trim()}
                        color="primary"
                      >
                        <Search />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories?.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
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
                Low Stock Only
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productsData?.products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image ? (
                      <Box
                        component="img"
                        src={`/uploads/${product.image}`}
                        alt={product.name}
                        sx={{
                          width: 50,
                          height: 50,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.300'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          backgroundColor: 'grey.200',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Inventory color="disabled" />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{product.name}</Typography>
                      {product.description && (
                        <Typography variant="caption" color="text.secondary">
                          {product.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{product.Category?.name}</TableCell>
                  <TableCell>${product.unitPrice}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory />
                      {product.totalStock || 0}
                      {product.isLowStock && (
                        <Warning color="warning" fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.isLowStock ? 'Low Stock' : 'In Stock'}
                      color={product.isLowStock ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(product)}
                        title="Edit Product"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(product)}
                        title="Delete Product"
                      >
                        <Delete />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleGenerateBarcode(product)}
                        title="Generate Barcode"
                      >
                        <QrCode />
                      </IconButton>
                      {product.barcode && (
                        <>
                          <IconButton 
                            size="small" 
                            onClick={() => downloadBarcode(product)}
                            title="Download Barcode"
                          >
                            <Download />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => printBarcode(product)}
                            title="Print Barcode"
                          >
                            <Print />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Pagination */}
      {productsData?.pagination && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={productsData.pagination.totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit"
                  name="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    label="Category"
                  >
                    {categories?.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit Price"
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cost Price"
                  name="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reorder Point"
                  name="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Min Stock Level"
                  name="minStockLevel"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Stock Level"
                  name="maxStockLevel"
                  type="number"
                  value={formData.maxStockLevel}
                  onChange={(e) => setFormData({ ...formData, maxStockLevel: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Image
                </Typography>
                <FileUpload
                  accept="image/*"
                  multiple={false}
                  maxSize={5 * 1024 * 1024} // 5MB
                  uploadType="productImage"
                  referenceId={editingProduct?.id}
                  onUpload={(data) => {
                    if (data.product) {
                      setFormData({ ...formData, image: data.imagePath });
                      queryClient.invalidateQueries('products');
                    }
                  }}
                  onError={(error) => setUploadError(error)}
                  existingFiles={editingProduct?.image ? [{ 
                    name: 'Current Image', 
                    path: editingProduct.image,
                    url: `/uploads/${editingProduct.image}`
                  }] : []}
                />
                {uploadError && (
                  <Alert severity="error" sx={{ mt: 1 }} onClose={() => setUploadError('')}>
                    {uploadError}
                  </Alert>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Barcode Generator Dialog */}
      <BarcodeGenerator
        open={barcodeGeneratorOpen}
        onClose={() => setBarcodeGeneratorOpen(false)}
        product={selectedProductForBarcode}
        onBarcodeGenerated={handleBarcodeGenerated}
      />
    </Box>
  );
};

export default Products;
