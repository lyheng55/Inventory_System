# MySQL Stored Procedures for Inventory Reports

This document explains the MySQL stored procedures created to optimize report calculations in the inventory management system.

## Overview

The stored procedures move complex calculations from JavaScript/Node.js to the MySQL database level, providing several benefits:

- **Performance**: Database-level calculations are faster than application-level processing
- **Scalability**: Reduces memory usage in the Node.js application
- **Consistency**: Centralized business logic in the database
- **Maintainability**: Easier to optimize and modify calculations

## Stored Procedures

### 1. GetStockReport
**Purpose**: Generates stock level reports with summary calculations

**Parameters**:
- `p_warehouse_id` (INT): Filter by warehouse (NULL for all)
- `p_category_id` (INT): Filter by category (NULL for all)
- `p_low_stock_only` (BOOLEAN): Show only low stock items

**Returns**: 3 result sets
1. Stock data with calculations
2. Summary statistics
3. Category summary

**Calculations**:
- Total value (quantity × cost_price)
- Low stock indicators
- Category aggregations
- Average stock levels

### 2. GetStockMovementsReport
**Purpose**: Generates stock movement reports with pagination and summaries

**Parameters**:
- `p_start_date` (DATETIME): Start date for movements
- `p_end_date` (DATETIME): End date for movements
- `p_product_id` (INT): Filter by product (NULL for all)
- `p_warehouse_id` (INT): Filter by warehouse (NULL for all)
- `p_movement_type` (VARCHAR): Filter by movement type (NULL for all)
- `p_page` (INT): Page number for pagination
- `p_limit` (INT): Items per page

**Returns**: 5 result sets
1. Movement data (paginated)
2. Total count
3. Summary statistics
4. Movement type summary
5. Product summary

**Calculations**:
- Net quantity (in - out)
- Movement type aggregations
- Product-level summaries
- Pagination support

### 3. GetLowStockAlertsReport
**Purpose**: Generates low stock alerts with reorder calculations

**Parameters**:
- `p_warehouse_id` (INT): Filter by warehouse (NULL for all)
- `p_category_id` (INT): Filter by category (NULL for all)
- `p_critical_only` (BOOLEAN): Show only critical stock items

**Returns**: 3 result sets
1. Alert data with calculations
2. Summary statistics
3. Category alerts summary

**Calculations**:
- Days until reorder
- Suggested order quantities
- Estimated costs
- Critical vs low stock classification

### 4. GetInventoryValueReport
**Purpose**: Generates inventory valuation reports with profit calculations

**Parameters**:
- `p_warehouse_id` (INT): Filter by warehouse (NULL for all)
- `p_category_id` (INT): Filter by category (NULL for all)
- `p_valuation_method` (VARCHAR): Valuation method (cost/retail)

**Returns**: 4 result sets
1. Item valuation data
2. Summary statistics
3. Category valuation summary
4. Warehouse valuation summary

**Calculations**:
- Cost value (quantity × cost_price)
- Retail value (quantity × unit_price)
- Profit margins and amounts
- Category and warehouse aggregations

### 5. GetPurchaseOrdersReport
**Purpose**: Generates purchase order reports with performance metrics

**Parameters**:
- `p_start_date` (DATETIME): Start date for orders
- `p_end_date` (DATETIME): End date for orders
- `p_supplier_id` (INT): Filter by supplier (NULL for all)
- `p_warehouse_id` (INT): Filter by warehouse (NULL for all)
- `p_status` (VARCHAR): Filter by status (NULL for all)
- `p_page` (INT): Page number for pagination
- `p_limit` (INT): Items per page

**Returns**: 5 result sets
1. Order data (paginated)
2. Total count
3. Summary statistics
4. Status summary
5. Supplier summary

**Calculations**:
- Delivery performance metrics
- Average order values
- Status and supplier aggregations
- Pagination support

### 6. GetSupplierPerformanceReport
**Purpose**: Generates supplier performance reports with delivery metrics

**Parameters**:
- `p_start_date` (DATETIME): Start date for analysis
- `p_end_date` (DATETIME): End date for analysis

**Returns**: 2 result sets
1. Supplier performance data
2. Summary statistics

**Calculations**:
- Delivery performance percentages
- Average delivery times
- Order value metrics
- Performance rankings

