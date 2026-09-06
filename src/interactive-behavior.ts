/*#
# interactive-behavior

The **attachable** interactive — the scene-side bridge over the pure rules in
[interaction](?interaction.ts). It watches the scene's pointer, decides whether
this thing was hovered or used, and tells its host. `b3d-interactive` is a thin
element wrapper around it; attach one directly to a loader, a biped, a vehicle
or anything else that already owns a mesh.

## One implementation, flat and immersive

Babylon routes **XR controller rays through `scene.onPointerObservable`** — the
same observable a mouse feeds. So there is no XR branch here and no second code
path to keep in step: a mouse click on a canvas and a trigger pull in a headset
arrive identically, and a thing that is usable flat is usable in VR.

## It never touches the transform

An element that manages a node **owns** its transform: `AbstractMesh` rewrites
`mesh.position` and `mesh.rotationQuaternion` from its own attributes on every
render, so a behaviour that moves the *mesh* is silently undone on the next
frame. That cost a whole bug (#35), and it is a contract here rather than a note
in a doc: **this behaviour reads the scene and never writes to it.** A door that
opens moves its *element* (`ry`, `x`, …) — the thing that owns the transform.

The one visual it does own is the hover outline, which is material state, not
placement.

## Composition, not a god-feature

Other features answer "not while I say so" through `vetoes`. A `lockable` adds
one; `interactive` never learns what a lock is. Vetoes are consulted at
**activation**, not at hover — a locked door still highlights and still reports
being tried, because "it did not budge" is feedback and silence is a bug report.
A refusal names the refuser, so a caller can tell a locked door from a broken one.
*/
/*{ "parent": "World Sim", "order": 900 }*/
import * as BABYLON from '@babylonjs/core'
// `mesh.renderOutline` does not EXIST until this side-effect module patches it
// onto the prototype — assigning it without the import silently does nothing,
// which is precisely how the hover highlight shipped inert the first time and
// was caught only by reading the property back off a live mesh (`undefined`,
// not `false`). Tree-shaking makes an unimported Babylon feature look like a
// missing one.
import '@babylonjs/core/Rendering/outlineRenderer.js'
import type { B3d } from './tosi-b3d.js'
import {
  interactStep,
  newInteractState,
  activationVeto,
  type ActivationVeto,
  type InteractState,
} from './interaction.js'

/** What happened, and where. Carried by every event this behaviour raises. */
export interface InteractionInfo {
  /** The mesh actually under the pointer (a sub-mesh — the knob, not the door). */
  mesh: BABYLON.AbstractMesh | null
  /** World point of the hit, when there was one. */
  point: BABYLON.Vector3 | null
  /** Distance along the picking ray — from the eye when flat, from the hand in XR. */
  distance: number
  /** Set on `refused`: the veto that said no. */
  reason?: string
  /**
   * How this activation arrived.
   *
   * A veto needs it: a lock you can REACH is not a lock you can merely SEE, so
   * the same door may answer differently to a hand at 0.4 m and a ray at 8 m.
   */
  source?: 'pointer' | 'near' | 'api'
  /**
   * Who is doing it. Opaque on purpose.
   *
   * The simulation knows what an actor is and this layer does not — carrying
   * anything more specific would make an interactive care whether a door is
   * being opened by a player, an NPC or a test. A veto that needs to know casts
   * it; one that does not, ignores it.
   */
  actor?: unknown
}

export interface InteractiveHost {
  /** Usually the host Component — events bubble from it. */
  dispatchEvent(ev: Event): boolean
}

export interface InteractiveConfig {
  /**
   * Which meshes count as "this thing". Called on each pointer event rather
   * than captured, so a target that loads late (a GLB) starts working when it
   * arrives instead of never.
   */
  meshes: () => BABYLON.AbstractMesh[]
  /** Max picking distance in world units; `0` (default) means no limit. */
  reach?: () => number
  /** `false` refuses hover AND drops a press already in flight. */
  enabled?: () => boolean
  /** Hover outline colour; `''` or `'none'` for no highlight. */
  highlight?: () => string
}

