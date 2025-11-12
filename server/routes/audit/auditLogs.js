const express = require('express');
const { Op } = require('sequelize');
const { AuditLog, User } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const router = express.Router();

/**
 * GET /api/audit-logs
 * Get audit logs with filtering and pagination (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entity,
      entityId,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filter by user
    if (userId) {
      where.userId = parseInt(userId);
    }

    // Filter by action
    if (action) {
      where.action = action.toUpperCase();
    }

    // Filter by entity
    if (entity) {
      where.entity = entity;
    }

    // Filter by entity ID
    if (entityId) {
      where.entityId = parseInt(entityId);
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Search in action, entity, or error message
    if (search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { entity: { [Op.like]: `%${search}%` } },
        { errorMessage: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      logs: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit-logs/:id
 * Get single audit log entry (admin only)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role']
        }
      ]
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Parse JSON fields
    const logData = log.toJSON();
    if (logData.changes) {
      logData.changes = JSON.parse(logData.changes);
    }
    if (logData.metadata) {
      logData.metadata = JSON.parse(logData.metadata);
    }

    res.json(logData);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/audit-logs/stats/summary
 * Get audit log statistics (admin only)
 */
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const [
      totalLogs,
      successLogs,
      failureLogs,
      errorLogs,
      topActions,
      topEntities,
      topUsers
    ] = await Promise.all([
      AuditLog.count({ where }),
      AuditLog.count({ where: { ...where, status: 'success' } }),
      AuditLog.count({ where: { ...where, status: 'failure' } }),
      AuditLog.count({ where: { ...where, status: 'error' } }),
      AuditLog.findAll({
        attributes: [
          'action',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where,
        group: ['action'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 10
      }),
      AuditLog.findAll({
        attributes: [
          'entity',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where,
        group: ['entity'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 10
      }),
      AuditLog.findAll({
        attributes: [
          'userId',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where,
        group: ['userId'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 10,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      })
    ]);

    res.json({
      summary: {
        total: totalLogs,
        success: successLogs,
        failure: failureLogs,
        error: errorLogs,
        successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0
      },
      topActions,
      topEntities,
      topUsers
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

/**
 * DELETE /api/audit-logs/cleanup
 * Clean up old audit logs (admin only)
 * Removes logs older than specified days (default: 365)
 */
router.delete('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 365 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const deletedCount = await AuditLog.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    res.json({
      message: `Cleaned up ${deletedCount} audit log entries older than ${days} days`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({ error: 'Failed to clean up audit logs' });
  }
});

module.exports = router;

