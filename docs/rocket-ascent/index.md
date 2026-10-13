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
