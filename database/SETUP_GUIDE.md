# TraderAI Database Workflow System - Setup Guide

This guide will help you set up the TraderAI Database Workflow System from scratch. Follow these steps carefully to ensure everything works correctly.

## 📋 Prerequisites

Before starting, make sure you have:

- **Operating System:** macOS 10.15+ or Windows 10+
- **Python:** Version 3.8 or higher
- **PostgreSQL:** Version 12 or higher
- **Internet connection** for downloading required software
- **Administrator privileges** on your computer

## 🚀 Quick Setup (Recommended)

If you want to get started quickly, follow this streamlined setup:

### Step 1: Run the Automated Setup Script

```bash
cd /Users/chris/TraderAI/database
chmod +x setup_workflow_system.sh
./setup_workflow_system.sh
```

This script will:
- Install all required dependencies
- Set up the database connections
- Configure the workflow system
- Test all integrations

### Step 2: Verify Installation

```bash
python workflow-manager.py list
```

You should see a list of available workflows. If you get errors, proceed to the Manual Setup section below.

## 🔧 Manual Setup (Detailed)

If the quick setup doesn't work or you prefer manual control, follow these detailed steps:

### Step 1: Install Required Software

#### Install Python Dependencies

```bash
# Navigate to the TraderAI directory
cd /Users/chris/TraderAI

# Create a virtual environment
python -m venv workflow_env

# Activate the virtual environment
# On macOS/Linux:
source workflow_env/bin/activate
# On Windows:
workflow_env\Scripts\activate

# Install required packages
pip install -r database/requirements.txt
```

#### Install PostgreSQL (if not already installed)

**On macOS with Homebrew:**
```bash
brew install postgresql
brew services start postgresql
```

**On Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember your superuser password

#### Install TablePlus

**On macOS:**
```bash
brew install --cask tableplus
```

**On Windows:**
1. Download from https://tableplus.com/windows
2. Install following the standard process

### Step 2: Database Setup

#### Create Database and User

Connect to PostgreSQL as superuser and run:

```sql
-- Create database
CREATE DATABASE trader_ai;

-- Create user
CREATE USER trader_ai_user WITH PASSWORD 'trader_ai_password_2024';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;

-- Connect to the trader_ai database
\c trader_ai

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO trader_ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trader_ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trader_ai_user;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO trader_ai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO trader_ai_user;
```

#### Run Database Initialization Scripts

```bash
cd /Users/chris/TraderAI/database

# Run the setup script
psql -h localhost -d trader_ai -U trader_ai_user -f setup.sql

# Run the optimized queries setup
psql -h localhost -d trader_ai -U trader_ai_user -f optimized-queries.sql

# Create sample data (optional)
psql -h localhost -d trader_ai -U trader_ai_user -f sample-data.sql
```

### Step 3: Configure Environment

#### Create Environment File

Create a file named `.env` in the `/Users/chris/TraderAI` directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trader_ai
DB_USER=trader_ai_user
DB_PASSWORD=trader_ai_password_2024
DATABASE_URL=postgresql://trader_ai_user:trader_ai_password_2024@localhost:5432/trader_ai

# PandasAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key if you plan to use PandasAI.

### Step 4: Initialize Workflow System

#### Run Initialization Scripts

```bash
cd /Users/chris/TraderAI/database

# Initialize workflow databases
python workflow-manager.py --action=init

# Test the integration bridge
python integration-bridge.py status
```

#### Configure TablePlus Connection

1. Open TablePlus
2. Click "Create a new connection"
3. Select "PostgreSQL"
4. Enter the following details:
   - **Name:** TraderAI
   - **Host:** localhost
   - **Port:** 5432
   - **User:** trader_ai_user
   - **Password:** trader_ai_password_2024
   - **Database:** trader_ai
5. Test the connection
6. Save the connection

### Step 5: Verify Installation

#### Test Database Connection

```bash
# Test direct database connection
python -c "
import psycopg2
conn = psycopg2.connect(
    host='localhost',
    database='trader_ai',
    user='trader_ai_user',
    password='trader_ai_password_2024'
)
print('Database connection: SUCCESS')
conn.close()
"
```

#### Test Workflow System

```bash
# List available workflows
python workflow-manager.py list

# Test a simple workflow
python workflow-manager.py start --workflow=market_overview --user-id=test_user
```

#### Test Integration Bridge

```bash
# Check all integrations
python integration-bridge.py status

# Run integration tests
python integration-bridge.py test
```

## 🔧 Advanced Configuration

### Redis Setup (Optional - for caching)

Redis improves performance by caching query results:

```bash
# Install Redis
brew install redis  # macOS
# or download from https://redis.io/download for Windows

# Start Redis
redis-server

# Test Redis connection
redis-cli ping  # Should return "PONG"
```

### PandasAI Enhanced Setup

For better PandasAI performance:

```bash
# Install additional dependencies
pip install pandasai[connectors,llms]

# Set up Docker sandbox (recommended)
docker pull pandasai/pandas-ai-sandbox
```

### Production Configuration

For production deployment:

```bash
# Install production dependencies
pip install gunicorn supervisor

# Configure PostgreSQL for production
# Edit postgresql.conf:
shared_preload_libraries = 'pg_stat_statements'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

# Restart PostgreSQL
brew services restart postgresql
```

## 📊 Sample Data (Optional)

To test the system with sample data:

```bash
cd /Users/chris/TraderAI/database

# Generate sample market data
python generate-sample-data.py --days=7 --symbols="AAPL,TSLA,NVDA,MSFT"

# Verify sample data
psql -h localhost -d trader_ai -U trader_ai_user -c "SELECT COUNT(*) FROM \"MarketData\";"
```

## 🧪 Testing Your Setup

### Basic Functionality Test

```bash
# Test workflow execution
cd /Users/chris/TraderAI/database
python test-system.py --full-test
```

### TablePlus Test

1. Open TablePlus
2. Connect to your TraderAI database
3. Run this test query:
   ```sql
   SELECT 
       COUNT(*) as total_records,
       COUNT(DISTINCT symbol) as unique_symbols,
       MAX(timestamp) as latest_data
   FROM "MarketData";
   ```

### PandasAI Test

```bash
# Test PandasAI service
cd /Users/chris/TraderAI/pandas-ai-service
python pandas_ai_service.py --test-query="Show me the structure of the market data"
```

## 🔄 Update and Maintenance

### Regular Updates

```bash
# Update Python dependencies
pip install --upgrade -r database/requirements.txt

# Update database schema (if needed)
psql -h localhost -d trader_ai -U trader_ai_user -f schema-updates.sql

# Refresh materialized views
psql -h localhost -d trader_ai -U trader_ai_user -c "SELECT refresh_all_views();"
```

### Backup Configuration

```bash
# Backup database
pg_dump -h localhost -U trader_ai_user trader_ai > trader_ai_backup_$(date +%Y%m%d).sql

# Backup configuration
cp .env .env.backup
cp database/workflow-config.json database/workflow-config.json.backup
```

## 🚨 Troubleshooting Setup Issues

### Common Problems and Solutions

#### Problem: "psql: command not found"

**Solution:**
```bash
# Add PostgreSQL to PATH (macOS)
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or find psql location
find /usr -name "psql" 2>/dev/null
```

#### Problem: "Permission denied for database"

**Solution:**
```bash
# Reset user permissions
psql -h localhost -U postgres -c "
ALTER USER trader_ai_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE trader_ai TO trader_ai_user;
"
```

#### Problem: "Could not connect to server"

**Solution:**
```bash
# Check PostgreSQL status
brew services list | grep postgres

# Start PostgreSQL if not running
brew services start postgresql

# Check port usage
lsof -i :5432
```

#### Problem: "Python module not found"

**Solution:**
```bash
# Make sure virtual environment is activated
source workflow_env/bin/activate

# Reinstall requirements
pip install --force-reinstall -r database/requirements.txt
```

#### Problem: "TablePlus connection failed"

**Solutions:**
1. Verify PostgreSQL is running
2. Check connection details match your setup
3. Try connecting with psql first to verify credentials
4. Check firewall settings

### Getting Help

If you encounter issues not covered here:

1. **Check the error logs:**
   ```bash
   tail -f /Users/chris/TraderAI/logs/setup.log
   ```

2. **Run diagnostics:**
   ```bash
   python database/diagnostic-tool.py --full-check
   ```

3. **Contact support** with:
   - Your operating system and version
   - Error messages (full text)
   - Steps you've already tried
   - Output from diagnostic tool

## 📝 Setup Checklist

Use this checklist to ensure everything is properly configured:

### ✅ Software Installation
- [ ] Python 3.8+ installed
- [ ] PostgreSQL installed and running
- [ ] TablePlus installed
- [ ] Virtual environment created and activated
- [ ] All Python dependencies installed

### ✅ Database Configuration
- [ ] trader_ai database created
- [ ] trader_ai_user created with proper permissions
- [ ] Database schema initialized
- [ ] Optimized queries installed
- [ ] Sample data loaded (optional)

### ✅ Environment Configuration
- [ ] .env file created with correct values
- [ ] Environment variables accessible to Python
- [ ] Database connection string working
- [ ] OpenAI API key configured (if using PandasAI)

### ✅ System Testing
- [ ] Database connection test passes
- [ ] Workflow manager lists available workflows
- [ ] Integration bridge status shows all systems operational
- [ ] TablePlus connects successfully
- [ ] Sample query executes without errors

### ✅ Optional Components
- [ ] Redis installed and running (for caching)
- [ ] PandasAI service working
- [ ] Docker configured (for PandasAI sandbox)
- [ ] Production optimizations applied

## 🎯 Next Steps

Once setup is complete:

1. **Read the User Guide** - Learn how to use the system effectively
2. **Start with Simple Workflows** - Begin with the Daily Market Overview
3. **Explore the Examples** - Try different analysis workflows
4. **Customize for Your Needs** - Modify workflows for your specific requirements
5. **Set Up Regular Analysis** - Schedule important workflows to run automatically

---

*Congratulations! You now have a fully functional TraderAI Database Workflow System. Happy analyzing!*