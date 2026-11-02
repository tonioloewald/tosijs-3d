/*#
# skinned-glb

**A skinned, morphing mesh out as a GLB.** `writeSkinnedGlb` writes one
skeleton, any number of meshes skinned to it (four influences a vertex), each
with morph targets named in `extras.targetNames`, and plain glTF
metallic-roughness materials with their images embedded. Pure: no Babylon,
no DOM, synchronous, bytes out. It is `writeGarmentGlb`'s sibling for rigged
bodies, which that writer does not do (no skin, no morphs).

Part of the [character core](/character-core/): import it as
`tosijs-3d/skinned-glb`. Written for Dramatis's character exporter (GLB and
VRM), and checked against the Khronos validator and Babylon's own loader.

```javascript
import { writeSkinnedGlb } from 'tosijs-3d/skinned-glb'
const bytes = writeSkinnedGlb({ asset, joints, skinName, skeletonRoot, inverseBindMatrices, meshes, materials, images })
```

What it guarantees, so the Khronos validator is clean:

- joints are nodes `0..n-1`, in the order given, each parent before its
  children; every mesh is its own top-level node with no transform;
- `POSITION` accessors (and every morph target's) carry `min` and `max`;
- normals are unit length (a zero normal becomes +Y); weights are
  renormalised in float32 so each vertex's sum is 1, and a joint never
  appears twice in one vertex's non-zero slots;
- indices are `UNSIGNED_SHORT` below 65,535 vertices, `UNSIGNED_INT` above;
- morph targets are sparse accessors over the vertices they move (a target
  that moves nothing is the caller's to leave out; one here throws);
- `KHR_materials_sheen` is listed in `extensionsUsed` only when a material
  has sheen; nothing is ever required.
*/
/*{ "parent": "character-core", "order": 30 }*/
import { BinBuilder, writeGlb } from './glb-chunks.js'

/** x, y, z. */
export type GlbVec3 = readonly [number, number, number]
/** x, y, z, w. */
export type GlbQuat = readonly [number, number, number, number]

export interface GlbJoint {
  name: string
  /** Index of the parent in `joints`, or -1 for a top-level joint. */
  parent: number
  translation: GlbVec3
  rotation: GlbQuat
}

export interface GlbMorph {
  /** xyz delta per vertex. */
  positions: Float32Array
}

export interface GlbPrimitive {
  positions: Float32Array
  normals: Float32Array
  /** glTF's convention (v down from the top of the image), or omitted. */
  uvs?: Float32Array | null
  /** Four joint indices (into `joints`) per vertex. */
  joints: ArrayLike<number>
  /** Four weights per vertex. */
  weights: ArrayLike<number>
  /** Triangles, counter-clockwise from outside. */
  indices: ArrayLike<number>
  /** Index into `materials`. */
  material: number
  /** One per entry of the mesh's `targetNames`. */
  targets?: GlbMorph[]
}

export interface GlbMesh {
  name: string
  primitives: GlbPrimitive[]
  /** The morph targets' names, one per target (every primitive has them all). */
  targetNames?: string[]
}

export interface GlbTexture {
  /** Index into `images`. */
  image: number
}

export interface GlbMaterial {
  name: string
  baseColorFactor: readonly [number, number, number, number]
  baseColorTexture?: GlbTexture
  metallicFactor: number
  roughnessFactor: number
  metallicRoughnessTexture?: GlbTexture
  normalTexture?: GlbTexture & { scale: number }
  occlusionTexture?: GlbTexture & { strength: number }
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND'
  alphaCutoff?: number
  doubleSided: boolean
  sheen?: {
    colorFactor: readonly [number, number, number]
    roughnessFactor: number
  }
}

export interface GlbImage {
  name: string
  mimeType: 'image/png' | 'image/jpeg'
  bytes: Uint8Array
}

export interface SkinnedGlb {
  asset: {
    generator: string
    copyright?: string
    extras?: Record<string, unknown>
  }
  /** The skeleton. */
  joints: GlbJoint[]
  /** The skin's name. */
  skinName: string
  /** Index into `joints` of the skin's `skeleton` (its common root). */
  skeletonRoot: number
  /** 16 column-major numbers per joint. */
  inverseBindMatrices: Float32Array
  meshes: GlbMesh[]
  materials: GlbMaterial[]
  images: GlbImage[]
}

const FLOAT = 5126
const UNSIGNED_BYTE = 5121
const UNSIGNED_SHORT = 5123
const UNSIGNED_INT = 5125
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963

