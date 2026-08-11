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
    THE canonical mapping (issues #5/#6): Blender-default content (−Y forward,
    all transforms applied) arrives facing engine −Z through the exporter + LH
    read; the collapse yaws it π so CONTENT-FRONT lands on the wrapper's +Z.
    Concretely: the model node's local −Z axis is the content front, and it
    must land on wrapper +Z.
    */
    root.computeWorldMatrix(true)
    const contentFront = new BABYLON.Vector3()
    root.getDirectionToRef(new BABYLON.Vector3(0, 0, -1), contentFront)
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
      probe.position.set(0, 0, -1) // content front (Blender-default authored)
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
