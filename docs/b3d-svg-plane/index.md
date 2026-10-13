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
  { bindList: { value: friendlies, idPath: 'id', nonVirtualReason: 'a radar draws every contact, and SVG has no viewport to window against' } }
)
const hostileLayer = g(
  g(
    polygon({ points: '0,-6 5.2,3 -5.2,3', fill: 'none', stroke: '#ff1d25', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }),
    { bind: { value: '^', binding: position } }
  ),
  { bindList: { value: hostiles, idPath: 'id', nonVirtualReason: 'a radar draws every contact, and SVG has no viewport to window against' } }
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
