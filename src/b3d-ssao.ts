/*#
# Ambient occlusion (SSAO)

**Corners get darker.** Where a wall meets the floor, where crates are stacked,
under a ledge: real light does not reach in there, and a renderer without
ambient occlusion lights those creases exactly like the open ground beside
them. That is most of why a scene of plain boxes looks pasted together. One
attribute on `<tosi-b3d>` fixes it: `ssao="auto"`.

## Demo

Open the ⚙ panel and switch `ssao` between `off` and `on`. Watch the foot of
the walls, the gaps between the crates and the underside of the lintel, then
orbit in on the bust: its beard, laurel and collar are the kind of creased,
organic shape occlusion does most for. `stone` swaps its material, because how
much occlusion you can see depends on the surface: it shows plainly on pale
alabaster and is half hidden by the veins of marble. Enter VR and it switches
itself off: see "Flat only" below.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dBox, b3dSphere, b3dGround, b3dProp, assetUrl, PerlinNoise, select3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { ssaoDemo } = tosi({ ssaoDemo: { mode: 'on', strength: 1, radius: 2, stone: 'alabaster' } })

const bust = b3dProp({
  libraryUrl: assetUrl('tosijs-3d/ariosto-bust.glb'),
  meshName: 'Ariosto',
  scale: 0.8,
  x: 0.9, y: 1.4, z: -2.4, ry: 100,
})

// Three surfaces for one shape. Marble is painted into the vertex colours from
// 3D noise, so its veins run through the stone and ignore the model's UV seams.
let babylon = null
let provided = null
let stoneMaterial = null
function marbleColors(mesh) {
  const noise = new PerlinNoise(7)
  const p = mesh.getVerticesData('position')
  const colors = new Float32Array((p.length / 3) * 4)
  for (let i = 0; i < p.length / 3; i++) {
    const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]
    let turbulence = 0
    for (let o = 1; o <= 8; o *= 2) turbulence += Math.abs(noise.noise3D(x * 3 * o, y * 3 * o, z * 3 * o)) / o
    const vein = Math.pow(1 - Math.abs(Math.sin((x * 1.5 + y * 3 + turbulence * 3) * Math.PI)), 2.5)
    const shade = 1 - 0.7 * vein
    colors.set([shade, shade * 0.98, shade * 0.96, 1], i * 4)
  }
  return colors
}
function applyStone() {
  const meshes = bust.mesh ? bust.mesh.getChildMeshes() : []
  if (babylon == null || meshes.length === 0) return setTimeout(applyStone, 250)
  const kind = ssaoDemo.stone.value
  for (const mesh of meshes) {
    if (provided == null) {
      provided = mesh.material
      stoneMaterial = new babylon.PBRMaterial('stone', mesh.getScene())
      stoneMaterial.albedoColor = new babylon.Color3(0.93, 0.9, 0.84)
      stoneMaterial.metallic = 0
      stoneMaterial.bumpTexture = provided.bumpTexture
      mesh.setVerticesData('color', marbleColors(mesh))
    }
    mesh.material = kind === 'provided' ? provided : stoneMaterial
    mesh.useVertexColors = kind === 'marble'
    stoneMaterial.roughness = kind === 'marble' ? 0.2 : 0.4
  }
}
ssaoDemo.stone.observe(applyStone)

const stone = '#b9b2a4'
const crate = '#a0764a'
preview.append(
  b3d(
    {
      ssao: ssaoDemo.mode,
      ssaoStrength: ssaoDemo.strength,
      ssaoRadius: ssaoDemo.radius,
      scenePanel: () => [
        select3d({ label: 'ssao', value: ssaoDemo.mode, options: ['off', 'auto', 'on'] }),
        slider3d({ label: 'strength', value: ssaoDemo.strength, min: 0, max: 3, step: 0.05 }),
        slider3d({ label: 'radius (m)', value: ssaoDemo.radius, min: 0.25, max: 6, step: 0.05 }),
        select3d({ label: 'stone', value: ssaoDemo.stone, options: ['provided', 'alabaster', 'marble'] }),
      ],
      sceneCreated(el, BABYLON) {
        babylon = BABYLON
        applyStone()
        const cam = el.scene.activeCamera
        // Target first: an orbit camera re-derives its position from the target.
        if (cam && cam.setTarget) cam.setTarget(new BABYLON.Vector3(-0.5, 1, 0.5))
        if (cam && cam.setPosition) cam.setPosition(new BABYLON.Vector3(6, 5, -10))
      },
    },
    b3dLight({ intensity: 0.9 }),
    b3dSun({ shadowTextureSize: 2048 }),
    b3dSkybox({ timeOfDay: 15 }),
    b3dGround({ size: 40, color: '#8f9a7a' }),
    // A corner of two walls, a doorway with a lintel, steps, stacked crates.
    b3dBox({ meshName: 'wall-a', width: 8, height: 3, depth: 0.5, x: 0, y: 1.5, z: 3, color: stone }),
    b3dBox({ meshName: 'wall-b', width: 0.5, height: 3, depth: 6, x: -4.25, y: 1.5, z: 0.25, color: stone }),
    b3dBox({ meshName: 'post-l', width: 0.5, height: 2.4, depth: 0.5, x: 2, y: 1.2, z: -1, color: stone }),
    b3dBox({ meshName: 'post-r', width: 0.5, height: 2.4, depth: 0.5, x: 4, y: 1.2, z: -1, color: stone }),
    b3dBox({ meshName: 'lintel', width: 3, height: 0.5, depth: 0.7, x: 3, y: 2.65, z: -1, color: stone }),
    b3dBox({ meshName: 'step-1', width: 3, height: 0.25, depth: 1.5, x: -1.5, y: 0.125, z: 1.5, color: stone }),
    b3dBox({ meshName: 'step-2', width: 3, height: 0.5, depth: 1, x: -1.5, y: 0.25, z: 2.1, color: stone }),
    b3dBox({ meshName: 'crate-1', size: 1, x: -3.2, y: 0.5, z: -0.5, color: crate }),
    b3dBox({ meshName: 'crate-2', size: 1, x: -2.1, y: 0.5, z: -0.3, ry: 12, color: crate }),
    b3dBox({ meshName: 'crate-3', size: 1, x: -2.7, y: 1.5, z: -0.4, ry: -8, color: crate }),
    b3dSphere({ meshName: 'ball', diameter: 1.2, x: 1, y: 0.6, z: 1.6, color: '#c8553d' }),
    b3dBox({ meshName: 'plinth', width: 0.6, height: 1, depth: 0.6, x: 0.9, y: 0.5, z: -2.4, color: stone }),
    bust
  )
)
```

## What it costs, and why it is off by default

SSAO is not free and it is not one draw. Babylon's `SSAO2RenderingPipeline`
draws the opaque scene a SECOND time into a depth-and-normals buffer, then for
every pixel samples that buffer several times and blurs the result. So the
cost is one extra pass over your geometry plus a per-pixel loop.

| `ssao` | |
| --- | --- |
| `off` (default) | off |
| `auto` | on if the device tier affords it (top tier only) |
| `on` | on |

## Flat only

**SSAO never runs in a headset**, whatever the setting, and it is switched off
before the session starts and back on when it ends.

That is not a budget decision. Babylon's SSAO is a post-process, and a
post-process chain on a WebXR camera does not render per eye: it draws ONE
image across both. That is what 0.8.11 did on a Quest, and an emulated headset
reproduces it whether the chain is carried into the session or built inside
it. Ambient occlusion in a headset needs a different technique, not a
different setting.

(0.8.11 shipped an `always` value that claimed to run in XR. It never worked.
It is still accepted, means `on`, and warns once.)

Sample count and resolution come from the device budget
(`PerfBudgets.ssaoSamples`, `ssaoRatio`), so you tune the LOOK and the tier
tunes the COST.

## Attributes (on `<tosi-b3d>`)

| Attribute | Default | Description |
| --- | --- | --- |
| `ssao` | `'off'` | `off`, `auto` or `on`: see the table above. Flat only. LIVE |
| `ssaoStrength` | `1` | How dark a fully occluded crease gets. `0` is none. LIVE |
| `ssaoRadius` | `2` | How far, in metres, a surface looks for something occluding it. Small radii darken only tight creases; large ones shade whole alcoves. LIVE |

## What is and is not occluded

Transparent meshes are left out of the depth-and-normals pass, so glass,
water seen through its alpha, particles and the cloud deck neither receive
nor cast occlusion. A mesh whose vertex shader moves its vertices (the
vertex-animated crowd) is occluded as if standing in its rest pose.
*/
/*{ "parent": "Effects", "order": 60 }*/

