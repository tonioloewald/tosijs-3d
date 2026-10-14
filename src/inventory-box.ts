/*#
# inventory-box

**An [inventory](/inventory/) holder on a panel**, wired to
[carry](/carry/)'s drag and drop: its slots are sockets, its lists are
tiles with a place to drop, and every drop is checked and made by the model,
so a socket lights and says why using the model's own rules. Several panels
over one inventory and one carry are a party, a trade, a shop.

This is the plain layout: one row per container. A **schematic** (a paper
doll, a craft from above, an SSD), where the sockets sit on a picture, is the
same wiring with the slots placed by art.

## Demo

A hero and a companion. Drag between them, into hands and onto heads; the
rifle needs both hands, a helm only goes on a head. Tap, then tap, works too.

```js
import { ui, createCarry, createInventory, inventoryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const kinds = {
  sword: { id: 'sword', name: 'sword', tags: ['hand'], mass: 3, contributes: { damage: 6 } },
  rifle: { id: 'rifle', name: 'rifle', tags: ['hand', 'two-handed'], mass: 4, contributes: { damage: 9 } },
  helm: { id: 'helm', name: 'helm', tags: ['head'], mass: 2, contributes: { armour: 2 } },
  potion: { id: 'potion', name: 'potion', tags: ['drink'], stack: 9 },
}
const body = () => ({ type: 'slots', slots: { head: { accepts: ['head'], holds: null }, left: { accepts: ['hand'], holds: null }, right: { accepts: ['hand'], holds: null } } })
const inv = createInventory(
  {
    items: { s: { id: 's', kind: 'sword', qty: 1 }, r: { id: 'r', kind: 'rifle', qty: 1 }, h: { id: 'h', kind: 'helm', qty: 1 }, p: { id: 'p', kind: 'potion', qty: 3, props: { durability: 0.4 } } },
    holders: {
      hero: { id: 'hero', containers: { body: body(), bag: { type: 'list', holds: ['s', 'r', 'h', 'p'] } } },
      friend: { id: 'friend', containers: { body: body(), bag: { type: 'list', holds: [] } } },
    },
  },
  {
    kinds,
    rules: [({ doc, kinds }) => Object.values(doc.holders).flatMap((h) => {
      const s = h.containers.body.slots
      const two = [s.left.holds, s.right.holds].find((id) => id && kinds[doc.items[id].kind].tags.includes('two-handed'))
      return two && s.left.holds && s.right.holds ? ['two-handed: both hands must be free'] : []
    })],
  }
)
const carry = createCarry()
// What each thing shows: a count, and a bar where it has durability.
const decorations = (item) => ({ badge: item.qty > 1 ? '×' + item.qty : undefined, bar: item.props?.durability })
preview.style.cssText = 'display:flex; gap:12px; align-items:flex-start; overflow:auto; padding:8px'
for (const id of ['hero', 'friend']) {
  const host = svg({ viewBox: '0 0 300 330', width: 300, height: 330, style: 'touch-action:none; flex:none' })
  preview.append(host)
  inventoryPanel({ inv, carry, holder: id, host, title: id, decorations })
}
window.addEventListener('pointerup', () => carry.cancel())
```
```css
.preview { height: 100%; }
```

## Options

| | |
| --- | --- |
| `inv`, `carry` | the model and the carry (share both between panels) |
| `holder` | which holder this panel shows |
| `host` | the `<svg>` it draws into (it listens for the pointer there) |
| `decorations(item, kind)` | what a thing shows: a bar, an outline, a badge |
| `moveFor(item, from, to)` | the move to make for a drop, to add a price (`pay`, `payee`): a shop |
| `totals` | show the holder's totals under its title (default on) |
*/
/*{ "parent": "inventory", "order": 10 }*/

import { box, textBlock, svgPoint } from './box.js'
import type { BoxChild } from './box.js'
import { carryPanel, carrySocket, carryTile, type CarryDecorations } from './carry-box.js'
import type { Carry, CarryTarget } from './carry.js'
import type { InventoryApi, Item, ItemKind, Move, Place } from './inventory.js'

export interface InventoryPanelOptions {
  inv: InventoryApi
  carry: Carry<string>
  holder: string
  host: SVGSVGElement
  title?: string
  decorations?: (item: Item, kind: ItemKind | undefined) => CarryDecorations | undefined
  moveFor?: (item: string, from: Place | null, to: Place) => Move
  totals?: boolean
}

