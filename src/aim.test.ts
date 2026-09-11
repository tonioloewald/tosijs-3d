import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_AIM_LIMITS,
  aimAuthority,
  aimDirection,
  aimPoseWeights,
  aimToward,
  aimWobble,
  bodyCatchUp,
  clampAim2,
  relaxAim,
  stepAim,
  wrapDeg,
  type Aim,
  type AimLimits,
} from './aim.js'

const L = DEFAULT_AIM_LIMITS

describe('wrapDeg', () => {
  test('brings an angle into (-180, 180]', () => {
    expect(wrapDeg(0)).toBe(0)
    expect(wrapDeg(190)).toBeCloseTo(-170, 6)
    expect(wrapDeg(-190)).toBeCloseTo(170, 6)
    expect(wrapDeg(540)).toBeCloseTo(180, 6)
  })

  test('180 stays 180 rather than becoming -180', () => {
    // Both are the same direction, but a caller multiplying by a sign wants a
    // stable answer rather than one that flips with floating-point noise.
    expect(wrapDeg(180)).toBe(180)
  })

  test('a non-finite angle is 0, not NaN', () => {
    expect(wrapDeg(NaN)).toBe(0)
    expect(wrapDeg(Infinity)).toBe(0)
  })
})

describe('aimToward', () => {
  test('straight ahead of a body facing +Z is neutral', () => {
    const a = aimToward(0, { x: 0, y: 0, z: 1 })
    expect(a.yawDeg).toBeCloseTo(0, 6)
    expect(a.pitchDeg).toBeCloseTo(0, 6)
  })

  test('positive yaw is to the character RIGHT', () => {
    // +X is right of a body facing +Z, in this left-handed system.
    expect(aimToward(0, { x: 1, y: 0, z: 0 }).yawDeg).toBeCloseTo(90, 6)
    expect(aimToward(0, { x: -1, y: 0, z: 0 }).yawDeg).toBeCloseTo(-90, 6)
  })

  test('positive pitch is DOWN', () => {
    expect(aimToward(0, { x: 0, y: -1, z: 0 }).pitchDeg).toBeGreaterThan(0)
    expect(aimToward(0, { x: 0, y: 1, z: 0 }).pitchDeg).toBeLessThan(0)
  })

  test('yaw is relative to the body, and takes the short way round', () => {
    // Body already facing right; target dead ahead of the WORLD, so the twist
    // is 90 degrees back to the left — not 270 to the right.
    expect(aimToward(90, { x: 0, y: 0, z: 1 }).yawDeg).toBeCloseTo(-90, 6)
    // The wrap case that produces the classic "turns the long way" bug.
    const a = aimToward(170, { x: -Math.sin(0.2), y: 0, z: -Math.cos(0.2) })
    expect(Math.abs(a.yawDeg)).toBeLessThan(45)
  })

  test('does not need a normalised direction', () => {
    const near = aimToward(0, { x: 1, y: 0, z: 1 })
    const far = aimToward(0, { x: 100, y: 0, z: 100 })
    expect(far.yawDeg).toBeCloseTo(near.yawDeg, 6)
    expect(far.pitchDeg).toBeCloseTo(near.pitchDeg, 6)
  })

  test('a degenerate direction is level and forward, never NaN', () => {
    const a = aimToward(30, { x: 0, y: 0, z: 0 })
    expect(a.yawDeg).toBe(0)
    expect(a.pitchDeg).toBe(0)
  })

  test('clamps to the limits — straight up is not reachable', () => {
    expect(aimToward(0, { x: 0, y: 1, z: 0 }).pitchDeg).toBeCloseTo(-L.pitchUp, 6)
    // Directly behind is 180 of twist, which no spine offers.
    expect(Math.abs(aimToward(0, { x: 0, y: 0, z: -1 }).yawDeg)).toBeCloseTo(
      L.yawMax,
      6
    )
  })
})

