import { describe, expect, test } from 'bun:test'
import {
  applyMaterialPreset,
  materialAsType,
  canonicalMaterial,
  isMaterialPreset,
  MATERIAL_COLLECTIONS,
  materialSwatch,
  resolveMaterial,
  validateMaterial,
  withInput,
} from './material-recipe.js'
import { FABRICS } from './fabrics.js'

describe('material recipes', () => {
  test('inputs left out take their defaults', () => {
    const r = resolveMaterial({ type: 'pbr', inputs: {} })
    expect(r.roughness.value).toBe(0.5)
    expect(r.albedo.value).toBe('#cccccc')
    expect(r.normal).toEqual({ value: null, image: null, intensity: 1 })
  })

  test('each way of writing an input resolves', () => {
    const r = resolveMaterial({
      type: 'pbr',
      inputs: {
        roughness: 2,
        albedo: { image: 'a.png' },
        emissive: { colour: '#FF8000', intensity: 4 },
      },
    })
    expect(r.roughness.value).toBe(1)
    expect(r.albedo.image).toBe('a.png')
    expect(r.emissive).toEqual({ value: '#ff8000', image: null, intensity: 4 })
  })

  test('canonical form leaves out defaults and orders by the type', () => {
    const c = canonicalMaterial({
      type: 'pbr',
      inputs: {
        metallic: 0,
        sheen: 0.333333333,
        roughness: 0.5,
        albedo: '#F00',
        bogus: 3,
      },
    })
    expect(c).toEqual({
      type: 'pbr',
      inputs: { albedo: '#ff0000', sheen: 0.3333 },
    })
    expect(Object.keys(withInput(c, 'albedo', undefined).inputs)).toEqual([
      'sheen',
    ])
  })

  test('a colour with a strength keeps both, and drops a default strength', () => {
    expect(
      canonicalMaterial({
        type: 'pbr',
        inputs: { emissive: { colour: '#ff0000', intensity: 1 } },
      }).inputs
    ).toEqual({ emissive: '#ff0000' })
    expect(
      canonicalMaterial({
        type: 'pbr',
        inputs: { emissive: { colour: '#ff0000', intensity: 3 } },
      }).inputs
    ).toEqual({ emissive: { colour: '#ff0000', intensity: 3 } })
  })

  test('fabrics are cloth presets, with the metals tinted', () => {
    const fabrics = MATERIAL_COLLECTIONS.fabrics.presets
    expect(fabrics.map((p) => p.name)).toEqual(Object.keys(FABRICS))
    const gold = fabrics.find((p) => p.name === 'gold')!.recipe
    expect(gold.type).toBe('cloth')
    expect(resolveMaterial(gold).metallic.value).toBe(1)
    expect(resolveMaterial(gold).recolour.value).toBe(1)
    expect(materialSwatch(gold)).toBe('#e8c065')
    for (const p of fabrics) expect(validateMaterial(p.recipe)).toEqual([])
  })

  test("an optional input left out is the material's own", () => {
    const r = resolveMaterial({ type: 'cloth', inputs: {} })
    expect(r.roughness.value).toBeNull()
    // Set to its default, it is still SET: kept, not dropped.
    expect(
      canonicalMaterial({ type: 'cloth', inputs: { roughness: 0.85 } }).inputs
    ).toEqual({ roughness: 0.85 })
  })

  test('a preset keeps what it does not set, from the keep list', () => {
    const fabric = (n: string) =>
      MATERIAL_COLLECTIONS.fabrics.presets.find((p) => p.name === n)!.recipe
    const red = applyMaterialPreset(
      { type: 'cloth', inputs: { albedo: '#aa0000', recolour: 0.7 } },
      fabric('gold'),
      ['albedo', 'recolour']
    )
    expect(red.inputs.albedo).toBe('#e8c065')
    const cotton = applyMaterialPreset(red, fabric('cotton'), [
      'albedo',
      'recolour',
    ])
    expect(cotton.inputs.albedo).toBe('#e8c065')
    expect(cotton.inputs.metallic).toBe(0)
    expect(
      isMaterialPreset(cotton, fabric('cotton'), ['albedo', 'recolour'])
    ).toBe(true)
    expect(
      isMaterialPreset(cotton, fabric('denim'), ['albedo', 'recolour'])
    ).toBe(false)
    // As made: the surface goes back to the garment's own.
    const asMade = applyMaterialPreset(cotton, { type: 'cloth', inputs: {} }, [
      'albedo',
      'recolour',
    ])
    expect(asMade.inputs).toEqual({ albedo: '#e8c065', recolour: 1 })
  })

  test('another type takes the inputs it shares', () => {
    const p = materialAsType(
      MATERIAL_COLLECTIONS.fabrics.presets.find((q) => q.name === 'gold')!
        .recipe,
      'pbr'
    )
    expect(p).toEqual({
      type: 'pbr',
      inputs: { albedo: '#e8c065', roughness: 0.2, metallic: 1 },
    })
  })

  test('validation names what is wrong', () => {
    expect(validateMaterial({ type: 'nope' })[0].code).toBe(
      'material/unknown-type'
    )
    expect(validateMaterial({ type: 'pbr' }, ['clouds'])[0].code).toBe(
      'material/type-not-allowed'
    )
    const codes = validateMaterial({
      type: 'pbr',
      inputs: {
        roughness: 2,
        albedo: 'blurple',
        metallic: '#fff',
        wat: 1,
        normal: 0.5,
        alpha: { image: 'a.png' },
      },
    }).map((i) => `${i.path} ${i.code}`)
    expect(codes).toEqual([
      '/inputs/roughness material/out-of-range',
      '/inputs/albedo material/bad-colour',
      '/inputs/metallic material/wrong-kind',
      '/inputs/wat material/unknown-input',
      '/inputs/normal material/wrong-kind',
    ])
  })
})
