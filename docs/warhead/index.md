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
