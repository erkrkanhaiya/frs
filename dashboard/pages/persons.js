import { useState } from 'react'
import useSWR from 'swr'
import { apiFetcher } from '../lib/apiFetcher'
import Layout from '../components/Layout'
import { withAuth } from '../lib/withAuth'

const fetcher = (url) => apiFetcher(url)

function PersonsPage() {
  const { data, error, mutate } = useSWR('/api/persons', fetcher)
  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)

  const persons = data?.persons || []
  const [deleting, setDeleting] = useState({}) // name->bool

  const deletePerson = async (name, opts = { purgeAlerts: false, purgeIncidents: false }) => {
    if (!name) return
    const confirmMsg = `Delete '${name}'?\n` +
      (opts.purgeAlerts ? '- Also purge alerts for this person\n' : '') +
      (opts.purgeIncidents ? '- Also purge incident images for this person\n' : '') +
      'This action cannot be undone.'
    if (!window.confirm(confirmMsg)) return
    setDeleting(d => ({ ...d, [name]: true }))
    try {
      const token = localStorage.getItem('authToken')
      const url = `/api/persons/${encodeURIComponent(name)}?purge_alerts=${opts.purgeAlerts}&purge_incidents=${opts.purgeIncidents}`
      const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        // Ensure selected cleared if deleting current
        if (selected?.name === name) setSelected(null)
        await mutate()
      }
    } finally {
      setDeleting(d => ({ ...d, [name]: false }))
    }
  }

  const createPerson = async () => {
    if (!newName.trim()) return
    const token = localStorage.getItem('authToken')
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim() })
    })
    if (res.ok) {
      setNewName('')
      mutate()
    }
  }

  const loadImages = async (name) => {
    setSelected({ name, images: null })
    const token = localStorage.getItem('authToken')
    const res = await fetch(`/api/persons/${encodeURIComponent(name)}/images`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (res.ok) {
      const json = await res.json()
      setSelected({ name, images: json.images })
    }
  }

  const uploadImage = async () => {
    if (!file || !selected) return
    setUploading(true)
    const token = localStorage.getItem('authToken')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/persons/${encodeURIComponent(selected.name)}/images`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    })
    setUploading(false)
    if (res.ok) {
      await loadImages(selected.name)
      setFile(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Persons (Watchlist)</h1>
        
        {/* Add Person Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Person</h2>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Enter person name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && createPerson()}
            />
            <button
              onClick={createPerson}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
            >Add Person</button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error.status === 401 ? 'Session expired. Please log in again.' : 'Failed to load persons'}
            <button
              onClick={() => mutate('/api/persons')}
              className="ml-4 text-sm px-3 py-1 rounded bg-white border border-red-300 hover:bg-red-100"
            >Retry</button>
          </div>
        )}
        
        {/* Persons List */}
        <h2 className="text-2xl font-semibold mb-4">Watchlist ({persons.length})</h2>
        {persons.length === 0 && <div className="text-gray-500 text-center py-8">No persons added yet. Add a person above to start building your watchlist.</div>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {persons.map(p => (
            <div
              key={p}
              className={`border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition relative ${selected?.name === p ? 'border-blue-600 bg-blue-50 shadow-md' : 'bg-white'}`}
            >
              <button onClick={() => loadImages(p)} className="text-left w-full">
                <div className="font-semibold text-lg mb-1 flex items-center justify-between">
                  <span>{p}</span>
                </div>
                <div className="text-xs text-gray-500">Click to manage images</div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  disabled={deleting[p]}
                  onClick={() => deletePerson(p, { purgeAlerts: false, purgeIncidents: false })}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >{deleting[p] ? 'Deleting...' : 'Delete'}</button>
                <button
                  disabled={deleting[p]}
                  onClick={() => deletePerson(p, { purgeAlerts: true, purgeIncidents: false })}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                >{deleting[p] ? 'Deleting...' : 'Delete+Alerts'}</button>
                <button
                  disabled={deleting[p]}
                  onClick={() => deletePerson(p, { purgeAlerts: true, purgeIncidents: true })}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >{deleting[p] ? 'Deleting...' : 'Full Purge'}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Person Images */}
        {selected && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{selected.name}'s Photos</h2>
            
            {/* Upload Section */}
            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded">
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setFile(e.target.files?.[0])}
                className="flex-1"
              />
              <button
                disabled={uploading || !file}
                onClick={uploadImage}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >{uploading ? 'Uploading...' : 'Upload Photo'}</button>
            </div>
            
            {/* Images Grid */}
            {!selected.images && <div className="text-center py-4">Loading images...</div>}
            {selected.images && selected.images.length === 0 && (
              <div className="text-gray-500 text-center py-8 border-2 border-dashed rounded">
                No photos yet. Upload photos of this person to add them to the watchlist.
              </div>
            )}
            {selected.images && selected.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selected.images.map(img => (
                  <div key={img} className="border rounded-lg overflow-hidden bg-white shadow hover:shadow-lg transition">
                    <img 
                      src={`http://127.0.0.1:8000/faces_db/${encodeURIComponent(selected.name)}/${encodeURIComponent(img)}`}
                      alt={img}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2 text-xs text-gray-600 truncate bg-gray-50">{img}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default withAuth(PersonsPage)
