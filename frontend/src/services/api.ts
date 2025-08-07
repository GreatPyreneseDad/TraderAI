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
}