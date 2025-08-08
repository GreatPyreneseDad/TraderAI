#!/bin/bash
# TraderAI Status Monitor
# Real-time monitoring of all services and components

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

while true; do
    clear
    echo -e "${BLUE}🎯 TraderAI Status Monitor${NC}"
    echo "=========================="
    date
    echo ""
    
    # Service Status
    echo -e "${BLUE}🔌 Core Services:${NC}"
    
    # Redis
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "Redis:      ${GREEN}● RUNNING${NC}"
    else
        echo -e "Redis:      ${RED}● STOPPED${NC}"
    fi
    
    # PostgreSQL
    if pg_isready -h localhost > /dev/null 2>&1; then
        echo -e "PostgreSQL: ${GREEN}● RUNNING${NC}"
    else
        echo -e "PostgreSQL: ${RED}● STOPPED${NC}"
    fi
    
    # Database
    if psql -U traderai -d traderai -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "Database:   ${GREEN}● CONNECTED${NC}"
    else
        echo -e "Database:   ${RED}● DISCONNECTED${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🌐 Application Status:${NC}"
    
    # Backend
    if curl -s -f http://localhost:3000/api/test > /dev/null 2>&1; then
        echo -e "Backend:    ${GREEN}● RUNNING${NC} (port 3000)"
    elif lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "Backend:    ${YELLOW}● STARTING${NC} (port 3000)"
    else
        echo -e "Backend:    ${RED}● STOPPED${NC}"
    fi
    
    # Frontend
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        echo -e "Frontend:   ${GREEN}● RUNNING${NC} (port 5173)"
    elif lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "Frontend:   ${YELLOW}● STARTING${NC} (port 5173)"
    else
        echo -e "Frontend:   ${RED}● STOPPED${NC}"
    fi
    
    # PandasAI
    if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "PandasAI:   ${GREEN}● RUNNING${NC} (port 8001)"
    elif lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "PandasAI:   ${YELLOW}● STARTING${NC} (port 8001)"
    else
        echo -e "PandasAI:   ${RED}● STOPPED${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📊 Resource Usage:${NC}"
    
    # Node processes
    NODE_COUNT=$(pgrep -f "node" | wc -l | tr -d ' ')
    if [ "$NODE_COUNT" -gt 0 ]; then
        echo "Node.js processes: $NODE_COUNT"
        ps aux | grep -E "node|ts-node|vite" | grep -v grep | head -3 | awk '{printf "  %-20s CPU: %s%% MEM: %s%%\n", substr($11,1,20), $3, $4}'
    else
        echo "Node.js processes: 0"
    fi
    
    echo ""
    echo -e "${BLUE}🔗 Quick Actions:${NC}"
    echo "1. Start all:     ./start-fixed.sh"
    echo "2. Fix issues:    ./fix-all-issues.sh"
    echo "3. Health check:  ./health-check.sh"
    echo "4. View logs:     tail -f *.log"
    echo ""
    echo "Press Ctrl+C to exit | Refreshing in 5s..."
    
    sleep 5
done