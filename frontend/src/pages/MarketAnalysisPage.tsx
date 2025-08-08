import React from 'react';
import { MarketAnalysisChat } from '../components/MarketAnalysisChat';
import { Brain, TrendingUp, BarChart3, Zap } from 'lucide-react';

const MarketAnalysisPage: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'Natural Language Queries',
      description: 'Ask questions about market data in plain English'
    },
    {
      icon: TrendingUp,
      title: 'Pattern Recognition',
      description: 'AI discovers patterns and correlations automatically'
    },
    {
      icon: BarChart3,
      title: 'Visual Analytics',
      description: 'Generate charts and visualizations from queries'
    },
    {
      icon: Zap,
      title: 'Real-time Analysis',
      description: 'Analyze live market data as it streams in'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI-Powered Market Analysis
        </h1>
        <p className="text-gray-600 mb-6">
          Use natural language to explore and analyze market data. Ask questions, discover patterns, 
          and get insights powered by PandasAI.
        </p>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="bg-indigo-100 rounded-lg p-2">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketAnalysisChat />
        </div>
        
        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Symbols Tracked</p>
                <p className="text-2xl font-semibold text-gray-900">127</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Points Analyzed</p>
                <p className="text-2xl font-semibold text-gray-900">1.2M+</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Query Time</p>
                <p className="text-2xl font-semibold text-gray-900">1.3s</p>
              </div>
            </div>
          </div>
          
          {/* Tips */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>Use specific symbol names for targeted analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>Ask for correlations to discover relationships</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>Request charts by adding "plot" or "visualize"</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>Combine coherence metrics with price analysis</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAnalysisPage;