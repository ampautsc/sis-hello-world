import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://vvfnrtjjqbzrhecideyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Zm5ydGpqcWJ6cmhlY2lkZXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg4MzYsImV4cCI6MjA5MzMxNDgzNn0.2DPgCq3OJJlEB33mUr8KP3eVB7MCC02-zwPZTyjpFQQ'

const fetchHeaders: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

interface Sighting {
  id: string
  species_name: string
  observed_at: string
  notes: string | null
  lat: number | null
  lng: number | null
}

export default function App() {
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [speciesName, setSpeciesName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  const loadSightings = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/species_sightings?order=observed_at.desc&limit=20`,
        { headers: fetchHeaders }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Sighting[] = await res.json()
      setSightings(data)
    } catch (err) {
      setFetchError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSightings() }, [loadSightings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!speciesName.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/species_sightings`, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          species_name: speciesName.trim(),
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      setSubmitMsg('Sighting recorded! ✅')
      setSpeciesName('')
      setNotes('')
      await loadSightings()
    } catch (err) {
      setSubmitMsg(`Error: ${String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>🌿 Species Sightings</h1>
      <p style={{ color: '#888', marginTop: 0 }}>Powered by Sis + Supabase</p>

      <form
        onSubmit={handleSubmit}
        style={{ background: '#f5f5f5', padding: '1.25rem', borderRadius: '10px', marginBottom: '2rem' }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Log a Sighting</h2>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
            Species Name *
          </label>
          <input
            value={speciesName}
            onChange={e => setSpeciesName(e.target.value)}
            required
            placeholder="e.g. Red Fox"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional details…"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          {submitMsg && (
            <span style={{ color: submitMsg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>
              {submitMsg}
            </span>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: '1.1rem' }}>Recent Sightings</h2>
      {loading && <p style={{ color: '#888' }}>Loading…</p>}
      {fetchError && <p style={{ color: '#dc2626' }}>Error loading sightings: {fetchError}</p>}
      {!loading && !fetchError && sightings.length === 0 && (
        <p style={{ color: '#888' }}>No sightings yet — be the first!</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sightings.map(s => (
          <li key={s.id} style={cardStyle}>
            <strong>{s.species_name}</strong>
            <span style={{ color: '#999', fontSize: '0.85em', marginLeft: '0.75rem' }}>
              {new Date(s.observed_at).toLocaleString()}
            </span>
            {s.notes && <p style={{ margin: '0.35rem 0 0', color: '#555', fontSize: '0.9em' }}>{s.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
