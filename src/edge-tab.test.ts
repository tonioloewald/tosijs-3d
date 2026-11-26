import { describe, test, expect } from 'bun:test'
import {
  EDGE_TAB_MARGIN,
  edgeCollapsed,
  edgeTabAvoid,
  edgeTabSpot,
  fitTab,
  panelExtent,
  tabRect,
  tangentBounds,
  type HeadVec,
  type TangentBounds,
} from './edge-tab.js'

/*
A PANEL OUT OF VIEW IS ITS HEADER AT THE EDGE. On narrow optical see-through
glasses a panel cut by the display's edge shows you the edge of the display;
these pin when a panel folds, when it opens again, and where its tab goes.
*/

const t = (deg: number) => Math.tan((deg * Math.PI) / 180)
// About an AR glasses' window: 57° across, 33° tall.
const NARROW: TangentBounds = {
  left: -t(28.5),
  right: t(28.5),
  bottom: -t(16.5),
  top: t(16.5),
}

/** A flat panel `w` by `h` metres facing you, its middle at yaw/pitch, `d` away. */
function panel(yawDeg: number, pitchDeg: number, w: number, h: number, d = 1) {
  const yaw = (yawDeg * Math.PI) / 180
  const pitch = (pitchDeg * Math.PI) / 180
  const c = {
    x: d * Math.cos(pitch) * Math.sin(yaw),
    y: d * Math.sin(pitch),
    z: d * Math.cos(pitch) * Math.cos(yaw),
  }
  const right = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) }
  const up = {
    x: -Math.sin(pitch) * Math.sin(yaw),
    y: Math.cos(pitch),
    z: -Math.sin(pitch) * Math.cos(yaw),
  }
  const corners: HeadVec[] = []
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      corners.push({
        x: c.x + (sx * w * right.x) / 2 + (sy * h * up.x) / 2,
        y: c.y + (sx * w * right.y) / 2 + (sy * h * up.y) / 2,
        z: c.z + (sx * w * right.z) / 2 + (sy * h * up.z) / 2,
      })
  return panelExtent(corners)
}

describe('the view both eyes share', () => {
  test('is the narrower bound on every side', () => {
    const v = tangentBounds([
      { left: -1.2, right: 0.9, bottom: -1, top: 1.1 },
      { left: -0.9, right: 1.2, bottom: -1.05, top: 1 },
    ])
    expect(v).toEqual({ left: -0.9, right: 0.9, bottom: -1, top: 1 })
  })
})

describe('when a panel folds', () => {
  test('straight ahead and smaller than the view, it stays open', () => {
    expect(edgeCollapsed(panel(0, 0, 0.4, 0.2), NARROW, false)).toBe(false)
  })

  test('a hair over the edge is not enough', () => {
    // 0.4 m wide at 1 m is 22.6° across; its right edge at 29.3°, past 28.5°.
    const p = panel(18, 0, 0.4, 0.2)
    expect(p.right).toBeGreaterThan(NARROW.right)
    expect(edgeCollapsed(p, NARROW, false)).toBe(false)
  })

  test('more than a tenth of it past the edge folds it', () => {
    expect(edgeCollapsed(panel(25, 0, 0.4, 0.2), NARROW, false)).toBe(true)
    expect(edgeCollapsed(panel(0, 25, 0.4, 0.2), NARROW, false)).toBe(true)
  })

  test('it opens again only with room to spare, so the edge does not flicker', () => {
    const atEdge = panel(18, 0, 0.4, 0.2)
    expect(edgeCollapsed(atEdge, NARROW, false)).toBe(false)
    expect(edgeCollapsed(atEdge, NARROW, true)).toBe(true)
    expect(edgeCollapsed(panel(5, 0, 0.4, 0.2), NARROW, true)).toBe(false)
  })

  test('behind you or beside you, it is a tab', () => {
    const behind = panel(180, 0, 0.4, 0.2)
    expect(behind.behind).toBe(true)
    expect(edgeCollapsed(behind, NARROW, false)).toBe(true)
    expect(panel(95, 0, 0.4, 0.2).behind).toBe(true)
  })

  test('one bigger than the view stays open while you look at it', () => {
    // 1.4 m wide at 1 m is 70° across: it cannot fit a 57° window.
    expect(edgeCollapsed(panel(0, 0, 1.4, 0.2), NARROW, false)).toBe(false)
    expect(edgeCollapsed(panel(20, 0, 1.4, 0.2), NARROW, false)).toBe(false)
    // Looking past its end, it folds.
    expect(edgeCollapsed(panel(50, 0, 1.4, 0.2), NARROW, false)).toBe(true)
    // And to open again the middle of the view must be well on it.
    expect(edgeCollapsed(panel(34, 0, 1.4, 0.2), NARROW, true)).toBe(true)
    expect(edgeCollapsed(panel(10, 0, 1.4, 0.2), NARROW, true)).toBe(false)
  })
})

