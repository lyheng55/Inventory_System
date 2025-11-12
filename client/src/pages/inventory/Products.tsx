import React, { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
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
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';
import FileUpload from '../../components/forms/FileUpload';
import BarcodeGenerator from '../../components/barcode/BarcodeGenerator';
import { Product, ProductFormData, Category, Unit, ProductsResponse } from '../../types';

const Products: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(''); // Separate state for the input
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [barcodeGeneratorOpen, setBarcodeGeneratorOpen] = useState<boolean>(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
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

  // Generate unique SKU in format PROD-SKU-000001
  const generateSKU = async (): Promise<string> => {
    try {
      // Fetch all products to find the highest SKU number
      // Use a large limit to get all products
      const response = await axios.get('/products?limit=10000&page=1');
      const products = response.data?.products || [];
      
      // Find the maximum SKU number
      let maxNumber = 0;
      products.forEach((product: Product) => {
        if (product.sku && product.sku.startsWith('PROD-SKU-')) {
          const numberPart = product.sku.replace('PROD-SKU-', '');
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      });
      
      // Increment and format with leading zeros
      const nextNumber = maxNumber + 1;
      return `PROD-SKU-${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating SKU:', error);
      // Fallback: start from 1 if API call fails
      return `PROD-SKU-000001`;
    }
  };

  // Search function
  const handleSearch = (): void => {
    setSearch(searchQuery);
    setPage(1); // Reset to first page when searching
  };

  // Clear search function
  const handleClearSearch = (): void => {
    setSearchQuery('');
    setSearch('');
    setPage(1);
  };

  // Handle Enter key press
  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const { data: productsData, isLoading } = useQuery<ProductsResponse>(
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

  const { data: categories } = useQuery<Category[]>(
    'categories',
    async () => {
      const response = await axios.get('/categories');
      return response.data;
    }
  );

  // Fetch units from database
  const { data: unitsData } = useQuery<Unit[]>(
    'units',
    async () => {
      try {
        const response = await axios.get('/units');
        // The API returns an array of units
        if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.warn('Failed to fetch units from database:', error);
        return [];
      }
    },
    {
      initialData: []
    }
  );

  // Ensure units is always an array
  const units = Array.isArray(unitsData) ? unitsData : [];

  // Set default unit when units are loaded (only for new products)
  useEffect(() => {
    if (units.length > 0 && !editingProduct && !formData.unit) {
      // Try to find 'pcs' first, otherwise use the first unit
      const defaultUnit = units.find(u => u.name === 'pcs') || units[0];
      if (defaultUnit) {
        setFormData(prev => ({ ...prev, unit: defaultUnit.name }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.length, editingProduct]);

  const createProductMutation = useMutation(
    (productData: Partial<Product>) => axios.post('/products', productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        setOpenDialog(false);
        resetForm();
      }
    }
  );

  const updateProductMutation = useMutation(
    ({ id, productData }: { id: number; productData: Partial<Product> }) => axios.put(`/products/${id}`, productData),
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
    (id: number) => axios.delete(`/products/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
      }
    }
  );

  const resetForm = (): void => {
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

  const handleOpenDialog = async (product: Product | null = null): Promise<void> => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId.toString(),
        unitPrice: product.unitPrice.toString(),
        costPrice: product.costPrice.toString(),
        unit: product.unit,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        reorderPoint: product.reorderPoint,
        isPerishable: product.isPerishable
      });
    } else {
      resetForm();
      // Auto-generate SKU for new products
      const newSKU = await generateSKU();
      setFormData(prev => ({
        ...prev,
        sku: newSKU
      }));
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const productData = {
      ...formData,
      unitPrice: parseFloat(formData.unitPrice),
      costPrice: parseFloat(formData.costPrice),
      minStockLevel: parseInt(formData.minStockLevel.toString()),
      maxStockLevel: parseInt(formData.maxStockLevel.toString()),
      reorderPoint: parseInt(formData.reorderPoint.toString()),
      categoryId: parseInt(formData.categoryId)
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleDelete = (product: Product): void => {
    if (window.confirm(t('products.confirmDelete', { name: product.name }))) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleGenerateBarcode = (product: Product): void => {
    setSelectedProductForBarcode(product);
    setBarcodeGeneratorOpen(true);
  };

  const handleBarcodeGenerated = (): void => {
    queryClient.invalidateQueries('products');
    setBarcodeGeneratorOpen(false);
  };

  const downloadBarcode = async (product: Product): Promise<void> => {
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

  const printBarcode = async (product: Product): Promise<void> => {
    try {
      const response = await axios.post(`/barcodes/generate/${product.id}`, {
        type: 'code128',
        format: 'svg'
      });

      if (response.data.success) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
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
      }
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('products.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          {t('products.addProduct')}
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('products.searchProducts')}
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                <InputLabel>{t('products.category')}</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label={t('products.category')}
                >
                  <MenuItem value="">{t('common.all')} {t('products.category')}</MenuItem>
                  {categories?.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
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
                {t('products.lowStockFilter')}
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
                <TableCell>{t('products.image')}</TableCell>
                <TableCell>{t('products.sku')}</TableCell>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('products.category')}</TableCell>
                <TableCell>{t('products.price')}</TableCell>
                <TableCell>{t('products.stock')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
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
                          (e.target as HTMLImageElement).style.display = 'none';
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
                      label={product.isLowStock ? t('stock.lowStock') : t('stock.inStock')}
                      color={product.isLowStock ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(product)}
                        title={t('products.editProduct')}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(product)}
                        title={t('common.delete')}
                      >
                        <Delete />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleGenerateBarcode(product)}
                        title={t('products.generateBarcode')}
                      >
                        <QrCode />
                      </IconButton>
                      {product.barcode && (
                        <>
                          <IconButton 
                            size="small" 
                            onClick={() => downloadBarcode(product)}
                            title={t('common.download')}
                          >
                            <Download />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => printBarcode(product)}
                            title={t('common.print')}
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
          {editingProduct ? t('products.editProduct') : t('products.addProduct')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.sku')}
                  name="sku"
                  value={formData.sku}
                  disabled
                  required
                  helperText={editingProduct ? t('products.skuReadOnly') : t('products.skuAutoGenerated')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('products.unit')}</InputLabel>
                  <Select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    label={t('products.unit')}
                    disabled={units.length === 0}
                  >
                    {units.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>Loading units...</em>
                      </MenuItem>
                    ) : (
                      units.map((unit) => (
                        <MenuItem key={unit.id} value={unit.name}>
                          {unit.displayName || unit.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('products.productName')}
                  name="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('products.description')}
                  name="description"
                  value={formData.description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('products.category')}</InputLabel>
                  <Select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    label={t('products.category')}
                  >
                    {categories?.map((category) => (
                      <MenuItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.unitPrice')}
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.costPrice')}
                  name="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, costPrice: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.reorderPoint')}
                  name="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.minStockLevel')}
                  name="minStockLevel"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('products.maxStockLevel')}
                  name="maxStockLevel"
                  type="number"
                  value={formData.maxStockLevel}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('products.image')}
                </Typography>
                <FileUpload
                  accept="image/*"
                  multiple={false}
                  maxSize={5 * 1024 * 1024} // 5MB
                  uploadType="productImage"
                  referenceId={editingProduct?.id}
                  onUpload={(data: any) => {
                    // Handle both cases: with productId (update) and without (new product)
                    if (data.imagePath) {
                      setFormData({ ...formData, image: data.imagePath });
                      if (data.product) {
                        // Product was updated, invalidate queries
                        queryClient.invalidateQueries('products');
                      }
                    }
                  }}
                  onError={(error: string) => setUploadError(error)}
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
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingProduct ? t('common.update') : t('common.create')}
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

