/*#
# inventory-box

**An [inventory](/inventory/) holder on a panel**, wired to
[carry](/carry/)'s drag and drop: its slots are sockets, its lists are
tiles with a place to drop, and every drop is checked and made by the model,
so a socket lights and says why using the model's own rules. Several panels
over one inventory and one carry are a party, a trade, a shop.

A container can be drawn as a **schematic**: an SVG (a paper doll, a craft
from above, an SSD) whose sockets are its slots, so the art decides where
things go. It is drawn at the art's own scale, cropped to what is drawn and
shrunk only if the panel is too narrow, so a socket designed 44 units square
is a 44-unit target. Lists are scrolling lists.

Colour the art with CSS variables that have defaults, e.g.
`fill: var(--schematic-body, #59647a)`. On the page a panel's host can
restyle it (`host.style.setProperty('--schematic-body', '#7a4a3a')`); drawn
as a texture (where page variables do not reach), it uses the defaults. The
demo art uses `--schematic-body`, `--schematic-socket`,
`--schematic-socket-edge` and `--schematic-label`. (Never write `--` inside
an XML comment in the art: the file stops being XML and will not draw as an
image.)

**Pictures and the info floater.** A kind's `icon` is SVG markup (the demos
load theirs from one JSON file, a kind id to its picture). A row in a list
shows the picture and the name; in a socket the picture fills it, and it is
the picture a drag carries. Point at a thing, or select it with a gamepad,
and a floater says what it is: by default its name, `description`, mass and
what it adds (`info` replaces that).

## Equip a person

The art is an SVG with a `Sockets` group; each socket's id is a slot. Drag
from the bag onto the body, or tap, then tap. The rifle needs both hands
(and shows, faded, in the other one), a helm only goes on a head, and
anything worn can be dragged back off.

```js
import { createCarry, createInventory, inventoryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const kind = (id, tags, more) => ({ id, name: id, tags, ...more })
const kinds = {
  helm: kind('helm', ['helmet'], { mass: 2, contributes: { armour: 2 } }),
  goggles: kind('goggles', ['face']),
  cuirass: kind('cuirass', ['chest'], { mass: 8, contributes: { armour: 5 } }),
  pauldron: kind('pauldron', ['shoulder'], { mass: 2, contributes: { armour: 1 } }),
  pack: kind('pack', ['back'], { mass: 1 }),
  belt: kind('belt', ['waist']),
  knife: kind('knife', ['side', 'hand'], { mass: 1, contributes: { damage: 2 } }),
  pistol: kind('pistol', ['side', 'hand'], { mass: 1, contributes: { damage: 4 } }),
  greaves: kind('greaves', ['legs'], { mass: 3, contributes: { armour: 2 } }),
  boots: kind('boots', ['feet'], { mass: 2 }),
  sword: kind('sword', ['hand'], { mass: 3, contributes: { damage: 6 } }),
  rifle: kind('rifle', ['hand', 'two-handed'], { mass: 4, contributes: { damage: 9 }, description: 'needs both hands' }),
  shield: kind('shield', ['hand'], { mass: 5, contributes: { armour: 3 } }),
  potion: kind('potion', ['drink'], { stack: 9 }),
}
const slot = (...accepts) => ({ accepts, holds: null })
const body = {
  type: 'slots',
  slots: {
    helmet: slot('helmet'), face: slot('face'), chest: slot('chest'), shoulder: slot('shoulder'),
    back: slot('back'), waist: slot('waist'), left_side: slot('side'), right_side: slot('side'),
    legs: slot('legs'), feet: slot('feet'), hand_left: slot('hand'), hand_right: slot('hand'),
  },
}
const items = {}
for (const k of Object.keys(kinds)) items[k] = { id: k, kind: k, qty: k === 'potion' ? 3 : 1 }
items.shield.damaged = 1
items.pistol.props = { charge: 0.3 }
const inv = createInventory(
  { items, holders: { hero: { id: 'hero', containers: { body, bag: { type: 'list', holds: Object.keys(items) } } } } },
  {
    kinds,
    rules: [({ doc, kinds }) => {
      const s = doc.holders.hero.containers.body.slots
      const hands = [s.hand_left.holds, s.hand_right.holds]
      const two = hands.find((id) => id && kinds[doc.items[id].kind].tags.includes('two-handed'))
      return two && hands[0] && hands[1] ? ['two-handed: both hands must be free'] : []
    }],
  }
)
const carry = createCarry()
const decorations = (item) => ({
  badge: item.qty > 1 ? '×' + item.qty : undefined,
  bar: item.props?.charge,
  outline: item.damaged ? 'damaged' : undefined,
})
preview.style.cssText = 'display:flex; gap:12px; align-items:flex-start; overflow:auto; padding:8px'
preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '560px')
const bodyHost = svg({ width: 410, height: 540, style: 'touch-action:none' })
const bagHost = svg({ width: 200, height: 540, style: 'touch-action:none' })
preview.append(bodyHost, bagHost)
// The art, and a picture per kind (SVG markup; see the note on icons below).
Promise.all([fetch('/person-loadout.svg').then((r) => r.text()), fetch('/item-icons.json').then((r) => r.json())]).then(([art, icons]) => {
  for (const k of Object.keys(kinds)) kinds[k].icon = icons[k]
  // A two-handed weapon shows, faded, in the other hand too.
  const alsoIn = (item, kind, at) =>
    kind?.tags.includes('two-handed') && at.slot?.startsWith('hand_') ? [at.slot === 'hand_left' ? 'hand_right' : 'hand_left'] : []
  inventoryPanel({ inv, carry, holder: 'hero', host: bodyHost, title: 'hero', decorations, alsoIn, schematics: { body: art }, hide: ['bag'] })
  inventoryPanel({ inv, carry, holder: 'hero', host: bagHost, decorations, only: ['bag'], totals: false, height: 540 })
})
```
```css
.preview { height: 100%; }
```

## Arm a Manta

The carrier holds a counted stock; a hardpoint takes one at a time, and
one put back joins its stack. The craft has a weight limit.

```js
import { createCarry, createInventory, inventoryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const kind = (id, name, tags, mass, stack = 1) => ({ id, name, tags, mass, stack })
const kinds = {
  aam: kind('aam', 'AAM', ['missile', 'pylon'], 90, 24),
  agm: kind('agm', 'AGM', ['missile', 'pylon'], 160, 12),
  bomb: kind('bomb', 'bomb', ['bomb', 'pylon'], 250, 12),
  tank: kind('tank', 'fuel tank', ['tank', 'external'], 300, 6),
  pod: kind('pod', 'gun pod', ['weapon'], 200, 4),
  ecm: kind('ecm', 'ECM', ['avionics'], 40, 4),
  nav: kind('nav', 'nav suite', ['avionics'], 30, 4),
  radar: kind('radar', 'radar', ['sensors'], 80, 4),
  irst: kind('irst', 'IRST', ['sensors'], 50, 4),
  fan: kind('fan', 'turbofan', ['engines'], 600, 2),
  ram: kind('ram', 'ramjet', ['engines'], 450, 2),
}
const slot = (...accepts) => ({ accepts, holds: null })
const manta = {
  type: 'slots',
  slots: {
    avionics: slot('avionics'), sensors: slot('sensors'), engines: slot('engines'),
    centerline_weapon: slot('weapon', 'bomb', 'tank'),
    internal_left_pylon: slot('pylon'), internal_right_pylon: slot('pylon'),
    external_left_pylon: slot('pylon', 'external'), external_right_pylon: slot('pylon', 'external'),
  },
}
const stock = { aam: 16, agm: 6, bomb: 8, tank: 4, pod: 2, ecm: 2, nav: 2, radar: 2, irst: 1, fan: 2, ram: 1 }
const items = {}
for (const [k, qty] of Object.entries(stock)) items[k] = { id: k, kind: k, qty }
const inv = createInventory(
  { items, holders: {
    manta: { id: 'manta', containers: { hardpoints: manta } },
    carrier: { id: 'carrier', containers: { stock: { type: 'list', holds: Object.keys(items) } } },
  } },
  { kinds, rules: [({ totals }) => ((totals('manta').mass ?? 0) > 1200 ? ['over the Manta\'s 1200 kg'] : [])] }
)
const carry = createCarry()
const decorations = (item) => ({ badge: item.qty > 1 ? '×' + item.qty : undefined })
preview.style.cssText = 'display:flex; gap:12px; align-items:flex-start; overflow:auto; padding:8px'
preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '560px')
const craftHost = svg({ width: 480, height: 420, style: 'touch-action:none' })
const stockHost = svg({ width: 200, height: 420, style: 'touch-action:none' })
preview.append(craftHost, stockHost)
// The art, and a picture per kind (SVG markup; see the note on icons below).
Promise.all([fetch('/manta-loadout.svg').then((r) => r.text()), fetch('/item-icons.json').then((r) => r.json())]).then(([art, icons]) => {
  for (const k of Object.keys(kinds)) kinds[k].icon = icons[k]
  inventoryPanel({ inv, carry, holder: 'manta', host: craftHost, title: 'Manta', decorations, schematics: { hardpoints: art } })
  inventoryPanel({ inv, carry, holder: 'carrier', host: stockHost, title: 'carrier', decorations, totals: false, height: 420 })
})
```
```css
.preview { height: 100%; }
```

## A shop

The shop's goods on the left, yours on the right, the deal in the middle.
Put things on the counter from either side; the balance is the price of
what you get less what yours fetch, and **Deal** makes every move and the
payment as one, or none of it. The shop's goods only go to the counter,
and yours only come back to you.

```js
import { ui, createCarry, createInventory, inventoryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const kinds = {
  sword: { id: 'sword', name: 'sword', cost: 40 },
  shield: { id: 'shield', name: 'shield', cost: 30 },
  rope: { id: 'rope', name: 'rope', cost: 2, stack: 20 },
  potion: { id: 'potion', name: 'potion', cost: 12, stack: 9 },
  lamp: { id: 'lamp', name: 'lamp', cost: 8 },
  pelt: { id: 'pelt', name: 'wolf pelt', cost: 10, stack: 10 },
  ring: { id: 'ring', name: 'old ring', cost: 60 },
}
const item = (id, kind, qty = 1) => ({ id, kind, qty })
const list = (...holds) => ({ type: 'list', holds })
const SHOP = { holder: 'shop', container: 'stock' }
const BAG = { holder: 'me', container: 'bag' }
const GET = { holder: 'counter', container: 'you get' }
const GIVE = { holder: 'counter', container: 'you give' }
// Buy at the price, sell at half.
const price = (it, from, to) =>
  (kinds[it.kind].cost ?? 0) * it.qty * (from?.container === 'you give' ? 0.5 : 1)
const inv = createInventory(
  {
    items: {
      sword: item('sword', 'sword'), shield: item('shield', 'shield'), rope: item('rope', 'rope', 12),
      potion: item('potion', 'potion', 6), lamp: item('lamp', 'lamp'),
      pelt: item('pelt', 'pelt', 4), ring: item('ring', 'ring'), mypotion: item('mypotion', 'potion', 1),
    },
    holders: {
      shop: { id: 'shop', containers: { stock: list('sword', 'shield', 'rope', 'potion', 'lamp') }, purse: { gold: 200 } },
      me: { id: 'me', containers: { bag: list('pelt', 'ring', 'mypotion') }, purse: { gold: 50 } },
      counter: { id: 'counter', containers: { 'you get': list(), 'you give': list() } },
    },
  },
  { kinds, price }
)
const carry = createCarry()
const same = (a, b) => a && b && a.holder === b.holder && a.container === b.container
// One at a time from a stack; remember the side it came from.
const moveFor = (id, from, to) => ({ item: id, to, ...(same(from, SHOP) || same(from, BAG) ? { qty: 1 } : {}) })
const refuse = (id, from, to) => {
  if (same(from, SHOP)) return same(to, GET) ? [] : ['put it on the counter to buy it']
  if (same(from, BAG)) return same(to, GIVE) ? [] : ['put it on the counter to sell it']
  if (same(from, GET)) return same(to, SHOP) ? [] : ['buy it first']
  if (same(from, GIVE)) return same(to, BAG) ? [] : ['that is still yours']
  return []
}
const decorations = (it) => ({ badge: it.qty > 1 ? '×' + it.qty : (kinds[it.kind].cost + 'g') })
preview.style.cssText = 'display:flex; gap:10px; align-items:flex-start; overflow:auto; padding:8px'
preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '420px')
const host = (w, h, style = '') => svg({ width: w, height: h, style: 'touch-action:none;' + style })
const shopHost = host(190, 360)
const middle = document.createElement('div')
middle.style.cssText = 'display:flex; flex-direction:column; gap:8px; flex:0 1 210px; min-width:0'
const counterHost = host(210, 280)
const dealHost = host(210, 96, 'width:100%; height:auto')
middle.append(counterHost, dealHost)
const meHost = host(190, 360)
preview.append(shopHost, middle, meHost)
const common = { inv, carry, decorations, moveFor, refuse }
fetch('/item-icons.json').then((r) => r.json()).then((icons) => {
  for (const k of Object.keys(kinds)) kinds[k].icon = icons[k]
  inventoryPanel({ ...common, holder: 'shop', host: shopHost, title: 'shop', height: 360 })
  inventoryPanel({ ...common, holder: 'counter', host: counterHost, title: 'counter', totals: false, height: 280 })
  inventoryPanel({ ...common, holder: 'me', host: meHost, title: 'you', height: 360 })
})

const onCounter = (c) => inv.doc.holders.counter.containers[c].holds
// Sell first, so what yours fetch can pay for what you get.
const dealMoves = () => [
  ...onCounter('you give').map((id) => ({ item: id, to: SHOP, pay: { holder: 'shop', in: 'gold' }, payee: 'me' })),
  ...onCounter('you get').map((id) => ({ item: id, to: BAG, pay: { holder: 'me', in: 'gold' }, payee: 'shop' })),
]
const sum = (c) => onCounter(c).reduce((n, id) => n + price(inv.doc.items[id], { container: c }), 0)
let said = ''
function drawDeal() {
  const balance = sum('you get') - sum('you give')
  const reasons = dealMoves().length ? inv.check(...dealMoves()) : ['nothing on the counter']
  const b = ui.box(
    { width: 210, padding: 10, gap: 6, background: '#1c2230', radius: 10 },
    ui.textBlock(balance >= 0 ? `you pay ${balance} gold` : `you receive ${-balance} gold`, { font: { size: 13, weight: 600 }, color: '#e8e8e8' }),
    ui.textBlock(said || reasons[0] || 'ready', { font: { size: 11 }, color: said === 'done' || !reasons.length ? '#6fd08c' : '#f0907c' }),
    ui.button('Deal', { handleActivate: () => {
      const r = inv.move(...dealMoves())
      said = r.ok ? 'done' : r.reasons[0]
      drawDeal()
    } }),
  )
  dealHost.textContent = ''
  dealHost.append(b.el)
  dealHost.setAttribute('viewBox', `0 0 210 ${dealHost.getAttribute('height')}`)
  dealBox = b
}
let dealBox
inv.subscribe(() => { said = ''; drawDeal() })
drawDeal()
const at = (e) => { const p = ui.svgPoint(dealHost, e.clientX, e.clientY); return [p.x, p.y] }
dealHost.addEventListener('pointerdown', (e) => dealBox.handlePointer('down', ...at(e)))
dealHost.addEventListener('pointerup', (e) => dealBox.handlePointer('up', ...at(e)))
```
```css
.preview { height: 100%; }
```

## In 3D

The same loadout in a scene, flat and in a headset, as the panel over your
left shoulder (the top left of the view on a monitor) in place of the
"Inventory" placeholder. Touch or click it and it comes front and centre,
bigger, with the bag beside it to drag to and from; the button at its corner
sends it back. `inventoryDock` draws both into one SVG, so a drag between
them is one panel; give it no `list` for a craft fitted from a carrier's
stock, and it opens to the schematic alone. A `<tosi-b3d-panel>` takes the
dock's `svg`, and the dock asks it to come forward (`panelfocus`).

```js
import { b3d, b3dLight, b3dGround, b3dPanel, createCarry, createInventory, inventoryDock } from 'tosijs-3d'

const kind = (id, tags, mass) => ({ id, name: id, tags, mass })
const kinds = {
  helm: kind('helm', ['helmet'], 2), cuirass: kind('cuirass', ['chest'], 8), pack: kind('pack', ['back'], 1),
  knife: kind('knife', ['side', 'hand'], 1), pistol: kind('pistol', ['side', 'hand'], 1),
  boots: kind('boots', ['feet'], 2), sword: kind('sword', ['hand'], 3),
  rifle: kind('rifle', ['hand', 'two-handed'], 4), shield: kind('shield', ['hand'], 5),
}
const slot = (...accepts) => ({ accepts, holds: null })
const body = {
  type: 'slots',
  slots: {
    helmet: slot('helmet'), face: slot('face'), chest: slot('chest'), shoulder: slot('shoulder'),
    back: slot('back'), waist: slot('waist'), left_side: slot('side'), right_side: slot('side'),
    legs: slot('legs'), feet: slot('feet'), hand_left: slot('hand'), hand_right: slot('hand'),
  },
}
const items = {}
for (const k of Object.keys(kinds)) items[k] = { id: k, kind: k, qty: 1 }
const inv = createInventory(
  { items, holders: { hero: { id: 'hero', containers: { body, bag: { type: 'list', holds: Object.keys(items) } } } } },
  {
    kinds,
    rules: [({ doc, kinds }) => {
      const s = doc.holders.hero.containers.body.slots
      const hands = [s.hand_left.holds, s.hand_right.holds]
      const two = hands.find((id) => id && kinds[doc.items[id].kind].tags.includes('two-handed'))
      return two && hands[0] && hands[1] ? ['two-handed: both hands must be free'] : []
    }],
  }
)
const alsoIn = (item, kind, at) =>
  kind?.tags.includes('two-handed') && at.slot?.startsWith('hand_') ? [at.slot === 'hand_left' ? 'hand_right' : 'hand_left'] : []

// Over your left shoulder in a headset; on a monitor, up and to the left.
// Until the art arrives it is the placeholder card.
const loadout = b3dPanel({
  frame: 'eye', preset: 'left-shoulder', title: 'Inventory', reveal: 'always',
  presence: 'both', flatFrame: 'face', width: 0.125, resolution: 1024,
})
// Small closed, as big as ever opened; flat, near the top-left corner and
// square to the screen (flatOn).
loadout.focusScale = 4.56
loadout.flatAnchor = { azimuthDeg: -16, elevationDeg: 18, distance: 1.4, flatOn: true }
// …or in screen terms, which wins flat: at the top left (64 px in, clear of
// the scene's corner button; 2% of the shorter side down), 14% of the screen
// tall, whatever the window's shape.
loadout.screenAnchor = { left: 64, top: '2vmin', height: '14%' }

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '520px')
preview.append(
  b3d(
    {},
    b3dLight({ intensity: 1 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    loadout,
    // Declared panels replace the default set: the rest of it, as it was.
    b3dPanel({ frame: 'eye', preset: 'right-shoulder', title: 'Journal' }),
    b3dPanel({ frame: 'eye', preset: 'waist', title: 'Quick Access' }),
    b3dPanel({ frame: 'left-hand', preset: 'wrist', title: 'Menu', width: 0.09 }),
  )
)

Promise.all([fetch('/person-loadout.svg').then((r) => r.text()), fetch('/item-icons.json').then((r) => r.json())]).then(([art, icons]) => {
  for (const k of Object.keys(kinds)) kinds[k].icon = icons[k]
  const dock = inventoryDock({
    inv, carry: createCarry(), holder: 'hero', title: 'hero', alsoIn,
    schematic: { container: 'body', art }, list: 'bag',
    // A drop target under the bag: here the thing is just gone; a game puts
    // it on the ground (return reasons to refuse instead).
    handleDrop: (item) => console.log('dropped', item.kind),
  })
  // Laid out on the page (text is measured there), out of sight.
  const park = document.createElement('div')
  park.style.cssText = 'position:absolute; left:-10000px; top:0'
  park.append(dock.svg)
  preview.append(park)
  loadout.title = ''
  loadout.svg = dock.svg
})
```
```css
.preview { height: 100%; position: relative; }
tosi-b3d { width: 100%; height: 100%; }
```

## Options

| | |
| --- | --- |
| `inv`, `carry` | the model and the carry (share both between panels) |
| `holder` | which holder this panel shows |
| `host` | the `<svg>` it draws into (it listens for the pointer there) |
| `decorations(item, kind)` | what a thing shows: a bar, an outline, a badge |
| `moveFor(item, from, to)` | the move to make for a drop (by default a slot takes one from a stack, with a swap) |
| `refuse(item, from, to)` | reasons this panel will not take a move, on top of the model's rules |
| `schematics` | art per container: `{ body: svgText }`; its sockets are the slots (`data-slot`, or ids in a `Sockets` group) |
| `only`, `hide` | which containers this panel draws (one holder can be split over panels) |
| `height` | a fixed height that scrolls, instead of growing to fit |
| `totals` | show the holder's purse and totals under its title (default on) |
| `handleDrop` | `(item, kind, from)`: adds a **drop** target at the top of the list; return reasons to refuse, else it leaves the inventory (put it in the world yourself) |
| `alsoIn(item, kind, at)` | other slots an item takes up, where it is drawn faded (a two-handed weapon in both hands) |
| `overlay` | draw the drag's ghost in a page overlay above every panel (default); off inside a 3D plane |

`inventoryDock` takes the same model options plus `schematic: { container,
art }`, `list` (the container shown beside it when open, or none), `width`,
`listWidth`, `height` and `handleResize({ width, height, open })`. It returns
`svg` (for the plane), `open`, `setOpen` and `handlePointer`.
*/
/*{ "parent": "inventory", "order": 10 }*/

