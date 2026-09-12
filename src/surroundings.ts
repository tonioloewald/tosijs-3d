/*#
# surroundings

**One budgeted read of what is around a character, and the affordances derived
from it.** Pure — distances and degrees, no Babylon, no rays — so cover can be
tested against a world you type out by hand.

Two halves, and the split is the point:

- **The READ** is a measurement. A ring of bearings × a ladder of heights, each
  holding the distance to the nearest obstruction. It knows nothing about cover,
  climbing or shooting.
- **The QUERIES** are relations between that measurement, a character and a
  threat. `shelterFrom` is not a property of a wall; it depends on your size,
  your stance and where the shooting is coming from.

`MOBILITY-DESIGN.md` argues both, and the second is the one with teeth:

> **Suffixes declare what geometry IS. Affordances describe what a character can
> DO with it, and must be computed.** A `_cover` suffix would be a bug, not a
> shortcut.

## Demo — walk into cover and watch it happen

**WASD / left stick** to move. The red sphere is the shooter. The marker turns
green when you are in cover, and the readout says how much of you is hidden,
what stance the cover demands, which side you could lean out of, and whether
your own wall is in the way of your shot.

Things worth doing:

- **Stand behind the long low wall.** You are covered — crouched. Now walk to
  its end and watch cover fall away with nothing pressed and nothing stuck.
- **Stand behind the pillar.** Full cover, and `peek` says `both` — a pillar is
  cover you can shoot past on either side.
- **Walk into the corner.** The wall doing the work is not the one facing the
  shooter, which is why `shelterFrom` searches an arc.
- **Compare the low wall with the railing** (the one on legs). Same height, same
  distance, no cover at all — because a shelter with a gap under it is not a
  shelter.

The rays are cast at 10Hz, not every frame, which is the budget the design
asks for: 12 bearings × 7 heights is 84 casts, and at a walk you move 5cm
between reads.

```js
import { b3d, b3dSkybox, b3dController, sceneDelta, label3d, slider3d } from 'tosijs-3d'
import { makeSurroundings, SurroundingsProbe, shelterFrom, exposure, inShelter, stanceFor, peekSide, muzzleClearance, DEFAULT_HEIGHTS } from 'tosijs-3d'
import { demoSun, orbitCam, patternGround } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const demo = tosi({ coverDemo: { range: 1.2, needed: 0.8 } })
const s = demo.coverDemo

let hero = null
let babylon = null
let readout = null
let covered = false

const controller = b3dController({
  mapping: 'biped',
  drive(input, dt) {
    if (!hero) return
    // World-axis walking: this demo is about WHERE you stand, not about driving.
    hero.position.x += input.strafe * dt * 4
    hero.position.z += input.forward * dt * 4
  },
})

const panel = () => [
  label3d({ text: 'Cover' }),
  slider3d({ label: 'reach (m)', value: s.range, min: 0.5, max: 3, step: 0.1, showValue: 'always',
    handleChange: (v) => { s.range = v } }),
  slider3d({ label: 'needed', value: s.needed, min: 0.4, max: 1, step: 0.05, showValue: 'always',
    handleChange: (v) => { s.needed = v } }),
  label3d({ text: 'WASD to move · green = in cover', muted: true }),
]

const scene = b3d(
  {
    style: 'width:100%;height:100%',
    gamepad: 'left_stick',
    scenePanel: panel,
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      orbitCam(el, { radius: 26, beta: 0.62, target: [0, 1, 2] })

      const solid = (name, w, h, d, x, y, z) => {
        const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, el.scene)
        m.position.set(x, y, z)
        const mat = new BABYLON.StandardMaterial(name + '-mat', el.scene)
        mat.diffuseColor = new BABYLON.Color3(0.55, 0.52, 0.48)
        m.material = mat
        el.register?.({ meshes: [m] })
        return m
      }

      // A low wall, a pillar, an L-shaped corner, and a railing that is not cover.
      solid('lowwall', 9, 1.1, 0.4, -3, 0.55, 5)
      solid('pillar', 1.2, 2.4, 1.2, 5, 1.2, 4)
      solid('corner-a', 0.4, 2.2, 5, 10, 1.1, 2)
      solid('corner-b', 4, 2.2, 0.4, 8.2, 1.1, 4.6)
      // A railing: top rail only, wide open underneath.
      solid('rail', 6, 0.25, 0.3, -9, 1.05, 5)
      solid('rail-post-a', 0.2, 1.1, 0.2, -11.8, 0.55, 5)
      solid('rail-post-b', 0.2, 1.1, 0.2, -6.2, 0.55, 5)

      const threat = BABYLON.MeshBuilder.CreateSphere('threat', { diameter: 0.9 }, el.scene)
      threat.position.set(0, 1.5, 18)
      const tm = new BABYLON.StandardMaterial('threat-mat', el.scene)
      tm.diffuseColor = new BABYLON.Color3(0.9, 0.15, 0.2)
      tm.emissiveColor = new BABYLON.Color3(0.5, 0.05, 0.08)
      threat.material = tm

      hero = BABYLON.MeshBuilder.CreateCapsule('hero', { height: 1.8, radius: 0.35 }, el.scene)
      hero.position.set(0, 0.9, -2)
      const hm = new BABYLON.StandardMaterial('hero-mat', el.scene)
      hero.material = hm
      el.register?.({ meshes: [hero] })

      // ONE probe, throttled to 10Hz, reusing its buffers. `SurroundingsProbe`
      // gathers the nearby meshes once per read instead of asking the whole
      // scene 84 times — see the cost table in `surroundings-probe`.
      const surr = makeSurroundings({ bearingCount: 12, heights: DEFAULT_HEIGHTS })
      const probe = new SurroundingsProbe(surr, 10)
      const solidOnly = (m) => m !== hero && m !== threat && m.name !== 'ground' && m.isVisible
      const foot = new BABYLON.Vector3(0, 0, 0)

      el.scene.onBeforeRenderObservable.add(() => {
        const dt = sceneDelta(el.scene)
        const range = Number(s.range)
        // THE FEET, and the feet do not move when he crouches. Deriving them
        // from `position` (a capsule CENTRE, which drops on a crouch) shifts
        // the whole height ladder down with it, so the wall measures taller
        // than it is and the character talks himself out of the cover he is
        // standing behind — while crouching, which lowers it again.
        foot.set(hero.position.x, 0, hero.position.z)
        // `false` means "nothing new to look at" — so the derivation is skipped
        // too, rather than recomputing identical answers sixty times a second.
        if (!probe.update(el.scene, foot, dt, { maxRange: range, filter: solidOnly })) return

        const threatDeg = (Math.atan2(threat.position.x - hero.position.x,
                                      threat.position.z - hero.position.z) * 180) / Math.PI
        const stature = { standing: 1.8, needed: Number(s.needed) }
        const sh = shelterFrom(surr, threatDeg, { maxRange: range })
        // Stance FIRST: how exposed you are depends on what you are doing
        // about it, and a low wall you are crouched behind hides all of you.
        const stance = stanceFor(sh.height, stature)
        const masked = 1 - exposure(sh.height, stature, stance ?? 'standing')
        covered = inShelter(masked, covered)
        const peek = peekSide(surr, threatDeg, { maxRange: range })
        const clear = muzzleClearance(surr, threatDeg, stance === 'crouched' ? 0.9 : 1.45, { maxRange: range })

        hm.diffuseColor = covered
          ? new BABYLON.Color3(0.25, 0.75, 0.35)
          : new BABYLON.Color3(0.9, 0.6, 0.2)
        // Crouch when the cover demands it — derived, like everything else here.
        hero.scaling.y = stance === 'crouched' ? 0.62 : 1
        // Keep the FEET on the floor whatever the stance does.
        hero.position.y = 0.9 * hero.scaling.y

        if (readout) {
          readout.textContent =
            `hidden ${(masked * 100).toFixed(0)}%   cover ${sh.height.toFixed(1)}m   ` +
            `${covered ? 'IN COVER' : 'exposed'}   stance ${stance ?? 'none'}   ` +
            `peek ${peek ?? 'none'}   ${clear > 0 ? `shot BLOCKED (needs ${clear.toFixed(1)}m)` : 'shot clear'}`
        }
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 11 }),
  patternGround({ size: 60 }),
  controller
)

preview.append(scene)
readout = document.createElement('div')
readout.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;font:12px monospace;background:#0009;color:#fff;padding:4px 8px;border-radius:4px'
preview.append(readout)
```
```css
.preview { height: 100%; position: relative; }
```

## Why a shared read rather than a fan of rays per feature

Also `MOBILITY-DESIGN.md`, written when `mantle` shipped and predicting this
exact moment:

> when the second consumer appears, **do not give it its own fan of rays.** One
> budgeted environmental read per tick, shared — "what is around me, at what
> heights, how far" — with features asking questions of the result.

Cover is that second consumer. A mantle check is eight casts; cover wants a ring;
"can I get there" wants another; at eight per frame per feature a character
controller eats the frame budget on its own. And a shared read has a second
virtue that matters more than the cost: every feature is then reasoning about
the SAME world. Two private reads disagree at exactly the moment they matter —
the frame you are half behind a wall.

The read is deliberately coarse. Twelve bearings is 30° apart, which sounds
crude until you remember what it is for: a wall you are pressed against occupies
many buckets, and a gap you could be shot through occupies at least one. It is
sampling a room, not tracing a silhouette.

## Heights, not a height

The lesson `mantle` paid for, in this module's shape rather than in a comment.
One forward ray at shin height missed a canal bank whose face existed only
between 0.25m and 1.25m — undercut below, sloping away above — so the character
was visibly stuck against a wall the probe said was not there. **Real geometry is
not sampled correctly by a single ray, and the failure is silent**, because a
miss and an absence are the same reading.

So the unit of measurement here is a COLUMN: what is in front of me, at every
height that matters. A low wall and a doorway are the same distance and
completely different affordances, and the only thing that tells them apart is
which heights are blocked.

## Cover is derived, never entered

`shelterFrom` returns how much of you is masked, right now. There is no
`enterCover`, no cover state and nothing to be stuck in — the anti-goal the whole
design is organised around. `inShelter` adds the one bit of state anybody needs,
and it is hysteresis rather than a mode: `isSwimming` flickered at its threshold
in the smallest possible case, and this band is budgeted for from the start
rather than discovered later.
*/
/*{ "parent": "Vehicles", "order": 168 }*/

