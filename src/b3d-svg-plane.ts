/*#
# b3d-svg-plane

A plane mesh textured with SVG content. Supports static SVG from a URL or
dynamic SVG from a live DOM element (updated on a timer, ideal for
tosijs-bound HUDs and instrument panels).

Pointer hits on the mesh are mapped back to synthetic `PointerEvent`s on the
source SVG element using UV coordinates, so interactive SVG UIs work in 3D/XR.

## Example — static SVG on a plane

```js
import { b3d, b3dSvgPlane, b3dLight } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 5, target: [0, 0, 0] })
    },
  },
  b3dLight({ intensity: 1 }),
  b3dSvgPlane({
    url: '/tosi-test-pattern.svg',
    width: 2,
    height: 2,
    materialChannel: 'diffuse',
  }),
)

preview.append(scene)
```

## Example — live dynamic SVG (radar display)

```js
import { b3d, b3dSvgPlane, b3dLight, SvgTexture } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { svgElements, tosi, xin } from 'tosijs'

const { svg, g, path, circle, polygon } = svgElements

// --- radar background ---
const outerRing = 'M128,8 C194.274,8,248,61.7258,248,128 C248,194.274,194.274,248,128,248 C61.7258,248,8.00001,194.274,8.00001,128 C8.00001,61.7258,61.7258,8,128,8 z'
const vLine = 'M128,53 C128,53,128,203,128,203'
const hRight = 'M203,128 C203,128,143,128,143,128'
const hLeft = 'M113,128 C113,128,53,128,53,128'
const guide = 'fill:#00a79e;fill-opacity:0.127;fill-rule:evenodd;stroke:#00a79e;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:4;'
const axis = guide + 'stroke-opacity:0.24;'

// --- blip spawning ---
let nextId = 0
const RANGE = 115

function spawnFriendly() {
  const angle = Math.random() * Math.PI * 2
  const heading = angle + Math.PI * (0.6 + Math.random() * 0.8)
  const speed = 0.2 + Math.random() * 0.3
  return {
    id: nextId++,
    x: 128 + Math.cos(angle) * 105, y: 128 + Math.sin(angle) * 105,
    dx: Math.cos(heading) * speed, dy: Math.sin(heading) * speed,
  }
}

function spawnHostile() {
  const angle = Math.random() * Math.PI * 2
  const heading = angle + Math.PI * (0.7 + Math.random() * 0.6)
  const speed = 0.5 + Math.random() * 0.6
  return {
    id: nextId++,
    x: 128 + Math.cos(angle) * 110, y: 128 + Math.sin(angle) * 110,
    dx: Math.cos(heading) * speed, dy: Math.sin(heading) * speed,
  }
}

const { friendlies, hostiles } = tosi({
  friendlies: Array.from({ length: 6 }, spawnFriendly),
  hostiles: Array.from({ length: 4 }, spawnHostile),
})

const position = (el, item) => {
  if (item) el.setAttribute('transform', `translate(${item.x},${item.y})`)
}

const friendlyLayer = g(
  g(
    circle({ r: '5', fill: 'none', stroke: '#8cc63f', 'stroke-width': '1' }),
    { bind: { value: '^', binding: position } }
  ),
  { bindList: { value: friendlies, idPath: 'id' } }
)
const hostileLayer = g(
  g(
    polygon({ points: '0,-6 5.2,3 -5.2,3', fill: 'none', stroke: '#ff1d25', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }),
    { bind: { value: '^', binding: position } }
  ),
  { bindList: { value: hostiles, idPath: 'id' } }
)

const radarSvg = svg(
  { width: '256', height: '256', viewBox: '0 0 256 256',
    style: 'position:absolute;left:-9999px' },
  g(
    path({ style: guide + 'stroke-opacity:0.5;', d: outerRing }),
    path({ style: axis, d: vLine }),
    path({ style: axis, d: hRight }),
    path({ style: axis, d: hLeft }),
  ),
  friendlyLayer,
  hostileLayer,
)
preview.append(radarSvg)

function tick(arr) {
  const kept = []
  for (const b of arr) {
    const nx = b.x + b.dx, ny = b.y + b.dy
    if (Math.sqrt((nx - 128) ** 2 + (ny - 128) ** 2) < RANGE) {
      kept.push({ ...b, x: nx, y: ny })
    }
  }
  return kept
}
// Deliberately rate-limited to ~15fps. Each tick mutates tosi bindings →
// re-renders the SVG → re-rasterizes the texture, so a fast tick is a real cost
// (especially on a textured plane in XR). 15fps is plenty for a radar.
setInterval(() => {
  const f = tick(xin.friendlies)
  if (Math.random() < 0.06) f.push(spawnFriendly())
  xin.friendlies = f

  const h = tick(xin.hostiles)
  if (Math.random() < 0.04) h.push(spawnHostile())
  xin.hostiles = h
}, 66)

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 5, target: [0, 0, 0] })

      const tex = new SvgTexture({
        scene: el.scene,
        element: radarSvg,
        resolution: 512,
        updateInterval: 66, // ~15fps — matches the sim tick; no point rendering faster
      })

      const plane = BABYLON.MeshBuilder.CreatePlane(
        'hud', { width: 2, height: 2, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, el.scene
      )
      const mat = new BABYLON.StandardMaterial('hud-mat', el.scene)
      mat.emissiveTexture = tex.texture
      mat.diffuseColor = BABYLON.Color3.Black()
      mat.disableLighting = true
      mat.opacityTexture = tex.texture
      plane.material = mat
    },
  },
  b3dLight({ intensity: 1 }),
)

preview.append(scene)
```

## Example — dynamic interactive SVG with pointer events

```js
import { b3d, b3dLight, SvgTexture } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { svgElements } from 'tosijs'

const { svg, rect, text, g } = svgElements

let count = 0
const label = text({
  x: 100, y: 70, 'text-anchor': 'middle', fill: 'white',
  'font-size': 32, 'font-family': 'sans-serif',
})
label.textContent = 'Clicks: 0'

const btnRect = rect({
  x: 25, y: 110, width: 150, height: 50, rx: 8,
  fill: '#07a',
})
const btnLabel = text({
  x: 100, y: 143, 'text-anchor': 'middle', fill: 'white',
  'font-size': 20, 'font-family': 'sans-serif',
})
btnLabel.textContent = 'Click me'
const btn = g(btnRect, btnLabel)

btn.addEventListener('pointerenter', () => { btnRect.setAttribute('fill', '#09c') })
btn.addEventListener('pointerleave', () => { btnRect.setAttribute('fill', '#07a') })
btn.addEventListener('pointerdown', () => { btnRect.setAttribute('fill', '#0bf') })
btn.addEventListener('pointerup', () => {
  btnRect.setAttribute('fill', '#09c')
  count++
  label.textContent = 'Clicks: ' + count
})

const uiSvg = svg(
  { width: 200, height: 200, viewBox: '0 0 200 200',
    style: 'position:absolute;top:8px;right:8px;z-index:1;pointer-events:auto;cursor:pointer' },
  rect({ width: 200, height: 200, rx: 12, fill: '#222' }),
  label,
  btn,
)

// Button hit rect in SVG coordinates
const BTN = { x: 25, y: 110, w: 150, h: 50 }
function inBtn(sx, sy) {
  return sx >= BTN.x && sx <= BTN.x + BTN.w && sy >= BTN.y && sy <= BTN.y + BTN.h
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 5, target: [0, 0, 0] })

      const tex = new SvgTexture({
        scene: el.scene,
        element: uiSvg,
        resolution: 512,
        updateInterval: 100,
      })

      const plane = BABYLON.MeshBuilder.CreatePlane(
        'ui', { width: 2, height: 2, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, el.scene
      )
      const mat = new BABYLON.StandardMaterial('ui-mat', el.scene)
      mat.emissiveTexture = tex.texture
      mat.opacityTexture = tex.texture
      mat.diffuseColor = BABYLON.Color3.Black()
      mat.disableLighting = true
      plane.material = mat

      el.scene.constantlyUpdateMeshUnderPointer = true
      let wasOverBtn = false
      el.scene.onPointerObservable.add((pointerInfo) => {
        const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
        if (pointerInfo.type !== POINTERDOWN &&
            pointerInfo.type !== POINTERUP &&
            pointerInfo.type !== POINTERMOVE) return
        const pick = pointerInfo.pickInfo
        if (!pick?.hit || pick.pickedMesh !== plane) {
          if (wasOverBtn) { btn.dispatchEvent(new PointerEvent('pointerleave')); wasOverBtn = false }
          return
        }
        const uv = pick.getTextureCoordinates()
        if (!uv) return

        const svgX = uv.x * 200
        const svgY = (1 - uv.y) * 200
        const over = inBtn(svgX, svgY)

        if (over && !wasOverBtn) btn.dispatchEvent(new PointerEvent('pointerenter'))
        if (!over && wasOverBtn) btn.dispatchEvent(new PointerEvent('pointerleave'))
        wasOverBtn = over

        if (!over) return
        const type = pointerInfo.type === POINTERDOWN ? 'pointerdown'
          : pointerInfo.type === POINTERUP ? 'pointerup' : 'pointermove'
        if (type !== 'pointermove') btn.dispatchEvent(new PointerEvent(type))
      })
    },
  },
  b3dLight({ intensity: 1 }),
)
scene.style.position = 'relative'
scene.append(uiSvg)

preview.append(scene)
// b3d shows an Enter-VR button automatically when an immersive-vr session is
// supported — try this same button with a controller in VR.
```

The SVG overlay is interactive in 2D (click it directly) and the same
events fire when you click the 3D plane — both update the same counter
because they share the same DOM element. The SVG doesn't need to be
visible — it can be hidden offscreen (`left:-9999px`) or even
`display:none` and the texture still renders, since `SvgTexture` clones
the element and serializes its markup independently.

## How it works

### SVG → Texture pipeline

`SvgTexture` renders SVG content onto a Babylon.js `DynamicTexture` via
an offscreen canvas:

1. **Serialize** — `XMLSerializer.serializeToString()` captures the live
   SVG DOM (including any tosijs binding changes) as an XML string.
2. **Blob URL** — the XML is wrapped in a `Blob` with type `image/svg+xml`
   and turned into an object URL.
3. **Image decode** — a reusable `Image` element loads the blob URL. On
   load, the image is drawn onto the DynamicTexture's canvas with a Y-flip
   (`ctx.translate(0, h); ctx.scale(1, -1)`) because Babylon UV origin is
   bottom-left while SVG origin is top-left.
4. **GPU upload** — `dt.update(false)` pushes the canvas pixels to the GPU.

A `_rendering` guard prevents overlapping async renders. The `Image` and
canvas are reused across frames — only the Blob is recreated each cycle
(and immediately revoked after decode).

In **static mode** (`url`), a plain `BABYLON.Texture` is used instead and
no polling occurs.

### Emissive material for self-lit displays

For HUDs and panels you typically want the texture at full brightness
regardless of scene lighting. The pattern is:

- `emissiveTexture = tex.texture` — texture drives emission
- `diffuseColor = Color3.Black()` — no diffuse contribution
- `disableLighting = true` — ignore scene lights entirely
- `opacityTexture = tex.texture` — SVG alpha channel controls transparency
  (so rounded corners, circles, etc. composite correctly over the scene)

### Pointer event pass-through

The demo above maps 3D pointer picks back to synthetic `PointerEvent`s on
the SVG DOM:

1. `scene.constantlyUpdateMeshUnderPointer = true` enables hover tracking.
2. `scene.onPointerObservable` fires on move/down/up.
3. `pickInfo.getTextureCoordinates()` gives UV (0–1) at the hit point.
4. UV is mapped to SVG coordinates: `svgX = uv.x * svgWidth`,
   `svgY = (1 - uv.y) * svgHeight` (Y flip for SVG's top-left origin).
5. A rect-hull hit test determines which SVG element is under the pointer.
6. Synthetic `PointerEvent`s (`pointerenter`, `pointerleave`, `pointerdown`,
   `pointerup`) are dispatched on the target element — the same events that
   work in a regular 2D SVG UI.

This means you can build and test SVG UIs with standard DOM event listeners
in a conventional web page, then project them onto 3D surfaces or into
XR/AR scenes — the same code works across all contexts.

The demo uses simple rect-hull hit testing for the button, which is
sufficient for rectangular controls. For finer-grained hit testing
(irregular shapes, overlapping elements), the mapped SVG coordinates
(`svgX`, `svgY`) are available — you can use them with
`document.elementFromPoint()` if the SVG is positioned in the viewport,
or implement your own shape-specific point-in-polygon tests.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width` | `1` | Plane width in scene units |
| `height` | `1` | Plane height |
| `resolution` | `512` | Texture resolution (square, px) |
| `url` | `''` | SVG URL — fetched and rendered once |
| `updateInterval` | `30` | Re-render interval in ms (dynamic mode) |
| `materialChannel` | `'emissive'` | `'emissive'` (unlit) or `'diffuse'` (lit) |
| `cameraRelative` | `false` | Parent plane to active camera (HUD mode) |
| `pointerEvents` | `'on'` | Map 3D pick hits → SVG pointer events |
| `doubleSided` | `'on'` | Render both faces |
| `cornerRadius` | `0` | Corner radius in WORLD units. `0` = a plain rectangle. Rounds the MESH, so corners cost triangles instead of alpha — see **Opaque panels** below |
| `transparent` | `'on'` | `'off'` drops the opacity texture so the plane writes depth. Pair with `cornerRadius` |
| `xrFrame` | `''` | In a headset with `cameraRelative`, parent to this XR reference frame instead of the head camera. `'body'` (torso, damped yaw) keeps a panel in front of you without jittering on every head movement; leave unset for a HUD that should stay head-locked |

## Opaque panels

`cornerRadius` + `transparent="off"` is the combination that stops panels
flickering against each other, and it is worth knowing why the two go together.

A transparent mesh is **not depth-written**, so Babylon re-sorts it every frame
by distance — and two near-coplanar panels swap order as you move, which reads
as z-fighting that no amount of nudging fixes. Rounding the corners as GEOMETRY
(three quads plus four corner fans, see [[rounded-rect]]) means the panel needs
no alpha at all, so it can be opaque, write depth, and be ordered by the
z-buffer like everything else.

`doubleSided` is honoured on the rounded path: the geometry is generated
single-sided and `backFaceCulling` follows the attribute, so `'off'` shows the
back face as it does for a plain plane.

Set the `svgElement` property to a live SVG element for dynamic mode.

## panelScene — dual-presentation in two lines

`panelScene({ svg, target })` packages the common wiring for showing ONE live
surface flat **and** on a plane: it returns a textured plane plus a
`sceneCreated` hook that adds an orbit camera and routes scene picks (mouse AND
XR controller) as uv → viewBox coords → `target.handlePointer(kind, x, y)` —
with the camera **yielding** during a press on the panel and an off-plane
release still **ending the gesture** (the capture contracts flat surfaces get
free from the DOM). The [[box]], [[surface]], [[widget-box]], [[table]] and
[[keyboard]] docs all use it for their 3D sides:

```javascript
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: mySurface })
const scene = b3d({ sceneCreated }, b3dLight({ intensity: 1 }), plane)
```
*/
/*{ "parent": "UI", "order": 510 }*/

