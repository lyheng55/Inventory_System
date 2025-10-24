const express = require('express');
const { Product, Supplier, Warehouse, User, PurchaseOrder, Stock, Category } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Global search across all entities
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 10, entity } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        results: [],
        total: 0,
        query: query || ''
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const searchLimit = Math.min(parseInt(limit), 50); // Max 50 results per entity

    const searchPromises = [];

    // Search Products
    if (!entity || entity === 'products') {
      searchPromises.push(
        Product.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchTerm } },
              { sku: { [Op.like]: searchTerm } },
              { description: { [Op.like]: searchTerm } }
            ],
            isActive: true
          },
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ],
          limit: searchLimit,
          attributes: ['id', 'name', 'sku', 'description', 'unitPrice', 'costPrice']
        }).then(products => ({
          entity: 'products',
          label: 'Products',
          icon: 'inventory',
          results: products.map(product => ({
            id: product.id,
            title: product.name,
            subtitle: `${product.sku} - ${product.Category?.name || 'No Category'}`,
            description: product.description,
            price: product.unitPrice,
            cost: product.costPrice,
            url: `/products`
          }))
        }))
      );
    }

    // Search Suppliers
    if (!entity || entity === 'suppliers') {
      searchPromises.push(
        Supplier.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchTerm } },
              { contactPerson: { [Op.like]: searchTerm } },
              { email: { [Op.like]: searchTerm } },
              { phone: { [Op.like]: searchTerm } }
            ],
            isActive: true
          },
          limit: searchLimit,
          attributes: ['id', 'name', 'contactPerson', 'email', 'phone', 'address']
        }).then(suppliers => ({
          entity: 'suppliers',
          label: 'Suppliers',
          icon: 'business',
          results: suppliers.map(supplier => ({
            id: supplier.id,
            title: supplier.name,
            subtitle: supplier.contactPerson,
            description: `${supplier.email} • ${supplier.phone}`,
            address: supplier.address,
            url: `/suppliers`
          }))
        }))
      );
    }

    // Search Warehouses
    if (!entity || entity === 'warehouses') {
      searchPromises.push(
        Warehouse.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchTerm } },
              { code: { [Op.like]: searchTerm } },
              { address: { [Op.like]: searchTerm } }
            ],
            isActive: true
          },
          limit: searchLimit,
          attributes: ['id', 'name', 'code', 'address', 'capacity']
        }).then(warehouses => ({
          entity: 'warehouses',
          label: 'Warehouses',
          icon: 'warehouse',
          results: warehouses.map(warehouse => ({
            id: warehouse.id,
            title: warehouse.name,
            subtitle: warehouse.code,
            description: warehouse.address,
            capacity: warehouse.capacity,
            url: `/warehouses`
          }))
        }))
      );
    }

    // Search Users (admin only)
    if ((!entity || entity === 'users') && req.user.role === 'admin') {
      searchPromises.push(
        User.findAll({
          where: {
            [Op.or]: [
              { username: { [Op.like]: searchTerm } },
              { email: { [Op.like]: searchTerm } },
              { firstName: { [Op.like]: searchTerm } },
              { lastName: { [Op.like]: searchTerm } }
            ],
            isActive: true
          },
          limit: searchLimit,
          attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role']
        }).then(users => ({
          entity: 'users',
          label: 'Users',
          icon: 'person',
          results: users.map(user => ({
            id: user.id,
            title: `${user.firstName} ${user.lastName}`,
            subtitle: user.username,
            description: `${user.email} • ${user.role}`,
            role: user.role,
            url: `/users`
          }))
        }))
      );
    }

    // Search Purchase Orders
    if (!entity || entity === 'purchase-orders') {
      searchPromises.push(
        PurchaseOrder.findAll({
          where: {
            [Op.or]: [
              { orderNumber: { [Op.like]: searchTerm } },
              { notes: { [Op.like]: searchTerm } }
            ]
          },
          include: [
            { model: Supplier, attributes: ['id', 'name'] },
            { model: Warehouse, attributes: ['id', 'name'] }
          ],
          limit: searchLimit,
          attributes: ['id', 'orderNumber', 'status', 'totalAmount', 'orderDate', 'notes'],
          order: [['orderDate', 'DESC']]
        }).then(orders => ({
          entity: 'purchase-orders',
          label: 'Purchase Orders',
          icon: 'shopping_cart',
          results: orders.map(order => ({
            id: order.id,
            title: order.orderNumber,
            subtitle: `${order.Supplier?.name} → ${order.Warehouse?.name}`,
            description: `Status: ${order.status} • $${order.totalAmount}`,
            status: order.status,
            amount: order.totalAmount,
            date: order.orderDate,
            url: `/purchase-orders`
          }))
        }))
      );
    }

    const results = await Promise.all(searchPromises);
    
    // Filter out empty results
    const filteredResults = results.filter(result => result.results.length > 0);
    
    // Calculate total results
    const total = filteredResults.reduce((sum, result) => sum + result.results.length, 0);

    res.json({
      results: filteredResults,
      total,
      query: query.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced search with filters
router.post('/advanced', authenticateToken, async (req, res) => {
  try {
    const { 
      entity, 
      filters = {}, 
      sort = {}, 
      pagination = { page: 1, limit: 20 }
    } = req.body;

    if (!entity) {
      return res.status(400).json({ error: 'Entity is required' });
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = {};
    let includeClause = [];
    let orderClause = [];

    // Build where clause based on filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          whereClause[field] = { [Op.in]: value };
        } else if (typeof value === 'string' && value.includes('*')) {
          whereClause[field] = { [Op.like]: value.replace(/\*/g, '%') };
        } else if (typeof value === 'object' && value.operator) {
          switch (value.operator) {
            case 'between':
              whereClause[field] = { [Op.between]: value.value };
              break;
            case 'gte':
              whereClause[field] = { [Op.gte]: value.value };
              break;
            case 'lte':
              whereClause[field] = { [Op.lte]: value.value };
              break;
            case 'like':
              whereClause[field] = { [Op.like]: `%${value.value}%` };
              break;
            default:
              whereClause[field] = value.value;
          }
        } else {
          whereClause[field] = value;
        }
      }
    });

    // Build sort clause
    if (sort.field && sort.direction) {
      orderClause.push([sort.field, sort.direction.toUpperCase()]);
    }

    let results;
    let total;

    switch (entity) {
      case 'products':
        includeClause = [{ model: Category, attributes: ['id', 'name'] }];
        [results, total] = await Promise.all([
          Product.findAndCountAll({
            where: whereClause,
            include: includeClause,
            limit,
            offset,
            order: orderClause.length > 0 ? orderClause : [['name', 'ASC']]
          }),
          Product.count({ where: whereClause })
        ]);
        break;

      case 'suppliers':
        [results, total] = await Promise.all([
          Supplier.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: orderClause.length > 0 ? orderClause : [['name', 'ASC']]
          }),
          Supplier.count({ where: whereClause })
        ]);
        break;

      case 'warehouses':
        [results, total] = await Promise.all([
          Warehouse.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: orderClause.length > 0 ? orderClause : [['name', 'ASC']]
          }),
          Warehouse.count({ where: whereClause })
        ]);
        break;

      case 'users':
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
        }
        [results, total] = await Promise.all([
          User.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: orderClause.length > 0 ? orderClause : [['username', 'ASC']],
            attributes: { exclude: ['password'] }
          }),
          User.count({ where: whereClause })
        ]);
        break;

      case 'purchase-orders':
        includeClause = [
          { model: Supplier, attributes: ['id', 'name'] },
          { model: Warehouse, attributes: ['id', 'name'] }
        ];
        [results, total] = await Promise.all([
          PurchaseOrder.findAndCountAll({
            where: whereClause,
            include: includeClause,
            limit,
            offset,
            order: orderClause.length > 0 ? orderClause : [['orderDate', 'DESC']]
          }),
          PurchaseOrder.count({ where: whereClause })
        ]);
        break;

      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    res.json({
      results: results.rows || results,
      total: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      filters,
      sort,
      entity
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save search filter
router.post('/filters', authenticateToken, async (req, res) => {
  try {
    const { name, entity, filters, sort, isPublic = false } = req.body;

    if (!name || !entity || !filters) {
      return res.status(400).json({ error: 'Name, entity, and filters are required' });
    }

    // In a real application, you would save this to a database
    // For now, we'll return a success response
    const savedFilter = {
      id: Date.now().toString(),
      name,
      entity,
      filters,
      sort,
      isPublic,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    res.json({
      message: 'Search filter saved successfully',
      filter: savedFilter
    });

  } catch (error) {
    console.error('Save search filter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved search filters
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    const { entity } = req.query;

    // In a real application, you would fetch from database
    // For now, return mock data
    const mockFilters = [
      {
        id: '1',
        name: 'Low Stock Products',
        entity: 'products',
        filters: { quantity: { operator: 'lte', value: 10 } },
        sort: { field: 'quantity', direction: 'asc' },
        isPublic: true,
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Recent Purchase Orders',
        entity: 'purchase-orders',
        filters: { status: 'approved' },
        sort: { field: 'orderDate', direction: 'desc' },
        isPublic: false,
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      }
    ];

    const filters = entity 
      ? mockFilters.filter(filter => filter.entity === entity)
      : mockFilters;

    res.json({ filters });

  } catch (error) {
    console.error('Get search filters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // In a real application, you would fetch from database
    // For now, return mock data
    const mockHistory = [
      {
        id: '1',
        query: 'laptop',
        entity: 'products',
        resultsCount: 5,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      {
        id: '2',
        query: 'supplier',
        entity: 'suppliers',
        resultsCount: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
      }
    ];

    res.json({
      history: mockHistory.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
