#!/usr/bin/env python3
"""
Stock Data API Server
Run this to create a local API server that fetches stock data without CORS issues.

Install dependencies:
    pip install flask flask-cors yfinance requests --break-system-packages

Run the server:
    python3 stock_api_server.py

Then open stock-valuation-backend.html in your browser.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/stock/<ticker>', methods=['GET'])
def get_stock_data(ticker):
    """Fetch stock data for a given ticker symbol."""
    try:
        # Fetch data using yfinance
        stock = yf.Ticker(ticker)
        info = stock.info

        # Extract key metrics
        data = {
            'symbol': ticker,
            'companyName': info.get('longName', ticker),
            'sector': info.get('sector', ''),
            'industry': info.get('industry', ''),
            'currentPrice': info.get('currentPrice', info.get('regularMarketPrice', 0)),
            'eps': info.get('trailingEps', 0),
            'bookValue': info.get('bookValue', 0),
            'marketCap': info.get('marketCap', 0),
            'peRatio': info.get('trailingPE', 0),
            'forwardPE': info.get('forwardPE', 0),
            'beta': info.get('beta', 0),
            'dividendYield': info.get('dividendYield', 0),
            'fiftyTwoWeekHigh': info.get('fiftyTwoWeekHigh', 0),
            'fiftyTwoWeekLow': info.get('fiftyTwoWeekLow', 0),
            'revenueGrowth': info.get('revenueGrowth', 0),
            'earningsGrowth': info.get('earningsGrowth', 0),
            'freeCashflow': info.get('freeCashflow', 0),
            'operatingCashflow': info.get('operatingCashflow', 0),
            'totalRevenue': info.get('totalRevenue', 0),
            'sharesOutstanding': info.get('sharesOutstanding', 0),
            'exchange': info.get('exchange', ''),
        }

        # Calculate FCF per share if available
        if data['freeCashflow'] and data['sharesOutstanding']:
            data['fcfPerShare'] = data['freeCashflow'] / data['sharesOutstanding']
        else:
            data['fcfPerShare'] = 0

        # Fetch historical data for technical indicators (last 200 days)
        hist = stock.history(period='200d')

        if not hist.empty:
            technical = calculate_technical_indicators(hist, data['currentPrice'])
            data['technical'] = technical
        else:
            data['technical'] = None

        return jsonify({
            'success': True,
            'data': data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to fetch data for {ticker}. Please check the ticker symbol.'
        }), 400

def calculate_technical_indicators(hist, current_price):
    """Calculate technical indicators from historical data."""
    import pandas as pd
    import numpy as np

    technical = {}

    def to_python(val):
        """Convert numpy/pandas types to Python native types for JSON serialization."""
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return None
        if isinstance(val, (np.integer, np.int64)):
            return int(val)
        if isinstance(val, (np.floating, np.float64)):
            return float(val)
        return val

    try:
        # Get closing prices
        closes = hist['Close']

        # 1. Moving Averages
        if len(closes) >= 50:
            technical['sma50'] = to_python(closes.tail(50).mean())
        else:
            technical['sma50'] = None

        if len(closes) >= 200:
            technical['sma200'] = to_python(closes.tail(200).mean())
        else:
            technical['sma200'] = None

        # 2. RSI (14-day)
        if len(closes) >= 14:
            technical['rsi'] = to_python(calculate_rsi(closes, period=14))
        else:
            technical['rsi'] = None

        # 3. MACD
        if len(closes) >= 26:
            macd_data = calculate_macd(closes)
            technical['macd'] = to_python(macd_data['macd'])
            technical['macd_signal'] = to_python(macd_data['signal'])
            technical['macd_histogram'] = to_python(macd_data['histogram'])
        else:
            technical['macd'] = None
            technical['macd_signal'] = None
            technical['macd_histogram'] = None

        # 4. Bollinger Bands
        if len(closes) >= 20:
            bb = calculate_bollinger_bands(closes)
            technical['bb_upper'] = to_python(bb['upper'])
            technical['bb_middle'] = to_python(bb['middle'])
            technical['bb_lower'] = to_python(bb['lower'])
        else:
            technical['bb_upper'] = None
            technical['bb_middle'] = None
            technical['bb_lower'] = None

        # 5. Volume analysis
        if 'Volume' in hist.columns and len(hist) >= 20:
            technical['avg_volume'] = to_python(hist['Volume'].tail(20).mean())
            technical['current_volume'] = to_python(hist['Volume'].iloc[-1])
        else:
            technical['avg_volume'] = None
            technical['current_volume'] = None

        # 6. Elliott Wave-based entry points
        if len(closes) >= 50:
            wave_data = detect_elliott_waves(closes)
            technical['wave_pattern'] = wave_data['pattern']
            technical['entry_level'] = to_python(wave_data['entry_level'])
            technical['support_level'] = to_python(wave_data['support_level'])
            technical['resistance_level'] = to_python(wave_data['resistance_level'])
        else:
            technical['wave_pattern'] = None
            technical['entry_level'] = None
            technical['support_level'] = None
            technical['resistance_level'] = None

    except Exception as e:
        print(f"Error calculating technical indicators: {e}")
        return None

    return technical

def calculate_rsi(prices, period=14):
    """Calculate RSI indicator."""
    import pandas as pd

    # Calculate price changes
    delta = prices.diff()

    # Separate gains and losses
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    # Calculate RS and RSI
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))

    return rsi.iloc[-1]

def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD indicator."""
    import pandas as pd

    # Calculate EMAs
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()

    # MACD line
    macd_line = ema_fast - ema_slow

    # Signal line
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()

    # Histogram
    histogram = macd_line - signal_line

    return {
        'macd': macd_line.iloc[-1],
        'signal': signal_line.iloc[-1],
        'histogram': histogram.iloc[-1]
    }

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    """Calculate Bollinger Bands."""
    import pandas as pd

    # Middle band (SMA)
    middle = prices.rolling(window=period).mean()

    # Standard deviation
    std = prices.rolling(window=period).std()

    # Upper and lower bands
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)

    return {
        'upper': upper.iloc[-1],
        'middle': middle.iloc[-1],
        'lower': lower.iloc[-1]
    }

