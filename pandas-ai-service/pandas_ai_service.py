"""
PandasAI Service for TraderAI
Provides natural language data analysis capabilities for market data
"""

import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from dotenv import load_dotenv

import pandasai as pai
from pandasai import Agent
from pandasai.llm import OpenAI
from pandasai.skills import Skill
import redis
import json
import hashlib
from sqlalchemy import create_engine
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MarketAnalysisSkills:
    """Custom skills for financial market analysis"""
    
    @staticmethod
    def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def detect_coherence_patterns(df: pd.DataFrame, threshold: float = 0.7) -> pd.DataFrame:
        """Detect significant coherence patterns"""
        patterns = []
        for symbol in df['symbol'].unique():
            symbol_data = df[df['symbol'] == symbol].copy()
            
            # Detect spikes in coherence scores
            for metric in ['psi', 'rho', 'q', 'f']:
                if metric in symbol_data.columns:
                    spikes = symbol_data[symbol_data[metric] > threshold]
                    if not spikes.empty:
                        patterns.append({
                            'symbol': symbol,
                            'metric': metric,
                            'spike_count': len(spikes),
                            'max_value': spikes[metric].max(),
                            'avg_value': spikes[metric].mean(),
                            'timestamps': spikes['timestamp'].tolist()
                        })
        
        return pd.DataFrame(patterns)
    
    @staticmethod
    def calculate_coherence_correlation(df: pd.DataFrame) -> pd.DataFrame:
        """Calculate correlation between coherence scores and price movements"""
        correlations = []
        
        for symbol in df['symbol'].unique():
            symbol_data = df[df['symbol'] == symbol].copy()
            if len(symbol_data) < 10:
                continue
                
            # Calculate price changes
            symbol_data['price_change'] = symbol_data['price'].pct_change()
            
            # Calculate correlations
            for metric in ['psi', 'rho', 'q', 'f']:
                if metric in symbol_data.columns:
                    corr = symbol_data[[metric, 'price_change']].corr().iloc[0, 1]
                    correlations.append({
                        'symbol': symbol,
                        'metric': metric,
                        'correlation': corr,
                        'strength': 'strong' if abs(corr) > 0.7 else 'moderate' if abs(corr) > 0.4 else 'weak'
                    })
        
        return pd.DataFrame(correlations)


