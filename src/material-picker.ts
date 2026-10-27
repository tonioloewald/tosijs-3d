/*#
# materialPicker3d

**A material as one row: tap the swatch, edit in a popup.** The
[[color-field|colour picker]]'s shape, for a whole material. The popup has the
presets first (a collection, such as the fabrics), then a control per input
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
    materialPicker3d({ label: 'finish', value: matDemo.look, collections: ['fabrics'] }),
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

Swatches are flat colours (the albedo) for now; rendered previews are next.
*/
/*{ "parent": "ui-controls", "order": 47 }*/

import { svgElements } from 'tosijs'
import { w3dTheme } from './w3d-theme.js'
import { handlerOf } from './handler-of.js'
import { colorPicker3d } from './color-picker.js'
import {
  button3d,
  label3d,
  select3d,
  slider3d,
  type PointerKind,
  type Widget3d,
  type WidgetHost,
} from './widgets3d.js'
import {
  canonicalMaterial,
  MATERIAL_COLLECTIONS,
  materialSwatch,
  materialType,
  materialTypes,
  resolveInput,
  withInput,
  writeInput,
  type MaterialCollection,
  type MaterialInputDecl,
  type MaterialPreset,
  type MaterialRecipe,
} from './material-recipe.js'

const { g, rect, text } = svgElements as any

export interface MaterialPicker3dOptions {
  label?: string
  value?:
    | MaterialRecipe
    | { value: MaterialRecipe; observe(cb: () => void): unknown }
  /** The types it may be; default every registered type. */
  types?: string[]
  /** Collections offered as presets: names from `MATERIAL_COLLECTIONS`, or your own. */
  collections?: Array<string | MaterialCollection>
  /** Presets of your own, offered first. */
  presets?: MaterialPreset[]
  handleChange?: (recipe: MaterialRecipe) => void
  handleCommit?: (recipe: MaterialRecipe) => void
}

export interface MaterialPicker extends Widget3d {
  readonly value: MaterialRecipe
  setValue: (recipe: MaterialRecipe) => void
  /** Open the popup, as a tap would. */
  open: () => void
  setHost?: (host: WidgetHost) => void
}

const same = (a: MaterialRecipe, b: MaterialRecipe) =>
  JSON.stringify(a) === JSON.stringify(b)

