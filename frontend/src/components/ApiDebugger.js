import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, CircularProgress, 
  Alert, Divider, List, ListItem, ListItemText, Chip,
  Accordion, AccordionSummary, AccordionDetails, useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../services/api';
import { alpha } from '@mui/material/styles';

const ApiDebugger = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [healthCheck, setHealthCheck] = useState({ status: 'pending', time: null, error: null });
  const [budgetCheck, setBudgetCheck] = useState({ status: 'pending', time: null, error: null, data: null });
  const [categoriesCheck, setCategoriesCheck] = useState({ status: 'pending', time: null, error: null });
  const [testing, setTesting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const runAllTests = async () => {
    setTesting(true);
    setHealthCheck({ status: 'loading', time: null, error: null });
    setBudgetCheck({ status: 'loading', time: null, error: null, data: null });
    setCategoriesCheck({ status: 'loading', time: null, error: null });
    
    // Test health endpoint
    try {
      const startTime = performance.now();
      const response = await api.get('/api/health');
      const endTime = performance.now();
      setHealthCheck({ 
        status: 'success', 
        time: Math.round(endTime - startTime), 
        data: response.data,
        error: null
      });
    } catch (error) {
      setHealthCheck({ 
        status: 'error', 
        time: null, 
        error: error.message || 'Failed to connect to health endpoint'
      });
    }
    
    // Test budget endpoint
    try {
      const startTime = performance.now();
      const response = await api.get('/api/budget');
      const endTime = performance.now();
      setBudgetCheck({ 
        status: 'success', 
        time: Math.round(endTime - startTime), 
        data: response.data,
        error: null
      });
    } catch (error) {
      setBudgetCheck({ 
        status: 'error', 
        time: null, 
        error: error.message || 'Failed to fetch budget data' 
      });
    }
    
    // Test categories endpoint
    try {
      const startTime = performance.now();
      const response = await api.get('/api/categories');
      const endTime = performance.now();
      setCategoriesCheck({ 
        status: 'success', 
        time: Math.round(endTime - startTime),
        data: response.data,
        error: null
      });
    } catch (error) {
      setCategoriesCheck({ 
        status: 'error', 
        time: null, 
        error: error.message || 'Failed to fetch categories' 
      });
    }
    
    setTesting(false);
    setExpanded(true);
  };
  
  // Status chip component
  const StatusChip = ({ status, time }) => {
    if (status === 'loading') return <Chip size="small" icon={<CircularProgress size={16} />} label="Testing..." />;
    if (status === 'success') return <Chip size="small" icon={<CheckCircleIcon />} color="success" label={`OK (${time}ms)`} />;
    if (status === 'error') return <Chip size="small" icon={<ErrorIcon />} color="error" label="Failed" />;
    return <Chip size="small" label="Not tested" />;
  };
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: isDarkMode 
          ? alpha(theme.palette.background.paper, 0.6) 
          : alpha(theme.palette.grey[50], 0.8),
        border: `1px solid ${isDarkMode 
          ? alpha(theme.palette.primary.dark, 0.2) 
          : theme.palette.divider}`
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1">API Connectivity Debugger</Typography>
        <Button 
          variant="contained" 
          size="small" 
          onClick={runAllTests}
          disabled={testing}
        >
          {testing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Test API Connections
        </Button>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <List dense>
        <ListItem>
          <ListItemText primary="Health Check" secondary={`Endpoint: /api/health`} />
          <StatusChip status={healthCheck.status} time={healthCheck.time} />
        </ListItem>
        
        <ListItem>
          <ListItemText primary="Budget Data" secondary={`Endpoint: /api/budget`} />
          <StatusChip status={budgetCheck.status} time={budgetCheck.time} />
        </ListItem>
        
        <ListItem>
          <ListItemText primary="Categories" secondary={`Endpoint: /api/categories`} />
          <StatusChip status={categoriesCheck.status} time={categoriesCheck.time} />
        </ListItem>
      </List>
      
      {(healthCheck.error || budgetCheck.error || categoriesCheck.error) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          API connection issues detected. Please check server status.
        </Alert>
      )}
      
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        sx={{ mt: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Response Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2" gutterBottom>Health Check</Typography>
          {healthCheck.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{healthCheck.error}</Alert>
          ) : healthCheck.status === 'success' ? (
            <pre style={{ 
              padding: 8, 
              borderRadius: 4, 
              overflow: 'auto', 
              maxHeight: 150,
              backgroundColor: isDarkMode 
                ? alpha(theme.palette.primary.dark, 0.15) 
                : alpha(theme.palette.grey[100], 0.9),
              color: theme.palette.text.primary,
              border: `1px solid ${isDarkMode 
                ? alpha(theme.palette.divider, 0.3) 
                : theme.palette.divider}`,
            }}>
              {JSON.stringify(healthCheck.data, null, 2)}
            </pre>
          ) : (
            <Typography variant="body2" color="text.secondary">Not tested yet</Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Budget Data</Typography>
          {budgetCheck.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{budgetCheck.error}</Alert>
          ) : budgetCheck.status === 'success' ? (
            <Box>
              <Typography variant="body2" gutterBottom>
                Received {budgetCheck.data?.incomes?.length || 0} income records and {budgetCheck.data?.payments?.length || 0} payment records.
              </Typography>
              <Typography variant="body2" gutterBottom>
                Categories: {budgetCheck.data?.categories?.length || 0} 
              </Typography>
              <Typography variant="body2">
                Settings: {budgetCheck.data?.settings ? 'Present' : 'Missing'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Not tested yet</Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Categories</Typography>
          {categoriesCheck.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{categoriesCheck.error}</Alert>
          ) : categoriesCheck.status === 'success' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {categoriesCheck.data?.map(category => {
                // Calculate text color based on background color brightness
                const color = category.color;
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                // Calculate brightness using YIQ formula
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                return (
                  <Chip 
                    key={category.id}
                    size="small"
                    label={category.name}
                    sx={{ 
                      bgcolor: category.color,
                      color: brightness > 128 ? '#000' : '#fff',
                      mb: 0.5
                    }}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Not tested yet</Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default ApiDebugger;