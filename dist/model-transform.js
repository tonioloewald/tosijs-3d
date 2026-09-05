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
export function canonicalize(clone, scene, name) {
    const wrapper = new BABYLON.TransformNode(name, scene);
    clone.parent = wrapper;
    clone.rotationQuaternion = BABYLON.Quaternion.Identity();
    clone.rotation.set(0, 0, 0);
    clone.position.set(0, 0, 0);
    // Strip mirror signs (the __root__ handedness flip); keep magnitudes.
    clone.scaling.set(Math.abs(clone.scaling.x), Math.abs(clone.scaling.y), Math.abs(clone.scaling.z));
    /*
    THE SCENE TRANSFORM LIVES ON THE CONTENT NODE, NOT ON `__root__`.
  
    The contract above says this function "drops the node's SCENE transform", and
    it only ever zeroed `clone` — which on the glTF path IS `__root__`, the
    loader's own wrapper, whose transform is the handedness flip and nothing else.
    The authored object (`scout`) sits UNDER it and kept its scene placement, so
    the dressing survived a function whose job was to discard it.
  
    Measured on test-3.glb: `scout` sits at (-0.89, 0, -1.44) inside the file.
    Consequences, both of which we paid for:
  
    - the control node the flight model steers is ~1.7 m from the airframe it
      steers, so every ray fired from it starts beside the aircraft; and
    - `applyCenterOfGravity` measures the marker against the control node, so the
      offset lands in the PIVOT. A marker authored dead on the centreline (the
      documented way) installed a pivot at (-0.866, 0.512, -1.432) — 1.75 m out —
      while the OLD marker's odd-looking (0.40, 0.09, -0.58) was silently
      COMPENSATING for the dressing and netted out correct. So the convention
      punished correct authoring and rewarded a hand-tuned offset, which is
      exactly backwards, and re-exporting the model "correctly" broke flight.
  
    Zero the content node's dressing too. Rotation as well as position: scenic
    ROTATION is the thing CLAUDE.md warns never to bake ("never apply all
    transforms on models inside scene files"). Scaling is kept — that is real
    authoring, not dressing.
    */
    const isGltfRoot = clone.name.includes('__root__');
    const content = isGltfRoot
        ? clone.getChildren((n) => n instanceof BABYLON.TransformNode, true)
        : [];
    /*
    EXACTLY ONE content node, or none at all.
  
    The contract above says "the node's SCENE transform" — singular — and the
    first version of this loop zeroed EVERY top-level child. On a multi-object
    file that is a total, silent break: `test-3.glb`'s `__root__` has 8 children,
    4 of them posed, and all 4 collapsed onto the origin. Reachable through
    `b3dAircraft({ url })`, which always hands the glTF `__root__` straight here.
  
    With more than one child we cannot know which is "the" content — the file is
    a SCENE, and its layout is data, not dressing. So leave it entirely alone:
    dropping a transform we were not asked about is how a model turns into a
    pile. The single-child case is the one this function was written for, and the
    one MIGRATION.md documents.
  
    WHICH PATH GETS HERE, because it is easy to measure the wrong one: only the
    `url:` path. The LIBRARY path hands us an already-renamed clone, so
    `isGltfRoot` is false and this block never runs — and it does not need to,
    because `clone.position.set(0, 0, 0)` above already zeroes the instantiated
    node's own transform. The library path has always been correct.
    */
    if (content.length === 1) {
        const t = content[0];
        t.position.set(0, 0, 0);
        t.rotationQuaternion = BABYLON.Quaternion.Identity();
        t.rotation.set(0, 0, 0);
    }
    return wrapper;
}
export function normalizeScale(mesh) {
    const hadQ = mesh.rotationQuaternion != null;
    const r = mesh.rotationQuaternion
        ? mesh.rotationQuaternion.clone()
        : BABYLON.Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    const p = mesh.position.clone();
    mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    mesh.position.set(0, 0, 0);
    mesh.bakeCurrentTransformIntoVertices(); // bakes scale only (rot/pos identity)
    mesh.rotationQuaternion = hadQ ? r : null;
    if (!hadQ)
        mesh.rotation = r.toEulerAngles();
    mesh.position.copyFrom(p);
    return mesh;
}
/**
 * Find the node a turret should ROTATE to aim — the `_barrel` suffix.
 *
 * Same shape as `findCenterOfGravity`, and the same argument: **the model
 * declares its own moving parts.** A rigger already says where the colliders
 * and the centre of gravity are, in Blender, where they can see the geometry;
 * asking the SCENE MARKUP which node is the barrel would put model structure in
 * the document, which is exactly what these conventions exist to avoid
 * (tosijs-3d-ensemble weighed both and landed here too, #34).
 *
 * Returning null is a valid answer, not a failure: a model with no `_barrel`
 * yaws as a unit, which is right for a simple turret and lets a placed model
 * work before anyone rigs it.
 */
