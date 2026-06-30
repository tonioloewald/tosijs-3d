/*#
# frame-panel

A spatial UI panel pinned to an XR reference frame (see [xr-frames](?xr-frames.ts)).
You give it a frame, a position (or a preset), and a placeholder title or your own
SVG; it renders the panel there and reveals it as you look toward it (`gazeReveal`).

This is the substrate for body-anchored UI — a waist "quick access / holster"
panel revealed by looking down, inventory panels over either shoulder revealed by
glancing back. The panel is FIXED in its frame (it doesn't billboard); the frame
itself moves (e.g. `body` follows your torso), so the panel rides with you and is
oriented once to face your head.

Anchor presets (in the `body` frame, metres; y is absolute since `body` sits at
the floor): `waist`, `left-shoulder`, `right-shoulder`.
*/
/*{ "parent": "Core" }*/

import * as BABYLON from '@babylonjs/core'
import { SvgTexture } from './svg-texture'
import { gazeReveal, type FrameName } from './xr-frames'

const XR_FORWARD = new BABYLON.Vector3(0, 0, 1)
const DEG = Math.PI / 180

export type { FrameName }
export type AnchorPreset =
  | 'waist'
  | 'left-shoulder'
  | 'right-shoulder'
  | 'wrist'

export interface AnchorSpec {
  /** Explicit local position in the frame (metres). */
  position?: [number, number, number]
  /** Or place it by angle off the focus: azimuth (+right/−left from forward),
   * elevation (+up/−down), at `distance` metres. The natural way to say
   * "70° to the side and 20° up". */
  azimuthDeg?: number
  elevationDeg?: number
  distance?: number
  /** Point the panel turns to face (default the head ≈ (0, 1.6, 0)). Also the
   * origin angular placement is measured from. */
  focus?: [number, number, number]
  /** Gaze half-angle (deg) where the reveal begins / completes. */
  revealStartDeg?: number
  revealFullDeg?: number
}

export interface FramePanelSpec {
  /** Which reference frame to pin to. Default `body`. */
  frame?: FrameName
  /** A preset, or an explicit anchor. */
  anchor: AnchorPreset | AnchorSpec
  /** `gaze` (default): show as you look toward it. `always`: always visible
   * (reticles, persistent HUD). */
  reveal?: 'gaze' | 'always'
  /** Placeholder title (ignored if `svg`/`url` is supplied). */
  title?: string
  /** Custom panel SVG element (live/dynamic content). */
  svg?: SVGSVGElement
  /** Or fetch a static SVG from this URL (e.g. a reticle). */
  url?: string
  /** Plane aspect (height/width) when using `url` (no element to measure). 1. */
  aspect?: number
  /** Panel width in metres (height follows the aspect). Default 0.26. */
  width?: number
}

// Angular presets measured off the head: "not too far" → 0.5 m out.
const PRESETS: Record<AnchorPreset, AnchorSpec> = {
  // Low and deliberate — you have to look well down to your belt to show it.
  waist: {
    azimuthDeg: 0,
    elevationDeg: -68,
    distance: 0.85,
    revealStartDeg: 34,
    revealFullDeg: 14,
  },
  'left-shoulder': {
    azimuthDeg: -70,
    elevationDeg: 20,
    distance: 0.5,
    revealStartDeg: 48,
    revealFullDeg: 24,
  },
  'right-shoulder': {
    azimuthDeg: 70,
    elevationDeg: 20,
    distance: 0.5,
    revealStartDeg: 48,
    revealFullDeg: 24,
  },
  // Watch-style, on a hand frame: just back of the grip toward the forearm,
  // facing up out of the back of the wrist (you turn your wrist to read it).
  // Starting offsets — expect to tune to the grip convention in-visor.
  wrist: {
    position: [0, 0.035, 0.06],
    focus: [0, 0.5, 0.06],
    revealStartDeg: 55,
    revealFullDeg: 30,
  },
}

const DEFAULT_FOCUS: [number, number, number] = [0, 1.6, 0]

