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

const Analytics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    warehouseId: '',
    categoryId: '',
    productId: '',
    interval: 'daily'
  });

  const analyticsTypes = [
    { id: 0, name: 'Sales Trends', endpoint: 'sales-trends', icon: <TrendingUp /> },
    { id: 1, name: 'Inventory Turnover', endpoint: 'inventory-turnover', icon: <Speed /> },
    { id: 2, name: 'Cost Analysis', endpoint: 'cost-analysis', icon: <AttachMoney /> },
    { id: 3, name: 'Profitability', endpoint: 'profitability', icon: <Assessment /> }
  ];

  const currentAnalytics = analyticsTypes[tabValue];

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery(
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
  const { data: warehouses } = useQuery('warehouses', () => axios.get('/warehouses').then(res => res.data));
  const { data: categories } = useQuery('categories', () => axios.get('/categories').then(res => res.data));
  const { data: products } = useQuery('products', () => axios.get('/products').then(res => res.data));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const renderSalesTrends = () => {
    if (!analyticsData) return null;

    const { summary, timeSeriesData, topProducts, categoryBreakdown } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalRevenue)}</Typography>
                <Typography variant="body2" color={summary.growthRate >= 0 ? 'success.main' : 'error.main'}>
                  {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(2)}% Growth
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Profit</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalProfit)}</Typography>
                <Typography variant="body2">Margin: {summary.profitMargin.toFixed(2)}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Transactions</Typography>
                <Typography variant="h5">{formatNumber(summary.totalTransactions)}</Typography>
                <Typography variant="body2">Avg: {formatCurrency(summary.averageTransactionValue)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Units Sold</Typography>
                <Typography variant="h5">{formatNumber(summary.totalQuantity)}</Typography>
                <Typography variant="body2">{summary.interval} tracking</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sales Trend Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sales Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
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
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#82ca9d" fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Top Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top 10 Products by Revenue</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Revenue by Category</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.revenue)}`}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderInventoryTurnover = () => {
    if (!analyticsData) return null;

    const { summary, products, fastMoving, slowMoving, deadStockItems, categoryTurnover } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Avg Turnover Ratio</Typography>
                <Typography variant="h5">{summary.averageTurnoverRatio.toFixed(2)}</Typography>
                <Typography variant="body2">Times per period</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Avg Days to Sell</Typography>
                <Typography variant="h5">{summary.averageDaysToSell.toFixed(1)}</Typography>
                <Typography variant="body2">Days</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Inventory Value</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalInventoryValue)}</Typography>
                <Typography variant="body2">{summary.totalProducts} products</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Stock Status</Typography>
                <Typography variant="h5">{summary.fastMovingProducts}</Typography>
                <Typography variant="body2">
                  Fast | {summary.slowMovingProducts} Slow | {summary.deadStock} Dead
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
                <Typography variant="h6" gutterBottom>Category Turnover Rates</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryTurnover}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageTurnover" fill="#82ca9d" name="Avg Turnover" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Fast vs Slow Moving */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Stock Movement Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Fast Moving', value: summary.fastMovingProducts },
                        { name: 'Slow Moving', value: summary.slowMovingProducts },
                        { name: 'Dead Stock', value: summary.deadStock }
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
                <Typography variant="h6" gutterBottom>Top Fast Moving Products</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Turnover</TableCell>
                        <TableCell align="right">Days to Sell</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fastMoving.slice(0, 5).map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{product.turnoverRatio.toFixed(2)}</TableCell>
                          <TableCell align="right">{product.daysToSell.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Dead Stock Alert */}
          {deadStockItems.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">Dead Stock Items</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deadStockItems.slice(0, 5).map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell align="right">{product.currentStock}</TableCell>
                            <TableCell align="right">{formatCurrency(product.inventoryValue)}</TableCell>
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

  const renderCostAnalysis = () => {
    if (!analyticsData) return null;

    const { summary, costBreakdown, categoryCosts } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Costs</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalCosts)}</Typography>
                <Typography variant="body2">All cost types</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Procurement</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalProcurementCost)}</Typography>
                <Typography variant="body2">Purchase costs</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Holding Costs</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalHoldingCost)}</Typography>
                <Typography variant="body2">{summary.holdingCostPercentage.toFixed(2)}% of total</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Shrinkage</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalShrinkageCost)}</Typography>
                <Typography variant="body2">{summary.shrinkageCostPercentage.toFixed(2)}% of total</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Cost Breakdown Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Procurement', value: summary.totalProcurementCost },
                        { name: 'Holding', value: summary.totalHoldingCost },
                        { name: 'Shrinkage', value: summary.totalShrinkageCost }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    >
                      <Cell fill="#2196F3" />
                      <Cell fill="#FF9800" />
                      <Cell fill="#F44336" />
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Costs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Costs by Category</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryCosts.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="procurementCost" stackId="a" fill="#2196F3" name="Procurement" />
                    <Bar dataKey="holdingCost" stackId="a" fill="#FF9800" name="Holding" />
                    <Bar dataKey="shrinkageCost" stackId="a" fill="#F44336" name="Shrinkage" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Profitability Metrics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Profitability Metrics</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>Revenue</Typography>
                      <Typography variant="h6">{formatCurrency(summary.totalRevenue)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>Gross Profit</Typography>
                      <Typography variant="h6">{formatCurrency(summary.grossProfit)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>Net Profit</Typography>
                      <Typography variant="h6" color={summary.netProfit >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(summary.netProfit)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography color="textSecondary" gutterBottom>Profit Margin</Typography>
                      <Typography variant="h6" color={summary.profitMargin >= 0 ? 'success.main' : 'error.main'}>
                        {summary.profitMargin.toFixed(2)}%
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

  const renderProfitability = () => {
    if (!analyticsData) return null;

    const { summary, topProfitable, leastProfitable, unprofitable, categoryProfitability } = analyticsData;

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
                <Typography variant="h5">{formatCurrency(summary.totalRevenue)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Profit</Typography>
                <Typography variant="h5" color={summary.totalProfit >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(summary.totalProfit)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Profit Margin</Typography>
                <Typography variant="h5">{summary.averageMargin.toFixed(2)}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Product Status</Typography>
                <Typography variant="body2">
                  <Chip label={`${summary.profitableProducts} Profitable`} color="success" size="small" sx={{ mr: 1 }} />
                  <Chip label={`${summary.unprofitableProducts} Loss`} color="error" size="small" />
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
                <Typography variant="h6" gutterBottom>Category Profitability</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryProfitability}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Profitable Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top 10 Most Profitable Products</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Profit</TableCell>
                        <TableCell align="right">Margin</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProfitable.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                          <TableCell align="right">{formatCurrency(product.profit)}</TableCell>
                          <TableCell align="right">{product.profitMargin.toFixed(1)}%</TableCell>
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
                <Typography variant="h6" gutterBottom>Least Profitable Products</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Profit</TableCell>
                        <TableCell align="right">Margin</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leastProfitable.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                          <TableCell align="right">{formatCurrency(product.profit)}</TableCell>
                          <TableCell align="right">{product.profitMargin.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Unprofitable Products */}
          {unprofitable.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">Unprofitable Products</Typography>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {unprofitable.length} products are operating at a loss!
                  </Alert>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                          <TableCell align="right">Cost</TableCell>
                          <TableCell align="right">Loss</TableCell>
                          <TableCell align="right">Margin</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unprofitable.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                            <TableCell align="right">{formatCurrency(product.cost)}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {formatCurrency(product.profit)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {product.profitMargin.toFixed(1)}%
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
        Advanced Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive business intelligence and performance analytics
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Start Date"
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
                label="End Date"
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
                  <InputLabel>Interval</InputLabel>
                  <Select
                    value={filters.interval}
                    onChange={(e) => setFilters({ ...filters, interval: e.target.value })}
                    label="Interval"
                  >
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Warehouse</InputLabel>
                <Select
                  value={filters.warehouseId}
                  onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                  label="Warehouse"
                >
                  <MenuItem value="">All Warehouses</MenuItem>
                  {warehouses?.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories?.map((c) => (
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
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
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

        <CardContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error">
              {error?.response?.data?.error || 'Failed to load analytics data'}
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

