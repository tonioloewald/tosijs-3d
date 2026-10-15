# carry-box

**Drag and drop on a panel**: [carry](/carry/)'s model with a view. Tiles you
can pick up, sockets that take them, a ghost that follows the pointer, and
the two-tap path, as children of a [box](/box/), so they work wherever a box
does: on a page, on a panel in a flat scene, on a panel in a headset.

## Demo

A bag and a pair of hands. Drag a thing to a hand, or tap it and then tap
the hand. While something is held, the hands that would take it light up
and the others dim; point at a dim one to see why. The rifle needs both
hands free; the shield is cracked (its outline) and the lamp is running low
(its bar).

```js
import { ui, createCarry, carryTile, carrySocket, carryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const carry = createCarry()
const bag = new Set(['sword', 'shield', 'rifle', 'lamp'])
const hands = { left: null, right: null }
const LOOK = {
  sword: {},
  shield: { outline: 'damaged' },
  rifle: { badge: '2H' },
  lamp: { bar: 0.25, barColor: '#e0b040' },
}

const handTarget = (side) => ({
  id: side,
  accepts: (thing) => {
    if (hands[side]) return ['this hand is full']
    if (thing === 'rifle' && (hands.left || hands.right)) return ['two-handed: both hands must be free']
    return []
  },
  receive: (thing, from) => {
    bag.delete(thing)
    if (from === 'left' || from === 'right') hands[from] = null
    hands[side] = thing
    build()
  },
})
const bagTarget = {
  id: 'bag',
  accepts: (thing, from) => (from === 'bag' ? ['already in the bag'] : []),
  receive: (thing, from) => {
    hands[from] = null
    bag.add(thing)
    build()
  },
}

// TWO panels, one carry: the bag and the hands are separate surfaces, and a
// drag goes from one to the other.
const bagHost = svg({ viewBox: '0 0 300 190', width: 300, height: 190, style: 'touch-action:none' })
const handHost = svg({ viewBox: '0 0 220 250', width: 220, height: 250, style: 'touch-action:none' })
preview.append(bagHost, handHost)
const tileOf = (t, from) => carryTile({ carry, thing: t, from, label: t, decorations: () => LOOK[t] })
const panels = new Map()
function mount(host, children) {
  host.textContent = ''
  const b = ui.box({ width: Number(host.getAttribute('width')), padding: 12, gap: 10, background: '#1c2230', radius: 10 }, ...children)
  host.append(b.el)
  panels.set(host, carryPanel(b, carry))
}
function build() {
  mount(bagHost, [
    ui.textBlock('Bag', { font: { size: 14, weight: 600 }, color: '#ddd' }),
    ...[...bag].map((t) => tileOf(t, 'bag')),
    carrySocket({ carry, target: bagTarget, label: 'put back in the bag', width: 270, height: 30 }),
  ])
  mount(handHost, [
    ui.textBlock('Hands', { font: { size: 14, weight: 600 }, color: '#ddd' }),
    ...['left', 'right'].map((side) =>
      carrySocket({ carry, target: handTarget(side), label: side + ' hand', width: 190, holding: hands[side] ? tileOf(hands[side], side) : null })
    ),
  ])
}
build()
for (const host of [bagHost, handHost]) {
  const at = (e) => { const p = ui.svgPoint(host, e.clientX, e.clientY); return [p.x, p.y] }
  host.addEventListener('pointerdown', (e) => panels.get(host).handlePointer('down', ...at(e)))
  host.addEventListener('pointermove', (e) => panels.get(host).handlePointer('move', ...at(e)))
  host.addEventListener('pointerup', (e) => panels.get(host).handlePointer('up', ...at(e)))
  host.addEventListener('pointerleave', () => panels.get(host).handlePointer('leave', 0, 0))
}
// Let go of a DRAG anywhere else: it goes back where it was. (A panel's own
// release has already dropped it by the time this runs, so this only catches
// misses.) Only a drag: a two-tap pick-up happens ON a release, and cancelling
// every release would put it straight back. (A page using `carryOverlay`
// gets this built in.)
window.addEventListener('pointerup', () => {
  if (carry.state.mode === 'drag') carry.cancel()
})
```

## How it fits together

- **`carryTile`** is a thing you can pick up: a label and its DECORATIONS,
  which the consumer supplies per thing: a small status `bar` (durability,
  charge, ammo; 0…1), an `outline` (`'damaged'`, `'broken'`, or any
  colour), a `badge` (a count, a mark). While it is being carried it fades
  where it was.
- **`carrySocket`** is a place it can go: it lights when what is held would
  fit, dims when it would not, and shows the reason when the pointer is on
  it. `holding` draws what is in it now.
- **`carryPanel(box, carry)`** goes between the host's pointer events and the
  box: a press on a tile that moves `DRAG_THRESHOLD` becomes a drag, a
  ghost follows the pointer, and letting go drops it on the socket under the
  pointer. A drop that is refused, lands on nothing or is cancelled
  outside every panel springs back: the ghost returns to where it was picked
  up, carrying the reason it was refused. A tap on a tile and then a tap on a
  socket does the same without carrying it.

Several panels share one `carry`, which is how a drag goes from one to
another (the demo's bag and hands are two): each reports what its own
sockets see, and whichever panel the pointer is let go over drops it. Let go
outside every panel and the host cancels (the demo listens on `window`).
