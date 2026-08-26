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
import { faceViewer } from './dialog-placement'
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

describe("A plane's visible face is local −Z (and its back MIRRORS)", () => {
  /*
  The geometry facts behind `dialog-placement.faceViewer`. Pinned here because
  the whole library aims panels on them, and because getting it wrong does not
  fail loudly: a back-facing double-sided panel renders MIRRORED rather than
  disappearing, which is how it reached a release as "the death / respawn dialog
  was flipped horizontally".
  */

  test('CreatePlane normals point at −Z', () => {
    const scene = makeScene()
    const plane = BABYLON.MeshBuilder.CreatePlane('p', { size: 1 }, scene)
    const n = plane.getVerticesData(BABYLON.VertexBuffer.NormalKind)!
    expect([n[0], n[1], n[2]]).toEqual([0, 0, -1])
  })

  test('a DOUBLESIDE back face REUSES the front UVs — hence a mirror, not a gap', () => {
    const scene = makeScene()
    const plane = BABYLON.MeshBuilder.CreatePlane(
      'p',
      { size: 1, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      scene
    )
    const uv = plane.getVerticesData(BABYLON.VertexBuffer.UVKind)!
    const front = Array.from(uv.slice(0, 8))
    const back = Array.from(uv.slice(8, 16))
    expect(back).toEqual(front)
  })

  test('faceViewer aims that face at the viewer, from any direction', () => {
    const scene = makeScene()
    const cases: Array<[number[], number[]]> = [
      [
        [0, 0, 0],
        [0, 0, -5],
      ],
      [
        [0, 0, 0],
        [5, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 4, 0.001],
      ],
      [
        [1, 2, 3],
        [-4, 7, -2],
      ],
      [
        [0, 0, 0],
        [3, -6, 2],
      ],
      // The XR settings panel's own seating: 60° up the sight-line, aimed back
      // down at your head.
      [
        [0, 1.212, 0.7],
        [0, 0, 0],
      ],
    ]
    for (const [pos, viewer] of cases) {
      const mesh = BABYLON.MeshBuilder.CreatePlane('p', { size: 1 }, scene)
      const { yaw, pitch } = faceViewer(
        { x: pos[0], y: pos[1], z: pos[2] },
        { x: viewer[0], y: viewer[1], z: viewer[2] }
      )
      mesh.position.set(pos[0], pos[1], pos[2])
      mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
        yaw,
        pitch,
        0
      )
      mesh.computeWorldMatrix(true)
      const face = BABYLON.Vector3.TransformNormal(
        new BABYLON.Vector3(0, 0, -1),
        mesh.getWorldMatrix()
      ).normalize()
      const want = new BABYLON.Vector3(
        viewer[0] - pos[0],
        viewer[1] - pos[1],
        viewer[2] - pos[2]
      ).normalize()
      expect(BABYLON.Vector3.Dot(face, want)).toBeCloseTo(1, 5)
      mesh.dispose()
    }
  })

  test('the NAIVE atan2(dx, dz) aims the BACK at you — the shipped bug', () => {
    const scene = makeScene()
    const mesh = BABYLON.MeshBuilder.CreatePlane('p', { size: 1 }, scene)
    const viewer = new BABYLON.Vector3(5, 0, 0)
    mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      Math.atan2(viewer.x, viewer.z),
      0,
      0
    )
    mesh.computeWorldMatrix(true)
    const face = BABYLON.Vector3.TransformNormal(
      new BABYLON.Vector3(0, 0, -1),
      mesh.getWorldMatrix()
    ).normalize()
    expect(BABYLON.Vector3.Dot(face, viewer.normalizeToNew())).toBeCloseTo(
      -1,
      5
    )
  })
})

