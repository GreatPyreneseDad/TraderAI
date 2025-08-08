"""
TraderAI Database Workflow Manager
A user-friendly interface for integrating TablePlus, PandasAI, and optimized SQL queries
"""

import os
import json
import subprocess
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
from dataclasses import dataclass
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QueryComplexity(Enum):
    SIMPLE = "simple"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class AnalysisType(Enum):
    MARKET_OVERVIEW = "market_overview"
    COHERENCE_ANALYSIS = "coherence_analysis"
    PERFORMANCE_MONITORING = "performance_monitoring"
    ANOMALY_DETECTION = "anomaly_detection"
    TRADING_SIGNALS = "trading_signals"
    CUSTOM_QUERY = "custom_query"


@dataclass
class WorkflowStep:
    name: str
    description: str
    query: str
    expected_output: str
    complexity: QueryComplexity
    estimated_time: str
    prerequisites: List[str] = None


@dataclass
class WorkflowTemplate:
    name: str
    description: str
    analysis_type: AnalysisType
    steps: List[WorkflowStep]
    expected_duration: str
    skill_level: str


class DatabaseWorkflowManager:
    """Main workflow management class"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "/Users/chris/TraderAI/database/workflow-config.json"
        self.workflows_db = "/Users/chris/TraderAI/database/workflows.db"
        self.templates = {}
        self.user_preferences = {}
        
        # Initialize databases and load configuration
        self._initialize_databases()
        self._load_configuration()
        self._register_default_templates()
    
    def _initialize_databases(self):
        """Initialize SQLite database for workflow tracking"""
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        # Create workflow execution history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflow_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_name TEXT NOT NULL,
                user_id TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                status TEXT DEFAULT 'running',
                steps_completed INTEGER DEFAULT 0,
                total_steps INTEGER,
                results TEXT,
                notes TEXT
            )
        """)
        
        # Create user preferences table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                preferred_tool TEXT DEFAULT 'tableplus',
                complexity_level TEXT DEFAULT 'intermediate',
                auto_export BOOLEAN DEFAULT true,
                export_format TEXT DEFAULT 'csv',
                notification_enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create saved queries table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                name TEXT NOT NULL,
                description TEXT,
                query_text TEXT NOT NULL,
                category TEXT,
                is_favorite BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Workflow databases initialized successfully")
    
    def _load_configuration(self):
        """Load configuration from JSON file"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    self.user_preferences = config.get('user_preferences', {})
                logger.info("Configuration loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load configuration: {e}")
                self.user_preferences = self._get_default_preferences()
        else:
            self.user_preferences = self._get_default_preferences()
            self._save_configuration()
    
    def _get_default_preferences(self) -> Dict[str, Any]:
        """Return default user preferences"""
        return {
            'preferred_tool': 'tableplus',
            'complexity_level': 'intermediate',
            'auto_export': True,
            'export_format': 'csv',
            'notification_enabled': True,
            'tableplus_connection': {
                'name': 'TraderAI',
                'host': 'localhost',
                'port': 5432,
                'database': 'trader_ai',
                'user': 'trader_ai_user'
            }
        }
    
    def _save_configuration(self):
        """Save current configuration to file"""
        config = {'user_preferences': self.user_preferences}
        with open(self.config_path, 'w') as f:
            json.dump(config, f, indent=2)
        logger.info("Configuration saved")
    
    def _register_default_templates(self):
        """Register default workflow templates"""
        
        # Market Overview Template
        market_overview = WorkflowTemplate(
            name="Daily Market Overview",
            description="Get a comprehensive overview of market conditions and coherence patterns",
            analysis_type=AnalysisType.MARKET_OVERVIEW,
            expected_duration="5-10 minutes",
            skill_level="Beginner",
            steps=[
                WorkflowStep(
                    name="Current Market Snapshot",
                    description="View real-time market data with coherence scores",
                    query="""
                    SELECT * FROM v_realtime_market_snapshot 
                    ORDER BY composite_coherence DESC
                    LIMIT 20;
                    """,
                    expected_output="Table showing top 20 symbols by coherence",
                    complexity=QueryComplexity.SIMPLE,
                    estimated_time="1 minute"
                ),
                WorkflowStep(
                    name="Price Movement Analysis",
                    description="Analyze recent price movements and trends",
                    query="""
                    SELECT 
                        symbol,
                        composite_coherence,
                        price_change_5m,
                        price_change_pct_5m,
                        CASE 
                            WHEN price_change_pct_5m > 2 THEN 'Strong Up'
                            WHEN price_change_pct_5m > 0.5 THEN 'Moderate Up'
                            WHEN price_change_pct_5m < -2 THEN 'Strong Down'
                            WHEN price_change_pct_5m < -0.5 THEN 'Moderate Down'
                            ELSE 'Stable'
                        END as trend
                    FROM v_realtime_market_snapshot
                    WHERE price_change_pct_5m IS NOT NULL
                    ORDER BY ABS(price_change_pct_5m) DESC;
                    """,
                    expected_output="Market movements categorized by trend strength",
                    complexity=QueryComplexity.SIMPLE,
                    estimated_time="2 minutes"
                ),
                WorkflowStep(
                    name="Coherence Correlation Analysis",
                    description="Examine correlations between different symbols",
                    query="SELECT * FROM v_coherence_correlation LIMIT 15;",
                    expected_output="Correlation matrix for coherence scores",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="2 minutes"
                )
            ]
        )
        
        # Coherence Deep Dive Template
        coherence_analysis = WorkflowTemplate(
            name="Coherence Deep Dive",
            description="Detailed analysis of coherence patterns and market consciousness indicators",
            analysis_type=AnalysisType.COHERENCE_ANALYSIS,
            expected_duration="10-15 minutes",
            skill_level="Intermediate",
            steps=[
                WorkflowStep(
                    name="Pattern Detection",
                    description="Identify significant coherence patterns",
                    query="SELECT * FROM detect_coherence_patterns('AAPL', '2 hours');",
                    expected_output="List of detected patterns with timestamps",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Multi-Symbol Pattern Analysis",
                    description="Detect patterns across multiple symbols",
                    query="""
                    WITH symbol_patterns AS (
                        SELECT * FROM detect_coherence_patterns('AAPL', '2 hours')
                        UNION ALL
                        SELECT * FROM detect_coherence_patterns('TSLA', '2 hours')
                        UNION ALL
                        SELECT * FROM detect_coherence_patterns('NVDA', '2 hours')
                    )
                    SELECT 
                        pattern_type,
                        COUNT(*) as occurrence_count,
                        AVG(composite_score) as avg_score,
                        AVG(duration_minutes) as avg_duration
                    FROM symbol_patterns
                    GROUP BY pattern_type
                    ORDER BY occurrence_count DESC;
                    """,
                    expected_output="Summary of pattern occurrences across major stocks",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="4 minutes"
                ),
                WorkflowStep(
                    name="Time Series Coherence",
                    description="Analyze coherence trends over time",
                    query="""
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        symbol,
                        AVG((coherenceScores->>'psi')::float) as avg_psi,
                        AVG((coherenceScores->>'rho')::float) as avg_rho,
                        AVG((coherenceScores->>'q')::float) as avg_q,
                        AVG((coherenceScores->>'f')::float) as avg_f
                    FROM "MarketData"
                    WHERE timestamp > NOW() - INTERVAL '24 hours'
                      AND symbol IN ('AAPL', 'TSLA', 'NVDA', 'MSFT')
                    GROUP BY DATE_TRUNC('hour', timestamp), symbol
                    ORDER BY hour DESC, symbol;
                    """,
                    expected_output="Hourly coherence trends for major stocks",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                )
            ]
        )
        
        # System Performance Template
        performance_monitoring = WorkflowTemplate(
            name="System Performance Check",
            description="Monitor system health, performance, and data quality",
            analysis_type=AnalysisType.PERFORMANCE_MONITORING,
            expected_duration="8-12 minutes",
            skill_level="Advanced",
            steps=[
                WorkflowStep(
                    name="System Health Overview",
                    description="Check overall system status",
                    query="SELECT * FROM v_system_performance ORDER BY performance_score;",
                    expected_output="System performance dashboard",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="2 minutes"
                ),
                WorkflowStep(
                    name="Query Performance Analysis",
                    description="Analyze database query performance",
                    query="SELECT * FROM track_query_performance();",
                    expected_output="Top queries by execution time",
                    complexity=QueryComplexity.ADVANCED,
                    estimated_time="3 minutes"
                ),
                WorkflowStep(
                    name="Alert Frequency Analysis",
                    description="Check alert patterns and anomalies",
                    query="SELECT * FROM v_alert_frequency_analysis WHERE hour > NOW() - INTERVAL '6 hours';",
                    expected_output="Recent alert patterns and anomalies",
                    complexity=QueryComplexity.INTERMEDIATE,
                    estimated_time="3 minutes"
                )
            ]
        )
        
        # Register templates
        self.templates = {
            "market_overview": market_overview,
            "coherence_analysis": coherence_analysis,
            "performance_monitoring": performance_monitoring
        }
        
        logger.info(f"Registered {len(self.templates)} workflow templates")
    
    def list_available_workflows(self) -> List[Dict[str, Any]]:
        """List all available workflow templates"""
        workflows = []
        for key, template in self.templates.items():
            workflows.append({
                'id': key,
                'name': template.name,
                'description': template.description,
                'analysis_type': template.analysis_type.value,
                'skill_level': template.skill_level,
                'duration': template.expected_duration,
                'steps_count': len(template.steps)
            })
        return workflows
    
    def get_workflow_details(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific workflow"""
        if workflow_id not in self.templates:
            return None
        
        template = self.templates[workflow_id]
        return {
            'id': workflow_id,
            'name': template.name,
            'description': template.description,
            'analysis_type': template.analysis_type.value,
            'skill_level': template.skill_level,
            'duration': template.expected_duration,
            'steps': [
                {
                    'name': step.name,
                    'description': step.description,
                    'complexity': step.complexity.value,
                    'estimated_time': step.estimated_time,
                    'expected_output': step.expected_output,
                    'query_preview': step.query[:100] + "..." if len(step.query) > 100 else step.query
                }
                for step in template.steps
            ]
        }
    
    def start_workflow(self, workflow_id: str, user_id: str = "default") -> Dict[str, Any]:
        """Start executing a workflow"""
        if workflow_id not in self.templates:
            return {'success': False, 'error': f'Workflow {workflow_id} not found'}
        
        template = self.templates[workflow_id]
        
        # Record workflow start in database
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO workflow_executions (workflow_name, user_id, total_steps, status)
            VALUES (?, ?, ?, 'started')
        """, (workflow_id, user_id, len(template.steps)))
        
        execution_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Generate execution instructions
        instructions = self._generate_execution_instructions(template, execution_id)
        
        return {
            'success': True,
            'execution_id': execution_id,
            'workflow_name': template.name,
            'total_steps': len(template.steps),
            'instructions': instructions
        }
    
    def _generate_execution_instructions(self, template: WorkflowTemplate, execution_id: int) -> Dict[str, Any]:
        """Generate step-by-step execution instructions"""
        return {
            'workflow_name': template.name,
            'description': template.description,
            'execution_id': execution_id,
            'estimated_duration': template.expected_duration,
            'tool_setup': self._get_tool_setup_instructions(),
            'steps': [
                {
                    'step_number': i + 1,
                    'name': step.name,
                    'description': step.description,
                    'complexity': step.complexity.value,
                    'estimated_time': step.estimated_time,
                    'instructions': self._generate_step_instructions(step),
                    'expected_output': step.expected_output,
                    'validation': self._generate_validation_instructions(step)
                }
                for i, step in enumerate(template.steps)
            ],
            'completion_checklist': self._generate_completion_checklist(template)
        }
    
    def _get_tool_setup_instructions(self) -> Dict[str, Any]:
        """Generate tool setup instructions based on preferences"""
        tool = self.user_preferences.get('preferred_tool', 'tableplus')
        
        if tool == 'tableplus':
            return {
                'tool': 'TablePlus',
                'steps': [
                    "1. Open TablePlus application",
                    "2. Connect to TraderAI database (use saved connection or create new)",
                    "3. Verify connection is working by running: SELECT NOW();",
                    "4. Open a new query tab for the workflow",
                    "5. Set up export preferences if needed"
                ],
                'connection_details': self.user_preferences.get('tableplus_connection', {})
            }
        else:
            return {
                'tool': 'PostgreSQL CLI',
                'steps': [
                    "1. Open terminal",
                    "2. Connect using: psql -h localhost -d trader_ai -U trader_ai_user",
                    "3. Test connection with: \\dt",
                    "4. Set up output formatting: \\pset format aligned"
                ]
            }
    
    def _generate_step_instructions(self, step: WorkflowStep) -> Dict[str, Any]:
        """Generate detailed instructions for a workflow step"""
        return {
            'query': step.query,
            'execution_steps': [
                f"1. Copy and paste the following query into {self.user_preferences.get('preferred_tool', 'TablePlus')}:",
                "2. Execute the query (Cmd+Enter in TablePlus)",
                "3. Review the results for accuracy",
                "4. Export results if needed (optional)",
                f"5. Verify the output matches expected format: {step.expected_output}"
            ],
            'troubleshooting': [
                "• If query fails, check database connection",
                "• Verify all required tables exist",
                "• Check for typos in the query",
                "• Ensure proper permissions"
            ]
        }
    
    def _generate_validation_instructions(self, step: WorkflowStep) -> Dict[str, Any]:
        """Generate validation instructions for step results"""
        return {
            'expected_output': step.expected_output,
            'validation_checks': [
                "✓ Query executed without errors",
                "✓ Results returned within expected timeframe",
                "✓ Output format matches description",
                "✓ Data appears reasonable (no obvious errors)"
            ],
            'common_issues': [
                "Empty results: Check if data exists for specified time period",
                "Timeout errors: Try reducing time range or adding LIMIT",
                "Permission errors: Verify database access rights"
            ]
        }
    
    def _generate_completion_checklist(self, template: WorkflowTemplate) -> List[str]:
        """Generate workflow completion checklist"""
        return [
            f"✓ All {len(template.steps)} steps completed successfully",
            "✓ Results reviewed and validated",
            "✓ Key findings documented",
            "✓ Data exported if required",
            "✓ Any anomalies or issues noted",
            "✓ Next actions identified (if any)"
        ]
    
    def record_step_completion(self, execution_id: int, step_number: int, 
                            results: str = None, notes: str = None) -> Dict[str, Any]:
        """Record completion of a workflow step"""
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        # Update steps completed
        cursor.execute("""
            UPDATE workflow_executions 
            SET steps_completed = ?, notes = COALESCE(notes || '; ', '') || ?
            WHERE id = ?
        """, (step_number, notes or f"Step {step_number} completed", execution_id))
        
        # Check if workflow is complete
        cursor.execute("""
            SELECT steps_completed, total_steps FROM workflow_executions WHERE id = ?
        """, (execution_id,))
        
        row = cursor.fetchone()
        if row and row[0] >= row[1]:
            cursor.execute("""
                UPDATE workflow_executions 
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (execution_id,))
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'execution_id': execution_id,
            'step_completed': step_number,
            'is_workflow_complete': row and row[0] >= row[1]
        }
    
    def get_execution_status(self, execution_id: int) -> Dict[str, Any]:
        """Get current status of workflow execution"""
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT workflow_name, started_at, completed_at, status, 
                   steps_completed, total_steps, notes
            FROM workflow_executions WHERE id = ?
        """, (execution_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return {'success': False, 'error': 'Execution not found'}
        
        return {
            'success': True,
            'execution_id': execution_id,
            'workflow_name': row[0],
            'started_at': row[1],
            'completed_at': row[2],
            'status': row[3],
            'progress': f"{row[4]}/{row[5]}",
            'progress_percentage': int((row[4] / row[5]) * 100) if row[5] > 0 else 0,
            'notes': row[6]
        }
    
    def export_workflow_results(self, execution_id: int, format: str = 'json') -> Dict[str, Any]:
        """Export workflow execution results"""
        try:
            # Get execution details
            status = self.get_execution_status(execution_id)
            if not status['success']:
                return status
            
            # Prepare export data
            export_data = {
                'workflow_execution': status,
                'exported_at': datetime.now().isoformat(),
                'export_format': format
            }
            
            # Create export filename
            workflow_name = status['workflow_name'].replace(' ', '_').lower()
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{workflow_name}_execution_{execution_id}_{timestamp}.{format}"
            export_path = f"/Users/chris/TraderAI/database/exports/{filename}"
            
            # Ensure export directory exists
            os.makedirs(os.path.dirname(export_path), exist_ok=True)
            
            # Export based on format
            if format == 'json':
                with open(export_path, 'w') as f:
                    json.dump(export_data, f, indent=2)
            else:
                return {'success': False, 'error': f'Unsupported format: {format}'}
            
            return {
                'success': True,
                'export_path': export_path,
                'filename': filename
            }
            
        except Exception as e:
            logger.error(f"Export error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def save_custom_query(self, name: str, query: str, description: str = None, 
                         user_id: str = "default") -> Dict[str, Any]:
        """Save a custom query for reuse"""
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO saved_queries (user_id, name, description, query_text, category)
                VALUES (?, ?, ?, ?, 'custom')
            """, (user_id, name, description, query))
            
            query_id = cursor.lastrowid
            conn.commit()
            
            return {
                'success': True,
                'query_id': query_id,
                'message': 'Query saved successfully'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def get_saved_queries(self, user_id: str = "default") -> List[Dict[str, Any]]:
        """Get all saved queries for a user"""
        conn = sqlite3.connect(self.workflows_db)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description, category, is_favorite, created_at
            FROM saved_queries WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
        
        queries = []
        for row in cursor.fetchall():
            queries.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'category': row[3],
                'is_favorite': bool(row[4]),
                'created_at': row[5]
            })
        
        conn.close()
        return queries


def main():
    """Main function for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TraderAI Database Workflow Manager')
    parser.add_argument('action', choices=['list', 'start', 'status', 'export'])
    parser.add_argument('--workflow', help='Workflow ID')
    parser.add_argument('--execution-id', type=int, help='Execution ID')
    parser.add_argument('--user-id', default='default', help='User ID')
    parser.add_argument('--format', default='json', help='Export format')
    
    args = parser.parse_args()
    
    manager = DatabaseWorkflowManager()
    
    if args.action == 'list':
        workflows = manager.list_available_workflows()
        print(json.dumps(workflows, indent=2))
    
    elif args.action == 'start':
        if not args.workflow:
            print("Error: --workflow required for start action")
            return
        result = manager.start_workflow(args.workflow, args.user_id)
        print(json.dumps(result, indent=2))
    
    elif args.action == 'status':
        if not args.execution_id:
            print("Error: --execution-id required for status action")
            return
        status = manager.get_execution_status(args.execution_id)
        print(json.dumps(status, indent=2))
    
    elif args.action == 'export':
        if not args.execution_id:
            print("Error: --execution-id required for export action")
            return
        result = manager.export_workflow_results(args.execution_id, args.format)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()