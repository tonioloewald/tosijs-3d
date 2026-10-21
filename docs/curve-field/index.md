# Curve editor

**`curve3d` — an editor for a continuous `[0,1] → [0,1]`.** A `Widget3d`, so it
works as a flat DOM overlay, on an in-scene panel, and in a headset without
changing. It draws the curve model (see "The model", below) and routes
the pointer.

Its reason for existing is terrain **provinces**: a province is a footprint plus
one curve per layer, so this is how you author a plateau, a crater rim or a
treeline without writing code. See the [[b3d-terrain|province editor]] demo below.

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
// Built by `buildRows` below rather than here, because this panel has TWO
// presentations — flat, and the one that floats in front of you in a headset —
// and a widget's element can only be in one of them at a time. The FLAT set
// stays the source `rebuild` samples; the headset set mirrors into it.
//
// The FOOTPRINT, edited as the shape it is rather than as extent-against-angle
// on a graph: a hexagon looks like a hexagon, and a corner is where the corner
// is. The square is the province's bounds.
let shape = null
let falloff = null
let footprint = null

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
// The FULL [0,1], because that is the shape curve's DOMAIN. If the terrain only
// spanned part of it, a threshold drawn outside that part would never be
// reached, and the curve would look wrong when it was right.
//
// Normalised against its OWN measured range, not fBm's theoretical one: four
// octaves of Perlin almost never reach +/-1. Measuring the field costs one
// extra pass over a grid we are building anyway.
const base = (x, z) => fbm(x, z)
const normalise = (raw, lo, hi) => (hi - lo < 1e-6 ? 0.5 : (raw - lo) / (hi - lo))

const rebuild = () => {
  // `shape` is null until the flat panel is built, and the scene connects first.
  if (ground == null || shape == null) return
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
    // a function of distance. Evaluating it at `r` would make a profile into a
    // second radial curve and throw away the terrain underneath it.
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

const scene = b3d(
  {
    // `flex:1` on the ELEMENT, not just its wrapper: a <tosi-b3d> in a flex row
    // has no flex-grow of its own, so it shrinks to content width — which is 0,
    // and renders a 0x296 canvas that looks exactly like a broken scene.
    style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden',
    // The same editor, reachable in a headset. The flat panel beside the canvas
    // does not exist inside an immersive session, so without this the demo is a
    // terrain you can walk around and cannot edit.
    scenePanel: () => buildRows(false),
    sceneCreated(el) {
      orbitCam(el, { radius: 32, betaDeg: 58, alphaDeg: -66, target: [0, 1.5, 0] })
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

// ONE row list, built twice: once for the flat panel and again for the headset.
//
// `primary` is the flat set, and it is what `rebuild` samples. The headset set
// is seeded from the flat one's current values and mirrors every edit back into
// it, so entering VR picks up what you had drawn and leaving it keeps what you
// drew there. Sharing the widget OBJECTS would not work — an element can only
// be in one panel at a time, so a shared set would empty the flat panel the
// moment the headset one mounted.
const buildRows = (primary) => {
  const s = curve3d({ kind: 'profile', label: 'shape — remaps the height sample', value: primary ? 'no change' : shape.points, aspect: 0.45 })
  const f = curve3d({ kind: 'falloff', label: 'falloff — weight by distance', value: primary ? undefined : falloff.points, aspect: 0.45 })
  const p = footprint3d({ value: primary ? 'hexagon' : footprint.vertices, label: 'footprint — drag the corners' })
  if (primary) { shape = s; falloff = f; footprint = p }

  const sync = primary
    ? () => {}
    : () => {
        shape.setPoints(s.points)
        falloff.setPoints(f.points)
        footprint.setVertices(p.vertices)
      }
  const changed = () => { sync(); rebuild() }
  s.handleChange = changed
  f.handleChange = changed
  p.handleChange = changed

  // A preset menu per curve. Presets are the fastest way to learn what a curve
  // DOES — you pick "desert terraces", see terraces, then drag from there.
  const menu = (widget, kind, value) =>
    select3d({
      value,
      options: presetsFor(kind).map((x) => x.name),
      handleChange: (name) => { widget.applyPreset(name); changed() },
    })
  const del = (widget) =>
    button3d({ label: 'delete selected point', handleClick: () => { widget.deleteSelected(); changed() } })

  return [
    label3d({ text: 'province editor', bold: true }),
    s, menu(s, 'profile', 'no change'), del(s),
    f, menu(f, 'falloff', 'linear'), del(f),
    p, menu(p, 'radial', 'hexagon'),
    slider3d({ label: 'block height', min: 1, max: 16, value: state.height, handleChange: (v) => { state.height = v; rebuild() } }),
    slider3d({ label: 'extent', min: 0.2, max: 1, value: state.extent, handleChange: (v) => { state.extent = v; rebuild() } }),
    slider3d({ label: 'noise scale', min: 0.2, max: 4, value: state.noise, handleChange: (v) => { state.noise = v; rebuild() } }),
    toggle3d({ label: 'wireframe', value: ground?.material?.wireframe ?? false, handleChange: (v) => { if (ground?.material) ground.material.wireframe = v } }),
    // The real biome shader, on this block's material — the same one b3d-terrain
    // puts on a tile, so the province is judged against how it will actually look
    // rather than against a flat green.
    toggle3d({ label: 'terrain shader', value: biome ? biome.isEnabled : false, handleChange: (v) => {
      if (ground?.material == null) return
      if (biome == null) biome = attachBiomePlugin(ground.material)
      biome.isEnabled = v
    } }),
  ]
}

const panel = panel3d({ width: 320 }, ...buildRows(true))

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

It is not only tidier. Per-curve markers would let brightness and hue disagree
about where the attack ends, which is not a state the model can represent, so
the editor would be able to author something the runtime cannot run.

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

## The model

The rules are pure (no Babylon, no DOM) and exported: a continuous function from
`[0,1]` to itself, as sorted control points, with the editing rules that keep it
valid.

- **The range is CLOSED.** A curve cannot return 1.4. A profile that could
  exceed its range would silently change the height a province occupies, which
  is exactly what [[carve]]/[[patch-field]] must agree about: a bore cut
  against a heightfield that has since grown is a hole in the wrong place. So
  **amplitude belongs to the block and shape belongs to the curve**, and a drag
  clamps rather than pushing the range.
- **Two kinds.** A `profile` remaps a value; both endpoints are free. A
  `falloff` is weight against normalised distance (`0` at the province centre,
  `1` at its extent) and is **pinned to 0 at x = 1**, because a province still
  carrying weight at its boundary leaves a visible step at the footprint edge.
- **NOT monotonic.** A crater rim and a volcano's cone rise, then fall. Pin the
  edge; leave the middle alone.
- **A drag can reorder.** Dragging a point past its neighbour is a legitimate
  edit, so `movePoint` returns the point's **new index** with the points. A
  caller that assumes the index survived starts dragging a different point
  mid-gesture.
