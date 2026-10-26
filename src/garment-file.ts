/*#
# garment-file

**A garment out to Blender and back.** `writeGarmentGlb` saves a garment and
the body it was made on, so it can be reshaped by hand (a collar, pockets,
its own UV unwrap), and `readGarment` brings the edited file back for
[garment-bind](/garment-bind/) to bind to the body again.

The file holds the **`garment`** as worn, with its normals and UVs, and,
when `body` is given, a **`body-reference`**: the body it was made on, as a
HELPER to model against. It is marked so (`helper: true` and
`role: 'reference'` in its custom properties) and drawn translucent, and it
is left out on the way back in, so it can stay in the Blender file.

What the garment was made on travels as glTF `extras` (on the scene and on
the garment), under `tosijs`: the base (`hm08`), the pack version, the body's
slider values, the garment's name and slot. Blender keeps `extras` as custom
properties; **tick Include → Custom Properties when exporting** so they come
back. Without them the garment is bound to whatever body is loaded.

Coordinates are the pack's and glTF's own: metres, +Y up, the body facing
+Z with its left on +X, so nothing is converted. Blender's glTF importer turns
that into its Z-up and its exporter turns it back.

Leave out the `garment` to export the body alone, to model a garment from
nothing: every object you add beside it comes back as the garment. The body
carries the metadata then.

OBJ is offered too (`writeGarmentObj` / `readGarment` read either). Blender
drops the OBJ's metadata comment, so the body helper's NAME carries the body
as well: `body-reference_hm08_p15_weight72_muscle100` is the base, the pack
version, and each slider that is not the default as a whole percentage
(`referenceName` / `metaFromName`). Keep the name when you edit the file. It
is read when nothing better is there, a glTF exported without custom
properties included; the garment's name and slot do not travel in it.

```javascript
import { writeGarmentGlb, readGarment } from 'tosijs-3d'

const bytes = writeGarmentGlb({ garment, body, meta })
// …edited in Blender…
const { garment, meta } = readGarment(await file.arrayBuffer())
```
*/
/*{ "parent": "garment-bind", "order": 10 }*/

import { rigidGroups, type MeshPart, type RigidSpec } from './proxy-rigid.js'
import { vertexNormals } from './hair-fit.js'
import { DEFAULT_HUMAN_BODY } from './human-morph.js'

/** A mesh as triangles: positions (xyz), optional normals and UVs. */
export interface GarmentMesh {
  positions: Float32Array
  triangles: Uint32Array
  normals?: Float32Array | null
  uvs?: Float32Array | null
  /** The objects it was made of, as vertex runs, with their rigidity. */
  parts?: MeshPart[] | null
  /** Each vertex's own rigidity (a `_rigid` attribute or paint), NaN where none. */
  rigid?: Float32Array | null
}

/**
 * The rigid groups of a garment read from a file, for `bindGarment`
 * ([proxy-rigid](/proxy-rigid/)), or null when nothing is rigid.
 */
export function garmentRigidity(garment: GarmentMesh) {
  if (!garment.parts?.length) return null
  return rigidGroups(
    garment.positions,
    garment.triangles,
    garment.parts,
    garment.rigid
  )
}

/** What a part's name says about its rigidity (`_rigid`, `_rigidParts`). */
function nameRigidity(name: string): RigidSpec | null {
  const bare = name.replace(/\.\d+$/, '')
  if (/_rigidParts$/i.test(bare)) return 'parts'
  if (/_rigid$/i.test(bare)) return true
  return null
}

/**
 * The body helper's name, carrying the metadata for files that lose the rest
 * (an OBJ through Blender, a glTF without custom properties):
 * `body-reference_hm08_p15_weight72_muscle100`. The base, the pack version,
 * then each slider that is not the default as a whole percentage.
 */
export function referenceName(meta: GarmentMeta): string {
  const out = ['body-reference', meta.base.replace(/[^\w-]/g, '')]
  if (meta.pack != null) out.push(`p${meta.pack}`)
  const defaults = DEFAULT_HUMAN_BODY as Record<string, number | undefined>
  for (const [key, value] of Object.entries(meta.body ?? {})) {
    const pc = Math.round(value * 100)
    if (/^[a-zA-Z]+$/.test(key) && pc !== Math.round((defaults[key] ?? NaN) * 100))
      out.push(`${key}${pc}`)
  }
  return out.join('_')
}

