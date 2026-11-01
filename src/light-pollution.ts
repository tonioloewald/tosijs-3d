/*#
# light pollution

A lit town washes the stars out of its own sky. In the middle of a city at
night only the brightest few show, under a warm glow along the horizon;
drive out into the country and the rest come back.

Anything that lights up the night registers a SOURCE with the scene: where it
is, how far its glow reaches, and how strong it is now (a city's follows its
street lights, so it is nothing by day). The sky asks how polluted the sky is
at the camera, every frame, and dims its faint stars and adds the glow.

```javascript
import { lightPollutionSource } from 'tosijs-3d'

// A town of 500 m across whose lights are on.
const release = lightPollutionSource(scene, {
  centre: () => ({ x: 0, z: 0 }),
  radius: 250,
  strength: () => 0.9,
})
```

`<tosi-b3d-city>` registers one for itself. `<tosi-b3d-skybox>` reads them,
and its `lightPollution` attribute is the base for the whole sky (0, a dark
sky; 0.3, a suburb's), which the sources add to.

## How it adds up

Inside a source's `radius` its full strength; outside, it falls off with the
square of the distance in radii, so a town three radii away still pales the
sky a little. Two sources combine like two veils: `1 - (1 - a)(1 - b)`, so the
total never passes 1.
*/
/*{ "parent": "sky-and-light", "order": 12 }*/

/** Something that lights the night sky. */
export interface LightPollutionSource {
  /** Where it is, now (world metres; a getter, so it follows origin shifts). */
  centre: () => { x: number; z: number }
  /** Metres: full strength within this of the centre. */
  radius: number
  /** 0…1, now. */
  strength: () => number
}

/** How much one source pollutes the sky at a distance from its centre. */
export function pollutionFrom(strength: number, radius: number, distance: number): number {
  if (strength <= 0 || radius <= 0) return 0
  const out = Math.max(0, distance - radius) / radius
  return Math.min(1, strength) / (1 + out * out)
}

/** Pollutions combined like veils: never past 1. */
export function combinePollution(values: Iterable<number>): number {
  let clear = 1
  for (const v of values) clear *= 1 - Math.max(0, Math.min(1, v))
  return 1 - clear
}

const registries = new WeakMap<object, Set<LightPollutionSource>>()

/** Register a source with a scene. Returns its release. */
export function lightPollutionSource(scene: object, source: LightPollutionSource): () => void {
  let set = registries.get(scene)
  if (set == null) registries.set(scene, (set = new Set()))
  set.add(source)
  return () => set!.delete(source)
}

/** The sky's pollution at a point in a scene, from `base` (0…1) and every source. */
export function lightPollutionAt(scene: object, x: number, z: number, base = 0): number {
  const values = [base]
  for (const s of registries.get(scene) ?? []) {
    const c = s.centre()
    values.push(pollutionFrom(s.strength(), s.radius, Math.hypot(x - c.x, z - c.z)))
  }
  return combinePollution(values)
}
