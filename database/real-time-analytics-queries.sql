-- TraderAI Real-Time Analytics Queries
-- Optimized for dashboard and live market analysis
-- Created: 2025-08-08

-- ============================================================================
-- 1. DASHBOARD SUMMARY QUERIES
-- ============================================================================

-- 1.1 Market overview snapshot (for main dashboard)
WITH market_snapshot AS (
    SELECT DISTINCT ON (symbol)
        symbol,
        timestamp,
        price,
        volume,
        coherenceScores,
        sentiment,
        (coherenceScores->>'psi')::float as psi,
        (coherenceScores->>'rho')::float as rho,
        (coherenceScores->>'q')::float as q,
        (coherenceScores->>'f')::float as f
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY symbol, timestamp DESC
),
price_changes AS (
    SELECT 
        ms.symbol,
        ms.price as current_price,
        ms.psi, ms.rho, ms.q, ms.f,
        ms.sentiment,
        -- Price changes
        COALESCE(h1.price, ms.price) as price_1h_ago,
        COALESCE(h24.price, ms.price) as price_24h_ago,
        -- Calculate percentage changes
        ROUND(((ms.price - COALESCE(h1.price, ms.price)) / NULLIF(COALESCE(h1.price, ms.price), 0) * 100)::numeric, 2) as change_1h_pct,
        ROUND(((ms.price - COALESCE(h24.price, ms.price)) / NULLIF(COALESCE(h24.price, ms.price), 0) * 100)::numeric, 2) as change_24h_pct
    FROM market_snapshot ms
    LEFT JOIN LATERAL (
        SELECT price FROM "MarketData" m1
        WHERE m1.symbol = ms.symbol 
          AND m1.timestamp <= NOW() - INTERVAL '1 hour'
        ORDER BY m1.timestamp DESC LIMIT 1
    ) h1 ON true
    LEFT JOIN LATERAL (
        SELECT price FROM "MarketData" m24
        WHERE m24.symbol = ms.symbol 
          AND m24.timestamp <= NOW() - INTERVAL '24 hours'
        ORDER BY m24.timestamp DESC LIMIT 1
    ) h24 ON true
)
SELECT 
    symbol,
    current_price,
    change_1h_pct,
    change_24h_pct,
    -- Composite coherence score
    ROUND((psi * 0.3 + rho * 0.3 + q * 0.2 + f * 0.2)::numeric, 3) as coherence_score,
    psi, rho, q, f,
    sentiment,
    -- Trend indicators
    CASE 
        WHEN change_1h_pct > 2 THEN 'STRONG_UP'
        WHEN change_1h_pct > 0.5 THEN 'UP'
        WHEN change_1h_pct < -2 THEN 'STRONG_DOWN'
        WHEN change_1h_pct < -0.5 THEN 'DOWN'
        ELSE 'STABLE'
    END as trend_1h,
    -- Risk indicator based on coherence
    CASE 
        WHEN (psi * 0.3 + rho * 0.3 + q * 0.2 + f * 0.2) > 0.8 THEN 'HIGH_COHERENCE'
        WHEN (psi * 0.3 + rho * 0.3 + q * 0.2 + f * 0.2) < 0.3 THEN 'LOW_COHERENCE'
        ELSE 'NORMAL'
    END as coherence_status
FROM price_changes
ORDER BY ABS(change_1h_pct) DESC;

-- ============================================================================
-- 2. REAL-TIME ALERT QUERIES
-- ============================================================================

