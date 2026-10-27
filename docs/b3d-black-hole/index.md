# b3d-black-hole

Procedural black hole with accretion disk, gravitational lensing effect,
and photon ring. Inspired by the Interstellar visualization — not physically
accurate but visually striking.

## Demo

```js
import { b3d, b3dLight, b3dBlackHole, b3dSphere, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { demo } = tosi({
  demo: {
    radius: 10,
    diskInnerRadius: 1.05,
    diskOuterRadius: 3.0,
    diskBrightness: 1.5,
    rotationSpeed: 0.3,
    lensing: 'on',
    photonRing: 'on',
    photonRingBrightness: 2.0,
    wireframe: false,
  },
})

const hole = b3dBlackHole({
  radius: demo.radius,
  diskInnerRadius: demo.diskInnerRadius,
  diskOuterRadius: demo.diskOuterRadius,
  diskBrightness: demo.diskBrightness,
  rotationSpeed: demo.rotationSpeed,
  lensing: demo.lensing,
  photonRing: demo.photonRing,
  photonRingBrightness: demo.photonRingBrightness,
  wireframe: demo.wireframe,
})

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000000',
    panelTitle: 'Black hole',
    scenePanel: () => [
      slider3d({ label: 'radius', value: demo.radius, min: 3, max: 20, step: 0.5 }),
      slider3d({ label: 'disk inner', value: demo.diskInnerRadius, min: 1.01, max: 2, step: 0.01 }),
      slider3d({ label: 'disk outer', value: demo.diskOuterRadius, min: 2, max: 8, step: 0.1 }),
      slider3d({ label: 'disk brightness', value: demo.diskBrightness, min: 0.5, max: 3, step: 0.1 }),
      slider3d({ label: 'rotation', value: demo.rotationSpeed, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'photon ring bright', value: demo.photonRingBrightness, min: 0.5, max: 5, step: 0.1 }),
      select3d({ label: 'lensing', value: demo.lensing, options: ['on', 'off'] }),
      select3d({ label: 'photon ring', value: demo.photonRing, options: ['on', 'off'] }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
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
      camera.lowerRadiusLimit = 20
      camera.upperRadiusLimit = 300
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.05 }),
  hole,
  b3dSphere({ radius: 3, x: 50, y: 0, z: 0, color: '#888888' }),
)

preview.append(
  scene,
)

for (const key of ['radius', 'diskInnerRadius', 'diskOuterRadius']) {
  demo[key].observe(() => {
    hole.regenerate()
  })
}
for (const key of ['diskBrightness', 'rotationSpeed', 'lensing', 'photonRing', 'photonRingBrightness', 'wireframe']) {
  demo[key].observe(() => {
    hole.updateOptions()
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
| `radius` | `10` | Event horizon radius |
| `diskInnerRadius` | `1.5` | Inner edge of accretion disk (multiple of radius) |
| `diskOuterRadius` | `4.0` | Outer edge of accretion disk (multiple of radius) |
| `diskBrightness` | `1.5` | Accretion disk emissive brightness |
| `rotationSpeed` | `0.3` | Disk rotation speed (rad/sec) |
| `lensing` | `'on'` | Show gravitational lensing ring |
| `photonRing` | `'on'` | Show photon ring at event horizon |
| `photonRingBrightness` | `2.0` | Photon ring glow intensity |
| `wireframe` | `false` | Debug wireframe |
| `seed` | `12345` | Noise seed for disk turbulence |
| `subdivisions` | `64` | Mesh detail level (lower = faster) |
