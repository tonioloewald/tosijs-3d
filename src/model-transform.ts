/**
 * Babylon-only model transform helpers (no tosijs/DOM deps, so they're unit
 * testable headless). Used to collapse a spawned model's frame to something
 * clean — see [b3d-library](?b3d-library.ts)'s `canonical` instantiate.
 */
import * as BABYLON from '@babylonjs/core'

/**
 * Bake a mesh's scale into its vertices so the node ends up UNIT scale, WITHOUT
 * changing its orientation (nose direction) or position. The bake runs with the
 * rotation temporarily set to identity, then restores it — so only scale is
 * folded into the geometry. A scaled control node skews `forward`/`up` (non-unit,
 * non-orthogonal) and forces per-use `1/scale` neutralization; collapsing it here
 * means downstream frames stay clean.
 */
/**
 * Wrap a spawned model in a CLEAN control node: an identity, unit-scale
 * TransformNode whose +Z is the model's nose and +Y its up. The model (any
 * hierarchy, skinned or not — nothing is baked) hangs underneath, re-oriented so
 * its current forward/up land on the wrapper's +Z/+Y, keeping its own scale. So
 * the returned node — what the flight system and camera control — has a collapsed,
 * canonical frame: forward/up come out unit, no `__root__` flip or scale to fight.
 * The model's current world forward/up (measured before wrapping) define the nose.
 */
export function canonicalize(
  clone: BABYLON.TransformNode,
  scene: BABYLON.Scene,
  name: string
): BABYLON.TransformNode {
  // The model's nose sits on the node's LOCAL +Z and its top on LOCAL +Y (that's
  // why the clone's world `forward` already reads as the nose). So all we do is
  // drop the model's junk rotation (the glTF source's leftover orientation) and
  // re-parent it under a clean wrapper at identity — its nose lands on the
  // wrapper's +Z, up on +Y. The model keeps its own scale; the wrapper (the
  // control node) is unit-scale and clean.
  const wrapper = new BABYLON.TransformNode(name, scene)
  clone.parent = wrapper
  clone.rotationQuaternion = BABYLON.Quaternion.Identity()
  clone.rotation.set(0, 0, 0)
  clone.position.set(0, 0, 0)
  return wrapper
}

export function normalizeScale(mesh: BABYLON.Mesh): BABYLON.Mesh {
  const hadQ = mesh.rotationQuaternion != null
  const r = mesh.rotationQuaternion
    ? mesh.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(
        mesh.rotation.x,
        mesh.rotation.y,
        mesh.rotation.z
      )
  const p = mesh.position.clone()
  mesh.rotationQuaternion = BABYLON.Quaternion.Identity()
  mesh.position.set(0, 0, 0)
  mesh.bakeCurrentTransformIntoVertices() // bakes scale only (rot/pos identity)
  mesh.rotationQuaternion = hadQ ? r : null
  if (!hadQ) mesh.rotation = r.toEulerAngles()
  mesh.position.copyFrom(p)
  return mesh
}
