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