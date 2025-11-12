import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  Grid,
  Alert,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  Add,
  Person,
  Security,
  Refresh,
  Search,
  Group,
  Save
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import axios from '../../utils/axios';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../../components/common/PermissionGuard';
import { PERMISSIONS } from '../../config/permissions';
import {
  User,
  Permission,
  Role,
  UserPermission,
  RolePermission
} from '../../types';

interface RolesResponse {
  roles?: Role[];
}

interface PermissionsResponse {
  permissions?: Permission[];
}

interface UsersResponse {
  users: User[];
}

interface UserPermissionsResponse {
  permissions?: UserPermission[];
}

interface RolePermissionsResponse {
  permissions?: RolePermission[];
}

interface CrudFlags {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface PermissionStatus {
  granted: boolean;
  source: 'user' | 'role' | 'none';
}

interface RolePermissionStatus {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const Permissions: React.FC = () => {
  const { t } = useTranslation();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState<boolean>(false);
  const [permissionToRevoke, setPermissionToRevoke] = useState<Permission | null>(null);
  const [crudFlags, setCrudFlags] = useState<CrudFlags>({
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false
  });

  // Fetch all roles
  const { data: rolesData } = useQuery<RolesResponse>(
    'roles',
    async () => {
      const response = await axios.get('/auth/permissions/roles');
      return response.data;
    },
    { enabled: checkPermission(PERMISSIONS.VIEW_USERS) }
  );

  // Fetch all permissions
  const { data: permissionsData } = useQuery<PermissionsResponse>(
    'permissions',
    async () => {
      const response = await axios.get('/auth/permissions');
      return response.data;
    },
    { enabled: checkPermission(PERMISSIONS.VIEW_USERS) }
  );

  // Fetch all users
  const { data: usersData } = useQuery<UsersResponse>(
    'users',
    async () => {
      const response = await axios.get('/users?limit=1000');
      const data = response.data;
      if (Array.isArray(data)) return { users: data };
      if (data && Array.isArray((data as any).users)) return data as UsersResponse;
      return { users: [] };
    },
    { enabled: checkPermission(PERMISSIONS.VIEW_USERS) }
  );

  // Fetch user permissions
  const { data: userPermissionsData, refetch: refetchUserPerms, isLoading: userPermissionsLoading } = useQuery<UserPermissionsResponse | null>(
    ['userPermissions', selectedUser?.id],
    async () => {
      if (!selectedUser) return null;
      const response = await axios.get(`/auth/permissions/user/${selectedUser.id}`);
      return response.data;
    },
    { 
      enabled: !!selectedUser && checkPermission(PERMISSIONS.VIEW_USERS),
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider data stale to allow refetching
      cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      refetchOnMount: true // Always refetch when component mounts
    }
  );

  // Fetch role permissions
  const { data: rolePermissionsData, refetch: refetchRolePerms } = useQuery<RolePermissionsResponse | null>(
    ['rolePermissions', selectedRole],
    async () => {
      if (!selectedRole) return null;
      const response = await axios.get(`/auth/permissions/role/${selectedRole}`);
      return response.data;
    },
    { 
      enabled: !!selectedRole && checkPermission(PERMISSIONS.VIEW_USERS),
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider data stale to allow refetching
      cacheTime: 5 * 60 * 1000 // Keep in cache for 5 minutes
    }
  );

  // Track which permission is currently being updated
  const [updatingPermissionId, setUpdatingPermissionId] = useState<number | null>(null);

