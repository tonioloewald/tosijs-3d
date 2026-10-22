/*#
# human-proxy

A [human pack](/human-pack/)'s clothes, hair and brows on a built body:
fitted by [proxy-fit](/proxy-fit/)'s binding (so they follow every body
shape), skinned to the body's own skeleton with weights borrowed from the
skin they are bound to (so they bend with it), and drawn with their own
textures. `coverBody` hides the skin a garment covers, so it cannot poke
through.

The [character builder](/character-builder/) dresses its walker this way:
MakeHuman's CC0 casual, work and formal suits, shoes, a fedora, and its hair
and brows beside Quaternius'.
*/
/*{ "parent": "character-builder", "order": 66 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanProxy } from './human-pack.js'
import type { BuiltRig } from './rig-build.js'
import {
  coveredTriangles,
  drawnPositions,
  fitProxy,
  proxyWeights,
  type VertexWeights,
} from './proxy-fit.js'

/**
 * A material for a proxy from its own textures, or one of its alternate
 * `look`s (colourways; `proxy.material.looks`).
 */
export function proxyMaterial(
  scene: BABYLON.Scene,
  proxy: HumanProxy,
  look?: string
): BABYLON.PBRMaterial {
  const alt = look != null ? proxy.material.looks?.[look] : undefined
  const textures = alt ?? proxy.material
  const m = new BABYLON.PBRMaterial(`proxy-${proxy.name}${alt ? `-${look}` : ''}`, scene)
  m.metallic = 0
  m.roughness = proxy.category === 'clothes' ? 0.8 : 0.45
  if (textures.diffuse) {
    // OBJ's V runs up, as an image loaded with Babylon's default flip expects.
    m.albedoTexture = new BABYLON.Texture(textures.diffuse, scene)
  }
  if (textures.normal ?? proxy.material.normal) {
    m.bumpTexture = new BABYLON.Texture((textures.normal ?? proxy.material.normal)!, scene)
  }
  if (proxy.material.alpha && m.albedoTexture) {
    m.albedoTexture.hasAlpha = true
    m.useAlphaFromAlbedoTexture = true
    m.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST
    m.alphaCutOff = 0.4
  }
  m.backFaceCulling = !proxy.material.twoSided
  return m
}

/**
 * A proxy on a built body. `positions` are the morphed pack positions the
 * body was built from (every vertex); `weights` has skin weights for every
 * base vertex (`nearestWeights`).
 */
export function humanProxy(
  scene: BABYLON.Scene,
  built: BuiltRig,
  proxy: HumanProxy,
  positions: ArrayLike<number>,
  weights: VertexWeights,
  material?: BABYLON.Material
): BABYLON.Mesh {
  const drawn = drawnPositions(proxy, fitProxy(proxy, positions))
  const mesh = new BABYLON.Mesh(`proxy-${proxy.name}`, scene)
  const data = new BABYLON.VertexData()
  data.positions = drawn
  data.indices = Array.from(proxy.triangles)
  data.uvs = proxy.uvs
  const normals: number[] = []
  // Counter-clockwise, outward: the file's handedness, under the rig's mirror.
  BABYLON.VertexData.ComputeNormals(drawn, data.indices, normals, {
    useRightHandedSystem: true,
  })
  data.normals = normals
  data.applyToMesh(mesh)
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  const w = proxyWeights(proxy, weights)
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind, w.indices)
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind, w.weights)
  mesh.skeleton = built.skeleton
  mesh.parent = built.root
  mesh.material = material ?? proxyMaterial(scene, proxy)
  return mesh
}

/**
 * Hide the body's skin under what it wears: its triangles less those on the
 * base vertices the proxies cover. `triangles` and `vertices` are the
 * body's compact skin (`humanSkin`).
 */
export function coverBody(
  built: BuiltRig,
  triangles: ArrayLike<number>,
  vertices: ArrayLike<number>,
  wearing: (HumanProxy | null)[]
): void {
  const deleted: number[] = []
  for (const p of wearing) if (p?.delete) deleted.push(...p.delete)
  built.mesh.setIndices(
    deleted.length ? coveredTriangles(triangles, vertices, deleted) : Array.from(triangles)
  )
}
