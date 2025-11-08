export async function apiFetcher(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const attempt = async () => {
    const res = await fetch(url, { ...options, headers })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`Fetch failed: ${res.status} ${res.statusText}`)
      err.status = res.status
      err.body = text
      throw err
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    return res.text()
  }

  // Simple retry for transient network errors
  let lastErr
  for (let i = 0; i < 2; i++) {
    try {
      return await attempt()
    } catch (e) {
      lastErr = e
      if (e.status && e.status !== 502 && e.status !== 503 && e.status !== 504) break
      await new Promise(r => setTimeout(r, 400))
    }
  }
  throw lastErr
}
