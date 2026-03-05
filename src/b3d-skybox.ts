import * as BABYLON from '@babylonjs/core'
import { SkyMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils'
import type { B3dSun } from './b3d-shadows'

const DEG_TO_RAD = Math.PI / 180

function hexToColor3(hex: string): BABYLON.Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new BABYLON.Color3(r, g, b)
}

function blendColor3(
  a: BABYLON.Color3,
  b: BABYLON.Color3,
  t: number
): BABYLON.Color3 {
  return new BABYLON.Color3(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  )
}

export class B3dSkybox extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    turbidity: 10,
    luminance: 1,
    azimuth: 0,
    latitude: 40,
    realtimeScale: 10,
    updateFrequencyMs: 250,
    sunColor: '#eeeeff',
    duskColor: '#ffaa22',
    moonColor: '#6688cc',
    moonIntensity: 0.15,
    timeOfDay: 6.5,
    rayleigh: 2,
    mieDirectionalG: 0.8,
    mieCoefficient: 0.005,
    skyboxSize: 1000,
  }

  private interval = 0
  private sunEl: B3dSun | null = null

  private updateSky() {
    if (this.mesh?.material == null) return
    const attrs = this as any
    const material = this.mesh.material as SkyMaterial
    const latitude = attrs.latitude * DEG_TO_RAD
    const sunVector = new BABYLON.Vector3(0, 100, 0)
    // East-west rotation axis, tilted by latitude
    const axis = new BABYLON.Vector3(0, 0, 1)
    // Time rotation: noon=0, wraps through day
    const t = (((attrs.timeOfDay + 30) % 12) / 12) * 1.04 - 0.52
    const timeAngle = t * Math.PI
    // Latitude tilts the sun's arc away from vertical
    const latTilt = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0),
      latitude
    )
    const rotTime = BABYLON.Quaternion.RotationAxis(axis, timeAngle)
    const totalRot = latTilt.multiply(rotTime)
    const isDay = attrs.timeOfDay > 6 && attrs.timeOfDay < 18
    sunVector.rotateByQuaternionToRef(totalRot, sunVector)

    material.luminance = attrs.luminance
    material.azimuth = attrs.azimuth
    material.mieDirectionalG = attrs.mieDirectionalG
    material.mieCoefficient = attrs.mieCoefficient

    if (this.owner != null) {
      if (this.sunEl == null) {
        this.sunEl = this.owner.querySelector(
          'xin-b3d-sun'
        ) as unknown as B3dSun | null
      }
      const sunEl = this.sunEl
      if (sunEl?.light != null) {
        const { light } = sunEl
        material.sunPosition = sunVector
        const dir = sunVector.normalizeToNew()
        light.direction.x = -dir.x
        light.direction.y = -dir.y
        light.direction.z = -dir.z
        const intensity = Math.min(
          Math.abs((t + 0.52) * 10),
          Math.abs((t - 0.52) * 10),
          1
        )
        if (isDay) {
          const duskC = hexToColor3(attrs.duskColor)
          const sunC = hexToColor3(attrs.sunColor)
          light.diffuse = blendColor3(duskC, sunC, intensity)
          light.intensity = intensity
          material.rayleigh = attrs.rayleigh
          material.turbidity = attrs.turbidity
        } else {
          light.diffuse = hexToColor3(attrs.moonColor)
          light.intensity = intensity * attrs.moonIntensity
          material.rayleigh = attrs.rayleigh * attrs.moonIntensity
          material.turbidity = attrs.turbidity * attrs.moonIntensity
        }
      }
    }
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.owner != null) {
      const attrs = this as any
      this.interval = window.setInterval(() => {
        attrs.timeOfDay =
          (((attrs.timeOfDay +
            attrs.realtimeScale * attrs.updateFrequencyMs * 1e-6) /
            24) %
            1) *
          24
      }, attrs.updateFrequencyMs)

      const material = new SkyMaterial('skybox', this.owner.scene)
      material.backFaceCulling = false
      material.useSunPosition = true

      this.mesh = BABYLON.MeshBuilder.CreateBox(
        'skybox_nocast',
        {
          size: attrs.skyboxSize,
          sideOrientation: BABYLON.Mesh.BACKSIDE,
        },
        this.owner.scene
      )
      this.mesh.material = material
      this.updateSky()
      this.owner.register({ meshes: [this.mesh] })
    }
  }

  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    super.disconnectedCallback()
  }

  render() {
    super.render()
    this.updateSky()
  }
}

export const b3dSkybox = B3dSkybox.elementCreator({ tag: 'xin-b3d-skybox' })
