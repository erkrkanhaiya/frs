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
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPath = path.startsWith('/') ? path.slice(1) : path
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/${wsPath}`)

    ws.onmessage = handleMessage
    ws.onclose = () => {
      // Try to reconnect in 5 seconds
      setTimeout(() => {
        const newWs = new WebSocket(`${wsProtocol}//${window.location.host}/${wsPath}`)
        newWs.onmessage = handleMessage
      }, 5000)
    }

    return () => {
      ws.close()
    }
  }, [handleMessage, path])
}