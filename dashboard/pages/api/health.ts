import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const start = Date.now()
  try {
    const ping = await fetch(`${API_BASE}/alerts`, { method: 'GET' })
    const ms = Date.now() - start
    if (!ping.ok) {
      return res.status(502).json({ status: 'degraded', apiBase: API_BASE, latencyMs: ms, upstreamStatus: ping.status })
    }
    return res.status(200).json({ status: 'ok', apiBase: API_BASE, latencyMs: ms })
  } catch (e: any) {
    return res.status(502).json({ status: 'unreachable', apiBase: API_BASE, error: String(e?.message || e) })
  }
}