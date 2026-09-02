/*#
# b3d-death

**Death needs an exit.** Without one, a crash is a dead end: the input manager stays welded
to the wreck, you go on "flying" a corpse, and the game is stuck. (`b3d-aircraft` used to
say as much on crash — _"Stays put until something resets it"_ — and nothing ever did.)

`<tosi-b3d-death>` is that exit. When the entity you're driving dies — flown into a hill, or
shot down — it:

1. **blows it up** and leaves **burning wreckage** where it happened;
2. **releases input focus** (you stop driving a corpse);
3. swings the camera into a **slow orbit around the wreck** — you watch the mistake you made;
4. after a beat, floats a **panel** with what to do next.

The panel is just widgets, so "what to do next" is entirely yours: `Respawn` is the default,
but a game can offer _Rewind_, _Spectate_, _Eject and walk_, _Quit to menu_ — whatever. It's
an in-scene SVG panel ([b3d-svg-plane](?b3d-svg-plane.ts)), so it works **flat and in VR**
with the same coordinate-based picking, and needs no DOM overlay.

## What it deliberately does NOT do

**It doesn't respawn you.** It calls the `respawn` callback you give it, because only the
game knows what a fresh life means: a new entity at a spawn point, a saved checkpoint, a
different aircraft. Death is a *systemic* fact; what happens next is a *game* decision, and
this component refuses to guess.

Prefer respawning as a **genuinely new entity** rather than teleport-and-reset. A death that
is secretly a reset is a lie the narrative layer would have to un-learn — the simulation
should really emit a death and really emit a spawn, because that's the stream a driver reads
(see `world-contract.ts`).

## Demo

**Fly it into the ground.** (W/S pitch, A/D bank, R/Q throttle.) Watch it burn, then press
Respawn on the floating panel.

```js
import { b3d, b3dAircraft, b3dDeath, b3dLibrary, b3dGround, b3dLight, b3dSun, b3dSkybox, gameController, inputFocus } from 'tosijs-3d'

const plane = () => b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 80, vtolSpeed: 6, maxSpeed: 50,
})

// A respawned aircraft is appended INSIDE the focus manager — it then announces itself
// (adoptIfVacant) once it's ready, and the manager takes it because it's driving nobody.
const focus = inputFocus(gameController(), plane())

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 9 }),
  b3dGround({ meshName: 'ground_nocast', width: 600, height: 600, color: '#6b7f5e' }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  b3dDeath({
    title: 'DOWN',
    respawn() {
      // A fresh aircraft — NOT a reset of the dead one. The sim really emits a death and
      // really emits a spawn, which is the stream a narrative driver reads.
      //
      // No need to tell the focus manager: a controllable ANNOUNCES itself when it's ready
      // (adoptIfVacant), and the manager takes it because it's driving nobody. Asking the
      // manager to re-scan here would find `player` still false — attributes aren't drained
      // until connectedCallback.
      focus.appendChild(plane())
    },
  }),
  focus,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `title` | `'DOWN'` | Heading on the panel |
| `delay` | `1.4` | Seconds between the bang and the panel (let the player watch it burn) |
| `orbitRadius` | `14` | Camera distance from the wreck |
| `orbitHeight` | `6` | Camera height above the wreck |
| `orbitSpeed` | `6` | Degrees/sec — slow. This is a moment, not a ride |
| `spectate` | `'orbit'` | `orbit` circles the wreck; `chase` freezes the third-person shot you died in (static). Flat only |
| `wreckage` | `'on'` | Explode + leave burning wreckage (`'off'` = just the panel) |
| `blastRadius` | `6` | Size of the fireball |

## Callbacks

| Prop | Description |
|------|-------------|
| `respawn` | What "Respawn" does. Without it, the button isn't offered |
| `choices` | `() => Widget3d[]` — replace the whole panel body (Respawn, Spectate, Quit …) |

> **Never name these `onFoo`** — `elementCreator()` binds any `on*` prop as a DOM event
> listener, so `onRespawn` would silently become `addEventListener('respawn')` and never
> fire. (See CLAUDE.md.)
*/
/*{ "parent": "World Sim" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta, collidable } from './b3d-utils'
import { spawnPrefab, type Prefab } from './prefab'
import { explosionFx } from './b3d-warhead'
import { panel3d, label3d, button3d, type Widget3d } from './widgets3d'
import { panelFitWidth } from './widgets3d-layout'
import { b3dSvgPlane, type B3dSvgPlane } from './b3d-svg-plane'
import { newWreckFall, wreckFallStep, type WreckFallState } from './wreck-fall'
import type { B3d } from './tosi-b3d'
import type { B3dInputFocus } from './b3d-input-focus'
import type { B3dControllable } from './b3d-controllable'

const DEG = Math.PI / 180

/** A soft round dot for the wreck fire/smoke. A ParticleSystem with NO particleTexture emits
 * nothing (it silently produced zero particles — that was the "lost explosion"), so it needs one. */
