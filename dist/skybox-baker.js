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
import { b3d, b3dGalaxy, bakeSkyboxCube, bakeSkyPair, facesToZip, defaultBakePose, SHIPPED_SKY, button3d, label3d, slider3d } from 'tosijs-3d'
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
          bake.stars = SHIPPED_SKY.stars
          bake.particleSize = SHIPPED_SKY.particleSize
          bake.outFraction = SHIPPED_SKY.outFraction
          bake.offPlane = SHIPPED_SKY.offPlane
          bake.roll = SHIPPED_SKY.roll
          bake.status = 'shipped recipe — rebuilding, then bake pair'
        } }),
        button3d({ label: 'bake pair (256 + 1024 data)', handleClick: async () => {
          bake.status = 'baking pair…'
          const res = await bakeSkyPair(sceneEl.scene, galaxy, {
            ...defaultBakePose(100, bake.outFraction.valueOf(), bake.offPlane.valueOf()),
            roll: bake.roll.valueOf(),
            smoothSize: 256,
            dataSize: 1024,
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

| stars | `generateGalaxy` |
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
*/
/*{ "parent": "Demos", "order": 30 }*/
import * as BABYLON from '@babylonjs/core';
import { zipSync } from 'fflate';
import { FACE_NAMES, encodeStarfield, spectralValue, } from './starfield-codec.js';
import { pngEncode } from './png.js';
/**
 * THE RECIPE FOR `static/sky` — the pair every demo loads as
 * `/sky/nebula` + `/sky/stars`.
 *
 * Written down because it was not: reproducing the shipped sky meant reading
 * commit messages (100k stars in one, 42% out in another) and then proving the
 * guess by rebaking and byte-comparing. Bake with these and the data faces
 * are reproducible exactly.
 *
 * `tilt` is NOT baked in — the cube is photographed level and tilted where it
 * is used (`b3dSkybox({ starfieldTilt: SHIPPED_SKY.tilt })`), for the reason
 * on {@link defaultBakePose}. It is recorded here so the pair and the angle it
 * was framed for travel together.
 */
export const SHIPPED_SKY = {
    seed: 1234,
    stars: 100000,
    radius: 100,
    particleSize: 0.7,
    outFraction: 0.42,
    offPlane: 1,
    roll: 0,
    smoothSize: 256,
    dataSize: 1024,
    tilt: '12,25,58',
};
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
export function defaultBakePose(galaxyRadius, outFraction = 0.55, offPlane = 1) {
    return { x: galaxyRadius * outFraction, y: offPlane, z: 0 };
}
/**
 * Bundle baked faces into ONE zip for download.
 *
 * Twelve separate browser downloads are both rude and unreliable: Chrome
 * treats a burst of automatic downloads as a permission event and silently
 * drops the rest mid-burst (observed: four of six star faces arrived). One
 * file, no prompts, nothing dropped.
 *
 * STORED, not compressed — the PNGs are already compressed, so deflating
 * again buys nothing and costs time.
 */
export function facesToZip(groups, zipName = 'sky-faces.zip') {
    const files = {};
    for (const { prefix, faces } of groups) {
        for (const f of faces) {
            const bin = atob(f.url.split(',')[1]);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++)
                bytes[i] = bin.charCodeAt(i);
            files[`${prefix}_${f.name}.png`] = bytes;
        }
    }
    const zipped = zipSync(files, { level: 0 });
    return {
        blob: new Blob([zipped], { type: 'application/zip' }),
        name: zipName,
    };
}
/**
 * Photograph the scene from one point as six cube faces.
 *
 * Returns PNG data URLs in Babylon's cube order, ready to save beside each
 * other as `<root>_px.png` … `<root>_nz.png` and loaded with
 * `new CubeTexture(root, scene)`.
 */
/**
 * Pull the point-like sky out of a `<tosi-b3d-galaxy>` as encodable objects.
 *
 * Stars AND the distant galaxies, because the latter are points too — measured:
 * baking the nebula system alone at 256 versus 1024 preserves energy and
 * bright-area almost exactly and loses only PEAK, and peak is what a point is.
 * The nebulae stay behind for the smooth cube, which is all they ever needed.
 *
 * The distant galaxies come through the galaxy's own accessor rather than a
 * size cut over the nebula system — at scale 3–9 they overlap the local
 * nebulae (2.25–7.5), so "small" would sweep in most of the nebulae along with
 * them. At the default 10k galaxy that was 1,400 extra discs in the cube; at
 * 100k it is fourteen thousand, crowding the cube and displacing real stars.
 * The data model knows which is which — ask it.
 *
 * Stars join the star DATA by particle index (the SPS builds one particle per
 * star, in order — the same alignment `hideStarAt` relies on). Two reasons,
 * both measured rather than assumed:
 *
 * - **Colour from the SPECTRAL CLASS, not the rgb.** A star's colour follows
 *   its class, so `palette: spectralPaletteIndex(spectralType)` is what the
 *   encoder stores — nearest-matching the particle's rgb made every star land
 *   in the near-white palette entries, which is exactly the "bright white
 *   dots, no colour" sky Tonio called out.
 * - **Brightness from the AUTHORED scale, not the clamped particle size.**
 *   `b3d-galaxy` clamps a star's apparent size (`maxStarApparentSize`), and at
 *   bake distance the clamp bit most of the population — the particle scales
 *   were nearly uniform, so the encoded magnitudes were too, and the display
 *   curve had no gradient to show. `StarData.scale` is derived from
 *   luminosity before any clamping, so the real magnitude range survives.
 */
export function starsFromGalaxy(galaxy, eye, options = {}) {
    const out = [];
    const stars = galaxy.getStarPoints?.() ?? [];
    const starData = galaxy.getGalaxyData?.()?.stars ?? [];
    let maxScale = 0;
    for (const s of starData)
        maxScale = Math.max(maxScale, s.scale || 0);
    const norm = maxScale > 0 ? 1 / maxScale : 1;
    /*
    THE DISC STARS ONLY. The star mesh also carries the distant stars on its
    tail, and they have their own loop below — walking the whole mesh encoded
    each of them TWICE, once here as a spectral-less 0.02 "star" and once
    properly. (Every sky baked before this fix carries the 3,000 duplicates;
    `placed` counted them.) Without star data there is no telling which is
    which, so everything is taken, as before.
    */
    const discCount = starData.length > 0 ? Math.min(stars.length, starData.length) : stars.length;
    for (let i = 0; i < discCount; i++) {
        const p = stars[i];
        const data = starData[i];
        out.push({
            x: p.position.x - eye.x,
            y: p.position.y - eye.y,
            z: p.position.z - eye.z,
            // The star's OWN scale, pre-clamp — see the note above. A floor,
            // because a star encoded as zero is a star deleted.
            brightness: Math.max(0.02, Math.min(1, (data?.scale ?? 0) * norm)),
            r: p.color?.r ?? 1,
            g: p.color?.g ?? 1,
            b: p.color?.b ?? 1,
            // Colour follows the class; rgb is the fallback when the data is gone.
            spectral: data != null ? spectralValue(data.spectralType) : undefined,
        });
    }
    /*
    The galaxies are the faintest things in the sky, and small discs rather than
    points — which is the whole reason the `size` field exists.
    */
    const cut = options.galaxyMaxScale ?? 9;
    for (const p of galaxy.getDistantGalaxyParticles?.() ?? []) {
        const s = p.scaling?.x ?? 0;
        if (s <= 0)
            continue;
        out.push({
            x: p.position.x - eye.x,
            y: p.position.y - eye.y,
            z: p.position.z - eye.z,
            brightness: Math.max(0.05, Math.min(1, s / cut)),
            r: p.color?.r ?? 1,
            g: p.color?.g ?? 1,
            b: p.color?.b ?? 1,
            // A galaxy is a small DISC, which is the whole reason `size` exists.
            size: Math.min(1, s / cut),
        });
    }
    /*
    The dim far-out stars — isotropic texture in the empty regions. Brightness
    stays BELOW `BRIGHT_SPECTRAL_FLOOR` on purpose: they are the faintest
    things in the sky, and the encoder then stores them as the warm-yellow
    faint default rather than spending spectral precision on points the eye
    cannot read colour on anyway.
    */
    const dimCut = options.galaxyMaxScale != null ? options.galaxyMaxScale * 3.6 : 9;
    for (const p of galaxy.getDistantStarParticles?.() ?? []) {
        const s = p.scaling?.x ?? 0;
        if (s <= 0)
            continue;
        out.push({
            x: p.position.x - eye.x,
            y: p.position.y - eye.y,
            z: p.position.z - eye.z,
            // 0.05…0.25 — dim, but present.
            brightness: Math.max(0.05, Math.min(0.25, s / dimCut)),
            r: p.color?.r ?? 1,
            g: p.color?.g ?? 1,
            b: p.color?.b ?? 1,
        });
    }
    return out;
}
/**
 * Encoded faces → PNG data URLs, ready to save beside a skybox.
 *
 * ⚠️ **PNG, and it must stay PNG — but that is only half the rule.** These are
 * packed fields, not pictures, and a lossy codec would quantise a sub-texel
 * position into a different position and a brightness into a different star.
 * JPEG here would not look slightly worse, it would move the sky.
 *
 * The other half is that the PNG must not pass through a CANVAS. The canvas 2D
 * backing store is premultiplied, and a star's alpha byte is a palette index
 * (0..9) rather than an opacity — so `putImageData` rounds the RGB of every
 * low-alpha texel toward zero, `toDataURL` faithfully saves the destruction,
 * and the shader decodes a sky with its faint stars silently deleted.
 * Measured against the real 100k-star galaxy before this was written: 67% of
 * one face's occupied texels corrupted or gone, positions snapped to 0/255,
 * before any compression question arose. `pngEncode` writes the bytes
 * directly; a texel with alpha 0 and nonzero RGB survives exactly.
 */
export async function facesToPngs(faces, size) {
    const out = [];
    for (let i = 0; i < faces.length; i++) {
        const bytes = pngEncode(faces[i], size, size);
        // btoa over 1 MB in one slice is fine; the chunking is for safety, not size.
        let binary = '';
        const CHUNK = 0x8000;
        for (let at = 0; at < bytes.length; at += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK));
        }
        out.push({
            name: FACE_NAMES[i],
            url: `data:image/png;base64,${btoa(binary)}`,
        });
    }
    return out;
}
/**
 * Bake a galaxy into the PAIR of cubes the sky wants: a small smooth one for
 * the nebulae and a data one for the points.
 *
 * The two are separate because they are different KINDS of thing, measured
 * rather than assumed — see `starfield-codec`. The smooth half is
 * low-frequency and survives 256; the points need position, not pixels.
 */
export async function bakeSkyPair(scene, galaxy, options) {
    /*
    HIDE THE STARS FOR THE SMOOTH BAKE. They are about to be stored exactly;
    rendering them into the nebula cube as well would double every one of them,
    and the smeared copy is the thing this whole exercise exists to delete.
    */
    const mesh = galaxy.getStarMesh?.() ?? null;
    const wasVisible = mesh?.isVisible ?? false;
    if (mesh != null)
        mesh.isVisible = false;
    let smooth;
    try {
        smooth = await bakeSkyboxCube(scene, {
            ...options,
            size: options.smoothSize ?? 256,
        });
    }
    finally {
        if (mesh != null)
            mesh.isVisible = wasVisible;
    }
    const objects = starsFromGalaxy(galaxy, {
        x: options.x,
        y: options.y,
        z: options.z,
    });
    const size = options.dataSize ?? 1024;
    const enc = encodeStarfield(objects, size);
    return {
        smooth,
        data: await facesToPngs(enc.faces, size),
        placed: enc.placed,
        lost: enc.collided,
    };
}
export async function bakeSkyboxCube(scene, options) {
    const size = options.size ?? 512;
    const engine = scene.getEngine();
    /*
    SAY SO IF THIS MACHINE COULD NOT DISPLAY WHAT IT IS ABOUT TO BAKE.
  
    The bake itself is a 2D render target, so it will happily produce faces larger
    than this device can ever load back as a CUBE — and the failure then happens
    somewhere else entirely, at load time, as a black sky. Cheap to check here
    where the number is in hand, and the warning names the limit rather than the
    symptom.
  
    It is only a warning: baking a 4096 asset on a modest machine for a beefier
    one is a legitimate thing to be doing, and refusing would stop it.
    */
    const maxCube = engine.getCaps().maxCubemapTextureSize;
    if (maxCube > 0 && size > maxCube) {
        console.warn(`skybox-baker: baking ${size}px faces, but this device caps cube maps at ` +
            `${maxCube}px — it will not be able to load the result as a skybox. ` +
            `WebGL2 only guarantees 2048.`);
    }
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
    const V = BABYLON.Vector3;
    const FACES = [
        { name: 'px', dir: new V(1, 0, 0), up: new V(0, 1, 0) },
        { name: 'nx', dir: new V(-1, 0, 0), up: new V(0, 1, 0) },
        { name: 'py', dir: new V(0, 1, 0), up: new V(0, 0, -1) },
        { name: 'ny', dir: new V(0, -1, 0), up: new V(0, 0, 1) },
        { name: 'pz', dir: new V(0, 0, 1), up: new V(0, 1, 0) },
        { name: 'nz', dir: new V(0, 0, -1), up: new V(0, 1, 0) },
    ];
    /*
    ROLL THE BASIS, NOT THE SUBJECT. Rotating the galaxy to tilt the band moves it
    out from under the camera — that bug is recorded on `defaultBakePose`. Rolling
    the six face directions turns the sky instead, which is what "rotate the
    skybox" should mean and cannot displace the observer.
    */
    const roll = ((options.roll ?? 0) * Math.PI) / 180;
    if (roll !== 0) {
        const R = BABYLON.Matrix.RotationZ(roll);
        for (const f of FACES) {
            BABYLON.Vector3.TransformNormalToRef(f.dir, R, f.dir);
            BABYLON.Vector3.TransformNormalToRef(f.up, R, f.up);
        }
    }
    const at = new V(options.x, options.y, options.z);
    const cam = new BABYLON.FreeCamera('skybox-bake-cam', at.clone(), scene, false);
    // 90° EXACTLY, and square — a cube face is a quarter turn per axis. Anything
    // else leaves gaps at the seams that no amount of tuning will close.
    cam.fov = Math.PI / 2;
    cam.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
    cam.minZ = 0.1;
    cam.maxZ = options.maxZ ?? 5000;
    /*
    PIN THE VIEWPOINT — inside the baker, so it cannot be skipped.
  
    `b3d-galaxy` billboards in its vertex shader toward the rendering camera's
    POSITION, which the six faces share, so the seams agree on their own.
    `facePoint` still matters: it fixes that viewpoint for the whole capture and
    switches on the apparent-size clamp, which only means something from one
    known point.
  
    (It once existed and NOTHING CALLED IT, back when billboarding was per-face
    on the CPU — Tonio, from the result: "I think you're pointing the stars at
    the galactic origin." A guard that lives in the documentation is not a guard.
    It belongs here.)
    */
    const subjects = options.subjects ??
        Array.from(document.querySelectorAll('tosi-b3d-galaxy'));
    for (const s of subjects)
        s.facePoint?.(at);
    const previous = scene.activeCamera;
    const out = [];
    try {
        for (const face of FACES) {
            cam.position.copyFrom(at);
            cam.upVector.copyFrom(face.up);
            cam.setTarget(at.add(face.dir));
            scene.activeCamera = cam;
            /*
            RENDER NORMALLY FIRST, so anything camera-dependent settles.
      
            The screenshot's own render target does not run the scene's beforeRender
            observers, so anything that updates from one — CPU billboards, as a
            `SolidParticleSystem` does — would otherwise be photographed still facing
            the PREVIOUS face (the galaxy did exactly that, as radial streaking,
            before it moved its billboarding into the vertex shader). One throwaway
            frame per face is cheap, and keeps the baker honest for subjects that
            are not the galaxy.
            */
            scene.render();
            const url = await BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(engine, cam, { width: size, height: size }, 'image/png', 1, false);
            out.push({ name: face.name, url });
        }
    }
    finally {
        // Hand orientation back to the live camera, or the scene stays frozen
        // facing a point the viewer has since left.
        for (const s of subjects)
            s.facePoint?.(null);
        scene.activeCamera = previous;
        cam.dispose();
    }
    return out;
}
//# sourceMappingURL=skybox-baker.js.map