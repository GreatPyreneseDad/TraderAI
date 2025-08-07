# TraderAI Setup Instructions

## Prerequisites

1. **PostgreSQL** (v14+) - Install and ensure it's running
2. **Redis** (v6+) - Install and ensure it's running
3. **Node.js** (v18+) - Already installed
4. **Python** (v3.8+) - Already installed

## Setup Steps

### 1. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `CLAUDE_API_KEY` - Get from https://console.anthropic.com/
- `TIINGO_API_TOKEN` - Get from https://api.tiingo.com/

### 2. Set up PostgreSQL Database

```bash
# Create database and user
createdb trader_ai
createuser trader_ai_user

# Grant permissions (in psql)
psql -d trader_ai -c "GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;"
```

Update `DATABASE_URL` in `.env` with your database credentials.

### 3. Install Dependencies

```bash
# Node.js dependencies (already done)
npm install

# Initialize submodules
git submodule update --init --recursive

# Install ECNE dependencies
cd ecne-core && npm install && cd ..

# Install GCT dependencies (if Python 3.13 issues persist, use Python 3.11)
cd gct-market/gct-market-sentiment
python3 -m venv venv
source venv/bin/activate
pip install pandas numpy streamlit sqlalchemy python-dotenv aiohttp requests websocket-client
cd ../..
```

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 5. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start the application
npm run dev
```

## Verify Installation

1. Check health endpoint: http://localhost:3000/api/health
2. View logs in `logs/app.log`

## Next Steps

1. **Configure Tiingo WebSocket**: Add stock symbols to monitor
2. **Set Coherence Thresholds**: Adjust in `.env` based on your needs
3. **Test Claude Integration**: Try generating an inference
4. **Monitor Dashboard**: Access at http://localhost:3000/dashboard

## Troubleshooting

- **Database Connection Failed**: Ensure PostgreSQL is running and credentials are correct
- **Redis Connection Failed**: Ensure Redis is running on port 6379
- **Python Dependencies**: If issues with Python 3.13, create venv with Python 3.11
- **Port Already in Use**: Change PORT in `.env` file

## Development Commands

```bash
npm run dev          # Start all services
npm run lint         # Run linting
npm run test         # Run tests
npm run build        # Build for production
```