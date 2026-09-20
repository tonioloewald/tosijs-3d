/*#
# Skybox Baker

**Stand inside a galaxy and photograph the sky.** Six 90° renders from one point
become a cube map — a starfield with real structure, for the cost of a texture
fetch at runtime instead of tens of thousands of particles every frame.

The point is not that it is cheaper, though it is. It is that **the sky you bake
is the galaxy you can fly to**: you are photographing actual star positions from
an actual system, so the constellations a character sees from the ground are the
same objects on the navigation chart. A decorative starfield can never be that,
however pretty.

## Demo

```js
import { b3d, b3dGalaxy, bakeSkyboxCube, defaultBakePose, button3d, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { bake } = tosi({
  bake: { seed: 1234, stars: 50000, particleSize: 0.7, outFraction: 0.55, offPlane: 3, face: 512, status: 'ready' },
})

let sceneEl = null

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      clearColor: '#01020a',
      scenePanel: () => [
        label3d({ text: 'Bake a sky' }),
        slider3d({ label: 'stars', value: bake.stars, min: 5000, max: 50000, step: 1000 }),
        slider3d({ label: 'particle size', value: bake.particleSize, min: 0.1, max: 1.5, step: 0.05 }),
        slider3d({ label: 'out from core', value: bake.outFraction, min: 0.1, max: 0.9, step: 0.05 }),
        slider3d({ label: 'off plane', value: bake.offPlane, min: 0, max: 12, step: 0.5 }),
        slider3d({ label: 'face px', value: bake.face, min: 256, max: 1024, step: 256 }),
        label3d({ text: bake.status, muted: true }),
        button3d({ label: 'bake cube', handleClick: async () => {
          bake.status = 'baking…'
          const faces = await bakeSkyboxCube(sceneEl.scene, {
            ...defaultBakePose(100, bake.outFraction.valueOf(), bake.offPlane.valueOf()),
            size: bake.face.valueOf(),
          })
          for (let i = 0; i < faces.length; i++) {
            const a = document.createElement('a')
            a.href = faces[i].url
            a.download = `sky_${faces[i].name}.png`
            a.click()
          }
          bake.status = `saved ${faces.length} faces`
        } }),
      ],
      sceneCreated(el) { sceneEl = el },
    },
    b3dGalaxy({
      seed: bake.seed,
      starCount: bake.stars,
      particleSize: bake.particleSize,
      coreSize: 0.25,
      radius: 100,
    })
  )
)
```
```css
.preview { height: 100%; }
```

## Six cameras, and why not a probe

`ReflectionProbe` is the better idea on paper — it renders a correctly-oriented
cube, so the face conventions stay Babylon's problem rather than ours — and this
was written that way first. Its `cubeTexture.readPixels(face)` came back ALL
ZEROS here, every face, verified by decoding the PNGs and finding a maximum
channel value of 0. Six silently black squares is a worse failure than a little
more code, so the faces are rendered with a camera instead.

The orientation table is therefore written out in full rather than trusted to
memory. The ±Y rows are the ones that bite: they need a different UP vector,
because "up" is undefined when you are looking straight up, and getting it wrong
gives you a sky with one face rotated 90° that nobody notices until a player
stares at the zenith.

## Where to stand

`defaultBakePose` puts you **55% of the way out from the core and slightly above
the plane**, which is roughly where Earth is — the Sun sits about 8 of the disc's
~13 kpc out, a few tens of parsecs up. Each part earns its place:

| choice | what it buys |
| ------ | ------------ |
| 50–60% out | the core is off to one side and bright, the far rim thin behind it. Dead centre is dense in every direction; the rim leaves one half empty |
| slightly off-plane | lets the band read AS a band. Exactly in it, you are inside the dust and near stars swamp everything |
| **tilted** | the band ARCS across the sky instead of lying level — and a level band reads as wallpaper the moment anyone looks up |

The tilt is the one worth insisting on, and it is free: it is a property of the
capture basis, not the galaxy, so it costs one rotation and no geometry. Seed it
per system and no two stars share a sky.

⚠️ **Tune particle size AT 90°.** A cube face is 90° FOV where a typical demo
camera is nearer 46°, so a star covers about half the angular fraction of the
frame once you widen it. Anything dialled in while orbiting the galaxy comes out
small in the bake — 0.7 here against 0.3–0.5 there.
*/
/*{ "parent": "Demos", "order": 30 }*/

import * as BABYLON from '@babylonjs/core'

