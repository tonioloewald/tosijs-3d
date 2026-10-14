# gas-giant

**The cloud tops of a gas giant, as one shader function.** Banded, sheared by
winds that alternate direction from belt to belt, with a long-lived storm.
It colours a point on a sphere, so the same code draws a giant hanging in a
moon's sky ([`<tosi-b3d-moon gas="jupiter">`](/b3d-moon/)) and one you orbit.

## Demo

A giant as a body you can fly round:
[`<tosi-b3d-planet gas="saturn">`](/b3d-planet/). Drag to orbit it. The sun
is where the scene's sun is, so swing round to the night side. The bands'
three colours and the ring are yours to set: pick another planet and note how
thin and faint every ring but Saturn's is.

```js
import { b3d, b3dPlanet, spaceBackdrop, GAS_GIANTS, select3d, slider3d, label3d, colorPicker3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const start = GAS_GIANTS.saturn
const { orbit } = tosi({ orbit: {
  kind: 'saturn', seed: 7, spin: 0.03,
  bands: start.bands, turbulence: start.turbulence, storm: start.storm,
  zones: start.colors[0], belts: start.colors[1], accent: start.colors[2],
  rings: 1, ringInner: start.rings.inner, ringOuter: start.rings.outer, ringOpacity: start.rings.opacity, ringColor: start.rings.color,
} })
const planet = b3dPlanet({ gas: orbit.kind, seed: orbit.seed, rotationSpeed: orbit.spin, radius: 50 })

// Everything that changes the planet's look rebuilds it (a sphere: cheap).
const rebuild = () => {
  Object.assign(planet, {
    bands: orbit.bands.value, turbulence: orbit.turbulence.value, storm: orbit.storm.value,
    bandColors: [orbit.zones.value, orbit.belts.value, orbit.accent.value].join(','),
    rings: orbit.rings.value, ringInner: orbit.ringInner.value, ringOuter: orbit.ringOuter.value,
    ringOpacity: orbit.ringOpacity.value, ringColor: orbit.ringColor.value,
  })
  planet.regenerate()
}
// Choosing a planet sets every dial to that planet's own numbers.
orbit.kind.observe(() => {
  const look = GAS_GIANTS[orbit.kind.value]
  Object.assign(orbit, {
    bands: look.bands, turbulence: look.turbulence, storm: look.storm,
    zones: look.colors[0], belts: look.colors[1], accent: look.colors[2],
    ringInner: look.rings.inner, ringOuter: look.rings.outer, ringOpacity: look.rings.opacity, ringColor: look.rings.color,
  })
})
for (const key of Object.keys(orbit.valueOf())) if (key !== 'spin') orbit[key].observe(rebuild)

const planetColours = Object.values(GAS_GIANTS).flatMap((look) => look.colors)
preview.append(
  b3d(
    {
      scenePanelOpen: true,
      scenePanel: () => [
        label3d({ text: 'From space' }),
        select3d({ label: 'planet', value: orbit.kind, options: Object.keys(GAS_GIANTS) }),
        slider3d({ label: 'bands', value: orbit.bands, min: 1, max: 30, step: 1 }),
        slider3d({ label: 'turbulence', value: orbit.turbulence, min: 0, max: 1.5, step: 0.05 }),
        slider3d({ label: 'storm', value: orbit.storm, min: 0, max: 2, step: 0.05 }),
        colorPicker3d({ label: 'zones', value: orbit.zones, alpha: false, presets: planetColours }),
        colorPicker3d({ label: 'belts', value: orbit.belts, alpha: false, presets: planetColours }),
        colorPicker3d({ label: 'accent', value: orbit.accent, alpha: false, presets: planetColours }),
        label3d({ text: 'Rings' }),
        slider3d({ label: 'amount', value: orbit.rings, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'inner edge (radii)', value: orbit.ringInner, min: 1.05, max: 3, step: 0.05 }),
        slider3d({ label: 'outer edge (radii)', value: orbit.ringOuter, min: 1.1, max: 4, step: 0.05 }),
        slider3d({ label: 'opacity', value: orbit.ringOpacity, min: 0, max: 1, step: 0.01 }),
        colorPicker3d({ label: 'ring colour', value: orbit.ringColor, alpha: false }),
        label3d({ text: 'Motion' }),
        slider3d({ label: 'seed', value: orbit.seed, min: 1, max: 96, step: 1 }),
        slider3d({ label: 'rotation', value: orbit.spin, min: 0, max: 0.3, step: 0.01 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera('orbit', -Math.PI / 3, Math.PI / 2.4, 220, BABYLON.Vector3.Zero(), el.scene)
        camera.lowerRadiusLimit = 70
        camera.upperRadiusLimit = 700
        camera.maxZ = 3000
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    ...spaceBackdrop({ sky: '/sky' }),
    planet,
  )
)
rebuild()
```
```css
.preview { height: 100%; }
```

