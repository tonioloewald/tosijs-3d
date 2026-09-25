/*#
# b3d-galaxy

Procedural galaxy renderer — the [voxel galaxy](/voxel-galaxy/), the one galaxy
implementation, drawn: thousands of stars in a spiral arm distribution, each
coloured by spectral class. All generation is seeded — same seed, same galaxy.
`el.galaxy` is the galaxy itself; every star carries its address in `id`, and
`getStar(id)` finds it again (an index only means a position in what is loaded).

Stars and nebulae are billboarded **in the vertex shader**: each is a static
quad whose corners the shader turns to face the viewpoint, so a galaxy costs
nothing per frame on the CPU however many stars it holds.

Stars use a custom shader: white-hot center fading to spectral color at edges.
A procedural black hole with accretion disk sits at the galaxy center.

Stars are pickable with `pickStar(x, y)` — click one to zoom in and see its star system rendered
in detail. Use `getStarAt(index)` to retrieve star data and
`getStarSystem(index)` to get full planet detail for any star.
Use `hideStarAt(index)` to hide a star (e.g. when replacing it with a
rendered star system) and `showStarAt(index)` to restore it.

Filter stars by habitability index and/or name using `filterStars({ maxHI, nameSearch })` —
non-matching stars are dimmed.
The galaxy holds every BRIGHT star and every INTERESTING one: a dim star whose
system has a planet with HI ≤ 2 (see [star-populations](/star-populations/)).
So the filter sees every habitable system there is, with its HI already known.
The boring dim stars (the other ~95%) are only generated locally, as sky
texture.

## Demo

```js
import { b3d, b3dLight, b3dGalaxy, b3dStarSystem, label3d, slider3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, p, button, span } = elements

const { demo } = tosi({
  demo: {
    seed: 1234,
    starCount: 5000,
    radius: 100,
    spiralArms: 4,
    particleSize: 2.5,
    coreSize: 0.12,
    habitability: 5,
    nameSearch: '',
    selectedStar: '',
  },
})

const galaxy = b3dGalaxy({
  seed: demo.seed,
  starCount: demo.starCount,
  radius: demo.radius,
  spiralArms: demo.spiralArms,
  particleSize: demo.particleSize,
  coreSize: demo.coreSize,
})

// Star system state
let activeStarSystem = null
let activeStarIndex = -1
let sceneEl = null
// Transition: 'galaxy' | 'zooming-in' | 'star-system' | 'zooming-out'
let viewState = 'galaxy'
let transition = { t: 0, savedAlpha: 0, savedBeta: 0, savedRadius: 0, savedTarget: null }

function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }

const scene = b3d(
  {
    frameRate: 60,
    // Generation settings live in the dual-presence ⚙ panel (works in VR); the
    // free-text star search + selection readout stay a flat overlay (typing needs
    // a keyboard). All widgets bind the same demo.* leaves the observers watch.
    scenePanel: () => [
      label3d({ text: 'Galaxy' }),
      select3d({ label: 'habitability', value: demo.habitability, options: [
        { label: 'All', value: 5 },
        { label: 'Robot+', value: 4 },
        { label: 'EVA+', value: 3 },
        { label: 'Survivable+', value: 2 },
        { label: 'Earthlike', value: 1 },
      ] }),
      // 50k, because the interesting use of this demo is now to stand INSIDE a
      // galaxy and photograph the sky from it — and a naked-eye sky wants tens
      // of thousands of stars, not five.
      slider3d({ label: 'stars', value: demo.starCount, min: 1000, max: 50000, step: 1000 }),
      slider3d({ label: 'radius', value: demo.radius, min: 50, max: 300, step: 10 }),
      slider3d({ label: 'spiral arms', value: demo.spiralArms, min: 1, max: 8, step: 1 }),
      // Down to 0.1: the old floor was 0.5, so the size you actually want for a
      // dense field was unreachable. Tonio: "I was testing 0.6 but couldn't
      // dial up 0.4."
      slider3d({ label: 'particle size', value: demo.particleSize, min: 0.1, max: 3, step: 0.1 }),
      // The core is scenery at galaxy scale and an obstruction from inside one.
      slider3d({ label: 'core size', value: demo.coreSize, min: 0, max: 4, step: 0.1 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 65535, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      sceneEl = el
      el.scene.clearColor = new BABYLON.Color4(0.012, 0.008, 0.024, 1)
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 4,
        200,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 2
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      // Transition animation
      el.scene.registerBeforeRender(() => {
        if (viewState === 'zooming-in') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade galaxy out
          galaxy.setVisibility(1 - t)
          // Fade star system in
          if (activeStarSystem) activeStarSystem.setVisibility(t)
          // Zoom camera toward star, then reset to origin for star system view
          const starPos = transition.savedTarget
          camera.target.x = lerp(starPos.x, 0, t)
          camera.target.y = lerp(starPos.y, 0, t)
          camera.target.z = lerp(starPos.z, 0, t)
          camera.radius = lerp(transition.savedRadius, 100, t)
          if (transition.t >= 1) {
            viewState = 'star-system'
            galaxy.setVisibility(0)
            camera.target.set(0, 0, 0)
            camera.radius = 100
          }
        } else if (viewState === 'zooming-out') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade star system out
          if (activeStarSystem) activeStarSystem.setVisibility(1 - t)
          // Fade galaxy in
          galaxy.setVisibility(t)
          camera.radius = lerp(100, transition.savedRadius, t)
          camera.target.x = lerp(0, transition.savedTarget.x, t)
          camera.target.y = lerp(0, transition.savedTarget.y, t)
          camera.target.z = lerp(0, transition.savedTarget.z, t)
          if (transition.t >= 1) {
            viewState = 'galaxy'
            if (activeStarSystem) {
              activeStarSystem.remove()
              activeStarSystem = null
            }
            galaxy.showStarAt(activeStarIndex)
            galaxy.setVisibility(1)
            activeStarIndex = -1
            demo.selectedStar.value = ''
            camera.alpha = transition.savedAlpha
            camera.beta = transition.savedBeta
            camera.radius = transition.savedRadius
            camera.target.set(transition.savedTarget.x, transition.savedTarget.y, transition.savedTarget.z)
          }
        }
      })

      // Star picking — click = mousedown + mouseup within 5px
      let downX = 0, downY = 0
      el.scene.onPointerDown = (evt) => {
        if (evt.button !== 0) return
        downX = evt.offsetX
        downY = evt.offsetY
      }
      el.scene.onPointerUp = (evt) => {
        if (evt.button !== 0 || viewState !== 'galaxy') return
        const dx = evt.offsetX - downX
        const dy = evt.offsetY - downY
        if (dx * dx + dy * dy > 25) return // dragged — not a click

        const idx = galaxy.pickStar(evt.offsetX, evt.offsetY)
        if (idx >= 0) zoomToStar(idx, camera, el)
      }
    },
  },
  b3dLight({ intensity: 0.1 }),
  galaxy,
)

function zoomToStar(idx, camera, el) {
  if (activeStarSystem) {
    activeStarSystem.remove()
    galaxy.showStarAt(activeStarIndex)
  }

  activeStarIndex = idx
  const star = galaxy.getStarAt(idx)
  const pos = galaxy.getStarPosition(idx)
  if (!star || !pos) return

  const system = galaxy.getStarSystem(idx)
  const hi = system && system.planets.length > 0
    ? Math.min(...system.planets.map((p) => p.HI))
    : star.bestHI
  demo.selectedStar.value = star.name + ' (' + star.spectralType + ', HI ' + hi + ')'
  galaxy.hideStarAt(idx)

  // Save camera state for return trip
  transition = {
    t: 0,
    savedAlpha: camera.alpha,
    savedBeta: camera.beta,
    savedRadius: camera.radius,
    savedTarget: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
  }

  // Create star system at origin, full scale, initially invisible
  // By ADDRESS — the star itself, not its position in a list.
  activeStarSystem = b3dStarSystem({
    galaxySeed: demo.seed.value,
    starCount: demo.starCount.value,
    star: star.id,
    scale: 5,
    orbitScale: 3,
    animate: 'on',
    showOrbits: 'on',
  })
  el.appendChild(activeStarSystem)
  activeStarSystem.setVisibility(0)

  viewState = 'zooming-in'
}

function returnToGalaxy() {
  if (viewState !== 'star-system') return
  transition.t = 0
  viewState = 'zooming-out'
}

// Escape key returns to galaxy view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeStarIndex >= 0) returnToGalaxy()
})

const backBtn = button(
  {
    style: 'display:none; margin-top:4px; cursor:pointer; background:#444; color:white; border:1px solid #888; border-radius:3px; padding:2px 8px; font:12px monospace',
    onclick() { returnToGalaxy() },
  },
  'Back to galaxy'
)
const starLabel = span({ style: 'color:#8cf' })
demo.selectedStar.observe((v) => {
  starLabel.textContent = v
  backBtn.style.display = v ? 'block' : 'none'
})

// Flat overlay keeps only the star search + selection readout; the generation
// settings all live in the ⚙ scene panel (and in VR).
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Click a star to zoom in. Esc to return. Generation settings in the scene panel (VR too).'),
    starLabel,
    backBtn,
    label(
      'search ',
      input({ type: 'text', placeholder: 'star name', style: 'width:8em; color:white; background:transparent; border:1px solid #666; padding:1px 4px; font:12px monospace', bindValue: demo.nameSearch }),
    ),
  )
)

for (const key of ['seed', 'starCount', 'radius', 'spiralArms', 'particleSize', 'coreSize']) {
  demo[key].observe(() => {
    if (activeStarSystem) {
      activeStarSystem.remove()
      activeStarSystem = null
      activeStarIndex = -1
      demo.selectedStar.value = ''
      viewState = 'galaxy'
    }
    galaxy.setVisibility(1)
    galaxy.regenerate()
  })
}

function applyFilter() {
  galaxy.filterStars({
    maxHI: Number(demo.habitability.value),
    nameSearch: demo.nameSearch.value,
  })
}
demo.habitability.observe(applyFilter)
demo.nameSearch.observe(applyFilter)
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
| `seed` | `1234` | Galaxy seed |
| `dimBudget` | `95000` | The DIM population's budget. Its interesting share (~5%, HI ≤ 2) is drawn globally; the boring rest only near a point (the baker's eye) |
| `starCount` | `10000` | The galaxy's BRIGHT budget — the stars visible across it (±noise; counts round per voxel). The dim population is local and not loaded here yet |
| `radius` | `100` | Galaxy radius in scene units |
| `spiralArms` | `4` | Number of spiral arms |
| `spiralAngle` | `240` | Spiral arm sweep in degrees |
| `thickness` | `0.06` | Disk thickness (fraction of radius) |
| `particleSize` | `1.0` | Base star particle diameter |
| `maxStarApparentSize` | `0.01` | Cap on a star's apparent size as a fraction of its distance. `0` = off. Only affects the near end |
| `distantGalaxies` | `500` | External galaxies scattered isotropically outside the disc — what keeps the off-band sky from reading as empty |
| `distantStars` | `3000` | Dim far-out stars scattered isotropically outside the disc — the same emptiness budget, but for POINTS. They carry no name or system; they exist so the sky outside the band has texture |
| `coreSize` | `0.12` | Central black hole radius. Disk radii are multiples of it, so this scales the whole assembly |

*/
/*{ "parent": "Space" }*/

