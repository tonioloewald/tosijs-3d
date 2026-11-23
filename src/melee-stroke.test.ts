import { describe, expect, test } from 'bun:test'
import {
  idleStroke,
  meleeTargets,
  strokePress,
  strokeStep,
  type StrokeState,
} from './melee-stroke.js'

const run = (
  s: StrokeState,
  frames: Array<boolean>,
  dt = 0.05,
  duration = 1
) => {
  const out: { start: boolean; hit: boolean; t: number | null }[] = []
  for (const trigger of frames) {
    const r = strokeStep(s, { trigger, dt, duration })
    s = r.state
    out.push({ start: r.start, hit: r.hit, t: s.t })
  }
  return { s, out }
}

describe('strokePress', () => {
  test('marks', () => {
    expect(strokePress(null)).toBe('start')
    expect(strokePress(0.05)).toBe('restart')
    expect(strokePress(0.5)).toBe('ignore')
    expect(strokePress(0.85)).toBe('queue')
    expect(strokePress(0.95)).toBe('chain')
  })
})

describe('strokeStep', () => {
  test('a press starts a stroke and the blow lands once at hitAt', () => {
    const { out } = run(idleStroke(), [true, ...Array(20).fill(false)], 0.0625)
    expect(out[0].start).toBe(true)
    expect(out.filter((f) => f.hit).length).toBe(1)
    // 0.4 s at 1/16 s a frame: the seventh step after the start (0.4375 s).
    expect(out.findIndex((f) => f.hit)).toBe(7)
    expect(out.at(-1)!.t).toBeNull()
  })

  test('an early second press restarts, and the cancelled stroke never lands', () => {
    const { out } = run(
      idleStroke(),
      [true, false, true, ...Array(40).fill(false)],
      0.03
    )
    expect(out[2].start).toBe(true)
    expect(out.filter((f) => f.hit).length).toBe(1)
  })

  test('a mid-stroke press is ignored', () => {
    const frames = [
      true,
      ...Array(9).fill(false),
      true,
      ...Array(20).fill(false),
    ]
    const { out } = run(idleStroke(), frames)
    expect(out.filter((f) => f.start).length).toBe(1)
  })

  test('a late press queues a follow-up at the chain mark', () => {
    // Press at 0.85 s: queued, then starts at 0.9.
    const frames = [
      true,
      ...Array(16).fill(false),
      true,
      ...Array(5).fill(false),
    ]
    const { out } = run(idleStroke(), frames)
    const starts = out.flatMap((f, i) => (f.start ? [i] : []))
    expect(starts).toEqual([0, 18])
  })

  test('a press in the last part chains at once', () => {
    const frames = [true, ...Array(18).fill(false), true]
    const { out } = run(idleStroke(), frames)
    expect(out.at(-1)!.start).toBe(true)
  })

  test('a held trigger chains at the chain mark, skipping the follow-through', () => {
    const { out } = run(idleStroke(), Array(40).fill(true))
    const starts = out.flatMap((f, i) => (f.start ? [i] : []))
    expect(starts).toEqual([0, 18, 36])
  })
})

describe('meleeTargets', () => {
  const c = (item: string, x: number, z: number) => ({ item, x, z })
  test('in reach and in front, nearest first', () => {
    const hits = meleeTargets(
      { x: 0, z: 0 },
      0,
      [
        c('far', 0, 3),
        c('behind', 0, -1),
        c('front', 0.3, 1.2),
        c('near', 0, 0.6),
        c('side', 1.5, 0.2),
      ],
      { reach: 1.8, arc: 120 }
    )
    expect(hits).toEqual(['near', 'front'])
  })
  test('heading turns the arc', () => {
    const hits = meleeTargets(
      { x: 0, z: 0 },
      90,
      [c('east', 1, 0), c('north', 0, 1)],
      {
        reach: 1.8,
        arc: 120,
      }
    )
    expect(hits).toEqual(['east'])
  })
})
