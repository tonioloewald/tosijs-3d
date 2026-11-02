/*#
# hair place

**Hair placed on a body, with no engine**: the geometry half of
[human-hair](/human-hair/). Quaternius' CC0 hairstyles are each modelled in
place on one of Quaternius' heads, so a piece is carried from THAT head to a
body's head: `headScalp` measures the body's head and warps the library
head's skin onto it ([hair-fit](/hair-fit/)), and `placeHair` takes a piece
through the warp, keeps each vertex's height above the skin, lays a
moustache's lower edge on the top of this upper lip, applies any hand
`nudge`, and pushes anything left inside the skin back out.

```javascript
import { readHairLibrary, referenceHeads, closestHead, headScalp, placeHair, hairFitFor } from 'tosijs-3d/hair-place'
const pieces = readHairLibrary(glbBytes)            // the library, read from its GLB
const heads = referenceHeads(pieces)                // the heads it was modelled on
const scalp = headScalp(pack.manifest, positions, triangles, { lips })
const piece = pieces.find((p) => p.name === 'Hair_Buzzed')
const head = closestHead(piece.parts, heads)
const placed = piece.parts.map((part) => placeHair(scalp, part, { head, on: hairFitFor(piece.name, piece.category) }))
```

[human-hair](/human-hair/) loads the same library into Babylon and places
it with these functions, so an exporter (or another engine) puts every piece
exactly where the character builder does.
*/
/*{ "parent": "character-core", "order": 45 }*/

import type { HumanPackManifest } from './human-pack.js'
import { humanJoint } from './human-morph.js'
import { accessorValues, readGlb } from './glb-chunks.js'
import {
  applyWarp,
  conformOutside,
  headRegion,
  headRegionIndices,
  keepHeight,
  pick,
  shellWarp,
  skinGaps,
  vertexNormals,
  type HeadLandmarks,
  type ShellWarp,
} from './hair-fit.js'

/** The geometry of one mesh of a piece: vertices in the file's frame, its triangles. */
export interface HairShape {
  positions: Float32Array
  indices: Uint32Array
}

/** A piece of a hair library: a hairstyle, a beard, a pair of brows. */
export interface HairPiece {
  name: string
  /** `hair` or `eyebrows` (from the node's glTF extras). */
  category: string
  parts: HairShape[]
}

/**
Quaternius' two adult heads, which its hairstyles were modelled on (the men's
on one, the women's on the other), and where their eyes are (measured from
their eyeball meshes).
*/
export const QUATERNIUS_HEADS: Readonly<Record<string, HeadLandmarks>> =
  Object.freeze({
    Reference_Head_Male: {
      eyeY: 1.6986,
      eyeZ: 0.0659,
      midX: 0,
      spacing: 0.0676,
    },
    Reference_Head_Female: {
      eyeY: 1.656,
      eyeZ: 0.0591,
      midX: 0,
      spacing: 0.069,
    },
  })

/** Pieces that grow on the face, not the scalp. */
export const FACIAL_HAIR = /Beard|Moustache|Mustache|MuttonChops|Goatee|Stubble/i

/** Which warp a piece goes through: `face` for brows and beards, else `scalp`. */
export function hairFitFor(name: string, category: string): 'scalp' | 'face' {
  return category === 'eyebrows' || FACIAL_HAIR.test(name) ? 'face' : 'scalp'
}

/** A head a library was modelled on. */
export interface ReferenceHead {
  name: string
  skin: Float32Array
  /** Its skin's outward normals. */
  normals: Float32Array
  landmarks: HeadLandmarks
  /**
   * The top of its upper lip, where its moustache's lower edge lies (the
   * middle of that edge), if the library has a moustache for this head.
   */
  lip?: { y: number; z: number }
}

