/*#
# galaxy-data

Procedural galaxy generation data and functions. Pure logic — no Babylon.js
dependency. Ported from the galaxy-b8r project.

Generates a galaxy of stars with spiral arm distribution, each star with
spectral class, luminosity, mass, and a deterministic set of planets with
radius, density, atmosphere, temperature, and habitability index.

All generation is seeded — same seed always produces the same galaxy.

## Demo

```js
import { PRNG, generateGalaxy, generateStarSystem } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, p, pre, table, tr, td, th, thead, tbody } = elements

const galaxy = generateGalaxy(1234, 100)

let output = `Galaxy: ${galaxy.stars.length} stars\n\n`
output += 'First 10 stars:\n'
for (let i = 0; i < 10; i++) {
  const s = galaxy.stars[i]
  output += `  ${s.name.padEnd(20)} ${s.spectralType.padEnd(4)} `
  output += `L=${s.luminosity.toFixed(2).padStart(10)} `
  output += `planets=${s.numberOfPlanets}\n`
}

output += '\nStar system for star 0 (' + galaxy.stars[0].name + '):\n'
const system = generateStarSystem(galaxy.stars[0])
for (const planet of system.planets) {
  output += `  ${planet.name.padEnd(25)} ${planet.classification.padEnd(12)} `
  output += `${planet.description.padEnd(16)} `
  output += `${planet.atmosphere.padEnd(12)} `
  output += `${planet.tempC}°C\n`
}

preview.append(pre(output))
```

## API

### `generateGalaxy(seed, count, options?)`

Returns `{ stars: StarData[] }`. Each star has position, spectral type,
luminosity, mass, planet count, and a deterministic seed for system generation.

### `generateStarSystem(star)`

Returns `{ star: StarData, planets: PlanetData[] }` with full planet detail.

### Types

| Type | Key Fields |
| --- | --- |
| `StarData` | name, seed, position, spectralType, luminosity, mass, numberOfPlanets, rgb |
| `PlanetData` | name, classification, orbitalRadius, radius, density, atmosphere, tempC, HI, description |
| `GalaxyOptions` | spiralArms, spiralAngleDegrees, minRadius, maxRadius, thickness |

*/

import { PRNG } from './mersenne-twister'

// --- Utilities ---

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export function romanNumeral(n: number): string {
  const units = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix']
  if (!n) return ''
  if (n < 0 || n >= 20) return String(n)
  if (n >= 10) return 'x' + romanNumeral(n - 10)
  return units[n - 1]
}

// --- Profanity Filter ---

const badwords = [
  'anal',
  'anus',
  'arse',
  'ass',
  'balls',
  'bastard',
  'bitch',
  'bloody',
  'boob',
  'butt',
  'clit',
  'cock',
  'coon',
  'crap',
  'cum',
  'cunt',
  'damn',
  'dick',
  'dildo',
  'dyke',
  'fag',
  'fuck',
  'hell',
  'homo',
  'jizz',
  'kock',
  'lust',
  'nazi',
  'nig',
  'penis',
  'piss',
  'poop',
  'porn',
  'prick',
  'pube',
  'pussy',
  'rape',
  'rectum',
  'scrotum',
  'sex',
  'shit',
  'slut',
  'smegma',
  'spunk',
  'tit',
  'turd',
  'twat',
  'vagina',
  'vulva',
  'wank',
  'whore',
]

function isBadWord(s: string): boolean {
  const lower = s.toLowerCase()
  return badwords.some((w) => lower.includes(w))
}

// --- Name Generation ---

