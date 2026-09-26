/*#
# scatter

**Where things grow: rocks and trees placed on terrain by budget and by
climate.** The function is `scatterPlacements` (a bare `scatter` would leak a
common noun from the barrel, and one demo already has its own). Pure, with no Babylon and no DOM; the terrain and its climate
arrive as functions. [b3d-decorator](/b3d-decorator/) draws what this
returns.

## The rules speak climate, not biome names

A rule says where its kind is SUITABLE, in the same axes the terrain's biome
shader classifies by ([biome-chart](/biome-chart/)): **temperature** and
**moisture** (0…1 chart units), **altitude above sea level** (m) and **slope**
(degrees). So the trees agree with the ground colour by construction: pines
where the shader paints cold forest, palms at a warm shoreline, cacti in hot
dry country, and bare rock on the steep and high.

Each axis is a soft band (`[lo, hi]`, eased over `soft`), and a rule's
suitability at a point is the product of its bands times its `density`.

## Budget, not density

`budget` is the number of things, which is what performance cares about.
Candidate points are laid down at `oversample` × budget, the rules score each
one, and an acceptance threshold is SOLVED so the expected count equals the
budget. Sparse country and lush country get the same count; the lush one
spends it on trees.

## World-anchored and deterministic

Candidates live in world cells: each cell's point is a hash of its integer
coordinates and the seed. The same place always gets the same answer, however
the region moves, so re-scattering around a moving camera changes what is at
the EDGE and nothing that stays in view. Stable is the point.
*/
/*{ "parent": "Environment" }*/
/*
Cache keys are NUMBERS — the two cell indices packed into one (±2^20 cells a
side) — because string keys were most of the cache's weight. The cell size a
cache was filled at is remembered beside it, so a budget or radius change
(which changes the cell grid) clears it instead of misreading it.
*/
const CELL_OF = new WeakMap();
const OFF = 1 << 20;
const packCell = (ix, iz) => (ix + OFF) * 2 * OFF + (iz + OFF);
/** A 32-bit hash of integers — same mixing as voxel-galaxy's hash32. */
function hash(...parts) {
    let h = 0x9747b28c ^ parts.length;
    for (const part of parts) {
        let k = Math.imul(part | 0, 0xcc9e2d51);
        k = (k << 15) | (k >>> 17);
        k = Math.imul(k, 0x1b873593);
        h ^= k;
        h = (h << 13) | (h >>> 19);
        h = (Math.imul(h, 5) + 0xe6546b64) | 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
const unit = (h) => h / 4294967296;
/** A soft band: 1 inside [lo, hi], easing to 0 over `soft` outside it. */
export function band(x, range, soft) {
    if (range == null)
        return 1;
    const [lo, hi] = range;
    const s = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    const rise = soft > 0 ? s((x - (lo - soft)) / soft) : x >= lo ? 1 : 0;
    const fall = soft > 0 ? 1 - s((x - hi) / soft) : x <= hi ? 1 : 0;
    return rise * fall;
}
/*
ALTITUDE's lower edge is a HARD FLOOR that eases INWARD. With the ordinary
outward ease, a palm with a 0.5 m minimum grew down to −3.5 m and rocks to
−4 m: trees standing in the sea (Tonio). Nothing may start below its minimum,
so the ramp runs from lo up to lo + soft instead; the upper edge still eases
outward like every other band.
*/
function floorBand(x, range, soft) {
    if (range == null)
        return 1;
    const [lo, hi] = range;
    if (x < lo)
        return 0;
    return band(x, [lo + soft, hi], soft);
}
/** How suitable a point is for a rule — its density times every band. */
export function suitability(rule, c, slopeDeg) {
    return (rule.density *
        band(c.temperature, rule.temperature, 0.08) *
        band(c.moisture, rule.moisture, 0.08) *
        floorBand(c.altitude, rule.altitude, 4) *
        band(slopeDeg, rule.slope, 5));
}
export function scatterPlacements(o) {
    const oversample = o.oversample ?? 4;
    if (o.budget <= 0 || o.radius <= 0 || o.rules.length === 0)
        return [];
    const area = Math.PI * o.radius * o.radius;
    // Cell size so the circle holds budget × oversample candidates. Rounded to a
    // power of two so the cell grid is stable as the budget moves a little.
    const raw = Math.sqrt(area / (o.budget * oversample));
    const cell = Math.pow(2, Math.round(Math.log2(raw)));
    if (o.cache != null && CELL_OF.get(o.cache) !== cell) {
        o.cache.clear();
        CELL_OF.set(o.cache, cell);
    }
    const r2 = o.radius * o.radius;
    const x0 = Math.floor((o.center.x - o.radius) / cell);
    const x1 = Math.floor((o.center.x + o.radius) / cell);
    const z0 = Math.floor((o.center.z - o.radius) / cell);
    const z1 = Math.floor((o.center.z + o.radius) / cell);
    const e = Math.max(0.5, cell * 0.25); // finite-difference step for slope
    const cands = [];
    const R = o.rules.length;
    let pool = new Float64Array(4096 * R);
    let poolUsed = 0;
    for (let iz = z0; iz <= z1; iz++) {
        for (let ix = x0; ix <= x1; ix++) {
            const hx = hash(o.seed, ix, iz, 1);
            const hz = hash(o.seed, ix, iz, 2);
            const x = (ix + unit(hx)) * cell;
            const z = (iz + unit(hz)) * cell;
            const dx = x - o.center.x;
            const dz = z - o.center.z;
            if (dx * dx + dz * dz > r2)
                continue;
            const key = packCell(ix, iz);
            let g = o.cache?.get(key);
            if (g == null) {
                const y = o.height(x, z);
                /*
                Ground normal from FORWARD differences: three height samples per
                candidate, not five. Height sampling is the whole cost of a scatter
                (~800k samples at 20k items with central differences), and the slope
                only has to be good to a degree or two.
                */
                const gx = (o.height(x + e, z) - y) / e;
                const gz = (o.height(x, z + e) - y) / e;
                const len = Math.sqrt(gx * gx + 1 + gz * gz);
                g = { y, nx: -gx / len, ny: 1 / len, nz: -gz / len };
                o.cache?.set(key, g);
            }
            const slopeDeg = (Math.acos(g.ny) * 180) / Math.PI;
            const c = o.climate(x, z, g.y);
            // Weights go into one shared pool, not an array per candidate.
            if (poolUsed + R > pool.length) {
                const grown = new Float64Array(pool.length * 2);
                grown.set(pool);
                pool = grown;
            }
            let total = 0;
            for (let ri = 0; ri < R; ri++) {
                const r = o.rules[ri];
                const w = suitability(r, c, slopeDeg) *
                    (o.suppress ? Math.max(0, o.suppress(x, z, r.kind)) : 1);
                pool[poolUsed + ri] = w;
                total += w;
            }
            if (total <= 0)
                continue;
            const wAt = poolUsed;
            poolUsed += R;
            cands.push({
                x,
                z,
                y: g.y,
                nx: g.nx,
                ny: g.ny,
                nz: g.nz,
                w: wAt,
                total,
                h: hash(o.seed, ix, iz, 3),
            });
        }
    }
    if (cands.length === 0)
        return [];
    /*
    SOLVE THE THRESHOLD: accept a candidate with probability min(1, k·total),
    and find k so the expected count is the budget. Monotone in k, so bisect.
    If even k → ∞ cannot reach the budget, every suitable candidate is taken.
    */
    const totals = new Float64Array(cands.length);
    for (let i = 0; i < cands.length; i++)
        totals[i] = cands[i].total;
    const expected = (k) => {
        let sum = 0;
        for (let i = 0; i < totals.length; i++) {
            const p = k * totals[i];
            sum += p < 1 ? p : 1;
        }
        return sum;
    };
    let lo = 0;
    let hi = 1;
    while (expected(hi) < o.budget && hi < 1e12)
        hi *= 2;
    // 30 halvings: k to ~1e-9 of its bracket — far past what a count can show.
    for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (expected(mid) < o.budget)
            lo = mid;
        else
            hi = mid;
    }
    const k = hi;
    const out = [];
    for (const c of cands) {
        if (unit(c.h) >= Math.min(1, k * c.total))
            continue;
        // Which rule: proportional to its weight here.
        let pick = unit(hash(c.h, 11)) * c.total;
        let ri = 0;
        for (; ri < R - 1; ri++) {
            pick -= pool[c.w + ri];
            if (pick < 0)
                break;
        }
        const rule = o.rules[ri];
        const model = rule.models[Math.floor(unit(hash(c.h, 12)) * rule.models.length)];
        const [s0, s1] = rule.scale;
        out.push({
            rule: ri,
            model,
            x: c.x,
            y: c.y,
            z: c.z,
            yaw: unit(hash(c.h, 13)) * Math.PI * 2,
            scale: s0 + (s1 - s0) * unit(hash(c.h, 14)),
            normal: { x: c.nx, y: c.ny, z: c.nz },
        });
    }
    return out;
}
const range = (prefix, letters) => letters.split('').map((l) => `${prefix}${l}`);
/**
 * A starting rule set over Kenney's Nature Kit (`kenney/libraries/nature-kit.glb`).
 * Tuned against Land and Sky's default climate; a starting point, not a
 * taxonomy.
 */
export const NATURE_KIT_RULES = [
    {
        kind: 'pine',
        collider: 'trunk',
        models: [
            ...range('tree_pineDefault', 'AB'),
            ...range('tree_pineRound', 'ABCDEF'),
            ...range('tree_pineTall', 'ABCD'),
            ...range('tree_pineSmall', 'ABCD'),
        ],
        density: 1,
        temperature: [0.12, 0.5],
        moisture: [0.2, 1],
        altitude: [3, 1e5],
        slope: [0, 32],
        scale: [6, 11],
    },
    {
        kind: 'broadleaf',
        collider: 'trunk',
        models: [
            'tree_default',
            'tree_oak',
            'tree_detailed',
            'tree_fat',
            'tree_plateau',
            'tree_tall',
            'tree_thin',
            'tree_simple',
        ],
        density: 1,
        temperature: [0.45, 0.78],
        moisture: [0.3, 1],
        altitude: [2, 1e5],
        slope: [0, 28],
        scale: [6, 10],
    },
    {
        kind: 'palm',
        collider: 'trunk',
        models: ['tree_palm', 'tree_palmBend', 'tree_palmShort', 'tree_palmTall'],
        density: 1.4,
        temperature: [0.7, 1],
        moisture: [0.15, 1],
        altitude: [0.5, 18],
        slope: [0, 20],
        scale: [6, 10],
    },
    {
        kind: 'bush',
        models: [
            'plant_bush',
            'plant_bushDetailed',
            'plant_bushLarge',
            'plant_bushSmall',
            'plant_bushTriangle',
        ],
        density: 1.6,
        temperature: [0.25, 0.85],
        moisture: [0.15, 1],
        altitude: [1, 1e5],
        slope: [0, 38],
        scale: [4, 8],
    },
    {
        kind: 'cactus',
        collider: 'trunk',
        models: ['cactus_short', 'cactus_tall'],
        density: 1.2,
        temperature: [0.7, 1],
        moisture: [0, 0.2],
        altitude: [1, 1e5],
        slope: [0, 25],
        scale: [5, 9],
    },
    {
        kind: 'boulder',
        collider: 'box',
        models: [
            ...range('rock_large', 'ABCDEF'),
            ...range('rock_tall', 'ABCDEFGHIJ'),
        ],
        density: 0.35,
        altitude: [0, 1e5],
        slope: [8, 90],
        scale: [5, 14],
        alignToSlope: 0.6,
    },
    {
        kind: 'rock',
        models: [
            ...range('rock_small', 'ABCDEFGHI'),
            ...range('rock_smallFlat', 'ABC'),
        ],
        density: 0.5,
        altitude: [0, 1e5],
        scale: [3, 7],
        alignToSlope: 0.9,
    },
];
/**
 * THE NEAR-SET — "the placements around this point" as one query, shared by
 * everything that exists only near the viewer: the decorator's collider pool
 * and its shadow casters today; detailed models, interaction and sound
 * emitters when they come (Tonio: "analogous to how we handle collisions").
 *
 * A uniform grid over the placements, built once per scatter. A query touches
 * only the cells within `range`, so its cost is set by the neighbourhood, not
 * by the budget.
 */
export class NearIndex {
    items;
    cellSize;
    cells = new Map();
    constructor(items, cellSize = 32) {
        this.items = items;
        this.cellSize = cellSize;
        for (const p of items) {
            const key = this.key(Math.floor(p.x / cellSize), Math.floor(p.z / cellSize));
            const list = this.cells.get(key);
            if (list)
                list.push(p);
            else
                this.cells.set(key, [p]);
        }
    }
    key(i, j) {
        return `${i},${j}`;
    }
    /**
     * Up to `max` items within `range` of (x, z), NEAREST FIRST, optionally
     * filtered. Returns each with its distance.
     */
    near(x, z, range, max = Infinity, filter) {
        const c = this.cellSize;
        const i0 = Math.floor((x - range) / c);
        const i1 = Math.floor((x + range) / c);
        const j0 = Math.floor((z - range) / c);
        const j1 = Math.floor((z + range) / c);
        const out = [];
        for (let j = j0; j <= j1; j++)
            for (let i = i0; i <= i1; i++) {
                const list = this.cells.get(this.key(i, j));
                if (list == null)
                    continue;
                for (const item of list) {
                    if (filter && !filter(item))
                        continue;
                    const d = Math.hypot(item.x - x, item.z - z);
                    if (d <= range)
                        out.push({ item, d });
                }
            }
        out.sort((a, b) => a.d - b.d);
        return out.length > max ? out.slice(0, Math.max(0, Math.floor(max))) : out;
    }
}
/**
 * Drop cached candidates more than `keep` from `center`, so a cache that
 * follows a moving camera stays the size of a neighbourhood, not a journey.
 */
export function pruneScatterCache(cache, center, keep) {
    const cell = CELL_OF.get(cache);
    if (cell == null)
        return;
    const k2 = keep * keep;
    for (const key of cache.keys()) {
        const ix = Math.floor(key / (2 * OFF)) - OFF;
        const iz = (key % (2 * OFF)) - OFF;
        const dx = (ix + 0.5) * cell - center.x;
        const dz = (iz + 0.5) * cell - center.z;
        if (dx * dx + dz * dz > k2)
            cache.delete(key);
    }
}
//# sourceMappingURL=scatter.js.map