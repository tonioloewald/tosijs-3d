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
