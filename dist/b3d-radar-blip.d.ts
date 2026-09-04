import type * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d, RadarBlip, RadarFaction } from './tosi-b3d.js';
/** Structural view of whatever element/mesh we might read a world position from. */
type PosLike = {
    x: number;
    y: number;
    z: number;
};
export declare class B3dRadarBlip extends B3dChild implements RadarBlip {
    static preferredTagName: string;
    static initAttributes: {
        profile: number;
        faction: RadarFaction;
        x: number;
        y: number;
        z: number;
    };
    profile: number;
    faction: RadarFaction;
    x: number;
    y: number;
    z: number;
    private _host;
    private _pos;
    private _onShift;
    get radarProfile(): number;
    /** Live world position: the followed mesh's, or our own (origin-corrected). */
    radarPosition(): PosLike | null;
    /** The followed target's mesh (for a homing missile to chase), or null when
     * standalone/positional (a waypoint) — a missile fired at it goes ballistic. */
    radarMesh(): BABYLON.AbstractMesh | null;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dRadarBlip: (...args: unknown[]) => B3dRadarBlip;
export {};
//# sourceMappingURL=b3d-radar-blip.d.ts.map