// Main routes exports
const authRoutes = require('./auth');
const inventoryRoutes = require('./inventory');
const managementRoutes = require('./management');
const reportRoutes = require('./reports');
const auditRoutes = require('./audit');

module.exports = {
  authRoutes,
  inventoryRoutes,
  managementRoutes,
  reportRoutes,
  auditRoutes,
  // Legacy routes (keep for backward compatibility)
  uploads: require('./uploads')
};
