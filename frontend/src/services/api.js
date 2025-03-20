import axios from 'axios';

// Create API client
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Log the actual baseURL being used
console.log('%cAPI configured with base URL: %c' + api.defaults.baseURL, 
  'color: #1976d2; font-weight: bold;', 
  'color: #4caf50; font-weight: bold;'
);

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.group('%cAPI Request: %c' + request.method.toUpperCase() + ' ' + request.url, 
    'color: #2196f3; font-weight: bold;', 
    'color: #673ab7; font-weight: bold;'
  );
  console.log('Request Data:', request.data);
  console.groupEnd();
  return request;
}, error => {
  console.error('%cAPI Request Error:', 'color: #f44336; font-weight: bold;', error);
  return Promise.reject(error);
});

// Enhanced error logging for network issues
api.interceptors.response.use(response => {
  console.group('%cAPI Response: %c' + response.status + ' ' + response.config.url, 
    'color: #00bcd4; font-weight: bold;', 
    'color: #009688; font-weight: bold;'
  );
  console.log('Response Size:', JSON.stringify(response.data).length + ' bytes');
  console.groupEnd();
  return response;
}, error => {
  console.group('%cAPI Error: %c' + (error.response?.status || 'Network Error'), 
    'color: #f44336; font-weight: bold;', 
    'color: #ff5722; font-weight: bold;'
  );
  console.error({
    url: error.config?.url,
    method: error.config?.method,
    data: error.config?.data,
    message: error.message,
    responseData: error.response?.data
  });
  console.groupEnd();
  return Promise.reject(error);
});

export const fetchBudget = async () => {
  try {
    console.log("Fetching budget data from /api/budget");
    const response = await api.get('/api/budget');
    console.log("Budget data response:", response);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch budget data:', error);
    throw error;
  }
};

// Income endpoints
export const addIncome = async (incomeData) => {
  try {
    console.log('Sending income data to API:', incomeData);
    
    const response = await api.post('/api/income', incomeData);
    console.log('API response for addIncome:', response);
    
    // Return the data property of the response or the whole response
    return response.data.data ? response.data : { data: response.data };
  } catch (error) {
    console.error('Failed to add income:', error);
    
    // Enhanced error information
    if (error.response) {
      console.error('Server response error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
};

export const updateIncome = async (incomeData) => {
  try {
    const id = incomeData.id;
    if (!id) throw new Error('Income ID is required for updates');
    
    console.log('Updating income data:', incomeData);
    const response = await api.put(`/api/income/${id}`, incomeData);
    console.log('Income update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to update income:', error);
    throw error;
  }
};

export const deleteIncome = async (id) => {
  try {
    console.log('Deleting income with ID:', id);
    const response = await api.delete(`/api/income/${id}`);
    console.log('Income delete response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to delete income:', error);
    throw error;
  }
};

// Payment endpoints
export const fetchPayments = async () => {
  try {
    const response = await api.get('/api/payment');
    console.log('Fetched payments with categories:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
};

export const addPayment = async (paymentData) => {
  try {
    console.log('Sending payment data to API:', paymentData);
    
    const response = await api.post('/api/payment', paymentData);
    console.log('Added payment, server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to add payment:', error);
    throw error;
  }
};

export const updatePayment = async (id, paymentData) => {
  try {
    console.log('Sending updated payment data to API:', paymentData);
    
    const response = await api.put(`/api/payment/${id}`, paymentData);
    console.log('Updated payment, server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to update payment:', error);
    throw error;
  }
};

export const deletePayment = async (id) => {
  try {
    const response = await api.delete(`/api/payment/${id}`);
    console.log('Deleted payment:', id);
    return response.data;
  } catch (error) {
    console.error('Failed to delete payment:', error);
    throw error;
  }
};

// Settings endpoints
export const fetchSettings = async () => {
  try {
    const response = await api.get('/api/settings');
    console.log("Settings loaded:", response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    throw error;
  }
};

export const updateSettings = async (settings) => {
  try {
    const response = await api.put('/api/settings', settings);
    console.log("Settings saved:", response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
};

// Category endpoints
export const fetchCategories = async () => {
  try {
    const response = await api.get('/api/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const addCategory = async (category) => {
  try {
    const response = await api.post('/api/categories', category);
    return response.data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const toggleCategory = async (categoryId, enabled) => {
  try {
    await api.put(`/api/categories/${categoryId}`, { enabled });
    return true;
  } catch (error) {
    console.error('Error toggling category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    await api.delete(`/api/categories/${categoryId}`);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Update the clearAllTransactions function to use the correct endpoint
export const clearAllTransactions = async () => {
  try {
    console.log("Clearing all transactions");
    const response = await api.post('/api/transactions/clear');
    console.log("Clear transactions response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to clear transactions:', error);
    throw error;
  }
};

// Account endpoints
export const fetchAccounts = async () => {
  try {
    const response = await api.get('/api/accounts');
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

export const addAccount = async (accountData) => {
  try {
    const response = await api.post('/api/accounts', accountData);
    return response.data;
  } catch (error) {
    console.error('Error adding account:', error);
    throw error;
  }
};

export const updateAccount = async (id, accountData) => {
  try {
    const response = await api.put(`/api/accounts/${id}`, accountData);
    return response.data;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

export const deleteAccount = async (id) => {
  try {
    await api.delete(`/api/accounts/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export default api;