import { svgElements } from 'tosijs'
import { box, textBlock, svgPoint } from './box.js'
import type { BoxChild, PointerKind } from './box.js'
import {
  carryGhostLayer,
  carryOverlay,
  carryPanel,
  carrySocket,
  carryTile,
  type CarryDecorations,
} from './carry-box.js'
import type { Carry, CarryTarget } from './carry.js'
import type { InventoryApi, Item, ItemKind, Move, Place } from './inventory.js'

export interface InventoryPanelOptions {
  inv: InventoryApi
  carry: Carry<string>
  holder: string
  host: SVGSVGElement
  title?: string
  decorations?: (
    item: Item,
    kind: ItemKind | undefined
  ) => CarryDecorations | undefined
  moveFor?: (item: string, from: Place | null, to: Place) => Move
  /**
   * Reasons this panel will not take a move, on top of the model's rules: a
   * view's own policy (a shop's goods go to the counter, not into your bag).
   */
  refuse?: (item: string, from: Place | null, to: Place) => string[]
  totals?: boolean
  /**
   * Art per container (container name → SVG source or element): its slots
   * are placed where the art's sockets are. A socket is an element with
   * `data-slot="<slot>"`, or any element with an `id` inside a group with
   * the id `Sockets` (the id is the slot). Slots the art has no socket for
   * are listed under it.
   */
  schematics?: Record<string, string | SVGSVGElement>
  /** A fixed height: the panel scrolls (wheel) instead of growing. */
  height?: number
  /** Draw only these containers. */
  only?: string[]
  /** Do not draw these containers. */
  hide?: string[]
  /**
   * Other slots (in the same container) an item takes up besides its own,
   * where it is drawn faded: a two-handed weapon shown in both hands. The
   * game decides; the panel only draws it. An empty slot only.
   */
  alsoIn?: (item: Item, kind: ItemKind | undefined, at: Place) => string[]
  /**
   * Shrink to fit the space the page gives it, keeping its shape, rather than
   * being cropped (default on). Panels side by side in a row shrink in
   * proportion; in a column it is no wider than the column; it is never
   * taller than its container. Never larger than it is drawn. Anything the
   * page sets inline on the host wins. Off for a host inside another SVG.
   */
  fit?: boolean
  /**
   * What the info floater says about a thing (a title, then lines), shown
   * while it is pointed at or selected. Default: its name, its description,
   * its mass and what it adds.
   */
  info?: (item: Item, kind: ItemKind | undefined) => string[]
  /**
   * Draw the drag's ghost in a page overlay above every panel (default).
   * Off for a panel inside a 3D plane, which shares a `carryGhostLayer` in
   * the plane's SVG and is fed through `handlePointer`.
   */
  overlay?: boolean
  /**
   * Give the panel a DROP target ("drop", heading its list): a thing dropped
   * there leaves the inventory. Called first with what is dropped and where
   * from; return reasons to refuse (it springs back), or nothing to let it
   * go, and put it in the world yourself (on the ground at the player's
   * feet). No drop target without it.
   */
  handleDrop?: (
    item: Item,
    kind: ItemKind | undefined,
    from: Place
  ) => string[] | void
}

