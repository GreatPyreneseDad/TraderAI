"""
GCT Basal Integration Module
Seamless integration between existing GCT framework and Basal Reservoir dynamics

This module provides the bridge between the traditional Grounded Coherence Theory
calculations and the new Basal Reservoir Computing approach, enabling enhanced
market analysis with symbolic reasoning capabilities.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
import json

from .basal_reservoir_engine import BasalReservoirEngine, BasalReservoirConfig, GCTDimensions

logger = logging.getLogger(__name__)

@dataclass 
class MarketDataPoint:
    """Market data point for GCT analysis"""
    timestamp: datetime
    symbol: str
    price: float
    volume: int
    sentiment: Optional[float] = None
    coherence_scores: Optional[Dict[str, float]] = None

@dataclass
class EnhancedCoherenceResult:
    """Enhanced coherence calculation result with basal dynamics"""
    traditional_gct: GCTDimensions
    basal_enhanced_gct: GCTDimensions
    anticipation_capacity: float
    prediction_confidence: float
    symbolic_resonance: float
    adaptation_efficiency: float
    reservoir_state: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)

class GCTBasalIntegrator:
    """
    Main integration class that combines traditional GCT with Basal Reservoir dynamics
    """
    
    def __init__(self, 
                 reservoir_config: Optional[BasalReservoirConfig] = None,
                 integration_strength: float = 0.3):
        
        # Initialize basal engine
        if reservoir_config is None:
            reservoir_config = BasalReservoirConfig(
                num_nodes=80,
                learning_rate=0.02,
                soulmath_coupling=0.08,
                adaptation_rate=0.002
            )
        
        self.basal_engine = BasalReservoirEngine(reservoir_config)
        self.integration_strength = integration_strength
        
        # Traditional GCT parameters
        self.gct_params = {
            'ki': 0.5,  # Emotional intensity coefficient
            'km': 0.3,  # Memory stability coefficient  
            'temporal_decay': 0.95,
            'coherence_threshold': 0.7
        }
        
        # Integration state
        self.market_history: List[MarketDataPoint] = []
        self.coherence_results: List[EnhancedCoherenceResult] = []
        self.prediction_cache: Dict[str, List[float]] = {}
        self.adaptation_metrics: Dict[str, float] = {}
        
        # Performance tracking
        self.prediction_accuracy_tracker = []
        self.coherence_stability_tracker = []
        
        # Threading for real-time processing
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.is_running = False
        
        logger.info("GCT Basal Integrator initialized")
    
    async def process_market_data_stream(self, 
                                       market_data: MarketDataPoint,
                                       enable_prediction: bool = True) -> EnhancedCoherenceResult:
        """
        Process streaming market data with enhanced GCT analysis
        """
        try:
            # Add to history
            self.market_history.append(market_data)
            if len(self.market_history) > 1000:  # Limit memory usage
                self.market_history.pop(0)
            
            # Traditional GCT calculation
            traditional_gct = await self._compute_traditional_gct(market_data)
            
            # Encode market data for basal reservoir
            market_array = self._prepare_market_data_for_reservoir()
            
            # Update basal reservoir with market data
            reservoir_inputs = self._encode_market_signals(market_data)
            activations = self.basal_engine.update_reservoir_state(reservoir_inputs)
            
            # Compute enhanced coherence with basal dynamics
            basal_coherence = self.basal_engine.compute_enhanced_coherence()
            anticipation = self.basal_engine.compute_anticipation_capacity()
            
            # Integrate traditional and basal approaches
            enhanced_gct = self._integrate_coherence_approaches(traditional_gct, 
                                                              basal_coherence, 
                                                              anticipation)
            
            # Compute symbolic resonance
            symbolic_resonance = self._compute_symbolic_resonance(market_data, activations)
            
            # Prediction and confidence
            prediction_confidence = 0.0
            if enable_prediction:
                prediction_confidence = await self._compute_prediction_confidence(market_array)
            
            # Create enhanced result
            result = EnhancedCoherenceResult(
                traditional_gct=traditional_gct,
                basal_enhanced_gct=enhanced_gct,
                anticipation_capacity=anticipation,
                prediction_confidence=prediction_confidence,
                symbolic_resonance=symbolic_resonance,
                adaptation_efficiency=self._compute_adaptation_efficiency(),
                reservoir_state=self.basal_engine.get_reservoir_state()
            )
            
            self.coherence_results.append(result)
            if len(self.coherence_results) > 500:
                self.coherence_results.pop(0)
            
            # Update performance metrics
            self._update_performance_metrics(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing market data: {e}")
            # Return fallback result
            return self._create_fallback_result(market_data)
    
    async def _compute_traditional_gct(self, market_data: MarketDataPoint) -> GCTDimensions:
        """Compute traditional GCT coherence dimensions"""
        
        # Get recent price history for calculations
        recent_prices = [dp.price for dp in self.market_history[-20:]]
        recent_volumes = [dp.volume for dp in self.market_history[-20:]]
        
        if len(recent_prices) < 5:
            return GCTDimensions(psi=0.5, rho=0.5, q=0.5, f=0.5)
        
        # Internal Consistency (ψ) - price stability
        price_volatility = np.std(recent_prices[-10:]) / (np.mean(recent_prices[-10:]) + 1e-8)
        psi = np.exp(-2 * price_volatility)  # Lower volatility = higher consistency
        
        # Accumulated Wisdom (ρ) - trend strength  
        if len(recent_prices) >= 10:
            price_trend = np.polyfit(range(len(recent_prices[-10:])), recent_prices[-10:], 1)[0]
            trend_strength = abs(price_trend) / (np.mean(recent_prices[-10:]) + 1e-8)
            rho = min(1.0, trend_strength * 10)
        else:
            rho = 0.5
        
        # Emotional Activation (q) - volume-based sentiment
        if len(recent_volumes) >= 5:
            volume_ratio = recent_volumes[-1] / (np.mean(recent_volumes[-5:]) + 1e-8)
            q = min(1.0, max(0.0, (volume_ratio - 0.5) * 2))
        else:
            q = 0.5
        
        # Social Belonging/Frequency (f) - market synchronization
        if market_data.sentiment is not None:
            f = (market_data.sentiment + 1) / 2  # Convert from [-1,1] to [0,1]
        else:
            # Use price momentum as proxy
            if len(recent_prices) >= 3:
                momentum = (recent_prices[-1] - recent_prices[-3]) / recent_prices[-3]
                f = (np.tanh(momentum * 10) + 1) / 2
            else:
                f = 0.5
        
        return GCTDimensions(
            psi=np.clip(psi, 0.0, 1.0),
            rho=np.clip(rho, 0.0, 1.0), 
            q=np.clip(q, 0.0, 1.0),
            f=np.clip(f, 0.0, 1.0)
        )
    
    def _prepare_market_data_for_reservoir(self) -> np.ndarray:
        """Prepare market data array for reservoir processing"""
        if len(self.market_history) < 5:
            return np.zeros(10)
        
        # Extract recent price and volume data
        recent_data = self.market_history[-20:]
        prices = np.array([dp.price for dp in recent_data])
        volumes = np.array([dp.volume for dp in recent_data])
        
        # Normalize data
        prices_norm = (prices - np.mean(prices)) / (np.std(prices) + 1e-8)
        volumes_norm = (volumes - np.mean(volumes)) / (np.std(volumes) + 1e-8)
        
        # Combine and return fixed-size array
        combined = np.concatenate([prices_norm[-10:], volumes_norm[-10:]])
        if len(combined) < 20:
            combined = np.pad(combined, (0, 20 - len(combined)), 'constant')
        
        return combined[:20]
    
    def _encode_market_signals(self, market_data: MarketDataPoint) -> Dict[int, float]:
        """Encode current market signals for reservoir input"""
        signals = {}
        
        # Price signal (first quarter of nodes)
        if len(self.market_history) >= 2:
            price_change = (market_data.price - self.market_history[-2].price) / self.market_history[-2].price
            signals[0] = np.tanh(price_change * 100)  # Scale and bound
        
        # Volume signal (second quarter of nodes)  
        if len(self.market_history) >= 5:
            recent_volumes = [dp.volume for dp in self.market_history[-5:]]
            volume_ratio = market_data.volume / (np.mean(recent_volumes) + 1e-8)
            signals[len(self.basal_engine.nodes) // 4] = np.tanh(volume_ratio - 1)
        
        # Sentiment signal (third quarter of nodes)
        if market_data.sentiment is not None:
            signals[len(self.basal_engine.nodes) // 2] = market_data.sentiment
        
        return signals
    
    def _integrate_coherence_approaches(self, 
                                      traditional: GCTDimensions,
                                      basal_coherence: float,
                                      anticipation: float) -> GCTDimensions:
        """Integrate traditional GCT with basal reservoir dynamics"""
        
        # Weighted combination with adaptive integration strength
        alpha = self.integration_strength
        
        # Enhanced psi with basal coherence
        enhanced_psi = (1 - alpha) * traditional.psi + alpha * basal_coherence
        
        # Enhanced rho with anticipation capacity
        anticipation_boost = np.clip(anticipation, -0.5, 0.5)
        enhanced_rho = traditional.rho + alpha * anticipation_boost
        
        # Enhanced q with reservoir energy dynamics
        reservoir_energy = self.basal_engine.get_reservoir_state().get('average_energy', 0.5)
        enhanced_q = (1 - alpha) * traditional.q + alpha * reservoir_energy
        
        # Enhanced f with reservoir activation patterns
        reservoir_activation = self.basal_engine.get_reservoir_state().get('average_activation', 0.0)
        activation_normalized = (np.tanh(reservoir_activation) + 1) / 2
        enhanced_f = (1 - alpha) * traditional.f + alpha * activation_normalized
        
        return GCTDimensions(
            psi=np.clip(enhanced_psi, 0.0, 1.0),
            rho=np.clip(enhanced_rho, 0.0, 1.0),
            q=np.clip(enhanced_q, 0.0, 1.0),
            f=np.clip(enhanced_f, 0.0, 1.0)
        )
    
    def _compute_symbolic_resonance(self, 
                                  market_data: MarketDataPoint, 
                                  activations: np.ndarray) -> float:
        """Compute symbolic resonance between market and reservoir"""
        
        # Market momentum as symbolic representation
        if len(self.market_history) >= 3:
            price_momentum = ((market_data.price - self.market_history[-3].price) / 
                            self.market_history[-3].price)
        else:
            price_momentum = 0.0
        
        # Reservoir momentum as symbolic activation change
        if len(self.basal_engine.nodes) > 0 and len(self.basal_engine.nodes[0].activation_history) >= 2:
            reservoir_momentum = np.mean([
                node.activation_history[-1] - node.activation_history[-2]
                for node in self.basal_engine.nodes 
                if len(node.activation_history) >= 2
            ])
        else:
            reservoir_momentum = 0.0
        
        # Compute resonance as correlation between market and reservoir momentum
        if abs(price_momentum) > 1e-6 and abs(reservoir_momentum) > 1e-6:
            resonance = np.tanh(price_momentum * reservoir_momentum * 1000)
        else:
            resonance = 0.0
        
        return (resonance + 1) / 2  # Normalize to [0,1]
    
    async def _compute_prediction_confidence(self, market_data: np.ndarray) -> float:
        """Compute confidence in predictions using reservoir dynamics"""
        try:
            # Get prediction from basal engine
            predictions = self.basal_engine.predict_market_pattern(market_data, steps_ahead=3)
            
            # Confidence based on prediction consistency
            if len(predictions) >= 2:
                prediction_variance = np.var(predictions)
                confidence = np.exp(-prediction_variance * 10)  # Lower variance = higher confidence
            else:
                confidence = 0.5
            
            # Adjust confidence based on reservoir stability
            reservoir_state = self.basal_engine.get_reservoir_state()
            energy_variance = reservoir_state.get('energy_variance', 0.5)
            stability_factor = np.exp(-energy_variance * 5)
            
            final_confidence = confidence * stability_factor
            return np.clip(final_confidence, 0.0, 1.0)
            
        except Exception as e:
            logger.warning(f"Error computing prediction confidence: {e}")
            return 0.5
    
    def _compute_adaptation_efficiency(self) -> float:
        """Compute how efficiently the system is adapting"""
        if len(self.coherence_results) < 10:
            return 0.5
        
        # Measure coherence improvement over time
        recent_coherence = [r.basal_enhanced_gct.psi for r in self.coherence_results[-10:]]
        earlier_coherence = [r.basal_enhanced_gct.psi for r in self.coherence_results[-20:-10]] if len(self.coherence_results) >= 20 else recent_coherence
        
        if len(earlier_coherence) > 0:
            improvement = np.mean(recent_coherence) - np.mean(earlier_coherence)
            efficiency = (np.tanh(improvement * 5) + 1) / 2  # Normalize to [0,1]
        else:
            efficiency = 0.5
        
        return efficiency
    
    def _update_performance_metrics(self, result: EnhancedCoherenceResult):
        """Update performance tracking metrics"""
        
        # Track prediction accuracy (simplified)
        if len(self.market_history) >= 2:
            price_change = (self.market_history[-1].price - self.market_history[-2].price) / self.market_history[-2].price
            anticipation = result.anticipation_capacity
            
            # Simple accuracy measure: does anticipation direction match price direction?
            if (price_change > 0 and anticipation > 0) or (price_change < 0 and anticipation < 0):
                accuracy = 1.0
            else:
                accuracy = 0.0
            
            self.prediction_accuracy_tracker.append(accuracy)
            if len(self.prediction_accuracy_tracker) > 100:
                self.prediction_accuracy_tracker.pop(0)
        
        # Track coherence stability
        self.coherence_stability_tracker.append(result.basal_enhanced_gct.psi)
        if len(self.coherence_stability_tracker) > 50:
            self.coherence_stability_tracker.pop(0)
    
    def _create_fallback_result(self, market_data: MarketDataPoint) -> EnhancedCoherenceResult:
        """Create fallback result in case of errors"""
        fallback_gct = GCTDimensions(psi=0.5, rho=0.5, q=0.5, f=0.5)
        
        return EnhancedCoherenceResult(
            traditional_gct=fallback_gct,
            basal_enhanced_gct=fallback_gct,
            anticipation_capacity=0.0,
            prediction_confidence=0.0,
            symbolic_resonance=0.0,
            adaptation_efficiency=0.0,
            reservoir_state={}
        )
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        
        # Prediction accuracy
        if self.prediction_accuracy_tracker:
            pred_accuracy = np.mean(self.prediction_accuracy_tracker)
        else:
            pred_accuracy = 0.0
        
        # Coherence stability  
        if self.coherence_stability_tracker:
            coherence_stability = 1.0 - np.std(self.coherence_stability_tracker)
        else:
            coherence_stability = 0.0
        
        # Recent performance trends
        if len(self.coherence_results) >= 10:
            recent_results = self.coherence_results[-10:]
            avg_confidence = np.mean([r.prediction_confidence for r in recent_results])
            avg_resonance = np.mean([r.symbolic_resonance for r in recent_results])
            avg_anticipation = np.mean([abs(r.anticipation_capacity) for r in recent_results])
        else:
            avg_confidence = 0.0
            avg_resonance = 0.0
            avg_anticipation = 0.0
        
        return {
            'prediction_accuracy': pred_accuracy,
            'coherence_stability': max(0.0, coherence_stability),
            'average_confidence': avg_confidence,
            'average_symbolic_resonance': avg_resonance,
            'average_anticipation_magnitude': avg_anticipation,
            'processed_data_points': len(self.market_history),
            'reservoir_health': self.basal_engine.get_reservoir_state(),
            'basal_engine_metrics': self.basal_engine.get_performance_metrics()
        }
    
    def save_integration_state(self, filepath: str):
        """Save complete integration state"""
        state = {
            'integration_config': {
                'integration_strength': self.integration_strength,
                'gct_params': self.gct_params
            },
            'performance_summary': self.get_performance_summary(),
            'recent_results': [
                {
                    'timestamp': r.timestamp.isoformat(),
                    'traditional_gct': {
                        'psi': r.traditional_gct.psi,
                        'rho': r.traditional_gct.rho,
                        'q': r.traditional_gct.q,
                        'f': r.traditional_gct.f
                    },
                    'basal_enhanced_gct': {
                        'psi': r.basal_enhanced_gct.psi,
                        'rho': r.basal_enhanced_gct.rho,
                        'q': r.basal_enhanced_gct.q,
                        'f': r.basal_enhanced_gct.f
                    },
                    'anticipation_capacity': r.anticipation_capacity,
                    'prediction_confidence': r.prediction_confidence,
                    'symbolic_resonance': r.symbolic_resonance
                }
                for r in self.coherence_results[-50:]  # Last 50 results
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
        
        # Also save basal engine state
        basal_filepath = filepath.replace('.json', '_basal_engine.json')
        self.basal_engine.save_state(basal_filepath)
        
        logger.info(f"GCT Basal integration state saved to {filepath}")
    
    def shutdown(self):
        """Graceful shutdown"""
        self.is_running = False
        self.executor.shutdown(wait=True)
        logger.info("GCT Basal Integrator shut down")