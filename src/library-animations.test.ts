import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'fs'

// cloneNodeAnimations against the REAL test-3.glb (Tonio's animated scout:
// "Cockpit Open" + three gear-retract groups). node.clone() leaves
// AnimationGroups behind on the container targeting the ORIGINAL nodes — the
// bug this pins is "library-spawned scout's cockpit animates silently on a
// mesh nobody can see".

let BABYLON: typeof import('@babylonjs/core')
let cloneNodeAnimations: typeof import('./b3d-library').cloneNodeAnimations
let scene: import('@babylonjs/core').Scene
let container: import('@babylonjs/core').AssetContainer

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
  await import('@babylonjs/loaders')
  cloneNodeAnimations = (await import('./b3d-library')).cloneNodeAnimations
  const engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
  const b64 = readFileSync('static/test-3.glb').toString('base64')
  container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    '',
    'data:;base64,' + b64,
    scene,
    undefined,
    '.glb'
  )
})

const scoutSource = () =>
  [...container.transformNodes, ...container.meshes].find(
    (n) => n.name === 'scout' || n.name === 'scout.model'
  )!

describe('cloneNodeAnimations (the animated-scout path)', () => {
  test('the scout instance gets its four groups, retargeted INTO the clone', () => {
    const source = scoutSource()
    const clone = source.clone('scout_instance_0', null)!
    const groups = cloneNodeAnimations(
      container,
      source,
      clone,
      'scout_instance_0'
    )

    const names = groups.map((g) => g.name).sort()
    expect(names).toEqual([
      'Cockpit Open::scout_instance_0',
      'Main Gear (L) Retract::scout_instance_0',
      'Main Gear (R) Retract::scout_instance_0',
      'Nose Gear Retract::scout_instance_0',
    ])

    // every target is a node INSIDE the clone subtree — never an original
    const cloneNodes = new Set<unknown>([clone, ...clone.getDescendants()])
    for (const g of groups)
      for (const t of g.targetedAnimations) {
        expect(cloneNodes.has(t.target)).toBe(true)
      }
    groups.forEach((g) => g.dispose())
    clone.dispose()
  })

  test('scene-level animations do NOT travel with the scout', () => {
    // "Animation" targets the mirror cube — outside the scout subtree.
    const source = scoutSource()
    const clone = source.clone('scout_instance_1', null)!
    const groups = cloneNodeAnimations(
      container,
      source,
      clone,
      'scout_instance_1'
    )
    expect(groups.some((g) => g.name.startsWith('Animation'))).toBe(false)
    groups.forEach((g) => g.dispose())
    clone.dispose()
  })

  test('two instances animate independently (distinct groups, distinct targets)', () => {
    const source = scoutSource()
    const a = source.clone('a', null)!
    const b = source.clone('b', null)!
    const ga = cloneNodeAnimations(container, source, a, 'a')
    const gb = cloneNodeAnimations(container, source, b, 'b')
    const cockpitA = ga.find((g) => g.name.startsWith('Cockpit'))!
    const cockpitB = gb.find((g) => g.name.startsWith('Cockpit'))!
    expect(cockpitA).not.toBe(cockpitB)
    expect(cockpitA.targetedAnimations[0].target).not.toBe(
      cockpitB.targetedAnimations[0].target
    )
    ;[...ga, ...gb].forEach((g) => g.dispose())
    a.dispose()
    b.dispose()
  })
})
