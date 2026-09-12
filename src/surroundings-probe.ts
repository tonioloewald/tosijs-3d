/*#
# surroundings-probe

**The Babylon half of [[surroundings]] — casting the rays that fill the read.**
The pure module answers questions about a measurement; this takes the
measurement.

Separate file because `surroundings` must stay importable without a renderer
(it is where the cover rules live, and they are worth testing against a world
you type by hand). This one imports Babylon and is where the cost is.

## What it costs, measured

One read is **12 bearings × 7 heights = 84 rays**. Measured in Chrome against
the demo arena, and again with the scene padded out with meshes nowhere near the
character:

| per read | 11 meshes | 311 | 1011 |
| --- | --- | --- | --- |
| `scene.pickWithRay` | 105µs | **2809µs** | — |
| this | **50µs** | 39µs | **73µs** |

The padding was scattered over hundreds of metres and **none of it was within
reach**. `pickWithRay` tested every mesh on every ray anyway, so a read got 27×
more expensive because the level grew somewhere else. That is the shape of cost
that kills a feature late: it benchmarks beautifully in a demo scene and falls
over in a real level, by which time it is load-bearing.

Gathering the candidates ONCE per read — a bounding-sphere distance test, a
subtract and a compare — makes the cost a function of what is **near the
character** rather than of what exists. 92× the meshes for 1.4× the time, and
the residual is the gather itself, which is the honest remaining O(n) and the
place to put a spatial index if it ever matters.

Verified identical, not merely faster: at six positions around the arena, all 84
samples agreed with `pickWithRay` to within 2mm.

**And the queries on top are free.** Everything a character needs to know about
cover — `shelterFrom` + `stanceFor` + `exposure` + `inShelter` + `peekSide` +
`muzzleClearance` — benchmarks at **160ns**, about 450× less than the read that
feeds it. The rays are the cost; the thinking is not. Worth knowing before
anyone optimises the wrong half.

So at the 10Hz the design asks for, cover discovery is **~0.7ms of CPU per
character per second**. Budgeting a tenth of a 60fps frame for it buys roughly
**140 characters**, all discovering cover, with the other 90% of the frame
untouched.

*/
/*{ "parent": "Vehicles", "order": 169 }*/

import * as BABYLON from '@babylonjs/core'
import type { Surroundings } from './surroundings.js'
import { setSample } from './surroundings.js'

export interface ReadOptions {
  /** How far to look. Anything beyond this is scenery, not cover. */
  maxRange?: number
  /**
   * Slack when gathering candidates, in metres.
   *
   * A bounding SPHERE is bigger than the mesh inside it and a long wall's
   * sphere is centred far from the bit you are standing at, so the gather has
   * to be generous or it drops the geometry it exists to find. Cheap
   * insurance: a few extra candidates cost a bounding test each.
   */
  margin?: number
  /** Narrow what counts as an obstruction. Defaults to visible + pickable. */
  filter?: (mesh: BABYLON.AbstractMesh) => boolean
  /** Reused between reads, so a per-tick probe allocates nothing. */
  scratch?: ProbeScratch
}

/** Buffers a repeated probe can reuse. Make one per character and keep it. */
export interface ProbeScratch {
  candidates: BABYLON.AbstractMesh[]
  ray: BABYLON.Ray
  from: BABYLON.Vector3
  dir: BABYLON.Vector3
}

export function makeProbeScratch(): ProbeScratch {
  return {
    candidates: [],
    ray: new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Forward(), 1),
    from: BABYLON.Vector3.Zero(),
    dir: BABYLON.Vector3.Zero(),
  }
}

const defaultFilter = (m: BABYLON.AbstractMesh): boolean =>
  m.isPickable !== false && m.isEnabled() && m.getTotalVertices() > 0

