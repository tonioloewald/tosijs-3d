/*#
# materialPicker3d

**A material as one row: tap the swatch, edit in a popup.** The
[[color-field|colour picker]]'s shape, for a whole material. The swatch is a
small render of the material, and the popup has the presets first (a
collection, such as the fabrics) as a grid of renders, then a control per input
of the material's type, drawn from the type's own declaration: a slider for
a grey value, a colour picker for a colour, a strength beside it where the
input has one. An input that may take a picture (the diffuse colour, a
roughness, the normal map) is a heading and a row: **choose a picture** (from your
files: [material-pictures](/material-pictures/), the recipe keeps a key and a
character file carries the picture), **clear** it, a **flat** colour or grey
in its place, and a swatch showing what it is now. **Scale textures** runs
from 1/32 to 4; a press beside its handle steps to the next scale at which a
picture repeats whole (1/3, 1/2, 1, 2, 3). Where the caller allows more than one type, the popup starts with a
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
| `name` | | Its name without a caption (the popup's title, what a screen reader says): the row is then just the swatch, for beside another control |
| `value` | a grey `pbr` | A recipe, or a reactive value holding one |
| `types` | every registered type | The types it may be. One type: no choice of type is shown |
| `collections` | `[]` | Names from `MATERIAL_COLLECTIONS`, or collections of your own, offered as presets |
| `presets` | | More presets of your own, `{ name, recipe }`, offered first |
| `handleChange` | | Live, mid-drag included, with the canonical recipe |
| `handleCommit` | | Once per preset, type change, or when the popup closes after an edit: one undo step |

## Previews

Each swatch and preset is the material rendered on a cube, on grey, in a
fixed studio. One hidden engine draws every preview on the page, made the first
time one is wanted (one more WebGL context, once), one at a time, and each
recipe is drawn once and kept. While you drag a slider the row shows the
last picture until you pause. Until a picture is ready, or where WebGL is not
available, the swatch is the material's flat colour. A cloth material with a colour
is previewed in that colour, whatever its recolour: the ball has no texture of
its own for the recolour to keep.
*/
/*{ "parent": "ui-controls", "order": 47 }*/

import { svgElements } from 'tosijs'
import { w3dTheme } from './w3d-theme.js'
import { handlerOf } from './handler-of.js'
import { colorPicker3d } from './color-picker.js'
import {
  label3d,
  select3d,
  slider3d,
  type PointerKind,
  type Widget3d,
  type WidgetHost,
} from './widgets3d.js'
import { materialPreview } from './material-preview.js'
import { addPicture, pictureUrl } from './material-pictures.js'
import { iconGlyph } from './svg-icons.js'
import { formatColor } from './color.js'
import { chooseFile } from './choose-file.js'
import {
  applyMaterialPreset,
  canonicalMaterial,
  isMaterialPreset,
  materialAsType,
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

const { g, rect, text, image, title } = svgElements as any

/** A slider's readout for a scale: `1/3`, `2`, `0.264`. */
const scaleFormat = (v: number): string => {
  if (v >= 1 && Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v))
  const n = Math.round(1 / v)
  if (v < 1 && Math.abs(1 / v - n) < 1e-4) return `1/${n}`
  return String(Number(v.toPrecision(3)))
}

const greyHex = (v: number): string => formatColor({ r: v, g: v, b: v, a: 1 })

/**
 * The row for an input that may take a picture: choose a picture, clear it,
 * a flat colour (or grey) instead, and a swatch showing what it is now.
 */
