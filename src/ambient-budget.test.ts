import { describe, expect, test } from 'bun:test'
import {
  allocateAmbient,
  fillWeight,
  ratchetPool,
  recoverPool,
  spawnBias,
} from './ambient-budget.js'
import type { AmbientRequest } from './ambient-budget.js'
import type { PerfTier } from './perf-probe.js'

const req = (
  over: Partial<AmbientRequest> & { id: string }
): AmbientRequest => ({
  desired: 1000,
  min: 200,
  minTier: 'low' as PerfTier,
  priority: 0,
  weight: 1,
  ...over,
})

describe('fillWeight', () => {
  test('prices by AREA — the big soft flake costs far more than the thin drop', () => {
    expect(fillWeight(0.22, false)).toBeGreaterThan(fillWeight(0.06, false) * 4)
  })

  test('additive pays a premium', () => {
    expect(fillWeight(0.12, true)).toBeGreaterThan(fillWeight(0.12, false))
  })

  test('clamped — a model that says 40x is lying with unearned confidence', () => {
    expect(fillWeight(10, true)).toBe(4)
    expect(fillWeight(0.0001, false)).toBe(0.25)
    expect(fillWeight(0, false)).toBe(0.25)
  })
})

describe('allocateAmbient', () => {
  test('everyone gets what they asked for when the pool covers it', () => {
    const out = allocateAmbient([req({ id: 'rain' }), req({ id: 'motes' })], {
      pool: 5000,
      tier: 'high',
    })
    expect(out).toEqual({ rain: 1000, motes: 1000 })
  })

  test('a mild squeeze thins everyone rather than killing anyone', () => {
    // 2000 weighted units wanted, 1500 available, nobody falls under min (200).
    const out = allocateAmbient([req({ id: 'rain' }), req({ id: 'motes' })], {
      pool: 1500,
      tier: 'high',
    })
    expect(out.rain).toBe(750)
    expect(out.motes).toBe(750)
  })

  test('weight is what gets charged — the expensive effect eats more of the pool', () => {
    const out = allocateAmbient(
      [req({ id: 'cheap', weight: 0.25 }), req({ id: 'pricey', weight: 4 })],
      { pool: 4250, tier: 'high' }
    )
    // 1000*0.25 + 1000*4 = 4250 → exactly affordable, both whole.
    expect(out).toEqual({ cheap: 1000, pricey: 1000 })
    // Halve the pool and both thin by the same FACTOR, not the same amount.
    const tight = allocateAmbient(
      [req({ id: 'cheap', weight: 0.25 }), req({ id: 'pricey', weight: 4 })],
      { pool: 2125, tier: 'high' }
    )
    expect(tight.cheap).toBe(500)
    expect(tight.pricey).toBe(500)
  })

  test('an effect that would drop below min switches OFF — it does not thin out', () => {
    // Pool only affords ~600 total; splitting it two ways puts BOTH under min 500.
    // So the low-priority one dies and the survivor gets the whole pool, honestly.
    const out = allocateAmbient(
      [
        req({ id: 'rain', min: 500, priority: 10 }),
        req({ id: 'motes', min: 500, priority: 1 }),
      ],
      { pool: 600, tier: 'high' }
    )
    expect(out.motes).toBe(0) // lower priority — sacrificed
    expect(out.rain).toBe(600) // and it got the freed budget, so it's real rain
    expect(out.rain).toBeGreaterThanOrEqual(500)
  })

  test('the freed budget goes to the survivors — that is the point of sacrificing', () => {
    const out = allocateAmbient(
      [
        req({ id: 'a', desired: 1000, min: 900, priority: 5 }),
        req({ id: 'b', desired: 1000, min: 900, priority: 1 }),
      ],
      { pool: 1000, tier: 'high' }
    )
    expect(out.b).toBe(0)
    expect(out.a).toBe(1000) // full strength, not 500
  })

  test('when nobody can be honest, everything is off — no fake ambient', () => {
    const out = allocateAmbient(
      [req({ id: 'rain', min: 500 }), req({ id: 'motes', min: 500 })],
      { pool: 100, tier: 'high' }
    )
    expect(out).toEqual({ rain: 0, motes: 0 })
  })

  test('an empty pool switches everything off rather than throwing', () => {
    const out = allocateAmbient([req({ id: 'rain' })], {
      pool: 0,
      tier: 'high',
    })
    expect(out.rain).toBe(0)
  })

  test('minTier is an absolute gate — no budget buys you onto a weak device', () => {
    const out = allocateAmbient(
      [
        req({ id: 'fancy', minTier: 'high' }),
        req({ id: 'plain', minTier: 'low' }),
      ],
      { pool: 100000, tier: 'low' }
    )
    expect(out.fancy).toBe(0) // pool is enormous; it still doesn't run
    expect(out.plain).toBe(1000)
  })

  test('a tier-gated effect frees its budget for the ones that can run', () => {
    const out = allocateAmbient(
      [
        req({ id: 'fancy', minTier: 'high', weight: 4 }),
        req({ id: 'plain', min: 900 }),
      ],
      { pool: 1000, tier: 'medium' }
    )
    expect(out.fancy).toBe(0)
    expect(out.plain).toBe(1000) // would have starved under min if 'fancy' had been charged
  })

  test('deterministic — ties break on id, so the same scene sheds the same thing', () => {
    const mk = () => [
      req({ id: 'zebra', min: 900, priority: 0 }),
      req({ id: 'aardvark', min: 900, priority: 0 }),
    ]
    const a = allocateAmbient(mk(), { pool: 1000, tier: 'high' })
    const b = allocateAmbient(mk().reverse(), { pool: 1000, tier: 'high' })
    expect(a).toEqual(b)
    expect(a.aardvark).toBe(0) // lower id sheds first when priority ties
    expect(a.zebra).toBe(1000)
  })

  test('no requests is not an error', () => {
    expect(allocateAmbient([], { pool: 1000, tier: 'high' })).toEqual({})
  })
})

