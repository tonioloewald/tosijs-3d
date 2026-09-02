/*#
# b3d-biped

Animated humanoid character controller. Loads a GLB model with skeletal animations
and drives it via `ControlInput`.

## Demo

```js
import { b3d, b3dBiped, b3dLight, b3dSkybox, b3dGround, label3d, select3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements, tosi } from 'tosijs'

const animations = [
  'idle', 'walk', 'run', 'sneak', 'climb', 'walkBackwards',
  'jump', 'running-jump', 'salute', 'wave',
  'tread-water', 'swim', 'talk', 'look', 'dance', 'pickup', 'pilot',
]

const { bipedDemo } = tosi({
  bipedDemo: {
    animation: 'run',
    speed: 0.25,
  }
})

const biped = b3dBiped({
  url: '/omnidude.glb',
  animation: bipedDemo.animation,
  animationSpeed: bipedDemo.speed,
})

preview.append(
  b3d(
    {
      scenePanel: () => [
        label3d({ text: 'Biped' }),
        select3d({ label: 'animation', value: bipedDemo.animation, options: animations }),
        slider3d({ label: 'speed', value: bipedDemo.speed, min: 0, max: 2, step: 0.1 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3.5, radius: 2, target: [0, 0.5, 0],
        })
        camera.lowerRadiusLimit = 1.5
        camera.upperRadiusLimit = 10
      },
    },
    b3dLight({ y: 1, intensity: 0.7 }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ width: 10, height: 10 }),
    biped,
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `skin` | `''` | Optional albedo texture URL applied to the `skin` material (reskin) |
| `scale` | `1` | Uniform scale applied to the loaded model |
| `animation` | `''` | Current animation state name |
| `animationSpeed` | `1` | Playback speed multiplier (0–2) |
| `player` | `false` | Whether this biped receives input |
| `cameraType` | `'none'` | `'follow'`, `'xr'`, or `'none'` |
| `turnSpeed` | `180` | Degrees per second |
| `forwardSpeed` | `2` | Walk speed |
| `runSpeed` | `5` | Sprint speed |
| `backwardSpeed` | `1` | Backward speed |
| `cameraHeightOffset` | `1` | Camera height above target |
| `cameraTargetHeight` | `0.75` | Height of the point the camera looks at |
| `cameraMinFollowDistance` | `2` | Closest follow distance |
| `cameraMaxFollowDistance` | `5` | Furthest follow distance |

## Animations

The biped automatically transitions between animation states based on input:
`idle`, `walk`, `run`, `walkBackwards`, `sneak`, `jump`, `swim`, `dance`, `pilot`, etc.

Animation names in the GLB must match these names.

## Usage

```javascript
import { b3d, b3dBiped, gameController, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({
        url: '/character.glb',
        player: true,
        cameraType: 'follow',
        initialState: 'idle',
      })
    )
  )
)
```
*/
/*{ "parent": "Vehicles" }*/

import * as BABYLON from '@babylonjs/core'
import { XRStuff, collidable, isOff } from './b3d-utils'
import {
  canMantle,
  mantleClip,
  mantlePath,
  defaultMantleLimits,
  type LedgeReading,
} from './mantle'
import {
  buoyantStep,
  submergedFraction,
  isSwimming,
  swimBuoyancy,
} from './buoyancy'
import {
  aimFromLook,
  clampAim,
  easeAim,
  aimTarget,
  surfaceAimLimit,
} from './swim-aim'
import type { B3d } from './tosi-b3d'
import { xrControllers } from './gamepad'
import type { GameController } from './game-controller'
import { B3dControllable } from './b3d-controllable'
import type { ControlInput } from './control-input'
import { CompositeInputProvider } from './control-input'
import { XRInputProvider } from './xr-input-provider'

const DEG_TO_RAD = Math.PI / 180

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type AnimStateSpec = {
  animation: string
  name?: string
  loop?: boolean
  additive?: boolean
  backwards?: boolean
}

export class AnimState {
  animation: string
  name: string
  loop: boolean
  additive: boolean
  backwards: boolean

  constructor(spec: AnimStateSpec) {
    this.animation = spec.animation
    this.name = spec.name || spec.animation
    this.loop = spec.loop ?? false
    this.additive = spec.additive ?? false
    this.backwards = spec.backwards ?? false
  }

  static buildList(...specs: AnimStateSpec[]): AnimState[] {
    return specs.map((spec) => new AnimState(spec))
  }
}

/**
 * **Animation states for a Quaternius UAL rig** (the Universal Animation
 * Library, on `cdn.tosijs.net/quaternius/`).
 *
 * The biped drives states by NAME — `walk`, `run`, `sneak` — and a rig supplies
 * whatever its animator called them. This is the translation for UAL, so
 * adopting that library is one line:
 *
 * ```js
 * b3dBiped({
 *   url: assetUrl('quaternius/UAL1_core.glb'),
 *   animationStates: ualAnimationStates(),
 * })
 * ```
 *
 * Two things it buys beyond names. `walkBackwards` becomes a real
 * `Jog_Bwd_Loop` rather than the walk cycle played in reverse, and `sneak` gets
 * a crouch that holds at rest — both were fakes against the stock rig.
 *
 * Pass `extra` to add or override entries; a later entry with the same `name`
 * wins, so a project can retarget one state without restating the rest.
 */
export function ualAnimationStates(extra: AnimStateSpec[] = []): AnimState[] {
  const base: AnimStateSpec[] = [
    { name: 'idle', animation: 'Idle_Loop', loop: true },
    { name: 'walk', animation: 'Walk_Loop', loop: true },
    { name: 'run', animation: 'Jog_Fwd_Loop', loop: true },
    { name: 'sprint', animation: 'Sprint_Loop', loop: true },
    { name: 'walkBackwards', animation: 'Jog_Bwd_Loop', loop: true },
    { name: 'strafeLeft', animation: 'Jog_Left_Loop', loop: true },
    { name: 'strafeRight', animation: 'Jog_Right_Loop', loop: true },
    { name: 'sneak', animation: 'Crouch_Fwd_Loop', loop: true },
    { name: 'sneakIdle', animation: 'Crouch_Idle_Loop', loop: true },
    { name: 'sneakLeft', animation: 'Crouch_Left_Loop', loop: true },
    { name: 'sneakRight', animation: 'Crouch_Right_Loop', loop: true },
    // One clip per phase, which is why the jump can be done properly here:
    // `jump` is the wind-up, and the loop and landing are addressable.
    { name: 'jump', animation: 'Jump_Start', loop: false },
    { name: 'jumpLoop', animation: 'Jump_Loop', loop: true },
    { name: 'jumpLand', animation: 'Jump_Land', loop: false },
    /*
    CLIMB clips are named for the HEIGHT they cover, not for the state that
    preceded them — which is why `mantle.mantleClip` picks one by measuring the
    ledge rather than by asking what the character was doing. A rig carrying
    only `ClimbLedge` still works; one carrying none falls back to the jump and
    the climb still happens, just plainly.

    Split across both megafiles: `ClimbLedge` is UAL1, `ClimbUp_1m`/`_2m` are
    UAL2. Listing all three is harmless — `setAnimationState` skips states whose
    clip the loaded GLB does not contain — so a rig gains the better ones simply
    by shipping them.
    */
    { name: 'ClimbLedge', animation: 'ClimbLedge', loop: false },
    { name: 'ClimbUp_1m', animation: 'ClimbUp_1m', loop: false },
    { name: 'ClimbUp_2m', animation: 'ClimbUp_2m', loop: false },
    { name: 'running-jump', animation: 'Jump_Loop', loop: false },
    { name: 'swim', animation: 'Swim_Fwd_Loop', loop: true },
    { name: 'tread-water', animation: 'Swim_Idle_Loop', loop: true },
    { name: 'dance', animation: 'Dance_Loop', loop: true },
    { name: 'pilot', animation: 'Driving_Loop', loop: true },
    { name: 'pickup', animation: 'Interact', loop: false },
    { name: 'look', animation: 'Idle_Loop', loop: true },
  ]
  const byName = new Map<string, AnimStateSpec>()
  for (const spec of [...base, ...extra]) {
    byName.set(spec.name ?? spec.animation, spec)
  }
  return AnimState.buildList(...byName.values())
}

/**
 * How far above the feet the collision body starts — everything below this is
 * walked over rather than collided with. Unity calls it Step Offset.
 */
/** Ratio-to-weight for a body with no swim pose to read a waterline from. */
const DEFAULT_BUOYANCY = 1.15

const STEP_OFFSET = 0.35
/** How high a lip the biped walks straight over instead of being stopped by. */
const STEP_UP = 0.5
/** How far the ground may drop before it becomes a FALL rather than a step. */
const STEP_DOWN = 0.6
/**
 * Vertical kick while swimming, m/s². Enough to beat buoyancy comfortably
 * (which is ~1.5 m/s² of upward push at full submersion) without feeling like a
 * jetpack.
 */
const SWIM_THRUST = 6
/** Local +Z. Allocated once — this is read every frame while swimming. */
const LOCAL_FORWARD = new BABYLON.Vector3(0, 0, 1)
/** Scratch for the yaw read-back; never allocate inside the per-frame loop. */
const _fwdScratch = new BABYLON.Vector3()
/** Scratch for the derived right axis, same reason. */
const _rightScratch = new BABYLON.Vector3()

