import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { readFileSync } from 'fs'

// THE canonical model frame, pinned against REAL known-orientation content.
//
// Tonio's scout in test-3.glb is authored Blender-default in its local frame:
// nose toward local −Y, up local +Z, origin at ground contact (verified from
// the Blender viewport). Through the exporter (Blender −Y → glTF +Z) and
// Babylon's RAW node-local read (no per-node handedness flip — that lives
// only on the __root__ the collapse discards), the nose must land on the
// wrapper's +Z with NO rotation applied by canonicalize.
//
// This test exists because the original issue-#6 chain analysis prescribed a
// yaw π here — plausible narrative, wrong empirically (it flew the scout
// backwards). Measurement over narrative: if this test fails after a loader
// or exporter upgrade, re-derive the chain against this file, don't guess.

let BABYLON: typeof import('@babylonjs/core')
let canonicalize: typeof import('./model-transform').canonicalize
let engine: import('@babylonjs/core').NullEngine
let scene: import('@babylonjs/core').Scene
let container: import('@babylonjs/core').AssetContainer

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
  BABYLON = await import('@babylonjs/core')
  await import('@babylonjs/loaders')
  canonicalize = (await import('./model-transform')).canonicalize
  engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
  const b64 = readFileSync('static/test-3.glb').toString('base64')
  container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    '',
    'data:;base64,' + b64,
    scene,
    undefined,
    '.glb'
  )
})
afterAll(() => engine.dispose())

describe('canonical frame vs the real scout (test-3.glb)', () => {
  test('collapse leaves the nose on wrapper +Z — nose gear FORWARD of main gear', () => {
    const source = [...container.transformNodes, ...container.meshes].find(
      (n) => n.name === 'scout' || n.name === 'scout.model'
    )!
    const clone = source.clone('scout_frame_probe', null)!
    const wrap = canonicalize(clone, scene, 'scout_frame_wrap')
    wrap.computeWorldMatrix(true)

    const abs = (suffix: string) => {
      const n = clone
        .getDescendants()
        .find((d) =>
          d.name.endsWith(suffix)
        ) as import('@babylonjs/core').TransformNode
      n.computeWorldMatrix(true)
      return n.getAbsolutePosition()
    }
    const noseGear = abs('Nose Gear')
    const mainL = abs('Main Gear (L)')
    const mainR = abs('Main Gear (R)')

    // the nose gear sits forward of the mains — forward is wrapper +Z
    expect(noseGear.z).toBeGreaterThan(mainL.z)
    expect(noseGear.z).toBeGreaterThan(mainR.z)
    expect(noseGear.z).toBeGreaterThan(0)
    // mains are laterally symmetric (no residual mirror or yaw)
    expect(mainL.x).toBeCloseTo(-mainR.x, 3)
    expect(mainL.z).toBeCloseTo(mainR.z, 3)

    // the scenic transform (the scout sits at an arbitrary angle in the
    // scene file) is discarded: the collapsed node carries no rotation
    const q = clone.rotationQuaternion!
    expect(q.x).toBeCloseTo(0)
    expect(q.y).toBeCloseTo(0)
    expect(q.z).toBeCloseTo(0)
    expect(Math.abs(q.w)).toBeCloseTo(1)

    wrap.dispose()
  })
})

/*
CANONICALIZE MUST DROP THE CONTENT NODE'S SCENE TRANSFORM.

It only ever zeroed the node it was handed — which on the glTF path is
`__root__`, the loader's own wrapper — while the authored object underneath kept
its scene placement. In test-3.glb `scout` sits at (-0.89, 0, -1.44), so the
control node the flight model steers was ~1.7m from the airframe, and
`applyCenterOfGravity` folded that offset into the PIVOT.

The user-visible cost: a CoG marker authored dead on the centreline (the
documented way) produced a pivot 1.75m off, while an odd-looking hand-tuned
marker silently compensated and came out right. Correct authoring was punished.
Re-exporting the scout "properly" is what started the phantom crashes.
*/
describe('canonicalize drops scenic dressing', () => {
  test('a MULTI-object scene file is left alone — layout is data, not dressing', async () => {
    /*
    This assertion used to loop over ALL children asserting position ~ 0, which
    pinned the BUG rather than the contract: test-3.glb's __root__ has 8
    children, 4 of them posed, and zeroing every one collapsed the scene into a
    pile. Reachable via b3dAircraft({url}), which hands the glTF __root__
    straight to canonicalize. Caught by the 0.7.0 pre-tag gate as B1.
    */
    const e = container.instantiateModelsToScene(undefined, false, {
      doNotInstantiate: true,
    })
    const root = e.rootNodes[0] as import('@babylonjs/core').TransformNode
    const kids = root.getChildren(
      (n) => n instanceof BABYLON.TransformNode,
      true
    ) as import('@babylonjs/core').TransformNode[]
    expect(kids.length).toBeGreaterThan(1) // a scene file, not a single model
    const posed = kids
      .filter((k) => k.position.length() > 0.01)
      .map((k) => ({ k, p: k.position.clone() }))
    expect(posed.length).toBeGreaterThan(0) // non-vacuous: something IS posed

    canonicalize(root, scene, 'ctl-multi')

    for (const { k, p } of posed) {
      expect(k.position.subtract(p).length()).toBeLessThan(1e-6)
    }
  })

  test('a SINGLE content node under __root__ does lose its scene transform', async () => {
    const e = container.instantiateModelsToScene(undefined, false, {
      doNotInstantiate: true,
    })
    const root = e.rootNodes[0] as import('@babylonjs/core').TransformNode
    // Reduce to one content child, which is the shape canonicalize is FOR.
    const kids = root.getChildren(
      (n) => n instanceof BABYLON.TransformNode,
      true
    ) as import('@babylonjs/core').TransformNode[]
    const keep = kids.find((k) => k.position.length() > 0.01)!
    for (const k of kids) if (k !== keep) k.parent = null
    expect(keep.position.length()).toBeGreaterThan(0.01)

    canonicalize(root, scene, 'ctl-single')
    expect(keep.position.length()).toBeLessThan(1e-6)
  })

  test('a centreline-authored CoG installs a centreline pivot', async () => {
    /*
    Reduced to ONE content node first, because that is the shape canonicalize
    is for. The earlier version ran against the whole 8-object scene file and
    only passed because the function was (wrongly) flattening every child —
    so it was asserting the contract via the bug. See B1.
    */
    const { applyCenterOfGravity } = await import('./model-transform')
    const e = container.instantiateModelsToScene(undefined, false, {
      doNotInstantiate: true,
    })
    const root = e.rootNodes[0] as import('@babylonjs/core').TransformNode
    const kids = root.getChildren(
      (n) => n instanceof BABYLON.TransformNode,
      true
    ) as import('@babylonjs/core').TransformNode[]
    const scout = kids.find((k) =>
      k.getDescendants(false).some((d) => /centerofgravity/i.test(d.name))
    )!
    for (const k of kids) if (k !== scout) k.parent = null

    const control = canonicalize(root, scene, 'ctl-cog')
    control.computeWorldMatrix(true)
    applyCenterOfGravity(control)
    // Lateral is the one that must be zero on a symmetric airframe: a pivot off
    // the centreline makes the aircraft swing sideways when it banks.
    expect(Math.abs(control.getPivotPoint().x)).toBeLessThan(1e-3)
  })
})