/**
 * Fill a read from the scene, around `feet`.
 *
 * `feet` is the GROUND POINT under the character, not its centre — every height
 * in the read is measured up from there, and passing a centre silently shifts
 * the whole ladder by half a body.
 *
 * And it must not MOVE when the character does something to itself. The demo
 * derived it from a capsule's position, which drops on a crouch, so the ladder
 * dropped too: the wall measured taller than it is, the character talked
 * himself out of the cover he was standing behind, stood up, found it again,
 * and crouched. A feedback loop with a stance in it, from one line that looked
 * like arithmetic.
 *
 * Mutates and returns `surr`, so a caller keeps one read per character and
 * never allocates.
 */
export function readSurroundings(
  scene: BABYLON.Scene,
  feet: BABYLON.Vector3,
  surr: Surroundings,
  options: ReadOptions = {}
): Surroundings {
  const maxRange = options.maxRange ?? 1.2
  const margin = options.margin ?? 1.5
  const keep = options.filter ?? defaultFilter
  const scratch = options.scratch ?? makeProbeScratch()
  const { candidates, ray } = scratch

  /*
  GATHER ONCE. This is the whole optimisation: `pickWithRay` tests every mesh in
  the scene on every ray, so a level that grows somewhere else makes cover
  discovery more expensive here. A bounding-sphere distance test is a subtract
  and a compare, done once for the whole read rather than 84 times.
  */
  candidates.length = 0
  const reach = maxRange + margin
  for (const m of scene.meshes) {
    if (!keep(m)) continue
    const sphere = m.getBoundingInfo().boundingSphere
    if (
      BABYLON.Vector3.Distance(sphere.centerWorld, feet) <=
      reach + sphere.radiusWorld
    ) {
      candidates.push(m)
    }
  }

  const heights = surr.heights
  for (let b = 0; b < surr.bearings.length; b++) {
    const rad = (surr.bearings[b] * Math.PI) / 180
    scratch.dir.set(Math.sin(rad), 0, Math.cos(rad))
    for (let h = 0; h < heights.length; h++) {
      scratch.from.set(feet.x, feet.y + heights[h], feet.z)
      ray.origin.copyFrom(scratch.from)
      ray.direction.copyFrom(scratch.dir)
      ray.length = maxRange
      let nearest = Infinity
      for (const c of candidates) {
        const hit = ray.intersectsMesh(c)
        if (hit.hit && hit.distance < nearest) nearest = hit.distance
      }
      setSample(surr, surr.bearings[b], h, nearest)
    }
  }
  return surr
}

/**
 * A probe that reads no more often than it needs to.
 *
 * `MOBILITY-DESIGN.md`'s other instruction — "not constantly". The mantle probe
 * runs at 12Hz and misses nothing because at a run that is ~0.4m between
 * samples, finer than any ledge worth climbing. Cover is the same: the wall
 * does not move, and neither do you, fast.
 *
 * Returns `true` when it actually took a reading, so a caller can skip the
 * derivation too rather than re-deriving identical answers sixty times a second.
 */
export class SurroundingsProbe {
  private _scratch = makeProbeScratch()
  private _since = Infinity
  private _elapsed = 0

  constructor(public surroundings: Surroundings, public hz = 10) {}

  /** Advance the clock and read if due. `dt` is seconds. */
  update(
    scene: BABYLON.Scene,
    feet: BABYLON.Vector3,
    dt: number,
    options: ReadOptions = {}
  ): boolean {
    this._since += dt
    this._elapsed += dt
    if (this._since < 1 / Math.max(0.1, this.hz)) return false
    this._since = 0
    // Stamped with when it was taken, so a consumer can refuse a stale read
    // rather than acting on where the world was a second ago.
    this.surroundings.time = this._elapsed
    readSurroundings(scene, feet, this.surroundings, {
      ...options,
      scratch: this._scratch,
    })
    return true
  }

  /** Force the next `update` to read, whatever the clock says. */
  invalidate(): void {
    this._since = Infinity
  }
}
