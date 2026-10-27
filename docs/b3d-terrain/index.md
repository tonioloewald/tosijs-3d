# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross
contour and fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dCloudDeck, b3dWater, b3dHud, b3dLight, b3dFog, b3dAircraft, b3dDeath, b3dLibrary, gameController, inputFocus, label3d, slider3d, toggle3d, blendProfiles, mesaProfile, cliffProfile, rollingProfile, profileField, volcano } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span } = elements

const { demo } = tosi({
  demo: {
    seed: 111,
    volcano: false,
    // AMPLITUDES INTERACT WITH horizScale: the scales are DIVIDED by it, so at
    // h-size 8 a grossScale of 0.015 means ~530m features — and a few metres
    // of amplitude across 530m is a plain, not a landscape.
    // (⚠️ line comments ONLY in a doc demo: a block comment's closing
    // delimiter ends the enclosing doc comment and truncates the demo —
    // which is exactly how v-size ended up undefined and this went flat.
    // Writing the delimiter even inside a line comment does it too.)
    grossScale: 0.015,
    detailScale: 0.09,
    horizScale: 8,
    grossAmplitude: 350,
    detailAmplitude: 45,
    wireframe: false,
    debugColor: false,
  },
})

// The weather is ONE dial. Transmission, the gloom under the deck and (past 1)
// the height of the cloud all follow `coverage`, so there is no way to ask for
// a sky that contradicts itself. Past 1 the base stays put and the top towers.
//
// `cloud base` is separate because it is geography, not weather: drop it to
// ~250 and the peaks stand out of the overcast, and you have to get down into
// the valleys to see anything at all.
const { sky } = tosi({
  sky: { coverage: 0.3, altitude: 400, timeOfDay: 10, orographic: 0.8 },
})

// Priority-pool quadtree LOD: one shared pool of tiles, fine near / coarse far,
// filled by priority (biased toward where you're looking + going). horizScale 4
// makes level-0 tiles 320 across, so the fine region is broad; reach 5000 puts
// the coarse edge just past the fog. Larger radius so the cylinder doesn't repeat.
const terrain = b3dTerrain({
  seed: demo.seed,
  biome: 'on', // biome-shaded — see /biome-chart/ for the full showcase
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  // Big tiles + few levels keep the pool small and the meshes cheap. tileSize /
  // lodLevels / reach are world-shape choices; hiResSubdivisions and poolSize are
  // left to adapt to the device tier (see b3d-quality) — a workstation gets more
  // detail, a Quest less, with no per-scene tuning.
  tileSize: 128,
  lodLevels: 3,
  splitFactor: 2,
  reach: 5000,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  horizScale: demo.horizScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  // Auto-centre the heightfield on 0 (peaks up, valleys down) so the water plane at 0 floods the
  // valleys into a sea — and it stays centred as you slide v-size, unlike a fixed baseHeight.
  center: true,
  wireframe: demo.wireframe,
  debugColor: demo.debugColor,
})
// LOCALIZED slope profiles give the terrain regional character: mesas in one
// province, rolling country in another, sea-cliff coasts in a third — with
// continuous transitions between (see /slope-profile/).
terrain.grossFilter = blendProfiles(
  blendProfiles(mesaProfile(5), cliffProfile(0.45, 0.12), profileField(demo.seed + 7, 0.003)),
  rollingProfile(0.4),
  profileField(demo.seed + 13, 0.0024)
)
terrain.regenerate()

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft. It spawns under the cloud base (400) and
// above the peaks, already above the hover ceiling → in FLIGHT mode:
// right trigger = forward throttle, pull back to climb, turn stick banks.
const plane = () => b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  // A ceiling ABOVE the cloud deck, because the whole point of a deck is that
  // you can be under it, in it, or over it. The stock 300 m is a low-level
  // strike ceiling and it sat below even the spawn altitude here.
  player: true, y: 320, ceiling: 1600, vtolSpeed: 6, maxSpeed: 50,
})
const focus = inputFocus(gameController(), plane())

