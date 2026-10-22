/*#
# human-expression

A [character builder](/character-builder/) face that blinks, talks and
smiles. MakeHuman's CC0 face pose units (lids, jaw, lips, mouth corners,
brows, cheeks, tongue: 59 of them) are baked into the [human pack](/human-pack/)
as shape targets (`expression/<Unit>`), so at runtime an expression is only
weights: morph targets on the body, on the eyelashes, and on anything worn
on the face (a beard follows the jaw), with the body's skeleton untouched.

- `faceDeltas(pack, units)` loads the units' movements (xyz per pack vertex).
- `humanExpressions(scene, deltas)` makes the face; `attach(mesh, deltaFor)`
  adds a mesh that moves with it (`deltaFor` turns a pack-wide movement into
  that mesh's), and `layer(name)` is a set of weights (blink, speech, a
  mood), summed per unit, so behaviours never fight over a slider.
- `blinker(scene, face)` blinks at a person's rhythm: every 2 to 6 seconds,
  a quick close and a slower open, sometimes twice.
- `lidsFollow(scene, face, eyes)` drops the upper lids as the eyes look down
  and lifts them as they look up, as real lids do. Without it a downward
  look shows white above the iris and reads as a stare.
- `lipSync(scene, face, analyser)` mouths any Web Audio source by loudness
  (the jaw) and by where the sound's energy is (bright sounds widen the mouth,
  dark ones round it). No phonemes needed, so it works on any voice, live.
- `babble(scene, face)` talks with no audio at all: syllables at a speaking
  rate, phrases and pauses, for a crowd or a demo.

`VISEMES` are the mouth shapes as unit weights; `UNITS` lists every unit.
*/
/*{ "parent": "character-builder", "order": 52 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanPack } from './human-pack.js'
import { sceneDelta } from './b3d-utils.js'

/** Every face pose unit the pack bakes (MakeHuman's standard face pose units). */
export const UNITS = Object.freeze([
  'LeftBrowDown', 'RightBrowDown', 'LeftOuterBrowUp', 'RightOuterBrowUp',
  'LeftInnerBrowUp', 'RightInnerBrowUp', 'NoseWrinkler',
  'LeftUpperLidOpen', 'RightUpperLidOpen', 'LeftUpperLidClosed', 'RightUpperLidClosed',
  'LeftLowerLidUp', 'RightLowerLidUp',
  'LeftCheekUp', 'RightCheekUp', 'CheeksPump', 'CheeksSuck', 'NasolabialDeepener',
  'ChinLeft', 'ChinRight', 'ChinDown', 'ChinForward',
  'lowerLipUp', 'lowerLipDown', 'lowerLipBackward', 'lowerLipForward',
  'UpperLipUp', 'UpperLipBackward', 'UpperLipForward', 'UpperLipStretched',
  'JawDrop', 'JawDropStretched', 'LipsKiss', 'MouthMoveLeft', 'MouthMoveRight',
  'MouthLeftPullUp', 'MouthRightPullUp', 'MouthLeftPullSide', 'MouthRightPullSide',
  'MouthLeftPullDown', 'MouthRightPullDown', 'MouthLeftPlatysma', 'MouthRightPlatysma',
  'TongueOut', 'TongueUshape', 'TongueUp', 'TongueDown', 'TongueLeft', 'TongueRight',
  'TonguePointUp', 'TonguePointDown',
] as const)

/** Mouth shapes for speech, as unit weights. */
export const VISEMES: Readonly<Record<string, Readonly<Record<string, number>>>> = Object.freeze({
  rest: {},
  // AA, AH: an open jaw.
  open: { JawDrop: 0.5, lowerLipDown: 0.25 },
  // EE, IH: the corners drawn back.
  wide: { JawDrop: 0.18, MouthLeftPullSide: 0.55, MouthRightPullSide: 0.55, UpperLipStretched: 0.25 },
  // OO, OH, W: rounded lips.
  round: { LipsKiss: 0.8, JawDrop: 0.22 },
  // M, B, P: lips pressed.
  closed: { lowerLipUp: 0.5, UpperLipBackward: 0.15 },
  // F, V: lower lip under the teeth.
  teeth: { lowerLipBackward: 0.55, UpperLipUp: 0.35, JawDrop: 0.08 },
})

