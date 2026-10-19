/*
THE EFFECT SPRITES, drawn rather than loaded (EFFECTS-DESIGN.md → "No
files"): a recipe never names a URL that must resolve in someone else's app.
Each is white on transparent (the particle's colour tints it), drawn once
per scene on a small canvas, stylized: soft but with a readable shape.

- `puff`: a soft round cloud (steam, spray).
- `smoke`: a lumpy billow of overlapping lobes.
- `spark`: a bright core streak, long along V, for stretched billboards.
- `ember`: a hot disc with a glow.
- `glow`: a very soft round light (fireballs, flashes).
- `drop`: a water drop with a highlight.
- `bubble`: a ring with a highlight (underwater).
*/

import * as BABYLON from '@babylonjs/core'
import type { SpriteKind } from './effect-recipe.js'

const SIZE = 64
const made = new WeakMap<BABYLON.Scene, Map<SpriteKind, BABYLON.Texture>>()

type Ctx = CanvasRenderingContext2D

function soft(c: Ctx, x: number, y: number, r: number, a: number, hard = 0) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(Math.min(0.95, hard), `rgba(255,255,255,${a})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

/** A fixed pseudo-random sequence, so every page draws the same sprites. */
function seq(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const DRAW: Record<SpriteKind, (c: Ctx) => void> = {
  puff(c) {
    soft(c, 32, 32, 30, 0.9, 0.25)
  },
  smoke(c) {
    const r = seq(7)
    soft(c, 32, 34, 22, 0.7, 0.3)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5
      const d = 10 + r() * 6
      soft(c, 32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 12 + r() * 6, 0.65, 0.35)
    }
  },
  spark(c) {
    const g = c.createLinearGradient(0, 0, 0, SIZE)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(26, 2, 12, 60)
    soft(c, 32, 32, 14, 0.6, 0.2)
  },
  ember(c) {
    soft(c, 32, 32, 30, 0.45, 0.1)
    soft(c, 32, 32, 14, 1, 0.75)
  },
  glow(c) {
    soft(c, 32, 32, 31, 1, 0)
  },
  drop(c) {
    soft(c, 32, 34, 18, 0.85, 0.7)
    soft(c, 27, 28, 6, 1, 0.5)
  },
  bubble(c) {
    // A thin bright rim, a faint inside and a highlight: reads as a bubble,
    // not a drop.
    c.strokeStyle = 'rgba(255,255,255,0.95)'
    c.lineWidth = 4
    c.beginPath()
    c.arc(32, 32, 24, 0, Math.PI * 2)
    c.stroke()
    soft(c, 32, 32, 24, 0.15, 0.8)
    soft(c, 24, 23, 7, 1, 0.4)
  },
}

/** The sprite's texture in `scene`, drawn the first time it is asked for. */
export function effectSprite(
  scene: BABYLON.Scene,
  kind: SpriteKind
): BABYLON.Texture {
  let byKind = made.get(scene)
  if (byKind == null) made.set(scene, (byKind = new Map()))
  const tex = byKind.get(kind)
  if (tex != null) return tex
  const dt = new BABYLON.DynamicTexture(
    `effect-sprite-${kind}`,
    { width: SIZE, height: SIZE },
    scene,
    true
  )
  const c = dt.getContext() as unknown as Ctx
  c.clearRect(0, 0, SIZE, SIZE)
  DRAW[kind](c)
  dt.hasAlpha = true
  dt.update(false)
  byKind.set(kind, dt)
  return dt
}

const custom = new WeakMap<BABYLON.Scene, Map<string, BABYLON.Texture>>()

/**
 * A layer's own picture: an image URL (PNG, JPEG, SVG, data:) or SVG
 * markup. Made once per scene and picture, and shared, like the sprites.
 */
export function effectTexture(
  scene: BABYLON.Scene,
  source: string
): BABYLON.Texture {
  let byKey = custom.get(scene)
  if (byKey == null) custom.set(scene, (byKey = new Map()))
  const hit = byKey.get(source)
  if (hit != null) return hit
  const markup = source.trimStart().startsWith('<')
  const svg =
    markup ||
    /^data:image\/svg\+xml/i.test(source) ||
    /\.svg(\?|#|$)/i.test(source)
  let tex: BABYLON.Texture
  if (svg) {
    /*
    SVG IS DRAWN ONTO A CANVAS here, at a fixed size, not handed to Babylon
    as an image URL: an SVG with no pixel size of its own came through
    with its transparency gone (black squares). The canvas is the same route
    the sprites take, so it keeps its alpha.
    */
    const size = 128
    const dt = new BABYLON.DynamicTexture(`effect-picture`, { width: size, height: size }, scene, true)
    dt.hasAlpha = true
    const img = new Image()
    img.onload = () => {
      const c = dt.getContext() as unknown as CanvasRenderingContext2D
      c.clearRect(0, 0, size, size)
      c.drawImage(img, 0, 0, size, size)
      dt.update(false)
    }
    img.src = markup
      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`
      : source
    tex = dt
  } else {
    tex = new BABYLON.Texture(source, scene, false, true)
    tex.hasAlpha = true
  }
  byKey.set(source, tex)
  return tex
}
