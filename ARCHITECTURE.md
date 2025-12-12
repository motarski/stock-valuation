# Stock Valuation App - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   index.html     │ ← Entry Point
                    └──────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │  CSS      │ │ Config    │ │   App     │
        │ styles.   │ │ config.   │ │   app.    │
        │   css     │ │    js     │ │    js     │
        └───────────┘ └───────────┘ └───────────┘
             │             │             │
             │             ▼             │
             │      ┌─────────────┐     │
             │      │ Environment │     │
             │      │  Detection  │     │
             │      └─────────────┘     │
             │             │             │
             │      ┌──────┴──────┐     │
             │      ▼             ▼     │
             │  localhost:5001   OR    │
             │  (development)  /stonks/api
             │                (production)
             │                     │
             └─────────────────────┼─────────┐
                                   │         │
                                   ▼         │
                           ┌──────────────┐ │
                           │  Stock API   │ │
                           │   Backend    │ │
                           └──────────────┘ │
                                            │
                           ┌────────────────┘
                           │
                           ▼
                      ┌─────────┐
                      │ Yahoo!  │
                      │ Finance │
                      └─────────┘
```

## File Responsibilities

### index.html (Entry Point)
```
┌─────────────────────────────────┐
│        index.html               │
│                                 │
│ ✓ HTML structure                │
│ ✓ Semantic markup               │
│ ✓ Input forms                   │
│ ✓ Display elements              │
│ ✓ Load external resources       │
│                                 │
│ ✗ No styling                    │
│ ✗ No logic                      │
│ ✗ No configuration              │
└─────────────────────────────────┘
```

### css/styles.css (Presentation)
```
┌─────────────────────────────────┐
│       css/styles.css            │
│                                 │
│ ✓ Colors & themes               │
│ ✓ Layouts & grids               │
│ ✓ Animations & transitions      │
│ ✓ Responsive design             │
│ ✓ Typography                    │
│                                 │
│ ✗ No HTML structure             │
│ ✗ No business logic             │
│ ✗ No API calls                  │
└─────────────────────────────────┘
```

### js/config.js (Configuration)
```
┌─────────────────────────────────┐
│       js/config.js              │
│                                 │
│ ✓ Environment detection         │
│   (localhost vs production)     │
│ ✓ API endpoint URLs             │
│ ✓ Configuration per env         │
│ ✓ Helper URL builder methods    │
│                                 │
│ ✗ No business logic             │
│ ✗ No UI manipulation            │
│ ✗ No calculations               │
└─────────────────────────────────┘
```

### js/app.js (Business Logic)
```
┌─────────────────────────────────┐
│        js/app.js                │
│                                 │
│ ✓ Stock data fetching           │
│ ✓ Valuation calculations        │
│   - P/E ratio                   │
│   - DCF                         │
│   - DDM                         │
│   - P/B ratio                   │
│ ✓ Sector analysis               │
│ ✓ Buy/Sell recommendations      │
│ ✓ UI updates                    │
│                                 │
│ ✗ No hardcoded endpoints        │
│   (uses API_CONFIG)             │
│ ✗ No styling                    │
└─────────────────────────────────┘
```

## Data Flow

### Fetching Stock Data
```
User enters ticker "AAPL"
         │
         ▼
  ┌─────────────┐
  │ UI Event    │ (button click)
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ app.js      │ fetchStockData()
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ config.js   │ API_CONFIG.getStockUrl("AAPL")
  └─────────────┘
         │
    ┌────┴────┐
    ▼         ▼
localhost   production
:5001       /stonks/api
    │         │
    └────┬────┘
         ▼
  ┌─────────────┐
  │ Backend API │
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ Yahoo       │
  │ Finance     │
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ JSON Data   │
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ app.js      │ Process & display
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ Update DOM  │ Fill form fields
  └─────────────┘