import * as BABYLON from '@babylonjs/core'
import {
  AbstractMesh,
  isOff,
  markUiMesh,
  collidable,
  sceneDelta,
} from './b3d-utils'
import {
  gazeOffAxisDeg,
  gazeStep,
  newGazeState,
  bestCandidate,
  placementDistance,
  facingYawDeg,
  easeTo,
} from './dialog-placement'
import { roundedRectGeometry } from './rounded-rect'

/** The pointerId carried by pick-forwarded events — see the note at the dispatch. */
const SYNTHETIC_POINTER_ID = 0x53b3
import { SvgTexture } from './svg-texture'
import type { B3d } from './tosi-b3d'

export class B3dSvgPlane extends AbstractMesh {
  static styleSpec = { ':host': { display: 'none' } }

  static initAttributes = {
    /** Cast shadows onto the scene. Off by default — see `_meshName`. */
    castShadow: false,
    /**
     * Take the world's shading. Off by default, so a panel reads the same
     * whatever passes in front of the sun.
     *
     * Turn it on for UI that genuinely IS in the world — a cockpit instrument
     * surface lit by the same sun as the dashboard around it.
     */
    receiveShadows: false,
    ...AbstractMesh.initAttributes,
    width: 1,
    height: 1,
    resolution: 512,
    url: '',
    updateInterval: 30,
    materialChannel: 'emissive',
    cameraRelative: false,
    /**
     * `'world'` places this panel at a real spot with clear line of sight and
     * lets it FOLLOW you — if it has been out of view for a couple of seconds
     * it eases to a fresh spot in front of you (see [[dialog-placement]]).
     *
     * The right mode for a MODAL: depth is XR's window frame, so a dialog that
     * composites over the world paints in front and cannot be touched, while a
     * head-locked one chases your eyes and can never be looked away from.
     * Requires `cameraRelative` (it is a placement strategy, not a parenting
     * one). `'camera'` (default) keeps the existing behaviour.
     */
    placement: 'camera' as 'camera' | 'world',
    /**
     * When `cameraRelative` AND in a headset, parent to this XR reference frame
     * instead of the head camera. `'body'` (torso, damped yaw) keeps a panel in
     * front of you WITHOUT jittering on every head movement — right for a menu
     * you read, wrong for a HUD (leave it '' so a HUD stays head-locked). Flat,
     * or with no frame set, `cameraRelative` behaves exactly as before.
     */
    xrFrame: '',
    pointerEvents: 'on' as 'on' | 'off',
    doubleSided: 'on' as 'on' | 'off',
    /**
     * Corner radius in world units. `0` = a plain rectangle.
     *
     * Rounds the MESH, so the corners cost triangles instead of alpha. Pair it
     * with `transparent="off"` and the panel is opaque, which is the point: an
     * opaque mesh writes depth and is sorted by the z-buffer, where a
     * transparent one is re-sorted per frame by distance and flickers between
     * near-coplanar panels. See `rounded-rect`.
     */
    cornerRadius: 0,
    /**
     * Whether the SVG's alpha drives the mesh's opacity. `'on'` (default,
     * unchanged) is what a panel with rounded corners drawn IN the SVG needs.
     * `'off'` makes the panel opaque — use it with `cornerRadius`.
     */
    transparent: 'on' as 'on' | 'off',
  }