/** Every attached, live interactive in a scene — the pool `useNearest` picks from. */
const registry = new WeakMap<BABYLON.Scene, Set<InteractiveBehavior>>()

const sceneSet = (scene: BABYLON.Scene): Set<InteractiveBehavior> => {
  let set = registry.get(scene)
  if (!set) {
    set = new Set()
    registry.set(scene, set)
  }
  return set
}

export class InteractiveBehavior {
  /** Other features' "not while I say so" — consulted at activation only. */
  vetoes: Array<ActivationVeto<InteractionInfo>> = []

  whenActivated?: (info: InteractionInfo) => void
  whenHovered?: (info: InteractionInfo) => void
  whenUnhovered?: (info: InteractionInfo) => void
  whenRefused?: (info: InteractionInfo) => void

  private _state: InteractState = newInteractState()
  private _down = false
  private _obs?: BABYLON.Observer<BABYLON.PointerInfo>
  private _outlined: BABYLON.AbstractMesh[] = []
  private _last: InteractionInfo = { mesh: null, point: null, distance: 0 }

  constructor(
    private owner: B3d,
    private host: InteractiveHost,
    private config: InteractiveConfig
  ) {}

  attach(): void {
    const scene = this.owner.scene
    // Without this, a POINTERMOVE arrives with no pickInfo and nothing ever hovers.
    scene.constantlyUpdateMeshUnderPointer = true
    this._obs =
      scene.onPointerObservable.add((info) => this._onPointer(info)) ??
      undefined
    sceneSet(scene).add(this)
  }

  dispose(): void {
    const scene = this.owner.scene
    if (this._obs) {
      scene.onPointerObservable.remove(this._obs)
      this._obs = undefined
    }
    sceneSet(scene).delete(this)
    this._clearOutline()
    this._state = newInteractState()
  }

  /** Is the pointer on it right now? */
  get hovered(): boolean {
    return this._state.phase !== 'idle'
  }

  /**
   * True when nothing refuses an activation — i.e. using it would work.
   *
   * Judged with what is actually KNOWN: while the pointer is on it, that is
   * this frame's real hover; otherwise it is the same unknown-distance info a
   * bare `activate()` would use, so a reach veto reads as blocking. Gate a
   * "press E" prompt or a highlight on this and it tracks the pointer.
   */
  get operable(): boolean {
    return (
      this._enabled() &&
      activationVeto(this.vetoes, this._inspectInfo()) == null
    )
  }

  /**
   * Use it without pointing at it — a keyboard `interact`, an NPC, a test.
   *
   * Runs the SAME veto pass as a pointer activation, so a locked door is locked
   * however you reach it. Returns `true` if it fired.
   */
  activate(info?: Partial<InteractionInfo>): boolean {
    if (!this._enabled()) return false
    return this._fire(this._apiInfo(info))
  }