class PandasAIService:
    """Main service class for PandasAI integration"""
    
    def __init__(self):
        self.llm = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            password=os.getenv('REDIS_PASSWORD'),
            decode_responses=True
        )
        self.db_engine = create_engine(os.getenv('DATABASE_URL'))
        self.agent = None
        self._initialize_agent()
    
    def _initialize_agent(self):
        """Initialize PandasAI agent with custom configuration"""
        # Configure PandasAI
        pai.config.set({
            "llm": self.llm,
            "enable_cache": True,
            "cache_db_path": "./pandas_ai_cache.db",
            "verbose": os.getenv('NODE_ENV') == 'development',
            "enforce_privacy": True,
            "save_logs": True,
            "open_charts": False
        })
        
        logger.info("PandasAI agent initialized successfully")
    
    def _get_cache_key(self, query: str, params: Dict[str, Any]) -> str:
        """Generate cache key for query results"""
        content = f"{query}:{json.dumps(params, sort_keys=True)}"
        return f"pandas_ai:{hashlib.md5(content.encode()).hexdigest()}"
    
    def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached result if available"""
        cached = self.redis_client.get(cache_key)
        if cached:
            logger.info(f"Cache hit for key: {cache_key}")
            return json.loads(cached)
        return None
    
    def _cache_result(self, cache_key: str, result: Dict[str, Any], ttl: int = 300):
        """Cache analysis result"""
        self.redis_client.setex(cache_key, ttl, json.dumps(result))
        logger.info(f"Cached result for key: {cache_key}")
    
    def fetch_market_data(self, symbols: Optional[List[str]] = None, 
                         timeframe: str = '24h') -> pd.DataFrame:
        """Fetch market data from database"""
        # Calculate date range based on timeframe
        end_date = datetime.now()
        timeframe_map = {
            '1h': timedelta(hours=1),
            '24h': timedelta(days=1),
            '7d': timedelta(days=7),
            '30d': timedelta(days=30)
        }
        start_date = end_date - timeframe_map.get(timeframe, timedelta(days=1))
        
        # Build query
        query = """
        SELECT 
            timestamp,
            symbol,
            price,
            volume::numeric as volume,
            (coherenceScores->>'psi')::float as psi,
            (coherenceScores->>'rho')::float as rho,
            (coherenceScores->>'q')::float as q,
            (coherenceScores->>'f')::float as f,
            sentiment
        FROM market_data
        WHERE timestamp >= %s AND timestamp <= %s
        """
        
        params = [start_date, end_date]
        
        if symbols:
            query += " AND symbol = ANY(%s)"
            params.append(symbols)
        
        query += " ORDER BY timestamp DESC"
        
        # Fetch data
        df = pd.read_sql(query, self.db_engine, params=params)
        logger.info(f"Fetched {len(df)} rows of market data")
        return df
    
    def analyze_market_data(self, query: str, symbols: Optional[List[str]] = None,
                           timeframe: str = '24h', use_cache: bool = True) -> Dict[str, Any]:
        """Analyze market data using natural language query"""
        try:
            # Check cache
            params = {'symbols': symbols, 'timeframe': timeframe}
            cache_key = self._get_cache_key(query, params)
            
            if use_cache:
                cached_result = self._get_cached_result(cache_key)
                if cached_result:
                    return cached_result
            
            # Fetch market data
            df = self.fetch_market_data(symbols, timeframe)
            
            if df.empty:
                return {
                    'success': False,
                    'error': 'No data available for the specified parameters',
                    'query': query,
                    'params': params
                }
            
            # Create context for the query
            context = f"""
            You are analyzing financial market data with the following columns:
            - timestamp: Time of the data point
            - symbol: Stock ticker symbol
            - price: Stock price
            - volume: Trading volume
            - psi, rho, q, f: Coherence scores (0-1 scale, higher indicates stronger market consciousness)
            - sentiment: Market sentiment score
            
            Data timeframe: {timeframe}
            Number of records: {len(df)}
            Symbols included: {', '.join(df['symbol'].unique())}
            """
            
            # Create DataFrame with context
            pai_df = pai.DataFrame(df, description=context)
            
            # Process query
            result = pai_df.chat(query)
            
            # Prepare response
            response = {
                'success': True,
                'query': query,
                'result': result,
                'metadata': {
                    'rows_analyzed': len(df),
                    'timeframe': timeframe,
                    'symbols': df['symbol'].unique().tolist(),
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            # Cache result
            if use_cache:
                self._cache_result(cache_key, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'query': query,
                'params': params
            }
    
    def generate_market_insights(self, symbols: List[str]) -> Dict[str, Any]:
        """Generate automated market insights"""
        try:
            df = self.fetch_market_data(symbols, '24h')
            
            insights = {
                'timestamp': datetime.now().isoformat(),
                'symbols': symbols,
                'insights': []
            }
            
            # Predefined insight queries
            insight_queries = [
                "What are the top 3 symbols by average coherence score?",
                "Which symbols show the highest price volatility?",
                "Are there any correlations between coherence scores and price movements?",
                "What patterns can you identify in the volume data?",
                "Which symbols have coherence scores above 0.7?"
            ]
            
            pai_df = pai.DataFrame(df)
            
            for query in insight_queries:
                try:
                    result = pai_df.chat(query)
                    insights['insights'].append({
                        'question': query,
                        'answer': result
                    })
                except Exception as e:
                    logger.error(f"Error generating insight for query '{query}': {e}")
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def detect_anomalies(self, symbols: Optional[List[str]] = None) -> Dict[str, Any]:
        """Detect anomalies in market data"""
        try:
            df = self.fetch_market_data(symbols, '24h')
            
            # Use PandasAI to detect anomalies
            pai_df = pai.DataFrame(df)
            
            anomaly_queries = [
                "Find any unusual spikes in coherence scores (values > 0.8)",
                "Identify sudden price movements (changes > 5%)",
                "Find abnormal volume patterns (volume > 2x average)",
                "Detect any symbols with all coherence metrics above 0.7"
            ]
            
            anomalies = []
            for query in anomaly_queries:
                try:
                    result = pai_df.chat(query)
                    if result:
                        anomalies.append({
                            'type': query,
                            'findings': result
                        })
                except Exception as e:
                    logger.error(f"Error detecting anomaly: {e}")
            
            return {
                'success': True,
                'anomalies': anomalies,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in anomaly detection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def generate_trading_signals(self, strategy: str, symbols: List[str]) -> Dict[str, Any]:
        """Generate trading signals based on strategy"""
        try:
            df = self.fetch_market_data(symbols, '7d')
            
            # Add technical indicators
            for symbol in symbols:
                symbol_data = df[df['symbol'] == symbol].copy()
                if len(symbol_data) > 14:
                    df.loc[df['symbol'] == symbol, 'rsi'] = MarketAnalysisSkills.calculate_rsi(
                        symbol_data['price']
                    )
            
            pai_df = pai.DataFrame(df)
            
            # Generate signals based on strategy
            signal_query = f"""
            Based on {strategy} strategy, identify trading opportunities where:
            1. Coherence scores are trending upward
            2. RSI is not overbought (< 70) or oversold (> 30)
            3. Volume is above average
            
            For each opportunity, provide:
            - Symbol
            - Signal (BUY/SELL/HOLD)
            - Confidence level (1-10)
            - Reasoning
            """
            
            signals = pai_df.chat(signal_query)
            
            return {
                'success': True,
                'strategy': strategy,
                'signals': signals,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating trading signals: {str(e)}")
            return {'success': False, 'error': str(e)}