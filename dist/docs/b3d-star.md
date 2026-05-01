# b3d-star

Procedural star mesh using a subdivided cube projected onto a sphere.
Surface detail from 3D Perlin noise creates sunspot/granulation patterns
via vertex colors. Spectral class controls the star's color temperature.

Optional corona (glow shell) surrounds the star.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dStar, b3dSphere } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, select, option, span, p } = elements

const { demo } = tosi({
  demo: {
    spectralClass: 'G',
    radius: 20,
    surfaceDetail: 0.5,
    coronaSize: 0.3,
    glowIntensity: 1.1,
    rotationSpeed: 0.02,
    wireframe: false,
    pointLight: true,
    lightIntensity: 1.0,
  },
})

const star = b3dStar({
  seed: 42,
  radius: demo.radius,
  subdivisions: 32,
  spectralClass: demo.spectralClass,
  surfaceDetail: demo.surfaceDetail,
  coronaSize: demo.coronaSize,
  glowIntensity: demo.glowIntensity,
  rotationSpeed: demo.rotationSpeed,
  wireframe: demo.wireframe,
  pointLight: demo.pointLight,
  lightIntensity: demo.lightIntensity,
})

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000000',
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        80,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 30
      camera.upperRadiusLimit = 300
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.1 }),
  star,
  b3dSphere({ radius: 5, x: 40, y: 0, z: 0, color: '#888888' }),
  b3dSphere({ radius: 5, x: -40, y: 0, z: 0, color: '#888888' }),
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    label(
      'spectral class ',
      select(
        { bindValue: demo.spectralClass },
        option({ value: 'O' }, 'O — Blue'),
        option({ value: 'B' }, 'B — Blue-white'),
        option({ value: 'A' }, 'A — White'),
        option({ value: 'F' }, 'F — Yellow-white'),
        option({ value: 'G' }, 'G — Yellow (Sun)'),
        option({ value: 'K' }, 'K — Orange'),
        option({ value: 'M' }, 'M — Red'),
      ),
    ),
    label(
      'radius ',
      input({ type: 'range', min: 5, max: 50, step: 1, bindValue: demo.radius }),
    ),
    label(
      'surface detail ',
      input({ type: 'range', min: 0, max: 1, step: 0.05, bindValue: demo.surfaceDetail }),
    ),
    label(
      'corona size ',
      input({ type: 'range', min: 0, max: 0.5, step: 0.01, bindValue: demo.coronaSize }),
    ),
    label(
      'glow intensity ',
      input({ type: 'range', min: 0, max: 3, step: 0.1, bindValue: demo.glowIntensity }),
    ),
    label(
      'rotation ',
      input({ type: 'range', min: 0, max: 0.2, step: 0.005, bindValue: demo.rotationSpeed }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
    label(
      'point light ',
      input({ type: 'checkbox', bindValue: demo.pointLight }),
    ),
    label(
      'light intensity ',
      input({ type: 'range', min: 0, max: 5, step: 0.1, bindValue: demo.lightIntensity }),
    ),
  )
)

for (const key of ['radius', 'surfaceDetail']) {
  demo[key].observe(() => {
    star.regenerate()
  })
}
for (const key of ['spectralClass', 'coronaSize', 'glowIntensity', 'wireframe', 'rotationSpeed', 'pointLight', 'lightIntensity']) {
  demo[key].observe(() => {
    star.updateOptions()
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
| `seed` | `12345` | Noise seed for surface features |
| `radius` | `20` | Star radius |
| `subdivisions` | `32` | Grid subdivisions per cube face |
| `spectralClass` | `'G'` | Spectral class: O, B, A, F, G, K, M |
| `surfaceDetail` | `0.5` | Surface noise intensity (0=uniform, 1=strong spots) |
| `coronaSize` | `0.15` | Corona thickness as fraction of radius (0=none) |
| `rotationSpeed` | `0.02` | Auto-rotation (radians/sec) |
| `wireframe` | `false` | Debug wireframe |
| `glowIntensity` | `2.0` | Emissive brightness multiplier |
| `pointLight` | `false` | Create a point light at star center |
| `lightIntensity` | `1.0` | Point light intensity |
| `lightRange` | `500` | Point light range |