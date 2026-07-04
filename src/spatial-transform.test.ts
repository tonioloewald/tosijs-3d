import { describe, expect, test } from 'bun:test'
import {
  add,
  sub,
  quatConjugate,
  quatMul,
  rotateVector,
  quatFromAxisAngle,
  composePose,
  relativePose,
  placeRelative,
  IDENTITY_QUAT,
  type Pose,
  type Vec3,
  type Quat,
} from './spatial-transform'

const closeVec = (a: Vec3, b: Vec3, eps = 1e-9) => {
  expect(a.x).toBeCloseTo(b.x, 9)
  expect(a.y).toBeCloseTo(b.y, 9)
  expect(a.z).toBeCloseTo(b.z, 9)
  void eps
}
const closeQuat = (a: Quat, b: Quat) => {
  // q and -q are the same rotation; align sign before comparing.
  const s = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z < 0 ? -1 : 1
  expect(a.x).toBeCloseTo(s * b.x, 9)
  expect(a.y).toBeCloseTo(s * b.y, 9)
  expect(a.z).toBeCloseTo(s * b.z, 9)
  expect(a.w).toBeCloseTo(s * b.w, 9)
}

const Y = { x: 0, y: 1, z: 0 }
const yaw = (deg: number) => quatFromAxisAngle(Y, (deg * Math.PI) / 180)

describe('vec/quat primitives', () => {
  test('add / sub', () => {
    closeVec(add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }), { x: 5, y: 7, z: 9 })
    closeVec(sub({ x: 4, y: 5, z: 6 }, { x: 1, y: 2, z: 3 }), { x: 3, y: 3, z: 3 })
  })

  test('rotateVector: 90° about Z maps +X → +Y', () => {
    const q = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2)
    closeVec(rotateVector(q, { x: 1, y: 0, z: 0 }), { x: 0, y: 1, z: 0 })
  })

  test('rotateVector: 90° yaw maps +Z (forward) → +X', () => {
    // yaw about +Y by 90°: forward (0,0,1) rotates to (1,0,0)
    closeVec(rotateVector(yaw(90), { x: 0, y: 0, z: 1 }), { x: 1, y: 0, z: 0 })
  })

  test('identity quaternion leaves vectors unchanged', () => {
    closeVec(rotateVector(IDENTITY_QUAT, { x: 3, y: -2, z: 5 }), { x: 3, y: -2, z: 5 })
  })

  test('quatMul by identity is a no-op', () => {
    const q = yaw(37)
    closeQuat(quatMul(q, IDENTITY_QUAT), q)
    closeQuat(quatMul(IDENTITY_QUAT, q), q)
  })

  test('q · conjugate(q) = identity', () => {
    const q = quatFromAxisAngle({ x: 0.6, y: 0, z: 0.8 }, 1.1)
    closeQuat(quatMul(q, quatConjugate(q)), IDENTITY_QUAT)
  })

  test('rotating by q then by conjugate returns the original vector', () => {
    const q = quatFromAxisAngle({ x: 0.267, y: 0.535, z: 0.802 }, 2.0)
    const v = { x: 1.5, y: -2.5, z: 0.5 }
    closeVec(rotateVector(quatConjugate(q), rotateVector(q, v)), v)
  })
})

describe('compose ↔ relative (the transition core)', () => {
  const parent: Pose = { position: { x: 10, y: 0, z: -4 }, rotation: yaw(90) }
  const childWorld: Pose = { position: { x: 12, y: 1, z: -2 }, rotation: yaw(200) }

  test('relativePose is the inverse of composePose', () => {
    const local = relativePose(parent, childWorld)
    const back = composePose(parent, local)
    closeVec(back.position, childWorld.position)
    closeQuat(back.rotation, childWorld.rotation)
  })

  test('composePose of a local child yields the expected world pose', () => {
    // parent yawed 90° at (10,0,-4); child 2 units "forward" (+Z local), no rot.
    const local: Pose = { position: { x: 0, y: 0, z: 2 }, rotation: IDENTITY_QUAT }
    const world = composePose(parent, local)
    // +Z local → +X world under 90° yaw → parent + (2,0,0)
    closeVec(world.position, { x: 12, y: 0, z: -4 })
    closeQuat(world.rotation, parent.rotation)
  })

  test('transition preserves world pose: re-parenting to a new frame is a no-jump', () => {
    // The object's world pose must be identical after switching parents.
    const oldParent: Pose = { position: { x: 1, y: 0, z: 1 }, rotation: yaw(30) }
    const newParent: Pose = { position: { x: -5, y: 2, z: 8 }, rotation: yaw(-110) }
    const localUnderOld: Pose = {
      position: { x: 0.5, y: 0.2, z: -1 },
      rotation: yaw(15),
    }
    // World pose while attached to oldParent:
    const world = composePose(oldParent, localUnderOld)
    // Re-parent to newParent preserving world pose:
    const localUnderNew = relativePose(newParent, world)
    // World pose after the switch must match exactly.
    const worldAfter = composePose(newParent, localUnderNew)
    closeVec(worldAfter.position, world.position)
    closeQuat(worldAfter.rotation, world.rotation)
  })

  test('detach to world (identity parent) yields the world pose unchanged', () => {
    const worldParent: Pose = { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY_QUAT }
    const world = composePose(
      { position: { x: 3, y: 1, z: -2 }, rotation: yaw(45) },
      { position: { x: 0, y: 0, z: 1 }, rotation: yaw(10) }
    )
    // relative to the world frame === the world pose itself.
    const local = relativePose(worldParent, world)
    closeVec(local.position, world.position)
    closeQuat(local.rotation, world.rotation)
  })
})

describe('placeRelative (world-offset snapshot)', () => {
  test('offset is expressed in the reference local frame', () => {
    const ref: Pose = { position: { x: 4, y: 0, z: 0 }, rotation: yaw(90) }
    // "2 units forward" (+Z local) → +X world under 90° yaw → (6,0,0)
    closeVec(placeRelative(ref, { x: 0, y: 0, z: 2 }), { x: 6, y: 0, z: 0 })
  })

  test('with no rotation, offset adds directly', () => {
    const ref: Pose = { position: { x: 1, y: 2, z: 3 }, rotation: IDENTITY_QUAT }
    closeVec(placeRelative(ref, { x: 1, y: -1, z: 1 }), { x: 2, y: 1, z: 4 })
  })

  test('matches composePose position for a zero-rotation local pose', () => {
    const ref: Pose = { position: { x: -2, y: 5, z: 1 }, rotation: yaw(123) }
    const offset = { x: 0.3, y: -0.4, z: 1.2 }
    const viaPlace = placeRelative(ref, offset)
    const viaCompose = composePose(ref, { position: offset, rotation: IDENTITY_QUAT })
    closeVec(viaPlace, viaCompose.position)
  })
})
