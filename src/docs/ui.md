# UI

**One UI that renders twice.** Every control here is a `Widget3d`: it draws to
SVG and takes pointer input as *coordinates*, never as DOM events. That single
choice is what lets the same object be a flat overlay, a texture on a panel in
the scene, and something you poke with a controller in a headset — without a
second implementation, and so without the two drifting apart.

The pieces, roughly outermost first:

- **[widgets3d](/widgets3d/)** — the controls (`panel3d`, `slider3d`, `toggle3d`,
  `select3d`, `button3d`, `list3d`, `row3d`, `label3d`) and the `Widget3d`
  contract they all satisfy.
- **[box](/box/)** and **[surface](/surface/)** — the containers. A box wraps,
  scrolls and traverses; a surface adds an overlay layer for menus and panels.
- **[popup-surface](/popup-surface/)** — a popup is *another surface*, on its own
  plane. Depth replaces z-index, and tearing one off is re-parenting rather than
  new machinery.
- **Editors** — [vector-field](/vector-field/) (a coordinate on one row),
  [curve-field](/curve-field/) and [footprint-field](/footprint-field/) (author a
  terrain province), [icon-grid](/icon-grid/) (segmented select, tool palette and
  mode picker in one), [keyboard](/keyboard/), [table](/table/).
- **[w3d-theme](/w3d-theme/)** — the tokens everything reads, and
  [theme-editor](/theme-editor/) to push them around live.

Below the fold: the pure models and support modules — geometry, layout maths,
text editing — which have no demos because they have no pixels.

## Kitchen sink

Every family at once, flat and on a plane, bound to the same state. Type in the
field (the ⌨ glyph toggles the on-screen keyboard), drag the curve, pick a tool.

```js
import {
  b3d, b3dLight, panelScene, panel3d, label3d, slider3d, toggle3d, select3d,
  button3d, row3d, vector3d, curve3d, iconGrid3d, ui,
} from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const out = pre({ style: { margin: '8px 16px', color: '#8ea', font: '12px ui-monospace,monospace' } }, '')
const state = {
  name: 'scout',
  speed: 40,
  lights: true,
  material: 'matte',
  pos: { x: 0, y: 1.8, z: -4 },
  tool: 'move',
}
const show = () => {
  out.textContent =
    `name ${state.name}   speed ${state.speed}   lights ${state.lights}\n` +
    `material ${state.material}   tool ${state.tool}\n` +
    `pos ${state.pos.x}, ${state.pos.y}, ${state.pos.z}`
}

// The field is near the TOP on purpose: the on-screen keyboard opens below it,
// and refuses if there is not room — so a field at the bottom of a panel shows
// an inert glyph.
const nameField = ui.inputField({ value: state.name, onChange: (v) => { state.name = v; show() } })

const TOOLS = [
  { icon: 'move', label: 'move' },
  { icon: 'rotateCw', label: 'turn' },
  { icon: 'resize', label: 'scale' },
  { icon: 'trash', label: 'delete' },
]

const panel = panel3d(
  { width: 320, height: 460 },
  label3d({ text: 'Kitchen sink', bold: true }),
  label3d({ text: 'name — tap the ⌨ glyph', muted: true, compact: true }),
  nameField,
  slider3d({ label: 'speed', value: state.speed, min: 0, max: 100, showValue: 'always', onChange: (v) => { state.speed = v; show() } }),
  toggle3d({ label: 'lights', value: state.lights, onChange: (v) => { state.lights = v; show() } }),
  select3d({
    label: 'material',
    value: state.material,
    options: ['matte', 'gloss', 'metal', 'glass'],
    onChange: (v) => { state.material = v; show() },
  }),
  label3d({ text: 'position', muted: true, compact: true }),
  vector3d({ value: state.pos, step: 0.25, scrub: 0.02, onChange: (v) => { state.pos = v; show() } }),
  label3d({ text: 'tool', muted: true, compact: true }),
  iconGrid3d({
    items: TOOLS, mode: 'radio', selected: 0,
    onSelect: ([i]) => { state.tool = TOOLS[i].label; show() },
  }),
  curve3d({ kind: 'profile', label: 'response curve', aspect: 0.4 }),
  row3d({},
    button3d({ label: 'Reset', onClick: () => { state.speed = 40; show() } }),
    button3d({ label: 'Apply', onClick: () => { state.tool = 'applied'; show() } })
  )
)
show()

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.4 } })
const scene = b3d(
  { style: { flex: 1, minWidth: 0, borderRadius: 8, overflow: 'hidden' }, sceneCreated },
  b3dLight({ intensity: 1 }),
  plane
)

// The flat presentation's own popup layer: a positioned sibling ABOVE the panel,
// outside its <svg>, so a keyboard is not cropped by the panel it belongs to.
// `panelScene` adds the scene's layer (a plane) separately — a popup opens in
// both, because the panel is on screen twice.
const flatHost = div({ style: { flex: '0 0 320px', overflow: 'visible' } }, panel)

preview.append(
  div(
    { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    div(
      { style: { display: 'flex', gap: 20, flex: 1, minHeight: 0, padding: 14 } },
      flatHost,
      div({ style: { display: 'flex', flex: 1, minWidth: 0 } }, scene)
    ),
    out
  )
)
panel.useDomLayer(flatHost)
```
```css
.preview {
  height: 100%;
}
```

<!-- toc -->
- [widgets3d](/widgets3d/)
- [box](/box/)
- [keyboard](/keyboard/)
- [table](/table/)
- [svg-icons](/svg-icons/)
- [selection](/selection/)
- [Coordinate fields](/vector-field/)
- [Curve editor](/curve-field/)
- [Footprint editor](/footprint-field/)
- [Icon grid](/icon-grid/)
- [Light program editor](/curve-program/)
- [Light editor](/light-editor/)
- [Light settings (data)](/light-settings/)
- [theme-editor](/theme-editor/)
- [w3d-theme](/w3d-theme/)
- [surface](/surface/)
- [popup-surface](/popup-surface/)
- [b3d-panel](/b3d-panel/)
- [b3d-svg-plane](/b3d-svg-plane/)
- [b3d-hud](/b3d-hud/)
- [svg-texture](/svg-texture/)
- [dialog-placement](/dialog-placement/)
- [embed-font](/embed-font/)
- [flow-layout](/flow-layout/)
- [key-layout](/key-layout/)
- [popup-chrome](/popup-chrome/)
- [rounded-rect](/rounded-rect/)
- [table-layout](/table-layout/)
- [text-edit](/text-edit/)
- [Widget layout maths](/widgets3d-layout/)
- [widget-box](/widget-box/)
<!-- /toc -->