/**
 * A ring-and-ladder read of the surroundings.
 *
 * `distance[b * heights.length + h]` is how far the nearest obstruction is along
 * bearing `b` at height `h`, or `Infinity` for nothing within range. Flat rather
 * than nested, so a read is one allocation and can be reused frame to frame —
 * a structure that allocates per tick is a structure that gets throttled for the
 * wrong reason.
 */
export interface Surroundings {
  /** Sampled bearings, degrees, ascending. World-relative, like `aim`'s yaw. */
  bearings: readonly number[]
  /** Heights above the feet, in metres, ascending. */
  heights: readonly number[]
  distance: Float32Array
  /** Seconds when it was taken, so a caller can refuse a stale read. */
  time: number
}

export interface SurroundingsSpec {
  /** Bearings around the character. 12 (every 30°) is the working default. */
  bearingCount?: number
  /** Heights to sample, ascending. Defaults span ankle to overhead. */
  heights?: readonly number[]
  time?: number
}

/**
 * Heights that distinguish the things a body cares about.
 *
 * Not evenly spaced, and deliberately: the interesting boundaries are a step
 * (0.3), a crouch (0.9), a shoulder (1.4) and overhead (2.0). Even spacing puts
 * samples where nothing changes and misses the lines that matter.
 */
export const DEFAULT_HEIGHTS: readonly number[] = [
  0.3, 0.6, 0.9, 1.2, 1.4, 1.7, 2.0,
]

