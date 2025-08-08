# Comprehensive TablePlus Guide for TraderAI PostgreSQL Database

## Table of Contents
1. [Connection Setup](#1-connection-setup)
2. [Importing and Running SQL Queries](#2-importing-and-running-sql-queries)
3. [Market Data Analysis Best Practices](#3-market-data-analysis-best-practices)
4. [Essential Bookmarks and Saved Queries](#4-essential-bookmarks-and-saved-queries)
5. [Security Considerations](#5-security-considerations)
6. [Troubleshooting Common Issues](#6-troubleshooting-common-issues)
7. [Advanced Features and Tips](#7-advanced-features-and-tips)

---

## 1. Connection Setup

### 1.1 Primary Connection Configuration

**Connection Name:** TraderAI Production
- **Host:** localhost
- **Port:** 5432
- **Username:** trader_ai_user
- **Password:** trader_ai_password_2024
- **Database:** trader_ai
- **Color Tag:** Green (recommended for easy identification)

### 1.2 Initial Setup Steps

1. **Open TablePlus** and click "Create a new connection"
2. **Select PostgreSQL** as the database type
3. **Enter connection details** as specified above
4. **Test Connection** before saving
5. **Save Connection** with a memorable name

### 1.3 Connection Verification

Run this query immediately after connecting to verify setup:

```sql
-- Verify database setup and permissions
SELECT 
    current_database() as database_name,
    current_user as connected_user,
    version() as postgresql_version,
    NOW() as connection_time;

-- Check table availability
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 2. Importing and Running SQL Queries

### 2.1 Available Query Files

The TraderAI database includes several pre-optimized SQL files:

- **`optimized-queries.sql`** - High-performance market analysis queries
- **`real-time-analytics-queries.sql`** - Dashboard and live data queries  
- **`monitoring-alerting-queries.sql`** - System monitoring and automated alerts
- **`postgresql-performance-config.sql`** - Database performance optimizations

### 2.2 Importing Query Files

**Method 1: Direct File Import**
1. Open TablePlus and connect to TraderAI database
2. Go to **File > Open SQL File** (Cmd+O)
3. Navigate to `/Users/chris/TraderAI/database/`
4. Select the desired `.sql` file
5. Execute sections as needed (use Cmd+Enter for selected queries)

**Method 2: Copy-Paste Method**
1. Open the SQL file in your text editor
2. Copy the specific query or function you need
3. Paste into a new TablePlus SQL tab
4. Execute with Cmd+Enter

### 2.3 Executing Optimized Queries

**Real-time Market Snapshot:**
```sql
-- Execute this for current market overview
SELECT * FROM v_realtime_market_snapshot 
ORDER BY coherence_score DESC 
LIMIT 20;
```

**Coherence Pattern Detection:**
```sql
-- Analyze coherence patterns for specific symbol
SELECT * FROM detect_coherence_patterns('AAPL', '2 hours');
```

**System Health Check:**
```sql
-- Get current system health status
SELECT * FROM v_system_health_overview;
```

---

## 3. Market Data Analysis Best Practices

### 3.1 Optimal Query Patterns

**Time Range Filtering:**
Always use indexed timestamp ranges for better performance:

```sql
-- Good: Uses index effectively
SELECT * FROM "MarketData" 
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND symbol = 'AAPL'
ORDER BY timestamp DESC;

-- Avoid: Full table scans
SELECT * FROM "MarketData" 
WHERE EXTRACT(hour FROM timestamp) = 14;
```

**Coherence Score Analysis:**
```sql
-- Extract and analyze coherence scores efficiently
SELECT 
    symbol,
    timestamp,
    price,
    (coherenceScores->>'psi')::float as psi,
    (coherenceScores->>'rho')::float as rho,
    (coherenceScores->>'q')::float as q,
    (coherenceScores->>'f')::float as f,
    -- Composite score
    (coherenceScores->>'psi')::float * 0.3 + 
    (coherenceScores->>'rho')::float * 0.3 + 
    (coherenceScores->>'q')::float * 0.2 + 
    (coherenceScores->>'f')::float * 0.2 as composite_coherence
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND (coherenceScores->>'psi')::float > 0.7;
```

### 3.2 Data Visualization Tips

**Use TablePlus Chart Feature:**
1. Execute query returning time-series data
2. Click on the **Chart** tab in results
3. Set X-axis to timestamp column
4. Set Y-axis to price or coherence metrics
5. Group by symbol for multi-series charts

**Export for External Analysis:**
- **CSV Format:** Best for Excel/Python analysis
- **JSON Format:** Ideal for web applications
- **SQL Format:** For sharing queries with team

---

## 4. Essential Bookmarks and Saved Queries

### 4.1 Dashboard Queries

Save these queries as bookmarks in TablePlus for quick access:

**Market Overview Dashboard**
```sql
-- Name: "Market Overview"
-- Description: "Real-time market snapshot with coherence scores"
WITH latest_data AS (
    SELECT DISTINCT ON (symbol) 
        symbol,
        timestamp,
        price,
        volume,
        (coherenceScores->>'psi')::float as psi,
        (coherenceScores->>'rho')::float as rho,
        (coherenceScores->>'q')::float as q,
        (coherenceScores->>'f')::float as f
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY symbol, timestamp DESC
)
SELECT 
    symbol,
    price,
    volume,
    psi, rho, q, f,
    ROUND((psi * 0.3 + rho * 0.3 + q * 0.2 + f * 0.2)::numeric, 3) as coherence_score,
    timestamp
FROM latest_data
ORDER BY coherence_score DESC;
```

**Active Alerts Summary**
```sql
-- Name: "Active Alerts"
-- Description: "Unacknowledged alerts by priority"
SELECT 
    type,
    severity,
    symbol,
    title,
    message,
    "createdAt",
    EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60 as minutes_old
FROM "Alert"
WHERE NOT acknowledged
ORDER BY 
    CASE severity 
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END,
    "createdAt" DESC;
```

**System Health Monitor**
```sql
-- Name: "System Health"
-- Description: "Current system health status"
SELECT DISTINCT ON (service)
    service,
    status,
    message,
    (metrics->>'cpu_usage')::float as cpu_pct,
    (metrics->>'memory_usage')::float as memory_pct,
    (metrics->>'response_time_ms')::float as response_ms,
    timestamp,
    EXTRACT(EPOCH FROM (NOW() - timestamp)) / 60 as minutes_old
FROM "SystemHealth"
ORDER BY service, timestamp DESC;
```

### 4.2 Analysis Queries

**Coherence Anomaly Detection**
```sql
-- Name: "Coherence Anomalies"
-- Description: "Find unusual coherence patterns"
WITH coherence_baseline AS (
    SELECT 
        symbol,
        AVG((coherenceScores->>'psi')::float) as baseline_psi,
        STDDEV((coherenceScores->>'psi')::float) as stddev_psi
    FROM "MarketData"
    WHERE timestamp BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '2 hours'
    GROUP BY symbol
),
recent_coherence AS (
    SELECT DISTINCT ON (symbol)
        symbol,
        timestamp,
        (coherenceScores->>'psi')::float as current_psi
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY symbol, timestamp DESC
)
SELECT 
    rc.symbol,
    rc.timestamp,
    rc.current_psi,
    ROUND(cb.baseline_psi::numeric, 3) as baseline_psi,
    ROUND(((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0))::numeric, 2) as z_score
FROM recent_coherence rc
JOIN coherence_baseline cb ON rc.symbol = cb.symbol
WHERE ABS((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0)) > 2.0
ORDER BY ABS((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0)) DESC;
```

**User Activity Analytics**
```sql
-- Name: "User Activity"
-- Description: "Recent user engagement metrics"
SELECT 
    u.username,
    u.role,
    COUNT(DISTINCT i.id) FILTER (WHERE i."createdAt" > NOW() - INTERVAL '24 hours') as inferences_24h,
    COUNT(DISTINCT v.id) FILTER (WHERE v."createdAt" > NOW() - INTERVAL '24 hours') as verifications_24h,
    AVG(i.confidence) FILTER (WHERE i."createdAt" > NOW() - INTERVAL '24 hours') as avg_confidence,
    MAX(GREATEST(i."createdAt", v."createdAt")) as last_activity
FROM "User" u
LEFT JOIN "Inference" i ON u.id = i."userId"
LEFT JOIN "Verification" v ON u.id = v."userId"
WHERE u."createdAt" > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.username, u.role
HAVING COUNT(DISTINCT i.id) + COUNT(DISTINCT v.id) > 0
ORDER BY last_activity DESC;
```

### 4.3 Bookmark Organization

Organize bookmarks in TablePlus folders:

```
📁 TraderAI Queries
├── 📁 Dashboard
│   ├── Market Overview
│   ├── Active Alerts
│   └── System Health
├── 📁 Analysis
│   ├── Coherence Anomalies
│   ├── Price Momentum
│   └── User Activity
├── 📁 Maintenance
│   ├── Data Quality Check
│   ├── Performance Monitor
│   └── Cleanup Tasks
└── 📁 Troubleshooting
    ├── Connection Diagnosis
    ├── Slow Queries
    └── Lock Analysis
```

---

## 5. Security Considerations

### 5.1 Connection Security

**SSL/TLS Configuration:**
```sql
-- Verify SSL connection status
SELECT 
    inet_server_addr() as server_ip,
    inet_server_port() as server_port,
    ssl_is_used() as ssl_active,
    ssl_version() as ssl_version,
    ssl_cipher() as ssl_cipher;
```

**Password Management:**
- Use TablePlus keychain integration
- Never save passwords in shared query files
- Rotate database passwords quarterly
- Use different passwords for dev/staging/prod

### 5.2 Access Control

**User Permissions Audit:**
```sql
-- Check current user permissions
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = current_user
ORDER BY table_schema, table_name;

-- Verify role membership
SELECT 
    r.rolname as role_name,
    r.rolsuper as is_superuser,
    r.rolcreaterole as can_create_roles,
    r.rolcreatedb as can_create_db
FROM pg_roles r
WHERE r.rolname = current_user;
```

**Data Masking for Sensitive Information:**
```sql
-- Example: Mask user emails in queries
SELECT 
    id,
    username,
    CASE 
        WHEN current_user = 'trader_ai_admin' THEN email
        ELSE regexp_replace(email, '(.{2}).*(@.*)', '\1***\2')
    END as email,
    role,
    "createdAt"
FROM "User";
```

### 5.3 Query Safety

**Safe Query Practices:**
```sql
-- Always use LIMIT for large table queries
SELECT * FROM "MarketData" 
WHERE timestamp > NOW() - INTERVAL '1 day'
LIMIT 1000;  -- Prevent accidental large result sets

-- Use transactions for data modifications
BEGIN;
UPDATE "Alert" SET acknowledged = true 
WHERE id = 'specific-alert-id';
-- Verify before commit
SELECT * FROM "Alert" WHERE id = 'specific-alert-id';
COMMIT;  -- or ROLLBACK if incorrect
```

---

## 6. Troubleshooting Common Issues

### 6.1 Connection Problems

**Issue: Connection Refused**
```sql
-- Check if PostgreSQL is running
-- Run in terminal:
-- brew services list | grep postgresql
-- sudo lsof -i :5432
```

**Solution Steps:**
1. Verify PostgreSQL service is running
2. Check if port 5432 is available
3. Confirm firewall settings
4. Test with `psql` command line first

**Issue: Authentication Failed**
```sql
-- Verify user exists and permissions
-- Connect as superuser first, then run:
SELECT 
    rolname,
    rolcanlogin,
    rolpassword IS NOT NULL as has_password
FROM pg_roles 
WHERE rolname = 'trader_ai_user';
```

### 6.2 Performance Issues

**Slow Query Diagnosis:**
```sql
-- Find currently running slow queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active';

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM "MarketData" 
WHERE symbol = 'AAPL' 
  AND timestamp > NOW() - INTERVAL '1 hour';
```

**Index Usage Analysis:**
```sql
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 6.3 Data Issues

**Missing Data Detection:**
```sql
-- Check for data gaps
WITH expected_times AS (
    SELECT generate_series(
        NOW() - INTERVAL '1 hour',
        NOW(),
        INTERVAL '1 minute'
    ) as expected_time
),
actual_data AS (
    SELECT DISTINCT date_trunc('minute', timestamp) as actual_time
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '1 hour'
      AND symbol = 'AAPL'
)
SELECT et.expected_time
FROM expected_times et
LEFT JOIN actual_data ad ON et.expected_time = ad.actual_time
WHERE ad.actual_time IS NULL
ORDER BY et.expected_time;
```

**Data Quality Checks:**
```sql
-- Run comprehensive data quality check
SELECT * FROM check_market_data_quality();

-- Check for duplicate records
SELECT 
    symbol,
    timestamp,
    COUNT(*) as duplicate_count
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY symbol, timestamp
HAVING COUNT(*) > 1;
```

### 6.4 Error Resolution

**Common Error Messages:**

1. **"relation does not exist"**
   - Check table name spelling and case sensitivity
   - Verify you're connected to correct database
   - Ensure table exists: `\dt` in psql or use TablePlus schema browser

2. **"column does not exist"**
   - Check column names in table structure
   - JSON field access: use `->` for JSON, `->>` for text

3. **"permission denied"**
   - Verify user has necessary privileges
   - Check if table has RLS (Row Level Security) enabled

**Recovery Queries:**
```sql
-- Restart stuck connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND query_start < NOW() - INTERVAL '1 hour';

-- Clear query plan cache if performance degrades
SELECT pg_stat_reset();
```

---

## 7. Advanced Features and Tips

### 7.1 TablePlus Productivity Features

**Keyboard Shortcuts:**
- `Cmd + T`: New SQL tab
- `Cmd + Enter`: Execute query
- `Cmd + S`: Save query
- `Cmd + Shift + D`: Duplicate tab
- `Cmd + /`: Comment/uncomment line
- `Cmd + K`: Clear output
- `Cmd + F`: Find in query
- `Cmd + G`: Find next

**Query Optimization:**
- Use EXPLAIN ANALYZE to understand query plans
- Enable query timing: `\timing on`
- Use TablePlus query profiler for bottleneck identification

### 7.2 Advanced Query Techniques

**Window Functions for Market Analysis:**
```sql
-- Moving averages and momentum indicators
SELECT 
    symbol,
    timestamp,
    price,
    AVG(price) OVER (
        PARTITION BY symbol 
        ORDER BY timestamp 
        ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) as ma_20,
    price - LAG(price, 1) OVER (
        PARTITION BY symbol 
        ORDER BY timestamp
    ) as price_change,
    ROW_NUMBER() OVER (
        PARTITION BY symbol 
        ORDER BY timestamp DESC
    ) as recency_rank
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '4 hours';
```

**JSON Aggregation for Complex Analysis:**
```sql
-- Aggregate coherence patterns by symbol
SELECT 
    symbol,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'timestamp', timestamp,
            'price', price,
            'coherence_scores', coherenceScores
        ) ORDER BY timestamp DESC
    ) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as recent_data,
    AVG((coherenceScores->>'psi')::float) as avg_psi,
    COUNT(*) as data_points
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '6 hours'
GROUP BY symbol
HAVING COUNT(*) > 100
ORDER BY avg_psi DESC;
```

### 7.3 Automated Workflows

**Create Custom Functions for Frequent Tasks:**
```sql
-- Create helper function for quick symbol analysis
CREATE OR REPLACE FUNCTION quick_symbol_analysis(p_symbol TEXT)
RETURNS TABLE(
    current_price FLOAT,
    price_change_1h FLOAT,
    coherence_score FLOAT,
    data_quality_score INT
) AS $$
BEGIN
    RETURN QUERY
    WITH symbol_data AS (
        SELECT 
            price,
            timestamp,
            (coherenceScores->>'psi')::float * 0.3 + 
            (coherenceScores->>'rho')::float * 0.3 + 
            (coherenceScores->>'q')::float * 0.2 + 
            (coherenceScores->>'f')::float * 0.2 as coherence
        FROM "MarketData"
        WHERE symbol = p_symbol
          AND timestamp > NOW() - INTERVAL '2 hours'
        ORDER BY timestamp DESC
    )
    SELECT 
        (ARRAY_AGG(price))[1] as current_price,
        ((ARRAY_AGG(price))[1] - (ARRAY_AGG(price))[60]) as price_change_1h,
        AVG(coherence) as coherence_score,
        LEAST(100, COUNT(*) * 2) as data_quality_score  -- Max 100, based on data point count
    FROM symbol_data;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM quick_symbol_analysis('AAPL');
```

**Export and Reporting:**
```sql
-- Generate daily market report
WITH daily_summary AS (
    SELECT 
        symbol,
        COUNT(*) as data_points,
        MIN(price) as low_price,
        MAX(price) as high_price,
        AVG(price) as avg_price,
        AVG((coherenceScores->>'psi')::float) as avg_coherence,
        STDDEV(price) as volatility
    FROM "MarketData"
    WHERE DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY symbol
)
SELECT 
    CURRENT_DATE - INTERVAL '1 day' as report_date,
    COUNT(*) as active_symbols,
    SUM(data_points) as total_data_points,
    ROUND(AVG(volatility)::numeric, 4) as avg_market_volatility,
    ROUND(AVG(avg_coherence)::numeric, 3) as avg_market_coherence
FROM daily_summary;
```

### 7.4 Integration Tips

**Connecting External Tools:**
- **Export Connection String:** For use with Python/R/other tools
- **JDBC URL Format:** `jdbc:postgresql://localhost:5432/trader_ai`
- **Python psycopg2:** `postgresql://trader_ai_user:trader_ai_password_2024@localhost:5432/trader_ai`

**API Integration Queries:**
```sql
-- Format data for API consumption
SELECT 
    JSON_BUILD_OBJECT(
        'symbol', symbol,
        'timestamp', EXTRACT(EPOCH FROM timestamp),
        'price', price,
        'volume', volume,
        'coherence', JSON_BUILD_OBJECT(
            'psi', (coherenceScores->>'psi')::float,
            'rho', (coherenceScores->>'rho')::float,
            'q', (coherenceScores->>'q')::float,
            'f', (coherenceScores->>'f')::float
        )
    ) as api_response
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## Quick Reference Commands

### Daily Workflow Checklist
1. **Morning Setup** (9:00 AM):
   ```sql
   SELECT * FROM v_system_health_overview;
   SELECT * FROM v_realtime_market_snapshot LIMIT 10;
   ```

2. **Hourly Monitoring**:
   ```sql
   SELECT COUNT(*) FROM "Alert" WHERE NOT acknowledged;
   SELECT * FROM check_market_data_quality();
   ```

3. **End of Day** (5:00 PM):
   ```sql
   SELECT run_all_alert_checks();
   SELECT automated_cleanup();
   ```

### Emergency Procedures
- **Kill Runaway Query:** Find PID in TablePlus activity monitor, then `SELECT pg_terminate_backend(PID);`
- **Check System Load:** `SELECT * FROM v_performance_bottlenecks;`
- **Database Size Check:** `SELECT pg_size_pretty(pg_database_size('trader_ai'));`

---

This comprehensive guide provides everything needed to effectively use TablePlus with the TraderAI PostgreSQL database. Bookmark this document and refer to it regularly as you develop your database analysis workflow.