# b3d-star

Procedural star: a sphere with a shader surface. What makes it read as a ball
rather than a white disc is **limb darkening**: toward the edge you look
through cooler, higher layers, so it dims and reddens. Under that, a seething
granulation and a few sunspots. Spectral class sets the colour temperature.
It is unlit, because it is the light.

An optional corona (a glow shell) surrounds it, and `activity` adds a few
**active regions**, turning with the star: over the edge each is a prominence
(a glowing loop arching out of the limb, drawn in the corona), and now and then
one flares, its loop swelling while a bright patch flashes on the disc. The
same material draws the star in a [star system](/b3d-star-system/).

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dStar, b3dSphere, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, p } = elements

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
    panelTitle: 'Star',
    scenePanel: () => [
      select3d({ label: 'spectral class', value: demo.spectralClass, options: ['O', 'B', 'A', 'F', 'G', 'K', 'M'] }),
      slider3d({ label: 'radius', value: demo.radius, min: 5, max: 50, step: 1 }),
      slider3d({ label: 'surface detail', value: demo.surfaceDetail, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'corona size', value: demo.coronaSize, min: 0, max: 0.5, step: 0.01 }),
      slider3d({ label: 'glow', value: demo.glowIntensity, min: 0, max: 3, step: 0.1 }),
      slider3d({ label: 'rotation', value: demo.rotationSpeed, min: 0, max: 0.2, step: 0.005 }),
      slider3d({ label: 'light intensity', value: demo.lightIntensity, min: 0, max: 5, step: 0.1 }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      toggle3d({ label: 'point light', value: demo.pointLight }),
    ],
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
  div({ class: 'debug-panel' }, p('Scroll to zoom, drag to orbit')),
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
| `coronaSize` | `0.15` | Corona thickness as fraction of radius (0=none). Prominences live in it, so they are as tall as it allows |
| `activity` | `0.6` | Prominences over the edge and flares on the disc, 0 to 1 (0 none) |
| `rotationSpeed` | `0.02` | Auto-rotation (radians/sec) |
| `wireframe` | `false` | Debug wireframe |
| `glowIntensity` | `2.0` | Emissive brightness multiplier |
| `pointLight` | `false` | Create a point light at star center |
| `lightIntensity` | `1.0` | Point light intensity |
| `lightRange` | `500` | Point light range |
