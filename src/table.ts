/*#
# table

A **data table** as a `Widget3d`: a header that stays put, a virtualized scrolling
body, and optional selection drawn with [[selection|state icons]]. Drops into a
[[widget-box]] / [[surface]] panel like any other control, and renders identically flat
and rasterized onto a plane.

The arithmetic is [[table-layout]] — column resolution and the visible-row window —
so this file is paint plus interaction.

## Virtualized by default

Only the rows in view are built. That matters more on a texture than in the DOM,
because unseen rows are paid for **twice**: once building SVG nodes, and again
rasterizing the whole sheet to a `DynamicTexture` on every change. A 500-row inventory
would otherwise be 500 `<g>`s in a texture showing twelve.

## Demo

Scroll the body (wheel or drag). Click a row to select it — the state icon is a
different visual channel from hover, so a row can be hovered *and* selected and both
still read.

```js
import { surface, widgetBox, box, textBlock, table } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 400
const H = 300

const KINDS = ['rifle', 'medkit', 'ration', 'battery', 'flare', 'rope', 'lens']
const rows = Array.from({ length: 200 }, (_, i) => ({
  id: 'r' + i,
  name: KINDS[i % KINDS.length] + ' ' + (i + 1),
  qty: ((i * 7) % 40) + 1,
  mass: (((i * 13) % 90) / 10 + 0.4).toFixed(1),
}))

const readout = div({ style: 'margin:8px 16px;color:#8ea;font:13px system-ui' }, 'No selection.')

const t = table({
  rows,
  columns: [
    { key: 'name', label: 'Item', flex: 1 },
    { key: 'qty', label: 'Qty', width: 54, align: 'right' },
    { key: 'mass', label: 'kg', width: 54, align: 'right' },
  ],
  height: 190,
  selection: 'multi',
  onSelect: (ids) => {
    readout.textContent = ids.length ? `Selected ${ids.length}: ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? '…' : ''}` : 'No selection.'
  },
})

const s = surface({ width: W, height: H })
s.setContent(box({ width: W, height: H, padding: 10, gap: 8, background: '#12151c' },
  textBlock('Inventory — 200 rows, a dozen drawn', { font: { size: 14, weight: 600 }, color: '#e6e6e6' })))
s.openPanel({ x: 8, y: 46 }, widgetBox({ width: 376, padding: 8, background: '#0e1116' }, [t]),
  { title: 'Cargo', draggable: true })

// Scale to whatever room we're given: a fixed viewBox with width/height 100% means
// maximizing the example fills the space instead of leaving the panel marooned in a
// corner. Pointer coords divide out the same scale, so hit-testing is unaffected.
const svgEl = svg({
  viewBox: `0 0 ${W} ${H}`,
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet',
  style: 'display:block;touch-action:none',
}, s.el)
const at = (e) => {
  const r = svgEl.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))
// Wheel scrolls too, but DRAGGING the body is the primary gesture — a wheel doesn't
// exist on touch and can't be expressed by a VR ray.
svgEl.addEventListener('wheel', (e) => { t.scrollBy(e.deltaY); e.preventDefault() }, { passive: false })

preview.append(
  div({ style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div({ style: 'flex:1;min-height:0;padding:12px' }, svgEl),
    readout)
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "UI" }*/

import { svgElements } from 'tosijs'
import {
  resolveColumns,
  visibleRows,
  maxScroll,
  rowAt,
  type ColumnSpec,
  type ColumnRect,
} from './table-layout'
import { selectionIcon, applySelection, type SelectionMode } from './selection'
import { iconGlyph } from './svg-icons'
import type { Widget3d, PointerKind } from './widgets3d'

const { g, rect, text, clipPath } = svgElements

const cssVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}
const TEXT = cssVar('--w3d-text', '#f0f0f0')
const MUTED = cssVar('--w3d-muted', '#9aa0a6')
const ACCENT = cssVar('--w3d-accent', '#39c5ff')
const ROW_HOVER = cssVar('--w3d-row-hover', 'rgba(255,255,255,0.13)')
const HEADER_BG = cssVar('--w3d-track', '#3a3f4a')
const FONT_FAMILY = cssVar('--w3d-font-family', 'system-ui, sans-serif')

let seq = 0

/** A row: anything with an `id`, read by column `key`. */
export type TableRow = { id: string } & Record<string, unknown>

export interface Table extends Widget3d {
  /** Scroll the body by a delta (clamped). */
  scrollBy: (delta: number) => void
  /** Currently selected row ids. */
  readonly selected: string[]
  /** Replace the rows (keeps scroll, drops selections that no longer exist). */
  setRows: (rows: TableRow[]) => void
}

