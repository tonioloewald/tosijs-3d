/*#
# human-morph

The body sliders of the character creator (CHARACTER-DESIGN.md), as pure
functions over a [human pack](/human-pack/): which targets a body uses and how
much, and the sum that turns them into positions.

MakeHuman's macro targets are sculpted at the CORNERS of a grid: female or
male, baby, child, young or old, three muscle and three weight levels, and
three ancestries. A body between corners is a weighted mix of the corners
around it, and every slider is a position on one axis of that grid. The rules
here are written from MakeHuman's file names and documented behaviour; none of
their (AGPL) code is used.

The sliders, each from 0 to 1:

- **gender**: female at 0, male at 1
- **age**: 1 year at 0, 11 at 0.1875, 25 at 0.5, 90 at 1
- **muscle** and **weight**: least at 0, average at 0.5, most at 1
- **height**: shortest at 0, average for the rest of the body at 0.5, tallest at 1
- **proportions**: uncommon at 0, neutral at 0.5, ideal at 1
- **waist**: narrowest at 0, as the rest of the body has it at 0.5, widest at 1
  (MakeHuman's waist circumference, plus a pinch toward the centre line below
  0.5, because that target mostly takes depth off)

`african`, `asian` and `caucasian` are an ancestry MIX, normalised to sum to 1
(all zero is an even mix).

```javascript
const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json'))
const weights = macroWeights({ ...DEFAULT_HUMAN_BODY, height: 0.9 }, (n) => pack.has(n))
const positions = await morphHuman(pack, weights)
```

A dense macro costs about 0.03 ms to add on a desktop, so a body is morphed on
the spot rather than in a worker.
*/
/*{ "parent": "character-builder", "order": 20 }*/

import type { HumanPack, HumanTarget } from './human-pack.js'

export interface MacroBody {
  gender: number
  age: number
  muscle: number
  weight: number
  height: number
  proportions: number
  african: number
  asian: number
  caucasian: number
  /** Front-to-back depth of the chest, 0.5 neutral. */
  chestDepth?: number
  /** Pectoral muscle, 0.5 neutral. */
  pecs?: number
  /** Waist circumference, 0.5 neutral (MakeHuman's measure-waist-circ). */
  waist?: number
  /** Bust size (cup), 0.5 average; applies in proportion to how female the body is. */
  bustSize?: number
  /** Bust firmness, 0.5 average. */
  bustFirmness?: number
}

export const DEFAULT_HUMAN_BODY: Readonly<MacroBody> = Object.freeze({
  gender: 0.5,
  age: 0.5,
  muscle: 0.5,
  weight: 0.5,
  height: 0.5,
  proportions: 0.5,
  african: 1 / 3,
  asian: 1 / 3,
  caucasian: 1 / 3,
  chestDepth: 0.5,
  pecs: 0.5,
  waist: 0.5,
  bustSize: 0.5,
  bustFirmness: 0.5,
})

type Corners = [string, number][]

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Female / male. */
export function genderCorners(g: number): Corners {
  g = clamp01(g)
  return [
    ['female', 1 - g],
    ['male', g],
  ]
}

/** Baby (1 year) / child (11) / young (25) / old (90). */
export function ageCorners(a: number): Corners {
  a = clamp01(a)
  if (a < 0.1875) {
    const t = a / 0.1875
    return [
      ['baby', 1 - t],
      ['child', t],
    ]
  }
  if (a < 0.5) {
    const t = (a - 0.1875) / 0.3125
    return [
      ['child', 1 - t],
      ['young', t],
    ]
  }
  const t = (a - 0.5) / 0.5
  return [
    ['young', 1 - t],
    ['old', t],
  ]
}

/** The age in years a slider value means. */
export function ageYears(a: number): number {
  a = clamp01(a)
  if (a < 0.1875) return 1 + (a / 0.1875) * 10
  if (a < 0.5) return 11 + ((a - 0.1875) / 0.3125) * 14
  return 25 + ((a - 0.5) / 0.5) * 65
}

/** min / average / max, for muscle and weight. */
function threeLevel(x: number, word: string): Corners {
  x = clamp01(x)
  if (x < 0.5) {
    return [
      [`min${word}`, 1 - x * 2],
      [`average${word}`, x * 2],
    ]
  }
  return [
    [`average${word}`, 1 - (x - 0.5) * 2],
    [`max${word}`, (x - 0.5) * 2],
  ]
}

