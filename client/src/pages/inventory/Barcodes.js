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
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Search,
  QrCode,
  QrCodeScanner,
  Download,
  Print,
  Refresh,
  Clear
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import axios from '../../utils/axios';
import BarcodeScanner from '../../components/barcode/BarcodeScanner';
import BarcodeGenerator from '../../components/barcode/BarcodeGenerator';

const Barcodes = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedProduct, setedProduct] = useState(null);
  const [bulkGenerateOpen, setBulkGenerateOpen] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  const queryClient = useQueryClient();

  // Search function
  const handleSearch = () => {
    setSearch(searchQuery);
    setPage(1);
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

  // Fetch products with barcodes
  const { data: productsData, isLoading, refetch } = useQuery(
    ['products-with-barcodes', page, search],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });
      
      const response = await axios.get(`/barcodes/products?${params}`);
      return response.data;
    },
    {
      keepPreviousData: true
    }
  );

  // Bulk generate barcodes mutation
  const bulkGenerateMutation = useMutation(
    async (data) => {
      const response = await axios.post('/barcodes/bulk-generate', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setBulkResults(data);
        queryClient.invalidateQueries('products-with-barcodes');
      },
      onError: (error) => {
        console.error('Bulk generation error:', error);
      }
    }
  );

  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      await bulkGenerateMutation.mutateAsync({ type: 'code128' });
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleProductFound = (product) => {
    setedProduct(product);
    setScannerOpen(false);
  };

  const handleGenerateBarcode = (product) => {
    setedProduct(product);
    setGeneratorOpen(true);
  };

  const handleBarcodeGenerated = (barcodeData) => {
    queryClient.invalidateQueries('products-with-barcodes');
    setGeneratorOpen(false);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Barcode Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeScanner />}
            onClick={() => setScannerOpen(true)}
          >
            Scan Barcode
          </Button>
          <Button
            variant="contained"
            startIcon={<QrCode />}
            onClick={() => setBulkGenerateOpen(true)}
          >
            Bulk Generate
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} disabled={!searchQuery.trim()}>
                        <Search />
                      </IconButton>
                      {search && (
                        <IconButton onClick={handleClearSearch}>
                          <Clear />
                        </IconButton>
                      )}
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Products with Barcodes
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Barcode</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productsData?.products?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {product.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={product.sku} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {product.barcode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {product.category}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Generate/View Barcode">
                              <IconButton
                                size="small"
                                onClick={() => handleGenerateBarcode(product)}
                              >
                                <QrCode />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Barcode">
                              <IconButton
                                size="small"
                                onClick={() => downloadBarcode(product)}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print Barcode">
                              <IconButton
                                size="small"
                                onClick={() => printBarcode(product)}
                              >
                                <Print />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {productsData?.products?.length === 0 && (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No products with barcodes found
                  </Typography>
                </Box>
              )}

              {/* Pagination */}
              {productsData?.pagination && productsData.pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={productsData.pagination.pages}
                    page={page}
                    onChange={(event, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={handleProductFound}
        title="Scan Product Barcode"
      />

      {/* Barcode Generator Dialog */}
      <BarcodeGenerator
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        product={selectedProduct}
        onBarcodeGenerated={handleBarcodeGenerated}
      />

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkGenerateOpen} onClose={() => setBulkGenerateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Bulk Generate Barcodes
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This will generate barcodes for all products that don't have barcodes yet.
          </Typography>
          
          {bulkResults && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {bulkResults.message}
            </Alert>
          )}

          {bulkResults?.results && (
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Generation Results:
              </Typography>
              {bulkResults.results.map((result, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={result.success ? 'Success' : 'Failed'}
                    color={result.success ? 'success' : 'error'}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="body2">
                    {result.name} ({result.sku})
                    {result.barcode && ` - ${result.barcode}`}
                    {result.error && ` - ${result.error}`}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkGenerateOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            startIcon={bulkGenerating ? <CircularProgress size={20} /> : <QrCode />}
          >
            {bulkGenerating ? 'Generating...' : 'Generate Barcodes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Barcodes;
