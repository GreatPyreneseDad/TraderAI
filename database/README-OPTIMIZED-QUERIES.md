# TraderAI Optimized SQL Queries Documentation

This directory contains comprehensive SQL queries and views optimized for the TraderAI system's PostgreSQL database. The queries are designed for high-performance real-time market analysis, coherence score monitoring, and system health tracking.

## File Overview

### 1. `optimized-queries.sql`
**Core analytical queries and views for market data analysis**

- **Real-time Market Data Aggregation**: TWAP/VWAP calculations, market momentum indicators
- **Coherence Score Analysis**: Pattern detection, correlation matrices, anomaly detection  
- **Alert Pattern Detection**: Frequency analysis, clustering algorithms
- **Performance Monitoring**: System health dashboards, query performance tracking
- **User Activity Tracking**: Inference analytics, engagement metrics
- **Optimization Indexes**: Strategic indexes for JSON fields and time-series data

### 2. `postgresql-performance-config.sql` 
**Database performance optimization and configuration**

- **Memory and Connection Settings**: Optimized for high-throughput time-series workloads
- **TimescaleDB Integration**: Hypertable setup for market data (optional)
- **Custom Aggregate Functions**: Specialized coherence score calculations
- **Advanced Indexing**: Expression indexes, BRIN indexes, partial indexes
- **Stored Procedures**: Bulk operations, anomaly detection algorithms
- **Caching Strategies**: Materialized views with automated refresh
- **Maintenance Functions**: Automated statistics updates and cleanup

### 3. `real-time-analytics-queries.sql`
**Dashboard and live market analysis queries**

- **Dashboard Summary Queries**: Market overview snapshots with trend analysis
- **Real-time Alert Queries**: Priority scoring, contextual market data
- **Coherence Analysis**: Heatmap data, divergence detection algorithms
- **Trading Signal Generation**: Momentum-based signals with coherence confidence
- **System Health Monitoring**: Real-time service status with performance metrics  
- **User Activity Analytics**: Live engagement tracking and user classification

### 4. `monitoring-alerting-queries.sql`
**Automated monitoring and anomaly detection system**

- **Alert Generation Functions**: Coherence spikes, market anomalies, system health issues
- **Performance Bottleneck Detection**: Query analysis, connection monitoring
- **Data Quality Monitoring**: Missing data detection, validation checks
- **Automated Maintenance**: Cleanup procedures, statistics updates
- **Integration Functions**: Comprehensive alert orchestration

## Key Features

### PostgreSQL-Specific Optimizations

1. **JSON Performance**: Optimized queries for coherence score JSON fields with expression indexes
2. **Time-Series Efficiency**: BRIN indexes and partitioning strategies for timestamp-based data
3. **Window Functions**: Advanced analytics using PostgreSQL's powerful window function capabilities
4. **Materialized Views**: Pre-computed aggregations with concurrent refresh strategies
5. **Custom Aggregates**: Domain-specific functions for coherence score calculations

### Real-Time Performance

- **Sub-100ms Response**: Dashboard queries optimized for real-time display
- **Streaming Analytics**: Continuous coherence pattern detection
- **Efficient Aggregations**: Pre-calculated moving averages and statistical measures
- **Smart Caching**: Materialized views with intelligent refresh scheduling

### Monitoring and Alerting

- **Automated Anomaly Detection**: 3-sigma coherence spike detection with false positive reduction
- **System Health Tracking**: Multi-dimensional service monitoring with predictive alerts
- **Data Quality Assurance**: Comprehensive validation with automated remediation suggestions
- **Performance Monitoring**: Query execution tracking with bottleneck identification

## Usage Instructions

### Initial Setup

1. **Apply Schema Improvements**:
```sql
-- Run the base schema first, then apply improvements
\i database/schema-improvements.sql
\i database/postgresql-performance-config.sql
```

2. **Create Views and Functions**:
```sql
-- Load optimized queries and views
\i database/optimized-queries.sql
\i database/real-time-analytics-queries.sql
\i database/monitoring-alerting-queries.sql
```

3. **Configure Automated Tasks** (if pg_cron is available):
```sql
-- Schedule automated maintenance
SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_all_views();');
SELECT cron.schedule('alert-checks', '*/5 * * * *', 'SELECT run_all_alert_checks();');
SELECT cron.schedule('daily-cleanup', '0 2 * * *', 'SELECT automated_cleanup();');
```

### Dashboard Integration

**Real-time Market Overview**:
```sql
-- Get current market snapshot with coherence analysis
SELECT * FROM v_realtime_market_snapshot 
ORDER BY composite_coherence DESC;
```

