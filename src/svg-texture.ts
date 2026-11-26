/*#
# svg-texture

Renders SVG content to a Babylon.js texture via an offscreen canvas.

## Modes

- **Static** (`url`): fetches SVG from a URL and renders once.
- **Dynamic** (`element`): reads a live SVG element on an interval
  (default 30 ms), capturing changes from tosijs bindings or any other
  DOM mutations. Great for HUDs, radar displays, instrument panels.

## Pictures kept

An SVG marked `data-texture-cache` keeps each picture drawn of it, so going
back to one (the panel at rest after a hover, a radial menu's pick blinking)
is a copy rather than a new raster. One cache serves every texture: the least
recently used picture goes first, and `svgTextureCache.maxPictures` (32) and
`svgTextureCache.maxBytes` (32 MB; a picture is resolution² × 4) cap it. Set
either lower on a tight device, or `maxPictures = 0` to keep nothing. Panels,
the system bar, bar menus, the inventory dock and radial menus are marked; an
animated SVG (a radar) is better left unmarked, since every picture is new.

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
*/
/*{ "parent": "ui-in-scene", "order": 30 }*/

import * as BABYLON from '@babylonjs/core'
import { svgFontStyle } from './embed-font.js'
import { realNow } from './clock.js'

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
  /**
   * Mipmapped, trilinear and anisotropic (default `true`). A panel is nearly
   * always drawn SMALLER than its texture: a 1024 px panel 30 cm wide at
   * 1.4 m covers about 300 px of a Quest 3's view, so unfiltered its text and
   * hairlines alias and crawl as the head moves. Costs a third more texture
   * memory and a mip rebuild per repaint. `false` for a texture always seen at
   * about one texel per pixel.
   */
  mipmaps?: boolean
  /**
   * Upload with colour multiplied by alpha; draw it with
   * `ALPHA_PREMULTIPLIED`. Straight alpha fringes dark wherever drawn pixels
   * meet transparent ones inside the texture (a panel's rounded corners: the
   * filter mixes in the transparent pixels' black). Premultiplied, those
   * pixels contribute nothing. Off by default: a light's gel wants straight.
   */
  premultiplied?: boolean
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
  callback: (ok: boolean) => void
): void {
  const blob = new Blob([xml], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  img.onload = () => {
    const began = realNow()
    ctx.save()
    ctx.clearRect(0, 0, w, h)
    ctx.translate(0, h)
    ctx.scale(1, -1)
    ctx.drawImage(img, 0, 0, w, h)
    ctx.restore()
    svgTextureCost.ms += realNow() - began
    URL.revokeObjectURL(url)
    callback(true)
  }
  img.onerror = () => {
    // The callback MUST still fire: the caller holds a busy latch, and
    // swallowing the error here left it set forever — one bad rasterize froze
    // the texture for the rest of the session while the sim underneath kept
    // working (on device: "the 3D keyboard types but the plane never shows it").
    URL.revokeObjectURL(url)
    callback(false)
  }
  img.src = url
}

/**
 * What repainting SVG textures has cost on the main thread, across every
 * instance: `checks` are serialise-and-compare passes, `repaints` the ones
 * that changed and were redrawn, `ms` the time both took here. The browser's
 * own SVG rasterising happens off this thread and is NOT in it. Perf Stats
 * reads this once a second.
 */
export const svgTextureCost = { checks: 0, repaints: 0, ms: 0, recalled: 0 }

/*
PICTURES KEPT, so going back to one is a copy, not a raster. A panel spends
most of its life at rest and keeps coming back to it; a hover lights a row
and goes; a radial menu's pick blinks between two states. Each of those
re-rasterised the whole SVG. An SVG marked `data-texture-cache` keeps every
picture drawn of it, keyed by its markup, in ONE cache shared by every
texture, the least recently used going first, capped by count and bytes.
*/
export const svgTextureCache = {
  /** At most this many pictures, across every texture. */
  maxPictures: 32,
  /** And at most this many bytes of them (a picture is resolution² × 4). */
  maxBytes: 32 * 1024 * 1024,
  /** How many pictures are kept now, and their bytes (read only). */
  get pictures(): number {
    return keptPictures.size
  },
  get bytes(): number {
    return keptBytes
  },
}
interface KeptPicture {
  canvas: HTMLCanvasElement
  bytes: number
  owner: object
}
const keptPictures = new Map<string, KeptPicture>()
let keptBytes = 0
const spareCanvases: HTMLCanvasElement[] = []
/** Two 32-bit hashes of the markup and its length: the key without the text. */
function markupKey(xml: string): string {
  let a = 0x811c9dc5
  let b = 5381
  for (let i = 0; i < xml.length; i++) {
    const c = xml.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193)
    b = (Math.imul(b, 33) + c) | 0
  }
  return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}.${xml.length}`
}
function dropPicture(key: string, kept: KeptPicture): void {
  keptPictures.delete(key)
  keptBytes -= kept.bytes
  if (spareCanvases.length < 4) spareCanvases.push(kept.canvas)
}
function keepPicture(key: string, from: HTMLCanvasElement, owner: object): void {
  const { maxPictures, maxBytes } = svgTextureCache
  const bytes = from.width * from.height * 4
  if (maxPictures <= 0 || bytes > maxBytes) return
  const had = keptPictures.get(key)
  if (had != null) {
    keptPictures.delete(key)
    keptPictures.set(key, had)
    return
  }
  // The least recently used go first (a Map keeps insertion order).
  for (const [k, v] of keptPictures) {
    if (keptPictures.size < maxPictures && keptBytes + bytes <= maxBytes) break
    dropPicture(k, v)
  }
  const i = spareCanvases.findIndex(
    (c) => c.width === from.width && c.height === from.height
  )
  const canvas =
    i >= 0 ? spareCanvases.splice(i, 1)[0] : document.createElement('canvas')
  canvas.width = from.width
  canvas.height = from.height
  const c2 = canvas.getContext('2d')!
  c2.clearRect(0, 0, canvas.width, canvas.height)
  c2.drawImage(from, 0, 0)
  keptPictures.set(key, { canvas, bytes, owner })
  keptBytes += bytes
}
function recallPicture(key: string): KeptPicture | undefined {
  const kept = keptPictures.get(key)
  if (kept != null) {
    keptPictures.delete(key)
    keptPictures.set(key, kept)
  }
  return kept
}
let textureCount = 0

export class SvgTexture {
  texture: BABYLON.DynamicTexture | BABYLON.Texture
  private _resolution: number
  private _interval = 0
  private _element: SVGSVGElement | undefined
  private _scene: BABYLON.Scene
  private _rendering = false
  /** A new element arrived mid-render: render again when that one lands. */
  private _again = false
  private _img = new Image()
  private _lastXml = ''
  private _warnedFailure = false
  private _premul = false
  /** Its pictures' keys in the shared cache start with this. */
  private _id = `t${++textureCount}`

  constructor(options: SvgTextureOptions) {
    const {
      scene,
      resolution = 512,
      url,
      element,
      updateInterval = 30,
      mipmaps = true,
      premultiplied = false,
    } = options
    this._premul = premultiplied

    this._resolution = resolution
    this._element = element
    this._scene = scene

    if (url) {
      this.texture = new BABYLON.Texture(url, scene)
      this.texture.hasAlpha = true
    } else if (element) {
      const dt = new BABYLON.DynamicTexture(
        'svg-dt',
        resolution,
        scene,
        mipmaps,
        mipmaps
          ? BABYLON.Texture.TRILINEAR_SAMPLINGMODE
          : BABYLON.Texture.BILINEAR_SAMPLINGMODE
      )
      if (mipmaps) dt.anisotropicFilteringLevel = 4
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

  /**
   * Draw a different live element from now on. The texture keeps its current
   * picture until the new one is drawn (a render is asynchronous), so a panel
   * swapping its content never shows a blank frame.
   */
  setElement(element: SVGSVGElement): void {
    if (element === this._element) return
    this._element = element
    // A render in flight is of the old element: draw the new one after it.
    if (this._rendering) this._again = true
    else this.render()
  }

  /** Manually trigger a re-render from the live SVG element. */
  render(): void {
    if (!this._element) return
    // One in flight: draw again after it, so the newer picture is not lost
    // until the next tick.
    if (this._rendering) {
      this._again = true
      return
    }
    const dt = this.texture as BABYLON.DynamicTexture
    if (!dt?.getContext) return
    const began = realNow()
    svgTextureCost.checks++
    const el = this._element.cloneNode(true) as SVGSVGElement
    el.removeAttribute('style')
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
      n.remove()
    }
    let xml = new XMLSerializer().serializeToString(el)
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
    const fontStyle = svgFontStyle(xml)
    if (fontStyle !== '') {
      xml = xml.replace(/(<svg[^>]*>)/, `$1${fontStyle}`)
    }
    // Skip the expensive rasterize + GPU upload when the SVG is unchanged. A
    // mostly-static panel settles after one render and then costs nothing;
    // genuinely animated SVGs (e.g. a radar) still update every cycle. This is
    // the main fix for the in-XR perf creep, where a static panel was paying
    // for a full re-rasterize + texImage2D upload on every interval.
    if (xml === this._lastXml) {
      svgTextureCost.ms += realNow() - began
      return
    }
    // DynamicTexture types this as Babylon's abstract ICanvasRenderingContext,
    // but in browsers it's the real CanvasRenderingContext2D — rasterizeSvg
    // needs the full surface API (drawImage, save, restore).
    const ctx = dt.getContext() as unknown as CanvasRenderingContext2D
    const res = this._resolution
    // A picture kept from before: copy it back (see svgTextureCache).
    const cache =
      this._element.hasAttribute('data-texture-cache') &&
      typeof document !== 'undefined'
    const key = cache ? `${this._id}:${markupKey(xml)}` : ''
    const kept = cache ? recallPicture(key) : undefined
    if (kept != null) {
      ctx.clearRect(0, 0, res, res)
      ctx.drawImage(kept.canvas, 0, 0)
      this._lastXml = xml
      dt.update(false, this._premul)
      svgTextureCost.recalled++
      svgTextureCost.ms += realNow() - began
      return
    }
    this._rendering = true
    rasterizeSvg(xml, ctx, res, res, this._img, (ok) => {
      // Release the latch on BOTH outcomes, and commit `_lastXml` only on
      // success — so a failed frame is retried on the next tick instead of
      // being remembered as done.
      this._rendering = false
      if (this._again) {
        this._again = false
        queueMicrotask(() => this.render())
      }
      if (ok) {
        this._lastXml = xml
        if (cache)
          keepPicture(key, ctx.canvas as unknown as HTMLCanvasElement, this)
        const upload = realNow()
        dt.update(false, this._premul)
        svgTextureCost.repaints++
        svgTextureCost.ms += realNow() - upload
      } else if (!this._warnedFailure) {
        // Once per instance: self-healing made failure SILENT, and a
        // permanently-bad SVG (malformed markup, CSP-blocked blob) becomes an
        // invisible retry loop with a frozen texture and no clue why.
        this._warnedFailure = true
        console.warn(
          'SvgTexture: rasterize failed (will retry each tick). ' +
            'The SVG may be malformed or blob: URLs blocked by CSP.'
        )
      }
    })
    svgTextureCost.ms += realNow() - began
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
    rasterizeSvg(svgString, ctx, res, res, this._img, (ok) => {
      if (ok) dt.update(false, this._premul)
    })
  }

  dispose() {
    if (this._interval) {
      clearInterval(this._interval)
      this._interval = 0
    }
    for (const [k, v] of keptPictures) if (v.owner === this) dropPicture(k, v)
    this.texture?.dispose()
    this.texture = null as any
  }
}