export interface InventoryPanel {
  /** Pointer input in the host's own coordinates (a plane feeds it this way). */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  dispose: () => void
}

/** Where a schematic's sockets are, in its viewBox. */
export interface SchematicSocket {
  slot: string
  x: number
  y: number
  width: number
  height: number
}

export interface Schematic {
  viewBox: [number, number, number, number]
  /** What is actually drawn (the art's own bounds, a little padded), in its units. */
  content: [number, number, number, number]
  /** The art's root, to clone from. */
  root: SVGSVGElement
  sockets: SchematicSocket[]
}

const schematicCache = new Map<string | SVGSVGElement, Schematic>()

/** A box around an element's coordinates when it cannot be measured (no layout). */
function roughBox(el: Element): [number, number, number, number] | null {
  const n = (a: string) => Number(el.getAttribute(a) ?? 0)
  const tag = el.tagName.toLowerCase()
  if (tag === 'rect') return [n('x'), n('y'), n('width'), n('height')]
  if (tag === 'circle')
    return [n('cx') - n('r'), n('cy') - n('r'), 2 * n('r'), 2 * n('r')]
  if (tag === 'ellipse')
    return [n('cx') - n('rx'), n('cy') - n('ry'), 2 * n('rx'), 2 * n('ry')]
  // A path in absolute coordinates: its points and control points enclose it.
  const nums = (el.getAttribute('d') ?? el.getAttribute('points') ?? '').match(
    /-?\d*\.?\d+(?:e-?\d+)?/gi
  )
  if (!nums || nums.length < 2) return null
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    xs.push(Number(nums[i]))
    ys.push(Number(nums[i + 1]))
  }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
}

