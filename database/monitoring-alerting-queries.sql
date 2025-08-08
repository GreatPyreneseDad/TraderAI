-- TraderAI Monitoring and Alerting Queries
-- Automated detection of system anomalies and performance issues
-- Created: 2025-08-08

-- ============================================================================
-- 1. AUTOMATED ALERT GENERATION FUNCTIONS
-- ============================================================================

-- 1.1 Function to generate coherence spike alerts
CREATE OR REPLACE FUNCTION generate_coherence_alerts()
RETURNS INT AS $$
DECLARE
    alert_count INT := 0;
    coherence_record RECORD;
BEGIN
    -- Detect coherence spikes in the last 5 minutes
    FOR coherence_record IN
        WITH coherence_analysis AS (
            SELECT 
                symbol,
                timestamp,
                price,
                (coherenceScores->>'psi')::float as psi,
                (coherenceScores->>'rho')::float as rho,
                (coherenceScores->>'q')::float as q,
                (coherenceScores->>'f')::float as f,
                -- Calculate rolling averages for baseline
                AVG((coherenceScores->>'psi')::float) OVER (
                    PARTITION BY symbol 
                    ORDER BY timestamp 
                    ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
                ) as psi_baseline,
                STDDEV((coherenceScores->>'psi')::float) OVER (
                    PARTITION BY symbol 
                    ORDER BY timestamp 
                    ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
                ) as psi_stddev
            FROM "MarketData"
            WHERE timestamp > NOW() - INTERVAL '1 hour'
        )
        SELECT 
            symbol,
            timestamp,
            price,
            psi,
            psi_baseline,
            psi_stddev,
            -- Calculate z-score
            (psi - psi_baseline) / NULLIF(psi_stddev, 0) as psi_zscore
        FROM coherence_analysis
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
          AND ABS((psi - psi_baseline) / NULLIF(psi_stddev, 0)) > 3.0  -- 3 sigma threshold
          AND psi_baseline IS NOT NULL
    LOOP
        -- Check if similar alert already exists in last 10 minutes
        IF NOT EXISTS (
            SELECT 1 FROM "Alert" 
            WHERE type = 'COHERENCE_SPIKE' 
              AND symbol = coherence_record.symbol
              AND "createdAt" > NOW() - INTERVAL '10 minutes'
        ) THEN
            INSERT INTO "Alert" (
                type,
                severity,
                symbol,
                title,
                message,
                data,
                "createdAt"
            ) VALUES (
                'COHERENCE_SPIKE',
                CASE 
                    WHEN ABS(coherence_record.psi_zscore) > 4 THEN 'CRITICAL'
                    WHEN ABS(coherence_record.psi_zscore) > 3.5 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END,
                coherence_record.symbol,
                'Coherence Anomaly Detected',
                format('Unusual coherence pattern detected for %s. PSI z-score: %s', 
                       coherence_record.symbol, 
                       ROUND(coherence_record.psi_zscore::numeric, 2)),
                jsonb_build_object(
                    'symbol', coherence_record.symbol,
                    'timestamp', coherence_record.timestamp,
                    'price', coherence_record.price,
                    'psi_current', coherence_record.psi,
                    'psi_baseline', coherence_record.psi_baseline,
                    'psi_zscore', coherence_record.psi_zscore,
                    'alert_type', 'coherence_spike'
                ),
                NOW()
            );
            alert_count := alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- 1.2 Function to detect market anomalies
CREATE OR REPLACE FUNCTION generate_market_anomaly_alerts()
RETURNS INT AS $$
DECLARE
    alert_count INT := 0;
    anomaly_record RECORD;
