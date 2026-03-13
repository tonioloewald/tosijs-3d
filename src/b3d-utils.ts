import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'

const DEG_TO_RAD = Math.PI / 180

export function findB3dOwner(el: HTMLElement): B3d | null {
  let node: HTMLElement | null = el.parentElement
  while (node != null) {
    if (
      'scene' in node &&
      'register' in node &&
      typeof (node as any).register === 'function'
    ) {
      return node as unknown as B3d
    }
    node = node.parentElement
  }
  return null
}

export function actualMeshes(meshes: BABYLON.AbstractMesh[]): BABYLON.Mesh[] {
  return meshes.filter(
    (mesh) => (mesh as BABYLON.Mesh).geometry != null
  ) as BABYLON.Mesh[]
}

export type AsyncVoidFunction = () => Promise<void>

export type XRParams = {
  cameraName?: string
  mode?: XRSessionMode
}

export type XRStuff = {
  camera: BABYLON.FreeCamera
  xr: BABYLON.WebXRDefaultExperience
  exitXR: AsyncVoidFunction
}

export async function enterXR(
  scene: BABYLON.Scene,
  options: XRParams = {}
): Promise<XRStuff> {
  const { cameraName = 'xr-camera', mode = 'immersive-vr' } = options
  if (navigator.xr == null) {
    throw new Error('xr is not available')
  }
  if (!(await navigator.xr.isSessionSupported(mode))) {
    throw new Error(`navigator.xr does not support requested mode "${mode}"`)
  }
  const xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: { sessionMode: mode },
  })
  const { baseExperience } = xr
  const { camera } = baseExperience
  camera.name = cameraName
  await baseExperience.enterXRAsync(mode, 'local-floor')
  return {
    camera,
    xr,
    async exitXR() {
      await baseExperience.exitXRAsync()
    },
  }
}

/*#
# Material Conventions

Loaded meshes are automatically optimized based on their PBR material properties
(from Blender's Principled BSDF via glTF). Name suffixes override behavior when
the material data alone isn't enough.

## Property-Based (automatic from Blender materials)

| Property | Threshold | Effect |
|----------|-----------|--------|
| `alpha` > 0.95 | snapped to 1.0 | Treated as fully opaque (avoids blend cost) |
| `alpha` ≤ 0.95 | — | Alpha blend, depth pre-pass, double-sided, excluded from shadow casting |
| `unlit` (glTF KHR_materials_unlit) | — | Respected as-is |

## Name Suffixes (behavioral overrides, not material appearance)

| Suffix | Effect |
|--------|--------|
| `_noshadow` / `-noshadow` | Mesh doesn't receive shadows |
| `_nocast` / `-nocast` | Mesh doesn't cast shadows |
| `_mirror` / `-mirror` | Mesh gets a dynamic reflection probe |
| `-ignore` | Node is disposed on load |
| `_collide*` | Physics collider (sphere/box/cylinder/mesh) |
*/

// Thresholds for property-based material inference
const ALPHA_OPAQUE_THRESHOLD = 0.95

/**
 * Apply material conventions based on PBR material properties.
 *
 * Reads actual material data (alpha, metallic, etc.) rather than relying
 * on name suffixes for appearance. Near-opaque alpha is snapped to 1.0
 * to avoid unnecessary blend cost. Translucent materials get depth
 * pre-pass and shadow exclusion automatically.
 */
export function applyMaterialConventions(
  meshes: BABYLON.AbstractMesh[]
): void {
  for (const mesh of meshes) {
    const mat = mesh.material
    if (mat == null) continue

    // Snap near-opaque alpha to 1.0 — avoids blend pipeline for no visual benefit
    if (mat.alpha > ALPHA_OPAQUE_THRESHOLD && mat.alpha < 1) {
      mat.alpha = 1
    }

    // Translucent materials: correct sorting + perf optimizations
    if (mat.alpha <= ALPHA_OPAQUE_THRESHOLD) {
      mat.backFaceCulling = false
      mat.needDepthPrePass = true
      mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
      // Tag for shadow exclusion (read by b3d-shadows / dynamic-shadows)
      if (!mesh.name.includes('_transparent')) {
        mesh.name += '_transparent'
      }
    }
  }
}

export class AbstractMesh extends Component {
  static initAttributes = {
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
  }

  owner: B3d | null = null
  mesh?: BABYLON.Mesh

  get roll() {
    return (this as any).rz
  }
  set roll(v: number) {
    ;(this as any).rz = v
  }
  get pitch() {
    return (this as any).rx
  }
  set pitch(v: number) {
    ;(this as any).rx = v
  }
  get yaw() {
    return (this as any).ry
  }
  set yaw(v: number) {
    ;(this as any).ry = v
  }

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
  }

  sceneDispose() {
    if (this.mesh != null) {
      this.mesh.dispose()
      this.mesh = undefined
    }
    this.owner = null
  }

  disconnectedCallback(): void {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (this.mesh?.position) {
      const { x, y, z } = this as any
      this.mesh.position.x = x
      this.mesh.position.y = y
      this.mesh.position.z = z
      this.mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
        this.yaw * DEG_TO_RAD,
        this.pitch * DEG_TO_RAD,
        this.roll * DEG_TO_RAD
      )
    }
  }
}
