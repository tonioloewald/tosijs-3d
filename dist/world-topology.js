/*#
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
*/
/*{ "parent": "World-Sim" }*/
/**
 * How the ladder's bands stretch with a place's `extent`. The numbers are the multiplier on the
 * base thresholds below, so a `vast` region's rungs are ~80× an `intimate` one's — "across the
 * room" means something very different in a closet and on a battlefield.
 */
const EXTENT_SCALE = {
    intimate: 0.5,
    small: 1,
    medium: 3,
    large: 10,
    vast: 40,
};
/**
 * Map a sim-private distance to a rung on the qualitative ladder — the ONE spatial value that
 * crosses the contract, and it's an adjective. Bands scale with the place `extent`. Returns at most
 * `present` (still IN the place, just far); `elsewhere` means a DIFFERENT place and is the caller's
 * job (two entities not in the same place are `elsewhere`, full stop).
 */
export function proximityRung(distance, extent = 'small') {
    const s = EXTENT_SCALE[extent];
    const d = Math.max(0, distance);
    if (d <= 0.3 * s)
        return 'same-spot';
    if (d <= 1.0 * s)
        return 'contact';
    if (d <= 2.5 * s)
        return 'reach';
    if (d <= 8 * s)
        return 'obvious';
    if (d <= 25 * s)
        return 'noticeable';
    return 'present';
}
/**
 * The inverse of `proximityRung` for PLACEMENT: a representative sim-private distance for a rung,
 * so "put the butler at `reach` of the desk" becomes a real offset the sim can lay out. Lands inside
 * the rung's band (round-trips back through `proximityRung`). `elsewhere` has no distance — that's a
 * different place, not a rung — so it's excluded from the input type.
 */
export function rungNominal(rung, extent = 'small') {
    const mid = {
        'same-spot': 0.15,
        contact: 0.6,
        reach: 1.7,
        obvious: 5,
        noticeable: 16,
        present: 40,
    };
    return mid[rung] * EXTENT_SCALE[extent];
}
/**
 * Cheapest portal path from `from` to `to`, or `null` if unreachable. Portals are **bidirectional**
 * (a door connects two places both ways) and **locked portals are skipped** — the route is what's
 * traversable now, so a locked door makes a place unreachable until it opens (that's the errand's
 * feasibility becoming a graph fact). `cost` is the sum of the coarse per-portal costs; the returned
 * `portals` are in traversal order. Deterministic: ties broken by portal id so the same graph always
 * yields the same path.
 */
export function routePortals(portals, from, to) {
    if (from === to)
        return { portals: [], cost: 0 };
    // Bidirectional adjacency over UNLOCKED portals only.
    const adj = new Map();
    const link = (a, b, via, cost) => {
        if (!adj.has(a))
            adj.set(a, []);
        adj.get(a).push({ via, to: b, cost });
    };
    for (const p of portals) {
        if (p.locked)
            continue;
        link(p.from, p.to, p.id, p.cost);
        link(p.to, p.from, p.id, p.cost);
    }
    // Dijkstra. No priority queue — the graphs are tiny (a mystery's rooms), and a linear scan keeps
    // it dependency-free and deterministic. Ties broken by node id, then portal id.
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const done = new Set();
    for (;;) {
        // pick the nearest unfinished node (deterministic tie-break by id)
        let cur = null;
        let best = Infinity;
        for (const [node, d] of dist) {
            if (done.has(node))
                continue;
            if (d < best || (d === best && cur != null && node < cur)) {
                best = d;
                cur = node;
            }
        }
        if (cur == null)
            return null; // nothing left reachable → unreachable
        if (cur === to)
            break;
        done.add(cur);
        const edges = (adj.get(cur) ?? [])
            .slice()
            .sort((a, b) => (a.via < b.via ? -1 : a.via > b.via ? 1 : 0));
        for (const e of edges) {
            if (done.has(e.to))
                continue;
            const nd = best + e.cost;
            const known = dist.get(e.to);
            if (known == null || nd < known) {
                dist.set(e.to, nd);
                prev.set(e.to, { via: e.via, from: cur });
            }
        }
    }
    // reconstruct
    const path = [];
    let node = to;
    while (node !== from) {
        const step = prev.get(node);
        if (step == null)
            return null;
        path.push(step.via);
        node = step.from;
    }
    path.reverse();
    return { portals: path, cost: dist.get(to) ?? 0 };
}
/**
 * The containment breadcrumb root→here: walk the `parent` chain up from `placeId` and reverse. Stops
 * safely on a missing parent or a cycle (defensive — a malformed graph shouldn't hang the sim).
 */
export function containmentPath(places, placeId) {
    const chain = [];
    const seen = new Set();
    let cur = placeId;
    while (cur != null && !seen.has(cur)) {
        seen.add(cur);
        const p = places.get(cur);
        if (p == null)
            break;
        chain.push({ id: p.id, label: p.label });
        cur = p.parent;
    }
    return chain.reverse();
}
//# sourceMappingURL=world-topology.js.map