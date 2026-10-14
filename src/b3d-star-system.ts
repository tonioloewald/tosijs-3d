/*#
# b3d-star-system

Renders an individual star system with a procedural star and its planets.
Given a galaxy seed and a star's ADDRESS (`star`, stable) or index
(`starIndex`) in the [voxel galaxy](/voxel-galaxy/), it creates `b3d-star` and `b3d-planet` child components with
deterministic seeds.

Every body is a real [planet](/b3d-planet/): giants banded and ringed, rocky
worlds picked from what the generator says about each one (airless rock,
seas, a toxic hot sky, or dust; see [rocky-world](/rocky-world/)'s
`rockyWorldFor`), moons locked to their planets, and an asteroid belt where
there is room for one. Where they go is [system-layout](/system-layout/):
distances on a log scale and sizes on a square root, so the system fits on a
screen without being empty.

## Demo

```js
import { b3d, b3dLight, b3dStarSystem, spaceBackdrop, voxelGalaxy, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, p, pre } = elements

const galaxy = voxelGalaxy({ seed: 1234, brightBudget: 1000 }).view({ generatePlanets: true })

const { demo } = tosi({
  demo: {
    starIndex: 130,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
    // Which body the camera follows ('' = the whole system).
    focus: '',
  },
})

const starSystem = b3dStarSystem({
  galaxySeed: 1234,
  starCount: 1000,
  starIndex: demo.starIndex,
  scale: demo.scale,
  orbitScale: demo.orbitScale,
  // 'on'|'off' attributes, driven from the toggles' booleans below — a
  // boolean written straight into them warns (and means nothing).
  animate: 'on',
  showOrbits: 'on',
})
demo.animate.observe(() => (starSystem.animate = demo.animate.value ? 'on' : 'off'))
demo.showOrbits.observe(() => (starSystem.showOrbits = demo.showOrbits.value ? 'on' : 'off'))

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000011',
    scenePanel: () => [
      label3d({ text: 'Star system' }),
      slider3d({ label: 'star index', value: demo.starIndex, min: 0, max: 999, step: 1 }),
      slider3d({ label: 'scale', value: demo.scale, min: 1, max: 20, step: 0.5 }),
      slider3d({ label: 'orbit scale', value: demo.orbitScale, min: 1, max: 10, step: 0.5 }),
      toggle3d({ label: 'animate', value: demo.animate }),
      toggle3d({ label: 'show orbits', value: demo.showOrbits }),
      // Look at one body: the camera follows it round its orbit.
      select3d({ label: 'look at', value: demo.focus, options: ['', ...starSystem.bodies.map((b) => b.name)] }),
    ],
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        100,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 1
      camera.upperRadiusLimit = 600
      camera.minZ = 0.1
      camera.maxZ = 5000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
      // FOLLOW THE CHOSEN BODY: ease the camera's target onto it each frame,
      // and on choosing, pull in to a few of its radii.
      let following = ''
      el.scene.onBeforeRenderObservable.add(() => {
        const body = starSystem.bodies.find((b) => b.name === demo.focus.value)
        const to = body ? body.node.getAbsolutePosition() : BABYLON.Vector3.Zero()
        // In place: assigning an orbit camera's target moves its distance.
        BABYLON.Vector3.LerpToRef(camera.target, to, 0.15, camera.target)
        if (demo.focus.value !== following) {
          following = demo.focus.value
          camera.radius = body ? Math.max(3, body.radius * 7) : 100
        }
      })
    },
  },
  b3dLight({ intensity: 0.2 }),
  // The star sky, without a sun: the system's own star lights it.
  ...spaceBackdrop({ sky: '/sky', sun: false }),
  starSystem,
)

const infoEl = pre({ style: 'margin:0; font-size:10px; max-height:120px; overflow-y:auto' })

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    infoEl,
  )
)
function updateInfo() {
  const sys = starSystem.getSystemData()
  if (!sys) { infoEl.textContent = ''; return }
  const lines = [sys.star.name + ' (' + sys.star.spectralType + ') HI:' + sys.star.bestHI]
  sys.planets.forEach(p => {
    let info = p.name + ' ' + p.classification + ' HI:' + p.HI
    if (p.rings > 0) info += ' rings:' + p.rings.toFixed(2)
    if (p.HI <= 2) info += ' ' + p.atmosphere
    lines.push('  ' + info)
  })
  infoEl.textContent = lines.join('\n')
}

for (const key of ['starIndex', 'scale', 'orbitScale']) {
  demo[key].observe(() => {
    starSystem.regenerate()
    demo.focus.value = ''
    updateInfo()
    // The 'look at' list is this system's bodies.
    scene.refreshScenePanel?.()
  })
}
for (const key of ['animate', 'showOrbits']) {
  demo[key].observe(() => {
    starSystem.updateOptions()
  })
}
updateInfo()
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
.debug-panel pre {
  background: none;
  border: none;
  color: inherit;
  padding: 0;
  margin: 0;
}
```

> The panel's readout opts out of the doc system's `<pre>` styling. A `<pre>`
> is rendered as a CODE BLOCK there — light background, its own colour — and
> inside a panel that sets `color: white` it came out white-on-white and simply
> invisible.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `galaxySeed` | `1234` | Galaxy seed for deterministic generation |
| `starCount` | `10000` | The galaxy's bright budget (needed to regenerate the same galaxy) |
| `star` | `''` | A star's ADDRESS (`1234:bright:5021:0`, the `id` on every star). Stable, and wins over `starIndex` |
| `starIndex` | `0` | Which star to render, by position in the galaxy's view (moves if `starCount` does) |
| `scale` | `5` | Visual scale factor for star/planet sizes |
| `orbitScale` | `3` | Multiplier for orbital distances |
| `animate` | `'on'` | Animate planet orbital motion |
| `showOrbits` | `'on'` | Show orbital path lines |
| `maps` | `'off'` | `'on'`: bodies with real maps in a `system` (our own Earth, Moon and Mars, see [sol](/sol/)) are drawn from them |
| `beltCount` | `1500` | Rocks drawn in the asteroid belt, when the system has one (it sits in a wide gap between the rocky planets and the first giant) |

*/
/*{ "parent": "space", "order": 20 }*/

