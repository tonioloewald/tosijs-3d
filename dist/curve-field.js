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
    onChange: (name) => { widget.applyPreset(name); rebuild() },
  })

const panel = panel3d(
  { width: 320 },
  label3d({ text: 'province editor', bold: true }),
  shape,
  menu(shape, 'profile', 'no change'),
  button3d({ label: 'delete selected point', onClick: () => shape.deleteSelected() }),
  falloff,
  menu(falloff, 'falloff', 'linear'),
  button3d({ label: 'delete selected point', onClick: () => falloff.deleteSelected() }),
  footprint,
  menu(footprint, 'radial', 'hexagon'),
  slider3d({ label: 'block height', min: 1, max: 16, value: state.height, onChange: (v) => { state.height = v; rebuild() } }),
  slider3d({ label: 'extent', min: 0.2, max: 1, value: state.extent, onChange: (v) => { state.extent = v; rebuild() } }),
  slider3d({ label: 'noise scale', min: 0.2, max: 4, value: state.noise, onChange: (v) => { state.noise = v; rebuild() } }),
  toggle3d({ label: 'wireframe', value: false, onChange: (v) => { if (ground?.material) ground.material.wireframe = v } }),
  // The real biome shader, on this block's material — the same one b3d-terrain
  // puts on a tile, so the province is judged against how it will actually look
  // rather than against a flat green.
  toggle3d({ label: 'terrain shader', value: false, onChange: (v) => {
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
*/
/*{ "parent": "UI", "order": 260 }*/
import { svgElements } from 'tosijs';
import { deletePoint, evaluateCurve, insertPoint, linear, movePoint, normalizeCurve, presetsFor, falloffDefault, } from './curve';
import { w3dTheme } from './w3d-theme';
const { g, rect, path, circle, text } = svgElements;
/** Resolve the `value` option, which may name a preset. */
function initialPoints(value, kind) {
    if (Array.isArray(value))
        return normalizeCurve(value, kind);
    if (typeof value === 'string') {
        const preset = presetsFor(kind).find((p) => p.name === value);
        if (preset != null)
            return normalizeCurve(preset.build(), kind);
    }
    return normalizeCurve(kind === 'falloff' ? falloffDefault() : linear(), kind);
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
export function curve3d(config = {}) {
    const kind = config.kind ?? 'profile';
    const aspect = config.aspect ?? 0.62;
    let points = initialPoints(config.value, kind);
    let selected = -1;
    let dragging = -1;
    const el = g();
    const bg = rect({ 'data-curve-bg': '', x: 0, y: 0, rx: 4, ry: 4 });
    const grid = path({ 'data-curve-grid': '', fill: 'none' });
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
    const identityLine = path({ 'data-curve-identity': '', fill: 'none' });
    const line = path({ 'data-curve-line': '', fill: 'none' });
    const caption = text({
        'font-family': w3dTheme.fontFamily,
        'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
        fill: w3dTheme.muted,
    }, config.label ?? '');
    el.appendChild(bg);
    el.appendChild(grid);
    if (kind === 'profile')
        el.appendChild(identityLine);
    el.appendChild(line);
    el.appendChild(caption);
    const handles = g({ 'data-curve-points': '' });
    el.appendChild(handles);
    // Plot geometry from the last layout, so the pointer maps through exactly what
    // was drawn — the rule row3d and vector-field both follow.
    //
    // FRAME is the drawn box; PLOT is inset within it, so the x = 0 and x = 1
    // points sit INSIDE the interactive area instead of straddling its edge.
    // Tonio: "I'm finding it very hard to move the edge points or even select
    // them." Half of each end handle's grab area fell outside `hitTest`, and a
    // near-miss did not just fail — it INSERTED a point, which is the worst
    // available outcome for a mis-aimed press.
    let frame = { x: 0, y: 0, w: 1, h: 1 };
    let plot = { x: 0, y: 0, w: 1, h: 1 };
    let rowHeight = 0;
    /** Handle radius, and the inset that keeps a whole handle inside the frame. */
    const HANDLE = 5;
    const INSET = HANDLE + 4;
    /** Grab radius in PIXELS — see `nearestPx`. */
    const GRAB = 16;
    // Curve space ↔ widget space. y is flipped: 1 is the TOP of the plot.
    const toPx = (p) => ({
        x: plot.x + p.x * plot.w,
        y: plot.y + (1 - p.y) * plot.h,
    });
    const toCurve = (x, y) => ({
        x: (x - plot.x) / Math.max(1, plot.w),
        y: 1 - (y - plot.y) / Math.max(1, plot.h),
    });
    /**
     * Nearest point within `GRAB` PIXELS, or -1.
     *
     * Deliberately not `curve.pointAt`, which measures in curve units: the plot is
     * wider than it is tall, so one radius in curve space is an ELLIPSE on screen —
     * generous horizontally, mean vertically, and the asymmetry is invisible until
     * you try to grab something. Pixels are what the finger and the ray both work
     * in.
     */
    const nearestPx = (px, py) => {
        let best = -1;
        let bestD = GRAB * GRAB;
        points.forEach((p, i) => {
            const c = toPx(p);
            const d = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py);
            if (d <= bestD) {
                bestD = d;
                best = i;
            }
        });
        return best;
    };
    const emit = () => {
        api.onChange?.(points.map((p) => ({ ...p })));
    };
    const drawHandles = () => {
        while (handles.firstChild)
            handles.removeChild(handles.firstChild);
        points.forEach((p, i) => {
            const c = toPx(p);
            handles.appendChild(circle({
                cx: c.x,
                cy: c.y,
                r: i === selected ? HANDLE : HANDLE - 1.5,
                fill: i === selected ? w3dTheme.accent : w3dTheme.panelBg,
                stroke: w3dTheme.accent,
                'stroke-width': String(w3dTheme.strokeWidth),
            }));
        });
    };
    const draw = () => {
        bg.setAttribute('x', String(frame.x));
        bg.setAttribute('y', String(frame.y));
        bg.setAttribute('width', String(frame.w));
        bg.setAttribute('height', String(frame.h));
        bg.setAttribute('fill', w3dTheme.rowBg);
        bg.setAttribute('stroke', w3dTheme.divider);
        bg.setAttribute('stroke-width', String(w3dTheme.strokeWidth));
        // Quarters, so you can read a value off the plot without a scale.
        const lines = [];
        for (let i = 1; i < 4; i++) {
            const gx = plot.x + (plot.w * i) / 4;
            const gy = plot.y + (plot.h * i) / 4;
            lines.push(`M${gx} ${plot.y}V${plot.y + plot.h}`);
            lines.push(`M${plot.x} ${gy}H${plot.x + plot.w}`);
        }
        grid.setAttribute('d', lines.join(''));
        grid.setAttribute('stroke', w3dTheme.divider);
        grid.setAttribute('stroke-width', '1');
        if (kind === 'profile') {
            const a = toPx({ x: 0, y: 0 });
            const b = toPx({ x: 1, y: 1 });
            identityLine.setAttribute('d', `M${a.x} ${a.y}L${b.x} ${b.y}`);
            identityLine.setAttribute('stroke', w3dTheme.muted);
            identityLine.setAttribute('stroke-width', '1');
            identityLine.setAttribute('stroke-dasharray', '4 4');
            identityLine.setAttribute('opacity', '0.5');
        }
        // The curve IS piecewise linear, so the control points are the polyline —
        // no sampling, and what you see is exactly what `evaluate` returns.
        const d = points
            .map((p, i) => {
            const c = toPx(p);
            return `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`;
        })
            .join('');
        line.setAttribute('d', d);
        line.setAttribute('stroke', w3dTheme.accent);
        line.setAttribute('stroke-width', String(Math.max(1.5, w3dTheme.strokeWidth)));
        drawHandles();
    };
    const api = {
        el,
        onChange: config.onChange,
        layout(width) {
            const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5));
            const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0;
            const plotH = Math.round(width * aspect);
            frame = {
                x: pad,
                y: capH,
                w: Math.max(8, width - pad * 2),
                h: Math.max(8, plotH),
            };
            plot = {
                x: frame.x + INSET,
                y: frame.y + INSET,
                w: Math.max(8, frame.w - INSET * 2),
                h: Math.max(8, frame.h - INSET * 2),
            };
            if (config.label) {
                caption.setAttribute('x', String(pad));
                caption.setAttribute('y', String(Math.round(w3dTheme.fontSize * 0.9)));
            }
            rowHeight = capH + plotH + pad;
            draw();
            return rowHeight;
        },
        handle(kind_, x, y) {
            if (kind_ === 'down') {
                const hit = nearestPx(x, y);
                const c = toCurve(x, y);
                if (hit >= 0) {
                    selected = hit;
                    dragging = hit;
                }
                else {
                    const added = insertPoint(points, c.x, c.y, kind);
                    points = added.points;
                    selected = added.index;
                    dragging = added.index;
                    emit();
                }
                draw();
                return;
            }
            if (kind_ === 'move' && dragging >= 0) {
                const c = toCurve(x, y);
                const moved = movePoint(points, dragging, c.x, c.y, kind);
                points = moved.points;
                // The index can change mid-drag when a point crosses a neighbour —
                // keeping the old one would silently start dragging a different point.
                dragging = moved.index;
                selected = moved.index;
                draw();
                emit();
                return;
            }
            if (kind_ === 'up' || kind_ === 'leave')
                dragging = -1;
        },
        hitTest(x, y) {
            // The FRAME, not the plot: an end handle sits on the plot boundary, so a
            // plot-bounded test rejects half of every press aimed at one.
            return (x >= frame.x &&
                x <= frame.x + frame.w &&
                y >= frame.y &&
                y <= frame.y + frame.h);
        },
        get points() {
            return points.map((p) => ({ ...p }));
        },
        setPoints(p) {
            points = normalizeCurve(p, kind);
            selected = -1;
            draw();
        },
        evaluate(t) {
            return evaluateCurve(points, t);
        },
        get selected() {
            return selected;
        },
        deleteSelected() {
            if (selected < 0)
                return;
            const next = deletePoint(points, selected, kind);
            if (next === points)
                return;
            points = next;
            selected = -1;
            draw();
            emit();
        },
        applyPreset(name) {
            const preset = presetsFor(kind).find((p) => p.name === name);
            if (preset == null)
                return;
            points = normalizeCurve(preset.build(), kind);
            selected = -1;
            draw();
            emit();
        },
    };
    return api;
}
//# sourceMappingURL=curve-field.js.map