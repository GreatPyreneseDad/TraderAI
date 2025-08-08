"""
Basal Market Analyzer - Production Interface
Production-ready market analysis using Basal Reservoir integration

This module provides the main interface for using Basal Reservoir dynamics
in real-world market analysis scenarios, with comprehensive error handling,
monitoring, and optimization capabilities.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any, Callable
import logging
import asyncio
from datetime import datetime, timedelta
import json
import time
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
from pathlib import Path

from .basal_reservoir_engine import BasalReservoirEngine, BasalReservoirConfig
from .gct_basal_integration import GCTBasalIntegrator, MarketDataPoint, EnhancedCoherenceResult
from .basal_visualizer import BasalVisualizationDashboard

logger = logging.getLogger(__name__)

@dataclass
class MarketAnalysisConfig:
    """Configuration for market analysis"""
    symbols: List[str]
    analysis_window: int = 100
    prediction_horizon: int = 5
    min_data_points: int = 20
    confidence_threshold: float = 0.6
    enable_real_time: bool = True
    enable_visualization: bool = False
    save_results: bool = True
    results_directory: str = "basal_analysis_results"

@dataclass
class MarketPrediction:
    """Market prediction result"""
    symbol: str
    current_price: float
    predicted_prices: List[float]
    confidence_scores: List[float]
    coherence_analysis: EnhancedCoherenceResult
    prediction_horizon_minutes: int
    analysis_timestamp: datetime
    risk_assessment: Dict[str, float]
    trading_signals: Dict[str, Any]

@dataclass
class MarketAlert:
    """Market alert based on basal analysis"""
    alert_id: str
    symbol: str
    alert_type: str  # 'coherence_spike', 'anticipation_anomaly', 'resonance_breakdown'
    severity: str    # 'low', 'medium', 'high', 'critical'
    message: str
    confidence: float
    coherence_data: Dict[str, float]
    timestamp: datetime
    recommended_action: Optional[str] = None

class BasalMarketAnalyzer:
    """
    Production-ready market analyzer using Basal Reservoir dynamics
    """
    
    def __init__(self, 
                 config: MarketAnalysisConfig,
                 reservoir_config: Optional[BasalReservoirConfig] = None):
        
        self.config = config
        self.integrator = GCTBasalIntegrator(reservoir_config)
        
        # Results storage
        self.analysis_results: Dict[str, List[MarketPrediction]] = {}
        self.market_alerts: List[MarketAlert] = []
        self.performance_metrics: Dict[str, Any] = {}
        
        # Visualization (optional)
        self.visualizer = None
        if config.enable_visualization:
            try:
                self.visualizer = BasalVisualizationDashboard(self.integrator)
            except Exception as e:
                logger.warning(f"Could not initialize visualizer: {e}")
        
        # Async processing
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.is_running = False
        
        # Alert callbacks
        self.alert_callbacks: List[Callable[[MarketAlert], None]] = []
        
        # Performance tracking
        self.start_time = datetime.now()
        self.processed_data_points = 0
        self.prediction_accuracy_history = []
        
        # Setup results directory
        self.results_path = Path(config.results_directory)
        self.results_path.mkdir(exist_ok=True)
        
        logger.info(f"Basal Market Analyzer initialized for symbols: {config.symbols}")
    
    async def analyze_market_data(self, 
                                market_data: List[MarketDataPoint],
                                enable_alerts: bool = True) -> List[MarketPrediction]:
        """
        Analyze market data and generate predictions with basal dynamics
        """
        if not market_data:
            logger.warning("No market data provided for analysis")
            return []
        
        try:
            predictions = []
            
            # Group data by symbol
            symbol_data = self._group_data_by_symbol(market_data)
            
            # Process each symbol
            tasks = []
            for symbol, data_points in symbol_data.items():
                if len(data_points) >= self.config.min_data_points:
                    task = self._analyze_symbol_data(symbol, data_points, enable_alerts)
                    tasks.append(task)
            
            # Execute analysis tasks
            if tasks:
                completed_predictions = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in completed_predictions:
                    if isinstance(result, MarketPrediction):
                        predictions.append(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Analysis task failed: {result}")
            
            # Update performance metrics
            self.processed_data_points += len(market_data)
            self._update_performance_metrics(predictions)
            
            # Save results if enabled
            if self.config.save_results:
                await self._save_analysis_results(predictions)
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error in market analysis: {e}")
            return []
    
    async def _analyze_symbol_data(self, 
                                 symbol: str, 
                                 data_points: List[MarketDataPoint],
                                 enable_alerts: bool) -> Optional[MarketPrediction]:
        """Analyze data for a specific symbol"""
        try:
            if len(data_points) < self.config.min_data_points:
                logger.warning(f"Insufficient data for {symbol}: {len(data_points)} points")
                return None
            
            # Sort data by timestamp
            sorted_data = sorted(data_points, key=lambda x: x.timestamp)
            
            # Process data through GCT-Basal integration
            coherence_results = []
            for data_point in sorted_data[-self.config.analysis_window:]:
                result = await self.integrator.process_market_data_stream(data_point)
                coherence_results.append(result)
            
            if not coherence_results:
                return None
            
            # Get latest coherence analysis
            latest_coherence = coherence_results[-1]
            
            # Generate price predictions using basal dynamics
            recent_prices = [dp.price for dp in sorted_data[-20:]]
            price_array = np.array(recent_prices)
            
            predicted_prices = self.integrator.basal_engine.predict_market_pattern(
                price_array, 
                steps_ahead=self.config.prediction_horizon
            )
            
            # Calculate prediction confidence scores
            confidence_scores = self._calculate_confidence_scores(
                predicted_prices, 
                latest_coherence,
                price_array
            )
            
            # Risk assessment
            risk_assessment = self._assess_market_risk(
                sorted_data[-10:], 
                latest_coherence,
                predicted_prices
            )
            
            # Generate trading signals
            trading_signals = self._generate_trading_signals(
                latest_coherence,
                predicted_prices,
                confidence_scores,
                risk_assessment
            )
            
            # Create prediction result
            prediction = MarketPrediction(
                symbol=symbol,
                current_price=sorted_data[-1].price,
                predicted_prices=predicted_prices.tolist(),
                confidence_scores=confidence_scores,
                coherence_analysis=latest_coherence,
                prediction_horizon_minutes=self.config.prediction_horizon,
                analysis_timestamp=datetime.now(),
                risk_assessment=risk_assessment,
                trading_signals=trading_signals
            )
            
            # Store result
            if symbol not in self.analysis_results:
                self.analysis_results[symbol] = []
            self.analysis_results[symbol].append(prediction)
            
            # Limit stored results
            if len(self.analysis_results[symbol]) > 100:
                self.analysis_results[symbol].pop(0)
            
            # Generate alerts if enabled
            if enable_alerts:
                alerts = self._generate_alerts(symbol, latest_coherence, prediction)
                self.market_alerts.extend(alerts)
                
                # Trigger alert callbacks
                for alert in alerts:
                    for callback in self.alert_callbacks:
                        try:
                            callback(alert)
                        except Exception as e:
                            logger.error(f"Alert callback error: {e}")
            
            return prediction
            
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return None
    
    def _group_data_by_symbol(self, market_data: List[MarketDataPoint]) -> Dict[str, List[MarketDataPoint]]:
        """Group market data by symbol"""
        symbol_data = {}
        for data_point in market_data:
            symbol = data_point.symbol
            if symbol not in symbol_data:
                symbol_data[symbol] = []
            symbol_data[symbol].append(data_point)
        return symbol_data
    
    def _calculate_confidence_scores(self, 
                                   predicted_prices: np.ndarray,
                                   coherence_result: EnhancedCoherenceResult,
                                   historical_prices: np.ndarray) -> List[float]:
        """Calculate confidence scores for predictions"""
        
        base_confidence = coherence_result.prediction_confidence
        
        # Adjust confidence based on prediction consistency
        if len(predicted_prices) >= 2:
            prediction_variance = np.var(predicted_prices)
            price_scale = np.mean(historical_prices)
            normalized_variance = prediction_variance / (price_scale ** 2 + 1e-8)
            consistency_factor = np.exp(-normalized_variance * 10)
        else:
            consistency_factor = 1.0
        
        # Adjust confidence based on coherence stability
        coherence_stability = (coherence_result.basal_enhanced_gct.psi + 
                             coherence_result.basal_enhanced_gct.rho) / 2
        
        # Adjust confidence based on symbolic resonance
        resonance_factor = min(1.0, coherence_result.symbolic_resonance * 2)
        
        # Combined confidence calculation
        combined_confidence = (base_confidence * 0.4 + 
                             consistency_factor * 0.3 + 
                             coherence_stability * 0.2 +
                             resonance_factor * 0.1)
        
        # Create confidence scores that decay with prediction horizon
        confidence_scores = []
        for i in range(len(predicted_prices)):
            horizon_decay = np.exp(-i * 0.2)  # Decay confidence over time
            step_confidence = combined_confidence * horizon_decay
            confidence_scores.append(np.clip(step_confidence, 0.0, 1.0))
        
        return confidence_scores
    
    def _assess_market_risk(self, 
                          recent_data: List[MarketDataPoint],
                          coherence_result: EnhancedCoherenceResult,
                          predicted_prices: np.ndarray) -> Dict[str, float]:
        """Assess various market risks"""
        
        if len(recent_data) < 5:
            return {'overall_risk': 0.5, 'volatility_risk': 0.5, 'trend_risk': 0.5}
        
        # Price volatility risk
        recent_prices = [dp.price for dp in recent_data]
        price_volatility = np.std(recent_prices) / (np.mean(recent_prices) + 1e-8)
        volatility_risk = min(1.0, price_volatility * 10)
        
        # Trend reversal risk based on coherence
        psi_stability = coherence_result.basal_enhanced_gct.psi
        trend_risk = 1.0 - psi_stability  # Lower coherence = higher trend risk
        
        # Prediction uncertainty risk
        if len(predicted_prices) >= 2:
            prediction_spread = (np.max(predicted_prices) - np.min(predicted_prices)) / np.mean(predicted_prices)
            uncertainty_risk = min(1.0, prediction_spread * 2)
        else:
            uncertainty_risk = 0.5
        
        # Volume anomaly risk
        recent_volumes = [dp.volume for dp in recent_data]
        if len(recent_volumes) >= 3:
            volume_variance = np.var(recent_volumes) / (np.mean(recent_volumes) + 1e-8)
            volume_risk = min(1.0, volume_variance)
        else:
            volume_risk = 0.5
        
        # Overall risk assessment
        overall_risk = (volatility_risk * 0.3 + 
                       trend_risk * 0.3 + 
                       uncertainty_risk * 0.25 +
                       volume_risk * 0.15)
        
        return {
            'overall_risk': overall_risk,
            'volatility_risk': volatility_risk,
            'trend_risk': trend_risk,
            'uncertainty_risk': uncertainty_risk,
            'volume_risk': volume_risk
        }
    
    def _generate_trading_signals(self, 
                                coherence_result: EnhancedCoherenceResult,
                                predicted_prices: np.ndarray,
                                confidence_scores: List[float],
                                risk_assessment: Dict[str, float]) -> Dict[str, Any]:
        """Generate actionable trading signals"""
        
        signals = {
            'action': 'HOLD',  # Default action
            'strength': 0.0,   # Signal strength [0,1]
            'confidence': 0.0,
            'risk_level': 'MEDIUM',
            'reasoning': []
        }
        
        # Determine action based on predictions and confidence
        if len(predicted_prices) >= 2 and confidence_scores:
            avg_confidence = np.mean(confidence_scores)
            price_direction = predicted_prices[-1] - predicted_prices[0]
            
            # Only generate signals if confidence is above threshold
            if avg_confidence > self.config.confidence_threshold:
                
                # Bullish signals
                if price_direction > 0:
                    signals['action'] = 'BUY'
                    signals['strength'] = min(1.0, abs(price_direction) * avg_confidence * 2)
                    signals['reasoning'].append(f"Upward price prediction with {avg_confidence:.2f} confidence")
                
                # Bearish signals  
                elif price_direction < 0:
                    signals['action'] = 'SELL'
                    signals['strength'] = min(1.0, abs(price_direction) * avg_confidence * 2)
                    signals['reasoning'].append(f"Downward price prediction with {avg_confidence:.2f} confidence")
                
                signals['confidence'] = avg_confidence
            else:
                signals['reasoning'].append(f"Confidence too low: {avg_confidence:.2f} < {self.config.confidence_threshold}")
        
        # Adjust based on coherence analysis
        coherence_strength = (coherence_result.basal_enhanced_gct.psi + 
                            coherence_result.basal_enhanced_gct.rho) / 2
        
        if coherence_strength > 0.8:
            signals['strength'] *= 1.2  # Boost signal strength for high coherence
            signals['reasoning'].append("High market coherence detected")
        elif coherence_strength < 0.3:
            signals['strength'] *= 0.5  # Reduce signal strength for low coherence
            signals['reasoning'].append("Low market coherence - reduced confidence")
        
        # Adjust based on risk assessment
        overall_risk = risk_assessment.get('overall_risk', 0.5)
        if overall_risk > 0.7:
            signals['risk_level'] = 'HIGH'
            signals['strength'] *= 0.6  # Reduce position size for high risk
            signals['reasoning'].append("High market risk detected")
        elif overall_risk < 0.3:
            signals['risk_level'] = 'LOW'
            signals['strength'] *= 1.1  # Slightly increase position for low risk
            signals['reasoning'].append("Low market risk environment")
        
        # Clamp strength
        signals['strength'] = np.clip(signals['strength'], 0.0, 1.0)
        
        return signals
    
    def _generate_alerts(self, 
                       symbol: str,
                       coherence_result: EnhancedCoherenceResult,
                       prediction: MarketPrediction) -> List[MarketAlert]:
        """Generate market alerts based on analysis"""
        
        alerts = []
        timestamp = datetime.now()
        
        # Coherence spike alert
        coherence_psi = coherence_result.basal_enhanced_gct.psi
        if coherence_psi > 0.9:
            alert = MarketAlert(
                alert_id=f"{symbol}_coherence_spike_{timestamp.strftime('%Y%m%d_%H%M%S')}",
                symbol=symbol,
                alert_type='coherence_spike',
                severity='high',
                message=f"Extremely high market coherence detected: {coherence_psi:.3f}",
                confidence=coherence_result.prediction_confidence,
                coherence_data={
                    'psi': coherence_psi,
                    'rho': coherence_result.basal_enhanced_gct.rho,
                    'q': coherence_result.basal_enhanced_gct.q,
                    'f': coherence_result.basal_enhanced_gct.f
                },
                timestamp=timestamp,
                recommended_action="Monitor for potential breakout or reversal"
            )
            alerts.append(alert)
        
        # Anticipation anomaly alert
        anticipation = abs(coherence_result.anticipation_capacity)
        if anticipation > 0.5:
            severity = 'critical' if anticipation > 0.8 else 'high'
            alert = MarketAlert(
                alert_id=f"{symbol}_anticipation_anomaly_{timestamp.strftime('%Y%m%d_%H%M%S')}",
                symbol=symbol,
                alert_type='anticipation_anomaly',
                severity=severity,
                message=f"Strong anticipatory signal detected: {anticipation:.3f}",
                confidence=coherence_result.prediction_confidence,
                coherence_data={'anticipation': anticipation},
                timestamp=timestamp,
                recommended_action="Prepare for significant price movement"
            )
            alerts.append(alert)
        
        # Resonance breakdown alert
        resonance = coherence_result.symbolic_resonance
        if resonance < 0.2:
            alert = MarketAlert(
                alert_id=f"{symbol}_resonance_breakdown_{timestamp.strftime('%Y%m%d_%H%M%S')}",
                symbol=symbol,
                alert_type='resonance_breakdown',
                severity='medium',
                message=f"Low symbolic resonance: {resonance:.3f} - Market may be disconnected",
                confidence=coherence_result.prediction_confidence,
                coherence_data={'resonance': resonance},
                timestamp=timestamp,
                recommended_action="Exercise caution - market signals may be unreliable"
            )
            alerts.append(alert)
        
        return alerts
    
    def _update_performance_metrics(self, predictions: List[MarketPrediction]):
        """Update performance tracking metrics"""
        
        current_time = datetime.now()
        runtime = (current_time - self.start_time).total_seconds() / 3600  # Hours
        
        # Basic performance metrics
        self.performance_metrics.update({
            'runtime_hours': runtime,
            'processed_data_points': self.processed_data_points,
            'total_predictions': sum(len(results) for results in self.analysis_results.values()),
            'total_alerts': len(self.market_alerts),
            'symbols_analyzed': len(self.analysis_results),
            'average_confidence': np.mean([
                np.mean(p.confidence_scores) 
                for p in predictions 
                if p.confidence_scores
            ]) if predictions else 0.0,
            'integrator_performance': self.integrator.get_performance_summary()
        })
    
    async def _save_analysis_results(self, predictions: List[MarketPrediction]):
        """Save analysis results to files"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Save predictions
            predictions_data = []
            for prediction in predictions:
                pred_dict = asdict(prediction)
                pred_dict['analysis_timestamp'] = prediction.analysis_timestamp.isoformat()
                
                # Convert coherence result to dict
                coherence_dict = {
                    'traditional_gct': asdict(prediction.coherence_analysis.traditional_gct),
                    'basal_enhanced_gct': asdict(prediction.coherence_analysis.basal_enhanced_gct),
                    'anticipation_capacity': prediction.coherence_analysis.anticipation_capacity,
                    'prediction_confidence': prediction.coherence_analysis.prediction_confidence,
                    'symbolic_resonance': prediction.coherence_analysis.symbolic_resonance,
                    'adaptation_efficiency': prediction.coherence_analysis.adaptation_efficiency,
                    'timestamp': prediction.coherence_analysis.timestamp.isoformat()
                }
                pred_dict['coherence_analysis'] = coherence_dict
                
                predictions_data.append(pred_dict)
            
            # Save to JSON
            predictions_file = self.results_path / f"predictions_{timestamp}.json"
            with open(predictions_file, 'w') as f:
                json.dump(predictions_data, f, indent=2, default=str)
            
            # Save performance metrics
            metrics_file = self.results_path / f"metrics_{timestamp}.json"  
            with open(metrics_file, 'w') as f:
                json.dump(self.performance_metrics, f, indent=2, default=str)
            
            # Save integrator state
            state_file = self.results_path / f"integrator_state_{timestamp}.json"
            self.integrator.save_integration_state(str(state_file))
            
            logger.info(f"Analysis results saved to {self.results_path}")
            
        except Exception as e:
            logger.error(f"Error saving results: {e}")
    
    def register_alert_callback(self, callback: Callable[[MarketAlert], None]):
        """Register callback function for market alerts"""
        self.alert_callbacks.append(callback)
    
    def get_latest_analysis(self, symbol: str) -> Optional[MarketPrediction]:
        """Get latest analysis result for a symbol"""
        if symbol in self.analysis_results and self.analysis_results[symbol]:
            return self.analysis_results[symbol][-1]
        return None
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        self._update_performance_metrics([])
        return self.performance_metrics.copy()
    
    def start_real_time_analysis(self, data_stream_callback: Callable[[], List[MarketDataPoint]]):
        """Start real-time market analysis"""
        if not self.config.enable_real_time:
            logger.warning("Real-time analysis not enabled in configuration")
            return
        
        self.is_running = True
        
        async def analysis_loop():
            while self.is_running:
                try:
                    # Get new market data
                    market_data = data_stream_callback()
                    
                    if market_data:
                        # Analyze data
                        await self.analyze_market_data(market_data, enable_alerts=True)
                        
                        # Update visualization if enabled
                        if self.visualizer:
                            await self.visualizer.update_display()
                    
                    # Wait before next iteration
                    await asyncio.sleep(1.0)
                    
                except Exception as e:
                    logger.error(f"Error in real-time analysis loop: {e}")
                    await asyncio.sleep(5.0)
        
        # Run analysis loop
        asyncio.create_task(analysis_loop())
        logger.info("Real-time market analysis started")
    
    def stop_real_time_analysis(self):
        """Stop real-time market analysis"""
        self.is_running = False
        logger.info("Real-time market analysis stopped")
    
    def shutdown(self):
        """Graceful shutdown"""
        self.stop_real_time_analysis()
        self.integrator.shutdown()
        self.executor.shutdown(wait=True)
        
        if self.visualizer:
            self.visualizer.close()
        
        logger.info("Basal Market Analyzer shut down")

