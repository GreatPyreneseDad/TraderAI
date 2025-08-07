# TablePlus Database Setup Guide

## 1. Create Database in TablePlus

1. Open TablePlus and connect to your PostgreSQL server (usually localhost)
2. Open a new SQL tab (Cmd+T)
3. Copy and run this SQL:

```sql
-- Create database
CREATE DATABASE trader_ai;

-- Create user
CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;
```

## 2. Connect to the New Database

1. In TablePlus, create a new connection:
   - **Name**: TraderAI
   - **Host**: localhost
   - **Port**: 5432
   - **User**: trader_ai_user
   - **Password**: trader_ai_password_2024
   - **Database**: trader_ai

2. Test and save the connection

## 3. Grant Schema Permissions

Once connected to the trader_ai database, run:

```sql
-- Grant schema permissions
GRANT ALL ON SCHEMA public TO trader_ai_user;
GRANT CREATE ON SCHEMA public TO trader_ai_user;

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 4. Run Prisma Migrations

Back in terminal, run:

```bash
cd /Users/chris/Desktop/TraderAI

# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init
```

## 5. Verify in TablePlus

After migrations, refresh TablePlus to see the created tables:
- User
- MarketData
- Inference
- Verification
- Debate
- DebateVote
- Alert
- SystemHealth

## 6. Test the Connection

Run this query in TablePlus to verify:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Insert test data
INSERT INTO "SystemHealth" (id, service, status, message, timestamp)
VALUES (
  gen_random_uuid(),
  'database',
  'HEALTHY',
  'Database connection test successful',
  NOW()
);

-- Verify
SELECT * FROM "SystemHealth";
```

## Connection String

Your .env file has been updated with:
```
DATABASE_URL=postgresql://trader_ai_user:trader_ai_password_2024@localhost:5432/trader_ai
```

## Troubleshooting

- **Connection refused**: Make sure PostgreSQL is running
- **Authentication failed**: Check username/password in TablePlus connection
- **Permission denied**: Run the GRANT statements in step 3
- **Migration failed**: Ensure you're connected as trader_ai_user, not postgres