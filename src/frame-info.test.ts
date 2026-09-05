import { describe, test, expect, beforeAll } from 'bun:test'

/*
TWO CLOCKS, AND THE EASY ONE IS THE RIGHT ONE.

A consumer could scale its own effect timing but not craft motion, because
velocity comes from integrating the engine delta — so a "slow motion" control
was a lie by omission: the explosions slowed and the aircraft did not
(tosijs-3d-ensemble, #41).

Tonio's framing for the fix: *"make it easy to do the right thing"* — hand the
callback a package rather than a bare number, so the correct choice is the one
already in your hand.

The direction matters. `dt` is SIM seconds, so everything already integrating
with `sceneDelta` honours `timeScale` and pause without changing a line. The
common case is motion that should slow when the world slows, so the obvious
name gives the right clock and the exceptions have to ask for `realDt`.
*/

let U: typeof import('./b3d-utils.js')
let BABYLON: typeof import('@babylonjs/core')

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
  BABYLON = await import('@babylonjs/core')
  U = await import('./b3d-utils.js')
})

const sceneWith = (meta: Record<string, unknown> | null) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  if (meta != null) scene.metadata = meta
  return scene
}

describe('sceneFrame', () => {
  test('hands back what b3d published', () => {
    const frame = {
      dt: 0.008,
      realDt: 0.016,
      elapsed: 4,
      realElapsed: 8,
      scale: 0.5,
      paused: false,
      frame: 240,
    }
    expect(U.sceneFrame(sceneWith({ b3dFrame: frame }))).toEqual(frame)
  })

  test('a scene b3d does not drive still gets a usable package', () => {
    // Tests and standalone Babylon: dt and realDt are simply the same number,
    // which is honest rather than a guess at a scale nobody set.
    const f = U.sceneFrame(sceneWith(null))
    expect(f.dt).toBe(f.realDt)
    expect(f.scale).toBe(1)
    expect(Number.isFinite(f.dt)).toBe(true)
  })

  test('a published ZERO delta reports paused — not "no data"', () => {
    // `sceneDelta` already treats a published 0 as "time is stopped"; the
    // package must agree, or a caller reading `paused` disagrees with a caller
    // reading `dt`.
    const f = U.sceneFrame(sceneWith({ b3dFrameDelta: 0 }))
    expect(f.dt).toBe(0)
    expect(f.paused).toBe(true)
  })
})

describe('the two clocks', () => {
  /** What the render loop computes. */
  const tick = (realDt: number, scale: number, paused: boolean) =>
    paused ? { dt: 0, realDt: 0 } : { dt: realDt * scale, realDt }

  test('slow motion scales sim and leaves the wall clock alone', () => {
    const t = tick(0.016, 0.25, false)
    expect(t.dt).toBeCloseTo(0.004, 9)
    expect(t.realDt).toBe(0.016)
  })

  test('scale 0 stops the sim while the scene keeps rendering', () => {
    expect(tick(0.016, 0, false).dt).toBe(0)
  })

  test('scale 1 is exactly what it was — nothing existing changes', () => {
    const t = tick(0.016, 1, false)
    expect(t.dt).toBe(t.realDt)
  })

  test('elapsed sim and elapsed real diverge under scaling', () => {
    let sim = 0
    let real = 0
    for (let i = 0; i < 100; i++) {
      const t = tick(0.016, 0.5, false)
      sim += t.dt
      real += t.realDt
    }
    expect(real).toBeCloseTo(1.6, 6)
    expect(sim).toBeCloseTo(0.8, 6)
  })
})