# Utility functions

def create_market_analyzer(symbols: List[str], 
                         enable_visualization: bool = False,
                         results_directory: str = "basal_analysis_results") -> BasalMarketAnalyzer:
    """Factory function to create configured market analyzer"""
    
    config = MarketAnalysisConfig(
        symbols=symbols,
        enable_visualization=enable_visualization,
        results_directory=results_directory
    )
    
    # Optimized reservoir configuration for market analysis
    reservoir_config = BasalReservoirConfig(
        num_nodes=120,
        learning_rate=0.015,
        coherence_coupling=0.06,
        adaptation_rate=0.0015,
        prediction_horizon=10
    )
    
    return BasalMarketAnalyzer(config, reservoir_config)

def analyze_historical_data(csv_file_path: str, 
                          symbol_column: str = 'symbol',
                          price_column: str = 'price',
                          volume_column: str = 'volume',
                          timestamp_column: str = 'timestamp') -> List[MarketPrediction]:
    """Analyze historical market data from CSV file"""
    
    try:
        # Load data
        df = pd.read_csv(csv_file_path)
        
        # Convert to MarketDataPoint objects
        market_data = []
        for _, row in df.iterrows():
            data_point = MarketDataPoint(
                timestamp=pd.to_datetime(row[timestamp_column]),
                symbol=row[symbol_column],
                price=float(row[price_column]),
                volume=int(row[volume_column]),
                sentiment=row.get('sentiment', None)
            )
            market_data.append(data_point)
        
        # Create analyzer
        symbols = df[symbol_column].unique().tolist()
        analyzer = create_market_analyzer(symbols)
        
        # Run analysis
        predictions = asyncio.run(analyzer.analyze_market_data(market_data))
        
        # Shutdown
        analyzer.shutdown()
        
        return predictions
        
    except Exception as e:
        logger.error(f"Error analyzing historical data: {e}")
        return []