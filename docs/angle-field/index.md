# angle-field

**`angle3d` dials a direction; `arc3d` dials a direction AND a width.** Both are
rings, because the quantity is a circle and a slider track is not. The pure
model under them is described at the end ("The model").

## Demo

```js
import { panel3d, label3d, angle3d, arc3d, select3d, arcOf } from 'tosijs-3d'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' })

// Where the gun sits decides what it can reach — one constraint, seen twice.
const MOUNTS = {
  bow: arcOf(0, 270),
  port: arcOf(100, 160),
  stern: arcOf(180, 270),
}

let bearing = 20
let firing = arcOf(120, 70)
let mount = 'port'

const show = () => {
  readout.textContent =
    `bearing ${Math.round(bearing)}°` +
    `   ·   arc ${Math.round(firing.centre)}° ± ${Math.round(firing.width / 2)}°`
}

const dial = angle3d({
  label: 'bearing',
  value: bearing,
  size: 150,
  handleChange: (v) => { bearing = v; show() },
})

const fan = arc3d({
  label: 'firing arc',
  value: firing,
  size: 150,
  envelope: MOUNTS[mount],
  minWidth: 10,
  maxWidth: 180,
  handleChange: (v) => { firing = v; show() },
})

show()
preview.append(
  div({ class: 'dials' },
    panel3d({ width: 210 },
      select3d({
        label: 'mount',
        value: mount,
        options: Object.keys(MOUNTS),
        handleChange: (v) => { mount = String(v); fan.setEnvelope(MOUNTS[mount]) },
      }),
      dial
    ),
    panel3d({ width: 210 }, fan)
  ),
  readout
)
```
```css
.preview { padding: 12px; }
.dials { display: flex; gap: 12px; flex-wrap: wrap; }
.readout {
  padding: 10px 2px;
  font-family: ui-monospace, monospace;
  color: #9aa4b2;
}
```

The turret case: a gun's placement on a ship restricts where it can bear. Drag the arc's **edges** to change its width
and its **middle** to swing it — the grey sector is blocked by the ship, and the
control shows it rather than silently snapping.

## Why not a slider

An angle on a linear track has the defect log scales were added to fix, pointing
a different way: **the track has ends and the quantity does not.** 359° and 1°
are two degrees apart and sit at opposite ends of the slider, so the one gesture
you always want — nudge past north — is the one that cannot be made.

## An arc is one thing, so it is one control

Offered as `start` and `end` sliders the pair can be dragged into
meaninglessness, and the edit you actually make — *"same width, point it
there"* — needs both moved together. Here that is one gesture: grab the middle.

| grab | drag |
| --- | --- |
| an edge | change the width, the other edge staying put |
| the middle | swing the whole arc, the width staying put |

**The edges beat the middle on a narrow arc**, where all three grips are within
a few degrees. A width you cannot change is stuck; a rotation you have to reach
for can still be done by dragging one edge and then the other.

## Restrictions show, they do not merely clamp

Where a turret sits on a ship restricts its firing arc: a gun amidships on the
port rail bears from roughly 10° to 190°, and no placement lets it fire through
its own superstructure. The envelope and the placement are the same constraint
seen twice, so a control that silently snaps to a legal arc teaches nothing
about why. `arc3d` draws the blocked sector.
Nothing stops you clamping quietly; this just makes the ship visible.

## Options

| option | | |
| --- | --- | --- |
| `value` | `0` / `arcOf(0, 90)` | degrees, or an `Arc` |
| `label` | — | drawn above the dial |
| `limits` | full circle | `angle3d` only — the permitted sector; the handle CATCHES at a stop |
| `envelope` | full circle | `arc3d` only — the arc may only lie within this |
| `minWidth` `maxWidth` | `0` `360` | `arc3d` only |
| `size` | `0` | ring diameter; `0` fits the row to the panel width |
| `handleChange` | | live, every frame the pointer moves |
| `handleCommit` | | once per gesture — your undo step |

## The model

The arc maths is pure (no DOM, no Babylon) and exported, so the fiddliest part
is the part a test can pin. An arc is a **centre and a width**
(`arcOf(centre, width)`), which makes the two hard questions one line each:

```javascript
arcContains(arc, angle)          // |wrap(angle − centre)| ≤ width / 2
arcWithinArc(inner, outer)       // ...and the widths differ by enough
```

Written as intervals those need four cases and a wrap check. Neither form
mentions where the arc starts, so wrapping past north is not a special case.

Angles are degrees, and there are two wraps that are not interchangeable:

- `wrapDegrees` → `(-180, 180]`, for a DELTA or a difference. Signed, because
  turning back five degrees is −5 and calling it 355 sends you the long way.
- `normaliseDegrees` → `[0, 360)`, for a STORED angle, which has no direction to
  preserve and reads better without minus signs.

**A limit catches, it does not jump.** Snapping to whichever end is nearer in
wrapped distance would teleport the value to the other side of the dial when
you drag a hair past one limit. So `clampAngleToArc` picks the nearer END, and
the widget stops the gesture rather than restarting it elsewhere.