  declare width: number
  declare height: number
  declare resolution: number
  declare url: string
  declare updateInterval: number
  declare materialChannel: string
  declare cameraRelative: boolean
  declare placement: 'camera' | 'world'
  declare xrFrame: string
  declare pointerEvents: 'on' | 'off'
  declare doubleSided: 'on' | 'off'
  declare cornerRadius: number
  declare transparent: 'on' | 'off'

  /** True only while WE have parented the mesh to the camera — so the
   * cameraRelative sync never clears a parent somebody else set. */
  private _camParented = false

  /** Set to a live SVG element for dynamic mode. */
  svgElement: SVGSVGElement | null = null

  private _svgTexture: SvgTexture | null = null
  private _material: BABYLON.StandardMaterial | null = null
  private _pointerObserver: BABYLON.Nullable<
    BABYLON.Observer<BABYLON.PointerInfo>
  > = null
  // Press state for the coordinate-based (panel3d) routing path.
  private _pressing = false
  private _lastSvgX = 0
  private _lastSvgY = 0

  /**
   * WORLD-PLACED MODAL, with gaze recovery — the `placement="world"` strategy.
   *
   * The panel is NOT parented: it sits at a real point, so it occludes and is
   * occluded like anything else and stacks with other UI by ordinary depth.
   * It is placed where there is clear line of sight, faces the viewer, and if
   * you look away for a couple of seconds it eases to a fresh spot in front of
   * you — findability without the panel chasing your eyes.
   *
   * The rules live in [[dialog-placement]] (pure, tested); this is the Babylon
   * plumbing: cast the candidate rays, move the mesh, aim it.
   */
  private _gaze = newGazeState()
  private _dialogObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _dialogTarget: BABYLON.Vector3 | null = null
  private _offOrigin: (() => void) | null = null

