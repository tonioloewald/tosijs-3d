/*#
# hud

Driver for the aircraft HUD SVG (`static/aircraft-hud.svg`, normalized for control):
sets the four meters, the horizon/pitch ladder, and the radar traces. The geometry
math is pure ([hud-math](?hud-math.ts)); this layer just pushes values onto the SVG,
so the same controller works whether the SVG is a flat DOM overlay or rasterized to a
Babylon texture (svg-texture re-serializes it each update).

`loadHud(url)` fetches + parses the designed asset (primary); `buildFallbackHud()`
constructs a minimal equivalent in code so a HUD still renders if the asset is
missing.

## See it live

The assembled, animated HUD is [<tosi-b3d-hud>](?b3d-hud.ts) — drop it into an aircraft demo. This
module is the driver underneath: `buildFallbackHud()` builds the SVG plus a controller whose
`setMeter` / `setHorizon` / `setTraces` / `setWarnings` push live values onto it (the projection
math is pure, in [hud-math](?hud-math.ts)).

```javascript
import { buildFallbackHud } from 'tosijs-3d'
const hud = buildFallbackHud()
hud.setMeter('airspeed', 0.6) // then mount hud's SVG in an overlay, or use <tosi-b3d-hud>
```
*/
/*{ "parent": "Core" }*/

import { svgElements } from 'tosijs'
import { sideFromD, lockFillOpacity, type Side,
  arcDashArray,
} from './hud-math'
import type { Vec3 } from './spatial-transform'

export type { Side } from './hud-math'

export type MeterName = 'speed' | 'altitude' | 'health' | 'energy'
export type TraceKind = 'neutral' | 'friendly' | 'hostile' | 'waypoint'
export type HudTraceInput = {
  pos: Vec3
  kind: TraceKind
  /** Radar's lock acquisition on this contact, 0..1 — the trace fills with white as it
   * builds (nothing → 50%), so the pilot can see a lock coming, and drains back if the
   * contact slips the cone. */
  lockProgress?: number
  /** Radar HAS a lock — the trace's OUTLINE goes white and its fill takes over the
   * FACTION colour (the channels trade jobs, so it still says what it is). A categorical
   * change, not more fill. Stays bold even when pinned off-glass. */
  locked?: boolean
}

/**
 * A trace ALREADY placed in HUD viewBox coordinates (0..VIEWBOX, +y down) by whoever
 * owns the HUD's geometry. We deliberately do NOT re-derive a projection here: the HUD
 * is a real quad in the world (the cockpit combiner), so `b3d-hud` places each contact
 * by intersecting the eye→target ray with that quad — which cannot disagree with what
 * the renderer draws. `tracked` = it fell ON the glass; false = pinned to the ring.
 */
export type HudTracePoint = {
  x: number
  y: number
  kind: TraceKind
  /** Radar's lock acquisition, 0..1 — drives how solidly the trace fills in (the
   * outline going white is the separate, categorical "locked" cue). */
  lockProgress?: number
  locked?: boolean
  tracked: boolean
}

/** A warning line; give it a `side` to also flash that arc frame red. */
export type HudWarning = { text: string; side?: Side }

