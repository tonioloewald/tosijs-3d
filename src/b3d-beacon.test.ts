import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE ONE INVARIANT WORTH A TEST WITH AN ENGINE IN IT.

A beacon is an INVISIBLE hull whose only job is to be picked, and Babylon's
default pick test is `isEnabled() && isVisible && isPickable`. Hide it the
obvious way — `isVisible = false` — and it silently stops being pickable, which
is the whole feature.

Measured against a live scene when this was built, and reproduced here so a
later "tidy-up" cannot quietly undo it:

  visibility = 0                     scene.pick returns THE HULL
  isVisible  = false                 scene.pick returns whatever is BEHIND it
  isVisible  = false, with predicate  scene.pick returns the hull

The middle row is the danger, and note what it does: it does not throw and it
does not return nothing — it returns a DIFFERENT object. A consumer sees the
wrong thing selected, which is far harder to attribute than a dead click.
*/

let BABYLON: typeof import('@babylonjs/core')
let scene: import('@babylonjs/core').Scene

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
  const engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
  const camera = new BABYLON.FreeCamera(
    'cam',
    new BABYLON.Vector3(0, 0, -10),
    scene
  )
  camera.setTarget(BABYLON.Vector3.Zero())
  scene.activeCamera = camera
})

/** A ray straight down −Z at the origin, which is where the hulls sit. */
const straightAt = () =>
  new BABYLON.Ray(new BABYLON.Vector3(0, 0, -10), new BABYLON.Vector3(0, 0, 1))

describe("an invisible hull's pickability", () => {
  test('visibility = 0 draws nothing AND stays pickable', () => {
    const hull = BABYLON.MeshBuilder.CreateBox('hull', { size: 1 }, scene)
    hull.visibility = 0
    hull.isVisible = true
    hull.isPickable = true
    hull.computeWorldMatrix(true)
    expect(scene.pickWithRay(straightAt())?.pickedMesh?.name).toBe('hull')
    hull.dispose()
  })

  test('isVisible = false returns what is BEHIND, not nothing', () => {
    const behind = BABYLON.MeshBuilder.CreateBox('behind', { size: 4 }, scene)
    behind.position.z = 5
    behind.computeWorldMatrix(true)
    const hull = BABYLON.MeshBuilder.CreateBox('hull', { size: 1 }, scene)
    hull.isVisible = false
    hull.isPickable = true
    hull.computeWorldMatrix(true)

    // The failure the doc warns about — a plausible wrong answer.
    expect(scene.pickWithRay(straightAt())?.pickedMesh?.name).toBe('behind')

    // ...and the workaround it forces: Babylon consults a predicate INSTEAD of
    // the visibility test rather than as well as it.
    expect(
      scene.pickWithRay(straightAt(), (m) => m === hull)?.pickedMesh?.name
    ).toBe('hull')

    hull.dispose()
    behind.dispose()
  })

  test('a visibility = 0 hull wins over what is behind it', () => {
    // The positive form of the case above: the reason a beacon works at all is
    // that it is a normal, nearer, pickable mesh that simply draws nothing.
    const behind = BABYLON.MeshBuilder.CreateBox('behind', { size: 4 }, scene)
    behind.position.z = 5
    behind.computeWorldMatrix(true)
    const hull = BABYLON.MeshBuilder.CreateBox('hull', { size: 1 }, scene)
    hull.visibility = 0
    hull.isPickable = true
    hull.computeWorldMatrix(true)
    expect(scene.pickWithRay(straightAt())?.pickedMesh?.name).toBe('hull')
    hull.dispose()
    behind.dispose()
  })
})

describe('and the element actually does it', () => {
  /*
  The block above characterises BABYLON; this one characterises US. Without it
  the file proves a fact about the engine and nothing about `b3d-beacon`, so
  flipping the hull back to `isVisible = false` left every assertion above
  green — the exact "tidy-up" the header says it exists to stop.
  */

  let B: typeof import('./b3d-beacon.js')
  let owner: any

  beforeAll(async () => {
    B = await import('./b3d-beacon.js')
    owner = {
      scene,
      register: () => {},
      addSceneListener: () => {},
      whenReady: (cb: () => void) => cb(),
      addDebugSource: () => () => {},
      addOriginListener: () => {},
      removeOriginListener: () => {},
    }
  })

  /*
  Attributes are assigned as PROPERTIES, not through the creator's config.
  tosijs drains an element's attributes on `connectedCallback`, and nothing here
  is ever in a document — so a value passed to `b3dBeacon({...})` sits in an
  attribute the element has not read yet and every assertion silently tests the
  default. (It did: `show: 'on'` read back as `'off'`.)
  */
  const beacon = (attrs: Record<string, unknown> = {}) => {
    const el = B.b3dBeacon({}) as any
    Object.assign(el, { follow: 'off', ...attrs })
    el.sceneReady(owner, scene)
    el.mesh.computeWorldMatrix(true)
    return el
  }

  test('the hull it builds is PICKED, with no predicate — the whole feature', () => {
    const behind = BABYLON.MeshBuilder.CreateBox('behind', { size: 4 }, scene)
    behind.position.z = 5
    behind.computeWorldMatrix(true)
    const el = beacon({ size: 1 })
    const hit = scene.pickWithRay(straightAt())?.pickedMesh
    expect(hit).toBe(el.mesh)
    // ...and it resolves back to the element, which is what a consumer needs.
    expect(B.beaconOwner(hit)).toBe(el)
    el.sceneDispose()
    behind.dispose()
  })

  test('a HIDDEN beacon is still pickable — hidden is not gone', () => {
    // `show="off"` is the case that would break first, because "invisible" is
    // exactly when reaching for `isVisible = false` feels right.
    const el = beacon({ size: 1, show: 'off' })
    expect(el.mesh.visibility).toBe(0)
    expect(el.mesh.isVisible).toBe(true)
    expect(scene.pickWithRay(straightAt())?.pickedMesh).toBe(el.mesh)
    el.sceneDispose()
  })

  test('a SHOWN beacon is faint rather than solid, and still pickable', () => {
    const el = beacon({ size: 1, show: 'on' })
    expect(el.mesh.visibility).toBeGreaterThan(0)
    expect(el.mesh.visibility).toBeLessThan(1)
    expect(scene.pickWithRay(straightAt())?.pickedMesh).toBe(el.mesh)
    el.sceneDispose()
  })
})