/** The units a talking, blinking face uses (the visemes' and the lids'). */
export const FACE_UNITS = Object.freeze([
  ...new Set([
    ...Object.values(VISEMES).flatMap((v) => Object.keys(v)),
    'LeftUpperLidClosed', 'RightUpperLidClosed', 'LeftUpperLidOpen', 'RightUpperLidOpen',
    'MouthLeftPullUp', 'MouthRightPullUp', 'LeftOuterBrowUp', 'RightOuterBrowUp',
    'LeftInnerBrowUp', 'RightInnerBrowUp', 'LeftBrowDown', 'RightBrowDown',
    'LeftCheekUp', 'RightCheekUp',
  ]),
])

/** The units' movements, xyz per pack vertex (metres), dense. */
export async function faceDeltas(
  pack: HumanPack,
  units: readonly string[] = FACE_UNITS
): Promise<Map<string, Float32Array>> {
  const n = pack.manifest.vertexCount
  const out = new Map<string, Float32Array>()
  await Promise.all(
    units.map(async (u) => {
      const name = `expression/${u}`
      if (!pack.has(name)) return
      const t = await pack.target(name)
      const d = new Float32Array(n * 3)
      if (t.indices == null) {
        for (let i = 0; i < n * 3; i++) d[i] = t.deltas[i] * t.step
      } else {
        for (let k = 0; k < t.indices.length; k++) {
          const v = t.indices[k] * 3
          d[v] = t.deltas[k * 3] * t.step
          d[v + 1] = t.deltas[k * 3 + 1] * t.step
          d[v + 2] = t.deltas[k * 3 + 2] * t.step
        }
      }
      out.set(u, d)
    })
  )
  return out
}

export interface FaceLayer {
  /** Set a unit's weight in this layer. */
  set(unit: string, weight: number): void
  /** Set several (a viseme), scaled; units not named keep theirs. */
  setMany(weights: Readonly<Record<string, number>>, scale?: number): void
  /** Every unit back to 0. */
  clear(): void
}

export interface HumanExpressions {
  /**
   * Add a mesh that moves with the face. `deltaFor` turns a movement of the
   * pack's vertices into this mesh's (xyz per its vertex, its own frame); its
   * current positions are the rest.
   */
  attach(mesh: BABYLON.Mesh, deltaFor: (delta: Float32Array) => Float32Array): void
  /** A named set of weights; layers add up per unit. */
  layer(name: string): FaceLayer
  /** The unit weights now applied. */
  readonly weights: Readonly<Record<string, number>>
  /** Units this face has. */
  readonly units: string[]
  dispose(): void
}

export function humanExpressions(
  scene: BABYLON.Scene,
  deltas: Map<string, Float32Array>
): HumanExpressions {
  const units = [...deltas.keys()]
  const targets = new Map<string, BABYLON.MorphTarget[]>(units.map((u) => [u, []]))
  const managers: BABYLON.MorphTargetManager[] = []
  const layers = new Map<string, Map<string, number>>()
  const applied: Record<string, number> = {}
  let dirty = false

  const apply = () => {
    if (!dirty) return
    dirty = false
    for (const u of units) {
      let w = 0
      for (const l of layers.values()) w += l.get(u) ?? 0
      w = Math.max(-1, Math.min(1, w))
      applied[u] = w
      for (const t of targets.get(u)!) t.influence = w
    }
  }
  const obs = scene.onBeforeRenderObservable.add(apply)
  const detach = (mesh: BABYLON.AbstractMesh) => {
    const manager = mesh.morphTargetManager
    if (manager == null || !managers.includes(manager)) return
    const mine = new Set<BABYLON.MorphTarget>()
    for (let i = 0; i < manager.numTargets; i++) mine.add(manager.getTarget(i))
    for (const [u, list] of targets) targets.set(u, list.filter((t) => !mine.has(t)))
    managers.splice(managers.indexOf(manager), 1)
    mesh.morphTargetManager = null
    manager.dispose()
  }

  return {
    units,
    get weights() {
      return applied
    },
    attach(mesh, deltaFor) {
      // Again on the same mesh (its rest changed): replace what it had.
      detach(mesh)
      const base = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
      if (base == null) return
      const manager = new BABYLON.MorphTargetManager(scene)
      for (const u of units) {
        const d = deltaFor(deltas.get(u)!)
        let moves = false
        for (let i = 0; i < d.length && !moves; i++) moves = Math.abs(d[i]) > 1e-6
        if (!moves) continue
        const p = new Float32Array(base.length)
        for (let i = 0; i < p.length; i++) p[i] = base[i] + d[i]
        const t = new BABYLON.MorphTarget(`${mesh.name}-${u}`, applied[u] ?? 0, scene)
        t.setPositions(p)
        manager.addTarget(t)
        targets.get(u)!.push(t)
      }
      if (manager.numTargets === 0) {
        manager.dispose()
        return
      }
      mesh.morphTargetManager = manager
      managers.push(manager)
      // Forget its targets when the mesh goes (a rebuild, an outfit change).
      mesh.onDisposeObservable.addOnce(() => detach(mesh))
      dirty = true
    },
    layer(name) {
      let l = layers.get(name)
      if (l == null) layers.set(name, (l = new Map()))
      const layer = l
      return {
        set(unit, weight) {
          if (layer.get(unit) === weight) return
          layer.set(unit, weight)
          dirty = true
        },
        setMany(weights, scale = 1) {
          for (const [u, w] of Object.entries(weights)) layer.set(u, w * scale)
          dirty = true
        },
        clear() {
          layer.clear()
          dirty = true
        },
      }
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(obs)
      for (const m of managers) m.dispose()
    },
  }
}