const scene = b3d(
  {
    frameRate: 60,
    gamepad: true,
    // Controls live in the dual-presence scene panel: the owl opens them on flat
    // screens, and the SAME panel opens in VR — so you can retune
    // the terrain from inside the headset. All widgets bind the same `demo.*`
    // reactive values the regenerate observers below already watch.
    panelTitle: 'Terrain',
    scenePanel: () => [
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.005, max: 0.3, scale: 'log' }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.02, max: 1, scale: 'log' }),
      slider3d({ label: 'h size', value: demo.horizScale, min: 0.25, max: 10, scale: 'log2' }),
      slider3d({ label: 'v size', value: demo.grossAmplitude, min: 0, max: 400, step: 1 }),
      slider3d({ label: 'v detail', value: demo.detailAmplitude, min: 0, max: 50, step: 0.5 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 999, step: 1 }),
      // A PROVINCE, on the live terrain: an authored volcano forced through the
      // noise plus the volcanism field that makes it glow. This is the half of
      // the province idea that works today — the carving half needs a
      // volumetric tile path (see TUNNEL-DESIGN). Worth having here because it
      // is the half that meets LOD, streaming and floating origin.
      toggle3d({
        label: 'volcano province',
        value: demo.volcano,
        handleChange: (on) => {
          const v = volcano({ x: 600, z: -400, radius: 420, height: 260, craterRadius: 90, craterDepth: 80 })
          terrain.landform = on ? v.landform : null
          terrain.provinceField = on ? v.province : null
          terrain.regenerate()
        },
      }),
      label3d({ text: 'Weather' }),
      slider3d({ label: 'cloud cover', value: sky.coverage, min: 0, max: 2, step: 0.02 }),
      slider3d({ label: 'cloud base', value: sky.altitude, min: 60, max: 1400, step: 10 }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.25 }),
      slider3d({ label: 'orographic', value: sky.orographic, min: 0, max: 1, step: 0.05 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      toggle3d({ label: 'debug color', value: demo.debugColor }),
    ],
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.globalPosition // world pos (the chase cam is parented)
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ activeDistance: 80 }),
  // THE PAIR: a 256 cube for the nebulae, a data cube the shader decodes into
  // points for the stars. Split because they are different KINDS of thing —
  // one is low-frequency and one is not — and the points stay points at any
  // zoom rather than being a smear baked at one resolution.
  b3dSkybox({
    timeOfDay: sky.timeOfDay,
    realtimeScale: 0,
    starfieldCube: '/sky/nebula',
    starfieldData: '/sky/stars',
    starfieldTilt: '12,25,58',
  }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 1000, end: 4000 }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  terrain,
  // A cloud DECK over the peaks. `follow` keeps it centred under you and it is
  // origin-shift aware, so it neither runs out nor lurches when the terrain rebases
  // the world — the sheet slides, the weather stays where it is. Fly up through it
  // and the world whites out; the shadows underfoot are the same field you flew into.
  //
  // This is the layer case. Blob clouds (b3d-clouds) are still the right tool for
  // cloud you fly BETWEEN, and for a stylised sky — see their own page.
  // `orographic` asks the TERRAIN for its own height sampler, so the towers build
  // over the mountains that are actually there — landforms, the volcano province,
  // slider changes and all — rather than over a second guess at the same ground.
  b3dCloudDeck({
    altitude: sky.altitude,
    coverage: sky.coverage,
    orographic: sky.orographic,
    wind: 10,
  }),
  // A sea at height 0. The terrain now straddles 0 (center above), so the valleys flood into
  // fjords and islands. Big AND `follow`: the plane snaps to a coarse grid under the camera (so it
  // never runs out from under you and never flickers), while the ripples stay anchored in world
  // space — an endless, stationary ocean. Dive below it and the underwater fog closes in.
  b3dWater({ y: 0, waterSize: 8000, follow: true, twoSided: true }),
  // Cockpit HUD (speed / altitude / horizon). Cockpit view only by default.
  b3dHud({}),
  // Death's exit: crash into a hillside and you get the wreck, spectate, and a
  // respawn panel instead of being welded to the wreck forever.
  b3dDeath({ title: 'DOWN', spectate: 'chase', respawn() { focus.appendChild(plane()) } }),
  focus,
)

// Only a readout stays as a flat overlay — the tweakable settings all live in the
// settings panel (which also works in VR). See the `scenePanel` hook above.
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    posDisplay,
  )
)

