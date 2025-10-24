import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  QrCode,
  QrCode2,
  Close,
  Download,
  Print
} from '@mui/icons-material';
import axios from '../../utils/axios';

const BarcodeGenerator = ({ open, onClose, product, onBarcodeGenerated }) => {
  const [barcodeType, setBarcodeType] = useState('code128');
  const [qrSize, setQrSize] = useState(200);
  const [generatedBarcode, setGeneratedBarcode] = useState(null);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const barcodeTypes = [
    { value: 'code128', label: 'Code 128' },
    { value: 'code39', label: 'Code 39' },
    { value: 'ean13', label: 'EAN-13' },
    { value: 'ean8', label: 'EAN-8' },
    { value: 'upc', label: 'UPC' }
  ];

  const generateBarcode = async () => {
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`/barcodes/generate/${product.id}`, {
        type: barcodeType,
        format: 'svg'
      });

      if (response.data.success) {
        setGeneratedBarcode(response.data);
        if (onBarcodeGenerated) {
          onBarcodeGenerated(response.data);
        }
      } else {
        setError('Failed to generate barcode');
      }
    } catch (err) {
      console.error('Barcode generation error:', err);
      setError(err.response?.data?.error || 'Failed to generate barcode');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`/barcodes/qrcode/${product.id}`, {
        size: qrSize
      });

      if (response.data.success) {
        setGeneratedQR(response.data);
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err) {
      console.error('QR code generation error:', err);
      setError(err.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadBarcode = () => {
    if (!generatedBarcode) return;

    const link = document.createElement('a');
    link.href = `data:image/svg+xml;base64,${btoa(generatedBarcode.image)}`;
    link.download = `${product.sku}_barcode.svg`;
    link.click();
  };

  const downloadQRCode = () => {
    if (!generatedQR) return;

    const link = document.createElement('a');
    link.href = generatedQR.qrCode;
    link.download = `${product.sku}_qrcode.png`;
    link.click();
  };

  const printBarcode = () => {
    if (!generatedBarcode) return;

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
              <p><strong>Barcode:</strong> ${generatedBarcode.barcode}</p>
            </div>
            <div class="barcode-image">
              ${generatedBarcode.image}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printQRCode = () => {
    if (!generatedQR) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${product.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin: 20px;
            }
            .qrcode-container {
              border: 1px solid #ccc;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
            }
            .product-info {
              margin: 10px 0;
            }
            .qrcode-image {
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="qrcode-container">
            <h2>${product.name}</h2>
            <div class="product-info">
              <p><strong>SKU:</strong> ${product.sku}</p>
              <p><strong>QR Code Data:</strong> ${JSON.stringify(generatedQR.data, null, 2)}</p>
            </div>
            <div class="qrcode-image">
              <img src="${generatedQR.qrCode}" alt="QR Code" style="max-width: 100%;" />
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setGeneratedBarcode(null);
    setGeneratedQR(null);
    setError('');
    onClose();
  };

  if (!product) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Generate Barcode/QR Code - {product.name}
          </Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Barcode Generation */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Barcode Generation
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Barcode Type</InputLabel>
                  <Select
                    value={barcodeType}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    label="Barcode Type"
                  >
                    {barcodeTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={generateBarcode}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <QrCode />}
                  sx={{ mb: 2 }}
                >
                  {loading ? 'Generating...' : 'Generate Barcode'}
                </Button>

                {generatedBarcode && (
                  <Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Generated Barcode:
                    </Typography>
                    <Box 
                      sx={{ 
                        border: '1px solid #ccc', 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'white',
                        mb: 2
                      }}
                      dangerouslySetInnerHTML={{ __html: generatedBarcode.image }}
                    />
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={downloadBarcode}
                      >
                        Download
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Print />}
                        onClick={printBarcode}
                      >
                        Print
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* QR Code Generation */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  QR Code Generation
                </Typography>
                
                <TextField
                  fullWidth
                  label="QR Code Size"
                  type="number"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value) || 200)}
                  sx={{ mb: 2 }}
                  inputProps={{ min: 100, max: 500 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={generateQRCode}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <QrCode2 />}
                  sx={{ mb: 2 }}
                >
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </Button>

                {generatedQR && (
                  <Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Generated QR Code:
                    </Typography>
                    <Box 
                      sx={{ 
                        border: '1px solid #ccc', 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'white',
                        mb: 2
                      }}
                    >
                      <img 
                        src={generatedQR.qrCode} 
                        alt="QR Code" 
                        style={{ maxWidth: '100%' }}
                      />
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={downloadQRCode}
                      >
                        Download
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Print />}
                        onClick={printQRCode}
                      >
                        Print
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Product Info */}
        <Card sx={{ mt: 2, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Product Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Name:</strong> {product.name}
                </Typography>
                <Typography variant="body2">
                  <strong>SKU:</strong> {product.sku}
                </Typography>
                <Typography variant="body2">
                  <strong>Current Barcode:</strong> {product.barcode || 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Price:</strong> ${parseFloat(product.unitPrice || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>Unit:</strong> {product.unit}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {product.category || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeGenerator;