  private _installWorldDialog(scene: BABYLON.Scene): void {
    /*
    A WORLD-PLACED PANEL HOLDS A WORLD POSITION, SO IT HAS TO OPT IN.

    Terrain rebases the world (B3d.shiftOrigin) and moves only what registered.
    This panel keeps its position on the ELEMENT (`x`/`y`/`z` — the #35 rule) and
    its destination in `_dialogTarget`, both in JS, both world coordinates. A
    rebase during a paused or dying scene therefore slid the dialog away by the
    shift, in the one kind of scene big enough to need rebasing.

    A LISTENER, not `registerWorldRoot`: the element owns the transform and
    rewrites the mesh from it every render, so shifting the node would be undone
    a frame later. Fix the numbers the element is written FROM.

    Gaze recovery would eventually drag it back, which is precisely what makes
    this worth fixing rather than tolerating: the symptom is a dialog that
    wanders and then returns, and "it sort of fixes itself" is how a bug avoids
    being reported.
    */
    const owner = this.owner
    if (owner != null) {
      const onShift = (dx: number, dz: number) => {
        const self = this as any
        self.x += dx
        self.z += dz
        if (this.mesh != null) {
          this.mesh.position.x += dx
          this.mesh.position.z += dz
        }
        if (this._dialogTarget != null) {
          this._dialogTarget.x += dx
          this._dialogTarget.z += dz
        }
      }
      owner.addOriginListener(onShift)
      this._offOrigin = () => owner.removeOriginListener(onShift)
    }

    // Straight ahead first, then progressively further off-axis: bestCandidate
    // breaks ties toward EARLIER entries, so this order IS the preference.
    const YAW_CANDIDATES = [0, -20, 20, -40, 40, -70, 70, 180]
    const desired = (this as any).z || 2
    const place = (cam: BABYLON.Camera, immediate: boolean) => {
      const eye = cam.globalPosition
      const fwd = cam.getDirection(BABYLON.Vector3.Forward())
      const clearances: number[] = []
      const dirs: BABYLON.Vector3[] = []
      for (const yawDeg of YAW_CANDIDATES) {
        const q = BABYLON.Quaternion.RotationAxis(
          BABYLON.Vector3.Up(),
          (yawDeg * Math.PI) / 180
        )
        const dir = BABYLON.Vector3.Zero()
        fwd.rotateByQuaternionToRef(q, dir)
        dir.normalize()
        dirs.push(dir)
        const hit = scene.pickWithRay(
          new BABYLON.Ray(eye, dir, desired + 1),
          // UI never blocks UI — a dialog must not hide behind another panel.
          collidable()
        )
        clearances.push(hit?.hit ? hit.distance : Infinity)
      }
      // `desired` matters: it makes this "the least deviation with room" rather
      // than "the most room", so a follow camera's own subject stops pushing
      // every dialog off-axis. See bestCandidate.
      const i = bestCandidate(clearances, 0.7, desired)
      // Nowhere is clear (boxed in): take straight ahead at the floor distance
      // rather than refusing to show a modal at all.
      const dir = dirs[i >= 0 ? i : 0]
      const dist = placementDistance(
        i >= 0 ? clearances[i] : 0,
        desired,
        0.6,
        0.25
      )
      const target = eye.add(dir.scale(dist))
      this._dialogTarget = target
      if (immediate && this.mesh) {
        // The ELEMENT owns the transform (see the note below) — setting only
        // the mesh here would be undone by the next render, which is exactly
        // how #35 pinned every dialog at the world origin.
        const self = this as any
        self.x = target.x
        self.y = target.y
        self.z = target.z
        this.mesh.position.copyFrom(target)
      }
    }

    this._dialogObs = scene.onBeforeRenderObservable.add(() => {
      const mesh = this.mesh
      const cam = scene.activeCamera
      if (mesh == null || cam == null) return
      // World space: never parented, so nothing inherits a head transform.
      if (mesh.parent != null) {
        mesh.parent = null
        this._camParented = false
      }
      if (this._dialogTarget == null) place(cam, true)

      const dt = sceneDelta(scene)
      const off = gazeOffAxisDeg(
        cam.globalPosition,
        cam.getDirection(BABYLON.Vector3.Forward()),
        mesh.position
      )
      const stepped = gazeStep(this._gaze, off, dt)
      this._gaze = stepped.state
      if (stepped.recover) place(cam, false)

      const t = this._dialogTarget
      if (t != null) {
        /*
        WRITE THE ELEMENT, NOT THE MESH.

        `AbstractMesh.render()` rewrites `mesh.position` from this element's
        `x`/`y`/`z` — and `rotationQuaternion` from `yaw`/`pitch`/`roll` — so
        anything that moves the MESH is silently undone on the next render. The
        first version of this did exactly that and pinned every dialog at the
        world origin: the camera-local offset (0, 0, 2.2) was left behind as a
        WORLD position and put straight back every frame, so pause and respawn
        panels were unreachable in any scene not centred on (0,0,0)
        (manta-recon #35, measured at 1061 m away in one case).

        tosijs-3d-ensemble had already written this rule down for the gizmo they
        need — "a drag behaviour that moves the MESH is silently undone next
        frame; a gizmo's writes must land on the ELEMENT" — and I hit it anyway
        an hour later. The element owns the transform. Write the element.
        */
        const next = easeTo(mesh.position, t, dt)
        const self = this as any
        self.x = next.x
        self.y = next.y
        self.z = next.z
        // Also apply immediately, so the panel is correct on the frame it is
        // placed rather than after the next render.
        mesh.position.set(next.x, next.y, next.z)

        // Face the viewer — as YAW on the element, for the same reason.
        // Rotating the mesh would be undone by the same render.
        //
        // `facingYawDeg` and not `atan2(dx, dz)`: a plane's visible face is
        // local -Z, so the obvious version turns the panel's BACK to you, and a
        // double-sided back reuses the front's UVs — the dialog rendered
        // MIRRORED rather than vanishing, which is how it survived a release.
        const eye = cam.globalPosition
        if (Math.hypot(eye.x - next.x, eye.z - next.z) > 1e-4) {
          self.yaw = facingYawDeg(next, eye)
        }
      }
    })
  }

  /** Nominal camera-local Z (the author's `z`), before any occlusion pull-in. */
  private _nominalZ = 0
  private _depthObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null

  /**
   * Keep a camera-relative panel in FRONT of whatever is between you and it —
   * see the note at the call site. Apparent size is preserved by scaling with
   * the distance, so the panel reads identically whether it sits at its nominal
   * depth or has been pulled in to clear a hillside.
   */
  private _installDepthGuard(scene: BABYLON.Scene): void {
    const MIN_Z = 0.45 // closer than this is uncomfortable in a headset
    const MARGIN = 0.12 // sit just inside the occluder, not coplanar with it
    this._nominalZ = (this as any).z || 1
    this._depthObs = scene.onBeforeRenderObservable.add(() => {
      const mesh = this.mesh
      const cam = scene.activeCamera
      if (mesh == null || cam == null || mesh.parent == null) return
      const nominal = this._nominalZ
      if (nominal <= 0) return
      mesh.computeWorldMatrix(true)
      const from = cam.globalPosition
      const dir = mesh.getAbsolutePosition().subtract(from)
      const dist = dir.length()
      let z = nominal
      if (dist > 1e-3) {
        dir.normalize()
        const ray = new BABYLON.Ray(from, dir, dist)
        // Ignore UI (this panel and its siblings) — only WORLD geometry should
        // push a dialog forward. Same exclusion the collision probes use.
        const hit = scene.pickWithRay(ray, (m) => collidable()(m))
        if (hit?.hit && hit.distance < nominal) {
          z = Math.max(MIN_Z, hit.distance - MARGIN)
        }
      }
      const k = z / nominal
      mesh.position.z = z
      mesh.scaling.setAll(k)

      /*
      EYE HEIGHT when riding a FRAME, floor when riding the camera.

      `body` is a torso/locomotion anchor and sits at floor level by design
      (`body.position.set(cam.x, 0, cam.z)`), so a dialog at `y: 0` hangs around
      your knees and reads as waist height once it has any height to it — "the
      respawn pin is a bit low… face height (just not pinned to face) would work
      better" (Tonio). Parented to the CAMERA instead, `y: 0` means eye-centred
      and is already right, which is why the offset cannot just be baked into
      the attribute.

      Not scaled with `k`: pulling the panel closer must not drop it down your
      body. Height is an absolute comfort property, unlike apparent size.
      */
      const parentIsFrame = mesh.parent !== cam
      mesh.position.y = parentIsFrame
        ? ((this as any).y || 0) + (cam.position?.y ?? 1.6)
        : (this as any).y || 0
    })
  }