import * as BABYLON from '@babylonjs/core'

/** `always` is deprecated: it means `on`. SSAO does not run in XR. */
export type SsaoSetting = 'off' | 'auto' | 'on' | 'always'

/**
 * Should SSAO be running? Pure, so the rule is testable without an engine.
 *
 * Never in XR, whatever the setting: a post-process pipeline on a WebXR camera
 * draws one image across both eyes (see "Flat only" in the page above). `xr` must be true for
 * the WHOLE session including entering and exiting, because the headset camera
 * becomes the active camera before the session reports itself entered.
 */
export function ssaoActive(
  setting: SsaoSetting | boolean | string | null | undefined,
  opts: { xr: boolean; budgetAllows: boolean }
): boolean {
  // No `isOff` here: b3d-utils pulls in tosijs, and this rule is tested headless.
  if (setting == null || setting === '' || setting === 'off') return false
  if (setting === false || setting === 'false') return false
  if (opts.xr) return false
  if (setting === 'auto') return opts.budgetAllows
  return (
    setting === 'on' ||
    setting === 'always' ||
    setting === true ||
    setting === 'true'
  )
}

export interface SsaoParams {
  active: boolean
  /** How dark a fully occluded crease gets. */
  strength: number
  /** Metres a surface looks for occluders. */
  radius: number
  samples: number
  /** Resolution as a fraction of the frame. */
  ratio: number
}

