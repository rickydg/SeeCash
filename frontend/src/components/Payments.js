import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Grid, Button, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText,
  IconButton, FormControlLabel, Switch, RadioGroup, Radio, FormControl,
  FormLabel, Tooltip, InputLabel, Select, Box, Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import { fetchBudget, addPayment, deletePayment, updatePayment, fetchCategories, fetchAccounts } from '../services/api';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import MuiAlert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

// Load the isoWeek plugin for dayjs - needed for working with weekdays
dayjs.extend(isoWeek);

// UK Bank holidays from 2024 to 2030
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
  
  // 2025
  '2025-01-01', // New Year's Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-05', // Early May Bank Holiday
  '2025-05-26', // Spring Bank Holiday
  '2025-08-25', // Summer Bank Holiday
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
  
  // 2026
  '2026-01-01', // New Year's Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04', // Early May Bank Holiday
  '2026-05-25', // Spring Bank Holiday
  '2026-08-31', // Summer Bank Holiday
  '2026-12-25', // Christmas Day
  '2026-12-28', // Boxing Day (substitute day)
  
  // 2027
  '2027-01-01', // New Year's Day
  '2027-03-26', // Good Friday
  '2027-03-29', // Easter Monday
  '2027-05-03', // Early May Bank Holiday
  '2027-05-31', // Spring Bank Holiday
  '2027-08-30', // Summer Bank Holiday
  '2027-12-27', // Christmas Day (substitute day)
  '2027-12-28', // Boxing Day (substitute day)
  
  // 2028
  '2028-01-03', // New Year's Day (substitute day)
  '2028-04-14', // Good Friday
  '2028-04-17', // Easter Monday
  '2028-05-01', // Early May Bank Holiday
  '2028-05-29', // Spring Bank Holiday
  '2028-08-28', // Summer Bank Holiday
  '2028-12-25', // Christmas Day
  '2028-12-26', // Boxing Day
  
  // 2029
  '2029-01-01', // New Year's Day
  '2029-03-30', // Good Friday
  '2029-04-02', // Easter Monday
  '2029-05-07', // Early May Bank Holiday
  '2029-05-28', // Spring Bank Holiday
  '2029-08-27', // Summer Bank Holiday
  '2029-12-25', // Christmas Day
  '2029-12-26', // Boxing Day
  
  // 2030
  '2030-01-01', // New Year's Day
  '2030-04-19', // Good Friday
  '2030-04-22', // Easter Monday
  '2030-05-06', // Early May Bank Holiday
  '2030-05-27', // Spring Bank Holiday
  '2030-08-26', // Summer Bank Holiday
  '2030-12-25', // Christmas Day
  '2030-12-26'  // Boxing Day
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