-- 2.1 Active alerts with priority scoring
WITH alert_context AS (
    SELECT 
        a.*,
        -- Get related market data if symbol exists
        CASE WHEN a.symbol IS NOT NULL THEN
            (SELECT JSONB_BUILD_OBJECT(
                'current_price', m.price,
                'volume', m.volume,
                'coherence_psi', (m.coherenceScores->>'psi')::float,
                'coherence_rho', (m.coherenceScores->>'rho')::float,
                'sentiment', m.sentiment
            ) FROM "MarketData" m 
            WHERE m.symbol = a.symbol 
            ORDER BY m.timestamp DESC LIMIT 1)
        ELSE NULL END as market_context,
        -- Calculate time since created
        EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / 60 as minutes_old
    FROM "Alert" a
    WHERE NOT a.acknowledged
),
alert_priority AS (
    SELECT 
        *,
        -- Calculate priority score (0-100)
        CASE a.severity
            WHEN 'CRITICAL' THEN 90
            WHEN 'HIGH' THEN 70
            WHEN 'MEDIUM' THEN 50
            WHEN 'LOW' THEN 30
        END +
        -- Boost score for recent alerts
        CASE 
            WHEN minutes_old < 5 THEN 10
            WHEN minutes_old < 15 THEN 5
            ELSE 0
        END +
        -- Boost score for coherence-related alerts
        CASE WHEN type = 'COHERENCE_SPIKE' THEN 5 ELSE 0 END as priority_score
    FROM alert_context a
)
SELECT 
    id,
    type,
    severity,
    symbol,
    title,
    message,
    data,
    market_context,
    "createdAt",
    ROUND(minutes_old::numeric, 1) as minutes_old,
    priority_score,
    -- Actionable recommendations
    CASE 
        WHEN type = 'COHERENCE_SPIKE' AND severity = 'CRITICAL' THEN 'Monitor for potential market anomaly'
        WHEN type = 'MARKET_ANOMALY' THEN 'Review trading algorithms and risk parameters'
        WHEN type = 'SYSTEM_ERROR' THEN 'Check system logs and service health'
        WHEN type = 'API_LIMIT' THEN 'Implement rate limiting or upgrade API plan'
        ELSE 'Review alert details and take appropriate action'
    END as recommendation
FROM alert_priority
ORDER BY priority_score DESC, "createdAt" DESC
LIMIT 50;

-- ============================================================================
-- 3. COHERENCE ANALYSIS QUERIES
-- ============================================================================

-- 3.1 Real-time coherence heatmap data
SELECT 
    symbol,
    date_trunc('minute', timestamp) as minute,
    AVG((coherenceScores->>'psi')::float) as avg_psi,
    AVG((coherenceScores->>'rho')::float) as avg_rho,
    AVG((coherenceScores->>'q')::float) as avg_q,
    AVG((coherenceScores->>'f')::float) as avg_f,
    -- Coherence volatility indicators
    STDDEV((coherenceScores->>'psi')::float) as psi_volatility,
    STDDEV((coherenceScores->>'rho')::float) as rho_volatility,
    COUNT(*) as data_points
FROM "MarketData"
WHERE timestamp > NOW() - INTERVAL '2 hours'
  AND symbol IN ('AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ')
GROUP BY symbol, date_trunc('minute', timestamp)
ORDER BY symbol, minute DESC;

-- 3.2 Coherence divergence detection
WITH coherence_baseline AS (
    SELECT 
        symbol,
        AVG((coherenceScores->>'psi')::float) as baseline_psi,
        AVG((coherenceScores->>'rho')::float) as baseline_rho,
        AVG((coherenceScores->>'q')::float) as baseline_q,
        AVG((coherenceScores->>'f')::float) as baseline_f,
        STDDEV((coherenceScores->>'psi')::float) as stddev_psi,
        STDDEV((coherenceScores->>'rho')::float) as stddev_rho,
        STDDEV((coherenceScores->>'q')::float) as stddev_q,
        STDDEV((coherenceScores->>'f')::float) as stddev_f
    FROM "MarketData"
    WHERE timestamp BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '2 hours'
    GROUP BY symbol
),
recent_coherence AS (
    SELECT DISTINCT ON (symbol)
        symbol,
        timestamp,
        (coherenceScores->>'psi')::float as current_psi,
        (coherenceScores->>'rho')::float as current_rho,
        (coherenceScores->>'q')::float as current_q,
        (coherenceScores->>'f')::float as current_f
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY symbol, timestamp DESC
)
SELECT 
    rc.symbol,
    rc.timestamp,
    -- Current values
    rc.current_psi,
    rc.current_rho,
    rc.current_q,
    rc.current_f,
    -- Baselines
    ROUND(cb.baseline_psi::numeric, 3) as baseline_psi,
    ROUND(cb.baseline_rho::numeric, 3) as baseline_rho,
    ROUND(cb.baseline_q::numeric, 3) as baseline_q,
    ROUND(cb.baseline_f::numeric, 3) as baseline_f,
    -- Divergence scores (z-scores)
    ROUND(((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0))::numeric, 2) as psi_zscore,
    ROUND(((rc.current_rho - cb.baseline_rho) / NULLIF(cb.stddev_rho, 0))::numeric, 2) as rho_zscore,
    ROUND(((rc.current_q - cb.baseline_q) / NULLIF(cb.stddev_q, 0))::numeric, 2) as q_zscore,
    ROUND(((rc.current_f - cb.baseline_f) / NULLIF(cb.stddev_f, 0))::numeric, 2) as f_zscore,
    -- Overall divergence magnitude
    ROUND((
        ABS((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0)) +
        ABS((rc.current_rho - cb.baseline_rho) / NULLIF(cb.stddev_rho, 0)) +
        ABS((rc.current_q - cb.baseline_q) / NULLIF(cb.stddev_q, 0)) +
        ABS((rc.current_f - cb.baseline_f) / NULLIF(cb.stddev_f, 0))
    )::numeric / 4, 2) as avg_divergence
