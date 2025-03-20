// Update the settings endpoint in your backend
app.post('/api/settings', async (req, res) => {
    try {
      const { currency, dateFormat, start_balance, ...otherSettings } = req.body;
      
      // Make sure dateFormat is being saved
      const settings = {
        currency: currency || 'USD',
        dateFormat: dateFormat || 'MM/DD/YYYY',
        start_balance: parseFloat(start_balance) || 0,
        ...otherSettings
      };
      
      // Save to database
      const savedSettings = await saveSettingsToDatabase(settings);
      
      res.json(savedSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });