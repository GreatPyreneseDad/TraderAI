import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Star, Plus } from 'lucide-react';
import { useMarketStore } from '@/stores/marketStore';
import TickerSearch from './TickerSearch';

export default function Watchlist() {
  const { selectedSymbols, removeSymbol, marketData } = useMarketStore();
  const [showAddSymbol, setShowAddSymbol] = useState(false);

  const getSymbolData = (symbol: string) => {
    return marketData[symbol] || null;
  };

  const formatPrice = (price: number, symbol: string) => {
    const isCrypto = symbol === 'BTC' || symbol === 'ETH';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: isCrypto ? 0 : 2,
      maximumFractionDigits: isCrypto ? 0 : 2
    }).format(price);
  };

  const formatVolume = (volume: string | number) => {
    const num = typeof volume === 'string' ? parseInt(volume) : volume;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Watchlist</h2>
        <button
          onClick={() => setShowAddSymbol(!showAddSymbol)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {showAddSymbol && (
        <div className="mb-4">
          <TickerSearch />
        </div>
      )}

      {selectedSymbols.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No symbols in watchlist</p>
          <p className="text-sm mt-1">Click + to add symbols</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedSymbols.map((symbol) => {
            const data = getSymbolData(symbol);
            const priceChange = data?.priceChange || 0;
            const isPositive = priceChange > 0;
            const isNeutral = priceChange === 0;

            return (
              <div
                key={symbol}
                className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{symbol}</h3>
                    <button
                      onClick={() => removeSymbol(symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  {data && (
                    <div className="mt-1 text-sm text-gray-600">
                      Vol: {formatVolume(data.volume)}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  {data ? (
                    <>
                      <div className="font-semibold">
                        {formatPrice(data.price, symbol)}
                      </div>
                      <div className={`flex items-center justify-end text-sm ${
                        isPositive ? 'text-green-600' : 
                        isNeutral ? 'text-gray-600' : 
                        'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : isNeutral ? (
                          <Minus className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {isPositive && '+'}{priceChange.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-16 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}