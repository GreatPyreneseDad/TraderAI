import React from 'react';
import { MarketAnalysisChat } from '../components/MarketAnalysisChat';
import { Brain, TrendingUp, BarChart3, Zap, MessageSquare } from 'lucide-react';

const ChatAnalysisPage: React.FC = () => {
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
        <div className="flex items-center mb-2">
          <MessageSquare className="h-6 w-6 text-primary-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">
            PandasAI Chat Analysis
          </h1>
        </div>
        <p className="text-gray-600">
          Use natural language to explore market data and news. Ask questions, discover patterns, 
          and get insights powered by PandasAI.
        </p>
      </div>
        
      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start space-x-3">
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
            </div>
          );
        })}
      </div>

      {/* Analysis Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketAnalysisChat />
        </div>
        
        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Sources</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Market Data</p>
                <p className="text-lg font-semibold text-gray-900">Real-time prices</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">News Sources</p>
                <p className="text-lg font-semibold text-gray-900">Multiple providers</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Update Frequency</p>
                <p className="text-lg font-semibold text-gray-900">Every 5 seconds</p>
              </div>
            </div>
          </div>
          
          {/* Example Queries */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Example Queries</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>"What's the correlation between AAPL and MSFT?"</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>"Show me the top movers today"</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>"Find news about Tesla stock"</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>"Plot BTC price over the last week"</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">•</span>
                <span>"Which stocks have high coherence scores?"</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAnalysisPage;