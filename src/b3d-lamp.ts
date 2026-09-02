/*#
# b3d-lamp

**Lights you can see.** `b3dPointLight`, `b3dSpotLight` and `b3dAreaLight` are
placed lights that come with their own fixture geometry, cast shadows where
Babylon supports it, take a **gel** where Babylon supports it, and can be
animated over time by the curves in [[light-modulation]].

A bare `PointLight` is invisible — you get illumination with nothing emitting it,
so every scene grows a hand-rolled "glowing sphere next to the light" that then
has to be kept in sync with it. These carry the emitter with the light, and let
you turn it off or replace it when the scene has a real fixture to put there.

## What each type can actually do

Decided by Babylon, not by us, and worth knowing before you pick:

| | shadows | gel (`projectionTexture`) | geometry |
| --- | --- | --- | --- |
| `b3dPointLight` | ✅ cube shadow map | ❌ not supported by the engine | glowing sphere |
| `b3dSpotLight` | ✅ | ✅ **native** — bitmap or SVG | cone housing |
| `b3dAreaLight` | ❌ `RectAreaLight` is not a `ShadowLight` | ❌ | emissive panel |

Rather than fake the two ❌ cases, they warn once and carry on lit. A gel faked
on a point light would be a shadow-map hack with different behaviour, different
cost and different bugs from the real thing — a worse outcome than the honest
absence, and one you would discover late.

## Geometry: on, off, or yours

`geometry="on"` (the default) builds a primitive sized to the light. `"off"`
gives you the light alone. To supply your own, either point `url` at a GLB — it
is canonicalized and parented like any model — or parent anything you like to
the lamp's `node`:

```javascript
const lamp = b3dSpotLight({ intensity: 40, geometry: 'off' })
myChandelier.parent = lamp.node
```

The default geometry is deliberately plain and **unlit** (`emissiveColor`,
`disableLighting`), because a fixture that is itself shaded by the scene reads as
a grey lump exactly when its light is off — which is when you most need to see
where it is.

## Modulation is curves over a period

Everything time-varying comes from [[light-modulation]]: a `period` in seconds
plus curves for `brightness`, `hue` and `range`, and an optional attack/decay
envelope for turning on and off. Those are the same `[0,1] → [0,1]` curves the
province editor edits, so [[curve-field|curve3d]] is already the editor for a
lamp's flicker.

```javascript
b3dSpotLight({
  y: 4, intensity: 60, diffuse: '#ffd9a0',
  // A tube that stutters to life, hums, then dies down to a red ember.
  modulation: { period: 0.12, brightness: stepped(3) },
  envelope: {
    attack: 1.2, attackCurves: { brightness: stepped(5) },
    decay: 2.5, decayCurves: { hue: constant(0), hueShiftDeg: 40 },
  },
})
```

`on` is what runs the envelope: setting it false starts the decay rather than
killing the light. A lamp that has finished decaying stops doing per-frame work
altogether.

## Demo

Four lamps over a floor: a steady one, a flickering fluorescent, a pulsing
beacon with a hue cycle, and a spot with an SVG gel. The switch runs every
envelope at once, so you can watch them come up and die differently.

```js
import {
  b3d, b3dLight, b3dGround, b3dSphere, b3dBox,
  b3dPointLight, b3dSpotLight, b3dAreaLight,
  label3d, toggle3d, slider3d,
} from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { lamps } = tosi({ lamps: { on: true, geometry: true, intensity: 1 } })

// Curves are plain control points — the same shape curve3d edits.
const stepped3 = [
  { x: 0, y: 1 }, { x: 0.3, y: 1 }, { x: 0.32, y: 0.15 },
  { x: 0.5, y: 0.15 }, { x: 0.52, y: 1 }, { x: 1, y: 1 },
]
const pulse = [{ x: 0, y: 0.15 }, { x: 0.5, y: 1 }, { x: 1, y: 0.15 }]
const cycle = [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      glowLayerIntensity: 0.6,
      scenePanel: () => [
        label3d({ text: 'Lamps' }),
        toggle3d({ label: 'on (runs the envelopes)', value: lamps.on }),
        toggle3d({ label: 'show fixtures', value: lamps.geometry }),
        slider3d({ label: 'intensity', value: lamps.intensity, min: 0, max: 2, step: 0.05 }),
      ],
      sceneCreated(el) {
        orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 3, radius: 14, target: [0, 1.5, 0] })
      },
    },
    b3dLight({ intensity: 0.12 }),
    b3dGround({ width: 20, height: 20, color: '#3a3f46' }),
    b3dBox({ x: -4.5, y: 0.75, width: 1.5, height: 1.5, depth: 1.5, color: '#8899aa' }),
    b3dSphere({ x: 0, y: 0.9, diameter: 1.8, color: '#aa8866' }),
    b3dBox({ x: 4.5, y: 0.75, width: 1.5, height: 1.5, depth: 1.5, color: '#99aa88' }),

    // Steady, with a shadow.
    b3dPointLight({
      x: -4.5, y: 3.2, diffuse: '#ffe6c0', range: 12,
      intensity: lamps.intensity, on: lamps.on, shadows: 'on',
      geometry: lamps.geometry,
    }),
    // A failing fluorescent: fast stepped flicker, stutters up, dies red.
    b3dPointLight({
      x: 0, y: 3.4, diffuse: '#cfe8ff', range: 12,
      intensity: lamps.intensity, on: lamps.on,
      geometry: lamps.geometry,
      modulation: { period: 0.5, brightness: stepped3 },
      envelope: {
        attack: 1.4, attackCurves: { brightness: stepped3 },
        // hueShiftDeg is RELATIVE, so reddening a cool tube is a long way to
        // travel: #cfe8ff sits near 207 degrees, and 45 would only reach cyan.
        // 190 takes it round to amber-red as it dies.
        decay: 2.6, decayCurves: { hue: [{ x: 0, y: 0.5 }, { x: 1, y: 0 }], hueShiftDeg: 190 },
      },
    }),
    // A beacon: slow pulse plus a hue cycle.
    b3dPointLight({
      x: 4.5, y: 3.2, diffuse: '#ff9060', range: 12,
      intensity: lamps.intensity, on: lamps.on,
      geometry: lamps.geometry,
      modulation: { period: 2.4, brightness: pulse, hue: cycle, hueShiftDeg: 40 },
    }),
    // A spot with an SVG gel — a window, projected.
    b3dSpotLight({
      y: 7, z: -3, angle: 55, intensity: 120, diffuse: '#fff4e0',
      on: lamps.on, geometry: lamps.geometry, shadows: 'on',
      gelSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="black"/>
        <g fill="white">
          <rect x="6"  y="6"  width="23" height="23"/>
          <rect x="35" y="6"  width="23" height="23"/>
          <rect x="6"  y="35" width="23" height="23"/>
          <rect x="35" y="35" width="23" height="23"/>
        </g></svg>`,
    })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.preview { height: 100%; }
```

## Attributes

Shared by all three unless noted.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` / `y` / `z` | `0`/`3`/`0` | Position |
| `intensity` | `1` | Brightness. With `modulation`, this is the MAXIMUM |
| `diffuse` | `'#ffffff'` | Colour |
| `specular` | `'#ffffff'` | Specular colour |
| `range` | `10` | Falloff distance (point / spot) |
| `on` | `true` | `false` runs the decay; it does not kill the light |
| `geometry` | `'on'` | `'off'` for no fixture |
| `geometryScale` | `1` | Size multiplier for the default fixture |
| `url` | — | GLB fixture, in place of the primitive |
| `shadows` | `'off'` | `'on'` for a shadow generator (point / spot only) |
| `shadowTextureSize` | `0` (auto) | Resolves against the device budget |
| `angle` | `60` | **spot** — cone angle in degrees |
| `exponent` | `2` | **spot** — falloff sharpness |
| `gel` | — | **spot** — projection texture URL (bitmap or SVG file) |
| `gelSvg` | — | **spot** — inline SVG source or an `SVGElement` |
| `width` / `height` | `2`/`1` | **area** — panel size |

**Properties** (JS only — objects, not attributes): `modulation`
([[light-modulation|LightModulation]]), `envelope`
([[light-modulation|LightEnvelope]]), and `node` (the fixture's `TransformNode`,
for parenting your own geometry).
*/
/*{ "parent": "Environment", "order": 60 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { SvgTexture } from './svg-texture'
import { canonicalize } from './model-transform'
import { resolveBudget } from './b3d-quality'
import {
  isModulated,
  lightPhase,
  sampleLight,
  shiftHue,
  type LightEnvelope,
  type LightModulation,
} from './light-modulation'

/** Warn once per message — a per-frame warning is a performance bug of its own. */
const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