/**
 * Read a schematic: its viewBox, and where each socket is. Measured by the
 * browser when there is one (so transforms and relative paths are right),
 * else from the elements' own coordinates.
 */
export function readSchematic(src: string | SVGSVGElement): Schematic {
  const hit = schematicCache.get(src)
  if (hit) return hit
  const root =
    typeof src === 'string'
      ? (new DOMParser().parseFromString(src, 'image/svg+xml')
          .documentElement as unknown as SVGSVGElement)
      : src
  const vb = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  const viewBox: [number, number, number, number] =
    vb.length === 4 && vb.every(Number.isFinite)
      ? (vb as [number, number, number, number])
      : [
          0,
          0,
          Number.parseFloat(root.getAttribute('width') ?? '') || 100,
          Number.parseFloat(root.getAttribute('height') ?? '') || 100,
        ]
  const found = new Map<string, Element>()
  for (const el of Array.from(root.querySelectorAll('[data-slot]')))
    found.set(el.getAttribute('data-slot')!, el)
  for (const group of Array.from(root.querySelectorAll('[id]')).filter(
    (e) => e.id.toLowerCase() === 'sockets'
  )) {
    for (const el of Array.from(group.children))
      if (el.id && !found.has(el.id)) found.set(el.id, el)
  }
  // Measured in a hidden copy on the page, mapped back into the art's own units.
  let measure:
    | ((el: Element) => [number, number, number, number] | null)
    | null = null
  let cleanup = () => {}
  let drawn: [number, number, number, number] | null = null
  if (
    typeof document !== 'undefined' &&
    document.body &&
    typeof (root as any).getBBox === 'function'
  ) {
    const copy = root.cloneNode(true) as SVGSVGElement
    copy.setAttribute(
      'style',
      'position:absolute; left:-10000px; top:0; visibility:hidden'
    )
    document.body.append(copy)
    cleanup = () => copy.remove()
    try {
      const b = copy.getBBox()
      if (b.width > 0) drawn = [b.x, b.y, b.width, b.height]
    } catch {
      drawn = null
    }
    measure = (el) => {
      const twin = el.getAttribute('data-slot')
        ? copy.querySelector(`[data-slot="${el.getAttribute('data-slot')}"]`)
        : copy.querySelector(`[id="${el.id}"]`)
      try {
        const b = (twin as SVGGraphicsElement).getBBox()
        const to = copy
          .getScreenCTM()!
          .inverse()
          .multiply((twin as SVGGraphicsElement).getScreenCTM()!)
        const pts = [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x, b.y + b.height],
          [b.x + b.width, b.y + b.height],
        ].map(([x, y]) => [
          to.a * x + to.c * y + to.e,
          to.b * x + to.d * y + to.f,
        ])
        const xs = pts.map((p) => p[0])
        const ys = pts.map((p) => p[1])
        const x = Math.min(...xs)
        const y = Math.min(...ys)
        if (!(Math.max(...xs) - x > 0)) return null
        return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
      } catch {
        return null
      }
    }
  }
  const sockets: SchematicSocket[] = []
  for (const [slot, el] of found) {
    const b = measure?.(el) ?? roughBox(el)
    if (b) sockets.push({ slot, x: b[0], y: b[1], width: b[2], height: b[3] })
  }
  // The drawing's own bounds, so empty margins in the file cost no space.
  const boxes = drawn
    ? [drawn]
    : Array.from(
        root.querySelectorAll('path, rect, circle, ellipse, polygon, polyline')
      )
        .filter((el) => !el.closest('defs, clipPath, mask'))
        .map(roughBox)
        .filter((b): b is [number, number, number, number] => !!b)
  let content = viewBox
  if (boxes.length) {
    const pad = 4
    const x0 = Math.min(...boxes.map((b) => b[0])) - pad
    const y0 = Math.min(...boxes.map((b) => b[1])) - pad
    const x1 = Math.max(...boxes.map((b) => b[0] + b[2])) + pad
    const y1 = Math.max(...boxes.map((b) => b[1] + b[3])) + pad
    content = [x0, y0, x1 - x0, y1 - y0]
  }
  cleanup()
  const out = { viewBox, content, root, sockets }
  schematicCache.set(src, out)
  return out
}

