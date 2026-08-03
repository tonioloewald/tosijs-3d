/*#
# gamepad-focus

Drives an SVG UI's **focus traversal** from a [[virtual-gamepad|VirtualGamepad]] — the
missing wire between "the D-pad registers" and "the D-pad moves the highlight".

Everything either side of it already existed: `box`/`surface` expose
`focusMove` / `focusActivate` / `focusBack`, and `HardwareGamepadSource` /
`XrGamepadSource` produce a `VirtualGamepad` each frame. Nothing polled one and called
the other, so a gamepad could light up the on-screen pad and still not touch the UI.

```js
import { gamepadFocus, HardwareGamepadSource } from 'tosijs-3d'

const pad = new HardwareGamepadSource()
const stop = gamepadFocus({ poll: () => pad.poll(), target: panel })
// …later
stop()
```

## Which controls, and why those

The **D-pad** and the **menu** button, deliberately: per the control conventions those
are the inputs a VR controller set doesn't otherwise spend, so a UI can claim them
without fighting locomotion or the gameplay bindings. The left stick is **not** used —
it's how you walk.

| control | does |
| --- | --- |
| D-pad ↑↓←→ | `focusMove(dx, dy)` |
| `menu` / `buttonA` | `focusActivate()` |
| `buttonB` | `focusBack()` |

## Edge-triggered, with a repeat

A gamepad reports *held*, not *pressed*, so polling raw state would fire every frame and
send focus rocketing across the panel. Presses are edge-detected, then repeat on a
**delay-then-interval** ramp (the typematic behaviour every keyboard has) so holding a
direction walks steadily instead of either sprinting or stopping dead.

The timing is passed in as `now` rather than read from a clock, so the ramp is
deterministic and testable — same discipline as the rest of the pure models here.
*/
/*{ "parent": "input" }*/
const DIRS = [
    { key: 'dpadLeft', dx: -1, dy: 0 },
    { key: 'dpadRight', dx: 1, dy: 0 },
    { key: 'dpadUp', dx: 0, dy: -1 },
    { key: 'dpadDown', dx: 0, dy: 1 },
];
/**
 * The pure half: given the pad's current state and the previous frame's, decide what
 * should happen. Holds `held` timing so a direction repeats on a ramp.
 *
 * Exported so the ramp can be tested without a gamepad, a clock, or a DOM.
 */
export function createFocusPulse(opts = {}) {
    const DELAY = opts.repeatDelayMs ?? 400;
    const RATE = opts.repeatRateMs ?? 90;
    // Per-direction: when it went down, and when it last fired.
    const held = new Map();
    let prevActivate = false;
    let prevBack = false;
    return (pad, now) => {
        const moves = [];
        for (const d of DIRS) {
            const down = Boolean(pad[d.key]);
            const h = held.get(d.key);
            if (!down) {
                held.delete(d.key);
                continue;
            }
            if (!h) {
                // Edge: fire immediately, then wait out the delay before repeating.
                held.set(d.key, { since: now, last: now });
                moves.push({ dx: d.dx, dy: d.dy });
            }
            else if (now - h.since >= DELAY && now - h.last >= RATE) {
                h.last = now;
                moves.push({ dx: d.dx, dy: d.dy });
            }
        }
        // `menu` is the primary confirm (it's the button a VR set leaves spare); `a` is
        // accepted too because on a hardware pad that's where a thumb expects it.
        const act = Boolean(pad.menu || pad.buttonA);
        const bk = Boolean(pad.buttonB);
        const pulse = {
            moves,
            activate: act && !prevActivate, // confirm does NOT repeat — one press, one action
            back: bk && !prevBack,
        };
        prevActivate = act;
        prevBack = bk;
        return pulse;
    };
}
/**
 * Poll a gamepad each animation frame and drive `target`'s focus. Returns a stop
 * function; call it when the UI closes or the driver should hand over.
 */
export function gamepadFocus(opts) {
    const pulse = createFocusPulse(opts);
    const raf = opts.raf ?? ((cb) => requestAnimationFrame(() => cb()));
    const cancel = opts.cancel ?? ((id) => cancelAnimationFrame(id));
    let id = 0;
    let stopped = false;
    const tick = () => {
        if (stopped)
            return;
        const p = pulse(opts.poll(), performance.now());
        for (const m of p.moves)
            opts.target.focusMove(m.dx, m.dy);
        if (p.activate)
            opts.target.focusActivate();
        if (p.back)
            opts.target.focusBack?.();
        id = raf(tick);
    };
    id = raf(tick);
    return () => {
        stopped = true;
        cancel(id);
    };
}
//# sourceMappingURL=gamepad-focus.js.map