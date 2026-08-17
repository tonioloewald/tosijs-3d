/*
 * demo-utils — a small shared toolkit for doc-page live examples.
 *
 * The "when in doubt" defaults, in one place so every demo is consistent instead of each one
 * hand-rolling (or forgetting) them:
 *   - a sun that actually CASTS shadows,
 *   - a test-pattern GROUND that catches them (far more legible than a flat colour),
 *   - the standard orbit camera (six lines every demo repeated),
 *   - a moving/rotating prop, so the dynamics are visible at a glance.
 *
 * Demo-only — NOT part of the published `tosijs-3d` library. Registered in `demo/site.ts` under the
 * key `demo-utils`, so an example can `import { demoSun, orbitCam, patternGround, spinner } from 'demo-utils'`.
 *
 * ⚠️ UNVERIFIED until a full build runs (authored while the machine was out of memory). The element
 * factories (demoSun/patternGround) and the camera use APIs confirmed from existing demos; the
 * shadow-caster registration in `spinner` (via the b3d element's `register`) is the one spot to
 * eyeball once it builds.
 */
import * as BABYLON from '@babylonjs/core'
import {
  b3dSun,
  b3dSkybox,
  b3dGround,
  SvgTexture,
  sceneDelta,
  extractChunk,
  attachBiomePlugin,
} from '../src/index'

// The b3d element examples receive as `el` in sceneCreated — just the bits these helpers touch.
type B3dEl = {
  scene: BABYLON.Scene
  setActiveCamera(camera: BABYLON.Camera): void
  querySelector(selector: string): Element | null
  register?(additions: { meshes?: BABYLON.AbstractMesh[] }): void
}

/**
 * The library's Warhol-ish test pattern (in `static/`), reused for grounds and props.
 *
 * Exported because it is the answer to "what do I put on this so I can SEE it" —
 * a flat colour hides the lighting, the shadows and the UV mapping all at once,
 * which is how a demo ends up looking broken when it is merely bland.
 */
export const TEST_PATTERN = '/tosi-test-pattern.svg'

/** A sun that CASTS shadows — the "when in doubt, add a shadow light" default. Pass overrides through. */
export function demoSun(opts: Record<string, unknown> = {}) {
  return b3dSun({ intensity: 0.9, shadowTextureSize: 1024, ...opts })
}

/**
 * A checkered ground that RECEIVES shadows — a test pattern reads the light far better than a flat
 * colour, and `b3dGround` already wires up shadow-receiving. Placed as a child of `b3d(...)`.
 */
export function patternGround(
  opts: {
    size?: number
    tiles?: number
    color?: string
    /** Use the tosi test pattern instead of the generated checker. Nicer to look
     * at, and it shows UV orientation — a checker is symmetric, so it can't. */
    pattern?: boolean
  } = {}
) {
  const { size = 40, tiles = 16, color = '#8a9b7e', pattern = false } = opts
  return b3dGround({
    width: size,
    height: size,
    // `b3dGround` takes any texture URL; the SVG carries an intrinsic 512x512,
    // so it rasterizes without help.
    texture: pattern ? TEST_PATTERN : 'checker',
    textureTiles: pattern ? Math.max(1, Math.round(tiles / 4)) : tiles,
    color,
  })
}

/**
 * The whole "make it not look like a test harness" setup in one spread: a sun
 * that casts, a sky to light and reflect, and a ground that shows both.
 *
 * ```js
 * b3d({ ... }, ...demoStage({ pattern: true }), myThing)
 * ```
 *
 * Exists because "bland" is a real defect and it is always the same three
 * missing elements. A demo whose subject is a cube should still be worth
 * looking at, or the reader concludes the FRAMEWORK looks like that.
 */
export function demoStage(
  opts: {
    size?: number
    tiles?: number
    color?: string
    pattern?: boolean
    timeOfDay?: number
    sun?: Record<string, unknown>
  } = {}
) {
  const { timeOfDay = 11, sun = {}, ...ground } = opts
  return [demoSun(sun), b3dSkybox({ timeOfDay }), patternGround(ground)]
}