/** An empty read — every direction clear. Fill it with `setSample`. */
export function makeSurroundings(spec: SurroundingsSpec = {}): Surroundings {
  const n = Math.max(1, Math.floor(spec.bearingCount ?? 12))
  const heights = spec.heights ?? DEFAULT_HEIGHTS
  const bearings: number[] = []
  for (let i = 0; i < n; i++) bearings.push((360 / n) * i)
  const distance = new Float32Array(n * heights.length)
  distance.fill(Infinity)
  return { bearings, heights, distance, time: spec.time ?? 0 }
}

/** The bearing bucket a direction falls in. Wraps, so 359° and 1° agree. */
export function bearingIndex(surr: Surroundings, deg: number): number {
  const n = surr.bearings.length
  if (!Number.isFinite(deg)) return 0
  const step = 360 / n
  return ((Math.round(deg / step) % n) + n) % n
}

/** Record one measurement. `distance` is metres; `Infinity` means nothing hit. */
export function setSample(
  surr: Surroundings,
  bearing: number,
  heightIndex: number,
  distance: number
): void {
  const h = Math.max(0, Math.min(surr.heights.length - 1, heightIndex))
  const b = bearingIndex(surr, bearing)
  surr.distance[b * surr.heights.length + h] = distance
}

/** Read one measurement back, by bucket. */
export function sampleAt(
  surr: Surroundings,
  bearingIdx: number,
  heightIndex: number
): number {
  const n = surr.bearings.length
  const b = ((bearingIdx % n) + n) % n
  const h = Math.max(0, Math.min(surr.heights.length - 1, heightIndex))
  return surr.distance[b * surr.heights.length + h]
}

