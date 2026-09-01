/*#
# curve-field

**`curve3d` — an editor for a continuous `[0,1] → [0,1]`.** A `Widget3d`, so it
works as a flat DOM overlay, on an in-scene panel, and in a headset without
changing. The rules live in [[curve|curve.ts]]; this draws them and routes the
pointer.

Its reason for existing is terrain **provinces**: a province is a footprint plus
one curve per layer, so this is how you author a plateau, a crater rim or a
treeline without writing code. See `PROVINCE-DESIGN.md` → "every one of those
responses IS a curve", and the [[b3d-terrain|province editor]] demo below.

## Deleting a point is a BUTTON, not a gesture

Adding is a tap on empty space and moving is a drag, which leaves deleting with
no obvious third gesture. The usual answers all fail somewhere that matters
here: right-click does not exist on a controller, double-tap is unreliable when
the pointer is a ray from two metres away, and drag-off-the-edge collides with
the clamp that keeps the curve in range.

So the widget exposes `selected` and `deleteSelected()`, and the host puts a
button somewhere honest. A discoverable button beats a gesture you have to be
told about — which is the same argument the popup title bar makes for its grip.

## Demo — a province editor

Two curves and a terrain block. The **shape** says what height the province wants
at each distance from its centre; the **falloff** says how strongly it overrides
the terrain around it. Drag the points, or pick a preset.

```js
import { b3d, b3dLight, panel3d, label3d, button3d, curve3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div } = elements

const SIZE = 24   // metres across
const SUBS = 110  // grid resolution
const state = { height: 4, extent: 0.7 }

// A province is a footprint plus one curve per layer. SHAPE says what height it
// wants at each distance from its centre; FALLOFF says how strongly it overrides
// the terrain around it. Both are [0,1] -> [0,1] over normalised distance: 0 at
// the centre, 1 at the extent.
const shape = curve3d({ kind: 'profile', label: 'shape — height it wants', value: 'constant', aspect: 0.45 })
const falloff = curve3d({ kind: 'falloff', label: 'falloff — how much it wins', aspect: 0.45 })

let ground = null

// Base terrain, so the province has something to blend INTO — over a flat plane
// every seam hides.
const base = (x, z) =>
  Math.sin(x * 0.34) * 0.5 + Math.cos(z * 0.27) * 0.45 + Math.sin((x + z) * 0.15) * 0.35

const rebuild = () => {
  if (ground == null) return
  // Read x/z back out of the buffer and write y: order-independent, so it does
  // not matter how CreateGround laid the grid out.
  const pos = ground.getVerticesData('position')
  const reach = SIZE * 0.5 * state.extent
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2]
    const r = Math.min(1, Math.hypot(x, z) / reach)
    const w = falloff.evaluate(r)
    const want = shape.evaluate(r) * state.height
    pos[i + 1] = base(x, z) * (1 - w) + want * w
  }
  ground.updateVerticesData('position', pos)
  ground.createNormals(true)
}

shape.onChange = rebuild
falloff.onChange = rebuild

const scene = b3d(
  {
    // `flex:1` on the ELEMENT, not just its wrapper: a <tosi-b3d> in a flex row
    // has no flex-grow of its own, so it shrinks to content width — which is 0,
    // and renders a 0x296 canvas that looks exactly like a broken scene.
    style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      orbitCam(el, { radius: 30, beta: 1.05, alpha: -1.15, target: [0, 1, 0] })
      ground = el.make.ground({
        width: SIZE,
        height: SIZE,
        subdivisions: SUBS,
        updatable: true,
        color: '#6d7a58',
      })
      rebuild()
    },
  },
  b3dLight({ intensity: 0.95 })
)

const panel = panel3d(
  { width: 320 },
  label3d({ text: 'province editor', bold: true }),
  shape,
  button3d({ label: 'delete selected point', onClick: () => shape.deleteSelected() }),
  falloff,
  button3d({ label: 'delete selected point', onClick: () => falloff.deleteSelected() }),
  slider3d({ label: 'height', min: 0, max: 8, value: state.height, onChange: (v) => { state.height = v; rebuild() } }),
  slider3d({ label: 'extent', min: 0.2, max: 1, value: state.extent, onChange: (v) => { state.extent = v; rebuild() } })
)

preview.append(
  div(
    { style: 'display:flex;gap:16px;height:100%;padding:12px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'flex:0 0 320px;overflow:auto' }, panel),
    div({ style: 'flex:1;min-width:0;display:flex' }, scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```
*/
/*{ "parent": "UI", "order": 260 }*/

