/*#
# radar.ts

The **pure, deterministic radar model** — range + detection cone + lock acquisition,
Babylon-free (plain `{x, y, z}`, time only via `dt`, no `Date.now`/`Math.random`), so
it unit-tests headless like `fly-by-wire` / `world-store`. `b3d-radar.ts` bridges it to
the scene (enumerates `RadarBlip`s, supplies the platform pose, plots the HUD).

A `Radar` detects contacts within **range · profile** AND inside its **cone** (dot of
the platform's forward with the bearing to the contact ≥ `coneDot`; ±90° → `coneDot 0`).
Detected, **lockable** contacts build a lock over `lockTime` seconds; up to `maxLocks`
of the **nearest** ones hold locks at once. Losing detection decays the lock back down.
#*/
/*{ "parent": "Combat" }*/
const sq = (n) => n * n;
export class Radar {
    params;
    // Lock build-up per contact id (0..1). Absent = 0. Deterministic: advanced only
    // by dt, keyed by the caller's stable id.
    _progress = new Map();
    _lastTracks = [];
    constructor(params) {
        this.params = params;
    }
    /**
     * Advance the radar one step and return this frame's tracks, NEAREST FIRST.
     * `forward` should be unit length (the platform's nose/boresight direction).
     */
    update(viewer, forward, contacts, dt) {
        const { range, coneDot, lockTime, maxLocks, acquireConeDot, acquireRangeFraction, } = this.params;
        const rows = [];
        for (const c of contacts) {
            const dx = c.pos.x - viewer.x;
            const dy = c.pos.y - viewer.y;
            const dz = c.pos.z - viewer.z;
            const distance = Math.sqrt(sq(dx) + sq(dy) + sq(dz));
            const effRange = c.profile < 0 ? Infinity : range * c.profile;
            const inv = distance > 1e-6 ? 1 / distance : 0;
            const dot = (dx * forward.x + dy * forward.y + dz * forward.z) * inv;
            const detected = c.profile !== 0 && distance <= effRange && dot >= coneDot;
            const canMaintain = c.lockable && detected;
            const inAcquire = c.lockable &&
                distance <= effRange * acquireRangeFraction &&
                dot >= acquireConeDot;
            rows.push({ c, distance, detected, canMaintain, inAcquire });
        }
        // 2. Lock slots (up to maxLocks): HELD locks keep priority (nearest first) so a new
        //    acquisition can't bump an existing lock; then the nearest fresh acquirers.
        const prevOf = (id) => this._progress.get(id) ?? 0;
        const byDist = (a, b) => a.distance - b.distance;
        const held = rows
            .filter((r) => prevOf(r.c.id) >= 1 && r.canMaintain)
            .sort(byDist);
        const acquiring = rows
            .filter((r) => prevOf(r.c.id) < 1 && r.inAcquire)
            .sort(byDist);
        const slots = new Set();
        for (const r of [...held, ...acquiring]) {
            if (slots.size >= Math.max(0, maxLocks))
                break;
            slots.add(r.c.id);
        }
        // 3. Advance progress. Build ONLY inside the acquire envelope; a completed lock
        //    HOLDS while it can be maintained (wider radar cone) and is LOST the moment it
        //    leaves — no lingering decay: out of envelope / out of slot ⇒ 0.
        const gain = lockTime > 0 ? dt / lockTime : 1;
        const alive = new Set();
        const tracks = [];
        for (const { c, distance, detected, canMaintain, inAcquire } of rows) {
            const prev = prevOf(c.id);
            let p = 0;
            if (slots.has(c.id)) {
                if (prev >= 1)
                    p = canMaintain ? 1 : 0;
                else
                    p = inAcquire ? Math.min(1, prev + gain) : 0;
            }
            if (p > 0) {
                this._progress.set(c.id, p);
                alive.add(c.id);
            }
            tracks.push({
                id: c.id,
                pos: c.pos,
                distance,
                detected,
                lockProgress: p,
                locked: p >= 1,
            });
        }
        // Forget contacts that dropped to 0 or vanished this frame.
        for (const id of this._progress.keys()) {
            if (!alive.has(id))
                this._progress.delete(id);
        }
        tracks.sort((a, b) => a.distance - b.distance);
        this._lastTracks = tracks;
        return tracks;
    }
    /** Tracks from the last `update`, nearest first. */
    get tracks() {
        return this._lastTracks;
    }
    /** Locked tracks only, nearest first — `[0]` is the missile's target. */
    get locks() {
        return this._lastTracks.filter((t) => t.locked);
    }
    /** The nearest full lock, or null. */
    get nearestLock() {
        for (const t of this._lastTracks)
            if (t.locked)
                return t;
        return null;
    }
}
/** Convenience: cone half-angle in DEGREES → the `coneDot` (cos) the model wants. */
export const coneDotFromDegrees = (halfAngleDeg) => Math.cos((halfAngleDeg * Math.PI) / 180);
/**
 * Faction opposition — who a radar treats as a lock target. `friendly` and `hostile`
 * are mutual enemies; `neutral` and `waypoint` are never targets (they still show as
 * tracks). A radar's own `alignment` decides: a `friendly` platform (the player) locks
 * `hostile`s; a `hostile` platform (an enemy turret) locks `friendly`s (i.e. the player).
 * This is the `lockable` flag the bridge passes per contact. Kept here (plain strings)
 * so the model stays self-contained and testable.
 */
export function isOpposed(selfFaction, other) {
    return ((selfFaction === 'friendly' && other === 'hostile') ||
        (selfFaction === 'hostile' && other === 'friendly'));
}
//# sourceMappingURL=radar.js.map