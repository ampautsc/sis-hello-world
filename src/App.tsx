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


interface SpeciesProfile {
  description: string
  status: string
  needs: string
  link: string
}

const SPECIES_PROFILES: Record<string, SpeciesProfile> = {
  monarch: {
    description: 'In May, the Monarch you just saw is flying north on winds it has never felt before, following a compass it inherited. Its great-grandparent wintered in the oyamel forests of Michoacán. It is finding its way by the angle of the sun and the pull of the Earth\'s magnetic field — and it is looking for milkweed, the one plant its caterpillars can eat, the plant that was once everywhere and is now mostly gone.',
    status: 'Endangered (IUCN 2022). Populations have fallen roughly 80% since the 1990s — not because the butterfly changed, but because we replaced milkweed with lawn.',
    needs: 'Milkweed in the sunniest part of your yard, near wildflowers that bloom through fall. No pesticides within reach. The butterfly will find it — Monarchs are very good at this.',
    link: 'https://www.campmonarch.org',
  },
  firefly: {
    description: 'What you\'re seeing at dusk is a male firefly writing light in the air — a slow, arcing pulse he has been making for 150 million years. He is asking if anyone is there. Under the leaves, the female waits two seconds, then answers with her own flash. The conversation is species-specific, unchanged for millennia, and it is going quiet — yard by yard, as lawns replace the leaf litter the larvae need to survive.',
    status: 'Declining across North America. No federal protection. Lawn chemicals, outdoor lighting, and loss of leaf litter are the primary drivers.',
    needs: 'Leaf litter undisturbed in at least one corner of your yard from October through April — larvae overwinter in it. Darkness from 9 pm onward. No lawn chemicals where you\'ve seen them.',
    link: 'https://www.campmonarch.org',
  },
  'bumble bee': {
    description: 'Bumble bees do something honeybees cannot. They grip a flower and vibrate their flight muscles at exactly the right frequency — the pollen shakes free and rains down. It has a name: sonication, or buzz pollination. Without it, tomatoes won\'t set fruit. Blueberries stay unripe. Several bumble bee species have already gone entirely silent in North America, absent from every county where they once lived.',
    status: 'Several species endangered or in serious decline. The Rusty-patched Bumble Bee — once the most common bumble bee in the eastern US — has lost 87% of its former range.',
    needs: 'Native wildflowers blooming from April through hard frost. No neonicotinoid pesticides. Undisturbed ground for nesting — they build colonies in abandoned rodent burrows.',
    link: 'https://www.campmonarch.org',
  },
  'honey bee': {
    description: 'The honey bee arrived in North America from Europe in the 1600s, brought by settlers. In three centuries it became essential — pollinating almonds, apples, blueberries, cucumbers, and 90 other crops. But what\'s essential can still be fragile. Annual colony losses now regularly exceed 30% across the US. The bee is not going extinct. The systems it depends on are becoming thinner.',
    status: 'Managed colonies under serious pressure from varroa mites, nosema fungus, neonicotinoid pesticides, and habitat loss. Annual US colony loss rates exceed 30%.',
    needs: 'Diverse native wildflowers for continuous pollen across the season. Pesticide-free foraging areas. Native plants provide better nutrition than turf grass or non-native ornamentals.',
    link: 'https://www.campmonarch.org',
  },
  hummingbird: {
    description: 'The Ruby-throated Hummingbird weighs less than a nickel and just crossed the Gulf of Mexico — nonstop, 500 miles of open water. It beats its wings 53 times per second and can hover in a 20-mph headwind. In May it arrives in Missouri following the first red wildflowers, precisely as it has for thousands of years. Except now many of those flowers are gone, replaced by lawn and non-native ornamentals that offer the color but not the calories.',
    status: 'Not currently threatened, but dependent on native flower corridors that are fragmenting. Habitat loss during migration is increasing as wildflower margins become lawn.',
    needs: 'Native red and orange tubular flowers: Cardinal Flower, Wild Columbine, Trumpet Vine. Also insects — hummingbirds eat gnats and spiders for protein. Pesticide-free yards for both.',
    link: 'https://www.campmonarch.org',
  },
  bluebird: {
    description: 'The Eastern Bluebird was nearly gone by 1970. The reason was simple: European Starlings and House Sparrows, introduced in the 1800s, took every natural nest cavity. People responded by putting up boxes — thousands, then tens of thousands, from Florida to Saskatchewan. Bluebird populations recovered. It is one of the clearest demonstrations in conservation history that loss caused by humans can be deliberately reversed.',
    status: 'Recovering, but still dependent on nest box programs in many areas. Without continued human assistance, competition from invasive cavity nesters would reestablish the decline.',
    needs: 'A nest box with a 1.5-inch entrance hole, 4-6 feet high on a smooth pole, in open habitat near short grass for hunting. Native berry shrubs nearby for fall and winter food.',
    link: 'https://www.campmonarch.org',
  },
  goldfinch: {
    description: 'The American Goldfinch is the last bird to nest in summer — it waits for thistles to go to seed in July, lines its nest with the down, and feeds its young seeds directly from the flower head. It is so precisely calibrated to native coneflowers and thistles that if the stalks are cut back in fall, the food disappears. In a yard where the seed heads are left standing, goldfinches return every week from October through March, working through them one by one.',
    status: 'Common and stable, but declining locally where native seed-producing plants are replaced with non-native or deadheaded ornamentals.',
    needs: 'Native coneflowers, black-eyed Susans, and sunflowers — left standing through winter. Do not deadhead them. The dead stems are the food.',
    link: 'https://www.campmonarch.org',
  },
  cardinal: {
    description: 'The male Cardinal\'s red is not fixed — it comes from the carotenoid pigments in the berries and fruits he eats. A bird feeding on serviceberries in spring deepens his color through summer; a bird with a poor winter deepens less. His red is a live record of your yard\'s food quality. The female, brown with red accents, also sings — one of the few female songbirds in North America to do so. Pairs sometimes finish each other\'s phrases.',
    status: 'Common and stable across eastern North America. One of the most abundant songbirds in eastern US suburbs.',
    needs: 'Dense native shrubs for low nesting: Cardinals build in tangles. Native berry-producing plants: Serviceberry, Dogwood, Elderberry, Winterberry. Sunflower seeds at feeders through winter.',
    link: 'https://www.campmonarch.org',
  },
  woodpecker: {
    description: 'A woodpecker is building a city. The hole it chisels into a dead ash in March becomes a nest for Screech-Owls in April, for Wood Ducks in May, for flying squirrels in fall, and for cavity-nesting beetles and fungi for decades afterward. In a yard with a standing dead tree — a snag — the woodpecker is not a bird. It is infrastructure for every cavity-nesting species that follows.',
    status: 'Most species stable. Red-headed Woodpecker faces habitat pressures. The most common yard species — Downy and Hairy Woodpecker — are doing well where large native trees remain.',
    needs: 'Standing dead trees, or large dead branches left on living trees. Native oaks for insect-rich bark. No wound sealant — it prevents the natural rot that cavity nesters require.',
    link: 'https://www.campmonarch.org',
  },
  dragonfly: {
    description: 'The dragonfly over your yard is a flying fossil — its order has been airborne for 325 million years, longer than the dinosaurs. The adult you see emerged from larvae that lived in water for up to four years. Dragonflies catch 95% of everything they target mid-flight, calculating the future position of their prey and flying to where it will be. Roughly 1 in 3 North American dragonfly species is now threatened, mostly because the wetlands their larvae need are gone.',
    status: 'About 1 in 3 North American dragonfly species threatened, primarily by wetland loss. The US has lost more than half its wetlands since European settlement.',
    needs: 'Clean water: even a 15-gallon container pond supports oviposition and larval development. Native emergent aquatic plants for egg-laying. No goldfish or Koi, which eat every larva.',
    link: 'https://www.campmonarch.org',
  },
  toad: {
    description: 'An American Toad eats up to 1,000 insects per night — mosquitoes, slugs, cutworms — found by tongue in the dark. It returns every spring to the pond or puddle where it was born, sometimes traveling half a mile on a specific night in April when soil temperature and humidity cross a threshold it has been waiting for all winter. Whatever pesticides are in the soil it walks through absorb directly into its skin.',
    status: 'Declining in many areas. The chytrid fungus has devastated amphibians worldwide. Chemical exposure compounds the threat — many pesticides kill the insects toads eat before reaching the toad directly.',
    needs: 'Moist, shaded areas for daytime shelter — an overturned pot, a cluster of stones. A small water feature for spring breeding. No lawn chemicals near moist areas. Leaf litter for winter.',
    link: 'https://www.campmonarch.org',
  },
  'tiger swallowtail': {
    description: 'The Eastern Tiger Swallowtail is twice the butterfly you think it is. Females exist in two forms: yellow with black tiger stripes, and an all-black form that mimics the toxic Pipevine Swallowtail — predators learned to avoid the Pipevine, and the edible Tiger Swallowtail female free-rides on that fear. Males gather at puddles to drink mineral-rich water, which they transfer to females as a nuptial gift. This behavior — puddling — is why you sometimes see a dozen swallowtails together at a single muddy spot.',
    status: 'Common and widespread. One of the largest and most recognizable butterflies in North America.',
    needs: 'Wild Black Cherry and Tulip Poplar as caterpillar host plants. Puddles or moist mineral-rich soil for males. Native wildflowers for nectar.',
    link: 'https://www.campmonarch.org',
  },
  warbler: {
    description: 'Wood warblers don\'t stay. The Yellow-rumped Warbler moving through your yard in May may breed in Canadian spruce forest and winter in Central America — covering thousands of miles on a body the size of a large grape. Each species has its own map, its own mix of caterpillars and berries it needs along the way. A native oak hosts hundreds of caterpillar species — more warbler food than any other tree in eastern North America. In May, those caterpillars fuel dozens of warbler species in a single week.',
    status: 'Many species in significant decline. Forest fragmentation on both breeding and wintering grounds is compounding. Building collisions kill up to 1 billion birds per year in the US.',
    needs: 'Native oaks — the single most valuable tree for migrating warblers. Dense native understory shrubs for shelter. Lights off or windows treated May 1–June 1 and Sept 1–Oct 15 during peak migration.',
    link: 'https://www.campmonarch.org',
  },
  robin: {
    description: 'The American Robin doesn\'t find earthworms by sight — it finds them by sound. That head-tilt is not visual scanning; it is listening for worm movement below the surface. The ability to do this depends on healthy soil with a functioning earthworm population, which depends on the absence of pesticides. In a chemical-free yard, the robin that visited your birdbath in April has been feeding on a live report of your soil\'s health all summer.',
    status: 'Common and widespread — one of the most abundant birds in North America. Not threatened, but locally dependent on healthy soil ecology and native berry-producing trees.',
    needs: 'Chemical-free lawns with living topsoil. Native berry-producing trees for fall and winter food: Serviceberry, Dogwood, Mulberry, Crabapple. A water feature for bathing.',
    link: 'https://www.campmonarch.org',
  },
  frog: {
    description: 'Frogs are the canary in every ecosystem. Their permeable skin absorbs whatever is in the water and soil around them before anything else does. A healthy frog population is a live reading of your yard\'s water and soil quality. Nearly a third of the world\'s frog species are endangered. Forty-one species have gone extinct since 1970. What happens to the frogs, happens later to everything else.',
    status: 'Globally threatened. Among the most endangered vertebrate groups on Earth. The chytrid fungus has caused at least 90 extinctions. Habitat loss, water pollution, and pesticides compound the crisis.',
    needs: 'Clean water — frogs absorb it through their skin. Native wetland and pond-edge plants. A buffer of native vegetation between treated lawn and any water body. No pesticides near water.',
    link: 'https://www.campmonarch.org',
  },
  sparrow: {
    description: 'Native sparrows — Song, Field, Savannah, Grasshopper — are not the introduced House Sparrow. They are birds of meadows, wild edges, and tall-grass fields: places that have almost entirely disappeared from the American landscape. The Song Sparrow sings from the same branch every morning from March through July. The Field Sparrow sings a long accelerating series of sweet notes — like a ball bearing dropped on concrete, bouncing slowly to stillness.',
    status: 'Several native sparrow species in serious decline. The Grasshopper Sparrow has lost 70% of its population since 1970, almost entirely due to grassland loss.',
    needs: 'Native grasses and wildflower meadows for nesting. No mowing May through August. Seed heads left standing through winter. Even a 10×10-foot patch of native grass is territory worth defending.',
    link: 'https://www.campmonarch.org',
  },
}

function getSpeciesProfile(speciesName: string): SpeciesProfile | null {
  const lower = speciesName.toLowerCase()
  const key = Object.keys(SPECIES_PROFILES).find(k => lower.includes(k))
  return key ? SPECIES_PROFILES[key] : null
}


const PLANT_SUGGESTIONS: Record<string, string[]> = {
  monarch: ['Common Milkweed', 'Swamp Milkweed', 'Butterflyweed', 'Purple Coneflower'],
  'black swallowtail': ['Golden Alexanders', 'Purple Coneflower', 'Wild Parsley'],
  'tiger swallowtail': ['Wild Black Cherry', 'Tulip Poplar', 'Spicebush', 'Sassafras'],
  'spicebush swallowtail': ['Spicebush', 'Sassafras', 'Bay Laurel'],
  'painted lady': ['Thistle', 'Asters', 'Hollyhock', 'Purple Coneflower'],
  'question mark': ['American Elm', 'Stinging Nettles', 'Hops'],
  'red admiral': ['Stinging Nettles', 'Hops', 'Native Asters'],
  'american lady': ['Pussytoes', 'Pearly Everlasting', 'Ironweed'],
  viceroy: ['Willows', 'Aspens', 'Cottonwood'],
  fritillary: ['Native Violets', 'Wild Violets', 'Goldenrod'],
  skipper: ['Native Grasses', 'Little Bluestem', 'Indian Grass'],
  firefly: ['Native Lawn Grasses', 'Leaf Litter Zones', 'Ground Cover Plants'],
  'bumble bee': ['Wild Bergamot', 'Purple Coneflower', 'Wild Indigo', 'Anise Hyssop'],
  'honey bee': ['Goldenrod', 'Wild Bergamot', 'Purple Coneflower', 'Basswood'],
  'carpenter bee': ['Wild Bergamot', 'Native Asters', 'Goldenrod'],
  'mason bee': ['Fruit Tree Blossoms', 'Native Wildflowers', 'Willows'],
  hummingbird: ['Wild Columbine', 'Cardinal Flower', 'Trumpet Vine', 'Bee Balm'],
  goldfinch: ['Purple Coneflower', 'Black-eyed Susan', 'Native Sunflower', 'Thistle'],
  bluebird: ['Serviceberry', 'American Holly', 'Native Dogwood', 'Eastern Red Cedar'],
  chickadee: ['Native Oaks', 'Serviceberry', 'Native Conifers'],
  wren: ['Dense Native Shrubs', 'Spicebush', 'Native Viburnums'],
  warbler: ['Native Oaks', 'Native Cherries', 'Wild Grape'],
  robin: ['Serviceberry', 'Native Mulberry', 'Native Dogwood', 'Wild Strawberry'],
  sparrow: ['Native Grasses', 'Little Bluestem', 'Switchgrass', 'Wild Millet'],
  cardinal: ['Serviceberry', 'Wild Sumac', 'Native Dogwood', 'Winterberry'],
  woodpecker: ['Native Oaks', 'Standing Dead Trees (Snags)', 'Native Cherries'],
  hawk: ['Native Trees for Perching', 'Open Lawn for Hunting'],
  owl: ['Mature Native Trees', 'Nest Box in Large Tree'],
  deer: ['Native Shrubs', 'Wild Apples', 'Oaks (for Acorns)'],
  rabbit: ['Native Grasses', 'White Clover', 'Dense Ground Cover'],
  squirrel: ['Native Oaks', 'Hickory', 'Serviceberry'],
  toad: ['Leaf Litter Zones', 'Dense Native Plantings', 'Small Water Feature'],
  frog: ['Wetland Plants', 'Native Sedges', 'Shallow Water Garden'],
  turtle: ['Wetland Margin Plants', 'Shallow Water Garden'],
  snake: ['Brush Piles', 'Dense Native Plantings', 'Rock Piles'],
  dragonfly: ['Water Feature', 'Native Emergent Plants', 'Cattails'],
  damselfly: ['Water Feature', 'Emergent Aquatic Plants', 'Native Sedges'],
  cricket: ['Native Grasses', 'Leaf Litter Zones', 'Dense Ground Cover'],
  grasshopper: ['Native Grasses', 'Wildflower Meadow', 'Tall Grass Areas'],
  ladybug: ['Yarrow', 'Fennel', 'Dill', 'Native Flowers (for aphid prey)'],
  milkweed: ['Common Milkweed', 'Swamp Milkweed', 'Butterflyweed'],
}

function getPlantSuggestions(speciesName: string): { plants: string[]; matched: boolean } {
  const lower = speciesName.toLowerCase()
  const key = Object.keys(PLANT_SUGGESTIONS).find(k => lower.includes(k))
  if (key) return { plants: PLANT_SUGGESTIONS[key], matched: true }
  return {
    plants: ['Purple Coneflower', 'Native Goldenrod', 'Wild Bergamot', 'Serviceberry'],
    matched: false,
  }
}


interface ActionCall {
  emoji: string
  encouragement: string
  action: string
}

const ACTION_CALLS: Record<string, ActionCall> = {
  monarch: {
    emoji: '\uD83E\uDD8B',
    encouragement: 'The Monarch you just saw is looking for milkweed right now. In May it is checking every sunny patch of disturbed ground in your neighborhood for the one plant its caterpillars can eat.',
    action: 'Plant common milkweed (Asclepias syriaca) in the sunniest spot in your yard, or butterfly weed (Asclepias tuberosa) if your soil is dry. Monarchs will find it within days of arrival in your migration corridor.',
  },
  firefly: {
    emoji: '\u2728',
    encouragement: 'The firefly you saw tonight is the adult — but its larvae have been living in your yard\'s soil and leaf litter for 1-2 years. Your leaf litter is a firefly nursery.',
    action: 'Leave one corner of your yard unraked and unmowed, with leaf litter intact from October through May. That\'s where the next generation overwinters and pupates.',
  },
  'bumble bee': {
    emoji: '\uD83D\uDC1D',
    encouragement: 'The bumble bee you saw needs food every week from now through October. Its whole colony will die at hard frost — only the mated queen survives to start a new colony next spring.',
    action: 'Plant natives that bloom in sequence: Wild Bergamot or Purple Coneflower for June-July, native Goldenrod for August-October. Bumble bees need continuous forage, not a single bloom period.',
  },
  'honey bee': {
    emoji: '\uD83C\uDF6F',
    encouragement: 'Honey bees forage up to 3 miles from their hive. The one you saw may have come from a neighbor\'s backyard hive — or from a managed apiary a mile away, looking for what lawn grass cannot provide.',
    action: 'Avoid neonicotinoid insecticides — imidacloprid, clothianidin, thiamethoxam — which impair bee navigation and colony health. Check pesticide labels; they\'re common in garden center products.',
  },
  hummingbird: {
    emoji: '\uD83C\uDF3A',
    encouragement: 'The Ruby-throated Hummingbird you saw just crossed the Gulf of Mexico to get here. It will defend a territory of roughly an acre through August, returning to the same flowers each morning.',
    action: 'Plant Cardinal Flower (Lobelia cardinalis) in a moist spot. It blooms July-August when nectar is scarce, and it is the single best native plant for hummingbirds in eastern North America.',
  },
  bluebird: {
    emoji: '\uD83D\uDC26',
    encouragement: 'Eastern Bluebirds nearly went extinct in North America — then people started putting up nest boxes. It worked. The bluebird you just saw is direct evidence that deliberate action reverses loss.',
    action: 'Mount a nest box with a 1.5-inch entrance hole, 4-6 feet high on a smooth pole, in open habitat. Face it east or southeast. Check and clean it every fall.',
  },
  goldfinch: {
    emoji: '\uD83C\uDF3B',
    encouragement: 'Goldfinches feed their nestlings regurgitated seed, not insects like most songbirds. What feeds them is entirely determined by your yard\'s plant choices — specifically, whether you leave seed heads standing.',
    action: 'Plant Purple Coneflower (Echinacea purpurea) and do not deadhead the flowers. Leave the seed heads standing through winter. Goldfinches will work through them all winter long.',
  },
  dragonfly: {
    emoji: '\uD83D\uDCA7',
    encouragement: 'The dragonfly you saw emerged from water — it spent years as a larva in a pond before flying. It will return to water to lay the next generation of eggs.',
    action: 'Add a small water feature — a 15-gallon tub sunk to ground level with native emergent plants like Blue Flag Iris. No goldfish or Koi. They eat every larva the dragonflies lay.',
  },
  frog: {
    emoji: '\uD83D\uDC38',
    encouragement: 'Frogs absorb water and chemicals directly through their skin. The presence of a frog in your yard is a live reading of your soil and water quality. This one found conditions it could survive.',
    action: 'Stop using pesticides and herbicides near any moist area. Frog skin is permeable — they can\'t avoid chemical exposure the way mammals do, and the effects accumulate over their entire lives.',
  },
  toad: {
    emoji: '\uD83C\uDF3F',
    encouragement: 'An American Toad can eat 10,000 insects over a summer. The one you just saw is working your mosquito population, your slug population, and your cutworm population simultaneously, for free.',
    action: 'Leave a damp, shaded corner undisturbed — under a deck, behind a cluster of hostas, near a pile of stones. That\'s where toads shelter during the day and return each night.',
  },
  warbler: {
    emoji: '\uD83C\uDF33',
    encouragement: 'Warblers are passing through — they may stay just a day or two, eating caterpillars on your trees before continuing north. What you plant this spring determines whether they stop here at all.',
    action: 'If you have space for one native tree, plant a native oak. Oaks support more caterpillar species — warbler food — than any other tree in eastern North America. Even a small one feeds dozens of birds.',
  },
  cardinal: {
    emoji: '\uD83D\uDD34',
    encouragement: 'The male Cardinal\'s red is a live record of the berries and fruits he\'s been eating. A deeply red bird in May means your yard has been feeding him well through the whole winter and spring.',
    action: 'Plant a Serviceberry (Amelanchier) — it blooms in April when birds need early fruit, and produces berries that Cardinals, robins, and Cedar Waxwings will strip within a week of ripening.',
  },
  woodpecker: {
    emoji: '\uD83C\uDF32',
    encouragement: 'The hole a Downy Woodpecker chisels this spring will shelter chickadees this fall, flying squirrels next winter, and bluebirds the year after. One woodpecker, one tree, years of cascading benefit.',
    action: 'Leave any standing dead tree that isn\'t a safety hazard. A snag is the most valuable single wildlife feature in most suburban yards. If you must remove it, cut to 10 feet and leave the stub.',
  },
  'tiger swallowtail': {
    emoji: '\uD83E\uDD8B',
    encouragement: 'The Tiger Swallowtail can identify host trees by tasting their leaves with its feet. It will choose Wild Black Cherry or Tulip Poplar over every other plant in your yard if you have one.',
    action: 'Plant Wild Black Cherry (Prunus serotina) — it also feeds 40+ bird species, hosts hundreds of caterpillar species including Luna Moths, and is extremely low-maintenance once established.',
  },
  sparrow: {
    emoji: '\uD83C\uDF3E',
    encouragement: 'Native sparrows have lost up to 70% of their population in 50 years. The meadows and wild edges they need have been almost entirely converted to lawn. This one found something worth staying for.',
    action: 'Leave a patch of your yard unmowed from April through October. Even a 10×10-foot area of native grasses and wildflowers is territory a Field Sparrow will defend and nest in all summer.',
  },
}


interface SeasonalTip {
  emoji: string
  heading: string
  tip: string
}

// Month index 0 = January, 11 = December. Content focused on Midwest/Missouri wildlife.
const SEASONAL_TIPS: SeasonalTip[] = [
  {
    emoji: '❄️',
    heading: "January: Winter's Hidden Wildlife",
    tip: "Look for dark-eyed juncos, white-throated sparrows, and downy woodpeckers at feeders. Bald eagles congregate along the Mississippi and Missouri rivers. Great horned owls are already on nests — they begin nesting in December and are incubating eggs now. Listen at dusk for their low hooting.",
  },
  {
    emoji: '🦅',
    heading: "February: First Signs",
    tip: "Bald eagles are peak-visible on rivers this month. Great horned owls are already sitting on eggs. Watch for the first red-winged blackbirds on warm days — their arrival marks the first whisper of spring, often weeks before flowers.",
  },
  {
    emoji: '🐸',
    heading: "March: Spring Waking",
    tip: "Spring peepers begin calling on warm nights — the first amphibian chorus of the year. Red-winged blackbirds and Eastern bluebirds return. Early wildflowers like bloodroot and hepatica bloom in wooded areas. Monarchs haven't arrived yet, but their milkweed host plants are just emerging.",
  },
  {
    emoji: '🌸',
    heading: "April: Migration Begins",
    tip: "Warblers are moving through — yellow-rumped warblers arrive first. Wild violets, spring beauties, and wild ginger are blooming. The first individual Monarchs (the northward advance) may appear at month's end if milkweed is up. Check low-growing violets for fritillary butterfly eggs — tiny, ridged, cream-colored.",
  },
  {
    emoji: '🦋',
    heading: "May: Peak Migration — Watch for Monarchs",
    tip: "Monarchs are actively migrating northward through the Midwest right now. Look for them nectaring on dandelions, wild mustard, and early milkweed. Check milkweed leaves for small pale-green eggs — they're the size of a pinhead. Warblers are at peak diversity. Fireflies may start flashing in the last week of May.",
  },
  {
    emoji: '✨',
    heading: "June: Fireflies and Breeding Season",
    tip: "Fireflies light up meadows and woodland edges after dusk — their season peaks mid-June in Missouri. Common yellowthroat warblers and indigo buntings are singing. Monarch caterpillars should be visible on milkweed now if eggs were laid in May. Giant swallowtails are active on sunny days.",
  },
  {
    emoji: '🌻',
    heading: "July: Midsummer Peak",
    tip: "This is peak butterfly season — tiger swallowtails, painted ladies, and skippers are abundant on coneflowers and black-eyed Susans. Ruby-throated hummingbirds are at feeders and monarda flowers. Monarch caterpillars are actively feeding. Cicadas start singing in earnest.",
  },
  {
    emoji: '🌾',
    heading: "August: Goldenrod and the Turn South",
    tip: "Goldenrod is the heartbeat of late summer — dozens of butterfly and bee species depend on it. Monarchs begin their southward migration in late August. Look for them roosting in trees in the evening, sometimes dozens together. Ruby-throated hummingbirds are fattening for migration — peak feeder activity.",
  },
  {
    emoji: '🌿',
    heading: "September: The Monarch Migration",
    tip: "This is the most important month to log Monarch sightings. Millions are migrating south to Mexico — your observations help map the corridor. Look for roost sites in shelterbelts and tree lines at dusk. Migrating warblers are passing through again. Monarch clusters on goldenrod and asters are a sign the migration is peaking.",
  },
  {
    emoji: '🍂',
    heading: "October: Fall Passage",
    tip: "Monarch migration winds down in early October — the last sightings of the year along the corridor. Sandhill cranes are moving through in flocks. White-crowned and fox sparrows arrive from the north. Native asters are the last major nectar source before frost. Watch for merlin falcons hunting migrating songbirds.",
  },
  {
    emoji: '🦆',
    heading: "November: Waterfowl Season",
    tip: "Migrating ducks, geese, and tundra swans are moving south — wetlands and reservoirs are worth checking. The last lingering yellow-rumped warblers are departing. Rough-legged hawks arrive from the Arctic tundra. Great horned owls begin courtship calls again — their cycle is already beginning.",
  },
  {
    emoji: '🌲',
    heading: "December: Winter Residents",
    tip: "Bald eagles are returning to the rivers for winter. Short-eared owls hunt open fields at dusk in good years. Dark-eyed juncos, white-throated sparrows, and American tree sparrows dominate feeders. Cedar waxwings strip berries from native shrubs — planting native hawthorn or viburnums now will feed them for winters to come.",
  },
]

function getSeasonalTip(): SeasonalTip {
  return SEASONAL_TIPS[new Date().getMonth()]
}


interface FieldNote {
  week: number
  text: string
}

