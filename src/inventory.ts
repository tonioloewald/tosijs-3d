/*#
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
*/
/*{ "parent": "world-sim", "order": 40 }*/

export interface ItemKind {
  id: string
  name?: string
  tags?: string[]
  mass?: number
  /** Grid footprint, cells wide and high. Default 1 × 1. */
  size?: [number, number]
  cost?: number
  /** How many boxes it is, each destroyed on its own. Default 1. */
  boxes?: number
  /** Most in one stack. Default 1 (does not stack). */
  stack?: number
  /** Numbers it adds to its holder when fitted. */
  contributes?: Record<string, number>
  [key: string]: unknown
}

export interface Item {
  id: string
  kind: string
  qty: number
  /** Boxes destroyed so far. */
  damaged?: number
  /** Whatever the consumer keeps on an item: durability, quality, charges. */
  props?: Record<string, unknown>
}

export interface Slot {
  /** Tags any one of which lets a thing in. Absent: anything. */
  accepts?: string[]
  holds: string | null
  /** Whatever the consumer keeps on a place: a firing arc, a bone, a mount. */
  props?: Record<string, unknown>
}

export type Container =
  | { type: 'slots'; slots: Record<string, Slot> }
  | { type: 'list'; holds: string[]; maxCount?: number }
  | {
      type: 'grid'
      cols: number
      rows: number
      holds: { item: string; x: number; y: number }[]
    }

export interface Holder {
  id: string
  containers: Record<string, Container>
  /** Money, points, anything a price is paid in. */
  purse?: Record<string, number>
}

export interface InventoryDoc {
  items: Record<string, Item>
  holders: Record<string, Holder>
}

/** Where a thing is, or is going. */
export interface Place {
  holder: string
  container: string
  /** For slots. */
  slot?: string
  /** For a grid: the top-left cell. */
  x?: number
  y?: number
}

export interface Move {
  /** An item that exists… */
  item?: string
  /** …or a new one of this kind, from the catalogue. */
  kind?: string
  /** How many (for a stack). Default all of it, or 1 from the catalogue. */
  qty?: number
  /** Where to; `null` removes it (spent, sold to nowhere, destroyed). */
  to: Place | null
  /** If the place is full, send what is there back where this came from. */
  swap?: boolean
  /** Who pays a price, and in what (`purse` key). */
  pay?: { holder: string; in: string }
  /** Who is paid. */
  payee?: string
}

/** Inputs and tools are matched by kind id or by tag. */
export interface RecipePart {
  kind?: string
  tag?: string
  qty?: number
}

export interface Recipe {
  id: string
  inputs: RecipePart[]
  tools?: RecipePart[]
  outputs: { kind: string; qty?: number }[]
}

export interface RuleContext {
  doc: InventoryDoc
  kinds: Record<string, ItemKind>
  totals: (holder: string) => Record<string, number>
  where: (item: string) => Place | null
  moves: Move[]
}

export type Rule = (ctx: RuleContext) => string[]

export type InventoryEvent =
  | { type: 'moved'; item: string; from: Place | null; to: Place | null }
  | { type: 'created'; item: string; kind: string; to: Place | null }
  | { type: 'paid'; from: string; to: string | null; amount: number; in: string }
  | { type: 'damaged'; item: string; boxes: number }

export interface InventoryPlugins {
  kinds: Record<string, ItemKind>
  rules?: Rule[]
  contribution?: (
    item: Item,
    kind: ItemKind,
    place: Place,
    slot: Slot | null
  ) => Record<string, number>
  price?: (item: Item, from: Place | null, to: Place | null) => number
  /** Which containers count toward totals. Default: all but lists. */
  fitted?: (holder: Holder, container: string) => boolean
}

export interface MoveResult {
  ok: boolean
  reasons: string[]
  events: InventoryEvent[]
}

