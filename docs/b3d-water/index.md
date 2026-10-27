# b3d-water

Water plane with reflections, waves, and underwater fog effect.

## Demo

```js
import { b3d, b3dSkybox, b3dWater, b3dReflections, b3dGround, sceneDelta } from 'tosijs-3d'
import { demoSun, orbitCam, spinner } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 24, beta: Math.PI / 2.8, target: [0, 0.4, 0] })
      // crates floating ON the surface (bottom at the water line), bobbing on the swell
      const a = spinner(el, { x: -5, y: 1.0, z: -3, size: 2, spin: 0.12 })
      const b = spinner(el, { x: 4.5, y: 0.7, z: 4, size: 1.4, spin: -0.18 })
      let t = 0
      el.scene.registerBeforeRender(() => {
        t += sceneDelta(el.scene)
        a.position.y = 1.0 + Math.sin(t * 1.1) * 0.14
        b.position.y = 0.7 + Math.sin(t * 1.5 + 1) * 0.14
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 9 }),
  // a textured seafloor, visible through the translucent water — gives the surface real depth
  b3dGround({ y: -1.2, width: 60, height: 60, texture: 'checker', textureTiles: 20, color: '#3a5f6b' }),
  b3dWater({ waterSize: 60, waveHeight: 0.4, windForce: -4, twoSided: true }),
  b3dReflections(),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

**A lake with a few crates on the shore.** The sun rakes across the surface; the water reflects the
sky and the crates. Drag to orbit — dip the camera below the surface and the world tints and dims.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `textureSize` | `0` (auto) | Size of the reflection and refraction textures. Each is the whole scene drawn again. `0` follows the device tier: 1024 / 512 / 256 |
| `reflectionRefresh` | `0` (auto) | Redraw those textures every Nth frame. `0` follows the device tier: 1 / 2 / 3. `1` is every frame. It applies in a headset too: one drawing serves both eyes and later frames, looked up through the view it was drawn from |
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `underwaterFog` | `0.12` | Fog density the moment the camera is under the surface |
| `underwaterMurk` | `0.08` | Extra fog density at 30 m down: the sea thickens with depth |
| `fogTransition` | `0.2` | Metres below the surface to reach full underwater fog. Tight on purpose, so crossing the surface has no visible jump |
| `underside` | `'auto'` | Snell's window from below: straight up, a bright window onto the sky; toward grazing angles, a mirror of the depths. `'auto'` = on whenever `twoSided`; `'on'`/`'off'` force it. Fades in with the underwater fog |
| `fogColor` | `'#00264d'` | The colour of the water you are IN (the underwater fog). Sea blue by default; a methane sea (Titan) is dark amber |
| `undersideColor` | `'#9fdcf0'` | The window: the sky's light, looking up |
| `undersideDepthColor` | `'#06283a'` | The mirror: the dark water, at grazing angles |
| `undersideSky` | `1` | From below, the window REFRACTS THE REAL SKY (the sun included), distorted by the ripples — clearest in the shallows, fading with depth, giving way to the dark mirror toward grazing angles. `0` = the flat `undersideColor` only |
| `caustics` | `'auto'` | Light through the moving surface, dancing on everything beneath it (terrain, hulls, the player). `'auto'` = on whenever `twoSided`. See **Caustics** below |
| `causticsStrength` | `0.6` | How bright the web gets |
| `causticsScale` | `6` | Metres per caustic cell: bigger is coarser and calmer |
| `shore` | `'off'` | `'on'` gives the surface the depth of the water under it, from the scene's terrain, and draws a shoreline from it: surf running in, pale shallows, and ice that spreads out from the land when the climate at sea level is below freezing. See **Shore and ice** below. Not for `spherical` water. Set at build time |
| `shoreFine` | `false` | With `shore="on"`: a water vertex every 2 m near the viewer where there is otherwise one every 4 m (about 16,600 vertices, up from 9,400). The surf follows a winding shore more closely; each refresh of the shore data (when the water re-centres, every 32 m travelled) costs about two thirds more. Set at build time |
| `receiveShadows` | `'on'` | The surface (and the ice on it) takes shadows from the sun and from clouds. `'off'` skips both lookups per water pixel |
| `follow` | `false` | Ride the camera in x/z (endless sea): the plane snaps to a coarse grid under you, ripples stay anchored in world space |
| `normalMap` | `''` | URL of a bump map for the ripples. Empty uses a tiling normal map generated from Perlin noise: no file, no network, so it works offline and in a headset |
| `wind` | `'scene'` | `'scene'` takes the waves' wind from the scene's [wind](/wind/) when it has one; `'own'` always uses the three attributes below. A scene with no wind leaves them in charge either way |
| `windForce` | `-5` | Wind strength |
| `windDirectionX` | `0.6` | Wind direction, x part (roughly a unit vector with `windDirectionY`) |
| `windDirectionY` | `0.8` | Wind direction, y part |
| `waveHeight` | `0` | Wave amplitude |
| `waveLength` | `0.1` | Wave length |
| `bumpHeight` | `0.1` | Normal map bump intensity |
| `waterColor` | `'#0066cc'` | Water tint color |
| `colorBlendFactor` | `0.1` | How much color tints the water |
| `spherical` | `false` | Use a sphere instead of a plane |

## Underwater Effect

When the camera goes below the water surface, a blue fog is automatically applied.
The sun (if present via `b3dSun`) is also dimmed based on depth.

```javascript
import { b3d, b3dWater, b3dSun, b3dSkybox } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dSun({}),
    b3dSkybox({ timeOfDay: 12 }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 })
  )
)
```

## Caustics

Light through a moving surface, dancing on what is under it: the strongest
"this is underwater" cue after the colour. A material plugin samples a tiling
caustic pattern by WORLD position, so it lands on terrain, hulls, the player,
anything, with no per-mesh setup. It is drawn only below the water surface,
projected along the sun so the pattern slants as the sun does, and it fades
with depth and with the fog, because a fully fogged fragment must stay fog.
Two layers scroll at different rates and combine with `min`, which is what
makes caustics shimmer rather than slide.

The pattern (`causticPattern`) is a seeded cellular (Worley) field, bright
along the cell edges the way real caustic networks are. Like the normal map it
is sampled on a torus, so it tiles exactly by construction. No file, no
network.

## Shore and ice

With `shore="on"` each vertex of the water's mesh carries four numbers: the
**depth** of the water there, how much **ice** covers it, how **solid** that
ice is, and the **distance** to the waterline. It needs a
[terrain](/b3d-terrain/) in the scene to read depths from, and the ice also
needs that terrain's `biome="on"`, which is where the temperature comes from.
It draws:

- a **shoreline**: wave fronts that rise about 16 m out and run in to the
  shore one after another, with a wet edge lapping at the waterline (drawn
  from the distance, so it is as wide under a cliff as on a flat), and paler
  water over the shallows (drawn from the depth);
- **ice**, in three states that run into each other: a solid sheet, then
  broken plates with water between them, then open water.

### Where the ice is

Ice follows the cold and the shore. `iceCover(temperature, depth)` is the whole
rule: nothing above the sea's freezing point (about -2 °C); below it the
shallows freeze first and the cover spreads outward into deeper water as it
gets colder. So one cold bay has a solid sheet along the beach, breaking into
plates further out, and open sea beyond. The temperature is the terrain's
climate at sea level INCLUDING the season, so the sea freezes in winter and
breaks up in spring.

| Cover | What is drawn |
|-------|---------------|
| `0` | Open water |
| up to about `0.9` | Plates: more of them, and wider, as the cover rises |
| `1` | A sheet, with hairline cracks where the plates met |

Colder still and the cracks close: `iceSolid` runs from that cracked sheet to
one unbroken surface, shallows first.

### Walking on it

Ice is water until it is solid. `iceBears` is true once the cracks have mostly
closed, and there the water carries an invisible collision mesh: the same
vertices, only the triangles whose ice bears. Anything that collides or picks
meets it like ground, and it is in the `ice` collision group for anything that
wants to tell it from land. Short of solid (plates, or a sheet still showing
its cracks) there is nothing there and you fall through and swim. Waves stop
under ice, so the sheet is flat where it collides.

A [biped](/b3d-biped/) swimming at the surface climbs onto solid ice; one that
dived first goes under it, with the ice as a ceiling. `water.iceBearsAt(x, z)`
asks the question for a point in the scene.

### A mesh that is fine where you are

Depth lives on vertices, so the mesh decides how sharp the shoreline is. The
shore grid is a square grid whose lines are close together in the middle
(4 m by default) and spread geometrically toward the edge, so a sea 8 km
across costs under ten thousand vertices and still has a vertex every few
metres around the viewer. `shoreFine` asks for a finer one: a vertex every
2 m out to 64 m.
