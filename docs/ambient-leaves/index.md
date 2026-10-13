# ambient-leaves

The one ambient effect that is **not a sprite**.

Motes, rain and bubbles are camera-facing dots — a billboard always turns its face to you, which
is exactly what you want for something round. A leaf is not round. Its whole read is that it
**tumbles**: it flashes broadside, thins to an invisible edge, flips, shows its back. A billboard
can never do that (it has no back to show), so leaves are real two-sided quads with per-particle
3-D rotation — a Babylon `SolidParticleSystem`, not a `ParticleSystem`.

Everything else is shared with [b3d-ambient](?b3d-ambient.ts): the emitter box rides the camera so
the cost is fixed no matter how big the world is, the population is what the budget grants, and the
field DRAINS rather than being switched off. `B3dAmbient` owns all of that and drives this renderer;
this file owns only the tumble.

> **The shared wind has landed.** `setWind` used to be a placeholder — each leaf carried its own
> drift, which read fine in isolation and did not AGREE with the clouds or the water. It now comes
> from [[wind|the scene's wind]] via `b3d-ambient`, so leaves stream the same way the sky does, and
> the per-leaf sway is what it was always meant to be: the flutter ON TOP of a shared field rather
> than a stand-in for one.
>
> Set `wind="own"` on the ambient element to opt out — which is how you say a courtyard is
> sheltered while the scene blows.

## See it live

`LeafField` is the tumbling-quad renderer that [b3d-ambient](?b3d-ambient.ts) drives — set that
component up (its demo blows leaves through the scene) and the budget decides the population.

```javascript
import { LeafField } from 'tosijs-3d'
// A LeafField rides the camera and renders whatever population the budget grants. b3d-ambient owns
// the budget + drain, so prefer <tosi-b3d-ambient> unless you're wiring your own ambient system.
```
