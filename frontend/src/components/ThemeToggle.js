import React, { useContext } from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import Brightness7Icon from '@mui/icons-material/Brightness7';
// Remove the unused import:
// import Brightness4Icon from '@mui/icons-material/Brightness4';
import { ThemeContext } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { themePreference, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleThemeChange = (preference) => {
    setTheme(preference);
    handleClose();
  };
  
  // Icon based on current theme preference
  const getThemeIcon = () => {
    switch(themePreference) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'system':
      default:
        return <SettingsBrightnessIcon />;
    }
  };
  
  return (
    <>
      <IconButton color="inherit" onClick={handleClick} aria-label="Theme settings">
        {getThemeIcon()}
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem 
          onClick={() => handleThemeChange('light')}
          selected={themePreference === 'light'}
        >
          <ListItemIcon>
            <LightModeIcon />
          </ListItemIcon>
          <ListItemText primary="Light" />
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleThemeChange('dark')}
          selected={themePreference === 'dark'}
        >
          <ListItemIcon>
            <DarkModeIcon />
          </ListItemIcon>
          <ListItemText primary="Dark" />
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleThemeChange('system')}
          selected={themePreference === 'system'}
        >
          <ListItemIcon>
            <SettingsBrightnessIcon />
          </ListItemIcon>
          <ListItemText primary="System" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ThemeToggle;