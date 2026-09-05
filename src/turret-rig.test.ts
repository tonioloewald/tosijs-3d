import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE MODEL DECLARES ITS OWN MOVING PARTS.

Neither `b3d-turret` nor `b3d-launcher` took a `library`, so a piece that IS a
turret rendered as a cylinder and a box (#34). Adding the attribute is trivial;
making it AIM is the part that needed a decision, because the element rotates a
node it built and a library model has no such node.

Ensemble weighed a naming suffix against a `barrelNode="…"` attribute and landed
on the suffix, for the reason `_centerOfGravity` already established: a rigger
declares moving parts in Blender, where they can see the geometry. Putting model
structure in the scene markup is what these conventions exist to avoid.

`_barrel` and `_muzzle` are SEPARATE questions — the barrel is what rotates, the
muzzle is where the round leaves. Identical on a simple gun, different on a
multi-barrel mount or anything with a recoiling breech.

Returning null is a valid answer: no `_barrel` means the model yaws as a unit,
which is right for a simple turret and lets a model work before anyone rigs it.
*/

let BABYLON: typeof import('@babylonjs/core')
let MT: typeof import('./model-transform.js')
let scene: import('@babylonjs/core').Scene

beforeAll(async () => {
  BABYLON = await import('@babylonjs/core')
  MT = await import('./model-transform.js')
  scene = new BABYLON.Scene(new BABYLON.NullEngine())
})

const rig = (...names: string[]) => {
  const root = new BABYLON.TransformNode('turret', scene)
  for (const n of names) new BABYLON.TransformNode(n, scene).parent = root
  return root
}

describe('finding the parts', () => {
  test('a rigged barrel is found', () => {
    expect(MT.findBarrel(rig('base', 'gun_barrel'))?.name).toBe('gun_barrel')
  })

  test('an UNRIGGED model returns null — it yaws as a unit', () => {
    // Not a failure. It is what lets a placed model work before rigging.
    expect(MT.findBarrel(rig('base', 'gun'))).toBe(null)
  })

  test('barrel and muzzle are independent', () => {
    const root = rig('base', 'gun_barrel', 'tip_muzzle')
    expect(MT.findBarrel(root)?.name).toBe('gun_barrel')
    expect(MT.findMuzzle(root)?.name).toBe('tip_muzzle')
  })

  test('a gun with only a barrel has no muzzle — the caller falls back', () => {
    expect(MT.findMuzzle(rig('base', 'gun_barrel'))).toBe(null)
  })

  test('it composes with `.model`, like every other suffix', () => {
    // `conventionName` drops `.model` before suffix checks; these matchers
    // mirror that, so a library export can also declare its barrel.
    expect(MT.findBarrel(rig('gun_barrel.model'))?.name).toBe(
      'gun_barrel.model'
    )
  })

  test('matching is case-insensitive', () => {
    expect(MT.findBarrel(rig('Gun_Barrel'))?.name).toBe('Gun_Barrel')
  })

  test('it searches DESCENDANTS, not just direct children', () => {
    const root = new BABYLON.TransformNode('t', scene)
    const mid = new BABYLON.TransformNode('mount', scene)
    mid.parent = root
    const barrel = new BABYLON.TransformNode('x_barrel', scene)
    barrel.parent = mid
    expect(MT.findBarrel(root)?.name).toBe('x_barrel')
  })

  test('the centre-of-gravity convention still works — no cross-talk', () => {
    const root = rig('hull_centerOfGravity', 'gun_barrel')
    expect(MT.findCenterOfGravity(root)?.name).toBe('hull_centerOfGravity')
    expect(MT.findBarrel(root)?.name).toBe('gun_barrel')
  })
})
