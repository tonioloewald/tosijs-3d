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
orbit in on the bust: a beard, a laurel and a collar are the kind of creased,
organic shape occlusion does most for. It works in VR too, with the default
`projected` method; `screen` is Babylon's own and switches itself off in a
headset. See "Two methods" below.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dBox, b3dSphere, b3dGround, b3dProp, assetUrl, select3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { ssaoDemo } = tosi({ ssaoDemo: { mode: 'on', method: 'projected', strength: 1, radius: 2 } })

// A bust in faux alabaster: pale and semi-gloss, so occlusion is easy to see.
const bust = b3dProp({
  libraryUrl: assetUrl('tosijs-3d/ariosto-bust.glb'),
  meshName: 'Ariosto',
  scale: 0.8,
  x: 0.6, y: 1.4, z: -2.6, ry: 100,
})
function alabaster(babylon) {
  const mesh = bust.mesh ? bust.mesh.getChildMeshes()[0] : null
  if (mesh == null) return setTimeout(alabaster, 250, babylon)
  const material = new babylon.PBRMaterial('alabaster', mesh.getScene())
  material.albedoColor = new babylon.Color3(0.93, 0.9, 0.84)
  material.metallic = 0
  material.roughness = 0.4
  material.bumpTexture = mesh.material.bumpTexture
  mesh.material = material
}

