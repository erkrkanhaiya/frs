import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(`${API_BASE}/alerts`)
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
}