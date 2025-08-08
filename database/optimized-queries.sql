-- TraderAI Optimized SQL Queries and Views
-- PostgreSQL-specific optimizations for high-performance market analysis
-- Created: 2025-08-08

-- ============================================================================
-- 1. REAL-TIME MARKET DATA AGGREGATION QUERIES
-- ============================================================================

-- 1.1 Real-time market snapshot with coherence scores
CREATE OR REPLACE VIEW v_realtime_market_snapshot AS
WITH latest_data AS (
    SELECT DISTINCT ON (symbol) 
        symbol,
        timestamp,
        price,
        volume,
        coherenceScores,
        sentiment,
        -- Extract individual coherence scores
        (coherenceScores->>'psi')::float as psi,
        (coherenceScores->>'rho')::float as rho,
        (coherenceScores->>'q')::float as q,
        (coherenceScores->>'f')::float as f
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY symbol, timestamp DESC
)
SELECT 
    ld.*,
    -- Calculate composite coherence score
    (ld.psi * 0.3 + ld.rho * 0.3 + ld.q * 0.2 + ld.f * 0.2) as composite_coherence,
    -- Price change from 5 minutes ago
    ld.price - lag5.price as price_change_5m,
    (ld.price - lag5.price) / NULLIF(lag5.price, 0) * 100 as price_change_pct_5m
FROM latest_data ld
LEFT JOIN LATERAL (
    SELECT price 
    FROM "MarketData" m2 
    WHERE m2.symbol = ld.symbol 
      AND m2.timestamp <= NOW() - INTERVAL '5 minutes'
    ORDER BY timestamp DESC 
    LIMIT 1
) lag5 ON true;

-- 1.2 Time-weighted average price (TWAP) calculation
CREATE OR REPLACE FUNCTION calculate_twap(
    p_symbol VARCHAR,
    p_interval INTERVAL DEFAULT '1 hour'
) RETURNS TABLE (
    symbol VARCHAR,
    twap NUMERIC,
    vwap NUMERIC,
    total_volume BIGINT,
    data_points INT
) AS $$
BEGIN
    RETURN QUERY
    WITH time_series AS (
        SELECT 
            symbol,
            timestamp,
            price,
            volume,
            -- Calculate time between data points
            EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp))) as time_diff
        FROM "MarketData"
        WHERE symbol = p_symbol
          AND timestamp > NOW() - p_interval
    ),
    weighted_prices AS (
        SELECT 
            symbol,
            price * COALESCE(time_diff, 60) as time_weighted_price,
            price * volume as volume_weighted_price,
            COALESCE(time_diff, 60) as weight,
            volume
        FROM time_series
    )
    SELECT 
        p_symbol,
        ROUND(SUM(time_weighted_price) / NULLIF(SUM(weight), 0), 4) as twap,
        ROUND(SUM(volume_weighted_price)::numeric / NULLIF(SUM(volume), 0), 4) as vwap,
        SUM(volume) as total_volume,
        COUNT(*)::int as data_points
    FROM weighted_prices
    GROUP BY symbol;
END;
$$ LANGUAGE plpgsql;

-- 1.3 Market momentum indicator
CREATE MATERIALIZED VIEW mv_market_momentum AS
WITH price_changes AS (
    SELECT 
        symbol,
        timestamp,
        price,
        volume,
        -- Calculate various momentum indicators
        price - LAG(price, 1) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_1,
        price - LAG(price, 5) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_5,
        price - LAG(price, 10) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_10,
        AVG(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS BETWEEN 20 PRECEDING AND CURRENT ROW) as ma_20,
        AVG(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS BETWEEN 50 PRECEDING AND CURRENT ROW) as ma_50
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '24 hours'
)
SELECT 
    symbol,
    timestamp,
    price,
    volume,
    -- Momentum indicators
    price_change_1,
    price_change_5,
    price_change_10,
    ma_20,
    ma_50,
    -- RSI calculation (simplified)
    CASE 
        WHEN price_change_1 > 0 THEN price_change_1 
        ELSE 0 
    END as gain,
    CASE 
        WHEN price_change_1 < 0 THEN ABS(price_change_1)
        ELSE 0 
    END as loss,
    -- Moving average crossover signal
    CASE 
        WHEN ma_20 > ma_50 AND LAG(ma_20) OVER (PARTITION BY symbol ORDER BY timestamp) <= LAG(ma_50) OVER (PARTITION BY symbol ORDER BY timestamp) THEN 'GOLDEN_CROSS'
        WHEN ma_20 < ma_50 AND LAG(ma_20) OVER (PARTITION BY symbol ORDER BY timestamp) >= LAG(ma_50) OVER (PARTITION BY symbol ORDER BY timestamp) THEN 'DEATH_CROSS'
        ELSE 'NEUTRAL'
    END as ma_signal
