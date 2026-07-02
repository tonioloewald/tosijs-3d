/**
 * Pure, Babylon-free warhead damage resolution (see COMBAT-DESIGN.md). A warhead
 * is single-use and delivers damage one of two ways:
 *  - DIRECT: a fixed amount to the single thing it hits.
 *  - AREA (AOE): linear falloff between two radii — full damage `D` within
 *    `fullRadius`, scaling DOWN linearly to a floor of **1** at `blastRadius`,
 *    and 0 beyond. (Deliberately linear, not inverse-square.)
 *
 * Line-of-sight occlusion is intentionally OUT of this pure model: the bridge
 * (`b3d-warhead`) does the raycasts and passes only visible targets (or marks
 * each target's `visible` flag). Everything here is deterministic and unit-tested.
 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface WarheadSpec {
    /** Full damage `D` — dealt on a direct hit and within the AOE full radius. */
    damage: number;
    /** Within this distance the AOE deals full damage. Default 0 (peak only at the center). */
    fullRadius?: number;
    /** AOE outer radius: damage falls linearly from `D` (at fullRadius) to 1 here, 0 beyond. */
    blastRadius?: number;
}
export interface AoeTarget {
    id: string;
    position: Vec3;
    /**
     * False = blocked by line-of-sight (shield/geometry between it and the warhead)
     * → takes nothing. Defaults to visible when omitted (the bridge sets it).
     */
    visible?: boolean;
}
export declare function dist3(a: Vec3, b: Vec3): number;
/**
 * AOE damage at a given distance from the blast center. Full `D` inside
 * `fullRadius`; linear down to a floor of 1 at `blastRadius`; 0 beyond it.
 */
export declare function aoeFalloff(spec: WarheadSpec, distance: number): number;
/**
 * Resolve an AOE blast over a set of targets: returns the damage each VISIBLE
 * target within the blast radius takes (targets marked `visible: false`, or beyond
 * `blastRadius`, are omitted). `amount` is pre-armor/protection — the Destroyable
 * pipeline applies those.
 */
export declare function resolveAoe(spec: WarheadSpec, center: Vec3, targets: AoeTarget[]): Array<{
    id: string;
    amount: number;
}>;
//# sourceMappingURL=warhead.d.ts.map