const nameParts = {
  prefix: [
    'a',
    'aeg',
    'ai',
    'alf',
    'alph',
    'amn',
    'an',
    'and',
    'apt',
    'arct',
    'ard',
    'ath',
    'aur',
    'b',
    'bell',
    'bet',
    'bor',
    'c',
    'call',
    'can',
    'canc',
    'cap',
    'ceph',
    'ch',
    'chl',
    'cr',
    'cz',
    'delt',
    'drac',
    'e',
    'eps',
    'f',
    'fom',
    'g',
    'gamm',
    'gall',
    'gat',
    'gemi',
    'gn',
    'gr',
    'h',
    'heph',
    'her',
    'holl',
    'i',
    'in',
    'ind',
    'ir',
    'j',
    'k',
    'kn',
    'l',
    'lep',
    'lin',
    'lov',
    'm',
    'malth',
    'mar',
    'med',
    'mir',
    'mirc',
    'n',
    'nept',
    'o',
    'or',
    'pers',
    'p',
    'ph',
    'plei',
    'plut',
    'pn',
    'poll',
    'pr',
    'ps',
    'pt',
    'pyr',
    'q',
    'qu',
    'r',
    'rig',
    's',
    'sag',
    'sc',
    'sir',
    'str',
    't',
    'taur',
    'tell',
    'th',
    'tn',
    'trop',
    'ts',
    'u',
    'ull',
    'ult',
    'ur',
    'v',
    'veg',
    'vesp',
    'vr',
    'w',
    'wh',
    'wr',
    'x',
    'xz',
    'y',
    'z',
    'z',
  ],
  middle: [
    'acl',
    'ac',
    'ad',
    'aedr',
    'agg',
    'al',
    'alh',
    'alr',
    'alt',
    'am',
    'an',
    'apr',
    'aqu',
    'ar',
    'ath',
    'cul',
    'e',
    'ec',
    'ed',
    'ef',
    'egg',
    'elg',
    'em',
    'en',
    'eph',
    'er',
    'et',
    'i',
    'iat',
    'ib',
    'ic',
    'id',
    'ig',
    'il',
    'ir',
    'isc',
    'ist',
    'itt',
    'od',
    'of',
    'om',
    'on',
    'oph',
    'opt',
    'orp',
    'om',
    'oth',
    'ue',
    'ulp',
    'ulph',
    'ur',
    'und',
    'us',
    'ut',
    'uu',
  ],
  suffix: [
    'a',
    'ae',
    'ai',
    'anae',
    'ao',
    'ar',
    'arn',
    'aur',
    'aut',
    'ea',
    'ei',
    'el',
    'eo',
    'eon',
    'eos',
    'es',
    'ga',
    'ho',
    'holm',
    'hus',
    'i',
    'ia',
    'iea',
    'ii',
    'io',
    'ion',
    'is',
    'las',
    'o',
    'oe',
    'oea',
    'oi',
    'oia',
    'on',
    'one',
    'or',
    'orn',
    'os',
    'ov',
    'ova',
    'u',
    'ua',
    'ue',
    'ula',
    'uo',
    'um',
    'un',
    'us',
    'ux',
    'z',
  ],
  secondary: [
    'Major',
    'Minor',
    'Secundus',
    'Tertius',
    'Quartus',
    'Quintus',
    'Septimus',
    'Octavus',
    'Nonus',
    'Decimus',
  ],
}

export function randomName(
  prng: PRNG,
  numberOfSyllables: number,
  allowSecondName = true,
  allowSecondary = true
): string {
  const syllables: string[] = []
  syllables.push(prng.pick(nameParts.prefix))
  for (let j = 2; j < numberOfSyllables; j++) {
    syllables.push(prng.pick(nameParts.middle))
  }
  syllables.push(prng.pick(nameParts.suffix))
  let name = syllables.join('')

  const suffix = prng.pick(
    ['', 'first-name', 'second-name', 'secondary'],
    [8, 1, 1, 4]
  )
  switch (suffix) {
    case 'first-name':
      if (allowSecondName) {
        name =
          capitalize(
            randomName(prng, prng.range(2, numberOfSyllables), false, false)
          ) +
          ' ' +
          name
      }
      break
    case 'second-name':
      if (allowSecondName) {
        name =
          name +
          ' ' +
          capitalize(randomName(prng, prng.range(2, numberOfSyllables), false))
      }
      break
    case 'secondary':
      if (allowSecondary) {
        name += ' ' + prng.pick(nameParts.secondary)
      }
      break
  }
  return capitalize(name)
}

// --- Astrophysics Data ---

export interface StarTypeInfo {
  luminosity: number
  color: string
  rgb: [number, number, number]
  planets: [number, number]
  mass: number
  lifespan: number
  inSpiralArm: number
}

