/*#
# box

The **flow `box`** — the first-class SVG UI container built on [[flow-layout]]. A
`box` paints its children (blocks + inline items + wrapped text) to an SVG `<g>`,
gives itself a background / border, **resizes** (re-flowing text and inline wrap),
and becomes a **scroll region** when its content outgrows a fixed height. It
renders identically as a DOM node and — via `.el.outerHTML` — on a 3D texture
([[svg-icons|iconGlyph]] children bake explicit colours for exactly that), so one
surface serves flat and VR.

This is layout + paint + scroll. The **event model** (one `handlePointer` +
focus-traversal for gamepad nav — see UI-DESIGN-NOTES) and the overlay/popup layer
land next; the child protocol already carries the hooks they'll use.

## Children

A `BoxChild` is `{ el, kind, measure, paint? }`:

- **block** — fills the content width, `measure(width) → { height }`, stacks.
- **inline** — `measure() → { width, height }`, flows left-to-right and wraps.

Helpers build the common ones: `textBlock` (wraps text to the width via
[[widgets3d-layout]]'s real glyph measurer), `inlineIcon` (an `iconGlyph`), and
`blockItem` / `inlineItem` to drop in any SVG element at a known size.

## Demo — the same box in the DOM and on a 3D texture

`box.el` is an SVG `<g>`; wrap it in an `<svg>` to show it flat, or hand it to a
`b3dSvgPlane` to rasterize it onto a plane. Same object, both surfaces.

```js
import { b3d, b3dLight, b3dSvgPlane, box, textBlock, button } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 240
const H = 210

const makePanel = () => {
  const p = box(
    { width: W, height: H, padding: 14, gap: 10, background: '#161a22', border: '#2a3140', radius: 12 },
    textBlock('Flow box', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock(
      'Blocks stack, text wraps, buttons flow and focus — one surface, DOM and 3D.',
      { font: { size: 13 }, color: '#9fb0c3' }
    ),
    button('Talk', { onActivate: () => console.log('Talk') }),
    button('Trade', { onActivate: () => console.log('Trade') }),
    button('Leave', { onActivate: () => console.log('Leave') })
  )
  p.focusMove(1, 0) // focus the first button so the ring shows
  return p
}

const sheet = (b) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, b.el)

// DOM side — click, or arrow-key + Enter (the same focusMove/activate a D-pad drives)
const domPanel = makePanel()
const domSvg = sheet(domPanel)
domSvg.setAttribute('tabindex', '0')
const toBox = (e) => {
  const r = domSvg.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
}
domSvg.addEventListener('pointerdown', (e) => domPanel.handlePointer('down', ...toBox(e)))
domSvg.addEventListener('pointerup', (e) => domPanel.handlePointer('up', ...toBox(e)))
domSvg.addEventListener('keydown', (e) => {
  const m = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (m[e.key]) { domPanel.focusMove(...m[e.key]); e.preventDefault() }
  else if (e.key === 'Enter' || e.key === ' ') { domPanel.focusActivate(); e.preventDefault() }
})

// 3D side — the same panel on a plane texture (static; shows the focus ring)
const plane = b3dSvgPlane({
  width: 2.4,
  height: (2.4 * H) / W,
  resolution: 512,
  materialChannel: 'emissive',
  pointerEvents: false,
})
plane.svgElement = sheet(makePanel())

const scene = b3d(
  {
    style: 'width:300px;height:290px;display:block;border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 2.5, 3.2, el.BABYLON.Vector3.Zero(), el.scene
      )
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;gap:24px;align-items:flex-start;padding:16px;background:#0c0e14' },
    div({ style: 'color:#9ab;font:12px system-ui' }, 'DOM — click / arrow-key + Enter', domSvg),
    div({ style: 'color:#9ab;font:12px system-ui' }, '3D texture', scene)
  )
)
```
*/
/*{ "parent": "UI" }*/

import { svgElements } from 'tosijs'
import {
  flowLayout,
  nearestInDirection,
  type FlowItem,
  type FlowBox,
} from './flow-layout'
import {
  measureTextWrap,
  measureTextWidth,
  clampScroll,
  type FontSpec,
} from './widgets3d-layout'
import { iconGlyph } from './svg-icons'

/**
 * A child of a {@link box}. `el` is the SVG element to place (the box wraps it in
 * a positioning `<g>`, so the child's own transform is preserved). `measure` is
 * asked for the child's size at a given content width; `paint` (optional) is
 * called with the resolved width so width-dependent children (wrapped text)
 * re-render on resize.
 */
