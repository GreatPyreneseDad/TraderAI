#!/bin/bash
# Start TraderAI with fixes applied

echo "🚀 Starting TraderAI (Fixed Version)..."

# Kill any existing processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start backend (use minimal if main fails)
echo "Starting backend..."
npx ts-node --transpile-only src/server-minimal.ts &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✨ TraderAI is starting!"
echo "📊 Frontend: http://localhost:5173"
echo "🔌 Backend: http://localhost:3000/api/test"
echo ""
echo "Press Ctrl+C to stop"

# Wait
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
