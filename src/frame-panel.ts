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

## Example

XR-only. Pins an SVG panel to an [xr-frame](?xr-frames.ts) and reveals it as you look toward it.
The declarative wrapper is [<tosi-b3d-panel>](?b3d-panel.ts) — prefer it; this is the imperative version:

```javascript
import { attachFramePanel } from 'tosijs-3d'
// attachFramePanel(frames, { frame: 'left-shoulder', preset, svg }) → a gaze-revealed panel pinned
// to your shoulder. See <tosi-b3d-panel> for the element form.
```
*/
/*{ "parent": "b3d-panel", "order": 10 }*/

import * as BABYLON from '@babylonjs/core'
import {
  anchorLayout,
  anchorLength,
  type AnchorLength,
} from './anchor-layout.js'
import { SvgTexture } from './svg-texture.js'
import { markUiMesh } from './b3d-utils.js'
import { gazeReveal, type FrameName } from './xr-frames.js'
import { faceViewer } from './dialog-placement.js'

const XR_FORWARD = new BABYLON.Vector3(0, 0, 1)
const DEG = Math.PI / 180

export type { FrameName }
export type AnchorPreset =
  | 'system-bar'
  | 'waist'
  | 'left-shoulder'
  | 'right-shoulder'
  | 'overhead'
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
  /** Roll about the panel's normal (deg) — e.g. 180 to flip an upside-down pin. */
  rollDeg?: number
  /**
   * Tip it about its own horizontal axis after it faces the viewer (deg):
   * positive brings its TOP toward you, as a sign hung above eye level is
   * tilted down to be read. Its place does not change; `focus` would move it.
   */
  tiltDeg?: number
  /**
   * Parallel to the frame's own view plane ("flat on") instead of turned to
   * face the eye: on a head-locked frame (`face`), square to the screen, so an
   * off-centre panel is not foreshortened. `rollDeg`/`tiltDeg` still apply.
   */
  flatOn?: boolean
  /** Gaze half-angle (deg) where the reveal begins / completes. */
  revealStartDeg?: number
  revealFullDeg?: number
}

/** The order UI is drawn and picked in: the world, then ui, then modal. */
export type PanelLayer = 'world' | 'ui' | 'modal'

const layers = new WeakMap<
  BABYLON.Scene,
  Record<'ui' | 'modal', BABYLON.UtilityLayerRenderer>
>()

/**
 * The scene a `ui` or `modal` panel lives in: a utility layer over `scene`,
 * drawn after it with its own depth and given the pointer first (a press that
 * hits it never reaches the world). Made in pairs, ui before modal, because a
 * newer layer is drawn later and asked first: so modal is over ui.
 */
export function panelLayerScene(
  scene: BABYLON.Scene,
  layer: 'ui' | 'modal'
): BABYLON.Scene {
  let pair = layers.get(scene)
  if (pair == null) {
    const make = () => {
      const u = new BABYLON.UtilityLayerRenderer(scene, true)
      // Moves and releases reach it as well as presses (a drag that leaves
      // the panel must still end on it).
      u.onlyCheckPointerDownEvents = true
      u.utilityLayerScene.autoClearDepthAndStencil = true
      return u
    }
    pair = { ui: make(), modal: make() }
    layers.set(scene, pair)
    layerOfScene.set(pair.ui.utilityLayerScene, 'ui')
    layerOfScene.set(pair.modal.utilityLayerScene, 'modal')
    scene.onDisposeObservable.addOnce(() => {
      pair!.ui.dispose()
      pair!.modal.dispose()
      layers.delete(scene)
    })
  }
  return pair[layer].utilityLayerScene
}

const layerOfScene = new WeakMap<BABYLON.Scene, 'ui' | 'modal'>()

const claimed = new WeakSet<Event>()
/**
 * Did a panel in the scene take this pointer event? For DOM listeners that
 * act on presses "on the background" (closing an overlay): a press on a
 * frame panel is not one. (`defaultPrevented` cannot say: Babylon cancels
 * every press on its canvas.)
 */
export function pointerClaimedByPanel(e: Event): boolean {
  return claimed.has(e)
}

/** Mark a pointer event as taken by a panel in the scene (any in-scene UI
 * that is pressed, not only frame panels: a popup is a `b3dSvgPlane`). */
export function claimPointer(e: Event | null | undefined): void {
  if (e != null) claimed.add(e)
}

/** Which layer a mesh is in: a popup takes its opener's. */
export function panelLayerOf(mesh: BABYLON.Node | null | undefined): PanelLayer {
  return (mesh && layerOfScene.get(mesh.getScene())) || 'world'
}

/**
 * What a ray hits in the panel LAYERS of `scene`, top first (modal, then ui),
 * or null: for an XR controller ray, which Babylon picks against the world
 * and its own default layer only. Never makes a layer that does not exist.
 */
export function pickPanelLayers(
  scene: BABYLON.Scene,
  ray: BABYLON.Ray
): BABYLON.PickingInfo | null {
  const pair = layers.get(scene)
  if (pair == null) return null
  for (const name of ['modal', 'ui'] as const) {
    const ls = pair[name].utilityLayerScene
    const pick = ls.pickWithRay(
      ray,
      (m) => m.isPickable && m.isEnabled() && m.visibility > 0.5
    )
    if (pick?.hit) return pick
  }
  return null
}

/** A length on screen: pixels, a fraction of the axis, or of the shorter side. */
export type ScreenLength = number | `${number}%` | `${number}vmin`

