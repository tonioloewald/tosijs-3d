/*#
# human-hair

Hairstyles, beards and eyebrows from a library made for another head, worn
by a [character builder](/character-builder/) body. The library is
Quaternius' CC0 hairstyles (`quaternius/libraries/hairstyles.glb` on the
CDN: 19 adult styles, their teen versions and six pairs of eyebrows), each
modelled in place on Quaternius' base head.

`loadHairLibrary(scene, url)` reads the library once: each piece's vertices
in the file's own frame (right-handed, +Z forward, the frame a human pack
uses), its UVs, its triangles and its material, and the HEAD it was
modelled on (`Reference_Head`, Quaternius' Regular_Male). `headScalp(...)`
warps that head's skin onto a body's ([hair-fit](/hair-fit/)): a per-axis
fit, then each skin point's own correction, the scalp and the face
separately. `humanHair(...)` carries any piece through the warp, so every
hair keeps its height above the scalp under it, and hangs it on the Head
bone so it moves with the clip.

Fitting the hair itself to the skin does not work: a style is one outer
shell with no underside, so laid on the skin it sinks by its own thickness.

The library's hair texture is a neutral grey meant to be tinted, so
`hairMaterial` gives one material per colour from `hairColor`: black to
platinum, plus red.
*/
/*{ "parent": "character-builder", "order": 55 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanPackManifest } from './human-pack.js'
import type { BuiltRig } from './rig-build.js'
import type { FittedRig } from './rig-fit.js'
import { humanJoint } from './human-morph.js'
import { hairColor, hairDye } from './skin-tone.js'
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

/** One mesh of a piece: vertices in the file's frame, its UVs, its triangles. */
export interface HairPart {
  positions: Float32Array
  uvs: Float32Array | null
  indices: Uint32Array
  material: BABYLON.Material | null
}

export interface HairLibrary {
  /** Piece names, optionally only one category (`hair`, `eyebrows`). */
  names(category?: string): string[]
  piece(name: string): HairPart[] | undefined
  /**
   * The heads the library was modelled on (their skin, the file's frame, and
   * where their eyes are), which a body's head is warped from.
   */
  heads: ReferenceHead[]
  /** The head a piece was modelled on: the one its vertices sit nearest. */
  headFor(name: string): ReferenceHead
  /** Which warp a piece goes through: `scalp` (hair) or `face` (brows, beards). */
  fitFor(name: string): 'scalp' | 'face'
  /** The library's own materials, by name. */
  materials: BABYLON.Material[]
  dispose(): void
}