  // Grant/Deny user permission mutation
  const grantUserPermissionMutation = useMutation(
    async ({ userId, permissionId, granted }: { userId: number; permissionId: number; granted: boolean }) => {
      // Set the updating permission ID to disable only that switch
      setUpdatingPermissionId(permissionId);
      
      // Convert granted flag to CRUD flags
      // If granted is true, set canRead to true (minimum permission)
      // If granted is false, set all CRUD flags to false
      const response = await axios.post(`/auth/permissions/user/${userId}`, {
        permissionId,
        canCreate: granted ? false : false, // Keep create/update/delete false for simple toggle
        canRead: granted ? true : false,    // Read is the main permission flag
        canUpdate: granted ? false : false,
        canDelete: granted ? false : false
      });
      return { ...response.data, permissionId, granted };
    },
    {
      onMutate: async ({ userId, permissionId, granted }) => {
        // Cancel any outgoing refetches to avoid overwriting optimistic update
        await queryClient.cancelQueries(['userPermissions', userId]);
        
        // Snapshot the previous value
        const previousPermissions = queryClient.getQueryData(['userPermissions', userId]);
        
        // Optimistically update only the specific permission
        queryClient.setQueryData(['userPermissions', userId], (old: any) => {
          if (!old) return old;
          
          // Handle both { permissions: [...] } and direct array formats
          const permissionsArray = Array.isArray(old.permissions) ? old.permissions : 
                                  Array.isArray(old) ? old : [];
          
          const updatedPermissions = permissionsArray.map((perm: any) => {
            // Only update the permission that matches the permissionId exactly
            const permId = perm.id || perm.Permission?.id;
            if (permId === permissionId) {
              // Update only this specific permission
              const updated = {
                ...perm,
                canRead: granted,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
                granted: granted,
                source: 'user' as const
              };
              // Preserve nested Permission object if it exists
              if (perm.Permission) {
                updated.Permission = {
                  ...perm.Permission,
                  canRead: granted,
                  granted: granted
                };
              }
              return updated;
            }
            // Return other permissions completely unchanged
            return perm;
          });
          
          // Return in the same format as received
          if (old.permissions) {
            return {
              ...old,
              permissions: updatedPermissions
            };
          }
          return updatedPermissions;
        });
        
        return { previousPermissions };
      },
      onError: (error: any, variables, context) => {
        // Rollback to previous value on error
        if (context?.previousPermissions) {
          queryClient.setQueryData(['userPermissions', variables.userId], context.previousPermissions);
        }
        // Clear the updating permission ID on error
        setUpdatingPermissionId(null);
        console.error('Permission mutation error:', error);
        alert(`Failed to update permission: ${error.response?.data?.message || error.message}`);
      },
      onSuccess: (data, variables) => {
        // Clear the updating permission ID
        setUpdatingPermissionId(null);
        // Invalidate and refetch to ensure we have the latest data from server
        queryClient.invalidateQueries(['userPermissions', variables.userId]);
        queryClient.refetchQueries(['userPermissions', variables.userId]);
        setEditDialogOpen(false);
      },
      onSettled: (data, error, variables) => {
        // Clear the updating permission ID
        setUpdatingPermissionId(null);
      }
    }
  );

