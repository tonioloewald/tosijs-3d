/*#
# procedural-rock

**Rocks made from a seed, with no model file.** `rockGeometry` returns the
positions, normals and indices of one rock. The same seed always gives the same
rock, so a scattered field is reproducible and needs nothing from the network.

[b3d-decorator](/b3d-decorator/) uses it for every boulder and stone: a rule
names a model `rock:boulder:3` and the decorator builds it instead of looking
it up in a library. It shades them with the terrain's own biome colours, so a
rock on Mars is Mars-coloured and a rock above the snow line carries snow.

```javascript
import { rockGeometry } from 'tosijs-3d'

const rock = rockGeometry({ seed: 7, cuts: 9, squash: 0.75 })
// rock.positions, rock.normals, rock.indices
```

## How a rock is made

1. Start from a sphere.
2. **Cut it** with a handful of random planes. This is what makes it read as
   rock: flat faces meeting at blunt edges, where noise alone gives a potato.
3. Push the surface in and out with a little low-frequency noise.
4. Stretch it unevenly and squash it, so no two share a silhouette.
5. Sink the base a little below `y = 0`, so it sits IN the ground.

The result is about one unit across, with its origin on the ground under it:
the same convention as a library model, so scatter rules scale it the same way.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `seed` | `1` | Same seed, same rock |
| `detail` | `2` | Subdivisions of the starting sphere: 1 = 42 vertices, 2 = 162, 3 = 642 |
| `cuts` | `8` | How many planes cut it. More cuts, more faces |
| `roughness` | `0.07` | Depth of the noise, as a fraction of the radius |
| `squash` | `0.7` | Height relative to width. Low values give slabs |
| `sink` | `0.15` | Fraction of the height that sits below the ground |
*/
/*{ "parent": "Environment" }*/
import { PRNG } from './mersenne-twister.js';
import { PerlinNoise } from './perlin-noise.js';
/** The icosahedron, subdivided `detail` times and pushed out to a unit sphere. */
function icosphere(detail) {
    const t = (1 + Math.sqrt(5)) / 2;
    const dirs = [];
    const add = (x, y, z) => {
        const l = Math.hypot(x, y, z);
        dirs.push(x / l, y / l, z / l);
        return dirs.length / 3 - 1;
    };
    for (const [x, y, z] of [
        [-1, t, 0],
        [1, t, 0],
        [-1, -t, 0],
        [1, -t, 0],
        [0, -1, t],
        [0, 1, t],
        [0, -1, -t],
        [0, 1, -t],
        [t, 0, -1],
        [t, 0, 1],
        [-t, 0, -1],
        [-t, 0, 1],
    ])
        add(x, y, z);
    let indices = [
        0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10,
        2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5,
        2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ];
    for (let level = 0; level < detail; level++) {
        const mid = new Map();
        const midpoint = (a, b) => {
            const key = a < b ? a * 65536 + b : b * 65536 + a;
            let m = mid.get(key);
            if (m == null) {
                m = add(dirs[a * 3] + dirs[b * 3], dirs[a * 3 + 1] + dirs[b * 3 + 1], dirs[a * 3 + 2] + dirs[b * 3 + 2]);
                mid.set(key, m);
            }
            return m;
        };
        const next = [];
        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i];
            const b = indices[i + 1];
            const c = indices[i + 2];
            const ab = midpoint(a, b);
            const bc = midpoint(b, c);
            const ca = midpoint(c, a);
            next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
        }
        indices = next;
    }
    return { dirs, indices };
}
/** One seeded rock. Pure: no engine, no clock, no `Math.random`. */
export function rockGeometry(opts = {}) {
    const seed = opts.seed ?? 1;
    const detail = Math.max(0, Math.min(3, Math.round(opts.detail ?? 2)));
    const cutCount = Math.max(0, Math.round(opts.cuts ?? 8));
    const roughness = opts.roughness ?? 0.07;
    const squash = opts.squash ?? 0.7;
    const sink = opts.sink ?? 0.15;
    const prng = new PRNG(seed);
    // PRNG.range is INTEGER; this is the float one.
    const range = (min, max) => min + prng.value() * (max - min);
    const noise = new PerlinNoise(seed);
    // A point on the sphere, uniformly: z and an angle.
    const cuts = [];
    for (let i = 0; i < cutCount; i++) {
        const z = range(-1, 1);
        const a = range(0, Math.PI * 2);
        const s = Math.sqrt(1 - z * z);
        cuts.push(s * Math.cos(a), z, s * Math.sin(a), range(0.55, 0.92));
    }
    const sx = range(0.8, 1.2);
    const sz = range(0.8, 1.2);
    const ox = range(0, 100);
    const oy = range(0, 100);
    const oz = range(0, 100);
    const { dirs, indices } = icosphere(detail);
    const count = dirs.length / 3;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const dx = dirs[i * 3];
        const dy = dirs[i * 3 + 1];
        const dz = dirs[i * 3 + 2];
        let r = 1;
        for (let k = 0; k < cuts.length; k += 4) {
            const along = dx * cuts[k] + dy * cuts[k + 1] + dz * cuts[k + 2];
            if (along > 1e-6)
                r = Math.min(r, cuts[k + 3] / along);
        }
        const n = noise.noise3D(dx * 1.7 + ox, dy * 1.7 + oy, dz * 1.7 + oz) +
            0.5 * noise.noise3D(dx * 3.9 + oz, dy * 3.9 + ox, dz * 3.9 + oy);
        r *= 1 + roughness * n;
        positions[i * 3] = dx * r * sx;
        positions[i * 3 + 1] = dy * r * squash;
        positions[i * 3 + 2] = dz * r * sz;
    }
    // About one unit across, base sunk a little below the ground.
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
        minX = Math.min(minX, positions[i * 3]);
        maxX = Math.max(maxX, positions[i * 3]);
        minY = Math.min(minY, positions[i * 3 + 1]);
        maxY = Math.max(maxY, positions[i * 3 + 1]);
        minZ = Math.min(minZ, positions[i * 3 + 2]);
        maxZ = Math.max(maxZ, positions[i * 3 + 2]);
    }
    const scale = 1 / Math.max(maxX - minX, maxZ - minZ, 1e-6);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const lift = -minY - sink * (maxY - minY);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (positions[i * 3] - cx) * scale;
        positions[i * 3 + 1] = (positions[i * 3 + 1] + lift) * scale;
        positions[i * 3 + 2] = (positions[i * 3 + 2] - cz) * scale;
    }
    // Smooth normals, weighted by face area (the cross product's own length).
    const normals = new Float32Array(count * 3);
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3;
        const b = indices[i + 1] * 3;
        const c = indices[i + 2] * 3;
        const ux = positions[b] - positions[a];
        const uy = positions[b + 1] - positions[a + 1];
        const uz = positions[b + 2] - positions[a + 2];
        const vx = positions[c] - positions[a];
        const vy = positions[c + 1] - positions[a + 1];
        const vz = positions[c + 2] - positions[a + 2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        for (const v of [a, b, c]) {
            normals[v] += nx;
            normals[v + 1] += ny;
            normals[v + 2] += nz;
        }
    }
    for (let i = 0; i < count; i++) {
        const l = Math.hypot(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]) || 1;
        normals[i * 3] /= l;
        normals[i * 3 + 1] /= l;
        normals[i * 3 + 2] /= l;
    }
    return {
        positions,
        normals,
        indices: Uint16Array.from(indices),
        min: [(minX - cx) * scale, (minY + lift) * scale, (minZ - cz) * scale],
        max: [(maxX - cx) * scale, (maxY + lift) * scale, (maxZ - cz) * scale],
    };
}
/** The shapes a scatter rule can ask for by name. */
export const ROCK_KINDS = {
    // 162 vertices each. At detail 3 (642) the default scatter's boulders
    // alone were 210k vertices, more than the terrain.
    boulder: { detail: 2, cuts: 10, roughness: 0.06, squash: 0.8, sink: 0.18 },
    tall: { detail: 2, cuts: 9, roughness: 0.06, squash: 1.15, sink: 0.15 },
    stone: { detail: 2, cuts: 7, roughness: 0.07, squash: 0.65, sink: 0.2 },
    slab: { detail: 2, cuts: 7, roughness: 0.05, squash: 0.35, sink: 0.25 },
};
/**
 * Read a model name of the form `rock:<kind>:<n>` (what a scatter rule lists).
 * Returns the options for that rock, or `null` when the name is something else.
 */
export function rockFromName(name) {
    const m = /^rock:([a-z]+):(\d+)$/.exec(name);
    if (m == null)
        return null;
    const kind = ROCK_KINDS[m[1]];
    if (kind == null)
        return null;
    // Kinds get separate seed ranges, so `boulder:1` and `stone:1` differ.
    const base = Object.keys(ROCK_KINDS).indexOf(m[1]) * 1000;
    return { ...kind, seed: base + Number(m[2]) };
}
/** `rockNames('boulder', 6)` → `['rock:boulder:1', … 'rock:boulder:6']`. */
export function rockNames(kind, count) {
    return Array.from({ length: count }, (_, i) => `rock:${kind}:${i + 1}`);
}
//# sourceMappingURL=procedural-rock.js.map