import * as BABYLON from '@babylonjs/core';
/** The vertex attribute that carries each corner's barycentric coordinate. */
export declare const BARY_KIND = "b3dBary";
export interface SeamMaterialOptions {
    fill?: string;
    line?: string;
    lineAlpha?: number;
    lineWidth?: number;
    shade?: number;
}
export declare class SeamPlugin extends BABYLON.MaterialPluginBase {
    line: BABYLON.Color3;
    lineAlpha: number;
    lineWidth: number;
    constructor(material: BABYLON.Material);
    getClassName(): string;
    prepareDefines(defines: BABYLON.MaterialDefines, _scene: BABYLON.Scene, mesh: BABYLON.AbstractMesh): void;
    getAttributes(attributes: string[], _scene: BABYLON.Scene, mesh: BABYLON.AbstractMesh): void;
    getUniforms(): {
        ubo: {
            name: string;
            size: number;
            type: string;
        }[];
        fragment: string;
    };
    bindForSubMesh(ubo: BABYLON.UniformBuffer): void;
    getCustomCode(shaderType: string): {
        [pointName: string]: string;
    } | null;
}
/** A flat material that draws the polygon edges of a mesh with barycentrics. */
export declare function seamMaterial(scene: BABYLON.Scene, options?: SeamMaterialOptions): BABYLON.StandardMaterial & {
    seams: SeamPlugin;
};
/**
 * Which triangle edges are the diagonal of a quad: per triangle, a bit for
 * the edge opposite each corner (1, 2, 4). Meshes arrive triangulated (an
 * OBJ's quads are fans by the time they are loaded), so the quads are found
 * again: two triangles that share an edge which is the LONGEST edge of both,
 * and lie nearly flat together (within `maxDeg`), are one quad, and that
 * edge is hidden. Each triangle pairs once. Corners are matched by position,
 * so split vertices (a UV seam) still meet.
 */
export declare function quadDiagonals(positions: ArrayLike<number>, indices: ArrayLike<number>, maxDeg?: number): Uint8Array;
/**
 * Give `mesh` its barycentrics: its triangles unshared (every corner its own
 * vertex, skin weights and all) and each corner marked (1,0,0), (0,1,0) or
 * (0,0,1). An edge to hide (a quad's diagonal, see `quadDiagonals`) has the
 * coordinate that measures it held at 1, so it is never near. Its geometry
 * is made its own first, so a clone's original keeps its shared vertices.
 */
export declare function withBarycentrics(mesh: BABYLON.Mesh, options?: {
    quads?: boolean;
}): BABYLON.Mesh;
//# sourceMappingURL=seam-material.d.ts.map