  content = () => ''

  /**
   * The mesh name, which is how a panel opts into the world's lighting.
   *
   * **By default a panel neither casts nor receives.** Both fell out of
   * `register()` rather than from a decision: registering is the shadow-caster
   * contract AND makes `b3d-shadows` set `receiveShadows`, so a panel joined
   * the lighting merely by existing — throwing a hard-edged rectangle across
   * whatever it faced, and picking up shadows from scenery in front of it.
   *
   * Tonio's framing, which is the right one: *"by default the UI should live
   * outside the world."* A HUD or an inspector is something you look THROUGH
   * the world at. Shading it as though it were furniture makes it ambiguous
   * whether it is IN the scene — and worse, unreadable exactly when something
   * passes between it and the sun.
   *
   * Casting is also the worst case for the shadow map: a large flat quad which,
   * camera-relative, sits permanently inside `activeDistance` and never culls.
   *
   * The two are separate because the cases are. A **cockpit instrument
   * surface** genuinely is in the world and should receive — it is lit by the
   * same sun as the dashboard around it — while still not needing to cast. A
   * sign on a wall or a screen in a room wants both.
   */
  private _meshName(): string {
    const attrs = this as any
    let name = 'svg-plane'
    if (attrs.castShadow !== true) name += '_nocast'
    if (attrs.receiveShadows !== true) name += '_noshadow'
    return name
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any

    if (attrs.cornerRadius > 0) {
      // Rounded corners as GEOMETRY. Same frame and UV mapping as CreatePlane,
      // so this is a drop-in swap — the texture lands identically.
      const g = roundedRectGeometry({
        width: attrs.width,
        height: attrs.height,
        radius: attrs.cornerRadius,
      })
      const mesh = new BABYLON.Mesh(this._meshName(), scene)
      const data = new BABYLON.VertexData()
      data.positions = g.positions
      data.indices = g.indices
      data.uvs = g.uvs
      data.normals = g.normals
      data.applyToMesh(mesh)
      this.mesh = mesh
    } else {
      this.mesh = BABYLON.MeshBuilder.CreatePlane(
        this._meshName(),
        {
          width: attrs.width,
          height: attrs.height,
          sideOrientation: isOff(attrs.doubleSided)
            ? BABYLON.Mesh.FRONTSIDE
            : BABYLON.Mesh.DOUBLESIDE,
        },
        scene
      )
    }

    // A UI plane is pointer-pickable but must be invisible to COLLISION — an
    // aircraft's impact sweep crashed on a panel floating in front of the
    // cockpit. See `markUiMesh`.
    markUiMesh(this.mesh)

    /*
    A CAMERA-RELATIVE PANEL MUST NOT BE BURIED — AND MUST STAY TOUCHABLE.

    These are dialogs (respawn, pause) and terrain could swallow them: you die
    on a hillside and the panel offering you a way out is inside the hill.

    The first attempt set `renderingGroupId = 1`, which draws after the scene
    with depth cleared between groups. It fixed the LOOK and nothing else:
    rendering group has no bearing on PICKING, so the panel stayed
    geometrically behind the hill, every XR ray hit the hill first, and the
    dialog became visible-but-dead — strictly worse than being honestly buried,
    because it now invites a press that cannot land (Tonio: "dialogs now paint
    in front but you can't interact with them").

    So put it genuinely in front, which is what Tonio proposed originally:
    measure what is between you and the panel, and pull the panel just inside
    it, scaling to hold the apparent size. Then what you see IS what you can
    touch — one invariant instead of two that can disagree.

    Clamped to MIN_Z so a wall in your face cannot shove a panel to your nose
    (uncomfortable in VR, which is why "just use the near clip plane" was the
    wrong version of this idea).

    ⚠️ THIS IS PER-PANEL, AND THAT DOES NOT GENERALISE TO STACKED UI.

    Each panel currently races forward on its own. With ONE dialog up — which is
    every case today — that is correct. With several, they would all clamp to
    the same `hit.distance - MARGIN` and fight, and the pull-forward would have
    destroyed exactly the relative ordering it was supposed to preserve (Tonio:
    "we may need to push stuff backwards vs. forwards").

    The generalisation is a reserved DEPTH BAND, owned by the scene rather than
    the panel: measure the nearest occluder ONCE per frame, seat the front-most
    element just inside it, and stack everything else BACKWARDS from there in
    `DEPTH_STEP` increments — the same ordering `popup-surface` already does with
    `stackLift`, but with a moving front edge. Do that before a second
    camera-relative panel can be open at once. Filed in TODO.
    */
    if (attrs.cameraRelative) {
      if (attrs.placement === 'world') this._installWorldDialog(scene)
      else this._installDepthGuard(scene)
    }

    this._svgTexture = new SvgTexture({
      scene,
      resolution: attrs.resolution,
      url: attrs.url || undefined,
      element: this.svgElement || undefined,
      updateInterval: attrs.updateInterval,
    })

    const mat = new BABYLON.StandardMaterial('svg-plane-mat', scene)
    mat.backFaceCulling = isOff(attrs.doubleSided)
    this._material = mat
    this._applyChannel(mat, attrs.materialChannel, isOff(attrs.transparent))
    this.mesh.material = mat

    if (attrs.cameraRelative && scene.activeCamera) {
      this.mesh.parent = scene.activeCamera
    }

    if (!isOff(attrs.pointerEvents) && this.svgElement) {
      this._attachPointerObserver(scene)
    }

    owner.register({ meshes: [this.mesh] })
  }

  sceneDispose() {
    this._offOrigin?.()
    this._offOrigin = null
    if (this._dialogObs && this.owner) {
      this.owner.scene.onBeforeRenderObservable.remove(this._dialogObs)
      this._dialogObs = null
    }
    if (this._depthObs && this.owner) {
      this.owner.scene.onBeforeRenderObservable.remove(this._depthObs)
      this._depthObs = null
    }
    if (this._pointerObserver && this.owner) {
      this.owner.scene.onPointerObservable.remove(this._pointerObserver)
      this._pointerObserver = null
    }
    this._svgTexture?.dispose()
    this._svgTexture = null
    this._material?.dispose()
    this._material = null
    super.sceneDispose()
  }

