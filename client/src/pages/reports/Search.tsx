import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert
} from '@mui/material';
import {
  Search,
  FilterList,
  Clear,
  Inventory,
  Business,
  Warehouse,
  Person,
  ShoppingCart,
  History,
  BookmarkBorder,
  Bookmark
} from '@mui/icons-material';
import {
  useQuery
} from 'react-query';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from '../../components/common/GlobalSearch';
import AdvancedSearch from '../../components/common/AdvancedSearch';
import { useTranslation } from 'react-i18next';

interface SearchHistoryItem {
  id: number;
  query: string;
  entity: string;
  resultsCount: number;
  timestamp: string | Date;
}

interface SavedSearch {
  id: number;
  name: string;
  entity: string;
  isPublic: boolean;
  createdAt: string | Date;
}

interface SearchResult {
  name?: string;
  title?: string;
  orderNumber?: string;
  description?: string;
  subtitle?: string;
  status?: string;
  price?: number;
  url: string;
}

interface SearchResults {
  results: SearchResult[];
  total: number;
  pagination?: {
    page: number;
    totalPages: number;
  };
}

interface HistoryResponse {
  history?: SearchHistoryItem[];
}

interface SavedSearchesResponse {
  filters?: SavedSearch[];
}

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('products');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const navigate = useNavigate();

  // Fetch search history
  const { data: historyData } = useQuery<HistoryResponse>(
    'searchHistory',
    async () => {
      const response = await axios.get('/search/history?limit=20');
      return response.data;
    }
  );

  // Fetch saved searches
  const { data: savedData } = useQuery<SavedSearchesResponse>(
    'savedSearches',
    async () => {
      const response = await axios.get('/search/filters');
      return response.data;
    }
  );

  useEffect(() => {
    if (historyData?.history) {
      setSearchHistory(historyData.history);
    }
  }, [historyData]);

  useEffect(() => {
    if (savedData?.filters) {
      setSavedSearches(savedData.filters);
    }
  }, [savedData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleAdvancedSearchResults = (results: SearchResults): void => {
    setSearchResults(results);
    setActiveTab(1); // Switch to results tab
  };

  const handleResultClick = (result: SearchResult): void => {
    navigate(result.url);
  };

  const getEntityIcon = (entity: string): JSX.Element => {
    const icons: Record<string, JSX.Element> = {
      products: <Inventory />,
      suppliers: <Business />,
      warehouses: <Warehouse />,
      users: <Person />,
      'purchase-orders': <ShoppingCart />
    };
    return icons[entity] || <Search />;
  };

  const getEntityColor = (entity: string): 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'default' => {
    const colors: Record<string, 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'default'> = {
      products: 'primary',
      suppliers: 'secondary',
      warehouses: 'info',
      users: 'warning',
      'purchase-orders': 'success'
    };
    return colors[entity] || 'default';
  };

  const renderSearchResults = (): JSX.Element => {
    if (!searchResults) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {t('search.noSearchResultsToDisplay')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('search.useSearchBarOrAdvancedSearch')}
          </Typography>
        </Box>
      );
    }

    const { results, total, pagination } = searchResults;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {t('search.searchResults')} ({total} {t('search.found')})
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowAdvancedSearch(true)}
          >
            {t('search.advancedSearch')}
          </Button>
        </Box>

        {results.length === 0 ? (
          <Alert severity="info">
            {t('search.noResultsFoundTryAdjusting')}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {results.map((result, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getEntityIcon(selectedEntity)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {result.name || result.title || result.orderNumber}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {result.description || result.subtitle}
                    </Typography>
                    {result.status && (
                      <Chip
                        label={result.status}
                        size="small"
                        color={getEntityColor(selectedEntity)}
                        sx={{ mb: 1 }}
                      />
                    )}
                    {result.price && (
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ${result.price}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleResultClick(result)}
                    >
                      {t('search.viewDetails')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t('search.page')} {pagination.page} {t('search.of')} {pagination.totalPages}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderSearchHistory = (): JSX.Element => {
    if (searchHistory.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t('search.noSearchHistoryYet')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('search.yourRecentSearchesWillAppearHere')}
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {searchHistory.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem
              button={true}
              onClick={() => {
                setActiveTab(1);
              }}
            >
              <ListItemIcon>
                {getEntityIcon(item.entity)}
              </ListItemIcon>
              <ListItemText
                primary={item.query}
                secondary={`${item.entity} • ${item.resultsCount} ${t('search.resultsLabel')} • ${new Date(item.timestamp).toLocaleString()}`}
              />
            </ListItem>
            {index < searchHistory.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderSavedSearches = (): JSX.Element => {
    if (savedSearches.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <BookmarkBorder sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t('search.noSavedSearchesYet')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{t('search.yourFrequentlyUsedSearchFilters')}
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {savedSearches.map((search) => (
          <Grid item xs={12} sm={6} md={4} key={search.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Bookmark color="primary" />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {search.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {search.entity} • {search.isPublic ? t('search.public') : t('search.private')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('search.created')} {new Date(search.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedEntity(search.entity);
                    setShowAdvancedSearch(true);
                  }}
                >
                  {t('search.useFilter')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('search.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('search.findProductsSuppliersWarehouses')}
        </Typography>
      </Box>

      {/* Global Search Bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <GlobalSearch onClose={() => {}} />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label={t('search.searchHistory')} icon={<History />} />
          <Tab label={t('search.searchResults')} icon={<Search />} />
          <Tab label={t('search.savedSearches')} icon={<Bookmark />} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderSearchHistory()}
        {activeTab === 1 && renderSearchResults()}
        {activeTab === 2 && renderSavedSearches()}
      </Box>

      {/* Advanced Search Dialog */}
      <Dialog
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('search.advancedSearch')}
          <IconButton
            onClick={() => setShowAdvancedSearch(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Clear />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <AdvancedSearch
            entity={selectedEntity}
            onResults={handleAdvancedSearchResults}
            onClose={() => setShowAdvancedSearch(false)}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SearchPage;

