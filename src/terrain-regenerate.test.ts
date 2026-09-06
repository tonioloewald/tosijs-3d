import { describe, test, expect, beforeAll } from 'bun:test'

/*
A CONFIGURED TERRAIN THAT DRAWS NOTHING IS A SILENT FAILURE.

`<tosi-b3d-terrain>` produced a tile pool and filled it only when told — 120
meshes, `isVisible: false`, no bounds — so a terrain with its attributes set
rendered nothing until someone called `regenerate()`. The docs said "set it,
then regenerate()" for `provinceField`/`landform`/`patchMask`, and it turned out
to be true of the ORDINARY attributes too (tosijs-3d-ensemble, #66).

Every consumer then reinvented the same bounded retry, slightly differently.

What makes the fix cheap rather than expensive is that only GENERATION
attributes count — a `wireframe` toggle is a material tweak, not a new planet.

⚠️ THIS FILE USED TO RE-IMPLEMENT ALL OF THAT. It carried its own copy of the
22-attribute generation key and a `harness()` that counted rebuilds against
that copy, so it could not observe the module at all: deleting the fix left it
green, and the duplicated key was a second address that drifts. It now drives
the REAL element against a NullEngine, which is what caught the frame-budget
blowout the mirrored version was blind to (M6, below).

Thrashing needs no handling of ours: tosijs coalesces renders (`queueRender`
sets a per-element flag and schedules ONE rAF), so five attribute writes in a
task produce a single `render()`. That is a property of the framework, not a
mechanism here — a first version reimplemented the batching a layer down before
Tonio pointed it out. What IS ours is what that one render then costs.
*/

let T: typeof import('./b3d-terrain.js')
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
  T = await import('./b3d-terrain.js')
})

/**
 * A live terrain over a NullEngine, with `generateTileMesh` counted.
 *
 * The counter is the measurement that matters: every assertion below is about
 * how much geometry one frame is allowed to re-cut, and nothing else here can
 * see that. `set` writes attributes the way tosijs's setter does WITHOUT
 * rendering, so `frame()` is the single coalesced render those writes earn.
 */
const terrain = (attrs: Record<string, unknown> = {}) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const camera = new BABYLON.FreeCamera(
    'cam',
    new BABYLON.Vector3(0, 10, 0),
    scene
  )
  scene.activeCamera = camera
  /*
  ⚠️ ASSIGNED AS PROPERTIES, not through the creator's config. tosijs drains an
  element's attributes on `connectedCallback`, and nothing here is ever in a
  document — so a value passed to `b3dTerrain({...})` sits in an attribute the
  element has not read yet, and every assertion silently measures the DEFAULT
  world instead of the configured one.
  */
  const el = T.b3dTerrain({}) as any
  /*
  Big enough that the pool actually FILLS (80 tiles here). A small world places
  four tiles, which every budget in the table clears in one frame — so the
  budget assertions below would pass against the unbounded path too.
  */
  Object.assign(el, {
    tileSize: 20,
    lodLevels: 4,
    reach: 600,
    hiResSubdivisions: 16,
    ...attrs,
  })

  let builds = 0
  const owner: any = {
    scene,
    register: () => {},
    addSceneListener: () => {},
    whenReady: (cb: () => void) => cb(),
    addDebugSource: () => () => {},
    addOriginListener: () => {},
    removeOriginListener: () => {},
  }
  const proto = Object.getPrototypeOf(el).generateTileMesh
  el.generateTileMesh = function (...args: unknown[]) {
    builds++
    return proto.apply(this, args)
  }

  el.sceneReady(owner, scene)

  return {
    el,
    scene,
    get pool(): any[] {
      return el.pool
    },
    get builds() {
      return builds
    },
    reset() {
      builds = 0
    },
    /** How many tiles are drawing geometry older than the current attributes. */
    get stale() {
      return el.pool.filter((t: any) => t.stale).length
    },
    /** How much of the world is on screen at all. */
    get visible() {
      return el.pool.filter((t: any) => t.mesh.isVisible).length
    },
    /** Tiles holding a cell — what a full rebuild has to re-cut. */
    get placed() {
      return el.pool.filter((t: any) => t.cell != null).length
    },
    set(next: Record<string, unknown>) {
      Object.assign(el, next)
    },
    /** The one coalesced render tosijs schedules for a burst of writes. */
    frame() {
      el.render()
    },
    /** A subsequent frame with no attribute change — the streamer's own pass. */
    idleFrame() {
      el.update()
    },
  }
}

