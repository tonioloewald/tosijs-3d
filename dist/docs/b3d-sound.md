# b3d-sound

Declarative audio component wrapping Babylon.js `Sound`. Supports both
2D (ambient/music) and 3D (positional/spatial) audio. Spatial sounds
can be placed at a fixed position or attached to a mesh to follow it.

Note: browsers block audio autoplay before user interaction. If `autoplay`
is set, the sound will attempt to play on connect, but may be silenced
until the user interacts with the page.

## Demo

```js
import { b3d, b3dSound, b3dLight, b3dSkybox, b3dSphere, b3dGround } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, button, p } = elements

const spatialSound = b3dSound({
  url: './static/hum.wav',
  spatialSound: true,
  x: 4, y: 1, z: 0,
  loop: true,
  volume: 0.8,
  refDistance: 2,
  maxDistance: 20,
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 3, 12,
          BABYLON.Vector3.Zero(), el.scene
        )
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ diameter: 20, color: '#556644' }),
    b3dSphere({ x: 4, y: 1, z: 0, diameter: 0.5, color: '#ff4400' }),
    spatialSound,
  ),
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace' },
    p('Orbit the camera to hear spatial panning'),
    button({ textContent: 'Play', onclick() { spatialSound.play() } }),
    button({ textContent: 'Stop', onclick() { spatialSound.stop() } }),
  ),
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | Audio file URL |
| `volume` | `1` | Volume (0-1) |
| `loop` | `false` | Loop playback |
| `autoplay` | `false` | Auto-start on connect |
| `spatialSound` | `false` | Enable 3D positional audio |
| `x` | `0` | Position X (spatial mode) |
| `y` | `0` | Position Y (spatial mode) |
| `z` | `0` | Position Z (spatial mode) |
| `refDistance` | `1` | Distance at full volume |
| `rolloffFactor` | `1` | Attenuation rate |
| `maxDistance` | `100` | Cutoff distance |
| `distanceModel` | `'linear'` | `'linear'`, `'inverse'`, `'exponential'` |
| `attachTo` | `''` | Mesh name to follow |
| `playbackRate` | `1` | Playback speed |