import { B3dChild, isOff, sceneDelta } from './b3d-utils.js'
import { GAS_GIANTS } from './gas-giant.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { generateStarSystem, type StarSystemData } from './galaxy-data.js'
import { voxelGalaxy } from './voxel-galaxy.js'
import { PerlinNoise } from './perlin-noise.js'
import { b3dPlanet } from './b3d-planet.js'
import { createStarMaterial } from './star-material.js'
import { rockyWorldFor } from './rocky-world.js'
import {
  layoutSystem,
  type BeltLayout,
  type SystemBodySpec,
  type SystemLayout,
  type SystemSpec,
} from './system-layout.js'
import { rockGeometry } from './procedural-rock.js'
import { PRNG } from './mersenne-twister.js'

/** A stable seed from a name, so a named body looks the same every time. */
function nameSeed(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619)
  return Math.abs(h) % 100000
}

export class B3dStarSystem extends B3dChild {
  static preferredTagName = 'tosi-b3d-star-system'

  static shadowStyleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    galaxySeed: 1234,
    starCount: 10000,
    starIndex: 0,
    /** A star's ADDRESS (`1234:bright:5021:0`) — wins over `starIndex` when set. */
    star: '',
    scale: 5,
    orbitScale: 3,
    // on-by-default toggles: string 'on'|'off' (a boolean can't default true)
    animate: 'on' as 'on' | 'off',
    showOrbits: 'on' as 'on' | 'off',
    // Rocks drawn in the asteroid belt (when the system has one).
    beltCount: 1500,
    // 'on': bodies that have real maps (our own system's Earth, Moon and
    // Mars) are drawn from them.
    maps: 'off' as 'on' | 'off',
    x: 0,
    y: 0,
    z: 0,
  }

  declare galaxySeed: number
  declare starCount: number
  declare starIndex: number
  declare star: string
  declare scale: number
  declare orbitScale: number
  /**
   * `'on'` | `'off'` — whether the planets orbit.
   *
   * Typed `any` ON PURPOSE. The name shadows `HTMLElement.animate` (a method),
   * and renaming the attribute would break markup. The source used to override
   * it with `@ts-expect-error`, but that directive does not survive into the
   * published `.d.ts`: every consumer compiling with `skipLibCheck` off got
   * TS2416 from OUR types (found by bin/smoke-consumer.ts, the publish flow's
   * consumer check). `any` is the one type assignable to both.
   */
  declare animate: any
  declare showOrbits: 'on' | 'off'
  declare beltCount: number
  declare maps: 'on' | 'off'
  /**
   * A system given as DATA (`SOL`, or your own `SystemSpec`) instead of a
   * star from the galaxy. Set it, then `regenerate()`.
   */
  system: SystemSpec | null = null
  declare x: number
  declare y: number
  declare z: number

  owner: B3d | null = null

  private rootNode: BABYLON.TransformNode | null = null
  private starRadius = 0
  private starMesh: BABYLON.Mesh | null = null
  private coronaMesh: BABYLON.Mesh | null = null
  private starLight: BABYLON.PointLight | null = null
  private planetEls: {
    el: any
    holder: BABYLON.TransformNode
    name: string
    radius: number
  }[] = []
  private holders: BABYLON.TransformNode[] = []
  private moonPivots: { pivot: BABYLON.TransformNode; period: number }[] = []
  private belt: { node: BABYLON.TransformNode; period: number } | null = null
  private beltMeshes: BABYLON.Mesh[] = []
  private layout: SystemLayout | null = null
  private visibility = 1
  private orbitLines: BABYLON.Mesh[] = []
  private systemData: StarSystemData | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null
  private time = 0

  content = () => ''

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    this.rootNode = new BABYLON.TransformNode('star-system-root', scene)
    this.rootNode.position.set(this.x, this.y, this.z)
    this.registerShaders()
    this.buildSystem()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.disposeMeshes()
    this.rootNode?.dispose()
    this.rootNode = null
    this.owner = null
  }

  private disposeMeshes() {
    this.starMesh?.dispose()
    this.starMesh = null
    this.coronaMesh?.dispose()
    this.coronaMesh = null
    this.starLight?.dispose()
    this.starLight = null
    for (const p of this.planetEls) p.el.remove()
    this.planetEls = []
    for (const h of this.holders) h.dispose()
    this.holders = []
    this.moonPivots = []
    for (const m of this.beltMeshes) m.dispose(false, true)
    this.beltMeshes = []
    this.belt?.node.dispose()
    this.belt = null
    this.layout = null
    for (const m of this.orbitLines) m.dispose()
    this.orbitLines = []
  }

  private registerShaders() {
    if (BABYLON.Effect.ShadersStore['starSystemCoronaVertexShader']) return

    BABYLON.Effect.ShadersStore['starSystemCoronaVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vPositionW = (world * vec4(position, 1.0)).xyz;
        vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
      }
    `
    BABYLON.Effect.ShadersStore['starSystemCoronaFragmentShader'] = `
      precision highp float;
      uniform vec3 cameraPosition;
      uniform vec3 coronaColor;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        float facing = abs(dot(viewDir, vNormalW));
        float glow = pow(facing, 2.0);
        gl_FragColor = vec4(coronaColor * glow, glow);
      }
    `
  }

  private buildSystem() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const scene = this.owner.scene

    /*
    FIND THE STAR in the one galaxy (GALAXY-DESIGN.md). By ADDRESS when given
    — resolved from its own voxel, so it costs one voxel and means the same
    star whatever else changes. Otherwise by index into the galaxy's view,
    which is a position in a list, and moves if the budget does. Only THE
    star's system is generated, right below.
    */
    const spec = this.system
    let star: any
    if (spec != null) {
      // A system given as data (our own: SOL): no galaxy, no generator.
      star = { ...spec.star, seed: 1, bestHI: 0 }
      this.systemData = {
        star,
        planets: spec.planets.map((p) => ({
          name: p.name,
          seed: nameSeed(p.name),
          orbitalRadius: p.au,
          radius: p.radiusKm,
          classification: p.look.gas ? 'gas giant' : 'rocky',
          insolation: spec.star.luminosity / (p.au * p.au),
          rings: p.rings ?? 0,
          hydrographics: 0,
          atmosphere: '',
          HI: 0,
          description: '',
          g: '',
          albedo: 0,
          tempC: '',
          temp: '',
          density: 0,
        })),
      } as StarSystemData
    } else {
      const galaxy = voxelGalaxy({
        seed: attrs.galaxySeed,
        brightBudget: attrs.starCount,
      })
      star = attrs.star ? galaxy.star(attrs.star) : null
      if (star == null) {
        const stars = galaxy.view().stars
        star = stars[Math.min(Math.max(0, attrs.starIndex), stars.length - 1)]
      }
      if (!star) return
      this.systemData = generateStarSystem(star)
    }
    const { planets } = this.systemData
    const scale: number = attrs.scale
    const orbitScale: number = attrs.orbitScale

    // Star visual radius from luminosity
    const starRadius =
      Math.max(1, Math.min(15, (Math.log(star.luminosity + 1) + 2) * 1.5)) *
      scale *
      0.5
    this.starRadius = starRadius

    // Build star mesh (simple emissive sphere with vertex color noise)
    const noise = new PerlinNoise(star.seed)
    const subs = 24
    const vertsPerFace = (subs + 1) * (subs + 1)
    const totalVerts = vertsPerFace * 6
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 4)
    const indices: number[] = []

    const CUBE_FACES = [
      { origin: [1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
      { origin: [-1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
      { origin: [-1, 1, 1], right: [2, 0, 0], up: [0, 0, -2] },
      { origin: [-1, -1, -1], right: [2, 0, 0], up: [0, 0, 2] },
      { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
      { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
    ]

    const [cr, cg, cb] = [
      star.rgb[0] / 255,
      star.rgb[1] / 255,
      star.rgb[2] / 255,
    ]
    const glow = 1.1

    let vertOffset = 0
    for (let face = 0; face < 6; face++) {
      const f = CUBE_FACES[face]
      const baseVert = vertOffset
      for (let iy = 0; iy <= subs; iy++) {
        for (let ix = 0; ix <= subs; ix++) {
          const u = ix / subs
          const v = iy / subs
          const cx = f.origin[0] + f.right[0] * u + f.up[0] * v
          const cy = f.origin[1] + f.right[1] * u + f.up[1] * v
          const cz = f.origin[2] + f.right[2] * u + f.up[2] * v
          const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
          const nx = cx / len
          const ny = cy / len
          const nz = cz / len

          const vi = vertOffset * 3
          positions[vi] = nx * starRadius
          positions[vi + 1] = ny * starRadius
          positions[vi + 2] = nz * starRadius
          normals[vi] = nx
          normals[vi + 1] = ny
          normals[vi + 2] = nz

          const noiseVal = noise.fractal(nx * 3, ny * 3, nz * 3, 4)
          const brightness = 1.0 - 0.3 * (noiseVal * 0.5 + 0.5)

          const ci = vertOffset * 4
          colors[ci] = cr * brightness * glow
          colors[ci + 1] = cg * brightness * glow
          colors[ci + 2] = cb * brightness * glow
          colors[ci + 3] = 1.0
          vertOffset++
        }
      }
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

    const starMesh = new BABYLON.Mesh('system-star', scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.colors = colors
    vertexData.applyToMesh(starMesh, true)

    // Limb darkening and granulation (star-material): a flat emissive
    // colour read as a white ball.
    starMesh.material = createStarMaterial(scene, {
      rgb: [cr, cg, cb],
      seed: 1 + (Math.abs(star.seed) % 97),
    })
    starMesh.parent = this.rootNode
    this.starMesh = starMesh

    // Corona
    const coronaRadius = starRadius * 1.3
    const coronaMesh = BABYLON.MeshBuilder.CreateSphere(
      'system-corona',
      { diameter: coronaRadius * 2, segments: 24 },
      scene
    )
    const coronaMat = new BABYLON.ShaderMaterial(
      'system-corona-mat',
      scene,
      { vertex: 'starSystemCorona', fragment: 'starSystemCorona' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'coronaColor',
        ],
        needAlphaBlending: true,
      }
    )
    coronaMat.setVector3(
      'coronaColor',
      new BABYLON.Vector3(cr * glow * 0.6, cg * glow * 0.6, cb * glow * 0.6)
    )
    coronaMat.backFaceCulling = false
    coronaMat.alphaMode = BABYLON.Constants.ALPHA_ADD
    coronaMat.disableDepthWrite = true
    coronaMat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) coronaMat.setVector3('cameraPosition', cam.globalPosition)
    }
    coronaMesh.material = coronaMat
    coronaMesh.parent = this.rootNode
    this.coronaMesh = coronaMesh

    // Point light from star
    const light = new BABYLON.PointLight(
      'system-star-light',
      BABYLON.Vector3.Zero(),
      scene
    )
    light.parent = this.rootNode
    /*
    NOT PROPORTIONAL TO LUMINOSITY. Luminosity spans a millionfold between an
    M dwarf and an O star, and a light that followed it left every planet of
    a K star nearly black (a K0 at 0.24 suns got 0.12; Tonio: "the planet
    doesn't seem to be lit"). A camera, like an eye, exposes for the scene:
    the fourth root keeps dim stars dimmer and bright ones brighter while
    every system stays readable.
    */
    light.intensity = Math.min(
      3.5,
      Math.max(1.2, 1.6 * Math.pow(Math.max(0, star.luminosity), 0.25))
    )
    light.range = 500
    light.diffuse = new BABYLON.Color3(cr, cg, cb)
    light.excludedMeshes.push(starMesh)
    light.excludedMeshes.push(coronaMesh)
    this.starLight = light

    /*
    THE PLANETS ARE PLANETS: each one a <tosi-b3d-planet>, a gas giant of a
    kind its seed picks, or a rocky world chosen from what the generator says
    about it (rockyWorldFor: airless, seas, a toxic hot sky, or dust). Where
    they go, how big they are and their moons come from system-layout, which
    compresses the distances so there is something to see.
    */
    const layout = layoutSystem(
      spec
        ? planets.map((p, i) => ({
            ...p,
            moons: spec.planets[i].moons?.map((m) => m.radiusKm) ?? [],
          }))
        : planets,
      {
        starRadius,
        spacing: scale * orbitScale * 1.3,
        earthSize: scale * 0.9,
        belt: spec?.belt?.map((b) => b.radiusKm),
      }
    )
    const useMaps = !isOff(attrs.maps)
    // A body's attributes from the spec: its maps when drawing from maps.
    const lookOf = (b: SystemBodySpec) =>
      useMaps && b.maps ? b.maps : b.look
    this.layout = layout
    const kinds = Object.keys(GAS_GIANTS)
    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i]
      const place = layout.planets[i]
      const holder = new BABYLON.TransformNode(`planet-holder-${i}`, scene)
      holder.parent = this.rootNode
      this.holders.push(holder)
      const giant = planet.classification !== 'rocky'
      const seed = 1 + (Math.abs(planet.seed) % 9973)
      const el = b3dPlanet({
        seed,
        radius: place.visualRadius,
        subdivisions: giant ? 48 : 40,
        biome: 'on',
        rotationSpeed: giant ? 0.15 : 0.08,
      }) as any
      if (spec) {
        Object.assign(el, lookOf(spec.planets[i]))
        if (giant) el.rings = planet.rings
      } else if (giant) {
        const kind = kinds[Math.abs(planet.seed) % kinds.length]
        el.gas = kind
        el.bands = Math.max(3, GAS_GIANTS[kind].bands + ((Math.abs(planet.seed) >> 3) % 7) - 3)
        el.rings = planet.rings
      } else {
        const pick = rockyWorldFor({
          hydrographics: planet.hydrographics,
          atmosphere: planet.atmosphere,
          insolation: planet.insolation,
        })
        el.world = pick.world
        el.worldOverrides = pick.overrides
      }
      this.adopt(el, holder, planet.name, place.visualRadius)
      place.moons.forEach((moon, m) => {
        const pivot = new BABYLON.TransformNode(`moon-pivot-${i}-${m}`, scene)
        pivot.parent = holder
        pivot.rotation.y = moon.phase
        const at = new BABYLON.TransformNode(`moon-${i}-${m}`, scene)
        at.parent = pivot
        at.position.x = moon.distance
        this.moonPivots.push({ pivot, period: moon.period })
        // A moon is locked to its planet (its pivot carries it round), so
        // it keeps one face inward and its leading side takes the craters.
        const given = spec?.planets[i].moons?.[m]
        const name = given?.name ?? `${planet.name} ${'abcdefgh'[m]}`
        if (given?.look.shape === 'rock') {
          this.adoptRock(at, name, moon.visualRadius, moon.seed, scene)
          return
        }
        const moonEl = b3dPlanet({
          seed: 1 + (moon.seed % 9973),
          radius: moon.visualRadius,
          // Fine enough that a crater's rim is a curve, not a ridge along
          // the triangles (it drew lines across Ceres at 16).
          subdivisions: 40,
          biome: 'on',
          // A giant's moons are a mixed family (Io, Titan, cratered ice);
          // a rock's moon is a smaller rock.
          world: giant
            ? ['moon', 'io', 'titan', 'moon'][moon.seed % 4]
            : planet.insolation > 1.6
            ? 'mercury'
            : 'moon',
        }) as any
        if (given) Object.assign(moonEl, lookOf(given))
        this.adopt(moonEl, at, name, moon.visualRadius)
      })
      if (!isOff(attrs.showOrbits)) this.buildOrbitLine(place.distance, i)
    }
    if (layout.belt) this.buildBelt(layout.belt, scene)
    this.placePlanets()

    if (!this.registered) {
      this.registered = true
      this.owner.register({ meshes: [starMesh, coronaMesh], lights: [light] })
    }
  }

  /** Planets are elements: put one in the scene and hang it on `holder` once it is built. */
  private adopt(
    el: any,
    holder: BABYLON.TransformNode,
    name: string,
    radius: number
  ) {
    // The radius is passed, not read back: a new element's attributes are
    // not applied yet, and it would report the default.
    this.planetEls.push({ el, holder, name, radius })
    this.owner?.append(el)
  }

  /*
  A BODY TOO SMALL TO BE ROUND (Phobos, Vesta): a procedural rock, lumpy and
  cut, rather than a planet. It stands in the same list as the planets, so
  the camera can follow it and it fades with them.
  */
  private adoptRock(
    holder: BABYLON.TransformNode,
    name: string,
    radius: number,
    seed: number,
    scene: BABYLON.Scene
  ) {
    const g = rockGeometry({ seed, detail: 3, cuts: 9, roughness: 0.2, squash: 0.7, sink: 0 })
    const mesh = new BABYLON.Mesh(`rock-${name}`, scene)
    const vd = new BABYLON.VertexData()
    vd.positions = g.positions
    vd.normals = g.normals
    const idx = new Uint16Array(g.indices.length)
    for (let t = 0; t < g.indices.length; t += 3) {
      idx[t] = g.indices[t]
      idx[t + 1] = g.indices[t + 2]
      idx[t + 2] = g.indices[t + 1]
    }
    vd.indices = idx
    vd.applyToMesh(mesh)
    mesh.scaling.setAll(radius)
    const mat = new BABYLON.StandardMaterial(`rock-${name}`, scene)
    mat.diffuseColor = new BABYLON.Color3(0.45, 0.4, 0.36)
    mat.specularColor = BABYLON.Color3.Black()
    mesh.material = mat
    this.planetEls.push({
      el: {
        rootNode: mesh,
        remove: () => mesh.dispose(false, true),
      },
      holder,
      name,
      radius,
    })
  }

  /*
  THE BELT, overpopulated on purpose: a few thousand rocks from three
  procedural shapes, as thin instances (one draw each), spread in a band
  thicker in the middle, the whole band turning at the belt's year. Its big
  bodies are planets of their own, cratered and airless, riding with it.
  */
  private buildBelt(belt: BeltLayout, scene: BABYLON.Scene) {
    const attrs = this as any
    const node = new BABYLON.TransformNode('belt', scene)
    node.parent = this.rootNode
    this.belt = { node, period: belt.notable[0]?.period ?? 120 }
    const count = Math.max(0, Math.floor(attrs.beltCount))
    const mat = new BABYLON.StandardMaterial('belt-rock', scene)
    mat.diffuseColor = new BABYLON.Color3(0.62, 0.57, 0.52)
    // A little self-light, so the far side of the belt is not lost in the dark.
    mat.emissiveColor = new BABYLON.Color3(0.08, 0.075, 0.07)
    mat.specularColor = BABYLON.Color3.Black()
    const prng = new PRNG(Math.round(belt.au * 1000) + 17)
    const width = belt.outer - belt.inner
    const mid = (belt.inner + belt.outer) / 2
    for (let k = 0; k < 3; k++) {
      const g = rockGeometry({ seed: 100 + k, detail: 1, cuts: 5, roughness: 0.15, squash: 0.8, sink: 0 })
      const mesh = new BABYLON.Mesh(`belt-rock-${k}`, scene)
      const vd = new BABYLON.VertexData()
      vd.positions = g.positions
      vd.normals = g.normals
      // procedural-rock winds counter-clockwise; Babylon wants clockwise.
      const idx = new Uint16Array(g.indices.length)
      for (let t = 0; t < g.indices.length; t += 3) {
        idx[t] = g.indices[t]
        idx[t + 1] = g.indices[t + 2]
        idx[t + 2] = g.indices[t + 1]
      }
      vd.indices = idx
      vd.applyToMesh(mesh)
      mesh.material = mat
      mesh.parent = node
      const n = Math.floor(count / 3)
      const matrices = new Float32Array(n * 16)
      const m = new BABYLON.Matrix()
      const q = new BABYLON.Quaternion()
      for (let j = 0; j < n; j++) {
        const a = prng.realRange(0, Math.PI * 2)
        const r = mid + (prng.value() + prng.value() + prng.value() - 1.5) * width * 0.66
        const y = (prng.value() + prng.value() - 1) * width * 0.08
        const size = attrs.scale * 0.22 * Math.pow(prng.realRange(0.2, 1), 2.5) + attrs.scale * 0.04
        BABYLON.Quaternion.RotationYawPitchRollToRef(prng.realRange(0, 6.3), prng.realRange(0, 6.3), prng.realRange(0, 6.3), q)
        BABYLON.Matrix.ComposeToRef(
          new BABYLON.Vector3(size, size * prng.realRange(0.6, 1), size),
          q,
          new BABYLON.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          m
        )
        m.copyToArray(matrices, j * 16)
      }
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, true)
      // The rock's own box is at the star: without this the whole belt is
      // culled when the star leaves the screen.
      mesh.thinInstanceRefreshBoundingInfo(false)
      this.beltMeshes.push(mesh)
    }
    for (const [k, rock] of belt.notable.entries()) {
      const given = this.system?.belt?.[k]
      const at = new BABYLON.TransformNode(`asteroid-${rock.name}`, scene)
      at.parent = node
      at.position.set(Math.cos(rock.phase) * rock.distance, 0, Math.sin(rock.phase) * rock.distance)
      const name = given?.name ?? `asteroid ${rock.name}`
      if (given?.look.shape === 'rock') {
        this.adoptRock(at, name, rock.visualRadius, rock.seed, scene)
        continue
      }
      const rockEl = b3dPlanet({
        seed: 1 + (rock.seed % 9973),
        radius: rock.visualRadius,
        subdivisions: 40,
        biome: 'on',
        world: 'moon',
      }) as any
      if (given) Object.assign(rockEl, given.look)
      this.adopt(rockEl, at, name, rock.visualRadius)
    }
  }

  /** Each planet at its place on its orbit for the current time. */
  private placePlanets() {
    const layout = this.layout
    if (layout == null) return
    for (let i = 0; i < this.holders.length; i++) {
      const p = layout.planets[i]
      const angle = (this.time / p.period) * Math.PI * 2 + p.phase
      this.holders[i].position.set(Math.cos(angle) * p.distance, 0, Math.sin(angle) * p.distance)
    }
  }

  private buildOrbitLine(radius: number, index: number) {
    if (this.owner == null || this.rootNode == null) return
    const scene = this.owner.scene
    const segments = 64
    const points: BABYLON.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(
        new BABYLON.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        )
      )
    }

    const orbitLine = BABYLON.MeshBuilder.CreateLines(
      `orbit-${index}`,
      { points },
      scene
    )
    orbitLine.color = new BABYLON.Color3(0.3, 0.3, 0.5)
    orbitLine.alpha = 0.3
    orbitLine.parent = this.rootNode
    this.orbitLines.push(orbitLine)
  }

  private update() {
    if (this.rootNode == null || !this.systemData) return
    const attrs = this as any
    // Hang each planet on its holder once its element has built its root.
    for (const p of this.planetEls) {
      const root = p.el.rootNode as BABYLON.TransformNode | null
      if (root != null && root.parent !== p.holder) {
        root.parent = p.holder
        this.applyVisibility()
      }
    }
    if (isOff(attrs.animate)) return
    const dt = sceneDelta(this.owner!.scene)
    this.time += dt
    this.placePlanets()
    for (const m of this.moonPivots) m.pivot.rotation.y -= (dt / m.period) * Math.PI * 2
    if (this.belt) this.belt.node.rotation.y -= (dt / this.belt.period) * Math.PI * 2
  }

  /**
   * Every body you can look at: the star, then each planet, moon and named
   * asteroid, with the node that carries it (its world position is where it
   * is now) and its drawn radius. For a camera to follow one.
   */
  get bodies(): { name: string; node: BABYLON.TransformNode; radius: number }[] {
    const out: { name: string; node: BABYLON.TransformNode; radius: number }[] = []
    if (this.rootNode && this.systemData)
      out.push({ name: this.systemData.star.name, node: this.rootNode, radius: this.starRadius })
    for (const p of this.planetEls) out.push({ name: p.name, node: p.holder, radius: p.radius })
    return out
  }

  /** Get the generated system data */
  getSystemData(): StarSystemData | null {
    return this.systemData
  }

  /** Rebuild the entire system with current attributes */
  regenerate() {
    this.disposeMeshes()
    this.registered = false
    this.time = 0
    this.buildSystem()
  }

  /** Set visibility of all meshes in the star system (0–1) */
  setVisibility(v: number) {
    this.visibility = v
    this.applyVisibility()
  }

  private applyVisibility() {
    const v = this.visibility
    if (this.starMesh) this.starMesh.visibility = v
    if (this.coronaMesh) this.coronaMesh.visibility = v
    for (const h of this.holders) for (const m of h.getChildMeshes()) m.visibility = v
    for (const m of this.beltMeshes) m.visibility = v
    for (const p of this.planetEls) {
      const root = p.el.rootNode as BABYLON.TransformNode | null
      if (root) for (const m of root.getChildMeshes()) m.visibility = v
    }
    for (const line of this.orbitLines) line.visibility = v * 0.3
    if (this.starLight)
      this.starLight.intensity =
        v * Math.min((this.systemData?.star.luminosity ?? 1) * 0.5, 5)
  }

  /** Update non-geometry options (animation, orbit visibility) */
  updateOptions() {
    const attrs = this as any

    // Toggle orbit visibility
    for (const line of this.orbitLines) {
      line.setEnabled(!isOff(attrs.showOrbits))
    }

    // If orbits need to be created and don't exist
    if (
      !isOff(attrs.showOrbits) &&
      this.orbitLines.length === 0 &&
      this.systemData
    ) {
      this.layout?.planets.forEach((p, i) => this.buildOrbitLine(p.distance, i))
    }
  }
}

export const b3dStarSystem = B3dStarSystem.elementCreator()
