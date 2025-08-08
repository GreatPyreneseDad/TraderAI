-- PostgreSQL Performance Configuration for TraderAI
-- Optimized for time-series market data and real-time analytics
-- Created: 2025-08-08

-- ============================================================================
-- 1. CONNECTION AND MEMORY CONFIGURATION
-- ============================================================================

-- Set these in postgresql.conf or via ALTER SYSTEM

-- Connection settings
-- max_connections = 200                    -- Adjust based on concurrent users
-- superuser_reserved_connections = 3      -- Reserve connections for admin

-- Memory settings (adjust based on available RAM)
-- shared_buffers = '4GB'                  -- 25% of total RAM
-- effective_cache_size = '12GB'           -- 75% of total RAM  
-- work_mem = '256MB'                      -- Per-query working memory
-- maintenance_work_mem = '1GB'            -- For VACUUM, CREATE INDEX, etc.
-- wal_buffers = '64MB'                    -- WAL buffer size
-- random_page_cost = 1.1                  -- For SSDs
-- effective_io_concurrency = 200          -- For SSDs

-- ============================================================================
-- 2. TIME-SERIES OPTIMIZATIONS
-- ============================================================================

-- Enable TimescaleDB extension for better time-series performance
-- (Install TimescaleDB first: https://docs.timescale.com/install/)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert MarketData to hypertable for better time-series performance
-- SELECT create_hypertable('MarketData', 'timestamp', 
--   chunk_time_interval => INTERVAL '1 day',
--   create_default_indexes => FALSE
-- );

-- ============================================================================
-- 3. CUSTOM AGGREGATE FUNCTIONS FOR COHERENCE ANALYSIS
-- ============================================================================

-- Create custom aggregate for coherence score calculation
CREATE OR REPLACE FUNCTION coherence_state_func(
    state FLOAT[],
    psi FLOAT,
    rho FLOAT,
    q FLOAT,
    f FLOAT
) RETURNS FLOAT[] AS $$
BEGIN
    -- State array: [sum_psi, sum_rho, sum_q, sum_f, count]
    IF state IS NULL THEN
        RETURN ARRAY[COALESCE(psi, 0), COALESCE(rho, 0), COALESCE(q, 0), COALESCE(f, 0), 1];
    ELSE
        RETURN ARRAY[
            state[1] + COALESCE(psi, 0),
            state[2] + COALESCE(rho, 0), 
            state[3] + COALESCE(q, 0),
            state[4] + COALESCE(f, 0),
            state[5] + 1
        ];
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION coherence_final_func(state FLOAT[])
RETURNS FLOAT AS $$
BEGIN
    IF state IS NULL OR state[5] = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate weighted average: psi*0.3 + rho*0.3 + q*0.2 + f*0.2
    RETURN (
        (state[1] / state[5]) * 0.3 +
        (state[2] / state[5]) * 0.3 +
        (state[3] / state[5]) * 0.2 +
        (state[4] / state[5]) * 0.2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE AGGREGATE avg_coherence_score(FLOAT, FLOAT, FLOAT, FLOAT) (
    SFUNC = coherence_state_func,
    STYPE = FLOAT[],
    FINALFUNC = coherence_final_func,
    INITCOND = NULL
);

-- ============================================================================
-- 4. ADVANCED INDEXING STRATEGIES
-- ============================================================================

-- Create expression indexes for common calculations
CREATE INDEX IF NOT EXISTS idx_marketdata_composite_coherence
ON "MarketData" ((
    (coherenceScores->>'psi')::float * 0.3 + 
    (coherenceScores->>'rho')::float * 0.3 + 
    (coherenceScores->>'q')::float * 0.2 + 
    (coherenceScores->>'f')::float * 0.2
));

-- Price change calculation index
CREATE INDEX IF NOT EXISTS idx_marketdata_price_volatility
ON "MarketData" (symbol, timestamp, 
    ((price - LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp)) / NULLIF(LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp), 0))
);

