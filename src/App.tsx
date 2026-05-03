import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

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

const HABITAT_TYPES = ['', 'Forest', 'Grassland', 'Wetland', 'Urban', 'Coastal', 'Mountain', 'Marine', 'Freshwater', 'Desert', 'Other'] as const
type HabitatType = typeof HABITAT_TYPES[number]

const HABITAT_COLORS: Record<string, string> = {
  Forest: '#16a34a',
  Grassland: '#65a30d',
  Wetland: '#0891b2',
  Urban: '#6b7280',
  Coastal: '#0284c7',
  Mountain: '#7c3aed',
  Marine: '#1d4ed8',
  Freshwater: '#06b6d4',
  Desert: '#d97706',
  Other: '#9ca3af',
}

const BEHAVIOR_TYPES = ['', 'Feeding', 'Resting', 'Flying', 'Swimming', 'Calling', 'Nesting', 'Mating', 'Foraging', 'Hunting', 'Other'] as const
type BehaviorType = typeof BEHAVIOR_TYPES[number]

const BEHAVIOR_COLORS: Record<string, string> = {
  Feeding: '#ea580c',
  Resting: '#64748b',
  Flying: '#0ea5e9',
  Swimming: '#06b6d4',
  Calling: '#a855f7',
  Nesting: '#84cc16',
  Mating: '#ec4899',
  Foraging: '#f59e0b',
  Hunting: '#dc2626',
  Other: '#9ca3af',
}

const BEHAVIOR_EMOJI: Record<string, string> = {
  Feeding: '🍃',
  Resting: '💤',
  Flying: '🕊️',
  Swimming: '🌊',
  Calling: '🎵',
  Nesting: '🪺',
  Mating: '💕',
  Foraging: '🔍',
  Hunting: '🎯',
  Other: '🦋',
}

const CONFIDENCE_LEVELS = ['', 'Certain', 'Probable', 'Possible', 'Unsure'] as const
type ConfidenceLevel = typeof CONFIDENCE_LEVELS[number]

const CONFIDENCE_COLORS: Record<string, string> = {
  Certain: '#16a34a',
  Probable: '#2563eb',
  Possible: '#d97706',
  Unsure: '#dc2626',
}

const CONFIDENCE_EMOJI: Record<string, string> = {
  Certain: '✅',
  Probable: '🔵',
  Possible: '⚠️',
  Unsure: '❓',
}

const WEATHER_CONDITIONS = ['', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Overcast', 'Rainy', 'Heavy Rain', 'Stormy', 'Windy', 'Foggy', 'Snowy', 'Other'] as const
type WeatherCondition = typeof WEATHER_CONDITIONS[number]

const WEATHER_COLORS: Record<string, string> = {
  Sunny: '#f59e0b',
  'Partly Cloudy': '#60a5fa',
  Cloudy: '#94a3b8',
  Overcast: '#6b7280',
  Rainy: '#3b82f6',
  'Heavy Rain': '#1d4ed8',
  Stormy: '#7c3aed',
  Windy: '#06b6d4',
  Foggy: '#9ca3af',
  Snowy: '#93c5fd',
  Other: '#6b7280',
}

const WEATHER_EMOJI: Record<string, string> = {
  Sunny: '☀️',
  'Partly Cloudy': '⛅',
  Cloudy: '☁️',
  Overcast: '🌫️',
  Rainy: '🌧️',
  'Heavy Rain': '⛈️',
  Stormy: '🌩️',
  Windy: '💨',
  Foggy: '🌁',
  Snowy: '❄️',
  Other: '🌡️',
}

interface Sighting {
  id: string
  species_name: string
  species_type: string | null
  observed_at: string
  notes: string | null
  lat: number | null
  lng: number | null
  photo_url: string | null
  location_name: string | null
  individual_count: number | null
  habitat_type: string | null
  observer_name: string | null
  behavior: string | null
  weather_conditions: string | null
  confidence_level: string | null
  plant_association: string | null
}

// CDN globals (loaded via index.html)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const L: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Chart: any

/** Return current local datetime in YYYY-MM-DDTHH:MM format for datetime-local inputs */
function nowLocalDatetime(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** Convert a UTC ISO datetime string to local datetime-local input value */
function toLocalDatetimeInput(isoStr: string): string {
  const d = new Date(isoStr)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

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
  const header = 'id,species_name,species_type,habitat_type,behavior,weather_conditions,confidence_level,observer_name,observed_at,notes,lat,lng,photo_url,location_name,individual_count,plant_association'
  const lines = rows.map(s =>
    [s.id, s.species_name, s.species_type, s.habitat_type, s.behavior, s.weather_conditions, s.confidence_level, s.observer_name, s.observed_at, s.notes, s.lat, s.lng, s.photo_url, s.location_name, s.individual_count ?? 1, s.plant_association]
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

/** Small colour-coded badge for habitat type */
function HabitatBadge({ habitat }: { habitat: string | null }) {
  if (!habitat) return null
  const color = HABITAT_COLORS[habitat] ?? '#6b7280'
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: '999px',
      background: color + '15',
      color,
      border: `1px solid ${color}44`,
      fontSize: '0.72rem',
      fontWeight: 600,
      marginLeft: '0.4rem',
      verticalAlign: 'middle',
    }}>
      🌍 {habitat}
    </span>
  )
}

/** Small colour-coded badge for behavior */
function BehaviorBadge({ behavior }: { behavior: string | null }) {
  if (!behavior) return null
  const color = BEHAVIOR_COLORS[behavior] ?? '#6b7280'
  const emoji = BEHAVIOR_EMOJI[behavior] ?? '🦋'
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: '999px',
      background: color + '18',
      color,
      border: `1px solid ${color}44`,
      fontSize: '0.72rem',
      fontWeight: 600,
      marginLeft: '0.4rem',
      verticalAlign: 'middle',
    }}>
      {emoji} {behavior}
    </span>
  )
}

/** Small colour-coded badge for confidence level */
function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null
  const color = CONFIDENCE_COLORS[confidence] ?? '#6b7280'
  const emoji = CONFIDENCE_EMOJI[confidence] ?? '❓'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      background: color + '1a',
      color,
      border: `1px solid ${color}55`,
      borderRadius: '9999px',
      padding: '0.1rem 0.5rem',
      fontSize: '0.78rem',
      fontWeight: 600,
      lineHeight: 1.4,
    }}>
      {emoji} {confidence}
    </span>
  )
}

