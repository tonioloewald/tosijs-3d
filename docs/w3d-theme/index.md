# w3d-theme

The **one** place the `--w3d-*` theme variables are read. Every SVG-UI module
(widgets3d, keyboard, table, …) draws from this table instead of re-typing the
variable names and fallback literals. Separate copies of this block drift, and
a themed colour ends up wrong in one widget only.

**Values are resolved ONCE, at module load, in JS — deliberately.** These
surfaces rasterize onto 3D textures via `XMLSerializer`, where a literal
`var(--w3d-text)` in a serialized attribute resolves against *nothing* and
paints black. Reading the computed value at load and baking the literal into
the SVG is what makes the same markup render identically in the DOM and on a
plane. The cost: the theme is not live-reactive to later JS changes — restyle
before the bundle loads (tosijs's `vars`/`StyleSheet` at startup is fine).

## Demo

**The same panel twice — flat DOM (top left) and as a texture in a 3D scene
(bottom left) — with the editor on the right.** Change a token and both
rebuild, which is the point: one UI, two presentations, and a theme that has to
reach them identically or the pair drifts.

The editor is [[theme-editor]], a component rather than demo code, so an adopter
gets this UI instead of copying it. Alpha comes from tosijs-ui's `colorInput`
passed in — the native `<input type="color">` cannot express it, and half this
palette is `rgba()`.

```js
import { b3d, b3dLight, panelScene, panel3d, row3d, label3d, slider3d,
         toggle3d, button3d, iconBar3d, ui, themeEditor,
         w3dTheme, setW3dTheme } from 'tosijs-3d'
import { colorInput } from 'tosijs-ui'
import { elements, tosi } from 'tosijs'
const { div } = elements

// Bound state, as the other widget demos do — so a rebuild does not reset what
// you set, and the values survive every theme change.
const { demo } = tosi({ demo: { size: 0.6, sound: false, name: '' } })

// PUT THE PALETTE BACK WHEN YOU LEAVE.
//
// This editor edits the GLOBAL table, deliberately — that is what makes both
// panels below re-theme live, and a scoped copy would demonstrate nothing. But
// the doc site is ONE page, so without this, walking away would leave every
// other demo wearing whatever you had set.
//
// `withTheme` is the wrong tool here — it restores when its build function
// RETURNS, and this demo's lifetime is the page's, not a synchronous call.
// The editor's own `restore()` puts back what it found; this only decides WHEN.
const restoreTheme = new MutationObserver(() => {
  if (preview.isConnected) return
  editor.restore()
  restoreTheme.disconnect()
})
// The preview's own parent is enough: watching the whole document's subtree
// fired this on every mutation anywhere on the page.
restoreTheme.observe(preview.parentNode ?? document.body, { childList: true })

// Load a WEB font so the menu's Rosario entry has something to render. A theme
// names a family; loading it is the host's job, which is exactly the point of
// showing one here.
if (!document.getElementById('rosario-font')) {
  document.head.append(elements.link({
    id: 'rosario-font',
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Rosario:wght@400;600&display=swap',
  }))
}

// ONE panel, shown twice. `panelScene` rasterises the SAME svg element onto the
// plane, so the 3D view is a render of the flat one rather than a copy of it —
// which is what makes "one UI, two presentations" literal here: there is
// nothing that can drift, because there is only one thing.
//
// A field accepts no keys by itself: `inputField` listens to nothing by design,
// because in a headset the keys come from the SVG keyboard rather than the DOM.
// `fieldGroup` bridges that, and `attach()` wires real keydown events.
const makePanel = () => {
  const field = ui.inputField({
    placeholder: 'type here…',
    value: demo.name.value,
    handleChange: (v) => { demo.name = v },
  })
  const panel = panel3d(
    { width: 300 },
    label3d({ text: 'Themed panel' }),
    row3d({ weights: [1, 2] }, label3d({ text: 'size' }),
      slider3d({ value: demo.size, showValue: 'always', format: (v) => v.toFixed(2) })),
    row3d({ weights: [1, 2] }, label3d({ text: 'name' }), field),
    toggle3d({ label: 'sound', value: demo.sound }),
    // Stroked icons, so `strokeWidth` has something to act on besides the caret.
    iconBar3d({ items: [
      { icon: 'mousePointer' }, { icon: 'move' }, { icon: 'rotateCw' },
      { icon: 'plusCircle' }, { icon: 'trash2' },
    ] }),
    button3d({ label: 'A button' }),
  )
  return { panel, field }
}

// Four equal cells. The panels take the left column (DOM above, 3D below) and
// the editor spans the right — so the two renders of the same panel sit one
// above the other, which is where a difference between them would be obvious.
const cell = { display: 'grid', placeItems: 'center', minWidth: '0', minHeight: '0', overflow: 'auto' }
const flat = div({ style: { ...cell, background: '#5a6472', borderRadius: '8px', padding: '12px' } })
const stage = div({ style: { ...cell, background: '#11141a', borderRadius: '8px' } })
let scene = null

let detach = null
const build = () => {
  const { panel, field } = makePanel()
  const old = flat.querySelector('svg')
  old ? old.replaceWith(panel) : flat.append(panel)

  // The plane takes the very same element as its texture.
  // `camera` gives the scene an orbit camera that YIELDS during a press on the
  // panel — so you can drag the view and still use the controls.
  const { plane, sceneCreated } = panelScene({
    svg: panel,
    target: panel,
    width: 2.4,
    camera: { beta: Math.PI / 2.4, radius: 3.4 },
  })
  const next = b3d({ sceneCreated }, b3dLight({ y: 1, intensity: 0.9 }), plane)
  scene ? scene.replaceWith(next) : stage.append(next)
  scene = next

  // Re-bind after every rebuild: the old field is gone, and a group holding a
  // detached field routes keys to nothing.
  detach?.()
  detach = ui.fieldGroup({ fields: [field] }).attach()
}

build()
const editor = themeEditor({ colorInput, handleChange: build })

preview.append(div(
  {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '16px',
      padding: '16px',
      height: '100%',
      boxSizing: 'border-box',
    },
  },
  flat,
  // The editor spans both rows of the right column — it is a tall list, and
  // splitting it across a cell boundary would make it scroll twice.
  div(
    { style: { ...cell, gridRow: '1 / 3', gridColumn: '2', alignContent: 'start', justifyItems: 'start' } },
    editor
  ),
  stage,
))
```
```css
tosi-example .preview { background: #1b1f27; color: #e6e6e6; min-height: 620px; }
tosi-b3d { width: 100%; height: 100%; border-radius: 8px; overflow: hidden; }
```
