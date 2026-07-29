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
import { b3d, b3dLight, b3dSvgPlane, box, textBlock, inlineIcon } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 240
const H = 200

const makePanel = () =>
  box(
    { width: W, height: H, padding: 14, gap: 10, background: '#161a22', border: '#2a3140', radius: 12 },
    textBlock('Flow box', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock(
      'Blocks stack, text re-wraps to the width, and overflow scrolls — one surface, DOM and 3D.',
      { font: { size: 13 }, color: '#9fb0c3' }
    ),
    inlineIcon('check', { size: 22, color: '#5fd08a' }),
    inlineIcon('star', { size: 22, color: '#e8c34a' }),
    inlineIcon('heart', { size: 22, color: '#e86a7a' }),
    inlineIcon('bug', { size: 22, color: '#7aa2e8' })
  )

const sheet = (b) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, b.el)

// 3D side: the box's <g> in an <svg> sheet → plane texture
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
    style: 'width:300px;height:280px;display:block;border-radius:8px;overflow:hidden',
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
    div({ style: 'color:#9ab;font:12px system-ui' }, 'DOM', sheet(makePanel())),
    div({ style: 'color:#9ab;font:12px system-ui' }, '3D texture', scene)
  )
)
```
*/
/*{ "parent": "UI" }*/

import { svgElements } from 'tosijs'
import { flowLayout, type FlowItem } from './flow-layout'
import {
  measureTextWrap,
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
}

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

    // frame + clip
    const inset = background || border ? borderWidth / 2 : 0
    bgRect.setAttribute('x', String(inset))
    bgRect.setAttribute('y', String(inset))
    bgRect.setAttribute('width', String(Math.max(0, width - 2 * inset)))
    bgRect.setAttribute('height', String(Math.max(0, viewportHeight - 2 * inset)))
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
    measure: (w) => ({ height: measureTextWrap(text, w, font).length * lineHeight }),
    paint: render,
  }
}

/** An **inline icon** — an `iconGlyph` sized `size×size`, tinted `color`. */
export function inlineIcon(
  name: string,
  opts: { size?: number; color?: string } = {}
): BoxChild {
  const size = opts.size ?? 24
  const el = iconGlyph(name, { size, color: opts.color ?? '#000' }) as SVGElement
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
