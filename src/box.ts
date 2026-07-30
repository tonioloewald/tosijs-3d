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

const readout = div(
  { style: 'margin:6px 16px 16px;color:#8ea;font:13px system-ui' },
  'Activate a button: click it, arrow-key + Enter, or click the 3D panel.'
)
const act = (label) => () => {
  readout.textContent = 'Activated: ' + label
}

const makePanel = () => {
  const p = box(
    { width: W, height: H, padding: 14, gap: 10, background: '#161a22', border: '#2a3140', radius: 12 },
    textBlock('Flow box', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock(
      'Blocks stack, text wraps, buttons flow and focus — one surface, DOM and 3D.',
      { font: { size: 13 }, color: '#9fb0c3' }
    ),
    button('Talk', { onActivate: act('Talk') }),
    button('Trade', { onActivate: act('Trade') }),
    button('Leave', { onActivate: act('Leave') })
  )
  p.focusMove(1, 0) // focus the first button so the ring shows
  return p
}

const sheet = (b) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, b.el)

// ONE panel, shown in the DOM AND textured on the plane (SvgTexture clones the
// live element each frame), so DOM and 3D stay in sync — a click or arrow-key in
// either view drives the same box.
const panel = makePanel()
const svgEl = sheet(panel)
svgEl.setAttribute('tabindex', '0')
const toBox = (e) => {
  const r = svgEl.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
}
svgEl.addEventListener('pointerdown', (e) => panel.handlePointer('down', ...toBox(e)))
svgEl.addEventListener('pointerup', (e) => panel.handlePointer('up', ...toBox(e)))
svgEl.addEventListener('keydown', (e) => {
  const m = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (m[e.key]) { panel.focusMove(...m[e.key]); e.preventDefault() }
  else if (e.key === 'Enter' || e.key === ' ') { panel.focusActivate(); e.preventDefault() }
})

// 3D side — route each pick's texture-UV → box coords → the SAME panel's
// handlePointer (the path a VR ray takes), so the 3D view is clickable and synced.
const plane = b3dSvgPlane({
  width: 2.4,
  height: (2.4 * H) / W,
  resolution: 512,
  materialChannel: 'emissive',
  pointerEvents: false,
})
plane.svgElement = svgEl

const scene = b3d(
  {
    style: 'width:300px;height:290px;display:block;border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 2.5, 3.2, el.BABYLON.Vector3.Zero(), el.scene
      )
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      el.scene.constantlyUpdateMeshUnderPointer = true
      const T = el.BABYLON.PointerEventTypes
      el.scene.onPointerObservable.add((pi) => {
        const kind =
          pi.type === T.POINTERDOWN ? 'down' : pi.type === T.POINTERUP ? 'up' : ''
        if (!kind) return
        const pk = pi.pickInfo
        if (pk && pk.hit && pk.pickedMesh === plane.mesh) {
          const uv = pk.getTextureCoordinates()
          if (uv) panel.handlePointer(kind, uv.x * W, (1 - uv.y) * H)
        }
      })
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;gap:24px;align-items:flex-start;padding:16px 16px 4px;background:#0c0e14' },
    div({ style: 'color:#9ab;font:12px system-ui' }, 'DOM — click / arrow-key; 3D mirrors it', svgEl),
    div({ style: 'color:#9ab;font:12px system-ui' }, '3D texture — click the buttons', scene)
  ),
  readout
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
/** Interaction flags a child can reflect visually (hover/press/focus). */
export interface BoxChildState {
  hovered: boolean
  pressed: boolean
  focused: boolean
}

