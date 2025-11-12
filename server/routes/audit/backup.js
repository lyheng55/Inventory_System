const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats
} = require('../../scripts/utilities/backup');
const AuditService = require('../../services/auditService');
const router = express.Router();

/**
 * POST /api/backup/create
 * Create a new database backup (admin only)
 */
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { compress = true, includeData = true, tables = null } = req.body;

    const result = await createBackup({
      compress,
      includeData,
      tables: tables ? (Array.isArray(tables) ? tables : [tables]) : null
    });

    // Log backup creation
    await AuditService.log({
      userId: req.user.id,
      action: 'CREATE_BACKUP',
      entity: 'Database',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success',
      metadata: {
        filename: result.filename,
        size: result.size
      }
    });

    res.json({
      message: 'Backup created successfully',
      ...result
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    
    // Log backup failure
    await AuditService.log({
      userId: req.user.id,
      action: 'CREATE_BACKUP',
      entity: 'Database',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'error',
      errorMessage: error.message
    });

    res.status(500).json({ error: error.message || 'Failed to create backup' });
  }
});

/**
 * POST /api/backup/restore
 * Restore database from backup (admin only)
 */
router.post('/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { filename, dropDatabase = false, createDatabase = true } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required' });
    }

    // Log restore attempt
    await AuditService.log({
      userId: req.user.id,
      action: 'RESTORE_BACKUP',
      entity: 'Database',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success',
      metadata: {
        filename,
        dropDatabase,
        createDatabase
      }
    });

    const result = await restoreBackup(filename, {
      dropDatabase,
      createDatabase
    });

    res.json({
      message: 'Database restored successfully',
      ...result
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    
    // Log restore failure
    await AuditService.log({
      userId: req.user.id,
      action: 'RESTORE_BACKUP',
      entity: 'Database',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'error',
      errorMessage: error.message
    });

    res.status(500).json({ error: error.message || 'Failed to restore backup' });
  }
});

/**
 * GET /api/backup/list
 * List all available backups (admin only)
 */
router.get('/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * GET /api/backup/stats
 * Get backup statistics (admin only)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = getBackupStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({ error: 'Failed to get backup statistics' });
  }
});

/**
 * DELETE /api/backup/cleanup
 * Clean up old backups (admin only)
 */
router.delete('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { keepCount = 30 } = req.query;
    const result = await cleanupOldBackups(parseInt(keepCount));

    // Log cleanup
    await AuditService.log({
      userId: req.user.id,
      action: 'CLEANUP_BACKUPS',
      entity: 'Database',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success',
      metadata: {
        deleted: result.deleted,
        keepCount: parseInt(keepCount)
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({ error: 'Failed to clean up backups' });
  }
});

module.exports = router;

