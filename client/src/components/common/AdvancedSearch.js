import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Clear,
  Search
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import axios from '../../utils/axios';

const AdvancedSearch = ({ entity, onResults, onClose }) => {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ field: '', direction: 'asc' });
  const [pagination] = useState({ page: 1, limit: 20 });
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const queryClient = useQueryClient();

  // Fetch saved filters
  const { data: filtersData } = useQuery(
    ['savedFilters', entity],
    async () => {
      const response = await axios.get(`/search/filters?entity=${entity}`);
      return response.data;
    }
  );

  React.useEffect(() => {
    if (filtersData?.filters) {
      setSavedFilters(filtersData.filters);
    }
  }, [filtersData]);

  // Advanced search mutation
  const searchMutation = useMutation(
    async (searchData) => {
      const response = await axios.post('/search/advanced', searchData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        onResults(data);
      }
    }
  );

  // Save filter mutation
  const saveFilterMutation = useMutation(
    async (filterData) => {
      const response = await axios.post('/search/filters', filterData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['savedFilters', entity]);
        setFilterName('');
      }
    }
  );

  const getEntityFields = (entityType) => {
    const fields = {
      products: [
        { name: 'name', label: 'Product Name', type: 'text' },
        { name: 'sku', label: 'SKU', type: 'text' },
        { name: 'categoryId', label: 'Category', type: 'select' },
        { name: 'unitPrice', label: 'Unit Price', type: 'range' },
        { name: 'costPrice', label: 'Cost Price', type: 'range' },
        { name: 'isActive', label: 'Active', type: 'boolean' }
      ],
      suppliers: [
        { name: 'name', label: 'Supplier Name', type: 'text' },
        { name: 'contactPerson', label: 'Contact Person', type: 'text' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'isActive', label: 'Active', type: 'boolean' }
      ],
      warehouses: [
        { name: 'name', label: 'Warehouse Name', type: 'text' },
        { name: 'code', label: 'Code', type: 'text' },
        { name: 'capacity', label: 'Capacity', type: 'range' },
        { name: 'isActive', label: 'Active', type: 'boolean' }
      ],
      users: [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
        { name: 'role', label: 'Role', type: 'select' }
      ],
      'purchase-orders': [
        { name: 'orderNumber', label: 'Order Number', type: 'text' },
        { name: 'status', label: 'Status', type: 'select' },
        { name: 'supplierId', label: 'Supplier', type: 'select' },
        { name: 'warehouseId', label: 'Warehouse', type: 'select' },
        { name: 'totalAmount', label: 'Total Amount', type: 'range' },
        { name: 'orderDate', label: 'Order Date', type: 'date' }
      ]
    };
    return fields[entityType] || [];
  };

  const getSelectOptions = (fieldName, entityType) => {
    // This would typically fetch from API
    const options = {
      categoryId: [
        { value: 1, label: 'Electronics' },
        { value: 2, label: 'Clothing' },
        { value: 3, label: 'Books' }
      ],
      role: [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Staff' }
      ],
      status: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'ordered', label: 'Ordered' },
        { value: 'received', label: 'Received' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    };
    return options[fieldName] || [];
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // const handleSortChange = (field) => {
  //   setSort(prev => ({
  //     field,
  //     direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
  //   }));
  // };

  const handleSearch = () => {
    searchMutation.mutate({
      entity,
      filters,
      sort,
      pagination
    });
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    saveFilterMutation.mutate({
      name: filterName,
      entity,
      filters,
      sort,
      isPublic
    });
  };

  const handleLoadFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    setSort(savedFilter.sort);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSort({ field: '', direction: 'asc' });
  };

  const renderFilterField = (field) => {
    const value = filters[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFilterChange(field.name, e.target.value)}
            size="small"
          />
        );

      case 'select':
        const options = getSelectOptions(field.name, entity);
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFilterChange(field.name, e.target.value)}
              label={field.label}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFilterChange(field.name, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'range':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {field.label}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min"
                  type="number"
                  value={value?.min || ''}
                  onChange={(e) => handleFilterChange(field.name, {
                    ...value,
                    min: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max"
                  type="number"
                  value={value?.max || ''}
                  onChange={(e) => handleFilterChange(field.name, {
                    ...value,
                    max: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 'date':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={value?.from || ''}
                onChange={(e) => handleFilterChange(field.name, {
                  ...value,
                  from: e.target.value
                })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={value?.to || ''}
                onChange={(e) => handleFilterChange(field.name, {
                  ...value,
                  to: e.target.value
                })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  const fields = getEntityFields(entity);
  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
  ).length;

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Advanced Search - {entity.charAt(0).toUpperCase() + entity.slice(1)}
        </Typography>
        <Box>
          <Button
            startIcon={<Clear />}
            onClick={handleClearFilters}
            disabled={activeFiltersCount === 0}
          >
            Clear ({activeFiltersCount})
          </Button>
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{ ml: 1 }}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">Saved Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {savedFilters.map((filter) => (
                <Chip
                  key={filter.id}
                  label={filter.name}
                  onClick={() => handleLoadFilter(filter)}
                  variant="outlined"
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Filters */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {fields.map((field) => (
              <Grid item xs={12} sm={6} md={4} key={field.name}>
                {renderFilterField(field)}
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Sort Options */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Sort Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sort.field}
                  onChange={(e) => setSort(prev => ({ ...prev, field: e.target.value }))}
                  label="Sort By"
                >
                  {fields.map((field) => (
                    <MenuItem key={field.name} value={field.name}>
                      {field.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction</InputLabel>
                <Select
                  value={sort.direction}
                  onChange={(e) => setSort(prev => ({ ...prev, direction: e.target.value }))}
                  label="Direction"
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Save Filter */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Save Current Filter</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Filter Name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                }
                label="Public"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
              >
                Save
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default AdvancedSearch;
