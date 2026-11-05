import * as BABYLON from '@babylonjs/core';
export interface VirtualLight {
    /** World position, read every frame (keep it current, or give a getter). */
    position: BABYLON.Vector3;
    /** A spot's direction (world). Absent: a point light. */
    direction?: BABYLON.Vector3;
    /** A spot's cone, radians. */
    angle?: number;
    color: BABYLON.Color3;
    /** At full strength. */
    intensity: number;
    /** Metres. */
    range: number;
    /** 0..1, the owner's dimmer (night, a switch, a dying battery). */
    level: number;
    /**
     * 0..1, a flicker on the output only: a flickering lamp keeps its place in
     * the ranking, or it would lose its light every time it went dark.
     */
    flicker?: number;
    /** A spot's falloff across its cone (Babylon's `exponent`). Default 2. */
    exponent?: number;
    /**
     * How much it matters, as a multiplier on its ranking (not its brightness).
     * Default 1. Lower it for many lights that would otherwise crowd the rest
     * out: two dozen passing cars' headlights left no street light lit.
     */
    weight?: number;
}
/**
 * How much a lamp matters to what the viewer sees. Not how bright it is AT the
 * viewer: a street light lights the road you are looking at from fifty metres
 * away. So strength falls off softly with distance in ranges (no cutoff), and
 * lamps ahead count more than lamps behind (`ahead`, the cosine between the
 * view and the lamp).
 */
export declare function poolScore(l: {
    intensity: number;
    range: number;
    distance: number;
    ahead: number;
}): number;
/** The scene's lamp pool, made on first use. */
export declare function lightPool(scene: BABYLON.Scene): LightPool;
export declare class LightPool {
    private scene;
    private lights;
    private points;
    private spots;
    private observer;
    private lastObserver;
    private materialObserver;
    /**
     * CLUSTERED: where the device has it (WebGL2 with float blending, or
     * WebGPU), every lamp is a real light in one `ClusteredLightContainer`, which
     * sorts them into screen tiles by their range, so a pixel pays only for the
     * lamps that reach it. There a lamp's falloff IS its cost, and a city's
     * hundred street lights are all lit. Elsewhere, the ranked pool below.
     */
    private cluster;
    private raise;
    private raised;
    private sweep;
    private clustered;
    constructor(scene: BABYLON.Scene);
    add(light: VirtualLight): () => void;
    /** How many lamps are registered, how many have a real light now, and whether they are clustered. */
    get stats(): {
        lamps: number;
        lit: number;
        clustered: boolean;
    };
    private makeLight;
    /** Clustered lighting, if this device has it (and is not on the lowest budget). */
    private tryCluster;
    private start;
    private slot;
    private sweepMaterials;
    private update;
    dispose(): void;
}
/**
 * How much daylight the scene has, 0 to 1: its sky's `daylight`, or full day
 * when it has no sky.
 */
export declare function sceneDaylight(owner: Element | null | undefined): number;
/**
 * How fast the scene's sky runs against real time: its skybox's
 * `realtimeScale`, never less than 1. Weather drifts and evolves at this rate,
 * so a sky sped up to a time-lapse carries its clouds with it; a stopped sky
 * (`realtimeScale` 0, the default) leaves the weather in real time.
 */
export declare function skyRate(owner: Element | null | undefined): number;
/** A lamp's level for the daylight: off by day, up through dusk, full at night. */
export declare function lampLevel(daylight: number): number;
/**
 * A failing lamp's flicker at `seconds`, 0..1: steady most of the time, then
 * a spell of stutter (a couple of seconds in five), each lamp to its own
 * `seed`. Pure, so the same lamp stutters the same way in a replay.
 */
export declare function lampFlicker(seconds: number, seed: number): number;
//# sourceMappingURL=light-pool.d.ts.map