export interface BoxChild {
  el: SVGElement
  kind: 'block' | 'inline'
  measure: (availWidth: number) => { width?: number; height: number }
  paint?: (width: number) => void
  /** Reachable by pointer hit-test and focus-traversal (D-pad / Tab). */
  focusable?: boolean
  /** Called when the child is activated (pointer up-over, or focus + menu/Enter). */
  onActivate?: () => void
}

/** Pointer phase fed to {@link Box.handlePointer}. */
export type PointerKind = 'down' | 'move' | 'up' | 'leave'

export interface BoxOptions {
  /** Outer width in layout units. */
  width: number
  /** Fixed outer height → a scroll region if content overflows. Omit to hug content. */
  height?: number
  /** Uniform inner padding. Default 0. */
  padding?: number
  /** Gap between rows/inline items. Default 0. */
  gap?: number
  background?: string
  border?: string
  borderWidth?: number
  radius?: number
  align?: 'top' | 'middle' | 'bottom'
}

export interface Box {
  /** The painted `<g>` — append to the DOM, or serialize for an SvgTexture. */
  el: SVGGElement
  /** Re-flow at a new width (and optionally height); re-wraps text, re-positions. */
  resize: (width: number, height?: number) => void
  /** Scroll the content to an absolute offset (clamped to the overflow). */
  scrollTo: (offset: number) => void
  /** Scroll by a delta (clamped). */
  scrollBy: (delta: number) => void
  /** Laid-out content height (may exceed the viewport). */
  contentHeight: number
  /** Visible height (the scroll viewport). */
  viewportHeight: number

  /**
   * Feed a pointer event in box-local coords (mouse, touch, or a VR ray's
   * texture-UV → box coords). `down` presses the hit child; `up` over the same
   * child activates it; a pressed child captures until `up`.
   */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  /** Move focus to the nearest focusable child in a cardinal direction (D-pad). */
  focusMove: (dx: number, dy: number) => void
  /** Activate the focused child (menu button / Enter). */
  focusActivate: () => void
  /** Clear focus (B / back — a hook the popup layer will use). */
  focusBack: () => void
  /** The focused child's index, or -1. */
  focusIndex: () => number
}

let boxSeq = 0

