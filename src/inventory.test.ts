import { describe, test, expect } from 'bun:test'
import { createInventory, type InventoryDoc, type ItemKind, type Rule } from './inventory.js'

// --- RPG: a hero, a companion, hands, a bag -------------------------------
const rpgKinds: Record<string, ItemKind> = {
  sword: { id: 'sword', tags: ['hand', 'weapon'], mass: 3, contributes: { damage: 6 } },
  rifle: { id: 'rifle', name: 'rifle', tags: ['hand', 'two-handed'], mass: 4, contributes: { damage: 9 } },
  helm: { id: 'helm', name: 'helm', tags: ['head'], mass: 2, contributes: { armour: 2 } },
  arrow: { id: 'arrow', tags: ['ammo'], stack: 50 },
}
const person = (id: string, bag: string[] = []) => ({
  id,
  containers: {
    body: {
      type: 'slots' as const,
      slots: {
        head: { accepts: ['head'], holds: null },
        left: { accepts: ['hand'], holds: null },
        right: { accepts: ['hand'], holds: null },
      },
    },
    bag: { type: 'list' as const, holds: bag, maxCount: 4 },
  },
})
const twoHanded: Rule = ({ doc, kinds }) => {
  const out: string[] = []
  for (const h of Object.values(doc.holders)) {
    const body = h.containers.body
    if (body?.type !== 'slots') continue
    const l = body.slots.left?.holds
    const r = body.slots.right?.holds
    const two = [l, r].find((id) => id && kinds[doc.items[id].kind].tags?.includes('two-handed'))
    if (two && l && r && l !== r) out.push('two-handed: both hands must be free')
  }
  return out
}
const rpg = (): InventoryDoc => ({
  items: {
    s1: { id: 's1', kind: 'sword', qty: 1 },
    r1: { id: 'r1', kind: 'rifle', qty: 1 },
    h1: { id: 'h1', kind: 'helm', qty: 1 },
    a1: { id: 'a1', kind: 'arrow', qty: 30 },
  },
  holders: { hero: person('hero', ['s1', 'r1', 'h1', 'a1']), friend: person('friend') },
})

describe('inventory: a party', () => {
  test('equip, and the holder adds it up; the bag does not count', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    expect(inv.move({ item: 's1', to: { holder: 'hero', container: 'body', slot: 'right' } }).ok).toBe(true)
    expect(inv.totals('hero')).toEqual({ mass: 3, damage: 6 })
    expect(inv.where('s1')).toEqual({ holder: 'hero', container: 'body', slot: 'right' })
  })

  test('a slot takes only what its tags allow, and says so', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    const r = inv.move({ item: 'h1', to: { holder: 'hero', container: 'body', slot: 'left' } })
    expect(r.ok).toBe(false)
    expect(r.reasons).toEqual(['helm does not go in left'])
    expect(inv.where('h1')!.container).toBe('bag')
  })

  test('a consumer rule: two-handed needs both hands', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds, rules: [twoHanded] })
    inv.move({ item: 's1', to: { holder: 'hero', container: 'body', slot: 'left' } })
    expect(inv.check({ item: 'r1', to: { holder: 'hero', container: 'body', slot: 'right' } })).toEqual([
      'two-handed: both hands must be free',
    ])
  })

  test('swap: the thing in the hand goes back where the new one came from', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    inv.move({ item: 's1', to: { holder: 'hero', container: 'body', slot: 'right' } })
    const r = inv.move({ item: 'r1', to: { holder: 'hero', container: 'body', slot: 'right' }, swap: true })
    expect(r.ok).toBe(true)
    expect(inv.where('s1')!.container).toBe('bag')
    expect(inv.where('r1')!.slot).toBe('right')
  })

  test('equip the companion: a move between holders', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    expect(inv.move({ item: 'h1', to: { holder: 'friend', container: 'body', slot: 'head' } }).ok).toBe(true)
    expect(inv.totals('friend')).toEqual({ mass: 2, armour: 2 })
  })

  test('a stack splits', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    const r = inv.move({ item: 'a1', qty: 10, to: { holder: 'friend', container: 'bag' } })
    expect(r.ok).toBe(true)
    expect(inv.doc.items.a1.qty).toBe(20)
    const given = inv.doc.holders.friend.containers.bag
    expect(given.type === 'list' && inv.doc.items[given.holds[0]].qty).toBe(10)
  })

  test('all or nothing: one bad move refuses the lot', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    const r = inv.move(
      { item: 's1', to: { holder: 'hero', container: 'body', slot: 'right' } },
      { item: 'h1', to: { holder: 'hero', container: 'body', slot: 'left' } }
    )
    expect(r.ok).toBe(false)
    expect(inv.where('s1')!.container).toBe('bag')
  })
})

