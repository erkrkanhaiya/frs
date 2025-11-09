import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Robustly read and forward the Authorization header as-is
  const authHeaderRaw = req.headers.authorization
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : (authHeaderRaw || '')

  // GET /api/alerts -> proxy to backend (requires token)
  if (req.method === 'GET') {
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const suffix = req.url?.split('/alerts')[1] || ''
      const response = await fetch(`${API_BASE}/alerts${suffix}`, {
        headers: { 'Authorization': authHeader }
      })
      const contentType = response.headers.get('content-type') || ''
      const body = contentType.includes('application/json') ? await response.json() : await response.text()
      if (!response.ok) return res.status(response.status || 500).json({ error: 'Upstream error', detail: body })
      return res.status(200).json(body)
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to fetch alerts', detail: String(e?.message || e) })
    }
  }

  // POST /api/alerts -> create a new alert (dev/demo aid). Backend POST /alerts does not require auth.
  if (req.method === 'POST') {
    try {
      const contentType = (req.headers['content-type'] || '').toString()
      let jsonBody: any = {}
      if (contentType.includes('application/json')) {
        if (typeof req.body === 'string') {
          jsonBody = JSON.parse(req.body)
        } else {
          jsonBody = req.body
        }
      } else {
        // Attempt to parse non-JSON bodies as JSON fallback
        if (typeof req.body === 'string' && req.body.trim()) {
          try { jsonBody = JSON.parse(req.body) } catch { jsonBody = {} }
        } else if (req.body && typeof req.body === 'object') {
          jsonBody = req.body
        }
      }

      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBody)
      })
      const content = await response.text()
      const data = (() => { try { return JSON.parse(content) } catch { return { raw: content } } })()
      if (!response.ok) return res.status(response.status || 500).json({ error: 'Upstream error', detail: data })
      return res.status(201).json(data)
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to post alert', detail: String(e?.message || e) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}