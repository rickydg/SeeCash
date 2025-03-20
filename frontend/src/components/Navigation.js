import React from 'react';
import { Link } from 'react-router-dom';
import { Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoneyIcon from '@mui/icons-material/Money';
import PaymentIcon from '@mui/icons-material/Payment';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsIcon from '@mui/icons-material/Settings';

const Navigation = () => {
  return (
    <Box sx={{ width: 240, flexShrink: 0 }}>
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/income">
          <ListItemIcon><MoneyIcon /></ListItemIcon>
          <ListItemText primary="Income" />
        </ListItem>
        <ListItem button component={Link} to="/payments">
          <ListItemIcon><PaymentIcon /></ListItemIcon>
          <ListItemText primary="Payments" />
        </ListItem>
        <ListItem button component={Link} to="/forecast">
          <ListItemIcon><TimelineIcon /></ListItemIcon>
          <ListItemText primary="Forecast" />
        </ListItem>
        <ListItem button component={Link} to="/settings">
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </Box>
  );
};

export default Navigation;