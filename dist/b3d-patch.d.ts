import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import { type PatchField } from './patch-field';
export declare class B3dPatch extends B3dChild {
    static initAttributes: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        /** How far BELOW the ground the carve reaches (m). Y bounds are derived
         * from the terrain, so a bore follows the hillside instead of needing a
         * plateau flattened under it. */
        depth: number;
        /** How far above the ground to extract (m) — enough to close the rim. */
        rise: number;
        /** Lattice spacing (m). Finer = smoother walls and far more triangles. */
        spacing: number;
        /** Vertex jitter, fraction of spacing. 0 for architectural cavities. */
        jitter: number;
        seed: number;
        /** Resolve only while the surrounding terrain is this LOD or finer. */
        level: number;
        /** Metres below the surface over which walls fade from hillside
         * shading to full interior rock. */
        interiorDepth: number;
        /** Extraction budget per frame (ms). */
        buildMs: number;
        /** Cells per chunk along each axis. */
        chunkCells: number;
    };
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    depth: number;
    rise: number;
    spacing: number;
    jitter: number;
    seed: number;
    level: number;
    interiorDepth: number;
    buildMs: number;
    chunkCells: number;
    /**
     * The carve: `(x, y, z, d) => d'`, negative inside solid. `d` arrives as
     * **depth below the ground** (0 at the surface, negative in the rock), so a
     * carve written against it FOLLOWS the terrain — no plateau needs flattening
     * under a bore to give it a known mouth height.
     */
    field: PatchField | null;
    /**
     * Where this patch OWNS the ground: signed distance in XZ, negative inside.
     * Inside it the tiles step aside entirely and the patch supplies both the
     * ground and the walls, from one field.
     *
     * That total handover is the point. Cutting only the bore mouth leaves the
     * tiles and the extraction both drawing the ground around it — two surfaces
     * a few centimetres apart, which is z-fighting you can see from a kilometre
     * up. One surface per patch of ground, always. Defaults to the XZ bounds.
     */
    footprint: ((x: number, z: number) => number) | null;
    /** Derived from the terrain over the footprint (see `depth`/`rise`). */
    private _minY;
    private _maxY;
    /** Material for the walls; a plain rock-ish default if unset. */
    material: BABYLON.Material | null;
    private _terrain;
    private _chunks;
    private _pending;
    private _obs;
    private _resident;
    private _height;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Tell the terrain about us: the footprint it must resolve finely, and the
     * mask that cuts our mouth out of its tiles. Both derive from the same field,
     * so they cannot drift apart. */
    private _register;
    /**
     * Walls shade with the SAME biome shader as the ground they're cut into.
     * World-space classification is mesh-agnostic, so a wall is simply steep
     * terrain and lands in the cliff/rock path for free — but two things are
     * not free:
     *
     * - the plugin lives per-material, so walls need their own instance
     *   carrying the terrain's parameters (matched when the walls are built);
     * - `interior: 1`, so a level cavern FLOOR shades as rock rather than
     *   growing whatever the chart grows on the ground overhead.
     *
     * Flooding is deliberately NOT overridden here: whether an interior is
     * submerged is the world's business (`waterTable` / `noWater`), and a cave
     * below the water line genuinely is a flooded cave.
     */
    private _wallMaterial;
    /**
     * "Is this world point inside my open volume?" — the escape hatch every
     * heightfield assumption needs (ground clamp, ground-plane floor, pull-up
     * warning, landing gate). Takes RENDER coordinates, since that's where
     * everything flying around lives, and converts inward: patches are authored
     * logically so a rebase can't move them.
     *
     * Bound once as a field, not a method, so add/removeCavity see the SAME
     * function identity — a method reference would be a fresh closure each time
     * and could never be removed.
     */
    private _cavity;
    private _footprintAt;
    private _density;
    private _update;
    /** Enumerate the chunks this patch's bounds cover, nearest-first is not worth
     * it at these sizes — a patch is a handful of chunks, not a world. */
    /** Sample the ground over the footprint to find the Y range worth
     * extracting. Absolute Y bounds would have to be re-authored every time the
     * terrain seed changed, and a bore on a hillside spans more height than one
     * on a plain. */
    private _measureY;
    private _planChunks;
    private _extractSome;
    /**
     * Can this chunk possibly contain a surface? Sample its corners and centre:
     * if every sample agrees on sign AND the nearest is further away than the
     * chunk's own half-diagonal, the surface cannot reach inside it.
     *
     * Without this a patch extracts its whole bounding box — 2400 chunks for the
     * demo's cave, almost all of them solid rock or open sky, each costing a
     * full sample grid of terrain-height evaluations. The field isn't a strict
     * distance function (it's built from max/min compositions plus noise), so
     * the half-diagonal test is used conservatively: it only ever skips chunks
     * the surface would have to travel further than that to enter.
     */
    private _chunkCouldHaveSurface;
    private _extractOne;
    private _releaseChunks;
    sceneDispose(): void;
}
export declare const b3dPatch: (...args: any[]) => B3dPatch;
//# sourceMappingURL=b3d-patch.d.ts.map