/** One baked cube face: a PNG data URL plus the suffix Babylon expects. */
export interface BakedFace {
  /** `px` | `nx` | `py` | `ny` | `pz` | `nz` — the `CubeTexture` file suffix. */
  name: string
  /** `data:image/png;base64,…` */
  url: string
}

export interface SkyboxBakeOptions {
  /** Where the camera stands, in world space. */
  x: number
  y: number
  z: number
  /** Pixels per cube face. 512 is the usual sweet spot; 1024 costs 25 MB. */
  size?: number
  /** Far plane for the capture. Must reach past whatever you are photographing. */
  maxZ?: number
}

/**
 * Where to stand, given a galaxy's radius.
 *
 * Returns a world position — the TILT is deliberately not here, because it
 * belongs to whatever you are photographing (rotate the galaxy) or to the cube's
 * consumer (rotate the skybox mesh), and baking it into the pose would make it
 * the one thing you could not change afterwards.
 */
export function defaultBakePose(
  galaxyRadius: number,
  outFraction = 0.55,
  offPlane = 3
): { x: number; y: number; z: number } {
  return { x: galaxyRadius * outFraction, y: offPlane, z: 0 }
}

/**
 * Photograph the scene from one point as six cube faces.
 *
 * Returns PNG data URLs in Babylon's cube order, ready to save beside each
 * other as `<root>_px.png` … `<root>_nz.png` and loaded with
 * `new CubeTexture(root, scene)`.
 */
export async function bakeSkyboxCube(
  scene: BABYLON.Scene,
  options: SkyboxBakeOptions
): Promise<BakedFace[]> {
  const size = options.size ?? 512
  const engine = scene.getEngine()

  /*
  SIX CAMERAS AFTER ALL — `ReflectionProbe` read back BLACK.

  The probe is the better idea on paper and it is what this used to do: it
  renders a correctly-oriented cube, so the face conventions stay Babylon's
  problem. But `cubeTexture.readPixels(face)` returned all zeros here (verified:
  max channel 0 across every face), and a bake that silently produces six black
  squares is worse than a bake that is slightly more code.

  So the faces are rendered through `CreateScreenshotUsingRenderTargetAsync`,
  which is a path Babylon exercises constantly, and the orientation table below
  is written out rather than trusted to memory. The ±Y rows are the ones that
  bite: they need a different UP, because "up" is undefined when you are looking
  straight up.
  */
  const V = BABYLON.Vector3
  const FACES: Array<{ name: string; dir: BABYLON.Vector3; up: BABYLON.Vector3 }> = [
    { name: 'px', dir: new V(1, 0, 0), up: new V(0, 1, 0) },
    { name: 'nx', dir: new V(-1, 0, 0), up: new V(0, 1, 0) },
    { name: 'py', dir: new V(0, 1, 0), up: new V(0, 0, -1) },
    { name: 'ny', dir: new V(0, -1, 0), up: new V(0, 0, 1) },
    { name: 'pz', dir: new V(0, 0, 1), up: new V(0, 1, 0) },
    { name: 'nz', dir: new V(0, 0, -1), up: new V(0, 1, 0) },
  ]

  const at = new V(options.x, options.y, options.z)
  const cam = new BABYLON.FreeCamera('skybox-bake-cam', at.clone(), scene, false)
  // 90° EXACTLY, and square — a cube face is a quarter turn per axis. Anything
  // else leaves gaps at the seams that no amount of tuning will close.
  cam.fov = Math.PI / 2
  cam.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED
  cam.minZ = 0.1
  cam.maxZ = (options.maxZ ?? 5000)

  const previous = scene.activeCamera
  const out: BakedFace[] = []
  try {
    for (const face of FACES) {
      cam.position.copyFrom(at)
      cam.upVector.copyFrom(face.up)
      cam.setTarget(at.add(face.dir))
      scene.activeCamera = cam
      /*
      RENDER NORMALLY FIRST, so billboards face THIS camera.

      A `SolidParticleSystem` re-orients its quads toward `scene.activeCamera`
      from a beforeRender observer — which the screenshot's own render target
      does not run. So the first face came out correct and the other five were
      photographed with every star still edge-on to the PREVIOUS direction,
      which reads as radial streaking rather than as an orientation bug.

      One throwaway frame per face is cheap and it is the whole fix.
      */
      scene.render()
      const url = await BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(
        engine,
        cam,
        { width: size, height: size },
        'image/png',
        1,
        false
      )
      out.push({ name: face.name, url })
    }
  } finally {
    scene.activeCamera = previous
    cam.dispose()
  }
  return out
}
