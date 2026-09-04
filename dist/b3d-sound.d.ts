import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
export declare class B3dSound extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        url: string;
        volume: number;
        loop: boolean;
        autoplay: boolean;
        spatialSound: boolean;
        x: number;
        y: number;
        z: number;
        refDistance: number;
        rolloffFactor: number;
        maxDistance: number;
        distanceModel: string;
        attachTo: string;
        playbackRate: number;
    };
    url: string;
    volume: number;
    loop: boolean;
    autoplay: boolean;
    spatialSound: boolean;
    x: number;
    y: number;
    z: number;
    refDistance: number;
    rolloffFactor: number;
    maxDistance: number;
    distanceModel: string;
    attachTo: string;
    playbackRate: number;
    owner: B3d | null;
    sound: BABYLON.Sound | null;
    content: () => string;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** Start playback */
    play(): void;
    /** Stop playback */
    stop(): void;
    /** Pause playback */
    pause(): void;
    /** Whether the sound is currently playing */
    get isPlaying(): boolean;
}
export declare const b3dSound: import("tosijs").ElementCreator<B3dSound>;
//# sourceMappingURL=b3d-sound.d.ts.map