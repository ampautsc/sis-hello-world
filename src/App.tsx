import { useState, useEffect, useCallback, useRef } from 'react'

const SUPABASE_URL = 'https://vvfnrtjjqbzrhecideyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Zm5ydGpqcWJ6cmhlY2lkZXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg4MzYsImV4cCI6MjA5MzMxNDgzNn0.2DPgCq3OJJlEB33mUr8KP3eVB7MCC02-zwPZTyjpFQQ'

const fetchHeaders: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const SPECIES_TYPES = ['', 'Bird', 'Mammal', 'Reptile', 'Amphibian', 'Fish', 'Insect', 'Plant', 'Other'] as const
type SpeciesType = typeof SPECIES_TYPES[number]

const TYPE_COLORS: Record<string, string> = {
  Bird: '#2563eb',
  Mammal: '#7c3aed',
  Reptile: '#059669',
  Amphibian: '#0891b2',
  Fish: '#0284c7',
  Insect: '#d97706',
  Plant: '#16a34a',
  Other: '#6b7280',
}

interface Sighting {
  id: string
  species_name: string
  species_type: string | null
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
  const header = 'id,species_name,species_type,observed_at,notes,lat,lng'
  const lines = rows.map(s =>
    [s.id, s.species_name, s.species_type, s.observed_at, s.notes, s.lat, s.lng]
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

/** Small colour-coded badge for species type */
function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  const color = TYPE_COLORS[type] ?? '#6b7280'
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: '999px',
      background: color + '1a',
      color,
      border: `1px solid ${color}55`,
      fontSize: '0.75rem',
      fontWeight: 600,
      marginLeft: '0.5rem',
      verticalAlign: 'middle',
    }}>
      {type}
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState<'log' | 'map' | 'list' | 'stats'>('log')
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Log form
  const [speciesName, setSpeciesName] = useState('')
  const [speciesType, setSpeciesType] = useState<SpeciesType>('')
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
  const [typeFilter, setTypeFilter] = useState<SpeciesType>('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSpecies, setEditSpecies] = useState('')
  const [editType, setEditType] = useState<SpeciesType>('')
  const [editNotes, setEditNotes] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  const typeChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeChartInstanceRef = useRef<any>(null)

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
    if (typeFilter && s.species_type !== typeFilter) return false
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
      const typeColor = s.species_type ? (TYPE_COLORS[s.species_type] ?? '#2563eb') : '#2563eb'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${typeColor};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })
      const marker = L.marker([s.lat as number, s.lng as number], { icon })
        .bindPopup(
          `<strong>${s.species_name}</strong>` +
          (s.species_type ? ` <span style="color:${typeColor};font-size:0.8em">[${s.species_type}]</span>` : '') +
          `<br/>${new Date(s.observed_at).toLocaleString()}` +
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

  // Chart.js — sightings by type doughnut chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !typeChartCanvasRef.current || typeof Chart === 'undefined') return

    if (typeChartInstanceRef.current) {
      typeChartInstanceRef.current.destroy()
      typeChartInstanceRef.current = null
    }

    const typed = sightings.filter(s => s.species_type)
    if (typed.length === 0) return

    const typeCounts: Record<string, number> = {}
    for (const s of typed) {
      const t = s.species_type!
      typeCounts[t] = (typeCounts[t] || 0) + 1
    }
    const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

    typeChartInstanceRef.current = new Chart(typeChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([t]) => t),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: entries.map(([t]) => TYPE_COLORS[t] ?? '#6b7280'),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' as const },
        },
      },
    })

    return () => {
      if (typeChartInstanceRef.current) {
        typeChartInstanceRef.current.destroy()
        typeChartInstanceRef.current = null
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
        species_type: speciesType || null,
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
      setSpeciesType('')
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

  /** Start editing a sighting — pre-populate form fields */
  function startEdit(s: Sighting) {
    setEditingId(s.id)
    setEditSpecies(s.species_name)
    setEditType((s.species_type as SpeciesType) ?? '')
    setEditNotes(s.notes ?? '')
    setEditLat(s.lat != null ? String(s.lat) : '')
    setEditLng(s.lng != null ? String(s.lng) : '')
    setSaveMsg(null)
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setSaveMsg(null)
  }

  /** Save edits via Supabase PATCH */
  async function handleSave(id: string) {
    if (!editSpecies.trim()) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload: Record<string, unknown> = {
        species_name: editSpecies.trim(),
        species_type: editType || null,
        notes: editNotes.trim() || null,
      }
      const latNum = parseFloat(editLat)
      const lngNum = parseFloat(editLng)
      if (editLat.trim() && editLng.trim() && !isNaN(latNum) && !isNaN(lngNum)) {
        payload.lat = latNum
        payload.lng = lngNum
      } else {
        payload.lat = null
        payload.lng = null
      }
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/species_sightings?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: fetchHeaders,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      setEditingId(null)
      setSaveMsg(null)
      await loadSightings()
    } catch (err) {
      setSaveMsg(`Error: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  /** Delete a sighting via Supabase DELETE */
  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/species_sightings?id=eq.${id}`,
        { method: 'DELETE', headers: fetchHeaders }
      )
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      setDeletingId(null)
      await loadSightings()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(false)
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

  // Sightings by type for Stats tab
  const typedSightings = sightings.filter(s => s.species_type)
  const untypedCount = sightings.length - typedSightings.length

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

  const iconBtnStyle = (color: string): React.CSSProperties => ({
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    border: `1px solid ${color}`,
    background: '#fff',
    color,
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 600,
  })

  const selectStyle: React.CSSProperties = {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    background: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
  }

  const geoCount = sightings.filter(s => s.lat !== null && s.lng !== null).length
  const filtersActive = searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || typeFilter !== ''

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
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Type <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
            </label>
            <select
              value={speciesType}
              onChange={e => setSpeciesType(e.target.value as SpeciesType)}
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">— Select type —</option>
              {SPECIES_TYPES.filter(t => t !== '').map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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

      {/* ── Recent sightings — search + type filter + date-range filter + CSV export + edit/delete ── */}
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

          {/* Type filter + date range */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as SpeciesType)}
              style={{ ...selectStyle, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              title="Filter by species type"
            >
              <option value="">All types</option>
              {SPECIES_TYPES.filter(t => t !== '').map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

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
                onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setTypeFilter('') }}
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
                {editingId === s.id ? (
                  /* ── Inline edit form ── */
                  <div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Species Name *</label>
                      <input
                        value={editSpecies}
                        onChange={e => setEditSpecies(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Type</label>
                      <select
                        value={editType}
                        onChange={e => setEditType(e.target.value as SpeciesType)}
                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      >
                        <option value="">— Select type —</option>
                        {SPECIES_TYPES.filter(t => t !== '').map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#555', marginBottom: '0.2rem' }}>Latitude</label>
                        <input
                          value={editLat}
                          onChange={e => setEditLat(e.target.value)}
                          type="number"
                          step="any"
                          placeholder="e.g. 51.5074"
                          style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#555', marginBottom: '0.2rem' }}>Longitude</label>
                        <input
                          value={editLng}
                          onChange={e => setEditLng(e.target.value)}
                          type="number"
                          step="any"
                          placeholder="e.g. -0.1278"
                          style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleSave(s.id)}
                        disabled={saving || !editSpecies.trim()}
                        style={{ padding: '0.3rem 0.85rem', borderRadius: '4px', border: 'none', background: '#2563eb', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        {saving ? 'Saving…' : '💾 Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                      {saveMsg && (
                        <span style={{ color: '#dc2626', fontSize: '0.82rem' }}>{saveMsg}</span>
                      )}
                    </div>
                  </div>
                ) : deletingId === s.id ? (
                  /* ── Delete confirmation ── */
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                      Delete <strong>{s.species_name}</strong>? This cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting}
                        style={{ padding: '0.3rem 0.85rem', borderRadius: '4px', border: 'none', background: '#dc2626', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        {deleting ? 'Deleting…' : '🗑️ Confirm Delete'}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        disabled={deleting}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal card view ── */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{s.species_name}</strong>
                        <TypeBadge type={s.species_type} />
                        <span style={{ color: '#999', fontSize: '0.85em', marginLeft: '0.75rem' }}>
                          {new Date(s.observed_at).toLocaleString()}
                        </span>
                        {s.notes && <p style={{ margin: '0.35rem 0 0', color: '#555', fontSize: '0.9em' }}>{s.notes}</p>}
                        {s.lat !== null && s.lng !== null && (
                          <p style={{ margin: '0.25rem 0 0', color: '#2563eb', fontSize: '0.8em' }}>
                            📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.75rem', flexShrink: 0 }}>
                        <button
                          onClick={() => startEdit(s)}
                          style={iconBtnStyle('#2563eb')}
                          title="Edit this sighting"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => { setDeletingId(s.id); setEditingId(null) }}
                          style={iconBtnStyle('#dc2626')}
                          title="Delete this sighting"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
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

          {/* Sightings by type */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings by Type</h2>
          {typedSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No typed sightings yet — select a type when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={typeChartCanvasRef} />
              </div>
              {untypedCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {untypedCount} sighting{untypedCount !== 1 ? 's' : ''} without a type are not shown in this chart.
                </p>
              )}
            </div>
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
