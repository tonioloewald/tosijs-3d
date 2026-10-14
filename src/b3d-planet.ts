/*#
# b3d-planet

Procedural planet mesh using a subdivided cube projected onto a sphere.
Height displacement from 3D Perlin noise (gross + detail layers) with
gradient filters for terrain shaping. Same noise system as `b3d-terrain`
so ground-level and orbital views are consistent.

Optional atmosphere (glow shell) and ocean (water sphere at sea level).

## Demo

```js
import { b3d, spaceBackdrop, b3dLight, b3dPlanet, ROCKY_WORLDS, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, p } = elements

const { demo } = tosi({
  demo: {
    grossScale: 0.005,
    detailScale: 0.02,
    grossAmplitude: 5,
    detailAmplitude: 1,
    atmosphere: 0.08,
    clouds: 0.45,
    ocean: 0.6,
    wireframe: false,
    rotationSpeed: 0.05,
    // A rocky world's look ('' = these dials): see rocky-world.
    world: '',
  },
})

const planet = b3dPlanet({
  seed: 42,
  radius: 50,
  subdivisions: 64,
  biome: 'on', // the biome shader's planetary front-end — radial altitude, insolation
  world: demo.world,

  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  atmosphere: demo.atmosphere,
  clouds: demo.clouds,
  ocean: demo.ocean,
  wireframe: demo.wireframe,
  rotationSpeed: demo.rotationSpeed,
})

const scene = b3d(
  {
    frameRate: 60,
    scenePanel: () => [
      label3d({ text: 'Planet' }),
      select3d({ label: 'world', value: demo.world, options: ['', ...Object.keys(ROCKY_WORLDS)] }),
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.001, max: 0.1, scale: 'log' }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.005, max: 0.1, scale: 'log' }),
      slider3d({ label: 'gross amp', value: demo.grossAmplitude, min: 0, max: 20, step: 0.5 }),
      slider3d({ label: 'detail amp', value: demo.detailAmplitude, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'rotation', value: demo.rotationSpeed, min: 0, max: 0.5, step: 0.01 }),
      slider3d({ label: 'atmosphere', value: demo.atmosphere, min: 0, max: 0.2, step: 0.01 }),
      slider3d({ label: 'clouds', value: demo.clouds, min: 0, max: 3, step: 0.05 }),
      slider3d({ label: 'ocean', value: demo.ocean, min: 0, max: 1, step: 0.05 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      // The biome climate, in the terms you think in: temperature at the
      // equator, the temperate zone, and the pole — plus moisture and the
      // rain-shadow strength. All live (bindForSubMesh reads each frame).
      label3d({ text: 'Climate' }),
      ...(planet.biomePlugin
        ? (() => {
            const p = planet.biomePlugin.params
            const bind = (label, key, min, max, step) =>
              slider3d({ label, value: p[key], min, max, step, handleChange: (v) => { p[key] = v } })
            return [
              bind('equator temp', 'equatorTemp', 0, 1, 0.01),
              bind('temperate temp', 'temperateTemp', 0, 1, 0.01),
              bind('pole temp', 'poleTemp', 0, 1, 0.01),
              bind('moisture', 'mapMoisture', 0, 1, 0.01),
              bind('moisture variation', 'mNoiseAmp', 0, 1, 0.01),
              bind('rain shadow', 'rainShadow', 0, 0.6, 0.01),
              bind('volcanism', 'volcanism', 0, 1, 0.01),
            ]
          })()
        : []),
    ],
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        150,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 60
      camera.upperRadiusLimit = 500
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  ...spaceBackdrop({ sky: '/sky' }),
  // A little fill, so the night side is not a hole in the stars.
  b3dLight({ intensity: 0.15 }),
  planet,
)

preview.append(
  scene,
  div({ class: 'debug-panel' }, p('Scroll to zoom, drag to orbit'))
)

// Choosing a world sets the dials to its numbers (the planet writes the
// same ones into itself), and they are yours to move from there.
demo.world.observe(() => {
  const look = ROCKY_WORLDS[demo.world.value]
  if (look) Object.assign(demo, { grossAmplitude: look.grossAmplitude, detailAmplitude: look.detailAmplitude, atmosphere: look.atmosphere, clouds: look.clouds, ocean: look.ocean })
  // Written straight away: a bound attribute arrives a frame later, after
  // this rebuild.
  planet.world = demo.world.value
  planet.regenerate()
})
for (const key of ['grossScale', 'detailScale', 'grossAmplitude', 'detailAmplitude']) {
  demo[key].observe(() => {
    planet.regenerate()
  })
}
for (const key of ['atmosphere', 'clouds', 'ocean', 'wireframe', 'rotationSpeed']) {
  demo[key].observe(() => {
    planet.updateOptions()
  })
}
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `12345` | Noise seed |
| `radius` | `50` | Base sphere radius |
| `heightMap` | `''` | A real world's HEIGHTS: a 16-bit greyscale PNG, 2:1, `metres = value − 32768` (see [planet-map](/planet-map/)). A full URL, or a path resolved by `assetUrl`: call `setAssetBase('https://cdn.tosijs.net')` once and `nasa/moon/height-2k.png`, `nasa/mars/…` and `noaa/earth/…` are there. Sets `surface` when it has loaded. Those maps are NASA's and NOAA's and free to use with credit, which is yours to show |
| `bodyRadiusKm` | `0` | The real body's radius in km, which is what the heights are a fraction of (Moon 1737.4, Mars 3389.5, Earth 6371). `0` reads the height map's `body-radius-km` header, which a browser only shows to a page on the same origin unless the server exposes it: set this for a map from another host |
| `colorMap` | `''` | A real world's COLOUR: a 2:1 image, longitude −180° to 180° left to right. `nasa/moon/color-2k.jpg` and so on. Replaces the biome shading and the sea sphere |
| `flatSea` | `'off'` | `'on'` says the world has a SEA at 0 m: everything below is drawn as level water (and its depth still colours it), for a world whose map shows water (the Earth) |
| `seaGlint` | `1` | The sun's glint on the sea, `0…1`: a patch of sparkle, broken up by fine wave texture, that slides over the water as you move |
| `seaIce` | `0` | Sea ice toward the poles, `0…1` |
| `inlandWater` | `'off'` | `'on'` guesses LAKES from a `colorMap`: where the picture is blue, or nearly black (how NASA's Blue Marble paints deep lakes), it is drawn as water: the map's colour, with the glint. The height map only knows the sea, and a lake is above it. A guess: blue ice or black lava can pass for a lake |
| `relief` | `1` | With a `heightMap` or a `surface` set: how much its true relief is exaggerated. `1` is to scale, which on a globe is flat to the eye; 20 to 60 reads as a relief map |
| `world` | `''` | A ROCKY WORLD preset: `'moon'`, `'mercury'`, `'mars'`, `'venus'`, `'io'`, `'titan'` or `'earth'` (see [rocky-world](/rocky-world/)). Choosing one writes its sea, air, clouds, relief, craters and climate into this planet's own settings, which stay yours to tune; `worldOverrides` (a property) changes the preset for this planet |
| `craters` | `0` | How cratered, `0…1` (see landform's `sphereCraters`) |
| `seaShallow` / `seaDeep` | `''` | The sea's colour in the shallows and the deep, `#rrggbb` (both, or neither: blank is an Earth's) |
| `craterSize` | `0.15` | The largest crater's radius, a fraction of the planet's |
| `craterWear` | `0.6` | How worn the old craters are, `0…1` |
| `craterAsymmetry` | `0` | More craters on the planet's local +Z side, `-1…1` (a locked moon's leading side) |
| `gas` | `''` | Make it a GAS GIANT: `'jupiter'`, `'saturn'`, `'uranus'` or `'neptune'`. A smooth banded sphere with winds and a storm in place of terrain, sea and air shell; `seed` gives a different planet of the same kind and `rings` still applies. See [gas-giant](/gas-giant/) |
| `bands` | `0` | Gas giant: stripes from pole to pole. `0` = the preset's |
| `turbulence` | `-1` | Gas giant: how torn the band edges are, `0…1`. `-1` = the preset's |
| `storm` | `-1` | Gas giant: size of the great storm, `0` = none. `-1` = the preset's |
| `bandColors` | `''` | Gas giant: up to three `#rrggbb`, comma separated (zones, belts, accent). Blank = the preset's |
| `ringInner` | `0` | Inner edge of the ring, in planet radii from the centre. `0` = the gas giant preset's, else 45% of the outer edge |
| `ringOuter` | `0` | Outer edge of the ring, in planet radii. `0` = the gas giant preset's, else 1.5 to 3 by `rings` |
| `ringOpacity` | `-1` | `0…1`, always multiplied by `rings` (which reaches full strength at about 0.85). `-1` = the gas giant preset's |
| `ringColor` | `''` | `#rrggbb`. Blank = the gas giant preset's, else a pale tan |
| `subdivisions` | `64` | Grid subdivisions per cube face |
| `grossScale` | `0.005` | Gross noise frequency |
| `detailScale` | `0.02` | Detail noise frequency |
| `grossAmplitude` | `5` | Gross height multiplier |
| `detailAmplitude` | `1` | Detail height multiplier |
| `atmosphere` | `0.08` | Atmosphere thickness (fraction of radius, 0=none). The clouds ride half way up it |
| `clouds` | `0` | (Provisional: this is the weather from ORBIT only. It is its own field, and does not yet agree with the cloud deck or the weather cells on that world's ground.) Weather seen from orbit: how much of the sky is cloud: `1` is mostly cloud with breaks, and on to `3`, a solid deck (Venus). A shell inside the air, with winds that reverse with latitude, more cloud along the equator and the storm tracks, and a shadow on the ground beneath. `0` = none |
| `cloudColor` | `'#ffffff'` | The cloud's colour where lit |
| `storms` (property) | `[]` | Storms placed on the weather, up to four: `planet.storms = [{ lat: 22, lon: -60, size: 8, intensity: 1, lightning: 1 }]`. Each is a cyclone with an eye, turning the right way for its hemisphere, with lightning inside; `cyclone: 0` makes it a thunderstorm complex that sits and flashes. Needs `clouds` above 0. Provisional: a storm here is not yet a weather cell on the ground, and the shape of this may change when it is |
| `cloudSpeed` | `1` | How fast the weather moves. `0` holds it still |
| `ocean` | `0.6` | Ocean coverage (0=none, 0.6=60% of surface underwater) |
| `wireframe` | `false` | Debug: render as wireframe |
| `rotationSpeed` | `0` | Auto-rotation speed (radians/sec), west to east as planets turn. Negative turns it the other way |

*/
/*{ "parent": "space", "order": 40 }*/

