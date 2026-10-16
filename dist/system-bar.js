/*#
# system-bar

**The scene's system bar: one row of buttons, flat and in a headset.** Flat it
sits in the top-left corner of the screen; in a headset, up ahead where the
settings panel used to hang. It opens the scene's settings panel (the owl),
the panels you put on it (a `<tosi-b3d-panel icon="personStanding" title="Inventory">`
with what it shows inside: it opens under the bar), and carries Enter or Exit VR and
full screen. One UI, arranged a little differently on each.

It does not re-implement its buttons. It MIRRORS a list of real HTML buttons:
a button that is hidden (by its `hidden` attribute or by a style, such as
`::part(enterVrButton) { display: none }`) is not drawn, one that is disabled
is drawn dimmed and ignores a press, its icon and title come along, and a press
calls that button's own `click()` (held for `HOLD_MS`, it gets a `systemhold`
event instead: the scene puts that button's panel back where it started). So entering VR and going full screen keep
their one definition, and both still run inside the press the browser requires
for them. `<tosi-b3d flat-ui="dom">` keeps the HTML ones flat.

```javascript
import { systemBar } from 'tosijs-3d/system-bar'

const bar = systemBar([gearButton, vrButton, fullscreenButton])
// bar.svg: give it to a frame panel (its handlePointer is on it)
// bar.dispose(): stop watching the buttons
```
*/
/*{ "parent": "b3d-panel", "order": 30 }*/
import { svgElements } from 'tosijs';
import { panelRim, RIM_WIDTH } from './panel-rim.js';
/** Is `b` set to `display: none` by a style (its own, or the page's)? */
function styledAway(b) {
    if (!b.isConnected)
        return b.style.display === 'none';
    return getComputedStyle(b).display === 'none';
}
/*
A button, the space between two, and the space between the outline and the
buttons: the same space, so the row reads as one even strip. Tonio: "halve
the space between the icon buttons … but add the same between the border
and the buttons". PAD starts inside the outline, which is drawn inset.
*/
export const BAR_BUTTON = 40;
export const BAR_GAP = 3;
export const BAR_PAD = RIM_WIDTH + BAR_GAP;
/** The bar's height in its own units (a CSS pixel each, flat). */
export const BAR_HEIGHT = BAR_PAD * 2 + BAR_BUTTON;
const SIZE = BAR_BUTTON;
const GAP = BAR_GAP;
const PAD = BAR_PAD;
/** How long a press is held before it is a `systemhold` instead of a click (ms). */
export const HOLD_MS = 600;
/** Mirror `buttons` as an SVG toolbar: what shows, what is enabled, and a press is their click. */
export function systemBar(buttons) {
    const { svg, g, rect, title } = svgElements;
    const root = svg({
        xmlns: 'http://www.w3.org/2000/svg',
    });
    let shown = [];
    let pressed = -1;
    let hover = -1;
    const indexAt = (x, y) => {
        if (y < PAD || y > PAD + SIZE)
            return -1;
        const i = Math.floor((x - PAD) / (SIZE + GAP));
        const within = x - PAD - i * (SIZE + GAP);
        return i >= 0 && i < shown.length && within <= SIZE ? i : -1;
    };
    const build = () => {
        // Hidden by the attribute, or by the page's own styling (a
        // `::part(enterVrButton) { display: none }` should hide it here too).
        shown = buttons.filter((b) => !b.hidden && !styledAway(b));
        const w = shown.length
            ? PAD * 2 + shown.length * SIZE + (shown.length - 1) * GAP
            : 1;
        const h = PAD * 2 + SIZE;
        root.setAttribute('viewBox', `0 0 ${w} ${h}`);
        root.setAttribute('width', String(w));
        root.setAttribute('height', String(h));
        root.textContent = '';
        // The lozenge behind them, and the outline every panel wears (heavier
        // than the HTML lozenge's hairline: it is drawn into a texture and seen
        // smaller than its pixels).
        root.append(rect({
            x: 0,
            y: 0,
            width: w,
            height: h,
            rx: h / 2,
            fill: 'rgba(20,24,32,0.72)',
        }), panelRim(w, h, h / 2));
        shown.forEach((b, i) => {
            const x = PAD + i * (SIZE + GAP);
            const lit = !b.disabled && (i === pressed || i === hover);
            const icon = b.querySelector('svg')?.cloneNode(true);
            if (icon) {
                icon.setAttribute('x', String(x + 8));
                icon.setAttribute('y', String(PAD + 8));
                icon.setAttribute('width', String(SIZE - 16));
                icon.setAttribute('height', String(SIZE - 16));
                // The page's stylesheet does not reach a texture: say the colour here.
                icon.setAttribute('color', '#e8eef8');
                icon.style.removeProperty('height');
            }
            // Icons first, but never nameless: the button's name rides along as
            // the SVG's own <title> (a texture does not draw it; everything else
            // reads it). See UI-DESIGN-NOTES → "Icons first".
            const name = b.title || b.getAttribute('aria-label') || '';
            root.append(g({ opacity: b.disabled ? '0.35' : '1' }, ...(name ? [title(name)] : []), rect({
                x,
                y: PAD,
                width: SIZE,
                height: SIZE,
                rx: SIZE / 2,
                fill: lit ? 'rgba(74,158,255,0.55)' : 'rgba(255,255,255,0.06)',
            }), ...(icon ? [icon] : [])));
        });
    };
    /*
    PRESS AND HOLD is a second verb: the button gets a `systemhold` event
    instead of its click (the scene puts that button's panel back where it
    started). Fired while still held, so it answers without waiting for the
    release; the release is then nothing.
    */
    let holdTimer = null;
    const stopHold = () => {
        if (holdTimer != null)
            clearTimeout(holdTimer);
        holdTimer = null;
    };
    const handlePointer = (kind, x, y) => {
        const i = kind === 'leave' ? -1 : indexAt(x, y);
        if (kind !== 'down' && i !== pressed)
            stopHold();
        if (kind === 'down') {
            pressed = i;
            stopHold();
            if (i >= 0 && !shown[i].disabled) {
                const b = shown[i];
                holdTimer = setTimeout(() => {
                    holdTimer = null;
                    if (shown[pressed] !== b)
                        return;
                    pressed = -1;
                    b.dispatchEvent(new CustomEvent('systemhold'));
                    build();
                }, HOLD_MS);
            }
        }
        else if (kind === 'up') {
            stopHold();
            // A press is down and up on the same button, as a click is.
            if (i >= 0 && i === pressed && !shown[i].disabled)
                shown[i].click();
            pressed = -1;
        }
        else if (kind === 'leave')
            pressed = -1;
        if (i !== hover || kind !== 'move') {
            hover = i;
            build();
        }
    };
    root.handlePointer =
        handlePointer;
    // What shows, what is enabled and the icon all live on the HTML buttons.
    const watch = new MutationObserver(build);
    for (const b of buttons)
        watch.observe(b, {
            attributes: true,
            attributeFilter: [
                'hidden',
                'disabled',
                'title',
                'aria-label',
                'style',
                'class',
                'part',
            ],
            childList: true,
        });
    build();
    return {
        svg: root,
        get count() {
            return shown.length;
        },
        dispose() {
            stopHold();
            watch.disconnect();
        },
    };
}
//# sourceMappingURL=system-bar.js.map