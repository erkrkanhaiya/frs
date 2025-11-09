import { useEffect, useCallback } from 'react'
import { mutate } from 'swr'

// Resolve WS base from env. Prefer NEXT_PUBLIC_WS_BASE; else derive from NEXT_PUBLIC_API_BASE; finally fallback to localhost.
const ENV_WS_BASE =
  process.env.NEXT_PUBLIC_WS_BASE ||
  (process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/^http/i, 'ws')
    : 'ws://127.0.0.1:8000')

export function useWebSocket(path, onMessage) {
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data)
      if (onMessage) {
        onMessage(data)
      }
      // Play notification sound for new alerts
      if (data.type === 'new_alert') {
        const audio = new Audio('/notification.mp3')
        audio.play().catch(() => {}) // Ignore autoplay restrictions
      }
    } catch (e) {
      console.error('WebSocket message error:', e)
    }
  }, [onMessage])

  useEffect(() => {
    // Connect to backend WebSocket using configured base
    const base = ENV_WS_BASE.replace(/\/$/, '')
    const wsPath = path.startsWith('/') ? path : `/${path}`
    const ws = new WebSocket(`${base}${wsPath}`)

    ws.onmessage = handleMessage
    ws.onclose = () => {
      // Try to reconnect in 5 seconds
      setTimeout(() => {
        const newWs = new WebSocket(`${base}${wsPath}`)
        newWs.onmessage = handleMessage
      }, 5000)
    }

    return () => {
      ws.close()
    }
  }, [handleMessage, path])
}