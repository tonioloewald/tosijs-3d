/*#
# aim

**Where a character is pointing, as opposed to where it is facing.** Pure —
degrees and plain `{x, y, z}`, no Babylon — so the whole of walk-and-aim can be
tested without a rig.

This is the input half of layered animation. [[bone-mask]] decides *which bones*
the aim drives and [[animation-layers]] plays it; something still has to decide
*where the upper body is pointing*, and that is this. It serves the player's
look and an NPC's lead with the same code, which is the point: an NPC that aims
through the same slew limit as a player is one whose misses are legible.

## Demo — watch the shoulders lead and the feet follow

The white marker is the body's **facing**, the orange one is where it is
**aiming**, and the red sphere is what it is aiming at. Nothing here is a
character: it is the model on its own, so you can see the rule rather than an
animation of it.

What to watch for:

- **`free twist`** — how far the shoulders turn before the feet move at all.
  Drop it to 0 and the body chases every twitch; raise it to 90 and the
  character never turns, it just cranes.
- **`slew`** — how fast the aim itself moves. Low is the bad shooter: the orange
  marker visibly trails the target, which is a miss you can *watch* rather than
  a dice roll you cannot.
- **`wobble`** — a shooter who cannot hold still. Deterministic, so the same
  fight always produces the same misses.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dGround, sceneDelta, slider3d, label3d } from 'tosijs-3d'
import { aimToward, stepAim, bodyCatchUp, aimWobble, wrapDeg, aimAuthority } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const demo = tosi({ aimDemo: { free: 45, max: 90, slew: 200, rate: 120, orbit: 0.5, wobble: 0 } })
const s = demo.aimDemo

let readout = null

const panel = () => [
  label3d({ text: 'Aim' }),
  slider3d({ label: 'free twist', value: s.free, min: 0, max: 90, step: 5, showValue: 'always',
    handleChange: (v) => { s.free = Math.round(v) } }),
  slider3d({ label: 'max twist', value: s.max, min: 10, max: 150, step: 5, showValue: 'always',
    handleChange: (v) => { s.max = Math.round(v) } }),
  slider3d({ label: 'slew °/s', value: s.slew, min: 15, max: 600, step: 5, showValue: 'always',
    handleChange: (v) => { s.slew = Math.round(v) } }),
  slider3d({ label: 'body turn °/s', value: s.rate, min: 10, max: 360, step: 10, showValue: 'always',
    handleChange: (v) => { s.rate = Math.round(v) } }),
  slider3d({ label: 'target speed', value: s.orbit, min: -1.5, max: 1.5, step: 0.1, showValue: 'always',
    handleChange: (v) => { s.orbit = v } }),
  slider3d({ label: 'wobble °', value: s.wobble, min: 0, max: 12, step: 1, showValue: 'always',
    handleChange: (v) => { s.wobble = Math.round(v) } }),
  label3d({ text: 'white = facing · orange = aim · red = target', muted: true }),
]

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanelOpen: true,
      scenePanel: panel,
      sceneCreated(el) {
        // Target offset so the rig sits RIGHT of centre: the settings panel
        // covers the left half, and a demo hidden behind its own controls is a
        // demo nobody looks at.
        orbitCam(el, { alpha: 1.1, beta: 0.72, radius: 12, target: [5, 0.9, 0] })

        // The body: a post, with a long white marker for its facing.
        const body = el.make.cylinder({ diameter: 0.8, height: 1.4, color: '#8899aa' })
        body.position.y = 0.7
        const facing = el.make.box({ width: 0.22, height: 0.22, depth: 3, color: '#ffffff', glow: 0.25 })
        facing.parent = body
        facing.position.set(0, -0.2, 1.5)
        // The aim marker is NOT parented to the body — it carries body + twist,
        // which is the whole point: they are two different angles.
        const aimMark = el.make.box({ width: 0.2, height: 0.2, depth: 4.6, color: '#ff9944', glow: 0.5 })
        const target = el.make.sphere({ diameter: 0.5, color: '#ee3344', glow: 0.6 })

        let bodyYaw = 0
        let aim = { yawDeg: 0, pitchDeg: 0 }
        let t = 0
        let angle = 0

        el.scene.onBeforeRenderObservable.add(() => {
          const dt = sceneDelta(el.scene)
          t += dt
          angle += Number(s.orbit) * dt
          const r = 5
          target.position.set(Math.sin(angle) * r, 0.9, Math.cos(angle) * r)

          const limits = {
            yawFree: Number(s.free), yawMax: Number(s.max),
            pitchUp: 60, pitchDown: 75,
          }
          // Where the target is, as an aim this body could hold.
          const want = aimToward(bodyYaw, {
            x: target.position.x, y: target.position.y - 1.4, z: target.position.z,
          }, limits)
          // A bad shooter cannot hold still — deterministic, so it replays.
          const w = aimWobble(t, Number(s.wobble))
          const wanted = { yawDeg: want.yawDeg + w.yawDeg, pitchDeg: want.pitchDeg + w.pitchDeg }

          aim = stepAim(aim, wanted, dt, { slewDeg: Number(s.slew), limits })
          const caught = bodyCatchUp(aim.yawDeg, dt, Number(s.rate), limits)
          bodyYaw = wrapDeg(bodyYaw + caught.bodyTurnDeg)
          aim = { yawDeg: caught.yawDeg, pitchDeg: aim.pitchDeg }

          body.rotation.y = (bodyYaw * Math.PI) / 180
          const aimYaw = ((bodyYaw + aim.yawDeg) * Math.PI) / 180
          aimMark.rotation.set((aim.pitchDeg * Math.PI) / 180, aimYaw, 0)
          aimMark.position.set(Math.sin(aimYaw) * 2.3, 1.2, Math.cos(aimYaw) * 2.3)

          if (readout) {
            readout.textContent =
              `twist ${aim.yawDeg.toFixed(0)}°   pitch ${aim.pitchDeg.toFixed(0)}°   ` +
              `body ${bodyYaw.toFixed(0)}°   layer authority ${aimAuthority(aim, limits).toFixed(2)}`
          }
        })
      },
    },
    b3dSkybox({ timeOfDay: 10 }),
    b3dSun({ shadowMaxZ: 60, activeDistance: 40 }),
    b3dLight({ intensity: 0.5, groundColor: '#4b5348' }),
    b3dGround({ meshName: 'ground_nocast', width: 30, height: 30, color: '#7c8a6a', texture: 'noise', textureTiles: 5 })
  )
)

readout = document.createElement('div')
readout.style.cssText = 'position:absolute;bottom:8px;right:8px;font:12px monospace;background:#0009;color:#fff;padding:4px 8px;border-radius:4px'
preview.append(readout)
```
```css
.preview { height: 100%; position: relative; }
```

## Aim is RELATIVE to the body, and that is the whole design

The stored value is the twist between the hips and the shoulders, not a world
direction. Everything falls out of that choice:

- The mask needs exactly this number. "How far is the torso turned from the
  legs" *is* the thing a layered animation is expressing.
- It bounds itself. A world-space aim needs a separate "and how far can he turn"
  check; a relative one is the answer to that question already.
- **The body follows it**, which is what a third-person shooter actually does —
  you turn the camera, the shoulders lead, and the feet come round after. That
  is `bodyCatchUp`, and it is three numbers rather than a state machine.

## Two thresholds, which are a hysteresis band wearing a costume

`yawFree` is the twist you can hold with your feet planted. `yawMax` is what a
spine will do. Between them the body turns to catch up at a rate you choose;
beyond `yawMax` it is *dragged*, because the alternative is a character whose
head is on backwards.

`MOBILITY-DESIGN.md` predicted this shape from the other direction: cover should
"expect hysteresis and budget for it from the start", after `isSwimming`
flickered at its threshold. Here the band is not a fix for flicker, it is the
behaviour — but it is the same structure, and for the same reason. One
threshold would make a character snap round the instant you nudged the stick.

## Positive is RIGHT, and positive is DOWN

Yaw increases clockwise seen from above (matching `atan2(x, z)` and the biped's
own turn), pitch is positive nose-down (matching [[swim-aim]] and
`RotationYawPitchRoll`). Both conventions are already load-bearing elsewhere in
this repo, and every orientation bug here has come from a conversion at a
boundary — so there is no conversion at this boundary.

## The NPC path is two calls, deliberately not one

    const dir = interceptLead(muzzle, speed, targetPos, targetVel)   // guidance
    const want = dir && aimToward(bodyYawDeg, dir)                   // here
    aim = stepAim(aim, want, dt, { slewDeg: skill * 240 })           // here

`guidance` solves *where to point*; this solves *how fast you get there and how
far you can twist*. Keeping them apart is what lets a turret and a soldier share
the first and disagree about the second — and it keeps this module free of
imports, so it stays testable against nothing.

**`slewDeg` is the stupidity dial.** `AI-DESIGN.md` argues the interesting
investment is the LOW end of the skill range, and a slow slew is the most
legible bad-shooter behaviour there is: the aim visibly trails the target, so a
player can *see* they are being missed rather than merely surviving. Pair it
with `aimWobble` for a shooter who cannot hold still.
*/
/*{ "parent": "Vehicles", "order": 167 }*/

