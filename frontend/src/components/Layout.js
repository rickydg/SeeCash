import React, { useState, useContext } from 'react';
import { 
  Box, Drawer, CssBaseline, AppBar, Toolbar, List, Typography,
  Divider, IconButton, ListItem, ListItemIcon, ListItemText, Container
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentIcon from '@mui/icons-material/Payment';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import ForecastIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ThemeToggle from './ThemeToggle';
import { AppContext } from '../context/AppContext';

// Restore original drawer width
const drawerWidth = 240;

// Restore original Main component with proper transitions
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

// Restore original AppBar with transitions
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Layout = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const { debugMode, setDebugMode } = useContext(AppContext);
  const [clickCount, setClickCount] = useState(0);
  const [showDebugToast, setShowDebugToast] = useState(false);
  const [open, setOpen] = useState(() => {
    // Try to get the drawer state from localStorage, default to false if not found
    const savedDrawerState = localStorage.getItem('navDrawerOpen');
    return savedDrawerState ? JSON.parse(savedDrawerState) : false;
  });

  // Drawer toggle functions
  const handleDrawerOpen = () => {
    setOpen(true);
    localStorage.setItem('navDrawerOpen', 'true');
  };

  const handleDrawerClose = () => {
    setOpen(false);
    localStorage.setItem('navDrawerOpen', 'false');
  };

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    
    // Set a timeout to reset the counter if they don't click fast enough
    setTimeout(() => {
      if (clickCount < 4) {
        setClickCount(0);
      }
    }, 2000);
    
    // If this is the 5th click, toggle debug mode
    if (clickCount === 4) {
      setDebugMode(!debugMode);
      setClickCount(0);
      setShowDebugToast(true);
      
      // Hide the toast after 3 seconds
      setTimeout(() => {
        setShowDebugToast(false);
      }, 3000);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { name: 'Payments', path: '/payments', icon: <PaymentIcon /> },
    { name: 'Income', path: '/income', icon: <MoneyIcon /> },
    { name: 'Forecast', path: '/forecast', icon: <ForecastIcon /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon /> }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <StyledAppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Box display="flex" alignItems="center" gap={1}>
            <Box 
              component="div" 
              onClick={handleLogoClick} 
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <img src="/logo.svg" alt="SeeCash Logo" style={{ height: '28px' }} />
              <Typography 
                variant="h6" 
                noWrap 
                component="div"
                sx={{ 
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #2196f3 30%, #4caf50 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                SeeCash
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <ThemeToggle />
        </Toolbar>
      </StyledAppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Box>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path;
            
            return (
              <ListItem
                button
                component={Link}
                to={item.path}
                key={item.name}
                selected={isSelected}
                sx={{
                  color: isSelected ? theme.palette.primary.main : 'inherit',
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: isSelected ? theme.palette.primary.main : 'inherit'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth={false} disableGutters sx={{ px: 1 }}>
          {children}
        </Container>
      </Main>
      {showDebugToast && (
        <Box 
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: debugMode ? '#4caf50' : '#f44336',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 1,
            zIndex: 2000,
            boxShadow: 3,
            opacity: 0.9
          }}
        >
          Debug Mode: {debugMode ? 'Enabled' : 'Disabled'}
        </Box>
      )}
    </Box>
  );
};

export default Layout;