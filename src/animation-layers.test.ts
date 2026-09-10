import { describe, test, expect, beforeAll } from 'bun:test'

/*
DRIVEN AGAINST THE REAL RIG, not a synthetic one.

Bone naming is the seam this is most likely to fail on — `mixamorig:Spine2` is
not `spine_02` and neither is `Spine1` — so a test on invented bones would pass
while the thing it stands for animated nothing. `omnidude.glb` is 41 Mixamo
bones and sixteen clips, which is exactly the awkward case.
*/

let B: typeof import('@babylonjs/core')
let AL: typeof import('./animation-layers.js')
let BM: typeof import('./bone-mask.js')
let scene: import('@babylonjs/core').Scene
let loaded: {
  skeletons: import('@babylonjs/core').Skeleton[]
  animationGroups: import('@babylonjs/core').AnimationGroup[]
}

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
  B = await import('@babylonjs/core')
  await import('@babylonjs/loaders/glTF/index.js')
  AL = await import('./animation-layers.js')
  BM = await import('./bone-mask.js')
  scene = new B.Scene(new B.NullEngine())
  const fs = await import('node:fs')
  const data = fs.readFileSync('static/omnidude.glb')
  const b64 = 'data:model/gltf-binary;base64,' + data.toString('base64')
  loaded = (await B.SceneLoader.ImportMeshAsync(
    '',
    '',
    b64,
    scene,
    undefined,
    '.glb'
  )) as never
}, 60000)

const clip = (name: string) =>
  loaded.animationGroups.find((g) => g.name === name)!

describe('the rig, read as names and parents', () => {
  test('the hierarchy comes out whole', () => {
    const bones = AL.boneHierarchy(loaded.skeletons[0])
    expect(bones.length).toBe(41)
    expect(bones.find((b) => b.name === 'mixamorig:Hips')?.parent).toBeNull()
    expect(bones.find((b) => b.name === 'mixamorig:Spine1')?.parent).toBe(
      'mixamorig:Spine'
    )
  })

  test('the shipped root spellings find a Mixamo spine', () => {
    // The whole reason `findBone` does suffix matching: nothing in
    // UPPER_BODY_ROOTS is spelled `mixamorig:Spine2`.
    const bones = AL.boneHierarchy(loaded.skeletons[0])
    const root = BM.findBone(bones, BM.UPPER_BODY_ROOTS)
    expect(root).toBe('mixamorig:Spine2')
  })
})

describe('layering walk under wave', () => {
  test('it splits into weight tiers, and the ramp is there', () => {
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    expect(l).toBeTruthy()
    // falloff 2 → weights 1/3, 2/3, 1 on the layer; complements on the base.
    const weights = l.layer.map((t) => t.weight).sort((a, b) => a - b)
    expect(weights).toEqual([0.33, 0.67, 1])
    l.dispose()
  })

  test('the LEGS are untouched by the layer and fully the base', () => {
    /*
    The property that makes it walk-and-aim rather than two animations: the
    lower body must be entirely locomotion.
    */
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    const inLayer = new Set(
      l.layer.flatMap((t) =>
        t.group.targetedAnimations.map((ta) => (ta.target as any).name)
      )
    )
    for (const leg of [
      'mixamorig:LeftUpLeg',
      'mixamorig:RightFoot',
      'mixamorig:Hips',
    ]) {
      expect(inLayer.has(leg), leg).toBe(false)
    }
    const fullBase = l.base.find((t) => t.weight === 1)!
    const names = new Set(
      fullBase.group.targetedAnimations.map((ta) => (ta.target as any).name)
    )
    expect(names.has('mixamorig:Hips')).toBe(true)
    l.dispose()
  })

  test('the ARMS are fully the layer', () => {
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    const full = l.layer.find((t) => t.weight === 1)!
    const names = new Set(
      full.group.targetedAnimations.map((ta) => (ta.target as any).name)
    )
    expect(names.has('mixamorig:RightHand')).toBe(true)
    expect(names.has('mixamorig:Head')).toBe(true)
    l.dispose()
  })

  test('the SPINE is shared — feathered on both sides of the boundary', () => {
    // Where a hard cut would kink. Spine2 appears in both, at complementary
    // weights, so the twist is distributed.
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    const at = (tiers: typeof l.base, bone: string) =>
      tiers.find((t) =>
        t.group.targetedAnimations.some(
          (ta) => (ta.target as any).name === bone
        )
      )?.weight
    const inLayer = at(l.layer, 'mixamorig:Spine2')
    const inBase = at(l.base, 'mixamorig:Spine2')
    expect(inLayer).toBeCloseTo(0.33, 2)
    expect(inBase).toBeCloseTo(0.67, 2)
    // Complementary, so no bone is over- or under-driven.
    expect(inLayer! + inBase!).toBeCloseTo(1, 2)
    l.dispose()
  })

  test('NO BONE STOPS MOVING — every target is still driven by something', () => {
    /*
    The partition property that matters. Zero-weight tiers are dropped on
    purpose (a group driving nothing still costs a play call and reads in a
    debugger as though it were running), so the two halves do NOT sum to the two
    clips' animation counts — each contributes only the bones it owns.

    What must hold is that no bone falls out of both. A dropped target is a limb
    that simply freezes, which reads as a bad clip rather than as a partition
    bug, and would be invisible in every other assertion here.
    */
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    const namesIn = (tiers: typeof l.base) =>
      new Set(
        tiers.flatMap((t) =>
          t.group.targetedAnimations.map((ta) => (ta.target as any).name)
        )
      )
    const driven = new Set([...namesIn(l.base), ...namesIn(l.layer)])
    const sourceNames = new Set(
      clip('walk').targetedAnimations.map((ta) => (ta.target as any).name)
    )
    for (const n of sourceNames) expect(driven.has(n), `${n} froze`).toBe(true)
    expect(driven.size).toBe(sourceNames.size)
    l.dispose()
  })

  test('nothing in the mask goes undriven on this rig', () => {
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    expect(l.unmatched).toEqual([])
    l.dispose()
  })

  test('the source groups are NOT consumed', () => {
    // The tiers are new groups over the same animations, so `walk` is still
    // usable on its own afterwards.
    const before = clip('walk').targetedAnimations.length
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave')
    )!
    l.dispose()
    expect(clip('walk').targetedAnimations.length).toBe(before)
  })
})

describe('refusing, rather than animating air', () => {
  test('an unfindable root returns null', () => {
    /*
    The failure this seam is prone to. A mask over a bone nobody has drives
    nothing, silently, and identically to a clip that did not load — so the
    answer is a refusal the caller must handle, not an empty layering.
    */
    const l = AL.layerOnUpperBody(
      scene,
      loaded.skeletons[0],
      clip('walk'),
      clip('wave'),
      { roots: ['definitely_not_a_bone'] }
    )
    expect(l).toBeNull()
  })

  test('a mask naming bones the clips ignore is REPORTED', () => {
    const bones = AL.boneHierarchy(loaded.skeletons[0])
    const mask = BM.boneMask(bones, { root: 'mixamorig:Spine2' })
    mask.set('invented_bone', 1)
    const l = AL.layerGroups(scene, clip('walk'), clip('wave'), mask)
    expect(l.unmatched).toContain('invented_bone')
    l.dispose()
  })
})