function sootDot(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const existing = scene.getTextureByName?.('wreck-dot')
  if (existing) return existing as BABYLON.DynamicTexture
  const tex = new BABYLON.DynamicTexture(
    'wreck-dot',
    { width: 64, height: 64 },
    scene,
    false
  )
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  tex.update()
  tex.hasAlpha = true
  return tex
}

export class B3dDeath extends B3dChild {
  static preferredTagName = 'tosi-b3d-death'

  static initAttributes = {
    title: 'DOWN',
    delay: 1.4,
    orbitRadius: 14,
    orbitHeight: 6,
    orbitSpeed: 6,
    // Spectator shot (flat only). `orbit` circles the wreck. `chase` FREEZES the third-person
    // view you died in (an aircraft pops to chase on crash) into a static held shot — no circling.
    spectate: 'orbit' as 'orbit' | 'chase',
    wreckage: 'on' as 'on' | 'off',
    blastRadius: 6,
  }

  declare title: string
  declare delay: number
  declare orbitRadius: number
  declare orbitHeight: number
  declare orbitSpeed: number
  declare spectate: 'orbit' | 'chase'
  declare wreckage: 'on' | 'off'
  declare blastRadius: number

  /** What "Respawn" does. No callback ⇒ no Respawn button (the game may not allow one). */
  respawn: (() => void) | null = null
  /** Replace the panel body entirely: Rewind, Spectate, Eject, Quit — whatever the game has. */
  choices: (() => Widget3d[]) | null = null
  /** What to leave at the crash site — a [prefab](?prefab.ts) name or factory. Overrides the
   * built-in fire + smoke, so a game can drop a proper wreck model, a crater, a rescue
   * beacon. Cleared when you respawn, along with the built-in burn. */
  remains: string | Prefab | null = null

  /** True from the bang until the player picks something. */
  get dying(): boolean {
    return this._dying
  }

  private _dying = false
  private _warnedNoWayBack = false
  private _wreck: B3dControllable | null = null
  private _remains: Element[] = []
  private _orbitCam: BABYLON.Camera | null = null
  private _prevCam: BABYLON.Camera | null = null
  private _panel: B3dSvgPlane | null = null
  private _fires: BABYLON.ParticleSystem[] = []
  private _charMats: BABYLON.Material[] = []
  private _obs: BABYLON.Observer<BABYLON.Scene> | null = null
  /** The falling wreck, while it is still in the air. */
  private _fall: WreckFallState | null = null
  private _offOrigin: (() => void) | null = null
  private _fallObs: BABYLON.Observer<BABYLON.Scene> | null = null
  private _fallRay = new BABYLON.Ray(
    BABYLON.Vector3.Zero(),
    BABYLON.Vector3.Down(),
    2000
  )
  private _timer: ReturnType<typeof setTimeout> | null = null
  private _onDeath = (e: Event) => this._handleDeath(e)

  sceneReady(owner: B3d) {
    // Both ways a pilot dies: flown into terrain (`crash`) and shot down (`destroyed`).
    // Both bubble, so listen once on the scene rather than chasing entities around.
    owner.addEventListener('crash', this._onDeath)
    owner.addEventListener('destroyed', this._onDeath)
  }

  sceneDispose() {
    const owner = this.owner
    if (owner) {
      owner.removeEventListener('crash', this._onDeath)
      owner.removeEventListener('destroyed', this._onDeath)
    }
    this._cleanup()
  }

