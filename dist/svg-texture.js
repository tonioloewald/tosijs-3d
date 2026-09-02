/*#
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
*/
/*{ "parent": "UI", "order": 530 }*/
import * as BABYLON from '@babylonjs/core';
import { svgFontStyle } from './embed-font';
/**
 * Rasterize an SVG element onto a canvas context via Blob URL.
 * Reuses the provided Image instance to avoid per-frame allocation.
 */
function rasterizeSvg(xml, ctx, w, h, img, callback) {
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
        ctx.save();
        ctx.clearRect(0, 0, w, h);
        ctx.translate(0, h);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
        URL.revokeObjectURL(url);
        callback(true);
    };
    img.onerror = () => {
        // The callback MUST still fire: the caller holds a busy latch, and
        // swallowing the error here left it set forever — one bad rasterize froze
        // the texture for the rest of the session while the sim underneath kept
        // working (on device: "the 3D keyboard types but the plane never shows it").
        URL.revokeObjectURL(url);
        callback(false);
    };
    img.src = url;
}
export class SvgTexture {
    texture;
    _resolution;
    _interval = 0;
    _element;
    _scene;
    _rendering = false;
    _img = new Image();
    _lastXml = '';
    _warnedFailure = false;
    constructor(options) {
        const { scene, resolution = 512, url, element, updateInterval = 30, } = options;
        this._resolution = resolution;
        this._element = element;
        this._scene = scene;
        if (url) {
            this.texture = new BABYLON.Texture(url, scene);
            this.texture.hasAlpha = true;
        }
        else if (element) {
            const dt = new BABYLON.DynamicTexture('svg-dt', resolution, scene, false);
            dt.hasAlpha = true;
            this.texture = dt;
            this.render();
            this._interval = window.setInterval(() => {
                this.render();
            }, updateInterval);
        }
        else {
            this.texture = new BABYLON.Texture(null, scene);
            this.texture.hasAlpha = true;
        }
    }
    /** Manually trigger a re-render from the live SVG element. */
    render() {
        if (!this._element || this._rendering)
            return;
        const dt = this.texture;
        if (!dt?.getContext)
            return;
        const el = this._element.cloneNode(true);
        el.removeAttribute('style');
        /*
        PRESENTATION-ONLY NODES.
    
        One UI drawn twice still has parts that belong to one side. Popup chrome is
        the case that forced this: the move and close glyphs are handled by PICKING
        (uv -> viewBox -> chromeHit), which exists only in the scene, so in the DOM
        they were painted and inert — Tonio: "the move and close affordances are
        still rendering in the DOM".
    
        Tonio's suggestion, and the right shape: mark a node with the presentation it
        belongs to. Here we strip anything marked `dom`; a stylesheet hides anything
        marked `texture` on the flat side. It costs one query on a clone we were
        making anyway.
    
        Note what this deliberately does NOT allow: differing in what you DO. This
        hides and shows nodes only. Branching behaviour between presentations is how
        the two drift apart, which is the whole warning in UI-DESIGN-NOTES → "One
        UI, two presentations".
        */
        for (const n of el.querySelectorAll('[data-presentation="dom"]')) {
            n.remove();
        }
        let xml = new XMLSerializer().serializeToString(el);
        /*
        Inline any registered web font.
    
        The serialised copy is its own document: it inherits no font faces from the
        page, so a `font-family` naming a web font falls back silently — the flat
        panel renders it and the textured one does not. `svgFontStyle` returns an
        `@font-face` with the bytes base64'd in, and only for families this markup
        actually mentions.
    
        Injected AFTER serialisation rather than into the live element, so the DOM
        panel is untouched and only the texture pays.
        */
        const fontStyle = svgFontStyle(xml);
        if (fontStyle !== '') {
            xml = xml.replace(/(<svg[^>]*>)/, `$1${fontStyle}`);
        }
        // Skip the expensive rasterize + GPU upload when the SVG is unchanged. A
        // mostly-static panel settles after one render and then costs nothing;
        // genuinely animated SVGs (e.g. a radar) still update every cycle. This is
        // the main fix for the in-XR perf creep, where a static panel was paying
        // for a full re-rasterize + texImage2D upload on every interval.
        if (xml === this._lastXml)
            return;
        this._rendering = true;
        // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
        // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
        // needs the full surface API (drawImage, save, restore).
        const ctx = dt.getContext();
        const res = this._resolution;
        rasterizeSvg(xml, ctx, res, res, this._img, (ok) => {
            // Release the latch on BOTH outcomes, and commit `_lastXml` only on
            // success — so a failed frame is retried on the next tick instead of
            // being remembered as done.
            this._rendering = false;
            if (ok) {
                this._lastXml = xml;
                dt.update(false);
            }
            else if (!this._warnedFailure) {
                // Once per instance: self-healing made failure SILENT, and a
                // permanently-bad SVG (malformed markup, CSP-blocked blob) becomes an
                // invisible retry loop with a frozen texture and no clue why.
                this._warnedFailure = true;
                console.warn('SvgTexture: rasterize failed (will retry each tick). ' +
                    'The SVG may be malformed or blob: URLs blocked by CSP.');
            }
        });
    }
    /** Render an arbitrary SVG string to the texture. */
    renderString(svgString) {
        const dt = this.texture;
        if (!dt?.getContext)
            return;
        // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
        // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
        // needs the full surface API (drawImage, save, restore).
        const ctx = dt.getContext();
        const res = this._resolution;
        rasterizeSvg(svgString, ctx, res, res, this._img, (ok) => {
            if (ok)
                dt.update(false);
        });
    }
    dispose() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = 0;
        }
        this.texture?.dispose();
        this.texture = null;
    }
}
//# sourceMappingURL=svg-texture.js.map