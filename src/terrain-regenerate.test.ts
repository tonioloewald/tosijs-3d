import { describe, test, expect } from 'bun:test'

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

Thrashing needs no handling of ours: tosijs coalesces renders (`queueRender`
sets a per-element flag and schedules ONE rAF), so five attribute writes in a
task produce a single `render()`. The burst test below documents that property
of the framework rather than a mechanism here — a first version of this
reimplemented the batching a layer down before Tonio pointed it out.
*/

/** The generation key, over the attributes that determine the world. */
const key = (a: Record<string, unknown>) =>
  [
    a.seed,
    a.surfaceType,
    a.radius,
    a.majorRadius,
    a.minorRadius,
    a.cylinderHeight,
    a.grossScale,
    a.detailScale,
    a.horizScale,
    a.grossAmplitude,
    a.detailAmplitude,
    a.baseHeight,
    a.center,
    a.tileSize,
    a.lodLevels,
    a.splitFactor,
    a.reach,
    a.hiResSubdivisions,
    a.normalSmoothing,
    a.biome,
    a.biomeSeaLevel,
    a.biomeLapseRate,
  ].join('|')

/**
 * `render()`, plus tosijs's coalescing.
 *
 * `set` only stages a value — nothing renders synchronously. `frame()` is the
 * single queued render that tosijs schedules however many attributes changed,
 * which is the property the burst test is about.
 */
const harness = (attrs: Record<string, unknown>) => {
  let genKey = key(attrs)
  let rebuilds = 0
  return {
    set(next: Record<string, unknown>) {
      Object.assign(attrs, next)
    },
    /** The one coalesced render. */
    frame() {
      const k = key(attrs)
      if (k === genKey) return
      genKey = k
      rebuilds++
    },
    get rebuilds() {
      return rebuilds
    },
  }
}

const base = { seed: 1, grossScale: 0.015, tileSize: 10, wireframe: false }

describe('regenerate on change', () => {
  test('setting a generation attribute rebuilds — the reported case', () => {
    const h = harness({ ...base })
    h.set({ grossScale: 0.05 })
    h.frame()
    expect(h.rebuilds).toBe(1)
  })

  test('setting nothing rebuilds nothing', () => {
    const h = harness({ ...base })
    h.frame()
    h.frame()
    expect(h.rebuilds).toBe(0)
  })

  test('writing the SAME value is not a change', () => {
    const h = harness({ ...base })
    h.set({ grossScale: 0.015 })
    h.frame()
    expect(h.rebuilds).toBe(0)
  })

  test('a burst of writes is ONE rebuild, not five', () => {
    // Bought by tosijs's render batching, not by anything here: five writes in
    // one task schedule a single render, so `regenerate()` runs once.
    const h = harness({ ...base })
    h.set({ seed: 2 })
    h.set({ grossScale: 0.02 })
    h.set({ tileSize: 20 })
    h.set({ lodLevels: 4 })
    h.set({ reach: 800 })
    h.frame()
    expect(h.rebuilds).toBe(1)
  })

  test('a MATERIAL attribute does not rebuild the world', () => {
    // `wireframe` and `debugColor` are not in the key. Rebuilding for them
    // would make a debug toggle cost a full terrain regeneration.
    const h = harness({ ...base })
    h.set({ wireframe: true })
    h.frame()
    expect(h.rebuilds).toBe(0)
  })

  test('successive edits each rebuild once', () => {
    const h = harness({ ...base })
    h.set({ seed: 2 })
    h.frame()
    h.set({ seed: 3 })
    h.frame()
    expect(h.rebuilds).toBe(2)
  })
})