export class B3dBiped extends B3dControllable {
  static initAttributes = {
    ...B3dControllable.initAttributes,
    url: '',
    // Optional skin texture URL applied to the model's `skin` material. Kenney
    // characters ship textureless with one `skin` material + separate skin PNGs,
    // so reskinning is just swapping this albedo texture.
    skin: '',
    // Uniform scale applied to the loaded model. Handy when an asset imports at the
    // wrong size (Kenney FBX characters come in ~2x too big; 0.48 ≈ 1.8m) — though
    // baking scale into the conversion is preferred so every consumer gets it right.
    scale: 1,
    player: false,
    cameraType: 'none',
    animation: '',
    animationSpeed: 1,
    initialState: 'idle',
    turnSpeed: 180,
    forwardSpeed: 2,
    runSpeed: 5,
    backwardSpeed: 1,
    /*
    CAMERA FRAMING IS IN METRES, so it is scale-bound — and these were tuned
    against a 0.88 m rig. At human scale (1.8 m, see CLAUDE.md → "Scale") the
    old numbers put the camera at chest height two metres back, which frames
    the character's shoulders and not the world. Roughly doubled, which is the
    ratio between the rigs.

    Note `eyeHeight` below was ALREADY 1.6 — a human number on a half-height
    character. That mismatch is the tell that the defaults were written for a
    person and the rig drifted, which is the argument for standardising on 1.8 m
    rather than retuning everything down.
    */
    cameraHeightOffset: 2,
    cameraTargetHeight: 1.4,
    cameraMinFollowDistance: 4,
    cameraMaxFollowDistance: 10,
    // Void-catch backstop: a biped never falls below this Y. It's a last resort for
    // scenes with NO collidable ground at all (a GLB floor not named `_collide`), so
    // set it DEEP — not at walking level. At 0 it would act as an invisible floor,
    // pinning the biped above any sub-zero terrain and sealing water/pits. Real
    // collidable ground (terrain, seabed) grounds the biped normally above this.
    // Scenes that genuinely want a shallow floor can raise it.
    groundY: -1000,
    // Eye height for the first-person camera (the view button toggles between
    // third-person over-the-shoulder and this).
    eyeHeight: 1.6,
    /** Degrees per second the right stick swings the view. */
    lookRate: 120,
    /** How far up/down the look can go, degrees. */
    maxLookPitch: 70,
    /**
     * Invert the right stick's vertical. **On by default** — Tonio's call, and
     * the conventional one for a third-person camera: pushing the stick away
     * from you tips the view DOWN, the way a physical camera head works. Set
     * `'off'` for the direct mapping.
     *
     * A string enum rather than a boolean because an absent boolean attribute
     * is false, so a default-true boolean can never turn on (and tosijs now
     * throws on one) — see CLAUDE.md.
     */
    invertLookY: 'on' as 'on' | 'off',
    /**
     * Never let the follow camera drop below this above the character's feet.
     * Pitch drives the camera's HEIGHT, so looking up walks it downward — and
     * without a floor it ends up underground, which reads as the world
     * vanishing. Metres.
     */
    cameraMinHeight: 0.5,
    /**
     * Upward speed of a FULLY wound-up jump, m/s. The physics is fixed and the
     * ANIMATION is retimed to match it — not the other way round. Matching the
     * jump to the clip was tried and was wrong: it made the jump a consequence
     * of whatever the animator exported.
     */
    jumpSpeed: 4.5,

    /** Fraction of walking speed while sneaking. */
    sneakSpeed: 0.4,
    /** Sidestep speed as a fraction of walking. Slower than forward on purpose. */
    strafeSpeed: 0.75,
    /**
     * `'on'` to sidestep with the left stick, `'off'` (default) to turn with it
     * instead — both sticks then steer and the sidestep clips never play.
     *
     * Off by default on principle rather than as a workaround: strafing is a
     * shooter idiom that reads oddly on a character meant to move like a
     * person. That it also avoids the weakest clips in the Quaternius set is a
     * bonus, not the reason.
     *
     * A string enum rather than a boolean because a boolean attribute cannot
     * default to true, and the useful default here is "strafing off".
     */
    /**
     * **How deep the water gets before you swim, as a fraction of standing
     * height.** Below this you wade — feet on the bottom, walking; above it
     * buoyancy takes over.
     *
     * `0.45` is about 0.8 m on a 1.83 m rig. Tonio set the band: *"make it
     * about 0.4-0.5 (it's hard to swim in water less than waist deep)"* — which
     * is the real constraint. Swimming shallower than that is not a choice a
     * person gets to make; the bottom is in the way.
     *
     * A fraction rather than metres because it is a fact about the BODY — a
     * smaller character should start swimming sooner in the same pond, and a
     * fraction tracks that for free. Metres would be right for a fact about the
     * WORLD; the two are easy to confuse and worth keeping apart.
     *
     * Leaving the water uses a lower threshold (70% of this) so the boundary
     * does not flicker; see `buoyancy.isSwimming`.
     */
    /**
     * **How high a ledge the character can pull itself onto, metres.** Below
     * `STEP_UP` (0.5) the walking code just steps up; above this it is a wall.
     *
     * `2.2` is a touch over shoulder height on a 1.83 m rig — a decent mantle
     * for someone athletic. Lower it for a heavier or clumsier character; that
     * is the mobility half of the skill dial AI-DESIGN argues for, and it costs
     * nothing to expose because the band it defines is read from geometry
     * rather than painted onto it.
     */
    climbReach: 2.2,
    wadeDepth: 0.45,
    strafing: 'off',
    /**
     * **How high this figure rides in the water, in METRES.** `0` (default)
     * puts the waterline at the head — what swimming means — and it is a
     * straight vertical offset from there: `0.1` floats ten centimetres
     * higher, `-0.1` ten lower.
     *
     * Metres rather than a dimensionless multiplier because a multiplier is not
     * authorable — its effect depends on how tall the pose happens to be, so
     * the same number means different things for a tread and a crawl, and you
     * tune it by bisection. An offset is the thing you actually want to say:
     * *this figure sits a bit lower in the water.* Tonio: *"we can keep
     * buoyancy as a strict z offset for a given figure in water."*
     *
     * It is per-FIGURE, which is the useful axis — a heavy pack, armour, a
     * different body — and it composes with any animation set, because the
     * anchor it offsets from is measured rather than authored.
     */
    buoyancy: 0,
  }

  entries?: BABYLON.InstantiatedEntries
  camera?: BABYLON.Camera
  /** Camera mode, toggled by the view button: third-person over-the-shoulder
   * ('chase') or first-person ('fpv', at the head with the body hidden — keep
   * first-person parts via a `_fpv` mesh name). Read by the XR rig too. */
  cameraView: 'chase' | 'fpv' = 'chase'
  private fpvCamera: BABYLON.FreeCamera | null = null
  private headNode: BABYLON.TransformNode | null = null
  private viewWasPressed = false
  private hiddenBody: BABYLON.AbstractMesh[] = []

  /** XR/chase camera params, computed from the model bounds in render(). The
   * chase rig interpolates height (eyeHeight→chaseHeight) and distance with the
   * zoom intent, so zooming in drops to head height and out pulls back/up. */
  chaseHeight = 2.5
  chaseDistance = 3.5
  private _eyePos = new BABYLON.Vector3()
  /** Eye position for first-person: the head bone (or eyeHeight fallback) nudged
   * up + forward to roughly the eyes, so the camera sits at the eyes rather than
   * the neck / head-bone base — which would leave the head & neck in front of the
   * view. Forward is body-facing (root-aligned), since the camera ignores the
   * head's own animation. Returns a cached vector — read it now, don't retain. */
  getHeadPosition(): BABYLON.Vector3 | null {
    if (this.mesh == null) return null
    const f = this.mesh.forward
    const EYE_FWD = 0.12
    const EYE_UP = 0.06
    if (this.headNode != null) {
      const hp = this.headNode.getAbsolutePosition()
      this._eyePos.set(
        hp.x + f.x * EYE_FWD,
        hp.y + EYE_UP,
        hp.z + f.z * EYE_FWD
      )
    } else {
      const o = this.mesh.getAbsolutePosition()
      this._eyePos.set(
        o.x + f.x * EYE_FWD,
        o.y + (this as any).eyeHeight,
        o.z + f.z * EYE_FWD
      )
    }
    return this._eyePos
  }
  xrStuff?: XRStuff
  private xrInputProvider?: XRInputProvider
  animationState?: AnimState
  animationGroup?: BABYLON.AnimationGroup
  /** Measured vertical extent of the body per animation clip. See `_poseExtent`. */
  private _poseCache = new Map<
    string,
    { bottom: number; height: number; head: number | null }
  >()
  /** Seconds the current clip has been playing — a pose needs settling before measuring. */
  private _poseAge = 0
  /**
   * The climb in progress, if any — a COMMITTED transition. Time-boxed by the
   * clip and always exited, so it is not a mode you can be stuck in (the
   * distinction MOBILITY-DESIGN draws about cover applies here too).
   */
  /** Seconds until the ledge probe may run again — see the note at `_tryMantle`. */
  private _ledgeCooldown = 0
  private _mantle: {
    t: number
    dur: number
    from: BABYLON.Vector3
    to: BABYLON.Vector3
  } | null = null
  /** Samples in flight for the clip being measured — see `_currentPose`. */
  private _poseAccum: {
    key: string
    n: number
    bottom: number
    height: number
    head: number
    headN: number
    next: number
  } | null = null
  /** Last measured pose that hangs below its root, i.e. a swim pose. See the note in water. */
  private _lastSwimPose: {
    bottom: number
    height: number
    head: number | null
  } | null = null
  gameController?: GameController
  // XR camera: zoom goes from (1 back, 1 up) to (5 back, 2 up), default (2 back, 1.25 up)
  /**
   * Downward speed while airborne, m/s. One value per element rather than per
   * root node: a character GLB has a single root, and sharing it across two
   * would only matter for a rig that does not exist.
   */
  private _fallVel = 0
  /** True while in the water and off the bottom — see `buoyancy.isSwimming`. */
  private _swimming = false
  /** Held aim while swimming, DEGREES, positive down — see [[swim-aim]]. */
  private _swimAim = 0
  /** The pitch actually applied to the body, eased toward `_swimAim`. */
  private _swimPitch = 0
  /** Whether the body carried a pitch last frame, so unwinding runs to zero. */
  private _swimWasPitched = false
  /** Body yaw in radians while pitched — integrated, never read back. */
  private _bodyYaw = 0
  /**
   * Camera/body pitch in degrees, positive up. There is no `_lookYaw`: the
   * right stick turns the BODY now, so the camera has no yaw of its own.
   */
  private _lookPitch = 0
  private _sneaking = false
  /** Held the jump button while grounded: winding up, not yet launched. */
  private _jumpWasDown = false
  /** Off the ground and not in water — the jump clip owns the animation. */
  private _inAir = false
  private _jumpClip: 'jump' | 'running-jump' = 'jump'
  /**
   * Which phase of the three-part jump is showing. `Jump_Start` is a takeoff,
   * `Jump_Loop` holds you in the air however long the arc lasts, `Jump_Land`
   * plays on touchdown — so the clips no longer have to be stretched to fit the
   * flight, which is what `speedRatio` retiming was compensating for.
   */
  private _airPhase: 'start' | 'loop' | 'land' | null = null
  private _phaseLeft = 0

  /**
   * How long an animation clip runs, in seconds — `0` if there is no such clip.
   *
   * `from`/`to` are FRAMES, so this needs the clip's own frame rate rather than
   * an assumed 60: a 24 fps export would otherwise read as two and a half times
   * too long and launch the character accordingly. `speedRatio` counts too,
   * since the biped scales playback by movement speed.
   */
  private _clipSeconds(name: string): number {
    /*
    Resolve the STATE name to its clip name first.

    States and clips are only the same string on a rig that happens to name its
    animations the way the biped names its states. Looking up `jump` directly
    found nothing on a rig whose clip is `Jump_Start`, so this returned 0, the
    start phase expired in the frame it began, and the takeoff never played.
    */
    const state = this.animationStates.find((st) => st.name === name)
    const clip = state?.animation ?? name
    const groups = this.entries?.animationGroups ?? []
    const g =
      groups.find((x) => x.name.replace(/^Clone of /, '') === clip) ??
      groups.find((x) => new RegExp(`(^|[^a-z])${clip}$`, 'i').test(x.name))
    if (g == null) return 0
    const fps = g.targetedAnimations[0]?.animation?.framePerSecond ?? 60
    const ratio = Math.abs(g.speedRatio) || 1
    return (g.to - g.from) / fps / ratio
  }
  private _sneakWas = false
  /** Zoom 0..1, now integrated from the d-pad rather than read off a stick. */
  private _camZoom = 0
  private _waterEl: { mesh?: BABYLON.TransformNode } | null | undefined

  /**
   * Surface height of the scene's water, or `null` if there is none.
   *
   * Looked up lazily and cached — `undefined` means "not asked yet", `null`
   * means "asked, no water", which is the common case and must cost nothing per
   * frame. Read from the MESH rather than the element's `y`: water is
   * viewer-centred and not origin-shifted, so the mesh is the honest answer.
   */
  private _waterSurfaceY(): number | null {
    if (this._waterEl === undefined) {
      this._waterEl =
        (this.owner?.querySelector('tosi-b3d-water') as {
          mesh?: BABYLON.TransformNode
        } | null) ?? null
    }
    const mesh = this._waterEl?.mesh
    return mesh ? mesh.absolutePosition.y : null
  }
  private xrCamZoom = 0.25 // 0 = closest, 1 = furthest

