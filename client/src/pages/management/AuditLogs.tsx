import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Visibility,
  FilterList,
  Refresh,
  Security,
  CheckCircle,
  Error as ErrorIcon,
  Warning
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import {
  AuditLog,
  AuditLogsResponse,
  AuditStats
} from '../../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Filters {
  userId: string;
  action: string;
  entity: string;
  status: string;
  startDate: string;
  endDate: string;
  search: string;
}

const AuditLogs: React.FC = () => {
  const { t } = useTranslation();
  const { checkPermission, PERMISSIONS } = usePermissions();
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(50);
  const [filters, setFilters] = useState<Filters>({
    userId: '',
    action: '',
    entity: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);

  // Check permission - must be done before hooks but hooks must be called regardless
  const hasPermission = checkPermission(PERMISSIONS.VIEW_USERS);

  // Fetch audit logs - hooks must be called in the same order every render
  const { data, isLoading, error, refetch } = useQuery<AuditLogsResponse>(
    ['auditLogs', page, limit, filters],
    async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await axios.get(`${API_BASE_URL}/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    {
      enabled: hasPermission, // Only fetch if user has permission
      keepPreviousData: true,
      refetchInterval: hasPermission ? 30000 : false // Only refresh if user has permission
    }
  );

  // Fetch audit statistics - hooks must be called in the same order every render
  const { data: stats } = useQuery<AuditStats>(
    ['auditStats', filters.startDate, filters.endDate],
    async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(
        `${API_BASE_URL}/audit-logs/stats/summary?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    },
    {
      enabled: hasPermission, // Only fetch if user has permission
      keepPreviousData: true
    }
  );

  // Check if user has permission to view audit logs (admin only)
  if (!hasPermission) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('auditLogs.noPermission')}
        </Alert>
      </Box>
    );
  }

  const handleChangePage = (event: unknown, newPage: number): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setLimit(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleViewDetails = (log: AuditLog): void => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failure':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string): JSX.Element | null => {
    switch (status) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'failure':
        return <Warning fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, pages: 0, currentPage: 0, itemsPerPage: 0 };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Security fontSize="large" color="primary" />
          <Typography variant="h4">{t('auditLogs.title')}</Typography>
        </Box>
        <Box>
          <Tooltip title={t('auditLogs.refresh')}>
            <IconButton onClick={() => refetch()} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('auditLogs.totalLogs')}
                </Typography>
                <Typography variant="h4">{stats.summary?.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('auditLogs.successRate')}
                </Typography>
                <Typography variant="h4">
                  {stats.summary?.successRate || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('auditLogs.failures')}
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.summary?.failure || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('auditLogs.errors')}
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.summary?.error || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterList />
          <Typography variant="h6">{t('auditLogs.filters')}</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label={t('auditLogs.search')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('auditLogs.action')}</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label={t('auditLogs.action')}
              >
                <MenuItem value="">{t('auditLogs.all')}</MenuItem>
                <MenuItem value="CREATE">CREATE</MenuItem>
                <MenuItem value="UPDATE">UPDATE</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
                <MenuItem value="VIEW">VIEW</MenuItem>
                <MenuItem value="LOGIN">LOGIN</MenuItem>
                <MenuItem value="LOGOUT">LOGOUT</MenuItem>
                <MenuItem value="EXPORT">EXPORT</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('auditLogs.entity')}</InputLabel>
              <Select
                value={filters.entity}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
                label={t('auditLogs.entity')}
              >
                <MenuItem value="">{t('auditLogs.all')}</MenuItem>
                <MenuItem value="Product">Product</MenuItem>
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="PurchaseOrder">PurchaseOrder</MenuItem>
                <MenuItem value="Stock">Stock</MenuItem>
                <MenuItem value="Sale">Sale</MenuItem>
                <MenuItem value="Category">Category</MenuItem>
                <MenuItem value="Supplier">Supplier</MenuItem>
                <MenuItem value="Warehouse">Warehouse</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('auditLogs.status')}</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label={t('auditLogs.status')}
              >
                <MenuItem value="">{t('auditLogs.all')}</MenuItem>
                <MenuItem value="success">{t('auditLogs.success')}</MenuItem>
                <MenuItem value="failure">{t('auditLogs.failure')}</MenuItem>
                <MenuItem value="error">{t('auditLogs.error')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label={t('auditLogs.startDate')}
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label={t('auditLogs.endDate')}
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('auditLogs.timestamp')}</TableCell>
              <TableCell>{t('auditLogs.user')}</TableCell>
              <TableCell>{t('auditLogs.action')}</TableCell>
              <TableCell>{t('auditLogs.entity')}</TableCell>
              <TableCell>{t('auditLogs.status')}</TableCell>
              <TableCell>{t('auditLogs.ipAddress')}</TableCell>
              <TableCell>{t('auditLogs.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {t('auditLogs.loading')}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Alert severity="error">
                    {(error as any).response?.data?.error || t('auditLogs.failedToLoad')}
                  </Alert>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {t('auditLogs.noLogsFound')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const statusIcon = getStatusIcon(log.status);
                return (
                <TableRow key={log.id} hover>
                  <TableCell>
                    {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {log.user
                      ? `${log.user.username} (${log.user.role})`
                      : t('auditLogs.system')}
                  </TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" />
                  </TableCell>
                  <TableCell>
                    {log.entity}
                    {log.entityId && ` #${log.entityId}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      {...(statusIcon ? { icon: statusIcon } : {})}
                      label={log.status}
                      color={getStatusColor(log.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.ipAddress || t('permissions.unknown')}</TableCell>
                  <TableCell>
                    <Tooltip title={t('auditLogs.viewDetails')}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={limit}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('auditLogs.auditLogDetails')}</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.timestamp')}
                  </Typography>
                  <Typography>
                    {format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.user')}
                  </Typography>
                  <Typography>
                    {selectedLog.user
                      ? `${selectedLog.user.username} (${selectedLog.user.email})`
                      : t('auditLogs.system')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.action')}
                  </Typography>
                  <Typography>{selectedLog.action}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.entity')}
                  </Typography>
                  <Typography>
                    {selectedLog.entity}
                    {selectedLog.entityId && ` (ID: ${selectedLog.entityId})`}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.status')}
                  </Typography>
                  {(() => {
                    const statusIcon = getStatusIcon(selectedLog.status);
                    return (
                      <Chip
                        {...(statusIcon ? { icon: statusIcon } : {})}
                        label={selectedLog.status}
                        color={getStatusColor(selectedLog.status)}
                        size="small"
                      />
                    );
                  })()}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('auditLogs.ipAddress')}
                  </Typography>
                  <Typography>{selectedLog.ipAddress || t('permissions.unknown')}</Typography>
                </Grid>
                {selectedLog.userAgent && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('auditLogs.userAgent')}
                    </Typography>
                    <Typography variant="body2">{selectedLog.userAgent}</Typography>
                  </Grid>
                )}
                {selectedLog.changes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('auditLogs.changes')}
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(
                          typeof selectedLog.changes === 'string'
                            ? JSON.parse(selectedLog.changes)
                            : selectedLog.changes,
                          null,
                          2
                        )}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {selectedLog.errorMessage && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('auditLogs.errorMessage')}
                    </Typography>
                    <Alert severity="error">{selectedLog.errorMessage}</Alert>
                  </Grid>
                )}
                {selectedLog.metadata && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('auditLogs.metadata')}
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(
                          typeof selectedLog.metadata === 'string'
                            ? JSON.parse(selectedLog.metadata)
                            : selectedLog.metadata,
                          null,
                          2
                        )}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogs;

