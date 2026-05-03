import { useState, useEffect, useCallback, useRef } from 'react'

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

// Leaflet is loaded via CDN in index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const L: any

export default function App() {
  const [tab, setTab] = useState<'log' | 'map' | 'list'>('log')
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [speciesName, setSpeciesName] = useState('')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerGroupRef = useRef<any>(null)

  const loadSightings = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/species_sightings?order=observed_at.desc&limit=50`,
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

  // Initialize / update Leaflet map when map tab is active
  // MAP_RESIZE_DELAY_MS: Leaflet needs a brief delay after its container becomes
  // visible in the DOM before recalculating tile layout via invalidateSize().
  const MAP_RESIZE_DELAY_MS = 150
  useEffect(() => {
    if (tab !== 'map' || !mapDivRef.current || typeof L === 'undefined') return

    if (!mapRef.current) {
      mapRef.current = L.map(mapDivRef.current).setView([20, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapRef.current)
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current)
    }

    // Clear all existing markers efficiently via the layer group
    markerGroupRef.current.clearLayers()

    // Add a marker for each sighting that has coordinates; collect them for bounds fitting
    const geo = sightings.filter(s => s.lat !== null && s.lng !== null)
    const markers = geo.map(s => {
      const marker = L.marker([s.lat as number, s.lng as number])
        .bindPopup(
          `<strong>${s.species_name}</strong><br/>` +
          `${new Date(s.observed_at).toLocaleString()}` +
          (s.notes ? `<br/><em>${s.notes}</em>` : '')
        )
      markerGroupRef.current.addLayer(marker)
      return marker
    })

    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      mapRef.current.fitBounds(group.getBounds().pad(0.25))
    }

    // Force Leaflet to recalculate tile layout after the div becomes visible
    setTimeout(() => mapRef.current?.invalidateSize(), MAP_RESIZE_DELAY_MS)
  }, [tab, sightings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!speciesName.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const payload: Record<string, unknown> = {
        species_name: speciesName.trim(),
        notes: notes.trim() || null,
      }
      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)
      if (lat.trim() && lng.trim() && !isNaN(latNum) && !isNaN(lngNum)) {
        payload.lat = latNum
        payload.lng = lngNum
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/species_sightings`, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      setSubmitMsg('Sighting recorded! ✅')
      setSpeciesName('')
      setNotes('')
      setLat('')
      setLng('')
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

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    border: 'none',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    color: active ? '#2563eb' : '#555',
    fontSize: '0.95rem',
  })

  const geoCount = sightings.filter(s => s.lat !== null && s.lng !== null).length

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>🌿 Species Sightings</h1>
      <p style={{ color: '#888', marginTop: 0 }}>Powered by Sis + Supabase</p>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.5rem' }}>
        <button style={tabBtn(tab === 'log')} onClick={() => setTab('log')}>Log Sighting</button>
        <button style={tabBtn(tab === 'map')} onClick={() => setTab('map')}>🗺️ Map {geoCount > 0 ? `(${geoCount})` : ''}</button>
        <button style={tabBtn(tab === 'list')} onClick={() => setTab('list')}>Recent ({sightings.length})</button>
      </div>

      {/* ── Log Sighting ── */}
      {tab === 'log' && (
        <form
          onSubmit={handleSubmit}
          style={{ background: '#f5f5f5', padding: '1.25rem', borderRadius: '10px' }}
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

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional details…"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Latitude <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <input
                value={lat}
                onChange={e => setLat(e.target.value)}
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="e.g. 51.5074"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Longitude <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <input
                value={lng}
                onChange={e => setLng(e.target.value)}
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="e.g. -0.1278"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
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
      )}

      {/* ── Map view ── */}
      {tab === 'map' && (
        <div>
          {geoCount === 0 ? (
            <p style={{ color: '#888' }}>
              No sightings with GPS coordinates yet. Add latitude &amp; longitude when logging a sighting to see it here.
            </p>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9em', marginTop: 0 }}>
              {geoCount} of {sightings.length} sightings have GPS coordinates. Click a pin for details.
            </p>
          )}
          <div
            ref={mapDivRef}
            style={{ height: '450px', borderRadius: '8px', border: '1px solid #ddd', background: '#e8f4f8' }}
          />
        </div>
      )}

      {/* ── Recent sightings ── */}
      {tab === 'list' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Recent Sightings</h2>
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
                {s.lat !== null && s.lng !== null && (
                  <p style={{ margin: '0.25rem 0 0', color: '#2563eb', fontSize: '0.8em' }}>
                    📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
