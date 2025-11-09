import { useState } from 'react'
import useSWR from 'swr'
import { apiFetcher } from '../lib/apiFetcher'
import { useWebSocket } from '../lib/websocket'
import { useAuth } from '../contexts/AuthContext'

const fetcher = (url) => apiFetcher(url)

function StatCard({ title, value, subtext }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {subtext && (
        <div className="mt-2 text-sm text-gray-500">{subtext}</div>
      )}
    </div>
  )
}

function Chart({ data, title }) {
  const maxValue = Math.max(...Object.values(data))
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center">
            <div className="w-24 text-sm text-gray-600">{key}</div>
            <div className="flex-1">
              <div className="h-4 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(value / maxValue) * 100}%`
                  }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-sm text-gray-900">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState(7) // 7 days default
  const { token } = useAuth()
  const shouldFetch = Boolean(token)
  const { data: stats, error, mutate } = useSWR(
    shouldFetch ? `/api/stats?days=${timeRange}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Revalidate stats on new alerts from WebSocket
  useWebSocket('/ws/alerts', (msg) => {
    if (msg && msg.type === 'new_alert') {
      mutate()
    }
  })

  if (shouldFetch && error) return (
    <div className="text-red-600">
      Failed to load statistics
    </div>
  )

  if (shouldFetch && !stats) return (
    <div className="animate-pulse">
      Loading statistics...
    </div>
  )

  // Handle missing or empty data
  const trends = stats.recent_trends || [];
  const trend = trends[0] || { change_percent: 0 };
  const trendText = trend.change_percent > 0
    ? `+${trend.change_percent.toFixed(1)}%`
    : `${trend.change_percent.toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Analytics Dashboard
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Alerts"
          value={stats.total_alerts || 0}
          subtext={`Trend: ${trendText}`}
        />
        <StatCard
          title="Unique People"
          value={stats.unique_people || 0}
        />
        <StatCard
          title="Active Cameras"
          value={Object.keys(stats.alerts_by_camera || {}).length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.alerts_by_person && (
          <Chart
            data={stats.alerts_by_person}
            title="Alerts by Person"
          />
        )}
        {stats.alerts_by_camera && (
          <Chart
            data={stats.alerts_by_camera}
            title="Alerts by Camera"
          />
        )}
      </div>

      {stats.alerts_by_hour && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Hourly Distribution
          </h3>
          <div className="h-64">
            <Chart
              data={stats.alerts_by_hour}
              title="Alerts by Hour"
            />
          </div>
        </div>
      )}
    </div>
  )
}