/**
 * The standard ArcRotateCamera every demo sets up — one call instead of six lines. In sceneCreated.
 *
 * Clamps the tilt by DEFAULT so you can't drag the view below the horizon and see the world from
 * underneath (an ArcRotateCamera happily orbits under the floor otherwise — a long-standing demo
 * papercut). `minElevationDeg` (default 5) keeps the camera at least that many degrees above
 * horizontal; `maxElevationDeg` (default 89) stops it going exactly top-down. Set either to null
 * to opt out.
 */
export function orbitCam(
  el: B3dEl,
  opts: {
    alpha?: number
    beta?: number
    radius?: number
    target?: [number, number, number]
    minElevationDeg?: number | null
    maxElevationDeg?: number | null
  } = {}
): BABYLON.ArcRotateCamera {
  const {
    alpha = -Math.PI / 2,
    beta = Math.PI / 3,
    radius = 14,
    target = [0, 0.8, 0],
    minElevationDeg = 5,
    maxElevationDeg = 89,
  } = opts
  const cam = new BABYLON.ArcRotateCamera(
    'demo-cam',
    alpha,
    beta,
    radius,
    new BABYLON.Vector3(target[0], target[1], target[2]),
    el.scene
  )
  cam.attachControl(el.querySelector('canvas'), true)
  // beta is measured from straight-up (0) to straight-down (π); π/2 is level with the horizon.
  // Elevation ABOVE horizontal = π/2 − beta, so a min elevation is an UPPER beta limit.
  if (minElevationDeg != null)
    cam.upperBetaLimit = Math.PI / 2 - (minElevationDeg * Math.PI) / 180
  if (maxElevationDeg != null)
    cam.lowerBetaLimit = Math.PI / 2 - (maxElevationDeg * Math.PI) / 180
  el.setActiveCamera(cam)
  return cam
}

/**
 * A textured, slowly-rotating box — the "non-static object so you can see the shadow move" prop.
 * Registers itself as a shadow caster so `demoSun`/`b3dSun` picks it up. Call in sceneCreated.
 */
export function spinner(
  el: B3dEl,
  opts: {
    size?: number
    x?: number
    y?: number
    z?: number
    spin?: number
  } = {}
): BABYLON.Mesh {
  const { size = 1.6, x = 0, y = 0.9, z = 0, spin = 0.4 } = opts
  const box = BABYLON.MeshBuilder.CreateBox('demo-spinner', { size }, el.scene)
  box.position.set(x, y, z)
  const mat = new BABYLON.StandardMaterial('demo-spinner-mat', el.scene)
  const tex = new SvgTexture({ scene: el.scene, url: TEST_PATTERN, resolution: 512 })
  mat.diffuseTexture = tex.texture
  mat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15)
  box.material = mat
  el.register?.({ meshes: [box] }) // enlist as a shadow caster (b3dSun adds registered meshes)
  el.scene.registerBeforeRender(() => {
    // sceneDelta is SECONDS. The line this replaced used getDeltaTime() (ms),
    // and the /1000 came along with it — turning a 4x error into a 1000x one
    // (the b3d-water crates were down to ~1 rev / 10 hours).
    box.rotation.y += spin * sceneDelta(el.scene)
  })
  return box
}

/*
 * ─── VOLUMETRIC TILE DEMOS ────────────────────────────────────────────────
 *
 * Every sdf/terrain demo is the same scene with a different DENSITY FUNCTION:
 * a tile of ground, optionally carved, extracted and shaded. Written from
 * scratch each time, that shared 60 lines is 60 lines of camera limits, vertex
 * colours and material setup for a reader to wade through before reaching the
 * one idea the demo is about — and 60 lines for the author to get wrong
 * independently every time (a cutaway box that swallowed the tile, a camera
 * radius silently clamped to 50, a heightfield lit from underneath: all three
 * happened, all three in demos written from scratch).
 *
 * So: the boilerplate lives here and a demo supplies `ground`, some `carves`,
 * and its panel rows.
 */

