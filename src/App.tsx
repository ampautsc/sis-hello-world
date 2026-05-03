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

// CDN globals (loaded via index.html)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const L: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Chart: any

/** Escape a CSV cell value: wrap in quotes if it contains comma, quote, or newline */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/** Generate a CSV string from an array of sightings */
function toCSV(rows: Sighting[]): string {
  const header = 'id,species_name,observed_at,notes,lat,lng'
  const lines = rows.map(s =>
    [s.id, s.species_name, s.observed_at, s.notes, s.lat, s.lng]
      .map(csvCell)
      .join(',')
  )
  return [header, ...lines].join('\n')
}

/** Trigger a browser CSV download */
function downloadCSV(rows: Sighting[], filename: string) {
  const csv = toCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function App() {
  const [tab, setTab] = useState<'log' | 'map' | 'list' | 'stats'>('log')
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Log form
  const [speciesName, setSpeciesName] = useState('')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  // Geolocation
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  // Filters (Recent tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Map refs
  const mapDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerGroupRef = useRef<any>(null)

  // Chart refs
  const chartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstanceRef = useRef<any>(null)

  const loadSightings = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/species_sightings?order=observed_at.desc&limit=500`,
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

  // Client-side filter for Recent tab
  const filteredSightings = sightings.filter(s => {
    if (
      searchQuery.trim() &&
      !s.species_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) return false
    const d = s.observed_at.slice(0, 10) // YYYY-MM-DD
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })

  // Leaflet map — initialize / update markers when map tab is active
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

    markerGroupRef.current.clearLayers()

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

    setTimeout(() => mapRef.current?.invalidateSize(), MAP_RESIZE_DELAY_MS)
  }, [tab, sightings])

  // Chart.js — sightings per day bar chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !chartCanvasRef.current || typeof Chart === 'undefined') return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    const today = new Date()
    const labels: string[] = []
    const counts: number[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      labels.push(key.slice(5)) // MM-DD
      counts.push(sightings.filter(s => s.observed_at.slice(0, 10) === key).length)
    }

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sightings',
          data: counts,
          backgroundColor: '#2563eb',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  /** Auto-fill lat/lng from browser geolocation */
  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      err => {
        setLocError(`Location unavailable: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

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

  // Stats computations
  const speciesCounts = sightings.reduce<Record<string, number>>((acc, s) => {
    acc[s.species_name] = (acc[s.species_name] || 0) + 1
    return acc
  }, {})
  const topSpecies = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = topSpecies[0]?.[1] ?? 1

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

  const exportBtnStyle: React.CSSProperties = {
    padding: '0.35rem 0.9rem',
    borderRadius: '5px',
    border: '1px solid #2563eb',
    background: '#fff',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }

  const geoCount = sightings.filter(s => s.lat !== null && s.lng !== null).length
  const filtersActive = searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== ''

  // CSV filename helpers
  const today = new Date().toISOString().slice(0, 10)
  const csvFilename = `species-sightings-${today}.csv`
  const filteredCsvFilename = `species-sightings-filtered-${today}.csv`

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>🌿 Species Sightings</h1>
      <p style={{ color: '#888', marginTop: 0 }}>Powered by Sis + Supabase</p>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button style={tabBtn(tab === 'log')} onClick={() => setTab('log')}>Log Sighting</button>
        <button style={tabBtn(tab === 'map')} onClick={() => setTab('map')}>
          🗺️ Map{geoCount > 0 ? ` (${geoCount})` : ''}
        </button>
        <button style={tabBtn(tab === 'list')} onClick={() => setTab('list')}>
          Recent ({sightings.length})
        </button>
        <button style={tabBtn(tab === 'stats')} onClick={() => setTab('stats')}>📊 Stats</button>
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

          {/* Location section with Use My Location button */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontWeight: 600 }}>
                Location <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                title="Auto-fill from your device location"
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '5px',
                  border: '1px solid #2563eb',
                  background: locating ? '#e0e7ff' : '#fff',
                  color: '#2563eb',
                  cursor: locating ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {locating ? '⏳ Locating…' : '📍 Use My Location'}
              </button>
            </div>

            {locError && (
              <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0 0 0.4rem' }}>
                {locError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.2rem' }}>Latitude</label>
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.2rem' }}>Longitude</label>
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

      {/* ── Recent sightings — search + date-range filter + CSV export ── */}
      {tab === 'list' && (
        <div>
          {/* Header row: title + export button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Sightings</h2>
            <button
              style={exportBtnStyle}
              disabled={sightings.length === 0}
              onClick={() => downloadCSV(
                filtersActive ? filteredSightings : sightings,
                filtersActive ? filteredCsvFilename : csvFilename
              )}
              title={filtersActive ? 'Download filtered results as CSV' : 'Download all sightings as CSV'}
            >
              ⬇️ Export CSV{filtersActive ? ` (${filteredSightings.length})` : ` (${sightings.length})`}
            </button>
          </div>

          {/* Search bar */}
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by species name…"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              marginBottom: '0.5rem',
              fontSize: '0.95rem',
            }}
          />

          {/* Date range filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#555', whiteSpace: 'nowrap' }}>From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#555', whiteSpace: 'nowrap' }}>To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
              />
            </div>
            {filtersActive && (
              <button
                onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo('') }}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {filtersActive && (
            <p style={{ color: '#666', fontSize: '0.85em', marginTop: 0, marginBottom: '0.75rem' }}>
              Showing {filteredSightings.length} of {sightings.length} sightings
            </p>
          )}

          {loading && <p style={{ color: '#888' }}>Loading…</p>}
          {fetchError && <p style={{ color: '#dc2626' }}>Error loading sightings: {fetchError}</p>}
          {!loading && !fetchError && filteredSightings.length === 0 && (
            <p style={{ color: '#888' }}>
              {sightings.length === 0 ? 'No sightings yet — be the first!' : 'No sightings match your filters.'}
            </p>
          )}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredSightings.map(s => (
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

      {/* ── Stats ── */}
      {tab === 'stats' && (
        <div>
          {/* Header row: total count card + export button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              flex: 1,
              background: '#f0f4ff',
              borderRadius: '10px',
              padding: '1.5rem',
              textAlign: 'center',
              border: '1px solid #dbeafe',
            }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>
                {sightings.length}
              </div>
              <div style={{ color: '#555', marginTop: '0.25rem' }}>total sightings recorded</div>
            </div>
            <button
              style={{ ...exportBtnStyle, marginTop: '0.5rem', alignSelf: 'flex-start' }}
              disabled={sightings.length === 0}
              onClick={() => downloadCSV(sightings, csvFilename)}
              title="Download all sightings as CSV"
            >
              ⬇️ Export All CSV
            </button>
          </div>

          {/* Top 5 species */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Top 5 Species</h2>
          {topSpecies.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet — log some sightings first!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.75rem' }}>
              {topSpecies.map(([name, count], i) => (
                <li key={name} style={{ marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.95rem' }}>
                    <span>
                      <span style={{ color: '#2563eb', fontWeight: 700, marginRight: '0.4rem' }}>#{i + 1}</span>
                      {name}
                    </span>
                    <span style={{ color: '#666', fontSize: '0.9em' }}>
                      {count} ({Math.round((count / sightings.length) * 100)}%)
                    </span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      background: '#2563eb',
                      borderRadius: '4px',
                      height: '8px',
                      width: `${Math.round((count / maxCount) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Sightings per day chart */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings per Day (last 30 days)</h2>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
              <canvas ref={chartCanvasRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
