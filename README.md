# Smart Stock Recommender

A simple, powerful stock recommendation engine that combines **fundamental analysis**, **technical indicators**, and **market sentiment** to give you actionable buy/sell/hold recommendations.

## Features

- **Three-Pillar Analysis**:
  - 📊 **Fundamentals**: P/E ratio, growth metrics, 52-week position
  - 📈 **Technical Analysis**: RSI, MACD, Moving Averages, Bollinger Bands
  - 😨 **Market Sentiment**: Fear & Greed Index based on VIX

- **Real-time Data**: Fetches live stock data and technical indicators
- **Simple Scoring**: 0-15 point system for easy decision making
- **Action Plans**: Entry price, stop loss, and target recommendations
- **Clean UI**: Modern, cyberpunk-styled interface

## Project Structure

```
stonks/
├── index.html              # Clean HTML structure
├── css/
│   └── styles.css         # All styling (update independently)
├── js/
│   ├── config.js          # API configuration (local dev)
│   ├── config.prod.js     # Production config example
│   └── app.js             # Application logic
├── stock_api_server.py    # Flask backend (local dev only)
├── start_server.sh        # Local development startup script
├── venv/                  # Python virtual environment
└── README.md             # This file
```

## Quick Start - Local Development

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python packages
pip install flask flask-cors yfinance requests
```

### 2. Start the API Server

**Option A - Using the startup script:**
```bash
./start_server.sh
```

**Option B - Manual start:**
```bash
source venv/bin/activate
python3 stock_api_server.py
```

The server will start on `http://localhost:5001`

### 3. Start the Web Development Server

To properly develop the frontend, you need to serve it via HTTP (not just opening the HTML file).

**Option A - Using Python's built-in server:**
```bash
# In a NEW terminal window (keep the API server running)
cd /Users/motarski/git_projects/stock-valuation
python3 -m http.server 8000
```

**Option B - Using http-server (recommended for better development experience):**
```bash
# Install once (requires Node.js/npm)
npm install -g http-server

# Then run in a NEW terminal window using the startup script (disables caching)
./start_web_server.sh

# Or manually:
http-server -p 8000 -c-1 --cors
```

### 4. Open the Web App

Open your browser to: **http://localhost:8000**

The app will **auto-detect** that you're running locally and use `http://localhost:5001` for API calls.

**Note:** You should have **two servers running**:
- API Server on port 5001 (`stock_api_server.py`)
- Web Server on port 8000 (serving the frontend files)

## Deployment to Production

### Understanding the Modular Architecture

The app is designed to work seamlessly in both local and production environments:

- **Local Development**: Uses `js/config.js` → API calls go to `http://localhost:5001`
- **Production**: Uses same `js/config.js` → Auto-detects production and uses relative paths like `/stonks/api/stock`

### Option 1: Auto-Detection (Recommended)

The default `js/config.js` automatically detects the environment:
- If `hostname` is `localhost` or `127.0.0.1` → uses local API server
- Otherwise → uses production endpoints (relative paths)

**To deploy:**
1. Copy all files to your production server
2. Ensure your production server routes `/stonks/api/*` to your backend
3. The app will automatically use production endpoints

### Option 2: Manual Configuration

If you want explicit control over production config:

1. Copy `js/config.prod.js` to `js/config.js` before deploying
2. Edit the production endpoints if needed:
   ```javascript
   endpoints: {
       production: {
           baseUrl: '',  // Empty = relative paths
           stock: '/stonks/api/stock',
           search: '/stonks/api/search',
           health: '/stonks/health'
       }
   }
   ```
3. Deploy to production

### Files to Deploy

**For production, deploy these files:**
```
index.html
css/styles.css
js/config.js (or config.prod.js renamed to config.js)
js/app.js
```

**Do NOT deploy to production:**
```
stock_api_server.py   # Local development only
start_server.sh        # Local development only
venv/                  # Local development only
*.backup              # Backup files
```

## Customization Guide

### Updating Styles

All CSS is in `css/styles.css`. You can:
- Modify colors, fonts, animations
- Update the design without touching HTML or JavaScript
- Deploy just the CSS file to update production styling

**Example - Changing color scheme:**
```css
/* Edit css/styles.css */
:root {
    --accent-primary: #ff5500;    /* Change primary accent */
    --accent-secondary: #0055ff;  /* Change secondary accent */
}
```

### Updating API Endpoints

Edit `js/config.js` to change API endpoints:

```javascript
// For local development
endpoints: {
    development: {
        baseUrl: 'http://localhost:5001',
        stock: '/api/stock',
        // ...
    }
}

// For production
endpoints: {
    production: {
        baseUrl: 'https://your-api-domain.com',  // Or '' for relative
        stock: '/api/v2/stock',
        // ...
    }
}
```

### Updating Application Logic

All business logic is in `js/app.js`:
- Modify valuation algorithms
- Change sector definitions
- Update calculation methods
- Add new features

## Workflow: Local Dev → Production

### Typical Development Workflow

1. **Start local development environment:**
   ```bash
   # Terminal 1: Start API server
   ./start_server.sh

   # Terminal 2: Start web server
   http-server -p 8000
   # OR: python3 -m http.server 8000
   ```

2. **Make changes locally:**
   ```bash
   # Edit files:
   # - css/styles.css (for design changes)
   # - js/app.js (for logic changes)
   # - index.html (for structure changes)
   ```

3. **Test your changes:**
   - Open browser to `http://localhost:8000`
   - API calls automatically go to `localhost:5001`
   - All styling and logic changes are reflected immediately
   - Refresh browser to see updates

3. **Deploy to production:**
   ```bash
   # Ensure config.js uses correct production endpoints
   # (auto-detection works by default)

   # Upload these files to production:
   scp -r index.html css/ js/ user@server:/var/www/html/stonks/
   ```

4. **Production automatically uses production endpoints** (via hostname detection)

### Keeping Configs Separate

**If you want to maintain different configs:**

```bash
# Local development
js/config.js → local endpoints (localhost:5001)

# Production
js/config.prod.js → production endpoints
```

**Before deploying to production:**
```bash
# Copy production config
cp js/config.prod.js js/config.js

# Deploy
scp -r index.html css/ js/ user@server:/path/
```

**After deployment, restore local config:**
```bash
git checkout js/config.js
```

## API Endpoints

The Flask server (local dev) provides:

- `GET /api/stock/<ticker>` - Fetch comprehensive stock data
- `GET /api/search/<query>` - Search for ticker symbols
- `GET /health` - Health check endpoint

Production server must implement the same endpoints (or configure different paths in `config.js`).

## Port Configuration

Local development uses **port 5001** (macOS port 5000 is often used by AirPlay Receiver).

To change the port:
1. Edit `stock_api_server.py` - change port in the last line
2. Edit `js/config.js` - update the development baseUrl

## Troubleshooting

### Port Already in Use

If you get "Address already in use" error:

**On macOS:** Disable AirPlay Receiver in System Settings > General > AirDrop & Handoff

**Or use a different port** (see Port Configuration above)

### Module Not Found Error

Make sure you've activated the virtual environment:
```bash
source venv/bin/activate
pip install flask flask-cors yfinance requests
```

### API Not Working in Production

1. Check that production server routes are correctly configured
2. Verify `js/config.js` has correct production endpoints
3. Check browser console for API errors
4. Test health endpoint: `https://your-domain.com/stonks/health`

### Styles Not Loading

1. Verify `css/styles.css` exists and is uploaded
2. Check browser console for 404 errors
3. Ensure paths are correct in `index.html`:
   ```html
   <link rel="stylesheet" href="css/styles.css">
   ```

## Notes

- Data is fetched from Yahoo Finance via the yfinance library
- Analysis is for educational purposes only - not financial advice
- Some stocks may have limited data availability
- International stocks may require exchange suffixes (e.g., KAMBI.ST for Stockholm)

## Architecture Benefits

### Why Modular?

1. **Separation of Concerns**
   - CSS: Design and styling only
   - JS Config: API endpoints only
   - JS App: Business logic only
   - HTML: Structure only

2. **Easy Deployment**
   - Update styles without touching logic
   - Switch between local/prod configs easily
   - Deploy only what changed

3. **Maintainability**
   - Each file has a single responsibility
   - Easy to find and fix issues
   - Clear file organization

4. **Development Speed**
   - Edit CSS without reloading backend
   - Test API changes without touching frontend
   - Parallel development possible

## Development

The app consists of independent components:

1. **Backend (Flask)** - `stock_api_server.py`
   - Handles API requests
   - Fetches stock data from Yahoo Finance
   - Local development only

2. **Frontend** - `index.html` + `css/styles.css`
   - User interface
   - Visual presentation
   - Deployment target

3. **Configuration** - `js/config.js`
   - Environment detection
   - API endpoint routing
   - Switches between local/prod

4. **Application Logic** - `js/app.js`
   - Valuation calculations
   - Data processing
   - Business rules

All components are decoupled and can be updated independently.
