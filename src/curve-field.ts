/*#
# Curve editor

**`curve3d` — an editor for a continuous `[0,1] → [0,1]`.** A `Widget3d`, so it
works as a flat DOM overlay, on an in-scene panel, and in a headset without
changing. The rules live in [[curve|curve.ts]]; this draws them and routes the
pointer.

Its reason for existing is terrain **provinces**: a province is a footprint plus
one curve per layer, so this is how you author a plateau, a crater rim or a
treeline without writing code. See `PROVINCE-DESIGN.md` → "every one of those
responses IS a curve", and the [[b3d-terrain|province editor]] demo below.

## Demo — a province editor

Two curves and a terrain block. The **shape** says what height the province wants
at each distance from its centre; the **falloff** says how strongly it overrides
the terrain around it. Drag the points, or pick a preset.

```js
import { b3d, b3dLight, panel3d, label3d, button3d, toggle3d, curve3d, footprint3d, slider3d, select3d, presetsFor, PerlinNoise, attachBiomePlugin, blendSample } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div } = elements

const SIZE = 24   // metres across
const SUBS = 110  // grid resolution
// `height` scales the whole BLOCK, not the province inside it — see `rebuild`.
// 4.5 over a 24 m tile: the field now spans the whole block, so the old 9 (tuned
// when the base was squeezed into a third of the range) came out as alps.
const state = { height: 4.5, extent: 0.7, noise: 1 }

// A province is a footprint plus one curve per layer. SHAPE says what height it
// wants at each distance from its centre; FALLOFF says how strongly it overrides
// the terrain around it. Both are [0,1] -> [0,1] over normalised distance: 0 at
// the centre, 1 at the extent.
// SHAPE is a levels adjustment: it maps the height SAMPLE to a height, exactly
// like slope-profile's cliff/beach/mesa. It starts as the IDENTITY, so a fresh
// province is invisible — drag it off the diagonal and the terrain responds.
// Try `constant` (flattens whatever is there: a plateau) or drag it the other
// way up (maps low ground high, which lifts the whole province).
const shape = curve3d({ kind: 'profile', label: 'shape — remaps the height sample', value: 'no change', aspect: 0.45 })
const falloff = curve3d({ kind: 'falloff', label: 'falloff — weight by distance', aspect: 0.45 })
// The FOOTPRINT, edited as the shape it is rather than as extent-against-angle
// on a graph: a hexagon looks like a hexagon, and a corner is where the corner
// is. The square is the province's bounds.
const footprint = footprint3d({ value: 'hexagon', label: 'footprint — drag the corners' })

let ground = null
let biome = null

// Base terrain: seeded fBm, NORMALISED to [0,1] like everything else here.
//
// Four octaves rather than a couple of sine waves — smooth ground gives the eye
// no scale reference, so the province's edge has nothing to be crisp against and
// the whole thing reads as a bulge in a bedsheet. Detail in the base is what
// makes the blend legible.
const noise = new PerlinNoise(1337)
const fbm = (x, z) => {
  let sum = 0, amp = 1, freq = 0.055 * state.noise, norm = 0
  for (let o = 0; o < 4; o++) {
    sum += noise.noise2D(x * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.1   // not exactly 2, so octaves do not line up into visible grain
  }
  return sum / norm   // roughly [-1, 1]
}
// The FULL [0,1], because that is the shape curve's DOMAIN.
//
// This was banded to 0.12 … 0.5 for legibility, which quietly broke the remap:
// the editor offers you the whole domain while the terrain only ever asks about
// the bottom third, so a threshold drawn at 0.5 answered 0 for every sample and
// the province went flat. Tonio: "[0,0]-[0.5,0][0.5,1]-[1,1] does NOT work as
// expected" — the curve was right and could not be reached.
//
// A control whose input range does not match its data is worse than a coarse
// one, because it fails silently and looks like the model being wrong.
// …and normalised against its OWN measured range, not against fBm's theoretical
// one. Four octaves of Perlin almost never reach +/-1, so `fbm * 0.5 + 0.5`
// spans about 0.28 to 0.62 — the same domain mismatch, just smaller and harder
// to notice. Measuring the field costs one extra pass over a grid we are
// building anyway.
const base = (x, z) => fbm(x, z)
const normalise = (raw, lo, hi) => (hi - lo < 1e-6 ? 0.5 : (raw - lo) / (hi - lo))

const rebuild = () => {
  if (ground == null) return
  // Read x/z back out of the buffer and write y: order-independent, so it does
  // not matter how CreateGround laid the grid out.
  const pos = ground.getVerticesData('position')
  const reach = SIZE * 0.5 * state.extent
  // Pass one: the raw field and its extremes, so the shape curve's [0,1] domain
  // maps onto terrain that actually spans [0,1].
  const raw = new Float32Array(pos.length / 3)
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0, k = 0; i < pos.length; i += 3, k++) {
    raw[k] = base(pos[i], pos[i + 2])
    if (raw[k] < lo) lo = raw[k]
    if (raw[k] > hi) hi = raw[k]
  }
  for (let i = 0, k = 0; i < pos.length; i += 3, k++) {
    const x = pos[i], z = pos[i + 2]
    // Direction first: the footprint says how far the province reaches THIS way,
    // and distance is normalised against that. Direction lives in the footprint;
    // response lives in the other two curves.
    const theta = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1
    const spread = Math.max(0.05, footprint.evaluate(theta))
    const r = Math.min(1, Math.hypot(x, z) / (reach * spread))
    const w = falloff.evaluate(r)
    // THE HEIGHT SAMPLE goes through the shape curve — a levels adjustment, not
    // a function of distance. Tonio: "shape isn't working properly. It's being
    // treated as an output constant NOT as a map from height field to terrain
    // height." It was `shape.evaluate(r)`, which made a profile into a second
    // radial curve and quietly threw away the terrain underneath it.
    //
    // The falloff still works on DISTANCE — that is the split: what the province
    // does to a sample, versus how far its say extends.
    //
    // `blendSample` is convex, so two values in [0,1] mixed by a weight in [0,1]
    // cannot leave [0,1]: the tile's bounds are known before anything is
    // evaluated, and `height` scales the whole block rather than pushing one
    // province through the top of it.
    const sample = normalise(raw[k], lo, hi)
    const h = blendSample(sample, shape.evaluate(sample), w)
    pos[i + 1] = h * state.height
  }
  ground.updateVerticesData('position', pos)
  ground.createNormals(true)
}

shape.onChange = rebuild
falloff.onChange = rebuild
footprint.onChange = rebuild

const scene = b3d(
  {
    // `flex:1` on the ELEMENT, not just its wrapper: a <tosi-b3d> in a flex row
    // has no flex-grow of its own, so it shrinks to content width — which is 0,
    // and renders a 0x296 canvas that looks exactly like a broken scene.
    style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      orbitCam(el, { radius: 32, beta: 1.02, alpha: -1.15, target: [0, 1.5, 0] })
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

// A preset menu per curve. Presets are the fastest way to learn what a curve
// DOES — you pick "desert terraces", see terraces, then drag from there.
const menu = (widget, kind, value) =>
  select3d({
    value,
    options: presetsFor(kind).map((p) => p.name),
    handleChange: (name) => { widget.applyPreset(name); rebuild() },
  })

const panel = panel3d(
  { width: 320 },
  label3d({ text: 'province editor', bold: true }),
  shape,
  menu(shape, 'profile', 'no change'),
  button3d({ label: 'delete selected point', handleClick: () => shape.deleteSelected() }),
  falloff,
  menu(falloff, 'falloff', 'linear'),
  button3d({ label: 'delete selected point', handleClick: () => falloff.deleteSelected() }),
  footprint,
  menu(footprint, 'radial', 'hexagon'),
  slider3d({ label: 'block height', min: 1, max: 16, value: state.height, handleChange: (v) => { state.height = v; rebuild() } }),
  slider3d({ label: 'extent', min: 0.2, max: 1, value: state.extent, handleChange: (v) => { state.extent = v; rebuild() } }),
  slider3d({ label: 'noise scale', min: 0.2, max: 4, value: state.noise, handleChange: (v) => { state.noise = v; rebuild() } }),
  toggle3d({ label: 'wireframe', value: false, handleChange: (v) => { if (ground?.material) ground.material.wireframe = v } }),
  // The real biome shader, on this block's material — the same one b3d-terrain
  // puts on a tile, so the province is judged against how it will actually look
  // rather than against a flat green.
  toggle3d({ label: 'terrain shader', value: false, handleChange: (v) => {
    if (ground?.material == null) return
    if (biome == null) biome = attachBiomePlugin(ground.material)
    biome.isEnabled = v
  } })
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

## Deleting a point is a BUTTON, not a gesture

Adding is a tap on empty space and moving is a drag, which leaves deleting with
no obvious third gesture. The usual answers all fail somewhere that matters
here: right-click does not exist on a controller, double-tap is unreliable when
the pointer is a ray from two metres away, and drag-off-the-edge collides with
the clamp that keeps the curve in range.

So the widget exposes `selected` and `deleteSelected()`, and the host puts a
button somewhere honest. A discoverable button beats a gesture you have to be
told about — which is the same argument the popup title bar makes for its grip.

## Shared split markers — a light program editor

A [[light-modulation|light program]] is one curve per channel divided into
attack / sustain / decay by two markers. Those boundaries belong to the **lamp**,
not to any one channel, so both curves below are given the SAME `curveMarkers()`
object: drag a marker in either and both move.

Tonio: _"the attack and decay should be shared by the various curves or it just
becomes nutty."_ It is not only tidier — per-curve markers would let brightness
and hue disagree about where the attack ends, which is not a state the model can
represent, so the editor would be able to author something the runtime cannot
run.

```js
import { curve3d, curveMarkers, panel3d, label3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const out = pre({ style: 'margin:0;padding:8px 12px;color:#8ea;font:12px ui-monospace,monospace' }, '')

// ONE marker set, shared. This is the whole point.
const splits = curveMarkers([0.35, 0.75], {
  labels: ['attack', 'decay'],
  handleChange: (v) => {
    out.textContent = `attackEnd ${v[0].toFixed(3)}   sustainEnd ${v[1].toFixed(3)}`
  },
})
out.textContent = 'attackEnd 0.350   sustainEnd 0.750'

const brightness = curve3d({
  label: 'brightness — strike, hum, fade',
  markers: splits,
  value: [
    { x: 0, y: 0 }, { x: 0.08, y: 0.9 }, { x: 0.12, y: 0.05 },
    { x: 0.2, y: 1 }, { x: 0.26, y: 0.1 }, { x: 0.35, y: 1 },
    { x: 0.5, y: 0.93 }, { x: 0.75, y: 1 },
    { x: 0.9, y: 0.3 }, { x: 1, y: 0 },
  ],
})
const hue = curve3d({
  label: 'hue — 0.5 leaves the colour alone',
  markers: splits,
  value: [{ x: 0, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 1, y: 0 }],
})

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'flex:1;min-height:0;overflow:auto;padding:12px' },
      panel3d({ width: 340 }, label3d({ text: 'Light program' }), brightness, hue)
    ),
    out
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
  moveMarker,
  normalizeMarkers,
  normalizeCurve,
  canonicalCurve,
  presetsFor,
  falloffDefault,
  type ControlPoint,
  type CurveKind,
} from './curve'
import { w3dTheme } from './w3d-theme'
import { handlerOf } from './widgets3d'
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
  /**
   * Name used in the commit's verb phrase — `'brightness'` gives
   * `'edit brightness curve'`. Falls back to `label`, then to nothing.
   *
   * Separate from `label` because a label is prose for a human reading the
   * panel ("brightness — strike, hum, fade") and this is a token in an undo
   * history, where the prose would be noise.
   */
  name?: string
  /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
  /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
  handleChange?: (points: ControlPoint[]) => void
  /** @deprecated use `handleChange` — removed in 0.9. */
  onChange?: (points: ControlPoint[]) => void
  /**
   * Fired once when a gesture ENDS, with the canonical (rounded, sorted) points.
   *
   * The pair exists because two consumers want different things from the same
   * drag and neither can be served by the other's answer (tosijs-3d#61 §8):
   *
   * - a 3D preview must follow the drag continuously, so `onChange` is live;
   * - a DOCUMENT records one undo step per edit, so committing per pointer-move
   *   would put fifty entries in the history for one drag.
   *
   * Ensemble hit exactly this with transform drags: write the live body during
   * the drag, commit to the document once, on release. Same shape.
   *
   * `describe` is a bare VERB PHRASE — lowercase, no subject, no punctuation
   * (`'edit brightness curve'`, `'apply preset'`). Ensemble's history entries
   * are verb + subject and they attach the subject themselves, because they
   * know the piece id and we cannot. Passing a whole sentence would give them
   * something to strip.
   */
  handleCommit?: (points: ControlPoint[], describe: string) => void
  /**
   * Draggable vertical split markers, SHARED between curves.
   *
   * A light's attack/sustain/decay boundaries belong to the lamp, not to any
   * one channel — Tonio: _"the attack and decay should be shared by the various
   * curves or it just becomes nutty."_ So this takes a `curveMarkers()` object
   * and several `curve3d`s given the SAME one drag together and redraw
   * together. Per-curve markers would let brightness and hue disagree about
   * where the attack ends, which is not a state the model can even represent.
   */
  markers?: CurveMarkers
}

