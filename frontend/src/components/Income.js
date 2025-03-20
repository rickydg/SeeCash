import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Grid, Button, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText,
  IconButton, FormControlLabel, Switch, RadioGroup, Radio, FormControl,
  FormLabel, Tooltip, Alert, InputLabel, Select, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import { fetchBudget, addIncome, deleteIncome, updateIncome } from '../services/api';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import EditIcon from '@mui/icons-material/Edit';

// Load the isoWeek plugin for dayjs - needed for working with weekdays
dayjs.extend(isoWeek);

// Reuse the UK_BANK_HOLIDAYS constant from Payments.js
// Either import it or copy it here
// Import example:
// import { UK_BANK_HOLIDAYS } from './Payments';

// UK Bank holidays from 2024 to 2030 (copied from Payments component)
const UK_BANK_HOLIDAYS = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-03-29', // Good Friday
  '2024-04-01', // Easter Monday
  '2024-05-06', // Early May Bank Holiday
  '2024-05-27', // Spring Bank Holiday
  '2024-08-26', // Summer Bank Holiday
  '2024-12-25', // Christmas Day
  '2024-12-26', // Boxing Day
  
  // 2025-2030 entries would be here (same as in Payments.js)
  // ...
];

// Function to check if a date is a weekend
const isWeekend = (date) => {
  const day = date.day();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

// Function to check if a date is a UK bank holiday
const isBankHoliday = (date) => {
  const dateString = date.format('YYYY-MM-DD');
  return UK_BANK_HOLIDAYS.includes(dateString);
};

// Function to adjust date based on user preferences
const adjustDate = (date, adjustWeekends, adjustHolidays, adjustment) => {
  if (!date) return date;
  
  let adjustedDate = date.clone();
  let needsAdjustment = false;
  
  // Check if date falls on weekend or holiday
  if ((adjustWeekends && isWeekend(adjustedDate)) || 
      (adjustHolidays && isBankHoliday(adjustedDate))) {
    needsAdjustment = true;
  }
  
  // Apply adjustment if needed
  if (needsAdjustment) {
    if (adjustment === 'previous') {
      // Move to previous business day
      adjustedDate = adjustedDate.subtract(1, 'day');
      
      // Keep moving back until we find a good day
      while (isWeekend(adjustedDate) || (adjustHolidays && isBankHoliday(adjustedDate))) {
        adjustedDate = adjustedDate.subtract(1, 'day');
      }
    } else {
      // Move to next business day
      adjustedDate = adjustedDate.add(1, 'day');
      
      // Keep moving forward until we find a good day
      while (isWeekend(adjustedDate) || (adjustHolidays && isBankHoliday(adjustedDate))) {
        adjustedDate = adjustedDate.add(1, 'day');
      }
    }
  }
  
  return adjustedDate;
};

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [open, setOpen] = useState(false);
  const [newIncome, setNewIncome] = useState({
    description: '',
    amount: '',
    date: dayjs(),
    recurring: false,
    frequency: 'monthly',
    frequencyDay: null, // day of week (0-6) or day of month (1-31)
    account_id: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  
  // New state for date adjustment options
  const [adjustWeekends, setAdjustWeekends] = useState(false);
  const [adjustHolidays, setAdjustHolidays] = useState(false);
  const [dateAdjustment, setDateAdjustment] = useState('previous'); // 'previous' or 'next'
  
  // Add these to your component state:
  const [editMode, setEditMode] = useState(false);
  const [editIncomeId, setEditIncomeId] = useState(null);
  
  // New state for form errors
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  
  // Add accounts to component state
  const [accounts, setAccounts] = useState([]);
  
  // Add state for date format
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  
  // Get the adjusted date for display
  const getAdjustedDate = () => {
    const originalDate = newIncome.date;
    const adjustedDate = adjustDate(originalDate, adjustWeekends, adjustHolidays, dateAdjustment);
    
    // If date was adjusted, return information about the change
    if (adjustedDate && !adjustedDate.isSame(originalDate, 'day')) {
      return {
        isAdjusted: true,
        original: originalDate,
        adjusted: adjustedDate,
        message: `Date adjusted from ${originalDate.format('MMM D, YYYY')} to ${adjustedDate.format('MMM D, YYYY')}`
      };
    }
    
    return { isAdjusted: false, adjusted: originalDate };
  };
  
  // Load incomes from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchBudget();
        setIncomes(data.incomes || []);
        setAccounts(data.accounts || []);
        
        // Set date format from settings
        if (data && data.settings) {
          // Set date format based on settings
          setDateFormat(data.settings.dateFormat || 'MM/DD/YYYY');
        }
        
        // Set currency symbol based on budget settings
        if (data && data.settings && data.settings.currency) {
          const symbols = {
            'USD': '$',
            'GBP': '£',
            'EUR': '€',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$'
          };
          setCurrencySymbol(symbols[data.settings.currency] || data.settings.currency);
        }
      } catch (error) {
        console.error('Failed to load incomes:', error);
      }
    };
    
    loadData();
  }, []);
  
  const handleClickOpen = () => {
    setOpen(true);
  };
  
  // Add the handleEditClick function:
  const handleEditClick = (income) => {
    setEditMode(true);
    setEditIncomeId(income.id);
    
    // Convert string date to dayjs object
    const incomeDate = dayjs(income.date);
    
    setNewIncome({
      id: income.id,
      description: income.description,
      amount: income.amount,
      date: incomeDate,
      recurring: income.recurring === 1, // Fix: Convert 1/0 to boolean
      frequency: income.frequency || 'monthly',
      account_id: income.account_id || '', // Add this line to properly load account_id
      frequencyDay: income.frequencyDay || null, // Add this line to properly load frequencyDay
    });
    
    setOpen(true);
  };
  
  // Update your handleClose function:
  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setEditIncomeId(null);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewIncome({
      ...newIncome,
      [name]: value
    });
  };
  
  const handleDateChange = (date) => {
    setNewIncome({
      ...newIncome,
      date: date
    });
  };
  
  // Enhanced error handling in handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const errors = {};
    
    if (!newIncome.description || newIncome.description.trim() === '') {
      errors.description = "Description is required";
    }
    
    if (!newIncome.amount || isNaN(newIncome.amount) || Number(newIncome.amount) <= 0) {
      errors.amount = "Amount must be a positive number";
    }
    
    if (!newIncome.date) {
      errors.date = "Date is required";
    }
    
    // If we have validation errors
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Clear previous errors
    setFormErrors({});
    setSubmitError(null);
    
    try {
      // Get adjusted date if needed
      const dateAdjustment = getAdjustedDate();
      const adjustedDate = dateAdjustment.adjusted;
      
      // Create a properly formatted payload with explicit types
      const incomeData = {
        description: String(newIncome.description).trim(),
        amount: parseFloat(newIncome.amount),
        date: adjustedDate.format('YYYY-MM-DD'),
        recurring: newIncome.recurring ? 1 : 0, // Convert to 1/0 for the API
        frequency: newIncome.recurring ? newIncome.frequency : null,
        frequency_day: newIncome.recurring ? newIncome.frequencyDay : null, // Add this line
        account_id: newIncome.account_id || null, // Ensure account_id is included
      };
      
      // Include ID only for edit operations
      if (editMode && editIncomeId) {
        incomeData.id = editIncomeId;
      }
      
      console.log("Submitting income data:", JSON.stringify(incomeData, null, 2));
      
      let response;
      if (editMode) {
        response = await updateIncome(incomeData);
        // Make sure we handle both response formats
        const updatedIncome = response.data ? response.data : response;
        setIncomes(incomes.map(income => 
          income.id === editIncomeId ? updatedIncome : income
        ));
      } else {
        response = await addIncome(incomeData);
        // Make sure we handle both response formats
        const newIncomeRecord = response.data ? response.data : response;
        setIncomes([...incomes, newIncomeRecord]);
      }
      
      // Reset form and close dialog
      setNewIncome({
        description: '',
        amount: '',
        date: dayjs(),
        recurring: false,
        frequency: 'monthly',
        frequencyDay: null, // Reset frequencyDay
        account_id: '', // Reset account_id
      });
      handleClose();
      
    } catch (error) {
      console.error("Failed to submit income:", error);
      
      // Enhanced error logging
      if (error.response) {
        console.error("Server responded with error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      setSubmitError(`Error ${editMode ? 'updating' : 'adding'} income: ${error.message}`);
    }
  };
  
  // Handle delete confirmation
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
        await deleteIncome(deleteId);
        // Update the local state by removing the deleted income
        setIncomes(incomes.filter(income => income.id !== deleteId));
        handleDeleteClose();
      } catch (error) {
        console.error('Failed to delete income:', error);
        alert(`Error deleting income: ${error.message}`);
      }
    }
  };
  
  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Box mb={3}>
            <Typography variant="h4" component="h1" fontWeight="500" color="primary">
              Income Tracking
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage your income sources
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleClickOpen}>Add Income</Button>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Account</TableCell> {/* Add this */}
                    <TableCell>Recurring</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell>{income.description}</TableCell>
                      <TableCell>{currencySymbol}{parseFloat(income.amount).toFixed(2)}</TableCell>
                      <TableCell>{dayjs(income.date).format(dateFormat)}</TableCell>
                      <TableCell>{income.account_name || 'None'}</TableCell> {/* Add this */}
                      <TableCell>{income.recurring ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{income.recurring ? income.frequency : '-'}</TableCell>
                      <TableCell>
                        <IconButton 
                          edge="start" 
                          aria-label="edit"
                          onClick={() => handleEditClick(income)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteClick(income.id)}
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
        </Grid>
      </Grid>
      
      {/* Add Income Dialog - updated with date adjustment options */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Income' : 'Add New Income'}</DialogTitle>
        <DialogContent>
          <TextField
            error={!!formErrors.description}
            helperText={formErrors.description || ''}
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            value={newIncome.description}
            onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
          />
          
          <TextField
            error={!!formErrors.amount}
            helperText={formErrors.amount || ''}
            margin="dense"
            id="amount"
            label="Amount"
            type="number"
            fullWidth
            value={newIncome.amount}
            onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
          />
          
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={newIncome.date}
              onChange={handleDateChange}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  margin: 'dense',
                  error: !!formErrors.date,
                  helperText: formErrors.date || '' 
                } 
              }}
            />
          </LocalizationProvider>
          
          {/* Display date adjustment notice if applicable */}
          {getAdjustedDate().isAdjusted && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {getAdjustedDate().message}
            </Alert>
          )}
          
          {/* Date adjustment options */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} display="flex" alignItems="center">
                <Typography variant="subtitle2">
                  Date Adjustment Options
                </Typography>
                <Tooltip title="Automatically adjust dates that fall on weekends or bank holidays">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={adjustWeekends} 
                      onChange={(e) => setAdjustWeekends(e.target.checked)}
                    />
                  }
                  label="Adjust weekend dates"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={adjustHolidays} 
                      onChange={(e) => setAdjustHolidays(e.target.checked)}
                    />
                  }
                  label="Adjust bank holiday dates"
                />
              </Grid>
              
              {(adjustWeekends || adjustHolidays) && (
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Move to:</FormLabel>
                    <RadioGroup
                      row
                      value={dateAdjustment}
                      onChange={(e) => setDateAdjustment(e.target.value)}
                    >
                      <FormControlLabel 
                        value="previous" 
                        control={<Radio />} 
                        label="Previous business day" 
                      />
                      <FormControlLabel 
                        value="next" 
                        control={<Radio />} 
                        label="Next business day" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {/* Recurring income options */}
          <FormControlLabel
            control={
              <Switch
                checked={newIncome.recurring}
                onChange={(e) => {
                  setNewIncome({
                    ...newIncome,
                    recurring: e.target.checked
                  });
                }}
                name="recurring"
              />
            }
            label="Recurring Income"
            sx={{ mt: 2 }}
          />
          
          {newIncome.recurring && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel id="frequency-label">Frequency</InputLabel>
                <Select
                  labelId="frequency-label"
                  name="frequency"
                  value={newIncome.frequency}
                  onChange={handleChange}
                  label="Frequency"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="fortnightly">Fortnightly (Every 2 weeks)</MenuItem>
                  <MenuItem value="four-weekly">Every 4 weeks</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
              
              {/* Day selection - conditionally show based on frequency */}
              {newIncome.frequency === 'weekly' || 
               newIncome.frequency === 'fortnightly' || 
               newIncome.frequency === 'four-weekly' ? (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="frequency-day-week-label">Day of week</InputLabel>
                  <Select
                    labelId="frequency-day-week-label"
                    name="frequencyDay"
                    value={newIncome.frequencyDay !== null ? newIncome.frequencyDay : dayjs(newIncome.date).day()}
                    onChange={handleChange}
                    label="Day of week"
                  >
                    <MenuItem value={0}>Sunday</MenuItem>
                    <MenuItem value={1}>Monday</MenuItem>
                    <MenuItem value={2}>Tuesday</MenuItem>
                    <MenuItem value={3}>Wednesday</MenuItem>
                    <MenuItem value={4}>Thursday</MenuItem>
                    <MenuItem value={5}>Friday</MenuItem>
                    <MenuItem value={6}>Saturday</MenuItem>
                  </Select>
                </FormControl>
              ) : newIncome.frequency === 'monthly' ? (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="frequency-day-month-label">Day of month</InputLabel>
                  <Select
                    labelId="frequency-day-month-label"
                    name="frequencyDay"
                    value={newIncome.frequencyDay !== null ? newIncome.frequencyDay : dayjs(newIncome.date).date()}
                    onChange={handleChange}
                    label="Day of month"
                  >
                    {[...Array(31)].map((_, i) => (
                      <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </>
          )}
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="account-select-label">Account</InputLabel>
            <Select
              labelId="account-select-label"
              id="account-select"
              value={newIncome.account_id || ''}
              onChange={(e) => setNewIncome({...newIncome, account_id: e.target.value})}
              label="Account"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {submitError && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {submitError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{editMode ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this income record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Income;