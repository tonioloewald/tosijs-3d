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
custom properties (the reason [w3d-theme](?w3d-theme.ts) bakes literals). The
symptom is an in-scene panel in the fallback family while the same flat panel
renders correctly.

So a `fontFamily` in a theme reaches an in-scene panel only if the family is
installed on the device, or you embed it with `registerSvgFont` (below). The
shipped font list is generic families plus faces that ship with macOS and
Windows, which work in both presentations without it.

## Embedding a web font

`registerSvgFont(family, url, { weight, style })` fetches a font file, base64s
it, and keeps an `@font-face` rule that travels *inside* every serialised SVG
that mentions the family. Await it before the panels draw: one rasterised
before the bytes arrive renders the fallback.

```javascript
await registerSvgFont('Rosario', '/fonts/rosario.woff2')
setW3dTheme({ fontFamily: 'Rosario, serif' })
```

The bytes are inlined rather than referenced by `url()` because the serialised
document has no base URL to follow one from. That makes the SVG self-contained,
and it has a cost: a woff2 is typically 20–100 KB and base64 adds a third, so
register a family once (`fontFaceCss` caches per URL), and only the faces a
panel's markup mentions are injected into it. Pass `weight` and `style` for a
bold or italic file, or the browser synthesises a bold from the bold and you get
double emboldening. `unregisterSvgFont(family)` forgets one.
