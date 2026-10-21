/*
# warhead

**How much damage a hit does, and to whom.** Pure and deterministic. A warhead
is either DIRECT (a fixed amount to the one thing it hit) or AREA: full damage
inside `fullRadius`, falling in a straight line to 1 at `blastRadius`, and
nothing beyond.

```javascript
import { resolveAoe, aoeFalloff } from 'tosijs-3d/warhead'

const spec = { damage: 40, fullRadius: 2, blastRadius: 10 }
aoeFalloff(spec, 6) // 20.5: half way out

const hits = resolveAoe(spec, { x: 0, y: 0, z: 0 }, [
  { id: 'tank', position: { x: 3, y: 0, z: 0 } },
  { id: 'hut', position: { x: 30, y: 0, z: 0 } }, // out of range: not listed
  { id: 'bunker', position: { x: 4, y: 0, z: 0 }, visible: false }, // behind cover
])
// [{ id: 'tank', amount: 35.125 }]
```

`visible: false` is how cover works: the caller decides line of sight and the
model only does the arithmetic. [[b3d-warhead]] is the scene side (it gathers
the targets, casts the rays and draws the explosion); the amounts land on a
[[destroyable]].
*/
export function dist3(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
/**
 * AOE damage at a given distance from the blast center. Full `D` inside
 * `fullRadius`; linear down to a floor of 1 at `blastRadius`; 0 beyond it.
 */
export function aoeFalloff(spec, distance) {
    const D = spec.damage;
    const rFull = spec.fullRadius ?? 0;
    const R = spec.blastRadius ?? rFull;
    if (distance <= rFull)
        return D;
    if (distance > R)
        return 0;
    // Degenerate ring (R <= rFull): inside → full (handled above), else 0.
    if (R <= rFull)
        return 0;
    const t = (distance - rFull) / (R - rFull); // 0 at rFull, 1 at R
    return D - (D - 1) * t; // D → 1
}
/**
 * Resolve an AOE blast over a set of targets: returns the damage each VISIBLE
 * target within the blast radius takes (targets marked `visible: false`, or beyond
 * `blastRadius`, are omitted). `amount` is pre-armor/protection — the Destroyable
 * pipeline applies those.
 */
export function resolveAoe(spec, center, targets) {
    const out = [];
    for (const t of targets) {
        if (t.visible === false)
            continue;
        const amount = aoeFalloff(spec, dist3(center, t.position));
        if (amount > 0)
            out.push({ id: t.id, amount });
    }
    return out;
}
//# sourceMappingURL=warhead.js.map