FROM price_changes;

CREATE INDEX idx_mv_momentum_symbol_timestamp ON mv_market_momentum (symbol, timestamp DESC);

-- ============================================================================
-- 2. COHERENCE SCORE ANALYSIS QUERIES
-- ============================================================================

-- 2.1 Coherence pattern detection
CREATE OR REPLACE FUNCTION detect_coherence_patterns(
    p_symbol VARCHAR,
    p_lookback INTERVAL DEFAULT '1 hour'
) RETURNS TABLE (
    pattern_type VARCHAR,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    avg_psi FLOAT,
    avg_rho FLOAT,
    avg_q FLOAT,
    avg_f FLOAT,
    composite_score FLOAT,
    duration_minutes INT
) AS $$
BEGIN
    RETURN QUERY
    WITH coherence_data AS (
        SELECT 
            timestamp,
            (coherenceScores->>'psi')::float as psi,
            (coherenceScores->>'rho')::float as rho,
            (coherenceScores->>'q')::float as q,
            (coherenceScores->>'f')::float as f,
            (coherenceScores->>'psi')::float * 0.3 + 
            (coherenceScores->>'rho')::float * 0.3 + 
            (coherenceScores->>'q')::float * 0.2 + 
            (coherenceScores->>'f')::float * 0.2 as composite
        FROM "MarketData"
        WHERE symbol = p_symbol
          AND timestamp > NOW() - p_lookback
    ),
    pattern_detection AS (
        SELECT 
            timestamp,
            psi, rho, q, f, composite,
            -- Detect high coherence periods (> 0.7)
            CASE 
                WHEN composite > 0.7 THEN 'HIGH_COHERENCE'
                WHEN composite < 0.3 THEN 'LOW_COHERENCE'
                WHEN psi > 0.8 AND rho > 0.8 THEN 'PSI_RHO_SPIKE'
                WHEN q > 0.9 THEN 'QUANTUM_SPIKE'
                WHEN f > 0.85 THEN 'FLOW_SPIKE'
                ELSE 'NORMAL'
            END as pattern,
            -- Group consecutive patterns
            SUM(CASE 
                WHEN LAG(CASE 
                    WHEN composite > 0.7 THEN 'HIGH_COHERENCE'
                    WHEN composite < 0.3 THEN 'LOW_COHERENCE'
                    WHEN psi > 0.8 AND rho > 0.8 THEN 'PSI_RHO_SPIKE'
                    WHEN q > 0.9 THEN 'QUANTUM_SPIKE'
                    WHEN f > 0.85 THEN 'FLOW_SPIKE'
                    ELSE 'NORMAL'
                END) OVER (ORDER BY timestamp) != CASE 
                    WHEN composite > 0.7 THEN 'HIGH_COHERENCE'
                    WHEN composite < 0.3 THEN 'LOW_COHERENCE'
                    WHEN psi > 0.8 AND rho > 0.8 THEN 'PSI_RHO_SPIKE'
                    WHEN q > 0.9 THEN 'QUANTUM_SPIKE'
                    WHEN f > 0.85 THEN 'FLOW_SPIKE'
                    ELSE 'NORMAL'
                END THEN 1 ELSE 0 
            END) OVER (ORDER BY timestamp) as pattern_group
        FROM coherence_data
    )
    SELECT 
        pattern as pattern_type,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time,
        AVG(psi) as avg_psi,
        AVG(rho) as avg_rho,
        AVG(q) as avg_q,
        AVG(f) as avg_f,
        AVG(composite) as composite_score,
        EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as duration_minutes
    FROM pattern_detection
    WHERE pattern != 'NORMAL'
    GROUP BY pattern, pattern_group
    HAVING COUNT(*) > 2  -- Only patterns lasting more than 2 data points
    ORDER BY start_time DESC;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Coherence correlation matrix