/** A plain direction. Babylon's `Vector3` satisfies it structurally. */
export interface AimVec {
  x: number
  y: number
  z: number
}

/** Yaw and pitch in degrees — yaw RELATIVE to the body, pitch absolute. */
export interface Aim {
  /** Twist from the body's facing. Positive is to the character's right. */
  yawDeg: number
  /** Positive is DOWN, matching `swim-aim` and `RotationYawPitchRoll`. */
  pitchDeg: number
}

export interface AimLimits {
  /** Twist held with the feet planted. Beyond it, the body starts to come round. */
  yawFree: number
  /** The spine's limit. The body is dragged rather than letting this be exceeded. */
  yawMax: number
  /** How far up the character can aim (a positive magnitude). */
  pitchUp: number
  /** How far down (a positive magnitude). Usually larger — looking down is easier. */
  pitchDown: number
}

/**
 * Human-ish defaults, and each one is a posture rather than a round number.
 *
 * 45° is about what you can twist without moving your feet; 90° is a hard
 * shoulder check. Down beats up because looking down is mostly the neck while
 * looking up fights the spine — and because the thing you are aiming at is more
 * often below you than above.
 */
export const DEFAULT_AIM_LIMITS: AimLimits = {
  yawFree: 45,
  yawMax: 90,
  pitchUp: 60,
  pitchDown: 75,
}