describe('where its tab goes', () => {
  const half = 0.03

  test('against the edge it went past, toward it', () => {
    const s = edgeTabSpot(panel(60, 0, 0.4, 0.2), NARROW, half * 3, half)
    expect(s.side).toBe('right')
    expect(s.angleDeg).toBeCloseTo(0, 6)
    expect(s.x + half * 3).toBeLessThan(NARROW.right)
    expect(s.x).toBeGreaterThan(NARROW.right * 0.7)
    expect(s.y).toBeCloseTo(0, 9)
  })

  test('up for a panel overhead', () => {
    const s = edgeTabSpot(panel(0, 50, 0.4, 0.2), NARROW, half * 3, half)
    expect(s.side).toBe('top')
    expect(s.angleDeg).toBeCloseTo(90, 6)
    expect(s.y + half).toBeLessThan(NARROW.top)
    expect(s.y).toBeGreaterThan(NARROW.top * 0.6)
  })

  test('on the line toward its middle, up and to the side', () => {
    const p = panel(45, 30, 0.4, 0.2)
    const s = edgeTabSpot(p, NARROW, half * 3, half)
    expect(Math.sign(s.x)).toBe(1)
    expect(Math.sign(s.y)).toBe(1)
    // On the line from the middle of the view to the panel's middle.
    expect(s.y / s.x).toBeCloseTo(p.cy / p.cx, 6)
  })

  test('always in view, by the margin', () => {
    for (const [yaw, pitch] of [
      [0, 80],
      [170, 0],
      [-120, -30],
      [60, -60],
    ]) {
      const s = edgeTabSpot(panel(yaw, pitch, 0.4, 0.2), NARROW, half * 3, half)
      const mx = EDGE_TAB_MARGIN * (NARROW.right - NARROW.left)
      const my = EDGE_TAB_MARGIN * (NARROW.top - NARROW.bottom)
      expect(s.x - half * 3).toBeGreaterThanOrEqual(NARROW.left + mx - 1e-9)
      expect(s.x + half * 3).toBeLessThanOrEqual(NARROW.right - mx + 1e-9)
      expect(s.y - half).toBeGreaterThanOrEqual(NARROW.bottom + my - 1e-9)
      expect(s.y + half).toBeLessThanOrEqual(NARROW.top - my + 1e-9)
    }
  })

  test('straight behind you goes to a side, not the middle', () => {
    const s = edgeTabSpot(panel(180, 0, 0.4, 0.2), NARROW, half * 3, half)
    expect(s.side === 'left' || s.side === 'right').toBe(true)
  })

  test('two on one edge stand side by side', () => {
    const a = edgeTabSpot(panel(0, 50, 0.4, 0.2), NARROW, half * 3, half)
    const b = edgeTabSpot(panel(2, 50, 0.4, 0.2), NARROW, half * 3, half)
    const placed = [{ x: a.x, y: a.y, halfW: half * 3, halfH: half }]
    const at = edgeTabAvoid(b, half * 3, half, placed, NARROW)
    expect(Math.abs(at.x - a.x)).toBeGreaterThanOrEqual(half * 6)
    expect(at.y).toBeCloseTo(b.y, 9)
    // Toward its own panel, which is a little to the right.
    expect(at.x).toBeGreaterThan(a.x)
  })
})

describe('a tab fitted by its corners', () => {
  // A Quest-wide view: 50° each side, where a tab covers far more tangent at
  // the edge than in the middle.
  const WIDE: TangentBounds = { left: -t(50), right: t(50), bottom: -t(45), top: t(45) }

  test('in the middle it covers what its size says', () => {
    const r = tabRect(0, 0, 0.1, 0.02)
    expect(r.right).toBeCloseTo(0.1, 6)
    expect(r.top).toBeCloseTo(0.02, 6)
  })

  test('at the edge of a wide view it covers more', () => {
    const r = tabRect(t(45), 0, 0.1, 0.02)
    expect(r.right - r.left).toBeGreaterThan(0.2 * 1.8)
  })

  test('is pulled in until every corner is inside, by the margin', () => {
    for (const [x, y] of [
      [WIDE.right, 0],
      [WIDE.right, WIDE.top],
      [WIDE.left, WIDE.bottom],
      [0, WIDE.top],
    ]) {
      const at = fitTab(x, y, 0.15, 0.027, WIDE)
      const r = tabRect(at.x, at.y, 0.15, 0.027)
      const mx = EDGE_TAB_MARGIN * (WIDE.right - WIDE.left)
      const my = EDGE_TAB_MARGIN * (WIDE.top - WIDE.bottom)
      expect(r.right).toBeLessThanOrEqual(WIDE.right - mx + 1e-4)
      expect(r.left).toBeGreaterThanOrEqual(WIDE.left + mx - 1e-4)
      expect(r.top).toBeLessThanOrEqual(WIDE.top - my + 1e-4)
      expect(r.bottom).toBeGreaterThanOrEqual(WIDE.bottom + my - 1e-4)
    }
  })

  test('one already inside is left where it is', () => {
    expect(fitTab(0.2, 0.1, 0.1, 0.02, WIDE)).toEqual({ x: 0.2, y: 0.1 })
  })
})

