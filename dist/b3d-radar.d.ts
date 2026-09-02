import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { RadarTrack } from './radar';
import type { B3d, RadarBlip } from './tosi-b3d';
export declare class B3dRadar extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        range: number;
        coneDeg: number;
        lockTime: number;
        maxLocks: number;
        acquireConeDeg: number;
        acquireRange: number;
        alignment: string;
        updateInterval: number;
    };
    range: number;
    coneDeg: number;
    lockTime: number;
    maxLocks: number;
    acquireConeDeg: number;
    acquireRange: number;
    alignment: string;
    updateInterval: number;
    private _radar;
    private _host;
    private _fwd;
    private _acc;
    private static _phase;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** The world node of the platform we're nested in (skipping the tosijs slot). */
    private _resolveHost;
    private _tick;
    /** This platform's tracks (detected blips + lock state), nearest first. */
    get tracks(): RadarTrack<RadarBlip>[];
    /** The nearest full lock, or null. */
    get nearestLock(): RadarTrack<RadarBlip> | null;
    /** The mesh a missile should chase for the nearest lock, or null (⇒ ballistic). */
    nearestLockMesh(): BABYLON.AbstractMesh | null;
    sceneDispose(): void;
}
export declare const b3dRadar: (...args: unknown[]) => B3dRadar;
//# sourceMappingURL=b3d-radar.d.ts.map