/*#
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
*/
/*{ "parent": "inventory", "order": 13 }*/
import { svgElements } from 'tosijs';
import { carryGhostLayer } from './carry-box.js';
import { inventoryPanel, } from './inventory-box.js';
import { panelRim } from './panel-rim.js';
import { beginTrade } from './trade.js';
import { currencyFor, formatMoney } from './currency.js';
const same = (a, b) => a != null && a.holder === b.holder && a.container === b.container;
export function tradePanel(opts) {
    const { inv, carry, mine, theirs, price } = opts;
    const W = opts.width ?? 220;
    const H = opts.height ?? 280;
    const GAP = 8;
    const FOOT = 74;
    const shop = price != null;
    const they = opts.they ?? 'they';
    const currency = opts.currency ?? inv.currencies[0]?.id ?? 'gold';
    // Written as the game writes it (`€12`, `12 gold`): the inventory's currencies.
    const money = (n) => formatMoney(n, currencyFor(inv.currencies, currency));
    const TW = W * 2 + GAP;
    const TH = H + FOOT;
    const { svg, g, rect, text } = svgElements;
    const root = svg({
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${TW} ${TH}`,
        width: TW,
        height: TH,
    });
    root.append(rect({
        x: 0,
        y: 0,
        width: TW,
        height: TH,
        rx: 10,
        fill: '#161b26',
    }));
    // A shop keeps a row under the lists for your money.
    const LH = shop ? H - 24 : H;
    const nested = (x) => {
        const s = svg({ x, y: 0, width: W, height: LH });
        root.append(s);
        return s;
    };
    const theirHost = nested(0);
    const myHost = nested(W + GAP);
    // Only across: this panel is a trade, not a place to rearrange.
    const refuse = (_id, from) => same(from, mine) || same(from, theirs) ? [] : ['not part of this trade'];
    const common = {
        inv,
        carry,
        decorations: opts.decorations,
        info: opts.info,
        moveFor: opts.moveFor,
        refuse,
        overlay: false,
        fit: false,
        height: LH,
        // Their purse is theirs to keep quiet about; yours is under your list.
        totals: false,
        putLabel: 'put here',
    };
    const theirPanel = inventoryPanel({
        ...common,
        host: theirHost,
        holder: theirs.holder,
        only: [theirs.container],
        title: opts.titles?.theirs ?? theirs.holder,
        headings: false,
    });
    const myPanel = inventoryPanel({
        ...common,
        host: myHost,
        holder: mine.holder,
        only: [mine.container],
        title: opts.titles?.mine ?? 'you',
        headings: false,
    });
    // The deal: a line saying where things stand, a line of reasons, buttons.
    const line = text({
        x: 14,
        y: H + 24,
        fill: '#e8e8e8',
        'font-size': 15,
        'font-weight': 600,
        'font-family': 'system-ui, sans-serif',
    });
    const note = text({
        x: 14,
        y: H + 46,
        fill: '#9fb0c8',
        'font-size': 12,
        'font-family': 'system-ui, sans-serif',
    });
    const myPurse = text({
        x: W + GAP + W - 12,
        y: H - 8,
        'text-anchor': 'end',
        fill: '#ffd966',
        'font-size': 14,
        'font-family': 'system-ui, sans-serif',
    });
    root.append(line, note, myPurse);
    const BH = 32;
    const BY = H + FOOT - BH - 10;
    const button = (label, w, act) => {
        const el = g({ cursor: 'pointer' }, rect({
            width: w,
            height: BH,
            rx: 8,
            fill: '#2c3546',
            stroke: '#9fb0c8',
            'stroke-width': 1,
        }), text({
            x: w / 2,
            y: BH / 2 + 5,
            'text-anchor': 'middle',
            fill: '#dfe6f2',
            'font-size': 14,
            'font-family': 'system-ui, sans-serif',
        }, label));
        root.append(el);
        return { label, x: 0, w, act, el };
    };
    let trade = null;
    let said = '';
    /** How long after take all the panel stays, so you see what you took. */
    const TAKE_ALL_CLOSE_MS = 700;
    let finished = false;
    const done = (dealt) => {
        if (finished)
            return;
        finished = true;
        carry.cancel();
        opts.handleDone?.({ dealt });
    };
    const buttons = shop
        ? [
            button('cancel', 90, () => {
                trade?.revert();
                done(false);
            }),
            button('deal', 90, () => {
                const r = trade?.deal(currency, { upTo: true });
                if (r && !r.ok) {
                    said = r.reasons[0] ?? 'refused';
                    draw();
                    return;
                }
                done(true);
            }),
        ]
        : [
            button('take all', 100, () => {
                const ids = inContainer(inv, theirs);
                const r = inv.move(...ids.map((item) => ({ item, to: mine })));
                if (!r.ok) {
                    said = r.reasons[0] ?? 'refused';
                    draw();
                    return;
                }
                // Taken: you see it land in your list, then it closes by itself.
                setTimeout(() => done(true), TAKE_ALL_CLOSE_MS);
            }),
            button('done', 90, () => done(true)),
        ];
    // Right-aligned, in order.
    let bx = TW - 12;
    for (const b of [...buttons].reverse()) {
        bx -= b.w;
        b.x = bx;
        b.el.setAttribute('transform', `translate(${bx}, ${BY})`);
        bx -= 8;
    }
    root.append(panelRim(TW, TH, 10));
    const purse = (p) => inv.doc.holders[p.holder]?.purse?.[currency] ?? 0;
    function draw() {
        if (shop) {
            const { pay, short } = trade?.offer(currency) ?? { pay: 0, short: false };
            line.textContent =
                pay > 0
                    ? `you'll pay ${money(pay)}`
                    : pay < 0
                        ? `you'll receive ${money(-pay)}${short ? ` (all ${they} can offer)` : ''}`
                        : short
                            ? `${they} can't pay anything`
                            : 'even';
            note.textContent =
                said ||
                    (short ? `${they} can't offer more than ${money(purse(theirs))}` : '');
            myPurse.textContent = `you have ${money(purse(mine))}`;
        }
        else {
            const n = inContainer(inv, theirs).length;
            const taken = trade?.changed().filter((c) => same(c.to, mine)).length ?? 0;
            line.textContent =
                n === 0 ? 'empty' : `${n} thing${n === 1 ? '' : 's'} left in it`;
            note.textContent =
                said || (taken ? `taking ${taken}` : 'drag across, or take all');
        }
    }
    const stop = inv.subscribe(() => {
        said = '';
        draw();
    });
    draw();
    const ghosts = carryGhostLayer(carry, root);
    const parts = [
        { host: theirHost, panel: theirPanel, x: 0 },
        { host: myHost, panel: myPanel, x: W + GAP },
    ];
    let under = null;
    let pressed = null;
    const buttonAt = (x, y) => buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= BY && y <= BY + BH) ?? null;
    const handlePointer = (kind, x, y) => {
        if (kind === 'down' && buttonAt(x, y)) {
            pressed = buttonAt(x, y);
            return;
        }
        if (pressed) {
            if (kind === 'up' && buttonAt(x, y) === pressed)
                pressed.act();
            if (kind === 'up' || kind === 'leave')
                pressed = null;
            return;
        }
        ghosts.handlePointer(kind, x, y);
        const now = kind === 'leave'
            ? null
            : parts.find((p) => x >= p.x && x < p.x + W && y >= 0 && y < LH) ?? null;
        if (now !== under) {
            under?.panel.handlePointer('leave', 0, 0);
            under = now;
        }
        if (now && kind !== 'leave')
            now.panel.handlePointer(kind, x - now.x, y);
        if (kind === 'up' && !now && carry.state.thing != null)
            carry.cancel();
    };
    root.handlePointer =
        handlePointer;
    // A thing in a trade has one place to go, so a press moves it there.
    const across = (item, to) => {
        carry.cancel();
        const r = inv.move(opts.moveFor?.(item, inv.where(item), to) ?? { item, to });
        if (!r.ok) {
            said = r.reasons[0] ?? 'refused';
            draw();
        }
    };
    const controls = () => {
        const side = (p, x, to) => p
            .controls()
            .filter((n) => n.item != null)
            .map((n) => ({
            ...n,
            box: n.box && { ...n.box, x: n.box.x + x },
            activate: () => across(n.item, to),
        }));
        return [
            ...side(theirPanel, 0, mine),
            ...side(myPanel, W + GAP, theirs),
            ...buttons.map((b) => ({
                role: 'button',
                name: b.label,
                path: `button:${b.label}`,
                interactive: true,
                isDefault: b.label === 'take all',
                box: { x: b.x, y: BY, w: b.w, h: BH },
                activate: b.act,
            })),
        ];
    };
    root.controls = controls;
    return {
        svg: root,
        begin() {
            carry.cancel();
            said = '';
            trade = beginTrade(inv, { mine, theirs }, price);
            draw();
        },
        get trade() {
            return trade;
        },
        handlePointer,
        controls,
        dispose() {
            stop();
            ghosts.dispose();
            theirPanel.dispose();
            myPanel.dispose();
        },
    };
}
function inContainer(inv, p) {
    const c = inv.doc.holders[p.holder]?.containers[p.container];
    if (c == null)
        return [];
    if (c.type === 'list')
        return [...c.holds];
    if (c.type === 'grid')
        return c.holds.map((h) => h.item);
    return Object.values(c.slots)
        .map((s) => s.holds)
        .filter((id) => id != null);
}
//# sourceMappingURL=inventory-trade.js.map