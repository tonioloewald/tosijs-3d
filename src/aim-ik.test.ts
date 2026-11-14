import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { aimSpine } from './aim-ik.js'

let engine: BABYLON.NullEngine
let scene: BABYLON.Scene

beforeAll(() => {
  engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})
afterAll(() => {
  scene.dispose()
  engine.dispose()
})

// A body: root → pelvis → three spine bones → a hand → a gun held level
// forward, then the pelvis leant forward as a crouch leans it.
function body(mirror: boolean) {
  const node = (name: string, parent: BABYLON.Node | null, y = 0) => {
    const n = new BABYLON.TransformNode(name, scene)
    n.parent = parent
    n.position.y = y
    n.rotationQuaternion = BABYLON.Quaternion.Identity()
    return n
  }
  const root = node('root', null)
  // glTF's handedness mirror, and a scale.
  if (mirror) root.scaling.set(1.5, 1.5, -1.5)
  const pelvis = node('pelvis', root, 1)
  const spine = [node('s1', pelvis, 0.1), null, null] as BABYLON.TransformNode[]
  spine[1] = node('s2', spine[0], 0.15)
  spine[2] = node('s3', spine[1], 0.15)
  const hand = node('hand', spine[2], 0.2)
  hand.position.z = 0.4
  const gun = node('gun', hand)
  pelvis.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
    BABYLON.Axis.X,
    (50 * Math.PI) / 180
  )
  const pointing = () => {
    gun.computeWorldMatrix(true)
    return gun.getWorldMatrix().getRow(2)!.toVector3().normalize()
  }
  const all = [root, pelvis, ...spine, hand, gun]
  for (const n of all) n.computeWorldMatrix(true)
  return { root, spine, gun, pointing, all }
}

const deg = (a: BABYLON.Vector3, b: BABYLON.Vector3) =>
  (Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(a, b)))) * 180) /
  Math.PI

describe('aimSpine', () => {
  for (const mirror of [false, true]) {
    test(`a leant body points its gun along the aim${
      mirror ? ' (mirrored root)' : ''
    }`, () => {
      const b = body(mirror)
      const level = b.pointing().clone()
      level.y = 0
      level.normalize()
      expect(deg(b.pointing(), level)).toBeGreaterThan(40)
      const left = aimSpine(b.spine, b.gun, level)
      expect(left).toBeLessThan(0.5)
      expect(deg(b.pointing(), level)).toBeLessThan(0.5)
      // Shared down the chain: every bone turned.
      for (const s of b.spine) {
        expect(Math.abs(s.rotationQuaternion!.w)).toBeLessThan(0.9999)
      }
    })
  }

  test('weight and the cap limit the turn', () => {
    const b = body(true)
    const level = b.pointing().clone()
    level.y = 0
    level.normalize()
    const before = deg(b.pointing(), level)
    aimSpine(b.spine, b.gun, level, { weight: 0.5 })
    expect(deg(b.pointing(), level)).toBeCloseTo(before / 2, 0)
    const c = body(true)
    aimSpine(c.spine, c.gun, level, { maxDeg: 10 })
    expect(deg(c.pointing(), level)).toBeCloseTo(before - 10, 0)
  })

  test('a held node outside the chain is left alone', () => {
    const b = body(false)
    const stray = new BABYLON.TransformNode('stray', scene)
    expect(aimSpine(b.spine, stray, new BABYLON.Vector3(0, 0, 1))).toBe(0)
  })
})

describe('reachLimb', () => {
  for (const mirror of [false, true]) {
    test(`an arm puts its hand on a point${mirror ? ' (mirrored root)' : ''}`, async () => {
      const { reachLimb, setWorldRotation } = await import('./aim-ik.js')
      const node = (name: string, parent: BABYLON.Node | null, x = 0) => {
        const n = new BABYLON.TransformNode(name, scene)
        n.parent = parent
        n.position.x = x
        n.rotationQuaternion = BABYLON.Quaternion.Identity()
        return n
      }
      const root = node('root', null)
      if (mirror) root.scaling.set(1.5, 1.5, -1.5)
      const upper = node('upper', root)
      upper.position.y = 1.4
      const lower = node('lower', upper, 0.3)
      const hand = node('hand', lower, 0.25)
      for (const n of [root, upper, lower, hand]) n.computeWorldMatrix(true)
      const s = upper.getAbsolutePosition()
      const goal = s.add(new BABYLON.Vector3(0.1, -0.1, mirror ? 0.4 : -0.4))
      const miss = reachLimb(upper, lower, hand, goal, new BABYLON.Vector3(0, -1, 0))
      expect(miss).toBeLessThan(1e-4)
      expect(lower.getAbsolutePosition().y).toBeLessThan(s.y - 0.02)
      // And the hand turned to a world rotation.
      const want = BABYLON.Matrix.RotationY(0.7).multiply(root.getWorldMatrix())
      setWorldRotation(hand, want)
      const got = hand.getWorldMatrix().getRow(2)!.toVector3().normalize()
      const wantZ = want.getRow(2)!.toVector3().normalize()
      expect(BABYLON.Vector3.Dot(got, wantZ)).toBeGreaterThan(0.9999)
    })
  }
})
