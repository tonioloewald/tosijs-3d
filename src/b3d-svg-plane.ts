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
import { orbitCam } from 'demo-utils'

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
import { orbitCam } from 'demo-utils'
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
import { orbitCam } from 'demo-utils'
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

```js
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: mySurface })
const scene = b3d({ sceneCreated }, b3dLight({ intensity: 1 }), plane)
```
*/
/*{ "parent": "UI" }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'

/** The pointerId carried by pick-forwarded events — see the note at the dispatch. */
const SYNTHETIC_POINTER_ID = 0x53b3
import { SvgTexture } from './svg-texture'
import type { B3d } from './tosi-b3d'

export class B3dSvgPlane extends AbstractMesh {
  static styleSpec = { ':host': { display: 'none' } }

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    width: 1,
    height: 1,
    resolution: 512,
    url: '',
    updateInterval: 30,
    materialChannel: 'emissive',
    cameraRelative: false,
    pointerEvents: 'on' as 'on' | 'off',
    doubleSided: 'on' as 'on' | 'off',
  }

  declare width: number
  declare height: number
  declare resolution: number
  declare url: string
  declare updateInterval: number
  declare materialChannel: string
  declare cameraRelative: boolean
  declare pointerEvents: 'on' | 'off'
  declare doubleSided: 'on' | 'off'

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

  content = () => ''

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any

    this.mesh = BABYLON.MeshBuilder.CreatePlane(
      'svg-plane',
      {
        width: attrs.width,
        height: attrs.height,
        sideOrientation: isOff(attrs.doubleSided)
          ? BABYLON.Mesh.FRONTSIDE
          : BABYLON.Mesh.DOUBLESIDE,
      },
      scene
    )

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
    this._applyChannel(mat, attrs.materialChannel)
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
      const cam = this.owner?.scene?.activeCamera
      if (cam && this.mesh.parent !== cam) this.mesh.parent = cam
    } else if (this.mesh.parent) {
      this.mesh.parent = null
    }
  }

  /** Get the SvgTexture instance for programmatic access. */
  get svgTexture(): SvgTexture | null {
    return this._svgTexture
  }

  private _applyChannel(mat: BABYLON.StandardMaterial, channel: string) {
    if (!this._svgTexture) return
    const tex = this._svgTexture.texture
    // The texture's alpha drives the PLANE's alpha — a transparent svg region
    // (outside a panel's rounded corners, say) must be transparent on the mesh,
    // not an opaque black substrate that the corners are drawn over.
    mat.opacityTexture = tex
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