/**
 * Shared behaviour for a placed light with a body.
 *
 * Subclasses build the light and (optionally) the default fixture; everything
 * else — position, modulation, the envelope clock, shadows, teardown — lives
 * here so a fix lands once rather than three times.
 */
export abstract class B3dLamp extends B3dChild {
  static initAttributes = {
    x: 0,
    y: 3,
    z: 0,
    intensity: 1,
    diffuse: '#ffffff',
    specular: '#ffffff',
    range: 10,
    /**
     * `'on'` / `'off'`, not a boolean.
     *
     * A boolean attribute cannot default true — an absent boolean reads false,
     * which is correct HTML and fatal here, since a lamp written
     * `<tosi-b3d-point-light>` would arrive switched off. tosijs now throws at
     * construction on a true-default boolean, so this is not a silent trap any
     * more, but it is still a trap.
     */
    on: 'on',
    geometry: 'on',
    geometryScale: 1,
    url: '',
    shadows: 'off',
    /** `0` = auto — resolved against the device tier, like every other budget. */
    shadowTextureSize: 0,
  }

  declare x: number
  declare y: number
  declare z: number
  declare intensity: number
  declare diffuse: string
  declare specular: string
  declare range: number
  declare on: string
  declare geometry: string
  declare geometryScale: number
  declare url: string
  declare shadows: string
  declare shadowTextureSize: number

  owner: B3d | null = null
  light?: BABYLON.Light
  /** Parent for the fixture. Parent your own geometry here. */
  node?: BABYLON.TransformNode
  shadowGenerator?: BABYLON.ShadowGenerator

  /** Curves over a period — flicker, pulse, colour cycle. */
  modulation: LightModulation | null = null
  /** Attack / decay shape for switching on and off. */
  envelope: LightEnvelope | null = null

  protected baseIntensity = 1
  protected baseRange = 10
  protected baseColor = new BABYLON.Color3(1, 1, 1)

  private _elapsed = 0
  private _sinceChange = 0
  private _wasOn = true
  private _tick?: BABYLON.Observer<BABYLON.Scene>
  private _disposables: Array<{ dispose: () => void }> = []

  /** Build the Babylon light. */
  protected abstract createLight(scene: BABYLON.Scene): BABYLON.Light
  /** Build the default fixture, parented to `node`. */
  protected abstract createGeometry(scene: BABYLON.Scene): BABYLON.Mesh | null

  protected get isOn(): boolean {
    return !isOff(this.on)
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    this.owner = owner
    this.node = new BABYLON.TransformNode('lamp', scene)
    this.node.position.set(this.x, this.y, this.z)

    this.light = this.createLight(scene)
    this.baseIntensity = this.intensity
    this.baseRange = this.range
    this.baseColor = BABYLON.Color3.FromHexString(this.diffuse)
    this._wasOn = this.isOn
    // A lamp that starts OFF must not play its decay on the first frame — it
    // was never on. Start it past the window so the phase resolves to `off`.
    this._sinceChange = this._wasOn ? 0 : (this.envelope?.decay ?? 0) + 1

    this.buildFixture(scene)
    this.setupShadows()
    owner.register({ lights: [this.light] })

    this._tick = scene.onBeforeRenderObservable.add(() => this.update(scene))
  }