BEGIN
    -- Detect unusual price movements with volume confirmation
    FOR anomaly_record IN
        WITH market_analysis AS (
            SELECT 
                symbol,
                timestamp,
                price,
                volume,
                -- Price change from previous tick
                (price - LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp)) / 
                NULLIF(LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp), 0) * 100 as price_change_pct,
                -- Volume comparison to recent average
                volume / NULLIF(AVG(volume) OVER (
                    PARTITION BY symbol 
                    ORDER BY timestamp 
                    ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
                ), 0) as volume_ratio
            FROM "MarketData"
            WHERE timestamp > NOW() - INTERVAL '30 minutes'
        )
        SELECT 
            symbol,
            timestamp,
            price,
            volume,
            price_change_pct,
            volume_ratio
        FROM market_analysis
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
          AND (
            -- Large price movement with high volume
            (ABS(price_change_pct) > 5 AND volume_ratio > 2) OR
            -- Extreme price movement regardless of volume
            ABS(price_change_pct) > 10
          )
    LOOP
        -- Check if similar alert exists
        IF NOT EXISTS (
            SELECT 1 FROM "Alert" 
            WHERE type = 'MARKET_ANOMALY' 
              AND symbol = anomaly_record.symbol
              AND "createdAt" > NOW() - INTERVAL '15 minutes'
        ) THEN
            INSERT INTO "Alert" (
                type,
                severity,
                symbol,
                title,
                message,
                data,
                "createdAt"
            ) VALUES (
                'MARKET_ANOMALY',
                CASE 
                    WHEN ABS(anomaly_record.price_change_pct) > 10 THEN 'CRITICAL'
                    WHEN ABS(anomaly_record.price_change_pct) > 7 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END,
                anomaly_record.symbol,
                'Market Anomaly Detected',
                format('Unusual market movement for %s: %s%% price change with %sx volume', 
                       anomaly_record.symbol,
                       ROUND(anomaly_record.price_change_pct::numeric, 2),
                       ROUND(anomaly_record.volume_ratio::numeric, 1)),
                jsonb_build_object(
                    'symbol', anomaly_record.symbol,
                    'timestamp', anomaly_record.timestamp,
                    'price', anomaly_record.price,
                    'volume', anomaly_record.volume,
                    'price_change_pct', anomaly_record.price_change_pct,
                    'volume_ratio', anomaly_record.volume_ratio,
                    'alert_type', 'market_anomaly'
                ),
                NOW()
            );
            alert_count := alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- 1.3 Function to monitor system health and generate alerts
CREATE OR REPLACE FUNCTION generate_system_health_alerts()
RETURNS INT AS $$
DECLARE
    alert_count INT := 0;
    health_record RECORD;
BEGIN
    -- Check for system health issues
    FOR health_record IN
        WITH health_analysis AS (
            SELECT DISTINCT ON (service)
                service,
                status,
                timestamp,
                metrics,
                (metrics->>'response_time_ms')::float as response_time,
                (metrics->>'cpu_usage')::float as cpu_usage,
                (metrics->>'memory_usage')::float as memory_usage,
                (metrics->>'error_rate')::float as error_rate,
                EXTRACT(EPOCH FROM (NOW() - timestamp)) / 60 as minutes_since_update
            FROM "SystemHealth"
            ORDER BY service, timestamp DESC
        )
        SELECT *
        FROM health_analysis
        WHERE 
            status != 'HEALTHY' OR
            response_time > 2000 OR
            cpu_usage > 90 OR
            memory_usage > 95 OR
            error_rate > 0.1 OR
            minutes_since_update > 10
    LOOP
        -- Check if similar alert exists
        IF NOT EXISTS (
            SELECT 1 FROM "Alert" 
            WHERE type = 'SYSTEM_ERROR' 
              AND data->>'service' = health_record.service
              AND "createdAt" > NOW() - INTERVAL '30 minutes'
        ) THEN
            INSERT INTO "Alert" (
                type,
                severity,
                symbol,
                title,
                message,
                data,
                "createdAt"
            ) VALUES (
                'SYSTEM_ERROR',
                CASE 
                    WHEN health_record.status = 'OFFLINE' OR health_record.minutes_since_update > 30 THEN 'CRITICAL'
                    WHEN health_record.status = 'UNHEALTHY' OR health_record.cpu_usage > 95 OR health_record.memory_usage > 98 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END,
                NULL,
                format('System Health Issue: %s', health_record.service),
                format('Service %s health issue: Status=%s, CPU=%s%%, Memory=%s%%, Response=%sms', 
                       health_record.service,
                       health_record.status,
                       COALESCE(ROUND(health_record.cpu_usage::numeric, 1), 0),
                       COALESCE(ROUND(health_record.memory_usage::numeric, 1), 0),
                       COALESCE(ROUND(health_record.response_time::numeric, 0), 0)),
                jsonb_build_object(
                    'service', health_record.service,
                    'status', health_record.status,
                    'timestamp', health_record.timestamp,
                    'response_time', health_record.response_time,
                    'cpu_usage', health_record.cpu_usage,
                    'memory_usage', health_record.memory_usage,
                    'error_rate', health_record.error_rate,
                    'minutes_since_update', health_record.minutes_since_update,
                    'alert_type', 'system_health'
                ),
                NOW()
            );
            alert_count := alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. COMPREHENSIVE MONITORING DASHBOARD QUERIES
