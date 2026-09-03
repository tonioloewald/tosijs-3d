/*#
# Coordinate fields

**A coordinate on ONE row.** `vector3d` edits an `{x, y, z}`; `euler3d` edits an
orientation in degrees. Both are [[widgets3d|Widget3d]]s, so they drop into a
`panel3d` beside a slider or a button and work identically flat, in-scene and in
VR.

## Why this exists

Three stacked labelled fields is the obvious way to edit a coordinate and it is
the reason an inspector panel ends up three times taller than it needs to be.
Tonio, on the adopter that prompted it: ensemble's UI is "an utter mess right now
because simple things like XYZ coords take up huge amounts of space".

A coordinate is **one value**, not three, and it should occupy one row. That is
also why the axis letter is drawn *inside* the row rather than as its own label
column — a column of `x:` `y:` `z:` labels costs more width than the numbers do,
and every 3D tool worth using puts the letter against the field.

## Degrees, and why `euler3d` is a separate function

`euler3d` is `vector3d` with the angle rules applied, not a styling variant: it
**wraps** (181° is −179°, and dragging through the bottom of a turn should not
stop), and it is **degrees**, which per CLAUDE.md's suffix rule means the bare
`value` is already degrees and no conversion is implied.

Wrapping is the whole difference and it is not a detail — a wrapping value with a
`min`/`max` clamp fights you at exactly the angles you most want to scrub
through.

## Focus and typing

The fields are exposed as `fields` so a
[[keyboard|fieldGroup]] can wire focus traversal and an on-screen keyboard across
a whole panel. A vector row is three tab stops, not one, because that is what it
is to a person filling it in.

## Demo

```js
import { b3d, b3dLight, panelScene, panel3d, label3d, vector3d, euler3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const readout = pre({ style: 'margin:8px 16px;color:#8ea;font:12px ui-monospace,monospace' }, '')
const state = { pos: { x: 1.5, y: 0, z: -3.25 }, rot: { x: 0, y: 45, z: 0 } }
const show = () => {
  readout.textContent =
    `position  ${state.pos.x}, ${state.pos.y}, ${state.pos.z}\n` +
    `rotation  ${state.rot.x}°, ${state.rot.y}°, ${state.rot.z}°`
}
show()

// panel3d takes its widgets as REST ARGS and returns the <svg> itself — it is
// both the DOM view and the texture source, and `handlePointer` hangs off it.
const panel = panel3d(
  { width: 300 },
  label3d({ text: 'position', muted: true, compact: true }),
  vector3d({
    value: state.pos,
    step: 0.25,
    scrub: 0.02,
    handleChange: (v) => { state.pos = v; show() },
  }),
  label3d({ text: 'rotation (degrees)', muted: true, compact: true }),
  euler3d({
    value: state.rot,
    step: 5,
    scrub: 0.5,
    handleChange: (v) => { state.rot = v; show() },
  })
)

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.2 } })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM — drag a number to scrub', panel),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture — same widget', scene)
    ),
    readout
  )
)
```
```css
.preview {
  height: 100%;
}
```
*/
/*{ "parent": "UI", "order": 250 }*/
import { svgElements } from 'tosijs';
import { inputField } from './keyboard';
import { w3dTheme } from './w3d-theme';
import { handlerOf } from './widgets3d';
const { g, text } = svgElements;
/** Trim to `precision`, then drop trailing zeros: `1.500` reads as `1.5`. */
function show(n, precision) {
    if (!Number.isFinite(n))
        return '0';
    const s = n.toFixed(precision);
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
/**
 * Wrap into `(-180, 180]`.
 *
 * Exported because it is the entire behavioural difference between `euler3d` and
 * `vector3d`, and a pure function with a stated range is worth pinning in a test
 * rather than trusting a modulo written from memory. JS `%` keeps the sign of the
 * dividend, so the naive form returns −180 for +180 and disagrees at exactly the
 * boundary you are most likely to hit by dragging.
 */
export function wrapDegrees(deg) {
    if (!Number.isFinite(deg))
        return 0;
    const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
    // The half-open end: +180 is the same orientation as −180, and a control that
    // flips sign as you cross the back of a turn reads as a glitch.
    return wrapped === -180 ? 180 : wrapped;
}
/** Shared builder — `vector3d` and `euler3d` differ only in how a value settles. */
function coordinateRow(config, settle) {
    const axes = config.axes ?? ['x', 'y', 'z'];
    const precision = config.precision ?? 3;
    const gap = config.gap ?? Math.max(4, Math.round(w3dTheme.spacing * 0.5));
    const fontSize = config.fontSize ?? w3dTheme.fontSize;
    const current = { ...(config.value ?? { x: 0, y: 0, z: 0 }) };
    const el = g();
    const keys = ['x', 'y', 'z'];
    /*
    The axis letter is drawn HERE, not inside the field.
  
    It has to sit in the row's own coordinate space so it can be positioned against
    the field it labels, and keeping it out of `inputField` means the field stays
    the general-purpose control it already is — a vector row is a composition, not
    a new kind of field.
    */
    const letters = axes.map((a) => text({
        'font-family': w3dTheme.fontFamily,
        'font-size': String(Math.round(fontSize * 0.85)),
        fill: w3dTheme.muted,
    }, a));
    const fields = keys.map((key, i) => inputField({
        type: 'number',
        value: show(current[key], precision),
        fontSize,
        height: config.height,
        step: config.step,
        scrub: config.scrub,
        // A wrapping value must NOT be clamped — see `euler3d`. The caller's
        // min/max only reaches a non-wrapping row.
        min: settle === identity ? config.min : undefined,
        max: settle === identity ? config.max : undefined,
        onChange: (raw) => {
            const n = Number(raw);
            if (!Number.isFinite(n))
                return;
            const v = settle(n);
            if (v === current[key])
                return;
            current[key] = v;
            // Write the settled value back when it differs from what was typed, so
            // `190` visibly becomes `-170` rather than being silently reinterpreted.
            if (v !== n)
                fields[i].setValue(show(v, precision));
            handlerOf(config, 'handleChange', 'onChange')?.({ ...current });
        },
    }));
    const wraps = fields.map((f) => {
        const wrap = g();
        wrap.appendChild(f.el);
        el.appendChild(wrap);
        return wrap;
    });
    letters.forEach((l) => el.appendChild(l));
    // Geometry from the last layout, so pointer routing uses exactly what was
    // drawn — the same rule `row3d` follows, and for the same reason.
    let cols = [];
    let rowHeight = 0;
    /*
    WHICH field is focused — the row is three tab stops, not one.
  
    The host tracks focus per WIDGET, so it can only tell this row "you are
    focused". Forwarding that to all three fields lit all three carets at once
    (six on a panel with a position and a rotation), and since the caret IS the
    focus indicator, that says focus is everywhere, which is the same as saying
    nothing. So the row keeps its own index and reflects the host's state onto
    exactly one field.
    */
    let active = 0;
    const at = (x, y) => {
        for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            if (x >= c.x && x <= c.x + c.width)
                return { i, lx: x - c.x, ly: y };
        }
        return null;
    };
    const api = {
        el,
        layout(width) {
            const letterW = Math.round(fontSize * 0.7);
            const cell = (width - gap * 2) / 3;
            const fieldW = Math.max(8, cell - letterW);
            cols = [];
            rowHeight = 0;
            keys.forEach((_, i) => {
                const cellX = i * (cell + gap);
                const h = fields[i].layout(fieldW);
                rowHeight = Math.max(rowHeight, h);
                cols.push({ x: cellX + letterW, width: fieldW });
                wraps[i].setAttribute('transform', `translate(${cellX + letterW}, 0)`);
            });
            letters.forEach((l, i) => {
                l.setAttribute('x', String(i * (cell + gap)));
                // Optical centring against the field, which owns its own height.
                l.setAttribute('y', String(Math.round(rowHeight / 2 + fontSize * 0.32)));
            });
            return rowHeight;
        },
        handle(kind, x, y) {
            const hit = at(x, y);
            if (hit == null)
                return;
            // A press is what moves focus between the fields, exactly as clicking one
            // input in a form row does — and the caret has to follow IMMEDIATELY.
            //
            // Pushing it only on the host's next `setState` left the previous field
            // lit: the host has no reason to call again, because the ROW's focus never
            // changed. Tonio: "blurred fields aren't consistently fading their carets
            // so the xyz field shows three carets in random states."
            if (kind === 'down' && active !== hit.i) {
                active = hit.i;
                api.setState?.({ hovered: false, pressed: true, focused: true });
            }
            fields[hit.i].handle?.(kind, hit.lx, hit.ly);
        },
        hitTest(x, y) {
            const hit = at(x, y);
            if (hit == null)
                return false;
            const f = fields[hit.i];
            return f.hitTest ? f.hitTest(hit.lx, hit.ly) : f.handle != null;
        },
        /*
        FORWARD THE HOST to the fields inside.
    
        `panel3d` hands a host to the widget it HOLDS, which here is the row — so the
        three fields never got one, and `inputField.openKeyboard` returns early
        without a host. Tonio: "I am not getting the keyboard for that field … and I
        guess you haven't implemented the numeric field keyboards yet." Both were the
        same omission: no host, so no keyboard, so never a numpad.
    
        Any composite widget has to do this. A widget that wraps others owns passing
        on what it was given.
        */
        setHost(h) {
            for (const f of fields)
                f.setHost?.(h);
        },
        setState(state) {
            fields.forEach((f, i) => {
                const mine = i === active;
                f.setState?.({
                    hovered: state.hovered && mine,
                    pressed: state.pressed && mine,
                    focused: state.focused && mine,
                });
            });
        },
        /*
        Left/right walks the axes; up/down escapes to the next row.
    
        Returning `false` is what hands focus back to the host, so a D-pad user
        traverses x → y → z and then leaves — rather than being trapped in a row or
        skipping two thirds of it. Same escape contract as `BoxChild.focusMove`.
        */
        focusMove(dx, dy) {
            if (dy !== 0)
                return false;
            if (dx === 0)
                return true;
            // Entry from the host seeds at the edge it arrived from, so coming back
            // leftwards lands on z rather than on x.
            const next = active + (dx > 0 ? 1 : -1);
            if (next < 0 || next > 2)
                return false;
            active = next;
            return true;
        },
        // A composite forwards what it was given — the same rule as `setHost`.
        setActive(v) {
            for (const f of fields)
                f.setActive?.(v);
        },
        focusClear() {
            active = 0;
            for (const f of fields) {
                f.setState?.({ hovered: false, pressed: false, focused: false });
            }
        },
        get value() {
            return { ...current };
        },
        setValue(v) {
            keys.forEach((key, i) => {
                const n = settle(v[key] ?? 0);
                current[key] = n;
                fields[i].setValue(show(n, precision));
            });
        },
        get fields() {
            return fields;
        },
    };
    return api;
}
/** Identity settle — a plain coordinate clamps (if asked) but never wraps. */
function identity(n) {
    return n;
}
/**
 * Edit an `{x, y, z}` on one row.
 *
 * ```js
 * vector3d({ value: { x: 1, y: 0, z: -3 }, step: 0.25, scrub: 0.02, handleChange: (v) => …  })
 * ```
 */
export function vector3d(config = {}) {
    return coordinateRow(config, identity);
}
/**
 * Edit an orientation on one row, in **degrees**.
 *
 * Values wrap into `(-180, 180]` rather than clamping — see `wrapDegrees`. Per
 * the project's angle rule, the bare `value` is already degrees: there is no
 * `Deg` sibling because there is no radian form to disambiguate from.
 *
 * ```js
 * euler3d({ value: { x: 0, y: 45, z: 0 }, step: 5, scrub: 0.5, handleChange: (v) => …  })
 * ```
 */
export function euler3d(config = {}) {
    return coordinateRow(config, wrapDegrees);
}
//# sourceMappingURL=vector-field.js.map