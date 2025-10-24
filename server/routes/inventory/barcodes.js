const express = require('express');
const { Product } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const barcode = require('barcode');
const QRCode = require('qrcode');
const { Op } = require('sequelize');

const router = express.Router();

// Get all barcodes (list products with barcodes)
router.get('/', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
      barcode: { [Op.ne]: null }
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: ['Category'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      barcodes: products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.Category ? product.Category.name : null
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get barcodes error:', error);
    res.status(500).json({ error: 'Failed to get barcodes' });
  }
});

// Generate barcode for a product
router.post('/generate/:productId', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = 'code128', format = 'svg' } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate barcode if not exists
    let barcodeValue = product.barcode;
    if (!barcodeValue) {
      // Generate barcode from product ID and SKU
      barcodeValue = `INV${product.id.toString().padStart(6, '0')}${product.sku.substring(0, 4).toUpperCase()}`;
      
      // Update product with generated barcode
      await product.update({ barcode: barcodeValue });
    }

    // Generate barcode image
    const code = barcode(type, barcodeValue, {
      width: 200,
      height: 100,
      format: format
    });

    res.json({
      success: true,
      barcode: barcodeValue,
      image: code,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      }
    });
  } catch (error) {
    console.error('Barcode generation error:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

// Generate QR code for a product
router.post('/qrcode/:productId', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size = 200 } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create QR code data
    const qrData = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      timestamp: new Date().toISOString()
    };

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      data: qrData,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      }
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Scan barcode and get product info
router.post('/scan', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { barcodeValue, qrData } = req.body;

    let product = null;

    if (barcodeValue) {
      // Search by barcode
      product = await Product.findOne({
        where: { barcode: barcodeValue },
        include: ['Category']
      });
    } else if (qrData) {
      // Parse QR code data
      try {
        const parsedData = JSON.parse(qrData);
        product = await Product.findByPk(parsedData.id, {
          include: ['Category']
        });
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid QR code data' });
      }
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        description: product.description,
        unitPrice: product.unitPrice,
        costPrice: product.costPrice,
        unit: product.unit,
        category: product.Category ? product.Category.name : null,
        isActive: product.isActive
      }
    });
  } catch (error) {
    console.error('Barcode scan error:', error);
    res.status(500).json({ error: 'Failed to scan barcode' });
  }
});

// Validate barcode format
router.post('/validate', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { barcodeValue } = req.body;

    if (!barcodeValue) {
      return res.status(400).json({ error: 'Barcode value is required' });
    }

    // Check if barcode already exists
    const existingProduct = await Product.findOne({
      where: { barcode: barcodeValue }
    });

    if (existingProduct) {
      return res.json({
        valid: false,
        error: 'Barcode already exists',
        existingProduct: {
          id: existingProduct.id,
          name: existingProduct.name,
          sku: existingProduct.sku
        }
      });
    }

    // Basic barcode format validation
    const isValidFormat = /^[A-Z0-9]{8,20}$/.test(barcodeValue);

    res.json({
      valid: isValidFormat && !existingProduct,
      message: isValidFormat ? 'Barcode format is valid' : 'Invalid barcode format'
    });
  } catch (error) {
    console.error('Barcode validation error:', error);
    res.status(500).json({ error: 'Failed to validate barcode' });
  }
});

// Get all products with barcodes
router.get('/products', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
      barcode: { [Op.ne]: null }
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: ['Category'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.Category ? product.Category.name : null
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get products with barcodes error:', error);
    res.status(500).json({ error: 'Failed to get products with barcodes' });
  }
});

// Bulk generate barcodes for products without barcodes
router.post('/bulk-generate', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { type = 'code128' } = req.body;

    // Find products without barcodes
    const productsWithoutBarcodes = await Product.findAll({
      where: {
        isActive: true,
        barcode: null
      },
      limit: 100 // Limit to prevent overwhelming the system
    });

    const results = [];

    for (const product of productsWithoutBarcodes) {
      try {
        // Generate barcode
        const barcodeValue = `INV${product.id.toString().padStart(6, '0')}${product.sku.substring(0, 4).toUpperCase()}`;
        
        // Update product
        await product.update({ barcode: barcodeValue });
        
        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: barcodeValue,
          success: true
        });
      } catch (error) {
        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Generated barcodes for ${results.filter(r => r.success).length} products`,
      results
    });
  } catch (error) {
    console.error('Bulk barcode generation error:', error);
    res.status(500).json({ error: 'Failed to generate barcodes in bulk' });
  }
});

module.exports = router;
