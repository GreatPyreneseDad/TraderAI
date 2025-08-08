"""
TraderAI Database Workflow Error Handler
Comprehensive error handling and user guidance system
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Callable, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import traceback
import re
import sqlite3


class ErrorType(Enum):
    CONNECTION_ERROR = "connection_error"
    QUERY_ERROR = "query_error"
    DATA_ERROR = "data_error"
    PERMISSION_ERROR = "permission_error"
    TIMEOUT_ERROR = "timeout_error"
    VALIDATION_ERROR = "validation_error"
    SYSTEM_ERROR = "system_error"
    USER_ERROR = "user_error"


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ErrorContext:
    """Context information for error analysis"""
    workflow_id: str = None
    step_name: str = None
    query: str = None
    user_id: str = None
    execution_method: str = None
    timestamp: str = None
    additional_info: Dict[str, Any] = None


@dataclass
class ErrorSolution:
    """Structured error solution"""
    title: str
    description: str
    steps: List[str]
    code_fix: str = None
    documentation_link: str = None
    estimated_fix_time: str = None
    requires_admin: bool = False


@dataclass
class HandledError:
    """Complete error handling result"""
    error_type: ErrorType
    severity: ErrorSeverity
    message: str
    technical_details: str
    user_friendly_message: str
    solutions: List[ErrorSolution]
    context: ErrorContext
    can_retry: bool
    should_escalate: bool


class DatabaseErrorHandler:
    """Main error handling system for database operations"""
    
    def __init__(self, log_path: str = "/Users/chris/TraderAI/database/error-logs.db"):
        self.log_path = log_path
        self._initialize_error_logging()
        self.error_patterns = self._initialize_error_patterns()
        self.solution_library = self._initialize_solution_library()
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def _initialize_error_logging(self):
        """Initialize SQLite database for error logging"""
        conn = sqlite3.connect(self.log_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                technical_details TEXT,
                context TEXT,
                workflow_id TEXT,
                step_name TEXT,
                user_id TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                resolution_time DATETIME,
                resolution_notes TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT UNIQUE NOT NULL,
                error_type TEXT NOT NULL,
                description TEXT,
                frequency INTEGER DEFAULT 1,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _initialize_error_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize common error patterns"""
        return {
            # Connection Errors
            r'connection.*refused': {
                'type': ErrorType.CONNECTION_ERROR,
                'severity': ErrorSeverity.HIGH,
                'title': 'Database Connection Refused',
                'user_message': 'Cannot connect to the database. The database server might be down or unreachable.'
            },
            r'authentication.*failed': {
                'type': ErrorType.PERMISSION_ERROR,
                'severity': ErrorSeverity.HIGH,
                'title': 'Database Authentication Failed',
                'user_message': 'Invalid database credentials. Please check your username and password.'
            },
            r'timeout.*expired': {
                'type': ErrorType.TIMEOUT_ERROR,
                'severity': ErrorSeverity.MEDIUM,
                'title': 'Query Timeout',
                'user_message': 'The query is taking too long to execute. Consider adding filters or limiting results.'
            },
            
            # Query Errors
            r'syntax.*error.*at.*position': {
                'type': ErrorType.QUERY_ERROR,
                'severity': ErrorSeverity.MEDIUM,
                'title': 'SQL Syntax Error',
                'user_message': 'There is a syntax error in your SQL query. Please check the query structure.'
            },
            r'column.*does not exist': {
                'type': ErrorType.QUERY_ERROR,
                'severity': ErrorSeverity.MEDIUM,
                'title': 'Column Not Found',
                'user_message': 'The query references a column that doesn\'t exist in the table.'
            },
            r'table.*does not exist': {
                'type': ErrorType.QUERY_ERROR,
                'severity': ErrorSeverity.HIGH,
                'title': 'Table Not Found',
                'user_message': 'The query references a table that doesn\'t exist in the database.'
            },
            
            # Data Errors
            r'division by zero': {
                'type': ErrorType.DATA_ERROR,
                'severity': ErrorSeverity.LOW,
                'title': 'Division by Zero',
                'user_message': 'A calculation in your query resulted in division by zero.'
            },
            r'invalid.*input.*syntax': {
                'type': ErrorType.DATA_ERROR,
                'severity': ErrorSeverity.MEDIUM,
                'title': 'Invalid Data Type',
                'user_message': 'The query contains data that doesn\'t match the expected type.'
            },
            
            # Permission Errors
            r'permission.*denied': {
                'type': ErrorType.PERMISSION_ERROR,
                'severity': ErrorSeverity.HIGH,
                'title': 'Insufficient Permissions',
                'user_message': 'You don\'t have permission to access this data or perform this operation.'
            },
            
            # System Errors
            r'out of memory': {
                'type': ErrorType.SYSTEM_ERROR,
                'severity': ErrorSeverity.CRITICAL,
                'title': 'Out of Memory',
                'user_message': 'The system ran out of memory while processing your request.'
            },
            r'disk.*full': {
                'type': ErrorType.SYSTEM_ERROR,
                'severity': ErrorSeverity.CRITICAL,
                'title': 'Disk Full',
                'user_message': 'The database server is running out of disk space.'
            }
        }
    
    def _initialize_solution_library(self) -> Dict[ErrorType, List[ErrorSolution]]:
        """Initialize solution library for different error types"""
        return {
            ErrorType.CONNECTION_ERROR: [
                ErrorSolution(
                    title="Check Database Service",
                    description="Verify that the PostgreSQL service is running",
                    steps=[
                        "1. Open Terminal or Command Prompt",
                        "2. Run: brew services list | grep postgres (on macOS)",
                        "3. If not running, start with: brew services start postgresql",
                        "4. Wait 30 seconds and try again"
                    ],
                    estimated_fix_time="2-3 minutes"
                ),
                ErrorSolution(
                    title="Verify Connection Settings",
                    description="Check database connection configuration",
                    steps=[
                        "1. Verify host is correct (usually localhost)",
                        "2. Check port number (default is 5432)",
                        "3. Confirm database name exists",
                        "4. Test connection with: psql -h localhost -d trader_ai -U trader_ai_user"
                    ],
                    estimated_fix_time="5 minutes"
                ),
                ErrorSolution(
                    title="Network Troubleshooting",
                    description="Check network connectivity",
                    steps=[
                        "1. Test network connection: ping localhost",
                        "2. Check if port is open: telnet localhost 5432",
                        "3. Verify firewall settings",
                        "4. Check VPN or proxy settings"
                    ],
                    estimated_fix_time="10-15 minutes",
                    requires_admin=True
                )
            ],
            
            ErrorType.QUERY_ERROR: [
                ErrorSolution(
                    title="Query Syntax Checker",
                    description="Use built-in query validation",
                    steps=[
                        "1. Copy query to a text editor",
                        "2. Check for matching parentheses and quotes",
                        "3. Verify table and column names exist",
                        "4. Use EXPLAIN to test query structure",
                        "5. Try simplifying the query first"
                    ],
                    code_fix="-- Add LIMIT clause for testing\nSELECT * FROM your_table LIMIT 10;",
                    estimated_fix_time="5-10 minutes"
                ),
                ErrorSolution(
                    title="Schema Reference Guide",
                    description="Check available tables and columns",
                    steps=[
                        "1. List all tables: \\dt in psql or use TablePlus schema view",
                        "2. Check table structure: \\d table_name",
                        "3. Verify column names match exactly (case-sensitive)",
                        "4. Check data types for compatibility"
                    ],
                    code_fix="-- Check table structure\n\\d \"MarketData\"\n-- List all columns\nSELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'MarketData';",
                    estimated_fix_time="3-5 minutes"
                )
            ],
            
            ErrorType.TIMEOUT_ERROR: [
                ErrorSolution(
                    title="Query Optimization",
                    description="Optimize slow queries",
                    steps=[
                        "1. Add WHERE clauses to filter data",
                        "2. Use specific time ranges (e.g., last 24 hours)",
                        "3. Add LIMIT clause to restrict results",
                        "4. Consider using indexed columns",
                        "5. Break complex queries into smaller parts"
                    ],
                    code_fix="-- Add time filter and limit\nSELECT * FROM \"MarketData\" \nWHERE timestamp > NOW() - INTERVAL '1 hour'\nLIMIT 1000;",
                    estimated_fix_time="10-15 minutes"
                ),
                ErrorSolution(
                    title="Database Performance Check",
                    description="Check database performance",
                    steps=[
                        "1. Run: SELECT * FROM pg_stat_activity;",
                        "2. Check for long-running queries",
                        "3. Monitor system resources (CPU, memory)",
                        "4. Consider running ANALYZE on tables",
                        "5. Check for missing indexes"
                    ],
                    estimated_fix_time="15-20 minutes",
                    requires_admin=True
                )
            ],
            
            ErrorType.PERMISSION_ERROR: [
                ErrorSolution(
                    title="Check User Permissions",
                    description="Verify database permissions",
                    steps=[
                        "1. Check current user: SELECT current_user;",
                        "2. List user permissions: \\du in psql",
                        "3. Verify table permissions: \\z table_name",
                        "4. Contact database administrator if needed"
                    ],
                    estimated_fix_time="5-10 minutes"
                ),
                ErrorSolution(
                    title="Grant Required Permissions",
                    description="Grant necessary permissions (admin only)",
                    steps=[
                        "1. Connect as superuser",
                        "2. Grant table permissions: GRANT SELECT ON table_name TO user;",
                        "3. Grant schema permissions: GRANT USAGE ON SCHEMA public TO user;",
                        "4. Test permissions with user account"
                    ],
                    code_fix="-- Grant permissions (run as admin)\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO trader_ai_user;\nGRANT USAGE ON SCHEMA public TO trader_ai_user;",
                    estimated_fix_time="5 minutes",
                    requires_admin=True
                )
            ],
            
            ErrorType.DATA_ERROR: [
                ErrorSolution(
                    title="Data Type Conversion",
                    description="Fix data type mismatches",
                    steps=[
                        "1. Check column data types",
                        "2. Use explicit type casting (::type)",
                        "3. Handle NULL values with COALESCE",
                        "4. Use NULLIF for division operations",
                        "5. Validate data before processing"
                    ],
                    code_fix="-- Safe division example\nSELECT \n  column1,\n  column2,\n  column1::float / NULLIF(column2, 0) as safe_division\nFROM your_table;",
                    estimated_fix_time="10 minutes"
                ),
                ErrorSolution(
                    title="Data Quality Check",
                    description="Identify and handle data quality issues",
                    steps=[
                        "1. Check for NULL values: SELECT COUNT(*) FROM table WHERE column IS NULL;",
                        "2. Identify outliers and anomalies",
                        "3. Verify data ranges and constraints",
                        "4. Clean or filter problematic data",
                        "5. Document data quality issues"
                    ],
                    estimated_fix_time="15-20 minutes"
                )
            ],
            
            ErrorType.SYSTEM_ERROR: [
                ErrorSolution(
                    title="System Resource Check",
                    description="Monitor and manage system resources",
                    steps=[
                        "1. Check available memory and CPU",
                        "2. Monitor disk space usage",
                        "3. Check database connection limits",
                        "4. Close unnecessary connections",
                        "5. Consider query optimization"
                    ],
                    estimated_fix_time="10-15 minutes",
                    requires_admin=True
                ),
                ErrorSolution(
                    title="Emergency Response",
                    description="Critical system error response",
                    steps=[
                        "1. Contact system administrator immediately",
                        "2. Document exact error message and time",
                        "3. Stop non-critical processes",
                        "4. Create incident report",
                        "5. Implement temporary workarounds if available"
                    ],
                    estimated_fix_time="30+ minutes",
                    requires_admin=True
                )
            ]
        }
    
    def handle_error(self, error: Exception, context: ErrorContext = None) -> HandledError:
        """Main error handling method"""
        try:
            # Extract error information
            error_message = str(error)
            error_type_obj = type(error).__name__
            
            # Analyze error pattern
            error_analysis = self._analyze_error_pattern(error_message)
            
            # Create handled error object
            handled_error = HandledError(
                error_type=error_analysis['type'],
                severity=error_analysis['severity'],
                message=error_message,
                technical_details=self._get_technical_details(error, context),
                user_friendly_message=error_analysis['user_message'],
                solutions=self._get_solutions(error_analysis['type'], error_message, context),
                context=context or ErrorContext(),
                can_retry=self._can_retry(error_analysis['type']),
                should_escalate=self._should_escalate(error_analysis['severity'])
            )
            
            # Log error
            self._log_error(handled_error)
            
            # Update pattern frequency
            self._update_pattern_frequency(error_message)
            
            return handled_error
            
        except Exception as handling_error:
            # Error in error handling - create fallback response
            self.logger.error(f"Error in error handling: {handling_error}")
            return self._create_fallback_error(error, context)
    
    def _analyze_error_pattern(self, error_message: str) -> Dict[str, Any]:
        """Analyze error message against known patterns"""
        error_lower = error_message.lower()
        
        for pattern, info in self.error_patterns.items():
            if re.search(pattern, error_lower):
                return {
                    'type': info['type'],
                    'severity': info['severity'],
                    'title': info['title'],
                    'user_message': info['user_message']
                }
        
        # Default fallback
        return {
            'type': ErrorType.SYSTEM_ERROR,
            'severity': ErrorSeverity.MEDIUM,
            'title': 'Unknown Error',
            'user_message': 'An unexpected error occurred. Please review the technical details or contact support.'
        }
    
    def _get_technical_details(self, error: Exception, context: ErrorContext = None) -> str:
        """Generate comprehensive technical details"""
        details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'timestamp': datetime.now().isoformat(),
            'stack_trace': traceback.format_exc()
        }
        
        if context:
            details['context'] = {
                'workflow_id': context.workflow_id,
                'step_name': context.step_name,
                'query': context.query[:500] + "..." if context.query and len(context.query) > 500 else context.query,
                'user_id': context.user_id,
                'execution_method': context.execution_method,
                'additional_info': context.additional_info
            }
        
        return json.dumps(details, indent=2)
    
    def _get_solutions(self, error_type: ErrorType, error_message: str, 
                      context: ErrorContext = None) -> List[ErrorSolution]:
        """Get relevant solutions for the error type"""
        solutions = self.solution_library.get(error_type, [])
        
        # Add context-specific solutions
        context_solutions = self._get_context_specific_solutions(error_type, error_message, context)
        
        return solutions + context_solutions
    
    def _get_context_specific_solutions(self, error_type: ErrorType, error_message: str,
                                      context: ErrorContext = None) -> List[ErrorSolution]:
        """Generate solutions based on specific error context"""
        solutions = []
        
        if context and context.query:
            # Query-specific solutions
            if "MarketData" in context.query and "does not exist" in error_message:
                solutions.append(ErrorSolution(
                    title="Table Name Case Sensitivity",
                    description="PostgreSQL table names are case-sensitive",
                    steps=[
                        "1. Check if table name is quoted correctly",
                        '2. Use double quotes: "MarketData" not MarketData',
                        "3. Verify table exists: \\dt in psql",
                        "4. Check schema: SELECT * FROM information_schema.tables;"
                    ],
                    code_fix='-- Correct table reference\nSELECT * FROM "MarketData" LIMIT 5;',
                    estimated_fix_time="2 minutes"
                ))
            
            if "coherenceScores" in context.query and "operator does not exist" in error_message:
                solutions.append(ErrorSolution(
                    title="JSON Operator Usage",
                    description="Correct JSON field access in PostgreSQL",
                    steps=[
                        "1. Use ->> for text extraction: coherenceScores->>'psi'",
                        "2. Cast to numeric: (coherenceScores->>'psi')::float",
                        "3. Check JSON structure with: SELECT coherenceScores FROM table LIMIT 1;",
                        "4. Verify field names are correct"
                    ],
                    code_fix="-- Correct JSON access\nSELECT (coherenceScores->>'psi')::float as psi FROM \"MarketData\";",
                    estimated_fix_time="3 minutes"
                ))
        
        if error_type == ErrorType.TIMEOUT_ERROR and context and context.execution_method == 'pandas_ai':
            solutions.append(ErrorSolution(
                title="PandasAI Timeout Optimization",
                description="Optimize PandasAI queries for better performance",
                steps=[
                    "1. Reduce timeframe: Use '1h' instead of '24h'",
                    "2. Limit symbols: Focus on 2-3 symbols maximum",
                    "3. Simplify question: Ask specific, focused questions",
                    "4. Use direct SQL for complex analysis",
                    "5. Enable caching in PandasAI configuration"
                ],
                estimated_fix_time="5 minutes"
            ))
        
        return solutions
    
    def _can_retry(self, error_type: ErrorType) -> bool:
        """Determine if error is retryable"""
        retryable_errors = {
            ErrorType.TIMEOUT_ERROR,
            ErrorType.CONNECTION_ERROR,
            ErrorType.SYSTEM_ERROR
        }
        return error_type in retryable_errors
    
    def _should_escalate(self, severity: ErrorSeverity) -> bool:
        """Determine if error should be escalated"""
        return severity in {ErrorSeverity.HIGH, ErrorSeverity.CRITICAL}
    
    def _log_error(self, handled_error: HandledError):
        """Log error to database and file"""
        try:
            conn = sqlite3.connect(self.log_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO error_log (
                    error_type, severity, message, technical_details, context,
                    workflow_id, step_name, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                handled_error.error_type.value,
                handled_error.severity.value,
                handled_error.message,
                handled_error.technical_details,
                json.dumps(handled_error.context.__dict__),
                handled_error.context.workflow_id,
                handled_error.context.step_name,
                handled_error.context.user_id
            ))
            
            conn.commit()
            conn.close()
            
            # Also log to application logger
            self.logger.error(f"Error handled: {handled_error.error_type.value} - {handled_error.message}")
            
        except Exception as log_error:
            self.logger.error(f"Failed to log error: {log_error}")
    
    def _update_pattern_frequency(self, error_message: str):
        """Update frequency count for error patterns"""
        try:
            conn = sqlite3.connect(self.log_path)
            cursor = conn.cursor()
            
            error_lower = error_message.lower()
            for pattern in self.error_patterns.keys():
                if re.search(pattern, error_lower):
                    cursor.execute("""
                        INSERT OR REPLACE INTO error_patterns (pattern, error_type, frequency, last_seen)
                        VALUES (?, ?, 
                                COALESCE((SELECT frequency FROM error_patterns WHERE pattern = ?), 0) + 1,
                                CURRENT_TIMESTAMP)
                    """, (pattern, self.error_patterns[pattern]['type'].value, pattern))
                    break
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.warning(f"Failed to update pattern frequency: {e}")
    
    def _create_fallback_error(self, error: Exception, context: ErrorContext = None) -> HandledError:
        """Create fallback error when error handling fails"""
        return HandledError(
            error_type=ErrorType.SYSTEM_ERROR,
            severity=ErrorSeverity.HIGH,
            message=str(error),
            technical_details=f"Original error: {str(error)}\nError type: {type(error).__name__}",
            user_friendly_message="An unexpected error occurred in the system. Please contact technical support.",
            solutions=[
                ErrorSolution(
                    title="Contact Support",
                    description="Report this error to technical support",
                    steps=[
                        "1. Copy the error message and technical details",
                        "2. Note what you were trying to do when the error occurred",
                        "3. Contact technical support with this information",
                        "4. Include your user ID and timestamp"
                    ],
                    estimated_fix_time="Varies"
                )
            ],
            context=context or ErrorContext(),
            can_retry=False,
            should_escalate=True
        )
    
    def format_error_for_user(self, handled_error: HandledError, include_technical: bool = False) -> str:
        """Format error for user display"""
        output = []
        
        # Header
        severity_emoji = {
            ErrorSeverity.LOW: "ℹ️",
            ErrorSeverity.MEDIUM: "⚠️",
            ErrorSeverity.HIGH: "❌",
            ErrorSeverity.CRITICAL: "🚨"
        }
        
        output.append(f"{severity_emoji[handled_error.severity]} {handled_error.error_type.value.replace('_', ' ').title()}")
        output.append("=" * 50)
        output.append("")
        
        # User-friendly message
        output.append("What happened:")
        output.append(handled_error.user_friendly_message)
        output.append("")
        
        # Context information
        if handled_error.context.workflow_id or handled_error.context.step_name:
            output.append("Where it happened:")
            if handled_error.context.workflow_id:
                output.append(f"  Workflow: {handled_error.context.workflow_id}")
            if handled_error.context.step_name:
                output.append(f"  Step: {handled_error.context.step_name}")
            output.append("")
        
        # Solutions
        if handled_error.solutions:
            output.append("How to fix it:")
            for i, solution in enumerate(handled_error.solutions, 1):
                output.append(f"\n{i}. {solution.title}")
                output.append(f"   {solution.description}")
                if solution.estimated_fix_time:
                    output.append(f"   Estimated time: {solution.estimated_fix_time}")
                if solution.requires_admin:
                    output.append("   ⚠️  Requires administrator access")
                
                output.append("   Steps:")
                for step in solution.steps:
                    output.append(f"   {step}")
                
                if solution.code_fix:
                    output.append("   Example fix:")
                    output.append("   ```sql")
                    output.append(f"   {solution.code_fix}")
                    output.append("   ```")
        
        # Retry information
        if handled_error.can_retry:
            output.append("\n✅ This error can be retried after applying fixes.")
        else:
            output.append("\n❌ This error requires fixes before retrying.")
        
        # Technical details (if requested)
        if include_technical:
            output.append("\nTechnical Details:")
            output.append("-" * 20)
            output.append(handled_error.technical_details)
        
        return "\n".join(output)
    
    def get_error_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get error statistics for the past N days"""
        try:
            conn = sqlite3.connect(self.log_path)
            cursor = conn.cursor()
            
            # Get error counts by type
            cursor.execute("""
                SELECT error_type, severity, COUNT(*) as count
                FROM error_log 
                WHERE timestamp > datetime('now', '-{} days')
                GROUP BY error_type, severity
                ORDER BY count DESC
            """.format(days))
            
            error_counts = cursor.fetchall()
            
            # Get most common patterns
            cursor.execute("""
                SELECT pattern, frequency, last_seen
                FROM error_patterns
                WHERE is_active = TRUE
                ORDER BY frequency DESC
                LIMIT 10
            """)
            
            common_patterns = cursor.fetchall()
            
            # Get resolution rate
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN resolved = TRUE THEN 1 END) as resolved_errors
                FROM error_log
                WHERE timestamp > datetime('now', '-{} days')
            """.format(days))
            
            resolution_stats = cursor.fetchone()
            
            conn.close()
            
            return {
                'period_days': days,
                'error_counts': [
                    {'type': row[0], 'severity': row[1], 'count': row[2]}
                    for row in error_counts
                ],
                'common_patterns': [
                    {'pattern': row[0], 'frequency': row[1], 'last_seen': row[2]}
                    for row in common_patterns
                ],
                'resolution_rate': {
                    'total_errors': resolution_stats[0] if resolution_stats else 0,
                    'resolved_errors': resolution_stats[1] if resolution_stats else 0,
                    'rate_percentage': (resolution_stats[1] / resolution_stats[0] * 100) if resolution_stats and resolution_stats[0] > 0 else 0
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get error statistics: {e}")
            return {'error': 'Failed to retrieve statistics'}


class UserGuidanceSystem:
    """User guidance and help system"""
    
    def __init__(self, error_handler: DatabaseErrorHandler):
        self.error_handler = error_handler
        self.help_topics = self._initialize_help_topics()
        
    def _initialize_help_topics(self) -> Dict[str, Dict[str, Any]]:
        """Initialize help topics"""
        return {
            'getting_started': {
                'title': 'Getting Started with TraderAI Database Workflows',
                'description': 'Learn the basics of using the database workflow system',
                'sections': {
                    'overview': 'The TraderAI database workflow system helps you analyze market data without needing to write complex SQL queries.',
                    'tools': 'We support three main tools: TablePlus (recommended for beginners), PandasAI (for natural language queries), and direct SQL execution.',
                    'first_steps': [
                        '1. Choose a workflow template from the available options',
                        '2. Follow the step-by-step instructions provided',
                        '3. Execute queries in your preferred tool',
                        '4. Review and export results as needed'
                    ]
                }
            },
            'tableplus_setup': {
                'title': 'Setting Up TablePlus',
                'description': 'Configure TablePlus for TraderAI database access',
                'sections': {
                    'installation': 'Download TablePlus from https://tableplus.com and install it on your system.',
                    'connection': [
                        '1. Open TablePlus',
                        '2. Click "Create a new connection"',
                        '3. Select PostgreSQL',
                        '4. Enter connection details:',
                        '   - Name: TraderAI',
                        '   - Host: localhost',
                        '   - Port: 5432',
                        '   - User: trader_ai_user',
                        '   - Database: trader_ai',
                        '5. Test connection and save'
                    ],
                    'usage_tips': [
                        '• Use Cmd+Enter to execute queries',
                        '• Right-click on results to export data',
                        '• Save frequently used queries for quick access',
                        '• Use the schema browser to explore table structure'
                    ]
                }
            },
            'pandas_ai_guide': {
                'title': 'Using PandasAI for Natural Language Queries',
                'description': 'Query your data using plain English with PandasAI',
                'sections': {
                    'what_is_it': 'PandasAI allows you to ask questions about your data in natural language instead of writing SQL.',
                    'examples': [
                        '"What are the stocks with highest coherence scores today?"',
                        '"Show me price trends for AAPL in the last week"',
                        '"Find correlations between volume and coherence"',
                        '"Which symbols have unusual trading patterns?"'
                    ],
                    'best_practices': [
                        '• Be specific in your questions',
                        '• Mention time periods explicitly',
                        '• Ask for one analysis at a time',
                        '• Use stock symbols when referring to specific stocks'
                    ]
                }
            },
            'troubleshooting': {
                'title': 'Common Issues and Solutions',
                'description': 'Solutions to frequently encountered problems',
                'sections': {
                    'connection_issues': [
                        'Problem: Cannot connect to database',
                        'Solution: Check if PostgreSQL is running and connection details are correct'
                    ],
                    'query_errors': [
                        'Problem: "Table does not exist" error',
                        'Solution: Use double quotes around table names: "MarketData"'
                    ],
                    'slow_queries': [
                        'Problem: Queries are too slow',
                        'Solution: Add time filters and LIMIT clauses to reduce data volume'
                    ]
                }
            }
        }
    
    def get_help(self, topic: str) -> str:
        """Get help content for a specific topic"""
        if topic not in self.help_topics:
            return self._generate_help_index()
        
        help_content = self.help_topics[topic]
        output = []
        
        output.append(help_content['title'])
        output.append("=" * len(help_content['title']))
        output.append("")
        output.append(help_content['description'])
        output.append("")
        
        for section_name, section_content in help_content['sections'].items():
            section_title = section_name.replace('_', ' ').title()
            output.append(section_title)
            output.append("-" * len(section_title))
            
            if isinstance(section_content, list):
                for item in section_content:
                    output.append(item)
            else:
                output.append(section_content)
            output.append("")
        
        return "\n".join(output)
    
    def _generate_help_index(self) -> str:
        """Generate index of available help topics"""
        output = []
        output.append("TraderAI Database Workflow Help")
        output.append("=" * 35)
        output.append("")
        output.append("Available help topics:")
        output.append("")
        
        for topic_id, topic_info in self.help_topics.items():
            output.append(f"• {topic_id}: {topic_info['title']}")
        
        output.append("")
        output.append("Use get_help('topic_name') to view specific help content.")
        
        return "\n".join(output)
    
    def suggest_next_steps(self, context: str) -> List[str]:
        """Suggest next steps based on context"""
        suggestions = []
        
        if 'error' in context.lower():
            suggestions.extend([
                "Review the error message and suggested solutions",
                "Check your database connection",
                "Try a simpler query first",
                "Contact support if the issue persists"
            ])
        elif 'workflow' in context.lower():
            suggestions.extend([
                "Choose an appropriate workflow template",
                "Follow the step-by-step instructions",
                "Start with the market overview workflow if you're new",
                "Export your results when satisfied"
            ])
        elif 'query' in context.lower():
            suggestions.extend([
                "Validate your SQL syntax",
                "Add appropriate filters and limits",
                "Test with a small dataset first",
                "Use the query optimizer suggestions"
            ])
        else:
            suggestions.extend([
                "Explore available workflow templates",
                "Set up your preferred database tool",
                "Start with simple queries and build complexity gradually",
                "Review the getting started guide"
            ])
        
        return suggestions


def main():
    """Command-line interface for error handling system"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TraderAI Error Handler and User Guidance')
    parser.add_argument('action', choices=['test', 'stats', 'help'])
    parser.add_argument('--topic', help='Help topic to display')
    parser.add_argument('--days', type=int, default=7, help='Days for statistics')
    
    args = parser.parse_args()
    
    error_handler = DatabaseErrorHandler()
    guidance_system = UserGuidanceSystem(error_handler)
    
    if args.action == 'test':
        # Test error handling with sample errors
        test_errors = [
            Exception("connection to server at \"localhost\" (::1), port 5432 failed: Connection refused"),
            Exception("syntax error at or near \"SELEC\" at position 1"),
            Exception("column \"invalid_column\" does not exist"),
            Exception("division by zero")
        ]
        
        for i, error in enumerate(test_errors, 1):
            print(f"\nTest Error {i}:")
            print("-" * 30)
            
            context = ErrorContext(
                workflow_id=f"test_workflow_{i}",
                step_name=f"test_step_{i}",
                query="SELECT * FROM test_table;",
                user_id="test_user"
            )
            
            handled = error_handler.handle_error(error, context)
            print(error_handler.format_error_for_user(handled))
    
    elif args.action == 'stats':
        stats = error_handler.get_error_statistics(args.days)
        print(json.dumps(stats, indent=2))
    
    elif args.action == 'help':
        if args.topic:
            print(guidance_system.get_help(args.topic))
        else:
            print(guidance_system.get_help(''))


if __name__ == "__main__":
    main()