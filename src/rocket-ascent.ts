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
import { b3d, rocketAscent, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

// The panel is the `scenePanel` hook, which renders BOTH as the flat gear
// overlay and as a floating panel inside VR — so the demo is tweakable in a
// headset, where there is no console and no keyboard.
const { flight } = tosi({ flight: { timeOfDay: 14 } })

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanel: () => [
        // `text`, not `value` — label3d is the one widget here keyed that way,
        // and getting it wrong does not produce a blank row, it takes the WHOLE
        // PANEL down: the undefined string reaches measureTextWidth and throws
        // before anything renders. "The scene panel button has appeared but it
        // literally does nothing." Doc examples are not type-checked, which is
        // exactly why this shipped.
        label3d({ text: 'Ascent' }),
        // NO PAUSE ROW. `<tosi-b3d>` already has pause as a first-class feature
        // — `pause()`/`resume()`, `startPaused`, and `pauseWhenHidden` on by
        // default — and it stops the SIMULATION, not just the render, which a
        // hand-rolled flag in this demo's own loop could never do for the rest
        // of the scene.
        slider3d({
          label: 'time of day',
          value: flight.timeOfDay,
          min: 0,
          max: 24,
          step: 0.5,
        }),
      ],
    },
    ...rocketAscent({ timeOfDay: flight.timeOfDay })
  )
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

## The rocket is Kenney's, and it is a KIT

The Space Kit does not ship a rocket — it ships five stackable parts (base,
sides, fuel, fins, nose, each in an A and a B variant), so the rocket here is
assembled rather than loaded. That is the right way round for this demo anyway:
the point is the sky, and a kit-built rocket reads as a toy, which is exactly
the promise we want to make. _Fidelity is a promise_, and a beautifully modelled
booster would be promising a flight model this does not have.

There is **no submarine anywhere in Kenney's 3D packs** — the only `sub` hits
are a sandwich and a subway train — so the eventual underwater launch will need
a model from somewhere else, or a silhouette made of primitives. It barely
matters: in that shot the camera is on the missile.

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
| `nebulae` | `0` | Sprite nebulae, OFF — superseded by baking the galaxy |
| `rocketScale` | `4` | Uniform scale on the Kenney parts |
| `timeOfDay` | `14` | Broad daylight — so the stars appear because the AIR ran out, not because night fell |
*/
/*{ "parent": "Demos", "order": 20 }*/

import { b3dSkybox } from './b3d-skybox.js'
import { b3dSun } from './b3d-shadows.js'
import { b3dClouds } from './b3d-clouds.js'
import { b3dBox, b3dGround } from './b3d-primitives.js'
import { b3dProp } from './b3d-prop.js'
import { assetUrl } from './asset-url.js'
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
  nebulae?: number
  timeOfDay?: number
  rocketScale?: number
}

/*
THE STACK, in kit units, bottom to top.

Kenney's Space Kit rocket is FIVE parts on a fixed vertical increment — that is
what makes it a kit rather than a model, and it is why these are offsets rather
than one `meshName`. `dy` is measured from the loaded parts (see the demo's own
notes), not guessed from the previews.
*/
const ROCKET_STACK = [
  // Measured off the loaded parts rather than guessed: heights in kit units are
  // base 1.6, sides 1.0, fins 0.7, fuel 0.5, nose 0.8, and every origin sits at
  // the part's BOTTOM. The first guess (a tidy 0/1/2) buried the fuel section
  // inside the base and left the nose floating above a gap.
  { name: 'rocket_baseA', dy: 0 },
  { name: 'rocket_sidesA', dy: 0 },
  { name: 'rocket_finsA', dy: 0 },
  { name: 'rocket_fuelA', dy: 1.6 },
  { name: 'rocket_topA', dy: 2.1 },
] as const

