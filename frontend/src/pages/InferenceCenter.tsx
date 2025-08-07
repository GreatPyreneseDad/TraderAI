import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'
import { api } from '@/services/api'
import { InferenceVerification } from '@/components/InferenceVerification'
import { useMarketStore } from '@/stores/marketStore'

// Temporary user ID for demo
const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export default function InferenceCenter() {
  const [query, setQuery] = useState('')
  const [selectedInference, setSelectedInference] = useState<any>(null)
  const { selectedSymbols } = useMarketStore()

  // Generate inference mutation
  const generateMutation = useMutation({
    mutationFn: (data: any) => api.generateInference(data),
    onSuccess: (data) => {
      setSelectedInference(data.inference)
      setQuery('')
    },
  })

  // Verify inference mutation
  const verifyMutation = useMutation({
    mutationFn: (data: any) => api.verifyInference(data),
    onSuccess: () => {
      // Could show success message or update UI
    },
  })

  // Get inference history
  const { data: history } = useQuery({
    queryKey: ['inference-history', DEMO_USER_ID],
    queryFn: () => api.getInferenceHistory(DEMO_USER_ID),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      generateMutation.mutate({
        query,
        userId: DEMO_USER_ID,
        symbols: selectedSymbols,
      })
    }
  }

  const handleVerify = (selectedOption: string, confidence: number, rationale?: string) => {
    if (selectedInference) {
      verifyMutation.mutate({
        inferenceId: selectedInference.id,
        userId: DEMO_USER_ID,
        selectedOption,
        confidence,
        rationale,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Inference Center</h1>
        <p className="mt-2 text-gray-600">
          Get AI-powered market insights with three-angle analysis and debate system
        </p>
      </div>

      {/* Query Input */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Ask a market question
            </label>
            <div className="relative">
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="e.g., Should I invest in NVDA given current AI trends? What's the outlook for Tesla in the next quarter?"
                disabled={generateMutation.isPending}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Analyzing symbols: {selectedSymbols.join(', ')}
            </div>
            <button
              type="submit"
              disabled={!query.trim() || generateMutation.isPending}
              className="btn-primary flex items-center"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate Inference
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Inference Result */}
      {selectedInference && (
        <InferenceVerification
          inference={selectedInference}
          onVerify={handleVerify}
        />
      )}

      {/* Recent Inferences */}
      {history && history.inferences.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Inferences</h3>
          <div className="space-y-3">
            {history.inferences.slice(0, 5).map((inf: any) => (
              <div
                key={inf.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedInference(inf)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{inf.query}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(inf.createdAt).toLocaleDateString()} at{' '}
                      {new Date(inf.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {inf.selectedOption && (
                    <span className="ml-4 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {inf.selectedOption}
                    </span>
                  )}
                </div>
                {inf.debate && (
                  <div className="mt-2 text-sm text-gray-600">
                    Debate winner: {inf.debate.winner} ({(inf.debate.confidence * 100).toFixed(0)}% confidence)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}