CREATE OR REPLACE VIEW v_coherence_correlation AS
WITH coherence_pairs AS (
    SELECT 
        m1.symbol as symbol1,
        m2.symbol as symbol2,
        CORR((m1.coherenceScores->>'psi')::float, (m2.coherenceScores->>'psi')::float) as psi_corr,
        CORR((m1.coherenceScores->>'rho')::float, (m2.coherenceScores->>'rho')::float) as rho_corr,
        CORR((m1.coherenceScores->>'q')::float, (m2.coherenceScores->>'q')::float) as q_corr,
        CORR((m1.coherenceScores->>'f')::float, (m2.coherenceScores->>'f')::float) as f_corr,
        COUNT(*) as data_points
    FROM "MarketData" m1
    JOIN "MarketData" m2 ON m1.timestamp = m2.timestamp
    WHERE m1.symbol < m2.symbol  -- Avoid duplicates
      AND m1.timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY m1.symbol, m2.symbol
    HAVING COUNT(*) > 10  -- Minimum data points for correlation
)
SELECT 
    symbol1,
    symbol2,
    ROUND(psi_corr::numeric, 3) as psi_correlation,
    ROUND(rho_corr::numeric, 3) as rho_correlation,
    ROUND(q_corr::numeric, 3) as q_correlation,
    ROUND(f_corr::numeric, 3) as f_correlation,
    ROUND(((psi_corr + rho_corr + q_corr + f_corr) / 4)::numeric, 3) as avg_correlation,
    data_points
FROM coherence_pairs
WHERE ABS(psi_corr) > 0.5 
   OR ABS(rho_corr) > 0.5 
   OR ABS(q_corr) > 0.5 
   OR ABS(f_corr) > 0.5
ORDER BY ABS((psi_corr + rho_corr + q_corr + f_corr) / 4) DESC;

-- ============================================================================
-- 3. ALERT PATTERN DETECTION QUERIES
-- ============================================================================

-- 3.1 Alert frequency analysis
CREATE OR REPLACE VIEW v_alert_frequency_analysis AS
WITH alert_windows AS (
    SELECT 
        type,
        severity,
        symbol,
        date_trunc('hour', "createdAt") as hour,
        COUNT(*) as alert_count,
        COUNT(DISTINCT symbol) as unique_symbols,
        MIN("createdAt") as first_alert,
        MAX("createdAt") as last_alert
    FROM "Alert"
    WHERE "createdAt" > NOW() - INTERVAL '7 days'
    GROUP BY type, severity, symbol, date_trunc('hour', "createdAt")
),
alert_stats AS (
    SELECT 
        type,
        severity,
        AVG(alert_count) as avg_hourly_alerts,
        MAX(alert_count) as max_hourly_alerts,
        STDDEV(alert_count) as stddev_alerts
    FROM alert_windows
    GROUP BY type, severity
)
SELECT 
    aw.*,
    -- Calculate if current hour is anomalous
    CASE 
        WHEN aw.alert_count > (ast.avg_hourly_alerts + 2 * ast.stddev_alerts) THEN 'ANOMALY_HIGH'
        WHEN aw.alert_count < (ast.avg_hourly_alerts - 2 * ast.stddev_alerts) THEN 'ANOMALY_LOW'
        ELSE 'NORMAL'
    END as alert_pattern,
    ast.avg_hourly_alerts,
    ast.stddev_alerts
FROM alert_windows aw
JOIN alert_stats ast ON aw.type = ast.type AND aw.severity = ast.severity
ORDER BY hour DESC, alert_count DESC;

