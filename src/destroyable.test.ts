/**
 * Pure tests for the combat state model — armor, flat protection, regen delay, and
 * cascading chain reactions. No Babylon; time is the `dt` passed to `tick`.
 */
import { describe, test, expect } from 'bun:test'
import { CombatWorld, type CombatEvent } from './destroyable.js'

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

describe('attribution — who killed this, through what chain', () => {
  /*
  manta-recon (#8): a mission that resolves to a LEDGER OF WORLD FACTS needs
  those facts to carry causality, and this engine makes attribution hard in
  exactly the interesting cases — a cascade three hops from the bomb that
  started it, with no friendly-fire exemption anywhere along the way.
  */
  const drums = () => {
    const w = new CombatWorld()
    // A → B → C, each fatal to the next: the 48-drum demo in miniature.
    w.add('A', { capacity: 10, chain: [{ target: 'B', amount: 50 }] })
    w.add('B', { capacity: 10, chain: [{ target: 'C', amount: 50 }] })
    w.add('C', { capacity: 10 })
    return w
  }

  test('a direct hit carries who and how', () => {
    const w = drums()
    const out = w.applyDamage('A', 50, [], { by: 'player', kind: 'direct' })
    expect(out).toEqual([
      { type: 'destroyed', id: 'A', cause: { by: 'player', kind: 'direct' } },
    ])
  })

  test('THE ORIGINATOR SURVIVES THE HOPS — a cascade is still the player\'s', () => {
    /*
    The failure this exists to prevent: re-attributing each hop to the drum
    next door launders the credit away, so a player who set off a spectacular
    chain gets none of it.
    */
    const w = drums()
    const out: CombatEvent[] = []
    w.applyDamage('A', 50, out, { by: 'player', kind: 'direct' })
    for (let i = 0; i < 10; i++) w.tick(0.1, out)

    const destroyed = out.filter((e) => e.type === 'destroyed')
    expect(destroyed.map((e) => e.id)).toEqual(['A', 'B', 'C'])
    for (const e of destroyed) expect(e.cause?.by).toBe('player')
  })

  test('records the IMMEDIATE link and the distance alongside', () => {
    const w = drums()
    const out: CombatEvent[] = []
    w.applyDamage('A', 50, out, { by: 'player', kind: 'direct' })
    for (let i = 0; i < 10; i++) w.tick(0.1, out)

    const byId = new Map(
      out.filter((e) => e.type === 'destroyed').map((e) => [e.id, e.cause])
    )
    expect(byId.get('A')).toEqual({ by: 'player', kind: 'direct' })
    // B went up because A did; C because B did.
    expect(byId.get('B')).toEqual({
      by: 'player',
      kind: 'chain',
      via: 'A',
      hops: 1,
    })
    expect(byId.get('C')).toEqual({
      by: 'player',
      kind: 'chain',
      via: 'B',
      hops: 2,
    })
  })

  test('a `damaged` event carries it too, not only a kill', () => {
    const w = new CombatWorld()
    w.add('tank', { capacity: 100 })
    const out = w.applyDamage('tank', 30, [], { by: 'turret-2', kind: 'blast' })
    expect(out[0]).toMatchObject({
      type: 'damaged',
      id: 'tank',
      cause: { by: 'turret-2', kind: 'blast' },
    })
  })

  test('is OPTIONAL — an uncredited hit produces no cause key at all', () => {
    /*
    Additive means additive: a caller that never passes a cause gets exactly
    the events it got before, so a consumer testing with `toEqual` does not
    start failing on an extra `cause: undefined`.
    */
    const w = new CombatWorld()
    w.add('crate', { capacity: 10 })
    const out = w.applyDamage('crate', 50)
    expect(out).toEqual([{ type: 'destroyed', id: 'crate' }])
    expect('cause' in out[0]).toBe(false)
  })

  test('an uncredited cascade still records the chain it came through', () => {
    // Nobody is credited, but "B went up because A did" is a world fact whether
    // or not anyone is responsible for it.
    const w = drums()
    const out: CombatEvent[] = []
    w.applyDamage('A', 50, out)
    for (let i = 0; i < 10; i++) w.tick(0.1, out)
    const b = out.find((e) => e.type === 'destroyed' && e.id === 'B')
    expect(b?.cause).toEqual({ by: undefined, kind: 'chain', via: 'A', hops: 1 })
  })

  test('hops stay bounded, because the chain does', () => {
    // No depth cap needed: each entity is destroyed once and the destroyed
    // guard stops loops, so a `hops` count cannot run away. A cycle proves it.
    const w = new CombatWorld()
    w.add('X', { capacity: 10, chain: [{ target: 'Y', amount: 50 }] })
    w.add('Y', { capacity: 10, chain: [{ target: 'X', amount: 50 }] })
    const out: CombatEvent[] = []
    w.applyDamage('X', 50, out, { by: 'player' })
    for (let i = 0; i < 20; i++) w.tick(0.1, out)
    const hops = out
      .filter((e) => e.type === 'destroyed')
      .map((e) => e.cause?.hops ?? 0)
    expect(Math.max(...hops)).toBeLessThanOrEqual(1)
  })
})

describe('the world remembers why each thing died', () => {
  /*
  Death and the reaction to it are separated in time: a chain reaction resolves
  inside `tick`, and the scene layer notices a frame later by polling
  `destroyed` — by which point the event carrying the cause has been consumed.
  So the cause is stored, and any observer can ask after the fact.
  */
  test('a destroyed entity keeps its cause', () => {
    const w = new CombatWorld()
    w.add('bunker', { capacity: 10 })
    w.applyDamage('bunker', 50, [], { by: 'player', kind: 'blast' })
    expect(w.get('bunker')?.cause).toEqual({ by: 'player', kind: 'blast' })
  })

  test('a cascade victim keeps the ORIGINATOR, asked after the fact', () => {
    const w = new CombatWorld()
    w.add('A', { capacity: 10, chain: [{ target: 'B', amount: 50 }] })
    w.add('B', { capacity: 10 })
    w.applyDamage('A', 50, [], { by: 'player', kind: 'direct' })
    for (let i = 0; i < 10; i++) w.tick(0.1)
    expect(w.get('B')?.destroyed).toBe(true)
    expect(w.get('B')?.cause?.by).toBe('player')
    expect(w.get('B')?.cause?.via).toBe('A')
  })

  test('a survivor has no cause, and an uncredited death records none', () => {
    const w = new CombatWorld()
    w.add('alive', { capacity: 100 })
    w.add('crate', { capacity: 10 })
    w.applyDamage('alive', 5)
    w.applyDamage('crate', 50)
    expect(w.get('alive')?.cause).toBeUndefined()
    expect(w.get('crate')?.cause).toBeUndefined()
  })
})
