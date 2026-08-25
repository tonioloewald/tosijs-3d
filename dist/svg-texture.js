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
*/
/*{ "parent": "UI" }*/
import * as BABYLON from '@babylonjs/core';
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
        const xml = new XMLSerializer().serializeToString(el);
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