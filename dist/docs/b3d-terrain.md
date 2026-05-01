# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

The inner area uses a grid of high-resolution flat tiles that stream around the camera.
A single skirt ring mesh surrounds the inner grid, expanding outward with inverse-square
radial spacing and blending from square (at the inner edge) to circular at the horizon.
Includes floating-origin rebasing and a recenter mechanism — when travel exceeds
`maxTravelDistance`, a `recenter-needed` event fires so the game layer can orchestrate
a visual transition before calling `recenter()`.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    grossScale: 0.1,
    detailScale: 0.5,
    grossAmplitude: 8,
    detailAmplitude: 2,
    wireframe: false,
  },
})

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  radius: 200,
  cylinderHeight: 200,
  tileSize: 10,
  hiResGrid: 7,
  hiResSubdivisions: 32,
  horizonDistance: 300,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
})

const posDisplay = span({ class: 'pos-display' })

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.UniversalCamera(
        'fly-cam',
        new BABYLON.Vector3(0, 15, 0),
        el.scene
      )
      camera.setTarget(new BABYLON.Vector3(10, 10, 10))
      camera.speed = 4
      camera.keysUp = [87]       // W
      camera.keysDown = [83]     // S
      camera.keysLeft = [65]     // A
      camera.keysRight = [68]    // D
      camera.keysUpward = [69]   // E
      camera.keysDownward = [81] // Q
      camera.minZ = 0.5
      camera.maxZ = 10000
      el.setActiveCamera(camera)

    },
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.position
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ shadowCascading: true, activeDistance: 80 }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 60, end: 110 }),
  terrain,
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('WASD to fly, QE up/down, mouse to look'),
    posDisplay,
    label(
      'gross scale ',
      input({ type: 'range', min: 0.01, max: 1, step: 0.01, bindValue: demo.grossScale }),
    ),
    label(
      'detail scale ',
      input({ type: 'range', min: 0.1, max: 3, step: 0.1, bindValue: demo.detailScale }),
    ),
    label(
      'gross amp ',
      input({ type: 'range', min: 0, max: 20, step: 0.5, bindValue: demo.grossAmplitude }),
    ),
    label(
      'detail amp ',
      input({ type: 'range', min: 0, max: 5, step: 0.1, bindValue: demo.detailAmplitude }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
  )
)

// Regenerate terrain when parameters change
for (const key of ['grossScale', 'detailScale', 'grossAmplitude', 'detailAmplitude', 'wireframe']) {
  demo[key].observe(() => {
    terrain.regenerate()
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
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  z-index: 10;
}
.debug-panel label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.debug-panel p {
  margin: 0;
  opacity: 0.7;
}
.pos-display {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  opacity: 0.7;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `12345` | Noise seed |
| `surfaceType` | `'cylinder'` | `'cylinder'`, `'torus'`, or `'sphere'` |
| `majorRadius` | `100` | Torus major radius |
| `minorRadius` | `40` | Torus minor radius |
| `radius` | `200` | Sphere/cylinder radius |
| `cylinderHeight` | `200` | Cylinder height (v range before reflection) |
| `tileSize` | `10` | World-space tile size |
| `hiResGrid` | `3` | NxN grid of high-detail tiles around camera |
| `hiResSubdivisions` | `32` | Vertices per edge (hi-res) |
| `horizonDistance` | `300` | How far the skirt extends from the inner grid edge |
| `skirtRings` | `16` | Radial depth subdivisions for skirt |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `grossAmplitude` | `8` | Gross height multiplier |
| `detailAmplitude` | `2` | Detail height multiplier |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Usage

```javascript
import { b3d, b3dTerrain, plateauFilter } from 'tosijs-3d'

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  grossScale: 0.02,
  grossAmplitude: 10,
})

// Apply a plateau gradient filter for stepped terrain
terrain.grossFilter = plateauFilter(5)
terrain.regenerate()

document.body.append(b3d({}, terrain))
```