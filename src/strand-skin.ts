/*#
# strand skin

**A rag, a hem or a loose bandage that swings, cut from the mesh it is part
of.** A strand spring in a rig recipe (see the [rig tool](/rig-tool/)) normally hangs a new
tube from a bone. With `reach` it draws no tube: instead the mesh's own
vertices within `reach` metres of the strand are handed to its joints, so
the cloth that is already there swings.

Each vertex's share goes to the strand by two fades multiplied:

- **across**: whole within half of `reach` of the strand's line, nothing at
  `reach`, smooth between;
- **along**: nothing at the strand's root, whole `fade` metres down it
  (default: its first link), so the rag stays sewn on where it hangs from.

What the strand takes is shared between the two links nearest the vertex
along the strand, and the vertex's own weights keep the rest; the four
largest influences are kept and renormalised.

`strandSkin` is pure: the export (`riggedBodyGlb`) runs it on the body for
every strand with a `reach`.
*/
/*{ "parent": "rig-tool" }*/

type V3 = readonly [number, number, number]

export interface StrandChain {
  /** The strand's joints at rest, root first, in the mesh's frame. */
  points: readonly V3[]
  /** Each point's joint index in the skin. */
  joints: readonly number[]
}

export interface StrandSkinOptions {
  /** Metres: vertices this near the strand's line go (partly) onto it. */
  reach: number
  /** Metres down the strand where it takes a vertex wholly (default: its first link). */
  fade?: number
}

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * Reweight the vertices near `chain` onto its joints. `joints` and
 * `weights` are four per vertex; new arrays are returned and the inputs are
 * left alone. `taken` counts the vertices the strand took any share of.
 */
export function strandSkin(
  positions: ArrayLike<number>,
  joints: ArrayLike<number>,
  weights: ArrayLike<number>,
  chain: StrandChain,
  options: StrandSkinOptions
): { joints: Uint16Array; weights: Float32Array; taken: number } {
  const outJ = Uint16Array.from(joints)
  const outW = Float32Array.from(weights)
  const pts = chain.points
  const links = pts.length - 1
  if (links < 1 || !(options.reach > 0))
    return { joints: outJ, weights: outW, taken: 0 }
  const legs: number[] = []
  const starts: number[] = []
  let total = 0
  for (let k = 0; k < links; k++) {
    const a = pts[k]
    const b = pts[k + 1]
    starts.push(total)
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    legs.push(l)
    total += l
  }
  const reach = options.reach
  const fade = options.fade ?? legs[0]
  let taken = 0
  const n = positions.length / 3
  for (let v = 0; v < n; v++) {
    const px = positions[v * 3]
    const py = positions[v * 3 + 1]
    const pz = positions[v * 3 + 2]
    // The nearest point on the strand's line: which link, how far along.
    let best = Infinity
    let bestLink = 0
    let bestT = 0
    for (let k = 0; k < links; k++) {
      const a = pts[k]
      const b = pts[k + 1]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const dz = b[2] - a[2]
      const l2 = dx * dx + dy * dy + dz * dz
      let t =
        l2 > 0
          ? ((px - a[0]) * dx + (py - a[1]) * dy + (pz - a[2]) * dz) / l2
          : 0
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(
        a[0] + dx * t - px,
        a[1] + dy * t - py,
        a[2] + dz * t - pz
      )
      if (d < best) {
        best = d
        bestLink = k
        bestT = t
      }
    }
    if (best >= reach) continue
    const along = starts[bestLink] + legs[bestLink] * bestT
    const share =
      (1 - smooth((best - reach / 2) / (reach / 2))) *
      (fade > 0 ? smooth(along / fade) : 1)
    if (share <= 1e-4) continue
    taken++
    // Shared between the two links nearest along (each centred on its middle).
    const u = Math.max(0, Math.min(links - 1, bestLink + bestT - 0.5))
    const lo = Math.floor(u)
    const hi = Math.min(links - 1, lo + 1)
    const f = u - lo
    const inf = new Map<number, number>()
    const add = (j: number, w: number) => {
      if (w > 0) inf.set(j, (inf.get(j) ?? 0) + w)
    }
    for (let i = 0; i < 4; i++)
      add(outJ[v * 4 + i], outW[v * 4 + i] * (1 - share))
    add(chain.joints[lo], share * (1 - f))
    add(chain.joints[hi], share * f)
    const top = [...inf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = top.reduce((s, [, w]) => s + w, 0) || 1
    for (let i = 0; i < 4; i++) {
      outJ[v * 4 + i] = top[i]?.[0] ?? 0
      outW[v * 4 + i] = (top[i]?.[1] ?? 0) / sum
    }
  }
  return { joints: outJ, weights: outW, taken }
}
