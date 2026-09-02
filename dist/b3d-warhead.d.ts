import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import { type WarheadSpec } from './warhead';
export declare class B3dWarhead extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        damage: number;
        fullRadius: number;
        blastRadius: number;
        los: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    damage: number;
    fullRadius: number;
    blastRadius: number;
    los: string;
    get spec(): WarheadSpec;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /**
     * Detonate at `center` (default: this element's `x/y/z`). Resolves the AOE over
     * every b3d-destroyable in the scene (LOS-gated when `los` is on), applies the
     * falloff damage, and spawns an expanding flash.
     */
    detonate(center?: BABYLON.Vector3): void;
}
export declare const b3dWarhead: (...args: unknown[]) => B3dWarhead;
/**
 * Resolve + apply an AOE blast over the scene's destroyables (LOS-gated when
 * `useLos`) and spawn a flash. Shared by `<tosi-b3d-warhead>` and by projectiles /
 * bombs, which fire a warhead on impact.
 */
export declare function detonateWarhead(owner: B3d, center: BABYLON.Vector3, spec: WarheadSpec, useLos?: boolean): void;
/**
 * The fireball, on its own — an expanding, fading emissive sphere. Exported because a
 * detonation isn't the only thing that explodes: an aircraft flying into a hill wants the
 * same visual without any of the AOE damage machinery behind it (see `b3d-death`).
 */
export declare function explosionFx(scene: BABYLON.Scene, center: BABYLON.Vector3, blastRadius: number): void;
//# sourceMappingURL=b3d-warhead.d.ts.map