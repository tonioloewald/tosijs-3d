# cloud-shadows

**Projected cloud shadows** — the classic technique, and the only one that works over real
terrain. A flat decal can't conform to hills; the shadow map can't reach a cloud at 300 m
(and would render every cloud into four cascades every frame if it could). So instead the
whole cloud field is painted **top-down into one small texture**, and any material that
receives shadows samples it **by world position** in the fragment shader. Because the
darkening happens per-pixel, it drapes over any topology — hills, valleys, a rolling sea —
for the cost of one texture sample and **zero raycasts**.

The texture is repainted only when something changes (a cloud recycles, coverage moves, the
window recentres on the camera, the sun swings) — the steady state is just the sample.

## Demo

```js
import { b3d, b3dClouds, b3dBox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      // Altitude 115 and a bounded orbit, deliberately: the layer used to sit at 55
      // with the camera orbiting at the same radius, so tilting up put you INSIDE
      // the clouds and the whiteout fog ate the demo — "most of the time I'm not
      // seeing the objects at all, I'm just seeing the fog." Cloud SHADOWS are
      // projected, not raymarched, so lifting the deck costs the demo nothing.
      const cam = orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 55, target: [0, 0, 0] })
      cam.upperRadiusLimit = 90
    },
  },
  // On the stage — cloud shadows are DARKENING, so the scene needs a fill light
  // to darken FROM. Sun alone put every unlit face at zero and the demo read as
  // black boxes on a black floor.
  ...demoStage({ size: 160, tiles: 26, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 11, sun: { x: -0.5, y: -1, z: -0.35 } }),
  b3dClouds({ model: '/cloud.glb', altitude: 115, thickness: 18, spread: 200, size: 38, coverage: 0.5, castShadows: true, shadowStrength: 0.7, seed: 3 }),
  ...Array.from({ length: 9 }, (_, i) =>
    b3dBox({ meshName: `crate-${i}`, size: 3, x: (i % 3) * 10 - 10, y: 1.5, z: Math.floor(i / 3) * 10 - 10, color: '#7a9b6e' })
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

[b3d-clouds](?b3d-clouds.ts) drives this under the hood: set `castShadows` and soft cloud shadows
drift across the ground and the crates below. Drag to orbit; watch the dark patches slide.

## Geometry-independent

The painter takes abstract **blobs** (`x, z, rx, rz, strength`), not meshes — so the cost is
the same whether a cloud is a squashed sphere or a 5,000-triangle sculpt. When modeled clouds
land, a per-model top-down **silhouette sprite** can be stamped instead of the soft ellipse
(`CloudShadowBlob.sprite`) for shadows that read the actual shape — still one-time per model,
still zero per-frame geometry cost.

## Who receives

`attachTo(material)` injects a tiny fragment hook (a Babylon **material plugin**) into a
`StandardMaterial` or `PBRMaterial`. [b3d-clouds](?b3d-clouds.ts) attaches it automatically to
every mesh with `receiveShadows` — the scene's existing "I receive shadows" declaration is
exactly the right opt-in. Sun-direction offset is applied at *paint* time (blob positions are
projected along the light before stamping), so the shader stays a plain straight-down lookup.
