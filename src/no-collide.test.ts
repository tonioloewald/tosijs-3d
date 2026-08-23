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
let collidable: typeof import('./b3d-utils').collidable
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
  collidable = utils.collidable
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

/*
`collidable()` is the DEFAULT-EXCLUDE predicate every physical pick goes
through. The polarity is the point: `isNoCollide` shipped as an opt-out clause
each site had to remember, and two of the four sites (the launcher's shell ray
and the warhead's line-of-sight) had already forgotten it — so a panel stopped
shells and gave blast cover.
*/
describe('collidable() — the shared pick predicate', () => {
  const box = (name: string) =>
    BABYLON.MeshBuilder.CreateBox(name, {}, scene)

  test('ordinary meshes pass', () => {
    expect(collidable()(box('rock'))).toBe(true)
  })

  test('UI is excluded with NO argument — you opt in, never out', () => {
    const panel = box('panel')
    markUiMesh(panel)
    expect(collidable()(panel)).toBe(false)
  })

  test('an UNREVEALED panel is still excluded — visibility 0 stays pickable', () => {
    // frame-panel gaze-hides with visibility, not isPickable, so without the UI
    // rule an invisible panel is an invisible bullet shield.
    const panel = box('gaze-panel')
    markUiMesh(panel)
    panel.visibility = 0
    expect(panel.isPickable).toBe(true)
    expect(collidable()(panel)).toBe(false)
  })

  test('non-pickable and disabled are re-checked centrally', () => {
    // Babylon SKIPS its own isPickable/isEnabled filter when a predicate is
    // passed — the trap that had an aircraft pick a cloud as ground.
    const cloud = box('cloud')
    cloud.isPickable = false
    expect(collidable()(cloud)).toBe(false)

    const off = box('disabled')
    off.setEnabled(false)
    expect(collidable()(off)).toBe(false)
  })

  test('reject handles the caller\'s own business, and composes', () => {
    const self = box('self')
    const other = box('other')
    const pred = collidable((m) => m === self)
    expect(pred(self)).toBe(false)
    expect(pred(other)).toBe(true)
  })
})
