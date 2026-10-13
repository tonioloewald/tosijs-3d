# b3d-sound

Declarative audio component wrapping Babylon.js `Sound`. Supports both
2D (ambient/music) and 3D (positional/spatial) audio. Spatial sounds
can be placed at a fixed position or attached to a mesh to follow it.

Note: browsers block audio autoplay before user interaction. If `autoplay`
is set, the sound will attempt to play on connect, but may be silenced
until the user interacts with the page.

## Demo

```js
import { b3d, b3dSound, b3dLight, b3dSkybox, b3dSphere, b3dGround, label3d, button3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const spatialSound = b3dSound({
  url: '/hum.mp3',
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
      // Play / Stop in the dual-presence ⚙ panel, so you can start the sound from
      // inside VR (where spatial panning is most convincing) too.
      scenePanel: () => [
        label3d({ text: 'Sound' }),
        button3d({ label: 'Play', handleClick: () => spatialSound.play() }),
        button3d({ label: 'Stop', handleClick: () => spatialSound.stop() }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 12,
          target: [0, 0, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 4
        camera.upperRadiusLimit = 36
      },
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ diameter: 20, color: '#556644' }),
    b3dSphere({ x: 4, y: 1, z: 0, diameter: 0.5, color: '#ff4400' }),
    spatialSound,
  )
)
```

> Orbit the camera and the sound pans with it — that is the whole point of a
> positional source. Play and Stop are in the ⚙ scene panel, which is also the
> panel you get in VR.

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
