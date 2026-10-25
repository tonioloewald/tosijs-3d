import { describe, test, expect, beforeAll } from 'bun:test'

/*
A NODE MUST NOT BECOME ITS OWN ANCESTOR (#3135).

Babylon accepts the parent, and the next `setEnabled` or `dispose` on the loop
recurses until the stack runs out, which hung a Quest. Its hand tracking
parents the TOPMOST ancestor of the hand mesh beneath the XR camera's parent
(our rig). With the rig riding a vehicle, that topmost ancestor is the vehicle
or its chase anchor, so guarding the rig alone was not enough: the aircraft
was parented beneath the rig, twice in one evening's flying.
*/

let U: typeof import('./b3d-utils.js')
let BABYLON: typeof import('@babylonjs/core')
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
  U = await import('./b3d-utils.js')
  scene = new BABYLON.Scene(new BABYLON.NullEngine())
})

describe('refuseOwnAncestors', () => {
  test('a rig riding a vehicle: the vehicle cannot be parented beneath the rig', () => {
    const anchor = new BABYLON.TransformNode('chase-anchor', scene)
    const rig = new BABYLON.TransformNode('xr-rig', scene)
    rig.parent = anchor
    U.refuseOwnAncestors(rig)
    // What hand tracking does with the topmost ancestor of a hand under the rig.
    anchor.parent = rig
    expect(anchor.parent).toBeNull()
    expect(rig.parent).toBe(anchor)
  })

  test('a deeper chain is guarded all the way up', () => {
    const hull = new BABYLON.TransformNode('hull', scene)
    const seat = new BABYLON.TransformNode('seat', scene)
    const rig = new BABYLON.TransformNode('xr-rig-2', scene)
    seat.parent = hull
    rig.parent = seat
    U.refuseOwnAncestors(rig)
    hull.parent = rig
    expect(hull.parent).toBeNull()
  })

  test('an ordinary reparent still works, and guarding twice is harmless', () => {
    const a = new BABYLON.TransformNode('a', scene)
    const b = new BABYLON.TransformNode('b', scene)
    const c = new BABYLON.TransformNode('c', scene)
    U.refuseOwnAncestors(a)
    U.refuseOwnAncestors(a)
    a.parent = b
    expect(a.parent).toBe(b)
    a.parent = c
    expect(a.parent).toBe(c)
    a.parent = null
    expect(a.parent).toBeNull()
  })
})
