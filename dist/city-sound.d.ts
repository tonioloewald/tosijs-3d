import * as BABYLON from '@babylonjs/core';
import type { Traffic } from './city-traffic.js';
import type { VirtualLight } from './light-pool.js';
/** A street light, as the city keeps it: where it is and whether it flickers. */
export interface SoundingLamp extends VirtualLight {
    /** Non-zero: a failing lamp. */
    seed: number;
}
export declare class CitySound {
    private engines;
    private hums;
    private horns;
    private clock;
    /** Call every frame. `origin` is the city root's position (traffic is in the city's frame). */
    update(scene: BABYLON.Scene, dt: number, traffic: Traffic | null, lamps: SoundingLamp[], origin: BABYLON.Vector3): void;
    dispose(): void;
}
//# sourceMappingURL=city-sound.d.ts.map