  private get focusManager(): B3dInputFocus | null {
    return (
      (this.owner?.querySelector('tosi-b3d-input-focus') as B3dInputFocus) ??
      null
    )
  }

  private _handleDeath(e: Event): void {
    const focus = this.focusManager
    const driven = focus?.focused ?? null

    /*
    RELEVANCE FIRST, RECOVERY SECOND. This order is the fix for #25.

    The "only OUR death matters" filter has to run before the already-dying
    recovery, or ANY other entity dying while the player is dead tears the panel
    down. Mutual death — ram an enemy and you both die — produced no death panel
    at all, because the enemy's `destroyed` event arrived a frame later, was read
    as "the run moved on", and called resume(). Reported by manta-recon, and it
    was my own recovery patch from the day before.
    */
    if (driven == null || !(e.target as Node)?.contains?.(driven)) {
      if (e.target !== driven) return
    }

    if (this._dying) {
      /*
      ALREADY DEAD — unless something ELSE we drive just died, which means the
      game got back on its feet without us.

      `_dying` is only cleared by `resume()`, which only the panel's Respawn
      button calls — and that button doesn't exist unless a `respawn` callback
      was supplied. So a scene that respawns by its own route leaves this
      component latched forever and swallows every later death: no panel, no
      release, welded to the wreck. (Found by manta-recon crashing a respawned
      aircraft, 0.7.0.)

      Note this is now reached only for a death of the DRIVEN entity, so "a
      different entity" here means "the thing we are driving is not the wreck we
      are holding" — a respawned craft that has since crashed.
      */
      const wreck = this._wreck as unknown as Node | null
      const target = e.target as Node | null
      if (wreck == null || target == null) return
      if (target === wreck || target.contains?.(wreck)) return
      console.warn(
        'b3d-death: a new death arrived while still dying — the run respawned without calling resume() (no `respawn` callback?). Recovering.'
      )
      this.resume()
    }
    this.die(driven)
  }