export interface InventoryApi {
  readonly doc: InventoryDoc
  /** The catalogue it was made with. */
  readonly kinds: Record<string, ItemKind>
  where: (item: string) => Place | null
  /** Why these moves would be refused; empty means they would go. */
  check: (...moves: Move[]) => string[]
  /** Make the moves, all or none. */
  move: (...moves: Move[]) => MoveResult
  /** A draft that collects moves and commits them together. */
  stage: () => InventoryDraft
  totals: (holder: string) => Record<string, number>
  /**
   * A RECIPE: use up its inputs from `holder`, require its tools there (not
   * used up), and make its outputs into `into`, as one move: all or none.
   */
  craft: (recipe: Recipe, holder: string, into: Place) => MoveResult
  /**
   * A finished DESIGN as a new kind: what `holder` adds up to becomes the
   * kind's `contributes` (and its cost), so a ship class, a learned spell or a
   * forged sword can be made, owned and fitted like anything else.
   */
  compile: (holder: string, as: { id: string; name?: string; tags?: string[] }) => ItemKind
  /** Destroy `boxes` boxes of the first undamaged item with `tag` on `holder`. */
  damage: (holder: string, tag: string, boxes?: number) => MoveResult
  subscribe: (fn: (doc: InventoryDoc, events: InventoryEvent[]) => void) => () => void
}

