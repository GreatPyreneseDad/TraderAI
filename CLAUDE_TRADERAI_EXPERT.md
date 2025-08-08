# CLAUDE.md - TraderAI Development Expert Instructions

## Project Context

TraderAI is a sophisticated AI-powered trading platform that combines multiple cutting-edge technologies for market analysis and prediction. This document provides Claude with expert knowledge to overcome common development challenges and ensure smooth deployment.

## Core Expertise Areas

### 1. Container Runtime Issues

**Problem**: Modern container runtimes (Podman, containerd, CRI-O) face compatibility issues on macOS.

**Expert Solutions**:
```bash
# Fix Podman vfkit issues on macOS
# Option 1: Use QEMU instead of vfkit
podman machine init --rootful --now --volume-driver=virtfs --vm-type=qemu

# Option 2: Use Docker Desktop as fallback
brew install --cask docker
open -a Docker

# Option 3: Use Colima (lightweight Docker/containerd runtime)
brew install colima
colima start --cpu 4 --memory 8 --disk 50
```

**Best Practice**: Always check virtualization support:
```bash
# macOS virtualization check
sysctl -a | grep -E "kern.hv|machdep.cpu.features" | grep VMX
```

### 2. TypeScript Compilation Errors

**Common Issues**:
- Prisma schema mismatches
- Missing type definitions
- Strict null checks
- Module resolution failures

**Expert Fixes**:
```typescript
// Fix metadata field issues - add to Prisma schema
model Inference {
  // ... existing fields ...
  metadata    Json?        @default("{}")
}

// Fix import resolution
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "strict": false, // Temporarily disable for migration
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}

// Fix type mismatches with type assertions
const coherenceScores = data as CoherenceDimensions;
```

**Compilation Strategy**:
```bash
# Progressive compilation approach
npm run build -- --noEmit  # Check types without building
npm run build -- --listFiles | grep -E "error TS" | head -20  # Find first 20 errors
npx tsc --noEmit --skipLibCheck  # Skip library checks
```

### 3. Service Dependencies

**Problem**: Application requires Redis, PostgreSQL, and other services.

**Rapid Setup Solutions**:

#### Local Services (Fastest)
```bash
# Redis with persistence
brew install redis
echo "maxmemory 256mb" >> /usr/local/etc/redis.conf
echo "maxmemory-policy allkeys-lru" >> /usr/local/etc/redis.conf
brew services start redis

# PostgreSQL with initialization
brew install postgresql@15
brew services start postgresql@15
createuser -s traderai
createdb traderai
psql -d traderai -c "ALTER USER traderai WITH PASSWORD 'password';"

# Verify services
redis-cli ping  # Should return PONG
psql -U traderai -d traderai -c "SELECT 1;"  # Should return 1
```

#### Docker Compose Minimal
```yaml
# docker-compose.minimal.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: traderai
      POSTGRES_PASSWORD: password
      POSTGRES_DB: traderai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis123
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 4. Environment Configuration

**Critical .env Settings**:
```bash
# Essential for development
NODE_ENV=development
DATABASE_URL=postgresql://traderai:password@localhost:5432/traderai
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=dev-secret-minimum-32-characters-change-in-prod

# API Keys (can be mocked for dev)
CLAUDE_API_KEY=mock-api-key-for-development
TIINGO_API_TOKEN=mock-token-for-development

# Service URLs
PANDAS_AI_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:5173

# Disable SSL for local dev
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 5. Database Initialization

**Prisma Setup Commands**:
```bash
# Reset and reinitialize database
npx prisma db push --force-reset  # Warning: deletes all data
npx prisma generate
npx prisma db seed  # If seed script exists

# Migration approach (safer)
npx prisma migrate dev --name init
npx prisma generate

# Fix common Prisma issues
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
npm install
npx prisma generate
```

### 6. Quick Launch Scripts

**Development Launch Script**:
```bash
#!/bin/bash
# save as: quick-start.sh

echo "🚀 TraderAI Quick Start"

# Check dependencies
check_service() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ $1 not found. Installing..."
    brew install $1
    brew services start $1
  else
    echo "✅ $1 is available"
  fi
}

# Install services if needed
check_service redis
check_service postgresql

# Wait for services
echo "⏳ Waiting for services..."
until redis-cli ping &>/dev/null; do sleep 1; done
until pg_isready -h localhost -p 5432 &>/dev/null; do sleep 1; done

# Setup database
createdb traderai 2>/dev/null || true
npx prisma db push

# Start application
echo "🎯 Starting TraderAI..."
npm run dev
```

### 7. Debugging Strategies

