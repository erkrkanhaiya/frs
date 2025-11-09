import { useEffect, useRef } from 'react'

// Enhanced notification hook: supports any person (known or unknown) with adaptive titles.
export const useAlertNotification = () => {
  const audioRef = useRef(null)
  const lastNotificationRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio('/alert.mp3')
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const showNotification = (alert) => {
    const name = alert?.name || 'Unknown'
    const isActuallyUnknown = name.toLowerCase() === 'unknown'
    // If suspicious flag is set but we DO have a known name, treat it as known and highlight with a different color later.
    const isSuspiciousUnknown = isActuallyUnknown
    const title = isSuspiciousUnknown ? `⚠️ Unknown Person Detected` : `👤 ${name} Detected`
    const body = isSuspiciousUnknown
      ? `Unknown person at ${alert.camera_name || 'Camera'}`
      : `${name} spotted at ${alert.camera_name || 'Camera'}`

    // Sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(err => console.error('Failed to play alert sound:', err))
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'face-watch-alert',
        requireInteraction: true,
        vibrate: [150, 80, 150]
      })
      notification.onclick = () => { window.focus(); notification.close() }
      lastNotificationRef.current = notification
      setTimeout(() => notification.close(), 10000)
    }

    showToast(alert, { title, body, isUnknown: isSuspiciousUnknown, notification: lastNotificationRef.current, isKnownSuspicious: alert?.suspicious && !isSuspiciousUnknown })
  }

  const showToast = (alert, meta) => {
    const { title, body, isUnknown, notification, isKnownSuspicious } = meta
    let accent
    let emoji
    if (isUnknown) {
      accent = 'linear-gradient(135deg,#ff416c 0%,#ff4b2b 100%)' // red for unknown
      emoji = '🚨'
    } else if (isKnownSuspicious) {
      accent = 'linear-gradient(135deg,#ffb347 0%,#ffcc33 100%)' // amber for flagged known person
      emoji = '⚠️'
    } else {
      accent = 'linear-gradient(135deg,#00b09b 0%,#96c93d 100%)' // green for normal known
      emoji = '👤'
    }
    const toast = document.createElement('div')
    toast.className = 'alert-toast'
    toast.innerHTML = `
      <div style="position:fixed;top:20px;right:20px;background:${accent};color:#fff;padding:18px 26px;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.35);z-index:10000;max-width:420px;animation:slideIn .35s cubic-bezier(.25,.8,.25,1);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"> 
        <div style="display:flex;align-items:flex-start;gap:18px;">
          <div style="font-size:40px;line-height:40px">${emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:18px;margin-bottom:4px;">${title}</div>
            <div style="font-size:14px;opacity:.95;line-height:1.4">${body}</div>
            <div style="font-size:11px;opacity:.7;margin-top:6px;letter-spacing:.5px">${new Date(alert.timestamp).toLocaleString()}</div>
          </div>
          <button style="background:rgba(255,255,255,.25);border:none;color:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px" aria-label="Dismiss">✕</button>
        </div>
      </div>`

    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style')
      style.id = 'toast-styles'
      style.textContent = `@keyframes slideIn{from{transform:translateX(420px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(420px);opacity:0}}`
      document.head.appendChild(style)
    }
    document.body.appendChild(toast)

    const root = toast.firstElementChild || toast.children[0]
    let dismissed = false
    const dismiss = (immediate = false) => {
      if (dismissed) return
      dismissed = true
      // Close browser notification if still open
      if (notification && typeof notification.close === 'function') {
        try { notification.close() } catch {}
      }
      if (immediate) {
        toast.remove()
        return
      }
      if (root && root.style) root.style.animation = 'slideOut .2s ease-out'
      setTimeout(() => toast.remove(), 180)
    }
    try {
      const closeBtn = root ? root.querySelector('button') : null
      closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(true) })
    } catch {}
    toast.addEventListener('click', e => { if (e.target === toast) dismiss() })
    setTimeout(dismiss, 10000)
  }

  return { showNotification }
}
