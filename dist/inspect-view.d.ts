import * as BABYLON from '@babylonjs/core';
import { type SeamMaterialOptions } from './seam-material.js';
/** The views, by the side of the subject the camera is on. */
export declare const INSPECT_FACES: readonly ["front", "back", "left", "right", "top", "bottom"];
export type InspectFace = (typeof INSPECT_FACES)[number];
export interface InspectView {
    /** The view held, or `free` to orbit with a perspective camera. */
    face: InspectFace | 'free';
    readonly camera: BABYLON.ArcRotateCamera;
    /** Back to a free perspective camera, and stop. */
    dispose(): void;
}
export interface InspectViewOptions {
    /** Where it starts (default `free`: nothing changes until a face is set). */
    face?: InspectFace | 'free';
    /** Called whenever the face changes (so a menu can follow). */
    handleChange?: (face: InspectFace | 'free') => void;
}
export declare function inspectView(camera: BABYLON.ArcRotateCamera, options?: InspectViewOptions): InspectView;
/**
 * Draw `mesh` as its polygons: a twin in its place (its own unshared copy of
 * the geometry, the same skeleton, so it bends with it) wearing a
 * `seamMaterial`, the mesh hidden meanwhile. `dispose()` shows it again.
 */
export declare function seamOverlay(mesh: BABYLON.AbstractMesh, options?: SeamMaterialOptions): {
    dispose(): void;
};
export interface InspectStageOptions {
    /** The floor's width and depth, in metres (default 12). */
    size?: number;
    /** The floor's colour (default a light neutral grey). */
    floor?: string;
}
export interface InspectStage {
    ground: BABYLON.Mesh;
    light: BABYLON.DirectionalLight;
    dispose(): void;
}
/**
 * A neutral floor to look at a model on: light grey, ruled every metre and
 * faintly every quarter, with a key light from above and in front. Shadows
 * are not on yet: in the rig tool's scene every shadow generator tried (a
 * plain one, a cascaded one, the scene's own sun) drew no shadow or turned
 * the floor black, which is being looked into.
 */
export declare function inspectStage(scene: BABYLON.Scene, options?: InspectStageOptions): InspectStage;
//# sourceMappingURL=inspect-view.d.ts.map