import React, { useState, ChangeEvent, FormEvent } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Warehouse,
  Add,
  Edit,
  Delete,
  Person,
  LocationOn,
  Storage,
  TrendingUp,
  Warning,
  CheckCircle,
  Map
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';
import { Warehouse as WarehouseType, User } from '../../types';

interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  capacity: string;
  managerId: string;
}

interface ExtendedWarehouse extends WarehouseType {
  manager?: User;
  isActive?: boolean;
}

interface StockData {
  stocks: Array<{
    warehouseId: number;
    quantity: number;
  }>;
}

const Warehouses: React.FC = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ExtendedWarehouse | null>(null);
  const [viewingWarehouse, setViewingWarehouse] = useState<ExtendedWarehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    capacity: '',
    managerId: ''
  });

  const queryClient = useQueryClient();

  const { data: warehouses, isLoading } = useQuery<ExtendedWarehouse[]>(
    'warehouses',
    async () => {
      const response = await axios.get('/warehouses');
      return response.data;
    }
  );

  const { data: usersData } = useQuery<User[]>(
    'users-for-dropdown',
    async () => {
      try {
        const response = await axios.get('/users', {
          params: {
            page: 1,
            limit: 1000,
            isActive: 'true'
          }
        });
        
        if (response.data?.users && Array.isArray(response.data.users)) {
          return response.data.users;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.warn('Failed to fetch users from database:', error);
        return [];
      }
    },
    {
      initialData: []
    }
  );

  const users = Array.isArray(usersData) ? usersData : [];

  const { data: stockData } = useQuery<StockData>(
    'warehouseStock',
    async () => {
      const response = await axios.get('/stock');
      return response.data;
    }
  );

  const createWarehouseMutation = useMutation(
    (warehouseData: Partial<ExtendedWarehouse>) => axios.post('/warehouses', warehouseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('warehouses');
        setOpenDialog(false);
        resetForm();
      }
    }
  );

  const updateWarehouseMutation = useMutation(
    ({ id, warehouseData }: { id: number; warehouseData: Partial<ExtendedWarehouse> }) => axios.put(`/warehouses/${id}`, warehouseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('warehouses');
        setOpenDialog(false);
        setEditingWarehouse(null);
        resetForm();
      }
    }
  );

  const deleteWarehouseMutation = useMutation(
    (id: number) => axios.delete(`/warehouses/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('warehouses');
      }
    }
  );

  const resetForm = (): void => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      capacity: '',
      managerId: ''
    });
  };

  const handleOpenDialog = (warehouse: ExtendedWarehouse | null = null): void => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        zipCode: warehouse.zipCode || '',
        country: warehouse.country || '',
        capacity: warehouse.capacity?.toString() || '',
        managerId: warehouse.managerId?.toString() || ''
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
    setEditingWarehouse(null);
    resetForm();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const warehouseData = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      managerId: formData.managerId ? parseInt(formData.managerId) : null
    };

    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, warehouseData });
    } else {
      createWarehouseMutation.mutate(warehouseData);
    }
  };

  const handleDelete = (warehouse: ExtendedWarehouse): void => {
    if (window.confirm(`Are you sure you want to delete ${warehouse.name}?`)) {
      deleteWarehouseMutation.mutate(warehouse.id);
    }
  };

  const getWarehouseStats = (warehouseId: number) => {
    if (!stockData?.stocks) return { totalProducts: 0, totalQuantity: 0, utilization: 0 };
    
    const warehouseStock = stockData.stocks.filter(stock => stock.warehouseId === warehouseId);
    const totalProducts = warehouseStock.length;
    const totalQuantity = warehouseStock.reduce((sum, stock) => sum + stock.quantity, 0);
    
    return { totalProducts, totalQuantity, utilization: 0 };
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Warehouses
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Warehouse
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warehouse color="primary" />
                <Box>
                  <Typography color="text.secondary" gutterBottom>Total Warehouses</Typography>
                  <Typography variant="h4">{warehouses?.length || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Storage color="success" />
                <Box>
                  <Typography color="text.secondary" gutterBottom>Total Capacity</Typography>
                  <Typography variant="h4">
                    {warehouses?.reduce((sum, w) => sum + ((w.capacity as number) || 0), 0) || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp color="info" />
                <Box>
                  <Typography color="text.secondary" gutterBottom>Active Warehouses</Typography>
                  <Typography variant="h4">
                    {warehouses?.filter(w => w.isActive).length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Person color="warning" />
                <Box>
                  <Typography color="text.secondary" gutterBottom>Assigned Managers</Typography>
                  <Typography variant="h4">
                    {warehouses?.filter(w => w.managerId).length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warehouses Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Warehouse</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses?.map((warehouse) => {
                const stats = getWarehouseStats(warehouse.id);
                return (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <Warehouse />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{warehouse.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {warehouse.address}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={warehouse.code || 'N/A'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn fontSize="small" />
                        <Typography variant="caption">
                          {warehouse.city}, {warehouse.state}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {warehouse.manager ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {warehouse.manager.firstName?.[0]}{warehouse.manager.lastName?.[0]}
                          </Avatar>
                          <Typography variant="caption">
                            {warehouse.manager.firstName} {warehouse.manager.lastName}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No manager assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {warehouse.capacity ? (
                        <Typography variant="body2">{(warehouse.capacity as number).toLocaleString()}</Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Unlimited</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{stats.totalProducts} products</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stats.totalQuantity.toLocaleString()} units
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={warehouse.isActive ? 'Active' : 'Inactive'}
                        color={warehouse.isActive ? 'success' : 'default'}
                        size="small"
                        icon={warehouse.isActive ? <CheckCircle /> : <Warning />}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => setViewingWarehouse(warehouse)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Warehouse">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(warehouse)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Warehouse">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(warehouse)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Warehouse Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Warehouse Name"
                  name="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Warehouse Code"
                  name="code"
                  value={formData.code}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                  required
                  helperText="Unique identifier for the warehouse"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="state"
                  value={formData.state}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, state: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Zip/Postal Code"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, country: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, capacity: e.target.value })}
                  helperText="Maximum storage capacity (optional)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Manager</InputLabel>
                  <Select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    label="Manager"
                    disabled={users.length === 0}
                  >
                    <MenuItem value="">No manager assigned</MenuItem>
                    {users.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>Loading users...</em>
                      </MenuItem>
                    ) : (
                      users.map((user) => (
                        <MenuItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName} ({user.email})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingWarehouse ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Warehouse Dialog */}
      <Dialog open={!!viewingWarehouse} onClose={() => setViewingWarehouse(null)} maxWidth="md" fullWidth>
        {viewingWarehouse && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Warehouse />
                </Avatar>
                <Box>
                  <Typography variant="h6">{viewingWarehouse.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {viewingWarehouse.code}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Warehouse Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText
                        primary="Address"
                        secondary={viewingWarehouse.address || 'Not specified'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Map /></ListItemIcon>
                      <ListItemText
                        primary="Location"
                        secondary={`${viewingWarehouse.city || ''}, ${viewingWarehouse.state || ''} ${viewingWarehouse.zipCode || ''}`.trim() || 'Not specified'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Storage /></ListItemIcon>
                      <ListItemText
                        primary="Capacity"
                        secondary={viewingWarehouse.capacity ? (viewingWarehouse.capacity as number).toLocaleString() : 'Unlimited'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText
                        primary="Manager"
                        secondary={viewingWarehouse.manager ? 
                          `${viewingWarehouse.manager.firstName} ${viewingWarehouse.manager.lastName}` : 
                          'No manager assigned'
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  {(() => {
                    const stats = getWarehouseStats(viewingWarehouse.id);
                    return (
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Total Products"
                            secondary={stats.totalProducts}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Total Quantity"
                            secondary={stats.totalQuantity.toLocaleString()}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilization"
                            secondary={`${stats.utilization}%`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Status"
                            secondary={
                              <Chip
                                label={viewingWarehouse.isActive ? 'Active' : 'Inactive'}
                                color={viewingWarehouse.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            }
                          />
                        </ListItem>
                      </List>
                    );
                  })()}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewingWarehouse(null)}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  setViewingWarehouse(null);
                  handleOpenDialog(viewingWarehouse);
                }}
              >
                Edit Warehouse
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Warehouses;