-- ============================================================================

-- 2.1 System-wide health overview
CREATE OR REPLACE VIEW v_system_health_overview AS
WITH service_stats AS (
    SELECT DISTINCT ON (service)
        service,
        status,
        timestamp,
        metrics,
        EXTRACT(EPOCH FROM (NOW() - timestamp)) / 60 as minutes_since_update
    FROM "SystemHealth"
    ORDER BY service, timestamp DESC
),
alert_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND NOT acknowledged) as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'HIGH' AND NOT acknowledged) as high_alerts,
        COUNT(*) FILTER (WHERE severity IN ('MEDIUM', 'LOW') AND NOT acknowledged) as other_alerts,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '1 hour') as alerts_last_hour
    FROM "Alert"
),
market_stats AS (
    SELECT 
        COUNT(DISTINCT symbol) as active_symbols,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '5 minutes') as recent_data_points,
        AVG((coherenceScores->>'psi')::float) as avg_psi,
        AVG((coherenceScores->>'rho')::float) as avg_rho
    FROM "MarketData"
    WHERE timestamp > NOW() - INTERVAL '1 hour'
),
user_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '1 hour') as active_users_1h,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as active_users_24h
    FROM "User" u
    WHERE EXISTS (
        SELECT 1 FROM "Inference" i 
        WHERE i."userId" = u.id 
          AND i."createdAt" > NOW() - INTERVAL '24 hours'
    )
)
SELECT 
    NOW() as report_time,
    -- Service health summary
    (SELECT COUNT(*) FROM service_stats WHERE status = 'HEALTHY') as healthy_services,
    (SELECT COUNT(*) FROM service_stats WHERE status != 'HEALTHY') as unhealthy_services,
    (SELECT COUNT(*) FROM service_stats WHERE minutes_since_update > 5) as stale_services,
    -- Alert summary
    as_data.critical_alerts,
    as_data.high_alerts,
    as_data.other_alerts,
    as_data.alerts_last_hour,
    -- Market data summary
    ms_data.active_symbols,
    ms_data.recent_data_points,
    ROUND(ms_data.avg_psi::numeric, 3) as avg_coherence_psi,
    ROUND(ms_data.avg_rho::numeric, 3) as avg_coherence_rho,
    -- User activity summary
    us_data.active_users_1h,
    us_data.active_users_24h,
    -- Overall system health score (0-100)
    GREATEST(0, LEAST(100, 
        100 
        - (as_data.critical_alerts * 25)
        - (as_data.high_alerts * 10)
        - ((SELECT COUNT(*) FROM service_stats WHERE status != 'HEALTHY') * 15)
        - (CASE WHEN ms_data.recent_data_points = 0 THEN 30 ELSE 0 END)
    )) as overall_health_score
FROM alert_stats as_data, market_stats ms_data, user_stats us_data;

