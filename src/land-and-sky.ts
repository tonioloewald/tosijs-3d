/*#
# Land and Sky

**THE KITCHEN SINK** — one world that grows with the world-sim layer. Terrain
(with live dials), a sea, weather over both, and the encoded sky behind. As
provinces, weather systems and the simulation land, they land HERE first: this
page is where the pieces meet, so it is also where their disagreements show
first — which is the point.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dCloudDeck, b3dDecorator, b3dWater, b3dLight, b3dFog, label3d, slider3d, toggle3d, select3d, volcano } from 'tosijs-3d'
import { tosi } from 'tosijs'

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
    // The atmosphere. `atmosphere` is how much air the WORLD has (0 is the
    // Moon: black noon, stars out); the tints colour the scattered light only.
    world: 'Earth', atmosphere: 1, dust: 0, turbidity: 10, rayleigh: 2, mieCoefficient: 0.005, luminance: 1,
    zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0,
    // The stars: size (1 = the default point), brightness, and the faint floor.
    decoBudget: 2000, decoRadius: 900, decoShadows: false,
    starSize: 1, starGain: 0.9, starFloor: 0.4, starSharpness: 3, twinkle: 0.35,
  },
})

// A world is a few dials at once — the preset writes them, and the sliders
// stay live afterwards so you can walk away from the preset.
// Mars is almost no AIR and a lot of DUST: its sky is bright because of the
// dust, not the gas (under 1% of Earth's). Gas scatters blue; dust scatters a
// bright haze the tint colours.
const WORLDS = {
  Earth: { atmosphere: 1, dust: 0, zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0 },
  Mars: { atmosphere: 0.03, dust: 0.85, zenithTint: '#c8a070', horizonTint: '#e0b080', tintStrength: 1 },
  Alien: { atmosphere: 1, dust: 0, zenithTint: '#60c080', horizonTint: '#b0e0a0', tintStrength: 0.7 },
  Airless: { atmosphere: 0, dust: 0, zenithTint: '#ffffff', horizonTint: '#ffffff', tintStrength: 0 },
}
// SIZE is the inverse of the shader's sharpness: a gaussian's width goes as
// 1/sqrt(sharpness), so size 2 is twice the width of the default point.
sky.starSize.observe(() => {
  sky.starSharpness.value = 3 / Math.max(0.05, sky.starSize.value) ** 2
})
sky.world.observe(() => {
  const w = WORLDS[sky.world.value]
  if (w) for (const k of Object.keys(w)) sky[k].value = w[k]
})

// The volcano is authored ONCE and switched in and out. Applied here as well
// as from the toggle because it is ON by default, and the toggle's handler only
// runs when someone flips it.
const theVolcano = volcano({ x: 600, z: -400, radius: 420, height: 260, craterRadius: 90, craterDepth: 80 })
function applyVolcano(on) {
  terrain.landform = on ? theVolcano.landform : null
  terrain.provinceField = on ? theVolcano.province : null
}

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
  biomeSeaLevel: demo.seaLevel * demo.grossAmplitude,
  biomeLapseRate: 0.5 / demo.grossAmplitude,
  biomeTemperature: demo.temperature,
  biomeMoisture: demo.moisture,
  biomeVolcanicScale: demo.volcanicScale,
})

applyVolcano(demo.volcano.valueOf())

const scene = b3d(
  {
    // Controls live in the dual-presence scene panel: a ⚙ toggles them on flat
    // screens, and the SAME panel floats in front of you in VR.
    scenePanel: () => [
      label3d({ text: 'Terrain' }),
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
      toggle3d({
        label: 'volcano province',
        value: demo.volcano,
        handleChange: (on) => {
          applyVolcano(on)
          terrain.regenerate()
        },
      }),
      label3d({ text: 'Climate' }),
      slider3d({ label: 'temperature', value: demo.temperature, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'moisture', value: demo.moisture, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'volcanic scale', value: demo.volcanicScale, min: 0.005, max: 0.15, scale: 'log' }),
      label3d({ text: 'Weather' }),
      slider3d({ label: 'cloud cover', value: sky.coverage, min: 0, max: 2, step: 0.02 }),
      slider3d({ label: 'cloud base', value: sky.altitude, min: 60, max: 1400, step: 10 }),
      slider3d({ label: 'orographic', value: sky.orographic, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'wind', value: sky.wind, min: 0, max: 40, step: 1 }),
      // Signed: positive streaks ALONG the wind, negative ACROSS it.
      slider3d({ label: 'cirrus', value: sky.cirrus, min: -1, max: 1, step: 0.05 }),
      slider3d({ label: 'evolve', value: sky.evolve, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.25 }),
      label3d({ text: 'Atmosphere' }),
      select3d({ label: 'world', value: sky.world, options: Object.keys(WORLDS) }),
      slider3d({ label: 'air', value: sky.atmosphere, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'dust', value: sky.dust, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'tint', value: sky.tintStrength, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'turbidity', value: sky.turbidity, min: 1, max: 40, step: 0.5 }),
      slider3d({ label: 'rayleigh', value: sky.rayleigh, min: 0, max: 4, step: 0.05 }),
      slider3d({ label: 'mie', value: sky.mieCoefficient, min: 0, max: 0.05, step: 0.001 }),
      slider3d({ label: 'luminance', value: sky.luminance, min: 0.1, max: 2, step: 0.05 }),
      label3d({ text: 'Stars' }),
      slider3d({ label: 'star size', value: sky.starSize, min: 0.4, max: 3, step: 0.05 }),
      slider3d({ label: 'star brightness', value: sky.starGain, min: 0, max: 3, step: 0.05 }),
      slider3d({ label: 'faint stars', value: sky.starFloor, min: 0, max: 1, step: 0.02 }),
      slider3d({ label: 'twinkle', value: sky.twinkle, min: 0, max: 1, step: 0.05 }),
      label3d({ text: 'Vegetation' }),
      // THE BUDGET is the performance dial: a count, not a density. Watch the
      // Perf Stats panel's decorator row (placed, draw calls, build ms).
      slider3d({ label: 'rocks & trees', value: sky.decoBudget, min: 0, max: 20000, step: 500 }),
      slider3d({ label: 'reach (m)', value: sky.decoRadius, min: 200, max: 3000, step: 100 }),
      toggle3d({ label: 'tree shadows', value: sky.decoShadows }),
      label3d({ text: 'Camera' }),
      slider3d({ label: 'eye height', value: sky.eye, min: 5, max: 1500, step: 10 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
    ],
    sceneCreated(el, BABYLON) {
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
  b3dSkybox({
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
  }),
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
  }),
  // The sea follows BOTH dials: seaLevel (a fraction) times v-size, so the
  // ocean scales with the mountains instead of sitting at a fixed height
  // while the world reshapes around it. `follow` keeps it under the camera;
  // the ripples stay anchored in world space.
  water = b3dWater({ y: demo.seaLevel * demo.grossAmplitude, waterSize: 8000, follow: true, twoSided: true }),
)

preview.append(scene)

// Regenerate the terrain when its dials move, and keep the sea at the same
// FRACTION of the terrain's height.
for (const key of ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe', 'seaLevel']) {
  demo[key].observe(() => {
    // The biome's sea level is a LIVE dial on the terrain — write it BEFORE
    // regenerate() so the adopted generation key is the one the rebuild
    // satisfies (the reverse order cost a second full pool re-cut per step,
    // found by the 0.8.2 review gate).
    terrain.biomeSeaLevel = demo.seaLevel * demo.grossAmplitude
    terrain.biomeLapseRate = 0.5 / demo.grossAmplitude
    terrain.regenerate()
    water.y = demo.seaLevel * demo.grossAmplitude
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