/** The metadata a body helper's name carries, or null when it carries none. */
export function metaFromName(name: string): GarmentMeta | null {
  // Blender appends `.001` to a duplicate name.
  const [head, base, ...rest] = name.replace(/\.\d+$/, '').split('_')
  if (!/^body[-.]?reference$/i.test(head) || !base) return null
  const meta: GarmentMeta = {
    format: 'tosijs-garment',
    version: 1,
    base,
    body: { ...DEFAULT_HUMAN_BODY },
  }
  for (const token of rest) {
    const m = /^([a-zA-Z]+)(-?\d+)$/.exec(token)
    if (!m) continue
    if (m[1] === 'p') meta.pack = Number(m[2])
    else meta.body![m[1]] = Number(m[2]) / 100
  }
  return meta
}

/** What a garment was made on and for. */
export interface GarmentMeta {
  format: 'tosijs-garment'
  version: 1
  /** The base body (`hm08`). */
  base: string
  /** The human pack's version. */
  pack?: number
  /** The body's slider values (`MacroBody`), to rebuild the shape it was made on. */
  body?: Record<string, number>
  name?: string
  slot?: string
}

export interface GarmentFileContent {
  garment: GarmentMesh
  /** Null when the file carried none (an OBJ, or Blender without custom properties). */
  meta: GarmentMeta | null
}

const GLB_MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

/**
 * A GLB with the garment and the body it was made on, or the body alone
 * (no `garment`) to model a garment from nothing.
 */
