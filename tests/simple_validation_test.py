#!/usr/bin/env python3
"""
Simple validation test for enhanced GCT framework
Tests core functionality without external dependencies
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import asyncio
from datetime import datetime
from ml.enhanced_gct_framework import EnhancedGCTCalculator, EnhancedGCTDimensions, StabilityState
from ml.gct_basal_integration import GCTBasalIntegrator, MarketDataPoint

def test_enhanced_gct_dimensions():
    """Test EnhancedGCTDimensions functionality"""
    print("Testing Enhanced GCT Dimensions...")
    
    dims = EnhancedGCTDimensions(psi=0.8, rho=0.6, q=0.7, f=0.5)
    
    # Test basic properties
    assert 0.0 <= dims.psi <= 1.0, f"psi out of range: {dims.psi}"
    assert 0.0 <= dims.rho <= 1.0, f"rho out of range: {dims.rho}"
    assert 0.0 <= dims.q <= 1.0, f"q out of range: {dims.q}"
    assert 0.0 <= dims.f <= 1.0, f"f out of range: {dims.f}"
    
    # Test coherence magnitude
    magnitude = dims.coherence_magnitude()
    assert 0.0 <= magnitude <= 1.0, f"coherence_magnitude out of range: {magnitude}"
    
    # Test dictionary conversion
    dims_dict = dims.to_dict()
    assert 'psi' in dims_dict, "to_dict missing psi"
    assert dims_dict['psi'] == 0.8, f"to_dict psi mismatch: {dims_dict['psi']}"
    
    print("✓ Enhanced GCT Dimensions test passed")

def test_enhanced_gct_calculator():
    """Test EnhancedGCTCalculator functionality"""
    print("Testing Enhanced GCT Calculator...")
    
    calculator = EnhancedGCTCalculator()
    
    # Test with sample market data
    market_data = {
        'prices': [100, 101, 102, 101.5, 103],
        'volumes': [1000000, 1100000, 1200000, 950000, 1300000],
        'sentiment': 0.2
    }
    
    # Calculate enhanced dimensions
    enhanced_dims = calculator.calculate_enhanced_dimensions(market_data)
    assert isinstance(enhanced_dims, EnhancedGCTDimensions), "Wrong return type"
    assert 0.0 <= enhanced_dims.psi <= 1.0, f"Invalid psi: {enhanced_dims.psi}"
    
    # Calculate market coherence
    coherence = calculator.calculate_market_coherence(0.8, 0.6, 0.7, 0.3)
    assert 0.0 <= coherence <= 1.0, f"Invalid coherence: {coherence}"
    
    # Calculate prediction confidence
    confidence = calculator.prediction_confidence(0.7, 0.2)
    assert confidence > 0.0, f"Invalid confidence: {confidence}"
    
    # Full market analysis
    analysis = calculator.analyze_market_state(market_data)
    assert 'enhanced_gct_dimensions' in analysis, "Missing enhanced_gct_dimensions"
    assert 'stability_state' in analysis, "Missing stability_state"
    assert 'market_coherence' in analysis, "Missing market_coherence"
    assert 'distortion_factor' in analysis, "Missing distortion_factor"
    
    print("✓ Enhanced GCT Calculator test passed")

async def test_integration():
    """Test integration with existing GCT Basal system"""
    print("Testing Enhanced GCT Integration...")
    
    integrator = GCTBasalIntegrator()
    
    # Create test market data point
    data_point = MarketDataPoint(
        timestamp=datetime.now(),
        symbol="TEST",
        price=100.0,
        volume=1000000,
        sentiment=0.1
    )
    
    # Process through integrated system
    result = await integrator.process_market_data_stream(data_point)
    
    # Verify enhanced result structure
    assert hasattr(result, 'enhanced_gct_dimensions'), "Missing enhanced_gct_dimensions"
    assert hasattr(result, 'stability_state'), "Missing stability_state"
    assert hasattr(result, 'market_coherence_score'), "Missing market_coherence_score"
    assert hasattr(result, 'distortion_factor'), "Missing distortion_factor"
    
    # Verify enhanced GCT dimensions
    enhanced_dims = result.enhanced_gct_dimensions
    assert isinstance(enhanced_dims, EnhancedGCTDimensions), "Wrong enhanced_gct_dimensions type"
    
    # Verify stability state
    assert isinstance(result.stability_state, StabilityState), "Wrong stability_state type"
    
    # Verify numeric ranges
    assert 0.0 <= result.market_coherence_score <= 1.0, f"Invalid market_coherence_score: {result.market_coherence_score}"
    assert 0.0 <= result.distortion_factor <= 1.0, f"Invalid distortion_factor: {result.distortion_factor}"
    
    integrator.shutdown()
    print("✓ Enhanced GCT Integration test passed")

def test_stability_monitoring():
    """Test stability monitoring functionality"""
    print("Testing Stability Monitoring...")
    
    calculator = EnhancedGCTCalculator()
    
    # Test stable scenario
    stable_data = {
        'prices': [100.0 + i * 0.01 for i in range(20)],  # Very stable prices
        'volumes': [1000000] * 20,
        'sentiment': 0.0
    }
    
    stable_analysis = calculator.analyze_market_state(stable_data)
    assert stable_analysis['stability_state'] == 'STABLE', f"Expected STABLE, got {stable_analysis['stability_state']}"
    
    # Test volatile scenario
    volatile_data = {
        'prices': [100, 95, 105, 90, 110, 85, 115] * 3,  # High volatility
        'volumes': [1000000] * 21,
        'sentiment': 0.0
    }
    
    volatile_analysis = calculator.analyze_market_state(volatile_data)
    # Should detect instability due to high volatility
    assert volatile_analysis['stability_state'] in ['REBALANCE_REQUIRED', 'CRITICAL'], f"Expected instability, got {volatile_analysis['stability_state']}"
    
    print("✓ Stability Monitoring test passed")

def run_all_tests():
    """Run all validation tests"""
    print("🧪 ENHANCED GCT FRAMEWORK VALIDATION TESTS")
    print("="*60)
    
    try:
        # Run individual tests
        test_enhanced_gct_dimensions()
        test_enhanced_gct_calculator()
        asyncio.run(test_integration())
        test_stability_monitoring()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED SUCCESSFULLY")
        print("="*60)
        print("✓ Enhanced GCT Dimensions: Functional")
        print("✓ Enhanced GCT Calculator: Operational")
        print("✓ Integration with Basal System: Working")
        print("✓ Stability Monitoring: Active")
        print("✓ Distortion Detection: Integrated")
        print("\n🎉 Phase 1 Implementation Validated!")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n💥 UNEXPECTED ERROR: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)