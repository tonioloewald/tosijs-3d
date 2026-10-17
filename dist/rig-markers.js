/*#
# rig markers

**Where the auto-rig's eight markers go, dragged over the mesh.** Mixamo's
auto-rigger asks for eight points on a front view (chin, wrists, elbows,
knees, groin) and works the skeleton out from them. `markerField3d` is that
step: the mesh's front silhouette with the markers on it, dragged where the
joints are. A tail tip, which a front view cannot see, gets a side view
beside it. Symmetry is on by default, so a wrist placed on one side places
the other.

It is an ordinary scene-panel control, so it works on a page, in the scene
and in a headset alike. The [auto-rig](/rig-build/) page uses it: pick a
character, drag a marker, and the character is fitted, bound and walking
again when you let go.

## Usage

```javascript
import { markerField3d, fitSkeleton, meshQuery } from 'tosijs-3d'

const field = markerField3d({
  positions, indices,        // the mesh, as triangles (objTriangles reads an OBJ)
  value: markers,            // or leave it out: guessMarkers places them
  tail: { x: 0, y: 0.5, z: -0.9 },   // a tail tip, or leave it out
  handleCommit: (markers, tail) => refit(markers, tail),
})
```

`handleChange` fires as a marker moves; `handleCommit` once, when it is let
go. Fitting and binding take a fraction of a second, so they belong on commit.

## The guess

`guessMarkers(silhouette)` reads the front silhouette:
- **groin:** the crotch, the first filled point going up the centre line;
- **wrists and elbows:** the widest row of the upper body (the arms of a
  T-pose);
- **knees:** the middle of each leg, a little over halfway from the floor to
  the crotch;
- **chin:** the narrowest row between the arms and the top of the head (the
  neck).

It is a starting point to drag from, not a fit. A tail that hangs between
the legs hides the crotch, and an A-pose has no widest row of arms; both
fall back to proportions.

## Coordinates

Markers are in the mesh's own units and frame, as `fitSkeleton` takes them:
the character faces +Z with its left on +X, so in the front view its left is
on your right. The side view has +Z (the front) on the right.
*/
/*{ "parent": "rig-build", "order": 10 }*/
import { svgElements } from 'tosijs';
import { MARKER_NAMES, guessMarkers, rigSilhouette, } from './rig-fit.js';
import { w3dTheme } from './w3d-theme.js';
import { handlerOf } from './handler-of.js';
const { g, rect, path, circle, text } = svgElements;
/** What each marker is called, for the caption. */
export const MARKER_LABELS = {
    chin: 'Chin',
    groin: 'Groin',
    wristL: 'Left wrist',
    wristR: 'Right wrist',
    elbowL: 'Left elbow',
    elbowR: 'Right elbow',
    kneeL: 'Left knee',
    kneeR: 'Right knee',
    tail: 'Tail tip',
};
const MARKER_COLORS = {
    chin: '#f2c14e',
    groin: '#f2c14e',
    wrist: '#4ec3f2',
    elbow: '#7be38a',
    knee: '#f28a4e',
    tail: '#d98cf2',
};
const colorOf = (name) => MARKER_COLORS[name.replace(/[LR]$/, '')] ?? w3dTheme.accent;
/** The other side's marker, for symmetry. */
const MIRROR = {
    wristL: 'wristR',
    wristR: 'wristL',
    elbowL: 'elbowR',
    elbowR: 'elbowL',
    kneeL: 'kneeR',
    kneeR: 'kneeL',
};
/**
 * The marker step of the auto-rig: a front view (and, with a tail, a side
 * view) of the mesh with the markers on it, dragged where the joints are.
 */
