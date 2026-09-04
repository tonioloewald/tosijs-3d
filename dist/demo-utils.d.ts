import * as BABYLON from '@babylonjs/core';
/** The `<tosi-b3d>` element an example receives as `el` — just the parts these touch. */
export type DemoHost = {
    scene: BABYLON.Scene;
    setActiveCamera(camera: BABYLON.Camera): void;
    querySelector(selector: string): Element | null;
    register?(additions: {
        meshes?: BABYLON.AbstractMesh[];
    }): void;
};
export interface DemoSunOptions {
    intensity?: number;
    /** `0` (default) = the device-tier budget. Set a size only to override it. */
    shadowTextureSize?: number;
    shadowCascading?: boolean;
    shadowMaxZ?: number;
    y?: number;
}
/**
 * A sun that CASTS shadows — the "when in doubt, add a shadow light" default.
 *
 * `shadowTextureSize` defaults to the **auto sentinel `0`**, not a hard-wired
 * 2048. A fixed size overrode the device-tier budget for every demo including
 * on a headset, which is 4× the shadow VRAM on the tier least able to pay it.
 * Acne is handled by `shadowNormalBias` instead, which costs nothing.
 */
export declare function demoSun(opts?: DemoSunOptions): import("./b3d-shadows.js").B3dSun;
export interface PatternGroundOptions {
    size?: number;
    tiles?: number;
    color?: string;
    /**
     * Texture URL. Omitted = a generated checker, which needs no asset and so
     * works in any project. (This replaces the old `pattern: boolean`, which
     * pointed at a file that exists only on the doc site.)
     */
    texture?: string;
}
/**
 * A ground that RECEIVES shadows. A test pattern reads the light far better
 * than a flat colour — a flat ground hides the lighting, the shadows and the UV
 * mapping at once, which is how a scene ends up looking broken when it is
 * merely bland.
 */
export declare function patternGround(opts?: PatternGroundOptions): import("./b3d-primitives.js").B3dGround;
export interface DemoStageOptions extends PatternGroundOptions {
    timeOfDay?: number;
    sun?: DemoSunOptions;
    /** Hemispheric fill. `0` turns it off for a hard, airless look. */
    fill?: number;
}
/**
 * The whole "make it not look like a test harness" setup in one spread: a sun
 * that casts, a sky to light and reflect, and a ground that shows both.
 *
 * ```js
 * b3d({ ... }, ...demoStage({ texture: '/my-grid.png' }), myThing)
 * ```
 *
 * The fill light is not optional-by-taste: a directional sun alone leaves every
 * unlit face at ZERO, so objects read as black silhouettes rather than objects.
 * Real outdoor light has sky bounce; a hemispheric light is the cheap stand-in.
 */
export declare function demoStage(opts?: DemoStageOptions): (import("./b3d-primitives.js").B3dGround | import("./b3d-shadows.js").B3dSun | import("./b3d-skybox.js").B3dSkybox | import("./b3d-light.js").B3dLight)[];
export interface OrbitCamOptions {
    /** Orbit angle around Y, in DEGREES. Default −90 (facing −Z). */
    alphaDeg?: number;
    /** Tilt from vertical, in DEGREES. Default 60. */
    betaDeg?: number;
    radius?: number;
    target?: [number, number, number];
    /** Keep the camera at least this far above horizontal. `null` opts out. */
    minElevationDeg?: number | null;
    /** Stop it going exactly top-down. `null` opts out. */
    maxElevationDeg?: number | null;
    /** @deprecated pre-0.7.1 radians — use `alphaDeg`. Converted if given. */
    alpha?: number;
    /** @deprecated pre-0.7.1 radians — use `betaDeg`. Converted if given. */
    beta?: number;
}
/**
 * The standard `ArcRotateCamera` every demo sets up — one call instead of six
 * lines. Call it in `sceneCreated`.
 *
 * Clamps the tilt by DEFAULT so you cannot drag the view below the horizon and
 * see the world from underneath (an `ArcRotateCamera` happily orbits under the
 * floor otherwise — a long-standing demo papercut).
 *
 * **Degrees**, per the framework rule that a bare angle name is already
 * degrees. The old radian `alpha`/`beta` are still accepted and converted, so
 * existing snippets keep working; they are the one place in this module where
 * radians appear at all.
 */
export declare function orbitCam(el: DemoHost, opts?: OrbitCamOptions): BABYLON.ArcRotateCamera;
export interface SpinnerOptions {
    size?: number;
    x?: number;
    y?: number;
    z?: number;
    /** Revolutions per second. */
    spin?: number;
    /** Texture URL. Omitted = an untextured box. */
    texture?: string;
}
/**
 * A slowly-rotating box — the "non-static object so you can see the shadow
 * move" prop. Registers itself as a shadow caster so `demoSun`/`b3dSun` picks
 * it up. Call in `sceneCreated`.
 */
export declare function spinner(el: DemoHost, opts?: SpinnerOptions): BABYLON.Mesh;
export interface FlightStageOptions {
    /**
     * Builds a FRESH aircraft. A factory, not an instance — respawn has to
     * construct a new one, and a demo that passed an instance was unrecoverable
     * after the first crash.
     */
    plane: () => any;
    /** Ground extent. Default 4000 — an aircraft needs somewhere to go. */
    size?: number;
    timeOfDay?: number;
    /** GLB holding the vehicle library, if the plane uses `library:`. */
    library?: string;
    libraryType?: string;
    /** Distance fog. `false` for a hard, airless look. */
    fog?: boolean;
    groundColor?: string;
    /** Heading on the death panel. */
    title?: string;
}
/**
 * A setting an aircraft can actually operate in — the flight equivalent of
 * {@link demoStage}, and the fix for three demos that each forgot a different
 * piece of it.
 *
 * What it includes, and why each is here rather than left to the caller:
 *
 * - **A `b3dDeath` with a working respawn.** Without one, `crash()` releases
 *   input focus and leaves you holding nothing — no wreck to fly, no panel, no
 *   way back. That reads as the demo seizing up rather than as dying, and it is
 *   why `plane` is a factory.
 * - **A sun configured for the ground it lights.** A 4000-unit ground with the
 *   default single shadow map puts the aircraft's shadow in a coarse far
 *   cascade where it is invisible, and `shadowMaxZ` at its default of 100 drops
 *   shadows entirely once you climb.
 * - **Ground, sky and fog at flight scale**, which every flight demo otherwise
 *   retypes slightly differently.
 *
 * Returns an object rather than an array (unlike `demoStage`) because the stage
 * owns an IDENTITY: the current aircraft changes on respawn, so a readout that
 * captured the first one would go stale.
 *
 * ```js
 * const stage = flightStage({
 *   plane: () => b3dAircraft({ library: 'vehicles', meshName: 'scout', player: true, y: 40 }),
 *   library: '/test-3.glb',
 * })
 * const scene = b3d({ gamepad: true }, ...stage.elements)
 * // stage.aircraft is always the one you are flying NOW
 * ```
 */
export declare function flightStage(opts: FlightStageOptions): {
    elements: (import("./b3d-primitives.js").B3dGround | import("./b3d-input-focus.js").B3dInputFocus | import("./b3d-death.js").B3dDeath | import("./b3d-shadows.js").B3dSun | import("./b3d-skybox.js").B3dSkybox | import("./b3d-fog.js").B3dFog | import("./b3d-library.js").B3dLibrary | import("./b3d-light.js").B3dLight)[];
    /** The aircraft you are flying NOW — changes on respawn. */
    readonly aircraft: any;
};
//# sourceMappingURL=demo-utils.d.ts.map