  animationStates = AnimState.buildList(
    { animation: 'idle', loop: true },
    { animation: 'walk', loop: true },
    { animation: 'sneak', loop: true },
    { animation: 'run', loop: true },
    { animation: 'climb', loop: true },
    { name: 'walkBackwards', animation: 'walk', backwards: true, loop: true },
    { animation: 'jump', loop: false },
    { animation: 'running-jump', loop: false },
    { animation: 'salute', loop: false },
    { animation: 'wave', loop: false, additive: true },
    { animation: 'tread-water', loop: true },
    { animation: 'swim', loop: true },
    { animation: 'talk', loop: true },
    { animation: 'look', loop: true },
    { animation: 'dance', loop: true },
    { animation: 'pickup', loop: false },
    { animation: 'pilot', loop: true }
  )

  /**
   * **How tall the body actually is, in the pose it is holding right now.**
   *
   * Returns the body's vertical extent relative to the root node — `bottom` is
   * how far BELOW the root the lowest point is, `height` the full span — or
   * `null` until a skinned mesh is available.
   *
   * This exists because the root node is only at the feet when the character is
   * STANDING. Measured on the Quaternius rig: `Idle_Loop` spans 0 → 1.78 above
   * the root, but `Swim_Idle_Loop` hangs the legs 1.37 m BELOW it and puts the
   * head just 0.24 m above. Treating the root as the feet therefore floated a
   * body that was not there and left the real head about 1.2 m under —
   * Tonio: *"the biped is much lower when treading water relative to the old
   * biped"*, which is exactly right and now measured rather than guessed.
   *
   * It also killed the `buoyancy` dial: getting that head out of the water
   * needed a submersion of 0.14, i.e. `buoyancy ≈ 7`, so raising it to 2 moved
   * the body and changed nothing anyone could see.
   *
   * **Measured, never authored.** A per-rig table of swim offsets would be the
   * obvious alternative and is the wrong shape — it is `_cover` painting by
   * another name (MOBILITY-DESIGN.md): a fact the geometry already knows, wired
   * by hand, silently wrong for the next animation set. Since the numbers here
   * come out of the pose itself, a Mixamo or Mocap rig with different
   * proportions floats correctly with no tuning.
   *
   * Cost is one CPU skinning pass per CLIP, cached forever after — not per
   * frame. `refreshBoundingInfo({applySkeleton:true})` is far too expensive to
   * run continuously.
   */
  private _poseExtent(): {
    bottom: number
    height: number
    head: number | null
  } | null {
    const node = this.entries?.rootNodes?.[0] as
      | BABYLON.TransformNode
      | undefined
    if (node == null || node.position == null) return null
    let lo = Infinity
    let hi = -Infinity
    for (const m of node.getChildMeshes()) {
      if (!m.skeleton || m.getTotalVertices() === 0) continue
      try {
        m.refreshBoundingInfo({ applySkeleton: true, applyMorph: true })
      } catch {
        // Older Babylon builds take a boolean here. A pose we cannot measure
        // must not throw — it falls back to the standing assumption.
        try {
          ;(m as any).refreshBoundingInfo(true)
        } catch {
          return null
        }
      }
      const bb = m.getBoundingInfo().boundingBox
      if (bb.minimumWorld.y < lo) lo = bb.minimumWorld.y
      if (bb.maximumWorld.y > hi) hi = bb.maximumWorld.y
    }
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return null
    const scale = node.scaling?.y || 1
    return {
      bottom: (lo - node.position.y) / (scale || 1),
      height: (hi - lo) / (scale || 1),
      head: this._headOffset(node, scale || 1),
    }
  }

  /**
   * Height of the head bone above the root in the current pose, or `null` on a
   * rig with no findable head. See `_swimWaterline` for what it is for.
   */
  private _headOffset(
    node: BABYLON.TransformNode,
    scale: number
  ): number | null {
    for (const m of node.getChildMeshes()) {
      const bone = m.skeleton?.bones?.find((b) => /^head$/i.test(b.name))
      if (bone == null) continue
      return (bone.getAbsolutePosition(m).y - node.position.y) / scale
    }
    return null
  }

  /**
   * The extent for the clip currently playing, **averaged over a couple of
   * seconds** rather than sampled once, and cached per clip.
   *
   * Averaging is not polish, it is the difference between working and not. A
   * swim cycle is not a fixed shape: measured on `Swim_Fwd_Loop` (1.33 s), the
   * body's lowest point swings from −1.26 to −0.28 as the legs kick — nearly a
   * metre — and the head from −0.03 to +0.28. A single sample therefore lands
   * wherever the settle timer happens to fall, and since the waterline is
   * derived from `height / depth`, the shallow end of that swing produced a
   * buoyancy at the clamp and fired the swimmer out of the water. Tonio: *"I
   * seem to porpoise out of the water with a dead right stick"* — intermittent,
   * because it depended on the phase, which is exactly how it read.
   *
   * Returns the running mean while it accumulates, so the value is usable
   * immediately and merely gets better; it is committed to the cache once the
   * window closes.
   */
  private _currentPose(
    settle = 0.25,
    window = 2,
    interval = 0.08
  ): { bottom: number; height: number; head: number | null } | null {
    const key = this.animationState?.animation ?? this.animationState?.name
    if (key == null) return null
    const hit = this._poseCache.get(key)
    if (hit != null) return hit
    if (this._poseAge < settle) return null
    let acc = this._poseAccum
    if (acc == null || acc.key !== key) {
      acc = this._poseAccum = {
        key,
        n: 0,
        bottom: 0,
        height: 0,
        head: 0,
        headN: 0,
        next: 0,
      }
    }
    // Spread the samples across the cycle rather than taking them back to back:
    // a skinning pass per frame for two seconds is a real cost, and adjacent
    // frames say almost the same thing anyway.
    if (this._poseAge >= acc.next) {
      acc.next = this._poseAge + interval
      const m = this._poseExtent()
      if (m != null) {
        acc.n++
        acc.bottom += m.bottom
        acc.height += m.height
        if (m.head != null) {
          acc.head += m.head
          acc.headN++
        }
      }
    }
    if (acc.n === 0) return null
    const mean = {
      bottom: acc.bottom / acc.n,
      height: acc.height / acc.n,
      head: acc.headN > 0 ? acc.head / acc.headN : null,
    }
    if (this._poseAge >= settle + window) this._poseCache.set(key, mean)
    return mean
  }

  /**
   * **Where the water should sit on this pose**, expressed as the buoyancy that
   * puts it there — a body rests at submersion `1 / buoyancy`, so the two are
   * the same statement.
   *
   * The anchor is the **head**, because that is what swimming IS: a swimmer
   * keeps their head at the surface, and does it by swimming rather than by
   * floating. That makes this a fact about the activity rather than about a
   * clip, so it holds for any humanoid rig — the head bone exists in all of
   * them — and needs no per-animation-set tuning.
   *
   * It also beats the two conventions it sits between, both of which we tried.
   * The root is not a reliable anchor because it means different things in
   * different clips (Tonio: *"the whole root means two completely different
   * things ... is quite problematic"*) — feet when standing, roughly waterline
   * when swimming. Taking it literally floated this rig at ARMPIT height, since
   * its root sits 73% up the treading pose: *"he's still floating way too
   * high."* Anchoring at the head instead puts the water at the neck with the
   * chin clear, which is what treading water looks like, and the same rule
   * leaves a front crawl's head breaking the surface.
   *
   * Falls back to the root convention on a rig with no head bone, and to a
   * plain physical ratio for a pose that does not hang below its root (i.e. a
   * standing one, where there is no waterline being declared at all).
   *
   * Clamped, because `height / depth` diverges as the depth approaches zero and
   * one mid-blend measurement would otherwise fire a swimmer out of the water.
   */
  private _swimWaterline(
    pose: { bottom: number; height: number; head: number | null } | null,
    riseMetres = 0
  ): number {
    if (pose == null || pose.bottom >= -0.01) return DEFAULT_BUOYANCY
    // Riding `riseMetres` higher is the same as the water sitting that much
    // lower on the body, which is the form the equilibrium wants.
    const waterline = (pose.head ?? 0) - riseMetres
    const submergedDepth = waterline - pose.bottom
    if (!(submergedDepth > 0.01)) return DEFAULT_BUOYANCY
    return Math.min(3, Math.max(1, pose.height / submergedDepth))
  }

  /**
   * **Look for a lip in front of the character.** Two rays: one forward at shin
   * height to find the face of the thing, one down from above the far side to
   * find what you would be standing on.
   *
   * Returns `null` when there is nothing to read. Everything it does return is
   * a MEASUREMENT — see `mantle.canMantle` for the decision, which is pure and
   * tested, and see MOBILITY-DESIGN for why a `_climbable` suffix would be a
   * bug rather than a shortcut.
   */
  private _readLedge(
    node: BABYLON.TransformNode,
    feetY: number,
    reach: number
  ): LedgeReading | null {
    const scene = this.owner?.scene
    if (scene == null) return null
    const fwd = node.forward.clone()
    fwd.y = 0
    if (fwd.lengthSquared() < 1e-6) return null
    fwd.normalize()
    const filter = collidable((m) => m === node || !m.checkCollisions)

    /*
    1. Is there a face in front of us at all?

    SEVERAL heights, not one. A single shin-height ray is the obvious version
    and it is too fragile for real terrain: measured at a canal bank in the
    demo, the face existed only between 0.25 m and 1.25 m — undercut below,
    sloping away above — so a ray at 0.05 m passed clean underneath a wall the
    character was visibly stuck against, and the climb never even considered
    itself. Nothing was wrong except the height of one line.

    So sample up the reachable band and take the CLOSEST hit. That also handles
    the cases a fixed height cannot: overhangs, sloped banks, and a lip whose
    base is under water.
    */
    let face: BABYLON.PickingInfo | null = null
    let distance = Infinity
    let origin: BABYLON.Vector3 | null = null
    for (let h = 0.2; h <= reach; h += 0.4) {
      const from = new BABYLON.Vector3(
        node.position.x,
        feetY + h,
        node.position.z
      )
      const hit = scene.pickWithRay(
        new BABYLON.Ray(from, fwd, defaultMantleLimits.grabDistance),
        filter
      )
      if (!hit?.hit || hit.pickedPoint == null) continue
      const d = BABYLON.Vector3.Distance(from, hit.pickedPoint)
      if (d < distance) {
        distance = d
        face = hit
        origin = from
      }
    }
    if (face?.pickedPoint == null || origin == null) return null

    // 2. What is on top of it? Drop a ray just beyond the face, from above the
    //    highest we could possibly climb.
    const beyond = face.pickedPoint.add(fwd.scale(0.35))
    const top = scene.pickWithRay(
      new BABYLON.Ray(
        new BABYLON.Vector3(beyond.x, feetY + reach + 0.5, beyond.z),
        new BABYLON.Vector3(0, -1, 0),
        reach + 1
      ),
      filter
    )
    if (!top?.hit || top.pickedPoint == null) return null
    const height = top.pickedPoint.y - feetY

    // 3. Is there room to stand there, and floor to stand ON? A second drop
    //    further in distinguishes a ledge from the top of a fence.
    const inward = face.pickedPoint.add(fwd.scale(0.75))
    const landingHit = scene.pickWithRay(
      new BABYLON.Ray(
        new BABYLON.Vector3(inward.x, feetY + reach + 0.5, inward.z),
        new BABYLON.Vector3(0, -1, 0),
        reach + 1
      ),
      filter
    )
    const landing =
      landingHit?.hit &&
      landingHit.pickedPoint != null &&
      Math.abs(landingHit.pickedPoint.y - top.pickedPoint.y) < 0.3
        ? 0.75
        : 0
    const headHit = scene.pickWithRay(
      new BABYLON.Ray(
        top.pickedPoint.add(new BABYLON.Vector3(0, 0.05, 0)),
        new BABYLON.Vector3(0, 1, 0),
        defaultMantleLimits.clearance + 0.5
      ),
      filter
    )
    const headroom =
      headHit?.hit && headHit.pickedPoint != null
        ? headHit.pickedPoint.y - top.pickedPoint.y
        : defaultMantleLimits.clearance + 0.5

    return { height, distance, headroom, landing }
  }

