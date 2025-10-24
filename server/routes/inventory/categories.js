const express = require('express');
const { Category } = require('../../models');
const { authenticateToken, requireStaff } = require('../../middleware/auth');
const { validateRequest, categorySchema } = require('../../middleware/validation');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single category
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new category
router.post('/', authenticateToken, requireStaff, validateRequest(categorySchema), async (req, res) => {
  try {
    const categoryData = req.body;

    // Check if category name already exists
    const existingCategory = await Category.findOne({ 
      where: { name: categoryData.name } 
    });
    
    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
router.put('/:id', authenticateToken, requireStaff, validateRequest(categorySchema), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryData = req.body;

    // Check if name is being changed and already exists
    if (categoryData.name && categoryData.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        where: { name: categoryData.name } 
      });
      if (existingCategory) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
    }

    await category.update(categoryData);

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category (soft delete)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has products
    const productCount = await category.countProducts();
    if (productCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing products. Please move or delete products first.' 
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await category.countSubcategories();
    if (subcategoryCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with subcategories. Please delete subcategories first.' 
      });
    }

    await category.update({ isActive: false });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
