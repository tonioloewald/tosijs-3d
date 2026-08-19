/*#
# prefab

A **prefab** is a named factory that instantiates *a package of stuff* at a pose — the
concept Unity calls a prefab, and one this library needed a name for.

It is not only a death thing. The same idea serves:

- **remains** — what a [destroyable](?b3d-destroyable.ts) leaves behind when it dies:
  wreckage, a burning hull, a crater, scattered loot, a dropped weapon;
- **spawners** — what an enemy wave instantiates (an aircraft *plus* its radar blip *plus*
  its destroyable *plus* its AI);
- **pickups and props** — a crate that is really a mesh, a trigger and a sound.

Because a prefab returns **elements**, and this library is elements, a prefab is just a
function. There is no new object model to learn: whatever you'd have written by hand, write
it in a function and give it a name.

```javascript
import { definePrefab, b3dParticles, b3dSound, b3dDestroyable } from 'tosijs-3d'

definePrefab('fuel-drum-remains', ({ position, velocity }) => [
  b3dSound({ url: '/sfx/explode.mp3', autoplay: true, ...position }),
  b3dParticles({ preset: 'fire', lifetime: 6, ...position }),
  // Loot that inherits the drum's momentum, so it scatters the way it was thrown.
  b3dDestroyable({ meshName: 'canister', capacity: 2, ...position, vx: velocity?.x }),
])

// Then, declaratively:
b3dDestroyable({ meshName: 'drum', remains: 'fuel-drum-remains' })
```

## Why a REGISTRY and not just a callback

Both work: `remains` takes a prefab **name** *or* a factory function. The name matters
because attributes are strings — `remains="fuel-drum-remains"` has to survive being written
in HTML, in a saved level, or in an intent sent across a worker membrane by a narrative
driver (`world-contract.ts`). A driver can ask for "the wreck prefab" without holding a
JavaScript function; a closure cannot cross that boundary, a name can.

## The context a prefab gets

Everything it needs to be *where and how the thing died*: `position`, `rotation`, and the
**`velocity` of what died** — so debris keeps the momentum it had rather than dropping out of
the air like a stone. Plus `source` (what died/spawned it) and `faction`, for prefabs that
care.
*/
/*{ "parent": "World Sim", "order": 900 }*/
const registry = new Map();
/**
 * Register a prefab under a name. Names are how a prefab survives being written in an
 * attribute, saved in a level, or requested by a driver across a worker boundary.
 * Re-registering a name replaces it (hot-reload friendly).
 */
export function definePrefab(name, prefab) {
    registry.set(name, prefab);
}
/** Look up a prefab by name. */
export function getPrefab(name) {
    return registry.get(name) ?? null;
}
/** Every registered name (for editors, debug panels, a driver's vocabulary). */
export function prefabNames() {
    return [...registry.keys()];
}
/**
 * Instantiate a prefab (by name or directly) and add whatever it produces to the scene.
 * Returns the elements added — so a caller that wants to clear them later (a wreck that
 * burns only until you respawn) can keep the handle.
 *
 * An unknown NAME is a no-op with a warning rather than a throw: a missing bit of set
 * dressing must never take the game down mid-fight.
 */
export function spawnPrefab(nameOrPrefab, ctx) {
    if (nameOrPrefab == null || nameOrPrefab === '')
        return [];
    const prefab = typeof nameOrPrefab === 'string' ? getPrefab(nameOrPrefab) : nameOrPrefab;
    if (prefab == null) {
        console.warn(`prefab: no prefab named "${String(nameOrPrefab)}"`);
        return [];
    }
    const produced = prefab(ctx);
    if (produced == null)
        return [];
    const elements = Array.isArray(produced) ? produced : [produced];
    for (const el of elements)
        ctx.owner.appendChild(el);
    return elements;
}
//# sourceMappingURL=prefab.js.map