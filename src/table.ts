/*#
# table

A **data table** as a `Widget3d`: a header that stays put, a virtualized scrolling
body, and optional selection drawn with [[selection|state icons]]. Drops into a
[[widget-box]] / [[surface]] panel like any other control, and renders identically flat
and rasterized onto a plane.

The arithmetic is [[table-layout]] — column resolution and the visible-row window —
so this file is paint plus interaction.

## Filtering and row actions

`filter` (or `setFilter`) shows only the rows a predicate matches, and `counts`
reports `{ visible, total }` so a search box can say "3 of 128".

**A filter never drops a selection.** Hiding is a view state; losing a selection
to it would make typing in a search box quietly destructive. The table keeps the
full set and filters a view of it, so a selected row that scrolls out of the
filter is still selected when it comes back — and `setRows` checks selections
against ALL rows for the same reason.

A **`button` column** gives each row an action of its own. With `menu` it opens
an action menu anchored to the cell; with `handlePress` it just fires. The
button takes the press instead of the row, so a row's ⋯ does not also select
it — two things from one tap, and the selection is the one nobody asked for.

```javascript
table({
  rows,
  columns: [
    { key: 'kind', width: 28, kind: 'icon' },
    { key: 'name', flex: 1 },
    { key: 'act', width: 30, kind: 'button', menu: (row) => [
      { label: 'Duplicate', icon: 'copy', handleSelect: () => duplicate(row) },
      { label: 'Delete', icon: 'trash', disabled: () => row.locked },
    ] },
  ],
})
```

An empty menu falls through to `handlePress` rather than opening nothing, and a
table with no host is inert rather than throwing.

## Virtualized by default

Only the rows in view are built. That matters more on a texture than in the DOM,
because unseen rows are paid for **twice**: once building SVG nodes, and again
rasterizing the whole sheet to a `DynamicTexture` on every change. A 500-row inventory
would otherwise be 500 `<g>`s in a texture showing twelve.

## Demo

Scroll the body by **dragging** it (or the wheel). Click a row to select it. Then click
into the table and use **arrow keys + Enter** — that's the D-pad path, and it's the only
one that exists in a headset.

Three independent channels, so a row can be all three at once and each still reads:
**hover** = background, **selection** = icon, **focus** = ring.

```js
import { b3d, b3dLight, panelScene, ui } from 'tosijs-3d'
const { surface, widgetBox, box, textBlock, table, svgPoint } = ui
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
  handleSelect: (ids) => {
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
// corner. Pointer coords go through svgPoint, which handles the letterboxing.
const svgEl = svg({
  viewBox: `0 0 ${W} ${H}`,
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet',
  style: 'display:block;touch-action:none',
}, s.el)
const at = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))
// Wheel scrolls too, but DRAGGING the body is the primary gesture — a wheel doesn't
// exist on touch and can't be expressed by a VR ray.
svgEl.addEventListener('wheel', (e) => { t.scrollBy(e.deltaY); e.preventDefault() }, { passive: false })

// D-pad / keyboard traversal. A gamepad user has no pointer and a headset has no
// keyboard, so direction + confirm has to be sufficient on its own. Arrow keys stand
// in for the D-pad here; the same two calls are what a gamepad would drive.
svgEl.setAttribute('tabindex', '0')
svgEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { t.focusMove(0, 1); e.preventDefault() }
  else if (e.key === 'ArrowUp') { t.focusMove(0, -1); e.preventDefault() }
  else if (e.key === 'Enter' || e.key === ' ') { t.focusActivate(); e.preventDefault() }
  else if (e.key === 'Escape') { t.focusClear() }
})
svgEl.focus()

// 3D side — the same surface on a plane; drag the body to scroll with the ray
// path, exactly as a headset would.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: s })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div({ style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div({ style: 'display:flex;gap:20px;flex:1;min-height:0;padding:12px' },
      div({ style: 'flex:1;min-width:0' }, svgEl),
      div({ style: 'flex:1;min-width:0' }, scene)),
    readout)
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "UI", "order": 220 }*/

import { svgElements } from 'tosijs'
import {
  resolveColumns,
  visibleRows,
  maxScroll,
  rowAt,
  type ColumnSpec,
  type ColumnRect,
} from './table-layout.js'
import {
  selectionIcon,
  applySelection,
  type SelectionMode,
} from './selection.js'
import { iconGlyph } from './svg-icons.js'
import { openMenu3d } from './widgets3d.js'
import { handlerOf } from './handler-of.js'
import type { Widget3d, PointerKind, WidgetHost } from './widgets3d.js'
import { w3dTheme } from './w3d-theme.js'