FROM recent_coherence rc
JOIN coherence_baseline cb ON rc.symbol = cb.symbol
WHERE 
    ABS((rc.current_psi - cb.baseline_psi) / NULLIF(cb.stddev_psi, 0)) > 1.5 OR
    ABS((rc.current_rho - cb.baseline_rho) / NULLIF(cb.stddev_rho, 0)) > 1.5 OR
    ABS((rc.current_q - cb.baseline_q) / NULLIF(cb.stddev_q, 0)) > 1.5 OR
    ABS((rc.current_f - cb.baseline_f) / NULLIF(cb.stddev_f, 0)) > 1.5
ORDER BY avg_divergence DESC;

-- ============================================================================
-- 4. TRADING SIGNAL QUERIES
-- ============================================================================

-- 4.1 Momentum-based trading signals
WITH price_momentum AS (
    SELECT 
        symbol,
        timestamp,
        price,
        volume,
        (coherenceScores->>'psi')::float as psi,
        (coherenceScores->>'rho')::float as rho,
        -- Price momentum indicators
        price - LAG(price, 1) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_1,
        price - LAG(price, 5) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_5,
        price - LAG(price, 20) OVER (PARTITION BY symbol ORDER BY timestamp) as price_change_20,
        -- Moving averages
        AVG(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) as ma_10,
        AVG(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as ma_20,
        -- Volume indicators
        AVG(volume) OVER (PARTITION BY symbol ORDER BY timestamp ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) as avg_volume_10
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '4 hours'
),
signal_calculation AS (
    SELECT 
        symbol,
        timestamp,
        price,
        volume,
        psi,
        rho,
        ma_10,
        ma_20,
        -- Signal strength calculations
        CASE 
            WHEN price > ma_10 AND ma_10 > ma_20 AND volume > avg_volume_10 * 1.5 THEN 'BUY'
            WHEN price < ma_10 AND ma_10 < ma_20 AND volume > avg_volume_10 * 1.5 THEN 'SELL'
            ELSE 'HOLD'
        END as momentum_signal,
        -- Coherence-based confidence
        (psi * 0.4 + rho * 0.6) as coherence_confidence,
        -- Price change metrics
        COALESCE(price_change_1 / NULLIF(price - price_change_1, 0) * 100, 0) as pct_change_1,
        COALESCE(price_change_5 / NULLIF(price - price_change_5, 0) * 100, 0) as pct_change_5,
        COALESCE(price_change_20 / NULLIF(price - price_change_20, 0) * 100, 0) as pct_change_20
    FROM price_momentum
    WHERE timestamp > NOW() - INTERVAL '30 minutes'
),
latest_signals AS (
    SELECT DISTINCT ON (symbol)
        *,
        -- Overall signal strength (0-100)
        CASE 
            WHEN momentum_signal = 'BUY' THEN 
                LEAST(100, 50 + (coherence_confidence * 30) + (GREATEST(0, pct_change_5) * 2))
            WHEN momentum_signal = 'SELL' THEN 
                LEAST(100, 50 + (coherence_confidence * 30) + (ABS(LEAST(0, pct_change_5)) * 2))
            ELSE 25 + (coherence_confidence * 25)
        END as signal_strength
    FROM signal_calculation
    ORDER BY symbol, timestamp DESC
)
SELECT 
    symbol,
    timestamp,
    price,
    momentum_signal,
    ROUND(signal_strength::numeric, 0) as signal_strength,
    ROUND(coherence_confidence::numeric, 3) as coherence_confidence,
    ROUND(pct_change_1::numeric, 2) as change_1_tick_pct,
    ROUND(pct_change_5::numeric, 2) as change_5_tick_pct,
    ROUND(pct_change_20::numeric, 2) as change_20_tick_pct,
    -- Risk assessment
    CASE 
        WHEN coherence_confidence < 0.3 THEN 'HIGH_RISK'
        WHEN coherence_confidence < 0.6 THEN 'MEDIUM_RISK'
        ELSE 'LOW_RISK'
    END as risk_level,
    -- Action recommendation
    CASE 
        WHEN momentum_signal = 'BUY' AND signal_strength > 70 THEN 'STRONG_BUY'
        WHEN momentum_signal = 'BUY' AND signal_strength > 60 THEN 'BUY'
        WHEN momentum_signal = 'SELL' AND signal_strength > 70 THEN 'STRONG_SELL'
        WHEN momentum_signal = 'SELL' AND signal_strength > 60 THEN 'SELL'
        ELSE 'HOLD'
    END as action_recommendation
FROM latest_signals
WHERE momentum_signal != 'HOLD' OR coherence_confidence > 0.7
ORDER BY signal_strength DESC;

-- ============================================================================
-- 5. SYSTEM HEALTH MONITORING
-- ============================================================================

-- 5.1 Real-time system health dashboard
WITH service_health AS (
    SELECT DISTINCT ON (service)
        service,
        status,
        message,
        timestamp,
        metrics,
        -- Extract key metrics
        (metrics->>'response_time_ms')::float as response_time,
        (metrics->>'cpu_usage')::float as cpu_usage,
        (metrics->>'memory_usage')::float as memory_usage,
        (metrics->>'error_rate')::float as error_rate,
        -- Calculate uptime
        EXTRACT(EPOCH FROM (NOW() - timestamp)) / 60 as minutes_since_update
    FROM "SystemHealth"
    ORDER BY service, timestamp DESC
),
service_aggregates AS (
    SELECT 
        service,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour' AND status = 'HEALTHY') as healthy_count_1h,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as total_count_1h,
        AVG(response_time) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as avg_response_time_1h,
        MAX(response_time) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as max_response_time_1h
    FROM "SystemHealth"
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY service
)
SELECT 
    sh.service,
    sh.status,
    sh.message,
    sh.timestamp,
    ROUND(sh.minutes_since_update::numeric, 1) as minutes_since_update,
    -- Current metrics
    ROUND(sh.response_time::numeric, 2) as current_response_time_ms,
    ROUND(sh.cpu_usage::numeric, 1) as current_cpu_pct,
    ROUND(sh.memory_usage::numeric, 1) as current_memory_pct,
    ROUND(COALESCE(sh.error_rate, 0)::numeric, 4) as current_error_rate,
    -- Aggregated metrics
    ROUND((sa.healthy_count_1h::float / NULLIF(sa.total_count_1h, 0) * 100)::numeric, 1) as uptime_1h_pct,
    ROUND(sa.avg_response_time_1h::numeric, 2) as avg_response_time_1h_ms,
    ROUND(sa.max_response_time_1h::numeric, 2) as max_response_time_1h_ms,
    -- Health score (0-100)
    CASE 
        WHEN sh.status = 'OFFLINE' THEN 0
        WHEN sh.status = 'UNHEALTHY' THEN 25
        WHEN sh.status = 'DEGRADED' THEN 50
        ELSE GREATEST(0, LEAST(100, 
            100 
            - (CASE WHEN sh.response_time > 1000 THEN 20 ELSE 0 END)
            - (CASE WHEN sh.cpu_usage > 80 THEN 15 ELSE 0 END)
            - (CASE WHEN sh.memory_usage > 90 THEN 15 ELSE 0 END)
            - (CASE WHEN sh.error_rate > 0.05 THEN 20 ELSE 0 END)
            - (CASE WHEN sh.minutes_since_update > 5 THEN 10 ELSE 0 END)
        ))
    END as health_score,
    -- Alert conditions
    ARRAY_REMOVE(ARRAY[
        CASE WHEN sh.response_time > 2000 THEN 'HIGH_LATENCY' END,
        CASE WHEN sh.cpu_usage > 85 THEN 'HIGH_CPU' END,
        CASE WHEN sh.memory_usage > 90 THEN 'HIGH_MEMORY' END,
        CASE WHEN sh.error_rate > 0.10 THEN 'HIGH_ERROR_RATE' END,
        CASE WHEN sh.minutes_since_update > 10 THEN 'STALE_DATA' END
    ], NULL) as alerts
FROM service_health sh
LEFT JOIN service_aggregates sa ON sh.service = sa.service
ORDER BY 
    CASE sh.status 
        WHEN 'OFFLINE' THEN 1
        WHEN 'UNHEALTHY' THEN 2  
        WHEN 'DEGRADED' THEN 3
        ELSE 4
    END,
    sh.service;

-- ============================================================================
-- 6. USER ACTIVITY ANALYTICS
-- ============================================================================

-- 6.1 Real-time user engagement metrics
WITH recent_activity AS (
    SELECT 
        u.id as user_id,
        u.username,
        u.role,
        -- Recent inferences
        COUNT(DISTINCT i.id) FILTER (WHERE i."createdAt" > NOW() - INTERVAL '1 hour') as inferences_1h,
        COUNT(DISTINCT i.id) FILTER (WHERE i."createdAt" > NOW() - INTERVAL '24 hours') as inferences_24h,
        -- Recent verifications
        COUNT(DISTINCT v.id) FILTER (WHERE v."createdAt" > NOW() - INTERVAL '1 hour') as verifications_1h,
        COUNT(DISTINCT v.id) FILTER (WHERE v."createdAt" > NOW() - INTERVAL '24 hours') as verifications_24h,
        -- Average confidence
        AVG(i.confidence) FILTER (WHERE i."createdAt" > NOW() - INTERVAL '24 hours') as avg_confidence_24h,
        -- Last activity
        GREATEST(
            COALESCE(MAX(i."createdAt"), '1900-01-01'::timestamp),
            COALESCE(MAX(v."createdAt"), '1900-01-01'::timestamp)
        ) as last_activity
    FROM "User" u
    LEFT JOIN "Inference" i ON u.id = i."userId"
    LEFT JOIN "Verification" v ON u.id = v."userId"
    GROUP BY u.id, u.username, u.role
),
user_classifications AS (
    SELECT 
        *,
        EXTRACT(EPOCH FROM (NOW() - last_activity)) / 3600 as hours_since_activity,
        -- Calculate engagement score
        (inferences_24h * 0.4 + verifications_24h * 0.3 + COALESCE(avg_confidence_24h, 0) * 0.3) as engagement_score,
        -- User status
        CASE 
            WHEN EXTRACT(EPOCH FROM (NOW() - last_activity)) < 3600 THEN 'ACTIVE'
            WHEN EXTRACT(EPOCH FROM (NOW() - last_activity)) < 86400 THEN 'RECENT'
            WHEN EXTRACT(EPOCH FROM (NOW() - last_activity)) < 604800 THEN 'INACTIVE'
            ELSE 'DORMANT'
        END as activity_status
    FROM recent_activity
)
SELECT 
    username,
    role,
    inferences_1h,
    inferences_24h,
    verifications_1h,
    verifications_24h,
    ROUND(COALESCE(avg_confidence_24h, 0)::numeric, 3) as avg_confidence_24h,
    ROUND(engagement_score::numeric, 2) as engagement_score,
    activity_status,
    ROUND(hours_since_activity::numeric, 1) as hours_since_activity,
    last_activity,
    -- User tier based on engagement
    CASE 
        WHEN engagement_score > 20 THEN 'POWER_USER'
        WHEN engagement_score > 10 THEN 'ACTIVE_USER'
        WHEN engagement_score > 3 THEN 'REGULAR_USER'
        ELSE 'CASUAL_USER'
    END as user_tier
FROM user_classifications
WHERE activity_status != 'DORMANT'
ORDER BY engagement_score DESC;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
Query Performance Guidelines:

1. Real-time queries should complete in < 100ms
2. Dashboard queries should complete in < 500ms  
3. Analytics queries can take up to 2 seconds
4. Use LIMIT clauses for large result sets
5. Index on frequently filtered columns
6. Use materialized views for expensive aggregations
7. Consider partitioning for time-series data

Recommended Indexes:
- CREATE INDEX idx_marketdata_symbol_timestamp_desc ON "MarketData" (symbol, timestamp DESC);
- CREATE INDEX idx_alert_severity_created ON "Alert" (severity, "createdAt") WHERE NOT acknowledged;
- CREATE INDEX idx_inference_status_created ON "Inference" (status, "createdAt");
- CREATE INDEX idx_systemhealth_service_timestamp ON "SystemHealth" (service, timestamp DESC);

Memory Considerations:
- Use DISTINCT ON instead of GROUP BY when possible
- Limit time ranges for aggregations
- Use streaming for large exports
- Monitor query execution plans regularly
*/