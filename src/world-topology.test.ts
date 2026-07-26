import { describe, expect, test } from 'bun:test'
import { proximityRung, routePortals, containmentPath } from './world-topology'
import type { Place, Portal, PlaceId } from './world-contract'

const portal = (
  id: string,
  from: string,
  to: string,
  cost: number,
  locked = false
): Portal => ({ id, from, to, locked, label: id, cost })

describe('proximityRung', () => {
  test('bands, at extent small (scale 1)', () => {
    expect(proximityRung(0, 'small')).toBe('same-spot')
    expect(proximityRung(0.3, 'small')).toBe('same-spot')
    expect(proximityRung(0.8, 'small')).toBe('contact')
    expect(proximityRung(2, 'small')).toBe('reach')
    expect(proximityRung(5, 'small')).toBe('obvious')
    expect(proximityRung(20, 'small')).toBe('noticeable')
    expect(proximityRung(100, 'small')).toBe('present')
  })

  test('bands scale with extent — the same 2m is different everywhere', () => {
    expect(proximityRung(2, 'intimate')).toBe('obvious') // 2m in a closet is across the room
    expect(proximityRung(2, 'small')).toBe('reach')
    expect(proximityRung(2, 'vast')).toBe('same-spot') // 2m on a plain is nothing
  })

  test('never returns elsewhere (that is a different-place fact, the caller’s job)', () => {
    expect(proximityRung(1e9, 'intimate')).toBe('present')
  })

  test('negative distance clamps to 0', () => {
    expect(proximityRung(-5, 'small')).toBe('same-spot')
  })
})

describe('routePortals', () => {
  test('same place → empty path, zero cost', () => {
    expect(routePortals([], 'a', 'a')).toEqual({ portals: [], cost: 0 })
  })

  test('unreachable → null', () => {
    expect(routePortals([portal('p', 'a', 'b', 1)], 'a', 'z')).toBeNull()
    expect(routePortals([], 'a', 'b')).toBeNull()
  })

  test('direct + bidirectional (a door works both ways)', () => {
    const ps = [portal('door', 'study', 'hall', 5)]
    expect(routePortals(ps, 'study', 'hall')).toEqual({
      portals: ['door'],
      cost: 5,
    })
    expect(routePortals(ps, 'hall', 'study')).toEqual({
      portals: ['door'],
      cost: 5,
    })
  })

  test('picks the CHEAPEST of two paths', () => {
    const ps = [
      portal('long', 'a', 'b', 100),
      portal('short1', 'a', 'c', 3),
      portal('short2', 'c', 'b', 3),
    ]
    expect(routePortals(ps, 'a', 'b')).toEqual({
      portals: ['short1', 'short2'],
      cost: 6,
    })
  })

  test('a LOCKED portal is skipped — locked door ⇒ unreachable that way', () => {
    const ps = [portal('locked-door', 'a', 'b', 1, true)]
    expect(routePortals(ps, 'a', 'b')).toBeNull()
    // but an alternate unlocked route is found
    const ps2 = [
      portal('locked-door', 'a', 'b', 1, true),
      portal('window', 'a', 'c', 2),
      portal('back', 'c', 'b', 2),
    ]
    expect(routePortals(ps2, 'a', 'b')).toEqual({
      portals: ['window', 'back'],
      cost: 4,
    })
  })

  test('deterministic tie-break by portal id (same graph → same path)', () => {
    // two equal-cost first hops; the lower portal id must win, every run
    const ps = [
      portal('z-first', 'a', 'b', 1),
      portal('a-first', 'a', 'c', 1),
      portal('via-b', 'b', 'goal', 1),
      portal('via-c', 'c', 'goal', 1),
    ]
    const r = routePortals(ps, 'a', 'goal')
    expect(r?.cost).toBe(2)
    // both are cost 2; the tie-break makes it repeatable
    expect(routePortals(ps, 'a', 'goal')).toEqual(r!)
  })
})

describe('containmentPath', () => {
  const place = (id: string, label: string, parent?: string): Place => ({
    id,
    kind: 'room',
    parent,
    label,
    shape: {
      enclosure: 'closed',
      extent: 'small',
      dimensionality: 'planar',
      structure: 'built',
    },
  })
  const places = new Map<PlaceId, Place>([
    ['world', place('world', 'The World')],
    ['manor', place('manor', 'Blackwood Manor', 'world')],
    ['study', place('study', 'The Study', 'manor')],
  ])

  test('root → here breadcrumb', () => {
    expect(containmentPath(places, 'study')).toEqual([
      { id: 'world', label: 'The World' },
      { id: 'manor', label: 'Blackwood Manor' },
      { id: 'study', label: 'The Study' },
    ])
  })

  test('a root place is just itself', () => {
    expect(containmentPath(places, 'world')).toEqual([
      { id: 'world', label: 'The World' },
    ])
  })

  test('missing place → empty', () => {
    expect(containmentPath(places, 'nowhere')).toEqual([])
  })

  test('a broken cycle does not hang', () => {
    const cyclic = new Map<PlaceId, Place>([
      ['a', place('a', 'A', 'b')],
      ['b', place('b', 'B', 'a')],
    ])
    const path = containmentPath(cyclic, 'a')
    expect(path.length).toBe(2) // stops when it revisits
  })
})