export interface VolumetricDemoOptions {
  /** World extent of the tile, metres. */
  size?: number
  /** Lattice spacing, metres. Cost scales as the CUBE of this — 3–5 is sane. */
  spacing?: number
  /** Cells of lattice below / above y=0. Must bracket the surface AND the carves. */
  below?: number
  above?: number
  /** The heightfield. Solid below it, air above, before any carving. */
  ground: (x: number, z: number) => number
  /** Air volumes subtracted from the ground — `carve.*`, positive inside the air. */
  carves?: Array<(x: number, y: number, z: number) => number>
  /**
   * Depth (m) over which volcanism ramps to full. 0 = no depth ramp. A
   * function is re-read on every `rebuild`, so a slider can drive it.
   *
   * Bigger is SLOWER. It interacts with the shader's stage ladder in a way
   * worth knowing: verticals lag one stage behind horizontals by design (a
   * cliff face drains and crusts over; lava pools flat), so a cut face at half
   * volcanism shows COLD dark voronoi'd basalt, not glowing seams. To get a
   * glowing web low down you need the deep end to reach FULL volcanism — so a
   * slow ramp plus enough depth, rather than a fast ramp.
   */
  molten?: number | (() => number)
  /** Also build the heightfield mesh, as a red wireframe overlay. */
  reference?: boolean
  /** Orbit angle (radians). Default frames the tile from -z; a cutaway that
   * removes z>centre wants the camera on the -z side to face the section. */
  alpha?: number
  seaLevel?: number
}

export interface VolumetricDemo {
  /** The extracted mesh, rebuilt by `rebuild()`. */
  mesh: BABYLON.Mesh | null
  /** The flat-grey heightfield mesh, when `reference` is set. */
  referenceMesh: BABYLON.Mesh | null
  /** A `<div>` reporting triangles, time and deviation — append it next to the scene. */
  readout: HTMLDivElement
  /** Re-extract (after changing a carve, a slider, anything). */
  rebuild: () => void
  /** Swap the carve list and re-extract — the "punch a hole in it" control. */
  setCarves: (
    carves: Array<(x: number, y: number, z: number) => number>
  ) => void
  /** Show/hide either surface. */
  show: (which: 'both' | 'volumetric' | 'reference') => void
  /** Wireframe on both, from one flag so they cannot diverge. */
  wireframe: (on: boolean) => void
}

/**
 * Build the volumetric-tile scene every sdf demo shares.
 *
 * Call it from `sceneCreated` (it needs a live scene). The camera is set up via
 * `orbitCam`, which builds its OWN camera rather than adjusting the default one
 * — the default's zoom is clamped to 50 m, which silently pins any scene-scale
 * demo far too close.
 */
