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

The same loadout in a scene, flat and in a headset, on the scene's SYSTEM
BAR: its button (a standing figure) opens it under the bar, with the bag beside it to
drag to and from; the button again, or the × in its title bar, puts it away.
`inventoryDock` draws both into one SVG, so a drag between them is one panel;
give it no `list` for a craft fitted from a carrier's stock, and it opens to
the schematic alone. A `<tosi-b3d-panel icon title>` takes the dock's
`svg`; the bar asks the dock to open (`panelopen`), and the title bar's ×
puts it away.

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

// On the system bar: a button (a standing figure) that opens it under the bar.
const loadout = b3dPanel({ title: 'Inventory', icon: 'personStanding' })

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '520px')
preview.append(
  b3d(
    {},
    b3dLight({ intensity: 1 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    loadout,
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
  loadout.svg = dock.svg
})
```
```css
.preview { height: 100%; position: relative; }
tosi-b3d { width: 100%; height: 100%; }
```

## Art and pictures

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
