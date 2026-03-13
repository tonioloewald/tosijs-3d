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

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 5,
        new BABYLON.Vector3(0, 0, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 1 }),
  b3dSvgPlane({
    url: './tosi-test-pattern.svg',
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
setInterval(() => {
  const f = tick(xin.friendlies)
  if (Math.random() < 0.06) f.push(spawnFriendly())
  xin.friendlies = f

  const h = tick(xin.hostiles)
  if (Math.random() < 0.04) h.push(spawnHostile())
  xin.hostiles = h
}, 50)

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 5,
        new BABYLON.Vector3(0, 0, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      const tex = new SvgTexture({
        scene: el.scene,
        element: radarSvg,
        resolution: 512,
        updateInterval: 100,
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
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 5,
        new BABYLON.Vector3(0, 0, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

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
| `pointerEvents` | `true` | Map 3D pick hits → SVG pointer events |
| `doubleSided` | `true` | Render both faces |

Set the `svgElement` property to a live SVG element for dynamic mode.
*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh } from './b3d-utils'
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
    pointerEvents: true,
    doubleSided: true,
  }

  declare width: number
  declare height: number
  declare resolution: number
  declare url: string
  declare updateInterval: number
  declare materialChannel: string
  declare cameraRelative: boolean
  declare pointerEvents: boolean
  declare doubleSided: boolean

  /** Set to a live SVG element for dynamic mode. */
  svgElement: SVGSVGElement | null = null

  private _svgTexture: SvgTexture | null = null
  private _material: BABYLON.StandardMaterial | null = null
  private _pointerObserver: BABYLON.Nullable<
    BABYLON.Observer<BABYLON.PointerInfo>
  > = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any

    this.mesh = BABYLON.MeshBuilder.CreatePlane(
      'svg-plane',
      {
        width: attrs.width,
        height: attrs.height,
        sideOrientation: attrs.doubleSided
          ? BABYLON.Mesh.DOUBLESIDE
          : BABYLON.Mesh.FRONTSIDE,
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
    mat.backFaceCulling = !attrs.doubleSided
    this._material = mat
    this._applyChannel(mat, attrs.materialChannel)
    this.mesh.material = mat

    if (attrs.cameraRelative && scene.activeCamera) {
      this.mesh.parent = scene.activeCamera
    }

    if (attrs.pointerEvents && this.svgElement) {
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

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
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
    this._pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
      if (
        pointerInfo.type !== POINTERDOWN &&
        pointerInfo.type !== POINTERUP &&
        pointerInfo.type !== POINTERMOVE
      )
        return

      const pickResult = pointerInfo.pickInfo
      if (!pickResult?.hit || pickResult.pickedMesh !== this.mesh) return

      const uvs = pickResult.getTextureCoordinates()
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
        pointerId: (nativeEvt as any).pointerId ?? 1,
        pointerType: (nativeEvt as any).pointerType ?? 'mouse',
        buttons: nativeEvt.buttons,
      })
    )
  }
}

export const b3dSvgPlane = B3dSvgPlane.elementCreator({
  tag: 'tosi-b3d-svg-plane',
})