  /*
  WHAT A NON-POINTER ACTIVATION KNOWS, and — more importantly — what it does
  NOT.

  Three bugs lived here, all found by the pre-release review:

  1. The spread order was `{source:'api', ...this._last, ...info}`, so `_last`
     overwrote the default and a bare `activate()` reported `source:'pointer'`
     after any hover — contradicting the comment beside it.
  2. `_last.distance` initialises to 0 and is only written by a pointer hover of
     THIS behaviour's own meshes. So an NPC 50 m away activating a door nobody
     had ever hovered was told `distance: 0`, and the reach veto this library's
     own doc sells — `info.distance > 2` — returned FALSE. The door opened. The
     one scenario the feature exists for was the one it could not decide.
  3. `operable` and `debugState` used the OPPOSITE spread order from `activate`,
     so `operable === true` did not imply `activate()` would fire and the debug
     row could read `ok` for a veto that blocks.

  So: one helper, used by all three, and an unknown distance is `Infinity`
  rather than 0 — "we do not know that you are near" rather than "you are on
  top of it". A reach veto then fails CLOSED and the caller has to say what it
  means, which it can: `activate({distance})`.

  ⚠️ AND THAT WAS OVER-GENERALISED, which the re-review caught: an ACTIVATION
  with no distance must fail closed, but the two INSPECTION surfaces are not
  activations. Routing `operable` and `debugState` through the same helper made
  them judge a HOVERED element at `distance: Infinity` — so a door reported
  `operable: false` and `out-of-reach:blocks` at the same instant a pointer
  press opened it. `operable` is public API ("would actually work") and
  `debugState` is the only debug readout that exists in a headset; both said the
  opposite of what the thing did.

  Two helpers, because they answer different questions:

  | | question | unknown distance |
  | --- | --- | --- |
  | `_apiInfo` (`activate`) | may this fire? | `Infinity` — refuse |
  | `_inspectInfo` (`operable`, `debugState`) | would it fire NOW? | ask the hover |
  */
  private _apiInfo(info?: Partial<InteractionInfo>): InteractionInfo {
    return {
      ...this._last,
      source: 'api',
      distance: Infinity,
      ...info,
    }
  }

  /**
   * What an INSPECTOR judges with — the pointer's own info while hovering.
   *
   * `_last` is stale in general, which is why `activate()` may not use it. But
   * while `hovered` is true it is this frame's hover of this behaviour's own
   * meshes: exactly the info `_fire` is about to be handed. Reporting anything
   * else here is reporting on a different event than the one happening.
   */
  private _inspectInfo(): InteractionInfo {
    return this.hovered ? { ...this._last, source: 'pointer' } : this._apiInfo()
  }

  /** Tuned state for the console / `hj eval` / a Perf-panel debug source. */
  get debugState() {
    return {
      enabled: this._enabled(),
      phase: this._state.phase,
      armed: this._state.armed,
      meshes: this.config.meshes().map((m) => m.name),
      reach: this.config.reach?.() ?? 0,
      // The info the verdict was reached with. "blocked" alone is a readout you
      // cannot act on — and in a headset it is the only one you have.
      judgedWith: this._inspectInfo(),
      vetoes: this.vetoes.map(
        (v) => `${v.name}:${v.blocks(this._inspectInfo()) ? 'blocks' : 'ok'}`
      ),
    }
  }

  /** World centre of the target meshes — what `useNearest` measures against. */
  center(): BABYLON.Vector3 | null {
    const meshes = this.config.meshes()
    if (meshes.length === 0) return null
    const sum = new BABYLON.Vector3(0, 0, 0)
    for (const m of meshes) sum.addInPlace(m.getAbsolutePosition())
    return sum.scaleInPlace(1 / meshes.length)
  }

  /** Max usable distance, or `Infinity` when unlimited. */
  get reach(): number {
    const r = this.config.reach?.() ?? 0
    return r > 0 ? r : Infinity
  }

  private _enabled(): boolean {
    return this.config.enabled?.() ?? true
  }

  private _onPointer(pointerInfo: BABYLON.PointerInfo): void {
    const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
    const type = pointerInfo.type
    if (type === POINTERDOWN) this._down = true
    else if (type === POINTERUP) this._down = false
    else if (type !== POINTERMOVE) return

    const pick = pointerInfo.pickInfo
    const picked = pick?.hit ? pick.pickedMesh : null
    const mine = picked != null && this.config.meshes().includes(picked)
    const distance = pick?.distance ?? 0
    const reach = this.config.reach?.() ?? 0

    const result = interactStep(this._state, {
      over: mine,
      down: this._down,
      // Reach is part of the rule: a knob across the room is not operable just
      // because the ray reached it.
      withinReach: reach <= 0 || distance <= reach,
      enabled: this._enabled(),
    })
    this._state = result.state

    if (mine) {
      this._last = {
        mesh: picked,
        point: pick?.pickedPoint ?? null,
        distance,
        source: 'pointer',
      }
    }

    if (result.entered) {
      this._applyOutline()
      this._emit('hover', this._last, this.whenHovered)
    }
    if (result.exited) {
      this._clearOutline()
      this._emit('unhover', this._last, this.whenUnhovered)
    }
    if (result.activated) this._fire(this._last)
  }

