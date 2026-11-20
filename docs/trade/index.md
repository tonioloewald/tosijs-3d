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
