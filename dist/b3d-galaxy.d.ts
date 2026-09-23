import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { type StarData, type GalaxyData, type StarSystemData } from './galaxy-data.js';
export declare class B3dGalaxy extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        seed: number;
        starCount: number;
        radius: number;
        spiralArms: number;
        spiralAngle: number;
        thickness: number;
        particleSize: number;
        coreSize: number;
        distantGalaxies: number;
        distantStars: number;
        maxStarApparentSize: number;
    };
    seed: number;
    starCount: number;
    radius: number;
    spiralArms: number;
    spiralAngle: number;
    thickness: number;
    particleSize: number;
    coreSize: number;
    distantGalaxies: number;
    distantStars: number;
    maxStarApparentSize: number;
    owner: B3d | null;
    private rootNode;
    private starSps;
    private starMesh;
    private nebulaSps;
    private nebulaMesh;
    private blackHoleEl;
    private galaxyData;
    private originalColors;
    private registered;
    private _beforeRender;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /**
     * Point every particle at THE CAMERA POSITION — a fixed world point, rather
     * than at the camera's view plane.
     *
     * ⚠️ THIS IS WHAT MAKES A CUBE BAKE WORK. `SolidParticleSystem.billboard`
     * aligns quads to the camera's VIEW PLANE, which is a different plane for
     * each of a cube's six faces — so every star and nebula silently re-orients
     * between captures, and the faces disagree at their seams.
     *
     * A cube map is ONE viewpoint photographed six ways. All six share a camera
     * POSITION and differ only in rotation, so that position is what the
     * particles should face: do it once, and every face sees each nebula from the
     * same angle and as the same shape.
     *
     * ⚠️ NOT the galactic centre. This was first written as `faceOrigin`, which
     * named the wrong thing even though the argument was right — Tonio: "No
     * faceorigin is wrong. Face the camera position." The observer is 55% of the
     * way out from the core, so facing the core would tilt every particle away
     * from the viewer by a different amount depending where it sits.
     *
     * Pass `null` to hand orientation back to the live camera.
     */
    facePoint(target: BABYLON.Vector3 | null): void;
    private update;
    private disposeMeshes;
    private registerShaders;
    private createShaderMaterial;
    private buildGalaxy;
    private buildBlackHole;
    /** Get star data at the given index */
    getStarAt(index: number): StarData | null;
    /** Get full star system (star + planets) at the given index */
    getStarSystem(index: number): StarSystemData | null;
    /** Get the galaxy data */
    getGalaxyData(): GalaxyData | null;
    /** Get the star SPS for external picking */
    getStarSPS(): BABYLON.SolidParticleSystem | null;
    /** Get the star SPS mesh for pick comparison */
    getStarMesh(): BABYLON.Mesh | null;
    /**
     * The DISTANT STAR particles, for the skybox baker — the tail of the star
     * SPS, in the same order `generateGalaxy` made them (see the note in
     * `galaxy-data`).
     */
    getDistantStarParticles(): BABYLON.SolidParticle[];
    /**
     * The DISTANT GALAXY particles, for the skybox baker.
     *
     * They live inside the nebula SPS (appended last, in generation order — see
     * the note in `galaxy-data`), so the only code that knows which particles
     * they are without guessing by size or colour is the code next to the build.
     * That is here: the last `distantGalaxies.length` particles, in the SPS's
     * own (Babylon) frame — which is the frame a baker photographs in.
     */
    getDistantGalaxyParticles(): BABYLON.SolidParticle[];
    /** Hide a star particle (e.g. to replace it with a star system) */
    hideStarAt(index: number): void;
    /** Show a previously hidden star particle */
    showStarAt(index: number): void;
    /** Get the world position of a star particle */
    getStarPosition(index: number): BABYLON.Vector3 | null;
    /** Filter stars: dim those that don't match criteria */
    filterStars(options?: {
        maxHI?: number;
        nameSearch?: string;
    }): void;
    /** Set visibility of the entire galaxy (0-1) */
    setVisibility(v: number): void;
    /** Rebuild the entire galaxy with current attributes */
    regenerate(): void;
}
export declare const b3dGalaxy: import("tosijs").ElementCreator<B3dGalaxy>;
//# sourceMappingURL=b3d-galaxy.d.ts.map