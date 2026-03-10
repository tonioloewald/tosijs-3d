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
