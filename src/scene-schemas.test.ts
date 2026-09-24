import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'
import { sceneSchemas, SCENE_OMITTED } from './scene-schemas.js'

/*
The TEST needs a DOM because it imports the real components; the shipped module
does not, and that asymmetry is the point. `scene-schemas` itself is verified
DOM-free by `no-dom.test.ts`.
*/
beforeAll(() => {
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
})

/*
THE DRIFT GATE.

`scene-schemas` duplicates each component's attribute names and defaults,
because reading them at runtime would mean importing Babylon — and being
importable WITHOUT Babylon is the whole point of the module.

A copy is only acceptable if it cannot silently rot. This test imports the real
components and fails on any divergence, which is precisely the failure ensemble
hit hand-copying our skybox: six of sixteen attributes carried across, and an
`applyFog` default that disagreed with ours in the direction nothing checks.

Reading `initAttributes` off the CLASS needs no DOM — it is a static.
*/

const SOURCES: Array<[keyof typeof sceneSchemas, string, string]> = [
  ['skybox', './b3d-skybox', 'B3dSkybox'],
  ['sun', './b3d-shadows', 'B3dSun'],
  ['water', './b3d-water', 'B3dWater'],
  ['fog', './b3d-fog', 'B3dFog'],
  ['clouds', './b3d-clouds', 'B3dClouds'],
  ['ambient', './b3d-ambient', 'B3dAmbient'],
  ['light', './b3d-light', 'B3dLight'],
  ['ground', './b3d-primitives', 'B3dGround'],
  ['terrain', './b3d-terrain', 'B3dTerrain'],
  ['reflections', './b3d-reflections', 'B3dReflections'],
  ['cloudDeck', './b3d-cloud-deck', 'B3dCloudDeck'],
]

const attrsOf = async (mod: string, cls: string) => {
  const m = (await import(mod)) as Record<string, any>
  return m[cls].initAttributes as Record<string, unknown>
}

describe.each(SOURCES)('%s schema matches the component', (key, mod, cls) => {
  test('every attribute is described', async () => {
    const attrs = await attrsOf(mod, cls)
    const props = (sceneSchemas[key]() as any).properties
    const omitted = SCENE_OMITTED[key] ?? []
    const missing = Object.keys(attrs).filter(
      (k) => !(k in props) && !omitted.includes(k)
    )
    // The exact failure ensemble hit: attributes that were never hidden
    // deliberately, just not copied. An omission has to be DECLARED, so a
    // forgotten attribute fails here and a declined one does not.
    expect(missing).toEqual([])
  })

  test('nothing is described that does not exist', async () => {
    const attrs = await attrsOf(mod, cls)
    const props = (sceneSchemas[key]() as any).properties
    const extra = Object.keys(props).filter((k) => !(k in attrs))
    expect(extra).toEqual([])
    // And an omission list may not name something that does not exist either,
    // or it becomes a place stale names go to hide.
    const stale = (SCENE_OMITTED[key] ?? []).filter((k) => !(k in attrs))
    expect(stale).toEqual([])
  })

  test('every default agrees', async () => {
    const attrs = await attrsOf(mod, cls)
    const props = (sceneSchemas[key]() as any).properties
    const disagree: string[] = []
    const omitted = SCENE_OMITTED[key] ?? []
    for (const [k, v] of Object.entries(attrs)) {
      if (omitted.includes(k)) continue
      const d = props[k]?.default
      if (d !== v)
        disagree.push(
          `${k}: schema ${JSON.stringify(d)} vs component ${JSON.stringify(v)}`
        )
    }
    // `applyFog` defaulted true on their side and false on ours. Same name,
    // same component, opposite behaviour, nothing failing.
    expect(disagree).toEqual([])
  })

  test('an enum lists a superset of the default', async () => {
    const props = (sceneSchemas[key]() as any).properties
    for (const spec of Object.values<any>(props)) {
      if (spec.enum) expect(spec.enum).toContain(spec.default)
    }
    expect(Object.keys(props).length).toBeGreaterThan(0)
  })
})

