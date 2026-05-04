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

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  const [lastLoggedSpecies, setLastLoggedSpecies] = useState<string | null>(null)

  const [lastLoggedLocation, setLastLoggedLocation] = useState<string | null>(null)

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