export function box(opts: BoxOptions, ...children: BoxChild[]): Box {
  const {
    padding = 0,
    gap = 0,
    background,
    border,
    borderWidth = 1,
    radius = 0,
    align = 'top',
  } = opts

  const clipId = `box_clip_${++boxSeq}`
  const el = svgElements.g({ 'data-box': '' }) as unknown as SVGGElement
  const bgRect = svgElements.rect({ 'data-box-bg': '', rx: radius, ry: radius })
  const clip = svgElements.clipPath({ id: clipId })
  const clipRect = svgElements.rect({ x: 0, y: 0 })
  clip.append(clipRect)
  const clipped = svgElements.g({ 'clip-path': `url(#${clipId})` })
  const content = svgElements.g({ 'data-box-content': '' })
  clipped.append(content)
  el.append(svgElements.defs({}, clip), bgRect, clipped)

  // Focus ring — lives INSIDE content so it scrolls with the focused child.
  const focusRing = svgElements.rect({
    'data-box-focus': '',
    fill: 'none',
    stroke: '#5fb0ff',
    'stroke-width': '2',
    rx: '4',
    ry: '4',
    visibility: 'hidden',
  })

  let laidBoxes: FlowBox[] = []
  let focused = -1
  let downTarget = -1
  const isFocusable = (i: number): boolean =>
    i >= 0 &&
    i < children.length &&
    !!(children[i].focusable || children[i].onActivate)
  const firstFocusable = (): number => {
    for (let i = 0; i < children.length; i++) if (isFocusable(i)) return i
    return -1
  }

  let width = opts.width
  let fixedHeight = opts.height
  let contentHeight = 0
  let viewportHeight = 0
  let scroll = 0

  const state = {
    contentHeight: 0,
    viewportHeight: 0,
  }

  const relayout = (): void => {
    const contentW = Math.max(0, width - 2 * padding)

    // measure → flow items
    const items: FlowItem[] = children.map((c) => {
      const m = c.measure(contentW)
      return c.kind === 'block'
        ? { kind: 'block', height: m.height }
        : { kind: 'inline', width: m.width ?? 0, height: m.height }
    })
    const laid = flowLayout(items, { width: contentW, gap, align })
    laidBoxes = laid.boxes
    contentHeight = laid.height + 2 * padding
    viewportHeight = fixedHeight ?? contentHeight

    // (re)build the positioned children
    content.textContent = ''
    children.forEach((c, i) => {
      const b = laid.boxes[i]
      c.paint?.(c.kind === 'block' ? contentW : b.width)
      const wrap = svgElements.g({
        transform: `translate(${padding + b.x} ${padding + b.y})`,
      })
      wrap.append(c.el)
      content.append(wrap)
    })
    content.append(focusRing) // last → on top of the children
    positionRing()

    // frame + clip
    const inset = background || border ? borderWidth / 2 : 0
    bgRect.setAttribute('x', String(inset))
    bgRect.setAttribute('y', String(inset))
    bgRect.setAttribute('width', String(Math.max(0, width - 2 * inset)))
    bgRect.setAttribute(
      'height',
      String(Math.max(0, viewportHeight - 2 * inset))
    )
    bgRect.setAttribute('fill', background ?? 'none')
    if (border) {
      bgRect.setAttribute('stroke', border)
      bgRect.setAttribute('stroke-width', String(borderWidth))
    } else {
      bgRect.removeAttribute('stroke')
    }
    clipRect.setAttribute('width', String(width))
    clipRect.setAttribute('height', String(viewportHeight))

    state.contentHeight = contentHeight
    state.viewportHeight = viewportHeight
    applyScroll()
  }

  const applyScroll = (): void => {
    scroll = clampScroll(scroll, contentHeight, viewportHeight)
    content.setAttribute('transform', `translate(0 ${-scroll})`)
  }

  // The ring lives in `content` (already -scroll-translated), so position it in
  // CONTENT space and it tracks the child through scrolling for free.
  const positionRing = (): void => {
    const b = laidBoxes[focused]
    if (focused < 0 || !b) {
      focusRing.setAttribute('visibility', 'hidden')
      return
    }
    focusRing.setAttribute('x', String(padding + b.x - 2))
    focusRing.setAttribute('y', String(padding + b.y - 2))
    focusRing.setAttribute('width', String(b.width + 4))
    focusRing.setAttribute('height', String(b.height + 4))
    focusRing.setAttribute('visibility', 'visible')
  }

  // Scroll just enough to bring child `i` fully into the viewport.
  const ensureVisible = (i: number): void => {
    const b = laidBoxes[i]
    if (!b) return
    const top = padding + b.y
    const bot = top + b.height
    if (top < scroll) {
      scroll = top
      applyScroll()
    } else if (bot > scroll + viewportHeight) {
      scroll = bot - viewportHeight
      applyScroll()
    }
  }

  // (x,y) in box-local screen coords → the focusable child under it, or -1.
  const hitTest = (x: number, y: number): number => {
    if (x < 0 || x > width || y < 0 || y > viewportHeight) return -1
    const cy = y + scroll // screen → content space
    for (let i = 0; i < laidBoxes.length; i++) {
      if (!isFocusable(i)) continue
      const b = laidBoxes[i]
      const bx = padding + b.x
      const by = padding + b.y
      if (x >= bx && x <= bx + b.width && cy >= by && cy <= by + b.height)
        return i
    }
    return -1
  }

  relayout()

  return {
    el,
    get contentHeight() {
      return state.contentHeight
    },
    get viewportHeight() {
      return state.viewportHeight
    },
    resize(w: number, h?: number) {
      width = w
      if (h !== undefined) fixedHeight = h
      relayout()
    },
    scrollTo(offset: number) {
      scroll = offset
      applyScroll()
    },
    scrollBy(delta: number) {
      scroll += delta
      applyScroll()
    },
    handlePointer(kind: PointerKind, x: number, y: number) {
      if (kind === 'leave') {
        downTarget = -1
        return
      }
      const hit = hitTest(x, y)
      if (kind === 'down') {
        downTarget = hit
      } else if (kind === 'up') {
        // Activate only if up lands on the same child the press started on.
        if (hit >= 0 && hit === downTarget) {
          focused = hit
          positionRing()
          children[hit].onActivate?.()
        }
        downTarget = -1
      }
      // 'move' — reserved for hover/drag; no-op in this slice.
    },
    focusMove(dx: number, dy: number) {
      if (focused < 0) {
        focused = firstFocusable()
      } else {
        const next = nearestInDirection(
          laidBoxes,
          focused,
          { dx, dy },
          isFocusable
        )
        if (next != null) focused = next
      }
      if (focused >= 0) ensureVisible(focused)
      positionRing()
    },
    focusActivate() {
      if (focused >= 0) children[focused].onActivate?.()
    },
    focusBack() {
      focused = -1
      positionRing()
    },
    focusIndex() {
      return focused
    },
  }
}

