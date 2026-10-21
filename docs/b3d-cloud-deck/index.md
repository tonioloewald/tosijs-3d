# b3d-cloud-deck

**A cloud LAYER, as a layer.** One lit surface overhead with dark undersides and
bright fringes, driven by a field you can dial from clear to overcast and slide
up and down without rebuilding anything.

This is a second primitive, not a replacement for [b3d-clouds](?b3d-clouds.ts).
Discrete blobs are right for cloud you fly BETWEEN — a canyon of thunderheads,
`insideCloud` as a tactic. They are wrong for a DECK, which is what you see from
below on an ordinary day and from above on an ordinary flight.

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
> long wispy streaks.
>
> There is no `transmission` slider, and that is the point: it FOLLOWS coverage,
> along with the gloom under the deck and the depth of the cloud. A fixed value
> would sit above the gloom threshold, so the sun would never dim however far
> the coverage went. It is still settable as an attribute for the deliberate
> case.
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
| `windHeadingDeg` | `0` | Which way it drifts — and the direction cirrus streaks run. Used only when the scene has no wind of its own (`<tosi-b3d wind-speed>`): with one, the deck drifts with it, as smoke and storms do |
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

The deck is a subdivided grid rather than one huge quad. At these resolutions
it costs nothing, and it buys a **per-vertex channel**: somewhere to say *it is
raining HERE, this part is a thunderhead, there is a hole over the airfield*,
which a single quad has nowhere to put.

Orographic cloud is the case that needs it. A noise field knows nothing about
the ground under it, but each vertex of the deck has a world position, so it
can ASK the terrain how high it is there and write the answer into its own
channel. Cloud then gathers over ridges and thins over valleys because of the
landscape rather than because someone painted it. Anything samplable at a
vertex can drive it the same way: cloud that builds over warm ground and breaks
over cold water is the same edit with a different sampler.

**No refraction, on purpose.** It is plain alpha blending: cloud scatters
light, it does not bend what is behind it, and a sky distorted through a thin
edge would read as glass.

## The cloud field

One field is sampled by everything that needs it. The deck reads it on the GPU,
the whiteout reads the same array on the CPU, and the ground shadow
([cloud-shadows](?cloud-shadows.ts)) samples it by world XZ, so the shade
underfoot belongs to the cloud overhead rather than merely resembling it. It is
baked once into a **tileable** density array (`fieldTexture`). Nothing
re-implements the noise, because a TypeScript copy and a GLSL copy would not
produce identical output forever, and every "why is the shadow slightly off the
cloud" bug would live in that gap.

- **Billow noise, not fBm.** The absolute value creases the field at every zero
  crossing, which is what makes cloud read as cauliflower instead of swell.
- **`coverage` is not baked in.** It is a threshold applied at sample time, so
  weather is a live uniform on the deck and its shadow and they cannot disagree
  about it: clear to overcast with nothing regenerated.
- **`cirrus` is one dial for two changes.** The noise domain is STRETCHED along
  a heading (long), and the billow fold is inverted and narrowed into filaments
  (wispy). Stretch alone makes sausages; filaments alone make a scribble.
- **The heading is not baked.** Rotating inside the bake would not tile, so the
  streaks' direction is a rotation of the sampler's UVs. A wrapped texture read
  through a rotated UV has no seam, and changing the wind direction costs no
  rebake.
- **Tileable by construction.** The 2D position is mapped onto two circles in
  4D and read from 3D noise (a torus), so the field wraps in both axes with no
  seam to hide. A deck repeats across the sky, and a visible tile boundary is
  worse than no clouds.
