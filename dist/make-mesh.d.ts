import * as BABYLON from '@babylonjs/core';
/** The bits of `<tosi-b3d>` a maker touches. Duck-typed so a test can stand one
 * up without an engine, the same way the rest of this codebase does. */
export interface MakeOwner {
    scene: BABYLON.Scene;
    register?(additions: {
        meshes?: BABYLON.AbstractMesh[];
    }): void;
}
/** Options every maker understands, on top of its own shape parameters. */
export interface MakeOptions {
    name?: string;
    x?: number;
    y?: number;
    z?: number;
    /** DEGREES, matching `AbstractMesh`'s rx/ry/rz — not Babylon's radians. */
    rx?: number;
    ry?: number;
    rz?: number;
    color?: string;
    /** Self-illumination 0..1 as a fraction of `color` (see b3d-primitives). */
    glow?: number;
    glowColor?: string;
    /** Polished PBR metal instead of a StandardMaterial. */
    mirror?: boolean;
    parent?: BABYLON.Node;
    /** Register with the owner so the sun/reflections pick it up (default true).
     * `false` for something purely decorative that shouldn't cast. */
    shadows?: boolean;
    pickable?: boolean;
    /** Compute the world matrix now (default true) — see the module note. */
    worldMatrix?: boolean;
}
/** A maker: shape options merged with the shared ones, returning the mesh. */
export type Maker<Shape = Record<string, unknown>> = (opts?: MakeOptions & Shape) => BABYLON.Mesh;
/**
 * Build the `make` facade for an owner.
 *
 * Weightless: one Proxy, and a maker closure only for the names actually used.
 */
export declare function createMakers(owner: MakeOwner): Makers;
/**
 * The common shapes are declared so they type-check and complete; the index
 * signature keeps the rest of `MeshBuilder` reachable.
 */
export interface Makers {
    box: Maker<{
        size?: number;
        width?: number;
        height?: number;
        depth?: number;
    }>;
    sphere: Maker<{
        diameter?: number;
        segments?: number;
    }>;
    cylinder: Maker<{
        height?: number;
        diameter?: number;
        diameterTop?: number;
        diameterBottom?: number;
        tessellation?: number;
    }>;
    plane: Maker<{
        size?: number;
        width?: number;
        height?: number;
    }>;
    ground: Maker<{
        width?: number;
        height?: number;
        subdivisions?: number;
    }>;
    disc: Maker<{
        radius?: number;
        tessellation?: number;
    }>;
    torus: Maker<{
        diameter?: number;
        thickness?: number;
        tessellation?: number;
    }>;
    capsule: Maker<{
        radius?: number;
        height?: number;
    }>;
    icoSphere: Maker<{
        radius?: number;
        subdivisions?: number;
    }>;
    torusKnot: Maker<{
        radius?: number;
        tube?: number;
    }>;
    polyhedron: Maker<{
        type?: number;
        size?: number;
    }>;
    /** OURS, not MeshBuilder's: a rounded rectangle as GEOMETRY, so a UI panel can
     * be opaque instead of buying its corners with alpha. See `rounded-rect`. */
    roundedPlane: Maker<{
        width?: number;
        height?: number;
        radius?: number;
        cornerSegments?: number;
    }>;
    [shape: string]: Maker;
}
//# sourceMappingURL=make-mesh.d.ts.map