export const starTypeData: Record<string, StarTypeInfo> = {
  O: {
    luminosity: 250000,
    color: 'rgb(255,192,255)',
    rgb: [255, 192, 255],
    planets: [0, 3],
    mass: 50,
    lifespan: 5.6e5,
    inSpiralArm: 0.9,
  },
  B: {
    luminosity: 800,
    color: 'rgb(192,160,255)',
    rgb: [192, 160, 255],
    planets: [1, 5],
    mass: 6.5,
    lifespan: 9.3e7,
    inSpiralArm: 0.9,
  },
  A: {
    luminosity: 20,
    color: 'rgb(128,192,255)',
    rgb: [128, 192, 255],
    planets: [1, 7],
    mass: 2.1,
    lifespan: 1e9,
    inSpiralArm: 0.5,
  },
  F: {
    luminosity: 2.5,
    color: 'rgb(160,255,128)',
    rgb: [160, 255, 128],
    planets: [1, 11],
    mass: 1.3,
    lifespan: 5.1e9,
    inSpiralArm: 0.4,
  },
  G: {
    luminosity: 0.79,
    color: 'rgb(255,255,64)',
    rgb: [255, 255, 64],
    planets: [1, 19],
    mass: 0.79,
    lifespan: 1.2e10,
    inSpiralArm: 0.3,
  },
  K: {
    luminosity: 0.16,
    color: 'rgb(255,192,64)',
    rgb: [255, 192, 64],
    planets: [1, 9],
    mass: 0.69,
    lifespan: 2.5e10,
    inSpiralArm: 0.25,
  },
  M: {
    luminosity: 0.0027,
    color: 'rgb(255,64,0)',
    rgb: [255, 64, 0],
    planets: [1, 5],
    mass: 0.15,
    lifespan: 1.1e12,
    inSpiralArm: 0.1,
  },
}

// --- Planet Physics ---

function gravity(radius: number, density: number): number {
  return (density / 5.56) * (radius / 6557)
}

function blackbody(insolation: number, albedo = 0): number {
  return Math.pow((1367 * insolation * (1 - albedo)) / (4 * 0.0000000567), 0.25)
}

const atmosphereData: Record<string, { albedo: number; density: number }> = {
  Breathable: { albedo: 0.2, density: 1 },
  Filterable: { albedo: 0.3, density: 1 },
  Inert: { albedo: 0.1, density: 0.5 },
  Corrosive: { albedo: 0.5, density: 2 },
  Toxic: { albedo: 0.4, density: 1.5 },
  Trace: { albedo: 0.05, density: 0.1 },
  Crushing: { albedo: 0.8, density: 100 },
}

type AtmosphereType =
  | 'Breathable'
  | 'Filterable'
  | 'Inert'
  | 'Corrosive'
  | 'Toxic'
  | 'Trace'
  | 'Crushing'

function computeHI(
  insolation: number,
  radius: number,
  density: number,
  hydrographics: number,
  atmosphere: AtmosphereType
): {
  HI: number
  description: string
  g: string
  albedo: number
  tempC: string
  temp: string
} {
  const g = gravity(radius, density).toFixed(2)
  const { albedo } = atmosphereData[atmosphere]
  const tempK = blackbody(insolation, albedo + hydrographics * 0.002).toFixed(1)
  const tempC = Number(tempK) - 275.15
  let temp: string

  if (tempC < -150) temp = 'frigid'
  else if (tempC < -80) temp = 'extremely cold'
  else if (tempC < -40) temp = 'very cold'
  else if (tempC < -10) temp = 'cold'
  else if (tempC < 30) temp = 'temperate'
  else if (tempC < 50) temp = 'hot'
  else if (tempC < 90) temp = 'very hot'
  else if (tempC < 150) temp = 'extremely hot'
  else temp = 'inferno'

  const tempCStr = tempC.toFixed(1)

  let data: { HI: number; description: string }
  const gNum = Number(g)

  if (
    atmosphere === 'Breathable' &&
    hydrographics > 0 &&
    gNum < 1.25 &&
    ['cold', 'hot', 'temperate'].includes(temp)
  ) {
    data = { HI: 1, description: 'earthlike' }
  } else if (
    ['Breathable', 'Filterable'].includes(atmosphere) &&
    gNum < 2 &&
    !['inferno', 'extremely hot', 'extremely cold', 'frigid'].includes(temp)
  ) {
    data = { HI: 2, description: 'survivable' }
  } else if (
    atmosphere === 'Crushing' ||
    gNum > 3 ||
    ['inferno', 'frigid'].includes(temp)
  ) {
    data =
      tempC > 800
        ? { HI: 5, description: 'inimical' }
        : { HI: 4, description: 'robot accessible' }
  } else {
    data = { HI: 3, description: 'EVA possible' }
  }

  return { ...data, g, albedo, tempC: tempCStr, temp }
}