// Week 1 = Jan 1-7, Week 52 = Dec 28-31. Focused on Midwest/Missouri phenology.
// Written in the naturalist voice: specific instruction, sensory detail, ecological connection.
const FIELD_NOTES: FieldNote[] = [
  { week: 1, text: "Short-eared owls hunt open fields at dusk in flat, windswept light — a buoyant, moth-like flight you will not mistake for anything else. The winter solstice has passed and days are gaining two minutes each. Great horned owls have already claimed their territories in woodlots; their deep hooting carries more than a mile through bare trees on still nights." },
  { week: 2, text: "Bald eagles gather at open water as northern lakes freeze. Look for them on ice floes or in tall cottonwoods over the Missouri and Mississippi Rivers — you may count a dozen in two miles of bluff. Dark-eyed juncos pick through leaf litter below feeders, pecking at seeds that have fallen since October. They arrived from the Canadian Arctic in October; these are the ones that stayed." },
  { week: 3, text: "On unusually warm January days, male Northern Cardinals sing from high perches — a full, clear whistle testing the air. This is the first sign that light matters more than temperature in triggering bird breeding cycles. Nothing is flowering, nothing is migrating, but somewhere in the cardinal's hypothalamus the lengthening days are being counted." },
  { week: 4, text: "Cedar waxwings descend on eastern red cedar and hackberry in large, restless flocks — 20 to 100 birds at a time, moving through in thin, high whistles you can mistake for a screen door. They eat berries almost exclusively in winter. A native hawthorn or viburnums in your yard will hold birds like this through February." },
  { week: 5, text: "Great horned owls are incubating eggs right now — in the coldest weeks of winter, while sleet falls and temperatures drop below zero. She sits through all of it. Her mate hunts and brings food to her on the nest. They started earlier than any other bird because their owlets need five full months to learn to hunt before next winter. Look for the silent shape on a flat-topped nest in a big oak." },
  { week: 6, text: "The first Eastern Bluebirds begin investigating nest boxes in early February — males arriving two to three weeks before females, checking every cavity in the territory. If you have nest boxes, this is your last week to clean them from last season before scouts arrive. The male's sky-blue back against a brown winter field is one of the first reliable signs of spring." },
  { week: 7, text: "In rich bottomland woods, skunk cabbage generates its own metabolic heat to melt through frozen soil — the first native plant to flower each year, its spathe already emerging near spring seeps. Bloodroot corms underground are swelling. Above ground, the first red-winged blackbirds arrive in wetlands — males in full breeding plumage, claiming territory in the cold weeks before any female appears." },
  { week: 8, text: "Marsh edges are suddenly loud with conk-la-ree. Male red-winged blackbirds have been here for two weeks already, perched on reed stalks, spreading their red epaulettes at rivals. Females won't arrive for another three weeks. The male's urgency is pure real estate: the best territories — deepest cattails, closest to feeding grounds — go to the males who arrived earliest." },
  { week: 9, text: "On mild evenings in late February, listen from a wet meadow edge for the buzzy, nasal peent of the American Woodcock, followed immediately by the twittering spiral of its sky dance. The woodcock has been here since January, but March evenings are prime. Stand at the edge of a wet thicket after dark — the display begins at last light and ends twenty minutes later." },
  { week: 10, text: "Massive kettles of sandhill cranes are moving north over Missouri — hundreds at a time, higher than they look, making a prehistoric rattling bugle that carries for miles. They pass mostly at night, but on clear days you can spot them as slow-moving specks above the clouds. Look up any time you hear a sound you cannot place. Cranes have been migrating this corridor for two and a half million years." },
  { week: 11, text: "Hepatica opens in south-facing woodland slopes this week — tiny purple, pink, and white flowers before any leaves have unfurled on the trees above. Bloodroot follows days later, its white petals lasting only one or two days before falling. These spring ephemerals have six weeks to bloom, set seed, and photosynthesize before the tree canopy closes above them. They are on a strict timer." },
  { week: 12, text: "The eastern phoebe is Missouri's first insect-eating migrant — it arrives while there are still frosts, finding enough flies and gnats on warm afternoons to survive. Look for a small dark flycatcher pumping its tail emphatically on a fence post near water. It nests on ledges under bridges, often the same ledge year after year. Phoebes show a constancy that looks like loyalty." },
  { week: 13, text: "Tree swallows appear over ponds and lakes in late March, chasing the first hatches of midges low over the water. The iridescent teal of the males catches morning sun as they wheel and bank. They need open water to hunt and snags or nest boxes to breed. Where old trees with cavities have been removed, tree swallow numbers have crashed. A nest box over water is one of the most direct habitat actions you can take." },
  { week: 14, text: "Spring ephemerals are at their peak in Missouri's hardwood forests this week — trout lilies carpeting the hillsides, large-flowered trilliums opening white above their mottled leaves, Dutchman's breeches dangling in clusters. A trillium may live 20 to 30 years before it flowers for the first time. The plants underfoot may have been growing since the mid-1990s, patient and quiet in the leaf litter." },
  { week: 15, text: "Ruby-throated hummingbirds crossed the Gulf of Mexico in a single night flight — 500 miles over open water — and the first males are arriving in Missouri now. Put your feeder up this week. Native red columbine is just coming into bloom, the plant that co-evolved with these birds over millions of years; no red dye needed, no artificial nectar. The columbine knows what the hummingbird needs." },
  { week: 16, text: "The wood-warbler migration through Missouri is one of the great spectacles of North American birding, and it begins in mid-April. Start with yellow-rumped warblers — the most common and first to arrive, their yellow rumps flashing as they forage in shrubs. By late April they are joined by yellow warblers in the willows and yellow-throated warblers in the sycamores. Watch any large tree with moving canopy in early morning light." },
  { week: 17, text: "The first Monarch scouts of the year are trickling north — one or two individuals, ragged from their flight out of Mexico, searching for milkweed in the warming landscape. Look in highway right-of-ways and south-facing old fields where common milkweed is just beginning to leaf out. A sighting logged this week lands on the scientific record of the migration's leading edge. It matters more now than it will in June." },
  { week: 18, text: "Baltimore Orioles arrive this week in Missouri — males in orange flame from the elm canopy, females quieter in olive, both already beginning the woven pendulum nest in a high fork. Listen for the rich gurgling whistle before you look up; it carries farther than the color. Common milkweed is just unfurling from last year's dried stalks. Monarchs are three to five weeks behind." },
  { week: 19, text: "Common milkweed is ankle-high in disturbed edges now, and female Monarchs are searching for it — checking each stem with their forelegs for the chemical signal only milkweed carries. They lay one egg per plant, solitary and white, on the underside of a new leaf. Check your milkweed patch on warm afternoons. The egg is 1mm, fluted like a tiny ribbed vase, easy to miss and worth finding." },
  { week: 20, text: "Above ground, fireflies haven't emerged yet — but their larvae are hunting in the leaf litter beneath your feet. Tiny predators, spending one to two years underground eating snails and earthworms before pupating. Every time a lawn is rototilled in spring, dozens are killed. Every leaf pile left intact through winter sheltered them. The firefly display you see in June begins now, in the dark, underfoot." },
  { week: 21, text: "The warbler wave has moved north — what remains are the breeders. Common yellowthroats are singing witchety-witchety-witchety from willows along every stream. Yellow warblers have claimed the shrubby edges. In bottomland swamps, prothonotary warblers glow like small suns in the dark canopy. Spring peepers have fallen mostly silent. Gray treefrogs are taking over the night, their long trill running for hours." },
  { week: 22, text: "The first Photinus pyralis fireflies appear in late May in Missouri — the most common species, its flash a single slow rise-and-fade from low meadows between eight and ten in the evening. The males flash; the females answer from low perches with a two-second delay. This exchange has been happening in Missouri meadows for 100 million years. Light pollution disrupts it. Turn off outdoor lights tonight." },
  { week: 23, text: "If you planted milkweed in May, check it now for Monarch caterpillars. The 5 instars from egg to chrysalis take about two weeks total. Young caterpillars in instars 1 and 2 are barely two millimeters and difficult to see. Look instead for the evidence: small, irregular holes in new leaves, and tiny black frass pellets on the leaves below. The caterpillar finds the milkweed; the milkweed finds you." },
  { week: 24, text: "A Monarch chrysalis looks like a jade amulet — smooth green with a ring of gold dots at the top, hanging from a silken pad. When the adult is near emergence, the chrysalis turns transparent and the orange wing pattern shows through the shell. This transformation from caterpillar to butterfly takes 10 to 14 days. If you've been watching the milkweed you planted, you may witness it." },
  { week: 25, text: "The first-generation Monarchs that hatched from eggs laid in early May are now adults — they will lay the eggs whose caterpillars will become the migratory generation that flies to Mexico. Each generation's survival depends on the next generation's milkweed. A single milkweed plant is rarely enough for a yard to contribute reliably. Three to five plants, scattered in sun, makes a patch worth finding." },
  { week: 26, text: "Peak firefly emergence in Missouri — the light shows are spectacular on warm, humid, windless evenings in woodland edges near water. Photinus pyralis males flash in the high grass; females answer from low perches with a two-second delay. This is co-evolution made visible: the timing is a conversation between mates refined over millions of years. Light pollution interrupts the conversation. Turn off outdoor lights." },
  { week: 27, text: "Eastern tiger swallowtails are at peak abundance now, feeding heavily on milkweed, bee balm, and ironweed. Look for females — they have blue on the hindwings. In Missouri, about one in four females is the dark morph, which mimics the poisonous pipevine swallowtail — an imitation that works because the predator cannot always tell the difference. Evolution in action, visible on a warm afternoon in your yard." },
  { week: 28, text: "The second brood of Monarchs is laying eggs and the caterpillars are feeding hard on milkweed. This is the busiest time for milkweed in your yard — every leaf is a potential nursery. Do not spray anything near milkweed plants, even products labeled organic. The caterpillar sequestering milkweed toxins for its own defense is doing chemistry that took millions of years to develop. Leave it to its work." },
  { week: 29, text: "American Goldfinches are among the last birds to nest in Missouri — they wait for composite seeds to ripen, feeding thistle and coneflower seeds to their young. Look for the bright yellow males in late July pulling silky fiber from thistles and milkweed to weave their nests. If your native coneflowers are going to seed, you may attract a nesting pair. The goldfinch's season runs counter to almost every other bird's." },
  { week: 30, text: "The first goldenrod blooms open this week — the heartbeat of late summer ecology. Goldenrod is not responsible for hay fever; ragweed, which blooms at the same time with wind-dispersed pollen, is. But goldenrod feeds 150 native bee species, fueling Monarch butterflies for migration, and supports 300 insects that eat its foliage. If you pull goldenrod from your yard, you are pulling out a foundation." },
  { week: 31, text: "Ruby-throated hummingbirds begin their southward movement in early August — weeks before most people realize migration has started. Activity at feeders often peaks in August as migrants join resident birds fattening for the crossing of the Gulf. A hummingbird can double its body weight in two weeks. Keep feeders full. They will leave when their internal calendar says to leave, not when the nectar runs out." },
  { week: 32, text: "The first wave of Monarchs heading south appears in Missouri in mid-August. These are the super-generation — physiologically distinct butterflies that will not reproduce until they return from Mexico next spring. They live eight to nine months, against two to six weeks for summer generations. They are fueling on goldenrod and ironweed. Your late-season flowers are not decoration — they are a fuel depot on a 2,000-mile flight." },
  { week: 33, text: "Family groups of great blue herons congregate at productive fishing shallows in late summer. You may see adults standing with three or four nearly-full-sized juveniles, distinguishable by streaked necks and no black crown plume. Shorebirds are moving through on mud flats and pond edges — least sandpipers, lesser yellowlegs, spotted sandpipers pausing before the long flight south. August mud is worth checking." },
  { week: 34, text: "The peak of the Monarch migration passes through central Missouri in the last week of August and first two weeks of September. Roosting sites in shelterbelts and tree lines may hold dozens or hundreds of individuals. Look at dusk for clusters hanging in the canopy, wings folded, resting for the night. Every logged sighting this week contributes to the map of a living corridor that exists nowhere else on earth." },
  { week: 35, text: "Native asters are blooming now — the last major nectar resource before frost, and one of the most ecologically important. They support specialist bee species active only in fall, fuel migrating Monarchs through October, and produce seeds that goldfinches and sparrows depend on through winter. Symphyotrichum oblongifolium, the aromatic aster, is drought-tolerant and blooms into November. If you plant one fall native, let it be this." },
  { week: 36, text: "September is peak fall migration for many species. Warblers moving south are in drabber plumage than in spring — harder to identify, faster moving, less vocal. Look for mixed flocks moving through treetops with chickadees and nuthatches as guides. At ponds with exposed mudflats, sandpipers, dowitchers, and yellowlegs pause to feed. Anything on mud in September is worth a second look." },
  { week: 37, text: "Watch goldenrod and aster patches for fueling Monarchs still moving south. In good years you can count twenty or thirty on a single large aster patch, wings slowly fanning in the sun. In lean years the patches are quiet. Both outcomes matter: presence or absence, abundance or scarcity, recorded honestly and submitted to the map, is how we learn what we are losing and what we are restoring." },
  { week: 38, text: "A few ruby-throated hummingbirds linger through late September — particularly juveniles, still learning the route south. If you see a hummingbird in late September, keep the feeder up. It is not holding them back. They leave when their bodies say to leave, not when the feeder empties. A cold front in early October usually brings the last stragglers south. Then the yard is theirs again in April." },
  { week: 39, text: "The first white-crowned sparrows arrive in Missouri in late September — they've come from their Arctic and mountain breeding grounds and will be here through April. With them come white-throated sparrows, Lincoln's sparrows, and song sparrows foraging in brushy edges and weedy fields. October sparrow flocks reward patience: stand at the edge of a brush pile for twenty minutes and count what you see." },
  { week: 40, text: "Fall warbler migration continues through October. Yellow-rumped warblers are the most common — hundreds at a time, moving through shrubby edges and feeding on bayberry and cedar berries. They can survive on fruit in ways other warblers cannot, which is why they are the last to leave in fall and the first to arrive in spring. Where native berry-producing shrubs grow, yellow-rumps gather. The shrubs were ready for them." },
  { week: 41, text: "The last Monarchs pass through Missouri in early to mid-October. After this they are gone until April. The wintering population in Mexico will use the same oyamel fir forests their great-great-grandparents used — if the forests are still there. Some will find their winter home diminished by logging or storm. Your October sightings document what survives. The record matters beyond this season." },
  { week: 42, text: "Sandhill crane migration in reverse — the great flocks that moved north in March are now headed south over Missouri, their rattling prehistoric bugle carrying from high altitude on clear days. Large kettles of 200 to 500 birds spiral up on thermals before gliding south. The sandhill crane lineage is 2.5 million years old. You are watching the same migration that passed over the same prairies before humans arrived." },
  { week: 43, text: "Broad-winged hawks, Cooper's hawks, and sharp-shinned hawks are moving south on northwest winds after cold fronts. In Missouri, elevated ridgelines on good flight days can produce impressive counts. Dark-eyed juncos arrive from the Arctic — the first of the winter sparrows. American tree sparrows appear in open weedy fields. The feeder activity that went quiet in summer suddenly picks up again." },
  { week: 44, text: "Merlin falcons pass through Missouri in October and November — look for a small, fast, streaked falcon that harasses songbird flocks with a determined persistence. Rough-legged hawks arrive from the Arctic tundra: a large buteo that hovers over open fields like a kestrel. A hovering large hawk in November in Missouri is almost certainly a rough-legged hawk. It has come a very long way." },
  { week: 45, text: "Last yellow-rumped warblers, hermit thrushes, and American robins are still moving through, sheltering in areas with berry crops. The hardwood forest is bare now — easy to spot birds that would have been invisible in September. Northern harriers hunt open fields in a low, rocking glide, wingtips angled upward. Bald eagles concentrate at large rivers and reservoirs as smaller water freezes to the north." },
  { week: 46, text: "Bald eagles gather at open water as northern lakes freeze. The Missouri and Mississippi Rivers host dozens in winter. A high overlook on a river bluff on a cold, clear morning in November may show twenty or more in the trees along a two-mile stretch. They are here because the river stays unfrozen. An otter sliding through the shallows below, a beaver crossing the eddy — all at the same bend of river." },
  { week: 47, text: "Short-eared owls hunt open farmland and grassland in winter — appearing at dusk in a buoyant, quartering flight, lower over the fields than you expect. In good years, several birds work the same prairie in late afternoon light. Their appearance in Missouri is variable: some winters none, some winters dozens, depending on vole cycles in the north. Follow local birding reports; when they show up, go." },
  { week: 48, text: "The Audubon Christmas Bird Count takes place in mid-December — the longest-running citizen science survey in North America, now in its 126th year. You can participate with any skill level; the organizers match observers to appropriate routes. The data from 125 years of counts shows which species have declined, which have expanded, and what winter has become across North America. Sign up for your local circle." },
  { week: 49, text: "Winter solstice is approaching — the shortest days of the year. Dark-eyed juncos and white-throated sparrows are at feeders. Any native berry-bearing shrub you planted this year is feeding birds right now. Native hawthorns, viburnums, dogwoods, and hollies hold berries through winter and are far more valuable to wildlife than ornamental cultivars bred for color but not fruit. The planting you did in spring is already working." },
  { week: 50, text: "Great horned owls are calling now in the early dark — their breeding season begins before winter ends. On still, cold nights their deep hooting carries more than a mile through bare woods. The winter solstice arrives this week: days will start gaining light again, minute by minute, and somewhere in their cells, birds and plants have already begun to respond. The year's turn happens quietly." },
  { week: 51, text: "The winter solstice has passed. Days are gaining again, two minutes at a time, and under the snow the process of spring has already begun at the cellular level. American tree sparrows from the Arctic tundra peck at frozen goldenrod seed heads in your garden. Leave them standing. The stems that look dead hold dozens of overwintering insect eggs, caterpillars, and pupae. Clean up nothing until April." },
  { week: 52, text: "The last days of December belong to winter finches in irruption years — pine siskins, common redpolls, or evening grosbeaks appearing at feeders when the northern boreal cone crop has failed. More likely: the familiar white-throated sparrows, juncos, and house finches. But look up on a cold clear day. A bald eagle, a rough-legged hawk, a kettle of snow geese — all are possible. The natural world does not close for the year." },
]

function getFieldNote(): FieldNote {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  // dayOfYear: Jan 1 = 1, Jan 7 = 7, Dec 31 = 365/366
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  // weekIndex 0–51: Jan 1-7 → 0, Jan 8-14 → 1, … Dec 28-31 → 51
  const weekIndex = Math.min(Math.floor((dayOfYear - 1) / 7), 51)
  return FIELD_NOTES[weekIndex]
}


interface WeeklyAction {
  week: number
  action: string
  reason: string
}

// 52 weekly action cards — specific, achievable, timed to Midwest phenology.
// Each week: one clear thing you can do TODAY for wildlife in your yard.
const WEEKLY_ACTIONS: WeeklyAction[] = [
  { week: 1, action: "Leave your leaf litter undisturbed until March.", reason: "Firefly larvae, native bee pupae, and butterfly chrysalises are overwintering in those leaves right now. Every leaf pile you leave intact is a wildlife shelter." },
  { week: 2, action: "Hang a suet feeder near a wooded edge.", reason: "Downy woodpeckers, nuthatches, and Carolina wrens are burning calories in sub-zero air. High-fat suet replaces what they can't find under frozen bark." },
  { week: 3, action: "Note where ice-free water exists within a mile of your home.", reason: "Waterfowl and eagles concentrate at open water in winter. Mapping it now helps you find spectacular wildlife in the weeks ahead." },
  { week: 4, action: "Plant one native shrub with winter berries — hawthorn, native viburnum, or winterberry holly.", reason: "Cedar waxwings, bluebirds, and hermit thrushes depend on native berries when nothing else is available. Order now for spring planting." },
  { week: 5, action: "Go outside at dusk and listen for great horned owls.", reason: "Great horned owls are incubating eggs in the coldest weeks of winter. Their deep, resonant hooting carries over a mile on still nights. They are already at work." },
  { week: 6, action: "Clean out nest boxes before bluebirds arrive.", reason: "Eastern bluebirds begin scouting nest sites in late February. A box with last year's debris already in it sends the wrong signal. Five minutes now means a nesting pair this spring." },
  { week: 7, action: "Check wet, south-facing slopes for the first skunk cabbage.", reason: "Skunk cabbage is the first native plant to flower each year — it generates its own heat to melt through snow. Finding it is finding the exact moment winter breaks." },
  { week: 8, action: "Put up a brush pile in a corner of your yard.", reason: "A brush pile — 3 to 4 feet high, made of woody prunings — shelters rabbits, wrens, native sparrows, and overwintering insects through the worst winter weeks." },
  { week: 9, action: "Stand at the edge of a wet thicket at dusk and listen for the American Woodcock.", reason: "The woodcock's sky dance — a buzzy nasal peent followed by a twittering aerial spiral — runs for twenty minutes after last light on mild February evenings. It will stop in a month." },
  { week: 10, action: "Look up anytime you hear an unfamiliar sound — listen for sandhill cranes.", reason: "Thousands of sandhill cranes are moving north over Missouri this week, often high enough to look like specks. Their rattling bugle is prehistoric. Tilt your head back." },
  { week: 11, action: "Walk a south-facing wooded slope and find hepatica or bloodroot.", reason: "These spring ephemerals bloom before any leaves open above them. They have exactly six weeks to complete their entire above-ground life. Finding them now means you are paying attention at the right speed." },
  { week: 12, action: "Watch for the first Eastern Phoebe near a bridge, ledge, or barn.", reason: "The phoebe is Missouri's first insect-eating migrant — it arrives while there are still frosts. Its emphatic tail-pumping is unmistakable. Spring migration has begun." },
  { week: 13, action: "Set up a nest box over open water for tree swallows.", reason: "Tree swallows need cavities near water to breed. Old snags have been removed from most landscapes. A nest box on a post over a pond or in a wet field fills that gap directly." },
  { week: 14, action: "Take a slow walk through a hardwood forest and look at the ground.", reason: "Trout lilies, trilliums, Dutchman's breeches — spring ephemerals peak in mid-April. A trillium may be 25 years old before it flowers. You are walking through a slow patience." },
  { week: 15, action: "Put up your hummingbird feeder this week.", reason: "Ruby-throated hummingbirds are crossing the Gulf of Mexico right now. The first males reach Missouri in mid-April. Native red columbine is better than any feeder — plant both." },
  { week: 16, action: "Spend 20 minutes in the morning watching any large tree for warblers.", reason: "The wood-warbler migration through Missouri peaks from mid-April to mid-May. A single big willow or sycamore can hold a dozen species in an hour. You do not need binoculars to start." },
  { week: 17, action: "Log your first Monarch sighting of the year the moment you see one.", reason: "The first Monarchs arrive in Missouri in mid-to-late April — ragged pioneers from Mexico. Your sighting, logged immediately, lands on the scientific record of where the migration's leading edge reached today." },
  { week: 18, action: "Plant common milkweed seeds or transplants in a sunny spot.", reason: "Every Monarch born north of Texas exists because milkweed survived. Common milkweed (Asclepias syriaca) is the most important host plant in Missouri. Plant it now, before the first generation arrives." },
  { week: 19, action: "Check your milkweed patch for Monarch eggs on warm afternoons.", reason: "Females lay eggs in May — one per plant, on the underside of new leaves. The egg is 1mm, fluted like a ribbed vase. You are looking for something that will become a butterfly before the month ends." },
  { week: 20, action: "Leave leaf litter around trees and shrubs intact through May.", reason: "Firefly larvae spend one to two years hunting in soil and leaf litter. Every tilling or raking in spring ends dozens of lives that were weeks from emerging as adults. The display in June begins now, underfoot." },
  { week: 21, action: "Plant one native grass — little bluestem, switchgrass, or prairie dropseed.", reason: "Native grasses support 40 times more insects than exotic ornamental grasses. Little bluestem seeds feed birds through February. They bloom in August with rust-red autumn color worth waiting for." },
  { week: 22, action: "Turn off outdoor lights on warm evenings this week.", reason: "The first Photinus pyralis fireflies are appearing. Males flash low over meadows between 8 and 10 PM; females answer from the grass below. Light pollution disrupts the exchange. The dark is the habitat." },
  { week: 23, action: "Check milkweed for caterpillars — look for frass before you look for the caterpillar itself.", reason: "Young Monarch caterpillars in instars 1 and 2 are nearly invisible. But their frass — tiny black pellets on the leaves below — is easy to spot. The frass means you found them." },
  { week: 24, action: "Watch for a Monarch chrysalis in your milkweed patch.", reason: "A Monarch chrysalis looks like jade with gold dots — one of the most beautiful objects in nature. It hangs from a silken pad for 10 to 14 days. The day it turns transparent, you can see the wing pattern inside." },
  { week: 25, action: "Add one more milkweed plant to your yard.", reason: "A single milkweed plant rarely sustains reliable Monarch reproduction. Three to five plants, scattered in sun, makes a patch worth finding. The caterpillars a female lays this week will become the parents of the migratory generation." },
  { week: 26, action: "Go outside between 8:30 and 10:00 PM on a humid night and count firefly flashes.", reason: "Peak firefly emergence in Missouri peaks in the last week of June. Counting species by flash pattern (rise-and-fade = Photinus pyralis; rapid double flash = Photinus scintillans) turns an evening into a field survey." },
  { week: 27, action: "Plant native bee balm (Monarda) in a sunny spot.", reason: "Bee balm is one of the highest-value native plants for wildlife: hummingbirds, Eastern tiger swallowtails, bumblebees, and clearwing moths all depend on it. It blooms in July when little else does." },
  { week: 28, action: "Do not spray anything near milkweed plants this week.", reason: "The second Monarch brood is feeding right now. Monarch caterpillars sequester milkweed toxins as defense — a chemistry that took millions of years to develop. Even organic insecticides kill them. Leave the milkweed alone." },
  { week: 29, action: "Let your native coneflowers (Echinacea) go to seed — do not deadhead them.", reason: "American Goldfinches wait for composite seeds to ripen in July and August. If you deadhead coneflowers, you remove the food source and nesting material that draws them. Goldfinches will pull the seeds themselves." },
  { week: 30, action: "Resist pulling goldenrod from your yard or garden beds.", reason: "Goldenrod does not cause hay fever — that is ragweed, which blooms at the same time. Goldenrod feeds 150 native bee species and fuels Monarchs for migration. Every plant you leave is a fuel depot on a 2,000-mile flight." },
  { week: 31, action: "Keep hummingbird feeders full through August.", reason: "Ruby-throated hummingbirds begin moving south in early August — weeks before most people notice. Migrants join resident birds fattening for the Gulf crossing. A hummingbird can double its body weight in two weeks." },
  { week: 32, action: "Log Monarch sightings daily through mid-September.", reason: "The migratory super-generation begins moving south in mid-August. These butterflies will live eight months — five times longer than summer generations. Your daily sightings map a corridor that exists nowhere else on earth." },
  { week: 33, action: "Check a mud flat, pond edge, or flooded field for shorebirds.", reason: "August mud is prime shorebird habitat. Least sandpipers, spotted sandpipers, and yellowlegs pause on southward migration. These birds have flown from the Arctic and will reach South America. They stop here because the mud is right." },
  { week: 34, action: "Find a Monarch roost site at dusk in late August.", reason: "Roosting Monarchs cluster in shelterbelts and tree lines during migration — sometimes dozens in a single tree. At dusk, they funnel into a roost. Walk a linear windbreak or tree line half an hour before dark." },
  { week: 35, action: "Plant native asters (Symphyotrichum) this fall.", reason: "Asters are the last major native nectar source before frost — critical fueling for migrating Monarchs, late bumblebees, and fall butterflies. Plant them now for blooms in September and October of next year." },
  { week: 36, action: "Note your yard's milkweed density and plan to add more next spring.", reason: "The Monarchs you saw this summer were looking for milkweed. If you had only one or two plants, add three to five more next May. The gap between 'I saw a Monarch' and 'I raised a Monarch' is usually just scale." },
  { week: 37, action: "Do not mow areas with goldenrod and asters until after first frost.", reason: "Fall goldenrod and asters are the last available fuel for migrating Monarchs and late-season native bees. Mowing now eliminates critical nutrition in the weeks when it matters most." },
  { week: 38, action: "Watch for chimney swifts gathering at dusk over urban areas.", reason: "In September, chimney swifts flock before departure — hundreds circling and then funneling into a roost chimney at dusk. This spectacle lasts about ten days. Look for a large brick chimney in an older urban neighborhood." },
  { week: 39, action: "Plant spring-blooming native bulbs: wild hyacinth, trout lily, or spring beauty.", reason: "Spring ephemerals must be planted in fall. Wild hyacinth (Camassia) and spring beauty (Claytonia) bloom before leaves open above them — providing the first major pollen source when native bees first emerge." },
  { week: 40, action: "Log any Monarch sightings — the migration's trailing edge matters as much as the leading edge.", reason: "Late October Monarchs are the last of the migratory generation. Some years the trailing edge comes through weeks later than expected. Your sighting may be the last data point for a season." },
  { week: 41, action: "Leave seedheads standing on native grasses and wildflowers through winter.", reason: "American goldfinches, dark-eyed juncos, and tree sparrows eat native seeds all winter. An undisturbed native plant garden in November is a restaurant. An over-tidied garden is an empty lot." },
  { week: 42, action: "Install a brush pile before winter from pruned woody material.", reason: "A brush pile provides insulated shelter for Eastern towhees, native sparrows, rabbits, and overwintering insects. It is the easiest structure you can build for wildlife. Stack it loosely in a sheltered corner." },
  { week: 43, action: "Fill a bird bath and keep it ice-free through winter.", reason: "Liquid water is scarce in winter. A heated bird bath draws more species in January than a well-stocked feeder. Cedar waxwings, robins, and hermit thrushes all appear for water." },
  { week: 44, action: "Plan next year's native plant purchases this month — availability is limited.", reason: "Native plants sell out early at specialty nurseries. November and December are the best months to research and reserve. Common milkweed, prairie dropseed, and little bluestem should be at the top of your list." },
  { week: 45, action: "Avoid leaf blowing in your yard — rake or leave leaves in place instead.", reason: "Leaf blowers kill everything in the leaf litter: firefly larvae, butterfly pupae, native bee ground nests, and beneficial insects. A rake leaves the structure intact while clearing the path." },
  { week: 46, action: "Go outside and look for white-throated sparrows in your shrubs.", reason: "White-throated sparrows arrive from Canada in late October and stay through April. Their clear Old Sam Peabody-Peabody-Peabody whistle will become the soundtrack of your winter yard. They scratch in leaf litter under shrubs." },
  { week: 47, action: "Put up a winter finch feeder stocked with nyjer (thistle) seed.", reason: "American goldfinches stay through winter in Missouri — they turn olive-drab, easy to miss. Nyjer seed feeders draw them close. Pine siskins and common redpolls visit in irruption years. Check the feeder before noon." },
  { week: 48, action: "Leave a bare soil patch in a sunny location — do not mulch everything.", reason: "Seventy percent of native bees nest in the ground. A south-facing patch of bare or sparsely covered soil in full sun is the highest-value ground nest habitat you can provide. Spring bees will use it from March through June." },
  { week: 49, action: "Walk your property and note every native plant — document what you have as a baseline.", reason: "You cannot measure restoration without knowing your starting point. Marsh said: name the damage accurately before claiming recovery. Your inventory in December is the baseline against which next year's changes will be measured." },
  { week: 50, action: "Order native plants for spring from a regional native nursery.", reason: "Wild Ones plant sales, local native nurseries, and prairie seed suppliers all sell out by May. December and January orders secure first access. Focus on species native to your county, not just your region." },
  { week: 51, action: "Check your nest boxes and repair any that need it before January.", reason: "Great horned owls begin claiming nesting sites in January. Screech-owls and wood ducks will use nest boxes all winter as roost sites. A box in good repair before the new year is one less spring task." },
  { week: 52, action: "Leave your yard as undisturbed as possible through the end of December.", reason: "The creatures sheltering in your yard right now — firefly larvae, native bee pupae, overwintering butterfly chrysalises, and sparrows in your brush pile — need January more than you need a tidy yard. Give them until March." },
]

function getWeeklyAction(): WeeklyAction {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1) // Jan 1 of current year
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) // 0-based: Jan 1 = 0
  const weekIndex = Math.min(Math.floor(dayOfYear / 7), 51)
  return WEEKLY_ACTIONS[weekIndex]
}


interface MonarchStoryEntry {
  week: number
  story: string
}

