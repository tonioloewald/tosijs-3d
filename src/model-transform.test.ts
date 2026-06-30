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