export interface ScreenAnchor {
  left?: ScreenLength
  right?: ScreenLength
  top?: ScreenLength
  bottom?: ScreenLength
  /** The point of the panel a pin places (0 left … 1 right); default 0. */
  anchorX?: number
  /** The same, top to bottom; default 0. */
  anchorY?: number
  /** `'center'` is both at 0.5. */
  anchor?: 'center'
  /** Its height on screen; default its `width` at `distance`. */
  height?: ScreenLength
  /** Metres in front of the eye (pushed past the near plane). Default 1. */
  distance?: number
}

export interface FramePanelSpec {
  /** Which reference frame to pin to. Default `body`. */
  frame?: FrameName
  /**
   * Where the panel exists: `'xr'` (default — only in an immersive session) or
   * `'both'` (also in the flat view, on frames derived from the flat camera).
   * tosijs-3d#81.
   */
  presence?: 'xr' | 'both'
  /**
   * The frame to use in the FLAT view, when it should differ from `frame`.
   *
   * Two jobs. The HANDS have no flat analogue: a wrist palette in VR is
   * usually a screen-edge palette flat, which is the author's call to write
   * down, not the library's to guess (without one, a hand panel stays VR-only
   * and says so once). And on a monitor the camera's PITCH is the designer's,
   * not the viewer's: the flat `eye` frame takes only the view's yaw, so
   * elevation is measured from the horizon, and under the default 30°-down
   * orbit camera elevation 0 is off the top of the screen. `flatFrame:
   * 'face'` measures from the view itself, so a menu at elevation 0 is
   * centred (tosijs-3d#92).
   */
  flatFrame?: FrameName
  /** A preset, or an explicit anchor. */
  anchor: AnchorPreset | AnchorSpec
  /** `gaze` (default): show as you look toward it. `always`: always visible
   * (reticles, persistent HUD). */
  reveal?: 'gaze' | 'always'
  /** Restrict to a camera view: `first` (fpv/cockpit), `third` (chase), or
   * `both` (default). Hidden when the active view doesn't match. */
  view?: 'first' | 'third' | 'both'
  /** Hide beyond this distance (metres) from the head — e.g. NPC nameplates that
   * shouldn't clutter the view at range. A HARD cliff; prefer `fadeFrom`/`fadeTo`. */
  maxDistance?: number
  /**
   * Soft distance falloff: full strength within `fadeFrom` m, gone by `fadeTo` m.
   *
   * A hard `maxDistance` was tried and removed — it snapped nameplates out of existence, and
   * the cutoff that felt right on a monitor was wrong in a headset (you stand further away).
   * A fade degrades instead of switching, which is the same lesson the fog and the underwater
   * bubbles already taught us.
   */
  fadeFrom?: number
  fadeTo?: number
  /**
   * **Measure gaze against THIS, not against the panel.** A nameplate floats above its NPC's
   * head, so looking straight AT the NPC leaves the plate well outside a tight cone — and you
   * cannot summon the thing by looking at the thing. The workaround was to widen the cone to
   * 70°, which is most of your field of view, so the plates then never went away.
   *
   * The honest fix is to point the cone at what the user is actually looking AT (the subject),
   * and let the panel hang wherever it likes. Then a tight, well-behaved cone works.
   */
  gazeTarget?: BABYLON.TransformNode
  /**
   * Offset from `gazeTarget`'s origin to the point you'd actually LOOK at (metres, world axes).
   *
   * A character's node origin is at their FEET. Aim a tight cone there and, standing near
   * someone in VR, their feet are 40° below your gaze — so looking them in the eye reveals
   * nothing, forever. (Flat hides this: a chase camera looks down at the scene, so the feet
   * land near screen centre. It reads fine on a monitor and is dead in a headset.) Aim at the
   * chest.
   */
  gazeOffset?: [number, number, number]
  /** `composite` (default): alpha-over, for dialogs/panels. `add`: additive, for
   * glowing HUD glyphs like reticles (dark pixels vanish, bright ones add). */
  blend?: 'composite' | 'add'
  /**
   * Where the panel goes while its content asks for FOCUS: front and centre
   * by default (straight ahead, a little low, 0.75 m). Content asks by dispatching a `panelfocus` event on its SVG
   * with `detail: { focus: boolean }` (an inventory dock does as it opens and
   * closes); the panel comes here, enlarged by `focusScale`, always revealed,
   * and goes back to its anchor when focus ends. Content that keeps its focus
   * also marks its SVG `data-focus="true"` while it has it, so a panel made
   * later (entering or leaving a headset rebuilds them) starts focused: an
   * event is missed by a panel that did not exist yet.
   */
  focusAnchor?: AnchorPreset | AnchorSpec
  /** How much bigger a focused panel is drawn. Default 1.9. */
  focusScale?: number
  /**
   * Where it goes in the FLAT view, in place of `anchor` (with `presence:
   * 'both'`): the shoulder a headset turns to is off a monitor's edge, so a
   * panel pinned there in VR names a place in view flat (e.g. up and left in
   * the `face` frame).
   */
  flatAnchor?: AnchorPreset | AnchorSpec
  /**
   * Where it goes in the FLAT view in SCREEN terms, which wins over
   * `flatAnchor`: pinned to the view's edges like an `anchorLayout` item, in
   * pixels, a fraction of that axis (`'5%'`), or of the shorter side
   * (`'3vmin'`), with an anchor point on the panel (default its top left).
   * `height` sets its size on screen the same way (default: its `width` in
   * metres at `distance`). Square to the screen, re-solved every frame, so a
   * resize or a different shape of screen keeps it where you put it. Degrees
   * are for a headset, where the panel is around you; a monitor is a rectangle.
   */
  screenAnchor?: ScreenAnchor
  /**
   * Which LAYER it is drawn and picked in. `'world'` (default): in the scene
   * like anything else, so a nearer wall hides it and takes the press. `'ui'`:
   * over the whole world, and pressed first (what used to be a page overlay:
   * the corner controls, the scene panel, the loadout). `'modal'`: over even
   * the ui (pause, death, a dialog). Drawn AND picked in that order, because a
   * dialog drawn in front of a hill that the pointer still hits behind it is
   * worse than one honestly buried (see b3d-svg-plane).
   */
  layer?: PanelLayer
  /** Placeholder title (ignored if `svg`/`url` is supplied). */
  title?: string
  /**
   * `false`: ignore `panelfocus` from its content (stay where it is placed).
   * Default true.
   */
  focusable?: boolean
  /**
   * Its button on the scene's system bar (an `svgIcons` name), for a panel
   * whose anchor is `'system-bar'`: the button opens it under the bar.
   */
  icon?: string
  /**
   * A system panel wears the settings panel's title bar (move, its `title`,
   * ×) unless this is `'none'`, for content with chrome of its own.
   */
  chrome?: 'none'
  /** Custom panel SVG element (live/dynamic content). */
  svg?: SVGSVGElement
  /** Or fetch a static SVG from this URL (e.g. a reticle). */
  url?: string
  /** Plane aspect (height/width) when using `url` (no element to measure). 1. */
  aspect?: number
  /** Panel width in metres (height follows the aspect). Default 0.26. */
  width?: number
  /**
   * Texture resolution in pixels (square). Default 384, which suits a
   * reticle, the job frame panels were first built for. A MENU wants more:
   * a ~1100 device-px panel on a 2× display at 384 upscales text ~2.9× and
   * reads soft (tosijs-3d#92). Costs VRAM as the square, so ask for what the
   * panel's on-screen size needs.
   */
  resolution?: number
}

