import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization || ''
  try {
    if (req.method === 'GET') {
      const r = await fetch(`${API_BASE}/persons`, { headers: { 'Authorization': token } })
      const data = await r.json()
      return res.status(r.status).json(data)
    }
    if (req.method === 'POST') {
      const r = await fetch(`${API_BASE}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(req.body)
      })
      const data = await r.json()
      return res.status(r.status).json(data)
    }
    res.setHeader('Allow', ['GET','POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to proxy persons' })
  }
}
