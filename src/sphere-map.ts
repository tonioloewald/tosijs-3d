/*#
# sphere-map

**Where a place on the ground is on the globe, and back.** A terrain in
`surfaceType="sphere"` is a flat sheet wrapped round a planet: walk far enough
east and you come back. This is the arithmetic of that wrapping, as pure
functions, so that a planet seen from orbit and the ground you land on can
agree about where things are.

## Demo

A small world, and the same world as a globe hung in its own sky. The globe
is not a picture of the terrain: it is built from the terrain's own height
function (`terrain.planetSurface()`), so its coasts are the coasts below. The
red pin is where the camera is, and the globe turns to keep your side of the
world facing you. Fly about (arrow keys, drag to look) and the land under the
pin changes; the readout is your latitude and longitude.

```js
import { b3d, b3dTerrain, b3dPlanet, b3dWater, b3dSun, b3dSkybox, b3dLight, latLonToDirection } from 'tosijs-3d'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' }, 'finding the ground…')

// A whole planet 4 km in radius, so that a globe of it shows real relief.
const terrain = b3dTerrain({
  seed: 11, biome: 'on', surfaceType: 'sphere', radius: 4000,
  tileSize: 128, lodLevels: 3, splitFactor: 2, reach: 4000,
  grossScale: 0.0016, detailScale: 0.012, grossAmplitude: 320, detailAmplitude: 24,
  center: true,
})
const globe = b3dPlanet({ radius: 40, relief: 2, ocean: 0.5, atmosphere: 0.05, subdivisions: 96 })

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

        let built = ''
        scene.onBeforeRenderObservable.add(() => {
          const root = globe.rootNode
          if (root == null || typeof terrain.planetSurface !== 'function') return
          // The globe rides ahead of the camera, like a map on a stand.
          root.position.set(cam.position.x + 60, cam.position.y + 10, cam.position.z + 190)
          // Build it from the terrain once the terrain has a shape (and again
          // whenever that shape changes).
          const key = terrain.generationKey
          if (key && key !== built) {
            const surface = terrain.planetSurface()
            if (surface != null) {
              built = key
              globe.surface = surface
              globe.regenerate()
            }
          }
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
*/
/*{ "parent": "space", "order": 60 }*/

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** How a terrain's sheet is laid on its sphere. */
export interface SphereFrame {
  /** The planet's radius, metres (the terrain's `radius`). */
  radius: number
  /** Where the terrain's origin sits, as fractions of a turn (its `worldU`/`worldV`). */
  worldU: number
  worldV: number
}

/**
 * A world's surface as a globe needs it: how high the ground is in any
 * direction from the centre. A terrain in sphere mode hands one out
 * (`terrain.planetSurface()`), and `<tosi-b3d-planet>` draws from it, which
 * is what makes the planet you see from orbit the one you land on.
 */
export interface PlanetSurface {
  /** The planet's true radius, metres. */
  radius: number
  /** Height of the sea (or of the datum, on a dry world), metres. */
  seaLevel: number
  /** Ground height in metres, in a direction from the centre (any length). */
  heightAt(direction: Vec3): number
}

const TWO_PI = Math.PI * 2
const wrap01 = (t: number): number => t - Math.floor(t)

/** Fractions of a turn (u east, v from the north pole down) to a unit vector. */
export function uvToDirection(u: number, v: number): Vec3 {
  const theta = u * TWO_PI
  const phi = v * Math.PI
  const s = Math.sin(phi)
  return { x: s * Math.cos(theta), y: Math.cos(phi), z: s * Math.sin(theta) }
}

/** A direction (any length) to fractions of a turn; `u` in 0…1, `v` in 0…1. */
export function directionToUv(d: Vec3): { u: number; v: number } {
  const len = Math.hypot(d.x, d.y, d.z) || 1
  const v = Math.acos(Math.max(-1, Math.min(1, d.y / len))) / Math.PI
  return { u: wrap01(Math.atan2(d.z, d.x) / TWO_PI), v }
}

/** Latitude and longitude in degrees to a unit vector. North is +Y. */
export function latLonToDirection(lat: number, lon: number): Vec3 {
  return uvToDirection(lon / 360, (90 - lat) / 180)
}

/** A direction to latitude (−90…90) and longitude (−180…180), degrees. */
export function directionToLatLon(d: Vec3): { lat: number; lon: number } {
  const { u, v } = directionToUv(d)
  return { lat: 90 - v * 180, lon: u > 0.5 ? u * 360 - 360 : u * 360 }
}

/**
 * Metres on the ground to the TERRAIN SAMPLER's fractions of a turn: its own
 * `(u, v)`, in which `v` grows with `z`. Not a latitude: see the note on the
 * mirror below, and use `groundToLatLon` for a place.
 */
export function groundToUv(
  x: number,
  z: number,
  frame: SphereFrame
): { u: number; v: number } {
  return {
    u: frame.worldU + x / (TWO_PI * frame.radius),
    v: frame.worldV + z / (Math.PI * frame.radius),
  }
}

/**
 * Fractions of a turn to metres on the ground. Going east wraps, so `x` is
 * the NEAREST copy of that longitude: never more than half way round.
 */
export function uvToGround(
  u: number,
  v: number,
  frame: SphereFrame
): { x: number; z: number } {
  let du = wrap01(u - frame.worldU)
  if (du > 0.5) du -= 1
  return {
    x: du * TWO_PI * frame.radius,
    z: (v - frame.worldV) * Math.PI * frame.radius,
  }
}

/*
+X IS EAST AND +Z IS NORTH, and that takes a mirror.

The terrain's own wrap runs its `v` from one pole to the other as z grows,
and taken at face value that makes +z SOUTH: seen from above, with +x to the
right and +z up the screen, the ground was then the mirror image of the globe
built from it, and anyone walking +z to go north went south. The wrap is the
terrain's and is not ours to change, so the mirror is put right here: the
globe is the sampler's sphere reflected top to bottom. Nothing else moves:
every ground point still has one direction and one height.

(So a terrain at the default `worldV` of 0.25 has its origin at 45 degrees
SOUTH. Give it 0.75 for 45 north.)
*/

/** Where on the globe a spot on the ground is. */
export function groundToDirection(
  x: number,
  z: number,
  frame: SphereFrame
): Vec3 {
  const { u, v } = groundToUv(x, z, frame)
  const d = uvToDirection(u, v)
  return { x: d.x, y: -d.y, z: d.z }
}

/** Where on the ground a direction on the globe is. */
export function directionToGround(
  d: Vec3,
  frame: SphereFrame
): { x: number; z: number } {
  const { u, v } = directionToUv({ x: d.x, y: -d.y, z: d.z })
  return uvToGround(u, v, frame)
}

export function groundToLatLon(
  x: number,
  z: number,
  frame: SphereFrame
): { lat: number; lon: number } {
  return directionToLatLon(groundToDirection(x, z, frame))
}

export function latLonToGround(
  lat: number,
  lon: number,
  frame: SphereFrame
): { x: number; z: number } {
  return directionToGround(latLonToDirection(lat, lon), frame)
}