type Json = Record<string, unknown>

const asBytes = (a: ArrayBufferView): Uint8Array =>
  new Uint8Array(a.buffer, a.byteOffset, a.byteLength)

function bounds(v: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < v.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const x = v[i + k]!
      if (x < min[k]!) min[k] = x
      if (x > max[k]!) max[k] = x
    }
  return { min, max }
}

/** Unit normals, float32; a zero or non-finite one becomes +Y. */
export function unitNormals(normals: ArrayLike<number>): Float32Array {
  const out = new Float32Array(normals.length)
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i]!
    const y = normals[i + 1]!
    const z = normals[i + 2]!
    const l = Math.hypot(x, y, z)
    if (!(l > 1e-12) || !Number.isFinite(l)) {
      out[i + 1] = 1
      continue
    }
    out[i] = x / l
    out[i + 1] = y / l
    out[i + 2] = z / l
  }
  return out
}

/**
 * Four influences per vertex as glTF wants them: duplicate joints merged,
 * negative or non-finite weights dropped, the rest renormalised so the
 * float32 sum is 1 (the remainder goes to the largest), unused slots joint 0
 * weight 0. A vertex with no weight at all is given to `fallback` wholly.
 */
export function normaliseInfluences(
  joints: ArrayLike<number>,
  weights: ArrayLike<number>,
  fallback = 0
): {
  joints: Uint8Array | Uint16Array
  weights: Float32Array
  maxJoint: number
} {
  const n = weights.length / 4
  let maxJoint = fallback
  for (let i = 0; i < joints.length; i++)
    if (weights[i]! > 0) maxJoint = Math.max(maxJoint, joints[i]!)
  const j = maxJoint < 256 ? new Uint8Array(n * 4) : new Uint16Array(n * 4)
  const w = new Float32Array(n * 4)
  const f = new Float32Array(1)
  for (let v = 0; v < n; v++) {
    const acc = new Map<number, number>()
    for (let k = 0; k < 4; k++) {
      const x = weights[v * 4 + k]!
      if (!(x > 0) || !Number.isFinite(x)) continue
      const jj = joints[v * 4 + k]!
      acc.set(jj, (acc.get(jj) ?? 0) + x)
    }
    const list = [...acc.entries()].sort((a, b) => b[1] - a[1])
    if (list.length === 0) list.push([fallback, 1])
    const sum = list.reduce((s, [, x]) => s + x, 0)
    let total = 0
    list.forEach(([jj, x], k) => {
      j[v * 4 + k] = jj
      f[0] = x / sum
      w[v * 4 + k] = f[0]!
      total += f[0]!
    })
    // Put the float32 rounding into the largest weight.
    f[0] = w[v * 4]! + (1 - total)
    w[v * 4] = f[0]!
  }
  return { joints: j, weights: w, maxJoint }
}

