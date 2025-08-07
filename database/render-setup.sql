-- Render PostgreSQL Database Setup
-- Run this in TablePlus connected to your Render database

-- Create user if not exists (Render may have already created one)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE  usename = 'trader_ai_user') THEN
      CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';
   END IF;
END
$do$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;
GRANT ALL ON SCHEMA public TO trader_ai_user;
GRANT CREATE ON SCHEMA public TO trader_ai_user;

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify setup
SELECT current_user, current_database();