export type HudController = {
  /** The live SVG element (mount it, or feed it to an SvgTexture). */
  readonly el: SVGSVGElement
  /** Fill a meter arc, `level` 0..1. */
  setMeter(name: MeterName, level: number): void
  /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
  setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void
  /** Replace the radar traces. Points are ALREADY in HUD viewBox coords — whoever
   * owns the HUD's geometry (b3d-hud) projects them, because only it knows where the
   * HUD actually is. See `HudTracePoint`. */
  setTraces(points: HudTracePoint[]): void
  /** Show warning lines (the `#warning` text) and flash any threat-side arc red. */
  setWarnings(warnings: HudWarning[]): void
  /**
   * Show or hide the artificial horizon + pitch ladder.
   *
   * It's the one element that LIES outside the cockpit: from a chase camera
   * the view isn't on the aircraft's attitude, so a horizon drawn level with
   * the airframe contradicts the horizon you can see out the window. The
   * meters, radar traces and warnings are all still true from any viewpoint,
   * so they stay.
   */
  setHorizonVisible(visible: boolean): void
  /**
   * REFERENCE MARKS on a meter — a notch at a level, drawn on the meter's own
   * arc so it can't drift out of alignment with the fill.
   *
   * What a bare fill can't say: with a throttle LEVER your speed is heading
   * TOWARD an equilibrium rather than sitting at one, and a needle with no
   * target looks like it's misbehaving (Tonio watched speed climb after
   * releasing the trigger and read it as a fault). A notch answers "where is
   * this going?" Same trick serves the altimeter: sea level when you're below
   * it, and the ground beneath you when that's higher.
   *
   * Levels are in the same 0..1 space as `setMeter`. Pass `[]` to clear.
   */
  setMeterMarks(name: MeterName, levels: number[]): void
}

const SVGNS = 'http://www.w3.org/2000/svg'

/**
 * Adapt a hand-exported designer asset (AMDN, generated ids) to the hooks the
 * warning/threat features need, keyed off what's STABLE in the export — so the SVG
 * can be re-exported freely. No-op once tagged (the code HUD is already tagged).
 */
const normalizeHud = (el: SVGSVGElement): void => {
  // radar/waypoint templates: designer `Radar_Hostile` → `radar-hostile`.
  for (const kind of ['neutral', 'friendly', 'hostile'] as const) {
    if (el.querySelector(`#radar-${kind}`)) continue
    const src = el.querySelector(
      `[id="Radar_${kind[0].toUpperCase()}${kind.slice(1)}"]`
    )
    if (src) src.id = `radar-${kind}`
  }
  // warning text: `#Warning` → `#warning`.
  const warn = el.querySelector('#Warning')
  if (warn && !el.querySelector('#warning')) warn.id = 'warning'
  // The four thick colored arcs are the meter gauges AND the threat frames: tag each
  // with its side (threat flash) and its meter id/axis (so setMeter binds). Once.
  if (el.querySelector('[data-side]')) return
  const METER = {
    left: { name: 'speed', axis: 'v' },
    right: { name: 'altitude', axis: 'v' },
    top: { name: 'health', axis: 'h' },
    bottom: { name: 'energy', axis: 'h' },
  } as const
  for (const p of Array.from(el.querySelectorAll('path'))) {
    const style = p.getAttribute('style') ?? ''
    const w = parseFloat(
      /stroke-width:\s*([\d.]+)/.exec(style)?.[1] ??
        p.getAttribute('stroke-width') ??
        '0'
    )
    const stroke = (
      /stroke:\s*([^;]+)/.exec(style)?.[1] ??
      p.getAttribute('stroke') ??
      ''
    )
      .trim()
      .toLowerCase()
    const d = p.getAttribute('d') ?? ''
    if (
      w >= 12 &&
      stroke &&
      stroke !== 'none' &&
      !/#000000|black/.test(stroke) &&
      d
    ) {
      const side = sideFromD(d)
      p.setAttribute('data-side', side)
      if (!p.id) {
        const m = METER[side]
        p.id = `meter-${m.name}`
        p.setAttribute('data-meter', m.name)
        p.setAttribute('data-axis', m.axis)
        p.setAttribute('pathLength', '1000')
      }
    }
  }
  // setTraces needs a #traces layer to populate.
  if (!el.querySelector('#traces')) {
    const layer = document.createElementNS(SVGNS, 'g')
    layer.id = 'traces'
    el.appendChild(layer)
  }
}

/** HUD viewBox is 256×256; CENTER is its middle. Exported so whoever projects onto
 * the HUD (b3d-hud) can map its quad's local (u,v) into these coords. */