const stone = '#b9b2a4'
const crate = '#a0764a'
preview.append(
  b3d(
    {
      ssao: ssaoDemo.mode,
      ssaoMethod: ssaoDemo.method,
      ssaoStrength: ssaoDemo.strength,
      ssaoRadius: ssaoDemo.radius,
      scenePanel: () => [
        select3d({ label: 'ssao', value: ssaoDemo.mode, options: ['off', 'auto', 'on'] }),
        select3d({ label: 'method', value: ssaoDemo.method, options: ['projected', 'screen'] }),
        slider3d({ label: 'strength', value: ssaoDemo.strength, min: 0, max: 3, step: 0.05 }),
        slider3d({ label: 'radius (m)', value: ssaoDemo.radius, min: 0.25, max: 6, step: 0.05 }),
      ],
      sceneCreated(el, BABYLON) {
        alabaster(BABYLON)
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
    b3dBox({ meshName: 'plinth', width: 0.6, height: 1, depth: 0.6, x: 0.6, y: 0.5, z: -2.6, color: stone }),
    bust
  )
)
```

## Two methods

`ssaoMethod` chooses how the occlusion is worked out. The default is
`projected`.

| `ssaoMethod` | Where it runs | |
| --- | --- | --- |
| `projected` (default) | flat and in a headset | ours: see below |
| `screen` | flat only | Babylon's `SSAO2RenderingPipeline`, a post-process |

And `ssao` chooses whether it runs at all:

| `ssao` | |
| --- | --- |
| `off` (default) | off |
| `auto` | on if the device tier affords it (top tier only), and never in a headset |
| `on` | on, including in a headset when the method is `projected` |

## Projected

Occlusion is computed once, from a camera between the eyes, into a texture.
Every lit material then looks its own pixel up in that texture by world
position, the way cloud shadows and caustics do.

- It is correct in stereo, because each eye shades its own pixels and the
  darkening is attached to the surface.
- Nothing is post-processed, so the canvas keeps its antialiasing.
- It is not redrawn every frame. The lookup uses the matrix the texture was
  drawn with, so an old texture stays where it was in the world while the view
  moves. `ssaoRate` is redraws per second (default 30).
- The depth it works from is drawn by each mesh's own material, so skinned
  characters, instances and shader vertex animation (the crowd) are occluded
  in the pose you see.

What it costs is one extra pass over the opaque scene per redraw (depth only:
the materials skip their lighting), two small full-screen passes, and two
texture reads per lit pixel. On a Quest, in this demo, frame rate and CPU time
were the same with it on as off. That is a small scene. It has not been
measured on a heavy one, which is why `auto` stays off in a headset.

It concentrates its darkening in contacts and corners, where `screen` spreads
it more thinly. It is softer than `screen` on fine surface detail, because it
works from depth alone at reduced resolution and `screen` also reads each
material's normal map. A surface the middle camera could not see gets no
occlusion until the next redraw.

## Screen, and why it is flat only

`ssaoMethod="screen"` is Babylon's pipeline: it draws the opaque scene a second
time into a depth-and-normals buffer, samples that for every pixel, blurs the
result and composites it over the frame.

**It never runs in a headset.** A post-process chain on a WebXR camera does not
render per eye: it draws ONE image across both. That is what 0.8.11 did on a
Quest, and an emulated headset reproduces it whether the chain is carried into
the session or built inside it. With this method occlusion is switched off
before a session starts and back on when it ends.

(0.8.11 shipped an `always` value that claimed to run in XR. It never worked.
It is still accepted, means `on`, and warns once.)

Sample count and resolution come from the device budget
(`PerfBudgets.ssaoSamples`, `ssaoRatio`), so you tune the LOOK and the tier
tunes the COST.

## Attributes (on `<tosi-b3d>`)

| Attribute | Default | Description |
| --- | --- | --- |
| `ssao` | `'off'` | `off`, `auto` or `on`: see the tables above. LIVE |
| `ssaoStrength` | `1` | How dark a fully occluded crease gets. `0` is none. LIVE |
| `ssaoRadius` | `2` | How far, in metres, a surface looks for something occluding it. Small radii darken only tight creases; large ones shade whole alcoves. LIVE |
| `ssaoMethod` | `'projected'` | `projected` (flat and headset) or `screen` (Babylon's post-process, flat only). LIVE |
| `ssaoRate` | `30` | Projected only: redraws per second. `0` is every frame. LIVE |

## What is and is not occluded

Transparent meshes are left out of the depth-and-normals pass, so glass,
water seen through its alpha, particles and the cloud deck neither receive
nor cast occlusion. A mesh whose vertex shader moves its vertices (the
vertex-animated crowd) is occluded as if standing in its rest pose.
*/
/*{ "parent": "Effects", "order": 60 }*/
import * as BABYLON from '@babylonjs/core';
/**
 * Should SSAO be running? Pure, so the rule is testable without an engine.
 *
 * Never in XR, whatever the setting: a post-process pipeline on a WebXR camera
 * draws one image across both eyes (see "Screen" in the page above). `xr` must be true for
 * the WHOLE session including entering and exiting, because the headset camera
 * becomes the active camera before the session reports itself entered.
 */
export function ssaoActive(setting, opts) {
    // No `isOff` here: b3d-utils pulls in tosijs, and this rule is tested headless.
    if (setting == null || setting === '' || setting === 'off')
        return false;
    if (setting === false || setting === 'false')
        return false;
    // `xrCapable`: the projected method (b3d-ssao-projected) is not a
    // post-process, so it may run in a session. Even then only when ASKED
    // for: `auto` in a headset stays off until the cost is measured on one.
    if (opts.xr && (opts.xrCapable !== true || setting === 'auto'))
        return false;
    if (setting === 'auto')
        return opts.budgetAllows;
    return (setting === 'on' ||
        setting === 'always' ||
        setting === true ||
        setting === 'true');
}
/**
 * Owns the SSAO pipeline for one scene: builds it on demand, follows the
 * active camera, tears it down when off. `<tosi-b3d>` drives it; nothing else
 * should need to.
 */
export class SsaoController {
    _scene;
    _pipeline = null;
    _camera = null;
    _built = { samples: 0, ratio: 0 };
    _name;
    constructor(_scene) {
        this._scene = _scene;
        this._name = `ssao-${_scene.uid}`;
    }
    get running() {
        return this._pipeline != null;
    }
    update(p) {
        const scene = this._scene;
        const cam = scene.activeCamera;
        // Belt and braces for the XR rule: never hang a pipeline on a headset
        // camera or one of its per-eye rig cameras, whoever asked.
        const xrCamera = cam != null &&
            (cam.getClassName() === 'WebXRCamera' || cam.isRigCamera === true);
        if (!p.active || cam == null || xrCamera || scene.isDisposed) {
            this.dispose();
            return;
        }
        // Samples and ratio are fixed at construction: a change rebuilds.
        if (this._pipeline != null &&
            (this._built.samples !== p.samples || this._built.ratio !== p.ratio)) {
            this.dispose();
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
                scene.enableGeometryBufferRenderer(p.ratio);
            }
            const pipeline = new BABYLON.SSAO2RenderingPipeline(this._name, scene, { ssaoRatio: p.ratio, blurRatio: p.ratio }, [cam], true);
            pipeline.samples = p.samples;
            // A post-process pipeline takes the frame off the canvas's own MSAA.
            // Without this every edge in the scene goes jagged the moment SSAO is on.
            pipeline.textureSamples = 4;
            pipeline.expensiveBlur = true;
            const gbuf = scene.geometryBufferRenderer;
            if (gbuf)
                gbuf.renderTransparentMeshes = false;
            this._pipeline = pipeline;
            this._camera = cam;
            this._built = { samples: p.samples, ratio: p.ratio };
        }
        else if (this._camera !== cam) {
            const mgr = scene.postProcessRenderPipelineManager;
            if (this._camera) {
                mgr.detachCamerasFromRenderPipeline(this._name, this._camera);
            }
            mgr.attachCamerasToRenderPipeline(this._name, cam);
            this._camera = cam;
        }
        const pipeline = this._pipeline;
        pipeline.totalStrength = p.strength;
        pipeline.radius = p.radius;
        // Stop sampling past this depth difference, in metres, so a far wall
        // does not darken a near object that merely overlaps it on screen.
        pipeline.maxZ = Math.max(100, cam.maxZ * 0.1);
        pipeline.minZAspect = 0.5;
    }
    dispose() {
        if (this._pipeline == null)
            return;
        const scene = this._scene;
        if (!scene.isDisposed) {
            if (this._camera) {
                scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this._name, this._camera);
            }
            this._pipeline.dispose(true);
        }
        this._pipeline = null;
        this._camera = null;
    }
}
//# sourceMappingURL=b3d-ssao.js.map