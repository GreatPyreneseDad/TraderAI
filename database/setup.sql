-- TraderAI Database Setup Script for TablePlus
-- Run this script in TablePlus to create the database and user

-- Create database (run this in the postgres database)
CREATE DATABASE trader_ai;

-- Create user
CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;

-- Connect to trader_ai database before running the following
\c trader_ai;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO trader_ai_user;
GRANT CREATE ON SCHEMA public TO trader_ai_user;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: After running this script, update your .env file with:
-- DATABASE_URL="postgresql://trader_ai_user:trader_ai_password_2024@localhost:5432/trader_ai"