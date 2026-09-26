import { describe, test, expect, beforeAll } from 'bun:test'

/*
#1125: WEATHER REACHES THE AIRFRAME. The pure buffeting lives in
`fly-by-wire.turbulence` (tested there); this pins the BRIDGE — that the
aircraft asks the scene for the weather where it is, is shaken by a storm,
carried by the wind, left alone in calm air, and switchable off. Same
NullEngine + duck-typed owner harness as `aircraft-chase.test.ts`.
*/

let A: typeof import('./b3d-aircraft.js')
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
  g.document ??= win.document
  BABYLON = await import('@babylonjs/core')
  A = await import('./b3d-aircraft.js')
})

const EMPTY = {
  forward: 0,
  strafe: 0,
  turn: 0,
  pitch: 0,
  throttle: 0,
  jump: false,
  shoot: false,
  sprint: false,
  interact: false,
  cameraZoom: 0,
  lookX: 0,
  lookY: 0,
  aim: false,
  lift: 0,
} as any

type Weather = {
  wind: { x: number; z: number }
  storminess: number
  precipitation: number
  coverage: number
  temperature: number
}

const CALM: Weather = {
  wind: { x: 0, z: 0 },
  storminess: 0,
  precipitation: 0,
  coverage: 0,
  temperature: 0,
}

const aloft = (weather: Weather, attrs: Record<string, unknown> = {}) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const el = A.b3dAircraft({}) as any
  // Never connected, so the attribute defaults are never drained: seed them.
  const defaults = (A.B3dAircraft as any).initAttributes
  for (const k of Object.keys(defaults))
    if (el[k] === undefined) el[k] = defaults[k]
  Object.assign(el, { weapons: 'off', ...attrs })
  let elapsed = 0
  el.owner = {
    scene,
    register: () => {},
    addSceneListener: () => {},
    whenReady: (cb: () => void) => cb(),
    addDebugSource: () => () => {},
    addOriginListener: () => {},
    removeOriginListener: () => {},
    shiftOrigin: () => {},
    insideCavity: () => false,
    weatherAt: () => weather,
    frameInfo: () => ({ elapsed }),
  }
  const node = new BABYLON.TransformNode('plane', scene)
  node.rotationQuaternion = BABYLON.Quaternion.Identity()
  node.position.y = 500
  el.meshNode = node
  el.mesh = node
  return {
    el,
    node,
    /** `n` frames with the sticks centred; returns the bank at each. */
    fly(n: number, dt = 1 / 60): number[] {
      const banks: number[] = []
      for (let i = 0; i < n; i++) {
        elapsed += dt
        el.applyInput({ ...EMPTY }, dt)
        banks.push(el.fbw.bank)
      }
      return banks
    },
  }
}

const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs)

describe('weather reaches the airframe (#1125)', () => {
  test('calm air: no turbulence, the attitude holds', () => {
    const f = aloft(CALM)
    const banks = f.fly(120)
    expect(f.el.turbulenceLevel).toBe(0)
    expect(spread(banks)).toBeLessThan(1e-6)
  })

  test('a storm shakes it: the level rises and the bank moves', () => {
    const f = aloft({ ...CALM, storminess: 1 })
    const banks = f.fly(120)
    expect(f.el.turbulenceLevel).toBeCloseTo(1, 6)
    expect(spread(banks)).toBeGreaterThan(0.005)
  })

  test('turbulence="off" ignores the storm', () => {
    const f = aloft({ ...CALM, storminess: 1 }, { turbulence: 'off' })
    const banks = f.fly(120)
    expect(f.el.turbulenceLevel).toBe(0)
    expect(spread(banks)).toBeLessThan(1e-6)
  })

  test('turbulenceScale dials it', () => {
    const f = aloft({ ...CALM, storminess: 1 }, { turbulenceScale: 0.25 })
    f.fly(10)
    expect(f.el.turbulenceLevel).toBeCloseTo(0.25, 6)
  })

  test('the wind carries it: a crosswind drifts the craft downwind', () => {
    const still = aloft(CALM)
    const windy = aloft(
      { ...CALM, wind: { x: 10, z: 0 } },
      { turbulenceScale: 0 }
    )
    still.fly(180)
    windy.fly(180)
    expect(windy.node.position.x - still.node.position.x).toBeGreaterThan(1)
  })
})