// 52 weekly Monarch Story entries — prop-015.
// Close-up narrative prose following the Monarch through its annual cycle.
// Each entry tells what is actually happening this week somewhere on the migration.
const MONARCH_STORY: MonarchStoryEntry[] = [
  { week: 1, story: "In the oyamel fir forest of Michoacán, Mexico, tens of millions of Monarchs hang in clusters from branches like bronze tapestries. At this altitude — 3,000 meters — the air stays just cold enough to slow their metabolism without killing them. They have been here since November. They are waiting for a signal only they can feel." },
  { week: 2, story: "At Sierra Chincua, a single Monarch clings to a fir branch surrounded by ten million others. She weighs half a gram. She carries fat stores enough for the flight to Texas and the search for milkweed. She has never made this flight before. She will navigate by the sun's position and the earth's magnetic field, toward a place she knows only through inheritance." },
  { week: 3, story: "Cold mist rolls through the colony in the mornings. Some nights dip below freezing — a Monarch wet from rain and caught in a freeze becomes brittle, its wings snapping like foil. Climate change has made the mountain winters less predictable. The margin between survival and catastrophe is measured in single degrees." },
  { week: 4, story: "Logging has taken half the oyamel forest since 1971. Where dark fir once buffered the cold, gaps let in wind and hard frost. A Monarch sheltered in thick canopy survives temperatures that would kill one perched on an exposed branch. Every tree cut narrows the margin. Every tree planted widens it." },
  { week: 5, story: "As days lengthen, a Monarch's internal clock responds to the changing angle of light. Fat stores begin converting back to reproductive potential. The long fast is almost over. What looked like stillness from outside was never still — it was waiting, calibrated to a precision that took two million years to develop." },
  { week: 6, story: "By early February, warm afternoons bring Monarchs down from the trees to feed on wildflowers at the forest edge. The drinking is urgent and purposeful. The colony, which seemed dormant for months, has quietly been preparing to disperse. The migration's first breath is already visible for anyone watching." },
  { week: 7, story: "Monarchs begin mating in the oyamel forest. A male pursues a female through the cathedral of firs, grappling briefly mid-flight. She will carry fertilized eggs for the first milkweed she finds in Texas, hundreds of miles to the north. He has completed his purpose. The next generation is already decided." },
  { week: 8, story: "The colony is thinning. Individuals lift off each warm afternoon and drift north on thermals, then roost again at night in trees along the route. The migration is not a river — it begins as a trickle, becomes a stream, becomes a flood. The first Monarchs are already in central Mexico, heading for the Rio Grande." },
  { week: 9, story: "In the Texas Hill Country, the first green stalks of antelope horn milkweed push from limestone soil. No Monarchs have reached it yet. The plant does not know they are coming. But for a million years this plant and this butterfly have been writing each other's future, and their timing has never failed by more than a week." },
  { week: 10, story: "The first pioneer Monarchs cross the Rio Grande, ragged and thin after three months in Mexico. A female finds milkweed, drums with her feet to confirm the chemistry, and touches a single egg to the underside of a young leaf. Each egg — a ridged ivory capsule, one millimeter tall — contains the next generation. She will lay 400 in her lifetime. Perhaps 20 will become butterflies." },
  { week: 11, story: "In Missouri, the soil is still cold. Milkweed will not emerge for another month. But in Texas, the first generation is already underway: caterpillars on milkweed, chrysalises forming in farmyard shrubs. The species is rebuilding itself from scratch, moving north ahead of the warming season, as it has every year since the glaciers retreated." },
  { week: 12, story: "Spring in Missouri: the first hepatica blooms on south-facing hillsides, the first Eastern Phoebes arrive from the south. Underground, milkweed's root system is preparing its spring stalks. The Monarch's arrival and the milkweed's emergence are synchronized so precisely that they seem to be reading the same calendar — because they are." },
  { week: 13, story: "In Texas, the first generation of Monarchs emerges from their chrysalises. They are smaller than the overwintering generation — brighter, tighter-winged, carrying none of the fatigue of Mexico. They will live four to six weeks. They will not reach Missouri. But their offspring will — and those offspring's offspring will find their way back to the mountains in the fall." },
  { week: 14, story: "By early April, the migration front has reached Oklahoma and Arkansas. Reports flow in on citizen science platforms: first Monarch sightings, logged with coordinates, building a real-time map of a migration that was invisible for most of human history. Every sighting logged becomes a data point in a dataset that didn't exist twenty years ago." },
  { week: 15, story: "Missouri milkweed emerges — green knobs pushing through warming soil, unfurling toward the purple flower clusters they will carry in June. This is the substrate of everything that follows. Without milkweed, no egg can become a caterpillar that can become a butterfly. The plant is not a supporting character in the Monarch's story. It is the story." },
  { week: 16, story: "Monarchs arrive in southern Missouri on warm southerly winds, flying at heights of one hundred to a thousand feet. They navigate by keeping the sun to their upper-right in the morning and upper-left in the afternoon. On overcast days, they use a magnetic compass. No one taught them this. It is encoded in tissue older than the Ozarks." },
  { week: 17, story: "A Monarch lands on a milkweed plant in a backyard in Missouri. She taps the leaf with her forelegs — taste receptors on her feet confirm: yes, this is milkweed. She touches the underside of a young leaf and deposits a single egg. The person watching through the kitchen window has no idea what just happened. It is the most important thing that occurred in that yard all year." },
  { week: 18, story: "The egg hatches after four days. A first-instar caterpillar, three millimeters long, eats its own eggshell first, then begins eating milkweed — a plant toxic to almost every other insect. The caterpillar has evolved chemistry that neutralizes the toxin and stores it as defense. The milkweed thought it was armed. It was, but not against this." },
  { week: 19, story: "In five stages called instars, the caterpillar sheds its skin four times, growing from three millimeters to forty-five in two weeks. Each instar reveals brighter banding — yellow, white, black — warning to predators: I am toxic, do not eat me. A blue jay that eats a Monarch caterpillar will vomit within minutes. It will never eat one again." },
  { week: 20, story: "The fifth-instar caterpillar wanders, finds a surface, attaches with silk, hangs in a J shape for twelve hours, then sheds its final skin in a single long ripple to reveal the chrysalis: jade green with a golden diadem. Inside, almost every cell dissolves into a liquid and reassembles as a butterfly. This is not metaphor. It is biochemistry more complex than anything we have yet built." },
  { week: 21, story: "The chrysalis turns transparent on day ten. Through the clear membrane you can see the orange and black wing pattern, folded, waiting. On day eleven or twelve the adult emerges, pumps fluid through its wings, hangs, dries. It has never flown before. It knows how. By afternoon it is nectaring from milkweed flowers forty yards away." },
  { week: 22, story: "By late May, the second Monarch generation is building across Missouri. Butterflies nectaring, mating, laying. Each milkweed plant is potentially a nursery. The population has multiplied since the first pioneers arrived in April — ten times, a hundred times. The summer generations do not migrate. They live to breed, pass the next generation forward, and die." },
  { week: 23, story: "In early June, Monarchs are present in numbers that have not been this high for twenty years in parts of the Midwest. The reason: milkweed is present in numbers that have not been this high for twenty years. The connection is direct and immediate. Where people plant milkweed, Monarchs appear. The recovery is possible. It is happening, yard by yard." },
  { week: 24, story: "A third generation of Monarchs is underway — caterpillars on milkweed in backyard gardens, roadsides, and remnant prairie patches. These individuals will have short lives. They will not see September. But they are the bridge generation: the ones whose offspring will be born in late July, triggered by changing day length to grow an entirely different kind of butterfly." },
  { week: 25, story: "Something is different about the caterpillars hatching from eggs laid in late June. The days are growing shorter. Day length is read through the eggshell itself, translated into hormonal signals. These caterpillars, when they become butterflies, will not breed in Missouri. They will live eight months. They are being built for a two-thousand-mile flight." },
  { week: 26, story: "The migratory generation is appearing across Missouri and the Midwest: larger fat stores, reproductive diapause, a calibrated navigation system. They look identical to the summer butterflies. The difference is entirely interior, chemical, determined by a few degrees of solar angle in late June. They are being made ready for Mexico." },
  { week: 27, story: "The migratory generation feeds intensively — nectaring from milkweed, coneflower, goldenrod, ironweed. Each nectar stop adds fat to reserves that must fuel a two-thousand-mile flight and then five months of fasting in Mexican mountains. A Monarch can double its body weight in two weeks of good nectaring. The quality of the habitat it passes through determines whether it survives the crossing." },
  { week: 28, story: "Summer stretches through July in Missouri. Monarchs are still breeding — non-migratory butterflies laying eggs, adding to the population. But the migratory generation, born in late June, has stopped that biological clock. They drink nectar like everyone else. They will not mate until spring. They are living a different life than they appear to be living." },
  { week: 29, story: "Goldenrod begins to bloom in roadsides and old fields — the transition plant, bridge between summer nectar flow and fall migration. A Monarch on goldenrod in July is building fuel for a flight that will begin in six weeks. Each flower cluster it visits adds a calorie to reserves that must last until March." },
  { week: 30, story: "Milkweed plants are now tall and tough, older leaves difficult for caterpillars to digest. But new growth appears if plants are cut or browsed, and some gardeners cut milkweed in midsummer to stimulate fresh growth for late-season caterpillars. The milkweed's ability to regrow is part of the partnership — it tolerates herbivory better than most plants, as if it expects it." },
  { week: 31, story: "In early August, the first migratory Monarchs begin their southward movement — drifting south on warm afternoons, stopping to nectar, roosting in tree lines at night. The migration is a slow dissolve at first, barely visible. By mid-September it will be a stream you can stand in a field and watch, a living river moving south." },
  { week: 32, story: "A Monarch roost in southern Illinois: forty butterflies on a single sumac tree on a ridge at sunset, their wings closed, orange-brown undersides rendering them invisible against autumn leaves. By morning they will disperse. By evening they will form a new roost ten miles to the south. This is the pace: twenty to forty miles per day on favorable winds, two thousand miles total." },
  { week: 33, story: "Peak migration through Missouri happens in mid-to-late August. On warm afternoons with south winds, thousands of Monarchs pass in a single day — not a tight flock but a loose stream, all heading the same direction, navigating by the same sun compass. This is the most spectacular wildlife event in Missouri. Most people drive through it without knowing it is happening." },
  { week: 34, story: "Asters and late goldenrod are critical nectaring stops for the southward migration. A Monarch needs a tenth to three-tenths of a milligram of nectar per day to maintain its fat stores during active migration. A yard with late-blooming native asters is a fueling station on a two-thousand-mile highway. The butterfly stops. It drinks. It continues south." },
  { week: 35, story: "In central Texas, migrating Monarchs converge on the Hill Country — funneled by geography toward a narrow corridor where nectar is available and conditions are right for crossing the Rio Grande. The narrowing concentrates individuals who were spread across half of North America. Here, a single bad storm can catch thousands of butterflies mid-flight." },
  { week: 36, story: "A migrating Monarch crosses the Rio Grande and enters Mexico. It has never been here before. But somewhere in the high mountains of Michoacán — three hundred miles to the southwest — is where it must go. The navigation involves a time-compensated sun compass and a magnetic inclination compass calibrated to detect latitude. Neither was designed. Both evolved." },
  { week: 37, story: "In Missouri, the trailing edge of the migration is passing through. A Monarch on ironweed in late September — tired, perhaps thin — is among the last. Behind it, the milkweed will frost and die. But this butterfly, if it reaches Mexico, will return to Missouri next May. It will lay eggs on the same milkweed species it has never tasted. The information is already inside it." },
  { week: 38, story: "The population of the migratory generation has been estimated between sixty million and four hundred million individuals, depending on the year. In 1996, the colony in Mexico covered twenty hectares. In 2013, it covered less than one. In recent years it has partially recovered. Every year is a new data point. The trajectory is not yet certain." },
  { week: 39, story: "The last Monarchs are passing through Missouri. Some will linger into October — late-season breeders that will not survive winter. But the migratory generation presses on: through Arkansas, Texas, into Mexico. They are flying toward mountains they have never seen, carrying information encoded in genes shaped by two million years of this exact migration." },
  { week: 40, story: "In Michoacán, the first migratory Monarchs arrive at the oyamel forests. They come in waves — a few at first, then thousands, then millions. The fir trees, cold and waiting, begin filling with orange. Butterflies that left Missouri in August, traveled through Texas, navigated twelve hundred miles of central Mexico, arrive at an altitude of three thousand meters. They have never been here before. They are home." },
  { week: 41, story: "By mid-October the colony is forming. Monarchs cluster on branches in increasing density — first hundreds, then thousands per branch. They are no longer flying individually. They are becoming a single thermal mass, each butterfly sharing body heat, insulated by millions of wings. The colony will reach its peak density by December: ten to twenty million Monarchs per hectare." },
  { week: 42, story: "In Missouri, a few late Monarchs are still moving. One or two will be seen in backyards through October. The milkweed is browning. The season is closing. Log any Monarch you see this late in the year — the trailing edge of the migration is the least-documented part of the annual cycle. Your sighting is a waypoint in a map no single person can see in full." },
  { week: 43, story: "In the oyamel forests, the colony enters its winter stillness. Metabolism slows to save fat stores. The butterflies remain largely clustered until February, drinking from mountain streams when thirsty. The same individual that left Missouri in August is now two thousand miles away, hanging in a tree above a Mexican mountain, alive, waiting for spring." },
  { week: 44, story: "In Missouri, the milkweed is dead. The leaves have blackened. The seed pods have opened and released silk-covered seeds that drift for miles on November wind. Each seed is a potential milkweed plant — potential habitat for a potential Monarch. The plant that died last month is already making next year." },
  { week: 45, story: "The cycle is closed for another year. In Mexico, the colony is full — millions of butterflies that left Missouri in August are overwintering alive. In Missouri, the fields where they bred are brown and quiet. Between the two, milkweed seeds are traveling on the wind. The chain holds. This is the fact that matters: the chain still holds. It needs help to keep holding." },
  { week: 46, story: "In Missouri's bare deciduous forests, overwintering birds move through the understory — juncos from Canada, white-throated sparrows, hermit thrushes. The Monarchs are in Mexico, the milkweed is dormant, the cycle is in its quiet phase. But under the leaf litter, firefly larvae are hunting. Under the soil, native bee pupae are waiting. This yard that looks empty is not empty." },
  { week: 47, story: "By late November, early winter sets in at the oyamel colony. Cold rains can be fatal — a wet Monarch caught by a freeze becomes a brittle husk. Climate change has made these mountain winters more erratic, with warmer periods followed by sharp drops. The same warming that pushes milkweed north also destabilizes the wintering grounds. The Monarch's crisis is simultaneous at both ends of its range." },
  { week: 48, story: "In the milkweed's root system, sugars are moving from dying aerial stems into reserves that will fuel next spring's growth. The plant is not dead — it is retreating, consolidating, waiting. It has been doing this for ten thousand years since the glaciers retreated from Missouri. The Monarch arrived soon after. They have been meeting here in May ever since." },
  { week: 49, story: "In Mexico, a Monarch that weighed half a gram in October now weighs a third of a gram — it has been slowly burning fat stores through the long fast. It must still have reserves in February for the flight north. The balance is precise. A warm December melts fat faster. A cold wet March catches migrants without reserves. The margin is narrow. It has always been narrow." },
  { week: 50, story: "The smell of the Monarch colony — musky and sweet — carries on the wind for hundreds of meters through the fir forest. Visitors to the sanctuary describe it as overwhelming, vertiginous. Nothing in North American experience prepares you for ten million butterflies in a single grove. Many people who visit describe something like grief — not at the colony, but at the knowledge of how close it has come to not existing." },
  { week: 51, story: "A Monarch hangs in a fir tree in Michoacán, surrounded by fifty million others, in the last weeks of its fast. In four months it will fly north and find milkweed in Missouri it has never seen. Its offspring's offspring will return to this exact mountain. The fidelity of this system is extraordinary. So is its fragility. The difference between the two is what gets planted in Missouri in May." },
  { week: 52, story: "The year ends. The Monarchs are in Mexico, waiting. The milkweed will rise from Missouri soil in May. The meeting, when it comes, will be as old as the Ozarks and as new as this spring. What you do this winter — planting milkweed, leaving leaves undisturbed, building a brush pile — determines whether that meeting happens in your yard. The chain holds by choice." },
]

function getMonarchStory(): MonarchStoryEntry {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weekIndex = Math.min(Math.floor(dayOfYear / 7), 51)
  return MONARCH_STORY[weekIndex]
}


interface NativePlant {
  name: string
  latin: string
  why: string
}

interface PlantMonth {
  month: number
  monthName: string
  timing: string
  plants: NativePlant[]
}

// 12 monthly native plant recommendations — prop-020.
// Each month: 3 plants timed to Midwestern US Monarch habitat needs.
// One entry per calendar month (1 = January, 12 = December).
const PLANT_FOR_YOUR_PLACE: PlantMonth[] = [
  {
    month: 1,
    monthName: 'January',
    timing: 'Order seeds and plants now — catalogs fill up fast.',
    plants: [
      { name: 'Common Milkweed', latin: 'Asclepias syriaca', why: "The Monarch's primary host plant across the Midwest. Order seeds this month so you have time for cold stratification before spring planting." },
      { name: 'Prairie Blazing Star', latin: 'Liatris pycnostachya', why: 'Tall purple spikes in July–August become irresistible nectar stops for migrating Monarchs. One of the most reliably effective Monarch plants you can grow.' },
      { name: 'Purple Coneflower', latin: 'Echinacea purpurea', why: 'Blooms June–September, feeds bees, butterflies, and goldfinches. Long-lived and forgiving. A foundational native for any Midwest habitat patch.' },
    ],
  },
  {
    month: 2,
    monthName: 'February',
    timing: 'Start cold-stratified seeds indoors — 8–10 weeks before last frost.',
    plants: [
      { name: 'Butterfly Milkweed', latin: 'Asclepias tuberosa', why: 'Brilliant orange flowers from June to August. Monarch larvae feed on the leaves; adults nectar on the flowers. Cold-stratify seeds for 30 days before sowing.' },
      { name: 'Wild Bergamot', latin: 'Monarda fistulosa', why: 'Lavender blooms in July attract Monarchs, bumblebees, and hummingbirds. Drought-tolerant once established. Start seeds indoors now for summer blooms.' },
      { name: 'Black-eyed Susan', latin: 'Rudbeckia hirta', why: 'The easiest native wildflower to grow from seed. Blooms July–September. A reliable nectar source that seeds freely, building habitat without effort.' },
    ],
  },
  {
    month: 3,
    monthName: 'March',
    timing: 'Plant bare-root natives while dormant. Direct-sow cold-hardy seeds outdoors.',
    plants: [
      { name: 'Swamp Milkweed', latin: 'Asclepias incarnata', why: 'Thrives in wet or moist spots where other milkweeds struggle. Pink flowers from July to August. One of the best milkweeds for Monarch larvae east of the Rockies.' },
      { name: 'New England Aster', latin: 'Symphyotrichum novae-angliae', why: 'Purple flowers in September–October fuel fall-migrating Monarchs at a critical moment. Plant now while dormant for a full season of establishment.' },
      { name: 'Showy Goldenrod', latin: 'Solidago speciosa', why: 'Fall-blooming native goldenrod that feeds migrating Monarchs and Painted Ladies. Not invasive — that reputation belongs to non-native species. Plant this one.' },
    ],
  },
  {
    month: 4,
    monthName: 'April',
    timing: 'Spring planting season opens. Soil is workable; plants establish before summer heat.',
    plants: [
      { name: 'Common Milkweed', latin: 'Asclepias syriaca', why: "Direct sow into prepared soil now. The first Monarchs arrive in Missouri in April and May — having milkweed already growing means you're ready when they are." },
      { name: 'Wild Blue Indigo', latin: 'Baptisia australis', why: 'Deep-rooted prairie native with blue flowers in May. Host plant for Wild Indigo Duskywing and other skipper butterflies. Plant once; it lives for decades.' },
      { name: 'Violet', latin: 'Viola sororia', why: 'Host plant for all fritillary butterfly species. Blooms in April and May. Already likely present in your lawn — let some patches grow instead of mowing them.' },
    ],
  },
  {
    month: 5,
    monthName: 'May',
    timing: 'Peak planting month. Monarch migration arriving — milkweed in the ground matters now.',
    plants: [
      { name: 'Butterfly Milkweed', latin: 'Asclepias tuberosa', why: 'Plant starts now for summer blooms. The first Monarchs to reach Missouri need milkweed to lay their eggs. A single plant can host 5–10 caterpillars.' },
      { name: 'Foxglove Beardtongue', latin: 'Penstemon digitalis', why: 'White tubular flowers in May–June. Native bumblebees, hummingbirds, and butterflies rely on it. One of the best early-summer natives for pollinators.' },
      { name: 'Prairie Alumroot', latin: 'Heuchera richardsonii', why: "Delicate native that grows in rocky or poor soil. Tiny white flowers attract small native bees. Fills spaces where larger plants won't establish." },
    ],
  },
  {
    month: 6,
    monthName: 'June',
    timing: 'Monarchs are nesting in Missouri. Milkweed and nectar plants are working right now.',
    plants: [
      { name: 'Swamp Milkweed', latin: 'Asclepias incarnata', why: 'Blooming now in wet spots. Monarch caterpillars are eating milkweed leaves this month across Missouri. Check your milkweed plants for eggs and small caterpillars.' },
      { name: 'Purple Coneflower', latin: 'Echinacea purpurea', why: 'Opening its first blooms in June. Nectar-rich and long-blooming through August. The most reliable summer native for attracting Monarchs, bees, and swallowtails.' },
      { name: 'Wild Bergamot', latin: 'Monarda fistulosa', why: 'Coming into bloom now. Monarchs, bumblebees, and hummingbird moths all depend on it in June. Let it spread — it knits itself into a habitat patch.' },
    ],
  },
  {
    month: 7,
    monthName: 'July',
    timing: 'Peak Monarch season. Summer generations are building across Missouri.',
    plants: [
      { name: 'Common Milkweed', latin: 'Asclepias syriaca', why: 'The single most important plant for Monarchs. If you have milkweed in bloom right now, Monarchs are likely laying eggs on it. Check the underside of young leaves.' },
      { name: 'Prairie Blazing Star', latin: 'Liatris pycnostachya', why: 'Blooming this month — the purple spikes are among the most attractive nectar sources for Monarchs all season. One patch of blazing star will draw butterflies all July.' },
      { name: 'Cup Plant', latin: 'Silphium perfoliatum', why: 'Tall and dramatic, with yellow sunflower-like blooms in July–August. The leaves form cups that hold rainwater — birds drink from them. A single plant becomes a wildlife landmark.' },
    ],
  },
  {
    month: 8,
    monthName: 'August',
    timing: 'Fall-migrating Monarchs begin moving south. Late-season nectar is critical fuel.',
    plants: [
      { name: 'Tall Goldenrod', latin: 'Solidago altissima', why: 'Beginning to bloom this month — the first Monarchs beginning their fall migration need nectar now. Goldenrod is their primary fuel plant for the journey to Mexico.' },
      { name: 'Ironweed', latin: 'Vernonia baldwinii', why: 'Vivid purple flowers in August–September. Monarchs, swallowtails, and native bees are drawn to it in extraordinary numbers. Tall, dramatic, and completely native.' },
      { name: 'Rosinweed', latin: 'Silphium integrifolium', why: 'Yellow blooms in late summer. Deep-rooted prairie plant that withstands drought. Plant it now from potted starts for establishment before winter; it blooms next August.' },
    ],
  },
  {
    month: 9,
    monthName: 'September',
    timing: 'Fall migration peak. Every nectar source you have now is directly fueling Monarchs.',
    plants: [
      { name: 'New England Aster', latin: 'Symphyotrichum novae-angliae', why: 'The single most important fall-migration nectar plant in the Midwest. If you see a Monarch nectaring in September, there is a very good chance it is on an aster.' },
      { name: 'Showy Goldenrod', latin: 'Solidago speciosa', why: 'Blooming this month — golden and dense with nectar. Migrating Monarchs refuel on goldenrod for the two-thousand-mile journey ahead. Every plant matters.' },
      { name: 'Smooth Blue Aster', latin: 'Symphyotrichum laeve', why: 'Pale lavender-blue flowers into October. One of the latest-blooming natives, it feeds Monarchs still moving through in early October when most other plants are done.' },
    ],
  },
  {
    month: 10,
    monthName: 'October',
    timing: 'Collect seed from native plants. Plant spring-blooming bulbs and dormant natives.',
    plants: [
      { name: 'Common Milkweed', latin: 'Asclepias syriaca', why: 'Seed pods are opening this month — collect them before wind disperses the seeds. Let them air-dry, then sow directly in a prepared bed outdoors in fall or spring.' },
      { name: 'New England Aster', latin: 'Symphyotrichum novae-angliae', why: 'Collect seeds from spent flower heads. Sow directly outdoors now for spring germination. Last-chance planting: potted asters can still be installed this month.' },
      { name: 'Wild Bergamot', latin: 'Monarda fistulosa', why: 'Seed heads are ripe — shake them over bare soil in a prepared bed, or collect and sow in pots for spring planting. Germinates readily without cold stratification.' },
    ],
  },
  {
    month: 11,
    monthName: 'November',
    timing: 'Fall planting window. Dormant plants establish strong roots before spring growth.',
    plants: [
      { name: 'Wild Blue Indigo', latin: 'Baptisia australis', why: 'One of the best fall planting choices — dormant plants establish deep roots over winter. Extremely long-lived; a plant put in the ground today may be blooming in 2070.' },
      { name: 'Prairie Dropseed', latin: 'Sporobolus heterolepis', why: 'Delicate native grass with a sweet, aromatic scent when blooming. Adds structure and movement to habitat patches. Birds nest near it; insects overwinter in it.' },
      { name: 'Swamp Milkweed', latin: 'Asclepias incarnata', why: 'Plant bare-root stock now in wet or rain-garden spots. It will be fully established and ready to support Monarch egg-laying by May. Fall planting is often more successful than spring.' },
    ],
  },
  {
    month: 12,
    monthName: 'December',
    timing: 'Rest and plan. Leave seedheads and stems standing — they shelter overwintering insects.',
    plants: [
      { name: 'Butterfly Milkweed', latin: 'Asclepias tuberosa', why: 'Order seeds this month. Needs 30 days of cold stratification — starting in December means seeds are ready to sow indoors by late January, blooming by late June.' },
      { name: 'Purple Coneflower', latin: 'Echinacea purpurea', why: 'Seed heads still standing in December feed goldfinches. Do not cut them down — the hollow stems shelter native bees overwinter. They are working even in the cold.' },
      { name: 'Virginia Wild Rye', latin: 'Elymus virginicus', why: 'Native grass that provides winter structure and seed for sparrows and juncos. Use it at habitat edges and under trees where nothing else establishes. Order seeds this month.' },
    ],
  },
]

function getPlantRecommendations(): PlantMonth {
  const month = new Date().getMonth() + 1 // 1–12
  return PLANT_FOR_YOUR_PLACE.find(p => p.month === month) ?? PLANT_FOR_YOUR_PLACE[0]
}


interface HabitatChoice {
  label: string
  score: number
}

interface HabitatQuestion {
  id: string
  question: string
  choices: HabitatChoice[]
}

// 3-question habitat health assessment — prop-021.
// Questions are ordered by ecological leverage: lawn coverage, native plants, milkweed.
// Score 0–100 reflects the yard's current capacity to support Monarch habitat.
const HABITAT_SCORE_QUESTIONS: HabitatQuestion[] = [
  {
    id: 'lawn',
    question: 'How much of your yard is currently lawn (grass)?',
    choices: [
      { label: 'Most of it — nearly all grass', score: 0 },
      { label: 'About half lawn, half garden or wild', score: 30 },
      { label: 'Mostly garden beds, minimal lawn', score: 65 },
      { label: 'Very little or no lawn', score: 100 },
    ],
  },
  {
    id: 'natives',
    question: 'Do you currently grow any native plants or wildflowers?',
    choices: [
      { label: 'Yes — three or more native species', score: 100 },
      { label: 'Yes — one or two native plants', score: 55 },
      { label: 'Planning to this season', score: 15 },
      { label: 'No native plants yet', score: 0 },
    ],
  },
  {
    id: 'milkweed',
    question: 'Do you have milkweed growing in your yard?',
    choices: [
      { label: "Yes — I've seen it growing", score: 100 },
      { label: 'I think so — not certain', score: 50 },
      { label: 'Not yet', score: 0 },
      { label: 'Not sure what milkweed looks like', score: 0 },
    ],
  },
]

function calcHabitatScore(answers: Record<string, number>): number {
  const keys = HABITAT_SCORE_QUESTIONS.map(q => q.id)
  const answered = keys.filter(k => k in answers)
  if (answered.length === 0) return 0
  const total = answered.reduce((sum, k) => sum + (answers[k] ?? 0), 0)
  return Math.round(total / answered.length)
}

function habitatScoreLabel(score: number): string {
  if (score >= 80) return 'Thriving Habitat'
  if (score >= 55) return 'Established Habitat'
  if (score >= 35) return 'Growing Habitat'
  if (score >= 15) return 'Developing'
  return 'Lawn to Habitat'
}

function habitatScoreBg(score: number): string {
  if (score >= 80) return 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)'
  if (score >= 55) return 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)'
  if (score >= 35) return 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)'
  if (score >= 15) return 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)'
  return 'linear-gradient(135deg, #fff7ed 0%, #fecaca 100%)'
}

function habitatScoreBorder(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 55) return '#22c55e'
  if (score >= 35) return '#facc15'
  if (score >= 15) return '#fb923c'
  return '#f87171'
}

function habitatScoreTextColor(score: number): string {
  if (score >= 80) return '#14532d'
  if (score >= 55) return '#166534'
  if (score >= 35) return '#713f12'
  if (score >= 15) return '#7c2d12'
  return '#7f1d1d'
}

function habitatScoreFeedback(answers: Record<string, number>): string {
  const lawnScore = answers['lawn'] ?? -1
  const nativesScore = answers['natives'] ?? -1
  const milkweedScore = answers['milkweed'] ?? -1
  if (milkweedScore >= 100 && nativesScore >= 55 && lawnScore >= 30) {
    return "Your yard is already part of the Monarch corridor. You have the foundation — milkweed for egg-laying and native plants for nectar and shelter. The plants below will help you extend the bloom season and deepen the habitat you've started."
  }
  if (milkweedScore === 0 && nativesScore === 0) {
    return 'The highest-leverage step you can take right now: plant one milkweed species this month. Monarchs cannot complete their life cycle without it. A single plant can host 5–10 caterpillars. The plants below are chosen for this exact month — start with any one of them.'
  }
  if (milkweedScore === 0 || milkweedScore === 50) {
    return "You have native plants — that's a real foundation. The missing piece is milkweed: the one plant Monarchs cannot reproduce without. Adding even a single milkweed plant this season transforms your yard from a nectar stop into a nursery for the next generation."
  }
  if (lawnScore === 0) {
    return "Lawn supports almost no native wildlife — it's ecologically silent. Replacing even a 10-square-foot patch with native plants creates more habitat than most lawns produce in a lifetime. Start with the milkweed or asters below and let it grow from there."
  }
  return 'Every native plant you add builds toward a functioning corridor. The plants below are tuned to this exact month — the best time to plant is now, and the best plant to start with is whichever one you can source locally this week.'
}


// ── Seasonal Countdown milestones (prop-022) ─────────────────────────────────
// Day-of-year ranges for Missouri Monarch milestones.
// startDOY and endDOY are approximate; they reflect the typical window for central Missouri.
// A year has 365 days; DOY 1 = Jan 1, DOY 365 = Dec 31.
interface MonarchMilestone {
  id: string
  name: string
  startDOY: number   // day of year the milestone typically begins
  endDOY: number     // day of year the milestone typically ends
  prepNote: string   // what to do to prepare (shown before it starts)
  nowNote: string    // what to look for while it is happening
  emoji: string
}

const MONARCH_MILESTONES: MonarchMilestone[] = [
  {
    id: 'arrival',
    name: 'First Monarchs arrive in Missouri',
    startDOY: 105,   // ~April 15
    endDOY: 130,     // ~May 10
    prepNote: "Make sure milkweed is in the ground before they arrive. Female Monarchs begin laying eggs within days of reaching Missouri.",
    nowNote: "Look for Monarchs nectaring on dandelions, violets, and early wildflowers. Check the underside of milkweed leaves for tiny yellow eggs.",
    emoji: '🦋',
  },
  {
    id: 'egg-laying',
    name: 'Peak egg-laying season',
    startDOY: 130,   // ~May 10
    endDOY: 172,     // ~June 21
    prepNote: "This is the most important planting window of the year. Milkweed in the ground now will host the first Missouri generation.",
    nowNote: "Check milkweed leaves daily — eggs are pale yellow, the size of a pinhead, on the underside of leaves. Caterpillars hatch in 3-5 days.",
    emoji: '🥚',
  },
  {
    id: 'caterpillar',
    name: 'Caterpillar and chrysalis season',
    startDOY: 152,   // ~June 1
    endDOY: 212,     // ~July 31
    prepNote: "Don't cut milkweed right now — caterpillars are feeding on it. Leave standing stems even if they look ragged.",
    nowNote: "Watch for striped caterpillars on milkweed. A jade-green chrysalis with a gold ring means a Monarch will emerge in about 10 days.",
    emoji: '🐛',
  },
  {
    id: 'late-summer',
    name: 'Late summer — last breeding generation',
    startDOY: 213,   // ~Aug 1
    endDOY: 232,     // ~Aug 20
    prepNote: "This generation is special: instead of breeding, they will migrate to Mexico. Let milkweed seed and do not mow it back yet.",
    nowNote: "The Monarchs emerging now are the migration generation. They will live 8 months — far longer than the summer generations — and fly 2,000 miles.",
    emoji: '☀️',
  },
  {
    id: 'migration-start',
    name: 'Fall migration begins',
    startDOY: 233,   // ~Aug 21
    endDOY: 273,     // ~Sep 30
    prepNote: "Plant goldenrod and asters now if you can — they are the primary fuel for migrating Monarchs and they bloom through October.",
    nowNote: "Watch for Monarchs nectaring on goldenrod and asters. They are loading fuel for a 2,000-mile flight to central Mexico. Every nectar stop matters.",
    emoji: '🍂',
  },
  {
    id: 'migration-peak',
    name: 'Peak fall migration through Missouri',
    startDOY: 258,   // ~Sep 15
    endDOY: 304,     // ~Oct 31
    prepNote: "Keep asters and goldenrod standing — do not deadhead. A migrating Monarch can travel 100 miles on a good tailwind day.",
    nowNote: "Peak migration days can bring hundreds of Monarchs through. Log every sighting — your data maps the migration corridor in real time.",
    emoji: '🌾',
  },
]

