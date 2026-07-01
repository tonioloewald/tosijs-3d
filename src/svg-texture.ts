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

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
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

import * as BABYLON from '@babylonjs/core'

export type SvgTextureOptions = {
  /** The Babylon scene that owns this texture. */
  scene: BABYLON.Scene
  /** Texture resolution in pixels (square). Default 512. */
  resolution?: number
  /** Fetch SVG from this URL and render once. */
  url?: string
  /** Live SVG element reference (dynamic mode). */
  element?: SVGSVGElement
  /** Re-render interval in ms for dynamic mode. Default 30. */
  updateInterval?: number
}

/**
 * Rasterize an SVG element onto a canvas context via Blob URL.
 * Reuses the provided Image instance to avoid per-frame allocation.
 */
function rasterizeSvg(
  xml: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
  callback: () => void
): void {
  const blob = new Blob([xml], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  img.onload = () => {
    ctx.save()
    ctx.clearRect(0, 0, w, h)
    ctx.translate(0, h)
    ctx.scale(1, -1)
    ctx.drawImage(img, 0, 0, w, h)
    ctx.restore()
    URL.revokeObjectURL(url)
    callback()
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
  }
  img.src = url
}

export class SvgTexture {
  texture: BABYLON.DynamicTexture | BABYLON.Texture
  private _resolution: number
  private _interval = 0
  private _element: SVGSVGElement | undefined
  private _scene: BABYLON.Scene
  private _rendering = false
  private _img = new Image()
  private _lastXml = ''

  constructor(options: SvgTextureOptions) {
    const {
      scene,
      resolution = 512,
      url,
      element,
      updateInterval = 30,
    } = options

    this._resolution = resolution
    this._element = element
    this._scene = scene

    if (url) {
      this.texture = new BABYLON.Texture(url, scene)
      this.texture.hasAlpha = true
    } else if (element) {
      const dt = new BABYLON.DynamicTexture('svg-dt', resolution, scene, false)
      dt.hasAlpha = true
      this.texture = dt
      this.render()
      this._interval = window.setInterval(() => {
        this.render()
      }, updateInterval)
    } else {
      this.texture = new BABYLON.Texture(null, scene)
      this.texture.hasAlpha = true
    }
  }

  /** Manually trigger a re-render from the live SVG element. */
  render(): void {
    if (!this._element || this._rendering) return
    const dt = this.texture as BABYLON.DynamicTexture
    if (!dt?.getContext) return
    const el = this._element.cloneNode(true) as SVGSVGElement
    el.removeAttribute('style')
    const xml = new XMLSerializer().serializeToString(el)
    // Skip the expensive rasterize + GPU upload when the SVG is unchanged. A
    // mostly-static panel settles after one render and then costs nothing;
    // genuinely animated SVGs (e.g. a radar) still update every cycle. This is
    // the main fix for the in-XR perf creep, where a static panel was paying
    // for a full re-rasterize + texImage2D upload on every interval.
    if (xml === this._lastXml) return
    this._lastXml = xml
    this._rendering = true
    // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
    // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
    // needs the full surface API (drawImage, save, restore).
    const ctx = dt.getContext() as unknown as CanvasRenderingContext2D
    const res = this._resolution
    rasterizeSvg(xml, ctx, res, res, this._img, () => {
      this._rendering = false
      dt.update(false)
    })
  }

  /** Render an arbitrary SVG string to the texture. */
  renderString(svgString: string): void {
    const dt = this.texture as BABYLON.DynamicTexture
    if (!dt?.getContext) return
    // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
    // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
    // needs the full surface API (drawImage, save, restore).
    const ctx = dt.getContext() as unknown as CanvasRenderingContext2D
    const res = this._resolution
    rasterizeSvg(svgString, ctx, res, res, this._img, () => {
      dt.update(false)
    })
  }

  dispose() {
    if (this._interval) {
      clearInterval(this._interval)
      this._interval = 0
    }
    this.texture?.dispose()
    this.texture = null as any
  }
}
