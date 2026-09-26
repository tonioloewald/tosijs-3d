import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { type StarSystemData } from './galaxy-data.js';
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
    x: number;
    y: number;
    z: number;
    owner: B3d | null;
    private rootNode;
    private starRadius;
    private starMesh;
    private coronaMesh;
    private starLight;
    private planetMeshes;
    private planetPhases;
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
    private buildPlanetRing;
    private buildOrbitLine;
    private update;
    /** Get the generated system data */
    getSystemData(): StarSystemData | null;
    /** Rebuild the entire system with current attributes */
    regenerate(): void;
    /** Set visibility of all meshes in the star system (0–1) */
    setVisibility(v: number): void;
    /** Update non-geometry options (animation, orbit visibility) */
    updateOptions(): void;
}
export declare const b3dStarSystem: import("tosijs").ElementCreator<B3dStarSystem>;
//# sourceMappingURL=b3d-star-system.d.ts.map