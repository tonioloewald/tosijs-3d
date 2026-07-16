/*#
# shadow-decal

A **soft blob shadow** — the oldest trick in real-time 3D, and still the right one in a lot of
places. Instead of routing a caster through the shadow map (expensive, and useless for anything
the cascaded map doesn't reach — a cloud at 140 m, a bird, a thrown grenade), you drop a dark,
soft-edged quad on the ground beneath it. It costs one textured, alpha-blended plane and no
shadow-map real estate at all.

It is deliberately NOT a real shadow: it doesn't know the caster's silhouette and it doesn't
sharpen with proximity. What it buys is *grounding* — the eye reads "this thing is above that
spot" — and for soft, high, or numerous casters (clouds, a flock, ambient debris) that reads
better than a crisp CSM shadow would anyway.

## Two ways to place one

- **`projectShadowDown`** — raycast straight down and lay the decal on whatever surface it hits
  (a character, a vehicle, a dropped item). Hugs terrain height; costs one ray per placement.
- **Flat placement** — just set `mesh.position`. For a *field* of decals (a whole cloud layer)
  a per-decal ray each frame is wasteful; sample the ground height once under the camera and
  drop every decal on that plane. Softness hides the lack of terrain-hugging.

## Sharing

All decals in a scene share **one** texture and **one** material (both cached per scene). Vary a
decal per-instance without breaking the sharing:

- **size** → `mesh.scaling.x/z`
- **darkness** → `mesh.visibility` (0…1, multiplies the blended alpha — works precisely because
  the material is shared and visibility is per-mesh)

That's the same discipline the clouds use for their blobs: one material, per-mesh transform and
visibility. See [b3d-clouds](?b3d-clouds.ts), the first consumer.
*/
/*{ "parent": "Effects" }*/

import * as BABYLON from '@babylonjs/core'

const TEX_CACHE = new WeakMap<BABYLON.Scene, BABYLON.DynamicTexture>()
const MAT_CACHE = new WeakMap<BABYLON.Scene, BABYLON.StandardMaterial>()

/** Lift a decal this far off the surface it sits on, to keep it out of a z-fight with the ground. */
const DEFAULT_BIAS = 0.05

/** A soft round dark blob: opaque-ish at the centre, fading to fully transparent at the rim.
 * Cached per scene — every decal shares it. */
export function softShadowTexture(
  scene: BABYLON.Scene,
  resolution = 128
): BABYLON.DynamicTexture {
  const cached = TEX_CACHE.get(scene)
  if (cached) return cached
  const tex = new BABYLON.DynamicTexture(
    'shadow-decal-tex',
    { width: resolution, height: resolution },
    scene,
    false
  )
  const r = resolution / 2
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  // A soft foot: strong core, a long shoulder, nothing at the very edge (no visible disc rim).
  g.addColorStop(0, 'rgba(0,0,0,0.75)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.5)')
  g.addColorStop(0.8, 'rgba(0,0,0,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, resolution, resolution)
  tex.update()
  tex.hasAlpha = true
  TEX_CACHE.set(scene, tex)
  return tex
}

/** The shared, unlit, alpha-blended black material every decal draws with. Cached per scene. */
export function shadowDecalMaterial(
  scene: BABYLON.Scene
): BABYLON.StandardMaterial {
  const cached = MAT_CACHE.get(scene)
  if (cached) return cached
  const mat = new BABYLON.StandardMaterial('shadow-decal-mat', scene)
  mat.diffuseTexture = softShadowTexture(scene)
  mat.useAlphaFromDiffuseTexture = true
  mat.disableLighting = true // it IS the shadow — don't let the scene light it
  mat.diffuseColor = BABYLON.Color3.Black()
  mat.emissiveColor = BABYLON.Color3.Black()
  mat.specularColor = BABYLON.Color3.Black()
  mat.backFaceCulling = false
  MAT_CACHE.set(scene, mat)
  return mat
}

export interface ShadowDecalOptions {
  /** World diameter of the blob at scaling 1. Default 1 — set via `mesh.scaling` per instance too. */
  size?: number
  name?: string
}

/** A single flat, ground-facing soft-shadow quad using the shared decal material. Not pickable,
 * casts/receives no real shadows. Size via `mesh.scaling.x/z`, darkness via `mesh.visibility`. */
export function createShadowDecal(
  scene: BABYLON.Scene,
  opts: ShadowDecalOptions = {}
): BABYLON.Mesh {
  const size = opts.size ?? 1
  // CreateGround is already a horizontal XZ plane with its normal facing +Y — exactly a decal.
  const mesh = BABYLON.MeshBuilder.CreateGround(
    opts.name ?? 'shadow-decal',
    { width: 1, height: 1 },
    scene
  )
  mesh.material = shadowDecalMaterial(scene)
  mesh.scaling.x = mesh.scaling.z = size
  mesh.isPickable = false
  mesh.receiveShadows = false
  mesh.doNotSyncBoundingInfo = true
  // Alpha-blended, so it renders in the transparent pass over the opaque ground anyway; the y-bias
  // (at placement) is what actually keeps it off the surface.
  return mesh
}

export interface ProjectDownOptions {
  /** How high above `x,z` to start the downward ray. Should clear the caster. Default 200. */
  fromHeight?: number
  /** How far down to look for a surface. Default 1000. */
  maxDistance?: number
  /** Lift off the hit surface to avoid z-fighting. Default 0.05. */
  bias?: number
  /** Which meshes count as ground. Default: any pickable mesh (skip the caster via this). */
  predicate?: (m: BABYLON.AbstractMesh) => boolean
}

/** Lay `decal` flat on the first surface directly below `(x, z)`. Returns false (and leaves the
 * decal where it was) if nothing was hit. One raycast — fine for a single caster (character,
 * vehicle, dropped item); for a whole FIELD, place flat on a shared sampled plane instead. */
export function projectShadowDown(
  decal: BABYLON.Mesh,
  scene: BABYLON.Scene,
  x: number,
  z: number,
  opts: ProjectDownOptions = {}
): boolean {
  const from = opts.fromHeight ?? 200
  const ray = new BABYLON.Ray(
    new BABYLON.Vector3(x, from, z),
    BABYLON.Vector3.Down(),
    opts.maxDistance ?? 1000
  )
  const predicate =
    opts.predicate ?? ((m: BABYLON.AbstractMesh) => m.isPickable)
  const hit = scene.pickWithRay(ray, predicate)
  if (!hit?.pickedPoint) return false
  decal.position.copyFrom(hit.pickedPoint)
  decal.position.y += opts.bias ?? DEFAULT_BIAS
  return true
}