export function table(config: {
  rows: TableRow[]
  columns: ColumnSpec[]
  /** Body height in px (the header sits above it). */
  height?: number
  rowHeight?: number
  headerHeight?: number
  gap?: number
  /** Omit for a non-selectable table. */
  selection?: SelectionMode
  /** Let a single-select tap on the selected row clear it. See `applySelection`. */
  allowDeselect?: boolean
  onSelect?: (ids: string[]) => void
  /** Row activated (a second click / Enter) — distinct from selecting it. */
  onActivate?: (row: TableRow) => void
}): Table {
  const ROW_H = config.rowHeight ?? 28
  const HEAD_H = config.headerHeight ?? 26
  const BODY_H = config.height ?? 180
  const GAP = config.gap ?? 8
  const SEL_W = config.selection ? 26 : 0
  const FONT = 13

  let rows = config.rows.slice()
  let width = 0
  let cols: ColumnRect[] = []
  let scroll = 0
  let hover = -1
  let selected = new Set<string>()
  /** In-flight press: where it started, and whether it has become a scroll. */
  let drag: { y: number; scroll0: number; moved: boolean } | null = null
  /** Movement past this many px turns a press into a scroll rather than a click. */
  const DRAG_SLOP = 4

  const clipId = `tbl-clip-${seq++}`
  const clip = clipPath({ id: clipId }, rect({ x: 0, y: 0 }))
  const clipRect = clip.firstChild as SVGRectElement
  const headLayer = g({ 'data-tbl': 'head' }) as SVGGElement
  // The body is clipped and its contents translated — the scroll is a transform, so
  // scrolling never rebuilds a row that is already built.
  const bodyInner = g({ 'data-tbl': 'rows' }) as SVGGElement
  const bodyLayer = g(
    { 'data-tbl': 'body', 'clip-path': `url(#${clipId})` },
    bodyInner
  ) as SVGGElement
  const el = g(
    { 'data-w3d': 'table' },
    clip,
    headLayer,
    bodyLayer
  ) as unknown as SVGGElement

  const cell = (
    value: string,
    x: number,
    w: number,
    y: number,
    align: ColumnSpec['align'],
    color: string,
    bold = false
  ): SVGElement => {
    const anchor =
      align === 'right' ? 'end' : align === 'center' ? 'middle' : 'start'
    const tx =
      align === 'right' ? x + w - 4 : align === 'center' ? x + w / 2 : x
    const t = text({
      x: tx,
      y: y + ROW_H / 2,
      'text-anchor': anchor,
      'dominant-baseline': 'middle',
      'font-size': FONT,
      'font-family': FONT_FAMILY,
      'font-weight': bold ? '600' : '400',
      fill: color,
    })
    t.textContent = value
    return t
  }

  const paintHeader = (): void => {
    headLayer.replaceChildren()
    headLayer.append(
      rect({ x: 0, y: 0, width, height: HEAD_H, rx: 4, fill: HEADER_BG })
    )
    for (const c of cols) {
      const label = c.label ?? c.key
      const anchor =
        c.align === 'right' ? 'end' : c.align === 'center' ? 'middle' : 'start'
      const tx =
        c.align === 'right'
          ? SEL_W + c.x + c.width - 4
          : c.align === 'center'
          ? SEL_W + c.x + c.width / 2
          : SEL_W + c.x
      const t = text({
        x: tx,
        y: HEAD_H / 2,
        'text-anchor': anchor,
        'dominant-baseline': 'middle',
        'font-size': 12,
        'font-family': FONT_FAMILY,
        'font-weight': '600',
        fill: MUTED,
      })
      t.textContent = label
      headLayer.append(t)
    }
  }

  const paintBody = (): void => {
    const win = visibleRows({
      scroll,
      rowHeight: ROW_H,
      viewportHeight: BODY_H,
      count: rows.length,
    })
    bodyInner.replaceChildren()
    bodyInner.setAttribute('transform', `translate(0 ${win.offsetY})`)
    for (let i = win.start; i < win.end; i++) {
      const row = rows[i]
      const y = (i - win.start) * ROW_H
      const isSel = selected.has(row.id)
      const kids: SVGElement[] = [
        rect({
          x: 0,
          y,
          width,
          height: ROW_H,
          rx: 4,
          // Hover is intensity; selection is the icon. Different channels, so a row
          // can be both at once without either being finessed against the other.
          fill: i === hover ? ROW_HOVER : 'transparent',
        }),
      ]
      if (config.selection) {
        kids.push(
          iconGlyph(selectionIcon(config.selection, isSel), {
            size: 16,
            color: isSel ? ACCENT : MUTED,
            x: 4,
            y: y + (ROW_H - 16) / 2,
          }) as unknown as SVGElement
        )
      }
      for (const c of cols) {
        const v = row[c.key]
        kids.push(
          cell(
            v == null ? '' : String(v),
            SEL_W + c.x,
            c.width,
            y,
            c.align,
            TEXT
          )
        )
      }
      bodyInner.append(g({ 'data-row': row.id }, ...kids))
    }
  }

  const relayout = (): void => {
    cols = resolveColumns(config.columns, { width: width - SEL_W, gap: GAP })
    clipRect.setAttribute('width', String(width))
    clipRect.setAttribute('height', String(BODY_H))
    bodyLayer.setAttribute('transform', `translate(0 ${HEAD_H + 2})`)
    // NOT translated to match: a clip-path resolves in the user space of the element
    // that references it, which already includes that element's own transform. Moving
    // the clip too offsets it twice, and the top row is silently clipped away —
    // visible as a blank band under the header with a row missing. (Tests counting
    // built rows can't see this; only looking at it can.)
    paintHeader()
    paintBody()
  }

  const clampScroll = (v: number): number => {
    const max = maxScroll({
      count: rows.length,
      rowHeight: ROW_H,
      viewportHeight: BODY_H,
    })
    return v < 0 ? 0 : v > max ? max : v
  }

  /** Body-local y for a widget-local y, or null if the point isn't in the body. */
  const bodyY = (y: number): number | null => {
    const by = y - (HEAD_H + 2)
    return by >= 0 && by <= BODY_H ? by : null
  }

  const api: Table = {
    el,
    get selected() {
      return [...selected]
    },
    layout(w: number) {
      width = w
      relayout()
      return HEAD_H + 2 + BODY_H
    },
    scrollBy(delta: number) {
      const next = clampScroll(scroll + delta)
      if (next === scroll) return
      scroll = next
      paintBody()
    },
    setRows(next: TableRow[]) {
      rows = next.slice()
      const live = new Set(rows.map((r) => r.id))
      // Drop selections whose rows are gone — otherwise onSelect reports ids that no
      // longer exist and the count disagrees with what's on screen.
      let changed = false
      for (const id of [...selected])
        if (!live.has(id)) {
          selected.delete(id)
          changed = true
        }
      scroll = clampScroll(scroll)
      paintBody()
      if (changed) config.onSelect?.([...selected])
    },
    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'leave') {
        drag = null
        if (hover !== -1) {
          hover = -1
          paintBody()
        }
        return
      }
      const by = bodyY(y)
      const i =
        by == null
          ? -1
          : rowAt(by, { scroll, rowHeight: ROW_H, count: rows.length })

      // Drag-to-scroll. A wheel is useless on touch and impossible with a VR ray, so
      // dragging the body IS the scroll gesture — but the same press also has to be
      // able to select a row. Distinguish by movement: past the threshold it becomes
      // a scroll and can no longer select, so a slightly shaky tap still selects.
      if (kind === 'down') {
        drag = by == null ? null : { y, scroll0: scroll, moved: false }
        return
      }
      if (kind === 'move' && drag) {
        const dy = y - drag.y
        if (!drag.moved && Math.abs(dy) > DRAG_SLOP) drag.moved = true
        if (drag.moved) {
          const next = clampScroll(drag.scroll0 - dy)
          if (next !== scroll) {
            scroll = next
            paintBody()
          }
          return
        }
      }
      if (kind === 'move' || kind === 'hover') {
        if (i !== hover) {
          hover = i
          paintBody()
        }
        return
      }
      if (kind === 'up' && drag?.moved) {
        drag = null // that press was a scroll, not a click
        return
      }
      drag = null
      if (kind === 'up' && i >= 0) {
        const row = rows[i]
        if (config.selection) {
          const was = selected.has(row.id)
          selected = applySelection(selected, row.id, config.selection, {
            allowDeselect: config.allowDeselect,
          })
          paintBody()
          config.onSelect?.([...selected])
          // A click on an already-selected row reads as "open it" — the second click
          // of a select-then-activate, without needing a double-click (which is a
          // poor fit for a VR ray).
          if (was && selected.has(row.id)) config.onActivate?.(row)
        } else {
          config.onActivate?.(row)
        }
      }
    },
  }
  return api
}
