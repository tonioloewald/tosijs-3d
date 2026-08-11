import { B3dChild } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import type { GradientFilter } from './gradient-filter';
import { BiomePlugin } from './biome-plugin';
export declare class B3dTerrain extends B3dChild {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        biome: "on" | "off";
        biomeSeaLevel: number;
        normalSmoothing: number;
        seed: number;
        surfaceType: string;
        majorRadius: number;
        minorRadius: number;
        radius: number;
        cylinderHeight: number;
        tileSize: number;
        hiResSubdivisions: number;
        lodLevels: number;
        poolSize: number;
        fillBudget: number;
        splitFactor: number;
        reach: number;
        grossScale: number;
        detailScale: number;
        horizScale: number;
        grossAmplitude: number;
        detailAmplitude: number;
        baseHeight: number;
        center: boolean;
        debugColor: boolean;
        tileBuildMs: number;
        profile: boolean;
        originResetThreshold: number;
        maxTravelDistance: number;
        wireframe: boolean;
    };
    owner: B3d | null;
    grossFilter: GradientFilter;
    detailFilter: GradientFilter;
    private noise;
    private noiseSeed;
    private sampler;
    /** Non-null only while `profile` is on — its absence is what makes profiling free. */
    private _prof;
    /** Padded height grid reused by every tile build — sized once, never reallocated (the
     * streamer builds tiles every frame; allocating here would feed the GC forever). */
    private _fieldScratch;
    /**
     * Build a height function with EVERY constant hoisted into a plain local.
     *
     * `heightAt` used to read nine reactive component attributes per call (`surfaceType`,
     * `radius`, `cylinderHeight`, `horizScale`, `grossScale`, `detailScale`, both
     * amplitudes) and call two helpers that compare strings — inside the innermost loop of
     * the whole library. At 729 samples per tile and up to 24 tiles a frame that's ~157,000
     * reactive attribute reads in a saturated frame, all of them re-fetching values that
     * cannot change during a build.
     *
     * They're constant for the tile, so read them ONCE. The returned closure touches nothing
     * but numbers and three object refs — which is also what makes it portable to a worker
     * or a wasm kernel later (see PERF-DESIGN.md): it closes over plain data, not over a DOM
     * component.
     *
     * Rebuilt per tile build (24×/frame at worst — nothing), so a slider change or an origin
     * shift is always picked up.
     */
    private makeHeightFn;
    private pool;
    private _resolvedSubs;
    private tileTemplate;
    private material;
    private registered;
    private _desired;
    private _desiredByKey;
    private _covered;
    private _free;
    private _placed;
    private _blanks;
    private lastCamX;
    private lastCamZ;
    private interestX;
    private interestZ;
    private worldU;
    private worldV;
    private originOffsetX;
    private originOffsetZ;
    private _beforeRender;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Turn profiling on/off at runtime (the `profile` attribute sets the initial state).
     * Handy from the console: `$0.setProfiling(true)` … fly … `$0.debugState`. */
    setProfiling(on: boolean): void;
    /** Is tile profiling on? (Drives the Perf Stats panel's button label.) */
    get profiling(): boolean;
    private _debugOff;
    private _joinDebugPanel;
    sceneDispose(): void;
    private createSampler;
    private createMaterial;
    /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
    biomePlugin: BiomePlugin | null;
    private createPool;
    private static buildTileTemplate;
    private update;
    private coarsestTileSize;
    /** Build the quadtree config from attributes + a facing/travel interest. */
    private buildConfig;
    /**
     * Reconcile the pool with the desired cells: keep tiles whose cell is still
     * wanted, free the rest, then fill the highest-priority blanks — reusing free
     * tiles, or STEALING the weakest placed tile a blank outranks — up to `budget`.
     */
    /**
     * Tile-build cost, for deciding what (if anything) is worth moving off the main thread
     * or into wasm. Set `profile` to collect it; `resetProfile()` to zero it.
     *
     * The split is the point. `movableMs` (noise/normals/skirt — plain float arithmetic)
     * is what a worker or wasm could take; `upload` is a GPU handoff and can NEVER leave
     * the main thread, so it's the floor on any threading win. If `movableShare` is small,
     * neither wasm nor a worker will buy you much, however big the sample count looks.
     *
     * `nsPerSample` is the honest per-noise-eval cost (each heightAt = 2 fractal calls × 6
     * octaves = 12 perlin evals, so divide by 12 for per-octave). And note `samples`
     * counts FIVE heightAt per vertex — one for the height, four for the ±e normal
     * gradient — so ~80% of the noise here exists to compute normals, and sampling a
     * padded grid once and central-differencing it would cut that ~4-5× in plain JS,
     * before any new technology.
     *
     * `worstFrameMs` is the number that matters for feel: the hitch is one saturated
     * frame, not the average tile. `worstFrameSaturated` says whether that frame was
     * fillBudget-capped (i.e. the cap, not the work, set the ceiling).
     */
    get debugState(): Record<string, unknown> | null;
    /** Zero the profile counters (e.g. after the first-load burst, to measure steady flight). */
    resetProfile(): void;
    /** Close the frame's books: fold this frame's build cost into the worst-case, which is
     * the number that actually matters — the hitch you feel is one saturated frame, not the
     * average tile. */
    private endProfileFrame;
    /**
     * Fill blank cells, highest priority first, until we run out of tiles (`budget`) OR out
     * of TIME (`msBudget`) — whichever comes first.
     *
     * The time cap is the one that matters. A tile-count cap bounds the frame only by
     * accident: tile cost swings with subdivisions, octaves, device and JS engine, so the
     * same `fillBudget` is a 3ms frame on a workstation and a 30ms frame on a Quest. Capping
     * TIME bounds the worst frame by construction everywhere, and self-corrects when detail
     * goes up — pricier tiles simply means fewer of them this frame, never a bigger hitch.
     * (tosijs does the same thing for large virtual-list bindings.)
     *
     * Always builds at least ONE tile, or a device slow enough to blow the budget on a single
     * tile would stream nothing, ever.
     */
    private streamTiles;
    private generateTileMesh;
    private renderToU;
    private renderToV;
    private getCircumferenceU;
    private getCircumferenceV;
    private resetOrigin;
    recenter(): void;
    private clearPool;
    regenerate(): void;
}
export declare const b3dTerrain: import("tosijs").ElementCreator<B3dTerrain>;
//# sourceMappingURL=b3d-terrain.d.ts.map