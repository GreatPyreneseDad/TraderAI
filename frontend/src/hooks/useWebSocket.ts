import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMarketStore } from '@/stores/marketStore'

let socket: Socket | null = null

interface PandasAIResult {
  requestId: number;
  success: boolean;
  result?: any;
  error?: string;
}

interface AnomalyDetectionResult {
  success: boolean;
  anomalies?: any[];
  error?: string;
}

interface TradingSignalsResult {
  success: boolean;
  signals?: any[];
  error?: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [pandasAIResults, setPandasAIResults] = useState<PandasAIResult[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [tradingSignals, setTradingSignals] = useState<any[]>([])
  const { updateMarketData, addAlert } = useMarketStore()

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:3000', {
        transports: ['websocket'],
        autoConnect: true,
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      })

      socket.on('market-update', (data) => {
        updateMarketData(data)
      })

      socket.on('coherence-alert', (alert) => {
        addAlert(alert)
      })

      // PandasAI event handlers
      socket.on('pandas-ai-result', (result: PandasAIResult) => {
        setPandasAIResults(prev => [...prev, result])
      })

      socket.on('pandas-ai-broadcast', (broadcast) => {
        if (broadcast.type === 'analysis') {
          setPandasAIResults(prev => [...prev, {
            requestId: Date.now(),
            success: true,
            result: broadcast.data
          }])
        } else if (broadcast.type === 'anomalies') {
          setAnomalies(prev => [...prev, ...broadcast.data.anomalies])
        }
      })

      socket.on('anomalies-detected', (result: AnomalyDetectionResult) => {
        if (result.success && result.anomalies) {
          setAnomalies(prev => [...prev, ...result.anomalies])
        }
      })

      socket.on('signals-generated', (result: TradingSignalsResult) => {
        if (result.success && result.signals) {
          setTradingSignals(prev => [...prev, ...result.signals])
        }
      })

      socket.on('trading-signals', (data) => {
        setTradingSignals(prev => [...prev, ...data.signals])
      })
    }

    return () => {
      if (socket) {
        socket.disconnect()
        socket = null
      }
    }
  }, [updateMarketData, addAlert])

  const subscribe = useCallback((symbols: string[]) => {
    if (socket && isConnected) {
      socket.emit('subscribe', symbols)
    }
  }, [isConnected])

  const unsubscribe = useCallback((symbols: string[]) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe', symbols)
    }
  }, [isConnected])

  // PandasAI WebSocket methods
  const sendPandasAIQuery = useCallback((query: string, symbols?: string[], timeframe?: string) => {
    if (socket && isConnected) {
      const authToken = localStorage.getItem('authToken')
      socket.emit('pandas-ai-query', {
        query,
        symbols,
        timeframe,
        authorization: authToken ? `Bearer ${authToken}` : undefined
      })
    }
  }, [isConnected])

  const detectAnomalies = useCallback((symbols?: string[]) => {
    if (socket && isConnected) {
      const authToken = localStorage.getItem('authToken')
      socket.emit('detect-anomalies', {
        symbols,
        authorization: authToken ? `Bearer ${authToken}` : undefined
      })
    }
  }, [isConnected])

  const generateSignals = useCallback((strategy: string, symbols: string[]) => {
    if (socket && isConnected) {
      const authToken = localStorage.getItem('authToken')
      socket.emit('generate-signals', {
        strategy,
        symbols,
        authorization: authToken ? `Bearer ${authToken}` : undefined
      })
    }
  }, [isConnected])

  const clearPandasAIResults = useCallback(() => {
    setPandasAIResults([])
  }, [])

  const clearAnomalies = useCallback(() => {
    setAnomalies([])
  }, [])

  const clearTradingSignals = useCallback(() => {
    setTradingSignals([])
  }, [])

  return {
    isConnected,
    subscribe,
    unsubscribe,
    // PandasAI methods and state
    sendPandasAIQuery,
    detectAnomalies,
    generateSignals,
    pandasAIResults,
    anomalies,
    tradingSignals,
    clearPandasAIResults,
    clearAnomalies,
    clearTradingSignals,
  }
}