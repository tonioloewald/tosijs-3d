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
- **targets**: a target name → its file, its int16 step (metres), and whether it is dense

A dense target is int16 xyz for every vertex in order; a sparse one is `count`
uint32 vertex indices followed by `count` int16 xyz. Multiply by `step` for
metres.
*/
/*{ "parent": "character-builder", "order": 10 }*/

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
  /** MakeHuman's own skin weights, per bone of its rig (see `weights()`). */
  weights?: { bones: string[]; counts: number[]; file: string }
  targets: Record<string, HumanTargetEntry>
}

/**
 * MakeHuman's skin weights, per bone of ITS rig: bone `b`'s vertices are
 * `vertices` from `start[b]` for `counts[b]`, with `weights` alongside (0..1).
 */
export interface HumanSourceWeights {
  bones: string[]
  counts: number[]
  start: number[]
  vertices: Uint32Array
  weights: Float32Array
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
  /** The base's own skin weights, fetched once; null if the pack has none. */
  weights(): Promise<HumanSourceWeights | null>
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
  let weights: Promise<HumanSourceWeights | null> | null = null
  const pending = new Map<string, Promise<HumanTarget>>()
  const done = new Map<string, HumanTarget>()
  return {
    manifest,
    positions,
    triangles,
    has: (name) => name in manifest.targets,
    loaded: (name) => done.get(name),
    weights() {
      const w = manifest.weights
      if (w == null) return Promise.resolve(null)
      weights ??= fetcher(dir + w.file).then((bytes) => {
        const total = w.counts.reduce((a, b) => a + b, 0)
        const raw = new Uint16Array(bytes, total * 4, total)
        const start: number[] = []
        let k = 0
        for (const c of w.counts) {
          start.push(k)
          k += c
        }
        return {
          bones: w.bones,
          counts: w.counts,
          start,
          vertices: new Uint32Array(bytes, 0, total),
          weights: Float32Array.from(raw, (x) => x / 65535),
        }
      })
      return weights
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