  private buildFixture(scene: BABYLON.Scene): void {
    if (this.url) {
      // A GLB fixture goes through the same canonicalization as any model, so
      // a lamp asset behaves like the rest of the content pipeline.
      BABYLON.LoadAssetContainerAsync(this.url, scene)
        .then((container) => {
          if (this.node == null) {
            container.dispose()
            return
          }
          container.addAllToScene()
          const node = this.node
          for (const root of container.rootNodes) {
            if (root instanceof BABYLON.TransformNode) {
              canonicalize(root, scene, 'lamp-fixture').parent = node
            }
          }
          this._disposables.push({ dispose: () => container.dispose() })
          this.owner?.register({ meshes: container.meshes })
        })
        .catch((err) =>
          console.warn(`b3d-lamp: could not load ${this.url}`, err)
        )
      return
    }
    if (isOff(this.geometry)) return
    const mesh = this.createGeometry(scene)
    if (mesh != null) {
      mesh.parent = this.node ?? null
      this._disposables.push(mesh)
    }
  }

  /**
   * An UNLIT emissive material for the fixture.
   *
   * `disableLighting` matters more than it looks: a fixture shaded by the scene
   * is a grey lump precisely when its own light is off, which is when you most
   * need to see where the lamp is.
   */
  protected fixtureMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    const mat = new BABYLON.StandardMaterial('lamp-fixture', scene)
    mat.emissiveColor = BABYLON.Color3.FromHexString(this.diffuse)
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.specularColor = BABYLON.Color3.Black()
    mat.disableLighting = true
    this._disposables.push(mat)
    return mat
  }

  private setupShadows(): void {
    if (isOff(this.shadows)) return
    const light = this.light
    if (!(light instanceof BABYLON.ShadowLight)) {
      warnOnce(
        `b3d-lamp: ${this.tagName.toLowerCase()} cannot cast shadows — Babylon's RectAreaLight is not a ShadowLight. Ignoring shadows="on".`
      )
      return
    }
    const size = resolveBudget(this.shadowTextureSize, 'shadowTextureSize', {
      xr: false,
    })
    const gen = new BABYLON.ShadowGenerator(size, light)
    gen.usePercentageCloserFiltering = true
    this.shadowGenerator = gen
    this._disposables.push(gen)
    // Casters arrive over time (loaders, spawners), so subscribe rather than
    // snapshotting the scene once — the same contract b3d-shadows uses.
    const add = (additions: { meshes?: BABYLON.AbstractMesh[] }) => {
      for (const mesh of additions.meshes ?? []) {
        if (mesh.getTotalVertices() > 0)
          gen.addShadowCaster(mesh as BABYLON.Mesh)
      }
    }
    this.owner?.addSceneListener(add)
    this._disposables.push({
      dispose: () => this.owner?.removeSceneListener(add),
    })
  }

  /** Per-frame: run the envelope clock and apply the sampled light. */
  private update(scene: BABYLON.Scene): void {
    const light = this.light
    if (light == null) return
    const dt = sceneDeltaSeconds(scene)
    this._elapsed += dt

    const on = this.isOn
    if (on !== this._wasOn) {
      this._wasOn = on
      this._sinceChange = 0
    } else {
      this._sinceChange += dt
    }

    const phase = lightPhase(this.envelope, on, this._sinceChange)
    // Nothing is animating and nothing is switching: leave the light exactly as
    // `render()` set it, and do no work.
    if (phase === 'sustain' && !isModulated(this.modulation)) {
      light.setEnabled(true)
      return
    }
    if (phase === 'off') {
      light.setEnabled(false)
      return
    }
    light.setEnabled(true)

    const s = sampleLight(this.modulation, this.envelope, {
      on,
      sinceChange: this._sinceChange,
      time: this._elapsed,
    })
    light.intensity = this.baseIntensity * s.brightness
    if (s.hueShiftDeg !== 0) {
      const c = shiftHue(this.baseColor, s.hueShiftDeg)
      light.diffuse.set(c.r, c.g, c.b)
    } else {
      light.diffuse.copyFrom(this.baseColor)
    }
    const ranged = light as unknown as { range?: number }
    if (typeof ranged.range === 'number') {
      ranged.range = this.baseRange * s.range
    }
  }

  render(): void {
    super.render()
    if (this.light == null || this.node == null) return
    this.node.position.set(this.x, this.y, this.z)
    this.baseIntensity = this.intensity
    this.baseRange = this.range
    this.baseColor = BABYLON.Color3.FromHexString(this.diffuse)
    this.light.specular = BABYLON.Color3.FromHexString(this.specular)
    // Only write through when nothing is animating; otherwise `update` owns
    // these and a render mid-flicker would fight it for a frame.
    if (!isModulated(this.modulation) && this.envelope == null) {
      this.light.intensity = this.intensity
      this.light.diffuse = this.baseColor.clone()
      const ranged = this.light as unknown as { range?: number }
      if (typeof ranged.range === 'number') ranged.range = this.range
    }
    this.positionLight()
  }

  /** Keep the Babylon light on the node. Overridden where direction matters. */
  protected positionLight(): void {
    const l = this.light as unknown as { position?: BABYLON.Vector3 }
    if (l?.position != null) l.position.set(this.x, this.y, this.z)
  }

  sceneDispose(): void {
    if (this._tick != null) {
      this._tick.remove()
      this._tick = undefined
    }
    for (const d of this._disposables.splice(0)) {
      try {
        d.dispose()
      } catch {
        /* a half-built fixture can throw on the way down */
      }
    }
    this.shadowGenerator = undefined
    this.light?.dispose()
    this.light = undefined
    this.node?.dispose()
    this.node = undefined
    this.owner = null
  }
}

