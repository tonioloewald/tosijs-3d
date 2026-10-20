/*#
# inspect-view

**Look at a thing square on: front, back, either side, top or bottom, with
nothing nearer looking bigger.** `inspectView(camera)` turns an
`ArcRotateCamera` orthographic and holds it to one of six views, the way a
modelling program's front and side views work. A joint lines up with the
flesh around it, and a drag no longer orbits, so it is free for whatever the
page puts under the pointer (the rig tool's handles). Pan and zoom still work:
shift-drag or two fingers to pan, the wheel or a pinch to zoom.

```javascript
import { inspectView, seamOverlay } from 'tosijs-3d'

const inspect = inspectView(camera, { face: 'front' })
inspect.face = 'left' // from the subject's left
inspect.face = 'free' // back to orbiting, a perspective camera again
const seams = seamOverlay(mesh) // drawn as its polygons (see seam-material)
seams.dispose()
```

The faces are named for a subject facing +Z (the engine's forward): `front`
looks at it from +Z, `left` from its left. The zoom is the camera's own
`radius`: each frame the orthographic box is the size a perspective camera
at that radius would show at its target, so zooming, panning and
[touch-orbit](/touch-orbit/) keep working, and leaving the view leaves the
scene the same size. The near plane is moved behind the camera, so zooming in
close does not cut the subject open.

Panels and the system bar are placed for whichever camera is active (see
[frame-panel](/frame-panel/)), so they stay put. With a `<tosi-b3d>`,
`viewMenu(inspect)` puts a camera on the [system bar](/system-bar/) that
picks the view.
*/
/*{ "parent": "input", "order": 41 }*/
import * as BABYLON from '@babylonjs/core'
import {
  seamMaterial,
  withBarycentrics,
  type SeamMaterialOptions,
} from './seam-material.js'

/** The views, by the side of the subject the camera is on. */
export const INSPECT_FACES = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
] as const
export type InspectFace = (typeof INSPECT_FACES)[number]

/** Alpha and beta for each face (an `ArcRotateCamera` at alpha, beta). */
const ANGLES: Record<InspectFace, [number, number]> = {
  front: [Math.PI / 2, Math.PI / 2],
  back: [-Math.PI / 2, Math.PI / 2],
  // Babylon is left-handed: a subject facing +Z has its left at -X.
  left: [Math.PI, Math.PI / 2],
  right: [0, Math.PI / 2],
  // Not exactly 0 or π: the view would have no "up".
  top: [Math.PI / 2, 1e-4],
  bottom: [Math.PI / 2, Math.PI - 1e-4],
}

export interface InspectView {
  /** The view held, or `free` to orbit with a perspective camera. */
  face: InspectFace | 'free'
  readonly camera: BABYLON.ArcRotateCamera
  /** Back to a free perspective camera, and stop. */
  dispose(): void
}

export interface InspectViewOptions {
  /** Where it starts (default `free`: nothing changes until a face is set). */
  face?: InspectFace | 'free'
  /** Called whenever the face changes (so a menu can follow). */
  handleChange?: (face: InspectFace | 'free') => void
}

export function inspectView(
  camera: BABYLON.ArcRotateCamera,
  options: InspectViewOptions = {}
): InspectView {
  const scene = camera.getScene()
  let face: InspectFace | 'free' = 'free'
  // What the free camera had, while a face is held.
  let saved: {
    limits: [number | null, number | null, number | null, number | null]
    minZ: number
  } | null = null

  /** The orthographic box a perspective camera at this radius would show. */
  const fit = () => {
    if (face === 'free') return
    const engine = scene.getEngine()
    const aspect = engine.getAspectRatio(camera) || 1
    const half = camera.radius * Math.tan(camera.fov / 2)
    camera.orthoTop = half
    camera.orthoBottom = -half
    camera.orthoLeft = -half * aspect
    camera.orthoRight = half * aspect
  }
  const obs = scene.onBeforeRenderObservable.add(fit)

  const set = (next: InspectFace | 'free') => {
    if (next === face) return
    if (next === 'free') {
      if (saved != null) {
        ;[
          camera.lowerAlphaLimit,
          camera.upperAlphaLimit,
          camera.lowerBetaLimit,
          camera.upperBetaLimit,
        ] = saved.limits
        camera.minZ = saved.minZ
        saved = null
      }
      camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA
    } else {
      saved ??= {
        limits: [
          camera.lowerAlphaLimit,
          camera.upperAlphaLimit,
          camera.lowerBetaLimit,
          camera.upperBetaLimit,
        ],
        minZ: camera.minZ,
      }
      const [alpha, beta] = ANGLES[next]
      // Held there: the limits pinned to the face, so a drag cannot orbit.
      camera.lowerAlphaLimit = camera.upperAlphaLimit = alpha
      camera.lowerBetaLimit = camera.upperBetaLimit = beta
      camera.alpha = alpha
      camera.beta = beta
      // Behind the camera as well: an orthographic view has no reason to cut
      // what is nearer than the camera, and zoomed in it would be inside.
      camera.minZ = -camera.maxZ
      camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
    }
    face = next
    fit()
    options.handleChange?.(face)
  }
  set(options.face ?? 'free')

  return {
    camera,
    get face() {
      return face
    },
    set face(v: InspectFace | 'free') {
      set(v)
    },
    dispose() {
      set('free')
      scene.onBeforeRenderObservable.remove(obs)
    },
  }
}