/** How much of a body one bearing shelters. */
export interface Shelter {
  /**
   * Height of the top of the shelter, in metres above the feet.
   *
   * `0` means nothing blocking. It is the top of the run of blocked heights
   * STARTING FROM THE GROUND, not the highest blocked sample — a railing at
   * chest height with a gap under it shelters nothing, and reporting its height
   * would be a lie that gets somebody shot.
   */
  height: number
  /** Distance to it, metres. `Infinity` when there is no shelter at all. */
  distance: number
  /** Bearing it was found on, degrees. */
  bearing: number
}

export interface ShelterOptions {
  /** How close the geometry must be to shelter you. Beyond this it is scenery. */
  maxRange?: number
  /** Bearings either side of the threat to consider, in degrees. */
  arcDeg?: number
}

/**
 * What shelters this character from a threat over there.
 *
 * Searches the bearings that lie between the character and the threat — cover
 * you are standing behind, not cover you are standing in front of — and returns
 * the best column found.
 *
 * `arcDeg` is why this is not a single lookup. Pressed into a corner, the wall
 * doing the work is often not the one facing the shooter, and a character who
 * only ever consults one bearing pops out of cover as the threat drifts across
 * a bucket boundary.
 */
export function shelterFrom(
  surr: Surroundings,
  threatDeg: number,
  options: ShelterOptions = {}
): Shelter {
  const maxRange = options.maxRange ?? 1.2
  const arc = Math.abs(options.arcDeg ?? 45)
  const step = 360 / surr.bearings.length
  const span = Math.floor(arc / step)
  const centre = bearingIndex(surr, threatDeg)
  let best: Shelter = { height: 0, distance: Infinity, bearing: threatDeg }
  for (let k = -span; k <= span; k++) {
    const top = columnTop(surr, centre + k, maxRange)
    if (top > best.height) {
      best = {
        height: top,
        distance: sampleAt(surr, centre + k, 0),
        bearing: bearingOf(surr, centre + k),
      }
    }
  }
  return best
}

/**
 * How high the unbroken wall is on one bearing.
 *
 * From the ground UP, stopping at the first gap — the single rule that makes
 * this a measurement of shelter rather than of clutter. A railing at chest
 * height with a gap under it is not cover, and reporting its height would be a
 * lie that gets somebody shot.
 */
function columnTop(
  surr: Surroundings,
  bearingIdx: number,
  maxRange: number
): number {
  let top = 0
  for (let h = 0; h < surr.heights.length; h++) {
    if (sampleAt(surr, bearingIdx, h) > maxRange) break
    top = surr.heights[h]
  }
  return top
}