// Regenerate terrain when parameters change
for (const key of ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe', 'debugColor']) {
  demo[key].observe(() => {
    terrain.regenerate()
  })
}
```
```css
.preview { display: flex; flex-direction: column; height: 100%; }
tosi-b3d { flex: 1; min-height: 0; width: 100%; }
.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
}
.debug-panel label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.debug-panel p {
  margin: 0;
  opacity: 0.7;
}
.pos-display {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  opacity: 0.7;
}
```

Pull back on the stick to climb, the triggers go up and down (they are the throttle once you are fast), and turn to bank. The terrain's settings are in the scene panel (the owl), in VR too.

## How it works

The terrain streams from one shared **priority pool** of tiles over a **quadtree
LOD**: fine near the camera, coarse far, with exactly one LOD per patch of ground
(a coarse cell is exactly four finer cells — no overlap, no gaps). Each frame the
pool is diffed against the cells that *should* exist; blanks are filled by
priority (near, and biased toward where you're facing/travelling) — reusing free
tiles or stealing the weakest placed one — capped at `fillBudget` per frame so
movement never hitches. Per-tile skirts (with lied normals) hide any crack at a
LOD boundary. Includes floating-origin rebasing and a recenter mechanism — when
travel exceeds `maxTravelDistance`, a `recenter-needed` event fires so the game
layer can orchestrate a visual transition before calling `recenter()`.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `12345` | Noise seed |
| `surfaceType` | `'cylinder'` | `'cylinder'`, `'torus'`, or `'sphere'` |
| `majorRadius` | `100` | Torus major radius |
| `minorRadius` | `40` | Torus minor radius |
| `radius` | `200` | Sphere/cylinder radius |
| `cylinderHeight` | `200` | Cylinder height (v range before reflection) |
| `tileSize` | `10` | World-space size of a level-0 (finest) tile |
| `hiResSubdivisions` | `auto` | Vertices per tile edge (same at every level); `auto` = device tier |
| `lodLevels` | `5` | Number of LOD levels; level k tiles are `tileSize × 2^k` |
| `poolSize` | `auto` | Shared tile budget; the pool renders the top-priority cells (`auto` = device tier) |
| `fillBudget` | `auto` | Max tiles (re)built per frame — a churn backstop (`auto` = device tier) |
| `tileBuildMs` | `auto` | **Milliseconds of tile building allowed per frame** — the cap that actually bounds the worst frame. A tile COUNT bounds it only by accident (a tile's cost swings with subdivisions, octaves, device and JS engine); a time cap bounds it by construction everywhere, and self-corrects when you raise detail. Always builds ≥1 tile. (`auto` = device tier) |
| `splitFactor` | `2` | LOD falloff: subdivide a cell when nearer than `splitFactor × tileSize` |
| `reach` | `0` | Terrain radius (0 = auto from the coarsest tile). Clamped against `tileSize` — the product is the footgun. Import `budgetedReach` from `tosijs-3d/terrain-grid` to clamp a slider against the same limit |
| `grossScale` | `0.015` | Gross noise frequency — a RECIPROCAL wavelength, so SMALL numbers make BIG landforms (0.015 ≈ 65m features before `horizScale`) |
| `detailScale` | `0.09` | Detail noise frequency, same units |
| `horizScale` | `1` | Horizontal world scale — scales every tile's size AND the sampling together (>1 = bigger terrain that reaches further; a clean zoom, not just a frequency change) |
| `debugColor` | `false` | Debug: tint each tile a distinct hashed colour to expose the tile/LOD layout |
| `profile` | `false` | Debug: time tile building and report it on `debugState` (see below). Off = zero cost |
| `grossAmplitude` | `8` | Gross height multiplier. ⚠️ Meaningless on its own: it's spread over `grossScale`/`horizScale`, so the same number is a mountain range at one scale and a plain at another |
| `detailAmplitude` | `3` | Detail height multiplier. Landscape reads best when this does REAL work rather than 5% — big gross features, small gross amplitude, busy detail |
| `biome` | `'off'` | `'on'` shades the ground with the procedural biome shader ([biome-plugin](/biome-plugin/)): a flat-colour chart picked from temperature, moisture, height and slope. Tune it live through `.biomePlugin` |
| `biomeSeaLevel` | `0` | Sea level for the biome classifier (`biome="on"`) — keep it equal to your water plane's `y` |
| `biomeLapseRate` | `0` (auto: 0.004) | Height→temperature lapse, in the biome CHART's units per metre (not `biomeTemperature`'s; see biome-chart). ⚠️ Must be scaled to your vertical range: `≈ baseTemperature / relief`. The auto value, 0.004, is fixed (not scaled to your relief): it is a small-world number and renders a 340m world entirely as snow |
| `biomeTemperature` | `0.45` | Sea-level temperature: `0` is 0 °C and each unit is 50 °C, so the default is 22.5 °C, `-1` is -50 °C, and it is not limited to that range (see biome-chart's `chartTemperature`). LIVE |
| `biomeMoisture` | `-1` (auto 0.45) | Land moisture, `0…1`: dead → dry (dune) → medium (steppe) → **wet (forest)**. Land sits on the chart at three quarters of this (the top row is the sea's), so forest needs ≈1 and a green world wants ~0.9; height and the climate regions dry it from there. The default is steppe. LIVE |
| `biomeVolcanicScale` | `-1` (auto 0.09) | Volcanic plate frequency, 1/m. Scale to the volcano: 0.09 suits a ~50 m cone; a 400 m one wants ~0.02. LIVE |
| `biomeSeason` | `0.25` | Where in the year it is, 0…1: 0 spring equinox, 0.25 midsummer, 0.5 autumn equinox, 0.75 midwinter. Does nothing while `biomeSeasonality` is 0. LIVE |
| `biomeSeasonality` | `0` | How far the year swings the temperature axis, in chart units (0 = no seasons; 0.2 is temperate). Winter cools the whole chart; autumn turns decorator leaves. LIVE |
| `normalSmoothing` | `0.6` | Low-pass the NORMALS' height field (positions stay crisp) — kills cliff-face zigzag |
| `landform` (property) | `null` | `(x,z,h) => h'` — force an authored shape through the noise. See [landform](?landform.ts) |
| `provinceField` (property) | `null` | `(x,z) => 0..1` — local volcanism, carried per-vertex to the biome shader |
| `rimCollar` | `12` | Metres the rim of a patch hole folds down into the opening |
| `lat` / `lon` | `-45` / `0` | Where this ground is on its planet: the latitude and longitude of the terrain's origin, degrees. On a cylinder or torus, the same position in the noise's domain |
| `planet` | `''` | A selector for the `<tosi-b3d-planet>` this is the GROUND OF (`'#moon'`, sphere only): where the sea, coasts and mountain ranges are is the planet's, scaled to this `radius` with the sea at 0, and this terrain's detail layer and landforms ride on top. A pin on the globe lands on the ground it shows. Rebuilds when the planet changes. (The other way round, a planet's `terrain` draws the globe from this ground) |
| `worldU` / `worldV` | `0` / `0.25` | The same place as fractions of a turn (JS properties over `lon`/`lat`: `worldU = lon / 360`, `worldV = (lat + 90) / 180`). ⚠️ `worldV = 0` (`lat = -90`) puts a cylinder world ON a mirror plane (`CylinderSampler` reflects v) — 0.25 is the furthest from both |
| `baseHeight` | `0` | Flat vertical offset (m). The noise is 0..amplitude; `-grossAmplitude/2` centres the terrain on 0 so a water plane at 0 floods the valleys into a sea |
| `center` | `false` | Centre the heightfield on 0 (an offset of `-grossAmplitude/2`) whatever the amplitude, so a water plane at 0 keeps reading as a sea while you tune. Adds to `baseHeight` |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Profiling tile builds

Terrain is the only place this library does *bulk* numeric work in a burst, so it's the
only real candidate for a worker or wasm. Before moving anything, measure it:

```javascript
terrain.setProfiling(true)   // or the `profile` attribute
// …fly around for a bit, then:
terrain.resetProfile()       // drop the first-load burst
// …fly some more:
console.table(terrain.debugState)
```

`debugState` splits the cost where it actually matters — **not** into "fast" and "slow",
but into **movable** and **immovable**:

| Field | Means |
|-------|-------|
| `fieldMsPerTile` | Noise + analytic normals. Plain float arithmetic — a worker or wasm *could* take this |
| `skirtMsPerTile` | Skirt verts + debug tint. Also movable |
| `uploadMsPerTile` | `updateVerticesData` — a GPU handoff. **Nothing** moves this off the main thread |
| `movableShare` | The **ceiling on any threading/wasm win**. If it's small, don't bother |
| `nsPerSample` | Cost per `heightAt` (each is 2 fractal calls × 6 octaves = 12 perlin evals) |
| `worstFrameMs` | The hitch you actually feel — one saturated frame, not the average tile |
| `worstFrameSaturated` | Whether that frame hit `fillBudget` (the cap set the ceiling, not the work) |

Two things to know before reading the numbers. `samplesPerTile` counts **five** `heightAt`
per vertex — one for the height, four for the ±e normal gradient — so ~80% of the noise
exists to make normals; sampling a padded grid once and central-differencing it would cut
that ~4–5× **in plain JS**, before any new technology. And a big `movableMs` only becomes a
*felt* win if it moves off-thread: making a blocking 20ms burst into a blocking 5ms burst
still drops frames (and in XR a dropped frame is nausea, not jank).

## The tile grid

The arithmetic under the tiles is pure (no Babylon, no DOM) and exported as
`tosijs-3d/terrain-grid`: where a tile sits in the world, which world point
each of its vertices samples, how far a level reaches, and which coarse tiles a
finer level hides. You only need it if you build on the tile substrate yourself
(a volumetric patch, a custom streamer), or to clamp a `reach` slider with
`budgetedReach`.

```javascript
import { lodTileSize, tileCenter, cellIndex } from 'tosijs-3d/terrain-grid'

lodTileSize(128, 2) // 512: each level doubles the tile
cellIndex(700, 512) // 1: which tile a coordinate falls in
tileCenter(1, -2, 512) // { x: 512, z: -1024 }
```

`desiredCells` is the quadtree: given a viewer, the set of tiles that should
exist. See also [[sdf-lattice]].

## Usage

```javascript
import { b3d, b3dTerrain, plateauFilter } from 'tosijs-3d'

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  grossScale: 0.02,
  grossAmplitude: 10,
})

// Apply a plateau gradient filter for stepped terrain
terrain.grossFilter = plateauFilter(5)
terrain.regenerate()

document.body.append(b3d({}, terrain))
```