/** Small colour-coded badge for weather conditions */
function WeatherBadge({ weather }: { weather: string | null }) {
  if (!weather) return null
  const color = WEATHER_COLORS[weather] ?? '#6b7280'
  const emoji = WEATHER_EMOJI[weather] ?? '🌡️'
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: '999px',
      background: color + '18',
      color,
      border: `1px solid ${color}44`,
      fontSize: '0.72rem',
      fontWeight: 600,
      marginLeft: '0.4rem',
      verticalAlign: 'middle',
    }}>
      {emoji} {weather}
    </span>
  )
}

/** Return true if the URL looks like a valid http/https image URL */
function isValidImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Circular progress ring for Habitat Health Score — goal-028 */
function HabitatHealthRing({ score, color }: { score: number; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const filled = circ * score / 100
  return (
    <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
      <svg width={104} height={104} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={52} cy={52} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
        <circle
          cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', lineHeight: 1.1 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{score}</div>
        <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '1px' }}>/ 100</div>
      </div>
    </div>
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
  const [habitatType, setHabitatType] = useState<HabitatType>('')
  const [behavior, setBehavior] = useState<BehaviorType>('')
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('')
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('')
  const [observerName, setObserverName] = useState('')
  const [notes, setNotes] = useState('')
  const [count, setCount] = useState('1')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationName, setLocationName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [observedAt, setObservedAt] = useState<string>(nowLocalDatetime)
  const [plantAssociation, setPlantAssociation] = useState('')
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
  const [habitatFilter, setHabitatFilter] = useState<HabitatType>('')
  const [behaviorFilter, setBehaviorFilter] = useState<BehaviorType>('')
  const [weatherFilter, setWeatherFilter] = useState<WeatherCondition>('')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSpecies, setEditSpecies] = useState('')
  const [editType, setEditType] = useState<SpeciesType>('')
  const [editHabitat, setEditHabitat] = useState<HabitatType>('')
  const [editBehavior, setEditBehavior] = useState<BehaviorType>('')
  const [editWeather, setEditWeather] = useState<WeatherCondition>('')
  const [editConfidence, setEditConfidence] = useState<ConfidenceLevel>('')
  const [editObserverName, setEditObserverName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editCount, setEditCount] = useState('1')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editLocationName, setEditLocationName] = useState('')
  const [editPhotoUrl, setEditPhotoUrl] = useState('')
  const [editObservedAt, setEditObservedAt] = useState('')
  const [editPlantAssociation, setEditPlantAssociation] = useState('')
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
  const habitatChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitatChartInstanceRef = useRef<any>(null)
  const behaviorChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const behaviorChartInstanceRef = useRef<any>(null)
  const weatherChartCanvasRef = useRef<HTMLCanvasElement>(null)
  const confidenceChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weatherChartInstanceRef = useRef<any>(null)
  const confidenceChartInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plantChartInstanceRef = useRef<any>(null)
  const plantChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // Monthly migration trend chart — new in goal-024
  const monthlyChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyChartInstanceRef = useRef<any>(null)

  // Hourly activity chart — new in goal-025
  const hourlyChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hourlyChartInstanceRef = useRef<any>(null)

  // Species discovery chart — new in goal-026
  const speciesDiscoveryChartCanvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speciesDiscoveryChartInstanceRef = useRef<any>(null)

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
    if (habitatFilter && s.habitat_type !== habitatFilter) return false
    if (behaviorFilter && s.behavior !== behaviorFilter) return false
    if (weatherFilter && s.weather_conditions !== weatherFilter) return false
    if (confidenceFilter && s.confidence_level !== confidenceFilter) return false
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
      const photoHtml = s.photo_url && isValidImageUrl(s.photo_url)
        ? `<br/><img src="${s.photo_url}" alt="${s.species_name}" style="width:120px;height:80px;object-fit:cover;border-radius:4px;margin-top:4px;" loading="lazy" />`
        : ''
      const locationHtml = s.location_name
        ? `<br/><span style="color:#059669;font-size:0.82em">📌 ${s.location_name}</span>`
        : ''
      const countHtml = (s.individual_count ?? 1) > 1
        ? `<br/><span style="color:#7c3aed;font-size:0.82em">×${s.individual_count} individuals</span>`
        : ''
      const habitatHtml = s.habitat_type
        ? `<br/><span style="color:${HABITAT_COLORS[s.habitat_type] ?? '#6b7280'};font-size:0.82em">🌍 ${s.habitat_type}</span>`
        : ''
      const observerHtml = s.observer_name
        ? `<br/><span style="color:#0891b2;font-size:0.82em">👤 ${s.observer_name}</span>`
        : ''
      const behaviorHtml = s.behavior
        ? `<br/><span style="color:${BEHAVIOR_COLORS[s.behavior] ?? '#6b7280'};font-size:0.82em">${BEHAVIOR_EMOJI[s.behavior] ?? '🦋'} ${s.behavior}</span>`
        : ''
      const confidenceHtml = s.confidence_level
        ? `<br/><span style="color:${CONFIDENCE_COLORS[s.confidence_level] ?? '#6b7280'};font-size:0.82em">${CONFIDENCE_EMOJI[s.confidence_level] ?? '❓'} ${s.confidence_level}</span>`
        : ''
      const weatherHtml = s.weather_conditions
        ? `<br/><span style="color:${WEATHER_COLORS[s.weather_conditions] ?? '#6b7280'};font-size:0.82em">${WEATHER_EMOJI[s.weather_conditions] ?? '🌡️'} ${s.weather_conditions}</span>`
        : ''
      const plantHtml = s.plant_association
        ? `<br/><span style="color:#16a34a;font-size:0.82em">🌱 ${s.plant_association}</span>`
        : ''
      const marker = L.marker([s.lat as number, s.lng as number], { icon })
        .bindPopup(
          `<strong>${s.species_name}</strong>` +
          (s.species_type ? ` <span style="color:${typeColor};font-size:0.8em">[${s.species_type}]</span>` : '') +
          `<br/>${new Date(s.observed_at).toLocaleString()}` +
          locationHtml +
          countHtml +
          habitatHtml +
          behaviorHtml +
          confidenceHtml +
          weatherHtml +
          plantHtml +
          observerHtml +
          (s.notes ? `<br/><em>${s.notes}</em>` : '') +
          photoHtml
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

  // Chart.js — sightings by habitat doughnut chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !habitatChartCanvasRef.current || typeof Chart === 'undefined') return

    if (habitatChartInstanceRef.current) {
      habitatChartInstanceRef.current.destroy()
      habitatChartInstanceRef.current = null
    }

    const habitatted = sightings.filter(s => s.habitat_type)
    if (habitatted.length === 0) return

    const habitatCounts: Record<string, number> = {}
    for (const s of habitatted) {
      const h = s.habitat_type!
      habitatCounts[h] = (habitatCounts[h] || 0) + 1
    }
    const entries = Object.entries(habitatCounts).sort((a, b) => b[1] - a[1])

    habitatChartInstanceRef.current = new Chart(habitatChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([h]) => h),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: entries.map(([h]) => HABITAT_COLORS[h] ?? '#6b7280'),
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
      if (habitatChartInstanceRef.current) {
        habitatChartInstanceRef.current.destroy()
        habitatChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — sightings by behavior doughnut chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !behaviorChartCanvasRef.current || typeof Chart === 'undefined') return

    if (behaviorChartInstanceRef.current) {
      behaviorChartInstanceRef.current.destroy()
      behaviorChartInstanceRef.current = null
    }

    const behaviorred = sightings.filter(s => s.behavior)
    if (behaviorred.length === 0) return

    const behaviorCounts: Record<string, number> = {}
    for (const s of behaviorred) {
      const b = s.behavior!
      behaviorCounts[b] = (behaviorCounts[b] || 0) + 1
    }
    const entries = Object.entries(behaviorCounts).sort((a, b) => b[1] - a[1])

    behaviorChartInstanceRef.current = new Chart(behaviorChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([b]) => b),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: entries.map(([b]) => BEHAVIOR_COLORS[b] ?? '#6b7280'),
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
      if (behaviorChartInstanceRef.current) {
        behaviorChartInstanceRef.current.destroy()
        behaviorChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — sightings by weather doughnut chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !weatherChartCanvasRef.current || typeof Chart === 'undefined') return

    if (weatherChartInstanceRef.current) {
      weatherChartInstanceRef.current.destroy()
      weatherChartInstanceRef.current = null
    }

    const weathered = sightings.filter(s => s.weather_conditions)
    if (weathered.length === 0) return

    const weatherCounts: Record<string, number> = {}
    for (const s of weathered) {
      const w = s.weather_conditions!
      weatherCounts[w] = (weatherCounts[w] || 0) + 1
    }
    const entries = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1])

    weatherChartInstanceRef.current = new Chart(weatherChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([w]) => w),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: entries.map(([w]) => WEATHER_COLORS[w] ?? '#6b7280'),
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
      if (weatherChartInstanceRef.current) {
        weatherChartInstanceRef.current.destroy()
        weatherChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — sightings by confidence doughnut chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !confidenceChartCanvasRef.current || typeof Chart === 'undefined') return

    if (confidenceChartInstanceRef.current) {
      confidenceChartInstanceRef.current.destroy()
      confidenceChartInstanceRef.current = null
    }

    const confident = sightings.filter(s => s.confidence_level)
    if (confident.length === 0) return

    const confidenceCounts: Record<string, number> = {}
    for (const s of confident) {
      const c = s.confidence_level!
      confidenceCounts[c] = (confidenceCounts[c] || 0) + 1
    }
    const entries = Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])

    confidenceChartInstanceRef.current = new Chart(confidenceChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([c]) => `${CONFIDENCE_EMOJI[c] ?? '❓'} ${c}`),
        datasets: [{
          data: entries.map(([, n]) => n),
          backgroundColor: entries.map(([c]) => (CONFIDENCE_COLORS[c] ?? '#6b7280') + 'cc'),
          borderColor: entries.map(([c]) => CONFIDENCE_COLORS[c] ?? '#6b7280'),
          borderWidth: 1,
        }],
      },
      options: { plugins: { legend: { position: 'bottom' } } },
    })

    return () => {
      if (confidenceChartInstanceRef.current) {
        confidenceChartInstanceRef.current.destroy()
        confidenceChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — top 10 plant associations horizontal bar chart for Stats tab
  useEffect(() => {
    if (tab !== 'stats' || !plantChartCanvasRef.current || typeof Chart === 'undefined') return

    if (plantChartInstanceRef.current) {
      plantChartInstanceRef.current.destroy()
      plantChartInstanceRef.current = null
    }

    const planted = sightings.filter(s => s.plant_association && s.plant_association.trim())
    if (planted.length === 0) return

    const plantCounts: Record<string, number> = {}
    for (const s of planted) {
      const p = s.plant_association!.trim()
      plantCounts[p] = (plantCounts[p] || 0) + 1
    }
    const entries = Object.entries(plantCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

    plantChartInstanceRef.current = new Chart(plantChartCanvasRef.current, {
      type: 'bar',
      data: {
        labels: entries.map(([p]) => p),
        datasets: [{
          label: 'Sightings',
          data: entries.map(([, c]) => c),
          backgroundColor: '#16a34a',
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          y: { grid: { display: false } },
        },
      },
    })

    return () => {
      if (plantChartInstanceRef.current) {
        plantChartInstanceRef.current.destroy()
        plantChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — 12-month rolling migration trend chart — new in goal-024
  useEffect(() => {
    if (tab !== 'stats' || !monthlyChartCanvasRef.current || typeof Chart === 'undefined') return

    if (monthlyChartInstanceRef.current) {
      monthlyChartInstanceRef.current.destroy()
      monthlyChartInstanceRef.current = null
    }

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // Migration months (0-indexed): Mar=2, Apr=3, May=4, Sep=8, Oct=9, Nov=10
    const MIGRATION_MONTHS = new Set([2, 3, 4, 8, 9, 10])
    // Breeding months (0-indexed): Jun=5, Jul=6, Aug=7
    const BREEDING_MONTHS = new Set([5, 6, 7])
    const MIGRATION_COLOR = '#f97316' // monarch orange
    const BREEDING_COLOR = '#16a34a'  // green
    const WINTER_COLOR = '#60a5fa'    // blue

    const now = new Date()
    const labels: string[] = []
    const counts: number[] = []
    const colors: string[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = year !== now.getFullYear()
        ? `${MONTH_NAMES[month]} '${String(year).slice(2)}`
        : MONTH_NAMES[month]
      labels.push(label)
      counts.push(sightings.filter(s => s.observed_at.slice(0, 7) === key).length)
      if (MIGRATION_MONTHS.has(month)) {
        colors.push(MIGRATION_COLOR)
      } else if (BREEDING_MONTHS.has(month)) {
        colors.push(BREEDING_COLOR)
      } else {
        colors.push(WINTER_COLOR)
      }
    }

    monthlyChartInstanceRef.current = new Chart(monthlyChartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sightings',
          data: counts,
          backgroundColor: colors,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: (ctx: any) => `${ctx.parsed.y} sighting${ctx.parsed.y !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } },
        },
      },
    })

    return () => {
      if (monthlyChartInstanceRef.current) {
        monthlyChartInstanceRef.current.destroy()
        monthlyChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // ── Hourly activity chart — new in goal-025 ──────────────────────────────
  useEffect(() => {
    if (tab !== 'stats' || !hourlyChartCanvasRef.current || typeof Chart === 'undefined') return

    if (hourlyChartInstanceRef.current) {
      hourlyChartInstanceRef.current.destroy()
      hourlyChartInstanceRef.current = null
    }

    const DAWN_COLOR = '#fbbf24'      // 5–8  amber
    const MORNING_COLOR = '#34d399'   // 8–12 green
    const AFTERNOON_COLOR = '#60a5fa' // 12–17 blue
    const EVENING_COLOR = '#f97316'   // 17–20 orange
    const NIGHT_COLOR = '#818cf8'     // 20–5  indigo

    function hourColor(h: number): string {
      if (h >= 5 && h < 8) return DAWN_COLOR
      if (h >= 8 && h < 12) return MORNING_COLOR
      if (h >= 12 && h < 17) return AFTERNOON_COLOR
      if (h >= 17 && h < 20) return EVENING_COLOR
      return NIGHT_COLOR
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const labels = hours.map(h => {
      if (h === 0) return '12am'
      if (h === 12) return '12pm'
      return h < 12 ? `${h}am` : `${h - 12}pm`
    })
    const counts = hours.map(h =>
      sightings.filter(s => {
        const d = new Date(s.observed_at)
        return d.getHours() === h
      }).length
    )
    const colors = hours.map(h => hourColor(h))

    hourlyChartInstanceRef.current = new Chart(hourlyChartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sightings',
          data: counts,
          backgroundColor: colors,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: (ctx: any) => `${ctx.parsed.y} sighting${ctx.parsed.y !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    })

    return () => {
      if (hourlyChartInstanceRef.current) {
        hourlyChartInstanceRef.current.destroy()
        hourlyChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // Chart.js — species discovered per month — new in goal-026
  useEffect(() => {
    if (tab !== 'stats' || !speciesDiscoveryChartCanvasRef.current || typeof Chart === 'undefined') return

    if (speciesDiscoveryChartInstanceRef.current) {
      speciesDiscoveryChartInstanceRef.current.destroy()
      speciesDiscoveryChartInstanceRef.current = null
    }

    if (sightings.length === 0) return

    // Find the earliest month each species was first recorded
    const firstSeenMonth: Record<string, string> = {}
    const sorted = [...sightings].sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    for (const s of sorted) {
      const key = s.species_name.trim().toLowerCase()
      const month = s.observed_at.slice(0, 7) // YYYY-MM
      if (!firstSeenMonth[key]) firstSeenMonth[key] = month
    }

    // Build 12-month rolling window
    const today = new Date()
    const labels: string[] = []
    const counts: number[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const month = d.toISOString().slice(0, 7)
      labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }))
      counts.push(Object.values(firstSeenMonth).filter(m => m === month).length)
    }

    speciesDiscoveryChartInstanceRef.current = new Chart(speciesDiscoveryChartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'New species',
          data: counts,
          backgroundColor: '#059669',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: (ctx: any) => `${ctx.parsed.y} new species`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } },
        },
      },
    })

    return () => {
      if (speciesDiscoveryChartInstanceRef.current) {
        speciesDiscoveryChartInstanceRef.current.destroy()
        speciesDiscoveryChartInstanceRef.current = null
      }
    }
  }, [tab, sightings])

  // ── Streak computation — new in goal-025 ──────────────────────────────────
  const streakData = useMemo(() => {
    if (sightings.length === 0) return { currentStreak: 0, longestStreak: 0 }

    const datesWithSightings = new Set(
      sightings.map(s => s.observed_at.slice(0, 10))
    )

    // Current streak: count consecutive days going backwards from today (or yesterday)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const toKey = (d: Date) => d.toISOString().slice(0, 10)

    let currentStreak = 0
    const checkDate = new Date(today)
    // If today has no sighting, check if yesterday does (allow logging earlier in the day)
    if (!datesWithSightings.has(toKey(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    while (datesWithSightings.has(toKey(checkDate))) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Longest streak
    const sortedDates = [...datesWithSightings].sort()
    let longest = 0
    let streak = 0
    let prevDate: Date | null = null
    for (const dateStr of sortedDates) {
      const curr = new Date(dateStr + 'T00:00:00Z')
      if (prevDate) {
        const diff = Math.round((curr.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        streak = diff === 1 ? streak + 1 : 1
      } else {
        streak = 1
      }
      if (streak > longest) longest = streak
      prevDate = curr
    }

    return { currentStreak, longestStreak: longest }
  }, [sightings])

  // ── Unique species count + biodiversity level — new in goal-026 ───────────
  const { uniqueSpeciesCount, diversityLevel, diversityColor } = useMemo(() => {
    const names = new Set(sightings.map(s => s.species_name.trim().toLowerCase()))
    const cnt = names.size
    let level: string
    let color: string
    if (cnt === 0) { level = 'None yet'; color = '#9ca3af' }
    else if (cnt < 5) { level = 'Starting'; color = '#d97706' }
    else if (cnt < 15) { level = 'Growing'; color = '#2563eb' }
    else if (cnt < 30) { level = 'Thriving'; color = '#059669' }
    else { level = 'Flourishing'; color = '#16a34a' }
    return { uniqueSpeciesCount: cnt, diversityLevel: level, diversityColor: color }
  }, [sightings])

  // ── Phenology calendar — new in goal-027 ─────────────────────────────────
  const phenologyData = useMemo(() => {
    if (sightings.length === 0) return []

    // Build: species -> months seen (0-11) + total count
    const speciesMonths = new Map<string, Set<number>>()
    const speciesTotalCounts = new Map<string, number>()
    const speciesType = new Map<string, string | null>()

    for (const s of sightings) {
      const key = s.species_name.trim()
      const month = new Date(s.observed_at).getMonth() // 0 = Jan
      if (!speciesMonths.has(key)) {
        speciesMonths.set(key, new Set())
        speciesTotalCounts.set(key, 0)
        speciesType.set(key, s.species_type ?? null)
      }
      speciesMonths.get(key)!.add(month)
      speciesTotalCounts.set(key, (speciesTotalCounts.get(key) ?? 0) + 1)
    }

    // Sort by total count descending, limit to top 20
    return [...speciesMonths.entries()]
      .sort((a, b) => (speciesTotalCounts.get(b[0]) ?? 0) - (speciesTotalCounts.get(a[0]) ?? 0))
      .slice(0, 20)
      .map(([name, months]) => ({
        name,
        months,
        count: speciesTotalCounts.get(name) ?? 0,
        type: speciesType.get(name) ?? null,
      }))
  }, [sightings])

  // ── Habitat Health Score — goal-028 ──────────────────────────────────────
  const habitatScore = useMemo(() => {
    if (sightings.length === 0) return null

    // Diversity (0-40): unique species count, log scale (log_31(uniqueSpecies+1)*40)
    const uniqueSpecies = new Set(sightings.map(s => s.species_name.trim().toLowerCase())).size
    const divScore = Math.min(40, Math.round(40 * Math.log(uniqueSpecies + 1) / Math.log(31)))

    // Consistency (0-30): how regularly you observe (uniqueDays / active window)
    const dates = sightings.map(s => new Date(s.observed_at).toLocaleDateString())
    const uniqueDays = new Set(dates).size
    const firstTs = Math.min(...sightings.map(s => new Date(s.observed_at).getTime()))
    const daysSinceFirst = Math.max(1, Math.floor((Date.now() - firstTs) / 86400000) + 1)
    const consistencyRatio = uniqueDays / Math.min(daysSinceFirst, uniqueDays + 30)
    const consScore = Math.min(30, Math.round(30 * Math.min(1, consistencyRatio * 1.5)))

    // Richness (0-20): habitat type + species type variety
    const uniqueHabitats = new Set(sightings.filter(s => s.habitat_type).map(s => s.habitat_type)).size
    const uniqueTypes = new Set(sightings.filter(s => s.species_type).map(s => s.species_type)).size
    const richScore = Math.min(20, uniqueHabitats * 3 + uniqueTypes * 2)

    // Seasonal coverage (0-10): number of different months observed
    const months = new Set(sightings.map(s => new Date(s.observed_at).getMonth())).size
    const seasScore = Math.round(10 * months / 12)

    const total = divScore + consScore + richScore + seasScore
    const level = total >= 75 ? 'Thriving' : total >= 50 ? 'Growing' : total >= 25 ? 'Sprouting' : 'Seed'
    const color = total >= 75 ? '#059669' : total >= 50 ? '#2563eb' : total >= 25 ? '#d97706' : '#9ca3af'
    const tip = total >= 75
      ? 'Your habitat is thriving — a genuine sanctuary for local wildlife.'
      : total >= 50
      ? 'Your habitat is growing — keep adding variety and observing regularly.'
      : total >= 25
      ? 'Your habitat is sprouting — log more species and habitat types to grow your score.'
      : 'Your habitat journey is beginning — every sighting counts.'

    return { total, divScore, consScore, richScore, seasScore, uniqueSpecies, uniqueDays, level, color, tip }
  }, [sightings])


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
      const countNum = parseInt(count, 10)
      const payload: Record<string, unknown> = {
        species_name: speciesName.trim(),
        species_type: speciesType || null,
        habitat_type: habitatType || null,
        behavior: behavior || null,
        weather_conditions: weatherCondition || null,
        confidence_level: confidenceLevel || null,
        observer_name: observerName.trim() || null,
        notes: notes.trim() || null,
        location_name: locationName.trim() || null,
        photo_url: photoUrl.trim() && isValidImageUrl(photoUrl.trim()) ? photoUrl.trim() : null,
        individual_count: !isNaN(countNum) && countNum >= 1 ? countNum : 1,
        observed_at: observedAt ? new Date(observedAt).toISOString() : new Date().toISOString(),
        plant_association: plantAssociation.trim() || null,
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
      setHabitatType('')
      setBehavior('')
      setWeatherCondition('')
      setConfidenceLevel('')
      setObserverName('')
      setNotes('')
      setCount('1')
      setLat('')
      setLng('')
      setLocationName('')
      setPhotoUrl('')
      setObservedAt(nowLocalDatetime())
      setPlantAssociation('')
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
    setEditHabitat((s.habitat_type as HabitatType) ?? '')
    setEditBehavior((s.behavior as BehaviorType) ?? '')
    setEditWeather((s.weather_conditions as WeatherCondition) ?? '')
    setEditConfidence((s.confidence_level as ConfidenceLevel) ?? '')
    setEditObserverName(s.observer_name ?? '')
    setEditNotes(s.notes ?? '')
    setEditCount(String(s.individual_count ?? 1))
    setEditLat(s.lat != null ? String(s.lat) : '')
    setEditLng(s.lng != null ? String(s.lng) : '')
    setEditLocationName(s.location_name ?? '')
    setEditPhotoUrl(s.photo_url ?? '')
    setEditObservedAt(toLocalDatetimeInput(s.observed_at))
    setEditPlantAssociation(s.plant_association ?? '')
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
      const countNum = parseInt(editCount, 10)
      const payload: Record<string, unknown> = {
        species_name: editSpecies.trim(),
        species_type: editType || null,
        habitat_type: editHabitat || null,
        behavior: editBehavior || null,
        weather_conditions: editWeather || null,
        confidence_level: editConfidence || null,
        observer_name: editObserverName.trim() || null,
        notes: editNotes.trim() || null,
        location_name: editLocationName.trim() || null,
        photo_url: editPhotoUrl.trim() && isValidImageUrl(editPhotoUrl.trim()) ? editPhotoUrl.trim() : null,
        individual_count: !isNaN(countNum) && countNum >= 1 ? countNum : 1,
        observed_at: editObservedAt ? new Date(editObservedAt).toISOString() : undefined,
        plant_association: editPlantAssociation.trim() || null,
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

  // Total individuals observed (sum of individual_count, defaulting 1 for null)
  const totalIndividuals = sightings.reduce((sum, s) => sum + (s.individual_count ?? 1), 0)

  // Sightings by type for Stats tab
  const typedSightings = sightings.filter(s => s.species_type)
  const untypedCount = sightings.length - typedSightings.length

  // Sightings by habitat for Stats tab
  const habitattedSightings = sightings.filter(s => s.habitat_type)
  const unhabitattedCount = sightings.length - habitattedSightings.length

  // Sightings by behavior for Stats tab
  const behaviorredSightings = sightings.filter(s => s.behavior)
  const unbehaviorredCount = sightings.length - behaviorredSightings.length

  // Sightings by weather for Stats tab
  const weatheredSightings = sightings.filter(s => s.weather_conditions)
  const unweatheredCount = sightings.length - weatheredSightings.length
  const confidencedSightings = sightings.filter(s => s.confidence_level)
  const unconfidencedCount = sightings.length - confidencedSightings.length

  // Sightings with plant association for Stats tab
  const plantedSightings = sightings.filter(s => s.plant_association && s.plant_association.trim())
  const unplantedCount = sightings.length - plantedSightings.length

  // Monarch-specific stats — new in goal-024
  const monarchSightings = sightings.filter(s =>
    s.species_name.toLowerCase().includes('monarch')
  )
  const lastMonarchSighting = monarchSightings.length > 0 ? monarchSightings[0] : null
  const currentMonth = new Date().getMonth() // 0-indexed
  const isSpringMigration = currentMonth >= 2 && currentMonth <= 4
  const isFallMigration = currentMonth >= 8 && currentMonth <= 10
  const isBreedingSeason = currentMonth >= 5 && currentMonth <= 7

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
  const filtersActive = searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || typeFilter !== '' || habitatFilter !== '' || behaviorFilter !== '' || weatherFilter !== '' || confidenceFilter !== ''

  // CSV filename helpers
  const today = new Date().toISOString().slice(0, 10)
  const csvFilename = `species-sightings-${today}.csv`
  const filteredCsvFilename = `species-sightings-filtered-${today}.csv`

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  }

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
              placeholder="e.g. Monarch Butterfly"
              style={inputStyle}
            />
          </div>

          {/* Observation date/time */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              🕐 Observed At <span style={{ fontWeight: 400, color: '#888' }}>(date &amp; time of observation)</span>
            </label>
            <input
              type="datetime-local"
              value={observedAt}
              onChange={e => setObservedAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
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

            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Habitat <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <select
                value={habitatType}
                onChange={e => setHabitatType(e.target.value as HabitatType)}
                style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">— Select habitat —</option>
                {HABITAT_TYPES.filter(h => h !== '').map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Behavior <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <select
                value={behavior}
                onChange={e => setBehavior(e.target.value as BehaviorType)}
                style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">— Select behavior —</option>
                {BEHAVIOR_TYPES.filter(b => b !== '').map(b => (
                  <option key={b} value={b}>{BEHAVIOR_EMOJI[b] ?? ''} {b}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Weather <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
              </label>
              <select
                value={weatherCondition}
                onChange={e => setWeatherCondition(e.target.value as WeatherCondition)}
                style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">— Select weather —</option>
                {WEATHER_CONDITIONS.filter(w => w !== '').map(w => (
                  <option key={w} value={w}>{WEATHER_EMOJI[w] ?? ''} {w}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Confidence <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
            </label>
            <select
              value={confidenceLevel}
              onChange={e => setConfidenceLevel(e.target.value as ConfidenceLevel)}
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">— Select confidence —</option>
              {CONFIDENCE_LEVELS.filter(c => c !== '').map(c => (
                <option key={c} value={c}>{CONFIDENCE_EMOJI[c] ?? ''} {c}</option>
              ))}
            </select>
          </div>

          {/* Plant Association */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              🌱 Associated Plant <span style={{ fontWeight: 400, color: '#888' }}>(optional — what plant was it on/near?)</span>
            </label>
            <input
              value={plantAssociation}
              onChange={e => setPlantAssociation(e.target.value)}
              placeholder="e.g. Common Milkweed, Goldenrod, Native Oak"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Observer Name <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
            </label>
            <input
              value={observerName}
              onChange={e => setObserverName(e.target.value)}
              placeholder="e.g. Jane Smith"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional details…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Count <span style={{ fontWeight: 400, color: '#888' }}>(how many individuals)</span>
            </label>
            <input
              value={count}
              onChange={e => setCount(e.target.value)}
              type="number"
              min="1"
              step="1"
              placeholder="1"
              style={{ ...inputStyle, width: '120px' }}
            />
          </div>

          {/* Location section with Use My Location button */}
          <div style={{ marginBottom: '0.75rem' }}>
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

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.2rem' }}>Location Name</label>
              <input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="e.g. Central Park, NYC"
                style={inputStyle}
              />
            </div>

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
                  style={inputStyle}
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
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Photo URL */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Photo URL <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
            </label>
            <input
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              type="url"
              placeholder="https://example.com/photo.jpg"
              style={inputStyle}
            />
            {photoUrl.trim() && isValidImageUrl(photoUrl.trim()) && (
              <div style={{ marginTop: '0.5rem' }}>
                <img
                  src={photoUrl.trim()}
                  alt="Photo preview"
                  style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
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

          {/* Type + habitat + behavior + weather + confidence filter + date range */}
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

            <select
              value={habitatFilter}
              onChange={e => setHabitatFilter(e.target.value as HabitatType)}
              style={{ ...selectStyle, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              title="Filter by habitat type"
            >
              <option value="">All habitats</option>
              {HABITAT_TYPES.filter(h => h !== '').map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <select
              value={behaviorFilter}
              onChange={e => setBehaviorFilter(e.target.value as BehaviorType)}
              style={{ ...selectStyle, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              title="Filter by behavior"
            >
              <option value="">All behaviors</option>
              {BEHAVIOR_TYPES.filter(b => b !== '').map(b => (
                <option key={b} value={b}>{BEHAVIOR_EMOJI[b] ?? ''} {b}</option>
              ))}
            </select>

            <select
              value={weatherFilter}
              onChange={e => setWeatherFilter(e.target.value as WeatherCondition)}
              style={{ ...selectStyle, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              title="Filter by weather conditions"
            >
              <option value="">All weather</option>
              {WEATHER_CONDITIONS.filter(w => w !== '').map(w => (
                <option key={w} value={w}>{WEATHER_EMOJI[w] ?? ''} {w}</option>
              ))}
            </select>

            <select
              value={confidenceFilter}
              onChange={e => setConfidenceFilter(e.target.value as ConfidenceLevel)}
              style={{ ...selectStyle, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              title="Filter by confidence level"
            >
              <option value="">All confidence</option>
              {CONFIDENCE_LEVELS.filter(c => c !== '').map(c => (
                <option key={c} value={c}>{CONFIDENCE_EMOJI[c] ?? ''} {c}</option>
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
                onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setTypeFilter(''); setHabitatFilter(''); setBehaviorFilter(''); setWeatherFilter(''); setConfidenceFilter('') }}
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
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>🕐 Observed At</label>
                      <input
                        type="datetime-local"
                        value={editObservedAt}
                        onChange={e => setEditObservedAt(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '120px' }}>
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
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Habitat</label>
                        <select
                          value={editHabitat}
                          onChange={e => setEditHabitat(e.target.value as HabitatType)}
                          style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        >
                          <option value="">— Select habitat —</option>
                          {HABITAT_TYPES.filter(h => h !== '').map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Behavior</label>
                        <select
                          value={editBehavior}
                          onChange={e => setEditBehavior(e.target.value as BehaviorType)}
                          style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        >
                          <option value="">— Select behavior —</option>
                          {BEHAVIOR_TYPES.filter(b => b !== '').map(b => (
                            <option key={b} value={b}>{BEHAVIOR_EMOJI[b] ?? ''} {b}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Weather</label>
                        <select
                          value={editWeather}
                          onChange={e => setEditWeather(e.target.value as WeatherCondition)}
                          style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        >
                          <option value="">— Select weather —</option>
                          {WEATHER_CONDITIONS.filter(w => w !== '').map(w => (
                            <option key={w} value={w}>{WEATHER_EMOJI[w] ?? ''} {w}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Confidence Level</label>
                      <select
                        value={editConfidence}
                        onChange={e => setEditConfidence(e.target.value as ConfidenceLevel)}
                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      >
                        <option value="">— Select confidence —</option>
                        {CONFIDENCE_LEVELS.filter(c => c !== '').map(c => (
                          <option key={c} value={c}>{CONFIDENCE_EMOJI[c] ?? ''} {c}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>🌱 Associated Plant</label>
                      <input
                        value={editPlantAssociation}
                        onChange={e => setEditPlantAssociation(e.target.value)}
                        placeholder="e.g. Common Milkweed"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Observer Name</label>
                      <input
                        value={editObserverName}
                        onChange={e => setEditObserverName(e.target.value)}
                        placeholder="e.g. Jane Smith"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
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
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Count</label>
                      <input
                        value={editCount}
                        onChange={e => setEditCount(e.target.value)}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        style={{ width: '100px', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Location Name</label>
                      <input
                        value={editLocationName}
                        onChange={e => setEditLocationName(e.target.value)}
                        placeholder="e.g. Central Park, NYC"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
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
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Photo URL</label>
                      <input
                        value={editPhotoUrl}
                        onChange={e => setEditPhotoUrl(e.target.value)}
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                      {editPhotoUrl.trim() && isValidImageUrl(editPhotoUrl.trim()) && (
                        <img
                          src={editPhotoUrl.trim()}
                          alt="Preview"
                          style={{ marginTop: '0.35rem', maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
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
                        <HabitatBadge habitat={s.habitat_type} />
                        <BehaviorBadge behavior={s.behavior} />
                        <WeatherBadge weather={s.weather_conditions} />
                        <ConfidenceBadge confidence={s.confidence_level} />
                        {(s.individual_count ?? 1) > 1 && (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            background: '#f3e8ff',
                            color: '#7c3aed',
                            border: '1px solid #c4b5fd',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            marginLeft: '0.5rem',
                            verticalAlign: 'middle',
                          }}>
                            ×{s.individual_count}
                          </span>
                        )}
                        <span style={{ color: '#999', fontSize: '0.85em', marginLeft: '0.75rem' }}>
                          {new Date(s.observed_at).toLocaleString()}
                        </span>
                        {s.plant_association && (
                          <p style={{ margin: '0.25rem 0 0', color: '#16a34a', fontSize: '0.82em', fontWeight: 500 }}>
                            🌱 {s.plant_association}
                          </p>
                        )}
                        {s.observer_name && (
                          <p style={{ margin: '0.25rem 0 0', color: '#0891b2', fontSize: '0.82em', fontWeight: 500 }}>
                            👤 {s.observer_name}
                          </p>
                        )}
                        {s.notes && <p style={{ margin: '0.35rem 0 0', color: '#555', fontSize: '0.9em' }}>{s.notes}</p>}
                        {s.location_name && (
                          <p style={{ margin: '0.25rem 0 0', color: '#059669', fontSize: '0.82em', fontWeight: 500 }}>
                            📌 {s.location_name}
                          </p>
                        )}
                        {s.lat !== null && s.lng !== null && (
                          <p style={{ margin: '0.25rem 0 0', color: '#2563eb', fontSize: '0.8em' }}>
                            📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                          </p>
                        )}
                        {s.photo_url && isValidImageUrl(s.photo_url) && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <img
                              src={s.photo_url}
                              alt={`Photo of ${s.species_name}`}
                              style={{ maxWidth: '200px', maxHeight: '130px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}
                              onClick={() => window.open(s.photo_url!, '_blank')}
                              title="Click to open full image"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
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
          {/* 🦋 Monarch Migration Tracker — new in goal-024 */}
          {monarchSightings.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
              border: '2px solid #f97316',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#c2410c', marginBottom: '0.25rem' }}>
                    🦋 Monarch Sightings
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ea580c', lineHeight: 1 }}>
                    {monarchSightings.length}
                  </div>
                  <div style={{ color: '#92400e', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                    {isSpringMigration
                      ? '🌸 Spring migration season'
                      : isFallMigration
                      ? '🍂 Fall migration season'
                      : isBreedingSeason
                      ? '🌿 Summer breeding season'
                      : '❄️ Winter'}
                    {lastMonarchSighting && ` · Last: ${new Date(lastMonarchSighting.observed_at).toLocaleDateString()}`}
                  </div>
                </div>
                <a
                  href="https://www.campmonarch.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.82rem',
                    color: '#c2410c',
                    textDecoration: 'none',
                    border: '1px solid #f97316',
                    borderRadius: '5px',
                    padding: '0.25rem 0.6rem',
                    background: '#fff',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start',
                  }}
                >
                  🏕️ Camp Monarch ↗
                </a>
              </div>
            </div>
          )}

          {/* Habitat Health Score — new in goal-028 */}
          {habitatScore && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem 0' }}>🏡 Habitat Health Score</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <HabitatHealthRing score={habitatScore.total} color={habitatScore.color} />
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: habitatScore.color, marginBottom: '0.25rem' }}>
                    {habitatScore.level}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.75rem' }}>
                    {habitatScore.tip}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem' }}>
                    {[
                      { label: 'Diversity', score: habitatScore.divScore, max: 40, desc: `${habitatScore.uniqueSpecies} unique species` },
                      { label: 'Consistency', score: habitatScore.consScore, max: 30, desc: `${habitatScore.uniqueDays} active days` },
                      { label: 'Richness', score: habitatScore.richScore, max: 20, desc: 'habitat + type variety' },
                      { label: 'Seasons', score: habitatScore.seasScore, max: 10, desc: 'months with sightings' },
                    ].map(({ label, score, max, desc }) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555', marginBottom: '2px' }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 600 }}>{score}/{max}</span>
                        </div>
                        <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: habitatScore.color, width: `${(score / max) * 100}%`, height: '100%', borderRadius: '4px', transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '2px' }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header row: stat cards + export button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
              <div style={{
                flex: 1,
                minWidth: '120px',
                background: '#f0f4ff',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center',
                border: '1px solid #dbeafe',
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>
                  {sightings.length}
                </div>
                <div style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.85rem' }}>sightings recorded</div>
              </div>
              <div style={{
                flex: 1,
                minWidth: '120px',
                background: '#faf5ff',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center',
                border: '1px solid #e9d5ff',
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#7c3aed', lineHeight: 1 }}>
                  {totalIndividuals}
                </div>
                <div style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.85rem' }}>total individuals</div>
              </div>
              <div style={{
                flex: 1,
                minWidth: '120px',
                background: '#f0fdf4',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center',
                border: '1px solid #bbf7d0',
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>
                  {streakData.currentStreak}
                </div>
                <div style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                  day streak 🔥
                </div>
                {streakData.longestStreak > streakData.currentStreak && (
                  <div style={{ color: '#888', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                    best: {streakData.longestStreak}
                  </div>
                )}
              </div>
              <div style={{
                flex: 1,
                minWidth: '120px',
                background: '#f0fdf4',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center',
                border: `1px solid ${diversityColor}33`,
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: diversityColor, lineHeight: 1 }}>
                  {uniqueSpeciesCount}
                </div>
                <div style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.85rem' }}>unique species 🌿</div>
                <div style={{ color: diversityColor, fontSize: '0.72rem', marginTop: '0.15rem', fontWeight: 600 }}>
                  {diversityLevel}
                </div>
              </div>
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

          {/* Sightings by habitat */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings by Habitat</h2>
          {habitattedSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No habitat data yet — select a habitat when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={habitatChartCanvasRef} />
              </div>
              {unhabitattedCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {unhabitattedCount} sighting{unhabitattedCount !== 1 ? 's' : ''} without a habitat are not shown in this chart.
                </p>
              )}
            </div>
          )}

          {/* Sightings by behavior */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings by Behavior</h2>
          {behaviorredSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No behavior data yet — select a behavior when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={behaviorChartCanvasRef} />
              </div>
              {unbehaviorredCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {unbehaviorredCount} sighting{unbehaviorredCount !== 1 ? 's' : ''} without a behavior are not shown in this chart.
                </p>
              )}
            </div>
          )}

          {/* Sightings by confidence */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings by Confidence Level</h2>
          {confidencedSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No confidence data yet — select a confidence level when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={confidenceChartCanvasRef} />
              </div>
              {unconfidencedCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {unconfidencedCount} sighting{unconfidencedCount !== 1 ? 's' : ''} without a confidence level are not shown in this chart.
                </p>
              )}
            </div>
          )}

          {/* Sightings by weather */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings by Weather</h2>
          {weatheredSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No weather data yet — select weather conditions when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={weatherChartCanvasRef} />
              </div>
              {unweatheredCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {unweatheredCount} sighting{unweatheredCount !== 1 ? 's' : ''} without weather data are not shown in this chart.
                </p>
              )}
            </div>
          )}

          {/* Top 10 Plant Associations */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>🌱 Top Plant Associations</h2>
          {plantedSightings.length === 0 ? (
            <p style={{ color: '#888' }}>
              No plant association data yet — enter an associated plant when logging to see the breakdown.
            </p>
          ) : (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <canvas ref={plantChartCanvasRef} />
              </div>
              {unplantedCount > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                  {unplantedCount} sighting{unplantedCount !== 1 ? 's' : ''} without plant data are not shown in this chart.
                </p>
              )}
            </div>
          )}

          {/* Sightings per day chart */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Sightings per Day (last 30 days)</h2>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem' }}>
              <canvas ref={chartCanvasRef} />
            </div>
          )}

          {/* Time of Day chart — new in goal-025 */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>🕐 Time of Day Activity</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#fbbf24', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Dawn (5–8am) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#34d399', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Morning (8am–12pm) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#60a5fa', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Afternoon (12–5pm) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f97316', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Evening (5–8pm) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#818cf8', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Night
          </p>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem' }}>
              <canvas ref={hourlyChartCanvasRef} />
            </div>
          )}

          {/* Monthly migration trend chart — new in goal-024 */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>📅 Monthly Sightings (last 12 months)</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f97316', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Migration (Mar–May, Sep–Nov) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#16a34a', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Breeding (Jun–Aug) &nbsp;
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#60a5fa', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Winter
          </p>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem' }}>
              <canvas ref={monthlyChartCanvasRef} />
            </div>
          )}

          {/* New species discovered per month — new in goal-026 */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>🌿 New Species Discovered Per Month</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
            How many species did you record for the first time each month? A growing habitat attracts new visitors.
          </p>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem' }}>
              <canvas ref={speciesDiscoveryChartCanvasRef} />
            </div>
          )}

          {/* Species Phenology Calendar — new in goal-027 */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>📆 Species Phenology Calendar</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
            Which months does each species visit your habitat? Patterns reveal migration, breeding seasons, and hibernation.
            {phenologyData.length > 1 && ' Showing top 20 species by sighting count.'}
          </p>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.75rem', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem 0.3rem 0', color: '#555', fontWeight: 600, whiteSpace: 'nowrap', minWidth: '130px' }}>Species</th>
                    {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                      <th key={i} style={{ textAlign: 'center', padding: '0.3rem 0.2rem', color: '#888', fontWeight: 600, width: '26px' }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phenologyData.map(({ name, months, count, type }) => {
                    const color = type ? (TYPE_COLORS[type] ?? '#2563eb') : '#2563eb'
                    return (
                      <tr key={name} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.3rem 0.5rem 0.3rem 0', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.7rem', marginLeft: '0.3rem' }}>×{count}</span>
                        </td>
                        {Array.from({ length: 12 }, (_, mIdx) => (
                          <td key={mIdx} style={{ textAlign: 'center', padding: '0.25rem 0.15rem' }}>
                            {months.has(mIdx) ? (
                              <span
                                style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', background: color, opacity: 0.8 }}
                                title={`${name} · ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mIdx]}`}
                              />
                            ) : (
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', background: '#f0f0f0' }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
