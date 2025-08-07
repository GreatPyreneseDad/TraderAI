import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMarketStore } from '@/stores/marketStore'

let socket: Socket | null = null

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
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

  return {
    isConnected,
    subscribe,
    unsubscribe,
  }
}