  /** Kill the run. Public so a game can trigger a death that isn't a crash or a hit. */
  die(entity: B3dControllable | null): void {
    if (this._dying || this.owner == null) return
    this._dying = true
    this._wreck = entity
    const scene = this.owner.scene

    // The wreck NODE via getCameraTarget(), not `entity.mesh` — a LIBRARY-loaded controllable
    // (scout instance) has a TransformNode root, so `mesh` is null and everything (explosion,
    // fire, spectator camera) would land at the fallback (the old camera position) behind the
    // plane, off-screen. getCameraTarget() returns the real node for both mesh and library paths.
    const node =
      (entity?.getCameraTarget?.() as BABYLON.TransformNode | null) ?? null
    const at = node
      ? node.getAbsolutePosition().clone()
      : scene.activeCamera?.globalPosition.clone() ?? BABYLON.Vector3.Zero()

    // 1. The bang, and something that goes on burning while you look at it.
    //
    // COSMETICS CANNOT BLOCK THE EXIT. This component exists so death isn't a
    // dead end; if the spectacle throws, the release-focus / spectate / panel
    // steps below MUST still run. (Real case, 2026-08-11: charring the wreck
    // cloned a material carrying an unregistered plugin, Babylon threw, and
    // the player was left welded to a burning wreck with no panel — the exact
    // failure this component was written to prevent, reintroduced through its
    // own fireworks.)
    if (this.wreckage !== 'off') {
      try {
        explosionFx(scene, at, this.blastRadius)
        if (this.remains != null) {
          this._remains = spawnPrefab(this.remains, {
            owner: this.owner,
            position: { x: at.x, y: at.y, z: at.z },
            velocity: (entity as any)?.velocity ?? undefined,
            source: entity,
          })
        } else {
          this._burn(scene, node, at)
        }
        this._startFall(scene, node, entity)
      } catch (err) {
        console.warn('b3d-death: wreckage FX failed (exit continues)', err)
      }
    }

    /*
    2. Stop driving the corpse — and TELL it that it is one.

    `releaseFocus()` already stops a focus-managed entity, but incidentally: it
    nulls `inputProvider` and `_update` short-circuits on that. `halt()` says it
    outright, and covers a `die()` handed an entity the focus manager never held
    (a scripted death, an AI, a test), which nothing else would stop.

    Order matters: `_startFall` above has already read the velocity it died
    with.
    */
    this.focusManager?.releaseFocus()
    entity?.halt?.()

    // 3. Orbit the mistake you made — FLAT ONLY. `setGameplayCamera` is a no-op in a headset (the
    //    WebXR camera owns the view; swapping it blanks the display), and returns false so we skip
    //    building the orbit rig entirely. In VR you keep your head where it is and the Respawn
    //    panel comes to you (pinned to the rig — see _showPanel).
    this._prevCam = scene.activeCamera
    try {
      let cam: BABYLON.Camera
      let orbit: BABYLON.ArcRotateCamera | null = null
      if (this.spectate === 'chase') {
        // A held third-person shot of the WRECK: behind and above it, looking at it. Positioned from
        // the wreck, NOT from the dead aircraft's chase camera — that camera's globalPosition
        // collapses onto the wreck at the crash frame (its follow pivot updates AFTER the crash
        // event fires), which put the camera inside the wreck looking at itself. This is reliable.
        const fwd = node?.forward.clone() ?? new BABYLON.Vector3(0, 0, 1)
        fwd.y = 0
        if (fwd.lengthSquared() < 1e-4) fwd.set(0, 0, 1)
        fwd.normalize()
        const pos = at.subtract(fwd.scale(this.orbitRadius * 0.7))
        pos.y = at.y + this.orbitHeight
        const fc = new BABYLON.FreeCamera('death-chase', pos, scene)
        fc.setTarget(at)
        cam = fc
      } else {
        orbit = new BABYLON.ArcRotateCamera(
          'death-orbit',
          -Math.PI / 2,
          Math.PI / 2.6,
          this.orbitRadius,
          at.add(new BABYLON.Vector3(0, this.orbitHeight * 0.35, 0)),
          scene
        )
        orbit.lowerRadiusLimit = orbit.upperRadiusLimit = this.orbitRadius
        cam = orbit
      }
      // NOT attached to the canvas: the Respawn panel is IN THE SCENE, so a tap
      // on it is also a tap on the canvas, and an attached camera handles it
      // too — the same fight the pause panel had, where a press read as a zoom
      // and moved the panel out of reach. The orbit still runs (it's driven by
      // the observable below, not by input); you just can't wrestle it.
      if (this.owner.setGameplayCamera(cam, { attach: false })) {
        this._orbitCam = cam
        if (orbit != null) {
          // Slow. This is a moment, not a ride.
          this._obs = scene.onBeforeRenderObservable.add(() => {
            orbit!.alpha += this.orbitSpeed * DEG * sceneDelta(scene)
          })
        }
      } else {
        cam.dispose() // XR: no flat camera needed
        this._prevCam = null
      }
    } catch (err) {
      console.warn('b3d-death: spectate camera failed (exit continues)', err)
    }

    /*
    SURVIVE A FLOATING-ORIGIN REBASE.

    Terrain rebases the world periodically (see B3d.shiftOrigin), and everything
    holding a WORLD position has to opt in or it is silently left behind. Death
    holds three: the spectate camera (position AND target), the fire emitters,
    and the fall's cached ground-sample point.

    Nothing here was registered, so in a terrain scene a rebase mid-death moved
    the world out from under the shot — the camera left pointing at where the
    crash used to be. That is the same FAMILY of symptom as the origin-teleport
    fixed above and would read identically ("the wreck is way off, I am looking
    at nothing"), which is exactly why it is worth closing rather than waiting
    to see it: two causes producing one description is how a fixed bug looks
    unfixed.

    A LISTENER, not `registerWorldRoot`: a camera is not a TransformNode we own,
    and the emitters are plain vectors. Per CLAUDE.md, anything holding world
    coordinates in JS fixes ITSELF and must not also register a root.

    The wreck NODE needs nothing — `_startFall` reads its position from the node
    every frame and writes it back, so a shift is absorbed. That was written for
    a different reason and pays off here.
    */
    this.owner.addOriginListener(this._shiftOrigin)
    this._offOrigin = () => this.owner?.removeOriginListener(this._shiftOrigin)

    // 4. A beat to watch it burn, THEN the panel. Offering a menu over a fireball reads
    //    as a bug report rather than a death.
    this._timer = setTimeout(() => this._showPanel(), this.delay * 1000)
  }

