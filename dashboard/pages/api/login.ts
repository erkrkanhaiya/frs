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
    const formData = new URLSearchParams(req.body);
    console.log('Login attempt:', {
      username: formData.get('username'),
      passwordLength: formData.get('password')?.length
    });

    const response = await fetch(`${API_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Authentication failed')
    }

    res.status(200).json(data)
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}