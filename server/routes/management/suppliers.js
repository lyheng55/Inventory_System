const express = require('express');
const { Supplier } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, supplierSchema } = require('../../middleware/validation');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single supplier
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new supplier
router.post('/', authenticateToken, requireStaff, validateRequest(supplierSchema), async (req, res) => {
  try {
    const supplierData = req.body;

    // Check if supplier name already exists
    const existingSupplier = await Supplier.findOne({ 
      where: { name: supplierData.name } 
    });
    
    if (existingSupplier) {
      return res.status(400).json({ error: 'Supplier with this name already exists' });
    }

    const supplier = await Supplier.create(supplierData);

    res.status(201).json({
      message: 'Supplier created successfully',
      supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, requireStaff, validateRequest(supplierSchema), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplierData = req.body;

    // Check if name is being changed and already exists
    if (supplierData.name && supplierData.name !== supplier.name) {
      const existingSupplier = await Supplier.findOne({ 
        where: { name: supplierData.name } 
      });
      if (existingSupplier) {
        return res.status(400).json({ error: 'Supplier with this name already exists' });
      }
    }

    await supplier.update(supplierData);

    res.json({
      message: 'Supplier updated successfully',
      supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supplier (soft delete)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has purchase orders
    const orderCount = await supplier.countPurchaseOrders();
    if (orderCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with existing purchase orders. Please handle orders first.' 
      });
    }

    await supplier.update({ isActive: false });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