  /**
   * DEAD THINGS FALL.
   *
   * A wreck used to stop where it died, so a kill at altitude left a charred
   * airframe hanging in the sky — and, because it is still solid, waiting to be
   * flown into. Tonio, from a headset: _"I collided with wreckage high up … the
   * wrecked plane hanging in mid-air (it should really tumble to the ground)."_
   *
   * The rules are pure and tested in [[wreck-fall]]; this is the Babylon side:
   * sample the ground, step the model, carry the node, the fires and the
   * spectate camera down with it.
   *
   * **Position is read from the NODE each frame and written back**, rather than
   * held in JS across frames. A floating-origin rebase moves the node, and a
   * model holding a world position would keep flying the wreck to where the
   * world used to be.
   */
  private _startFall(
    scene: BABYLON.Scene,
    node: BABYLON.TransformNode | null,
    entity: B3dControllable | null
  ): void {
    if (node == null) return
    const vel = entity?.getWorldVelocity?.() ?? null
    // Own meshes never count as ground — a wreck must not land on its own wing.
    const own = new Set<BABYLON.AbstractMesh>()
    if (node instanceof BABYLON.AbstractMesh) own.add(node)
    for (const child of node.getChildMeshes()) own.add(child)
    const skip = collidable((m) => own.has(m))

    /*
    HOW you died decides how far the wreck goes.

    Flying into something is an inelastic collision and eats most of the energy;
    being shot down leaves you with all of it, still moving, now on fire. Only
    this side knows which happened — `crashed` is set by the airframe's own
    impact test — so the pure model takes it as a number and this makes the call.

    Without it a crash at 90 m/s from 130 m carried the wreck ~450 m downrange:
    a glide, not a crash, and it dragged the spectate camera across that much
    terrain with it.
    */
    const impact =
      (entity as unknown as { crashed?: boolean })?.crashed === true
    const carry = impact ? 0.25 : 0.7

    const start = node.getAbsolutePosition()
    // Nothing under it is a real case — the edge of a finite ground plane, a
    // kill out over open water in a scene with no sea floor. Without a floor
    // the wreck falls forever, the spectate camera chases it down forever, and
    // the observer never comes off. Found by killing at z≈1690 in a demo whose
    // ground is 600 m across: it reached y = −25 and kept going.
    const abandonY = start.y - 1500
    this._fall = newWreckFall(
      { x: start.x, y: start.y, z: start.z },
      vel ? { x: vel.x, y: vel.y, z: vel.z } : { x: 0, y: 0, z: 0 },
      { carry }
    )
    // Tumble about a FIXED world axis through the wreck: an airframe that has
    // stopped flying has no frame of its own worth preserving.
    const axis = new BABYLON.Vector3(
      this._fall.axis.x,
      this._fall.axis.y,
      this._fall.axis.z
    )
    const rest = node.rotationQuaternion
      ? node.rotationQuaternion.clone()
      : BABYLON.Quaternion.FromEulerVector(node.rotation)
    const spin = new BABYLON.Quaternion()
    let groundY = -Infinity // -Infinity means "never picked"
    let pickedAtX = 0
    let pickedAtZ = 0
    this._fallShift = (dx, dz) => {
      pickedAtX += dx
      pickedAtZ += dz
    }

    this._fallObs = scene.onBeforeRenderObservable.add(() => {
      const fall = this._fall
      if (fall == null || node.isDisposed()) return
      const dt = sceneDelta(scene)
      if (dt <= 0) return

      // Node → model, so an origin shift is absorbed (see the note above).
      const here = node.getAbsolutePosition()
      fall.pos.x = here.x
      fall.pos.y = here.y
      fall.pos.z = here.z

      /*
      RE-PICK ONLY WHEN THE ANSWER CAN HAVE CHANGED.

      `scene.pickWithRay` walks every pickable mesh and does a full triangle
      intersection on each one whose bounding box the ray enters. A vertical ray
      through a terrain scene enters several tiles of tens of thousands of
      triangles each, so this is milliseconds, not microseconds — and running it
      per frame for the seconds a wreck takes to fall is the likeliest source of
      "the world hung before the plane stopped flying" (Tonio, VR). It fits the
      other half of that report too: pressing Respawn before the hang avoids it,
      and Respawn is what takes this observer off.

      The ground under a wreck falling STRAIGHT DOWN does not change at all, so
      the whole descent needs one pick. Re-pick when it has drifted sideways far
      enough to be over something else, or when it is close enough that being
      wrong matters.
      */
      const movedX = here.x - pickedAtX
      const movedZ = here.z - pickedAtZ
      if (
        groundY === -Infinity ||
        movedX * movedX + movedZ * movedZ > 64 || // 8 m sideways
        here.y - groundY < 60
      ) {
        pickedAtX = here.x
        pickedAtZ = here.z
        this._fallRay.origin.copyFromFloats(here.x, here.y + 1, here.z)
        this._fallRay.direction.copyFromFloats(0, -1, 0)
        const hit = scene.pickWithRay(this._fallRay, skip)
        groundY = hit?.hit ? here.y + 1 - hit.distance : -Infinity
        // Nothing under it. Re-picking every frame will not conjure ground, and
        // the abandon guard below ends it — so stop asking.
        if (groundY === -Infinity) {
          pickedAtX = here.x
          pickedAtZ = here.z
          groundY = -1e9
        }
      }

      const { impacted } = wreckFallStep(fall, groundY, dt)
      node.position.copyFromFloats(fall.pos.x, fall.pos.y, fall.pos.z)
      BABYLON.Quaternion.RotationAxisToRef(axis, fall.angle, spin)
      node.rotationQuaternion = spin.multiply(rest)

      // The fires ride along — a smoke column left behind at the kill point,
      // with the wreck a hundred metres below it, is worse than no fire.
      for (const p of this._fires) {
        const e = p.emitter as BABYLON.Vector3 | null
        if (e && typeof (e as BABYLON.Vector3).copyFromFloats === 'function') {
          e.copyFromFloats(fall.pos.x, fall.pos.y, fall.pos.z)
        }
      }

      // And so does the shot: you are watching THIS, so keep it in frame.
      const cam = this._orbitCam
      if (cam instanceof BABYLON.ArcRotateCamera) {
        cam.target.copyFromFloats(
          fall.pos.x,
          fall.pos.y + this.orbitHeight * 0.35,
          fall.pos.z
        )
      } else if (cam instanceof BABYLON.FreeCamera) {
        cam.setTarget(new BABYLON.Vector3(fall.pos.x, fall.pos.y, fall.pos.z))
      }

      if (impacted) {
        try {
          explosionFx(
            scene,
            new BABYLON.Vector3(fall.pos.x, fall.pos.y, fall.pos.z),
            this.blastRadius * 0.5
          )
        } catch {
          // Cosmetics never block the exit — same rule as the death FX above.
        }
      }
      if (fall.grounded || fall.pos.y < abandonY) {
        scene.onBeforeRenderObservable.remove(this._fallObs)
        this._fallObs = null
        this._fall = null
      }
    })
  }

