import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { useMarketStore } from '@/stores/marketStore';
import CoherenceInferenceCard from '@/components/CoherenceInferenceCard';

const CoherenceInference: React.FC = () => {
  const { selectedSymbols, marketData } = useMarketStore();
  
  const { data: coherenceData, isLoading, refetch } = useQuery({
    queryKey: ['coherence-inference', selectedSymbols],
    queryFn: () => api.getCoherence(selectedSymbols),
    enabled: selectedSymbols.length > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getInferenceData = (symbol: string) => {
    const coherence = coherenceData?.symbols?.[symbol];
    const market = marketData[symbol];
    
    if (!coherence && !market) return null;
    
    return {
      symbol,
      price: market?.price || coherence?.price || 0,
      priceChange: market?.priceChange || 0,
      coherenceScores: market?.coherenceScores || coherence?.coherenceScores || {
        psi: 0,
        rho: 0,
        q: 0,
        f: 0
      },
      volume: market?.volume || coherence?.volume || '0',
      timestamp: market?.timestamp || coherence?.timestamp || new Date().toISOString()
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Brain className="h-6 w-6 text-primary-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">
              AI Coherence Inference
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
        <p className="text-gray-600">
          Real-time price vector analysis and trajectory predictions based on GCT coherence metrics
        </p>
      </div>

      {/* Selected Symbols Inference */}
      {selectedSymbols.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Add symbols to your watchlist to see AI coherence inferences
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedSymbols.map(symbol => {
            const data = getInferenceData(symbol);
            if (!data) return null;
            return <CoherenceInferenceCard key={symbol} data={data} />;
          })}
        </div>
      )}

      {/* Inference Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Understanding Price Vectors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold">Vector (Direction)</p>
            <p>The direction of price movement determined by momentum (ψ) and trend strength.</p>
          </div>
          <div>
            <p className="font-semibold">Velocity (Speed)</p>
            <p>Rate of price change calculated from momentum × volume correlation (ψ × ρ).</p>
          </div>
          <div>
            <p className="font-semibold">Trajectory (Path)</p>
            <p>Predicted price path based on energy (q) and stability patterns (f).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoherenceInference;