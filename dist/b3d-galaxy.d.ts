import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { type StarData, type GalaxyData, type StarSystemData } from './galaxy-data.js';
/**
 * A particle as the baker and the picker see it. The field names are the
 * `SolidParticle` subset those consumers always read (`scaling`, not
 * `scale`), so code written against the old particle system still reads it.
 */
export interface GalaxyPoint {
    /** Centre, in the mesh's own (Babylon, y-up) frame. */
    position: BABYLON.Vector3;
    /** The authored size multiplier — the quad is `particleSize × scaling.x`. */
    scaling: {
        x: number;
    };
    color: BABYLON.Color4;
}
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
    private starQuads;
    private starMesh;
    private nebulaQuads;
    private nebulaMesh;
    /** The fixed viewpoint set by `facePoint`, or null to follow the camera. */
    private faceTarget;
    private blackHoleEl;
    private galaxyData;
    private originalColors;
    private registered;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /**
     * Face every particle at a FIXED world point instead of the live camera, and
     * clamp star sizes as seen from it. `null` hands orientation back to the
     * camera.
     *
     * The particles always face the viewpoint's POSITION — the vertex shader
     * does that (see `registerShaders`) — so a cube bake's six faces, which share
     * a position and differ only in rotation, already agree at their seams
     * without this. What a fixed point adds is the APPARENT-SIZE CLAMP
     * (`maxStarApparentSize`), which only means something from one known
     * viewpoint, and a guarantee that nothing between captures can move it.
     *
     * ⚠️ NOT the galactic centre. This was first written as `faceOrigin`, which
     * named the wrong thing even though the argument was right — Tonio: "No
     * faceorigin is wrong. Face the camera position." The observer is 55% of the
     * way out from the core, so facing the core would tilt every particle away
     * from the viewer by a different amount depending where it sits.
     *
     * (This used to write a rotation into every particle on the CPU, alongside
     * Babylon's own per-frame billboarding — two mechanisms that COMPOSED rather
     * than replaced each other, which is how a restore once left every star a
     * vertical smear. One uniform cannot stack with anything.)
     */
    facePoint(target: BABYLON.Vector3 | null): void;
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
    /**
     * @deprecated There is no particle system any more — stars are billboarded
     * in the vertex shader. Use {@link pickStar} to pick. Returns null; removed
     * in 0.9.
     */
    getStarSPS(): null;
    /** The star mesh — hide it, fade it, or compare against it. */
    getStarMesh(): BABYLON.Mesh | null;
    /**
     * Every point in the star mesh — the disc stars in generation order, then
     * the distant stars — in the mesh's own (Babylon) frame.
     */
    getStarPoints(): GalaxyPoint[];
    /**
     * The star under a screen point, or `-1`.
     *
     * ⚠️ NOT `scene.pick`. The mesh's CPU geometry is every quad collapsed to its
     * centre — the corners only exist in the vertex shader — so a triangle pick
     * finds nothing. This casts the pick ray and takes the NEAREST star whose
     * drawn disc it passes through, with a few pixels of slack so a star a
     * pixel wide is still clickable (the old quad pick was not that kind).
     */
    pickStar(x: number, y: number, camera?: BABYLON.Camera | null): number;
    /**
     * The DISTANT STAR points, for the skybox baker — the tail of the star
     * mesh, in the same order `generateGalaxy` made them.
     */
    getDistantStarParticles(): GalaxyPoint[];
    /**
     * The DISTANT GALAXY points, for the skybox baker.
     *
     * They live inside the nebula mesh (appended last, in generation order — see
     * the note in `galaxy-data`), so the only code that knows which points they
     * are without guessing by size or colour is the code next to the build.
     * That is here: the last `distantGalaxies.length` points, in the mesh's
     * own (Babylon) frame — which is the frame a baker photographs in.
     */
    getDistantGalaxyParticles(): GalaxyPoint[];
    private isStarIndex;
    /** Hide a star (e.g. to replace it with a star system) */
    hideStarAt(index: number): void;
    /** Show a previously hidden star */
    showStarAt(index: number): void;
    /** Get the world position of a star */
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