function pictureInputRow(opts: {
  decl: MaterialInputDecl
  label: string
  /** The input now. */
  now: () => { value: number | string | null; image: string | null }
  choose: () => void
  clear: () => void
  /** A flat value from the colour picker: a hex, a number for a grey input. */
  flat: (v: number | string, commit: boolean) => void
}): Widget3d {
  const d = opts.decl
  const H = Math.round(w3dTheme.fontSize * 2.2)
  const ICON = 20
  const CELL = H
  const PAD = Math.max(6, Math.round(w3dTheme.spacing * 0.6))
  const SW = Math.round(H * 1.5)
  const flatOk = d.kind !== 'image'
  const tools: Array<{ icon: string; tip: string; act: () => void; can: () => boolean }> = [
    { icon: 'upload', tip: 'choose a picture', act: opts.choose, can: () => true },
    {
      icon: 'trash',
      tip: d.optional ? 'clear (as made)' : 'clear the picture',
      act: opts.clear,
      can: () => {
        const n = opts.now()
        return n.image != null || (!!d.optional && n.value != null)
      },
    },
    ...(flatOk
      ? [
          {
            icon: 'colorPicker',
            tip: d.kind === 'grey' ? 'a flat value' : 'a flat colour',
            act: () => openFlat(),
            can: () => true,
          },
        ]
      : []),
  ]
  let host: WidgetHost | null = null
  let width = 0
  const el = g({ 'data-w3d': 'material-input' })
  const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: w3dTheme.rowBg })
  const cells = tools.map((t, i) => {
    const cell = g({ transform: `translate(${PAD + i * CELL}, 0)` })
    cell.append(
      title({}, t.tip),
      rect({ width: CELL, height: H, fill: 'transparent' }),
      iconGlyph(t.icon, {
        size: ICON,
        x: (CELL - ICON) / 2,
        y: (H - ICON) / 2,
        color: w3dTheme.text,
      })
    )
    return cell
  })
  const valueText = text({
    y: H / 2,
    'dominant-baseline': 'middle',
    'text-anchor': 'end',
    'font-family': w3dTheme.fontFamily,
    'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
    fill: w3dTheme.muted,
  })
  const swatch = rect({
    y: 4,
    width: SW,
    height: H - 8,
    rx: 5,
    stroke: w3dTheme.muted,
    'stroke-width': 1,
  })
  const picture = image({ y: 4, width: SW, height: H - 8, preserveAspectRatio: 'xMidYMid slice' })
  el.append(bg, ...cells, valueText, swatch, picture)

  const paint = (): void => {
    const n = opts.now()
    tools.forEach((t, i) =>
      cells[i].setAttribute('opacity', t.can() ? '1' : '0.35')
    )
    const x = Math.max(0, width - PAD - SW)
    swatch.setAttribute('x', String(x))
    picture.setAttribute('x', String(x))
    valueText.setAttribute('x', String(Math.max(0, x - PAD)))
    const url = n.image != null ? pictureUrl(n.image) : null
    if (url != null) picture.setAttribute('href', url)
    else picture.removeAttribute('href')
    picture.setAttribute('display', url != null ? 'inline' : 'none')
    const fill =
      n.image != null || n.value == null
        ? w3dTheme.rowBg
        : typeof n.value === 'number'
        ? greyHex(n.value)
        : n.value
    swatch.setAttribute('fill', fill)
    valueText.textContent =
      n.image != null
        ? n.image.split(/[/\\]/).pop() ?? ''
        : n.value == null
        ? d.optional
          ? 'as made'
          : 'none'
        : typeof n.value === 'number'
        ? String(Number(n.value.toFixed(2)))
        : ''
  }

  // The colour popup is a colour picker's own, opened by the icon.
  let flatPicker: ReturnType<typeof colorPicker3d> | null = null
  function openFlat(): void {
    if (host == null) return
    const n = opts.now()
    const start =
      typeof n.value === 'number'
        ? greyHex(n.value)
        : typeof n.value === 'string'
        ? n.value
        : typeof d.default === 'number'
        ? greyHex(d.default)
        : String(d.default)
    const toValue = (hex: string): number | string => {
      if (d.kind !== 'grey') return hex
      return parseInt(hex.slice(1, 3), 16) / 255
    }
    flatPicker = colorPicker3d({
      label: opts.label,
      value: start,
      alpha: d.kind === 'rgba',
      grey: d.kind === 'grey',
      defaultPresets: d.kind === 'grey' ? 'off' : 'on',
      handleChange: (hex) => {
        opts.flat(toValue(hex), false)
        paint()
      },
      handleCommit: (hex) => {
        opts.flat(toValue(hex), true)
        paint()
      },
    })
    flatPicker.setHost?.(host)
    flatPicker.layout(width)
    flatPicker.open()
  }

  const cellAt = (x: number, y: number): number => {
    if (y < 0 || y > H) return -1
    const i = Math.floor((x - PAD) / CELL)
    return x >= PAD && i < tools.length ? i : -1
  }
  return {
    el,
    setHost(h: WidgetHost) {
      host = h
    },
    layout(w: number) {
      width = w
      bg.setAttribute('width', String(w))
      paint()
      return H + PAD
    },
    // The swatch is a readout: only the buttons take a press.
    hitTest: (x, y) => cellAt(x, y) >= 0,
    handle(kind: PointerKind, x: number, y: number) {
      const i = cellAt(x, y)
      if (kind === 'leave' || i < 0) host?.hideTip?.()
      else if (kind === 'hover')
        host?.showTip?.(tools[i].tip, { x: PAD + i * CELL, y: 0, width: CELL, height: H })
      if (kind !== 'up') return
      if (i >= 0) {
        if (tools[i].can()) tools[i].act()
        paint()
      }
    },
    semantics: () => ({
      role: 'group',
      name: opts.label,
      value: opts.now().image ?? opts.now().value,
    }),
  } as Widget3d & { setHost(h: WidgetHost): void }
}

