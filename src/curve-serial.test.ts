import { describe, test, expect } from 'bun:test'
import {
  canonicalCurve,
  curveSchema,
  readCurve,
  validateCurve,
  CURVE_PRECISION,
} from './curve.js'

/*
THE INTEROP CONTRACT with tosijs-3d-ensemble (tosijs-3d#61).

A curve is stored in a file an author writes by hand, commits and diffs. Every
rule here is a consequence of that, not a preference — so each test names the
requirement it pins.
*/

describe('#1/#2 — canonical bytes, so a diff means something', () => {
  test('same input, same output', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.7 },
      { x: 1, y: 1 },
    ]
    expect(JSON.stringify(canonicalCurve(pts))).toBe(
      JSON.stringify(canonicalCurve(canonicalCurve(pts)))
    )
  })

  test('drag noise is rounded away', () => {
    // The actual complaint: nudging one control must not rewrite every number.
    const dragged = [
      { x: 0, y: 0 },
      { x: 0.5000000000000002, y: 0.6999999999999997 },
      { x: 1, y: 1 },
    ]
    expect(canonicalCurve(dragged)[1]).toEqual({ x: 0.5, y: 0.7 })
  })

  test('rounding is to the agreed precision', () => {
    const out = canonicalCurve([
      { x: 0, y: 0 },
      { x: 0.123456789, y: 0.987654321 },
      { x: 1, y: 1 },
    ])
    const decimals = (n: number) => (String(n).split('.')[1] ?? '').length
    expect(decimals(out[1].x)).toBeLessThanOrEqual(CURVE_PRECISION)
    expect(out[1].x).toBeCloseTo(0.1235, 6)
  })

  test('no negative zero — it serialises as -0 and reads as a spurious diff', () => {
    const out = canonicalCurve([
      { x: 0, y: -0.00001 },
      { x: 1, y: 1 },
    ])
    expect(Object.is(out[0].y, -0)).toBe(false)
    expect(JSON.stringify(out)).not.toContain('-0')
  })

  test('key order is stable, so JSON.stringify is stable', () => {
    const out = canonicalCurve([
      { y: 0.5, x: 0.5 } as any,
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ])
    expect(JSON.stringify(out[0])).toBe('{"x":0,"y":0}')
  })
})

describe('#2 — bare array is the default, the wrapper is ACCEPTED', () => {
  test('a bare array reads, taking its kind from the field', () => {
    const r = readCurve(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      'falloff'
    )
    expect(r.kind).toBe('falloff')
    expect(r.points.length).toBeGreaterThan(0)
  })

  test('a wrapper reads, and carries its OWN kind', () => {
    // For ensemble's open bags (Piece.meta, Zone.values) where no schema
    // applies, so a bare curve would lose its domain entirely.
    const r = readCurve({
      kind: 'falloff',
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    })
    expect(r.kind).toBe('falloff')
    // …and the falloff rule was applied, which needed the kind to be known.
    expect(r.points[r.points.length - 1].y).toBe(0)
  })

  test('null and nonsense degrade instead of throwing', () => {
    expect(() => readCurve(null)).not.toThrow()
    expect(() => readCurve(undefined)).not.toThrow()
    expect(() => readCurve({ points: 'nope' } as any)).not.toThrow()
  })
})

describe('#5 — validate reports, and NEVER throws', () => {
  const codes = (v: unknown) => validateCurve(v).map((i) => i.code)

  test('a non-curve is one error at the root', () => {
    const issues = validateCurve(42)
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('error')
    expect(issues[0].path).toBe('')
  })

  test('unknown fields are a WARNING — they are ignored, not fatal', () => {
    // A curve from a newer tosijs-3d must degrade in an older consumer.
    const issues = validateCurve([
      { x: 0, y: 0, tension: 0.5 },
      { x: 1, y: 1 },
    ])
    const unknown = issues.find((i) => i.code === 'curve/unknown-field')
    expect(unknown!.severity).toBe('warning')
    expect(unknown!.path).toBe('/0/tension')
  })

  test('out of range is a warning, not an error', () => {
    // Refusing to load a document over a 1.0001 helps nobody.
    const issues = validateCurve([
      { x: 0, y: 1.0001 },
      { x: 1, y: 1 },
    ])
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].code).toBe('curve/out-of-range')
  })

  test('a non-finite number IS an error', () => {
    expect(
      codes([
        { x: 0, y: NaN },
        { x: 1, y: 1 },
      ])
    ).toContain('curve/bad-number')
    expect(
      validateCurve([
        { x: 0, y: NaN },
        { x: 1, y: 1 },
      ])[0].severity
    ).toBe('error')
  })

  test('severity is only ever error or warning — no info', () => {
    const all = [
      validateCurve(42),
      validateCurve('x'),
      validateCurve([
        { x: 0, y: 2, junk: 1 },
        { x: 1, y: 1 },
      ]),
      validateCurve([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
      validateCurve({ kind: 'nope', points: [] } as any),
      validateCurve([]),
    ].flat()
    for (const i of all) expect(['error', 'warning']).toContain(i.severity)
  })

  test('paths are RELATIVE JSON Pointers, for the consumer to prefix', () => {
    // validateCurve knows nothing about ensembles; they join it to the field's
    // own path, which is theirs to do.
    const bare = validateCurve([
      { x: 0, y: 5 },
      { x: 1, y: 1 },
    ])
    expect(bare[0].path).toBe('/0/y')
    const wrapped = validateCurve({
      points: [
        { x: 0, y: 5 },
        { x: 1, y: 1 },
      ],
    })
    expect(wrapped[0].path).toBe('/points/0/y')
  })

  test('unsorted points warn rather than failing', () => {
    expect(
      codes([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ])
    ).toContain('curve/unsorted')
  })

  test('a valid curve produces nothing at all', () => {
    expect(
      validateCurve([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ])
    ).toEqual([])
  })

  test('it never throws, on anything', () => {
    for (const v of [
      null,
      undefined,
      0,
      '',
      [],
      {},
      [null],
      [{ x: 'a', y: 'b' }],
      { points: null },
      { kind: 7, points: [] },
    ]) {
      expect(() => validateCurve(v as any)).not.toThrow()
    }
  })
})

describe('#6 — the schema fragment a generated panel dispatches on', () => {
  test('token and domain are SEPARATE keys', () => {
    // Not "curve.falloff": a compound token would put string-parsing in the one
    // place that dispatches on the widget. Ensemble's other adjuncts
    // (x-unit, x-labels) follow the same rule.
    const s = curveSchema('falloff')
    expect(s['x-widget']).toBe('curve')
    expect(s['x-curve-kind']).toBe('falloff')
  })

  test('it describes the bare-array shape', () => {
    const s = curveSchema()
    expect(s.type).toBe('array')
    expect((s.items as any).required).toEqual(['x', 'y'])
  })

  test('extra keys can be merged for the field it lives on', () => {
    const s = curveSchema('profile', { title: 'Brightness', 'x-unit': '' })
    expect(s.title).toBe('Brightness')
    expect(s['x-widget']).toBe('curve')
  })
})

/*
THE WHOLE-LAMP SURFACE, for symmetry with the curve one.

A consumer that embeds a lamp in a document validates the whole document, so a
hole in the set means one field silently goes unchecked.
*/
describe('light settings: schema, canonical, validate', () => {
  test('the three widget tokens nest', async () => {
    const { lightSettingsSchema } = await import('./light-settings.js')
    const s = lightSettingsSchema() as any
    expect(s['x-widget']).toBe('light')
    expect(s.properties.program['x-widget']).toBe('light-program')
    expect(s.properties.program.properties.brightness['x-widget']).toBe('curve')
  })

  test('the token names the LIGHT, not the mechanism', async () => {
    // `curve-program` sounded generic while meaning one specific object, and
    // the province editor coming next is ALSO several curves over one
    // coordinate — the generic name would have been taken by the specific
    // case. A widget token is a wire contract, so this had to be right before
    // a consumer shipped a branch on it.
    const { lightProgramSchema } = await import('./light-modulation.js')
    expect((lightProgramSchema() as any)['x-widget']).toBe('light-program')
  })

  test('canonical light rounds every number and fixes key order', async () => {
    const { canonicalLight, DEFAULT_LIGHT } = await import(
      './light-settings.js'
    )
    const a = canonicalLight({ ...DEFAULT_LIGHT, intensity: 2.0000001 })
    const b = canonicalLight(a)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a.intensity).toBe(2)
  })

  test('an area light asking for shadows is a WARNING, not an error', async () => {
    // It runs — Babylon's RectAreaLight is not a ShadowLight, so the lamp warns
    // once and lights anyway. Same rule as inverted splits: the question is
    // whether a consumer can execute the document.
    const { validateLight } = await import('./light-settings.js')
    const issues = validateLight({ kind: 'area', shadows: true })
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].path).toBe('/shadows')
  })

  test('an unknown kind IS an error', async () => {
    const { validateLight } = await import('./light-settings.js')
    expect(validateLight({ kind: 'laser' })[0].severity).toBe('error')
  })

  test('nested program paths compose', async () => {
    const { validateLight } = await import('./light-settings.js')
    const issues = validateLight({
      kind: 'point',
      program: {
        brightness: [
          { x: 0, y: 5 },
          { x: 1, y: 1 },
        ],
      },
    })
    expect(issues[0].path).toBe('/program/brightness/0/y')
  })

  test('it never throws', async () => {
    const { validateLight } = await import('./light-settings.js')
    for (const v of [null, 0, '', [], {}, { program: 7 }, { intensity: 'x' }]) {
      expect(() => validateLight(v as any)).not.toThrow()
    }
  })
})
