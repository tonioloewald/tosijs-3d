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

let B = null

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      B = BABYLON
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 5,
        new BABYLON.Vector3(0, 0, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1.5 }, el.scene)
      box.position.y = 0

      const tex = new SvgTexture({
        scene: el.scene,
        url: './tosi-test-pattern.svg',
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
import * as BABYLON from '@babylonjs/core';
/**
 * Rasterize an SVG element onto a canvas context via Blob URL.
 * Reuses the provided Image instance to avoid per-frame allocation.
 */
function rasterizeSvg(svgElement, ctx, w, h, img, callback) {
    const xml = new XMLSerializer().serializeToString(svgElement);
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
        callback();
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
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
        this._rendering = true;
        const el = this._element.cloneNode(true);
        el.removeAttribute('style');
        // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
        // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
        // needs the full surface API (drawImage, save, restore).
        const ctx = dt.getContext();
        const res = this._resolution;
        rasterizeSvg(el, ctx, res, res, this._img, () => {
            this._rendering = false;
            dt.update(false);
        });
    }
    /** Render an arbitrary SVG string to the texture. */
    renderString(svgString) {
        const dt = this.texture;
        if (!dt?.getContext)
            return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.documentElement;
        // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
        // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
        // needs the full surface API (drawImage, save, restore).
        const ctx = dt.getContext();
        const res = this._resolution;
        rasterizeSvg(svg, ctx, res, res, this._img, () => {
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