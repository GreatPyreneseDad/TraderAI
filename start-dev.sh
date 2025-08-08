#!/bin/bash
# Start backend and frontend concurrently

echo "🚀 Starting TraderAI Development Server..."

# Export environment variables
export NODE_ENV=development
export DATABASE_URL=postgresql://traderai:password@localhost:5432/traderai
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=dev-secret-minimum-32-characters-change-in-prod
export CLAUDE_API_KEY=${CLAUDE_API_KEY:-mock-api-key}
export TIINGO_API_TOKEN=${TIINGO_API_TOKEN:-mock-token}
export PANDAS_AI_SERVICE_URL=http://localhost:8001
export CORS_ORIGIN=http://localhost:5173

# Function to handle cleanup
cleanup() {
    echo -e "\n🛑 Shutting down TraderAI..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Start backend
echo "🔷 Starting backend on port 3000..."
npx ts-node src/server-simple.ts &
BACKEND_PID=$!

# Start frontend
echo "🔶 Starting frontend on port 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✨ TraderAI is starting up!"
echo "📊 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
