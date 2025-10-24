const { io } = require('../index');

class RealtimeService {
  constructor() {
    this.io = io;
  }

  // Emit stock level updates to all connected clients
  emitStockUpdate(productId, warehouseId, newQuantity, previousQuantity, movementType) {
    const update = {
      productId,
      warehouseId,
      newQuantity,
      previousQuantity,
      movementType,
      timestamp: new Date().toISOString()
    };

    // Emit to all clients
    this.io.emit('stock-update', update);
    
    // Emit to specific warehouse room
    this.io.to(`warehouse-${warehouseId}`).emit('warehouse-stock-update', update);
    
    console.log('Stock update emitted:', update);
  }

  // Emit low stock alerts
  emitLowStockAlert(productId, productName, currentStock, reorderPoint, warehouseId) {
    const alert = {
      productId,
      productName,
      currentStock,
      reorderPoint,
      warehouseId,
      timestamp: new Date().toISOString(),
      type: 'low-stock'
    };

    this.io.emit('low-stock-alert', alert);
    console.log('Low stock alert emitted:', alert);
  }

  // Emit purchase order updates
  emitPurchaseOrderUpdate(orderId, status, updates = {}) {
    const update = {
      orderId,
      status,
      updates,
      timestamp: new Date().toISOString()
    };

    this.io.emit('purchase-order-update', update);
    console.log('Purchase order update emitted:', update);
  }

  // Emit new purchase order creation
  emitNewPurchaseOrder(order) {
    const notification = {
      type: 'new-purchase-order',
      order,
      timestamp: new Date().toISOString()
    };

    this.io.emit('new-purchase-order', notification);
    console.log('New purchase order notification emitted:', notification);
  }

  // Emit user activity updates
  emitUserActivity(userId, activity, details = {}) {
    const activityUpdate = {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    };

    this.io.emit('user-activity', activityUpdate);
    console.log('User activity emitted:', activityUpdate);
  }

  // Emit dashboard updates
  emitDashboardUpdate(updateType, data) {
    const update = {
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    };

    this.io.emit('dashboard-update', update);
    console.log('Dashboard update emitted:', update);
  }

  // Emit system notifications
  emitSystemNotification(title, message, type = 'info', userId = null) {
    const notification = {
      title,
      message,
      type, // 'info', 'warning', 'error', 'success'
      userId,
      timestamp: new Date().toISOString()
    };

    if (userId) {
      // Send to specific user
      this.io.to(`user-${userId}`).emit('system-notification', notification);
    } else {
      // Send to all users
      this.io.emit('system-notification', notification);
    }

    console.log('System notification emitted:', notification);
  }

  // Emit product updates
  emitProductUpdate(productId, updateType, changes) {
    const update = {
      productId,
      updateType, // 'created', 'updated', 'deleted'
      changes,
      timestamp: new Date().toISOString()
    };

    this.io.emit('product-update', update);
    console.log('Product update emitted:', update);
  }

  // Emit supplier updates
  emitSupplierUpdate(supplierId, updateType, changes) {
    const update = {
      supplierId,
      updateType,
      changes,
      timestamp: new Date().toISOString()
    };

    this.io.emit('supplier-update', update);
    console.log('Supplier update emitted:', update);
  }

  // Emit warehouse updates
  emitWarehouseUpdate(warehouseId, updateType, changes) {
    const update = {
      warehouseId,
      updateType,
      changes,
      timestamp: new Date().toISOString()
    };

    this.io.emit('warehouse-update', update);
    console.log('Warehouse update emitted:', update);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.io.engine.clientsCount;
  }

  // Get connected users in a specific warehouse
  getWarehouseUsersCount(warehouseId) {
    const room = this.io.sockets.adapter.rooms.get(`warehouse-${warehouseId}`);
    return room ? room.size : 0;
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

module.exports = realtimeService;
