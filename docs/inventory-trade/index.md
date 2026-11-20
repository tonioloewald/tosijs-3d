# inventory-trade

**Take and leave, buy and sell.** Two containers side by side (theirs on the
left, yours on the right) with the deal under them. Drag a thing across (or
tap it, then tap the other side) and it moves at once, so each side shows
what it will hold; the [trade](/trade/) remembers where everything started.

- **A chest** (no `price`): **take all** (it closes itself a moment
  later), or move what you want, then **done**. Whatever you left stays in it.
- **A shop** (`price`): your money is under your list, and the line under
  both says which way it goes: `you'll pay 12 gold`, `you'll receive 6 gold`,
  or, when they cannot pay what yours fetch, `you'll receive 200 gold (all
  they can offer)` and `he can't offer more than 200 gold` (their purse is
  never shown otherwise). **Deal** settles: you pay what it comes to (`not
  enough gold` comes back as the reason and nothing changes) or take what
  they can pay; **cancel** puts everything back.

**With a gamepad or the keyboard** (the scene's [panel focus](/pad-ui/)), a
chest opens on take all; up and down step through both lists and the buttons,
left and right go across, and the press moves the focused thing straight to
the other side (it has nowhere else to go), leaving the focus on the next.

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
| `they` | How the other side is named in a sentence (`'he'`, `'the smith'`; default `'they'`) |
| `price` | The inventory's own price rule, `(item, from, to) => number`: makes it a shop |
| `currency` | The purse key a shop pays in (default: the inventory's first currency, else `gold`), written as the inventory's `currencies` say (`€12`, `12 gp`) |
| `width`, `height` | Each list's size (220 × 280) |
| `decorations`, `info`, `moveFor` | As [inventoryPanel](/inventory-box/)'s (`moveFor` sells a box of rounds off a stack, not the whole stack) |
| `handleDone({ dealt })` | Closed: done, a deal, or cancelled (`dealt: false`) |

`begin()` starts a fresh trade (call it each time it opens); `trade` is the
current [trade](/trade/).