/**
 * Split markers shared by several curves.
 *
 * Deliberately a tiny observable rather than a plain array: the sharing has to
 * survive a drag, so every subscriber has to hear about a move as it happens,
 * not on the next layout.
 */
export interface CurveMarkers {
  readonly values: number[]
  /** Optional captions, drawn at the top of each marker. */
  readonly labels: string[]
  /** Move marker `i`, clamped between its neighbours. */
  move: (i: number, x: number) => void
  set: (values: number[]) => void
  /** Called on every change; returns an unsubscribe. */
  subscribe: (cb: () => void) => () => void
  /** Live, including mid-drag. */
  handleChange?: (values: number[]) => void
  /** Once, when a marker drag ends — the undo-step boundary. */
  handleCommit?: (values: number[], describe: string) => void
  /** Called by an editor when its marker gesture finishes. */
  commit: (describe?: string) => void
}

/**
 * Make a shared marker set.
 *
 * ```js
 * const splits = curveMarkers([0.35, 0.75], { labels: ['attack', 'decay'] })
 * const brightness = curve3d({ label: 'brightness', markers: splits })
 * const hue = curve3d({ label: 'hue', markers: splits })
 * // drag either one's markers; both move.
 * ```
 */
export function curveMarkers(
  values: number[],
  opts: {
    labels?: string[]
    handleChange?: (values: number[]) => void
    handleCommit?: (values: number[], describe: string) => void
  } = {}
): CurveMarkers {
  let vals = normalizeMarkers(values)
  const subs = new Set<() => void>()
  const fire = () => {
    for (const cb of [...subs]) cb()
    api.handleChange?.([...vals])
  }
  const api: CurveMarkers = {
    get values() {
      return vals
    },
    get labels() {
      return opts.labels ?? []
    },
    move(i, x) {
      const next = moveMarker(vals, i, x)
      if (next[i] === vals[i]) return
      vals = next
      fire()
    },
    set(next) {
      vals = normalizeMarkers(next)
      fire()
    },
    subscribe(cb) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    handleChange: opts.handleChange,
    handleCommit: opts.handleCommit,
    commit(describe = 'move split') {
      api.handleCommit?.(
        vals.map((v) => Math.round(v * 1e4) / 1e4),
        describe
      )
    },
  }
  return api
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
  /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
  handleChange?: (points: ControlPoint[]) => void
  /** @deprecated use `handleChange` — removed in 0.9. */
  onChange?: (points: ControlPoint[]) => void
  /** Settable likewise — fires once per gesture, with canonical points. */
  handleCommit?: (points: ControlPoint[], describe: string) => void
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

  // Tagged like every other widget, so a container can find its children and a
  // stylesheet or a test can name them.
  const el = g({ 'data-w3d': 'curve' })
  const bg = rect({ 'data-curve-bg': '', x: 0, y: 0, rx: 4, ry: 4 })
  const grid = path({ 'data-curve-grid': '', fill: 'none' })
  /*
  THE IDENTITY, drawn faintly — the single most useful mark on a profile plot.

  Without it the plot has no orientation cue at all: which corner is (0,0) is a
  guess, and a curve drawn from top-left to bottom-right looks as reasonable as
  its mirror while meaning the opposite (it maps low ground HIGH). Tonio drew
  exactly that, expected a no-op, and got a raised province — a reading error the
  plot invited by saying nothing.

  With the diagonal there, "no change" has a picture: on the line. Only for a
  profile — a falloff is not a remap, so its diagonal would mean nothing.
  */
  const identityLine = path({ 'data-curve-identity': '', fill: 'none' })
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
  if (kind === 'profile') el.appendChild(identityLine)
  el.appendChild(line)
  el.appendChild(caption)
  const handles = g({ 'data-curve-points': '' })
  el.appendChild(handles)
  // Above the handles: a split marker must stay grabbable even where a control
  // point sits on it.
  const markerLayer = g({ 'data-curve-markers': '' })
  el.appendChild(markerLayer)

  // Plot geometry from the last layout, so the pointer maps through exactly what
  // was drawn — the rule row3d and vector-field both follow.
  //
  // FRAME is the drawn box; PLOT is inset within it, so the x = 0 and x = 1
  // points sit INSIDE the interactive area instead of straddling its edge.
  // Tonio: "I'm finding it very hard to move the edge points or even select
  // them." Half of each end handle's grab area fell outside `hitTest`, and a
  // near-miss did not just fail — it INSERTED a point, which is the worst
  // available outcome for a mis-aimed press.
  let frame = { x: 0, y: 0, w: 1, h: 1 }
  let plot = { x: 0, y: 0, w: 1, h: 1 }
  let rowHeight = 0

  /** Handle radius, and the inset that keeps a whole handle inside the frame. */
  const HANDLE = 5
  const INSET = HANDLE + 4
  /** Grab radius in PIXELS — see `nearestPx`. */
  const GRAB = 16
  /**
   * Horizontal grab distance for a split marker, in pixels.
   *
   * Wider than it looks because a marker is a 1px line — but a POINT still wins
   * a contested press, since a point is a specific thing you aimed at and a
   * marker spans the whole height of the plot.
   */
  const MARKER_GRAB = 10
  let draggingMarker = -1
  const markers = config.markers ?? null

  // Curve space ↔ widget space. y is flipped: 1 is the TOP of the plot.
  const toPx = (p: ControlPoint) => ({
    x: plot.x + p.x * plot.w,
    y: plot.y + (1 - p.y) * plot.h,
  })
  const toCurve = (x: number, y: number) => ({
    x: (x - plot.x) / Math.max(1, plot.w),
    y: 1 - (y - plot.y) / Math.max(1, plot.h),
  })

  /**
   * Nearest point within `GRAB` PIXELS, or -1.
   *
   * Deliberately not `curve.pointAt`, which measures in curve units: the plot is
   * wider than it is tall, so one radius in curve space is an ELLIPSE on screen —
   * generous horizontally, mean vertically, and the asymmetry is invisible until
   * you try to grab something. Pixels are what the finger and the ray both work
   * in.
   */
  const nearestPx = (px: number, py: number): number => {
    let best = -1
    let bestD = GRAB * GRAB
    points.forEach((p, i) => {
      const c = toPx(p)
      const d = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py)
      if (d <= bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const emit = (): void => {
    const cb =
      api.handleChange ??
      handlerOf<(p: ControlPoint[]) => void>(
        api as unknown as Record<string, unknown>,
        'handleChange',
        'onChange'
      )
    cb?.(points.map((p) => ({ ...p })))
  }

  const drawHandles = (): void => {
    while (handles.firstChild) handles.removeChild(handles.firstChild)
    points.forEach((p, i) => {
      const c = toPx(p)
      handles.appendChild(
        circle({
          cx: c.x,
          cy: c.y,
          r: i === selected ? HANDLE : HANDLE - 1.5,
          fill: i === selected ? w3dTheme.accent : w3dTheme.panelBg,
          stroke: w3dTheme.accent,
          'stroke-width': String(w3dTheme.strokeWidth),
        })
      )
    })
  }

  /** Vertical split lines + their grab tabs, redrawn from the shared model. */
  const drawMarkers = (): void => {
    while (markerLayer.firstChild) {
      markerLayer.removeChild(markerLayer.firstChild)
    }
    if (markers == null) return
    markers.values.forEach((v, i) => {
      const px = plot.x + v * plot.w
      markerLayer.appendChild(
        path({
          d: `M${px} ${plot.y}V${plot.y + plot.h}`,
          stroke: w3dTheme.warning ?? w3dTheme.accent,
          'stroke-width': String(Math.max(1, w3dTheme.strokeWidth)),
          'stroke-dasharray': '3 3',
          opacity: i === draggingMarker ? '1' : '0.75',
        })
      )
      // A grab TAB at the top, so the marker can be picked up without competing
      // with the control points spread along the line's whole height.
      markerLayer.appendChild(
        rect({
          x: px - 4,
          y: plot.y - 3,
          width: 8,
          height: 7,
          rx: 2,
          fill: w3dTheme.warning ?? w3dTheme.accent,
        })
      )
      const caption = markers.labels[i]
      if (caption) {
        markerLayer.appendChild(
          text(
            {
              x: px + 5,
              y: plot.y + 9,
              'font-family': w3dTheme.fontFamily,
              'font-size': String(Math.round(w3dTheme.fontSize * 0.7)),
              fill: w3dTheme.muted,
            },
            caption
          )
        )
      }
    })
  }

  /** Nearest marker within `MARKER_GRAB` pixels, or -1. */
  const nearestMarkerPx = (x: number): number => {
    if (markers == null) return -1
    let best = -1
    let bestD = MARKER_GRAB
    markers.values.forEach((v, i) => {
      const d = Math.abs(plot.x + v * plot.w - x)
      if (d <= bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const draw = (): void => {
    bg.setAttribute('x', String(frame.x))
    bg.setAttribute('y', String(frame.y))
    bg.setAttribute('width', String(frame.w))
    bg.setAttribute('height', String(frame.h))
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

    if (kind === 'profile') {
      const a = toPx({ x: 0, y: 0 })
      const b = toPx({ x: 1, y: 1 })
      identityLine.setAttribute('d', `M${a.x} ${a.y}L${b.x} ${b.y}`)
      identityLine.setAttribute('stroke', w3dTheme.muted)
      identityLine.setAttribute('stroke-width', '1')
      identityLine.setAttribute('stroke-dasharray', '4 4')
      identityLine.setAttribute('opacity', '0.5')
    }

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
    drawMarkers()
  }

  // Redraw whenever the SHARED markers move — including when the drag is
  // happening in a sibling curve, which is the whole point of sharing them.
  markers?.subscribe(() => draw())

  /** The curve's name in a commit verb phrase. Prose labels are not it. */
  const curveName = config.name ?? config.label ?? ''

  /** One commit per gesture, canonical — see `handleCommit`. */
  const commit = (describe: string): void => {
    api.handleCommit?.(canonicalCurve(points, kind), describe)
  }

  const api: CurveField = {
    el,
    handleChange: config.handleChange,
    onChange: config.onChange,
    handleCommit: config.handleCommit,

    layout(width: number) {
      const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5))
      const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0
      const plotH = Math.round(width * aspect)
      frame = {
        x: pad,
        y: capH,
        w: Math.max(8, width - pad * 2),
        h: Math.max(8, plotH),
      }
      plot = {
        x: frame.x + INSET,
        y: frame.y + INSET,
        w: Math.max(8, frame.w - INSET * 2),
        h: Math.max(8, frame.h - INSET * 2),
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
        const hit = nearestPx(x, y)
        const c = toCurve(x, y)
        /*
        THE TAB BAND WINS OUTRIGHT.

        A point normally beats a marker, because you aimed at that point. But a
        curve very often has a control point sitting exactly ON a split — a
        light program's brightness has one at `attackEnd` almost by
        construction — and there the point swallows every press, including the
        one aimed at the tab drawn above the plot for this very purpose. The
        marker then cannot be grabbed at all.

        So inside the tab's own band, above the plot, the marker wins. Below it
        the ordinary priority stands.
        */
        const inTabBand = y < plot.y + 4 && nearestMarkerPx(x) >= 0
        if (inTabBand) {
          draggingMarker = nearestMarkerPx(x)
        } else if (hit >= 0) {
          selected = hit
          dragging = hit
        } else if (nearestMarkerPx(x) >= 0) {
          // Markers lose to a point (you aimed at that point) but beat
          // INSERTING one — otherwise reaching for a split silently adds a
          // control point, the same worst-outcome-for-a-near-miss the plot
          // inset exists to prevent.
          draggingMarker = nearestMarkerPx(x)
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
      if (kind_ === 'move' && draggingMarker >= 0) {
        // The shared model fires, so sibling curves redraw too — this widget's
        // own redraw comes back through its own subscription.
        markers?.move(draggingMarker, toCurve(x, y).x)
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
      if (kind_ === 'up' || kind_ === 'leave') {
        // THE UNDO-STEP BOUNDARY. Everything above emits live; this is the one
        // place a document should be written.
        if (dragging >= 0) {
          dragging = -1
          commit(curveName ? `edit ${curveName} curve` : 'edit curve')
        }
        if (draggingMarker >= 0) {
          const label = markers?.labels[draggingMarker]
          draggingMarker = -1
          markers?.commit(label ? `move ${label} split` : 'move split')
          draw()
        }
      }
    },

    hitTest(x: number, y: number) {
      // The FRAME, not the plot: an end handle sits on the plot boundary, so a
      // plot-bounded test rejects half of every press aimed at one.
      return (
        x >= frame.x &&
        x <= frame.x + frame.w &&
        y >= frame.y &&
        y <= frame.y + frame.h
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
      // A discrete edit IS a complete gesture — there is no release to wait
      // for, so it is its own undo step.
      commit('delete point')
    },
    applyPreset(name: string) {
      const preset = presetsFor(kind).find((p) => p.name === name)
      if (preset == null) return
      points = normalizeCurve(preset.build(), kind)
      selected = -1
      draw()
      emit()
      commit('apply preset')
    },
  }

  return api
}