  /** The one place an activation is decided — pointer and `activate()` share it. */
  private _fire(info: InteractionInfo): boolean {
    const reason = activationVeto(this.vetoes, info)
    if (reason != null) {
      this._emit('refused', { ...info, reason }, this.whenRefused)
      return false
    }
    this._emit('activate', info, this.whenActivated)
    return true
  }

  private _emit(
    name: string,
    detail: InteractionInfo,
    callback?: (info: InteractionInfo) => void
  ): void {
    callback?.(detail)
    this.host.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    )
  }

  private _applyOutline(): void {
    const color = this.config.highlight?.() ?? ''
    if (!color || color === 'none') return
    const c = BABYLON.Color3.FromHexString(color)
    this._outlined = this.config.meshes()
    for (const m of this._outlined) {
      const mesh = m as BABYLON.Mesh
      mesh.renderOutline = true
      mesh.outlineColor = c
      mesh.outlineWidth = 0.02
    }
  }

  private _clearOutline(): void {
    for (const m of this._outlined) (m as BABYLON.Mesh).renderOutline = false
    this._outlined = []
  }
}

/**
 * The nearest usable thing, for a "walk up and press E" control.
 *
 * Pointing at something is the ray interaction; this is the other one — the
 * `interact` button every controller already has (see `ControlInput`). It
 * considers only interactives that are enabled and inside their own reach of
 * `from`, and returns the closest, or `null` when nothing is in range.
 *
 * It deliberately does NOT consult vetoes: a locked door is still the thing you
 * are standing at, and activating it is how you learn it is locked.
 */
export function nearestInteractive(
  scene: BABYLON.Scene,
  from: BABYLON.Vector3
): InteractiveBehavior | null {
  return nearestTo(scene, from)?.it ?? null
}

/**
 * The nearest usable thing AND how far away it is.
 *
 * The distance is the whole reason this exists beside `nearestInteractive`:
 * the search computes it to pick a winner, and throwing it away left every
 * downstream reach veto reading a stale hover distance. `nearestInteractive`
 * keeps its shape for anyone already calling it.
 */
export function nearestTo(
  scene: BABYLON.Scene,
  from: BABYLON.Vector3
): { it: InteractiveBehavior; distance: number } | null {
  let best: InteractiveBehavior | null = null
  let bestDist = Infinity
  for (const it of sceneSet(scene)) {
    const center = it.center()
    if (center == null) continue
    const d = BABYLON.Vector3.Distance(center, from)
    if (d > it.reach || d >= bestDist) continue
    best = it
    bestDist = d
  }
  return best == null ? null : { it: best, distance: bestDist }
}

/**
 * Activate the nearest usable thing. Returns `true` if something fired.
 *
 * Wire it to `input.interact` and a scene full of doors becomes operable
 * without a single per-door key handler.
 */
export function useNearest(
  scene: BABYLON.Scene,
  from: BABYLON.Vector3
): boolean {
  // `near`, not `api`: this IS reaching for the thing, and a veto that cares
  // about reach must be able to tell that apart from a scripted activation.
  /*
  PASS THE DISTANCE IT ALREADY MEASURED.

  `nearestInteractive` computes the true distance to pick a winner and used to
  throw it away, so the reach veto downstream saw a stale `_last.distance` — the
  fail-open in (2) above, on the one code path most likely to have a reach veto
  attached.
  */
  const found = nearestTo(scene, from)
  // `near`, not `api`: this IS reaching for the thing, and a veto that cares
  // about reach must be able to tell that apart from a scripted activation.
  return (
    found?.it.activate({ source: 'near', distance: found.distance }) ?? false
  )
}
