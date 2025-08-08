"""
Enhanced GCT Framework
Implementation of enhanced coherence dimensions and stability monitoring
based on cleaned mathematical concepts from curriculum analysis.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)

@dataclass
class EnhancedGCTDimensions:
    """Enhanced coherence dimensions with clear mathematical definitions"""
    psi: float  # Internal Consistency (0.0 - 1.0)
    rho: float  # Accumulated Wisdom (0.0 - 1.0) 
    q: float    # Emotional/Moral Activation (0.0 - 1.0)
    f: float    # Social Belonging/Frequency (0.0 - 1.0)
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'psi': self.psi,
            'rho': self.rho,
            'q': self.q,
            'f': self.f
        }
    
    def coherence_magnitude(self) -> float:
        """Calculate overall coherence magnitude"""
        return np.sqrt(self.psi**2 + self.rho**2 + self.q**2 + self.f**2) / 2.0

class StabilityState(Enum):
    STABLE = "STABLE"
    REBALANCE_REQUIRED = "REBALANCE_REQUIRED"
    CRITICAL = "CRITICAL"

class MarketStabilityMonitor:
    """Monitor market stability using enhanced detection methods"""
    
    def __init__(self):
        self.contradiction_count = 0
        self.volatility_pressure = 0.0
        self.pattern_loops = 0
        self.signal_degradation = 0
        
        # Thresholds
        self.contradiction_threshold = 3
        self.volatility_threshold = 1.5
        self.pattern_loop_threshold = 5
        self.degradation_threshold = 0.7
        
        # History tracking
        self.stability_history: List[Tuple[datetime, StabilityState]] = []
        self.metrics_history: List[Dict[str, float]] = []
    
    def update_metrics(self, 
                      price_data: List[float], 
                      volume_data: List[float],
                      coherence_data: EnhancedGCTDimensions) -> Dict[str, float]:
        """Update stability metrics based on current market data"""
        
        metrics = {}
        
        if len(price_data) >= 5:
            # Calculate volatility pressure
            recent_volatility = np.std(price_data[-5:]) / (np.mean(price_data[-5:]) + 1e-8)
            self.volatility_pressure = recent_volatility * 10  # Scale for threshold comparison
            metrics['volatility_pressure'] = self.volatility_pressure
            
            # Detect contradictions (rapid reversals)
            if len(price_data) >= 10:
                price_changes = np.diff(price_data[-10:])
                reversals = sum(1 for i in range(len(price_changes)-1) 
                               if price_changes[i] * price_changes[i+1] < 0)
                self.contradiction_count = reversals
                metrics['contradiction_count'] = self.contradiction_count
        
        if len(volume_data) >= 5:
            # Pattern loop detection using volume patterns
            volume_changes = np.diff(volume_data[-5:])
            volume_variance = np.var(volume_changes) / (np.mean(volume_data[-5:]) + 1e-8)
            if volume_variance < 0.01:  # Very low variance might indicate loops
                self.pattern_loops += 1
            else:
                self.pattern_loops = max(0, self.pattern_loops - 1)
            metrics['pattern_loops'] = self.pattern_loops
        
        # Signal degradation based on coherence consistency
        coherence_magnitude = coherence_data.coherence_magnitude()
        if coherence_magnitude < 0.3:
            self.signal_degradation += 0.1
        else:
            self.signal_degradation = max(0.0, self.signal_degradation - 0.05)
        metrics['signal_degradation'] = self.signal_degradation
        
        self.metrics_history.append(metrics)
        if len(self.metrics_history) > 100:
            self.metrics_history.pop(0)
        
        return metrics
    
    def evaluate_stability(self) -> StabilityState:
        """Evaluate current market stability state"""
        
        # Critical conditions
        if (self.contradiction_count > self.contradiction_threshold * 1.5 or 
            self.volatility_pressure > self.volatility_threshold * 2 or
            self.signal_degradation > self.degradation_threshold * 1.2):
            state = StabilityState.CRITICAL
        
        # Rebalance required conditions
        elif (self.contradiction_count > self.contradiction_threshold or 
              self.volatility_pressure > self.volatility_threshold or 
              self.pattern_loops > self.pattern_loop_threshold or
              self.signal_degradation > self.degradation_threshold):
            state = StabilityState.REBALANCE_REQUIRED
        
        else:
            state = StabilityState.STABLE
        
        # Record state history
        self.stability_history.append((datetime.now(), state))
        if len(self.stability_history) > 200:
            self.stability_history.pop(0)
        
        return state
    
    def get_stability_report(self) -> Dict[str, Any]:
        """Generate comprehensive stability report"""
        current_state = self.evaluate_stability()
        
        return {
            'current_state': current_state.value,
            'metrics': {
                'contradiction_count': self.contradiction_count,
                'volatility_pressure': self.volatility_pressure,
                'pattern_loops': self.pattern_loops,
                'signal_degradation': self.signal_degradation
            },
            'thresholds': {
                'contradiction_threshold': self.contradiction_threshold,
                'volatility_threshold': self.volatility_threshold,
                'pattern_loop_threshold': self.pattern_loop_threshold,
                'degradation_threshold': self.degradation_threshold
            },
            'recent_history': [
                {'timestamp': ts.isoformat(), 'state': state.value}
                for ts, state in self.stability_history[-10:]
            ]
        }

class PatternRecognitionEngine:
    """Pattern recognition for temporal signal analysis"""
    
    def __init__(self):
        self.pattern_history: List[np.ndarray] = []
        self.signal_variance = 0.0
        self.self_similarity_threshold = 0.3
        
    def detect_self_similarity(self, signal_sequence: List[float]) -> Tuple[bool, float]:
        """Detect repeating patterns in market signals"""
        
        if len(signal_sequence) < 10:
            return False, 0.0
        
        signal_array = np.array(signal_sequence[-10:])
        
        # Calculate pattern score using variance from mean
        pattern_score = np.mean([
            abs(x - np.mean(signal_array)) 
            for x in signal_array
        ])
        
        # Normalize pattern score
        signal_range = np.max(signal_array) - np.min(signal_array)
        if signal_range > 1e-8:
            normalized_score = pattern_score / signal_range
        else:
            normalized_score = 1.0
        
        # Update variance tracking
        self.signal_variance = np.var(signal_array)
        
        # Store pattern for historical comparison
        self.pattern_history.append(signal_array)
        if len(self.pattern_history) > 50:
            self.pattern_history.pop(0)
        
        # Detect self-similarity
        is_similar = normalized_score < self.self_similarity_threshold
        
        return is_similar, normalized_score
    
    def analyze_pattern_stability(self) -> Dict[str, float]:
        """Analyze stability of detected patterns"""
        
        if len(self.pattern_history) < 5:
            return {'stability': 0.0, 'consistency': 0.0}
        
        # Compare recent patterns
        recent_patterns = self.pattern_history[-5:]
        pattern_similarities = []
        
        for i in range(len(recent_patterns) - 1):
            correlation = np.corrcoef(recent_patterns[i], recent_patterns[i+1])[0, 1]
            if not np.isnan(correlation):
                pattern_similarities.append(abs(correlation))
        
        if pattern_similarities:
            stability = np.mean(pattern_similarities)
            consistency = 1.0 - np.std(pattern_similarities)
        else:
            stability = 0.0
            consistency = 0.0
        
        return {
            'stability': np.clip(stability, 0.0, 1.0),
            'consistency': np.clip(consistency, 0.0, 1.0),
            'signal_variance': self.signal_variance
        }

class DistortionDetector:
    """Detect and measure market distortion using enhanced methods"""
    
    def __init__(self):
        self.distortion_history: List[float] = []
        
    def calculate_market_distortion(self, 
                                  contradictions: float, 
                                  bias_factor: float, 
                                  volatility: float) -> float:
        """
        Calculate market distortion using the adapted formula:
        D(P) = C + B + E (Contradiction + Bias + Emotional Dissonance)
        """
        
        # Normalize inputs to [0, 1] range
        normalized_contradictions = np.clip(contradictions / 10.0, 0.0, 1.0)
        normalized_bias = np.clip(bias_factor, 0.0, 1.0)
        normalized_volatility = np.clip(volatility, 0.0, 1.0)
        
        # Calculate distortion
        distortion = normalized_contradictions + normalized_bias + normalized_volatility
        
        # Store in history
        self.distortion_history.append(distortion)
        if len(self.distortion_history) > 100:
            self.distortion_history.pop(0)
        
        return np.clip(distortion / 3.0, 0.0, 1.0)  # Normalize to [0,1]
    
    def get_distortion_trend(self) -> Dict[str, float]:
        """Analyze distortion trends over time"""
        
        if len(self.distortion_history) < 10:
            return {'trend': 0.0, 'volatility': 0.0, 'recent_average': 0.0}
        
        recent_values = self.distortion_history[-10:]
        earlier_values = self.distortion_history[-20:-10] if len(self.distortion_history) >= 20 else recent_values
        
        # Calculate trend
        recent_avg = np.mean(recent_values)
        earlier_avg = np.mean(earlier_values)
        trend = recent_avg - earlier_avg
        
        # Calculate volatility
        volatility = np.std(recent_values)
        
        return {
            'trend': np.clip(trend, -1.0, 1.0),
            'volatility': volatility,
            'recent_average': recent_avg
        }

class EnhancedGCTCalculator:
    """Main calculator for enhanced GCT framework"""
    
    def __init__(self):
        self.stability_monitor = MarketStabilityMonitor()
        self.pattern_engine = PatternRecognitionEngine()
        self.distortion_detector = DistortionDetector()
        
    def calculate_enhanced_dimensions(self, market_data: Dict[str, Any]) -> EnhancedGCTDimensions:
        """Calculate enhanced GCT dimensions using improved formulas"""
        
        prices = market_data.get('prices', [])
        volumes = market_data.get('volumes', [])
        sentiment = market_data.get('sentiment', 0.0)
        
        if len(prices) < 5:
            return EnhancedGCTDimensions(psi=0.5, rho=0.5, q=0.5, f=0.5)
        
        # Enhanced Internal Consistency (ψ): ψ = exp(-volatility_factor)
        volatility_factor = np.std(prices[-10:]) / (np.mean(prices[-10:]) + 1e-8)
        psi = np.exp(-volatility_factor * 2)
        
        # Enhanced Accumulated Wisdom (ρ): ρ = trend_strength / normalization_factor
        if len(prices) >= 10:
            trend_coeffs = np.polyfit(range(len(prices[-10:])), prices[-10:], 1)
            trend_strength = abs(trend_coeffs[0]) / (np.mean(prices[-10:]) + 1e-8)
            rho = min(1.0, trend_strength * 10)
        else:
            rho = 0.5
        
        # Enhanced Emotional Activation (q): q = volume_ratio_normalized
        if len(volumes) >= 5:
            current_volume = volumes[-1]
            avg_volume = np.mean(volumes[-5:])
            volume_ratio = current_volume / (avg_volume + 1e-8)
            q = (np.tanh(volume_ratio - 1) + 1) / 2  # Normalize to [0,1]
        else:
            q = 0.5
        
        # Enhanced Social Frequency (f): f = market_sentiment_normalized
        if isinstance(sentiment, (int, float)):
            f = (sentiment + 1) / 2  # Convert from [-1,1] to [0,1]
        else:
            # Use price momentum as proxy
            if len(prices) >= 3:
                momentum = (prices[-1] - prices[-3]) / prices[-3]
                f = (np.tanh(momentum * 10) + 1) / 2
            else:
                f = 0.5
        
        return EnhancedGCTDimensions(
            psi=np.clip(psi, 0.0, 1.0),
            rho=np.clip(rho, 0.0, 1.0),
            q=np.clip(q, 0.0, 1.0),
            f=np.clip(f, 0.0, 1.0)
        )
    
    def calculate_market_coherence(self, 
                                 price_stability: float,
                                 volume_intensity: float, 
                                 trend_frequency: float,
                                 volatility_entropy: float) -> float:
        """
        Calculate market coherence using enhanced formula:
        Market_Coherence = (price_stability × volume_intensity × trend_frequency) / volatility_entropy
        """
        
        if volatility_entropy <= 1e-8:
            volatility_entropy = 1e-8  # Prevent division by zero
        
        coherence = (price_stability * volume_intensity * trend_frequency) / volatility_entropy
        return np.clip(coherence, 0.0, 1.0)
    
    def prediction_confidence(self, signal_strength: float, distortion_factor: float) -> float:
        """
        Calculate prediction confidence using enhanced formula:
        V(P) = (weighted_evaluation) / (1 + D(P))
        """
        return signal_strength / (1 + distortion_factor)
    
    def analyze_market_state(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive market state analysis using enhanced framework"""
        
        prices = market_data.get('prices', [])
        volumes = market_data.get('volumes', [])
        
        # Calculate enhanced dimensions
        enhanced_gct = self.calculate_enhanced_dimensions(market_data)
        
        # Update stability monitoring
        stability_metrics = {}
        stability_state = StabilityState.STABLE
        if len(prices) >= 5:
            stability_metrics = self.stability_monitor.update_metrics(prices, volumes, enhanced_gct)
            stability_state = self.stability_monitor.evaluate_stability()
        
        # Pattern analysis
        pattern_similarity = False
        pattern_score = 0.0
        if len(prices) >= 10:
            pattern_similarity, pattern_score = self.pattern_engine.detect_self_similarity(prices)
        pattern_stability = self.pattern_engine.analyze_pattern_stability()
        
        # Distortion analysis
        distortion_factor = 0.0
        if len(prices) >= 5:
            contradictions = stability_metrics.get('contradiction_count', 0)
            bias_factor = abs(enhanced_gct.psi - 0.5) * 2  # Deviation from neutral
            volatility = stability_metrics.get('volatility_pressure', 0.0) / 10.0
            distortion_factor = self.distortion_detector.calculate_market_distortion(
                contradictions, bias_factor, volatility
            )
        
        # Overall assessment
        market_coherence = self.calculate_market_coherence(
            enhanced_gct.psi, 
            enhanced_gct.q,
            enhanced_gct.f,
            max(0.1, distortion_factor)  # Ensure non-zero denominator
        )
        
        confidence = self.prediction_confidence(
            enhanced_gct.coherence_magnitude(),
            distortion_factor
        )
        
        return {
            'enhanced_gct_dimensions': enhanced_gct.to_dict(),
            'market_coherence': market_coherence,
            'stability_state': stability_state.value,
            'stability_metrics': stability_metrics,
            'pattern_analysis': {
                'self_similarity_detected': pattern_similarity,
                'pattern_score': pattern_score,
                'pattern_stability': pattern_stability
            },
            'distortion_factor': distortion_factor,
            'distortion_trend': self.distortion_detector.get_distortion_trend(),
            'prediction_confidence': confidence,
            'timestamp': datetime.now().isoformat()
        }