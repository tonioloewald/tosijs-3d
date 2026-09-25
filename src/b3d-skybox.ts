/*#
# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 17 } })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Sky' }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0, latitude: 40 }),
  // A checkered ground (receives shadows) + a few casters — scrub the time of
  // day and watch the shadows swing long at dawn/dusk and short at noon.
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  b3dBox({ meshName: 'pillar', size: 1.5, x: -3, y: 0.75, z: 1, color: '#c85a3a' }),
  b3dBox({ meshName: 'crate', size: 1, x: 2, y: 0.5, z: 3, color: '#5aa0c8' }),
  b3dSphere({ meshName: 'ball', diameter: 2, x: 3, y: 1, z: -2, color: '#c8a83a' }),
)
preview.append(scene)
```

## Demo — the encoded sky

A baked sky is a raster of a thing that is almost entirely empty, and the
stars are the expensive part. The PAIR that `bakeSkyPair()` emits splits the
sky the way the measurements argued for: nebulae (low-frequency) in a small
smooth cube, stars and distant galaxies (points) in a DATA cube the shader
decodes — so stars stay points at any zoom instead of being a smear baked at
one resolution. Zoom into the band and watch them stay sharp.

```js
import { b3d, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 23.5 } })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Encoded sky' }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSkybox({
    timeOfDay: sky.timeOfDay,
    realtimeScale: 0,
    starfieldCube: '/sky/nebula',
    starfieldData: '/sky/stars',
    starfieldTilt: '12,25,58',
  }),
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
)
preview.append(scene)
```

### Pin the shipped sky in a document

`/sky/stars` + `/sky/nebula` are **latest**: what the demos load, and a rebake
changes them. A document that should keep the sky it was authored against
points at a **versioned** pair instead, which is never rewritten:

```javascript
b3dSkybox({
  starfieldCube: 'https://3d.tosijs.net/sky/0.8.4/nebula',
  starfieldData: 'https://3d.tosijs.net/sky/0.8.4/stars',
  starfieldDataSize: 1024, // from the manifest — it must match the data
  starfieldTilt: '12,25,58',
})
```

Each version folder carries a `manifest.json` with the decode parameters
(`starfieldDataSize`, `starfieldTilt`) and the recipe it was baked from, so a
consumer can read them from beside the data rather than hard-coding them.
Versions so far: `0.8.3` (the `generateGalaxy` sky) and `0.8.4` (the voxel
galaxy — far more stars). tosijs-3d#90.

The starfield attributes (`starfield*`, `nebula*`) are **live**: changing one
on an existing sky rebuilds the starfield, so applying a document to a sky
that is already up works. `skyboxSize` is the one that is still read once.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `latitude` | `40` | Geographic latitude in DEGREES (affects the sun's arc) |
| `azimuth` | `0` | **Ignored** — the sun is placed by `latitude` and `timeOfDay`, and the sky material accepts this and discards it. Kept so old markup doesn't break; not in `skyboxSchema()` (tosijs-3d#86) |
| `luminance` | `1` | Sky brightness |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `spaceStart` | `0` | Altitude (m) where the fade to space BEGINS |
| `spaceFull` | `0` | Altitude (m) of full vacuum. Feature is off unless this exceeds `spaceStart` |
| `atmosphere` | `1` | How much air this WORLD has: `1` Earth, `0` the Moon (black sky at noon, stars out, no haze, a hard sun). Deliberately steep — only the last stretch toward 0 thins the sky (vacuum is `(1 − atmosphere)⁴`) — and it multiplies with the space band |
| `dust` | `0` | Suspended dust, 0…1: bright, coloured haze that is never blue. Independent of `atmosphere`, so Mars is almost no air and lots of dust, and the Moon is neither |
| `zenithTint` | `'#ffffff'` | The sky's colour overhead — the scattered light's own brightness in this hue, by `tintStrength`. Stars and moon are behind the air and untinted |
| `horizonTint` | `'#ffffff'` | The same at the horizon. `zenithTint: '#c8a070', horizonTint: '#e0b080', tintStrength: 1` is a butterscotch Mars |
| `tintStrength` | `0` | How much the sky takes the tints, `0` (Earth, untouched) … `1` |
| `starfieldCube` | `''` | Root path of a baked cube (`<root>_px.png` …). Replaces `starfield` |
| `starfieldData` | `''` | Root path of a DATA cube (`<root>_px.png` …) encoded by `starfield-codec`. Not a picture of a starfield — a table of stars the shader decodes into points that stay sharp at any zoom. Composes with `starfieldCube` rather than replacing it |
| `starfieldDataSize` | `1024` | Texels per face of `starfieldData`. Must match what encoded it. 1024 is the size to ship — at 512 a packed texel reads as a lattice through the dense band |
| `starfieldSharpness` | `3` | How sharp a decoded point is — higher is tighter. 3 tucks the gaussian tail in so a star reads as a point |
| `starfieldGain` | `0.9` | How bright the decoded stars are — the intensity cap on the whole point sky |
| `starfieldTwinkle` | `0.35` | Scintillation strength. Scaled by the gas (none in vacuum), strongest at the horizon |
| `starfieldFloor` | `0.4` | The faint mass's brightness — most stars sit on it; `starfieldGain` only moves the bright few above it |
| `starfieldSizeScale` | `3` | How much bigger a full-size object (a distant galaxy) is than a star |
| `starfieldTilt` | `'0,0,0'` | Degrees `rx,ry,rz` rotating the sampling direction — both cubes — where a galactic tilt belongs |
| `starfield` | `0` | How many background stars to build. `0` = none |
| `nebulae` | `0` | Soft emission clouds behind the stars. `0` = none |
| `nebulaBrightness` | `1` | Nebula brightness 0…1 |
| `nebulaSize` | `0.045` | Nebula size as a fraction of the sky radius |
| `nebulaTexture` | `''` | Black-backed image stamped per nebula; empty = a plain procedural falloff |
| `spaceColor` | `'#05070f'` | What is behind the stars in vacuum. Just north of black, so a black hole still has somewhere darker to go |
| `starfieldSeed` | `12345` | Seed for the starfield — same seed, same constellations |
| `starDistance` | `0` | Park a `<tosi-b3d-star>` child this far along the sun vector. `0` = leave it alone |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { PRNG } from './mersenne-twister.js'
import type { B3dMoon } from './b3d-moon.js'
import { SkyMaterial } from '@babylonjs/materials'
import { BRIGHT_GAMMA, paletteGlsl, spectralGlsl } from './starfield-codec.js'
/*
Imported for SIDE EFFECTS: these register `skyVertexShader` and
`skyPixelShader` in Babylon's `ShaderStore`. `SkyMaterial` loads them lazily on
first compile, which is too late for us — we want to read the source at setup
and derive our own from it.
*/
import '@babylonjs/materials/sky/sky.vertex.js'
import '@babylonjs/materials/sky/sky.fragment.js'
import { AbstractMesh } from './b3d-utils.js'
import { band } from './atmosphere.js'
import type { B3d } from './tosi-b3d.js'
import type { B3dSun } from './b3d-shadows.js'

const DEG_TO_RAD = Math.PI / 180

function hexToColor3(hex: string): BABYLON.Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new BABYLON.Color3(r, g, b)
}

// Shared constants so updateSky (which runs per frame while the sky animates) can
// stay allocation-free — see the reused scratch on the component.
/**
 * The fallback when no `nebulaTexture` is given — a plain radial falloff.
 *
 * Deliberately modest: it is a DISC, symmetric and smooth, and it reads as a
 * lens flare rather than as gas. It exists so the attribute is optional, not
 * because it is any good. Point `nebulaTexture` at a real painted one.
 */
function proceduralNebula(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const tex = new BABYLON.DynamicTexture(
    'nebula-falloff',
    { width: 128, height: 128 },
    scene,
    false
  )
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  tex.update()
  return tex
}

/*
OUR SKY, DERIVED FROM BABYLON'S AT RUNTIME.

The sky is the one major visual in this repo we did not own — eight other files
carry their own shaders and `b3d-skybox` rented `SkyMaterial`. That was fine
until it wasn't: a baked starfield has to be composited INTO the sky, and
SkyMaterial has no extension point at all (no plugin support, no
`customShaderNameResolve`, `samplers: []` hardcoded — see UPSTREAM.md).

So we fork it — by reading their registered source out of `ShaderStore` and
injecting into it, rather than pasting a copy here. What we maintain is a
three-line diff instead of a Preetham implementation.

⚠️ Do NOT oversell that as "we inherit their improvements". Tonio's read is
right: this is a straightforward implementation of Preetham et al. (SIGGRAPH
1999) and it will not change unless the underlying APIs do or someone writes a
better paper. There are no algorithmic improvements coming to inherit.

The benefit is the OTHER half of that sentence. Engine-plumbing changes — a
renamed include, a new uniform, a WGSL migration — are the likely churn, and
deriving at runtime tracks exactly those, where a pasted copy would quietly stop
matching the engine around it.

If the anchor ever disappears — they rewrite the shader, rename something — the
fork simply does not register and the caller falls back to stock `SkyMaterial`.
Losing the starfield is a much better failure than a black sky.
*/
const B3D_SKY = 'b3dSky'

/**
 * The GLSL half of `starfield-codec` — decode the data cube into points.
 *
 * The palette comes from `paletteGlsl()` and the spectral ramp from
 * `spectralGlsl()` rather than being written out here, so the two halves of
 * the codec cannot drift apart.
 *
 * ## Why a 3x3 read
 *
 * The cube is sampled NEAREST, because the texels are data and interpolating
 * between two packed stars produces a third star that is not there. So a
 * fragment must look at the neighbourhood itself: a star near a texel edge
 * still has to light the fragment next door, or every star would be clipped to
 * its own texel and the sky would be a grid of hard squares.
 *
 * The neighbours are walked in TEXEL space, from the fragment's own texel,
 * each fetched at its centre, and every star is rebuilt from its own texel and
 * its encoded sub-texel offset, through an exact GLSL mirror of the codec's
 * cube convention. (The first version perturbed the view direction instead and
 * placed stars relative to the tap, which smeared every star across its texel;
 * see `b3dPoint`.) A neighbour past a face's edge is just a direction past the
 * edge: `textureCube` resolves it and `b3dFaceUv` names the texel it hit.
 */
