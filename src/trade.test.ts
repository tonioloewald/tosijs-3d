import { describe, expect, test } from 'bun:test'
import { createInventory, type Item, type Place } from './inventory.js'
import { beginTrade } from './trade.js'

const BAG = { holder: 'me', container: 'bag' }
const STOCK = { holder: 'shop', container: 'stock' }
// Buy at 10, sell at 5.
const price = (_item: Item, from: Place | null) => (from?.holder === 'shop' ? 10 : 5)

const make = (gold = 20, withPrice = true) =>
  createInventory(
    {
      items: {
        rope: { id: 'rope', kind: 'rope', qty: 1 },
        lamp: { id: 'lamp', kind: 'lamp', qty: 1 },
        pelt: { id: 'pelt', kind: 'pelt', qty: 1 },
      },
      holders: {
        me: { id: 'me', containers: { bag: { type: 'list', holds: ['pelt'] } }, purse: { gold } },
        shop: {
          id: 'shop',
          containers: { stock: { type: 'list', holds: ['rope', 'lamp'] } },
          purse: { gold: 100 },
        },
      },
    } as any,
    {
      kinds: { rope: { id: 'rope' }, lamp: { id: 'lamp' }, pelt: { id: 'pelt' } } as any,
      ...(withPrice ? { price } : {}),
    }
  )

const bag = (inv: ReturnType<typeof make>) =>
  (inv.doc.holders.me.containers.bag as { holds: string[] }).holds

describe('trade', () => {
  test('a chest: what you take is what crossed, and there is nothing to pay', () => {
    const inv = make(0, false)
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK })
    inv.move({ item: 'rope', to: BAG })
    expect(trade.changed().map((c) => c.kind)).toEqual(['rope'])
    expect(trade.balance()).toBe(0)
    // Taken back before it closes: nothing changed.
    inv.move({ item: 'rope', to: STOCK })
    expect(trade.changed()).toEqual([])
  })

  test('buying and selling: the balance has a direction', () => {
    const inv = make()
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, price)
    inv.move({ item: 'pelt', to: STOCK })
    expect(trade.balance()).toBe(-5) // you receive 5
    inv.move({ item: 'rope', to: BAG }, { item: 'lamp', to: BAG })
    expect(trade.balance()).toBe(15) // you pay 20, receive 5
  })

  test('a deal pays through the inventory, sales first', () => {
    const inv = make(15)
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, price)
    // 20 to pay, 15 in the purse: only the pelt's 5 makes it.
    inv.move({ item: 'rope', to: BAG }, { item: 'lamp', to: BAG }, { item: 'pelt', to: STOCK })
    const r = trade.deal('gold')
    expect(r.ok).toBe(true)
    expect(inv.doc.holders.me.purse).toEqual({ gold: 0 })
    expect(inv.doc.holders.shop.purse).toEqual({ gold: 115 })
    expect(bag(inv).sort()).toEqual(['lamp', 'rope'])
    // Settled: nothing left to pay.
    expect(trade.changed()).toEqual([])
  })

  test('refused, the trade is left as it was', () => {
    const inv = make(5)
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, price)
    inv.move({ item: 'rope', to: BAG }, { item: 'lamp', to: BAG })
    const r = trade.deal('gold')
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('not enough gold')
    expect(bag(inv).sort()).toEqual(['lamp', 'pelt', 'rope'])
    expect(inv.doc.holders.me.purse).toEqual({ gold: 5 })
    expect(trade.balance()).toBe(20)
  })

  test('revert puts everything back', () => {
    const inv = make()
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, price)
    inv.move({ item: 'rope', to: BAG }, { item: 'pelt', to: STOCK })
    trade.revert()
    expect(bag(inv)).toEqual(['pelt'])
    expect(trade.changed()).toEqual([])
  })

  test('a stack sold in part: counted by kind, paid for what moved', () => {
    const inv = createInventory(
      {
        items: { ammo: { id: 'ammo', kind: 'ammo', qty: 100 } },
        holders: {
          me: { id: 'me', containers: { bag: { type: 'list', holds: [] } }, purse: { gold: 10 } },
          shop: { id: 'shop', containers: { stock: { type: 'list', holds: ['ammo'] } }, purse: { gold: 0 } },
        },
      } as any,
      { kinds: { ammo: { id: 'ammo', stack: 200 } } as any, price: (it: Item) => it.qty * 0.5 }
    )
    const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, (it) => it.qty * 0.5)
    inv.move({ item: 'ammo', qty: 12, to: BAG })
    inv.move({ item: 'ammo', qty: 12, to: BAG })
    expect(trade.changed()).toEqual([{ kind: 'ammo', qty: 24, from: STOCK, to: BAG }])
    expect(trade.balance()).toBe(12)
    expect(trade.deal('gold').reasons).toContain('not enough gold')
    expect(trade.balance()).toBe(12)
    trade.revert()
    expect(trade.changed()).toEqual([])
    inv.move({ item: 'ammo', qty: 20, to: BAG })
    expect(trade.deal('gold').ok).toBe(true)
    expect(inv.doc.holders.me.purse).toEqual({ gold: 0 })
    expect(inv.doc.holders.shop.purse).toEqual({ gold: 10 })
  })
})
