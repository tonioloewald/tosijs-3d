# formations

Pure, deterministic **placement patterns** — where the members of an encounter stand relative
to its centre. A mothership with escorts around it, a base with turrets on its perimeter, a
patrol flying a vee.

No Babylon, no elements, no randomness that isn't seeded: just offsets. That means an
encounter's *shape* is unit-testable without a 3D engine, and the same seed always produces
the same battle — which is what lets a scenario be replayed (and what lets a GM's benchmark
mean anything).

Offsets are `{x, y, z}` in the encounter's local frame: **+y is up, +z is forward**.

## Demo

The functions just return offsets — here a crate is dropped at each slot of a **vee** so you can
*see* the shape the pure math produces (the lead ship red, the wings blue). Drag to orbit.

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, vee } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

// vee(count, opts) → an array of {x, y, z} offsets. The sim just places a mesh at each.
const slots = vee(7, { spacing: 3, sweep: 2.5 })

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 30, target: [0, 0, -4] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 80, height: 80, texture: 'checker', textureTiles: 40 }),
  ...slots.map((o, i) =>
    b3dBox({ meshName: `ship-${i}`, size: i === 0 ? 1.7 : 1.2, x: o.x, y: 0.7, z: o.z, color: i === 0 ? '#c85a3a' : '#5aa0c8' })
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

For reference, the raw call — no scene needed, just offsets:

```javascript
import { ring, vee, escorts } from 'tosijs-3d'

// Four escorts in a ring 30 units out, 5 above the leader.
for (const at of ring(4, 30, { y: 5 })) spawnEscort(at)
```
