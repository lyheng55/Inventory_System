// Main routes exports
const authRoutes = require('./auth');
const inventoryRoutes = require('./inventory');
const managementRoutes = require('./management');
const reportRoutes = require('./reports');

module.exports = {
  authRoutes,
  inventoryRoutes,
  managementRoutes,
  reportRoutes,
  // Legacy routes (keep for backward compatibility)
  uploads: require('./uploads')
};