/** A grid of preset thumbnails, each its rendered preview with its name under it. */
function presetTiles(opts: {
  presets: MaterialPreset[]
  /** The preset as it would be picked now (with the kept inputs). */
  recipeOf: (p: MaterialPreset) => MaterialRecipe
  isCurrent: (p: MaterialPreset) => boolean
  pick: (p: MaterialPreset) => void
}): Widget3d {
  const TILE = 56
  const GAP = 6
  const NAME = Math.round(w3dTheme.fontSize * 0.75)
  const CELL_H = TILE + NAME + 6
  const el = g({ 'data-w3d': 'material-presets' })
  let cols = 1
  const cellAt = (i: number) => ({
    x: (i % cols) * (TILE + GAP),
    y: Math.floor(i / cols) * (CELL_H + GAP),
  })
  const draw = (): void => {
    while (el.firstChild) el.removeChild(el.firstChild)
    opts.presets.forEach((p, i) => {
      const c = cellAt(i)
      const recipe = opts.recipeOf(p)
      const current = opts.isCurrent(p)
      const tile = g({ transform: `translate(${c.x}, ${c.y})` })
      tile.append(
        rect({
          width: TILE,
          height: TILE,
          rx: 8,
          fill: w3dTheme.rowBg,
          stroke: current ? w3dTheme.accent : w3dTheme.muted,
          'stroke-width': current ? 2.5 : 1,
        }),
        // The flat colour until the picture comes.
        rect({
          x: TILE / 2 - 14,
          y: TILE / 2 - 14,
          width: 28,
          height: 28,
          rx: 14,
          fill: materialSwatch(recipe),
        }),
        text(
          {
            x: TILE / 2,
            y: TILE + NAME,
            'text-anchor': 'middle',
            'font-family': w3dTheme.fontFamily,
            // A long name shrinks to its tile rather than running into the next.
            'font-size': String(
              Math.min(NAME, (NAME * 9) / Math.max(1, p.name.length))
            ),
            fill: current ? w3dTheme.text : w3dTheme.muted,
          },
          p.name
        )
      )
      el.appendChild(tile)
      void materialPreview(recipe).then((url) => {
        if (url == null || tile.parentNode !== el) return
        tile.insertBefore(
          image({ href: url, x: 2, y: 2, width: TILE - 4, height: TILE - 4 }),
          tile.childNodes[1]
        )
        tile.removeChild(tile.childNodes[2])
      })
    })
  }
  const indexAt = (x: number, y: number): number => {
    const col = Math.floor(x / (TILE + GAP))
    const row = Math.floor(y / (CELL_H + GAP))
    if (col < 0 || col >= cols || x - col * (TILE + GAP) > TILE) return -1
    const i = row * cols + col
    return i >= 0 && i < opts.presets.length ? i : -1
  }
  return {
    el,
    layout(w: number) {
      cols = Math.max(1, Math.floor((w + GAP) / (TILE + GAP)))
      draw()
      const rows = Math.ceil(opts.presets.length / cols)
      return rows * (CELL_H + GAP)
    },
    hitTest: (x, y) => indexAt(x, y) >= 0,
    handle(kind: PointerKind, x: number, y: number) {
      if (kind !== 'up') return
      const i = indexAt(x, y)
      if (i >= 0) opts.pick(opts.presets[i])
    },
  }
}

