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
 * THE canonical model frame — defined here, once (issues #5/#6, manta-recon).
 *
 * Content convention: authored **Blender-default** (−Y forward, +Z up, all
 * transforms applied). Through the exporter (front → glTF +Z) and Babylon's
 * LH read, that content arrives facing engine **−Z**; the collapse yaws it π
 * so **content-front lands on the wrapper's +Z** — the engine's forward. One
 * mapping, one place: never fix orientation per-asset or per-call-site.
 *
 * The collapse also:
 * - **strips handedness mirrors**: Babylon's glTF `__root__` carries
 *   scale (1,1,−1) + yaw 180° (net X-mirror, determinant −1). A control node
 *   with a negative-determinant frame flips chirality for everything computed
 *   through it — inverted pitch, chase camera on the nose side (issue #5).
 *   Scale signs are dropped (magnitudes kept).
 * - drops the node's authored junk rotation/position (scene-layout leftovers).
 *
 * The returned wrapper — what flight systems and cameras control — is
 * identity: unit rotation, unit scale, det +1. Legacy +Y-forward content will
 * face backwards through this collapse: re-export it, don't rotate it.
 */
export function canonicalize(
  clone: BABYLON.TransformNode,
  scene: BABYLON.Scene,
  name: string
): BABYLON.TransformNode {
  const wrapper = new BABYLON.TransformNode(name, scene)
  clone.parent = wrapper
  // Content-front (engine −Z after the LH read) → wrapper +Z.
  clone.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
    Math.PI,
    0,
    0
  )
  clone.rotation.set(0, Math.PI, 0)
  clone.position.set(0, 0, 0)
  // Strip mirror signs (the __root__ handedness flip); keep magnitudes.
  clone.scaling.set(
    Math.abs(clone.scaling.x),
    Math.abs(clone.scaling.y),
    Math.abs(clone.scaling.z)
  )
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
