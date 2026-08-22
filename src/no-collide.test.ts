import { describe, test, expect, beforeAll } from 'bun:test'

/*
UI IS POINTER-PICKABLE BUT COLLISION-INVISIBLE.

Two different questions that shared one answer (`isPickable`) until a spatial
panel floating in front of the cockpit was picked as terrain by the aircraft's
impact sweep — which crashes on ANY hit above `crashSpeed`. The instrument named
it outright: `hit=frame-panel`.

A panel MUST stay pickable (that is how a controller ray or gaze cursor targets
it), so the exclusion cannot be `isPickable = false`. See COLLISION-DESIGN.md.
*/
let BABYLON: typeof import('@babylonjs/core')
let markUiMesh: typeof import('./b3d-utils').markUiMesh
let isNoCollide: typeof import('./b3d-utils').isNoCollide
let scene: import('@babylonjs/core').Scene

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
  const utils = await import('./b3d-utils')
  markUiMesh = utils.markUiMesh
  isNoCollide = utils.isNoCollide
  scene = new BABYLON.Scene(new BABYLON.NullEngine())
})

describe('collision exclusion for UI', () => {
  test('a marked mesh is excluded from collision but stays pickable', () => {
    const panel = BABYLON.MeshBuilder.CreatePlane('frame-panel', {}, scene)
    markUiMesh(panel)
    expect(isNoCollide(panel)).toBe(true)
    // The whole point: pointers must still hit it.
    expect(panel.isPickable).toBe(true)
  })

  test('an ordinary mesh is collidable', () => {
    expect(isNoCollide(BABYLON.MeshBuilder.CreateBox('rock', {}, scene))).toBe(
      false
    )
  })

  test('marking preserves existing metadata', () => {
    const m = BABYLON.MeshBuilder.CreatePlane('p', {}, scene)
    m.metadata = { b3dWater: true }
    markUiMesh(m)
    expect((m.metadata as any).b3dWater).toBe(true)
    expect(isNoCollide(m)).toBe(true)
  })

  test('unrelated metadata does not exclude a mesh', () => {
    const m = BABYLON.MeshBuilder.CreateBox('b', {}, scene)
    m.metadata = { somethingElse: 1 }
    expect(isNoCollide(m)).toBe(false)
  })
})