export interface MaterialPicker3dOptions {
  label?: string
  /**
   * Its name with no caption: the popup's title and what a screen reader
   * says. With neither label nor caption the row is just the swatch, for
   * beside another control (a garment slot).
   */
  name?: string
  value?:
    | MaterialRecipe
    | { value: MaterialRecipe; observe(cb: () => void): unknown }
  /** The types it may be; default every registered type. */
  types?: string[]
  /** Collections offered as presets: names from `MATERIAL_COLLECTIONS`, or your own. */
  collections?: Array<string | MaterialCollection>
  /** Presets of your own, offered first. */
  presets?: MaterialPreset[]
  /**
   * Inputs a preset leaves as they are unless it sets them: `['albedo']`
   * makes the fabrics surfaces, so cotton keeps your colour and gold brings
   * its own.
   */
  keep?: string[]
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
    config.value != null && typeof (config.value as any).observe === 'function'
      ? (config.value as {
          value: MaterialRecipe
          observe(cb: () => void): unknown
        })
      : null
  const canon = (r: MaterialRecipe | undefined): MaterialRecipe => {
    if (r == null) return canonicalMaterial({ type: allowed[0], inputs: {} })
    // A recipe of a type it may not be keeps the inputs the first type shares.
    return materialAsType(r, allowed.includes(r.type) ? r.type : allowed[0])
  }
  let value = canon(
    box ? box.value : (config.value as MaterialRecipe | undefined)
  )
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
  ]
  const keep = config.keep ?? []

  const name = config.label || config.name || ''
  const presetName = (): string =>
    presets().find((p) => isMaterialPreset(value, p.recipe, keep))?.name ?? ''

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
  // The rendered preview over the swatch, once there is one.
  const picture = image({ y: 2, width: H - 4, height: H - 4 })
  el.append(bg, caption, nameText, swatch, picture)
  let previewTimer: ReturnType<typeof setTimeout> | null = null
  /*
  Rendered a moment after the last change, not on every one: a slider drag
  would otherwise render (and cache) each step. The flat colour shows until
  the picture is ready.
  */
  const preview = (): void => {
    if (previewTimer != null) clearTimeout(previewTimer)
    previewTimer = setTimeout(() => {
      previewTimer = null
      const want = JSON.stringify(value)
      void materialPreview(value).then((url) => {
        if (JSON.stringify(value) !== want) return
        if (url == null) {
          picture.removeAttribute('href')
          swatch.setAttribute('fill', materialSwatch(value))
          return
        }
        picture.setAttribute('href', url)
        swatch.setAttribute('fill', w3dTheme.rowBg)
      })
    }, 150)
  }

  const paint = (): void => {
    caption.textContent = config.label ?? ''
    // Captionless, it is a swatch beside something else: no name either.
    nameText.textContent = !config.label
      ? ''
      : presetName() ||
        (allowed.length > 1 ? materialType(value.type)?.label ?? value.type : '')
    if (!picture.getAttribute('href'))
      swatch.setAttribute('fill', materialSwatch(value))
    const x = Math.max(0, width - PAD - SW)
    swatch.setAttribute('x', String(x))
    picture.setAttribute('x', String(x + (SW - (H - 4)) / 2))
    preview()
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
    if (d.kind === 'image' || d.image) {
      // A heading, then choose / clear / flat value / what it is now.
      rows.push(label3d({ text: label, muted: true, compact: true }))
      rows.push(
        pictureInputRow({
          decl: d,
          label,
          now: () => resolveInput(d, value.inputs[d.name]),
          choose: () =>
            void chooseFile('image/*').then(async (file) => {
              if (file == null) return
              const bytes = new Uint8Array(await file.arrayBuffer())
              put({ image: await addPicture(bytes, file.name, file.type) }, true)
            }),
          clear: () =>
            put(
              {
                image: null,
                value: d.optional || d.kind === 'image' ? null : d.default,
              },
              true
            ),
          flat: (v, commit) => {
            put({ image: null, value: v })
            if (commit) set(value, true)
          },
        })
      )
    } else if (d.kind === 'grey') {
      rows.push(
        slider3d({
          // An optional input left out is the material's own (as made).
          label: now.value == null ? `${label} (as made)` : label,
          value: (now.value ?? d.default) as number,
          min: d.min ?? 0,
          max: d.max ?? 1,
          step: d.scale === 'log2' ? 0 : 0.01,
          scale: d.scale,
          notches: d.notches,
          ...(d.notches ? { format: scaleFormat } : {}),
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
          options: allowed.map((t) => ({
            label: materialType(t)!.label,
            value: t,
          })),
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
        presetTiles({
          presets: list,
          recipeOf: (p) => applyMaterialPreset(value, p.recipe, keep),
          isCurrent: (p) => isMaterialPreset(value, p.recipe, keep),
          pick: (p) => {
            set(applyMaterialPreset(value, p.recipe, keep), true)
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
        ...(host.hasLayer ? { chrome: true, title: name } : {}),
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
    semantics: () => ({
      role: 'editor',
      name,
      value,
      // A whole recipe ({ type, inputs }), as the popup would make one.
      set: (v: unknown) => {
        if (v != null && typeof v === 'object') set(v as MaterialRecipe, true)
      },
    }),
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
