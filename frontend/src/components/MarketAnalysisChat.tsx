import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, TrendingUp, AlertCircle, Lightbulb, BarChart3, Zap, Activity } from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface AnalysisResult {
  id: string;
  query: string;
  result: any;
  metadata?: {
    rows_analyzed: number;
    timeframe: string;
    symbols: string[];
    timestamp: string;
  };
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
}

interface SuggestionCategory {
  name: string;
  icon: React.ReactNode;
  queries: string[];
}

export const MarketAnalysisChat: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState('24h');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [useWebSocket, setUseWebSocket] = useState(false);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const { 
    isConnected, 
    sendPandasAIQuery, 
    pandasAIResults, 
    anomalies, 
    tradingSignals,
    clearPandasAIResults 
  } = useWebSocket();

  const suggestionCategories: SuggestionCategory[] = [
    {
      name: 'Market Overview',
      icon: <TrendingUp className="w-4 h-4" />,
      queries: [
        "Show me today's top gainers by coherence score",
        "Which stocks have the highest volume today?",
        "What's the market sentiment across all symbols?",
        "Find stocks with coherence scores above 0.7"
      ]
    },
    {
      name: 'Technical Analysis',
      icon: <BarChart3 className="w-4 h-4" />,
      queries: [
        "Calculate the correlation between psi scores and price movements",
        "Show me stocks with unusual coherence patterns",
        "Which stocks are showing divergence between price and coherence?",
        "Find mean reversion opportunities based on coherence"
      ]
    },
    {
      name: 'Anomaly Detection',
      icon: <AlertCircle className="w-4 h-4" />,
      queries: [
        "Detect any anomalous spikes in coherence scores",
        "Find stocks with abnormal volume patterns",
        "Show me sudden price movements above 5%",
        "Which symbols have all coherence metrics above 0.7?"
      ]
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [results]);

  // Handle WebSocket PandasAI results
  useEffect(() => {
    if (pandasAIResults.length > 0) {
      const latestResult = pandasAIResults[pandasAIResults.length - 1];
      const newResult: AnalysisResult = {
        id: latestResult.requestId.toString(),
        query: 'Real-time WebSocket query',
        result: latestResult.success ? latestResult.result : latestResult.error,
        timestamp: new Date(),
        error: !latestResult.success ? latestResult.error : undefined
      };
      
      setResults(prev => [...prev, newResult]);
    }
  }, [pandasAIResults]);

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const newResult: AnalysisResult = {
      id: Date.now().toString(),
      query,
      result: null,
      timestamp: new Date(),
      isLoading: true
    };

    setResults(prev => [...prev, newResult]);
    setIsLoading(true);
    setQuery('');
    setShowSuggestions(false);

    try {
      if (useWebSocket && isConnected) {
        // Use WebSocket for real-time analysis
        sendPandasAIQuery(query, selectedSymbols.length > 0 ? selectedSymbols : undefined, timeframe);
        
        // Update the loading result to indicate WebSocket mode
        setResults(prev => 
          prev.map(r => 
            r.id === newResult.id 
              ? { ...r, isLoading: false, result: 'Sent via WebSocket - awaiting real-time response...' }
              : r
          )
        );
      } else {
        // Use HTTP API
        const response = await api.analyzeMarket({
          query,
          symbols: selectedSymbols.length > 0 ? selectedSymbols : undefined,
          timeframe,
          useCache: true
        });

        setResults(prev => 
          prev.map(r => 
            r.id === newResult.id 
              ? { ...r, ...response.data, isLoading: false }
              : r
          )
        );
      }
    } catch (error: any) {
      setResults(prev => 
        prev.map(r => 
          r.id === newResult.id 
            ? { 
                ...r, 
                isLoading: false, 
                error: error.response?.data?.error || 'Analysis failed. Please try again.' 
              }
            : r
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSubmit(new Event('submit') as any);
  };

  const renderResult = (result: AnalysisResult) => {
    if (result.isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing market data...</span>
        </div>
      );
    }

    if (result.error) {
      return (
        <div className="text-red-500 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{result.error}</span>
        </div>
      );
    }

    // Render based on result type
    if (typeof result.result === 'string') {
      return <p className="whitespace-pre-wrap">{result.result}</p>;
    } else if (typeof result.result === 'object') {
      // Check if it's a chart/visualization
      if (result.result.type === 'chart' && result.result.value) {
        return (
          <div className="space-y-2">
            <img 
              src={`data:image/png;base64,${result.result.value}`} 
              alt="Analysis Chart" 
              className="max-w-full rounded-lg"
            />
            {result.metadata && (
              <p className="text-sm text-gray-500">
                Analyzed {result.metadata.rows_analyzed} rows • {result.metadata.timeframe} timeframe
              </p>
            )}
          </div>
        );
      }
      // Render as formatted JSON
      return (
        <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm">
          {JSON.stringify(result.result, null, 2)}
        </pre>
      );
    }
    
    return <p>{String(result.result)}</p>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Market Analysis Assistant</h2>
        <p className="text-sm text-gray-500">Ask questions about market data in natural language</p>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Timeframe:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Mode:</label>
          <button
            onClick={() => setUseWebSocket(!useWebSocket)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
              useWebSocket 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            {useWebSocket ? <Zap className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            <span>{useWebSocket ? 'Real-time' : 'Standard'}</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            ● {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {pandasAIResults.length > 0 && (
          <button
            onClick={clearPandasAIResults}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear WebSocket Results ({pandasAIResults.length})
          </button>
        )}
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {results.length === 0 && showSuggestions ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started with Analysis</h3>
              <p className="text-gray-500 mb-6">Try one of these example queries or ask your own question</p>
            </div>

            {suggestionCategories.map((category, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-700 mb-2">
                  {category.icon}
                  <h4 className="font-medium">{category.name}</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {category.queries.map((suggestion, sidx) => (
                    <button
                      key={sidx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.id} className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-100 rounded-full p-2">
                    <Send className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.query}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="ml-11">
                  {renderResult(result)}
                </div>
              </div>
            ))}
            <div ref={resultsEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about the market data..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {!showSuggestions && results.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSuggestions(true)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Show suggestions
          </button>
        )}
      </form>
    </div>
  );
};