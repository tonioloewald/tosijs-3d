export interface GradientFilter {
  evaluate(t: number): number
}

export interface ControlPoint {
  x: number
  y: number
}

export class PiecewiseLinearFilter implements GradientFilter {
  points: ControlPoint[]

  constructor(points?: ControlPoint[]) {
    this.points = points ?? [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    this.sort()
  }

  private sort() {
    this.points.sort((a, b) => a.x - b.x)
  }

  evaluate(t: number): number {
    const { points } = this
    // clamp input
    t = t < 0 ? 0 : t > 1 ? 1 : t

    if (points.length === 0) return t
    if (points.length === 1) return points[0].y

    // below first point
    if (t <= points[0].x) return points[0].y
    // above last point
    if (t >= points[points.length - 1].x) return points[points.length - 1].y

    // find segment
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      if (t >= a.x && t <= b.x) {
        const segLen = b.x - a.x
        if (segLen === 0) return a.y
        const frac = (t - a.x) / segLen
        return a.y + (b.y - a.y) * frac
      }
    }
    return t
  }

  addPoint(x: number, y: number) {
    this.points.push({ x, y })
    this.sort()
  }

  removePoint(index: number) {
    if (this.points.length <= 2) return // keep at least 2 points
    this.points.splice(index, 1)
  }

  setPoint(index: number, x: number, y: number) {
    this.points[index] = { x, y }
    this.sort()
  }
}

export function identityFilter(): PiecewiseLinearFilter {
  return new PiecewiseLinearFilter()
}

export function plateauFilter(steps: number): PiecewiseLinearFilter {
  const points: ControlPoint[] = []
  for (let i = 0; i < steps; i++) {
    const y = i / (steps - 1)
    const x0 = i / steps
    const x1 = (i + 1) / steps
    points.push({ x: x0, y })
    points.push({ x: x1 - 0.001, y })
  }
  return new PiecewiseLinearFilter(points)
}