/** Places are passed through the carry as strings. */
const enc = (p: Place) => JSON.stringify(p)

/** Draw one holder of an inventory into `host`, redrawn whenever the inventory changes. */
export function inventoryPanel(opts: InventoryPanelOptions): { dispose: () => void } {
  const { inv, carry, holder, host } = opts
  const width = Number(host.getAttribute('width')) || 300
  const kinds = inv.kinds
  let panel: ReturnType<typeof carryPanel> | null = null

  const moveTo = (item: string, to: Place): Move =>
    opts.moveFor?.(item, inv.where(item), to) ?? { item, to, swap: true }

  const target = (to: Place, id: string): CarryTarget<string> => ({
    id,
    accepts: (item) => inv.check(moveTo(item, to)),
    receive: (item) => {
      const r = inv.move(moveTo(item, to))
      return r.ok ? [] : r.reasons
    },
  })

  const tile = (id: string, at: Place) => {
    const item = inv.doc.items[id]
    const kind = kinds[item.kind]
    return carryTile({
      carry,
      thing: id,
      from: enc(at),
      label: kind?.name ?? item.kind,
      decorations: () => opts.decorations?.(item, kind),
    })
  }

  const build = () => {
    const h = inv.doc.holders[holder]
    if (!h) return
    const children: BoxChild[] = []
    if (opts.title) children.push(textBlock(opts.title, { font: { size: 15, weight: 700 }, color: '#e8e8e8' }))
    if (opts.totals !== false) {
      const t = inv.totals(holder)
      const line = Object.entries(t)
        .map(([k, v]) => `${k} ${Math.round(v * 10) / 10}`)
        .join(' · ')
      if (line) children.push(textBlock(line, { font: { size: 11 }, color: '#8a96ad' }))
    }
    for (const [cname, c] of Object.entries(h.containers)) {
      children.push(textBlock(cname, { font: { size: 12, weight: 600 }, color: '#aab4c8' }))
      if (c.type === 'slots') {
        for (const [s, slot] of Object.entries(c.slots)) {
          const at: Place = { holder, container: cname, slot: s }
          children.push(
            carrySocket({
              carry,
              target: target(at, `${holder}/${cname}/${s}`),
              label: s,
              width: width - 24,
              holding: slot.holds ? tile(slot.holds, at) : null,
            })
          )
        }
      } else if (c.type === 'list') {
        const at: Place = { holder, container: cname }
        for (const id of c.holds) children.push(tile(id, at))
        children.push(
          carrySocket({
            carry,
            target: target(at, `${holder}/${cname}`),
            label: `put in ${cname}`,
            width: width - 24,
            height: 30,
          })
        )
      } else {
        // A grid wants its picture (a schematic); here it is listed.
        for (const e of c.holds) children.push(tile(e.item, { holder, container: cname, x: e.x, y: e.y }))
      }
    }
    host.textContent = ''
    const b = box({ width, padding: 12, gap: 8, background: '#1c2230', radius: 10 }, ...children)
    host.append(b.el)
    // Grow to fit what it holds (a full bag is taller than an empty one).
    const tall = Math.max(Number(host.getAttribute('height')) || 0, Math.ceil(b.contentHeight + 24))
    host.setAttribute('height', String(tall))
    host.setAttribute('viewBox', `0 0 ${width} ${tall}`)
    panel = carryPanel(b, carry)
  }
  build()
  const stop = inv.subscribe(() => build())

  const at = (e: PointerEvent): [number, number] => {
    const p = svgPoint(host, e.clientX, e.clientY)
    return [p.x, p.y]
  }
  const down = (e: PointerEvent) => panel?.handlePointer('down', ...at(e))
  const move = (e: PointerEvent) => panel?.handlePointer('move', ...at(e))
  const up = (e: PointerEvent) => panel?.handlePointer('up', ...at(e))
  const leave = () => panel?.handlePointer('leave', 0, 0)
  host.addEventListener('pointerdown', down)
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerup', up)
  host.addEventListener('pointerleave', leave)
  return {
    dispose() {
      stop()
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointerleave', leave)
    },
  }
}