function starDecodeGlsl(palette: string): string {
  return `
${palette}

uniform samplerCube b3dStarData;
uniform float b3dStarDataLevel;
// x = texels per face, y = radians per texel, z = point sharpness, w = size scale
uniform vec4 b3dStarInfo;

/*
DISPLAY EXPONENT — the look, not the data.

The encoded gamma (BRIGHT_GAMMA) spends the 8 bits where the magnitudes are;
this extra exponent shapes how they PRESENT. 2.0 (net m^2 on the recovered
magnitude) reads like a log scale: the field is subtle, the brightest few stay
bright points. Tonio: "the galaxy should be mostly subtle with only a few
actual bright points of light." Tuned through 1.0 (band blew out white), 2.3
(too far — it suppressed the faint K/M stars, which is exactly where the
COLOUR lives, leaving only hot blue-white dots) and back to 2.0, where the
colourful mass survives as a dim sprinkle.
*/
#define DISPLAY_EXP 2.0
/*
STAR GAIN — the intensity cap (the \`starfieldGain\` attribute; 0.9 since the
decoder stopped smearing each star over its texel, which had been quietly
adding light — the tuning history below was against the smeared points). The curve alone cannot stop the brightest
stars sitting at 1.0 over the band's glow, which reads as white-hot dots no
matter what tint they carry. The whole contribution scales down so the few
bright points stay the brightest things in the sky without the blowout.
Toned: 0.55 was still "a little too bright", 0.45 is where it landed.
*/
uniform float b3dStarGain;
uniform float b3dTwinkle;
uniform float b3dTime;
float b3dTwAmp = 0.0;
#define STAR_GAIN b3dStarGain
/*
DISPLAY FLOOR (the \`starfieldFloor\` attribute; 0.4 since exact points — a
faint star is now one crisp pixel rather than a texel-wide smear, so it needs
more of its own light to be seen) — the faint mass must stay VISIBLE, and the WARM COLOUR lives
in the faint mass. The K/M classes are physically the dim ones — they never
cross BRIGHT_SPECTRAL_FLOOR, so they all render through the warm-yellow
faint path — and a floor of 0.05 put them at ~10/255, invisible on a real
screen. Tonio: "zero stars visible in empty regions". 0.1 reads as a dim
warm sprinkle. Only the very bottom is flattened — everything above the
floor keeps its relative order.
*/
uniform float b3dStarFloor;
#define DISPLAY_FLOOR b3dStarFloor

/*
THE CUBE CONVENTION, in GLSL — an exact mirror of starfield-codec's dirToFace
and faceToDir (the OpenGL cube-map convention). The decoder needs it because a
star is stored as (face, texel, sub-texel u/v), and the ONLY way to put it
back where it was encoded is to invert exactly that.
*/
vec3 b3dFaceUv(vec3 d) {
  vec3 a = abs(d);
  float face; float sc; float tc; float ma;
  if (a.x >= a.y && a.x >= a.z) {
    ma = a.x;
    if (d.x > 0.0) { face = 0.0; sc = -d.z; tc = -d.y; }
    else { face = 1.0; sc = d.z; tc = -d.y; }
  } else if (a.y >= a.z) {
    ma = a.y;
    if (d.y > 0.0) { face = 2.0; sc = d.x; tc = d.z; }
    else { face = 3.0; sc = d.x; tc = -d.z; }
  } else {
    ma = a.z;
    if (d.z > 0.0) { face = 4.0; sc = d.x; tc = -d.y; }
    else { face = 5.0; sc = -d.x; tc = -d.y; }
  }
  return vec3(face, sc * 0.5 / ma + 0.5, tc * 0.5 / ma + 0.5);
}

vec3 b3dFaceDir(float face, vec2 uv) {
  float s = uv.x * 2.0 - 1.0;
  float t = uv.y * 2.0 - 1.0;
  if (face < 0.5) return vec3(1.0, -t, -s);
  if (face < 1.5) return vec3(-1.0, -t, s);
  if (face < 2.5) return vec3(s, 1.0, t);
  if (face < 3.5) return vec3(s, -1.0, -t);
  if (face < 4.5) return vec3(s, -t, 1.0);
  return vec3(-s, -t, -1.0);
}

/*
ONE RECONSTRUCTED POINT, at an exact direction.

It used to be placed relative to the TAP direction — whichever of the nine
perturbed directions happened to fetch its texel — so as the fragment moved,
the tap moved, and the star moved with it: every star was smeared across the
texel it lived in, into a soft plus-shaped blob (seen on a real screen,
2026-09-25). The note that stood here promised "every fragment reconstructs
the same position"; that was only true if the tap were the texel's centre,
and it was not. Now the star's direction comes from its own texel and its
encoded sub-texel offset, so every fragment agrees to the bit.
*/
float b3dReach = 1.0;

vec3 b3dPoint(
  vec3 starDir, float brightness, vec3 tint, float radius, vec3 viewDir
) {
  float d = length(viewDir - starDir) / b3dStarInfo.y;
  /*
  A GAUSSIAN, not a hard disc. A point source drawn as a circle of pixels reads
  as a sticker; drawn as a falloff it reads as light, and it antialiases itself
  at every zoom — which is the entire reason for doing this rather than baking.
  */
  float falloff = exp(-(d * d) / (radius * radius) * b3dStarInfo.z);
  /*
  THE REACH TAPER. The 3×3 read only guarantees a star is seen by fragments
  within about a texel of it; anything drawn further out is cut where the
  neighbourhood ends, along texel edges — the squared-off bright shapes in the
  dense core (a distant galaxy can be 3.5 texels in radius). So every object
  fades to nothing within ONE of its own face's texels, per axis, which the
  3×3 always covers (a fragment within ±1 texel of the star on its face has
  its home texel within ±1 of the star's). Measured in the star's face texels,
  not in angle: near the cube corners a texel spans less angle, and an angular
  limit either clips there or shrinks every star everywhere (the first version
  did the latter). \`b3dReach\` is computed by the caller, which knows both.
  */
  falloff *= b3dReach;
  if (falloff < 0.004) return vec3(0.0);
  /*
  TWINKLE — scintillation, which IS the air: turbulence refracting starlight.
  So its amplitude (b3dTwAmp, set per fragment in b3dDecodeStars) scales with
  the GAS and grows toward the horizon, and is zero in vacuum. Each star
  flickers on its own two-frequency pattern, seeded by its exact direction,
  which is stable now that stars no longer drift within their texels.
  */
  if (b3dTwAmp > 0.0) {
    float seed = fract(sin(dot(starDir, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float n = 0.6 * sin(b3dTime * (5.0 + 4.0 * seed) + seed * 40.0)
      + 0.4 * sin(b3dTime * (11.0 + 7.0 * fract(seed * 7.31)) + seed * 91.0);
    brightness *= max(0.0, 1.0 + b3dTwAmp * n);
  }
  return tint * brightness * falloff;
}

/** Where \`dir\` lands on a GIVEN face (not its own), in that face's uv. */
vec2 b3dUvOn(float face, vec3 d) {
  if (face < 0.5) return vec2(-d.z, -d.y) / d.x * 0.5 + 0.5;
  if (face < 1.5) return vec2(d.z, -d.y) / -d.x * 0.5 + 0.5;
  if (face < 2.5) return vec2(d.x, d.z) / d.y * 0.5 + 0.5;
  if (face < 3.5) return vec2(d.x, -d.z) / -d.y * 0.5 + 0.5;
  if (face < 4.5) return vec2(d.x, -d.y) / d.z * 0.5 + 0.5;
  return vec2(-d.x, -d.y) / -d.z * 0.5 + 0.5;
}

/*
A texel's star direction: its face, its texel, and a sub-texel offset. Also
sets b3dReach — the taper for THIS star seen from THIS fragment, from their
separation in the star's own face texels (see b3dPoint).
*/
vec3 b3dStarDir(float face, vec2 texel, vec2 sub, vec3 viewDir) {
  vec2 star = texel + sub;
  vec2 frag = b3dUvOn(face, viewDir) * b3dStarInfo.x;
  vec2 sep = abs(frag - star);
  b3dReach = 1.0 - smoothstep(0.7, 1.0, max(sep.x, sep.y));
  return normalize(b3dFaceDir(face, star / b3dStarInfo.x));
}

/*
PACKED TEXELS: B == 1.0 marks three crude objects in R, G and A, eight bits
each — uu(2) vv(2) bbb(3) c(1). It only ever applies where objects are ALREADY
inside one texel of each other, which is the dense core, where they merge into
a blur and what survives is aggregate brightness rather than any one star.

Without it a real galaxy loses 21% of its stars at 512, because the birthday
estimate assumes an even sky and a galaxy is the opposite of even. With it, 2%.
*/
/*
A deterministic hash in [0,1)² of a texel and a slot — the same answer for
every fragment, so a jittered star stays put.
*/
vec2 b3dHash2(vec2 cell, float face, float slot) {
  vec3 p = vec3(cell + face * 1031.0, slot * 17.0 + face);
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xx + p.yz) * p.zy);
}

vec3 b3dUnpackOne(float bits, float slot, float face, vec2 texel, vec3 viewDir) {
  float v = floor(bits * 255.0 + 0.5);
  if (v <= 0.0) return vec3(0.0);
  float uu = floor(v / 64.0);
  float vv = floor(mod(v, 64.0) / 16.0);
  float bb = floor(mod(v, 16.0) / 2.0);
  float c = mod(v, 2.0);
  float brightness = pow((bb + 1.0) / 8.0, DISPLAY_EXP / ${BRIGHT_GAMMA.toFixed(
    3
  )});
  vec3 tint = c > 0.5 ? STAR_PALETTE[9] : STAR_PALETTE[3];
  /*
  JITTER WITHIN THE QUARTER-TEXEL CELL. A packed star's position is only
  known to a quarter of a texel, and drawing it at the cell's centre puts every
  packed star in the dense core on a 4×4-per-texel LATTICE — which the cube's
  projection bends into curves across the sky (Tonio: "weird curve patterns").
  A deterministic offset inside the cell is error diffusion for position: the
  quantisation stays within its bound, and the lattice is gone.
  */
  vec2 j = b3dHash2(texel, face, slot);
  vec3 starDir = b3dStarDir(
    face, texel, vec2((uu + j.x) / 4.0, (vv + j.y) / 4.0), viewDir
  );
  return b3dPoint(starDir, brightness, tint, 0.5, viewDir);
}

vec3 b3dDecodeOne(vec4 texel, float face, vec2 cell, vec3 viewDir) {
  // B is zero for an empty texel, which is most of them.
  if (texel.b <= 0.0) return vec3(0.0);

  // ...and 255 means packed rather than bright — see above.
  if (texel.b > 0.998) {
    return b3dUnpackOne(texel.r, 0.0, face, cell, viewDir)
      + b3dUnpackOne(texel.g, 1.0, face, cell, viewDir)
      + b3dUnpackOne(texel.a, 2.0, face, cell, viewDir);
  }

  /*
  The A byte's layout — see the note in starfield-codec. Precision goes where
  the eye is: faint stars render warm yellow (their colour was never visible
  information), galaxies carry size, and bright stars carry a 224-step
  spectral value decoded through a continuous ramp.
  */
  float a = texel.a * 255.0;
  /*
  GAIN BEFORE FLOOR — the order is the bug. With the gain on the SUM (the old
  shape), the floor lifted the faint mass to 0.05 and the gain immediately
  crushed it back to 0.02 — the distant stars and the faint sprinkle were
  invisible, and Tonio read it as "zero stars in the empty regions". The
  floor must be the LAST thing the brightness sees.
  */
  float brightness = max(
    pow(texel.b, DISPLAY_EXP / ${BRIGHT_GAMMA.toFixed(3)}) * STAR_GAIN,
    DISPLAY_FLOOR
  );
  // R and G are the sub-texel position in the FACE's own uv — exactly.
  vec3 starDir = b3dStarDir(face, cell, texel.rg, viewDir);
  if (a >= 32.0) {
    return b3dPoint(
      starDir, brightness, b3dSpectral((a - 32.0) / 223.0), 0.5, viewDir
    );
  }
  if (a >= 2.0) {
    // A distant galaxy: size on the 0…29 ramp, tint alternating two warms.
    float size = (a - 2.0) / 29.0;
    vec3 tint = mod(a, 2.0) < 1.0 ? STAR_PALETTE[12] : STAR_PALETTE[13];
    return b3dPoint(
      starDir, brightness, tint, 0.5 + size * b3dStarInfo.w, viewDir
    );
  }
  // FAINT: warm yellow, the one colour a faint star visibly has.
  return b3dPoint(starDir, brightness, STAR_PALETTE[6], 0.5, viewDir);
}

vec3 b3dDecodeStars(vec3 viewDir, float elevation) {
  if (b3dStarDataLevel <= 0.0) return vec3(0.0);
  // Strongest at the horizon (the longest path through air), a third of that
  // above about 30 degrees.
  b3dTwAmp = b3dTwinkle * mix(1.0, 0.35, clamp(elevation * 2.0, 0.0, 1.0));

  /*
  THE 3×3 NEIGHBOURHOOD, walked in TEXEL space — the fragment's own texel and
  its eight neighbours, each fetched at its centre. Perturbing the view
  direction by a texel's angle (the old way) is not the same thing: rotated
  against the face grid, two taps could land in ONE texel (a star drawn twice)
  and, near the corners where texels are smaller, a neighbour could be
  skipped. A neighbour past the face's edge is just a direction past the edge;
  textureCube resolves it, and b3dFaceUv names the texel it actually hit.
  */
  float n = b3dStarInfo.x;
  vec3 home = b3dFaceUv(viewDir);
  vec2 base = floor(home.yz * n);
  vec3 sum = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 centre = (base + vec2(float(i), float(j)) + 0.5) / n;
      vec3 tapDir = normalize(b3dFaceDir(home.x, centre));
      vec3 hit = b3dFaceUv(tapDir);
      sum += b3dDecodeOne(
        textureCube(b3dStarData, tapDir), hit.x, floor(hit.yz * n), viewDir
      );
    }
  }
  return sum * b3dStarDataLevel;
}
`
}

