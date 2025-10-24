const express = require('express');
const { Product, Category, Stock, Warehouse, StockMovement } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, productSchema } = require('../../middleware/validation');
const { Op } = require('sequelize');

const router = express.Router();

// Get all products with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId;
    const lowStock = req.query.lowStock === 'true';

    const whereClause = {
      isActive: true
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: Stock,
          include: [{
            model: Warehouse,
            attributes: ['id', 'name', 'code']
          }]
        }
      ],
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    // Add total stock quantity for each product
    const productsWithStock = products.map(product => {
      const totalStock = product.Stocks.reduce((sum, stock) => sum + stock.quantity, 0);
      const isLowStock = totalStock <= product.reorderPoint;
      
      return {
        ...product.toJSON(),
        totalStock,
        isLowStock,
        needsReorder: lowStock ? isLowStock : undefined
      };
    });

    // Filter low stock products if requested
    const filteredProducts = lowStock 
      ? productsWithStock.filter(product => product.isLowStock)
      : productsWithStock;

    res.json({
      products: filteredProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'description']
        },
        {
          model: Stock,
          include: [{
            model: Warehouse,
            attributes: ['id', 'name', 'code', 'location']
          }]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalStock = product.Stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const availableStock = product.Stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);

    res.json({
      ...product.toJSON(),
      totalStock,
      availableStock,
      isLowStock: totalStock <= product.reorderPoint
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
router.post('/', authenticateToken, requireStaff, validateRequest(productSchema), async (req, res) => {
  try {
    const productData = req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku: productData.sku } });
    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this SKU already exists' });
    }

    // Check if barcode already exists (if provided)
    if (productData.barcode) {
      const existingBarcode = await Product.findOne({ where: { barcode: productData.barcode } });
      if (existingBarcode) {
        return res.status(400).json({ error: 'Product with this barcode already exists' });
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, requireStaff, validateRequest(productSchema), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = req.body;

    // Check if SKU is being changed and already exists
    if (productData.sku && productData.sku !== product.sku) {
      const existingProduct = await Product.findOne({ where: { sku: productData.sku } });
      if (existingProduct) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    // Check if barcode is being changed and already exists
    if (productData.barcode && productData.barcode !== product.barcode) {
      const existingBarcode = await Product.findOne({ where: { barcode: productData.barcode } });
      if (existingBarcode) {
        return res.status(400).json({ error: 'Product with this barcode already exists' });
      }
    }

    await product.update(productData);

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product has stock
    const totalStock = await Stock.sum('quantity', {
      where: { productId: product.id }
    });

    if (totalStock > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product with existing stock. Please transfer or adjust stock first.' 
      });
    }

    await product.update({ isActive: false });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product stock movements
router.get('/:id/movements', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where: { productId: req.params.id },
      include: [
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ],
      limit,
      offset,
      order: [['movementDate', 'DESC']]
    });

    res.json({
      movements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get product movements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate barcode for product
router.post('/:id/generate-barcode', authenticateToken, requireStaff, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate barcode if not exists
    if (!product.barcode) {
      const barcode = product.sku + Date.now().toString().slice(-6);
      await product.update({ barcode });
    }

    res.json({
      message: 'Barcode generated successfully',
      barcode: product.barcode
    });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
