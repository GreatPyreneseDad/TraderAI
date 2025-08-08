#!/usr/bin/env python3
"""
Basal Reservoir Integration Tests
Tests for the complete Basal Reservoir Computing system integration
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import pytest
import numpy as np
import asyncio
from datetime import datetime, timedelta

# Import modules to test
from ml.basal_reservoir_engine import BasalReservoirEngine, BasalReservoirConfig, GCTDimensions
from ml.gct_basal_integration import GCTBasalIntegrator, MarketDataPoint
from ml.basal_market_analyzer import create_market_analyzer

class TestBasalReservoirEngine:
    """Test the core Basal Reservoir engine"""
    
    def test_engine_initialization(self):
        """Test engine initializes correctly"""
        config = BasalReservoirConfig(num_nodes=20)
        engine = BasalReservoirEngine(config)
        
        assert len(engine.nodes) == 20
        assert engine.adjacency_matrix is not None
        assert engine.adjacency_matrix.shape == (20, 20)
    
    def test_reservoir_state_update(self):
        """Test reservoir state updates"""
        engine = BasalReservoirEngine(BasalReservoirConfig(num_nodes=10))
        
        # Update without external inputs
        activations1 = engine.update_reservoir_state()
        assert len(activations1) == 10
        
        # Update with external inputs
        inputs = {0: 0.5, 1: -0.3}
        activations2 = engine.update_reservoir_state(inputs)
        assert len(activations2) == 10
        
        # States should be different
        assert not np.array_equal(activations1, activations2)
    
    def test_enhanced_coherence(self):
        """Test enhanced coherence computation"""
        engine = BasalReservoirEngine(BasalReservoirConfig(num_nodes=10))
        
        # Run a few updates to build history
        for _ in range(5):
            engine.update_reservoir_state()
        
        coherence = engine.compute_enhanced_coherence()
        assert 0.0 <= coherence <= 1.0
        
        anticipation = engine.compute_anticipation_capacity()
        assert isinstance(anticipation, float)
    
    def test_market_prediction(self):
        """Test market pattern prediction"""
        engine = BasalReservoirEngine(BasalReservoirConfig(num_nodes=15))
        
        # Create test market data
        market_data = np.sin(np.linspace(0, 2*np.pi, 20))
        
        predictions = engine.predict_market_pattern(market_data, steps_ahead=3)
        assert len(predictions) == 3
        assert all(isinstance(p, (float, np.floating)) for p in predictions)

class TestGCTBasalIntegration:
    """Test GCT-Basal integration functionality"""
    
    def test_integrator_initialization(self):
        """Test integrator initializes correctly"""
        integrator = GCTBasalIntegrator()
        
        assert integrator.basal_engine is not None
        assert len(integrator.market_history) == 0
        assert len(integrator.coherence_results) == 0
    
    @pytest.mark.asyncio
    async def test_market_data_processing(self):
        """Test processing market data stream"""
        integrator = GCTBasalIntegrator()
        
        # Create test market data point
        data_point = MarketDataPoint(
            timestamp=datetime.now(),
            symbol="TEST",
            price=100.0,
            volume=10000,
            sentiment=0.2
        )
        
        # Process data point
        result = await integrator.process_market_data_stream(data_point)
        
        assert result is not None
        assert isinstance(result.traditional_gct, GCTDimensions)
        assert isinstance(result.basal_enhanced_gct, GCTDimensions)
        assert 0.0 <= result.prediction_confidence <= 1.0
        assert 0.0 <= result.symbolic_resonance <= 1.0
        
        # Check that data was stored
        assert len(integrator.market_history) == 1
        assert len(integrator.coherence_results) == 1
    
    @pytest.mark.asyncio
    async def test_multiple_data_points(self):
        """Test processing multiple data points"""
        integrator = GCTBasalIntegrator()
        
        # Create multiple data points
        base_time = datetime.now()
        data_points = []
        for i in range(10):
            data_point = MarketDataPoint(
                timestamp=base_time + timedelta(minutes=i),
                symbol="TEST",
                price=100.0 + i * 0.5,
                volume=10000 + i * 100,
                sentiment=0.1 * i
            )
            data_points.append(data_point)
        
        # Process all data points
        results = []
        for data_point in data_points:
            result = await integrator.process_market_data_stream(data_point)
            results.append(result)
        
        assert len(results) == 10
        assert len(integrator.market_history) == 10
        
        # Check that coherence evolves
        coherence_values = [r.basal_enhanced_gct.psi for r in results]
        assert len(set(coherence_values)) > 1  # Should have some variation

class TestBasalMarketAnalyzer:
    """Test the complete market analyzer"""
    
    @pytest.mark.asyncio
    async def test_analyzer_creation(self):
        """Test analyzer creation and configuration"""
        analyzer = create_market_analyzer(['AAPL', 'GOOGL'])
        
        assert analyzer is not None
        assert analyzer.config.symbols == ['AAPL', 'GOOGL']
        assert analyzer.integrator is not None
        
        # Shutdown to clean up resources
        analyzer.shutdown()
    
    @pytest.mark.asyncio
    async def test_market_data_analysis(self):
        """Test analyzing market data"""
        analyzer = create_market_analyzer(['TEST'])
        
        # Create test market data
        market_data = []
        base_time = datetime.now()
        base_price = 100.0
        
        for i in range(25):  # Need minimum data points
            price = base_price + np.sin(i * 0.2) * 5 + np.random.normal(0, 0.5)
            data_point = MarketDataPoint(
                timestamp=base_time + timedelta(minutes=i),
                symbol="TEST",
                price=price,
                volume=10000 + int(np.random.normal(0, 1000)),
                sentiment=np.random.uniform(-0.5, 0.5)
            )
            market_data.append(data_point)
        
        # Analyze data
        predictions = await analyzer.analyze_market_data(market_data)
        
        assert len(predictions) >= 1  # Should have at least one prediction
        
        for prediction in predictions:
            assert prediction.symbol == "TEST"
            assert len(prediction.predicted_prices) > 0
            assert len(prediction.confidence_scores) > 0
            assert prediction.trading_signals is not None
            assert prediction.risk_assessment is not None
        
        # Shutdown
        analyzer.shutdown()

class TestSystemIntegration:
    """Test complete system integration"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        # Create system components
        analyzer = create_market_analyzer(['AAPL'], enable_visualization=False)
        
        # Generate realistic test data
        market_data = []
        base_time = datetime.now()
        price = 150.0
        
        # Simulate a day of trading with realistic patterns
        for i in range(50):
            # Add some realistic price movement
            price_change = np.random.normal(0, 0.02) * price  # 2% volatility
            price += price_change
            price = max(price, 1.0)  # Prevent negative prices
            
            # Volume correlated with price movement
            base_volume = 1000000
            volume_multiplier = 1 + abs(price_change / price) * 5
            volume = int(base_volume * volume_multiplier * np.random.uniform(0.5, 2.0))
            
            data_point = MarketDataPoint(
                timestamp=base_time + timedelta(minutes=i),
                symbol="AAPL",
                price=price,
                volume=volume,
                sentiment=np.tanh(price_change / (price * 0.01))
            )
            market_data.append(data_point)
        
        # Analyze data
        predictions = await analyzer.analyze_market_data(market_data)
        
        # Verify results
        assert len(predictions) == 1  # One symbol
        prediction = predictions[0]
        
        assert prediction.symbol == "AAPL"
        assert len(prediction.predicted_prices) > 0
        assert all(conf >= 0.0 and conf <= 1.0 for conf in prediction.confidence_scores)
        assert prediction.trading_signals['action'] in ['BUY', 'SELL', 'HOLD']
        assert prediction.risk_assessment['overall_risk'] >= 0.0
        
        # Test performance metrics
        performance = analyzer.get_performance_summary()
        assert performance['processed_data_points'] == 50
        assert 'average_confidence' in performance
        assert 'integrator_performance' in performance
        
        # Cleanup
        analyzer.shutdown()

def run_tests():
    """Run all tests"""
    print("Running Basal Reservoir integration tests...")
    
    # Run pytest on this file
    pytest.main([__file__, '-v'])

if __name__ == "__main__":
    run_tests()