# Primitives: box, sphere, ground

**A box, a sphere and a ground plane, as elements.** The quickest way to put
something in a scene: no model file, a material already on it, and it casts
and receives shadows without being asked. Nearly every demo on this site
starts with these.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere } from 'tosijs-3d'

preview.append(
  b3d(
    { glowLayerIntensity: 0.6 },
    b3dSun(),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ size: 24, texture: 'checker', textureTiles: 12 }),
    b3dBox({ x: -2, y: 0.75, size: 1.5, color: '#c8553d' }),
    b3dBox({ x: 0, y: 0.25, z: 2, width: 3, height: 0.5, depth: 1, color: '#588b8b', solid: 'on' }),
    b3dSphere({ x: 2, y: 1, diameter: 2, color: '#ffd166', glow: 0.4 }),
    b3dSphere({ z: -3, y: 1, diameter: 2, mirror: true })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Position and rotation are the attributes every mesh element has: `x`, `y`,
`z`, and `rx`, `ry`, `rz` in degrees.

## `b3dBox`

| Attribute | Default | |
| --- | --- | --- |
| `meshName` | `'box'` | The Babylon mesh's name (what `scene.getMeshByName` and naming suffixes such as `_nocast` see) |
| `size` | `1` | Edge length of a cube |
| `width` / `height` / `depth` | `0` | Set any of them to make it a slab or a post; `0` uses `size` |
| `color` | `'#ff0000'` | |
| `glow` | `0` | Self-illumination, 0 to 1, as a fraction of `color`. Blooms if the scene has `glowLayerIntensity` |
| `glowColor` | `''` | A different colour for the glow |
| `mirror` | `false` | Polished metal that reflects the scene (see [[b3d-reflections]]) |
| `solid` | `'off'` | `'on'`: a character walks into it instead of through it |

## `b3dSphere`

The same, with `diameter` (`1`) and `segments` (`16`) in place of the box's
dimensions, and `meshName` defaulting to `'sphere'`.

## `b3dGround`

| Attribute | Default | |
| --- | --- | --- |
| `meshName` | `'ground'` | The Babylon mesh's name (`'ground_nocast'` keeps it from casting shadows) |
| `size` | `0` | A square of this side; overrides `width` and `height` |
| `width` / `height` | `4` | |
| `color` | `'#888888'` | |
| `texture` | `''` | An image URL, or `'checker'` (a ruler you can count) or `'noise'` (mottled natural ground) |
| `textureTiles` | `8` | Repeats across the plane; for `'noise'`, the number of features |
| `holes` (JS) | `null` | Rectangles `{ x, z, width, depth }` cut out of it, for a pool or a pit; the texture runs on unbroken around them. Whole-metre edges |

A ground is always solid. Boxes and spheres are scenery unless you say
`solid: 'on'`, because a decorative box that quietly starts blocking a doorway
is a worse surprise than one you have to ask for. A solid under about half a
metre tall gets an invisible taller collider automatically, since character
collision does not notice anything shorter (`solidProxy: 'off'` declines it).

For shapes beyond these three, `el.make.*` builds any Babylon primitive with
the same conveniences: see [[make-mesh]]. For a model file, [[b3d-loader]].
