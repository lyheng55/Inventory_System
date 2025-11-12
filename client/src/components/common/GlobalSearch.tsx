import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Paper,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Fade
} from '@mui/material';
import {
  Search,
  Clear,
  Inventory,
  Business,
  Warehouse,
  Person,
  ShoppingCart,
  History
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: number;
  title: string;
  subtitle?: string;
  url: string;
}

interface EntityResult {
  entity: string;
  label: string;
  results: SearchResult[];
}

interface SearchResponse {
  results: EntityResult[];
  total: number;
}

interface SearchHistoryItem {
  id: number;
  query: string;
  entity: string;
  resultsCount: number;
}

interface HistoryResponse {
  history: SearchHistoryItem[];
}

interface GlobalSearchProps {
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose }) => {
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Fetch search results (disabled by default, triggered by button)
  const { data: searchResults, isLoading, refetch } = useQuery<SearchResponse>(
    ['globalSearch', query],
    async () => {
      if (!query || query.length < 2) return { results: [], total: 0 };
      const response = await axios.get(`/search/global?q=${encodeURIComponent(query)}&limit=5`);
      return response.data;
    },
    {
      enabled: false, // Disabled by default, will be triggered manually
      staleTime: 30000, // 30 seconds
      cacheTime: 300000 // 5 minutes
    }
  );

  // Fetch search history
  const { data: historyData } = useQuery<HistoryResponse>(
    'searchHistory',
    async () => {
      const response = await axios.get('/search/history?limit=5');
      return response.data;
    },
    {
      staleTime: 60000 // 1 minute
    }
  );

  useEffect(() => {
    if (historyData?.history) {
      setSearchHistory(historyData.history);
    }
  }, [historyData]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setQuery(value);
    // Don't automatically open results, wait for button click
  };

  const handleSearch = (): void => {
    if (query && query.length >= 2) {
      refetch();
      setIsOpen(true);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = (): void => {
    setQuery('');
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult): void => {
    navigate(result.url);
    onClose();
  };

  const handleHistoryClick = (historyItem: SearchHistoryItem): void => {
    setQuery(historyItem.query);
    setIsOpen(true);
  };

  const getEntityIcon = (entity: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
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

  const renderSearchResults = (): React.ReactNode => {
    if (!searchResults || !searchResults.results.length) {
      return null;
    }

    return (
      <Box>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Search Results ({searchResults.total})
          </Typography>
        </Box>
        {searchResults.results.map((entityResult, index) => (
          <Box key={entityResult.entity}>
            <Box sx={{ px: 2, py: 1 }}>
              <Chip
                icon={getEntityIcon(entityResult.entity) as React.ReactElement}
                label={entityResult.label}
                size="small"
                color={getEntityColor(entityResult.entity)}
                variant="outlined"
              />
            </Box>
            {entityResult.results.map((result) => (
              <ListItem
                key={`${entityResult.entity}-${result.id}`}
                button={true}
                onClick={() => handleResultClick(result)}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  {getEntityIcon(entityResult.entity)}
                </ListItemIcon>
                <ListItemText
                  primary={result.title}
                  secondary={result.subtitle}
                />
              </ListItem>
            ))}
            {index < searchResults.results.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>
    );
  };

  const renderSearchHistory = (): React.ReactNode => {
    if (!searchHistory.length) return null;

    return (
      <Box>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Recent Searches
          </Typography>
        </Box>
        {searchHistory.map((item) => (
          <ListItem
            key={item.id}
            button={true}
            onClick={() => handleHistoryClick(item)}
          >
            <ListItemIcon>
              <History />
            </ListItemIcon>
            <ListItemText
              primary={item.query}
              secondary={`${item.entity} • ${item.resultsCount} results`}
            />
          </ListItem>
        ))}
      </Box>
    );
  };

  const renderEmptyState = (): React.ReactNode => {
    if (query && query.length >= 2 && !isLoading && searchResults && searchResults.results.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No results found for "{query}"
          </Typography>
        </Box>
      );
    }

    if (!query && searchHistory.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Type your search term and click the search button
          </Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder="Search products, suppliers, warehouses, users, orders..."
        value={query}
        onChange={handleQueryChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsOpen(true)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {isLoading && <CircularProgress size={20} />}
              {query && (
                <IconButton size="small" onClick={handleClear}>
                  <Clear />
                </IconButton>
              )}
              <IconButton 
                size="small" 
                onClick={handleSearch}
                disabled={!query || query.length < 2}
                color="primary"
              >
                <Search />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper'
          }
        }}
      />

      <Fade in={isOpen}>
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 1300,
            boxShadow: 3
          }}
        >
          {isLoading && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!isLoading && (
            <>
              {renderSearchResults()}
              {!query && renderSearchHistory()}
              {renderEmptyState()}
            </>
          )}

          {query && searchResults && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Click search button or press Enter to see all results
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default GlobalSearch;

