"""
TraderAI Example Workflows
Pre-built workflows for common trading analysis tasks
"""

import json
from typing import Dict, List, Any
from datetime import datetime, timedelta
from workflow_manager import WorkflowTemplate, WorkflowStep, QueryComplexity, AnalysisType


class TradingAnalysisWorkflows:
    """Collection of pre-built trading analysis workflows"""
    
    @staticmethod
    def get_market_scanner_workflow() -> WorkflowTemplate:
        """Market scanner workflow for identifying trading opportunities"""
        return WorkflowTemplate(
            name="Market Scanner - High Coherence Opportunities",
            description="Scan for stocks showing high coherence scores and unusual trading activity",
            analysis_type=AnalysisType.TRADING_SIGNALS,
            expected_duration="15-20 minutes",
            skill_level="Intermediate",
            steps=[
                WorkflowStep(
                    name="High Coherence Screener",
                    description="Find stocks with coherence scores above 0.7 in the last hour",
                    query="""
                    WITH high_coherence AS (
                        SELECT 
                            symbol,
                            timestamp,
                            price,
                            volume,
                            (coherenceScores->>'psi')::float as psi,
                            (coherenceScores->>'rho')::float as rho,
                            (coherenceScores->>'q')::float as q,
                            (coherenceScores->>'f')::float as f,
                            ((coherenceScores->>'psi')::float * 0.3 + 
                             (coherenceScores->>'rho')::float * 0.3 + 
                             (coherenceScores->>'q')::float * 0.2 + 
                             (coherenceScores->>'f')::float * 0.2) as composite_coherence
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '1 hour'
                    )
                    SELECT 
                        symbol,
                        MAX(composite_coherence) as max_coherence,
                        AVG(composite_coherence) as avg_coherence,
                        COUNT(*) as data_points,
                        MAX(price) as current_price,
                        SUM(volume::numeric) as total_volume
                    FROM high_coherence
                    WHERE composite_coherence > 0.7
                    GROUP BY symbol
                    HAVING COUNT(*) >= 3  -- At least 3 high coherence readings
                    ORDER BY max_coherence DESC, avg_coherence DESC
                    LIMIT 20;
                    """,
                    expected_output="Top 20 stocks with sustained high coherence",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Volume Spike Detection",
                    description="Identify unusual volume spikes in high coherence stocks",
                    query="""
                    WITH volume_analysis AS (
                        SELECT 
                            symbol,
                            timestamp,
                            volume::numeric as current_volume,
                            AVG(volume::numeric) OVER (
                                PARTITION BY symbol 
                                ORDER BY timestamp 
                                ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
                            ) as avg_volume_20,
                            (coherenceScores->>'psi')::float * 0.3 + 
                            (coherenceScores->>'rho')::float * 0.3 + 
                            (coherenceScores->>'q')::float * 0.2 + 
                            (coherenceScores->>'f')::float * 0.2 as composite_coherence
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '2 hours'
                    ),
                    volume_spikes AS (
                        SELECT *,
                            CASE 
                                WHEN current_volume > avg_volume_20 * 2 THEN 'MAJOR_SPIKE'
                                WHEN current_volume > avg_volume_20 * 1.5 THEN 'MODERATE_SPIKE'
                                ELSE 'NORMAL'
                            END as volume_category
                        FROM volume_analysis
                        WHERE avg_volume_20 IS NOT NULL
                    )
                    SELECT 
                        symbol,
                        timestamp,
                        current_volume,
                        avg_volume_20,
                        ROUND((current_volume / avg_volume_20)::numeric, 2) as volume_multiple,
                        ROUND(composite_coherence::numeric, 3) as coherence,
                        volume_category
                    FROM volume_spikes
                    WHERE volume_category IN ('MAJOR_SPIKE', 'MODERATE_SPIKE')
                      AND composite_coherence > 0.6
                    ORDER BY timestamp DESC, volume_multiple DESC;
                    """,
                    expected_output="Stocks showing both volume spikes and high coherence",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="4 minutes"
                ),
                WorkflowStep(
                    name="Price Momentum Analysis",
                    description="Analyze price momentum for selected opportunities",
                    query="""
                    SELECT 
                        symbol,
                        current_price,
                        price_change_5m,
                        price_change_pct_5m,
                        ma_20,
                        ma_50,
                        ma_signal,
                        CASE 
                            WHEN ma_signal = 'GOLDEN_CROSS' AND price_change_pct_5m > 0 THEN 'STRONG_BUY'
                            WHEN ma_signal = 'GOLDEN_CROSS' THEN 'BUY'
                            WHEN price_change_pct_5m > 2 THEN 'MOMENTUM_BUY'
                            WHEN ma_signal = 'DEATH_CROSS' THEN 'SELL'
                            WHEN price_change_pct_5m < -2 THEN 'MOMENTUM_SELL'
                            ELSE 'HOLD'
                        END as trading_signal
                    FROM mv_market_momentum
                    WHERE timestamp > NOW() - INTERVAL '1 hour'
                    ORDER BY 
                        CASE trading_signal
                            WHEN 'STRONG_BUY' THEN 1
                            WHEN 'BUY' THEN 2
                            WHEN 'MOMENTUM_BUY' THEN 3
                            WHEN 'HOLD' THEN 4
                            WHEN 'MOMENTUM_SELL' THEN 5
                            WHEN 'SELL' THEN 6
                        END,
                        ABS(price_change_pct_5m) DESC;
                    """,
                    expected_output="Trading signals based on momentum indicators",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Risk Assessment",
                    description="Assess risk factors for identified opportunities",
                    query="""
                    WITH risk_metrics AS (
                        SELECT 
                            symbol,
                            STDDEV(price) as price_volatility,
                            STDDEV((coherenceScores->>'psi')::float) as coherence_volatility,
                            COUNT(*) as data_points,
                            MAX(price) - MIN(price) as price_range,
                            AVG((coherenceScores->>'psi')::float * 0.3 + 
                                (coherenceScores->>'rho')::float * 0.3 + 
                                (coherenceScores->>'q')::float * 0.2 + 
                                (coherenceScores->>'f')::float * 0.2) as avg_coherence
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '4 hours'
                        GROUP BY symbol
                        HAVING COUNT(*) >= 10
                    )
                    SELECT 
                        symbol,
                        ROUND(price_volatility::numeric, 4) as price_volatility,
                        ROUND(coherence_volatility::numeric, 4) as coherence_volatility,
                        ROUND((price_range / AVG(price_range) OVER ())::numeric, 2) as relative_volatility,
                        ROUND(avg_coherence::numeric, 3) as avg_coherence,
                        CASE 
                            WHEN price_volatility < 1 AND coherence_volatility < 0.1 THEN 'LOW_RISK'
                            WHEN price_volatility < 3 AND coherence_volatility < 0.2 THEN 'MEDIUM_RISK'
                            ELSE 'HIGH_RISK'
                        END as risk_category,
                        data_points
                    FROM risk_metrics
                    ORDER BY risk_category, avg_coherence DESC;
                    """,
                    expected_output="Risk assessment for potential trades",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="5 minutes"
                )
            ]
        )
    
    @staticmethod
    def get_sentiment_analysis_workflow() -> WorkflowTemplate:
        """Sentiment analysis workflow for market mood assessment"""
        return WorkflowTemplate(
            name="Market Sentiment Analysis",
            description="Analyze market sentiment and emotional indicators across different timeframes",
            analysis_type=AnalysisType.MARKET_OVERVIEW,
            expected_duration="12-15 minutes",
            skill_level="Beginner",
            steps=[
                WorkflowStep(
                    name="Overall Market Sentiment",
                    description="Get overall market sentiment distribution",
                    query="""
                    SELECT 
                        sentiment,
                        COUNT(*) as frequency,
                        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ())::numeric, 2) as percentage,
                        AVG(price) as avg_price,
                        AVG((coherenceScores->>'psi')::float * 0.3 + 
                            (coherenceScores->>'rho')::float * 0.3 + 
                            (coherenceScores->>'q')::float * 0.2 + 
                            (coherenceScores->>'f')::float * 0.2) as avg_coherence
                    FROM "MarketData"
                    WHERE timestamp > NOW() - INTERVAL '24 hours'
                      AND sentiment IS NOT NULL
                    GROUP BY sentiment
                    ORDER BY frequency DESC;
                    """,
                    expected_output="Market sentiment distribution with coherence correlation",
                    complexity=QueryComplexity.SIMPLE,
                    estimated_time="2 minutes"
                ),
                WorkflowStep(
                    name="Sentiment by Symbol",
                    description="Analyze sentiment patterns for individual stocks",
                    query="""
                    SELECT 
                        symbol,
                        sentiment,
                        COUNT(*) as readings,
                        AVG(price) as avg_price,
                        MIN(price) as min_price,
                        MAX(price) as max_price,
                        ROUND(((MAX(price) - MIN(price)) / MIN(price) * 100)::numeric, 2) as price_range_pct,
                        AVG((coherenceScores->>'f')::float) as avg_flow_coherence
                    FROM "MarketData"
                    WHERE timestamp > NOW() - INTERVAL '12 hours'
                      AND sentiment IS NOT NULL
                      AND symbol IN ('AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY')
                    GROUP BY symbol, sentiment
                    HAVING COUNT(*) >= 5
                    ORDER BY symbol, sentiment;
                    """,
                    expected_output="Sentiment breakdown by major stocks",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Sentiment Coherence Correlation",
                    description="Find correlation between sentiment and coherence patterns",
                    query="""
                    WITH sentiment_coherence AS (
                        SELECT 
                            symbol,
                            sentiment,
                            (coherenceScores->>'psi')::float as psi,
                            (coherenceScores->>'rho')::float as rho,
                            (coherenceScores->>'q')::float as q,
                            (coherenceScores->>'f')::float as f,
                            price
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '24 hours'
                          AND sentiment IS NOT NULL
                    ),
                    correlations AS (
                        SELECT 
                            sentiment,
                            COUNT(*) as sample_size,
                            AVG(psi) as avg_psi,
                            AVG(rho) as avg_rho,
                            AVG(q) as avg_q,
                            AVG(f) as avg_f,
                            STDDEV(psi) as std_psi,
                            AVG(price) as avg_price
                        FROM sentiment_coherence
                        WHERE psi IS NOT NULL
                        GROUP BY sentiment
                        HAVING COUNT(*) >= 10
                    )
                    SELECT 
                        sentiment,
                        sample_size,
                        ROUND(avg_psi::numeric, 3) as avg_psi,
                        ROUND(avg_rho::numeric, 3) as avg_rho,
                        ROUND(avg_q::numeric, 3) as avg_q,
                        ROUND(avg_f::numeric, 3) as avg_f,
                        ROUND(((avg_psi + avg_rho + avg_q + avg_f) / 4)::numeric, 3) as composite_coherence,
                        ROUND(avg_price::numeric, 2) as avg_price,
                        CASE 
                            WHEN (avg_psi + avg_rho + avg_q + avg_f) / 4 > 0.7 THEN 'HIGH_COHERENCE'
                            WHEN (avg_psi + avg_rho + avg_q + avg_f) / 4 > 0.4 THEN 'MEDIUM_COHERENCE'
                            ELSE 'LOW_COHERENCE'
                        END as coherence_level
                    FROM correlations
                    ORDER BY composite_coherence DESC;
                    """,
                    expected_output="Sentiment categories with their coherence characteristics",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="4 minutes"
                ),
                WorkflowStep(
                    name="Hourly Sentiment Trends",
                    description="Track sentiment evolution throughout the day",
                    query="""
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        sentiment,
                        COUNT(*) as frequency,
                        COUNT(DISTINCT symbol) as unique_symbols,
                        AVG((coherenceScores->>'f')::float) as avg_flow_coherence,
                        AVG(price) as avg_price
                    FROM "MarketData"
                    WHERE timestamp > NOW() - INTERVAL '24 hours'
                      AND sentiment IS NOT NULL
                    GROUP BY DATE_TRUNC('hour', timestamp), sentiment
                    HAVING COUNT(*) >= 3
                    ORDER BY hour DESC, sentiment;
                    """,
                    expected_output="Hourly sentiment evolution with market indicators",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                )
            ]
        )
    
    @staticmethod
    def get_risk_monitoring_workflow() -> WorkflowTemplate:
        """Risk monitoring workflow for portfolio management"""
        return WorkflowTemplate(
            name="Risk Monitoring Dashboard",
            description="Monitor portfolio risk factors and early warning indicators",
            analysis_type=AnalysisType.ANOMALY_DETECTION,
            expected_duration="10-15 minutes",
            skill_level="Advanced",
            steps=[
                WorkflowStep(
                    name="Volatility Heat Map",
                    description="Generate volatility heat map for major assets",
                    query="""
                    WITH volatility_metrics AS (
                        SELECT 
                            symbol,
                            STDDEV(price) as price_volatility,
                            AVG(price) as avg_price,
                            STDDEV((coherenceScores->>'psi')::float) as psi_volatility,
                            STDDEV((coherenceScores->>'rho')::float) as rho_volatility,
                            COUNT(*) as data_points,
                            MAX(price) as max_price,
                            MIN(price) as min_price
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '24 hours'
                          AND symbol IN ('AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ')
                        GROUP BY symbol
                        HAVING COUNT(*) >= 20
                    )
                    SELECT 
                        symbol,
                        ROUND((price_volatility / avg_price * 100)::numeric, 2) as volatility_percent,
                        ROUND(((max_price - min_price) / min_price * 100)::numeric, 2) as daily_range_percent,
                        ROUND(psi_volatility::numeric, 4) as coherence_volatility,
                        CASE 
                            WHEN price_volatility / avg_price > 0.05 THEN 'HIGH_VOLATILITY'
                            WHEN price_volatility / avg_price > 0.02 THEN 'MEDIUM_VOLATILITY'
                            ELSE 'LOW_VOLATILITY'
                        END as risk_category,
                        data_points
                    FROM volatility_metrics
                    ORDER BY price_volatility / avg_price DESC;
                    """,
                    expected_output="Asset volatility rankings and risk categories",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="4 minutes"
                ),
                WorkflowStep(
                    name="Correlation Risk Analysis",
                    description="Analyze correlation breakdowns and portfolio concentration risk",
                    query="""
                    SELECT 
                        symbol1,
                        symbol2,
                        psi_correlation,
                        rho_correlation,
                        avg_correlation,
                        CASE 
                            WHEN ABS(avg_correlation) > 0.8 THEN 'HIGH_CORRELATION'
                            WHEN ABS(avg_correlation) > 0.5 THEN 'MEDIUM_CORRELATION'
                            WHEN ABS(avg_correlation) < -0.5 THEN 'NEGATIVE_CORRELATION'
                            ELSE 'LOW_CORRELATION'
                        END as correlation_category,
                        data_points
                    FROM v_coherence_correlation
                    WHERE (symbol1 IN ('AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL') 
                           AND symbol2 IN ('AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'))
                       OR (symbol1 = 'SPY' OR symbol2 = 'SPY')
                    ORDER BY ABS(avg_correlation) DESC;
                    """,
                    expected_output="Correlation matrix for portfolio diversification analysis",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Anomaly Detection",
                    description="Detect unusual patterns that might indicate market stress",
                    query="""
                    WITH anomaly_detection AS (
                        SELECT 
                            symbol,
                            timestamp,
                            price,
                            (coherenceScores->>'psi')::float as psi,
                            (coherenceScores->>'rho')::float as rho,
                            LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp) as prev_price,
                            AVG(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS 10 PRECEDING) as ma_10,
                            STDDEV(price) OVER (PARTITION BY symbol ORDER BY timestamp ROWS 20 PRECEDING) as rolling_std
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '6 hours'
                    ),
                    flagged_anomalies AS (
                        SELECT *,
                            ABS(price - ma_10) / NULLIF(rolling_std, 0) as z_score,
                            ABS(price - prev_price) / prev_price as price_change_abs,
                            CASE 
                                WHEN ABS(price - ma_10) / NULLIF(rolling_std, 0) > 2 THEN 'PRICE_OUTLIER'
                                WHEN psi < 0.1 AND rho < 0.1 THEN 'COHERENCE_BREAKDOWN'
                                WHEN ABS(price - prev_price) / prev_price > 0.05 THEN 'SUDDEN_MOVE'
                                ELSE NULL
                            END as anomaly_type
                        FROM anomaly_detection
                        WHERE ma_10 IS NOT NULL AND rolling_std IS NOT NULL
                    )
                    SELECT 
                        symbol,
                        timestamp,
                        price,
                        ROUND(z_score::numeric, 2) as z_score,
                        ROUND((price_change_abs * 100)::numeric, 2) as price_change_percent,
                        ROUND(psi::numeric, 3) as psi,
                        ROUND(rho::numeric, 3) as rho,
                        anomaly_type
                    FROM flagged_anomalies
                    WHERE anomaly_type IS NOT NULL
                    ORDER BY timestamp DESC, z_score DESC;
                    """,
                    expected_output="List of detected anomalies with risk indicators",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="5 minutes"
                ),
                WorkflowStep(
                    name="Alert Summary",
                    description="Summarize current alerts and their severity",
                    query="""
                    WITH recent_alerts AS (
                        SELECT 
                            type,
                            severity,
                            symbol,
                            message,
                            "createdAt",
                            acknowledged
                        FROM "Alert"
                        WHERE "createdAt" > NOW() - INTERVAL '4 hours'
                    )
                    SELECT 
                        type,
                        severity,
                        COUNT(*) as alert_count,
                        COUNT(DISTINCT symbol) as affected_symbols,
                        COUNT(*) FILTER (WHERE NOT acknowledged) as unacknowledged,
                        MIN("createdAt") as first_alert,
                        MAX("createdAt") as latest_alert,
                        ARRAY_AGG(DISTINCT symbol) FILTER (WHERE symbol IS NOT NULL) as symbols
                    FROM recent_alerts
                    GROUP BY type, severity
                    ORDER BY 
                        CASE severity 
                            WHEN 'CRITICAL' THEN 1
                            WHEN 'HIGH' THEN 2
                            WHEN 'MEDIUM' THEN 3
                            WHEN 'LOW' THEN 4
                        END,
                        alert_count DESC;
                    """,
                    expected_output="Alert summary by type and severity",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                )
            ]
        )
    
    @staticmethod
    def get_performance_analytics_workflow() -> WorkflowTemplate:
        """Performance analytics workflow for strategy evaluation"""
        return WorkflowTemplate(
            name="Strategy Performance Analytics",
            description="Analyze trading strategy performance and coherence effectiveness",
            analysis_type=AnalysisType.PERFORMANCE_MONITORING,
            expected_duration="18-25 minutes",
            skill_level="Advanced",
            steps=[
                WorkflowStep(
                    name="Coherence Prediction Accuracy",
                    description="Analyze how well coherence scores predict price movements",
                    query="""
                    WITH coherence_predictions AS (
                        SELECT 
                            symbol,
                            timestamp,
                            price,
                            (coherenceScores->>'psi')::float * 0.3 + 
                            (coherenceScores->>'rho')::float * 0.3 + 
                            (coherenceScores->>'q')::float * 0.2 + 
                            (coherenceScores->>'f')::float * 0.2 as composite_coherence,
                            LEAD(price) OVER (PARTITION BY symbol ORDER BY timestamp) as future_price,
                            LAG(price) OVER (PARTITION BY symbol ORDER BY timestamp) as past_price
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '48 hours'
                    ),
                    predictions_analysis AS (
                        SELECT *,
                            CASE 
                                WHEN composite_coherence > 0.7 THEN 'HIGH_COHERENCE'
                                WHEN composite_coherence > 0.4 THEN 'MEDIUM_COHERENCE'
                                ELSE 'LOW_COHERENCE'
                            END as coherence_level,
                            CASE 
                                WHEN future_price > price THEN 'PRICE_UP'
                                WHEN future_price < price THEN 'PRICE_DOWN'
                                ELSE 'PRICE_STABLE'
                            END as actual_movement,
                            (future_price - price) / price as price_change_pct
                        FROM coherence_predictions
                        WHERE future_price IS NOT NULL
                    )
                    SELECT 
                        coherence_level,
                        actual_movement,
                        COUNT(*) as occurrences,
                        AVG(price_change_pct) as avg_price_change,
                        STDDEV(price_change_pct) as price_change_volatility,
                        COUNT(*) FILTER (WHERE ABS(price_change_pct) > 0.01) as significant_moves
                    FROM predictions_analysis
                    GROUP BY coherence_level, actual_movement
                    ORDER BY coherence_level, actual_movement;
                    """,
                    expected_output="Coherence prediction accuracy by price movement direction",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="5 minutes"
                ),
                WorkflowStep(
                    name="Strategy Backtesting",
                    description="Backtest simple coherence-based trading strategy",
                    query="""
                    WITH strategy_signals AS (
                        SELECT 
                            symbol,
                            timestamp,
                            price,
                            (coherenceScores->>'psi')::float * 0.3 + 
                            (coherenceScores->>'rho')::float * 0.3 + 
                            (coherenceScores->>'q')::float * 0.2 + 
                            (coherenceScores->>'f')::float * 0.2 as composite_coherence,
                            CASE 
                                WHEN (coherenceScores->>'psi')::float > 0.8 
                                 AND (coherenceScores->>'rho')::float > 0.8 THEN 'BUY_SIGNAL'
                                WHEN (coherenceScores->>'psi')::float < 0.3 
                                 AND (coherenceScores->>'rho')::float < 0.3 THEN 'SELL_SIGNAL'
                                ELSE 'HOLD'
                            END as signal,
                            LAG(timestamp) OVER (PARTITION BY symbol ORDER BY timestamp) as prev_timestamp,
                            LEAD(price) OVER (PARTITION BY symbol ORDER BY timestamp) as next_price
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '24 hours'
                          AND symbol IN ('AAPL', 'TSLA', 'NVDA')
                    ),
                    trade_outcomes AS (
                        SELECT *,
                            CASE signal
                                WHEN 'BUY_SIGNAL' THEN (next_price - price) / price
                                WHEN 'SELL_SIGNAL' THEN (price - next_price) / price
                                ELSE 0
                            END as trade_return
                        FROM strategy_signals
                        WHERE signal IN ('BUY_SIGNAL', 'SELL_SIGNAL')
                          AND next_price IS NOT NULL
                    )
                    SELECT 
                        symbol,
                        signal,
                        COUNT(*) as total_signals,
                        COUNT(*) FILTER (WHERE trade_return > 0) as winning_trades,
                        COUNT(*) FILTER (WHERE trade_return < 0) as losing_trades,
                        ROUND((COUNT(*) FILTER (WHERE trade_return > 0)::float / COUNT(*) * 100)::numeric, 2) as win_rate,
                        ROUND(AVG(trade_return * 100)::numeric, 4) as avg_return_percent,
                        ROUND(SUM(trade_return * 100)::numeric, 4) as total_return_percent,
                        ROUND(MAX(trade_return * 100)::numeric, 4) as best_trade_percent,
                        ROUND(MIN(trade_return * 100)::numeric, 4) as worst_trade_percent
                    FROM trade_outcomes
                    GROUP BY symbol, signal
                    ORDER BY symbol, total_return_percent DESC;
                    """,
                    expected_output="Strategy performance metrics by symbol and signal type",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="6 minutes"
                ),
                WorkflowStep(
                    name="Coherence Metric Performance",
                    description="Compare individual coherence metrics for prediction accuracy",
                    query="""
                    WITH metric_analysis AS (
                        SELECT 
                            symbol,
                            timestamp,
                            price,
                            (coherenceScores->>'psi')::float as psi,
                            (coherenceScores->>'rho')::float as rho,
                            (coherenceScores->>'q')::float as q,
                            (coherenceScores->>'f')::float as f,
                            LEAD(price, 5) OVER (PARTITION BY symbol ORDER BY timestamp) as price_5_ahead,
                            LEAD(price, 10) OVER (PARTITION BY symbol ORDER BY timestamp) as price_10_ahead
                        FROM "MarketData"
                        WHERE timestamp > NOW() - INTERVAL '24 hours'
                          AND symbol IN ('AAPL', 'TSLA', 'NVDA', 'MSFT')
                    ),
                    correlations AS (
                        SELECT 
                            symbol,
                            CORR(psi, (price_5_ahead - price) / price) as psi_corr_5min,
                            CORR(rho, (price_5_ahead - price) / price) as rho_corr_5min,
                            CORR(q, (price_5_ahead - price) / price) as q_corr_5min,
                            CORR(f, (price_5_ahead - price) / price) as f_corr_5min,
                            CORR(psi, (price_10_ahead - price) / price) as psi_corr_10min,
                            CORR(rho, (price_10_ahead - price) / price) as rho_corr_10min,
                            CORR(q, (price_10_ahead - price) / price) as q_corr_10min,
                            CORR(f, (price_10_ahead - price) / price) as f_corr_10min,
                            COUNT(*) as sample_size
                        FROM metric_analysis
                        WHERE price_5_ahead IS NOT NULL
                        GROUP BY symbol
                        HAVING COUNT(*) >= 20
                    )
                    SELECT 
                        symbol,
                        ROUND(psi_corr_5min::numeric, 4) as psi_5min_correlation,
                        ROUND(rho_corr_5min::numeric, 4) as rho_5min_correlation,
                        ROUND(q_corr_5min::numeric, 4) as q_5min_correlation,
                        ROUND(f_corr_5min::numeric, 4) as f_5min_correlation,
                        ROUND(psi_corr_10min::numeric, 4) as psi_10min_correlation,
                        ROUND(rho_corr_10min::numeric, 4) as rho_10min_correlation,
                        ROUND(q_corr_10min::numeric, 4) as q_10min_correlation,
                        ROUND(f_corr_10min::numeric, 4) as f_10min_correlation,
                        sample_size
                    FROM correlations
                    ORDER BY symbol;
                    """,
                    expected_output="Individual coherence metric correlations with future price movements",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="7 minutes"
                )
            ]
        )
    
    @staticmethod
    def get_all_workflows() -> Dict[str, WorkflowTemplate]:
        """Get all available trading analysis workflows"""
        return {
            'market_scanner': TradingAnalysisWorkflows.get_market_scanner_workflow(),
            'sentiment_analysis': TradingAnalysisWorkflows.get_sentiment_analysis_workflow(),
            'risk_monitoring': TradingAnalysisWorkflows.get_risk_monitoring_workflow(),
            'performance_analytics': TradingAnalysisWorkflows.get_performance_analytics_workflow()
        }