-- BRIN indexes for time-series data (more space efficient)
CREATE INDEX IF NOT EXISTS idx_marketdata_timestamp_brin
ON "MarketData" USING brin (timestamp);

-- ============================================================================
-- 5. STORED PROCEDURES FOR HIGH-PERFORMANCE OPERATIONS
-- ============================================================================

-- Bulk market data insertion with conflict resolution
CREATE OR REPLACE FUNCTION bulk_insert_market_data(
    market_data JSONB[]
) RETURNS INT AS $$
DECLARE
    inserted_count INT := 0;
    data_row JSONB;
BEGIN
    FOREACH data_row IN ARRAY market_data LOOP
        INSERT INTO "MarketData" (
            symbol, 
            timestamp, 
            price, 
            volume, 
            "coherenceScores", 
            sentiment
        )
        VALUES (
            data_row->>'symbol',
            (data_row->>'timestamp')::timestamptz,
            (data_row->>'price')::float,
            (data_row->>'volume')::bigint,
            data_row->'coherenceScores',
            (data_row->>'sentiment')::float
        )
        ON CONFLICT (symbol, timestamp) DO UPDATE SET
            price = EXCLUDED.price,
            volume = EXCLUDED.volume,
            "coherenceScores" = EXCLUDED."coherenceScores",
            sentiment = EXCLUDED.sentiment;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Real-time coherence anomaly detection
