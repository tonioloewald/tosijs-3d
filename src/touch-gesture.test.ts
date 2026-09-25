import { describe, expect, test } from 'bun:test'
import { twoFingerGesture, type TwoFingerStep } from './touch-gesture.js'

/** Feed a gesture from (spacing, centroid) keyframes; collect the steps. */
const run = (frames: Array<[number, number, number]>, decidePx = 12) => {
  const g = twoFingerGesture({ decidePx })
  const out: TwoFingerStep[] = []
  for (let i = 1; i < frames.length; i++) {
    const [s0, x0, y0] = frames[i - 1]
    const [s1, x1, y1] = frames[i]
    out.push(g.step(s0, s1, { x: x0, y: y0 }, { x: x1, y: y1 }))
  }
  return { g, out }
}

describe('two fingers: pan or zoom, decided once (tosijs-3d#52)', () => {
  test('moving together pans, even with the spacing wobbling', () => {
    // Real fingers: the spacing jitters by a few px while the pair travels.
    const frames: Array<[number, number, number]> = []
    for (let i = 0; i <= 30; i++)
      frames.push([100 + (i % 2 ? 3 : -3), 300 + i * 5, 200])
    const { g, out } = run(frames)
    expect(g.mode).toBe('pan')
    const pans = out.filter((s) => s.kind === 'pan') as any[]
    expect(pans.length).toBeGreaterThan(25)
    expect(pans.every((p) => p.dx === 5 && p.dy === 0)).toBe(true)
    expect(out.some((s) => s.kind === 'zoom')).toBe(false)
  })

  test('a SLOW pinch still zooms — the case Babylon turns into a pan', () => {
    // 1 px of spread per event: never over pinchToPanMaxDistance in one event.
    const frames: Array<[number, number, number]> = []
    for (let i = 0; i <= 60; i++) frames.push([100 + i, 300, 200])
    const { g, out } = run(frames)
    expect(g.mode).toBe('zoom')
    const zooms = out.filter((s) => s.kind === 'zoom') as any[]
    // Natural zoom: the ratios multiply to start/end spacing.
    const total = zooms.reduce((p, z) => p * z.ratio, 1)
    const decided = out.findIndex((s) => s.kind === 'zoom')
    expect(total).toBeCloseTo((100 + decided) / 160, 9)
    expect(total).toBeLessThan(1) // spreading zooms IN
  })

  test('it never changes its mind mid-stroke', () => {
    // Starts as a clear pan, then the fingers spread a lot.
    const frames: Array<[number, number, number]> = []
    for (let i = 0; i <= 10; i++) frames.push([100, 300 + i * 5, 200])
    for (let i = 1; i <= 20; i++) frames.push([100 + i * 10, 350, 200])
    const { g, out } = run(frames)
    expect(g.mode).toBe('pan')
    expect(out.some((s) => s.kind === 'zoom')).toBe(false)
  })

  test('nothing happens until it has decided, and reset starts over', () => {
    const g = twoFingerGesture({ decidePx: 12 })
    expect(g.step(100, 101, { x: 0, y: 0 }, { x: 1, y: 0 }).kind).toBe(
      'pending'
    )
    expect(g.mode).toBe('pending')
    g.step(100, 100, { x: 1, y: 0 }, { x: 20, y: 0 })
    expect(g.mode).toBe('pan')
    g.reset()
    expect(g.mode).toBe('pending')
  })
})