export function writeGarmentGlb(options: {
  garment?: GarmentMesh | null
  body?: GarmentMesh | null
  meta: GarmentMeta
  /** sRGB colours for the two materials, so the file reads in an editor. */
  colour?: [number, number, number]
}): Uint8Array {
  const views: { offset: number; length: number; target?: number }[] = []
  const accessors: any[] = []
  const parts: Uint8Array[] = []
  let length = 0
  const add = (
    data: Float32Array | Uint32Array,
    type: 'VEC3' | 'VEC2' | 'SCALAR',
    target: number,
    minMax = false
  ): number => {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    views.push({ offset: length, length: bytes.length, target })
    parts.push(bytes)
    length += bytes.length
    const pad = (4 - (length % 4)) % 4
    if (pad) {
      parts.push(new Uint8Array(pad))
      length += pad
    }
    const n = type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1
    const acc: any = {
      bufferView: views.length - 1,
      componentType: data instanceof Uint32Array ? 5125 : 5126,
      count: data.length / n,
      type,
    }
    if (minMax) {
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < data.length; i += 3)
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], data[i + k])
          max[k] = Math.max(max[k], data[i + k])
        }
      acc.min = min
      acc.max = max
    }
    accessors.push(acc)
    return accessors.length - 1
  }
  const primitive = (m: GarmentMesh, material: number) => {
    const attributes: Record<string, number> = {
      POSITION: add(m.positions, 'VEC3', 34962, true),
    }
    if (m.rigid && m.rigid.every((v) => Number.isFinite(v)))
      attributes._RIGID = add(m.rigid, 'SCALAR', 34962)
    // Always: a glTF without normals is flat-shaded, so Blender splits every
    // face and the garment comes back faceted with six times the vertices.
    attributes.NORMAL = add(
      m.normals ?? vertexNormals(m.positions, m.triangles),
      'VEC3',
      34962
    )
    if (m.uvs) {
      // glTF's V runs down the image.
      const uv = Float32Array.from(m.uvs, (v, i) => (i % 2 ? 1 - v : v))
      attributes.TEXCOORD_0 = add(uv, 'VEC2', 34962)
    }
    return {
      attributes,
      indices: add(m.triangles, 'SCALAR', 34963),
      material,
    }
  }
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const colour = options.colour ?? [0.23, 0.36, 0.54]
  const extras = { tosijs: options.meta }
  const meshes: any[] = []
  const nodes: any[] = []
  const g = options.garment
  if (!g && !options.body)
    throw new Error('garment-file: nothing to write (no garment, no body)')
  const pieces: MeshPart[] = !g
    ? []
    : g.parts?.length
    ? g.parts
    : [{ name: 'garment', first: 0, count: g.positions.length / 3 }]
  pieces.forEach((part, i) => {
    const piece = i === 0 && pieces.length === 1 ? g! : slicePart(g!, part)
    meshes.push({ name: part.name, primitives: [primitive(piece, 0)] })
    const ex: any = { tosijs: { ...options.meta, role: 'garment' } }
    if (part.rigid != null && part.rigid !== false) ex.rigid = part.rigid
    nodes.push({ name: part.name, mesh: meshes.length - 1, extras: ex })
  })
  if (options.body) {
    meshes.push({
      name: referenceName(options.meta),
      primitives: [primitive(options.body, 1)],
    })
    nodes.push({
      name: referenceName(options.meta),
      mesh: meshes.length - 1,
      // A helper: there to model against, never part of the garment. It
      // carries the metadata too, for a file that starts with the body alone.
      extras: {
        helper: true,
        tosijs: { ...options.meta, role: 'reference', helper: true },
      },
    })
  }
  const json = {
    asset: { version: '2.0', generator: 'tosijs-3d garment-file' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i), extras }],
    nodes,
    meshes,
    materials: [
      {
        name: 'garment',
        pbrMetallicRoughness: {
          baseColorFactor: [...colour.map(lin), 1],
          metallicFactor: 0,
          roughnessFactor: 0.9,
        },
      },
      {
        name: 'body-reference',
        pbrMetallicRoughness: {
          baseColorFactor: [0.6, 0.5, 0.45, 0.35],
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
        // Translucent, so it reads as a guide and the garment shows through.
        alphaMode: 'BLEND',
        doubleSided: true,
      },
    ],
    accessors,
    bufferViews: views.map((v) => ({
      buffer: 0,
      byteOffset: v.offset,
      byteLength: v.length,
      target: v.target,
    })),
    buffers: [{ byteLength: length }],
  }
  let text = new TextEncoder().encode(JSON.stringify(json))
  const jsonPad = (4 - (text.length % 4)) % 4
  if (jsonPad) {
    const padded = new Uint8Array(text.length + jsonPad).fill(0x20)
    padded.set(text)
    text = padded
  }
  const total = 12 + 8 + text.length + 8 + length
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, GLB_MAGIC, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, text.length, true)
  dv.setUint32(16, JSON_CHUNK, true)
  out.set(text, 20)
  let at = 20 + text.length
  dv.setUint32(at, length, true)
  dv.setUint32(at + 4, BIN_CHUNK, true)
  at += 8
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** One part of a garment as its own mesh. */
function slicePart(g: GarmentMesh, part: MeshPart): GarmentMesh {
  const end = part.first + part.count
  const tris: number[] = []
  for (let t = 0; t < g.triangles.length; t += 3)
    if (g.triangles[t] >= part.first && g.triangles[t] < end)
      tris.push(
        g.triangles[t] - part.first,
        g.triangles[t + 1] - part.first,
        g.triangles[t + 2] - part.first
      )
  return {
    positions: g.positions.slice(part.first * 3, end * 3),
    triangles: Uint32Array.from(tris),
    normals: g.normals?.slice(part.first * 3, end * 3) ?? null,
    uvs: g.uvs?.slice(part.first * 2, end * 2) ?? null,
    rigid: g.rigid?.slice(part.first, end) ?? null,
  }
}