import { B3dChild } from './b3d-utils.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import {
  generateStarSystem,
  type StarData,
  type GalaxyData,
  type StarSystemData,
} from './galaxy-data.js'
import { voxelGalaxy, type VoxelGalaxy } from './voxel-galaxy.js'
import { b3dBlackHole } from './b3d-black-hole.js'

/**
 * A particle as the baker and the picker see it. The field names are the
 * `SolidParticle` subset those consumers always read (`scaling`, not
 * `scale`), so code written against the old particle system still reads it.
 */
export interface GalaxyPoint {
  /** Centre, in the mesh's own (Babylon, y-up) frame. */
  position: BABYLON.Vector3
  /** The authored size multiplier — the quad is `particleSize × scaling.x`. */
  scaling: { x: number }
  color: BABYLON.Color4
}

/** The per-vertex size attribute the vertex shader expands quads by. */
const QUAD_SCALE = 'quadScale'
/** Pick slack, in pixels, so a one-pixel star is still clickable. */
const SLACK_PX = 3
let warnedStarSps = false

interface Quads {
  mesh: BABYLON.Mesh
  points: GalaxyPoint[]
  hidden: boolean[]
  setHidden(i: number, hidden: boolean): void
  setColor(i: number, c: BABYLON.Color4, flush?: boolean): void
  flushColors(): void
}

