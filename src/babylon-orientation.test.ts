/**
 * Pin down what Babylon TransformNode actually does for rotation and parenting.
 *
 * Surprising findings encoded as tests:
 *   1. Babylon is left-handed BUT uses right-hand-rule rotations.
 *      Rotating around +Z by +90° takes +Y to -X (not +X).
 *   2. cross(forward, up) = LEFT in this coordinate system, not right.
 *   3. Parent rotation interacts with Space.LOCAL rotations in non-obvious ways.
 *
 * If any of these break under a Babylon upgrade, the aircraft physics
 * layer needs to be re-checked.
 */

import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine'

function makeScene(): BABYLON.Scene {
  const engine = new NullEngine()
  return new BABYLON.Scene(engine)
}

function expectVecClose(
  actual: BABYLON.Vector3,
  x: number,
  y: number,
  z: number
) {
  expect(actual.x).toBeCloseTo(x, 4)
  expect(actual.y).toBeCloseTo(y, 4)
  expect(actual.z).toBeCloseTo(z, 4)
}

describe('TransformNode default orientation', () => {
  test('default forward=+Z, up=+Y, right=+X', () => {
    const node = new BABYLON.TransformNode('t', makeScene())
    expectVecClose(node.forward, 0, 0, 1)
    expectVecClose(node.up, 0, 1, 0)
    expectVecClose(node.right, 1, 0, 0)
  })
})

describe('Rotation conventions (LOCAL, identity parent)', () => {
  test('rotate +X by +90°: forward goes from +Z to -Y (nose pitches DOWN)', () => {
    // Right-hand rule around +X: +Z rotates toward -Y.
    // INTUITION: "pitch +X positive = nose down." If you want nose UP, rotate negative.
    const node = new BABYLON.TransformNode('t', makeScene())
    node.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL)
    node.computeWorldMatrix(true)
    expectVecClose(node.forward, 0, -1, 0)
    expectVecClose(node.up, 0, 0, 1)
  })

  test('rotate +Y by +90°: forward goes from +Z to +X (yaw RIGHT)', () => {
    const node = new BABYLON.TransformNode('t', makeScene())
    node.rotate(BABYLON.Axis.Y, Math.PI / 2, BABYLON.Space.LOCAL)
    node.computeWorldMatrix(true)
    expectVecClose(node.forward, 1, 0, 0)
    expectVecClose(node.up, 0, 1, 0)
  })

  test('rotate +Z by +90°: up goes from +Y to -X (roll LEFT — right wing rises)', () => {
    // Right-hand rule around +Z: +Y rotates toward -X.
    // INTUITION: "roll +Z positive = roll LEFT (right wing up)."
    // If you want to roll RIGHT, rotate negative.
    const node = new BABYLON.TransformNode('t', makeScene())
    node.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.LOCAL)
    node.computeWorldMatrix(true)
    expectVecClose(node.up, -1, 0, 0)
    expectVecClose(node.forward, 0, 0, 1) // unchanged
  })

  test('rotate +Z by -90°: up goes from +Y to +X (roll RIGHT — right wing dips)', () => {
    const node = new BABYLON.TransformNode('t', makeScene())
    node.rotate(BABYLON.Axis.Z, -Math.PI / 2, BABYLON.Space.LOCAL)
    node.computeWorldMatrix(true)
    expectVecClose(node.up, 1, 0, 0)
  })
})

describe('Cross product convention (Babylon left-handed)', () => {
  test('cross(forward=+Z, up=+Y) = -X (LEFT, not right)', () => {
    const r = BABYLON.Vector3.Cross(
      new BABYLON.Vector3(0, 0, 1),
      new BABYLON.Vector3(0, 1, 0)
    )
    expectVecClose(r, -1, 0, 0)
  })

  test('cross(up=+Y, forward=+Z) = +X (right)', () => {
    const r = BABYLON.Vector3.Cross(
      new BABYLON.Vector3(0, 1, 0),
      new BABYLON.Vector3(0, 0, 1)
    )
    expectVecClose(r, 1, 0, 0)
  })
})

describe('TransformNode under a rotated parent', () => {
  test('parent rotated 180° around Y: child world forward is -Z', () => {
    const scene = makeScene()
    const parent = new BABYLON.TransformNode('parent', scene)
    parent.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL)
    const child = new BABYLON.TransformNode('child', scene)
    child.parent = parent
    parent.computeWorldMatrix(true)
    child.computeWorldMatrix(true)
    // Local +Z, parent flipped 180° around Y → world -Z
    expectVecClose(child.forward, 0, 0, -1)
    expectVecClose(child.up, 0, 1, 0)
  })

  test('parent rotated 180° around Y: child.rotate(X,+90°,LOCAL) still gives forward=-Y (nose DOWN)', () => {
    // KEY FINDING: pitch input behaves identically regardless of Y-axis parent rotation.
    // Babylon's Space.LOCAL post-multiplies the rotation onto the child's own quaternion;
    // the parent only re-projects the result to world. Since 180° Y preserves +Y/-Y,
    // a pitch-down rotation stays a pitch-down rotation in world space.
    const scene = makeScene()
    const parent = new BABYLON.TransformNode('parent', scene)
    parent.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL)
    const child = new BABYLON.TransformNode('child', scene)
    child.parent = parent
    child.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL)
    parent.computeWorldMatrix(true)
    child.computeWorldMatrix(true)
    expectVecClose(child.forward, 0, -1, 0)
  })

  test('parent rotated 90° around X: child.rotate(X,+90°,LOCAL) gives forward in WORLD that combines both rotations', () => {
    // Here parent rotation IS around the same axis as child rotation, so they accumulate.
    // Parent: rotate +X by +90° → child's resting forward in world = parent * (0,0,1) = (0,-1,0).
    // Child rotate +X by +90° in LOCAL → child's local forward becomes (0,-1,0).
    // World forward = parent * (0,-1,0) = parent rotates (0,-1,0) by 90° around +X → (0,0,-1).
    const scene = makeScene()
    const parent = new BABYLON.TransformNode('parent', scene)
    parent.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL)
    const child = new BABYLON.TransformNode('child', scene)
    child.parent = parent
    child.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL)
    parent.computeWorldMatrix(true)
    child.computeWorldMatrix(true)
    expectVecClose(child.forward, 0, 0, -1)
  })

  test('parent rotated 90° around Z: child world up is -X, world forward unchanged', () => {
    const scene = makeScene()
    const parent = new BABYLON.TransformNode('parent', scene)
    parent.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.LOCAL)
    const child = new BABYLON.TransformNode('child', scene)
    child.parent = parent
    parent.computeWorldMatrix(true)
    child.computeWorldMatrix(true)
    expectVecClose(child.up, -1, 0, 0)
    expectVecClose(child.forward, 0, 0, 1)
  })
})
