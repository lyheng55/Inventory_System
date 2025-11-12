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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';

const Categories = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
  });

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery(
    'categories',
    async () => {
      const response = await axios.get('/categories');
      return response.data;
    }
  );

  const createCategoryMutation = useMutation(
    (categoryData) => axios.post('/categories', categoryData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        setOpenDialog(false);
        resetForm();
      }
    }
  );

  const updateCategoryMutation = useMutation(
    ({ id, categoryData }) => axios.put(`/categories/${id}`, categoryData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        setOpenDialog(false);
        setEditingCategory(null);
        resetForm();
      }
    }
  );

  const deleteCategoryMutation = useMutation(
    (id) => axios.delete(`/categories/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentId: ''
    });
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || ''
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const categoryData = {
      ...formData,
      parentId: formData.parentId || null
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, categoryData });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };

  const handleDelete = (category) => {
    if (window.confirm(t('categories.confirmDelete', { name: category.name }))) {
      deleteCategoryMutation.mutate(category.id);
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
          {t('categories.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          {t('categories.addCategory')}
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('common.description')}</TableCell>
                <TableCell>{t('categories.parentCategory')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Category />
                      {category.name}
                    </Box>
                  </TableCell>
                  <TableCell>{category.description || t('common.noData')}</TableCell>
                  <TableCell>
                    {category.parent ? category.parent.name : t('categories.rootCategory')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category.isActive ? t('common.active') : t('common.inactive')}
                      color={category.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(category)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(category)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('categories.categoryName')}
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('common.description')}
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('categories.parentCategory')}</InputLabel>
                  <Select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    label={t('categories.parentCategory')}
                  >
                    <MenuItem value="">{t('categories.rootCategory')}</MenuItem>
                    {categories?.filter(cat => cat.id !== editingCategory?.id).map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingCategory ? t('common.update') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Categories;
