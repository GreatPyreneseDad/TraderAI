# TablePlus Workflow Guide for TraderAI

## 1. Connection Setup

### Primary Connection
- **Name**: TraderAI Production
- **Host**: localhost
- **Port**: 5432
- **User**: trader_ai_user
- **Password**: trader_ai_password_2024
- **Database**: trader_ai
- **Color**: Green (for production)

### Development Connection
- **Name**: TraderAI Dev
- **Same settings as above**
- **Color**: Yellow (for development)

## 2. Saved Queries

Save these queries in TablePlus for quick access:

### Market Overview
```sql
-- Real-time market overview
SELECT 
    symbol,
    MAX(timestamp) as latest_update,
    MAX(price) as current_price,
    AVG((coherenceScores->>'psi')::float) as avg_psi,
    AVG((coherenceScores->>'rho')::float) as avg_rho,
    COUNT(*) as data_points
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY symbol
ORDER BY symbol;
```

### Coherence Alerts
```sql
-- Find high coherence events
SELECT 
    symbol,
    timestamp,
    price,
    (coherenceScores->>'psi')::float as psi,
    (coherenceScores->>'rho')::float as rho,
    (coherenceScores->>'q')::float as q,
    (coherenceScores->>'f')::float as f
FROM "MarketData"
WHERE 
    (coherenceScores->>'psi')::float > 0.7 OR
    (coherenceScores->>'rho')::float > 0.7
ORDER BY timestamp DESC
LIMIT 50;
```

### System Health Check
```sql
-- System health dashboard
SELECT 
    service,
    status,
    MAX(timestamp) as last_update,
    COUNT(*) as status_count
FROM "SystemHealth"
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service, status
ORDER BY service;
```

### Data Quality Check
```sql
-- Check for data gaps
WITH time_series AS (
    SELECT 
        symbol,
        timestamp,
        LAG(timestamp) OVER (PARTITION BY symbol ORDER BY timestamp) as prev_timestamp,
        timestamp - LAG(timestamp) OVER (PARTITION BY symbol ORDER BY timestamp) as time_gap
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '24 hours'
)
SELECT 
    symbol,
    COUNT(*) as gap_count,
    MAX(time_gap) as max_gap,
    AVG(time_gap) as avg_gap
FROM time_series
WHERE time_gap > INTERVAL '5 minutes'
GROUP BY symbol;
```

## 3. Keyboard Shortcuts

- **Cmd + Enter**: Execute query
- **Cmd + S**: Save query
- **Cmd + Shift + D**: Duplicate current tab
- **Cmd + [**: Previous tab
- **Cmd + ]**: Next tab
- **Cmd + K**: Clear output

## 4. Export Templates

### Daily Report Export
1. Run the daily summary query
2. Export as CSV with headers
3. Save to: `/Users/chris/TraderAI/reports/daily/`
4. Naming: `traderai_daily_YYYY-MM-DD.csv`

### Alert Export
1. Filter alerts by severity
2. Export as JSON for API consumption
3. Include all columns

## 5. Monitoring Workflow

### Morning Check (9:00 AM)
1. Run System Health Check
2. Check for overnight anomalies
3. Verify data completeness

### Hourly Monitoring
1. Run Market Overview
2. Check Coherence Alerts
3. Monitor active debates

### End of Day (5:00 PM)
1. Export daily summary
2. Backup critical data
3. Run maintenance scripts

## 6. Troubleshooting Queries

### Connection Issues
```sql
-- Check active connections
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = 'trader_ai';
```

### Slow Queries
```sql
-- Find slow queries
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- queries taking more than 1 second
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Table Size
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 7. Quick Actions

### Refresh Materialized Views
```sql
SELECT refresh_all_materialized_views();
```

### Clear Old Alerts
```sql
-- Archive alerts older than 30 days
DELETE FROM "Alert"
WHERE createdAt < NOW() - INTERVAL '30 days'
  AND acknowledged = true;
```

### Vacuum and Analyze
```sql
VACUUM ANALYZE "MarketData";
VACUUM ANALYZE "Alert";
VACUUM ANALYZE "SystemHealth";
```