  render() {
    super.render()
    if (!this.mesh || !this._material) return
    const attrs = this as any

    if (attrs.cameraRelative) {
      // In a headset, an opt-in frame (e.g. 'body') is parented instead of the
      // head camera, so a read-it panel doesn't jitter with every head turn. No
      // frame, or flat, falls through to the active (head/orbit) camera — the
      // original behaviour. HUDs leave xrFrame unset and stay head-locked.
      const frames = (this.owner as any)?.xrFrames
      const frameNode =
        attrs.xrFrame && frames ? frames.get(attrs.xrFrame) : null
      const target = frameNode ?? this.owner?.scene?.activeCamera ?? null
      if (target && this.mesh.parent !== target) {
        this.mesh.parent = target
        this._camParented = true
      }
    } else if (this._camParented && this.mesh.parent) {
      /*
      Only clear a parent WE set.

      This used to null the parent unconditionally whenever `cameraRelative` was
      off — asserting ownership over a field it never took, on every render. Any
      caller that parented the plane to something (a popup pinned to its opener,
      a panel riding a vehicle) had it silently torn off again a frame later,
      with no error and no clue. Exactly the shape of the pause bug that
      re-attached cameras it had never detached: the guard has to record what we
      actually did, not what state the object happens to be in.
      */
      this.mesh.parent = null
      this._camParented = false
    }
  }

  /** Get the SvgTexture instance for programmatic access. */
  get svgTexture(): SvgTexture | null {
    return this._svgTexture
  }

  private _applyChannel(
    mat: BABYLON.StandardMaterial,
    channel: string,
    opaque = false
  ) {
    if (!this._svgTexture) return
    const tex = this._svgTexture.texture
    /*
    The texture's alpha drives the PLANE's alpha, so a transparent svg region
    reads as transparent on the mesh rather than as an opaque substrate.

    That is right for a panel whose corners are drawn IN the svg — and it is
    also what put every panel outside the depth buffer. Babylon does not
    depth-write transparent meshes; it sorts them per frame by distance to
    camera, so two panels a centimetre apart swap order as you orbit. It looks
    exactly like z-fighting and isn't: the depth ORDER is fine, the compositing
    order is what moves. `transparent="off"` (with `cornerRadius` for the
    silhouette) opts out and puts the panel back under the z-buffer.
    */
    if (!opaque) mat.opacityTexture = tex
    else mat.opacityTexture = null
    if (channel === 'emissive') {
      mat.emissiveTexture = tex
      mat.diffuseColor = BABYLON.Color3.Black()
      mat.disableLighting = true
    } else {
      mat.diffuseTexture = tex
      mat.emissiveTexture = null
      mat.disableLighting = false
    }
  }

  private _attachPointerObserver(scene: BABYLON.Scene) {
    // Keep pickInfo populated for move (and reliably for down/up).
    scene.constantlyUpdateMeshUnderPointer = true
    const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
    this._pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      const kind =
        pointerInfo.type === POINTERDOWN
          ? 'down'
          : pointerInfo.type === POINTERUP
          ? 'up'
          : pointerInfo.type === POINTERMOVE
          ? 'move'
          : ''
      if (!kind) return

      const svgEl = this.svgElement as unknown as {
        handlePointer?: (k: string, x: number, y: number) => void
        viewBox?: { baseVal?: { width: number; height: number } }
      } | null
      const handle =
        svgEl && typeof svgEl.handlePointer === 'function'
          ? svgEl.handlePointer
          : null

      const pick = pointerInfo.pickInfo
      const onPlane = !!pick?.hit && pick.pickedMesh === this.mesh
      const uvs = onPlane && pick ? pick.getTextureCoordinates() : null

      // Coordinate-based path (a panel3d exposes `handlePointer`): map the pick's
      // UV to the SVG's viewBox coords and let the panel hit-test/capture itself.
      // This is fed by mouse/touch AND XR controllers via the scene observable,
      // so the same panel is interactive as a DOM overlay, on a flat canvas, and
      // in immersive VR — no DOM events, no elementFromPoint.
      if (handle) {
        if (uvs && svgEl) {
          const vb = svgEl.viewBox?.baseVal
          this._lastSvgX = uvs.x * (vb?.width || this.resolution)
          this._lastSvgY = (1 - uvs.y) * (vb?.height || this.resolution)
        }
        if (kind === 'down') {
          if (!uvs) return
          this._pressing = true
          handle('down', this._lastSvgX, this._lastSvgY)
        } else if (kind === 'move') {
          if (this._pressing) handle('move', this._lastSvgX, this._lastSvgY)
        } else {
          if (this._pressing) handle('up', this._lastSvgX, this._lastSvgY)
          this._pressing = false
        }
        return
      }

      // Fallback: legacy elementFromPoint synthetic dispatch (non-panel SVG).
      if (!uvs) return
      this._dispatchSyntheticEvent(pointerInfo, uvs)
    })
  }

  private _dispatchSyntheticEvent(
    pointerInfo: BABYLON.PointerInfo,
    uvs: BABYLON.Vector2
  ) {
    const svgEl = this.svgElement
    if (!svgEl) return

    // Map UV to SVG coordinates. Babylon UV origin is bottom-left,
    // SVG origin is top-left, so flip Y.
    const vb = svgEl.viewBox?.baseVal
    const svgW = vb?.width || svgEl.clientWidth || this.resolution
    const svgH = vb?.height || svgEl.clientHeight || this.resolution

    const svgX = uvs.x * svgW
    const svgY = (1 - uvs.y) * svgH

    // Convert SVG coords to viewport coords for elementFromPoint
    const rect = svgEl.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const clientX = rect.left + svgX * (rect.width / svgW)
    const clientY = rect.top + svgY * (rect.height / svgH)

    const { POINTERDOWN, POINTERUP } = BABYLON.PointerEventTypes
    const type =
      pointerInfo.type === POINTERDOWN
        ? 'pointerdown'
        : pointerInfo.type === POINTERUP
        ? 'pointerup'
        : 'pointermove'

    const nativeEvt = pointerInfo.event as PointerEvent
    const target = document.elementFromPoint(clientX, clientY) ?? svgEl

    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        /*
        A SYNTHETIC id, deliberately NOT the physical pointer's. Forwarding the
        real id let any listener's `setPointerCapture(e.pointerId)` capture the
        PHYSICAL mouse/ray to the SVG — after which the browser rerouted every
        real move/up away from the canvas, Babylon saw downs with no ups, and
        the whole pointer pipeline wedged (the lost-pointerup saga: stuck keys,
        stale picks one click behind, first-click-dead). A capture on this id
        throws NotFoundError instead — loud, and it can't steal the real stream.
        */
        pointerId: SYNTHETIC_POINTER_ID,
        pointerType: (nativeEvt as any).pointerType ?? 'mouse',
        buttons: nativeEvt.buttons,
      })
    )
  }
}

export const b3dSvgPlane = B3dSvgPlane.elementCreator({
  tag: 'tosi-b3d-svg-plane',
})