CREATE OR REPLACE FUNCTION detect_coherence_anomalies(
    p_symbol VARCHAR,
    p_threshold FLOAT DEFAULT 2.0
) RETURNS TABLE (
    timestamp TIMESTAMPTZ,
    symbol VARCHAR,
    psi_anomaly BOOLEAN,
    rho_anomaly BOOLEAN,
    q_anomaly BOOLEAN,
    f_anomaly BOOLEAN,
    anomaly_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH rolling_stats AS (
        SELECT 
            m.timestamp,
            m.symbol,
            (m.coherenceScores->>'psi')::float as psi,
            (m.coherenceScores->>'rho')::float as rho,
            (m.coherenceScores->>'q')::float as q,
            (m.coherenceScores->>'f')::float as f,
            -- Calculate rolling statistics
            AVG((m.coherenceScores->>'psi')::float) OVER w as psi_mean,
            STDDEV((m.coherenceScores->>'psi')::float) OVER w as psi_std,
            AVG((m.coherenceScores->>'rho')::float) OVER w as rho_mean,
            STDDEV((m.coherenceScores->>'rho')::float) OVER w as rho_std,
            AVG((m.coherenceScores->>'q')::float) OVER w as q_mean,
            STDDEV((m.coherenceScores->>'q')::float) OVER w as q_std,
            AVG((m.coherenceScores->>'f')::float) OVER w as f_mean,
            STDDEV((m.coherenceScores->>'f')::float) OVER w as f_std
        FROM "MarketData" m
        WHERE m.symbol = p_symbol 
          AND m.timestamp > NOW() - INTERVAL '2 hours'
        WINDOW w AS (
            PARTITION BY m.symbol 
            ORDER BY m.timestamp 
            ROWS BETWEEN 50 PRECEDING AND 1 PRECEDING
        )
    )
    SELECT 
        rs.timestamp,
        rs.symbol,
        ABS((rs.psi - rs.psi_mean) / NULLIF(rs.psi_std, 0)) > p_threshold as psi_anomaly,
        ABS((rs.rho - rs.rho_mean) / NULLIF(rs.rho_std, 0)) > p_threshold as rho_anomaly,
        ABS((rs.q - rs.q_mean) / NULLIF(rs.q_std, 0)) > p_threshold as q_anomaly,
        ABS((rs.f - rs.f_mean) / NULLIF(rs.f_std, 0)) > p_threshold as f_anomaly,
        (
            ABS((rs.psi - rs.psi_mean) / NULLIF(rs.psi_std, 0)) +
            ABS((rs.rho - rs.rho_mean) / NULLIF(rs.rho_std, 0)) +
            ABS((rs.q - rs.q_mean) / NULLIF(rs.q_std, 0)) +
            ABS((rs.f - rs.f_mean) / NULLIF(rs.f_std, 0))
        ) / 4.0 as anomaly_score
    FROM rolling_stats rs
    WHERE rs.timestamp > NOW() - INTERVAL '10 minutes'
      AND (
        ABS((rs.psi - rs.psi_mean) / NULLIF(rs.psi_std, 0)) > p_threshold OR
        ABS((rs.rho - rs.rho_mean) / NULLIF(rs.rho_std, 0)) > p_threshold OR
        ABS((rs.q - rs.q_mean) / NULLIF(rs.q_std, 0)) > p_threshold OR
        ABS((rs.f - rs.f_mean) / NULLIF(rs.f_std, 0)) > p_threshold
      )
    ORDER BY rs.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CACHING STRATEGIES
-- ============================================================================

-- Create a cached view for frequently accessed market summaries
CREATE MATERIALIZED VIEW mv_market_summary_cache AS
SELECT 
    symbol,
    NOW() as cache_time,
    -- Current price info
    (SELECT price FROM "MarketData" m1 
     WHERE m1.symbol = m.symbol 
     ORDER BY timestamp DESC LIMIT 1) as current_price,
    
    -- Price changes
    (SELECT 
        (current.price - prev.price) / prev.price * 100
     FROM (SELECT price FROM "MarketData" 
           WHERE symbol = m.symbol 
           ORDER BY timestamp DESC LIMIT 1) current,
          (SELECT price FROM "MarketData" 
           WHERE symbol = m.symbol 
             AND timestamp <= NOW() - INTERVAL '24 hours'
           ORDER BY timestamp DESC LIMIT 1) prev
    ) as price_change_24h_pct,
    
    -- Volume info
    (SELECT SUM(volume) FROM "MarketData" 
     WHERE symbol = m.symbol 
       AND timestamp > NOW() - INTERVAL '24 hours'
    ) as volume_24h,
    
    -- Coherence summary
    (SELECT avg_coherence_score(
        (coherenceScores->>'psi')::float,
        (coherenceScores->>'rho')::float, 
        (coherenceScores->>'q')::float,
        (coherenceScores->>'f')::float
     ) FROM "MarketData" 
     WHERE symbol = m.symbol 
       AND timestamp > NOW() - INTERVAL '1 hour'
    ) as coherence_1h,
    
    -- Alert count
    (SELECT COUNT(*) FROM "Alert" 
     WHERE symbol = m.symbol 
       AND "createdAt" > NOW() - INTERVAL '24 hours'
       AND acknowledged = false
    ) as active_alerts
FROM (SELECT DISTINCT symbol FROM "MarketData") m;

CREATE UNIQUE INDEX idx_mv_market_summary_symbol ON mv_market_summary_cache (symbol);

-- ============================================================================
-- 7. QUERY OPTIMIZATION HINTS
-- ============================================================================

-- Function to get query execution plan and suggestions
CREATE OR REPLACE FUNCTION analyze_query_performance(query_text TEXT)
RETURNS TABLE (
    execution_plan TEXT,
    performance_suggestions TEXT[]
) AS $$
DECLARE
    plan_output TEXT;
    suggestions TEXT[] := '{}';
BEGIN
    -- Get execution plan
    EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' || query_text INTO plan_output;
    
    -- Basic performance suggestions based on common patterns
    IF query_text ILIKE '%ORDER BY timestamp%' AND query_text NOT ILIKE '%LIMIT%' THEN
        suggestions := array_append(suggestions, 'Consider adding LIMIT clause for timestamp ordering');
    END IF;
    
    IF query_text ILIKE '%coherenceScores%' AND query_text NOT ILIKE '%GIN%' THEN
        suggestions := array_append(suggestions, 'Consider using GIN index for JSON operations');
    END IF;
    
    IF query_text ILIKE '%GROUP BY%' AND query_text ILIKE '%timestamp%' THEN
        suggestions := array_append(suggestions, 'Consider using date_trunc() for time-based grouping');
    END IF;
    
    RETURN QUERY SELECT plan_output, suggestions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. AUTOMATED MAINTENANCE PROCEDURES
-- ============================================================================

-- Automated table maintenance function
CREATE OR REPLACE FUNCTION automated_maintenance()
RETURNS void AS $$
DECLARE
    table_sizes RECORD;
BEGIN
    -- Update table statistics
    ANALYZE "MarketData";
    ANALYZE "Alert";
    ANALYZE "Inference";
    ANALYZE "SystemHealth";
    
    -- Refresh materialized views if they're stale
    IF (SELECT cache_time < NOW() - INTERVAL '15 minutes' 
        FROM mv_market_summary_cache LIMIT 1) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_summary_cache;
    END IF;
    
    -- Clean up old alerts (keep last 30 days)
    DELETE FROM "Alert" 
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
    
    -- Clean up old system health records (keep last 7 days)
    DELETE FROM "SystemHealth" 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    -- Vacuum tables if they've grown significantly
    FOR table_sizes IN 
        SELECT schemaname, tablename, n_dead_tup, n_live_tup
        FROM pg_stat_user_tables
        WHERE n_dead_tup > n_live_tup * 0.1  -- More than 10% dead tuples
    LOOP
        EXECUTE format('VACUUM (ANALYZE) %I.%I', table_sizes.schemaname, table_sizes.tablename);
    END LOOP;
    
    -- Log maintenance completion
    INSERT INTO "SystemHealth" (service, status, message, timestamp)
    VALUES ('maintenance', 'HEALTHY', 'Automated maintenance completed', NOW());
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CONNECTION POOLING OPTIMIZATION
-- ============================================================================

-- Function to monitor connection usage
CREATE OR REPLACE FUNCTION monitor_connections()
RETURNS TABLE (
    total_connections INT,
    active_connections INT,
    idle_connections INT,
    idle_in_transaction INT,
    max_connections_setting INT,
    usage_percentage FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::int as total_connections,
        COUNT(*) FILTER (WHERE state = 'active')::int as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::int as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction')::int as idle_in_transaction,
        current_setting('max_connections')::int as max_connections_setting,
        (COUNT(*)::float / current_setting('max_connections')::float * 100) as usage_percentage
    FROM pg_stat_activity
    WHERE pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Real-time query performance view
CREATE OR REPLACE VIEW v_query_performance_realtime AS
SELECT 
    query,
    calls,
    total_exec_time / 1000 as total_time_seconds,
    mean_exec_time as avg_time_ms,
    max_exec_time as max_time_ms,
    stddev_exec_time as stddev_time_ms,
    (total_exec_time / sum(total_exec_time) OVER()) * 100 as pct_total_time,
    rows / calls as avg_rows_per_call
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
  AND query NOT LIKE '%information_schema%'
ORDER BY total_exec_time DESC;

-- Database size and growth monitoring
CREATE OR REPLACE VIEW v_database_size_monitoring AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as dead_tuple_pct
FROM pg_stat_user_tables t
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Real-time coherence anomaly detection
-- SELECT * FROM detect_coherence_anomalies('AAPL', 2.5);

-- Example 2: Bulk insert market data
-- SELECT bulk_insert_market_data(ARRAY[
--     '{"symbol": "AAPL", "timestamp": "2025-08-08T10:00:00Z", "price": 150.5, "volume": 1000000, "coherenceScores": {"psi": 0.8, "rho": 0.7, "q": 0.6, "f": 0.9}, "sentiment": 0.2}'::jsonb
-- ]);

-- Example 3: Performance monitoring
-- SELECT * FROM v_query_performance_realtime LIMIT 10;

-- Example 4: Connection monitoring  
-- SELECT * FROM monitor_connections();

-- Example 5: Run maintenance
-- SELECT automated_maintenance();