-- 3.2 Alert clustering for pattern detection
CREATE OR REPLACE FUNCTION detect_alert_clusters(
    p_time_window INTERVAL DEFAULT '1 hour',
    p_min_alerts INT DEFAULT 5
) RETURNS TABLE (
    cluster_id INT,
    alert_type "AlertType",
    severity "AlertSeverity",
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    alert_count INT,
    unique_symbols INT,
    avg_interval_seconds FLOAT,
    cluster_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH alert_sequence AS (
        SELECT 
            id,
            type,
            severity,
            symbol,
            "createdAt",
            -- Calculate time since previous alert of same type
            EXTRACT(EPOCH FROM ("createdAt" - LAG("createdAt") OVER (PARTITION BY type ORDER BY "createdAt"))) as seconds_since_last,
            -- Assign cluster when gap is larger than threshold
            SUM(CASE 
                WHEN EXTRACT(EPOCH FROM ("createdAt" - LAG("createdAt") OVER (PARTITION BY type ORDER BY "createdAt"))) > EXTRACT(EPOCH FROM p_time_window)
                  OR LAG("createdAt") OVER (PARTITION BY type ORDER BY "createdAt") IS NULL
                THEN 1 
                ELSE 0 
            END) OVER (PARTITION BY type ORDER BY "createdAt") as cluster_group
        FROM "Alert"
        WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY MIN("createdAt"))::int as cluster_id,
        type as alert_type,
        MODE() WITHIN GROUP (ORDER BY severity) as severity,
        MIN("createdAt") as start_time,
        MAX("createdAt") as end_time,
        COUNT(*)::int as alert_count,
        COUNT(DISTINCT symbol)::int as unique_symbols,
        AVG(seconds_since_last) FILTER (WHERE seconds_since_last IS NOT NULL) as avg_interval_seconds,
        CASE 
            WHEN COUNT(*) > 20 THEN 'Major alert cluster - possible system issue'
            WHEN COUNT(DISTINCT symbol) > 5 THEN 'Multi-symbol alert cluster'
            WHEN AVG(seconds_since_last) < 60 THEN 'Rapid-fire alert cluster'
            ELSE 'Standard alert cluster'
        END as cluster_description
    FROM alert_sequence
    GROUP BY type, cluster_group
    HAVING COUNT(*) >= p_min_alerts
    ORDER BY MIN("createdAt") DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- 4.1 System performance dashboard
CREATE OR REPLACE VIEW v_system_performance AS
WITH recent_health AS (
    SELECT 
        service,
        status,
        timestamp,
        metrics,
        -- Extract specific metrics from JSON
        (metrics->>'cpu_usage')::float as cpu_usage,
        (metrics->>'memory_usage')::float as memory_usage,
        (metrics->>'response_time_ms')::float as response_time_ms,
        (metrics->>'error_rate')::float as error_rate
    FROM "SystemHealth"
    WHERE timestamp > NOW() - INTERVAL '1 hour'
),
service_stats AS (
    SELECT 
        service,
        -- Current status
        (ARRAY_AGG(status ORDER BY timestamp DESC))[1] as current_status,
        -- Performance metrics
        AVG(cpu_usage) as avg_cpu,
        MAX(cpu_usage) as max_cpu,
        AVG(memory_usage) as avg_memory,
        MAX(memory_usage) as max_memory,
        AVG(response_time_ms) as avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
        AVG(error_rate) as avg_error_rate,
        -- Availability
        COUNT(*) FILTER (WHERE status = 'HEALTHY') * 100.0 / COUNT(*) as uptime_percentage,
        COUNT(*) as health_checks
    FROM recent_health
    GROUP BY service
)
SELECT 
    ss.*,
    -- Performance score (0-100)
    CASE 
        WHEN current_status != 'HEALTHY' THEN 0
        ELSE GREATEST(0, LEAST(100, 
            100 - (avg_cpu - 50) - (avg_memory - 70) - (avg_response_time / 10) - (avg_error_rate * 100)
        ))
    END as performance_score,
    -- Alert recommendations
    CASE 
        WHEN current_status != 'HEALTHY' THEN 'Service degraded - immediate attention required'
        WHEN avg_cpu > 80 THEN 'High CPU usage detected'
        WHEN avg_memory > 85 THEN 'High memory usage detected'
        WHEN p95_response_time > 1000 THEN 'High response times detected'
        WHEN avg_error_rate > 0.05 THEN 'Elevated error rate detected'
        ELSE 'Service operating normally'
    END as recommendation
FROM service_stats
ORDER BY 
    CASE current_status 
        WHEN 'UNHEALTHY' THEN 1
        WHEN 'DEGRADED' THEN 2
        WHEN 'OFFLINE' THEN 3
        ELSE 4
    END,
    performance_score;

-- 4.2 Query performance tracking
CREATE OR REPLACE FUNCTION track_query_performance()
RETURNS TABLE (
    query_pattern TEXT,
    avg_duration_ms FLOAT,
    max_duration_ms FLOAT,
    execution_count BIGINT,
    total_time_ms FLOAT,
    mean_rows FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Normalize query pattern
        regexp_replace(query, '\d+', 'N', 'g') as query_pattern,
        ROUND(mean_exec_time::numeric, 2) as avg_duration_ms,
        ROUND(max_exec_time::numeric, 2) as max_duration_ms,
        calls as execution_count,
        ROUND(total_exec_time::numeric, 2) as total_time_ms,
        mean_rows
    FROM pg_stat_statements
    WHERE query LIKE '%MarketData%' 
       OR query LIKE '%Inference%'
       OR query LIKE '%Alert%'
    ORDER BY total_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. USER ACTIVITY AND INFERENCE TRACKING QUERIES
-- ============================================================================

-- 5.1 User inference analytics
CREATE OR REPLACE VIEW v_user_inference_analytics AS
WITH user_stats AS (
    SELECT 
        u.id as user_id,
        u.username,
        u.role,
        COUNT(DISTINCT i.id) as total_inferences,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'COMPLETED') as completed_inferences,
        COUNT(DISTINCT i.id) FILTER (WHERE i."selectedOption" IS NOT NULL) as inferences_with_selection,
        AVG(i.confidence) FILTER (WHERE i.confidence IS NOT NULL) as avg_confidence,
        COUNT(DISTINCT v.id) as total_verifications,
        COUNT(DISTINCT d.id) as debates_created
    FROM "User" u
    LEFT JOIN "Inference" i ON u.id = i."userId"
    LEFT JOIN "Verification" v ON u.id = v."userId"
    LEFT JOIN "Debate" d ON i.id = d."inferenceId"
    WHERE u."createdAt" > NOW() - INTERVAL '30 days'
    GROUP BY u.id, u.username, u.role
),
selection_patterns AS (
    SELECT 
        "userId",
        "selectedOption",
        COUNT(*) as selection_count
    FROM "Inference"
    WHERE "selectedOption" IS NOT NULL
    GROUP BY "userId", "selectedOption"
),
user_preferences AS (
    SELECT 
        "userId",
        MODE() WITHIN GROUP (ORDER BY "selectedOption") as preferred_option,
        JSONB_OBJECT_AGG("selectedOption", selection_count) as option_distribution
    FROM selection_patterns
    GROUP BY "userId"
)
SELECT 
    us.*,
    up.preferred_option,
    up.option_distribution,
    -- Calculate engagement score
    (
        us.total_inferences * 0.3 + 
        us.completed_inferences * 0.3 + 
        us.total_verifications * 0.2 + 
        us.debates_created * 0.2
    ) as engagement_score,
    -- User classification
    CASE 
        WHEN us.total_inferences > 50 AND us.avg_confidence > 0.7 THEN 'Power User'
        WHEN us.total_inferences > 20 THEN 'Active User'
        WHEN us.total_inferences > 5 THEN 'Regular User'
        ELSE 'New User'
    END as user_classification
FROM user_stats us
LEFT JOIN user_preferences up ON us.user_id = up."userId"
ORDER BY engagement_score DESC;

-- 5.2 Inference quality metrics
CREATE OR REPLACE VIEW v_inference_quality_metrics AS
WITH inference_metrics AS (
    SELECT 
        i.id,
        i."userId",
        i.query,
        i."selectedOption",
        i.confidence,
        i.status,
        i."createdAt",
        -- Calculate verification agreement rate
        COUNT(v.id) as verification_count,
        SUM(CASE WHEN v."selectedOption" = i."selectedOption" THEN 1 ELSE 0 END) as agreements,
        AVG(v.confidence) as avg_verification_confidence,
        -- Debate outcome
        d.winner as debate_winner,
        d.confidence as debate_confidence
    FROM "Inference" i
    LEFT JOIN "Verification" v ON i.id = v."inferenceId"
    LEFT JOIN "Debate" d ON i.id = d."inferenceId"
    WHERE i.status = 'COMPLETED'
    GROUP BY i.id, i."userId", i.query, i."selectedOption", i.confidence, i.status, i."createdAt", d.winner, d.confidence
),
quality_scores AS (
    SELECT 
        *,
        -- Calculate quality score based on multiple factors
        CASE 
            WHEN verification_count = 0 THEN confidence
            ELSE (
                (agreements::float / verification_count) * 0.4 +  -- Agreement rate
                confidence * 0.3 +                                  -- Original confidence
                avg_verification_confidence * 0.3                   -- Verification confidence
            )
        END as quality_score,
        -- Consensus indicator
        CASE 
            WHEN verification_count >= 3 AND agreements::float / verification_count > 0.8 THEN 'STRONG_CONSENSUS'
            WHEN verification_count >= 2 AND agreements::float / verification_count > 0.6 THEN 'MODERATE_CONSENSUS'
            WHEN verification_count > 0 AND agreements::float / verification_count < 0.4 THEN 'DISAGREEMENT'
            ELSE 'INSUFFICIENT_DATA'
        END as consensus_level
    FROM inference_metrics
)
SELECT 
    id,
    "userId",
    query,
    "selectedOption",
    confidence,
    verification_count,
    agreements,
    ROUND((agreements::float / NULLIF(verification_count, 0) * 100)::numeric, 1) as agreement_rate_pct,
    avg_verification_confidence,
    debate_winner,
    debate_confidence,
    ROUND(quality_score::numeric, 3) as quality_score,
    consensus_level,
    "createdAt"
FROM quality_scores
ORDER BY quality_score DESC;

-- ============================================================================
-- 6. OPTIMIZATION INDEXES
-- ============================================================================

-- Create partial indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_marketdata_high_volume 
ON "MarketData" (symbol, timestamp) 
WHERE volume > 1000000;

CREATE INDEX IF NOT EXISTS idx_alert_unacknowledged 
ON "Alert" (severity, "createdAt") 
WHERE acknowledged = false;

CREATE INDEX IF NOT EXISTS idx_inference_pending 
ON "Inference" (status, "createdAt") 
WHERE status = 'PENDING';

-- Create indexes for JSON fields
CREATE INDEX IF NOT EXISTS idx_marketdata_coherence_psi 
ON "MarketData" ((coherenceScores->>'psi'));

CREATE INDEX IF NOT EXISTS idx_marketdata_coherence_composite 
ON "MarketData" ((
    (coherenceScores->>'psi')::float * 0.3 + 
    (coherenceScores->>'rho')::float * 0.3 + 
    (coherenceScores->>'q')::float * 0.2 + 
    (coherenceScores->>'f')::float * 0.2
));

-- ============================================================================
-- 7. MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_momentum;
    -- Add other materialized views as needed
    
    -- Log the refresh
    INSERT INTO "SystemHealth" (service, status, message, metrics, timestamp)
    VALUES (
        'materialized_views',
        'HEALTHY',
        'Views refreshed successfully',
        jsonb_build_object(
            'refresh_time', NOW(),
            'views_refreshed', ARRAY['mv_market_momentum']
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to analyze and optimize tables
CREATE OR REPLACE FUNCTION optimize_tables()
RETURNS void AS $$
BEGIN
    -- Analyze tables for query planner
    ANALYZE "MarketData";
    ANALYZE "Inference";
    ANALYZE "Alert";
    ANALYZE "SystemHealth";
    ANALYZE "User";
    ANALYZE "Verification";
    ANALYZE "Debate";
    
    -- Vacuum tables to reclaim space
    VACUUM (ANALYZE) "MarketData";
    VACUUM (ANALYZE) "Alert";
    VACUUM (ANALYZE) "SystemHealth";
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic maintenance (requires pg_cron extension)
-- SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_all_views();');
-- SELECT cron.schedule('optimize-tables', '0 3 * * *', 'SELECT optimize_tables();');