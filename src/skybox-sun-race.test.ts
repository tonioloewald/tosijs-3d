import { describe, test, expect } from 'bun:test'

/*
A STILL SKY MUST STILL FIND ITS SUN.

`updateSky` writes `sunPosition`, `rayleigh` and `turbidity` only when a sun
element's LIGHT exists — and the sun is a separate element that appears on its
own schedule. The frame gate re-ran `updateSky` only when `timeOfDay` moved, so:

- `realtimeScale: 10` (the default) hid it, because the clock drifts every tick
  and the gate reopens until some pass catches the sun;
- `realtimeScale: 0` — which is what an authored, reproducible scene wants —
  ran it exactly once, and roughly four loads in five came up dark
  (tosijs-3d-ensemble, #55).

The fix gates the retry on the OUTCOME rather than the clock, bounded so a
sunless scene does not retry forever. This models that gate.
*/

const LIMIT = 300

/** The gate as it now stands, driven frame by frame. */
const runGate = (opts: {
  frames: number
  /** Frame at which the sun's light becomes available; Infinity = never. */
  sunAt: number
  /** Does the clock move? `realtimeScale: 0` means it does not. */
  clockMoves: boolean
}) => {
  let sunApplied = false
  let waitFrames = 0
  let lastTime = NaN
  let timeOfDay = 12
  let updates = 0
  let appliedAt = -1
  for (let f = 0; f < opts.frames; f++) {
    if (opts.clockMoves) timeOfDay += 0.01
    const waiting = !sunApplied && waitFrames < LIMIT
    if (waiting) waitFrames++
    if (timeOfDay !== lastTime || waiting) {
      lastTime = timeOfDay
      updates++
      // updateSky: the sun branch runs only if the light is there.
      sunApplied = f >= opts.sunAt
      if (sunApplied && appliedAt < 0) appliedAt = f
    }
  }
  return { updates, sunApplied, appliedAt }
}

describe('a still sky (realtimeScale 0)', () => {
  test('the REPORTED case: sun arrives late, and the sky recovers', () => {
    const r = runGate({ frames: 120, sunAt: 30, clockMoves: false })
    expect(r.sunApplied).toBe(true)
    expect(r.appliedAt).toBe(30)
  })

  test('and it stops updating once satisfied — the retry is not a poll', () => {
    const r = runGate({ frames: 500, sunAt: 10, clockMoves: false })
    // One pass per frame until the sun lands, then nothing.
    expect(r.updates).toBe(11)
  })

  test('a sun present from the first frame costs exactly one pass', () => {
    const r = runGate({ frames: 500, sunAt: 0, clockMoves: false })
    expect(r.updates).toBe(1)
  })

  test('a scene with NO sun gives up instead of retrying forever', () => {
    const r = runGate({ frames: 5000, sunAt: Infinity, clockMoves: false })
    expect(r.sunApplied).toBe(false)
    expect(r.updates).toBe(LIMIT) // bounded, not 5000
  })
})

describe('an animated sky is unaffected', () => {
  test('it still updates every frame, as it must to animate', () => {
    const r = runGate({ frames: 100, sunAt: 20, clockMoves: true })
    expect(r.updates).toBe(100)
    expect(r.sunApplied).toBe(true)
  })

  test('which is exactly why the bug hid behind the default', () => {
    // The moving clock reopened the gate until a pass caught the sun, so the
    // default `realtimeScale: 10` never showed the fault.
    const r = runGate({ frames: 100, sunAt: 60, clockMoves: true })
    expect(r.sunApplied).toBe(true)
  })
})
