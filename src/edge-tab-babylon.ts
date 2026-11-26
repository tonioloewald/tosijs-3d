/*
The Babylon side of edge-tab (see edge-tab.ts for the page): a panel's header
drawn at the edge of the headset's view while the panel is out of it.
*/

import * as BABYLON from '@babylonjs/core'
import { svgElements } from 'tosijs'
import { SvgTexture } from './svg-texture.js'
import { markUiMesh } from './b3d-utils.js'
import { w3dTheme } from './w3d-theme.js'
import { panelRim } from './panel-rim.js'
import { iconGlyph } from './svg-icons.js'
import { claimPointer, excludeFromGlow } from './frame-panel.js'
import {
  EDGE_TAB_HEIGHT,
  EDGE_TAB_MARGIN,
  EDGE_TAB_OVERHANG,
  edgeCollapsed,
  edgeTabAvoid,
  edgeTabSpot,
  fitTab,
  panelExtent,
  tangentBounds,
  type HeadVec,
  type PlacedTab,
  type TangentBounds,
} from './edge-tab.js'

export interface EdgeTabOptions {
  /** What the header says: the panel's title. */
  title?: string
  /** An `svgIcons` name drawn before the title (or alone, with no title). */
  icon?: string
  /** A tap on the tab. */
  handleTap?: () => void
  /** The scene the tab is drawn and pressed in (a panel layer). Default `scene`. */
  drawScene?: BABYLON.Scene
  /** See `EDGE_TAB_OVERHANG`. */
  overhang?: number
}

export interface EdgeTab {
  /**
   * Once a frame, with the panel's plane: true while the panel is out of
   * view and drawn as this tab (the caller hides the panel).
   */
  update: (panel: BABYLON.AbstractMesh) => boolean
  /** Not a tab, whatever the panel does (a drag, a session ending). */
  hide: () => void
  readonly collapsed: boolean
  readonly mesh: BABYLON.Mesh
  setTitle: (title: string) => void
  dispose: () => void
}

const H = 40 // the tab's height in viewBox units
const FORWARD = new BABYLON.Vector3(0, 0, 1)
const BACK = new BABYLON.Vector3(0, 0, -1)
const FONT = 18

/** Tabs placed this frame, per scene, so two on one edge stand apart. */
const placedTabs = new WeakMap<
  BABYLON.Scene,
  { frame: number; tabs: PlacedTab[] }
>()