/*
Quaternius' eyebrow pieces carry their own upper eyelashes: a strip under
each brow, at ITS head's eyes. A body that has its own lashes would wear two
pairs (the lower one reading as a second, thinner pair of brows once the brow
is placed for this face), so the strips are dropped: the islands of the piece
whose top is in the lower half of the range the islands' tops span.
*/
function withoutLashes(part: HairPart): Uint32Array {
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
const FACIAL = /Beard|Moustache|Mustache|MuttonChops|Goatee|Stubble/i

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

/**
How closely a piece hugs a head, lower is closer: the mean distance from that
head's skin of the nearer half of a sample of its vertices (long strands are
the far half), plus a penalty for vertices deep inside it. A style sits on the
head it was made for and floats off, or sinks into, the other.
*/
function hug(parts: HairPart[], head: ReferenceHead): number {
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

/** Load a hair library (a GLB of named pieces); `reference` hugs its scalp. */
export async function loadHairLibrary(
  scene: BABYLON.Scene,
  url: string,
  options: {
    /** Reference heads by node name, with where their eyes are. */
    heads?: Record<string, HeadLandmarks>
    /** The piece whose lower edge marks the lip line (`Hair_Moustache`). */
    moustache?: string
  } = {}
): Promise<HairLibrary> {
  const container = await BABYLON.LoadAssetContainerAsync(url, scene)
  const root = container.meshes.find((m) => m.name === '__root__')
  const toFile = root
    ? BABYLON.Matrix.Invert(root.computeWorldMatrix(true))
    : BABYLON.Matrix.Identity()
  const pieces = new Map<string, { category: string; parts: HairPart[] }>()
  for (const node of container.transformNodes.concat(
    container.meshes as unknown as BABYLON.TransformNode[]
  )) {
    if (node === root || node.parent !== root) continue
    const extras = (node.metadata as any)?.gltf?.extras
    const category =
      extras?.category ??
      (node.name.startsWith('Eyebrows') ? 'eyebrows' : 'hair')
    const parts: HairPart[] = []
    for (const m of [node, ...node.getChildMeshes(false)]) {
      if (!(m instanceof BABYLON.Mesh) || m.getTotalVertices() === 0) continue
      // The mesh's own placement (some are in centimetres, turned upright),
      // in the file's frame: its world matrix less the root's mirror.
      const toWorld = m.computeWorldMatrix(true).multiply(toFile)
      const raw = m.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
      const positions = new Float32Array(raw.length)
      const v = new BABYLON.Vector3()
      for (let i = 0; i < raw.length; i += 3) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
          raw[i],
          raw[i + 1],
          raw[i + 2],
          toWorld,
          v
        )
        positions[i] = v.x
        positions[i + 1] = v.y
        positions[i + 2] = v.z
      }
      const uv = m.getVerticesData(BABYLON.VertexBuffer.UVKind)
      parts.push({
        positions,
        uvs: uv ? new Float32Array(uv) : null,
        indices: Uint32Array.from(m.getIndices() ?? []),
        material: m.material,
      })
    }
    if (category === 'eyebrows') {
      for (const part of parts) part.indices = withoutLashes(part)
    }
    if (parts.length > 0) pieces.set(node.name, { category, parts })
  }
  const heads: ReferenceHead[] = []
  for (const [name, landmarks] of Object.entries(
    options.heads ?? QUATERNIUS_HEADS
  )) {
    const head = pieces.get(name)
    if (head == null) continue
    const part = head.parts[0]
    heads.push({
      name,
      skin: part.positions,
      normals: vertexNormals(part.positions, part.indices),
      landmarks,
    })
    pieces.delete(name)
  }
  if (heads.length === 0) {
    throw new Error('human-hair: the library has no reference head')
  }
  const chosen = new Map<string, ReferenceHead>()
  const library = {
    names: (category) =>
      [...pieces]
        .filter(([, p]) => category == null || p.category === category)
        .map(([n]) => n),
    piece: (name) => pieces.get(name)?.parts,
    heads,
    headFor(name) {
      let h = chosen.get(name)
      if (h == null) {
        const parts = pieces.get(name)?.parts ?? []
        const score = new Map(heads.map((x) => [x, hug(parts, x)]))
        h = heads.reduce((a, b) => (score.get(b)! < score.get(a)! ? b : a))
        chosen.set(name, h)
      }
      return h
    },
    fitFor: (name) =>
      pieces.get(name)?.category === 'eyebrows' || FACIAL.test(name)
        ? 'face'
        : 'scalp',
    materials: container.materials,
    dispose: () => container.dispose(),
  } satisfies HairLibrary
  // The moustache's lower edge marks its head's lip line.
  const m = pieces.get(options.moustache ?? 'Hair_Moustache')?.parts[0]
  if (m != null) {
    let lo = Infinity
    let z = 0
    for (const v of m.indices) {
      if (Math.abs(m.positions[v * 3]) < 0.01 && m.positions[v * 3 + 1] < lo) {
        lo = m.positions[v * 3 + 1]
        z = m.positions[v * 3 + 2]
      }
    }
    if (lo < Infinity) {
      library.headFor(options.moustache ?? 'Hair_Moustache').lip = { y: lo, z }
    }
  }
  return library
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

/** A tinted hair material from one of the library's (its texture, its normals). */
export interface HairMaterial extends BABYLON.PBRMaterial {
  /**
   * Recolour: `light` 0 black to 1 platinum, `red` 0 to 1, and a `dye`
   * (`hue` 0 to 1, `saturation` 0 for none) over that.
   */
  setHair(
    light: number,
    red?: number,
    dye?: { hue: number; saturation: number }
  ): void
}

/*
The library's hair texture averages about this much (linear), so a colour is
divided by it to come out as itself.
*/
const HAIR_TEXTURE_MEAN = 0.42

export function hairMaterial(
  scene: BABYLON.Scene,
  from: BABYLON.Material | null,
  name = 'hair'
): HairMaterial {
  const m = (
    from instanceof BABYLON.PBRMaterial
      ? from.clone(name)
      : new BABYLON.PBRMaterial(name, scene)
  ) as HairMaterial
  m.metallic = 0
  m.backFaceCulling = false
  // A highlight band along the strands (they run along the texture's V),
  // and a soft rim at grazing angles.
  m.roughness = 0.4
  m.anisotropy.isEnabled = true
  m.anisotropy.intensity = 0.8
  m.anisotropy.direction.set(0, 1)
  m.sheen.isEnabled = true
  m.sheen.intensity = 0.25
  m.sheen.roughness = 0.4
  m.setHair = (light, red = 0, dye) => {
    const natural = hairColor(light, red)
    const c = dye ? hairDye(natural, dye.hue, dye.saturation) : natural
    const k = 1 / HAIR_TEXTURE_MEAN
    m.albedoColor = new BABYLON.Color3(
      Math.min(1, c.r * k),
      Math.min(1, c.g * k),
      Math.min(1, c.b * k)
    )
  }
  m.setHair(0.3)
  return m
}

export interface HairPlacement {
  /** Skin clearance in metres (default 2 mm), a guard where the warp is short. */
  margin?: number
  /** `face` for brows and beards (the face's warp), else the scalp's. */
  on?: 'scalp' | 'face'
  /** The library head the piece was modelled on (`library.headFor(name)`). */
  head: ReferenceHead
  /** Move the piece up or down so its middle is at this height (`head.brow`). */
  centreY?: number
  /**
   * A hand adjustment after the fit, for whoever is making the character:
   * metres up (`y`) and forward (`z`), and a `scale` about the skull's middle.
   */
  nudge?: { y?: number; z?: number; scale?: number }
}

const gapCache = new WeakMap<HairPart, Map<ReferenceHead, Float32Array>>()

/** A part's vertices' heights above its own head's skin (cached). */
function gapsOf(part: HairPart, head: ReferenceHead): Float32Array {
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
  part: HairPart,
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

/**
 * Put a library piece on a built body: carried from the library's head to
 * this one, hung on its Head bone. One mesh per part of the piece.
 */
export function humanHair(
  scene: BABYLON.Scene,
  built: BuiltRig,
  rig: FittedRig,
  scalp: HeadScalp,
  parts: HairPart[],
  material: (part: HairPart) => BABYLON.Material | null,
  options: HairPlacement & {
    /** The bone it hangs on (default `Head`). */
    bone?: string
    name?: string
  }
): BABYLON.Mesh[] {
  const headName = options.bone ?? 'Head'
  const head = built.node(headName)
  const at = rig.at(headName)
  if (head == null || at == null) {
    throw new Error(`human-hair: the rig has no ${headName}`)
  }
  return parts.map((part, i) => {
    const p = placeHair(scalp, part, options)
    for (let v = 0; v < p.length; v += 3) {
      p[v] -= at.x
      p[v + 1] -= at.y
      p[v + 2] -= at.z
    }
    const mesh = new BABYLON.Mesh(`${options.name ?? 'hair'}-${i}`, scene)
    const data = new BABYLON.VertexData()
    data.positions = p
    data.indices = Array.from(part.indices)
    if (part.uvs) data.uvs = part.uvs
    const normals: number[] = []
    // Counter-clockwise, outward: the file's handedness, under the rig's mirror.
    BABYLON.VertexData.ComputeNormals(p, data.indices, normals, {
      useRightHandedSystem: true,
    })
    data.normals = normals
    data.applyToMesh(mesh)
    mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
    mesh.material = material(part)
    mesh.parent = head
    return mesh
  })
}
