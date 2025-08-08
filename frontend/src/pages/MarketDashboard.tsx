import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useMarketStore } from '@/stores/marketStore'
import { api } from '@/services/api'
import CoherenceChart from '@/components/CoherenceChart'
import MarketSummaryCard from '@/components/MarketSummaryCard'
import { useWebSocket } from '@/hooks/useWebSocket'
import Watchlist from '@/components/Watchlist'
import TickerSearch from '@/components/TickerSearch'

export default function MarketDashboard() {
  const { selectedSymbols, marketData } = useMarketStore()
  const { subscribe } = useWebSocket()

  // Fetch market summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['market-summary'],
    queryFn: () => api.getMarketSummary(),
  })

  // Fetch coherence data
  const { data: coherenceData, isLoading: coherenceLoading } = useQuery({
    queryKey: ['coherence', selectedSymbols],
    queryFn: () => api.getCoherence(selectedSymbols),
    enabled: selectedSymbols.length > 0,
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (selectedSymbols.length > 0) {
      subscribe(selectedSymbols)
    }
  }, [selectedSymbols, subscribe])

  if (summaryLoading || coherenceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Dashboard</h1>
          <p className="mt-2 text-gray-600">Real-time market intelligence powered by ECNE and GCT</p>
        </div>
        <div className="mt-4 sm:mt-0 w-full sm:w-64">
          <TickerSearch />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Watchlist */}
        <div className="lg:col-span-1">
          <Watchlist />
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Market Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MarketSummaryCard
          title="Top Gainers"
          icon={TrendingUp}
          iconColor="text-green-600"
          items={summary?.summary.topGainers || []}
          valueKey="coherenceChange"
          valuePrefix="+"
          valueColor="text-green-600"
        />
        
        <MarketSummaryCard
          title="Top Losers"
          icon={TrendingDown}
          iconColor="text-red-600"
          items={summary?.summary.topLosers || []}
          valueKey="coherenceChange"
          valueColor="text-red-600"
        />
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Critical Alerts</h3>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">
            {summary?.summary.criticalAlerts || 0}
          </div>
          <p className="text-sm text-gray-600 mt-2">Unacknowledged alerts</p>
        </div>
      </div>

      {/* Coherence Analysis */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Coherence Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedSymbols.map((symbol) => {
            const data = coherenceData?.symbols[symbol]
            const realtimeData = marketData[symbol]
            const displayData = realtimeData || data

            if (!displayData) return null

            return (
              <div key={symbol} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{symbol}</h3>
                    <p className="text-2xl font-bold">${displayData.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Volume</p>
                    <p className="font-medium">{displayData.volume}</p>
                  </div>
                </div>
                
                <CoherenceChart coherenceScores={displayData.current || displayData.coherenceScores} />
                
                <div className="grid grid-cols-4 gap-2 mt-4 text-sm">
                  <div>
                    <p className="text-gray-600">ψ (Psi)</p>
                    <p className="font-medium">{displayData.current?.psi.toFixed(3) || displayData.coherenceScores?.psi.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">ρ (Rho)</p>
                    <p className="font-medium">{displayData.current?.rho.toFixed(3) || displayData.coherenceScores?.rho.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">q (Charge)</p>
                    <p className="font-medium">{displayData.current?.q.toFixed(3) || displayData.coherenceScores?.q.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">f (Freq)</p>
                    <p className="font-medium">{displayData.current?.f.toFixed(3) || displayData.coherenceScores?.f.toFixed(3)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

          {/* Real-time Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Active Symbols</p>
                <p className="font-medium">{selectedSymbols.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Data Points/Min</p>
                <p className="font-medium">200+</p>
              </div>
              <div>
                <p className="text-gray-600">Latency</p>
                <p className="font-medium text-green-600">&lt;100ms</p>
              </div>
              <div>
                <p className="text-gray-600">Last Update</p>
                <p className="font-medium">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}