/**
 * Pure tests for the combat state model — armor, flat protection, regen delay, and
 * cascading chain reactions. No Babylon; time is the `dt` passed to `tick`.
 */
import { describe, test, expect } from 'bun:test'
import { CombatWorld, type CombatEvent } from './destroyable'

const ids = (evs: CombatEvent[], type: CombatEvent['type']) =>
  evs.filter((e) => e.type === type).map((e) => e.id)

describe('basic damage', () => {
  test('reduces hp and emits a damaged event', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 100 })
    const evs = w.applyDamage('a', 30)
    expect(w.get('a')!.hp.value).toBe(70)
    expect(evs).toEqual([{ type: 'damaged', id: 'a', amount: 30, hp: 70 }])
  })

  test('destruction emits destroyed, not damaged', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 20 })
    const evs = w.applyDamage('a', 25)
    expect(w.get('a')!.destroyed).toBe(true)
    expect(evs).toEqual([{ type: 'destroyed', id: 'a' }])
    expect(w.isIntact('a')).toBe(false)
  })

  test('damage to an already-destroyed or unknown target is a no-op', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 10 })
    w.applyDamage('a', 20)
    expect(w.applyDamage('a', 5)).toEqual([])
    expect(w.applyDamage('ghost', 5)).toEqual([])
  })
})

describe('armor (flat shrug-off)', () => {
  test('subtracts flat: armor 3, incoming 5 → 2', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 100, armor: 3 })
    w.applyDamage('a', 5)
    expect(w.get('a')!.hp.value).toBe(98)
  })

  test('a hit fully absorbed by armor deals nothing and emits nothing', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 100, armor: 5 })
    const evs = w.applyDamage('a', 5)
    expect(w.get('a')!.hp.value).toBe(100)
    expect(evs).toEqual([])
  })
})

describe('protection (flat, while protector intact, vanishes)', () => {
  test('protection 2 turns incoming 5 into 3', () => {
    const w = new CombatWorld()
    w.add('gen', { capacity: 100 })
    w.add('turret', { capacity: 100, protectedBy: 'gen', protection: 2 })
    w.applyDamage('turret', 5)
    expect(w.get('turret')!.hp.value).toBe(97) // 5 - 2 = 3
  })

  test('protection lapses once the protector is destroyed', () => {
    const w = new CombatWorld()
    w.add('gen', { capacity: 10 })
    w.add('turret', { capacity: 100, protectedBy: 'gen', protection: 2 })
    w.applyDamage('gen', 20) // destroy the protector
    w.applyDamage('turret', 5) // now full 5 lands
    expect(w.get('turret')!.hp.value).toBe(95)
  })

  test('protection + armor stack (both flat)', () => {
    const w = new CombatWorld()
    w.add('gen', { capacity: 100 })
    w.add('t', { capacity: 100, protectedBy: 'gen', protection: 2, armor: 1 })
    w.applyDamage('t', 5) // 5 - 2 - 1 = 2
    expect(w.get('t')!.hp.value).toBe(98)
  })
})

describe('regen (delayed)', () => {
  test('regen resumes only after the delay, then heals over time', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 100, regenRate: 10, regenDelay: 0.5 })
    w.applyDamage('a', 40) // → 60, regen paused
    w.tick(0.4) // still within delay
    expect(w.get('a')!.hp.value).toBeCloseTo(60, 5)
    w.tick(1.0) // crosses delay at 0.5s → 0.9s of regen → +9
    expect(w.get('a')!.hp.value).toBeCloseTo(69, 5)
  })

  test('destroyed things do not regen', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 10, regenRate: 100 })
    w.applyDamage('a', 20)
    w.tick(5)
    expect(w.get('a')!.hp.value).toBe(0)
    expect(w.get('a')!.destroyed).toBe(true)
  })
})

describe('chain reactions', () => {
  test('a link fires after its delay (default 0.25s), not before', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 10, chain: [{ target: 'b', amount: 100 }] })
    w.add('b', { capacity: 50 })
    w.applyDamage('a', 20) // destroy a → schedules b at +0.25
    let evs = w.tick(0.2)
    expect(evs).toEqual([]) // 0.2 < 0.25, b untouched
    expect(w.isIntact('b')).toBe(true)
    evs = w.tick(0.1) // now 0.3 ≥ 0.25 → b takes 100 → destroyed
    expect(ids(evs, 'destroyed')).toEqual(['b'])
  })

  test('one-to-many: a generator destroys all linked shields', () => {
    const w = new CombatWorld()
    w.add('gen', {
      capacity: 10,
      chain: [
        { target: 's1', amount: 100 },
        { target: 's2', amount: 100 },
        { target: 's3', amount: 100 },
      ],
    })
    for (const s of ['s1', 's2', 's3']) w.add(s, { capacity: 20 })
    w.applyDamage('gen', 20)
    const evs = w.tick(0.3)
    expect(ids(evs, 'destroyed').sort()).toEqual(['s1', 's2', 's3'])
  })

  test('cascade: A→B→C all go up (Death-Star crit), delay 0', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 5, chain: [{ target: 'b', amount: 100, delay: 0 }] })
    w.add('b', { capacity: 5, chain: [{ target: 'c', amount: 100, delay: 0 }] })
    w.add('c', { capacity: 5 })
    w.applyDamage('a', 10) // destroy the weak point
    const evs = w.tick(0) // delay-0 chain cascades within the tick
    expect(ids(evs, 'destroyed').sort()).toEqual(['b', 'c'])
    expect(w.isIntact('c')).toBe(false)
  })

  test('chain damage is a normal packet — respects the target armor', () => {
    const w = new CombatWorld()
    w.add('a', { capacity: 5, chain: [{ target: 'b', amount: 10, delay: 0 }] })
    w.add('b', { capacity: 100, armor: 4 })
    w.applyDamage('a', 10)
    w.tick(0)
    expect(w.get('b')!.hp.value).toBe(94) // 10 - 4 armor = 6
  })
})
