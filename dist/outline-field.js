/*#
# outline field

**Polygons drawn over a body's front view.** The drawing half of
[garment-cut](/garment-cut/): the body's silhouette, and the outlines a
garment is cut along, clicked out point by point.

- **Click** to place points; click the first one again to close the shape.
- **Drag** a point to move it; press on an edge to add a point there.
- `removeSelected()` deletes the last point touched (a button, since a
  controller has no reliable third gesture); a shape left with fewer than
  three points goes too. `clear()` removes everything.

Symmetry is on by default: you draw the character's left (on your right),
and the other side is drawn faint. A point dropped near the centre line snaps
onto it, and a shape with an edge on the centre line is one garment across
the body (trousers); any other is mirrored as a pair (gloves).
`mirrorOutline(field.value)` makes the polygons `cutGarment` takes.

It is an ordinary scene-panel control, so it works on a page, in the scene
and in a headset alike.

## Usage

```javascript
import { outlineField3d, mirrorOutline, cutGarment } from 'tosijs-3d'

const field = outlineField3d({
  positions, indices,   // the body, as triangles (left on +X, facing +Z)
  value: halves,        // half outlines, [x, y] on the +X side
  handleCommit: (halves) => recut(mirrorOutline(halves)),
})
```
*/
/*{ "parent": "garment-cut", "order": 10 }*/
import { svgElements } from 'tosijs';
import { rigSilhouette } from './rig-fit.js';
import { mirrorOutline } from './garment-cut.js';
import { w3dTheme } from './w3d-theme.js';
const { g, rect, path, circle, text } = svgElements;
const copy = (v) => v.map((s) => s.map((p) => [p[0], p[1]]));
/** The body's front view with garment outlines drawn over it. */
export function outlineField3d(config) {
    const front = rigSilhouette(config.positions, config.indices, 'front');
    // Room around the body, so an outline can reach past it: one drawn to the
    // edge of the soles, the hands or the crown would leave them uncovered.
    const MARGIN = 0.04;
    const view = {
        min: { u: front.min.u - MARGIN, v: front.min.v - MARGIN },
        max: { u: front.max.u + MARGIN, v: front.max.v + MARGIN },
    };
    const symmetry = config.symmetry ?? true;
    let shapes = copy(config.value ?? []);
    // The shape being clicked out, not yet closed (index into shapes), if any.
    let open = null;
    let dragging = null;
    let selected = null;
    let hovered = null;
    const el = g();
    const bg = rect({ rx: 4, ry: 4 });
    const body = path({ 'data-outline-body': '' });
    const centre = path({ fill: 'none' });
    const ghosts = path({ fill: 'none' });
    const lines = g();
    const dots = g();
    const caption = text({
        'font-family': w3dTheme.fontFamily,
        'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
        fill: w3dTheme.muted,
    });
    for (const n of [bg, body, centre, ghosts, lines, dots, caption])
        el.appendChild(n);
    const HANDLE = 4;
    const GRAB = 14;
    // A point this close to the centre line (px) snaps onto it.
    const SNAP = 8;
    let scale = 1;
    let top = 0;
    let left = 0;
    let viewW = 0;
    let viewH = 0;
    const fx = (x) => left + (x - view.min.u) * scale;
    const py = (y) => top + (view.max.v - y) * scale;
    const toX = (px) => view.min.u + (px - left) / scale;
    const toY = (pv) => view.max.v - (pv - top) / scale;
    const place = (px, pv) => {
        let x = Math.max(view.min.u, Math.min(view.max.u, toX(px)));
        const y = Math.max(view.min.v, Math.min(view.max.v, toY(pv)));
        if (symmetry) {
            x = Math.abs(x);
            if (x * scale < SNAP)
                x = 0;
        }
        return [x, y];
    };
    const pointsPath = (pts, closed) => pts.length === 0
        ? ''
        : 'M' +
            pts
                .map(([x, y]) => `${fx(x).toFixed(1)} ${py(y).toFixed(1)}`)
                .join('L') +
            (closed ? 'Z' : '');
    const draw = () => {
        bg.setAttribute('x', String(left - 4));
        bg.setAttribute('y', String(top - 4));
        bg.setAttribute('width', String(viewW + 8));
        bg.setAttribute('height', String(viewH + 8));
        bg.setAttribute('fill', w3dTheme.rowBg);
        bg.setAttribute('stroke', w3dTheme.divider);
        bg.setAttribute('stroke-width', String(w3dTheme.strokeWidth));
        body.setAttribute('d', front.runs
            .map((r) => {
            const x0 = fx(r.u0).toFixed(1);
            const x1 = fx(r.u1).toFixed(1);
            return `M${x0} ${py(r.v + front.cell).toFixed(1)}H${x1}V${py(r.v).toFixed(1)}H${x0}Z`;
        })
            .join(''));
        body.setAttribute('fill', w3dTheme.muted);
        body.setAttribute('fill-opacity', '0.45');
        centre.setAttribute('d', `M${fx(0)} ${top}V${top + viewH}`);
        centre.setAttribute('stroke', w3dTheme.divider);
        centre.setAttribute('stroke-dasharray', '3 3');
        // The mirrored side, faint: what the garment will be.
        const closed = shapes.filter((_, i) => i !== open);
        ghosts.setAttribute('d', symmetry
            ? mirrorOutline(closed)
                .map((p) => pointsPath(p, true))
                .join('')
            : '');
        ghosts.setAttribute('stroke', w3dTheme.accent);
        ghosts.setAttribute('stroke-opacity', '0.35');
        ghosts.setAttribute('fill', w3dTheme.accent);
        ghosts.setAttribute('fill-opacity', '0.12');
        while (lines.firstChild)
            lines.removeChild(lines.firstChild);
        while (dots.firstChild)
            dots.removeChild(dots.firstChild);
        shapes.forEach((s, si) => {
            lines.appendChild(path({
                d: pointsPath(s, si !== open),
                fill: si === open ? 'none' : w3dTheme.accent,
                'fill-opacity': '0.2',
                stroke: w3dTheme.accent,
                'stroke-width': '1.5',
            }));
            s.forEach(([x, y], pi) => {
                const on = (selected?.s === si && selected.p === pi) ||
                    (hovered?.s === si && hovered.p === pi);
                dots.appendChild(circle({
                    cx: fx(x),
                    cy: py(y),
                    r: on ? HANDLE + 1.5 : HANDLE,
                    fill: si === open && pi === 0 ? w3dTheme.text : w3dTheme.accent,
                    stroke: on ? w3dTheme.text : w3dTheme.panelBg,
                    'stroke-width': String(on ? 2 : 1),
                }));
            });
        });
        caption.textContent =
            open != null
                ? 'Click the first point to close'
                : shapes.length
                    ? 'Drag a point, or press an edge to add one'
                    : 'Click out an outline';
    };
    const emit = (name) => {
        api[name]?.(copy(shapes));
    };
    const pointAt = (px, pv) => {
        let best = null;
        let bestD = GRAB * GRAB;
        shapes.forEach((s, si) => s.forEach(([x, y], pi) => {
            const d = (fx(x) - px) ** 2 + (py(y) - pv) ** 2;
            if (d <= bestD) {
                bestD = d;
                best = { s: si, p: pi };
            }
        }));
        return best;
    };
    /** The closed shape's edge under the pointer: insert after point `p`. */
    const edgeAt = (px, pv) => {
        let best = null;
        let bestD = (GRAB * 0.6) ** 2;
        shapes.forEach((s, si) => {
            if (si === open)
                return;
            for (let i = 0; i < s.length; i++) {
                const ax = fx(s[i][0]);
                const ay = py(s[i][1]);
                const bx = fx(s[(i + 1) % s.length][0]);
                const by = py(s[(i + 1) % s.length][1]);
                const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
                const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pv - ay) * (by - ay)) / l2));
                const d = (ax + t * (bx - ax) - px) ** 2 + (ay + t * (by - ay) - pv) ** 2;
                if (d < bestD) {
                    bestD = d;
                    best = { s: si, p: i };
                }
            }
        });
        return best;
    };
    const api = {
        el,
        symmetry,
        handleChange: config.handleChange,
        handleCommit: config.handleCommit,
        layout(width) {
            const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5));
            const capH = Math.round(w3dTheme.fontSize * 1.3);
            const W = view.max.u - view.min.u || 1;
            const H = view.max.v - view.min.v || 1;
            scale = Math.max(0.01, Math.min((width - pad * 2 - 8) / W, (config.maxHeight ?? 260) / H));
            viewW = W * scale;
            viewH = H * scale;
            left = pad + 4 + Math.max(0, (width - pad * 2 - 8 - viewW) / 2);
            top = 6;
            caption.setAttribute('x', String(pad));
            caption.setAttribute('y', String(top + viewH + 6 + capH * 0.85));
            draw();
            return top + viewH + 6 + capH + pad;
        },
        handle(kind, x, y) {
            if (kind === 'down') {
                const hit = pointAt(x, y);
                if (open != null) {
                    const s = shapes[open];
                    if (hit && hit.s === open && hit.p === 0 && s.length >= 3) {
                        // Closed.
                        open = null;
                        selected = null;
                        draw();
                        emit('handleCommit');
                        return;
                    }
                    s.push(place(x, y));
                    selected = { s: open, p: s.length - 1 };
                    draw();
                    return;
                }
                if (hit) {
                    dragging = hit;
                    selected = hit;
                    draw();
                    return;
                }
                const edge = edgeAt(x, y);
                if (edge) {
                    shapes[edge.s].splice(edge.p + 1, 0, place(x, y));
                    dragging = { s: edge.s, p: edge.p + 1 };
                    selected = dragging;
                    draw();
                    return;
                }
                shapes.push([place(x, y)]);
                open = shapes.length - 1;
                selected = { s: open, p: 0 };
                draw();
                return;
            }
            if (kind === 'move' || kind === 'hover') {
                if (dragging) {
                    shapes[dragging.s][dragging.p] = place(x, y);
                    draw();
                    emit('handleChange');
                    return;
                }
                const was = hovered;
                hovered = pointAt(x, y);
                if (hovered?.s !== was?.s || hovered?.p !== was?.p)
                    draw();
                return;
            }
            if (kind === 'up' || kind === 'leave') {
                const was = dragging;
                dragging = null;
                if (kind === 'leave')
                    hovered = null;
                draw();
                if (was)
                    emit('handleCommit');
            }
        },
        hitTest(x, y) {
            return (x >= left - 4 &&
                x <= left + viewW + 4 &&
                y >= top - 4 &&
                y <= top + viewH + 4);
        },
        get value() {
            return copy(shapes);
        },
        get polygons() {
            const closed = shapes.filter((s, i) => i !== open && s.length >= 3);
            return symmetry ? mirrorOutline(closed) : copy(closed);
        },
        setValue(v) {
            shapes = copy(v);
            open = null;
            selected = dragging = hovered = null;
            draw();
        },
        removeSelected() {
            if (selected == null)
                return;
            const s = shapes[selected.s];
            s.splice(selected.p, 1);
            const isOpen = selected.s === open;
            if ((!isOpen && s.length < 3) || s.length === 0) {
                shapes.splice(selected.s, 1);
                if (isOpen)
                    open = null;
                else if (open != null && open > selected.s)
                    open--;
            }
            selected = null;
            draw();
            emit('handleCommit');
        },
        clear() {
            shapes = [];
            open = null;
            selected = dragging = hovered = null;
            draw();
            emit('handleCommit');
        },
    };
    return api;
}
//# sourceMappingURL=outline-field.js.map