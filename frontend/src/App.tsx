import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { TrendingUp, Brain, AlertCircle, BarChart3, Home, MessageSquare } from 'lucide-react'
import MarketDashboard from './pages/MarketDashboard'
import CoherenceInference from './pages/CoherenceInference'
import AlertsPage from './pages/AlertsPage'
import MarketSentimentPage from './pages/MarketSentimentPage'
import ChatAnalysisPage from './pages/ChatAnalysisPage'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const location = useLocation()
  const { isConnected } = useWebSocket()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Market Sentiment', href: '/market', icon: TrendingUp },
    { name: 'Chat Analysis', href: '/analysis', icon: MessageSquare },
    { name: 'AI Inference', href: '/inference', icon: Brain },
    { name: 'Alerts', href: '/alerts', icon: AlertCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <BarChart3 className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TraderAI</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center">
              <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<MarketDashboard />} />
          <Route path="/market" element={<MarketSentimentPage />} />
          <Route path="/analysis" element={<ChatAnalysisPage />} />
          <Route path="/inference" element={<CoherenceInference />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App