/**
 * Seconds since the last render, honouring a paused scene.
 *
 * Uses `sceneDelta`'s published value — `engine.getDeltaTime()` inside a scene
 * observer is the WHOLE frame and runs at 2x or 4x with several cameras, which
 * would make every lamp in a multi-camera scene flicker at the wrong rate.
 */
function sceneDeltaSeconds(scene: BABYLON.Scene): number {
  const published = (scene.metadata as any)?.b3dFrameDelta
  if (typeof published === 'number' && published >= 0) return published
  return Math.min(0.1, (scene.getEngine().getDeltaTime() || 16) / 1000)
}

// --- Point -----------------------------------------------------------------

export class B3dPointLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-point-light'

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.PointLight(
      'point-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      scene
    )
    light.intensity = this.intensity
    light.range = this.range
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    return light
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    const bulb = BABYLON.MeshBuilder.CreateSphere(
      'lamp-bulb',
      { diameter: 0.25 * this.geometryScale, segments: 12 },
      scene
    )
    bulb.material = this.fixtureMaterial(scene)
    // A bulb must not shadow its own light, or the lamp puts a black ball
    // exactly where the illumination comes from.
    bulb.receiveShadows = false
    return bulb
  }
}

export const b3dPointLight = B3dPointLight.elementCreator()

// --- Spot ------------------------------------------------------------------

