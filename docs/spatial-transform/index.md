# spatial-transform

Pure, dependency-free transform math for the **spatial attachment mechanics**
(see `SPATIAL-DESIGN.md`) — vector/quaternion ops plus the compose ↔ relative pair
that underpins *place-relative* and *transition* (re-parent preserving world pose).

Plain `{x,y,z}` / `{x,y,z,w}` objects, no Babylon, so it unit-tests headless like
[fly-by-wire](?fly-by-wire.ts) and [terrain-grid](?terrain-grid.ts). The Babylon
bridge (reading node world matrices, `setParent`, floating-origin world-root
flipping, the declarative elements) lives elsewhere and delegates the math here.

## Example — attach and re-attach

Capture a child's pose *relative* to a parent once, then recompose its world pose wherever the
parent goes — the math behind *place-relative* and *transition* (re-parent, keep the world pose):

```javascript
import { composePose, relativePose, quatFromAxisAngle } from 'tosijs-3d'

const table = { position: { x: 2, y: 0, z: 1 }, rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.5) }
const lamp = { position: { x: 2.3, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }

const bolt = relativePose(table, lamp) // the lamp IN the table's frame — captured once
const moved = { position: { x: 8, y: 0, z: -4 }, rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 2.1) }
const lampNow = composePose(moved, bolt) // the lamp's new world pose after the table moved
```
