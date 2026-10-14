import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { type StarSystemData } from './galaxy-data.js';
import { type SystemSpec } from './system-layout.js';
export declare class B3dStarSystem extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        galaxySeed: number;
        starCount: number;
        starIndex: number;
        /** A star's ADDRESS (`1234:bright:5021:0`) — wins over `starIndex` when set. */
        star: string;
        scale: number;
        orbitScale: number;
        animate: "on" | "off";
        showOrbits: "on" | "off";
        beltCount: number;
        maps: "on" | "off";
        x: number;
        y: number;
        z: number;
    };
    galaxySeed: number;
    starCount: number;
    starIndex: number;
    star: string;
    scale: number;
    orbitScale: number;
    /**
     * `'on'` | `'off'` — whether the planets orbit.
     *
     * Typed `any` ON PURPOSE. The name shadows `HTMLElement.animate` (a method),
     * and renaming the attribute would break markup. The source used to override
     * it with `@ts-expect-error`, but that directive does not survive into the
     * published `.d.ts`: every consumer compiling with `skipLibCheck` off got
     * TS2416 from OUR types (found by bin/smoke-consumer.ts, the publish flow's
     * consumer check). `any` is the one type assignable to both.
     */
    animate: any;
    showOrbits: 'on' | 'off';
    beltCount: number;
    maps: 'on' | 'off';
    /**
     * A system given as DATA (`SOL`, or your own `SystemSpec`) instead of a
     * star from the galaxy. Set it, then `regenerate()`.
     */
    system: SystemSpec | null;
    x: number;
    y: number;
    z: number;
    owner: B3d | null;
    private rootNode;
    private starRadius;
    private starMesh;
    private coronaMesh;
    private starLight;
    private planetEls;
    private holders;
    private moonPivots;
    private belt;
    private beltMeshes;
    private layout;
    private visibility;
    private orbitLines;
    private systemData;
    private registered;
    private _beforeRender;
    private time;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    private disposeMeshes;
    private registerShaders;
    private buildSystem;
    /** Planets are elements: put one in the scene and hang it on `holder` once it is built. */
    private adopt;
    private adoptRock;
    private buildBelt;
    /** Each planet at its place on its orbit for the current time. */
    private placePlanets;
    private buildOrbitLine;
    private update;
    /**
     * Every body you can look at: the star, then each planet, moon and named
     * asteroid, with the node that carries it (its world position is where it
     * is now) and its drawn radius. For a camera to follow one.
     */
    get bodies(): {
        name: string;
        node: BABYLON.TransformNode;
        radius: number;
    }[];
    /** Get the generated system data */
    getSystemData(): StarSystemData | null;
    /** Rebuild the entire system with current attributes */
    regenerate(): void;
    /** Set visibility of all meshes in the star system (0–1) */
    setVisibility(v: number): void;
    private applyVisibility;
    /** Update non-geometry options (animation, orbit visibility) */
    updateOptions(): void;
}
export declare const b3dStarSystem: import("tosijs").ElementCreator<B3dStarSystem>;
//# sourceMappingURL=b3d-star-system.d.ts.map