// Angular presets measured from the mean-eye point, all at the same comfortable
// distance (≈ the overhead menu's). Placed in the RIG frame so they're stable
// regardless of standing/sitting and don't chase the live head pose.
const PANEL_DISTANCE = 1.4

const PRESETS: Record<AnchorPreset, AnchorSpec> = {
  // Not a rig spot: a `<tosi-b3d>` puts a system-bar panel under its system
  // bar. This is only where one lands if mounted as a pin by something else.
  'system-bar': {
    azimuthDeg: 0,
    elevationDeg: 40,
    distance: PANEL_DISTANCE,
  },
  // Quick access: 45° down (faces up at you — the opposite tilt of the overhead).
  waist: {
    azimuthDeg: 0,
    elevationDeg: -45,
    distance: PANEL_DISTANCE,
    revealStartDeg: 38,
    revealFullDeg: 16,
  },
  // Inventory: 45° up, 60° to the side.
  'left-shoulder': {
    azimuthDeg: -60,
    elevationDeg: 45,
    distance: PANEL_DISTANCE,
    revealStartDeg: 44,
    revealFullDeg: 22,
  },
  'right-shoulder': {
    azimuthDeg: 60,
    elevationDeg: 45,
    distance: PANEL_DISTANCE,
    revealStartDeg: 44,
    revealFullDeg: 22,
  },
  // Overhead/global menu: 60° up.
  overhead: {
    azimuthDeg: 0,
    elevationDeg: 60,
    distance: PANEL_DISTANCE,
    revealStartDeg: 90,
    revealFullDeg: 90,
  },
  // Watch-style, on a hand frame: sat on the back of the wrist (grip space: +Z
  // points up the forearm toward the wrist, +Y out the back of the hand), facing
  // up so you turn your wrist to read it. Starting offsets — tune in-visor.
  wrist: {
    position: [0, 0.04, -0.06],
    focus: [0, 0.5, -0.06],
    rollDeg: 180, // grip space lands it upside down without this
    revealStartDeg: 55,
    revealFullDeg: 30,
  },
}

