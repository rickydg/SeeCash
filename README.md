# SeeCash Budget App

## Overview
SeeCash is a modern personal finance application designed to help users track expenses, manage income, forecast cash flow, and visualize financial data through interactive charts. It has been written entirely using Claude 3.7 Sonnet Thinking AI (through CoPilot, VSCode).

## Features
- **Dashboard**: Interactive overview of your finances with charts and statistics
- **Payment Management**: Track one-time and recurring expenses with categories
- **Income Tracking**: Monitor regular and one-time income sources
- **Cash Flow Forecasting**: View projected finances based on recurring transactions
- **Account Management**: Manage multiple accounts with different currencies
- **Category Management**: Organize expenses with color-coded categories
- **Data Export**: Export financial data to XLSX format
- **Light/Dark Mode**: Toggle between light and dark themes
- **Debug Mode**: Advanced troubleshooting (activated by clicking logo 5 times)
- **Responsive Design**: Works on both desktop and mobile devices

## Tech Stack
- **Frontend**: React, Material-UI
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Containerization**: Docker and Docker Compose

## Project Structure
```
budget-app/
├── backend/                # Node.js Express backend
│   ├── data/               # SQLite database storage
│   │   └── budget.db       # Application database
│   ├── src/                # Source code
│   │   ├── models/         # Database models
│   │   └── routes/         # API routes
│   ├── .env                # Environment variables
│   ├── Dockerfile          # Backend container configuration
│   ├── package.json        # Dependencies
│   └── server.js           # Main application file
├── frontend/               # React frontend
│   ├── public/             # Static assets
│   │   └── logo.svg        # Application logo
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── .env                # Environment variables
│   ├── Dockerfile          # Frontend container configuration
│   ├── nginx.conf          # NGINX configuration for SPA
│   └── package.json        # Dependencies
├── docker-compose.yml      # Multi-container definition
└── README.md               # Project documentation
```

## Local Development Setup

### Backend
```bash
cd backend
npm install
npm start
```

The backend server will start on port 8080 by default.

### Frontend
```bash
cd frontend
npm install
npm start
```

The frontend development server will start on port 3000.

## Docker Deployment

The application is containerized and can be deployed using Docker Compose:

```bash
# Build and start the containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the containers
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Unraid Deployment

### Using Docker Compose Manager
1. Install the "Docker Compose Manager" plugin from Community Applications
2. Create a new stack called "seecash"
3. Upload the docker-compose.yml file
4. Deploy the stack

### Manual Container Setup
1. Go to the Docker tab in your Unraid dashboard
2. Click "Add Container" for the backend:
   - Name: seecash-backend
   - Repository: path to your built backend image
   - Port: 8080:8080
   - Path: /mnt/user/appdata/seecash/data:/app/data
   - Environment variables:
     - NODE_ENV=production
     - PORT=8080
     - DATABASE_PATH=data/budget.db

3. Add the frontend container:
   - Name: seecash-frontend
   - Repository: path to your built frontend image
   - Port: 3000:80
   - Environment variables:
     - API_URL=http://YOUR_UNRAID_IP:8080

## Usage Tips

### Hidden Features
- **Debug Mode**: Click the SeeCash logo in the header 5 times to toggle
- **Drawer Pinning**: Navigation drawer state is saved between sessions

### Data Management
- Regularly export your data using the Export function in Settings
- Use the "Danger Zone" options with caution - actions cannot be reversed
- Categories can be disabled rather than deleted to preserve history

### Troubleshooting
- If charts don't render correctly, try toggling dark/light mode
- In debug mode, detailed application information is available
- Check the browser console (F12) for any JavaScript errors

## License
This project is licensed under the MIT License. See the LICENSE file for more details.