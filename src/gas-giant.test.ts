import { describe, expect, test } from 'bun:test'
import {
  GAS_GIANTS,
  GAS_GIANT_GLSL,
  gasGiantRgb,
  resolveGasGiant,
} from './gas-giant.js'

describe('resolveGasGiant', () => {
  test('a preset alone is the preset', () => {
    expect(resolveGasGiant('saturn')).toEqual(GAS_GIANTS.saturn)
    expect(resolveGasGiant('Neptune')).toEqual(GAS_GIANTS.neptune)
  })

  test('an unknown name still draws a planet', () => {
    expect(resolveGasGiant('jupitr')).toEqual(GAS_GIANTS.jupiter)
  })

  test("the sentinels mean the preset's own, so an element's defaults change nothing", () => {
    const untouched = {
      bands: 0,
      turbulence: -1,
      storm: -1,
      colors: '',
      seed: 0,
    }
    expect(resolveGasGiant('jupiter', untouched)).toEqual(GAS_GIANTS.jupiter)
  })

  test('zero is a real value for turbulence and storm', () => {
    const calm = resolveGasGiant('jupiter', { turbulence: 0, storm: 0 })
    expect(calm.turbulence).toBe(0)
    expect(calm.storm).toBe(0)
    expect(calm.bands).toBe(GAS_GIANTS.jupiter.bands)
  })

  test('colours override one at a time; a bad one keeps the preset', () => {
    const look = resolveGasGiant('jupiter', { colors: '#112233,,nonsense' })
    expect(look.colors).toEqual([
      '#112233',
      GAS_GIANTS.jupiter.colors[1],
      GAS_GIANTS.jupiter.colors[2],
    ])
    expect(resolveGasGiant('uranus', { colors: ['#AABBCC'] }).colors[0]).toBe(
      '#aabbcc'
    )
  })

  test('numbers are kept inside what the shader can draw', () => {
    const wild = resolveGasGiant('jupiter', { bands: 900, turbulence: 50 })
    expect(wild.bands).toBeLessThanOrEqual(40)
    expect(wild.turbulence).toBeLessThanOrEqual(1.5)
  })

  test('the presets never share an object with a result', () => {
    const a = resolveGasGiant('jupiter')
    a.colors[0] = '#000000'
    expect(GAS_GIANTS.jupiter.colors[0]).not.toBe('#000000')
  })
})

describe('gasGiantRgb', () => {
  test('hex to 0…1', () => {
    expect(gasGiantRgb('#ff0080')).toEqual([1, 0, 128 / 255])
  })
  test('nonsense is grey, not NaN', () => {
    expect(gasGiantRgb('red').every((v) => Number.isFinite(v))).toBe(true)
  })
})

describe('the shader source', () => {
  test('defines the one entry point and carries its own noise', () => {
    expect(GAS_GIANT_GLSL).toContain('vec3 b3dGasGiant(vec3 n,vec4 k,')
    // Balanced, and no integer literal where GLSL ES 1 wants a float.
    const open = GAS_GIANT_GLSL.split('{').length
    expect(GAS_GIANT_GLSL.split('}').length).toBe(open)
    expect(/[^0-9.a-zA-Z_]\d+\s*[*/]\s*[a-z]/.test(GAS_GIANT_GLSL)).toBe(false)
  })
})
