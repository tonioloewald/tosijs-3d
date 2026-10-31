import { beforeAll, describe, expect, test } from 'bun:test'

let BABYLON: typeof import('@babylonjs/core')
let P: typeof import('./light-pool.js')
let Q: typeof import('./b3d-quality.js')

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
  P = await import('./light-pool.js')
  Q = await import('./b3d-quality.js')
})

function world() {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const cam = new BABYLON.FreeCamera('eye', new BABYLON.Vector3(0, 2, 0), scene)
  scene.activeCamera = cam
  return scene
}

const lamp = (x: number, level = 1): import('./light-pool.js').VirtualLight => ({
  position: new BABYLON.Vector3(x, 5, 0),
  direction: new BABYLON.Vector3(0, -1, 0),
  angle: 2,
  color: new BABYLON.Color3(1, 0.8, 0.5),
  intensity: 2,
  range: 20,
  level,
})

/** Run the pool for a while (it fades lights in over a sixth of a second). */
function settle(scene: import('@babylonjs/core').Scene) {
  for (let i = 0; i < 40; i++) scene.render()
}

const lit = (scene: import('@babylonjs/core').Scene) =>
  scene.lights.filter((l) => /lamp-pool/.test(l.name) && l.isEnabled()) as import('@babylonjs/core').SpotLight[]

describe('the lamp pool', () => {
  test('many lamps, a budget of real lights, the nearest win', () => {
    const scene = world()
    const pool = P.lightPool(scene)
    const lamps = [-60, -30, -8, -4, 3, 7, 12, 25, 40, 80].map((x) => lamp(x))
    lamps.forEach((l) => pool.add(l))
    settle(scene)
    const budget = Q.qualityBudgets().lampLights
    const on = lit(scene)
    expect(on.length).toBe(budget)
    // Each real light sits on one of the nearest lamps.
    const nearest = [...lamps].sort((a, b) => Math.abs(a.position.x) - Math.abs(b.position.x)).slice(0, budget)
    for (const l of on) expect(nearest.some((n) => n.position.equals(l.position))).toBe(true)
    scene.dispose()
  })

  test('a lamp turned down gets no light, and the pool lets it go', () => {
    const scene = world()
    const pool = P.lightPool(scene)
    const a = lamp(2)
    pool.add(a)
    settle(scene)
    expect(lit(scene).length).toBe(1)
    a.level = 0
    settle(scene)
    expect(lit(scene).length).toBe(0)
    scene.dispose()
  })

  test('removing a lamp frees its light', () => {
    const scene = world()
    const release = P.lightPool(scene).add(lamp(1))
    settle(scene)
    expect(lit(scene).length).toBe(1)
    release()
    settle(scene)
    expect(lit(scene).length).toBe(0)
    scene.dispose()
  })

  test('lit materials are raised to take the extra lights', async () => {
    const scene = world()
    const before = new BABYLON.StandardMaterial('before', scene)
    P.lightPool(scene).add(lamp(0))
    const after = new BABYLON.StandardMaterial('after', scene)
    // Babylon announces a new material on the next tick.
    await new Promise((r) => setTimeout(r, 0))
    const want = Q.qualityBudgets().lampLights + 3
    expect(before.maxSimultaneousLights).toBeGreaterThanOrEqual(want)
    expect(after.maxSimultaneousLights).toBeGreaterThanOrEqual(want)
    scene.dispose()
  })
})

describe('lamps and daylight', () => {
  test('off by day, up through dusk, full at night', () => {
    expect(P.lampLevel(1)).toBe(0)
    expect(P.lampLevel(0.5)).toBe(0)
    expect(P.lampLevel(0.3)).toBeGreaterThan(0)
    expect(P.lampLevel(0.3)).toBeLessThan(1)
    expect(P.lampLevel(0)).toBe(1)
  })
})