const { g, rect, text, clipPath } = svgElements

// Theme reads live in ONE module (w3d-theme); local names for paint brevity.
const TEXT = w3dTheme.text
const MUTED = w3dTheme.muted
const ACCENT = w3dTheme.accent
const ROW_HOVER = w3dTheme.rowHover
const HEADER_BG = w3dTheme.track
const FONT_FAMILY = w3dTheme.fontFamily

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
  /**
   * Show only rows matching a predicate; pass `null` to show everything.
   *
   * Filtering does NOT drop selections. A row you selected and then filtered
   * out is still selected when it comes back — hiding is a view state, and
   * losing a selection to it would make a search box destructive.
   */
  setFilter: (filter: ((row: TableRow) => boolean) | null) => void
  /** How many rows the filter is currently showing, out of how many exist. */
  readonly counts: { visible: number; total: number }

  // --- Focus traversal (D-pad / keyboard) ---------------------------------
  // A gamepad user has NO pointer, and in a headset there is no keyboard either, so
  // the table has to be drivable by direction + confirm alone.

  /** The focused row index, or -1. */
  readonly focusIndex: number
  /**
   * Move focus one row (`dy` +1 down / -1 up), scrolling it into view. The
   * signature is the INNER-FOCUS PROTOCOL's `(dx, dy)` — the shape every host
   * calls (`box.focusMove`, `widgetChild`, `gamepadFocus`) — so a table hosted
   * in a panel traverses correctly. A pure-horizontal move is not consumed
   * (a row list has no columns to walk).
   *
   * Returns **false when the move would leave the table** — at either end,
   * horizontally, or when there are no rows. That's the contract that lets
   * focus escape: a host moves on to the next widget when this says "not
   * mine". Clamping instead is what traps focus inside a list forever, which
   * is the classic D-pad dead end.
   */
  focusMove: (dx: number, dy: number) => boolean
  /** Commit the focused row (A / Enter). Same effect as tapping it. */
  focusActivate: () => boolean
  /** Drop focus (B / the host taking it elsewhere). */
  focusClear: () => void
}

export interface TableOptions {
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
  /**
   * Show only the rows this returns true for.
   *
   * A PREDICATE rather than a filtered array, so the table keeps owning the
   * full set: selection survives a filter that hides a selected row, and
   * clearing the filter brings it back rather than requiring the consumer to
   * re-supply everything. Set `filter` on the returned table to change it.
   */
  filter?: (row: TableRow) => boolean
  handleSelect?: (ids: string[]) => void
  /** @deprecated use `handleSelect` — removed in 0.9. */
  onSelect?: (ids: string[]) => void
  /** Row activated (a second click / Enter) — distinct from selecting it. */
  handleActivate?: (row: TableRow) => void
  /** @deprecated use `handleActivate` — removed in 0.9. */
  onActivate?: (row: TableRow) => void
}

