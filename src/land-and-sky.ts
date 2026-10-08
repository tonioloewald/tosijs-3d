/*#
# Land and Sky

**THE KITCHEN SINK** — one world that grows with the world-sim layer. Terrain
(with live dials), a sea, weather over both, and the encoded sky behind. As
provinces, weather systems and the simulation land, they land HERE first: this
page is where the pieces meet, so it is also where their disagreements show
first — which is the point.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dWeatherCell, b3dLightning, b3dAmbient, b3dLightShafts, b3dTerrain, b3dCloudDeck, b3dDecorator, b3dWater, b3dLight, b3dFog, label3d, slider3d, toggle3d, select3d, button3d, row3d, volcano, craterField, composeLandforms, mergeProvinces } from 'tosijs-3d'
import { tosi } from 'tosijs'

// Its own state, not `sky` or `demo`: those are what a preset saves, and
// whether occlusion is on is a property of the device, not of a world.
const { landAo } = tosi({ landAo: { mode: 'off' } })

const { demo } = tosi({
  demo: {
    seed: 111,
    grossScale: 0.01,
    detailScale: 0.09,
    horizScale: 3.31,
    grossAmplitude: 230,
    detailAmplitude: 45,
    // Sea level as a FRACTION of v-size, so the ocean scales with the
    // mountains — the same world at any amplitude keeps the same share of
    // land and sea.
    seaLevel: 0.64,
    volcano: true,
    // CLIMATE, above water. Moisture is the one that matters most: the biome
    // chart's default 0.45 sits between the dry row (dune) and the medium
    // row (steppe), which is why a warm world with a coral reef below the
    // waterline read as barren above it. 0.72 is the wet row — forest.
    temperature: 0.72,
    moisture: 0.72,
    // Plates sized to THIS volcano (420 m). The plugin's 0.09 was tuned on a
    // 55 m cone, where it gives ~11 m plates; here that is gravel.
    volcanicScale: 0.02,
    // How cratered the ground is (0 = none; a preset sets it: Mars, the Moon).
    craters: 0,
    // A field of volcanoes (Io): how many, 0 = none.
    volcanoes: 0,
    // The ground's palette: 'earth' (the biome chart's own) or 'sulfur' (Io).
    palette: 'earth',
    // The sea's colours: its surface tint and the fog you see from inside it
    // (a methane sea, Titan, is dark amber).
    waterColor: '#0066cc', waterFog: '#00264d', waterTint: 0.1,
    // Is there a sea at all? A dry world (Mars, Venus) has none: no water
    // plane, and no shoreline or seafloor colours.
    sea: true,
    wireframe: false,
  },
})

// Weather is ONE dial at the top (coverage drives transmission, gloom and
// depth) plus the shaping ones: wind slides the sky, evolve reshapes it,
// cirrus thins it, orographic asks the terrain for its own height sampler so
// the towers build over the mountains that are actually there.
const { sky } = tosi({
  sky: {
    coverage: 0.1, altitude: 280, timeOfDay: 18.5, orographic: 0.8, wind: 10, cirrus: 0.25, evolve: 0.5, eye: 205,
    storm: false,
    // The atmosphere. `atmosphere` is how much air the WORLD has (0 is the
    // Moon: black noon, stars out); the tints colour the scattered light only.
    world: 'Earth', atmosphere: 1, dust: 0, turbidity: 10, rayleigh: 2, mieCoefficient: 0.005, luminance: 1,
    zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0,
    // The stars: size (1 = the default point), brightness, and the faint floor.
    decoBudget: 2000, decoRadius: 900, decoShadows: false,
    starSize: 1, starGain: 0.9, starFloor: 0.4, starSharpness: 3, twinkle: 0.35,
    // Extra (cosmetic) moons: a set, swung round the sky together.
    moons: 'Big moon', moonAz: 0, moonEl: 0,
    // The cloud deck's colours (a Venus deck is sulfur-yellow), and the sun:
    // its apparent size and how bright its light looks.
    deckColor: '#ffffff', deckUnderColor: '#3a4350', sunSize: 1, sunBrightness: 1,
    // The lightning storm: where it forms, how big, the cover it adds and how
    // often it strikes (a multiple of the natural rate). Presets set these.
    stormX: 1600, stormZ: 300, stormRadius: 900, stormCoverage: 1.7, lightningRate: 1, stormRain: 0.9,
    // The world preset in force (see PRESETS below).
    preset: 'Earth',
  },
})

// A world is a few dials at once — the preset writes them, and the sliders
// stay live afterwards so you can walk away from the preset.
// Mars is almost no AIR and a lot of DUST: its sky is bright because of the
// dust, not the gas (under 1% of Earth's). Gas scatters blue; dust scatters a
// bright haze the tint colours.
const WORLDS = {
  Earth: { atmosphere: 1, dust: 0, zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0 },
  Mars: { atmosphere: 0.15, dust: 0.85, zenithTint: '#c8a070', horizonTint: '#e0b080', tintStrength: 1 },
  Alien: { atmosphere: 1, dust: 0, zenithTint: '#60c080', horizonTint: '#b0e0a0', tintStrength: 0.7 },
  Airless: { atmosphere: 0, dust: 0, zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0 },
}
// SIZE is the inverse of the shader's sharpness: a gaussian's width goes as
// 1/sqrt(sharpness), so size 2 is twice the width of the default point.
sky.starSize.observe(() => {
  sky.starSharpness.value = 3 / Math.max(0.05, sky.starSize.value) ** 2
})
// COSMETIC MOONS — where, how big, what colour. The phase is not a setting:
// swing them round with the slider and watch it follow from the sun.
const MOONS = {
  None: [],
  'Big moon': [{ azimuth: 0, elevation: 25, size: 4, color: '#d8d4cc' }],
  'Mars pair': [
    { azimuth: 0, elevation: 20, size: 0.6, color: '#b09a88' },
    { azimuth: 40, elevation: 32, size: 0.25, color: '#c8b8a8' },
  ],
  // The Moon's sky: Earth, about 3.7 times the size our Moon looks from here.
  // (Moons ride the star sphere; this sits up ahead of the default view in
  // the morning.)
  Earth: [{ azimuth: 60, elevation: 22, size: 3.7, color: '#6f9ad8' }],
  'Alien trio': [
    { azimuth: 0, elevation: 30, size: 6, color: '#e0b090' },
    { azimuth: 25, elevation: 12, size: 2, color: '#a0c8ff' },
    { azimuth: -30, elevation: 40, size: 1, color: '#d0ffd0' },
  ],
}
const skybox = b3dSkybox({
  timeOfDay: sky.timeOfDay,
  realtimeScale: 0,
  starfieldCube: '/sky/nebula',
  starfieldData: '/sky/stars',
  starfieldTilt: '12,25,58',
  atmosphere: sky.atmosphere,
  dust: sky.dust,
  turbidity: sky.turbidity,
  rayleigh: sky.rayleigh,
  mieCoefficient: sky.mieCoefficient,
  luminance: sky.luminance,
  zenithTint: sky.zenithTint,
  horizonTint: sky.horizonTint,
  tintStrength: sky.tintStrength,
  starfieldSharpness: sky.starSharpness,
  starfieldGain: sky.starGain,
  starfieldFloor: sky.starFloor,
  starfieldTwinkle: sky.twinkle,
  sunSize: sky.sunSize,
  sunBrightness: sky.sunBrightness,
})

const moonEls = []
function placeMoons() {
  const set = MOONS[sky.moons.value] ?? []
  while (moonEls.length > set.length) moonEls.pop().remove()
  set.forEach((m, i) => {
    if (moonEls[i] == null) {
      moonEls[i] = b3dMoon()
      skybox.append(moonEls[i])
    }
    Object.assign(moonEls[i], m, {
      azimuth: m.azimuth + sky.moonAz.value,
      elevation: m.elevation + sky.moonEl.value,
    })
  })
}
sky.moons.observe(placeMoons)
sky.moonAz.observe(placeMoons)
sky.moonEl.observe(placeMoons)
placeMoons()
sky.world.observe(() => {
  const w = WORLDS[sky.world.value]
  if (w) for (const k of Object.keys(w)) sky[k].value = w[k]
})

// PRESETS: A WHOLE WORLD AS DATA (board #2442). Terrain, sea, climate,
// weather, atmosphere, stars, moons, the cloud deck's colour and the sun, as
// one plain object you can pick, save and share. A preset only lists what it
// changes; applying one resets everything else to Earth first, so nothing
// leaks from the last world.
//
// THE SUN'S BRIGHTNESS FOLLOWS THE EYE, not the inverse square. A world
// further from its star gets far less light (Titan about 1/90 of Earth's),
// but vision is logarithmic and adapts, and even from Pluto the sun is some
// 300 times brighter than the full moon. So its disc shrinks for real (1 /
// distance) while its light only dims gently, on a log curve.
const PRESET_KEYS = {
  demo: ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'seaLevel', 'sea', 'waterColor', 'waterFog', 'waterTint', 'palette', 'volcano', 'volcanoes', 'craters', 'temperature', 'moisture', 'volcanicScale'],
  sky: ['coverage', 'altitude', 'timeOfDay', 'orographic', 'wind', 'cirrus', 'evolve', 'atmosphere', 'dust', 'turbidity', 'rayleigh', 'mieCoefficient', 'luminance', 'zenithTint', 'horizonTint', 'tintStrength', 'starSize', 'starGain', 'starFloor', 'twinkle', 'moons', 'moonAz', 'moonEl', 'deckColor', 'deckUnderColor', 'sunSize', 'sunBrightness', 'decoBudget', 'stormX', 'stormZ', 'stormRadius', 'stormCoverage', 'lightningRate', 'stormRain',
    // LAST: switching the storm on builds it from the values above.
    'storm'],
}
const STATE = { demo, sky }
function capturePreset(name) {
  const p = { name }
  for (const [group, keys] of Object.entries(PRESET_KEYS)) {
    p[group] = {}
    for (const k of keys) p[group][k] = STATE[group][k].value
  }
  return p
}
function applyPreset(p) {
  for (const [group, keys] of Object.entries(PRESET_KEYS)) {
    const vals = p[group] ?? {}
    for (const k of keys) if (k in vals) STATE[group][k].value = vals[k]
  }
}
// How bright a sun LOOKS from `au` astronomical units (1 = Earth).
const sunLight = (au) => Math.max(0.35, 1 - 0.3 * Math.log10(au * au))
const EARTH = capturePreset('Earth') // the defaults above
const BUILT_IN = {
  Earth: EARTH,
  // Thin, dusty air (its sky is bright from DUST, not gas), red desert, no
  // seas, a smaller sun, two little moons, and Olympus Mons for the volcano.
  Mars: {
    name: 'Mars',
    // HOT and bone-dry: the palette's red dust is the warm end of its driest
    // row, and temperature falls with altitude, so a cooler Mars went grey.
    // (No volcano for now: Earth's province, a stand-in until each world
    // gets its own landforms.)
    demo: { seaLevel: 0, temperature: 1, moisture: 0, sea: false, volcano: false, craters: 0.35 },
    sky: { coverage: 0.06, cirrus: 0.6, atmosphere: 0.03, dust: 0.85, zenithTint: '#c8a070', horizonTint: '#e0b080', tintStrength: 1, deckColor: '#f0e0d0', deckUnderColor: '#8a7060', sunSize: 0.66, sunBrightness: sunLight(1.52), moons: 'Mars pair', decoBudget: 0 },
  },
  // ONE GIANT LIGHTNING STORM under a closed deck of sulfur-yellow cloud,
  // cover maxed: a storm 8 km across centred on you, striking four times as
  // often, dark between flashes. Climb out through the whiteout and the bigger sun is
  // there.
  Venus: {
    name: 'Venus',
    // Venus's surface is YOUNG (resurfaced by volcanism): few craters.
    // Mostly smooth lava plains (Magellan radar): gentle relief. And no rain:
    // Venus's sulfuric acid evaporates long before it reaches the ground.
    demo: { seaLevel: 0, temperature: 1, moisture: 0, sea: false, volcano: false, craters: 0.06, grossAmplitude: 90, detailAmplitude: 8 },
    sky: { storm: true, stormX: 0, stormZ: 0, stormRadius: 8000, stormCoverage: 0.4, lightningRate: 4, stormRain: 0, wind: 3, coverage: 2, altitude: 900, orographic: 0, dust: 0.4, zenithTint: '#e8c880', horizonTint: '#f0d890', tintStrength: 0.85, deckColor: '#f2e2a8', deckUnderColor: '#c0a060', sunSize: 1.39, sunBrightness: sunLight(0.72), moons: 'None', decoBudget: 0 },
  },
}
// Presets for the outer worlds sit below BUILT_IN's literal so they can use
// sunLight; they are added to it here.
Object.assign(BUILT_IN, {
  // Airless, saturated with craters, cold grey regolith, stars at noon, and
  // Earth in the sky. (Lava tubes to come.)
  Moon: {
    name: 'Moon',
    // FLATTISH, so the craters carry the shape (Earth's 230 m relief buried
    // them). Jagged highlands would be a mountain province on top.
    demo: { sea: false, volcano: false, craters: 0.9, temperature: 0, moisture: 0, grossAmplitude: 30, detailAmplitude: 4 },
    sky: { atmosphere: 0, dust: 0, coverage: 0, cirrus: 0, orographic: 0, sunSize: 1, sunBrightness: 1, moons: 'Earth', decoBudget: 0, wind: 0 },
  },
  // Sulfur and fire: yellow, orange and white ground, black lava, a field of
  // hot volcanoes, a tiny sun. No air to speak of. (Plumes, and Jupiter in
  // the sky, to come.)
  Io: {
    name: 'Io',
    demo: { sea: false, volcano: false, volcanoes: 8, craters: 0, temperature: 0.5, moisture: 0, palette: 'sulfur' },
    sky: { atmosphere: 0, dust: 0, coverage: 0, cirrus: 0, orographic: 0, sunSize: 0.19, sunBrightness: sunLight(5.2), moons: 'None', decoBudget: 0, wind: 0 },
  },
  // Thick orange haze over dark methane seas, a tiny, dim sun barely there.
  Titan: {
    name: 'Titan',
    // (Temperature is the biome's, not Titan's -180 C: cold enough reads as
    // ice everywhere, so the ground is its dry, dark row instead.)
    demo: { sea: true, seaLevel: 0.45, volcano: false, craters: 0.05, temperature: 0.62, moisture: 0.02, waterColor: '#1a0e04', waterTint: 0.75, waterFog: '#2a1a08' },
    sky: { atmosphere: 1, dust: 1, zenithTint: '#b87830', horizonTint: '#d09040', tintStrength: 1, coverage: 0.5, cirrus: 0.3, orographic: 0.2, deckColor: '#d8a060', deckUnderColor: '#806030', sunSize: 0.11, sunBrightness: sunLight(9.5), moons: 'None', decoBudget: 0, wind: 2 },
  },
})

const CUSTOM_KEY = 'land-and-sky:presets'
function loadCustom() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}') || {}
  } catch {
    return {}
  }
}
function saveCustom(p) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({ ...loadCustom(), [p.name]: p }))
  } catch {
    // private window: the preset still applies, it just is not kept
  }
}
const presetNames = () => [...Object.keys(BUILT_IN), ...Object.keys(loadCustom())]
sky.preset.observe(() => {
  const p = BUILT_IN[sky.preset.value] ?? loadCustom()[sky.preset.value]
  if (p == null) return
  applyPreset(EARTH)
  applyPreset(p)
})

// The volcano is authored ONCE and switched in and out. Applied here as well
// as from the toggle because it is ON by default, and the toggle's handler only
// runs when someone flips it.
const theVolcano = volcano({ x: 600, z: -400, radius: 420, height: 260, craterRadius: 90, craterDepth: 80 })
// Where the sea is: a FRACTION of the terrain's height, or, on a world
// with no sea, far below everything (no water to see).
function seaY() {
  return demo.sea.valueOf() ? demo.seaLevel * demo.grossAmplitude : -10000
}
// The BIOME's datum is separate: it also classifies by altitude above it, so
// on a dry world it sits just under the deepest crater floors (no shore, no
// seafloor colours) rather than kilometres down (which read as bare peaks).
function biomeSea() {
  return demo.sea.valueOf() ? demo.seaLevel * demo.grossAmplitude : -250
}

// Temperature falls with height above the SEA; with no sea there is no
// datum, so a dry world keeps its preset temperature at every height.
function lapse() {
  // (Not 0: the terrain reads 0 as UNSET and falls back to its 0.004, an
  // arctic world. And not 1e-6, which the attribute path rounds to 0.)
  return demo.sea.valueOf() ? 0.5 / demo.grossAmplitude : 0.0002
}

// A FIELD of volcanoes (Io): seeded positions around you, small paterae
// with hot floors. Each is the ordinary volcano landform.
function volcanoField(n, seed) {
  const out = []
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const d = 250 + rnd() * 1600
    out.push(volcano({ x: Math.cos(a) * d, z: Math.sin(a) * d, radius: 160 + rnd() * 220, height: 30 + rnd() * 90, craterRadius: 50 + rnd() * 60, craterDepth: 20 + rnd() * 30 }))
  }
  return out
}

// Landforms COMPOSE: the craters, then the volcanoes on top of them.
function applyVolcano(on) {
  const parts = []
  const provinces = []
  const density = demo.craters.valueOf()
  if (density > 0) parts.push(craterField({ seed: demo.seed.valueOf(), density, maxRadius: 500 }))
  for (const v of volcanoField(demo.volcanoes.valueOf(), demo.seed.valueOf())) {
    parts.push(v.landform)
    provinces.push(v.province)
  }
  if (on) {
    parts.push(theVolcano.landform)
    provinces.push(theVolcano.province)
  }
  terrain.landform = parts.length === 0 ? null : parts.length === 1 ? parts[0] : composeLandforms(...parts)
  terrain.provinceField = provinces.length === 0 ? null : provinces.length === 1 ? provinces[0] : mergeProvinces(...provinces)
}
demo.volcanoes.observe(() => {
  applyVolcano(demo.volcano.valueOf())
  terrain.regenerate()
})

// THE GROUND'S PALETTE, swapped on the terrain's biome shader (it reads its
// palette every frame). Io's sulfur: frost white, pale and deep yellow,
// orange-red, and black lava for the variation.
const PALETTES = {
  sulfur: {
    a: [[0.92, 0.9, 0.82], [0.9, 0.84, 0.42], [0.86, 0.68, 0.18], [0.74, 0.38, 0.14]],
    b: [[0.8, 0.78, 0.7], [0.14, 0.12, 0.1], [0.7, 0.55, 0.15], [0.3, 0.14, 0.06]],
  },
}
let earthPalette = null
function applyPalette() {
  const plugin = terrain.biomePlugin
  if (plugin == null) return false
  if (earthPalette == null) earthPalette = { a: plugin.palette, b: plugin.paletteB }
  const p = PALETTES[demo.palette.valueOf()]
  // One row of four, repeated for every moisture row (Io has no weather).
  plugin.palette = p ? Array.from({ length: 5 }, () => p.a).flat() : earthPalette.a
  plugin.paletteB = p ? Array.from({ length: 5 }, () => p.b).flat() : earthPalette.b
  return true
}
demo.palette.observe(applyPalette)
demo.craters.observe(() => {
  applyVolcano(demo.volcano.valueOf())
  terrain.regenerate()
})
// A new seed re-rolls the craters too (registered before the terrain's own
// seed observer below, so the landform is current when it regenerates).
demo.seed.observe(() => applyVolcano(demo.volcano.valueOf()))

// 'on'|'off' on the element, a boolean on the toggle — bridged here.
const decorator = b3dDecorator({ budget: sky.decoBudget, radius: sky.decoRadius })
sky.decoShadows.observe(() => {
  decorator.shadows = sky.decoShadows.value ? 'on' : 'off'
})

let water
const terrain = b3dTerrain({
  seed: demo.seed,
  biome: 'on',
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  tileSize: 128,
  lodLevels: 3,
  splitFactor: 2,
  reach: 5000,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  horizScale: demo.horizScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
  // The biome classifier's snow line anchors to the SAME sea level as the
  // water plane — keep them equal or the islands between the old and new
  // water line render as snowcaps. The lapse rate MUST scale to the
  // vertical range (0.5 / amplitude gives temperate valleys and cold
  // summits — the element's own attribute note): the 0.004 default assumes
  // a small world, and at v-size 400 every peak would still read as snow.
  biomeSeaLevel: biomeSea(),
  biomeLapseRate: lapse(),
  biomeTemperature: demo.temperature,
  biomeMoisture: demo.moisture,
  biomeVolcanicScale: demo.volcanicScale,
})

applyVolcano(demo.volcano.valueOf())
// Observed rather than handled on the toggle, so a PRESET switching the
// volcano regenerates the terrain too.
demo.volcano.observe(() => {
  applyVolcano(demo.volcano.valueOf())
  terrain.regenerate()
})

// A LIGHTNING STORM, as weather rather than scenery (WEATHER-DESIGN): a cell
// with coverage and storminess, drifting with the wind. It gathers IN FRONT
// of you (the view faces east) over twenty seconds, so switching it on shows
// you a storm, then drifts away east. Lightning, thunder, rain and strike
// shadows all come from the cell. Toggling it on again starts a new one.
let storm = null
sky.storm.observe(() => {
  storm?.remove()
  storm = null
  if (sky.storm.value) {
    storm = b3dWeatherCell({ x: sky.stormX.value, z: sky.stormZ.value, radius: sky.stormRadius.value, coverage: sky.stormCoverage.value, storminess: 1, precipitation: sky.stormRain.value, drift: 'wind', grow: 20 })
    scene.append(storm)
  }
})

const scene = b3d(
  {
    // The SCENE's wind matches the deck's (toward +X), so a drifting storm
    // travels with the clouds it is made of.
    windSpeed: sky.wind,
    windBearingDeg: 90,
    ssao: landAo.mode,
    // Sections as icon TABS (one at a time); 'fold' shows them as headers.
    panelSections: 'tabs',
    // Lightning strikes wherever a weather cell is stormy (the storm toggle).
    // Controls live in the dual-presence scene panel: a ⚙ toggles them on flat
    // screens, and the SAME panel floats in front of you in VR.
    scenePanel: () => [
      label3d({ text: 'World', icon: 'earth', collapsible: true, open: true }),
      // Pick a world; everything you DO with presets is one menu.
      row3d(
        { weights: [4, 1] },
        select3d({ label: 'preset', value: sky.preset, options: presetNames() }),
        button3d({
          label: '⋯',
          menu: [
            {
              label: 'Save as new preset',
              icon: 'plus',
              handleSelect: () => {
                const name = `Custom ${Object.keys(loadCustom()).length + 1}`
                saveCustom(capturePreset(name))
                sky.preset.value = name
                scene.refreshScenePanel?.()
              },
            },
            {
              label: 'Copy preset (JSON)',
              icon: 'uploadCloud',
              handleSelect: () => navigator.clipboard?.writeText(JSON.stringify(capturePreset(sky.preset.value), null, 2)),
            },
            {
              label: 'Paste preset (JSON)',
              icon: 'downloadCloud',
              handleSelect: async () => {
                try {
                  const p = JSON.parse(await navigator.clipboard.readText())
                  p.name = p.name || 'Pasted'
                  saveCustom(p)
                  sky.preset.value = p.name
                  scene.refreshScenePanel?.()
                } catch {
                  // not a preset on the clipboard
                }
              },
            },
          ],
        })
      ),
      label3d({ text: 'Terrain', icon: 'terrain', collapsible: true }),
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.005, max: 0.3, scale: 'log' }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.02, max: 1, scale: 'log' }),
      slider3d({ label: 'h size', value: demo.horizScale, min: 0.25, max: 10, scale: 'log2' }),
      slider3d({ label: 'v size', value: demo.grossAmplitude, min: 0, max: 400, step: 1 }),
      slider3d({ label: 'sea level', value: demo.seaLevel, min: 0, max: 1, step: 0.02 }),
      slider3d({ label: 'v detail', value: demo.detailAmplitude, min: 0, max: 50, step: 0.5 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 999, step: 1 }),
      // THE FIRST PROVINCE — an authored volcano forced through the live
      // terrain, with the volcanism field that makes it glow. The kitchen
      // sink grows from here.
      toggle3d({ label: 'volcano province', value: demo.volcano }),
      slider3d({ label: 'craters', value: demo.craters, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'volcanoes', value: demo.volcanoes, min: 0, max: 16, step: 1 }),
      select3d({ label: 'ground palette', value: demo.palette, options: ['earth', ...Object.keys(PALETTES)] }),
      // Beside the volcano: the other thing you switch on to watch happen.
      toggle3d({ label: 'lightning storm', value: sky.storm }),
      label3d({ text: 'Climate', icon: 'thermometer', collapsible: true }),
      slider3d({ label: 'temperature', value: demo.temperature, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'moisture', value: demo.moisture, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'volcanic scale', value: demo.volcanicScale, min: 0.005, max: 0.15, scale: 'log' }),
      label3d({ text: 'Weather', icon: 'cloud', collapsible: true }),
      slider3d({ label: 'cloud cover', value: sky.coverage, min: 0, max: 2, step: 0.02 }),
      slider3d({ label: 'cloud base', value: sky.altitude, min: 60, max: 1400, step: 10 }),
      slider3d({ label: 'orographic', value: sky.orographic, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'wind', value: sky.wind, min: 0, max: 40, step: 1 }),
      // Signed: positive streaks ALONG the wind, negative ACROSS it.
      slider3d({ label: 'cirrus', value: sky.cirrus, min: -1, max: 1, step: 0.05 }),
      slider3d({ label: 'evolve', value: sky.evolve, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.25 }),
      label3d({ text: 'Atmosphere', icon: 'sky', collapsible: true }),
      slider3d({ label: 'air', value: sky.atmosphere, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'dust', value: sky.dust, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'tint', value: sky.tintStrength, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'turbidity', value: sky.turbidity, min: 1, max: 40, step: 0.5 }),
      slider3d({ label: 'rayleigh', value: sky.rayleigh, min: 0, max: 4, step: 0.05 }),
      slider3d({ label: 'mie', value: sky.mieCoefficient, min: 0, max: 0.05, step: 0.001 }),
      slider3d({ label: 'luminance', value: sky.luminance, min: 0.1, max: 2, step: 0.05 }),
      label3d({ text: 'Stars', icon: 'star', collapsible: true }),
      slider3d({ label: 'star size', value: sky.starSize, min: 0.4, max: 3, step: 0.05 }),
      slider3d({ label: 'star brightness', value: sky.starGain, min: 0, max: 3, step: 0.05 }),
      slider3d({ label: 'faint stars', value: sky.starFloor, min: 0, max: 1, step: 0.02 }),
      slider3d({ label: 'twinkle', value: sky.twinkle, min: 0, max: 1, step: 0.05 }),
      label3d({ text: 'Moons', icon: 'moon', collapsible: true }),
      select3d({ label: 'moons', value: sky.moons, options: Object.keys(MOONS) }),
      slider3d({ label: 'moon azimuth', value: sky.moonAz, min: -180, max: 180, step: 1 }),
      slider3d({ label: 'moon elevation', value: sky.moonEl, min: -60, max: 60, step: 1 }),
      label3d({ text: 'Vegetation', icon: 'tree', collapsible: true }),
      // THE BUDGET is the performance dial: a count, not a density. Watch the
      // Perf Stats panel's decorator row (placed, draw calls, build ms).
      slider3d({ label: 'rocks & trees', value: sky.decoBudget, min: 0, max: 20000, step: 500 }),
      slider3d({ label: 'reach (m)', value: sky.decoRadius, min: 200, max: 3000, step: 100 }),
      toggle3d({ label: 'tree shadows', value: sky.decoShadows }),
      label3d({ text: 'Camera', icon: 'camera', collapsible: true }),
      slider3d({ label: 'eye height', value: sky.eye, min: 5, max: 1500, step: 10 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      // Off by default: this is the heavy scene, and the place to find out
      // what occlusion costs on your device. Works in VR.
      select3d({ label: 'ambient occlusion', value: landAo.mode, options: ['off', 'on'] }),
    ],
    sceneCreated(el, BABYLON) {
      // The terrain's biome shader exists only once it has built: apply the
      // preset's palette as soon as it does.
      const paletteWait = el.scene.onBeforeRenderObservable.add(() => {
        if (applyPalette()) el.scene.onBeforeRenderObservable.remove(paletteWait)
      })
      // A LOOK-AROUND CAMERA: you stand at eye height and turn in place.
      //
      // This was an ArcRotateCamera orbiting a target 300 m ahead, with the eye
      // height pinned by moving the target each frame. Orbit semantics leaked
      // straight through: up-arrow moves an orbit camera UP OVER its target,
      // which points the view DOWN — Tonio: "When I up-arrow the view nose-dives.
      // Down arrow tilts upward." — and left/right swung the eye round a 300 m
      // circle instead of turning it.
      //
      // So: a FreeCamera at the eye, arrows bound to ROTATION (up = look up;
      // Babylon's keysRotateUp lowers rotation.x, which pitches up) and its
      // move keys cleared so arrows never walk you. Dragging looks around.
      // Facing EAST (+X; +Z is north), just below the horizon.
      const cam = new BABYLON.FreeCamera('look', new BABYLON.Vector3(0, sky.eye.valueOf(), 0), el.scene)
      cam.setTarget(new BABYLON.Vector3(1, sky.eye.valueOf() - 0.08, 0))
      const keys = cam.inputs.attached.keyboard
      keys.keysUp = []
      keys.keysDown = []
      keys.keysLeft = []
      keys.keysRight = []
      keys.keysUpward = []
      keys.keysDownward = []
      keys.keysRotateLeft = [37]
      keys.keysRotateRight = [39]
      keys.keysRotateUp = [38]
      keys.keysRotateDown = [40]
      keys.rotationSpeed = 0.6
      cam.minZ = 0.1
      cam.maxZ = 12000
      cam.attachControl(el.parts.canvas, true)
      el.setActiveCamera(cam)
      // THE EYE IS PINNED: the slider means what it says.
      el.scene.registerBeforeRender(() => {
        cam.position.y = sky.eye.valueOf()
      })
    },
  },
  // shadowMaxZ: the cascades must reach the ground from the eye, which starts
  // ~200 m up — at the 100 m default nothing in view casts or receives.
  b3dSun({ activeDistance: 80, shadowMaxZ: 1200 }),
  // THE PAIR: a 256 cube for the nebulae, a data cube the shader decodes into
  // points. Split because they are different KINDS of thing — one is
  // low-frequency and one is not — and the points stay points at any zoom.
  skybox,
  b3dLightning({ seed: 3, rate: sky.lightningRate }),
  // Sunlight breaking through gaps in the deck; strongest in the rain.
  b3dLightShafts({}),
  // Rain and snow come from the WEATHER: nothing falls until a storm is
  // overhead, and it eases in and out as the storm passes.
  b3dAmbient({ preset: 'rain', weather: 'rain', radius: 14 }),
  b3dAmbient({ preset: 'snow', weather: 'snow', radius: 14 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 1000, end: 4000 }),
  terrain,
  // The layer case: a cloud DECK over the peaks, orographic so the towers
  // build over the actual mountains. Blob clouds (b3d-clouds) remain the
  // right tool for cloud you fly BETWEEN.
  // Rocks and trees by climate: pines in the cold, palms on warm shores, cacti
  // in hot dry country, boulders on the steep. See b3d-decorator.
  decorator,
  b3dCloudDeck({
    altitude: sky.altitude,
    coverage: sky.coverage,
    orographic: sky.orographic,
    wind: sky.wind,
    cirrus: sky.cirrus,
    evolve: sky.evolve,
    color: sky.deckColor,
    underColor: sky.deckUnderColor,
  }),
  // The sea follows BOTH dials: seaLevel (a fraction) times v-size, so the
  // ocean scales with the mountains instead of sitting at a fixed height
  // while the world reshapes around it. `follow` keeps it under the camera;
  // the ripples stay anchored in world space.
  water = b3dWater({ y: seaY(), waterSize: 8000, follow: true, twoSided: true, waterColor: demo.waterColor, colorBlendFactor: demo.waterTint, fogColor: demo.waterFog }),
)

preview.append(scene)

// Regenerate the terrain when its dials move, and keep the sea at the same
// FRACTION of the terrain's height.
for (const key of ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe', 'seaLevel', 'sea']) {
  demo[key].observe(() => {
    // The biome's sea level is a LIVE dial on the terrain — write it BEFORE
    // regenerate() so the adopted generation key is the one the rebuild
    // satisfies (the reverse order cost a second full pool re-cut per step,
    // found by the 0.8.2 review gate).
    terrain.biomeSeaLevel = biomeSea()
    terrain.biomeLapseRate = lapse()
    terrain.regenerate()
    water.y = seaY()
  })
}
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Drag the terrain dials and the world reshapes under you. Cover the sky, drop
the cloud base into the valleys, scrub to midnight — the encoded galaxy comes
out with the moon riding it, the deck moonlit above.

## The kitchen sink grows from here

- **Provinces** land as toggles like the volcano: a footprint, a falloff, and
  what they do to the terrain and the weather — see PROVINCE-DESIGN.md.
- **Weather systems** arrive as province-driven dials (one wind, shared and
  overridable — see the TODO).
- **The simulation** (world-store / world-view) gets a corner of this world
  to populate — the same one a visitor just reshaped.
*/
/*{ "parent": "Demos", "order": 40 }*/
