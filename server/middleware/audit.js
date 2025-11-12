const AuditService = require('../services/auditService');

/**
 * Audit Middleware
 * Automatically logs API requests for audit trail
 */

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

/**
 * Get user agent from request
 */
const getClientUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Extract changes from request body (for UPDATE operations)
 */
const extractChanges = (req, oldData = null) => {
  if (!oldData) {
    return { new: req.body };
  }
  
  const changes = {};
  Object.keys(req.body).forEach(key => {
    if (oldData[key] !== req.body[key]) {
      changes[key] = {
        before: oldData[key],
        after: req.body[key]
      };
    }
  });
  
  return Object.keys(changes).length > 0 ? changes : null;
};

/**
 * Determine entity type from route
 */
const getEntityFromRoute = (path) => {
  const routeMap = {
    '/products': 'Product',
    '/categories': 'Category',
    '/suppliers': 'Supplier',
    '/warehouses': 'Warehouse',
    '/purchase-orders': 'PurchaseOrder',
    '/stock': 'Stock',
    '/sales': 'Sale',
    '/users': 'User',
    '/barcodes': 'Barcode'
  };
  
  for (const [route, entity] of Object.entries(routeMap)) {
    if (path.includes(route)) {
      return entity;
    }
  }
  
  return 'Unknown';
};

/**
 * Determine action from HTTP method and route
 */
const getActionFromMethod = (method, path) => {
  const methodMap = {
    'GET': 'VIEW',
    'POST': path.includes('/login') ? 'LOGIN' : 
            path.includes('/logout') ? 'LOGOUT' :
            path.includes('/approve') ? 'APPROVE' :
            path.includes('/receive') ? 'RECEIVE' :
            path.includes('/void') ? 'VOID' :
            'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  return methodMap[method] || 'UNKNOWN';
};

/**
 * Main audit middleware
 * Logs all API requests automatically
 */
const auditMiddleware = async (req, res, next) => {
  // Skip health check and static files
  if (req.path === '/api/health' || req.path.startsWith('/uploads/')) {
    return next();
  }

  const startTime = Date.now();
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);
  const userId = req.user?.id || null;
  const method = req.method;
  const path = req.path;
  
  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 
                   res.statusCode >= 400 && res.statusCode < 500 ? 'failure' : 'error';
    
    // Extract entity info
    const entity = getEntityFromRoute(path);
    const action = getActionFromMethod(method, path);
    const entityId = req.params.id ? parseInt(req.params.id) : null;
    
    // Extract error message if any
    const errorMessage = status !== 'success' && data?.error ? data.error : null;
    
    // Extract changes for UPDATE operations
    let changes = null;
    if ((method === 'PUT' || method === 'PATCH') && status === 'success' && data) {
      // For updates, we log the response data as changes
      changes = { updated: data };
    } else if (method === 'POST' && status === 'success' && data) {
      // For creates, log the created entity
      changes = { created: data };
    }
    
    // Log to audit trail asynchronously (don't wait)
    AuditService.log({
      userId,
      action,
      entity,
      entityId: entityId || data?.id || null,
      changes,
      ipAddress,
      userAgent,
      status,
      errorMessage,
      metadata: {
        method,
        path,
        statusCode: res.statusCode,
        duration
      }
    }).catch(err => {
      // Silently fail - audit logging should never break the app
      console.error('Audit logging error:', err);
    });
    
    // Call original res.json
    return originalJson(data);
  };
  
  next();
};

/**
 * Manual audit logging helper
 * Use this for specific actions that need detailed logging
 */
const logAction = async (req, action, entity, entityId, changes, status = 'success', errorMessage = null) => {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);
  const userId = req.user?.id || null;
  
  return AuditService.log({
    userId,
    action,
    entity,
    entityId,
    changes,
    ipAddress,
    userAgent,
    status,
    errorMessage
  });
};

module.exports = {
  auditMiddleware,
  logAction,
  AuditService
};

