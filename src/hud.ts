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
*/
/*{ "parent": "Core" }*/

import { hudTrace, horizonTransform, type HudTraceOptions } from './hud-math'
import type { Pose, Vec3 } from './spatial-transform'

export type MeterName = 'speed' | 'altitude' | 'health' | 'energy'
export type TraceKind = 'neutral' | 'friendly' | 'hostile' | 'waypoint'
export type HudTraceInput = { pos: Vec3; kind: TraceKind }

export type HudController = {
  /** The live SVG element (mount it, or feed it to an SvgTexture). */
  readonly el: SVGSVGElement
  /** Fill a meter arc, `level` 0..1. */
  setMeter(name: MeterName, level: number): void
  /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
  setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void
  /** Replace the radar/waypoint traces from world positions + the viewer pose. */
  setTraces(traces: HudTraceInput[], viewer: Pose, opts: HudTraceOptions): void
}

const CENTER = 128 // HUD viewBox centre
const PATH_LEN = 1000 // matches pathLength="1000" on the meter arcs

export type HudControllerOptions = {
  /** Pixels the pitch ladder slides per degree of pitch. */
  pxPerDeg?: number
  /**
   * Vertical period (px) between tiled copies of the pitch ladder. The horizon is
   * drawn as THREE copies — the one nearest the current level plus one above and one
   * below — scrolling and wrapping so the ladder stays continuous at any pitch.
   */
  ladderPeriodPx?: number
}

/** Wrap a (normalized) HUD SVG element with the meter/horizon/trace setters. */
export function createHudController(
  el: SVGSVGElement,
  options: HudControllerOptions = {}
): HudController {
  const pxPerDeg = options.pxPerDeg ?? 6
  const ladderPeriod = options.ladderPeriodPx ?? 64
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

  const ladder = el.querySelector('#horizon-ladder') as SVGGElement | null
  const horizonG = el.querySelector('#horizon') as SVGGElement | null
  const angleText = el.querySelector('#hud-angle') as SVGTextElement | null
  // Three tiled copies of the ladder for a continuous horizon (cloned once).
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
  const setHorizon = (pitchDeg: number, rollDeg: number, angle?: number) => {
    const t = horizonTransform(pitchDeg, rollDeg, pxPerDeg)
    ensureLadders()
    if (ladders != null) {
      const P = ladderPeriod
      let w = ((t.offsetY % P) + P) % P // wrap into [0, P)
      if (w > P / 2) w -= P // → [-P/2, P/2): the nearest copy sits closest to centre
      ladders[0].setAttribute('transform', `translate(0, ${w})`)
      ladders[1].setAttribute('transform', `translate(0, ${w - P})`) // one above
      ladders[2].setAttribute('transform', `translate(0, ${w + P})`) // one below
    }
    horizonG?.setAttribute(
      'transform',
      `rotate(${t.rollDeg}, ${CENTER}, ${CENTER})`
    )
    if (angleText != null && angle != null) {
      angleText.textContent = String(Math.round(angle))
    }
  }

  const tracesG = el.querySelector('#traces') as SVGGElement | null
  const templateId = (kind: TraceKind) =>
    kind === 'waypoint' ? 'waypoint' : `radar-${kind}`
  const setTraces = (
    list: HudTraceInput[],
    viewer: Pose,
    opts: HudTraceOptions
  ) => {
    if (tracesG == null) return
    while (tracesG.firstChild) tracesG.removeChild(tracesG.firstChild)
    for (const t of list) {
      const src = el.querySelector(`#${templateId(t.kind)}`)
      if (src == null) continue
      const glyph = src.cloneNode(true) as SVGGElement
      glyph.removeAttribute('id')
      const { x, y, tracked } = hudTrace(viewer, t.pos, opts)
      glyph.setAttribute('transform', `translate(${CENTER + x}, ${CENTER + y})`)
      // Pinned (out-of-FOV) traces read dimmer than tracked ones.
      glyph.setAttribute('opacity', tracked ? '1' : '0.55')
      tracesG.appendChild(glyph)
    }
  }

  return { el, setMeter, setHorizon, setTraces }
}

// Compact code equivalent of static/aircraft-hud.svg — the "default fallback" so a
// HUD renders even if the designed asset isn't served. Same ids/structure the
// controller drives (meters with data-axis + pathLength, horizon, traces, glyphs).
const FALLBACK_HUD_MARKUP = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
<g id="meters" fill="none" stroke-linecap="butt" stroke-width="16">
<path id="meter-speed" data-axis="v" pathLength="1000" stroke="#ff1d25" stroke-dasharray="0 1000" d="M60.12,195.88 A96,96 0 0 1 60.12,60.12"/>
<path id="meter-altitude" data-axis="v" pathLength="1000" stroke="#3ea9f5" stroke-dasharray="0 1000" d="M195.88,195.88 A96,96 0 0 0 195.88,60.12"/>
<path id="meter-health" data-axis="h" pathLength="1000" stroke="#8cc63f" stroke-dasharray="0 1000" d="M60.12,60.12 A96,96 0 0 1 195.88,60.12"/>
<path id="meter-energy" data-axis="h" pathLength="1000" stroke="#fcee22" stroke-dasharray="0 1000" d="M60.12,195.88 A96,96 0 0 0 195.88,195.88"/>
</g>
<g id="horizon" fill="none" stroke="#00a79e" stroke-width="2" stroke-opacity="0.5">
<g id="horizon-ladder"><path d="M64,128 L112,128"/><path d="M144,128 L192,128"/><path d="M96,112 L160,112"/><path d="M96,144 L160,144"/></g>
<text id="hud-angle" x="128" y="128" fill="#00a79e" stroke="none" font-family="ui-monospace,monospace" font-size="16" text-anchor="middle" dominant-baseline="central">0</text>
</g>
<g id="traces"></g>
<defs>
<g id="radar-neutral"><rect x="-8" y="-8" width="16" height="16" fill="none" stroke="#fcee22" stroke-width="4"/></g>
<g id="radar-friendly"><circle r="8" fill="none" stroke="#8cc63f" stroke-width="4"/></g>
<g id="radar-hostile"><path d="M0,-11.31 L11.31,0 L0,11.31 L-11.31,0 z" fill="none" stroke="#ff1d25" stroke-width="4"/></g>
<g id="waypoint"><path d="M0,6.19 L-6.93,-6.19 L6.93,-6.19 z" fill="none" stroke="#00a79e" stroke-width="4"/></g>
</defs>
</svg>`

const parseSvg = (markup: string): SVGSVGElement =>
  new DOMParser().parseFromString(markup, 'image/svg+xml')
    .documentElement as unknown as SVGSVGElement

/** Build a HUD from the embedded code fallback (no asset fetch). */
export function buildFallbackHud(
  options?: HudControllerOptions
): HudController {
  return createHudController(parseSvg(FALLBACK_HUD_MARKUP), options)
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
