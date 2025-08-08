#!/bin/bash
# Minimal TraderAI startup script based on expert knowledge

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 TraderAI Minimal Startup${NC}"
echo "============================="

# Kill any existing processes on our ports
echo -e "\n${BLUE}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Check if Redis is running
echo -e "\n${BLUE}🔍 Checking Redis...${NC}"
if redis-cli ping &>/dev/null; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting Redis...${NC}"
    brew services start redis || redis-server --daemonize yes
    sleep 2
    if redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✅ Redis started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start Redis${NC}"
        exit 1
    fi
fi

# Check if PostgreSQL is running
echo -e "\n${BLUE}🔍 Checking PostgreSQL...${NC}"
if pg_isready -h localhost &>/dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting PostgreSQL...${NC}"
    brew services start postgresql@15 || brew services start postgresql
    sleep 3
    if pg_isready -h localhost &>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
        exit 1
    fi
fi

# Create database if it doesn't exist
echo -e "\n${BLUE}🗄️  Setting up database...${NC}"
createdb -O postgres traderai 2>/dev/null || true
psql -d postgres -c "CREATE USER traderai WITH PASSWORD 'password';" 2>/dev/null || true
psql -d postgres -c "ALTER USER traderai CREATEDB;" 2>/dev/null || true
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE traderai TO traderai;" 2>/dev/null || true
echo -e "${GREEN}✅ Database setup complete${NC}"

# Install dependencies if needed
echo -e "\n${BLUE}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Setup Prisma
echo -e "\n${BLUE}🔨 Setting up Prisma...${NC}"
npx prisma generate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || true
echo -e "${GREEN}✅ Prisma setup complete${NC}"

# Create logs directory
mkdir -p logs

# Export environment variables
export NODE_ENV=development
export DATABASE_URL="postgresql://traderai:password@localhost:5432/traderai"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="dev-secret-minimum-32-characters-change-in-prod"
export CLAUDE_API_KEY="${CLAUDE_API_KEY:-mock-api-key-for-development}"
export TIINGO_API_TOKEN="${TIINGO_API_TOKEN:-mock-token-for-development}"
export PANDAS_AI_SERVICE_URL="http://localhost:8001"
export CORS_ORIGIN="http://localhost:5173"
export PORT=3000
export FRONTEND_PORT=5173

# Function to handle cleanup
cleanup() {
    echo -e "\n${RED}🛑 Shutting down TraderAI...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

trap cleanup INT TERM

# Start backend (simplified mode)
echo -e "\n${BLUE}🔷 Starting backend server...${NC}"
npx ts-node --transpile-only src/server-simple.ts > logs/backend.log 2>&1 &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Check if backend started successfully
if curl -s -f "http://localhost:3000/api/test" > /dev/null; then
    echo -e "${GREEN}✅ Backend started successfully${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
    tail -20 logs/backend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
echo -e "\n${BLUE}🔶 Starting frontend server...${NC}"
cd frontend && npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Give frontend time to start
sleep 5

# Check if frontend started successfully
if curl -s -f "http://localhost:5173" > /dev/null; then
    echo -e "${GREEN}✅ Frontend started successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting...${NC}"
fi

echo -e "\n${GREEN}🎉 TraderAI is running!${NC}"
echo "================================"
echo -e "📊 Frontend:      ${YELLOW}http://localhost:5173${NC}"
echo -e "🔌 Backend API:   ${YELLOW}http://localhost:3000/api/test${NC}"
echo -e "💖 Health Check:  ${YELLOW}http://localhost:3000/api/health${NC}"
echo -e "📜 Backend Logs:  ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "📜 Frontend Logs: ${YELLOW}tail -f logs/frontend.log${NC}"
echo ""
echo -e "${BLUE}💡 Press Ctrl+C to stop all services${NC}"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