// --- Manta: hardpoints from a counted stock, mass budget, matched wings ---
const mantaKinds: Record<string, ItemKind> = {
  aam: { id: 'aam', name: 'missile', tags: ['missile'], mass: 90, stack: 20 },
  bomb: { id: 'bomb', name: 'bomb', tags: ['bomb', 'missile'], mass: 250, stack: 20 },
}
const craft = () => ({
  id: 'manta',
  containers: {
    wings: {
      type: 'slots' as const,
      slots: {
        L1: { accepts: ['missile'], holds: null, props: { pair: 'R1' } },
        R1: { accepts: ['missile'], holds: null, props: { pair: 'L1' } },
      },
    },
  },
})
const maxMass: Rule = ({ totals }) => ((totals('manta').mass ?? 0) > 400 ? ['over the craft\'s weight limit'] : [])
const matched: Rule = ({ doc }) => {
  const w = doc.holders.manta.containers.wings
  if (w.type !== 'slots') return []
  const kind = (s: string) => (w.slots[s].holds ? doc.items[w.slots[s].holds!].kind : null)
  return kind('L1') !== kind('R1') ? ['the wings must carry the same'] : []
}

describe('inventory: a loadout', () => {
  const doc = (): InventoryDoc => ({
    items: { m: { id: 'm', kind: 'aam', qty: 6 }, b: { id: 'b', kind: 'bomb', qty: 2 } },
    holders: { manta: craft(), armoury: { id: 'armoury', containers: { stock: { type: 'list', holds: ['m', 'b'] } } } },
  })

  test('a pair goes on together (staged), drawn from the counted stock', () => {
    const inv = createInventory(doc(), { kinds: mantaKinds, rules: [matched, maxMass] })
    const draft = inv.stage()
    // One wing alone is unbalanced, so the draft holds the pair and checks the whole.
    expect(draft.add({ item: 'm', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'L1' } })).toEqual([
      'the wings must carry the same',
    ])
    expect(draft.add({ item: 'm', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'R1' } })).toEqual([])
    expect(draft.totals('manta').mass).toBe(180)
    expect(draft.commit().ok).toBe(true)
    expect(inv.doc.items.m.qty).toBe(4)
  })

  test('mismatched wings and overweight are refused with reasons', () => {
    const inv = createInventory(doc(), { kinds: mantaKinds, rules: [matched, maxMass] })
    const r = inv.move(
      { item: 'b', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'L1' } },
      { item: 'm', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'R1' } }
    )
    expect(r.reasons).toContain('the wings must carry the same')
    const heavy = inv.move(
      { item: 'b', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'L1' } },
      { item: 'b', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'R1' } }
    )
    expect(heavy.reasons).toEqual(["over the craft's weight limit"])
  })

  test('firing spends it: a move to nowhere', () => {
    const inv = createInventory(doc(), { kinds: mantaKinds })
    inv.move({ item: 'm', qty: 1, to: { holder: 'manta', container: 'wings', slot: 'L1' } })
    const fired = (inv.doc.holders.manta.containers.wings as any).slots.L1.holds
    expect(inv.move({ item: fired, to: null }).ok).toBe(true)
    expect(inv.doc.items[fired]).toBeUndefined()
  })
})

// --- A ship: catalogue, cost, power balance, arcs by mount, boxes ---------
const shipKinds: Record<string, ItemKind> = {
  phaser: { id: 'phaser', tags: ['weapon', 'phaser'], cost: 4, boxes: 1, contributes: { power: -1, firepower: 3 } },
  warp: { id: 'warp', tags: ['engine', 'warp'], cost: 10, boxes: 6, size: [2, 3], contributes: { power: 12 } },
  shield: { id: 'shield', tags: ['shield'], cost: 3, boxes: 4, contributes: { power: -2, shields: 4 } },
}
const hull = (): InventoryDoc => ({
  items: {},
  holders: {
    ship: {
      id: 'ship',
      containers: {
        mounts: {
          type: 'slots',
          slots: {
            fwd: { accepts: ['weapon'], holds: null, props: { arc: 'FA' } },
            left: { accepts: ['weapon'], holds: null, props: { arc: 'L' } },
          },
        },
        hull: { type: 'grid', cols: 4, rows: 4, holds: [] },
      },
    },
  },
})
const powered: Rule = ({ totals }) => ((totals('ship').power ?? 0) < 0 ? ['not enough power'] : [])

