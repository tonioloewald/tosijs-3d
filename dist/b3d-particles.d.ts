import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
export declare class B3dParticles extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        capacity: number;
        emitRate: number;
        minLifeTime: number;
        maxLifeTime: number;
        minSize: number;
        maxSize: number;
        minEmitPower: number;
        maxEmitPower: number;
        gravityX: number;
        gravityY: number;
        gravityZ: number;
        color1: string;
        color2: string;
        colorDead: string;
        blendMode: string;
        texture: string;
        emitterShape: string;
        emitterRadius: number;
        useSceneGravity: boolean;
        autoStart: boolean;
        targetStopDuration: number;
        disposeOnStop: boolean;
        attachTo: string;
    };
    x: number;
    y: number;
    z: number;
    capacity: number;
    emitRate: number;
    minLifeTime: number;
    maxLifeTime: number;
    minSize: number;
    maxSize: number;
    minEmitPower: number;
    maxEmitPower: number;
    gravityX: number;
    gravityY: number;
    gravityZ: number;
    color1: string;
    color2: string;
    colorDead: string;
    blendMode: string;
    texture: string;
    emitterShape: string;
    emitterRadius: number;
    useSceneGravity: boolean;
    autoStart: boolean;
    targetStopDuration: number;
    disposeOnStop: boolean;
    attachTo: string;
    owner: B3d | null;
    particleSystem: BABYLON.ParticleSystem | null;
    private _currentShape;
    private _currentRadius;
    content: () => string;
    private _started;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** Start emitting particles */
    start(): void;
    /** Stop emitting (existing particles fade out) */
    stop(): void;
    /** Emit a fixed number of particles as a one-shot burst */
    burst(count: number): void;
    /** Clear all active particles */
    reset(): void;
    private applySettings;
    private applyEmitterShape;
}
export declare const b3dParticles: import("tosijs").ElementCreator<B3dParticles>;
//# sourceMappingURL=b3d-particles.d.ts.map