/*
Quaternius' eyebrow pieces carry their own upper eyelashes: a strip under
each brow, at ITS head's eyes. A body that has its own lashes would wear two
pairs (the lower one reading as a second, thinner pair of brows once the brow
is placed for this face), so the strips are dropped: the islands of the piece
whose top is in the lower half of the range the islands' tops span.
*/
/** A brow piece's triangles without its lash strips. */
export function withoutLashes(part: HairShape): Uint32Array {
  const p = part.positions
  const n = p.length / 3
  const parent = Int32Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]]
    return x
  }
  const join = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }
  const ix = part.indices
  for (let t = 0; t < ix.length; t += 3) {
    join(ix[t], ix[t + 1])
    join(ix[t], ix[t + 2])
  }
  // Split vertices (a UV seam) are one island.
  const at = new Map<string, number>()
  for (let v = 0; v < n; v++) {
    const k = `${p[v * 3].toFixed(4)},${p[v * 3 + 1].toFixed(4)},${p[
      v * 3 + 2
    ].toFixed(4)}`
    const w = at.get(k)
    if (w == null) at.set(k, v)
    else join(v, w)
  }
  const top = new Map<number, number>()
  for (let v = 0; v < n; v++) {
    const r = find(v)
    top.set(r, Math.max(top.get(r) ?? -Infinity, p[v * 3 + 1]))
  }
  const tops = [...top.values()]
  const cut = (Math.min(...tops) + Math.max(...tops)) / 2
  if (Math.max(...tops) - Math.min(...tops) < 1e-4) return ix
  const keep: number[] = []
  for (let t = 0; t < ix.length; t += 3) {
    if (top.get(find(ix[t]))! > cut) keep.push(ix[t], ix[t + 1], ix[t + 2])
  }
  return Uint32Array.from(keep)
}

/**
How closely a piece hugs a head, lower is closer: the mean distance from that
head's skin of the nearer half of a sample of its vertices (long strands are
the far half), plus a penalty for vertices deep inside it. A style sits on the
head it was made for and floats off, or sinks into, the other.
*/
export function hairHug(parts: HairShape[], head: ReferenceHead): number {
  const sample: number[] = []
  for (const p of parts) {
    const n = p.positions.length / 3
    const step = Math.max(1, Math.floor(n / 300))
    for (let i = 0; i < n; i += step) {
      sample.push(
        p.positions[i * 3],
        p.positions[i * 3 + 1],
        p.positions[i * 3 + 2]
      )
    }
  }
  const g = Array.from(skinGaps(sample, head.skin, head.normals))
  const inside = g.filter((x) => x < -0.005).length / g.length
  const near = g
    .map(Math.abs)
    .sort((x, y) => x - y)
    .slice(0, Math.ceil(g.length / 2))
  return near.reduce((x, y) => x + y, 0) / near.length + 0.02 * inside
}

/** The head a piece was modelled on: the one it hugs closest. */
export function closestHead(
  parts: HairShape[],
  heads: readonly ReferenceHead[]
): ReferenceHead {
  const score = new Map(heads.map((h) => [h, hairHug(parts, h)]))
  return heads.reduce((a, b) => (score.get(b)! < score.get(a)! ? b : a))
}

/**
 * Where a moustache's lower edge is (its middle, within a centimetre of
 * x = 0): the top of the upper lip of the head it was made for.
 */
export function moustacheLip(part: HairShape): { y: number; z: number } | null {
  let lo = Infinity
  let z = 0
  for (const v of part.indices) {
    if (
      Math.abs(part.positions[v * 3]) < 0.01 &&
      part.positions[v * 3 + 1] < lo
    ) {
      lo = part.positions[v * 3 + 1]
      z = part.positions[v * 3 + 2]
    }
  }
  return lo < Infinity ? { y: lo, z } : null
}

