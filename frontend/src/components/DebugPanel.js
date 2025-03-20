import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Button, Accordion, AccordionSummary, 
  AccordionDetails, Divider, useTheme, alpha, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';

const DebugPanel = ({ apiUrl, data, componentName }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Determine proper code block styling
  const codeBlockStyle = {
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    overflow: 'auto',
    maxHeight: expanded ? '600px' : '300px',
    backgroundColor: isDarkMode 
      ? alpha(theme.palette.primary.dark, 0.15) 
      : alpha(theme.palette.grey[100], 0.9),
    border: `1px solid ${isDarkMode 
      ? alpha(theme.palette.divider, 0.3) 
      : theme.palette.divider}`,
    color: theme.palette.text.primary,
  };
  
  // Debug label style
  const debugLabelStyle = {
    backgroundColor: isDarkMode 
      ? alpha(theme.palette.error.dark, 0.2) 
      : alpha(theme.palette.error.light, 0.1),
    color: isDarkMode 
      ? theme.palette.error.light 
      : theme.palette.error.dark,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.5, 1),
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'inline-block',
    marginRight: theme.spacing(1),
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mb: 3, 
        overflow: 'hidden',
        border: `1px solid ${isDarkMode 
          ? alpha(theme.palette.error.main, 0.3) 
          : theme.palette.error.light}`,
        backgroundColor: isDarkMode 
          ? alpha(theme.palette.background.paper, 0.7) 
          : alpha(theme.palette.grey[50], 0.9),
      }}
    >
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        disableGutters
        sx={{
          backgroundColor: 'transparent',
          '&:before': {
            display: 'none', // Remove default divider
          }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon color="error" />}
          sx={{ 
            borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
            backgroundColor: isDarkMode 
              ? alpha(theme.palette.error.dark, 0.1) 
              : alpha(theme.palette.error.light, 0.05),
          }}
        >
          <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <BugReportIcon 
                color="error" 
                fontSize="small" 
                sx={{ mr: 1 }} 
              />
              <Typography variant="subtitle2" color="error" sx={{ fontWeight: 600 }}>
                Debug Mode: {componentName}
              </Typography>
            </Box>
            <Chip
              size="small"
              label="DEVELOPMENT ONLY"
              sx={{
                backgroundColor: isDarkMode 
                  ? alpha(theme.palette.warning.dark, 0.2) 
                  : alpha(theme.palette.warning.light, 0.3),
                color: isDarkMode 
                  ? theme.palette.warning.light 
                  : theme.palette.warning.dark,
              }}
            />
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
              API Endpoint: 
              <Typography 
                component="span" 
                sx={{ 
                  ml: 1, 
                  fontFamily: 'monospace',
                  color: isDarkMode 
                    ? theme.palette.primary.light 
                    : theme.palette.primary.dark,
                }}
              >
                {apiUrl}
              </Typography>
            </Typography>
            
            <Divider sx={{ my: 1.5 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              <Box component="span" sx={debugLabelStyle}>
                JSON
              </Box>
              Component Data
            </Typography>
            
            <Box sx={codeBlockStyle}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DebugPanel;