/*
One static quad per point, every vertex AT the point's centre. Same layout as
`CreatePlane` — corners (0,0) (1,0) (1,1) (0,1), triangles 0-1-2 / 0-2-3 — and
the same order the points came in, so draw order (which the premultiplied blend
of additive and darkening nebulae depends on) is generation order.

Only colour and size are ever rewritten, and only when something asks: a
filter, a hide.
*/
function buildQuads(
  name: string,
  scene: BABYLON.Scene,
  points: GalaxyPoint[]
): Quads {
  const n = points.length
  const positions = new Float32Array(n * 12)
  const uvs = new Float32Array(n * 8)
  const colors = new Float32Array(n * 16)
  const scales = new Float32Array(n * 4)
  const indices = new Uint32Array(n * 6)
  const CORNERS = [0, 0, 1, 0, 1, 1, 0, 1]
  const writeColor = (i: number, c: BABYLON.Color4) => {
    for (let k = 0; k < 4; k++) {
      const at = i * 16 + k * 4
      colors[at] = c.r
      colors[at + 1] = c.g
      colors[at + 2] = c.b
      colors[at + 3] = c.a
    }
  }
  const writeScale = (i: number, s: number) => {
    scales.fill(s, i * 4, i * 4 + 4)
  }
  for (let i = 0; i < n; i++) {
    const p = points[i]
    for (let k = 0; k < 4; k++) {
      positions[i * 12 + k * 3] = p.position.x
      positions[i * 12 + k * 3 + 1] = p.position.y
      positions[i * 12 + k * 3 + 2] = p.position.z
      uvs[i * 8 + k * 2] = CORNERS[k * 2]
      uvs[i * 8 + k * 2 + 1] = CORNERS[k * 2 + 1]
    }
    writeColor(i, p.color)
    writeScale(i, p.scaling.x)
    const v = i * 4
    indices.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6)
  }

  const mesh = new BABYLON.Mesh(name, scene)
  const data = new BABYLON.VertexData()
  data.positions = positions
  data.uvs = uvs
  data.colors = colors
  data.indices = indices
  data.applyToMesh(mesh, true)
  mesh.setVerticesData(QUAD_SCALE, scales, true, 1)
  // The CPU bounds are the centres only, so let nothing cull or pick by them.
  mesh.alwaysSelectAsActiveMesh = true
  mesh.isPickable = false

  const hidden: boolean[] = new Array(n).fill(false)
  return {
    mesh,
    points,
    hidden,
    setHidden(i, h) {
      hidden[i] = h
      writeScale(i, h ? 0 : points[i].scaling.x)
      mesh.updateVerticesData(QUAD_SCALE, scales)
    },
    setColor(i, c, flush = true) {
      points[i].color = c
      writeColor(i, c)
      if (flush) mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors)
    },
    flushColors() {
      mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors)
    },
  }
}

