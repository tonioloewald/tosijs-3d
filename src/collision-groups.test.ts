import { describe, test, expect, beforeAll } from 'bun:test'

/*
ONE MESH, TWO ANSWERS.

tosijs-3d-ensemble put the bind exactly: *"the aircraft should not treat water
as ground" and "shells should splash on water" are the same switch* (#44). Both
went through `collidable()`, which offered a single global notion of solid — so
a flying submarine had to choose between crashing on the sea surface and having
ordnance that passes through it invisibly. Their workaround, clearing
`isPickable` on the sea, buys the first and loses the second for every consumer
of the predicate.

Groups move the answer from the MESH to the ASKER. The sea says what it is; each
mover says what it treats as solid, so the same mesh answers differently on the
same frame for a seaplane and a submarine.
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

const mesh = (name: string) => new BABYLON.Mesh(name, scene)

describe('collision groups', () => {
  test('an untagged mesh is in no group, and every probe still hits it', () => {
    const m = mesh('rock')
    expect(U.collisionGroups(m)).toEqual([])
    expect(U.collidable()(m)).toBe(true)
    expect(U.collidable(undefined, { ignoreGroups: ['water'] })(m)).toBe(true)
  })

  test('THE REPORTED CASE — one sea, two answers on the same frame', () => {
    const sea = mesh('water')
    U.markCollisionGroup(sea, 'water')
    // the submarine: water is not ground
    const sub = U.collidable(undefined, { ignoreGroups: ['water'] })
    // the shell: water is a thing to splash on
    const shell = U.collidable()
    expect(sub(sea)).toBe(false)
    expect(shell(sea)).toBe(true)
  })

  test('a seaplane and a submarine coexist — the case no per-element flag covers', () => {
    const sea = mesh('water')
    U.markCollisionGroup(sea, 'water')
    expect(U.collidable()(sea)).toBe(true) // seaplane: sea is ground
    expect(U.collidable(undefined, { ignoreGroups: ['water'] })(sea)).toBe(
      false
    )
  })

  test('groups are ADDITIVE — a mesh can be several things at once', () => {
    const hull = mesh('hull')
    U.markCollisionGroup(hull, 'vehicle')
    U.markCollisionGroup(hull, 'target')
    expect([...U.collisionGroups(hull)].sort()).toEqual(['target', 'vehicle'])
    expect(U.inCollisionGroup(hull, ['target'])).toBe(true)
    expect(U.inCollisionGroup(hull, ['water'])).toBe(false)
  })

  test('tagging twice does not duplicate', () => {
    const m = mesh('m')
    U.markCollisionGroup(m, 'water')
    U.markCollisionGroup(m, 'water')
    expect(U.collisionGroups(m)).toEqual(['water'])
  })

  test('it composes with the existing UI exclusion rather than replacing it', () => {
    const panel = mesh('panel')
    U.markUiMesh(panel)
    U.markCollisionGroup(panel, 'ui')
    // still excluded by the ORIGINAL rule, groups or not
    expect(U.collidable()(panel)).toBe(false)
  })

  test('and with the reject hook', () => {
    const sea = mesh('water')
    U.markCollisionGroup(sea, 'water')
    const own = mesh('own')
    const p = U.collidable((m) => m === own, { ignoreGroups: ['water'] })
    expect(p(own)).toBe(false)
    expect(p(sea)).toBe(false)
    expect(p(mesh('terrain'))).toBe(true)
  })

  test('ignoring several groups at once', () => {
    const sea = mesh('water')
    U.markCollisionGroup(sea, 'water')
    const p = U.collidable(undefined, { ignoreGroups: ['water', 'cloud'] })
    expect(p(sea)).toBe(false)
  })
})