describe('the shape a generated panel relies on', () => {
  test('units are spelled x-unit, never bare unit (tosijs-3d#85)', () => {
    // 0.8.3 shipped three fields saying `unit`, which a consumer reading
    // `x-unit` silently showed without one.
    for (const make of Object.values(sceneSchemas)) {
      for (const [k, spec] of Object.entries<any>((make() as any).properties))
        expect([k, 'unit' in spec]).toEqual([k, false])
    }
  })

  test('every fetched string says so (tosijs-3d#91)', () => {
    // A consumer applying an https rule needs to know which strings are
    // fetched without a hand-kept list. These are the ones today; a new URL
    // field without `format` fails the next test instead of passing silently.
    const fetched: Record<string, string[]> = {
      skybox: ['nebulaTexture', 'starfieldCube', 'starfieldData'],
      water: ['normalMap'],
      clouds: ['model'],
      ground: ['texture'],
    }
    for (const [key, names] of Object.entries(fetched)) {
      const props = (sceneSchemas as any)[key]().properties
      for (const n of names)
        expect([key, n, props[n].format]).toEqual([key, n, 'uri-reference'])
    }
    expect(
      (sceneSchemas.ground() as any).properties.texture['x-keywords']
    ).toEqual(['checker', 'noise'])
  })

  test('no plain string field is left unclassified', () => {
    // Every string is a colour, an enum, a URL — or on this short list of
    // strings that are none of those. A new plain string has to be put in
    // one of the four, which is the point.
    const plain = new Set(['skybox.starfieldTilt', 'ground.meshName'])
    for (const [key, make] of Object.entries(sceneSchemas)) {
      for (const [k, spec] of Object.entries<any>((make() as any).properties)) {
        if (spec.type !== 'string' || spec.format || spec.enum) continue
        expect(plain.has(`${key}.${k}`) ? 'listed' : `${key}.${k}`).toBe(
          'listed'
        )
      }
    }
  })

  test('no x-widget anywhere — these render as ordinary controls', () => {
    // A widget token says "hand the whole value to a custom editor". Correct
    // for a light program; here it would point at an editor that does not
    // exist and break the panel that works.
    for (const make of Object.values(sceneSchemas)) {
      const s = make() as any
      expect(s['x-widget']).toBeUndefined()
      for (const spec of Object.values<any>(s.properties)) {
        expect(spec['x-widget']).toBeUndefined()
      }
    }
  })

  test('every property has a type and a default', async () => {
    for (const make of Object.values(sceneSchemas)) {
      for (const [, spec] of Object.entries<any>((make() as any).properties)) {
        expect(typeof spec.type).toBe('string')
        expect(spec).toHaveProperty('default')
      }
    }
  })

  test('numeric ranges are the right way round and contain the default', async () => {
    for (const make of Object.values(sceneSchemas)) {
      for (const [k, spec] of Object.entries<any>((make() as any).properties)) {
        if (spec.type !== 'number') continue
        if (spec.minimum != null && spec.maximum != null) {
          expect(spec.minimum).toBeLessThan(spec.maximum)
        }
        if (spec.minimum != null)
          expect(spec.default).toBeGreaterThanOrEqual(spec.minimum)
        if (spec.maximum != null)
          expect(spec.default).toBeLessThanOrEqual(spec.maximum)
        expect(k).toBeTruthy()
      }
    }
  })

  test('`extra` merges, so a consumer can title a field', () => {
    const s = sceneSchemas.fog({ title: 'Weather', 'x-group': 'env' }) as any
    expect(s.title).toBe('Weather')
    expect(s['x-group']).toBe('env')
    expect(s.properties.mode.enum).toContain('exp2')
  })
})

/*
METADATA IS THE POINT, not decoration.

Tonio: "it's not at all obvious when a scale is actually a frequency and where
the useful values are." A consumer reading only the schema puts a linear 0..1
slider on `grossScale`, and every useful value lands in the first three pixels —
which is precisely what happened in tosijs-3d-ensemble (#66), three separate
ways in one day.

So the hints are load-bearing and worth pinning: lose them and the schema still
validates while the panel built from it becomes unusable again.
*/
describe('terrain metadata carries what the name hides', () => {
  const props = (sceneSchemas.terrain() as any).properties as Record<
    string,
    any
  >

  test('the frequencies say so — unit, log track, and the reciprocal', () => {
    for (const key of ['grossScale', 'detailScale']) {
      expect(props[key]['x-unit']).toBe('1/m')
      expect(props[key]['x-scale']).toBe('log')
      // The number a person actually thinks in is the feature SIZE.
      expect(props[key]['x-wavelength']).toBe(true)
      expect(props[key].description).toMatch(/cycles per metre/i)
    }
  })

  test('and where the useful values live', () => {
    // The default must sit inside its own recommended band, or the hint is
    // advice the library does not take.
    for (const key of ['grossScale', 'detailScale']) {
      const [lo, hi] = props[key]['x-useful'] as [number, number]
      expect(props[key].default).toBeGreaterThanOrEqual(lo)
      expect(props[key].default).toBeLessThanOrEqual(hi)
    }
  })

  test('reach declares the pairing a schema cannot express', () => {
    expect(props.reach['x-couples-with']).toBe('tileSize')
    expect(props.reach.description).toMatch(/tileSize/)
  })

  test('surfaceType offers only what the element implements', () => {
    // `plane` was advertised and never existed — a consumer offered it in a
    // picker and users silently got a cylinder.
    expect(props.surfaceType.enum).toEqual(['cylinder', 'torus', 'sphere'])
  })
})