import { svgElements } from 'tosijs'
import {
  deletePoint,
  evaluateCurve,
  insertPoint,
  linear,
  movePoint,
  normalizeCurve,
  pointAt,
  presetsFor,
  falloffDefault,
  type ControlPoint,
  type CurveKind,
} from './curve'
import { w3dTheme } from './w3d-theme'
import type { PointerKind, Widget3d } from './widgets3d'

const { g, rect, path, circle, text } = svgElements

export interface Curve3dOptions {
  /** `profile` (both ends free) or `falloff` (pinned to 0 at x = 1). */
  kind?: CurveKind
  /** Starting points, or the name of a preset (`'constant'`, `'ease in'`, …). */
  value?: ControlPoint[] | string
  /** Caption drawn above the plot. */
  label?: string
  /** Plot height as a fraction of width. Default 0.62. */
  aspect?: number
  /** Fired after any edit that changes the curve. */
  onChange?: (points: ControlPoint[]) => void
}

export interface CurveField extends Widget3d {
  readonly points: ControlPoint[]
  setPoints: (p: ControlPoint[]) => void
  /** Sample it — what a consumer actually wants. */
  evaluate: (t: number) => number
  /** Index of the selected point, or -1. */
  readonly selected: number
  /** Remove the selected point. Ends and the last two are protected. */
  deleteSelected: () => void
  /** Apply a preset by name; unknown names are ignored. */
  applyPreset: (name: string) => void
  /** Settable so a demo can wire it after construction. */
  onChange?: (points: ControlPoint[]) => void
}

/** Resolve the `value` option, which may name a preset. */
function initialPoints(
  value: Curve3dOptions['value'],
  kind: CurveKind
): ControlPoint[] {
  if (Array.isArray(value)) return normalizeCurve(value, kind)
  if (typeof value === 'string') {
    const preset = presetsFor(kind).find((p) => p.name === value)
    if (preset != null) return normalizeCurve(preset.build(), kind)
  }
  return normalizeCurve(kind === 'falloff' ? falloffDefault() : linear(), kind)
}

/**
 * An editable curve.
 *
 * ```js
 * const falloff = curve3d({ kind: 'falloff', label: 'falloff' })
 * falloff.onChange = () => rebuildTerrain()
 * falloff.evaluate(0.5)
 * ```
 */