export function findBarrel(root) {
    return findSuffixed(root, ['_barrel']);
}
/**
 * Find the node a projectile should spawn FROM — the `_muzzle` suffix.
 *
 * Separate from the barrel because they are different questions: the barrel is
 * what rotates, the muzzle is where the round leaves. On a simple gun they are
 * the same node and only `_barrel` need exist; on a multi-barrel mount, or
 * anything with a long recoiling breech, they are not.
 */
export function findMuzzle(root) {
    return findSuffixed(root, ['_muzzle']);
}
/** Shared matcher — mirrors `conventionName`, inlined so this module stays
 * dependency-free for headless tests (see `findCenterOfGravity`). */
function findSuffixed(root, suffixes) {
    const match = (n) => {
        const lower = n.name.split('.model').join('').toLowerCase();
        return suffixes.some((sfx) => lower.includes(sfx));
    };
    return (root
        .getDescendants(false)
        .find((n) => n instanceof BABYLON.TransformNode && match(n)) ?? null);
}
/**
 * Find a model's **centre-of-gravity marker** — a descendant whose name
 * carries the `_centerOfGravity` suffix (underscore variant
 * `_center_of_gravity` works too, and it composes with `.model` like every
 * behaviour suffix). The vehicle node convention: the ROOT origin is the
 * on-ground stance point (centred, grounded — `y = terrainHeight` parks it);
 * the CoG marker says where the craft pivots in flight. Returns null when the
 * model doesn't declare one.
 */
export function findCenterOfGravity(root) {
    const match = (n) => {
        // mirrors conventionName (b3d-utils) — inlined so this module stays
        // dependency-free for headless tests
        const lower = n.name.split('.model').join('').toLowerCase();
        return (lower.includes('_centerofgravity') || lower.includes('_center_of_gravity'));
    };
    return (root
        .getDescendants(false)
        .find((n) => n instanceof BABYLON.TransformNode && match(n)) ?? null);
}
/**
 * Make `control` (a canonicalized vehicle wrapper) **pivot about the model's
 * declared centre of gravity** while its position keeps meaning the root's
 * on-ground stance point. With level attitude the pivot is inert — parking
 * (`y = terrainHeight`) is unchanged; under pitch/roll the craft rotates
 * about the CoG and the stance origin swings, which is the physically-honest
 * motion. No marker → no-op. Returns the marker node (or null) so callers
 * can expose it (debug, camera anchoring).
 */
export function applyCenterOfGravity(control) {
    const cog = findCenterOfGravity(control);
    if (!cog)
        return null;
    control.computeWorldMatrix(true);
    cog.computeWorldMatrix(true);
    const local = BABYLON.Vector3.TransformCoordinates(cog.getAbsolutePosition(), BABYLON.Matrix.Invert(control.getWorldMatrix()));
    control.setPivotPoint(local);
    return cog;
}
//# sourceMappingURL=model-transform.js.map