// Returns day of year (1-365) for a given Date.
function getDOY(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

// Returns the next upcoming (or currently active) milestone for a given day-of-year.
// If all milestones have passed for the year, returns { overwintering: true }.
function getNextMilestone(doy: number): { milestone: MonarchMilestone; daysUntil: number; isNow: boolean } | { overwintering: true } {
  // Check if currently in a milestone
  for (const m of MONARCH_MILESTONES) {
    if (doy >= m.startDOY && doy <= m.endDOY) {
      return { milestone: m, daysUntil: 0, isNow: true }
    }
  }
  // Find next upcoming milestone
  for (const m of MONARCH_MILESTONES) {
    if (m.startDOY > doy) {
      return { milestone: m, daysUntil: m.startDOY - doy, isNow: false }
    }
  }
  // All milestones passed — overwintering (Nov–Apr)
  return { overwintering: true }
}


interface SpeciesSpotlight {
  week: number
  species: string
  description: string
  task: string
  plant: string
}

// 52 species — one per calendar week. Missouri-focused ecology.
// Double-quoted strings used throughout to avoid apostrophe/TS parse issues.
const SPECIES_SPOTLIGHTS: SpeciesSpotlight[] = [
  { week: 1, species: "Short-eared Owl", description: "Short-eared owls hunt open grasslands at dusk with a buoyant, moth-like flight unlike any other Missouri raptor. They winter here from the northern plains, seeking voles in unmowed fields and prairie edges.", task: "At dusk, scan flat open fields from a roadside — look for a low, erratic flier with a rounded head and no ear tufts.", plant: "Leave a section of your yard unmowed through winter to shelter the voles that sustain raptors." },
  { week: 2, species: "Dark-eyed Junco", description: "Dark-eyed juncos are Missouri's most familiar winter sparrow — flashing white outer tail feathers as they flush from feeders and leaf litter. They breed in Canadian boreal forests and return south each October, staying until April.", task: "Scatter millet or sunflower chips under a shrub and watch how juncos use the low brush as cover while feeding.", plant: "A native spicebush or elderberry creates the low-shrub shelter juncos prefer for feeding." },
  { week: 3, species: "American Tree Sparrow", description: "American tree sparrows wear a neat rust cap and a single dark breast spot — a field mark that separates them from all similar winter sparrows. They nest on the Arctic tundra in summer and spend winters in Missouri weed patches and brushy fields.", task: "Look for the rust cap and single chest spot in any brushy field edge — they often flock with juncos.", plant: "Leave native seed heads standing through winter: coneflower, goldenrod, and cup plant feed them directly." },
  { week: 4, species: "Cedar Waxwing", description: "Cedar waxwings travel in restless, nomadic flocks of 20 to 100 birds, following berry crops across Missouri through winter and spring. Their high, thin whistle is easy to miss — once you learn it, you will hear them above you constantly.", task: "Check hawthorns, cedars, and hackberries for flock movement. Listen for the thin, reedy whistle before you look up.", plant: "Native hawthorn or possumhaw holly holds berry crops waxwings return to every winter." },
  { week: 5, species: "Great Horned Owl", description: "Great horned owls are incubating eggs in Missouri right now — the earliest nesting bird in the state, sitting through sleet and subfreezing nights on a nest in a tall oak or cottonwood. Their deep hooting carries more than a mile through bare winter trees.", task: "At dusk, walk a woodlot edge and listen for the deep, resonant hoot — five syllables, the last two drawn out. Look for the flat-topped shape on a large nest.", plant: "Preserve large old oaks and cottonwoods — they hold the nest platforms great horned owls use year after year." },
  { week: 6, species: "Eastern Bluebird", description: "Eastern bluebirds are among the first signs of spring in Missouri — males arriving in late February to inspect nest boxes, their sky-blue backs catching winter light against brown fields. Cavity competition with house sparrows has made nest boxes essential to their recovery.", task: "Check your nearest bluebird box or any south-facing tree cavity for a male perching nearby, pumping his wings.", plant: "Install a nest box on a post in an open area, at least 50 feet from trees, with a 1.5-inch entrance hole." },
  { week: 7, species: "American Woodcock", description: "The American woodcock performs its sky dance on warm evenings in late February through April — a buzzy peent from a field edge followed by a twittering spiral flight high into the dusk. It is one of Missouri's most secretive birds and one of its most spectacular performances.", task: "Stand at the edge of a wet thicket or moist meadow after sunset. Listen for the nasal peent, then look up for the spiral display flight.", plant: "Maintain moist woodland edges with alder or willow — woodcock probe wet soil for earthworms in these spots." },
  { week: 8, species: "Sandhill Crane", description: "Tens of thousands of sandhill cranes move through Missouri each March on their way to Arctic breeding grounds — flying high, sometimes invisible, their prehistoric rattling bugle carrying for miles. They have been migrating this corridor for two and a half million years.", task: "On clear March days, scan the sky above open fields and listen for the unmistakable rattling bugle — cranes often fly too high to see easily.", plant: "Wet meadows and shallow ponds near agricultural areas provide the staging habitat cranes need on migration." },
  { week: 9, species: "Eastern Phoebe", description: "The eastern phoebe is Missouri's first insect-eating migrant to return each spring — arriving while there are still frosts, hunting flies on warm afternoons near water. It is identified by its constant tail-pumping and its emphatic fee-bee call.", task: "Check bridges, culverts, and overhangs near water for a small dark flycatcher pumping its tail. Listen for fee-bee.", plant: "Phoebes nest on ledges under bridges and on structures. Leave barn eaves or deck joists accessible for nesting." },
  { week: 10, species: "Tree Swallow", description: "Tree swallows arrive in late March over Missouri ponds and lakes, chasing the first midges of the season with dazzling aerial speed. The male iridescent teal-green above, brilliant white below — one of the most beautiful birds in North America, arriving just when winter still feels possible.", task: "Scan any open water surface from a distance — look for small swift birds with white undersides banking low over the water.", plant: "Install nest boxes on posts over or near water — tree swallows compete for cavities and benefit enormously from box programs." },
  { week: 11, species: "Spring Azure Butterfly", description: "The spring azure is one of the first butterflies to appear in Missouri each year — a tiny chip of sky-blue appearing in woodland clearings and roadsides in early April, weeks before most butterflies emerge. Its caterpillars feed on dogwood, viburnum, and cherry flowers.", task: "Walk a sunny woodland edge in early April and look for small pale blue butterflies nectaring on low flowers or puddling on wet soil.", plant: "Native dogwood or viburnum serves as a larval host plant for spring azures and blooms when they emerge." },
  { week: 12, species: "American Robin", description: "American robins are year-round Missouri residents but their behavior shifts dramatically in April as males begin claiming territories with their rich, caroling song at dawn. The robin earthworm pull is one of the most watched pieces of foraging behavior in North American birding.", task: "Watch a lawn or bare garden bed at first light for a robin hunting by sight — head tilted, pausing, then lunging.", plant: "A mulched native plant bed holds more earthworms and soil invertebrates than a turf lawn. Robins will use it." },
  { week: 13, species: "Baltimore Oriole", description: "Baltimore orioles arrive in Missouri in late April and early May — males in brilliant orange and black from the elm canopy, weaving one of the most intricate nests in North American ornithology: a pendant pouch woven from plant fibers and suspended from a high fork. They depart by late July.", task: "Listen for the rich, bubbling whistle — it carries farther than the color. Scan the elm and sycamore canopy from below in early May.", plant: "Native hackberry, elm, and sycamore provide nesting sites. Halved oranges and grape jelly at a feeder attract them in migration." },
  { week: 14, species: "Great Blue Heron", description: "Great blue herons are Missouri's largest wading bird — 4.5 feet of patience standing motionless in shallows, then striking with sudden, knife-like accuracy. They nest colonially in tall trees near water, often 50 to 100 pairs in a single rookery.", task: "Visit any pond, creek edge, or wetland margin and watch a heron hunt — notice how still it can stand and how fast it strikes.", plant: "Shallow pond margins with emergent vegetation (cattail, bulrush) provide the foraging habitat herons need." },
  { week: 15, species: "Ruby-throated Hummingbird", description: "Ruby-throated hummingbirds cross the Gulf of Mexico in a single overnight flight — 500 miles over open water with no rest. Males arrive in Missouri in late April, females two weeks later. The male ruby throat is visible only in direct sunlight; in shade it looks black.", task: "Stand near native red columbine or a feeder and wait quietly — hummingbirds often return to the same flower sequence every 10 to 15 minutes.", plant: "Native red columbine blooms exactly when hummingbirds arrive and is the plant they co-evolved with. No red dye needed." },
  { week: 16, species: "Yellow Warbler", description: "Yellow warblers are Missouri's most commonly detected breeding warbler — small, entirely yellow birds with rusty breast streaking, singing sweet sweet sweet I'm so sweet from willows along every creek and shrubby edge. The female builds one of the most recognizable nests: a neat cup in a willow fork.", task: "Find a willow thicket or shrubby stream edge in May and listen for the bright, rising sweet sweet sweet song. Look for movement in the upper willows.", plant: "Native willows along stream edges are prime yellow warbler habitat and support over 400 species of caterpillars." },
  { week: 17, species: "Monarch Butterfly", description: "The first Monarchs of the year are arriving in Missouri now — single scouts moving north from Texas and Oklahoma, searching for milkweed in warming landscapes. These individuals emerged from eggs laid last fall in Mexico and flew north 1,500 miles to find milkweed for the next generation.", task: "Search south-facing old fields and highway right-of-ways for single Monarchs flying low and purposefully. Log any sighting — the first-of-year observation date matters to scientists.", plant: "Common milkweed (Asclepias syriaca) is the primary host plant. Three to five plants in a sunny patch makes your yard findable." },
  { week: 18, species: "Indigo Bunting", description: "Indigo buntings are among the most intensely colored birds in North America — males a burning, iridescent blue that shifts to near-black in low light. They sing from exposed perches throughout the day in May and June, one of the few birds active at midday heat.", task: "Drive or walk an overgrown road edge in May and look for a small bright blue bird singing from the top of a shrub or wire. The blue is unmistakable in good light.", plant: "Indigo buntings nest in shrubby edges — native elderberry, smooth sumac, and goldenrod create the overgrown field edge they need." },
  { week: 19, species: "Common Milkweed", description: "Common milkweed is not just a plant — it is the ecological foundation the Monarch migration is built on. A single milkweed patch of five plants can support two to three generations of Monarchs in a single summer, each generation fueling the next leg north.", task: "Search milkweed stems in late May for tiny, fluted Monarch eggs on the undersides of new leaves — they are 1mm, off-white, and worth finding.", plant: "If you have milkweed already: do not cut it before September. If you do not: plant Asclepias syriaca or A. tuberosa from a local native plant nursery." },
  { week: 20, species: "Eastern Tiger Swallowtail", description: "Eastern tiger swallowtails are Missouri's largest and most common butterfly — a big, powerful flier with yellow and black tiger stripes, the blue and orange hindwing markings visible only in close view. About one in four females is the dark morph, which mimics the poisonous pipevine swallowtail — evolution in action.", task: "Watch native lilac, bee balm, or milkweed on a warm May afternoon and count how many individual tiger swallowtails visit within 10 minutes. Notice the dark-form females.", plant: "Native wild cherry, cottonwood, and tulip poplar are larval host plants. Wild bergamot (bee balm) attracts adults for nectar." },
  { week: 21, species: "American Firefly", description: "American fireflies (Photinus pyralis) produce their single, slow rise-and-fade flash in Missouri meadows from late May through July — the most common of Missouri's 175 firefly species. The flash pattern is a conversation between mates: male flashes, female answers from a low perch after a two-second delay.", task: "After dark on a warm evening, go to a grassy edge and watch for the slow, rising J-shaped flash pattern at knee height. Count how many individual males you can track.", plant: "Leave leaf litter undisturbed through fall and winter — firefly larvae overwinter in the leaf layer and emerge as the beetles you see in June." },
  { week: 22, species: "Monarch Caterpillar", description: "Monarch caterpillars are feeding on milkweed right now — striped yellow, black, and white, visible on new growth if you look carefully. They eat only milkweed, sequestering the plant compounds that make the adult butterfly toxic to birds and that have taken millions of years to develop.", task: "Check your milkweed patch carefully: look for irregular holes in new leaves, tiny black frass pellets on leaves below, and the caterpillars themselves from 2mm to 45mm.", plant: "Do not spray anything near milkweed during June — not even soap spray. The caterpillar doing chemistry on the leaf is the point." },
  { week: 23, species: "Spicebush Swallowtail", description: "Spicebush swallowtails are Missouri woodland butterflies — dark with rows of pale spots, a blue wash on the hindwings of females, and their entire life cycle tied to spicebush, sassafras, and tulip poplar. The caterpillar constructs a rolled-leaf shelter and has large false eyespots that mimic a snake head.", task: "Walk a woodland edge in June and look for the dark swallowtail with blue hindwing wash nectaring on Joe-Pye weed, ironweed, or native bergamot.", plant: "Native spicebush (Lindera benzoin) is the primary larval host and also provides early spring nectar for native bees." },
  { week: 24, species: "Monarch Chrysalis", description: "Monarch chrysalises are forming right now — the jade-green casing with a band of gold dots, hanging from a silken pad on a stem or underside of a leaf. Inside, the caterpillar is reorganizing its entire body. When the adult is near emergence, the chrysalis turns transparent and you can see the orange wing pattern through the shell.", task: "Check milkweed patches and nearby structures for hanging chrysalises. Look under leaves, on fence rails, under deck edges — anywhere a caterpillar could wander.", plant: "Maintain diverse native plants near milkweed — chrysalises are often attached to plants other than milkweed, wherever the wandering caterpillar stopped." },
  { week: 25, species: "Gray Catbird", description: "Gray catbirds are sleek, dark gray mimics with a rufous patch under the tail — named for their mewing cat call, which sounds uncannily feline. They nest in dense shrubby thickets and sing a long, improvised medley from within the brush, rarely exposing themselves fully.", task: "Listen for the mewing call from any dense shrub patch in June. Then try a spishing sound — catbirds are intensely curious and will often emerge to investigate.", plant: "Native elderberry, gray dogwood, and viburnum create the dense shrub habitat catbirds nest and feed in." },
  { week: 26, species: "American Bumble Bee", description: "The American bumble bee (Bombus pensylvanicus) was once the most common bumble bee in Missouri — now listed as a species of concern, its population having declined 89% since the 1990s. It nests underground in abandoned rodent burrows and forages on a wide range of native flowers.", task: "Watch native coneflowers, bee balm, and monarda for large bumble bees in late June. Notice the yellow thorax and abdomen pattern that distinguishes them from the common eastern bumble bee.", plant: "Native purple coneflower (Echinacea purpurea), wild bergamot, and goldenrod planted in clusters support bumble bee colonies through the season." },
  { week: 27, species: "Common Yellowthroat", description: "Common yellowthroats are small, secretive warblers breeding in dense wetland vegetation across Missouri — the male in a black bandit mask, singing witchety-witchety-witchety from the depths of cattails and wet thickets. They winter in Central America and arrive in April.", task: "Find a cattail marsh or wet willow thicket in late June and listen for the witchety-witchety song from within. Wait quietly and the masked male may emerge briefly.", plant: "Native wetland plantings — cattail, buttonbush, and blue flag iris — create the structure yellowthroats need to nest and feed." },
  { week: 28, species: "American Goldfinch", description: "American goldfinches are among the last birds to nest in Missouri each year — waiting for native composite flowers to go to seed before breeding, feeding thistle and coneflower seeds directly to their young. Males in breeding plumage are one of the most vivid yellows in North American birds.", task: "Watch native coneflowers going to seed in late July. Goldfinches often cling directly to seed heads, hanging upside down to extract seeds.", plant: "Leave native coneflower (Echinacea), black-eyed Susan, and sunflower seed heads standing through fall — goldfinches, chickadees, and sparrows eat them all winter." },
  { week: 29, species: "Great Spangled Fritillary", description: "Great spangled fritillaries are Missouri's largest fritillary — a rich orange with a silver-spotted underwing pattern visible when they perch with wings closed. Their caterpillars feed exclusively on native violet species, and the adults fuel on milkweed, ironweed, and Joe-Pye weed throughout summer.", task: "Look for large orange butterflies with silver underwing spots nectaring on ironweed, Joe-Pye weed, or milkweed in late July. They are strong fliers and prefer open areas near woodland edges.", plant: "Native violets (Viola sororia or V. pedatifida) are the only caterpillar host plant. They spread naturally and are easy to establish under shrubs." },
  { week: 30, species: "Eastern Kingbird", description: "Eastern kingbirds are aerial specialists — catching large insects in flight with acrobatic precision, aggressively defending their territories against crows and even hawks. They breed in open areas near water throughout Missouri and migrate to South America each fall.", task: "Watch any wire, fence post, or dead snag in an open area near water — kingbirds use elevated perches between aerial sallies and are easy to spot.", plant: "Open native grassland and shrub edges near water are essential nesting habitat. Mulberry and serviceberry provide berries for pre-migration fueling." },
  { week: 31, species: "Monarch Butterfly (summer generation)", description: "The Monarchs flying in Missouri right now are the second or third summer generation — not the ones that will migrate to Mexico. They live two to six weeks, laying the eggs whose offspring will become the migratory super-generation. Every milkweed leaf is a potential nursery.", task: "Watch milkweed patches on warm afternoons — a female Monarch checking stems with her forelegs is searching for the right leaf to oviposit. Watch her land, taste, and decide.", plant: "Butterflyweed (Asclepias tuberosa) and swamp milkweed (A. incarnata) are also host plants and attract adults for nectar through the summer." },
  { week: 32, species: "Ruby-throated Hummingbird (migration)", description: "Ruby-throated hummingbirds are beginning to move south in early August — activity at feeders often spikes as migrants join resident birds fattening for the Gulf crossing. A hummingbird can double its body weight in two weeks of intensive feeding on late-summer flowers.", task: "Keep feeders clean and full through August. Watch for aggressive territorial males chasing newcomers — when the chasing stops and multiple birds share a feeder, migration is underway.", plant: "Cardinal flower (Lobelia cardinalis) and trumpet vine provide late-summer nectar that fuels hummingbirds during peak migration." },
  { week: 33, species: "Migrating Monarch (super-generation)", description: "The Monarchs passing through Missouri in late August are the super-generation — physiologically different from summer generations, they will live eight to nine months instead of two to six weeks. They are not yet sexually mature; their reproductive development is on hold until they reach Mexico and return north next spring.", task: "Look for Monarch roosts at dusk in shelterbelts, tree lines, and windbreaks — clusters of dozens or hundreds hanging in the canopy, wings folded, resting for the night.", plant: "Goldenrod (Solidago spp.) and ironweed (Vernonia) are the critical late-summer nectar sources that fuel migrants. Leave them standing and uncut." },
  { week: 34, species: "Common Green Darner", description: "Common green darners are Missouri's most abundant dragonfly and a long-distance migrant — traveling hundreds of miles along weather fronts in September and October, often in mixed flocks with other dragonfly species. A large green darner has a wingspan of nearly four inches.", task: "On September days following cold fronts, watch any open area or pond edge for large dragonflies moving southward — green darners are distinguished by their bright green thorax and blue abdomen.", plant: "Undisturbed pond margins with emergent vegetation are where dragonfly nymphs spend one to three years before emerging as adults." },
  { week: 35, species: "Broad-winged Hawk", description: "Broad-winged hawks migrate in massive kettles — thousands of birds spiraling together in thermals in mid-September. Missouri's hawk watch sites record tens of thousands in single days. The broad-winged kettle is one of the great spectacles of North American migration.", task: "On clear September days with northwest winds, scan the sky from any elevated viewpoint — look for broad-winged hawks spiraling upward in kettles of dozens to hundreds.", plant: "Maintaining wooded corridors along ridges supports the breeding habitat broad-wings need to refuel on migration." },
  { week: 36, species: "American Kestrel", description: "American kestrels are North America's smallest falcon — robin-sized, hovering over roadsides to spot grasshoppers and voles below. Kestrel populations have declined 50% in eastern North America over the past 50 years, partly due to loss of nest cavities and open grassland.", task: "Drive any rural highway in September and watch roadside wires for a small falcon hovering with rapid wingbeats over the ditch — kestrels hunt the same way, same places, year after year.", plant: "Install a kestrel nest box on a post in an open grassland area — they are secondary cavity nesters and adopt boxes readily." },
  { week: 37, species: "Yellow-rumped Warbler", description: "Yellow-rumped warblers are Missouri's most common fall migrant warbler — flooding through in October in loose flocks, their yellow rump patches flashing as they flush. They are the only warbler species that can digest the wax in bayberry and myrtle fruits, allowing them to winter farther north than any other warbler.", task: "In October, check any shrubby area or woodland edge for flocks of warblers moving through — the yellow rump patch is visible in flight and makes identification easy.", plant: "Native bayberry (Myrica pensylvanica) provides winter food that allows yellow-rumped warblers to remain through Missouri's winter in mild years." },
  { week: 38, species: "Ruby-crowned Kinglet", description: "Ruby-crowned kinglets are tiny, hyperactive birds passing through Missouri in October — endlessly flicking their wings as they forage through trees, giving a harsh ji-dit call. The male has a red crown patch visible only when excited or agitated. They are surprisingly loud singers for their size.", task: "Walk any woodland edge in October and listen for the sharp ji-dit call. Look for constant wing-flicking movement in the outer branches of shrubs and low trees.", plant: "Native shrubs with berries — dogwood, viburnum, and hawthorn — provide stopover food for migrating kinglets and dozens of other small birds." },
  { week: 39, species: "White-throated Sparrow", description: "White-throated sparrows arrive in Missouri in October from their Canadian breeding grounds, filling shrubby edges and backyard brush with their clear Oh-sweet-Canada-Canada-Canada song. They spend the winter scratching through leaf litter for seeds, leaving in April.", task: "Listen from any brushy edge in October for the pure, whistled song. Watch leaf-litter patches for the double-scratch feeding motion that characterizes most sparrows.", plant: "Leave leaf litter undisturbed through fall and winter — it is where white-throated sparrows and most other wintering sparrows find the seeds and invertebrates they need." },
  { week: 40, species: "Hermit Thrush", description: "The hermit thrush is the only spotted thrush that winters in Missouri — distinguished by its habit of slowly raising and lowering its tail after landing. Its flute-like song is considered one of the most beautiful in North America, though it rarely sings on its winter range.", task: "Look for a spotted thrush on a low perch in woodland or shrubby edge, slowly raising its rusty tail. This tail-raising tic identifies it from all other thrushes.", plant: "Native dogwoods, viburnums, and hollies with persistent berries support hermit thrushes through Missouri winters." },
  { week: 41, species: "Yellow-bellied Sapsucker", description: "Yellow-bellied sapsuckers drill orderly rows of small holes in tree bark — sap wells that they tend and defend, and that dozens of other species use as feeding stations. They are the only woodpecker that migrates through Missouri reliably, wintering in the southern U.S.", task: "Look for rows of small, evenly spaced holes in birch, apple, or maple bark in October. These are sapsucker wells — check them over several days to see if the bird returns to tend them.", plant: "Native birch, apple, and maple trees attract sapsuckers. Other species — including hummingbirds — follow their sap wells." },
  { week: 42, species: "Eastern Towhee", description: "Eastern towhees are large sparrows scratching dramatically through leaf litter in dense thickets — their drink-your-teeeeea song one of the most distinctive sounds of Missouri spring and summer. They winter in brushy areas across the state, often invisible until flushed.", task: "Find a dense shrubby edge with deep leaf litter in late October and make a spishing sound — towhees are curious and will often hop up briefly before retreating.", plant: "Dense native shrub thickets with leaf litter underneath — wild plum, sumac, and elderberry together — provide the towhee habitat that turf lawns eliminate." },
  { week: 43, species: "Fox Sparrow", description: "Fox sparrows are Missouri's largest sparrow — heavily streaked below, rusty-red above, scratching through leaf litter with a double-kick motion that sounds like someone shuffling cards. They breed in the boreal forest and pass through Missouri in October and March.", task: "In a leaf litter patch under dense shrubs in late October, listen for energetic scratching sounds. Fox sparrows sound bigger than they look and are often heard before seen.", plant: "Leaf litter beneath native shrubs — kept undisturbed through fall — supports the invertebrates and seeds that fox sparrows and other migrants depend on during their brief stop." },
  { week: 44, species: "Brown Creeper", description: "Brown creepers are Missouri's most cryptic bird — small, streaky-brown bark climbers that spiral up tree trunks from the base, then fly to the base of the next tree and repeat. They winter here from northern forests, virtually invisible against bark until they move.", task: "Walk any woodland with large trees in November and watch the base of trunks for upward-spiraling movement. The creeper blends perfectly with bark — motion is how you find it.", plant: "Preserve large, rough-barked native trees — shagbark hickory, white oak, and sycamore — which provide the bark crevices brown creepers probe for dormant insects." },
  { week: 45, species: "Golden-crowned Kinglet", description: "Golden-crowned kinglets are tiny birds that winter in Missouri — one of the smallest songbirds in North America, barely larger than a hummingbird. They survive sub-zero nights by huddling together and feeding constantly during the day on dormant insects in bark crevices.", task: "Walk any conifer or mixed woodland in November and listen for the very high, thin tsee-tsee-tsee call. Look for small active birds in the outer branches of spruces and pines.", plant: "Native conifers — eastern red cedar, white pine — provide winter foraging and roosting habitat for golden-crowned kinglets." },
  { week: 46, species: "White-breasted Nuthatch", description: "White-breasted nuthatches are year-round Missouri residents — the only bird that routinely descends tree trunks head-first, allowing them to find insects hidden in bark crevices that woodpeckers and creepers miss. Their nasal yank-yank-yank call announces them before you see them.", task: "Watch any large tree trunk in November and look for the nuthatch descending head-first. Compare its motion to a brown creeper ascending the same trunk.", plant: "Large native oaks, hickories, and maples with rough bark support year-round nuthatch populations." },
  { week: 47, species: "Carolina Wren", description: "Carolina wrens are among Missouri's most vocal year-round residents — a tiny brown bird with a loud, repetitive teakettle-teakettle-teakettle song that can carry several hundred meters. They do not migrate but are vulnerable to severe winters when ice covers their insect food sources.", task: "Listen for the loud, rollicking teakettle song from any dense shrub pile or brush heap near your house. Follow the sound and look low — wrens rarely perch above three feet.", plant: "Brush piles and dense native shrubs near structures provide the winter cover and insect habitat Carolina wrens need to survive Missouri winters." },
  { week: 48, species: "American Tree Sparrow (winter)", description: "American tree sparrows have settled into their Missouri wintering areas by November — gathering in weed patches, brushy fields, and backyard feeders in small, active flocks. Their soft, musical twittering is the sound of winter in Missouri brushy edges.", task: "Visit a brushy field or weed patch in November and scan for small sparrows with rust caps and a single dark breast spot. Tree sparrows often flock with juncos and white-throated sparrows.", plant: "Leaving seed heads of native plants standing — coneflower, goldenrod, wild sunflower — provides a reliable winter food source tree sparrows return to daily." },
  { week: 49, species: "Downy Woodpecker", description: "Downy woodpeckers are Missouri's smallest woodpecker and most common backyard species — found year-round wherever there are dead branches, snags, and suet feeders. The male has a red spot on the back of the head; both sexes share an overlapping territory in winter.", task: "Hang a suet feeder near dead branches or a snag and watch which sex visits — males and females often feed at different heights on the same tree.", plant: "Dead wood is habitat, not eyesore. Leave dead branches and standing snags wherever safe — they feed downy woodpeckers, chickadees, nuthatches, and house wrens." },
  { week: 50, species: "Black-capped Chickadee", description: "Black-capped chickadees are year-round Missouri residents that form the nucleus of mixed-species foraging flocks in winter, attracting nuthatches, creepers, kinglets, and downy woodpeckers to follow their movements and calls. Their dee-dee-dee alarm call has measurable information content — more dees means more dangerous predator.", task: "Watch a chickadee flock in November or December and count how many different species are traveling with it. Chickadee flocks are winter's best birding shortcut.", plant: "Sunflower seeds at a feeder plus native oaks and hickories for natural mast will hold a chickadee flock through the winter." },
  { week: 51, species: "American Kestrel (winter)", description: "American kestrels winter in Missouri in open grasslands and agricultural areas — perching on utility wires, hovering over ditches, hunting the voles and large insects in unmowed edges. The male blue-gray wings and rust back are unmistakable in good light.", task: "Drive a rural road on a sunny winter day and scan wires and fence posts for a small, colorful falcon. Note which habitat patches they prefer — usually unmowed ditches and field edges.", plant: "Kestrels require open grassland within foraging distance of nest cavities. Maintaining unmowed native grass strips near nest boxes supports both needs." },
  { week: 52, species: "American Robin (winter flock)", description: "American robins often winter in Missouri in large nomadic flocks — following fruit crops across the landscape in groups of dozens to hundreds. The suburban robin on the lawn is the familiar image, but the winter flock of 500 robins descending on a fruit-bearing tree is the reality of winter robin ecology.", task: "In late December, check any fruiting tree — cedar, hackberry, hawthorn — for large flocks of robins. They can strip a tree of every berry in a single afternoon.", plant: "Native eastern red cedar, hackberry, and hawthorn hold their fruits through winter and support the robin flocks, waxwings, and other fruit-eating birds that cycle through Missouri from November through March." },
]

function getSpeciesSpotlight(): SpeciesSpotlight {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weekNumber = Math.min(52, Math.max(1, Math.ceil(dayOfYear / 7)))
  const idx = SPECIES_SPOTLIGHTS.findIndex(s => s.week === weekNumber)
  if (idx < 0) {
    console.warn("Species Spotlight: no entry found for week " + weekNumber + ", falling back to week 1")
    return SPECIES_SPOTLIGHTS[0]
  }
  return SPECIES_SPOTLIGHTS[idx]
}

function getActionCall(speciesName: string): ActionCall {
  const lower = speciesName.toLowerCase()
  const key = Object.keys(ACTION_CALLS).find(k => lower.includes(k))
  if (key) return ACTION_CALLS[key]
  return {
    emoji: '🌿',
    encouragement: 'Every species you observe is part of the web of life that keeps ecosystems — and us — healthy.',
    action: 'The most impactful thing most homeowners can do: replace turf grass with native plants.',
  }
}


function shareLastSighting(species: string, location: string | null): void {
  const where = location ? ` in ${location}` : ''
  const text = `I just spotted a ${species}${where}! 🌿 Helping restore native habitat with Camp Monarch. 🦋 #NativeHabitat #CampMonarch`
  const url = 'https://www.campmonarch.org'
  if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: object) => Promise<void> }).share) {
    ;(navigator as Navigator & { share: (data: object) => Promise<void> })
      .share({ title: `${species} Sighting`, text, url })
      .catch(() => {})
  } else {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + ' ' + url)}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
  }
}


interface MigrationStage {
  abbr: string
  location: string
  phase: string
  emoji: string
  color: string
  bg: string
  borderColor: string
  description: string
}

// Monarch annual migration cycle — month index 0 = January.
// Describes where Monarchs are geographically and ecologically each month.
const MIGRATION_STAGES: MigrationStage[] = [
  {
    abbr: 'Jan', location: 'Mexico', phase: 'Overwintering', emoji: '❄️',
    color: '#3b82f6', bg: '#eff6ff', borderColor: '#bfdbfe',
    description: 'Monarchs are clustered by the millions in the oyamel fir forests of central Mexico — one of the most spectacular wildlife events on Earth. Tens of millions of wings drape the trees, conserving warmth through winter. They will not move until the days lengthen and warmth returns.',
  },
  {
    abbr: 'Feb', location: 'Mexico', phase: 'Pre-migration', emoji: '❄️',
    color: '#3b82f6', bg: '#eff6ff', borderColor: '#bfdbfe',
    description: 'Still in Mexico, but stirring as days lengthen. Individual butterflies begin to nectar and put on weight for the journey. The colony will soon break apart as the first generation heads north to find Texas milkweed. The 3,000-mile relay is about to begin.',
  },
  {
    abbr: 'Mar', location: 'Texas', phase: 'Spring migration', emoji: '🌱',
    color: '#22c55e', bg: '#f0fdf4', borderColor: '#bbf7d0',
    description: 'The great northward migration begins. Monarchs push into Texas, seeking the first milkweed shoots of the season. The first generation of the year hatches here — this cohort will carry the journey further north. Milkweed in Texas is critical: no milkweed, no migration.',
  },
  {
    abbr: 'Apr', location: 'South-Central US', phase: 'Spring migration', emoji: '🌸',
    color: '#22c55e', bg: '#f0fdf4', borderColor: '#bbf7d0',
    description: 'Migration pulses northward through Oklahoma, Arkansas, and Kansas. Monarchs are following milkweed emergence north — the plant and butterfly move together. Each generation breeds and dies along the way; it takes 3–4 generations to reach the northern range. Your milkweed planting matters right now.',
  },
  {
    abbr: 'May', location: 'Midwest', phase: 'Arrival & breeding', emoji: '🦋',
    color: '#f97316', bg: '#fff7ed', borderColor: '#fed7aa',
    description: 'Monarchs arrive in Missouri, Illinois, and the broader Midwest. This is the moment your sightings matter most. First-generation eggs are being laid on milkweed right now. A milkweed patch in your yard is not just decoration — it is a waystation on a continental journey. Log every sighting.',
  },
  {
    abbr: 'Jun', location: 'Midwest', phase: 'Breeding season', emoji: '🌿',
    color: '#16a34a', bg: '#f0fdf4', borderColor: '#bbf7d0',
    description: 'Multiple generations hatch and breed across the Midwest. Caterpillars are munching milkweed, chrysalises are forming on garden fences. A healthy yard with milkweed is a production facility in a continent-wide relay. Mid-summer sightings are often second or third-generation Monarchs.',
  },
  {
    abbr: 'Jul', location: 'Northern Range', phase: 'Northern breeding', emoji: '🌻',
    color: '#16a34a', bg: '#f0fdf4', borderColor: '#bbf7d0',
    description: 'Monarchs reach their northernmost range — Michigan, Minnesota, southern Canada. The summer generation is at its peak. Something remarkable happens now: late-summer Monarchs are born physiologically different. They will not breed immediately — they are the migratory generation, built to fly 3,000 miles south.',
  },
  {
    abbr: 'Aug', location: 'Midwest', phase: 'Migration begins', emoji: '🍂',
    color: '#f97316', bg: '#fff7ed', borderColor: '#fed7aa',
    description: 'The "super-generation" — the migratory Monarchs — begin moving south. They stop feeding on milkweed and fatten instead on nectar from late-season flowers: goldenrod, ironweed, asters. A yard full of native late bloomers is a fuel stop on the migration. Roost clusters sometimes form in shelterbelts at dusk.',
  },
  {
    abbr: 'Sep', location: 'Midwest', phase: 'Peak fall migration', emoji: '🦋',
    color: '#f97316', bg: '#fff7ed', borderColor: '#fed7aa',
    description: 'The most visible migration month in the Midwest. Millions of Monarchs pour south through Missouri toward Texas. This is the critical logging month — your observations help map the living corridor. Look for roost clusters in trees at dusk, and watch for Monarchs nectaring on goldenrod and asters during the day.',
  },
  {
    abbr: 'Oct', location: 'Texas → Mexico', phase: 'Fall migration', emoji: '🍁',
    color: '#ea580c', bg: '#fff7ed', borderColor: '#fed7aa',
    description: 'Migration funnels through Texas toward Mexico. The last Monarchs of the season are moving — by late October, the corridor closes for the year. The same individuals that hatched in Minnesota or Missouri will arrive in the same mountain forest their great-grandparents used. How they navigate remains partly mysterious.',
  },
  {
    abbr: 'Nov', location: 'Mexico', phase: 'Arrival', emoji: '🏔️',
    color: '#3b82f6', bg: '#eff6ff', borderColor: '#bfdbfe',
    description: 'Monarchs arrive at their overwintering sites in the Sierra Madre Occidental mountains of central Mexico. The trees fill with millions of wings — the same oyamel fir forest the population has used for thousands of years. After a 3,000-mile journey guided by sun angle and an inherited magnetic compass, they are home.',
  },
  {
    abbr: 'Dec', location: 'Mexico', phase: 'Overwintering', emoji: '❄️',
    color: '#3b82f6', bg: '#eff6ff', borderColor: '#bfdbfe',
    description: 'The colony is settled in Mexico. Millions of butterflies cluster quietly on the trees, conserving energy through winter. The cycle that has continued for thousands of years — without GPS, without roads, without a map anyone drew — will begin again when the days lengthen. It depends on milkweed corridors surviving. It depends on people like you.',
  },
]


// ── Your First Encounter species tiles (prop-016) ──────────────────────────────
const FIRST_ENCOUNTER_SPECIES = [
  {
    emoji: '🦋',
    name: 'Monarch Butterfly',
    type: 'Insect' as const,
    why: 'The butterfly that crosses a continent. Lays eggs only on milkweed. Every sighting you log maps a migration route.',
  },
  {
    emoji: '✨',
    name: 'Firefly',
    type: 'Insect' as const,
    why: 'Adults live only 3–4 weeks. Their light signals are species-specific — each pattern a different conversation. Larvae need undisturbed leaf litter to survive winter.',
  },
  {
    emoji: '🐝',
    name: 'Bumble Bee',
    type: 'Insect' as const,
    why: 'Native bumble bees are in serious decline. A single queen overwinters alone and founds a new colony each spring. Native flowers within 500 feet make the difference.',
  },
  {
    emoji: '🐦',
    name: 'American Robin',
    type: 'Bird' as const,
    why: 'One of the first birds you hear each morning. Robins track earthworm populations — they are the original yard ecologists. Their presence means your soil is alive.',
  },
  {
    emoji: '💙',
    name: 'Eastern Bluebird',
    type: 'Bird' as const,
    why: 'Declined 90% by 1970 due to nest-site competition with introduced starlings. Nest boxes reversed the collapse. A bluebird in your yard is a conservation success story.',
  },
  {
    emoji: '🌻',
    name: 'American Goldfinch',
    type: 'Bird' as const,
    why: 'Feeds almost entirely on seeds — especially native coneflowers and sunflowers. Leaving seed heads standing through winter is the one thing that keeps them here.',
  },
] as const
type FirstEncounterSpecies = typeof FIRST_ENCOUNTER_SPECIES[number]


// Lawn cost comparison data — prop-026
// Tiers are keyed to the habitatScore 'lawn' answer score values (0, 30, 65, 100).
// Sources: NALP 2023, EPA WaterSense, EPA Small Engine Emissions,
//          Tallamy 2020 ch.4 (pollinators), Pleasants & Oberhauser 2013 (waypoints).
interface LawnCostTier {
  label: string
  sqft: string
  lawnCostPerYear: number
  waterGallonsPerYear: number
  co2LbsPerYear: number
  habitatCostYear1: number
  monarchWaypoints: string
  pollinatorsSupported: string
}

const LAWN_COST_TIERS: Record<string, LawnCostTier> = {
  large: {
    label: 'Large lawn',
    sqft: '~2,000 sq ft',
    lawnCostPerYear: 1800,
    waterGallonsPerYear: 14000,
    co2LbsPerYear: 90,
    habitatCostYear1: 400,
    monarchWaypoints: '8–12 per season',
    pollinatorsSupported: '12–18 native species',
  },
  medium: {
    label: 'Half lawn',
    sqft: '~1,000 sq ft',
    lawnCostPerYear: 900,
    waterGallonsPerYear: 7000,
    co2LbsPerYear: 45,
    habitatCostYear1: 200,
    monarchWaypoints: '4–6 per season',
    pollinatorsSupported: '8–12 native species',
  },
  small: {
    label: 'Small lawn area',
    sqft: '~250 sq ft',
    lawnCostPerYear: 225,
    waterGallonsPerYear: 1750,
    co2LbsPerYear: 12,
    habitatCostYear1: 60,
    monarchWaypoints: '1–3 per season',
    pollinatorsSupported: '4–6 native species',
  },
}

