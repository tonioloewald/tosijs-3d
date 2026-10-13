# destroyable-behavior

The **attachable** destroyable — the reusable bridge that makes *any* modeled element
(a loaded GLB, a biped, a vehicle) take damage and die, without being a separate
`<tosi-b3d-destroyable>` cube. It's the scene-side glue over the pure `CombatWorld`
(see `destroyable.ts` / COMBAT-DESIGN.md): it registers the host in the scene combat
world, flashes + reacts to hits, watches for destruction from *any* cause (a direct
hit or a chain reaction resolved in the combat tick), and runs the configurable death
outcome on the host's own mesh.

A host supplies its `mesh` (for the flash / explosion / blast origin) and an event
target; the behavior owns everything combat. `B3dDestroyable` is a thin wrapper of
this around a placeholder cube — attach one to a loader/biped/car the same way.

Death outcome (all optional; default just removes/hides the mesh):
- `explode` — shatter the host mesh into fragments (`b3d-exploder`).
- `deathBlast` — detonate an AOE warhead at the death point after `blastDelay`
  (default 100 ms): a **second** chain mechanism distinct from `chain`'s direct HP
  transfer — a falloff + line-of-sight explosion that ripples through neighbours.
- `whenDestroyed` callback + a bubbling `destroyed` event — the seam for flipping a linked
  player/vehicle into a *dead* state, spawning loot, swapping a wreck model, etc.

## Example

For a ready-to-click live demo, see [b3d-destroyable](?b3d-destroyable.ts) (a field of cubes you
shoot). This is the reusable behavior *underneath* it — attach damage to any existing mesh:

```javascript
import { DestroyableBehavior } from 'tosijs-3d'
// Give a loaded GLB / biped / vehicle a health pool + death outcome without wrapping it in a
// <tosi-b3d-destroyable> cube; at 0 hp it runs the same explode / wreck / loot outcomes.
```