## In a moon's sky

The same planet hanging over the horizon of one of its moons,
[`<tosi-b3d-moon gas="jupiter">`](/b3d-moon/). Pick a planet, then pull it
about: the dials start at the preset's own values.

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dGround, GAS_GIANTS, slider3d, select3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { gg } = tosi({ gg: { kind: 'jupiter', size: 28, time: 16, tilt: 10, ...GAS_GIANTS.jupiter } })
const planet = b3dMoon({
  frame: 'ground', azimuth: 22, elevation: 22,
  gas: gg.kind, size: gg.size, axisTilt: gg.tilt,
  bands: gg.bands, turbulence: gg.turbulence, storm: gg.storm,
})
// Choosing a planet resets the dials to that planet's numbers.
gg.kind.observe(() => {
  const look = GAS_GIANTS[gg.kind.value]
  gg.bands.value = look.bands
  gg.turbulence.value = look.turbulence
  gg.storm.value = look.storm
})

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      scenePanel: () => [
        label3d({ text: 'Gas giant' }),
        select3d({ label: 'planet', value: gg.kind, options: Object.keys(GAS_GIANTS) }),
        slider3d({ label: 'bands', value: gg.bands, min: 1, max: 30, step: 1 }),
        slider3d({ label: 'turbulence', value: gg.turbulence, min: 0, max: 1.5, step: 0.05 }),
        slider3d({ label: 'storm', value: gg.storm, min: 0, max: 2, step: 0.05 }),
        slider3d({ label: 'tilt', value: gg.tilt, min: -45, max: 45, step: 1 }),
        slider3d({ label: 'size (degrees)', value: gg.size, min: 2, max: 80, step: 1 }),
        slider3d({ label: 'time of day (its phase)', value: gg.time, min: 0, max: 24, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 2, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 6, 10))
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox(
      { timeOfDay: gg.time, realtimeScale: 0, atmosphere: 0, starfieldCube: '/sky/nebula', starfieldData: '/sky/stars', starfieldTilt: '12,25,58' },
      planet,
    ),
    b3dGround({ width: 80, height: 80, color: '#6a6250' }),
  )
)
```
```css
.preview { height: 100%; }
```

## How it works

It is the [cloud deck](/b3d-cloud-deck/)'s idea turned on its side: a noise
field advected by wind. There the wind blows across a plane; here each
latitude has its own wind, which is what draws the bands out into streaks.

## What the numbers mean

| | |
| --- | --- |
| `bands` | How many light and dark stripes from pole to pole, counting both. Jupiter is about 14, Neptune 6. Those near the equator are the broadest |
| `turbulence` | How far the edges of the bands are torn, `0…1`. 0 is ruled lines; 1 is Jupiter |
| `storm` | Size of the great storm, `0…1` of a band's width. 0 is none |
| `colors` | Three: the bright zones, the dark belts, and the accent (the storm, the poles) |
| `seed` | A different planet with the same look |
| `rings` | The preset's ring: `inner` and `outer` edge in planet radii, `opacity` and `color`. Saturn's is broad and bright; the others are thin and nearly invisible, which is true to life |

## Presets

`GAS_GIANTS` has `jupiter`, `saturn`, `uranus` and `neptune`. `resolveGasGiant`
takes a preset name and any overrides and returns the numbers the shader
wants.

## The shader

`GAS_GIANT_GLSL` defines

```glsl
vec3 b3dGasGiant(vec3 n, vec4 k, vec3 c0, vec3 c1, vec3 c2, float t)
```

`n` is the unit normal in the planet's own frame (Y is the spin axis), `k` is
`(bands, turbulence, storm, seed)`, the colours are linear RGB and `t` is
seconds. It returns the unlit colour. No textures and no other functions are
needed: it carries its own noise.

```glsl
vec3 b3dGasGiantLit(vec3 albedo, float nDotL, float nDotV, vec3 haze)
```

lights it as a ball of gas: brightness falls away from the point under the
sun and again toward the limb, and a thin rim of `haze` shows on the day
side. A flat disc with a hard terminator reads as a coin; this is what makes
it a sphere. [gas-giant-material](/gas-giant-material/) wraps both for a mesh.
