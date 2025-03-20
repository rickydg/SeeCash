import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Theme options: 'light', 'dark', 'system'
  const [themePreference, setThemePreference] = useState(() => {
    const savedPreference = localStorage.getItem('themePreference');
    return savedPreference || 'system';
  });
  
  // Actual theme mode: 'light' or 'dark'
  const [mode, setMode] = useState(() => {
    const savedPreference = localStorage.getItem('themePreference');
    
    // If system preference, check the media query
    if (!savedPreference || savedPreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return savedPreference;
  });
  
  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themePreference === 'system') {
        setMode(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    // Set initial mode
    handleChange();
    
    // Add listener for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [themePreference]);
  
  // Update the theme preference
  const setTheme = (newPreference) => {
    setThemePreference(newPreference);
    localStorage.setItem('themePreference', newPreference);
    
    if (newPreference === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(isDark ? 'dark' : 'light');
    } else {
      setMode(newPreference);
    }
  };
  
  return (
    <ThemeContext.Provider value={{ mode, themePreference, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);