// Eye frame origin (the head). Presets place by angle from here and face it.
const DEFAULT_FOCUS: [number, number, number] = [0, 0, 0]

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
  // No border — thin strokes alias badly at distance in the headset.
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
 * Make a glow layer bloom a mesh only as much as the mesh is actually visible.
 *
 * **Babylon's glow ignores opacity.** Its default emissive pick never reads
 * `mesh.visibility`, and it passes `material.alpha` through without weighting the
 * colour by it. So a full-screen emissive quad at 30% alpha (a fade-to-white
 * curtain on the way in) blooms at FULL strength, and the frame goes white while
 * the quad itself is barely there. Measured in manta-recon (board #2742): the
 * curtain at alpha 0.3 is a dim wash without glow, and with glow the background
 * goes white, the carrier washes out and the planet bleaches. The same rule is
 * why an emissive mesh hidden with `visibility = 0` still glowed.
 *
 * This installs an emissive selector that scales the colour by
 * `material.alpha × mesh.visibility`. It keeps Babylon's emissive-texture level
 * and `emissiveIntensity`, so an opaque, fully visible mesh glows exactly as before.
 * `<tosi-b3d>` applies it to the glow layer it builds; call it yourself on one you
 * build.
 */
export function opacityWeightedGlow(layer: BABYLON.GlowLayer): void {
  layer.customEmissiveColorSelector = (mesh, _subMesh, material, result) => {
    const m = material as any
    const e = m?.emissiveColor as BABYLON.Color3 | undefined
    if (!e) {
      result.copyFrom(layer.neutralColor)
      return
    }
    const alpha = m.alpha ?? 1
    const k =
      (m.emissiveTexture?.level ?? 1) *
      (m.emissiveIntensity ?? 1) *
      alpha *
      (mesh.visibility ?? 1)
    result.set(e.r * k, e.g * k, e.b * k, alpha)
  }
}

/**
 * Keep a mesh out of every glow layer in the scene.
 *
 * A glow layer `<tosi-b3d>` builds weights glow by opacity (`opacityWeightedGlow`),
 * so a mesh hidden with `visibility = 0` no longer glows there. A plain Babylon
 * `GlowLayer` ignores `mesh.visibility` entirely, so under one of those an emissive
 * mesh whose visibility you animate (a gaze-revealed panel, a fading fragment) still
 * has to opt out of glow or it cannot actually hide. Exclusion is also right for
 * things that are emissive but are not light sources, like UI plaques.
 */
export function excludeFromGlow(
  scene: BABYLON.Scene,
  mesh: BABYLON.AbstractMesh
): void {
  for (const layer of scene.effectLayers ?? []) {
    if (layer.getClassName() === 'GlowLayer') {
      ;(layer as BABYLON.GlowLayer).addExcludedMesh(mesh as BABYLON.Mesh)
    }
  }
}

/**
 * The spec for ONE presentation of a panel that exists in both. Flat, a
 * `flatAnchor` stands in for the anchor and the screen pins apply; in a
 * headset the screen pins do NOT (there is no screen to pin to: they put the
 * loadout a metre ahead, sized from the flat canvas, instead of on your
 * shoulder, found by the 0.10.6 review). One rule, used by every attach site.
 */
export function presentationSpec(
  spec: FramePanelSpec,
  flat: boolean
): FramePanelSpec {
  if (flat)
    return spec.flatAnchor != null ? { ...spec, anchor: spec.flatAnchor } : spec
  // Layers apply in a headset too: B3d puts its controller rays' picks in
  // layer order (pickLayersFirst in tosi-b3d).
  return spec.screenAnchor != null ? { ...spec, screenAnchor: undefined } : spec
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
): {
  update: (ctx?: { firstPerson?: boolean }) => void
  dispose: () => void
  /** The plane itself — so a consumer never has to find it by diffing the
   * frame's children around the call (tosijs-3d#92). */
  readonly mesh: BABYLON.Mesh
  /** The mesh actually DRAWN: `mesh` itself, or its copy in a panel layer
   * (what a popup hangs from, which must be in the same scene). */
  readonly drawn: BABYLON.Mesh
  /** Its SVG (null for a `url` panel). `panelfocus` on it brings it front and centre. */
  readonly el: SVGSVGElement | null
  /** Last computed gaze state. Exposed for `addDebugSource` — in a headset this is
   * the ONLY way to see why a panel is (or isn't) revealing. */
  readonly debug: {
    reveal: number
    cosine: number
    distance: number
    updates: number
    camera: string
  }
} {
  const anchor: AnchorSpec =
    typeof spec.anchor === 'string' ? PRESETS[spec.anchor] : spec.anchor
  const startDeg = anchor.revealStartDeg ?? 50
  const fullDeg = anchor.revealFullDeg ?? 25
  const cosStart = Math.cos(startDeg * DEG)
  const cosFull = Math.cos(fullDeg * DEG)
  const alwaysOn = spec.reveal === 'always'

  // Resolve position: explicit, or by azimuth/elevation/distance off the focus.
  const resolve = (a: AnchorSpec): [number, number, number] => {
    if (a.position != null) return a.position
    const f = a.focus ?? DEFAULT_FOCUS
    const az = (a.azimuthDeg ?? 0) * DEG
    const el = (a.elevationDeg ?? 0) * DEG
    const d = a.distance ?? 0.5
    const horiz = d * Math.cos(el)
    return [
      f[0] + horiz * Math.sin(az),
      f[1] + d * Math.sin(el),
      f[2] + horiz * Math.cos(az),
    ]
  }

  const el =
    spec.svg ?? (spec.url ? null : placeholderPanelSvg(spec.title ?? ''))
  const aspect = el
    ? el.viewBox.baseVal.height / el.viewBox.baseVal.width || 1
    : spec.aspect ?? 1
  const width = spec.width ?? 0.26
  // The viewBox it was built at: content that grows (a dock opening) grows
  // the plane by the same ratio, so its units keep their size.
  const baseVb = el
    ? { w: el.viewBox.baseVal.width || 1, h: el.viewBox.baseVal.height || 1 }
    : null

  const plane = BABYLON.MeshBuilder.CreatePlane(
    'frame-panel',
    { width, height: width * aspect, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  )
  plane.parent = frame
  // Pointer-pickable, collision-invisible. This panel rides a head/body frame,
  // so in cockpit view it sits right in front of the airframe — and the
  // aircraft's impact sweep crashed on it. See markUiMesh.
  markUiMesh(plane)
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE
  /*
  A LAYERED PANEL (ui, modal) is drawn in a utility layer's scene, which cannot
  hold a child of this scene's frame nodes. So `plane` stays here, invisible,
  riding its frame and doing every bit of placement as before, and `shown`,
  in the layer, takes its world pose each frame (`sync`).
  */
  const layer = spec.layer ?? 'world'
  const drawScene = layer === 'world' ? scene : panelLayerScene(scene, layer)
  const shown =
    layer === 'world'
      ? plane
      : BABYLON.MeshBuilder.CreatePlane(
          'frame-panel',
          {
            width,
            height: width * aspect,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          },
          drawScene
        )
  if (shown !== plane) {
    plane.isVisible = false
    plane.isPickable = false
    shown.rotationQuaternion = new BABYLON.Quaternion()
    markUiMesh(shown)
  }
  const sync = () => {
    if (shown === plane) return
    plane.computeWorldMatrix(true)
    plane
      .getWorldMatrix()
      .decompose(shown.scaling, shown.rotationQuaternion!, shown.position)
    shown.visibility = plane.visibility
  }
  // Orient to face the focus point (your head), tilted to its height. The
  // panel doesn't rotate after this — the frame carries it (until focus moves
  // it, which places it again).
  //
  // `faceViewer` and not a local atan2: a plane's visible face is local -Z, so
  // aiming +Z at your head shows its BACK, which a double-sided plane renders
  // MIRRORED rather than not at all. This used to do exactly that and cancel it
  // with `tex.uScale = -1`; two wrongs that read correctly are still a trap for
  // the next panel, and the next panel (the world dialog) duly shipped mirrored.
  // Roll goes THROUGH faceViewer, which flips its sense — turning the panel
  // around reverses how a roll reads, so `rollDeg` keeps meaning what it meant.
  // (`rollDeg: 180`, which rights the grip-space anchors, is symmetric and
  // agrees either way — which is exactly why this needed a test rather than an
  // argument.)
  const placeAt = (a: AnchorSpec) => {
    const pos = resolve(a)
    const f = a.focus ?? DEFAULT_FOCUS
    plane.position.set(pos[0], pos[1], pos[2])
    // Flat on: oriented as a panel straight ahead of the eye would be.
    const { yaw, pitch, roll } = a.flatOn
      ? faceViewer(
          { x: 0, y: 0, z: 1 },
          { x: 0, y: 0, z: 0 },
          (a.rollDeg ?? 0) * DEG
        )
      : faceViewer(
          { x: pos[0], y: pos[1], z: pos[2] },
          { x: f[0], y: f[1], z: f[2] },
          (a.rollDeg ?? 0) * DEG
        )
    plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      yaw,
      pitch + (a.tiltDeg ?? 0) * DEG,
      roll
    )
  }
  placeAt(anchor)
  const focusAnchor: AnchorSpec =
    typeof spec.focusAnchor === 'string'
      ? PRESETS[spec.focusAnchor]
      : spec.focusAnchor ?? { azimuthDeg: 0, elevationDeg: -6, distance: 0.75 }
  const focusScale = spec.focusScale ?? 1.9
  let focused = false
  // A focused panel nearer than the camera's near plane would be clipped away
  // (a flat follow camera's is often a metre): push it out past the plane and
  // scale it by the same ratio, so it looks the same size.
  let pushed = 1
  const focusPlace = (): AnchorSpec => {
    const near = ((scene.activeCamera ?? cam) as BABYLON.Camera).minZ ?? 0
    const d = focusAnchor.distance ?? 0.5
    pushed =
      focusAnchor.position == null && d < near * 1.25 ? (near * 1.25) / d : 1
    // A screen-pinned panel comes to the middle of the SCREEN, square to it:
    // the tilt a focus anchor below eye level gives reads as a mistake on a
    // monitor (Tonio: expand "to a flat pinned position and not the slightly
    // tilted view").
    if (spec.screenAnchor) return { position: [0, 0, d * pushed], flatOn: true }
    return pushed === 1 ? focusAnchor : { ...focusAnchor, distance: d * pushed }
  }
  // The focused scale, fitted once (see below); cleared on every focus change.
  let fitted: { key: string; k: number } | null = null
  const fit = () => {
    if (!el || !baseVb) return
    const vb = el.viewBox.baseVal
    const sx = (vb.width || baseVb.w) / baseVb.w
    const sy = (vb.height || baseVb.h) / baseVb.h
    let k = focused ? focusScale * pushed : screenK
    // Focused, it fits the view (90% of it at its distance) rather than being
    // cropped by it: a monitor sees far less than a headset.
    /*
    ONCE PER FOCUS (and per content size), not per frame. The fit reads
    where the panel sits in the camera's view, and a head is never still:
    refitted every frame, a focused panel in a headset swelled and shrank
    with every small head movement. Tonio: "jiggling in scale in vr".
    */
    const c = (scene.activeCamera ?? cam) as BABYLON.Camera
    const fitKey = `${sx}|${sy}|${pushed}`
    if (focused && fitted != null && fitted.key === fitKey) {
      k = fitted.k
    } else if (focused && c.mode === BABYLON.Camera.PERSPECTIVE_CAMERA) {
      /*
      Room either side of its centre, less how far off-centre it sits, IN THE
      CAMERA'S VIEW. It used the panel's position in its frame, which is level
      while a follow camera looks down: the panel then sat lower on screen than
      the sum said, and its bottom (the end of the bag list) went off the edge.
      */
      plane.computeWorldMatrix(true)
      const p = BABYLON.Vector3.TransformCoordinates(
        plane.getAbsolutePosition(),
        c.getViewMatrix()
      )
      const d = Math.max(0.01, p.z)
      const halfTall = d * Math.tan(c.fov / 2) * 0.92
      const halfWide = halfTall * scene.getEngine().getAspectRatio(c)
      const tall = 2 * Math.max(0.01, halfTall - Math.abs(p.y))
      const wide = 2 * Math.max(0.01, halfWide - Math.abs(p.x))
      const w = width * sx
      const h = width * aspect * sy
      k = Math.min(k, tall / h, wide / w)
      fitted = { key: fitKey, k }
    }
    plane.scaling.x = k * sx
    plane.scaling.y = k * sy
  }
  /*
  SCREEN PLACEMENT (flat): solve the panel's rectangle on screen with the
  anchored layout at its current pixel size, then put its centre at that pixel
  on a plane `distance` in front of the eye. The frame is the head-locked
  `face` one (local +x right, +y up, +z ahead), so a pixel is a fixed offset.
  */
  let screenK = 1
  // Where it last went on screen, in CSS pixels, for a drag to start from.
  let lastBox: {
    x: number
    y: number
    w: number
    h: number
    W: number
    H: number
  } | null = null
  const placeScreen = () => {
    const sa = spec.screenAnchor
    const c = (scene.activeCamera ?? cam) as BABYLON.Camera
    const canvas = scene.getEngine().getRenderingCanvas()
    if (!sa || !c || !canvas || c.mode !== BABYLON.Camera.PERSPECTIVE_CAMERA)
      return
    const W = canvas.clientWidth || scene.getEngine().getRenderWidth()
    const H = canvas.clientHeight || scene.getEngine().getRenderHeight()
    if (!W || !H) return
    const vmin = Math.min(W, H)
    const px = (v: ScreenLength | undefined) =>
      typeof v === 'string' && v.endsWith('vmin')
        ? (parseFloat(v) / 100) * vmin
        : (v as AnchorLength | undefined)
    const d = Math.max(sa.distance ?? 1, (c.minZ ?? 0) * 1.25)
    // Metres per pixel at that distance, by whichever axis the fov fixes.
    const perPx =
      c.fovMode === BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED
        ? (2 * d * Math.tan(c.fov / 2)) / W
        : (2 * d * Math.tan(c.fov / 2)) / H
    const vb = el?.viewBox.baseVal
    const sx = el && baseVb ? (vb!.width || baseVb.w) / baseVb.w : 1
    const sy = el && baseVb ? (vb!.height || baseVb.h) / baseVb.h : 1
    const baseW = width * sx
    const baseH = width * aspect * sy
    screenK =
      sa.height != null
        ? (anchorLength(px(sa.height) as AnchorLength, H) * perPx) / baseH
        : 1
    const { boxes } = anchorLayout(
      [
        {
          left: px(sa.left),
          right: px(sa.right),
          top: px(sa.top),
          bottom: px(sa.bottom),
          anchorX: sa.anchorX,
          anchorY: sa.anchorY,
          anchor: sa.anchor,
          width: (baseW * screenK) / perPx,
          height: (baseH * screenK) / perPx,
        },
      ],
      { width: W, height: H }
    )
    const b = boxes[0]
    lastBox = { x: b.x, y: b.y, w: b.width, h: b.height, W, H }
    placeAt({
      position: [
        (b.x + b.width / 2 - W / 2) * perPx,
        (H / 2 - (b.y + b.height / 2)) * perPx,
        d,
      ],
      flatOn: true,
    })
  }
  const onFocus = (e: Event) => {
    focused = !!(e as CustomEvent<{ focus?: boolean }>).detail?.focus
    fitted = null
    placeAt(focused ? focusPlace() : anchor)
    fit()
  }
  // A panel the scene places itself (a system-bar panel, under its bar)
  // does not fly front and centre when its content asks to.
  const focusable = spec.focusable !== false
  if (focusable) el?.addEventListener('panelfocus', onFocus)
  // Content already focused before this panel existed (a session change
  // rebuilt it): start where it is. Without this the dock stayed open on a
  // small, unfocused panel, and its tap-to-open did nothing (it was open).
  if (focusable && el?.getAttribute('data-focus') === 'true')
    onFocus(new CustomEvent('panelfocus', { detail: { focus: true } }))

  const tex = el
    ? new SvgTexture({
        scene: drawScene,
        element: el,
        resolution: spec.resolution ?? 384,
        updateInterval: 400,
      })
    : new SvgTexture({
        scene: drawScene,
        url: spec.url,
        resolution: spec.resolution ?? 384,
      })
  const mat = new BABYLON.StandardMaterial('frame-panel-mat', drawScene)
  mat.backFaceCulling = false
  mat.emissiveTexture = tex.texture
  mat.opacityTexture = tex.texture
  mat.diffuseColor = BABYLON.Color3.Black()
  mat.disableLighting = true
  // Additive for glowing HUD glyphs (reticle): dark pixels add nothing, bright
  // ones glow over the scene; don't occlude. Default composite (alpha-over).
  if (spec.blend === 'add') {
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
  }
  shown.material = mat
  plane.visibility = alwaysOn ? 1 : 0
  // ⚠️ THE GLOW LAYER DOES NOT RESPECT `mesh.visibility` — Babylon's effect-layer code never
  // reads it. And this material is PURE EMISSIVE (black diffuse, lighting off, emissive =
  // the SVG), which is exactly what glow harvests. So a gaze-hidden panel keeps being drawn
  // by the glow pass, BEHIND visibility's back: the reveal computes perfectly and the plate
  // never goes away. It reads as a soft bloom on a monitor (easy to miss) and as a plainly
  // visible floating plaque in a headset. Exclude it — a UI plaque shouldn't bloom anyway.
  excludeFromGlow(drawScene, shown)

  const head = new BABYLON.Vector3()
  const fwd = new BABYLON.Vector3()
  const toAnchor = new BABYLON.Vector3()
  const toSubject = new BABYLON.Vector3()
  const viewMode = spec.view ?? 'both'
  const maxDist = spec.maxDistance ?? Infinity
  const gazeTarget = spec.gazeTarget ?? null
  const gazeOffset = spec.gazeOffset ?? [0, 0, 0]
  const fadeFrom = spec.fadeFrom ?? Infinity
  const fadeTo = spec.fadeTo ?? Infinity
  // `updates` is the load-bearing one: if it doesn't ADVANCE in a session, the
  // reveal isn't broken — it's simply never running, and the panel is stuck at
  // whatever visibility it was born with.
  const debug = {
    reveal: alwaysOn ? 1 : 0,
    cosine: 0,
    distance: 0,
    updates: 0,
    camera: '—',
  }

  /*
  POINTERS, so a panel of controls is a panel you can USE (tosijs-3d#92).

  A `panel3d` SVG exposes `handlePointer(kind, x, y)` in viewBox coordinates,
  and b3d-svg-plane has always routed scene picks into it — mouse, touch and
  XR rays alike, through the one scene pointer observable. This marked its
  plane pickable and routed nothing, so a menu here drew working-looking
  buttons that ignored every click, with no error: the worst failure a menu
  can have. Same routing as b3d-svg-plane: a press must land ON the plane, and
  once pressed the panel owns the gesture until release (so a slider drag
  survives leaving the track).

  A gaze-hidden panel does not take presses: it is not there for the user.

  And REPAINT NOW on a press or release, instead of waiting for the texture's
  400 ms timer. Otherwise a button's pressed state lags by up to that, which
  does not matter for a reticle and matters a lot for a menu. A move repaints
  at most once per frame.
  */
  const target = el as unknown as {
    handlePointer?: (k: string, x: number, y: number) => void
    gripHit?: (x: number, y: number) => boolean
  } | null
  /*
  DRAGGED BY ITS TITLE BAR, on screen. A screen-anchored panel whose SVG
  says where its grip is (`gripHit`, from `panel3d({ grip })`) moves with the
  pointer, in pixels, and stays on screen. It writes `left`/`top` into the
  spec's own `screenAnchor`, so a host that hands the same object to the
  next build keeps the spot across a rebuild.
  */
  let screenDrag: { cx: number; cy: number; x: number; y: number } | null =
    null
  const dragScreen = (e: PointerEvent | undefined) => {
    const sa = spec.screenAnchor
    if (screenDrag == null || sa == null || lastBox == null || e == null) return
    const { w, W, H } = lastBox
    // Keep the bar reachable: at least 48px of it on screen, top never above.
    const left = screenDrag.x + (e.clientX - screenDrag.cx)
    const top = screenDrag.y + (e.clientY - screenDrag.cy)
    sa.left = Math.round(Math.max(48 - w, Math.min(W - 48, left)))
    sa.top = Math.round(Math.max(0, Math.min(H - 32, top)))
    sa.right = sa.bottom = undefined
    sa.anchorX = sa.anchorY = undefined
    sa.anchor = undefined
  }
  /*
  A PRESS ON THE PANEL IS NOT A PRESS ON THE WORLD. Flat, the camera's own
  controls take the same pointer, so dragging a thing across a panel orbited
  the view behind it. Hold the camera's controls for the gesture and give
  them back on release. (A headset's camera has none attached; nothing to do.)
  */
  let held: BABYLON.Camera | null = null
  const holdCamera = () => {
    const c = scene.activeCamera as BABYLON.Camera | null
    if (c && (c.inputs as any)?.attachedToElement) {
      c.detachControl()
      held = c
    }
  }
  const releaseCamera = () => {
    if (held == null) return
    ;(held as any).attachControl(scene.getEngine().getRenderingCanvas(), true)
    held = null
  }
  let pointerObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.PointerInfo>> = null
  if (target != null && typeof target.handlePointer === 'function' && el) {
    scene.constantlyUpdateMeshUnderPointer = true
    const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
    let pressing = false
    let hovering = false
    let lastX = 0
    let lastY = 0
    let repaintQueued = false
    const repaint = (now: boolean) => {
      if (now) return tex.render()
      if (repaintQueued) return
      repaintQueued = true
      scene.onAfterRenderObservable.addOnce(() => {
        repaintQueued = false
        tex.render()
      })
    }
    pointerObs = drawScene.onPointerObservable.add((info) => {
      const kind =
        info.type === POINTERDOWN
          ? 'down'
          : info.type === POINTERUP
          ? 'up'
          : info.type === POINTERMOVE
          ? 'move'
          : ''
      if (!kind) return
      const pick = info.pickInfo
      const onPlane =
        !!pick?.hit && pick.pickedMesh === shown && plane.visibility > 0.5
      const uv = onPlane && pick ? pick.getTextureCoordinates() : null
      if (uv) {
        const vb = el.viewBox.baseVal
        lastX = uv.x * (vb.width || 1)
        lastY = (1 - uv.y) * (vb.height || 1)
      }
      if (screenDrag != null) {
        if (kind === 'move') dragScreen(info.event as PointerEvent)
        else if (kind === 'up') {
          screenDrag = null
          releaseCamera()
        }
        return
      }
      if (kind === 'down') {
        if (!uv) return
        const ev = info.event as PointerEvent | undefined
        if (
          spec.screenAnchor != null &&
          !focused &&
          lastBox != null &&
          ev != null &&
          target.gripHit?.(lastX, lastY)
        ) {
          screenDrag = {
            cx: ev.clientX,
            cy: ev.clientY,
            x: lastBox.x,
            y: lastBox.y,
          }
          holdCamera()
          ev.preventDefault?.()
          claimPointer(ev as unknown as Event)
          target.handlePointer!('leave', 0, 0)
          return
        }
        pressing = true
        holdCamera()
        /*
        THE PANEL HAS THIS PRESS, so the game does not also get it. The
        biped's controls read MOUSE events (Mouse0 is the A button, a jump),
        so every press on the loadout also jumped, or worse with a weapon up.
        Cancelling the pointerdown is the web's own rule for this: the browser
        then sends no compatibility mousedown/mouseup for it, while the scene's
        pointer picking (pointer events) carries on.
        */
        ;(info.event as PointerEvent | undefined)?.preventDefault?.()
        // …and say so: Babylon cancels every canvas press itself, so being
        // cancelled cannot tell a panel's press from a press on the world.
        claimPointer(info.event as unknown as Event)
        target.handlePointer!('down', lastX, lastY)
        repaint(true)
      } else if (kind === 'move') {
        if (pressing || uv) {
          hovering = true
          target.handlePointer!('move', lastX, lastY)
          repaint(false)
        } else if (hovering) {
          // Off the plane: clear the hover, or a highlighted row stays lit.
          hovering = false
          target.handlePointer!('leave', 0, 0)
          repaint(false)
        }
      } else if (pressing) {
        pressing = false
        releaseCamera()
        target.handlePointer!('up', lastX, lastY)
        repaint(true)
      }
    })
  }

  // Where it goes and how visible, this frame (the layered copy follows in sync).
  const place = (ctx?: { firstPerson?: boolean }) => {
    debug.updates++
    if (spec.screenAnchor && !focused) placeScreen()
    fit()
    // Focused content is in front of you because you asked for it.
    if (focused) {
      plane.visibility = 1
      debug.reveal = 1
      return
    }
    const fp = ctx?.firstPerson ?? true
    if ((viewMode === 'first' && !fp) || (viewMode === 'third' && fp)) {
      plane.visibility = 0
      debug.reveal = 0
      return
    }
    if (alwaysOn) {
      plane.visibility = 1
      debug.reveal = 1
      return
    }
    // Gaze-reveal off whatever camera is currently rendering — the flat orbit/
    // follow camera on a monitor, the headset camera in a session. This is what
    // lets frame panels (nameplates, HUD) work in NON-VR too, not just XR.
    const active = (scene.activeCamera as BABYLON.TargetCamera) ?? cam
    head.copyFrom(active.globalPosition)
    active.getDirectionToRef(XR_FORWARD, fwd)
    plane.getAbsolutePosition().subtractToRef(head, toAnchor)
    // Aim the cone at the SUBJECT (the NPC), not at the plate hovering above their head —
    // otherwise looking straight at someone doesn't reveal their name, and the only way to
    // fix THAT is a cone so wide it never hides anything. Distance is still measured to the
    // panel, which is what "how far away is this label" actually means.
    if (gazeTarget != null) {
      gazeTarget.getAbsolutePosition().subtractToRef(head, toSubject)
      toSubject.x += gazeOffset[0]
      toSubject.y += gazeOffset[1]
      toSubject.z += gazeOffset[2]
    } else {
      toSubject.copyFrom(toAnchor)
    }
    let v = gazeReveal(fwd, toSubject, cosStart, cosFull)

    // Soft distance falloff — fade, never cliff.
    const dist = toAnchor.length()
    if (v > 0 && dist > fadeFrom && fadeTo > fadeFrom) {
      v *= Math.max(0, 1 - (dist - fadeFrom) / (fadeTo - fadeFrom))
    }
    plane.visibility = dist > maxDist ? 0 : v

    debug.reveal = plane.visibility
    debug.camera = active.getClassName()
    debug.distance = dist
    const fl = fwd.length() || 1
    const sl = toSubject.length() || 1
    debug.cosine = BABYLON.Vector3.Dot(fwd, toSubject) / (fl * sl)
  }

  return {
    debug,
    mesh: plane,
    drawn: shown,
    // Its SVG (null for a `url` panel): send it `panelfocus` to bring the
    // panel front and centre, as the scene's VR toolbar does.
    el,
    // `ctx.firstPerson` is the active camera view (fpv/cockpit vs chase), so a
    // panel can be limited to one. Defaults to visible if no context is given.
    update(ctx?: { firstPerson?: boolean }) {
      place(ctx)
      sync()
    },
    dispose() {
      releaseCamera()
      el?.removeEventListener('panelfocus', onFocus)
      if (pointerObs != null) drawScene.onPointerObservable.remove(pointerObs)
      tex.dispose()
      mat.dispose()
      if (shown !== plane) shown.dispose()
      plane.dispose()
    },
  }
}
