#!/usr/bin/env python3
"""
Enhanced GCT Framework Demo
Demonstration of Phase 1 implementation from SoulMath analysis
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import asyncio
import numpy as np
from datetime import datetime, timedelta
import logging

# Import our enhanced framework
from ml.enhanced_gct_framework import (
    EnhancedGCTCalculator, 
    EnhancedGCTDimensions,
    MarketStabilityMonitor,
    PatternRecognitionEngine,
    DistortionDetector,
    StabilityState
)
from ml.gct_basal_integration import GCTBasalIntegrator, MarketDataPoint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_test_market_data(num_points: int = 50) -> list[MarketDataPoint]:
    """Generate test market data with various patterns"""
    data_points = []
    base_time = datetime.now() - timedelta(hours=num_points)
    base_price = 100.0
    
    for i in range(num_points):
        timestamp = base_time + timedelta(minutes=i)
        
        # Add trend and volatility
        trend = 0.002 * i  # Slight upward trend
        volatility = np.random.normal(0, 0.01) * base_price
        noise = np.sin(i * 0.3) * 0.5  # Some cyclical pattern
        
        price = base_price + trend + volatility + noise
        volume = int(1000000 * (1 + np.random.uniform(-0.3, 0.3)))
        sentiment = np.random.uniform(-0.5, 0.5)
        
        data_point = MarketDataPoint(
            timestamp=timestamp,
            symbol="TEST",
            price=price,
            volume=volume,
            sentiment=sentiment
        )
        data_points.append(data_point)
    
    return data_points

def demo_enhanced_gct_calculator():
    """Demonstrate the enhanced GCT calculator"""
    print("\n" + "="*60)
    print("DEMO 1: Enhanced GCT Calculator")
    print("="*60)
    
    calculator = EnhancedGCTCalculator()
    
    # Generate test data
    test_data = generate_test_market_data(30)
    market_data = {
        'prices': [dp.price for dp in test_data],
        'volumes': [dp.volume for dp in test_data],
        'sentiment': test_data[-1].sentiment
    }
    
    print(f"✓ Generated {len(test_data)} test data points")
    
    # Calculate enhanced dimensions
    enhanced_dims = calculator.calculate_enhanced_dimensions(market_data)
    print(f"✓ Enhanced GCT Dimensions:")
    print(f"  - Internal Consistency (ψ): {enhanced_dims.psi:.3f}")
    print(f"  - Accumulated Wisdom (ρ): {enhanced_dims.rho:.3f}")
    print(f"  - Emotional Activation (q): {enhanced_dims.q:.3f}")
    print(f"  - Social Frequency (f): {enhanced_dims.f:.3f}")
    print(f"  - Coherence Magnitude: {enhanced_dims.coherence_magnitude():.3f}")
    
    # Full market analysis
    analysis = calculator.analyze_market_state(market_data)
    print(f"✓ Market Analysis:")
    print(f"  - Market Coherence: {analysis['market_coherence']:.3f}")
    print(f"  - Stability State: {analysis['stability_state']}")
    print(f"  - Distortion Factor: {analysis['distortion_factor']:.3f}")
    print(f"  - Prediction Confidence: {analysis['prediction_confidence']:.3f}")

def demo_stability_monitoring():
    """Demonstrate market stability monitoring"""
    print("\n" + "="*60)
    print("DEMO 2: Market Stability Monitoring")
    print("="*60)
    
    monitor = MarketStabilityMonitor()
    
    # Simulate different market conditions
    scenarios = [
        ("Stable Market", [100, 100.5, 100.2, 100.8, 100.3], [1000000] * 5),
        ("Volatile Market", [100, 95, 105, 90, 110], [1500000, 2000000, 800000, 2500000, 1200000]),
        ("Trending Market", [100, 102, 104, 106, 108], [1000000] * 5)
    ]
    
    for scenario_name, prices, volumes in scenarios:
        print(f"\n--- {scenario_name} ---")
        
        enhanced_dims = EnhancedGCTDimensions(psi=0.7, rho=0.6, q=0.5, f=0.4)
        metrics = monitor.update_metrics(prices, volumes, enhanced_dims)
        state = monitor.evaluate_stability()
        
        print(f"Stability State: {state.value}")
        print(f"Metrics: {metrics}")
        
        report = monitor.get_stability_report()
        print(f"Contradictions: {report['metrics']['contradiction_count']}")
        print(f"Volatility Pressure: {report['metrics']['volatility_pressure']:.3f}")

def demo_pattern_recognition():
    """Demonstrate pattern recognition engine"""
    print("\n" + "="*60)
    print("DEMO 3: Pattern Recognition Engine")
    print("="*60)
    
    engine = PatternRecognitionEngine()
    
    # Test with different signal types
    signal_types = [
        ("Stable Signal", [100 + np.random.normal(0, 0.1) for _ in range(15)]),
        ("Trending Signal", [100 + 0.5*i + np.random.normal(0, 0.2) for i in range(15)]),
        ("Oscillating Signal", [100 + 3*np.sin(i*0.5) for i in range(15)])
    ]
    
    for signal_name, signal_data in signal_types:
        print(f"\n--- {signal_name} ---")
        
        is_similar, score = engine.detect_self_similarity(signal_data)
        stability_analysis = engine.analyze_pattern_stability()
        
        print(f"Self-similarity detected: {is_similar}")
        print(f"Pattern score: {score:.3f}")
        print(f"Pattern stability: {stability_analysis['stability']:.3f}")
        print(f"Pattern consistency: {stability_analysis['consistency']:.3f}")

def demo_distortion_detection():
    """Demonstrate distortion detection"""
    print("\n" + "="*60)
    print("DEMO 4: Distortion Detection")
    print("="*60)
    
    detector = DistortionDetector()
    
    # Test different distortion scenarios
    scenarios = [
        ("Low Distortion", 1, 0.1, 0.05),
        ("Medium Distortion", 3, 0.5, 0.2),
        ("High Distortion", 8, 0.9, 0.7)
    ]
    
    for scenario_name, contradictions, bias, volatility in scenarios:
        print(f"\n--- {scenario_name} ---")
        
        distortion = detector.calculate_market_distortion(contradictions, bias, volatility)
        trend = detector.get_distortion_trend()
        
        print(f"Distortion Factor: {distortion:.3f}")
        print(f"Distortion Trend: {trend['trend']:.3f}")
        print(f"Recent Average: {trend['recent_average']:.3f}")

async def demo_integrated_system():
    """Demonstrate full integrated system with enhanced framework"""
    print("\n" + "="*60)
    print("DEMO 5: Integrated System with Enhanced Framework")
    print("="*60)
    
    # Create integrator
    integrator = GCTBasalIntegrator()
    print("✓ Created GCT Basal Integrator with enhanced framework")
    
    # Generate realistic test data
    test_data = generate_test_market_data(40)
    print(f"✓ Generated {len(test_data)} market data points")
    
    # Process data through integrated system
    results = []
    for i, data_point in enumerate(test_data):
        result = await integrator.process_market_data_stream(data_point)
        results.append(result)
        
        if i % 10 == 0:  # Print every 10th result
            print(f"Processing point {i+1}:")
            print(f"  - Traditional GCT ψ: {result.traditional_gct.psi:.3f}")
            print(f"  - Enhanced GCT ψ: {result.enhanced_gct_dimensions.psi:.3f}")
            print(f"  - Stability State: {result.stability_state.value}")
            print(f"  - Market Coherence: {result.market_coherence_score:.3f}")
            print(f"  - Distortion Factor: {result.distortion_factor:.3f}")
    
    # Performance summary
    performance = integrator.get_performance_summary()
    print(f"\n✓ System Performance:")
    print(f"  - Prediction Accuracy: {performance['prediction_accuracy']:.3f}")
    print(f"  - Coherence Stability: {performance['coherence_stability']:.3f}")
    print(f"  - Average Confidence: {performance['average_confidence']:.3f}")
    print(f"  - Enhanced Features: Active and functional")
    
    # Shutdown
    integrator.shutdown()

async def run_comprehensive_demo():
    """Run all enhanced GCT demos"""
    print("🚀 ENHANCED GCT FRAMEWORK COMPREHENSIVE DEMO")
    print("Phase 1 Implementation: Enhanced Dimensions, Stability Monitoring, Distortion Detection")
    print("")
    
    # Run individual demos
    demo_enhanced_gct_calculator()
    demo_stability_monitoring()
    demo_pattern_recognition()
    demo_distortion_detection()
    await demo_integrated_system()
    
    print("\n" + "="*60)
    print("ENHANCED GCT DEMO COMPLETE")
    print("="*60)
    print("✓ Enhanced GCT dimensions implemented and functional")
    print("✓ Market stability monitoring active with threshold detection")
    print("✓ Distortion detection integrated into prediction pipeline")
    print("✓ Pattern recognition engine operational")
    print("✓ Full integration with existing Basal Reservoir system")
    print("\n📈 Phase 1 implementation complete!")
    print("   Ready for Phase 2: Advanced features and performance optimization")

if __name__ == "__main__":
    try:
        asyncio.run(run_comprehensive_demo())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        print(f"\n❌ Demo failed: {e}")