interface PlanetTemplate {
  classification: string
  radius: [number, number]
  density: [number, number]
  hydrographics: (
    prng: PRNG,
    insolation: number,
    radius: number,
    density: number
  ) => number
  atmosphere: (
    prng: PRNG,
    insolation: number,
    radius: number,
    density: number,
    hydrographics: number
  ) => AtmosphereType
}

const planetTypeData: PlanetTemplate[] = [
  {
    classification: 'rocky',
    radius: [1000, 15000],
    density: [2, 8],
    hydrographics(prng, insolation, radius, density) {
      const g = gravity(radius, density)
      const tempK = blackbody(insolation, 0)
      return Math.max(
        0,
        Math.min(
          Number(
            (
              prng.realRange(-50, 150 - Math.abs(tempK - 270)) * g -
              Math.abs(density - 5.5) * 10
            ).toFixed(0)
          ),
          100
        )
      )
    },
    atmosphere(prng, insolation, _radius, _density, hydrographics) {
      if (hydrographics > 0 && insolation > 0.25 && insolation < 2) {
        return prng.pick(
          [
            'Breathable',
            'Filterable',
            'Inert',
            'Toxic',
            'Corrosive',
            'Trace',
          ] as AtmosphereType[],
          [1, 2, 2, 1, 1, 1]
        )
      } else {
        return prng.pick(
          [
            'Breathable',
            'Filterable',
            'Inert',
            'Toxic',
            'Corrosive',
            'Trace',
          ] as AtmosphereType[],
          [1, 2, 3, 4, 5, 5]
        )
      }
    },
  },
  {
    classification: 'gas giant',
    radius: [15000, 120000],
    density: [0.6, 2.0],
    hydrographics: () => 0,
    atmosphere: () => 'Crushing' as AtmosphereType,
  },
  {
    classification: 'brown dwarf',
    radius: [120000, 250000],
    density: [0.6, 2.0],
    hydrographics: () => 0,
    atmosphere: () => 'Crushing' as AtmosphereType,
  },
]

export { planetTypeData }

// --- Star Data ---

export interface StarData {
  name: string
  seed: number
  position: { x: number; y: number; z: number }
  spectralType: string
  spectralClass: string
  spectralIndex: number
  luminosity: number
  mass: number
  numberOfPlanets: number
  planetSeed: number
  rgb: [number, number, number]
  color: string
  inSpiralArm: boolean
  lifespan: number
  scale: number
  bestHI: number
}

function generateStarDetail(seed: number): Omit<StarData, 'name' | 'position'> {
  const prng = new PRNG(seed)
  const spectralClass = prng.pick(
    ['O', 'B', 'A', 'F', 'G', 'K', 'M'],
    [0.0001, 0.2, 1, 3, 8, 12, 20]
  )
  const spectralIndex = prng.range(0, 9)
  const template = starTypeData[spectralClass]

  const luminosity = (template.luminosity * 3) / (spectralIndex + 2)
  const mass = (template.mass * 5) / (spectralIndex + 2)
  const numberOfPlanets = prng.range(template.planets[0], template.planets[1])
  const planetSeed = prng.range(0, 1000000)
  const inSpiralArm = prng.probability(template.inSpiralArm)

  let s = Math.log(luminosity) + 4
  s = Math.max(Math.min(s, 20), 2) * 0.5

  return {
    seed,
    spectralType: spectralClass + spectralIndex,
    spectralClass,
    spectralIndex,
    luminosity,
    mass,
    numberOfPlanets,
    planetSeed,
    rgb: template.rgb,
    color: template.color,
    inSpiralArm,
    lifespan: template.lifespan,
    scale: s / 5,
  }
}

