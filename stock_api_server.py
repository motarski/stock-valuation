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