def export_workflows_to_json(output_path: str = "/Users/chris/TraderAI/database/trading-workflows.json"):
    """Export all workflows to JSON file for easy access"""
    workflows = TradingAnalysisWorkflows.get_all_workflows()
    
    # Convert workflows to serializable format
    workflows_data = {}
    for key, workflow in workflows.items():
        workflows_data[key] = {
            'name': workflow.name,
            'description': workflow.description,
            'analysis_type': workflow.analysis_type.value,
            'expected_duration': workflow.expected_duration,
            'skill_level': workflow.skill_level,
            'steps': [
                {
                    'name': step.name,
                    'description': step.description,
                    'query': step.query,
                    'expected_output': step.expected_output,
                    'complexity': step.complexity.value,
                    'estimated_time': step.estimated_time,
                    'prerequisites': step.prerequisites or []
                }
                for step in workflow.steps
            ]
        }
    
    with open(output_path, 'w') as f:
        json.dump(workflows_data, f, indent=2)
    
    print(f"Workflows exported to: {output_path}")


def main():
    """Command-line interface for workflow management"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TraderAI Example Workflows')
    parser.add_argument('action', choices=['list', 'export', 'show'])
    parser.add_argument('--workflow', help='Workflow ID to show details')
    parser.add_argument('--output', help='Output path for export', 
                       default='/Users/chris/TraderAI/database/trading-workflows.json')
    
    args = parser.parse_args()
    
    if args.action == 'list':
        workflows = TradingAnalysisWorkflows.get_all_workflows()
        print(f"\nAvailable Trading Analysis Workflows ({len(workflows)}):")
        print("=" * 50)
        for key, workflow in workflows.items():
            print(f"\n{key}:")
            print(f"  Name: {workflow.name}")
            print(f"  Level: {workflow.skill_level}")
            print(f"  Duration: {workflow.expected_duration}")
            print(f"  Steps: {len(workflow.steps)}")
            print(f"  Description: {workflow.description}")
    
    elif args.action == 'show':
        if not args.workflow:
            print("Error: --workflow required for show action")
            return
        
        workflows = TradingAnalysisWorkflows.get_all_workflows()
        if args.workflow not in workflows:
            print(f"Error: Workflow '{args.workflow}' not found")
            return
        
        workflow = workflows[args.workflow]
        print(f"\nWorkflow: {workflow.name}")
        print("=" * 60)
        print(f"Description: {workflow.description}")
        print(f"Skill Level: {workflow.skill_level}")
        print(f"Duration: {workflow.expected_duration}")
        print(f"\nSteps ({len(workflow.steps)}):")
        
        for i, step in enumerate(workflow.steps, 1):
            print(f"\n{i}. {step.name}")
            print(f"   Description: {step.description}")
            print(f"   Complexity: {step.complexity.value}")
            print(f"   Time: {step.estimated_time}")
            print(f"   Output: {step.expected_output}")
    
    elif args.action == 'export':
        export_workflows_to_json(args.output)


if __name__ == "__main__":
    main()