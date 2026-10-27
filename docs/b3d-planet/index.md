# b3d-planet

Procedural planet mesh using a subdivided cube projected onto a sphere.
Height displacement from 3D Perlin noise (gross + detail layers) with
gradient filters for terrain shaping. Same noise system as `b3d-terrain`
so ground-level and orbital views are consistent.

Optional atmosphere (glow shell) and sea: land and sea are one mesh and one shader, told apart per pixel by height (there is no separate sea sphere).

## Demo

```js
import { b3d, spaceBackdrop, b3dLight, b3dPlanet, ROCKY_WORLDS, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { demo } = tosi({
  demo: {
    grossScale: 0.005,
    detailScale: 0.02,
    grossAmplitude: 5,
    detailAmplitude: 1,
    atmosphere: 0.08,
    clouds: 0.45,
    ocean: 0.6,
    wireframe: false,
    rotationSpeed: 0.05,
    // A rocky world's look ('' = these dials): see rocky-world.
    world: '',
  },
})

const planet = b3dPlanet({
  seed: 42,
  radius: 50,
  subdivisions: 64,
  biome: 'on', // the biome shader's planetary front-end — radial altitude, insolation
  world: demo.world,

  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  atmosphere: demo.atmosphere,
  clouds: demo.clouds,
  ocean: demo.ocean,
  wireframe: demo.wireframe,
  rotationSpeed: demo.rotationSpeed,
})

const scene = b3d(
  {
    frameRate: 60,
    panelTitle: 'Planet',
    scenePanel: () => [
      select3d({ label: 'world', value: demo.world, options: ['', ...Object.keys(ROCKY_WORLDS)] }),
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.001, max: 0.1, scale: 'log' }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.005, max: 0.1, scale: 'log' }),
      slider3d({ label: 'gross amp', value: demo.grossAmplitude, min: 0, max: 20, step: 0.5 }),
      slider3d({ label: 'detail amp', value: demo.detailAmplitude, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'rotation', value: demo.rotationSpeed, min: 0, max: 0.5, step: 0.01 }),
      slider3d({ label: 'atmosphere', value: demo.atmosphere, min: 0, max: 0.2, step: 0.01 }),
      slider3d({ label: 'clouds', value: demo.clouds, min: 0, max: 3, step: 0.05 }),
      slider3d({ label: 'ocean', value: demo.ocean, min: 0, max: 1, step: 0.05 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      // The biome climate, in the terms you think in: temperature at the
      // equator, the temperate zone, and the pole — plus moisture and the
      // rain-shadow strength. All live (bindForSubMesh reads each frame).
      label3d({ text: 'Climate' }),
      ...(planet.biomePlugin
        ? (() => {
            const p = planet.biomePlugin.params
            const bind = (label, key, min, max, step) =>
              slider3d({ label, value: p[key], min, max, step, handleChange: (v) => { p[key] = v } })
            return [
              bind('equator temp', 'equatorTemp', 0, 1, 0.01),
              bind('temperate temp', 'temperateTemp', 0, 1, 0.01),
              bind('pole temp', 'poleTemp', 0, 1, 0.01),
              bind('moisture', 'mapMoisture', 0, 1, 0.01),
              bind('moisture variation', 'mNoiseAmp', 0, 1, 0.01),
              bind('rain shadow', 'rainShadow', 0, 0.6, 0.01),
              bind('volcanism', 'volcanism', 0, 1, 0.01),
            ]
          })()
        : []),
    ],
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        150,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 60
      camera.upperRadiusLimit = 500
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  ...spaceBackdrop({ sky: '/sky' }),
  // A little fill, so the night side is not a hole in the stars.
  b3dLight({ intensity: 0.15 }),
  planet,
)

preview.append(
  scene,
)

// Choosing a world sets the dials to its numbers (the planet writes the
// same ones into itself), and they are yours to move from there.
demo.world.observe(() => {
  const look = ROCKY_WORLDS[demo.world.value]
  if (look) Object.assign(demo, { grossAmplitude: look.grossAmplitude, detailAmplitude: look.detailAmplitude, atmosphere: look.atmosphere, clouds: look.clouds, ocean: look.ocean })
  // Written straight away: a bound attribute arrives a frame later, after
  // this rebuild.
  planet.world = demo.world.value
  planet.regenerate()
})
for (const key of ['grossScale', 'detailScale', 'grossAmplitude', 'detailAmplitude']) {
  demo[key].observe(() => {
    planet.regenerate()
  })
}
for (const key of ['atmosphere', 'clouds', 'ocean', 'wireframe', 'rotationSpeed']) {
  demo[key].observe(() => {
    planet.updateOptions()
  })
}
```
```css
.preview { display: flex; flex-direction: column; height: 100%; }
tosi-b3d { flex: 1; min-height: 0; width: 100%; }
```

