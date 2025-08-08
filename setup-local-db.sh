#!/bin/bash

# Script to set up local PostgreSQL database for TraderAI

echo "Setting up TraderAI local database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install it first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "PostgreSQL is not running. Starting it..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    else
        sudo systemctl start postgresql
    fi
    sleep 2
fi

echo "Creating database and user..."

# Create database and user
psql postgres << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'trader_ai_user') THEN
        CREATE USER trader_ai_user WITH PASSWORD 'password';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE trader_ai OWNER trader_ai_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'trader_ai')\\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;
EOF

echo "Database setup complete!"
echo ""
echo "Running Prisma migrations..."

# Run Prisma migrations
npx prisma migrate dev --name init

echo ""
echo "Setup complete! You can now run the application with:"
echo "  npm run dev"