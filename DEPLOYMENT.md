# Deployment Guide

Quick reference for deploying the Stock Valuation App to production.

## File Structure

```
Local Development:               Production Deployment:
├── index.html                   ├── index.html ✓
├── css/                         ├── css/
│   └── styles.css               │   └── styles.css ✓
├── js/                          ├── js/
│   ├── config.js                │   ├── config.js ✓ (or config.prod.js renamed)
│   ├── config.prod.js           │   └── app.js ✓
│   └── app.js
├── stock_api_server.py  ✗
├── start_server.sh      ✗
├── venv/                ✗
└── *.backup             ✗
```

## Quick Deploy (Auto-Detection Method)

The default configuration automatically detects the environment:

```bash
# From your local machine, upload to production:
scp -r index.html css/ js/ user@yourserver:/var/www/html/stonks/

# That's it! The app will auto-detect it's running in production
# and use relative paths like /stonks/api/stock
```

## Manual Configuration Method

If you want explicit control:

### Step 1: Prepare Production Config

```bash
# Option A: Edit config.js directly
vim js/config.js
# Change environment to 'production'
# Update endpoints as needed

# Option B: Use the production template
cp js/config.prod.js js/config.js
# Edit if needed
vim js/config.js
```

### Step 2: Deploy Files

```bash
# Upload frontend files
scp -r index.html css/ js/ user@yourserver:/var/www/html/stonks/
```

### Step 3: Restore Local Config (if needed)

```bash
# If you modified config.js, restore it for local dev
git checkout js/config.js

# Or copy back from a backup
cp js/config.local.js js/config.js
```

## Production Server Requirements

Your production server must provide these API endpoints:

- `GET /stonks/api/stock/<ticker>` - Returns stock data JSON
- `GET /stonks/api/search/<query>` - Returns search results
- `GET /stonks/health` - Health check

Alternatively, update `js/config.js` to point to your actual API URLs.

## Updating Production

### Update Styles Only

```bash
scp css/styles.css user@yourserver:/var/www/html/stonks/css/
```

### Update Logic Only

```bash
scp js/app.js user@yourserver:/var/www/html/stonks/js/
```

### Update Everything

```bash
scp -r index.html css/ js/ user@yourserver:/var/www/html/stonks/
```

## Configuration Examples

### Local Development (config.js)

```javascript
const API_CONFIG = {
    environment: 'development',
    endpoints: {
        development: {
            baseUrl: 'http://localhost:5001',
            stock: '/api/stock',
            search: '/api/search',
            health: '/health'
        }
    }
};
```

### Production with Relative Paths (config.js)

```javascript
const API_CONFIG = {
    environment: 'production',
    endpoints: {
        production: {
            baseUrl: '',  // Relative paths
            stock: '/stonks/api/stock',
            search: '/stonks/api/search',
            health: '/stonks/health'
        }
    }
};
```

### Production with Absolute URL (config.js)

```javascript
const API_CONFIG = {
    environment: 'production',
    endpoints: {
        production: {
            baseUrl: 'https://api.yourdomain.com',
            stock: '/v1/stock',
            search: '/v1/search',
            health: '/v1/health'
        }
    }
};
```

## Testing Production

After deployment:

1. **Check files uploaded:**
   ```bash
   ssh user@yourserver
   ls -la /var/www/html/stonks/
   ls -la /var/www/html/stonks/css/
   ls -la /var/www/html/stonks/js/
   ```

2. **Test in browser:**
   - Open https://yourdomain.com/stonks/
   - Open browser console (F12)
   - Check for errors
   - Should see: `API Environment: production`

3. **Test API endpoints:**
   ```bash
   curl https://yourdomain.com/stonks/health
   curl https://yourdomain.com/stonks/api/stock/AAPL
   ```

## Troubleshooting

### CSS Not Loading
- Check: `https://yourdomain.com/stonks/css/styles.css` loads
- Verify file permissions: `chmod 644 css/styles.css`
- Check paths in index.html are correct

### JS Not Loading
- Check: `https://yourdomain.com/stonks/js/app.js` loads
- Check: `https://yourdomain.com/stonks/js/config.js` loads
- Verify file permissions: `chmod 644 js/*.js`
- Check browser console for errors

### API Not Working
- Open browser console (F12)
- Check network tab for failed requests
- Verify `js/config.js` has correct endpoints
- Test health endpoint directly
- Check production server logs

### Wrong Environment Detected
- Check browser console: should say `API Environment: production`
- If says "development", edit `js/config.js`:
  ```javascript
  environment: 'production',  // Force production
  ```

## Rollback

If something goes wrong:

```bash
# Restore from backup
scp -r backup/stonks/ user@yourserver:/var/www/html/

# Or restore individual files
scp backup/js/config.js user@yourserver:/var/www/html/stonks/js/
```

## Best Practices

1. **Always test locally first** before deploying
2. **Keep a backup** of production files before updating
3. **Deploy during low-traffic** periods if possible
4. **Test immediately** after deployment
5. **Monitor logs** for errors after deployment
6. **Version your configs** (config.dev.js, config.prod.js)
7. **Use git tags** for production releases

## Git Workflow

```bash
# Tag production releases
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Deploy from specific tag
git checkout v1.0.0
scp -r index.html css/ js/ user@yourserver:/var/www/html/stonks/
git checkout main
```