Scroll to zoom, drag to orbit. The settings are in the scene panel (the owl).

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `12345` | Noise seed |
| `biome` | `'off'` | `'on'` shades the land with the procedural biome shader, planetary version: altitude is radial, latitude sets the temperature, and the sea level follows `ocean` (see [biome-chart](/biome-chart/)) |
| `radius` | `50` | Base sphere radius |
| `heightMap` | `''` | A real world's HEIGHTS: a 16-bit greyscale PNG, 2:1, `metres = value − 32768` (see [planet-map](/planet-map/)). A full URL, or a path resolved by `assetUrl`: call `setAssetBase('https://cdn.tosijs.net')` once and `nasa/moon/height-2k.png`, `nasa/mars/…` and `noaa/earth/…` are there. Sets `surface` when it has loaded. Those maps are NASA's and NOAA's and free to use with credit, which is yours to show |
| `bodyRadiusKm` | `0` | The real body's radius in km, which is what the heights are a fraction of (Moon 1737.4, Mars 3389.5, Earth 6371). `0` reads the height map's `body-radius-km` header, which a browser only shows to a page on the same origin unless the server exposes it: set this for a map from another host |
| `colorMap` | `''` | A real world's COLOUR: a 2:1 image, longitude −180° to 180° left to right. `nasa/moon/color-2k.jpg` and so on. Replaces the biome shading (and the drawn sea) |
| `flatSea` | `'off'` | `'on'` says the world has a SEA at 0 m: everything below is drawn as level water (and its depth still colours it), for a world whose map shows water (the Earth) |
| `seaGlint` | `1` | The sun's glint on the sea, `0…1`: a patch of sparkle, broken up by fine wave texture, that slides over the water as you move |
| `seaIce` | `0` | Sea ice toward the poles, `0…1` |
| `inlandWater` | `'off'` | `'on'` guesses LAKES from a `colorMap`: where the picture is blue, or nearly black (how NASA's Blue Marble paints deep lakes), it is drawn as water: the map's colour, with the glint. The height map only knows the sea, and a lake is above it. A guess: blue ice or black lava can pass for a lake |
| `terrain` | `''` | A selector for the sphere `<tosi-b3d-terrain>` this is a GLOBE OF (`'#moon-ground'`): drawn from that ground's own height function, and again whenever its shape changes, so a place on the globe is the place on the ground. (The other way round, a terrain's `planet` gives the ground this planet's shape) |
| `relief` | `1` | With a `heightMap` or a `surface` set: how much its true relief is exaggerated. `1` is to scale, which on a globe is flat to the eye; 20 to 60 reads as a relief map |
| `world` | `''` | A ROCKY WORLD preset: `'moon'`, `'mercury'`, `'mars'`, `'venus'`, `'io'`, `'titan'` or `'earth'` (see [rocky-world](/rocky-world/)). Choosing one writes its sea, air, clouds, relief, craters and climate into this planet's own settings, which stay yours to tune; `worldOverrides` (a property) changes the preset for this planet |
| `craters` | `0` | How cratered, `0…1` (see landform's `sphereCraters`) |
| `seaShallow` / `seaDeep` | `''` | The sea's colour in the shallows and the deep, `#rrggbb` (both, or neither: blank is an Earth's) |
| `craterSize` | `0.15` | The largest crater's radius, a fraction of the planet's |
| `craterWear` | `0.6` | How worn the old craters are, `0…1` |
| `craterAsymmetry` | `0` | More craters on the planet's local +Z side, `-1…1` (a locked moon's leading side) |
| `gas` | `''` | Make it a GAS GIANT: `'jupiter'`, `'saturn'`, `'uranus'` or `'neptune'`. A smooth banded sphere with winds and a storm in place of terrain, sea and air shell; `seed` gives a different planet of the same kind and `rings` still applies. See [gas-giant](/gas-giant/) |
| `bands` | `0` | Gas giant: stripes from pole to pole. `0` = the preset's |
| `turbulence` | `-1` | Gas giant: how torn the band edges are, `0…1`. `-1` = the preset's |
| `storm` | `-1` | Gas giant: size of the great storm, `0` = none. `-1` = the preset's |
| `bandColors` | `''` | Gas giant: up to three `#rrggbb`, comma separated (zones, belts, accent). Blank = the preset's |
| `rings` | `0` | A ring, `0` = none. The value is its strength: it widens the default ring and multiplies `ringOpacity`, reaching full strength at about 0.85 |
| `ringInner` | `0` | Inner edge of the ring, in planet radii from the centre. `0` = the gas giant preset's, else 45% of the outer edge |
| `ringOuter` | `0` | Outer edge of the ring, in planet radii. `0` = the gas giant preset's, else 1.5 to 3 by `rings` |
| `ringOpacity` | `-1` | `0…1`, always multiplied by `rings` (which reaches full strength at about 0.85). `-1` = the gas giant preset's |
| `ringColor` | `''` | `#rrggbb`. Blank = the gas giant preset's, else a pale tan |
| `subdivisions` | `64` | Grid subdivisions per cube face |
| `grossScale` | `0.005` | Gross noise frequency |
| `detailScale` | `0.02` | Detail noise frequency |
| `grossAmplitude` | `5` | Gross height multiplier |
| `detailAmplitude` | `1` | Detail height multiplier |
| `atmosphere` | `0.08` | Atmosphere thickness (fraction of radius, 0=none). The clouds ride half way up it |
| `atmosphereColor` | `'rgba(77,128,230,0.15)'` | The glow shell's colour; its alpha is the shell's opacity |
| `atmosphereTurbulence` | `0.5` | How much the glow shell shimmers |
| `clouds` | `0` | (Provisional: this is the weather from ORBIT only. It is its own field, and does not yet agree with the cloud deck or the weather cells on that world's ground.) Weather seen from orbit: how much of the sky is cloud: `1` is mostly cloud with breaks, and on to `3`, a solid deck (Venus). A shell inside the air, with winds that reverse with latitude, more cloud along the equator and the storm tracks, and a shadow on the ground beneath. `0` = none |
| `cloudColor` | `'#ffffff'` | The cloud's colour where lit |
| `storms` (property) | `[]` | Storms placed on the weather, up to four: `planet.storms = [{ lat: 22, lon: -60, size: 8, intensity: 1, lightning: 1 }]`. Each is a cyclone with an eye, turning the right way for its hemisphere, with lightning inside; `cyclone: 0` makes it a thunderstorm complex that sits and flashes. Needs `clouds` above 0. Provisional: a storm here is not yet a weather cell on the ground, and the shape of this may change when it is |
| `cloudSpeed` | `1` | How fast the weather moves. `0` holds it still |
| `ocean` | `0.6` | Ocean coverage (0=none, 0.6=60% of surface underwater) |
| `wireframe` | `false` | Debug: render as wireframe |
| `tilt` | `0` | Axial tilt in degrees: the axis leans and stays fixed in space while the planet spins about it. Rings tilt with it, which is what lets their shadow fall across the planet (Saturn 26.7). A star system tilts its own planets from its spec |
| `rotationSpeed` | `0` | Auto-rotation speed (radians/sec), west to east as planets turn. Negative turns it the other way |