export const HUD_VIEWBOX = 256
export const HUD_CENTER = HUD_VIEWBOX / 2
/** Radius the ring sits at, and where out-of-glass contacts pin. */
export const HUD_RING_RADIUS = 84
export const HUD_PIN_RADIUS = 116
const CENTER = HUD_CENTER // HUD viewBox centre
const PATH_LEN = 1000 // matches pathLength="1000" on the meter arcs
/** Reference marks are white: distinct from every meter colour, and reads as
 * a datum rather than as part of the fill. */
const MARK_COLOUR = '#ffffff'



export type HudControllerOptions = {
  /**
   * Pixels per degree of pitch. Also the copy spacing: the three ladder copies are
   * 10° apart, so they sit `10 * pxPerDeg` px apart — pick it so that equals the
   * ladder's own rung spacing (the asset's ladder is 64px tall, so 8 → a 16px gap).
   */
  pxPerDeg?: number
}

/** Wrap a (normalized) HUD SVG element with the meter/horizon/trace setters. */
export function createHudController(
  el: SVGSVGElement,
  options: HudControllerOptions = {}
): HudController {
  normalizeHud(el)
  const pxPerDeg = options.pxPerDeg ?? 8
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

  const setMeter = (name: MeterName, level: number) => {
    const p = el.querySelector(`#meter-${name}`) as SVGPathElement | null
    if (p == null) return
    const on = clamp01(level) * PATH_LEN
    if (p.getAttribute('data-axis') === 'h') {
      // Horizontal arcs fill MIDDLE-OUT: a gap–dash–gap triple keeps the lit part
      // centred on the arc's midpoint and growing symmetrically (no dashoffset).
      const gap = (PATH_LEN - on) / 2
      p.setAttribute('stroke-dasharray', `0 ${gap} ${on} ${gap}`)
    } else {
      // Vertical arcs fill from the path start (which is the bottom): bottom→top.
      p.setAttribute('stroke-dasharray', `${on} ${PATH_LEN}`)
    }
  }

  // Marks are CLONES of the meter path, so they follow the same arc geometry
  // by construction — no second set of coordinates to keep in sync when the
  // HUD art changes. Each carries a single short dash at its level.
  const markPaths = new Map<string, SVGPathElement[]>()
  const MARK_LEN = 14 // path units out of PATH_LEN
  const setMeterMarks = (name: MeterName, levels: number[]) => {
    const p = el.querySelector(`#meter-${name}`) as SVGPathElement | null
    if (p == null) return
    const list = markPaths.get(name) ?? []
    while (list.length < levels.length) {
      const clone = p.cloneNode(false) as SVGPathElement
      clone.removeAttribute('id')
      clone.setAttribute('data-mark', name)
      // A mark must READ AS A DIFFERENT THING from the fill, not as more of
      // it: white and fully opaque against the meter's own colour, so a glance
      // separates "where I am" from "where I'm going" without reading values.
      clone.setAttribute('stroke', MARK_COLOUR)
      clone.setAttribute('opacity', '1')
      clone.style.opacity = '1' // beat any inherited style on the source arc
      p.parentNode?.insertBefore(clone, p.nextSibling)
      list.push(clone)
    }
    while (list.length > levels.length) list.pop()?.remove()
    markPaths.set(name, list)
    const horizontal = p.getAttribute('data-axis') === 'h'
    const half = MARK_LEN / PATH_LEN / 2
    levels.forEach((level, i) => {
      // A horizontal arc fills middle-out, so a level's EDGE is where its fill
      // would reach; a vertical arc is a straight run from the start.
      const t = clamp01(level)
      const pos = horizontal ? 0.5 + t / 2 : t
      list[i].setAttribute(
        'stroke-dasharray',
        arcDashArray([[pos - half, pos + half]])
      )
    })
  }

  const ladder = el.querySelector('#horizon-ladder') as SVGGElement | null
  const horizonG = el.querySelector('#horizon') as SVGGElement | null
  let horizonVisible = true
  const setHorizonVisible = (visible: boolean) => {
    if (visible === horizonVisible) return
    horizonVisible = visible
    const display = visible ? '' : 'none'
    if (horizonG != null) horizonG.style.display = display
    if (ladder != null) ladder.style.display = display
    for (const l of ladders ?? []) l.style.display = display
  }
  // Three copies of the ladder (cloned once): the 10°-level nearest the current
  // pitch, one above, one below — each labelled with its own multiple of 10.
  let ladders: SVGGElement[] | null = null
  const ensureLadders = () => {
    if (ladders != null || ladder == null || ladder.parentNode == null) return
    const above = ladder.cloneNode(true) as SVGGElement
    const below = ladder.cloneNode(true) as SVGGElement
    above.removeAttribute('id')
    below.removeAttribute('id')
    ladder.parentNode.appendChild(above)
    ladder.parentNode.appendChild(below)
    ladders = [ladder, above, below]
  }
  const setHorizon = (pitchDeg: number, rollDeg: number, _angle?: number) => {
    ensureLadders()
    if (ladders != null) {
      const near = Math.round(pitchDeg / 10) * 10
      const angles = [near, near - 10, near + 10]
      ladders.forEach((g, i) => {
        const a = angles[i]
        // The ladder for angle `a` sits (pitch − a)° below centre (pitch up →
        // horizon slides down); its label reads that angle.
        g.setAttribute(
          'transform',
          `translate(0, ${(pitchDeg - a) * pxPerDeg})`
        )
        const label = g.querySelector('.hud-angle')
        if (label != null) label.textContent = String(a)
      })
    }
    // Counter-roll so the horizon reads level.
    horizonG?.setAttribute(
      'transform',
      `rotate(${-rollDeg}, ${CENTER}, ${CENTER})`
    )
  }

  const tracesG = el.querySelector('#traces') as SVGGElement | null
  const templateId = (kind: TraceKind) =>
    kind === 'waypoint' ? 'waypoint' : `radar-${kind}`
  const setTraces = (list: HudTracePoint[]) => {
    if (tracesG == null) return
    while (tracesG.firstChild) tracesG.removeChild(tracesG.firstChild)
    for (const t of list) {
      const src = el.querySelector(`#${templateId(t.kind)}`)
      if (src == null) continue
      const glyph = src.cloneNode(true) as SVGGElement
      glyph.removeAttribute('id')
      const { x, y, tracked } = t // already in HUD viewBox coords
      glyph.setAttribute('transform', `translate(${x}, ${y})`)
      // TWO CUES, DELIBERATELY DIFFERENT IN KIND — and the faction colour survives both.
      //  - ACQUIRING is continuous: the glyph fills with WHITE, nothing → 50%, as the
      //    lock builds (and drains back if the contact slips the cone). The outline is
      //    still the faction, so you know WHAT it is while the lock comes up.
      //  - LOCK is categorical: the OUTLINE goes WHITE, and the fill hands back — it
      //    switches to the FACTION colour (and to a bolder 75%, which a white outline
      //    needs or the faction reads washed out). So the trace never stops telling you
      //    what you're looking at: the two channels simply trade jobs. (This is also
      //    what keeps a lockable NEUTRAL legible, if we ever allow one.)
      //
      // Lock was originally ONLY that denser fill, same colour (50% → 75%). Too subtle
      // to tell apart on a thin glyph at speed: the moment of lock has to change a
      // DIFFERENT channel, not deepen the one that's already moving.
      //
      // A trace template is a <g> whose child shapes each carry their own inline stroke,
      // so both cues apply to the shapes, not the group — and the faction colour has to
      // be read off the stroke BEFORE we overwrite it.
      const fill = lockFillOpacity(t.lockProgress ?? 0, t.locked)
      if (fill > 0 || t.locked) {
        for (const s of Array.from(glyph.querySelectorAll<SVGElement>('*'))) {
          const faction = s.style.stroke || s.getAttribute('stroke') || ''
          if (faction === '') continue // unstroked shapes aren't part of the outline
          if (fill > 0) {
            s.style.fill = t.locked ? faction : '#ffffff'
            s.style.fillOpacity = String(fill)
          }
          if (t.locked) s.style.stroke = '#ffffff' // the lock cue
        }
      }
      // A locked contact stays bold even when pinned off-glass; everything else dims
      // when it's out of the field of view.
      glyph.style.opacity = t.locked || tracked ? '1' : '0.55'
      tracesG.appendChild(glyph)
    }
  }

  const setWarnings = (warnings: HudWarning[]) => {
    // Text: stack the lines into the designer's #warning text (keep its x/anchor).
    const t = el.querySelector('#warning') as SVGTextElement | null
    if (t != null) {
      const x = t.querySelector('tspan')?.getAttribute('x') ?? String(CENTER)
      while (t.firstChild) t.removeChild(t.firstChild)
      warnings.forEach((w, i) => {
        const ts = document.createElementNS(SVGNS, 'tspan')
        ts.setAttribute('x', x)
        if (i > 0) ts.setAttribute('dy', '1.2em')
        ts.textContent = w.text
        t.appendChild(ts)
      })
      t.setAttribute('visibility', warnings.length ? 'visible' : 'hidden')
    }
    // Flash the arc on each threatened side red (`.hud-threat` keyframes).
    const active = new Set(
      warnings.map((w) => w.side).filter(Boolean) as Side[]
    )
    el.querySelectorAll('[data-side]').forEach((f) =>
      f.classList.toggle(
        'hud-threat',
        active.has(f.getAttribute('data-side') as Side)
      )
    )
  }

  return {
    el,
    setMeter,
    setMeterMarks,
    setHorizon,
    setTraces,
    setWarnings,
    setHorizonVisible,
  }
}

