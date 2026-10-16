# b3d-cloud-deck

**A cloud LAYER, as a layer.** One lit surface overhead with dark undersides and
bright fringes, driven by a field you can dial from clear to overcast and slide
up and down without rebuilding anything.

This is a second primitive, not a replacement for [b3d-clouds](?b3d-clouds.ts).
Discrete blobs are right for cloud you fly BETWEEN — a canyon of thunderheads,
`insideCloud` as a tactic. They are wrong for a DECK, which is what you see from
below on an ordinary day and from above on an ordinary flight. Tonio, on seeing
one from both sides in a rocket: *"What we have is not worthy of everything else
we've got. It looks like a child's cartoon next to everything else."*

## Demo

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dGround, b3dCloudDeck, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { sky } = tosi({
  sky: {
    coverage: 0.5,
    cirrus: 0,
    altitude: 140,
    eye: 60,
    wind: 8,
    evolve: 0.5,
    timeOfDay: 10,
  },
})

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el, BABYLON) {
        // OUR OWN CAMERA, because `sceneCreated` runs BEFORE the default one is
        // built -- that is what the hook is for. The default frames the origin
        // at radius 8, and a 14 km deck would never appear in it at all.
        const cam = new BABYLON.ArcRotateCamera(
          'deck-camera',
          -1.0,
          1.66,
          900,
          new BABYLON.Vector3(0, 140, 0),
          el.scene
        )
        cam.maxZ = 40000
        cam.lowerBetaLimit = 0.05
        cam.upperBetaLimit = 1.9
        cam.lowerRadiusLimit = 80
        cam.upperRadiusLimit = 6000
        cam.wheelPrecision = 0.2
        cam.attachControl(el.parts.canvas, true)
        el.scene.activeCamera = cam
        // FLY AT A HEIGHT, look around. An orbit camera's EYE height is
        // target.y + radius*cos(beta), which on this rig swings from -400 to
        // +600 as you orbit -- so the altitude slider often could not reach
        // you, and the pass-through whiteout looked broken when it was only
        // unreachable. Pinning the eye and letting orbit change the look
        // direction makes "move the deck through your eyeline" a thing you can
        // actually do.
        el.scene.registerBeforeRender(() => {
          cam.target.y = sky.eye.valueOf() - cam.radius * Math.cos(cam.beta)
        })
      },
      panelTitle: 'Weather',
      scenePanel: () => [
        slider3d({ label: 'coverage', value: sky.coverage, min: 0, max: 2, step: 0.02 }),
        slider3d({ label: 'cirrus', value: sky.cirrus, min: -1, max: 1, step: 0.05 }),
        slider3d({ label: 'altitude', value: sky.altitude, min: 20, max: 600, step: 10 }),
        slider3d({ label: 'eye height', value: sky.eye, min: 5, max: 3000, step: 25 }),
        slider3d({ label: 'wind', value: sky.wind, min: 0, max: 40, step: 1 }),
        slider3d({ label: 'evolve', value: sky.evolve, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
      ],
    },
    // THE PAIR, not one raster. Nebulae are low-frequency and live in a 256
    // cube; stars and distant galaxies are POINTS and live in a data cube that
    // the shader decodes — so they stay points at any zoom instead of being a
    // smear baked at one resolution. A quarter of the raster's disk, 25 MiB of
    // VRAM against its 96.
    b3dSkybox({
      timeOfDay: sky.timeOfDay,
      realtimeScale: 0,
      starfieldCube: '/sky/nebula',
      starfieldData: '/sky/stars',
      starfieldTilt: '12,25,58',
    }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    // An ambient fill, because the deck DIMS it — and a scene with no fill has
    // nothing for the first half of the gloom to take away.
    b3dLight({ intensity: 0.5 }),
    b3dGround({ size: 12000, color: '#4a5a44', receiveShadows: true }),
    b3dCloudDeck({
      coverage: sky.coverage,
      cirrus: sky.cirrus,
      altitude: sky.altitude,
      wind: sky.wind,
      evolve: sky.evolve,
    })
  )
)
```
```css
.preview { height: 100%; }
```

> Drag `coverage` from 0 to 1 — clear to overcast is one dial on a threshold,
> not a count of spawned objects, so it has no pool to exhaust at the top.
> Take `time of day` to 22 and the deck is lit by moonlight against the baked
> galaxy — the same cube the [skybox](?b3d-skybox.ts) uses, so it costs no extra
> mesh and the cloud tops take their colour from whatever is lighting the world.
>
> `wind` slides the whole sky and `evolve` reshapes it as it goes — both free,
> neither rebakes anything. `cirrus` takes the same sky from heaped cumulus to
> long wispy streaks, and
> There is no `transmission` slider, and that is the point: it FOLLOWS coverage,
> along with the gloom under the deck and the depth of the cloud. Pinning it here
> was quietly defeating its own demo — a fixed 0.5 sits above the gloom
> threshold, so the sun never dimmed however far the coverage went. It is still
> settable as an attribute for the deliberate case.
>
> **Push `coverage` past 1.** There is no sky left to cover, so the extra goes
> into DEPTH: the base stays put and the top TOWERS, the sun goes out, and you
> get a deck you can climb into and not come out of.
>
> **Bring `altitude` and `eye height` together.** The deck sweeps through you
> and you get the whiteout — the same fog layer a plane flying through it would
> see, and the reason a pass-through needs no special case. `eye height` pins
> where your eye is; orbiting then changes only which way you look.
>
> It goes to 3 km because the deck does: past `coverage` 1 the top can stand
> 900 m above the base and a local bulge another 1200 on top of that, so
> "above the cloud tops" is a long way up once the weather is turned on.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `altitude` | `140` | Height of the deck. Moving it is ONE number |
| `size` | `14000` | World extent of the deck. Big enough to reach the horizon — a flat grid is nearly free |
| `subdivisions` | `64` | Grid resolution — see "A grid, not a quad" |
| `coverage` | `0.5` | Clear `0` → solid `1` → thickening to `2`. LIVE, and shared with the shadow |
| `thickenDepth` | `900` | MAX thickening — how far the cloud TOP rises above `altitude` at `coverage: 2` |
| `cirrus` | `0` | Rounded heaps `0` → long wispy streaks at `±1`: positive streaks ALONG the wind heading, negative ACROSS it. Rebakes the field |
| `wind` | `8` | Metres per second the deck drifts. Nothing rebakes |
| `windHeadingDeg` | `0` | Which way it drifts — and the direction cirrus streaks run |
| `evolve` | `0.5` | How fast shapes change, `0` rigid → `1` restless |
| `follow` | `'on'` | Keep the deck centred under the camera. A deck is finite; the world is not |
| `ambientGloomBelow` | `0.7` | `transmission` below which the AMBIENT fill starts to go. `0` disables |
| `ambientGloom` | `0.45` | How far the ambient may be taken down |
| `sunGloomBelow` | `0.25` | `transmission` below which the SUN starts to go — later than the ambient, on purpose |
| `sunGloom` | `0.65` | How far the sun may be taken down at zero transmission |
| `localRise` | `1200` | How far a local weather field can lift the cloud TOP, at `coverage: 2`. Large because the orographic field is attenuated at massif scale — see the attribute note |
| `stormRise` | `0` | Opt-in STORM TOWER: how far the top skin rises over a cell whose coverage passes 1 (domed). Off by default: a storm is more cover and lightning, not geometry of its own — lightning lights the underside from below, the whiteout from inside, and the top from above |
| `localCoverage` | `1` | How much a unit of local weather adds to `coverage`. What the field does BELOW an overcast |
| `orographic` | `0` | Cloud gathers over high ground, `0…1`: most over RIDGES (ground above its surroundings), some over high plateaus, measured from the SEA (the scene's water surface), so a high sea does not make all land a mountain. Needs a terrain in the scene |
| `orographicPeak` | `260` | Height ABOVE THE SEA at which `orographic` is at full strength |
| `shadows` | `'on'` | Cloud shadows on the ground |
| `shadowResolution` | `0` (auto) | Shadow texture size. Deliberately coarser than the cloud — a soft cue does not need the detail |
| `shadowRange` | `6000` | Width in metres of the shadow window, centred on the camera |
| `shadowStrength` | `0.75` | Shadow darkness at zero transmission. Scaled down as `transmission` rises — a cloud you can see daylight through does not cast a hard shadow |
| `transmission` | `-1` | How much light comes THROUGH: `0` storm-dark underside, `1` glowing. `-1` = auto from `coverage` |
| `thickness` | `180` | Whiteout depth at FULL coverage. Thinner skies scale it down — passing through always whites out, coverage decides for how long |
| `haze` | `0.6` | How much the air under the deck takes the cloud's colour. Hides the rim |
| `seed` | `1337` | Same seed, same weather |
| `frequency` | `3` | Field repeats across its own width. Higher = smaller puffs |
| `octaves` | `6` | Detail octaves. Billow needs more than fBm — folding eats fine structure |
| `fieldSize` | `1024` | Texels per edge of the baked density field. More texels = finer cloud, 1 byte each |
| `period` | `1800` | Metres per repeat of the field — the size of the CLOUDS, independent of the size of the deck |
| `edgeFade` | `0.45` | Where the radial fade starts, as a fraction of the half-size. The deck has no visible rim at any coverage |
| `color` | `'#ffffff'` | Lit top colour |
| `underColor` | `'#3a4350'` | Shadowed underside |
| `fringe` | `0.9` | Brightness of the lit edges seen from below. ADDED, so it can exceed 1, and it takes the scene light's colour and direction — brightest with the sun behind the cloud |
| `bump` | `34` | Faux-bump strength. Higher = more pronounced relief |
| `underBump` | `0.85` | How much relief the UNDERSIDE shows. Borrowed from the top's lighting, so both faces share one shape |
| `shade` | `0.22` | How much of the top's brightness the lighting may take. Small on purpose — cloud is near-white, and a wide swing reads as water |

## A grid, not a quad

The obvious build is one huge quad, and it is the wrong one. Tonio: *"If we use
a bunch of quads we can use the vertex channels to drive localized weather
effects later."*

That is the argument. A subdivided grid costs nothing at these resolutions and
buys a **per-vertex channel** — somewhere to say *it is raining HERE, this part
is a thunderhead, there is a hole over the airfield* — which a single quad has
nowhere to put. The vertex colours are written white and unused today, and that
is deliberate: the channel exists so localized weather is a later edit to a
shader rather than a change of primitive.

And the case that makes it more than a convenience — Tonio: *"Or have clouds
that cluster near mountains say."* That is orographic cloud, it is real, and it
is the thing a noise field fundamentally cannot produce: noise knows nothing
about the ground under it. But the deck is a grid whose vertices have world
positions, so each one can ASK the terrain how high it is there and write the
answer into its own channel. Cloud then gathers over ridges and thins over
valleys because of the landscape rather than because someone painted it — the
same "systemic, not textural" move the rest of this project keeps making.

It generalises past mountains, too: anything samplable at a vertex can drive it.
Cloud that builds over warm ground and breaks over cold water is the same edit
with a different sampler.

It also means the deck can eventually SAG and billow by displacement, which a
quad cannot do at all.

## ⚠️ First pass — the structure is right, the LOOK is not tuned

Honest state, so nobody mistakes "it renders" for "it is finished". Three things
are visibly off and all three are art direction rather than architecture:

1. **~~The repeat is visible.~~** Fixed: two sampling layers at an irrational
   scale ratio never realign, so the field has no period to see. See the shader
   note on `density`.
2. **`coverage` has its curve now.** Percentile normalisation put the threshold
   at the same place in the distribution whatever kind of cloud this is, and the
   threshold itself is shaped rather than linear — so half coverage really is
   about half the sky, with solid cores you can fly into rather than wisps. What
   is left is taste, not calibration.
3. **No REFRACTION, and that is deliberate** — Tonio flagged it and the material
   already satisfies it: this is plain alpha blending with no refraction
   texture, no screen-space sampling and no index-of-refraction term. Cloud
   scatters, it does not bend what is behind it, and anything that distorts the
   sky through a thin edge would read as glass.

None of these need a different primitive, which is the part worth knowing: the
deck, the two faces, the live dials and the vertex channel are all doing their
jobs.

## One field, three readers

The density comes from [cloud-field](?cloud-field.ts) — baked once, tileable,
sampled by world XZ. The deck reads it, the whiteout reads it, and the ground
shadow is meant to, so all three agree by construction rather than by being kept
in step. `coverage` stays a live uniform for the same reason: weather is one
dial and nothing regenerates when it moves.

**Two of the three are wired.** The deck samples the field on the GPU and the
whiteout samples the same array on the CPU — deliberately the same array, not
a read-back and not a re-implementation, because a GPU read-back per frame would
cost real time to learn something we baked ourselves, and a second copy of the
noise is where "why is the shadow off the cloud" lives.

The shadow is the one still missing. `fieldTexture` is exposed for it:
[cloud-shadows](?cloud-shadows.ts) already has the receiver half — a material
plugin sampling a world-XZ texture, conforming to terrain — and today it is fed
by `b3d-clouds` painting blob positions into a moving window. Pointing it at
this field instead, with the same live `coverage` uniform, is what makes the
shade underfoot belong to the cloud overhead rather than merely resemble it.
