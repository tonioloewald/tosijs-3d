/**
 * normalizeScale collapses a model's scale into its geometry, leaving a unit-
 * scale control node whose ORIENTATION (nose/forward direction) is unchanged —
 * verified through a real Babylon mesh, not hand math.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { normalizeScale } from './model-transform'

let engine: BABYLON.NullEngine
let scene: BABYLON.Scene
beforeAll(() => {
  engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})
afterAll(() => engine.dispose())

function fwd(n: BABYLON.TransformNode) {
  n.computeWorldMatrix(true)
  const f = new BABYLON.Vector3()
  n.getDirectionToRef(BABYLON.Axis.Z, f)
  return f
}
const close = (a: BABYLON.Vector3, b: BABYLON.Vector3) =>
  BABYLON.Vector3.Distance(a, b) < 1e-4

describe('normalizeScale', () => {
  test('non-uniform scale → unit scale, orientation preserved', () => {
    const m = BABYLON.MeshBuilder.CreateBox('b', { size: 1 }, scene)
    m.scaling.set(2, 0.5, 3)
    m.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      0.6,
      -0.3,
      0.2
    )
    const before = fwd(m).clone()
    before.normalize()
    normalizeScale(m)
    expect(m.scaling.x).toBeCloseTo(1)
    expect(m.scaling.y).toBeCloseTo(1)
    expect(m.scaling.z).toBeCloseTo(1)
    const after = fwd(m)
    after.normalize()
    expect(close(before, after)).toBe(true)
  })

  test('after collapse, forward is already UNIT (no skew left)', () => {
    const m = BABYLON.MeshBuilder.CreateBox('b2', { size: 1 }, scene)
    m.scaling.set(4, 4, 4)
    m.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(1, 0, 0)
    normalizeScale(m)
    expect(fwd(m).length()).toBeCloseTo(1, 3)
  })

  test('preserves euler-rotation nodes too', () => {
    const m = BABYLON.MeshBuilder.CreateBox('b3', { size: 1 }, scene)
    m.scaling.set(0.1, 0.1, 0.1)
    m.rotation.set(0.2, 1.1, -0.4)
    const before = fwd(m).clone()
    before.normalize()
    normalizeScale(m)
    expect(m.scaling.x).toBeCloseTo(1)
    const after = fwd(m)
    after.normalize()
    expect(close(before, after)).toBe(true)
  })
})

import { canonicalize } from './model-transform'

describe('canonicalize (wrapper)', () => {
  test('hierarchy w/ scale + odd orientation → unit-scale wrapper, nose +Z', () => {
    // Mock a scout-like node: a scaled parent with a child mesh, oddly oriented.
    const root = new BABYLON.TransformNode('scout', scene)
    root.scaling.setAll(2.38)
    root.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      0.9,
      0.2,
      -0.5
    )
    const child = BABYLON.MeshBuilder.CreateBox('cockpit', { size: 1 }, scene)
    child.parent = root
    child.position.set(0, 0, 1)

    const noseBefore = (() => {
      root.computeWorldMatrix(true)
      const f = new BABYLON.Vector3()
      root.getDirectionToRef(BABYLON.Axis.Z, f)
      return f.normalize().clone()
    })()

    const wrap = canonicalize(root, scene, 'scout_instance')

    // wrapper is clean
    expect(wrap.scaling.x).toBeCloseTo(1)
    expect(wrap.rotationQuaternion).toBeNull()
    /*
    THE canonical mapping (issues #5/#6, corrected against real content):
    Blender-default content (nose local −Y) maps through the exporter to glTF
    +Z, and node-local data is read RAW — no per-node flip — so the model
    node's local +Z axis IS the content front. The collapse applies no
    rotation; content-front stays on the wrapper's +Z.
    */
    root.computeWorldMatrix(true)
    const contentFront = new BABYLON.Vector3()
    root.getDirectionToRef(new BABYLON.Vector3(0, 0, 1), contentFront)
    contentFront.normalize()
    expect(contentFront.x).toBeCloseTo(0)
    expect(contentFront.y).toBeCloseTo(0)
    expect(contentFront.z).toBeCloseTo(1)
    // the model is parented to the wrapper, still carries its own scale
    expect(root.parent).toBe(wrap)
    expect(root.scaling.x).toBeCloseTo(2.38)
    // and the spawned model isn't degenerate (had a real forward before)
    expect(noseBefore.length()).toBeCloseTo(1)
  })

  test('strips the glTF __root__ handedness mirror (det −1 → det +1)', () => {
    // Babylon's glTF __root__ carries scale (1,1,−1) + yaw 180° — a net
    // X-mirror. A control node with a negative-determinant frame flips
    // chirality for everything computed through it: inverted pitch, chase
    // camera on the nose side, mirrored model (manta-recon, issue #5).
    const root = new BABYLON.TransformNode('__root__clone', scene)
    root.scaling.set(1, 1, -1)
    root.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      Math.PI,
      0,
      0
    )
    const child = BABYLON.MeshBuilder.CreateBox('hull', { size: 1 }, scene)
    child.parent = root

    const wrap = canonicalize(root, scene, 'craft')
    wrap.computeWorldMatrix(true)
    root.computeWorldMatrix(true)
    expect(root.getWorldMatrix().determinant()).toBeGreaterThan(0)
    expect(root.scaling.z).toBeCloseTo(1) // sign stripped, magnitude kept
    expect(wrap.getWorldMatrix().determinant()).toBeCloseTo(1)
  })

  test('both load paths produce the same frame — url __root__ ≡ library clone', () => {
    // The url path collapses __root__ (mirror + junk yaw 180); the library
    // path collapses a clean model clone. Same canonicalize, same resulting
    // content-front — the parity issue #5 measured is now structural.
    const mkContent = (name: string) => {
      const n = new BABYLON.TransformNode(name, scene)
      const probe = new BABYLON.TransformNode(name + '-probe', scene)
      probe.parent = n
      probe.position.set(0, 0, 1) // content front (Blender −Y ⇒ raw local +Z)
      return { n, probe }
    }
    const lib = mkContent('lib')
    const url = mkContent('url')
    const urlRoot = new BABYLON.TransformNode('__root__', scene)
    urlRoot.scaling.set(1, 1, -1)
    urlRoot.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      Math.PI,
      0,
      0
    )
    url.n.parent = urlRoot

    const libWrap = canonicalize(lib.n, scene, 'lib-wrap')
    const urlWrap = canonicalize(urlRoot, scene, 'url-wrap')
    libWrap.computeWorldMatrix(true)
    urlWrap.computeWorldMatrix(true)
    lib.probe.computeWorldMatrix(true)
    url.probe.computeWorldMatrix(true)
    const pLib = lib.probe.getAbsolutePosition()
    const pUrl = url.probe.getAbsolutePosition()
    expect(pLib.z).toBeCloseTo(1) // content front → engine +Z
    expect(pUrl.z).toBeCloseTo(pLib.z)
    expect(pUrl.x).toBeCloseTo(pLib.x)
  })
})