/** One end of a bipolar slider: the weight of `low` below 0.5, `high` above. */
function bipolar(x: number, low: string, high: string): Corners {
  x = clamp01(x)
  return x < 0.5 ? [[low, (0.5 - x) * 2]] : [[high, (x - 0.5) * 2]]
}

/** The ancestry mix, normalised. */
export function ancestryCorners(body: MacroBody): Corners {
  const sum = body.african + body.asian + body.caucasian
  if (!(sum > 0)) {
    return [
      ['african', 1 / 3],
      ['asian', 1 / 3],
      ['caucasian', 1 / 3],
    ]
  }
  return [
    ['african', body.african / sum],
    ['asian', body.asian / sum],
    ['caucasian', body.caucasian / sum],
  ]
}

/**
 * Every macro target a body uses, with its weight. `has` filters to what the
 * pack holds (MakeHuman has no baby proportions, for one); a weight of zero is
 * left out, so the list is also what to fetch.
 */
export function macroWeights(
  body: MacroBody,
  has: (name: string) => boolean = () => true
): Map<string, number> {
  const out = new Map<string, number>()
  const add = (name: string, w: number) => {
    if (w <= 1e-6 || !has(name)) return
    out.set(name, (out.get(name) ?? 0) + w)
  }
  const genders = genderCorners(body.gender)
  const ages = ageCorners(body.age)
  const muscles = threeLevel(body.muscle, 'muscle')
  const weights = threeLevel(body.weight, 'weight')
  const heights = bipolar(body.height, 'minheight', 'maxheight')
  const proportions = bipolar(
    body.proportions,
    'uncommonproportions',
    'idealproportions'
  )
  for (const [race, rw] of ancestryCorners(body)) {
    for (const [g, gw] of genders) {
      for (const [a, aw] of ages) {
        add(`macrodetails/${race}-${g}-${a}`, rw * gw * aw)
      }
    }
  }
  for (const [g, gw] of genders) {
    for (const [a, aw] of ages) {
      for (const [m, mw] of muscles) {
        for (const [w, ww] of weights) {
          const base = gw * aw * mw * ww
          const corner = `${g}-${a}-${m}-${w}`
          add(`macrodetails/universal-${corner}`, base)
          for (const [h, hw] of heights) {
            add(`macrodetails/height/${corner}-${h}`, base * hw)
          }
          for (const [p, pw] of proportions) {
            add(`macrodetails/proportions/${corner}-${p}`, base * pw)
          }
          /*
          THE BUST: MakeHuman's breast targets are corners like the macros,
          plus cup and firmness, for the female half of the body only; the
          average cup at average firmness is the base shape, so it has none.
          */
          if (g === 'female') {
            for (const [c, cw] of threeLevel(body.bustSize ?? 0.5, 'cup')) {
              for (const [f, fw] of threeLevel(
                body.bustFirmness ?? 0.5,
                'firmness'
              )) {
                if (c === 'averagecup' && f === 'averagefirmness') continue
                add(`breast/${corner}-${c}-${f}`, base * cw * fw)
              }
            }
          }
        }
      }
    }
  }
  // Chest depth and pectorals: plain pairs, independent of the macros.
  for (const [t, w] of bipolar(body.chestDepth ?? 0.5, 'decr', 'incr')) {
    add(`torso/torso-scale-depth-${t}`, w)
  }
  for (const [t, w] of bipolar(body.pecs ?? 0.5, 'decr', 'incr')) {
    add(`torso/torso-muscle-pectoral-${t}`, w)
  }
  // The waist on its own: the weight macros barely narrow a woman's.
  for (const [t, w] of bipolar(body.waist ?? 0.5, 'decr', 'incr')) {
    add(`measure/measure-waist-circ-${t}`, w)
  }
  /*
  MakeHuman's waist circumference mostly takes DEPTH off (about 4 cm to 1.5
  across), and none of its shapes narrows the waist from the front alone (hip
  width takes the hips too, V-shape widens the shoulders, torso width takes the
  ribs). So the narrow end also pinches the waist toward the centre line, a
  shape computed here rather than a target in the pack.
  */
  const narrow = (0.5 - clamp01(body.waist ?? 0.5)) * 2
  if (narrow > 1e-6) out.set(WAIST_NARROW, narrow)
  return out
}

/** The computed waist pinch's name in a `macroWeights` map (not a pack target). */
export const WAIST_NARROW = 'shape/waist-narrow'

/** How much of the waist's width the pinch takes at most. */
const WAIST_PINCH = 0.14

