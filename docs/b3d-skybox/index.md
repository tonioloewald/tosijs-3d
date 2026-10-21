# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 17 } })

const scene = b3d(
  {
    panelTitle: 'Sky',
    scenePanel: () => [
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0, latitude: 40 }),
  // A checkered ground (receives shadows) + a few casters — scrub the time of
  // day and watch the shadows swing long at dawn/dusk and short at noon.
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  b3dBox({ meshName: 'pillar', size: 1.5, x: -3, y: 0.75, z: 1, color: '#c85a3a' }),
  b3dBox({ meshName: 'crate', size: 1, x: 2, y: 0.5, z: 3, color: '#5aa0c8' }),
  b3dSphere({ meshName: 'ball', diameter: 2, x: 3, y: 1, z: -2, color: '#c8a83a' }),
)
preview.append(scene)
```

## Demo — the encoded sky

A baked sky is a raster of a thing that is almost entirely empty, and the
stars are the expensive part. The PAIR that `bakeSkyPair()` emits splits the
sky the way the measurements argued for: nebulae (low-frequency) in a small
smooth cube, stars and distant galaxies (points) in a DATA cube the shader
decodes — so stars stay points at any zoom instead of being a smear baked at
one resolution. Zoom into the band and watch them stay sharp.

```js
import { b3d, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 23.5 } })

const scene = b3d(
  {
    panelTitle: 'Encoded sky',
    scenePanel: () => [
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSkybox({
    timeOfDay: sky.timeOfDay,
    realtimeScale: 0,
    starfieldCube: '/sky/nebula',
    starfieldData: '/sky/stars',
    starfieldTilt: '12,25,58',
  }),
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
)
preview.append(scene)
```

### Pin the shipped sky in a document

`/sky/stars` + `/sky/nebula` are **latest**: what the demos load, and a rebake
changes them. A document that should keep the sky it was authored against
points at a **versioned** pair instead, which is never rewritten:

```javascript
b3dSkybox({
  starfieldCube: 'https://3d.tosijs.net/sky/0.8.4/nebula',
  starfieldData: 'https://3d.tosijs.net/sky/0.8.4/stars',
  starfieldDataSize: 1024, // from the manifest — it must match the data
  starfieldTilt: '12,25,58',
})
```

Each version folder carries a `manifest.json` with the decode parameters
(`starfieldDataSize`, `starfieldTilt`) and the recipe it was baked from, so a
consumer can read them from beside the data rather than hard-coding them.
Versions available: `0.8.3` (an earlier, sparser galaxy) and `0.8.4` (the
voxel galaxy, far more stars).

The starfield attributes (`starfield*`, `nebula*`) are **live**: changing one
on an existing sky rebuilds the starfield, so applying a document to a sky
that is already up works. `skyboxSize` is read once, when the sky is built.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `updateFrequencyMs` | `100` | How often (ms) the advancing time of day is applied |
| `latitude` | `40` | Geographic latitude in DEGREES (affects the sun's arc) |
| `azimuth` | `0` | **Ignored** — the sun is placed by `latitude` and `timeOfDay`, and the sky material accepts this and discards it. Accepted so existing markup does not break; not in `skyboxSchema()` |
| `luminance` | `1` | Sky brightness |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `mieCoefficient` | `0.005` | Mie scattering: the haze of larger particles around the sun |
| `mieDirectionalG` | `0.8` | How forward the Mie scattering is: higher gathers the glow tighter round the sun |
| `spaceStart` | `0` | Altitude (m) where the fade to space BEGINS |
| `spaceFull` | `0` | Altitude (m) of full vacuum. Feature is off unless this exceeds `spaceStart` |
| `atmosphere` | `1` | How much air this WORLD has: `1` Earth, `0` the Moon (black sky at noon, stars out, no haze, a hard sun). Deliberately steep — only the last stretch toward 0 thins the sky (vacuum is `(1 − atmosphere)⁴`) — and it multiplies with the space band |
| `dust` | `0` | Suspended dust, 0…1: bright, coloured haze that is never blue. Independent of `atmosphere`, so Mars is almost no air and lots of dust, and the Moon is neither |
| `zenithTint` | `'#ffffff'` | The sky's colour overhead — the scattered light's own brightness in this hue, by `tintStrength`. Stars and moon are behind the air and untinted |
| `horizonTint` | `'#ffffff'` | The same at the horizon. `zenithTint: '#c8a070', horizonTint: '#e0b080', tintStrength: 1` is a butterscotch Mars |
| `tintStrength` | `0` | How much the sky takes the tints, `0` (Earth, untouched) … `1` |
| `starfieldCube` | `''` | Root path of a baked cube (`<root>_px.png` …). Replaces `starfield` |
| `starfieldData` | `''` | Root path of a DATA cube (`<root>_px.png` …) encoded by `starfield-codec`. Not a picture of a starfield — a table of stars the shader decodes into points that stay sharp at any zoom. Composes with `starfieldCube` rather than replacing it |
| `starfieldDataSize` | `1024` | Texels per face of `starfieldData`. Must match what encoded it. 1024 is the size to ship — at 512 a packed texel reads as a lattice through the dense band |
| `starfieldSharpness` | `3` | How sharp a decoded point is — higher is tighter. 3 tucks the gaussian tail in so a star reads as a point |
| `starfieldGain` | `0.9` | How bright the decoded stars are — the intensity cap on the whole point sky |
| `starfieldTwinkle` | `0.35` | Scintillation strength. Scaled by the gas (none in vacuum), strongest at the horizon |
| `starfieldFloor` | `0.4` | The faint mass's brightness — most stars sit on it; `starfieldGain` only moves the bright few above it |
| `starfieldSizeScale` | `3` | How much bigger a full-size object (a distant galaxy) is than a star |
| `starfieldTilt` | `'0,0,0'` | Degrees `rx,ry,rz` rotating the sampling direction — both cubes — where a galactic tilt belongs |
| `starfield` | `0` | How many background stars to build. `0` = none |
| `nebulae` | `0` | Soft emission clouds behind the stars. `0` = none |
| `nebulaBrightness` | `1` | Nebula brightness 0…1 |
| `nebulaSize` | `0.045` | Nebula size as a fraction of the sky radius |
| `nebulaTexture` | `''` | Black-backed image stamped per nebula; empty = a plain procedural falloff |
| `spaceColor` | `'#05070f'` | What is behind the stars in vacuum. Just north of black, so a black hole still has somewhere darker to go |
| `starfieldSeed` | `12345` | Seed for the starfield — same seed, same constellations |
| `starDistance` | `0` | Park a `<tosi-b3d-star>` child this far along the sun vector. `0` = leave it alone |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `sunSize` | `1` | The sun's apparent size, 1 = as seen from Earth. Mars 0.66, Venus 1.39, Io 0.19, Titan 0.11 (it goes as 1/distance from the star) |
| `sunBrightness` | `1` | Multiplies the sun's light. A distant world gets less light, but the eye adapts, so set it by how it looks rather than by the inverse square |
| `applyFog` | `false` | Whether scene fog affects the skybox |
| `skyboxSize` | `1000` | Size of the sky box. Read once, when the sky is built |
