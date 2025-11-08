import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query
  if (!name || Array.isArray(name)) return res.status(400).json({ error: 'Invalid name' })
  const token = req.headers.authorization || ''

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${API_BASE}/persons/${encodeURIComponent(name)}/images`, { headers: { 'Authorization': token } })
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    if (req.method === 'POST') {
      const form = new formidable.IncomingForm()
      form.parse(req, async (err, fields, files) => {
        if (err) return res.status(400).json({ error: 'Invalid form data' })
        const file: any = files.file
        if (!file) return res.status(400).json({ error: 'Missing file' })
        const stream = fs.createReadStream(file.filepath)

        const upstream = await fetch(`${API_BASE}/persons/${encodeURIComponent(name)}/images`, {
          method: 'POST',
          headers: { 'Authorization': token },
          body: (() => {
            const formData = new FormData()
            // @ts-ignore
            formData.append('file', stream as any, file.originalFilename)
            return formData
          })()
        } as any)
        const data = await upstream.json()
        return res.status(upstream.status).json(data)
      })
      return
    }

    res.setHeader('Allow', ['GET','POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to proxy person images' })
  }
}
