# wind

**One wind for the scene, and provinces that bend it.** Pure — no DOM, no
Babylon — so the composition rule can be tested without a sky.

Today `b3d-clouds` has `windX`/`windZ`, `b3d-water` has
`windForce`/`windDirectionX`/`windDirectionY`, and `ambient-leaves` has nothing
at all. So an author sets the wind **three times, in three spellings**, and they
can silently disagree — clouds streaming north-east over water whose waves run
south. That is the same class of defect as three drifting copies of the theme
table, which is what `w3d-theme` exists to prevent.

## Demo

One dial, and the clouds and the water agree. Turn `wind` off on either and it
falls back to its own attributes — which is what every scene did before this
existed.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dWater, b3dClouds, angle3d, slider3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let scene = null

const panel = () => [
  label3d({ text: 'Weather' }),
  angle3d({
    label: 'bearing',
    value: 45,
    size: 150,
    handleChange: (v) => { if (scene) scene.windBearingDeg = v },
  }),
  slider3d({
    label: 'speed', value: 6, min: 0, max: 20, step: 0.5, showValue: 'always',
    handleChange: (v) => { if (scene) scene.windSpeed = v },
  }),
  slider3d({
    label: 'gust', value: 0.3, min: 0, max: 1, step: 0.05, showValue: 'always',
    handleChange: (v) => { if (scene) scene.windGust = v },
  }),
]

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    // ONE wind. Clouds and water both read it.
    windSpeed: 6,
    windBearingDeg: 45,
    windGust: 0.3,
    sceneCreated(el) {
      orbitCam(el, { alpha: -1.2, beta: 1.32, radius: 120, target: [0, 30, 0] })
    },
  },
  b3dSun({}),
  b3dSkybox({ timeOfDay: 15 }),
  b3dLight({ intensity: 0.4 }),
  // Low and close, so the drift is legible in a small preview.
  b3dClouds({ coverage: 0.6, altitude: 60, spread: 300, size: 40, count: 24 }),
  b3dWater({ y: 0, waterSize: 200, waveHeight: 0.5, twoSided: true })
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

## Cartesian inside, degrees at the edge

Stored and composed as a vector in world XZ. Authored as `windSpeed` and
`windBearingDeg`, per this library's degrees convention, converted at the edge.

That is not a formatting preference — it is the whole composition rule. The
first draft of this design stored speed + bearing and concluded that bearings
could not be summed, needing a weighted circular mean. Tonio: *"Vectors sum fine
don't they?"* They do, and the difficulty was an artifact of the representation:

| a province that... | contributes | and the result |
| --- | --- | --- |
| funnels a valley | a vector along the valley | sums |
| shelters a lee | a vector opposing the base | sums; the magnitude falls out |
| curls round a headland | a crosswise vector | sums; the DIRECTION falls out |

The case that looked like a paradox — two provinces each "turning the wind 90°"
— is not one. Two equal perpendicular contributions give a 45° resultant at √2
the magnitude, which is right, and free. It only looks paradoxical if you
average angles, and nobody would if the type is a vector.

So wind uses **the same rule the existing scalar climate channels use**:
temperature and water SUM, and so does this. A vector layer is just three scalar
sums that happen to travel together — which also answers whether the province
architecture generalises past scalars. It does, unchanged.

## Bearing is where the wind is going

Not where it comes from. Meteorology says a "northerly" blows FROM the north,
and that convention exists for forecasting rather than for rendering: every
consumer here wants to know which way the clouds drift and which way the waves
run. Naming it `bearing` rather than `direction` is the hint, and it matches the
sense [[arc|angle3d]] dials — **north is +Z, and it grows clockwise**.

## The neutral contribution is ZERO, not 0.5

The scalar climate channels are BIPOLAR over `0..1` with `0.5` meaning "leave
the base alone", because a curve has to be able to say "less than the base" and
a curve's range is closed. A vector has no such problem: the neutral
contribution is the zero vector, which needs no midpoint convention at all.

## Gusts are a curve over time, not noise you cannot reproduce

`gustAt` takes an explicit `t`, so the same second of the same scene gives the
same gust — the determinism rule every model here follows. It is separate from
the steady wind on purpose: a consumer that wants a dead-steady breeze simply
does not call it.
