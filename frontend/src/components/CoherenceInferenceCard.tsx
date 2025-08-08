import React from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import CoherenceChart from './CoherenceChart';

interface InferenceData {
  symbol: string;
  price: number;
  priceChange: number;
  coherenceScores: {
    psi: number;
    rho: number;
    q: number;
    f: number;
  };
  volume: string;
  timestamp: string;
}

interface CoherenceInferenceCardProps {
  data: InferenceData;
}

export default function CoherenceInferenceCard({ data }: CoherenceInferenceCardProps) {
  const { symbol, price, priceChange, coherenceScores, volume } = data;
  
  // Calculate price vector components
  const momentum = coherenceScores.psi; // Price momentum (0-1)
  const volumeStrength = coherenceScores.rho; // Volume correlation (0-1)
  const energy = coherenceScores.q; // Market energy (0-1)
  const stability = 1 - coherenceScores.f; // Inverse of frequency = stability
  
  // Calculate velocity (rate of change)
  const velocity = momentum * volumeStrength;
  
  // Calculate trajectory prediction
  const trajectory = velocity > 0.6 ? 'Strongly Bullish' :
                     velocity > 0.4 ? 'Moderately Bullish' :
                     velocity > 0.2 ? 'Slightly Bullish' :
                     velocity > -0.2 ? 'Neutral/Consolidating' :
                     velocity > -0.4 ? 'Slightly Bearish' :
                     velocity > -0.6 ? 'Moderately Bearish' : 'Strongly Bearish';
  
  // Generate inference text
  const generateInference = () => {
    const direction = priceChange > 0 ? 'upward' : priceChange < 0 ? 'downward' : 'neutral';
    const momentumDesc = momentum > 0.7 ? 'strong' : momentum > 0.4 ? 'moderate' : 'weak';
    const volumeDesc = volumeStrength > 0.7 ? 'high' : volumeStrength > 0.4 ? 'moderate' : 'low';
    const energyDesc = energy > 0.7 ? 'high' : energy > 0.4 ? 'moderate' : 'low';
    const stabilityDesc = stability > 0.7 ? 'stable' : stability > 0.4 ? 'moderately stable' : 'volatile';
    
    return `${symbol} is showing ${direction} price movement with ${momentumDesc} momentum (ψ=${momentum.toFixed(2)}). 
    The ${volumeDesc} volume correlation (ρ=${volumeStrength.toFixed(2)}) suggests ${volumeStrength > 0.7 ? 'institutional' : 'retail'} activity. 
    Market energy is ${energyDesc} (q=${energy.toFixed(2)}), indicating ${energy > 0.7 ? 'potential for significant movement' : 'limited immediate potential'}. 
    The price action is ${stabilityDesc} (f=${coherenceScores.f.toFixed(2)}), ${stability < 0.4 ? 'suggesting increased volatility ahead' : 'with predictable patterns'}.`;
  };
  
  const getTrajectoryColor = () => {
    if (trajectory.includes('Bullish')) return 'text-green-600';
    if (trajectory.includes('Bearish')) return 'text-red-600';
    return 'text-gray-600';
  };
  
  const getVelocityIcon = () => {
    if (velocity > 0.4) return TrendingUp;
    if (velocity < -0.4) return TrendingDown;
    return Activity;
  };
  
  const VelocityIcon = getVelocityIcon();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{symbol}</h3>
          <p className="text-2xl font-bold">${price.toFixed(2)}</p>
          <p className={`text-sm ${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </p>
        </div>
        <VelocityIcon className={`h-8 w-8 ${getTrajectoryColor()}`} />
      </div>
      
      {/* Coherence Chart */}
      <div className="mb-4">
        <CoherenceChart coherenceScores={coherenceScores} />
      </div>
      
      {/* Vector Analysis */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Price Velocity</p>
            <p className="text-lg font-semibold flex items-center">
              {(velocity * 100).toFixed(1)}%
              <Zap className="h-4 w-4 ml-1 text-yellow-500" />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Trajectory</p>
            <p className={`text-lg font-semibold ${getTrajectoryColor()}`}>
              {trajectory}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Momentum Strength</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${momentum * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">{(momentum * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Market Energy</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${energy * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">{(energy * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Text Inference */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Coherence Analysis</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {generateInference()}
        </p>
      </div>
      
      {/* Trading Signal */}
      <div className={`mt-4 p-3 rounded-lg ${
        velocity > 0.5 ? 'bg-green-50 border border-green-200' :
        velocity < -0.5 ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <p className="text-sm font-semibold">
          Trading Signal: {
            velocity > 0.5 ? '🟢 Strong Buy' :
            velocity > 0.3 ? '🟢 Buy' :
            velocity > -0.3 ? '⚪ Hold' :
            velocity > -0.5 ? '🔴 Sell' :
            '🔴 Strong Sell'
          }
        </p>
      </div>
    </div>
  );
}