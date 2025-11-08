import { useEffect, useCallback } from 'react'
import { mutate } from 'swr'

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
    // Connect to backend WebSocket, not Next.js server
    const wsProtocol = 'ws:'
    const wsHost = '127.0.0.1:8000'
    const wsPath = path.startsWith('/') ? path : `/${path}`
    const ws = new WebSocket(`${wsProtocol}//${wsHost}${wsPath}`)

    ws.onmessage = handleMessage
    ws.onclose = () => {
      // Try to reconnect in 5 seconds
      setTimeout(() => {
        const newWs = new WebSocket(`${wsProtocol}//${wsHost}${wsPath}`)
        newWs.onmessage = handleMessage
      }, 5000)
    }

    return () => {
      ws.close()
    }
  }, [handleMessage, path])
}