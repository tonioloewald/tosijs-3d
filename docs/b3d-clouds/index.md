# b3d-clouds

A cloud layer you can **fly into** — and lose the world inside.

Not a skybox texture and not a shader: a few dozen **opaque** blobs at an altitude, plus a
**fog whiteout** that goes total *before* you reach one. Fly into a cloud and the world is
already gone; you're in white until you come out the far side.

## It's a TACTIC, not a texture

`insideCloud` (0…1) is exposed, so a cloud is something the game can *use*: break a radar
lock, shake a pursuer, hide a mothership until you're on top of it. That is the whole point
— **behavioural richness, not photorealism** (see [AI-DESIGN.md](https://github.com/tonioloewald/tosijs-3d/blob/main/AI-DESIGN.md)). A cloud you can hide in is
worth more than a cloud that merely looks convincing.

## Demo

**Climb into the cloud layer** (R to throttle up, W/S pitch). Watch the world white out as
you enter, and the readout climb. Then dive back out.

```js
import { b3d, b3dAircraft, b3dClouds } from 'tosijs-3d'
import { flightStage } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div } = elements

// `plane` is a FACTORY because flightStage's death panel respawns you — pass an
// instance and the first crash is unrecoverable.
const stage = flightStage({
  plane: () => b3dAircraft({
    library: 'vehicles', meshName: 'scout',
    player: true, y: 40, vtolSpeed: 6, maxSpeed: 60,
  }),
  library: '/test-3.glb',
})
const clouds = b3dClouds({ model: '/cloud.glb', altitude: 140, thickness: 40, count: 40, size: 70, castShadows: true, seed: 7 })
const readout = div({ class: 'readout' })

const scene = b3d({ gamepad: true }, ...stage.elements, clouds)

setInterval(() => {
  const t = clouds.insideCloud
  // `stage.aircraft`, not a captured reference — respawn replaces it.
  readout.textContent = `altitude ${(stage.aircraft.altitude ?? 0).toFixed(0)}   in cloud ${(t * 100).toFixed(0)}%`
  readout.style.color = t > 0.5 ? '#fff' : '#9fb'
}, 100)

preview.append(scene, readout)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.readout {
  position: absolute; bottom: 12px; left: 12px;
  padding: 6px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.55); color: #9fb;
  font: 13px ui-monospace, monospace; z-index: 10;
}
```

## How it works

- **Clouds are CLUSTERS of eggs.** Each cloud is 2–4 overlapping tapered-egg blobs of
  different sizes and yaws around one anchor, so the silhouette has structure instead of
  reading as a bag of bubbles — fewer clouds, better shapes. The anchor drifts and wraps as
  a unit (`count` is still the blob POOL; clusters are carved out of it).
- **A fixed number of blobs, recycled.** `count` soft spheres are scattered (seeded) in a
  disc around you. Fly far enough and a blob that falls behind **wraps to the far side** —
  so an endless cloudscape costs a fixed, tier-friendly number of meshes and never
  allocates. (Same discipline as the terrain tile pool.)
- **The whiteout is FOG, not a post-process.** Post-processes are expensive in XR and
  awkward in stereo; fog is per-pixel and effectively free. Immersion ramps `fogDensity` up
  and `fogColor` toward the cloud's colour, then **restores whatever `b3d-fog` had set** on
  the way out — so the two compose instead of fighting.
- **Lit, not flat.** The blobs are lit by the scene's sun, so their tops catch light and their
  undersides fall dark — which is most of what reads as *cloud* rather than a decal. `selfIllum`
  keeps a thin cloud glowing a little (`selfIllum: 1` is fully self-lit); a
  thunderhead wants it near 0 so the underbelly goes properly dark.
- **The whiteout darkens as you sink.** Inside a cloud the fog colour isn't a flat white — it's
  white near the top of the layer and murkier the deeper you go, and a thick/heavy (`coverage`)
  cloud goes properly dark while a thin one barely dims. That's the difference between flying
  through a fair-weather puff and the gloom inside a thunderhead.
- **One dial from clear sky to thunderheads.** `coverage` (0…1) is the weather knob — it gates how
  many blobs are in the sky, how opaque and dark they are, and how much they self-illuminate.
  Bind it to a slider and fly from wisps to overcast. (Blob *size* is fixed at build, so that one
  needs a reload; everything else moves live.)
- **Clouds are never pickable; shadows are a projected texture.** A cloud between your controller
  and a panel — or between a missile and its target — would silently break picking and swept
  collision, so `isPickable` is always off. Shadow *casting* is `castShadows` (default off) and
  goes through neither the shadow map (a cloud at altitude is out of cascade range) nor decals (a
  flat quad can't conform to terrain): the whole field is painted top-down into **one small
  texture** ([cloud-shadows](?cloud-shadows.ts)) that every shadow-receiving material samples by
  world position — so the shadows drape over hills and valleys per-pixel, offset along the sun,
  darkened by `shadowStrength` × `coverage`, repainted only when the sky actually changes.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `model` | `''` | GLB whose mesh is the cloud LOBE (normalized to the blob radius, bottom-aligned). Empty = the procedural lobe |
| `count` | `36` | Blob POOL size (fixed — they recycle, they don't grow). `coverage` decides how many are active |
| `altitude` | `140` | Centre height of the layer |
| `thickness` | `36` | Vertical spread of the layer |
| `spread` | `1200` | Radius of the disc of cloud around you |
| `size` | `70` | Blob radius — also the distance at which whiteout is total. Set at build |
| `color` | `'#ffffff'` | Cloud (and whiteout) colour |
| `opacity` | `1` | Blob alpha. Default OPAQUE — translucent clouds read badly. Set < 1 only for deliberate wisps |
| `fogDensity` | `1.0` | Whiteout density (EXP2, the scene's mode). HIGH on purpose — inside a cloud you should see nothing but white within a few metres |
| `approach` | `0.5` | Where the whiteout BEGINS, × `size` outside the blob. It's TOTAL well before the surface (you never see the geometry edge) and stays total until you leave |
| `selfIllum` | `0.35` | Self-illumination 0…1 — `1` ≈ fully self-lit, `0` = only sun-lit (dark undersides) |
| `coverage` | `0.5` | Weather dial 0…1: wisps → overcast/thunderheads. LIVE. Gates active count + opacity + darkness + self-illum |
| `castShadows` | `false` | Opt-in: project the field's shadows onto every shadow-receiving surface ([cloud-shadows](?cloud-shadows.ts)) |
| `shadowStrength` | `0.65` | Darkness of those shadows 0…1, scaled further by `coverage` (≈50% darkening at typical coverage) |
| `seed` | `1` | Deterministic layout — same seed, same sky |
| `wind` | `'scene'` | `'scene'` drifts with the scene's [wind](/wind/) when it has one; `'own'` always uses `windX`/`windZ` |
| `windX` / `windZ` | `4` / `1.5` | The layer's own drift, m/s in world X and Z. Recycled blobs wrap in from upwind and fade up, so the sky reads as weather rather than a frozen image |