/** Read a node's local matrix (column-major), from TRS or `matrix`. */
function nodeMatrix(node: any): number[] {
  if (node.matrix) return node.matrix
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
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

function multiply(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return out
}

function readGlb(bytes: Uint8Array): GarmentFileContent {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let json: any = null
  let bin: Uint8Array | null = null
  for (let at = 12; at + 8 <= bytes.length; ) {
    const len = dv.getUint32(at, true)
    const type = dv.getUint32(at + 4, true)
    const chunk = bytes.subarray(at + 8, at + 8 + len)
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(chunk))
    else if (type === BIN_CHUNK) bin = chunk
    at += 8 + len
  }
  if (json == null) throw new Error('garment-file: no glTF JSON in the file')
  if (json.extensionsRequired?.length)
    throw new Error(
      `garment-file: the file needs ${json.extensionsRequired.join(
        ', '
      )} (export without compression)`
    )
  const read = (index: number): Float32Array | Uint32Array => {
    const acc = json.accessors[index]
    const view = json.bufferViews[acc.bufferView]
    if (bin == null) throw new Error('garment-file: no binary chunk')
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type as string] ?? 1
    const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[
      acc.componentType as number
    ]
    if (size == null)
      throw new Error(`garment-file: component type ${acc.componentType}`)
    const stride = view.byteStride ?? n * size
    const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const vd = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
    const isFloat = acc.componentType === 5126
    const norm = acc.normalized ? 2 ** (size * 8) - 1 : 0
    const out =
      isFloat || norm
        ? new Float32Array(acc.count * n)
        : new Uint32Array(acc.count * n)
    for (let i = 0; i < acc.count; i++)
      for (let k = 0; k < n; k++) {
        const o = base + i * stride + k * size
        const value = isFloat
          ? vd.getFloat32(o, true)
          : size === 4
          ? vd.getUint32(o, true)
          : size === 2
          ? vd.getUint16(o, true)
          : vd.getUint8(o)
        out[i * n + k] = norm ? value / norm : value
      }
    return out
  }
  // World matrices, following the scene's hierarchy.
  const world = new Map<number, number[]>()
  const walk = (i: number, parent: number[]) => {
    const m = multiply(parent, nodeMatrix(json.nodes[i]))
    world.set(i, m)
    for (const c of json.nodes[i].children ?? []) walk(c, m)
  }
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  const roots =
    json.scenes?.[json.scene ?? 0]?.nodes ??
    json.nodes.map((_: unknown, i: number) => i)
  for (const r of roots) walk(r, identity)
  const role = (n: any) => n.extras?.tosijs?.role
  const isReference = (n: any) =>
    role(n) === 'reference' ||
    n.extras?.helper === true ||
    /^body[-_.]?reference/i.test(n.name ?? '')
  const withMesh = json.nodes
    .map((n: any, i: number) => ({ n, i }))
    .filter(
      ({ n }: { n: any }) =>
        n.mesh != null && !isReference(n) && !/-ignore$/.test(n.name ?? '')
    )
  const pick =
    withMesh.find(({ n }: { n: any }) => role(n) === 'garment') ??
    withMesh.find(({ n }: { n: any }) => /garment/i.test(n.name ?? '')) ??
    withMesh[0]
  if (pick == null)
    throw new Error(
      'garment-file: no garment in the file, only the body (model one beside it)'
    )
  // Every mesh but the body is the garment: an object added in the editor
  // (a collar, a buckle, a plate) is part of it.
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const rigid: number[] = []
  const triangles: number[] = []
  const parts: MeshPart[] = []
  let hasNormals = true
  let anyUvs = false
  let anyRigid = false
  for (const { n, i } of withMesh) {
    const m = world.get(i) ?? identity
    const mesh = json.meshes[n.mesh]
    const name = n.name ?? mesh.name ?? `part-${parts.length}`
    const spec: RigidSpec | null =
      n.extras?.rigid ??
      n.extras?.tosijs?.rigid ??
      mesh.extras?.rigid ??
      nameRigidity(name)
    const partFirst = positions.length / 3
    for (const prim of mesh.primitives) {
      if ((prim.mode ?? 4) !== 4) continue
      const first = positions.length / 3
      const p = read(prim.attributes.POSITION)
      const count = p.length / 3
      for (let i = 0; i < p.length; i += 3) {
        const [x, y, z] = [p[i], p[i + 1], p[i + 2]]
        positions.push(
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14]
        )
      }
      if (prim.attributes.NORMAL != null) {
        const nv = read(prim.attributes.NORMAL)
        for (let i = 0; i < nv.length; i += 3) {
          const [x, y, z] = [nv[i], nv[i + 1], nv[i + 2]]
          const a = m[0] * x + m[4] * y + m[8] * z
          const b = m[1] * x + m[5] * y + m[9] * z
          const c = m[2] * x + m[6] * y + m[10] * z
          const l = Math.hypot(a, b, c) || 1
          normals.push(a / l, b / l, c / l)
        }
      } else hasNormals = false
      if (prim.attributes.TEXCOORD_0 != null) {
        anyUvs = true
        const t = read(prim.attributes.TEXCOORD_0)
        for (let i = 0; i < t.length; i += 2) uvs.push(t[i], 1 - t[i + 1])
      } else for (let i = 0; i < count; i++) uvs.push(0, 0)
      const own = Object.keys(prim.attributes).find((k) => /^_rigid$/i.test(k))
      const painted =
        spec === 'paint' && prim.attributes.COLOR_0 != null
          ? read(prim.attributes.COLOR_0)
          : null
      if (own != null) {
        anyRigid = true
        for (const v of read(prim.attributes[own])) rigid.push(v)
      } else if (painted) {
        anyRigid = true
        const stride = painted.length / count
        for (let i = 0; i < count; i++) rigid.push(painted[i * stride])
      } else for (let i = 0; i < count; i++) rigid.push(NaN)
      const idx =
        prim.indices != null
          ? read(prim.indices)
          : Uint32Array.from({ length: count }, (_, i) => i)
      for (const i of idx) triangles.push(first + i)
    }
    parts.push({
      name,
      first: partFirst,
      count: positions.length / 3 - partFirst,
      rigid: spec,
    })
  }
  // From the garment, else any node (the body helper, when the garment was
  // modelled from nothing), else the scene.
  const tagged = (x: any) => x?.tosijs?.format === 'tosijs-garment'
  const holder = tagged(pick.n.extras)
    ? pick.n.extras
    : json.nodes.find((n: any) => tagged(n.extras))?.extras ??
      (tagged(json.scenes?.[json.scene ?? 0]?.extras)
        ? json.scenes[json.scene ?? 0].extras
        : null)
  const named = json.nodes.find((n: any) => isReference(n) && metaFromName(n.name ?? ''))
  const meta = holder
    ? stripRole(holder.tosijs)
    : named
    ? metaFromName(named.name)
    : null
  return {
    garment: {
      positions: Float32Array.from(positions),
      triangles: Uint32Array.from(triangles),
      normals: hasNormals ? Float32Array.from(normals) : null,
      uvs: anyUvs ? Float32Array.from(uvs) : null,
      parts,
      rigid: anyRigid ? Float32Array.from(rigid) : null,
    },
    meta,
  }
}

