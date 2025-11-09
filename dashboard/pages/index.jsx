import useSWR from 'swr'
import { useState, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Analytics from '../components/Analytics'
import Layout from '../components/Layout'
import { withAuth } from '../lib/withAuth'
import { useWebSocket } from '../lib/websocket'
import { useAlertNotification } from '../lib/useAlertNotification'
import { apiFetcher } from '../lib/apiFetcher'
// Added apiFetcher import for sending synthetic demo alerts.
// (apiFetcher original import moved above for clarity)

const fetcher = async (url) => {
  const data = await apiFetcher(url)
  return Array.isArray(data) ? data : []
}

const AlertCard = ({ alert, isNew }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${isNew ? 'ring-2 ring-red-500' : ''}`}>
      <a 
        href={`/api/incidents/${encodeURIComponent(alert.filename)}`}
        target="_blank"
        rel="noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        <div className="relative">
          <img
            src={`/api/incidents/${encodeURIComponent(alert.filename)}`}
            alt={alert.name}
            className="w-full h-40 object-cover rounded-md"
          />
          {isNew && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full shadow-sm">
              New
            </div>
          )}
        </div>
      </a>
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <strong className="text-lg font-medium">{alert.name}</strong>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Camera {alert.camera_id}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {new Date(alert.timestamp).toLocaleString()}
        </div>
        <div className="mt-2">
          <code className="text-xs text-gray-400 block truncate hover:text-gray-600">
            {alert.filename}
          </code>
        </div>
      </div>
    </div>
  )
}

function Home() {
  const { token } = useAuth()
  // Only start SWR when token exists to avoid initial 401 spam.
  const shouldFetch = Boolean(token)
  const { data: alerts, error, isLoading, mutate } = useSWR(
    shouldFetch ? '/api/alerts' : null,
    fetcher,
    {
      refreshInterval: 2000,
      revalidateOnFocus: true
    }
  )
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState('grid') // 'grid' or 'timeline'
  const perPage = 12
  const previousAlertsRef = useRef([])
  const { showNotification } = useAlertNotification()
  // Revalidate alerts when token becomes available right after login
  // by listening to the custom event from AuthContext.
  // This avoids waiting for the next polling tick.
  if (typeof window !== 'undefined') {
    window.removeEventListener?.('auth:token-set', () => {})
    window.addEventListener('auth:token-set', () => {
      if (shouldFetch) {
        try { mutate() } catch {}
      }
    }, { once: true })
  }

  // WebSocket setup for real-time alerts with notification
  // Now notify for ANY alert (including demo_person). If you want only demo_person, add condition.
  useWebSocket('/ws/alerts', (data) => {
    if (!shouldFetch) return // Skip notifications until authenticated
    console.log('WebSocket alert received:', data)
    if (data.alert) {
      try { showNotification(data.alert) } catch (e) { console.warn('Notification failed', e) }
    }
    mutate()
  })

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    if (!alerts || !Array.isArray(alerts)) return []
    return alerts
      .filter(a => !filter || (a.name && a.name.toLowerCase().includes(filter.toLowerCase())))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [alerts, filter])

  const pages = Math.ceil(filteredAlerts.length / perPage)
  const pageAlerts = filteredAlerts.slice((page - 1) * perPage, page * perPage)

  // Group alerts by person
  const alertsByPerson = useMemo(() => {
    const grouped = {}
    pageAlerts.forEach(alert => {
      if (!grouped[alert.name]) grouped[alert.name] = []
      grouped[alert.name].push(alert)
    })
    return grouped
  }, [pageAlerts])

  // Mark alerts from last 30s as "new"
  const now = Date.now()
  const isNew = (timestamp) => {
    return now - new Date(timestamp).getTime() < 30000
  }

  if (shouldFetch && error) return (
    <div className="p-8">
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Failed to load alerts: {String(error)}
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Analytics />
        
        <div className="mt-8 flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Face Watchlist — Alerts
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 text-sm ${
                  view === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } border rounded-l-lg`}
              >
                Grid
              </button>
              <button
                onClick={() => setView('timeline')}
                className={`px-3 py-1.5 text-sm ${
                  view === 'timeline'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } border-t border-b border-r rounded-r-lg`}
              >
                Timeline
              </button>
            </div>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-4 items-center flex-wrap">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name..."
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredAlerts.length} alerts
          </div>
          <button
            onClick={async () => {
              const payload = {
                name: 'demo_person',
                camera_id: 0,
                timestamp: new Date().toISOString(),
                filename: `demo_person_${Date.now()}.jpg`,
                suspicious: false,
                camera_name: 'Demo Button'
              }
              try {
                await apiFetcher('/api/alerts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                })
                // Optimistically show notification
                try { showNotification(payload) } catch {}
                mutate()
              } catch (e) {
                console.error('Failed to send test alert', e)
                alert('Failed to send test alert. Check console for details.')
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            title="Send a synthetic alert for demo_person to test notifications"
          >
            Send Test Alert (demo_person)
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          </div>
        ) : view === 'grid' ? (
          <>
            {Object.entries(alertsByPerson).map(([name, personAlerts]) => (
              <div key={name} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  {name}
                  <span className="text-sm font-normal text-gray-500">
                    ({personAlerts.length} alerts)
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {personAlerts.map((alert) => (
                    <AlertCard
                      key={alert.timestamp + alert.filename}
                      alert={alert}
                      isNew={isNew(alert.timestamp)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-4">
            {pageAlerts.map((alert) => (
              <div
                key={alert.timestamp + alert.filename}
                className="bg-white rounded-lg shadow-sm border p-4 flex gap-4"
              >
                <div className="w-48 flex-shrink-0">
                  <a
                    href={`/incidents/${encodeURIComponent(alert.filename)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={`/api/incidents/${encodeURIComponent(alert.filename)}`}
                      alt={alert.name}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </a>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <strong className="text-lg font-medium">{alert.name}</strong>
                    {isNew(alert.timestamp) && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Camera {alert.camera_id}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                  <div className="mt-2">
                    <code className="text-xs text-gray-400">
                      {alert.filename}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No alerts found
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === i + 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                } shadow-sm`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
          <div>Polling for new alerts every 2s</div>
          <div className="text-xs text-gray-400">Use the green button above to simulate a demo_person detection instantly.</div>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(Home);
