# hud-math

Pure, dependency-free math for the aircraft HUD (see `static/aircraft-hud.svg`):
the Manta-style **radar trace** projection (track a target inside the HUD when it's
in the field of view, pin it to the periphery in its bearing direction when it's
outside/behind) and the **horizon/pitch-ladder** transform. Plain `{x,y,z}` /
quaternion objects (reuses [spatial-transform](?spatial-transform.ts)), so it
unit-tests headless like `fly-by-wire`; the SVG HUD renderer consumes the output.

## Example

Pure functions the [HUD driver](?hud.ts) / SVG renderer call — no scene of their own:

```javascript
import { hudTrace, horizonTransform } from 'tosijs-3d'

// hudTrace(viewer, targetWorldPos, opts) → where to draw a target on the HUD: it TRACKS the
// target while it's in the field of view, and PINS it to the periphery (in its bearing
// direction) when the target is outside the FOV or behind you — the Manta-style radar trace.
//
// horizonTransform(...) places the artificial-horizon line + pitch ladder for the current
// aircraft attitude. See <tosi-b3d-hud> for the live, assembled HUD.
```
