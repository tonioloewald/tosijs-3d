import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { type VatClip, type VatLayout } from './vertex-animation.js';
/** A baked animation set: the textures, their layout, and what is in them. */
export interface VatBake {
    layout: VatLayout;
    clips: VatClip[];
    position: BABYLON.RawTexture;
    normal: BABYLON.RawTexture;
    /** Bytes on the GPU — the number that decides whether this scales. */
    bytes: number;
}
/**
 * Write a bake into two float textures.
 *
 * `sample(vertexIndex, frame)` returns the position and normal for one vertex
 * of one frame; the caller decides where those come from — a procedural walk
 * here, a CPU-skinned GLB next.
 *
 * NEAREST sampling, and no mipmaps: a filtered VAT blends a vertex with its
 * NEIGHBOUR, which is a different vertex of the same figure, and the mesh comes
 * apart in a way that looks like bad weights rather than bad sampling.
 */
export declare function writeVatTextures(scene: BABYLON.Scene, layout: VatLayout, sample: (vertexIndex: number, frame: number) => {
    p: [number, number, number];
    n: [number, number, number];
}): {
    position: BABYLON.RawTexture;
    normal: BABYLON.RawTexture;
};
/**
 * Replay a bake in the vertex shader.
 *
 * Injected into the standard material so the figures are lit like everything
 * else — see the note above about a bench that skips lighting.
 */
export declare class VatPlugin extends BABYLON.MaterialPluginBase {
    bake: VatBake | null;
    /** Seconds, advanced by the owner. One uniform drives every figure. */
    time: number;
    /** `false` snaps to the nearest frame — the cheap path for a crowd. */
    interpolate: boolean;
    constructor(material: BABYLON.Material);
    private _on;
    get isEnabled(): boolean;
    set isEnabled(v: boolean);
    prepareDefines(defines: Record<string, unknown>): void;
    getAttributes(attributes: string[]): void;
    getSamplers(samplers: string[]): void;
    getUniforms(): {
        ubo: Array<{
            name: string;
            size: number;
            type: string;
        }>;
        vertex: string;
    };
    bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void;
    getClassName(): string;
    getCustomCode(shaderType: string): Record<string, string> | null;
}
/**
 * Build the figure mesh, and bake a walk for it.
 *
 * Returns the mesh with its `vatIndex` attribute already attached — the shader
 * needs to know which vertex it is, and WebGL1 has no `gl_VertexID`.
 */
export declare function buildBenchFigure(scene: BABYLON.Scene, bakeFps?: number): {
    mesh: BABYLON.Mesh;
    bake: VatBake;
};
/**
 * `<tosi-b3d-crowd>` — N vertex-animated figures in one draw call.
 *
 * The bench for "can we manage an army of 200 bipeds". Change `count` and watch
 * the WORST frame: an average hides the one that causes nausea.
 */
export declare class B3dCrowd extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        /** How many figures. */
        count: number;
        /** Metres across the field they scatter over. */
        spread: number;
        /** Frames baked per second of clip — the memory knob. */
        bakeFps: number;
        /** `'off'` snaps to the nearest frame. */
        interpolate: string;
        /**
         * How many SKINNED clones to spawn alongside, as the baseline.
         *
         * The comparison that decides the architecture: a real skinned GLB with its
         * own skeleton and `AnimationGroup` per instance, against the same count of
         * vertex-animated figures. `0` is off.
         */
        skinned: number;
        /** The GLB the baseline clones. Modest vertex count on purpose. */
        skinnedUrl: string;
    };
    count: number;
    spread: number;
    bakeFps: number;
    interpolate: string;
    skinned: number;
    skinnedUrl: string;
    private _mesh?;
    private _bake?;
    private _plugin?;
    private _obs;
    private _built;
    private _t;
    private _offDebug;
    private _worstMs;
    private _lastMs;
    private _frames;
    private _instr?;
    private _sceneInstr?;
    private _worstGpu;
    /** What the bake costs on the GPU, for the readout. */
    get bakeBytes(): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _skinnedRoots;
    private _skinnedBuilt;
    private _skinnedVerts;
    private _skinnedWant;
    private _skinnedNote;
    private _container;
    private _skinnedPrng;
    /**
     * Spawn N SKINNED clones — the baseline the whole question turns on.
     *
     * Each carries its own skeleton and `AnimationGroup`, which is what a
     * `b3d-biped` does and what the vertex-animated path deliberately does not.
     * The comparison is the point: if the ratio is small, "actors and crowd" is
     * an unnecessary boundary; if it is large, it is a real one.
     *
     * Loaded once and CLONED, so the measurement is of drawing and animating them
     * rather than of parsing a GLB N times.
     */
    private _buildSkinned;
    /**
     * Spawn a FEW skinned rigs per frame, never a batch.
     *
     * Instantiating one clones a skeleton and its animation groups, and doing
     * three hundred of them in a loop blocks the main thread for seconds — Tonio:
     * "dragging it to 320 hung everything". That hang is itself a finding about
     * the skinned path and it is also an unusable bench, so the work is spread
     * and the readout says how far it has got.
     */
    private _pumpSkinned;
    /**
     * Lay the crowd out and hand the GPU its per-instance state.
     *
     * Called only when the COUNT changes — never per frame. That is the whole
     * claim being measured: once built, the CPU does nothing per figure.
     */
    private _rebuild;
    sceneDispose(): void;
}
export declare const b3dCrowd: import("tosijs").ElementCreator<B3dCrowd>;
//# sourceMappingURL=b3d-crowd.d.ts.map