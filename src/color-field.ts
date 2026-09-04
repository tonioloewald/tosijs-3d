/*#
# color3d

**A colour picker that exists in a headset.** Saturation×value square, hue
strip, optional alpha strip, and a swatch — all SVG, so it works as a flat DOM
overlay and on a panel in an immersive session without changing.

## Why this had to be built

It was the one control the SVG UI did not have, and the only two ways to pick a
colour were both DOM: `<input type="color">` (which cannot express alpha) or a
consumer injecting one, which is what [[theme-editor]] does with tosijs-ui's.
Neither exists inside a headset. So the theme editor — the thing whose whole
subject is colour — had no colour control in the presentation this library
exists to serve.

`lightEditor3d` is not a counter-example: it offers hue and saturation and
deliberately no value, because a light's value IS its intensity. That is a fact
about lights, not a colour picker.

## Layout

```
┌───────────────┬─┬─┐   square: saturation → x, value → y
│               │ │ │   strip 1: hue
│    S × V      │H│A│   strip 2: alpha (optional)
│               │ │ │
└───────────────┴─┴─┘
  #rrggbbaa  ◧            swatch, over a chequerboard when translucent
```

## Notes that cost something to learn

**Hue survives a trip to grey.** Drag value to zero and the colour is black, and
black has no hue — so a naive round trip through RGB loses where the hue handle
was and springs it back to red. The widget keeps H, S and V as its own state and
converts only on the way out. Same reason `curve3d` holds points rather than
re-deriving them from a rendered path.

**A translucent swatch needs something behind it.** A colour at alpha 0.1 over
the panel background looks like the panel background, so the swatch sits on a
chequerboard — the one piece of skeuomorphism nobody has improved on.

## Demo

Change the colour and watch the light take it. The picker drives a real lamp,
which is the only way to tell whether the colour you picked is the colour you
meant.

```js
import { b3d, b3dLight, b3dPointLight, panel3d, label3d, color3d, panelScene } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

let lamp = null

const picker = color3d({
  label: 'lamp colour',
  value: '#ffd7a0',
  alpha: false,
  handleChange: (hex) => { if (lamp) lamp.diffuse = hex },
})

const panel = panel3d({ width: 300 }, label3d({ text: 'Colour' }), picker)

const scene = b3d(
  {
    style: 'width:100%;height:100%',
    sceneCreated(el, BABYLON) {
      el.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1)
      const mat = new BABYLON.StandardMaterial('m', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7)
      mat.specularColor = BABYLON.Color3.Black()
      const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 14, height: 14 }, el.scene)
      floor.material = mat
      const props = [
        BABYLON.MeshBuilder.CreateSphere('s', { diameter: 1.6 }, el.scene),
        BABYLON.MeshBuilder.CreateBox('b', { width: 1.2, height: 2.2, depth: 1.2 }, el.scene),
      ]
      props[0].position.set(1.4, 0.8, 0)
      props[1].position.set(-1.6, 1.1, 0.4)
      for (const m of props) m.material = mat
      el.register({ meshes: [floor, ...props] })
      el.scene.activeCamera.setPosition(new BABYLON.Vector3(0, 5, -9))
    },
  },
  b3dLight({ intensity: 0.08 })
)

lamp = b3dPointLight({ x: 0, y: 3.4, z: 0, diffuse: '#ffd7a0', intensity: 2.4, range: 14 })
scene.append(lamp)

preview.append(
  div(
    { style: 'display:flex;gap:14px;height:100%;padding:12px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'flex:0 0 320px;overflow:auto' }, panel),
    div({ style: 'flex:1;min-width:0;display:flex' }, scene)
  )
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "UI", "order": 269 }*/

import { svgElements } from 'tosijs'
import {
  parseColor,
  formatColor,
  rgbToHsv,
  hsvToRgb,
  contrastInk,
  type Hsva,
} from './color.js'
import { handlerOf } from './handler-of.js'
import { w3dTheme } from './w3d-theme.js'
import type { PointerKind, Widget3d } from './widgets3d.js'

