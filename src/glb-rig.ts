/*#
# glb-rig

**A mesh file's triangles for rigging, read with no engine.** The same
`BodyTriangles` that `loadRigTriangles` (rig-build) gives from a Babylon
scene, read straight from a GLB's bytes: in Bun or Node, in a worker, in a
test, or in a headless export. Hand the result to `bodyFromMarkers` with a
character file's markers and you have its `RiggedBody` with no scene at all.

```javascript
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'

const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
const tris = glbRigTriangles(bytes)
const body = bodyFromMarkers(tris, { markers, source: url })
```

What it gives, and how it agrees with the Babylon path (a test loads the
same files both ways and compares them):

- **The file's own frame**, right-handed, every node's transform applied.
  A skinned mesh is taken skinned AT REST (its joints' rest transforms times
  their inverse bind matrices), its own node's transform ignored, as glTF
  says and Babylon's loader does: a file in centimetres sized by its
  armature comes out in metres.
- **`pick`** takes one node of a library file and its children, its own
  translation dropped (so the character stands at the origin), as
  `loadRigTriangles` does. A name that is not there throws.
- **Surfaces**: one run of triangles per material, named as Babylon names
  them (the material's name, `material<i>` when it has none, made unique),
  runs that follow one another with the same material joined. Each carries
  its glTF material as data (`GltfSurfaceMaterial`): the PBR factors, alpha
  mode, two-sidedness, and each texture's IMAGE BYTES and MIME type (a
  `data:` URI decoded; an external `uri` kept as it is, unread).
- **Eyes**: meshes named as eyes (`isEyeName`) are kept out of the body and
  handed back as `eyes`, one per side, as `splitEyes` does.
- **Uvs and colours** when any mesh has them (others filled with 0 and white,
  as the Babylon path fills them); colours as RGBA floats.

Only triangle lists are read (mode 4, the default); other primitives (lines,
points, strips) are skipped. Compressed geometry (Draco, meshopt) is not
read: it throws, naming the extension.

The rig from it is DETERMINISTIC: the same bytes and the same markers give
the same weights, so a saved character exports the same every time.
*/
/*{ "parent": "glb-chunks", "order": 1 }*/

import {
  readGlb,
  accessorValues,
  type Glb,
  type GltfJson,
} from './glb-chunks.js'
import {
  isEyeName,
  splitEyes,
  type BodySurface,
  type BodyTriangles,
  type SurfaceMaterial,
} from './rigged-body.js'

/** A texture a material uses: its picture's bytes (or its URI), and which uvs. */
export interface GltfTextureRef {
  /** The image's bytes, when the file holds them (a buffer view or a `data:` URI). */
  bytes?: Uint8Array
  mimeType?: string
  /** An external image, not read. */
  uri?: string
  /** Which uv set (`TEXCOORD_n`) it reads. */
  texCoord: number
}

/** A glTF material as data: what a surface of a file read by `glbRigTriangles` carries. */
export interface GltfSurfaceMaterial extends SurfaceMaterial {
  readonly name: string
  baseColorFactor: [number, number, number, number]
  metallicFactor: number
  roughnessFactor: number
  emissiveFactor: [number, number, number]
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND'
  alphaCutoff: number
  doubleSided: boolean
  baseColorTexture?: GltfTextureRef
  metallicRoughnessTexture?: GltfTextureRef
  normalTexture?: GltfTextureRef & { scale: number }
  occlusionTexture?: GltfTextureRef & { strength: number }
  emissiveTexture?: GltfTextureRef
}

export interface GlbRigOptions {
  /** One node to take, with its children (a library holds many characters). */
  pick?: string
}

/** Geometry compression we do not decode. */
const COMPRESSED = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression']

