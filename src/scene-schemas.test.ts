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
