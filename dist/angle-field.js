/*#
# angle-field

**`angle3d` dials a direction; `arc3d` dials a direction AND a width.** Both are
rings, because the quantity is a circle and a slider track is not. The model is
[[arc]].

## Demo

The turret case, which is where the design came from: a gun's placement on a
ship restricts where it can bear. Drag the arc's **edges** to change its width
and its **middle** to swing it — the grey sector is blocked by the ship, and the
control shows it rather than silently snapping.

```js
import { panel3d, label3d, angle3d, arc3d, select3d, arcOf } from 'tosijs-3d'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' })

// Where the gun sits decides what it can reach — one constraint, seen twice.
const MOUNTS = {
  bow: arcOf(0, 270),
  port: arcOf(100, 160),
  stern: arcOf(180, 270),
}

let bearing = 20
let firing = arcOf(120, 70)
let mount = 'port'

const show = () => {
  readout.textContent =
    `bearing ${Math.round(bearing)}°` +
    `   ·   arc ${Math.round(firing.centre)}° ± ${Math.round(firing.width / 2)}°`
}

const dial = angle3d({
  label: 'bearing',
  value: bearing,
  size: 150,
  handleChange: (v) => { bearing = v; show() },
})

const fan = arc3d({
  label: 'firing arc',
  value: firing,
  size: 150,
  envelope: MOUNTS[mount],
  minWidth: 10,
  maxWidth: 180,
  handleChange: (v) => { firing = v; show() },
})

show()
preview.append(
  div({ class: 'dials' },
    panel3d({ width: 210 },
      select3d({
        label: 'mount',
        value: mount,
        options: Object.keys(MOUNTS),
        handleChange: (v) => { mount = String(v); fan.setEnvelope(MOUNTS[mount]) },
      }),
      dial
    ),
    panel3d({ width: 210 }, fan)
  ),
  readout
)
```
```css
.preview { padding: 12px; }
.dials { display: flex; gap: 12px; flex-wrap: wrap; }
.readout {
  padding: 10px 2px;
  font-family: ui-monospace, monospace;
  color: #9aa4b2;
}
```

## Why not a slider

An angle on a linear track has the defect log scales were added to fix, pointing
a different way: **the track has ends and the quantity does not.** 359° and 1°
are two degrees apart and sit at opposite ends of the slider, so the one gesture
you always want — nudge past north — is the one that cannot be made.

## An arc is one thing, so it is one control

Offered as `start` and `end` sliders the pair can be dragged into
meaninglessness, and the edit you actually make — *"same width, point it
there"* — needs both moved together. Here that is one gesture: grab the middle.

| grab | drag |
| --- | --- |
| an edge | change the width, the other edge staying put |
| the middle | swing the whole arc, the width staying put |

**The edges beat the middle on a narrow arc**, where all three grips are within
a few degrees. A width you cannot change is stuck; a rotation you have to reach
for can still be done by dragging one edge and then the other.

## Restrictions show, they do not merely clamp

*"Consider a game where you can place turrets on a ship and where it goes
restricts the firing arc and the placement of the gun."* The envelope and the
placement are the same constraint seen twice — so a control that silently snaps
to a legal arc teaches nothing about why. `arc3d` draws the blocked sector.
Nothing stops you clamping quietly; this just makes the ship visible.

## Options

| option | | |
| --- | --- | --- |
| `value` | `0` / `arcOf(0, 90)` | degrees, or an `Arc` |
| `label` | — | drawn above the dial |
| `limits` | full circle | `angle3d` only — the permitted sector; the handle CATCHES at a stop |
| `envelope` | full circle | `arc3d` only — the arc may only lie within this |
| `minWidth` `maxWidth` | `0` `360` | `arc3d` only |
| `size` | `0` | ring diameter; `0` fits the row to the panel width |
| `handleChange` | | live, every frame the pointer moves |
| `handleCommit` | | once per gesture — your undo step |
*/
/*{ "parent": "UI", "order": 272 }*/
import { svgElements } from 'tosijs';
import { FULL_CIRCLE, arcOf, arcComplement, arcEnd, arcStart, clampAngleToArc, clampArc, dragArc, nearestArcGrip, normaliseDegrees, } from './arc.js';
import { w3dTheme } from './w3d-theme.js';
import { handlerOf } from './handler-of.js';
const { g, circle, path, text, line } = svgElements;
const DEG = Math.PI / 180;
/*
NORTH IS UP, AND CLOCKWISE IS POSITIVE.

A bearing is what these dial, and every bearing anyone has read — a compass, a
radar, a turret readout — puts 0 at the top and grows to the right. Screen
coordinates do neither (0 is to the right, and +y is DOWN, which turns the sense
of rotation over), so the conversion lives in exactly one place and no drawing
or hit test does its own trigonometry.
*/
const pointAt = (cx, cy, radius, degrees) => {
    const t = (degrees - 90) * DEG;
    return [cx + Math.cos(t) * radius, cy + Math.sin(t) * radius];
};
/** The bearing of a point relative to the dial's centre — `pointAt` inverted. */
const angleOf = (cx, cy, x, y) => normaliseDegrees((Math.atan2(y - cy, x - cx) / DEG + 90 + 360) % 360);
/**
 * An SVG wedge for a sector, or a full disc when it covers everything.
 *
 * `A` cannot draw a 360° arc — start and end coincide and the path collapses to
 * nothing, which draws an EMPTY dial for the one case that means "no
 * restriction at all". Two half-circles instead.
 */
