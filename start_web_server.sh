#!/bin/bash
# Start web development server with cache disabled for easier development

echo "=========================================="
echo "Starting Web Development Server"
echo "=========================================="
echo "Server will start on http://localhost:8000"
echo "Caching is DISABLED for development"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

http-server -p 8000 -c-1 --cors