/** The header's picture: a pill, a chevron toward the panel, icon, title. */
function tabSvg(
  title: string,
  icon: string | undefined,
  angleDeg: number,
  lit: boolean
): SVGSVGElement {
  const { svg, rect, text, path, g } = svgElements
  const chevron = 22
  const iconW = icon ? 26 : 0
  const textW = title ? Math.ceil(title.length * FONT * 0.56) : 0
  const W = Math.max(H, 14 + chevron + iconW + (textW ? textW + 8 : 0) + 14)
  const ink = w3dTheme.text
  const root = svg({
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${W} ${H}`,
    width: W,
    height: H,
    'data-texture-cache': '',
  }) as unknown as SVGSVGElement
  root.append(
    rect({
      x: 0,
      y: 0,
      width: W,
      height: H,
      rx: H / 2,
      ry: H / 2,
      fill: lit ? w3dTheme.buttonHover : w3dTheme.panelBg,
    }),
    // SVG's y runs down, so an angle up the view turns the other way.
    g(
      { transform: `translate(${14 + chevron / 2} ${H / 2}) rotate(${-angleDeg})` },
      path({
        d: 'M -4 -7 L 4 0 L -4 7',
        fill: 'none',
        stroke: lit ? w3dTheme.accent : ink,
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      })
    )
  )
  let x = 14 + chevron + 4
  if (icon) {
    root.append(
      iconGlyph(icon, { color: ink, size: 20, x, y: (H - 20) / 2 })
    )
    x += iconW
  }
  if (title)
    root.append(
      text(
        {
          x,
          y: H / 2,
          'dominant-baseline': 'central',
          fill: ink,
          'font-family': w3dTheme.fontFamily,
          'font-size': FONT,
          'font-weight': w3dTheme.headingWeight,
        },
        title
      )
    )
  root.append(panelRim(W, H, H / 2) as unknown as Node)
  return root
}

/** One eye's view, as tangents along the head's axes. */
function eyeBounds(
  eye: BABYLON.Camera,
  right: BABYLON.Vector3,
  up: BABYLON.Vector3,
  fwd: BABYLON.Vector3,
  inv: BABYLON.Matrix,
  a: BABYLON.Vector3,
  b: BABYLON.Vector3
): TangentBounds {
  eye.getViewMatrix().multiplyToRef(eye.getProjectionMatrix(), inv)
  inv.invert()
  // A pixel's ray: two depths, so the depth convention does not matter.
  const tan = (x: number, y: number, axis: BABYLON.Vector3) => {
    BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(x, y, 0.3, inv, a)
    BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(x, y, 0.7, inv, b)
    b.subtractInPlace(a)
    let z = BABYLON.Vector3.Dot(b, fwd)
    if (z < 0) {
      b.scaleInPlace(-1)
      z = -z
    }
    return BABYLON.Vector3.Dot(b, axis) / Math.max(1e-6, z)
  }
  const l = tan(-1, 0, right)
  const r = tan(1, 0, right)
  const lo = tan(0, -1, up)
  const hi = tan(0, 1, up)
  return {
    left: Math.min(l, r),
    right: Math.max(l, r),
    bottom: Math.min(lo, hi),
    top: Math.max(lo, hi),
  }
}

/**
 * A panel's header at the edge of the view while the panel is out of it. See
 * the edge-tab page.
 */
export function attachEdgeTab(
  scene: BABYLON.Scene,
  options: EdgeTabOptions = {}
): EdgeTab {
  const drawScene = options.drawScene ?? scene
  let title = options.title ?? ''
  const icon = options.icon
  const overhang = options.overhang ?? EDGE_TAB_OVERHANG
  let angle = 90
  let lit = false
  let el = tabSvg(title, icon, angle, lit)
  const tex = new SvgTexture({
    scene: drawScene,
    element: el,
    resolution: 256,
    updateInterval: 2000,
    premultiplied: true,
  })
  const mat = new BABYLON.StandardMaterial('edge-tab-mat', drawScene)
  mat.backFaceCulling = false
  mat.emissiveTexture = tex.texture
  mat.opacityTexture = tex.texture
  mat.diffuseColor = BABYLON.Color3.Black()
  mat.disableLighting = true
  mat.alphaMode = BABYLON.Constants.ALPHA_SRC_DSTONEMINUSSRCALPHA
  const mesh = BABYLON.MeshBuilder.CreatePlane(
    'edge-tab',
    { size: 1, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    drawScene
  )
  mesh.material = mat
  mesh.rotationQuaternion = new BABYLON.Quaternion()
  markUiMesh(mesh)
  excludeFromGlow(drawScene, mesh)
  mesh.setEnabled(false)
  const redraw = () => {
    el = tabSvg(title, icon, angle, lit)
    tex.setElement(el)
    tex.render()
  }

  let pressed = false
  const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes
  const pointer = drawScene.onPointerObservable.add((info) => {
    if (!mesh.isEnabled()) {
      pressed = false
      return
    }
    const on = info.pickInfo?.hit === true && info.pickInfo.pickedMesh === mesh
    if (info.type === POINTERMOVE) {
      if (on !== lit) {
        lit = on
        redraw()
      }
    } else if (info.type === POINTERDOWN) {
      pressed = on
      if (on) claimPointer(info.event as unknown as Event)
    } else if (info.type === POINTERUP) {
      const tap = pressed && on
      pressed = false
      if (tap) {
        claimPointer(info.event as unknown as Event)
        lit = false
        options.handleTap?.()
      }
    }
  })

  const head = new BABYLON.Vector3()
  const fwd = new BABYLON.Vector3()
  const up = new BABYLON.Vector3()
  const right = new BABYLON.Vector3()
  const v = new BABYLON.Vector3()
  const inv = new BABYLON.Matrix()
  const ta = new BABYLON.Vector3()
  const tb = new BABYLON.Vector3()
  const corner = new BABYLON.Vector3()
  const mid = new BABYLON.Vector3()
  const pos = new BABYLON.Vector3()
  const xAxis = new BABYLON.Vector3()
  const yAxis = new BABYLON.Vector3()
  const zAxis = new BABYLON.Vector3()
  let collapsed = false

  const hide = () => {
    collapsed = false
    pressed = false
    if (mesh.isEnabled()) mesh.setEnabled(false)
  }

  const update = (panel: BABYLON.AbstractMesh): boolean => {
    const cam = scene.activeCamera
    if (cam == null || panel.isDisposed()) {
      hide()
      return false
    }
    head.copyFrom(cam.globalPosition)
    cam.getDirectionToRef(BABYLON.Axis.Y, up)
    cam.getDirectionToRef(BABYLON.Axis.X, right)
    cam.getDirectionToRef(scene.useRightHandedSystem ? BACK : FORWARD, fwd)
    const eyes = cam.rigCameras.length > 0 ? cam.rigCameras : [cam]
    const view = tangentBounds(
      eyes.map((e) => eyeBounds(e, right, up, fwd, inv, ta, tb))
    )
    // How far an eye is from the middle of the head, for the parallax below.
    let eyeOff = 0
    for (const e of eyes)
      eyeOff = Math.max(
        eyeOff,
        BABYLON.Vector3.Distance(e.globalPosition, cam.globalPosition)
      )
    // The panel's corners, from its own bounds (not whether it is drawn).
    const world = panel.computeWorldMatrix(true)
    const bb = panel.getBoundingInfo().boundingBox
    const corners: HeadVec[] = []
    mid.setAll(0)
    for (const x of [bb.minimum.x, bb.maximum.x])
      for (const y of [bb.minimum.y, bb.maximum.y]) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
          x,
          y,
          (bb.minimum.z + bb.maximum.z) / 2,
          world,
          corner
        )
        mid.addInPlace(corner)
        corner.subtractToRef(head, v)
        corners.push({
          x: BABYLON.Vector3.Dot(v, right),
          y: BABYLON.Vector3.Dot(v, up),
          z: BABYLON.Vector3.Dot(v, fwd),
        })
      }
    mid.scaleInPlace(1 / 4)
    const ext = panelExtent(corners)
    collapsed = edgeCollapsed(ext, view, collapsed, overhang)
    if (!collapsed) {
      if (mesh.isEnabled()) mesh.setEnabled(false)
      pressed = false
      return false
    }
    // At the panel's depth, past the near plane, the same angular size.
    const dist = Math.max(
      BABYLON.Vector3.Distance(mid, head),
      (cam.minZ || 0.01) * 4
    )
    const vb = el.viewBox.baseVal
    const aspect = (vb.width || H) / (vb.height || H)
    const hM = EDGE_TAB_HEIGHT * dist
    const wM = hM * aspect
    // Its half sizes over its distance; off the axis it covers more of the
    // view, which `fitTab` measures from its corners.
    const halfH = hM / 2 / dist
    const halfW = wM / 2 / dist
    // Each eye sees it from a little to the side: room for that too.
    const parallax = eyeOff / dist
    const inView: TangentBounds = {
      left: view.left + parallax,
      right: view.right - parallax,
      bottom: view.bottom,
      top: view.top,
    }
    const spot = edgeTabSpot(ext, inView, halfW, halfH, EDGE_TAB_MARGIN)
    const frame = scene.getFrameId()
    let placed = placedTabs.get(scene)
    if (placed == null || placed.frame !== frame) {
      placed = { frame, tabs: [] }
      placedTabs.set(scene, placed)
    }
    const fitted = fitTab(spot.x, spot.y, halfW, halfH, inView)
    const avoided = edgeTabAvoid(
      { ...spot, ...fitted },
      halfW,
      halfH,
      placed.tabs,
      inView
    )
    const at = fitTab(avoided.x, avoided.y, halfW, halfH, inView)
    placed.tabs.push({ x: at.x, y: at.y, halfW, halfH })
    // Pointing at the panel, in eighths, so the picture changes rarely.
    const eighth = Math.round(spot.angleDeg / 45) * 45
    if (eighth !== angle) {
      angle = eighth
      redraw()
    }
    rel.x = at.x
    rel.y = at.y
    rel.dist = dist
    mesh.scaling.set(wM, hM, 1)
    pose(cam)
    if (!mesh.isEnabled()) mesh.setEnabled(true)
    return true
  }

  // Where it is relative to the head, so it can be put there again later.
  const rel = { x: 0, y: 0, dist: 1 }
  const pose = (cam: BABYLON.Camera) => {
    cam.computeWorldMatrix()
    head.copyFrom(cam.globalPosition)
    cam.getDirectionToRef(BABYLON.Axis.Y, up)
    cam.getDirectionToRef(BABYLON.Axis.X, right)
    cam.getDirectionToRef(scene.useRightHandedSystem ? BACK : FORWARD, fwd)
    pos
      .copyFrom(fwd)
      .addInPlace(right.scale(rel.x))
      .addInPlace(up.scale(rel.y))
      .normalize()
    pos.scaleInPlace(rel.dist)
    // Its visible face is local -Z, so +Z points away from the eye, and it
    // is upright to the head.
    zAxis.copyFrom(pos).normalize()
    BABYLON.Vector3.CrossToRef(up, zAxis, xAxis)
    xAxis.normalize()
    BABYLON.Vector3.CrossToRef(zAxis, xAxis, yAxis)
    BABYLON.Quaternion.RotationQuaternionFromAxisToRef(
      xAxis,
      yAxis,
      zAxis,
      mesh.rotationQuaternion!
    )
    mesh.position.copyFrom(head).addInPlace(pos)
  }
  /*
  PLACED AGAIN JUST BEFORE THE FRAME IS DRAWN, from the head as it is then. A
  panel's update runs in the XR frame, before a vehicle moves the rig it rides,
  so a tab placed only there trailed the head by a frame of travel (the same
  reason a layered frame panel is synced again before it is drawn).
  */
  const resync = scene.onBeforeCameraRenderObservable.add(() => {
    const cam = scene.activeCamera
    if (cam != null && mesh.isEnabled()) pose(cam)
  })

  return {
    update,
    hide,
    get collapsed() {
      return collapsed
    },
    mesh,
    setTitle(next: string) {
      if (next === title) return
      title = next
      redraw()
    },
    dispose() {
      scene.onBeforeCameraRenderObservable.remove(resync)
      drawScene.onPointerObservable.remove(pointer)
      tex.dispose()
      mat.dispose()
      mesh.dispose()
    },
  }
}
