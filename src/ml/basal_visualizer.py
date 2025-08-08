"""
Basal Visualization Dashboard
Real-time visualization system for Basal Reservoir dynamics

This module provides comprehensive visualization capabilities for monitoring
reservoir states, coherence evolution, market predictions, and system health
in real-time, making the system easier for users to operate and understand.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.backends.backend_agg import FigureCanvasAgg
import seaborn as sns
from typing import Dict, List, Tuple, Optional, Any
import asyncio
import threading
from datetime import datetime, timedelta
from collections import deque
import json
from pathlib import Path
import base64
import io
import logging

from .gct_basal_integration import GCTBasalIntegrator, EnhancedCoherenceResult, MarketDataPoint

logger = logging.getLogger(__name__)

# Set visualization style
sns.set_style("darkgrid")
plt.rcParams['figure.facecolor'] = 'black'
plt.rcParams['axes.facecolor'] = 'black'
plt.rcParams['text.color'] = 'white'
plt.rcParams['axes.labelcolor'] = 'white'
plt.rcParams['xtick.color'] = 'white'
plt.rcParams['ytick.color'] = 'white'

class RealtimeDataBuffer:
    """Thread-safe buffer for real-time data visualization"""
    
    def __init__(self, max_size: int = 500):
        self.max_size = max_size
        self.timestamps = deque(maxlen=max_size)
        self.coherence_psi = deque(maxlen=max_size)
        self.coherence_rho = deque(maxlen=max_size)
        self.coherence_q = deque(maxlen=max_size)
        self.coherence_f = deque(maxlen=max_size)
        self.anticipation = deque(maxlen=max_size)
        self.predictions = deque(maxlen=max_size)
        self.confidence = deque(maxlen=max_size)
        self.symbolic_resonance = deque(maxlen=max_size)
        self.reservoir_energy = deque(maxlen=max_size)
        self._lock = threading.Lock()
    
    def add_data_point(self, coherence_result: EnhancedCoherenceResult):
        """Add new data point to buffer"""
        with self._lock:
            self.timestamps.append(coherence_result.timestamp)
            self.coherence_psi.append(coherence_result.basal_enhanced_gct.psi)
            self.coherence_rho.append(coherence_result.basal_enhanced_gct.rho)
            self.coherence_q.append(coherence_result.basal_enhanced_gct.q)
            self.coherence_f.append(coherence_result.basal_enhanced_gct.f)
            self.anticipation.append(coherence_result.anticipation_capacity)
            self.confidence.append(coherence_result.prediction_confidence)
            self.symbolic_resonance.append(coherence_result.symbolic_resonance)
            
            # Extract reservoir energy from state
            avg_energy = coherence_result.reservoir_state.get('average_energy', 0.5)
            self.reservoir_energy.append(avg_energy)
    
    def get_arrays(self) -> Dict[str, np.ndarray]:
        """Get current data as numpy arrays"""
        with self._lock:
            return {
                'timestamps': np.array(self.timestamps),
                'coherence_psi': np.array(self.coherence_psi),
                'coherence_rho': np.array(self.coherence_rho),
                'coherence_q': np.array(self.coherence_q),
                'coherence_f': np.array(self.coherence_f),
                'anticipation': np.array(self.anticipation),
                'confidence': np.array(self.confidence),
                'symbolic_resonance': np.array(self.symbolic_resonance),
                'reservoir_energy': np.array(self.reservoir_energy)
            }

class BasalVisualizationDashboard:
    """
    Real-time visualization dashboard for Basal Reservoir system
    """
    
    def __init__(self, integrator: GCTBasalIntegrator, 
                 enable_real_time: bool = True,
                 save_plots: bool = False,
                 plots_directory: str = "basal_plots"):
        
        self.integrator = integrator
        self.enable_real_time = enable_real_time
        self.save_plots = save_plots
        self.plots_path = Path(plots_directory)
        self.plots_path.mkdir(exist_ok=True)
        
        # Data buffer for real-time updates
        self.data_buffer = RealtimeDataBuffer()
        
        # Visualization state
        self.fig = None
        self.axes = {}
        self.lines = {}
        self.is_initialized = False
        self.is_running = False
        
        # Animation and threading
        self.animation = None
        self.update_thread = None
        self.update_interval = 1.0  # seconds
        
        # Alert visualization
        self.alert_markers = []
        self.current_alerts = []
        
        logger.info("Basal Visualization Dashboard initialized")
    
    def initialize_plots(self):
        """Initialize the main dashboard plots"""
        try:
            # Create figure with subplots
            self.fig, axes_grid = plt.subplots(3, 3, figsize=(16, 12))
            self.fig.suptitle('Basal Reservoir Real-Time Dashboard', fontsize=16, color='white')
            self.fig.patch.set_facecolor('black')
            
            # Flatten axes grid for easier indexing
            axes_flat = axes_grid.flatten()
            
            # 1. Coherence Dimensions Evolution
            self.axes['coherence'] = axes_flat[0]
            self.axes['coherence'].set_title('GCT Coherence Dimensions', color='white')
            self.axes['coherence'].set_ylabel('Coherence Value', color='white')
            self.axes['coherence'].set_ylim(0, 1)
            
            # 2. Anticipation Capacity
            self.axes['anticipation'] = axes_flat[1] 
            self.axes['anticipation'].set_title('Anticipation Capacity', color='white')
            self.axes['anticipation'].set_ylabel('Anticipation', color='white')
            self.axes['anticipation'].set_ylim(-1, 1)
            
            # 3. Prediction Confidence
            self.axes['confidence'] = axes_flat[2]
            self.axes['confidence'].set_title('Prediction Confidence', color='white')
            self.axes['confidence'].set_ylabel('Confidence', color='white')
            self.axes['confidence'].set_ylim(0, 1)
            
            # 4. Symbolic Resonance
            self.axes['resonance'] = axes_flat[3]
            self.axes['resonance'].set_title('Symbolic Resonance', color='white')
            self.axes['resonance'].set_ylabel('Resonance', color='white')
            self.axes['resonance'].set_ylim(0, 1)
            
            # 5. Reservoir Energy Distribution
            self.axes['energy'] = axes_flat[4]
            self.axes['energy'].set_title('Reservoir Energy', color='white')
            self.axes['energy'].set_ylabel('Average Energy', color='white')
            self.axes['energy'].set_ylim(0, 1)
            
            # 6. Reservoir Node Network
            self.axes['network'] = axes_flat[5]
            self.axes['network'].set_title('Reservoir Network State', color='white')
            self.axes['network'].set_aspect('equal')
            
            # 7. Alert Dashboard
            self.axes['alerts'] = axes_flat[6]
            self.axes['alerts'].set_title('System Alerts', color='white')
            self.axes['alerts'].axis('off')
            
            # 8. Performance Metrics
            self.axes['metrics'] = axes_flat[7]
            self.axes['metrics'].set_title('Performance Metrics', color='white')
            self.axes['metrics'].axis('off')
            
            # 9. Coherence Phase Space
            self.axes['phase'] = axes_flat[8]
            self.axes['phase'].set_title('Coherence Phase Space', color='white')
            self.axes['phase'].set_xlabel('Psi (ψ)', color='white')
            self.axes['phase'].set_ylabel('Rho (ρ)', color='white')
            self.axes['phase'].set_xlim(0, 1)
            self.axes['phase'].set_ylim(0, 1)
            
            # Initialize empty line objects
            self._initialize_line_objects()
            
            # Tight layout
            plt.tight_layout()
            
            self.is_initialized = True
            logger.info("Visualization plots initialized")
            
        except Exception as e:
            logger.error(f"Error initializing plots: {e}")
            self.is_initialized = False
    
    def _initialize_line_objects(self):
        """Initialize empty line objects for real-time updates"""
        # Coherence dimensions
        self.lines['psi'], = self.axes['coherence'].plot([], [], 'c-', label='Psi (ψ)', linewidth=2)
        self.lines['rho'], = self.axes['coherence'].plot([], [], 'm-', label='Rho (ρ)', linewidth=2)
        self.lines['q'], = self.axes['coherence'].plot([], [], 'y-', label='Q', linewidth=2)
        self.lines['f'], = self.axes['coherence'].plot([], [], 'g-', label='F', linewidth=2)
        self.axes['coherence'].legend()
        
        # Anticipation
        self.lines['anticipation'], = self.axes['anticipation'].plot([], [], 'r-', linewidth=2)
        self.axes['anticipation'].axhline(y=0, color='white', linestyle='--', alpha=0.5)
        
        # Confidence
        self.lines['confidence'], = self.axes['confidence'].plot([], [], 'b-', linewidth=2)
        
        # Resonance
        self.lines['resonance'], = self.axes['resonance'].plot([], [], 'orange', linewidth=2)
        
        # Energy
        self.lines['energy'], = self.axes['energy'].plot([], [], 'lime', linewidth=2)
        
        # Phase space scatter
        self.lines['phase_scatter'] = self.axes['phase'].scatter([], [], c=[], s=20, cmap='viridis', alpha=0.7)
    
    async def update_display(self):
        """Update the visualization display with latest data"""
        if not self.is_initialized:
            self.initialize_plots()
            return
        
        try:
            # Get latest coherence results
            if len(self.integrator.coherence_results) > 0:
                latest_result = self.integrator.coherence_results[-1]
                self.data_buffer.add_data_point(latest_result)
                
                # Update time series plots
                await self._update_time_series_plots()
                
                # Update reservoir network visualization
                await self._update_network_plot()
                
                # Update alert dashboard
                await self._update_alerts_display()
                
                # Update performance metrics
                await self._update_metrics_display()
                
                # Update phase space plot
                await self._update_phase_space()
                
                # Refresh display
                if self.enable_real_time:
                    plt.pause(0.01)
                    
                # Save plots if enabled
                if self.save_plots:
                    await self._save_current_plots()
                    
        except Exception as e:
            logger.error(f"Error updating display: {e}")
    
    async def _update_time_series_plots(self):
        """Update time series plots with latest data"""
        data = self.data_buffer.get_arrays()
        
        if len(data['timestamps']) == 0:
            return
        
        # Create time axis (relative minutes from start)
        if len(data['timestamps']) > 1:
            time_axis = [(t - data['timestamps'][0]).total_seconds() / 60.0 
                        for t in data['timestamps']]
        else:
            time_axis = [0]
        
        # Update coherence dimensions
        self.lines['psi'].set_data(time_axis, data['coherence_psi'])
        self.lines['rho'].set_data(time_axis, data['coherence_rho'])
        self.lines['q'].set_data(time_axis, data['coherence_q'])
        self.lines['f'].set_data(time_axis, data['coherence_f'])
        
        # Update anticipation
        self.lines['anticipation'].set_data(time_axis, data['anticipation'])
        
        # Update confidence  
        self.lines['confidence'].set_data(time_axis, data['confidence'])
        
        # Update resonance
        self.lines['resonance'].set_data(time_axis, data['symbolic_resonance'])
        
        # Update energy
        self.lines['energy'].set_data(time_axis, data['reservoir_energy'])
        
        # Adjust x-axis limits
        if len(time_axis) > 1:
            time_range = max(time_axis) - min(time_axis)
            for ax_key in ['coherence', 'anticipation', 'confidence', 'resonance', 'energy']:
                self.axes[ax_key].set_xlim(min(time_axis), max(time_axis) + time_range * 0.05)
    
    async def _update_network_plot(self):
        """Update reservoir network visualization"""
        try:
            self.axes['network'].clear()
            self.axes['network'].set_title('Reservoir Network State', color='white')
            
            nodes = self.integrator.basal_engine.nodes
            if len(nodes) == 0:
                return
            
            # Get node positions and states
            positions = np.array([node.position for node in nodes])
            energies = [node.energy for node in nodes]
            activations = [node.activation for node in nodes]
            
            # Color nodes by energy level
            colors = plt.cm.plasma(energies)
            
            # Size nodes by activation level
            sizes = [max(10, abs(act) * 100 + 20) for act in activations]
            
            # Plot nodes
            scatter = self.axes['network'].scatter(
                positions[:, 0], positions[:, 1],
                c=energies, s=sizes, cmap='plasma',
                alpha=0.7, edgecolors='white', linewidth=0.5
            )
            
            # Draw connections for high-energy nodes
            adjacency = self.integrator.basal_engine.adjacency_matrix
            for i, node_i in enumerate(nodes):
                if node_i.energy > 0.7:  # Only show connections for active nodes
                    for j, node_j in enumerate(nodes):
                        if i != j and adjacency[i, j] > 0.5:
                            self.axes['network'].plot(
                                [positions[i, 0], positions[j, 0]],
                                [positions[i, 1], positions[j, 1]],
                                'white', alpha=0.3, linewidth=0.5
                            )
            
            self.axes['network'].set_xlim(0, 1)
            self.axes['network'].set_ylim(0, 1)
            self.axes['network'].set_aspect('equal')
            
        except Exception as e:
            logger.warning(f"Error updating network plot: {e}")
    
    async def _update_alerts_display(self):
        """Update alerts display"""
        try:
            self.axes['alerts'].clear()
            self.axes['alerts'].set_title('System Alerts', color='white')
            self.axes['alerts'].axis('off')
            
            # Display recent alerts (mock data for now)
            alert_text = "System Status: OPERATIONAL\n\n"
            
            # Check for potential issues
            data = self.data_buffer.get_arrays()
            if len(data['coherence_psi']) > 0:
                latest_psi = data['coherence_psi'][-1]
                latest_confidence = data['confidence'][-1] if len(data['confidence']) > 0 else 0
                latest_anticipation = abs(data['anticipation'][-1]) if len(data['anticipation']) > 0 else 0
                
                if latest_psi > 0.9:
                    alert_text += "🔥 HIGH COHERENCE ALERT\n"
                elif latest_psi < 0.2:
                    alert_text += "⚠️  Low coherence detected\n"
                
                if latest_confidence > 0.8:
                    alert_text += "✅ High prediction confidence\n"
                elif latest_confidence < 0.3:
                    alert_text += "⚠️  Low prediction confidence\n"
                
                if latest_anticipation > 0.5:
                    alert_text += "🚀 Strong anticipatory signal\n"
            
            self.axes['alerts'].text(0.05, 0.95, alert_text, 
                                   transform=self.axes['alerts'].transAxes,
                                   fontsize=12, color='white',
                                   verticalalignment='top',
                                   fontfamily='monospace')
            
        except Exception as e:
            logger.warning(f"Error updating alerts display: {e}")
    
    async def _update_metrics_display(self):
        """Update performance metrics display"""
        try:
            self.axes['metrics'].clear()
            self.axes['metrics'].set_title('Performance Metrics', color='white')
            self.axes['metrics'].axis('off')
            
            # Get performance summary
            perf_summary = self.integrator.get_performance_summary()
            
            metrics_text = f"""
