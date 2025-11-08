import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get auth token from request
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(`${API_BASE}/stats${req.url?.split('/stats')[1] || ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}