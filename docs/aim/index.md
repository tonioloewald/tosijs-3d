# aim

**Where a character is pointing, as opposed to where it is facing.** Pure —
degrees and plain `{x, y, z}`, no Babylon — so the whole of walk-and-aim can be
tested without a rig.

This is the input half of layered animation. A bone mask decides *which bones*
the aim drives and [animation-layers](/animation-layers/) plays it; something still has to decide
*where the upper body is pointing*, and that is this. It serves the player's
look and an NPC's lead with the same code, which is the point: an NPC that aims
through the same slew limit as a player is one whose misses are legible.

## Demo — watch the shoulders lead and the feet follow

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
        orbitCam(el, { alphaDeg: 63, betaDeg: 41.3, radius: 12, target: [5, 0.9, 0] })

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

Here the band is not a fix for flicker, it is the behaviour, but it is the same
structure as the hysteresis in swimming and cover, and for the same reason. One
threshold would make a character snap round the instant you nudged the stick.

## Positive is RIGHT, and positive is DOWN

Yaw increases clockwise seen from above (matching `atan2(x, z)` and the biped's
own turn), pitch is positive nose-down (matching the biped's swim aim and
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
