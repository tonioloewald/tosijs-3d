/*#
# inventory-trade

**Take and leave, buy and sell.** Two containers side by side (theirs on the
left, yours on the right) with the deal under them. Drag a thing across (or
tap it, then tap the other side) and it moves at once, so each side shows
what it will hold; the [trade](/trade/) remembers where everything started.

- **A chest** (no `price`): **take all**, or move what you want, then
  **done**. Whatever you left stays in it.
- **A shop** (`price`): the line under the lists says which way the money
  goes, `you pay 12 gold` or `you receive 6 gold`, and each side's purse.
  **Deal** settles through the inventory's rules (`not enough gold` comes back
  as the reason and nothing changes); **cancel** puts everything back.

One SVG, so it goes on a plane: give `svg` to a
[`<tosi-b3d-panel>`](/b3d-panel/) (`bar-button="off"`, opened with `show()`)
and it works flat and in a headset. The Biped Playground opens one when a
chest opens.

```javascript
import { b3dPanel, tradePanel, createCarry } from 'tosijs-3d'

const trade = tradePanel({
  inv, carry: createCarry(),
  mine: { holder: 'hero', container: 'bag' },
  theirs: { holder: 'chest-1', container: 'stock' },
  titles: { mine: 'you', theirs: 'chest' },
  handleDone: () => panel.hide(),
})
const panel = b3dPanel({ title: 'Chest', icon: 'lucideBackpack', barButton: 'off' })
panel.svg = trade.svg
// When the chest opens:
trade.begin()
panel.show()
```

| Option | |
|---|---|
| `inv`, `carry` | The inventory and a carry (`createCarry()`) |
| `mine`, `theirs` | The two containers |
| `titles` | `{ mine, theirs }` over each list |
| `price` | The inventory's own price rule, `(item, from, to) => number`: makes it a shop |
| `currency` | The purse key a shop pays in (default: the inventory's first currency, else `gold`), written as the inventory's `currencies` say (`€12`, `12 gp`) |
| `width`, `height` | Each list's size (220 × 280) |
| `decorations`, `info`, `moveFor` | As [inventoryPanel](/inventory-box/)'s (`moveFor` sells a box of rounds off a stack, not the whole stack) |
| `handleDone({ dealt })` | Closed: done, a deal, or cancelled (`dealt: false`) |

`begin()` starts a fresh trade (call it each time it opens); `trade` is the
current [trade](/trade/).
*/
/*{ "parent": "inventory", "order": 13 }*/

import { svgElements } from 'tosijs'
import type { PointerKind } from './box.js'
import { carryGhostLayer } from './carry-box.js'
import type { CarryDecorations } from './carry-box.js'
import type { Carry } from './carry.js'
import { inventoryPanel, type InventoryPanel } from './inventory-box.js'
import type { InventoryApi, Item, ItemKind, Move, Place } from './inventory.js'
import { panelRim } from './panel-rim.js'
import { beginTrade, type Trade } from './trade.js'
import { currencyFor, formatMoney } from './currency.js'

export interface TradePanelOptions {
  inv: InventoryApi
  carry: Carry<string>
  mine: Place
  theirs: Place
  titles?: { mine?: string; theirs?: string }
  price?: (item: Item, from: Place | null, to: Place | null) => number
  currency?: string
  width?: number
  height?: number
  decorations?: (
    item: Item,
    kind: ItemKind | undefined
  ) => CarryDecorations | undefined
  info?: (item: Item, kind: ItemKind | undefined) => string[]
  /** The move a drop makes (a box of 24 rounds off a stack of 120): as inventoryPanel's. */
  moveFor?: (item: string, from: Place | null, to: Place) => Move
  handleDone?: (result: { dealt: boolean }) => void
}

export interface TradePanel {
  svg: SVGSVGElement
  /** Start a fresh trade: call it each time it opens. */
  begin: () => void
  readonly trade: Trade | null
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  dispose: () => void
}

const same = (a: Place | null, b: Place) =>
  a != null && a.holder === b.holder && a.container === b.container

