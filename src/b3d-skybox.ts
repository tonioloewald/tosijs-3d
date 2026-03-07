/*#
# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `latitude` | `40` | Geographic latitude (affects sun arc) |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |

## Usage

```javascript
const { b3d, b3dSun, b3dSkybox } = tosijs3d

document.body.append(
  b3d({},
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: 17, realtimeScale: 100, latitude: 30 })
  )
)
```
*/

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
    updateFrequencyMs: 100,
    sunColor: '#eeeeff',
    duskColor: '#ffaa22',
    moonColor: '#6688cc',
    moonIntensity: 0.15,
    timeOfDay: 6.5,
    rayleigh: 2,
    mieDirectionalG: 0.8,
    mieCoefficient: 0.005,
    skyboxSize: 1000,
    applyFog: false,
  }

  private interval = 0
  private sunEl: B3dSun | null = null
  private _horizonColor = new BABYLON.Color3(0.75, 0.85, 0.95)

  /** Approximate horizon color based on current time of day / atmosphere. */
  get horizonColor(): BABYLON.Color3 {
    return this._horizonColor
  }

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
          'tosi-b3d-sun'
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

          // Horizon: blend light color with sky blue, desaturate toward white
          const skyBlue = new BABYLON.Color3(0.55, 0.7, 0.9)
          const horizonBase = blendColor3(light.diffuse, skyBlue, 0.6)
          // Brighten toward white at high sun, dim at dusk
          const white = new BABYLON.Color3(0.95, 0.95, 0.97)
          this._horizonColor = blendColor3(horizonBase, white, intensity * 0.4)
        } else {
          light.diffuse = hexToColor3(attrs.moonColor)
          light.intensity = attrs.moonIntensity
          material.rayleigh = attrs.rayleigh * 0.05
          material.turbidity = attrs.turbidity * 0.05

          // Night horizon: dark desaturated blue
          this._horizonColor = new BABYLON.Color3(0.08, 0.1, 0.18)
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
      this.mesh.applyFog = (this as any).applyFog
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

export const b3dSkybox = B3dSkybox.elementCreator({ tag: 'tosi-b3d-skybox' })