-- 2.2 Performance bottleneck detection
CREATE OR REPLACE VIEW v_performance_bottlenecks AS
WITH query_performance AS (
    SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        -- Identify slow queries
        CASE 
            WHEN mean_exec_time > 1000 THEN 'SLOW'
            WHEN max_exec_time > 5000 THEN 'OCCASIONALLY_SLOW'
            WHEN total_exec_time > 60000 THEN 'HIGH_TOTAL_TIME'
            ELSE 'NORMAL'
        END as performance_issue
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_%'
      AND query NOT LIKE '%information_schema%'
      AND calls > 5
),
connection_stats AS (
    SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
    FROM pg_stat_activity
    WHERE pid != pg_backend_pid()
),
lock_stats AS (
    SELECT 
        COUNT(*) as lock_count,
        COUNT(DISTINCT relation) as locked_relations
    FROM pg_locks
    WHERE NOT granted
)
SELECT 
    'Query Performance' as category,
    COUNT(*) FILTER (WHERE qp.performance_issue != 'NORMAL') as issue_count,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'query', LEFT(qp.query, 100),
            'issue_type', qp.performance_issue,
            'avg_time_ms', ROUND(qp.mean_exec_time, 2),
            'max_time_ms', ROUND(qp.max_exec_time, 2),
            'calls', qp.calls
        )
    ) FILTER (WHERE qp.performance_issue != 'NORMAL') as details
FROM query_performance qp
GROUP BY 'Query Performance'

UNION ALL

SELECT 
    'Connections' as category,
    CASE 
        WHEN cs.total_connections > 150 THEN 1
        WHEN cs.idle_in_transaction > 10 THEN 1
        WHEN cs.longest_query_seconds > 300 THEN 1
        ELSE 0
    END as issue_count,
    JSON_BUILD_OBJECT(
        'total_connections', cs.total_connections,
        'active_connections', cs.active_connections,
        'idle_in_transaction', cs.idle_in_transaction,
        'longest_query_seconds', ROUND(cs.longest_query_seconds::numeric, 1)
    ) as details
FROM connection_stats cs

UNION ALL

SELECT 
    'Locks' as category,
    CASE WHEN ls.lock_count > 0 THEN 1 ELSE 0 END as issue_count,
    JSON_BUILD_OBJECT(
        'ungranted_locks', ls.lock_count,
        'locked_relations', ls.locked_relations
    ) as details
FROM lock_stats ls;

-- ============================================================================
-- 3. DATA QUALITY MONITORING
-- ============================================================================