export interface BoxChild {
  el: SVGElement
  kind: 'block' | 'inline'
  measure: (availWidth: number) => { width?: number; height: number }
  paint?: (width: number) => void
  /** Reachable by pointer hit-test and focus-traversal (D-pad / Tab). */
  focusable?: boolean
  /** Called when the child is activated (pointer up-over, or focus + menu/Enter). */
  onActivate?: () => void
  /** The box calls this when the child's hover/press/focus state changes. */
  setState?: (state: BoxChildState) => void
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
  /** Current outer width. */
  readonly width: number
  /** Laid-out content height (may exceed the viewport). */
  contentHeight: number
  /** Visible height (the scroll viewport). */
  viewportHeight: number
  /**
   * A child's rect in the box's OWN local coords (padding-offset, pre-scroll), or
   * `null`. Used to anchor a cascade submenu to a menu item.
   */
  childRect: (i: number) => FlowBox | null

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
  let hoverIdx = -1
  let pressedIdx = -1
  const isFocusable = (i: number): boolean =>
    i >= 0 &&
    i < children.length &&
    !!(children[i].focusable || children[i].onActivate)
  const firstFocusable = (): number => {
    for (let i = 0; i < children.length; i++) if (isFocusable(i)) return i
    return -1
  }
  // Tell a child its current hover/press/focus so it can restyle (button, etc.).
  const applyState = (i: number): void => {
    if (i < 0) return
    children[i].setState?.({
      hovered: i === hoverIdx,
      pressed: i === pressedIdx,
      focused: i === focused,
    })
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
    get width() {
      return width
    },
    get contentHeight() {
      return state.contentHeight
    },
    get viewportHeight() {
      return state.viewportHeight
    },
    childRect(i: number) {
      const b = laidBoxes[i]
      if (!b) return null
      return {
        x: padding + b.x,
        y: padding + b.y,
        width: b.width,
        height: b.height,
      }
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
        const p = pressedIdx
        const h = hoverIdx
        pressedIdx = -1
        hoverIdx = -1
        downTarget = -1
        if (p >= 0) applyState(p)
        if (h >= 0) applyState(h)
        return
      }
      const hit = hitTest(x, y)
      if (kind === 'down') {
        downTarget = hit
        if (hit >= 0) {
          pressedIdx = hit
          applyState(hit)
        }
      } else if (kind === 'move') {
        if (hit !== hoverIdx) {
          const old = hoverIdx
          hoverIdx = hit
          if (old >= 0) applyState(old)
          if (hit >= 0) applyState(hit)
        }
      } else if (kind === 'up') {
        const p = pressedIdx
        pressedIdx = -1
        if (p >= 0) applyState(p)
        // Activate only if up lands on the same child the press started on.
        if (hit >= 0 && hit === downTarget) {
          const old = focused
          focused = hit
          positionRing()
          if (old >= 0 && old !== hit) applyState(old)
          applyState(hit)
          children[hit].onActivate?.()
        }
        downTarget = -1
      }
    },
    focusMove(dx: number, dy: number) {
      const old = focused
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
      if (old !== focused) {
        if (old >= 0) applyState(old)
        if (focused >= 0) applyState(focused)
      }
    },
    focusActivate() {
      if (focused >= 0) children[focused].onActivate?.()
    },
    focusBack() {
      const old = focused
      focused = -1
      positionRing()
      if (old >= 0) applyState(old)
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
    hoverBackground?: string
    pressBackground?: string
    paddingX?: number
    height?: number
    /** Full-width stacked row (menu item) instead of a hugging inline pill. */
    block?: boolean
    align?: 'left' | 'center'
  } = {}
): BoxChild {
  const font: FontSpec = opts.font ?? { size: 14, weight: 600 }
  const color = opts.color ?? '#e6e6e6'
  const background = opts.background ?? '#2a3140'
  const paddingX = opts.paddingX ?? 14
  const height = opts.height ?? Math.round(font.size * 2.2)
  const block = !!opts.block
  const align = opts.align ?? (block ? 'left' : 'center')
  const hugWidth = Math.ceil(measureTextWidth(label, font) + 2 * paddingX)

  const hoverBg = opts.hoverBackground ?? '#38414f'
  const pressBg = opts.pressBackground ?? '#52627d'
  const bg = svgElements.rect({
    x: 0,
    y: 0,
    width: hugWidth,
    height,
    rx: 6,
    ry: 6,
    fill: background,
  })
  const txt = svgElements.text(
    {
      y: Math.round(height / 2 + font.size * 0.34),
      fill: color,
      'font-family': font.family ?? 'system-ui, sans-serif',
      'font-size': String(font.size),
      'font-weight': font.weight != null ? String(font.weight) : undefined,
    },
    label
  ) as unknown as SVGTextElement
  const el = svgElements.g(
    { 'data-box-button': '' },
    bg,
    txt
  ) as unknown as SVGGElement

  // Size the rect + place the label for a given width.
  const lay = (w: number): void => {
    bg.setAttribute('width', String(w))
    if (align === 'left') {
      txt.setAttribute('x', String(paddingX))
      txt.setAttribute('text-anchor', 'start')
    } else {
      txt.setAttribute('x', String(w / 2))
      txt.setAttribute('text-anchor', 'middle')
    }
  }
  lay(hugWidth)

  return {
    el,
    kind: block ? 'block' : 'inline',
    measure: () => (block ? { height } : { width: hugWidth, height }),
    paint: block ? (w) => lay(w) : undefined,
    focusable: true,
    onActivate: opts.onActivate,
    setState: (st) => {
      bg.setAttribute(
        'fill',
        st.pressed ? pressBg : st.hovered || st.focused ? hoverBg : background
      )
    },
  }
}
