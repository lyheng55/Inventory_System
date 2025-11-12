import React, { useState, MouseEvent } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Button,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Warning,
  Info,
  Error,
  CheckCircle,
  Clear
} from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../../types';

interface ExtendedNotification extends Notification {
  read?: boolean;
}

const RealtimeNotifications: React.FC = () => {
  const {
    notifications,
    removeNotification,
    clearNotifications,
    connected
  } = useRealtime();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'info':
      default:
        return <Info color="info" />;
    }
  };

  const getNotificationColor = (type: string): 'warning' | 'error' | 'success' | 'primary' => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      case 'info':
      default:
        return 'primary';
    }
  };

  const unreadCount = (notifications as ExtendedNotification[]).filter(n => !n.read).length;

  return (
    <>
      <Tooltip title={connected ? "Real-time notifications" : "Disconnected from real-time server"}>
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ position: 'relative' }}
        >
          <Badge badgeContent={unreadCount} color="error">
            {connected ? <NotificationsActive /> : <Notifications />}
          </Badge>
          {!connected && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'error.main'
              }}
            />
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Notifications
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Box>
              {notifications.length > 0 && (
                <Button
                  size="small"
                  onClick={clearNotifications}
                  startIcon={<Clear />}
                  sx={{ mr: 1 }}
                >
                  Clear All
                </Button>
              )}
              <IconButton size="small" onClick={handleClose}>
                <Clear />
              </IconButton>
            </Box>
          </Box>

          {!connected && (
            <Box sx={{ mb: 2, p: 1, backgroundColor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="error.contrastText">
                ⚠️ Disconnected from real-time server
              </Typography>
            </Box>
          )}

          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {notifications.map((notification, index) => {
                const extendedNotification = notification as ExtendedNotification;
                return (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        backgroundColor: extendedNotification.read ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: extendedNotification.read ? 'normal' : 'bold' }}>
                              {notification.title}
                            </Typography>
                            <Chip
                              label={formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                              size="small"
                              variant="outlined"
                              sx={{ ml: 1, fontSize: '0.7rem' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Chip
                                label={notification.type}
                                size="small"
                                color={getNotificationColor(notification.type)}
                                variant="outlined"
                              />
                              <IconButton
                                size="small"
                                onClick={() => removeNotification(notification.id)}
                              >
                                <Clear fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default RealtimeNotifications;