  /** Move everything death holds in world space by a rebase. See `die()`. */
  private _shiftOrigin = (dx: number, dz: number): void => {
    const cam = this._orbitCam
    if (cam != null) {
      cam.position.x += dx
      cam.position.z += dz
      if (cam instanceof BABYLON.ArcRotateCamera) {
        cam.target.x += dx
        cam.target.z += dz
      }
    }
    for (const p of this._fires) {
      const e = p.emitter as BABYLON.Vector3 | null
      if (
        e &&
        typeof (e as BABYLON.Vector3).addInPlaceFromFloats === 'function'
      ) {
        e.addInPlaceFromFloats(dx, 0, dz)
      }
    }
    // The fall re-reads the node each frame, so only its cached sample point is
    // stale — shift it so the shift does not look like sideways drift and force
    // a needless re-pick.
    this._fallShift?.(dx, dz)
  }

  private _fallShift: ((dx: number, dz: number) => void) | null = null

  private _burn(
    scene: BABYLON.Scene,
    mesh: BABYLON.TransformNode | null,
    at: BABYLON.Vector3
  ): void {
    const fire = new BABYLON.ParticleSystem('wreck-fire', 220, scene)
    fire.particleTexture = sootDot(scene)
    fire.emitter = at.clone()
    fire.minEmitBox = new BABYLON.Vector3(-1, 0, -1)
    fire.maxEmitBox = new BABYLON.Vector3(1, 0.5, 1)
    fire.color1 = new BABYLON.Color4(1, 0.6, 0.1, 1)
    fire.color2 = new BABYLON.Color4(1, 0.2, 0, 1)
    fire.colorDead = new BABYLON.Color4(0.2, 0.1, 0.1, 0)
    fire.minSize = 0.6
    fire.maxSize = 2.2
    fire.minLifeTime = 0.3
    fire.maxLifeTime = 0.9
    fire.emitRate = 90
    fire.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
    fire.direction1 = new BABYLON.Vector3(-0.4, 3, -0.4)
    fire.direction2 = new BABYLON.Vector3(0.4, 5, 0.4)
    fire.gravity = new BABYLON.Vector3(0, 1.5, 0)
    fire.start()

    const smoke = new BABYLON.ParticleSystem('wreck-smoke', 160, scene)
    smoke.particleTexture = sootDot(scene)
    smoke.emitter = at.clone()
    smoke.minEmitBox = new BABYLON.Vector3(-0.8, 0.5, -0.8)
    smoke.maxEmitBox = new BABYLON.Vector3(0.8, 1, 0.8)
    smoke.color1 = new BABYLON.Color4(0.25, 0.25, 0.25, 0.7)
    smoke.color2 = new BABYLON.Color4(0.1, 0.1, 0.1, 0.5)
    smoke.colorDead = new BABYLON.Color4(0.05, 0.05, 0.05, 0)
    smoke.minSize = 1.5
    smoke.maxSize = 5
    smoke.minLifeTime = 1.4
    smoke.maxLifeTime = 3
    smoke.emitRate = 35
    smoke.direction1 = new BABYLON.Vector3(-0.6, 2, -0.6)
    smoke.direction2 = new BABYLON.Vector3(0.6, 3.5, 0.6)
    smoke.gravity = new BABYLON.Vector3(0, 0.6, 0)
    smoke.start()

    this._fires.push(fire, smoke)

    // Char the airframe. `mesh` may be a TransformNode (library instance) whose visible geometry
    // is its CHILDREN — char those, plus the node itself only if it carries geometry.
    //
    // CRUCIAL: char a CLONE of the material, never the material itself. Library instances share
    // one source material, so mutating it blackens every future spawn of this model (the wreck
    // burned and the respawned aircraft came out charcoal). The clones are tracked and disposed
    // with the rest of the burn on respawn.
    if (mesh) {
      const parts: BABYLON.AbstractMesh[] = mesh.getChildMeshes(false)
      if (mesh instanceof BABYLON.AbstractMesh) parts.push(mesh)
      for (const m of parts) {
        const mat = m.material as BABYLON.PBRMaterial | null
        if (mat && 'albedoColor' in mat) {
          const charred = mat.clone(
            `${mat.name}-charred`
          ) as BABYLON.PBRMaterial
          charred.albedoColor = new BABYLON.Color3(0.12, 0.1, 0.1)
          charred.metallic = 0.2
          charred.roughness = 0.9
          m.material = charred
          this._charMats.push(charred)
        }
      }
    }
  }

