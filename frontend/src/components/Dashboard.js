import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Typography, Paper, Grid, CircularProgress, Alert, Box,
  ToggleButtonGroup, ToggleButton, Card, CardContent, TextField
} from '@mui/material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchBudget } from '../services/api';
import dayjs from 'dayjs';
import DebugPanel from './DebugPanel';
import { AppContext } from '../context/AppContext';
import ApiDebugger from './ApiDebugger';
import CategoryTransactionsTable from './CategoryTransactionsTable';
import { useTheme, alpha } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { fetchAccounts } from '../services/api';

// 1. Move currency symbols outside component to prevent recreation on each render
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'GBP': '£',
  'EUR': '€',
  'JPY': '¥',
  'CAD': 'C$',
  'AUD': 'A$'
};

const Dashboard = () => {
  const { debugMode } = useContext(AppContext);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [budgetData, setBudgetData] = useState(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState({
    rawBudgetData: null,
    processedChartData: null,
    dataErrors: []
  });

  // Add state for time period selection
  const [timePeriod, setTimePeriod] = useState(() => 
    localStorage.getItem('dashboard_timePeriod') || '12m');
  
  // Add summary data state
  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    startBalance: 0,
    endBalance: 0
  });

  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);

  // 2. Memoize the processDataForCharts function
  const processDataForCharts = useCallback((data, period) => {
    console.log('Processing chart data with period:', period);
    
    // If no data, return empty array
    if (!data || !data.incomes || !data.payments) {
      console.log('No data to process');
      return [];
    }
    
    // First, check if we actually have any data to process
    const hasIncomes = data.incomes && data.incomes.length > 0;
    const hasPayments = data.payments && data.payments.length > 0;
    
    if (!hasIncomes && !hasPayments) {
      console.log('No transactions found');
      return [];
    }
    
    console.log(`Processing ${data.incomes.length} incomes and ${data.payments.length} payments`);
    
    // Get starting balance from settings
    const startBalance = data.settings?.start_balance || 0;
    
    // Determine the date range based on selected period
    const today = dayjs();
    let startMonth;
    let monthsToShow;
    
    switch (period) {
      case '3m':
        startMonth = today.subtract(2, 'month'); // Show current month + 2 previous
        monthsToShow = 3;
        break;
      case '6m':
        startMonth = today.subtract(5, 'month');
        monthsToShow = 6;
        break;
      case 'ytd':
        // Start from January 1st of current year
        startMonth = dayjs().startOf('year');
        monthsToShow = today.diff(startMonth, 'month') + 1;
        break;
      case '1y':
        startMonth = today.subtract(11, 'month');
        monthsToShow = 12;
        break;
      case 'all':
        // Find earliest transaction date
        const allDates = [
          ...data.incomes.map(i => i.date),
          ...data.payments.map(p => p.date)
        ].filter(Boolean).map(date => dayjs(date));
        
        if (allDates.length === 0) {
          startMonth = today.subtract(11, 'month');
          monthsToShow = 12;
        } else {
          const earliestDate = allDates.reduce((earliest, date) => 
            date.isBefore(earliest) ? date : earliest, today);
          startMonth = earliestDate.startOf('month');
          monthsToShow = today.diff(startMonth, 'month') + 1;
        }
        break;
      default: // '12m' is default
        startMonth = today.subtract(11, 'month');
        monthsToShow = 12;
    }
    
    // Group by month and year
    const monthGroups = {};
    
    // Create a range of months to show
    for (let i = 0; i < monthsToShow; i++) { // Show 12 months
      const date = startMonth.add(i, 'month');
      const monthYear = date.format('MMM YYYY');
      
      monthGroups[monthYear] = {
        name: monthYear,
        income: 0,
        expenses: 0,
        sortDate: date.valueOf(), // For sorting
        rawDate: date // Keep the date object for easier comparison
      };
    }
    
    // Process one-time incomes
    if (hasIncomes) {
      data.incomes
        .filter(income => !income.recurring)
        .forEach(income => {
          if (!income.date) return;
          
          try {
            const date = dayjs(income.date);
            if (!date.isValid()) return;
            
            const monthYear = date.format('MMM YYYY');
            const amount = parseFloat(income.amount) || 0;
            
            if (monthGroups[monthYear]) {
              monthGroups[monthYear].income += amount;
            }
          } catch (e) {
            console.error('Error processing one-time income:', income, e);
          }
        });
    }
    
    // Process one-time expenses
    if (hasPayments) {
      data.payments
        .filter(payment => !payment.recurring)
        .forEach(payment => {
          if (!payment.date) return;
          
          try {
            const date = dayjs(payment.date);
            if (!date.isValid()) return;
            
            const monthYear = date.format('MMM YYYY');
            const amount = parseFloat(payment.amount) || 0;
            
            if (monthGroups[monthYear]) {
              monthGroups[monthYear].expenses += amount;
            }
          } catch (e) {
            console.error('Error processing one-time payment:', payment, e);
          }
        });
    }
    
    // Process recurring incomes
    if (hasIncomes) {
      data.incomes
        .filter(income => income.recurring)
        .forEach(income => {
          if (!income.date) return;
          
          try {
            const startDate = dayjs(income.date);
            if (!startDate.isValid()) return;
            
            const amount = parseFloat(income.amount) || 0;
            const frequency = income.frequency || 'monthly';
            const frequencyDay = income.frequency_day || null;
            
            // Handle different frequencies
            Object.values(monthGroups).forEach(monthData => {
              const monthStart = monthData.rawDate.startOf('month');
              const monthEnd = monthData.rawDate.endOf('month');
              
              // Only process if the start date is before or in this month
              if (monthStart.isSameOrAfter(startDate, 'month') || 
                  monthEnd.isSameOrAfter(startDate, 'day')) {
                
                switch (frequency) {
                  case 'weekly':
                    // Calculate how many matching days fall in this month
                    const dayOfWeek = frequencyDay !== null ? frequencyDay : startDate.day();
                    let weeklyCount = 0;
                    let day = monthStart.day(dayOfWeek);
                    
                    // If day is before month start, add 7 days
                    if (day.isBefore(monthStart)) {
                      day = day.add(7, 'day');
                    }
                    
                    // Count occurrences in this month
                    while (day.isSameOrBefore(monthEnd)) {
                      if (day.isSameOrAfter(startDate)) {
                        weeklyCount++;
                      }
                      day = day.add(7, 'day');
                    }
                    
                    monthData.income += amount * weeklyCount;
                    break;
                  
                  case 'fortnightly':
                    const dayOfWeekFort = frequencyDay !== null ? frequencyDay : startDate.day();
                    let fortnightlyCount = 0;
                    
                    // Find the first occurrence in this month
                    let firstOccurrence = monthStart.day(dayOfWeekFort);
                    if (firstOccurrence.isBefore(monthStart)) {
                      firstOccurrence = firstOccurrence.add(7, 'day');
                    }
                    
                    // Find which fortnightly cycle we're in
                    const weeksSinceStart = Math.floor(firstOccurrence.diff(startDate, 'day') / 7);
                    const adjustment = weeksSinceStart % 2 === 0 ? 0 : 7;
                    let fortDay = firstOccurrence.add(adjustment, 'day');
                    
                    // Count occurrences
                    while (fortDay.isSameOrBefore(monthEnd)) {
                      if (fortDay.isSameOrAfter(startDate)) {
                        fortnightlyCount++;
                      }
                      fortDay = fortDay.add(14, 'day');
                    }
                    
                    monthData.income += amount * fortnightlyCount;
                    break;
                  
                  case 'four-weekly':
                    const dayOfWeekFourWeekly = frequencyDay !== null ? frequencyDay : startDate.day();
                    let fourWeeklyCount = 0;
                    
                    // Find the first occurrence in this month or before
                    let firstOccurrenceFW = monthStart.subtract(28, 'day').day(dayOfWeekFourWeekly);
                    
                    // Count occurrences, stepping forward 28 days each time
                    while (firstOccurrenceFW.isSameOrBefore(monthEnd)) {
                      if (firstOccurrenceFW.isSameOrAfter(startDate) && 
                          firstOccurrenceFW.isSameOrAfter(monthStart) &&
                          firstOccurrenceFW.isSameOrBefore(monthEnd)) {
                        fourWeeklyCount++;
                      }
                      firstOccurrenceFW = firstOccurrenceFW.add(28, 'day');
                    }
                    
                    monthData.income += amount * fourWeeklyCount;
                    break;
                  
                  case 'monthly':
                    // Only add if this month is on or after the start month
                    if (monthStart.isSameOrAfter(startDate, 'month')) {
                      // Check if we need to match a specific day of month
                      const dayOfMonth = frequencyDay !== null ? frequencyDay : startDate.date();
                      
                      // If the day of month exists in this month, add the amount
                      if (dayOfMonth <= monthEnd.date()) {
                        monthData.income += amount;
                      }
                    }
                    break;
                  
                  case 'annually':
                    // Check if this is anniversary month and day
                    if (monthData.rawDate.month() === startDate.month()) {
                      // Get the day of month for the anniversary
                      const annivDay = startDate.date();
                      // Only add if the day exists in this month
                      if (annivDay <= monthEnd.date()) {
                        monthData.income += amount;
                      }
                    }
                    break;
                }
              }
            });
          } catch (e) {
            console.error('Error processing recurring income:', income, e);
          }
        });
    }
    
    // Process recurring payments - handle separately for clarity
    if (hasPayments) {
      data.payments
        .filter(payment => payment.recurring)
        .forEach(payment => {
          if (!payment.date) return;
          
          try {
            const startDate = dayjs(payment.date);
            if (!startDate.isValid()) return;
            
            const amount = parseFloat(payment.amount) || 0;
            const frequency = payment.frequency || 'monthly';
            const endDate = payment.end_date ? dayjs(payment.end_date) : null;
            
            // Add to all relevant months in our range
            Object.values(monthGroups).forEach(monthData => {
              const monthDate = monthData.rawDate;
              
              // Only include if the month is:
              // 1. After the start date AND
              // 2. Before the end date (if one exists)
              if (monthDate.isSameOrAfter(startDate, 'month') && 
                  (!endDate || monthDate.isSameOrBefore(endDate, 'month'))) {
                // For monthly recurrence
                if (frequency === 'monthly') {
                  monthData.expenses += amount;
                }
                // For other frequencies, add custom logic here
              }
            });
          } catch (e) {
            console.error('Error processing recurring payment:', payment, e);
          }
        });
    }
    
    // Convert to array and sort by date
    const chartData = Object.values(monthGroups).map(month => {
      // Clean up the object - remove the rawDate which can't be serialized
      const { rawDate, ...rest } = month;
      return {
        ...rest,
        // Ensure values are properly formatted numbers
        income: parseFloat(rest.income.toFixed(2)),
        expenses: parseFloat(rest.expenses.toFixed(2)),
        monthlyBalance: parseFloat((rest.income - rest.expenses).toFixed(2))
        // Note: We'll calculate the running balance below
      };
    });
    
    chartData.sort((a, b) => a.sortDate - b.sortDate);
    
    // Now calculate the running balance, starting with the initial balance
    let runningBalance = startBalance;
    
    chartData.forEach(month => {
      runningBalance += month.income - month.expenses;
      month.balance = parseFloat(runningBalance.toFixed(2));
    });
    
    console.log('Processed chart data:', chartData);

    // Calculate summary data
    let totalIncome = 0;
    let totalExpenses = 0;
    
    chartData.forEach(month => {
      totalIncome += month.income;
      totalExpenses += month.expenses;
    });
    
    const netBalance = totalIncome - totalExpenses;
    const endBalance = startBalance + netBalance;
    
    // Set summary data for display
    setSummaryData({
      totalIncome,
      totalExpenses,
      netBalance,
      startBalance,
      endBalance
    });

    return chartData;
  }, []);
  
  // 3. Fix dependency array and add state management optimizations
  const loadBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Track diagnostic info
      const diagnostics = {
        rawBudgetData: null,
        processedChartData: null,
        dataErrors: []
      };
      
      console.log('Fetching dashboard data...');
      const data = await fetchBudget();
      console.log('Dashboard data received:', data);
      
      // Filter data by selected accounts if any are selected
      if (selectedAccounts && selectedAccounts.length > 0) {
        const selectedAccountIds = selectedAccounts.map(acc => acc.id);
        console.log("Filtering by account IDs:", selectedAccountIds);
        
        if (data.incomes) {
          data.incomes = data.incomes.filter(income => 
            !income.account_id || selectedAccountIds.includes(income.account_id)
          );
        }
        
        if (data.payments) {
          data.payments = data.payments.filter(payment => 
            !payment.account_id || selectedAccountIds.includes(payment.account_id)
          );
        }
      }
      
      // Validate and process in one pass to minimize state updates
      if (!data) {
        diagnostics.dataErrors.push('API returned no data');
        setBudgetData({ incomes: [], payments: [], settings: {} });
        setDiagnosticInfo(diagnostics);
        return;
      }
      
      // Store raw data for diagnostics
      diagnostics.rawBudgetData = data;
      
      // Validation checks
      if (!data.incomes) diagnostics.dataErrors.push('Missing incomes array');
      else if (!Array.isArray(data.incomes)) diagnostics.dataErrors.push('Incomes is not an array');
      
      if (!data.payments) diagnostics.dataErrors.push('Missing payments array');
      else if (!Array.isArray(data.payments)) diagnostics.dataErrors.push('Payments is not an array');
      
      if (!data.settings) diagnostics.dataErrors.push('Missing settings object');
      
      // Set currency symbol based on settings
      if (data.settings && data.settings.currency) {
        const currency = data.settings.currency;
        setCurrencySymbol(CURRENCY_SYMBOLS[currency] || currency);
      }
      
      // 4. Batch state updates to reduce renders
      setBudgetData(data);
      
      console.log('Budget data structure:', {
        hasPayments: !!data.payments && Array.isArray(data.payments),
        paymentsCount: data.payments?.length || 0,
        hasCategories: !!data.categories && Array.isArray(data.categories),
        categoriesCount: data.categories?.length || 0
      });

      // Process chart data only if we have valid data
      if (data.incomes && Array.isArray(data.incomes) && 
          data.payments && Array.isArray(data.payments)) {
        const newChartData = processDataForCharts(data, timePeriod);
        diagnostics.processedChartData = newChartData;
        setChartData(newChartData);
      }
      
      setDiagnosticInfo(diagnostics);
    } catch (error) {
      console.error('Failed to load budget data:', error);
      setError('Failed to load budget data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [processDataForCharts, timePeriod, selectedAccounts]); // Add selectedAccounts here
  
  // 5. Use a single useEffect for initialization
  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const loadAccounts = useCallback(async () => {
    try {
      setAccountLoading(true);
      const accountsData = await fetchAccounts();
      const activeAccounts = accountsData.filter(acc => acc.active === 1);
      setAccounts(activeAccounts);
      
      // Select all accounts by default
      setSelectedAccounts(activeAccounts);
      setAccountLoading(false);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Function to handle period change
  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setTimePeriod(newPeriod);
      localStorage.setItem('dashboard_timePeriod', newPeriod);
    }
  };

  const handleAccountSelectionChange = (event, newValue) => {
    console.log("Account selection changed:", newValue.map(acc => acc.name));
    setSelectedAccounts(newValue);
  };

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 6. Ensure the JSX properly handles loading state
  return (
    <div>
      <Box mb={3}>
        <Typography variant="h4" component="h1" fontWeight="500" color="primary">
          SeeCash Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Your financial overview at a glance
        </Typography>
      </Box>
      
      {debugMode && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: isDarkMode 
              ? alpha(theme.palette.background.paper, 0.4) 
              : alpha(theme.palette.grey[50], 0.7),
            border: `1px solid ${isDarkMode 
              ? alpha(theme.palette.warning.dark, 0.3) 
              : theme.palette.divider}`
          }}
        >
          <Typography variant="h6" gutterBottom color={isDarkMode ? "warning.light" : "warning.dark"}>
            Debug Information
          </Typography>
          <DebugPanel 
            apiUrl="http://localhost:8080/api/budget"
            data={budgetData}
            componentName="Dashboard"
          />
          <ApiDebugger />
        </Paper>
      )}
      
      {debugMode && diagnosticInfo.dataErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Found {diagnosticInfo.dataErrors.length} data issues
        </Alert>
      )}
      
      {debugMode && (
        <Paper sx={{ p: 2, mb: 3, maxHeight: '300px', overflow: 'auto' }}>
          <Typography variant="h6">Debug: Selected Accounts</Typography>
          <pre>{JSON.stringify(selectedAccounts.map(acc => ({ id: acc.id, name: acc.name })), null, 2)}</pre>
          
          <Typography variant="h6">Debug: Transactions</Typography>
          <Typography variant="body2">
            Incomes: {budgetData?.incomes?.length || 0} | 
            Payments: {budgetData?.payments?.length || 0}
          </Typography>
          
          <Typography variant="h6">Debug: Chart Data</Typography>
          <Typography variant="body2">Periods: {chartData?.length || 0}</Typography>
          {chartData && chartData.length > 0 && (
            <pre>{JSON.stringify(chartData[chartData.length-1], null, 2)}</pre>
          )}
        </Paper>
      )}
      
      {/* Period selection controls */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Time Period</Typography>
        <ToggleButtonGroup
          value={timePeriod}
          exclusive
          onChange={handlePeriodChange}
          aria-label="time period"
          size="small"
        >
          <ToggleButton value="3m" aria-label="3 months">
            3 Months
          </ToggleButton>
          <ToggleButton value="6m" aria-label="6 months">
            6 Months
          </ToggleButton>
          <ToggleButton value="ytd" aria-label="year to date">
            YTD
          </ToggleButton>
          <ToggleButton value="1y" aria-label="1 year">
            1 Year
          </ToggleButton>
          <ToggleButton value="all" aria-label="all time">
            All
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>
      
      {/* Account selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Accounts</Typography>
        <Autocomplete
          multiple
          id="account-selector"
          options={accounts}
          disableCloseOnSelect
          getOptionLabel={(option) => option.name}
          value={selectedAccounts}
          onChange={handleAccountSelectionChange}
          loading={accountLoading}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              <Box display="flex" justifyContent="space-between" width="100%">
                <span>{option.name}</span>
                <Typography variant="body2" color="text.secondary">
                  {currencySymbol}{parseFloat(option.balance).toFixed(2)}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Filter by accounts"
              placeholder="Select accounts"
              size="small"
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {accountLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip
                label={option.name}
                {...getTagProps({ index })}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiChip-deleteIcon': {
                    color: theme.palette.primary.main,
                  },
                }}
              />
            ))
          }
        />
      </Paper>
      
      {/* Financial Summary Cards */}
      {!loading && !error && chartData.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Income
                </Typography>
                <Typography variant="h5" component="div" sx={{ mt: 1, color: 'success.main' }}>
                  {currencySymbol}{summaryData.totalIncome.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Expenses
                </Typography>
                <Typography variant="h5" component="div" sx={{ mt: 1, color: 'error.main' }}>
                  {currencySymbol}{summaryData.totalExpenses.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Net Change
                </Typography>
                <Typography 
                  variant="h5" 
                  component="div" 
                  sx={{ 
                    mt: 1, 
                    color: summaryData.netBalance >= 0 ? 'success.main' : 'error.main' 
                  }}
                >
                  {currencySymbol}{summaryData.netBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Starting Balance
                </Typography>
                <Typography variant="h5" component="div" sx={{ mt: 1 }}>
                  {currencySymbol}{summaryData.startBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Balance
                </Typography>
                <Typography 
                  variant="h5" 
                  component="div" 
                  sx={{ 
                    mt: 1, 
                    color: summaryData.endBalance >= 0 ? 'primary.main' : 'error.main' 
                  }}
                >
                  {currencySymbol}{summaryData.endBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* 7. Use a wrapper with min-height to prevent layout shift during loading */}
      <Box sx={{ minHeight: loading ? '300px' : 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : chartData && chartData.length > 0 ? (
          // Your charts here...
          <Grid container spacing={3}>
            {chartData.length > 0 ? (
              <>
                {/* Monthly Income and Expenses */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Income and Expenses 
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({getPeriodLabel(timePeriod)})
                      </Typography>
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                        <Tooltip formatter={(value) => `${currencySymbol}${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#8884d8" />
                        <Bar dataKey="expenses" name="Expenses" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                
                {/* Monthly Balance */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Balance Over Time
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({getPeriodLabel(timePeriod)})
                      </Typography>
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                        <Tooltip formatter={(value) => `${currencySymbol}${value.toFixed(2)}`} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          name="Balance"
                          stroke="#ff7300"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">
                  No data available yet. Add income and payments to see your financial overview.
                </Alert>
              </Grid>
            )}
          </Grid>
        ) : (
          <Alert severity="info">No data available for dashboard. Add some income and expenses to see your financial overview.</Alert>
        )}
      </Box>

      {/* Add the new Category Transactions Table */}
      {!loading && !error && budgetData && (
        <CategoryTransactionsTable 
          payments={budgetData.payments || []}
          categories={budgetData.categories || []}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};

// Helper function to get a human-readable period label
function getPeriodLabel(period) {
  switch (period) {
    case '3m': return 'Last 3 Months';
    case '6m': return 'Last 6 Months';
    case 'ytd': return 'Year to Date';
    case '1y': return 'Last 12 Months';
    case 'all': return 'All Time';
    default: return 'Last 12 Months';
  }
}

export default Dashboard;