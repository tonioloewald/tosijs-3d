import type { PointerKind } from './box.js';
export type CompassDial = SVGSVGElement & {
    /** Degrees clockwise from north (+Z) that the viewer is facing. */
    heading: number;
};
/**
 * A compass. `mode: 'needle'` (the default) turns the needle over a fixed
 * rose, so the captions stay upright and N means "ahead"; `'card'` turns the
 * rose and needle together, as a ship's compass card does.
 */
export declare function compassDial(config?: {
    size?: number;
    mode?: 'needle' | 'card';
}): CompassDial;
/** The speed bar's position (0…1) to a skybox `realtimeScale`. */
export declare function watchSpeedToScale(t: number): number;
/** A skybox `realtimeScale` to the speed bar's position (0…1). */
export declare function scaleToWatchSpeed(scale: number): number;
export type WatchDial = SVGSVGElement & {
    /** Time of day, hours (0…24). */
    time: number;
    /** Where the speed dot is, 0 (snail) … 1 (rabbit). */
    speed: number;
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    dispose: () => void;
};
/**
 * A watch: the time of day on the ring and how fast it passes on the bar.
 * Dragging either dot calls `handleTime(hours)` / `handleSpeed(t)`; setting
 * `time` or `speed` moves the dot without calling them.
 */
export declare function watchDial(config?: {
    time?: number;
    speed?: number;
    size?: number;
    handleTime?: (hours: number) => void;
    handleSpeed?: (t: number) => void;
}): WatchDial;
/** Anything with a scene whose active camera the compass follows. */
interface HasScene {
    scene?: {
        activeCamera?: {
            getDirection(v: unknown): {
                x: number;
                z: number;
            };
        } | null;
        onBeforeRenderObservable: {
            add(cb: () => void): unknown;
            remove(o: unknown): void;
        };
    } | null;
    whenReady?: (cb: () => void) => void;
}
/**
 * A compass that follows the scene's active camera, flat or in a headset:
 * north is +Z, as on a sphere terrain (`sphere-map`).
 */
export declare function sceneCompass(b3d: HasScene, config?: {
    size?: number;
    mode?: 'needle' | 'card';
}): CompassDial & {
    dispose: () => void;
};
/**
 * A watch bound to a skybox: the ring follows its `timeOfDay` (which the sky
 * advances itself), and dragging writes `timeOfDay` and `realtimeScale`.
 */
export declare function skyWatch(skybox: {
    timeOfDay: number;
    realtimeScale: number;
}, config?: {
    size?: number;
}): WatchDial;
export {};
//# sourceMappingURL=dials.d.ts.map