# materialPicker3d

**A material as one row: tap the swatch, edit in a popup.** The
[[color-field|colour picker]]'s shape, for a whole material. The swatch is a
small render of the material, and the popup has the presets first (a
collection, such as the fabrics) as a grid of renders, then a control per input
of the material's type, drawn from the type's own declaration: a slider for
a grey value, a colour picker for a colour, a strength beside it where the
input has one. A picture in place of a flat value shows as a row you can
clear. Where the caller allows more than one type, the popup starts with a
choice of type.

The value is a [[material-recipe|recipe]], `{ type, inputs }`, always in
canonical form, so it can go straight into a saved document. Apply it to a
Babylon material with `applyMaterial`.

## Demo

```js
import { b3d, b3dSun, panel3d, materialPicker3d, applyMaterial, studioEnvironment, MATERIAL_COLLECTIONS } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { matDemo } = tosi({ matDemo: { look: MATERIAL_COLLECTIONS.fabrics.presets.find((p) => p.name === 'satin').recipe } })
let ball = null
const show = () => { if (ball) applyMaterial(ball.material, matDemo.look.value) }

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const scene = el.scene
        studioEnvironment(scene)
        ball = BABYLON.MeshBuilder.CreateTorusKnot('knot', { radius: 0.6, tube: 0.22, tubularSegments: 160 }, scene)
        ball.material = new BABYLON.PBRMaterial('m', scene)
        show()
      },
    },
    b3dSun({}),
  ),
  panel3d({ width: 300 },
    materialPicker3d({ label: 'finish', value: matDemo.look, types: ['pbr'], collections: ['fabrics'] }),
  ),
)
matDemo.look.observe(show)
```
```css
.preview { display: flex; gap: 16px; min-height: 480px; }
.preview tosi-b3d { flex: 1; }
```

Pick a preset, then drag its inputs. Metals need something to reflect, which
is why the scene has `studioEnvironment`.

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | `''` | The caption on the row |
| `value` | a grey `pbr` | A recipe, or a reactive value holding one |
| `types` | every registered type | The types it may be. One type: no choice of type is shown |
| `collections` | `[]` | Names from `MATERIAL_COLLECTIONS`, or collections of your own, offered as presets |
| `presets` | | More presets of your own, `{ name, recipe }`, offered first |
| `handleChange` | | Live, mid-drag included, with the canonical recipe |
| `handleCommit` | | Once per preset, type change, or when the popup closes after an edit: one undo step |

## Previews

Each swatch and preset is the material rendered on a teapot (The Base
Mesh's, CC0) in a fixed studio. One hidden engine draws every preview on the page, made the first
time one is wanted (one more WebGL context, once), one at a time, and each
recipe is drawn once and kept. While you drag a slider the row shows the
last picture until you pause. Until a picture is ready, or where WebGL is not
available, the swatch is the material's flat colour.
