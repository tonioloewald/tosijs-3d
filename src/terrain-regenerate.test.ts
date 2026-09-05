import { describe, test, expect } from 'bun:test'

/*
A CONFIGURED TERRAIN THAT DRAWS NOTHING IS A SILENT FAILURE.

`<tosi-b3d-terrain>` produced a tile pool and filled it only when told — 120
meshes, `isVisible: false`, no bounds — so a terrain with its attributes set
rendered nothing until someone called `regenerate()`. The docs said "set it,
then regenerate()" for `provinceField`/`landform`/`patchMask`, and it turned out
to be true of the ORDINARY attributes too (tosijs-3d-ensemble, #66).

Every consumer then reinvented the same bounded retry, slightly differently.

Two properties make the fix safe rather than expensive, and both are modelled
here: only GENERATION attributes count (a `wireframe` toggle is a material
tweak, not a new planet), and a burst of writes collapses into ONE rebuild.
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

/** render() + the frame hook, as they now stand. */
const harness = (attrs: Record<string, unknown>) => {
  let genKey = key(attrs)
  let pending = false
  let rebuilds = 0
  return {
    set(next: Record<string, unknown>) {
      Object.assign(attrs, next)
      const k = key(attrs) // render()
      if (k === genKey) return
      genKey = k
      pending = true
    },
    frame() {
      if (!pending) return
      pending = false
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
    // Deferring to the frame is what buys this; regenerating inside render()
    // would cost five rebuilds for one edit to a settings panel.
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