export function tradePanel(opts: TradePanelOptions): TradePanel {
  const { inv, carry, mine, theirs, price } = opts
  const W = opts.width ?? 220
  const H = opts.height ?? 280
  const GAP = 8
  const FOOT = 74
  const shop = price != null
  const currency = opts.currency ?? inv.currencies[0]?.id ?? 'gold'
  // Written as the game writes it (`€12`, `12 gold`): the inventory's currencies.
  const money = (n: number) => formatMoney(n, currencyFor(inv.currencies, currency))
  const TW = W * 2 + GAP
  const TH = H + FOOT
  const { svg, g, rect, text } = svgElements
  const root = svg({
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${TW} ${TH}`,
    width: TW,
    height: TH,
  }) as unknown as SVGSVGElement
  root.append(
    rect({ x: 0, y: 0, width: TW, height: TH, rx: 10, fill: '#161b26' }) as unknown as SVGElement
  )
  const nested = (x: number) => {
    const s = svg({ x, y: 0, width: W, height: H }) as unknown as SVGSVGElement
    root.append(s)
    return s
  }
  const theirHost = nested(0)
  const myHost = nested(W + GAP)
  // Only across: this panel is a trade, not a place to rearrange.
  const refuse = (_id: string, from: Place | null) =>
    same(from, mine) || same(from, theirs) ? [] : ['not part of this trade']
  const common = {
    inv,
    carry,
    decorations: opts.decorations,
    info: opts.info,
    moveFor: opts.moveFor,
    refuse,
    overlay: false,
    fit: false,
    height: H,
    totals: shop,
    putLabel: 'put here',
  }
  const theirPanel = inventoryPanel({
    ...common,
    host: theirHost,
    holder: theirs.holder,
    only: [theirs.container],
    title: opts.titles?.theirs ?? theirs.holder,
    headings: false,
  })
  const myPanel = inventoryPanel({
    ...common,
    host: myHost,
    holder: mine.holder,
    only: [mine.container],
    title: opts.titles?.mine ?? 'you',
    headings: false,
  })

  // The deal: a line saying where things stand, a line of reasons, buttons.
  const line = text({
    x: 14,
    y: H + 24,
    fill: '#e8e8e8',
    'font-size': 15,
    'font-weight': 600,
    'font-family': 'system-ui, sans-serif',
  }) as unknown as SVGTextElement
  const note = text({
    x: 14,
    y: H + 46,
    fill: '#9fb0c8',
    'font-size': 12,
    'font-family': 'system-ui, sans-serif',
  }) as unknown as SVGTextElement
  root.append(line, note)
  type Button = { label: string; x: number; w: number; act: () => void; el: SVGGElement }
  const BH = 32
  const BY = H + FOOT - BH - 10
  const button = (label: string, w: number, act: () => void): Button => {
    const el = g(
      { cursor: 'pointer' },
      rect({ width: w, height: BH, rx: 8, fill: '#2c3546', stroke: '#9fb0c8', 'stroke-width': 1 }),
      text(
        {
          x: w / 2,
          y: BH / 2 + 5,
          'text-anchor': 'middle',
          fill: '#dfe6f2',
          'font-size': 14,
          'font-family': 'system-ui, sans-serif',
        },
        label
      )
    ) as unknown as SVGGElement
    root.append(el)
    return { label, x: 0, w, act, el }
  }
  let trade: Trade | null = null
  let said = ''
  const done = (dealt: boolean) => {
    carry.cancel()
    opts.handleDone?.({ dealt })
  }
  const buttons: Button[] = shop
    ? [
        button('cancel', 90, () => {
          trade?.revert()
          done(false)
        }),
        button('deal', 90, () => {
          const r = trade?.deal(currency)
          if (r && !r.ok) {
            said = r.reasons[0] ?? 'refused'
            draw()
            return
          }
          done(true)
        }),
      ]
    : [
        button('take all', 100, () => {
          const ids = inContainer(inv, theirs)
          const r = inv.move(...ids.map((item) => ({ item, to: mine })))
          if (!r.ok) {
            said = r.reasons[0] ?? 'refused'
            draw()
          }
        }),
        button('done', 90, () => done(true)),
      ]
  // Right-aligned, in order.
  let bx = TW - 12
  for (const b of [...buttons].reverse()) {
    bx -= b.w
    b.x = bx
    b.el.setAttribute('transform', `translate(${bx}, ${BY})`)
    bx -= 8
  }
  root.append(panelRim(TW, TH, 10))

  const purse = (p: Place) => inv.doc.holders[p.holder]?.purse?.[currency] ?? 0
  function draw() {
    if (shop) {
      const b = trade?.balance() ?? 0
      line.textContent =
        b > 0 ? `you pay ${money(b)}` : b < 0 ? `you receive ${money(-b)}` : 'even'
      note.textContent =
        said || `you have ${money(purse(mine))} · they have ${money(purse(theirs))}`
    } else {
      const n = inContainer(inv, theirs).length
      const taken = trade?.changed().filter((c) => same(c.to, mine)).length ?? 0
      line.textContent =
        n === 0 ? 'empty' : `${n} thing${n === 1 ? '' : 's'} left in it`
      note.textContent = said || (taken ? `taking ${taken}` : 'drag across, or take all')
    }
  }
  const stop = inv.subscribe(() => {
    said = ''
    draw()
  })
  draw()

  const ghosts = carryGhostLayer(carry, root)
  const parts: Array<{ host: SVGSVGElement; panel: InventoryPanel; x: number }> = [
    { host: theirHost, panel: theirPanel, x: 0 },
    { host: myHost, panel: myPanel, x: W + GAP },
  ]
  let under: (typeof parts)[number] | null = null
  let pressed: Button | null = null
  const buttonAt = (x: number, y: number) =>
    buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= BY && y <= BY + BH) ?? null
  const handlePointer = (kind: PointerKind, x: number, y: number) => {
    if (kind === 'down' && buttonAt(x, y)) {
      pressed = buttonAt(x, y)
      return
    }
    if (pressed) {
      if (kind === 'up' && buttonAt(x, y) === pressed) pressed.act()
      if (kind === 'up' || kind === 'leave') pressed = null
      return
    }
    ghosts.handlePointer(kind, x, y)
    const now =
      kind === 'leave'
        ? null
        : parts.find((p) => x >= p.x && x < p.x + W && y >= 0 && y < H) ?? null
    if (now !== under) {
      under?.panel.handlePointer('leave', 0, 0)
      under = now
    }
    if (now && kind !== 'leave') now.panel.handlePointer(kind, x - now.x, y)
    if (kind === 'up' && !now && carry.state.thing != null) carry.cancel()
  }
  ;(root as unknown as { handlePointer: typeof handlePointer }).handlePointer =
    handlePointer

  return {
    svg: root,
    begin() {
      carry.cancel()
      said = ''
      trade = beginTrade(inv, { mine, theirs }, price)
      draw()
    },
    get trade() {
      return trade
    },
    handlePointer,
    dispose() {
      stop()
      ghosts.dispose()
      theirPanel.dispose()
      myPanel.dispose()
    },
  }
}

function inContainer(inv: InventoryApi, p: Place): string[] {
  const c = inv.doc.holders[p.holder]?.containers[p.container]
  if (c == null) return []
  if (c.type === 'list') return [...c.holds]
  if (c.type === 'grid') return c.holds.map((h) => h.item)
  return Object.values(c.slots)
    .map((s) => s.holds)
    .filter((id): id is string => id != null)
}