const Payments = () => {
  // Get theme from MUI
  const theme = useTheme();
  
  const [payments, setPayments] = useState([]);
  const [open, setOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    description: '',
    amount: '',
    date: dayjs(), // Using dayjs instead of new Date()
    recurring: false,
    frequency: 'monthly',
    frequencyDay: null, // day of week (0-6) or day of month (1-31)
    endDate: null,
    category_id: '',
    account_id: '',  // Add this line
    payment_type: 'direct_debit' // Default payment type
  });
  
  // New state for editing
  // eslint-disable-next-line no-unused-vars
  const [editMode, setEditMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [editPaymentId, setEditPaymentId] = useState(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  
  // New state for date adjustment options
  const [adjustWeekends, setAdjustWeekends] = useState(false);
  const [adjustHolidays, setAdjustHolidays] = useState(false);
  const [dateAdjustment, setDateAdjustment] = useState('previous'); // 'previous' or 'next'
  
  // Date adjustment info tooltip - will be used in future feature
  const [showDateInfo, setShowDateInfo] = useState(false);  // TODO: Implement date info tooltip
  
  // Add this with your other useState declarations at the top of the component
  const [formErrors, setFormErrors] = useState({});
  
  // Add state for categories
  const [categories, setCategories] = useState([]);
  
  // Add this state variable near the top with your other useState declarations
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Add this function to close notifications
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Add accounts to component state
  const [accounts, setAccounts] = useState([]);

  // Add this state variable
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');

  // Add sorting state
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Add account filter state
  const [accountFilter, setAccountFilter] = useState('all');

  // Add state for date format
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  // Update the filtering logic to handle both filters
  const filteredPayments = payments.filter(payment => {
    // Filter by payment type
    const typeMatches = paymentTypeFilter === 'all' || payment.payment_type === paymentTypeFilter;
    
    // Filter by account
    const accountMatches = 
      accountFilter === 'all' || 
      (payment.account_id && payment.account_id.toString() === accountFilter) ||
      (!payment.account_id && accountFilter === 'none');
    
    return typeMatches && accountMatches;
  });

  // Add sorting function
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortColumn) {
      case 'description':
        aValue = a.description?.toLowerCase() || '';
        bValue = b.description?.toLowerCase() || '';
        break;
      case 'amount':
        aValue = parseFloat(a.amount) || 0;
        bValue = parseFloat(b.amount) || 0;
        break;
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'category':
        aValue = a.category_name?.toLowerCase() || '';
        bValue = b.category_name?.toLowerCase() || '';
        break;
      case 'account':
        aValue = a.account_name?.toLowerCase() || '';
        bValue = b.account_name?.toLowerCase() || '';
        break;
      case 'payment_type':
        aValue = a.payment_type?.toLowerCase() || '';
        bValue = b.payment_type?.toLowerCase() || '';
        break;
      default:
        aValue = a[sortColumn];
        bValue = b[sortColumn];
    }
    
    // Handle the sort direction
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    // Compare the values
    if (aValue < bValue) return -1 * direction;
    if (aValue > bValue) return 1 * direction;
    return 0;
  });

  // Handle sort request
  const handleSort = (column) => {
    // If clicking the same column, toggle direction
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, set it as the sort column with default desc direction
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Create a helper function to render sort indicators
  const getSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' 🔼' : ' 🔽';
  };

  // Get the adjusted date for display
  const getAdjustedDate = () => {
    const originalDate = newPayment.date;
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
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchBudget();
        setPayments(data.payments || []);
        setCategories(data.categories || []);
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
        console.error('Failed to load payments:', error);
      }
    };
    
    loadData();
  }, []);
  
  // Load categories during component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    
    loadCategories();
  }, []);

  // Add this to useEffect
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsData = await fetchAccounts();
        setAccounts(accountsData.filter(acc => acc.active === 1));
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    
    loadAccounts();
  }, []);
  
  const handleClickOpen = () => {
    // Reset form for adding new payment
    setEditMode(false);
    setNewPayment({
      description: '',
      amount: '',
      date: dayjs(),
      recurring: false,
      frequency: 'monthly',
      frequencyDay: null, // day of week (0-6) or day of month (1-31)
      endDate: null,
      category_id: '',
      account_id: '',  // Add this line
      payment_type: 'direct_debit' // Default payment type
    });
    setOpen(true);
  };
  
  // New handler for opening edit dialog
  const handleEditClick = (payment) => {
    setEditMode(true);
    setEditPaymentId(payment.id);
    
    // Convert string dates to dayjs objects
    const paymentDate = dayjs(payment.date);
    const endDate = payment.end_date ? dayjs(payment.end_date) : null;
    
    setNewPayment({
      description: payment.description,
      amount: payment.amount,
      date: paymentDate,
      recurring: payment.recurring === 1, // Fix: Convert 1/0 to boolean
      frequency: payment.frequency || 'monthly',
      frequencyDay: payment.frequency_day || null, // Add this line to properly load frequencyDay
      endDate: endDate,
      category_id: payment.category_id,
      account_id: payment.account_id || '', // Add this line to properly load account_id
      payment_type: payment.payment_type || 'direct_debit' // Add this line to properly load payment_type
    });
    
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setEditPaymentId(null);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewPayment({
      ...newPayment,
      [name]: value
    });
  };
  
  const handleSwitchChange = (e) => {
    setNewPayment({
      ...newPayment,
      recurring: e.target.checked
    });
  };
  
  const handleDateChange = (date) => {
    setNewPayment({
      ...newPayment,
      date: date
    });
  };
  
  const handleEndDateChange = (date) => {
    setNewPayment({
      ...newPayment,
      endDate: date
    });
  };
  
  const handleSubmit = async () => {
    try {
      // Basic validation
      const errors = {};
      
      if (!newPayment.description || newPayment.description.trim() === '') {
        errors.description = "Description is required";
      }
      
      if (!newPayment.amount || isNaN(newPayment.amount) || Number(newPayment.amount) <= 0) {
        errors.amount = "Amount must be a positive number";
      }
      
      if (!newPayment.date) {
        errors.date = "Date is required";
      }
      
      // If we have validation errors
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      
      // Clear previous errors
      setFormErrors({});
      
      // Get adjusted date if needed
      const dateAdjustment = getAdjustedDate();
      const adjustedDate = dateAdjustment.adjusted;
      
      // Create a properly formatted payload
      const paymentPayload = {
        description: newPayment.description,
        amount: parseFloat(newPayment.amount),
        date: adjustedDate.format('YYYY-MM-DD'),
        recurring: Boolean(newPayment.recurring),
        frequency: newPayment.recurring ? newPayment.frequency : null,
        frequency_day: newPayment.recurring ? newPayment.frequencyDay : null,
        category_id: newPayment.category_id || null,
        account_id: newPayment.account_id || null,
        payment_type: newPayment.payment_type || 'direct_debit' // Include payment_type
      };
      
      // Handle end_date only if it exists and payment is recurring
      if (newPayment.recurring && newPayment.endDate) {
        paymentPayload.end_date = newPayment.endDate.format('YYYY-MM-DD');
      }
      
      // For edit mode, include the ID
      if (editMode) {
        paymentPayload.id = editPaymentId;
      }
      
      // Log the final payload for debugging
      console.log("Sending payment data:", paymentPayload);
      
      let response;
      if (editMode) {
        response = await updatePayment(editPaymentId, paymentPayload);
        setPayments(payments.map(payment => 
          payment.id === editPaymentId ? response : payment
        ));
        
        setNotification({
          open: true,
          message: 'Payment updated successfully',
          severity: 'success'
        });
      } else {
        response = await addPayment(paymentPayload);
        setPayments([...payments, response]);
        
        setNotification({
          open: true,
          message: 'Payment added successfully',
          severity: 'success'
        });
      }
      
      // Reset form and close dialog
      handleClose();
      
    } catch (error) {
      console.error(`Failed to ${editMode ? 'update' : 'add'} payment:`, error);
      
      // Enhanced error logging
      if (error.response) {
        console.log("Error response data:", error.response.data);
        console.log("Error response status:", error.response.status);
      }
      
      setNotification({
        open: true,
        message: `Error ${editMode ? 'updating' : 'adding'} payment: ${error.message}`,
        severity: 'error'
      });
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
        await deletePayment(deleteId);
        // Update the local state by removing the deleted payment
        setPayments(payments.filter(payment => payment.id !== deleteId));
        handleDeleteClose();
      } catch (error) {
        console.error('Failed to delete payment:', error);
        alert(`Error deleting payment: ${error.message}`);
      }
    }
  };

  // Add this before your return statement
  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  // Create a reusable sortable column component function

  // Add this helper function before your return statement
  const SortableTableCell = ({ column, label }) => (
    <TableCell 
      onClick={() => handleSort(column)}
      sx={{ 
        cursor: 'pointer',
        fontWeight: sortColumn === column ? 'bold' : 'normal',
        backgroundColor: sortColumn === column ? alpha(theme.palette.primary.light, 0.1) : 'inherit',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.light, 0.05),
        }
      }}
    >
      <Box display="flex" alignItems="center">
        {label}
        <Box component="span" ml={0.5}>
          {sortColumn === column && (
            sortDirection === 'asc' ? '↑' : '↓'
          )}
        </Box>
      </Box>
    </TableCell>
  );

  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Box mb={3}>
            <Typography variant="h4" component="h1" fontWeight="500" color="primary">
              Payment Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Track and schedule your expenses
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleClickOpen}>Add Payment</Button>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" gap={2} mb={2}>
            {/* Payment Type Filter */}
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Payment Type</InputLabel>
              <Select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                label="Payment Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="direct_debit">Direct Debit</MenuItem>
                <MenuItem value="standing_order">Standing Order</MenuItem>
                <MenuItem value="card">Card</MenuItem>
              </Select>
            </FormControl>
            
            {/* Account Filter */}
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Account</InputLabel>
              <Select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                label="Account"
              >
                <MenuItem value="all">All Accounts</MenuItem>
                <MenuItem value="none">No Account</MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <SortableTableCell column="description" label="Description" />
                    <SortableTableCell column="amount" label="Amount" />
                    <SortableTableCell column="date" label="Date" />
                    <SortableTableCell column="category" label="Category" />
                    <SortableTableCell column="account" label="Account" />
                    <SortableTableCell column="payment_type" label="Payment Type" />
                    <TableCell>Recurring</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPayments.map((payment, index) => (
                    // Keep your existing row code, but use sortedPayments instead of filteredPayments
                    <TableRow key={payment.id || index}>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>
                        {currencySymbol}{parseFloat(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{dayjs(payment.date).format(dateFormat)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box 
                            sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: '50%', 
                              bgcolor: payment.category_color,
                              mr: 1 
                            }} 
                          />
                          {payment.category_name || 'None'}
                        </Box>
                      </TableCell>
                      <TableCell>{payment.account_name || 'None'}</TableCell> {/* Display account name */}
                      <TableCell>
                        {payment.payment_type ? 
                          payment.payment_type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ') : 
                          'Direct Debit'}
                      </TableCell>
                      <TableCell>{payment.recurring ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{payment.recurring ? payment.frequency : '-'}</TableCell>
                      <TableCell>
                        {payment.end_date ? dayjs(payment.end_date).format(dateFormat) : '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          edge="start" 
                          aria-label="edit"
                          onClick={() => handleEditClick(payment)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteClick(payment.id)}
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
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMode ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
        <DialogContent>
          <TextField
            error={!!formErrors.description}
            helperText={formErrors.description || ''}
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            value={newPayment.description}
            onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
          />
          <TextField
            error={!!formErrors.amount}
            helperText={formErrors.amount || ''}
            margin="dense"
            id="amount"
            label="Amount"
            type="number"
            fullWidth
            value={newPayment.amount}
            onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={newPayment.date}
              onChange={handleDateChange}
              slotProps={{ textField: { fullWidth: true, margin: 'dense' } }}
            />
          </LocalizationProvider>
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={newPayment.category_id || ''}
              onChange={(e) => setNewPayment({...newPayment, category_id: e.target.value})}
              label="Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {categories
                .filter(cat => cat.enabled)
                .map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          bgcolor: category.color,
                          mr: 1 
                        }} 
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel id="account-select-label">Account</InputLabel>
            <Select
              labelId="account-select-label"
              id="account-select"
              value={newPayment.account_id || ''}
              onChange={(e) => setNewPayment({...newPayment, account_id: e.target.value})}
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
          <FormControl fullWidth margin="dense">
            <InputLabel id="payment-type-label">Payment Type</InputLabel>
            <Select
              labelId="payment-type-label"
              id="payment-type"
              value={newPayment.payment_type || 'direct_debit'}
              onChange={(e) => setNewPayment({...newPayment, payment_type: e.target.value})}
              label="Payment Type"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="direct_debit">Direct Debit</MenuItem>
              <MenuItem value="standing_order">Standing Order</MenuItem>
              <MenuItem value="card">Card</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch 
                checked={newPayment.recurring} 
                onChange={handleSwitchChange}
                name="recurring" 
              />
            }
            label="Recurring Payment"
          />
          {newPayment.recurring && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel id="frequency-label">Frequency</InputLabel>
                <Select
                  labelId="frequency-label"
                  name="frequency"
                  value={newPayment.frequency}
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
              {newPayment.frequency === 'weekly' || 
               newPayment.frequency === 'fortnightly' ||
               newPayment.frequency === 'four-weekly' ? (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="frequency-day-week-label">Day of week</InputLabel>
                  <Select
                    labelId="frequency-day-week-label"
                    name="frequencyDay"
                    value={newPayment.frequencyDay !== null ? newPayment.frequencyDay : dayjs(newPayment.date).day()}
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
              ) : newPayment.frequency === 'monthly' ? (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="frequency-day-month-label">Day of month</InputLabel>
                  <Select
                    labelId="frequency-day-month-label"
                    name="frequencyDay"
                    value={newPayment.frequencyDay !== null ? newPayment.frequencyDay : dayjs(newPayment.date).date()}
                    onChange={handleChange}
                    label="Day of month"
                  >
                    {[...Array(31)].map((_, i) => (
                      <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="End Date (Optional)"
                  value={newPayment.endDate}
                  onChange={handleEndDateChange}
                  slotProps={{ textField: { fullWidth: true, margin: 'dense' } }}
                />
              </LocalizationProvider>
            </>
          )}
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
          <FormControlLabel
            control={
              <Switch
                checked={showDateInfo}
                onChange={(e) => setShowDateInfo(e.target.checked)}
              />
            }
            label="Show date info"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this payment record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
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

export default Payments;