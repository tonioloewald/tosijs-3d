/*
 * demo-utils — a small shared toolkit for doc-page live examples.
 *
 * The "when in doubt" defaults, in one place so every demo is consistent instead of each one
 * hand-rolling (or forgetting) them:
 *   - a sun that actually CASTS shadows,
 *   - a test-pattern GROUND that catches them (far more legible than a flat colour),
 *   - the standard orbit camera (six lines every demo repeated),
 *   - a moving/rotating prop, so the dynamics are visible at a glance.
 *
 * Demo-only — NOT part of the published `tosijs-3d` library. Registered in `demo/site.ts` under the
 * key `demo-utils`, so an example can `import { demoSun, orbitCam, patternGround, spinner } from 'demo-utils'`.
 *
 * ⚠️ UNVERIFIED until a full build runs (authored while the machine was out of memory). The element
 * factories (demoSun/patternGround) and the camera use APIs confirmed from existing demos; the
 * shadow-caster registration in `spinner` (via the b3d element's `register`) is the one spot to
 * eyeball once it builds.
 */
import * as BABYLON from '@babylonjs/core'
import { b3dSun, b3dGround, SvgTexture, sceneDelta } from '../src/index'

// The b3d element examples receive as `el` in sceneCreated — just the bits these helpers touch.
type B3dEl = {
  scene: BABYLON.Scene
  setActiveCamera(camera: BABYLON.Camera): void
  querySelector(selector: string): Element | null
  register?(additions: { meshes?: BABYLON.AbstractMesh[] }): void
}

/** The library's Warhol-ish test pattern (in `static/`), reused for grounds and props. */
const PATTERN = '/tosi-test-pattern.svg'

/** A sun that CASTS shadows — the "when in doubt, add a shadow light" default. Pass overrides through. */
export function demoSun(opts: Record<string, unknown> = {}) {
  return b3dSun({ intensity: 0.9, shadowTextureSize: 1024, ...opts })
}

/**
 * A checkered ground that RECEIVES shadows — a test pattern reads the light far better than a flat
 * colour, and `b3dGround` already wires up shadow-receiving. Placed as a child of `b3d(...)`.
 */
export function patternGround(
  opts: { size?: number; tiles?: number; color?: string } = {}
) {
  const { size = 40, tiles = 16, color = '#8a9b7e' } = opts
  return b3dGround({
    width: size,
    height: size,
    texture: 'checker',
    textureTiles: tiles,
    color,
  })
}

/**
 * The standard ArcRotateCamera every demo sets up — one call instead of six lines. In sceneCreated.
 *
 * Clamps the tilt by DEFAULT so you can't drag the view below the horizon and see the world from
 * underneath (an ArcRotateCamera happily orbits under the floor otherwise — a long-standing demo
 * papercut). `minElevationDeg` (default 5) keeps the camera at least that many degrees above
 * horizontal; `maxElevationDeg` (default 89) stops it going exactly top-down. Set either to null
 * to opt out.
 */
export function orbitCam(
  el: B3dEl,
  opts: {
    alpha?: number
    beta?: number
    radius?: number
    target?: [number, number, number]
    minElevationDeg?: number | null
    maxElevationDeg?: number | null
  } = {}
): BABYLON.ArcRotateCamera {
  const {
    alpha = -Math.PI / 2,
    beta = Math.PI / 3,
    radius = 14,
    target = [0, 0.8, 0],
    minElevationDeg = 5,
    maxElevationDeg = 89,
  } = opts
  const cam = new BABYLON.ArcRotateCamera(
    'demo-cam',
    alpha,
    beta,
    radius,
    new BABYLON.Vector3(target[0], target[1], target[2]),
    el.scene
  )
  cam.attachControl(el.querySelector('canvas'), true)
  // beta is measured from straight-up (0) to straight-down (π); π/2 is level with the horizon.
  // Elevation ABOVE horizontal = π/2 − beta, so a min elevation is an UPPER beta limit.
  if (minElevationDeg != null)
    cam.upperBetaLimit = Math.PI / 2 - (minElevationDeg * Math.PI) / 180
  if (maxElevationDeg != null)
    cam.lowerBetaLimit = Math.PI / 2 - (maxElevationDeg * Math.PI) / 180
  el.setActiveCamera(cam)
  return cam
}

/**
 * A textured, slowly-rotating box — the "non-static object so you can see the shadow move" prop.
 * Registers itself as a shadow caster so `demoSun`/`b3dSun` picks it up. Call in sceneCreated.
 */
export function spinner(
  el: B3dEl,
  opts: {
    size?: number
    x?: number
    y?: number
    z?: number
    spin?: number
  } = {}
): BABYLON.Mesh {
  const { size = 1.6, x = 0, y = 0.9, z = 0, spin = 0.4 } = opts
  const box = BABYLON.MeshBuilder.CreateBox('demo-spinner', { size }, el.scene)
  box.position.set(x, y, z)
  const mat = new BABYLON.StandardMaterial('demo-spinner-mat', el.scene)
  const tex = new SvgTexture({ scene: el.scene, url: PATTERN, resolution: 512 })
  mat.diffuseTexture = tex.texture
  mat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15)
  box.material = mat
  el.register?.({ meshes: [box] }) // enlist as a shadow caster (b3dSun adds registered meshes)
  el.scene.registerBeforeRender(() => {
    box.rotation.y += (spin * sceneDelta(el.scene)) / 1000
  })
  return box
}