export function curve3d(config: Curve3dOptions = {}): CurveField {
  const kind = config.kind ?? 'profile'
  const aspect = config.aspect ?? 0.62
  let points = initialPoints(config.value, kind)
  let selected = -1
  let dragging = -1

  const el = g()
  const bg = rect({ 'data-curve-bg': '', x: 0, y: 0, rx: 4, ry: 4 })
  const grid = path({ 'data-curve-grid': '', fill: 'none' })
  const line = path({ 'data-curve-line': '', fill: 'none' })
  const caption = text(
    {
      'font-family': w3dTheme.fontFamily,
      'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
      fill: w3dTheme.muted,
    },
    config.label ?? ''
  )
  el.appendChild(bg)
  el.appendChild(grid)
  el.appendChild(line)
  el.appendChild(caption)
  const handles = g({ 'data-curve-points': '' })
  el.appendChild(handles)

  // Plot geometry from the last layout, so the pointer maps through exactly what
  // was drawn — the rule row3d and vector-field both follow.
  let plot = { x: 0, y: 0, w: 1, h: 1 }
  let rowHeight = 0

  // Curve space ↔ widget space. y is flipped: 1 is the TOP of the plot.
  const toPx = (p: ControlPoint) => ({
    x: plot.x + p.x * plot.w,
    y: plot.y + (1 - p.y) * plot.h,
  })
  const toCurve = (x: number, y: number) => ({
    x: (x - plot.x) / Math.max(1, plot.w),
    y: 1 - (y - plot.y) / Math.max(1, plot.h),
  })

  const emit = (): void => {
    api.onChange?.(points.map((p) => ({ ...p })))
  }

  const drawHandles = (): void => {
    while (handles.firstChild) handles.removeChild(handles.firstChild)
    points.forEach((p, i) => {
      const c = toPx(p)
      handles.appendChild(
        circle({
          cx: c.x,
          cy: c.y,
          r: i === selected ? 5 : 3.5,
          fill: i === selected ? w3dTheme.accent : w3dTheme.panelBg,
          stroke: w3dTheme.accent,
          'stroke-width': String(w3dTheme.strokeWidth),
        })
      )
    })
  }

  const draw = (): void => {
    bg.setAttribute('x', String(plot.x))
    bg.setAttribute('y', String(plot.y))
    bg.setAttribute('width', String(plot.w))
    bg.setAttribute('height', String(plot.h))
    bg.setAttribute('fill', w3dTheme.rowBg)
    bg.setAttribute('stroke', w3dTheme.divider)
    bg.setAttribute('stroke-width', String(w3dTheme.strokeWidth))

    // Quarters, so you can read a value off the plot without a scale.
    const lines: string[] = []
    for (let i = 1; i < 4; i++) {
      const gx = plot.x + (plot.w * i) / 4
      const gy = plot.y + (plot.h * i) / 4
      lines.push(`M${gx} ${plot.y}V${plot.y + plot.h}`)
      lines.push(`M${plot.x} ${gy}H${plot.x + plot.w}`)
    }
    grid.setAttribute('d', lines.join(''))
    grid.setAttribute('stroke', w3dTheme.divider)
    grid.setAttribute('stroke-width', '1')

    // The curve IS piecewise linear, so the control points are the polyline —
    // no sampling, and what you see is exactly what `evaluate` returns.
    const d = points
      .map((p, i) => {
        const c = toPx(p)
        return `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`
      })
      .join('')
    line.setAttribute('d', d)
    line.setAttribute('stroke', w3dTheme.accent)
    line.setAttribute(
      'stroke-width',
      String(Math.max(1.5, w3dTheme.strokeWidth))
    )
    drawHandles()
  }

  const api: CurveField = {
    el,
    onChange: config.onChange,

    layout(width: number) {
      const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5))
      const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0
      const plotH = Math.round(width * aspect)
      plot = {
        x: pad,
        y: capH,
        w: Math.max(8, width - pad * 2),
        h: Math.max(8, plotH),
      }
      if (config.label) {
        caption.setAttribute('x', String(pad))
        caption.setAttribute('y', String(Math.round(w3dTheme.fontSize * 0.9)))
      }
      rowHeight = capH + plotH + pad
      draw()
      return rowHeight
    },

    handle(kind_: PointerKind, x: number, y: number) {
      if (kind_ === 'down') {
        const c = toCurve(x, y)
        // Grab radius in CURVE units, derived from the drawn size so it is the
        // same physical distance whatever the panel's scale — a fixed 0.05 is
        // huge on a wide plot and unusable on a narrow one.
        const grab = 10 / Math.max(1, plot.w)
        const hit = pointAt(points, c.x, c.y, grab)
        if (hit >= 0) {
          selected = hit
          dragging = hit
        } else {
          const added = insertPoint(points, c.x, c.y, kind)
          points = added.points
          selected = added.index
          dragging = added.index
          emit()
        }
        draw()
        return
      }
      if (kind_ === 'move' && dragging >= 0) {
        const c = toCurve(x, y)
        const moved = movePoint(points, dragging, c.x, c.y, kind)
        points = moved.points
        // The index can change mid-drag when a point crosses a neighbour —
        // keeping the old one would silently start dragging a different point.
        dragging = moved.index
        selected = moved.index
        draw()
        emit()
        return
      }
      if (kind_ === 'up' || kind_ === 'leave') dragging = -1
    },

    hitTest(x: number, y: number) {
      return (
        x >= plot.x &&
        x <= plot.x + plot.w &&
        y >= plot.y &&
        y <= plot.y + plot.h
      )
    },

    get points() {
      return points.map((p) => ({ ...p }))
    },
    setPoints(p: ControlPoint[]) {
      points = normalizeCurve(p, kind)
      selected = -1
      draw()
    },
    evaluate(t: number) {
      return evaluateCurve(points, t)
    },
    get selected() {
      return selected
    },
    deleteSelected() {
      if (selected < 0) return
      const next = deletePoint(points, selected, kind)
      if (next === points) return
      points = next
      selected = -1
      draw()
      emit()
    },
    applyPreset(name: string) {
      const preset = presetsFor(kind).find((p) => p.name === name)
      if (preset == null) return
      points = normalizeCurve(preset.build(), kind)
      selected = -1
      draw()
      emit()
    },
  }

  return api
}