// --- Planet Data ---

export interface PlanetData {
  name: string
  seed: number
  orbitalRadius: number
  insolation: number
  classification: string
  radius: number
  density: number
  hydrographics: number
  atmosphere: string
  HI: number
  description: string
  g: string
  albedo: number
  tempC: string
  temp: string
  rings: number
}

function generatePlanetDetail(
  name: string,
  seed: number,
  orbitalRadius: number,
  insolation: number
): PlanetData {
  const prng = new PRNG(seed)

  const template = prng.pick(planetTypeData, [insolation * 100, 10, 1])
  const radius = prng.range(template.radius[0], template.radius[1])
  const density = prng.realRange(template.density[0], template.density[1])
  const hydrographics = template.hydrographics(
    prng,
    insolation,
    radius,
    density
  )
  const atmosphere = template.atmosphere(
    prng,
    insolation,
    radius,
    density,
    hydrographics
  )
  const hi = computeHI(insolation, radius, density, hydrographics, atmosphere)

  // Gas giants can have rings — larger ones more likely
  let rings = 0
  if (template.classification === 'gas giant') {
    // Normalize radius: small gas giant ~15000km, large ~75000km
    const sizeFactor = Math.min(1, (radius - 15000) / 60000)
    // Chance of no rings: 0.5 for small, 0.1 for large
    const noRingChance = 0.5 - sizeFactor * 0.4
    if (!prng.probability(noRingChance)) {
      rings = prng.realRange(0.1, 1)
    }
  }

  return {
    name,
    seed,
    orbitalRadius: Number(orbitalRadius.toFixed(2)),
    insolation: Number(insolation.toFixed(2)),
    classification: template.classification,
    radius,
    density,
    hydrographics,
    atmosphere,
    rings,
    ...hi,
  }
}

// --- Star System Generation ---

export interface StarSystemData {
  star: StarData
  planets: PlanetData[]
}

export function generateStarSystem(star: StarData): StarSystemData {
  const prng = new PRNG(star.planetSeed)
  const radiusMin = 0.4 * prng.realRange(0.5, 2)
  const radiusMax = 50 * prng.realRange(0.5, 2)
  const totalWeight =
    (Math.pow(star.numberOfPlanets, 2) + star.numberOfPlanets) * 0.5
  let r = radiusMin

  const planets: PlanetData[] = []
  for (let i = 0; i < star.numberOfPlanets; i++) {
    r += (i / totalWeight) * prng.realRange(0.5, 1) * (radiusMax - radiusMin)
    const orbitalRadius = r
    const insolation = star.luminosity / Math.pow(r, 2)
    const planetSeed = prng.range(0, 100000)
    const planetName = capitalize(star.name) + '-' + romanNumeral(i + 1)

    planets.push(
      generatePlanetDetail(planetName, planetSeed, orbitalRadius, insolation)
    )
  }

  return { star, planets }
}

// --- Galaxy Generation ---

export interface GalaxyOptions {
  spiralArms?: number
  spiralAngleDegrees?: number
  minRadius?: number
  maxRadius?: number
  thickness?: number
}

const GALAXY_DEFAULTS: Required<GalaxyOptions> = {
  spiralArms: 4,
  spiralAngleDegrees: 240,
  minRadius: 0.02,
  maxRadius: 0.9,
  thickness: 0.06,
}

export interface NebulaData {
  position: { x: number; y: number; z: number }
  scale: number
  rgb: [number, number, number]
  type: 'emission' | 'dark'
  opacity: number
}

export interface GalaxyData {
  stars: StarData[]
  nebulae: NebulaData[]
  seed: number
  options: Required<GalaxyOptions>
}

