const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req, res) {
  const { name } = req.query
  const token = req.headers.authorization || ''
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing person name' })
  }

  try {
    if (req.method === 'DELETE') {
      const purgeAlerts = (req.query.purge_alerts || 'false').toString() === 'true'
      const purgeIncidents = (req.query.purge_incidents || 'false').toString() === 'true'
      const upstreamUrl = `${API_BASE}/persons/${encodeURIComponent(name)}?purge_alerts=${purgeAlerts}&purge_incidents=${purgeIncidents}`
      const r = await fetch(upstreamUrl, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      })
      const data = await r.json().catch(() => ({ error: 'Invalid JSON from upstream' }))
      return res.status(r.status).json(data)
    }

    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to proxy person delete' })
  }
}
