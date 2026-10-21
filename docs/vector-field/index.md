# Coordinate fields

**A coordinate on ONE row.** `vector3d` edits an `{x, y, z}`; `euler3d` edits an
orientation in degrees. Both are [[widgets3d|Widget3d]]s, so they drop into a
`panel3d` beside a slider or a button and work identically flat, in-scene and in
VR.

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
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', panel),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
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

> Drag any number left or right to scrub it. It is one control on one row, so a
> coordinate stays a coordinate rather than three fields that happen to sit near
> each other — and the 3D pane is the same widget, not a picture of it.

## Why this exists

Three stacked labelled fields is the obvious way to edit a coordinate, and it is
the reason an inspector panel ends up three times taller than it needs to be.

A coordinate is **one value**, not three, and it should occupy one row. That is
also why the axis letter is drawn *inside* the row rather than as its own label
column — a column of `x:` `y:` `z:` labels costs more width than the numbers do,
and every 3D tool worth using puts the letter against the field.

## Degrees, and why `euler3d` is a separate function

`euler3d` is `vector3d` with the angle rules applied, not a styling variant: it
**wraps** (181° is −179°, and dragging through the bottom of a turn should not
stop), and it is **degrees**. The library's rule is that an angle with no `Deg`
sibling is already degrees, so the bare `value` needs no conversion.

Wrapping is the whole difference and it is not a detail — a wrapping value with a
`min`/`max` clamp fights you at exactly the angles you most want to scrub
through.

## Focus and typing

The fields are exposed as `fields` so a
[[keyboard|fieldGroup]] can wire focus traversal and an on-screen keyboard across
a whole panel. A vector row is three tab stops, not one, because that is what it
is to a person filling it in.
