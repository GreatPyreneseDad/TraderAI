import React, { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { Database, Brain } from 'lucide-react';

export function MarketAnalysisChat() {
  const [activeTab, setActiveTab] = useState<'pandas' | 'claude'>('pandas');

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="flex">
          <button
            onClick={() => setActiveTab('pandas')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'pandas'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Database className="h-4 w-4 mr-2" />
            PandasAI Data Analysis
          </button>
          <button
            onClick={() => setActiveTab('claude')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'claude'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Brain className="h-4 w-4 mr-2" />
            Claude Market Analyst
          </button>
        </div>
      </div>

      {/* Active Chat Interface */}
      <ChatInterface chatType={activeTab} />
    </div>
  );
}