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
  EFFECT_RECIPE_VERSION,
  type EffectRecipe,
  type EffectLayer,
} from './effect-recipe.js'
import { EFFECT_PRESETS, effectPreset } from './effect-presets.js'

const light = (extra: Partial<EffectLayer> = {}): EffectLayer =>
  ({ kind: 'light', color: '#ffffff', intensity: 1, range: 5, ...extra }) as EffectLayer
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
    const l = light({ duration: 2, channels: { intensity: [{ x: 0, y: 0 }, { x: 1, y: 1 }], range: 0.5 } })
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
    expect(rankLights([{ intensity: 1, range: 10, distance: 3 }, { intensity: 40, range: 25, distance: 5 }], 1)).toEqual([1])
    expect(rankLights([{ intensity: 2, range: 8, distance: 2 }, { intensity: 40, range: 25, distance: 300 }], 1)).toEqual([0])
  })
  test('nothing scores beyond its range', () => {
    expect(lightScore({ intensity: 100, range: 10, distance: 16 })).toBe(0)
    expect(rankLights([{ intensity: 100, range: 10, distance: 16 }], 4)).toEqual([])
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
        { kind: 'particles', sprite: 'star', blend: 'add', emitter: { shape: 'cube' }, rate: 1, life: [2, 1], speed: [0, 1], size: [0, 1], colors: ['red'] },
        { kind: 'light', color: '#fff', intensity: 1, range: 0 },
        { kind: 'sound', voice: 'kazoo', gain: 1, repeat: true },
        { kind: 'smell' },
      ],
    })
    expect(problems).toContain('layers[0].sprite is not one of puff, smoke, spark, ember, glow, drop')
    expect(problems).toContain('layers[0].emitter.shape is not a known shape')
    expect(problems).toContain('layers[0].life is not [min, max]')
    expect(problems).toContain('layers[0].colors is not a list of #rrggbb[aa]')
    expect(problems).toContain('layers[1].color is not #rrggbb')
    expect(problems).toContain('layers[1].range is not positive')
    expect(problems).toContain('layers[2] repeats with no duration')
    expect(problems).toContain('layers[2].voice is not one of rumble, roar, hiss, boom, crackle, whoosh, buzz, splash')
    expect(problems).toContain('layers[3].kind is not particles, light or sound')
  })
})
