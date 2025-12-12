#!/bin/bash

# Stock Valuation App - Local Development Startup Script

echo "================================================"
echo "  Stock Valuation App - Starting..."
echo "================================================"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    echo "Then run: source venv/bin/activate && pip install flask flask-cors yfinance requests"
    exit 1
fi

source venv/bin/activate

# Start Flask API server
echo "✅ Starting Flask API server on http://localhost:5001"
python3 stock_api_server.py
