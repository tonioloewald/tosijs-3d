# Icon grid

**`iconGrid3d` — one control for a segmented select, a tool palette and a mode
picker.** A grid of icons with optional captions, as a `Widget3d`, so it works
flat, on an in-scene panel and in a headset unchanged.

## Demo

One grid per meaning, so the difference is visible rather than described. The
last one shows `change` imposing a rule the modes do not have.

```js
import { b3d, b3dLight, panelScene, panel3d, label3d, iconGrid3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const out = pre({ style: 'margin:8px 16px;color:#8ea;font:12px ui-monospace,monospace' }, '')
const state = { tool: 'move', shown: ['map'], log: '', tools: ['select', 'move'] }
const show = () => {
  out.textContent =
    `tool: ${state.tool}\nshown: ${state.shown.join(', ') || '(none)'}\n` +
    `tools: ${state.tools.join(' + ') || '(none)'}\n${state.log}`
}

const TOOLS = [
  { icon: 'move', label: 'move' },
  { icon: 'rotateCw', label: 'turn' },
  { icon: 'resize', label: 'scale' },
  { icon: 'trash', label: 'delete' },
]
const LAYERS = [
  { icon: 'map', label: 'map' },
  { icon: 'cloud', label: 'sky' },
  { icon: 'camera', label: 'cam' },
]
// A MENU CELL sits in the same strip as ordinary buttons. `load` opens actions
// instead of firing one, and because it has a `menu` it never joins the
// selection — so in a radio palette it cannot steal the lit slot from the
// active tool. Disabled items stay PRESENT: "revert" greys out when there is
// nothing to revert, rather than vanishing and reflowing the menu under you.
//
// `disabled` is a PREDICATE, which is what lets this array be a constant —
// declared once here and never rebuilt, yet always telling the truth about
// `state.log`. Toggle it with "copy" and re-open the menu to watch Revert wake
// up, without a line of rebuild-on-change plumbing anywhere.
const ACTIONS = [
  { icon: 'copy', label: 'copy' },
  { icon: 'downloadCloud', label: 'save' },
  {
    icon: 'uploadCloud',
    label: 'load',
    menu: [
      { label: 'Recent scene', icon: 'star' },
      { label: 'From file…', icon: 'uploadCloud' },
      { label: 'Revert', icon: 'rotateCcw', disabled: () => state.log === '' },
    ],
  },
]

// NO CAPTIONS, 2-D — which is the point of the control. Saving space is why you
// reach for a grid, and a caption is what forces a narrow column: without them
// the same items fit six across instead of four. (Tooltips are the missing half;
// see TODO — there is no hover in a headset, so it is not just a title attr.)
const PALETTE = [
  'move', 'rotateCw', 'resize', 'trash',
  'copy', 'camera', 'map', 'cloud',
  'star', 'compass', 'settings', 'bug',
].map((icon) => ({ icon }))

// THE RULE ENSEMBLE ACTUALLY WANTS, and it is none of the three modes.
//
// Tonio: "select move rotate scale, where scale turns off move and rotate, and
// move and rotate turn off scale but can coexist and select is independent."
//
// So: two mutually exclusive GROUPS that are each internally free, plus one
// member that ignores the whole arrangement. `checkbox` gets the coexistence and
// none of the exclusion; `radio` gets the exclusion and none of the coexistence.
// This is what `handleChange` is for — the grid owns layout, the consumer owns
// meaning.
//
// (Line comments: a block comment would close the enclosing `/*#` doc fence.
// Third time I have done that, hence the note.)
const TOOLBOX = [
  { icon: 'mousePointer', label: 'select' },
  { icon: 'move', label: 'move' },
  { icon: 'rotateCw', label: 'rotate' },
  { icon: 'resize', label: 'scale' },
]
const SELECT = 0, MOVE = 1, ROTATE = 2, SCALE = 3

const toolRule = ({ index, selection }) => {
  const has = (i) => selection.includes(i)
  // `select` answers to nobody.
  if (index === SELECT) return selection
  if (index === SCALE && has(SCALE)) {
    // Scale just came on: it evicts the pair.
    return selection.filter((i) => i !== MOVE && i !== ROTATE)
  }
  if ((index === MOVE || index === ROTATE) && has(index)) {
    // Either of the pair came on: it evicts scale, and they may coexist.
    return selection.filter((i) => i !== SCALE)
  }
  // Turning something OFF needs no adjudication.
  return selection
}

const panel = panel3d(
  { width: 300 },
  label3d({ text: 'radio — one tool at a time', muted: true, compact: true }),
  iconGrid3d({
    items: TOOLS, mode: 'radio', selected: 0,
    handleSelect: ([i]) => { state.tool = TOOLS[i].label; show() },
  }),
  label3d({ text: 'checkbox — any layers, but never none', muted: true, compact: true }),
  iconGrid3d({
    items: LAYERS, mode: 'checkbox', selected: [0],
    // The rule the modes do not have: refuse to empty the set.
    handleChange: ({ selection, previous }) => (selection.length ? selection : previous),
    handleSelect: (sel) => { state.shown = sel.map((i) => LAYERS[i].label); show() },
  }),
  label3d({ text: 'buttons — fire and forget', muted: true, compact: true }),
  iconGrid3d({
    items: ACTIONS, mode: 'buttons',
    handleActivate: (i, item) => { state.log = `fired: ${item.label}`; show() },
    handleMenuSelect: (action, i, cell) => {
      state.log = `menu: ${action.label} (from ${ACTIONS[cell].label})`; show()
    },
  }),
  label3d({ text: 'radio', muted: true, compact: true }),
  iconGrid3d({ items: PALETTE, mode: 'radio', selected: 0, columns: 6 }),
  label3d({ text: 'checkbox', muted: true, compact: true }),
  iconGrid3d({
    items: TOOLBOX, mode: 'checkbox', selected: [SELECT, MOVE],
    handleChange: toolRule,
    handleSelect: (sel) => { state.tools = sel.map((i) => TOOLBOX[i].label); show() },
  })
)
show()

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.2, camera: { radius: 3 } })
const scene = b3d({ style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:20px;flex:1;min-height:0;padding:14px 14px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;flex:0 0 300px;overflow:auto' }, 'DOM', panel),
      div({ style: 'display:flex;flex:1;min-width:0;flex-direction:column;gap:6px;color:#9ab;font:12px system-ui' }, '3D texture — same widget', scene)
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

> Three grids, one control. The first fires and forgets, the second is one-of-N,
> the third is any-of-N — and the third also enforces ensemble's tool rule, that
> **scale fights move+rotate**, so picking scale drops the other two. Try it:
> the rule is a `handleChange` interceptor, not a fourth widget.
>
> The middle grid carries no captions at all and still fits twelve tools in the
> space four labelled ones would take. That is the argument for icons, made by
> putting them side by side rather than by asserting it.

## The control owns LAYOUT; the consumer owns MEANING

Three widgets collapse into one because the difference between them was never
layout — it was semantics. So `mode` picks the common case (`buttons` fire and
forget, `radio` is one-of-N, `checkbox` is any-of-N) and `handleChange` lets a consumer
impose something more particular: mutually exclusive subgroups, a mode that
refuses to turn itself off, a tool that arms rather than toggles.

`handleChange` receives what WOULD happen and returns what should. Returning the
previous selection is a veto; there is no separate cancel flag, because one way
to say no is easier to get right than two.

## Cell size is the dial, and XR is NOT a third size

Two cases: **48 px** for touch, **24 px** for a pointer, sniffed from
`(pointer: coarse)` and overridable. That is the whole decision.

It is tempting to add a third, larger size for XR on the grounds that a
controller ray is imprecise. Tonio overruled exactly that, and the reasoning is
better than mine was: _"we shouldn't make special size allowances for XR UI
targets, we should scale XR so that pointer or touch targets make sense, since XR
users also need to be able to read stuff."_

Growing the targets in UI units leaves the glyphs where they are and inflates the
buttons around them, so you buy hit accuracy by making the panel **harder to
read** — the wrong trade for the medium with the lowest effective resolution.
Scaling the whole panel in world space moves both together.

## Captions are what force a narrow column

Four columns by default. Without captions a cell is only as wide as its icon, so
a caption-less grid can be much wider — which is why `columns` defaults from
whether anything is captioned rather than being a fixed number.