describe('Turning the panel around preserves what you SEE, roll included', () => {
  /*
  The change that dropped `tex.uScale = -1` from `frame-panel` and the XR
  settings panel. It is only safe if the new configuration puts every pixel
  where the old one did — including under a roll, since `frame-panel`'s
  grip-space anchors carry `rollDeg: 180` to right themselves.

  Stated as geometry rather than as an argument: the point a viewer sees at the
  image's top-right must land in the same place either way.

    OLD: back of the plane faces you, texture U-flipped, so the image's
         top-right is drawn on the vertex with mesh uv (0, 1).
    NEW: face of the plane faces you, texture untouched, so the image's
         top-right is drawn on the vertex with mesh uv (1, 1).
  */
  const cornerWorld = (
    scene: BABYLON.Scene,
    yaw: number,
    pitch: number,
    roll: number,
    uv: [number, number]
  ): BABYLON.Vector3 => {
    const mesh = BABYLON.MeshBuilder.CreatePlane('p', { size: 1 }, scene)
    mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      yaw,
      pitch,
      roll
    )
    mesh.computeWorldMatrix(true)
    const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
    const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)!
    let index = -1
    for (let i = 0; i < uvs.length / 2; i++) {
      if (uvs[i * 2] === uv[0] && uvs[i * 2 + 1] === uv[1]) index = i
    }
    expect(index).toBeGreaterThanOrEqual(0)
    const local = new BABYLON.Vector3(
      pos[index * 3],
      pos[index * 3 + 1],
      pos[index * 3 + 2]
    )
    const world = BABYLON.Vector3.TransformCoordinates(
      local,
      mesh.getWorldMatrix()
    )
    mesh.dispose()
    return world
  }

  for (const rollDeg of [0, 180, 37]) {
    test(`the image's top-right lands in the same place at roll ${rollDeg}°`, () => {
      const scene = makeScene()
      const panel = { x: 0.4, y: 1.2, z: -0.9 }
      const viewer = { x: 0, y: 1.6, z: 0 }
      const roll = (rollDeg * Math.PI) / 180

      const dx = viewer.x - panel.x
      const dy = viewer.y - panel.y
      const dz = viewer.z - panel.z
      // What both panels used to do: aim +Z at the viewer.
      const oldSeen = cornerWorld(
        scene,
        Math.atan2(dx, dz),
        -Math.atan2(dy, Math.hypot(dx, dz)),
        roll,
        [0, 1]
      )
      const aim = faceViewer(panel, viewer, roll)
      const newSeen = cornerWorld(scene, aim.yaw, aim.pitch, aim.roll, [1, 1])

      expectVecClose(newSeen, oldSeen.x, oldSeen.y, oldSeen.z)
    })
  }
})

describe('Unparenting: `parent = null` STRANDS, `setParent(null)` preserves', () => {
  /*
  The fact behind the XR rig teleporting to the origin on death. Pinned because
  the two spellings look interchangeable, the wrong one is the shorter one, and
  the failure is invisible until something happens to be parented — which is why
  it sat in TODO as a cockpit-only oddity for five months and only became
  reproducible when the chase rig was parented too.
  */
  const rigUnder = (scene: BABYLON.Scene) => {
    const parent = new BABYLON.TransformNode('anchor', scene)
    parent.position.set(120, 40, -300)
    parent.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      1.1,
      0,
      0
    )
    const rig = new BABYLON.TransformNode('rig', scene)
    rig.parent = parent
    rig.position.set(0, 2, -5) // behind and above, the chase offset
    rig.computeWorldMatrix(true)
    return { parent, rig, wasAt: rig.getAbsolutePosition().clone() }
  }

  test('`parent = null` reinterprets the LOCAL pose as world — straight to the origin', () => {
    const { rig, wasAt } = rigUnder(makeScene())
    rig.parent = null
    rig.computeWorldMatrix(true)
    const now = rig.getAbsolutePosition()
    expectVecClose(now, 0, 2, -5) // the local offset, now in world space
    expect(BABYLON.Vector3.Distance(now, wasAt)).toBeGreaterThan(300)
  })

  test('`setParent(null)` leaves it exactly where it was', () => {
    const { rig, wasAt } = rigUnder(makeScene())
    rig.setParent(null)
    rig.computeWorldMatrix(true)
    expectVecClose(rig.getAbsolutePosition(), wasAt.x, wasAt.y, wasAt.z)
  })

  test('…and preserves world ORIENTATION too, not just position', () => {
    const scene = makeScene()
    const { parent, rig } = rigUnder(scene)
    rig.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.4, 0, 0)
    rig.computeWorldMatrix(true)
    const before = rig.getDirection(new BABYLON.Vector3(0, 0, 1)).normalize()
    rig.setParent(null)
    rig.computeWorldMatrix(true)
    const after = rig.getDirection(new BABYLON.Vector3(0, 0, 1)).normalize()
    expect(BABYLON.Vector3.Dot(before, after)).toBeCloseTo(1, 5)
    expect(parent.isDisposed()).toBe(false)
  })
})