export function generateGalaxy(
  seed: number,
  numberOfStars: number,
  options: GalaxyOptions = {}
): GalaxyData {
  const opts = { ...GALAXY_DEFAULTS, ...options }
  const { spiralArms, spiralAngleDegrees, minRadius, maxRadius, thickness } =
    opts

  const scatterTheta = (Math.PI / spiralArms) * 0.2
  const scatterRadius = minRadius * 0.4
  const spiralB = ((spiralAngleDegrees / Math.PI) * minRadius) / maxRadius

  const names: string[] = []
  const stars: StarData[] = []
  const prng = new PRNG(seed)

  for (let i = 0; i < numberOfStars; i++) {
    const numberOfSyllables = Math.floor(prng.value() * 2 + 2)
    let newName: string

    // Generate unique, non-profane name
    newName = randomName(prng, numberOfSyllables)
    while (names.includes(newName) || isBadWord(newName)) {
      newName = randomName(prng, numberOfSyllables)
    }
    names.push(newName)

    const starSeed = prng.range(1, 100000)
    const detail = generateStarDetail(starSeed)

    // Position in galaxy
    let x: number, y: number
    let r = prng.realRange(minRadius, maxRadius)

    if (detail.inSpiralArm) {
      r += prng.gaussrandom(scatterRadius)
      let theta =
        spiralB * Math.log(r / maxRadius) + prng.gaussrandom(scatterTheta)
      theta += (prng.range(0, spiralArms - 1) * Math.PI * 2) / spiralArms
      x = Math.cos(theta) * r
      y = Math.sin(theta) * r
    } else {
      r *= prng.realRange(1, 1.1)
      const theta = prng.realRange(0, Math.PI * 2)
      x = Math.cos(theta) * r
      y = Math.sin(theta) * r
    }

    const z = prng.gaussrandom(thickness * 0.5 * (1 - r))

    const star: StarData = {
      ...detail,
      name: newName,
      position: { x, y, z },
      bestHI: 5,
    }
    // Compute best habitability index from planets
    const system = generateStarSystem(star)
    if (system.planets.length > 0) {
      star.bestHI = Math.min(...system.planets.map((p) => p.HI))
    }
    stars.push(star)
  }

  // Sort alphabetically by name
  stars.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))

  // Generate nebulae using same spiral arm positioning
  const nebulaCount = Math.max(50, Math.floor(numberOfStars * 0.15))
  const nebulae: NebulaData[] = []

  // Nebula color from a continuous spectrum: purple → green → orange
  function nebulaColor(t: number): [number, number, number] {
    // t=0 purple, t=0.5 green, t=1 orange
    if (t < 0.5) {
      const s = t * 2 // 0..1
      return [
        Math.round(140 + s * -80), // 140 → 60
        Math.round(60 + s * 140), // 60 → 200
        Math.round(220 + s * -40), // 220 → 180
      ]
    } else {
      const s = (t - 0.5) * 2 // 0..1
      return [
        Math.round(60 + s * 195), // 60 → 255
        Math.round(200 - s * 60), // 200 → 140
        Math.round(180 - s * 100), // 180 → 80
      ]
    }
  }

  // Dark nebula color: black → brown
  function darkNebulaColor(t: number): [number, number, number] {
    return [
      Math.round(t * 60), // 0 → 60
      Math.round(t * 35), // 0 → 35
      Math.round(t * 15), // 0 → 15
    ]
  }

  for (let i = 0; i < nebulaCount; i++) {
    const isDark = prng.probability(0.35)
    let r = prng.realRange(minRadius * 0.5, maxRadius)

    // Nebulae follow spiral arms more strongly
    r += prng.gaussrandom(scatterRadius * 2)
    let theta =
      spiralB * Math.log(r / maxRadius) + prng.gaussrandom(scatterTheta * 1.5)
    theta += (prng.range(0, spiralArms - 1) * Math.PI * 2) / spiralArms

    const x = Math.cos(theta) * r
    const y = Math.sin(theta) * r
    const z = prng.gaussrandom(thickness * 0.3 * (1 - r))

    const scale = prng.realRange(1.5, 5)
    const opacity = prng.realRange(0.15, 0.5)
    const t = prng.value()

    if (isDark) {
      nebulae.push({
        position: { x, y, z },
        scale,
        rgb: darkNebulaColor(t),
        type: 'dark',
        opacity,
      })
    } else {
      nebulae.push({
        position: { x, y, z },
        scale,
        rgb: nebulaColor(t),
        type: 'emission',
        opacity,
      })
    }
  }

  return { stars, nebulae, seed, options: opts }
}
