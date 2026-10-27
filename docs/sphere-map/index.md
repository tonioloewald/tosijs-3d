# sphere-map

**Where a place on the ground is on the globe, and back.** A terrain in
`surfaceType="sphere"` is a flat sheet wrapped round a planet: walk far enough
east and you come back. This is the arithmetic of that wrapping, as pure
functions, so that a planet seen from orbit and the ground you land on can
agree about where things are.

## Demo

```js
import { b3d, b3dTerrain, b3dPlanet, b3dWater, b3dSun, b3dSkybox, b3dLight, latLonToDirection } from 'tosijs-3d'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' }, 'finding the ground…')

// A whole planet 4 km in radius, so that a globe of it shows real relief.
const terrain = b3dTerrain({
  id: 'sphere-map-ground',
  seed: 11, biome: 'on', surfaceType: 'sphere', radius: 4000,
  tileSize: 128, lodLevels: 3, splitFactor: 2, reach: 4000,
  grossScale: 0.0016, detailScale: 0.012, grossAmplitude: 320, detailAmplitude: 24,
  center: true,
})
// biome: 'on' so the globe shades with the ground's own climate and colours;
// flatSea because this world has a sea at 0 m (the water below).
// `terrain` makes it a globe OF that ground: drawn from it, and again
// whenever the ground's shape changes.
const globe = b3dPlanet({ terrain: '#sphere-map-ground', radius: 40, relief: 2, flatSea: 'on', atmosphere: 0.05, subdivisions: 96, biome: 'on' })

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.FreeCamera('fly', new BABYLON.Vector3(0, 420, -260), scene)
        cam.setTarget(new BABYLON.Vector3(0, 380, 200))
        cam.speed = 12
        cam.maxZ = 12000
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)

        const pin = BABYLON.MeshBuilder.CreateSphere('pin', { diameter: 3 }, scene)
        const red = new BABYLON.StandardMaterial('pin', scene)
        red.emissiveColor = new BABYLON.Color3(1, 0.15, 0.1)
        red.disableLighting = true
        pin.material = red

        scene.onBeforeRenderObservable.add(() => {
          const root = globe.rootNode
          if (root == null || typeof terrain.latLonAt !== 'function') return
          // The globe rides ahead of the camera, like a map on a stand.
          root.position.set(cam.position.x + 60, cam.position.y + 10, cam.position.z + 190)
          // The camera's place in the world: scene position plus the
          // terrain's floating origin.
          const off = terrain.originOffset
          const here = terrain.latLonAt(cam.position.x + off.x, cam.position.z + off.z)
          if (here == null) return
          const d = latLonToDirection(here.lat, here.lon)
          // The pin sits ON the globe, and the globe turns to show you the
          // side you are on (yaw only, so north stays up).
          pin.parent = root
          pin.position.set(d.x * 43, d.y * 43, d.z * 43)
          const toCam = cam.position.subtract(root.position)
          root.rotation.y = Math.atan2(toCam.x, toCam.z) - Math.atan2(d.x, d.z)
          readout.textContent = `${Math.abs(here.lat).toFixed(2)}° ${here.lat >= 0 ? 'N' : 'S'}   ${Math.abs(here.lon).toFixed(2)}° ${here.lon >= 0 ? 'E' : 'W'}`
        })
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
    b3dLight({ intensity: 0.5 }),
    terrain,
    b3dWater({ y: 0, waterSize: 9000, follow: true }),
    globe,
  ),
  readout,
)
```
```css
.preview { height: 100%; position: relative; }
.readout { position: absolute; left: 12px; bottom: 12px; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font: 13px ui-monospace, monospace; }
```

A small world, and the same world as a globe hung in its own sky. The globe
is not a picture of the terrain: it is built from the terrain's own height
function (`terrain.planetSurface()`), so its coasts are the coasts below. The
red pin is where the camera is, and the globe turns to keep your side of the
world facing you. Fly about (arrow keys, drag to look) and the land under the
pin changes; the readout is your latitude and longitude.

## Three names for one place

Three ways of naming one place:

| | |
| --- | --- |
| **direction** | a unit vector from the planet's centre. What a globe is made of |
| **latitude, longitude** | degrees. What a person writes down. North is +Y |
| **ground** | metres east (+x) and north (+z) of the terrain's origin, in the terrain's own unshifting coordinates: a scene position plus `terrain.originOffset`. What the terrain uses |

`frame` says how the sheet is laid on the sphere: the planet's `radius` and
the `worldU`, `worldV` the terrain's origin sits at.

```javascript
import { groundToLatLon, latLonToGround, latLonToDirection } from 'tosijs-3d/sphere-map'

const frame = { radius: 6000, worldU: 0, worldV: 0.25 }
const pin = { lat: 12, lon: 40 }
latLonToGround(pin.lat, pin.lon, frame) // where to stand: { x, z } in metres
latLonToDirection(pin.lat, pin.lon)     // where to put the marker on the globe
```

The wrapping is the plain latitude and longitude one, so a metre east is the
same number of degrees at every latitude and the ground is squeezed
east-to-west toward the poles. It is exact at the equator and good across the
middle latitudes; a pole is a line, not a point.