type Mat4 = number[]
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const mul = (a: Mat4, b: Mat4): Mat4 => {
  const o = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
const localMatrix = (n: any): Mat4 => {
  if (Array.isArray(n.matrix)) return n.matrix
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
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

/**
 * A hair library GLB, read with no engine: each top-level node a piece (its
 * extras' `category`, else `eyebrows` by name, else `hair`), each of its
 * meshes' vertices in the file's frame. Brows lose their lash strips, as
 * human-hair's loader does.
 */
export function readHairLibrary(bytes: Uint8Array): HairPiece[] {
  const glb = readGlb(bytes)
  if (glb.bin === null) throw new Error('readHairLibrary: no binary chunk')
  const json = glb.json
  const pieces: HairPiece[] = []
  const scene = json.scenes[json.scene ?? 0]
  for (const top of scene.nodes as number[]) {
    const node = json.nodes[top]
    const category =
      node.extras?.category ??
      (String(node.name).startsWith('Eyebrows') ? 'eyebrows' : 'hair')
    const parts: HairShape[] = []
    const visit = (i: number, parent: Mat4) => {
      const n = json.nodes[i]
      const world = mul(parent, localMatrix(n))
      if (n.mesh != null)
        for (const prim of json.meshes[n.mesh].primitives) {
          if (prim.attributes?.POSITION == null) continue
          const raw = accessorValues(glb, prim.attributes.POSITION)
          const positions = new Float32Array(raw.length)
          for (let k = 0; k < raw.length; k += 3) {
            const x = raw[k]
            const y = raw[k + 1]
            const z = raw[k + 2]
            positions[k] =
              world[0] * x + world[4] * y + world[8] * z + world[12]
            positions[k + 1] =
              world[1] * x + world[5] * y + world[9] * z + world[13]
            positions[k + 2] =
              world[2] * x + world[6] * y + world[10] * z + world[14]
          }
          const indices =
            prim.indices != null
              ? Uint32Array.from(accessorValues(glb, prim.indices))
              : Uint32Array.from({ length: raw.length / 3 }, (_, k) => k)
          if (positions.length > 0) parts.push({ positions, indices })
        }
      for (const c of n.children ?? []) visit(c, world)
    }
    visit(top, IDENTITY)
    if (category === 'eyebrows')
      for (const part of parts) part.indices = withoutLashes(part)
    if (parts.length > 0) pieces.push({ name: node.name, category, parts })
  }
  return pieces
}

/**
 * The heads a library was modelled on, taken out of its pieces (by node name,
 * `heads` saying where their eyes are), each with its lip line from the
 * library's moustache where it has one.
 */
export function referenceHeads(
  pieces: HairPiece[],
  options: {
    heads?: Record<string, HeadLandmarks>
    /** The piece whose lower edge marks the lip line. */
    moustache?: string
  } = {}
): ReferenceHead[] {
  const heads: ReferenceHead[] = []
  for (const [name, landmarks] of Object.entries(
    options.heads ?? QUATERNIUS_HEADS
  )) {
    const part = pieces.find((p) => p.name === name)?.parts[0]
    if (part == null) continue
    heads.push({
      name,
      skin: part.positions,
      normals: vertexNormals(part.positions, part.indices),
      landmarks,
    })
  }
  if (heads.length === 0)
    throw new Error('referenceHeads: the library has no reference head')
  const m = pieces.find((p) => p.name === (options.moustache ?? 'Hair_Moustache'))
  const lip = m && moustacheLip(m.parts[0])
  if (m && lip) closestHead(m.parts, heads).lip = lip
  return heads
}

/** A body's head, measured for hair: its skin, and warps onto it from library heads. */
export interface HeadScalp {
  /** The head's skin points (xyz, the pack's frame) and their normals. */
  skin: Float32Array
  normals: Float32Array
  /** Where this head's eyes are. */
  landmarks: HeadLandmarks
  /**
   * Where the brows' middle belongs (y), from the eyes: about 2.5 cm above
   * the eyeballs' centres. Quaternius' stylised heads carry theirs barely
   * 1 cm above much bigger eyes, so a skin-to-skin warp lays them on the lid.
   */
  brow: number
  /** The top of the upper lip (y), from the pack's `lips` region, if given. */
  lipTop: number | null
  /** The skull's middle, which a hair `nudge` scales about. */
  centre: { x: number; y: number; z: number }
  /**
   * A library head's `scalp` or `face` warped onto this one, skin to skin
   * (worked out once per head and region). A face is shaped independently of
   * the skull, so the two are separate.
   */
  warp(head: ReferenceHead, region: 'scalp' | 'face'): ShellWarp
}

/**
 * Measure a morphed body's head (`positions` every pack vertex, `triangles`
 * the body's). The regions are found from the eyes on both heads, so any
 * size works.
 */
export function headScalp(
  manifest: HumanPackManifest,
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  options: {
    /** The pack's `lips` region, so a moustache sits above the lip. */
    lips?: ArrayLike<number> | null
  } = {}
): HeadScalp {
  const [lx, ly, lz] = humanJoint(positions, manifest.joints['eye.L____head'])
  const [rx] = humanJoint(positions, manifest.joints['eye.R____head'])
  const at: HeadLandmarks = {
    eyeY: ly,
    eyeZ: lz,
    midX: (lx + rx) / 2,
    spacing: Math.abs(lx - rx),
  }
  const normals = vertexNormals(positions, triangles)
  const used = new Uint8Array(positions.length / 3)
  for (let i = 0; i < triangles.length; i++) used[triangles[i]] = 1
  const skin: number[] = []
  const skinN: number[] = []
  const e = at.spacing
  for (let v = 0; v < used.length; v++) {
    if (!used[v]) continue
    const x = positions[v * 3]
    const y = positions[v * 3 + 1]
    // From under the chin up, and no wider than the ears.
    if (y < ly - 2.8 * e || Math.abs(x - at.midX) > 1.6 * e) continue
    skin.push(x, y, positions[v * 3 + 2])
    skinN.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2])
  }
  const mine = Float32Array.from(skin)
  const skinNormals = Float32Array.from(skinN)
  const warps = new Map<string, ShellWarp>()
  return {
    skin: mine,
    normals: skinNormals,
    landmarks: at,
    brow: ly + 0.4 * e,
    // Between the eyes, a little higher and two eye-spacings back.
    centre: { x: at.midX, y: ly + 0.5 * e, z: lz - 1.2 * e },
    lipTop: (() => {
      if (options.lips == null) return null
      let top = -Infinity
      for (let v = 0; v < options.lips.length; v++) {
        if (options.lips[v] > 0.5) top = Math.max(top, positions[v * 3 + 1])
      }
      return top > -Infinity ? top : null
    })(),
    warp(head, region) {
      const key = `${head.name}:${region}`
      let w = warps.get(key)
      if (w == null) {
        const ix = headRegionIndices(mine, at, region)
        w = shellWarp(
          headRegion(head.skin, head.landmarks, region),
          pick(mine, ix),
          {
            normals: pick(skinNormals, ix),
            // Hair a little high rather than through the scalp; a beard or a
            // brow lies on the skin.
            clearance: region === 'scalp' ? 0.002 : 0.0005,
          }
        )
        warps.set(key, w)
      }
      return w
    },
  }
}