function registerForkedSky(): boolean {
  const store = BABYLON.ShaderStore.ShadersStore as Record<string, string>
  if (store[`${B3D_SKY}PixelShader`] != null) return true

  const src = store.skyPixelShader
  const vert = store.skyVertexShader
  if (src == null || vert == null) return false

  // The last statement of their main(), and the only place we need to be.
  const anchor = 'gl_FragColor=color;'
  if (!src.includes(anchor)) return false

  // The vertex fork passes the LOCAL position through. The whole sky lives
  // in the dome's local frame — the dome's rotation orients everything in
  // it (stars, gradient, sun, moon) as one rigid sky, and the cubemaps are
  // sampled at the plain local direction. No per-star rotation, no matrix
  // conventions, nothing to transpose.
  store[`${B3D_SKY}VertexShader`] = vert
    .replace(
      'varying vec3 vPositionW;',
      'varying vec3 vPositionW;\nvarying vec3 vSkyLocal;'
    )
    .replace(
      'vPositionW=vec3(worldPos);',
      'vPositionW=vec3(worldPos);vSkyLocal=position.xyz;'
    )
  store[`${B3D_SKY}PixelShader`] = src
    .replace(
      '#define CUSTOM_FRAGMENT_DEFINITIONS',
      'varying vec3 vSkyLocal;' +
        'uniform samplerCube b3dStars;uniform float b3dStarLevel;uniform float b3dMoon;uniform vec3 b3dMoonDir;' +
        'uniform vec3 b3dSunDir;uniform float b3dSunDisc;uniform float b3dMoonDisc;uniform vec3 b3dSunDiscColor;' +
        'uniform vec3 b3dVeilColor;uniform float b3dVeil;' +
        'uniform vec4 b3dMoonsA[4];uniform vec4 b3dMoonsB[4];uniform vec3 b3dSunLocal;' +
        MOONS_GLSL +
        'uniform vec3 b3dTintZ;uniform vec3 b3dTintH;uniform float b3dTintAmt;uniform float b3dDustGrey;' +
        starDecodeGlsl(paletteGlsl() + spectralGlsl())
    )
    // The GRADIENT keeps the WORLD direction — its horizon must stay aligned
    // with the planet, not with the stars (the dome's rotation would turn
    // the horizon into a diagonal). Only the backdrop (stars + moon, below)
    // samples the local direction.
    .replace(
      anchor,
      /*
      ADDED, not blended. The backdrop is behind the air: stars contribute
      light and the atmosphere contributes light, which is the model this
      element has been built around all along — and now it is literally one
      shader rather than two meshes arguing about depth.

      `vPositionW - cameraPosition` is the world view direction, which their
      own sky-colour maths already computes a line above.
      */
      // ONE frame, everything in it: the dome's own rotation orients the
      // whole sky, so the backdrop samples the same local direction the sky
      // math above already used. No per-star rotation, no second channel.
      /*
      THE TINT, and it goes FIRST — onto the scattered light only, before any
      backdrop is added. A butterscotch Martian noon is the AIR's colour; the
      stars behind it are not butterscotch, and at night (no scatter left) the
      tint has nothing to act on and vanishes by itself. Zenith to horizon by
      the world view direction, so it stays level with the planet.

      COLOURIZE, not multiply: the sky's own brightness in the tint's hue. A
      multiply was the first version and it cannot work — blue light times
      butterscotch is TEAL, because there is no red in the sky to keep.
      */
      // DUST scatters grey: desaturate the dust's share of the scattered
      // light before the tint colours it.
      `color.rgb=mix(color.rgb,vec3(dot(color.rgb,vec3(0.2126,0.7152,0.0722))),b3dDustGrey);` +
        `{vec3 b3dV=normalize(vPositionW-cameraPosition);` +
        `vec3 b3dT=mix(b3dTintH,b3dTintZ,sqrt(clamp(b3dV.y,0.0,1.0)));` +
        `const vec3 b3dW=vec3(0.2126,0.7152,0.0722);` +
        `vec3 b3dC=dot(color.rgb,b3dW)*b3dT/max(dot(b3dT,b3dW),0.001);` +
        `color.rgb=mix(color.rgb,b3dC,b3dTintAmt);}` +
        `vec3 b3dDir=normalize(vSkyLocal);` +
        // Extra moons (<tosi-b3d-moon>): computed first because a moon is
        // IN FRONT of the stars — its dark side hides them.
        `float b3dOcc;vec3 b3dMoonsC=b3dMoonsAt(b3dDir,b3dOcc);` +
        `vec3 b3dBack=vec3(0.0);` +
        // The RASTER backdrop — a baked cube, still supported.
        `b3dBack+=textureCube(b3dStars,b3dDir).rgb*b3dStarLevel;` +
        /*
        AND THE DECODED ONE, which is the same light arriving by a better road:
        points reconstructed from data rather than sampled from a picture of
        themselves. Both add, so a scene can carry a smooth nebula cube in
        `b3dStars` and its stars in `b3dStarData` — which is the split the
        measurements argued for.
        */
        `b3dBack+=b3dDecodeStars(b3dDir,normalize(vPositionW-cameraPosition).y);` +
        `color.rgb+=b3dBack*(1.0-b3dOcc)+b3dMoonsC;` +
        // The moon, part of the backdrop, on the night arc — a CONSTANT in the
        // dome's frame (tilt⁻¹·up, see updateSky), so it rides with the stars.
        `{float md=max(0.0,dot(normalize(b3dDir),b3dMoonDir));` +
        `color.rgb+=vec3(0.72,0.8,0.95)*b3dMoon*exp(-(1.0-md)*(1.0-md)*1200.0);` +
        /*
        HARD DISCS for the sun and moon, which is what they are without air
        (Tonio: "The bright disk should be left, just no glow"). With air, the
        sky model's own scattering draws both, glow and all, and that is right;
        it is ALSO all it draws, so in vacuum both vanished while our soft
        moon glow survived — exactly backwards. These fade IN as the air goes
        (b3dSunDisc / b3dMoonDisc), while the glow above fades OUT with it.
        About half a degree across, like the real ones, with a one-texel-ish
        antialiased edge.
        */
        `float b3dMd=smoothstep(0.999965,0.99998,md);` +
        // As bright as the moon WITH air (which the sky model saturates to
        // white) — losing the atmosphere must not dim it (Tonio).
        `color.rgb+=vec3(1.6,1.6,1.65)*b3dMoonDisc*b3dMd;}` +
        `{float sd=dot(normalize(vPositionW-cameraPosition),b3dSunDir);` +
        `color.rgb+=b3dSunDiscColor*b3dSunDisc*smoothstep(0.999965,0.99998,sd);}` +
        /*
        THE MEDIUM VEIL, and it MIXES where the stars ADD — because it is not
        light arriving, it is light being blocked. Inside cloud there is white a
        metre from your face and no sky behind it; adding would only make a
        brighter blue.

        It is the last thing in the shader for the same reason: a medium sits in
        front of the whole sky, stars included, so anything added after it would
        be shining through the fog rather than being hidden by it.
        */
        `color.rgb=mix(color.rgb,b3dVeilColor,b3dVeil);` +
        anchor
    )
  return true
}

/**
 * A `ShaderMaterial` on the forked sky shader, wearing `SkyMaterial`'s property
 * names.
 *
 * The accessors are the point. `updateSky` writes `material.luminance`,
 * `material.rayleigh` and so on, and it should not have to care which of the two
 * materials it is holding — so these forward to `setFloat`/`setVector3` and the
 * rest of this element stays written once.
 */
/*
COSMETIC MOONS (`<tosi-b3d-moon>`), up to four. `b3dMoonsA[i]` is the moon's
direction in the dome's frame plus sin(angular radius) (0 = no moon);
`b3dMoonsB[i]` is its colour and brightness. The PHASE is not an input: each
pixel of the disc is a point on a sphere, its normal is reconstructed from the
disc coordinates, and it is lit where that normal faces the sun. A moon near
the sun is a crescent; one opposite it is full. The dark side keeps a trace of
light (planetshine), which reads as a body rather than a hole, and hides the
stars behind it (the returned coverage).
*/
const MOONS_GLSL =
  'vec3 b3dMoonsAt(vec3 d,out float occ){vec3 c=vec3(0.0);occ=0.0;' +
  'for(int i=0;i<4;i++){vec4 a=b3dMoonsA[i];if(a.w<=0.0)continue;' +
  'if(dot(d,a.xyz)<=0.0)continue;' +
  'vec3 t1=normalize(cross(abs(a.y)<0.99?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0),a.xyz));' +
  'vec3 t2=cross(a.xyz,t1);' +
  'vec2 p=vec2(dot(d,t1),dot(d,t2))/a.w;float r=length(p);if(r>=1.0)continue;' +
  // ~one pixel of antialiasing whatever the size
  'float aa=clamp(0.0007/a.w,0.01,0.4);float cov=1.0-smoothstep(1.0-aa,1.0,r);' +
  'vec3 n=p.x*t1+p.y*t2-sqrt(max(0.0,1.0-r*r))*a.xyz;' +
  'float lit=smoothstep(-0.04,0.08,dot(n,b3dSunLocal));' +
  'vec4 b=b3dMoonsB[i];' +
  'c=mix(c,b.rgb*(b.w*lit+0.025),cov);occ=max(occ,cov);}' +
  'return c;}'

function makeForkedSkyMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  const mat = new BABYLON.ShaderMaterial(
    'b3d-skybox',
    scene,
    { vertex: B3D_SKY, fragment: B3D_SKY },
    {
      attributes: ['position'],
      uniforms: [
        'world',
        'viewProjection',
        'view',
        'luminance',
        'turbidity',
        'rayleigh',
        'mieCoefficient',
        'mieDirectionalG',
        'sunPosition',
        'cameraPosition',
        'cameraOffset',
        'up',
        'b3dStarLevel',
        'b3dStarDataLevel',
        'b3dStarInfo',
        'b3dStarGain',
        'b3dStarFloor',
        'b3dTwinkle',
        'b3dTime',
        'b3dVeil',
        'b3dVeilColor',
        'b3dMoonDir',
        'b3dMoon',
        'b3dSunDir',
        'b3dSunDisc',
        'b3dMoonDisc',
        'b3dSunDiscColor',
        'b3dTintZ',
        'b3dTintH',
        'b3dTintAmt',
        'b3dDustGrey',
        'b3dMoonsA',
        'b3dMoonsB',
        'b3dSunLocal',
      ],
      samplers: ['b3dStars', 'b3dStarData'],
      // DITHER is `#if`, not `#ifdef`, so it must exist or the shader will not
      // compile at all.
      defines: ['#define DITHER 0'],
    }
  )
  mat.setVector3('up', new BABYLON.Vector3(0, 1, 0))
  mat.setVector3('cameraOffset', BABYLON.Vector3.Zero())
  mat.setFloat('b3dStarLevel', 0)
  mat.setFloat('b3dStarDataLevel', 0)
  mat.setVector4('b3dStarInfo', new BABYLON.Vector4(512, 0.003, 1, 3))
  mat.setFloat('b3dStarGain', 0.9)
  mat.setFloat('b3dStarFloor', 0.4)
  mat.setFloat('b3dTwinkle', 0)
  mat.setFloat('b3dTime', 0)
  mat.setFloat('b3dVeil', 0)
  mat.setVector3('b3dTintZ', new BABYLON.Vector3(1, 1, 1))
  mat.setVector3('b3dTintH', new BABYLON.Vector3(1, 1, 1))
  mat.setFloat('b3dTintAmt', 0)
  mat.setFloat('b3dDustGrey', 0)
  mat.setColor3('b3dVeilColor', new BABYLON.Color3(1, 1, 1))
  mat.setVector3('b3dMoonDir', new BABYLON.Vector3(0, 1, 0))
  mat.setVector3('b3dSunDir', new BABYLON.Vector3(0, 1, 0))
  mat.setFloat('b3dSunDisc', 0)
  mat.setFloat('b3dMoonDisc', 0)
  mat.setArray4('b3dMoonsA', new Array(16).fill(0))
  mat.setArray4('b3dMoonsB', new Array(16).fill(0))
  mat.setVector3('b3dSunLocal', new BABYLON.Vector3(0, 1, 0))
  mat.setColor3('b3dSunDiscColor', new BABYLON.Color3(3, 2.9, 2.7))
  const num = (name: string, initial: number) => {
    let v = initial
    mat.setFloat(name, v)
    Object.defineProperty(mat, name, {
      get: () => v,
      set: (n: number) => {
        v = n
        mat.setFloat(name, n)
      },
    })
  }
  num('luminance', 1)
  num('turbidity', 10)
  num('rayleigh', 2)
  num('mieCoefficient', 0.005)
  num('mieDirectionalG', 0.8)
  let sun = new BABYLON.Vector3(0, 100, 0)
  // Seed the uniform, not just the JS side: a scene with no <tosi-b3d-sun>
  // never writes it, and an unset vec3 is not a defined sky.
  mat.setVector3('sunPosition', sun)
  Object.defineProperty(mat, 'sunPosition', {
    get: () => sun,
    set: (v: BABYLON.Vector3) => {
      sun = v
      mat.setVector3('sunPosition', v)
    },
  })
  // Accepted and ignored: ours is always positioned by `sunPosition`, and
  // `azimuth` is SkyMaterial's other way of saying the same thing.
  Object.defineProperty(mat, 'useSunPosition', {
    get: () => true,
    set: () => {},
  })
  Object.defineProperty(mat, 'azimuth', { get: () => 0, set: () => {} })
  return mat
}

const SKY_AXIS_X = new BABYLON.Vector3(1, 0, 0)
const SKY_AXIS_Z = new BABYLON.Vector3(0, 0, 1)
const SKY_BLUE = new BABYLON.Color3(0.55, 0.7, 0.9)
const HORIZON_WHITE = new BABYLON.Color3(0.95, 0.95, 0.97)
const NIGHT_HORIZON = new BABYLON.Color3(0.08, 0.1, 0.18)

export class B3dSkybox extends AbstractMesh {
  /** Whether the sky is on OUR shader — the starfield and the veil need it. */
  private _forkedSky = false
  // Reused, not re-allocated: this is written every frame.
  private _veilColor = new BABYLON.Color3(1, 1, 1)

