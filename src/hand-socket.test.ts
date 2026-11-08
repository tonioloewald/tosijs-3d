import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import {
  HAND_IN_ANATOMY,
  compose,
  eulerQuaternion,
  gripPoint,
  heldMatrix,
  mat4Invert,
  mat4Multiply,
  mat4Point,
  socketInHand,
  type Mat4,
} from './hand-socket.js'

// A seeded walk, so a failure repeats.
let seed = 7
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647 - 0.5
}
const close = (a: ArrayLike<number>, b: ArrayLike<number>, digits = 5) => {
  expect(a.length).toBe(b.length)
  for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i], digits)
}
const randomMatrix = () =>
  BABYLON.Matrix.Compose(
    new BABYLON.Vector3(1 + rand() * 0.2, 1 + rand() * 0.2, 1 + rand() * 0.2),
    BABYLON.Quaternion.FromEulerAngles(rand() * 6, rand() * 6, rand() * 6),
    new BABYLON.Vector3(rand(), rand(), rand())
  )

describe('hand socket: the same arithmetic as Babylon', () => {
  test('multiply, invert, compose, Euler angles', () => {
    for (let k = 0; k < 20; k++) {
      const a = randomMatrix()
      const b = randomMatrix()
      close(mat4Multiply(Array.from(a.m), Array.from(b.m)), a.multiply(b).m)
      close(mat4Invert(Array.from(a.m)), a.clone().invert().m)
      const [rx, ry, rz] = [rand() * 360, rand() * 360, rand() * 360]
      const q = BABYLON.Quaternion.FromEulerAngles(
        (rx * Math.PI) / 180,
        (ry * Math.PI) / 180,
        (rz * Math.PI) / 180
      )
      close(eulerQuaternion(rx, ry, rz), [q.x, q.y, q.z, q.w])
      const s = new BABYLON.Vector3(1.2, 0.8, 1.1)
      const t = new BABYLON.Vector3(rand(), rand(), rand())
      close(
        compose(s, [q.x, q.y, q.z, q.w], t),
        BABYLON.Matrix.Compose(s, q, t).m
      )
    }
  })

  test("the socket under the hand is the launcher's formula", () => {
    for (let k = 0; k < 20; k++) {
      const hand = randomMatrix()
      const at = hand.getTranslation()
      const fore = at.add(
        new BABYLON.Vector3(0.25 + rand() * 0.1, rand() * 0.1, rand() * 0.1)
      )
      const thumb = at.add(
        new BABYLON.Vector3(rand() * 0.05, 0.03 + rand() * 0.02, 0.04)
      )
      // The formula as the launcher wrote it before it moved here.
      const x = at.subtract(fore).normalize()
      const z = BABYLON.Vector3.Cross(x, thumb.subtract(at)).normalize()
      const y = BABYLON.Vector3.Cross(z, x).normalize()
      const anatomy = BABYLON.Matrix.FromValues(
        x.x,
        x.y,
        x.z,
        0,
        y.x,
        y.y,
        y.z,
        0,
        z.x,
        z.y,
        z.z,
        0,
        at.x,
        at.y,
        at.z,
        1
      )
      const expected = BABYLON.Matrix.FromArray(HAND_IN_ANATOMY.r)
        .multiply(anatomy)
        .multiply(hand.clone().invert())
      close(socketInHand('r', Array.from(hand.m), fore, thumb)!, expected.m)
    }
  })

  test("an item's grip lands on the grip, as the builder places it", () => {
    const g = {
      x: 0.03,
      y: -0.02,
      z: 0.05,
      rx: 20,
      ry: -75,
      rz: 140,
      scale: 1.5,
    }
    const grip = { x: 0.01, y: 0.04, z: -0.1 }
    const m: Mat4 = heldMatrix(g, grip)
    const p = mat4Point(m, grip)
    close([p.x, p.y, p.z], [g.x, g.y, g.z])
  })

  test('the grip point is the middle of the lowest third', () => {
    // A handle (y 0..0.1) under a slide (y 0.2..0.3).
    const pts = [0, 0, 0, 0.02, 0.06, 0, 0, 0.2, 0.1, 0, 0.3, 0.2]
    const g = gripPoint(pts)!
    close([g.x, g.y, g.z], [0.01, 0.03, 0])
    expect(gripPoint([0, 1, 0, 1, 1, 1])).toBeNull()
  })
})
