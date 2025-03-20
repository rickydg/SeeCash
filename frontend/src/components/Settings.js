import React, { useState, useContext, useEffect, useMemo } from 'react';
import { 
  Typography, Paper, Grid, TextField, MenuItem, Button, 
  Alert, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Box,
  InputAdornment, FormControlLabel, Switch, IconButton, 
  FormControl, InputLabel, Select, TableContainer, Table, TableHead, 
  TableRow, TableCell, TableBody, Chip, Snackbar
} from '@mui/material';
import { red } from '@mui/material/colors';
import { exportToExcel } from '../utils/exportUtils';
import { AppContext } from '../context/AppContext';
import { 
  clearAllTransactions, fetchCategories, addCategory, 
  toggleCategory, deleteCategory, fetchSettings, 
  fetchAccounts, addAccount, updateAccount, deleteAccount 
} from '../services/api';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { ChromePicker } from 'react-color';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import WarningIcon from '@mui/icons-material/Warning';

const Settings = () => {
  // Move theme hooks inside the component
  const theme = useTheme();
  // eslint-disable-next-line no-unused-vars
  const isDarkMode = theme.palette.mode === 'dark';

  const { settings, updateSettings, budget, debugMode, setDebugMode } = useContext(AppContext);
  // Add this after your useContext line to provide defaults

  // Provide defaults for context values
  const [localSettings, setLocalSettings] = useState({
    currency: 'USD',
    start_balance: 0
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [currencySymbol, setCurrencySymbol] = useState('$'); // Add currency symbol state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#4CAF50',
    enabled: true
  });
  // Add these state variables to the Settings component
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountFormMode, setAccountFormMode] = useState('add'); // 'add' or 'edit'
  const [currentAccount, setCurrentAccount] = useState({
    name: '',
    description: '',
    balance: 0,
    currency: 'USD',
    active: true
  });
  const [editAccountId, setEditAccountId] = useState(null);
  const [accountFormErrors, setAccountFormErrors] = useState({});
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  // Add this with your other state variables
  // eslint-disable-next-line no-unused-vars
  const [clearingData, setClearingData] = useState(false); // Tracks data clearing operations

  // Use useMemo for currencySymbols to prevent recreation on every render
  const currencySymbols = useMemo(() => ({
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$'
  }), []); // Empty dependency array means it's created once

  // Update currency symbol when local settings change
  useEffect(() => {
    if (localSettings && localSettings.currency) {
      setCurrencySymbol(currencySymbols[localSettings.currency] || localSettings.currency);
    }
  }, [localSettings, currencySymbols]);
  
  // Initialize component state from settings
  useEffect(() => {
    setLocalSettings(settings);
    if (settings && settings.currency) {
      setCurrencySymbol(currencySymbols[settings.currency] || settings.currency);
    }
  }, [settings, currencySymbols]);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleCategory = async (categoryId, enabled) => {
    try {
      await toggleCategory(categoryId, enabled);
      // Update local state
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, enabled } : cat
      ));
    } catch (err) {
      setError('Failed to update category: ' + (err.message || 'Unknown error'));
    }
  };
  
  const handleOpenAddDialog = () => {
    setNewCategory({
      name: '',
      color: '#4CAF50',
      enabled: true
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleColorChange = (color) => {
    setNewCategory({ ...newCategory, color: color.hex });
  };
  
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    try {
      const savedCategory = await addCategory(newCategory);
      setCategories([...categories, savedCategory]);
      setOpenDialog(false);
      setError(null);
    } catch (err) {
      setError('Failed to add category: ' + (err.message || 'Unknown error'));
    }
  };
  
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? Any payments using this category will have their category removed.')) {
      return;
    }
    
    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err) {
      setError('Failed to delete category: ' + (err.message || 'Unknown error'));
    }
  };

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];
  
  // eslint-disable-next-line no-unused-vars
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Update currency symbol if currency is changed
    if (name === 'currency') {
      setCurrencySymbol(currencySymbols[value] || value);
    }
  };
  
  // Update the handleSave function to exclude the removed settings