  static preferredTagName = 'tosi-b3d-skybox'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    turbidity: 10,
    /*
    LEAVING THE ATMOSPHERE — the altitudes over which the sky fades to space.
    Metres, and OFF unless `spaceFull > spaceStart`, so no existing scene wakes
    up with a black sky.

    There is no realistic default to pick, and pretending otherwise would be
    worse than declining: the Kármán line is 100 km, which no demo ever climbs,
    so a "correct" default would simply mean the feature never fires. The right
    numbers are dramatic ones chosen per scene — a rocket demo that tops out at
    3 km wants the whole fade inside 3 km.

    The pair mirrors `band(value, startAt, full)` in atmosphere.ts on purpose:
    these ARE its two arguments, so there is nothing to translate.
    */
    spaceStart: 0,
    spaceFull: 0,
    /*
    HOW MUCH AIR THIS WORLD HAS — 1 is Earth, 0 is the Moon (tosijs-3d#89).

    A property of the WORLD, where the space band is a property of ALTITUDE, so
    the two multiply: the air you have is `atmosphere × (1 − band)`. At 0 the
    sky is black at noon, the stars are out, the haze is gone and the sun is a
    hard disc — the vacuum model this element already has, reached without
    climbing. In between is a thin, dark-blue sky.
    */
    atmosphere: 1,
    /*
    DUST, 0…1 — suspended particles: bright, coloured Mie haze, never blue.
    Independent of the gas, so a world can have almost no air and a bright
    sky (Mars), or neither (the Moon). The sky is present wherever either is.
    */
    dust: 0,
    /*
    THE SKY'S COLOUR, directly: the scattered light's own brightness in these
    hues, zenith to horizon, by `tintStrength` (0 = Earth, untouched). For a
    butterscotch Mars or a green alien sky, which the scattering dials cannot
    reach by hand. Stars and moon are behind the air and are not tinted.
    */
    zenithTint: '#ffffff',
    horizonTint: '#ffffff',
    tintStrength: 0,
    /*
    A STARFIELD BEHIND THE DOME — a count, 0 = none.

    Not the real galaxy: this is the "we just want a nice night sky" case, which
    is most of them. Seeded, so it is the same sky every load, and built ONCE —
    stars do not move relative to each other, and the dome is already pinned to
    the camera, so there is nothing to update per frame.
    */
    /**
     * A BAKED cube map behind the sky — the root path of six files named
     * `<root>_px.png` … `<root>_nz.png` (see [skybox-baker](?skybox-baker.ts)).
     *
     * When set it replaces the procedural `starfield` entirely, because it is
     * the same job done properly: real star positions photographed from a real
     * system, with structure no scattering of points will reproduce.
     */
    starfieldCube: '',
    /**
     * Root path of a DATA cube (`<root>_px.png` …) encoded by
     * [starfield-codec](?starfield-codec.ts).
     *
     * Not a picture of a starfield — a table of stars, decoded in the shader
     * into points that stay sharp at any field of view. Costs a 512 cube where
     * the rastered equivalent wanted 2048, and does not blur when you zoom.
     *
     * Composes with `starfieldCube` rather than replacing it: put the smooth
     * half (nebulae, band glow) in a small raster and the point-like half here,
     * which is the split the measurements argued for.
     */
    starfieldData: '',
    /**
     * Texels per face of `starfieldData`. Must match what encoded it.
     *
     * 1024 is the size to ship. At 512 a crowded texel's quarter-texel packed
     * position becomes a visible lattice through the dense band once a texel
     * spans several screen pixels — see `PACKED_CAPACITY`.
     */
    starfieldDataSize: 1024,
    /**
     * How sharp a decoded point is — higher is tighter.
     *
     * Tuned by looking, three times: 2.2 draws stars about a pixel across,
     * which read as points — but a bright star's gaussian tail stays visible
     * well past the core, so on a real screen they still read as soft blobs.
     * 3 tucks the tail in. At 1 the sky reads soft-focus.
     */
    starfieldSharpness: 3,
    /**
     * How bright the decoded stars are — the intensity cap on the whole point
     * sky. The brightest few stay the brightest things in it without blowing
     * the band out white.
     */
    starfieldGain: 0.9,
    /**
     * The FAINT mass's brightness — the floor every decoded star is lifted to.
     * Most stars sit on it, and the warm colour lives in them; `starfieldGain`
     * only moves the bright few above it.
     */
    starfieldFloor: 0.4,
    /**
     * TWINKLE — scintillation strength, 0 for none. Scaled by the GAS (so it
     * is zero on an airless world and fades as you climb out) and strongest
     * at the horizon, where the path through the air is longest.
     */
    starfieldTwinkle: 0.35,
    /** How much bigger a full-size object (a distant galaxy) is than a star. */
    starfieldSizeScale: 3,
    /**
     * Roll/pitch/yaw applied to `starfieldCube`, in DEGREES, as `'rx,ry,rz'`.
     *
     * This is where a galactic tilt belongs. Rotating the GALAXY to get one
     * moves it out from under the bake camera; rotating the cube costs nothing,
     * is changeable after the fact, and can differ per system from one baked
     * texture.
     */
    starfieldTilt: '0,0,0',
    starfield: 0,
    /**
     * Soft emission clouds behind the stars — a count, `0` = none. They are
     * what stops a starfield reading as pepper on black.
     */
    nebulae: 0,
    /** Nebula brightness 0…1. */
    nebulaBrightness: 1,
    /*
    SMALL, AND THEREFORE MANY.

    Tonio: "The nebulae will only look good if there's a LOT of them and they're
    individually quite small." Proven in the galaxy, which has always been built
    that way — 750 stamps at a few percent of its radius — and reads as gas,
    where fourteen stamps at 16% of the sky radius read as what they are: huge
    discs with a visible straight quad edge.

    The reason is that ONE stamp is never a nebula. Structure comes from many
    dim overlapping ones ACCUMULATING under additive blending, so each has to be
    small enough to be a brushstroke rather than the whole painting.
    */
    nebulaSize: 0.045,
    /**
     * Image stamped for each nebula — black-backed, since it is composited
     * ADDITIVELY and the black is what makes the silhouette. Empty falls back
     * to a procedural falloff, which is a poor substitute: this repo ships
     * `/nebula.png`, and a consumer should point this at their own.
     */
    nebulaTexture: '',
    /*
    THE BACK OF THE SKY — what is behind the stars when the air is gone.

    Tonio's own statement of the architecture: "In the back is black (or
    interstellar background radiation), stars are additive dots. The atmosphere
    is additive light scattering." So the backdrop needs an owner, and it is
    this element rather than whatever `clearColor` a scene happened to set: the
    sky fading out was revealing the default grey and reading as the sky getting
    LIGHTER in space, which is precisely backwards.

    Default is JUST north of black on purpose — "allow us to make a black hole
    actual black in the middle". Something truly black in frame has nothing left
    to be darker than, so the sky keeps a floor and the void keeps somewhere to
    go.
    */
    spaceColor: '#05070f',
    /** Seed for `starfield`. Same seed, same constellations. */
    starfieldSeed: 12345,
    /**
     * Where a `<tosi-b3d-star>` child gets parked along the sun vector. `0`
     * leaves it wherever the author put it. Apparent size is `radius /
     * starDistance`, and that is deliberately the author's arithmetic rather
     * than ours — see the note in updateSky.
     */
    starDistance: 0,
    luminance: 1,
    // IGNORED (tosijs-3d#86). Our sky material defines `azimuth` as a no-op —
    // the sun is placed by latitude and time — so this is accepted for old
    // markup and does nothing. Not offered in skyboxSchema().
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
  private _sizeToCamera: (() => void) | null = null
  // Last timeOfDay the sky material was rendered for. The per-frame observer
  // re-runs updateSky when this drifts — see the note on _sizeToCamera.
  private _lastSkyTime = NaN
  /*
  DID THE SUN BRANCH ACTUALLY RUN?

  `updateSky` pushes direction, colour and intensity into a sun element's
  LIGHT only when that light exists, and the sun is a separate element that
  appears on its own schedule. (The DOME no longer waits on it — since 0.8.3
  the gradient, scattering and sun disc follow the clock with or without a
  sun — so what a missed first pass costs now is an unlit scene under a
  correct sky, not a dark sky.)

  `realtimeScale: 10` hides this, because the clock drifts every tick and the
  time gate reopens until some pass catches the sun. Set `realtimeScale: 0` for
  a reproducible scene — which an authored file wants, since it should render
  the light it declares — and roughly four loads in five come up dark
  (tosijs-3d-ensemble, #55).

  So the retry is gated on the OUTCOME rather than on the clock. `render()`
  already re-runs `updateSky` when this element's own attributes change, so
  a later sun is the only input it could not see.
  */
  private _sunApplied = false
  /*
  Bounded, because a skybox with no sun at all is a legitimate scene and must
  not re-run this every frame forever. ~5s at 60fps is far longer than any
  element takes to connect, and costs nothing once satisfied.
  */
  private _sunWaitFrames = 0
  private sunEl: B3dSun | null = null
  private _horizonColor = new BABYLON.Color3(0.75, 0.85, 0.95)
  // Reused scratch + a parsed-color cache so updateSky allocates nothing per frame.
  private _sunVec = new BABYLON.Vector3()
  private _dir = new BABYLON.Vector3()
  private _qLat = new BABYLON.Quaternion()
  private _qTime = new BABYLON.Quaternion()
  private _qTotal = new BABYLON.Quaternion()
  private _horizonScratch = new BABYLON.Color3()
  /** The sun's (or moon's) colour this hour — the light takes it when there is one. */
  private _lightColor = new BABYLON.Color3(1, 1, 1)
  private _duskScratch = new BABYLON.Color3()
  private _colorCache = new Map<string, BABYLON.Color3>()

  /** Approximate horizon color based on current time of day / atmosphere. */
  get horizonColor(): BABYLON.Color3 {
    return this._horizonColor
  }

  // Parse a hex color once and cache it (source strings are stable attributes), so
  // updateSky doesn't reparse/allocate a Color3 per frame. Returned colors are
  // treated as read-only (used as Lerp sources / copied from).
  private hex(hex: string): BABYLON.Color3 {
    let c = this._colorCache.get(hex)
    if (c == null) {
      c = hexToColor3(hex)
      this._colorCache.set(hex, c)
    }
    return c
  }

  /** 0 in the troposphere, 1 in vacuum. See `spaceStart`/`spaceFull`. */
  private _vacuum = 0
  private _glowExcluded = false

