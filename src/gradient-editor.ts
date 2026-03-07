import { Component, elements } from 'tosijs'
import { PiecewiseLinearFilter } from './gradient-filter'

const { canvas } = elements

const POINT_RADIUS = 6
const PADDING = 12

export class GradientEditor extends Component {
  static initAttributes = {
    width: 200,
    height: 120,
  }

  static styleSpec = {
    ':host': {
      display: 'inline-block',
      position: 'relative',
    },
    ':host canvas': {
      cursor: 'crosshair',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.2)',
    },
  }

  filter = new PiecewiseLinearFilter()
  private dragIndex = -1
  private cnv!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D

  content = [canvas({ part: 'canvas' })]

  private toCanvasX(x: number): number {
    const w = this.cnv.width - PADDING * 2
    return PADDING + x * w
  }

  private toCanvasY(y: number): number {
    const h = this.cnv.height - PADDING * 2
    // y=0 at bottom, y=1 at top; allow out-of-range
    return PADDING + (1 - y) * h
  }

  private fromCanvasX(cx: number): number {
    const w = this.cnv.width - PADDING * 2
    return (cx - PADDING) / w
  }

  private fromCanvasY(cy: number): number {
    const h = this.cnv.height - PADDING * 2
    return 1 - (cy - PADDING) / h
  }

  private draw() {
    const { ctx, cnv } = this
    if (!ctx) return
    const w = cnv.width
    const h = cnv.height

    ctx.clearRect(0, 0, w, h)

    // background
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, w, h)

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const gx = this.toCanvasX(i / 4)
      const gy = this.toCanvasY(i / 4)
      ctx.beginPath()
      ctx.moveTo(gx, PADDING)
      ctx.lineTo(gx, h - PADDING)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PADDING, gy)
      ctx.lineTo(w - PADDING, gy)
      ctx.stroke()
    }

    // identity line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(this.toCanvasX(0), this.toCanvasY(0))
    ctx.lineTo(this.toCanvasX(1), this.toCanvasY(1))
    ctx.stroke()
    ctx.setLineDash([])

    // curve — sample the filter densely
    ctx.strokeStyle = '#4af'
    ctx.lineWidth = 2
    ctx.beginPath()
    const steps = cnv.width - PADDING * 2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = this.filter.evaluate(t)
      const cx = this.toCanvasX(t)
      const cy = this.toCanvasY(y)
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()

    // control points
    for (const pt of this.filter.points) {
      const cx = this.toCanvasX(pt.x)
      const cy = this.toCanvasY(pt.y)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4af'
      ctx.beginPath()
      ctx.arc(cx, cy, POINT_RADIUS - 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private findPoint(cx: number, cy: number): number {
    const { points } = this.filter
    for (let i = 0; i < points.length; i++) {
      const px = this.toCanvasX(points[i].x)
      const py = this.toCanvasY(points[i].y)
      const dx = cx - px
      const dy = cy - py
      if (dx * dx + dy * dy <= (POINT_RADIUS + 4) * (POINT_RADIUS + 4)) {
        return i
      }
    }
    return -1
  }

  private getCanvasCoords(e: MouseEvent): { cx: number; cy: number } {
    const rect = this.cnv.getBoundingClientRect()
    const scaleX = this.cnv.width / rect.width
    const scaleY = this.cnv.height / rect.height
    return {
      cx: (e.clientX - rect.left) * scaleX,
      cy: (e.clientY - rect.top) * scaleY,
    }
  }

  private _onMouseDown = (e: MouseEvent) => {
    const { cx, cy } = this.getCanvasCoords(e)
    const idx = this.findPoint(cx, cy)
    if (idx >= 0) {
      this.dragIndex = idx
    } else {
      // add a new point
      const x = Math.max(0, Math.min(1, this.fromCanvasX(cx)))
      const y = this.fromCanvasY(cy)
      this.filter.addPoint(x, y)
      // find the newly added point for dragging
      this.dragIndex = this.filter.points.findIndex(
        (p) => p.x === x && p.y === y
      )
      this.draw()
      this.fireChange()
    }
    e.preventDefault()
  }

  private _onMouseMove = (e: MouseEvent) => {
    if (this.dragIndex < 0) return
    const { cx, cy } = this.getCanvasCoords(e)
    const x = Math.max(0, Math.min(1, this.fromCanvasX(cx)))
    const y = this.fromCanvasY(cy)
    this.filter.setPoint(this.dragIndex, x, y)
    // re-find the index after sort
    this.dragIndex = this.filter.points.findIndex((p) => p.x === x && p.y === y)
    this.draw()
    this.fireChange()
  }

  private _onMouseUp = () => {
    this.dragIndex = -1
  }

  private _onDblClick = (e: MouseEvent) => {
    const { cx, cy } = this.getCanvasCoords(e)
    const idx = this.findPoint(cx, cy)
    if (idx >= 0) {
      this.filter.removePoint(idx)
      this.draw()
      this.fireChange()
    }
    e.preventDefault()
  }

  private _onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const { cx, cy } = this.getCanvasCoords(e)
    const idx = this.findPoint(cx, cy)
    if (idx >= 0) {
      this.filter.removePoint(idx)
      this.draw()
      this.fireChange()
    }
  }

  private fireChange() {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: { filter: this.filter },
        bubbles: true,
      })
    )
  }

  connectedCallback() {
    super.connectedCallback()
    this.cnv = this.parts.canvas as HTMLCanvasElement
    this.ctx = this.cnv.getContext('2d')!

    this.cnv.addEventListener('mousedown', this._onMouseDown)
    this.cnv.addEventListener('mousemove', this._onMouseMove)
    this.cnv.addEventListener('mouseup', this._onMouseUp)
    this.cnv.addEventListener('mouseleave', this._onMouseUp)
    this.cnv.addEventListener('dblclick', this._onDblClick)
    this.cnv.addEventListener('contextmenu', this._onContextMenu)

    this.updateSize()
  }

  disconnectedCallback() {
    this.cnv.removeEventListener('mousedown', this._onMouseDown)
    this.cnv.removeEventListener('mousemove', this._onMouseMove)
    this.cnv.removeEventListener('mouseup', this._onMouseUp)
    this.cnv.removeEventListener('mouseleave', this._onMouseUp)
    this.cnv.removeEventListener('dblclick', this._onDblClick)
    this.cnv.removeEventListener('contextmenu', this._onContextMenu)
    super.disconnectedCallback()
  }

  private updateSize() {
    const attrs = this as any
    const dpr = window.devicePixelRatio || 1
    this.cnv.width = attrs.width * dpr
    this.cnv.height = attrs.height * dpr
    this.cnv.style.width = attrs.width + 'px'
    this.cnv.style.height = attrs.height + 'px'
    this.draw()
  }

  render() {
    super.render()
    if (this.cnv) {
      this.updateSize()
    }
  }
}

export const gradientEditor = GradientEditor.elementCreator({
  tag: 'tosi-gradient-editor',
})
