import { describe, test, expect, beforeAll } from 'bun:test'
import type { PanelGestureAction } from './b3d-svg-plane'

// b3d-svg-plane pulls in tosijs (needs a DOM at import), so shim first. The
// functions under test are pure; the DOM is import-time baggage only.
let panelGesture: typeof import('./b3d-svg-plane').panelGesture
let uvToViewBox: typeof import('./b3d-svg-plane').uvToViewBox
let planeLocalToViewBox: typeof import('./b3d-svg-plane').planeLocalToViewBox

beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  const m = await import('./b3d-svg-plane')
  panelGesture = m.panelGesture
  uvToViewBox = m.uvToViewBox
  planeLocalToViewBox = m.planeLocalToViewBox
})

// The gesture contract, pinned pure — each behaviour here corresponds to an
// on-device failure from the 0.6.0 cycle (see UI-DESIGN-NOTES: the lost-up
// saga, the screen-coordinates-in-VR catcher, the orbit-policy asymmetry).

const route = (a: PanelGestureAction[]) =>
  a.filter((x) => x.do === 'route') as Array<{
    do: 'route'
    kind: string
    x: number
    y: number
  }>

describe('uvToViewBox', () => {
  test('flips Y (Babylon uv origin is bottom-left; viewBox is top-left)', () => {
    expect(uvToViewBox({ x: 0, y: 1 }, 320, 170)).toEqual({ x: 0, y: 0 })
    expect(uvToViewBox({ x: 1, y: 0 }, 320, 170)).toEqual({ x: 320, y: 170 })
    expect(uvToViewBox({ x: 0.5, y: 0.5 }, 320, 170)).toEqual({ x: 160, y: 85 })
  })
})

describe('planeLocalToViewBox', () => {
  test('centre maps to centre; corners map with Y inversion', () => {
    // a 2.4 × 1.275 world plane carrying a 320 × 170 viewBox
    const W = 2.4
    const H = 1.275
    expect(planeLocalToViewBox({ x: 0, y: 0 }, W, H, 320, 170)).toEqual({
      x: 160,
      y: 85,
    })
    // top-left of the plane in world space is (-W/2, +H/2) → viewBox (0, 0)
    expect(
      planeLocalToViewBox({ x: -W / 2, y: H / 2 }, W, H, 320, 170)
    ).toEqual({ x: 0, y: 0 })
    expect(
      planeLocalToViewBox({ x: W / 2, y: -H / 2 }, W, H, 320, 170)
    ).toEqual({ x: 320, y: 170 })
  })

  test('points OUTSIDE the plane extrapolate (the catcher is 3× the plane)', () => {
    const p = planeLocalToViewBox({ x: 2.4, y: 0 }, 2.4, 1.275, 320, 170)
    expect(p.x).toBeCloseTo(480, 5) // 1.5 plane-widths right of the left edge
  })
})

describe('panelGesture — claiming', () => {
  test('a claimed down begins the gesture AND routes the down', () => {
    const r = panelGesture(false, {
      kind: 'down',
      onPlane: true,
      x: 10,
      y: 20,
      claims: true,
    })
    expect(r.active).toBe(true)
    expect(r.actions.map((a) => a.do)).toEqual(['begin', 'route'])
    expect(route(r.actions)[0]).toMatchObject({ kind: 'down', x: 10, y: 20 })
  })

  test('an UNCLAIMED down routes but never yields the camera', () => {
    // The orbit-policy contract: pressing static prose must orbit, so no begin.
    const r = panelGesture(false, {
      kind: 'down',
      onPlane: true,
      x: 10,
      y: 20,
      claims: false,
    })
    expect(r.active).toBe(false)
    expect(r.actions.map((a) => a.do)).toEqual(['route'])
  })

  test('a down OFF the plane does nothing at all', () => {
    const r = panelGesture(false, { kind: 'down', onPlane: false })
    expect(r.active).toBe(false)
    expect(r.actions).toEqual([])
  })
})

describe('panelGesture — the active gesture rides the catcher', () => {
  test('moves route at the catcher point, never the live-pick point', () => {
    const r = panelGesture(true, {
      kind: 'move',
      onPlane: true, // even if a live pick exists, the catcher wins
      x: 999,
      y: 999,
      catcher: { x: 42, y: 24 },
    })
    expect(r.active).toBe(true)
    expect(route(r.actions)).toEqual([
      { do: 'route', kind: 'move', x: 42, y: 24 },
    ])
  })

  test('a move whose ray missed the catcher routes nothing (gesture holds)', () => {
    const r = panelGesture(true, {
      kind: 'move',
      onPlane: false,
      catcher: null,
    })
    expect(r.active).toBe(true)
    expect(r.actions).toEqual([])
  })

  test('an up on the catcher routes the up and ends the gesture', () => {
    const r = panelGesture(true, {
      kind: 'up',
      onPlane: false,
      catcher: { x: 5, y: 6 },
    })
    expect(r.active).toBe(false)
    expect(r.actions.map((a) => a.do)).toEqual(['route', 'end'])
    expect(route(r.actions)[0]).toMatchObject({ kind: 'up', x: 5, y: 6 })
  })

  test('an up that missed entirely still ENDS the gesture with leave — capture semantics', () => {
    const r = panelGesture(true, { kind: 'up', onPlane: false, catcher: null })
    expect(r.active).toBe(false)
    expect(route(r.actions)[0]).toMatchObject({ kind: 'leave' })
    expect(r.actions.map((a) => a.do)).toEqual(['route', 'end'])
  })
})

describe('panelGesture — hover with no gesture', () => {
  test('on-plane moves route as moves; off-plane moves are leave', () => {
    const on = panelGesture(false, { kind: 'move', onPlane: true, x: 1, y: 2 })
    expect(route(on.actions)[0]).toMatchObject({ kind: 'move', x: 1, y: 2 })
    const off = panelGesture(false, { kind: 'move', onPlane: false })
    expect(route(off.actions)[0]).toMatchObject({ kind: 'leave' })
  })
})
