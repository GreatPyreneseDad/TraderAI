#!/bin/bash
# TraderAI Quick Start Script
# Gets the application running with minimal setup

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 TraderAI Quick Start${NC}"
echo "=========================="

# Function to check if a command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    fi
}

# Function to check if a service is running
check_service() {
    local service=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $service is running on port $port${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $service is not running on port $port${NC}"
        return 1
    fi
}

# Step 1: Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"
check_command node
check_command npm
check_command brew

# Step 2: Install and start local services
echo -e "\n${BLUE}🔧 Setting up services...${NC}"

# Redis
if ! check_command redis-cli; then
    echo "Installing Redis..."
    brew install redis
fi

if ! check_service "Redis" 6379; then
    echo "Starting Redis..."
    brew services start redis
    sleep 2
fi

# PostgreSQL
if ! check_command psql; then
    echo "Installing PostgreSQL..."
    brew install postgresql@15
    brew link postgresql@15
fi

if ! check_service "PostgreSQL" 5432; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 3
fi

# Step 3: Wait for services to be ready
echo -e "\n${BLUE}⏳ Waiting for services to be ready...${NC}"

# Wait for Redis
COUNT=0
until redis-cli ping &>/dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -gt 30 ]; then
        echo -e "${RED}❌ Redis failed to start${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Wait for PostgreSQL
COUNT=0
until pg_isready -h localhost -p 5432 &>/dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -gt 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Step 4: Setup database
echo -e "\n${BLUE}🗄️  Setting up database...${NC}"

# Create user and database
psql postgres -c "CREATE USER traderai WITH PASSWORD 'password';" 2>/dev/null || true
psql postgres -c "ALTER USER traderai CREATEDB;" 2>/dev/null || true
createdb -O traderai traderai 2>/dev/null || true
echo -e "${GREEN}✅ Database created${NC}"

# Step 5: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "\n${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Step 6: Setup Prisma
echo -e "\n${BLUE}🔨 Setting up Prisma...${NC}"
npx prisma generate
npx prisma db push --accept-data-loss
echo -e "${GREEN}✅ Database schema updated${NC}"

# Step 7: Kill any existing processes on our ports
echo -e "\n${BLUE}🧹 Cleaning up old processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✅ Ports cleared${NC}"

# Step 8: Create a minimal start script
cat > start-dev.sh << 'EOF'
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
EOF

chmod +x start-dev.sh

# Step 9: Final instructions
echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n${BLUE}🎯 To start TraderAI, run:${NC}"
echo -e "   ${YELLOW}./start-dev.sh${NC}"
echo -e "\n${BLUE}📊 Once started, access:${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:5173${NC}"
echo -e "   Backend Health: ${YELLOW}http://localhost:3000/api/health${NC}"
echo -e "\n${BLUE}🛑 To stop services later:${NC}"
echo -e "   ${YELLOW}brew services stop redis postgresql@15${NC}"

# Optional: Start immediately
read -p $'\n'"Do you want to start TraderAI now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start-dev.sh
fi