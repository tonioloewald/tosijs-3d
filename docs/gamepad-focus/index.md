# gamepad-focus

Drives an SVG UI's **focus traversal** from a [[virtual-gamepad|VirtualGamepad]] — the
missing wire between "the D-pad registers" and "the D-pad moves the highlight".

Everything either side of it already existed: `box`/`surface` expose
`focusMove` / `focusActivate` / `focusBack`, and `HardwareGamepadSource` /
`XrGamepadSource` produce a `VirtualGamepad` each frame. Nothing polled one and called
the other, so a gamepad could light up the on-screen pad and still not touch the UI.

```javascript
import { HardwareGamepadSource, ui } from 'tosijs-3d'
const { gamepadFocus } = ui

const pad = new HardwareGamepadSource()
const stop = gamepadFocus({ poll: () => pad.poll(), target: panel, claim: panelRootEl })
// …later
stop()
```

## One pad, several UIs — `claim`

With more than one gamepad-driven UI live on a page (two doc demos, say), a single
D-pad press would drive them all. Pass `claim` (the UI's root element) and the pad
follows the pointer: **the surface you last pressed in owns the pad** until another
claims it. Until anything is claimed every instance responds, so a lone UI needs no
wiring — the same last-touched rule `B3d` uses for scene input focus.

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