/**
 * How a schematic sits in `avail` panel units: at the art's OWN scale (a
 * socket drawn 44 units square is 44 on the panel, the size it was designed
 * as a target), shrunk only when the panel is too narrow, and centred.
 */
export function schematicFit(s: Schematic, avail: number) {
  const [cx, cy, cw, ch] = s.content
  const k = Math.min(1, avail / cw)
  const ox = (avail - cw * k) / 2
  return {
    k,
    height: ch * k,
    /** A point in the art's units to panel units, relative to the art's box. */
    at: (x: number, y: number) => ({ x: ox + (x - cx) * k, y: (y - cy) * k }),
  }
}

/** The art as a box child, `avail` wide. */
function artChild(s: Schematic, avail: number): BoxChild {
  const fit = schematicFit(s, avail)
  const o = fit.at(s.content[0], s.content[1])
  const el = svgElements.svg({
    x: o.x,
    width: s.content[2] * fit.k,
    height: fit.height,
    viewBox: s.content.join(' '),
    'pointer-events': 'none',
  }) as unknown as SVGElement
  for (const c of Array.from(s.root.childNodes)) el.append(c.cloneNode(true))
  return { el, kind: 'block', measure: () => ({ height: fit.height }) }
}

/** Places are passed through the carry as strings. */
const enc = (p: Place) => JSON.stringify(p)

const defaultInfo = (item: Item, kind: ItemKind | undefined): string[] => {
  const lines = [
    `${kind?.name ?? item.kind}${item.qty > 1 ? ` ×${item.qty}` : ''}`,
  ]
  if (kind?.description) lines.push(kind.description)
  if (kind?.mass != null) lines.push(`mass ${kind.mass}`)
  for (const [k, v] of Object.entries(kind?.contributes ?? {}))
    lines.push(`${k} ${v > 0 ? '+' : ''}${v}`)
  if (item.damaged) lines.push(`damaged (${item.damaged})`)
  return lines
}

