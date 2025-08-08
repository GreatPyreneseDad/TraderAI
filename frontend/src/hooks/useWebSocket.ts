import { useEffect, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { useMarketStore } from '@/stores/marketStore'
import WebSocketManager from '@/services/websocket-manager'

const wsManager = WebSocketManager.getInstance()

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
    const socket = wsManager.connect()
    
    const handleConnect = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

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

    // Check initial connection state
    setIsConnected(wsManager.isConnected())

    return () => {
      // Clean up event listeners but don't disconnect the singleton
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [updateMarketData, addAlert])

  const subscribe = useCallback((symbols: string[]) => {
    const socket = wsManager.getSocket()
    if (socket && isConnected) {
      socket.emit('subscribe', symbols)
    }
  }, [isConnected])

  const unsubscribe = useCallback((symbols: string[]) => {
    const socket = wsManager.getSocket()
    if (socket && isConnected) {
      socket.emit('unsubscribe', symbols)
    }
  }, [isConnected])

  // PandasAI WebSocket methods
  const sendPandasAIQuery = useCallback((query: string, symbols?: string[], timeframe?: string) => {
    const socket = wsManager.getSocket()
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
    const socket = wsManager.getSocket()
    if (socket && isConnected) {
      const authToken = localStorage.getItem('authToken')
      socket.emit('detect-anomalies', {
        symbols,
        authorization: authToken ? `Bearer ${authToken}` : undefined
      })
    }
  }, [isConnected])

  const generateSignals = useCallback((strategy: string, symbols: string[]) => {
    const socket = wsManager.getSocket()
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