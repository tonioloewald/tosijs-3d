/*#
# Footprint editor

**`footprint3d` — edit a province's footprint as the shape it is.** A polygon
drawn inside a square, vertices you drag where they actually are. The rules live
in [[curve|curve.ts]]; this is the view.

## Why not the curve view

A footprint *can* be edited as extent-against-angle on a graph, and it is
miserable: a hexagon looks like a wave, and moving a corner means finding which
bump is that corner. Tonio: _"the footprint would work MUCH better as a radial
editor. A hexagon would just be a hexagon."_

The square is the province's bounds, so the picture answers "how much of my
extent am I using, and in which directions" without being read.

## Six numbers for a hexagon

The polygon **is** its vertices — no sampling. That works because
[[curve|polygonExtent]] casts a ray at the real straight edge instead of
interpolating radius against angle, which bows every edge inward. A circle is
therefore the expensive shape: there is no finite polygon that is one, so it is a
16-gon, indistinguishable at province scale for sixteen numbers.

## Two rules, both clamps

A vertex cannot pass its neighbours (angles stay monotonic) and cannot reach the
centre. Together those keep the polygon **star-shaped about its centre**, which
is what makes "extent in this direction" have an answer at all. Both are clamps
rather than refusals — a drag that stops at the limit shows you the limit; one
that refuses to move looks broken.
*/
/*{ "parent": "UI", "order": 261 }*/

import { svgElements } from 'tosijs'
import {
  MIN_EXTENT,
  moveVertex,
  ngon,
  polygonExtent,
  presetsFor,
  polygonVertices,
  type ControlPoint,
} from './curve'
import { w3dTheme } from './w3d-theme'
import { handlerOf } from './widgets3d'
import type { PointerKind, Widget3d } from './widgets3d'

const { g, rect, path, circle: svgCircle, text } = svgElements

export interface Footprint3dOptions {
  /** Starting vertices, a preset name (`'hexagon'`), or a side count. */
  value?: ControlPoint[] | string | number
  label?: string
  /** Fired after any edit. */
  handleChange?: (vertices: ControlPoint[]) => void
  /** @deprecated use `handleChange` — removed in 0.9. */
  onChange?: (vertices: ControlPoint[]) => void
}

export interface FootprintField extends Widget3d {
  readonly vertices: ControlPoint[]
  setVertices: (v: ControlPoint[]) => void
  /** Extent at a direction, `theta` in turns. This is what terrain samples. */
  evaluate: (theta: number) => number
  readonly selected: number
  deleteSelected: () => void
  applyPreset: (name: string) => void
  /** Fired after any edit. */
  handleChange?: (vertices: ControlPoint[]) => void
  /** @deprecated use `handleChange` — removed in 0.9. */
  onChange?: (vertices: ControlPoint[]) => void
}

function initialVertices(value: Footprint3dOptions['value']): ControlPoint[] {
  if (Array.isArray(value)) return polygonVertices(value)
  if (typeof value === 'number') return ngon(value)
  if (typeof value === 'string') {
    const preset = presetsFor('radial').find((p) => p.name === value)
    if (preset != null) return polygonVertices(preset.build())
  }
  return ngon(6)
}

/**
 * A footprint editor.
 *
 * ```js
 * const fp = footprint3d({ value: 'hexagon', label: 'footprint' })
 * fp.onChange = () => rebuildTerrain()
 * fp.evaluate(0.25)   // extent a quarter-turn round
 * ```
 */
