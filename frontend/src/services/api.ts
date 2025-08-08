import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const api = {
  // Market endpoints
  getMarketSummary: async () => {
    const response = await apiClient.get('/market/summary')
    return response.data
  },

  getCoherence: async (symbols: string[]) => {
    const response = await apiClient.get('/market/coherence', {
      params: { symbols: symbols.join(',') },
    })
    return response.data
  },

  getSymbolData: async (symbol: string, period: string = '24h') => {
    const response = await apiClient.get(`/market/symbols/${symbol}`, {
      params: { period },
    })
    return response.data
  },

  subscribeToSymbols: async (symbols: string[]) => {
    const response = await apiClient.post('/market/subscribe', null, {
      params: { symbols: symbols.join(',') },
    })
    return response.data
  },

  // Inference endpoints
  generateInference: async (data: {
    query: string
    context?: string
    userId: string
    symbols?: string[]
  }) => {
    const response = await apiClient.post('/inference/generate', data)
    return response.data
  },

  verifyInference: async (data: {
    inferenceId: string
    userId: string
    selectedOption: string
    rationale?: string
    confidence: number
  }) => {
    const response = await apiClient.post('/inference/verify', data)
    return response.data
  },

  getInferenceHistory: async (userId: string, limit = 20, offset = 0) => {
    const response = await apiClient.get(`/inference/history/${userId}`, {
      params: { limit, offset },
    })
    return response.data
  },

  // Debate endpoints
  analyzeDebate: async (data: {
    symbol: string
    question: string
    userId: string
  }) => {
    const response = await apiClient.post('/debate/analyze', data)
    return response.data
  },

  getDebateResults: async (id: string) => {
    const response = await apiClient.get(`/debate/results/${id}`)
    return response.data
  },

  voteOnDebate: async (data: {
    debateId: string
    userId: string
    votedFor: 'BULL' | 'BEAR' | 'NEUTRAL'
    rationale?: string
  }) => {
    const response = await apiClient.post('/debate/vote', data)
    return response.data
  },

  // Alert endpoints
  getAlerts: async (params?: {
    severity?: string
    limit?: number
    acknowledged?: boolean
  }) => {
    const response = await apiClient.get('/alerts', { params })
    return response.data
  },

  acknowledgeAlert: async (id: string, userId: string) => {
    const response = await apiClient.put(`/alerts/${id}/acknowledge`, { userId })
    return response.data
  },

  // Health check
  getHealth: async () => {
    const response = await apiClient.get('/health')
    return response.data
  },

  // Market Analysis endpoints (PandasAI)
  analyzeMarket: async (data: {
    query: string
    symbols?: string[]
    timeframe?: string
    useCache?: boolean
  }) => {
    const response = await apiClient.post('/market-analysis/query', data)
    return response.data
  },

  generateInsights: async (symbols: string[]) => {
    const response = await apiClient.post('/market-analysis/insights', { symbols })
    return response.data
  },

  detectAnomalies: async (symbols?: string[]) => {
    const response = await apiClient.post('/market-analysis/anomalies', { symbols })
    return response.data
  },

  generateTradingSignals: async (strategy: string, symbols: string[]) => {
    const response = await apiClient.post('/market-analysis/signals', { strategy, symbols })
    return response.data
  },

  getAnalysisSuggestions: async (context?: string) => {
    const response = await apiClient.get('/market-analysis/suggestions', {
      params: { context }
    })
    return response.data
  },

  batchAnalyze: async (queries: Array<{ query: string; symbols?: string[] }>, timeframe?: string) => {
    const response = await apiClient.post('/market-analysis/batch', { queries, timeframe })
    return response.data
  },

  // Enhanced Inference endpoints (PandasAI + Claude)
  generateEnhancedInference: async (data: {
    query: string
    context?: string
    userId: string
    symbols?: string[]
    analysisQuery?: string
  }) => {
    const response = await apiClient.post('/inference-enhanced/generate-enhanced', data)
    return response.data
  },

  generateInferenceWithAnomalies: async (data: {
    query: string
    userId: string
    symbols?: string[]
  }) => {
    const response = await apiClient.post('/inference-enhanced/generate-with-anomalies', data)
    return response.data
  },

  generateInferenceWithSignals: async (data: {
    strategy: string
    symbols: string[]
    userId: string
  }) => {
    const response = await apiClient.post('/inference-enhanced/generate-with-signals', data)
    return response.data
  },

  // Chat endpoints
  chatPandas: async (data: {
    query: string
    marketData?: any[]
  }) => {
    const response = await apiClient.post('/chat/pandas', data)
    return response.data
  },

  chatClaude: async (data: {
    messages: Array<{ role: string; content: string }>
    context?: any
  }) => {
    const response = await apiClient.post('/chat/claude', data)
    return response.data
  },

  getNews: async (symbol: string) => {
    const response = await apiClient.get(`/news/${symbol}`)
    return response.data
  },
}