Data Points Processed: {perf_summary.get('processed_data_points', 0)}

Prediction Accuracy: {perf_summary.get('prediction_accuracy', 0):.2%}

Coherence Stability: {perf_summary.get('coherence_stability', 0):.3f}

Avg Confidence: {perf_summary.get('average_confidence', 0):.3f}

Avg Resonance: {perf_summary.get('average_symbolic_resonance', 0):.3f}

Reservoir Health: {"GOOD" if perf_summary.get('reservoir_health', {}).get('average_energy', 0) > 0.3 else "DEGRADED"}
            """.strip()
            
            self.axes['metrics'].text(0.05, 0.95, metrics_text,
                                    transform=self.axes['metrics'].transAxes,
                                    fontsize=11, color='white',
                                    verticalalignment='top',
                                    fontfamily='monospace')
            
        except Exception as e:
            logger.warning(f"Error updating metrics display: {e}")
    
    async def _update_phase_space(self):
        """Update coherence phase space plot"""
        try:
            data = self.data_buffer.get_arrays()
            
            if len(data['coherence_psi']) > 0 and len(data['coherence_rho']) > 0:
                # Clear previous scatter
                self.axes['phase'].clear()
                self.axes['phase'].set_title('Coherence Phase Space', color='white')
                self.axes['phase'].set_xlabel('Psi (ψ)', color='white')
                self.axes['phase'].set_ylabel('Rho (ρ)', color='white')
                
                # Create color map based on time (recent points are brighter)
                n_points = len(data['coherence_psi'])
                colors = np.linspace(0, 1, n_points)
                
                # Plot trajectory
                if n_points > 1:
                    self.axes['phase'].plot(data['coherence_psi'], data['coherence_rho'], 
                                          'white', alpha=0.3, linewidth=1)
                
                # Plot points
                scatter = self.axes['phase'].scatter(
                    data['coherence_psi'], data['coherence_rho'],
                    c=colors, s=30, cmap='plasma', alpha=0.8
                )
                
                # Highlight current position
                if n_points > 0:
                    self.axes['phase'].scatter(
                        data['coherence_psi'][-1], data['coherence_rho'][-1],
                        c='red', s=100, marker='*', edgecolors='white'
                    )
                
                self.axes['phase'].set_xlim(0, 1)
                self.axes['phase'].set_ylim(0, 1)
                self.axes['phase'].grid(True, alpha=0.3)
                
        except Exception as e:
            logger.warning(f"Error updating phase space: {e}")
    
    async def _save_current_plots(self):
        """Save current plots to files"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            plot_file = self.plots_path / f"basal_dashboard_{timestamp}.png"
            
            self.fig.savefig(plot_file, dpi=150, bbox_inches='tight', 
                           facecolor='black', edgecolor='none')
            
            # Also save data snapshot
            data_file = self.plots_path / f"basal_data_{timestamp}.json"
            data_snapshot = {
                'timestamp': timestamp,
                'data_arrays': {k: v.tolist() if isinstance(v, np.ndarray) else v 
                               for k, v in self.data_buffer.get_arrays().items()},
                'performance_summary': self.integrator.get_performance_summary()
            }
            
            with open(data_file, 'w') as f:
                json.dump(data_snapshot, f, indent=2, default=str)
                
        except Exception as e:
            logger.warning(f"Error saving plots: {e}")
    
    def start_real_time_display(self):
        """Start real-time display updates"""
        if not self.enable_real_time:
            logger.warning("Real-time display not enabled")
            return
        
        self.is_running = True
        
        # Initialize plots if not already done
        if not self.is_initialized:
            self.initialize_plots()
        
        # Start update loop in separate thread
        def update_loop():
            while self.is_running:
                try:
                    # Run async update
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(self.update_display())
                    loop.close()
                    
                    # Sleep for update interval
                    threading.Event().wait(self.update_interval)
                    
                except Exception as e:
                    logger.error(f"Error in update loop: {e}")
                    threading.Event().wait(5.0)  # Wait longer on error
        
        self.update_thread = threading.Thread(target=update_loop, daemon=True)
        self.update_thread.start()
        
        logger.info("Real-time display started")
    
    def stop_real_time_display(self):
        """Stop real-time display updates"""
        self.is_running = False
        if self.update_thread:
            self.update_thread.join(timeout=5.0)
        logger.info("Real-time display stopped")
    
    def generate_static_report(self, output_file: str = None) -> str:
        """Generate static HTML report of current system state"""
        try:
            if output_file is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_file = f"basal_report_{timestamp}.html"
            
            # Update display to get latest data
            if self.is_initialized:
                asyncio.run(self.update_display())
            
            # Save plot to base64 string
            buffer = io.BytesIO()
            if self.fig:
                self.fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                               facecolor='black', edgecolor='none')
                buffer.seek(0)
                plot_b64 = base64.b64encode(buffer.getvalue()).decode()
                buffer.close()
            else:
                plot_b64 = ""
            
            # Get performance data
            perf_summary = self.integrator.get_performance_summary()
            data_arrays = self.data_buffer.get_arrays()
            
            # Generate HTML report
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Basal Reservoir System Report</title>
                <style>
                    body {{ background-color: #1e1e1e; color: white; font-family: monospace; }}
                    .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
                    .metric {{ margin: 10px 0; }}
                    .plot {{ text-align: center; margin: 20px 0; }}
                    .alert {{ background-color: #333; padding: 10px; margin: 10px 0; border-radius: 5px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Basal Reservoir System Report</h1>
                    <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    
                    <h2>System Performance</h2>
                    <div class="metric">Data Points Processed: {perf_summary.get('processed_data_points', 0)}</div>
                    <div class="metric">Prediction Accuracy: {perf_summary.get('prediction_accuracy', 0):.2%}</div>
                    <div class="metric">Coherence Stability: {perf_summary.get('coherence_stability', 0):.3f}</div>
                    <div class="metric">Average Confidence: {perf_summary.get('average_confidence', 0):.3f}</div>
                    
                    <h2>Current System State</h2>
                    <div class="plot">
                        <img src="data:image/png;base64,{plot_b64}" alt="Basal Reservoir Dashboard" style="max-width: 100%;">
                    </div>
                    
                    <h2>Data Summary</h2>
                    <div class="metric">Time Series Points: {len(data_arrays.get('timestamps', []))}</div>
                    <div class="metric">Latest Coherence (Psi): {data_arrays.get('coherence_psi', [0])[-1] if len(data_arrays.get('coherence_psi', [])) > 0 else 'N/A':.3f}</div>
                    <div class="metric">Latest Anticipation: {data_arrays.get('anticipation', [0])[-1] if len(data_arrays.get('anticipation', [])) > 0 else 'N/A':.3f}</div>
                </div>
            </body>
            </html>
            """
            
            # Write HTML file
            report_path = self.plots_path / output_file
            with open(report_path, 'w') as f:
                f.write(html_content)
            
            logger.info(f"Static report generated: {report_path}")
            return str(report_path)
            
        except Exception as e:
            logger.error(f"Error generating static report: {e}")
            return ""
    
    def close(self):
        """Close visualization dashboard"""
        self.stop_real_time_display()
        if self.fig:
            plt.close(self.fig)
        logger.info("Basal Visualization Dashboard closed")

# Factory function
def create_visualization_dashboard(integrator: GCTBasalIntegrator,
                                 enable_real_time: bool = True) -> BasalVisualizationDashboard:
    """Create configured visualization dashboard"""
    return BasalVisualizationDashboard(
        integrator=integrator,
        enable_real_time=enable_real_time,
        save_plots=True,
        plots_directory="basal_visualization_results"
    )