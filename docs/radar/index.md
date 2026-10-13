# Radar model

The **pure, deterministic radar model** — range + detection cone + lock acquisition,
Babylon-free (plain `{x, y, z}`, time only via `dt`, no `Date.now`/`Math.random`), so
it unit-tests headless like `fly-by-wire` / `world-store`. `b3d-radar.ts` bridges it to
the scene (enumerates `RadarBlip`s, supplies the platform pose, plots the HUD).

A `Radar` detects contacts within **range · profile** AND inside its **cone** (dot of
the platform's forward with the bearing to the contact ≥ `coneDot`; ±90° → `coneDot 0`).
Detected, **lockable** contacts build a lock over `lockTime` seconds; up to `maxLocks`
of the **nearest** ones hold locks at once. Losing detection decays the lock back down.

## Example

The pure, deterministic model — [b3d-radar](?b3d-radar.ts) bridges it to the scene (blips, HUD
traces, homing-missile locks). Direct use is a `Radar` you step each tick:

```javascript
import { Radar } from 'tosijs-3d'
// range + a detection cone + lock acquire/decay, seeded and Babylon-free — feed it blip positions
// each dt and read its tracks / nearest lock. See <tosi-b3d-radar> for the wired-up version.
```
#
