/** The pinned sky: never rebaked, so it is the same sky next year. */
export declare const PINNED_SKY_URL = "https://3d.tosijs.net/sky/0.8.4";
export interface SpaceBackdropOptions {
    /** Where the sun is: the skybox's `timeOfDay`. */
    timeOfDay?: number;
    /** A folder holding `nebula_*` and `stars_*`; default the pinned sky. */
    sky?: string;
    /** The galaxy's tilt, `x,y,z` degrees. */
    tilt?: string;
    /** More skybox attributes. */
    skybox?: Record<string, unknown>;
    /** Sun attributes, or `false` for none (a star system lights itself). */
    sun?: Record<string, unknown> | false;
}
/** A sun and an airless star sky, to spread into a `b3d(…)`. */
export declare function spaceBackdrop(opts?: SpaceBackdropOptions): HTMLElement[];
//# sourceMappingURL=space-backdrop.d.ts.map