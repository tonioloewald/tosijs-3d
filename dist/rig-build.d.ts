import * as BABYLON from '@babylonjs/core';
import type { FittedRig, Markers } from './rig-fit.js';
import type { SkinWeights } from './bone-heat.js';
import { type BodyEye, type BodySurface, type RiggedBody } from './rigged-body.js';
export interface BuiltRig {
    /** The container: move, turn and scale the character by this. */
    root: BABYLON.TransformNode;
    mesh: BABYLON.Mesh;
    skeleton: BABYLON.Skeleton;
    /** A joint's node by name. */
    node(name: string): BABYLON.TransformNode | undefined;
    dispose(): void;
}
/**
 * Skin a mesh (positions xyz and indices in threes, in the fitted rig's
 * space) to a fitted rig. `weights` are bone heat's, indexed by `rig.joints`.
 */
export declare function buildRig(scene: BABYLON.Scene, name: string, positions: ArrayLike<number>, indices: ArrayLike<number>, rig: FittedRig, weights: SkinWeights, options?: {
    normals?: ArrayLike<number>;
    uvs?: ArrayLike<number>;
    colors?: ArrayLike<number>;
    /** Runs of triangles, one sub-mesh each (material index = its place). */
    surfaces?: BodySurface[];
}): BuiltRig;
/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface RigTriangles {
    positions: number[];
    indices: number[];
    /** Texture coordinates, when any of the meshes has them. */
    uvs?: number[];
    /** Vertex colours (RGBA), when any of the meshes has them. */
    colors?: number[];
    /** The triangles in runs, one per material, with the file's materials. */
    surfaces?: BodySurface[];
    /** The eyeballs, when the file has them as objects of their own (left first). */
    eyes?: BodyEye[];
}
/**
 * Meshes' triangles in the frame of the file's root (a glTF's `__root__`
 * carries the handedness mirror, which the binding must not see).
 */
export declare function gatherTriangles(root: BABYLON.TransformNode, meshes: BABYLON.AbstractMesh[]): RigTriangles;
/**
 * A material for a built body, chosen per surface: `pick` is given each of
 * the body's surfaces (or null when it has none) and returns its material.
 * Several surfaces make a MultiMaterial (dispose it without its children).
 */
export declare function surfaceMaterial(scene: BABYLON.Scene, name: string, body: RiggedBody, pick: (surface: BodySurface | null) => BABYLON.Material): BABYLON.Material;
/**
 * A model file's triangles, its skeleton (if any) ignored: a URL or a File
 * (GLB or glTF), and optionally the one node in it to take (`pick`, with its
 * children; a library holds many characters).
 */
export declare function loadRigTriangles(scene: BABYLON.Scene, source: string | File, options?: {
    pick?: string;
}): Promise<RigTriangles>;
/**
 * A file's character as a rigged body from its OWN skin, or null when its
 * skeleton is not UAL's (then bind it from markers). `pick` chooses one
 * character in a library file.
 */
export declare function loadSkinnedBody(scene: BABYLON.Scene, source: string | File, options?: {
    pick?: string;
}): Promise<RiggedBody | null>;
export interface BuiltBody extends BuiltRig {
    /** The rigged body it was built from. */
    body: RiggedBody;
    /** Its skeleton (`rig.at(name)` for a joint's rest position). */
    rig: FittedRig;
}
/**
 * A rigged body (rig-tool or MakeHuman, see rigged-body) as a Babylon
 * skeleton on its mesh, normals shared across the mesh's split vertices.
 */
export declare function buildBody(scene: BABYLON.Scene, name: string, body: RiggedBody): BuiltBody;
/** The vertices a rigged body stands on: skinned mostly to a foot or its toes. */
export declare function soleVertices(body: RiggedBody): Uint32Array;
/**
 * The lowest of `vertices` in the world as the mesh is posed now (its
 * skeleton prepared): the soles' height. Infinity with none.
 */
export declare function lowestOf(mesh: BABYLON.AbstractMesh, vertices: ArrayLike<number>): number;
export interface AutoRigged extends BuiltBody {
    /** The markers it was fitted from: guessed, unless they were given. */
    markers: Markers;
}
/**
 * The whole auto-rig on a mesh's triangles in one call: `bodyFromMarkers`
 * (markers guessed unless given) then `buildBody`.
 */
export declare function autoRig(scene: BABYLON.Scene, name: string, tris: RigTriangles, options?: {
    markers?: Markers;
}): AutoRigged;
export declare function weldedNormals(positions: ArrayLike<number>, indices: ArrayLike<number>): Float32Array;
//# sourceMappingURL=rig-build.d.ts.map