export function materialPicker3d(
  config: MaterialPicker3dOptions = {}
): MaterialPicker {
  const allowed = (config.types ?? materialTypes().map((t) => t.name)).filter(
    (t) => materialType(t) != null
  )
  if (allowed.length === 0) throw new Error('materialPicker3d: no known type')
  const box =
    config.value != null &&
    typeof (config.value as any).observe === 'function'
      ? (config.value as { value: MaterialRecipe; observe(cb: () => void): unknown })
      : null
  const canon = (r: MaterialRecipe | undefined): MaterialRecipe => {
    const type = r != null && allowed.includes(r.type) ? r.type : allowed[0]
    return canonicalMaterial({ type, inputs: r?.type === type ? r.inputs ?? {} : {} })
  }
  let value = canon(box ? box.value : (config.value as MaterialRecipe | undefined))
  let host: WidgetHost | null = null
  let open: { close: () => void } | null = null
  let width = 0
  // An edit since the popup opened, committed when it closes.
  let dirty = false

  const change = handlerOf<(r: MaterialRecipe) => void>(
    config as unknown as Record<string, unknown>,
    'handleChange',
    'onChange'
  )

  const presets = (): MaterialPreset[] => [
    ...(config.presets ?? []),
    ...(config.collections ?? []).flatMap((c) =>
      typeof c === 'string' ? MATERIAL_COLLECTIONS[c]?.presets ?? [] : c.presets
    ),
  ].filter((p) => allowed.includes(p.recipe.type))

  const presetName = (): string =>
    presets().find((p) => same(canon(p.recipe), value))?.name ?? ''

  const H = Math.round(w3dTheme.fontSize * 2.2)
  const PAD = Math.max(6, Math.round(w3dTheme.spacing * 0.6))
  const SW = Math.round(H * 1.5)

  const el = g({ 'data-w3d': 'material-picker' })
  const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: w3dTheme.rowBg })
  const caption = text({
    x: PAD,
    y: H / 2,
    'dominant-baseline': 'middle',
    'font-family': w3dTheme.fontFamily,
    'font-size': String(w3dTheme.fontSize),
    fill: w3dTheme.muted,
  })
  const nameText = text({
    y: H / 2,
    'dominant-baseline': 'middle',
    'text-anchor': 'end',
    'font-family': w3dTheme.fontFamily,
    'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
    fill: w3dTheme.text,
  })
  const swatch = rect({
    y: 4,
    width: SW,
    height: H - 8,
    rx: 5,
    stroke: w3dTheme.muted,
    'stroke-width': 1,
  })
  el.append(bg, caption, nameText, swatch)

  const paint = (): void => {
    caption.textContent = config.label ?? ''
    nameText.textContent =
      presetName() ||
      (allowed.length > 1 ? materialType(value.type)?.label ?? value.type : '')
    swatch.setAttribute('fill', materialSwatch(value))
    const x = Math.max(0, width - PAD - SW)
    swatch.setAttribute('x', String(x))
    nameText.setAttribute('x', String(Math.max(0, x - PAD)))
  }

  const set = (next: MaterialRecipe, commit: boolean): void => {
    const r = canon(next)
    const changed = !same(r, value)
    value = r
    paint()
    if (changed) {
      if (box != null && !same(canon(box.value), r)) box.value = r
      change?.(r)
      if (!commit) dirty = true
    }
    if (commit) {
      dirty = false
      config.handleCommit?.(r)
    }
  }

  box?.observe(() => {
    const r = canon(box.value)
    if (same(r, value)) return
    value = r
    paint()
    // The popup's controls show the old values: rebuild it.
    if (open != null) reopen()
  })

  /** The controls for one input, from its declaration. */
  const inputRows = (d: MaterialInputDecl): Widget3d[] => {
    const now = resolveInput(d, value.inputs[d.name])
    const label = d.label ?? d.name
    const put = (patch: Partial<typeof now>, rebuild = false) => {
      const cur = resolveInput(d, value.inputs[d.name])
      set(withInput(value, d.name, writeInput(d, { ...cur, ...patch })), false)
      if (rebuild) reopen()
    }
    const rows: Widget3d[] = []
    if (now.image != null) {
      const file = now.image.split(/[/\\]/).pop() ?? now.image
      rows.push(label3d({ text: `${label}: ${file}`, muted: true, compact: true }))
      if (d.kind !== 'image')
        rows.push(
          button3d({
            label: `use a flat ${d.kind === 'grey' ? 'value' : 'colour'}`,
            handleClick: () => put({ image: null, value: d.default }, true),
          })
        )
    } else if (d.kind === 'grey') {
      rows.push(
        slider3d({
          label,
          value: now.value as number,
          min: d.min ?? 0,
          max: d.max ?? 1,
          step: 0.01,
          handleChange: (v) => put({ value: v }),
        })
      )
    } else if (d.kind === 'rgb' || d.kind === 'rgba') {
      rows.push(
        colorPicker3d({
          label,
          value: now.value as string,
          alpha: d.kind === 'rgba',
          handleChange: (hex) => put({ value: hex }),
        })
      )
    }
    // An image-only input with no picture has nothing to edit here.
    if (d.intensity && (d.kind !== 'image' || now.image != null))
      rows.push(
        slider3d({
          label: `${label} strength`,
          value: now.intensity,
          min: d.intensity.min ?? 0,
          max: d.intensity.max ?? 1,
          step: 0.01,
          handleChange: (v) => put({ intensity: v }),
        })
      )
    return rows
  }

  const items = (): Widget3d[] => {
    const out: Widget3d[] = []
    if (allowed.length > 1)
      out.push(
        select3d({
          label: 'type',
          value: value.type,
          options: allowed.map((t) => ({ label: materialType(t)!.label, value: t })),
          handleChange: (t) => {
            if (t === value.type) return
            set({ type: String(t), inputs: {} }, true)
            reopen()
          },
        })
      )
    const list = presets()
    if (list.length > 0)
      out.push(
        select3d({
          label: 'preset',
          value: presetName(),
          options: [
            { label: 'custom', value: '' },
            ...list.map((p) => ({ label: p.name, value: p.name })),
          ],
          stayOpen: true,
          handleChange: (name) => {
            const p = list.find((q) => q.name === name)
            if (p == null) return
            set(p.recipe, true)
            reopen()
          },
        })
      )
    for (const d of materialType(value.type)!.inputs) out.push(...inputRows(d))
    return out
  }

  const close = (): void => {
    const was = open
    open = null
    was?.close()
  }

  /** Close and open again, so every control shows the current recipe. */
  function reopen(): void {
    if (open == null) return
    close()
    openPopup()
  }

  function openPopup(): void {
    if (host == null || open != null) return
    const anchor = { x: 0, y: 0, width, height: H }
    const below = host.bounds.height - host.top - H - PAD * 2
    const above = host.top - PAD * 2
    const openIt = host.hasLayer ? host.showLayer : host.showPopup
    open = openIt.call(
      host,
      {
        anchor,
        maxHeight: host.hasLayer ? undefined : Math.max(160, below, above),
        ...(host.hasLayer ? { chrome: true, title: config.label ?? '' } : {}),
        width: Math.max(240, Math.min(width, 320)),
        handleClose: () => {
          // Closed from outside (its close glyph, a tap elsewhere): the
          // edits since it opened are one undo step.
          if (open != null) open = null
          if (dirty) set(value, true)
        },
      },
      ...items()
    )
  }

  const api: MaterialPicker = {
    el,
    get value() {
      return value
    },
    setValue(r) {
      set(r, false)
      dirty = false
      if (open != null) reopen()
    },
    open: openPopup,
    setHost(h) {
      host = h
    },
    layout(w: number) {
      width = w
      bg.setAttribute('width', String(w))
      paint()
      return H + PAD
    },
    hitTest(_x: number, y: number) {
      return y >= 0 && y <= H
    },
    handle(kind: PointerKind, _x: number, y: number) {
      if (kind !== 'up' || y < 0 || y > H) return
      if (open != null) {
        close()
        if (dirty) set(value, true)
      } else openPopup()
    },
  }
  paint()
  return api
}