function stripRole(t: any): GarmentMeta {
  const { role: _role, helper: _helper, ...rest } = t
  return rest as GarmentMeta
}

/** An OBJ with `o garment` and `o body-reference`; the metadata in a comment. */
export function writeGarmentObj(options: {
  garment?: GarmentMesh | null
  body?: GarmentMesh | null
  meta: GarmentMeta
}): string {
  const lines = [`# tosijs-garment ${JSON.stringify(options.meta)}`]
  let vBase = 1
  let tBase = 1
  const write = (name: string, m: GarmentMesh) => {
    // Smooth: without it Blender's importer splits every face.
    lines.push(`o ${name}`, 's 1')
    const p = m.positions
    for (let i = 0; i < p.length; i += 3)
      lines.push(`v ${p[i]} ${p[i + 1]} ${p[i + 2]}`)
    if (m.uvs)
      for (let i = 0; i < m.uvs.length; i += 2)
        lines.push(`vt ${m.uvs[i]} ${m.uvs[i + 1]}`)
    const t = m.triangles
    for (let i = 0; i < t.length; i += 3) {
      const f = [t[i], t[i + 1], t[i + 2]].map((v) =>
        m.uvs ? `${v + vBase}/${v + tBase}` : `${v + vBase}`
      )
      lines.push(`f ${f.join(' ')}`)
    }
    vBase += p.length / 3
    if (m.uvs) tBase += m.uvs.length / 2
  }
  const g = options.garment
  if (!g) {
    if (!options.body)
      throw new Error('garment-file: nothing to write (no garment, no body)')
  } else if (g.parts?.length)
    for (const part of g.parts) {
      const suffix =
        part.rigid === 'parts'
          ? '_rigidParts'
          : part.rigid === true || part.rigid === 1
          ? '_rigid'
          : ''
      const name = nameRigidity(part.name) ? part.name : part.name + suffix
      write(name, slicePart(g, part))
    }
  else write('garment', g)
  if (options.body) write(referenceName(options.meta), options.body)
  return lines.join('\n') + '\n'
}

