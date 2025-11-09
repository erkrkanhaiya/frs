import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Preflight connectivity check: quickly HEAD the backend root to distinguish DNS/connection errors.
    try {
      await fetch(API_BASE, { method: 'HEAD' })
    } catch (e: any) {
      return res.status(502).json({ error: 'Backend unreachable', apiBase: API_BASE, detail: String(e?.message || e) })
    }
    const contentType = (req.headers['content-type'] || '').toString();

    // Normalize body to application/x-www-form-urlencoded
    let bodyString = ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      if (typeof req.body === 'string') {
        bodyString = req.body
      } else if (req.body && typeof req.body === 'object') {
        // Next.js may parse urlencoded into an object already
        const params = new URLSearchParams()
        if (req.body.username) params.set('username', String(req.body.username))
        if (req.body.password) params.set('password', String(req.body.password))
        bodyString = params.toString()
      }
    } else {
      // Handle JSON or unknown content-type by extracting username/password
      let bodyObj: any = {}
      if (typeof req.body === 'string' && req.body.trim().length > 0) {
        try { bodyObj = JSON.parse(req.body) } catch {}
      } else if (req.body && typeof req.body === 'object') {
        bodyObj = req.body
      }
      const params = new URLSearchParams()
      if (bodyObj.username) params.set('username', String(bodyObj.username))
      if (bodyObj.password) params.set('password', String(bodyObj.password))
      bodyString = params.toString()
    }

    const dbg = new URLSearchParams(bodyString)
    console.log('Login attempt via proxy', {
      username: dbg.get('username'),
      passwordLength: dbg.get('password')?.length
    })

    const response = await fetch(`${API_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyString,
    })

    const content = await response.text()
    let data: any
    try { data = JSON.parse(content) } catch { data = { raw: content } }

    if (!response.ok) {
      const status = response.status || 401
      return res.status(status).json({ error: 'Authentication failed', upstreamStatus: status, upstream: data, apiBase: API_BASE })
    }

    return res.status(200).json(data)
  } catch (error: any) {
    // Differentiate unreachable backend (fetch/network) from auth rejection
    const msg = String(error?.message || error)
    return res.status(502).json({ error: 'Backend unreachable', detail: msg, apiBase: API_BASE })
  }
}