/**
 * Wrap to (−180, 180].
 *
 * Everything that subtracts two yaws needs this, and forgetting it produces the
 * single most recognisable aim bug: a character that turns 350° to the left
 * instead of 10° to the right. Exported because callers holding a body yaw need
 * the same operation.
 */
export function wrapDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0
  let d = ((deg + 180) % 360) - 180
  if (d <= -180) d += 360
  return d
}

const clampMag = (v: number, m: number): number => {
  const a = Math.abs(m)
  return v < -a ? -a : v > a ? a : v
}

/** Hold an aim inside what a body can do. Yaw is clamped at the HARD limit. */
export function clampAim2(
  aim: Aim,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): Aim {
  const pitch = aim.pitchDeg
  return {
    yawDeg: clampMag(wrapDeg(aim.yawDeg), limits.yawMax),
    pitchDeg:
      pitch < -Math.abs(limits.pitchUp)
        ? -Math.abs(limits.pitchUp)
        : pitch > Math.abs(limits.pitchDown)
        ? Math.abs(limits.pitchDown)
        : pitch,
  }
}

/**
 * The aim that points a body at a world direction.
 *
 * This is the join between "where should I shoot" and "what can my body do".
 * `dir` need not be normalised — only its proportions matter — and a zero
 * vector returns a level, forward aim rather than `NaN`, because a degenerate
 * direction is a thing that happens (a target at the muzzle) and a character
 * frozen at `NaN` is unrecoverable.
 */
export function aimToward(
  bodyYawDeg: number,
  dir: AimVec,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): Aim {
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (!(len > 1e-9)) return { yawDeg: 0, pitchDeg: 0 }
  const yaw = (Math.atan2(dir.x, dir.z) * 180) / Math.PI
  const pitch = (Math.asin(-clampMag(dir.y / len, 1)) * 180) / Math.PI
  return clampAim2(
    { yawDeg: wrapDeg(yaw - bodyYawDeg), pitchDeg: pitch },
    limits
  )
}