```

### Analyzing Stock
```
User clicks "Analyze Stonk"
         │
         ▼
  ┌─────────────┐
  │ app.js      │ analyzeStock()
  └─────────────┘
         │
         ▼
  ┌─────────────────────────────┐
  │ Read form inputs            │
  │ - Stock price               │
  │ - EPS                       │
  │ - Growth rate               │
  │ - Required return           │
  └─────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────┐
  │ Calculate Valuations        │
  │                             │
  │ ┌─────────────────────┐     │
  │ │ P/E Ratio           │     │
  │ └─────────────────────┘     │
  │ ┌─────────────────────┐     │
  │ │ Intrinsic Value     │     │
  │ │ (DDM)               │     │
  │ └─────────────────────┘     │
  │ ┌─────────────────────┐     │
  │ │ DCF Valuation       │     │
  │ └─────────────────────┘     │
  │ ┌─────────────────────┐     │
  │ │ P/B Ratio           │     │
  │ └─────────────────────┘     │
  └─────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────┐
  │ Generate Recommendation     │
  │ - Score metrics             │
  │ - Compare to sector         │
  │ - BUY / HOLD / SELL         │
  └─────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────┐
  │ Update Results Display      │
  │ (styles.css applied)        │
  └─────────────────────────────┘
```

## Environment Detection

### How It Works
```
Browser loads index.html
         │
         ▼
Loads js/config.js
         │
         ▼
Checks window.location.hostname
         │
    ┌────┴────┐
    ▼         ▼
localhost   other
127.0.0.1   domain
    │         │
    ▼         ▼
development production
    │         │
    ▼         ▼
localhost   /stonks/api
  :5001       or
              custom URL
```

### Configuration Object
```javascript
API_CONFIG = {
    environment: "development" | "production",

    endpoints: {
        development: {
            baseUrl: "http://localhost:5001",
            stock: "/api/stock",
            ...
        },
        production: {
            baseUrl: "",  // relative
            stock: "/stonks/api/stock",
            ...
        }
    },

    // Auto-selected based on environment
    current: { ... },

    // Helper methods
    getStockUrl(ticker),
    getSearchUrl(query),
    getHealthUrl()
}
```

## Module Dependencies

```
┌──────────────┐
│ index.html   │ ← User loads this
└──────┬───────┘
       │
       ├─→ css/styles.css (no dependencies)
       │
       ├─→ js/config.js (no dependencies)
       │
       └─→ js/app.js (depends on config.js)
```

**Load Order (critical):**
1. `css/styles.css` - Can load anytime (parallel)
2. `js/config.js` - Must load BEFORE app.js
3. `js/app.js` - Must load AFTER config.js

## Deployment Strategies

### Strategy 1: Auto-Detection (Default)
```
Same code everywhere!

Local:                  Production:
┌────────────┐         ┌────────────┐
│ index.html │         │ index.html │ (same file)
│ css/       │         │ css/       │ (same files)
│ js/        │         │ js/        │ (same files)
└────────────┘         └────────────┘
      │                      │
      ▼                      ▼
  localhost:5001        /stonks/api
  (auto-detect)         (auto-detect)
```

### Strategy 2: Manual Config
```
Different config per environment

Local:                  Production:
┌────────────┐         ┌────────────┐
│ config.js  │         │ config.js  │
│ (local)    │         │ (prod)     │
└────────────┘         └────────────┘
      │                      │
      ▼                      ▼
  localhost:5001        custom URLs
  (explicit)            (explicit)
```

## Scalability

### Adding New Features
```
1. Add HTML markup → index.html
2. Add styles → css/styles.css
3. Add logic → js/app.js
4. (Config unchanged)
```

### Changing Design
```
1. Edit css/styles.css only
2. Deploy: scp css/styles.css prod:/path/
3. (No other files touched)
```

### Changing API
```
1. Edit js/config.js only
2. Deploy: scp js/config.js prod:/path/
3. (No other files touched)
```

### Changing Logic
```
1. Edit js/app.js only
2. Deploy: scp js/app.js prod:/path/
3. (No other files touched)
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Files** | 1 monolithic | 4 modular |
| **Lines per file** | 1272 | 230, 747, 48, 420 |
| **CSS updates** | Edit HTML | Edit CSS only |
| **API changes** | Edit HTML | Edit config only |
| **Logic changes** | Edit HTML | Edit app only |
| **Environment switch** | Manual edits | Automatic |
| **Deployment** | All or nothing | Selective updates |
| **Maintainability** | Hard | Easy |
| **Debugging** | Hard | Easy |
| **Collaboration** | Conflicts | Parallel work |

## File Sizes

```
index.html        ~9 KB   (was 47 KB)
css/styles.css   ~15 KB
js/config.js      ~2 KB
js/app.js        ~16 KB
─────────────────────────
Total:           ~42 KB  (was 47 KB)
```

Modular version is actually **slightly smaller** due to removed redundancy!