import { Color } from 'tosijs'
import { isOff, B3dChild, sceneDelta, sceneSeconds } from './b3d-utils.js'
import type { BiomePlugin } from './biome-plugin.js'
import { GAS_GIANT_GLSL, gasGiantRgb, resolveGasGiant } from './gas-giant.js'
import { climateForGlobe, type PlanetSurface } from './sphere-map.js'
import { loadPlanetMap } from './planet-map.js'
import { createPlanetClouds, type PlanetStorm } from './planet-clouds.js'
import { sceneLight } from './gas-giant-material.js'
import {
  createPlanetBiome,
  createPlanetSurfaceMaterial,
} from './planet-surface-material.js'
import { assetUrl } from './asset-url.js'
import { resolveRockyWorld, type RockyWorldLook } from './rocky-world.js'
import { sphereCraters } from './landform.js'
import { createGasGiantMaterial } from './gas-giant-material.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { PerlinNoise } from './perlin-noise.js'
import { PiecewiseLinearFilter } from './gradient-filter.js'
import type { GradientFilter } from './gradient-filter.js'

// The 6 face directions for the subdivided cube.
// Each face: origin is one corner, right/up span the face.
// Winding must produce outward-facing normals.
const CUBE_FACES: { origin: number[]; right: number[]; up: number[] }[] = [
  // +X
  { origin: [1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
  // -X
  { origin: [-1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
  // +Y
  { origin: [-1, 1, 1], right: [2, 0, 0], up: [0, 0, -2] },
  // -Y
  { origin: [-1, -1, -1], right: [2, 0, 0], up: [0, 0, 2] },
  // +Z
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
  // -Z
  { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
]

export class B3dPlanet extends B3dChild {
  static preferredTagName = 'tosi-b3d-planet'

  static shadowStyleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    // Biome shader (TERRAIN-SHADER-DESIGN.md) with the PLANETARY front-end:
    // radial altitude around the planet centre, radial-up slope, insolation.
    // seaRadius auto-derives from the `ocean` percentile.
    biome: 'off' as 'on' | 'off',
    // A gas giant: 'jupiter' | 'saturn' | 'uranus' | 'neptune'. A smooth,
    // banded sphere in place of terrain and sea (see gas-giant).
    gas: '',
    // A real world from its maps (planet-map): a 16-bit height PNG and an
    // equirectangular colour image. Paths resolve through `assetUrl`.
    heightMap: '',
    colorMap: '',
    // The real body's radius, km: what the heights are measured against.
    // 0 = the height map's own `body-radius-km` header, where it can be read.
    bodyRadiusKm: 0,
    // Fill the seas level (heights below 0 read as 0): for a world whose
    // colour map shows water.
    flatSea: 'off' as 'on' | 'off',
    // The sun's glint on the sea, 0…1, and sea ice toward the poles, 0…1.
    seaGlint: 1,
    seaIce: 0,
    // Guess lakes from a colour map's blue, and give them the sea's glint.
    inlandWater: 'off' as 'on' | 'off',
    // With `surface` set: how much its true relief is exaggerated (1 = to
    // scale, which on a globe is flat to the eye).
    relief: 1,
    // Gas giant overrides; 0 / -1 / '' mean the preset's own.
    bands: 0,
    turbulence: -1,
    storm: -1,
    bandColors: '',
    // The ring's shape; 0 / -1 / '' mean the preset's (or the old rule).
    ringInner: 0,
    ringOuter: 0,
    ringOpacity: -1,
    ringColor: '',
    // A ROCKY WORLD's look (rocky-world): 'moon', 'mercury', 'mars',
    // 'venus', 'earth'. A preset: choosing one writes its sea, air, clouds,
    // relief, craters and climate into this planet's own settings, which
    // are then yours to tune.
    world: '',
    // Craters (when no `world` decides them): density 0…1, the largest's
    // radius as a fraction of the planet's, wear, and how many more fall
    // on the local +Z side (-1…1).
    craters: 0,
    // The sea's colour, shallow and deep ('' = an Earth's).
    seaShallow: '',
    seaDeep: '',
    craterSize: 0.15,
    craterWear: 0.6,
    craterAsymmetry: 0,
    seed: 12345,
    radius: 50,
    subdivisions: 64,
    grossScale: 0.005,
    detailScale: 0.02,
    grossAmplitude: 5,
    detailAmplitude: 1,
    atmosphere: 0.08,
    atmosphereColor: 'rgba(77,128,230,0.15)',
    atmosphereTurbulence: 0.5,
    // Weather seen from orbit: how much of the sky is cloud, 0 = none.
    clouds: 0,
    cloudColor: '#ffffff',
    cloudSpeed: 1,
    ocean: 0.6,
    rings: 0,
    wireframe: false,
    rotationSpeed: 0,
  }

  owner: B3d | null = null
  /**
   * ANOTHER WORLD'S SURFACE, to draw this planet from: set it to a terrain's
   * `planetSurface()` and the globe is that terrain seen from orbit (then
   * `regenerate()`). Its heights are true metres on a planet of its own
   * radius; `relief` says how much to exaggerate them, because real relief
   * is invisible at this size. With a surface set, the planet's own noise
   * settings are unused and the sea sits at the surface's sea level.
   */
  surface: PlanetSurface | null = null
  /**
   * Changes to the `world`'s look for THIS planet (`{ ocean: 0.3 }`), read
   * at the next build. The star system uses it to give each Earth-like
   * world its own share of sea.
   */
  worldOverrides: Partial<RockyWorldLook> | null = null
  /**
   * STORMS placed on the weather (needs `clouds` above 0): up to four, each
   * `{ lat, lon, size, intensity, lightning }`. A storm is a cyclone that
   * turns the right way for its hemisphere, with an eye, and lightning
   * flickering inside it, which on the night side is all you see of it.
   * Read every frame, so move one by changing its `lat` and `lon`.
   */
  storms: PlanetStorm[] = []
  grossFilter: GradientFilter = new PiecewiseLinearFilter()
  detailFilter: GradientFilter = new PiecewiseLinearFilter()

  private noise!: PerlinNoise
  private planetMesh: BABYLON.Mesh | null = null
  private atmosphereMesh: BABYLON.Mesh | null = null
  private oceanMesh: BABYLON.Mesh | null = null
  private cloudMesh: BABYLON.Mesh | null = null
  /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
  biomePlugin: BiomePlugin | null = null
  /** The undrawn material the biome plugin lives on (planet-surface-material). */
  private _biomeHost: BABYLON.StandardMaterial | null = null
  private _biomeParams: BiomePlugin['params'] | null = null
  private ringMesh: BABYLON.Mesh | null = null
  /** The node everything of this planet hangs from: move it to place the planet. */
  rootNode: BABYLON.TransformNode | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null
  private vertexHeights: Float32Array | null = null

  content = () => ''

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)

    this.rootNode = new BABYLON.TransformNode('planet-root', scene)
    this._builtSea = this._seaKey()
    this._loadHeightMap()
    this.buildPlanet()
    this.buildAtmosphere()
    this.buildOcean()
    this.buildClouds()
    this.buildRings()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.rootNode?.dispose()
    this.rootNode = null
    this.planetMesh = null
    this.atmosphereMesh = null
    this.oceanMesh = null
    this.cloudMesh = null
    this.ringMesh = null
    // So a planet put back in a scene fetches its heights again.
    this._heightMapLoaded = ''
    this._biomeHost?.dispose()
    this._biomeHost = null
    this.owner = null
  }

  /**
   * A globe OF a ground (a `surface` that carries its climate) is coloured
   * as that ground is: the same settings in the globe's units, and the same
   * colours, copied each frame so the ground's dials move the globe.
   */
  private _followGroundClimate(): void {
    const s = this.surface
    const plugin = this.biomePlugin
    if (s?.climate == null || plugin == null) return
    const attrs = this as any
    Object.assign(
      plugin.params,
      climateForGlobe(
        s.climate,
        s.radius,
        attrs.radius,
        attrs.relief > 0 ? attrs.relief : 1
      )
    )
    // The globe's slopes are the ground's, steepened by the relief; the
    // cliff test reads 1 - cos, which goes as the slope squared. (The 6 a
    // synthetic planet uses is for its own gentle noise.)
    const relief = attrs.relief > 0 ? attrs.relief : 1
    plugin.params.slopeExaggeration = 1 / (relief * relief)
    const colours = s.palettes?.()
    if (colours != null) {
      plugin.palette = colours.palette
      plugin.paletteB = colours.paletteB
    }
  }

  private update() {
    this._followGroundClimate()
    if (this.rootNode == null) return
    const attrs = this as any
    const speed: number = attrs.rotationSpeed
    // Negative runs it the other way (the direction it had before 0.10.3).
    if (speed !== 0) {
      const dt = sceneDelta(this.owner!.scene)
      // WEST TO EAST, as planets turn: seen from above the north pole,
      // anticlockwise. East is +longitude, toward +Z from +X, and in
      // Babylon's left-handed frame that is a NEGATIVE turn about Y. (It was
      // positive, and the Earth ran backwards.)
      this.rootNode.rotation.y -= speed * dt
    }
  }

  private buildPlanet() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius
    const subs: number = attrs.subdivisions
    this._applyWorld()
    this._makeCraters()
    if (attrs.gas) {
      /*
      A GAS GIANT HAS NO GROUND. A smooth sphere, slightly flattened (giants
      spin fast enough to bulge), drawn by the gas giant material: no
      terrain, no sea, no air shell. `rings` still works.
      */
      const mesh = BABYLON.MeshBuilder.CreateSphere(
        'planet',
        { diameter: radius * 2, segments: 48 },
        this.owner.scene
      )
      mesh.scaling.y = 0.93
      mesh.material = createGasGiantMaterial(
        this.owner.scene,
        resolveGasGiant(attrs.gas, {
          seed: 1 + (Math.abs(attrs.seed) % 97),
          bands: attrs.bands,
          turbulence: attrs.turbulence,
          storm: attrs.storm,
          colors: attrs.bandColors,
        })
      )
      mesh.parent = this.rootNode
      this.planetMesh = mesh
      this.vertexHeights = null
      if (!this.registered) {
        this.registered = true
        this.owner.register({ meshes: [mesh] })
      }
      return
    }

    const vertsPerFace = (subs + 1) * (subs + 1)
    const totalVerts = vertsPerFace * 6
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const heights = new Float32Array(totalVerts)
    const indices: number[] = []

    let vertOffset = 0
    for (let face = 0; face < 6; face++) {
      const f = CUBE_FACES[face]
      const baseVert = vertOffset

      for (let iy = 0; iy <= subs; iy++) {
        for (let ix = 0; ix <= subs; ix++) {
          const u = ix / subs
          const v = iy / subs

          // Position on cube face
          const cx = f.origin[0] + f.right[0] * u + f.up[0] * v
          const cy = f.origin[1] + f.right[1] * u + f.up[1] * v
          const cz = f.origin[2] + f.right[2] * u + f.up[2] * v

          // Normalize to sphere
          const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
          const nx = cx / len
          const ny = cy / len
          const nz = cz / len

          // Height from noise
          const h = this._heightFor(nx, ny, nz)
          heights[vertOffset] = h
          const r = radius + h

          const vi = vertOffset * 3
          positions[vi] = nx * r
          positions[vi + 1] = ny * r
          positions[vi + 2] = nz * r
          normals[vi] = nx
          normals[vi + 1] = ny
          normals[vi + 2] = nz

          vertOffset++
        }
      }

      // Indices for this face
      for (let iy = 0; iy < subs; iy++) {
        for (let ix = 0; ix < subs; ix++) {
          const a = baseVert + iy * (subs + 1) + ix
          const b = a + 1
          const c = a + (subs + 1)
          const d = c + 1

          indices.push(a, c, b)
          indices.push(b, c, d)
        }
      }
    }

    /*
    ONE MESH FOR LAND AND SEA (planet-surface-material, board #3271), for a
    planet with a colour map or without the biome shading. Every vertex
    under the sea is brought up TO the sea, and each keeps its true height
    as data (uv.x), so the shader can tell land from water per pixel and
    knows how deep the water is. There is no sea sphere.
    */
    let highest = 1e-3
    let deepest = 1e-3
    this.vertexHeights = heights
    const hasSea: boolean =
      this.surface != null ? !isOff(attrs.flatSea) : this._val('ocean') > 0
    const seaAt =
      this.surface != null || !hasSea
        ? 0
        : this.heightPercentile(this._val('ocean'))
    const heightData = new Float32Array(totalVerts * 2)
    for (let i = 0; i < totalVerts; i++) {
      const above = heights[i] - seaAt
      heightData[i * 2] = hasSea ? above : Math.max(above, 1e-4)
      if (above > highest) highest = above
      if (-above > deepest) deepest = -above
      if (hasSea && above < 0) {
        const x = positions[i * 3]
        const y = positions[i * 3 + 1]
        const z = positions[i * 3 + 2]
        const k = (radius + seaAt) / (Math.hypot(x, y, z) || 1)
        positions[i * 3] = x * k
        positions[i * 3 + 1] = y * k
        positions[i * 3 + 2] = z * k
        heights[i] = seaAt
      }
    }

    // Recompute normals from geometry for proper lighting
    BABYLON.VertexData.ComputeNormals(
      positions,
      indices,
      normals as unknown as number[]
    )

    const mesh = new BABYLON.Mesh('planet', this.owner.scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.uvs = heightData
    vertexData.applyToMesh(mesh, true)

    {
      /*
      The land's colour: a real world's map, looked up by direction
      (planet-map); or the BIOME SHADER, the same one terrain uses, run
      inside this material with the planetary front end (`biome="on"`); or,
      with neither, a few plain rules.
      */
      this._biomeHost?.dispose()
      this._biomeHost = null
      this.biomePlugin = null
      if (!attrs.colorMap && !isOff(attrs.biome)) {
        /*
        THE CLASSIFIER'S LENGTHS ARE SCALED TO THE PLANET. They were tuned
        on the demo's radius 50, and a radius-3000 planet with the same
        numbers was frozen (a 100 m hill six chart units colder) and
        speckled (climate noise sixty times too fine). Board #3280.
        */
        const k = 50 / radius
        const made = createPlanetBiome(this.owner.scene, {
          // The classifier's coastline is the sea's own level.
          // With no sea, the planet's own radius: the classifier's sizes
          // are scaled by it (a datum at 0.001 put its noise out past
          // float precision: grids of lines on Io, Mars drained of colour).
          seaRadius: hasSea ? radius + seaAt : radius,
          // No sea, no datum to cool with height from (the ground is held
          // far above any sea, see planet-surface-material).
          lapseRate: hasSea ? 0.06 * k : 1e-7, // (0 reads as unset: the default lapse)
          tNoiseScale: 0.05 * k,
          /*
          Moisture varies in broad regions and by a lot: about three across
          a hemisphere, enough to cross the chart from desert to forest. At
          0.07 and the plugin's 0.18 a continent was one colour (the patches
          were small and too faint to change biome).
          */
          mNoiseScale: 0.035 * k,
          mNoiseAmp: 0.5,
          ditherScale: 0.6 * k,
          detailNoiseScale: 1.2 * k,
          strataScale: 0.06 * k,
          latWarpScale: 0.02 * k,
          surfDepth: 0.6 / k,
          // Planet-scale contours are gentle: exaggerate slope deviation so
          // steep flanks still read as rock at this radius.
          slopeExaggeration: 6,
          // Moisture dries over roughly the relief height: coasts wet,
          // highlands dry.
          moistureDryHeight: Math.max(2, this._val('grossAmplitude') * 1.2),
          rainShadow: 0.3,
        })
        this.biomePlugin = made.plugin
        this._biomeHost = made.host
        /*
        ONE params object for the life of the element. Each build makes a
        new plugin, and a slider (or a caller) that took `biomePlugin.params`
        before a rebuild would otherwise go on writing to the dead one. Only
        what follows from the new geometry is refreshed; the climate someone
        set is kept.
        */
        if (this._biomeParams != null) {
          this._biomeParams.seaRadius = made.plugin.params.seaRadius
          // The lapse follows the sea (none on a dry world): kept from an
          // earlier build with a sea, it froze every dry world chosen after.
          this._biomeParams.lapseRate = made.plugin.params.lapseRate
          // The lengths follow the radius (above), when it changes.
          if (radius !== this._paramsRadius) {
            for (const key of [
              'tNoiseScale',
              'mNoiseScale',
              'ditherScale',
              'detailNoiseScale',
              'strataScale',
              'latWarpScale',
              'surfDepth',
            ] as const)
              (this._biomeParams as any)[key] = made.plugin.params[key]
          }
          this._biomeParams.moistureDryHeight =
            made.plugin.params.moistureDryHeight
          made.plugin.params = this._biomeParams
        } else {
          this._biomeParams = made.plugin.params
        }
        this._paramsRadius = radius
        // A world's climate, written when the world changes: after that
        // the params are anyone's to tune, as they are without one.
        const climate = this._look()?.climate
        if (attrs.world !== this._climateOf) {
          this._climateOf = attrs.world
          // Volcanism only where the world has it: left over from Io, an
          // Earth chosen after it glowed.
          if (climate)
            Object.assign(made.plugin.params, { volcanism: 0, ...climate })
        }
        // A world's own ground colours (Io's sulfur): one row of four for
        // every moisture row. The plugin is new each build, so every time.
        const palette = this._look()?.palette
        if (palette) {
          made.plugin.palette = Array.from(
            { length: 5 },
            () => palette.a
          ).flat() as any
          made.plugin.paletteB = Array.from(
            { length: 5 },
            () => palette.b
          ).flat() as any
        }
      }
      const mapped = createPlanetSurfaceMaterial(this.owner.scene, {
        biome: this.biomePlugin ?? undefined,
        colorUrl: attrs.colorMap ? assetUrl(String(attrs.colorMap)) : '',
        sea: hasSea,
        heightScale: highest,
        depthScale: Math.max(deepest * 0.6, radius * 0.004),
        glint: attrs.seaGlint,
        seaIce: attrs.seaIce,
        inlandWater: !isOff(attrs.inlandWater) && attrs.inlandWater != null,
        water:
          /^#[0-9a-f]{6}/i.test(attrs.seaShallow) &&
          /^#[0-9a-f]{6}/i.test(attrs.seaDeep)
            ? {
                shallow: gasGiantRgb(attrs.seaShallow.slice(0, 7)),
                deep: gasGiantRgb(attrs.seaDeep.slice(0, 7)),
              }
            : undefined,
        seed: 1 + (Math.abs(attrs.seed) % 83),
        /*
        The detail noise CARRIED ON past what the mesh can hold: heightAt
        sums three octaves of it, and these are the next three, at the
        weights they would have had (a little over, because a coast that
        only just wiggles does not read as one).
        */
        fine:
          this.surface == null
            ? {
                scale: attrs.detailScale * radius * 8,
                amplitude: this._val('detailAmplitude') * 0.12,
              }
            : undefined,
      })
      mapped.wireframe = attrs.wireframe
      mesh.material = mapped
      mesh.parent = this.rootNode
      this.planetMesh = mesh
      this.vertexHeights = heights
      if (!this.registered) {
        this.registered = true
        this.owner.register({ meshes: [mesh] })
      }
    }
  }

  private _heightMapLoaded = ''
  /** The sea the mesh was built with: it is IN the mesh, so a change rebuilds. */
  private _builtSea = ''
  private _seaKey(): string {
    const attrs = this as any
    return `${this._val('ocean')}|${attrs.flatSea}|${attrs.world}`
  }
  private _surfaceFromMap = false
  /**
   * Fetch `heightMap` (once per URL and sea setting) and rebuild from it. The
   * planet shows as a smooth ball, in its colours, until the heights arrive.
   */
  private _loadHeightMap(): void {
    const attrs = this as any
    const url = attrs.heightMap ? assetUrl(String(attrs.heightMap)) : ''
    const key = `${url}|${attrs.flatSea}|${attrs.bodyRadiusKm}`
    if (key === this._heightMapLoaded) return
    // A change of map (or none) drops the heights of the last one: the planet
    // is its own noise, in the new colours, until the new heights arrive.
    if (this._surfaceFromMap) {
      this.surface = null
      this._surfaceFromMap = false
    }
    this._heightMapLoaded = key
    if (url === '') return
    // No floor: the sea floor's depth is kept, for the colour of the water.
    loadPlanetMap(url, {
      ...(attrs.bodyRadiusKm > 0 ? { radius: attrs.bodyRadiusKm * 1000 } : {}),
    })
      .then((surface) => {
        if (this.owner == null || key !== this._heightMapLoaded) return
        this.surface = surface
        this._surfaceFromMap = true
        this.regenerate()
      })
      .catch((err) => {
        console.warn(`b3d-planet: could not load heightMap "${url}"`, err)
      })
  }

  /** A vertex's height above the base sphere, in this planet's own units. */
  private _heightFor(nx: number, ny: number, nz: number): number {
    const s = this.surface
    if (s == null) return this.heightAt(nx, ny, nz)
    const attrs = this as any
    const relief = attrs.relief > 0 ? attrs.relief : 1
    return (
      ((s.heightAt({ x: nx, y: ny, z: nz }) - s.seaLevel) / s.radius) *
      attrs.radius *
      relief
    )
  }

  /** Get the height at a given percentile (0..1) of all vertex heights */
  private heightPercentile(p: number): number {
    if (this.vertexHeights == null) return 0
    const sorted = Float32Array.from(this.vertexHeights).sort()
    const idx = Math.min(Math.floor(p * sorted.length), sorted.length - 1)
    return sorted[idx]
  }

  private buildAtmosphere() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const atmoFrac: number = this._val('atmosphere')
    if (atmoFrac <= 0 || attrs.gas) return

    const scene = this.owner.scene

    /*
    Register the atmosphere shader once. Its clouds are 3D noise read ON THE
    SPHERE, at the point itself, in the planet's own frame. They used to be
    2D noise over latitude and longitude, which pinches to a point at each
    pole and has a seam down the back; and they were read from the WORLD
    normal, so they stood still while a rotating planet turned under them.
    The winds are the point turned about the axis before the noise is read.
    */
    if (!BABYLON.Effect.ShadersStore['planetAtmo3VertexShader']) {
      BABYLON.Effect.ShadersStore['planetAtmo3VertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vBody;
        void main() {
          gl_Position = worldViewProjection * vec4(position, 1.0);
          vWorldPos = (world * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
          vBody = position;
        }
      `
      BABYLON.Effect.ShadersStore['planetAtmo3FragmentShader'] = `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vBody;
        uniform vec3 cameraPosition;
        uniform vec3 atmoColor;
        uniform float atmoOpacity;
        uniform float time;
        uniform float turbulence;
        uniform vec4 atmoLight;
        ${GAS_GIANT_GLSL}
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float facing = abs(dot(viewDir, vWorldNormal));
          // Transparent at edges (dot→0), visible when facing camera
          float glow = pow(facing, 0.5);

          // Turbulent cloud patterns: two layers drifting opposite ways.
          vec3 d = normalize(vBody);
          float turb = b3dGgFbm(b3dGgTurn(d, time * 0.02) * 9.0) * turbulence;
          turb += b3dGgFbm(b3dGgTurn(d, -time * 0.01) * vec3(15.0, 22.0, 15.0)
            + vec3(0.0, time * 0.025, 3.1)) * turbulence * 0.5;

          float alpha = glow * atmoOpacity + turb * 0.3;
          alpha = clamp(alpha, 0.0, 1.0);
          // AIR GLOWS BECAUSE THE SUN IS IN IT. This shell is added to what
          // is behind it, and it used to be added at full strength all the
          // way round, so the night side was a blue disc. It reaches a little
          // past the terminator (twilight) and is nearly nothing beyond.
          vec3 l = atmoLight.w > 0.5 ? normalize(atmoLight.xyz - vWorldPos) : normalize(atmoLight.xyz);
          float ndl = dot(vWorldNormal, l);
          alpha *= mix(0.03, 1.0, smoothstep(-0.3, 0.3, ndl));

          vec3 col = atmoColor * (glow + turb * 0.5);
          /*
          GOLDEN HOUR: SUBTLE, AND AT THE LIMB ONLY. Where you see the air
          edge on and the sun is low over it, or behind the planet, the
          air's own colour shifts a little toward red (the long path
          scatters out the blue end). Not a different colour and not a glow:
          the rim warms slightly, and face on you see no change at all.
          */
          vec3 warm = atmoColor * vec3(1.3, 0.92, 0.62);
          float limb = pow(1.0 - facing, 3.0);
          // Peaks where the sun is low but still up, and is gone by the
          // terminator: peaking AT it lit the two points where the terminator
          // meets the rim, which read as glowing poles.
          float low = smoothstep(0.0, 0.14, ndl) * (1.0 - smoothstep(0.14, 0.45, ndl));
          float behind = smoothstep(0.2, 0.9, dot(-viewDir, l));
          float k = clamp(limb * max(low, behind), 0.0, 1.0) * 0.6;
          col = mix(col, warm, k);
          gl_FragColor = vec4(col, alpha);
        }
      `
    }

    // Atmosphere shell outside the highest point
    // A LOOP, not Math.max(...): spreading every vertex height into call
    // arguments overflows the stack past the engine's argument limit (a page
    // that would not start at subdivisions 160, board #2745).
    let maxH = this._val('grossAmplitude') + this._val('detailAmplitude')
    if (this.vertexHeights && this.vertexHeights.length > 0) {
      maxH = -Infinity
      for (const h of this.vertexHeights) if (h > maxH) maxH = h
    }
    const atmoRadius = attrs.radius + maxH + atmoFrac * attrs.radius
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'atmosphere',
      { diameter: atmoRadius * 2, segments: 32 },
      scene
    )

    const mat = new BABYLON.ShaderMaterial(
      'atmo-shader-mat',
      scene,
      { vertex: 'planetAtmo3', fragment: 'planetAtmo3' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'atmoColor',
          'atmoOpacity',
          'time',
          'turbulence',
          'atmoLight',
        ],
        needAlphaBlending: true,
      }
    )
    const atmoColor = Color.fromCss(
      this._val('atmosphereColor') || 'rgba(77,128,230,0.15)'
    )
    mat.setVector3(
      'atmoColor',
      new BABYLON.Vector3(
        atmoColor.r / 255,
        atmoColor.g / 255,
        atmoColor.b / 255
      )
    )
    mat.setFloat('atmoOpacity', atmoColor.a)
    mat.setFloat('time', 0)
    mat.setFloat('turbulence', attrs.atmosphereTurbulence ?? 0.5)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
    const light = new BABYLON.Vector4(0, 1, 0, 0)
    mat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) mat.setVector3('cameraPosition', cam.globalPosition)
      sceneLight(scene, light)
      mat.setVector4('atmoLight', light)
      mat.setFloat('time', sceneSeconds(scene))
    }

    mesh.material = mat
    mesh.parent = this.rootNode
    this.atmosphereMesh = mesh
  }

  /** The highest ground above the base sphere, in this planet's units. */
  private _maxHeight(): number {
    const attrs = this as any
    if (this.vertexHeights == null || this.vertexHeights.length === 0)
      return attrs.gas
        ? 0
        : this._val('grossAmplitude') + this._val('detailAmplitude')
    let max = -Infinity
    for (const h of this.vertexHeights) if (h > max) max = h
    return max
  }

  /**
   * The weather, seen from orbit (planet-clouds): a shell just above the
   * highest ground and INSIDE the air shell, which stays outside it as the
   * glow at the limb.
   */
  private buildClouds() {
    if (this.cloudMesh) {
      this.cloudMesh.dispose(false, true)
      this.cloudMesh = null
    }
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    if (!(this._val('clouds') > 0) || attrs.gas) return
    let color: BABYLON.Color3
    try {
      color = BABYLON.Color3.FromHexString(
        String(this._val('cloudColor') || '#ffffff').slice(0, 7)
      )
    } catch {
      color = new BABYLON.Color3(1, 1, 1)
    }
    // Half way up the air, so a deeper atmosphere carries its weather higher.
    const lift = Math.max(0.004, this._val('atmosphere') * 0.5)
    this.cloudMesh = createPlanetClouds(
      this.owner.scene,
      this.rootNode,
      attrs.radius + Math.max(0, this._maxHeight()) + lift * attrs.radius,
      {
        coverage: Math.min(3, this._val('clouds')),
        color,
        speed: attrs.cloudSpeed,
        seed: 1 + (Math.abs(attrs.seed) % 89),
        storms: () => this.storms,
      }
    )
  }

  /**
   * There is no sea sphere: the one-mesh planet draws its own sea (see
   * buildPlanet). Kept as a named step so the build order still reads.
   */
  private buildOcean() {
    this.oceanMesh = null
  }

  private buildRings() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const ringValue: number = attrs.rings
    if (ringValue <= 0) return

    const scene = this.owner.scene
    const radius: number = attrs.radius

    // Register ring shader once
    if (!BABYLON.Effect.ShadersStore['planetRing6VertexShader']) {
      BABYLON.Effect.ShadersStore['planetRing6VertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main() {
          gl_Position = worldViewProjection * vec4(position, 1.0);
          vUV = uv;
        }
      `
      BABYLON.Effect.ShadersStore['planetRing6FragmentShader'] = `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        varying vec2 vUV;
        uniform vec3 ringColor;
        uniform float ringOpacity;
        uniform float ringInner;
        uniform float seed;

        float hash(float p) {
          return fract(sin(p * 127.1) * 43758.5453);
        }

        void main() {
          // Radial distance from center of disc (0=inner, 1=outer)
          vec2 uv = vUV * 2.0 - 1.0;
          float r = length(uv);
          if (r < ringInner || r > 1.0) discard;

          // Normalize to ring band
          float t = (r - ringInner) / (1.0 - ringInner);

          // SHARP, as rings are, and irregular: the density along the
          // radius is 1D noise at several scales, TERRACED, so it holds
          // plateaus of different widths and steps between them with edges
          // about a pixel wide. Only detail finer than a pixel fades to its
          // average (drawn, it shimmered into moire and flickered).
          float px = max(fwidth(t), 1e-5);
          float theta = atan(uv.y, uv.x);

          // A shepherd moon in the narrow gap: the edges either side of it
          // ripple round the ring, fading away from the gap. (The integer
          // count keeps the ripple whole across atan's jump.)
          float gapB = hash(seed + 1.0) * 0.15 + 0.8;
          float near = abs(t - gapB);
          t += 0.004 * sin(theta * 36.0) * exp(-near / 0.02);

          float n = 0.0;
          float a = 0.5;
          float f = 6.0;
          float norm = 0.0;
          for (float i = 0.0; i < 5.0; i++) {
            float x = t * f + seed * 13.1 + i * 7.3;
            float c = floor(x);
            float k = fract(x);
            float vn = mix(hash(c), hash(c + 1.0), k * k * (3.0 - 2.0 * k));
            float fade = 1.0 - smoothstep(0.3, 0.6, f * px);
            n += a * fade * (vn - 0.5);
            norm += a;
            a *= 0.55;
            f *= 2.7;
          }
          n = clamp(n / norm * 1.6 + 0.5, 0.0, 1.0);
          float steps = n * 6.0;
          float sw = max(fwidth(steps), 1e-4);
          float terrace = (floor(steps) + smoothstep(1.0 - sw, 1.0, fract(steps))) / 6.0;
          float density = mix(n, terrace, 0.75);

          // The broad profile: faint inside, brightest a little out.
          float profile = 0.35 + 0.65 * sin(3.1416 * pow(t, 0.75));
          float bands = profile * (0.3 + 1.1 * density) * 1.3;

          // Imperfect round the ring: a faint clumping by angle and radius.
          vec2 cq = uv * 9.0 + seed;
          vec2 ci = floor(cq);
          vec2 cf = fract(cq);
          cf = cf * cf * (3.0 - 2.0 * cf);
          float h00 = hash(ci.x + ci.y * 57.0);
          float h10 = hash(ci.x + 1.0 + ci.y * 57.0);
          float h01 = hash(ci.x + (ci.y + 1.0) * 57.0);
          float h11 = hash(ci.x + 1.0 + (ci.y + 1.0) * 57.0);
          float clump = mix(mix(h00, h10, cf.x), mix(h01, h11, cf.x), cf.y);
          bands *= 0.95 + 0.1 * clump;

          // Gaps: the wide one (Cassini's) and the moon's narrow one,
          // cut clean, a pixel soft.
          float g1 = abs(t - hash(seed) * 0.4 - 0.45);
          float gap1 = smoothstep(0.022 - px, 0.022 + px, g1);
          float gap2 = smoothstep(0.005 - px, 0.005 + px, abs(t - gapB));
          bands *= mix(0.04, 1.0, gap1) * mix(0.06, 1.0, gap2);

          // Edges: crisp, a few pixels at most.
          float edgeFade = smoothstep(0.0, max(0.015, px * 2.0), t) * smoothstep(1.0, 1.0 - max(0.01, px * 2.0), t);
          float alpha = clamp(bands, 0.0, 1.0) * edgeFade * ringOpacity;

          gl_FragColor = vec4(ringColor * bands, alpha);
        }
      `
    }

    /*
    THE RING'S SHAPE: the four ring attributes, else the gas giant preset's
    own ring (Saturn's is broad and bright, the rest thin and faint), else
    the old rule: a disc out to 1.5 to 3 radii by `rings`. For a gas giant
    `rings` is how much of the preset's brightness to show.
    */
    const look = attrs.gas ? resolveGasGiant(attrs.gas).rings : null
    const outerRadii =
      attrs.ringOuter > 0
        ? attrs.ringOuter
        : look?.outer ?? 1.5 + ringValue * 1.5
    const innerRadii = Math.min(
      outerRadii * 0.98,
      attrs.ringInner > 0 ? attrs.ringInner : look?.inner ?? outerRadii * 0.45
    )
    // `rings` always scales it, an explicit `ringOpacity` included, so one
    // dial fades the ring whichever way its brightness was chosen.
    const amount = Math.min(1, ringValue * 1.2)
    const opacity =
      (attrs.ringOpacity >= 0 ? attrs.ringOpacity : look?.opacity ?? 1) * amount
    const ringRgb = gasGiantRgb(
      /^#[0-9a-f]{6}/i.test(attrs.ringColor)
        ? String(attrs.ringColor).slice(0, 7)
        : look?.color ?? '#ccb380'
    )
    const outerRadius = radius * outerRadii
    const mesh = BABYLON.MeshBuilder.CreateDisc(
      'planet-ring',
      { radius: outerRadius, tessellation: 64 },
      scene
    )
    mesh.rotation.x = Math.PI / 2 // Flat in XZ plane
    // In the equator, as rings are. It used to be tipped off it, and as
    // the planet turned (the ring is its child) the ring precessed.

    const mat = new BABYLON.ShaderMaterial(
      'planet-ring-mat',
      scene,
      { vertex: 'planetRing6', fragment: 'planetRing6' },
      {
        attributes: ['position', 'uv'],
        uniforms: [
          'worldViewProjection',
          'ringColor',
          'ringOpacity',
          'ringInner',
          'seed',
        ],
        needAlphaBlending: true,
      }
    )
    mat.setVector3('ringColor', new BABYLON.Vector3(...ringRgb))
    mat.setFloat('ringOpacity', Math.max(0, Math.min(1, opacity)))
    mat.setFloat('ringInner', innerRadii / outerRadii)
    mat.setFloat('seed', attrs.seed % 100)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_COMBINE

    mesh.material = mat
    mesh.parent = this.rootNode
    this.ringMesh = mesh
  }

  /** The rocky world's look, when `world` names one (and it is not a gas giant). */
  private _look(): RockyWorldLook | null {
    const attrs = this as any
    const look = attrs.gas ? null : resolveRockyWorld(attrs.world)
    return look && this.worldOverrides
      ? { ...look, ...this.worldOverrides }
      : look
  }

  /** A look setting: the attribute (a `world` writes its own in once). */
  private _val(key: keyof RockyWorldLook & string): any {
    return (this as any)[key]
  }

  /** Which world's look was last written into the attributes. */
  private _worldOf = ''

  /*
  A WORLD IS A PRESET, written into the planet's own attributes when it
  changes, and theirs to tune after that: a slider still moves the clouds on
  a Venus. (It used to win over them every build, which left every dial dead
  once a world was chosen.)
  */
  private _applyWorld() {
    const attrs = this as any
    if (attrs.world === this._worldOf) return
    this._worldOf = attrs.world
    const look = this._look()
    if (look == null) return
    Object.assign(this, {
      ocean: look.ocean,
      atmosphere: look.atmosphere,
      atmosphereColor: look.atmosphereColor,
      clouds: look.clouds,
      cloudColor: look.cloudColor,
      grossAmplitude: look.grossAmplitude,
      detailAmplitude: look.detailAmplitude,
      craters: look.craters.density,
      craterSize: look.craters.size,
      craterWear: look.craters.wear,
      craterAsymmetry: look.craters.asymmetry,
      seaShallow: look.sea?.shallow ?? '',
      seaDeep: look.sea?.deep ?? '',
    })
  }

  /** The craters' height function for this build, or null for none. */
  private _craters: ((x: number, y: number, z: number) => number) | null = null
  /** The radius the biome params' lengths were last scaled for. */
  private _paramsRadius = 0
  /** Which world's climate was last written into the params. */
  private _climateOf = ''

  private _makeCraters() {
    const attrs = this as any
    const c = {
      density: attrs.craters,
      size: attrs.craterSize,
      wear: attrs.craterWear,
      asymmetry: attrs.craterAsymmetry,
    }
    this._craters =
      c.density > 0
        ? sphereCraters({
            seed: 1 + (Math.abs(attrs.seed) % 9973),
            density: c.density,
            maxRadius: c.size,
            minRadius: Math.max(0.012, c.size / 16),
            complexRadius: c.size * 0.4,
            wear: c.wear,
            asymmetry: c.asymmetry,
          })
        : null
  }

  private heightAt(nx: number, ny: number, nz: number): number {
    const attrs = this as any

    // Scale noise by frequency. The unit normal (nx,ny,nz) maps the
    // sphere surface, so grossScale/detailScale control feature size
    // relative to the planet. Multiply by radius so scale values are
    // in "features per unit" like terrain.
    const gs = attrs.grossScale * attrs.radius
    const ds = attrs.detailScale * attrs.radius
    const grossRaw = this.noise.fractal(nx * gs, ny * gs, nz * gs, 4)
    const detailRaw = this.noise.fractal(nx * ds, ny * ds, nz * ds, 3)

    const grossNorm = grossRaw * 0.5 + 0.5
    const detailNorm = detailRaw * 0.5 + 0.5

    return (
      this.grossFilter.evaluate(grossNorm) * this._val('grossAmplitude') +
      this.detailFilter.evaluate(detailNorm) * this._val('detailAmplitude') +
      (this._craters ? this._craters(nx, ny, nz) * attrs.radius * 0.6 : 0)
    )
  }

  /** Rebuild planet mesh with current noise settings */
  regenerate() {
    if (this.planetMesh) {
      // With its material: each build makes a new one.
      this.planetMesh.dispose(false, true)
      this.planetMesh = null
    }
    if (this.atmosphereMesh) {
      this.atmosphereMesh.dispose(false, true)
      this.atmosphereMesh = null
    }
    if (this.oceanMesh) {
      this.oceanMesh.dispose(false, true)
      this.oceanMesh = null
    }
    if (this.ringMesh) {
      this.ringMesh.dispose(false, true)
      this.ringMesh = null
    }
    this.registered = false
    this._builtSea = this._seaKey()
    this._loadHeightMap()
    this.buildPlanet()
    this.buildAtmosphere()
    this.buildOcean()
    this.buildClouds()
    this.buildRings()
  }

  /** Update atmosphere/ocean/wireframe/rotation */
  updateOptions() {
    const attrs = this as any

    // The sea is part of the planet's one mesh (where it lies is in the
    // vertices), so moving it is a rebuild, not a visual tweak.
    if (this.planetMesh != null && this._seaKey() !== this._builtSea) {
      this.regenerate()
      return
    }

    // Rebuild the atmosphere since its radius depends on parameters
    if (this.atmosphereMesh) {
      this.atmosphereMesh.dispose(false, true)
      this.atmosphereMesh = null
    }
    if (this.oceanMesh) {
      this.oceanMesh.dispose(false, true)
      this.oceanMesh = null
    }
    this.buildAtmosphere()
    this.buildOcean()
    this.buildClouds()

    if (this.planetMesh?.material) {
      ;(this.planetMesh.material as BABYLON.StandardMaterial).wireframe =
        attrs.wireframe
    }
  }
}

export const b3dPlanet = B3dPlanet.elementCreator()
