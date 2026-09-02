import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import { type BallisticParams } from './ballistics';
import type { WarheadSpec } from './warhead';
export declare class B3dTurret extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        meshName: string;
        muzzleSpeed: number;
        fireRate: number;
        range: number;
        traverseRate: number;
        smart: number;
        aimTolerance: number;
        gravity: number;
        drag: number;
        mass: number;
        damage: number;
        fullRadius: number;
        blastRadius: number;
        los: string;
        idleColor: string;
        armedColor: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    meshName: string;
    muzzleSpeed: number;
    fireRate: number;
    range: number;
    traverseRate: number;
    smart: number;
    aimTolerance: number;
    gravity: number;
    drag: number;
    mass: number;
    damage: number;
    fullRadius: number;
    blastRadius: number;
    los: string;
    idleColor: string;
    armedColor: string;
    private _barrel?;
    private _barrelMat?;
    private _aim;
    private _target?;
    private _lastTargetPos?;
    private _cooldown;
    private _armed;
    private _tick?;
    get warheadSpec(): WarheadSpec;
    get ballisticParams(): BallisticParams;
    /** True while the turret has a firing solution (in range + bearing). */
    get canBear(): boolean;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Track a mesh: the turret leads and fires on it while it's in range. */
    track(mesh: BABYLON.AbstractMesh): void;
    /** Stop tracking (barrel holds its last heading, goes idle). */
    clearTarget(): void;
    /** World-space muzzle point (barrel tip). */
    muzzle(): BABYLON.Vector3;
    private _update;
    private _fire;
    private _dist;
    sceneDispose(): void;
}
export declare const b3dTurret: (...args: unknown[]) => B3dTurret;
//# sourceMappingURL=b3d-turret.d.ts.map