/** A simple titled placeholder panel SVG (rounded card + centred label). */
export function placeholderPanelSvg(
  title: string,
  w = 320,
  h = 200
): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(h))
  const rect = document.createElementNS(NS, 'rect')
  rect.setAttribute('x', '4')
  rect.setAttribute('y', '4')
  rect.setAttribute('width', String(w - 8))
  rect.setAttribute('height', String(h - 8))
  rect.setAttribute('rx', '18')
  rect.setAttribute('fill', 'rgba(18,22,31,0.82)')
  rect.setAttribute('stroke', 'rgba(120,170,255,0.9)')
  rect.setAttribute('stroke-width', '3')
  svg.appendChild(rect)
  const text = document.createElementNS(NS, 'text')
  text.setAttribute('x', String(w / 2))
  text.setAttribute('y', String(h / 2))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'middle')
  text.setAttribute('fill', '#cfe0ff')
  text.setAttribute('font-size', '34')
  text.setAttribute('font-family', 'system-ui, sans-serif')
  text.textContent = title
  svg.appendChild(text)
  return svg as SVGSVGElement
}

/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export function attachFramePanel(
  scene: BABYLON.Scene,
  cam: BABYLON.TargetCamera,
  frame: BABYLON.TransformNode,
  spec: FramePanelSpec
): { update: () => void; dispose: () => void } {
  const anchor: AnchorSpec =
    typeof spec.anchor === 'string' ? PRESETS[spec.anchor] : spec.anchor
  const focus = anchor.focus ?? DEFAULT_FOCUS
  const startDeg = anchor.revealStartDeg ?? 50
  const fullDeg = anchor.revealFullDeg ?? 25
  const cosStart = Math.cos(startDeg * DEG)
  const cosFull = Math.cos(fullDeg * DEG)
  const alwaysOn = spec.reveal === 'always'

  // Resolve position: explicit, or by azimuth/elevation/distance off the focus.
  let pos = anchor.position
  if (pos == null) {
    const az = (anchor.azimuthDeg ?? 0) * DEG
    const el = (anchor.elevationDeg ?? 0) * DEG
    const d = anchor.distance ?? 0.5
    const horiz = d * Math.cos(el)
    pos = [
      focus[0] + horiz * Math.sin(az),
      focus[1] + d * Math.sin(el),
      focus[2] + horiz * Math.cos(az),
    ]
  }

  const el = spec.svg ?? (spec.url ? null : placeholderPanelSvg(spec.title ?? ''))
  const aspect = el ? el.viewBox.baseVal.height / el.viewBox.baseVal.width || 1 : spec.aspect ?? 1
  const width = spec.width ?? 0.26

  const plane = BABYLON.MeshBuilder.CreatePlane(
    'frame-panel',
    { width, height: width * aspect, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  )
  plane.parent = frame
  plane.position.set(pos[0], pos[1], pos[2])
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE
  // Orient ONCE to face the focus point (your head): +Z toward it, tilted to its
  // height. The panel doesn't rotate after this — the frame carries it.
  const dx = focus[0] - pos[0]
  const dy = focus[1] - pos[1]
  const dz = focus[2] - pos[2]
  const yaw = Math.atan2(dx, dz)
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz))
  plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch, 0)

  const tex = el
    ? new SvgTexture({ scene, element: el, resolution: 384, updateInterval: 400 })
    : new SvgTexture({ scene, url: spec.url, resolution: 384 })
  const mat = new BABYLON.StandardMaterial('frame-panel-mat', scene)
  mat.backFaceCulling = false
  mat.emissiveTexture = tex.texture
  mat.opacityTexture = tex.texture
  // The face you view is the plane's back (+Z points at you), which mirrors the
  // texture horizontally — flip U so it reads correctly.
  tex.texture.uScale = -1
  tex.texture.uOffset = 1
  mat.diffuseColor = BABYLON.Color3.Black()
  mat.disableLighting = true
  plane.material = mat
  plane.visibility = alwaysOn ? 1 : 0

  const head = new BABYLON.Vector3()
  const fwd = new BABYLON.Vector3()
  const toAnchor = new BABYLON.Vector3()

  return {
    update() {
      if (alwaysOn) return
      head.copyFrom(cam.globalPosition)
      cam.getDirectionToRef(XR_FORWARD, fwd)
      plane.getAbsolutePosition().subtractToRef(head, toAnchor)
      plane.visibility = gazeReveal(fwd, toAnchor, cosStart, cosFull)
    },
    dispose() {
      tex.dispose()
      mat.dispose()
      plane.dispose()
    },
  }
}
