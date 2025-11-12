import React, { useState, useMemo } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  Category,
  LocalShipping,
  Warehouse,
  ShoppingCart,
  Assessment,
  AccountCircle,
  Logout,
  People,
  Search,
  QrCode,
  TrendingUp,
  PointOfSale,
  Security,
  Backup
} from '@mui/icons-material';
import {
  useNavigate,
  useLocation
} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import LanguageSwitcher from './LanguageSwitcher';
// import Realtime from '../realtime/Realtime'; // Component not found

const drawerWidth = 240;

// Menu items will be translated in the component
// Each item can have a 'permission' key that maps to PERMISSIONS constant
const getMenuItems = (t) => [
  { text: t('common.dashboard'), icon: <Dashboard />, path: '/dashboard', permission: 'VIEW_DASHBOARD' },
  { text: t('common.search'), icon: <Search />, path: '/search', permission: 'USE_SEARCH' },
  { text: t('common.products'), icon: <Inventory />, path: '/products', permission: 'VIEW_PRODUCTS' },
  { text: t('common.stock'), icon: <Warehouse />, path: '/stock', permission: 'VIEW_STOCK' },
  { text: t('common.categories'), icon: <Category />, path: '/categories', permission: 'VIEW_CATEGORIES' },
  { text: t('common.suppliers'), icon: <LocalShipping />, path: '/suppliers', permission: 'VIEW_SUPPLIERS' },
  { text: t('common.warehouses'), icon: <Warehouse />, path: '/warehouses', permission: 'VIEW_WAREHOUSES' },
  { text: t('common.purchaseOrders'), icon: <ShoppingCart />, path: '/purchase-orders', permission: 'VIEW_PURCHASE_ORDERS' },
  { text: t('common.pos'), icon: <PointOfSale />, path: '/pos', permission: 'VIEW_POS' },
  { text: t('common.barcodes'), icon: <QrCode />, path: '/barcodes', permission: 'VIEW_BARCODES' },
  { text: t('common.reports'), icon: <Assessment />, path: '/reports', permission: 'VIEW_REPORTS' },
  { text: t('common.analytics'), icon: <TrendingUp />, path: '/analytics', permission: 'VIEW_ANALYTICS' },
  { text: t('common.users'), icon: <People />, path: '/users', permission: 'VIEW_USERS' },
  { text: t('common.permissions'), icon: <Security />, path: '/permissions', permission: 'VIEW_USERS' },
  { text: t('common.auditLogs'), icon: <Security />, path: '/audit-logs', permission: 'VIEW_USERS' },
  { text: t('common.backupRestore'), icon: <Backup />, path: '/backup-restore', permission: 'VIEW_USERS' }
];

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { checkPermission, PERMISSIONS, loading: permissionsLoading } = usePermissions();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Filter menu items based on user permissions - hide items user doesn't have access to
  const menuItems = useMemo(() => {
    // If user is not loaded yet or permissions are still loading, return empty array
    if (!user || permissionsLoading) {
      return [];
    }

    return getMenuItems(t).filter(item => {
      // If item has no permission requirement, show it (like profile)
      if (!item.permission) {
        return true;
      }
      
      // Get the permission key from PERMISSIONS constant
      const permissionKey = PERMISSIONS[item.permission];
      
      // If permission key doesn't exist, hide the item
      if (!permissionKey) {
        console.warn(`Permission key not found for menu item: ${item.text} (${item.permission})`);
        return false;
      }
      
      // Check if user has the required permission (from database)
      const hasPermission = checkPermission(permissionKey);
      
      // Only show menu item if user has permission - hide if they don't
      return hasPermission;
    });
  }, [t, checkPermission, PERMISSIONS, user, permissionsLoading]);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Inventory System
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || t('common.dashboard')}
          </Typography>
          {/* <Realtime/> */} {/* Component not found */}
          <LanguageSwitcher />
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={() => { handleNavigation('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          {t('common.profile')}
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          {t('common.logout')}
        </MenuItem>
      </Menu>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