/** The world direction an aim points, given the body's facing. */
export function aimDirection(bodyYawDeg: number, aim: Aim): AimVec {
  const yaw = ((bodyYawDeg + aim.yawDeg) * Math.PI) / 180
  const pitch = (aim.pitchDeg * Math.PI) / 180
  const c = Math.cos(pitch)
  return { x: Math.sin(yaw) * c, y: -Math.sin(pitch), z: Math.cos(yaw) * c }
}

export interface AimStep {
  /** Degrees per second the aim may move. The skill dial — see the module doc. */
  slewDeg?: number
  limits?: AimLimits
}

/**
 * Move an aim toward a target, at a limited RATE.
 *
 * A rate limit rather than an ease, and the difference matters more than it
 * looks. An ease closes a fraction of the gap per second, so it never quite
 * arrives and its lag depends on how far away the target was — which makes a
 * shooter's accuracy a function of the target's distance from where he was
 * already looking, in a way nobody can tune. A slew arrives in a knowable time
 * and its lag is a speed you can put in a table.
 *
 * Yaw takes the SHORT way round. Pitch cannot wrap, so it does not need to.
 */
export function stepAim(
  current: Aim,
  target: Aim,
  dt: number,
  options: AimStep = {}
): Aim {
  const limits = options.limits ?? DEFAULT_AIM_LIMITS
  if (!(dt > 0)) return clampAim2(current, limits)
  const step = Math.abs(options.slewDeg ?? 360) * dt
  const dyaw = clampMag(wrapDeg(target.yawDeg - current.yawDeg), step)
  const dpitch = clampMag(target.pitchDeg - current.pitchDeg, step)
  return clampAim2(
    {
      yawDeg: current.yawDeg + dyaw,
      pitchDeg: current.pitchDeg + dpitch,
    },
    limits
  )
}

export interface BodyCatchUp {
  /** Degrees the BODY should turn this frame. Positive is to its right. */
  bodyTurnDeg: number
  /** The twist that remains once it has. Feed this back as the stored aim. */
  yawDeg: number
}

/**
 * How far the body comes round to face what the character is aiming at.
 *
 * Returns BOTH halves because they are one decision. A caller that turned the
 * body and then re-derived the twist separately would have two sources for one
 * number, and they would disagree on the frame the clamp fires — which is
 * exactly the frame you would be looking at.
 *
 * Three regimes, no state:
 *
 * | twist | what happens |
 * | --- | --- |
 * | under `yawFree` | nothing. Feet planted, shoulders turned. |
 * | `yawFree`..`yawMax` | the body turns at `rateDeg`, unwinding the excess |
 * | over `yawMax` | the body is DRAGGED — at least enough to restore the limit |
 *
 * The third is a floor on the turn rather than a separate mode, so a stick
 * yanked to the side produces a fast turn rather than a broken neck, and it
 * blends back into the second regime as soon as the excess is gone.
 */
export function bodyCatchUp(
  yawDeg: number,
  dt: number,
  rateDeg = 180,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): BodyCatchUp {
  const twist = wrapDeg(yawDeg)
  const mag = Math.abs(twist)
  const free = Math.abs(limits.yawFree)
  const max = Math.max(free, Math.abs(limits.yawMax))
  if (!(dt > 0) || mag <= free) return { bodyTurnDeg: 0, yawDeg: twist }
  const sign = twist < 0 ? -1 : 1
  const willing = Math.min(mag - free, Math.abs(rateDeg) * dt)
  // The body is never allowed to leave the twist outside the spine's limit,
  // whatever the rate says.
  const required = Math.max(0, mag - max)
  const turn = Math.max(willing, required)
  return { bodyTurnDeg: sign * turn, yawDeg: twist - sign * turn }
}

/**
 * Unwind an aim toward neutral when nobody is driving it.
 *
 * Holstering, going idle, or simply letting go should return the character to
 * facing where it walks — and it should do so on the same clock as everything
 * else, so it is the same slew rather than a tween. `swim-aim`'s `aimTarget`
 * makes the same argument for pitch: one branch here rather than an `if` at
 * every call site.
 */