describe('aimDirection', () => {
  // A body that can do anything, so the round trip tests the MATHS rather than
  // the clamp. With real limits an unreachable direction cannot come back, and
  // that is the point of the limits — see the test below.
  const free: AimLimits = { yawFree: 180, yawMax: 180, pitchUp: 90, pitchDown: 90 }

  test('round-trips with aimToward, for an aim the body can hold', () => {
    for (const bodyYaw of [0, 37, -120, 179]) {
      for (const dir of [
        { x: 0, y: 0, z: 1 },
        { x: 0.5, y: -0.2, z: 0.8 },
        { x: -0.3, y: 0.1, z: 0.9 },
      ]) {
        const aim = aimToward(bodyYaw, dir, free)
        const back = aimDirection(bodyYaw, aim)
        const len = Math.hypot(dir.x, dir.y, dir.z)
        expect(back.x).toBeCloseTo(dir.x / len, 5)
        expect(back.y).toBeCloseTo(dir.y / len, 5)
        expect(back.z).toBeCloseTo(dir.z / len, 5)
      }
    }
  })

  test('an UNREACHABLE direction does not round-trip, and must not', () => {
    // Behind you is 180 of twist; the body gives 90. `aimToward` answers "the
    // best I can do", so inverting it gives that, not what you asked for.
    const aim = aimToward(0, { x: 0, y: 0, z: -1 })
    const back = aimDirection(0, aim)
    expect(back.z).toBeCloseTo(0, 6)
    expect(Math.abs(back.x)).toBeCloseTo(1, 6)
  })

  test('returns a unit vector', () => {
    const d = aimDirection(45, { yawDeg: 30, pitchDeg: -20 })
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 6)
  })
})

describe('clampAim2', () => {
  test('holds yaw and pitch inside the body limits', () => {
    const a = clampAim2({ yawDeg: 200, pitchDeg: -300 })
    expect(Math.abs(a.yawDeg)).toBeLessThanOrEqual(L.yawMax)
    expect(a.pitchDeg).toBeCloseTo(-L.pitchUp, 6)
  })

  test('up and down are clamped independently', () => {
    const limits: AimLimits = { ...L, pitchUp: 10, pitchDown: 80 }
    expect(clampAim2({ yawDeg: 0, pitchDeg: -50 }, limits).pitchDeg).toBe(-10)
    expect(clampAim2({ yawDeg: 0, pitchDeg: 50 }, limits).pitchDeg).toBe(50)
  })
})

describe('stepAim', () => {
  const level: Aim = { yawDeg: 0, pitchDeg: 0 }

  test('moves at the slew rate, not all at once', () => {
    const a = stepAim(level, { yawDeg: 90, pitchDeg: 0 }, 0.1, { slewDeg: 100 })
    expect(a.yawDeg).toBeCloseTo(10, 6)
  })

  test('arrives, rather than easing toward forever', () => {
    let a = level
    for (let i = 0; i < 10; i++) {
      a = stepAim(a, { yawDeg: 30, pitchDeg: 10 }, 0.1, { slewDeg: 100 })
    }
    expect(a.yawDeg).toBeCloseTo(30, 6)
    expect(a.pitchDeg).toBeCloseTo(10, 6)
  })

  test('takes the short way round the wrap', () => {
    // Wide limits, or the yaw clamp answers before the wrap logic is reached —
    // which is exactly what happened when this test was written against the
    // default body and is why it is worth stating: the clamp is the OUTER
    // guard, and the short-way rule has to be correct underneath it.
    const wide: AimLimits = { ...L, yawFree: 180, yawMax: 180 }
    const a = stepAim(
      { yawDeg: -170, pitchDeg: 0 },
      { yawDeg: 170, pitchDeg: 0 },
      1,
      { slewDeg: 5, limits: wide }
    )
    // 20 degrees to the LEFT, not 340 to the right.
    expect(a.yawDeg).toBeCloseTo(-175, 6)
  })

  test('a slower slew lags further behind a moving target — the skill dial', () => {
    let fast = level
    let slow = level
    for (let i = 1; i <= 20; i++) {
      const target: Aim = { yawDeg: i * 3, pitchDeg: 0 }
      fast = stepAim(fast, target, 0.05, { slewDeg: 400 })
      slow = stepAim(slow, target, 0.05, { slewDeg: 40 })
    }
    const want = 60
    expect(Math.abs(want - fast.yawDeg)).toBeLessThan(Math.abs(want - slow.yawDeg))
    expect(Math.abs(want - slow.yawDeg)).toBeGreaterThan(10)
  })

  test('a zero or negative dt changes nothing', () => {
    const held: Aim = { yawDeg: 12, pitchDeg: -3 }
    expect(stepAim(held, { yawDeg: 80, pitchDeg: 40 }, 0)).toEqual(held)
    expect(stepAim(held, { yawDeg: 80, pitchDeg: 40 }, -1)).toEqual(held)
  })

  test('never steps past the body limits', () => {
    const a = stepAim(level, { yawDeg: 180, pitchDeg: 180 }, 10, { slewDeg: 1000 })
    expect(Math.abs(a.yawDeg)).toBeLessThanOrEqual(L.yawMax)
    expect(a.pitchDeg).toBeLessThanOrEqual(L.pitchDown)
  })
})

