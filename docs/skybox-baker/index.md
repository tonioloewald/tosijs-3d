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
import { b3d, b3dGalaxy, bakeSkyboxCube, bakeSkyPair, starsFromVoxelGalaxy, facesToZip, defaultBakePose, SHIPPED_SKY, button3d, label3d, slider3d } from 'tosijs-3d'
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
  // The shipped sky's dim budget: dim stars only exist near the bake point,
  // so this costs nothing until the pair bake gathers them.
  dimBudget: SHIPPED_SKY.voxel.dimBudget,
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
        slider3d({ label: 'face px', value: bake.face, min: 256, max: 4096, step: 256 }),
        label3d({ text: bake.status, muted: true }),
        button3d({ label: 'bake cube', handleClick: async () => {
          bake.status = 'baking…'
          const faces = await bakeSkyboxCube(sceneEl.scene, {
            ...defaultBakePose(100, bake.outFraction.valueOf(), bake.offPlane.valueOf()),
            size: bake.face.valueOf(),
            roll: bake.roll.valueOf(),
          })
          // ONE zip, not six downloads — a burst of automatic downloads gets
          // throttled and dropped by the browser (see facesToZip).
          const zip = facesToZip([{ prefix: 'sky', faces }], 'sky-cube.zip')
          const a = document.createElement('a')
          a.href = URL.createObjectURL(zip.blob)
          a.download = zip.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 5000)
          bake.status = `saved ${zip.name} (${faces.length} faces)`
        } }),
        // THE PAIR: a 256 smooth cube for the nebulae plus a 1024 DATA cube
        // the sky shader decodes into points. The right output once the star
        // slider is at 100k — a plain raster at that density is a picture of
        // itself, and it would need 4096 to stop smearing.
        // THE SHIPPED SKY'S RECIPE — sets every slider to what produced
        // static/sky, so a rebake is one tap here and one tap below. (It used
        // to live only in commit messages; reproducing it took archaeology.)
        button3d({ label: 'use shipped recipe', handleClick: () => {
          bake.stars = SHIPPED_SKY.voxel.brightBudget
          bake.particleSize = SHIPPED_SKY.particleSize
          bake.outFraction = SHIPPED_SKY.outFraction
          bake.offPlane = SHIPPED_SKY.offPlane
          bake.roll = SHIPPED_SKY.roll
          bake.status = 'shipped recipe — rebuilding, then bake pair'
        } }),
        button3d({ label: 'bake pair (256 + 1024 data)', handleClick: async () => {
          bake.status = 'baking pair…'
          const eye = defaultBakePose(100, bake.outFraction.valueOf(), bake.offPlane.valueOf())
          // THE POINTS come from the voxel galaxy: every bright star, the dim
          // stars around the eye, the shell — what bin/bake-stars writes too.
          const sky = starsFromVoxelGalaxy(galaxy.galaxy, undefined, eye, {
            radius: 100,
            dimReach: SHIPPED_SKY.voxel.dimReach,
            floor: SHIPPED_SKY.voxel.floor,
          })
          const res = await bakeSkyPair(sceneEl.scene, galaxy, {
            ...eye,
            roll: bake.roll.valueOf(),
            smoothSize: 256,
            dataSize: 1024,
            objects: sky.objects,
          })
          const zip = facesToZip(
            [
              { prefix: 'nebula', faces: res.smooth },
              { prefix: 'stars', faces: res.data },
            ],
            'sky-pair.zip'
          )
          const a = document.createElement('a')
          a.href = URL.createObjectURL(zip.blob)
          a.download = zip.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 5000)
          bake.status = `pair baked: ${res.placed} placed, ${res.lost} lost`
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

The cost used to be generation, and is no longer — planets were 71% of it
and are now computed on demand, names come from each star's own seed, and a
cheap PRNG replaced a Mersenne Twister per star (see `galaxy-data`). Measured:

| stars | `generateGalaxy` (0.8.3) |
| ----- | ---------------- |
| 10,000 | ~25 ms |
| 100,000 | ~200 ms |

So 100k is no longer a deliberate "now bake it" action; drag the slider
freely. (It used to be ~12.6 s and blocked the main thread — the generator
kept a name table, generated full planet systems per star, and built an MT
per star plus one per planet.)

⚠️ **Tune particle size AT 90°.** A cube face is 90° FOV where a typical demo
camera is nearer 46°, so a star covers about half the angular fraction of the
frame once you widen it. Anything dialled in while orbiting the galaxy comes out
small in the bake — 0.7 here against 0.3–0.5 there.