export function table(config: TableOptions): Table {
  const cfg = config as unknown as Record<string, unknown>
  const selected$ = (): ((ids: string[]) => void) | undefined =>
    handlerOf(cfg, 'handleSelect', 'onSelect')
  const activated$ = (): ((row: TableRow) => void) | undefined =>
    handlerOf(cfg, 'handleActivate', 'onActivate')
  const ROW_H = config.rowHeight ?? 28
  const HEAD_H = config.headerHeight ?? 26
  const BODY_H = config.height ?? 180
  const GAP = config.gap ?? 8
  const SEL_W = config.selection ? 26 : 0
  const FONT = 13

  /*
  ALL rows, and the subset currently shown. Kept apart on purpose: selection,
  `setRows` and the row ids all speak about `allRows`, while scrolling,
  virtualization and hit-testing speak about `rows`. Collapsing them would make
  a filter destructive — hiding a selected row would deselect it.
  */
  let allRows = config.rows.slice()
  let filter: ((row: TableRow) => boolean) | null = config.filter ?? null
  let rows = filter ? allRows.filter(filter) : allRows.slice()
  let width = 0
  let cols: ColumnRect[] = []
  let scroll = 0
  let hover = -1
  /** D-pad / keyboard focus, as a row index; -1 = not focused. */
  let focused = -1
  let selected = new Set<string>()
  /** In-flight press: where it started, and whether it has become a scroll. */
  let drag: { y: number; scroll0: number; moved: boolean } | null = null
  /** Set by the panel; a button column needs it to open a menu. */
  let host: WidgetHost | null = null
  /** Movement past this many px turns a press into a scroll rather than a click. */
  const DRAG_SLOP = 4

  const applyFilter = (): void => {
    rows = filter ? allRows.filter(filter) : allRows.slice()
  }

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

  // The window paintBody last BUILT, plus the per-row background rects — what
  // the surgical paths below restyle without a rebuild.
  let built: { start: number; end: number } | null = null
  let rowBgs: SVGRectElement[] = []

  /**
   * Scroll moved and NOTHING else: if the visible window is unchanged, the
   * scroll really is just a transform (as the comment at bodyInner promises —
   * the review caught paintBody rebuilding every row on every drag-scroll
   * move, contradicting it); a window shift rebuilds.
   */
  const paintScrolled = (): void => {
    const win = visibleRows({
      scroll,
      rowHeight: ROW_H,
      viewportHeight: BODY_H,
      count: rows.length,
    })
    if (built && built.start === win.start && built.end === win.end) {
      bodyInner.setAttribute('transform', `translate(0 ${win.offsetY})`)
      return
    }
    paintBody()
  }

  /** Hover moved and NOTHING else: restyle the two affected row backgrounds. */
  const paintHover = (prev: number): void => {
    if (!built) return paintBody()
    for (const i of [prev, hover]) {
      const bg = i >= 0 ? rowBgs[i - built.start] : undefined
      if (i >= 0 && !bg && i >= built.start && i < built.end) return paintBody()
      bg?.setAttribute('fill', i === hover ? ROW_HOVER : 'transparent')
    }
  }

  const paintBody = (): void => {
    const win = visibleRows({
      scroll,
      rowHeight: ROW_H,
      viewportHeight: BODY_H,
      count: rows.length,
    })
    built = { start: win.start, end: win.end }
    rowBgs = []
    bodyInner.replaceChildren()
    bodyInner.setAttribute('transform', `translate(0 ${win.offsetY})`)
    for (let i = win.start; i < win.end; i++) {
      const row = rows[i]
      const y = (i - win.start) * ROW_H
      const isSel = selected.has(row.id)
      const bg = rect({
        x: 0,
        y,
        width,
        height: ROW_H,
        rx: 4,
        // Hover is intensity; selection is the icon. Different channels, so a row
        // can be both at once without either being finessed against the other.
        fill: i === hover ? ROW_HOVER : 'transparent',
      }) as SVGRectElement
      rowBgs.push(bg)
      const kids: SVGElement[] = [bg]
      // …and FOCUS is a third channel: an outline. With a D-pad you have to see where
      // you are BEFORE you commit to toggling it, so focus must read even on a row
      // that is simultaneously hovered and selected.
      if (i === focused) {
        kids.push(
          rect({
            x: 1,
            y: y + 1,
            width: Math.max(0, width - 2),
            height: ROW_H - 2,
            rx: 4,
            fill: 'none',
            stroke: ACCENT,
            'stroke-width': 2,
            'data-focus-ring': '',
          })
        )
      }
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
        if (c.kind === 'button') {
          /*
          A button cell is an icon in a hit target, drawn dimmer than a kind
          glyph so it reads as an affordance rather than as data — the row's
          own colour would make it look like another field.
          */
          const size = 16
          kids.push(
            iconGlyph(v == null ? 'moreVertical' : String(v), {
              size,
              color: MUTED,
              x: SEL_W + c.x + (c.width - size) / 2,
              y: y + (ROW_H - size) / 2,
            }) as unknown as SVGElement
          )
          continue
        }
        if (c.kind === 'icon') {
          /*
          The row's own colour, not a fixed one, so a kind glyph dims and
          highlights with everything else in the row. Centred in the column
          because an icon has no baseline to align to and a left-aligned glyph
          in a narrow column reads as a mistake.
          */
          const size = 16
          kids.push(
            iconGlyph(v == null ? '' : String(v), {
              size,
              color: TEXT,
              x: SEL_W + c.x + (c.width - size) / 2,
              y: y + (ROW_H - size) / 2,
            }) as unknown as SVGElement
          )
          continue
        }
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

  /**
   * What a commit on a row does — the ONE definition, shared by a pointer tap and by
   * D-pad activate. Two copies would drift, and the drift would be silent: a table
   * that selects differently depending on which input you used.
   */
  const commitRow = (row: TableRow): void => {
    if (config.selection) {
      const was = selected.has(row.id)
      selected = applySelection(selected, row.id, config.selection, {
        allowDeselect: config.allowDeselect,
      })
      paintBody()
      selected$()?.([...selected])
      // Committing an already-selected row reads as "open it" — the second half of
      // select-then-activate, without a double-click (a poor fit for a VR ray, and
      // impossible to express on a D-pad).
      if (was && selected.has(row.id)) activated$()?.(row)
    } else {
      activated$()?.(row)
    }
  }

  /**
   * Scroll the focused row fully into view. Focus that moves off-screen is the
   * classic way a D-pad list becomes unusable: the ring is *somewhere*, you just
   * can't see it, so you press again and overshoot.
   */
  const revealFocused = (): void => {
    if (focused < 0) return
    const top = focused * ROW_H
    const bottom = top + ROW_H
    if (top < scroll) scroll = top
    else if (bottom > scroll + BODY_H) scroll = bottom - BODY_H
    scroll = clampScroll(scroll)
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
      paintScrolled()
    },
    get focusIndex() {
      return focused
    },
    focusMove(dx: number, dy: number) {
      if (rows.length === 0) return false
      // Horizontal isn't ours: a row list has no columns, so LEFT/RIGHT escape
      // to the host rather than being eaten. (This arg order bug shipped in
      // rc.1 as focusMove(dy) — the protocol's dx landed in dy, trapping D-pad
      // focus vertically. The signature is the protocol's now; caught by the
      // pre-release review.)
      if (dy === 0) return false
      // Entering: the first press lands on the top visible row rather than row 0, so
      // focus appears where you're already looking after a scroll.
      if (focused < 0) {
        focused = Math.min(
          rows.length - 1,
          Math.max(0, Math.ceil(scroll / ROW_H))
        )
        revealFocused()
        paintBody()
        return true
      }
      const next = focused + (dy > 0 ? 1 : dy < 0 ? -1 : 0)
      // Past either end, DON'T clamp — report "not consumed" so the host can move
      // focus on to the next widget. Clamping is what traps focus in a list forever.
      if (next < 0 || next >= rows.length) return false
      focused = next
      revealFocused()
      paintBody()
      return true
    },
    focusActivate() {
      if (focused < 0 || focused >= rows.length) return false
      commitRow(rows[focused])
      return true
    },
    focusClear() {
      if (focused === -1) return
      focused = -1
      paintBody()
    },
    setRows(next: TableRow[]) {
      allRows = next.slice()
      applyFilter()
      // Selections are checked against ALL rows, not the visible ones — a row
      // hidden by a filter still exists, and dropping its selection would make
      // typing in a search box quietly destructive.
      const live = new Set(allRows.map((r) => r.id))
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
      if (changed) selected$()?.([...selected])
    },
    setHost(h: WidgetHost) {
      host = h
    },
    setFilter(next: ((row: TableRow) => boolean) | null) {
      filter = next
      applyFilter()
      // Scrolled past the end of a shorter list is a blank table that looks
      // broken, so come back into range rather than leaving it there.
      scroll = clampScroll(scroll)
      focused = -1
      paintBody()
    },
    get counts() {
      return { visible: rows.length, total: allRows.length }
    },
    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'leave') {
        drag = null
        if (hover !== -1) {
          const prev = hover
          hover = -1
          paintHover(prev)
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
            paintScrolled()
          }
          return
        }
      }
      if (kind === 'move' || kind === 'hover') {
        if (i !== hover) {
          const prev = hover
          hover = i
          paintHover(prev)
        }
        return
      }
      if (kind === 'up' && drag?.moved) {
        drag = null // that press was a scroll, not a click
        return
      }
      drag = null
      if (kind === 'up' && i >= 0) {
        /*
        A BUTTON COLUMN takes the press instead of the row.

        Otherwise a row's ⋯ button both opens its menu and selects the row —
        two things happening from one tap, and the selection is the one nobody
        asked for. Checked by x against the column rect, so the rest of the row
        behaves exactly as before.
        */
        const btn = cols.find(
          (c) =>
            c.kind === 'button' &&
            x >= SEL_W + c.x &&
            x <= SEL_W + c.x + c.width
        )
        if (btn != null) {
          const row = rows[i]
          const items = btn.menu?.(row)
          if (items != null && items.length > 0 && host != null) {
            openMenu3d(
              host,
              {
                x: SEL_W + btn.x,
                y: HEAD_H + GAP + i * ROW_H - scroll,
                width: btn.width,
                height: ROW_H,
              },
              items
            )
          } else {
            btn.handlePress?.(row)
          }
          return
        }
        // A pointer tap also moves focus there, so switching from mouse to D-pad
        // resumes from the row you last touched rather than jumping somewhere else.
        focused = i
        commitRow(rows[i])
      }
    },
  }
  return api
}