/**
 * The common **dual-presentation wiring, packaged**: a plane textured from a
 * live `svg` plus a `sceneCreated` hook that sets up an orbit camera and routes
 * scene picks — mouse AND XR-controller — as uv → viewBox coords →
 * `target.handlePointer(kind, x, y)`.
 *
 * **One consistent gesture contract, every demo** (this used to be bespoke
 * per demo, so lessons didn't transfer):
 *
 * - A down on the plane that the UI **claims** (the `claim` predicate; default:
 *   every panel press) detaches the orbit camera — a press on UI is a gesture,
 *   not an orbit. Dragging the background always orbits.
 * - A claimed gesture's moves and release are collected on an invisible
 *   **catcher quad** via the event's **pick ray** — NOT the visual mesh and NOT
 *   `scene.pointerX/pointerY`. The visual mesh may move or rescale under the
 *   pointer (a resize grip!), and a gesture must never sample the thing it is
 *   changing; screen coordinates don't exist meaningfully for an XR controller
 *   ray, which is exactly why bespoke screen-coordinate code worked flat and
 *   died in the headset. Coordinates map through the plane's world matrix
 *   **captured at the down**, so the whole gesture shares one stable frame.
 * - A release off the plane still ends the gesture (`leave`) — the capture
 *   contract flat surfaces get free from `setPointerCapture`.
 *
 * ```js
 * const { plane, sceneCreated } = panelScene({ svg: svgEl, target: mySurface })
 * const scene = b3d({ sceneCreated }, b3dLight({ intensity: 1 }), plane)
 * ```
 *
 * The svg's viewBox is re-read per event, so an svg that resizes (hugging its
 * content) keeps mapping correctly.
 */
// ---------------------------------------------------------------------------
// The panelScene gesture contract, as PURE data-in/actions-out functions — the
// review found the release's headline interaction feature shipped with zero
// coverage, and the fix is this repo's standard move: isolate the computation
// (mapping math + the claim/route/begin/end policy) from Babylon so it can be
// pinned by unit tests, and keep the scene shell thin.
// ---------------------------------------------------------------------------

/** uv (Babylon, origin bottom-left) → viewBox coords (origin top-left). */
export function uvToViewBox(
  uv: { x: number; y: number },
  vbW: number,
  vbH: number
): { x: number; y: number } {
  return { x: uv.x * vbW, y: (1 - uv.y) * vbH }
}

/**
 * A point in the GESTURE-START plane frame (world point already transformed by
 * the frozen inverse world matrix) → viewBox coords. The plane is `planeW` ×
 * `planeH` world units centred on its origin; viewBox y grows downward.
 */
export function planeLocalToViewBox(
  local: { x: number; y: number },
  planeW: number,
  planeH: number,
  vbW: number,
  vbH: number
): { x: number; y: number } {
  return {
    x: (local.x / planeW + 0.5) * vbW,
    y: (0.5 - local.y / planeH) * vbH,
  }
}

/** One pointer event, reduced to what the gesture policy needs. */
export interface PanelGestureEvent {
  kind: 'down' | 'move' | 'up'
  /** The pick landed on the panel plane (with `x`/`y` in viewBox coords). */
  onPlane: boolean
  x?: number
  y?: number
  /** While a gesture is ACTIVE: the ray∩catcher point in gesture-start viewBox
   * coords, or null if the ray missed the catcher entirely. */
  catcher?: { x: number; y: number } | null
  /** For a down on the plane: does the claim policy take it? */
  claims?: boolean
}

export type PanelGestureAction =
  | {
      do: 'route'
      kind: 'down' | 'move' | 'up' | 'leave'
      x: number
      y: number
    }
  | { do: 'begin' } // freeze the frame, enable the catcher, camera yields
  | { do: 'end' } // catcher off, camera resumes

/**
 * The gesture policy, pure: `active` is the only state; the shell executes the
 * returned actions in order. Pinned behaviours (each burned us on device):
 * routed moves/ups ride the catcher (never the live mesh, never screen
 * coordinates); an up that missed the catcher still ends the gesture with
 * `leave`; an unclaimed press routes but never yields the camera; a move
 * off-plane with no gesture is a hover `leave`.
 */
export function panelGesture(
  active: boolean,
  ev: PanelGestureEvent
): { active: boolean; actions: PanelGestureAction[] } {
  const actions: PanelGestureAction[] = []
  if (active && (ev.kind === 'move' || ev.kind === 'up')) {
    if (ev.catcher) {
      actions.push({
        do: 'route',
        kind: ev.kind,
        x: ev.catcher.x,
        y: ev.catcher.y,
      })
    } else if (ev.kind === 'up') {
      actions.push({ do: 'route', kind: 'leave', x: 0, y: 0 })
    }
    if (ev.kind === 'up') {
      actions.push({ do: 'end' })
      return { active: false, actions }
    }
    return { active: true, actions }
  }
  if (ev.onPlane) {
    if (ev.kind === 'down' && ev.claims) {
      actions.push({ do: 'begin' })
      actions.push({ do: 'route', kind: 'down', x: ev.x!, y: ev.y! })
      return { active: true, actions }
    }
    actions.push({ do: 'route', kind: ev.kind, x: ev.x!, y: ev.y! })
    return { active, actions }
  }
  if (ev.kind === 'move')
    actions.push({ do: 'route', kind: 'leave', x: 0, y: 0 })
  return { active, actions }
}

export interface PanelSceneOptions {
  /** The live svg shown flat — the SAME element becomes the plane's texture. */
  svg: SVGSVGElement
  /** Where events land: a `surface`, `box`, or anything with `handlePointer`. */
  target: {
    handlePointer: (
      kind: 'down' | 'move' | 'up' | 'leave',
      x: number,
      y: number
    ) => void
    /** If present (box/surface have it), the DEFAULT claim policy asks it. */
    interactiveAt?: (x: number, y: number) => boolean
  }
  /**
   * Given viewBox coords of a down on the plane: does the UI claim the gesture
   * (camera yields, moves ride the catcher)? Default: ask the target's
   * `interactiveAt` — a press on a button/panel claims, a press on static
   * prose orbits — falling back to claim-everything for targets without it.
   * A resize grip passes its own hit-test here instead.
   */
  claim?: (x: number, y: number) => boolean
  /** World width of the plane; height follows the svg's aspect. Default 2.4. */
  width?: number
  /** Texture resolution. Default 640. */
  resolution?: number
  /**
   * Ms between texture re-render checks (each is a clone + serialize, with the
   * rasterize skipped when nothing changed). Default 30 — interaction-crisp;
   * pass slower for panels that mostly sit still.
   */
  updateInterval?: number
  /** Orbit camera placement overrides. */
  camera?: { alpha?: number; beta?: number; radius?: number }
}

