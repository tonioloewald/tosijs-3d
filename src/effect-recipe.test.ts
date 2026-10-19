import { describe, expect, test } from 'bun:test'
import {
  layerAt,
  lightScore,
  rankLights,
  sampleCurve,
  soundDelay,
  soundGain,
  distanceCutoff,
  validateEffectRecipe,
  effectRecipeSchema,
  SPRITES,
  VOICES,
  EFFECT_RECIPE_VERSION,
  type EffectRecipe,
  type EffectLayer,
} from './effect-recipe.js'
import { EFFECT_PRESETS, effectPreset } from './effect-presets.js'

const light = (extra: Partial<EffectLayer> = {}): EffectLayer =>
  ({
    kind: 'light',
    color: '#ffffff',
    intensity: 1,
    range: 5,
    ...extra,
  } as EffectLayer)
const effect = (layers: EffectLayer[], duration?: number): EffectRecipe => ({
  version: EFFECT_RECIPE_VERSION,
  duration,
  layers,
})

describe('effect presets', () => {
  test.each(Object.keys(EFFECT_PRESETS))('%s is a valid recipe', (name) => {
    expect(validateEffectRecipe(EFFECT_PRESETS[name])).toEqual([])
  })
  test('a preset is handed out as a copy', () => {
    const a = effectPreset('explosion')!
    a.layers.length = 0
    expect(EFFECT_PRESETS.explosion.layers.length).toBeGreaterThan(0)
    expect(effectPreset('nope')).toBeUndefined()
  })
})

describe('the layer clock', () => {
  test('a layer runs from its start for its duration', () => {
    const l = light({ start: 1, duration: 2 })
    const e = effect([l])
    expect(layerAt(l, e, 0.5, 1).on).toBe(false)
    expect(layerAt(l, e, 1.5, 1).on).toBe(true)
    expect(layerAt(l, e, 2, 1).life).toBeCloseTo(0.5)
    expect(layerAt(l, e, 3.1, 1).on).toBe(false)
  })
  test('a one-shot ends its layers with it', () => {
    const l = light()
    const e = effect([l], 2)
    expect(layerAt(l, e, 1, 1).life).toBeCloseTo(0.5)
    expect(layerAt(l, e, 2.5, 1).on).toBe(false)
  })
  test('starting fires once, however the frames fall, and again each repeat', () => {
    const l = light({ start: 0.5, duration: 1, repeat: true })
    const e = effect([l])
    const starts = (frames: number[]) => {
      let prev = -Infinity
      let n = 0
      for (const t of frames) {
        if (layerAt(l, e, t, 1, prev).started) n++
        prev = t
      }
      return n
    }
    expect(starts([0, 0.4, 0.6, 0.9, 1.2])).toBe(1)
    // A big frame skip still counts each start it crossed at most once.
    expect(starts([0, 0.6, 1.6, 2.6])).toBe(3)
    expect(layerAt(l, e, 2.75, 1).life).toBeCloseTo(0.25)
  })
  test('channels are sampled over the layer life; a number is flat', () => {
    const l = light({
      duration: 2,
      channels: {
        intensity: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        range: 0.5,
      },
    })
    const s = layerAt(l, effect([l]), 1, 1)
    expect(s.channel.intensity).toBeCloseTo(0.5)
    expect(s.channel.range).toBe(0.5)
  })
})

describe('activity: one volcano, three states', () => {
  const v = EFFECT_PRESETS.volcano
  const level = (name: string, a: number) =>
    layerAt(v.layers.find((l) => l.name === name)!, v, 1, a).level
  test('dormant: steam and a rumble, no ash, bombs or roar', () => {
    expect(level('steam', 0.15)).toBeGreaterThan(0.5)
    expect(level('rumble', 0.15)).toBeGreaterThan(0)
    expect(level('ash column', 0.15)).toBe(0)
    expect(level('lava bombs', 0.15)).toBe(0)
    expect(level('roar', 0.15)).toBe(0)
  })
  test('semi-active: spatter and cinders now and then, no bombs', () => {
    expect(level('spatter', 0.5)).toBeCloseTo(1)
    expect(level('cinders', 0.5)).toBeCloseTo(1)
    expect(level('lava bombs', 0.5)).toBe(0)
    expect(level('spatter', 0.15)).toBe(0)
  })
  test('erupting: everything, bombs at full', () => {
    expect(level('lava bombs', 1)).toBeCloseTo(1)
    expect(level('ash column', 1)).toBeCloseTo(1)
    expect(level('roar', 1)).toBeCloseTo(1)
  })
  test('a layer without an activity curve follows the dial linearly', () => {
    const l = light()
    expect(layerAt(l, effect([l]), 0, 0.3).level).toBeCloseTo(0.3)
    expect(sampleCurve(undefined, 0.4, 7)).toBe(7)
  })
})

describe('the light pool: strength × locality', () => {
  test('a bright light near you beats a dim one, and a near lamp a far flash', () => {
    expect(
      rankLights(
        [
          { intensity: 1, range: 10, distance: 3 },
          { intensity: 40, range: 25, distance: 5 },
        ],
        1
      )
    ).toEqual([1])
    expect(
      rankLights(
        [
          { intensity: 2, range: 8, distance: 2 },
          { intensity: 40, range: 25, distance: 300 },
        ],
        1
      )
    ).toEqual([0])
  })
  test('nothing scores beyond its range', () => {
    expect(lightScore({ intensity: 100, range: 10, distance: 16 })).toBe(0)
    expect(
      rankLights([{ intensity: 100, range: 10, distance: 16 }], 4)
    ).toEqual([])
  })
})

describe('sound at a distance', () => {
  test('arrives at 343 m/s, quieter and duller far away', () => {
    expect(soundDelay(686)).toBeCloseTo(2)
    expect(soundGain(5, 10)).toBe(1)
    expect(soundGain(40, 10)).toBeCloseTo(0.25)
    expect(distanceCutoff(0)).toBeGreaterThan(distanceCutoff(1000))
  })
})

describe('validation', () => {
  test('says what is wrong, where', () => {
    const problems = validateEffectRecipe({
      version: 1,
      layers: [
        {
          kind: 'particles',
          sprite: 'star',
          blend: 'add',
          emitter: { shape: 'cube' },
          rate: 1,
          life: [2, 1],
          speed: [0, 1],
          size: [0, 1],
          colors: ['red'],
        },
        { kind: 'light', color: '#fff', intensity: 1, range: 0 },
        { kind: 'sound', voice: 'kazoo', gain: 1, repeat: true },
        { kind: 'smell' },
      ],
    })
    expect(problems).toContain(
      'layers[0].sprite is not one of puff, smoke, spark, ember, glow, drop, bubble'
    )
    expect(problems).toContain('layers[0].emitter.shape is not a known shape')
    expect(problems).toContain('layers[0].life is not [min, max]')
    expect(problems).toContain('layers[0].colors is not a list of #rrggbb[aa]')
    expect(problems).toContain('layers[1].color is not #rrggbb')
    expect(problems).toContain('layers[1].range is not positive')
    expect(problems).toContain('layers[2] repeats with no duration')
    expect(problems).toContain(
      'layers[2].voice is not one of rumble, roar, hiss, boom, crackle, whoosh, buzz, splash, bubble'
    )
    expect(problems).toContain(
      'layers[3].kind is not particles, light or sound'
    )
  })
})

describe('the schema', () => {
  // A small checker for what the schema says, enough to catch drift: every
  // field a preset uses is declared, required fields are there, enums hold,
  // numbers are in range.
  const check = (schema: any, v: any, at: string, out: string[]) => {
    if (schema.const !== undefined && v !== schema.const)
      out.push(`${at} is not ${schema.const}`)
    if (schema.enum && !schema.enum.includes(v))
      out.push(`${at} is not in its enum`)
    if (schema.oneOf) {
      const fits = schema.oneOf.filter((s: any) => {
        const o: string[] = []
        check(s, v, at, o)
        return o.length === 0
      })
      if (fits.length !== 1) out.push(`${at} fits ${fits.length} of oneOf`)
      return
    }
    if (typeof v === 'number') {
      if (schema.type === 'integer' && !Number.isInteger(v))
        out.push(`${at} is not an integer`)
      if (schema.minimum != null && v < schema.minimum)
        out.push(`${at} < minimum`)
      if (schema.maximum != null && v > schema.maximum)
        out.push(`${at} > maximum`)
      if (schema.exclusiveMinimum != null && v <= schema.exclusiveMinimum)
        out.push(`${at} <= exclusiveMinimum`)
    }
    if (schema.type === 'number' && typeof v !== 'number')
      out.push(`${at} is not a number`)
    if (schema.type === 'string' && typeof v !== 'string')
      out.push(`${at} is not a string`)
    if (schema.pattern && !new RegExp(schema.pattern).test(v))
      out.push(`${at} does not match`)
    if (schema.type === 'boolean' && typeof v !== 'boolean')
      out.push(`${at} is not a boolean`)
    if (schema.type === 'array') {
      if (!Array.isArray(v)) return out.push(`${at} is not an array`)
      if (schema.minItems != null && v.length < schema.minItems)
        out.push(`${at} too short`)
      if (schema.maxItems != null && v.length > schema.maxItems)
        out.push(`${at} too long`)
      v.forEach(
        (x, i) => schema.items && check(schema.items, x, `${at}[${i}]`, out)
      )
    }
    if (schema.type === 'object') {
      if (v == null || typeof v !== 'object')
        return out.push(`${at} is not an object`)
      for (const k of schema.required ?? [])
        if (!(k in v)) out.push(`${at}.${k} is missing`)
      if (
        schema.anyOf &&
        !schema.anyOf.some((a: any) => a.required.every((k: string) => k in v))
      )
        out.push(`${at} fits none of anyOf`)
      for (const [k, x] of Object.entries(v)) {
        const p = schema.properties?.[k]
        if (p) check(p, x, `${at}.${k}`, out)
        else if (schema.additionalProperties === false)
          out.push(`${at}.${k} is not in the schema`)
      }
    }
  }

  test('every preset fits it', () => {
    const schema = effectRecipeSchema()
    for (const name of Object.keys(EFFECT_PRESETS)) {
      const out: string[] = []
      check(schema, effectPreset(name), name, out)
      expect(out).toEqual([])
    }
  })

  test('it says what the validator says', () => {
    const s = effectRecipeSchema() as any
    expect(s.properties.version.const).toBe(EFFECT_RECIPE_VERSION)
    const [p, , snd] = s.properties.layers.items.oneOf
    expect(p.properties.sprite.enum).toEqual([...SPRITES])
    expect(snd.properties.voice.enum).toEqual([...VOICES])
    // A broken recipe fails both.
    const bad = {
      version: EFFECT_RECIPE_VERSION,
      layers: [{ kind: 'light', color: 'red', intensity: 1, range: 5 }],
    }
    const out: string[] = []
    check(s, bad, 'bad', out)
    expect(out.length).toBeGreaterThan(0)
    expect(validateEffectRecipe(bad).length).toBeGreaterThan(0)
  })

  test('fetched strings say so, and inline SVG is told apart (tosijs-3d#120)', () => {
    const s = effectRecipeSchema() as any
    const [p, , snd] = s.properties.layers.items.oneOf
    expect(snd.properties.url.format).toBe('uri-reference')
    // A host that holds fetched URLs to https needs to know which texture
    // strings are fetched: exactly one alternative fits each, by the same
    // leading '<' the player reads.
    const [uri, markup] = p.properties.texture.anyOf
    expect(uri.format).toBe('uri-reference')
    expect(markup.contentMediaType).toBe('image/svg+xml')
    const isMarkup = (t: string) => new RegExp(markup.pattern).test(t)
    const isUri = (t: string) => !new RegExp(uri.not.pattern).test(t)
    for (const t of [
      'https://example.com/spark.png',
      'data:image/svg+xml;base64,AAAA',
      '  <svg xmlns="http://www.w3.org/2000/svg"></svg>',
      '<svg/>',
    ]) {
      expect([t, isMarkup(t)]).toEqual([t, t.trimStart().startsWith('<')])
      expect([t, isUri(t)]).toEqual([t, !isMarkup(t)])
    }
  })
})