  // Grant role permission mutation
  const grantRolePermissionMutation = useMutation(
    async ({ role, permissionId, canCreate, canRead, canUpdate, canDelete }: { 
      role: string; 
      permissionId: number; 
      canCreate: boolean; 
      canRead: boolean; 
      canUpdate: boolean; 
      canDelete: boolean;
    }) => {
      const response = await axios.post(`/auth/permissions/role/${role}`, {
        permissionId,
        canCreate: canCreate || false,
        canRead: canRead !== undefined ? canRead : true,
        canUpdate: canUpdate || false,
        canDelete: canDelete || false
      });
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['rolePermissions', variables.role]);
        queryClient.refetchQueries(['rolePermissions', variables.role]);
        queryClient.invalidateQueries('permissions');
        // Reset state after successful save
        setEditDialogOpen(false);
        setEditingPermission(null);
        setCrudFlags({
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false
        });
      },
      onError: (error: any) => {
        console.error('Role permission mutation error:', error);
        alert(`Failed to update role permission: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Revoke role permission mutation
  const revokeRolePermissionMutation = useMutation(
    async ({ role, permissionId }: { role: string; permissionId: number }) => {
      await axios.delete(`/auth/permissions/role/${role}/${permissionId}`);
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['rolePermissions', variables.role]);
        queryClient.refetchQueries(['rolePermissions', variables.role]);
        queryClient.invalidateQueries('permissions');
      },
      onError: (error: any) => {
        console.error('Revoke role permission error:', error);
        alert(`Failed to revoke permission: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  const permissions = permissionsData && Array.isArray(permissionsData.permissions) ? permissionsData.permissions : 
                      Array.isArray(permissionsData) ? permissionsData : [];
  const roles = rolesData && Array.isArray(rolesData.roles) ? rolesData.roles : 
                Array.isArray(rolesData) ? rolesData : [];
  const users = usersData && Array.isArray(usersData.users) ? usersData.users : 
                Array.isArray(usersData) ? usersData : [];
  const userPermissions = userPermissionsData && Array.isArray(userPermissionsData.permissions) ? userPermissionsData.permissions : 
                          Array.isArray(userPermissionsData) ? userPermissionsData : [];
  const rolePermissions = rolePermissionsData && Array.isArray(rolePermissionsData.permissions) ? rolePermissionsData.permissions : 
                          Array.isArray(rolePermissionsData) ? rolePermissionsData : [];

  // Filter permissions based on search
  const filteredPermissions = useMemo(() => {
    if (!searchTerm) return permissions;
    const searchLower = searchTerm.toLowerCase();
    return permissions.filter(perm =>
      perm.name?.toLowerCase().includes(searchLower) ||
      perm.key?.toLowerCase().includes(searchLower) ||
      perm.category?.toLowerCase().includes(searchLower)
    );
  }, [permissions, searchTerm]);

  // Get permission status for user
  const getUserPermissionStatus = (permission: Permission): PermissionStatus => {
    if (!permission || !permission.id) {
      return { granted: false, source: 'none' };
    }
    
    // Try to find permission by id first (most specific), then by key
    // Priority: exact ID match > nested Permission ID match > key match
    const userPerm = userPermissions.find((p: any) => {
      // First try exact ID match
      if (p.id === permission.id) return true;
      // Then try nested Permission ID match
      if (p.Permission?.id === permission.id) return true;
      // Only use key matching if IDs don't match (fallback)
      // But be careful - keys might not be unique
      if (!p.id && !p.Permission?.id) {
        if (p.key === permission.key) return true;
        if (p.Permission?.key === permission.key) return true;
      }
      return false;
    });
    
    if (!userPerm) {
      // Permission not found in user-specific permissions
      // Return not granted (user-specific permissions override role permissions)
      return { granted: false, source: 'none' };
    }
    
    // Handle nested Permission object
    const perm = (userPerm as any).Permission || userPerm;
    
    // Calculate granted status from CRUD flags
    // canRead is the primary indicator, but any CRUD flag being true means granted
    const granted = Boolean(
      perm.granted !== undefined ? perm.granted :
      (perm.canRead || perm.canCreate || perm.canUpdate || perm.canDelete)
    );
    
    return { 
      granted: granted, 
      source: perm.source || (userPerm as any).source || 'user' 
    };
  };

  // Get permission status for role
  const getRolePermissionStatus = (permission: Permission): RolePermissionStatus | null => {
    if (!permission || !permission.id) return null;
    
    const rolePerm = rolePermissions.find((p: any) => {
      // Try multiple matching strategies
      const permId = p.id || p.permissionId || (p.Permission && p.Permission.id);
      const permKey = p.key || (p.Permission && p.Permission.key);
      
      return (
        permId === permission.id ||
        permKey === permission.key ||
        (p.Permission && p.Permission.id === permission.id) ||
        (p.Permission && p.Permission.key === permission.key)
      );
    });
    
    if (!rolePerm) return null;
    
    // Handle nested Permission object
    const perm = (rolePerm as any).Permission || rolePerm;
    
    // Use explicit boolean checks, not || which treats false as falsy
    return {
      canCreate: perm.canCreate === true || (rolePerm as any).canCreate === true,
      canRead: perm.canRead !== undefined ? perm.canRead : ((rolePerm as any).canRead !== undefined ? (rolePerm as any).canRead : true),
      canUpdate: perm.canUpdate === true || (rolePerm as any).canUpdate === true,
      canDelete: perm.canDelete === true || (rolePerm as any).canDelete === true
    };
  };

  const handleToggleUserPermission = (permission: Permission, event: React.ChangeEvent<HTMLInputElement> | React.MouseEvent): void => {
    // Prevent any event propagation
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!selectedUser || !permission || !permission.id) {
      console.warn('Cannot toggle permission: missing user or permission data', { selectedUser, permission });
      return;
    }
    
    // Ensure we have a valid permission ID
    const permissionId = permission.id;
    if (!permissionId) {
      console.error('Permission ID is missing', permission);
      alert('Error: Permission ID is missing. Please refresh the page.');
      return;
    }
    
    const status = getUserPermissionStatus(permission);
    const newGrantedState = !status.granted;
    
    // Only mutate this specific permission
    grantUserPermissionMutation.mutate({
      userId: selectedUser.id,
      permissionId: permissionId,
      granted: newGrantedState
    });
  };

  const handleEditRolePermission = (permission: Permission): void => {
    if (!permission || !permission.id) {
      console.error('Invalid permission provided to handleEditRolePermission', permission);
      return;
    }
    
    const status = getRolePermissionStatus(permission);
    // Set the editing permission first
    setEditingPermission(permission);
    
    // Reset and set CRUD flags for this specific permission
    if (status) {
      setCrudFlags({
        canCreate: status.canCreate || false,
        canRead: status.canRead !== undefined ? status.canRead : true,
        canUpdate: status.canUpdate || false,
        canDelete: status.canDelete || false
      });
    } else {
      setCrudFlags({
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false
      });
    }
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = (): void => {
    setEditDialogOpen(false);
    // Reset state when dialog closes to prevent affecting other records
    setEditingPermission(null);
    setCrudFlags({
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false
    });
  };

  const handleSaveRolePermission = (): void => {
    if (!selectedRole || !editingPermission || !editingPermission.id) {
      console.error('Cannot save: missing role or permission data', { selectedRole, editingPermission });
      return;
    }
    
    // Ensure we're using the specific permission ID
    const permissionId = editingPermission.id;
    
    grantRolePermissionMutation.mutate({
      role: selectedRole,
      permissionId: permissionId,
      canCreate: crudFlags.canCreate || false,
      canRead: crudFlags.canRead !== undefined ? crudFlags.canRead : true,
      canUpdate: crudFlags.canUpdate || false,
      canDelete: crudFlags.canDelete || false
    });
  };

  const handleRevokeRolePermission = (permission: Permission): void => {
    if (!selectedRole) return;
    setPermissionToRevoke(permission);
    setRevokeDialogOpen(true);
  };

  const confirmRevokeRolePermission = (): void => {
    if (!selectedRole || !permissionToRevoke) return;
    revokeRolePermissionMutation.mutate({
      role: selectedRole,
      permissionId: permissionToRevoke.id
    });
    setRevokeDialogOpen(false);
    setPermissionToRevoke(null);
  };

  const handleRefresh = (): void => {
    queryClient.invalidateQueries('permissions');
    queryClient.invalidateQueries('users');
    queryClient.invalidateQueries('roles');
    if (selectedUser) refetchUserPerms();
    if (selectedRole) refetchRolePerms();
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('permissions.title') || 'Permissions Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('permissions.subtitle')}
          </Typography>
        </Box>
        <PermissionGuard permission={PERMISSIONS.VIEW_USERS}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            {t('common.refresh') || 'Refresh'}
          </Button>
        </PermissionGuard>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel - User/Role Selection */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('permissions.selectUser')}
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('permissions.user')}</InputLabel>
                <Select
                  value={selectedUser?.id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    setSelectedUser(user || null);
                    setSelectedRole(''); // Clear role selection when user is selected
                  }}
                  label={t('permissions.user')}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="h6" gutterBottom>
                {t('permissions.selectRole')}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>{t('permissions.role')}</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setSelectedUser(null); // Clear user selection when role is selected
                  }}
                  label={t('permissions.role')}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.displayName || role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedUser && (
                <Box mt={2} p={2} bgcolor="action.selected" borderRadius={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedUser.email}
                  </Typography>
                  <Chip label={selectedUser.role} size="small" sx={{ mt: 1 }} />
                </Box>
              )}

              {selectedRole && (
                <Box mt={2} p={2} bgcolor="action.selected" borderRadius={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('permissions.rolePermissions')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Permissions Table */}
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {selectedUser ? `${t('permissions.permissionsFor')} ${selectedUser.firstName} ${selectedUser.lastName}` :
                   selectedRole ? `${t('permissions.permissionsFor')} ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ')}` :
                   t('permissions.allPermissions')}
                </Typography>
                <TextField
                  size="small"
                  placeholder={t('permissions.searchPermissions')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('permissions.permission')}</strong></TableCell>
                      <TableCell><strong>{t('permissions.category')}</strong></TableCell>
                      {selectedUser && <TableCell align="center"><strong>{t('permissions.status')}</strong></TableCell>}
                      {selectedUser && <TableCell align="center"><strong>{t('permissions.source')}</strong></TableCell>}
                      {selectedUser && <TableCell align="center"><strong>{t('permissions.action')}</strong></TableCell>}
                      {selectedRole && <TableCell align="center"><strong>{t('permissions.crud')}</strong></TableCell>}
                      {selectedRole && <TableCell align="center"><strong>{t('permissions.actions')}</strong></TableCell>}
                      {!selectedUser && !selectedRole && <TableCell><strong>{t('permissions.description')}</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPermissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedUser ? 5 : selectedRole ? 4 : 3} align="center">
                          <Alert severity="info">{t('permissions.noPermissionsFound')}</Alert>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPermissions.map((permission) => {
                        if (selectedUser) {
                          const status = getUserPermissionStatus(permission);
                          return (
                            <TableRow 
                              key={permission.id} 
                              hover
                              onClick={(e) => {
                                // Prevent row click from doing anything - only allow switch clicks
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Typography variant="body2" fontWeight="medium">
                                  {permission.name || permission.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.key}
                                </Typography>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Chip label={permission.category || 'other'} size="small" />
                              </TableCell>
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <Chip
                                  icon={status.granted ? <CheckCircle /> : <Cancel />}
                                  label={status.granted ? t('permissions.granted') : t('permissions.denied')}
                                  color={status.granted ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <Chip
                                  label={status.source === 'user' ? t('permissions.user') : status.source === 'role' ? t('permissions.role') : t('permissions.none')}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell 
                                align="center" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Switch
                                  checked={Boolean(status.granted)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    // Only toggle this specific permission - pass the event and permission
                                    handleToggleUserPermission(permission, e);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  size="small"
                                  disabled={updatingPermissionId === permission.id || grantUserPermissionMutation.isLoading}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        } else if (selectedRole) {
                          const status = getRolePermissionStatus(permission);
                          return (
                            <TableRow key={permission.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {permission.name || permission.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.key}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={permission.category || 'other'} size="small" />
                              </TableCell>
                              <TableCell align="center">
                                {status ? (
                                  <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                                    {status.canCreate && <Chip label={t('permissions.create')} size="small" color="primary" variant="outlined" />}
                                    {status.canRead && <Chip label={t('permissions.read')} size="small" color="success" variant="outlined" />}
                                    {status.canUpdate && <Chip label={t('permissions.update')} size="small" color="warning" variant="outlined" />}
                                    {status.canDelete && <Chip label={t('permissions.delete')} size="small" color="error" variant="outlined" />}
                                    {!status.canCreate && !status.canRead && !status.canUpdate && !status.canDelete && (
                                      <Typography variant="caption" color="text.secondary">{t('permissions.noCrudPermissions')}</Typography>
                                    )}
                                  </Stack>
                                ) : (
                                  <Chip label={t('permissions.notGranted')} size="small" variant="outlined" color="default" />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" gap={1} justifyContent="center" alignItems="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditRolePermission(permission)}
                                    color="primary"
                                    title={status ? t('permissions.editPermission') : t('permissions.grantPermission')}
                                  >
                                    <Edit />
                                  </IconButton>
                                  {status && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRevokeRolePermission(permission)}
                                      color="error"
                                      title={t('permissions.revokePermission')}
                                    >
                                      <Delete />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          return (
                            <TableRow key={permission.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {permission.name || permission.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.key}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={permission.category || 'other'} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {permission.description || t('permissions.noDescription')}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {!selectedUser && !selectedRole && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('permissions.selectUserOrRole')}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Role Permission Dialog */}
      <Dialog 
        key={editingPermission?.id || 'edit-dialog'} 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {t('permissions.editPermissionTitle')}: {editingPermission?.name || editingPermission?.displayName || t('permissions.unknown')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {editingPermission?.key || editingPermission?.name || editingPermission?.displayName || t('permissions.unknown')}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('permissions.crudPermissions')}
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>{t('permissions.create')}</Typography>
                <Switch
                  checked={crudFlags.canCreate}
                  onChange={(e) => setCrudFlags({ ...crudFlags, canCreate: e.target.checked })}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>{t('permissions.read')}</Typography>
                <Switch
                  checked={crudFlags.canRead}
                  onChange={(e) => setCrudFlags({ ...crudFlags, canRead: e.target.checked })}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>{t('permissions.update')}</Typography>
                <Switch
                  checked={crudFlags.canUpdate}
                  onChange={(e) => setCrudFlags({ ...crudFlags, canUpdate: e.target.checked })}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>{t('permissions.delete')}</Typography>
                <Switch
                  checked={crudFlags.canDelete}
                  onChange={(e) => setCrudFlags({ ...crudFlags, canDelete: e.target.checked })}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSaveRolePermission}
            variant="contained"
            startIcon={<Save />}
            disabled={grantRolePermissionMutation.isLoading || !editingPermission}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Permission Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('permissions.revokePermissionTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {t('permissions.confirmRevoke', { 
              permission: permissionToRevoke?.name || permissionToRevoke?.displayName || t('permissions.unknown'),
              role: selectedRole 
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('permissions.revokeWarning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRevokeDialogOpen(false);
            setPermissionToRevoke(null);
          }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmRevokeRolePermission}
            variant="contained"
            color="error"
            disabled={revokeRolePermissionMutation.isLoading}
          >
            {t('permissions.revokePermission')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Permissions;

