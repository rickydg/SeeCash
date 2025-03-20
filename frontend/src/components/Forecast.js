import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  Button, Paper, Typography, Box, Grid, 
  CircularProgress, Alert, Slider, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { fetchBudget, fetchAccounts } from '../services/api';
import dayjs from 'dayjs';
// Import required plugins
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import minMax from 'dayjs/plugin/minMax';
import { AppContext } from '../context/AppContext';
import { useTheme, alpha } from '@mui/material/styles';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';

// Register the plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(minMax);

// Add this debounce function near the top of your file
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Add this helper function
const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$'
  };
  
  return symbols[currencyCode] || currencyCode;
};

// Custom tooltip component that shows detailed transaction info
const CustomTooltip = ({ active, payload, label, showIncome, showExpenses, showBalance, chartColors, currencySymbol }) => {
  const theme = useTheme();
  
  if (!active || !payload || !payload.length) {
    return null;
  }
  
  // Get data point details
  const dataPoint = payload[0]?.payload;
  
  // Style object for the tooltip container
  const tooltipStyle = {
    backgroundColor: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : '#fff',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    padding: '10px',
    boxShadow: theme.shadows[3],
    color: theme.palette.text.primary,
    maxWidth: '300px'
  };
  
  // Style for section headings
  const sectionHeadingStyle = {
    marginTop: '8px',
    marginBottom: '4px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`
  };

  // Style for item labels
  const labelStyle = {
    marginBottom: '5px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    fontSize: '1rem'
  };

  // Style for values in each row
  const valueStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontSize: '0.875rem'
  };
  
  // Style for transaction items
  const transactionStyle = {
    marginBottom: '2px',
    fontSize: '0.8rem',
    display: 'flex',
    justifyContent: 'space-between'
  };
  
  const currencyLabel = currencySymbol || '$';

  // Use consistent colors in the tooltip
  return (
    <div style={tooltipStyle}>
      <div style={labelStyle}>{label}</div>
      
      {/* Summary section */}
      {payload.map((entry, index) => {
        // Skip entries that have 0 value if they're turned off
        if ((entry.name === 'income' && !showIncome) || 
            (entry.name === 'expenses' && !showExpenses) ||
            (entry.name === 'balance' && !showBalance)) {
          return null;
        }
        
        let color = entry.color;
        let name = entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
        
        return (
          <div style={valueStyle} key={`item-${index}`}>
            <span style={{ color }}>{name}:</span>
            <span>{currencyLabel}{Number(entry.value).toLocaleString('en-US', {
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2
            })}</span>
          </div>
        );
      })}

      {/* Income details section */}
      {showIncome && dataPoint?.incomeDetails?.length > 0 && (
        <>
          <div style={sectionHeadingStyle}>Income Details</div>
          {dataPoint.incomeDetails.map((income, idx) => (
            <div style={transactionStyle} key={`income-${idx}`}>
              <span style={{ color: chartColors.income }}>{income.description}</span>
              <span>{currencyLabel}{Number(income.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          ))}
        </>
      )}
      
      {/* Expense details section */}
      {showExpenses && dataPoint?.expenseDetails?.length > 0 && (
        <>
          <div style={sectionHeadingStyle}>Expense Details</div>
          {dataPoint.expenseDetails.map((payment, idx) => (
            <div style={transactionStyle} key={`payment-${idx}`}>
              <span style={{ color: chartColors.expenses }}>{payment.description}</span>
              <span>{currencyLabel}{Number(payment.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders of the chart component

// Create a memoized chart component outside your main component
const MemoizedForecastChart = React.memo(({ 
  data, 
  showIncome, 
  showExpenses, 
  showBalance, 
  chartColors, 
  granularity, 
  forecastRange,
  currencySymbol
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<CustomTooltip showIncome={showIncome} showExpenses={showExpenses} showBalance={showBalance} chartColors={chartColors} currencySymbol={currencySymbol} />} />
        <Legend />
        {showIncome && (
          <Line 
            type="monotone" 
            dataKey="income" 
            name="Income" 
            stroke={chartColors.income} 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {showExpenses && (
          <Line 
            type="monotone" 
            dataKey="expenses" 
            name="Expenses" 
            stroke={chartColors.expenses} 
            strokeWidth={2}
            dot={granularity !== 'daily' || forecastRange <= 14}
            activeDot={{ r: 6, stroke: '#82ca9d', strokeWidth: 2, fill: '#fff' }}
          />
        )}
        {showBalance && (
          <Line 
            type="monotone" 
            dataKey="balance" 
            name="Balance" 
            stroke={chartColors.balance} 
            strokeWidth={2.5}
            dot={granularity !== 'daily' || forecastRange <= 14}
            activeDot={{ r: 6, stroke: '#ff7300', strokeWidth: 2, fill: '#fff' }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison logic to prevent unnecessary re-renders
  return prevProps.forecastRange === nextProps.forecastRange &&
    prevProps.granularity === nextProps.granularity &&
    prevProps.showIncome === nextProps.showIncome &&
    prevProps.showExpenses === nextProps.showExpenses &&
    prevProps.showBalance === nextProps.showBalance &&
    prevProps.data === nextProps.data;
});

const Forecast = () => {
  const { debugMode } = useContext(AppContext);
  const theme = useTheme(); // Add this line
  const isDarkMode = theme.palette.mode === 'dark'; // Add this helper variable
  const [budgetData, setBudgetData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use localStorage to remember selections
  const [granularity, setGranularity] = useState(() => 
    localStorage.getItem('forecast_granularity') || 'monthly');
  const [forecastRange, setForecastRange] = useState(() => 
    parseInt(localStorage.getItem('forecast_range') || '12'));
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showIncome, setShowIncome] = useState(() => 
    localStorage.getItem('forecast_showIncome') !== 'false');
  const [showExpenses, setShowExpenses] = useState(() => 
    localStorage.getItem('forecast_showExpenses') !== 'false');
  const [showBalance, setShowBalance] = useState(() => 
    localStorage.getItem('forecast_showBalance') !== 'false');
  
  // Add effect to save selections to localStorage
  useEffect(() => {
    localStorage.setItem('forecast_granularity', granularity);
    localStorage.setItem('forecast_range', forecastRange.toString());
    localStorage.setItem('forecast_showIncome', showIncome.toString());
    localStorage.setItem('forecast_showExpenses', showExpenses.toString());
    localStorage.setItem('forecast_showBalance', showBalance.toString());
  }, [granularity, forecastRange, showIncome, showExpenses, showBalance]);

  // Define consistent colors for income, expenses and balance
  const chartColors = {
    income: '#4caf50',    // Green
    expenses: '#f44336', // Red
    balance: '#2196f3'   // Blue
  };

  const [currencySymbol, setCurrencySymbol] = useState('$');
  
  // Add this state to track when debugging is active
  const [isDebugging, setIsDebugging] = useState(false);

  // Add this state for debug message
  const [debugMessage, setDebugMessage] = useState(null);

  // Add these state variables in the component
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);

  // Add this effect to load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountLoading(true);
        const accountsData = await fetchAccounts();
        setAccounts(accountsData.filter(acc => acc.active === 1));
        // Select all accounts by default
        setSelectedAccounts(accountsData.filter(acc => acc.active === 1));
        setAccountLoading(false);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setAccountLoading(false);
      }
    };
    
    loadAccounts();
  }, []);

  // Replace the existing debugForecastGeneration function with this enhanced version
  const debugForecastGeneration = () => {
    setIsDebugging(true);
    
    setTimeout(() => {
      try {
        if (!budgetData) {
          console.error("%c⚠️ No budget data available", "font-weight: bold; font-size: 14px; color: #f44336");
          setIsDebugging(false);
          return;
        }
        
        console.log("%c========= FORECAST DEBUGGING =========", 
          "background: #2196f3; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 14px;");
        
        // 1. Check if data exists and is properly structured
        console.log("%c📊 Budget data structure:", "font-weight: bold; color: #2196f3; font-size: 13px;", {
          hasData: !!budgetData,
          hasIncomes: Array.isArray(budgetData.incomes),
          incomesCount: budgetData.incomes?.length || 0,
          hasPayments: Array.isArray(budgetData.payments),
          paymentsCount: budgetData.payments?.length || 0,
          hasSettings: !!budgetData.settings
        });
        
        // 2. Check recurring vs one-time with styled logs
        const recurringIncomes = budgetData.incomes?.filter(i => i.recurring) || [];
        const onetimeIncomes = budgetData.incomes?.filter(i => !i.recurring) || [];
        const recurringPayments = budgetData.payments?.filter(p => p.recurring) || [];
        const onetimePayments = budgetData.payments?.filter(p => !p.recurring) || [];
        
        console.log("%c📈 Transaction types:", "font-weight: bold; color: #4caf50; font-size: 13px;", {
          recurringIncomes: recurringIncomes.length,
          onetimeIncomes: onetimeIncomes.length,
          recurringPayments: recurringPayments.length,
          onetimePayments: onetimePayments.length
        });
        
        // Continue with existing logic but with styled logs...
        // [rest of debugging function]
        
        // 5. Test calculation for one period with color highlights
        const testMonth = dayjs().format('YYYY-MM');
        const testMonthIncomes = budgetData.incomes?.filter(i => {
          if (i.date && i.date.startsWith(testMonth)) return true;
          if (i.recurring && dayjs(i.date).isBefore(dayjs(testMonth))) return true;
          return false;
        });
        
        const testMonthPayments = budgetData.payments?.filter(p => {
          if (p.date && p.date.startsWith(testMonth)) return true;
          if (p.recurring && dayjs(p.date).isBefore(dayjs(testMonth))) {
            // Check end date if present
            if (p.end_date && dayjs(p.end_date).isBefore(dayjs(testMonth))) return false;
            return true;
          }
          return false;
        });
        
        const totalIncome = testMonthIncomes?.reduce((sum, inc) => sum + Number(inc.amount), 0) || 0;
        const totalExpenses = testMonthPayments?.reduce((sum, pay) => sum + Number(pay.amount), 0) || 0;
        const balance = totalIncome - totalExpenses;
        
        console.log(`%c💰 ${testMonth} calculated values:`, "font-weight: bold; color: #ff9800; font-size: 13px;", {
          totalIncome: totalIncome,
          totalExpenses: totalExpenses,
          balance: balance
        });
        
        console.log("%c========= END DEBUGGING =========", 
          "background: #2196f3; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
          
        // Show a temporary success message in the UI
        setDebugMessage("Debug data output to console");
        
        setTimeout(() => {
          setDebugMessage(null);
        }, 3000);
      } catch (error) {
        console.error("%c🐛 Debugging error:", "font-weight: bold; color: #f44336;", error);
      } finally {
        setIsDebugging(false);
      }
    }, 100);
  };

  // Modify your loadBudgetData function to filter by accounts
  const loadBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Loading budget data with selected accounts:", selectedAccounts.map(acc => acc.name));
      const data = await fetchBudget();
      
      if (data.settings && data.settings.currency) {
        const currency = data.settings.currency;
        setCurrencySymbol(getCurrencySymbol(currency));
      }
      
      let filteredData = { ...data }; // Make a copy to avoid mutating original
      
      // Filter data by selected accounts if any are selected
      if (selectedAccounts && selectedAccounts.length > 0) {
        const selectedAccountIds = selectedAccounts.map(acc => acc.id);
        console.log("Filtering by account IDs:", selectedAccountIds);
        
        // Filter incomes by selected accounts
        if (filteredData.incomes) {
          filteredData.incomes = filteredData.incomes.filter(income => 
            !income.account_id || selectedAccountIds.includes(income.account_id)
          );
          console.log(`Filtered incomes: ${filteredData.incomes.length} of ${data.incomes.length}`);
        }
        
        // Filter payments by selected accounts
        if (filteredData.payments) {
          filteredData.payments = filteredData.payments.filter(payment => 
            !payment.account_id || selectedAccountIds.includes(payment.account_id)
          );
          console.log(`Filtered payments: ${filteredData.payments.length} of ${data.payments.length}`);
        }
      }
      
      setBudgetData(filteredData);
      
      // Generate forecast with the filtered data
      if (filteredData.incomes && Array.isArray(filteredData.incomes) && 
          filteredData.payments && Array.isArray(filteredData.payments)) {
        const forecast = generateForecast(
          filteredData,
          granularity, 
          currentBalance,
          forecastRange
        );
        setForecastData(forecast);
      }
      
    } catch (error) {
      console.error('Failed to load budget data:', error);
      setError('Failed to load forecast data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccounts, granularity, currentBalance, forecastRange]);
  
  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setAccountLoading(true);
        const accountsData = await fetchAccounts();
        const activeAccounts = accountsData.filter(acc => acc.active === 1);
        setAccounts(activeAccounts);
        
        // Select all accounts by default
        setSelectedAccounts(activeAccounts);
        setAccountLoading(false);
        
        // Initial budget data will be loaded when selectedAccounts changes
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setAccountLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Make sure loadBudgetData is called when selection changes
  useEffect(() => {
    if (accounts.length > 0 && selectedAccounts.length > 0) {
      loadBudgetData();
    }
  }, [selectedAccounts, accounts.length, loadBudgetData]);
  
  // Update Autocomplete to properly track selection changes
  const handleAccountSelectionChange = (event, newValue) => {
    console.log("Account selection changed:", newValue.map(acc => acc.name));
    setSelectedAccounts(newValue);
  };

  // Replace the generateForecast function with this improved version:
const generateForecast = (data, granularity, startBalance, range) => {
  console.log("Generating forecast with:", { granularity, startBalance, range });
  
  if (!data || !data.incomes || !data.payments) {
    console.error("Missing required data structure");
    return [];
  }

  const allIncomes = data.incomes || [];
  const allPayments = data.payments || [];
  
  // Determine the interval and format based on granularity
  let dateFormat = 'MMM YYYY';
  let interval = 'month';
  
  if (granularity === 'weekly') {
    dateFormat = 'MMM D, YYYY';
    interval = 'week';
  } else if (granularity === 'daily') {
    dateFormat = 'MMM D, YYYY';
    interval = 'day';
  }
  
  const periods = range || 12;
  let balance = startBalance;
  
  // Create transaction lookup for one-time entries
  const transactionsByDate = {};
  
  // Process one-time incomes
  allIncomes
    .filter(income => !income.recurring)
    .forEach(income => {
      const date = dayjs(income.date).format('YYYY-MM-DD');
      if (!transactionsByDate[date]) {
        transactionsByDate[date] = { incomes: [], payments: [] };
      }
      transactionsByDate[date].incomes.push(income);
    });
  
  // Process one-time payments
  allPayments
    .filter(payment => !payment.recurring)
    .forEach(payment => {
      const date = dayjs(payment.date).format('YYYY-MM-DD');
      if (!transactionsByDate[date]) {
        transactionsByDate[date] = { incomes: [], payments: [] };
      }
      transactionsByDate[date].payments.push(payment);
    });
  
  // Filter recurring transactions
  const recurringIncomes = allIncomes.filter(income => income.recurring);
  const recurringPayments = allPayments.filter(payment => payment.recurring);
  
  // Generate forecast data points
  const forecast = [];
  const today = dayjs();
  
  for (let i = 0; i < periods; i++) {
    // For each period, calculate transactions for this period
    const periodStart = today.add(i, interval);
    const displayDate = periodStart.format(dateFormat);
    
    let periodIncome = 0;
    let periodExpenses = 0;
    
    // IMPORTANT: Create arrays to track detailed transactions for this period
    const incomeDetails = [];
    const expenseDetails = [];
    
    // For monthly/weekly granularity, we need to check all days in the period
    const daysToCheck = [];
    
    if (granularity === 'monthly') {
      // For monthly granularity, check each day in the month
      const daysInMonth = periodStart.daysInMonth();
      for (let day = 1; day <= daysInMonth; day++) {
        daysToCheck.push(periodStart.date(day).format('YYYY-MM-DD'));
      }
    } else if (granularity === 'weekly') {
      // For weekly granularity, check each day in the week
      for (let day = 0; day < 7; day++) {
        daysToCheck.push(periodStart.add(day, 'day').format('YYYY-MM-DD'));
      }
    } else {
      // Daily granularity - just check the current day
      daysToCheck.push(periodStart.format('YYYY-MM-DD'));
    }
    
    // Process one-time transactions for all days in this period
    daysToCheck.forEach(dateKey => {
      if (transactionsByDate[dateKey]) {
        transactionsByDate[dateKey].incomes.forEach(income => {
          periodIncome += parseFloat(income.amount || 0);
          // Add to income details
          incomeDetails.push({
            description: income.description,
            amount: parseFloat(income.amount || 0),
            date: income.date
          });
        });
        
        transactionsByDate[dateKey].payments.forEach(payment => {
          periodExpenses += parseFloat(payment.amount || 0);
          // Add to expense details
          expenseDetails.push({
            description: payment.description,
            amount: parseFloat(payment.amount || 0),
            date: payment.date,
            category: payment.category
          });
        });
      }
    });
    
    // Process recurring incomes
    recurringIncomes.forEach(income => {
      const incomeDate = dayjs(income.date);
      if (!incomeDate.isValid()) return;
      
      const amount = parseFloat(income.amount || 0);
      const frequency = income.frequency || 'monthly';
      const frequencyDay = income.frequency_day || null;
      
      // Check if this recurring income applies to this period
      switch (frequency) {
        case 'weekly':
          // Get day of week (0-6, Sunday is 0)
          const dayOfWeek = frequencyDay !== null ? frequencyDay : incomeDate.day();
          const matchingWeekDays = daysToCheck.filter(date => 
            dayjs(date).day() === dayOfWeek
          ).length;
          
          if (matchingWeekDays > 0) {
            periodIncome += amount * matchingWeekDays;
            // Add to income details, once per occurrence
            daysToCheck.filter(date => dayjs(date).day() === dayOfWeek)
              .forEach(date => {
                incomeDetails.push({
                  description: `${income.description} (weekly)`,
                  amount: amount,
                  date: date,
                  recurring: true
                });
              });
          }
          break;
          
        case 'fortnightly':
          // Find dates that match the day of week and are spaced 2 weeks apart
          const dayOfWeekFort = frequencyDay !== null ? frequencyDay : incomeDate.day();
          const startWeek = dayjs(incomeDate).week();
          
          daysToCheck.filter(date => {
            const checkDate = dayjs(date);
            return checkDate.day() === dayOfWeekFort && 
              (checkDate.diff(incomeDate, 'week') % 2 === 0);
          }).forEach(date => {
            periodIncome += amount;
            incomeDetails.push({
              description: `${income.description} (fortnightly)`,
              amount: amount,
              date: date,
              recurring: true
            });
          });
          break;
          
        case 'four-weekly':
          // Find dates that match the day of week and are spaced 4 weeks apart
          const dayOfWeekFourWeekly = frequencyDay !== null ? frequencyDay : incomeDate.day();
          
          daysToCheck.filter(date => {
            const checkDate = dayjs(date);
            return checkDate.day() === dayOfWeekFourWeekly && 
              (checkDate.diff(incomeDate, 'week') % 4 === 0);
          }).forEach(date => {
            periodIncome += amount;
            incomeDetails.push({
              description: `${income.description} (4-weekly)`,
              amount: amount,
              date: date,
              recurring: true
            });
          });
          break;
          
        case 'monthly':
          // Get day of month (1-31)
          const dayOfMonth = frequencyDay !== null ? frequencyDay : incomeDate.date();
          
          if (granularity === 'monthly') {
            // For monthly granularity, just add the amount once
            periodIncome += amount;
            incomeDetails.push({
              description: `${income.description} (monthly)`,
              amount: amount,
              date: periodStart.date(Math.min(dayOfMonth, periodStart.daysInMonth())).format('YYYY-MM-DD'),
              recurring: true
            });
          } else {
            // For weekly/daily granularity, find matching days
            daysToCheck.filter(date => 
              dayjs(date).date() === dayOfMonth
            ).forEach(date => {
              periodIncome += amount;
              incomeDetails.push({
                description: `${income.description} (monthly)`,
                amount: amount,
                date: date,
                recurring: true
              });
            });
          }
          break;
          
        case 'annually':
          // Check if this is the anniversary month and day
          daysToCheck.filter(date => {
            const checkDate = dayjs(date);
            return checkDate.month() === incomeDate.month() && 
                checkDate.date() === incomeDate.date();
          }).forEach(date => {
            periodIncome += amount;
            incomeDetails.push({
              description: `${income.description} (annual)`,
              amount: amount,
              date: date,
              recurring: true
            });
          });
          break;
      }
    });
    
    // Process recurring payments
    recurringPayments.forEach(payment => {
      const paymentDate = dayjs(payment.date);
      if (!paymentDate.isValid()) return;
      
      const endDate = payment.end_date ? dayjs(payment.end_date) : null;
      const amount = parseFloat(payment.amount || 0);
      const frequency = payment.frequency || 'monthly';
      
      // Check if payment applies (after start date and before end date)
      const isBeforeEnd = !endDate || periodStart.isBefore(endDate.endOf(interval));
      const isAfterStart = paymentDate.isBefore(periodStart.endOf(interval));
      
      if (isAfterStart && isBeforeEnd) {
        if (frequency === 'monthly') {
          // For monthly recurring payment
          if (granularity === 'monthly' || 
             (daysToCheck.some(date => dayjs(date).date() === paymentDate.date()))) {
            periodExpenses += amount;
            // Add to expense details
            expenseDetails.push({
              description: `${payment.description} (recurring)`,
              amount: amount,
              date: paymentDate.format('YYYY-MM-DD'),
              category: payment.category,
              recurring: true
            });
          }
        } else if (frequency === 'weekly') {
          // For weekly recurring payment
          const dayOfWeek = paymentDate.day();
          const matchingDaysCount = daysToCheck.filter(date => 
            dayjs(date).day() === dayOfWeek
          ).length;
          
          if (matchingDaysCount > 0) {
            periodExpenses += amount * matchingDaysCount;
            // Add to expense details, once per occurrence
            for (let occ = 0; occ < matchingDaysCount; occ++) {
              expenseDetails.push({
                description: `${payment.description} (recurring)`,
                amount: amount,
                date: daysToCheck.find(date => dayjs(date).day() === dayOfWeek),
                category: payment.category,
                recurring: true
              });
            }
          }
        }
      }
    });
    
    // Update running balance for this period
    balance += periodIncome - periodExpenses;
    
    // Add data point to forecast WITH transaction details
    forecast.push({
      name: displayDate,
      income: Number(periodIncome.toFixed(2)),
      expenses: Number(periodExpenses.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      // Include transaction details in data point
      incomeDetails: incomeDetails,
      expenseDetails: expenseDetails
    });
  }
  
  return forecast;
};
  
  // Generate forecast data when relevant inputs change
  useEffect(() => {
    if (!budgetData) {
      console.log('No budget data available yet');
      return;
    }
    
    try {
      console.log("Inputs changed, generating new forecast");
      const newForecastData = generateForecast(
        budgetData,
        granularity, 
        currentBalance,
        forecastRange
      );
      
      setForecastData(newForecastData);
    } catch (error) {
      console.error("Error generating forecast:", error);
      setError("Failed to generate forecast: " + (error.message || "Unknown error"));
    }
  }, [budgetData, granularity, currentBalance, forecastRange]);
  
// Custom tooltip component that shows detailed transaction info
const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  
  if (!active || !payload || !payload.length) {
    return null;
  }
  
  // Get data point details
  const dataPoint = payload[0]?.payload;
  
  // Style object for the tooltip container
  const tooltipStyle = {
    backgroundColor: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : '#fff',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    padding: '10px',
    boxShadow: theme.shadows[3],
    color: theme.palette.text.primary,
    maxWidth: '300px'
  };
  
  // Style for section headings
  const sectionHeadingStyle = {
    marginTop: '8px',
    marginBottom: '4px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`
  };

  // Style for item labels
  const labelStyle = {
    marginBottom: '5px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    fontSize: '1rem'
  };

  // Style for values in each row
  const valueStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontSize: '0.875rem'
  };
  
  // Style for transaction items
  const transactionStyle = {
    marginBottom: '2px',
    fontSize: '0.8rem',
    display: 'flex',
    justifyContent: 'space-between'
  };
  
  const currencyLabel = currencySymbol || '$';

  // Use consistent colors in the tooltip
  return (
    <div style={tooltipStyle}>
      <div style={labelStyle}>{label}</div>
      
      {/* Summary section */}
      {payload.map((entry, index) => {
        // Skip entries that have 0 value if they're turned off
        if ((entry.name === 'income' && !showIncome) || 
            (entry.name === 'expenses' && !showExpenses) ||
            (entry.name === 'balance' && !showBalance)) {
          return null;
        }
        
        let color = entry.color;
        let name = entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
        
        return (
          <div style={valueStyle} key={`item-${index}`}>
            <span style={{ color }}>{name}:</span>
            <span>{currencyLabel}{Number(entry.value).toLocaleString('en-US', {
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2
            })}</span>
          </div>
        );
      })}

      {/* Income details section */}
      {showIncome && dataPoint?.incomeDetails?.length > 0 && (
        <>
          <div style={sectionHeadingStyle}>Income Details</div>
          {dataPoint.incomeDetails.map((income, idx) => (
            <div style={transactionStyle} key={`income-${idx}`}>
              <span style={{ color: chartColors.income }}>{income.description}</span>
              <span>{currencyLabel}{Number(income.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          ))}
        </>
      )}
      
      {/* Expense details section */}
      {showExpenses && dataPoint?.expenseDetails?.length > 0 && (
        <>
          <div style={sectionHeadingStyle}>Expense Details</div>
          {dataPoint.expenseDetails.map((payment, idx) => (
            <div style={transactionStyle} key={`payment-${idx}`}>
              <span style={{ color: chartColors.expenses }}>{payment.description}</span>
              <span>{currencyLabel}{Number(payment.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// Function to generate test data for debugging
const getTestData = () => {
  const testData = [];
  const startDate = dayjs();
  let balance = currentBalance;
  
  // Generate test data based on current settings
  for (let i = 0; i < forecastRange; i++) {
    let periodDate;
    if (granularity === 'monthly') {
      periodDate = startDate.add(i, 'month');
    } else if (granularity === 'weekly') {
      periodDate = startDate.add(i, 'week');
    } else {
      periodDate = startDate.add(i, 'day');
    }
    
    // Generate random amounts
    const income = Math.round(2000 + Math.random() * 1500);
    const expenses = Math.round(1500 + Math.random() * 1000);
    balance += income - expenses;
    
    // Format the date based on granularity
    const dateFormat = granularity === 'monthly' ? 'MMM YYYY' : 'MMM D, YYYY';
    
    // Create sample transaction details
    const incomeDetails = [
      {
        description: 'Salary (recurring)',
        amount: Math.round(income * 0.8),
        date: periodDate.format('YYYY-MM-DD'),
        recurring: true
      },
      {
        description: 'Freelance Work',
        amount: Math.round(income * 0.2),
        date: periodDate.format('YYYY-MM-DD'),
        recurring: false
      }
    ];
    
    const expenseDetails = [
      {
        description: 'Rent (recurring)',
        amount: Math.round(expenses * 0.6),
        date: periodDate.format('YYYY-MM-DD'),
        recurring: true
      },
      {
        description: 'Groceries (recurring)',
        amount: Math.round(expenses * 0.25),
        date: periodDate.format('YYYY-MM-DD'),
        recurring: true
      },
      {
        description: 'Dining Out',
        amount: Math.round(expenses * 0.15),
        date: periodDate.format('YYYY-MM-DD'),
        recurring: false
      }
    ];
    
    testData.push({
      name: periodDate.format(dateFormat),
      income: income,
      expenses: expenses,
      balance: Math.round(balance * 100) / 100,
      incomeDetails: incomeDetails,
      expenseDetails: expenseDetails
    });
  }
  
  return testData;
};

const [sliderValue, setSliderValue] = useState(forecastRange);
const debouncedForecastRange = useDebounce(sliderValue, 300); // 300ms delay

// Update forecastRange when the debounced value changes
useEffect(() => {
  setForecastRange(debouncedForecastRange);
}, [debouncedForecastRange]);

// Add this to your component to preserve scroll position

const scrollPosRef = useRef();

useEffect(() => {
  // Save scroll position before component updates
  scrollPosRef.current = window.scrollY;
  
  // After render, restore the scroll position
  return () => {
    if (scrollPosRef.current !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, scrollPosRef.current);
      }, 0);
    }
  };
}, [forecastRange]);

  // JSX rendering
  return (
    <div>
      <Box mb={3}>
        <Typography variant="h4" component="h1" fontWeight="500" color="primary">
          Cash Forecast
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Visualize your future cash flow
        </Typography>
      </Box>
      
      {/* Only show debug tools if debug mode is enabled */}
      {debugMode && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: isDarkMode 
              ? alpha(theme.palette.background.paper, 0.6) 
              : '#f8f8f8',
            border: `1px solid ${isDarkMode 
              ? alpha(theme.palette.warning.dark, 0.3) 
              : theme.palette.divider}`
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            color={isDarkMode ? "warning.light" : "text.primary"}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}
          >
            <Box component="span" sx={{ 
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: isDarkMode ? 'warning.light' : 'warning.main',
              mr: 1
            }}/>
            Debug Tools
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Button 
                variant={isDarkMode ? "contained" : "outlined"}
                size="small"
                sx={{
                  bgcolor: isDarkMode ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                  borderColor: theme.palette.primary.main,
                }}
                onClick={() => {
                  setForecastData(getTestData());
                  setDebugMessage("Test data loaded");
                  
                  setTimeout(() => {
                    setDebugMessage(null);
                  }, 3000);
                }}
              >
                Use Test Data
              </Button>
              
              <Button 
                variant={isDarkMode ? "contained" : "outlined"}
                size="small"
                color="warning"
                disabled={isDebugging}
                startIcon={isDebugging ? <CircularProgress size={16} /> : null}
                sx={{
                  bgcolor: isDarkMode ? alpha(theme.palette.warning.main, 0.2) : 'transparent',
                  borderColor: theme.palette.warning.main,
                }}
                onClick={debugForecastGeneration}
              >
                {isDebugging ? 'Debugging...' : 'Debug Forecast Logic'}
              </Button>
            </Box>
            
            {debugMessage && (
              <Alert 
                severity="info" 
                variant={isDarkMode ? "filled" : "outlined"}
                sx={{ mt: 1 }}
              >
                {debugMessage}
              </Alert>
            )}
          </Box>
        </Paper>
      )}
      
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {/* Chart control panel */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3,
          bgcolor: isDarkMode 
            ? alpha(theme.palette.background.paper, 0.4) 
            : '#fff',
          border: `1px solid ${isDarkMode 
            ? alpha(theme.palette.divider, 0.1) 
            : theme.palette.divider}`
        }}
      >
        <Typography variant="h6" gutterBottom>Forecast Settings</Typography>
        <Grid container spacing={3}>
          {/* Account Selection Section */}
          <Grid item xs={12}>
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
                      {getCurrencySymbol(option.currency)}{parseFloat(option.balance).toFixed(2)}
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
          </Grid>
          
          {/* Existing Granularity Control */}
          <Grid item xs={12} sm={4}>
            <Box>
              <Box display="flex" gap={1}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Granularity</InputLabel>
                  <Select
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value)}
                    label="Granularity"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Grid>
          
          {/* Existing Forecast Range Control */}
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Forecast Range {granularity === 'monthly' ? '(months)' : granularity === 'weekly' ? '(weeks)' : '(days)'}
              </Typography>
              
              {/* Quick selection buttons */}
              <Box display="flex" gap={1} mb={2}>
                <Button 
                  variant={forecastRange === 6 ? 'contained' : 'outlined'} 
                  size="small"
                  onClick={() => setForecastRange(6)}
                >
                   6
                </Button>
                <Button 
                  variant={forecastRange === 12 ? 'contained' : 'outlined'} 
                  size="small"
                  onClick={() => setForecastRange(12)}
                >
                   12
                </Button>
                <Button 
                  variant={forecastRange === 24 ? 'contained' : 'outlined'} 
                  size="small"
                  onClick={() => setForecastRange(24)}
                >
                   24
                </Button>
              </Box>
              
              {/* Range slider for fine control */}
              <Box px={1}>
                <Slider
                  value={sliderValue}
                  onChange={(e, newValue) => setSliderValue(newValue)}
                  min={1}
                  max={granularity === 'monthly' ? 60 : granularity === 'weekly' ? 52 : 180}
                  marks={[
                    { value: 1, label: '1' },
                    { value: granularity === 'monthly' ? 12 : granularity === 'weekly' ? 26 : 90, 
                      label: granularity === 'monthly' ? '12m' : granularity === 'weekly' ? '26w' : '90d' },
                    { value: granularity === 'monthly' ? 60 : granularity === 'weekly' ? 52 : 180, 
                      label: granularity === 'monthly' ? '5y' : granularity === 'weekly' ? '1y' : '6m' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value} ${
                    granularity === 'monthly' 
                      ? value === 1 ? 'month' : 'months' 
                      : granularity === 'weekly' 
                        ? value === 1 ? 'week' : 'weeks' 
                        : value === 1 ? 'day' : 'days'
                  }`}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </Grid>
          
          {/* Existing Start Balance Control */}
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Start Balance</Typography>
              <TextField
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                }}
                size="small"
                fullWidth
                sx={{ bgcolor: isDarkMode ? alpha(theme.palette.background.paper, 0.6) : 'transparent' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Toggle buttons for chart display */}
      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>Chart Display Options</Typography>
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button 
            variant={showIncome ? "contained" : "outlined"}
            onClick={() => setShowIncome(!showIncome)}
            sx={{ 
              bgcolor: showIncome ? chartColors.income : 'transparent',
              color: showIncome ? 'white' : chartColors.income,
              borderColor: chartColors.income,
              '&:hover': {
                bgcolor: showIncome ? chartColors.income : 'rgba(76, 175, 80, 0.1)',
              }
            }}
          >
            Income
          </Button>
          <Button 
            variant={showExpenses ? "contained" : "outlined"}
            onClick={() => setShowExpenses(!showExpenses)}
            sx={{ 
              bgcolor: showExpenses ? chartColors.expenses : 'transparent',
              color: showExpenses ? 'white' : chartColors.expenses,
              borderColor: chartColors.expenses,
              '&:hover': {
                bgcolor: showExpenses ? chartColors.expenses : 'rgba(244, 67, 54, 0.1)',
              }
            }}
          >
            Expenses
          </Button>
          <Button 
            variant={showBalance ? "contained" : "outlined"}
            onClick={() => setShowBalance(!showBalance)}
            sx={{ 
              bgcolor: showBalance ? chartColors.balance : 'transparent',
              color: showBalance ? 'white' : chartColors.balance,
              borderColor: chartColors.balance,
              '&:hover': {
                bgcolor: showBalance ? chartColors.balance : 'rgba(33, 150, 243, 0.1)',
              }
            }}
          >
            Balance
          </Button>
        </Box>
      </Box>
      
      {/* Actual forecast chart */}
      {!loading && !error && forecastData && forecastData.length > 0 && (
        <Paper sx={{ 
          p: 3, 
          mb: 3,
          bgcolor: isDarkMode 
            ? alpha(theme.palette.background.paper, 0.6) 
            : '#fff',
          height: 480, // Set fixed height to prevent layout shifts
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Typography variant="h6" gutterBottom>
            Forecast Chart 
            <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ ml: 1 }}>
              ({granularity}, {forecastRange} periods
              {selectedAccounts.length !== accounts.length ? 
                `, ${selectedAccounts.length} ${selectedAccounts.length === 1 ? 'account' : 'accounts'}` : 
                ', all accounts'}
              )
            </Typography>
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 400 }}>
            <MemoizedForecastChart
              data={forecastData}
              showIncome={showIncome}
              showExpenses={showExpenses}
              showBalance={showBalance}
              chartColors={chartColors}
              granularity={granularity}
              forecastRange={forecastRange}
              currencySymbol={currencySymbol}
            />
          </Box>
        </Paper>
      )}
      
      {!loading && !error && (!forecastData || forecastData.length === 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No forecast data available. Please check your income and expenses entries.
        </Alert>
      )}
      
      {/* Summary info */}
      {!loading && !error && forecastData && forecastData.length > 0 && (
        <Paper sx={{ 
          p: 2,
          bgcolor: isDarkMode 
            ? alpha(theme.palette.background.paper, 0.4) 
            : '#fff',
        }}>
          <Typography variant="subtitle1" gutterBottom>Forecast Summary</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">
                <strong>Beginning Balance:</strong> {currencySymbol}{currentBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">
                <strong>Ending Balance:</strong> {currencySymbol}{Number(forecastData[forecastData.length - 1].balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">
                <strong>Net Change:</strong> {currencySymbol}{(Number(forecastData[forecastData.length - 1].balance) - currentBalance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </div>
  );
};

export default Forecast;