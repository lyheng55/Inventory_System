const { AuditLog } = require('../models');

/**
 * Audit Service
 * Handles logging of all system actions for security and compliance
 */
class AuditService {
  /**
   * Log an action to the audit trail
   * @param {Object} options - Audit log options
   * @param {number} options.userId - User ID who performed the action
   * @param {string} options.action - Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
   * @param {string} options.entity - Entity type (Product, User, PurchaseOrder, etc.)
   * @param {number} options.entityId - ID of the affected entity
   * @param {Object} options.changes - Before/after changes (optional)
   * @param {string} options.ipAddress - IP address of the user
   * @param {string} options.userAgent - User agent string
   * @param {string} options.status - Status: 'success', 'failure', 'error'
   * @param {string} options.errorMessage - Error message if failed
   * @param {Object} options.metadata - Additional metadata
   */
  static async log({
    userId = null,
    action,
    entity,
    entityId = null,
    changes = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null,
    metadata = null
  }) {
    try {
      await AuditLog.create({
        userId,
        action: action.toUpperCase(),
        entity,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress,
        userAgent,
        status,
        errorMessage,
        metadata: metadata ? JSON.stringify(metadata) : null
      });
    } catch (error) {
      // Don't throw error - audit logging should never break the application
      console.error('Failed to log audit trail:', error);
    }
  }

  /**
   * Log a successful action
   */
  static async logSuccess(options) {
    return this.log({ ...options, status: 'success' });
  }

  /**
   * Log a failed action
   */
  static async logFailure(options) {
    return this.log({ ...options, status: 'failure' });
  }

  /**
   * Log an error
   */
  static async logError(options) {
    return this.log({ ...options, status: 'error' });
  }

  /**
   * Log user authentication events
   */
  static async logAuth(userId, action, ipAddress, userAgent, status = 'success', errorMessage = null) {
    return this.log({
      userId,
      action,
      entity: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  }

  /**
   * Log CRUD operations
   */
  static async logCRUD(userId, action, entity, entityId, changes, ipAddress, userAgent, status = 'success') {
    return this.log({
      userId,
      action,
      entity,
      entityId,
      changes,
      ipAddress,
      userAgent,
      status
    });
  }

  /**
   * Log permission changes
   */
  static async logPermissionChange(userId, targetUserId, changes, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'UPDATE_PERMISSIONS',
      entity: 'UserPermission',
      entityId: targetUserId,
      changes,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  /**
   * Log data export/download
   */
  static async logExport(userId, entity, filters, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'EXPORT',
      entity,
      ipAddress,
      userAgent,
      metadata: { filters },
      status: 'success'
    });
  }

  /**
   * Log sensitive data access
   */
  static async logSensitiveAccess(userId, entity, entityId, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'VIEW_SENSITIVE',
      entity,
      entityId,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }
}

module.exports = AuditService;

