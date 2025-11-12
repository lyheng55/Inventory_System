import React, { useState, useRef, useEffect } from 'react';
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
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import {
  QrCodeScanner,
  QrCode,
  Close,
  Search,
  CheckCircle
} from '@mui/icons-material';
import axios from '../../utils/axios';

const BarcodeScanner = ({ open, onClose, onProductFound, title = "Barcode Scanner", autoUseProduct = false }) => {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (open && scanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = async (barcodeValue) => {
    if (!barcodeValue) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/barcodes/scan', {
        barcodeValue: barcodeValue
      });

      if (response.data.success) {
        setScannedProduct(response.data.product);
        // If autoUseProduct is true, call onProductFound immediately (for POS)
        // Otherwise, wait for user to click "Use Product" button
        if (autoUseProduct && onProductFound) {
          onProductFound(response.data.product);
        }
      } else {
        setError('Product not found for this barcode');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.response?.data?.error || 'Failed to scan barcode');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualInput.trim()) {
      setError('Please enter a barcode');
      return;
    }

    await handleScan(manualInput.trim());
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleManualScan();
    }
  };

  const resetScanner = () => {
    setScannedProduct(null);
    setError('');
    setManualInput('');
    setLoading(false);
  };

  const handleClose = () => {
    resetScanner();
    setScanning(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Camera Scanner
                  </Typography>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Button
                      variant={scanning ? "contained" : "outlined"}
                      color={scanning ? "error" : "primary"}
                      startIcon={<QrCodeScanner />}
                      onClick={() => setScanning(!scanning)}
                      disabled={loading}
                    >
                      {scanning ? 'Stop Scanning' : 'Start Camera'}
                    </Button>
                  </Box>
                  
                  {scanning && (
                    <Box sx={{ position: 'relative', width: '100%', height: 200, border: '2px dashed #ccc', borderRadius: 1 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 200,
                          height: 100,
                          border: '2px solid #1976d2',
                          borderRadius: 1,
                          pointerEvents: 'none'
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Manual Input
                  </Typography>
                  <TextField
                    fullWidth
                    label="Enter Barcode"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleManualScan}
                            disabled={loading || !manualInput.trim()}
                          >
                            <Search />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleManualScan}
                    disabled={loading || !manualInput.trim()}
                    startIcon={loading ? <CircularProgress size={20} /> : <QrCode />}
                  >
                    {loading ? 'Scanning...' : 'Scan Barcode'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {scannedProduct && (
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="h6">Product Found!</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="inherit">
                    <strong>Name:</strong> {scannedProduct.name}
                  </Typography>
                  <Typography variant="body2" color="inherit">
                    <strong>SKU:</strong> {scannedProduct.sku}
                  </Typography>
                  <Typography variant="body2" color="inherit">
                    <strong>Barcode:</strong> {scannedProduct.barcode}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="inherit">
                    <strong>Price:</strong> ${parseFloat(scannedProduct.unitPrice).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="inherit">
                    <strong>Unit:</strong> {scannedProduct.unit}
                  </Typography>
                  <Typography variant="body2" color="inherit">
                    <strong>Category:</strong> {scannedProduct.category || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={2}>
                <Chip
                  label={scannedProduct.isActive ? 'Active' : 'Inactive'}
                  color={scannedProduct.isActive ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={resetScanner} disabled={loading}>
          Reset
        </Button>
        {scannedProduct && (
          <Button 
            onClick={() => {
              if (onProductFound) {
                onProductFound(scannedProduct);
              }
              handleClose();
            }} 
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
          >
            Use Product
          </Button>
        )}
        <Button onClick={handleClose} variant={scannedProduct ? "outlined" : "contained"}>
          {scannedProduct ? 'Cancel' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
