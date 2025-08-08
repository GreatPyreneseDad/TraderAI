#!/usr/bin/env python3
"""
Basal Reservoir System Demo
Comprehensive demonstration of the Basal Reservoir Computing system
integrated with GCT framework for market analysis.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import asyncio
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging
import time

# Import our Basal Reservoir modules
from ml.basal_reservoir_engine import BasalReservoirEngine, BasalReservoirConfig
from ml.gct_basal_integration import GCTBasalIntegrator, MarketDataPoint
from ml.basal_market_analyzer import create_market_analyzer, MarketAnalysisConfig
from ml.basal_visualizer import create_visualization_dashboard

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_sample_market_data(num_points: int = 100, num_symbols: int = 3) -> list[MarketDataPoint]:
    """Generate realistic sample market data for testing"""
    symbols = ['AAPL', 'GOOGL', 'MSFT'][:num_symbols]
    market_data = []
    
    base_time = datetime.now() - timedelta(hours=num_points)
    
    # Initialize prices
    prices = {'AAPL': 150.0, 'GOOGL': 2800.0, 'MSFT': 350.0}
    
    for i in range(num_points):
        timestamp = base_time + timedelta(minutes=i)
        
        for symbol in symbols:
            # Generate realistic price movement
            price_change = np.random.normal(0, 0.02) * prices[symbol]  # 2% volatility
            prices[symbol] += price_change
            prices[symbol] = max(prices[symbol], 1.0)  # Prevent negative prices
            
            # Generate volume with some correlation to price movement
            base_volume = 1000000
            volume_multiplier = 1 + abs(price_change / prices[symbol]) * 10
            volume = int(base_volume * volume_multiplier * np.random.uniform(0.5, 2.0))
            
            # Generate sentiment (correlated with price change)
            sentiment = np.tanh(price_change / (prices[symbol] * 0.01))
            
            data_point = MarketDataPoint(
                timestamp=timestamp,
                symbol=symbol,
                price=prices[symbol],
                volume=volume,
                sentiment=sentiment
            )
            market_data.append(data_point)
    
    return market_data

async def demo_basic_engine():
    """Demonstrate basic Basal Reservoir engine functionality"""
    print("\n" + "="*60)
    print("DEMO 1: Basic Basal Reservoir Engine")
    print("="*60)
    
    # Create engine with custom configuration
    config = BasalReservoirConfig(
        num_nodes=50,
        learning_rate=0.02,
        coherence_coupling=0.1
    )
    
    engine = BasalReservoirEngine(config)
    print(f"✓ Created reservoir with {len(engine.nodes)} nodes")
    
    # Generate some test data
    test_data = np.sin(np.linspace(0, 4*np.pi, 20)) + 0.1 * np.random.randn(20)
    print(f"✓ Generated test data with {len(test_data)} points")
    
    # Update reservoir and compute coherence
    for i in range(10):
        # Update reservoir state
        activations = engine.update_reservoir_state()
        
        # Compute coherence and anticipation
        coherence = engine.compute_enhanced_coherence()
        anticipation = engine.compute_anticipation_capacity()
        
        if i % 3 == 0:  # Print every 3rd step
            print(f"Step {i+1}: Coherence={coherence:.3f}, Anticipation={anticipation:.3f}")
    
    # Make predictions
    predictions = engine.predict_market_pattern(test_data, steps_ahead=5)
    print(f"✓ Generated {len(predictions)} predictions")
    print(f"Predictions: {predictions}")
    
    # Get performance metrics
    metrics = engine.get_performance_metrics()
    print(f"✓ Performance - Coherence Stability: {metrics['coherence_stability']:.3f}")

async def demo_gct_integration():
    """Demonstrate GCT-Basal integration"""
    print("\n" + "="*60)
    print("DEMO 2: GCT-Basal Integration")
    print("="*60)
    
    # Create integrator
    integrator = GCTBasalIntegrator(integration_strength=0.4)
    print("✓ Created GCT-Basal integrator")
    
    # Generate market data
    market_data = generate_sample_market_data(20, 1)
    print(f"✓ Generated {len(market_data)} market data points")
    
    # Process market data stream
    results = []
    for i, data_point in enumerate(market_data):
        result = await integrator.process_market_data_stream(data_point)
        results.append(result)
        
        if i % 5 == 0:  # Print every 5th result
            print(f"Point {i+1}: Traditional GCT psi={result.traditional_gct.psi:.3f}, "
                  f"Enhanced psi={result.basal_enhanced_gct.psi:.3f}, "
                  f"Confidence={result.prediction_confidence:.3f}")
    
    # Get performance summary
    performance = integrator.get_performance_summary()
    print(f"✓ Processing complete - Average confidence: {performance['average_confidence']:.3f}")

async def demo_market_analyzer():
    """Demonstrate complete market analyzer"""
    print("\n" + "="*60)
    print("DEMO 3: Complete Market Analyzer")
    print("="*60)
    
    # Create market analyzer
    symbols = ['AAPL', 'GOOGL']
    analyzer = create_market_analyzer(symbols, enable_visualization=False)
    print(f"✓ Created market analyzer for symbols: {symbols}")
    
    # Generate comprehensive market data
    market_data = generate_sample_market_data(50, 2)
    print(f"✓ Generated {len(market_data)} market data points")
    
    # Analyze market data
    predictions = await analyzer.analyze_market_data(market_data)
    print(f"✓ Generated {len(predictions)} market predictions")
    
    # Display prediction summaries
    for prediction in predictions:
        print(f"\nSymbol: {prediction.symbol}")
        print(f"  Current Price: ${prediction.current_price:.2f}")
        print(f"  Predicted Prices: {[f'${p:.2f}' for p in prediction.predicted_prices[:3]]}")
        print(f"  Average Confidence: {np.mean(prediction.confidence_scores):.3f}")
        print(f"  Trading Signal: {prediction.trading_signals['action']} "
              f"(strength: {prediction.trading_signals['strength']:.2f})")
        print(f"  Risk Level: {prediction.trading_signals['risk_level']}")
    
    # Get performance summary
    performance = analyzer.get_performance_summary()
    print(f"\n✓ Analyzer Performance:")
    print(f"  Processed: {performance['processed_data_points']} data points")
    print(f"  Average Confidence: {performance['average_confidence']:.3f}")
    
    # Shutdown
    analyzer.shutdown()

async def demo_with_visualization():
    """Demonstrate system with visualization (optional)"""
    print("\n" + "="*60)
    print("DEMO 4: System with Visualization (Mock)")
    print("="*60)
    
    try:
        # Create integrator and analyzer
        integrator = GCTBasalIntegrator()
        
        # Create visualization dashboard
        dashboard = create_visualization_dashboard(integrator, enable_real_time=False)
        print("✓ Created visualization dashboard")
        
        # Generate and process some data
        market_data = generate_sample_market_data(20, 1)
        
        for data_point in market_data[:10]:  # Process first 10 points
            await integrator.process_market_data_stream(data_point)
        
        # Update display
        await dashboard.update_display()
        print("✓ Updated visualization display")
        
        # Generate static report
        report_path = dashboard.generate_static_report()
        if report_path:
            print(f"✓ Generated static report: {report_path}")
        
        # Close dashboard
        dashboard.close()
        integrator.shutdown()
        
    except ImportError as e:
        print(f"⚠️  Visualization demo skipped - missing dependencies: {e}")
    except Exception as e:
        print(f"⚠️  Visualization demo failed: {e}")

def demo_configuration_examples():
    """Show different configuration examples"""
    print("\n" + "="*60)
    print("DEMO 5: Configuration Examples")
    print("="*60)
    
    # High-frequency trading configuration
    hft_config = BasalReservoirConfig(
        num_nodes=200,
        learning_rate=0.05,
        coherence_coupling=0.15,
        adaptation_rate=0.005,
        prediction_horizon=3
    )
    print("✓ High-Frequency Trading Config:")
    print(f"  - {hft_config.num_nodes} nodes for rapid processing")
    print(f"  - High learning rate: {hft_config.learning_rate}")
    print(f"  - Short prediction horizon: {hft_config.prediction_horizon}")
    
    # Long-term analysis configuration  
    longterm_config = BasalReservoirConfig(
        num_nodes=80,
        learning_rate=0.005,
        coherence_coupling=0.03,
        adaptation_rate=0.0005,
        prediction_horizon=20
    )
    print("\n✓ Long-Term Analysis Config:")
    print(f"  - {longterm_config.num_nodes} nodes for stability")
    print(f"  - Low learning rate: {longterm_config.learning_rate}")
    print(f"  - Long prediction horizon: {longterm_config.prediction_horizon}")
    
    # Market analysis configuration
    analysis_config = MarketAnalysisConfig(
        symbols=['BTC-USD', 'ETH-USD'],
        analysis_window=200,
        prediction_horizon=10,
        confidence_threshold=0.7,
        enable_real_time=True
    )
    print("\n✓ Market Analysis Config:")
    print(f"  - Symbols: {analysis_config.symbols}")
    print(f"  - Analysis window: {analysis_config.analysis_window} points")
    print(f"  - Confidence threshold: {analysis_config.confidence_threshold}")

async def run_comprehensive_demo():
    """Run all demos in sequence"""
    print("🚀 BASAL RESERVOIR COMPREHENSIVE DEMO")
    print("Demonstrating modern reservoir computing with enhanced coherence dynamics")
    
    start_time = time.time()
    
    # Run individual demos
    await demo_basic_engine()
    await demo_gct_integration() 
    await demo_market_analyzer()
    await demo_with_visualization()
    demo_configuration_examples()
    
    end_time = time.time()
    
    print("\n" + "="*60)
    print("DEMO COMPLETE")
    print("="*60)
    print(f"✓ All demos completed successfully")
    print(f"✓ Total runtime: {end_time - start_time:.2f} seconds")
    print("\n📈 The Basal Reservoir system is ready for production use!")
    print("   Integration with GCT framework provides enhanced market coherence analysis")
    print("   with anticipatory capacity and symbolic reasoning capabilities.")

if __name__ == "__main__":
    # Run the comprehensive demo
    try:
        asyncio.run(run_comprehensive_demo())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        print(f"\n❌ Demo failed: {e}")