export class B3dGalaxy extends B3dChild {
  static preferredTagName = 'tosi-b3d-galaxy'

  static shadowStyleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    seed: 1234,
    starCount: 10000,
    /**
     * The DIM population's budget — local stars, generated only near a point
     * (the baker's eye; the camera, once dim voxels stream). Not drawn by the
     * galaxy yet; it is part of the galaxy's identity, so a bake reads it.
     */
    dimBudget: 95000,
    radius: 100,
    spiralArms: 4,
    spiralAngle: 240,
    thickness: 0.06,
    particleSize: 1.0,
    /*
    SMALL, AND DIM. Measured rather than guessed: at `0.25` the whole assembly
    is 0.8 units across while a nebula is 2.25–7.5, so the hole was never
    geometrically large — it was SALIENT, a hard bright ring among soft faint
    gas, which reads as bigger than it is. Tonio: "the core black hole is simply
    way too big relative to anything else. It reads as the size of a nebula."

    So both levers: half the size again, and the disk and photon ring turned
    down. Brightness is the one that was actually doing the damage.
    */
    coreSize: 0.12,
    /*
    OTHER GALAXIES, scattered outside this one. A budget of its own rather than
    a fraction of `starCount`, because the emptiness they fill belongs to the
    SKY and not to how dense this galaxy happens to be.
    */
    distantGalaxies: 500,
    /*
    Dim far-out stars outside the disc — the "something in the empty areas"
    budget, like the distant galaxies but for points. They are NOT part of
    the disc population and carry no name or system; they exist so the sky
    outside the band has texture.
    */
    distantStars: 3000,
    /*
    Largest apparent size a star may have, as a fraction of its distance —
    roughly its angular radius in radians. `0` disables the clamp.

    Only bites on the NEAR end: stars already smaller than this keep the size
    they were given, so the distant field is untouched. Applied when the
    particles are aimed at a viewpoint (see `facePoint`), because apparent size
    is meaningless without one.
    */
    maxStarApparentSize: 0.01,
  }

  declare seed: number
  declare starCount: number
  declare dimBudget: number
  declare radius: number
  declare spiralArms: number
  declare spiralAngle: number
  declare thickness: number
  declare particleSize: number
  declare coreSize: number
  declare distantGalaxies: number
  declare distantStars: number
  declare maxStarApparentSize: number

  owner: B3d | null = null

  private rootNode: BABYLON.TransformNode | null = null
  private starQuads: Quads | null = null
  private starMesh: BABYLON.Mesh | null = null
  private nebulaQuads: Quads | null = null
  private nebulaMesh: BABYLON.Mesh | null = null
  /** The fixed viewpoint set by `facePoint`, or null to follow the camera. */
  private faceTarget: BABYLON.Vector3 | null = null
  private blackHoleEl: HTMLElement | null = null
  private galaxyData: GalaxyData | null = null
  /** The galaxy itself — `galaxyData` is its view. */
  galaxy: VoxelGalaxy | null = null
  private originalColors: BABYLON.Color4[] | null = null
  private registered = false

  content = () => ''

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    this.registerShaders()
    this.rootNode = new BABYLON.TransformNode('galaxy-root', scene)
    this.buildGalaxy()
    this.buildBlackHole()
  }

  sceneDispose() {
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.rootNode?.dispose()
    this.rootNode = null
    this.owner = null
  }

  /**
   * Face every particle at a FIXED world point instead of the live camera, and
   * clamp star sizes as seen from it. `null` hands orientation back to the
   * camera.
   *
   * The particles always face the viewpoint's POSITION — the vertex shader
   * does that (see `registerShaders`) — so a cube bake's six faces, which share
   * a position and differ only in rotation, already agree at their seams
   * without this. What a fixed point adds is the APPARENT-SIZE CLAMP
   * (`maxStarApparentSize`), which only means something from one known
   * viewpoint, and a guarantee that nothing between captures can move it.
   *
   * ⚠️ NOT the galactic centre. This was first written as `faceOrigin`, which
   * named the wrong thing even though the argument was right — Tonio: "No
   * faceorigin is wrong. Face the camera position." The observer is 55% of the
   * way out from the core, so facing the core would tilt every particle away
   * from the viewer by a different amount depending where it sits.
   *
   * (This used to write a rotation into every particle on the CPU, alongside
   * Babylon's own per-frame billboarding — two mechanisms that COMPOSED rather
   * than replaced each other, which is how a restore once left every star a
   * vertical smear. One uniform cannot stack with anything.)
   */
  facePoint(target: BABYLON.Vector3 | null): void {
    this.faceTarget = target == null ? null : target.clone()
  }

  private disposeMeshes() {
    this.starMesh?.dispose()
    this.starMesh = null
    this.starQuads = null
    this.nebulaMesh?.dispose()
    this.nebulaMesh = null
    this.nebulaQuads = null
  }

  private registerShaders() {
    if (BABYLON.Effect.ShadersStore['galaxyStarVertexShader']) return

    /*
    BILLBOARDING, ON THE GPU. Every vertex of a quad sits at the particle's
    centre; the shader pushes it out to its corner along axes that face the
    VIEWPOINT'S POSITION. The CPU never touches a particle after the build —
    the old per-frame `setParticles()` rewrote every vertex of every star
    whether or not anything had moved.

    Facing a POSITION rather than the view plane is what keeps a cube bake's
    seams consistent: the six faces share a position, so every quad is aimed
    the same way in all of them.

    THE REFERENCE UP SWAPS near the poles. A fixed (0,1,0) makes the quad only
    ever yaw about the plane normal, and looking straight down the galaxy's axis
    the reference is parallel to the view direction — every particle goes
    edge-on and the galaxy falls apart from exactly the angle you would most
    want to admire it from. Any non-parallel vector will do for a radially
    symmetric blob, and swapping removes the singularity rather than moving it.

    ORTHOGONALISED by the two cross products, which a look-rotation helper
    will not do for you (Babylon's `FromLookDirectionLH` requires orthogonal
    inputs and the CPU version once fed it a raw world up — an ellipse, some
    30° off, worst at the poles).

    `eye` is in the mesh's LOCAL space (the material converts it at bind), so a
    moved or tilted galaxy still faces the camera.
    */
    BABYLON.Effect.ShadersStore['galaxyStarVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec4 color;
      attribute float quadScale;
      uniform mat4 worldViewProjection;
      uniform vec3 eye;
      uniform float baseSize;
      uniform float maxApparent;
      varying vec2 vUV;
      varying vec4 vColor;
      void main() {
        vec3 dir = eye - position;
        float d = length(dir);
        vec3 fwd = d > 1e-4 ? dir / d : vec3(0.0, 0.0, 1.0);
        vec3 ref = abs(fwd.y) > 0.98 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        vec3 right = normalize(cross(ref, fwd));
        vec3 up = cross(fwd, right);
        // CLAMP APPARENT SIZE (stars, from a fixed viewpoint): anything whose
        // apparent size exceeds the cap is scaled down to it and everything
        // else is untouched, so the far field keeps the density it was tuned
        // to. 0 = off.
        float s = quadScale;
        if (maxApparent > 0.0) s = min(s, maxApparent * d);
        vec2 corner = (uv - 0.5) * (baseSize * s);
        gl_Position = worldViewProjection *
          vec4(position + right * corner.x + up * corner.y, 1.0);
        vUV = uv;
        vColor = color;
      }
    `

    // Alpha channel encodes particle type:
    //   a > 0.9  → star
    //   a 0.5..0.9 → emission nebula (opacity = (a-0.5)*2.5)
    //   a < 0.5  → dark nebula (opacity = a*2)
    // Premultiplied alpha trick:
    //   rgb=color, a=0 → additive (stars, emission nebulae)
    //   rgb=0, a=opacity → darkening (dark nebulae)
    BABYLON.Effect.ShadersStore['galaxyStarFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      varying vec4 vColor;
      uniform float visibility;

      // Hash-based pseudo-random for noise
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      // Value noise with smooth interpolation
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // FBM — 4 octaves of noise for turbulent shapes
      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          v += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return v;
      }

      vec4 shade() {
        vec2 uv = vUV - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;

        float a = vColor.a;

        if (a > 0.9) {
          // Star: additive glow, white center → spectral edge
          float core = 1.0 - smoothstep(0.0, 0.3, d);
          float glow = 1.0 - smoothstep(0.0, 1.0, d);
          vec3 starColor = vColor.rgb;
          vec3 col = mix(starColor, vec3(1.0), core) * (0.4 + glow * 0.6);
          float intensity = glow * glow;
          return vec4(col * intensity, 0.0);
        } else if (a > 0.45) {
          // Emission nebula: turbulent additive glow
          float nebulaOpacity = (a - 0.5) * 2.5;
          // Use color as a per-particle seed for unique shapes
          vec2 seed = vec2(vColor.r * 73.0 + vColor.g * 157.0, vColor.b * 211.0);
          float n = fbm(uv * 4.0 + seed);
          // Distort the radial falloff with noise
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          // Add wispy tendrils
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          /*
          0.4, tuned by eye against the live galaxy across three passes: 0.3 was
          invisible ("dim and pretty saturated… too dim"), 1.2 blew out ("way
          too bright"), 0.5 was close, and 0.4 is the settled value once the
          stamps grew 50% — bigger nebulae overlap more, so each wants to be
          slightly fainter to land in the same place.

          The DARK branch below keeps its 0.35: dark nebulae darken, so they
          were never part of the too-dim complaint and a stronger one just blots
          the arm out.
          */
          vec3 col = vColor.rgb * soft * nebulaOpacity * 0.4;
          return vec4(col, 0.0);
        } else {
          // Dark nebula: turbulent darkening
          float nebulaOpacity = a * 2.0;
          vec2 seed = vec2(vColor.r * 73.0 + 31.0, vColor.g * 157.0 + 59.0);
          float n = fbm(uv * 4.0 + seed);
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          float alpha = soft * nebulaOpacity * 0.35;
          return vec4(0.0, 0.0, 0.0, alpha);
        }
      }

      // Premultiplied, so scaling BOTH rgb and alpha is a true fade — for
      // additive stars and darkening nebulae alike. (A ShaderMaterial is never
      // handed mesh.visibility, so setVisibility() used to be all-or-nothing.)
      //
      // shade() RETURNS its colour: Babylon's WebGL2 rewrite declares the
      // fragment output just above main(), so a helper cannot assign it.
      void main() {
        gl_FragColor = shade() * visibility;
      }
    `
  }

  private createShaderMaterial(
    name: string,
    scene: BABYLON.Scene,
    clampsStars: boolean
  ) {
    const mat = new BABYLON.ShaderMaterial(
      name,
      scene,
      { vertex: 'galaxyStar', fragment: 'galaxyStar' },
      {
        attributes: ['position', 'uv', 'color', QUAD_SCALE],
        uniforms: [
          'worldViewProjection',
          'eye',
          'baseSize',
          'maxApparent',
          'visibility',
        ],
        needAlphaBlending: true,
      }
    )
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_PREMULTIPLIED

    /*
    THE VIEWPOINT, PER BIND — not per frame. A bind happens for every camera
    that draws the mesh (each XR eye, each render target, each cube face), and
    the scene's view matrix at that moment belongs to whichever camera it is,
    so this is always the camera actually rendering. Inverting two 4×4s per
    bind is the entire per-frame cost of the galaxy.
    */
    const inverse = new BABYLON.Matrix()
    const eyeWorld = new BABYLON.Vector3()
    const eyeLocal = new BABYLON.Vector3()
    mat.onBindObservable.add((mesh) => {
      const effect = mat.getEffect()
      if (effect == null) return
      if (this.faceTarget != null) {
        eyeWorld.copyFrom(this.faceTarget)
      } else {
        scene.getViewMatrix().invertToRef(inverse)
        inverse.getTranslationToRef(eyeWorld)
      }
      mesh.getWorldMatrix().invertToRef(inverse)
      BABYLON.Vector3.TransformCoordinatesToRef(eyeWorld, inverse, eyeLocal)
      effect.setVector3('eye', eyeLocal)
      effect.setFloat('baseSize', (this as any).particleSize)
      /*
      ⚠️ STARS ONLY, and only from a fixed point. A nebula's size is its actual
      extent and means something; a star's world size is a stand-in for
      brightness. (Clamping nebulae once shrank the distant galaxies that had
      just been enlarged to fill the sky.)
      */
      effect.setFloat(
        'maxApparent',
        clampsStars && this.faceTarget != null
          ? (this as any).maxStarApparentSize
          : 0
      )
      effect.setFloat('visibility', mesh.visibility)
    })
    return mat
  }

  private buildGalaxy() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const scene = this.owner.scene

    /*
    ONE GALAXY (GALAXY-DESIGN.md → "Reconciliation"): the voxel galaxy, read
    through its `view`, which is the GalaxyData shape everything below already
    draws. `starCount` is its BRIGHT budget; the view also carries every
    INTERESTING dim star (HI ≤ 2), verified, so the HI filter is complete.
    */
    this.galaxy = voxelGalaxy({
      seed: attrs.seed,
      brightBudget: attrs.starCount,
      dimBudget: attrs.dimBudget,
      galaxyOptions: {
        spiralArms: attrs.spiralArms,
        spiralAngleDegrees: attrs.spiralAngle,
        thickness: attrs.thickness,
        distantGalaxies: attrs.distantGalaxies,
      },
    })
    this.galaxyData = this.galaxy.view()

    const { stars, nebulae } = this.galaxyData
    const radius: number = attrs.radius
    const scaleFactor = radius / 0.9

    const toBabylon = (v: { x: number; y: number; z: number }) =>
      // generation is z-up; the scene is y-up
      new BABYLON.Vector3(
        v.x * scaleFactor,
        v.z * scaleFactor,
        v.y * scaleFactor
      )
    const rgba = (rgb: [number, number, number], a: number) =>
      new BABYLON.Color4(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, a)

    /*
    Stars, then the dim far-out stars, in ONE mesh — generation order, which
    `hideStarAt`, `filterStars` and the baker all index by. The distant stars
    are appended rather than given their own mesh because they are points and
    the star path already draws points; they keep the off-band sky from
    reading as blank when you stand inside the galaxy.
    */
    const distantStars = this.galaxyData?.distantStars ?? []
    const starPoints: GalaxyPoint[] = []
    for (const star of stars) {
      starPoints.push({
        position: toBabylon(star.position),
        scaling: { x: star.scale },
        color: rgba(star.rgb, 1),
      })
    }
    for (const ds of distantStars) {
      starPoints.push({
        position: toBabylon(ds.position),
        scaling: { x: ds.scale },
        color: rgba(ds.rgb, 1),
      })
    }
    const starQuads = buildQuads('galaxy-stars', scene, starPoints)
    starQuads.mesh.parent = this.rootNode
    starQuads.mesh.material = this.createShaderMaterial(
      'galaxy-star-mat',
      scene,
      true
    )
    this.originalColors = starPoints
      .slice(0, stars.length)
      .map((p) => p.color.clone())
    this.starQuads = starQuads
    this.starMesh = starQuads.mesh

    // Alpha encodes the kind: > 0.9 star, 0.5..0.9 emission, < 0.5 dark.
    if (nebulae.length > 0) {
      const nebulaPoints: GalaxyPoint[] = nebulae.map((neb) => ({
        position: toBabylon(neb.position),
        scaling: { x: neb.scale },
        color: rgba(
          neb.rgb,
          neb.type === 'emission' ? 0.5 + neb.opacity * 0.4 : neb.opacity * 0.45
        ),
      }))
      const nebulaQuads = buildQuads('galaxy-nebulae', scene, nebulaPoints)
      nebulaQuads.mesh.parent = this.rootNode
      nebulaQuads.mesh.material = this.createShaderMaterial(
        'galaxy-nebula-mat',
        scene,
        false
      )
      this.nebulaQuads = nebulaQuads
      this.nebulaMesh = nebulaQuads.mesh
    }

    if (!this.registered) {
      this.registered = true
      const meshes = [starQuads.mesh]
      if (this.nebulaMesh) meshes.push(this.nebulaMesh)
      this.owner.register({ meshes })
    }
  }

  private buildBlackHole() {
    if (this.owner == null) return
    const attrs = this as any
    const coreSize: number = attrs.coreSize

    // Create a b3dBlackHole element as a child
    this.blackHoleEl = b3dBlackHole({
      radius: coreSize,
      diskInnerRadius: 1.05,
      diskOuterRadius: 1.6,
      diskBrightness: 0.5,
      rotationSpeed: 0.3,
      lensing: 'on',
      photonRing: 'on',
      photonRingBrightness: 0.7,
      subdivisions: 32,
    })
    // Append to galaxy's parent (inside the b3d element)
    this.parentElement?.appendChild(this.blackHoleEl)
  }

  /**
   * A star by its ADDRESS (`seed:population:voxel:n`, the `id` on every star) —
   * stable, unlike an index, which is a position in whatever is loaded.
   */
  getStar(id: string): StarData | null {
    // By address — resolved from its voxel, so a dim star that is not loaded
    // is still findable.
    return this.galaxy?.star(id) ?? null
  }

  /** Get star data at the given index (into the loaded view — see `getStar`). */
  getStarAt(index: number): StarData | null {
    if (!this.galaxyData || index < 0 || index >= this.galaxyData.stars.length)
      return null
    return this.galaxyData.stars[index]
  }

  /** Get full star system (star + planets) at the given index */
  getStarSystem(index: number): StarSystemData | null {
    const star = this.getStarAt(index)
    if (!star) return null
    return generateStarSystem(star)
  }

  /** Get the galaxy data */
  getGalaxyData(): GalaxyData | null {
    return this.galaxyData
  }

  /**
   * @deprecated There is no particle system any more — stars are billboarded
   * in the vertex shader. Use {@link pickStar} to pick. Returns null; removed
   * in 0.9.
   */
  getStarSPS(): null {
    if (!warnedStarSps) {
      warnedStarSps = true
      console.warn(
        'b3d-galaxy: getStarSPS() is gone (stars are billboarded in the ' +
          'vertex shader) — use galaxy.pickStar(x, y) to pick a star.'
      )
    }
    return null
  }

  /** The star mesh — hide it, fade it, or compare against it. */
  getStarMesh(): BABYLON.Mesh | null {
    return this.starMesh
  }

  /**
   * Every point in the star mesh — the disc stars in generation order, then
   * the distant stars — in the mesh's own (Babylon) frame.
   */
  getStarPoints(): GalaxyPoint[] {
    return this.starQuads?.points ?? []
  }

  /**
   * The star under a screen point, or `-1`.
   *
   * ⚠️ NOT `scene.pick`. The mesh's CPU geometry is every quad collapsed to its
   * centre — the corners only exist in the vertex shader — so a triangle pick
   * finds nothing. This casts the pick ray and takes the NEAREST star whose
   * drawn disc it passes through, with a few pixels of slack so a star a
   * pixel wide is still clickable (the old quad pick was not that kind).
   */
  pickStar(
    x: number,
    y: number,
    camera: BABYLON.Camera | null = this.owner?.scene.activeCamera ?? null
  ): number {
    const quads = this.starQuads
    const scene = this.owner?.scene
    if (
      quads == null ||
      scene == null ||
      camera == null ||
      this.galaxyData == null
    )
      return -1
    const world = scene.createPickingRay(
      x,
      y,
      BABYLON.Matrix.Identity(),
      camera
    )
    const inverse = quads.mesh.computeWorldMatrix(true).clone().invert()
    const ray = BABYLON.Ray.Transform(world, inverse)
    const dir = ray.direction.normalize()
    const o = ray.origin
    const particleSize = (this as any).particleSize as number
    // Radians per pixel, vertically — the slack is SLACK_PX of these.
    const height = scene.getEngine().getRenderHeight() || 1
    const perPixel = (camera.fov || 0.8) / height
    /*
    A HIT BEATS A NEAR MISS, whatever the depth. Ranking everything inside the
    slack by distance let a closer star three pixels to the side steal a click
    aimed dead-centre at another — a third of test clicks did. So: the nearest
    star whose disc the ray actually crosses (what a triangle pick meant), and
    only if there is none, the star the ray misses by the smallest ANGLE.
    */
    let hit = -1
    let hitT = Infinity
    let near = -1
    let nearAngle = perPixel * SLACK_PX
    const n = this.galaxyData.stars.length
    for (let i = 0; i < n; i++) {
      if (quads.hidden[i]) continue
      const p = quads.points[i].position
      const cx = p.x - o.x
      const cy = p.y - o.y
      const cz = p.z - o.z
      const t = cx * dir.x + cy * dir.y + cz * dir.z
      if (t <= 0) continue
      const ex = cx - dir.x * t
      const ey = cy - dir.y * t
      const ez = cz - dir.z * t
      const miss = Math.sqrt(ex * ex + ey * ey + ez * ez)
      const r = particleSize * quads.points[i].scaling.x * 0.5
      if (miss <= r) {
        if (t < hitT) {
          hit = i
          hitT = t
        }
      } else if (hit < 0) {
        const angle = (miss - r) / t
        if (angle < nearAngle) {
          near = i
          nearAngle = angle
        }
      }
    }
    return hit >= 0 ? hit : near
  }

  /**
   * The DISTANT STAR points, for the skybox baker — the tail of the star
   * mesh, in the same order `generateGalaxy` made them.
   */
  getDistantStarParticles(): GalaxyPoint[] {
    if (this.starQuads == null || this.galaxyData == null) return []
    const count = this.galaxyData.distantStars.length
    if (count === 0) return []
    const points = this.starQuads.points
    return points.slice(Math.max(0, points.length - count))
  }

  /**
   * The DISTANT GALAXY points, for the skybox baker.
   *
   * They live inside the nebula mesh (appended last, in generation order — see
   * the note in `galaxy-data`), so the only code that knows which points they
   * are without guessing by size or colour is the code next to the build.
   * That is here: the last `distantGalaxies.length` points, in the mesh's
   * own (Babylon) frame — which is the frame a baker photographs in.
   */
  getDistantGalaxyParticles(): GalaxyPoint[] {
    if (this.nebulaQuads == null || this.galaxyData == null) return []
    const count = this.galaxyData.distantGalaxies.length
    if (count === 0) return []
    const points = this.nebulaQuads.points
    return points.slice(Math.max(0, points.length - count))
  }

  private isStarIndex(index: number): boolean {
    return (
      this.galaxyData != null &&
      this.starQuads != null &&
      index >= 0 &&
      index < this.galaxyData.stars.length
    )
  }

  /** Hide a star (e.g. to replace it with a star system) */
  hideStarAt(index: number) {
    if (this.isStarIndex(index)) this.starQuads!.setHidden(index, true)
  }

  /** Show a previously hidden star */
  showStarAt(index: number) {
    if (this.isStarIndex(index)) this.starQuads!.setHidden(index, false)
  }

  /** Get the world position of a star */
  getStarPosition(index: number): BABYLON.Vector3 | null {
    if (!this.isStarIndex(index)) return null
    const pos = this.starQuads!.points[index].position.clone()
    if (this.rootNode) {
      return BABYLON.Vector3.TransformCoordinates(
        pos,
        this.rootNode.getWorldMatrix()
      )
    }
    return pos
  }

  /** Filter stars: dim those that don't match criteria */
  filterStars(options: { maxHI?: number; nameSearch?: string } = {}) {
    const quads = this.starQuads
    if (!quads || !this.galaxyData || !this.originalColors) return
    const { maxHI = 5, nameSearch = '' } = options
    const needle = nameSearch.toLowerCase()
    const { stars } = this.galaxyData
    for (let i = 0; i < stars.length; i++) {
      const orig = this.originalColors[i]
      // bestHI is computed on demand: bulk generation skips planets (see
      // generatePlanets in galaxy-data), so the FIRST HI filter pays for the
      // systems it examines and the result is cached on the star.
      let hi = stars[i].bestHI
      if (maxHI < 5 && hi >= 5 && !stars[i].hiComputed) {
        const system = generateStarSystem(stars[i])
        let best = 5
        for (const p of system.planets) if (p.HI < best) best = p.HI
        hi = best
        stars[i].bestHI = best
        stars[i].hiComputed = true
      }
      const hiPass = maxHI >= 5 || hi <= maxHI
      const namePass = !needle || stars[i].name.toLowerCase().includes(needle)
      quads.setColor(
        i,
        hiPass && namePass
          ? orig.clone()
          : new BABYLON.Color4(
              orig.r * 0.08,
              orig.g * 0.08,
              orig.b * 0.08,
              orig.a
            ),
        false
      )
    }
    quads.flushColors()
  }

  /** Set visibility of the entire galaxy (0-1) */
  setVisibility(v: number) {
    if (this.starMesh) this.starMesh.visibility = v
    if (this.nebulaMesh) this.nebulaMesh.visibility = v
    if (this.blackHoleEl) {
      ;(this.blackHoleEl as any).setVisibility?.(v)
    }
  }

  /** Rebuild the entire galaxy with current attributes */
  regenerate() {
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.registered = false
    this.buildGalaxy()
    this.buildBlackHole()
  }
}

export const b3dGalaxy = B3dGalaxy.elementCreator()
