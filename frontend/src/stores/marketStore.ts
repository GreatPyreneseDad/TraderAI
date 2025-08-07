import { create } from 'zustand'

interface MarketData {
  symbol: string
  price: number
  volume: string
  coherenceScores: {
    psi: number
    rho: number
    q: number
    f: number
  }
  sentiment?: number
  timestamp: string
}

interface Alert {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  symbol?: string
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
}

interface MarketStore {
  marketData: Record<string, MarketData>
  alerts: Alert[]
  selectedSymbols: string[]
  updateMarketData: (data: MarketData) => void
  addAlert: (alert: Alert) => void
  acknowledgeAlert: (id: string) => void
  setSelectedSymbols: (symbols: string[]) => void
}

export const useMarketStore = create<MarketStore>((set) => ({
  marketData: {},
  alerts: [],
  selectedSymbols: ['AAPL', 'NVDA', 'TSLA', 'MSFT'],

  updateMarketData: (data) =>
    set((state) => ({
      marketData: {
        ...state.marketData,
        [data.symbol]: data,
      },
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50), // Keep last 50 alerts
    })),

  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      ),
    })),

  setSelectedSymbols: (symbols) =>
    set({ selectedSymbols: symbols }),
}))