// --- child helpers ---------------------------------------------------------

/**
 * A **text block**: wraps `text` to the box width with the real glyph measurer,
 * painting one `<tspan>` per line. Height tracks the wrapped line count, so it
 * re-flows taller when the box narrows.
 */
export function textBlock(
  text: string,
  opts: {
    font?: FontSpec
    color?: string
    lineHeight?: number
  } = {}
): BoxChild {
  const font: FontSpec = opts.font ?? { size: 14 }
  const color = opts.color ?? '#000'
  const lineHeight = opts.lineHeight ?? Math.round(font.size * 1.35)
  const el = svgElements.text({
    fill: color,
    'font-family': font.family ?? 'system-ui, sans-serif',
    'font-size': String(font.size),
    'font-weight': font.weight != null ? String(font.weight) : undefined,
    'font-style': font.style,
  }) as unknown as SVGTextElement

  const render = (width: number): number => {
    const lines = measureTextWrap(text, width, font)
    el.textContent = ''
    lines.forEach((line, i) => {
      el.append(
        svgElements.tspan(
          { x: 0, y: i * lineHeight + Math.round(font.size * 0.82) },
          line
        )
      )
    })
    return lines.length * lineHeight
  }

  return {
    el,
    kind: 'block',
    measure: (w) => ({
      height: measureTextWrap(text, w, font).length * lineHeight,
    }),
    paint: render,
  }
}

/** An **inline icon** — an `iconGlyph` sized `size×size`, tinted `color`. */
export function inlineIcon(
  name: string,
  opts: { size?: number; color?: string } = {}
): BoxChild {
  const size = opts.size ?? 24
  const el = iconGlyph(name, {
    size,
    color: opts.color ?? '#000',
  }) as SVGElement
  return { el, kind: 'inline', measure: () => ({ width: size, height: size }) }
}

/** Drop any SVG element in as a full-width **block** of known height. */
export function blockItem(el: SVGElement, height: number): BoxChild {
  return { el, kind: 'block', measure: () => ({ height }) }
}

/** Drop any SVG element in as an **inline** item of known size. */
export function inlineItem(
  el: SVGElement,
  width: number,
  height: number
): BoxChild {
  return { el, kind: 'inline', measure: () => ({ width, height }) }
}

/**
 * A **button** — a focusable, inline pill (rounded rect + centred label) that
 * fires `onActivate` on pointer up-over or focus + activate. Width hugs the label;
 * it flows and wraps like any inline item.
 */
export function button(
  label: string,
  opts: {
    onActivate?: () => void
    font?: FontSpec
    color?: string
    background?: string
    paddingX?: number
    height?: number
  } = {}
): BoxChild {
  const font: FontSpec = opts.font ?? { size: 14, weight: 600 }
  const color = opts.color ?? '#e6e6e6'
  const background = opts.background ?? '#2a3140'
  const paddingX = opts.paddingX ?? 14
  const height = opts.height ?? Math.round(font.size * 2.2)
  const width = Math.ceil(measureTextWidth(label, font) + 2 * paddingX)

  const el = svgElements.g({ 'data-box-button': '' }) as unknown as SVGGElement
  el.append(
    svgElements.rect({
      x: 0,
      y: 0,
      width,
      height,
      rx: 6,
      ry: 6,
      fill: background,
    }),
    svgElements.text(
      {
        x: width / 2,
        y: Math.round(height / 2 + font.size * 0.34),
        'text-anchor': 'middle',
        fill: color,
        'font-family': font.family ?? 'system-ui, sans-serif',
        'font-size': String(font.size),
        'font-weight': font.weight != null ? String(font.weight) : undefined,
      },
      label
    )
  )
  return {
    el,
    kind: 'inline',
    measure: () => ({ width, height }),
    focusable: true,
    onActivate: opts.onActivate,
  }
}