  /*
  KEEP THE STARFIELD OUT OF THE GLOW LAYER.

  The stars are emissive, which is what makes them stars — and an emissive mesh
  is exactly what a `GlowLayer` is looking for. Two and a half thousand of them
  bloom into each other and the whole frame goes WHITE: not a dim wash, a total
  blowout that reads as a broken sky rather than as bloom. It cost a real
  diagnosis on the ascent demo, where the sky and the fog both measured
  correctly (a pixel probe read 10,12,8 — nearly black) while the screenshot was
  pure white, because the blowout happens in a post-process after everything the
  scene can tell you about.

  `glowLayerIntensity` is a documented `<tosi-b3d>` attribute, so any adopter who
  turns it on would meet this. Bloom belongs to bright things IN the world — a
  muzzle flash, a corona, a lamp — never to the backdrop, which is by definition
  the dimmest thing on screen.

  Deferred because ordering is not guaranteed: B3d may build its glow layer
  before or after this element's `sceneReady`, so this retries until it finds
  one rather than assuming it is already there.
  */
  /**
   * NEBULAE — off by default, and honestly a dead end in this form.
   *
   * ⚠️ A STAMPED SPRITE CANNOT BE A NEBULA. The texture is a round blob, so
   * every stamp is a circle; squashing and rolling it varies the outline but
   * not the fact of it. Tonio, after several passes of tuning: "This isn't from
   * overlaps. Each nebular is a single squashed circle and looks wrong."
   *
   * And the two requirements fight. Structure only reads when a stamp is LARGE,
   * while a field only reads when the stamps are small and many — at which
   * point each one is a few pixels across, mips average the turbulence flat,
   * and you are back to a smooth disc. There is no count/size that satisfies
   * both, which is why tuning kept producing a different wrong answer.
   *
   * `b3d-galaxy` does not have this problem because its nebulae are not
   * sprites: the fragment shader runs fbm per particle with a per-particle seed
   * and distorts the falloff with it, so no two are the same shape. That is the
   * approach to port if this is ever worth doing here — or, better, skip it
   * entirely and BAKE THE GALAXY, which is the agreed direction and gets real
   * structure plus real stars in one step.
   *
   * Kept, off, and cheap: a no-dependency fallback for a scene with no galaxy.
   */
  /**
   * (Implementation note) What stops a starfield reading as pepper on black.
   *
   * Quads, not points, because a nebula is an EXTENT. They need no billboarding
   * despite always facing you: the camera sits at the centre of this sphere and
   * only ever rotates, so a quad built facing the centre faces the viewer
   * forever. Per-frame billboarding would buy precisely nothing — the same
   * reason the stars are points and the same reason none of this backdrop is
   * rebuilt after the first frame.
   *
   * Additive and soft-edged, like everything else in the sky: emission cannot
   * darken what is behind it, and two overlapping nebulae should pool rather
   * than occlude.
   */
  private _buildNebulae(
    scene: BABYLON.Scene,
    prng: PRNG,
    radius: number
  ): void {
    const attrs = this as any
    const count = Math.floor(attrs.nebulae) || 0
    if (count <= 0 || this._starfieldMesh == null) return

    /*
    A PAINTED NEBULA BEATS A GRADIENT, and it is not close.

    The procedural version was a radial falloff, which is a DISC — smooth,
    symmetric, and reading as a lens flare rather than as gas. Real structure
    (turbulent, uneven, dark lanes cutting through bright knots) is not
    something a two-stop gradient can fake, and this repo ships a 1024² one.

    It needs NO opacity map, which is the neat part: the image is black-backed,
    and under additive blending black adds exactly nothing. The silhouette comes
    free from the pixels rather than from a second sampler.
    */
    const src = (attrs.nebulaTexture as string) || ''
    const tex: BABYLON.BaseTexture = src
      ? new BABYLON.Texture(src, scene)
      : proceduralNebula(scene)

    const size = radius * 2 * (attrs.nebulaSize as number)
    for (let i = 0; i < count; i++) {
      const z = prng.realRange(-1, 1)
      const t = prng.realRange(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - z * z))
      const quad = BABYLON.MeshBuilder.CreatePlane(
        `skybox-nebula-${i}_nocast`,
        { size: size * prng.realRange(0.6, 1.6) },
        scene
      )
      quad.position.set(
        radius * r * Math.cos(t),
        radius * z,
        radius * r * Math.sin(t)
      )
      /*
      FACE THE VIEWER WITH THE VISIBLE SIDE, so ONE face draws.

      `lookAt(Zero())` aims local +Z at the centre — and a Babylon plane's
      visible face is local −Z (the same fact that mirrored the death dialog;
      see dialog-placement), so this was showing the quad's BACK to the camera
      and only rendered at all because culling was off. Aim +Z outward instead
      and the front face is the one you see.
      */
      quad.lookAt(quad.position.scale(2))
      quad.rotate(
        BABYLON.Axis.Z,
        prng.realRange(0, Math.PI * 2),
        BABYLON.Space.LOCAL
      )
      /*
      SQUASHED, NOT SCALED. One image stamped fourteen times is obvious the
      moment two of them are the same shape, so each gets its own roll AND its
      own non-proportional stretch — the same pixels read as a different cloud.
      */
      quad.scaling.set(prng.realRange(0.6, 1.5), prng.realRange(0.6, 1.5), 1)
      const mat = new BABYLON.StandardMaterial(`skybox-nebula-${i}`, scene)
      mat.disableLighting = true
      /*
      BLACK DIFFUSE, OR THE NEBULA IS WHITE WHATEVER COLOUR YOU GIVE IT.

      `disableLighting` does not mean "emissive only" — it makes StandardMaterial
      use `diffuseColor` DIRECTLY as an unlit base, and that defaults to white.
      So every nebula rendered as a white cloud with a faint tint on top, no
      matter what `emissiveColor` said. Tonio: "How are the nebulae coming out
      white?"

      The stars dodge it by accident: they carry vertex colours, which multiply
      that white base and end up the colour of the star. The nebulae have no
      vertex colours, so the base came through untouched.
      */
      mat.diffuseColor = new BABYLON.Color3(0, 0, 0)
      mat.specularColor = new BABYLON.Color3(0, 0, 0)
      mat.emissiveTexture = tex as BABYLON.Texture
      mat.alphaMode = BABYLON.Constants.ALPHA_ADD
      mat.disableDepthWrite = true
      /*
      ⚠️ CULL THE BACK FACE — ADDITIVE BLENDING DOUBLES WHATEVER DRAWS TWICE.

      This was `false`, which is harmless for an opaque mesh and is NOT harmless
      here: with no culling and no depth write, both faces of every quad render,
      and each one ADDS. So the framebuffer got `colour + colour + background`
      where the model says `textureValue · colour + background` — a 2× overdose
      that saturated the middle of every stamp to white and left only the thin
      edges under 1.0, keeping their hue. Tonio, who spotted the arithmetic from
      the look alone: "it seems more like nebula color + color + background".

      Worth stating as the general rule, because it is invisible on anything
      opaque: under additive blending, DOUBLE-SIDED MEANS DOUBLE-BRIGHT.

      ⚠️ STILL UNEXPLAINED, and left here for whoever picks this up: Tonio's
      last reading was that the output is the nebula's COLOUR rather than the
      texture's VALUE times that colour — "There should be no white unless a
      green nebular overlaps an orange one". Babylon's StandardMaterial does
      document `emissiveColor *= emissiveTexture`, which is value × colour, so
      either something upstream is not setting the EMISSIVE define or the
      observation has another cause. I could not account for it, and three of my
      explanations in this area were already wrong, so it is recorded as open
      rather than resolved. If this is ever revived, put the image in the
      DIFFUSE slot with `disableLighting` — `diffuseColor × texture` has no
      ambiguity to argue about.
      */
      mat.backFaceCulling = true
      /*
      DIM AND SATURATED, which is the note the galaxy's own nebulae get right
      and this first pass got exactly backwards: these were near-white, and a
      desaturated nebula is just fog. Hydrogen reds through reflection blues,
      with one channel pushed and the others held down so the hue survives being
      added onto black.
      */
      /*
      DARK COLOURS, BECAUSE THE TEXTURE IS THE BRIGHT PART.

      The emissive here is a TINT that the image's own value multiplies, not a
      brightness — and the previous values (up to 0.94 in a channel) meant the
      texture's bright core came out well past 1.0 and clipped to white, while
      its faint outer field still read strongly enough to show the quad's edge.
      Tonio: "colored squares with blown out blurry white circles in the middle.
      You should multiply the value by the nebular color and it should be a
      darkish color (value 40 say)."

      So the peak channel is ~0.16 — value 40 of 255. The image's dark lanes
      then land near zero and genuinely vanish, and its bright knots land at a
      colour rather than at white.
      */
      /*
      MANY STAMPS MEANS EACH ONE HAS TO BE FAINTER THAN YOU THINK.

      The tint is what the image's VALUE multiplies, so it sets the peak of a
      stamp rather than its brightness curve. 0.12 with one draw per quad lands
      where 0.16 was aiming before back-face culling was fixed — the old value
      was arriving twice.
      */
      const warm = prng.value()
      const V = 0.12
      mat.emissiveColor = new BABYLON.Color3(
        V * (0.35 + 0.65 * warm),
        V * (0.2 + 0.3 * (1 - Math.abs(warm - 0.5) * 2)),
        V * (0.4 + 0.6 * (1 - warm))
      )
      this._nebulaBase.push(mat.emissiveColor.clone())
      quad.material = mat
      quad.isPickable = false
      quad.applyFog = false
      quad.parent = this._starfieldMesh
      this._nebulaMeshes.push(quad)
      this._nebulaMats.push(mat)
    }
  }

  private _excludeFromGlow(scene: BABYLON.Scene): void {
    const mesh = this._starfieldMesh
    if (mesh == null || this._glowExcluded) return
    for (const layer of scene.effectLayers ?? []) {
      const add = (layer as any).addExcludedMesh
      if (typeof add === 'function') {
        add.call(layer, mesh)
        this._glowExcluded = true
      }
    }
  }
  private _starfieldMesh: BABYLON.Mesh | null = null
  private _clearBase: BABYLON.Color4 | null = null
  private _starCube: BABYLON.CubeTexture | null = null
  private _starData: BABYLON.CubeTexture | null = null
  /*
  The author's tilt, and the per-frame rotation it composes with. Cached so the
  per-frame path in updateSky allocates nothing — see the scratch note there.
  */
  private _starTilt: BABYLON.Matrix | null = null
  /** The tilt as a quaternion — the dome's rotation is composed from it. */
  private _tiltQuat: BABYLON.Quaternion | null = null
  private _domeQuat = new BABYLON.Quaternion()
  /** Where the moon sits in the dome's frame — see updateSky. */
  private _moonLocal: BABYLON.Vector3 | null = null
  private _nebulaMeshes: BABYLON.Mesh[] = []
  private _nebulaMats: BABYLON.StandardMaterial[] = []
  private _nebulaBase: BABYLON.Color3[] = []
  private starEl: AbstractMesh | null = null

  /**
   * Every attribute `_buildStarfield` reads. Changing one on a LIVE sky
   * rebuilds the starfield (see `render`) — they were construction-time only,
   * so a document applied to an existing sky got no stars and no error
   * (tosijs-3d#88). `skyboxSize` is not here: it sizes the dome itself.
   */
  private static STARFIELD_KEYS = [
    'starfield',
    'starfieldCube',
    'starfieldData',
    'starfieldDataSize',
    'starfieldSeed',
    'starfieldTilt',
    'nebulae',
    'nebulaSize',
    'nebulaTexture',
  ]
  private _builtStarfieldKey = ''
  private _starfieldKey(): string {
    return B3dSkybox.STARFIELD_KEYS.map((k) => String((this as any)[k])).join(
      '|'
    )
  }

  /** Texels per face of the loaded data cube — `_applyStarLook` needs it. */
  private _starTexels = 0

  /*
  THE STARS' LOOK — size, brightness, faint floor, galaxy size — as UNIFORMS,
  applied live from render(). Not in STARFIELD_KEYS on purpose: those rebuild
  the starfield, which reloads twelve PNGs, and a slider drag would do that on
  every tick.
  */
  private _applyStarLook(): void {
    if (this._starData == null || this._starTexels <= 0) return
    const mat = this.mesh?.material as unknown as BABYLON.ShaderMaterial
    if (mat?.setVector4 == null) return
    const attrs = this as any
    const n = this._starTexels
    mat.setVector4(
      'b3dStarInfo',
      new BABYLON.Vector4(
        n,
        Math.PI / 2 / n,
        Number(attrs.starfieldSharpness) || 1,
        Number(attrs.starfieldSizeScale) || 3
      )
    )
    mat.setFloat('b3dStarGain', Number(attrs.starfieldGain) || 0)
    mat.setFloat('b3dStarFloor', Number(attrs.starfieldFloor) || 0)
  }

  /** Everything `_buildStarfield` makes, released — including the tilt cache. */
  private _disposeStarfield(): void {
    const mat = this.mesh?.material as unknown as
      | BABYLON.ShaderMaterial
      | undefined
    // The shader samples whatever is bound while its level is non-zero, so a
    // disposed cube must be switched off, not merely released.
    mat?.setFloat?.('b3dStarLevel', 0)
    mat?.setFloat?.('b3dStarDataLevel', 0)
    this._starCube?.dispose()
    this._starCube = null
    this._starData?.dispose()
    this._starData = null
    for (const q of this._nebulaMeshes) q.dispose()
    this._nebulaMeshes = []
    for (const nm of this._nebulaMats) nm.dispose()
    this._nebulaMats = []
    this._nebulaBase = []
    this._starfieldMesh?.dispose()
    this._starfieldMesh = null
    this._starTilt = null
    this._tiltQuat = null
    this._moonLocal = null
    this._glowExcluded = false
  }

  /**
   * The background starfield — built ONCE, then never touched.
   *
   * Points, not billboards: a star is a point source and there is nothing to
   * face. `b3d-galaxy` re-billboards its whole particle system every frame,
   * which is right for a galaxy you orbit and would be pure waste for a sky
   * that cannot change. Parented to the dome so it inherits the per-frame
   * camera pinning and rescaling for free.
   *
   * Colour follows the spectral sequence (cool red → hot blue) with most stars
   * dim, because a sky of uniformly bright white dots reads as static. The
   * brightness curve is `u^3`, which is not physics but does put a handful of
   * bright stars among many faint ones, which is what the eye is looking for.
   */
  private _buildStarfield(scene: BABYLON.Scene): void {
    const attrs = this as any
    const count = Math.floor(attrs.starfield) || 0
    this._builtStarfieldKey = this._starfieldKey()
    this._disposeStarfield()
    if (this.mesh == null) return
    // The data cube stands on its own — it ADDS to the raster one rather than
    // needing it — so it must not be gated on `starfieldCube` too. It was,
    // and a sky given only `starfieldData` drew no stars and said nothing.
    if (count <= 0 && !attrs.starfieldCube && !attrs.starfieldData) return

    /*
    A BAKED CUBE WINS, and it is one mesh instead of thousands of points.

    Same treatment as the point starfield: pinned to the camera, depth-written
    like ordinary far geometry, and faded by the same EXPOSURE term so it
    vanishes into a daylit sky. The difference is only where the pixels come
    from.
    */
    /*
    THE BAKED CUBE IS A UNIFORM ON THE SKY, not a mesh behind it.

    Two meshes could never work: dome and cube are both `infiniteDistance`,
    which pins them to the far plane where depth precision is gone, so the tie
    was decided per pixel and the frame split along a hard diagonal. Scaling the
    cube outside the dome AND inside it both produced it — scale does not change
    the depth of an infinite-distance mesh. Tonio: "the skybox with two cubes
    NEVER worked. It's z-chasing at the corners."

    One mesh has no tie to break. It also means the cloud whiteout, which fades
    the dome by immersion, now fades the stars with it — the other bug reported
    in the same breath.
    */
    const cubeRoot = (attrs.starfieldCube as string) || ''
    const mat0 = this.mesh.material as unknown as BABYLON.ShaderMaterial
    /*
    THE AUTHOR'S TILT — parsed once, applied per frame.

    The tilt orients the STARFIELD — the dome's rotation carries it, inside
    the diurnal turn (see updateSky). It never reaches the sun: noon is
    latitude and time. Two forms of the same rotation: a quaternion for the
    dome, and a matrix to place the moon in the dome's frame.
    */
    if (this._starTilt == null) {
      const t = String(attrs.starfieldTilt ?? '0,0,0')
        .split(',')
        .map((n) => (parseFloat(n) || 0) * DEG_TO_RAD)
      this._starTilt = BABYLON.Matrix.RotationYawPitchRoll(
        t[1] ?? 0,
        t[0] ?? 0,
        t[2] ?? 0
      )
      this._tiltQuat = BABYLON.Quaternion.RotationYawPitchRoll(
        t[1] ?? 0,
        t[0] ?? 0,
        t[2] ?? 0
      )
      // tilt⁻¹ · (0,1,0): the inverse of a rotation is its transpose.
      this._moonLocal = BABYLON.Vector3.TransformNormal(
        new BABYLON.Vector3(0, 1, 0),
        this._starTilt.clone().transpose()
      )
    }
    /*
    THE DATA CUBE, loaded alongside the raster one rather than instead of it.
    They ADD in the shader, so a scene can carry its nebulae as a small smooth
    picture and its stars as a table — which is what the measurements argued
    for, and why this is not an either/or attribute.
    */
    const dataRoot = String(attrs.starfieldData ?? '')
    if (dataRoot && typeof mat0?.setTexture === 'function') {
      /*
      NO MIPMAPS — passed explicitly, because Babylon's default is to build
      them, and the note below claimed they were off while they were on. A mip
      of this cube is an average of packed fields: data that was never encoded.
      It went unnoticed while the decoder's lookup directions were continuous
      (the GPU chose level 0); the moment taps snapped to texel centres the
      coordinate jumped at every texel edge, the LOD spiked there, and stars
      came back as clusters of dots read from coarser levels.
      */
      const data = new BABYLON.CubeTexture(
        dataRoot,
        scene,
        ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png'],
        true
      )
      data.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
      /*
      NEAREST, and this is not a quality setting — it is correctness. The texels
      are packed fields, so interpolating two of them produces a third star that
      does not exist, at a position and brightness nobody encoded. Mipmaps are
      off for the same reason.
      */
      data.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE)
      /*
      The alpha bytes are DATA (a palette index), not opacity — which is why
      these files must never pass through a premultiplying layer. They do not
      here: Babylon 9's upload path never sets UNPACK_PREMULTIPLY_ALPHA_WEBGL,
      so the straight-alpha bytes arrive intact. The two lossy layers this
      encoding has actually met — canvas production, and Chrome's strict PNG
      decoder rejecting `CompressionStream` deflate — both live and died in
      `png.ts`.
      */
      mat0.setTexture('b3dStarData', data)
      this._starData = data
      const n = Math.max(8, Number(attrs.starfieldDataSize) || 512)
      /*
      RADIANS PER TEXEL. A face spans 90°, so a texel is (PI/2)/n across at the
      face centre — and rather more at the corners, where the cube stretches.
      The 3x3 read covers that slack: a star up to a texel and a half away still
      reaches the fragment, which is cheaper than being exact about a number
      whose error is smaller than the dot it draws.
      */
      this._starTexels = n
      this._applyStarLook()
    }

    if (cubeRoot) {
      const mat = this.mesh.material as unknown as BABYLON.ShaderMaterial
      if (typeof mat?.setTexture !== 'function') return
      // Extensions spelled out: CubeTexture defaults to .jpg, silently.
      const cube = new BABYLON.CubeTexture(cubeRoot, scene, [
        '_px.png',
        '_py.png',
        '_pz.png',
        '_nx.png',
        '_ny.png',
        '_nz.png',
      ])
      cube.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
      mat.setTexture('b3dStars', cube)
      this._starCube = cube
      return
    }

    const prng = new PRNG(attrs.starfieldSeed || 1)
    const positions: number[] = []
    const colors: number[] = []
    /*
    IN THE DOME'S OWN UNITS, which are NOT unit-box units.

    `CreateBox({size: skyboxSize})` spans ±skyboxSize/2 in local space, so a
    radius of 0.45 put the whole sky 4.5 m from the camera — stars in front of
    the scenery, scattered over the ground and the props. It looked like a depth
    bug and was a units bug, which is the expensive kind: the first fix attempted
    was depth-write, and depth was never involved.

    0.45 of the box's SIZE puts them just inside its half-extent (0.5), so they
    ride the same per-frame rescale and stay behind everything the camera can
    see.
    */
    const R = ((attrs.skyboxSize as number) || 1000) * 0.45
    for (let i = 0; i < count; i++) {
      // Uniform on the sphere: z uniform, NOT latitude uniform — the naive
      // version bunches stars at the poles, and a sky with two bald patches is
      // the one starfield bug everyone ships once.
      const z = prng.realRange(-1, 1)
      const t = prng.realRange(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - z * z))
      positions.push(R * r * Math.cos(t), R * z, R * r * Math.sin(t))
      /*
      MAGNITUDES ARE LOGARITHMIC. THE FIRST VERSION WAS NOT.

      Brightness was `u³` on a uniform draw, which is a skew but a LINEAR one —
      and its top end sits at 1.0, so the brightest stars were pure white
      maximum-value dots added onto near-black. Tonio: "what look like insanely
      bright stars… we might need to log-scale them." (Not the glow layer, as it
      turned out: `glowLayerIntensity` defaults to 0 and this demo sets none.
      They were simply that bright.)

      Real star brightness runs on magnitudes, where each step of 1 is a factor
      of ~2.512 in flux, so a naked-eye sky spans roughly 100:1 between its
      brightest and faintest — mostly faint, with a handful that carry the
      constellations. `flux = 10^(-0.4·m)` is that relation exactly, and drawing
      `m` with a skew toward the faint end gives the count distribution too:
      many dim stars, few bright ones, none of them blinding.

      Capped below 1 as well, because a star at full channel value is not a
      bright star, it is a clipped one — and with nothing brighter left on the
      scale, everything above the cap reads as the same white dot.
      */
      const m = Math.pow(prng.value(), 0.55) * 5
      const flux = Math.pow(10, -0.4 * m) * 0.85
      // Warm dim dwarfs through to rare hot blue-white giants.
      const warm = prng.value()
      const rr = 0.55 + 0.45 * warm
      const gg = 0.6 + 0.4 * (1 - Math.abs(warm - 0.5) * 2)
      const bb = 0.6 + 0.4 * (1 - warm)
      colors.push(rr * flux, gg * flux, bb * flux, 1)
    }
    const mesh = new BABYLON.Mesh('skybox-starfield_nocast', scene)
    const vd = new BABYLON.VertexData()
    vd.positions = positions
    vd.colors = colors
    vd.applyToMesh(mesh)
    const mat = new BABYLON.StandardMaterial('starfield', scene)
    mat.disableLighting = true
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1)
    mat.pointsCloud = true
    mat.pointSize = 2
    /*
    STARS ADD. THEY DO NOT PAINT.

    This is the whole fix, and the bug it replaces is worth keeping because it
    looked like three other things first. Opaque points meant a DIM star drew a
    near-black dot — so the night sky was speckled with dark specks and the blue
    day sky was speckled with them too. Tonio, who spotted it: "The blue of the
    sky should wash out dark stars. Right now the dim stars show as dark dots."

    I read those dots as stars punching through the foreground and went hunting
    for a depth-order bug — tried depth-write, the double `infiniteDistance`
    pin, a glow layer, and background/foreground rendering groups. None of them
    were it, because none of it was about depth. A star is a LIGHT SOURCE: it
    adds to whatever is behind it and can never darken it. Additive blending
    says exactly that, and then everything else falls out for free — a dim star
    adds almost nothing, so a bright sky washes it out and a black one does not,
    with no day/night branch anywhere.

    Depth is still TESTED, just not written, so the ground in front still
    occludes them. Background-ness is a consequence of being at the dome's
    radius, not something that needs its own rendering group.
    */
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
    mat.needAlphaBlending = () => true
    mesh.material = mat
    mesh.isPickable = false
    mesh.applyFog = false
    mesh.infiniteDistance = true
    /*
    A SIBLING OF THE DOME, NOT ITS CHILD.

    Parenting was tidier — the starfield inherited the camera pin and the
    per-frame rescale for nothing. It also made the stars hostage to the dome:
    `setEnabled(false)` on a parent disables its children, so the dome could
    never be switched off without taking the sky with it.

    And it has to be switchable, because `SkyMaterial` does not reach black.
    Even with rayleigh, turbidity and luminance at zero it keeps a floor colour,
    so at full vacuum the sky stayed faintly lit — Tonio: "the sky never
    completely fades away." Scattering going to zero is the right model and the
    shader simply does not honour the limit, so at the limit the dome stops
    drawing instead.
    */
    mesh.scaling.setAll(1)
    this._starfieldMesh = mesh
    this._buildNebulae(scene, prng, R)
    this._excludeFromGlow(scene)

    /*
    THE DOME IS LEFT ALONE, deliberately.

    The first attempt moved it onto the transparent path so it could composite
    over the stars, which is the right picture — scattering adds over whatever
    comes from beyond the air — but it is the wrong PLACE to implement it. Make
    the stars additive instead and the same result arrives with the core element
    untouched: the dome paints the sky, the stars add to it, and a dim one
    vanishes into a bright sky on its own.

    Which also means the vacuum fade needs no special case. `_vacuum` already
    drives rayleigh/turbidity/luminance to zero, so at altitude the dome paints
    black and the stars are simply all that is left — day, night and space out
    of one term, with nothing switched.
    */
  }
  private _removeFogLayer: (() => void) | null = null

  /**
   * How far out of the atmosphere the VIEWER is — the camera, not the skybox,
   * which is pinned to the camera anyway. Read live rather than cached because
   * the thing that moves is someone else's mesh.
   */
  /**
   * Collect the `<tosi-b3d-moon>` children into the shader's arrays. The sun
   * direction is the REAL sun: by night `sunVector` is the day arc replayed
   * (it is where the moonlight comes from), so the real sun is its antipode.
   */
  private _applyMoons(
    sm: BABYLON.ShaderMaterial,
    isDay: boolean,
    sunVector: BABYLON.Vector3,
    daylight: number
  ) {
    if (sm.setArray4 == null) return
    const a = new Array(16).fill(0)
    const b = new Array(16).fill(0)
    const moons = Array.from(this.querySelectorAll('tosi-b3d-moon')).slice(
      0,
      4
    ) as unknown as B3dMoon[]
    // The day moon is real but pale: the sky's own light washes it out.
    // Not the 1.6 of the built-in disc — a coloured moon must stay below
    // clipping or every colour reads as white.
    const exposure = 0.85 * (1 - 0.75 * daylight)
    moons.forEach((m, i) => {
      const d = m.direction()
      const radius = (Math.max(0, m.size) / 2) * DEG_TO_RAD
      a.splice(i * 4, 4, d.x, d.y, d.z, Math.sin(Math.min(radius, 1.5)))
      let c: BABYLON.Color3
      try {
        c = BABYLON.Color3.FromHexString(
          String(m.color || '#dddddd').slice(0, 7)
        )
      } catch {
        c = new BABYLON.Color3(0.87, 0.87, 0.87)
      }
      b.splice(i * 4, 4, c.r, c.g, c.b, Math.max(0, m.brightness) * exposure)
    })
    sm.setArray4('b3dMoonsA', a)
    sm.setArray4('b3dMoonsB', b)
    const sun = sunVector.clone().normalize()
    if (!isDay) sun.scaleInPlace(-1)
    const inv = BABYLON.Quaternion.Inverse(this._domeQuat)
    sm.setVector3?.('b3dSunLocal', sun.applyRotationQuaternion(inv))
  }

  /** A `<tosi-b3d-moon>` changed (or came or went): redraw the moons. */
  moonsChanged() {
    this.updateSky()
  }

  private _vacuumNow(): number {
    const attrs = this as any
    const full = attrs.spaceFull as number
    const start = attrs.spaceStart as number
    /*
    The world's own air, then the band multiplies it (see `atmosphere`).

    STEEP, nearly binary (Tonio: "air seems like it should be kind of binary,
    certainly 0.95 air shouldn't suddenly make clouds disappear"). Vacuum is
    (1 − air)⁴: 0.95 is Earth for every practical purpose, 0.5 still nearly
    so, and only the last stretch toward 0 thins and darkens the sky. Linear,
    0.95 air was 5% vacuum, and the space fog layer's pull toward
    kilometre-scale fog distances pushed a 1–4 km haze out past 50 km, taking
    the haze that hides the cloud deck's rim with it.
    */
    const air = Math.min(1, Math.max(0, Number(attrs.atmosphere ?? 1)))
    const world = 1 - Math.pow(1 - air, 4)
    let climbed = 0
    const cam = this.owner?.scene?.activeCamera
    if (full > start && cam != null)
      climbed = band(cam.globalPosition.y, start, full)
    /*
    GAS AND DUST, which scatter differently (Tonio: "Mars should have almost
    no air"). Gas (`atmosphere`) is Rayleigh scattering, the blue; dust
    (`dust`) is Mie haze, bright and coloured but never blue. Mars has under 1%
    of Earth's air and a bright butterscotch sky, and one number could not say
    both. The SKY is present wherever either one is, so vacuum is what remains
    when both are gone; `_gas` is kept apart for the Rayleigh term alone.
    */
    const gas = world * (1 - climbed)
    const dust =
      Math.min(1, Math.max(0, Number(attrs.dust ?? 0))) * (1 - climbed)
    this._gasNow = gas
    return 1 - (1 - (1 - gas) * (1 - dust))
  }

  /** Gas alone (Rayleigh) — see `_vacuumNow`. Set alongside it. */
  private _gasNow = 1
  private _gas = 1

  /**
   * Hide the sky behind whatever medium you are standing in.
   *
   * The colour is the scene's own composited fog, so the sky and the air in
   * front of it are the same white by construction — there is no second place
   * to tune and nothing to keep in step. See `B3d.fogVeil` for why this is a
   * different number from the fog's own weight.
   */
  private _applyVeil(): void {
    if (!this._forkedSky || this.owner == null || this.mesh == null) return
    const sm = this.mesh.material as unknown as BABYLON.ShaderMaterial
    if (sm?.setFloat == null) return
    const fc = this.owner.scene.fogColor
    sm.setFloat('b3dVeil', this.owner.fogVeil)
    this._veilColor.set(fc.r, fc.g, fc.b)
    sm.setColor3('b3dVeilColor', this._veilColor)
    // TWINKLE runs every frame: its clock, and its strength — which is the
    // GAS (vacuum and dust do not twinkle stars; turbulent air does).
    const attrs = this as any
    sm.setFloat('b3dTime', performance.now() * 0.001)
    sm.setFloat(
      'b3dTwinkle',
      Math.max(0, Number(attrs.starfieldTwinkle) || 0) * this._gas
    )
  }

  private updateSky() {
    if (this.mesh?.material == null) return
    const attrs = this as any
    const material = this.mesh.material as SkyMaterial
    const latitude = attrs.latitude * DEG_TO_RAD
    const sunVector = this._sunVec.set(0, 100, 0)
    // Time rotation: noon=0, wraps through day
    const t = (((attrs.timeOfDay + 30) % 12) / 12) * 1.04 - 0.52
    const timeAngle = t * Math.PI
    // Latitude tilts the sun's arc away from vertical; time rotates it east-west.
    /*
    NEGATIVE, because north is +Z (headings are atan2(x, z) everywhere) and
    east is +X. Rotating +Y about +X by a POSITIVE angle leans it toward +Z,
    which put the noon sun in the NORTH at latitude 40 — a southern-hemisphere
    sky. Tonio: "it seems like the sun/moon path has flipped". With the sign
    right the sun rises east (+X), crosses the SOUTH at noon, sets west, and a
    negative latitude gives the southern sky honestly.
    */
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_X, -latitude, this._qLat)
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_Z, timeAngle, this._qTime)
    this._qLat.multiplyToRef(this._qTime, this._qTotal)
    const isDay = attrs.timeOfDay > 6 && attrs.timeOfDay < 18
    // The day curve, hoisted: it used to be computed only inside the sun
    // branch, but the backdrop's exposure needs it whether or not a
    // <tosi-b3d-sun> happens to be in the scene.
    const dayBrightness = isDay
      ? Math.min(Math.abs((t + 0.52) * 10), Math.abs((t - 0.52) * 10), 1)
      : 0
    sunVector.rotateByQuaternionToRef(this._qTotal, sunVector)
    /*
    THE TILT IS NOT THE SUN'S. `starfieldTilt` orients the galaxy behind the
    atmosphere — it says where the band lies among the stars, not where noon
    is. Tonio: "Starfield tilt should not affect noon. It only changes the
    base starfield behind the atmosphere." The sun's arc is latitude and time,
    nothing else.

    This used to tilt the sun too, AFTER the diurnal turn — so with the demos'
    12,25,58 the noon sun sat ~15° up. The reason was sound and still holds:
    the moon is the sun's antipode, so it must be a FIXED point of the
    starfield. That only needs the stars and the sun to turn TOGETHER, which
    they do if the tilt is applied in the CELESTIAL frame, before the diurnal
    turn (`dir' = qTotal · (tilt · dir)`, see the dome below). Then everything
    wheels as one, and the tilt never reaches the sun.
    */

    /*
    VACUUM IS NOT A SKY COLOUR — IT IS THE ABSENCE OF SCATTERING.

    The sky is blue because air scatters; take the air away and it goes black
    on its own, with the sun still a hard bright disc because the mie term is
    forward-scattering off the sun itself. So the fade to space drives the three
    uniforms that MEAN atmosphere — `rayleigh`, `turbidity`, `luminance` —
    toward zero, and `SkyMaterial` renders the result. No second sky, no shader,
    nothing to cross-fade: the same material does daylight and vacuum because
    they are the same equation with different air.

    `_air` is 1 in the troposphere and 0 in vacuum, so every scattering term
    below is simply multiplied by it.
    */
    const air = 1 - this._vacuum
    /*
    FADE THE DOME OUT. DO NOT DIM ITS LUMINANCE.

    `luminance` is not a brightness scale in `SkyMaterial` — it sits in the
    Preetham tonemap as a divisor, so driving it toward zero does not darken the
    sky, it BLOWS IT OUT. Tonio: "The sky suddenly goes WHITE in space." Suddenly
    is the tell: it was a threshold, and just below it luminance was small enough
    to saturate every channel.

    So luminance is left exactly where the author put it. `rayleigh` and
    `turbidity` still scale with the remaining air — those genuinely mean
    scattering, and the night path has always used them that way — and the dome
    itself fades on ALPHA.

    Which is the architecture arrived at several passes ago rather than a patch:
    the dome is an OVERLAY on the starfield, so "no atmosphere" is the overlay
    at zero opacity, revealing what was always behind it. It is also smooth,
    where the threshold it replaces could only ever pop.
    */
    /*
    TWO WAYS TO FADE, because the dome is now carrying the stars.

    The stock path hides the dome and fades it on ALPHA — `SkyMaterial` cannot
    reach black on its own, so switching it off is the only way to finish the
    job.

    ⚠️ That is exactly wrong once the starfield lives IN the sky's shader:
    disabling the mesh takes the stars with it, which is why vacuum came back
    pure black on the first run of this. With a cube bound the dome stays
    enabled and opaque, and the ATMOSPHERE alone is what falls away.
    */
    const hasCube = this._starCube != null
    if (!hasCube) {
      this.mesh.setEnabled(air > 0.004)
      material.alpha = air
    }

    /*
    AND IT FALLS AWAY FASTER THAN LINEARLY. Tonio: "As the sky fades it also
    needs to get much darker faster."

    Linear `air` spends most of the climb still visibly blue, because scattering
    is what you SEE and it does not thin in proportion to altitude — the
    atmosphere is exponential, and the visible sky is gone long before the last
    of the air is. Cubing it puts the transition where the eye expects: bright
    at sea level, most of it lost across the first half of the band, essentially
    space by two-thirds.
    */
    const airSky = air * air * air
    /*
    HOW MUCH OF THE SKY IS DUST rather than gas — the share whose scattered
    light is grey, not blue. The tint then colours it (butterscotch Mars).
    */
    const presence = 1 - this._vacuum
    const dustGrey =
      presence > 0.001 ? Math.max(0, Math.min(1, 1 - this._gas / presence)) : 0
    if (this._forkedSky)
      (material as unknown as BABYLON.ShaderMaterial).setFloat?.(
        'b3dDustGrey',
        dustGrey
      )

    /*
    AND THE SKY OWNS WHAT IS BEHIND IT.

    Fading the dome revealed the scene's clear colour, which is a mid grey by
    default — so climbing out of the atmosphere made the sky get BRIGHTER, which
    is the exact opposite of the thing being modelled. The backdrop is part of
    the sky, so the sky sets it: the scene's own colour at sea level, lerped to
    `spaceColor` as the air goes.

    The base is captured ONCE rather than read each frame, because this writes
    the value it would otherwise be reading — and `b3d-clouds` borrows the same
    property during a whiteout, so a re-read would eventually latch white.
    */
    const sceneNow = this.owner?.scene
    if (sceneNow == null) return
    if (this._clearBase == null) {
      this._clearBase = sceneNow.clearColor.clone()
    }
    const sc = this.hex(attrs.spaceColor)
    const v = this._vacuum
    sceneNow.clearColor.set(
      this._clearBase.r + (sc.r - this._clearBase.r) * v,
      this._clearBase.g + (sc.g - this._clearBase.g) * v,
      this._clearBase.b + (sc.b - this._clearBase.b) * v,
      1
    )
    material.needAlphaBlending = () => air < 0.999
    material.luminance = attrs.luminance
    if (this._forkedSky) {
      const sm = material as unknown as BABYLON.ShaderMaterial
      const z = this.hex(attrs.zenithTint || '#ffffff')
      const h = this.hex(attrs.horizonTint || '#ffffff')
      sm.setVector3?.('b3dTintZ', new BABYLON.Vector3(z.r, z.g, z.b))
      sm.setVector3?.('b3dTintH', new BABYLON.Vector3(h.r, h.g, h.b))
      const k = Math.min(1, Math.max(0, Number(attrs.tintStrength) || 0))
      sm.setFloat?.('b3dTintAmt', k)
    }

    /*
    EXPOSURE FADES THE BACKDROP. SCATTER IS NOT THE MECHANISM.

    The first version of this dimmed the stars with the scattering term, on the
    theory that daylight ADDS enough to swamp them. Tonio: "Really the big thing
    is that exposure adjusts at daytime and the entire backdrop is basically
    being faded out. The scatter is actually not the issue." That is the better
    model and it is the true one — you cannot see stars at noon because your
    pupil has stopped down, not because the sky has been added to them. The
    whole backdrop goes, together, and it goes because of EXPOSURE.

    Which matters here because we are quietly simulating a dynamic range far
    wider than the framebuffer holds. Tonio again: "The moon is the color of
    coal." It is — an albedo around 0.12 — and it reads as brilliant white at
    night purely because the eye is wide open. Nothing in an 8-bit buffer
    behaves that way on its own, so the exposure has to be applied by hand.

    `dayBrightness` is the element's OWN day curve, the same number that drives
    the sun's intensity, so the sky and its exposure cannot drift apart. `air`
    is in there because vacuum has no bright sky to stop down FOR:

      night, sea level  → 0            → backdrop full
      noon,  sea level  → 1 · 1        → faded out
      noon,  in VACUUM  → 1 · 0        → stars AND the sun, together

    The last row is the one that says this is a model rather than a tuning: it
    is what an astronaut sees, and nothing special-cased it.
    */
    /*
    THE BAKED CUBE'S EXPOSURE IS A UNIFORM on the same material that draws the
    sky — so there is exactly one thing to dim, and it dims in step with the
    atmosphere it sits behind.
    */
    /*
    THE BACKDROP DIES BY GAMMA, not linearly. A linear fade left the whole
    galaxy visible at dawn — dayBrightness 0.43 at 6:30 meant 57% stars.
    Tonio: "the starmap should be more gammaed towards black when there's
    any hint of sun in the sky." d^0.25 kills the stars by the first hint
    of daylight while keeping the fade smooth.
    */
    if (this._starCube != null) {
      const sm = material as unknown as BABYLON.ShaderMaterial
      sm.setFloat?.('b3dStarLevel', 1 - Math.pow(dayBrightness * air, 0.25))
    }
    /*
    THE DECODED STARS DIM ON THE SAME CURVE, because they are the same sky.
    Daylight hides stars by EXPOSURE, not by removing them — the eye stops down
    — so one number drives the raster backdrop and the decoded points together
    and they cannot disagree about what time it is.
    */
    if (this._starData != null) {
      const sm = material as unknown as BABYLON.ShaderMaterial
      sm.setFloat?.('b3dStarDataLevel', 1 - Math.pow(dayBrightness * air, 0.25))
    }
    /*
    THE DOME ORIENTS THE WHOLE SKY. Tonio: "The sky itself is little more
    than a gradient with a glowing sun and moon stuck on top of them. It's
    just math. The cubemap of the starfield is the complicated bit that you
    want to avoid messing with." Exactly — so the dome's rotation (the
    diurnal turn, with the tilt inside it) carries the BACKDROP in its local
    frame: the cubemaps (sampled at the plain local direction) and the moon.
    The gradient and the sun disc read the world sun, which is the same
    diurnal turn without the tilt — so the backdrop and the sun still wheel as
    one, and the stars cannot drift against the moon.
    */
    if (this.mesh != null && this._tiltQuat != null) {
      // `a.multiply(b)` applies b FIRST (measured) — so this is the tilt in
      // the celestial frame, then the diurnal turn.
      this._qTotal.multiplyToRef(this._tiltQuat, this._domeQuat)
      this.mesh.rotationQuaternion = this._domeQuat
      /*
      THE MOON RIDES THE NIGHT ARC. The clock wraps every twelve hours, so at
      night the "sun" vector is the day arc replayed — 23:00 sits where 11:00
      did, which is (about) the real sun's antipode: where a full moon is. It
      is also the direction the night branch lights the scene FROM, so the
      disc drawn there and the moonlight falling from there agree.

      In the dome's frame that vector is tilt⁻¹·up — a constant, so the moon
      never moves against the stars. (Drawing it at the vector's own antipode,
      as this did briefly, put it below the horizon all night once the tilt
      stopped reaching the sun.)
      */
      if (this._moonLocal != null) {
        ;(material as unknown as BABYLON.ShaderMaterial).setVector3?.(
          'b3dMoonDir',
          this._moonLocal
        )
      }
      // NIGHT ONLY: by day that same vector IS the sun, and a moon fading in
      // on the setting sun is the one place it must not be.
      const sm = material as unknown as BABYLON.ShaderMaterial
      // The soft glow is the AIR's (it fades with it); the disc is the body's
      // own, and shows as the air goes — see the shader note.
      sm.setFloat?.(
        'b3dMoon',
        isDay
          ? 0
          : attrs.moonIntensity *
              (1 - Math.pow(dayBrightness * air, 0.25)) *
              air
      )
      const bare = 1 - air
      sm.setFloat?.('b3dMoonDisc', isDay ? 0 : bare)
      sm.setFloat?.('b3dSunDisc', isDay ? bare : 0)
      sm.setVector3?.('b3dSunDir', sunVector.clone().normalize())
      this._applyMoons(sm, isDay, sunVector, dayBrightness * air)
    }
    if (this._starfieldMesh != null) {
      if (!this._glowExcluded && this.owner?.scene != null) {
        this._excludeFromGlow(this.owner.scene)
      }
      const exposed = 1 - dayBrightness * air
      const m = this._starfieldMesh.material as BABYLON.StandardMaterial
      /*
      TWO KINDS OF BACKDROP, TWO DIFFERENT KNOBS, ONE exposure.

      A point cloud is emissive, so its brightness IS `emissiveColor`. A baked
      cube gets its colour from a reflection sample, which emissive can only add
      to — so its knob is the texture's `level`. Driving the wrong one paints
      the sky white rather than dimming it.
      */
      /*
      TWO KINDS OF BACKDROP, TWO KNOBS. A point cloud is emissive, so its
      brightness IS `emissiveColor`. A baked cube gets its colour from a
      reflection sample, which emissive can only ADD to — driving the wrong one
      paints the sky white rather than dimming it.
      */
      if (m.reflectionTexture != null) {
        m.reflectionTexture.level = exposed
      } else {
        m.emissiveColor.set(exposed, exposed, exposed)
      }
      this._starfieldMesh.setEnabled(exposed > 0.01)
      // Nebulae are backdrop too, so the same exposure governs them — they must
      // not survive a daylight sky the stars have already vanished from.
      /*
      EXPOSURE DRIVES THE EMISSIVE, NOT THE ALPHA.

      `alpha` does not gate an ADDITIVE emissive material — the emission is
      added regardless — so setting it left fourteen enormous nebulae glowing at
      full strength in broad daylight. Tonio: "something is rendering as ultra
      big and glowy." Scaling the colour is what actually dims an emitter, which
      is the same thing the stars already do a few lines up.
      */
      const nb = (attrs.nebulaBrightness as number) * exposed
      for (let i = 0; i < this._nebulaMats.length; i++) {
        const base = this._nebulaBase[i]
        this._nebulaMats[i].emissiveColor.set(
          base.r * nb,
          base.g * nb,
          base.b * nb
        )
      }
    }
    material.azimuth = attrs.azimuth
    material.mieDirectionalG = attrs.mieDirectionalG
    material.mieCoefficient = attrs.mieCoefficient

    /*
    PARK A `<tosi-b3d-star>` CHILD ON THE SUN VECTOR.

    The skybox already owns this relationship for light — `b3d-sun`'s own docs
    say its direction is "overridden by skybox when present" — so the visible
    body rides the same channel rather than inventing a second one. Tonio:
    "Don't we have a star object already?" We do, with a corona; nothing placed
    it.

    Apparent size stays the AUTHOR's arithmetic (`radius / starDistance`)
    rather than being derived from an angular diameter here. Deriving it would
    be friendlier for one case — a sun-like 0.53° disc — and would quietly make
    `radius` a lie for every other, which is the worse trade for a star you can
    also fly to.
    */
    if (this.owner != null && attrs.starDistance > 0) {
      if (this.starEl == null) {
        this.starEl = this.owner.querySelector(
          'tosi-b3d-star'
        ) as unknown as AbstractMesh | null
      }
      const star = this.starEl
      const cam = this.owner.scene?.activeCamera
      if (star != null && cam != null) {
        const d = attrs.starDistance / Math.max(1e-6, sunVector.length())
        // The star sits along the sun vector FROM THE CAMERA, so like the dome
        // it never recedes — it is a body at effective infinity, not scenery
        // you can outrun.
        star.x = cam.globalPosition.x + sunVector.x * d
        star.y = cam.globalPosition.y + sunVector.y * d
        star.z = cam.globalPosition.z + sunVector.z * d
      }
    }

    /*
    THE DOME FOLLOWS THE CLOCK, SUN OR NO SUN.

    These writes used to sit inside the sun-element branch below, so a skybox
    with no `<tosi-b3d-sun>` kept `SkyMaterial`'s stock DAYLIGHT whatever the
    hour — while the backdrop's exposure, computed from `timeOfDay` above,
    correctly said night. The result was a night-strength starfield showing
    through a sunlit blue sky (the beacon demo at 21:00, nineteen demos
    carry a skybox without a sun). The gradient, the scattering and the sun
    disc are the SKY's business; only the LIGHT needs a light.

    The GRADIENT lives in the world frame (its horizon is the planet's), so it
    sees the WORLD sun — whose elevation drives the day/night colours and the
    sun disc. The backdrop (stars, moon) samples the dome-local direction.
    */
    material.sunPosition = sunVector
    const intensity = dayBrightness
    const lightColor = this._lightColor
    if (isDay) {
      // THE GOLDEN HOUR — two stops. The bulk of the ramp blends the amber
      // dusk colour toward the sun; the last stretch before the horizon
      // crossing pushes through a pink-red, then back to amber as the sun
      // clears it. This colour feeds everything lit by the sun — the deck's
      // fringe reads the scene light's colour, and the fog (syncSkybox)
      // tracks the horizon colour derived from it — so the cloudtops, the fog
      // and the light itself all turn together.
      BABYLON.Color3.LerpToRef(
        this.hex(attrs.duskColor),
        this.hex(attrs.sunColor),
        intensity,
        lightColor
      )
      const sunset =
        Math.min(1, intensity / 0.35) * Math.max(0, 1 - intensity / 0.12)
      BABYLON.Color3.LerpToRef(
        lightColor,
        this.hex(attrs.duskColor).scaleToRef(0.65, this._duskScratch),
        sunset * 0.55,
        lightColor
      )
      /*
      The scattered LIGHT comes from whatever is up there — gas or dust — so
      Rayleigh keeps the full sky (`airSky`); the model has no other source of
      daylight, and a Mars with gas-only Rayleigh rendered BLACK. What dust
      changes is the COLOUR: it scatters grey, not blue — see b3dDustGrey.
      */
      material.rayleigh = attrs.rayleigh * airSky
      material.turbidity = attrs.turbidity * airSky
      material.mieCoefficient = attrs.mieCoefficient

      // Horizon: blend light color with sky blue, then brighten toward white
      // at high sun — written in place into _horizonColor via a scratch.
      BABYLON.Color3.LerpToRef(lightColor, SKY_BLUE, 0.6, this._horizonScratch)
      BABYLON.Color3.LerpToRef(
        this._horizonScratch,
        HORIZON_WHITE,
        intensity * 0.4,
        this._horizonColor
      )
    } else {
      lightColor.copyFrom(this.hex(attrs.moonColor))
      material.rayleigh = attrs.rayleigh * 0.05 * airSky
      material.turbidity = attrs.turbidity * 0.05 * airSky
      // The sun's disc must SET — the local sun is fixed, so night kills the
      // mie term that draws it.
      material.mieCoefficient = attrs.mieCoefficient * 0.05

      // Night horizon: dark desaturated blue
      this._horizonColor.copyFrom(NIGHT_HORIZON)
    }

    if (this.owner != null) {
      if (this.sunEl == null) {
        this.sunEl = this.owner.querySelector(
          'tosi-b3d-sun'
        ) as unknown as B3dSun | null
      }
      const sunEl = this.sunEl
      // Record whether the sun-dependent writes below actually happen — the
      // frame gate retries on this, not on the clock. See `_sunApplied`.
      this._sunApplied = sunEl?.light != null
      if (sunEl?.light != null) {
        const { light } = sunEl
        // The skybox owns the day/night intensity cycle; tell the sun to stop
        // writing light.intensity itself (it would stomp this on its slower 1s
        // tick and cause a periodic flicker). We multiply by the sun's
        // underwater dimFactor so the two stay in agreement.
        sunEl.externallyLit = true
        const dim = sunEl.dimFactor ?? 1
        sunVector.normalizeToRef(this._dir)
        light.direction.x = -this._dir.x
        light.direction.y = -this._dir.y
        light.direction.z = -this._dir.z
        light.diffuse.copyFrom(lightColor)
        light.intensity = (isDay ? intensity : attrs.moonIntensity) * dim
      }
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    /*
    ADVANCE BY MEASURED TIME, not by the interval we asked for.

    This added `realtimeScale * updateFrequencyMs` per tick — i.e. it assumed
    every tick arrived exactly `updateFrequencyMs` apart. Browsers throttle
    timers in a BACKGROUNDED tab to a second or more, so the tick still added its
    100 ms of sky while ~1000 ms of real time passed: the sky quietly ran an
    order of magnitude slow, and only looked wrong when you came back to the tab
    and compared it with what the scene was doing.

    Silent, and it never self-corrects — nothing anywhere measures the drift, so
    it accumulates for as long as the tab is hidden.

    The elapsed time is CLAMPED because the alternative is a teleporting sun: a
    tab hidden for an hour would otherwise apply an hour of sky in a single
    frame. Clamping means a long absence resumes smoothly rather than jumping,
    at the cost of the clock lagging real time — which is the right trade for a
    day/night cycle that is scenery, not a simulation.
    */
    const MAX_STEP_MS = 250
    let lastTick = Date.now()
    this.interval = window.setInterval(() => {
      const now = Date.now()
      const elapsed = Math.min(MAX_STEP_MS, Math.max(0, now - lastTick))
      lastTick = now
      attrs.timeOfDay =
        (((attrs.timeOfDay + attrs.realtimeScale * elapsed * 1e-6) / 24) % 1) *
        24
    }, attrs.updateFrequencyMs)

    /*
    OUR FORKED SKY when there is a baked cube to composite, stock `SkyMaterial`
    otherwise.

    Deliberately not "always ours" yet. Every existing scene is on the proven
    path and stays there; the fork is exercised by the one case that needs it
    and can become the default once it has earned that.
    */
    const wantsCube = !!((this as any).starfieldCube as string)
    /*
    OURS BY DEFAULT NOW. The fork used to be reserved for `starfieldCube`, on
    the principle that every existing scene should stay on the proven path until
    it had earned more — and it has: a second thing needs it.

    Being INSIDE a medium has to hide the sky, and there is no way to do that
    from outside the sky shader. Babylon's own fog is the wrong lever (it would
    make distance haze erase the sky, which is backwards — the sky IS the
    distance), a second infiniteDistance mesh z-fights by construction, and a
    near-plane veil covers the geometry too. One uniform in the shader that
    already draws the sky is the only place the answer fits.

    The fallback is unchanged and still the right one: if Babylon rewrites their
    shader past recognition we get stock SkyMaterial, losing the starfield and
    the veil rather than the sky.
    */
    const forked = registerForkedSky()
    const material = forked
      ? (makeForkedSkyMaterial(scene) as unknown as SkyMaterial)
      : new SkyMaterial('skybox', scene)
    this._forkedSky = forked
    if (!forked) {
      console.warn(
        "b3d-skybox: could not derive a sky shader from Babylon — `starfieldCube` and the medium veil are unavailable. Babylon's sky shader may have changed shape; see registerForkedSky."
      )
    }
    void wantsCube
    material.backFaceCulling = false
    material.useSunPosition = true

    this.mesh = BABYLON.MeshBuilder.CreateBox(
      'skybox_nocast',
      {
        size: attrs.skyboxSize,
        sideOrientation: BABYLON.Mesh.BACKSIDE,
      },
      scene
    )
    this.mesh.material = material
    this.mesh.applyFog = (this as any).applyFog
    // infiniteDistance pins the dome to the camera (translation ignored), so you
    // can fly forever without leaving it. Then scale it each frame to just inside
    // the active camera's far plane, so ALL in-view geometry (streamed terrain,
    // etc.) sits inside the dome and it renders behind everything by normal depth
    // — no fixed size to outgrow. Base box is `skyboxSize` across (half that).
    this.mesh.infiniteDistance = true
    const baseHalf = ((this as any).skyboxSize || 1000) * 0.5
    this._sizeToCamera = () => {
      const cam = scene.activeCamera
      if (cam == null || this.mesh == null) return
      // Keep even the box CORNERS (at half·√3) well inside the far plane, or they
      // clip and punch holes in the sky. 0.5·maxZ → corner ≈ 0.87·maxZ, safe.
      const targetHalf = cam.maxZ * 0.5
      this.mesh.scaling.setAll(targetHalf / baseHalf)
      // Refresh the sky material HERE (a scene onBeforeRender observer, which fires
      // in flat AND XR) rather than only from tosijs's rAF-batched render(). In an
      // immersive session window.rAF is suspended, and this component's continuous
      // realtimeScale setInterval keeps re-queuing render() so its per-element flag
      // stays stranded — freezing the sky (the "time-of-day slider does nothing in
      // XR until you exit" bug). Driving updateSky off the frame loop, gated on a
      // timeOfDay change, keeps it live everywhere.
      /*
      ALTITUDE IS THE SECOND CLOCK. The gate below used to watch `timeOfDay`
      alone, which is right for a sky that only changes with the hour — but a
      rocket climbing at a fixed hour would have held a blue sky all the way to
      orbit, the update never firing because nothing it watched had moved.
      */
      if (this._starfieldMesh != null) {
        /*
        INSIDE THE DOME — and putting it OUTSIDE was the bug, not the fix.

        Both boxes are `infiniteDistance`, pinned to the camera and sitting at
        the far plane, where depth precision is at its worst. Pushing the
        backdrop 6% FURTHER out did not separate them: at that range the two
        depths are indistinguishable, so the tie was decided per-pixel and the
        frame split along a hard diagonal, blue sky one side and stars the other.
        Tonio: "It's z-chasing at the corners… the skybox with two cubes NEVER
        worked."

        Nesting it inside gives the depth buffer a real difference to work with.
        It also matches what the two things ARE: the sky is drawn in front of the
        stars and hides them by day, which is the whole model — so the starfield
        being the nearer mesh is only a rendering detail, while being the
        further one was a claim depth could not honour.

        Rotation stays the cube's own — see `starfieldTilt`.
        */
        this._starfieldMesh.scaling
          .copyFrom(this.mesh.scaling)
          .scaleInPlace(0.9)
        this._starfieldMesh.position.copyFrom(this.mesh.position)
      }
      const vac = this._vacuumNow()
      // Quantised, not compared raw: a float that drifts by 1e-7 every frame
      // would refresh the sky every frame and the gate would be decorative.
      const moved =
        Math.abs(vac - this._vacuum) > 0.002 ||
        Math.abs(this._gasNow - this._gas) > 0.002
      if (moved) {
        this._vacuum = vac
        this._gas = this._gasNow
      }
      const waiting = !this._sunApplied && this._sunWaitFrames < 300
      if (waiting) this._sunWaitFrames++
      if (attrs.timeOfDay !== this._lastSkyTime || moved || waiting) {
        this._lastSkyTime = attrs.timeOfDay
        this.updateSky()
      }
      /*
      EVERY FRAME, unlike the rest of the sky. `updateSky` is deliberately gated
      on the time of day actually moving — it recomputes a whole atmosphere —
      but a medium arrives and leaves on its own clock, so a veil computed there
      would lag the fog it is supposed to match by however long until the next
      minute of game time. That is exactly how it first failed: the fog went
      white, the sky stayed blue, and both numbers read correct.
      */
      this._applyVeil()
    }
    scene.registerBeforeRender(this._sizeToCamera)
    /*
    THE HAZE HAS TO GO TOO, or the sky turns black behind air you can still see
    through — vacuum with weather in it. This is the `space` layer atmosphere.ts
    has specified from the start ("altitude leaving the atmosphere: density → 0,
    colour → black") and that nothing has ever registered: water and clouds both
    contribute bands, the third was documented and unwired. So the compositor
    already knew how to do this; it was only ever missing a caller.

    Density and end are pulled toward "nothing between you and infinity"; the
    colour goes black so that whatever haze remains mid-fade darkens rather than
    staying blue.
    */
    this._removeFogLayer = owner.addFogLayer(() => {
      const w = this._vacuum
      return w <= 0
        ? null
        : {
            weight: w,
            color: { r: 0, g: 0, b: 0 },
            density: 0,
            start: 1e6,
            end: 1e7,
            /*
            NO VEIL. Vacuum is the ABSENCE of a medium, not one in front of the
            sky: its weight still pulls the haze to nothing, but defaulting the
            veil to that weight painted the sky black over the stars — a black
            noon with no stars on an airless world, and the rocket climbing
            into a starless dark (tosijs-3d#89).
            */
            veil: 0,
          }
    })
    this._buildStarfield(scene)
    this._glowExcluded = false
    this.updateSky()
    owner.register({ meshes: [this.mesh] })
  }

  sceneDispose() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    if (this._sizeToCamera && this.owner) {
      this.owner.scene.unregisterBeforeRender(this._sizeToCamera)
      this._sizeToCamera = null
    }
    this._disposeStarfield()
    this._builtStarfieldKey = ''
    this._clearBase = null
    this.starEl = null
    this._removeFogLayer?.()
    this._removeFogLayer = null
    this._vacuum = 0
    this._gas = 1
    this._gasNow = 1
    // Hand intensity ownership back to the sun before we let go of it.
    if (this.sunEl != null) this.sunEl.externallyLit = false
    this.sunEl = null
    super.sceneDispose()
  }

  render() {
    super.render()
    // A starfield attribute changed on a live sky: rebuild just the starfield.
    if (
      this.mesh != null &&
      this.owner != null &&
      this._builtStarfieldKey !== '' &&
      this._starfieldKey() !== this._builtStarfieldKey
    ) {
      this._buildStarfield(this.owner.scene)
    }
    this._applyStarLook()
    this.updateSky()
  }
}

export const b3dSkybox = B3dSkybox.elementCreator()