/** Draw one holder of an inventory into `host`, redrawn whenever the inventory changes. */
export function inventoryPanel(opts: InventoryPanelOptions): InventoryPanel {
  const { inv, carry, holder, host } = opts
  const width = Number(host.getAttribute('width')) || 300
  if (opts.fit !== false && !(host.parentNode instanceof SVGElement)) {
    const st = host.style
    const set = (k: string, v: string) =>
      st.getPropertyValue(k) || st.setProperty(k, v)
    set('flex', '0 1 auto')
    set('width', `${width}px`)
    set('max-width', '100%')
    set('min-width', '0')
    set('height', 'auto')
    set('max-height', '100%')
  }
  const kinds = inv.kinds
  let panel: ReturnType<typeof carryPanel> | null = null
  let disposers: (() => void)[] = []
  let scroll = 0
  let current: ReturnType<typeof box> | null = null
  // A panel showing ONE list takes a drop anywhere on it, and is outlined
  // while it would take what is carried (brighter while the pointer is on it).
  let whole: { target: CarryTarget<string>; from: string } | null = null
  const glow = svgElements.rect({
    x: 1.5,
    y: 1.5,
    rx: 10,
    fill: 'none',
    'stroke-width': 3,
    'pointer-events': 'none',
  })
  const lightUp = () => {
    const s = carry.state
    const v =
      whole && s.thing != null && s.from !== whole.from
        ? carry.verdictFor(whole.target)
        : null
    glow.setAttribute(
      'stroke',
      v?.ok ? (s.target === whole?.target ? '#c4f5d2' : '#6fd08c') : 'none'
    )
  }
  const stopGlow = carry.subscribe(lightUp)

  // By default a slot takes ONE from a stack; a list takes the lot.
  const moveTo = (item: string, to: Place): Move =>
    opts.moveFor?.(item, inv.where(item), to) ?? {
      item,
      to,
      swap: true,
      ...(to.slot != null && (inv.doc.items[item]?.qty ?? 1) > 1
        ? { qty: 1 }
        : {}),
    }

  const target = (to: Place, id: string): CarryTarget<string> => ({
    id,
    accepts: (item) => {
      const own = opts.refuse?.(item, inv.where(item), to) ?? []
      return own.length ? own : inv.check(moveTo(item, to))
    },
    receive: (item) => {
      const r = inv.move(moveTo(item, to))
      return r.ok ? [] : r.reasons
    },
  })

  const tile = (
    id: string,
    at: Place,
    size?: { width: number; height: number },
    into?: CarryTarget<string>
  ) => {
    const item = inv.doc.items[id]
    const kind = kinds[item.kind]
    const t = carryTile({
      carry,
      thing: id,
      from: enc(at),
      label: kind?.name ?? item.kind,
      icon: kind?.icon,
      info: () => (opts.info ?? defaultInfo)(item, kind),
      decorations: () => opts.decorations?.(item, kind),
      target: into,
      ...size,
    })
    disposers.push(t.dispose)
    return t
  }

  const build = () => {
    const h = inv.doc.holders[holder]
    if (!h) return
    for (const d of disposers) d()
    disposers = []
    const children: BoxChild[] = []
    const lists: { target: CarryTarget<string>; from: string }[] = []
    let shown = 0
    /*
    THE HEADING (title, totals, the container's name) sits OVER the top left
    of a schematic rather than above it: a picture already says what it is,
    and the lines above it pushed it down and shrank it on a small panel.
    Anything that is not a schematic first takes the heading above it as before.
    */
    const head: BoxChild[] = []
    let headed = false
    const flushHead = () => {
      if (!headed) children.push(...head)
      headed = true
    }
    if (opts.title)
      head.push(
        textBlock(opts.title, {
          font: { size: 15, weight: 700 },
          color: '#e8e8e8',
        })
      )
    if (opts.totals !== false) {
      const t = { ...h.purse, ...inv.totals(holder) }
      const line = Object.entries(t)
        .map(([k, v]) => `${k} ${Math.round(v * 10) / 10}`)
        .join(' · ')
      // Always there, empty or not, so the first thing worn does not push
      // everything under it down.
      head.push(
        textBlock(line || '\u00a0', { font: { size: 11 }, color: '#8a96ad' })
      )
    }
    /*
    DROP: out of the inventory, through the game's handleDrop (which can
    refuse, or put the thing on the ground).
    */
    const dropSocket = () => {
      const drop: CarryTarget<string> = {
        id: `${holder}/drop`,
        accepts: (item) => inv.check({ item, to: null }),
        receive: (item) => {
          const it = inv.doc.items[item]
          const from = inv.where(item)
          const why = opts.handleDrop!(it, kinds[it?.kind], from as Place)
          if (why && why.length) return why
          const r = inv.move({ item, to: null })
          return r.ok ? [] : r.reasons
        },
      }
      const socket = carrySocket({
        carry,
        target: drop,
        label: 'drop',
        width: width - 24,
        height: 30,
      })
      disposers.push(socket.dispose)
      return socket
    }
    for (const [cname, c] of Object.entries(h.containers)) {
      if (opts.only && !opts.only.includes(cname)) continue
      if (opts.hide?.includes(cname)) continue
      shown++
      const name = textBlock(cname, {
        font: { size: 12, weight: 600 },
        color: '#aab4c8',
      })
      const art = c.type === 'slots' ? opts.schematics?.[cname] : undefined
      if (!art || headed) {
        flushHead()
        children.push(name)
      }
      if (c.type === 'slots') {
        const drawn = new Set<string>()
        // Which empty slots show an item that takes them up too, faded.
        const echoes = new Map<string, { id: string; at: Place }>()
        for (const [s, slot] of Object.entries(c.slots)) {
          if (!slot.holds || !opts.alsoIn) continue
          const item = inv.doc.items[slot.holds]
          const at: Place = { holder, container: cname, slot: s }
          for (const o of opts.alsoIn(item, kinds[item.kind], at)) {
            if (c.slots[o] && !c.slots[o].holds)
              echoes.set(o, { id: slot.holds, at })
          }
        }
        const holdingOf = (
          s: string,
          at: Place,
          size?: { width: number; height: number }
        ) => {
          const here = c.slots[s].holds
          if (here) return { holding: tile(here, at, size), echo: false }
          const e = echoes.get(s)
          return e
            ? { holding: tile(e.id, e.at, size), echo: true }
            : { holding: null, echo: false }
        }
        if (art) {
          // The art flows; its sockets are placed over it, where it drew them.
          const sch = readSchematic(art)
          const fit = schematicFit(sch, width - 24)
          const k = fit.k
          children.push(artChild(sch, width - 24))
          if (!headed) {
            // Over the art's top left, stacked as they would have flowed.
            const corner = fit.at(sch.content[0], sch.content[1])
            let y = 0
            for (const t of [...head, name]) {
              t.at = { x: corner.x, y }
              // A dock hides these while closed (the picture says enough).
              t.el.setAttribute('data-heading', '')
              y += t.measure(width - 24).height + 2
              children.push(t)
            }
            headed = true
          }
          for (const sk of sch.sockets) {
            const slot = c.slots[sk.slot]
            if (!slot) continue
            drawn.add(sk.slot)
            const at: Place = { holder, container: cname, slot: sk.slot }
            const size = { width: sk.width * k, height: sk.height * k }
            const socket = carrySocket({
              carry,
              target: target(at, `${holder}/${cname}/${sk.slot}`),
              label: sk.slot.replace(/_/g, ' '),
              look: 'art',
              ...size,
              ...holdingOf(sk.slot, at, size),
            })
            socket.at = fit.at(sk.x, sk.y)
            disposers.push(socket.dispose)
            children.push(socket)
          }
        }
        for (const s of Object.keys(c.slots)) {
          if (drawn.has(s)) continue
          const at: Place = { holder, container: cname, slot: s }
          const socket = carrySocket({
            carry,
            target: target(at, `${holder}/${cname}/${s}`),
            label: s,
            width: width - 24,
            ...holdingOf(s, at),
          })
          disposers.push(socket.dispose)
          children.push(socket)
        }
      } else if (c.type === 'list') {
        // The drop target heads the list: a scrolling list would take it
        // out of sight at the bottom.
        // Both stay put while the list scrolls under them (a box keeps only a
        // LEADING run sticky, so a list below a schematic is unaffected).
        name.sticky = true
        if (opts.handleDrop && !lists.length) {
          const drop = dropSocket()
          drop.sticky = true
          children.push(drop)
        }
        const at: Place = { holder, container: cname }
        const into = target(at, `${holder}/${cname}`)
        lists.push({ target: into, from: enc(at) })
        // Full width: a row is a button you can hit anywhere along it.
        const row = { width: width - 24, height: 34 }
        for (const id of c.holds) children.push(tile(id, at, row, into))
        const socket = carrySocket({
          carry,
          target: into,
          label: `put in ${cname}`,
          width: width - 24,
          height: 30,
        })
        disposers.push(socket.dispose)
        children.push(socket)
      } else {
        // A grid wants its picture (a schematic); here it is listed.
        for (const e of c.holds)
          children.push(
            tile(e.item, { holder, container: cname, x: e.x, y: e.y })
          )
      }
    }
    flushHead()
    host.textContent = ''
    const b = box(
      {
        width,
        height: opts.height,
        padding: 12,
        gap: 8,
        background: '#1c2230',
        radius: 10,
      },
      ...children
    )
    host.append(b.el)
    // A fixed height scrolls (and keeps its place across redraws); otherwise
    // grow to fit what it holds (a full bag is taller than an empty one).
    const tall =
      opts.height ??
      Math.max(
        Number(host.getAttribute('height')) || 0,
        Math.ceil(b.contentHeight)
      )
    if (opts.height) b.scrollTo(scroll)
    host.setAttribute('height', String(tall))
    host.setAttribute('viewBox', `0 0 ${width} ${tall}`)
    current = b
    whole = lists.length === 1 && shown === 1 ? lists[0] : null
    glow.setAttribute('width', String(width - 3))
    glow.setAttribute('height', String(tall - 3))
    host.append(glow)
    lightUp()
    panel?.dispose()
    panel = carryPanel(b, carry, { fallback: whole?.target, ghost: false })
  }
  build()
  const stop = inv.subscribe(() => build())

  const at = (e: PointerEvent): [number, number] => {
    const p = svgPoint(host, e.clientX, e.clientY)
    return [p.x, p.y]
  }
  // On a page, one overlay draws the ghost across every panel.
  if (opts.overlay !== false) carryOverlay(carry)
  const down = (e: PointerEvent) => panel?.handlePointer('down', ...at(e))
  // A finger or a headset's laser is captured by the element it pressed (a
  // tile's rect, after the press is handled), so its moves and its release
  // would never reach another panel: let it go as it arrives.
  const captured = (e: PointerEvent) =>
    (e.target as Element).releasePointerCapture(e.pointerId)
  host.addEventListener('gotpointercapture', captured)
  const move = (e: PointerEvent) => panel?.handlePointer('move', ...at(e))
  const up = (e: PointerEvent) => panel?.handlePointer('up', ...at(e))
  const leave = () => panel?.handlePointer('leave', 0, 0)
  const wheel = (e: WheelEvent) => {
    if (!opts.height || !current) return
    e.preventDefault()
    current.scrollBy(e.deltaY)
    scroll = Math.max(
      0,
      Math.min(
        scroll + e.deltaY,
        current.contentHeight - current.viewportHeight
      )
    )
  }
  host.addEventListener('wheel', wheel, { passive: false })
  host.addEventListener('pointerdown', down)
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerup', up)
  host.addEventListener('pointerleave', leave)
  return {
    handlePointer(kind, x, y) {
      panel?.handlePointer(kind, x, y)
    },
    dispose() {
      stop()
      stopGlow()
      panel?.dispose()
      for (const d of disposers) d()
      host.removeEventListener('wheel', wheel)
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('gotpointercapture', captured)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointerleave', leave)
    },
  }
}