function sectorPath(cx, cy, radius, a) {
    if (a.width >= 360) {
        return (`M ${cx - radius} ${cy} ` +
            `A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} ` +
            `A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`);
    }
    const [sx, sy] = pointAt(cx, cy, radius, arcStart(a));
    const [ex, ey] = pointAt(cx, cy, radius, arcEnd(a));
    const large = a.width > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey} Z`;
}
/** Shared chrome: the ring, its ticks, and the geometry both dials measure in. */
function dialBase(label) {
    const el = g({ 'data-w3d': 'dial' });
    const blocked = path({ 'data-dial-blocked': '', fill: w3dTheme.muted });
    blocked.setAttribute('opacity', '0.18');
    const fill = path({ 'data-dial-fill': '', fill: w3dTheme.accent });
    fill.setAttribute('opacity', '0.3');
    const ring = circle({
        'data-dial-ring': '',
        fill: 'none',
        stroke: w3dTheme.muted,
        'stroke-width': String(w3dTheme.strokeWidth),
    });
    const ticks = g({ 'data-dial-ticks': '' });
    const caption = text({
        'font-family': w3dTheme.fontFamily,
        'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
        fill: w3dTheme.muted,
    }, label ?? '');
    const grips = g({ 'data-dial-grips': '' });
    el.appendChild(blocked);
    el.appendChild(fill);
    el.appendChild(ring);
    el.appendChild(ticks);
    el.appendChild(grips);
    if (label)
        el.appendChild(caption);
    return { el, blocked, fill, ring, ticks, caption, grips };
}
/** N/E/S/W marks — without them a dial has no orientation and reads as a knob. */
function drawTicks(ticks, cx, cy, radius) {
    while (ticks.firstChild)
        ticks.removeChild(ticks.firstChild);
    for (let a = 0; a < 360; a += 30) {
        const major = a % 90 === 0;
        const [x1, y1] = pointAt(cx, cy, radius - (major ? 8 : 4), a);
        const [x2, y2] = pointAt(cx, cy, radius, a);
        ticks.appendChild(line({
            x1,
            y1,
            x2,
            y2,
            stroke: w3dTheme.muted,
            'stroke-width': String(major ? w3dTheme.strokeWidth : 1),
            opacity: major ? '0.8' : '0.35',
        }));
    }
}
const gripDot = (x, y, r, fillColour) => circle({
    cx: x,
    cy: y,
    r,
    fill: fillColour,
    stroke: w3dTheme.panelBg,
    'stroke-width': '2',
});
/** Dial one direction. */
export function angle3d(config = {}) {
    let limits = config.limits ?? FULL_CIRCLE;
    let value = clampAngleToArc(config.value ?? 0, limits);
    let dragging = false;
    const base = dialBase(config.label);
    let cx = 0;
    let cy = 0;
    let radius = 1;
    let rowHeight = 0;
    const change = handlerOf(config, 'handleChange', 'onChange');
    const draw = () => {
        base.ring.setAttribute('cx', String(cx));
        base.ring.setAttribute('cy', String(cy));
        base.ring.setAttribute('r', String(radius));
        drawTicks(base.ticks, cx, cy, radius);
        // The permitted sector, when there is a restriction to show.
        const blockedArc = arcComplement(limits);
        base.blocked.setAttribute('d', blockedArc ? sectorPath(cx, cy, radius, blockedArc) : '');
        base.fill.setAttribute('d', '');
        while (base.grips.firstChild)
            base.grips.removeChild(base.grips.firstChild);
        const [hx, hy] = pointAt(cx, cy, radius, value);
        base.grips.appendChild(line({
            x1: cx,
            y1: cy,
            x2: hx,
            y2: hy,
            stroke: w3dTheme.accent,
            'stroke-width': String(w3dTheme.strokeWidth),
        }));
        base.grips.appendChild(gripDot(hx, hy, 6, w3dTheme.accent));
    };
    const set = (next, live) => {
        const settled = clampAngleToArc(next, limits);
        if (settled === value)
            return;
        value = settled;
        draw();
        if (live)
            change?.(value);
    };
    const api = {
        el: base.el,
        get value() {
            return value;
        },
        setValue(next) {
            set(next, false);
        },
        setLimits(next) {
            limits = next;
            set(value, false);
            draw();
        },
        layout(width) {
            const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5));
            const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0;
            const d = config.size && config.size > 0 ? config.size : width - pad * 2;
            radius = Math.max(12, d / 2 - 10);
            cx = pad + d / 2;
            cy = capH + pad + radius + 10;
            if (config.label) {
                base.caption.setAttribute('x', String(pad));
                base.caption.setAttribute('y', String(Math.round(w3dTheme.fontSize * 0.9)));
            }
            rowHeight = capH + pad * 2 + radius * 2 + 20;
            draw();
            return rowHeight;
        },
        hitTest(x, y) {
            return Math.hypot(x - cx, y - cy) <= radius + 12;
        },
        handle(kind, x, y) {
            if (kind === 'down')
                dragging = true;
            if (!dragging)
                return;
            set(angleOf(cx, cy, x, y), true);
            if (kind === 'up') {
                dragging = false;
                config.handleCommit?.(value);
            }
        },
    };
    return api;
}
/** Dial a direction and a width together. */
export function arc3d(config = {}) {
    const limits = () => ({
        minWidth: config.minWidth,
        maxWidth: config.maxWidth,
        envelope,
    });
    let envelope = config.envelope ?? FULL_CIRCLE;
    let value = clampArc(config.value ?? arcOf(0, 90), limits());
    let grip = null;
    const base = dialBase(config.label);
    let cx = 0;
    let cy = 0;
    let radius = 1;
    let rowHeight = 0;
    const change = handlerOf(config, 'handleChange', 'onChange');
    const draw = () => {
        base.ring.setAttribute('cx', String(cx));
        base.ring.setAttribute('cy', String(cy));
        base.ring.setAttribute('r', String(radius));
        drawTicks(base.ticks, cx, cy, radius);
        const blockedArc = arcComplement(envelope);
        base.blocked.setAttribute('d', blockedArc ? sectorPath(cx, cy, radius, blockedArc) : '');
        base.fill.setAttribute('d', sectorPath(cx, cy, radius, value));
        while (base.grips.firstChild)
            base.grips.removeChild(base.grips.firstChild);
        for (const [angle, r] of [
            [arcStart(value), 5],
            [arcEnd(value), 5],
            [value.centre, 6],
        ]) {
            const [gx, gy] = pointAt(cx, cy, radius, angle);
            base.grips.appendChild(gripDot(gx, gy, r, w3dTheme.accent));
        }
    };
    const set = (next, live) => {
        const settled = clampArc(next, limits());
        if (settled.centre === value.centre && settled.width === value.width)
            return;
        value = settled;
        draw();
        if (live)
            change?.(value);
    };
    const api = {
        el: base.el,
        get value() {
            return { ...value };
        },
        setValue(next) {
            set(next, false);
        },
        setEnvelope(next) {
            envelope = next;
            // Re-clamping is the point: a new placement can make the current arc
            // illegal, and leaving it illegal would be a control that lies.
            set(value, false);
            draw();
        },
        layout(width) {
            const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5));
            const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0;
            const d = config.size && config.size > 0 ? config.size : width - pad * 2;
            radius = Math.max(12, d / 2 - 10);
            cx = pad + d / 2;
            cy = capH + pad + radius + 10;
            if (config.label) {
                base.caption.setAttribute('x', String(pad));
                base.caption.setAttribute('y', String(Math.round(w3dTheme.fontSize * 0.9)));
            }
            rowHeight = capH + pad * 2 + radius * 2 + 20;
            draw();
            return rowHeight;
        },
        hitTest(x, y) {
            return Math.hypot(x - cx, y - cy) <= radius + 12;
        },
        handle(kind, x, y) {
            const angle = angleOf(cx, cy, x, y);
            if (kind === 'down') {
                /*
                THE GRIP IS DECIDED AT THE PRESS AND HELD.
        
                Re-deciding per frame means the drag changes meaning under your hand as
                the edges move — widen a little and the centre becomes the nearest grip,
                and the gesture silently turns into a rotation. Latched, a drag is
                whatever you grabbed until you let go.
        
                A press inside the ring but on no grip does nothing, rather than jumping
                the nearest edge to the pointer. On a dial, "somewhere in the middle" is
                most of the target area, and a jump there is not undoable by letting go.
                */
                grip = nearestArcGrip(value, angle, 14);
            }
            if (grip == null)
                return;
            set(dragArc(value, grip, angle, limits()), true);
            if (kind === 'up') {
                grip = null;
                config.handleCommit?.(value);
            }
        },
    };
    return api;
}
//# sourceMappingURL=angle-field.js.map