describe('regenerate on change', () => {
  test('a configured terrain is FILLED at setup — the reported case', () => {
    // #66 itself: the pool existed and nothing put ground in it.
    const t = terrain()
    expect(t.placed).toBeGreaterThan(0)
    expect(t.visible).toBe(t.placed)
  })

  test('setting a generation attribute rebuilds', () => {
    const t = terrain()
    t.reset()
    t.set({ grossScale: 0.05 })
    t.frame()
    expect(t.builds).toBeGreaterThan(0)
  })

  test('setting nothing rebuilds nothing', () => {
    const t = terrain()
    t.reset()
    t.frame()
    t.frame()
    expect(t.builds).toBe(0)
  })

  test('writing the SAME value is not a change', () => {
    const t = terrain({ grossScale: 0.015 })
    t.reset()
    t.set({ grossScale: 0.015 })
    t.frame()
    expect(t.builds).toBe(0)
  })

  test('a MATERIAL attribute does not rebuild the world', () => {
    // `wireframe` and `debugColor` are not in the generation key. Rebuilding
    // for them would make a debug toggle cost a full terrain regeneration.
    const t = terrain()
    t.reset()
    t.set({ wireframe: true })
    t.frame()
    expect(t.builds).toBe(0)
  })

  test('successive edits each rebuild', () => {
    const t = terrain()
    t.reset()
    t.set({ seed: 2 })
    t.frame()
    const first = t.builds
    t.set({ seed: 3 })
    t.frame()
    expect(t.builds).toBeGreaterThan(first)
  })
})

describe('an attribute change is BUDGETED — a drag is not a rebuild per frame', () => {
  /*
  M6. tosijs queues one render per rAF and `slider3d` writes on every `move`,
  so an attribute-driven rebuild that clears the pool and refills it unbounded
  is one FULL rebuild every animation frame for as long as you drag.

  Measured with this repo's own PerlinNoise: ~50 ms of noise alone at the high
  tier (120 tiles × 25² verts) against a `tileBuildMs` of 4, and ~6.3 ms at the
  quest tier inside a 13.9 ms VR frame — before skirts, normals and 56–120
  vertex uploads. perf-probe's own comment: "a dropped frame is nausea, not
  jank."
  */

  test('one render re-cuts only part of the pool, not all of it', () => {
    const t = terrain()
    t.reset()
    t.set({ grossAmplitude: 40 })
    t.frame()
    expect(t.builds).toBeGreaterThan(0)
    expect(t.builds).toBeLessThan(t.placed)
  })

  test('and the world stays on screen while it catches up', () => {
    /*
    The reason it MARKS rather than clears. Clearing under a budget would be
    worse than the hitch it fixes: the world would blink out and stream back a
    handful of tiles per frame for as long as the slider moved.
    */
    const t = terrain()
    t.set({ grossAmplitude: 40 })
    t.frame()
    expect(t.visible).toBe(t.placed)
    expect(t.stale).toBeGreaterThan(0)
  })

  test('every frame of a sustained drag stays budgeted', () => {
    // The case the mirrored harness could not express at all: the cost is per
    // FRAME, and a drag is many frames each carrying a fresh change.
    const t = terrain()
    for (let i = 0; i < 8; i++) {
      t.reset()
      t.set({ grossAmplitude: 10 + i })
      t.frame()
      expect(t.builds).toBeLessThan(t.placed)
    }
  })

  test('the backlog does drain — budgeted is not "never finishes"', () => {
    const t = terrain()
    t.set({ grossAmplitude: 40 })
    t.frame()
    expect(t.stale).toBeGreaterThan(0)
    // Let the ordinary per-frame streamer run, as `registerBeforeRender` does.
    for (let i = 0; i < 200 && t.stale > 0; i++) t.idleFrame()
    expect(t.stale).toBe(0)
  })
})

describe('regenerate() is still the unbounded one', () => {
  test('it rebuilds the whole pool in a single call', () => {
    // The explicit API keeps its contract: the caller asked for the new world
    // and is willing to pay a frame for it.
    const t = terrain()
    t.reset()
    t.el.regenerate()
    expect(t.builds).toBe(t.placed)
    expect(t.stale).toBe(0)
  })

  test('and the render it races does NOT rebuild the same world again', () => {
    /*
    The documented flow is "set the attributes, then call regenerate()" — but
    those writes have already queued a render. `regenerate()` therefore adopts
    the key it is about to satisfy, or the sequence pays for two full rebuilds.
    */
    const t = terrain()
    t.set({ seed: 7, grossScale: 0.04 })
    t.reset()
    t.el.regenerate()
    const paid = t.builds
    t.frame() // the render those attribute writes queued
    expect(t.builds).toBe(paid)
  })
})
