-- SQL Optimization Queries for TraderAI Database

-- ==================== PERFORMANCE INDEXES ====================

-- Market Data Optimizations
CREATE INDEX CONCURRENTLY idx_marketdata_symbol_timestamp_interval 
ON "MarketData" (symbol, timestamp DESC, interval);

CREATE INDEX CONCURRENTLY idx_marketdata_ohlc_volume 
ON "MarketData" (symbol, close, volume DESC, timestamp DESC);

-- Portfolio Performance Queries
CREATE INDEX CONCURRENTLY idx_portfolio_performance_latest 
ON "PortfolioPerformance" (portfolio_id, date DESC, interval);

CREATE INDEX CONCURRENTLY idx_position_active_pnl 
ON "Position" (portfolio_id, closed_at) 
WHERE closed_at IS NULL;

-- Trading Activity Indexes
CREATE INDEX CONCURRENTLY idx_trade_portfolio_symbol_time 
ON "Trade" (portfolio_id, symbol, executed_at DESC);

CREATE INDEX CONCURRENTLY idx_order_active_by_user 
ON "Order" (user_id, status, placed_at DESC) 
WHERE status IN ('PENDING', 'SUBMITTED', 'PARTIAL');

-- Signal Analysis
CREATE INDEX CONCURRENTLY idx_signal_performance 
ON "Signal" (source, is_active, generated_at DESC) 
WHERE actual_return IS NOT NULL;

-- ==================== MATERIALIZED VIEWS ====================

-- Real-time Portfolio Values
CREATE MATERIALIZED VIEW portfolio_realtime AS
SELECT 
    p.id,
    p.user_id,
    p.name,
    p.total_value_usd,
    p.cash_balance_usd,
    SUM(pos.quantity * pos.current_price) as positions_value,
    SUM(pos.unrealized_pnl) as total_unrealized_pnl,
    COUNT(pos.id) as active_positions,
    p.last_updated
FROM "Portfolio" p
LEFT JOIN "Position" pos ON p.id = pos.portfolio_id AND pos.closed_at IS NULL
GROUP BY p.id, p.user_id, p.name, p.total_value_usd, p.cash_balance_usd, p.last_updated;

CREATE UNIQUE INDEX idx_portfolio_realtime_id ON portfolio_realtime (id);

-- Symbol Performance Summary
CREATE MATERIALIZED VIEW symbol_performance_summary AS
SELECT 
    md.symbol,
    date_trunc('day', md.timestamp) as date,
    first_value(md.open) OVER w as day_open,
    last_value(md.close) OVER w as day_close,
    max(md.high) OVER w as day_high,
    min(md.low) OVER w as day_low,
    sum(md.volume) OVER w as day_volume,
    avg((md.coherence_scores->>'psi')::float) OVER w as avg_coherence_psi
FROM "MarketData" md
WHERE md.interval = 'MINUTE_1'
WINDOW w AS (PARTITION BY md.symbol, date_trunc('day', md.timestamp))
ORDER BY md.symbol, date DESC;

CREATE INDEX idx_symbol_perf_symbol_date ON symbol_performance_summary (symbol, date DESC);

-- ==================== PERFORMANCE QUERIES ====================

-- Top Performing Portfolios (Last 30 Days)
WITH portfolio_returns AS (
    SELECT 
        p.id,
        p.name,
        u.username,
        pp.percent_return,
        pp.sharpe_ratio,
        pp.max_drawdown,
        pp.date,
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pp.date DESC) as rn
    FROM "Portfolio" p
    JOIN "User" u ON p.user_id = u.id
    JOIN "PortfolioPerformance" pp ON p.id = pp.portfolio_id
    WHERE pp.date >= NOW() - INTERVAL '30 days'
        AND pp.interval = 'DAY_1'
)
SELECT 
    name,
    username,
    percent_return,
    sharpe_ratio,
    max_drawdown
FROM portfolio_returns 
WHERE rn = 1
ORDER BY percent_return DESC
LIMIT 10;

-- Signal Performance Analysis
SELECT 
    s.source,
    s.algorithm,
    COUNT(*) as total_signals,
    COUNT(CASE WHEN s.hit_target = true THEN 1 END) as successful_signals,
    ROUND(
        COUNT(CASE WHEN s.hit_target = true THEN 1 END)::decimal / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate,
    AVG(s.actual_return) as avg_return,
    STDDEV(s.actual_return) as return_volatility,
    AVG(s.strength) as avg_confidence
FROM "Signal" s
WHERE s.is_active = false 
    AND s.actual_return IS NOT NULL
    AND s.generated_at >= NOW() - INTERVAL '90 days'
GROUP BY s.source, s.algorithm
ORDER BY success_rate DESC, avg_return DESC;

-- Market Data Quality Check
SELECT 
    symbol,
    COUNT(*) as total_records,
    COUNT(CASE WHEN volume = 0 THEN 1 END) as zero_volume_records,
    MIN(timestamp) as earliest_data,
    MAX(timestamp) as latest_data,
    AVG((coherence_scores->>'psi')::float) as avg_coherence_psi,
    COUNT(DISTINCT date_trunc('day', timestamp)) as trading_days
FROM "MarketData"
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY symbol
ORDER BY total_records DESC;

-- Active Trading Analysis
SELECT 
    p.name as portfolio_name,
    u.username,
    COUNT(DISTINCT t.symbol) as symbols_traded,
    COUNT(t.id) as total_trades,
    SUM(CASE WHEN t.side = 'BUY' THEN t.quantity * t.price ELSE 0 END) as total_bought,
    SUM(CASE WHEN t.side = 'SELL' THEN t.quantity * t.price ELSE 0 END) as total_sold,
    SUM(t.commission) as total_commissions,
    AVG(CASE WHEN t.pnl IS NOT NULL THEN t.pnl END) as avg_trade_pnl
FROM "Trade" t
JOIN "Portfolio" p ON t.portfolio_id = p.id
JOIN "User" u ON p.user_id = u.id
WHERE t.executed_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name, u.username
HAVING COUNT(t.id) > 10
ORDER BY total_trades DESC;

-- ==================== MAINTENANCE QUERIES ====================

-- Refresh materialized views (run hourly)
REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_realtime;
REFRESH MATERIALIZED VIEW CONCURRENTLY symbol_performance_summary;

-- Clean up old audit logs (run monthly)
DELETE FROM "AuditLog" 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Update market data statistics (run daily)
UPDATE "MarketData" 
SET volatility = (
    SELECT STDDEV(close) 
    FROM "MarketData" md2 
    WHERE md2.symbol = "MarketData".symbol 
        AND md2.timestamp >= "MarketData".timestamp - INTERVAL '24 hours'
        AND md2.timestamp <= "MarketData".timestamp
)
WHERE timestamp >= NOW() - INTERVAL '1 day';