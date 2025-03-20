import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, FormGroup, FormControlLabel, Checkbox, Box, Grid, FormControl, 
  InputLabel, Select, MenuItem, OutlinedInput, Chip, TextField, IconButton,
  InputAdornment, Collapse, Card, CardContent
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';
import { styled, useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const CategoryTransactionsTable = ({ payments, categories, currencySymbol }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const theme = useTheme();

  // Initialize with all categories selected
  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories.map(cat => cat.id));
    }
  }, [categories]);

  // Filter payments based on selected categories and date range
  useEffect(() => {
    let filtered = payments;
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(payment => 
        payment.category_id && selectedCategories.includes(payment.category_id)
      );
    }
    
    // Apply date filter
    if (dateFilter.startDate) {
      filtered = filtered.filter(payment => 
        dayjs(payment.date).isAfter(dayjs(dateFilter.startDate)) || 
        dayjs(payment.date).isSame(dayjs(dateFilter.startDate))
      );
    }
    
    if (dateFilter.endDate) {
      filtered = filtered.filter(payment => 
        dayjs(payment.date).isBefore(dayjs(dateFilter.endDate)) || 
        dayjs(payment.date).isSame(dayjs(dateFilter.endDate))
      );
    }
    
    setFilteredPayments(filtered);
  }, [payments, selectedCategories, dateFilter]);

  // Handle category selection change
  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setSelectedCategories(
      typeof value === 'string' ? value.split(',') : value.map(Number)
    );
  };

  // Handle selecting all categories
  const handleSelectAll = () => {
    setSelectedCategories(categories.map(cat => cat.id));
  };

  // Handle clearing all category selections
  const handleClearAll = () => {
    setSelectedCategories([]);
  };

  // Handle date filter change
  const handleDateFilterChange = (field, value) => {
    setDateFilter({
      ...dateFilter,
      [field]: value
    });
  };

  // Group transactions by category for summary
  const categoryTotals = filteredPayments.reduce((acc, payment) => {
    const categoryId = payment.category_id;
    if (!categoryId) return acc;
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        total: 0,
        count: 0,
        category: categories.find(cat => cat.id === categoryId)
      };
    }
    
    acc[categoryId].total += parseFloat(payment.amount);
    acc[categoryId].count += 1;
    
    return acc;
  }, {});

  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <Paper sx={{ 
      p: 2, 
      mt: 3,
      backgroundColor: theme.palette.mode === 'dark' 
        ? theme.palette.background.paper 
        : '#fff'
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Transactions by Category</Typography>
        <IconButton onClick={toggleFilters}>
          <FilterListIcon />
          {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={showFilters}>
        <Card variant="outlined" sx={{ 
          mb: 3,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.main, 0.1)
            : alpha(theme.palette.primary.main, 0.05)
        }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl sx={{ width: '100%' }}>
                  <InputLabel id="category-filter-label">Categories</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    multiple
                    value={selectedCategories}
                    onChange={handleCategoryChange}
                    input={<OutlinedInput label="Categories" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map(value => {
                          const category = categories.find(c => c.id === value);
                          return category ? (
                            <Chip 
                              key={value} 
                              label={category.name} 
                              sx={{ bgcolor: category.color, color: '#fff' }}
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    <MenuItem
                      value="all"
                      onClick={handleSelectAll}
                      dense
                    >
                      <em>Select All</em>
                    </MenuItem>
                    <MenuItem
                      value="none"
                      onClick={handleClearAll}
                      dense
                    >
                      <em>Clear All</em>
                    </MenuItem>
                    {categories.map((category) => (
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
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="End Date"
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Category Summary Section */}
      <TableContainer component={Paper} variant="outlined" sx={{ 
        mb: 3,
        borderColor: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.divider, 0.3)
          : theme.palette.divider
      }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Transactions</TableCell>
              <TableCell align="right">Total Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(categoryTotals).map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: item.category?.color || '#ccc',
                        mr: 1,
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`
                      }} 
                    />
                    {item.category?.name || 'Uncategorized'}
                  </Box>
                </TableCell>
                <TableCell align="right">{item.count}</TableCell>
                <TableCell align="right">
                  {currencySymbol}{item.total.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detailed Transactions Table */}
      <Typography variant="subtitle1" gutterBottom>
        Detailed Transactions
      </Typography>
      
      {filteredPayments.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((payment) => {
                const category = categories.find(cat => cat.id === payment.category_id);
                return (
                  <StyledTableRow key={payment.id}>
                    <TableCell>{dayjs(payment.date).format('MM/DD/YYYY')}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      {category ? (
                        <Box display="flex" alignItems="center">
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: category.color,
                              mr: 1,
                              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`
                            }} 
                          />
                          {category.name}
                        </Box>
                      ) : 'Uncategorized'}
                    </TableCell>
                    <TableCell align="right">
                      {currencySymbol}{parseFloat(payment.amount).toFixed(2)}
                    </TableCell>
                  </StyledTableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="textSecondary" align="center" py={3}>
          No transactions found for the selected filters.
        </Typography>
      )}
    </Paper>
  );
};

export default CategoryTransactionsTable;