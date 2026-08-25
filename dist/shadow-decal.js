/*#
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

**A floating crate, grounded by a soft blob.** No shadow map is involved — just one alpha quad
`createShadowDecal` drops on the ground beneath it. Drag to orbit; the decal reads the crate's
position over the floor.

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
*/
/*{ "parent": "Effects" }*/
import * as BABYLON from '@babylonjs/core';
import { collidable } from './b3d-utils';
const TEX_CACHE = new WeakMap();
const MAT_CACHE = new WeakMap();
/** Lift a decal this far off the surface it sits on, to keep it out of a z-fight with the ground. */
const DEFAULT_BIAS = 0.05;
/** A soft round dark blob: opaque-ish at the centre, fading to fully transparent at the rim.
 * Cached per scene — every decal shares it. */
export function softShadowTexture(scene, resolution = 128) {
    const cached = TEX_CACHE.get(scene);
    if (cached)
        return cached;
    const tex = new BABYLON.DynamicTexture('shadow-decal-tex', { width: resolution, height: resolution }, scene, false);
    const r = resolution / 2;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    // A soft foot: strong core, a long shoulder, nothing at the very edge (no visible disc rim).
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, resolution, resolution);
    tex.update();
    tex.hasAlpha = true;
    TEX_CACHE.set(scene, tex);
    return tex;
}
/** The shared, unlit, alpha-blended black material every decal draws with. Cached per scene. */
export function shadowDecalMaterial(scene) {
    const cached = MAT_CACHE.get(scene);
    if (cached)
        return cached;
    const mat = new BABYLON.StandardMaterial('shadow-decal-mat', scene);
    mat.diffuseTexture = softShadowTexture(scene);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true; // it IS the shadow — don't let the scene light it
    mat.diffuseColor = BABYLON.Color3.Black();
    mat.emissiveColor = BABYLON.Color3.Black();
    mat.specularColor = BABYLON.Color3.Black();
    mat.backFaceCulling = false;
    MAT_CACHE.set(scene, mat);
    return mat;
}
/** A single flat, ground-facing soft-shadow quad using the shared decal material. Not pickable,
 * casts/receives no real shadows. Size via `mesh.scaling.x/z`, darkness via `mesh.visibility`. */
export function createShadowDecal(scene, opts = {}) {
    const size = opts.size ?? 1;
    // CreateGround is already a horizontal XZ plane with its normal facing +Y — exactly a decal.
    const mesh = BABYLON.MeshBuilder.CreateGround(opts.name ?? 'shadow-decal', { width: 1, height: 1 }, scene);
    mesh.material = shadowDecalMaterial(scene);
    mesh.scaling.x = mesh.scaling.z = size;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.doNotSyncBoundingInfo = true;
    // Alpha-blended, so it renders in the transparent pass over the opaque ground anyway; the y-bias
    // (at placement) is what actually keeps it off the surface.
    return mesh;
}
/** Lay `decal` flat on the first surface directly below `(x, z)`. Returns false (and leaves the
 * decal where it was) if nothing was hit. One raycast — fine for a single caster (character,
 * vehicle, dropped item); for a whole FIELD, place flat on a shared sampled plane instead. */
export function projectShadowDown(decal, scene, x, z, opts = {}) {
    const from = opts.fromHeight ?? 200;
    const ray = new BABYLON.Ray(new BABYLON.Vector3(x, from, z), BABYLON.Vector3.Down(), opts.maxDistance ?? 1000);
    /*
    `collidable()`, not a bare `isPickable` check — a UI panel IS pickable, so the
    old default let a blob shadow land on a floating dialog. `collidable` also
    re-checks `isEnabled`, which Babylon skips whenever a predicate is passed.
  
    A caller can still supply its own predicate; this is only the default, and the
    default is the one that has to be safe.
    */
    const predicate = opts.predicate ?? collidable();
    const hit = scene.pickWithRay(ray, predicate);
    if (!hit?.pickedPoint)
        return false;
    decal.position.copyFrom(hit.pickedPoint);
    decal.position.y += opts.bias ?? DEFAULT_BIAS;
    return true;
}
//# sourceMappingURL=shadow-decal.js.map