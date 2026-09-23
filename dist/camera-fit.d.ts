export interface FitOptions {
    /** Never closer than this, however blocked. */
    min?: number;
    /**
     * Space left between the camera and whatever it backed into.
     *
     * It has to clear the near plane, or the wall the camera is avoiding gets
     * sliced open and you see through it — the failure that looks like the
     * correction is not working at all when in fact it is working and stopping a
     * hair too late.
     */
    margin?: number;
}
/**
 * How far back the camera may sit, given what a ray from the subject hit.
 *
 * `hit` is the distance to the obstruction, or `Infinity` for a clear view.
 * Returns the desired distance when nothing is in the way, and otherwise the
 * largest distance that keeps the camera in front of it.
 */
export declare function fitDistance(desired: number, hit: number, options?: FitOptions): number;
export interface EaseOptions {
    /**
     * Seconds to close the gap when moving IN. **`0` (the default) SNAPS.**
     *
     * The first version of this eased inward over 0.05s, which sounds immediate
     * and is not: at 60Hz that is 28% of the gap in the first frame, so the
     * camera is still most of the way inside the wall for two or three frames.
     * The test caught it, and it caught the module disagreeing with its own
     * heading — "snap IN, ease OUT" was the design and 0.05 was not a snap.
     */
    inSeconds?: number;
    /** Seconds when moving OUT. Larger: this is where flicker becomes pumping. */
    outSeconds?: number;
}
/**
 * Move a distance toward its target, fast inward and slow outward.
 *
 * Frame-rate independent in the `1 - exp(-t/τ)` sense rather than `k·dt`, which
 * is the form that made the VR chase camera behave differently at 72 and 90Hz.
 */
export declare function easeDistance(current: number, target: number, dt: number, options?: EaseOptions): number;
export interface Band {
    /** Bottom of the forbidden band, in world Y. */
    low: number;
    /** Top of it. */
    high: number;
}
/**
 * Push a camera height clear of a band, to the side the SUBJECT is on.
 *
 * The Manta flip as a constraint. Which side matters: choosing the nearer edge
 * would send the camera across the surface every time the character bobbed
 * through it, and a camera that crosses on its own is worse than one that sits
 * in the wrong medium.
 *
 * A subject inside the band is the genuinely ambiguous case — treading water,
 * exactly at the line. It resolves DOWNWARD, because a swimmer at the surface
 * is a swimmer: the interesting half of their world is below them, and that is
 * the half the camera should be in.
 */
export declare function clearOfBand(y: number, subjectY: number, band: Band, margin?: number): number;
/**
 * When there is nowhere safe to stand, STOP STANDING SOMEWHERE.
 *
 * Tonio: *"Worst case we force first person when we can't place the camera
 * safely."* Which is what every third-person camera that works does, and the
 * alternative is the two failures everyone has seen: the camera jammed inside a
 * wall showing the inside of the world, or jammed against the character's back
 * showing a shoulder blade.
 *
 * Hysteresis, for the same reason `isSwimming` and `inShelter` have it: a
 * doorway is exactly where the ray flickers, and a camera alternating between
 * first and third person at 60Hz is the worst outcome available — worse than
 * either state, and much worse in a headset.
 *
 * `enter` is tight and `leave` is loose: go first-person as soon as the third-
 * person position is untenable, and come back out only once there is real room,
 * not once there is barely room.
 */
export declare function forceFirstPerson(hit: number, wasFirstPerson?: boolean, enter?: number, leave?: number): boolean;
export interface ChaseFit {
    /** Distance behind the subject. */
    distance: number;
    /** Height above it. */
    height: number;
    /**
     * There is no safe third-person position — the caller should switch to a
     * first-person view rather than put the camera somewhere embarrassing.
     */
    firstPerson: boolean;
}
/**
 * The whole correction, in the order the corrections have to happen.
 *
 * Distance first, because a nearer camera changes where the height constraint
 * applies; then the floor, which is the cheap always-correct half; then the
 * band, LAST, because it is the one that must survive everything else — a
 * camera pushed out of the water by the band rule and then dropped back into it
 * by a floor clamp is exactly the flicker this is meant to remove.
 */
export declare function fitChase(desired: {
    distance: number;
    height: number;
}, state: {
    distance: number;
    firstPerson?: boolean;
}, input: {
    hit?: number;
    dt: number;
    subjectY: number;
    groundY?: number;
    band?: Band | null;
}, options?: FitOptions & EaseOptions & {
    minHeight?: number;
    firstPersonAt?: number;
    firstPersonLeave?: number;
}): ChaseFit;
//# sourceMappingURL=camera-fit.d.ts.map