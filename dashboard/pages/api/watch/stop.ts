import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization || ''
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const r = await fetch(`${API_BASE}/watch/stop`, { method: 'POST', headers: { 'Authorization': token } })
    const data = await r.json().catch(()=>({}))
    return res.status(r.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to stop watcher' })
  }
}