describe('bodyCatchUp', () => {
  test('inside the free band the feet stay planted', () => {
    const r = bodyCatchUp(L.yawFree - 1, 1, 180)
    expect(r.bodyTurnDeg).toBe(0)
    expect(r.yawDeg).toBeCloseTo(L.yawFree - 1, 6)
  })

  test('past the free band the body turns, at the rate given', () => {
    const r = bodyCatchUp(70, 0.1, 180)
    expect(r.bodyTurnDeg).toBeCloseTo(18, 6)
    expect(r.yawDeg).toBeCloseTo(52, 6)
  })

  test('turning and twist always agree — they are one decision', () => {
    for (const twist of [-120, -50, -10, 0, 10, 50, 120]) {
      const r = bodyCatchUp(twist, 0.1, 180)
      expect(r.yawDeg + r.bodyTurnDeg).toBeCloseTo(wrapDeg(twist), 6)
    }
  })

  test('it never unwinds past the free band', () => {
    // A huge rate must not spin the body round to face the target exactly —
    // a shooter holding a 5-degree twist forever would jitter with the stick.
    const r = bodyCatchUp(60, 1, 10000)
    expect(r.yawDeg).toBeCloseTo(L.yawFree, 6)
  })

  test('past the hard limit the body is DRAGGED, whatever the rate', () => {
    const slow = bodyCatchUp(150, 0.01, 1)
    expect(Math.abs(slow.yawDeg)).toBeLessThanOrEqual(L.yawMax + 1e-9)
    // And it went the right way.
    expect(slow.bodyTurnDeg).toBeGreaterThan(0)
  })

  test('mirrors for a leftward twist', () => {
    const r = bodyCatchUp(-70, 0.1, 180)
    expect(r.bodyTurnDeg).toBeCloseTo(-18, 6)
    expect(r.yawDeg).toBeCloseTo(-52, 6)
  })

  test('a zero dt turns nothing, even past the limit', () => {
    // The clamp is a rate floor, not a teleport: a paused frame must not snap
    // the body round.
    const r = bodyCatchUp(150, 0, 180)
    expect(r.bodyTurnDeg).toBe(0)
  })

  test('degenerate limits (free above max) do not invert the logic', () => {
    const limits: AimLimits = { ...L, yawFree: 120, yawMax: 60 }
    const r = bodyCatchUp(100, 0.1, 180, limits)
    expect(r.bodyTurnDeg).toBe(0)
  })
})

describe('relaxAim', () => {
  test('unwinds to neutral and stops there', () => {
    let a: Aim = { yawDeg: 40, pitchDeg: -30 }
    for (let i = 0; i < 30; i++) a = relaxAim(a, 0.1, 120)
    expect(a.yawDeg).toBeCloseTo(0, 6)
    expect(a.pitchDeg).toBeCloseTo(0, 6)
  })

  test('does not overshoot through zero', () => {
    const a = relaxAim({ yawDeg: 2, pitchDeg: 0 }, 1, 120)
    expect(a.yawDeg).toBeCloseTo(0, 6)
  })
})

describe('aimPoseWeights', () => {
  test('level is all level', () => {
    expect(aimPoseWeights(0)).toEqual({ up: 0, level: 1, down: 0 })
  })

  test('the weights always sum to 1', () => {
    for (const p of [-90, -40, -1, 0, 1, 40, 90]) {
      const w = aimPoseWeights(p)
      expect(w.up + w.level + w.down).toBeCloseTo(1, 6)
    }
  })

  test('only one of up/down is ever nonzero', () => {
    for (const p of [-30, 30]) {
      const w = aimPoseWeights(p)
      expect(Math.min(w.up, w.down)).toBe(0)
    }
  })

  test('reaches full authority at the limit and holds there', () => {
    expect(aimPoseWeights(-L.pitchUp).up).toBeCloseTo(1, 6)
    expect(aimPoseWeights(-L.pitchUp * 2).up).toBeCloseTo(1, 6)
    expect(aimPoseWeights(L.pitchDown).down).toBeCloseTo(1, 6)
  })

  test('a zero limit degrades to level rather than dividing by it', () => {
    const w = aimPoseWeights(-30, { ...L, pitchUp: 0 })
    expect(w).toEqual({ up: 0, level: 1, down: 0 })
  })
})

describe('aimAuthority', () => {
  test('a forward, level aim needs no layer at all', () => {
    expect(aimAuthority({ yawDeg: 0, pitchDeg: 0 })).toBe(0)
  })

  test('rises with the twist, and saturates at the limit', () => {
    const a = aimAuthority({ yawDeg: L.yawMax / 2, pitchDeg: 0 })
    const b = aimAuthority({ yawDeg: L.yawMax, pitchDeg: 0 })
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(b).toBeCloseTo(1, 6)
    expect(aimAuthority({ yawDeg: 999, pitchDeg: 999 })).toBe(1)
  })

  test('pitch counts as much as yaw — aiming straight down is a real pose', () => {
    expect(aimAuthority({ yawDeg: 0, pitchDeg: L.pitchDown })).toBeCloseTo(1, 6)
  })

  test('up and down are measured against their own limits', () => {
    const limits: AimLimits = { ...L, pitchUp: 20, pitchDown: 80 }
    expect(aimAuthority({ yawDeg: 0, pitchDeg: -20 }, limits)).toBeCloseTo(1, 6)
    expect(aimAuthority({ yawDeg: 0, pitchDeg: 20 }, limits)).toBeCloseTo(0.25, 6)
  })
})