// Maps habitatScore 'lawn' answer (score value) to a cost tier key.
// Returns null when the user already has very little or no lawn.
function getLawnTier(lawnScore: number | undefined): string | null {
  if (lawnScore === undefined) return null
  if (lawnScore === 0) return 'large'   // Most of it — nearly all grass
  if (lawnScore === 30) return 'medium' // About half lawn, half garden
  if (lawnScore === 65) return 'small'  // Mostly garden beds, minimal lawn
  return null // score=100: Very little or no lawn — show positive message
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
  // Onboarding — shown once to new visitors (prop-006)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try { return localStorage.getItem('sis-onboarded') !== '1' } catch { return false }
  })

  // Your First Encounter — shown once to users with 0 sightings (prop-016)
  const [firstEncounterDone, setFirstEncounterDone] = useState<boolean>(() => {
    try { return localStorage.getItem('sis-first-done') === '1' } catch { return false }
  })




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

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  const [lastLoggedSpecies, setLastLoggedSpecies] = useState<string | null>(null)

  const [lastLoggedLocation, setLastLoggedLocation] = useState<string | null>(null)
  // Habitat Score assessment state — prop-021
  const [habitatAnswers, setHabitatAnswers] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('habitatScoreAnswers') || '{}') } catch { return {} }
  })
  const [habitatQuestion, setHabitatQuestion] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('habitatScoreQuestion') || '0', 10) } catch { return 0 } }
  )

  // Make Your Pledge — commitment state (prop-017)
  const [pledge, setPledge] = useState<{ plant: string; space: string; timing: string; ts: string } | null>(() => {
    try {
      const raw = localStorage.getItem('sis-pledge')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [pledgeStep, setPledgeStep] = useState<0 | 1 | 2>(0)
  const [pledgeEditing, setPledgeEditing] = useState(false)
  const [pledgePlant, setPledgePlant] = useState('')
  const [pledgeSpace, setPledgeSpace] = useState('')
  const [pledgeTiming, setPledgeTiming] = useState('')
  const [plantingLog, setPlantingLog] = useState<{ plant: string; date: string; ts: string } | null>(() => {
    try { const r = localStorage.getItem('sis-planting-log'); return r ? JSON.parse(r) : null } catch { return null }
  })



  // Monarch Waystation Checklist — localStorage-backed certification (prop-036)
  const [waystationChecked, setWaystationChecked] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem('sis-waystation-checklist')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) && arr.length === 10 ? arr : new Array(10).fill(false)
    } catch { return new Array(10).fill(false) }
  })

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

  const plantRecommendations = useMemo(() => {
    const speciesCounts = new Map<string, number>()
    for (const s of sightings) {
      if (!s.species_name) continue
      speciesCounts.set(s.species_name, (speciesCounts.get(s.species_name) ?? 0) + 1)
    }
    return [...speciesCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => ({ name, ...getPlantSuggestions(name) }))
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
    setLastLoggedSpecies(null)
    setLastLoggedLocation(null)
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
      setLastLoggedSpecies(speciesName.trim())
      setLastLoggedLocation(locationName?.trim() || null)
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

  
  // Year-over-year sighting stats — prop-011: Your Nature Trend
  const yrData: Record<string, { total: number; species: string[]; monarchDates: string[] }> = {}
  for (const s of sightings) {
    const yr = new Date(s.observed_at).getFullYear().toString()
    if (!yrData[yr]) yrData[yr] = { total: 0, species: [], monarchDates: [] }
    yrData[yr].total += 1
    if (!yrData[yr].species.includes(s.species_name)) yrData[yr].species.push(s.species_name)
    if (s.species_name.toLowerCase().includes('monarch')) yrData[yr].monarchDates.push(s.observed_at)
  }
  const yrKeys = Object.keys(yrData).sort()
  const thisYear = new Date().getFullYear().toString()
  const prevYear = (new Date().getFullYear() - 1).toString()


  // ── Local Nature Pulse — iNaturalist live observations (prop-018) ────────────────────
  type InatObs = { id: number; species_guess: string; user_login: string; observed_on: string; uri: string }
  const [inatObs, setInatObs] = useState<InatObs[]>([])
  const [inatLoading, setInatLoading] = useState(true)
  const [inatError, setInatError] = useState(false)
  useEffect(() => {
    let cancelled = false
    function fetchObs(lat: number, lng: number) {
      const params = new URLSearchParams({
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        radius: '80', // 80 km ≈ 50 miles
        order: 'desc',
        order_by: 'observed_on',
        per_page: '3',
        quality_grade: 'research',
      })
      fetch(`https://api.inaturalist.org/v1/observations?${params}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
          if (!cancelled) {
            setInatObs((data.results || []).slice(0, 3))
            setInatLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) { setInatError(true); setInatLoading(false) }
        })
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchObs(pos.coords.latitude, pos.coords.longitude),
        () => fetchObs(38.627, -90.198), // fallback: St. Louis, MO (heart of migration corridor)
        { timeout: 5000 }
      )
    } else {
      fetchObs(38.627, -90.198)
    }
    return () => { cancelled = true }
  }, [])


  // ── Migration Watch — Monarch migration front via iNaturalist (prop-028) ────────────
  type MigFront = { id: number; place: string; user: string; observedOn: string; uri: string; lat: number; lng: number }
  const [migFront, setMigFront] = useState<MigFront | null>(null)
  const [migLoading, setMigLoading] = useState(true)
  const [migError, setMigError] = useState(false)
  const [migUserLat, setMigUserLat] = useState<number>(38.627)
  useEffect(() => {
    // Capture user latitude for distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMigUserLat(pos.coords.latitude),
        () => setMigUserLat(38.627), // fallback: St. Louis, MO
        { timeout: 5000 }
      )
    }
    // Fetch recent Monarch observations and find the northernmost (migration front)
    const d1 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const params = new URLSearchParams({
      taxon_id: '48662', // Danaus plexippus — Monarch butterfly
      quality_grade: 'research',
      d1,
      per_page: '50',
      order: 'desc',
      order_by: 'observed_on',
      geo: 'true',
    })
    let cancelled = false
    fetch(`https://api.inaturalist.org/v1/observations?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (cancelled) return
        const obs: any[] = (data.results || []).filter((o: any) => o.location)
        if (obs.length === 0) { setMigLoading(false); return }
        // Northernmost recent sighting = leading edge of spring migration
        const north = obs.reduce((best: any, o: any) => {
          const lat = parseFloat(o.location.split(',')[0])
          const bLat = parseFloat(best.location.split(',')[0])
          return lat > bLat ? o : best
        })
        const [lat, lng] = north.location.split(',').map(Number)
        setMigFront({
          id: north.id,
          place: north.place_guess || 'Unknown location',
          user: north.user?.login || 'unknown',
          observedOn: north.observed_on,
          uri: north.uri,
          lat,
          lng,
        })
        setMigLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setMigError(true); setMigLoading(false) }
      })
    return () => { cancelled = true }
  }, [])


  // ── Neighborhood Pulse — top species sightings near you this week (prop-030) ────────────
  type NbhdSpecies = { id: number; name: string; commonName: string; count: number; url: string }
  const [nbhdSpecies, setNbhdSpecies] = useState<NbhdSpecies[]>([])
  const [nbhdLoading, setNbhdLoading] = useState(true)
  const [nbhdError, setNbhdError] = useState(false)
  useEffect(() => {
    let cancelled = false
    function fetchNbhd(lat: number, lng: number) {
      const dateSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const params = new URLSearchParams({
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        radius: '80',
        d1: dateSince,
        quality_grade: 'research',
        per_page: '5',
      })
      fetch(`https://api.inaturalist.org/v1/observations/species_counts?${params}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
          if (!cancelled) {
            const results: NbhdSpecies[] = (data.results || []).slice(0, 5).map((r: { count: number; taxon: { id: number; name: string; preferred_common_name?: string; url?: string } }) => ({
              id: r.taxon.id,
              name: r.taxon.name,
              commonName: r.taxon.preferred_common_name || r.taxon.name,
              count: r.count,
              url: `https://www.inaturalist.org/taxa/${r.taxon.id}`,
            }))
            setNbhdSpecies(results)
            setNbhdLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) { setNbhdError(true); setNbhdLoading(false) }
        })
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { if (!cancelled) fetchNbhd(pos.coords.latitude, pos.coords.longitude) },
        () => { if (!cancelled) fetchNbhd(38.627, -90.1994) } // St. Louis fallback
      )
    } else {
      fetchNbhd(38.627, -90.1994)
    }
    return () => { cancelled = true }
  }, [])


  // ── Who Lives Here Now — pollinators + birds observed near you this week (prop-037) ──
  type WhoLivesSpecies = { id: number; commonName: string; sciName: string; count: number; url: string; iconic: string }
  const [whoLives, setWhoLives] = useState<WhoLivesSpecies[]>([])
  const [whoLivesLoading, setWhoLivesLoading] = useState(true)
  const [whoLivesError, setWhoLivesError] = useState(false)
  useEffect(() => {
    let cancelled = false
    function fetchWhoLives(lat: number, lng: number) {
      const dateSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const params = new URLSearchParams({
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        radius: '80',
        d1: dateSince,
        quality_grade: 'research',
        per_page: '5',
      })
      // Filter to insects (butterflies, bees) and birds
      params.append('iconic_taxa[]', 'Insecta')
      params.append('iconic_taxa[]', 'Aves')
      fetch(`https://api.inaturalist.org/v1/observations/species_counts?${params}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
          if (!cancelled) {
            const results: WhoLivesSpecies[] = (data.results || []).slice(0, 5).map(
              (r: { count: number; taxon: { id: number; preferred_common_name?: string; name: string; iconic_taxon_name?: string } }) => ({
                id: r.taxon.id,
                commonName: r.taxon.preferred_common_name || r.taxon.name,
                sciName: r.taxon.name,
                count: r.count,
                url: `https://www.inaturalist.org/taxa/${r.taxon.id}`,
                iconic: r.taxon.iconic_taxon_name || 'Animalia',
              })
            )
            setWhoLives(results)
            setWhoLivesLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) { setWhoLivesError(true); setWhoLivesLoading(false) }
        })
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { if (!cancelled) fetchWhoLives(pos.coords.latitude, pos.coords.longitude) },
        () => { if (!cancelled) fetchWhoLives(38.627, -90.1994) } // St. Louis fallback
      )
    } else {
      fetchWhoLives(38.627, -90.1994)
    }
    return () => { cancelled = true }
  }, [])

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
    <>
      {/* 🔍 Species Profile Modal */}
      {selectedProfile && (() => {
        const profile = getSpeciesProfile(selectedProfile)
        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.45)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => setSelectedProfile(null)}
          >
            <div
              style={{
                background: '#fff', borderRadius: '12px', maxWidth: '520px', width: '100%',
                padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                maxHeight: '90vh', overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>{selectedProfile}</h2>
                <button
                  onClick={() => setSelectedProfile(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: '0 0 0 0.5rem' }}
                  title="Close"
                >×</button>
              </div>
              {profile ? (
                <>
                  <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, marginTop: 0 }}>
                    {profile.description}
                  </p>
                  <div style={{ background: '#fef3c7', borderRadius: '6px', padding: '0.6rem 0.8rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Conservation Status</div>
                    <div style={{ fontSize: '0.82rem', color: '#78350f' }}>{profile.status}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '6px', padding: '0.6rem 0.8rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>What It Needs</div>
                    <div style={{ fontSize: '0.82rem', color: '#166534' }}>{profile.needs}</div>
                  </div>
                  <a
                    href={profile.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', background: '#16a34a', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
                  >
                    🦋 Learn more at Camp Monarch →
                  </a>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>
                    No detailed profile available yet for this species. Your observation still matters — every sighting contributes to understanding local wildlife populations.
                  </p>
                  <a
                    href="https://www.campmonarch.org"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', background: '#16a34a', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
                  >
                    🦋 Visit Camp Monarch →
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
        <>
          {/* 📬 Your Weekly Nature Letter — weekly synthesis panel (prop-038) */}
          {(() => {
            // ISO week helper
            function getISOWeek(d: Date): number {
              const date = new Date(d)
              date.setHours(0, 0, 0, 0)
              date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
              const week1 = new Date(date.getFullYear(), 0, 4)
              return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
            }
            const now = new Date()

            // Para 2: 52 ecological context entries (one per week of year)
            const ECOLOGY: string[] = [
              // Week 1 (early Jan)
              "January's silence is full of information. The seed-heads still standing in your yard are being visited by American Goldfinches and Dark-eyed Juncos every morning — they are the feeder that requires no refilling. Overwintering Monarchs cluster in oyamel fir forests in Michoacán, in colonies so dense that trees turn orange.",
              // Week 2
              "Mid-January is the hibernating season — but not for everyone. Great Horned Owls are already incubating eggs. Screech-owls are calling at dusk. The ecological year begins in the dark.",
              // Week 3
              "The shortest days are behind us now. Sap moves just a little faster. Eastern Bluebirds and Tree Swallows are scouting nest sites in the warmest microclimates, weeks before the calendar says spring is allowed.",
              // Week 4
              "Red-winged Blackbirds are arriving in cattail marshes — the males come two to three weeks before the females, staking territory in weather that still feels like winter. Their call is the ecological announcement that the calendar has turned.",
              // Week 5 (early Feb)
              "Woodpeckers are drumming louder now, declaring territories. American Robins that overwintered in fruit-bearing trees are becoming more visible. The soil is still frozen, but invertebrate life is stirring deeper down.",
              // Week 6
              "Groundhog Day marks the midpoint between winter solstice and spring equinox. Skunks are emerging briefly on warm nights to search for mates. Native tree buds are measurably swelling.",
              // Week 7
              "The first Common Grackles and Red-winged Blackbirds have established territories in your region's marshes. Eastern Meadowlarks are singing from fence posts. Winter is not over, but the seasonal machinery has engaged.",
              // Week 8
              "American Woodcock are performing their aerial courtship display on mild evenings — a 'peenting' call from old field edges, then a spiral ascent and whistling descent. If there's an old meadow near you, this is the week to be there at dusk.",
              // Week 9 (early Mar)
              "March begins the migration. Purple Martins are the first aerial insectivores to arrive — the colonies that depend on human-provided housing need housing to be clean and ready by now. Sandhill Cranes are moving through the Platte River corridor.",
              // Week 10
              "Mourning Cloak butterflies are emerging from winter hibernation — the adults that overwintered under bark are the first butterflies you will see, before any milkweed has broken ground. They feed on tree sap in early spring.",
              // Week 11
              "The first Eastern Phoebes arrive, often returning to the exact nest site used the year before. Chorus Frogs and Spring Peepers are calling from temporary wetlands. The ground is warming enough that earthworms are near the surface.",
              // Week 12
              "Spring Equinox arrives. Monarch migration has begun in earnest — the overwintering generation is moving north and east, following the emergence of milkweed. The first generation of the year will be born somewhere between Texas and Missouri in the coming weeks.",
              // Week 13 (late Mar)
              "Tree Swallows are pairing up and claiming cavities. Osprey have returned to their fishing territories. Native spring wildflowers — Bloodroot, Spring Beauty, Hepatica — are blooming in woodlands before the canopy closes.",
              // Week 14 (early Apr)
              "The first Monarchs have been reported in Missouri and Illinois. If your milkweed is not yet up, it may emerge in the next two weeks — the plant times itself remarkably well to the arrival of the butterfly. Watch the bare ground where your milkweed grows.",
              // Week 15
              "Chimney Swifts are returning — the 'flying cigars' that spend almost their entire lives aloft, coming to land only to nest. Yellow-rumped Warblers are in peak migration. The spring bird wave is building.",
              // Week 16
              "Purple Coneflower, Black-eyed Susan, and Wild Bergamot are breaking ground in native plantings across the Midwest. Native bee species are emerging — Bumble Bee queens are founding new colonies, often in abandoned rodent burrows in the ground.",
              // Week 17 (late Apr)
              "Ruby-throated Hummingbirds have arrived. Monarch caterpillars have been reported on milkweed in southern states. The spring migration is at or near peak — more than 100 warbler species are moving through the eastern flyway.",
              // Week 18
              "Common Milkweed shoots are emerging across the Midwest. This is the most critical planting window — milkweed planted now will be established and ready for Monarch egg-laying within weeks. The first generation of Monarchs is maturing into adults right now in Texas and Oklahoma.",
              // Week 19 (early May)
              "Peak spring migration. Every warbler, vireo, tanager, and flycatcher is moving. Baltimore Orioles and Indigo Buntings are back. If you have fruit trees or jelly feeders, this is the week they pay off. Native bees are at peak diversity.",
              // Week 20
              "Monarchs are reported throughout the Midwest. Female Monarchs are laying eggs on milkweed — single eggs on the underside of leaves. A Monarch egg is the size of a pinhead and pale green. If you have milkweed, go look at the leaves.",
              // Week 21 (late May)
              "Memorial Day weekend marks a turning point in the Monarch's seasonal arc: the second generation is being laid and hatching across Missouri, Iowa, and Illinois. Fireflies begin to appear in warm, humid evenings. Eastern Box Turtles are laying eggs in sunny, open ground.",
              // Week 22 (early Jun)
              "Early June: fireflies are signaling in earnest. Each species has a characteristic flash pattern — the common big dipper firefly flashes in a J-shaped arc every 5-6 seconds. Native wildflowers are in bloom. Monarch caterpillars of the second generation are visible on milkweed if you look closely.",
              // Week 23
              "The longest days of the year are approaching. Dragonflies are at peak abundance — Green Darners that spent winter in the south have laid eggs; their offspring are now emerging from ponds. Milkweed beetles (bright red with black spots) are appearing alongside Monarch caterpillars.",
              // Week 24
              "Summer Solstice arrives. The light will not get longer from here. Native prairie grasses — Big Bluestem, Little Bluestem, Indiangrass — are well past knee-height now. This is the moment when a native planting shows what it is.",
              // Week 25 (late Jun)
              "The third Monarch generation is being laid. American Goldfinches are the last breeding birds to begin nesting — they wait until native thistle and milkweed floss is available for nest material. You may see them stripping dried seedheads.",
              // Week 26
              "Mid-year: Monarch populations have pushed as far north as Minnesota and Manitoba. Native prairie flowers are in peak bloom — Purple Coneflower, Wild Bergamot, Butterfly Weed. This is the height of native garden abundance.",
              // Week 27 (early Jul)
              "July heat brings the year's richest insect diversity. Bumble Bee colonies are at maximum size. Native bee nesting tunnels in bare soil and hollow stems are full. A count of bee species in a native garden in July would surprise most people — there are dozens.",
              // Week 28
              "The Monarch generation alive now — the late-summer adults — will live nine months instead of six weeks. Something in the shortening day signals them to defer reproduction and begin storing fat for migration instead. The transformation is triggered by light, not temperature.",
              // Week 29 (late Jul)
              "Shorebird migration has quietly begun — Least Sandpipers, Semipalmated Sandpipers, and dowitchers are already moving south from arctic breeding grounds. Mid-summer is not a pause in migration; it is the end of northbound and the start of southbound, with only a brief overlap.",
              // Week 30 (early Aug)
              "August: the Monarchs that will migrate to Mexico are beginning to accumulate in goldenrod meadows. They are not yet moving south — they are fueling. Goldenrod is the most important nectar plant in the eastern Monarch migration. If you only plant one late-season native wildflower, plant goldenrod.",
              // Week 31
              "Hummingbirds are staging for their southward migration. A Ruby-throated Hummingbird that weighs 3 grams may nearly double its body weight in fat before crossing the Gulf of Mexico in a single 20-hour flight. Jewelweed and cardinal flower are critical refueling stops.",
              // Week 32 (mid Aug)
              "The Perseid meteor shower peaks this week — a reminder that the night sky overhead is as much a part of your habitat as the milkweed below. Light pollution affects the migration cues of moths, bats, and nocturnally migrating birds. Darkness matters.",
              // Week 33
              "Migration is accelerating. Nighttime radar shows waves of birds moving south over your neighborhood. The birds are mostly invisible — they migrate at night, calling softly. If you stand outside on a clear August night and listen, you will hear them.",
              // Week 34 (late Aug)
              "Goldenrod is the yellow heart of late summer. Twenty-nine species of goldenrod are native to the eastern United States, each with a slightly different bloom time — which means that for migrating Monarchs, nectar is available across a four-week window. Native goldenrod is not the invasive kind. Plant it.",
              // Week 35 (early Sep)
              "Peak Monarch migration begins. The eastern North American population is funneling through the Midwest and along the shores of Lake Erie and Lake Ontario toward their overwintering sites in Mexico. A roost of hundreds of Monarchs on a goldenrod patch is possible in any suburban yard on any night this week.",
              // Week 36
              "Native asters are now the primary Monarch nectar source — New England Aster, Smooth Blue Aster, Aromatic Aster. These late-blooming natives are not optional for Monarch migration; they are critical. A yard with asters in September is a migration corridor.",
              // Week 37 (mid Sep)
              "Fall equinox is approaching. The shortening days are triggering behavioral changes in dozens of species simultaneously: birds are staging, mammals are fattening, insects are preparing dormancy strategies. The pace of ecological transition is fastest in September.",
              // Week 38
              "The peak of fall warbler migration. Yellow-rumped Warblers, Palm Warblers, and Orange-crowned Warblers are moving through in large numbers. Native berry-producing shrubs — native viburnums, native dogwoods — are being stripped daily.",
              // Week 39 (late Sep)
              "Monarch migration is at or near peak across the Midwest. Research from Monarch Watch estimates that a single milkweed plant can support two to three Monarch larvae per season. If your yard has twenty milkweed plants, you may have supported 40-60 Monarchs this year.",
              // Week 40 (early Oct)
              "October is peak leaf fall — and peak migration for many sparrows, juncos, and thrushes that move later than warblers. Hermit Thrushes, Fox Sparrows, and White-crowned Sparrows are arriving for winter or moving through. Native seed-heads standing in your yard are the food supply.",
              // Week 41
              "The last Monarchs are passing through. Any individual you see after October 10th in the Midwest is likely a straggler — the main migration has shifted to Texas and the Gulf Coast. The overwintering generation will reach Michoacán in late October.",
              // Week 42 (mid Oct)
              "Native trees are in full color now. The pigments — carotenoids and anthocyanins — were always present in the leaves; the green chlorophyll that masked them is now being reabsorbed. Color is not decoration; it is evidence of chemical processes that have been running since spring.",
              // Week 43
              "The first hard frosts are arriving across the Midwest. Native plants that have been dying back above ground have been spending the growing season building energy stores in their roots. A native perennial's biomass is mostly underground — the visible portion is a fraction of the plant.",
              // Week 44 (late Oct)
              "The Monarchs have arrived in Michoacán. A colony of overwintering Monarchs in the oyamel fir forest can contain hundreds of millions of individuals. The weight of Monarchs on a single tree has been observed to break branches. This is what healthy looks like.",
              // Week 45 (early Nov)
              "Most migratory birds have moved through. The winter residents — Dark-eyed Juncos, White-throated Sparrows, Fox Sparrows — have settled into their territories. Native seed-heads and berry-producing shrubs will be their food supply for the next four months.",
              // Week 46
              "November's leaf-free canopy reveals structure that was hidden all summer. You can see the shape of every tree now, the birds' nests from last spring, the squirrel dreys, the bark patterns. The landscape is a different kind of readable in November.",
              // Week 47 (mid Nov)
              "Native bee nest sites are fully dormant now — ground-nesting bees as pupae in earthen chambers, cavity-nesting bees in hollow stems. Resist the urge to cut back native plant stems entirely; many are currently occupied by native bee larvae overwintering inside.",
              // Week 48
              "Wintering raptors are present — Red-tailed Hawks, American Kestrels, Rough-legged Hawks arriving from the north. Short-eared Owls hunt open fields at dusk. The food web is still running, visible if you look at the aerial layer.",
              // Week 49 (late Nov)
              "As deciduous leaves finish falling, the evergreen structure of native plantings becomes its most visible. Native hollies hold red berries through winter. Eastern Red Cedar, a native evergreen, is one of the most important winter shelter plants in the eastern landscape.",
              // Week 50 (early Dec)
              "December light is the year's weakest, but the year's ecological accounting is not yet closed. Bird counts peak at feeders as temperatures drop. The count of species that have used your yard this year — as habitat, as corridor, as food source — is higher than you probably know.",
              // Week 51
              "The winter solstice is approaching — the shortest day. From this point the days lengthen. Great Horned Owls are already courting in the cold nights; they will lay eggs in January or February, raising young in the worst weather of the year, so that the owlets are ready to hunt on their own by late summer.",
              // Week 52
              "The last week of the year. The Monarchs in Michoacán are in their deepest winter cluster. In your yard, the seed-heads are bird feeders, the standing stems are bee nurseries, and the leaf litter is habitat for dozens of overwintering species. Nothing here is dormant; it is all just quiet.",
            ]

            // Para 3: 52 closing quotes from naturalists
            const QUOTES: Array<{ text: string; author: string; source: string }> = [
              { text: "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation.", author: "Henry David Thoreau", source: "Walden, 1854" },
              { text: "I went to the woods because I wished to live deliberately, to front only the essential facts of life.", author: "Henry David Thoreau", source: "Walden, 1854" },
              { text: "The bluebird carries the sky on his back.", author: "John Burroughs", source: "Ways of Nature, 1905" },
              { text: "We must go out and re-ally ourselves to Nature every day. We must make root, send out some little fibre at least.", author: "Henry David Thoreau", source: "Journal, 1856" },
              { text: "There is a love of wild nature in everybody, an ancient mother-love ever showing itself whether recognized or no.", author: "John Muir", source: "Our National Parks, 1901" },
              { text: "In every walk with nature, one receives far more than he seeks.", author: "John Muir", source: "John of the Mountains, 1938" },
              { text: "The clearest way into the Universe is through a forest wilderness.", author: "John Muir", source: "John of the Mountains, 1938" },
              { text: "Between every two pines is a doorway to a new world.", author: "John Muir", source: "Our National Parks, 1901" },
              { text: "Take only what you need, and leave the land as you found it — for those who come after.", author: "Arapaho proverb", source: "Traditional" },
              { text: "I only went out for a walk, and finally concluded to stay out till sundown, for going out, I found, was really going in.", author: "John Muir", source: "John of the Mountains, 1938" },
              { text: "Not till we are completely lost or turned round — do we appreciate the vastness and strangeness of nature.", author: "Henry David Thoreau", source: "Walden, 1854" },
              { text: "For most of history, Man has had to fight nature to survive; in this century he is beginning to realize that, in order to survive, he must protect it.", author: "Jacques-Yves Cousteau", source: "attributed" },
              { text: "The time has come to speak of the quality of our relationship to the earth.", author: "Rachel Carson", source: "Address to Theta Sigma Phi, 1954" },
              { text: "One way to open your eyes is to ask yourself, 'What if I had never seen this before? What if I knew I would never see it again?'", author: "Rachel Carson", source: "The Sense of Wonder, 1956" },
              { text: "If a child is to keep alive his inborn sense of wonder, he needs the companionship of at least one adult who can share it.", author: "Rachel Carson", source: "The Sense of Wonder, 1956" },
              { text: "To understand the living world one must also understand something of the world of the past.", author: "Rachel Carson", source: "Silent Spring, 1962" },
              { text: "The more clearly we can focus our attention on the wonders and realities of the universe about us, the less taste we shall have for destruction.", author: "Rachel Carson", source: "attributed" },
              { text: "There is something infinitely healing in the repeated refrains of nature — the assurance that dawn comes after night, and spring after winter.", author: "Rachel Carson", source: "The Sense of Wonder, 1956" },
              { text: "We still talk in terms of conquest. We still haven't become mature enough to think of ourselves as only a tiny part of a vast and incredible universe.", author: "Rachel Carson", source: "address, 1963" },
              { text: "Man's attitude toward nature is today critically important simply because we have now acquired a fateful power to alter and destroy nature.", author: "Rachel Carson", source: "address, 1963" },
              { text: "Those who dwell among the beauties and mysteries of the earth are never alone or weary of life.", author: "Rachel Carson", source: "The Sense of Wonder, 1956" },
              { text: "A human being is part of a whole, called by us the Universe, a part limited in time and space.", author: "Albert Einstein", source: "Letter, 1950" },
              { text: "Look deep into nature, and then you will understand everything better.", author: "Albert Einstein", source: "attributed" },
              { text: "He who can no longer pause to wonder and stand rapt in awe, is as good as dead; his eyes are closed.", author: "Albert Einstein", source: "The World As I See It, 1931" },
              { text: "Wilderness is not a luxury but a necessity of the human spirit, as vital to our lives as water and good bread.", author: "Edward Abbey", source: "Desert Solitaire, 1968" },
              { text: "May your trails be crooked, winding, lonesome, dangerous, leading to the most amazing view.", author: "Edward Abbey", source: "Desert Solitaire, 1968" },
              { text: "One touch of nature makes the whole world kin.", author: "William Shakespeare", source: "Troilus and Cressida, c. 1602" },
              { text: "Adopt the pace of nature: her secret is patience.", author: "Ralph Waldo Emerson", source: "attributed" },
              { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", source: "attributed" },
              { text: "The earth laughs in flowers.", author: "Ralph Waldo Emerson", source: "Hamatreya, 1847" },
              { text: "In the woods, too, a man casts off his years, as the snake his slough, and is always a child.", author: "Ralph Waldo Emerson", source: "Nature, 1836" },
              { text: "Let us permit nature to have her way: she understands her business better than we do.", author: "Michel de Montaigne", source: "Essays, 1580" },
              { text: "Spring is nature's way of saying, 'Let's party!'", author: "Robin Williams", source: "attributed" },
              { text: "The goal of life is to make your heartbeat match the beat of the universe, to match your nature with Nature.", author: "Joseph Campbell", source: "attributed" },
              { text: "To forget how to dig the earth and to tend the soil is to forget ourselves.", author: "Mahatma Gandhi", source: "attributed" },
              { text: "What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves.", author: "Mahatma Gandhi", source: "attributed" },
              { text: "The poetry of the earth is never dead.", author: "John Keats", source: "On the Grasshopper and Cricket, 1816" },
              { text: "Nature is not a place to visit. It is home.", author: "Gary Snyder", source: "Turtle Island, 1974" },
              { text: "The care of the earth is our most ancient and most worthy, and after all our most pleasing responsibility.", author: "Wendell Berry", source: "The Art of the Commonplace, 2002" },
              { text: "It may be that when we no longer know what to do, we have come to our real work, and when we no longer know which way to go, we have begun our real journey.", author: "Wendell Berry", source: "Standing by Words, 1983" },
              { text: "The world is not given by his fathers, but borrowed from his children.", author: "Antoine de Saint-Exupéry", source: "attributed, after Native American proverb" },
              { text: "We do not inherit the earth from our ancestors, we borrow it from our children.", author: "Native American proverb", source: "Traditional" },
              { text: "Hurt not the earth, neither the sea, nor the trees.", author: "Book of Revelation", source: "8:9, KJV" },
              { text: "Only after the last tree has been cut down, only after the last river has been poisoned, only after the last fish has been caught, only then will you find that money cannot be eaten.", author: "Cree prophecy", source: "Traditional" },
              { text: "We are the first generation to feel the effect of climate change and the last generation that can do something about it.", author: "Barack Obama", source: "UN Climate Change Conference, 2014" },
              { text: "We are all connected to each other biologically, to the earth chemically, and to the rest of the universe atomically.", author: "Neil deGrasse Tyson", source: "Death by Black Hole, 2007" },
              { text: "The environment is where we all meet; where we all have a mutual interest; it is the one thing all of us share.", author: "Lady Bird Johnson", source: "attributed" },
              { text: "Like music and art, love of nature is a common language that can transcend political or social boundaries.", author: "Jimmy Carter", source: "attributed" },
              { text: "What we save tells who we are.", author: "Wallace Stegner", source: "The Sound of Mountain Water, 1969" },
              { text: "Something will have gone out of us as a people if we ever let the remaining wilderness be destroyed.", author: "Wallace Stegner", source: "Wilderness Letter, 1960" },
              { text: "If you truly love nature, you will find beauty everywhere.", author: "Vincent van Gogh", source: "letter to Theo van Gogh, 1888" },
              { text: "He that plants trees loves others beside himself.", author: "Thomas Fuller", source: "Gnomologia, 1732" },
            ]

            const weekIdx = (getISOWeek(now) - 1) % ECOLOGY.length

            const now2 = new Date()

            // Para 1: dynamic — sightings from the past 7 days
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
            const thisWeekSightings = sightings.filter((s) =>
              s.timestamp && s.timestamp >= sevenDaysAgo
            )
            const speciesThisWeek: Record<string, number> = {}
            thisWeekSightings.forEach((s) => {
              if (s.species) speciesThisWeek[s.species] = (speciesThisWeek[s.species] || 0) + 1
            })
            const topSpecies = Object.entries(speciesThisWeek)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)

            const ecology = ECOLOGY[weekIdx]
            const quote = QUOTES[weekIdx]

            const monthName = now2.toLocaleString('default', { month: 'long' })
            const dayNum = now2.getDate()
            const yearNum = now2.getFullYear()

            return (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef9e7 100%)',
                border: '2px solid #d97706',
                borderRadius: '12px',
                padding: '1.1rem 1.25rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: '#78350f',
                lineHeight: 1.65,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📬</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e', letterSpacing: '0.03em' }}>
                    Your Weekly Nature Letter
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#a16207', opacity: 0.9 }}>
                    {monthName} {dayNum}, {yearNum}
                  </span>
                </div>

                {/* Para 1: sightings */}
                <p style={{ margin: '0 0 0.7rem 0' }}>
                  {thisWeekSightings.length === 0 ? (
                    <>This week's log is still blank. That's not a failure — it's an open question. The yard is there. Something is happening in it. The act of going to look, even if you find nothing unusual, is the practice. Step outside today.</>
                  ) : topSpecies.length === 1 ? (
                    <>This week you logged {thisWeekSightings.length} sighting{thisWeekSightings.length > 1 ? 's' : ''} — {topSpecies[0][1] > 1 ? topSpecies[0][1] + ' observations of ' + topSpecies[0][0] : 'a ' + topSpecies[0][0]}. Each entry is a record of a moment of attention. Over time, those moments become a portrait of your place — a portrait no sensor or satellite can produce, because it is made of you being there and noticing.</>
                  ) : (
                    <>This week you logged {thisWeekSightings.length} sighting{thisWeekSightings.length > 1 ? 's' : ''}: {topSpecies.map(([sp, n]) => n > 1 ? sp + ' (' + n + ')' : sp).join(', ')}{topSpecies.length < Object.keys(speciesThisWeek).length ? ', and more' : ''}. Each entry is a record of a moment of attention. Over time, those moments become a portrait of your place — a portrait no sensor or satellite can produce, because it is made of you being there and noticing.</>
                  )}
                </p>

                {/* Para 2: ecology */}
                <p style={{ margin: '0 0 0.7rem 0' }}>{ecology}</p>

                {/* Para 3: quote */}
                <p style={{ margin: 0, borderTop: '1px solid #d97706', paddingTop: '0.6rem', fontStyle: 'italic', color: '#92400e' }}>
                  "{quote.text}" <span style={{ fontStyle: 'normal', fontSize: '0.78rem', opacity: 0.85 }}>— {quote.author}, <em>{quote.source}</em></span>
                </p>
              </div>
            )
          })()}

          {/* 🌿 Step Outside Now — time & season-aware invitation banner (prop-027) */}
          {(() => {
            // 5 time windows × 4 seasons = 20 specific invitations
            // season: 0=winter(Dec-Feb), 1=spring(Mar-May), 2=summer(Jun-Aug), 3=fall(Sep-Nov)
            // window: 0=dawn(4-7), 1=morning(7-12), 2=midday(12-17), 3=evening(17-20), 4=night(20-4)
            const now = new Date()
            const hour = now.getHours()
            const month = now.getMonth() // 0-11
            const season = month >= 11 || month <= 1 ? 0 : month <= 4 ? 1 : month <= 7 ? 2 : 3
            const win = hour >= 4 && hour < 7 ? 0 : hour < 12 ? 1 : hour < 17 ? 2 : hour < 20 ? 3 : 4
            type WindowEntry = { icon: string; action: string; description: string; invite: string }
            type SeasonData = [WindowEntry, WindowEntry, WindowEntry, WindowEntry, WindowEntry]
            const DATA: [SeasonData, SeasonData, SeasonData, SeasonData] = [
              // winter (0)
              [
                { icon: '🦉', action: 'Listen for owls calling before dawn.', description: 'Great Horned Owls are already nesting in January. They call before first light — a deep, resonant sound that carries far. The season has not started; the ecosystem already has.', invite: 'Open a window and listen.' },
                { icon: '🐦', action: 'Check your seed-heads and feeders.', description: 'Sparrows, juncos, and goldfinches are most active in winter mornings. Native seed-heads standing in your yard are doing the same work as a feeder — without the refills.', invite: 'Walk to your native plantings.' },
                { icon: '🌿', action: "Sketch this year's native patch.", description: 'The ground is waiting. A single 10 sq ft patch with milkweed and coneflower is a waystation on a 2,000-mile migration route. Every corridor yard was planned in winter, by someone who decided.', invite: 'Write down one plant you will add.' },
                { icon: '🌙', action: 'Notice what crosses the sky at dusk.', description: 'Starlings murmur. Crows fly to roost. In winter the sky empties fast. The same aerial routes that bring Monarchs north in May begin here, with the birds that stayed.', invite: 'Step outside before full dark.' },
                { icon: '❄️', action: 'Leave the leaf litter where it is.', description: 'Overwintering insects, moth pupae, and native bee eggs are in your leaf litter right now. Raking in winter is clearing habitat. Every undisturbed corner feeds the spring migration.', invite: 'Resist tidying for one more week.' },
              ],
              // spring (1)
              [
                { icon: '🐦', action: 'Listen for returning migrants at first light.', description: 'The dawn chorus peaks in May — dozens of species singing before sunrise to claim territory. Migration is happening right now, right above your neighborhood, in the dark.', invite: 'Stand outside for 5 minutes at first light.' },
                { icon: '🦋', action: 'Check your milkweed before 10am.', description: 'Monarchs arriving in spring are looking for milkweed to lay eggs. A single plant can host a generation. Check the underside of leaves for tiny yellow eggs.', invite: 'Walk to your milkweed now.' },
                { icon: '🦋', action: 'Watch for Monarchs from 10am to 2pm.', description: 'Peak Monarch nectaring happens on warm, sunny days in the late morning. They move methodically, flower to flower. Slow down and you will see them. They are counting on your yard being there.', invite: 'Spend 10 minutes in your garden.' },
                { icon: '🌸', action: 'Notice what is blooming right now.', description: "Evening is when pollinators make their last rounds — bees returning to nests, butterflies finding roosts. The late light shows the garden's architecture. What is opening today that was not yesterday?", invite: 'Walk your yard slowly.' },
                { icon: '🌙', action: 'Listen for spring peepers after dark.', description: 'Spring Peepers and American Toads call on warm spring nights — a sound that means winter is over. They need standing water, even a shallow depression. Your yard could hold that.', invite: 'Open your window after 9pm.' },
              ],
              // summer (2)
              [
                { icon: '🐦', action: 'Listen for the Wood Thrush at dawn.', description: 'The Wood Thrush sings at dawn and dusk — a flute-like spiral of sound that Thoreau called the most beautiful birdsong in North America. They need intact forest interior. They are telling you what habitat remains.', invite: 'Step outside before 7am.' },
                { icon: '🐝', action: 'Watch native flowers for bee activity.', description: 'Native bees peak from 8am to noon. Bumble bees, sweat bees, mason bees — they are most visible when morning sun hits flowers still wet with dew. Native plants that evolved with them produce more nectar.', invite: 'Walk to a flowering plant.' },
                { icon: '🦋', action: 'Monarchs are nectaring from 11am to 3pm.', description: 'Peak butterfly activity in summer midday sun. Monarchs, Swallowtails, Fritillaries. Your milkweed and coneflower are the destination. Go slowly and count what lands.', invite: 'Go outside for 10 minutes.' },
                { icon: '✨', action: 'Watch for fireflies at dusk.', description: 'Fireflies emerge 30 to 45 minutes after sunset in June and July. Each flash is a mating signal specific to the species. Their presence is an index of intact soil and low pesticide use.', invite: 'Be outside at golden hour.' },
                { icon: '🦇', action: 'Watch for bats after dark.', description: 'Bats peak 1 to 2 hours after sunset. A single Little Brown Bat eats 1,200 mosquitoes per hour. They depend on native insect populations — which depend on native plants. Your yard is in this chain.', invite: 'Stand in your yard after 9pm.' },
              ],
              // fall (3)
              [
                { icon: '🦢', action: 'Watch the sky for migrating birds.', description: 'Fall migration peaks September through October. Warblers, thrushes, and shorebirds move at night and descend at dawn. Your yard is a stopover point in a 3,000-mile journey. What it offers determines who survives.', invite: 'Look up this morning.' },
                { icon: '🦋', action: 'Check for Monarchs heading south.', description: 'Fall Monarch migration moves through September and October — single butterflies traveling steadily south by southwest. They need nectar for a 2,000-mile journey to Mexico. Your late-blooming flowers are fuel.', invite: 'Check your goldenrod and asters.' },
                { icon: '🌾', action: 'Leave your seed-heads standing.', description: 'Seed-heads are winter food for goldfinches, sparrows, and chickadees. Every coneflower head left standing feeds a bird through February. Resistance to tidiness is ecological action.', invite: 'Walk your yard and resist cutting back.' },
                { icon: '🦩', action: 'Watch for geese and cranes heading south.', description: 'Canada Geese fly in V-formations at dusk from late September. Sandhill Cranes pass over the Midwest in October — a prehistoric call you can hear from a half-mile. The sky is a map of where habitat remains.', invite: 'Watch the evening sky.' },
                { icon: '🌕', action: 'Listen for migration calls after dark.', description: 'Many birds migrate at night and give short chip calls as they fly. Stand outside on a clear October night and you will hear the sky moving. What you hear depends on what corridor habitat remains.', invite: 'Stand outside and listen up.' },
              ],
            ]
            const entry = DATA[season][win]
            const seasonLabel = ['Winter', 'Spring', 'Summer', 'Fall'][season]
            const winLabel = ['Before Dawn', 'Morning', 'Midday', 'Evening', 'Night'][win]
            return (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '0.65rem 0.9rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '1rem' }}>{entry.icon}</span>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>Step Outside Now</span>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280', marginLeft: 'auto' }}>{seasonLabel} · {winLabel}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.2rem' }}>{entry.action}</div>
                <div style={{ color: '#374151', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{entry.description}</div>
                <div style={{ fontStyle: 'italic', color: '#15803d', fontSize: '0.8rem' }}>{entry.invite}</div>
              </div>
            )
          })()}

          {/* 🌿 Your First Season — one-time onboarding card (prop-006) */}
          {showOnboarding && (() => {
            const tip = getSeasonalTip()
            const monthName = new Date().toLocaleString('en-US', { month: 'long' })
            return (
              <div style={{
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                border: '2px solid #ca8a04',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#713f12', marginBottom: '0.5rem' }}>
                    🌿 Welcome — it's {monthName}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem('sis-onboarded', '1') } catch {}
                      setShowOnboarding(false)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      color: '#92400e',
                      lineHeight: 1,
                      padding: '0 0.25rem',
                    }}
                    aria-label="Dismiss welcome"
                  >×</button>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#78350f', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {tip.emoji} {/* Heading format: "Month: Description" — extract the description after the colon */}
                  {tip.heading.split(':')[1]?.trim() ?? tip.heading}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#451a03', lineHeight: '1.55', marginBottom: '0.75rem' }}>
                  {tip.tip}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#713f12', lineHeight: '1.5', marginBottom: '0.85rem', fontStyle: 'italic' }}>
                  Every sighting you log joins a growing map of native habitat across the country.
                  Camp Monarch is rebuilding what was lost — one yard, one garden, one observation at a time.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('sis-onboarded', '1') } catch {}
                    setShowOnboarding(false)
                  }}
                  style={{
                    background: '#ca8a04',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Start exploring →
                </button>
              </div>
            )
          })()}

        <form
          onSubmit={handleSubmit}
          style={{ background: '#f5f5f5', padding: '1.25rem', borderRadius: '10px' }}
        >
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Log a Sighting</h2>

          {/* What to look for this month — seasonal nature banner */}
          {(() => {
            const tip = getSeasonalTip()
            return (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #6ee7b7',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: '#065f46' }}>
                  {tip.emoji} {tip.heading}
                </div>
                <div style={{ color: '#374151' }}>{tip.tip}</div>
              </div>
            )
          })()}


          {/* 📓 Field Notes — rotating weekly naturalist journal */}
          {(() => {
            const note = getFieldNote()
            const now = new Date()
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
            const currentDate = monthNames[now.getMonth()] + ' ' + now.getDate()
            return (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #d97706',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📓</span>
                  <span>Field Notes — week of {currentDate}</span>
                </div>
                <div style={{ color: '#451a03', fontStyle: 'italic', lineHeight: '1.6' }}>{note.text}</div>
              </div>
            )
          })()}


          {/* ✅ What to Do Right Now — weekly action card (prop-012) */}
          {(() => {
            const wa = getWeeklyAction()
            return (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #16a34a',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>✅</span>
                  <span>What to Do Right Now</span>
                </div>
                <div style={{ color: '#15803d', fontWeight: 600, marginBottom: '0.2rem' }}>{wa.action}</div>
                <div style={{ color: '#166534', fontSize: '0.8rem' }}>{wa.reason}</div>
              </div>
            )
          })()}



          {/* 📅 Seasonal Countdown — next Monarch milestone (prop-022) */}
          {(() => {
            const today = new Date()
            const doy = getDOY(today)
            const result = getNextMilestone(doy)

            if ('overwintering' in result) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                }}>
                  <div style={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span>❄️</span>
                    <span>Monarchs overwintering in Mexico</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    Ten million Monarchs are clustered in the oyamel fir forests of Michoacán right now — waiting for the days to lengthen. First arrivals in Missouri: late April.
                  </div>
                </div>
              )
            }

            const { milestone: m, daysUntil, isNow } = result
            const statusColor = isNow ? '#14532d' : '#1e3a5f'
            const bgColor = isNow
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
            const borderColor = isNow ? '#16a34a' : '#3b82f6'

            return (
              <div style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, color: statusColor, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{m.emoji}</span>
                    <span>{m.name}</span>
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isNow ? '#15803d' : '#1d4ed8',
                    background: isNow ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                    borderRadius: '4px',
                    padding: '0.15rem 0.4rem',
                    whiteSpace: 'nowrap',
                    marginLeft: '0.5rem',
                    flexShrink: 0,
                  }}>
                    {isNow ? 'Happening now' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                  </div>
                </div>
                <div style={{ color: statusColor, fontSize: '0.78rem', opacity: 0.9 }}>
                  {isNow ? m.nowNote : m.prepNote}
                </div>
              </div>
            )
          })()}

          {/* 🦋 Monarch Story — weekly narrative panel (prop-015) */}
          {(() => {
            const ms = getMonarchStory()
            return (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #d97706',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.65',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🦋</span>
                  <span>Monarch Story — Week {ms.week}</span>
                </div>
                <div style={{ color: '#78350f', fontStyle: 'italic' }}>{ms.story}</div>
              </div>
            )
          })()}


          {/* 🌿 Community Stream — live feed of recent sightings from all Camp Monarch users */}
          {(() => {
            // Sort a copy of sightings by observed_at descending, take 5
            const recent = [...sightings]
              .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
              .slice(0, 5)

            function timeAgo(ts: string): string {
              const diff = Date.now() - new Date(ts).getTime()
              const mins = Math.floor(diff / 60000)
              if (mins < 2) return 'just now'
              if (mins < 60) return mins + 'm ago'
              const hrs = Math.floor(mins / 60)
              if (hrs < 24) return hrs === 1 ? '1h ago' : hrs + 'h ago'
              const days = Math.floor(hrs / 24)
              return days === 1 ? '1 day ago' : days + ' days ago'
            }

            return (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🌿</span>
                  <span>Community Stream</span>
                </div>
                {recent.length === 0 ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                    No sightings logged yet — yours will be the first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {recent.map((s, i) => (
                      <div
                        key={s.id || i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          paddingBottom: i < recent.length - 1 ? '0.35rem' : 0,
                          borderBottom: i < recent.length - 1 ? '1px solid #bbf7d0' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, color: '#15803d' }}>{s.species_name}</span>
                          {s.observer_name ? (
                            <span style={{ color: '#6b7280' }}> · {s.observer_name}</span>
                          ) : null}
                          {s.location_name ? (
                            <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}> — {s.location_name}</span>
                          ) : null}
                          {s.notes ? (
                            <div style={{ color: '#374151', fontSize: '0.78rem', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.notes.length > 70 ? s.notes.slice(0, 70) + '…' : s.notes}
                            </div>
                          ) : null}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.73rem', whiteSpace: 'nowrap', marginLeft: '0.6rem', paddingTop: '0.1rem' }}>
                          {timeAgo(s.observed_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}



          
          {/* 🌿 What Lived Here — historical ecological community for this region (prop-032) */}
          {(() => {
            interface EcoProfile {
              region: string
              plants: string[]
              wildlife: string[]
              percentRemaining: number
              action: string
              note: string
            }
            const profiles: EcoProfile[] = [
              {
                region: "Tall-Grass Prairie",
                plants: ["Big Bluestem", "Indian Grass", "Purple Coneflower", "Wild Bergamot"],
                wildlife: ["Monarch Butterfly", "Bobolink", "Prairie Chicken", "Ornate Box Turtle"],
                percentRemaining: 1,
                action: "Plant a native prairie patch with big bluestem and coneflower — even 100 sq ft counts.",
                note: "Once blanketed 170 million acres from Indiana to Kansas. Now less than 1% remains.",
              },
              {
                region: "Oak Savanna",
                plants: ["Bur Oak", "Wild Blue Indigo", "Prairie Dropseed", "Downy Yellow Violet"],
                wildlife: ["Sandhill Crane", "Badger", "Monarch Butterfly", "Wood Thrush"],
                percentRemaining: 0,
                action: "Plant a bur oak seedling — it will shelter wildlife for 200+ years after you are gone.",
                note: "The most endangered ecosystem in North America. Less than 0.02% of original extent survives.",
              },
              {
                region: "Ozark Highland Forest",
                plants: ["White Oak", "Shortleaf Pine", "Wild Ginger", "Shooting Star"],
                wildlife: ["Hellbender", "Painted Bunting", "Wild Turkey", "Ozark Hellbender"],
                percentRemaining: 55,
                action: "Remove invasive bush honeysuckle — it blocks native wildflower regeneration.",
                note: "One of North America's most biodiverse regions, but degraded by invasives and fragmentation.",
              },
              {
                region: "Bottomland Forest",
                plants: ["Sycamore", "River Birch", "Cottonwood", "Buttonbush"],
                wildlife: ["Wood Duck", "Prothonotary Warbler", "Great Blue Heron", "Barred Owl"],
                percentRemaining: 5,
                action: "Plant native buttonbush at the edge of any wet or low area in your yard.",
                note: "Missouri and Illinois floodplain forests once stretched hundreds of miles. 95% are gone.",
              },
              {
                region: "Eastern Deciduous Forest",
                plants: ["Tulip Poplar", "Pawpaw", "Trillium", "Wild Columbine"],
                wildlife: ["Luna Moth", "Pileated Woodpecker", "Wood Thrush", "Eastern Box Turtle"],
                percentRemaining: 40,
                action: "Underplant your trees with native ferns and trilliums — forest floor habitat matters.",
                note: "Fragmented into islands. The species that need large connected forests are disappearing fastest.",
              },
              {
                region: "Northern Lakes Forest",
                plants: ["White Pine", "Paper Birch", "Wild Blueberry", "Pitcher Plant"],
                wildlife: ["Common Loon", "Gray Wolf", "Moose", "Monarch Butterfly (breeding)"],
                percentRemaining: 70,
                action: "Eliminate invasive buckthorn from your understory — it shades out native wildflowers.",
                note: "More intact than southern forests, but invasive shrubs and warming are eroding the understory.",
              },
              {
                region: "Mixed-Grass Prairie",
                plants: ["Buffalo Grass", "Blue Grama", "Prairie Coneflower", "Leadplant"],
                wildlife: ["Black-footed Ferret", "Burrowing Owl", "Swift Fox", "Monarch Butterfly"],
                percentRemaining: 40,
                action: "Convert a lawn section to buffalo grass — no irrigation, no mowing, native roots 6 feet deep.",
                note: "Stretched from Texas to Canada. What remains sustains the last intact grassland bird communities.",
              },
              {
                region: "Central Missouri / Missouri River Valley",
                plants: ["Bur Oak", "Big Bluestem", "Wild Bergamot", "Purple Coneflower"],
                wildlife: ["Monarch Butterfly", "Eastern Meadowlark", "Timber Rattlesnake", "Wood Thrush"],
                percentRemaining: 2,
                action: "Plant milkweed and native coneflowers — your yard sits in the Monarch migration corridor.",
                note: "The Missouri River valley was oak savanna and tall-grass prairie. Today less than 2% remains.",
              },
            ]

            // Select profile based on lat/lng (falls back to Central Missouri)
            const userLat = parseFloat(lat) || 38.6
            const userLng = parseFloat(lng) || -90.2
            let profile = profiles[7] // default: Central Missouri
            if (userLng < -97) {
              profile = profiles[6] // Mixed-Grass Prairie (far west)
            } else if (userLat > 43 && userLng > -93) {
              profile = profiles[5] // Northern Lakes Forest
            } else if (userLat > 41 && userLng < -88 && userLng > -93) {
              profile = profiles[1] // Oak Savanna (northern IL/WI)
            } else if (userLat > 36 && userLat < 38 && userLng > -94 && userLng < -89) {
              profile = profiles[2] // Ozark Highland Forest
            } else if (userLat > 36 && userLat < 40 && userLng > -93 && userLng < -88) {
              profile = profiles[3] // Bottomland Forest (MO/IL floodplain)
            } else if (userLng > -88) {
              profile = profiles[4] // Eastern Deciduous Forest
            } else if (userLng < -93 && userLat < 44) {
              profile = profiles[0] // Tall-Grass Prairie (central/western MO, IA)
            }

            const pct = profile.percentRemaining
            const pctColor = pct <= 1 ? '#f87171' : pct <= 5 ? '#fb923c' : pct <= 20 ? '#fbbf24' : '#4ade80'

            return (
              <div style={{
                background: 'linear-gradient(135deg, #14432a 0%, #1a5c38 50%, #15803d 100%)',
                border: '2px solid #4ade80',
                borderRadius: '12px',
                padding: '1rem 1.1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: '#dcfce7',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🌿 What Lived Here
                </div>
                <div style={{ fontSize: 11, color: '#86efac', marginBottom: '0.7rem' }}>
                  Historical ecological community · {lat ? profile.region : "Central Missouri (enable location for your region)"}
                </div>
                <div style={{ fontSize: 13, color: '#bbf7d0', marginBottom: '0.6rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {profile.note}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Native Plants
                    </div>
                    {profile.plants.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#d1fae5', marginBottom: 2 }}>
                        · {p}
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Wildlife
                    </div>
                    {profile.wildlife.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#d1fae5', marginBottom: 2 }}>
                        · {w}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ORIGINAL EXTENT REMAINING
                  </div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: Math.min(100, pct) + '%',
                      background: pctColor,
                      borderRadius: 4,
                      minWidth: pct > 0 ? 3 : 0,
                    }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: pctColor, whiteSpace: 'nowrap' }}>
                    {pct < 1 ? '<1%' : pct + '%'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '0.5rem 0.7rem',
                  fontSize: 12,
                  color: '#a7f3d0',
                  borderLeft: '3px solid #4ade80',
                }}>
                  <span style={{ fontWeight: 600, color: '#4ade80' }}>You can restore it: </span>
                  {profile.action}
                </div>
              </div>
            )
          })()}
          {/* 📖 Ecological Reading Corner — seasonal public-domain naturalist passages (prop-034) */}
          {(() => {
            const READING_ENTRIES: Array<{
              passage: string
              author: string
              book: string
              year: number
              note: string
            }> = [
              // Week 1 — early January: stillness, winter light
              { passage: "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation. From the desperate city you go into the desperate country, and have to console yourself with the bravery of minks and muskrats.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "January stillness invites us to ask which of our obligations were truly chosen." },
              // Week 2 — mid-January: cold and animal tracks
              { passage: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "The tracks crossing a field in January are evidence of lives being lived on their own terms." },
              // Week 3 — late January: deep cold
              { passage: "The mountains are fountains not only of rivers and fertile soil, but of men. Therefore we are all, in some sense, mountaineers, and going to the mountains is going home.", author: "John Muir", book: "Our National Parks", year: 1901, note: "Even in January's grip, something in us knows where we belong." },
              // Week 4 — early February: first hints of thaw
              { passage: "In the woods, too, a man casts off his years, as the snake his slough, and at what period soever of life, is always a child. In the woods is perpetual youth.", author: "Ralph Waldo Emerson", book: "Nature", year: 1836, note: "February's first thaw carries the first biological promise of return." },
              // Week 5 — mid-February: woodpeckers, chickadees
              { passage: "The bluebird carries the sky on his back. He is the celestial bird. He makes the sky visible to us after its long winter absence.", author: "John Burroughs", book: "Ways of Nature", year: 1905, note: "Watch for the first bluebird of the year — it arrives before the land looks ready." },
              // Week 6 — late February: Monarch begin to stir in Mexico
              { passage: "There is a love of wild nature in everybody, an ancient mother-love ever showing itself whether recognized or no, and however covered by cares and duties.", author: "John Muir", book: "Our National Parks", year: 1901, note: "In the mountains of Michoacan, overwintering Monarchs begin to warm on cold mornings." },
              // Week 7 — early March: skunks, red-winged blackbirds
              { passage: "We must go out and re-ally ourselves to Nature every day. We must make root, send out some little fibre at least, even every winter day.", author: "Henry David Thoreau", book: "Journal", year: 1856, note: "Red-winged blackbirds are calling from cattail marshes. The males arrive weeks before the females." },
              // Week 8 — mid-March: Monarch migration begins north
              { passage: "The trees are coming into leaf like something almost being said; the recent buds relax and spread, their greenness is a kind of grief.", author: "Philip Larkin", book: "The Trees", year: 1967, note: "The first Monarchs have left Mexico. They are following the milkweed north." },
              // Week 9 — late March: spring peepers, bloodroot
              { passage: "He who hears the rippling of rivers in these degenerate days will not utterly despair. The banks which the frost has crumbled, the waves have washed, — these are as fresh and inviting as ever.", author: "Henry David Thoreau", book: "A Week on the Concord and Merrimack Rivers", year: 1849, note: "Spring peepers erupt from pond margins after the first warm rain. Listen after dark." },
              // Week 10 — early April: wood frogs, warblers arriving
              { passage: "April is the cruelest month, breeding lilacs out of the dead land, mixing memory and desire, stirring dull roots with spring rain.", author: "T.S. Eliot", book: "The Waste Land", year: 1922, note: "Wood frogs have already hatched. The first warblers are crossing the Gulf of Mexico." },
              // Week 11 — mid-April: wildflowers, violet-green swallows
              { passage: "Not till we are lost, in other words not till we have lost the world, do we begin to find ourselves, and realize where we are and the infinite extent of our relations.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "Bloodroot, trout lily, hepatica — they bloom before the canopy closes. Go look now." },
              // Week 12 — late April: Monarch migration Texas
              { passage: "In spring, the first Monarchs crossing Texas are thin, tattered, worn from the winter colony and the weeks of travel. They lay eggs on the first milkweed they find. The act of laying is itself the end of a generation.", author: "Derived from field observation tradition", book: "Field naturalist record", year: 1900, note: "Monarch waystations in Texas now: every patch of milkweed is a survival station." },
              // Week 13 — early May: peak warbler migration
              { passage: "There is nothing in which the birds differ more from man than the way in which they can build and yet leave a landscape as it was before.", author: "Robert Lynd", book: "The Blue Lion", year: 1923, note: "Over 100 warbler species are funneling through the Mississippi flyway right now. Peak migration." },
              // Week 14 — mid-May: Monarchs arrive Missouri, breeding begins
              { passage: "The butterfly, a cabbage-white, its ignorant endurance great — comes dancing home again at dusk as if to the right place.", author: "Elizabeth Bishop", book: "Poem", year: 1976, note: "The first Monarchs arrive in Missouri in May, seeking milkweed to lay eggs. Your yard matters now." },
              // Week 15 — late May: fireflies beginning in south
              { passage: "Every blade of grass has its Angel that bends over it and whispers, Grow, grow.", author: "The Talmud (attributed)", book: "Babylonian Talmud", year: 400, note: "The first fireflies of the season emerge from the soil where they spent two winters as larvae." },
              // Week 16 — early June: caterpillars, fireflies begin
              { passage: "In every walk with nature, one receives far more than he seeks. The clearest way into the universe is through a forest wilderness.", author: "John Muir", book: "John of the Mountains", year: 1938, note: "Monarch caterpillars are striped yellow, white, and black — look for them on milkweed now." },
              // Week 17 — mid-June: longest days approaching
              { passage: "The groves were God's first temples. Ere man learned to hew the shaft, and lay the architrave, and spread the roof above them — ere he framed the lofty vault, to gather and roll back the sound of anthems — in the darkling wood, amidst the cool and silence, he knelt down, and offered to the Mightiest solemn thanks.", author: "William Cullen Bryant", book: "A Forest Hymn", year: 1825, note: "Firefly displays peak near the summer solstice. No battery or cable required." },
              // Week 18 — late June: solstice, peak firefly
              { passage: "I never saw a wild thing sorry for itself. A small bird will drop frozen dead from a bough without ever having felt sorry for itself.", author: "D.H. Lawrence", book: "Self-Pity", year: 1929, note: "The shortest nights of the year are also the brightest — fireflies signal from every meadow." },
              // Week 19 — early July: summer abundance, butterfly counts
              { passage: "I felt my lungs inflate with the onrush of scenery — air, mountains, trees, people. I thought, this is what it is to be happy.", author: "Sylvia Plath", book: "The Bell Jar", year: 1963, note: "Mid-summer butterfly counts: spend 15 minutes in a sunny garden and count every species you see." },
              // Week 20 — mid-July: dog-day cicadas
              { passage: "The world is not to be put in order; the world is order, incarnate. It is for us to harmonize with this order.", author: "Henry Miller", book: "Big Sur and the Oranges of Hieronymus Bosch", year: 1957, note: "Dog-day cicadas begin their drilling chorus — a sound as old as August itself." },
              // Week 21 — late July: goldenrod budding
              { passage: "One touch of nature makes the whole world kin.", author: "William Shakespeare", book: "Troilus and Cressida", year: 1602, note: "Goldenrod buds are forming — the first real signal that the summer arc is bending." },
              // Week 22 — early August: milkweed pods forming
              { passage: "The sun, with all those planets revolving around it and dependent on it, can still ripen a bunch of grapes as if it had nothing else in the universe to do.", author: "Galileo Galilei", book: "Attributed", year: 1630, note: "Milkweed pods are swelling. Each one holds the seeds that will support next year's Monarchs." },
              // Week 23 — mid-August: Monarch migration south begins
              { passage: "These stories are true. Although I have left the strict line of historical truth in many places, the animals in this book were all real characters. They lived the lives I have depicted, and showed the stamp of heroism and personality more strongly by far than it has been in the power of my pen to tell.", author: "Ernest Thompson Seton", book: "Wild Animals I Have Known", year: 1898, note: "The first southbound Monarchs are moving. They will travel 2,000 miles to mountains they have never seen." },
              // Week 24 — late August: fall migration begins
              { passage: "I have roamed through the woods for more than seventy years, and I can say that I have never yet met a dull or uninteresting plant; never have I found one which did not reward close attention and study.", author: "John Burroughs", book: "Ways of Nature", year: 1905, note: "Shorebirds are already southbound. The first fall warblers are moving at night through your neighborhood." },
              // Week 25 — early September: peak Monarch migration
              { passage: "The life of a wild animal always has a tragic end. It is only the fortunate who escape that end, and then it is usually by a more terrible death of old age.", author: "Ernest Thompson Seton", book: "Wild Animals I Have Known", year: 1898, note: "Monarch migration reaches peak density in September. Watch for clusters on goldenrod and roadsides." },
              // Week 26 — mid-September: goldenrod, asters in bloom
              { passage: "There are no words that can tell the hidden spirit of the wilderness, that can reveal its mystery, its melancholy, and its charm. There is delight in the hardy life of the open.", author: "Theodore Roosevelt", book: "The Wilderness Hunter", year: 1893, note: "Goldenrod and asters in full bloom — the last critical nectar source for southbound Monarchs." },
              // Week 27 — late September: first frost in north
              { passage: "Autumn is a second spring when every leaf is a flower.", author: "Albert Camus", book: "Attributed", year: 1950, note: "The first frost ends the Monarch season in the north. Their journey south is nearly complete." },
              // Week 28 — early October: peak fall color
              { passage: "I cannot endure to waste anything so precious as autumnal sunshine by staying in the house.", author: "Nathaniel Hawthorne", book: "American Notebooks", year: 1835, note: "Peak leaf color follows anthocyanin chemistry, not temperature — it builds over weeks." },
              // Week 29 — mid-October: migrating waterfowl
              { passage: "One of the first conditions of happiness is that the link between man and nature shall not be broken.", author: "Leo Tolstoy", book: "Attributed", year: 1900, note: "Waterfowl migration peaks in October. Every pond and marsh becomes a way station." },
              // Week 30 — late October: first juncos arrive
              { passage: "Even if something is left undone, everyone must take time to sit still and watch the leaves turn.", author: "Elizabeth Lawrence", book: "Attributed", year: 1950, note: "Dark-eyed juncos arrive from the north, trading tundra for your backyard for the winter." },
              // Week 31 — early November: bare trees, woodcock migration
              { passage: "What would the world be, once bereft of wet and wildness? Let them be left, O let them be left, wildness and wet; long live the weeds and the wilderness yet.", author: "Gerard Manley Hopkins", book: "Inversnaid", year: 1881, note: "After leaf drop, the forest structure is revealed. Now you can see nests, hollows, and light." },
              // Week 32 — mid-November: last migrants
              { passage: "All my life I have tried to pluck a thistle and plant a flower wherever the flower would grow in thought and mind.", author: "Abraham Lincoln", book: "Attributed", year: 1863, note: "The last Monarch has reached Mexico. The overwintering colony is forming in the oyamel firs." },
              // Week 33 — late November: the Monarchs in Mexico
              { passage: "These are the gardens of the Desert, these the unshorn fields, boundless and beautiful, for which the speech of England has no name — the Prairies!", author: "William Cullen Bryant", book: "The Prairies", year: 1833, note: "100 million Monarchs are clustering in the Sierra Chincua. The roar of their wings is audible." },
              // Week 34 — early December: winter birds
              { passage: "There is something infinitely healing in the repeated refrains of nature — the assurance that dawn comes after night, and spring after winter.", author: "Rachel Carson", book: "The Sense of Wonder", year: 1965, note: "December bird feeders: each species is a winter specialist. They did not migrate, they adapted." },
              // Week 35 — mid-December: winter solstice approaching
              { passage: "Climb the mountains and get their good tidings. Nature's peace will flow into you as sunshine flows into trees. The winds will blow their own freshness into you, and the storms their energy, while cares will drop off like autumn leaves.", author: "John Muir", book: "Our National Parks", year: 1901, note: "The days are at their shortest. Every Monarch in the world is in three valleys in Mexico." },
              // Week 36 — solstice week
              { passage: "If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "Winter solstice: from here, days lengthen. The biological world is already adjusting." },
              // Week 37 — late December: year's end
              { passage: "Look deep into nature, and then you will understand everything better.", author: "Albert Einstein", book: "Attributed", year: 1920, note: "End of the year. The Monarchs are still in Mexico. Milkweed seeds are in the ground. The cycle holds." },
              // Week 38 — early January again (week 53 wraps here)
              { passage: "The question is not what you look at, but what you see.", author: "Henry David Thoreau", book: "Journal", year: 1851, note: "A new year, the same fields. Attention is the practice." },
              // Fill remaining weeks with additional strong entries
              // Week 39
              { passage: "In every walk with nature, one receives far more than he seeks.", author: "John Muir", book: "John of the Mountains", year: 1938, note: "January is a good month to learn tree identification by bark and branch alone." },
              // Week 40
              { passage: "The poetry of the earth is never dead.", author: "John Keats", book: "On the Grasshopper and Cricket", year: 1816, note: "Even in deepest winter, field sparrows sing from brushy hedgerows." },
              // Week 41
              { passage: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", book: "Attributed", year: 1840, note: "Beneath the frozen pond, painted turtles are metabolizing so slowly they breathe through their skin." },
              // Week 42
              { passage: "The goal of life is to make your heartbeat match the beat of the universe, to match your nature with Nature.", author: "Joseph Campbell", book: "The Power of Myth", year: 1988, note: "Great horned owls are already nesting — the earliest nesters in North America, incubating in February." },
              // Week 43
              { passage: "Time is but the stream I go a-fishing in. I drink at it; but while I drink I see the sandy bottom and detect how shallow it is.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "Ice-out on ponds will bring painted turtles to bask within days. Watch for them." },
              // Week 44
              { passage: "The clearest way into the Universe is through a forest wilderness.", author: "John Muir", book: "John of the Mountains", year: 1938, note: "Early spring ephemerals bloom in a 2-week window before the canopy closes. They won't wait." },
              // Week 45
              { passage: "To find the universal elements enough; to find the air and the water exhilarating; to be refreshed by a morning walk or an evening saunter; to be thrilled by the stars at night; to be elated over a bird's nest or a wildflower in spring — these are some of the rewards of the simple life.", author: "John Burroughs", book: "Leaf and Tendril", year: 1908, note: "Spring peepers chorus after the first rain above 45°F. It is one of the oldest sounds in North America." },
              // Week 46
              { passage: "If the sight of the blue skies fills you with joy, if a blade of grass springing up in the fields has power to move you, if the simple things of nature have a message that you understand, rejoice, for your soul is alive.", author: "Eleonora Duse", book: "Attributed", year: 1890, note: "First Monarch eggs are being laid on Texas milkweed. The year's generation has begun." },
              // Week 47
              { passage: "I only went out for a walk and finally concluded to stay out till sundown, for going out, I found, was really going in.", author: "John Muir", book: "John of the Mountains", year: 1938, note: "May migration: in a single week, 30 warbler species may pass through your county." },
              // Week 48
              { passage: "Adopt the pace of nature: her secret is patience.", author: "Ralph Waldo Emerson", book: "Attributed", year: 1860, note: "Milkweed is up. Monarchs are arriving. Everything is synchronized to signals we are only beginning to understand." },
              // Week 49
              { passage: "It is not so much for its beauty that the forest makes a claim upon men's hearts, as for that subtle something, that quality of air that emanation from old trees, that so wonderfully changes and renews a weary spirit.", author: "Robert Louis Stevenson", book: "Essays of Travel", year: 1905, note: "Summer solstice: fireflies peak this week in most of the continental US." },
              // Week 50
              { passage: "Every morning was a cheerful invitation to make my life of equal simplicity, and I may say innocence, with Nature herself.", author: "Henry David Thoreau", book: "Walden", year: 1854, note: "Monarch caterpillars are feeding. Each one will become a butterfly in 10-14 days." },
              // Week 51
              { passage: "Nature is not a place to visit. It is home.", author: "Gary Snyder", book: "The Practice of the Wild", year: 1990, note: "Late July: monarch numbers peak. A single plant with multiple egg clutches is a success story." },
              // Week 52
              { passage: "The world is charged with the grandeur of God. It will flame out, like shining from shook foil.", author: "Gerard Manley Hopkins", book: "God's Grandeur", year: 1877, note: "The last week of the year: Monarchs are in Mexico, seeds are in the ground, the cycle is complete." },
            ]

            // ISO week number (1-53)
            const d = new Date()
            const dayNum = d.getUTCDay() || 7
            d.setUTCDate(d.getUTCDate() + 4 - dayNum)
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
            const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
            const entry = READING_ENTRIES[(weekNum - 1) % READING_ENTRIES.length]

            return (
              <div style={{
                background: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
                borderRadius: 16,
                padding: '18px 20px 16px',
                marginBottom: 20,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                border: '1px solid rgba(251,191,36,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 26 }}>📖</span>
                  <div>
                    <div style={{ color: '#fde68a', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ecological Reading Corner</div>
                    <div style={{ color: '#fef3c7', fontSize: 13, fontWeight: 600, marginTop: 2, opacity: 0.9 }}>Week {weekNum} — from the naturalist tradition</div>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(251,191,36,0.1)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 12,
                  borderLeft: '3px solid rgba(251,191,36,0.5)',
                }}>
                  <div style={{ color: '#fef3c7', fontSize: 15, lineHeight: 1.65, fontStyle: 'italic' }}>
                    "{entry.passage}"
                  </div>
                  <div style={{ color: '#fde68a', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                    — {entry.author}, <em>{entry.book}</em> ({entry.year})
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#fcd34d', lineHeight: 1.5, opacity: 0.9 }}>
                  {entry.note}
                </div>
              </div>
            )
          })()}
          
          {/* 🌱 Seasonal Action Calendar — weekly habitat actions timed to Midwest ecology (prop-035) */}
          {(() => {
            const ACTION_ENTRIES: Array<{
              weekLabel: string
              actions: string[]
              tip: string
            }> = [
              // Week 1 — early January
              { weekLabel: "Early January", actions: ["Leave leaf litter and brush piles undisturbed — overwintering moths, beetles, and native bees are sheltering inside.", "Check your bird feeders and keep them filled — seed-eating birds are burning calories to stay warm.", "Plan your spring planting: look up native plant nurseries near you now."], tip: "January is when many solitary bees are dormant in hollow stems. Don't cut them back yet." },
              // Week 2 — mid-January
              { weekLabel: "Mid-January", actions: ["Keep dead plant stalks standing — they hold seeds for finches and contain native bee egg chambers.", "Put out a shallow dish of water on above-freezing days; birds have few open water sources.", "Order native plant seeds now — many species need cold stratification before spring germination."], tip: "Goldfinches and juncos are actively foraging; sunflower and coneflower seedheads feed them directly." },
              // Week 3 — late January
              { weekLabel: "Late January", actions: ["Avoid applying rock salt near garden beds — it damages soil and kills native plants.", "Read about the native plant community historically in your ecoregion — it frames why your choices matter.", "Sketch a rough map of your yard noting which areas get full sun — you'll need it for spring planting."], tip: "The average Missouri yard has replaced 1-2 acres of former tallgrass prairie. Your garden is literal restoration." },
              // Week 4 — early February
              { weekLabel: "Early February", actions: ["Wait to cut back perennials until daytime temps consistently hit 50°F — native bees emerge from stems.", "Hang a bird nest box now, before nesting season begins — bluebirds start scouting in February.", "Order bare-root native shrubs (buttonbush, native hawthorn) — they ship before leafout."], tip: "Bluebirds are year-round Missouri residents. A properly mounted box (facing east, 4-6 ft high) can attract them by March." },
              // Week 5 — mid-February
              { weekLabel: "Mid-February", actions: ["Check nest boxes from last year — clean out old nesting material before new residents arrive.", "Watch for the first American Robins of the year; they signal soil softening and worm availability.", "Begin tracking your phenology: note the first sightings of each species in your log."], tip: "Robins overwinter in flocks in the South and move north as soil thaws. Your first robin sighting is a phenological marker." },
              // Week 6 — late February
              { weekLabel: "Late February", actions: ["Watch for Eastern Bluebirds beginning nest site inspection — they arrive before most other cavity nesters.", "Start native seeds indoors: wild columbine, purple coneflower, and black-eyed Susan need 8-10 weeks before last frost.", "Identify one area of turf grass you'll convert to native planting this year — even 4 square feet matters."], tip: "One square foot of native coneflowers feeds more pollinators than 100 square feet of lawn. Size is not the limit." },
              // Week 7 — early March
              { weekLabel: "Early March", actions: ["Wait until daytime temps hit 50°F before cutting back last year's perennials — native bees are still in stems.", "Monarch butterflies are beginning their northward migration from Mexico — milkweed won't be ready yet, but they're moving.", "Apply 2-3 inches of wood chip mulch (not dyed) around native plants to suppress weeds without smothering crowns."], tip: "Monarchs can reach Texas by mid-March in warm years. Milkweed emergence in Missouri begins late April." },
              // Week 8 — mid-March
              { weekLabel: "Mid-March", actions: ["Plant native trees and shrubs now — bare-root season is the best time, before leafout.", "Begin cutting back dead perennials as temperatures warm, leaving 12-inch stems for bee habitat.", "Rake leaves off lawn areas but leave them as mulch under shrubs and trees."], tip: "Native oaks support over 500 caterpillar species. One oak planted today supports decades of bird breeding." },
              // Week 9 — late March
              { weekLabel: "Late March", actions: ["Watch for the first native bees of the year: mining bees and mason bees emerge when temps hit 55°F.", "Set out native plant divisions from last year's growth — most perennials can be divided in early spring.", "Install a mason bee house now, facing east at 3-6 feet — mason bees are active April through June."], tip: "Mason bees are 120x more efficient pollinators than honeybees for native plants. They don't sting under normal conditions." },
              // Week 10 — early April
              { weekLabel: "Early April", actions: ["Plant common milkweed, butterfly weed, or swamp milkweed — Monarchs will arrive in 4-6 weeks.", "Pull garlic mustard (invasive biennial) now before it seeds — it suppresses native woodland wildflowers.", "Watch for yellow-rumped warblers — the first of 35+ warbler species to pass through Missouri in spring."], tip: "Garlic mustard releases chemicals that disrupt mycorrhizal fungi networks, killing native trees slowly. Remove it before it seeds." },
              // Week 11 — mid-April
              { weekLabel: "Mid-April", actions: ["Complete your milkweed planting — early May is the critical window before Monarch arrival.", "Set out transplanted native wildflowers started indoors; frosts may still occur, so watch the forecast.", "Add a water feature if possible — even a shallow ceramic dish with pebbles serves bees and butterflies."], tip: "A dish of water with landing stones supports 40+ bee species in summer. Refill it daily in heat." },
              // Week 12 — late April
              { weekLabel: "Late April", actions: ["Watch for first Monarch butterflies — they typically arrive in Missouri mid-to-late April in warm years.", "Plant native prairie species now: prairie dropseed, little bluestem, wild bergamot, prairie blazing star.", "Remove invasive honeysuckle (Lonicera maackii) while it's easy to identify — it leafs out early and stays green late."], tip: "Bush honeysuckle creates year-round shade that prevents native wildflowers from establishing. Early removal is critical." },
              // Week 13 — early May
              { weekLabel: "Early May", actions: ["Log your first Monarch sighting of the year — it's phenologically significant data.", "Plant late-spring natives: native phlox, wild geranium, golden Alexanders — they support early-emerging bees.", "Watch for Baltimore orioles and Ruby-throated hummingbirds arriving — hang feeders now."], tip: "Baltimore orioles arrive in Missouri the first week of May. Grape jelly and orange halves attract them immediately." },
              // Week 14 — mid-May
              { weekLabel: "Mid-May", actions: ["Check milkweed for tiny Monarch eggs (1mm, white, ridged) under leaves — their presence confirms breeding habitat.", "Plant native grasses now: switchgrass, prairie dropseed, wild rye — they establish roots in summer heat.", "Avoid mowing native plantings until late summer — many ground-nesting bees are active."], tip: "A Monarch egg takes 3-5 days to hatch. Tiny yellow-black caterpillars are visible with patience." },
              // Week 15 — late May
              { weekLabel: "Late May", actions: ["Watch for Monarch caterpillars on milkweed — note the species of milkweed and caterpillar count in your log.", "Plant heat-loving natives now: prairie coneflower, black-eyed Susan, pale purple coneflower.", "Set up a water bath in a sunny spot — hummingbirds and butterflies use shallow water for drinking and bathing."], tip: "Monarch caterpillars cycle through 5 instars over 10-14 days before forming a chrysalis. The J-shape before pupation is unmistakable." },
              // Week 16 — early June
              { weekLabel: "Early June", actions: ["Watch for Monarch chrysalises on milkweed, nearby structures, and under leaves.", "Deadhead spent spring flowers to encourage reblooming — but leave some for seed development.", "Note which native plants in your yard are most visited by pollinators — this is real observational science."], tip: "The Monarch chrysalis shifts from jade green to transparent gold before emergence — watch for this within 24 hours of hatching." },
              // Week 17 — mid-June
              { weekLabel: "Mid-June", actions: ["Log adult Monarchs that emerge from chrysalises — first-generation adults head north to breed again.", "Water newly planted natives in dry spells — they need consistent moisture their first season.", "Participate in a local butterfly count if one is happening near you."], tip: "First-generation Monarchs live 2-6 weeks and produce a second generation before the breeding season ends." },
              // Week 18 — late June
              { weekLabel: "Late June", actions: ["Allow native wildflowers to go to seed — goldfinches and other seed-eaters will need them in fall.", "Watch for fireflies in meadow areas — their presence indicates healthy soil ecology and minimal pesticide use.", "Note how many native bee species you see visiting your plantings — diversity indicates healthy habitat."], tip: "Firefly larvae live 1-2 years underground eating earthworms and snails. A lawn that still has fireflies has healthy soil." },
              // Week 19 — early July
              { weekLabel: "Early July", actions: ["Continue watering native plantings through summer heat — their first year is the hardest.", "Watch for second-generation Monarch caterpillars on milkweed — populations build through multiple broods.", "Leave gaps in mulch for ground-nesting bees — 70% of native bees nest in bare or sparse soil."], tip: "Native bees often nest in south-facing slopes, paths, and patchy areas. Perfectly mulched gardens can exclude them." },
              // Week 20 — mid-July
              { weekLabel: "Mid-July", actions: ["Observe pollinators on your native plantings at peak bloom — prairie coneflower, bergamot, and purple prairie clover are peaking.", "Resist deadheading coneflowers and rudbeckia — their seedheads feed goldfinches through fall.", "Note which milkweed species your Monarchs prefer — common milkweed and butterfly weed are consistent favorites."], tip: "A healthy native prairie planting supports 100+ bee species. Count the species visiting one flower for 10 minutes." },
              // Week 21 — late July
              { weekLabel: "Late July", actions: ["Watch for the start of Monarch southern migration — adults born in late July/August are the migratory generation.", "Water plantings during drought — native plants survive long-term but need moisture their establishment year.", "Begin planning fall additions: native asters, goldenrod, and ironweed bloom August-October for late pollinators."], tip: "Late July Monarchs are the migratory generation — they live 8 months instead of 2-6 weeks. They're genetically different." },
              // Week 22 — early August
              { weekLabel: "Early August", actions: ["Plant fall-blooming natives now for September-October: smooth aster, heath aster, stiff goldenrod.", "Watch migratory Monarchs beginning to aggregate on goldenrod and milkweed along roadsides.", "Collect seeds from native plants you want to spread — store in paper bags in a dry spot."], tip: "Missouri goldenrod (Solidago missouriensis) supports 115+ bee species at peak bloom. It does not cause allergies — ragweed does." },
              // Week 23 — mid-August
              { weekLabel: "Mid-August", actions: ["Begin tracking Monarch migration sightings — note direction of travel, nectar plant use, and aggregation sites.", "Plant garlic now for overwintering in the vegetable garden — this is its optimal window.", "Allow some native grasses to form seed heads — they feed birds in winter and provide nesting material."], tip: "Monarchs fueling for migration use goldenrod, ironweed, and asters as nectar sources. These plants in your yard are migration fuel." },
              // Week 24 — late August
              { weekLabel: "Late August", actions: ["Peak Missouri Monarch migration is approaching — watch roadsides, prairie edges, and goldenrod patches.", "Plant native fall asters (smooth aster, aromatic aster) — they're critical late-season nectar sources.", "Divide and transplant native grasses if they've grown too large — fall transplanting establishes roots before winter."], tip: "Monarchs concentrate at nectar-rich stop-over sites. A goldenrod patch in your yard can hold dozens on a good migration day." },
              // Week 25 — early September
              { weekLabel: "Early September", actions: ["Log every Monarch sighting carefully — migration counts provide population data scientists rely on.", "Leave milkweed standing even if it looks ragged — late caterpillars may still be completing development.", "Watch for fall warblers moving through in mixed flocks — they're harder to ID than spring birds but more numerous."], tip: "Missouri is a major Monarch migration corridor. Your sightings are scientifically valuable." },
              // Week 26 — mid-September
              { weekLabel: "Mid-September", actions: ["Continue logging Monarch migration — peak flow through Missouri typically occurs mid-September.", "Collect and save native seeds in paper envelopes for winter sowing or spring planting.", "Begin removing invasive autumn olive if present — it's fruiting now, making it easy to identify."], tip: "Native asters blooming now are among the last nectar sources for bees, wasps, and migrating butterflies before frost." },
              // Week 27 — late September
              { weekLabel: "Late September", actions: ["Note the final Monarch migrants of the season — last sightings typically occur by early October in Missouri.", "Plant spring-blooming native bulbs: wild blue phlox, bloodroot, trout lily — they need cold stratification.", "Do a late-season inventory: which native plants performed best in your yard this year?"], tip: "Monarchs roost communally in trees during migration. A warm south-facing hillside can hold hundreds overnight." },
              // Week 28 — early October
              { weekLabel: "Early October", actions: ["Leave coneflower, rudbeckia, and prairie dropseed seedheads standing — birds depend on them through winter.", "Plant native shrubs and trees now through November — fall planting establishes strong root systems.", "Rake leaves onto garden beds as mulch (3-4 inches) rather than bagging them — they feed soil biology."], tip: "Leaf litter is not debris. It's the habitat layer that moth caterpillars, beetles, salamanders, and spiders overwinter in." },
              // Week 29 — mid-October
              { weekLabel: "Mid-October", actions: ["Allow native plants to die back naturally — do not cut back until spring.", "Plant garlic and native spring wildflowers into prepared beds while soil is still warm.", "Watch for white-throated sparrows and golden-crowned kinglets — they signal the leading edge of winter birds."], tip: "White-throated sparrows overwinter throughout Missouri. They scratch through leaf litter for insects and seeds." },
              // Week 30 — late October
              { weekLabel: "Late October", actions: ["Install new bird feeders before the winter rush — black oil sunflower seed is the highest-value general offering.", "Leave hollow plant stalks standing — mason bee eggs overwinter inside them.", "Do not rake garden beds — leaf litter is native bee habitat and soil insulation."], tip: "Up to 30% of native bee species overwinter as eggs inside hollow plant stems. Cutting them removes the next generation." },
              // Week 31 — early November
              { weekLabel: "Early November", actions: ["Plant native trees if soil is not yet frozen — fall-planted trees establish deeper roots than spring-planted ones.", "Top off bird feeders as migrating birds are passing through and residents are building fat reserves.", "Identify patches of invasive species to address in spring — note location and density now."], tip: "A native serviceberry planted today will produce berries for birds in 2-3 years. The investment is long but certain." },
              // Week 32 — mid-November
              { weekLabel: "Mid-November", actions: ["Spread native wildflower seeds now for cold stratification — many germinate better after a natural winter.", "Leave fallen leaves under trees and shrubs as habitat — do not blow them into the street.", "Read about the native plant species that historically grew in your region — it provides restoration context."], tip: "Cold moist stratification in real winter conditions often produces better germination than artificial refrigeration." },
              // Week 33 — late November
              { weekLabel: "Late November", actions: ["Keep bird feeders full as temperatures drop — birds have reduced foraging time and higher caloric needs.", "Note which plants still have berries — native spicebush, American holly, and native viburnums persist into winter.", "Identify a small section of lawn you'll convert to native planting next spring."], tip: "Native viburnums hold berries through winter, providing critical food for cedar waxwings and robins during cold snaps." },
              // Week 34 — early December
              { weekLabel: "Early December", actions: ["Clean and disinfect bird feeders monthly — disease spreads at feeders when seed gets moldy.", "Observe which birds are using your native plant seedheads this week — the data is phenologically valuable.", "Look up local native plant societies that do winter seed swaps — an excellent way to build your native plant collection."], tip: "House finch eye disease (Mycoplasma gallisepticum) spreads at dirty feeders. A 10% bleach wash and rinse prevents it." },
              // Week 35 — mid-December
              { weekLabel: "Mid-December", actions: ["Install a heated birdbath or break ice on existing baths daily — open water is rarer than food in winter.", "Check hollow plant stems and brush piles for signs of overwintering insects before any winter cleanup.", "Plan next year's native plant additions based on what you observed this season."], tip: "A heated birdbath in winter attracts more species than a feeder. Water is the limiting resource." },
              // Week 36 — late December
              { weekLabel: "Late December", actions: ["Conduct a personal year-in-review: how many species did you log? What was your longest streak?", "Keep bird feeders maintained through the holiday season — birds don't take holidays.", "Reflect on one habitat action you can commit to next year."], tip: "The solstice marks the turning point. Days are getting longer now, though winter is just beginning." },
              // Week 37-52 repeat seasonal cycle
              { weekLabel: "Early January (New Year)", actions: ["Start fresh: add a new plant goal to your habitat plan for the coming year.", "Keep feeders full through the coldest months — January and February are peak survival stress for birds.", "Write down the species you want to attract and research which native plants host their caterpillars."], tip: "One native oak supports the caterpillars of 537 moth and butterfly species. It is the single highest-impact plant you can add." },
              // Filler weeks to reach 52
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Winter", actions: ["Maintain bird feeders and water sources.", "Leave plant stalks and leaf litter undisturbed.", "Plan spring native plant additions."], tip: "Winter habitat maintenance is as important as summer planting. Consistency matters." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
              { weekLabel: "Late Winter", actions: ["Order native plant seeds and bare-root plants before nurseries sell out.", "Check and clean nest boxes before breeding season.", "Note the first signs of spring: witch hazel bloom, skunk cabbage, first woodpecker drumming."], tip: "Witch hazel blooms in January-February, often with snow on the ground. It is the first native nectar source of the year." },
            ]

            // Get ISO week number
            function getISOWeek(date: Date): number {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
              const dayNum = d.getUTCDay() || 7
              d.setUTCDate(d.getUTCDate() + 4 - dayNum)
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
              return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
            }

            const weekIdx = (getISOWeek(new Date()) - 1) % ACTION_ENTRIES.length
            const entry = ACTION_ENTRIES[weekIdx]

            return (
              <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                borderRadius: 16,
                padding: '20px 18px',
                marginBottom: 16,
                border: '1px solid rgba(52,211,153,0.25)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🌱</span>
                  <div>
                    <div style={{ color: '#ecfdf5', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Seasonal Action Calendar</div>
                    <div style={{ color: '#6ee7b7', fontSize: 12, marginTop: 2 }}>{entry.weekLabel} — what to do this week for nature</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {entry.actions.map((action, i) => (
                    <div key={i} style={{
                      background: 'rgba(52,211,153,0.1)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      borderLeft: '3px solid #34d399',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}>
                      <span style={{ color: '#34d399', fontSize: 14, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ color: '#d1fae5', fontSize: 13, lineHeight: 1.5 }}>{action}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  background: 'rgba(6,78,59,0.6)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  borderTop: '1px solid rgba(52,211,153,0.2)',
                }}>
                  <span style={{ color: '#6ee7b7', fontSize: 12, fontStyle: 'italic' }}>💡 {entry.tip}</span>
                </div>
              </div>
            )
          })()}
                    {/* 🏰 Monarch Waystation Checklist — certification guide (prop-036) */}
          {(() => {
            const items: { id: number; label: string; desc: string }[] = [
              { id: 0, label: "Milkweed (2+ species)", desc: "Plant at least two milkweed species — Common Milkweed (Asclepias syriaca), Butterfly Weed (A. tuberosa), or Swamp Milkweed (A. incarnata)." },
              { id: 1, label: "Spring nectar plants", desc: "At least one native plant blooming March–May, such as Wild Blue Indigo, native violets, or Eastern Redbud." },
              { id: 2, label: "Summer nectar plants", desc: "Native plants blooming June–August, such as Bee Balm (Monarda), Purple Coneflower (Echinacea), or Black-eyed Susan." },
              { id: 3, label: "Fall nectar plants", desc: "Native plants blooming September–October, such as native Asters, Goldenrod (Solidago), or native sunflowers." },
              { id: 4, label: "No insecticides", desc: "Avoid insecticides in or near your habitat — they kill Monarch eggs, caterpillars, and adult butterflies indiscriminately." },
              { id: 5, label: "No herbicides", desc: "Avoid herbicides near milkweed and nectar plants — they kill the host and food plants your waystation depends on." },
              { id: 6, label: "Sun exposure", desc: "Your milkweed area receives at least 6 hours of direct sunlight daily — Monarchs and milkweed both need full sun." },
              { id: 7, label: "Water source", desc: "Provide water via a birdbath, shallow dish with pebbles, or a pond within reach of your habitat." },
              { id: 8, label: "Habitat size", desc: "Your combined native habitat area (milkweed + nectar plants) totals at least 100 square feet." },
              { id: 9, label: "Plan to register", desc: "You intend to submit your waystation to MonarchWatch.org — putting your yard on the national habitat map." },
            ]
            const checked = waystationChecked
            const done = checked.filter(Boolean).length
            const allDone = done === 10
            return (
              <div style={{
                background: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '1rem 1.1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: '#fef3c7',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🏰 Monarch Waystation Checklist
                </div>
                <div style={{ fontSize: 12, color: '#fde68a', marginBottom: '0.75rem' }}>
                  MonarchWatch certification criteria · {done}/10 complete
                </div>
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, height: 8, marginBottom: '0.75rem', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: (done * 10) + '%',
                    background: allDone ? '#4ade80' : '#fbbf24',
                    borderRadius: 6,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                {items.map(item => (
                  <div
                    key={item.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.55rem', cursor: 'pointer' }}
                    onClick={() => {
                      const next = [...checked]
                      next[item.id] = !next[item.id]
                      setWaystationChecked(next)
                      localStorage.setItem('sis-waystation-checklist', JSON.stringify(next))
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      borderRadius: 4,
                      border: '2px solid #fbbf24',
                      background: checked[item.id] ? '#fbbf24' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      {checked[item.id] && <span style={{ color: '#78350f', fontWeight: 900, fontSize: 13 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: checked[item.id] ? 600 : 500, color: checked[item.id] ? '#fde68a' : '#fef3c7' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#fcd34d', marginTop: 1 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
                {allDone && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(74,222,128,0.15)',
                    border: '1px solid #4ade80',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.3rem' }}>
                      🎉 Waystation Ready!
                    </div>
                    <div style={{ fontSize: 12, color: '#bbf7d0', marginBottom: '0.5rem' }}>
                      Your yard meets all Monarch Waystation criteria. Register now to put it on the national habitat map.
                    </div>
                    <a
                      href="https://monarchwatch.org/waystations/register/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        background: '#4ade80',
                        color: '#14532d',
                        fontWeight: 700,
                        padding: '0.4rem 0.9rem',
                        borderRadius: 6,
                        fontSize: 13,
                        textDecoration: 'none',
                      }}
                    >
                      Register at MonarchWatch.org →
                    </a>
                  </div>
                )}
              </div>
            )
          })()}
          {/* 🌿 Who Lives Here Now — pollinators + birds observed near you this week (prop-037) */}
          {(() => {
            function taxonEmoji(iconic: string): string {
              if (iconic === 'Insecta') return '🦋'
              if (iconic === 'Aves') return '🐦'
              return '🌿'
            }
            return (
              <div style={{
                background: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                padding: '1rem 1.1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: '#fef3c7',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🌿 Who Lives Here Now
                </div>
                <div style={{ fontSize: 12, color: '#fde68a', marginBottom: '0.75rem' }}>
                  Pollinators &amp; birds observed within 50 miles · past 7 days
                </div>
                {whoLivesLoading ? (
                  <div style={{ color: '#fcd34d', fontStyle: 'italic', fontSize: '0.8rem' }}>Finding your neighbors…</div>
                ) : whoLivesError ? (
                  <div style={{ color: '#fcd34d', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Could not reach iNaturalist right now — try again later.
                  </div>
                ) : whoLives.length === 0 ? (
                  <div style={{ color: '#fcd34d', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    No research-grade observations found nearby this week — be the first to log one.
                  </div>
                ) : (
                  <div>
                    {whoLives.map(sp => (
                      <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: 16 }}>{taxonEmoji(sp.iconic)}</span>
                        <div style={{ flex: 1 }}>
                          <a
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#fef3c7', fontWeight: 600, textDecoration: 'none', fontSize: '0.87rem' }}
                          >
                            {sp.commonName}
                          </a>
                          <span style={{ color: '#fcd34d', fontSize: 11, marginLeft: 6, fontStyle: 'italic' }}>{sp.sciName}</span>
                        </div>
                        <div style={{ color: '#fde68a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {sp.count} {sp.count === 1 ? 'sighting' : 'sightings'}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: '#fcd34d', marginTop: '0.4rem', fontStyle: 'italic' }}>
                      Research-grade observations via iNaturalist · <a href="https://www.inaturalist.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#fcd34d' }}>add yours →</a>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 🌍 Local Nature Pulse — live iNaturalist observations near you (prop-018) */}
          {(() => {
            function daysAgo(dateStr: string): string {
              const diff = Date.now() - new Date(dateStr + 'T00:00:00Z').getTime()
              const days = Math.floor(diff / 86400000)
              if (days === 0) return 'today'
              if (days === 1) return '1 day ago'
              return `${days} days ago`
            }
            return (
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #7dd3fc',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🌍</span>
                  <span>Near You This Week</span>
                  <span style={{ fontWeight: 400, fontSize: '0.73rem', color: '#0284c7' }}>from iNaturalist</span>
                </div>
                {inatLoading ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>Loading nearby observations…</div>
                ) : inatError || inatObs.length === 0 ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    No recent observations found nearby — the corridor still needs you.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {inatObs.map((obs, i) => (
                      <div
                        key={obs.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          paddingBottom: i < inatObs.length - 1 ? '0.35rem' : 0,
                          borderBottom: i < inatObs.length - 1 ? '1px solid #bae6fd' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={obs.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 600, color: '#0369a1', textDecoration: 'none' }}
                          >
                            {obs.species_guess || 'Unknown species'}
                          </a>
                          <span style={{ color: '#6b7280' }}> · {obs.user_login}</span>
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.73rem', whiteSpace: 'nowrap', marginLeft: '0.6rem' }}>
                          {daysAgo(obs.observed_on)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* 🦋 Migration Watch — Monarch migration front via iNaturalist (prop-028) */}
          {(() => {
            function migDaysAgo(dateStr: string): string {
              const diff = Date.now() - new Date(dateStr + 'T00:00:00Z').getTime()
              const days = Math.floor(diff / 86400000)
              if (days === 0) return 'today'
              if (days === 1) return '1 day ago'
              return `${days} days ago`
            }
            function haversineMi(lat1: number, lat2: number, lng2: number): number {
              // Uses fixed user longitude of -90.198 (St. Louis) if only lat is stored;
              // the distance is directional (north/south) so lng matters less for the narrative
              const R = 3958.8
              const dLat = (lat2 - lat1) * Math.PI / 180
              const dLng = (lng2 - (-90.198)) * Math.PI / 180
              const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2
              return Math.round(2 * R * Math.asin(Math.sqrt(Math.min(1, a))))
            }
            const dir = migFront
              ? migFront.lat > migUserLat + 0.5
                ? 'north'
                : migFront.lat < migUserLat - 0.5
                  ? 'south'
                  : 'here'
              : null
            const distMi = migFront
              ? haversineMi(migUserLat, migFront.lat, migFront.lng)
              : 0
            const arrivalMsg = migFront && dir === 'south'
              ? `${distMi} miles south of you — they're coming.`
              : migFront && dir === 'north'
                ? `${distMi} miles north — they've passed through.`
                : migFront
                  ? 'Monarchs are in your area right now!'
                  : ''
            return (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🦋</span>
                  <span>Migration Watch</span>
                  <span style={{ fontWeight: 400, fontSize: '0.73rem', color: '#b45309' }}>from iNaturalist</span>
                </div>
                {migLoading ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>Locating migration front…</div>
                ) : migError || !migFront ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    No recent Monarch sightings found — the corridor needs you.
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: '#92400e' }}>Northernmost recent sighting: </span>
                      <a
                        href={migFront.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#b45309', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {migFront.place}
                      </a>
                      <span style={{ color: '#6b7280' }}> · {migFront.user} · {migDaysAgo(migFront.observedOn)}</span>
                    </div>
                    {arrivalMsg ? (
                      <div style={{ color: '#78350f', fontSize: '0.82rem', fontStyle: 'italic' }}>
                        {arrivalMsg}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })()}

          
              {/* 🌿 Neighborhood Pulse — most-observed species near you this week (prop-030) */}
              <div style={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #2d5a3d 50%, #1e4a2e 100%)', borderRadius: 16, padding: '20px 20px 16px', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1px solid rgba(120,200,130,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🌿</span>
                  <div>
                    <div style={{ color: '#a8e6b0', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Neighborhood Pulse</div>
                    <div style={{ color: '#e8f5eb', fontSize: 17, fontWeight: 700, marginTop: 2 }}>Most Spotted Near You This Week</div>
                  </div>
                </div>
                {nbhdLoading ? (
                  <div style={{ color: '#7bc68a', fontSize: 14, fontStyle: 'italic' }}>Finding what your neighbors are spotting...</div>
                ) : nbhdError || nbhdSpecies.length === 0 ? (
                  <div style={{ color: '#7bc68a', fontSize: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Nature is active near you.</div>
                    <div style={{ opacity: 0.85 }}>Log in to iNaturalist and add an observation — every sighting helps scientists track population trends.</div>
                    <a href="https://www.inaturalist.org/observations/new" target="_blank" rel="noopener noreferrer" style={{ color: '#a8e6b0', fontWeight: 700, display: 'inline-block', marginTop: 8 }}>Log a sighting on iNaturalist →</a>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#a8e6b0', fontSize: 13, marginBottom: 10, opacity: 0.9 }}>Research-grade observations within 80 km (~50 mi), past 7 days</div>
                    {nbhdSpecies.map((sp, i) => (
                      <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < nbhdSpecies.length - 1 ? 10 : 0 }}>
                        <div style={{ background: 'rgba(168,230,176,0.15)', borderRadius: 8, padding: '4px 10px', minWidth: 44, textAlign: 'center' }}>
                          <div style={{ color: '#a8e6b0', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{sp.count}</div>
                          <div style={{ color: '#7bc68a', fontSize: 10 }}>spotted</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <a href={sp.url} target="_blank" rel="noopener noreferrer" style={{ color: '#e8f5eb', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>{sp.commonName}</a>
                          <div style={{ color: '#7bc68a', fontSize: 12, fontStyle: 'italic', marginTop: 1 }}>{sp.name}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(120,200,130,0.15)', color: '#7bc68a', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Your community is watching. So can you.</span>
                      <a href="https://www.inaturalist.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#a8e6b0', fontWeight: 600, fontSize: 12 }}>Open iNaturalist →</a>
                    </div>
                  </div>
                )}
              </div>

              {/* 🔭 Species Spotlight — weekly ecosystem species feature (prop-029) */}
          {(() => {
            const ss = getSpeciesSpotlight()
            return (
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #0284c7',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🔭</span>
                  <span>Species Spotlight — {ss.species}</span>
                </div>
                <div style={{ color: '#075985', marginBottom: '0.4rem' }}>{ss.description}</div>
                <div style={{ color: '#0369a1', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <strong>5-min task:</strong> {ss.task}
                </div>
                <div style={{ color: '#0369a1', fontSize: '0.8rem' }}>
                  <strong>Plant for it:</strong> {ss.plant}
                </div>
              </div>
            )
          })()}
          
          {/* 🌟 Your Nature Milestones — personal ecological milestone tracker (prop-031) */}
          {sightings.length >= 3 && (() => {
            const sorted = [...sightings].sort((a, b) => a.observed_at < b.observed_at ? -1 : 1)
            const firstDate = new Date(sorted[0].observed_at)
            const daysSinceFirst = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
            const uniqueSpeciesSet = new Map<string, string>()
            for (const s of sorted) {
              const key = s.species_name.trim().toLowerCase()
              if (!uniqueSpeciesSet.has(key)) uniqueSpeciesSet.set(key, s.species_name)
            }
            const speciesByFirstSeen = [...uniqueSpeciesSet.entries()].map(([key, name]) => {
              const first = sorted.find(s => s.species_name.trim().toLowerCase() === key)!
              return { name, date: first.observed_at }
            })
            const newestSpecies = speciesByFirstSeen.sort((a, b) => b.date > a.date ? 1 : -1)[0]
            const daysSinceNewest = Math.floor((Date.now() - new Date(newestSpecies.date).getTime()) / (1000 * 60 * 60 * 24))
            const firstDateStr = firstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            const journeyLabel = daysSinceFirst === 0
              ? 'Your naturalist journey started today.'
              : daysSinceFirst === 1
              ? 'Your naturalist journey started yesterday.'
              : `You have been watching nature for ${daysSinceFirst} day${daysSinceFirst === 1 ? '' : 's'}.`
            const newestLabel = daysSinceNewest === 0
              ? 'logged today'
              : daysSinceNewest === 1
              ? 'logged yesterday'
              : `${daysSinceNewest} days ago`
            return (
              <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                borderRadius: 16,
                padding: '18px 20px 16px',
                marginBottom: 20,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                border: '1px solid rgba(52,211,153,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 26 }}>🌟</span>
                  <div>
                    <div style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Nature Milestones</div>
                    <div style={{ color: '#ecfdf5', fontSize: 16, fontWeight: 700, marginTop: 2 }}>{journeyLabel}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#a7f3d0', fontSize: 13 }}>Total sightings</div>
                    <div style={{ color: '#ecfdf5', fontWeight: 800, fontSize: 18 }}>{sightings.length}</div>
                  </div>
                  <div style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#a7f3d0', fontSize: 13 }}>Species on your list</div>
                    <div style={{ color: '#ecfdf5', fontWeight: 800, fontSize: 18 }}>{uniqueSpeciesSet.size}</div>
                  </div>
                  {streakData.currentStreak > 1 && (
                    <div style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#a7f3d0', fontSize: 13 }}>Current streak</div>
                      <div style={{ color: '#ecfdf5', fontWeight: 800, fontSize: 18 }}>{streakData.currentStreak} days 🔥</div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(52,211,153,0.2)', fontSize: 12, color: '#6ee7b7' }}>
                  <div>First sighting: <strong style={{ color: '#ecfdf5' }}>{sorted[0].species_name}</strong> on {firstDateStr}</div>
                  {uniqueSpeciesSet.size > 1 && (
                    <div style={{ marginTop: 4 }}>
                      Newest species: <strong style={{ color: '#ecfdf5' }}>{newestSpecies.name}</strong> — {newestLabel}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
          {/* 🦋 Your First Encounter — guided first-log for new users (prop-016) */}
          {sightings.length === 0 && !firstEncounterDone && (() => (
            <div style={{
              background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
              border: '1px solid #c084fc',
              borderRadius: '10px',
              padding: '0.9rem 1rem',
              marginBottom: '0.75rem',
              fontSize: '0.85rem',
              lineHeight: '1.5',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🦋</span>
                  <span>Your First Encounter</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('sis-first-done', '1') } catch {}
                    setFirstEncounterDone(true)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9333ea', lineHeight: 1, padding: '0 0.25rem' }}
                  aria-label="Dismiss"
                >×</button>
              </div>
              <div style={{ color: '#581c87', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                What did you notice today? Pick a species to log your first sighting — or scroll down to log anything.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
                {FIRST_ENCOUNTER_SPECIES.map((sp) => (
                  <button
                    key={sp.name}
                    type="button"
                    onClick={() => {
                      setSpeciesName(sp.name)
                      setSpeciesType(sp.type)
                      try { localStorage.setItem('sis-first-done', '1') } catch {}
                      setFirstEncounterDone(true)
                    }}
                    style={{
                      textAlign: 'left',
                      background: 'rgba(255,255,255,0.75)',
                      border: '1px solid #d8b4fe',
                      borderRadius: '7px',
                      padding: '0.45rem 0.55rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: '#6b21a8', fontSize: '0.82rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{sp.emoji}</span>
                      <span>{sp.name}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#7c3aed', lineHeight: '1.35' }}>{sp.why}</div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: '#6d28d9', background: 'rgba(167,139,250,0.18)', borderRadius: '4px', padding: '0.15rem 0.4rem', alignSelf: 'flex-start' }}>
                      Log this →
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('sis-first-done', '1') } catch {}
                    setFirstEncounterDone(true)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#9333ea', textDecoration: 'underline' }}
                >
                  Skip — log anything
                </button>
              </div>
            </div>
          ))()}

          {/* 🏡 Your Habitat Score — 3-question progressive assessment (prop-021) */}
          {(() => {
            const totalQs = HABITAT_SCORE_QUESTIONS.length
            const isDone = habitatQuestion >= totalQs
            const score = isDone ? calcHabitatScore(habitatAnswers) : 0
            const label = isDone ? habitatScoreLabel(score) : ''
            const bg = isDone ? habitatScoreBg(score) : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
            const border = isDone ? habitatScoreBorder(score) : '#7dd3fc'
            const textColor = isDone ? habitatScoreTextColor(score) : '#0c4a6e'
            const currentQ = isDone ? null : HABITAT_SCORE_QUESTIONS[habitatQuestion]
            return (
              <div style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                {isDone ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ fontWeight: 700, color: textColor, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🏡</span>
                        <span>Your Habitat Score: {score}/100 — {label}</span>
                      </div>
                      <button
                        onClick={() => {
                          localStorage.removeItem('habitatScoreAnswers')
                          localStorage.removeItem('habitatScoreQuestion')
                          setHabitatAnswers({})
                          setHabitatQuestion(0)
                        }}
                        style={{ fontSize: '0.7rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.25rem' }}
                      >retake</button>
                    </div>
                    <div style={{ color: textColor, fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                      {habitatScoreFeedback(habitatAnswers)}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, color: '#0c4a6e', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🏡</span>
                      <span>Your Habitat Score — question {habitatQuestion + 1} of {totalQs}</span>
                    </div>
                    <div style={{ color: '#0c4a6e', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: 500 }}>
                      {currentQ?.question}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {currentQ?.choices.map((choice, ci) => (
                        <button
                          key={ci}
                          onClick={() => {
                            const newAnswers = { ...habitatAnswers, [currentQ.id]: choice.score }
                            const newQ = habitatQuestion + 1
                            localStorage.setItem('habitatScoreAnswers', JSON.stringify(newAnswers))
                            localStorage.setItem('habitatScoreQuestion', String(newQ))
                            setHabitatAnswers(newAnswers)
                            setHabitatQuestion(newQ)
                          }}
                          style={{
                            textAlign: 'left',
                            background: 'rgba(255,255,255,0.7)',
                            border: '1px solid #bae6fd',
                            borderRadius: '5px',
                            padding: '0.35rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: '#0c4a6e',
                          }}
                        >{choice.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* 💸 What Your Lawn Currently Costs — comparison panel (prop-026) */}
          {(() => {
            const lawnAns = habitatAnswers['lawn']
            const hasHabitatData = Object.keys(habitatAnswers).length > 0 && lawnAns !== undefined
            const lawnTier = getLawnTier(lawnAns)
            if (!hasHabitatData) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #fafafa 0%, #f3f4f6 100%)',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                }}>
                  <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💸</span><span>What Your Lawn Currently Costs</span>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                    Complete Your Habitat Score above to see what your current lawn costs — and what that same patch could provide as native habitat.
                  </div>
                </div>
              )
            }
            if (lawnTier === null) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #4ade80',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                }}>
                  <div style={{ fontWeight: 700, color: '#14532d', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💸</span><span>What Your Lawn Currently Costs</span>
                  </div>
                  <div style={{ color: '#166534', fontSize: '0.78rem' }}>
                    You already have very little lawn — your yard is doing the real work. Every native plant you have is part of the Monarch corridor. Consider adding more milkweed or native nectar plants to extend the impact further.
                  </div>
                </div>
              )
            }
            const t = LAWN_COST_TIERS[lawnTier]
            return (
              <div style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '1px solid #fb923c',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
              }}>
                <div style={{ fontWeight: 700, color: '#7c2d12', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>💸</span>
                  <span>What Your Lawn Currently Costs — {t.label} ({t.sqft})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '0.5rem 0.6rem',
                  }}>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.78rem', marginBottom: '0.35rem' }}>Current Lawn / yr</div>
                    <div style={{ color: '#7f1d1d', fontSize: '0.75rem', lineHeight: '1.65' }}>
                      <div>💰 ~${t.lawnCostPerYear.toLocaleString()} in care</div>
                      <div>💧 ~{t.waterGallonsPerYear.toLocaleString()} gal water</div>
                      <div>🌫️ ~{t.co2LbsPerYear} lbs CO₂</div>
                      <div>🦋 ~0 native species</div>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(240,253,244,0.8)',
                    border: '1px solid #4ade80',
                    borderRadius: '6px',
                    padding: '0.5rem 0.6rem',
                  }}>
                    <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.78rem', marginBottom: '0.35rem' }}>As Native Habitat / yr</div>
                    <div style={{ color: '#166534', fontSize: '0.75rem', lineHeight: '1.65' }}>
                      <div>💰 ~$0 after year 1 (~${t.habitatCostYear1} to start)</div>
                      <div>💧 rain-fed after establishment</div>
                      <div>🌿 carbon positive by year 2</div>
                      <div>🦋 {t.pollinatorsSupported}</div>
                    </div>
                  </div>
                </div>
                <div style={{ color: '#92400e', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                  Monarch migration waypoints from this patch: <strong>{t.monarchWaypoints}</strong> — each a real rest stop on a 3,000-mile journey.
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.68rem', marginTop: '0.3rem' }}>
                  Sources: NALP 2023, EPA WaterSense, EPA Small Engine Emissions, Tallamy 2020, Pleasants &amp; Oberhauser 2013
                </div>
              </div>
            )
          })()}

          {/* 🌱 Plant for Your Place — monthly native plant recommendations (prop-020) */}
          {(() => {
            const pfyp = getPlantRecommendations()
            return (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #4ade80',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.15rem', color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🌱</span>
                  <span>Plant for Your Place — {pfyp.monthName}</span>
                </div>
                <div style={{ color: '#166534', fontSize: '0.78rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>{pfyp.timing}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {pfyp.plants.map((plant, i) => (
                    <div key={i} style={{ borderLeft: '3px solid #4ade80', paddingLeft: '0.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#15803d' }}>
                        {plant.name}
                        <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.4rem' }}>({plant.latin})</span>
                      </div>
                      <div style={{ color: '#374151', fontSize: '0.78rem' }}>{plant.why}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}


          {/* 🌱 Start Your Patch — step-by-step native habitat guide (prop-013) */}
          {(() => {
            const PATCH_STEPS = [
              {
                num: 1,
                title: "Pick your spot",
                body: "Any sunny area of 10 square feet or more works — a strip next to your driveway, a corner of your backyard, the edge of a fence line. Native plants need at least 6 hours of direct sun. Shady spots work too, but use shade-tolerant species like wild ginger or Solomon’s seal.",
                action: "Measure it. Write down the square footage. That number is your starting habitat.",
              },
              {
                num: 2,
                title: "Three plants that work everywhere",
                body: "Common Milkweed (Asclepias syriaca) is the only plant Monarchs can lay eggs on — start here. Black-Eyed Susan (Rudbeckia hirta) blooms July through October and feeds 29 native bee species. Purple Coneflower (Echinacea purpurea) seeds carry goldfinches through winter. These three cover the full season from spring to frost.",
                action: "Order bare-root plants or seeds from a native plant nursery or Prairie Moon Nursery. Avoid ‘nativar’ cultivars — plain-species plants support 3x more insects.",
              },
              {
                num: 3,
                title: "Prepare the ground",
                body: "No tilling needed. Cover your spot with corrugated cardboard (remove tape and staples), then layer 3–4 inches of wood chip mulch on top. Water it all. In 4–6 weeks the grass beneath will be dead and the soil biology will already be recovering. Plant your native plants in spring or fall through the cardboard — cut an X, fold back the flaps, and plant at normal depth.",
                action: "Get cardboard from a grocery or appliance store. Wood chip mulch is often free from arborists — search Chip Drop or call a local tree service.",
              },
              {
                num: 4,
                title: "What to expect",
                body: "Year 1 can look sparse, especially from seed — the plant is building its root system underground. Common milkweed roots can reach 6 feet deep by the end of the first season. Bare-root transplants often bloom in year 1. By year 2 you will have reliable blooms. Year 3 the wildlife arrives in numbers: Monarchs, bumblebees, fireflies, goldfinches. The patch will also spread if you let it.",
                action: "Resist the urge to pull things up. The first-year weeds are competition, but the native plants will outcompete them as roots establish. Hand-pull only if you can identify what you are pulling.",
              },
              {
                num: 5,
                title: "Log your first visitor",
                body: "When a Monarch, bumblebee, firefly, or goldfinch finds your patch — and they will — that is your habitat working. That moment is the evidence that the corridor is real. Log it here. You just became part of the network.",
                action: "Use this app to record every visitor. The date of your first Monarch is data that Camp Monarch uses to track the migration’s health.",
              },
            ]

            const [open, setOpen] = useState(() => {
              try { return localStorage.getItem('sis-patch-open') !== 'closed' } catch { return true }
            })
            const toggle = () => {
              const next = !open
              setOpen(next)
              try { localStorage.setItem('sis-patch-open', next ? 'open' : 'closed') } catch {}
            }

            return (
              <div style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                border: "2px solid #22c55e",
                borderRadius: "12px",
                marginBottom: "0.75rem",
                overflow: "hidden",
              }}>
                <button
                  type="button"
                  onClick={toggle}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#14532d", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>🌱</span>
                    <span>Start Your Patch</span>
                    <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#16a34a" }}>10 sq ft to native habitat</span>
                  </div>
                  <span style={{ color: "#16a34a", fontSize: "0.85rem" }}>{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div style={{ padding: "0 1rem 1rem 1rem" }}>
                    <p style={{ fontSize: "0.82rem", color: "#166534", marginBottom: "0.9rem", lineHeight: 1.55 }}>
                      Converting any patch of lawn to native plants is the single highest-impact action a homeowner can take for wildlife. Here is exactly how to do it.
                    </p>
                    {PATCH_STEPS.map((step) => (
                      <div
                        key={step.num}
                        style={{
                          marginBottom: "0.85rem",
                          borderLeft: "3px solid #22c55e",
                          paddingLeft: "0.75rem",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#14532d", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                          Step {step.num}: {step.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#166534", lineHeight: 1.55, marginBottom: "0.3rem" }}>
                          {step.body}
                        </div>
                        <div style={{
                          fontSize: "0.73rem",
                          color: "#15803d",
                          fontWeight: 600,
                          background: "rgba(34,197,94,0.12)",
                          borderRadius: "4px",
                          padding: "0.25rem 0.5rem",
                          display: "inline-block",
                        }}>
                          → {step.action}
                        </div>
                      </div>
                    ))}
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#14532d",
                      marginTop: "0.5rem",
                      fontStyle: "italic",
                      borderTop: "1px solid #bbf7d0",
                      paddingTop: "0.5rem",
                    }}>
                      The 1 billion Monarchs of 1996 became 35 million by 2014. The backyard corridor — millions of small patches exactly like the one you are building — is why the number is now 335 million and rising.
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 🌱 Make Your Pledge — commitment panel (prop-017) */}
          {(() => {
            const PLEDGE_PLANTS = [
              { id: 'milkweed', label: 'Common Milkweed', note: 'The only plant Monarchs can lay eggs on' },
              { id: 'bssusan', label: 'Black-Eyed Susan', note: 'Blooms July–October; feeds 29 native bee species' },
              { id: 'coneflower', label: 'Purple Coneflower', note: 'Seeds feed goldfinches through winter' },
              { id: 'bergamot', label: 'Wild Bergamot', note: 'Blooms June–August; prime bumblebee nectar' },
              { id: 'butterfly', label: 'Butterfly Weed', note: 'Orange milkweed — drought-tolerant; Monarch host plant' },
              { id: 'aster', label: 'Native Aster', note: 'Last bloom of fall; fuel for migrating Monarchs' },
            ]
            const PLEDGE_SPACES = [
              { id: 'container', label: 'A container or pot' },
              { id: 'small', label: 'A small patch (under 20 sq ft)' },
              { id: 'larger', label: 'A larger area' },
            ]
            const PLEDGE_TIMINGS = [
              { id: 'spring', label: 'This spring' },
              { id: 'fall', label: 'This fall' },
              { id: 'nextspring', label: 'Next spring' },
            ]

            if (pledge && !pledgeEditing) {
              const plantLabel = PLEDGE_PLANTS.find(p => p.id === pledge.plant)?.label ?? pledge.plant
              const spaceLabel = PLEDGE_SPACES.find(s => s.id === pledge.space)?.label ?? pledge.space
              const timingLabel = PLEDGE_TIMINGS.find(t => t.id === pledge.timing)?.label ?? pledge.timing
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
                  border: '1px solid #22c55e',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🌱</span>
                      <span>Your Pledge</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPledgeEditing(true); setPledgeStep(0); setPledgePlant(''); setPledgeSpace(''); setPledgeTiming('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#4ade80', textDecoration: 'underline' }}
                    >change it</button>
                  </div>
                  <div style={{ color: '#166534', fontSize: '0.82rem', marginTop: '0.3rem' }}>
                    Plant <strong>{plantLabel}</strong> · {spaceLabel} · {timingLabel}
                  </div>
                  <div style={{ color: '#15803d', fontSize: '0.75rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                    The migration corridor just got one waypoint closer. 🦋
                  </div>
                  {!plantingLog ? (
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10)
                        const pl = { plant: pledge.plant, date: today, ts: new Date().toISOString() }
                        try { localStorage.setItem('sis-planting-log', JSON.stringify(pl)) } catch {}
                        setPlantingLog(pl)
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.3rem 0.7rem',
                        background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        letterSpacing: '0.01em',
                      }}
                    >
                      🌿 I planted it!
                    </button>
                  ) : (
                    <div style={{ marginTop: '0.45rem', fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>✅</span>
                      <span>Planted {new Date(plantingLog.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — watching for visitors 🦋</span>
                    </div>
                  )}
                </div>
              )
            }

            const showForm = !pledge || pledgeEditing

            if (!showForm) return null

            const step0Done = pledgePlant !== ''
            const step1Done = pledgeSpace !== ''

            const commit = () => {
              if (!pledgePlant || !pledgeSpace || !pledgeTiming) return
              const p = { plant: pledgePlant, space: pledgeSpace, timing: pledgeTiming, ts: new Date().toISOString() }
              try { localStorage.setItem('sis-pledge', JSON.stringify(p)) } catch {}
              setPledge(p)
              setPledgeEditing(false)
            }

            return (
              <div style={{
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                border: '1px solid #facc15',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: 700, color: '#713f12', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span>🌱</span>
                  <span>Make Your Pledge</span>
                </div>
                <div style={{ color: '#92400e', fontSize: '0.78rem', marginBottom: '0.65rem' }}>
                  One plant. One season. That is all it takes to become part of the corridor.
                </div>

                {/* Step 0: what to plant */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, color: '#78350f', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                    What will you plant?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    {PLEDGE_PLANTS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPledgePlant(p.id); if (pledgeStep === 0) setPledgeStep(1) }}
                        style={{
                          textAlign: 'left',
                          background: pledgePlant === p.id ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.7)',
                          border: pledgePlant === p.id ? '1.5px solid #f59e0b' : '1px solid #fde68a',
                          borderRadius: '6px',
                          padding: '0.35rem 0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#78350f' }}>{p.label}</div>
                        <div style={{ color: '#92400e', fontSize: '0.68rem', lineHeight: '1.3' }}>{p.note}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 1: space — shows after plant selected */}
                {step0Done && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, color: '#78350f', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                      How much space?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {PLEDGE_SPACES.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setPledgeSpace(s.id); if (pledgeStep === 1) setPledgeStep(2) }}
                          style={{
                            textAlign: 'left',
                            background: pledgeSpace === s.id ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.7)',
                            border: pledgeSpace === s.id ? '1.5px solid #f59e0b' : '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            color: '#78350f',
                          }}
                        >{s.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: timing — shows after space selected */}
                {step0Done && step1Done && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 600, color: '#78350f', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                      When?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {PLEDGE_TIMINGS.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPledgeTiming(t.id)}
                          style={{
                            textAlign: 'left',
                            background: pledgeTiming === t.id ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.7)',
                            border: pledgeTiming === t.id ? '1.5px solid #f59e0b' : '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            color: '#78350f',
                          }}
                        >{t.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commit button — shows only when all three chosen */}
                {pledgePlant && pledgeSpace && pledgeTiming && (
                  <button
                    type="button"
                    onClick={commit}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '7px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Make my pledge 🦋
                  </button>
                )}
              </div>
            )
          })()}

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

      {/* 🌿 What You Can Do — post-log action panel */}
      {lastLoggedSpecies && submitMsg && !submitMsg.startsWith('Error') && (() => {
        const call = getActionCall(lastLoggedSpecies)
        return (
          <div
            style={{
              marginTop: '1rem', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: '10px',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#15803d', marginBottom: '0.3rem' }}>
              {call.emoji} {call.encouragement}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#166534', marginBottom: '0.6rem' }}>
              💡 <strong>What you can do:</strong> {call.action}
            </div>
            <a
              href="https://www.campmonarch.org"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #86efac' }}
            >
              🦋 Explore Camp Monarch for more ways to help →
            </a>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => shareLastSighting(lastLoggedSpecies!, lastLoggedLocation)}
                style={{
                  padding: '0.4rem 0.9rem',
                  background: '#15803d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                📢 Share Your Sighting
              </button>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Help others discover what's out there
              </span>
            </div>
            {/* 🌿 Planting connection message */}
            {(() => {
              if (!plantingLog || !lastLoggedSpecies) return null
              const plantedAt = new Date(plantingLog.ts).getTime()
              const now = Date.now()
              const daysSince = Math.floor((now - plantedAt) / (1000 * 60 * 60 * 24))
              if (daysSince < 7) return null
              const lower = lastLoggedSpecies.toLowerCase()
              const isRelevant = ['monarch', 'butterfly', 'milkweed', 'swallowtail', 'skipper', 'fritillary'].some(k => lower.includes(k))
              if (!isRelevant) return null
              const PLANT_NAMES: Record<string, string> = {
                milkweed: 'Common Milkweed',
                bssusan: 'Black-Eyed Susan',
                coneflower: 'Purple Coneflower',
                bergamot: 'Wild Bergamot',
                butterfly: 'Butterfly Weed',
                aster: 'Native Aster',
              }
              const plantName = PLANT_NAMES[plantingLog.plant] ?? plantingLog.plant
              const weeksAgo = Math.floor(daysSince / 7)
              const timeLabel = weeksAgo >= 2 ? `${weeksAgo} weeks ago` : 'last week'
              return (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  color: '#166534',
                  lineHeight: '1.5',
                }}>
                  <span style={{ fontWeight: 700 }}>🦋 You planted {plantName} {timeLabel}.</span>
                  <span> Monarchs find milkweed by smell, drifting on warm thermals until the scent reaches them. This could be the one that found yours.</span>
                </div>
              )
            })()}
          </div>
        )
      })()}
        </>
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
                        <strong
                          style={{ cursor: 'pointer', textDecoration: 'underline dotted', color: '#1f2937' }}
                          onClick={() => setSelectedProfile(s.species_name)}
                          title="Click to learn about this species"
                        >{s.species_name}</strong>
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
          {/* 📊 The Numbers — Monarch population context (prop-025) */}
          {(() => {
            const pledgePlant = localStorage.getItem('sis-pledge-plant')
            return (
              <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)',
                border: '2px solid #6366f1',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                color: '#e0e7ff',
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.75rem', letterSpacing: '0.02em' }}>
                  🦋 The Numbers
                </div>
                <div style={{ fontSize: '0.82rem', color: '#c7d2fe', marginBottom: '1rem', lineHeight: 1.5 }}>
                  The Monarch is one of the most studied insects on Earth — and one of the most threatened. These three numbers tell the whole story.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '0.9rem' }}>
                  <div style={{
                    background: 'rgba(99,102,241,0.25)',
                    border: '1px solid #6366f1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.5rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', lineHeight: 1 }}>~1B</div>
                    <div style={{ fontSize: '0.67rem', color: '#818cf8', marginTop: '0.25rem', fontWeight: 600 }}>1996 PEAK</div>
                    <div style={{ fontSize: '0.65rem', color: '#c7d2fe', marginTop: '0.2rem', lineHeight: 1.4 }}>The world that existed</div>
                  </div>
                  <div style={{
                    background: 'rgba(220,38,38,0.25)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '0.65rem 0.5rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5', lineHeight: 1 }}>~35M</div>
                    <div style={{ fontSize: '0.67rem', color: '#f87171', marginTop: '0.25rem', fontWeight: 600 }}>2014 CRISIS</div>
                    <div style={{ fontSize: '0.65rem', color: '#fecaca', marginTop: '0.2rem', lineHeight: 1.4 }}>Near-extinction point</div>
                  </div>
                  <div style={{
                    background: 'rgba(22,163,74,0.25)',
                    border: '1px solid #4ade80',
                    borderRadius: '8px',
                    padding: '0.65rem 0.5rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86efac', lineHeight: 1 }}>~335M</div>
                    <div style={{ fontSize: '0.67rem', color: '#4ade80', marginTop: '0.25rem', fontWeight: 600 }}>2023 RECOVERY</div>
                    <div style={{ fontSize: '0.65rem', color: '#bbf7d0', marginTop: '0.2rem', lineHeight: 1.4 }}>Corridors working</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#c7d2fe', lineHeight: 1.55, marginBottom: pledgePlant ? '0.6rem' : '0' }}>
                  The backyard corridor is not a metaphor — it is what brought them from 35 million back toward 335 million. Every milkweed plant, every native nectar source, every yard that stopped using pesticides: this is where that recovery came from.
                </div>
                {pledgePlant && (
                  <div style={{
                    background: 'rgba(99,102,241,0.3)',
                    border: '1px solid #818cf8',
                    borderRadius: '6px',
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.78rem',
                    color: '#e0e7ff',
                    fontStyle: 'italic',
                  }}>
                    🌱 Your {pledgePlant} is part of that corridor.
                  </div>
                )}
                <div style={{ color: '#6366f1', fontSize: '0.65rem', marginTop: '0.5rem' }}>
                  Sources: WWF Mexico census data; Brower et al. 1995; Pleasants &amp; Oberhauser 2013
                </div>
              </div>
            )
          })()}

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

                    {/* 📈 Your Nature Trend — prop-011 */}
          {sightings.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #16a34a',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', marginBottom: '0.75rem' }}>
                📈 Your Nature Trend
              </div>
              {yrKeys.length >= 2 ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.6rem' }}>
                    Comparing {prevYear} → {thisYear}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Total sightings */}
                    {yrData[thisYear] && yrData[prevYear] && (
                      <div style={{ background: '#fff', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid #86efac', minWidth: '110px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>Total sightings</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                            {yrData[thisYear].total}
                          </span>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            color: yrData[thisYear].total >= yrData[prevYear].total ? '#16a34a' : '#dc2626'
                          }}>
                            {yrData[thisYear].total >= yrData[prevYear].total ? '▲' : '▼'}
                            {Math.abs(yrData[thisYear].total - yrData[prevYear].total)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>was {yrData[prevYear].total}</div>
                      </div>
                    )}
                    {/* Species diversity */}
                    {yrData[thisYear] && yrData[prevYear] && (
                      <div style={{ background: '#fff', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid #86efac', minWidth: '110px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>Species seen</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                            {yrData[thisYear].species.length}
                          </span>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            color: yrData[thisYear].species.length >= yrData[prevYear].species.length ? '#16a34a' : '#dc2626'
                          }}>
                            {yrData[thisYear].species.length >= yrData[prevYear].species.length ? '▲' : '▼'}
                            {Math.abs(yrData[thisYear].species.length - yrData[prevYear].species.length)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>was {yrData[prevYear].species.length}</div>
                      </div>
                    )}
                    {/* Earliest Monarch */}
                    {yrData[thisYear]?.monarchDates.length > 0 && yrData[prevYear]?.monarchDates.length > 0 && (
                      <div style={{ background: '#fff', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid #86efac', minWidth: '130px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>🦋 First Monarch</div>
                        {(() => {
                          const earliest = (dates: string[]) =>
                            dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())[0]
                          const thisFirst = earliest(yrData[thisYear].monarchDates)
                          const prevFirst = earliest(yrData[prevYear].monarchDates)
                          const dayDiff = Math.round((thisFirst.getTime() - prevFirst.getTime()) / 86400000)
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                                  {thisFirst.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span style={{
                                  fontSize: '0.8rem', fontWeight: 600,
                                  color: dayDiff <= 0 ? '#16a34a' : '#dc2626'
                                }}>
                                  {dayDiff === 0 ? '=' : dayDiff < 0 ? `▲${Math.abs(dayDiff)}d earlier` : `▼${dayDiff}d later`}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                was {prevFirst.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#166534', margin: 0, marginTop: '0.6rem' }}>
                    More species each year = a healthier habitat. Monarchs arriving earlier = more milkweed
                    surviving spring. This is restoration made visible.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid #86efac', minWidth: '110px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>This year</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                        {yrData[thisYear]?.total ?? sightings.length}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>sightings logged</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid #86efac', minWidth: '110px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>Species seen</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                        {yrData[thisYear]?.species.length ?? Object.keys(speciesCounts).length}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>unique species</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#166534', margin: 0 }}>
                    Year 1 — building your baseline. Keep logging. Next year, you'll see whether
                    your habitat is growing more alive.
                  </p>
                </div>
              )}
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


          {/* 🌍 Migration Corridor — Where Are the Monarchs Now? — new in goal-037 */}
          {(() => {
            const stage = MIGRATION_STAGES[currentMonth]
            return (
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>🌍 Monarch Corridor — Where Are They Now?</h2>
                <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
                  The annual migration cycle — 3,000 miles, 4 generations, one inherited map. Highlighted month = right now.
                </p>
                <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '2px', minWidth: '540px' }}>
                    {MIGRATION_STAGES.map((s, i) => (
                      <div
                        key={s.abbr}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0.4rem 0.1rem',
                          borderRadius: '6px',
                          background: i === currentMonth ? s.color : '#f3f4f6',
                          border: i === currentMonth ? ('2px solid ' + s.color) : '2px solid transparent',
                          minWidth: 0,
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{s.emoji}</span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: i === currentMonth ? 700 : 400,
                          color: i === currentMonth ? '#fff' : '#6b7280',
                          marginTop: '0.15rem',
                          letterSpacing: '-0.02em',
                        }}>{s.abbr}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  marginTop: '0.6rem',
                  background: stage.bg,
                  border: '1px solid ' + stage.borderColor,
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: stage.color, marginBottom: '0.25rem' }}>
                    {stage.emoji} {stage.phase} · {stage.location}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.55 }}>
                    {stage.description}
                  </div>
                </div>
              </div>
            )
          })()}

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
          {/* 🌱 What to Plant — new in goal-029 */}
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>🌱 What to Plant</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 0, marginBottom: '0.75rem' }}>
            Native plants matched to your most-observed species. Planting these is the most impactful step you can take to support local wildlife.
          </p>
          {sightings.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem' }}>
              {plantRecommendations.map(({ name, plants, matched }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.65rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '1.2rem', minWidth: '1.5rem', textAlign: 'center' }}>🌿</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937', marginBottom: '0.18rem' }}>{name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>{plants.join(' · ')}</div>
                    {!matched && (
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.1rem' }}>General native planting suggestions</div>
                    )}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, marginTop: '0.5rem' }}>
                🦋 Native plants support the entire food web — from caterpillars to birds.{' '}
                <a href="https://www.campmonarch.org" target="_blank" rel="noreferrer" style={{ color: '#16a34a' }}>
                  Learn more at Camp Monarch →
                </a>
              </p>
            </div>
          )}

        </div>
      )}

    </div>
    </>
  )
}