-- 3.1 Market data quality checks
CREATE OR REPLACE FUNCTION check_market_data_quality()
RETURNS TABLE (
    check_type TEXT,
    status TEXT,
    issue_count INT,
    details JSONB
) AS $$
BEGIN
    -- Check for missing data points
    RETURN QUERY
    WITH data_gaps AS (
        SELECT 
            symbol,
            COUNT(*) as expected_points,
            COUNT(*) FILTER (WHERE price IS NOT NULL) as actual_points
        FROM generate_series(
            NOW() - INTERVAL '1 hour',
            NOW(),
            INTERVAL '1 minute'
        ) t(minute)
        CROSS JOIN (SELECT DISTINCT symbol FROM "MarketData" WHERE timestamp > NOW() - INTERVAL '2 hours') symbols
        LEFT JOIN "MarketData" m ON m.symbol = symbols.symbol 
            AND date_trunc('minute', m.timestamp) = t.minute
        GROUP BY symbol
        HAVING COUNT(*) FILTER (WHERE price IS NOT NULL) < COUNT(*) * 0.8  -- Less than 80% data coverage
    )
    SELECT 
        'Missing Data'::text,
        CASE WHEN COUNT(*) > 0 THEN 'ISSUE' ELSE 'OK' END::text,
        COUNT(*)::int,
        JSONB_AGG(JSONB_BUILD_OBJECT(
            'symbol', symbol,
            'expected_points', expected_points,
            'actual_points', actual_points,
            'coverage_pct', ROUND((actual_points::float / expected_points * 100)::numeric, 1)
        ))
    FROM data_gaps;
    
    -- Check for invalid coherence scores
    RETURN QUERY
    WITH invalid_coherence AS (
        SELECT 
            symbol,
            timestamp,
            coherenceScores
        FROM "MarketData"
        WHERE timestamp > NOW() - INTERVAL '1 hour'
          AND (
            (coherenceScores->>'psi')::float NOT BETWEEN 0 AND 1 OR
            (coherenceScores->>'rho')::float NOT BETWEEN 0 AND 1 OR
            (coherenceScores->>'q')::float NOT BETWEEN 0 AND 1 OR
            (coherenceScores->>'f')::float NOT BETWEEN 0 AND 1
          )
    )
    SELECT 
        'Invalid Coherence Scores'::text,
        CASE WHEN COUNT(*) > 0 THEN 'ISSUE' ELSE 'OK' END::text,
        COUNT(*)::int,
        JSONB_AGG(JSONB_BUILD_OBJECT(
            'symbol', symbol,
            'timestamp', timestamp,
            'coherence_scores', coherenceScores
        )) FILTER (WHERE symbol IS NOT NULL)
    FROM invalid_coherence;
    
    -- Check for price anomalies (e.g., negative prices, extreme jumps)
    RETURN QUERY
    WITH price_anomalies AS (
        SELECT 
            symbol,
            timestamp,
            price,
            LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp) as prev_price
        FROM "MarketData"
        WHERE timestamp > NOW() - INTERVAL '1 hour'
    ),
    anomaly_detection AS (
        SELECT *
        FROM price_anomalies
        WHERE price <= 0  -- Negative or zero price
           OR ABS((price - prev_price) / NULLIF(prev_price, 0)) > 0.5  -- >50% price jump
    )
    SELECT 
        'Price Anomalies'::text,
        CASE WHEN COUNT(*) > 0 THEN 'ISSUE' ELSE 'OK' END::text,
        COUNT(*)::int,
        JSONB_AGG(JSONB_BUILD_OBJECT(
            'symbol', symbol,
            'timestamp', timestamp,
            'price', price,
            'prev_price', prev_price,
            'change_pct', ROUND(((price - prev_price) / NULLIF(prev_price, 0) * 100)::numeric, 2)
        )) FILTER (WHERE symbol IS NOT NULL)
    FROM anomaly_detection;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. AUTOMATED MAINTENANCE AND CLEANUP
-- ============================================================================

-- 4.1 Automated cleanup function
CREATE OR REPLACE FUNCTION automated_cleanup()
RETURNS TEXT AS $$
DECLARE
    cleanup_report TEXT := '';
    deleted_count INT;
BEGIN
    -- Clean up old market data (keep last 30 days)
    DELETE FROM "MarketData" WHERE timestamp < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old market data records. ', deleted_count);
    
    -- Clean up old system health records (keep last 7 days)
    DELETE FROM "SystemHealth" WHERE timestamp < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old system health records. ', deleted_count);
    
    -- Archive old acknowledged alerts (keep last 14 days)
    DELETE FROM "Alert" 
    WHERE acknowledged = true 
      AND "acknowledgedAt" < NOW() - INTERVAL '14 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old acknowledged alerts. ', deleted_count);
    
    -- Clean up old incomplete inferences (keep last 3 days)
    DELETE FROM "Inference" 
    WHERE status = 'FAILED' 
      AND "createdAt" < NOW() - INTERVAL '3 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s failed inferences. ', deleted_count);
    
    -- Update table statistics
    ANALYZE "MarketData";
    ANALYZE "Alert";
    ANALYZE "SystemHealth";
    ANALYZE "Inference";
    
    cleanup_report := cleanup_report || 'Updated table statistics.';
    
    -- Log cleanup completion
    INSERT INTO "SystemHealth" (service, status, message, timestamp)
    VALUES ('cleanup', 'HEALTHY', cleanup_report, NOW());
    
    RETURN cleanup_report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ALERTING INTEGRATION FUNCTIONS
-- ============================================================================