### 7. GetDashboardSummary
**Purpose**: Generates dashboard summary with key metrics

**Parameters**:
- `p_start_date` (DATETIME): Start date for metrics
- `p_end_date` (DATETIME): End date for metrics

**Returns**: 3 result sets
1. Summary statistics
2. Recent low stock alerts (top 5)
3. Recent stock movements (top 10)

**Calculations**:
- Total counts and metrics
- Recent activity summaries
- Performance indicators

## Installation

### 1. Run the Setup Script
```bash
cd server
node setup-stored-procedures.js
```

### 2. Manual Installation
```sql
-- Execute the stored-procedures.sql file in MySQL
source server/database/stored-procedures.sql;
```

## Usage in Node.js

### Basic Usage
```javascript
const { QueryTypes } = require('sequelize');

// Call a stored procedure
const result = await sequelize.query(
  'CALL GetStockReport(:warehouseId, :categoryId, :lowStockOnly)',
  {
    replacements: {
      warehouseId: 1,
      categoryId: null,
      lowStockOnly: false
    },
    type: QueryTypes.SELECT
  }
);

// Process multiple result sets
const [stockData, summaryData, categoryData] = result;
```

### Error Handling
```javascript
try {
  const result = await sequelize.query('CALL GetStockReport(?, ?, ?)', {
    replacements: [warehouseId, categoryId, lowStockOnly],
    type: QueryTypes.SELECT
  });
} catch (error) {
  console.error('Stored procedure error:', error);
  // Fallback to original JavaScript calculations
}
```

## Performance Benefits

### Before (JavaScript Calculations)
- Multiple database queries
- Large data transfer to application
- Memory-intensive processing
- Slower response times

### After (Stored Procedures)
- Single database call
- Minimal data transfer
- Database-optimized calculations
- Faster response times

### Expected Performance Improvements
- **Stock Reports**: 40-60% faster
- **Movement Reports**: 50-70% faster
- **Valuation Reports**: 30-50% faster
- **Dashboard**: 60-80% faster

## Migration Strategy

### Phase 1: Parallel Implementation
1. Keep original JavaScript calculations
2. Add stored procedure calls alongside
3. Compare results for accuracy
4. Monitor performance

### Phase 2: Gradual Migration
1. Replace one report type at a time
2. Test thoroughly in staging
3. Deploy with fallback mechanism
4. Monitor for issues

### Phase 3: Full Migration
1. Remove JavaScript calculations
2. Use stored procedures exclusively
3. Optimize based on usage patterns
4. Add indexes as needed

## Maintenance

### Adding New Calculations
1. Modify the appropriate stored procedure
2. Update the Node.js wrapper code
3. Test with sample data
4. Deploy and monitor

### Performance Optimization
1. Analyze query execution plans
2. Add appropriate indexes
3. Optimize JOIN operations
4. Consider partitioning for large datasets

### Monitoring
- Track execution times
- Monitor database CPU usage
- Watch for slow query logs
- Set up alerts for performance degradation

## Troubleshooting

### Common Issues

1. **Procedure Not Found**
   - Ensure procedures are installed
   - Check database connection
   - Verify procedure names

2. **Parameter Errors**
   - Check parameter types
   - Ensure NULL handling
   - Validate date formats

3. **Performance Issues**
   - Check database indexes
   - Monitor query execution plans
   - Consider query optimization

### Debugging
```sql
-- Check if procedures exist
SHOW PROCEDURE STATUS WHERE Db = 'inventory_db';

-- View procedure definition
SHOW CREATE PROCEDURE GetStockReport;

-- Test procedure manually
CALL GetStockReport(NULL, NULL, FALSE);
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Handle NULL values** appropriately in procedures
3. **Use appropriate data types** for parameters
4. **Test thoroughly** before deploying to production
5. **Monitor performance** after deployment
6. **Keep procedures simple** and focused
7. **Document changes** and maintain version control

## Future Enhancements

1. **Caching**: Add result caching for frequently accessed reports
2. **Partitioning**: Implement table partitioning for large datasets
3. **Real-time Updates**: Add triggers for automatic cache invalidation
4. **Advanced Analytics**: Add more sophisticated calculations
5. **Export Optimization**: Integrate with export functionality