function readObj(text: string): GarmentFileContent {
  const v: number[] = []
  const vt: number[] = []
  let meta: GarmentMeta | null = null
  let object = ''
  // Per object: its faces as (v, vt) corners.
  const faces = new Map<string, Array<Array<[number, number]>>>()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('# tosijs-garment ')) {
      try {
        meta = JSON.parse(line.slice('# tosijs-garment '.length))
      } catch {
        // A damaged comment: no metadata.
      }
      continue
    }
    const [kw, ...rest] = line.split(/\s+/)
    if (kw === 'o' || kw === 'g') object = rest.join(' ')
    else if (kw === 'v') v.push(+rest[0], +rest[1], +rest[2])
    else if (kw === 'vt') vt.push(+rest[0], +rest[1])
    else if (kw === 'f') {
      const corners = rest.map((c) => {
        const [a, b] = c.split('/')
        const vi = +a < 0 ? v.length / 3 + +a : +a - 1
        const ti = b ? (+b < 0 ? vt.length / 2 + +b : +b - 1) : -1
        return [vi, ti] as [number, number]
      })
      let list = faces.get(object)
      if (list == null) faces.set(object, (list = []))
      list.push(corners)
    }
  }
  if (!meta)
    for (const n of faces.keys()) if ((meta = metaFromName(n))) break
  const names = [...faces.keys()].filter(
    (n) => !/^body[-_.]?reference/i.test(n) && !/-ignore$/.test(n)
  )
  if (!names.length) throw new Error('garment-file: no faces in the OBJ')
  let index = new Map<string, number>()
  const positions: number[] = []
  const uvs: number[] = []
  const triangles: number[] = []
  let hasUvs = true
  const corner = ([vi, ti]: [number, number]) => {
    const k = `${vi}/${ti}`
    let i = index.get(k)
    if (i == null) {
      i = positions.length / 3
      index.set(k, i)
      positions.push(v[vi * 3], v[vi * 3 + 1], v[vi * 3 + 2])
      if (ti >= 0) uvs.push(vt[ti * 2], vt[ti * 2 + 1])
      else hasUvs = false
    }
    return i
  }
  const parts: MeshPart[] = []
  for (const name of names) {
    // Each object its own vertices, so a part is a run.
    index = new Map()
    const first = positions.length / 3
    for (const f of faces.get(name)!) {
      const c = f.map(corner)
      for (let k = 1; k + 1 < c.length; k++)
        triangles.push(c[0], c[k], c[k + 1])
    }
    parts.push({
      name,
      first,
      count: positions.length / 3 - first,
      rigid: nameRigidity(name),
    })
  }
  return {
    garment: {
      positions: Float32Array.from(positions),
      triangles: Uint32Array.from(triangles),
      normals: null,
      uvs: hasUvs && uvs.length ? Float32Array.from(uvs) : null,
      parts,
    },
    meta,
  }
}

/** Read a garment from a GLB or an OBJ (told apart by the GLB's magic number). */
export function readGarment(
  data: ArrayBuffer | Uint8Array | string
): GarmentFileContent {
  if (typeof data === 'string') return readObj(data)
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (
    bytes.length >= 4 &&
    new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) ===
      GLB_MAGIC
  )
    return readGlb(bytes)
  return readObj(new TextDecoder().decode(bytes))
}
