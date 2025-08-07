-- Quick setup for TablePlus
-- Run each section separately

-- 1. First, connect to the default 'postgres' database and run:
CREATE DATABASE trader_ai;
CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;

-- 2. Then connect to the 'trader_ai' database as 'postgres' user and run:
GRANT ALL ON SCHEMA public TO trader_ai_user;
GRANT CREATE ON SCHEMA public TO trader_ai_user;
ALTER DATABASE trader_ai OWNER TO trader_ai_user;