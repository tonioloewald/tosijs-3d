/**
 * Babylon-only model transform helpers (no tosijs/DOM deps, so they're unit
 * testable headless). Used to collapse a spawned model's frame to something
 * clean — see [b3d-library](?b3d-library.ts)'s `canonical` instantiate.
 */
import * as BABYLON from '@babylonjs/core';
/**
 * Bake a mesh's scale into its vertices so the node ends up UNIT scale, WITHOUT
 * changing its orientation (nose direction) or position. The bake runs with the
 * rotation temporarily set to identity, then restores it — so only scale is
 * folded into the geometry. A scaled control node skews `forward`/`up` (non-unit,
 * non-orthogonal) and forces per-use `1/scale` neutralization; collapsing it here
 * means downstream frames stay clean.
 */
/**
 * THE canonical model frame — defined here, once (issues #5/#6, manta-recon;
 * chain corrected 2026-08-12 against real known-orientation content).
 *
 * Content convention: authored **Blender-default in the model's LOCAL frame**
 * (nose toward local −Y, up local +Z). The exporter maps Blender −Y → glTF
 * +Z, and the library/url paths read node-local data RAW — there is **no
 * per-node handedness flip** (the z-flip lives only on the `__root__` this
 * collapse discards) — so correctly-authored content arrives with its nose
 * already on **local +Z = engine forward**. The collapse therefore applies
 * **no rotation**: it only CLEANS.
 *
 * (Issue #6's original chain assumed a per-node z-flip and prescribed a yaw
 * π here; Tonio's −Y-authored scout — nose gear at local +0.40Z — disproved
 * it empirically. The real-content test in model-frame.test.ts pins the
 * mapping against test-3.glb so narrative can never override measurement
 * again.)
 *
 * The collapse:
 * - **strips handedness mirrors**: Babylon's glTF `__root__` carries
 *   scale (1,1,−1) + yaw 180° (net X-mirror, determinant −1). A control node
 *   with a negative-determinant frame flips chirality for everything computed
 *   through it — inverted pitch, chase camera on the nose side (issue #5).
 *   Scale signs are dropped (magnitudes kept).
 * - drops the node's SCENE transform (position + scenic rotation — dressing;
 *   the authoring truth is the local frame).
 *
 * The returned wrapper — what flight systems and cameras control — is
 * identity: unit rotation, unit scale, det +1. A model that flies backwards
 * is authored nose-toward-local-+Y: fix its LOCAL frame in Blender
 * (edit-mode 180° about Z), never rotate in the scene or the code.
 */
export declare function canonicalize(clone: BABYLON.TransformNode, scene: BABYLON.Scene, name: string): BABYLON.TransformNode;
export declare function normalizeScale(mesh: BABYLON.Mesh): BABYLON.Mesh;
/**
 * Find a model's **centre-of-gravity marker** — a descendant whose name
 * carries the `_centerOfGravity` suffix (underscore variant
 * `_center_of_gravity` works too, and it composes with `.model` like every
 * behaviour suffix). The vehicle node convention: the ROOT origin is the
 * on-ground stance point (centred, grounded — `y = terrainHeight` parks it);
 * the CoG marker says where the craft pivots in flight. Returns null when the
 * model doesn't declare one.
 */
export declare function findCenterOfGravity(root: BABYLON.TransformNode): BABYLON.TransformNode | null;
/**
 * Make `control` (a canonicalized vehicle wrapper) **pivot about the model's
 * declared centre of gravity** while its position keeps meaning the root's
 * on-ground stance point. With level attitude the pivot is inert — parking
 * (`y = terrainHeight`) is unchanged; under pitch/roll the craft rotates
 * about the CoG and the stance origin swings, which is the physically-honest
 * motion. No marker → no-op. Returns the marker node (or null) so callers
 * can expose it (debug, camera anchoring).
 */
export declare function applyCenterOfGravity(control: BABYLON.TransformNode): BABYLON.TransformNode | null;
//# sourceMappingURL=model-transform.d.ts.map