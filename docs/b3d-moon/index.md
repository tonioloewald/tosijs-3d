# b3d-moon

**Extra moons, cosmetic.** Put up to four inside a
[`<tosi-b3d-skybox>`](/b3d-skybox/). Each is a colour and a size at a place on
the star sphere. Its PHASE follows from where it is: the side facing the sun
is lit, so a moon near the sun is a thin crescent and one opposite it is
full.

Cosmetic on purpose: there are no orbits, no eclipses, and no light cast on
the scene (the skybox's own moon still does the moonlight). A real orbital system is a separate piece of
work that this does not pretend to be.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { moons } = tosi({ moons: { time: 20.5 } })

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      scenePanel: () => [
        label3d({ text: 'Moons' }),
        slider3d({ label: 'time of day', value: moons.time, min: 0, max: 24, step: 0.25 }),
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
      { timeOfDay: moons.time, realtimeScale: 0, starfieldCube: '/sky/nebula', starfieldData: '/sky/stars', starfieldTilt: '12,25,58' },
      // Big and ruddy, and small and pale: phases follow the sun.
      b3dMoon({ azimuth: 150, elevation: 30, size: 3, color: '#e0b090' }),
      b3dMoon({ azimuth: 200, elevation: 18, size: 1.2, color: '#c8d8ff' }),
    ),
    b3dGround({ width: 60, height: 60, color: '#556644' }),
  )
)
```
```css
.preview { height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `azimuth` | `0` | Degrees AROUND the star sphere. Like right ascension: the moon rides with the stars, rising and setting with them |
| `elevation` | `20` | Degrees from the celestial equator (like declination) |
| `size` | `0.5` | Angular DIAMETER in degrees (the real moon is about 0.5) |
| `color` | `'#dddddd'` | Its colour where lit |
| `brightness` | `1` | Multiplies the lit side |
