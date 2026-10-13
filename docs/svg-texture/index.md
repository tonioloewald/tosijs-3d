# svg-texture

Renders SVG content to a Babylon.js texture via an offscreen canvas.

## Modes

- **Static** (`url`): fetches SVG from a URL and renders once.
- **Dynamic** (`element`): reads a live SVG element on an interval
  (default 30 ms), capturing changes from tosijs bindings or any other
  DOM mutations. Great for HUDs, radar displays, instrument panels.

## Example — SVG on a cube

```js
import { b3d, b3dLight, SvgTexture } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 5, target: [0, 0, 0] })

      const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1.5 }, el.scene)
      box.position.y = 0

      const tex = new SvgTexture({
        scene: el.scene,
        url: '/tosi-test-pattern.svg',
        resolution: 512,
      })

      const mat = new BABYLON.StandardMaterial('svg-mat', el.scene)
      mat.diffuseTexture = tex.texture
      box.material = mat

      el.scene.registerBeforeRender(() => {
        box.rotation.y += 0.005
      })
    },
  },
  b3dLight({ intensity: 1 }),
)

preview.append(scene)
```

Call `tex.dispose()` when done to stop the interval and release GPU memory.

## ⚠️ Web fonts do NOT survive rasterisation

A face the *document* has loaded is not available here. The SVG is serialised
to a standalone `Image`, which the browser treats as its own document: it does
not inherit the page's font faces any more than it inherits the page's CSS
custom properties (the reason `w3d-theme` bakes literals in the first place).

Confirmed by looking rather than reasoning — the theme demo shows the same
panel flat and as a texture, and selecting Rosario changes the DOM panel and
leaves the textured one on its fallback.

So a `fontFamily` in a theme reaches an in-scene panel **only if the family is
installed on the device**. That is why the shipped font list is generic
families plus faces that ship with macOS and Windows: those are the ones that
work in both presentations.

The fix, when it is wanted, is to inline the face as a data-URI `@font-face`
inside the serialised SVG — self-contained, and the same discipline the CSS
literals already follow. Filed in TODO rather than done, because it means
fetching and base64-ing a font per texture and the cost should be measured
before it is paid.
