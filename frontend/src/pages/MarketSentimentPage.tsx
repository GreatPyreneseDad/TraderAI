import React from 'react';
import MarketSentimentGrid from '../components/MarketSentimentGrid';
import { Activity } from 'lucide-react';

const MarketSentimentPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-2">
          <Activity className="h-6 w-6 text-primary-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">
            Market Sentiment Analysis
          </h1>
        </div>
        <p className="text-gray-600">
          Real-time Fear & Greed analysis powered by GCT coherence theory
        </p>
      </div>

      {/* Market Sentiment Grid */}
      <MarketSentimentGrid />
    </div>
  );
};

export default MarketSentimentPage;