const bearingOf = (surr: Surroundings, i: number): number => {
  const n = surr.bearings.length
  return surr.bearings[((i % n) + n) % n]
}

/** What a body is, for the purpose of hiding it. */
export interface Stature {
  /** Standing height, metres. The default is this repo's 1.8m person. */
  standing?: number
  /** Crouched height. About 55% is a human crouch that can still shuffle. */
  crouched?: number
  /** Fraction of the body that must be masked to count as covered. */
  needed?: number
}

/**
 * The stance this shelter demands — or `null` if it shelters you at all.
 *
 * Policy, kept apart from the measurement on purpose. `shelterFrom` says how
 * tall the wall is; this says what you have to do about it, and a game that
 * wants a braver character only changes `needed`.
 */
export function stanceFor(
  shelterHeight: number,
  stature: Stature = {}
): 'standing' | 'crouched' | null {
  const standing = stature.standing ?? 1.8
  const crouched = stature.crouched ?? standing * 0.55
  const needed = stature.needed ?? 0.8
  if (shelterHeight >= standing * needed) return 'standing'
  if (shelterHeight >= crouched * needed) return 'crouched'
  return null
}

/**
 * How much of the body is showing, `0`..`1` — given what it is DOING.
 *
 * The stance argument is not a convenience. Measuring a 1.1m wall against a
 * standing body says you are half exposed, which is true and useless: the
 * character is about to crouch, and crouched that wall hides him completely.
 * Reporting the standing number alongside the advice to crouch is how the demo
 * came to say "stance crouched" and "exposed" in the same line — two correct
 * facts adding up to a wrong one.
 *
 * So exposure is a question about a POSE, not about a person.
 */
export function exposure(
  shelterHeight: number,
  stature: Stature = {},
  stance: 'standing' | 'crouched' = 'standing'
): number {
  const standing = stature.standing ?? 1.8
  const height =
    stance === 'crouched' ? stature.crouched ?? standing * 0.55 : standing
  if (!(height > 0)) return 1
  return Math.max(0, Math.min(1, 1 - shelterHeight / height))
}

/**
 * Are we in cover? The one bit of state, and it is hysteresis, not a mode.
 *
 * `MOBILITY-DESIGN.md` predicted needing this and said to budget for it rather
 * than discover it: `isSwimming` flickered walking down a ramp into water, and
 * a character flickering in and out of cover at a boundary would do the same
 * thing with far more visible consequences. The band is narrow on purpose —
 * you cannot be stuck in it, it only decides when the label changes.
 *
 * Pass the previous answer back in. There is nothing else to store.
 */
export function inShelter(
  masked: number,
  wasInShelter = false,
  enter = 0.6,
  leave = 0.45
): boolean {
  return wasInShelter ? masked > leave : masked >= enter
}

/** Which way you can lean out of cover to shoot. */
export type PeekSide = 'left' | 'right' | 'both' | null

/**
 * Where this cover ENDS, which is where you shoot from.
 *
 * Cover that shelters you completely is cover you cannot shoot from, and a
 * character who steps out of the wrong side of it steps into the open. So this
 * looks at the bearings just off the threat and reports which ones are clear:
 * that is the edge to lean past.
 *
 * `left` and `right` are the character's, facing the threat.
 */
export function peekSide(
  surr: Surroundings,
  threatDeg: number,
  options: ShelterOptions & { minHeight?: number } = {}
): PeekSide {
  const maxRange = options.maxRange ?? 1.2
  const step = 360 / surr.bearings.length
  const out = Math.max(1, Math.round(45 / step))
  const centre = bearingIndex(surr, threatDeg)
  /*
  NO COVER, NO PEEK. Standing in the open, every bearing is clear and the naive
  answer is "both" — which reads as an affordance and is the opposite of one.
  Found by looking at the demo: a character alone in a field, reporting that he
  could lean out of either side of nothing.
  */
  if (columnTop(surr, centre, maxRange) <= 0) return null
  const clear = (k: number): boolean => {
    // Clear at chest height is what matters — you lean, you do not crawl.
    let blocked = 0
    for (let h = 0; h < surr.heights.length; h++) {
      if (surr.heights[h] < (options.minHeight ?? 1.0)) continue
      if (sampleAt(surr, centre + k, h) <= maxRange) blocked++
    }
    return blocked === 0
  }
  const right = clear(out)
  const left = clear(-out)
  if (left && right) return 'both'
  if (left) return 'left'
  if (right) return 'right'
  return null
}

