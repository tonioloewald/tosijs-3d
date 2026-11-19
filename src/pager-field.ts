/*#
# Pager

**One page at a time**: ‹ and › step through, a dot per page shows where you
are, and a tap on a dot goes straight to it. A [[widgets3d|Widget3d]], so it works the same flat,
in a scene and in a headset. Use it where a panel would otherwise scroll, since
scrolling a panel with a controller ray is much harder than scrolling a page.

## Demo

```js
import { b3d, b3dLight, panelScene, panel3d, textBlock3d, pager3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const pages = ['Check the menu opens', 'Check the list scrolls', 'Check the dialog closes', 'Check the keyboard types']
const done = new Set([1])

const page = textBlock3d({ lines: [pages[0]] })
const panel = panel3d(
  { width: 300 },
  page,
  pager3d({
    count: pages.length,
    index: 0,
    // A dot can wear a colour: here, pages already done are green.
    dotColor: (i) => (done.has(i) ? '#30d158' : undefined),
    handleChange: (i) => page.update([pages[i]]),
  })
)

// One panel, shown twice: as DOM, and on a plane in a scene.
const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.2 } })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;gap:24px;height:100%;padding:16px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', panel),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```

Press › and ‹, or tap a dot.

## The page is the host's

The pager holds which page is shown and reports a turn through
`handleChange(index)`; the pages are the host's. Update the content in place,
as the demo does, or rebuild the panel when pages differ in size (a rebuild is
how a panel takes a new size). `setIndex(i)` moves it without reporting. `dotColor(i)` colours a dot, so a
glance shows which pages are done; `undefined` leaves it the theme's.

More than `maxDots` pages (default 12) show as `3 / 20` between the arrows
instead of dots. A screen reader and an agent see a `previous` and a `next`
button, and the page as a choice they can set.
*/
/*{ "parent": "widgets3d", "order": 31 }*/

import { svgElements } from 'tosijs'
import { w3dTheme } from './w3d-theme.js'
import type { PointerKind, Widget3d } from './widgets3d.js'

const { g, rect, path, circle, text } = svgElements

export interface Pager3dOptions {
  /** How many pages. */
  count: number
  /** The page shown, from 0. */
  index: number
  /** A page asked for, by an arrow or a dot. */
  handleChange?: (index: number) => void
  /** A dot's colour, or `undefined` for the theme's. */
  dotColor?: (index: number) => string | undefined
  /** Past this many pages, `3 / 20` stands in for the dots. */
  maxDots?: number
  /** Its accessible name. Default `page`. */
  name?: string
}

/** Where a press at `x` lands: an arrow, a dot, or nothing. Pure. */
export function pagerTarget(
  x: number,
  width: number,
  rowH: number,
  count: number,
  dots: boolean
): { kind: 'prev' | 'next' } | { kind: 'dot'; index: number } | null {
  if (x < rowH) return { kind: 'prev' }
  if (x > width - rowH) return { kind: 'next' }
  if (!dots || count < 1) return null
  const span = width - rowH * 2
  const step = Math.min(rowH, span / count)
  const left = rowH + (span - step * count) / 2
  const i = Math.floor((x - left) / step)
  return i >= 0 && i < count ? { kind: 'dot', index: i } : null
}

export interface Pager extends Widget3d {
  /** The page shown. */
  readonly index: number
  /** Show another page without reporting it (the host moved it). */
  setIndex(index: number): void
  /** Draw again: after a `dotColor` answer changed. */
  refresh(): void
}

export function pager3d(config: Pager3dOptions): Pager {
  const count = Math.max(0, Math.floor(config.count))
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, Math.floor(i)))
  let index = clamp(config.index)
  const dots = count <= (config.maxDots ?? 12)
  const go = (i: number) => {
    if (i < 0 || i >= count || i === index) return
    index = i
    if (rowH > 0) draw()
    config.handleChange?.(i)
  }

  const el = g({ 'data-w3d': 'pager' })
  const bgs = [0, 1].map(() => rect({ rx: 6, ry: 6, fill: w3dTheme.rowBg }))
  const arrows = [0, 1].map(() =>
    path({
      fill: 'none',
      'stroke-width': 2.4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    })
  )
  const marks = dots
    ? Array.from({ length: count }, () => circle({}))
    : [
        text({
          'text-anchor': 'middle',
          'font-family': w3dTheme.fontFamily,
          fill: w3dTheme.text,
        }),
      ]
  el.append(...bgs, ...arrows, ...marks)

  let width = 0
  let rowH = 0
  let lit: 'prev' | 'next' | number | null = null
  let pressed: 'prev' | 'next' | number | null = null

  const draw = () => {
    const s = rowH
    const c = s / 2
    const a = s * 0.16
    const can = [index > 0, index < count - 1]
    ;(['prev', 'next'] as const).forEach((k, i) => {
      const x0 = i === 0 ? 0 : width - s
      bgs[i].setAttribute('x', String(x0))
      bgs[i].setAttribute('width', String(s))
      bgs[i].setAttribute('height', String(s))
      bgs[i].setAttribute(
        'fill',
        can[i] && (lit === k || pressed === k)
          ? w3dTheme.rowHover
          : w3dTheme.rowBg
      )
      const cx = x0 + c
      const d = i === 0 ? a * 0.6 : -a * 0.6
      arrows[i].setAttribute(
        'd',
        `M${cx + d} ${c - a * 1.4}L${cx - d} ${c}L${cx + d} ${c + a * 1.4}`
      )
      arrows[i].setAttribute('stroke', can[i] ? w3dTheme.text : w3dTheme.muted)
      arrows[i].setAttribute('opacity', can[i] ? '1' : '0.35')
    })
    if (dots) {
      const span = width - s * 2
      const step = Math.min(s, span / Math.max(1, count))
      const left = s + (span - step * count) / 2
      marks.forEach((m, i) => {
        const on = i === index
        const colour = config.dotColor?.(i)
        m.setAttribute('cx', String(left + step * (i + 0.5)))
        m.setAttribute('cy', String(c))
        m.setAttribute(
          'r',
          String(Math.min(step * 0.32, s * (on ? 0.2 : 0.13)))
        )
        m.setAttribute(
          'fill',
          colour ?? (on ? w3dTheme.accent : w3dTheme.muted)
        )
        // The page shown wears a ring, so a coloured dot still says "here".
        m.setAttribute('stroke', on ? w3dTheme.text : 'none')
        m.setAttribute('stroke-width', on ? '1.5' : '0')
        m.setAttribute('opacity', on || lit === i ? '1' : '0.75')
      })
    } else {
      const t = marks[0]
      t.textContent = `${index + 1} / ${count}`
      t.setAttribute('x', String(width / 2))
      t.setAttribute('y', String(c + w3dTheme.fontSize * 0.35))
      t.setAttribute('font-size', String(w3dTheme.fontSize))
    }
  }

  const targetAt = (x: number) => {
    const t = pagerTarget(x, width, rowH, count, dots)
    return t == null ? null : t.kind === 'dot' ? t.index : t.kind
  }
  const act = (t: 'prev' | 'next' | number) =>
    go(t === 'prev' ? index - 1 : t === 'next' ? index + 1 : t)

  return {
    el,
    get index() {
      return index
    },
    setIndex(i: number) {
      index = clamp(i)
      if (rowH > 0) draw()
    },
    refresh: () => {
      if (rowH > 0) draw()
    },
    layout(w: number) {
      width = w
      rowH = Math.max(32, Math.round(w3dTheme.fontSize * 2.2))
      draw()
      return rowH
    },
    handle(kind: PointerKind, x: number) {
      const t = targetAt(x)
      if (kind === 'leave') lit = null
      else lit = t
      if (kind === 'down') pressed = t
      if (kind === 'up') {
        if (t != null && t === pressed) act(t)
        pressed = null
      }
      draw()
    },
    hitTest: (x: number) => targetAt(x) != null,
    setState(state) {
      if (!state.hovered && !state.pressed) {
        lit = null
        pressed = null
        draw()
      }
    },
    focusMove(dx: number) {
      // Left and right turn the page; up and down leave the row.
      if (dx === 0) return false
      act(dx < 0 ? 'prev' : 'next')
      return true
    },
    semantics: () => ({
      role: 'group',
      name: config.name ?? 'page',
      children: [
        {
          handle: true,
          semantics: () => ({
            role: 'button',
            name: 'previous',
            activate: () => act('prev'),
          }),
        },
        {
          handle: true,
          semantics: () => ({
            role: 'slider',
            name: config.name ?? 'page',
            value: index + 1,
            set: (v: unknown) => go(Number(v) - 1),
          }),
        },
        {
          handle: true,
          semantics: () => ({
            role: 'button',
            name: 'next',
            activate: () => act('next'),
          }),
        },
      ],
    }),
  }
}