type Mat4 = number[]
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
// Column-major, as glTF writes them.
const mul = (a: Mat4, b: Mat4): Mat4 => {
  const o = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
function localMatrix(n: GltfJson, dropTranslation: boolean): Mat4 {
  if (Array.isArray(n.matrix)) {
    const m = [...n.matrix]
    if (dropTranslation) m[12] = m[13] = m[14] = 0
    return m
  }
  const [tx, ty, tz] = dropTranslation ? [0, 0, 0] : n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale ?? [1, 1, 1]
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

function base64Bytes(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function imageRef(
  glb: Glb,
  texture: GltfJson | undefined
): GltfTextureRef | undefined {
  if (texture?.index == null) return undefined
  const json = glb.json
  const source = json.textures?.[texture.index]?.source
  const image = source != null ? json.images?.[source] : undefined
  const ref: GltfTextureRef = { texCoord: texture.texCoord ?? 0 }
  if (image == null) return ref
  if (image.mimeType) ref.mimeType = image.mimeType
  if (image.bufferView != null && glb.bin != null) {
    const v = json.bufferViews[image.bufferView]
    const start = v.byteOffset ?? 0
    ref.bytes = glb.bin.slice(start, start + v.byteLength)
  } else if (typeof image.uri === 'string') {
    const data = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(image.uri)
    if (data != null && data[2]) {
      ref.bytes = base64Bytes(data[3])
      if (!ref.mimeType && data[1]) ref.mimeType = data[1]
    } else ref.uri = image.uri
  }
  return ref
}

function materialOf(
  glb: Glb,
  index: number,
  name: string
): GltfSurfaceMaterial {
  const m = glb.json.materials?.[index] ?? {}
  const pbr = m.pbrMetallicRoughness ?? {}
  const out: GltfSurfaceMaterial = {
    name,
    baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1],
    metallicFactor: pbr.metallicFactor ?? 1,
    roughnessFactor: pbr.roughnessFactor ?? 1,
    emissiveFactor: m.emissiveFactor ?? [0, 0, 0],
    alphaMode: m.alphaMode ?? 'OPAQUE',
    alphaCutoff: m.alphaCutoff ?? 0.5,
    doubleSided: m.doubleSided ?? false,
  }
  const base = imageRef(glb, pbr.baseColorTexture)
  if (base) out.baseColorTexture = base
  const mr = imageRef(glb, pbr.metallicRoughnessTexture)
  if (mr) out.metallicRoughnessTexture = mr
  const normal = imageRef(glb, m.normalTexture)
  if (normal)
    out.normalTexture = { ...normal, scale: m.normalTexture.scale ?? 1 }
  const occlusion = imageRef(glb, m.occlusionTexture)
  if (occlusion)
    out.occlusionTexture = {
      ...occlusion,
      strength: m.occlusionTexture.strength ?? 1,
    }
  const emissive = imageRef(glb, m.emissiveTexture)
  if (emissive) out.emissiveTexture = emissive
  return out
}

/** One drawable piece: a primitive of a node's mesh, in the file's frame. */
interface Piece {
  name: string
  positions: Float64Array
  indices: Uint32Array
  uvs: Float64Array | null
  colors: Float64Array | null
  /** The glTF material's index, or -1 for none. */
  material: number
}

/**
 * Where a node is, in the frame `glbRigTriangles` gives with the same
 * `pick`: an item's `_grip` (say `Pistol_grip` in a library with
 * `pick: 'Pistol.model'`). Null when the file has no such node.
 */
export function glbNodePosition(
  bytes: Uint8Array,
  name: string,
  options: { pick?: string } = {}
): { x: number; y: number; z: number } | null {
  const nodes: GltfJson[] = readGlb(bytes).json.nodes ?? []
  const parentOf = new Map<number, number>()
  nodes.forEach((n, i) => {
    for (const c of n.children ?? []) parentOf.set(c, i)
  })
  const nameOf = (i: number) => nodes[i].name || `node${i}`
  const top =
    options.pick != null
      ? nodes.findIndex((_, i) => nameOf(i) === options.pick)
      : -1
  const at = nodes.findIndex((_, i) => nameOf(i) === name)
  if (at < 0) return null
  const worldOf = (i: number): Mat4 => {
    const p = parentOf.get(i)
    return mul(
      p != null ? worldOf(p) : IDENTITY,
      localMatrix(nodes[i], i === top)
    )
  }
  const m = worldOf(at)
  return { x: m[12], y: m[13], z: m[14] }
}

/**
 * Whether the names of a file's mesh nodes are riggedBodyGlb's: a `body`, and
 * nothing but `eyes`, `held` and garments (`<slot>: <name>`) beside it. A
 * file of anyone else's with a `body` and a `hair` is taken whole.
 */
export function ownExportNames(names: string[]): boolean {
  return (
    names.includes('body') &&
    names.every(
      (n) => n === 'body' || n === 'eyes' || n === 'held' || n.includes(': ')
    )
  )
}

/**
 * A GLB's triangles for rigging, with no engine: the file's frame, skinned
 * meshes at rest, one surface per material (its glTF material as data,
 * images as bytes), eyes split out. `pick` takes one node and its children.
 * Throws when the file is not a GLB, has no triangles, or `pick` names
 * nothing in it.
 */
export function glbRigTriangles(
  bytes: Uint8Array,
  options: GlbRigOptions = {}
): BodyTriangles & {
  surfaces?: Array<BodySurface & { material?: GltfSurfaceMaterial }>
} {
  const glb = readGlb(bytes)
  const json = glb.json
  for (const ext of json.extensionsRequired ?? [])
    if (COMPRESSED.includes(ext))
      throw new Error(
        `glbRigTriangles: ${ext} is not read; export uncompressed`
      )
  const nodes: GltfJson[] = json.nodes ?? []
  const parentOf = new Map<number, number>()
  nodes.forEach((n, i) => {
    for (const c of n.children ?? []) parentOf.set(c, i)
  })
  const nameOf = (i: number) => nodes[i].name || `node${i}`

  let top: number | undefined
  if (options.pick != null) {
    top = nodes.findIndex((n, i) => nameOf(i) === options.pick)
    if (top < 0) throw new Error(`no "${options.pick}" in the file`)
  }
  const under = (i: number) => {
    if (top == null) return true
    for (let k: number | undefined = i; k != null; k = parentOf.get(k))
      if (k === top) return true
    return false
  }

  // Every node's place in the scene (the picked node's own translation dropped).
  const world: Mat4[] = new Array(nodes.length)
  const worldOf = (i: number): Mat4 => {
    if (world[i] == null) {
      const p = parentOf.get(i)
      world[i] = mul(
        p != null ? worldOf(p) : IDENTITY,
        localMatrix(nodes[i], i === top)
      )
    }
    return world[i]
  }

  // The scene's nodes, depth first, in the order Babylon's loader makes them.
  const order: number[] = []
  const visit = (i: number) => {
    order.push(i)
    for (const c of nodes[i].children ?? []) visit(c)
  }
  const scene = json.scenes?.[json.scene ?? 0]
  for (const i of scene?.nodes ??
    nodes.map((_, i) => i).filter((i) => !parentOf.has(i)))
    visit(i)

  // OUR OWN EXPORT (riggedBodyGlb): read back as a body, only its skin and
  // eyes are the body; its garments and held item, merged in, lay over the
  // skin and broke the cut. Known by its names (`ownExportNames`), on NODES,
  // as Babylon's loader names a mesh (omnidude's MESH is called 'body' too).
  const meshNamed = (i: number, name: string) => nameOf(i) === name
  const ownExport = ownExportNames(
    order.filter((i) => nodes[i].mesh != null && under(i)).map(nameOf)
  )

  const pieces: Piece[] = []
  for (const i of order) {
    const node = nodes[i]
    if (node.mesh == null || !under(i)) continue
    if (ownExport && !meshNamed(i, 'body') && !meshNamed(i, 'eyes')) continue
    const prims: GltfJson[] = json.meshes[node.mesh].primitives
    const skin = node.skin != null ? json.skins?.[node.skin] : undefined
    // A skin's joint matrices at rest: the joint's place times its inverse bind.
    const jointMatrices = skin
      ? (skin.joints as number[]).map((j, k) => {
          const ibm =
            skin.inverseBindMatrices != null
              ? Array.from(
                  accessorValues(glb, skin.inverseBindMatrices).subarray(
                    k * 16,
                    k * 16 + 16
                  )
                )
              : IDENTITY
          return mul(worldOf(j), ibm)
        })
      : null
    const m = jointMatrices ? null : worldOf(i)
    prims.forEach((prim, p) => {
      if ((prim.mode ?? 4) !== 4 || prim.attributes?.POSITION == null) return
      const raw = accessorValues(glb, prim.attributes.POSITION)
      const count = raw.length / 3
      if (count === 0) return
      const positions = new Float64Array(raw.length)
      if (jointMatrices) {
        const joints = accessorValues(glb, prim.attributes.JOINTS_0)
        const weights = weightValues(glb, prim.attributes.WEIGHTS_0)
        for (let v = 0; v < count; v++) {
          const x = raw[v * 3]
          const y = raw[v * 3 + 1]
          const z = raw[v * 3 + 2]
          let ox = 0
          let oy = 0
          let oz = 0
          for (let k = 0; k < 4; k++) {
            const w = weights[v * 4 + k]
            if (w === 0) continue
            const j = jointMatrices[joints[v * 4 + k]]
            ox += w * (j[0] * x + j[4] * y + j[8] * z + j[12])
            oy += w * (j[1] * x + j[5] * y + j[9] * z + j[13])
            oz += w * (j[2] * x + j[6] * y + j[10] * z + j[14])
          }
          positions[v * 3] = ox
          positions[v * 3 + 1] = oy
          positions[v * 3 + 2] = oz
        }
      } else {
        for (let v = 0; v < raw.length; v += 3) {
          const x = raw[v]
          const y = raw[v + 1]
          const z = raw[v + 2]
          positions[v] = m![0] * x + m![4] * y + m![8] * z + m![12]
          positions[v + 1] = m![1] * x + m![5] * y + m![9] * z + m![13]
          positions[v + 2] = m![2] * x + m![6] * y + m![10] * z + m![14]
        }
      }
      const indices =
        prim.indices != null
          ? Uint32Array.from(accessorValues(glb, prim.indices))
          : Uint32Array.from({ length: count }, (_, k) => k)
      const uv = prim.attributes.TEXCOORD_0
      const col = prim.attributes.COLOR_0
      pieces.push({
        name: prims.length > 1 ? `${nameOf(i)}_primitive${p}` : nameOf(i),
        positions,
        indices,
        uvs: uv != null ? normalised(glb, uv) : null,
        colors: col != null ? rgba(glb, col) : null,
        material: prim.material ?? -1,
      })
    })
  }

  const body = pieces.filter((p) => !isEyeName(p.name))
  const tris = gather(glb, body)
  if (tris.indices.length === 0) throw new Error('the file has no meshes')
  const eyeParts = pieces.filter((p) => isEyeName(p.name))
  if (eyeParts.length) {
    const e = gather(glb, eyeParts)
    const eyes = splitEyes(e.positions, e.indices)
    if (eyes.length) tris.eyes = eyes
  }
  return tris
}

/** WEIGHTS_0 as floats (an integer accessor is normalised, as glTF says). */
function weightValues(glb: Glb, index: number): Float64Array {
  return normalised(glb, index)
}

function normalised(glb: Glb, index: number): Float64Array {
  const a = glb.json.accessors[index]
  const v = accessorValues(glb, index)
  if (!a.normalized) return v
  const max =
    a.componentType === 5121 ? 255 : a.componentType === 5123 ? 65535 : 1
  return v.map((x) => x / max)
}

function rgba(glb: Glb, index: number): Float64Array {
  const a = glb.json.accessors[index]
  const v = normalised(glb, index)
  if (a.type === 'VEC4') return v
  const out = new Float64Array((v.length / 3) * 4)
  for (let i = 0, o = 0; i < v.length; i += 3, o += 4) {
    out[o] = v[i]
    out[o + 1] = v[i + 1]
    out[o + 2] = v[i + 2]
    out[o + 3] = 1
  }
  return out
}

/** Pieces as one mesh, with uvs, colours and surfaces as `gatherTriangles` makes them. */
function gather(
  glb: Glb,
  pieces: Piece[]
): BodyTriangles & {
  positions: number[]
  indices: number[]
  surfaces?: Array<BodySurface & { material?: GltfSurfaceMaterial }>
} {
  const positions: number[] = []
  const indices: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  let hasUvs = false
  let hasColors = false
  const runs: Array<{ start: number; count: number; material: number }> = []
  for (const p of pieces) {
    const base = positions.length / 3
    const count = p.positions.length / 3
    if (p.uvs != null && !hasUvs) {
      hasUvs = true
      for (let i = 0; i < base * 2; i++) uvs.push(0)
    }
    if (hasUvs) for (let i = 0; i < count * 2; i++) uvs.push(p.uvs?.[i] ?? 0)
    if (p.colors != null && !hasColors) {
      hasColors = true
      for (let i = 0; i < base * 4; i++) colors.push(1)
    }
    if (hasColors)
      for (let i = 0; i < count * 4; i++) colors.push(p.colors?.[i] ?? 1)
    runs.push({
      start: indices.length,
      count: p.indices.length,
      material: p.material,
    })
    for (const x of p.positions) positions.push(x)
    for (const i of p.indices) indices.push(base + i)
  }
  // Names as Babylon gives them: the material's, `material<i>` without one,
  // the loader's default for none; made unique in order of first use.
  const names = new Map<number, string>()
  const used = new Set<string>()
  const materials = new Map<number, GltfSurfaceMaterial>()
  const nameFor = (index: number): string => {
    const known = names.get(index)
    if (known != null) return known
    const own: string =
      index < 0
        ? '__GLTFLoader._default'
        : glb.json.materials?.[index]?.name || `material${index}`
    let name = own
    for (let k = 2; used.has(name); k++) name = `${own} ${k}`
    used.add(name)
    names.set(index, name)
    return name
  }
  const surfaces: Array<BodySurface & { material?: GltfSurfaceMaterial }> = []
  for (const r of runs) {
    const name = nameFor(r.material)
    const last = surfaces[surfaces.length - 1]
    if (last && last.name === name && last.start + last.count === r.start) {
      last.count += r.count
      continue
    }
    let material = materials.get(r.material)
    if (material == null && r.material >= 0) {
      material = materialOf(glb, r.material, name)
      materials.set(r.material, material)
    }
    surfaces.push({
      start: r.start,
      count: r.count,
      name,
      ...(material ? { material } : {}),
    })
  }
  return {
    positions,
    indices,
    ...(hasUvs ? { uvs } : {}),
    ...(hasColors ? { colors } : {}),
    ...(surfaces.length ? { surfaces } : {}),
  }
}
