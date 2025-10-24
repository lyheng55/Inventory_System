const express = require('express');
const { Warehouse, User } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, warehouseSchema } = require('../../middleware/validation');

const router = express.Router();

// Get all warehouses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single warehouse
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json(warehouse);
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new warehouse
router.post('/', authenticateToken, requireStaff, validateRequest(warehouseSchema), async (req, res) => {
  try {
    const warehouseData = req.body;

    // Check if warehouse code already exists
    const existingWarehouse = await Warehouse.findOne({ 
      where: { code: warehouseData.code } 
    });
    
    if (existingWarehouse) {
      return res.status(400).json({ error: 'Warehouse with this code already exists' });
    }

    const warehouse = await Warehouse.create(warehouseData);

    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update warehouse
router.put('/:id', authenticateToken, requireStaff, validateRequest(warehouseSchema), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const warehouseData = req.body;

    // Check if code is being changed and already exists
    if (warehouseData.code && warehouseData.code !== warehouse.code) {
      const existingWarehouse = await Warehouse.findOne({ 
        where: { code: warehouseData.code } 
      });
      if (existingWarehouse) {
        return res.status(400).json({ error: 'Warehouse with this code already exists' });
      }
    }

    await warehouse.update(warehouseData);

    res.json({
      message: 'Warehouse updated successfully',
      warehouse
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete warehouse (soft delete)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Check if warehouse has stock
    const stockCount = await warehouse.countStocks();
    if (stockCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete warehouse with existing stock. Please transfer or adjust stock first.' 
      });
    }

    await warehouse.update({ isActive: false });

    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
