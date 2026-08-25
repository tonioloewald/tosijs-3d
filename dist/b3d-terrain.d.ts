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
        biomeLapseRate: number;
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
    /**
     * LOCAL volcanism field — `(x, z) => 0..1`, sampled per tile vertex in
     * origin-stable world coordinates and carried to the biome shader in the
     * colour buffer's (visually inert) alpha channel. Where it's > 0 the biome
     * plugin runs its volcanism ladder at that LOCAL intensity, independent of
     * the global `volcanism` dial — "THIS island is volcanic". A radial ramp
     * gives a caldera gradient: pools at the centre, glowing seams around
     * them, cold voronoi at the fringe. Compose seeded noise or authored
     * shapes exactly like slope-profile weight fields. Set it, then
     * `regenerate()`.
     */
    provinceField: ((x: number, z: number) => number) | null;
    /**
     * Authored landform override — `(x, z, h) => h'`, applied AFTER the
     * profiles/amplitude pipeline in origin-stable coordinates. Where it
     * leaves `h` untouched the noise terrain shows through; where it doesn't,
     * the authored shape wins — a volcano cone, an impact crater, a building
     * pad. Pair with [[landform]]'s factories, which return a landform and its
     * matching `provinceField` together. Set it, then `regenerate()` — which
     * is also how a runtime EXPLOSION stamps a glowing crater: compose the new
     * crater in, regenerate.
     */
    landform: ((x: number, z: number, h: number) => number) | null;
    /**
     * Volumetric patch mask — `(x, z) => true` where the terrain SURFACE is cut
     * away (a bore mouth, a cavern opening). Queried per tile fill in
     * origin-stable world coordinates, at that tile's own LOD: pooled tiles have
     * no stable identity and the same ground is different cells at different
     * levels, so a stored cell list would be wrong the moment anything streamed.
     *
     * Pair it with a [[patch-field]] density carving the same volume — the mask
     * opens the roof, the patch supplies the walls beneath it.
     */
    /** `(x,z) => boolean` — cut the surface away over a footprint. Kept as the
     * generic hook a cavity province will use; the `b3d-patch` element that
     * introduced it is gone (see TUNNEL-DESIGN.md). */
    patchMask: ((x: number, z: number) => boolean) | null;
    /**
     * Footprints of the volumetric patches cut into this terrain, in LOGICAL
     * world coordinates (origin-stable — they're rebased into render space each
     * frame, so a floating-origin reset can't move a tunnel).
     *
     * Each forces its ground to `level` or finer while it's near enough to be
     * worth resolving, and is otherwise ignored — the ground simply seals over
     * it. Patches never OWN tiles: they ride the same per-frame `desiredCells`
     * diff the pool does, so a bore can't outlive the ground it's cut into.
     */
    patches: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        level: number;
    }[];
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
    /**
     * The terrain's own height sampler, in LOGICAL world coordinates
     * (origin-stable — pass the same coordinates a patch is authored in and a
     * floating-origin reset can't move the answer).
     *
     * This is the function a volumetric patch must build its base density from:
     * it is the hooked, landform-composed height the TILES are built from, so a
     * bore's mouth lands on the ground that's actually there rather than on raw
     * noise. Cheap to hold onto for a burst of samples; rebuild it (call again)
     * after changing attributes or profiles.
     */
    heightSampler(): (x: number, z: number) => number;
    private makeHeightFn;
    /** Metres the hole's rim folds down into a patch opening (see the collar
     * note in `terrain-grid.tileIndexPlan`). */
    rimCollar: number;
    private _rimScratch?;
    private pool;
    private _resolvedSubs;
    private tileTemplate;
    /** The tiles' material. Read it to MATCH a patch's walls to the ground
     * they're cut into; mutating it changes every tile. */
    material: BABYLON.StandardMaterial;
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
    /**
     * Where this terrain sits in the sampler's (u, v) domain.
     *
     * ⚠️ `worldV = 0` puts the world ON A MIRROR PLANE. `CylinderSampler`
     * deliberately reflects v (`if (vr > 0.5) vr = 1 - vr`, "symmetric
     * hemispheres"), so v and −v sample the SAME point: the terrain either side
     * of z = 0 is a mirror image, with a seam running away to the horizon.
     * Invisible in a small demo sitting at the origin, glaring the moment you
     * fly along it (Tonio spotted it as "the terrain sampling mirror").
     *
     * Default is 0.25 — a quarter turn away from both mirror planes (v = 0 and
     * v = 0.5), which is the furthest you can get from either.
     */
    worldU: number;
    worldV: number;
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
    private _originDbgOff;
    private _joinDebugPanel;
    sceneDispose(): void;
    private createSampler;
    private createMaterial;
    /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
    biomePlugin: BiomePlugin | null;
    private createPool;
    private static buildTileTemplate;
    private update;
    /** Desired tiles not yet built when the last fill pass ran out of budget.
     * >0 means the ground is still coming in. */
    private _fillBacklog;
    /**
     * Is the terrain still streaming in tiles it wants?
     *
     * Published because a frame rate measured while the ground is still building
     * says nothing about the hardware — `<tosi-b3d>`'s `sceneBusy` asks this
     * before letting the ambient watchdog or the device probe judge anything
     * (tosijs-3d#11).
     */
    get busy(): boolean;
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