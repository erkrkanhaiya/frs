import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { filename } = req.query
  if (!filename || Array.isArray(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  try {
    const response = await fetch(`${API_BASE}/incidents/${encodeURIComponent(filename)}`)
    if (!response.ok) {
      return res.status(response.status).end()
    }
    // Pass through content-type and length
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    const buf = Buffer.from(await response.arrayBuffer())
    res.status(200).send(buf)
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy incident image' })
  }
}