export function volumetricDemo(
  el: B3dEl,
  opts: VolumetricDemoOptions
): VolumetricDemo {
  const {
    size = 256,
    spacing = 4,
    below = 20,
    above = 30,
    ground,
    carves: initialCarves = [],
    molten = 0,
    reference = false,
    seaLevel = -200,
    alpha = -Math.PI / 2,
  } = opts

  const scene = el.scene
  const readout = document.createElement('div')
  readout.style.cssText =
    'font: 12px ui-monospace, Menlo, monospace; padding: 6px; color: #93a4b0'

  let mesh: BABYLON.Mesh | null = null
  let referenceMesh: BABYLON.Mesh | null = null
  let wire = false

  let carves = initialCarves
  const density = (x: number, y: number, z: number) => {
    let d = y - ground(x, z) // solid below the surface
    for (const c of carves) d = Math.max(d, c(x, y, z))
    return d
  }

  const rebuild = () => {
    mesh?.dispose()
    const cells = Math.max(1, Math.round(size / spacing))
    const t0 = performance.now()
    const m = extractChunk(
      density,
      { ix: 0, iy: -below, iz: 0, nx: cells, ny: below + above, nz: cells },
      { spacing, jitter: 0.2, seed: 4 }
    )
    const ms = performance.now() - t0

    mesh = new BABYLON.Mesh('volumetric', scene)
    const vd = new BABYLON.VertexData()
    vd.positions = Array.from(m.positions)
    vd.indices = Array.from(m.indices)
    vd.normals = Array.from(m.normals)

    // Depth below the surface → the biome shader's volcanism ramp, carried in
    // the colour alpha (inverted: 1 = none). The same channel b3d-terrain uses
    // for local volcanic provinces, so a cut face reads as molten interior.
    const moltenDepth = typeof molten === 'function' ? molten() : molten
    if (moltenDepth > 0) {
      const colours: number[] = []
      for (let i = 0; i < m.vertexCount; i++) {
        const x = m.positions[i * 3]
        const y = m.positions[i * 3 + 1]
        const z = m.positions[i * 3 + 2]
        const depth = Math.max(0, ground(x, z) - y)
        colours.push(1, 1, 1, 1 - Math.min(1, depth / moltenDepth))
      }
      vd.colors = colours
    }
    vd.applyToMesh(mesh)

    const mat = new BABYLON.StandardMaterial('vmat', scene)
    mat.diffuseColor = new BABYLON.Color3(0.5, 0.52, 0.5)
    mat.backFaceCulling = false
    mat.wireframe = wire
    attachBiomePlugin(mat, { seaLevel })
    mesh.material = mat
    if (moltenDepth > 0) mesh.useVertexColors = true

    // Deviation from the heightfield, which is the number these demos exist to
    // show: the volumetric surface should match what a grid tile would draw.
    let max = 0
    for (let i = 0; i < m.vertexCount; i++) {
      const d = Math.abs(
        m.positions[i * 3 + 1] -
          ground(m.positions[i * 3], m.positions[i * 3 + 2])
      )
      if (d > max) max = d
    }
    readout.textContent =
      `${m.triangleCount} triangles · extracted in ${ms.toFixed(
        0
      )}ms at ${spacing}m spacing` +
      (carves.length === 0
        ? ` · max deviation from the heightfield ${max.toFixed(3)}m`
        : ' · carved')
  }

  if (reference) {
    const subs = Math.max(1, Math.round(size / spacing))
    const pos: number[] = []
    const idx: number[] = []
    for (let iz = 0; iz <= subs; iz++)
      for (let ix = 0; ix <= subs; ix++) {
        const x = (ix / subs) * size
        const z = (iz / subs) * size
        pos.push(x, ground(x, z), z)
      }
    for (let iz = 0; iz < subs; iz++)
      for (let ix = 0; ix < subs; ix++) {
        const a = iz * (subs + 1) + ix
        // Winding matters: reversed, the normals point DOWN and it renders black.
        idx.push(a, a + 1, a + subs + 1, a + 1, a + subs + 2, a + subs + 1)
      }
    referenceMesh = new BABYLON.Mesh('heightfield', scene)
    const vd = new BABYLON.VertexData()
    vd.positions = pos
    vd.indices = idx
    const nrm: number[] = []
    BABYLON.VertexData.ComputeNormals(pos, idx, nrm)
    vd.normals = nrm
    vd.applyToMesh(referenceMesh)
    // A RED WIREFRAME, not a solid surface. A solid reference occludes exactly
    // what you are trying to see — a bore's mouths sit in the heightfield's
    // unbroken surface, so showing both hid the tunnel completely. As a
    // wireframe it overlays the comparison instead of covering it, and the
    // tessellation is visible too.
    const rm = new BABYLON.StandardMaterial('hmat', scene)
    rm.emissiveColor = new BABYLON.Color3(0.9, 0.15, 0.15)
    rm.diffuseColor = new BABYLON.Color3(0, 0, 0)
    rm.specularColor = new BABYLON.Color3(0, 0, 0)
    rm.backFaceCulling = false
    rm.wireframe = true
    referenceMesh.material = rm
  }

  rebuild()

  // Its own camera, framing the tile — the scene's default is clamped to 50m.
  orbitCam(el, {
    alpha,
    radius: size * 1.6,
    beta: 1.1,
    target: [size / 2, ground(size / 2, size / 2) * 0.4, size / 2],
  })

  const api: VolumetricDemo = {
    get mesh() {
      return mesh
    },
    get referenceMesh() {
      return referenceMesh
    },
    readout,
    rebuild,
    setCarves: (next) => {
      carves = next
      rebuild()
    },
    show: (which) => {
      mesh?.setEnabled(which !== 'reference')
      referenceMesh?.setEnabled(which !== 'volumetric')
    },
    wireframe: (on) => {
      wire = on
      if (mesh?.material)
        (mesh.material as BABYLON.StandardMaterial).wireframe = on
      if (referenceMesh?.material)
        (referenceMesh.material as BABYLON.StandardMaterial).wireframe = on
    },
  }
  return api
}
