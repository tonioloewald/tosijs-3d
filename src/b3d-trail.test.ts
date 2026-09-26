import { describe, expect, test, beforeAll } from 'bun:test'

let BABYLON: typeof import('@babylonjs/core')
let attachTrail: typeof import('./b3d-trail.js').attachTrail

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
  attachTrail = (await import('./b3d-trail.js')).attachTrail
})

/*
The trail's behaviour, without a GPU: it measures speed at its OWN emitter
(so it works on anything that moves, not just aircraft), fades rather than
snapping, and takes the underwater tint below the surface it is told about.
*/
describe('attachTrail (board #186)', () => {
  const rig = (waterY: number | null = null) => {
    const scene = new BABYLON.Scene(new BABYLON.NullEngine())
    const node = new BABYLON.TransformNode('host', scene)
    const trail = attachTrail(node, scene, {
      offset: [0, 0, -1],
      minSpeed: 5,
      alpha: 0.5,
      color: '#ffffff',
      underwaterColor: '#00ff00',
      waterY: () => waterY,
    })
    const mat = trail.mesh
      .material as import('@babylonjs/core').StandardMaterial
    const step = (dx: number, n = 1) => {
      for (let i = 0; i < n; i++) {
        node.position.x += dx
        trail.update(1 / 60)
      }
    }
    return { scene, node, trail, mat, step }
  }

  test('fast: fades IN to full alpha; slow: fades back OUT', () => {
    const r = rig()
    r.step(0.5, 30) // 30 m/s
    expect(r.mat.alpha).toBeCloseTo(0.5, 2)
    expect(r.trail.mesh.isVisible).toBe(true)
    r.step(0.01, 30) // 0.6 m/s, under minSpeed
    expect(r.mat.alpha).toBeLessThan(0.01)
    expect(r.trail.mesh.isVisible).toBe(false)
  })

  test('the fade takes time — one fast frame does not pop it to full', () => {
    const r = rig()
    r.step(0.5, 1)
    r.step(0.5, 1)
    expect(r.mat.alpha).toBeGreaterThan(0)
    expect(r.mat.alpha).toBeLessThan(0.5)
  })

  test('below the water it takes the underwater colour', () => {
    const above = rig(-10)
    above.step(0.5, 5)
    expect(above.mat.emissiveColor.toHexString()).toBe('#FFFFFF')
    const below = rig(10)
    below.step(0.5, 5)
    expect(below.mat.emissiveColor.toHexString()).toBe('#00FF00')
  })

  test('dispose removes the ribbon, its material and its emitter', () => {
    const r = rig()
    const before = r.scene.transformNodes.length
    r.trail.dispose()
    expect(r.trail.mesh.isDisposed()).toBe(true)
    expect(r.scene.transformNodes.length).toBe(before - 1)
  })
})