**Port Conflicts**:
```bash
# Find and kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
lsof -ti:5432 | xargs kill -9
lsof -ti:6379 | xargs kill -9
```

**Module Resolution**:
```bash
# Clear all caches
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf .next
rm -rf dist
rm -rf frontend/dist
rm package-lock.json
rm frontend/package-lock.json
npm cache clean --force
npm install
cd frontend && npm install
```

**TypeScript Isolated Mode**:
```javascript
// Create src/server-minimal.ts for testing
import express from 'express';
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});
```

### 8. Production-Ready Fixes

**Security Hardening**:
```typescript
// Fix security middleware issues
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

**Error Handling**:
```typescript
// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});
```

### 9. PandasAI Service Setup

**Quick Python Service**:
```bash
# Create minimal PandasAI service
cd pandas-ai-service
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pandas pandasai redis

# Run service
uvicorn main:app --reload --port 8001
```

**Mock Service for Testing**:
```python
# pandas-ai-service/main_mock.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class AnalysisRequest(BaseModel):
    query: str
    symbols: list[str] = []

@app.get("/health")
def health():
    return {"status": "healthy", "service": "pandas-ai-mock"}

@app.post("/analyze")
def analyze(request: AnalysisRequest):
    return {
        "query": request.query,
        "result": "Mock analysis result",
        "confidence": 0.85
    }
```

### 10. Monitoring and Debugging

**Real-time Logs**:
```bash
# Terminal 1: Backend logs
npm run dev:backend 2>&1 | tee backend.log

# Terminal 2: Frontend logs
cd frontend && npm run dev 2>&1 | tee frontend.log

# Terminal 3: Service monitoring
watch -n 1 'echo "=== PORTS ===" && lsof -i :3000 -i :5173 -i :5432 -i :6379 | grep LISTEN'
```

**Health Check Script**:
```bash
#!/bin/bash
# save as: health-check.sh

echo "🏥 TraderAI Health Check"
echo "========================"

# Check services
check_url() {
  if curl -s -f "$1" > /dev/null; then
    echo "✅ $2: OK"
  else
    echo "❌ $2: FAILED"
  fi
}

check_url "http://localhost:3000/api/health" "Backend API"
check_url "http://localhost:5173" "Frontend"
check_url "http://localhost:8001/health" "PandasAI Service"

# Check databases
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis: OK"
else
  echo "❌ Redis: FAILED"
fi

if pg_isready -h localhost > /dev/null 2>&1; then
  echo "✅ PostgreSQL: OK"
else
  echo "❌ PostgreSQL: FAILED"
fi
```

## Emergency Procedures

### When Everything Fails

```bash
# Nuclear reset
#!/bin/bash
# save as: nuclear-reset.sh

echo "☢️  Nuclear Reset - This will destroy all data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  # Stop all services
  brew services stop --all
  docker stop $(docker ps -aq) 2>/dev/null || true
  
  # Clean everything
  rm -rf node_modules frontend/node_modules
  rm -rf dist frontend/dist
  rm -rf .next
  dropdb traderai 2>/dev/null || true
  
  # Reinstall
  npm install
  cd frontend && npm install && cd ..
  
  # Restart services
  brew services start postgresql@15
  brew services start redis
  
  # Recreate database
  createdb traderai
  npx prisma db push
  
  echo "✅ Reset complete. Run: npm run dev"
fi
```

## Key Success Patterns

1. **Always verify services before starting the app**
2. **Use minimal configurations for development**
3. **Fix one error at a time, starting with the most critical**
4. **Keep logs in separate terminals for debugging**
5. **Use mock services when real ones aren't available**
6. **Prefer local services over containers for development speed**

## Common Commands Reference

```bash
# Service Management
brew services list                    # Check all services
brew services restart postgresql@15   # Restart PostgreSQL
redis-cli FLUSHALL                   # Clear Redis cache

# Database
npx prisma studio                    # Visual database browser
psql -U traderai -d traderai        # Direct database access

# Development
npm run dev                          # Start everything
npm run dev:backend                  # Backend only
npm run dev:frontend                 # Frontend only

# Debugging
npm run build -- --noEmit           # Type check only
npm run lint -- --fix               # Auto-fix linting
npm test -- --passWithNoTests       # Skip tests temporarily
```

## Success Criteria

The application is successfully running when:
1. Frontend loads at http://localhost:5173 ✅
2. Backend health check passes at http://localhost:3000/api/health ✅
3. No TypeScript compilation errors ✅
4. Redis and PostgreSQL are connected ✅
5. All core features are accessible ✅

---

**Remember**: The goal is rapid development iteration. Don't let perfect be the enemy of good. Get it running first, optimize later!