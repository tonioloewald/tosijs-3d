/*#
# human-pack

A **human pack** is a base body as data: its mesh, its joints and its shape
targets, converted from MakeHuman's CC0 assets by `static-assets`'
`bin/makehuman-pack.ts`. It is what the character creator (CHARACTER-DESIGN.md)
morphs; [human-morph](/human-morph/) says which targets a body uses and sums them.

A pack is a manifest (`hm08.json`) plus binaries named by their content hash,
so the binaries cache forever and a target is fetched the first time a body
asks for it. `loadHumanPack(url)` reads the manifest, the positions and the
body's triangles; `pack.target(name)` fetches one target (once).

What the manifest holds:

- **vertexCount**: every vertex, body and helpers (19,158 for hm08); targets move all of them
- **positions**: float32 xyz, metres, RIGHT-HANDED (as OBJ and glTF are)
- **body**: the triangles to draw (uint32, in threes), indexing the positions
- **joints**: a joint name → the vertices whose centroid it is (MakeHuman's joint cubes)
- **bones**: a bone → its parent, and the joints at its head and tail
- **regions**: a mask name (`lips`) → a uint8 per vertex, for tinting without UVs
- **proxies**: clothes, hair and brows bound to the base (MakeHuman's `.mhclo`: three base vertices, weights and a scaled offset per vertex), with their mesh, UVs, the base vertices they cover, and textures; see [proxy-fit](/proxy-fit/)
- **parts**: extra geometry on the body's own vertices (`eyes`, `eyelashes`), so every target moves it with the body: the pack vertices it uses (uint32), triangles indexing that list (uint32), and UVs (float32 pairs) where it has a texture
- **targets**: a target name → its file, its int16 step (metres), and whether it is dense

A dense target is int16 xyz for every vertex in order; a sparse one is `count`
uint32 vertex indices followed by `count` int16 xyz. Multiply by `step` for
metres.
*/
/*{ "parent": "character-builder", "order": 10 }*/

import type { ProxyBinding } from './proxy-fit.js'

export interface HumanTargetEntry {
  file: string
  step: number
  dense: boolean
  count: number
}

export interface HumanPackManifest {
  format: 'tosijs-human-pack'
  version: number
  base: string
  license: string
  source: { repo: string; commit: string }
  units: 'm'
  handedness: 'right'
  vertexCount: number
  positions: string
  body: { triangles: string; count: number }
  helpers: string[]
  joints: Record<string, number[]>
  bones: Record<string, { parent: string | null; head: string; tail: string }>
  /** Per-vertex masks by name (`lips`), uint8 0..255, every vertex in order. */
  regions?: Record<string, string>
  /** Extra geometry over the pack's own vertices (eyes, eyelashes). */
  parts?: Record<string, HumanPartEntry>
  /** Clothes, hair and brows bound to the base (see proxy-fit). */
  proxies?: Record<string, HumanProxyEntry>
  targets: Record<string, HumanTargetEntry>
}

export interface HumanPartEntry {
  count: number
  vertices: string
  triangles: string
  uvs?: string
}

/** A part, decoded: `vertices[i]` is the pack vertex part vertex `i` sits on. */
export interface HumanPart {
  vertices: Uint32Array
  triangles: Uint32Array
  uvs: Float32Array | null
}

export interface HumanProxyEntry {
  category: string
  /** Bound (OBJ) vertices, and drawn vertices (split at UV seams). */
  rows: number
  count: number
  /** uint32 refs ×3, float32 weights ×3, float32 offsets ×3 (metres), per row. */
  binding: string
  /** uint32 per drawn vertex: its row. */
  source: string
  triangles: string
  uvs: string
  /** uint32 base vertices the proxy covers (their skin is hidden). */
  delete?: string
  scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>
  material: { diffuse?: string; normal?: string; alpha: boolean; twoSided: boolean }
}

/** A proxy, decoded: its binding (for `fitProxy`), mesh and material files. */
export interface HumanProxy extends ProxyBinding {
  name: string
  category: string
  triangles: Uint32Array
  uvs: Float32Array
  delete: Uint32Array | null
  /** Its textures' URLs and how to draw it. */
  material: { diffuse?: string; normal?: string; alpha: boolean; twoSided: boolean }
}

/** A target, decoded: `indices` is null for a dense one. */
export interface HumanTarget {
  indices: Uint32Array | null
  deltas: Int16Array
  step: number
}

export interface HumanPack {
  manifest: HumanPackManifest
  positions: Float32Array
  triangles: Uint32Array
  /** Whether the pack has this target. */
  has(name: string): boolean
  /** Fetch and decode a target, once; later calls share the promise. */
  target(name: string): Promise<HumanTarget>
  /** A target already fetched, or undefined. */
  loaded(name: string): HumanTarget | undefined
  /** A region mask (0..1 per vertex, all of them), fetched once; null if absent. */
  region(name: string): Promise<Float32Array | null>
  /** A part (eyes, eyelashes), fetched once; null if absent. */
  part(name: string): Promise<HumanPart | null>
  /** A proxy (clothes, hair, brows), fetched once; null if absent. */
  proxy(name: string): Promise<HumanProxy | null>
}

