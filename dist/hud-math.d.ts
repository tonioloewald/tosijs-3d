import { type Vec3, type Pose } from './spatial-transform';
/** A HUD gauge-frame side (bottom = ground, i.e. PULL UP). */
export type Side = 'left' | 'right' | 'top' | 'bottom';
/**
 * Rough centroid of an SVG path's coordinates → which side of the 256px HUD centre
 * (128,128) it sits on. Used to tag the four gauge arcs by side.
 */
export declare const sideFromD: (d: string) => Side;
export type HudTrace = {
    /** HUD-space position, centred at (0,0), +x right, +y DOWN (SVG convention). */
    x: number;
    y: number;
    /** True when the target is inside the HUD FOV (tracked); false when pinned to the edge. */
    tracked: boolean;
    /** True when the target is behind the viewer. */
    behind: boolean;
    /** Straight-line distance viewer→target (for range readouts / trace scaling). */
    distance: number;
    /** Bearing off the nose in radians: azimuth (+right) and elevation (+up). */
    azimuth: number;
    elevation: number;
};
export type HudTraceOptions = {
    /** Horizontal field of view in radians (full angle). */
    fovH: number;
    /** Vertical field of view in radians (full angle). */
    fovV: number;
    /** HUD radius in HUD units — tracked (in-FOV) traces stay within it. */
    radius: number;
    /**
     * Radius for PINNED (out-of-FOV) traces. Set larger than `radius` to pin them
     * OUTSIDE the gauge ring (in the room around it) rather than over the gauges.
     * Defaults to `radius`.
     */
    pinRadius?: number;
};
/**
 * Project a world-space target into HUD space relative to a viewer pose (the
 * aircraft; +Z is the nose). Inside the FOV → a tracked position within `radius`;
 * outside or behind → pinned to the ring at `radius` in the target's bearing
 * direction (Manta-style: a target far off the right sits on the HUD's right edge).
 */
export declare function hudTrace(viewer: Pose, target: Vec3, opts: HudTraceOptions): HudTrace;
/**
 * Where a contact lands on the HUD, in viewBox coords, given NORMALISED surface coords
 * (`u`,`v` = -1..1 across the HUD, +u right, +v **up**). Inside the surface → `tracked`;
 * outside → **pinned** to the ring along that bearing.
 *
 * Shared by BOTH HUD projections (the cockpit quad and the flat overlay) so the two can't
 * drift apart. Note SVG's +y is DOWN, hence the flip.
 */
export declare function hudPointFromUV(u: number, v: number, opts: {
    center: number;
    pinRadius: number;
}): {
    x: number;
    y: number;
    tracked: boolean;
};
/**
 * How opaque a radar trace's FILL is: nothing at 0, ramping to **50% white** at a full
 * `lockProgress`. That ramp is the *acquiring* cue — a contact solidifies while you hold
 * the nose on it, and drains back when it slips the acquisition cone (the radar's lock
 * decays, it isn't instant). Without it the pilot gets no signal at all until the lock
 * lands, and can't make the decision the mechanic exists to force: stay on him or break.
 *
 * **A positive lock is NOT more fill.** It turns the OUTLINE white, and the fill switches
 * from white to the FACTION colour — the two channels trade jobs, so the trace never stops
 * saying what it is (and a lockable *neutral* would stay legible). That's the renderer's
 * business (`hud.ts`); this function only vends the opacity, which tops out at 50% either
 * way. `locked` merely pins it full in case the progress value arrives short.
 *
 * Lock was first drawn as simply a denser fill (50% → 75%) and proved too subtle to tell
 * apart on a thin glyph in flight: it has to be a categorical change, not a darker shade.
 */
export declare function lockFillOpacity(lockProgress: number, locked?: boolean): number;
/**
 * The cockpit HUD is a real quad — a combiner glass. Given the EYE and the TARGET
 * expressed in that quad's LOCAL space (where the glass is the `z = 0` square spanning
 * ±`half`), return where the **eye→target ray crosses the glass**, as normalised -1..1
 * coords. Null when it can't: the ray runs parallel to the glass, or the crossing is
 * behind the eye.
 *
 * This is the whole trick behind the HUD: because it's plain geometry against the quad's
 * own frame, there's no projection matrix, no FOV and no handedness to get wrong — so it
 * CANNOT disagree with what the renderer draws through that glass. (The previous
 * approach re-derived the camera projection by hand and never lined up.)
 */
export declare function glassUV(eyeLocal: Vec3, targetLocal: Vec3, half: number): {
    u: number;
    v: number;
} | null;
export type HorizonTransform = {
    /** Vertical pixel offset for the pitch ladder (climb → ladder slides DOWN). */
    offsetY: number;
    /** Roll of the ladder in degrees (opposite the aircraft roll — the horizon stays level). */
    rollDeg: number;
};
/**
 * Pitch-ladder transform for the HUD horizon. The ladder is drawn as if painted on
 * the world horizon: pitching UP slides the rungs DOWN by `pxPerDeg` per degree, and
 * the whole ladder counter-rotates by the roll so the horizon reads level.
 */
export declare function horizonTransform(pitchDeg: number, rollDeg: number, pxPerDeg: number): HorizonTransform;
//# sourceMappingURL=hud-math.d.ts.map