export interface InventoryDockOptions
  extends Pick<
    InventoryPanelOptions,
    | 'inv'
    | 'carry'
    | 'holder'
    | 'title'
    | 'decorations'
    | 'moveFor'
    | 'refuse'
    | 'alsoIn'
    | 'info'
    | 'handleDrop'
  > {
  /** The slots container drawn as a schematic, and its art. */
  schematic: { container: string; art: string | SVGSVGElement }
  /** The list shown beside it when open (a bag); none for a craft fitted from a carrier's stock. */
  list?: string | null
  /**
   * The schematic panel's width (default 410) and the list's (200). The list
   * is as tall as the schematic panel unless `height` says otherwise (it
   * scrolls).
   */
  width?: number
  listWidth?: number
  height?: number
  /** Called whenever the dock opens or closes, with its size in its own units. */
  handleResize?: (size: {
    width: number
    height: number
    open: boolean
  }) => void
}

export interface InventoryDock {
  /** The dock's SVG: give it to a plane (its viewBox is its size). */
  svg: SVGSVGElement
  readonly open: boolean
  setOpen: (open: boolean) => void
  /** Pointer input in the dock's viewBox coordinates (what a plane routes). */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  dispose: () => void
}

/**
 * A loadout that lives in the world: closed, it is the schematic and nothing
 * else (a plane shows it small); a tap opens it, and the list appears beside
 * it to drag to and from. A button closes it. Both panels are drawn in ONE
 * SVG, so a drag between them is a drag on one plane, with one ghost.
 */
let dockSeq = 0