  /**
   * Try to start a climb. Returns true if one began, in which case the caller
   * hands this frame over — a mantle owns the body until it finishes.
   */
  private _tryMantle(
    node: BABYLON.TransformNode,
    feetY: number,
    reach: number,
    stepUp: number
  ): boolean {
    const reading = this._readLedge(node, feetY, reach)
    if (reading == null) return false
    if (!canMantle(reading, { ...defaultMantleLimits, stepUp, reach }))
      return false

    const fwd = node.forward.clone()
    fwd.y = 0
    fwd.normalize()
    const from = node.position.clone()
    // Land far enough in that the character is standing ON the surface rather
    // than balanced on its edge.
    const to = new BABYLON.Vector3(
      from.x + fwd.x * (reading.distance + 0.6),
      from.y + reading.height,
      from.z + fwd.z * (reading.distance + 0.6)
    )

    const clip = mantleClip(
      reading.height,
      this.animationStates?.map((a: AnimState) => a.animation ?? a.name) ?? [],
      'jump'
    )
    this.setAnimationState(clip)
    // The clip's own length, so the climb retimes itself when the animation
    // set changes rather than needing a matching constant here.
    const dur = Math.max(0.4, Math.min(2.5, this._clipSeconds(clip) || 0.9))
    this._mantle = { t: 0, dur, from, to }
    this._swimming = false
    this._fallVel = 0
    this._inAir = false
    return true
  }

  setAnimationState(name: string, speed = 1) {
    if (name == null) {
      throw new Error('setAnimationState failed, no animation name specified.')
    }
    if (
      this.animationState?.name === name ||
      this.animationState?.animation === name
    ) {
      this.animationGroup!.speedRatio = speed
      return
    }
    if (this.entries == null) return
    // A new clip means a new pose; it must settle before it can be measured.
    this._poseAge = 0

    const newState = this.animationStates.find(
      (state) => state.name === name || state.animation === name
    )
    if (newState == null) {
      console.error(`setAnimationState: no state named "${name}"`)
      return
    }
    /*
    EXACT NAME FIRST, suffix only as a fallback.

    The lookup was `g.name.endsWith(animation)`, and a suffix match is ambiguous
    the moment one clip's name ends with another's. Quaternius exposes it
    immediately — asking for `Idle_Loop` played `Crouch_Idle_Loop`, because that
    ends with it and sorts earlier — but it was already latent in the stock set:
    `running-jump` ends with `jump`, so `setAnimationState('jump')` could match
    the running jump depending on array order.

    Babylon prefixes cloned groups with "Clone of ", so exactness has to be
    measured after stripping that. The suffix fallback stays for rigs whose
    exporter added some other prefix — permissive when it must be, precise when
    it can be.
    */
    const clipName = (n: string) => n.replace(/^Clone of /, '')
    const groups = this.entries.animationGroups
    let idx = groups.findIndex((g) => clipName(g.name) === newState.animation)
    if (idx === -1) {
      idx = groups.findIndex((g) => g.name.endsWith(newState.animation))
    }
    if (idx === -1) {
      console.error(
        `setAnimationState: could not find animation "${newState.animation}"`
      )
      return
    }
    this.animationState = newState
    const loop = newState.loop
    const additive = newState.additive
    if (loop) {
      for (const ag of this.entries.animationGroups) {
        ag.stop()
      }
    }
    const animationGroup = this.entries.animationGroups[idx]
    if (newState.backwards) {
      animationGroup.start(
        loop,
        speed,
        animationGroup.to,
        animationGroup.from,
        additive
      )
    } else {
      animationGroup.start(
        loop,
        speed,
        animationGroup.from,
        animationGroup.to,
        additive
      )
    }
    this.animationGroup = animationGroup
  }

  getCameraTarget(): BABYLON.Node | null {
    return this.entries?.rootNodes[0] ?? null
  }