describe('ratchetPool', () => {
  test('only ever goes down', () => {
    const a = ratchetPool(1)
    expect(a).toBeLessThan(1)
    expect(ratchetPool(a)).toBeLessThan(a)
  })

  test('bottoms out at zero — below a quarter there is no honest effect left', () => {
    let scale = 1
    for (let i = 0; i < 20; i++) scale = ratchetPool(scale)
    expect(scale).toBe(0)
  })

  test('a fully-shed pool stays shed', () => {
    expect(ratchetPool(0)).toBe(0)
  })
})

describe('spawnBias — put the particles where the camera is looking', () => {
  const F = { x: 0, y: 0, z: 1 } // looking +Z
  const STILL = { x: 0, y: 0, z: 0 }

  test('no knobs set = no change (the old behaviour, exactly)', () => {
    const b = spawnBias(F, { x: 0, y: 0, z: 30 }, { radius: 12 })
    expect(b).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('lookAhead pushes the box along the VIEW, in units of radius', () => {
    const b = spawnBias(F, STILL, { radius: 12, lookAhead: 0.5 })
    expect(b.z).toBeCloseTo(6)
    expect(b.x).toBeCloseTo(0)
  })

  test('lead pushes it along MOTION, in seconds of travel', () => {
    const b = spawnBias(F, { x: 0, y: 0, z: 20 }, { radius: 12, lead: 0.5 })
    expect(b.z).toBeCloseTo(10) // 20 m/s for half a second
  })

  test('the lead is CAPPED, so speed cannot fling the box past the far plane', () => {
    const fast = spawnBias(
      F,
      { x: 0, y: 0, z: 200 },
      { radius: 12, lead: 0.5, speedCap: 40 }
    )
    expect(fast.z).toBeCloseTo(20) // 40, not 200
  })

  test('looking and moving in different directions both contribute', () => {
    const b = spawnBias(
      F,
      { x: 20, y: 0, z: 0 },
      { radius: 12, lookAhead: 0.5, lead: 0.5 }
    )
    expect(b.z).toBeCloseTo(6) // view
    expect(b.x).toBeCloseTo(10) // motion
  })

  test('a stationary viewer is unaffected by the lead', () => {
    const b = spawnBias(F, STILL, { radius: 12, lookAhead: 0.5, lead: 0.5 })
    expect(b.x).toBeCloseTo(0)
    expect(b.z).toBeCloseTo(6)
  })
})

/*
A TRANSIENT MUST NOT COST THE SESSION ITS WEATHER.

`ratchetPool` is one-way and fast, which is right on weak hardware and wrong for
ordinary play: falling into water fired fog, bubbles and a surface transition at
once, shed the pool to ZERO, and a headset that had been rendering leaves a
second earlier had no ambience for the rest of the run.

`recoverPool` is the other direction, and the asymmetry is the whole design —
recovery must be harder to earn than shedding, or the two fight and you get an
oscillator instead of a budget.
*/
describe('recoverPool — grudging, and never a rebound', () => {
  test('recovery is SMALLER than the shed, so a wrong guess self-corrects', () => {
    const shed = 1 - ratchetPool(1) // 0.4 lost in one step
    const gain = recoverPool(0.6) - 0.6 // 0.21 regained in one step
    expect(gain).toBeLessThan(shed)
  })

  test('a pool shed to ZERO comes back — the reported bug', () => {
    expect(ratchetPool(0.36)).toBe(0) // below the quarter floor: all off
    expect(recoverPool(0)).toBeGreaterThan(0)
  })

  test('it never exceeds the author budget', () => {
    expect(recoverPool(0.95)).toBe(1)
    expect(recoverPool(1)).toBe(1)
    expect(recoverPool(2)).toBe(1)
  })

  test('shed-then-recover does NOT return to where it started in one step', () => {
    // The property that stops oscillation: one bad interval costs more than one
    // good interval buys, so a flapping frame rate settles DOWN, not sideways.
    const after = recoverPool(ratchetPool(1))
    expect(after).toBeLessThan(1)
    expect(after).toBeGreaterThan(ratchetPool(1))
  })

  test('sustained good time fully recovers, so a hitch is not permanent', () => {
    let s = 0
    for (let i = 0; i < 12; i++) s = recoverPool(s)
    expect(s).toBe(1)
  })

  test('a genuinely weak device stays near the bottom rather than flickering', () => {
    // Shed twice per recovery — the machine really cannot afford it.
    let s = 1
    for (let i = 0; i < 6; i++) s = ratchetPool(ratchetPool(recoverPool(s)))
    expect(s).toBe(0)
  })
})
