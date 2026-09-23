export interface RocketAscentOptions {
    cloudAltitude?: number;
    spaceStart?: number;
    spaceFull?: number;
    apogee?: number;
    accel?: number;
    holdSeconds?: number;
    starfield?: number;
    nebulae?: number;
    timeOfDay?: number;
    rocketScale?: number;
}
/**
 * The ascent, as scene children.
 *
 * Returns an array to be spread — same contract as `playground()`, and for the
 * same reason: the caller keeps control of ordering and can swap pieces out.
 */
export declare function rocketAscent(options?: RocketAscentOptions): HTMLElement[];
//# sourceMappingURL=rocket-ascent.d.ts.map