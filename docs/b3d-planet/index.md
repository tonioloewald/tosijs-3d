# b3d-planet

Procedural planet mesh using a subdivided cube projected onto a sphere.
Height displacement from 3D Perlin noise (gross + detail layers) with
gradient filters for terrain shaping. Same noise system as `b3d-terrain`
so ground-level and orbital views are consistent.

Optional atmosphere (glow shell) and ocean (water sphere at sea level).

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dPlanet, label3d, slider3d, toggle3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, p } = elements

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
  },
})

const planet = b3dPlanet({
  seed: 42,
  radius: 50,
  subdivisions: 64,
  biome: 'on', // the biome shader's planetary front-end — radial altitude, insolation

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
    scenePanel: () => [
      label3d({ text: 'Planet' }),
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.001, max: 0.05, scale: 'log' }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.005, max: 0.1, scale: 'log' }),
      slider3d({ label: 'gross amp', value: demo.grossAmplitude, min: 0, max: 20, step: 0.5 }),
      slider3d({ label: 'detail amp', value: demo.detailAmplitude, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'rotation', value: demo.rotationSpeed, min: 0, max: 0.5, step: 0.01 }),
      slider3d({ label: 'atmosphere', value: demo.atmosphere, min: 0, max: 0.2, step: 0.01 }),
      slider3d({ label: 'clouds', value: demo.clouds, min: 0, max: 1, step: 0.05 }),
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
  b3dSun(),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.3 }),
  planet,
)

preview.append(
  scene,
  div({ class: 'debug-panel' }, p('Scroll to zoom, drag to orbit'))
)

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
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `12345` | Noise seed |
| `radius` | `50` | Base sphere radius |
| `heightMap` | `''` | A real world's HEIGHTS: a 16-bit greyscale PNG, 2:1, `metres = value − 32768` (see [planet-map](/planet-map/)). A full URL, or a path resolved by `assetUrl`: call `setAssetBase('https://cdn.tosijs.net')` once and `nasa/moon/height-2k.png`, `nasa/mars/…` and `noaa/earth/…` are there. Sets `surface` when it has loaded. Those maps are NASA's and NOAA's and free to use with credit, which is yours to show |
| `bodyRadiusKm` | `0` | The real body's radius in km, which is what the heights are a fraction of (Moon 1737.4, Mars 3389.5, Earth 6371). `0` reads the height map's `body-radius-km` header, which a browser only shows to a page on the same origin unless the server exposes it: set this for a map from another host |
| `colorMap` | `''` | A real world's COLOUR: a 2:1 image, longitude −180° to 180° left to right. `nasa/moon/color-2k.jpg` and so on. Replaces the biome shading and the sea sphere |
| `flatSea` | `'off'` | `'on'` fills everything below 0 m level, for a world whose colour map shows water (the Earth) |
| `relief` | `1` | With a `heightMap` or a `surface` set: how much its true relief is exaggerated. `1` is to scale, which on a globe is flat to the eye; 20 to 60 reads as a relief map |
| `gas` | `''` | Make it a GAS GIANT: `'jupiter'`, `'saturn'`, `'uranus'` or `'neptune'`. A smooth banded sphere with winds and a storm in place of terrain, sea and air shell; `seed` gives a different planet of the same kind and `rings` still applies. See [gas-giant](/gas-giant/) |
| `bands` | `0` | Gas giant: stripes from pole to pole. `0` = the preset's |
| `turbulence` | `-1` | Gas giant: how torn the band edges are, `0…1`. `-1` = the preset's |
| `storm` | `-1` | Gas giant: size of the great storm, `0` = none. `-1` = the preset's |
| `bandColors` | `''` | Gas giant: up to three `#rrggbb`, comma separated (zones, belts, accent). Blank = the preset's |
| `ringInner` | `0` | Inner edge of the ring, in planet radii from the centre. `0` = the gas giant preset's, else 45% of the outer edge |
| `ringOuter` | `0` | Outer edge of the ring, in planet radii. `0` = the gas giant preset's, else 1.5 to 3 by `rings` |
| `ringOpacity` | `-1` | `0…1`, always multiplied by `rings` (which reaches full strength at about 0.85). `-1` = the gas giant preset's |
| `ringColor` | `''` | `#rrggbb`. Blank = the gas giant preset's, else a pale tan |
| `subdivisions` | `64` | Grid subdivisions per cube face |
| `grossScale` | `0.005` | Gross noise frequency |
| `detailScale` | `0.02` | Detail noise frequency |
| `grossAmplitude` | `5` | Gross height multiplier |
| `detailAmplitude` | `1` | Detail height multiplier |
| `atmosphere` | `0.08` | Atmosphere thickness (fraction of radius, 0=none) |
| `clouds` | `0` | (Provisional: this is the weather from ORBIT only. It is its own field, and does not yet agree with the cloud deck or the weather cells on that world's ground.) Weather seen from orbit: how much of the sky is cloud, `0…1`. A shell inside the air, with winds that reverse with latitude, more cloud along the equator and the storm tracks, and a shadow on the ground beneath. `0` = none |
| `cloudColor` | `'#ffffff'` | The cloud's colour where lit |
| `storms` (property) | `[]` | Storms placed on the weather, up to four: `planet.storms = [{ lat: 22, lon: -60, size: 8, intensity: 1, lightning: 1 }]`. Each is a cyclone with an eye, turning the right way for its hemisphere, with lightning inside; `cyclone: 0` makes it a thunderstorm complex that sits and flashes. Needs `clouds` above 0. Provisional: a storm here is not yet a weather cell on the ground, and the shape of this may change when it is |
| `cloudSpeed` | `1` | How fast the weather moves. `0` holds it still |
| `ocean` | `0.6` | Ocean coverage (0=none, 0.6=60% of surface underwater) |
| `wireframe` | `false` | Debug: render as wireframe |
| `rotationSpeed` | `0` | Auto-rotation speed (radians/sec), west to east as planets turn. Negative turns it the other way |