const handleSave = async () => {
  try {
    setSaving(true);
    console.log("Saving settings:", localSettings);
    
    // Make sure all required fields are present, but exclude removed settings
    const settingsToSave = {
      ...localSettings,
      currency: localSettings.currency || 'USD',
      dateFormat: localSettings.dateFormat || 'MM/DD/YYYY',
      start_balance: parseFloat(localSettings.start_balance || 0)
      // enableNotifications and showBalanceInHeader removed
    };
    
    console.log("Saving with date format:", settingsToSave.dateFormat);
    
    const updatedSettings = await updateSettings(settingsToSave);
    
    // Update app context with the returned settings from server
    if (typeof updateSettings === 'function') {
      updateSettings(updatedSettings);
    }
    
    // Update local state with the returned settings
    setLocalSettings(updatedSettings);
    
    setNotification({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    setNotification({
      open: true,
      message: `Failed to save settings: ${error.message}`,
      severity: 'error'
    });
  } finally {
    setSaving(false);
  }
};
  
  // eslint-disable-next-line no-unused-vars
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Add this useEffect to load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true); // Add this line
        const fetchedSettings = await fetchSettings();
        console.log("Settings loaded in component:", fetchedSettings);
        setLocalSettings(fetchedSettings || { currency: 'USD', start_balance: 0 });
        
        // Update currency symbol based on loaded settings
        if (fetchedSettings?.currency) {
          setCurrencySymbol(currencySymbols[fetchedSettings.currency] || fetchedSettings.currency);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Set default values on error
        setLocalSettings({ currency: 'USD', start_balance: 0 });
        setNotification({
          open: true,
          message: `Failed to load settings: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoadingSettings(false); // Add this line
      }
    };
    
    loadSettings();
  }, [currencySymbols]); // Add currencySymbols as dependency

  // Add account management functions
  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await fetchAccounts();
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Add this to your useEffect for initial loading
  useEffect(() => {
    loadAccounts();
    // Keep your existing code here
  }, []);

  const handleOpenAccountDialog = (mode = 'add', account = null) => {
    setAccountFormMode(mode);
    setAccountFormErrors({});
    
    if (mode === 'edit' && account) {
      setCurrentAccount({
        name: account.name,
        description: account.description || '',
        balance: account.balance || 0,
        currency: account.currency || 'USD',
        active: account.active === 1
      });
      setEditAccountId(account.id);
    } else {
      // Reset for add mode
      setCurrentAccount({
        name: '',
        description: '',
        balance: 0,
        currency: localSettings.currency || 'USD',
        active: true
      });
      setEditAccountId(null);
    }
    
    setAccountDialogOpen(true);
  };

  const handleCloseAccountDialog = () => {
    setAccountDialogOpen(false);
  };

  const handleAccountChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentAccount({
      ...currentAccount,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAccountSubmit = async () => {
    // Validation
    const errors = {};
    
    if (!currentAccount.name || currentAccount.name.trim() === '') {
      errors.name = 'Account name is required';
    }
    
    if (currentAccount.balance === '' || isNaN(currentAccount.balance)) {
      errors.balance = 'Balance must be a valid number';
    }
    
    // If errors exist, show them and stop
    if (Object.keys(errors).length > 0) {
      setAccountFormErrors(errors);
      return;
    }
    
    setAccountFormErrors({});
    
    try {
      const accountData = {
        name: currentAccount.name.trim(),
        description: currentAccount.description.trim(),
        balance: parseFloat(currentAccount.balance) || 0,
        currency: currentAccount.currency,
        active: currentAccount.active
      };
      
      let response;
      
      if (accountFormMode === 'edit') {
        response = await updateAccount(editAccountId, accountData);
        setAccounts(accounts.map(acc => acc.id === editAccountId ? response : acc));
        
        setNotification({
          open: true,
          message: 'Account updated successfully',
          severity: 'success'
        });
      } else {
        response = await addAccount(accountData);
        setAccounts([...accounts, response]);
        
        setNotification({
          open: true,
          message: 'Account added successfully',
          severity: 'success'
        });
      }
      
      handleCloseAccountDialog();
    } catch (err) {
      console.error('Failed to save account:', err);
      setNotification({
        open: true,
        message: `Failed to save account: ${err.message}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteAccountClick = (id) => {
    setDeleteAccountId(id);
    setDeleteAccountConfirmOpen(true);
  };

  const handleDeleteAccountClose = () => {
    setDeleteAccountConfirmOpen(false);
    setDeleteAccountId(null);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!deleteAccountId) return;
    
    try {
      await deleteAccount(deleteAccountId);
      setAccounts(accounts.filter(acc => acc.id !== deleteAccountId));
      handleDeleteAccountClose();
      
      setNotification({
        open: true,
        message: 'Account deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to delete account:', err);
      setNotification({
        open: true,
        message: `Failed to delete account: ${err.message}`,
        severity: 'error'
      });
    }
  };

  // Add this function if it doesn't exist
  const getCurrencySymbol = (code) => {
    const currency = currencies.find(c => c.code === code);
    return currency ? currency.symbol : code;
  };

  // Export data handler
  const handleExportData = async (format) => {
    setExportLoading(true);
    try {
      // For Excel/XLSX export
      if (format === 'xlsx') {
        const data = {
          payments: budget?.payments || [],
          incomes: budget?.incomes || [],
          accounts: accounts || [],
          categories: categories || []
        };
        exportToExcel(data, format, currencySymbol);
        
        setNotification({
          open: true,
          message: `Data successfully exported to XLSX`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      setNotification({
        open: true,
        message: `Export failed: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Add handler for opening the reset dialog
  const handleResetOpen = () => {
    setResetOpen(true);
  };

  // Add handler for closing the reset dialog
  const handleResetClose = () => {
    setResetOpen(false);
  };

  // Add handler for resetting data
  const handleResetData = async () => {
    try {
      setClearingData(true); // This uses the state setter
      await clearAllTransactions();
      
      setNotification({
        open: true,
        message: 'All transactions have been reset successfully',
        severity: 'success'
      });
      
      handleResetClose();
      
      // Refresh the page to show empty data
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      setNotification({
        open: true,
        message: `Failed to reset data: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setClearingData(false); // This uses the state setter
    }
  };

  // Add handler for opening the delete dialog
  const handleDeleteOpen = () => {
    setDeleteOpen(true);
    setDeleteInput('');
  };

  // Add handler for closing the delete dialog
  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setDeleteInput('');
  };

  // Add handler for deleting all data
  const handleDeleteData = async () => {
    if (deleteInput !== 'DELETE') return;
    
    try {
      setClearingData(true); // This uses the state setter
      // This would be your API call to delete all app data
      // For now we'll use clearAllTransactions as a placeholder
      await clearAllTransactions();
      
      setNotification({
        open: true,
        message: 'All data has been deleted successfully',
        severity: 'success'
      });
      
      handleDeleteClose();
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting all data:', error);
      setNotification({
        open: true,
        message: `Failed to delete data: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setClearingData(false); // This uses the state setter
    }
  };

  // Show a loading indicator while settings are being fetched
  if (loadingSettings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      <Box mb={3}>
        <Typography variant="h4" component="h1" fontWeight="500" color="primary">
          SeeCash Settings
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Configure your application preferences
        </Typography>
      </Box>
      
      {/* General Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>General Settings</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Default Currency</InputLabel>
              <Select
                name="currency"
                value={localSettings?.currency || 'USD'}
                onChange={handleChange}
                label="Default Currency"
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                name="dateFormat"
                value={localSettings?.dateFormat || 'MM/DD/YYYY'}
                onChange={handleChange}
                label="Date Format"
              >
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Categories Management */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Payment Categories</Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={handleOpenAddDialog}
          >
            Add Category
          </Button>
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" p={2}>
            No categories found. Create your first category to get started.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Color</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          bgcolor: category.color,
                          border: '1px solid rgba(0,0,0,0.12)'
                        }} 
                      />
                    </TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={category.enabled} 
                        onChange={(e) => handleToggleCategory(category.id, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        aria-label="delete category" 
                        onClick={() => handleDeleteCategory(category.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </Paper>

      {/* Account Management */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Accounts</Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpenAccountDialog('add')}
          >
            Add Account
          </Button>
        </Box>
      
        {loadingAccounts ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : accounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" p={2}>
            No accounts found. Create your first account to get started.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.description || '-'}</TableCell>
                    <TableCell align="right">
                      {getCurrencySymbol(account.currency)}
                      {parseFloat(account.balance).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={account.active ? "Active" : "Inactive"} 
                        color={account.active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        aria-label="edit account" 
                        onClick={() => handleOpenAccountDialog('edit', account)}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        aria-label="delete account" 
                        onClick={() => handleDeleteAccountClick(account.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Export Data */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
          <DownloadIcon sx={{ mr: 1 }} />
          Export Your Data
        </Typography>
        <Typography variant="body2" paragraph color="text.secondary">
          Download all your financial data in various formats for backup or use in other applications.
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              disabled={exportLoading}
              onClick={() => handleExportData('xlsx')}
            >
              Export XLSX
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Danger Zone */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderColor: red[300], 
          borderWidth: 1,
          borderStyle: 'solid',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(255, 205, 210, 0.2)'
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom 
          color="error" 
          display="flex" 
          alignItems="center"
        >
          <WarningIcon sx={{ mr: 1 }} />
          Danger Zone
        </Typography>
        <Typography variant="body2" paragraph color="error">
          These actions are destructive and cannot be reversed. Please proceed with caution.
        </Typography>
        
        <Grid container spacing={2} direction="column">
          <Grid item>
            <Button 
              variant="outlined" 
              color="warning"
              startIcon={<DeleteIcon />}
              onClick={handleResetOpen}
            >
              Reset All Data
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              This will delete all transactions but keep your accounts and settings.
            </Typography>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteOpen}
            >
              Delete All Data
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              This will permanently delete all your data including accounts and settings.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Reset Data Dialog */}
      <Dialog
        open={resetOpen}
        onClose={handleResetClose}
      >
        <DialogTitle>Reset All Data</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all your transactions but keep your account structures and settings. 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetClose}>Cancel</Button>
          <Button onClick={handleResetData} color="warning">
            Reset Data
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Data Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={handleDeleteClose}
      >
        <DialogTitle>Delete All Data</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete ALL your data including accounts, transactions, and settings.
            This action cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            To confirm, please type "DELETE" in the field below.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            variant="outlined"
            placeholder="DELETE"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteData} 
            color="error"
            disabled={deleteInput !== 'DELETE'}
          >
            Delete All Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Debug Section - at the very bottom */}
      {debugMode && (
        <Paper 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderColor: 'info.light', 
            borderWidth: 1,
            borderStyle: 'solid',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(3, 169, 244, 0.1)' : 'rgba(232, 244, 253, 0.7)'
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            color="info.main" 
            display="flex" 
            alignItems="center"
          >
            <Box component="span" sx={{ 
              display: 'inline-block',
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: 'info.main',
              mr: 1,
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '20px'
            }}>D</Box>
            Debug Options
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={debugMode} 
                    onChange={(e) => setDebugMode(e.target.checked)}
                  />
                }
                label="Enable Debug Mode"
              />
            </Grid>
            
            {debugMode && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Application Data</Typography>
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify({ 
                        settings: localSettings,
                        categories: categories.length,
                        accounts: accounts.length,
                      }, null, 2)}
                    </pre>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="outlined" 
                    color="info" 
                    size="small"
                    onClick={() => console.log('Debug data:', { settings, accounts, categories, budget })}
                  >
                    Log Data to Console
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      )}

      {/* Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{newCategory.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategory.name}
            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
          />
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Choose Color
            </Typography>
            <ChromePicker 
              color={newCategory.color}
              onChange={handleColorChange}
              disableAlpha
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddCategory} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onClose={handleCloseAccountDialog}>
        <DialogTitle>
          {accountFormMode === 'edit' ? 'Edit Account' : 'Add New Account'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Account Name"
            type="text"
            fullWidth
            value={currentAccount.name}
            onChange={handleAccountChange}
            error={!!accountFormErrors.name}
            helperText={accountFormErrors.name}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            value={currentAccount.description}
            onChange={handleAccountChange}
          />
          <TextField
            margin="dense"
            id="balance"
            name="balance"
            label="Balance"
            type="number"
            fullWidth
            value={currentAccount.balance}
            onChange={handleAccountChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">{getCurrencySymbol(currentAccount.currency)}</InputAdornment>,
            }}
            error={!!accountFormErrors.balance}
            helperText={accountFormErrors.balance}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Currency</InputLabel>
            <Select
              name="currency"
              value={currentAccount.currency}
              onChange={handleAccountChange}
              label="Currency"
            >
              {currencies.map(currency => (
                <MenuItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                name="active"
                checked={currentAccount.active}
                onChange={handleAccountChange}
              />
            }
            label="Active"
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccountDialog}>Cancel</Button>
          <Button onClick={handleAccountSubmit} color="primary">
            {accountFormMode === 'edit' ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteAccountConfirmOpen}
        onClose={handleDeleteAccountClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this account? Any transactions associated with this account will have their account removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteAccountClose}>Cancel</Button>
          <Button onClick={handleDeleteAccountConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Settings;