import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
/**
 * The material a primitive gets, from its attributes.
 *
 * `mirror` picks a polished PBR metal, everything else a StandardMaterial —
 * and either way `glow` applies. This was written out twice, identically, in
 * B3dSphere and B3dBox, which is how the sphere came to be missing `glow`
 * about ninety seconds after the box got it: the same code in two places
 * disagrees the first time you touch one of them.
 *
 * On glow: `emissiveColor` is what it means to a StandardMaterial — colour
 * added regardless of the lighting, so the surface reads as lit from within
 * rather than merely pale. The parent's `glowLayerIntensity` is what makes it
 * BLEED past the silhouette; the two are separate, and a glow with no glow
 * layer is a common "why isn't this glowing" (it is, it just isn't blooming).
 */
export declare const primitiveMaterial: (meshName: string, scene: BABYLON.Scene, attrs: {
    mirror?: boolean;
    color: string;
    glow?: number;
    glowColor?: string;
}) => BABYLON.Material;
export declare class B3dSphere extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        segments: number;
        diameter: number;
        color: string;
        /**
         * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
         * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
         * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
         * just doesn't bleed past its edges.
         *
         * `glowColor` overrides the hue, so a dull red box can throw yellow light.
         */
        glow: number;
        glowColor: string;
        mirror: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
}
export declare const b3dSphere: import("tosijs").ElementCreator<B3dSphere>;
export declare class B3dBox extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        size: number;
        width: number;
        height: number;
        depth: number;
        color: string;
        mirror: boolean;
        /**
         * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
         * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
         * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
         * just doesn't bleed past its edges.
         *
         * `glowColor` overrides the hue, so a dull red box can throw yellow light.
         */
        glow: number;
        glowColor: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
}
export declare const b3dBox: import("tosijs").ElementCreator<B3dBox>;
export declare class B3dGround extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        size: number;
        width: number;
        height: number;
        color: string;
        texture: string;
        textureTiles: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
}
export declare const b3dGround: import("tosijs").ElementCreator<B3dGround>;
//# sourceMappingURL=b3d-primitives.d.ts.map