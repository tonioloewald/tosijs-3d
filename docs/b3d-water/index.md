# b3d-water

Water plane with reflections, waves, and underwater fog effect.

## Demo

**A lake with a few crates on the shore.** The sun rakes across the surface; the water reflects the
sky and the crates. Drag to orbit — dip the camera below the surface and the world tints and dims.

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

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `textureSize` | `0` (auto) | Size of the reflection and refraction textures. Each is the whole scene drawn again. `0` follows the device tier: 1024 / 512 / 256 |
| `reflectionRefresh` | `0` (auto) | Redraw those textures every Nth frame. `0` follows the device tier: 1 / 2 / 3. `1` is every frame. It applies in a headset too: one drawing serves both eyes and later frames, looked up through the view it was drawn from |
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `underside` | `'auto'` | Snell's window from below: straight up, a bright window onto the sky; toward grazing angles, a mirror of the depths. `'auto'` = on whenever `twoSided`; `'on'`/`'off'` force it. Fades in with the underwater fog |
| `fogColor` | `'#00264d'` | The colour of the water you are IN (the underwater fog). Sea blue by default; a methane sea (Titan) is dark amber |
| `undersideColor` | `'#9fdcf0'` | The window: the sky's light, looking up |
| `undersideDepthColor` | `'#06283a'` | The mirror: the dark water, at grazing angles |
| `undersideSky` | `1` | From below, the window REFRACTS THE REAL SKY (the sun included), distorted by the ripples — clearest in the shallows, fading with depth, giving way to the dark mirror toward grazing angles. `0` = the flat `undersideColor` only |
| `caustics` | `'auto'` | Light through the moving surface, dancing on everything beneath it (terrain, hulls, the player). `'auto'` = on whenever `twoSided`. Fades with depth and fog; follows the sun |
| `causticsStrength` | `0.6` | How bright the web gets |
| `causticsScale` | `6` | Metres per caustic cell: bigger is coarser and calmer |
| `shore` | `'off'` | `'on'` gives the surface the depth of the water under it, from the scene's terrain, and draws a shoreline from it: surf running in, pale shallows, and ice that spreads out from the land when the climate at sea level is below freezing. See [water-shore](/water-shore/). Not for `spherical` water. Set at build time |
| `shoreFine` | `false` | With `shore="on"`: a water vertex every 2 m near the viewer where there is otherwise one every 4 m (about 16,600 vertices, up from 9,400). The surf follows a winding shore more closely; each refresh of the shore data (when the water re-centres, every 32 m travelled) costs about two thirds more. Set at build time |
| `receiveShadows` | `'on'` | The surface (and the ice on it) takes shadows from the sun and from clouds. `'off'` skips both lookups per water pixel |
| `follow` | `false` | Ride the camera in x/z (endless sea): the plane snaps to a coarse grid under you, ripples stay anchored in world space |
| `windForce` | `-5` | Wind strength |
| `waveHeight` | `0` | Wave amplitude |
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
