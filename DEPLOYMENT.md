# TraderAI Deployment Guide

Complete deployment guide for the TraderAI platform using both traditional Docker and Gaia pipeline automation.

## 🚀 Quick Start

### Option 1: Gaia Pipeline Deployment (Recommended)
```bash
# 1. Start Docker Desktop
# 2. Start Gaia server (http://localhost:8080)
# 3. Setup pipelines
./setup-gaia-pipelines.sh

# 4. Deploy infrastructure
./run-pipeline.sh infrastructure

# 5. Complete deployment
./run-pipeline.sh master-deploy
```

### Option 2: Traditional Docker Deployment
```bash
# 1. Start Docker Desktop
# 2. Copy environment file
cp .env.example .env

# 3. Start services
docker-compose up -d

# 4. Setup database
npm run db:push
```

## 📋 Prerequisites

### Required Software
- **Docker Desktop**: Container orchestration
- **Node.js 18+**: JavaScript runtime
- **Python 3.9+**: PandasAI service
- **Go 1.19+**: Gaia pipeline compilation (for Gaia option)

### Optional for Gaia Deployment
- **Gaia Pipeline Server**: Download from [gaia-pipeline.io](https://gaia-pipeline.io)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PandasAI      │
│   React/TS      │◄──►│   Node.js/TS    │◄──►│   Python/API    │
│   Port: 5173    │    │   Port: 3000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       ▼                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Monitoring    │
│   Port: 5432    │    │   Port: 6379    │    │   Prom/Grafana  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration Files

### Environment Variables (.env)
```bash
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://traderai:password@localhost:5432/traderai
DATABASE_READ_REPLICA_URL=postgresql://traderai:password@localhost:5432/traderai

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# AI Services
CLAUDE_API_KEY=your-claude-api-key-here
PANDAS_AI_SERVICE_URL=http://localhost:8001

# Security
JWT_SECRET=your-secure-jwt-secret-here

# External APIs
TIINGO_API_TOKEN=your-tiingo-token-here
```

### Docker Services
- **PostgreSQL**: Primary database with connection pooling
- **Redis**: Caching and session storage
- **Backend**: TypeScript/Node.js API server
- **Frontend**: React development server or static build
- **PandasAI**: Python FastAPI microservice
- **Monitoring**: Prometheus and Grafana (optional)

## 🛠️ Development Workflow

### Gaia Pipeline Workflow
```bash
# Infrastructure setup
./run-pipeline.sh infrastructure

# Backend development
./run-pipeline.sh backend

# Frontend development  
./run-pipeline.sh frontend

# PandasAI service
./run-pipeline.sh pandas-ai

# Run tests
./run-pipeline.sh testing

# Health diagnostics
./run-pipeline.sh diagnostics
```

### Traditional Docker Workflow
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down
```

## 📊 Service Endpoints

### Backend API
- **Health**: `http://localhost:3000/api/health`
- **Market Data**: `http://localhost:3000/api/market/summary`
- **Inference**: `http://localhost:3000/api/inference/generate`
- **Enhanced Inference**: `http://localhost:3000/api/inference-enhanced/generate-enhanced`

### PandasAI Service
- **Health**: `http://localhost:8001/health`
- **Documentation**: `http://localhost:8001/docs`
- **Analysis**: `http://localhost:8001/analyze`
- **Insights**: `http://localhost:8001/insights`

### Frontend
- **Application**: `http://localhost:5173`
- **Market Analysis**: `http://localhost:5173/market-analysis`

### Monitoring
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001` (admin/admin)

## 🧪 Testing

### Automated Testing
```bash
# Gaia pipeline testing
./run-pipeline.sh testing

# Manual testing
npm test                    # Backend tests
cd frontend && npm test     # Frontend tests
cd pandas-ai-service && python -m pytest  # Python tests
```

### Health Checks
```bash
# Check all services
curl http://localhost:3000/api/health
curl http://localhost:8001/health
curl http://localhost:5173

# Database connectivity
docker exec traderai-postgres pg_isready -U traderai

# Redis connectivity  
docker exec traderai-redis redis-cli --auth redis123 ping
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Docker Daemon Not Running
```bash
# Start Docker Desktop manually
# Or use system-specific commands
sudo systemctl start docker  # Linux
brew services start docker   # macOS with Homebrew
```

#### 2. Port Conflicts
```bash
# Check port usage
lsof -i :3000
lsof -i :5173
lsof -i :8001

# Kill conflicting processes
kill -9 $(lsof -t -i :3000)
```

#### 3. Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres redis
npm run db:push
```

#### 4. Memory Issues
```bash
# Check Docker resource limits
docker system df
docker system prune -f

# Monitor container resources
docker stats
```

### Gaia-Specific Issues

#### 1. Pipeline Registration Fails
- Ensure Gaia server is running at `http://localhost:8080`
- Check if Go binaries compiled successfully
- Verify Python virtual environment setup

#### 2. Pipeline Execution Fails
- Check pipeline logs in Gaia web interface
- Ensure all dependencies are installed
- Verify service health before pipeline execution

#### 3. Service Startup Order
- Use master deployment pipeline for correct ordering
- Infrastructure pipeline must run before application services
- Health checks ensure proper dependency management

## 🚀 Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Generate secure JWT secrets
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up proper firewall rules
- [ ] Enable audit logging
- [ ] Configure backup strategies

### Performance Optimization
- [ ] Enable Redis persistence
- [ ] Configure database connection pooling
- [ ] Set up CDN for static assets
- [ ] Implement caching strategies
- [ ] Monitor resource usage
- [ ] Set up auto-scaling

### Monitoring Setup
```bash
# Start monitoring stack
docker-compose up -d prometheus grafana

# Import Grafana dashboards
# - Node.js application metrics
# - PostgreSQL performance
# - Redis metrics
# - Container resource usage
```

## 📁 Project Structure

```
TraderAI/
├── src/                          # Backend source code
│   ├── api/                     # API routes
│   ├── services/                # Business logic
│   ├── middleware/              # Express middleware
│   └── utils/                   # Utility functions
├── frontend/                    # Frontend React application
│   ├── src/                    # React source code
│   └── public/                 # Static assets
├── pandas-ai-service/          # Python PandasAI service
│   ├── main.py                 # FastAPI application
│   ├── pandas_ai_service.py    # Core service logic
│   └── requirements.txt        # Python dependencies
├── traderai-pipelines/         # Gaia pipeline automation
│   ├── master-deploy-pipeline.go
│   ├── backend/backend-pipeline.go
│   ├── frontend/frontend-pipeline.go
│   ├── pandas-ai/pandas-ai-pipeline.py
│   ├── infrastructure/infrastructure-pipeline.go
│   ├── testing/testing-pipeline.go
│   └── diagnostics/diagnostics-pipeline.go
├── prisma/                     # Database schema
├── docker-compose.yml          # Docker services
├── Dockerfile                  # Main application container
├── setup-gaia-pipelines.sh     # Gaia setup automation
├── run-pipeline.sh             # Pipeline execution helper
└── test-docker-config.sh       # Configuration validation
```

## 🎯 Getting Started

### Step 1: Clone and Setup
```bash
git clone https://github.com/GreatPyreneseDad/TraderAI.git
cd TraderAI
cp .env.example .env
# Edit .env with your API keys
```

### Step 2: Choose Deployment Method

#### Option A: Gaia Pipeline (Advanced)
```bash
./setup-gaia-pipelines.sh
./run-pipeline.sh master-deploy
```

#### Option B: Docker Compose (Simple)
```bash
docker-compose up -d
npm run db:push
```

### Step 3: Verify Deployment
```bash
# Check services
curl http://localhost:3000/api/health
curl http://localhost:8001/health

# Access frontend
open http://localhost:5173
```

## 🆘 Support

### Documentation
- **Gaia Pipelines**: See `traderai-pipelines/README.md`
- **API Documentation**: `http://localhost:8001/docs`
- **Architecture**: See `agent-*.md` files

### Logs and Debugging
```bash
# Docker logs
docker-compose logs -f [service-name]

# Gaia pipeline logs
# Available in Gaia web interface

# Application logs
tail -f logs/application.log
```

### Community and Issues
- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Architecture and implementation questions
- **Wiki**: Extended documentation and guides

This deployment guide provides multiple pathways to get TraderAI running, from simple Docker deployment to advanced Gaia pipeline automation, ensuring flexibility for different use cases and technical preferences.