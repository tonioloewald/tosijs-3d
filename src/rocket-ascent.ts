/*#
# Rocket Ascent

**One continuous shot from the pad to vacuum.** A rocket lifts off, climbs
through the cloud deck, and keeps going until the air runs out and the stars
come through — with the camera holding station off its flank the whole way.

It exists because nothing else in this repo ever crosses more than one medium.
`b3d-water` contributes an underwater band, `b3d-clouds` a whiteout, and
`b3d-skybox` a fade to space; each is tested on its own and **the seams between
them are not**. A unit test cannot tell you that leaving a cloud at 900 m and
entering vacuum at 2 km reads as one continuous world rather than three effects
taking turns. Watching it can.

## Demo

```js
import { b3d, rocketAscent } from 'tosijs-3d'

preview.append(
  b3d({ style: 'width:100%;height:100%' }, ...rocketAscent())
)
```
```css
.preview { height: 100%; }
```

## What you are looking at

The whole ascent is ONE number — altitude — read by four things that never
speak to each other:

| altitude | what changes | who owns it |
| -------- | ------------ | ----------- |
| 0 m | lit by the sun, blue sky | `b3d-sun`, `b3d-skybox` |
| ~140 m | whiteout, then out the top | `b3d-clouds` |
| 500 m → 2.4 km | scattering falls away, sky darkens | `b3d-skybox` `spaceStart`/`spaceFull` |
| 2.4 km | vacuum: stars, no haze | the starfield, and the fog layer going to nothing |

None of that is sequenced. There is no timeline and no state machine — every
layer is a function of where the camera is, so flying back DOWN runs it all in
reverse for free, which is the property that would be lost by scripting it.

## No glow layer, deliberately

The first version of this demo set `glowLayerIntensity: 0.6` and it was a
mistake twice over. A `GlowLayer` hunts for emissive materials, and both the
starfield and the clouds' self-illumination are emissive: the stars bloomed into
each other until the whole frame went white, and the clouds turned into glowing
white lozenges that read as UFOs rather than weather.

The stars are now excluded from glow layers inside
[b3d-skybox](?b3d-skybox.ts) — that was a real bug and any adopter turning the
attribute on would have met it. The clouds are not, because there is nothing to
fix: bloom belongs to bright things IN the world, a muzzle flash or a corona,
and a cloud deck is not one.

## The rocket is four boxes and a sphere

Deliberately. The north star here is behavioural richness rather than
photorealism — _fidelity is a promise_, and a beautifully modelled rocket would
be promising a flight model this does not have. A toy that reads as a toy can
spend all of its credibility on the one thing it is actually demonstrating,
which is the sky.

## Attributes

`rocketAscent(options)` returns scene children to spread, like
[playground](?playground.ts) — so you can drop pieces or add your own.

| Option | Default | Description |
|--------|---------|-------------|
| `cloudAltitude` | `140` | Centre of the cloud deck (m) |
| `spaceStart` | `500` | Where the sky begins to fade (m) |
| `spaceFull` | `2400` | Full vacuum (m) |
| `apogee` | `3200` | Where it stops and resets (m) |
| `accel` | `9` | Net acceleration (m/s²) — thrust already minus gravity |
| `holdSeconds` | `2.5` | Pause on the pad, and again at apogee |
| `starfield` | `2500` | Background stars (see [b3d-skybox](?b3d-skybox.ts)) |
| `timeOfDay` | `14` | Broad daylight — so the stars appear because the AIR ran out, not because night fell |
*/
/*{ "parent": "Demos", "order": 20 }*/

import { b3dSkybox } from './b3d-skybox.js'
import { b3dSun } from './b3d-shadows.js'
import { b3dClouds } from './b3d-clouds.js'
import { b3dBox, b3dGround, b3dSphere } from './b3d-primitives.js'
import { b3dParticles } from './b3d-particles.js'
import { b3dController } from './b3d-controller.js'
import * as BABYLON from '@babylonjs/core'

export interface RocketAscentOptions {
  cloudAltitude?: number
  spaceStart?: number
  spaceFull?: number
  apogee?: number
  accel?: number
  holdSeconds?: number
  starfield?: number
  timeOfDay?: number
}

/**
 * The ascent, as scene children.
 *
 * Returns an array to be spread — same contract as `playground()`, and for the
 * same reason: the caller keeps control of ordering and can swap pieces out.
 */
