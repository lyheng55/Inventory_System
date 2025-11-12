import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
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
  Pagination,
  InputAdornment,
  Alert,
  Tabs,
  Tab,
  // Item,
  // ItemText,
  // ItemSecondaryAction,
  Switch,
  FormControlLabel,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Person,
  PersonAdd,
  PersonRemove,
  Visibility,
  VisibilityOff,
  Save,
  AdminPanelSettings,
  SupervisorAccount,
  PersonPin
} from '@mui/icons-material';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';
import {useAuth} from '../../contexts/AuthContext';

const Users = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // const [viewingUser, setViewingUser] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'sales_staff',
    isActive: true
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    current: false,
    new: false,
    confirm: false
  });

  // Check if current user is admin
  const isAdmin = Boolean(currentUser?.role === 'admin');

  // Fetch users
  const { data: usersData, isLoading } = useQuery(
    ['users', page, search, roleFilter, statusFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { isActive: statusFilter })
      });
      const response = await axios.get(`/users?${params}`);
      return response.data;
    },
    { enabled: isAdmin }
  );

  // Fetch user statistics
  const { data: userStats } = useQuery(
    'userStats',
    async () => {
      const response = await axios.get('/users/stats/overview');
      return response.data;
    },
    { enabled: isAdmin }
  );

  // Fetch roles from database
  const { data: rolesData } = useQuery(
    'roles',
    async () => {
      try {
        // The endpoint is /api/auth/permissions/roles
        const response = await axios.get('/auth/permissions/roles');
        // The API returns { roles: [...] }
        if (response.data?.roles && Array.isArray(response.data.roles)) {
          return response.data.roles;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.warn('Failed to fetch roles from database:', error);
        return [];
      }
    },
    {
      initialData: []
    }
  );

  // Ensure roles is always an array
  const roles = Array.isArray(rolesData) ? rolesData : [];

  // Create user mutation
  const createUserMutation = useMutation(
    (userData) => axios.post('/users', userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('userStats');
        setOpenDialog(false);
        resetForm();
        alert(t('users.userCreatedSuccess'));
      },
      onError: (error) => {
        console.error('Create user error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Form data being sent:', formData);
        
        let errorMessage = 'Failed to create user: ';
        if (error.response?.data?.details) {
          errorMessage += error.response.data.details.join(', ');
        } else if (error.response?.data?.error) {
          errorMessage += error.response.data.error;
        } else {
          errorMessage += error.message;
        }
        
        alert(errorMessage);
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, userData }) => axios.put(`/users/${id}`, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('userStats');
        setOpenDialog(false);
        setEditingUser(null);
        resetForm();
        alert(t('users.userUpdatedSuccess'));
      },
      onError: (error) => {
        console.error('Update user error:', error);
        alert('Failed to update user: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    ({ id, passwordData }) => axios.put(`/users/${id}/change-password`, passwordData),
    {
      onSuccess: () => {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert(t('users.passwordChangedSuccess'));
      },
      onError: (error) => {
        console.error('Change password error:', error);
        alert('Failed to change password: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  // Deactivate user mutation
  const deactivateUserMutation = useMutation(
    (id) => axios.delete(`/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('userStats');
        alert(t('users.userDeactivatedSuccess'));
      },
      onError: (error) => {
        console.error('Deactivate user error:', error);
        alert('Failed to deactivate user: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  // Reactivate user mutation
  const reactivateUserMutation = useMutation(
    (id) => axios.put(`/users/${id}/reactivate`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('userStats');
        alert(t('users.userReactivatedSuccess'));
      },
      onError: (error) => {
        console.error('Reactivate user error:', error);
        alert('Failed to reactivate user: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'sales_staff',
      isActive: true
    });
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setTabValue(0);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName) {
      alert(t('users.fillAllFields'));
      return;
    }

    if (!editingUser && !formData.password) {
      alert(t('users.passwordRequired'));
      return;
    }

    const userData = {
      ...formData,
      ...(editingUser ? {} : { password: formData.password })
    };

    console.log('Submitting user data:', userData);
    console.log('Current user role:', currentUser?.role);
    console.log('Is admin:', isAdmin);

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData });
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('users.passwordsDoNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert(t('users.passwordMinLength'));
      return;
    }

    changePasswordMutation.mutate({
      id: editingUser.id,
      passwordData: {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }
    });
  };

  const handleDeactivate = (user) => {
    if (window.confirm(t('users.confirmDeactivate', { name: `${user.firstName} ${user.lastName}` }))) {
      deactivateUserMutation.mutate(user.id);
    }
  };

  const handleReactivate = (user) => {
    if (window.confirm(t('users.confirmReactivate', { name: `${user.firstName} ${user.lastName}` }))) {
      reactivateUserMutation.mutate(user.id);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'inventory_manager': return 'warning';
      case 'sales_staff': return 'info';
      case 'auditor': return 'secondary';
      default: return 'default';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings />;
      case 'inventory_manager': return <SupervisorAccount />;
      case 'sales_staff': return <PersonPin />;
      case 'auditor': return <Person />;
      default: return <Person />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return t('users.admin');
      case 'inventory_manager': return t('users.inventoryManager');
      case 'sales_staff': return t('users.salesStaff');
      case 'auditor': return t('users.auditor');
      default: return role;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Alert severity="error">
          {t('users.accessDenied')}
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>{t('users.loadingUsers')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('users.userManagement')}</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          {t('users.addUser')}
        </Button>
      </Box>

      {/* Statistics Cards */}
      {userStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('users.totalUsers')}
                </Typography>
                <Typography variant="h4">
                  {userStats.totalUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('users.activeUsers')}
                </Typography>
                <Typography variant="h4" color="success.main">
                  {userStats.activeUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('users.inactiveUsers')}
                </Typography>
                <Typography variant="h4" color="error.main">
                  {userStats.inactiveUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('users.admins')}
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {userStats.roleStats.find(r => r.role === 'admin')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                placeholder={t('users.searchUsers')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{t('users.role')}</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label={t('users.role')}
                >
                  <MenuItem value="">{t('users.allRoles')}</MenuItem>
                  {roles.length === 0 ? (
                    <MenuItem disabled value="">
                      <em>Loading roles...</em>
                    </MenuItem>
                  ) : (
                    roles.map((role) => (
                      <MenuItem key={role.id} value={role.name}>
                        {role.displayName || role.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{t('common.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label={t('common.status')}
                >
                  <MenuItem value="">{t('users.allStatus')}</MenuItem>
                  <MenuItem value="true">{t('users.active')}</MenuItem>
                  <MenuItem value="false">{t('users.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
                <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
              >
                {t('common.clear')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('users.user')}</TableCell>
                <TableCell>{t('users.email')}</TableCell>
                <TableCell>{t('users.role')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('users.lastLogin')}</TableCell>
                <TableCell>{t('users.created')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersData?.users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? t('users.active') : t('users.inactive')}
                      color={user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? formatDate(user.lastLogin) : t('users.never')}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('users.editUser')}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {user.isActive ? (
                        <Tooltip title={t('users.deactivateUser')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeactivate(user)}
                            disabled={user.id === currentUser.id}
                          >
                            <PersonRemove />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={t('users.reactivateUser')}>
                          <IconButton
                            size="small"
                            onClick={() => handleReactivate(user)}
                          >
                            <PersonAdd />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {usersData?.pagination && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={usersData.pagination.totalPages}
              page={usersData.pagination.currentPage}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Card>

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? t('users.editUser') : t('users.addNewUser')}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab label={t('users.userDetails')} />
            {editingUser && <Tab label={t('users.changePassword')} />}
          </Tabs>

          {tabValue === 0 && (
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('users.username')}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={editingUser}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('users.email')}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('users.firstName')}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('users.lastName')}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </Grid>
                {!editingUser && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('users.password')}
                      type={showPasswords.password ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                            >
                              {showPasswords.password ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('users.role')}</InputLabel>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      label={t('users.role')}
                      disabled={roles.length === 0}
                    >
                      {roles.length === 0 ? (
                        <MenuItem disabled value="">
                          <em>Loading roles...</em>
                        </MenuItem>
                      ) : (
                        roles.map((role) => (
                          <MenuItem key={role.id} value={role.name}>
                            {role.displayName || role.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                    }
                    label={t('users.isActive')}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {tabValue === 1 && editingUser && (
            <Box component="form" onSubmit={handleChangePassword}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('users.currentPassword')}
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          >
                            {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('users.newPassword')}
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          >
                            {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('users.confirmNewPassword')}
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          >
                            {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          {tabValue === 0 ? (
            <Button
              onClick={handleSubmit}
              variant="contained"
              startIcon={<Save />}
              disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
            >
              {editingUser ? t('common.update') : t('common.create')}
            </Button>
          ) : (
            <Button
              onClick={handleChangePassword}
              variant="contained"
              startIcon={<Save />}
              disabled={changePasswordMutation.isLoading}
            >
              {t('users.changePassword')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