def detect_elliott_waves(prices):
    """
    Simplified Elliott Wave detection for entry points.
    Identifies key pivot points and calculates optimal entry levels.
    """
    import pandas as pd
    import numpy as np

    try:
        # Find recent swing highs and lows (pivots)
        pivots_high = []
        pivots_low = []

        window = 5  # Look 5 periods on each side

        for i in range(window, len(prices) - window):
            # High pivot
            if prices.iloc[i] == max(prices.iloc[i-window:i+window+1]):
                pivots_high.append((i, prices.iloc[i]))

            # Low pivot
            if prices.iloc[i] == min(prices.iloc[i-window:i+window+1]):
                pivots_low.append((i, prices.iloc[i]))

        current_price = prices.iloc[-1]

        # Get recent significant pivots (last 30 days)
        recent_highs = [p[1] for p in pivots_high if p[0] >= len(prices) - 30]
        recent_lows = [p[1] for p in pivots_low if p[0] >= len(prices) - 30]

        # Calculate support and resistance
        support = min(recent_lows) if recent_lows else current_price * 0.95
        resistance = max(recent_highs) if recent_highs else current_price * 1.05

        # Determine wave pattern and entry level
        price_range = resistance - support
        price_position = (current_price - support) / price_range if price_range > 0 else 0.5

        # Entry logic based on Elliott Wave principles
        if price_position < 0.3:
            # Near support - possible Wave 2 or Wave 4 correction (BEST entry)
            pattern = "Wave 2/4 Correction - Near Support"
            entry_level = support * 1.02  # Slightly above support

        elif price_position < 0.5:
            # Lower third - good entry zone
            pattern = "Correction Zone - Good Entry"
            # Fibonacci retracement levels (38.2%, 50%, 61.8%)
            entry_level = support + (price_range * 0.382)  # 38.2% retracement

        elif price_position > 0.7:
            # Near resistance - possible Wave 3 or Wave 5 (NOT good for entry)
            pattern = "Near Resistance - Wait for Pullback"
            # Suggest waiting for pullback to 50% level
            entry_level = support + (price_range * 0.5)  # 50% retracement

        else:
            # Middle range
            pattern = "Mid-Range - Wait for Confirmation"
            entry_level = support + (price_range * 0.5)

        return {
            'pattern': pattern,
            'entry_level': entry_level,
            'support_level': support,
            'resistance_level': resistance,
            'current_position': price_position
        }

    except Exception as e:
        print(f"Error in Elliott Wave detection: {e}")
        return {
            'pattern': None,
            'entry_level': None,
            'support_level': None,
            'resistance_level': None
        }

