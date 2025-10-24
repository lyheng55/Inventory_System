import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  ExpandMore,
  ExpandLess,
  Refresh
} from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';
import { formatDistanceToNow } from 'date-fns';

const RealtimeStockUpdates = () => {
  const { stockUpdates, connected } = useRealtime();
  const [expanded, setExpanded] = useState(false);

  const getMovementIcon = (movementType) => {
    switch (movementType) {
      case 'in':
        return <TrendingUp color="success" />;
      case 'out':
        return <TrendingDown color="error" />;
      default:
        return <Inventory color="primary" />;
    }
  };

  const getMovementColor = (movementType) => {
    switch (movementType) {
      case 'in':
        return 'success';
      case 'out':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getMovementLabel = (movementType) => {
    switch (movementType) {
      case 'in':
        return 'Stock In';
      case 'out':
        return 'Stock Out';
      default:
        return 'Adjustment';
    }
  };

  if (!connected) {
    return null;
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2">
            Live Stock Updates
          </Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {stockUpdates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No recent stock updates
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {stockUpdates.map((update, index) => (
                <ListItem key={`${update.productId}-${update.timestamp}-${index}`} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getMovementIcon(update.movementType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Product ID: {update.productId}
                        </Typography>
                        <Chip
                          label={getMovementLabel(update.movementType)}
                          size="small"
                          color={getMovementColor(update.movementType)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Warehouse: {update.warehouseId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {update.previousQuantity} → {update.newQuantity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Collapse>

        {!expanded && stockUpdates.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {stockUpdates.length} recent update{stockUpdates.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ ml: 1 }}>
              {stockUpdates.slice(0, 3).map((update, index) => (
                <Chip
                  key={index}
                  label={getMovementLabel(update.movementType)}
                  size="small"
                  color={getMovementColor(update.movementType)}
                  variant="outlined"
                  sx={{ mr: 0.5, fontSize: '0.7rem' }}
                />
              ))}
              {stockUpdates.length > 3 && (
                <Chip
                  label={`+${stockUpdates.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeStockUpdates;
