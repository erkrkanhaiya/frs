import { useEffect, useRef } from 'react'

export const useAlertNotification = () => {
  const audioRef = useRef(null)

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio('/alert.mp3')
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const showNotification = (alert) => {
    console.log('🚨 showNotification called with:', alert)
    
    // Play alert sound
    if (audioRef.current) {
      console.log('🔊 Attempting to play alert sound...')
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(err => {
        console.error('Failed to play alert sound:', err)
      })
    }

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('🔔 Showing browser notification...')
      const notification = new Notification('⚠️ Suspicious Person Detected!', {
        body: `Unknown person detected at ${alert.camera_name || 'Camera'}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'suspicious-alert',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000)
    }

    // Also show in-page toast notification
    showToast(alert)
  }

  const showToast = (alert) => {
    // Create a toast notification element
    const toast = document.createElement('div')
    toast.className = 'alert-toast'
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="font-size: 40px;">🚨</div>
          <div>
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">
              Suspicious Person Detected!
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
              Unknown person at ${alert.camera_name || 'Camera'}
            </div>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">
              ${new Date(alert.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    `

    // Add animation styles
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style')
      style.id = 'toast-styles'
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(toast)

    // Auto-remove after 8 seconds
    setTimeout(() => {
      toast.firstChild.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => toast.remove(), 300)
    }, 8000)

    // Click to dismiss
    toast.onclick = () => {
      toast.firstChild.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => toast.remove(), 300)
    }
  }

  return { showNotification }
}