-- 5.1 Function to run all automated alert checks
CREATE OR REPLACE FUNCTION run_all_alert_checks()
RETURNS JSONB AS $$
DECLARE
    coherence_alerts INT;
    market_alerts INT;
    system_alerts INT;
    total_alerts INT;
    report JSONB;
BEGIN
    -- Run all alert generation functions
    SELECT generate_coherence_alerts() INTO coherence_alerts;
    SELECT generate_market_anomaly_alerts() INTO market_alerts;
    SELECT generate_system_health_alerts() INTO system_alerts;
    
    total_alerts := coherence_alerts + market_alerts + system_alerts;
    
    -- Create summary report
    report := jsonb_build_object(
        'timestamp', NOW(),
        'total_alerts_generated', total_alerts,
        'coherence_alerts', coherence_alerts,
        'market_alerts', market_alerts,
        'system_alerts', system_alerts,
        'status', CASE WHEN total_alerts > 0 THEN 'ALERTS_GENERATED' ELSE 'NO_ISSUES' END
    );
    
    -- Log the alert check
    INSERT INTO "SystemHealth" (service, status, message, metrics, timestamp)
    VALUES (
        'alert_monitor',
        'HEALTHY',
        format('Alert check completed. Generated %s alerts.', total_alerts),
        report,
        NOW()
    );
    
    RETURN report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. SCHEDULED MONITORING TASKS
-- ============================================================================

-- Example cron schedules (requires pg_cron extension):
-- 
-- -- Run alert checks every 5 minutes
-- SELECT cron.schedule('alert-checks', '*/5 * * * *', 'SELECT run_all_alert_checks();');
-- 
-- -- Run data quality checks every hour
-- SELECT cron.schedule('data-quality', '0 * * * *', 'SELECT * FROM check_market_data_quality();');
-- 
-- -- Run cleanup daily at 2 AM
-- SELECT cron.schedule('daily-cleanup', '0 2 * * *', 'SELECT automated_cleanup();');
-- 
-- -- Refresh materialized views every 15 minutes
-- SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_all_views();');

-- ============================================================================
-- 7. MANUAL MONITORING QUERIES
-- ============================================================================

-- 7.1 Quick system status check
-- SELECT * FROM v_system_health_overview;

-- 7.2 Performance bottleneck analysis
-- SELECT * FROM v_performance_bottlenecks WHERE issue_count > 0;

-- 7.3 Data quality report
-- SELECT * FROM check_market_data_quality();

-- 7.4 Recent alert activity
-- SELECT 
--     type,
--     severity,
--     COUNT(*) as alert_count,
--     MAX("createdAt") as latest_alert
-- FROM "Alert" 
-- WHERE "createdAt" > NOW() - INTERVAL '1 hour'
-- GROUP BY type, severity
-- ORDER BY severity, alert_count DESC;

-- 7.5 Top performing and problematic symbols
-- WITH symbol_performance AS (
--     SELECT 
--         symbol,
--         COUNT(*) as data_points,
--         AVG(price) as avg_price,
--         STDDEV(price) as price_volatility,
--         AVG((coherenceScores->>'psi')::float) as avg_coherence,
--         COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as recent_points
--     FROM "MarketData"
--     WHERE timestamp > NOW() - INTERVAL '24 hours'
--     GROUP BY symbol
-- )
-- SELECT 
--     symbol,
--     data_points,
--     ROUND(avg_price::numeric, 2) as avg_price_24h,
--     ROUND(price_volatility::numeric, 4) as volatility,
--     ROUND(avg_coherence::numeric, 3) as avg_coherence,
--     recent_points,
--     CASE 
--         WHEN recent_points = 0 THEN 'NO_RECENT_DATA'
--         WHEN recent_points < 30 THEN 'LOW_DATA_FREQUENCY'
--         WHEN avg_coherence > 0.8 THEN 'HIGH_COHERENCE'
--         WHEN avg_coherence < 0.3 THEN 'LOW_COHERENCE'
--         ELSE 'NORMAL'
--     END as status
-- FROM symbol_performance
-- ORDER BY recent_points DESC, avg_coherence DESC;