@app.route('/api/search/<query>', methods=['GET'])
def search_ticker(query):
    """Search for ticker symbols by company name."""
    try:
        # Use yfinance Ticker search (basic implementation)
        # For production, use a proper ticker search API
        ticker = yf.Ticker(query)
        info = ticker.info
        
        if info and 'symbol' in info:
            return jsonify({
                'success': True,
                'results': [{
                    'symbol': info.get('symbol', query),
                    'name': info.get('longName', query),
                    'exchange': info.get('exchange', '')
                }]
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No results found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/fear-greed', methods=['GET'])
def get_fear_greed():
    """Fetch Fear & Greed Index - using VIX as proxy."""
    try:
        # Use VIX (Volatility Index) as a proxy for market sentiment
        # VIX < 12: Extreme Greed
        # VIX 12-17: Greed
        # VIX 17-25: Neutral
        # VIX 25-35: Fear
        # VIX > 35: Extreme Fear

        vix = yf.Ticker("^VIX")
        vix_data = vix.history(period="5d")

        if not vix_data.empty:
            current_vix = vix_data['Close'].iloc[-1]
            previous_vix = vix_data['Close'].iloc[-2] if len(vix_data) > 1 else current_vix

            # Convert VIX to Fear & Greed scale (0-100, where 100 is extreme greed)
            # Inverse relationship: Low VIX = High Greed
            # Score ranges:
            # 0-25 = Extreme Fear
            # 26-45 = Fear
            # 46-55 = Neutral
            # 56-75 = Greed
            # 76-100 = Extreme Greed

            if current_vix < 12:
                score = 85  # Extreme Greed (76-100)
                rating = 'Extreme Greed'
            elif current_vix < 15:
                score = 65  # Greed (56-75)
                rating = 'Greed'
            elif current_vix < 17:
                score = 50  # Neutral (46-55)
                rating = 'Neutral'
            elif current_vix < 20:
                score = 38  # Fear (26-45) - VIX ~17-20
                rating = 'Fear'
            elif current_vix < 30:
                score = 20  # Extreme Fear (0-25)
                rating = 'Extreme Fear'
            else:
                score = 10  # Extreme Fear (0-25)
                rating = 'Extreme Fear'

            # Get trend
            trend = 'neutral'
            if current_vix < previous_vix:
                trend = 'increasing'  # Less fear = more greed
            elif current_vix > previous_vix:
                trend = 'decreasing'  # More fear = less greed

            return jsonify({
                'success': True,
                'data': {
                    'score': score,
                    'rating': rating,
                    'vix': float(current_vix),
                    'previous_vix': float(previous_vix),
                    'trend': trend,
                    'source': 'VIX (Volatility Index)'
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Unable to fetch market sentiment data'
            }), 500

    except Exception as e:
        print(f"Error fetching Fear & Greed Index: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch Fear & Greed Index'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'message': 'Stock API server is running'})

if __name__ == '__main__':
    print("=" * 60)
    print("Stock Data API Server")
    print("=" * 60)
    print("Server starting on http://localhost:5000")
    print("\nAvailable endpoints:")
    print("  GET /api/stock/<ticker>  - Get stock data")
    print("  GET /api/search/<query>  - Search for ticker")
    print("  GET /health              - Health check")
    print("\nExamples:")
    print("  http://localhost:5000/api/stock/AAPL")
    print("  http://localhost:5000/api/stock/KAMBI.ST")
    print("=" * 60)
    print("\nPress Ctrl+C to stop the server\n")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