const { svg, g, path, rect, circle, text, defs } = svgElements

// The gauge frame outlines and the four meter arcs (bezier geometry from the asset).
const FRAME_D = [
  'M201.539,201.539 C242.154,160.925,242.154,95.0754,201.539,54.4609 C201.539,54.4609,190.225,65.7746,190.225,65.7746 C224.592,100.141,224.592,155.859,190.225,190.225 C190.225,190.225,201.539,201.539,201.539,201.539 z',
  'M65.7746,190.225 C31.4085,155.859,31.4085,100.141,65.7746,65.7746 C65.7746,65.7746,54.4609,54.4609,54.4609,54.4609 C13.8464,95.0754,13.8464,160.925,54.4609,201.539 C54.4609,201.539,65.7746,190.225,65.7746,190.225 z',
  'M65.7746,65.7746 C100.141,31.4085,155.859,31.4085,190.225,65.7746 C190.225,65.7746,201.539,54.4609,201.539,54.4609 C160.925,13.8464,95.0754,13.8464,54.4609,54.4609 C54.4609,54.4609,65.7746,65.7746,65.7746,65.7746 z',
  'M54.4609,201.539 C95.0754,242.154,160.925,242.154,201.539,201.539 C201.539,201.539,190.225,190.225,190.225,190.225 C155.859,224.592,100.141,224.592,65.7746,190.225 C65.7746,190.225,54.4609,201.539,54.4609,201.539 z',
]
type Axis = 'v' | 'h'
const meter = (name: MeterName, axis: Axis, stroke: string, d: string) =>
  path({
    id: `meter-${name}`,
    'data-meter': name,
    'data-axis': axis,
    pathLength: 1000,
    stroke,
    'stroke-dasharray': '0 1000',
    d,
  })

