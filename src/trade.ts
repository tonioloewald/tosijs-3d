/*#
# trade

**A transaction between two places in one inventory**, pure: your bag and a
chest, your bag and a shop's stock. Things move freely while it is open (so
the panels show it as it would be); the trade remembers which side each
thing started on, so it can say what changed, what that comes to, and undo
it.

- `changed()`: what crossed, by kind and how many, and from where (stacks
  split and join, so it counts, rather than following ids).
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

import type { InventoryApi, Item, Move, MoveResult, Place } from './inventory.js'

export interface TradeSides {
  /** Yours: a container (your bag). */
  mine: Place
  /** Theirs: a container (a chest, a shop's stock). */
  theirs: Place
}

export interface TradeChange {
  /** What crossed, by kind (stacks split and join, so ids do not last). */
  kind: string
  qty: number
  from: Place
  to: Place
}

export interface Trade {
  readonly sides: TradeSides
  /** What has crossed since it began, by kind, from where. */
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

/** How many of each kind are in a container. */
const tally = (inv: InventoryApi, p: Place): Map<string, number> => {
  const t = new Map<string, number>()
  for (const id of inContainer(inv, p)) {
    const it = inv.doc.items[id]
    if (it) t.set(it.kind, (t.get(it.kind) ?? 0) + it.qty)
  }
  return t
}

/** The moves that take `qty` of `kind` from `from` to `to`, stack by stack. */
const movesFor = (inv: InventoryApi, c: TradeChange, extra: Partial<Move> = {}): Move[] => {
  const out: Move[] = []
  let left = c.qty
  for (const id of inContainer(inv, c.from)) {
    const it = inv.doc.items[id]
    if (left <= 0) break
    if (it?.kind !== c.kind) continue
    const qty = Math.min(left, it.qty)
    out.push({ item: id, qty, to: c.to, ...extra })
    left -= qty
  }
  return out
}

/** Begin a trade between `sides`; `price` is the inventory's own price rule (for the balance). */
export function beginTrade(
  inv: InventoryApi,
  sides: TradeSides,
  price?: (item: Item, from: Place | null, to: Place | null) => number
): Trade {
  let started = tally(inv, sides.mine)

  const changed = (): TradeChange[] => {
    const now = tally(inv, sides.mine)
    const out: TradeChange[] = []
    for (const kind of new Set([...started.keys(), ...now.keys()])) {
      const d = (now.get(kind) ?? 0) - (started.get(kind) ?? 0)
      if (d > 0) out.push({ kind, qty: d, from: sides.theirs, to: sides.mine })
      else if (d < 0) out.push({ kind, qty: -d, from: sides.mine, to: sides.theirs })
    }
    return out
  }

  const balance = () => {
    if (price == null) return 0
    let n = 0
    for (const c of changed()) {
      const amount = price({ id: c.kind, kind: c.kind, qty: c.qty }, c.from, c.to)
      n += c.to === sides.mine ? amount : -amount
    }
    return n
  }

  const back = (cs: TradeChange[]) => cs.map((c) => ({ ...c, from: c.to, to: c.from }))
  const moving = (cs: TradeChange[]) => cs.flatMap((c) => movesFor(inv, c))

  return {
    sides,
    changed,
    balance,
    revert: () => inv.move(...moving(back(changed()))),
    deal(currency) {
      const cs = changed()
      if (cs.length === 0) return { ok: true, reasons: [], events: [] }
      const undone = inv.move(...moving(back(cs)))
      if (!undone.ok) return undone
      // Sales first, so what yours fetch pays for what you buy.
      const sells = cs.filter((c) => c.to === sides.theirs)
      const buys = cs.filter((c) => c.to === sides.mine)
      const paid = [
        ...sells.flatMap((c) =>
          movesFor(inv, c, { pay: { holder: sides.theirs.holder, in: currency }, payee: sides.mine.holder })
        ),
        ...buys.flatMap((c) =>
          movesFor(inv, c, { pay: { holder: sides.mine.holder, in: currency }, payee: sides.theirs.holder })
        ),
      ]
      const r = inv.move(...paid)
      if (!r.ok) inv.move(...moving(cs))
      else started = tally(inv, sides.mine)
      return r
    },
  }
}