import { findCenterOfGravity, applyCenterOfGravity } from './model-transform'

describe('the _centerOfGravity marker (vehicle node convention)', () => {
  const build = (markerName: string) => {
    const wrap = new BABYLON.TransformNode('craft', scene)
    const hull = BABYLON.MeshBuilder.CreateBox(
      'Hull_collide',
      { size: 1 },
      scene
    )
    hull.parent = wrap
    hull.position.set(0, 0.5, 0)
    const cog = new BABYLON.TransformNode(markerName, scene)
    cog.parent = wrap
    cog.position.set(0, 0.6, 0.1)
    return { wrap, cog }
  }

  test('found by suffix — both spellings, and composed with .model', () => {
    for (const name of [
      'CoG_centerOfGravity',
      'cog_center_of_gravity',
      'CoG_centerOfGravity.model',
    ]) {
      const { wrap, cog } = build(name)
      expect(findCenterOfGravity(wrap)).toBe(cog)
      wrap.dispose()
    }
    const { wrap } = build('just_a_node')
    expect(findCenterOfGravity(wrap)).toBeNull()
    wrap.dispose()
  })

  test('rotation pivots about the CoG; the stance origin swings', () => {
    const { wrap, cog } = build('CoG_centerOfGravity')
    expect(applyCenterOfGravity(wrap)).toBe(cog)
    wrap.position.set(10, 2, -5)
    wrap.computeWorldMatrix(true)
    cog.computeWorldMatrix(true)
    const cogBefore = cog.getAbsolutePosition().clone()

    // pitch the craft hard nose-down
    wrap.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      0,
      Math.PI / 2,
      0
    )
    wrap.computeWorldMatrix(true)
    cog.computeWorldMatrix(true)
    // the CoG is the FIXED point of the rotation
    expect(
      BABYLON.Vector3.Distance(cog.getAbsolutePosition(), cogBefore)
    ).toBeLessThan(1e-4)
    // ...while the stance origin swung away from `position`
    const origin = BABYLON.Vector3.TransformCoordinates(
      BABYLON.Vector3.Zero(),
      wrap.getWorldMatrix()
    )
    expect(BABYLON.Vector3.Distance(origin, wrap.position)).toBeGreaterThan(0.1)
    wrap.dispose()
  })

  test('level attitude: the pivot is inert — parking is unchanged', () => {
    const { wrap } = build('CoG_centerOfGravity')
    applyCenterOfGravity(wrap)
    wrap.position.set(3, 1.25, 7) // y = terrainHeight parks the stance point
    wrap.computeWorldMatrix(true)
    const origin = BABYLON.Vector3.TransformCoordinates(
      BABYLON.Vector3.Zero(),
      wrap.getWorldMatrix()
    )
    expect(origin.x).toBeCloseTo(3)
    expect(origin.y).toBeCloseTo(1.25)
    expect(origin.z).toBeCloseTo(7)
    wrap.dispose()
  })

  test('no marker → no-op', () => {
    const { wrap } = build('plain')
    expect(applyCenterOfGravity(wrap)).toBeNull()
    wrap.dispose()
  })
})

