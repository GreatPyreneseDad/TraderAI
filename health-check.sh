#!/bin/bash
# TraderAI Health Check Script
# Checks the status of all services and components

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏥 TraderAI Health Check${NC}"
echo "========================="
echo ""

# Function to check URL
check_url() {
    local url=$1
    local name=$2
    
    if curl -s -f -m 2 "$url" > /dev/null; then
        echo -e "${GREEN}✅ $name: OK${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: FAILED${NC}"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name (port $port): LISTENING${NC}"
        return 0
    else
        echo -e "${RED}❌ $name (port $port): NOT LISTENING${NC}"
        return 1
    fi
}

# Function to check process
check_process() {
    local process=$1
    local name=$2
    
    if pgrep -f "$process" > /dev/null; then
        echo -e "${GREEN}✅ $name: RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: NOT RUNNING${NC}"
        return 1
    fi
}

# Check services
echo -e "${BLUE}🔌 Service Status:${NC}"
echo "-----------------"

# Redis
if redis-cli ping > /dev/null 2>&1; then
    REDIS_INFO=$(redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
    echo -e "${GREEN}✅ Redis: OK (v$REDIS_INFO)${NC}"
else
    echo -e "${RED}❌ Redis: FAILED${NC}"
fi

# PostgreSQL
if pg_isready -h localhost > /dev/null 2>&1; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✅ PostgreSQL: OK (v$PG_VERSION)${NC}"
else
    echo -e "${RED}❌ PostgreSQL: FAILED${NC}"
fi

# Check if database exists
if psql -U traderai -d traderai -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TraderAI Database: EXISTS${NC}"
else
    echo -e "${RED}❌ TraderAI Database: NOT FOUND${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Application Status:${NC}"
echo "--------------------"

# Check ports
check_port 3000 "Backend API"
check_port 5173 "Frontend Dev Server"
check_port 8001 "PandasAI Service"

echo ""
echo -e "${BLUE}🔗 Endpoint Health:${NC}"
echo "------------------"

# Check endpoints
check_url "http://localhost:3000/api/health" "Backend Health API"
check_url "http://localhost:5173" "Frontend Application"
check_url "http://localhost:8001/health" "PandasAI Service"

echo ""
echo -e "${BLUE}📊 Process Status:${NC}"
echo "-----------------"

# Check processes
check_process "node.*server" "Node.js Server"
check_process "vite" "Vite Dev Server"

echo ""
echo -e "${BLUE}🔍 Configuration:${NC}"
echo "----------------"

# Check environment
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file: EXISTS${NC}"
    
    # Check critical env vars
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✅ DATABASE_URL: CONFIGURED${NC}"
    else
        echo -e "${RED}❌ DATABASE_URL: MISSING${NC}"
    fi
    
    if grep -q "REDIS_URL" .env; then
        echo -e "${GREEN}✅ REDIS_URL: CONFIGURED${NC}"
    else
        echo -e "${RED}❌ REDIS_URL: MISSING${NC}"
    fi
else
    echo -e "${RED}❌ .env file: MISSING${NC}"
fi

# Check node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Backend dependencies: INSTALLED${NC}"
else
    echo -e "${RED}❌ Backend dependencies: NOT INSTALLED${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies: INSTALLED${NC}"
else
    echo -e "${RED}❌ Frontend dependencies: NOT INSTALLED${NC}"
fi

echo ""
echo -e "${BLUE}💾 Memory Usage:${NC}"
echo "---------------"

# Show memory usage for Node processes
ps aux | grep -E "node|vite" | grep -v grep | awk '{printf "%-20s %s %s\n", substr($11,1,20), $3"%", $4"%"}' | head -5

echo ""
echo -e "${BLUE}📌 Quick Commands:${NC}"
echo "-----------------"
echo "Start all:     ./start-dev.sh"
echo "Start backend: npx ts-node src/server-simple.ts"
echo "Start frontend: cd frontend && npm run dev"
echo "View logs:     tail -f *.log"
echo "Stop all:      pkill -f 'node|vite'"
echo ""

# Summary
ISSUES=0
if ! redis-cli ping > /dev/null 2>&1; then ((ISSUES++)); fi
if ! pg_isready -h localhost > /dev/null 2>&1; then ((ISSUES++)); fi
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then ((ISSUES++)); fi
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then ((ISSUES++)); fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
else
    echo -e "${YELLOW}⚠️  $ISSUES issues detected. Run ./quick-start.sh to fix.${NC}"
fi