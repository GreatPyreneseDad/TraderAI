"""
TraderAI Integration Bridge
Connects TablePlus, PandasAI, and optimized SQL queries for seamless workflow
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import pandas as pd
import sqlalchemy
from sqlalchemy import create_engine, text
import logging

# Add pandas-ai to path
sys.path.append('/Users/chris/TraderAI/pandas-ai-service')
from pandas_ai_service import PandasAIService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TablePlusIntegration:
    """Integration with TablePlus for database operations"""
    
    def __init__(self, connection_config: Dict[str, str]):
        self.config = connection_config
        self.connection_name = connection_config.get('name', 'TraderAI')
    
    def is_available(self) -> bool:
        """Check if TablePlus is installed and accessible"""
        try:
            result = subprocess.run(['which', 'tableplus'], 
                                  capture_output=True, text=True)
            return result.returncode == 0
        except Exception:
            return False
    
    def create_connection_file(self) -> str:
        """Create TablePlus connection file"""
        connection_data = {
            "DatabaseType": "PostgreSQL",
            "ConnectionName": self.config.get('name', 'TraderAI'),
            "Server": self.config.get('host', 'localhost'),
            "Port": self.config.get('port', 5432),
            "Username": self.config.get('user', 'trader_ai_user'),
            "Database": self.config.get('database', 'trader_ai'),
            "UseSSL": False,
            "TrustServerCertificate": True
        }
        
        # Create temporary connection file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(connection_data, f, indent=2)
            return f.name
    
    def open_with_query(self, query: str) -> Dict[str, Any]:
        """Open TablePlus with a pre-loaded query"""
        if not self.is_available():
            return {'success': False, 'error': 'TablePlus not available'}
        
        try:
            # Create query file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                f.write(query)
                query_file = f.name
            
            # Launch TablePlus with connection and query
            cmd = [
                'tableplus',
                '--connection', self.connection_name,
                '--query', query_file
            ]
            
            subprocess.Popen(cmd)
            
            return {
                'success': True,
                'message': 'TablePlus opened with query',
                'query_file': query_file
            }
            
        except Exception as e:
            logger.error(f"Failed to open TablePlus: {e}")
            return {'success': False, 'error': str(e)}
    
    def export_query_results(self, query: str, output_path: str, 
                           format: str = 'csv') -> Dict[str, Any]:
        """Export query results directly from database"""
        try:
            # Create database connection
            db_url = f"postgresql://{self.config['user']}@{self.config['host']}:{self.config['port']}/{self.config['database']}"
            engine = create_engine(db_url)
            
            # Execute query and export
            df = pd.read_sql(query, engine)
            
            if format.lower() == 'csv':
                df.to_csv(output_path, index=False)
            elif format.lower() == 'json':
                df.to_json(output_path, orient='records', indent=2)
            elif format.lower() == 'excel':
                df.to_excel(output_path, index=False)
            else:
                return {'success': False, 'error': f'Unsupported format: {format}'}
            
            return {
                'success': True,
                'output_path': output_path,
                'rows_exported': len(df),
                'format': format
            }
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return {'success': False, 'error': str(e)}


class QueryOptimizer:
    """Optimize queries based on context and user preferences"""
    
    def __init__(self, db_engine):
        self.engine = db_engine
        self.optimization_templates = self._load_optimization_templates()
    
    def _load_optimization_templates(self) -> Dict[str, Any]:
        """Load query optimization templates"""
        return {
            'add_limits': {
                'description': 'Add LIMIT clause for large result sets',
                'condition': lambda q: 'LIMIT' not in q.upper() and 'FROM' in q.upper(),
                'transform': lambda q: f"{q.rstrip(';')} LIMIT 1000;"
            },
            'add_indexes_hint': {
                'description': 'Suggest using indexed columns',
                'indexed_columns': ['timestamp', 'symbol', 'coherenceScores'],
                'suggestion': 'Consider filtering by timestamp, symbol, or coherenceScores for better performance'
            },
            'optimize_time_range': {
                'description': 'Optimize time-based queries',
                'condition': lambda q: 'timestamp' in q.lower(),
                'suggestion': 'Use specific time ranges (e.g., INTERVAL \'1 hour\') for better performance'
            }
        }
    
    def optimize_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Optimize query based on patterns and context"""
        suggestions = []
        optimized_query = query
        
        # Apply optimization templates
        for template_name, template in self.optimization_templates.items():
            if 'condition' in template and template['condition'](query):
                if 'transform' in template:
                    optimized_query = template['transform'](optimized_query)
                    suggestions.append(f"Applied {template_name}: {template['description']}")
                elif 'suggestion' in template:
                    suggestions.append(f"{template_name}: {template['suggestion']}")
        
        # Estimate query performance
        performance_estimate = self._estimate_performance(optimized_query)
        
        return {
            'original_query': query,
            'optimized_query': optimized_query,
            'suggestions': suggestions,
            'performance_estimate': performance_estimate,
            'optimization_applied': optimized_query != query
        }
    
    def _estimate_performance(self, query: str) -> Dict[str, Any]:
        """Estimate query performance"""
        try:
            # Use EXPLAIN to get query plan
            explain_query = f"EXPLAIN (ANALYZE false, BUFFERS false) {query}"
            with self.engine.connect() as conn:
                result = conn.execute(text(explain_query))
                plan = [row[0] for row in result]
            
            # Analyze plan for performance indicators
            performance_indicators = {
                'uses_index': any('Index' in line for line in plan),
                'has_sort': any('Sort' in line for line in plan),
                'has_join': any('Join' in line for line in plan),
                'estimated_complexity': 'low'
            }
            
            # Determine complexity
            if performance_indicators['has_join'] and performance_indicators['has_sort']:
                performance_indicators['estimated_complexity'] = 'high'
            elif performance_indicators['has_join'] or performance_indicators['has_sort']:
                performance_indicators['estimated_complexity'] = 'medium'
            
            return performance_indicators
            
        except Exception as e:
            logger.warning(f"Could not estimate performance: {e}")
            return {'estimated_complexity': 'unknown', 'error': str(e)}


