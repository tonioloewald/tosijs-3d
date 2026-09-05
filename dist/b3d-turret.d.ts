import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { type BallisticParams } from './ballistics.js';
import type { WarheadSpec } from './warhead.js';
export declare class B3dTurret extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        meshName: string;
        /**
         * Instantiate `meshName` from this LIBRARY instead of drawing the built-in
         * pedestal-and-box.
         *
         * A piece that IS a turret rendered as two primitives, because neither this
         * element nor `b3d-launcher` took a library (#34) while `b3d-destroyable`
         * and `b3d-aircraft` both did.
         *
         * Which node AIMS is declared by the MODEL, via the `_barrel` suffix —
         * the same way it already declares its colliders and its centre of gravity.
         * A model without one yaws as a unit, which is right for a simple turret
         * and means a placed model works before anyone rigs it.
         */
        library: string;
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
    library: string;
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
    private _stopLoad;
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