export function markerField3d(config) {
    const front = rigSilhouette(config.positions, config.indices, 'front');
    const side = rigSilhouette(config.positions, config.indices, 'side');
    const copy = (m) => Object.fromEntries(MARKER_NAMES.map((n) => [n, { ...m[n] }]));
    let markers = copy(config.value ?? guessMarkers(front));
    let tail = config.tail ? { ...config.tail } : null;
    let dragging = null;
    let hovered = null;
    const el = g();
    const frontBg = rect({ rx: 4, ry: 4 });
    const sideBg = rect({ rx: 4, ry: 4 });
    const frontShape = path({ 'data-rig-silhouette': 'front' });
    const sideShape = path({ 'data-rig-silhouette': 'side' });
    const centre = path({ fill: 'none' });
    const dots = g({ 'data-rig-markers': '' });
    const caption = text({
        'font-family': w3dTheme.fontFamily,
        'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
        fill: w3dTheme.muted,
    });
    for (const n of [
        frontBg,
        sideBg,
        frontShape,
        sideShape,
        centre,
        dots,
        caption,
    ])
        el.appendChild(n);
    const HANDLE = 5;
    const GRAB = 18;
    // Geometry from the last layout: mesh units → widget px.
    let scale = 1;
    let top = 0;
    let frontX = 0;
    let sideX = 0;
    let viewH = 0;
    const hasSide = () => tail != null;
    const fx = (x) => frontX + (x - front.min.u) * scale;
    const sx = (z) => sideX + (z - side.min.u) * scale;
    const py = (y) => top + (front.max.v - y) * scale;
    const toY = (pyv) => front.max.v - (pyv - top) / scale;
    const shapePath = (s, toU) => s.runs
        .map((r) => {
        const x0 = toU(r.u0).toFixed(1);
        const x1 = toU(r.u1).toFixed(1);
        const y0 = py(r.v + s.cell).toFixed(1);
        const y1 = py(r.v).toFixed(1);
        return `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
    })
        .join('');
    const points = () => {
        const out = MARKER_NAMES.map((n) => ({
            key: n,
            view: 'front',
            x: fx(markers[n].x),
            y: py(markers[n].y),
        }));
        if (tail) {
            out.push({ key: 'tail', view: 'front', x: fx(tail.x), y: py(tail.y) });
            out.push({ key: 'tail', view: 'side', x: sx(tail.z), y: py(tail.y) });
        }
        return out;
    };
    const nearest = (x, y) => {
        let best = null;
        let bestD = GRAB * GRAB;
        for (const p of points()) {
            const d = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (d <= bestD) {
                bestD = d;
                best = p;
            }
        }
        return best;
    };
    const draw = () => {
        const frontW = (front.max.u - front.min.u) * scale;
        const sideW = (side.max.u - side.min.u) * scale;
        for (const [bg, x, w, show] of [
            [frontBg, frontX, frontW, true],
            [sideBg, sideX, sideW, hasSide()],
        ]) {
            bg.setAttribute('x', String(x - 4));
            bg.setAttribute('y', String(top - 4));
            bg.setAttribute('width', String(w + 8));
            bg.setAttribute('height', String(viewH + 8));
            bg.setAttribute('fill', w3dTheme.rowBg);
            bg.setAttribute('stroke', w3dTheme.divider);
            bg.setAttribute('stroke-width', String(w3dTheme.strokeWidth));
            bg.setAttribute('display', show ? 'inline' : 'none');
        }
        for (const [shape, d, show] of [
            [frontShape, shapePath(front, fx), true],
            [sideShape, hasSide() ? shapePath(side, sx) : '', hasSide()],
        ]) {
            shape.setAttribute('d', d);
            shape.setAttribute('fill', w3dTheme.muted);
            shape.setAttribute('fill-opacity', '0.45');
            shape.setAttribute('display', show ? 'inline' : 'none');
        }
        centre.setAttribute('d', `M${fx(0)} ${top}V${top + viewH}`);
        centre.setAttribute('stroke', w3dTheme.divider);
        centre.setAttribute('stroke-dasharray', '3 3');
        while (dots.firstChild)
            dots.removeChild(dots.firstChild);
        const active = dragging?.key ?? hovered;
        for (const p of points()) {
            const on = p.key === active;
            dots.appendChild(circle({
                cx: p.x,
                cy: p.y,
                r: on ? HANDLE + 1.5 : HANDLE,
                fill: colorOf(p.key),
                stroke: on ? w3dTheme.text : w3dTheme.panelBg,
                'stroke-width': String(on ? 2 : 1.5),
            }));
        }
        caption.textContent = active
            ? MARKER_LABELS[active]
            : 'Drag each marker onto its joint';
    };
    const emit = (name) => {
        const cb = api[name] ??
            handlerOf(api, name, name === 'handleChange' ? 'onChange' : 'onCommit');
        cb?.(copy(markers), tail ? { ...tail } : null);
    };
    const clampX = (x) => Math.max(front.min.u, Math.min(front.max.u, x));
    const clampY = (y) => Math.max(front.min.v, Math.min(front.max.v, y));
    const moveTo = (x, y) => {
        if (dragging == null)
            return;
        const { key, view } = dragging;
        const my = clampY(toY(y));
        if (key === 'tail') {
            if (!tail)
                return;
            if (view === 'side') {
                const z = side.min.u + (x - sideX) / scale;
                tail = {
                    ...tail,
                    y: my,
                    z: Math.max(side.min.u, Math.min(side.max.u, z)),
                };
            }
            else {
                const mx = clampX(front.min.u + (x - frontX) / scale);
                tail = { ...tail, x: api.symmetry ? 0 : mx, y: my };
            }
            return;
        }
        let mx = clampX(front.min.u + (x - frontX) / scale);
        const other = MIRROR[key];
        if (api.symmetry) {
            if (other == null)
                mx = 0; // chin and groin sit on the centre line
            // The left stays on the left, so the pair cannot cross.
            else if (key.endsWith('L'))
                mx = Math.max(0, mx);
            else
                mx = Math.min(0, mx);
        }
        markers[key] = { x: mx, y: my };
        if (api.symmetry && other)
            markers[other] = { x: -mx, y: my };
    };
    const api = {
        el,
        symmetry: config.symmetry ?? true,
        handleChange: config.handleChange,
        handleCommit: config.handleCommit,
        layout(width) {
            const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5));
            const gap = hasSide() ? 14 : 0;
            const capH = Math.round(w3dTheme.fontSize * 1.3);
            const units = front.max.u - front.min.u + (hasSide() ? side.max.u - side.min.u : 0);
            const H = front.max.v - front.min.v || 1;
            const maxH = config.maxHeight ?? 200;
            scale = Math.max(0.01, Math.min((width - pad * 2 - gap - 8) / (units || 1), maxH / H));
            viewH = H * scale;
            const used = units * scale + gap;
            frontX = pad + 4 + Math.max(0, (width - pad * 2 - 8 - used) / 2);
            sideX = frontX + (front.max.u - front.min.u) * scale + gap;
            top = 6;
            caption.setAttribute('x', String(pad));
            caption.setAttribute('y', String(top + viewH + 6 + capH * 0.85));
            draw();
            return top + viewH + 6 + capH + pad;
        },
        handle(kind, x, y) {
            if (kind === 'down') {
                const hit = nearest(x, y);
                dragging = hit ? { key: hit.key, view: hit.view } : null;
                draw();
                return;
            }
            if (kind === 'move' || kind === 'hover') {
                if (dragging) {
                    moveTo(x, y);
                    draw();
                    emit('handleChange');
                    return;
                }
                const was = hovered;
                hovered = nearest(x, y)?.key ?? null;
                if (hovered !== was)
                    draw();
                return;
            }
            if (kind === 'up') {
                const was = dragging;
                dragging = null;
                draw();
                if (was)
                    emit('handleCommit');
                return;
            }
            if (kind === 'leave') {
                const was = dragging;
                dragging = null;
                hovered = null;
                draw();
                if (was)
                    emit('handleCommit');
            }
        },
        hitTest(x, y) {
            return y >= top - 4 && y <= top + viewH + 4 && x >= frontX - 4;
        },
        get markers() {
            return copy(markers);
        },
        get tail() {
            return tail ? { ...tail } : null;
        },
        get active() {
            return dragging?.key ?? hovered;
        },
        guess() {
            markers = guessMarkers(front);
            draw();
            emit('handleChange');
            emit('handleCommit');
        },
        setMarkers(m, t) {
            markers = copy(m);
            if (t !== undefined)
                tail = t ? { ...t } : null;
            draw();
        },
    };
    return api;
}
//# sourceMappingURL=rig-markers.js.map