  private _showPanel(): void {
    if (!this._dying || this.owner == null) return
    if (
      this.respawn == null &&
      this.choices == null &&
      !this._warnedNoWayBack
    ) {
      this._warnedNoWayBack = true
      // The panel says "no way back" on purpose — only the game knows how to
      // respawn. But in the console it's worth saying that this latches the
      // death state until something calls `resume()`.
      console.warn(
        'b3d-death: no `respawn` callback and no `choices`, so the panel offers no way out. Set `deathEl.respawn = () => …` (it is a function, so it cannot be an HTML attribute).'
      )
    }
    const rows: Widget3d[] = this.choices
      ? this.choices()
      : [
          label3d({ text: this.title, bold: true }),
          ...(this.respawn
            ? [
                button3d({
                  label: 'Respawn',
                  onClick: () => this.resume(() => this.respawn?.()),
                }),
              ]
            : [label3d({ text: 'no way back', muted: true })]),
        ]

    const svgH = 46 + rows.length * 48
    const svg = panel3d({ width: 320, height: svgH }, ...rows)
    // In-scene, camera-relative: ONE panel that works flat AND in VR, with the same
    // coordinate-based picking. A DOM overlay would simply not exist in a headset.
    //
    // Width comes from the CAMERA, not a constant: 1.1 fits a monitor and
    // overflows a portrait phone, which puts the Respawn button off screen — at
    // the worst possible moment, since you have just crashed.
    const deathCam = this.owner.scene.activeCamera
    const width = panelFitWidth(
      (deathCam as BABYLON.FreeCamera)?.fov ?? 0.8,
      this.owner.scene.getEngine().getAspectRatio(deathCam as BABYLON.Camera) ||
        1.6,
      2.2,
      1.1
    )
    const plane = b3dSvgPlane({
      cameraRelative: true,
      /*
      WORLD-PLACED, and it follows you if you look away.

      Head-locking made it jiggle with a jostling death-cam; riding the body
      frame put it at knee height and terrain still swallowed it; drawing it on
      top made it untouchable. All three were compensating for the panel not
      being anywhere real. It now sits at a spot with clear line of sight and
      eases to a new one if you look away for ~2s — which also fixes the case
      none of the others could, dying in cockpit view with the camera INSIDE a
      hillside, where nothing "just in front of you" helps.
      */
      placement: 'world',
      width,
      height: width * (svgH / 320),
      z: 2.2,
      y: 0,
      resolution: 512,
      pointerEvents: 'on',
    }) as B3dSvgPlane
    // Hand it the widget panel BEFORE it mounts, so its first render has content.
    plane.svgElement = svg
    this._panel = plane
    this.owner.appendChild(plane)
  }

