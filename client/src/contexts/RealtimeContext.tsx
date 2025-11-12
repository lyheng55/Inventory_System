import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { RealtimeContextType, Notification, StockUpdate, DashboardData } from '../types';

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
          userId: user.id
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to real-time server');
        setConnected(true);
        
        // Join user-specific room
        newSocket.emit('join-user', user.id);
        
        // Join warehouse rooms if user has warehouse access
        if (user.warehouses && user.warehouses.length > 0) {
          user.warehouses.forEach(warehouse => {
            newSocket.emit('join-warehouse', warehouse.id);
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from real-time server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      // Stock updates
      newSocket.on('stock-update', (update: StockUpdate) => {
        console.log('Stock update received:', update);
        setStockUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
      });

      newSocket.on('warehouse-stock-update', (update: StockUpdate) => {
        console.log('Warehouse stock update received:', update);
        setStockUpdates(prev => [update, ...prev.slice(0, 9)]);
      });

      // Low stock alerts
      newSocket.on('low-stock-alert', (alert: any) => {
        console.log('Low stock alert received:', alert);
        addNotification({
          id: Date.now(),
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${alert.productName} is running low (${alert.currentStock} remaining)`,
          timestamp: alert.timestamp,
          data: alert
        });
      });

      // Purchase order updates
      newSocket.on('purchase-order-update', (update: any) => {
        console.log('Purchase order update received:', update);
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Purchase Order Updated',
          message: `Order ${update.orderId} status changed to ${update.status}`,
          timestamp: update.timestamp,
          data: update
        });
      });

      newSocket.on('new-purchase-order', (notification: any) => {
        console.log('New purchase order received:', notification);
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'New Purchase Order',
          message: `New order created: ${notification.order.orderNumber}`,
          timestamp: notification.timestamp,
          data: notification
        });
      });

      // Dashboard updates
      newSocket.on('dashboard-update', (update: DashboardData) => {
        console.log('Dashboard update received:', update);
        setDashboardData(update);
      });

      // System notifications
      newSocket.on('system-notification', (notification: any) => {
        console.log('System notification received:', notification);
        addNotification({
          id: Date.now(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.timestamp,
          data: notification
        });
      });

      // Product updates
      newSocket.on('product-update', (update: any) => {
        console.log('Product update received:', update);
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Product Updated',
          message: `Product ${update.productId} has been ${update.updateType}`,
          timestamp: update.timestamp,
          data: update
        });
      });

      // Supplier updates
      newSocket.on('supplier-update', (update: any) => {
        console.log('Supplier update received:', update);
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Supplier Updated',
          message: `Supplier ${update.supplierId} has been ${update.updateType}`,
          timestamp: update.timestamp,
          data: update
        });
      });

      // Warehouse updates
      newSocket.on('warehouse-update', (update: any) => {
        console.log('Warehouse update received:', update);
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Warehouse Updated',
          message: `Warehouse ${update.warehouseId} has been ${update.updateType}`,
          timestamp: update.timestamp,
          data: update
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const addNotification = (notification: Notification): void => {
    setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20 notifications
  };

  const removeNotification = (id: number): void => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = (): void => {
    setNotifications([]);
  };

  const joinWarehouse = (warehouseId: number): void => {
    if (socket) {
      socket.emit('join-warehouse', warehouseId);
    }
  };

  const leaveWarehouse = (warehouseId: number): void => {
    if (socket) {
      socket.emit('leave-warehouse', warehouseId);
    }
  };

  const emitUserActivity = (activity: string, details: any = {}): void => {
    if (socket && user) {
      socket.emit('user-activity', {
        userId: user.id,
        activity,
        details
      });
    }
  };

  const value: RealtimeContextType = {
    socket,
    connected,
    notifications,
    stockUpdates,
    dashboardData,
    addNotification,
    removeNotification,
    clearNotifications,
    joinWarehouse,
    leaveWarehouse,
    emitUserActivity
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

