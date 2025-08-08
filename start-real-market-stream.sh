#!/bin/bash

echo "🚀 Starting TraderAI with Real Market Data Stream"
echo "================================================"
echo ""

# Check if Alpha Vantage key is set
if [ -z "$ALPHA_VANTAGE_KEY" ]; then
    export ALPHA_VANTAGE_KEY="N7U54NK7PBY5346D"
    echo "✅ Using provided Alpha Vantage API key"
fi

echo "📊 Market Data Sources:"
echo "  - Alpha Vantage (stocks) - Rate limited to 5 calls/minute"
echo "  - CoinGecko (crypto) - No rate limits"
echo ""

# Kill any existing backend process
echo "🔄 Stopping existing backend..."
pkill -f "tsx.*server-minimal" || true
sleep 2

# Start the backend with real market streaming
echo "🚀 Starting backend with real market data..."
npx tsx src/server-minimal.ts > backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running successfully!"
    echo ""
    echo "📈 Market Data Updates:"
    echo "  - Stocks: Updated every minute (Alpha Vantage limit)"
    echo "  - Crypto: Updated every minute"
    echo "  - WebSocket: Real-time updates every 5 seconds"
    echo ""
    echo "🌐 Access the application at:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend API: http://localhost:3000/api/test"
    echo ""
    echo "📊 Market Hours:"
    echo "  - NYSE: 9:30 AM - 4:00 PM ET (Mon-Fri)"
    echo "  - Crypto: 24/7"
    echo ""
    echo "📝 Logs:"
    echo "  - Backend: tail -f backend.log"
    echo "  - Frontend: tail -f frontend.log"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # Keep script running and show backend logs
    tail -f backend.log
else
    echo "❌ Backend failed to start. Check backend.log for errors."
    exit 1
fi