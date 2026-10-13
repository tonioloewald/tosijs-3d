/*#
# colorPicker3d

**A colour as one row: tap the swatch, pick in a popup.** The popup holds the
[[color-field|color3d]] picker (saturation and value, hue, optional alpha) and
a grid of presets, because most of the time the colour you want is one you
have used before. After the swatches come two more squares: **+** saves the
colour you are on, and the **bin** switches to taking swatches away (tap it,
tap what should go, tap it again to stop). Saved swatches are shared by every
picker on the page and kept in the browser. One row tall when closed, so a panel can carry a dozen
colours without becoming a wall of pickers.

It is all SVG, like every control here, so it is the same thing on a flat
panel and on one in a headset.

## Demo

Three colours for a planet's bands. Each row opens its own popup; the presets
are the ones passed in, then a general set.

```js
import { panel3d, label3d, colorPicker3d } from 'tosijs-3d'
import { elements, tosi } from 'tosijs'

const { div } = elements
const { bandDemo } = tosi({ bandDemo: { zones: '#e9dcc1', belts: '#a9774c', accent: '#b4502f' } })
const stripes = div({ class: 'stripes' })
const show = () => {
  stripes.style.background = `linear-gradient(${[
    bandDemo.zones.value, bandDemo.belts.value, bandDemo.zones.value,
    bandDemo.accent.value, bandDemo.belts.value, bandDemo.zones.value,
  ].join(',')})`
}
for (const k of ['zones', 'belts', 'accent']) bandDemo[k].observe(show)
show()

const planetColours = ['#e9dcc1', '#a9774c', '#b4502f', '#e8d8ac', '#4a78dc', '#b4e6e8']
preview.append(
  panel3d({ width: 300 },
    label3d({ text: 'Bands' }),
    colorPicker3d({ label: 'zones', value: bandDemo.zones, alpha: false, presets: planetColours }),
    colorPicker3d({ label: 'belts', value: bandDemo.belts, alpha: false, presets: planetColours }),
    colorPicker3d({ label: 'accent', value: bandDemo.accent, alpha: false, presets: planetColours }),
  ),
  stripes,
)
```
```css
.preview { display: flex; gap: 16px; padding: 12px; min-height: 500px; align-items: flex-start; }
.stripes { width: 120px; height: 180px; border-radius: 60px; flex: none; }
```

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | `''` | The caption on the row |
| `value` | `'#ffffff'` | A colour, or a reactive value holding one |
| `alpha` | `true` | Offer the alpha strip. Off, the value is always `#rrggbb` |
| `presets` | | Colours offered first in the popup: hex strings, or `{ name, value }` |
| `defaultPresets` | `'on'` | `'off'` leaves out the general set, showing only yours |
| `handleChange` | | Live, including mid-drag. Canonical hex |
| `handleCommit` | | Once per gesture or preset, with the settled value: one undo step |
*/
/*{ "parent": "ui-controls", "order": 46 }*/

import { svgElements } from 'tosijs'
import { w3dTheme } from './w3d-theme.js'
import { handlerOf } from './handler-of.js'
import { color3d, type ColorField } from './color-field.js'
import { formatColor, parseColor } from './color.js'
import {
  presetCells,
  sharedSwatches,
  type ColorPreset,
} from './color-presets.js'
import { iconGlyph } from './svg-icons.js'
import type { PointerKind, Widget3d, WidgetHost } from './widgets3d.js'

const { g, rect, text, pattern, defs } = svgElements as any

export interface ColorPicker3dOptions {
  label?: string
  /** A colour, or a tosijs reactive value holding one. */
  value?: string | { value: string; observe(cb: () => void): unknown }
  /** Offer alpha. Default `true`. */
  alpha?: boolean
  /** Offered first in the popup. */
  presets?: Array<string | ColorPreset>
  /** `'off'` shows only `presets`. */
  defaultPresets?: 'on' | 'off'
  handleChange?: (hex: string) => void
  handleCommit?: (hex: string) => void
}

export interface ColorPicker extends Widget3d {
  readonly value: string
  setValue: (hex: string) => void
  /** Open the popup, as a tap would. */
  open: () => void
  setHost?: (host: WidgetHost) => void
}

let seq = 0

/**
 * The grid of swatches inside the popup, with two more cells after them:
 * `+` saves the colour being edited, and the bin switches to taking swatches
 * away (tap it, then tap what should go; tap it again to stop).
 */