  /** Tear down the death state and hand control back — then run `next` (e.g. respawn). */
  resume(next?: () => void): void {
    this._cleanup()
    this._dying = false
    next?.()
  }

  private _cleanup(): void {
    // The wreck burns until you respawn — then it goes, along with its `player: true` flag
    // (otherwise the focus manager could pick the corpse as the player all over again).
    this._wreck?.remove()
    this._wreck = null
    for (const el of this._remains) el.remove()
    this._remains = []
    if (this._timer != null) clearTimeout(this._timer)
    this._timer = null
    const scene = this.owner?.scene
    if (scene && this._obs) scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    if (scene && this._fallObs)
      scene.onBeforeRenderObservable.remove(this._fallObs)
    this._fallObs = null
    this._fall = null
    this._fallShift = null
    this._offOrigin?.()
    this._offOrigin = null
    for (const p of this._fires) p.dispose()
    this._fires = []
    for (const mat of this._charMats) mat.dispose()
    this._charMats = []
    this._panel?.remove()
    this._panel = null
    // CAMERA HANDOFF. Do NOT restore `_prevCam`: that camera belonged to the aircraft we
    // just deleted, so restoring it points the scene at a corpse's disposed follow-cam.
    //
    // Instead: stop orbiting, but KEEP the orbit camera live and active until the respawned
    // entity claims the view. A controllable sets its own camera up when its mesh finishes
    // loading, which is a beat AFTER respawn is pressed — and a scene with no active camera
    // in between renders black. So we hold the shot, then dispose ourselves once someone
    // else has taken over.
    const cam = this._orbitCam
    this._orbitCam = null
    this._prevCam = null
    if (cam == null) return
    if (scene == null || scene.activeCamera !== cam) {
      cam.dispose()
      return
    }
    const handoff = scene.onActiveCameraChanged.add(() => {
      if (scene.activeCamera === cam) return // still us — keep holding
      scene.onActiveCameraChanged.remove(handoff)
      cam.dispose()
    })
  }
}

export const b3dDeath = B3dDeath.elementCreator() as (...args: unknown[]) => B3dDeath
