#!/bin/bash

echo "🚀 Starting TraderAI Development Environment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}tmux not found. Running services in background...${NC}"
    
    # Start Redis
    echo "Starting Redis..."
    redis-server --daemonize yes
    
    # Start backend
    echo "Starting backend server..."
    npm run dev:backend &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend
    echo "Starting frontend..."
    cd frontend && npm install && npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo ""
    echo "Access the application at:"
    echo "- Frontend: http://localhost:5173"
    echo "- Backend API: http://localhost:3000"
    echo "- Health Check: http://localhost:3000/api/health"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    trap "kill $BACKEND_PID $FRONTEND_PID; redis-cli shutdown; exit" INT
    wait
else
    # Use tmux for better session management
    SESSION="traderai"
    
    # Kill existing session if it exists
    tmux kill-session -t $SESSION 2>/dev/null
    
    # Create new session
    tmux new-session -d -s $SESSION -n "redis"
    
    # Window 1: Redis
    tmux send-keys -t $SESSION:0 "redis-server" C-m
    
    # Window 2: Backend
    tmux new-window -t $SESSION -n "backend"
    tmux send-keys -t $SESSION:1 "npm run dev:backend" C-m
    
    # Window 3: Frontend
    tmux new-window -t $SESSION -n "frontend"
    tmux send-keys -t $SESSION:2 "cd frontend && npm install && npm run dev" C-m
    
    # Window 4: Logs
    tmux new-window -t $SESSION -n "logs"
    tmux send-keys -t $SESSION:3 "tail -f logs/app.log" C-m
    
    echo -e "${GREEN}TraderAI development environment started in tmux!${NC}"
    echo ""
    echo "Services:"
    echo "- Redis: Window 0"
    echo "- Backend: Window 1 (http://localhost:3000)"
    echo "- Frontend: Window 2 (http://localhost:5173)"
    echo "- Logs: Window 3"
    echo ""
    echo "Commands:"
    echo "- Attach to session: tmux attach -t $SESSION"
    echo "- Switch windows: Ctrl+B then window number (0-3)"
    echo "- Detach: Ctrl+B then D"
    echo "- Stop all: tmux kill-session -t $SESSION"
    echo ""
    
    # Ask if user wants to attach
    read -p "Attach to tmux session now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tmux attach -t $SESSION
    fi
fi