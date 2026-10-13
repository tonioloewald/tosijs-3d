# b3d-radar-blip

Tags something as **detectable on radar** — a target, a landmark, a waypoint. It has
no geometry of its own; it just contributes a blip that a radar platform (the aircraft
HUD) plots. Two ways to place one:

- **Nested in a target** (`<tosi-b3d-destroyable>`, a vehicle, any element with a
  `mesh`) — the blip **follows that mesh**, so a moving target moves on radar for free.
- **Directly in the scene** — a **static** blip at its own `x`/`y`/`z` (waypoints,
  fixed landmarks). It rides the floating origin.

> **The live demo lives on [[b3d-radar]]** — a blip only means something to a
> sensor, so one scene shows both: a sweeping mast, three blips of different
> `faction` and `profile`, and a readout of what is detected and what is locked.
> Duplicating it here would be two scenes to keep in step and one idea.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `profile` | `1` | Detectability: `1` = seen at the platform's nominal radar range, `2` = out to 2×, `0.05` = very stealthy; **negative = always detectable** (e.g. waypoints). |
| `faction` | `'neutral'` | `friendly` / `neutral` / `hostile` / `waypoint` — drives the radar-trace colour. |
| `x`,`y`,`z` | `0` | World position when standalone (ignored while following a target's mesh). |

```javascript
import { b3d, b3dRadarBlip, b3dDestroyable } from 'tosijs-3d'

// A hostile target that shows on radar (blip follows the cube):
b3dDestroyable({ x: 0, y: 1, z: 40, capacity: 6 },
  b3dRadarBlip({ faction: 'hostile', profile: 1 }))

// A waypoint: no mesh, always detectable, shown as a waypoint trace:
b3dRadarBlip({ faction: 'waypoint', profile: -1, x: 0, y: 0, z: 200 })
```
#
