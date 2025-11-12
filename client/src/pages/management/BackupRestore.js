import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  TextField,
  LinearProgress
} from '@mui/material';
import {
  Backup,
  Restore,
  Refresh,
  Delete,
  CloudDownload,
  Storage,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from '../../utils/axios';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';

const BackupRestore = () => {
  const { t } = useTranslation();
  const { checkPermission, PERMISSIONS } = usePermissions();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupOptions, setBackupOptions] = useState({
    compress: true,
    includeData: true
  });
  const [restoreOptions, setRestoreOptions] = useState({
    dropDatabase: false,
    createDatabase: true
  });
  const [keepCount, setKeepCount] = useState(30);

  // Check permission - must be done before hooks but hooks must be called regardless
  const hasPermission = checkPermission(PERMISSIONS.VIEW_USERS);

  // Fetch backup list
  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups } = useQuery(
    'backups',
    async () => {
      const response = await axios.get('/backup/list');
      return response.data;
    },
    {
      enabled: hasPermission,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch backup statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'backupStats',
    async () => {
      const response = await axios.get('/backup/stats');
      return response.data;
    },
    {
      enabled: hasPermission,
      refetchInterval: 60000 // Refresh every minute
    }
  );

  // Create backup mutation
  const createBackupMutation = useMutation(
    async (options) => {
      const response = await axios.post('/backup/create', options);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('backups');
        queryClient.invalidateQueries('backupStats');
        setCreateDialogOpen(false);
      }
    }
  );

  // Restore backup mutation
  const restoreBackupMutation = useMutation(
    async ({ filename, options }) => {
      const response = await axios.post('/backup/restore', { filename, ...options });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('backups');
        queryClient.invalidateQueries('backupStats');
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
      }
    }
  );

  // Delete backup mutation
  const deleteBackupMutation = useMutation(
    async (filename) => {
      // Note: There's no delete endpoint, but we can add cleanup functionality
      const response = await axios.delete(`/backup/cleanup?keepCount=999`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('backups');
        queryClient.invalidateQueries('backupStats');
        setDeleteDialogOpen(false);
        setSelectedBackup(null);
      }
    }
  );

  // Cleanup backups mutation
  const cleanupMutation = useMutation(
    async (keepCount) => {
      const response = await axios.delete(`/backup/cleanup?keepCount=${keepCount}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('backups');
        queryClient.invalidateQueries('backupStats');
        setCleanupDialogOpen(false);
      }
    }
  );

  const backups = backupsData?.backups || [];

  const handleCreateBackup = () => {
    createBackupMutation.mutate(backupOptions);
  };

  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate({
        filename: selectedBackup.filename,
        ...restoreOptions
      });
    }
  };

  const handleDeleteBackup = () => {
    if (selectedBackup) {
      // For now, we'll use cleanup with a high keepCount
      // In a real implementation, you'd want a specific delete endpoint
      deleteBackupMutation.mutate(selectedBackup.filename);
    }
  };

  const handleCleanup = () => {
    cleanupMutation.mutate(keepCount);
  };

  const formatDate = (date) => {
    if (!date) return t('permissions.unknown');
    try {
      return format(new Date(date), 'PPpp');
    } catch {
      return date.toString();
    }
  };

  // Check if user has permission to view backup/restore (admin only)
  if (!hasPermission) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('backupRestore.noPermission')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t('backupRestore.title')}
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Backup />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            {t('backupRestore.createBackup')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetchBackups()}
            disabled={backupsLoading}
          >
            {t('backupRestore.refresh')}
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Storage color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{t('backupRestore.totalBackups')}</Typography>
              </Box>
              <Typography variant="h4">
                {statsLoading ? <CircularProgress size={24} /> : stats?.count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Storage color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">{t('backupRestore.totalSize')}</Typography>
              </Box>
              <Typography variant="h4">
                {statsLoading ? <CircularProgress size={24} /> : stats?.totalSizeFormatted || '0 Bytes'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">{t('backupRestore.newestBackup')}</Typography>
              </Box>
              <Typography variant="body2">
                {statsLoading ? t('backupRestore.loading') : formatDate(stats?.newest)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Info color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">{t('backupRestore.oldestBackup')}</Typography>
              </Box>
              <Typography variant="body2">
                {statsLoading ? t('backupRestore.loading') : formatDate(stats?.oldest)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backups Table */}
      <Paper>
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{t('backupRestore.availableBackups')}</Typography>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Delete />}
              onClick={() => setCleanupDialogOpen(true)}
              disabled={backups.length === 0}
            >
              {t('backupRestore.cleanupOldBackups')}
            </Button>
          </Box>
          {backupsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : backups.length === 0 ? (
            <Alert severity="info">{t('backupRestore.noBackupsAvailable')}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('backupRestore.filename')}</TableCell>
                    <TableCell>{t('backupRestore.size')}</TableCell>
                    <TableCell>{t('backupRestore.created')}</TableCell>
                    <TableCell>{t('backupRestore.modified')}</TableCell>
                    <TableCell align="right">{t('backupRestore.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.filename} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Storage sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">{backup.filename}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={backup.sizeFormatted} size="small" />
                      </TableCell>
                      <TableCell>{formatDate(backup.created)}</TableCell>
                      <TableCell>{formatDate(backup.modified)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('backupRestore.restoreBackup')}>
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialogOpen(true);
                            }}
                            disabled={restoreBackupMutation.isLoading}
                          >
                            <Restore />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('backupRestore.createDatabaseBackup')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>
            {t('backupRestore.createBackupDescription')}
          </DialogContentText>
          {createBackupMutation.isLoading && (
            <Box mb={2}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t('backupRestore.creatingBackup')}
              </Typography>
            </Box>
          )}
          <FormControlLabel
            control={
              <Switch
                checked={backupOptions.compress}
                onChange={(e) => setBackupOptions({ ...backupOptions, compress: e.target.checked })}
              />
            }
            label={t('backupRestore.compressBackup')}
          />
          <Box mt={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={backupOptions.includeData}
                  onChange={(e) => setBackupOptions({ ...backupOptions, includeData: e.target.checked })}
                />
              }
              label={t('backupRestore.includeData')}
            />
          </Box>
          {createBackupMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {createBackupMutation.error?.response?.data?.error || t('backupRestore.failedToCreateBackup')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createBackupMutation.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreateBackup}
            variant="contained"
            disabled={createBackupMutation.isLoading}
            startIcon={createBackupMutation.isLoading ? <CircularProgress size={16} /> : <Backup />}
          >
            {t('backupRestore.createBackup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Warning color="warning" sx={{ mr: 1 }} />
            {t('backupRestore.restoreDatabaseBackup')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>{t('common.warning')}:</strong> {t('backupRestore.restoreWarning')}
          </Alert>
          <DialogContentText mb={2}>
            {t('backupRestore.restoringBackup')} <strong>{selectedBackup?.filename}</strong>
          </DialogContentText>
          {restoreBackupMutation.isLoading && (
            <Box mb={2}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t('backupRestore.restoringBackupProgress')}
              </Typography>
            </Box>
          )}
          <FormControlLabel
            control={
              <Switch
                checked={restoreOptions.dropDatabase}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, dropDatabase: e.target.checked })}
              />
            }
            label={t('backupRestore.dropDatabase')}
          />
          <Box mt={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={restoreOptions.createDatabase}
                  onChange={(e) => setRestoreOptions({ ...restoreOptions, createDatabase: e.target.checked })}
                />
              }
              label={t('backupRestore.createDatabase')}
            />
          </Box>
          {restoreBackupMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {restoreBackupMutation.error?.response?.data?.error || t('backupRestore.failedToRestoreBackup')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)} disabled={restoreBackupMutation.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="warning"
            disabled={restoreBackupMutation.isLoading || !selectedBackup}
            startIcon={restoreBackupMutation.isLoading ? <CircularProgress size={16} /> : <Restore />}
          >
            {t('backupRestore.restoreBackup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('backupRestore.cleanupOldBackups')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>
            {t('backupRestore.cleanupDescription')}
          </DialogContentText>
          <TextField
            label={t('backupRestore.keepCount')}
            type="number"
            value={keepCount}
            onChange={(e) => setKeepCount(parseInt(e.target.value) || 30)}
            fullWidth
            margin="normal"
            helperText={t('backupRestore.keepCountHelper')}
            inputProps={{ min: 1, max: 100 }}
          />
          {cleanupMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {cleanupMutation.error?.response?.data?.error || t('backupRestore.failedToCleanup')}
            </Alert>
          )}
          {cleanupMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {cleanupMutation.data?.message || t('backupRestore.cleanupCompleted')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)} disabled={cleanupMutation.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCleanup}
            variant="contained"
            color="warning"
            disabled={cleanupMutation.isLoading}
            startIcon={cleanupMutation.isLoading ? <CircularProgress size={16} /> : <Delete />}
          >
            {t('backupRestore.cleanup')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupRestore;

