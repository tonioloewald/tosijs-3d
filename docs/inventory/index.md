# inventory

**One inventory model for a party, a loadout and a starship designer.**
Pure and Babylon-free: things, the holders they are in, and moves between
them that are checked against rules and either happen completely or not at
all. What the things ARE, what the rules say and what a loadout adds up to
are the consumer's, supplied as plug-ins; nothing game-specific ships here.
See INVENTORY-DESIGN.md for why it is shaped this way.

```javascript
import { createInventory } from 'tosijs-3d'

const inv = createInventory(
  {
    items: { s1: { id: 's1', kind: 'sword', qty: 1 } },
    holders: {
      hero: { id: 'hero', containers: {
        hands: { type: 'slots', slots: { left: { accepts: ['hand'], holds: null }, right: { accepts: ['hand'], holds: null } } },
        bag: { type: 'list', holds: ['s1'] },
      } },
    },
  },
  { kinds: { sword: { id: 'sword', tags: ['hand', 'weapon'], mass: 3, contributes: { damage: 6 } } } }
)

inv.move({ item: 's1', to: { holder: 'hero', container: 'hands', slot: 'right' } })
inv.totals('hero') // { mass: 3, damage: 6 }
```

## The pieces

- **A kind** (from the catalogue the consumer supplies) carries the facts:
  `tags`, `mass`, `size` (a grid footprint), `cost`, `boxes` (how many
  separately-destroyed boxes it is) and `contributes` (numbers it adds to
  its holder when fitted).
- **An item** is an instance: `{ id, kind, qty }`, plus whatever the consumer
  adds (`props`: durability, quality, charges) and `damaged` (boxes lost).
- **A holder** owns containers, each one of three shapes: **slots** (named
  sockets, each accepting by tag), a **list** (a bag, optionally capped), or a
  **grid** (cells, an item covering its footprint).
- **A move** takes an item (or a new one from the catalogue: `kind`) to a
  place. Moves are applied to a COPY, every rule is asked about the result,
  and only a clean result is kept: all or nothing. `stage()` gives a draft
  that collects moves (a cart, a barter, an uncommitted design) and commits
  them together.

## Plug-ins

| | what you supply |
| --- | --- |
| `kinds` | the catalogue |
| `rules` | `(ctx) => string[]`, reasons the proposed state is wrong |
| `contribution` | `(item, kind, place) => numbers`: what a fitted thing adds, by where it is |
| `price` | `(item, from, to) => number`: a move's cost, which `budget` pays |
| `fitted` | which containers count toward a holder's totals (default: all but lists) |

The built-in rules are only the shapes': a slot takes what its `accepts`
tags allow and one thing at a time, a list respects `maxCount`, a grid's
items stay inside it and do not overlap.