const { g, rect, text, circle, defs, linearGradient, stop, pattern } =
  svgElements as any

export interface Color3dOptions {
  /** Caption above the picker. */
  label?: string
  /** Starting colour, in anything [[color|parseColor]] accepts. */
  value?: string
  /** Show the alpha strip. Default `true`. */
  alpha?: boolean
  /** Square height as a fraction of the widget's width. Default 0.62. */
  aspect?: number
  /** Live, including mid-drag. Canonical hex. */
  handleChange?: (hex: string) => void
  /** @deprecated use `handleChange` — removed in 0.9. */
  onChange?: (hex: string) => void
  /** Once per gesture, with the settled value — one undo step. */
  handleCommit?: (hex: string) => void
}

export interface ColorField extends Widget3d {
  /** Canonical hex — `#rrggbb`, or `#rrggbbaa` when translucent. */
  readonly value: string
  setValue: (hex: string) => void
}

let seq = 0

/**
 * A colour picker.
 *
 * Holds H, S, V and A as its OWN state rather than deriving them from the
 * emitted colour — see the note on losing hue at zero value.
 */
export function color3d(config: Color3dOptions = {}): ColorField {
  const showAlpha = config.alpha ?? true
  const aspect = config.aspect ?? 0.62
  const uid = `w3d-col-${seq++}`

  let hsv: Hsva = rgbToHsv(
    parseColor(config.value ?? '#ffffff') ?? {
      r: 1,
      g: 1,
      b: 1,
      a: 1,
    }
  )
  /** Which control the current press owns, for the whole gesture. */
  let grabbed: 'square' | 'hue' | 'alpha' | null = null

  const el = g({ 'data-w3d': 'color' })

  const cap = config.label
    ? text(
        {
          x: 0,
          'font-size': w3dTheme.fontSize,
          'font-family': w3dTheme.fontFamily,
          fill: w3dTheme.muted,
          'dominant-baseline': 'hanging',
        },
        config.label
      )
    : null

  // --- paint targets ---------------------------------------------------------
  const sq = rect({ rx: 4 })
  const sqSat = linearGradient({
    id: `${uid}-s`,
    x1: '0',
    x2: '1',
    y1: '0',
    y2: '0',
  })
  const sqVal = linearGradient({
    id: `${uid}-v`,
    x1: '0',
    x2: '0',
    y1: '0',
    y2: '1',
  })
  const hueStrip = rect({ rx: 3, fill: `url(#${uid}-h)` })
  const hueGrad = linearGradient({
    id: `${uid}-h`,
    x1: '0',
    x2: '0',
    y1: '0',
    y2: '1',
  })
  const alphaStrip = rect({ rx: 3, fill: `url(#${uid}-a)` })
  const alphaGrad = linearGradient({
    id: `${uid}-a`,
    x1: '0',
    x2: '0',
    y1: '0',
    y2: '1',
  })
  const checks = pattern({
    id: `${uid}-c`,
    width: 8,
    height: 8,
    patternUnits: 'userSpaceOnUse',
  })
  const alphaBack = rect({ rx: 3, fill: `url(#${uid}-c)` })
  const swatchBack = rect({ rx: 4, fill: `url(#${uid}-c)` })
  const swatch = rect({ rx: 4 })
  const readout = text({
    'font-size': w3dTheme.fontSize,
    'font-family': w3dTheme.fontFamily,
    'dominant-baseline': 'middle',
    'text-anchor': 'middle',
  })
  const sqDot = circle({ r: 6, fill: 'none', 'stroke-width': 2 })
  const hueDot = rect({ height: 3, rx: 1.5, fill: 'none', 'stroke-width': 2 })
  const alphaDot = rect({ height: 3, rx: 1.5, fill: 'none', 'stroke-width': 2 })

  // Hue ramp: six stops is the wheel. Saturation and value are overlaid on the
  // square as two gradients (white→hue across, transparent→black down), which is
  // how every picker draws it and costs no per-frame work.
  const hueStops = [0, 60, 120, 180, 240, 300, 360].map((h) =>
    stop({
      offset: `${(h / 360) * 100}%`,
      'stop-color': formatColor(hsvToRgb({ h, s: 1, v: 1, a: 1 })),
    })
  )
  hueGrad.append(...hueStops)
  sqSat.append(
    stop({ offset: '0%', 'stop-color': '#ffffff' }),
    stop({ offset: '100%', 'stop-color': '#ff0000' })
  )
  sqVal.append(
    stop({ offset: '0%', 'stop-color': '#000000', 'stop-opacity': '0' }),
    stop({ offset: '100%', 'stop-color': '#000000', 'stop-opacity': '1' })
  )
  alphaGrad.append(
    stop({ offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '1' }),
    stop({ offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': '0' })
  )
  checks.append(
    rect({ x: 0, y: 0, width: 8, height: 8, fill: '#8a8f98' }),
    rect({ x: 0, y: 0, width: 4, height: 4, fill: '#c9ced6' }),
    rect({ x: 4, y: 4, width: 4, height: 4, fill: '#c9ced6' })
  )
  const sqHue = rect({ rx: 4, fill: `url(#${uid}-s)` })
  const sqShade = rect({ rx: 4, fill: `url(#${uid}-v)` })

  el.append(
    defs({}, sqSat, sqVal, hueGrad, alphaGrad, checks),
    ...(cap ? [cap] : []),
    sq,
    sqHue,
    sqShade,
    sqDot,
    hueStrip,
    hueDot,
    ...(showAlpha ? [alphaBack, alphaStrip, alphaDot] : []),
    swatchBack,
    swatch,
    readout
  )

  // --- geometry --------------------------------------------------------------
  const STRIP = 16
  const GAP = 8
  const SWATCH = 26
  let box = { x: 0, y: 0, w: 0, h: 0 }
  let hueBox = { x: 0, y: 0, w: 0, h: 0 }
  let alphaBox = { x: 0, y: 0, w: 0, h: 0 }

  const emit = (commit: boolean): void => {
    const hex = formatColor(hsvToRgb(hsv))
    handlerOf<(v: string) => void>(
      config as unknown as Record<string, unknown>,
      'handleChange',
      'onChange'
    )?.(hex)
    if (commit) config.handleCommit?.(hex)
  }

  const paint = (): void => {
    const rgb = hsvToRgb(hsv)
    const hex = formatColor(rgb)
    const pure = formatColor(hsvToRgb({ h: hsv.h, s: 1, v: 1, a: 1 }))
    ;(sqSat.lastChild as SVGElement)?.setAttribute('stop-color', pure)
    ;(alphaGrad.firstChild as SVGElement)?.setAttribute('stop-color', pure)
    swatch.setAttribute('fill', hex)
    readout.textContent = hex
    readout.setAttribute('fill', w3dTheme.text)
    // Handles are outlined in whatever will show against what they sit on.
    sqDot.setAttribute('stroke', contrastInk(rgb))
    sqDot.setAttribute('cx', String(box.x + hsv.s * box.w))
    sqDot.setAttribute('cy', String(box.y + (1 - hsv.v) * box.h))
    hueDot.setAttribute('stroke', w3dTheme.text)
    hueDot.setAttribute('y', String(hueBox.y + (hsv.h / 360) * hueBox.h - 1.5))
    if (showAlpha) {
      alphaDot.setAttribute('stroke', w3dTheme.text)
      alphaDot.setAttribute(
        'y',
        String(alphaBox.y + (1 - hsv.a) * alphaBox.h - 1.5)
      )
    }
  }

  const api: ColorField = {
    el,
    get value() {
      return formatColor(hsvToRgb(hsv))
    },
    setValue(hex: string) {
      const rgb = parseColor(hex)
      if (rgb == null) return // null, not black — see `parseColor`
      hsv = rgbToHsv(rgb)
      paint()
    },
    layout(width: number) {
      const capH = cap ? Math.round(w3dTheme.fontSize * 1.4) : 0
      if (cap) cap.setAttribute('y', '0')
      const strips = showAlpha ? STRIP * 2 + GAP : STRIP
      const w = Math.max(40, width - strips - GAP * 2)
      const h = Math.max(40, Math.round(width * aspect))
      box = { x: 0, y: capH, w, h }
      for (const r of [sq, sqHue, sqShade]) {
        r.setAttribute('x', '0')
        r.setAttribute('y', String(capH))
        r.setAttribute('width', String(w))
        r.setAttribute('height', String(h))
      }
      hueBox = { x: w + GAP, y: capH, w: STRIP, h }
      hueStrip.setAttribute('x', String(hueBox.x))
      hueStrip.setAttribute('y', String(capH))
      hueStrip.setAttribute('width', String(STRIP))
      hueStrip.setAttribute('height', String(h))
      hueDot.setAttribute('x', String(hueBox.x - 2))
      hueDot.setAttribute('width', String(STRIP + 4))
      if (showAlpha) {
        alphaBox = { x: w + GAP * 2 + STRIP, y: capH, w: STRIP, h }
        for (const r of [alphaBack, alphaStrip]) {
          r.setAttribute('x', String(alphaBox.x))
          r.setAttribute('y', String(capH))
          r.setAttribute('width', String(STRIP))
          r.setAttribute('height', String(h))
        }
        alphaDot.setAttribute('x', String(alphaBox.x - 2))
        alphaDot.setAttribute('width', String(STRIP + 4))
      }
      const swY = capH + h + GAP
      for (const r of [swatchBack, swatch]) {
        r.setAttribute('x', '0')
        r.setAttribute('y', String(swY))
        r.setAttribute('width', String(SWATCH))
        r.setAttribute('height', String(SWATCH))
      }
      readout.setAttribute('x', String(SWATCH + GAP))
      readout.setAttribute('y', String(swY + SWATCH / 2))
      readout.setAttribute('text-anchor', 'start')
      paint()
      return capH + h + GAP + SWATCH
    },
    /** The controls only — a press on the swatch or caption scrolls the panel. */
    hitTest(x: number, y: number) {
      const inSq =
        x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
      const inHue =
        x >= hueBox.x - 3 &&
        x <= hueBox.x + hueBox.w + 3 &&
        y >= hueBox.y &&
        y <= hueBox.y + hueBox.h
      const inA =
        showAlpha &&
        x >= alphaBox.x - 3 &&
        x <= alphaBox.x + alphaBox.w + 3 &&
        y >= alphaBox.y &&
        y <= alphaBox.y + alphaBox.h
      return inSq || inHue || inA
    },
    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'leave') return
      /*
      THE PRESS OWNS ONE CONTROL for its whole life.

      Re-deciding per event would hand the drag to whichever strip the pointer
      happened to be over — and dragging value to the top edge of the square
      routinely leaves it, which would silently become a hue edit.
      */
      if (kind === 'down') {
        grabbed = api.hitTest!(x, y)
          ? x <= box.x + box.w
            ? 'square'
            : showAlpha && x >= alphaBox.x - 3
            ? 'alpha'
            : 'hue'
          : null
      }
      if (grabbed == null) return
      const f = (v: number, lo: number, span: number) =>
        Math.max(0, Math.min(1, (v - lo) / (span || 1)))
      if (grabbed === 'square') {
        hsv = { ...hsv, s: f(x, box.x, box.w), v: 1 - f(y, box.y, box.h) }
      } else if (grabbed === 'hue') {
        hsv = { ...hsv, h: f(y, hueBox.y, hueBox.h) * 360 }
      } else {
        hsv = { ...hsv, a: 1 - f(y, alphaBox.y, alphaBox.h) }
      }
      paint()
      emit(kind === 'up')
      if (kind === 'up') grabbed = null
    },
  }
  return api
}
