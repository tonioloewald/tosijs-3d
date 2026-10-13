# hud

Driver for the aircraft HUD SVG (`static/aircraft-hud.svg`, normalized for control):
sets the four meters, the horizon/pitch ladder, and the radar traces. The geometry
math is pure ([hud-math](?hud-math.ts)); this layer just pushes values onto the SVG,
so the same controller works whether the SVG is a flat DOM overlay or rasterized to a
Babylon texture (svg-texture re-serializes it each update).

`loadHud(url)` fetches + parses the designed asset (primary); `buildFallbackHud()`
constructs a minimal equivalent in code so a HUD still renders if the asset is
missing.

## See it live

The assembled, animated HUD is [<tosi-b3d-hud>](?b3d-hud.ts) — drop it into an aircraft demo. This
module is the driver underneath: `buildFallbackHud()` builds the SVG plus a controller whose
`setMeter` / `setHorizon` / `setTraces` / `setWarnings` push live values onto it (the projection
math is pure, in [hud-math](?hud-math.ts)).

```javascript
import { buildFallbackHud } from 'tosijs-3d'
const hud = buildFallbackHud()
hud.setMeter('airspeed', 0.6) // then mount hud's SVG in an overlay, or use <tosi-b3d-hud>
```
