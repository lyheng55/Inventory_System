const express = require('express');
const { Unit } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// Get all units
router.get('/', authenticateToken, async (req, res) => {
  try {
    const units = await Unit.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'displayName', 'description', 'isActive']
    });

    res.json(units);
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single unit
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(unit);
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