export function inventoryDock(opts: InventoryDockOptions): InventoryDock {
  const { carry } = opts
  const W = opts.width ?? 410
  const LW = opts.listWidth ?? 200
  const GAP = 12
  const { svg, g, circle, rect } = svgElements
  const root = svg({
    xmlns: 'http://www.w3.org/2000/svg',
  }) as unknown as SVGSVGElement
  // A panel grows from its host's height, so the schematic's starts at 0
  // (it was the list's 540, which made the whole dock that tall).
  const nested = (x: number, w: number) => {
    const s = svg({ x, y: 0, width: w, height: 0 }) as unknown as SVGSVGElement
    root.append(s)
    return s
  }
  const mainHost = nested(0, W)
  const listHost = opts.list ? nested(W + GAP, LW) : null
  // Closed, the picture's corners are rounded well past the panel's own 10.
  const roundId = `dock-round-${++dockSeq}`
  const roundRect = svgElements.rect({ x: 0, y: 0, rx: 48, ry: 48 })
  root.prepend(
    svgElements.defs({}, svgElements.clipPath({ id: roundId }, roundRect))
  )
  const common = {
    inv: opts.inv,
    carry,
    holder: opts.holder,
    decorations: opts.decorations,
    moveFor: opts.moveFor,
    refuse: opts.refuse,
    alsoIn: opts.alsoIn,
    info: opts.info,
    overlay: false,
  }
  const mainHeight = () => Number(mainHost.getAttribute('height')) || 400
  const main = inventoryPanel({
    ...common,
    host: mainHost,
    title: opts.title,
    schematics: { [opts.schematic.container]: opts.schematic.art },
    only: [opts.schematic.container],
  })
  const list =
    listHost && opts.list
      ? inventoryPanel({
          ...common,
          host: listHost,
          only: [opts.list],
          totals: false,
          // As tall as the schematic beside it; the list scrolls.
          height: opts.height ?? mainHeight(),
          handleDrop: opts.handleDrop,
        })
      : null
  const closeButton = g(
    { cursor: 'pointer' },
    circle({ r: 14, fill: '#2c3546', stroke: '#9fb0c8', 'stroke-width': 1.5 }),
    rect({ x: -7, y: -1.5, width: 14, height: 3, rx: 1.5, fill: '#dfe6f2' })
  ) as unknown as SVGGElement
  const ghosts = carryGhostLayer(carry, root)

  let open = false
  let size = { width: W, height: mainHeight() }
  const layout = () => {
    const h = Math.max(
      mainHeight(),
      open && listHost ? Number(listHost.getAttribute('height')) || 0 : 0
    )
    const w = open && listHost ? W + GAP + LW : W
    if (listHost) listHost.style.display = open ? '' : 'none'
    // Closed it is a small picture: the heading over it is noise at that size,
    // and so are the sockets (the art's own, through its CSS variables,
    // set on the nested host because a texture drops the ROOT's style), and
    // its corners are rounder.
    for (const t of Array.from(mainHost.querySelectorAll('[data-heading]')))
      (t as SVGElement).style.display = open ? '' : 'none'
    // The sockets themselves go too (not what is in them): the body shows.
    for (const v of ['--schematic-socket', '--schematic-socket-edge'])
      mainHost.style.setProperty(v, open ? '' : 'transparent')
    const mh = mainHeight()
    roundRect.setAttribute('width', String(W))
    roundRect.setAttribute('height', String(mh))
    if (open) mainHost.removeAttribute('clip-path')
    else mainHost.setAttribute('clip-path', `url(#${roundId})`)
    closeButton.setAttribute('transform', `translate(${w - 22}, 22)`)
    if (open) root.append(closeButton)
    else closeButton.remove()
    root.setAttribute('viewBox', `0 0 ${w} ${h}`)
    root.setAttribute('width', String(w))
    root.setAttribute('height', String(h))
    const changed = w !== size.width || h !== size.height
    size = { width: w, height: h }
    return changed
  }
  layout()
  const stop = opts.inv.subscribe(() => {
    if (layout()) opts.handleResize?.({ ...size, open })
  })

  const parts = [
    { host: mainHost, panel: main, x: 0 },
    ...(listHost && list ? [{ host: listHost, panel: list, x: W + GAP }] : []),
  ]
  let under: (typeof parts)[number] | null = null
  let tapped = false
  let closing = false
  const onClose = (x: number, y: number) =>
    Math.hypot(x - (size.width - 22), y - 22) <= 18
  const setOpen = (v: boolean) => {
    if (v === open) return
    open = v
    under?.panel.handlePointer('leave', 0, 0)
    under = null
    carry.cancel()
    layout()
    opts.handleResize?.({ ...size, open })
    // A frame panel holding this comes front and centre while it is open;
    // `data-focus` tells one made later (a headset session rebuilds them).
    root.setAttribute('data-focus', String(open))
    root.dispatchEvent(
      new CustomEvent('panelfocus', { detail: { focus: open } })
    )
  }
  const handlePointer = (kind: PointerKind, x: number, y: number) => {
    // Closed, the whole dock is one button.
    if (!open) {
      if (kind === 'down') tapped = true
      else if (kind === 'up' && tapped) {
        tapped = false
        setOpen(true)
      } else if (kind === 'leave') tapped = false
      return
    }
    if (kind === 'down' && onClose(x, y)) {
      closing = true
      return
    }
    if (closing) {
      if (kind === 'up' || kind === 'leave') {
        closing = false
        if (kind === 'up' && onClose(x, y)) setOpen(false)
      }
      return
    }
    ghosts.handlePointer(kind, x, y)
    const now =
      kind === 'leave'
        ? null
        : parts.find((p) => {
            const w = Number(p.host.getAttribute('width'))
            const h = Number(p.host.getAttribute('height'))
            return (
              p.host.style.display !== 'none' &&
              x >= p.x &&
              x < p.x + w &&
              y >= 0 &&
              y < h
            )
          }) ?? null
    if (now !== under) {
      under?.panel.handlePointer('leave', 0, 0)
      under = now
    }
    if (now && kind !== 'leave') now.panel.handlePointer(kind, x - now.x, y)
    // Let go between the panels: nothing takes it, so it goes back.
    if (kind === 'up' && !now && carry.state.thing != null) carry.cancel()
  }
  // A frame panel (b3d's body panels) routes its picks to the SVG's own
  // `handlePointer`, as it does for a panel3d.
  ;(root as unknown as { handlePointer: typeof handlePointer }).handlePointer =
    handlePointer
  return {
    svg: root,
    get open() {
      return open
    },
    setOpen,
    handlePointer,
    dispose() {
      stop()
      ghosts.dispose()
      main.dispose()
      list?.dispose()
    },
  }
}
