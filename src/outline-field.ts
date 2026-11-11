/*#
# outline field

**Polygons drawn over a body's front view.** The drawing half of
[garment-cut](/garment-cut/): the body's silhouette, and the outlines a
garment is cut along, clicked out point by point.

- **Click** to place points; click the first one again to close the shape.
- **Drag** a point to move it; press on an edge to add a point there.
- `undoPoint()` takes back the last point of the shape being clicked out
  (`redoPoint()` puts it back); a host's undo calls it before its own.
- `removeSelected()` deletes the last point touched (a button, since a
  controller has no reliable third gesture); a shape left with fewer than
  three points goes too. `clear()` removes everything.

Symmetry is on by default: you draw the character's left (on your right),
and the other side is drawn faint. A point dropped near the centre line snaps
onto it, and a shape with an edge on the centre line is one garment across
the body (trousers); any other is mirrored as a pair (gloves).
`mirrorOutline(field.value)` makes the polygons `cutGarment` takes.

It is an ordinary scene-panel control, so it works on a page, in the scene
and in a headset alike.

## Usage

```javascript
import { outlineField3d, mirrorOutline, cutGarment } from 'tosijs-3d'

const field = outlineField3d({
  positions, indices,   // the body, as triangles (left on +X, facing +Z)
  value: halves,        // half outlines, [x, y] on the +X side
  handleCommit: (halves) => recut(mirrorOutline(halves)),
})
```
*/
/*{ "parent": "garment-cut", "order": 10 }*/

import { svgElements } from 'tosijs'
import { rigSilhouette, type Silhouette } from './rig-fit.js'
import type { ViewPoint } from './garment-cut.js'
import { mirrorOutline } from './garment-cut.js'
import { insidePolygon, rimSeam } from './cloth-drape.js'
import { w3dTheme } from './w3d-theme.js'
import type { PointerKind, Widget3d } from './widgets3d.js'

const { g, rect, path, circle, text, clipPath } = svgElements

let clipSeq = 0

export interface OutlineField3dOptions {
  /** The body, as triangles in its own frame (facing +Z, left on +X). */
  positions: ArrayLike<number>
  indices: ArrayLike<number>
  /** The outlines: halves on the +X side with symmetry on, whole without. */
  value?: ViewPoint[][]
  /** Draw one side and mirror it (default true). */
  symmetry?: boolean
  /** Tallest the view may be, in px (default 260). */
  maxHeight?: number
  /**
   * Show where the outline is over the body (a drape pins the cloth to the
   * skin there): those points and stretches of edge are drawn yellow.
   */
  anchors?: boolean
  /** As a point moves. */
  handleChange?: (value: ViewPoint[][]) => void
  /** When a point is placed, let go or deleted: recut here. */
  handleCommit?: (value: ViewPoint[][]) => void
  /** When the shape being clicked out gains or loses a point (undo's buttons). */
  handleOpen?: () => void
  /**
   * Carry on from another field's `editing` (a panel rebuilt mid-edit): its
   * outlines, the one being clicked out and the selected point. Wins over `value`.
   */
  editing?: OutlineEditing
}

/** Where an edit stands: what a rebuilt field needs to carry on. */
export interface OutlineEditing {
  shapes: ViewPoint[][]
  open: number | null
  selected: { s: number; p: number } | null
  /** Points taken back from the open shape, the last taken last. */
  redo?: ViewPoint[]
}

export interface OutlineField extends Widget3d {
  /** The outlines as drawn (halves with symmetry on). */
  readonly value: ViewPoint[][]
  /** The polygons to cut along: mirrored with symmetry on. */
  readonly polygons: ViewPoint[][]
  readonly symmetry: boolean
  setValue: (value: ViewPoint[][]) => void
  /** Delete the last point touched. */
  removeSelected: () => void
  /** Remove every outline. */
  clear: () => void
  /** Where the edit stands, for a field built in its place. */
  readonly editing: OutlineEditing
  /** A shape is being clicked out: `undoPoint` takes its last point back. */
  readonly canUndoPoint: boolean
  readonly canRedoPoint: boolean
  undoPoint: () => void
  redoPoint: () => void
  handleChange?: (value: ViewPoint[][]) => void
  handleCommit?: (value: ViewPoint[][]) => void
}

const copy = (v: ViewPoint[][]): ViewPoint[][] =>
  v.map((s) => s.map((p) => [p[0], p[1]] as ViewPoint))

/** The body's front view with garment outlines drawn over it. */
export function outlineField3d(config: OutlineField3dOptions): OutlineField {
  const front: Silhouette = rigSilhouette(
    config.positions,
    config.indices,
    'front'
  )
  // Room around the body, so an outline can reach past it: one drawn to the
  // edge of the soles, the hands or the crown would leave them uncovered.
  const MARGIN = 0.04
  const view = {
    min: { u: front.min.u - MARGIN, v: front.min.v - MARGIN },
    max: { u: front.max.u + MARGIN, v: front.max.v + MARGIN },
  }
  const symmetry = config.symmetry ?? true
  /*
  OVER THE BODY, in the front view: where a drape pins its cloth (a ray from
  the front hits the skin). Read off the silhouette's rows.
  */
  const rows = new Map<number, Array<[number, number]>>()
  const v0 = Math.min(...front.runs.map((r) => r.v))
  for (const r of front.runs) {
    const k = Math.round((r.v - v0) / front.cell)
    let row = rows.get(k)
    if (!row) rows.set(k, (row = []))
    row.push([r.u0, r.u1])
  }
  const overBody = (x: number, y: number): boolean =>
    (rows.get(Math.floor((y - v0) / front.cell)) ?? []).some(
      ([a, b]) => x >= a && x <= b
    )
  // Anchored: over the body, or on its rim within reach (a seam the drape
  // sews over a limb), decided as the drape decides it, on the whole outline.
  const anchoredAt = (shape: ViewPoint[], x: number, y: number): boolean => {
    if (overBody(x, y)) return true
    const whole = symmetry ? mirrorOutline([shape]) : [shape]
    return (
      rimSeam(
        overBody,
        (px, py) => whole.some((p) => insidePolygon(p, px, py)),
        x,
        y,
        front.cell
      ) != null
    )
  }
  let shapes = copy(config.editing?.shapes ?? config.value ?? [])
  // The shape being clicked out, not yet closed (index into shapes), if any.
  let open: number | null = config.editing?.open ?? null
  let dragging: { s: number; p: number } | null = null
  let selected: { s: number; p: number } | null =
    config.editing?.selected ?? null
  let hovered: { s: number; p: number } | null = null
  // Points taken back from the shape being clicked out, for redo. Taking
  // back its first point removes the shape; redo starts it again.
  let redo: ViewPoint[] = (config.editing?.redo ?? []).map(
    (p) => [p[0], p[1]] as ViewPoint
  )
  const opened = () => config.handleOpen?.()

  const el = g()
  const bg = rect({ rx: 4, ry: 4 })
  const body = path({ 'data-outline-body': '' })
  const centre = path({ fill: 'none' })
  const ghosts = path({ fill: 'none' })
  const lines = g()
  const anchored = path({ fill: 'none' })
  const dots = g()
  const caption = text({
    'font-family': w3dTheme.fontFamily,
    'font-size': String(Math.round(w3dTheme.fontSize * 0.85)),
    fill: w3dTheme.muted,
  })
  /*
  KEPT INSIDE THE FIELD. An outline can reach past the view (one carried over
  from another body, or the body reshaped under it): its lines are clipped to
  the field, and its points are drawn (and grabbed) at the field's edge, so a
  drag brings one back rather than it painting over the panel.
  */
  const clipId = `w3d-outline-${clipSeq++}`
  const clipRect = rect({ x: 0, y: 0, width: 0, height: 0 })
  const clipped = g({ 'clip-path': `url(#${clipId})` })
  for (const n of [centre, ghosts, lines, anchored]) clipped.appendChild(n)
  for (const n of [
    clipPath({ id: clipId }, clipRect),
    bg,
    body,
    clipped,
    dots,
    caption,
  ])
    el.appendChild(n)

  const HANDLE = 4
  const GRAB = 14
  // A point this close to the centre line (px) snaps onto it.
  const SNAP = 8
  let scale = 1
  let top = 0
  let left = 0
  let viewW = 0
  let viewH = 0
  const fx = (x: number) => left + (x - view.min.u) * scale
  const py = (y: number) => top + (view.max.v - y) * scale
  // A point as drawn: on the field, at its edge if it lies past it.
  const dx = (x: number) => Math.max(left, Math.min(left + viewW, fx(x)))
  const dy = (y: number) => Math.max(top, Math.min(top + viewH, py(y)))
  const toX = (px: number) => view.min.u + (px - left) / scale
  const toY = (pv: number) => view.max.v - (pv - top) / scale

  const place = (px: number, pv: number): ViewPoint => {
    let x = Math.max(view.min.u, Math.min(view.max.u, toX(px)))
    const y = Math.max(view.min.v, Math.min(view.max.v, toY(pv)))
    if (symmetry) {
      x = Math.abs(x)
      if (x * scale < SNAP) x = 0
    }
    return [x, y]
  }

  const pointsPath = (pts: ViewPoint[], closed: boolean) =>
    pts.length === 0
      ? ''
      : 'M' +
        pts
          .map(([x, y]) => `${fx(x).toFixed(1)} ${py(y).toFixed(1)}`)
          .join('L') +
        (closed ? 'Z' : '')

  const draw = (): void => {
    bg.setAttribute('x', String(left - 4))
    bg.setAttribute('y', String(top - 4))
    bg.setAttribute('width', String(viewW + 8))
    bg.setAttribute('height', String(viewH + 8))
    bg.setAttribute('fill', w3dTheme.rowBg)
    bg.setAttribute('stroke', w3dTheme.divider)
    bg.setAttribute('stroke-width', String(w3dTheme.strokeWidth))
    clipRect.setAttribute('x', String(left - 4))
    clipRect.setAttribute('y', String(top - 4))
    clipRect.setAttribute('width', String(viewW + 8))
    clipRect.setAttribute('height', String(viewH + 8))
    body.setAttribute(
      'd',
      front.runs
        .map((r) => {
          const x0 = fx(r.u0).toFixed(1)
          const x1 = fx(r.u1).toFixed(1)
          return `M${x0} ${py(r.v + front.cell).toFixed(1)}H${x1}V${py(
            r.v
          ).toFixed(1)}H${x0}Z`
        })
        .join('')
    )
    body.setAttribute('fill', w3dTheme.muted)
    body.setAttribute('fill-opacity', '0.45')
    centre.setAttribute('d', `M${fx(0)} ${top}V${top + viewH}`)
    centre.setAttribute('stroke', w3dTheme.divider)
    centre.setAttribute('stroke-dasharray', '3 3')
    // The mirrored side, faint: what the garment will be.
    const closed = shapes.filter((_, i) => i !== open)
    ghosts.setAttribute(
      'd',
      symmetry
        ? mirrorOutline(closed)
            .map((p) => pointsPath(p, true))
            .join('')
        : ''
    )
    ghosts.setAttribute('stroke', w3dTheme.accent)
    ghosts.setAttribute('stroke-opacity', '0.35')
    ghosts.setAttribute('fill', w3dTheme.accent)
    ghosts.setAttribute('fill-opacity', '0.12')
    // The stretches of outline over the body, sampled along each edge.
    const pinned: string[] = []
    if (config.anchors)
      shapes.forEach((s, si) => {
        const n = s.length
        const edges = si === open ? n - 1 : n
        for (let i = 0; i < edges; i++) {
          const a = s[i]
          const b = s[(i + 1) % n]
          // The centre seam of a mirrored half is not an edge of the garment.
          if (symmetry && a[0] === 0 && b[0] === 0) continue
          const len = Math.hypot(b[0] - a[0], b[1] - a[1])
          const k = Math.max(1, Math.ceil(len / (front.cell / 2)))
          let run: ViewPoint | null = null
          for (let j = 0; j <= k; j++) {
            const p: ViewPoint = [
              a[0] + ((b[0] - a[0]) * j) / k,
              a[1] + ((b[1] - a[1]) * j) / k,
            ]
            const on = anchoredAt(s, p[0], p[1])
            if (on && run == null) run = p
            if ((!on || j === k) && run != null) {
              pinned.push(
                `M${fx(run[0]).toFixed(1)} ${py(run[1]).toFixed(1)}L${fx(
                  p[0]
                ).toFixed(1)} ${py(p[1]).toFixed(1)}`
              )
              run = null
            }
          }
        }
      })
    anchored.setAttribute('d', pinned.join(''))
    anchored.setAttribute('stroke', w3dTheme.anchored)
    anchored.setAttribute('stroke-width', '2.5')
    anchored.setAttribute('stroke-linecap', 'round')
    while (lines.firstChild) lines.removeChild(lines.firstChild)
    while (dots.firstChild) dots.removeChild(dots.firstChild)
    shapes.forEach((s, si) => {
      lines.appendChild(
        path({
          d: pointsPath(s, si !== open),
          fill: si === open ? 'none' : w3dTheme.accent,
          'fill-opacity': '0.2',
          stroke: w3dTheme.accent,
          'stroke-width': '1.5',
        })
      )
      s.forEach(([x, y], pi) => {
        const on =
          (selected?.s === si && selected.p === pi) ||
          (hovered?.s === si && hovered.p === pi)
        dots.appendChild(
          circle({
            cx: dx(x),
            cy: dy(y),
            r: on ? HANDLE + 1.5 : HANDLE,
            fill:
              si === open && pi === 0
                ? w3dTheme.text
                : config.anchors && si !== open && anchoredAt(s, x, y)
                ? w3dTheme.anchored
                : w3dTheme.accent,
            stroke: on ? w3dTheme.text : w3dTheme.panelBg,
            'stroke-width': String(on ? 2 : 1),
          })
        )
      })
    })
    caption.textContent =
      open != null
        ? 'Click the first point to close'
        : shapes.length
        ? 'Drag a point, or press an edge to add one'
        : 'Click out an outline'
  }

  const emit = (name: 'handleChange' | 'handleCommit'): void => {
    api[name]?.(copy(shapes))
  }

  const pointAt = (px: number, pv: number) => {
    let best: { s: number; p: number } | null = null
    let bestD = GRAB * GRAB
    shapes.forEach((s, si) =>
      s.forEach(([x, y], pi) => {
        const d = (dx(x) - px) ** 2 + (dy(y) - pv) ** 2
        if (d <= bestD) {
          bestD = d
          best = { s: si, p: pi }
        }
      })
    )
    return best as { s: number; p: number } | null
  }

  /** The closed shape's edge under the pointer: insert after point `p`. */
  const edgeAt = (px: number, pv: number) => {
    let best: { s: number; p: number } | null = null
    let bestD = (GRAB * 0.6) ** 2
    shapes.forEach((s, si) => {
      if (si === open) return
      for (let i = 0; i < s.length; i++) {
        const ax = fx(s[i][0])
        const ay = py(s[i][1])
        const bx = fx(s[(i + 1) % s.length][0])
        const by = py(s[(i + 1) % s.length][1])
        const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * (bx - ax) + (pv - ay) * (by - ay)) / l2)
        )
        const d =
          (ax + t * (bx - ax) - px) ** 2 + (ay + t * (by - ay) - pv) ** 2
        if (d < bestD) {
          bestD = d
          best = { s: si, p: i }
        }
      }
    })
    return best as { s: number; p: number } | null
  }

  const api: OutlineField = {
    el,
    symmetry,
    handleChange: config.handleChange,
    handleCommit: config.handleCommit,

    layout(width: number) {
      const pad = Math.max(2, Math.round(w3dTheme.spacing * 0.5))
      const capH = Math.round(w3dTheme.fontSize * 1.3)
      const W = view.max.u - view.min.u || 1
      const H = view.max.v - view.min.v || 1
      scale = Math.max(
        0.01,
        Math.min((width - pad * 2 - 8) / W, (config.maxHeight ?? 260) / H)
      )
      viewW = W * scale
      viewH = H * scale
      left = pad + 4 + Math.max(0, (width - pad * 2 - 8 - viewW) / 2)
      top = 6
      caption.setAttribute('x', String(pad))
      caption.setAttribute('y', String(top + viewH + 6 + capH * 0.85))
      draw()
      return top + viewH + 6 + capH + pad
    },

    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'down') {
        const hit = pointAt(x, y)
        if (open != null) {
          const s = shapes[open]
          if (hit && hit.s === open && hit.p === 0 && s.length >= 3) {
            // Closed.
            open = null
            selected = null
            redo = []
            draw()
            emit('handleCommit')
            opened()
            return
          }
          s.push(place(x, y))
          selected = { s: open, p: s.length - 1 }
          redo = []
          draw()
          opened()
          return
        }
        if (hit) {
          dragging = hit
          selected = hit
          draw()
          return
        }
        const edge = edgeAt(x, y)
        if (edge) {
          shapes[edge.s].splice(edge.p + 1, 0, place(x, y))
          dragging = { s: edge.s, p: edge.p + 1 }
          selected = dragging
          draw()
          return
        }
        shapes.push([place(x, y)])
        open = shapes.length - 1
        selected = { s: open, p: 0 }
        redo = []
        draw()
        opened()
        return
      }
      if (kind === 'move' || kind === 'hover') {
        if (dragging) {
          shapes[dragging.s][dragging.p] = place(x, y)
          draw()
          emit('handleChange')
          return
        }
        const was = hovered
        hovered = pointAt(x, y)
        if (hovered?.s !== was?.s || hovered?.p !== was?.p) draw()
        return
      }
      if (kind === 'up' || kind === 'leave') {
        const was = dragging
        dragging = null
        if (kind === 'leave') hovered = null
        draw()
        if (was) emit('handleCommit')
      }
    },

    hitTest(x: number, y: number) {
      return (
        x >= left - 4 &&
        x <= left + viewW + 4 &&
        y >= top - 4 &&
        y <= top + viewH + 4
      )
    },

    get value() {
      return copy(shapes)
    },
    get editing() {
      return {
        shapes: copy(shapes),
        open,
        selected: selected && { ...selected },
        redo: redo.map((p) => [p[0], p[1]] as ViewPoint),
      }
    },
    get canUndoPoint() {
      return open != null
    },
    get canRedoPoint() {
      return redo.length > 0
    },
    undoPoint() {
      if (open == null) return
      const s = shapes[open]
      redo.push(s.pop()!)
      if (s.length === 0) {
        shapes.splice(open, 1)
        open = null
        selected = null
      } else selected = { s: open, p: s.length - 1 }
      draw()
      opened()
    },
    redoPoint() {
      const p = redo.pop()
      if (p == null) return
      if (open == null) {
        shapes.push([])
        open = shapes.length - 1
      }
      shapes[open].push(p)
      selected = { s: open, p: shapes[open].length - 1 }
      draw()
      opened()
    },
    get polygons() {
      const closed = shapes.filter((s, i) => i !== open && s.length >= 3)
      return symmetry ? mirrorOutline(closed) : copy(closed)
    },
    setValue(v: ViewPoint[][]) {
      shapes = copy(v)
      open = null
      redo = []
      selected = dragging = hovered = null
      draw()
    },
    removeSelected() {
      if (selected == null) return
      const s = shapes[selected.s]
      s.splice(selected.p, 1)
      const isOpen = selected.s === open
      if ((!isOpen && s.length < 3) || s.length === 0) {
        shapes.splice(selected.s, 1)
        if (isOpen) open = null
        else if (open != null && open > selected.s) open--
      }
      selected = null
      redo = []
      draw()
      emit('handleCommit')
      opened()
    },
    clear() {
      shapes = []
      open = null
      redo = []
      selected = dragging = hovered = null
      draw()
      emit('handleCommit')
      opened()
    },
  }

  return api
}
