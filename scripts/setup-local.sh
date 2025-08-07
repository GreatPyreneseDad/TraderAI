#!/bin/bash

echo "🚀 TraderAI Local Setup Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if pg_isready >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo "Please start PostgreSQL first:"
    echo "  macOS: brew services start postgresql"
    echo "  Linux: sudo systemctl start postgresql"
    exit 1
fi

# Check if Redis is running
echo "Checking Redis..."
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis is not running${NC}"
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start Redis${NC}"
        echo "Please install Redis: brew install redis"
        exit 1
    fi
fi

# Create database and user
echo ""
echo "Setting up PostgreSQL database..."
psql postgres <<EOF
-- Create database
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_database WHERE datname = 'trader_ai'
   ) THEN
      CREATE DATABASE trader_ai;
   END IF;
END
\$do\$;

-- Create user
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user WHERE usename = 'trader_ai_user'
   ) THEN
      CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';
   END IF;
END
\$do\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;
EOF

# Additional permissions (connect to trader_ai database)
psql trader_ai <<EOF
GRANT ALL ON SCHEMA public TO trader_ai_user;
GRANT CREATE ON SCHEMA public TO trader_ai_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

echo -e "${GREEN}✓ Database setup complete${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your API keys${NC}"
fi

# Run Prisma migrations
echo ""
echo "Running database migrations..."
npx prisma generate
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo "Trying to create tables manually..."
    npx prisma db push
fi

# Verify database
echo ""
echo "Verifying database setup..."
node scripts/verify-db.js

echo ""
echo "================================"
echo -e "${GREEN}Local setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys:"
echo "   - CLAUDE_API_KEY"
echo "   - TIINGO_API_TOKEN"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   - API: http://localhost:3000"
echo "   - Health: http://localhost:3000/api/health"
echo "================================"