function presetGrid(opts: {
  list: () => ColorPreset[]
  current: () => string
  pick: (hex: string) => void
  add: (hex: string) => void
  remove: (hex: string) => void
  /** The number of rows changed: the popup has to be laid out afresh. */
  resized: () => void
  deleting: boolean
  setDeleting: (on: boolean) => void
}): Widget3d {
  const SIZE = 24
  const GAP = 6
  const WARN = '#e5484d'
  const el = g({ 'data-w3d': 'color-presets' })
  let presets = opts.list()
  let width = 0
  let cells = presetCells(presets.length + 2, 0, SIZE, GAP)
  let deleting = opts.deleting

  const draw = (): void => {
    while (el.firstChild) el.removeChild(el.firstChild)
    cells = presetCells(presets.length + 2, width, SIZE, GAP)
    presets.forEach((p, i) => {
      const c = cells.at(i)
      el.appendChild(
        rect({
          x: c.x,
          y: c.y,
          width: SIZE,
          height: SIZE,
          rx: 5,
          fill: p.value,
          stroke: deleting ? WARN : w3dTheme.muted,
          'stroke-width': deleting ? 2 : 1,
        })
      )
    })
    const tool = (i: number, icon: string, on: boolean, name: string) => {
      const c = cells.at(i)
      el.appendChild(
        rect({
          x: c.x,
          y: c.y,
          width: SIZE,
          height: SIZE,
          rx: 5,
          fill: on ? WARN : 'transparent',
          stroke: w3dTheme.muted,
          'stroke-width': 1,
          'stroke-dasharray': on ? '' : '3 2',
          'data-swatch-tool': name,
        })
      )
      el.appendChild(
        iconGlyph(icon, {
          color: on ? '#ffffff' : w3dTheme.text,
          size: 14,
          x: c.x + (SIZE - 14) / 2,
          y: c.y + (SIZE - 14) / 2,
        })
      )
    }
    tool(presets.length, 'plus', false, 'add')
    tool(presets.length + 1, 'trash', deleting, 'delete')
  }

  const indexAt = (x: number, y: number): number => {
    for (let i = 0; i < presets.length + 2; i++) {
      const c = cells.at(i)
      if (x >= c.x && x <= c.x + SIZE && y >= c.y && y <= c.y + SIZE) return i
    }
    return -1
  }

  /** Take the list again; say so if the grid now needs a different height. */
  const refresh = (): void => {
    const before = cells.height
    presets = opts.list()
    draw()
    if (cells.height !== before) opts.resized()
  }

  return {
    el,
    layout(w: number) {
      width = w
      draw()
      return cells.height + GAP
    },
    hitTest: (x, y) => indexAt(x, y) >= 0,
    handle(kind: PointerKind, x: number, y: number) {
      if (kind !== 'up') return
      const i = indexAt(x, y)
      if (i < 0) return
      if (i === presets.length) {
        opts.add(opts.current())
        refresh()
      } else if (i === presets.length + 1) {
        deleting = !deleting
        opts.setDeleting(deleting)
        draw()
      } else if (deleting) {
        opts.remove(presets[i].value)
        refresh()
      } else opts.pick(presets[i].value)
    },
  }
}