export function panelScene(opts: PanelSceneOptions): {
  plane: B3dSvgPlane
  sceneCreated: (el: B3d) => void
} {
  const width = opts.width ?? 2.4
  const vb0 = opts.svg.viewBox?.baseVal
  const aspect = vb0 && vb0.width > 0 ? vb0.height / vb0.width : 1
  const planeH = width * aspect
  const plane = b3dSvgPlane({
    width,
    height: planeH,
    resolution: opts.resolution ?? 640,
    updateInterval: opts.updateInterval ?? 30,
    materialChannel: 'emissive',
    pointerEvents: 'off',
  }) as B3dSvgPlane
  plane.svgElement = opts.svg

  const viewBox = (): { w: number; h: number } => {
    const vb = opts.svg.viewBox?.baseVal
    return {
      w: vb && vb.width > 0 ? vb.width : 1,
      h: vb && vb.height > 0 ? vb.height : 1,
    }
  }

  const sceneCreated = (el: B3d): void => {
    /*
    THE SCENE'S LAYER: a plane of its own, z-separated from the panel.

    A popup that lives inside the panel's SVG is cropped by it — which is why a
    keyboard came out squeezed, and why it refused on a short panel. On a plane
    it is bounded by nothing and sits genuinely IN FRONT, which is what depth is
    for. Tonio: "aren't we making the keyboard a proper popup with
    z-separation?"

    Registered with `addLayerHost`, not `setLayerHost`: a panel is usually shown
    TWICE (flat and rasterised), a layer belongs to a PRESENTATION, and an
    earlier version that installed a single host moved the keyboard onto a plane
    and out of the DOM entirely. Each presentation adds its own; the popup opens
    in both.

    `el.openPopup` rather than importing `openPopup`: popup-surface already
    imports this module, so that direction would be a cycle.
    */
    const panelEl = opts.svg as unknown as {
      addLayerHost?: (fn: unknown) => () => void
    }
    const owner = el as unknown as {
      openPopup?: (o: Record<string, unknown>) => { close: () => void }
    }
    if (typeof panelEl.addLayerHost === 'function' && owner.openPopup) {
      panelEl.addLayerHost((sheet: SVGSVGElement) => {
        /*
        Place it against the panel's EDGE, from measured sizes.

        The first version used a guessed fraction of the panel height
        (`-planeH * 0.7`) and put the keyboard at y = -2.41 on a camera looking
        at y = 0 — off screen. Tonio: "the keyboard is appearing below the whole
        panel and with no content."

        Both halves are now derived: the popup's world height comes from its own
        aspect at the width we give it, and the offset is half of each plus a
        gap. Nothing to tune, and it cannot drift when a panel changes shape.
        */
        const popW = Number(sheet.getAttribute('width')) || 360
        const popH = Number(sheet.getAttribute('height')) || 200
        const worldW = width * 0.95
        const worldH = worldW * (popH / popW)
        const pop = owner.openPopup!({
          svg: sheet,
          opener: plane.mesh,
          width: worldW,
          offset: {
            /*
            Aligned to the panel's BOTTOM EDGE, overlapping upward — not pushed
            out below it.

            Placing it wholly below was geometrically right and useless: the
            panel is ~3.5 world units tall, so anything under it is outside the
            frame, and the keyboard was simply off screen. A phone does not put
            its keyboard below the app either; it lays it OVER the bottom of it,
            which is what the z-separation is for.
            */
            y: -planeH / 2 + worldH / 2,
            // NEARER the viewer — the z-separation is the point, not a nicety:
            // coplanar panels re-sort as you orbit.
            z: -0.08,
          },
        })
        return { close: () => pop.close() }
      })
    }

    const canvas = el.scene.getEngine().getRenderingCanvas()
    const cam = new BABYLON.ArcRotateCamera(
      'panel-cam',
      opts.camera?.alpha ?? -Math.PI / 2,
      opts.camera?.beta ?? Math.PI / 2.5,
      opts.camera?.radius ?? 3.2,
      BABYLON.Vector3.Zero(),
      el.scene
    )
    el.setActiveCamera(cam)
    cam.attachControl(canvas, true)
    // Arrows belong to the UI (D-pad traversal), not the orbit.
    cam.inputs.removeByType('ArcRotateCameraKeyboardMoveInput')
    el.scene.constantlyUpdateMeshUnderPointer = true

    // The catcher: co-planar with the plane, 3x its size, pickable only while
    // a gesture is live. See the doc comment for why it exists.
    const catcher = BABYLON.MeshBuilder.CreatePlane(
      'panel-catcher',
      { width: width * 3, height: planeH * 3 },
      el.scene
    )
    catcher.visibility = 0
    catcher.isPickable = false
    let gesture: { vbW: number; vbH: number; inv: BABYLON.Matrix } | null = null

    const T = BABYLON.PointerEventTypes
    const claims =
      opts.claim ?? opts.target.interactiveAt?.bind(opts.target) ?? (() => true)
    let active = false
    el.scene.onPointerObservable.add((pi) => {
      const kind =
        pi.type === T.POINTERDOWN
          ? 'down'
          : pi.type === T.POINTERUP
          ? 'up'
          : pi.type === T.POINTERMOVE
          ? 'move'
          : ''
      if (!kind) return
      const pk = pi.pickInfo

      // Assemble the pure event: pick data → viewBox coords (the policy itself
      // is panelGesture — pure and unit-tested; this shell only touches Babylon).
      const ev: PanelGestureEvent = { kind, onPlane: false }
      if (active && (kind === 'move' || kind === 'up')) {
        // Ray → catcher → the gesture-start frame. pickInfo.ray is the mouse
        // ray flat and the controller ray in XR — one code path for both.
        const ray = pk?.ray
        const hit = ray ? ray.intersectsMesh(catcher) : null
        if (hit && hit.hit && hit.pickedPoint && gesture) {
          const local = BABYLON.Vector3.TransformCoordinates(
            hit.pickedPoint,
            gesture.inv
          )
          ev.catcher = planeLocalToViewBox(
            local,
            width,
            planeH,
            gesture.vbW,
            gesture.vbH
          )
        } else {
          ev.catcher = null
        }
      } else {
        const onPlane = !!(pk && pk.hit && pk.pickedMesh === plane.mesh)
        ev.onPlane = onPlane
        if (onPlane) {
          const uv = pk!.getTextureCoordinates()
          const vb = viewBox()
          if (uv) {
            const p = uvToViewBox(uv, vb.w, vb.h)
            ev.x = p.x
            ev.y = p.y
          } else {
            ev.x = 0
            ev.y = 0
          }
        }
        if (kind === 'down' && onPlane) ev.claims = claims(ev.x!, ev.y!)
      }

      const step = panelGesture(active, ev)
      active = step.active
      for (const a of step.actions) {
        if (a.do === 'route') opts.target.handlePointer(a.kind, a.x, a.y)
        else if (a.do === 'begin') beginGesture()
        else endGesture()
      }
    })

    const endGesture = (): void => {
      gesture = null
      catcher.isPickable = false
      cam.attachControl(canvas, true)
    }
    const beginGesture = (): void => {
      const vb = viewBox()
      const mesh = plane.mesh!
      mesh.computeWorldMatrix(true)
      gesture = {
        vbW: vb.w,
        vbH: vb.h,
        inv: mesh.getWorldMatrix().clone().invert(),
      }
      // Park the catcher on the plane's CURRENT pose — the gesture samples
      // this frozen frame even if the target then moves/rescales the mesh.
      catcher.position.copyFrom(mesh.absolutePosition)
      if (mesh.rotationQuaternion)
        catcher.rotationQuaternion = mesh.rotationQuaternion.clone()
      catcher.computeWorldMatrix(true)
      catcher.isPickable = true
      cam.detachControl()
    }
  }
  return { plane, sceneCreated }
}
