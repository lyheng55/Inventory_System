import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Card,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Rating
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalShipping,
  Phone,
  Email,
  LocationOn
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';

const Suppliers = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    taxId: '',
    paymentTerms: 'Net 30',
    rating: 5
  });

  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useQuery(
    'suppliers',
    async () => {
      const response = await axios.get('/suppliers');
      return response.data;
    }
  );

  const createSupplierMutation = useMutation(
    (supplierData) => axios.post('/suppliers', supplierData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers');
        setOpenDialog(false);
        resetForm();
      }
    }
  );

  const updateSupplierMutation = useMutation(
    ({ id, supplierData }) => axios.put(`/suppliers/${id}`, supplierData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers');
        setOpenDialog(false);
        setEditingSupplier(null);
        resetForm();
      }
    }
  );

  const deleteSupplierMutation = useMutation(
    (id) => axios.delete(`/suppliers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      taxId: '',
      paymentTerms: 'Net 30',
      rating: 5
    });
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        zipCode: supplier.zipCode || '',
        country: supplier.country || '',
        taxId: supplier.taxId || '',
        paymentTerms: supplier.paymentTerms || 'Net 30',
        rating: supplier.rating || 5
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSupplier(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const supplierData = {
      ...formData,
      rating: parseInt(formData.rating)
    };

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, supplierData });
    } else {
      createSupplierMutation.mutate(supplierData);
    }
  };

  const handleDelete = (supplier) => {
    if (window.confirm(t('suppliers.confirmDelete', { name: supplier.name }))) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('suppliers.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          {t('suppliers.addSupplier')}
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('suppliers.contactPerson')}</TableCell>
                <TableCell>{t('suppliers.location')}</TableCell>
                <TableCell>{t('suppliers.paymentTerms')}</TableCell>
                <TableCell>{t('suppliers.rating')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers?.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalShipping />
                      <Box>
                        <Typography variant="subtitle2">{supplier.name}</Typography>
                        {supplier.contactPerson && (
                          <Typography variant="caption" color="text.secondary">
                            {supplier.contactPerson}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {supplier.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Email fontSize="small" />
                          <Typography variant="caption">{supplier.email}</Typography>
                        </Box>
                      )}
                      {supplier.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" />
                          <Typography variant="caption">{supplier.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="small" />
                      <Typography variant="caption">
                        {supplier.city}, {supplier.state}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{supplier.paymentTerms}</TableCell>
                  <TableCell>
                    <Rating value={supplier.rating} readOnly size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.isActive ? t('common.active') : t('common.inactive')}
                      color={supplier.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(supplier)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(supplier)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.supplierName')}
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.contactPerson')}
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.email')}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.phone')}
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('suppliers.address')}
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('suppliers.city')}
                  name="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('suppliers.state')}
                  name="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('suppliers.zipCode')}
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.country')}
                  name="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.taxId')}
                  name="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('suppliers.paymentTerms')}
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography component="legend">{t('suppliers.rating')}</Typography>
                  <Rating
                    name="rating"
                    value={formData.rating}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, rating: newValue });
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingSupplier ? t('common.update') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Suppliers;
