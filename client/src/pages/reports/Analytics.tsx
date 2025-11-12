import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  AttachMoney,
  Speed,
  Refresh
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from '../../utils/axios';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Warehouse, Category, Product } from '../../types';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface AnalyticsFilters {
  warehouseId: string;
  categoryId: string;
  productId: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

interface AnalyticsType {
  id: number;
  name: string;
  endpoint: string;
  icon: JSX.Element;
}

interface AnalyticsData {
  summary?: any;
  timeSeriesData?: any[];
  topProducts?: any[];
  categoryBreakdown?: any[];
  products?: any[];
  fastMoving?: any[];
  slowMoving?: any[];
  deadStockItems?: any[];
  categoryTurnover?: any[];
  costBreakdown?: any[];
  categoryCosts?: any[];
  topProfitable?: any[];
  leastProfitable?: any[];
  unprofitable?: any[];
  categoryProfitability?: any[];
}

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState<AnalyticsFilters>({
    warehouseId: '',
    categoryId: '',
    productId: '',
    interval: 'daily'
  });

  const analyticsTypes: AnalyticsType[] = [
    { id: 0, name: t('analytics.salesTrends'), endpoint: 'sales-trends', icon: <TrendingUp /> },
    { id: 1, name: t('analytics.inventoryTurnover'), endpoint: 'inventory-turnover', icon: <Speed /> },
    { id: 2, name: t('analytics.costAnalysis'), endpoint: 'cost-analysis', icon: <AttachMoney /> },
    { id: 3, name: t('analytics.profitability'), endpoint: 'profitability', icon: <Assessment /> }
  ];

  const currentAnalytics = analyticsTypes[tabValue];

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery<AnalyticsData>(
    ['analytics', currentAnalytics.endpoint, dateRange, filters],
    async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.productId && { productId: filters.productId }),
        ...(filters.interval && { interval: filters.interval })
      });

      const response = await axios.get(`/analytics/${currentAnalytics.endpoint}?${params}`);
      return response.data;
    },
    {
      enabled: !!currentAnalytics.endpoint,
      retry: 2,
      retryDelay: 1000
    }
  );

  // Fetch reference data
  const { data: warehouses } = useQuery<{ warehouses: Warehouse[] }>('warehouses', () => axios.get('/warehouses').then(res => res.data));
  const { data: categories } = useQuery<{ categories: Category[] }>('categories', () => axios.get('/categories').then(res => res.data));
  const { data: products } = useQuery<{ products: Product[] }>('products', () => axios.get('/products').then(res => res.data));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const renderSalesTrends = (): JSX.Element | null => {
    if (!analyticsData) return null;

    const { summary, timeSeriesData, topProducts, categoryBreakdown } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalRevenue')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalRevenue || 0)}</Typography>
                <Typography variant="body2" color={(summary?.growthRate || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {(summary?.growthRate || 0) >= 0 ? '+' : ''}{(summary?.growthRate || 0).toFixed(2)}% {t('analytics.growth')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalProfit')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalProfit || 0)}</Typography>
                <Typography variant="body2">{t('analytics.margin')}: {(summary?.profitMargin || 0).toFixed(2)}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalTransactions')}</Typography>
                <Typography variant="h5">{formatNumber(summary?.totalTransactions || 0)}</Typography>
                <Typography variant="body2">{t('analytics.avg')}: {formatCurrency(summary?.averageTransactionValue || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.unitsSold')}</Typography>
                <Typography variant="h5">{formatNumber(summary?.totalQuantity || 0)}</Typography>
                <Typography variant="body2">{summary?.interval || ''} {t('analytics.tracking')}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sales Trend Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>{t('analytics.salesTrend')}</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" name={t('analytics.revenue')} />
                <Area type="monotone" dataKey="profit" stroke="#82ca9d" fillOpacity={1} fill="url(#colorProfit)" name={t('analytics.profit')} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Top Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.topProducts')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#8884d8" name={t('analytics.revenue')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.revenueByCategory')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown || []}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.name}: ${formatCurrency(entry.revenue)}`}
                    >
                      {(categoryBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderInventoryTurnover = (): JSX.Element | null => {
    if (!analyticsData) return null;

    const { summary, fastMoving, deadStockItems, categoryTurnover } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.avgTurnoverRatio')}</Typography>
                <Typography variant="h5">{(summary?.averageTurnoverRatio || 0).toFixed(2)}</Typography>
                <Typography variant="body2">{t('analytics.timesPerPeriod')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.avgDaysToSell')}</Typography>
                <Typography variant="h5">{(summary?.averageDaysToSell || 0).toFixed(1)}</Typography>
                <Typography variant="body2">{t('analytics.days')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.inventoryValue')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalInventoryValue || 0)}</Typography>
                <Typography variant="body2">{summary?.totalProducts || 0} {t('analytics.products')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.stockStatus')}</Typography>
                <Typography variant="h5">{summary?.fastMovingProducts || 0}</Typography>
                <Typography variant="body2">
                  {t('analytics.fastMoving')} | {summary?.slowMovingProducts || 0} {t('analytics.slowMoving')} | {summary?.deadStock || 0} {t('analytics.deadStock')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Category Turnover Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.categoryTurnoverRates')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryTurnover || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageTurnover" fill="#82ca9d" name={t('analytics.avgTurnover')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Fast vs Slow Moving */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.stockMovementDistribution')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('analytics.fastMoving'), value: summary?.fastMovingProducts || 0 },
                        { name: t('analytics.slowMoving'), value: summary?.slowMovingProducts || 0 },
                        { name: t('analytics.deadStock'), value: summary?.deadStock || 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      <Cell fill="#4CAF50" />
                      <Cell fill="#FF9800" />
                      <Cell fill="#F44336" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Fast Moving Products Table */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.topFastMovingProducts')}</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('common.product')}</TableCell>
                        <TableCell align="right">{t('analytics.turnover')}</TableCell>
                        <TableCell align="right">{t('analytics.daysToSell')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(fastMoving || []).slice(0, 5).map((product: any) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{(product.turnoverRatio || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">{(product.daysToSell || 0).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Dead Stock Alert */}
          {deadStockItems && deadStockItems.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">{t('analytics.deadStockItems')}</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('common.product')}</TableCell>
                          <TableCell align="right">{t('analytics.stock')}</TableCell>
                          <TableCell align="right">{t('analytics.value')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deadStockItems.slice(0, 5).map((product: any) => (
                          <TableRow key={product.productId}>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell align="right">{product.currentStock}</TableCell>
                            <TableCell align="right">{formatCurrency(product.inventoryValue || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const renderCostAnalysis = (): JSX.Element | null => {
    if (!analyticsData) return null;

    const { summary, categoryCosts } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalCosts')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalCosts || 0)}</Typography>
                <Typography variant="body2">{t('analytics.allCostTypes')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.procurement')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalProcurementCost || 0)}</Typography>
                <Typography variant="body2">{t('analytics.purchaseCosts')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.holdingCosts')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalHoldingCost || 0)}</Typography>
                <Typography variant="body2">{(summary?.holdingCostPercentage || 0).toFixed(2)}% {t('analytics.ofTotal')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.shrinkage')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalShrinkageCost || 0)}</Typography>
                <Typography variant="body2">{(summary?.shrinkageCostPercentage || 0).toFixed(2)}% {t('analytics.ofTotal')}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Cost Breakdown Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.costBreakdown')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('analytics.procurement'), value: summary?.totalProcurementCost || 0 },
                        { name: t('analytics.holdingCosts'), value: summary?.totalHoldingCost || 0 },
                        { name: t('analytics.shrinkage'), value: summary?.totalShrinkageCost || 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    >
                      <Cell fill="#2196F3" />
                      <Cell fill="#FF9800" />
                      <Cell fill="#F44336" />
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Costs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.costsByCategory')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(categoryCosts || []).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="procurementCost" stackId="a" fill="#2196F3" name={t('analytics.procurement')} />
                    <Bar dataKey="holdingCost" stackId="a" fill="#FF9800" name={t('analytics.holdingCosts')} />
                    <Bar dataKey="shrinkageCost" stackId="a" fill="#F44336" name={t('analytics.shrinkage')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Profitability Metrics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.profitabilityMetrics')}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>{t('analytics.revenue')}</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.totalRevenue || 0)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>{t('analytics.grossProfit')}</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.grossProfit || 0)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>{t('analytics.netProfit')}</Typography>
                      <Typography variant="h6" color={(summary?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(summary?.netProfit || 0)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>{t('analytics.profitMargin')}</Typography>
                      <Typography variant="h6" color={(summary?.profitMargin || 0) >= 0 ? 'success.main' : 'error.main'}>
                        {(summary?.profitMargin || 0).toFixed(2)}%
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderProfitability = (): JSX.Element | null => {
    if (!analyticsData) return null;

    const { summary, topProfitable, leastProfitable, unprofitable, categoryProfitability } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalRevenue')}</Typography>
                <Typography variant="h5">{formatCurrency(summary?.totalRevenue || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.totalProfit')}</Typography>
                <Typography variant="h5" color={(summary?.totalProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(summary?.totalProfit || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.profitMargin')}</Typography>
                <Typography variant="h5">{(summary?.averageMargin || 0).toFixed(2)}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{t('analytics.productStatus')}</Typography>
                <Typography variant="body2">
                  <Chip label={`${summary?.profitableProducts || 0} ${t('analytics.profitable')}`} color="success" size="small" sx={{ mr: 1 }} />
                  <Chip label={`${summary?.unprofitableProducts || 0} ${t('analytics.loss')}`} color="error" size="small" />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Category Profitability */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.categoryProfitability')}</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryProfitability || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name={t('analytics.revenue')} />
                    <Bar dataKey="profit" fill="#82ca9d" name={t('analytics.profit')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Profitable Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.topMostProfitableProducts')}</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('common.product')}</TableCell>
                        <TableCell align="right">{t('analytics.revenue')}</TableCell>
                        <TableCell align="right">{t('analytics.profit')}</TableCell>
                        <TableCell align="right">{t('analytics.margin')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(topProfitable || []).map((product: any) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{formatCurrency(product.revenue || 0)}</TableCell>
                          <TableCell align="right">{formatCurrency(product.profit || 0)}</TableCell>
                          <TableCell align="right">{(product.profitMargin || 0).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Least Profitable Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('analytics.leastProfitableProducts')}</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('common.product')}</TableCell>
                        <TableCell align="right">{t('analytics.revenue')}</TableCell>
                        <TableCell align="right">{t('analytics.profit')}</TableCell>
                        <TableCell align="right">{t('analytics.margin')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(leastProfitable || []).map((product: any) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{formatCurrency(product.revenue || 0)}</TableCell>
                          <TableCell align="right">{formatCurrency(product.profit || 0)}</TableCell>
                          <TableCell align="right">{(product.profitMargin || 0).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Unprofitable Products */}
          {unprofitable && unprofitable.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">{t('analytics.unprofitableProducts')}</Typography>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {unprofitable.length} {t('analytics.productsOperatingAtLoss')}
                  </Alert>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('common.product')}</TableCell>
                          <TableCell>{t('common.category')}</TableCell>
                          <TableCell align="right">{t('analytics.revenue')}</TableCell>
                          <TableCell align="right">{t('analytics.cost')}</TableCell>
                          <TableCell align="right">{t('analytics.loss')}</TableCell>
                          <TableCell align="right">{t('analytics.margin')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unprofitable.map((product: any) => (
                          <TableRow key={product.productId}>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell align="right">{formatCurrency(product.revenue || 0)}</TableCell>
                            <TableCell align="right">{formatCurrency(product.cost || 0)}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {formatCurrency(product.profit || 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {(product.profitMargin || 0).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('analytics.advancedAnalytics')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('analytics.comprehensiveBusinessIntelligence')}
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label={t('reports.startDate')}
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label={t('reports.endDate')}
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            {tabValue === 0 && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('analytics.interval')}</InputLabel>
                  <Select
                    value={filters.interval}
                    onChange={(e) => setFilters({ ...filters, interval: e.target.value as AnalyticsFilters['interval'] })}
                    label={t('analytics.interval')}
                  >
                    <MenuItem value="hourly">{t('analytics.hourly')}</MenuItem>
                    <MenuItem value="daily">{t('analytics.daily')}</MenuItem>
                    <MenuItem value="weekly">{t('analytics.weekly')}</MenuItem>
                    <MenuItem value="monthly">{t('analytics.monthly')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('common.warehouse')}</InputLabel>
                  <Select
                    value={filters.warehouseId}
                    onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                    label={t('common.warehouse')}
                  >
                    <MenuItem value="">{t('reports.allWarehouses')}</MenuItem>
                  {warehouses?.warehouses?.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('common.category')}</InputLabel>
                  <Select
                    value={filters.categoryId}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                    label={t('common.category')}
                  >
                    <MenuItem value="">{t('reports.allCategories')}</MenuItem>
                  {categories?.categories?.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => refetch()}
                size="large"
              >
                {t('common.refresh')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {analyticsTypes.map((type) => (
            <Tab
              key={type.id}
              label={type.name}
              icon={type.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* @ts-ignore - CardContent accepts multiple children, TypeScript inference issue */}
        <CardContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error">
              {(error as any)?.response?.data?.error || t('analytics.failedToLoadAnalyticsData')}
            </Alert>
          )}

          {!isLoading && !error && analyticsData && (
            <>
              {tabValue === 0 && renderSalesTrends()}
              {tabValue === 1 && renderInventoryTurnover()}
              {tabValue === 2 && renderCostAnalysis()}
              {tabValue === 3 && renderProfitability()}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics;