/** The GLB's bytes. Throws on input glTF could not represent. */
export function writeSkinnedGlb(g: SkinnedGlb): Uint8Array {
  const bin = new BinBuilder()
  const accessors: Json[] = []
  const accessor = (a: Json): number => {
    accessors.push(a)
    return accessors.length - 1
  }

  const n = g.joints.length
  if (g.inverseBindMatrices.length !== n * 16)
    throw new Error(
      `skinned-glb: ${n} joints, ${
        g.inverseBindMatrices.length / 16
      } inverse bind matrices`
    )
  g.joints.forEach((jt, i) => {
    if (jt.parent >= i)
      throw new Error(`skinned-glb: joint ${jt.name}'s parent comes after it`)
  })

  // Nodes: the joints first, then one per mesh.
  const nodes: Json[] = g.joints.map((jt) => ({
    name: jt.name,
    translation: [...jt.translation],
    rotation: [...jt.rotation],
  }))
  const children = new Map<number, number[]>()
  g.joints.forEach((jt, i) => {
    if (jt.parent < 0) return
    const list = children.get(jt.parent) ?? []
    list.push(i)
    children.set(jt.parent, list)
  })
  for (const [p, list] of children) nodes[p]!.children = list
  const topJoints = g.joints.flatMap((jt, i) => (jt.parent < 0 ? [i] : []))

  const ibm = accessor({
    bufferView: bin.add(asBytes(Float32Array.from(g.inverseBindMatrices))),
    componentType: FLOAT,
    count: n,
    type: 'MAT4',
  })
  const skins = [
    {
      name: g.skinName,
      inverseBindMatrices: ibm,
      skeleton: g.skeletonRoot,
      joints: g.joints.map((_, i) => i),
    },
  ]

  const meshes: Json[] = g.meshes.map((mesh) => {
    const names = mesh.targetNames ?? []
    const primitives = mesh.primitives.map((p) => {
      const count = p.positions.length / 3
      if (p.normals.length !== count * 3)
        throw new Error(
          `skinned-glb: ${mesh.name}: normals are not one per vertex`
        )
      const attributes: Json = {}
      const pos = Float32Array.from(p.positions)
      attributes.POSITION = accessor({
        bufferView: bin.add(asBytes(pos), ARRAY_BUFFER),
        componentType: FLOAT,
        count,
        type: 'VEC3',
        ...bounds(pos),
      })
      attributes.NORMAL = accessor({
        bufferView: bin.add(asBytes(unitNormals(p.normals)), ARRAY_BUFFER),
        componentType: FLOAT,
        count,
        type: 'VEC3',
      })
      if (p.uvs != null) {
        if (p.uvs.length !== count * 2)
          throw new Error(
            `skinned-glb: ${mesh.name}: uvs are not one per vertex`
          )
        attributes.TEXCOORD_0 = accessor({
          bufferView: bin.add(asBytes(Float32Array.from(p.uvs)), ARRAY_BUFFER),
          componentType: FLOAT,
          count,
          type: 'VEC2',
        })
      }
      const inf = normaliseInfluences(p.joints, p.weights)
      if (inf.maxJoint >= n)
        throw new Error(
          `skinned-glb: ${mesh.name}: joint ${inf.maxJoint} is not in the skeleton`
        )
      if (inf.joints.length !== count * 4)
        throw new Error(
          `skinned-glb: ${mesh.name}: influences are not four per vertex`
        )
      attributes.JOINTS_0 = accessor({
        bufferView: bin.add(asBytes(inf.joints), ARRAY_BUFFER),
        componentType:
          inf.joints instanceof Uint8Array ? UNSIGNED_BYTE : UNSIGNED_SHORT,
        count,
        type: 'VEC4',
      })
      attributes.WEIGHTS_0 = accessor({
        bufferView: bin.add(asBytes(inf.weights), ARRAY_BUFFER),
        componentType: FLOAT,
        count,
        type: 'VEC4',
      })
      const m = g.materials[p.material]
      if (m === undefined)
        throw new Error(`skinned-glb: ${mesh.name}: no material ${p.material}`)
      if (
        p.uvs == null &&
        (m.baseColorTexture ||
          m.metallicRoughnessTexture ||
          m.normalTexture ||
          m.occlusionTexture)
      )
        throw new Error(
          `skinned-glb: ${mesh.name}: its material is textured but has no uvs`
        )
      const wide = count >= 65535
      const idx = wide
        ? Uint32Array.from(p.indices)
        : Uint16Array.from(p.indices)
      for (const i of idx)
        if (i >= count)
          throw new Error(
            `skinned-glb: ${mesh.name}: index ${i} past ${count} vertices`
          )
      const prim: Json = {
        attributes,
        indices: accessor({
          bufferView: bin.add(asBytes(idx), ELEMENT_ARRAY_BUFFER),
          componentType: wide ? UNSIGNED_INT : UNSIGNED_SHORT,
          count: idx.length,
          type: 'SCALAR',
        }),
        material: p.material,
        mode: 4,
      }
      const targets = p.targets ?? []
      if (targets.length !== names.length)
        throw new Error(
          `skinned-glb: ${mesh.name}: ${targets.length} targets, ${names.length} names`
        )
      if (targets.length > 0)
        prim.targets = targets.map((t, k) => ({
          POSITION: sparseTarget(
            bin,
            accessor,
            t.positions,
            count,
            `${mesh.name}/${names[k]}`
          ),
        }))
      return prim
    })
    const out: Json = { name: mesh.name, primitives }
    if (names.length > 0) {
      out.weights = names.map(() => 0)
      out.extras = { targetNames: [...names] }
    }
    return out
  })

  const meshNodes = g.meshes.map((mesh, i) => {
    nodes.push({ name: mesh.name, mesh: i, skin: 0 })
    return nodes.length - 1
  })

  const images = g.images.map((im) => ({
    name: im.name,
    mimeType: im.mimeType,
    bufferView: bin.add(im.bytes),
  }))
  const textures: Json[] = []
  const textureFor = new Map<number, number>()
  const texture = (t: GlbTexture): number => {
    if (t.image < 0 || t.image >= images.length)
      throw new Error(`skinned-glb: no image ${t.image}`)
    let i = textureFor.get(t.image)
    if (i === undefined) {
      textures.push({ source: t.image, sampler: 0 })
      i = textures.length - 1
      textureFor.set(t.image, i)
    }
    return i
  }
  let sheen = false
  const materials = g.materials.map((m) => {
    const pbr: Json = {
      baseColorFactor: [...m.baseColorFactor],
      metallicFactor: m.metallicFactor,
      roughnessFactor: m.roughnessFactor,
    }
    if (m.baseColorTexture)
      pbr.baseColorTexture = { index: texture(m.baseColorTexture) }
    if (m.metallicRoughnessTexture)
      pbr.metallicRoughnessTexture = {
        index: texture(m.metallicRoughnessTexture),
      }
    const out: Json = {
      name: m.name,
      pbrMetallicRoughness: pbr,
      alphaMode: m.alphaMode,
      doubleSided: m.doubleSided,
    }
    if (m.alphaMode === 'MASK') out.alphaCutoff = m.alphaCutoff ?? 0.5
    if (m.normalTexture)
      out.normalTexture = {
        index: texture(m.normalTexture),
        scale: m.normalTexture.scale,
      }
    if (m.occlusionTexture)
      out.occlusionTexture = {
        index: texture(m.occlusionTexture),
        strength: m.occlusionTexture.strength,
      }
    if (m.sheen) {
      sheen = true
      out.extensions = {
        KHR_materials_sheen: {
          sheenColorFactor: [...m.sheen.colorFactor],
          sheenRoughnessFactor: m.sheen.roughnessFactor,
        },
      }
    }
    return out
  })

  const bytes = bin.bytes()
  const json: Json = {
    asset: {
      version: '2.0',
      generator: g.asset.generator,
      ...(g.asset.copyright ? { copyright: g.asset.copyright } : {}),
      ...(g.asset.extras ? { extras: g.asset.extras } : {}),
    },
    ...(sheen ? { extensionsUsed: ['KHR_materials_sheen'] } : {}),
    scene: 0,
    scenes: [{ nodes: [...topJoints, ...meshNodes] }],
    nodes,
    meshes,
    skins,
    accessors,
    bufferViews: bin.views,
    buffers: [{ byteLength: bytes.byteLength }],
  }
  if (materials.length > 0) json.materials = materials
  if (images.length > 0) {
    json.images = images
    json.textures = textures
    json.samplers = [
      { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
    ]
  }
  return writeGlb(json, bytes)
}

/** A morph target's POSITION as a sparse accessor over the vertices it moves. */
function sparseTarget(
  bin: BinBuilder,
  accessor: (a: Json) => number,
  delta: Float32Array,
  count: number,
  label: string
): number {
  if (delta.length !== count * 3)
    throw new Error(`skinned-glb: target ${label} is not one delta per vertex`)
  const moved: number[] = []
  for (let v = 0; v < count; v++)
    if (delta[v * 3] !== 0 || delta[v * 3 + 1] !== 0 || delta[v * 3 + 2] !== 0)
      moved.push(v)
  if (moved.length === 0)
    throw new Error(`skinned-glb: target ${label} moves no vertex`)
  const values = new Float32Array(moved.length * 3)
  moved.forEach((v, k) => {
    values[k * 3] = delta[v * 3]!
    values[k * 3 + 1] = delta[v * 3 + 1]!
    values[k * 3 + 2] = delta[v * 3 + 2]!
  })
  const b = bounds(values)
  if (moved.length < count)
    for (let k = 0; k < 3; k++) {
      // The vertices left out are 0.
      b.min[k] = Math.min(b.min[k]!, 0)
      b.max[k] = Math.max(b.max[k]!, 0)
    }
  const wide = count > 65535
  const indices = wide ? Uint32Array.from(moved) : Uint16Array.from(moved)
  return accessor({
    componentType: FLOAT,
    count,
    type: 'VEC3',
    ...b,
    sparse: {
      count: moved.length,
      indices: {
        bufferView: bin.add(asBytes(indices)),
        componentType: wide ? UNSIGNED_INT : UNSIGNED_SHORT,
      },
      values: { bufferView: bin.add(asBytes(values)) },
    },
  })
}