/** A seeded-enough random for behaviour (not for anything that must repeat). */
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * Blink at a person's rhythm. Returns a function that stops it. `rate` scales
 * how often (2 is nervous, 0.5 is calm).
 */
export function blinker(
  scene: BABYLON.Scene,
  face: HumanExpressions,
  options: { rate?: number } = {}
): () => void {
  const layer = face.layer('blink')
  const rate = options.rate ?? 1
  let wait = rnd(1, 4)
  let t = -1
  let twice = false
  const close = 0.07
  const hold = 0.03
  const open = 0.13
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = sceneDelta(scene)
    if (t < 0) {
      wait -= dt * rate
      if (wait <= 0) {
        t = 0
        twice = Math.random() < 0.15
      }
      return
    }
    t += dt
    let w: number
    if (t < close) w = t / close
    else if (t < close + hold) w = 1
    else if (t < close + hold + open) w = 1 - (t - close - hold) / open
    else {
      w = 0
      t = -1
      wait = twice ? 0.18 : rnd(2, 6)
      twice = false
    }
    layer.set('LeftUpperLidClosed', w)
    layer.set('RightUpperLidClosed', w)
  })
  return () => {
    scene.onBeforeRenderObservable.remove(obs)
    layer.clear()
  }
}

/**
 * Upper lids follow the eyes up and down. `eyes` are the eye pivots and their
 * rest forward directions (`humanFace`'s `eyes` and `forward`).
 */
export function lidsFollow(
  scene: BABYLON.Scene,
  face: HumanExpressions,
  eyes: () => { eyes: BABYLON.TransformNode[]; forward: BABYLON.Vector3[] } | null
): () => void {
  const layer = face.layer('lids')
  const v = new BABYLON.Vector3()
  const obs = scene.onAfterAnimationsObservable.add(() => {
    const e = eyes()
    if (e == null || e.eyes.length === 0) return
    let pitch = 0
    e.eyes.forEach((pivot, i) => {
      const q = pivot.rotationQuaternion
      if (q == null) return
      e.forward[i].rotateByQuaternionToRef(q, v)
      pitch += Math.asin(Math.max(-1, Math.min(1, v.y - e.forward[i].y))) / e.eyes.length
    })
    // Looking down (pitch < 0) lowers the lids; up raises them.
    const down = Math.max(0, -pitch / 0.5)
    const up = Math.max(0, pitch / 0.5)
    layer.set('LeftUpperLidClosed', Math.min(0.45, down * 0.45))
    layer.set('RightUpperLidClosed', Math.min(0.45, down * 0.45))
    layer.set('LeftUpperLidOpen', Math.min(0.6, up * 0.6))
    layer.set('RightUpperLidOpen', Math.min(0.6, up * 0.6))
  })
  return () => {
    scene.onAfterAnimationsObservable.remove(obs)
    layer.clear()
  }
}