  applyInput(input: ControlInput, dt: number) {
    if (this.entries == null) return
    const attrs = this as any
    this._poseAge += dt

    /*
    A CLIMB IN PROGRESS OWNS THE BODY.

    Advance it and take the frame. It is time-boxed by the clip and always
    ends, so there is nothing to be stuck in — the property MOBILITY-DESIGN
    insists on for cover, and the reason this is a committed transition rather
    than a mode.
    */
    if (this._mantle != null) {
      const m = this._mantle
      m.t += dt / m.dur
      const node = this.entries.rootNodes[0] as BABYLON.TransformNode
      const p = mantlePath(m.from, m.to, m.t)
      node.position.set(p.x, p.y, p.z)
      if (m.t >= 1) {
        this._mantle = null
        this._fallVel = 0
      }
      return
    }

    // Camera toggle on the view button (edge-detected).
    const viewPressed = input.view > 0.5
    if (viewPressed && !this.viewWasPressed) {
      this.setCameraView(this.cameraView === 'chase' ? 'fpv' : 'chase')
    }
    this.viewWasPressed = viewPressed

    // First-person camera tracks the head node — so it doesn't fall behind the
    // head when walking, or float above it when crouching. Orientation stays
    // root-aligned (yaw only) to avoid the head's animation bob/rotation. Flat
    // only; in VR the rig anchors to getHeadPosition().
    if (
      this.cameraView === 'fpv' &&
      this.fpvCamera != null &&
      this.mesh != null &&
      !this.owner?.xrActive
    ) {
      const eye = this.getHeadPosition()
      this.fpvCamera.parent = null
      if (eye != null) this.fpvCamera.position.copyFrom(eye)
      const f = this.mesh.forward
      this.fpvCamera.rotation.set(0, Math.atan2(f.x, f.z), 0)
    }

    /*
    SNEAK IS A TOGGLE ON LAND AND A HELD CONTROL IN WATER.

    Tonio's call, and it is the right one for both: sneaking is a stance you
    adopt for a while, so holding a bumper the whole time is a chore — but
    diving is a thing you do continuously, and a toggle you have to remember the
    state of while your head is under is worse than useless. Same button, and
    the medium decides which verb it is.

    The edge is tracked rather than the level, so the toggle flips once per
    press. Leaving the water does NOT clear the flag: you sneak out of the sea
    if you were sneaking when you went in, which is the least surprising thing.
    */
    const sneakDown = (input.sneak ?? 0) > 0.5
    if (!this._swimming && sneakDown && !this._sneakWas) {
      this._sneaking = !this._sneaking
    }
    this._sneakWas = sneakDown

    const speed = input.forward
    /*
    STRAFING IS OPTIONAL, AND OFF BY DEFAULT.

    Tonio: *"I've decided I hate strafing both on principle and specifically the
    way its animated by quaternius."* Two objections and they are worth keeping
    apart, because only one of them is about this rig: sidestepping is a shooter
    idiom that reads oddly on a character who is supposed to move like a person,
    and the lateral clips are the weakest in the set. The first outlives the
    animation library.

    With it off, BOTH sticks turn you — the left while moving or not, the right
    without moving — so nothing is lost from the control surface and the
    sidestep clips simply never play. Summed and clamped rather than picked
    between, so using both at once is not a fight.
    */
    const strafeIsTurn = isOff((this as any).strafing)
    const rotation = strafeIsTurn
      ? Math.max(-1, Math.min(1, (input.turn ?? 0) + (input.strafe ?? 0)))
      : input.turn
    const sprint = this._sneaking ? 0 : input.sprint
    const sprintSpeed = speed * sprint
    const walk = this._sneaking
      ? attrs.forwardSpeed * attrs.sneakSpeed
      : attrs.forwardSpeed
    const totalSpeed =
      speed * walk + sprintSpeed * (attrs.runSpeed - attrs.forwardSpeed)

    /*
    LOOK — the right stick, and the reason swimming had no aim on a flat screen.

    Persistent, not sprung: a character's camera is how you look AROUND, so it
    stays where you put it. (The aircraft's springs back because there it is a
    glance off the flight path, which is a different job with the same stick.)

    A `FollowCamera` has no pitch of its own; it looks at its locked target from
    `heightOffset` above and `rotationOffset` around. So pitch is height — raise
    the camera and it looks down — which is exactly the third-person behaviour
    and needs no second camera type.
    */
    /*
    WHILE SWIMMING, LEVEL IS THE RESTING STATE.

    Persistent look is right on land — you look around and it stays where you
    put it. In the water it is a trap, because the swim aim IS the look pitch:
    aim down once to dive and you are aimed down forever, so every stroke digs
    deeper and getting back out means holding the stick up for a second and a
    half against the 70° clamp. Tonio: "trying to go up from on the surface is a
    big issue but I can't get out of the water now."

    So while swimming the pitch springs back to level when the stick is
    released. Push up to climb, push down to dive, let go to swim flat — and
    buoyancy then does the rest, which is the behaviour that makes surfacing
    automatic instead of a manoeuvre. Yaw does NOT spring: turning is turning,
    in or out of the water.

    In a headset none of this applies: your neck already returns to level, and
    the aim comes from your head rather than from here.
    */
    if (this._swimming && Math.abs(input.lookY ?? 0) < 0.08) {
      this._lookPitch *= Math.exp(-3 * dt) // frame-rate independent
      if (Math.abs(this._lookPitch) < 0.5) this._lookPitch = 0
    }
    // Inverted in BOTH media, deliberately: it is one control and it should not
    // change sense when you get your feet wet. (Tried land-only; Tonio's call
    // is that consistency wins, and the head-underwater problem was elsewhere.)
    const lookYSign = isOff(attrs.invertLookY) ? 1 : -1
    this._lookPitch = Math.max(
      -attrs.maxLookPitch,
      Math.min(
        attrs.maxLookPitch,
        this._lookPitch + (input.lookY ?? 0) * lookYSign * attrs.lookRate * dt
      )
    )
    if (this.camera instanceof BABYLON.FollowCamera) {
      this.camera.radius = lerp(
        attrs.cameraMinFollowDistance,
        attrs.cameraMaxFollowDistance,
        Math.max(0, Math.min(1, this._camZoom))
      )
      this._camZoom = Math.max(
        0,
        Math.min(1, this._camZoom + (input.cameraZoom ?? 0) * dt)
      )
      // Straight behind the body. The right stick turns the CHARACTER now, so
      // the camera has no yaw of its own and cannot end up pointing somewhere
      // the character is not — which is the failure mode an orbiting
      // third-person camera has and a GTA-style one does not.
      this.camera.rotationOffset = 180
      // Pitch as height: +look is up, which means the camera drops BELOW the
      // subject to look up at it, so the offset runs the other way.
      /*
      KEEP THE CAMERA ABOVE GROUND.

      Pitch drives HEIGHT on a FollowCamera, so looking up walks the camera
      downward — and past a certain angle it goes underground and the world
      vanishes. A floor is the cheap, always-correct half of the fix; the
      thorough version raycasts from the subject to the camera and pulls in, the
      way the world-dialog depth guard does, which also handles walls rather
      than just terrain.
      */
      this.camera.heightOffset = Math.max(
        attrs.cameraMinHeight,
        attrs.cameraHeightOffset +
          Math.tan((-this._lookPitch * Math.PI) / 180) *
            this.camera.radius *
            0.5
      )
    }

    // XR camera zoom from right stick
    if (input.cameraZoom !== 0 && this.xrStuff) {
      this.xrCamZoom += input.cameraZoom * 0.5 * dt
      this.xrCamZoom = Math.max(0, Math.min(1, this.xrCamZoom))
    }

    for (const node of this.entries.rootNodes as BABYLON.Mesh[]) {
      if (speed > 0) {
        node.moveWithCollisions(node.forward.scaleInPlace(totalSpeed * dt))
      } else if (speed < 0) {
        node.moveWithCollisions(
          node.forward.scaleInPlace(speed * dt * attrs.backwardSpeed)
        )
      }
      /*
      STRAFE — the left stick's X, now that the right stick turns.

      Along the body's own right axis, so it follows the facing (and, while
      swimming, the pitch) for free. Deliberately not sprint-scaled: sprinting
      sideways is not a thing, and letting it happen makes the sprint modifier
      feel like a general speed multiplier rather than a run.
      */
      const strafe = strafeIsTurn ? 0 : input.strafe ?? 0
      if (Math.abs(strafe) > 0.01) {
        /*
        DERIVE RIGHT FROM FORWARD — `node.right` is not it.

        A glTF root arrives mirrored (`scaling.z = -1`), and the scale applies in
        LOCAL space, so `forward` comes back negated while `right` does not. The
        two then describe opposite handedness: measured on the live rig,
        `node.right` versus `cross(up, forward)` gives a dot product of exactly
        −1. Strafing right walked left.

        `cross(up, forward)` is right-by-construction in this coordinate system
        (see `babylon-orientation.test.ts`: `cross(forward, up)` is LEFT), and it
        cannot disagree with the facing because it is DERIVED from it. That is
        the fix rather than another `scaling.z` sign test — the pitch needed one
        because it feeds a quaternion, but a direction can just be computed.
        */
        BABYLON.Vector3.CrossToRef(
          BABYLON.Vector3.Up(),
          node.forward,
          _rightScratch
        )
        node.moveWithCollisions(
          _rightScratch.scaleInPlace(strafe * walk * attrs.strafeSpeed * dt)
        )
      }
      node.rotate(
        BABYLON.Vector3.Up(),
        rotation * dt * attrs.turnSpeed * DEG_TO_RAD
      )

      /*
      STAND ON THE GROUND — a SNAP, not a dead band.

      This used to probe 0.15 m down from just above the feet and, if it found
      anything, do nothing at all. So there was no term pulling the biped TOWARD
      the surface: it fell until the probe happened to see ground, then stopped
      wherever in that 0.15 m window it landed. Anything inside the band was
      permanent, which is exactly how it was reported — Tonio: "you often end up
      a little offset from the ground (floating above or sunken in) and this
      never really corrects. It just gets randomly messed up again when you
      navigate another slope."

      Slopes made it worse in both directions. Going UP, `moveWithCollisions`
      slides the body up the ellipsoid and leaves it high in the band. Going
      DOWN — "especially down" — the ground fell away faster than the old
      gravity could follow: it moved at most `min(0.1, 9.81·dt)` per frame, a
      hard 0.1 m clamp, so a brisk descent outran it and it floated the whole
      way down.

      Now: probe a step's worth up and a step's worth down, and if there is
      ground in that range put the feet ON it (the root origin IS the feet — see
      the ellipsoid offset in setupMesh). Otherwise fall properly, accumulating
      velocity rather than moving a fixed amount per frame.
      */
      const fallStep = Math.abs(this._fallVel * dt)
      const ray = new BABYLON.Ray(
        new BABYLON.Vector3(
          node.position.x,
          node.position.y + STEP_UP,
          node.position.z
        ),
        BABYLON.Vector3.Down(),
        // Extended by this frame's fall so a fast descent cannot step over the
        // surface between two frames and keep going.
        STEP_UP + STEP_DOWN + fallStep
      )
      const hit = this.owner!.scene.pickWithRay(
        ray,
        // `collidable()` for the shared rules (UI never counts as floor,
        // isPickable/isEnabled re-checked because a predicate replaces
        // Babylon's own filter); `checkCollisions` stays as OUR clause.
        collidable((m) => m === node || !m.checkCollisions)
      )
      /*
      WATER IS A MEDIUM, NOT A LINE.

      Falling through water is not falling through air with a smaller number: a
      body is slightly less dense than water, so it is pushed up in proportion
      to how much of it is under, and it comes to rest where that balances its
      weight. Plunge-and-bob, a head that ends up ABOVE the surface, and wading
      that does nothing until it is deep enough to lift you all fall out of that
      one equation — see [[buoyancy]], where it is pure and tested.

      SWIMMING IS IN THE WATER **AND** OFF THE BOTTOM. Both halves matter: deep
      water while standing on a sandbar is wading, and getting it wrong gives you
      a character doing breaststroke while visibly standing up.
      */
      /*
      JUMP — an impulse, not a teleport, so the existing gravity carries it.

      Only from the ground: no double-jumping and no jumping out of water (in
      water the same button SURFACES you, which is the continuous verb). Edge
      triggered, so holding it does not pogo.
      */
      /*
      CROUCH ON PRESS, LAUNCH ON RELEASE — Tonio's call, and the animation is
      the reason.

      Firing the impulse on the press edge put the wind-up in the wrong place:
      the `jump` clip opens with a crouch, so launching immediately meant "he
      crouches AFTER launching". Anticipation has to precede the thing it
      anticipates or it is not anticipation, it is a stumble.

      So the press starts the crouch and the release launches. The clip is
      requested while still grounded and simply keeps playing through the
      launch — `setAnimationState` is idempotent, so asking for `jump` again
      while airborne does not restart it and the wind-up is not replayed.

      Charging is cancelled by leaving the ground or entering water. In water
      this button is the SURFACE control and continuous, so it never charges.
      */
      const jumpDown = (input.jump ?? 0) > 0.5
      this._jumpWas = jumpDown

      const surfaceY = this._waterSurfaceY()
      // `eyeHeight` as a proxy for body height. It is a little short by
      // definition, which is the harmless direction: equilibrium is a FRACTION
      // of whatever height you give it, so erring small floats you a touch
      // lower rather than leaving you standing on the water.
      const standHeight = ((this as any).eyeHeight as number) || 1.6
      /*
      A cheap standing test FIRST, purely to decide whether measuring is worth
      it: `_currentPose` costs a CPU skinning pass on the frame it measures a
      new clip, and running that for every walk/run/jump clip on dry land would
      be a hitch bought for nothing. Near the water it pays for itself once per
      clip and is cached forever.
      */
      const nearWater =
        surfaceY != null && node.position.y < surfaceY + standHeight
      /*
      A CLIP CHANGE MUST NOT BRIEFLY MAKE A SWIMMER STAND.

      `_currentPose` returns null until the new clip has settled enough to
      measure, and falling back to the standing assumption for those few frames
      put the root back at the feet — so a swimmer floating at the waterline
      read as barely submerged and started walking on it. Moving is exactly what
      changes the clip (tread → forward stroke), which is why it showed up as
      "when you move he tends to jump up to the surface and walk".

      So while swimming, an unmeasured clip inherits the last swim pose. It is
      the better guess by far: consecutive swim clips hang the body off the root
      the same way, and the alternative is a pose we know to be wrong.
      */
      const pose = nearWater
        ? this._currentPose() ?? (this._swimming ? this._lastSwimPose : null)
        : null
      if (pose != null && pose.bottom < -0.01) this._lastSwimPose = pose
      // No measurement yet ⇒ assume the standing pose: root at the feet, body
      // upward. True while standing, and merely the previous behaviour
      // otherwise, so a pose we cannot measure degrades rather than breaks.
      const bodyBottom = pose ? pose.bottom : 0
      const bodyHeight = pose ? pose.height : standHeight
      const feetY = node.position.y + bodyBottom
      /*
      HOW DEEP THE HEAD IS — computed ONCE.

      This was derived twice and the two disagreed: the up-thrust gate used
      `feetY + bodyHeight` (right) while the up-AIM clamp used
      `node.position.y + bodyHeight`, dropping `bodyBottom`. A swim pose puts
      the ROOT at the waterline with the body hanging below it, so `bodyBottom`
      is negative and the aim clamp therefore believed the head was a body-length
      shallower than it was — clamping upward aim to nothing while the thrust
      gate was happily allowing it.

      Tonio: "in first person I don't seem to be able to swim upwards." You could
      thrust up but not AIM up, so nothing rose.

      Two derivations of one quantity is the bug, not the arithmetic; deriving it
      once is the fix.
      */
      const headDepth =
        surfaceY == null ? 0 : surfaceY - (feetY + bodyHeight)
      const submerged =
        surfaceY == null ? 0 : submergedFraction(feetY, bodyHeight, surfaceY)
      const grounded = hit?.hit === true && hit.pickedPoint != null
      const groundY = grounded ? hit!.pickedPoint!.y : -Infinity
      /*
      THE SWIM/STAND TEST MUST NOT USE THE POSE, or it feeds back on itself.

      Buoyancy needs the CURRENT pose, because displacement is a fact about the
      body that is actually in the water. The DECISION to swim must not, because
      the pose is a consequence of that decision: raise buoyancy, the body
      rises, submersion falls under the exit threshold, the pose snaps upright,
      and an upright body measured from the same root reads as barely
      submerged — which locks the flip in. Observed directly: at `buoyancy` 1.3
      the character corked out and stood on the surface, the "wade on water" bug
      arriving by a new route.

      So the decision asks a question whose answer cannot depend on it: **how
      deep would this water be if I STOOD here?** Which is also the question it
      means — you swim because you cannot stand — and it is stable across the
      switch, so there is no loop left to close.
      */
      const standSubmerged =
        surfaceY == null
          ? 0
          : grounded
          ? /*
            Feet ON THE FLOOR, not the root — while swimming the root sits
            mid-torso, so measuring from it asks "how deep would it be if I
            stood with my feet where my chest is".

            Scaled so `wadeDepth` lands exactly on `isSwimming`'s 0.5 entry
            threshold, which keeps that model's tested hysteresis — you stop
            swimming at 0.7 × wadeDepth — while letting the threshold be stated
            as the fraction it is.
            */
            submergedFraction(groundY, standHeight, surfaceY) /
            (2 * Math.max(0.05, attrs.wadeDepth))
          : // NO FLOOR AT ALL ⇒ you cannot stand, and no position can argue
            // otherwise. Deriving this from where the body happens to be let
            // a swimmer who rode high read as barely submerged and walk off
            // across the surface; the honest answer does not depend on how
            // buoyant the last frame was.
            1
      const wasInAir = this._inAir

      /*
      HOLDING BRACES YOU; RELEASING JUMPS.

      The charge is TIME, and it scales the launch: release immediately and you
      */
      // Read the charge BEFORE the guard below can clear it. On the release
      // frame `jumpDown` is already false, so clearing first meant `jumpLaunch`
      // never saw a charge and the jump could not fire at all — the same
      // read-then-clear ordering slip as the ground snap swallowing the impulse.
      /*
      JUMPS ARE INSTANTANEOUS. The animation set says so.

      This used to crouch on press and launch on release, which was an
      adaptation to the stock rig's single one-shot clip that happened to open
      with a crouch. Quaternius ships the standard three phases — `Jump_Start`
      is a TAKEOFF, not a wind-up — and Tonio read it correctly: "it's basically
      designed for instantaneous jumps where once you jump you enter the jump
      state and that's it."

      Which is also the platform-jumper contract in MOBILITY-DESIGN.md: the
      character does exactly what you pressed, now. Anticipation belongs to the
      intent model, where the character decides to jump before you ask — not to
      a button that makes you wait for it.
      */
      const jumpPressed = jumpDown && !this._jumpWasDown
      this._jumpWasDown = jumpDown
      const moving = Math.abs(speed) > 0.1
      const canJump = grounded && standSubmerged <= 0 && this._fallVel <= 0
      const jumpLaunch = jumpPressed && canJump

      /*
      PUSH INTO A LEDGE AND YOU CLIMB IT.

      No button. Tonio: *"we basically want the biped rig to sense we've hit a
      ledge and it's too high to just step onto so let's climb onto it."* That
      is the intent model in MOBILITY-DESIGN — you steer at the bank and the
      character solves the terrain — and it is why this is checked from ordinary
      forward movement rather than bound to a key.

      It answers the swimming complaint as a side effect rather than as a case:
      *"when you swim to the water's edge, you just pop instantly to the surface
      onto the land."* Climbing out of a pond IS mantling a lip of height h, so
      the bank, the low wall and the crate are one verb.

      Gated on actually moving forward, so brushing a wall while strafing or
      turning does not launch a climb.
      */
      /*
      PROBES ARE RATIONED, not run every frame.

      This costs eight raycasts — five up the face plus three for the top,
      headroom and landing — and it is only the first of several features that
      will want to read the environment this way. Tonio: *"we're probably going
      to need a bunch of raycasts (maybe not sampled constantly) to handle
      tomb-raider style movement and cover discovery."*

      At 12 Hz a ledge cannot be missed (you cover ~0.4 m between probes at a
      run) and the per-frame cost drops by four fifths. When cover discovery and
      vaulting arrive they should share ONE budgeted read of the surroundings
      rather than each growing their own fan of rays — see MOBILITY-DESIGN.
      */
      this._ledgeCooldown -= dt
      if (
        speed > 0.3 &&
        this._mantle == null &&
        this._ledgeCooldown <= 0 &&
        (grounded || this._swimming) &&
        ((this._ledgeCooldown = 1 / 12), true) &&
        this._tryMantle(
          node,
          /*
          A SWIMMER REACHES FROM THE WATERLINE, NOT FROM THEIR FEET.

          Treading water the feet dangle ~1.4 m down, and measuring the bank
          from there made every shore in the demo 3 m tall — beyond any
          plausible reach, so the climb declined and you were left bumping the
          wall. But you do not climb out of a pond with your legs; your hands
          are at the surface, which is where the reach starts.

          Measured here: the banks stand 1.45–1.80 m above the water, i.e. a
          hard but possible pull-up from the waterline, and an impossible one
          from the feet. Same geometry, and only one of the two readings
          matches what a person would do.
          */
          this._swimming && surfaceY != null ? surfaceY : node.position.y,
          attrs.climbReach,
          STEP_UP
        )
      ) {
        return
      }
      if (jumpLaunch) this._jumpClip = moving ? 'running-jump' : 'jump'

      if (submerged > 0) {
        /*
        In water, buoyancy owns the vertical and THE FLOOR IS ONLY A FLOOR: it
        stops you sinking past it, it does not hold you down. Snapping to it
        whenever it was in reach — which is what "grounded" meant a moment ago —
        stood the character on the seabed under six metres of water, technically
        grounded and visibly wrong.

        DIVING: `sneak` takes you down, `jump` takes you up — crouch-to-descend
        matches the GTA-V control vocabulary this project follows, and leaves
        the triggers alone. Thrust competes with buoyancy rather than replacing
        it, so letting go hands the vertical back to physics instead of pinning
        you.

        And once your head is properly under, buoyancy blends toward NEUTRAL
        (see `swimBuoyancy`) so you hold the depth you swam to, drifting up
        slowly rather than corking — Tonio's call: "holding with a slow drift
        upward by default." Note you also GLIDE a little deeper after releasing
        the control; that is momentum, not a bug, and letting go is not a brake.
        */
        /*
        YOU CANNOT PUSH YOURSELF OUT OF WATER.

        Surface thrust used to apply at any depth, so holding it lifted you
        until submersion fell under the swim threshold — at which point you were
        classed as standing, got a walk cycle, and could stroll across the
        surface. Tonio: "pressing up in water causes me to stand (it's allowing
        me to 'wade on water')."

        So the up thrust is gated by head depth, exactly as the upward AIM is:
        full while properly under, fading to nothing as your head breaks the
        surface. Getting to the surface is buoyancy's job and it does it for
        free; this button exists to get you up when you are deep. Down is
        ungated — you can always dive.
        */
        const upAllowed = surfaceAimLimit(headDepth, 1)
        const swimUp = (input.jump ?? 0) > 0.5 ? upAllowed : 0
        const swimDown = (input.sneak ?? 0) > 0.5 ? 1 : 0
        /*
        THE CLIP DECLARES THE WATERLINE.

        Tonio's read, and the measurements agree exactly: the swim animations
        are authored with the ROOT AT WATER LEVEL. `Swim_Idle_Loop` spans −1.37
        to +0.50 about the root and `Swim_Fwd_Loop` −0.60 to +0.31 — float the
        root on the surface and the first is a tread with head and shoulders
        out, the second a crawl with the head just breaking. Both are right, and
        neither needed a number chosen by anyone.

        So the equilibrium is not tuned, it is READ: a body rests where its
        displacement balances its weight, at submersion `1 / buoyancy`, so the
        buoyancy that parks the root on the surface is `height / -bottom`. The
        animation set therefore tunes its own flotation, which is the same
        argument as `_poseExtent` — a fact the content already knows, taken from
        the content rather than typed in beside it.

        Below, `swimBuoyancy` blends this toward neutral as you go deeper, so
        diving still holds its depth; this only sets where the SURFACE is.
        */
        const poseBuoyancy = this._swimWaterline(pose, attrs.buoyancy)
        this._fallVel = buoyantStep(this._fallVel, submerged, dt, {
          buoyancy: swimBuoyancy(headDepth, { buoyancy: poseBuoyancy }),
          thrust: (swimUp - swimDown) * SWIM_THRUST,
        })
        let nextY = node.position.y + this._fallVel * dt
        let onFloor = false
        // The floor stops the body's LOWEST point, which in a swim pose is the
        // trailing legs rather than the root — treading, they hang 1.37 m below
        // it. Clamping the root instead buried them in the seabed.
        if (nextY + bodyBottom <= groundY) {
          nextY = groundY - bodyBottom
          this._fallVel = 0
          onFloor = true
        }
        node.position.y = nextY
        this._swimming = isSwimming(standSubmerged, onFloor, this._swimming)
      } else if (jumpLaunch && grounded) {
        this._swimming = false
        this._fallVel = attrs.jumpSpeed
        this._airPhase = 'start'
        this._phaseLeft = this._clipSeconds(this._jumpClip)
        this.setAnimationState(this._jumpClip)
        node.moveWithCollisions(new BABYLON.Vector3(0, this._fallVel * dt, 0))
        this._inAir = true
      } else if (grounded && this._fallVel <= 0) {
        /*
        THE SNAP HAS TO YIELD WHILE YOU ARE RISING.

        Snapping the feet to the ground is unconditional the rest of the time,
        and that swallowed the jump whole: the impulse lifted the body ~7 cm,
        the probe still saw ground 0.6 m below on the next frame, and the snap
        put it straight back. Measured — a jump that rose exactly 0.00 m.

        So the ground only claims you when you are not moving away from it.
        `_fallVel <= 0` is the whole condition: falling or at rest, snap; rising,
        let ballistics have it.
        */
        this._swimming = false
        this._inAir = false
        node.position.y = groundY
        this._fallVel = 0
      } else {
        this._swimming = false
        // Terminal velocity keeps one slow frame from teleporting a biped
        // through the floor, on top of the probe extension above.
        this._fallVel = Math.max(-20, this._fallVel - 9.81 * dt)
        node.moveWithCollisions(new BABYLON.Vector3(0, this._fallVel * dt, 0))
        this._inAir = true
      }
      if (submerged > 0) this._inAir = false

      /*
      START → LOOP → LAND, each for as long as it is actually true.

      `Jump_Start` runs its own length; `Jump_Loop` then covers however long the
      arc lasts, whatever the launch speed; `Jump_Land` plays on touchdown and
      releases back to normal locomotion when it finishes. Nothing is stretched
      to fit, which is why the `speedRatio` retiming could go.

      Touchdown is the airborne→grounded EDGE rather than a velocity test, so a
      jump interrupted by a ceiling or a slope still lands.
      */
      if (this._airPhase != null) {
        this._phaseLeft -= dt
        if (wasInAir && !this._inAir) {
          this._airPhase = 'land'
          this._phaseLeft = this._clipSeconds('jumpLand') || 0.3
        } else if (this._airPhase === 'start' && this._phaseLeft <= 0) {
          this._airPhase = this._inAir ? 'loop' : null
        } else if (this._airPhase === 'land' && this._phaseLeft <= 0) {
          this._airPhase = null
        } else if (this._airPhase === 'loop' && !this._inAir) {
          this._airPhase = 'land'
          this._phaseLeft = this._clipSeconds('jumpLand') || 0.3
        }
      }
      /*
      LOOK-DIRECTED SWIMMING: pitch the BODY, and the stroke follows.

      The biped already swims along its own forward vector, so tilting the body
      tilts the movement — one rotation, no separate vertical term for the
      stroke, and no way for the aim and the motion to disagree. It also fixes
      the thing that made swimming read wrong even when it worked: a character
      moving downward while standing bolt upright.

      Aim comes from your HEAD in a headset (that is what look-directed means
      when you have a neck) and from the right stick flat, because the biped's
      follow camera has a fixed pitch and there is simply nothing to read. Both
      land in the same stored value, so nothing downstream knows which.

      Rebuilt as yaw+pitch rather than rotated incrementally: turning is
      `node.rotate(UP)` accumulating into the quaternion, so the yaw is read
      back out of it and re-composed with the pitch. Incremental pitching would
      drift and eventually roll.
      */
      const headCam = this.owner?.scene.activeCamera
      if (this._swimming && this.xrStuff && headCam != null) {
        const look = headCam.getDirection(LOCAL_FORWARD)
        this._swimAim = aimFromLook(look.y)
      } else if (this._swimming) {
        /*
        The aim IS the look now, rather than a second thing integrated from the
        same stick. That makes "swim where you are looking" literally true on a
        flat screen, and it is the same rule the headset already followed — the
        head there, the camera here, one source of truth either way.

        Sign: `_lookPitch` is positive UP (it raises the view), and swim aim is
        positive DOWN to match the quaternion. Hence the negation, once, here.
        */
        this._swimAim = clampAim(-this._lookPitch, attrs.maxLookPitch)
      }
      /*
      You cannot swim up out of water, and trying is not merely useless — the
      stroke fights the surface and the body porpoises. Cap the UPWARD aim by
      how deep the head is: none at the surface, full once properly under.
      Downward is never capped, so diving always works.
      */
      if (this._swimming) {
        const up = surfaceAimLimit(headDepth, attrs.maxLookPitch)
        if (this._swimAim < -up) this._swimAim = -up
      }
      const target = aimTarget(this._swimming, this._swimAim)
      this._swimPitch = easeAim(this._swimPitch, target, dt)
      const pitched = Math.abs(this._swimPitch) > 0.01
      if (pitched || this._swimWasPitched) {
        /*
        DO NOT READ THE YAW BACK OUT OF A PITCHED MATRIX.

        `atan2(forward.x, forward.z)` is fine while level and ill-conditioned
        while pitched: at 70° the forward vector's horizontal part is scaled by
        `cos 70° = 0.34`, so x and z collapse toward zero and the recovered yaw
        gets noisy — then it is written straight back, so the noise compounds
        into a body that wanders or spins. You only reach it by pitching AND
        turning at once, which is one stick on a controller and two hands on a
        keyboard, so it hid from every test I ran ("this was happening with
        joystick").

        So the yaw is CAPTURED ONCE from the level matrix, on the frame the
        pitch starts, and integrated from the turn input after that. Well
        conditioned by construction: the only reading happens while level.
        */
        if (!this._swimWasPitched) {
          node.computeWorldMatrix(true)
          node.getDirectionToRef(LOCAL_FORWARD, _fwdScratch)
          this._bodyYaw = Math.atan2(_fwdScratch.x, _fwdScratch.z)
        } else {
          this._bodyYaw += rotation * dt * attrs.turnSpeed * DEG_TO_RAD
        }
        this._swimWasPitched = pitched
        const yaw = this._bodyYaw
        /*
        THE `__root__` MIRROR FLIPS THE PITCH SIGN.

        A glTF root arrives with `scaling.z = -1` — the handedness mirror. The
        scale is applied in LOCAL space, so world forward is `-(R·ẑ)`, and the
        y component comes out `+sin(pitch)` where a clean node gives `-sin`.
        Aiming down therefore swam the character UP, measured: aim +70°, world
        forward.y +0.94, and a 12.9 m ASCENT.

        Two things fall out, and only one of them is a bug:

        - The pitch needs the mirror applied. Hence `zSign`, read from the node
          rather than hard-coded, so a canonicalised (unmirrored) root is right
          too — `canonicalize` strips this exact mirror, and the biped's load
          path does not go through it.
        - The YAW is fine untouched, which is why turning never looked wrong.
          The mirror also turns the yaw by π, but it is read back OUT of the
          same mirrored matrix a line above, so it round-trips exactly.

        Verified against a clean node in the same scene rather than reasoned
        about: identical quaternion, opposite sign.
        */
        const zSign = node.scaling.z < 0 ? -1 : 1
        /*
        THE YAW NEEDS THE MIRROR TOO, and I got this wrong the first time.

        With `scaling.z = -1` the world forward is `-(R·ẑ)`, so reading it back
        gives `θ + π`. I argued that writing that value returned the same
        heading — it does not. Writing `Ryaw(θ + π)` yields a forward of
        `-(R'·ẑ) = -F`: the body faces exactly backwards. On land nothing
        rewrites the quaternion, so it never showed; the instant pitch engages —
        which is the instant you enter water — the character flips. Reported as
        "when I enter the water my direction gets flipped".

        So the same π that the read introduced is removed on the write. Both
        halves of the mirror are now accounted for: π on the yaw, a sign on the
        pitch.
        */
        node.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
          yaw + (zSign < 0 ? Math.PI : 0),
          (this._swimPitch * zSign * Math.PI) / 180,
          0
        )
      }

      // Void-catch backstop: never sink below groundY, so a biped can't fall forever
      // when a scene has no collidable ground at all. Default is DEEP (see
      // initAttributes) so it doesn't act as an invisible floor over sub-zero terrain
      // or water — real collidable surfaces above it ground the biped via the probe.
      if (node.position.y < attrs.groundY) node.position.y = attrs.groundY

      if (this._swimming) {
        // Moving = swim, holding station = tread water. Both are in the standard
        // animation set (`swim`, `tread-water`), so this is wiring, not art.
        if (Math.abs(speed) > 0.1) {
          this.setAnimationState('swim', Math.abs(speed) + 0.25)
        } else {
          this.setAnimationState('tread-water')
        }
      } else if (this._airPhase != null) {
        /*
        Three clips, each for as long as it is true — not one clip stretched to
        fit. `Jump_Start` plays out, `Jump_Loop` covers however long the arc
        actually lasts, and `Jump_Land` plays on touchdown. That retires the
        `speedRatio` retiming, which existed only because a single clip had to
        span a flight whose duration it could not know.
        */
        const want =
          this._airPhase === 'start'
            ? this._jumpClip
            : this._airPhase === 'loop'
            ? 'jumpLoop'
            : 'jumpLand'
        const has = this.animationStates.some((st) => st.name === want)
        this.setAnimationState(has ? want : this._jumpClip)
      } else if (Math.abs(strafe) > 0.1 && Math.abs(strafe) > Math.abs(speed)) {
        /*
        SIDESTEPPING HAS ITS OWN CLIPS — use them.

        Playing the forward walk while moving sideways is the slide Tonio
        reported, and it is not a missing-asset problem: UAL ships a full
        eight-way set (Fwd, Fwd_L/R, Left, Right, Bwd, Bwd_L/R) for jog, crouch
        AND crawl. This picks the lateral one when sideways motion dominates.

        Guarded by `hasState`, because a rig without these clips must degrade to
        walking rather than to `setAnimationState` logging an error every frame.
        */
        const side = strafe > 0 ? 'Right' : 'Left'
        const want = this._sneaking ? `sneak${side}` : `strafe${side}`
        const speedScale = Math.abs(strafe) + 0.25
        if (this.animationStates.some((st) => st.name === want)) {
          this.setAnimationState(want, speedScale)
        } else {
          this.setAnimationState(this._sneaking ? 'sneak' : 'walk', speedScale)
        }
      } else if (this._sneaking && Math.abs(speed) > 0.1) {
        this.setAnimationState('sneak', Math.abs(speed) + 0.25)
      } else if (speed > 0.1) {
        if (sprintSpeed > 0.25) {
          this.setAnimationState('run', sprintSpeed + 0.25)
        } else {
          this.setAnimationState('walk', speed + 0.25)
        }
      } else if (speed < -0.1) {
        this.setAnimationState('walkBackwards', Math.abs(speed) + 0.25)
      } else if (
        this._sneaking &&
        this.animationStates.some((st) => st.name === 'sneakIdle')
      ) {
        // A crouch that HOLDS at rest — the stock rig had no such clip, so
        // standing still while sneaking used to stand you up.
        this.setAnimationState('sneakIdle')
      } else if (Math.abs(rotation) > 0.1) {
        this.setAnimationState('walk', Math.abs(rotation * 0.5) + 0.25)
      } else {
        this.setAnimationState('idle')
      }
    }
  }

  private setupXRInput(xr: BABYLON.WebXRDefaultExperience) {
    const controllerMap = xrControllers(xr)
    this.xrInputProvider = new XRInputProvider(controllerMap)
    // Add XR input to the composite provider
    if (this.inputProvider instanceof CompositeInputProvider) {
      this.inputProvider.add(this.xrInputProvider)
    }
  }

  async setupXRCamera() {
    if (this.owner == null) return
    const scene = this.owner.scene
    const mode = 'immersive-vr'

    if (navigator.xr == null) throw new Error('xr is not available')
    if (!(await navigator.xr.isSessionSupported(mode))) {
      throw new Error(`navigator.xr does not support requested mode "${mode}"`)
    }

    // Create XR experience first
    const xr = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: mode },
    })

    // Register controller observables BEFORE entering XR so we catch controller connect events
    this.setupXRInput(xr)

    // Now enter XR
    const { baseExperience } = xr
    const { camera } = baseExperience
    camera.name = (this as any).cameraType
    await baseExperience.enterXRAsync(mode, 'local-floor')

    this.xrStuff = {
      camera,
      xr,
      async exitXR() {
        await baseExperience.exitXRAsync()
      },
    }
    this.camera = camera
    this.owner.xrActive = true

    // Disable all default XR movement so we control it
    if (xr.teleportation) {
      xr.teleportation.dispose()
    }
    try {
      baseExperience.featuresManager.disableFeature(
        BABYLON.WebXRFeatureName.MOVEMENT
      )
    } catch (_) {
      // Feature may not be enabled
    }

    // Parent the XR camera to a container so we can move/rotate the rig
    // without fighting head tracking (head tracking applies as local transform on top)
    const camRig = new BABYLON.TransformNode('xr-rig', this.owner.scene)
    baseExperience.camera.parent = camRig

    let lastTime = Date.now()
    let yawOffset = 0 // correction between XR reference space and Babylon world
    let currentYaw = 0
    const currentPos = new BABYLON.Vector3()
    let firstFrame = true

    baseExperience.sessionManager.onXRFrameObservable.add(() => {
      if (!this.entries) return
      const now = Date.now()
      const dt = Math.min((now - lastTime) * 0.001, 0.1)
      lastTime = now

      const node = this.entries.rootNodes[0] as BABYLON.Mesh

      // Zoom: 0 = (1 back, 1 up), 1 = (5 back, 2 up), default 0.25 = (2 back, 1.25 up)
      const backDist = lerp(1, 5, this.xrCamZoom)
      const upDist = lerp(1, 2, this.xrCamZoom)

      /*
      VERTICAL LOOK HAS TO MOVE THE RIG IN XR, because there is nothing else for
      it to move. Flat, `lookY` tilts the FollowCamera via `heightOffset`; in a
      headset there is no FollowCamera, so it did nothing — Tonio, from the
      goggles: *"the right stick isn't tilting the view vertically any more,
      only rotating the character horizontally."*

      A regression I caused. The XR rig's height comes from `xrCamZoom`, which
      the right stick used to drive; moving zoom onto the D-pad left the axis
      free for `lookY`, and XR controllers have no D-pad — so the headset lost
      both the zoom and the tilt in one move.

      Same formula as flat so the two feel alike: raising the view lifts the rig
      and looks down on the character. Clamped, because `tan` runs away near the
      70° limit and the flat version is bounded by a shorter camera arm.
      */
      const lookLift = Math.max(
        -1.5,
        Math.min(
          6,
          Math.tan((-this._lookPitch * Math.PI) / 180) * backDist * 0.6
        )
      )

      // Target position: behind and above the character
      const behind = node.forward.scale(-backDist)
      const targetX = node.position.x + behind.x
      const targetY = node.position.y + upDist + lookLift
      const targetZ = node.position.z + behind.z

      // Target yaw: face same direction as character
      const fwd = node.forward
      const targetYaw = Math.atan2(fwd.x, fwd.z)

      // On first frame, compute offset between where headset faces and where
      // it should face (character direction).
      if (firstFrame) {
        firstFrame = false
        let headWorldYaw = 0
        if (baseExperience.camera.rotationQuaternion) {
          headWorldYaw =
            baseExperience.camera.rotationQuaternion.toEulerAngles().y
        }
        yawOffset = headWorldYaw
        currentYaw = targetYaw - yawOffset
      }

      const adjustedTargetYaw = targetYaw - yawOffset
      const t = Math.min(1, 2 * dt)

      currentPos.x = lerp(currentPos.x, targetX, t)
      currentPos.y = lerp(currentPos.y, targetY, t)
      currentPos.z = lerp(currentPos.z, targetZ, t)

      let yawDiff = adjustedTargetYaw - currentYaw
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      currentYaw += yawDiff * t

      // Set rig transform, compensating for camera's local offset from head tracking
      const camLocal = baseExperience.camera.position
      const yawQuat = BABYLON.Quaternion.RotationYawPitchRoll(currentYaw, 0, 0)
      const rotatedLocal = new BABYLON.Vector3()
      BABYLON.Vector3.TransformCoordinatesToRef(
        camLocal,
        BABYLON.Matrix.FromQuaternionToRef(yawQuat, BABYLON.Matrix.Identity()),
        rotatedLocal
      )
      camRig.position.set(
        currentPos.x - rotatedLocal.x,
        currentPos.y - rotatedLocal.y,
        currentPos.z - rotatedLocal.z
      )
      camRig.rotationQuaternion = yawQuat
    })
  }

  async setupFollowCamera() {
    if (this.owner == null || this.entries == null) return
    if (this.xrStuff) {
      await this.xrStuff.exitXR()
      this.owner.xrActive = false
      this.xrStuff = undefined
      this.xrInputProvider = undefined
      // Remove XR provider from composite
      if (this.inputProvider instanceof CompositeInputProvider) {
        for (const p of this.inputProvider.providers) {
          if (p instanceof XRInputProvider) {
            this.inputProvider.remove(p)
            break
          }
        }
      }
    }
    const attrs = this as any
    // Target a point at chest height so the character is centered in frame
    const root = this.entries.rootNodes[0] as BABYLON.Mesh
    const cameraTarget = new BABYLON.TransformNode(
      'camera-target',
      this.owner.scene
    )
    cameraTarget.parent = root
    cameraTarget.position.y = attrs.cameraTargetHeight

    // Named to match cameraType so the render() camera-check is stable (it
    // recreates when this.camera.name !== cameraType).
    const followCamera = new BABYLON.FollowCamera(
      attrs.cameraType,
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    followCamera.radius = 5
    followCamera.heightOffset = attrs.cameraHeightOffset
    followCamera.rotationOffset = 180
    followCamera.lockedTarget = cameraTarget as any
    this.camera = followCamera

    // First-person camera — parented to the ROOT (not the head bone, which would
    // inherit animation bob and be nauseating), at eye height, looking forward.
    const fpv = new BABYLON.FreeCamera(
      'biped-fpv',
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    fpv.parent = root
    fpv.position = new BABYLON.Vector3(0, attrs.eyeHeight, 0.15)
    fpv.rotation = BABYLON.Vector3.Zero()
    fpv.minZ = 0.06 // the head mesh is hidden in fpv, so only a small near plane
    this.fpvCamera = fpv

    this.setCameraView(this.cameraView)
  }

  /** Toggle third-person ('chase') vs first-person ('fpv'). In VR the rig reads
   * cameraView; on flat we switch the active camera. Either way the body is
   * hidden in first-person so it isn't in your face (and can't run ahead of the
   * camera) — while still casting its shadow. */
  setCameraView(view: 'chase' | 'fpv') {
    this.cameraView = view
    this.setBodyHidden(view === 'fpv')
    if (this.owner?.xrActive) return // the XR rig handles the viewpoint in VR
    const cam = view === 'fpv' ? this.fpvCamera : this.camera
    if (cam != null && this.owner != null) {
      this.owner.setActiveCamera(cam, { attach: false })
    }
  }

  /** Hide the WHOLE biped in first-person (robust regardless of head-mesh names,
   * and it kills the body-running-ahead artefact), EXCEPT meshes whose name
   * contains `_fpv` — mark first-person hands/arms/tools that way to keep them.
   * Shadow casting is unaffected: Babylon's shadow generator renders its caster
   * list regardless of `isVisible`, so you still cast a full-body shadow. */
  private setBodyHidden(hidden: boolean) {
    if (hidden && this.hiddenBody.length === 0 && this.entries != null) {
      const root = this.entries.rootNodes[0] as BABYLON.Mesh
      this.hiddenBody = root
        .getChildMeshes()
        .filter((m) => !/_fpv/i.test(m.name))
    }
    for (const m of this.hiddenBody) m.isVisible = !hidden
  }

  connectedCallback() {
    super.connectedCallback()
    const attrs = this as any
    if (attrs.player) {
      // Check if we're inside an inputFocus manager (it will wire input for us)
      const focusManager = this.closest('tosi-b3d-input-focus')
      if (!focusManager) {
        // Legacy: direct child of gameController
        const gcEl = this.closest('tosi-game-controller')
        this.gameController = gcEl as unknown as GameController | undefined
        if (this.gameController) {
          const composite = new CompositeInputProvider(
            this.gameController.getInputProvider()
          )
          this.inputProvider = composite
        }
      }
    }
  }

  /** Swap the model's `skin` material albedo texture (Kenney characters are
   * textureless + reskinned by this PNG). Empty clears it. Matches materials named
   * ~`skin`, or all PBR materials if none is. */
  applySkin(url: string): void {
    if (this.entries == null || this.owner == null) return
    const scene = this.owner.scene
    const mats = new Set<BABYLON.PBRMaterial>()
    for (const n of this.entries.rootNodes) {
      for (const m of n.getChildMeshes()) {
        if (m.material instanceof BABYLON.PBRMaterial) mats.add(m.material)
      }
    }
    const named = [...mats].filter((m) => /skin/i.test(m.name))
    for (const mat of named.length ? named : [...mats]) {
      mat.albedoTexture?.dispose()
      mat.albedoTexture = url ? new BABYLON.Texture(url, scene) : null
      // Kenney character materials export as alphaMode MASK with base-color alpha 0
      // (an FBX-import artifact) → fully clipped/invisible. They're opaque, so force it.
      mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE
    }
  }

  private _equipped = new Map<string, BABYLON.InstantiatedEntries>()

  /**
   * Load an accessory GLB and attach it to a named rig bone (`Head`, `RightHand`,
   * `Hips`, …), replacing anything already on that bone. Kenney accessories are
   * origin-authored (their geometry sits at the origin, meant to be positioned BY
   * the bone), so parenting to the bone's node places + animates them correctly.
   */
  equip(boneName: string, url: string): void {
    if (this.entries == null || this.owner == null) return
    const scene = this.owner.scene
    const skeleton = this.entries.skeletons?.[0]
    this.unequip(boneName)
    this.loadAssetContainer(scene, url, (container) => {
      if (this.mesh == null) return // disposed while loading
      const e = container.instantiateModelsToScene(undefined, false, {
        doNotInstantiate: true,
      })
      const acc = e.rootNodes[0] as BABYLON.TransformNode
      const bone =
        skeleton?.bones.find(
          (b) => b.name.toLowerCase() === boneName.toLowerCase()
        ) ?? skeleton?.bones.find((b) => new RegExp(boneName, 'i').test(b.name))
      acc.parent = bone?.getTransformNode?.() ?? this.mesh
      this._equipped.set(boneName, e)
    })
  }

  /** Remove whatever is equipped on a bone. */
  unequip(boneName: string): void {
    const e = this._equipped.get(boneName)
    if (e != null) {
      e.dispose()
      this._equipped.delete(boneName)
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    if (attrs.url !== '' && !this.entries) {
      this.loadAssetContainer(scene, attrs.url, (container) => {
        this.entries = container.instantiateModelsToScene(undefined, false, {
          doNotInstantiate: true,
        })
        if (this.entries.rootNodes.length !== 1) {
          throw new Error(
            '<tosi-b3d-biped> expects a container with exactly one root node'
          )
        }
        const meshes = this.entries.rootNodes
          .map((node) => node.getChildMeshes())
          .flat()
        this.mesh = this.entries.rootNodes[0] as BABYLON.Mesh
        if (attrs.scale !== 1) this.mesh.scaling.setAll(attrs.scale)
        // Derive eye height from the model (after scaling, so it's the real size) so first-person sits at the head, not
        // the origin (the feet). ~0.93 of total height ≈ eye level. Used as a
        // fallback when there's no head node to anchor to.
        const bounds = this.mesh.getHierarchyBoundingVectors()
        const height = bounds.max.y - bounds.min.y
        ;(this as any).eyeHeight = height * 0.93
        this.chaseHeight = height * 1.5
        this.chaseDistance = height * 2.0
        // Find the head BONE node (e.g. `mixamorig:Head`) so first-person anchors
        // to the actual animated head — which moves forward when walking and down
        // when crouching. Exclude meshes so we get the animated joint, not the
        // (static) `head` mesh node.
        this.headNode =
          this.mesh
            .getChildTransformNodes(false)
            .find(
              (n) =>
                /head/i.test(n.name) && !(n instanceof BABYLON.AbstractMesh)
            ) ?? null
        /*
        THE COLLISION BODY STARTS A STEP ABOVE THE FEET.

        Its bottom used to sit exactly ON the feet, which was survivable only
        because the old ground check left the biped floating somewhere in a
        15 cm dead band — that float WAS the clearance. Snapping the feet onto
        the surface removed the float and, with it, the clearance: moving into
        rising ground embedded the ellipsoid in the slope, Babylon refused the
        move, and you stopped dead. Tonio: "you can get stuck on sloped
        surfaces."

        Raising the offset by `STEP_OFFSET` is the standard fix (it is Unity's
        Step Offset): the capsule ignores anything lower than a step, so a slope
        rising under you is not an obstacle, and the ground probe puts the feet
        on the surface afterwards. A wall is still a wall — the capsule above
        the step height is unchanged.

        Kept below `STEP_UP` (the probe's reach), so anything the body walks over
        is something the probe can then stand you on.
        */
        this.mesh.ellipsoid = new BABYLON.Vector3(0.3, 0.75, 0.3)
        this.mesh.ellipsoidOffset = new BABYLON.Vector3(
          0,
          0.75 + STEP_OFFSET,
          0
        )
        this.mesh.checkCollisions = true
        owner.register({ meshes })
        // Skin materials that export as alphaMode MASK + base-color alpha 0 (an FBX
        // artifact) render the character fully invisible; they're opaque, so fix it
        // whether or not a `skin` is applied.
        for (const mm of meshes) {
          const mat = (mm as BABYLON.AbstractMesh).material
          if (mat instanceof BABYLON.PBRMaterial && /skin/i.test(mat.name)) {
            mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE
          }
        }
        this.setAnimationState(attrs.initialState)
        if (attrs.skin) this.applySkin(attrs.skin)

        // If inputFocus wired input before GLB loaded, it may have been
        // cleared by a dispose/re-init cycle. Re-wire directly.
        if (attrs.player && this.inputProvider == null) {
          const focusManager = this.closest('tosi-b3d-input-focus') as any
          if (focusManager?.inputMappedProvider) {
            this.inputProvider = new CompositeInputProvider(
              focusManager.inputMappedProvider
            )
          }
        }

        this.lastUpdate = Date.now()
        scene.registerBeforeRender(this._update)
        this.queueRender()
      })
    }
  }

  sceneDispose() {
    if (this.fpvCamera) {
      this.fpvCamera.parent = null
      this.fpvCamera.dispose()
      this.fpvCamera = null
    }
    this.hiddenBody = []
    if (this.owner != null && this.entries) {
      this.owner.scene.unregisterBeforeRender(this._update)
      for (const node of this.entries.rootNodes) {
        node.dispose()
      }
      for (const skeleton of this.entries.skeletons) {
        skeleton.dispose()
      }
      for (const ag of this.entries.animationGroups) {
        ag.dispose()
      }
      this.entries = undefined
    }
    this.gameController = undefined
    this.inputProvider = null
    this.xrInputProvider = undefined
    super.sceneDispose()
  }

  render() {
    if (!this.owner) return
    super.render()
    if (this.entries == null) return
    const attrs = this as any
    if (attrs.animation !== '') {
      this.setAnimationState(attrs.animation, attrs.animationSpeed)
    } else if (this.animationGroup && attrs.animationSpeed !== undefined) {
      this.animationGroup.speedRatio = attrs.animationSpeed
    }
    if (this.camera == null || this.camera.name !== attrs.cameraType) {
      switch (attrs.cameraType) {
        case 'xr':
          this.setupXRCamera()
          break
        case 'follow':
          this.setupFollowCamera()
          break
        default:
          if (this.camera != null) {
            if (this.owner?.camera === this.camera) {
              this.owner.camera = undefined
            }
            this.camera.dispose()
            this.camera = undefined
          }
      }
    }
  }
}

export const b3dBiped = B3dBiped.elementCreator({ tag: 'tosi-b3d-biped' })