export interface HairPlacement {
  /** Skin clearance in metres (default 2 mm), a guard where the warp is short. */
  margin?: number
  /** `face` for brows and beards (the face's warp), else the scalp's. */
  on?: 'scalp' | 'face'
  /** The library head the piece was modelled on (`closestHead`, or `library.headFor(name)`). */
  head: ReferenceHead
  /** Move the piece up or down so its middle is at this height (`head.brow`). */
  centreY?: number
  /**
   * A hand adjustment after the fit, for whoever is making the character:
   * metres up (`y`) and forward (`z`), and a `scale` about the skull's middle.
   */
  nudge?: { y?: number; z?: number; scale?: number }
}

const gapCache = new WeakMap<HairShape, Map<ReferenceHead, Float32Array>>()

/** A part's vertices' heights above its own head's skin (cached). */
function gapsOf(part: HairShape, head: ReferenceHead): Float32Array {
  let byHead = gapCache.get(part)
  if (byHead == null) gapCache.set(part, (byHead = new Map()))
  let g = byHead.get(head)
  if (g == null) {
    g = skinGaps(part.positions, head.skin, head.normals)
    byHead.set(head, g)
  }
  return g
}

/** A part's vertices placed on a body's head (the pack's frame). */
export function placeHair(
  head: HeadScalp,
  part: HairShape,
  options: HairPlacement
): Float32Array {
  const p = applyWarp(
    part.positions,
    head.warp(options.head, options.on ?? 'scalp')
  )
  // Each vertex back at its height above the skin, as on its own head: the
  // warp moves hair with the skull, this keeps a beard as thick on this chin.
  keepHeight(p, gapsOf(part, options.head), head.skin, head.normals, {
    clearance: options.on === 'face' ? 0.0005 : 0.002,
  })
  // The mouth: a face warp matches skin to nearest skin, which carries a
  // moustache's ends down onto the lips. Its lower edge goes to the top of
  // this upper lip, the correction fading with distance from the lip line,
  // so a full beard's chin stays where the warp put it.
  const lip = options.head.lip
  if (options.on === 'face' && lip != null && head.lipTop != null) {
    const landed = applyWarp([0, lip.y, lip.z], head.warp(options.head, 'face'))
    // Its lower edge a little ABOVE the lip's: a moustache grows above the lip.
    const dy = head.lipTop + 0.004 - landed[1]
    for (let v = 0; v < p.length; v += 3) {
      const t = (part.positions[v + 1] - lip.y) / 0.02
      p[v + 1] += dy * Math.exp(-t * t)
    }
  }
  if (options.centreY != null) {
    let lo = Infinity
    let hi = -Infinity
    // Only what is drawn (a piece may carry vertices no triangle uses).
    for (const v of part.indices) {
      lo = Math.min(lo, p[v * 3 + 1])
      hi = Math.max(hi, p[v * 3 + 1])
    }
    const dy = options.centreY - (lo + hi) / 2
    for (let v = 1; v < p.length; v += 3) p[v] += dy
  }
  const nudge = options.nudge
  if (nudge != null) {
    const k = nudge.scale ?? 1
    const c = head.centre
    for (let v = 0; v < p.length; v += 3) {
      p[v] = c.x + (p[v] - c.x) * k
      p[v + 1] = c.y + (p[v + 1] - c.y) * k + (nudge.y ?? 0)
      p[v + 2] = c.z + (p[v + 2] - c.z) * k + (nudge.z ?? 0)
    }
  }
  conformOutside(p, head.skin, head.normals, options.margin ?? 0.002)
  return p
}