/** Speech as a sequence: each viseme eased in and out at a talking speed. */
function visemeTrack(layer: FaceLayer) {
  const now: Record<string, number> = {}
  return (target: Readonly<Record<string, number>>, k: number) => {
    // Every unit any viseme uses eases toward the target's weight.
    const all = new Set(Object.values(VISEMES).flatMap((v) => Object.keys(v)))
    for (const u of all) {
      const w = now[u] ?? 0
      const goal = target[u] ?? 0
      now[u] = w + (goal - w) * k
      layer.set(u, now[u])
    }
  }
}

/**
 * Mouth a Web Audio source. Connect the source to `analyser` (and on to the
 * speakers if it should be heard). Loudness opens the jaw; where the energy
 * is shapes it: bright (sibilant, EE) widens, dark (OO, W) rounds, and a quiet
 * moment after sound closes the lips.
 */
export function lipSync(
  scene: BABYLON.Scene,
  face: HumanExpressions,
  analyser: AnalyserNode,
  options: { gain?: number } = {}
): () => void {
  const layer = face.layer('speech')
  const track = visemeTrack(layer)
  analyser.fftSize = 1024
  const bins = new Float32Array(analyser.frequencyBinCount)
  const hz = analyser.context.sampleRate / analyser.fftSize
  const band = (lo: number, hi: number) => {
    let s = 0
    for (let i = Math.floor(lo / hz); i < Math.min(bins.length, Math.ceil(hi / hz)); i++) {
      s += Math.pow(10, bins[i] / 20)
    }
    return s
  }
  let level = 0
  let floor = 0.001
  const gain = options.gain ?? 1
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = sceneDelta(scene)
    analyser.getFloatFrequencyData(bins)
    const low = band(250, 900)
    const mid = band(900, 2200)
    const high = band(2200, 6000)
    const energy = low + mid + high
    // A slow noise floor, so a hum or room tone does not hold the jaw open.
    floor = Math.min(energy, floor + (energy - floor) * Math.min(1, dt * 0.3))
    const loud = Math.max(0, Math.min(1, ((energy - floor * 1.5) / (floor * 6 + 0.02)) * gain))
    level += (loud - level) * Math.min(1, dt * 18)
    const total = low + mid + high + 1e-6
    const bright = high / total
    const dark = low / total
    const shape: Record<string, number> = {}
    const add = (v: Readonly<Record<string, number>>, k: number) => {
      for (const [u, w] of Object.entries(v)) shape[u] = (shape[u] ?? 0) + w * k
    }
    add(VISEMES.open, level)
    add(VISEMES.wide, level * Math.max(0, bright * 3 - 0.3))
    add(VISEMES.round, level * Math.max(0, dark * 1.6 - 0.6))
    track(shape, Math.min(1, dt * 20))
  })
  return () => {
    scene.onBeforeRenderObservable.remove(obs)
    layer.clear()
  }
}

/**
 * Talk with no audio: syllables at about 4.5 a second, in phrases of a few
 * words with pauses between, each syllable a viseme eased in and out.
 */
export function babble(
  scene: BABYLON.Scene,
  face: HumanExpressions,
  options: { rate?: number; loudness?: number } = {}
): () => void {
  const layer = face.layer('speech')
  const track = visemeTrack(layer)
  const rate = options.rate ?? 1
  const loudness = options.loudness ?? 1
  const shapes = ['open', 'open', 'wide', 'round', 'closed', 'teeth', 'open', 'wide']
  let syllable = 0
  let left = 0
  let pause = 0
  let current: Readonly<Record<string, number>> = VISEMES.rest
  let k = 1
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = sceneDelta(scene) * rate
    if (pause > 0) {
      pause -= dt
      current = VISEMES.rest
    } else {
      left -= dt
      if (left <= 0) {
        left = rnd(0.16, 0.28)
        current = VISEMES[shapes[Math.floor(Math.random() * shapes.length)]]
        k = rnd(0.6, 1) * loudness
        syllable++
        // A phrase is 4 to 14 syllables, then a breath.
        if (syllable > rnd(4, 14)) {
          syllable = 0
          pause = rnd(0.3, 1.1)
        }
      }
    }
    const scaled: Record<string, number> = {}
    for (const [u, w] of Object.entries(current)) scaled[u] = w * k
    track(scaled, Math.min(1, dt * 16))
  })
  return () => {
    scene.onBeforeRenderObservable.remove(obs)
    layer.clear()
  }
}