// The frame outlines, in the FRAME_D order above → the side each borders.
const FRAME_SIDE: Side[] = ['right', 'left', 'top', 'bottom']
const glyph = (id: string, shape: SVGElement) => g({ id }, shape)

const parseSvg = (markup: string): SVGSVGElement =>
  new DOMParser().parseFromString(markup, 'image/svg+xml')
    .documentElement as unknown as SVGSVGElement

/**
 * Build the HUD in code with tosijs `svgElements` — the default when no designed
 * asset is supplied (loadHud falls back here). Geometry matches the asset.
 */
export function buildFallbackHud(
  options?: HudControllerOptions
): HudController {
  const el = svg(
    { width: 256, height: 256, viewBox: '0 0 256 256' },
    g(
      {
        id: 'meters',
        fill: 'none',
        'stroke-linecap': 'butt',
        'stroke-width': 18,
        'stroke-opacity': 0.5,
      },
      meter(
        'speed',
        'v',
        '#ff1d25',
        'M60.1178,195.882 C22.6274,158.392,22.6274,97.6081,60.1178,60.1177'
      ),
      meter(
        'altitude',
        'v',
        '#3ea9f5',
        'M195.882,195.882 C233.373,158.392,233.373,97.6081,195.882,60.1178'
      ),
      meter(
        'health',
        'h',
        '#8cc63f',
        'M60.1178,60.1178 C97.6081,22.6274,158.392,22.6274,195.882,60.1178'
      ),
      meter(
        'energy',
        'h',
        '#fcee22',
        'M60.1178,195.882 C97.6081,233.373,158.392,233.373,195.882,195.882'
      )
    ),
    g(
      { id: 'frames', fill: 'none', stroke: '#00a79e', 'stroke-width': 2 },
      ...FRAME_D.map((d, i) => path({ d, 'data-side': FRAME_SIDE[i] }))
    ),
    g(
      {
        id: 'horizon',
        fill: 'none',
        stroke: '#00a79e',
        'stroke-width': 2,
        'stroke-opacity': 0.5,
        'stroke-linecap': 'butt',
      },
      g(
        { id: 'horizon-ladder' },
        ...[
          'M64,128 L112,128',
          'M144,128 L192,128',
          'M96,96 L160,96',
          'M96,112 L160,112',
          'M96,144 L160,144',
          'M96,160 L160,160',
        ].map((d) => path({ d })),
        text(
          {
            class: 'hud-angle',
            x: 128,
            y: 128,
            fill: '#00a79e',
            'fill-opacity': 0.9,
            stroke: 'none',
            'font-family': 'ui-monospace, monospace',
            'font-size': 16,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
          },
          '0'
        )
      )
    ),
    g({ id: 'traces' }),
    defs(
      {},
      glyph(
        'radar-neutral',
        rect({
          x: -8,
          y: -8,
          width: 16,
          height: 16,
          fill: 'none',
          stroke: '#fcee22',
          'stroke-width': 4,
        })
      ),
      glyph(
        'radar-friendly',
        circle({ r: 8, fill: 'none', stroke: '#8cc63f', 'stroke-width': 4 })
      ),
      glyph(
        'radar-hostile',
        path({
          d: 'M0,-11.31 L11.31,0 L0,11.31 L-11.31,0 z',
          fill: 'none',
          stroke: '#ff1d25',
          'stroke-width': 4,
        })
      ),
      glyph(
        'waypoint',
        path({
          d: 'M0,6.19 L-6.93,-6.19 L6.93,-6.19 z',
          fill: 'none',
          stroke: '#00a79e',
          'stroke-width': 4,
        })
      )
    ),
    text(
      {
        id: 'warning',
        x: 128,
        y: 246,
        fill: '#ff1d25',
        stroke: 'none',
        'font-family': 'ui-monospace, monospace',
        'font-size': 16,
        'font-weight': 'bold',
        'text-anchor': 'middle',
        visibility: 'hidden',
      },
      ''
    )
  ) as unknown as SVGSVGElement
  return createHudController(el, options)
}

/**
 * Fetch + parse the designed HUD asset and wrap it; on any failure, fall back to
 * the embedded code HUD so a HUD always renders.
 */
export async function loadHud(
  url = '/aircraft-hud.svg',
  options?: HudControllerOptions
): Promise<HudController> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HUD asset ${url}: ${res.status}`)
    return createHudController(parseSvg(await res.text()), options)
  } catch {
    return buildFallbackHud(options)
  }
}