/** Total height in kit units — used to aim the camera at its middle. */
const ROCKET_HEIGHT = 2.9

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
  const starfield = options.starfield ?? 3000
  /*
  OFF — decided, not defeated.

  The double-draw below WAS a real bug and is fixed, but Tonio's call is that
  the sprite route is not worth more of anyone's time: "Anyway, I think this is
  unnecessary. We should just use the galaxy to render skyboxes." He is right,
  and the galaxy's nebulae are procedural per-particle fbm rather than one
  stamped image, which is the thing that actually produces structure.

  So the sky here is stars until the bake lands.
  */
  const nebulae = options.nebulae ?? 0
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

  /*
  A REAL ROCKET, from Kenney's Space Kit — which turns out to be a MODULAR
  STACK rather than one model: base, fuel section, sides, fins and nose, each
  in an A and a B variant. So the rocket is assembled here the way the kit
  intends, not loaded.

  The offsets are in kit units and multiplied by `scale`, because the parts
  stack on a fixed increment — that is what makes it a kit. They are measured
  rather than guessed; see the note on ROCKET_STACK.
  */
  const scale = options.rocketScale ?? 4

  const stack = ROCKET_STACK.map((part) =>
    b3dProp({
      libraryUrl: assetUrl('kenney/libraries/space-kit.glb'),
      meshName: part.name,
      scale,
      y: part.dy * scale,
    })
  )

  /*
  AN INVISIBLE ANCHOR at the rocket's middle, purely so the camera has ONE node
  to lock onto. Cheaper and steadier than aiming at a part — and a part would
  drag the framing around every time the stack is edited.
  */
  const anchor = b3dBox({
    meshName: 'rocket-anchor',
    // 1 cm, which is invisible in practice at this remove. `b3dBox` has no
    // visibility attribute and inventing one here would be a prop that does
    // nothing — the repo has shipped enough of those.
    width: 0.01,
    height: 0.01,
    depth: 0.01,
    y: ROCKET_HEIGHT * 0.5 * (options.rocketScale ?? 4),
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
      // THE BAKED CUBE IS OFF HERE UNTIL IT CAN SHARE ONE MESH WITH THE SKY.
      //
      // A separate cube behind the dome cannot work: both are infiniteDistance,
      // which pins them to the far plane where depth precision is gone, so the
      // tie is decided per pixel and the frame splits along a hard diagonal —
      // blue sky one side, stars the other. Scaling it outside the dome and
      // inside the dome both produced it, because scale does not change the
      // depth of an infinite-distance mesh.
      //
      // The fix is one mesh, which needs the sky SHADER to sample the cube —
      // see the note in b3d-skybox. Until then this demo uses the procedural
      // point starfield, which shares no such problem.
      // starfieldCube: '/sky/default',
      // Tilt the CUBE, not the galaxy — so the band arcs across the sky rather
      // than lying level, which is what stops a baked sky reading as wallpaper.
      starfield,
      nebulae,
      // Black-backed, so additive blending gets the silhouette from the
      // pixels — no opacity map, no falloff geometry.
      nebulaTexture: '/nebula.png',
    }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    // Muted, and not very large. A saturated green slab out to 4 km was the
    // brightest thing on screen in a demo whose subject is the sky, and it read
    // as exactly what it is — one enormous flat quad.
    b3dGround({ size: 2400, color: '#3f4a3c' }),
    /*
    THE PAD — and its top must CLEAR the ground, not meet it.

    It was a 1 m box centred at y = -0.5, which puts its top face at exactly
    y = 0: coplanar with the ground plane, which is the textbook z-fight. Tonio:
    "there's a square and a rather ugly green plane." Two surfaces at the same
    depth is not a tie the depth buffer can break, so it flickers between them
    per pixel and per frame.
    */
    b3dBox({
      meshName: 'pad',
      width: 18,
      height: 0.6,
      depth: 18,
      y: 0.31,
      color: '#6b6e73',
    }),
    /*
    A DECK YOU FLY THROUGH, not weather in the distance.

    The defaults scatter a pool of 36 blobs over a 1200 m disc, which is right
    for a landscape you look ACROSS and useless for a column you fly UP: the
    rocket threaded between them and never got a whiteout at all. Concentrating
    the same idea — more blobs, much tighter spread — puts cloud where the
    flight path actually is.
    */
    b3dClouds({
      // OUR cloud lobe, not the procedural ellipsoid. Every other demo in the
      // repo passes this and I had left it off, so the deck was default blobs —
      // Tonio spotted it from the shape alone.
      model: '/cloud.glb',
      castShadows: true,
      altitude: cloudAltitude,
      thickness: 34,
      coverage: 0.85,
      count: 70,
      spread: 320,
      size: 60,
    }),
    ...stack,
    anchor,
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

      for (let i = 0; i < stack.length; i++) {
        ;(stack[i] as any).y = y + ROCKET_STACK[i].dy * scale
      }
      ;(anchor as any).y = y + ROCKET_HEIGHT * 0.5 * scale
      const ex = exhaust as any
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
      /*
      HAND THE FOLLOW TO BABYLON — do not write the target each frame.

      The first version set `cam.target` from inside this callback, and it was
      visibly jerky. Tonio: "The camera is a bit jerky so I think the parenting
      isn't quite right." He was right about the shape of it: the driver and the
      camera update are different points in the frame, so the camera was always
      chasing a target one step stale, and at ascent speed one frame of lag is
      plainly visible.

      `setTarget(mesh)` makes the camera track the node itself, updated in the
      camera's own pass where the ordering is already correct. Aimed at the
      anchor rather than a part, so the framing does not shift as the stack
      changes.

      `beta` is exactly π/2 — level. It was 1.45, which tips the camera down by
      about 7°, and on a shot with a visible horizon that reads immediately as
      wrong: "the horizon seems to be at about 2/3 the height (so I guess the
      camera is pointing down a bit unnecessarily)."
      */
      const cam = scene.activeCamera as BABYLON.ArcRotateCamera
      const anchorMesh = (anchor as any).mesh
      if (cam != null && anchorMesh != null && cam.maxZ < 20000) {
        cam.maxZ = 20000
        cam.setTarget(anchorMesh)
        cam.radius = 30
        cam.beta = Math.PI / 2
        cam.lowerRadiusLimit = 12
        cam.upperRadiusLimit = 400
      }
    },
  })
  parts.push(ctrl as unknown as HTMLElement)

  return parts
}
