import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization || ''
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const r = await fetch(`${API_BASE}/watch/status`, {
      headers: { 'Authorization': token }
    })
    const data = await r.json()
    return res.status(r.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to get watch status' })
  }
}
