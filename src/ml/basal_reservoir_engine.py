"""
Basal Reservoir Engine - Modern Implementation
Integrating Basal Reservoir Computing with Enhanced Coherence Dynamics

Based on: "Cognition Beyond Neurons: Integrating Basal Reservoir Computing with
Enhanced Coherence Dynamics" - MacGregor (2025)

This module implements slime mold-inspired reservoir computing with symbolic
reasoning capabilities for enhanced market prediction and coherence analysis.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
import logging
from dataclasses import dataclass
from scipy.optimize import minimize
from scipy.special import softmax
import matplotlib.pyplot as plt
from concurrent.futures import ThreadPoolExecutor
import json
import time

logger = logging.getLogger(__name__)

@dataclass
class GCTDimensions:
    """Grounded Coherence Theory dimensions"""
    psi: float  # Internal Consistency 
    rho: float  # Accumulated Wisdom
    q: float    # Emotional/Moral Activation
    f: float    # Social Belonging/Symbolic Frequency

@dataclass
class BasalReservoirConfig:
    """Configuration for the Basal Reservoir Computing system"""
    num_nodes: int = 100
    spatial_dimension: int = 2
    learning_rate: float = 0.01
    energy_decay: float = 0.95
    connection_radius: float = 0.3
    homeodynamic_strength: float = 0.1
    coherence_coupling: float = 0.05
    adaptation_rate: float = 0.001
    prediction_horizon: int = 10

class BasalReservoirNode:
    """
    Individual reservoir node inspired by Physarum polycephalum behavior
    Implements homeodynamic regulation and adaptive energetics
    """
    
    def __init__(self, node_id: int, position: np.ndarray, config: BasalReservoirConfig):
        self.node_id = node_id
        self.position = position
        self.config = config
        
        # Core state variables
        self.energy = np.random.uniform(0.3, 0.7)
        self.target_energy = np.random.uniform(0.4, 0.6)
        self.activation = 0.0
        
        # Connection weights (will be populated by reservoir)
        self.incoming_weights: Dict[int, float] = {}
        self.outgoing_weights: Dict[int, float] = {}
        
        # Temporal memory for pattern encoding
        self.activation_history = []
        self.energy_history = []
        
    def update_energy(self, input_signals: Dict[int, float], neighbor_activations: Dict[int, float]) -> float:
        """
        Update node energy based on inputs and neighbor states
        Implements: Xn(t) = Σ Wn,m * Im(t) + Σ λ * Wn,n' * Xn'(t-1)
        """
        # Input contribution
        input_sum = sum(self.incoming_weights.get(source_id, 0) * signal 
                       for source_id, signal in input_signals.items())
        
        # Neighbor contribution with temporal delay
        neighbor_sum = sum(self.incoming_weights.get(neighbor_id, 0) * activation 
                          for neighbor_id, activation in neighbor_activations.items())
        
        # Apply energy dynamics with homeodynamic regulation
        energy_input = input_sum + 0.8 * neighbor_sum  # λ = 0.8
        self.activation = np.tanh(energy_input)
        
        # Energy decay towards target with homeodynamic correction
        energy_error = self.energy - self.target_energy
        self.energy = (self.energy * self.config.energy_decay + 
                      0.1 * self.activation - 
                      0.05 * energy_error)
        
        # Clamp energy to reasonable bounds
        self.energy = np.clip(self.energy, 0.0, 1.0)
        
        # Store history for temporal pattern encoding
        self.activation_history.append(self.activation)
        self.energy_history.append(self.energy)
        
        # Limit history size
        if len(self.activation_history) > 100:
            self.activation_history.pop(0)
            self.energy_history.pop(0)
            
        return self.activation
    
    def homeodynamic_learning(self, neighbor_states: Dict[int, float]):
        """
        Implement homeodynamic learning rule from the paper
        Wn,n'(t+1) = Wn,n'(t) - ηW * (Xn(t) - Tn(t)) * Xn'(t) * Wn,n'(t) / Σk Xk(t)Wn,k(t)
        """
        if not neighbor_states:
            return
            
        # Calculate energy error
        energy_error = self.energy - self.target_energy
        
        # Calculate normalization factor
        total_weighted_input = sum(neighbor_states.get(nid, 0) * self.incoming_weights.get(nid, 0) 
                                  for nid in neighbor_states.keys())
        
        if abs(total_weighted_input) < 1e-6:
            return
        
        # Update connection weights using homeodynamic rule
        for neighbor_id, neighbor_activation in neighbor_states.items():
            if neighbor_id in self.incoming_weights:
                current_weight = self.incoming_weights[neighbor_id]
                
                # Homeodynamic weight update
                weight_delta = (self.config.learning_rate * energy_error * 
                               neighbor_activation * current_weight / total_weighted_input)
                
                new_weight = current_weight - weight_delta
                self.incoming_weights[neighbor_id] = np.clip(new_weight, -2.0, 2.0)
    
    def adapt_target_energy(self):
        """Adaptive target energy based on local activity patterns"""
        if len(self.energy_history) >= 10:
            recent_energy = np.array(self.energy_history[-10:])
            energy_variance = np.var(recent_energy)
            
            # Adapt target based on stability - stable nodes lower target, unstable raise it
            if energy_variance < 0.01:  # Very stable
                self.target_energy = max(0.2, self.target_energy - self.config.adaptation_rate)
            elif energy_variance > 0.1:  # Very unstable  
                self.target_energy = min(0.8, self.target_energy + self.config.adaptation_rate)

class BasalReservoirEngine:
    """
    Main engine implementing Basal Reservoir Computing with SoulMath dynamics
    """
    
    def __init__(self, config: BasalReservoirConfig):
        self.config = config
        self.nodes: List[BasalReservoirNode] = []
        self.adjacency_matrix = None
        self.coherence_state = GCTDimensions(psi=0.5, rho=0.5, q=0.5, f=0.5)
        
        # Reservoir dynamics parameters
        self.gamma = 0.1  # Emotional regulatory constant
        self.delta = 0.15  # Symbolic frequency coupling
        self.epsilon = 0.05  # Memory activity damping
        self.phi = config.coherence_coupling  # Basal-Coherence integration constant
        
        # Temporal state tracking
        self.coherence_history = []
        self.anticipation_history = []
        self.coherence_evolution_history = []
        
        # Performance metrics
        self.prediction_accuracy = 0.0
        self.adaptation_efficiency = 0.0
        
        self._initialize_reservoir()
        
    def _initialize_reservoir(self):
        """Initialize spatial reservoir network with Physarum-inspired topology"""
        logger.info(f"Initializing basal reservoir with {self.config.num_nodes} nodes")
        
        # Create nodes with random spatial distribution
        positions = np.random.uniform(0, 1, (self.config.num_nodes, self.config.spatial_dimension))
        
        for i, pos in enumerate(positions):
            node = BasalReservoirNode(i, pos, self.config)
            self.nodes.append(node)
        
        # Build spatial adjacency and initialize weights
        self._build_spatial_connectivity()
        self._initialize_connection_weights()
        
        logger.info("Basal reservoir initialization complete")
    
    def _build_spatial_connectivity(self):
        """Build spatial connectivity matrix based on distance"""
        n_nodes = len(self.nodes)
        self.adjacency_matrix = np.zeros((n_nodes, n_nodes))
        
        for i, node_i in enumerate(self.nodes):
            for j, node_j in enumerate(self.nodes):
                if i != j:
                    distance = np.linalg.norm(node_i.position - node_j.position)
                    if distance < self.config.connection_radius:
                        # Connection strength inversely related to distance
                        connection_strength = np.exp(-distance / (self.config.connection_radius / 2))
                        self.adjacency_matrix[i, j] = connection_strength
    
    def _initialize_connection_weights(self):
        """Initialize connection weights based on spatial adjacency"""
        for i, node in enumerate(self.nodes):
            # Initialize incoming connections
            for j, connection_strength in enumerate(self.adjacency_matrix[:, i]):
                if connection_strength > 0:
                    weight = np.random.normal(0, 0.2) * connection_strength
                    node.incoming_weights[j] = weight
            
            # Initialize outgoing connections
            for j, connection_strength in enumerate(self.adjacency_matrix[i, :]):
                if connection_strength > 0:
                    weight = np.random.normal(0, 0.2) * connection_strength
                    node.outgoing_weights[j] = weight
    
    def update_reservoir_state(self, external_inputs: Optional[Dict[int, float]] = None) -> np.ndarray:
        """
        Update entire reservoir state for one time step
        Returns current activation pattern
        """
        if external_inputs is None:
            external_inputs = {}
        
        # Get current neighbor activations for each node
        current_activations = {node.node_id: node.activation for node in self.nodes}
        
        # Update all nodes
        new_activations = []
        for node in self.nodes:
            # Get neighbor states (excluding self)
            neighbor_states = {nid: act for nid, act in current_activations.items() 
                             if nid != node.node_id and nid in node.incoming_weights}
            
            # Update node energy and activation
            activation = node.update_energy(external_inputs, neighbor_states)
            new_activations.append(activation)
            
            # Apply homeodynamic learning
            node.homeodynamic_learning(neighbor_states)
            
            # Adapt target energy
            node.adapt_target_energy()
        
        return np.array(new_activations)
    
    def compute_enhanced_coherence(self) -> float:
        """
        Compute enhanced coherence with basal reservoir integration
        dΨ(t)/dt = -γP(t) + δF(t) - εM(t) + φΣ(Xn(t) - Tn(t))
        """
        # Get current reservoir energy deviations
        energy_deviations = [node.energy - node.target_energy for node in self.nodes]
        basal_contribution = self.phi * np.sum(energy_deviations)
        
        # Enhanced symbolic activities (simplified)
        P_t = self._compute_symbolic_acceptance()  # Symbolic acceptance
        F_t = self._compute_symbolic_frequency()   # Symbolic frequency  
        M_t = self._compute_mental_activity()      # Mental activity
        
        # Coherence evolution equation
        coherence_derivative = (-self.gamma * P_t + 
                               self.delta * F_t - 
                               self.epsilon * M_t + 
                               basal_contribution)
        
        # Update coherence using simple Euler integration
        new_psi = self.coherence_state.psi + 0.01 * coherence_derivative
        self.coherence_state.psi = np.clip(new_psi, 0.0, 1.0)
        
        self.coherence_history.append(self.coherence_state.psi)
        return self.coherence_state.psi
    
    def compute_anticipation_capacity(self) -> float:
        """
        Compute anticipation capacity
        Anticipation(t) ≈ φΣ(Xn(t) - Tn(t))
        """
        energy_deviations = [node.energy - node.target_energy for node in self.nodes]
        anticipation = self.phi * np.sum(energy_deviations)
        
        self.anticipation_history.append(anticipation)
        return anticipation
    
    def _compute_symbolic_acceptance(self) -> float:
        """Compute symbolic acceptance based on reservoir consensus"""
        activations = [node.activation for node in self.nodes]
        # High consensus (low variance) increases acceptance
        variance = np.var(activations)
        acceptance = np.exp(-2 * variance)  # Lower variance = higher acceptance
        return acceptance
    
    def _compute_symbolic_frequency(self) -> float:
        """Compute symbolic frequency from temporal patterns"""
        if len(self.coherence_history) < 5:
            return self.coherence_state.f
        
        # Analyze frequency content of recent coherence
        recent_coherence = np.array(self.coherence_history[-20:])
        fft_power = np.abs(np.fft.fft(recent_coherence))
        dominant_frequency = np.argmax(fft_power[1:len(fft_power)//2]) + 1
        normalized_freq = dominant_frequency / len(recent_coherence)
        
        return min(1.0, normalized_freq * 5)  # Scale and clamp
    
    def _compute_mental_activity(self) -> float:
        """Compute mental activity from reservoir dynamics"""
        # Mental activity based on total energy change rate
        if len(self.nodes) == 0:
            return 0.0
            
        energy_changes = []
        for node in self.nodes:
            if len(node.energy_history) >= 2:
                energy_change = abs(node.energy_history[-1] - node.energy_history[-2])
                energy_changes.append(energy_change)
        
        if energy_changes:
            return np.mean(energy_changes)
        return 0.0
    
    def predict_market_pattern(self, market_data: np.ndarray, steps_ahead: int = 5) -> np.ndarray:
        """
        Predict future market patterns using basal reservoir dynamics
        """
        if len(market_data) < 10:
            return np.zeros(steps_ahead)
        
        # Encode market data into reservoir inputs
        market_inputs = self._encode_market_data(market_data[-10:])
        
        # Run reservoir forward for prediction
        predictions = []
        current_state = self.get_reservoir_state()
        
        for step in range(steps_ahead):
            # Update reservoir with current inputs
            if step == 0:
                activations = self.update_reservoir_state(market_inputs)
            else:
                # Use reservoir's internal dynamics for multi-step prediction
                activations = self.update_reservoir_state()
            
            # Extract prediction from current state and coherence
            coherence = self.compute_enhanced_coherence()
            anticipation = self.compute_anticipation_capacity()
            
            # Combine reservoir state with coherence for prediction
            prediction = self._decode_prediction(activations, coherence, anticipation)
            predictions.append(prediction)
        
        return np.array(predictions)
    
    def _encode_market_data(self, market_data: np.ndarray) -> Dict[int, float]:
        """Encode market data into reservoir input signals"""
        if len(market_data) == 0:
            return {}
        
        # Normalize market data
        normalized_data = (market_data - np.mean(market_data)) / (np.std(market_data) + 1e-8)
        
        # Distribute inputs across reservoir nodes
        inputs = {}
        num_input_nodes = min(len(self.nodes) // 4, len(normalized_data))
        
        for i in range(num_input_nodes):
            node_id = i * (len(self.nodes) // num_input_nodes)
            if i < len(normalized_data):
                inputs[node_id] = float(normalized_data[i])
        
        return inputs
    
    def _decode_prediction(self, activations: np.ndarray, coherence: float, anticipation: float) -> float:
        """Decode reservoir state into market prediction"""
        # Weighted combination of reservoir outputs
        weighted_activation = np.average(activations, weights=np.abs(activations) + 0.1)
        
        # Combine with enhanced coherence and anticipation
        prediction = (0.6 * weighted_activation + 
                     0.3 * coherence + 
                     0.1 * anticipation)
        
        return prediction
    
    def get_reservoir_state(self) -> Dict[str, any]:
        """Get current reservoir state for monitoring"""
        return {
            'num_nodes': len(self.nodes),
            'average_energy': np.mean([node.energy for node in self.nodes]),
            'energy_variance': np.var([node.energy for node in self.nodes]),
            'average_activation': np.mean([node.activation for node in self.nodes]),
            'enhanced_coherence': self.coherence_state.psi,
            'anticipation_capacity': self.anticipation_history[-1] if self.anticipation_history else 0.0,
            'connection_density': np.mean([len(node.incoming_weights) for node in self.nodes])
        }
    
    def get_performance_metrics(self) -> Dict[str, float]:
        """Get performance metrics for monitoring"""
        return {
            'prediction_accuracy': self.prediction_accuracy,
            'adaptation_efficiency': self.adaptation_efficiency,
            'coherence_stability': np.std(self.coherence_history[-20:]) if len(self.coherence_history) >= 20 else 1.0,
            'anticipation_range': np.max(self.anticipation_history) - np.min(self.anticipation_history) if self.anticipation_history else 0.0
        }
    
    def save_state(self, filepath: str):
        """Save reservoir state to file"""
        state = {
            'config': {
                'num_nodes': self.config.num_nodes,
                'learning_rate': self.config.learning_rate,
                'energy_decay': self.config.energy_decay,
                'coherence_coupling': self.config.coherence_coupling
            },
            'coherence_state': {
                'psi': self.coherence_state.psi,
                'rho': self.coherence_state.rho,
                'q': self.coherence_state.q,
                'f': self.coherence_state.f
            },
            'node_states': [
                {
                    'node_id': node.node_id,
                    'position': node.position.tolist(),
                    'energy': node.energy,
                    'target_energy': node.target_energy,
                    'activation': node.activation,
                    'incoming_weights': node.incoming_weights
                }
                for node in self.nodes
            ],
            'history': {
                'coherence': self.coherence_history[-100:],  # Last 100 steps
                'anticipation': self.anticipation_history[-100:]
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
        
        logger.info(f"Basal Reservoir state saved to {filepath}")

def create_basal_reservoir_engine(config: Optional[BasalReservoirConfig] = None) -> BasalReservoirEngine:
    """Factory function to create configured Basal Reservoir engine"""
    if config is None:
        config = BasalReservoirConfig()
    
    return BasalReservoirEngine(config)