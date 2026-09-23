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
 * The four clips, which are chosen to be told apart at a HUNDRED METRES.
 *
 * That is the only test that matters for a crowd, and it rules out most of what
 * would read as variety up close. An idle fails it — a figure shifting its
 * weight and a figure walking slowly are the same silhouette from far enough
 * away, so a quarter of the field was doing something nobody could see. What
 * survives the distance is gross limb position: legs striding, an arm above the
 * head, both arms up, a body leaving the ground.
 */
export type CrowdClip = 'walk' | 'wave' | 'dance' | 'jump';
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
 * Bake a REAL rigged GLB into a VAT — the intermediate rung.
 *
 * Tonio: *"Can we do an intermediate version where we use vertex animation to
 * animate the omnidude mesh, or is that impractical?"* It is entirely
 * practical, and it is the rung that matters: the blocky bench figure proves
 * the mechanism, a `b3d-biped` is the fully-articulated top end, and this is
 * the same character as the biped, drawn by the crowd path.
 *
 * The trick is that Babylon will CPU-skin a mesh for you. `applySkeleton`
 * writes the posed vertices into the mesh's own buffers, so a bake is: put the
 * animation at a frame, ask the skeleton to compute its matrices, apply it,
 * read the positions back. Sixteen clips of omnidude is a few megabytes, and
 * after it is baked there is no skeleton, no animation group and no per-figure
 * CPU work left — which is the entire point.
 *
 * What it costs is the seam. A baked figure cannot be retargeted, cannot blend
 * to a clip that was not baked, and has no bones to hang a sword from (see
 * `vertex-animation`'s `SocketLayout` for the answer to that one). Promoting a
 * figure to a named character means crossing back to a skinned rig, and that
 * crossing should be designed rather than discovered.
 */
export declare function bakeGlbFigure(scene: BABYLON.Scene, url: string, options?: {
    clips?: readonly string[];
    bakeFps?: number;
    scale?: number;
}): Promise<{
    mesh: BABYLON.Mesh;
    bake: VatBake;
    container: BABYLON.AssetContainer;
}>;
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
        /**
         * A rigged GLB to BAKE from, instead of the synthetic bench figure.
         *
         * The intermediate rung: the same character a `b3d-biped` would animate
         * with a skeleton, drawn by the crowd path with none. Empty = the blocky
         * figure, which is the honest default for a bench (it has no download and
         * no licence attached to the number it produces).
         */
        url: string;
        /**
         * Which of the GLB's clips to bake, comma-separated. Empty = all of them.
         *
         * Worth naming rather than taking everything: memory is linear in frames,
         * and a rig usually carries clips a crowd has no use for.
         */
        clips: string;
        /** Scale applied to the baked figure. omnidude is 0.88m — half a person. */
        figureScale: number;
    };
    count: number;
    spread: number;
    bakeFps: number;
    interpolate: string;
    skinned: number;
    skinnedUrl: string;
    url: string;
    clips: string;
    figureScale: number;
    private _mesh?;
    private _bake?;
    private _plugin?;
    /** Which `url` the live figure was baked from — `''` is the bench figure. */
    private _figureUrl;
    private _baking;
    private _bakeNote;
    private _bakeContainer;
    private _obs;
    private _built;
    private _t;
    private _offDebug;
    private _worstMs;
    private _lastMs;
    private _frames;
    private _floorMs;
    private _instr?;
    private _sceneInstr?;
    private _worstGpu;
    /**
     * What the wall clock is entitled to claim, given the display it is on.
     *
     * Three genuinely different cases: paused (recording nothing), sitting ON the
     * floor (we fitted, and that is ALL the wall clock knows), and above it (we
     * missed frames — the one case where the number is a cost). The old version
     * compared against a hard-wired 18ms, which is a 60Hz assumption wearing a
     * measurement's clothes.
     */
    private _wallVerdict;
    /** What the bake costs on the GPU, for the readout. */
    get bakeBytes(): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _skinnedRoots;
    private _skinnedBuilt;
    private _skinnedVerts;
    private _skinnedWant;
    private _skinnedNote;
    private _container;
    /**
     * Adopt a figure — mesh plus bake — as the thing the crowd draws.
     *
     * One path for both sources, because the difference between a synthetic
     * figure and a baked GLB is entirely upstream of here: by this point each is
     * a mesh, a texture pair and a clip table, and everything below (the plugin,
     * the shadow wrapper, the thin instances) is identical. Two paths would have
     * meant the GLB figure quietly missing whichever of them was added later.
     */
    private _useFigure;
    /**
     * Re-bake from a different source, without the crowd disappearing meanwhile.
     *
     * Failure is REPORTED rather than thrown away — a bake that 404s or a GLB
     * with no skin leaves the previous figure on screen, which is correct and is
     * also indistinguishable from "the new one looks the same" unless the panel
     * says so.
     */
    private _bakeFrom;
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
     * Load the rig the crowd's own figures were baked from, as a skinned asset.
     *
     * ⚠️ IT MUST BE `url`, THE FILE THE BAKE CAME FROM — not `skinnedUrl`.
     *
     * The two are different assets and only one of them has the right clips. I
     * reached for `skinnedUrl` first, because the skinned BASELINE already loads
     * it and reusing that container looked like the tidy move. It is not: the
     * baseline exists to answer "what does a real rig cost", so its file is
     * whatever you want to measure, while the bake's clip names come from `url`.
     *
     * Caught by overlaying a promoted rig on the instance it replaced instead of
     * hiding it. A default crowd is SYNTHETIC BLOCK figures whose clips are
     * generated in code, so the spawned omnidude stood in the same spot in a
     * completely different pose — two figures, two animations, visibly nothing to
     * do with each other. Numerically everything agreed: the clip resolved, the
     * phase was right, the position matched to three decimals. The claim that
     * pose transfers is only true when both sides came from one file, and there
     * is no way to check that from the numbers.
     *
     * So a SYNTHETIC crowd cannot be promoted at all, and says so rather than
     * promoting something that merely stands in the right place. Resolves `false`
     * when there is no rig to load or the load failed; the note is on the debug
     * panel either way.
     */
    loadRig(): Promise<boolean>;
    private _rigContainer;
    /**
     * Figure `i`, as a SKINNED RIG standing exactly where it was, mid-stride.
     *
     * The convenience half of the swap, and the reason it belongs here rather
     * than in every consumer: matching the pose needs `poseOf`, matching the
     * place needs `transformOf`, and matching the CLIP needs the rig to be the
     * file the bake came from. All three live here. A consumer doing it by hand
     * gets the first two right and discovers the third when their zombie plays
     * the wrong animation.
     *
     * Hides the instance as it goes, so there is never a frame with both.
     * `dispose()` on the returned handle puts the figure back in the crowd.
     *
     * Still not a policy: WHICH figure, and when, is the caller's entire
     * business. This only makes the swap itself cheap to get right.
     */
    spawnPosed(i: number): {
        root: BABYLON.TransformNode;
        group: BABYLON.AnimationGroup | null;
        dispose: () => void;
    } | null;
    /** Per-instance buffers, kept so the swap API can read and edit them. */
    private _matrices;
    private _state;
    /** Figures currently taken out of the crowd → the matrix they had. */
    private _hidden;
    /** How many figures are in the crowd right now. Indices are `0..count-1`. */
    get figureCount(): number;
    /**
     * WHICH CLIP FIGURE `i` IS PLAYING, AND HOW FAR THROUGH — the whole point.
     *
     * This is the half of a crowd→skinned swap that only the crowd can answer,
     * and the half that normally makes such a swap look terrible. A LOD
     * transition usually founders on reconstructing pose: you know where the
     * thing is, not what it was doing. Here it was never lost — `vatState` is
     * literally `(clipStart, clipFrames, phaseOffset, cyclesPerSecond)`, so the
     * clip and the phase are a lookup and a `fract`.
     *
     * Start a skinned `AnimationGroup` on `clip` at `t` (a 0..1 fraction of the
     * clip) and the two are in the same pose at the same instant. Nothing to
     * blend, nothing to cross-fade, no snap.
     *
     * WHEN to swap is deliberately not here — see the note on `setFigureHidden`.
     */
    poseOf(i: number): {
        clip: string;
        t: number;
        rate: number;
    } | null;
    /**
     * Where figure `i` is standing, and which way it faces.
     *
     * Read out of the instance matrix rather than recomputed from the seed: the
     * buffer is the truth, and a consumer that places a rig from a recomputed
     * position gets a figure that is almost in the right place, which is worse
     * than obviously wrong.
     */
    transformOf(i: number): {
        x: number;
        y: number;
        z: number;
        yaw: number;
    } | null;
    /**
     * Take a figure out of the crowd, or put it back.
     *
     * The other half of the swap, and everything it does NOT do is deliberate.
     * There is no promotion budget here, no radius, no hysteresis and no rule
     * about what happens to a figure that dies while promoted — those depend on
     * the game. A horde promotes whatever can reach you, a battle promotes the
     * unit you selected regardless of distance, a parade promotes whoever the
     * camera is following; any rule shipped here would be wrong for two of the
     * three, and wrong invisibly. Tonio: *"leave the rules for switching to
     * skinned models to the consumer since it will be more likely decided on
     * specifics."*
     *
     * Hiding collapses the instance's matrix to zero scale, which is a
     * zero-area triangle and therefore nothing rasterised. The original matrix is
     * kept so `false` restores it exactly.
     *
     * ⚠️ IT REWRITES THE MATRIX BUFFER, so the cost is proportional to the WHOLE
     * crowd, not to the one figure: 64 bytes × count per call. At the sizes this
     * is for — promote a handful out of a few thousand — that is tens of
     * kilobytes and fine. It would not be fine on the 200,000-figure bench, and
     * the cheaper fix if that ever matters is a per-instance visibility
     * attribute, so a hide writes one float instead of sixteen.
     */
    setFigureHidden(i: number, hidden: boolean): void;
    /** Is figure `i` currently taken out? */
    isFigureHidden(i: number): boolean;
    /**
     * The figures nearest a point, nearest first.
     *
     * A QUERY, not a policy — it answers "who is close", not "who should be
     * promoted". It is here because the alternative is a consumer looping every
     * figure and calling `transformOf` on each, which is the O(n) mistake this
     * substrate exists to avoid: reading the buffer directly costs a subtract
     * and a compare per figure with no allocation.
     *
     * `maxDistance` is the real economy — it rejects on squared distance before
     * anything else happens, so a horde of ten thousand costs ten thousand cheap
     * rejections rather than ten thousand sorts.
     */
    nearestFigures(point: {
        x: number;
        y: number;
        z: number;
    }, options?: {
        count?: number;
        maxDistance?: number;
        includeHidden?: boolean;
    }): number[];
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