export function relaxAim(
  current: Aim,
  dt: number,
  slewDeg = 120,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): Aim {
  return stepAim(current, { yawDeg: 0, pitchDeg: 0 }, dt, { slewDeg, limits })
}

/** Weights for a three-pose aim set, summing to 1. */
export interface AimPoseWeights {
  up: number
  level: number
  down: number
}

/**
 * Turn a pitch into weights over an **aim-up / aim-level / aim-down** clip set.
 *
 * This is the shape [[animation-layers]] can actually play. Babylon has no
 * additive layer, so "point the gun 30° down" is not a bone rotation you can
 * add — it is a blend between poses somebody authored, and a blend is weights.
 * Two of the three are always zero, which is not a waste: it means a caller can
 * hand the same three numbers to three groups every frame and never branch.
 *
 * Falls back to pure `level` when a limit is zero, rather than dividing by it.
 */
export function aimPoseWeights(
  pitchDeg: number,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): AimPoseWeights {
  const p = Number.isFinite(pitchDeg) ? pitchDeg : 0
  if (p < 0) {
    const up = Math.abs(limits.pitchUp)
    const t = up > 0 ? Math.min(1, -p / up) : 0
    return { up: t, level: 1 - t, down: 0 }
  }
  const down = Math.abs(limits.pitchDown)
  const t = down > 0 ? Math.min(1, p / down) : 0
  return { up: 0, level: 1 - t, down: t }
}

/**
 * How much authority the aim layer should have, `0`..`1`.
 *
 * An aim that matches where the body already points needs no layer at all — the
 * locomotion is already doing it, and overriding it with a "forward" aim pose
 * costs you the walk's arm swing for no gain. Authority rises with the twist,
 * so the layer fades in exactly as it starts to say something the base clip
 * does not.
 *
 * Multiply it into the mask's weights, which is why this returns a scalar and
 * not a mask: [[bone-mask]] owns WHICH bones, this owns HOW MUCH.
 */
export function aimAuthority(
  aim: Aim,
  limits: AimLimits = DEFAULT_AIM_LIMITS
): number {
  const yaw =
    Math.abs(wrapDeg(aim.yawDeg)) / Math.max(1e-6, Math.abs(limits.yawMax))
  const span =
    aim.pitchDeg < 0 ? Math.abs(limits.pitchUp) : Math.abs(limits.pitchDown)
  const pitch = Math.abs(aim.pitchDeg) / Math.max(1e-6, span)
  return Math.min(1, Math.max(yaw, pitch))
}

/**
 * A deterministic wander, for a shooter who cannot hold still.
 *
 * `AI-DESIGN.md`: invest in the LOW end of the skill dial. A bad shot does not
 * miss by rolling badly at the moment of firing — that is invisible, and it
 * reads as the game cheating. A bad shot's aim visibly *drifts*, so you can
 * watch it wander off you and back, and shooting the instant it wanders is a
 * skill the player can acquire.
 *
 * Two frequencies at an irrational-ish ratio rather than one, because a single
 * sine reads as a machine sweeping. No RNG: it is a function of time, so a
 * replay of the same fight produces the same misses, which is the rule the
 * whole `world-store` is built on.
 */
export function aimWobble(
  seconds: number,
  amplitudeDeg: number,
  hz = 0.7,
  phase = 0
): Aim {
  const a = Math.abs(amplitudeDeg)
  if (!(a > 0) || !Number.isFinite(seconds)) return { yawDeg: 0, pitchDeg: 0 }
  const t = seconds * hz * Math.PI * 2 + phase
  return {
    yawDeg: (Math.sin(t) * 0.7 + Math.sin(t * 1.618 + 1.1) * 0.3) * a,
    // Less vertical than horizontal: a wavering aim reads as nerves, a bobbing
    // one reads as a fault in the animation.
    pitchDeg: (Math.sin(t * 0.83 + 2.4) * 0.6 + Math.sin(t * 2.17) * 0.2) * a,
  }
}