class IntegrationBridge:
    """Main integration bridge connecting all tools"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or self._load_default_config()
        self.tableplus = TablePlusIntegration(self.config['database'])
        self.pandasai = PandasAIService()
        
        # Initialize database connection
        db_url = self._build_db_url()
        self.db_engine = create_engine(db_url)
        self.query_optimizer = QueryOptimizer(self.db_engine)
        
        logger.info("Integration bridge initialized successfully")
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            'database': {
                'name': 'TraderAI',
                'host': os.getenv('DB_HOST', 'localhost'),
                'port': int(os.getenv('DB_PORT', 5432)),
                'user': os.getenv('DB_USER', 'trader_ai_user'),
                'database': os.getenv('DB_NAME', 'trader_ai'),
                'password': os.getenv('DB_PASSWORD', '')
            },
            'preferences': {
                'auto_optimize': True,
                'explain_queries': True,
                'cache_results': True,
                'export_format': 'csv'
            }
        }
    
    def _build_db_url(self) -> str:
        """Build database URL for SQLAlchemy"""
        db_config = self.config['database']
        password_part = f":{db_config['password']}" if db_config.get('password') else ""
        return (f"postgresql://{db_config['user']}{password_part}@"
                f"{db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    def execute_workflow_step(self, step_config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a workflow step with integrated tools"""
        step_name = step_config.get('name', 'Unknown Step')
        query = step_config.get('query', '')
        execution_method = step_config.get('method', 'tableplus')  # tableplus, pandas_ai, direct
        
        logger.info(f"Executing workflow step: {step_name}")
        
        result = {
            'step_name': step_name,
            'execution_method': execution_method,
            'started_at': datetime.now().isoformat()
        }
        
        try:
            if execution_method == 'tableplus':
                result.update(self._execute_with_tableplus(query, step_config))
            elif execution_method == 'pandas_ai':
                result.update(self._execute_with_pandasai(query, step_config))
            elif execution_method == 'direct':
                result.update(self._execute_direct(query, step_config))
            else:
                result.update({
                    'success': False,
                    'error': f'Unknown execution method: {execution_method}'
                })
                
        except Exception as e:
            logger.error(f"Step execution failed: {e}")
            result.update({
                'success': False,
                'error': str(e)
            })
        
        result['completed_at'] = datetime.now().isoformat()
        return result
    
    def _execute_with_tableplus(self, query: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute step using TablePlus"""
        # Optimize query if enabled
        if self.config['preferences']['auto_optimize']:
            optimization = self.query_optimizer.optimize_query(query)
            query = optimization['optimized_query']
            
            if optimization['optimization_applied']:
                logger.info("Query optimized for TablePlus execution")
        
        # Open TablePlus with query
        result = self.tableplus.open_with_query(query)
        
        if result['success']:
            result['instructions'] = [
                "1. TablePlus has opened with your query loaded",
                "2. Review the query in the editor",
                "3. Execute with Cmd+Enter",
                "4. Review results for accuracy",
                "5. Export if needed using File > Export"
            ]
            
            # Auto-export if configured
            if config.get('auto_export', False):
                export_path = self._generate_export_path(config.get('name', 'query_result'))
                export_result = self.tableplus.export_query_results(
                    query, export_path, config.get('export_format', 'csv')
                )
                result['export_result'] = export_result
        
        return result
    
    def _execute_with_pandasai(self, query: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute step using PandasAI natural language processing"""
        # Convert SQL query to natural language instruction if needed
        if query.strip().upper().startswith('SELECT'):
            nl_query = self._sql_to_natural_language(query)
        else:
            nl_query = query
        
        logger.info(f"Executing PandasAI query: {nl_query}")
        
        # Get symbols and timeframe from config or use defaults
        symbols = config.get('symbols', ['AAPL', 'TSLA', 'NVDA', 'MSFT'])
        timeframe = config.get('timeframe', '24h')
        
        try:
            result = self.pandasai.analyze_market_data(
                query=nl_query,
                symbols=symbols,
                timeframe=timeframe
            )
            
            # Add execution method info
            result['execution_method'] = 'pandas_ai'
            result['natural_language_query'] = nl_query
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'PandasAI execution failed: {str(e)}',
                'natural_language_query': nl_query
            }
    
    def _execute_direct(self, query: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute query directly against database"""
        try:
            # Optimize query if enabled
            if self.config['preferences']['auto_optimize']:
                optimization = self.query_optimizer.optimize_query(query)
                query = optimization['optimized_query']
            
            # Execute query
            df = pd.read_sql(query, self.db_engine)
            
            result = {
                'success': True,
                'rows_returned': len(df),
                'columns': list(df.columns),
                'preview': df.head(5).to_dict('records') if not df.empty else []
            }
            
            # Export results if requested
            if config.get('auto_export', False):
                export_path = self._generate_export_path(config.get('name', 'query_result'))
                df.to_csv(export_path, index=False)
                result['exported_to'] = export_path
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Direct execution failed: {str(e)}'
            }
    
    def _sql_to_natural_language(self, sql_query: str) -> str:
        """Convert SQL query to natural language for PandasAI"""
        # Simple conversion heuristics
        sql_lower = sql_query.lower()
        
        if 'coherencescores' in sql_lower:
            if 'avg(' in sql_lower:
                return "What are the average coherence scores by symbol?"
            elif 'max(' in sql_lower:
                return "What are the highest coherence scores for each symbol?"
            else:
                return "Show me the coherence scores data"
        
        if 'price' in sql_lower and 'volume' in sql_lower:
            return "Analyze price and volume patterns in the market data"
        
        if 'timestamp' in sql_lower and 'order by timestamp' in sql_lower:
            return "Show me the recent market data ordered by time"
        
        # Default fallback
        return "Analyze the market data based on this SQL query structure"
    
    def _generate_export_path(self, base_name: str) -> str:
        """Generate export file path"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{base_name}_{timestamp}.csv"
        export_dir = "/Users/chris/TraderAI/database/exports"
        os.makedirs(export_dir, exist_ok=True)
        return os.path.join(export_dir, filename)
    
    def create_analysis_dashboard(self, analysis_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a unified dashboard from multiple analysis results"""
        dashboard_data = {
            'created_at': datetime.now().isoformat(),
            'total_analyses': len(analysis_results),
            'summary': {
                'successful_steps': sum(1 for r in analysis_results if r.get('success')),
                'failed_steps': sum(1 for r in analysis_results if not r.get('success')),
                'total_rows_processed': sum(r.get('rows_returned', 0) for r in analysis_results)
            },
            'results': analysis_results
        }
        
        # Generate dashboard HTML
        dashboard_html = self._generate_dashboard_html(dashboard_data)
        dashboard_path = self._generate_export_path('analysis_dashboard')
        dashboard_path = dashboard_path.replace('.csv', '.html')
        
        with open(dashboard_path, 'w') as f:
            f.write(dashboard_html)
        
        return {
            'success': True,
            'dashboard_path': dashboard_path,
            'summary': dashboard_data['summary']
        }
    
    def _generate_dashboard_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML dashboard"""
        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TraderAI Analysis Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .metric {{ background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }}
                .metric-value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
                .metric-label {{ color: #7f8c8d; font-size: 14px; }}
                .results {{ margin-top: 20px; }}
                .result-item {{ background: #ffffff; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; margin-bottom: 15px; }}
                .success {{ border-left: 4px solid #28a745; }}
                .error {{ border-left: 4px solid #dc3545; }}
                .timestamp {{ color: #6c757d; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>TraderAI Analysis Dashboard</h1>
                    <p class="timestamp">Generated: {data['created_at']}</p>
                </div>
                
                <div class="summary">
                    <div class="metric">
                        <div class="metric-value">{data['summary']['successful_steps']}</div>
                        <div class="metric-label">Successful Steps</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{data['summary']['failed_steps']}</div>
                        <div class="metric-label">Failed Steps</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{data['summary']['total_rows_processed']:,}</div>
                        <div class="metric-label">Total Rows Processed</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{data['total_analyses']}</div>
                        <div class="metric-label">Total Analyses</div>
                    </div>
                </div>
                
                <div class="results">
                    <h2>Analysis Results</h2>
        """
        
        for result in data['results']:
            status_class = 'success' if result.get('success') else 'error'
            html_template += f"""
                    <div class="result-item {status_class}">
                        <h3>{result.get('step_name', 'Unknown Step')}</h3>
                        <p><strong>Method:</strong> {result.get('execution_method', 'Unknown')}</p>
                        <p><strong>Status:</strong> {'Success' if result.get('success') else 'Failed'}</p>
                        {f"<p><strong>Rows:</strong> {result.get('rows_returned', 'N/A')}</p>" if result.get('rows_returned') else ""}
                        {f"<p><strong>Error:</strong> {result.get('error')}</p>" if result.get('error') else ""}
                        <p class="timestamp">Completed: {result.get('completed_at', 'Unknown')}</p>
                    </div>
            """
        
        html_template += """
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_template
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all integrated tools"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'tools': {}
        }
        
        # Check TablePlus
        status['tools']['tableplus'] = {
            'available': self.tableplus.is_available(),
            'connection_configured': bool(self.config.get('database'))
        }
        
        # Check PandasAI
        try:
            # Simple test to see if PandasAI is working
            test_df = pd.DataFrame({'test': [1, 2, 3]})
            status['tools']['pandas_ai'] = {
                'available': True,
                'service_initialized': hasattr(self.pandasai, 'llm')
            }
        except Exception as e:
            status['tools']['pandas_ai'] = {
                'available': False,
                'error': str(e)
            }
        
        # Check Database Connection
        try:
            with self.db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            status['tools']['database'] = {
                'available': True,
                'connected': True
            }
        except Exception as e:
            status['tools']['database'] = {
                'available': False,
                'error': str(e)
            }
        
        return status


def main():
    """Command-line interface for integration bridge"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TraderAI Integration Bridge')
    parser.add_argument('action', choices=['status', 'test', 'execute'])
    parser.add_argument('--query', help='SQL query to execute')
    parser.add_argument('--method', choices=['tableplus', 'pandas_ai', 'direct'], 
                       default='tableplus', help='Execution method')
    parser.add_argument('--config', help='Configuration file path')
    
    args = parser.parse_args()
    
    # Load configuration
    config = None
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    # Initialize bridge
    bridge = IntegrationBridge(config)
    
    if args.action == 'status':
        status = bridge.get_integration_status()
        print(json.dumps(status, indent=2))
    
    elif args.action == 'test':
        # Run test queries with each method
        test_query = "SELECT COUNT(*) as total_records FROM \"MarketData\" WHERE timestamp > NOW() - INTERVAL '1 hour'"
        
        methods = ['direct', 'tableplus', 'pandas_ai']
        results = []
        
        for method in methods:
            print(f"\nTesting {method} method...")
            step_config = {
                'name': f'Test {method}',
                'query': test_query,
                'method': method
            }
            result = bridge.execute_workflow_step(step_config)
            results.append(result)
            print(f"Result: {result.get('success', False)}")
        
        # Create dashboard
        dashboard = bridge.create_analysis_dashboard(results)
        print(f"\nTest results dashboard: {dashboard.get('dashboard_path')}")
    
    elif args.action == 'execute':
        if not args.query:
            print("Error: --query required for execute action")
            return
        
        step_config = {
            'name': 'Manual Query Execution',
            'query': args.query,
            'method': args.method
        }
        
        result = bridge.execute_workflow_step(step_config)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()