/**
 * Owns the SSAO pipeline for one scene: builds it on demand, follows the
 * active camera, tears it down when off. `<tosi-b3d>` drives it; nothing else
 * should need to.
 */
export class SsaoController {
  private _pipeline: BABYLON.SSAO2RenderingPipeline | null = null
  private _camera: BABYLON.Camera | null = null
  private _built = { samples: 0, ratio: 0 }
  private _name: string

  constructor(private _scene: BABYLON.Scene) {
    this._name = `ssao-${_scene.uid}`
  }

  get running(): boolean {
    return this._pipeline != null
  }

  update(p: SsaoParams): void {
    const scene = this._scene
    const cam = scene.activeCamera
    // Belt and braces for the XR rule: never hang a pipeline on a headset
    // camera or one of its per-eye rig cameras, whoever asked.
    const xrCamera =
      cam != null &&
      (cam.getClassName() === 'WebXRCamera' || cam.isRigCamera === true)
    if (!p.active || cam == null || xrCamera || scene.isDisposed) {
      this.dispose()
      return
    }
    // Samples and ratio are fixed at construction: a change rebuilds.
    if (
      this._pipeline != null &&
      (this._built.samples !== p.samples || this._built.ratio !== p.ratio)
    ) {
      this.dispose()
    }
    if (this._pipeline == null) {
      /*
      THE GEOMETRY BUFFER, NOT THE PREPASS. Babylon's default route (the
      prepass renderer) has each material write depth and normals as extra
      outputs of the main pass, which is cheaper, but only Standard/PBR
      materials know how. Our sky, cloud deck and several effects are custom
      shaders that would leave those outputs undefined, and undefined normals
      are occlusion smeared across the sky. The geometry buffer redraws every
      opaque mesh with ITS OWN shader, so it is right whatever the material.
      */
      /*
      AT THE SSAO's RESOLUTION, not the frame's. Left to itself the pipeline
      builds that buffer at full size and then samples it at half, so most of
      it is drawn to be thrown away. Measured at 1344x640 on an M5 Max: +2.0ms
      a frame full size, +1.2ms at half, and the two pictures cannot be told
      apart. (The prepass route measured +3.4ms, so it loses on cost as well.)
      Only when nobody else has claimed the buffer at another size.
      */
      if (scene.geometryBufferRenderer == null) {
        scene.enableGeometryBufferRenderer(p.ratio)
      }
      const pipeline = new BABYLON.SSAO2RenderingPipeline(
        this._name,
        scene,
        { ssaoRatio: p.ratio, blurRatio: p.ratio },
        [cam],
        true
      )
      pipeline.samples = p.samples
      // A post-process pipeline takes the frame off the canvas's own MSAA.
      // Without this every edge in the scene goes jagged the moment SSAO is on.
      pipeline.textureSamples = 4
      pipeline.expensiveBlur = true
      const gbuf = scene.geometryBufferRenderer
      if (gbuf) gbuf.renderTransparentMeshes = false
      this._pipeline = pipeline
      this._camera = cam
      this._built = { samples: p.samples, ratio: p.ratio }
    } else if (this._camera !== cam) {
      const mgr = scene.postProcessRenderPipelineManager
      if (this._camera) {
        mgr.detachCamerasFromRenderPipeline(this._name, this._camera)
      }
      mgr.attachCamerasToRenderPipeline(this._name, cam)
      this._camera = cam
    }
    const pipeline = this._pipeline
    pipeline.totalStrength = p.strength
    pipeline.radius = p.radius
    // Stop sampling past this depth difference, in metres, so a far wall
    // does not darken a near object that merely overlaps it on screen.
    pipeline.maxZ = Math.max(100, cam.maxZ * 0.1)
    pipeline.minZAspect = 0.5
  }

  dispose(): void {
    if (this._pipeline == null) return
    const scene = this._scene
    if (!scene.isDisposed) {
      if (this._camera) {
        scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
          this._name,
          this._camera
        )
      }
      this._pipeline.dispose(true)
    }
    this._pipeline = null
    this._camera = null
  }
}
