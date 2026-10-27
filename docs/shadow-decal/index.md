# shadow-decal

A **soft blob shadow** — the oldest trick in real-time 3D, and still the right one in a lot of
places. Instead of routing a caster through the shadow map (expensive, and useless for anything
the cascaded map doesn't reach — a cloud at 140 m, a bird, a thrown grenade), you drop a dark,
soft-edged quad on the ground beneath it. It costs one textured, alpha-blended plane and no
shadow-map real estate at all.

It is deliberately NOT a real shadow: it doesn't know the caster's silhouette and it doesn't
sharpen with proximity. What it buys is *grounding* — the eye reads "this thing is above that
spot" — and for soft, high, or numerous casters (clouds, a flock, ambient debris) that reads
better than a crisp CSM shadow would anyway.

## Demo

```js
import { b3d, b3dBox, createShadowDecal } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 15, beta: Math.PI / 3.2, target: [0, 1.2, 0] })
      // a soft grounding decal, placed where the SUN projects the floater onto the ground — so it
      // lines up with the light direction, not just straight down (which read wrong under an angled sun).
      const decal = createShadowDecal(el.scene, { size: 3.2 })
      const floater = new BABYLON.Vector3(0, 2.6, 0)
      const place = () => {
        const sun = el.scene.lights.find((l) => l.getClassName?.() === 'DirectionalLight')
        if (!sun) return
        const d = sun.direction.normalizeToNew() // light travel direction (points down-and-across)
        const t = floater.y / -d.y
        decal.position.set(floater.x + d.x * t, 0.02, floater.z + d.z * t)
        el.scene.onBeforeRenderObservable.removeCallback(place) // place once, then stop
      }
      el.scene.onBeforeRenderObservable.add(place)
    },
  },
  ...demoStage({ size: 24, tiles: 10, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 10 }),
  // `_nocast` so no real CSM shadow competes with the decal — the decal IS the grounding shadow here
  b3dBox({ meshName: 'floater_nocast', size: 2, x: 0, y: 2.6, z: 0, color: '#c85a3a' }),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

**A floating crate, grounded by a soft blob.** No shadow map is involved — just one alpha quad
`createShadowDecal` drops on the ground beneath it. Drag to orbit; the decal reads the crate's
position over the floor.

## Two ways to place one

- **`projectShadowDown`** — raycast straight down and lay the decal on whatever surface it hits
  (a character, a vehicle, a dropped item). Hugs terrain height; costs one ray per placement.
- **Flat placement** — just set `mesh.position`. For a *field* of decals (a whole cloud layer)
  a per-decal ray each frame is wasteful; sample the ground height once under the camera and
  drop every decal on that plane. Softness hides the lack of terrain-hugging.

## Sharing

All decals in a scene share **one** texture and **one** material (both cached per scene). Vary a
decal per-instance without breaking the sharing:

- **size** → `mesh.scaling.x/z`
- **darkness** → `mesh.visibility` (0…1, multiplies the blended alpha — works precisely because
  the material is shared and visibility is per-mesh)

That's the same discipline the clouds use for their blobs: one material, per-mesh transform and
visibility. See [b3d-clouds](?b3d-clouds.ts), the first consumer.