/**
 * Is my own cover in the way of my shot?
 *
 * The question that makes cover-shooting work rather than merely look right. A
 * character crouched behind a wall has a clear line at 1.6m and no line at all
 * at 0.9m, so "can I fire from here" is answerable from the same read that put
 * him there — no second query, no extra rays, and no chance of the two
 * disagreeing about where the wall is.
 *
 * Returns the height the muzzle would have to reach, or `0` if the shot is
 * already clear. A caller turns that into "stand up", "lean out" or "no shot".
 */
export function muzzleClearance(
  surr: Surroundings,
  aimDeg: number,
  muzzleHeight: number,
  options: ShelterOptions = {}
): number {
  const maxRange = options.maxRange ?? 1.2
  const b = bearingIndex(surr, aimDeg)
  const blocked = (h: number): boolean => sampleAt(surr, b, h) <= maxRange

  /*
  WHAT BLOCKS A SHOT IS WHAT IS AT THE MUZZLE'S HEIGHT — not the column from
  the ground, which is what the first version asked and is the wrong question
  twice over. It said a crouching shooter could fire through his own wall
  (because the wall's base was below the muzzle) and that a standing one could
  not (because its base was still there). A railing shows it from the other
  side: nothing from the ground up, and it will still stop a bullet at chest
  height.
  */
  let at = -1
  for (let h = 0; h < surr.heights.length; h++) {
    if (surr.heights[h] <= muzzleHeight) at = h
  }
  // Muzzle below everything we sample: use the lowest sample we have.
  if (at < 0) at = 0
  if (!blocked(at)) return 0

  // Blocked. Climb out of the band the muzzle is inside.
  for (let h = at + 1; h < surr.heights.length; h++) {
    if (!blocked(h)) return surr.heights[h]
  }
  // Blocked all the way up — a wall, not cover. Report above the top sample so
  // a caller gets "no shot from here" rather than a height it can reach.
  return surr.heights[surr.heights.length - 1] + 0.2
}

/**
 * Which way to shuffle to be better covered.
 *
 * Deliberately weak, and worth saying why. A single-point read cannot know what
 * cover exists ten metres away — it only knows what is around the character
 * now. So this answers the modest question it can: **of the directions I could
 * step, which leaves more of me behind something?** That is enough for "press
 * into the nook" (the north star's own phrasing) and nowhere near enough for
 * "dash to that crate", which needs a spatial query this module should not
 * pretend to be.
 *
 * Returns `null` when nothing nearby improves matters, which a caller should
 * treat as "there is no cover here" rather than "stay put".
 */
export function shuffleToward(
  surr: Surroundings,
  threatDeg: number,
  options: ShelterOptions = {}
): number | null {
  const maxRange = options.maxRange ?? 1.2
  const here = shelterFrom(surr, threatDeg, options).height
  const n = surr.bearings.length
  const step = 360 / n
  // Only directions that are broadly toward the threat: shelter you would have
  // to walk PAST the shooter to reach is not shelter.
  const span = Math.floor(90 / step)
  const centre = bearingIndex(surr, threatDeg)
  let bestTop = here + 0.05
  let bearing: number | null = null
  for (let k = -span; k <= span; k++) {
    const dist = sampleAt(surr, centre + k, 0)
    // Already pressed against it — stepping further is walking into a wall.
    if (dist < 0.4) continue
    const top = columnTop(surr, centre + k, maxRange)
    if (top > bestTop) {
      bestTop = top
      bearing = bearingOf(surr, centre + k)
    }
  }
  return bearing
}