describe('inventory: a starship design', () => {
  test('from the catalogue, the cost and power add up, and power must balance', () => {
    const inv = createInventory(hull(), { kinds: shipKinds, rules: [powered] })
    expect(inv.move({ kind: 'phaser', to: { holder: 'ship', container: 'mounts', slot: 'fwd' } }).reasons).toEqual([
      'not enough power',
    ])
    const r = inv.move(
      { kind: 'warp', to: { holder: 'ship', container: 'hull', x: 0, y: 0 } },
      { kind: 'phaser', to: { holder: 'ship', container: 'mounts', slot: 'fwd' } },
      { kind: 'shield', to: { holder: 'ship', container: 'hull', x: 2, y: 0 } }
    )
    expect(r.ok).toBe(true)
    expect(inv.totals('ship')).toEqual({ cost: 17, power: 9, firepower: 3, shields: 4 })
  })

  test('a grid keeps things inside and apart', () => {
    const inv = createInventory(hull(), { kinds: shipKinds })
    expect(inv.check({ kind: 'warp', to: { holder: 'ship', container: 'hull', x: 3, y: 0 } })).toEqual([
      'it does not fit inside hull',
    ])
    inv.move({ kind: 'warp', to: { holder: 'ship', container: 'hull', x: 0, y: 0 } })
    expect(inv.check({ kind: 'shield', to: { holder: 'ship', container: 'hull', x: 1, y: 2 } })).toEqual([
      'something is already there',
    ])
  })

  test('what a mount adds depends on where it is (a consumer contribution)', () => {
    const inv = createInventory(hull(), {
      kinds: shipKinds,
      contribution: (_i, k, _p, slot): Record<string, number> => (k.tags?.includes('phaser') && slot?.props?.arc === 'FA' ? { forward: 1 } : {}),
    })
    inv.move({ kind: 'phaser', to: { holder: 'ship', container: 'mounts', slot: 'fwd' } })
    inv.move({ kind: 'phaser', to: { holder: 'ship', container: 'mounts', slot: 'left' } })
    expect(inv.totals('ship').forward).toBe(1)
  })

  test('damage crosses off boxes, and a damaged system gives less', () => {
    const inv = createInventory(hull(), { kinds: shipKinds })
    inv.move({ kind: 'warp', to: { holder: 'ship', container: 'hull', x: 0, y: 0 } })
    expect(inv.damage('ship', 'warp', 3).ok).toBe(true)
    expect(inv.totals('ship').power).toBe(6)
    inv.damage('ship', 'warp', 10)
    expect(inv.damage('ship', 'warp').reasons).toEqual(['no whole warp left'])
  })
})

// --- A shop: prices and purses ---------------------------------------------
describe('inventory: a shop', () => {
  const doc = (): InventoryDoc => ({
    items: { s1: { id: 's1', kind: 'sword', qty: 1 } },
    holders: {
      hero: { id: 'hero', containers: { bag: { type: 'list', holds: [] } }, purse: { gold: 10 } },
      shop: { id: 'shop', containers: { stock: { type: 'list', holds: ['s1'] } }, purse: { gold: 100 } },
    },
  })
  const price = () => 8

  test('buying moves the thing one way and the money the other', () => {
    const inv = createInventory(doc(), { kinds: rpgKinds, price })
    const r = inv.move({ item: 's1', to: { holder: 'hero', container: 'bag' }, pay: { holder: 'hero', in: 'gold' }, payee: 'shop' })
    expect(r.ok).toBe(true)
    expect(inv.doc.holders.hero.purse!.gold).toBe(2)
    expect(inv.doc.holders.shop.purse!.gold).toBe(108)
  })

  test('you cannot spend what you do not have, and a cart is all or nothing', () => {
    const d = doc()
    d.items.h1 = { id: 'h1', kind: 'helm', qty: 1 }
    ;(d.holders.shop.containers.stock as any).holds.push('h1')
    const inv = createInventory(d, { kinds: rpgKinds, price })
    const cart = inv.stage()
    cart.add({ item: 's1', to: { holder: 'hero', container: 'bag' }, pay: { holder: 'hero', in: 'gold' }, payee: 'shop' })
    cart.add({ item: 'h1', to: { holder: 'hero', container: 'bag' }, pay: { holder: 'hero', in: 'gold' }, payee: 'shop' })
    expect(cart.check()).toEqual(['not enough gold'])
    expect(cart.commit().ok).toBe(false)
    expect(inv.doc.holders.hero.purse!.gold).toBe(10)
  })
})

describe('inventory: events', () => {
  test('subscribers hear what happened', () => {
    const inv = createInventory(rpg(), { kinds: rpgKinds })
    const heard: string[] = []
    inv.subscribe((_d, events) => heard.push(...events.map((e) => e.type)))
    inv.move({ item: 's1', to: { holder: 'hero', container: 'body', slot: 'right' } })
    inv.move({ kind: 'sword', to: { holder: 'friend', container: 'bag' } })
    expect(heard).toEqual(['moved', 'created', 'moved'])
  })
})