/**
 * Draw `mesh` as its polygons: a twin in its place (its own unshared copy of
 * the geometry, the same skeleton, so it bends with it) wearing a
 * `seamMaterial`, the mesh hidden meanwhile. `dispose()` shows it again.
 */
export function seamOverlay(
  mesh: BABYLON.AbstractMesh,
  options: SeamMaterialOptions = {}
): { mesh: BABYLON.Mesh | null; dispose(): void } {
  const scene = mesh.getScene()
  const twin = (mesh as BABYLON.Mesh).clone?.(`${mesh.name}-seams`, mesh.parent)
  if (twin == null) return { mesh: null, dispose() {} }
  withBarycentrics(twin)
  const material = seamMaterial(scene, options)
  twin.material = material
  twin.isPickable = false
  /*
  IN THE MESH'S PLACE IN EVERY SHADOW MAP. The mesh is hidden, so it stops
  casting; the twin casts wherever the mesh did and receives as it did, and
  dispose() hands both back.
  */
  twin.receiveShadows = mesh.receiveShadows
  const casts: BABYLON.ShadowGenerator[] = []
  for (const light of scene.lights) {
    const gen = light.getShadowGenerator() as BABYLON.ShadowGenerator | null
    if (gen?.getShadowMap()?.renderList?.includes(mesh)) {
      gen.addShadowCaster(twin, false)
      casts.push(gen)
    }
  }
  const shown = mesh.isVisible
  mesh.isVisible = false
  return {
    /** The twin drawn in its place (casting wherever the mesh did). */
    mesh: twin,
    dispose() {
      for (const gen of casts) gen.removeShadowCaster(twin, false)
      twin.dispose()
      material.dispose()
      mesh.isVisible = shown
    },
  }
}

export interface InspectStageOptions {
  /** The floor's width and depth, in metres (default 12). */
  size?: number
  /** The floor's colour (default a light neutral grey). */
  floor?: string
  /** `false`: no key light (the scene has a sun of its own). */
  light?: boolean
}

export interface InspectStage {
  ground: BABYLON.Mesh
  light: BABYLON.DirectionalLight | null
  dispose(): void
}

/**
 * A neutral floor to look at a model on: light grey, ruled every metre and
 * faintly every quarter, with a key light from above and in front. The floor
 * receives shadows: for them, give the scene a sun (`<tosi-b3d-sun>`) and
 * pass `light: false` so there is one key light, not two.
 */
export function inspectStage(
  scene: BABYLON.Scene,
  options: InspectStageOptions = {}
): InspectStage {
  const size = options.size ?? 12
  const ground = BABYLON.MeshBuilder.CreateGround(
    'inspect-floor',
    { width: size, height: size },
    scene
  )
  ground.position.y = -0.01
  ground.receiveShadows = true
  const px = 256
  const tex = new BABYLON.DynamicTexture(
    'inspect-floor-grid',
    { width: px, height: px },
    scene,
    true,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE
  )
  tex.anisotropicFilteringLevel = 8
  // A dynamic texture clamps by default, which would draw one tile.
  tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
  tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
  tex.uScale = tex.vScale = size
  const ctx = tex.getContext() as CanvasRenderingContext2D
  const fill = BABYLON.Color3.FromHexString(options.floor ?? '#c4c6c9')
  ctx.fillStyle = fill.toHexString()
  ctx.fillRect(0, 0, px, px)
  // Quarters faint, the metre itself firmer (on the tile's edge, so it
  // meets its neighbour's).
  ctx.fillStyle = fill.scale(0.9).toHexString()
  for (const k of [1, 2, 3]) {
    ctx.fillRect((k * px) / 4 - 1, 0, 2, px)
    ctx.fillRect(0, (k * px) / 4 - 1, px, 2)
  }
  ctx.fillStyle = fill.scale(0.78).toHexString()
  ctx.fillRect(0, 0, 3, px)
  ctx.fillRect(0, 0, px, 3)
  tex.update()
  const mat = new BABYLON.StandardMaterial('inspect-floor', scene)
  mat.diffuseTexture = tex
  mat.specularColor = BABYLON.Color3.Black()
  ground.material = mat

  let light: BABYLON.DirectionalLight | null = null
  if (options.light !== false) {
    light = new BABYLON.DirectionalLight(
      'inspect-key',
      new BABYLON.Vector3(-0.35, -1, -0.45),
      scene
    )
    light.position = new BABYLON.Vector3(4, 10, 6)
    light.intensity = 0.7
  }
  return {
    ground,
    light,
    dispose() {
      light?.dispose()
      tex.dispose()
      mat.dispose()
      ground.dispose()
    },
  }
}