export interface InventoryDraft {
  readonly moves: Move[]
  /** Keep a move; returns what is still wrong with the draft as a whole. */
  add: (move: Move) => string[]
  remove: (index: number) => void
  /** The state as it would be. */
  preview: () => InventoryDoc
  totals: (holder: string) => Record<string, number>
  check: () => string[]
  commit: () => MoveResult
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

/** A new id for a kind, unused in `doc`. Counted, not timed: the model is deterministic. */
function newId(doc: InventoryDoc, kind: string): string {
  let n = Object.keys(doc.items).length + 1
  while (doc.items[`${kind}#${n}`]) n++
  return `${kind}#${n}`
}

function findItem(doc: InventoryDoc, id: string): Place | null {
  for (const h of Object.values(doc.holders)) {
    for (const [cname, c] of Object.entries(h.containers)) {
      if (c.type === 'slots') {
        for (const [s, slot] of Object.entries(c.slots))
          if (slot.holds === id) return { holder: h.id, container: cname, slot: s }
      } else if (c.type === 'list') {
        if (c.holds.includes(id)) return { holder: h.id, container: cname }
      } else {
        const g = c.holds.find((e) => e.item === id)
        if (g) return { holder: h.id, container: cname, x: g.x, y: g.y }
      }
    }
  }
  return null
}

function takeOut(doc: InventoryDoc, id: string) {
  const at = findItem(doc, id)
  if (!at) return
  const c = doc.holders[at.holder].containers[at.container]
  if (c.type === 'slots') c.slots[at.slot!].holds = null
  else if (c.type === 'list') c.holds.splice(c.holds.indexOf(id), 1)
  else c.holds.splice(c.holds.findIndex((e) => e.item === id), 1)
}

function containerOf(doc: InventoryDoc, p: Place): Container | null {
  return doc.holders[p.holder]?.containers[p.container] ?? null
}

/** What is at a place now (the item id), for slots and grid cells. */
function occupant(doc: InventoryDoc, kinds: Record<string, ItemKind>, p: Place): string | null {
  const c = containerOf(doc, p)
  if (!c) return null
  if (c.type === 'slots') return c.slots[p.slot ?? '']?.holds ?? null
  if (c.type === 'grid') {
    for (const e of c.holds) {
      const k = kinds[doc.items[e.item]?.kind]
      const [w, h] = k?.size ?? [1, 1]
      if (p.x! >= e.x && p.x! < e.x + w && p.y! >= e.y && p.y! < e.y + h) return e.item
    }
  }
  return null
}

/** Put `id` at `p`; returns the id it ended up as (it may join a stack). */
function putIn(doc: InventoryDoc, id: string, p: Place, kinds?: Record<string, ItemKind>): string {
  const c = containerOf(doc, p)
  if (!c) throw new Error(`no container ${p.holder}/${p.container}`)
  if (c.type === 'slots') {
    const slot = c.slots[p.slot ?? '']
    if (!slot) throw new Error(`no slot ${p.slot}`)
    slot.holds = id
  } else if (c.type === 'list') {
    // Counted stock: a thing joins a stack of its kind with room for it, if
    // neither is damaged or carries props of its own.
    const item = doc.items[id]
    const cap = kinds?.[item.kind]?.stack ?? 1
    const plain = (i: Item) => !i.damaged && !i.props
    const into =
      cap > 1 && plain(item)
        ? c.holds.find((o) => {
            const other = doc.items[o]
            return o !== id && other.kind === item.kind && plain(other) && other.qty + item.qty <= cap
          })
        : undefined
    if (into) {
      doc.items[into].qty += item.qty
      delete doc.items[id]
      return into
    }
    c.holds.push(id)
  } else c.holds.push({ item: id, x: p.x ?? 0, y: p.y ?? 0 })
  return id
}

/** The shapes' own rules: what a slot accepts, a list's cap, a grid's bounds and overlaps. */
function shapeRules(doc: InventoryDoc, kinds: Record<string, ItemKind>): string[] {
  const out: string[] = []
  for (const h of Object.values(doc.holders)) {
    for (const [cname, c] of Object.entries(h.containers)) {
      if (c.type === 'slots') {
        for (const [s, slot] of Object.entries(c.slots)) {
          if (slot.holds == null || !slot.accepts) continue
          const k = kinds[doc.items[slot.holds]?.kind]
          if (!k?.tags?.some((t) => slot.accepts!.includes(t)))
            out.push(`${k?.name ?? k?.id ?? 'that'} does not go in ${s}`)
        }
      } else if (c.type === 'list') {
        if (c.maxCount != null && c.holds.length > c.maxCount)
          out.push(`${cname} holds at most ${c.maxCount}`)
      } else {
        const cells = new Set<string>()
        for (const e of c.holds) {
          const [w, hgt] = kinds[doc.items[e.item]?.kind]?.size ?? [1, 1]
          if (e.x < 0 || e.y < 0 || e.x + w > c.cols || e.y + hgt > c.rows) {
            out.push(`it does not fit inside ${cname}`)
            continue
          }
          for (let x = e.x; x < e.x + w; x++)
            for (let y = e.y; y < e.y + hgt; y++) {
              const key = `${x},${y}`
              if (cells.has(key)) out.push(`something is already there`)
              cells.add(key)
            }
        }
      }
    }
  }
  return [...new Set(out)]
}

export function createInventory(
  initial: InventoryDoc,
  plugins: InventoryPlugins
): InventoryApi {
  let doc = clone(initial)
  const kinds = plugins.kinds
  const listeners = new Set<(d: InventoryDoc, e: InventoryEvent[]) => void>()
  const fitted =
    plugins.fitted ?? ((h: Holder, c: string) => h.containers[c].type !== 'list')

  const totalsOf = (d: InventoryDoc, holder: string): Record<string, number> => {
    const h = d.holders[holder]
    const out: Record<string, number> = {}
    if (!h) return out
    const add = (vals: Record<string, number>) => {
      for (const [k, v] of Object.entries(vals)) out[k] = (out[k] ?? 0) + v
    }
    for (const cname of Object.keys(h.containers)) {
      if (!fitted(h, cname)) continue
      const c = h.containers[cname]
      const entries: [string, Place, Slot | null][] =
        c.type === 'slots'
          ? Object.entries(c.slots)
              .filter(([, s]) => s.holds)
              .map(([s, slot]) => [slot.holds!, { holder, container: cname, slot: s }, slot])
          : c.type === 'list'
          ? c.holds.map((id) => [id, { holder, container: cname }, null])
          : c.holds.map((e) => [e.item, { holder, container: cname, x: e.x, y: e.y }, null])
      for (const [id, place, slot] of entries) {
        const item = d.items[id]
        const k = kinds[item?.kind]
        if (!item || !k) continue
        // A thing with boxes destroyed gives only what its whole boxes give.
        const whole = Math.max(0, (k.boxes ?? 1) - (item.damaged ?? 0)) / (k.boxes ?? 1)
        const base: Record<string, number> = {}
        if (k.mass) base.mass = k.mass * item.qty
        if (k.cost) base.cost = k.cost * item.qty
        for (const [key, v] of Object.entries(k.contributes ?? {})) base[key] = v * item.qty * whole
        add(base)
        if (plugins.contribution) add(plugins.contribution(item, k, place, slot))
      }
    }
    return out
  }

  /** Apply moves to a copy of `base`; the result and the events, or reasons. */
  const apply = (base: InventoryDoc, moves: Move[]) => {
    const d = clone(base)
    const events: InventoryEvent[] = []
    const reasons: string[] = []
    for (const m of moves) {
      let id = m.item ?? null
      let from: Place | null = null
      if (id == null) {
        if (!m.kind || !kinds[m.kind]) {
          reasons.push(`no such kind: ${m.kind}`)
          continue
        }
        id = newId(d, m.kind)
        d.items[id] = { id, kind: m.kind, qty: m.qty ?? 1 }
        events.push({ type: 'created', item: id, kind: m.kind, to: m.to })
      } else {
        if (!d.items[id]) {
          reasons.push(`no such item: ${id}`)
          continue
        }
        from = findItem(d, id)
        // Part of a stack: split it. What it displaces can still go back to
        // the stack's list (where it would join it), but not into a slot the
        // rest of the stack still fills.
        const item = d.items[id]
        if (m.qty != null && m.qty < item.qty) {
          item.qty -= m.qty
          const part = newId(d, item.kind)
          d.items[part] = { ...clone(item), id: part, qty: m.qty }
          id = part
          if (from && containerOf(d, from)?.type !== 'list') from = null
        } else takeOut(d, id)
      }
      // What moved, as it was before it joined any stack (the price is for this).
      const moved = d.items[id]
      if (m.to) {
        const there = occupant(d, kinds, m.to)
        if (there && there !== id) {
          if (m.swap && from) {
            takeOut(d, there)
            putIn(d, there, from, kinds)
            events.push({ type: 'moved', item: there, from: m.to, to: from })
          } else {
            reasons.push('something is already there')
            continue
          }
        }
        id = putIn(d, id, m.to, kinds)
      } else {
        delete d.items[id]
      }
      events.push({ type: 'moved', item: id, from, to: m.to })
      if (plugins.price && m.pay) {
        const amount = plugins.price(moved ?? { id, kind: m.kind ?? '', qty: 1 }, from, m.to)
        const payer = d.holders[m.pay.holder]
        if (!payer) reasons.push(`no such holder: ${m.pay.holder}`)
        else {
          payer.purse = payer.purse ?? {}
          payer.purse[m.pay.in] = (payer.purse[m.pay.in] ?? 0) - amount
          if (payer.purse[m.pay.in] < 0) reasons.push(`not enough ${m.pay.in}`)
          if (m.payee && d.holders[m.payee]) {
            const p = d.holders[m.payee]
            p.purse = p.purse ?? {}
            p.purse[m.pay.in] = (p.purse[m.pay.in] ?? 0) + amount
          }
          events.push({ type: 'paid', from: m.pay.holder, to: m.payee ?? null, amount, in: m.pay.in })
        }
      }
    }
    if (reasons.length === 0) {
      const ctx: RuleContext = {
        doc: d,
        kinds,
        totals: (h) => totalsOf(d, h),
        where: (i) => findItem(d, i),
        moves,
      }
      reasons.push(...shapeRules(d, kinds))
      for (const rule of plugins.rules ?? []) reasons.push(...rule(ctx))
    }
    return { d, events, reasons: [...new Set(reasons)] }
  }

  const commit = (moves: Move[]): MoveResult => {
    const r = apply(doc, moves)
    if (r.reasons.length) return { ok: false, reasons: r.reasons, events: [] }
    doc = r.d
    for (const fn of listeners) fn(doc, r.events)
    return { ok: true, reasons: [], events: r.events }
  }

  const api: InventoryApi = {
    get doc() {
      return doc
    },
    kinds,
    where: (item) => findItem(doc, item),
    check: (...moves) => apply(doc, moves).reasons,
    move: (...moves) => commit(moves),
    totals: (holder) => totalsOf(doc, holder),
    stage() {
      const moves: Move[] = []
      return {
        get moves() {
          return moves
        },
        // A draft may be incomplete (one wing loaded, its pair still to
        // come): add always keeps the move and says what is still wrong;
        // commit is where the rules bite.
        add(m) {
          moves.push(m)
          return apply(doc, moves).reasons
        },
        remove(i) {
          moves.splice(i, 1)
        },
        preview: () => apply(doc, moves).d,
        totals: (h) => totalsOf(apply(doc, moves).d, h),
        check: () => apply(doc, moves).reasons,
        commit: () => {
          const r = commit(moves)
          if (r.ok) moves.length = 0
          return r
        },
      }
    },
    craft(recipe, holder, into) {
      const h = doc.holders[holder]
      if (!h) return { ok: false, reasons: [`no such holder: ${holder}`], events: [] }
      const held: string[] = []
      for (const c of Object.values(h.containers))
        held.push(
          ...(c.type === 'slots'
            ? Object.values(c.slots).flatMap((s) => (s.holds ? [s.holds] : []))
            : c.type === 'list'
            ? c.holds
            : c.holds.map((e) => e.item))
        )
      const matches = (id: string, p: RecipePart) => {
        const it = doc.items[id]
        return p.kind ? it.kind === p.kind : !!kinds[it.kind]?.tags?.includes(p.tag ?? '')
      }
      const missing: string[] = []
      for (const t of recipe.tools ?? [])
        if (!held.some((id) => matches(id, t))) missing.push(`needs: ${t.kind ?? t.tag}`)
      const moves: Move[] = []
      for (const p of recipe.inputs) {
        let need = p.qty ?? 1
        for (const id of held) {
          if (need <= 0) break
          if (!matches(id, p)) continue
          const take = Math.min(need, doc.items[id].qty)
          moves.push({ item: id, qty: take, to: null })
          need -= take
        }
        if (need > 0) missing.push(`not enough ${p.kind ?? p.tag}`)
      }
      if (missing.length) return { ok: false, reasons: missing, events: [] }
      for (const o of recipe.outputs) moves.push({ kind: o.kind, qty: o.qty ?? 1, to: into })
      return commit(moves)
    },
    compile(holder, as) {
      const t = totalsOf(doc, holder)
      const { cost, mass, ...rest } = t
      return {
        id: as.id,
        name: as.name,
        tags: as.tags ?? [],
        cost,
        mass,
        contributes: rest,
      }
    },
    damage(holder, tag, boxes = 1) {
      const h = doc.holders[holder]
      if (!h) return { ok: false, reasons: [`no such holder: ${holder}`], events: [] }
      // The first box of this type that is still whole, in the holder's own
      // order (the consumer's damage table decides WHICH tag; this finds the box).
      for (const c of Object.values(h.containers)) {
        const ids =
          c.type === 'slots'
            ? Object.values(c.slots).map((s) => s.holds)
            : c.type === 'list'
            ? c.holds
            : c.holds.map((e) => e.item)
        for (const id of ids) {
          if (!id) continue
          const item = doc.items[id]
          const k = kinds[item.kind]
          if (!k?.tags?.includes(tag)) continue
          const left = (k.boxes ?? 1) - (item.damaged ?? 0)
          if (left <= 0) continue
          const d = clone(doc)
          const n = Math.min(boxes, left)
          d.items[id].damaged = (item.damaged ?? 0) + n
          doc = d
          const events: InventoryEvent[] = [{ type: 'damaged', item: id, boxes: n }]
          for (const fn of listeners) fn(doc, events)
          return { ok: true, reasons: [], events }
        }
      }
      return { ok: false, reasons: [`no whole ${tag} left`], events: [] }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
  return api
}
