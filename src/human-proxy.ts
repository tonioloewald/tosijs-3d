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
  coveredBy,
  coveredTriangles,
  drawnPositions,
  fitProxy,
  inflate,
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
  // Hair is many fine strands, which scatter light: a broad, soft highlight,
  // not a mirror. At 0.45 under an environment it shone like wet plastic.
  m.roughness = proxy.category === 'clothes' ? 0.8 : 0.72
  if (proxy.category !== 'clothes') m.environmentIntensity = 0.5
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
  material?: BABYLON.Material,
  options: {
    /** Push it out from a point (a hat over hair, from the skull's middle). */
    inflate?: { centre: { x: number; y: number; z: number }; by: number }
  } = {}
): BABYLON.Mesh {
  const drawn = drawnPositions(proxy, fitProxy(proxy, positions))
  if (options.inflate) inflate(drawn, options.inflate.centre, options.inflate.by)
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
 * Hide the body's skin under what it wears. Triangles wholly under a garment
 * are dropped, and the skin it covers (listed, or found by `coveredBy` from
 * `drawn`) is TUCKED: drawn in along its normal by
 * `tuck` metres, so where a garment's edge and its listed vertices disagree
 * the skin dips under the edge instead of leaving a hole. `triangles` and
 * `vertices` are the body's compact skin (`humanSkin`).
 */
export function coverBody(
  built: BuiltRig,
  triangles: ArrayLike<number>,
  vertices: ArrayLike<number>,
  wearing: (HumanProxy | null)[],
  options: {
    tuck?: number
    /**
     * The worn garments' drawn positions (by proxy name, the pack's frame),
     * so skin they cover but do not list is found by geometry and tucked too.
     */
    drawn?: Map<string, Float32Array>
  } = {}
): void {
  const mesh = built.mesh
  // The untucked shape, kept from the first call (tucks must not accumulate).
  const meta = (mesh.metadata ??= {}) as { untucked?: Float32Array; normals?: Float32Array }
  if (meta.untucked == null) {
    meta.untucked = Float32Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!)
    meta.normals = Float32Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)!)
  }
  const deleted = new Set<number>()
  for (const p of wearing) if (p?.delete) for (const v of p.delete) deleted.add(v)
  const positions = Float32Array.from(meta.untucked)
  const tuck = options.tuck ?? 0.006
  const n = meta.normals!
  // How deep each compact vertex goes: listed ones by `tuck`; ones a garment
  // covers by geometry deeper (knees and thighs bend under trousers).
  const depth = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i++) if (deleted.has(vertices[i])) depth[i] = tuck
  for (const p of wearing) {
    if (p == null || p.category !== 'clothes') continue
    const g = options.drawn?.get(p.name)
    if (g == null) continue
    const gap = coveredBy(meta.untucked, n, g)
    const lower = p.slot === 'bottom' || p.slot === 'outfit'
    for (let i = 0; i < gap.length; i++) {
      if (gap[i] === Infinity) continue
      depth[i] = Math.max(depth[i], (lower ? 0.014 : 0.008) + gap[i] * 0.5)
    }
  }
  for (let i = 0; i < vertices.length; i++) {
    if (depth[i] === 0) continue
    positions[i * 3] -= n[i * 3] * depth[i]
    positions[i * 3 + 1] -= n[i * 3 + 1] * depth[i]
    positions[i * 3 + 2] -= n[i * 3 + 2] * depth[i]
  }
  // set, not update: an update to a buffer made without `updatable` is a
  // silent no-op in Babylon.
  mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true)
  mesh.setIndices(
    deleted.size ? coveredTriangles(triangles, vertices, deleted, 'all') : Array.from(triangles)
  )
}
