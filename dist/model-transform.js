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
//# sourceMappingURL=model-transform.js.map