export function colorPicker3d(config: ColorPicker3dOptions = {}): ColorPicker {
  const showAlpha = config.alpha ?? true
  const uid = `w3d-cpk-${seq++}`
  const box =
    config.value != null &&
    typeof config.value === 'object' &&
    typeof config.value.observe === 'function'
      ? config.value
      : null
  const canon = (v: unknown): string => {
    const rgb = parseColor(String(v ?? '')) ?? { r: 1, g: 1, b: 1, a: 1 }
    return formatColor(showAlpha ? rgb : { ...rgb, a: 1 })
  }
  let value = canon(box ? box.value : config.value ?? '#ffffff')
  let host: WidgetHost | null = null
  let open: { close: () => void } | null = null
  let field: ColorField | null = null
  let width = 0
  // Kept across a re-open, so taking away several swatches is one mode.
  let deleting = false

  const change = handlerOf<(v: string) => void>(
    config as unknown as Record<string, unknown>,
    'handleChange',
    'onChange'
  )

  const H = Math.round(w3dTheme.fontSize * 2.2)
  const PAD = Math.max(6, Math.round(w3dTheme.spacing * 0.6))
  const SW = Math.round(H * 1.5)

  const el = g({ 'data-w3d': 'color-picker' })
  const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: w3dTheme.rowBg })
  const caption = text({
    x: PAD,
    y: H / 2,
    'dominant-baseline': 'middle',
    'font-family': w3dTheme.fontFamily,
    'font-size': String(w3dTheme.fontSize),
    fill: w3dTheme.muted,
  })
  const hexText = text({
    y: H / 2,
    'dominant-baseline': 'middle',
    'text-anchor': 'end',
    'font-family': w3dTheme.fontFamily,
    'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
    fill: w3dTheme.text,
  })
  // A translucent colour over the row would look like the row.
  const check = pattern(
    {
      id: `${uid}-chk`,
      width: 8,
      height: 8,
      patternUnits: 'userSpaceOnUse',
    },
    rect({ width: 8, height: 8, fill: '#ffffff' }),
    rect({ width: 4, height: 4, fill: '#b0b0b0' }),
    rect({ x: 4, y: 4, width: 4, height: 4, fill: '#b0b0b0' })
  )
  const under = rect({
    y: 4,
    width: SW,
    height: H - 8,
    rx: 5,
    fill: `url(#${uid}-chk)`,
  })
  const swatch = rect({
    y: 4,
    width: SW,
    height: H - 8,
    rx: 5,
    stroke: w3dTheme.muted,
    'stroke-width': 1,
  })
  el.appendChild(defs(check))
  el.appendChild(bg)
  el.appendChild(caption)
  el.appendChild(hexText)
  el.appendChild(under)
  el.appendChild(swatch)

  const paint = (): void => {
    caption.textContent = config.label ?? ''
    hexText.textContent = value
    swatch.setAttribute('fill', value)
    const x = Math.max(0, width - PAD - SW)
    under.setAttribute('x', String(x))
    swatch.setAttribute('x', String(x))
    hexText.setAttribute('x', String(Math.max(0, x - PAD)))
  }

  const set = (next: string, commit: boolean, fromField = false): void => {
    const hex = canon(next)
    const changed = hex !== value
    value = hex
    paint()
    if (!fromField) field?.setValue(hex)
    if (changed) {
      if (box != null && box.value !== hex) box.value = hex
      change?.(hex)
    }
    if (commit) config.handleCommit?.(hex)
  }

  // Someone else wrote the bound value: show it.
  box?.observe(() => {
    const hex = canon(box.value)
    if (hex === value) return
    value = hex
    paint()
    field?.setValue(hex)
  })

  const openPopup = (): void => {
    if (host == null || open != null) return
    field = color3d({
      value,
      alpha: showAlpha,
      // Squatter than the standalone picker: it shares a popup with presets.
      aspect: 0.42,
      handleChange: (hex) => set(hex, false, true),
      handleCommit: (hex) => set(hex, true, true),
    })
    const store = sharedSwatches()
    const items: Widget3d[] = [
      field,
      presetGrid({
        list: () => store.list(config.presets, config.defaultPresets !== 'off'),
        current: () => value,
        pick: (hex) => set(hex, true),
        add: (hex) => store.add(hex),
        remove: (hex) => store.remove(hex),
        // The popup was sized for the rows it had: open it again.
        resized: () => {
          const was = open
          open = null
          field = null
          was?.close()
          openPopup()
        },
        deleting,
        setDeleting: (on) => {
          deleting = on
        },
      }),
    ]
    const anchor = { x: 0, y: 0, width, height: H }
    // A layer where the host has one (it may leave the panel, and stays on
    // screen by flipping above its row); else a popup bounded by the panel,
    // given the roomier side and scrolling within it. Same rule as picker3d.
    const below = host.bounds.height - host.top - H - PAD * 2
    const above = host.top - PAD * 2
    const openIt = host.hasLayer ? host.showLayer : host.showPopup
    open = openIt.call(
      host,
      {
        anchor,
        maxHeight: host.hasLayer ? undefined : Math.max(120, below, above),
        // A picker stays open while you try colours, so it needs a way to
        // be put away: the title band with its close (and move) glyphs.
        // …and it carries the row's caption, so several open at once can
        // be told apart.
        ...(host.hasLayer ? { chrome: true, title: config.label ?? '' } : {}),
        width: Math.max(220, Math.min(width, 300)),
        handleClose: () => {
          open = null
          field = null
        },
      },
      ...items
    )
  }

  const api: ColorPicker = {
    el,
    get value() {
      return value
    },
    setValue(hex) {
      set(hex, false)
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
      // On release: a press that becomes a scroll must not open a popup.
      if (kind !== 'up' || y < 0 || y > H) return
      // The row is also the way to put it away again.
      if (open != null) {
        const was = open
        open = null
        field = null
        was.close()
      } else openPopup()
    },
  }
  paint()
  return api
}
