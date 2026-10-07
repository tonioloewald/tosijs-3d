import { describe, test, expect, beforeAll } from 'bun:test'

/*
A BLAST AND A MODEL'S OWN HULL (board #2906, from manta-recon).

A library model registers its ROOT as the destroyable, and the root is a
TransformNode: the thing a ray can actually hit is a child mesh. `hasLos`
exempted only the registered roots, so the ray from a blast to a target's
origin was stopped by the target's own hull, and an aircraft with
`destroyable="on"` never took blast damage from anything.
*/

let BABYLON: typeof import('@babylonjs/core')
let scene: import('@babylonjs/core').Scene
let detonateWarhead: typeof import('./b3d-warhead.js').detonateWarhead
let DestroyableBehavior: typeof import('./destroyable-behavior.js').DestroyableBehavior
let CombatWorld: typeof import('./destroyable.js').CombatWorld

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
  ;({ detonateWarhead } = await import('./b3d-warhead.js'))
  ;({ DestroyableBehavior } = await import('./destroyable-behavior.js'))
  ;({ CombatWorld } = await import('./destroyable.js'))
  const engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})

/** A model the way a library hands it over: an empty root, the hull beneath. */
function libraryModel(name: string, x: number) {
  const root = new BABYLON.TransformNode(name, scene)
  root.position.set(x, 0, 0)
  const hull = BABYLON.MeshBuilder.CreateBox(`${name}_mesh`, { size: 2 }, scene)
  hull.parent = root
  hull.isPickable = true
  root.computeWorldMatrix(true)
  hull.computeWorldMatrix(true)
  return { root, hull }
}

function setup() {
  const owner = { scene, combat: new CombatWorld() } as any
  const { root, hull } = libraryModel('manta', 4)
  const behavior = new DestroyableBehavior(
    owner,
    { mesh: root as any, dispatchEvent: () => true },
    { capacity: 100 }
  )
  behavior.attach()
  const health = () => owner.combat.get(behavior.combatId)?.hp.value as number
  return { owner, root, hull, behavior, health }
}

const spec = { damage: 10, fullRadius: 2, blastRadius: 7 }
const settle = () => new Promise((r) => setTimeout(r, 450))

describe('blast line of sight', () => {
  test("a target's own hull does not shield it from a blast", async () => {
    const { owner, behavior, health, root, hull } = setup()
    const before = health()
    detonateWarhead(owner, new BABYLON.Vector3(0, 0, 0), spec)
    await settle()
    expect(health()).toBeLessThan(before)
    behavior.dispose()
    hull.dispose()
    root.dispose()
  })

  test('a wall between them still does', async () => {
    const { owner, behavior, health, root, hull } = setup()
    const wall = BABYLON.MeshBuilder.CreateBox(
      'wall',
      { width: 0.2, height: 6, depth: 6 },
      scene
    )
    wall.position.set(1.5, 0, 0)
    wall.isPickable = true
    wall.computeWorldMatrix(true)
    const before = health()
    detonateWarhead(owner, new BABYLON.Vector3(0, 0, 0), spec)
    await settle()
    expect(health()).toBe(before)
    behavior.dispose()
    wall.dispose()
    hull.dispose()
    root.dispose()
  })

  test("another target's hull is not cover either", async () => {
    // "Cubes don't shadow each other from a blast" has to hold for models too.
    const { owner, behavior, health, root, hull } = setup()
    const other = libraryModel('escort', 2)
    const escort = new DestroyableBehavior(
      owner,
      { mesh: other.root as any, dispatchEvent: () => true },
      { capacity: 100 }
    )
    escort.attach()
    const before = health()
    detonateWarhead(owner, new BABYLON.Vector3(0, 0, 0), spec)
    await settle()
    expect(health()).toBeLessThan(before)
    behavior.dispose()
    escort.dispose()
    other.hull.dispose()
    other.root.dispose()
    hull.dispose()
    root.dispose()
  })
})
