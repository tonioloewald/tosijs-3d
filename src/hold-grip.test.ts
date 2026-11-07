import { describe, expect, test } from 'bun:test'
import { HOLD_GRIPS, holdClassOf, holdGrip } from './hold-grip.js'

describe('hold grips', () => {
  test('items of a class share a grip', () => {
    expect(holdGrip('Long Sword')).toEqual(holdGrip('Plasma Blade'))
    expect(holdGrip('Pistol')).toEqual(holdGrip('SMG'))
  })
  test('an adjustment applies to the whole class', () => {
    const adjusted = { melee1h: { ry: 170 } }
    expect(holdGrip('Dagger', adjusted).ry).toBe(170)
    expect(holdGrip('Long Sword', adjusted).ry).toBe(170)
    expect(holdGrip('Spear', adjusted).ry).toBe(HOLD_GRIPS.melee2h.ry)
  })
  test('an unknown item is held as a pistol', () => {
    expect(holdClassOf('Banana')).toBe('pistol')
    expect(holdClassOf('Banana', { Banana: 'melee1h' })).toBe('melee1h')
  })
})
