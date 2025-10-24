import React, { useState, useEffect, useRef } from 'react';
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
import {useQuery} from 'react-query';
import axios from '../../utils/axios';
import {useNavigate} from 'react-router-dom';

const GlobalSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Fetch search results (disabled by default, triggered by button)
  const { data: searchResults, isLoading, refetch } = useQuery(
    ['globalSearch', query],
    async () => {
      if (!query || query.length < 2) return null;
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
  const { data: historyData } = useQuery(
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

  const handleQueryChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    // Don't automatically open results, wait for button click
  };

  const handleSearch = () => {
    if (query && query.length >= 2) {
      refetch();
      setIsOpen(true);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  const handleResultClick = (result) => {
    navigate(result.url);
    onClose();
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setIsOpen(true);
  };

  const getEntityIcon = (entity) => {
    const icons = {
      products: <Inventory />,
      suppliers: <Business />,
      warehouses: <Warehouse />,
      users: <Person />,
      'purchase-orders': <ShoppingCart />
    };
    return icons[entity] || <Search />;
  };

  const getEntityColor = (entity) => {
    const colors = {
      products: 'primary',
      suppliers: 'secondary',
      warehouses: 'info',
      users: 'warning',
      'purchase-orders': 'success'
    };
    return colors[entity] || 'default';
  };

  const renderSearchResults = () => {
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
                icon={getEntityIcon(entityResult.entity)}
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

  const renderSearchHistory = () => {
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

  const renderEmptyState = () => {
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
        ref={inputRef}
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
