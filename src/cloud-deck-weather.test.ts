import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE CLOUD DECK'S LOCAL WEATHER CHANNEL, driven for real.

The deck bakes a per-vertex "local weather" value (orographic lift, or a custom
`weather` field) into its mesh's colour channel, and only re-bakes when
something that value depends on moves. Everything here reads that CONSUMER —
the baked channel, or how many times the field was actually built — never the
writer's intent. That is the lesson of the 0.8.3 gate: a "live" value has to
be asserted where it lands, and again after a lifecycle event.
*/

let D: typeof import('./b3d-cloud-deck.js')
let BABYLON: typeof import('@babylonjs/core')

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
  g.document ??= win.document
  BABYLON = await import('@babylonjs/core')
  D = await import('./b3d-cloud-deck.js')
})

/** A stand-in terrain: a flat plateau at `height`, with a settable shape key. */
const fakeTerrain = (height: number) => ({
  isConnected: true,
  generationKey: 'g1',
  height,
  heightSampler() {
    return () => this.height
  },
})

/** A scene + owner stub whose `querySelector` finds the terrain we hand it. */
const world = (terrain: ReturnType<typeof fakeTerrain> | null) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const camera = new BABYLON.FreeCamera(
    'cam',
    new BABYLON.Vector3(0, 10, 0),
    scene
  )
  scene.activeCamera = camera
  const owner: any = {
    scene,
    register: () => {},
    addSceneListener: () => {},
    removeSceneListener: () => {},
    addOriginListener: () => {},
    removeOriginListener: () => {},
    addFogLayer: () => () => {},
    whenReady: (cb: () => void) => cb(),
    querySelector: (sel: string) =>
      sel === 'tosi-b3d-terrain' ? terrain : null,
  }
  return { scene, camera, owner }
}

/**
 * What B3dChild does on (re)connect: set `owner`, THEN call `sceneReady`. The
 * deck relies on that order — its terrain lookup goes through `this.owner` —
 * so calling `sceneReady` alone attaches a deck that cannot see its world.
 */
const attach = (el: any, w: ReturnType<typeof world>) => {
  el.owner = w.owner
  el.sceneReady(w.owner, w.scene)
}

/**
 * A live deck. Attributes are assigned as PROPERTIES (nothing here is in a
 * document, so creator config would sit unread in attributes), and the field
 * builder is counted, because "did it re-bake" is the question.
 */
const deck = (attrs: Record<string, unknown>, w: ReturnType<typeof world>) => {
  const el = D.b3dCloudDeck({}) as any
  // shadows OFF: the cloud shadow paints into a 2D canvas, which happy-dom
  // does not have, and it has nothing to do with the weather channel here.
  Object.assign(el, { shadows: 'off', ...attrs })
  let builds = 0
  const proto = Object.getPrototypeOf(el)._weatherField
  el._weatherField = function (...args: unknown[]) {
    builds++
    return proto.apply(this, args)
  }
  attach(el, w)
  return {
    el,
    get builds() {
      return builds
    },
    reset() {
      builds = 0
    },
    /** The baked local-weather value, max over the deck's vertices. */
    get weather() {
      const c = el.mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind)
      let max = 0
      for (let i = 0; i < c.length; i += 4) max = Math.max(max, c[i])
      return max
    },
    /** One frame of the scene the deck lives in NOW — after a move, that is
     * not the scene it was created in (rendering the old one silently tested
     * nothing: the moved deck never ran a frame). */
    frame() {
      el.owner.scene.render()
    },
  }
}

describe('the weather channel survives a lifecycle event', () => {
  test('dispose + re-attach bakes the NEW mesh, not a memo of the old one', () => {
    const w = world(fakeTerrain(1000)) // far above orographicPeak: full lift
    const d = deck({ orographic: 0.8 }, w)
    d.frame()
    expect(d.weather).toBeGreaterThan(0.5)
    d.el.sceneDispose()
    attach(d.el, w)
    d.frame()
    // Fresh meshes start at zero; only a real re-bake puts the lift back.
    expect(d.weather).toBeGreaterThan(0.5)
  })

  test("a deck moved into another scene reads THAT scene's terrain", () => {
    const mountains = world(fakeTerrain(1000))
    const d = deck({ orographic: 0.8 }, mountains)
    d.frame()
    expect(d.weather).toBeGreaterThan(0.5)
    // Re-parent into a flat world. The old terrain is still "connected",
    // which is exactly when a stale cached lookup would keep answering.
    // Its own shape key, so a stale memo cannot mask the bug by skipping the
    // bake: the NEW world must be sampled, not merely left at zero.
    const flatTerrain = fakeTerrain(0)
    flatTerrain.generationKey = 'flat'
    const flat = world(flatTerrain)
    // And the viewer somewhere else, so the deck's grid snaps and a bake
    // HAPPENS — the bug is which terrain that bake samples.
    flat.camera.position.x = 2000
    d.el.sceneDispose()
    attach(d.el, flat)
    d.frame()
    expect(d.weather).toBe(0)
  })
})

describe('the field is built only when something it depends on moved', () => {
  test('an idle frame does not rebuild it', () => {
    const w = world(fakeTerrain(1000))
    const d = deck({ orographic: 0.8 }, w)
    d.frame()
    d.reset()
    d.frame()
    d.frame()
    expect(d.builds).toBe(0)
  })

  test('a new terrain shape rebuilds it', () => {
    const t = fakeTerrain(1000)
    const w = world(t)
    const d = deck({ orographic: 0.8 }, w)
    d.frame()
    d.reset()
    t.height = 0
    t.generationKey = 'g2'
    d.frame()
    expect(d.builds).toBe(1)
    expect(d.weather).toBe(0)
  })

  test('swapping one custom weather function for another rebuilds it', () => {
    const w = world(null)
    const d = deck({}, w)
    d.el.weather = () => 0.25
    d.frame()
    expect(d.weather).toBeCloseTo(0.25, 5)
    d.reset()
    d.el.weather = () => 0.75
    d.frame()
    expect(d.builds).toBe(1)
    expect(d.weather).toBeCloseTo(0.75, 5)
  })

  test('with NO field in force it bakes zeros once — not on every terrain rebuild', () => {
    const t = fakeTerrain(1000)
    const w = world(t)
    const d = deck({ orographic: 0 }, w)
    d.frame()
    expect(d.weather).toBe(0)
    d.reset()
    for (let i = 2; i < 6; i++) {
      t.generationKey = `g${i}` // a terrain slider being dragged
      d.frame()
    }
    expect(d.builds).toBe(0)
    // ...and turning orographic ON still bakes the lift.
    d.el.orographic = 0.8
    d.frame()
    expect(d.builds).toBe(1)
    expect(d.weather).toBeGreaterThan(0.5)
  })
})