/** Decode a target file's bytes. Pure. */
export function decodeHumanTarget(
  bytes: ArrayBuffer,
  entry: HumanTargetEntry
): HumanTarget {
  if (entry.dense) {
    return { indices: null, deltas: new Int16Array(bytes), step: entry.step }
  }
  const indexBytes = entry.count * 4
  return {
    indices: new Uint32Array(bytes, 0, entry.count),
    deltas: new Int16Array(bytes, indexBytes, entry.count * 3),
    step: entry.step,
  }
}

type Fetcher = (url: string) => Promise<ArrayBuffer>

const fetchBytes: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`human-pack: ${url} → ${res.status}`)
  return res.arrayBuffer()
}

/**
 * Load a pack from its manifest's URL. Binaries resolve beside it. `fetcher`
 * replaces `fetch` (tests, a worker, a cache).
 */
export async function loadHumanPack(
  url: string,
  fetcher: Fetcher = fetchBytes
): Promise<HumanPack> {
  const dir = url.slice(0, url.lastIndexOf('/') + 1)
  const manifest = JSON.parse(
    new TextDecoder().decode(await fetcher(url))
  ) as HumanPackManifest
  if (manifest.format !== 'tosijs-human-pack') {
    throw new Error(`human-pack: ${url} is not a human pack`)
  }
  const [positions, triangles] = await Promise.all([
    fetcher(dir + manifest.positions).then((b) => new Float32Array(b)),
    fetcher(dir + manifest.body.triangles).then((b) => new Uint32Array(b)),
  ])
  const pending = new Map<string, Promise<HumanTarget>>()
  const regions = new Map<string, Promise<Float32Array | null>>()
  const done = new Map<string, HumanTarget>()
  const parts = new Map<string, Promise<HumanPart | null>>()
  const proxies = new Map<string, Promise<HumanProxy | null>>()
  return {
    manifest,
    positions,
    triangles,
    has: (name) => name in manifest.targets,
    loaded: (name) => done.get(name),
    region(name) {
      const file = manifest.regions?.[name]
      if (file == null) return Promise.resolve(null)
      let p = regions.get(name)
      if (p == null) {
        p = fetcher(dir + file).then((b) =>
          Float32Array.from(new Uint8Array(b), (v) => v / 255)
        )
        regions.set(name, p)
      }
      return p
    },
    part(name) {
      const entry = manifest.parts?.[name]
      if (entry == null) return Promise.resolve(null)
      let p = parts.get(name)
      if (p == null) {
        p = Promise.all([
          fetcher(dir + entry.vertices),
          fetcher(dir + entry.triangles),
          entry.uvs != null ? fetcher(dir + entry.uvs) : null,
        ]).then(([v, t, uv]) => ({
          vertices: new Uint32Array(v),
          triangles: new Uint32Array(t),
          uvs: uv != null ? new Float32Array(uv) : null,
        }))
        parts.set(name, p)
      }
      return p
    },
    proxy(name) {
      const e = manifest.proxies?.[name]
      if (e == null) return Promise.resolve(null)
      let p = proxies.get(name)
      if (p == null) {
        p = Promise.all([
          fetcher(dir + e.binding),
          fetcher(dir + e.source),
          fetcher(dir + e.triangles),
          fetcher(dir + e.uvs),
          e.delete != null ? fetcher(dir + e.delete) : null,
        ]).then(([b, src, tri, uv, del]) => ({
          name,
          category: e.category,
          rows: e.rows,
          ref: new Uint32Array(b, 0, e.rows * 3),
          weight: new Float32Array(b, e.rows * 12, e.rows * 3),
          offset: new Float32Array(b, e.rows * 24, e.rows * 3),
          scale: e.scale,
          source: new Uint32Array(src),
          triangles: new Uint32Array(tri),
          uvs: new Float32Array(uv),
          delete: del != null ? new Uint32Array(del) : null,
          material: {
            ...e.material,
            diffuse: e.material.diffuse ? dir + e.material.diffuse : undefined,
            normal: e.material.normal ? dir + e.material.normal : undefined,
          },
        }))
        proxies.set(name, p)
      }
      return p
    },
    target(name) {
      let p = pending.get(name)
      if (p == null) {
        const entry = manifest.targets[name]
        if (entry == null) {
          return Promise.reject(new Error(`human-pack: no target ${name}`))
        }
        p = fetcher(dir + entry.file).then((bytes) => {
          const t = decodeHumanTarget(bytes, entry)
          done.set(name, t)
          return t
        })
        pending.set(name, p)
      }
      return p
    },
  }
}
