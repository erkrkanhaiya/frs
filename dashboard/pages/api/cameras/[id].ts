import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' })
  const token = req.headers.authorization || ''

  const upstream = `${API_BASE}/cameras/${encodeURIComponent(id)}`

  try {
    if (req.method === 'PUT') {
      const response = await fetch(upstream, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify(req.body),
      })
      const data = await response.json()
      return res.status(response.status).json(data)
    }

    if (req.method === 'DELETE') {
      const response = await fetch(upstream, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      })
      if (response.status === 204) return res.status(204).end()
      const data = await response.json().catch(()=>({}))
      return res.status(response.status).json(data)
    }

    res.setHeader('Allow', ['PUT', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to proxy camera operation' })
  }
}