**System Health Check**:
```sql
-- Quick system status for dashboard
SELECT * FROM v_system_health_overview;
```

**Active Alerts**:
```sql
-- Priority-sorted alerts with context
SELECT * FROM (
    -- Real-time alert query from real-time-analytics-queries.sql
) ORDER BY priority_score DESC LIMIT 20;
```

### Performance Analysis

**Coherence Pattern Detection**:
```sql
-- Detect unusual coherence patterns for AAPL in last hour
SELECT * FROM detect_coherence_patterns('AAPL', '1 hour');
```

**Trading Signals**:
```sql
-- Get momentum-based trading signals with coherence confidence
-- Use momentum-based trading signals query from real-time-analytics-queries.sql
```

**Market Analysis**:
```sql
-- Calculate TWAP/VWAP for active trading
SELECT * FROM calculate_twap('AAPL', '4 hours');
```

### Monitoring Operations

**Run Alert Checks**:
```sql
-- Execute all automated alert generation
SELECT run_all_alert_checks();
```

**Data Quality Report**:
```sql
-- Check market data integrity
SELECT * FROM check_market_data_quality();
```

**Performance Review**:
```sql
-- Identify performance bottlenecks
SELECT * FROM v_performance_bottlenecks WHERE issue_count > 0;
```

### Maintenance Operations

**Manual Optimization**:
```sql
-- Run comprehensive maintenance
SELECT optimize_tables();
SELECT automated_cleanup();
```

**View Refresh**:
```sql
-- Update materialized views
SELECT refresh_all_views();
```

## Performance Considerations

### Query Execution Guidelines

- **Real-time queries**: Target < 100ms execution time
- **Dashboard queries**: Target < 500ms execution time  
- **Analytics queries**: Allow up to 2 seconds for complex analysis
- **Batch operations**: Use transactions for bulk operations

### Resource Management

- **Connection Pooling**: Monitor connection usage with `monitor_connections()`
- **Memory Usage**: Configure `work_mem` based on concurrent query complexity
- **Index Maintenance**: Regular `ANALYZE` operations for optimal query plans
- **Partition Management**: Consider partitioning when MarketData exceeds 10M rows

### Scaling Recommendations

1. **Horizontal Scaling**: Consider read replicas for analytics workloads
2. **TimescaleDB**: Implement for time-series data beyond 100M rows
3. **Connection Pooling**: Use pgBouncer for high-concurrency scenarios
4. **Caching Layer**: Implement Redis for frequently accessed aggregations

## Integration with Application Code

### TypeScript/Node.js Integration

The queries are designed to work seamlessly with Prisma and direct PostgreSQL connections:

```typescript
// Example: Get real-time market data
const marketData = await prisma.$queryRaw`
  SELECT * FROM v_realtime_market_snapshot 
  WHERE symbol = ANY(${symbols})
  ORDER BY composite_coherence DESC
`;

// Example: Generate alerts
const alertResult = await prisma.$queryRaw`
  SELECT run_all_alert_checks()
`;
```

### WebSocket Integration

Real-time queries support streaming data patterns:

```typescript
// Example: Stream coherence updates
setInterval(async () => {
  const coherenceData = await getCoherenceHeatmap();
  websocket.broadcast('coherence-update', coherenceData);
}, 5000);
```

## Security Considerations

- **Query Injection Protection**: All parameterized queries use proper sanitization
- **Role-Based Access**: Implement database roles for different access levels
- **Audit Logging**: Enable PostgreSQL logging for security monitoring
- **Connection Security**: Use SSL/TLS for database connections

## Monitoring and Alerting Integration

The queries integrate with external monitoring systems:

- **Prometheus**: Export metrics via custom functions
- **Grafana**: Dashboard queries optimized for visualization
- **PagerDuty**: Alert severity mapping for incident management
- **Slack/Discord**: Formatted alert messages with context

## Troubleshooting

### Common Performance Issues

1. **Slow JSON Queries**: Ensure expression indexes are created
2. **High Memory Usage**: Adjust `work_mem` and query complexity
3. **Lock Contention**: Monitor with lock_stats queries
4. **Stale Statistics**: Run `ANALYZE` on frequently updated tables

### Debug Queries

```sql
-- Check query performance
SELECT * FROM analyze_query_performance('YOUR_QUERY_HERE');

-- Monitor resource usage
SELECT * FROM v_database_size_monitoring;

-- Check connection status
SELECT * FROM monitor_connections();
```

---

**Created**: 2025-08-08  
**Version**: 1.0  
**Compatibility**: PostgreSQL 13+, Prisma 5.x, Node.js 18+