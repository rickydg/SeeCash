const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, process.env.DATABASE_PATH || 'data/budget.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Database connection
let db;

// Database initialization
async function initializeDatabase() {
  try {
    // Open database connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log(`Connected to SQLite database at ${dbPath}`);

    // Run migrations to set up schema
    await db.exec(`
      -- Create settings table
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        currency TEXT NOT NULL DEFAULT 'USD',
        start_balance REAL NOT NULL DEFAULT 0.0
      );
      
      -- Add default settings if not exists
      INSERT OR IGNORE INTO settings (id, currency, start_balance) VALUES (1, 'USD', 0.0);
      
      -- Create income table
      CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        recurring BOOLEAN NOT NULL DEFAULT 0,
        frequency TEXT
      );
      
      -- Create categories table
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT 1
      );
      
      -- Add default categories if table is empty
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Housing', '#4CAF50', 1 WHERE NOT EXISTS (SELECT 1 FROM categories);
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Transportation', '#2196F3', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportation');
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Food', '#FF9800', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Food');
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Utilities', '#9C27B0', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Utilities');
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Health', '#F44336', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health');
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Entertainment', '#673AB7', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entertainment');
      
      INSERT OR IGNORE INTO categories (name, color, enabled) 
      SELECT 'Other', '#795548', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Other');
      
      -- Create payment table
      CREATE TABLE IF NOT EXISTS payment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        recurring BOOLEAN NOT NULL DEFAULT 0,
        frequency TEXT,
        end_date TEXT,
        category_id INTEGER REFERENCES categories(id)
      );
    `);

    // Create accounts table
    await db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add account_id to income table if it doesn't exist
    const incomeColumns = await db.all(`PRAGMA table_info(income);`);
    if (!incomeColumns.some(col => col.name === 'account_id')) {
      console.log('Adding account_id column to income table');
      await db.run(`
        ALTER TABLE income ADD COLUMN account_id INTEGER
        REFERENCES accounts(id) ON DELETE SET NULL
      `);
    }

    // Add account_id to payment table if it doesn't exist
    const paymentColumns = await db.all(`PRAGMA table_info(payment);`);
    if (!paymentColumns.some(col => col.name === 'account_id')) {
      console.log('Adding account_id column to payment table');
      await db.run(`
        ALTER TABLE payment ADD COLUMN account_id INTEGER
        REFERENCES accounts(id) ON DELETE SET NULL
      `);
    }

    // Check if income table has frequency_day column
    const incomeColumnsForDay = await db.all("PRAGMA table_info(income)");
    if (!incomeColumnsForDay.some(col => col.name === 'frequency_day')) {
      console.log('Adding frequency_day column to income table...');
      try {
        await db.run('ALTER TABLE income ADD COLUMN frequency_day INTEGER');
        console.log('Successfully added frequency_day column to income table');
      } catch (alterError) {
        console.error('Error adding frequency_day column to income:', alterError);
      }
    }

    // Check if payment table has frequency_day column
    const paymentColumnsForDay = await db.all("PRAGMA table_info(payment)");
    if (!paymentColumnsForDay.some(col => col.name === 'frequency_day')) {
      console.log('Adding frequency_day column to payment table...');
      try {
        await db.run('ALTER TABLE payment ADD COLUMN frequency_day INTEGER');
        console.log('Successfully added frequency_day column to payment table');
      } catch (alterError) {
        console.error('Error adding frequency_day column to payment:', alterError);
      }
    }

    // Check if payment table has payment_type column
    if (!paymentColumns.some(col => col.name === 'payment_type')) {
      console.log('Adding payment_type column to payment table...');
      try {
        await db.run('ALTER TABLE payment ADD COLUMN payment_type TEXT');
        console.log('Successfully added payment_type column to payment table');
      } catch (alterError) {
        console.error('Error adding payment_type column to payment:', alterError);
      }
    }

    // Check if settings table has dateFormat column
    const settingsColumns = await db.all("PRAGMA table_info(settings)");
    if (!settingsColumns.some(col => col.name === 'dateFormat')) {
      console.log('Adding dateFormat column to settings table...');
      try {
        await db.run('ALTER TABLE settings ADD COLUMN dateFormat TEXT DEFAULT "MM/DD/YYYY"');
        console.log('Successfully added dateFormat column to settings table');
      } catch (alterError) {
        console.error('Error adding dateFormat column to settings:', alterError);
      }
    }

    // Check if settings table has the new columns
    if (!settingsColumns.some(col => col.name === 'enableNotifications')) {
      await db.run('ALTER TABLE settings ADD COLUMN enableNotifications INTEGER DEFAULT 0');
    }
    if (!settingsColumns.some(col => col.name === 'showBalanceInHeader')) {
      await db.run('ALTER TABLE settings ADD COLUMN showBalanceInHeader INTEGER DEFAULT 0');
    }

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}


// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Return more informative health data
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        connected: true,
        path: process.env.DATABASE_PATH
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Budget Data (combines all data needed for dashboard)
app.get('/api/budget', async (req, res) => {
  try {
    const [settings, incomes, categories, accounts] = await Promise.all([
      db.get('SELECT * FROM settings WHERE id = 1'),
      db.all('SELECT * FROM income ORDER BY date DESC'),
      db.all('SELECT * FROM categories'),
      db.all('SELECT * FROM accounts WHERE active = 1')
    ]);
    
    // Get payments with category details
    const payments = await db.all(`
      SELECT 
        p.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name
      FROM payment p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN accounts a ON p.account_id = a.id
      ORDER BY p.date DESC
    `);
    
    // Get incomes with account details
    const incomesWithAccounts = await db.all(`
      SELECT 
        i.*,
        a.name as account_name
      FROM income i
      LEFT JOIN accounts a ON i.account_id = a.id
      ORDER BY i.date DESC
    `);
    
    res.json({ settings, incomes: incomesWithAccounts, payments, categories, accounts });
  } catch (err) {
    console.error('Error fetching budget data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Income endpoints
app.get('/api/income', async (req, res) => {
  try {
    const incomes = await db.all(`
      SELECT 
        i.*,
        a.name as account_name
      FROM income i
      LEFT JOIN accounts a ON i.account_id = a.id
      ORDER BY i.date DESC
    `);
    res.json(incomes);
  } catch (err) {
    console.error('Error fetching incomes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update the POST /api/income endpoint to properly handle account_id

app.post('/api/income', async (req, res) => {
  try {
    // Log the received data for debugging
    console.log('Received income data:', req.body);
    
    const { description, amount, date, recurring, frequency, frequency_day, account_id } = req.body;
    
    // Validate required fields
    if (!description || !amount || !date) {
      return res.status(400).json({ error: 'Missing required fields: description, amount, and date are required' });
    }

    // Prepare SQL with account_id and better error handling
    let result;
    try {
      result = await db.run(
        'INSERT INTO income (description, amount, date, recurring, frequency, frequency_day, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [description, amount, date, recurring ? 1 : 0, frequency || null, frequency_day, account_id || null]
      );
      console.log('Income insert result:', result);
    } catch (dbError) {
      console.error('Database error when inserting income:', dbError);
      return res.status(500).json({ 
        error: 'Database error on insert', 
        details: dbError.message,
        // Safely return the SQL error without exposing sensitive data
        code: dbError.code || 'UNKNOWN_ERROR'
      });
    }

    // Fetch the inserted record to return it
    const income = await db.get('SELECT * FROM income WHERE id = ?', result.lastID);
    
    // Add account information to the response if available
    if (income.account_id) {
      const account = await db.get('SELECT name FROM accounts WHERE id = ?', income.account_id);
      if (account) {
        income.account_name = account.name;
      }
    }
    
    console.log('Successfully added income:', income);
    res.status(201).json({ data: income });
  } catch (err) {
    console.error('Error in POST /api/income:', err);
    res.status(500).json({ error: err.message });
  }
});

// Also update the income update endpoint
app.put('/api/income/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, recurring, frequency, frequency_day, account_id } = req.body;
    
    console.log('Updating income:', id, req.body);
    
    const result = await db.run(
      'UPDATE income SET description = ?, amount = ?, date = ?, recurring = ?, frequency = ?, frequency_day = ?, account_id = ? WHERE id = ?',
      [description, amount, date, recurring ? 1 : 0, frequency || null, frequency_day, account_id || null, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Income record not found' });
    }
    
    // Fetch the updated record
    const income = await db.get('SELECT * FROM income WHERE id = ?', id);
    
    // Add account information if available
    if (income.account_id) {
      const account = await db.get('SELECT name FROM accounts WHERE id = ?', income.account_id);
      if (account) {
        income.account_name = account.name;
      }
    }
    
    res.json({ data: income });
  } catch (err) {
    console.error('Error updating income:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update the PUT endpoint for income
app.put('/api/income/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, recurring, frequency, frequency_day, account_id } = req.body;
    
    console.log('Updating income with ID:', id, 'Data:', req.body);
    
    await db.run(
      'UPDATE income SET description = ?, amount = ?, date = ?, recurring = ?, frequency = ?, frequency_day = ?, account_id = ? WHERE id = ?',
      [description, amount, date, recurring ? 1 : 0, frequency, frequency_day, account_id, id]
    );
    
    // Fetch the updated record to return it
    const income = await db.get('SELECT * FROM income WHERE id = ?', id);
    
    // Add account name if applicable
    if (income && income.account_id) {
      const account = await db.get('SELECT name FROM accounts WHERE id = ?', income.account_id);
      if (account) {
        income.account_name = account.name;
      }
    }
    
    res.json(income);
  } catch (err) {
    console.error('Error updating income:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/income/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM income WHERE id = ?', id);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting income:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update the DELETE endpoint for income
app.delete('/api/income/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting income with ID:', id);
    
    const result = await db.run('DELETE FROM income WHERE id = ?', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Income record not found' });
    }
    
    res.json({ success: true, message: 'Income deleted successfully' });
  } catch (err) {
    console.error('Error deleting income:', err);
    res.status(500).json({ error: err.message });
  }
});

// Payment endpoints
app.get('/api/payment', async (req, res) => {
  try {
    const payments = await db.all(`
      SELECT 
        p.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name
      FROM payment p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN accounts a ON p.account_id = a.id
      ORDER BY p.date DESC
    `);
    console.log('Fetched payments with categories:', payments);
    res.json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modify the POST payment endpoint

app.post('/api/payment', async (req, res) => {
  try {
    const { description, amount, date, recurring, frequency, frequency_day, end_date, category_id, account_id, payment_type } = req.body;
    
    console.log('Creating payment with data:', {
      description, amount, date, recurring, frequency, frequency_day, end_date,
      category_id: category_id,
      account_id: account_id,
      payment_type: payment_type
    });
    
    // Convert category_id to null if it's an empty string or undefined
    const sanitizedCategoryId = category_id ? Number(category_id) : null;
    
    const result = await db.run(
      'INSERT INTO payment (description, amount, date, recurring, frequency, frequency_day, end_date, category_id, account_id, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [description, amount, date, recurring ? 1 : 0, frequency, frequency_day, end_date, sanitizedCategoryId, account_id || null, payment_type || 'direct_debit']
    );
    
    const payment = await db.get('SELECT * FROM payment WHERE id = ?', result.lastID);
    console.log('Created payment:', payment);
    res.status(201).json(payment);
  } catch (err) {
    console.error('Error adding payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apply similar changes to the PUT endpoint
app.put('/api/payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, recurring, frequency, frequency_day, end_date, category_id, account_id, payment_type } = req.body;
    
    console.log('Updating payment with ID:', id, 'Data:', req.body);
    
    await db.run(
      'UPDATE payment SET description = ?, amount = ?, date = ?, recurring = ?, frequency = ?, frequency_day = ?, end_date = ?, category_id = ?, account_id = ?, payment_type = ? WHERE id = ?',
      [description, amount, date, recurring ? 1 : 0, frequency, frequency_day, end_date, category_id, account_id, payment_type || 'direct_debit', id]
    );
    
    const payment = await db.get('SELECT * FROM payment WHERE id = ?', id);
    console.log('Updated payment:', payment);
    res.json(payment);
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM payment WHERE id = ?', id);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Category endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, color, enabled } = req.body;
    
    const result = await db.run(
      'INSERT INTO categories (name, color, enabled) VALUES (?, ?, ?)',
      [name, color, enabled ? 1 : 0]
    );
    
    const category = await db.get('SELECT * FROM categories WHERE id = ?', result.lastID);
    res.status(201).json(category);
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    console.log(`Updating category ${id}:`, req.body);
    
    // Make sure enabled is treated as boolean for SQLite storage
    await db.run(
      'UPDATE categories SET enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, id]
    );
    
    const category = await db.get('SELECT * FROM categories WHERE id = ?', id);
    console.log('Updated category:', category);
    res.json(category);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update any payments to remove association with this category
    await db.run('UPDATE payment SET category_id = NULL WHERE category_id = ?', id);
    
    // Delete the category
    await db.run('DELETE FROM categories WHERE id = ?', id);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update the PUT /api/settings endpoint to handle dateFormat

app.put('/api/settings', async (req, res) => {
  try {
    const { 
      currency, 
      start_balance, 
      dateFormat,
      enableNotifications,
      showBalanceInHeader 
    } = req.body;
    
    console.log("Updating settings:", req.body);
    
    if (!currency) {
      return res.status(400).json({ error: "Currency is required" });
    }
    
    await db.run(
      `UPDATE settings SET 
        currency = ?, 
        start_balance = ?, 
        dateFormat = ?,
        enableNotifications = ?,
        showBalanceInHeader = ?
       WHERE id = 1`,
      [
        currency, 
        start_balance, 
        dateFormat || 'MM/DD/YYYY',
        enableNotifications ? 1 : 0,
        showBalanceInHeader ? 1 : 0
      ]
    );
    
    // Get updated settings and return them
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    console.log("Updated settings:", settings);
    
    res.json(settings);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add these new API endpoints

// Create Account
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, description, balance, currency } = req.body;
    
    const result = await db.run(
      'INSERT INTO accounts (name, description, balance, currency) VALUES (?, ?, ?, ?)',
      [name, description, balance || 0, currency || 'USD']
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', result.lastID);
    res.status(201).json(account);
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await db.all('SELECT * FROM accounts ORDER BY name');
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Single Account
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (err) {
    console.error('Error fetching account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Account
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { name, description, balance, currency, active } = req.body;
    
    await db.run(
      'UPDATE accounts SET name = ?, description = ?, balance = ?, currency = ?, active = ? WHERE id = ?',
      [name, description, balance, currency, active ? 1 : 0, req.params.id]
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', req.params.id);
    res.json(account);
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Account
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM accounts WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(port, () => {
    console.log(`Budget app server running on port ${port}`);
  });
}

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection');
  await db?.close();
  process.exit(0);
});

startServer();