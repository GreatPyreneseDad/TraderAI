# Local Development Setup

This guide will help you run TraderAI completely locally on your machine.

## Prerequisites

1. **PostgreSQL** (v14+)
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Redis** (v6+)
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis
   ```

3. **Node.js** (v18+) - Already installed ✓
4. **Python** (v3.8+) - Already installed ✓

## Quick Setup

Run the automated setup script:

```bash
cd /Users/chris/Desktop/TraderAI
./scripts/setup-local.sh
```

This script will:
- ✓ Check if PostgreSQL and Redis are running
- ✓ Create the database and user
- ✓ Run database migrations
- ✓ Verify the setup

## Manual Setup (if needed)

### 1. Database Setup

```bash
# Create database
createdb trader_ai

# Create user
psql postgres -c "CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';"

# Grant permissions
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;"

# Additional permissions
psql trader_ai -c "GRANT ALL ON SCHEMA public TO trader_ai_user;"
psql trader_ai -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys:
# - CLAUDE_API_KEY (get from https://console.anthropic.com/)
# - TIINGO_API_TOKEN (get from https://api.tiingo.com/)
```

### 3. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 4. Verify Setup

```bash
# Test database connection
npm run db:verify

# Check services
curl http://localhost:3000/api/health
```

## Starting the Application

```bash
# Start all services (in separate terminals or use tmux)
npm run dev
```

This starts:
- Backend API on http://localhost:3000
- Frontend on http://localhost:5173 (when implemented)
- Dashboard on http://localhost:8080 (when implemented)

## Testing the System

### 1. Generate an Inference

```bash
curl -X POST http://localhost:3000/api/inference/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Should I invest in NVDA given current AI trends?",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "symbols": ["NVDA"]
  }'
```

### 2. Run a Debate

```bash
curl -X POST http://localhost:3000/api/debate/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NVDA",
    "question": "Is NVDA overvalued at current levels?",
    "userId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

## Troubleshooting

### PostgreSQL Issues
- **Connection refused**: Make sure PostgreSQL is running
- **Authentication failed**: Check username/password in .env
- **Permission denied**: Run the grant statements again

### Redis Issues
- **Connection refused**: Start Redis with `redis-server`
- **Port already in use**: Check if Redis is already running

### Node.js Issues
- **Module not found**: Run `npm install`
- **TypeScript errors**: Run `npx prisma generate`

## Development Workflow

1. **Start services**:
   ```bash
   # Terminal 1
   redis-server
   
   # Terminal 2
   npm run dev
   ```

2. **Watch logs**:
   ```bash
   tail -f logs/app.log
   ```

3. **Database management**:
   - Use TablePlus to connect to `localhost:5432`
   - Database: `trader_ai`
   - User: `trader_ai_user`
   - Password: `trader_ai_password_2024`

## Next Steps

1. Add your API keys to `.env`
2. Configure which stocks to monitor
3. Set coherence thresholds
4. Start collecting market data
5. Generate your first inference!