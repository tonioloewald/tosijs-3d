import { describe, test, expect } from 'bun:test'
import { landformSchemas, landformDerived } from './landform-schemas.js'
import { volcano, impactCrater, pad, gulley, cover } from './landform.js'

const factories: Record<string, (o: any) => any> = {
  volcano: (o) => volcano(o).landform,
  impactCrater: (o) => impactCrater(o).landform,
  pad,
  gulley,
  cover,
}

/** The options a host would start a piece with: required fields only. */
function minimal(s: any): Record<string, number> {
  const o: Record<string, number> = {}
  for (const k of s.required) o[k] = s.properties[k].default
  return o
}

/** Every option spelled out: plain defaults, then derived ones from them. */
function full(s: any): Record<string, number> {
  const o = minimal(s)
  for (const [k, p] of Object.entries<any>(s.properties))
    if (!(k in o) && 'default' in p) o[k] = p.default
  for (const k of Object.keys(s.properties))
    if (!(k in o)) o[k] = landformDerived(s, k, o)!
  return o
}

describe.each(Object.keys(landformSchemas))('%s', (name) => {
  const s = (landformSchemas as any)[name]() as any

  test('spelling out every default draws the same ground as leaving it out', () => {
    const a = factories[name](minimal(s))
    const b = factories[name](full(s))
    // A grid over the footprint, plus the ambient ground it sits on.
    for (let x = -500; x <= 500; x += 25)
      for (let z = -500; z <= 500; z += 25)
        for (const h of [-20, 5, 60])
          expect([x, z, h, b(x, z, h)]).toEqual([x, z, h, a(x, z, h)])
  })

  test('derived fields carry no frozen default, and name a real source', () => {
    for (const [k, p] of Object.entries<any>(s.properties)) {
      if (p['x-derived'] == null) continue
      expect([k, 'default' in p]).toEqual([k, false])
      expect(Object.keys(s.properties)).toContain(p['x-derived'].from)
    }
  })

  test('x and z are the position, and required', () => {
    expect(s.properties.x['x-position']).toBe(true)
    expect(s.properties.z['x-position']).toBe(true)
    expect(s.required).toContain('x')
    expect(s.required).toContain('z')
  })

  test('defaults sit inside their ranges', () => {
    for (const p of Object.values<any>(s.properties)) {
      if (!('default' in p)) continue
      if (p.minimum != null) expect(p.default).toBeGreaterThanOrEqual(p.minimum)
      if (p.maximum != null) expect(p.default).toBeLessThanOrEqual(p.maximum)
    }
  })
})

test("a volcano's activity default is extinct, with no vent", () => {
  const s = landformSchemas.volcano() as any
  expect(s.properties.activity.default).toBe(0)
  expect(volcano(minimal(s) as any).vents ?? []).toEqual([])
  expect(volcano({ ...(minimal(s) as any), activity: 0.5 }).vents).toHaveLength(
    1
  )
})
