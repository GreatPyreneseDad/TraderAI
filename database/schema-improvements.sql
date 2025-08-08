-- TraderAI Database Schema Improvements
-- Enhanced indexes, materialized views, and optimization strategies

-- 1. Additional Indexes for Performance
-- =====================================

-- Composite index for time-series queries
CREATE INDEX idx_market_data_symbol_timestamp_desc 
ON "MarketData" (symbol, timestamp DESC);

-- Partial index for high coherence scores
CREATE INDEX idx_market_data_high_coherence 
ON "MarketData" (symbol, timestamp)
WHERE (coherenceScores->>'psi')::float > 0.7 
   OR (coherenceScores->>'rho')::float > 0.7;

-- Index for sentiment analysis
CREATE INDEX idx_market_data_sentiment 
ON "MarketData" (sentiment) 
WHERE sentiment IS NOT NULL;

-- Index for volume analysis
CREATE INDEX idx_market_data_volume 
ON "MarketData" (symbol, volume);

-- 2. Materialized Views for Common Queries
-- ========================================

-- Hourly aggregated market data
CREATE MATERIALIZED VIEW mv_market_data_hourly AS
SELECT 
    symbol,
    date_trunc('hour', timestamp) as hour,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    SUM(volume) as total_volume,
    AVG((coherenceScores->>'psi')::float) as avg_psi,
    AVG((coherenceScores->>'rho')::float) as avg_rho,
    AVG((coherenceScores->>'q')::float) as avg_q,
    AVG((coherenceScores->>'f')::float) as avg_f,
    AVG(sentiment) as avg_sentiment,
    COUNT(*) as data_points
FROM "MarketData"
GROUP BY symbol, date_trunc('hour', timestamp);

CREATE INDEX idx_mv_hourly_symbol_hour 
ON mv_market_data_hourly (symbol, hour DESC);

-- Daily summary view
CREATE MATERIALIZED VIEW mv_market_daily_summary AS
SELECT 
    symbol,
    date_trunc('day', timestamp) as day,
    -- Price metrics
    MIN(price) as open_price,
    MAX(price) as high_price,
    MIN(price) as low_price,
    -- Assuming latest price as close (needs proper implementation)
    (SELECT price FROM "MarketData" m2 
     WHERE m2.symbol = m1.symbol 
       AND date_trunc('day', m2.timestamp) = date_trunc('day', m1.timestamp)
     ORDER BY timestamp DESC LIMIT 1) as close_price,
    -- Volume
    SUM(volume) as daily_volume,
    -- Coherence averages
    AVG((coherenceScores->>'psi')::float) as avg_psi,
    AVG((coherenceScores->>'rho')::float) as avg_rho,
    AVG((coherenceScores->>'q')::float) as avg_q,
    AVG((coherenceScores->>'f')::float) as avg_f,
    -- Coherence volatility
    STDDEV((coherenceScores->>'psi')::float) as psi_volatility,
    -- Sentiment
    AVG(sentiment) as avg_sentiment,
    MIN(sentiment) as min_sentiment,
    MAX(sentiment) as max_sentiment
FROM "MarketData" m1
GROUP BY symbol, date_trunc('day', timestamp);

CREATE INDEX idx_mv_daily_symbol_day 
ON mv_market_daily_summary (symbol, day DESC);

-- Coherence anomaly detection view
CREATE MATERIALIZED VIEW mv_coherence_anomalies AS
SELECT 
    id,
    symbol,
    timestamp,
    price,
    volume,
    coherenceScores,
    sentiment,
    -- Calculate z-scores for anomaly detection
    ((coherenceScores->>'psi')::float - avg_psi) / NULLIF(stddev_psi, 0) as psi_zscore,
    ((coherenceScores->>'rho')::float - avg_rho) / NULLIF(stddev_rho, 0) as rho_zscore,
    ((coherenceScores->>'q')::float - avg_q) / NULLIF(stddev_q, 0) as q_zscore,
    ((coherenceScores->>'f')::float - avg_f) / NULLIF(stddev_f, 0) as f_zscore
FROM "MarketData"
JOIN (
    SELECT 
        symbol,
        AVG((coherenceScores->>'psi')::float) as avg_psi,
        STDDEV((coherenceScores->>'psi')::float) as stddev_psi,
        AVG((coherenceScores->>'rho')::float) as avg_rho,
        STDDEV((coherenceScores->>'rho')::float) as stddev_rho,
        AVG((coherenceScores->>'q')::float) as avg_q,
        STDDEV((coherenceScores->>'q')::float) as stddev_q,
        AVG((coherenceScores->>'f')::float) as avg_f,
        STDDEV((coherenceScores->>'f')::float) as stddev_f
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '30 days'
    GROUP BY symbol
) stats USING (symbol)
WHERE 
    ABS(((coherenceScores->>'psi')::float - avg_psi) / NULLIF(stddev_psi, 0)) > 2 OR
    ABS(((coherenceScores->>'rho')::float - avg_rho) / NULLIF(stddev_rho, 0)) > 2 OR
    ABS(((coherenceScores->>'q')::float - avg_q) / NULLIF(stddev_q, 0)) > 2 OR
    ABS(((coherenceScores->>'f')::float - avg_f) / NULLIF(stddev_f, 0)) > 2;

-- 3. Helper Functions
-- ===================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_data_hourly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coherence_anomalies;
END;
$$ LANGUAGE plpgsql;

-- Function to get coherence trend
CREATE OR REPLACE FUNCTION get_coherence_trend(
    p_symbol VARCHAR,
    p_metric VARCHAR,
    p_period INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE(
    timestamp TIMESTAMPTZ,
    value FLOAT,
    moving_avg FLOAT,
    trend VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH coherence_data AS (
        SELECT 
            m.timestamp,
            (m.coherenceScores->>p_metric)::float as value,
            AVG((m.coherenceScores->>p_metric)::float) OVER (
                ORDER BY m.timestamp 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as moving_avg
        FROM "MarketData" m
        WHERE m.symbol = p_symbol
          AND m.timestamp > NOW() - p_period
    )
    SELECT 
        cd.timestamp,
        cd.value,
        cd.moving_avg,
        CASE 
            WHEN cd.value > LAG(cd.value) OVER (ORDER BY cd.timestamp) THEN 'up'
            WHEN cd.value < LAG(cd.value) OVER (ORDER BY cd.timestamp) THEN 'down'
            ELSE 'stable'
        END as trend
    FROM coherence_data cd
    ORDER BY cd.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Partitioning for Large Data
-- ==============================

-- Create partitioned table for historical data (if needed)
-- This is for future scalability when you have millions of records

-- Example: Partition by month
/*
CREATE TABLE "MarketData_partitioned" (
    LIKE "MarketData" INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create partitions for each month
CREATE TABLE "MarketData_2025_01" PARTITION OF "MarketData_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
CREATE TABLE "MarketData_2025_02" PARTITION OF "MarketData_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for other months...
*/

-- 5. Scheduled Maintenance
-- =======================

-- Create a maintenance schedule using pg_cron (if available)
-- Otherwise, use external scheduler

-- Schedule view refresh every hour
-- SELECT cron.schedule('refresh-views', '0 * * * *', 'SELECT refresh_all_materialized_views();');

-- Schedule VACUUM ANALYZE daily
-- SELECT cron.schedule('vacuum-analyze', '0 2 * * *', 'VACUUM ANALYZE;');