describe('aimWobble', () => {
  test('is deterministic — the same second gives the same miss', () => {
    expect(aimWobble(3.25, 5)).toEqual(aimWobble(3.25, 5))
  })

  test('stays inside its amplitude', () => {
    for (let t = 0; t < 40; t += 0.13) {
      const w = aimWobble(t, 4)
      expect(Math.abs(w.yawDeg)).toBeLessThanOrEqual(4 + 1e-9)
      expect(Math.abs(w.pitchDeg)).toBeLessThanOrEqual(4 + 1e-9)
    }
  })

  test('zero amplitude is exactly still', () => {
    expect(aimWobble(7, 0)).toEqual({ yawDeg: 0, pitchDeg: 0 })
  })

  test('actually wanders — it is not a constant offset', () => {
    const samples = []
    for (let t = 0; t < 6; t += 0.25) samples.push(aimWobble(t, 5).yawDeg)
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(2)
  })

  test('is not a single sine — it does not repeat on its own period', () => {
    // A lone sine at `hz` would match exactly one period later; the second
    // component is what stops the aim reading as a machine sweeping.
    const a = aimWobble(0, 5, 1)
    const b = aimWobble(1, 5, 1)
    expect(Math.abs(a.yawDeg - b.yawDeg)).toBeGreaterThan(0.01)
  })

  test('phase separates two shooters who would otherwise wander in step', () => {
    const a = aimWobble(2, 5, 0.7, 0)
    const b = aimWobble(2, 5, 0.7, 1.9)
    expect(Math.abs(a.yawDeg - b.yawDeg)).toBeGreaterThan(0.01)
  })
})

describe('the whole loop: a shooter tracking a target', () => {
  test('body comes round until the twist is one it can hold', () => {
    /*
    Target dead behind. The first version of this test asserted the body ends up
    facing it — which is the WRONG contract, and the module was right: the body
    stops as soon as the remaining twist is inside `yawFree`, because that is
    what `yawFree` means. It settles at 135 of body and 45 of twist, and the sum
    is what points at the target.

    A body that came all the way round would leave nothing for the shoulders to
    say, and would jitter with the stick at every small correction.
    */
    let bodyYaw = 0
    let aim: Aim = { yawDeg: 0, pitchDeg: 0 }
    for (let i = 0; i < 200; i++) {
      const want = aimToward(bodyYaw, { x: 0, y: 0, z: -1 })
      aim = stepAim(aim, want, 1 / 60, { slewDeg: 240 })
      const caught = bodyCatchUp(aim.yawDeg, 1 / 60, 180)
      bodyYaw = wrapDeg(bodyYaw + caught.bodyTurnDeg)
      aim = { ...aim, yawDeg: caught.yawDeg }
    }
    // The AIM is on the target, which is the thing that matters.
    expect(Math.abs(wrapDeg(bodyYaw + aim.yawDeg - 180))).toBeLessThan(1)
    // The body did most of the work, and stopped where it should.
    expect(Math.abs(aim.yawDeg)).toBeCloseTo(L.yawFree, 1)
    expect(Math.abs(wrapDeg(bodyYaw))).toBeCloseTo(180 - L.yawFree, 1)
  })

  test('a slow shooter is still turning when a fast one has arrived', () => {
    const run = (slewDeg: number, rate: number): number => {
      let bodyYaw = 0
      let aim: Aim = { yawDeg: 0, pitchDeg: 0 }
      for (let i = 0; i < 30; i++) {
        const want = aimToward(bodyYaw, { x: 1, y: 0, z: 0 })
        aim = stepAim(aim, want, 1 / 60, { slewDeg })
        const caught = bodyCatchUp(aim.yawDeg, 1 / 60, rate)
        bodyYaw = wrapDeg(bodyYaw + caught.bodyTurnDeg)
        aim = { ...aim, yawDeg: caught.yawDeg }
      }
      // How far off the target direction (90 degrees) the aim still is.
      return Math.abs(90 - wrapDeg(bodyYaw + aim.yawDeg))
    }
    expect(run(400, 360)).toBeLessThan(run(40, 45))
  })
})