export function footprint3d(config: Footprint3dOptions = {}): FootprintField {
  let verts = initialVertices(config.value)
  let selected = -1
  let dragging = -1

  const el = g()
  const bounds = rect({ 'data-footprint-bounds': '', rx: 4, ry: 4 })
  const axes = path({ 'data-footprint-axes': '', fill: 'none' })
  const poly = path({ 'data-footprint-poly': '' })
  const caption = text(
    {
      'font-family': w3dTheme.fontFamily,
      'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
      fill: w3dTheme.muted,
    },
    config.label ?? ''
  )
  el.appendChild(bounds)
  el.appendChild(axes)
  el.appendChild(poly)
  el.appendChild(caption)
  const handles = g({ 'data-footprint-points': '' })
  el.appendChild(handles)

  // Square geometry from the last layout — pointer maps through what was drawn.
  let box = { x: 0, y: 0, size: 1 }
  let cx = 0
  let cy = 0
  let unit = 1
  let rowHeight = 0

  const HANDLE = 5
  const GRAB = 16

  /** Polar (turns, 0..1 radius) → widget pixels. y is negated: SVG y grows down. */
  const toPx = (v: ControlPoint) => {
    const a = v.x * Math.PI * 2
    return {
      x: cx + Math.cos(a) * v.y * unit,
      y: cy - Math.sin(a) * v.y * unit,
    }
  }
  const toPolar = (px: number, py: number) => {
    const dx = px - cx
    const dy = cy - py
    return {
      x: (((Math.atan2(dy, dx) / (Math.PI * 2)) % 1) + 1) % 1,
      y: Math.min(1, Math.hypot(dx, dy) / unit),
    }
  }

  const emit = (): void => {
    const cb =
      api.handleChange ??
      handlerOf<(v: ControlPoint[]) => void>(
        api as unknown as Record<string, unknown>,
        'handleChange',
        'onChange'
      )
    cb?.(verts.map((v) => ({ ...v })))
  }

  const nearestPx = (px: number, py: number): number => {
    let best = -1
    let bestD = GRAB * GRAB
    verts.forEach((v, i) => {
      const c = toPx(v)
      const d = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py)
      if (d <= bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const draw = (): void => {
    bounds.setAttribute('x', String(box.x))
    bounds.setAttribute('y', String(box.y))
    bounds.setAttribute('width', String(box.size))
    bounds.setAttribute('height', String(box.size))
    bounds.setAttribute('fill', w3dTheme.rowBg)
    bounds.setAttribute('stroke', w3dTheme.divider)
    bounds.setAttribute('stroke-width', String(w3dTheme.strokeWidth))

    // Cross-hairs through the centre: without them a lopsided footprint reads as
    // a badly drawn shape rather than as off-centre weight.
    axes.setAttribute(
      'd',
      `M${box.x} ${cy}H${box.x + box.size}M${cx} ${box.y}V${box.y + box.size}`
    )
    axes.setAttribute('stroke', w3dTheme.divider)
    axes.setAttribute('stroke-width', '1')

    poly.setAttribute(
      'd',
      verts
        .map((v, i) => {
          const c = toPx(v)
          return `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`
        })
        .join('') + 'Z'
    )
    poly.setAttribute('fill', w3dTheme.selectedBg ?? 'rgba(80,180,255,0.15)')
    poly.setAttribute('stroke', w3dTheme.accent)
    poly.setAttribute(
      'stroke-width',
      String(Math.max(1.5, w3dTheme.strokeWidth))
    )

    while (handles.firstChild) handles.removeChild(handles.firstChild)
    verts.forEach((v, i) => {
      const c = toPx(v)
      handles.appendChild(
        svgCircle({
          cx: c.x,
          cy: c.y,
          r: i === selected ? HANDLE : HANDLE - 1.5,
          fill: i === selected ? w3dTheme.accent : w3dTheme.panelBg,
          stroke: w3dTheme.accent,
          'stroke-width': String(w3dTheme.strokeWidth),
        })
      )
    })
  }

  const api: FootprintField = {
    el,
    handleChange: config.handleChange,
    onChange: config.onChange,

    layout(width: number) {
      const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5))
      const capH = config.label ? Math.round(w3dTheme.fontSize * 1.2) : 0
      // SQUARE, because the province's bounds are square and a stretched box
      // would make a circle look like an ellipse — a shape error the editor
      // itself introduced.
      const size = Math.max(24, Math.min(width - pad * 2, 220))
      box = { x: pad + (width - pad * 2 - size) / 2, y: capH, size }
      cx = box.x + size / 2
      cy = box.y + size / 2
      // Leave a handle's width inside the bounds, so a vertex at full extent is
      // still wholly on the plot and grabbable.
      unit = size / 2 - HANDLE - 2
      if (config.label) {
        caption.setAttribute('x', String(pad))
        caption.setAttribute('y', String(Math.round(w3dTheme.fontSize * 0.9)))
      }
      rowHeight = capH + size + pad
      draw()
      return rowHeight
    },

    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'down') {
        const hit = nearestPx(x, y)
        if (hit >= 0) {
          selected = hit
          dragging = hit
        } else {
          // Add a vertex in the direction pressed. It lands between whichever
          // two it belongs between, because the list is kept sorted.
          const p = toPolar(x, y)
          const next = [...verts, { x: p.x, y: Math.max(MIN_EXTENT, p.y) }]
          next.sort((a, b) => a.x - b.x)
          const target = next.findIndex((v) => v.x === p.x)
          verts = next
          selected = target
          dragging = target
          emit()
        }
        draw()
        return
      }
      if (kind === 'move' && dragging >= 0) {
        const p = toPolar(x, y)
        const moved = moveVertex(verts, dragging, p.x, p.y)
        verts = moved.vertices
        // The index changes when a drag wraps past x = 0 — the list is a cyclic
        // sequence in a linear array, so holding the old one would swap which
        // vertex you are dragging mid-gesture.
        dragging = moved.index
        selected = moved.index
        draw()
        emit()
        return
      }
      if (kind === 'up' || kind === 'leave') dragging = -1
    },

    hitTest(x: number, y: number) {
      return (
        x >= box.x &&
        x <= box.x + box.size &&
        y >= box.y &&
        y <= box.y + box.size
      )
    },

    get vertices() {
      return verts.map((v) => ({ ...v }))
    },
    setVertices(v: ControlPoint[]) {
      verts = polygonVertices(v)
      selected = -1
      draw()
    },
    evaluate(theta: number) {
      return polygonExtent(verts, theta)
    },
    get selected() {
      return selected
    },
    deleteSelected() {
      // Three is the floor: two vertices enclose no area, so "extent in this
      // direction" stops having an answer for most directions.
      if (selected < 0 || verts.length <= 3) return
      verts = verts.filter((_, i) => i !== selected)
      selected = -1
      draw()
      emit()
    },
    applyPreset(name: string) {
      const preset = presetsFor('radial').find((p) => p.name === name)
      if (preset == null) return
      verts = polygonVertices(preset.build())
      selected = -1
      draw()
      emit()
    },
  }

  return api
}