export class B3dSpotLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-spot-light'

  static initAttributes = {
    ...B3dLamp.initAttributes,
    /** Cone angle in DEGREES — the authoring unit (see CLAUDE.md's Deg rule). */
    angle: 60,
    exponent: 2,
    /** Direction the cone points. Default is straight down. */
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    /** Gel (projection texture) URL — bitmap or SVG file. */
    gel: '',
    /** Gel as inline SVG source. Also accepts an `SVGElement` set as a property. */
    gelSvg: '',
  }

  declare angle: number
  declare exponent: number
  declare dirX: number
  declare dirY: number
  declare dirZ: number
  declare gel: string
  declare gelSvg: string | SVGSVGElement

  private _gelTexture?: BABYLON.BaseTexture

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.SpotLight(
      'spot-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      new BABYLON.Vector3(this.dirX, this.dirY, this.dirZ),
      (this.angle * Math.PI) / 180,
      this.exponent,
      scene
    )
    light.intensity = this.intensity
    light.range = this.range
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    this.applyGel(light, scene)
    return light
  }

  /**
   * The gel — Babylon's `projectionTexture`, which only a SpotLight has.
   *
   * An SVG gel goes through `SvgTexture`, so the same vector source that draws a
   * panel can be a window, a leaf canopy or a venetian blind. Rasterized once
   * (`updateInterval: 0`) because a gel is a stencil, not a live surface.
   */
  private applyGel(light: BABYLON.SpotLight, scene: BABYLON.Scene): void {
    const svg = this.gelSvg
    if (svg) {
      const element = (typeof svg === 'string'
        ? new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
        : svg) as unknown as SVGSVGElement
      const tex = new SvgTexture({ scene, element, updateInterval: 0 })
      this._gelTexture = tex.texture
      light.projectionTexture = tex.texture
      return
    }
    if (this.gel) {
      const tex = new BABYLON.Texture(this.gel, scene)
      this._gelTexture = tex
      light.projectionTexture = tex
    }
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    const s = this.geometryScale
    const housing = BABYLON.MeshBuilder.CreateCylinder(
      'lamp-housing',
      {
        diameterTop: 0.34 * s,
        diameterBottom: 0.16 * s,
        height: 0.3 * s,
        tessellation: 16,
      },
      scene
    )
    housing.material = this.fixtureMaterial(scene)
    housing.receiveShadows = false
    // The cylinder's axis is +Y; aim it along the cone so the housing points
    // where the light goes rather than always hanging straight down.
    const dir = new BABYLON.Vector3(this.dirX, this.dirY, this.dirZ)
    if (dir.lengthSquared() > 0) {
      dir.normalize()
      const axis = BABYLON.Vector3.Cross(BABYLON.Axis.Y, dir)
      const angle = Math.acos(
        Math.min(1, Math.max(-1, BABYLON.Vector3.Dot(BABYLON.Axis.Y, dir)))
      )
      housing.rotationQuaternion =
        axis.lengthSquared() < 1e-8
          ? BABYLON.Quaternion.FromEulerAngles(dir.y < 0 ? Math.PI : 0, 0, 0)
          : BABYLON.Quaternion.RotationAxis(axis.normalize(), angle)
    }
    return housing
  }

  protected positionLight(): void {
    const light = this.light as BABYLON.SpotLight | undefined
    if (light == null) return
    light.position.set(this.x, this.y, this.z)
    light.direction.set(this.dirX, this.dirY, this.dirZ)
    light.angle = (this.angle * Math.PI) / 180
    light.exponent = this.exponent
  }

  sceneDispose(): void {
    this._gelTexture?.dispose()
    this._gelTexture = undefined
    super.sceneDispose()
  }
}

export const b3dSpotLight = B3dSpotLight.elementCreator()

// --- Area ------------------------------------------------------------------

export class B3dAreaLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-area-light'

  static initAttributes = {
    ...B3dLamp.initAttributes,
    width: 2,
    height: 1,
  }

  declare width: number
  declare height: number

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.RectAreaLight(
      'area-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      this.width,
      this.height,
      scene
    )
    light.intensity = this.intensity
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    return light
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    // The emitter IS the shape here, so the fixture is the light's own
    // rectangle rather than a stand-in for it.
    const panel = BABYLON.MeshBuilder.CreatePlane(
      'lamp-panel',
      {
        width: this.width,
        height: this.height,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      scene
    )
    panel.material = this.fixtureMaterial(scene)
    panel.receiveShadows = false
    return panel
  }
}

export const b3dAreaLight = B3dAreaLight.elementCreator()
