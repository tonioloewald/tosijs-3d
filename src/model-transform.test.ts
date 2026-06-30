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
    m.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.6, -0.3, 0.2)
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
    root.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.9, 0.2, -0.5)
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
    // the model now faces +Z (its nose lands on the wrapper's forward)
    root.computeWorldMatrix(true)
    const noseAfter = new BABYLON.Vector3()
    root.getDirectionToRef(BABYLON.Axis.Z, noseAfter)
    noseAfter.normalize()
    expect(noseAfter.x).toBeCloseTo(0)
    expect(noseAfter.y).toBeCloseTo(0)
    expect(noseAfter.z).toBeCloseTo(1)
    // the model is parented to the wrapper, still carries its own scale
    expect(root.parent).toBe(wrap)
    expect(root.scaling.x).toBeCloseTo(2.38)
    // and the spawned model isn't degenerate (had a real forward before)
    expect(noseBefore.length()).toBeCloseTo(1)
  })
})
