import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, XCircle, Check } from 'lucide-react'
import { api } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'

// Temporary user ID for demo
const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export default function AlertsPage() {
  const queryClient = useQueryClient()

  // Fetch alerts
  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts({ limit: 50 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => api.acknowledgeAlert(id, DEMO_USER_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50'
      case 'HIGH':
        return 'border-orange-200 bg-orange-50'
      case 'MEDIUM':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const alerts = data?.alerts || []
  const unacknowledgedAlerts = alerts.filter((a: any) => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter((a: any) => a.acknowledged)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Alerts</h1>
        <p className="mt-2 text-gray-600">
          Real-time alerts for high coherence events and market anomalies
        </p>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {alerts.filter((a: any) => a.severity === 'CRITICAL' && !a.acknowledged).length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600 opacity-20" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High</p>
              <p className="text-2xl font-bold text-orange-600">
                {alerts.filter((a: any) => a.severity === 'HIGH' && !a.acknowledged).length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600 opacity-20" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium</p>
              <p className="text-2xl font-bold text-yellow-600">
                {alerts.filter((a: any) => a.severity === 'MEDIUM' && !a.acknowledged).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-600 opacity-20" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {unacknowledgedAlerts.length}
              </p>
            </div>
            <Info className="h-8 w-8 text-gray-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
        {unacknowledgedAlerts.length === 0 ? (
          <p className="text-gray-600">No active alerts at this time.</p>
        ) : (
          <div className="space-y-3">
            {unacknowledgedAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getSeverityStyles(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                    <div className="ml-3 flex-1">
                      <h3 className="font-medium text-gray-900">
                        {alert.title}
                        {alert.symbol && (
                          <span className="ml-2 text-sm font-normal text-gray-600">
                            ({alert.symbol})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeMutation.mutate({ id: alert.id })}
                    className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                    title="Acknowledge alert"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Acknowledged Alerts</h2>
          <div className="space-y-3">
            {acknowledgedAlerts.slice(0, 10).map((alert: any) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 bg-gray-50 opacity-75"
              >
                <div className="flex items-start">
                  <div className="mt-0.5 opacity-50">{getSeverityIcon(alert.severity)}</div>
                  <div className="ml-3 flex-1">
                    <h3 className="font-medium text-gray-700">
                      {alert.title}
                      {alert.symbol && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({alert.symbol})
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Acknowledged {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}