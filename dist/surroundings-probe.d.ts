import * as BABYLON from '@babylonjs/core';
import type { Surroundings } from './surroundings.js';
export interface ReadOptions {
    /** How far to look. Anything beyond this is scenery, not cover. */
    maxRange?: number;
    /**
     * Slack when gathering candidates, in metres.
     *
     * A bounding SPHERE is bigger than the mesh inside it and a long wall's
     * sphere is centred far from the bit you are standing at, so the gather has
     * to be generous or it drops the geometry it exists to find. Cheap
     * insurance: a few extra candidates cost a bounding test each.
     */
    margin?: number;
    /** Narrow what counts as an obstruction. Defaults to visible + pickable. */
    filter?: (mesh: BABYLON.AbstractMesh) => boolean;
    /** Reused between reads, so a per-tick probe allocates nothing. */
    scratch?: ProbeScratch;
}
/** Buffers a repeated probe can reuse. Make one per character and keep it. */
export interface ProbeScratch {
    candidates: BABYLON.AbstractMesh[];
    ray: BABYLON.Ray;
    from: BABYLON.Vector3;
    dir: BABYLON.Vector3;
}
export declare function makeProbeScratch(): ProbeScratch;
/**
 * Fill a read from the scene, around `feet`.
 *
 * `feet` is the GROUND POINT under the character, not its centre — every height
 * in the read is measured up from there, and passing a centre silently shifts
 * the whole ladder by half a body.
 *
 * And it must not MOVE when the character does something to itself. The demo
 * derived it from a capsule's position, which drops on a crouch, so the ladder
 * dropped too: the wall measured taller than it is, the character talked
 * himself out of the cover he was standing behind, stood up, found it again,
 * and crouched. A feedback loop with a stance in it, from one line that looked
 * like arithmetic.
 *
 * Mutates and returns `surr`, so a caller keeps one read per character and
 * never allocates.
 */
export declare function readSurroundings(scene: BABYLON.Scene, feet: BABYLON.Vector3, surr: Surroundings, options?: ReadOptions): Surroundings;
/**
 * A probe that reads no more often than it needs to.
 *
 * `MOBILITY-DESIGN.md`'s other instruction — "not constantly". The mantle probe
 * runs at 12Hz and misses nothing because at a run that is ~0.4m between
 * samples, finer than any ledge worth climbing. Cover is the same: the wall
 * does not move, and neither do you, fast.
 *
 * Returns `true` when it actually took a reading, so a caller can skip the
 * derivation too rather than re-deriving identical answers sixty times a second.
 */
export declare class SurroundingsProbe {
    surroundings: Surroundings;
    hz: number;
    private _scratch;
    private _since;
    private _elapsed;
    constructor(surroundings: Surroundings, hz?: number);
    /** Advance the clock and read if due. `dt` is seconds. */
    update(scene: BABYLON.Scene, feet: BABYLON.Vector3, dt: number, options?: ReadOptions): boolean;
    /** Force the next `update` to read, whatever the clock says. */
    invalidate(): void;
}
//# sourceMappingURL=surroundings-probe.d.ts.map