export function rocketAscent(options: RocketAscentOptions = {}) {
  const cloudAltitude = options.cloudAltitude ?? 140
  const spaceStart = options.spaceStart ?? 500
  const spaceFull = options.spaceFull ?? 2400
  const apogee = options.apogee ?? 3200
  const accel = options.accel ?? 9
  const hold = options.holdSeconds ?? 2.5
  const starfield = options.starfield ?? 2500
  /*
  MID-AFTERNOON, not dusk. The first pass launched at 17:00 so the climb would
  run into evening, and it made the demo WORSE in a way worth recording: a dusk
  launch is murky at the pad, and worse, it lets you believe the stars appeared
  because night fell. Launching in broad daylight removes the ambiguity — the
  sky is blue, nothing about the hour changes during the flight, and the stars
  come out because the AIR RAN OUT. Which is also the one row of the exposure
  model most worth showing: sun up, stars visible, both at once.
  */
  const timeOfDay = options.timeOfDay ?? 14

  const BODY = '#d9dde3'
  const TRIM = '#c2453a'

  /*
  THE ROCKET, as separate elements rather than one parented rig.

  Each piece carries its own `y`, and the driver writes all of them — which
  looks redundant next to parenting them to a root and moving the root once.
  It is deliberate: `AbstractMesh.render()` stamps `mesh.position` from the
  element's own x/y/z every render, so a parent whose CHILD elements also
  declare positions gets a fight between the two every frame. Writing the
  elements IS the supported way to move them, and four writes cost nothing.
  */
  const body = b3dBox({
    meshName: 'rocket-body',
    width: 2,
    height: 9,
    depth: 2,
    color: BODY,
    y: 4.5,
  })
  const nose = b3dSphere({
    meshName: 'rocket-nose',
    diameter: 2,
    color: TRIM,
    y: 9.6,
  })
  const finA = b3dBox({
    meshName: 'rocket-fin-a',
    width: 3.4,
    height: 2.2,
    depth: 0.3,
    color: TRIM,
    y: 1.1,
  })
  const finB = b3dBox({
    meshName: 'rocket-fin-b',
    width: 0.3,
    height: 2.2,
    depth: 3.4,
    color: TRIM,
    y: 1.1,
  })
  const exhaust = b3dParticles({
    emitRate: 300,
    capacity: 1200,
    minSize: 0.6,
    maxSize: 2.2,
    minLifeTime: 0.15,
    maxLifeTime: 0.5,
    minEmitPower: 6,
    maxEmitPower: 14,
    gravityY: -2,
    y: 0,
  })

  const parts: HTMLElement[] = [
    b3dSkybox({
      timeOfDay,
      realtimeScale: 0,
      spaceStart,
      spaceFull,
      starfield,
    }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    b3dGround({ size: 4000, color: '#4a5d43' }),
    // The pad, so the first few seconds have something to leave.
    b3dBox({ meshName: 'pad', width: 16, height: 1, depth: 16, y: -0.5, color: '#6b6e73' }),
    /*
    A DECK YOU FLY THROUGH, not weather in the distance.

    The defaults scatter a pool of 36 blobs over a 1200 m disc, which is right
    for a landscape you look ACROSS and useless for a column you fly UP: the
    rocket threaded between them and never got a whiteout at all. Concentrating
    the same idea — more blobs, much tighter spread — puts cloud where the
    flight path actually is.
    */
    b3dClouds({
      altitude: cloudAltitude,
      thickness: 34,
      coverage: 0.85,
      count: 70,
      spread: 320,
      size: 60,
    }),
    body,
    nose,
    finA,
    finB,
    exhaust,
  ] as unknown as HTMLElement[]

  /*
  THE DRIVER — a `b3dController` used purely for its frame callback.

  It is the sanctioned way to get a per-frame hook as a scene child (see
  b3d-controller: "use it instead of hand-rolling per-demo key/pointer
  listeners"), and `drive` hands over a real `dt`, so the flight integrates
  properly rather than per-frame-rate.
  */
  let y = 0
  let v = 0
  let wait = hold
  let falling = false

  const ctrl = b3dController({
    drive: (_input: unknown, dt: number) => {
      const scene = (ctrl as any).owner?.scene as BABYLON.Scene | undefined
      if (scene == null) return

      if (wait > 0) {
        wait -= dt
      } else if (!falling) {
        v += accel * dt
        y += v * dt
        if (y >= apogee) {
          y = apogee
          v = 0
          falling = true
          wait = hold
        }
      } else {
        /*
        AND BACK DOWN, which is the part that proves the point.

        Nothing is sequenced, so the descent needs no reverse timeline — every
        layer is a function of altitude, so running the number backwards runs
        the whole sky backwards: stars fade, the haze returns, the cloud deck
        closes over you. A scripted ascent would have needed all of that
        written twice.
        */
        v += accel * 0.55 * dt
        y -= v * dt
        if (y <= 0) {
          y = 0
          v = 0
          falling = false
          wait = hold
        }
      }

      const b = body as any
      const n = nose as any
      const fa = finA as any
      const fb = finB as any
      const ex = exhaust as any
      b.y = y + 4.5
      n.y = y + 9.6
      fa.y = y + 1.1
      fb.y = y + 1.1
      ex.y = y
      // Exhaust only while the motor is lit — on the pad and on the way down
      // it should be a falling object, not a thing still under power.
      ex.emitRate = wait <= 0 && !falling ? 300 : 0

      /*
      THE CAMERA HOLDS STATION OFF ITS FLANK.

      Only the TARGET is written. Radius and elevation are set once, so the
      shot stays side-on and level ("a camera pointed at it horizontally") and
      you can still orbit it yourself without the driver fighting you back.

      It has to climb WITH the rocket — a camera left on the pad would watch it
      shrink and never see the sky change, which is the entire point of the
      demo.
      */
      const cam = scene.activeCamera as BABYLON.ArcRotateCamera
      if (cam?.target != null) {
        cam.target.set(0, y + 5, 0)
        if (cam.maxZ < 20000) {
          cam.maxZ = 20000
          cam.radius = 34
          cam.beta = 1.45
          cam.lowerRadiusLimit = 12
          cam.upperRadiusLimit = 400
        }
      }
    },
  })
  parts.push(ctrl as unknown as HTMLElement)

  return parts
}
