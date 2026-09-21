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
  bake: { seed: 1234, stars: 10000, particleSize: 0.7, outFraction: 0.55, offPlane: 1, roll: 0, face: 1024, status: 'ready' },
})

let sceneEl = null

// THE GALAXY DOES NOT REBUILD ITSELF. Changing `starCount` sets a property and
// nothing more — `regenerate()` is what rebuilds the particle systems, and the
// galaxy demo has always called it from an observer. This one did not, so every
// slider here was inert: the value changed, the scene did not.
//
// (Line comments, not a block. A block comment inside a fence CLOSES the
// enclosing /*# doc comment — which is exactly what just happened, and what
// CLAUDE.md warns about.)
//
// Debounced: at the top of the range a rebuild is ~12 s of blocked main thread,
// and a drag would otherwise queue one per step.
const galaxy = b3dGalaxy({
  seed: bake.seed,
  starCount: bake.stars,
  particleSize: bake.particleSize,
  coreSize: 0.12,
  radius: 100,
})

let pending = 0
for (const key of ['seed', 'stars', 'particleSize']) {
  bake[key].observe(() => {
    clearTimeout(pending)
    pending = setTimeout(() => galaxy.regenerate(), 400)
  })
}

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      clearColor: '#01020a',
      scenePanel: () => [
        label3d({ text: 'Bake a sky' }),
        // 10k to work with, 100k to finish with — see "Framing, then baking".
        slider3d({ label: 'stars', value: bake.stars, min: 5000, max: 100000, step: 5000 }),
        slider3d({ label: 'particle size', value: bake.particleSize, min: 0.1, max: 1.5, step: 0.05 }),
        slider3d({ label: 'out from core', value: bake.outFraction, min: 0.1, max: 0.9, step: 0.05 }),
        slider3d({ label: 'off plane', value: bake.offPlane, min: 0, max: 6, step: 0.25 }),
        slider3d({ label: 'roll', value: bake.roll, min: -180, max: 180, step: 5 }),
        slider3d({ label: 'face px', value: bake.face, min: 256, max: 2048, step: 256 }),
        label3d({ text: bake.status, muted: true }),
        button3d({ label: 'bake cube', handleClick: async () => {
          bake.status = 'baking…'
          const faces = await bakeSkyboxCube(sceneEl.scene, {
            ...defaultBakePose(100, bake.outFraction.valueOf(), bake.offPlane.valueOf()),
            size: bake.face.valueOf(),
            roll: bake.roll.valueOf(),
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
    galaxy
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
| slightly off-plane | lets the band read AS a band — and TINY is the word. The disc half-thickness here is ~12, so 1 is plenty; 3 already reads as looking down on the galaxy rather than living in it |
| **tilted** | the band ARCS across the sky instead of lying level — and a level band reads as wallpaper the moment anyone looks up. Applied to the CUBE, not the galaxy: rotating the subject moves it out from under the camera |

The tilt is the one worth insisting on, and it is free: it is a property of the
capture basis, not the galaxy, so it costs one rotation and no geometry. Seed it
per system and no two stars share a sky.

## Framing, then baking

The star count defaults to **10,000 and goes to 100,000**, and the gap is
deliberate: you want the scene responsive while you are deciding where to stand
and how big the stars should be, and dense only for the shot you keep.

The cost is generation, not rendering, and it is worth knowing before you drag
the slider to the end. Measured on this machine:

| stars | `generateGalaxy` |
| ----- | ---------------- |
| 10,000 | ~1.1 s |
| 50,000 | ~5 s |
| 100,000 | ~12.6 s |

It is roughly linear and it blocks the main thread, so 100k is a deliberate
"now bake it" action rather than something to nudge through. (It used to be far
worse — the generator kept its used names in an array and scanned it per star,
which made this O(n²); 100k took 34 s before that was a `Set`.)

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
  /**
   * Pixels per cube face. Each face is a genuine render at this size, not an
   * upscale, so it is the only knob that buys actual sky detail.
   *
   * A face covers 90°, so it is stretched across a large part of a wide
   * viewport — 512 reads as soft the moment the sky fills the screen. 1024 is
   * the sensible default; 2048 is a hero asset.
   *
   * | face | VRAM (RGBA, 6 faces) |
   * | ---- | -------------------- |
   * | 512 | 6 MB |
   * | 1024 | 25 MB |
   * | 2048 | 100 MB |
   */
  size?: number
  /** Far plane for the capture. Must reach past whatever you are photographing. */
  maxZ?: number
  /**
   * Things that billboard and must be aimed at the camera POSITION before the
   * capture — anything with a `facePoint(v)` method, which `b3d-galaxy` has.
   *
   * Defaults to every `<tosi-b3d-galaxy>` in the document, because forgetting
   * this is not a small mistake: leave a subject billboarding and it re-orients
   * to each face's view plane, so stars come out radially smeared and the faces
   * disagree at their seams.
   */
  subjects?: Array<{ facePoint(t: BABYLON.Vector3 | null): void }>
  /**
   * Roll the capture basis about its Z axis, in DEGREES — where the galactic
   * band sits in the finished sky.
   *
   * Baked in rather than applied later because the whole value of an
   * interactive baker is SEEING the framing while you choose it. (The cube can
   * still be re-oriented afterwards with `b3d-skybox`'s `starfieldTilt`; this is
   * for deciding, that is for adjusting.)
   */
  roll?: number
}

/**
 * Where to stand, given a galaxy's radius.
 *
 * ⚠️ THIS IS IN THE GALAXY'S OWN FRAME. The first bake rotated the galaxy to
 * tilt the band and then used this position unchanged, so the camera stayed
 * where it was while the disc swung away from it — the sky came out
 * photographed from well outside, looking back at the galaxy as an object.
 * Tonio: "It should be baked from INSIDE the galaxy just off the plane, vs. way
 * off to the side."
 *
 * So: either leave the subject unrotated and use this directly (what the baker
 * does), or transform it by the subject's world matrix. **Do not rotate the
 * galaxy to get a tilt** — tilt the cube where it is USED, which is free, and
 * keeps the one number that must be right about placement out of the business
 * of orientation entirely.
 */
export function defaultBakePose(
  galaxyRadius: number,
  outFraction = 0.55,
  offPlane = 1
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
  const FACES: Array<{
    name: string
    dir: BABYLON.Vector3
    up: BABYLON.Vector3
  }> = [
    { name: 'px', dir: new V(1, 0, 0), up: new V(0, 1, 0) },
    { name: 'nx', dir: new V(-1, 0, 0), up: new V(0, 1, 0) },
    { name: 'py', dir: new V(0, 1, 0), up: new V(0, 0, -1) },
    { name: 'ny', dir: new V(0, -1, 0), up: new V(0, 0, 1) },
    { name: 'pz', dir: new V(0, 0, 1), up: new V(0, 1, 0) },
    { name: 'nz', dir: new V(0, 0, -1), up: new V(0, 1, 0) },
  ]

  /*
  ROLL THE BASIS, NOT THE SUBJECT. Rotating the galaxy to tilt the band moves it
  out from under the camera — that bug is recorded on `defaultBakePose`. Rolling
  the six face directions turns the sky instead, which is what "rotate the
  skybox" should mean and cannot displace the observer.
  */
  const roll = ((options.roll ?? 0) * Math.PI) / 180
  if (roll !== 0) {
    const R = BABYLON.Matrix.RotationZ(roll)
    for (const f of FACES) {
      BABYLON.Vector3.TransformNormalToRef(f.dir, R, f.dir)
      BABYLON.Vector3.TransformNormalToRef(f.up, R, f.up)
    }
  }

  const at = new V(options.x, options.y, options.z)
  const cam = new BABYLON.FreeCamera(
    'skybox-bake-cam',
    at.clone(),
    scene,
    false
  )
  // 90° EXACTLY, and square — a cube face is a quarter turn per axis. Anything
  // else leaves gaps at the seams that no amount of tuning will close.
  cam.fov = Math.PI / 2
  cam.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED
  cam.minZ = 0.1
  cam.maxZ = options.maxZ ?? 5000

  /*
  AIM THE BILLBOARDS AT THE CAMERA — inside the baker, so it cannot be skipped.

  `facePoint` existed for exactly this and NOTHING CALLED IT: the demo's bake
  button went straight to this function, so every capture ran with the particle
  systems still billboarding per face. Tonio, from the result: "I think you're
  pointing the stars at the galactic origin. That makes the coreward render look
  pretty good but it's terrible for the others" — which is the signature, since
  a face centred on the core has its billboards nearly right and everything
  further off-axis progressively worse.

  A guard that lives in the documentation is not a guard. It belongs here.
  */
  const subjects =
    options.subjects ??
    (Array.from(
      document.querySelectorAll('tosi-b3d-galaxy')
    ) as unknown as Array<{ facePoint(t: BABYLON.Vector3 | null): void }>)
  for (const s of subjects) s.facePoint?.(at)

  const previous = scene.activeCamera
  const out: BakedFace[] = []
  try {
    for (const face of FACES) {
      cam.position.copyFrom(at)
      cam.upVector.copyFrom(face.up)
      cam.setTarget(at.add(face.dir))
      scene.activeCamera = cam
      /*
      RENDER NORMALLY FIRST, so anything camera-dependent settles.

      ⚠️ AND IF THE SUBJECT BILLBOARDS, POINT IT AT THE CAMERA POSITION FIRST —
      see `B3dGalaxy.facePoint`. Billboards align to the camera's VIEW PLANE,
      which differs per face, so left alone every particle re-orients between
      captures and the faces disagree at their seams.

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
    // Hand orientation back to the live camera, or the scene stays frozen
    // facing a point the viewer has since left.
    for (const s of subjects) s.facePoint?.(null)
    scene.activeCamera = previous
    cam.dispose()
  }
  return out
}