/*
PUBLIC NAMES ARE WHAT A HUMAN READS.

The library picker showed `building_collideCylinder_primitive0`, which is three
different kinds of noise stacked: a collider annotation the engine cares about,
and `_primitive0`, which is not authored AT ALL — it is the glTF loader
splitting one multi-material mesh into one Babylon mesh per material.

The Blender case is the subtle one. `.001` lands AFTER the behaviour suffix, so
a plain endsWith never matched it and the annotation leaked whole. It must be
held aside and put back, not dropped: `tree.001` is a different object from
`tree`, and `modelExportNames` dedupes through a Set — collapsing them would
silently lose one.
*/
describe('publicName — what the consumer sees', () => {
  // b3d-utils reaches tosijs, which wants a DOM at import time — same standup
  // as stick-sign/pause-clock, so the import has to be dynamic.
  let publicName: typeof import('./b3d-utils').publicName
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
    ;({ publicName } = await import('./b3d-utils'))
  })

  test('behaviour suffixes come off', () => {
    expect(publicName('Hull_collideMesh')).toBe('Hull')
    expect(publicName('rock_collide_box')).toBe('rock')
  })

  test("the glTF loader's _primitiveN comes off", () => {
    expect(publicName('building_primitive0')).toBe('building')
    expect(publicName('building_collideCylinder_primitive0')).toBe('building')
  })

  test("Blender's .001 SURVIVES, with the annotation still removed", () => {
    expect(publicName('tree_collideCylinder.001')).toBe('tree.001')
    expect(publicName('tree.001')).toBe('tree.001')
    // …and stays distinct from the original, which is the whole point.
    expect(publicName('tree_collideCylinder.001')).not.toBe(
      publicName('tree_collideCylinder')
    )
  })

  test('.model comes off too, and composes with the rest', () => {
    expect(publicName('scout.model')).toBe('scout')
    expect(publicName('Hull_collideMesh.model')).toBe('Hull')
  })
})
