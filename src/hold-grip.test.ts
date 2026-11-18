import { describe, expect, test } from 'bun:test'
import { HOLD_GRIPS, holdClassOf, holdGrip, holdMount, ownSideGrip } from './hold-grip.js'

describe('hold grips', () => {
  test('items of a class share a grip', () => {
    expect(holdGrip('Long Sword')).toEqual(holdGrip('Plasma Blade'))
    expect(holdGrip('Pistol')).toEqual(holdGrip('SMG'))
  })
  test('an adjustment applies to the whole class', () => {
    const adjusted = { melee1h: { ry: 170 } }
    expect(holdGrip('Dagger', adjusted).ry).toBe(170)
    expect(holdGrip('Long Sword', adjusted).ry).toBe(170)
    expect(holdGrip('Hand and a Half', adjusted).ry).toBe(HOLD_GRIPS.melee2h.ry)
  })
  test('an unknown item is held as a pistol', () => {
    expect(holdClassOf('Banana')).toBe('pistol')
    expect(holdClassOf('Banana', { Banana: 'melee1h' })).toBe('melee1h')
  })
  test('a class rides in a hand or on a forearm, on its own side unless told', () => {
    expect(holdMount('pistol').bone).toBe('hand_r')
    expect(holdMount('bow').bone).toBe('hand_l')
    expect(holdMount('shield').bone).toBe('lowerarm_l')
    expect(holdMount('shield', 'r').bone).toBe('lowerarm_r')
    expect(holdMount('melee1h', 'l')).toMatchObject({ bone: 'hand_l', mount: 'hand', side: 'l' })
  })
  test('the other side is mirrored, and stored back as its own', () => {
    const right = holdGrip('Dagger')
    const left = holdGrip('Dagger', {}, undefined, 'l')
    expect(left).not.toEqual(right)
    const back = ownSideGrip('Dagger', left, 'l')
    for (const k of ['x', 'y', 'z'] as const) expect(back[k]).toBeCloseTo(right[k], 5)
    expect(holdGrip('Dagger', {}, undefined, 'r')).toEqual(right)
  })
})