// Which vertices the pinch moves and how much (0..1), from the BASE mesh,
// where the arms are far from the waist; once per pack.
const pinchMasks = new WeakMap<object, Float32Array>()
function waistMask(base: ArrayLike<number>, triangles: ArrayLike<number>): Float32Array {
  let mask = pinchMasks.get(base as object)
  if (mask != null) return mask
  const n = base.length / 3
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < triangles.length; i++) {
    const y = base[triangles[i] * 3 + 1]
    if (y < lo) lo = y
    if (y > hi) hi = y
  }
  const h = hi - lo
  // The waist: the narrowest torso between 58% and 72% of the height.
  let waistY = lo + h * 0.645
  let narrowest = Infinity
  for (let f = 0.58; f <= 0.72; f += 0.005) {
    const y = lo + h * f
    let w = 0
    for (let i = 0; i < triangles.length; i++) {
      const v = triangles[i]
      const x = Math.abs(base[v * 3])
      if (Math.abs(base[v * 3 + 1] - y) < 0.004 && x < 0.2 && x > w) w = x
    }
    if (w > 0 && w < narrowest) {
      narrowest = w
      waistY = y
    }
  }
  const sigma = h * 0.05
  mask = new Float32Array(n)
  for (let v = 0; v < n; v++) {
    const dy = (base[v * 3 + 1] - waistY) / sigma
    const ax = Math.abs(base[v * 3])
    // The torso only: faded out well before the arms (26 cm out in the base).
    const side = ax < 0.16 ? 1 : ax > 0.2 ? 0 : (0.2 - ax) / 0.04
    mask[v] = Math.exp(-0.5 * dy * dy) * side
  }
  pinchMasks.set(base as object, mask)
  return mask
}

/**
 * Pinch the waist toward the centre line by `amount` (0..1) of `WAIST_PINCH`.
 * The band is found on the pack's base mesh; `out` is the morphed body. Pure
 * apart from a cache of the band per base mesh.
 */
export function pinchWaist(
  out: Float32Array,
  base: ArrayLike<number>,
  triangles: ArrayLike<number>,
  amount: number
): void {
  const mask = waistMask(base, triangles)
  const k = WAIST_PINCH * amount
  for (let v = 0; v < mask.length; v++) {
    if (mask[v] > 1e-4) out[v * 3] *= 1 - k * mask[v]
  }
}

/** Add `weight` × a target into `out` (xyz per vertex). Pure. */
export function addHumanTarget(
  out: Float32Array,
  target: HumanTarget,
  weight: number
): void {
  const { indices, deltas } = target
  const s = target.step * weight
  if (indices == null) {
    for (let i = 0; i < deltas.length; i++) out[i] += deltas[i] * s
    return
  }
  for (let k = 0; k < indices.length; k++) {
    const o = indices[k] * 3
    out[o] += deltas[k * 3] * s
    out[o + 1] += deltas[k * 3 + 1] * s
    out[o + 2] += deltas[k * 3 + 2] * s
  }
}

/**
 * The base positions plus every weighted target. Targets not yet fetched are
 * fetched first (all at once); pass `into` to reuse a buffer.
 */
export async function morphHuman(
  pack: HumanPack,
  weights: Map<string, number>,
  into?: Float32Array
): Promise<Float32Array> {
  const names = [...weights.keys()].filter((n) => n !== WAIST_NARROW)
  const targets = await Promise.all(names.map((n) => pack.target(n)))
  const out = into ?? new Float32Array(pack.positions.length)
  out.set(pack.positions)
  names.forEach((n, i) => addHumanTarget(out, targets[i], weights.get(n)!))
  const narrow = weights.get(WAIST_NARROW) ?? 0
  if (narrow > 0) pinchWaist(out, pack.positions, pack.triangles, narrow)
  return out
}

/** A joint's position: the centroid of its vertices. Pure. */
export function humanJoint(
  positions: ArrayLike<number>,
  vertices: readonly number[]
): [number, number, number] {
  let x = 0
  let y = 0
  let z = 0
  for (const v of vertices) {
    x += positions[v * 3]
    y += positions[v * 3 + 1]
    z += positions[v * 3 + 2]
  }
  const n = vertices.length || 1
  return [x / n, y / n, z / n]
}

/** How tall a body stands: the span in y of the vertices its triangles use. */
export function humanHeight(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>
): number {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < triangles.length; i++) {
    const y = positions[triangles[i] * 3 + 1]
    if (y < lo) lo = y
    if (y > hi) hi = y
  }
  return hi - lo
}
