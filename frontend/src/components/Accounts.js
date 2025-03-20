import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, IconButton, Dialog, DialogActions, 
  DialogContent, DialogTitle, TextField, Box, Grid, Switch, 
  FormControlLabel, MenuItem, Alert, CircularProgress, Select, InputLabel, FormControl
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchAccounts, addAccount, updateAccount, deleteAccount } from '../services/api';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    description: '',
    balance: 0,
    currency: 'USD',
    active: true
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' }
  ];
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await fetchAccounts();
      setAccounts(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClickOpen = () => {
    setEditMode(false);
    setNewAccount({
      name: '',
      description: '',
      balance: 0,
      currency: 'USD',
      active: true
    });
    setFormErrors({});
    setOpen(true);
  };
  
  const handleEditClick = (account) => {
    setEditMode(true);
    setEditAccountId(account.id);
    setNewAccount({
      name: account.name,
      description: account.description || '',
      balance: account.balance || 0,
      currency: account.currency || 'USD',
      active: account.active === 1
    });
    setFormErrors({});
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setEditAccountId(null);
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAccount({
      ...newAccount,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async () => {
    // Basic validation
    const errors = {};
    
    if (!newAccount.name || newAccount.name.trim() === '') {
      errors.name = 'Account name is required';
    }
    
    if (newAccount.balance === '' || isNaN(newAccount.balance)) {
      errors.balance = 'Balance must be a valid number';
    }
    
    // If we have validation errors
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Clear previous errors
    setFormErrors({});
    
    try {
      const accountPayload = {
        name: newAccount.name.trim(),
        description: newAccount.description.trim(),
        balance: parseFloat(newAccount.balance) || 0,
        currency: newAccount.currency,
        active: newAccount.active
      };
      
      let response;
      
      if (editMode) {
        accountPayload.id = editAccountId;
        response = await updateAccount(editAccountId, accountPayload);
        
        // Update the accounts list
        setAccounts(accounts.map(account => 
          account.id === editAccountId ? response : account
        ));
      } else {
        response = await addAccount(accountPayload);
        
        // Add to accounts list
        setAccounts([...accounts, response]);
      }
      
      // Close the dialog
      handleClose();
      
    } catch (err) {
      console.error(`Failed to ${editMode ? 'update' : 'add'} account:`, err);
      setError(`Failed to ${editMode ? 'update' : 'add'} account: ${err.message}`);
    }
  };
  
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };
  
  const handleDeleteClose = () => {
    setDeleteConfirmOpen(false);
    setDeleteId(null);
  };
  
  const handleDeleteConfirm = async () => {
    if (deleteId) {
      try {
        await deleteAccount(deleteId);
        setAccounts(accounts.filter(account => account.id !== deleteId));
        handleDeleteClose();
      } catch (err) {
        console.error('Failed to delete account:', err);
        setError(`Failed to delete account: ${err.message}`);
        handleDeleteClose();
      }
    }
  };
  
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$'
  };
  
  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Accounts</Typography>
          <Button variant="contained" onClick={handleClickOpen}>Add Account</Button>
        </Grid>
        
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}
        
        <Grid item xs={12}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : accounts.length > 0 ? (
            <Paper sx={{ p: 2 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>{account.description || '-'}</TableCell>
                        <TableCell align="right">
                          {currencySymbols[account.currency] || account.currency}
                          {parseFloat(account.balance).toFixed(2)}
                        </TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell>{account.active === 1 ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>
                          <IconButton 
                            edge="start" 
                            aria-label="edit"
                            onClick={() => handleEditClick(account)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => handleDeleteClick(account.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Alert severity="info">No accounts found. Create your first account to get started.</Alert>
          )}
        </Grid>
      </Grid>
      
      {/* Add/Edit Account Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  margin="dense"
                  name="name"
                  label="Account Name"
                  type="text"
                  fullWidth
                  value={newAccount.name}
                  onChange={handleChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="description"
                  label="Description (optional)"
                  type="text"
                  fullWidth
                  value={newAccount.description}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  name="balance"
                  label="Starting Balance"
                  type="number"
                  fullWidth
                  value={newAccount.balance}
                  onChange={handleChange}
                  error={!!formErrors.balance}
                  helperText={formErrors.balance}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="currency"
                    value={newAccount.currency}
                    onChange={handleChange}
                    label="Currency"
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newAccount.active}
                      onChange={handleChange}
                      name="active"
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete Account?"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this account? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Accounts;