import React, { createContext, useState, useEffect, useCallback } from 'react';
import { fetchBudget, updateSettings as updateSettingsApi } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    currency: 'USD',
    startBalance: 0
  });
  
  const [budget, setBudget] = useState({
    incomes: [],
    payments: [],
    settings: {
      currency: 'USD',
      startBalance: 0
    }
  });

  // Add debug mode to the context
  const [debugMode, setDebugMode] = useState(false);

  // Add notification state and functions to your context
  const [notifications, setNotifications] = useState([]);

  // Add this function to show notifications
  const showNotification = (message, type = 'info') => {
    // Only show if notifications are enabled
    if (settings?.enableNotifications) {
      const id = Date.now(); // Unique ID for the notification
      setNotifications(prev => [...prev, { id, message, type }]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    }
  };

  // Function to dismiss a notification
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Fix 1: Remove budget from loadBudget dependency
  const loadBudget = useCallback(() => {
    const savedBudget = localStorage.getItem('budgetAppData');
    if (savedBudget) {
      setBudget(JSON.parse(savedBudget));
      return JSON.parse(savedBudget);
    }
    return null; // Return null instead of budget to break the circular dependency
  }, []); // Empty dependency array
  
  // Fix 2: Restructure effect to avoid calling loadBudget in the initial load
  useEffect(() => {
    // Load budget data on component mount
    const loadInitialData = async () => {
      try {
        const data = await fetchBudget();
        setBudget(data);
        setSettings(data.settings || { currency: 'USD', startBalance: 0 });
      } catch (error) {
        console.error('Error loading budget data:', error);
        // Fallback to localStorage if API fails
        const localData = loadBudget();
        if (localData) {
          setSettings(localData.settings || { currency: 'USD', startBalance: 0 });
        }
      }
    };
    
    loadInitialData();
  }, [loadBudget]); // Now safe to include loadBudget
  
  // Fix 3: Remove redundant effect that was causing the loop
  // Remove the second useEffect that called loadBudget directly
  
  // Fix 4: Update the updateBudget function
  const updateSettings = useCallback(async (newSettings) => {
    try {
      // Call the API to update settings
      const updatedSettings = await updateSettingsApi(newSettings);
      
      // Update local state
      setSettings(updatedSettings);
      
      // Update budget object with new settings
      setBudget(prevBudget => ({
        ...prevBudget,
        settings: updatedSettings
      }));
      
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, []); // No dependencies needed here
  
  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      budget,
      setBudget,
      loadBudget,
      debugMode,
      setDebugMode,
      notifications,
      showNotification,
      dismissNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};