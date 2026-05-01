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

These conventions apply to all meshes entering the scene — via
[b3d-loader](?b3d-loader.ts), [b3d-library](?b3d-library.ts), or any
component that calls `register()`.

## Property-Based (automatic from Blender materials)

| Property | Threshold | Effect |
|----------|-----------|--------|
| `alpha` > 0.95 | snapped to 1.0 | Treated as fully opaque (avoids blend cost) |
| `alpha` ≤ 0.95 | — | Alpha blend, depth pre-pass, double-sided, excluded from shadow casting |
| `unlit` (glTF KHR_materials_unlit) | — | Respected as-is |
| Transmission > 0 + `_mirror` | — | Cubemap-based refraction with proper IOR (replaces glTF screen-space) |

## Name Suffixes (behavioral overrides, not material appearance)

| Suffix | Effect |
|--------|--------|
| `_noshadow` / `-noshadow` | Mesh doesn't receive shadows |
| `_nocast` / `-nocast` | Mesh doesn't cast shadows |
| `_mirror` / `-mirror` | Dynamic reflection probe (+ refraction if transmissive) |
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
export function applyMaterialConventions(meshes: BABYLON.AbstractMesh[]): void {
  for (const mesh of meshes) {
    const mat = mesh.material
    if (mat == null) continue

    // Snap near-opaque alpha to 1.0 — avoids blend pipeline for no visual benefit
    if (mat.alpha > ALPHA_OPAQUE_THRESHOLD && mat.alpha < 1) {
      mat.alpha = 1
    }

    // Translucent materials: correct sorting + perf optimizations
    // backFaceCulling is left as-is — driven by glTF doubleSided / Blender's setting
    if (mat.alpha <= ALPHA_OPAQUE_THRESHOLD) {
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
  // Generation counter for async asset loads. Bumped on every sceneReady and
  // sceneDispose; loadAssetContainer captures it and discards a callback whose
  // gen no longer matches. Prevents the "frozen clone" bug where a stale load
  // instantiates meshes into the scene after the component has been re-init'd
  // or disposed.
  protected loadGeneration = 0

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
    // Invalidate any in-flight loadAssetContainer callbacks.
    this.loadGeneration++
    if (this.mesh != null) {
      this.mesh.dispose()
      this.mesh = undefined
    }
    this.owner = null
  }

  /**
   * Load a glTF/glb into an AssetContainer, with race-safe gen tracking.
   * The onLoaded callback is only invoked if the component hasn't been
   * disposed or had a newer load supersede it. Subclasses use this from
   * their sceneReady to safely resolve async asset loads.
   */
  protected loadAssetContainer(
    scene: BABYLON.Scene,
    url: string,
    onLoaded: (container: BABYLON.AssetContainer) => void
  ): void {
    const gen = ++this.loadGeneration
    BABYLON.SceneLoader.LoadAssetContainer(
      url,
      undefined,
      scene,
      (container) => {
        if (gen !== this.loadGeneration) return
        onLoaded(container)
      }
    )
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
