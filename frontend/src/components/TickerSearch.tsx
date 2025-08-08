import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useMarketStore } from '@/stores/marketStore';

// Popular symbols for quick suggestions
const POPULAR_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' }
];

export default function TickerSearch() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(POPULAR_SYMBOLS);
  const searchRef = useRef<HTMLDivElement>(null);
  const { selectedSymbols, addSymbol } = useMarketStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    
    if (value.length > 0) {
      const filtered = POPULAR_SYMBOLS.filter(item =>
        item.symbol.toLowerCase().includes(value.toLowerCase()) ||
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(POPULAR_SYMBOLS);
      setShowSuggestions(false);
    }
  };

  const handleAddSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      addSymbol(symbol);
    }
    setQuery('');
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length > 0) {
      handleAddSymbol(query.toUpperCase());
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyPress={handleKeyPress}
          placeholder="Search symbols..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <div
                key={item.symbol}
                onClick={() => handleAddSymbol(item.symbol)}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{item.symbol}</div>
                  <div className="text-xs text-gray-500">{item.name}</div>
                </div>
                {!selectedSymbols.includes(item.symbol) && (
                  <Plus className="h-4 w-4 text-gray-400 mr-2" />
                )}
              </div>
            ))
          ) : (
            <div className="py-2 px-3 text-gray-500 text-sm">
              No symbols found. Press Enter to add "{query.toUpperCase()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}