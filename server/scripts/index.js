// Scripts exports for easy access
module.exports = {
  // Database scripts
  database: {
    setup: require('./database/setup'),
    init: require('./database/init'),
    storedProcedures: require('./database/stored-procedures')
  },
  
  // Setup scripts
  setup: {
    mysql: require('./setup/setup-mysql'),
    storedProcedures: require('./setup/setup-stored-procedures'),
    testProcedures: require('./setup/test-stored-procedures')
  },
  
  // Utility scripts
  utilities: {
    healthcheck: require('./utilities/healthcheck'),
    checkTableStructure: require('./utilities/check-table-structure'),
    fixMysqlAuth: require('./utilities/fix-mysql-auth'),
    resetDatabase: require('./utilities/reset-database')
  }
};
