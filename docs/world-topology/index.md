# world-topology

The **pure spatial math** behind the coordinate-free `MinSimApi` surface ([world-contract](?world-contract.ts) §8).

The contract's whole bet is that **coordinates never cross the membrane** — the driver (and a human)
see *topology + a qualitative distance ladder*, never `x/y/z`. But the sim still keeps real geometry
on its own side to compute those qualities. This module is that computation, factored out Babylon-free
and deterministic so it can be unit-tested without a store or an engine — same discipline as
[fly-by-wire](?fly-by-wire.ts) / [formations](?formations.ts) / [ballistics](?ballistics.ts). The
stateful `WorldStore` holds the place graph + sim-private positions and delegates the maths here.

Three pure functions, three jobs:

- **`proximityRung(distance, extent)`** — a real distance in, an *adjective* out. The ladder is the
  only spatial quantity that crosses the seam, and its bands **scale with the place's `extent`**: two
  metres is `contact` in an intimate closet and `same-spot` in a vast plain.
- **`routePortals(portals, from, to)`** — cheapest portal path between two places, so "how far to a
  place" is a **graph fact** (an errand's feasibility), not `Vec3` maths. Skips **locked** portals — a
  locked door is not a feasible route until it opens.
- **`containmentPath(places, id)`** — the root→here breadcrumb up the `parent` chain, for the
  `SchematicView`'s "where am I" path.

## Example

```javascript
import { proximityRung, routePortals } from 'tosijs-3d'
// proximityRung(1.8, 'small') → 'reach';  proximityRung(1.8, 'vast') → 'same-spot'
// routePortals(portals, 'study', 'garden') → { portals: ['door-1','gate-2'], cost: 45 } | null
```
