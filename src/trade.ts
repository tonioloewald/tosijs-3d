/*#
# trade

**A transaction between two places in one inventory**, pure: your bag and a
chest, your bag and a shop's stock. Things move freely while it is open (so
the panels show it as it would be); the trade remembers which side each
thing started on, so it can say what changed, what that comes to, and undo
it.

- `changed()`: what crossed, and from where.
- `balance()`: what you pay (negative: what you receive), by the inventory's
  own price rule, buying from them and selling to them.
- `revert()`: everything goes back.
- `deal(currency)`: settles. It puts things back, then makes the same moves
  PAID (sales first, so what yours fetch pays for what you buy), so the
  inventory's rules decide (`not enough gold`). Refused, the trade is left as
  it was.

A chest has no price: nothing to settle, you simply take what you take.
[inventory-trade](/inventory-trade/) draws one.

```javascript
import { createInventory } from 'tosijs-3d/inventory'
import { beginTrade } from 'tosijs-3d/trade'

const BAG = { holder: 'me', container: 'bag' }
const STOCK = { holder: 'shop', container: 'stock' }
const price = (item, from) => (from?.holder === 'shop' ? 10 : 5) // buy 10, sell 5
const inv = createInventory(
  {
    items: { rope: { id: 'rope', kind: 'rope', qty: 1 }, pelt: { id: 'pelt', kind: 'pelt', qty: 1 } },
    holders: {
      me: { id: 'me', containers: { bag: { type: 'list', holds: ['pelt'] } }, purse: { gold: 20 } },
      shop: { id: 'shop', containers: { stock: { type: 'list', holds: ['rope'] } }, purse: { gold: 100 } },
    },
  },
  { kinds: { rope: { id: 'rope' }, pelt: { id: 'pelt' } }, price }
)
const trade = beginTrade(inv, { mine: BAG, theirs: STOCK }, price)
inv.move({ item: 'rope', to: BAG }, { item: 'pelt', to: STOCK })
trade.balance() // 5: you pay 10 for the rope and get 5 for the pelt
trade.deal('gold') // me: 15 gold
```
*/
/*{ "parent": "inventory", "order": 12 }*/

import type { InventoryApi, Item, MoveResult, Place } from './inventory.js'

export interface TradeSides {
  /** Yours: a container (your bag). */
  mine: Place
  /** Theirs: a container (a chest, a shop's stock). */
  theirs: Place
}

export interface TradeChange {
  item: string
  from: Place
  to: Place
}

export interface Trade {
  readonly sides: TradeSides
  /** What has crossed since it began, from where. */
  changed: () => TradeChange[]
  /** What you pay; negative is what you receive. 0 without a price. */
  balance: () => number
  /** Put everything back where it started. */
  revert: () => MoveResult
  /** Settle in `currency`: back, then the same moves paid. Refused, left as it was. */
  deal: (currency: string) => MoveResult
}

const inContainer = (inv: InventoryApi, p: Place): string[] => {
  const c = inv.doc.holders[p.holder]?.containers[p.container]
  if (c == null) return []
  if (c.type === 'list') return [...c.holds]
  if (c.type === 'grid') return c.holds.map((h) => h.item)
  return Object.values(c.slots)
    .map((s) => s.holds)
    .filter((id): id is string => id != null)
}

/** Begin a trade between `sides`; `price` is the inventory's own price rule (for the balance). */
export function beginTrade(
  inv: InventoryApi,
  sides: TradeSides,
  price?: (item: Item, from: Place | null, to: Place | null) => number
): Trade {
  const started = new Map<string, 'mine' | 'theirs'>()
  for (const id of inContainer(inv, sides.mine)) started.set(id, 'mine')
  for (const id of inContainer(inv, sides.theirs)) started.set(id, 'theirs')

  const changed = (): TradeChange[] => {
    const out: TradeChange[] = []
    for (const side of ['mine', 'theirs'] as const) {
      const other = side === 'mine' ? 'theirs' : 'mine'
      for (const id of inContainer(inv, sides[side]))
        if (started.get(id) === other)
          out.push({ item: id, from: sides[other], to: sides[side] })
    }
    return out
  }

  const balance = () => {
    if (price == null) return 0
    let n = 0
    for (const c of changed()) {
      const item = inv.doc.items[c.item]
      if (item == null) continue
      const amount = price(item, c.from, c.to)
      n += c.to === sides.mine ? amount : -amount
    }
    return n
  }

  const back = (cs: TradeChange[]) => cs.map((c) => ({ item: c.item, to: c.from }))

  return {
    sides,
    changed,
    balance,
    revert: () => inv.move(...back(changed())),
    deal(currency) {
      const cs = changed()
      if (cs.length === 0) return { ok: true, reasons: [], events: [] }
      const undone = inv.move(...back(cs))
      if (!undone.ok) return undone
      const sells = cs.filter((c) => c.to === sides.theirs)
      const buys = cs.filter((c) => c.to === sides.mine)
      const paid = [
        ...sells.map((c) => ({
          item: c.item,
          to: c.to,
          pay: { holder: sides.theirs.holder, in: currency },
          payee: sides.mine.holder,
        })),
        ...buys.map((c) => ({
          item: c.item,
          to: c.to,
          pay: { holder: sides.mine.holder, in: currency },
          payee: sides.theirs.holder,
        })),
      ]
      const r = inv.move(...paid)
      if (!r.ok) inv.move(...cs.map((c) => ({ item: c.item, to: c.to })))
      else for (const c of cs) started.set(c.item, c.to === sides.mine ? 'mine' : 'theirs')
      return r
    },
  }
}
