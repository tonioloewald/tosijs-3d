export interface PlaygroundOptions {
    /** Metres across. The default is a field you can cross in about ten seconds. */
    size?: number;
    /** Include the sun, sky and ambient light. `false` to light it yourself. */
    lighting?: boolean;
    /** How many destroyable targets to scatter. `0` for a peaceful arena. */
    targets?: number;
    /** Hour of the day for the skybox — low sun makes the cover read. */
    timeOfDay?: number;
}
/**
 * The arena, as scene children.
 *
 * Returns an array to be spread, so the caller keeps control of ordering and
 * can add or drop pieces — which is the whole reason this is not a component.
 */
export declare function playground(options?: PlaygroundOptions): HTMLElement[];
//# sourceMappingURL=playground.d.ts.map