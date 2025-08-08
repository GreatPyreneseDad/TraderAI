import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface SentimentData {
  symbol: string;
  name: string;
  price: number;
  priceChange: number;
  sentiment: number; // -1 to 1
  coherenceScores: {
    psi: number;
    rho: number;
    q: number;
    f: number;
  };
}

const MARKET_INDICES = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ 100' },
  { symbol: 'DIA', name: 'Dow Jones' },
];

const MAG7_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'NVDA', name: 'NVIDIA' },
];

const CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
];

export default function MarketSentimentGrid() {
  const { data: marketData, isLoading } = useQuery({
    queryKey: ['market-sentiment'],
    queryFn: async () => {
      const symbols = [...MARKET_INDICES, ...MAG7_STOCKS, ...CRYPTO].map(s => s.symbol);
      const [summary, coherence] = await Promise.all([
        api.getMarketSummary(),
        api.getCoherence(symbols)
      ]);
      return { summary, coherence };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getSentimentLevel = (sentiment: number): { label: string; color: string; bgColor: string } => {
    if (sentiment > 0.5) return { label: 'Extreme Greed', color: 'text-green-700', bgColor: 'bg-green-100' };
    if (sentiment > 0.25) return { label: 'Greed', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (sentiment > -0.25) return { label: 'Neutral', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    if (sentiment > -0.5) return { label: 'Fear', color: 'text-red-600', bgColor: 'bg-red-50' };
    return { label: 'Extreme Fear', color: 'text-red-700', bgColor: 'bg-red-100' };
  };

  const renderSentimentCard = (symbol: string, name: string) => {
    const data = marketData?.coherence?.symbols?.[symbol];
    if (!data) return null;

    // Calculate sentiment from coherence scores
    // High PSI and RHO indicate stronger trends (fear or greed depending on price movement)
    const priceChange = marketData?.summary?.symbols?.find(s => s.symbol === symbol)?.priceChange || 0;
    const coherenceStrength = (data.coherenceScores.psi + data.coherenceScores.rho) / 2;
    const sentiment = priceChange > 0 ? coherenceStrength : -coherenceStrength;
    
    const sentimentInfo = getSentimentLevel(sentiment);

    return (
      <div key={symbol} className={`rounded-lg p-4 ${sentimentInfo.bgColor} border transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{symbol}</h3>
            <p className="text-sm text-gray-600">{name}</p>
          </div>
          <div className="text-right">
            {priceChange > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : priceChange < 0 ? (
              <TrendingDown className="h-5 w-5 text-red-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            )}
          </div>
        </div>
        
        <div className={`text-lg font-semibold ${sentimentInfo.color} mb-2`}>
          {sentimentInfo.label}
        </div>
        
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Price:</span>
            <span className="font-medium">${data.price?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span className={`font-medium ${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange > 0 ? '+' : ''}{priceChange?.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Coherence Score Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Understanding GCT Coherence Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold">ψ (Psi) - Market Momentum</p>
            <p>Measures the strength of price movement trends. Higher values indicate stronger directional momentum.</p>
          </div>
          <div>
            <p className="font-semibold">ρ (Rho) - Volume Correlation</p>
            <p>Shows how volume aligns with price movements. High values suggest institutional activity.</p>
          </div>
          <div>
            <p className="font-semibold">q (Charge) - Market Energy</p>
            <p>Represents the potential for price movement. Higher values indicate building pressure.</p>
          </div>
          <div>
            <p className="font-semibold">f (Frequency) - Volatility Cycles</p>
            <p>Captures the rhythm of price oscillations. Lower values mean more stable patterns.</p>
          </div>
        </div>
      </div>

      {/* Market Indices */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span> Market Indices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MARKET_INDICES.map(({ symbol, name }) => renderSentimentCard(symbol, name))}
        </div>
      </div>

      {/* Magnificent 7 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">🌟</span> Magnificent 7
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MAG7_STOCKS.map(({ symbol, name }) => renderSentimentCard(symbol, name))}
        </div>
      </div>

      {/* Crypto */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">🪙</span> Cryptocurrency
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRYPTO.map(({ symbol, name }) => renderSentimentCard(symbol, name))}
        </div>
      </div>

      {/* Overall Market Sentiment */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Overall Market Sentiment</h3>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {/* Calculate overall sentiment */}
          Analyzing...
        </div>
        <p className="text-sm text-gray-600">
          Based on GCT coherence analysis across all tracked symbols
        </p>
      </div>
    </div>
  );
}