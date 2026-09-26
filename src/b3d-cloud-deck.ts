/*#
# b3d-cloud-deck

**A cloud LAYER, as a layer.** One lit surface overhead with dark undersides and
bright fringes, driven by a field you can dial from clear to overcast and slide
up and down without rebuilding anything.

This is a second primitive, not a replacement for [b3d-clouds](?b3d-clouds.ts).
Discrete blobs are right for cloud you fly BETWEEN — a canyon of thunderheads,
`insideCloud` as a tactic. They are wrong for a DECK, which is what you see from
below on an ordinary day and from above on an ordinary flight. Tonio, on seeing
one from both sides in a rocket: *"What we have is not worthy of everything else
we've got. It looks like a child's cartoon next to everything else."*

## Demo

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dGround, b3dCloudDeck, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { sky } = tosi({
  sky: {
    coverage: 0.5,
    cirrus: 0,
    altitude: 140,
    eye: 60,
    wind: 8,
    evolve: 0.5,
    timeOfDay: 10,
  },
})

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el, BABYLON) {
        // OUR OWN CAMERA, because `sceneCreated` runs BEFORE the default one is
        // built -- that is what the hook is for. The default frames the origin
        // at radius 8, and a 14 km deck would never appear in it at all.
        const cam = new BABYLON.ArcRotateCamera(
          'deck-camera',
          -1.0,
          1.66,
          900,
          new BABYLON.Vector3(0, 140, 0),
          el.scene
        )
        cam.maxZ = 40000
        cam.lowerBetaLimit = 0.05
        cam.upperBetaLimit = 1.9
        cam.lowerRadiusLimit = 80
        cam.upperRadiusLimit = 6000
        cam.wheelPrecision = 0.2
        cam.attachControl(el.parts.canvas, true)
        el.scene.activeCamera = cam
        // FLY AT A HEIGHT, look around. An orbit camera's EYE height is
        // target.y + radius*cos(beta), which on this rig swings from -400 to
        // +600 as you orbit -- so the altitude slider often could not reach
        // you, and the pass-through whiteout looked broken when it was only
        // unreachable. Pinning the eye and letting orbit change the look
        // direction makes "move the deck through your eyeline" a thing you can
        // actually do.
        el.scene.registerBeforeRender(() => {
          cam.target.y = sky.eye.valueOf() - cam.radius * Math.cos(cam.beta)
        })
      },
      scenePanel: () => [
        label3d({ text: 'Weather' }),
        slider3d({ label: 'coverage', value: sky.coverage, min: 0, max: 2, step: 0.02 }),
        slider3d({ label: 'cirrus', value: sky.cirrus, min: -1, max: 1, step: 0.05 }),
        slider3d({ label: 'altitude', value: sky.altitude, min: 20, max: 600, step: 10 }),
        slider3d({ label: 'eye height', value: sky.eye, min: 5, max: 3000, step: 25 }),
        slider3d({ label: 'wind', value: sky.wind, min: 0, max: 40, step: 1 }),
        slider3d({ label: 'evolve', value: sky.evolve, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
      ],
    },
    // THE PAIR, not one raster. Nebulae are low-frequency and live in a 256
    // cube; stars and distant galaxies are POINTS and live in a data cube that
    // the shader decodes — so they stay points at any zoom instead of being a
    // smear baked at one resolution. A quarter of the raster's disk, 25 MiB of
    // VRAM against its 96.
    b3dSkybox({
      timeOfDay: sky.timeOfDay,
      realtimeScale: 0,
      starfieldCube: '/sky/nebula',
      starfieldData: '/sky/stars',
      starfieldTilt: '12,25,58',
    }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    // An ambient fill, because the deck DIMS it — and a scene with no fill has
    // nothing for the first half of the gloom to take away.
    b3dLight({ intensity: 0.5 }),
    b3dGround({ size: 12000, color: '#4a5a44', receiveShadows: true }),
    b3dCloudDeck({
      coverage: sky.coverage,
      cirrus: sky.cirrus,
      altitude: sky.altitude,
      wind: sky.wind,
      evolve: sky.evolve,
    })
  )
)
```
```css
.preview { height: 100%; }
```

> Drag `coverage` from 0 to 1 — clear to overcast is one dial on a threshold,
> not a count of spawned objects, so it has no pool to exhaust at the top.
> Take `time of day` to 22 and the deck is lit by moonlight against the baked
> galaxy — the same cube the [skybox](?b3d-skybox.ts) uses, so it costs no extra
> mesh and the cloud tops take their colour from whatever is lighting the world.
>
> `wind` slides the whole sky and `evolve` reshapes it as it goes — both free,
> neither rebakes anything. `cirrus` takes the same sky from heaped cumulus to
> long wispy streaks, and
> There is no `transmission` slider, and that is the point: it FOLLOWS coverage,
> along with the gloom under the deck and the depth of the cloud. Pinning it here
> was quietly defeating its own demo — a fixed 0.5 sits above the gloom
> threshold, so the sun never dimmed however far the coverage went. It is still
> settable as an attribute for the deliberate case.
>
> **Push `coverage` past 1.** There is no sky left to cover, so the extra goes
> into DEPTH: the base stays put and the top TOWERS, the sun goes out, and you
> get a deck you can climb into and not come out of.
>
> **Bring `altitude` and `eye height` together.** The deck sweeps through you
> and you get the whiteout — the same fog layer a plane flying through it would
> see, and the reason a pass-through needs no special case. `eye height` pins
> where your eye is; orbiting then changes only which way you look.
>
> It goes to 3 km because the deck does: past `coverage` 1 the top can stand
> 900 m above the base and a local bulge another 1200 on top of that, so
> "above the cloud tops" is a long way up once the weather is turned on.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `altitude` | `140` | Height of the deck. Moving it is ONE number |
| `size` | `14000` | World extent of the deck. Big enough to reach the horizon — a flat grid is nearly free |
| `subdivisions` | `64` | Grid resolution — see "A grid, not a quad" |
| `coverage` | `0.5` | Clear `0` → solid `1` → thickening to `2`. LIVE, and shared with the shadow |
| `thickenDepth` | `900` | MAX thickening — how far the cloud TOP rises above `altitude` at `coverage: 2` |
| `cirrus` | `0` | Rounded heaps `0` → long wispy streaks at `±1`: positive streaks ALONG the wind heading, negative ACROSS it. Rebakes the field |
| `wind` | `8` | Metres per second the deck drifts. Nothing rebakes |
| `windHeadingDeg` | `0` | Which way it drifts — and the direction cirrus streaks run |
| `evolve` | `0.5` | How fast shapes change, `0` rigid → `1` restless |
| `follow` | `'on'` | Keep the deck centred under the camera. A deck is finite; the world is not |
| `ambientGloomBelow` | `0.7` | `transmission` below which the AMBIENT fill starts to go. `0` disables |
| `ambientGloom` | `0.45` | How far the ambient may be taken down |
| `sunGloomBelow` | `0.25` | `transmission` below which the SUN starts to go — later than the ambient, on purpose |
| `sunGloom` | `0.65` | How far the sun may be taken down at zero transmission |
| `localRise` | `1200` | How far a local weather field can lift the cloud TOP, at `coverage: 2`. Large because the orographic field is attenuated at massif scale — see the attribute note |
| `stormRise` | `1500` | How far a STORM TOWER stands above the deck where a weather cell's coverage reaches 2 (cells past 1 lift the top skin locally, whatever the global dial says) |
| `localCoverage` | `1` | How much a unit of local weather adds to `coverage`. What the field does BELOW an overcast |
| `orographic` | `0` | Cloud gathers over high ground, `0…1`. Needs a terrain in the scene |
| `orographicPeak` | `260` | Terrain height at which `orographic` is at full strength |
| `shadows` | `'on'` | Cloud shadows on the ground |
| `shadowResolution` | `0` (auto) | Shadow texture size. Deliberately coarser than the cloud — a soft cue does not need the detail |
| `shadowRange` | `6000` | Width in metres of the shadow window, centred on the camera |
| `shadowStrength` | `0.75` | Shadow darkness at zero transmission. Scaled down as `transmission` rises — a cloud you can see daylight through does not cast a hard shadow |
| `transmission` | `-1` | How much light comes THROUGH: `0` storm-dark underside, `1` glowing. `-1` = auto from `coverage` |
| `thickness` | `180` | Whiteout depth at FULL coverage. Thinner skies scale it down — passing through always whites out, coverage decides for how long |
| `haze` | `0.6` | How much the air under the deck takes the cloud's colour. Hides the rim |
| `seed` | `1337` | Same seed, same weather |
| `frequency` | `3` | Field repeats across its own width. Higher = smaller puffs |
| `octaves` | `6` | Detail octaves. Billow needs more than fBm — folding eats fine structure |
| `fieldSize` | `1024` | Texels per edge of the baked density field. More texels = finer cloud, 1 byte each |
| `period` | `1800` | Metres per repeat of the field — the size of the CLOUDS, independent of the size of the deck |
| `edgeFade` | `0.45` | Where the radial fade starts, as a fraction of the half-size. The deck has no visible rim at any coverage |
| `color` | `'#ffffff'` | Lit top colour |
| `underColor` | `'#3a4350'` | Shadowed underside |
| `fringe` | `0.9` | Brightness of the lit edges seen from below. ADDED, so it can exceed 1, and it takes the scene light's colour and direction — brightest with the sun behind the cloud |
| `bump` | `34` | Faux-bump strength. Higher = more pronounced relief |
| `underBump` | `0.85` | How much relief the UNDERSIDE shows. Borrowed from the top's lighting, so both faces share one shape |
| `shade` | `0.22` | How much of the top's brightness the lighting may take. Small on purpose — cloud is near-white, and a wide swing reads as water |

## A grid, not a quad

The obvious build is one huge quad, and it is the wrong one. Tonio: *"If we use
a bunch of quads we can use the vertex channels to drive localized weather
effects later."*

That is the argument. A subdivided grid costs nothing at these resolutions and
buys a **per-vertex channel** — somewhere to say *it is raining HERE, this part
is a thunderhead, there is a hole over the airfield* — which a single quad has
nowhere to put. The vertex colours are written white and unused today, and that
is deliberate: the channel exists so localized weather is a later edit to a
shader rather than a change of primitive.

And the case that makes it more than a convenience — Tonio: *"Or have clouds
that cluster near mountains say."* That is orographic cloud, it is real, and it
is the thing a noise field fundamentally cannot produce: noise knows nothing
about the ground under it. But the deck is a grid whose vertices have world
positions, so each one can ASK the terrain how high it is there and write the
answer into its own channel. Cloud then gathers over ridges and thins over
valleys because of the landscape rather than because someone painted it — the
same "systemic, not textural" move the rest of this project keeps making.

It generalises past mountains, too: anything samplable at a vertex can drive it.
Cloud that builds over warm ground and breaks over cold water is the same edit
with a different sampler.

It also means the deck can eventually SAG and billow by displacement, which a
quad cannot do at all.

## ⚠️ First pass — the structure is right, the LOOK is not tuned

Honest state, so nobody mistakes "it renders" for "it is finished". Three things
are visibly off and all three are art direction rather than architecture:

1. **~~The repeat is visible.~~** Fixed: two sampling layers at an irrational
   scale ratio never realign, so the field has no period to see. See the shader
   note on `density`.
2. **`coverage` has its curve now.** Percentile normalisation put the threshold
   at the same place in the distribution whatever kind of cloud this is, and the
   threshold itself is shaped rather than linear — so half coverage really is
   about half the sky, with solid cores you can fly into rather than wisps. What
   is left is taste, not calibration.
3. **No REFRACTION, and that is deliberate** — Tonio flagged it and the material
   already satisfies it: this is plain alpha blending with no refraction
   texture, no screen-space sampling and no index-of-refraction term. Cloud
   scatters, it does not bend what is behind it, and anything that distorts the
   sky through a thin edge would read as glass.

None of these need a different primitive, which is the part worth knowing: the
deck, the two faces, the live dials and the vertex channel are all doing their
jobs.

## One field, three readers

The density comes from [cloud-field](?cloud-field.ts) — baked once, tileable,
sampled by world XZ. The deck reads it, the whiteout reads it, and the ground
shadow is meant to, so all three agree by construction rather than by being kept
in step. `coverage` stays a live uniform for the same reason: weather is one
dial and nothing regenerates when it moves.

**Two of the three are wired.** The deck samples the field on the GPU and the
whiteout samples the same array on the CPU — deliberately the same array, not
a read-back and not a re-implementation, because a GPU read-back per frame would
cost real time to learn something we baked ourselves, and a second copy of the
noise is where "why is the shadow off the cloud" lives.

The shadow is the one still missing. `fieldTexture` is exposed for it:
[cloud-shadows](?cloud-shadows.ts) already has the receiver half — a material
plugin sampling a world-XZ texture, conforming to terrain — and today it is fed
by `b3d-clouds` painting blob positions into a moving window. Pointing it at
this field instead, with the same live `coverage` uniform, is what makes the
shade underfoot belong to the cloud overhead rather than merely resemble it.
*/
/*{ "parent": "environment", "order": 502 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff, sceneDelta } from './b3d-utils.js'
import { resolveBudget } from './b3d-quality.js'
import type { B3d } from './tosi-b3d.js'
import { cloudField } from './cloud-field.js'
import { CloudShadowMap } from './cloud-shadows.js'

const DECK_VERT = `
precision highp float;
attribute vec3 position;
attribute vec4 color;
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
// x = how far the BASE bulges, y = how far the TOP does. See the note below.
uniform vec2 localScale;
// Storm towers: color.b is weather-cell coverage PAST 1 (0..1), lifting the TOP
// skin by this many metres. Independent of the global dial.
uniform float stormRise;
varying vec3 vWorld;
varying vec4 vChannel;
varying vec2 vLocal;
varying vec3 vViewPos;
varying vec3 vViewUp;
void main(void) {
  /*
  LOCAL THICKENING, as an actual bulge in the mesh — and WHICH SKIN CARRIES IT
  depends on whether there are two skins yet.

  color.r is the local weather field at this vertex's world XZ (a province, or
  the terrain height for orographic cloud); color.g marks the skin, 1 for the
  top and 0 for the base.

  Below full coverage there is only ONE sheet, so that sheet has to be the
  cloud: it bulges, and the whiteout band is what gives it apparent depth. Past
  full coverage the base settles to the condensation level and the TOP takes
  the bulge over, so the cloud is genuinely thicker over the high ground rather
  than merely riding higher. localScale blends the two across the crossing, so
  the shape hands off from one skin to the other with nothing jumping. (No
  backticks in this file's shader strings -- they are template literals and one
  ends the shader mid-sentence. Fifth time.)

  This is why the deck was a subdivided grid from the first commit rather than
  one quad. The vertices have world positions, so they can ASK what is under
  them; a quad has nowhere to put the answer.
  */
  vec3 pos = position;
  pos.y += color.r * (color.g > 0.5 ? localScale.y : localScale.x);
  if (color.g > 0.5) pos.y += color.b * stormRise;
  vec4 wp = world * vec4(pos, 1.0);
  vWorld = wp.xyz;
  /*
  WHICH SIDE AM I LOOKING AT — asked in VIEW SPACE, not from the winding.

  gl_FrontFacing is a winding test, and a MIRROR reverses winding: the water's
  reflection pass renders through a matrix with negative determinant, so every
  face reports the opposite side and the reflection drew the sunlit TOP of the
  deck when it should have drawn the underside. Tonio spotted it in the water.

  A dot product between the surface normal and the eye direction, both carried
  into view space, describes actual geometry and does not care how the triangle
  is wound. It is the same answer in the main pass and the mirrored one.
  */
  vViewPos = (view * wp).xyz;
  vViewUp = (view * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
  // OBJECT space, so the fade is anchored to the deck's own rim wherever the
  // deck happens to be — including after a floating-origin rebase.
  vLocal = position.xz;
  // RESERVED: per-vertex weather. Unused today, carried so localized effects
  // are a shader edit rather than a different primitive.
  vChannel = color;
  gl_Position = worldViewProjection * vec4(pos, 1.0);
}
`

/*
THE FIELD, AS ONE PIECE OF GLSL, shared by the deck and by its shadow.

Not tidiness — correctness, and it replaced something worse. The shadow used to
be baked on the CPU from a TypeScript mirror of this, which meant one function
in two languages and a comment asking the next person to keep them in step. They
had already drifted once: the mirror read a single layer while the sky rendered
two, so the shade underfoot was not quite the cloud overhead.

One string, compiled into two shaders, is how that class of bug stops being
possible rather than being watched for.
*/
const FIELD_GLSL = `
uniform sampler2D cloudField;
uniform float coverage;
uniform float invTile;
uniform vec2 windAxis;
// xy = drift of the main layer, zw = drift of the second one.
uniform vec4 drift;
uniform float localCoverage;

/*
THE LOCAL WEATHER FIELD, as a world-space texture.

It is the same 65x65 grid the vertices are sampled on — the honest resolution of
the field — uploaded so that the things WITHOUT vertices can read it too. The
shadow is a full-screen quad and has no vertex channel to interpolate, and a
shadow that could not see local coverage would put shade under cloud that is not
there. One bake, three readers, which is the same rule the density field follows
and for the same reason.

xy = window centre in world XZ, z = 1 / window size.
*/
uniform sampler2D weatherTex;
uniform vec4 weatherWindow;

float weatherAt(vec2 p) {
  vec2 uv = (p - weatherWindow.xy) * weatherWindow.z + 0.5;
  return texture2D(weatherTex, clamp(uv, 0.0, 1.0)).r;
}

// GLOOM: the storm share of the field, weather cells only (never orographic
// lift). See the fair-weather note below for why it is its own channel.
float gloomAt(vec2 p) {
  vec2 uv = (p - weatherWindow.xy) * weatherWindow.z + 0.5;
  return texture2D(weatherTex, clamp(uv, 0.0, 1.0)).g;
}

/*
COVERAGE IS LOCAL. Tonio: "if coverage isn't near full the cloud shouldn't
necessarily get too thick so much as just more coverage near high ground."

That is what orographic cloud IS below an overcast: the mountains make MORE
cloud, not a taller lump of it. And it needs no mode switch, because the boost
cancels itself exactly where it would stop making sense — at full cover the
threshold is already saturated, so adding to it changes nothing and the field
goes back to driving height instead.

AND IT RAMPS IN WITH THE DIAL, so coverage 0 is a clear sky. Added flat, the
boost left cloud standing over every peak at "no cloud" — Tonio: "cloud cover 0
doesn't get you to 0". It reaches full strength by a quarter cover, so the low
end of the dial is the classic fair-weather sky: clear over the plain, cloud
sitting on the mountains.
*/
float gloomAt(vec2 p);
float coverageAt(vec2 p) {
  float ramp = clamp(coverage * 4.0, 0.0, 1.0);
  /*
  A STORM IGNORES THE RAMP. The local field fades in with the dial so that
  coverage 0 is a clear sky over the mountains too, but a weather cell is a
  storm someone put there: on a clear day it should still be a storm. The
  field already carries the cells (ramped); the gloom channel is exactly the
  cells, so it tops them up to full as the ramp falls away.
  */
  return coverage + weatherAt(p) * localCoverage * ramp + gloomAt(p) * (1.0 - ramp);
}

vec2 toField(vec2 p) {
  return vec2(p.x * windAxis.x - p.y * windAxis.y, p.x * windAxis.y + p.y * windAxis.x);
}

/*
WEATHER MOVES, AND IT CHANGES SHAPE, and those are two different things.

DRIFT is free: offset the sample and the whole sky slides. On its own it is
also obviously a texture on a conveyor belt — the shapes are rigid, and a cloud
that never changes while crossing the sky reads as wallpaper.

EVOLUTION is the second layer, sampled at a different scale and sliding at a
different speed, MULTIPLIED in. Where the two agree there is cloud; where either
thins, the cloud thins. As they slide past each other that intersection is
continuously reshaped — clouds build, stretch and dissolve — and none of it is
animation: it is one static field read twice.

Multiply, not cross-fade. A cross-fade between two phases PULSES, because the
whole sky dims at the halfway point; a product has no halfway point to dim at.
The square root pulls the distribution back up, since multiplying two fields in
[0,1] would otherwise halve everything and make coverage lie.
*/
/*
WHY THE SECOND LAYER IS ALWAYS ON, AND WHY ITS SCALE IS IRRATIONAL.

(No backticks in here: this is inside a template literal and one would end the
shader mid-sentence. Third time that has bitten, hence the reminder.)

One tiling texture repeats, and you can see it repeat -- a 700 m period put a
visible rhythm across the sky. Making the tile bigger only postpones that; the
grid is still there, and a flat deck is exactly the surface that shows it.

Two layers at an IRRATIONAL scale ratio never realign, so the product has no
period at all. The old ratio was 1.2 -- six fifths -- which realigns every five
tiles, so it broke the rhythm into a bigger rhythm and called it solved. The
golden ratio is the standard choice for "as far from any simple fraction as a
number gets", and here that is the entire specification.

So the second sample is not an evolution feature that happens to help; it is
what makes the sky aperiodic, and evolve only decides how fast the two layers
SLIDE past each other. At evolve 0 the shapes are rigid and the field is still
seamless and non-repeating.
*/
float density(vec2 p) {
  float a = texture2D(cloudField, toField(p + drift.xy) * invTile).r;
  vec2 q = toField(p + drift.zw) * invTile * 1.6180339;
  float b = texture2D(cloudField, q + vec2(0.37, 0.11)).r;
  return sqrt(max(a * b, 0.0)) * 1.15;
}

/*
THE SHARED THRESHOLD — must mirror \`cloudOpacity\` in cloud-field.ts.

Only the CURVE lives in two places; the field itself is one texture, so the
worst a drift here can do is soften an edge differently. That is the whole
reason the density is baked rather than re-implemented: a noise function in two
languages is where "why is the shadow off the cloud" bugs live.
*/
float opacityAt(float d, float cov) {
  if (cov <= 0.0) return 0.0;
  if (cov >= 1.0) return 1.0;
  float threshold = pow(1.0 - cov, 1.25);
  float softness = 0.14 * (1.0 - cov) + 0.02;
  float t = clamp((d - threshold + softness) / (softness * 2.0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
`

/*
THE SHADOW IS RENDERED, NOT COMPUTED.

It used to be baked on the CPU: 65,536 samples plus a texture upload, four times
a second, costing **28.7 ms** a go — nearly two frames at 60 Hz. Average FPS
looked fine and the thing stuttered four times a second, which is exactly what
"the frame rate seems terrible" means and is exactly what an average hides.
Tonio: *"I assume that's some kind of process manually updating a texture rather
than just rendering the clouds dynamically in the fragment shader."* It was.

A 512-square quad drawn by the GPU is a rounding error by comparison, and it can
run every frame instead of stepping. It also deletes the CPU mirror of
`density()` — the shadow is now literally the same code the sky is.

A WINDOW that follows the camera, not a tile. Tiling the result only works when
the wind heading is axis-aligned: with any other heading, sampling at `p` and
`p + period` lands on points that are not a lattice apart in the rotated frame,
so the seams would reappear the moment someone turned the wind.
*/
const SHADOW_FRAG = `
precision highp float;
varying vec2 vUV;
${FIELD_GLSL}
uniform vec2 shadowCenter;
uniform float shadowWorldSize;
uniform float shadowStrength;

void main(void) {
  vec2 p = shadowCenter + (vUV - 0.5) * shadowWorldSize;
  // White is lit: the receiver MULTIPLIES, so this is the light that is left.
  float lit = 1.0 - opacityAt(density(p), coverageAt(p)) * shadowStrength;
  gl_FragColor = vec4(lit, lit, lit, 1.0);
}
`

const DECK_FRAG = `
precision highp float;
${FIELD_GLSL}
varying vec3 vWorld;
varying vec4 vChannel;
varying vec2 vLocal;
varying vec3 vViewPos;
varying vec3 vViewUp;
uniform float halfSize;
uniform float underBump;
uniform float globalRise;
// How much further the TOP bulges than the base, per unit of the weather field.
uniform float localDelta;
uniform float stormRise;
// LIGHTNING inside the cloud: xy = strike (world XZ), z = reach (m), w = level.
uniform vec4 flashInfo;
uniform vec3 flashColor;
uniform float edgeFade;
uniform vec3 topColor;
uniform vec3 underColor;
uniform vec3 sunDir;
uniform vec3 skyTint;
uniform float fringe;
uniform float bump;
uniform float shade;
uniform float transmission;
// 1 when transmission follows coverage; 0 when the author pinned it.
uniform float autoLift;
uniform vec3 fogColorU;
// (mode, start, end, density) — Babylon's own vFogInfos, read from the scene.
uniform vec4 fogInfos;
uniform vec3 camPos;

/*
WIND HEADING IS A UV ROTATION, not something baked into the field.

Rotating inside the bake does not tile (the torus angle advances by 2*PI*cos
across the field, which only closes at right angles). Rotating the SAMPLE does:
the texture wraps, so a rotated read has no seam — the repeat lattice simply
sits at an angle to the world. Turning the wind therefore costs nothing and
rebakes nothing.
*/

/*
OUR OWN FOG, because this is our own shader.

The deck cannot use mesh.applyFog (no backticks in here -- this is inside a
template literal, and one would end the shader mid-sentence): a ShaderMaterial
does not get Babylon's
fog plumbing at all. And skipping it is not cosmetic. An unfogged sheet inside a
whiteout is a DARKER BAND across a white screen: the one object in the frame
that did not receive the memo, and precisely the edge-on view the band exists to
hide. Fogging it costs four uniforms and makes the sheet dissolve into the same
white as everything else.

It pays a second time at distance: a deck fading into haze has no visible rim,
which is the other half of why a real overcast has no edge.
*/
float fogAmount(vec3 world) {
  float mode = fogInfos.x;
  if (mode < 0.5) return 1.0;
  float d = length(camPos - world);
  if (mode > 2.5) return clamp((fogInfos.z - d) / (fogInfos.z - fogInfos.y), 0.0, 1.0);
  float f = d * fogInfos.w;
  if (mode > 1.5) f = f * f;
  return clamp(exp(-f), 0.0, 1.0);
}

void main(void) {
  vec2 p = vWorld.xz;
  float d = density(p);
  /*
  THE RIM FADES OUT, and it is not the fog's job.

  Hiding the edge with haze worked only when the haze was thick, which tied it
  to coverage — so a fair-weather sky showed the deck terminating in mid-air.
  Tonio: "the cloud looks like a pavillion roof." An edge is a GEOMETRIC fact
  and has to be hidden geometrically, at every weather.

  Radial, so the deck is effectively a DISC however the grid is built: a square
  rim is closer at the sides than at the corners, so any fade that follows the
  grid ends at a different distance depending on where you look. A circular one
  ends at the same distance everywhere, which is the only way it can pass for a
  horizon.
  */
  float r = length(vLocal) / halfSize;
  float rim = 1.0 - smoothstep(edgeFade, 1.0, r);

  /*
  THE TOP SKIN ONLY EXISTS WHERE IT IS SEPARATED from the base — otherwise it
  sits exactly on it and z-fights for the whole sky.

  And separation only ever comes from FULL COVERAGE now. Tonio: "the top layer
  should only be positioned differently from the bottom layer if cover is 100%
  ... showing two layers above each other looks weird." He is right, and it was
  a real error: a province could separate the skins at half coverage, where the
  sky still has gaps — so you looked through a hole in one sheet at another
  sheet, which is two decks, not one cloud.

  Below full coverage there is one sheet and nothing to see through to. Above
  it, the field is opaque everywhere, so the two skins exist but you only ever
  meet one of them: the top from above, the base from below, and whiteout in
  between if you are inside.
  */
  float separation = globalRise + vChannel.r * localDelta + vChannel.b * stormRise;
  if (vChannel.g > 0.5 && separation < 4.0) discard;

  float a = opacityAt(d, coverageAt(p)) * vChannel.a * rim;
  if (a <= 0.004) discard;

  /*
  A FAUX BUMP from the field's own gradient. The deck is flat geometry, so the
  relief has to come from the only thing that varies across it — and finite
  differences on the density give a normal for free, which is what makes a lit
  top read as billowing rather than as painted.
  */
  float e = 2.5;
  float dx = density(p + vec2(e, 0.0)) - density(p - vec2(e, 0.0));
  float dz = density(p + vec2(0.0, e)) - density(p - vec2(0.0, e));
  vec3 n = normalize(vec3(-dx * bump, 1.0, -dz * bump));

  // Geometric, not winding-based — survives the mirrored reflection pass.
  bool topSide = dot(normalize(vViewUp), -normalize(vViewPos)) > 0.0;

  if (topSide) {
    /*
    TOP: MOSTLY WHITE, bump-mapped. Not a lit surface with a wide tonal range.

    The first version swung 0.55→1.0 with the lambert term, which is what an
    OCEAN shader does — broad light and dark bands rolling across a smooth
    gradient — and it read as exactly that. Tonio: "The material should look
    mostly white but bump mapped from above… So it shouldn't look at all like
    water."

    Cloud is near-white almost everywhere; what tells you its shape is a narrow
    band of shading on top of that whiteness, not a swing between bright and
    dark. So the lambert term is a small perturbation of the colour rather than
    a multiplier of it — and topColor stays essentially what you SEE, which is
    also what makes it usable as a dial: set it sulfurous and you get a
    sulfurous sky, not a grey one with a yellow tint.

    (No backticks in here: this is inside a template literal, and one would end
    the shader mid-sentence.)
    */
    float lam = clamp(dot(n, normalize(-sunDir)), 0.0, 1.0);
    vec3 col = topColor * (1.0 - shade + shade * lam) * skyTint;
    gl_FragColor = vec4(mix(fogColorU, col, fogAmount(vWorld)), a);
  } else {
    /*
    UNDERSIDE: dark, with BRIGHT FRINGES.

    The two faces being genuinely different is most of why a deck reads as
    weather and a billboard does not — a billboard has one appearance. Thin
    cloud at the edges transmits, so the fringe rides the part of the ramp
    where opacity is still climbing, and the thick middle stays shadowed.
    */
    float thin = 1.0 - smoothstep(0.2, 0.75, a);
    /*
    TRANSMISSION is how much of the daylight on the far side gets through, and
    it moves the WHOLE underside, not just its edges. A thin fair-weather deck
    is bright grey underneath with luminous edges; a storm deck is nearly black
    with a rim. Both are this shader at two settings.

    It does two things because a single one is never enough: it lifts the base
    out of the dark (so the middle of a thin cloud is not a silhouette), and it
    scales the emissive fringe (so a dark deck keeps its rim but loses the
    glow). Tonio: "makes the layer less dark and more emissive from below."

    The lift is a mix toward topColor rather than a brightening, which is what
    keeps an alien sky alien — a sulfurous deck transmits sulfurous light.
    */
    /*
    THE UNDERSIDE GETS RELIEF, BORROWED FROM THE TOP.

    Tonio: *"can we give the undersides of the clouds a visible bump map
    (obviously it isn't actually directionally lit, but its topside is -- can we
    leverage that?)"* Yes, and in two ways that are both physically the same
    story told from underneath:

    - **What the lobes do.** Flip the faux-bump normal and light it with the
      same sun. There is no direct sun down here, so this is not illumination —
      it is the SHAPE reading, the way mammatus lobes read: the side of a bulge
      that faces the sun has less cloud between you and the lit top than the
      side that does not.
    - **What the top does.** Where the top is brightly lit, more light arrives
      to be transmitted, so the underside brightens with it. That is what ties
      the two faces together: the relief you see from below is caused by the
      same bumps you would see from above, not by a second unrelated noise.

    Both are modulations of the base rather than added light, so a storm-dark
    deck gains shape without gaining brightness.
    */
    float lamUnder = clamp(dot(vec3(n.x, -n.y, n.z), normalize(-sunDir)), 0.0, 1.0);
    float lamTop = clamp(dot(n, normalize(-sunDir)), 0.0, 1.0);
    float relief = mix(1.0, 0.62 + 0.72 * lamUnder, underBump);
    float through = mix(1.0, 0.78 + 0.34 * lamTop, underBump);

    /*
    FAIR-WEATHER CLOUD IS WHITE FROM BELOW. Tonio: "clouds below coverage 0.5
    [should be] close to white from below and emissive at the edges". A thin,
    broken deck is sunlit through — its underside is bright, not the grey slab
    of an overcast. The lift used to be transmission x 0.6, which peaked at 42%
    toward white on a CLEAR day: every scattered cumulus read as a raincloud.

    So the base is near-white up to coverage 0.5 and eases onto the storm curve
    by full cover. It reads the DIAL, not the local coverage: tried first, and
    over hilly ground the orographic boost (+0.5 on average there) turned a
    0.4 fair-weather sky into a grey slab — the dial said fair, the underside
    said storm. Orographic cloud still means MORE cloud over the peaks; it just
    does not repaint fair weather as foul. An explicitly set transmission
    (autoLift 0) keeps its authority — a pinned storm-dark deck stays dark.
    */
    /*
    A STORM CELL IS THE EXCEPTION, and says so on its own channel. Orographic
    lift must not repaint fair weather as foul (above), but a weather cell
    with coverage IS foul weather: it is a storm the author asked to see
    (WEATHER-DESIGN stage 2, board #1122). So cells bake into a separate
    gloom channel, and only gloom moves the underside toward the storm
    curve: the dial reads fair everywhere else, and dark under the storm.
    */
    float gloom = gloomAt(p);
    // Everything below that reads how thin the cloud is reads it LOCALLY
    // under a storm: less light through, no wispy glow, a darker base.
    float gTrans = transmission * (1.0 - 0.7 * gloom);
    float fair = autoLift * (1.0 - smoothstep(0.5, 1.0, coverage + gloom));
    float lift = max(gTrans * 0.6, 0.9 * fair);
    vec3 base = mix(underColor, topColor, lift) * relief * through;
    base *= 1.0 - 0.55 * gloom;
    // EMISSIVE edges, so they read as lit-from-behind rather than as pale
    // paint: the fringe is ADDED to the base, which is what lets it go brighter
    // than the material's own colour where the cloud is thinnest.
    /*
    THE SILVER LINING IS FORWARD SCATTER, so it has to know where the sun is
    FROM HERE — not just how thin the cloud is.

    Tonio: *"emissive edges on the underside being driven by the light source if
    that's practical."* It is, and it is one dot product. Light that gets
    through a thin cloud edge carries on in roughly the direction it was already
    going, so an edge blazes when the sun is behind it from where you stand and
    is merely pale when it is off to one side. That is why a cloud you are
    flying toward at sunset looks nothing like the same cloud over your
    shoulder, and without it every edge glows equally in every direction, which
    is the giveaway that it is a texture effect rather than light.

    The colour and the strength both come from skyTint below -- the scene's own
    light -- so the fringes go orange at dusk, silver at noon and nearly out at
    night, from the same numbers that light the terrain. (No backticks in this
    file's shader strings: they are template literals and one ends the shader
    mid-sentence. Fourth time.)
    */
    vec3 viewDir = normalize(vWorld - camPos);
    // sunDir is the light's DIRECTION — the way it travels, AWAY from the sun
    // — so looking toward the sun is looking along -sunDir. This read +sunDir
    // for a long time: the silver lining peaked with the sun BEHIND you, and
    // the clouds in front of a sunset were the darkest in the sky.
    float forward = clamp(dot(viewDir, -normalize(sunDir)), 0.0, 1.0);
    float silver = 0.3 + 0.7 * pow(forward, 4.0);
    float glow = fringe * (0.25 + 0.75 * gTrans) * silver;
    /*
    AND AS COVER THINS TOWARD NOTHING, THE WHOLE CLOUD GLOWS — not just its
    edges. The last wisps of a clearing sky are all edge: light passes straight
    through them. Forward-weighted like the fringe and multiplied by skyTint
    like everything else, so it is the sun's own colour: golden at golden hour.
    */
    float wisps = autoLift * (1.0 - smoothstep(0.0, 0.5, coverage + gloom));
    /*
    THE GLOW TAKES THE SUN'S HUE, NOT ITS WHOLE DIMMING. skyTint is the sun's
    colour times its intensity, and at 17:30 the intensity is ~0.4 — so a
    forward-scattered edge, multiplied by it like everything else, came out
    DARKER than the bright sky right beside it: sunset clouds as grey
    silhouettes. But light scattered forward toward you is the sun's own light,
    and near a low sun it is among the brightest things in the sky. So the
    emission keeps the tint's hue at full saturation and only the square root
    of its level: golden at golden hour, and bright where the sun is behind the
    cloud. The body of the underside still takes the full tint, so a dusk deck
    still goes dim.
    */
    float tintLevel = max(max(skyTint.r, skyTint.g), max(skyTint.b, 0.001));
    vec3 sunGlow = skyTint / tintLevel * sqrt(tintLevel);
    /*
    THIN CLOUD OUTSHINES THE SKY. Tonio: "Clouds should be brighter than the
    sky at thinnest because they're catching a lot more light than dust or
    whatever." A wisp in front of a low sun is lit through its whole depth by
    direct sunlight; the air around it only scatters a little of it. So as
    cover thins the emission climbs to ~3x — unchanged from 0.5 up, so an
    overcast behaves exactly as before.
    */
    float bright = 1.0 + 2.0 * wisps;
    vec3 emit =
      topColor * glow * bright *
      (thin * thin + 0.12 * gTrans + 0.45 * wisps) * sunGlow;
    /*
    AND THE GLOW MOSTLY SURVIVES THE DISTANCE FOG. The brightest thin cloud at
    sunset sits near the horizon, exactly where the fog was mixing it down to
    the horizon colour. The body of the cloud fogs as before; its glow keeps
    most of its strength, which is what a bright rim on a far cloud looks like.
    */
    float fa = fogAmount(vWorld);
    vec3 body = mix(fogColorU, base * skyTint, fa);
    /*
    LIT FROM INSIDE (board #1123). A strike lights the cloud around it, not
    the sky: strongest where the cloud is thick (a storm tower glows, a wisp
    barely does) and falling off with distance from the channel. Added after
    the fog, like the fringe glow, so a flash in a far storm still reads.
    */
    float fd = distance(p, flashInfo.xy);
    float fr = max(1.0, flashInfo.z);
    float lit = flashInfo.w * exp(-(fd * fd) / (fr * fr)) * (0.35 + 0.65 * a);
    gl_FragColor = vec4(body + emit * (0.4 + 0.6 * fa) + flashColor * lit, a);
  }
}
`

/**
 * What `_bindWeather` needs of a shader — satisfied by both a `ShaderMaterial`
 * and a `ProceduralTexture`, which is the point: they are two consumers of one
 * field and neither should need a different call.
 */
type WeatherTarget = {
  setTexture(name: string, texture: BABYLON.BaseTexture): unknown
  setVector4(name: string, value: BABYLON.Vector4): unknown
  setFloat(name: string, value: number): unknown
}

/** Four box passes over an n×n grid (see `_bakeWeather`: it turns a
 * mountain into weather, and a storm cell into a soft-edged one). */
function smoothGrid(input: Float32Array, n: number, passes = 4): Float32Array {
  let src: Float32Array = input
  let dst: Float32Array = new Float32Array(input.length)
  for (let pass = 0; pass < passes; pass++) {
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x
        let sum = src[i] * 2
        let count = 2
        if (x > 0) {
          sum += src[i - 1]
          count++
        }
        if (x < n - 1) {
          sum += src[i + 1]
          count++
        }
        if (z > 0) {
          sum += src[i - n]
          count++
        }
        if (z < n - 1) {
          sum += src[i + n]
          count++
        }
        dst[i] = sum / count
      }
    }
    const swap = src
    src = dst
    dst = swap
  }
  return src
}

/** What the weather channel was last baked for — see `_bakeWeather`. */
function freshWeatherKey(): {
  inactive: boolean
  x: number
  z: number
  orographic: number
  peak: number
  weather: ((x: number, z: number) => number) | null
  gen: string
  cells: string
} {
  return {
    inactive: false,
    x: NaN,
    z: NaN,
    orographic: NaN,
    peak: NaN,
    cells: '',
    weather: null,
    gen: '',
  }
}

export class B3dCloudDeck extends B3dChild {
  static initAttributes = {
    altitude: 140,
    /**
     * World extent of the deck. BIG — it has to reach the horizon, and a flat
     * grid is nearly free. See "The rim fades out".
     */
    size: 14000,
    subdivisions: 64,
    /**
     * Clear `0` → solid `1` → THICKENING, up to `2`.
     *
     * Past 1 there is no more sky left to cover, so the extra goes into DEPTH:
     * the base descends toward the ground while the top stays put. See
     * "Coverage past 1 is thickness".
     */
    coverage: 0.5,
    /**
     * MAXIMUM thickening: how far the cloud TOP stands above `altitude` at
     * `coverage: 2`, in metres.
     *
     * This is the cap, and the dial reaches it only at the very top of its
     * travel — see `thickening` for the easing. A thunderhead is several
     * kilometres tall, so there is a lot of room above the default here.
     */
    thickenDepth: 900,
    seed: 1337,
    frequency: 3,
    /** Rounded heaps `0` → long wispy streaks at `±1` — positive ALONG the wind heading, negative ACROSS it. Rebakes the field. */
    cirrus: 0,
    /** Metres per second the deck drifts. The whole sky slides; nothing rebakes. */
    wind: 8,
    /** Which way it drifts. Also the direction cirrus streaks run. */
    windHeadingDeg: 0,
    /**
     * How fast cloud shapes change, `0` rigid → `1` restless. A second sample
     * of the same field sliding at a different rate — see the shader note.
     */
    evolve: 0.5,
    /**
     * Keep the deck centred under the camera: `'on'` or `'off'`.
     *
     * ON by default, because a deck is finite and the world is not. The field
     * is sampled in WORLD XZ, so sliding the disc along does not slide the
     * weather — the clouds stay where they are and the sheet moves under them.
     * Turn it off only for a scene small enough that `size` covers it.
     */
    follow: 'on',
    /**
     * How far a local weather field can lift the cloud top, in metres.
     *
     * The bulge is `weather(x, z) × localRise`, added to whatever the global
     * `coverage` thickening is already doing — so a province towers ABOVE an
     * overcast rather than instead of it.
     *
     * Large, because the OROGRAPHIC field is deliberately attenuated: it is
     * smoothed at massif scale, so a lone summit peaks around 0.2 and only a
     * whole range of high ground approaches 1. That attenuation is the physics
     * — one peak does not build a thunderhead — so the amplitude belongs here
     * rather than in a blur that lies about the shape. An authored `weather`
     * province returning 1 gets the full height.
     */
    localRise: 1200,
    /**
     * How far a STORM TOWER stands above the deck at a weather cell's full
     * coverage 2, in metres (cells past coverage 1 lift the top skin there,
     * whatever the global dial says). Towers are what make lightning read as
     * light INSIDE cloud.
     */
    stormRise: 1500,
    /**
     * How much a unit of local weather adds to `coverage`.
     *
     * This is what the field does BELOW an overcast: high ground makes more
     * cloud, not a taller lump of it. It needs no upper switch because it
     * cancels itself — at full cover the threshold is already saturated, so the
     * boost changes nothing and the field goes back to driving height.
     */
    localCoverage: 1,
    /**
     * Orographic cloud, `0…1`: how strongly cloud gathers over high ground.
     *
     * Needs a `<tosi-b3d-terrain>` in the scene; it asks that terrain for its
     * own height sampler, so the cloud is built over the ground that is
     * actually there — landforms, provinces, slider changes and all — rather
     * than over a second guess at it.
     */
    orographic: 0,
    /** Terrain height, in metres, at which `orographic` cloud is at full strength. */
    orographicPeak: 260,
    /** Cloud shadows on the ground: `'on'` or `'off'`. */
    shadows: 'on',
    /**
     * Shadow texture resolution. `0` resolves from the device tier.
     *
     * Fractional by nature — a cloud shadow is a soft, low-frequency cue, so it
     * is rendered far coarser than the cloud that casts it and nobody can tell.
     */
    shadowResolution: 0,
    /**
     * Width of the shadow window in metres, centred on the camera.
     *
     * A WINDOW rather than a tiling texture, so the wind can blow in any
     * direction without seams — see the note on `SHADOW_FRAG`.
     */
    shadowRange: 6000,
    /**
     * `transmission` below which the AMBIENT fill starts to go, `0` to disable.
     *
     * The ambient goes FIRST and the sun goes second — see `_applyGloom`.
     */
    ambientGloomBelow: 0.7,
    /** How far the ambient may be taken down, `0…1`. */
    ambientGloom: 0.45,
    /**
     * `transmission` below which the SUN starts to go, `0` to disable.
     *
     * Later than the ambient, deliberately: by the time the key light is being
     * removed the fill has already flattened the scene, so the world dims
     * before it goes sunless rather than both at once.
     */
    sunGloomBelow: 0.25,
    /** How far the sun may be taken down at zero transmission, `0…1`. */
    sunGloom: 0.65,
    /**
     * How dark a fully-clouded patch makes the ground at ZERO transmission,
     * `0…1`. What actually reaches the ground is this scaled by how much light
     * the cloud lets through — see `_syncShadows`.
     */
    shadowStrength: 0.75,
    /**
     * How much daylight comes THROUGH from above: `0` storm-dark underside,
     * `1` glowing. `-1` derives it from `coverage`, which is the honest default
     * — a thin sky transmits and an overcast one does not.
     */
    transmission: -1,
    /**
     * Vertical extent of the whiteout. The geometry stays a surface; this is
     * how far either side of it counts as being inside the cloud.
     *
     * Deep enough to pass THROUGH rather than across — see "You must never see
     * it edge-on" — and no deeper. It is a cloud, not a climate.
     *
     * This is the depth at FULL coverage; thinner skies scale it down, so the
     * whiteout is always there and its LENGTH is what the weather decides.
     */
    thickness: 180,
    /**
     * Haze under the deck, `0…1`: how much the air below an overcast is the
     * cloud's own colour. What it buys is the deck's RIM — a 4 km plane has an
     * edge, and fog is what a real sky uses to hide it.
     */
    haze: 0.6,
    /** Octaves of detail in the baked field. Billow needs more than fBm. */
    octaves: 6,
    fieldSize: 1024,
    /**
     * Metres per repeat of the field — the size of the CLOUDS, not of the deck.
     *
     * Big, because these are weather-system features seen from kilometres away,
     * not puffs seen from a garden. It is no longer a visible rhythm either:
     * the two sampling layers are at an irrational scale ratio, so nothing
     * realigns — see the shader note.
     */
    period: 1800,
    /**
     * Where the radial fade begins, as a fraction of the half-size. Below this
     * the deck is solid; beyond it, it thins to nothing before the rim.
     */
    edgeFade: 0.45,
    color: '#ffffff',
    underColor: '#3a4350',
    /** Brightness of the lit edges seen from below — ADDED, so it can exceed 1. */
    fringe: 0.9,
    /** Strength of the faux bump normal. Higher = more pronounced relief. */
    bump: 34,
    /**
     * How much relief the UNDERSIDE shows, `0…1`. The lobes are shaped by the
     * same bumps the top is lit by — see the shader note.
     */
    underBump: 0.85,
    /** How much of the top's brightness the lighting may take. SMALL on purpose. */
    shade: 0.22,
  }

  declare altitude: number
  declare size: number
  declare subdivisions: number
  declare coverage: number
  declare thickenDepth: number
  declare seed: number
  declare frequency: number
  declare cirrus: number
  declare wind: number
  declare windHeadingDeg: number
  declare evolve: number
  declare follow: string
  declare localRise: number
  declare stormRise: number
  declare localCoverage: number
  declare orographic: number
  declare orographicPeak: number
  declare shadows: string
  declare shadowResolution: number
  declare shadowRange: number
  declare shadowStrength: number
  declare ambientGloomBelow: number
  declare ambientGloom: number
  declare sunGloomBelow: number
  declare sunGloom: number
  declare transmission: number
  declare thickness: number
  declare haze: number
  declare octaves: number
  declare fieldSize: number
  declare period: number
  declare edgeFade: number
  declare color: string
  declare underColor: string
  declare fringe: number
  declare bump: number
  declare underBump: number
  declare shade: number

  mesh?: BABYLON.Mesh
  /** The cloud TOP, shown only when `coverage` past 1 has separated it. */
  topMesh?: BABYLON.Mesh
  /** The baked density field — the thing a shadow decal should also sample. */
  fieldTexture?: BABYLON.RawTexture
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  /*
  THE SAME ARRAY THE SHADER READS, kept on the CPU so the whiteout asks the
  field whether there is cloud where the camera actually is. Sampling the
  texture back would cost a GPU readback per frame to learn something we baked
  ourselves — and, worse, the two could disagree.
  */
  private _field: Float32Array | null = null
  private _fieldSize = 0
  private _bakeKey = ''
  private _elapsed = 0
  /*
  RESET ON DISPOSE, from the factory — the terrain's B1 lesson applied here. A
  re-parent builds fresh meshes with an unbaked colour channel; a memo that
  survived would say "nothing changed" and the weather field would be missing
  until some input moved (0.8.3 re-review).
  */
  private _weatherKey = freshWeatherKey()
  /** The field the last bake built — what `_immersionAt` samples. */
  private _liveWeather: ((x: number, z: number) => number) | null = null
  private _terrain: HTMLElement | null = null

  /** The scene's terrain, looked up once — re-queried only while absent or gone. */
  private _terrainEl(): {
    generationKey?: string
    heightSampler?: () => (x: number, z: number) => number
  } | null {
    if (this._terrain == null || !this._terrain.isConnected) {
      this._terrain =
        (this.owner?.querySelector('tosi-b3d-terrain') as HTMLElement | null) ??
        null
    }
    return this._terrain as any
  }
  private _weatherMax = 0
  /** Largest storm excess in the baked grid (0 = no tower anywhere). */
  private _stormMax = 0
  private _flash = { x: 0, z: 0, r: 1, level: 0 }
  private _flashColor = new BABYLON.Color3(0.85, 0.88, 1)

  /**
   * **Light the cloud from inside**, around (x, z) in world XZ, out to about
   * `radius` metres, at `level` (0 = off; ~1.5 is a strong strike). Lightning
   * calls this every frame of a flash; it is the deck's own light, because a
   * point light cannot reach a cloud drawn by its own shader.
   */
  flash(x: number, z: number, level: number, radius = 900): void {
    this._flash.x = x
    this._flash.z = z
    this._flash.r = radius
    this._flash.level = Math.max(0, level)
  }
  private _weatherTex: BABYLON.RawTexture | null = null
  private _weatherTexSize = 0
  /*
  TOTAL FLOATING-ORIGIN SHIFT, accumulated.

  Terrain rebases the world toward the origin every so often, and the field is
  sampled by WORLD XZ — so without this the entire sky would jump sideways at
  each rebase, which is the one moment a player is guaranteed to be looking at
  it (they are moving fast enough to have triggered one). Adding the shift back
  into the sample position puts the same clouds over the same ground.

  Held in JS rather than on a node, so this uses `addOriginListener` and must
  NOT also `registerWorldRoot` — see the floating-origin note in CLAUDE.md.
  */
  private _originX = 0
  private _originZ = 0
  private _onShift = (dx: number, dz: number): void => {
    this._originX += dx
    this._originZ += dz
  }
  private _driftX = 0
  private _driftZ = 0
  private _driftX2 = 0
  private _driftZ2 = 0
  /** The shadow half — see `_syncShadows`. Null when `shadows` is off. */
  private _shadowMap: CloudShadowMap | null = null
  private _shadowTex: BABYLON.ProceduralTexture | null = null
  /*
  THE SUN'S BRIGHTNESS IS NOT OURS, so it is borrowed rather than taken.

  `b3d-skybox` drives the sun from the time of day, and capturing its intensity
  once would freeze the day cycle at whatever o'clock we happened to start. So
  remember what we last WROTE: if the light no longer reads that, somebody else
  moved it and their value becomes the new base. Costs one comparison a frame
  and means the two systems compose instead of fighting.
  */
  // Reused, not re-allocated: written every frame.
  private _tint = new BABYLON.Color3(1, 1, 1)
  private _borrowed = new Map<
    BABYLON.Light,
    { base: number; applied: number }
  >()
  private _onAddition = (a: { meshes?: BABYLON.AbstractMesh[] }): void => {
    for (const m of a.meshes ?? []) this._maybeReceive(m)
  }

  /**
   * Attach the shadow hook, if this mesh can actually wear one.
   *
   * The filter is not tidiness. `MaterialPluginBase` attaches happily to ANY
   * material and then silently does nothing on the ones that never route plugin
   * events — every `@babylonjs/materials` material, and our own ShaderMaterials
   * (see UPSTREAM.md). So attaching to the sky, or to this very deck, costs a
   * live plugin instance that can never fire and, worse, reads as "wired up"
   * to anyone checking.
   */
  private _maybeReceive(m: BABYLON.AbstractMesh): void {
    const map = this._shadowMap
    const mat = m.material
    if (map == null || mat == null || !m.receiveShadows) return
    if (m === this.mesh) return
    const kind = mat.getClassName()
    if (kind !== 'StandardMaterial' && !kind.includes('PBR')) return
    map.attachTo(mat)
  }
  private _immersion = 0
  private _removeFogLayer: (() => void) | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any

    this._bakeField(scene)

    const mesh = BABYLON.MeshBuilder.CreateGround(
      'cloud-deck_nocast',
      {
        width: attrs.size,
        height: attrs.size,
        subdivisions: Math.max(1, Math.floor(attrs.subdivisions)),
      },
      scene
    )
    mesh.position.y = attrs.altitude
    mesh.isPickable = false
    mesh.applyFog = false
    /*
    THE PER-VERTEX WEATHER CHANNEL, initialised to "ordinary cloud everywhere".
    Nothing reads it beyond the alpha yet — it is here so that localized rain,
    a thunderhead, or a hole over the airfield is a shader edit later rather
    than a different primitive.
    */
    const count = mesh.getTotalVertices()
    const colors = new Float32Array(count * 4)
    // r = local weather (baked below), g = which skin, b unused, a = opacity.
    colors.fill(0)
    for (let v = 3; v < colors.length; v += 4) colors[v] = 1
    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true)

    const mat = new BABYLON.ShaderMaterial(
      'cloud-deck',
      scene,
      { vertexSource: DECK_VERT, fragmentSource: DECK_FRAG },
      {
        attributes: ['position', 'color'],
        uniforms: [
          'world',
          'worldViewProjection',
          'view',
          'coverage',
          'invTile',
          'windAxis',
          'halfSize',
          'edgeFade',
          'drift',
          'evolve',
          'globalRise',
          'localDelta',
          'stormRise',
          'flashInfo',
          'flashColor',
          'localScale',
          'localCoverage',
          'weatherWindow',
          'topColor',
          'underColor',
          'sunDir',
          'skyTint',
          'fringe',
          'bump',
          'shade',
          'transmission',
          'autoLift',
          'underBump',
          'fogColorU',
          'fogInfos',
          'camPos',
        ],
        samplers: ['cloudField', 'weatherTex'],
        needAlphaBlending: true,
      }
    )
    // Seen from both sides — that is the entire point of a deck.
    mat.backFaceCulling = false
    /*
    BIND THE SAMPLER HERE. The bake runs before this material exists, so its own
    setTexture is a no-op on the first pass — which left the deck invisible
    until something forced a re-bake. Tonio: "the cloud layer in the demo
    doesn't render until you twiddle the cirrus knob."
    */
    if (this.fieldTexture != null)
      mat.setTexture('cloudField', this.fieldTexture)
    mesh.material = mat
    this.mesh = mesh

    /*
    A SECOND SKIN FOR THE TOP, so a thick deck has a top you fly over and a
    base you fly under, with nothing but whiteout between them.

    Two meshes rather than one because a plane cannot be at two heights, and
    the alternative — an actual volume — buys nothing: with `coverage` past 1
    the field is opaque everywhere, so there are no gaps for a viewer to see
    the far skin through. What is between them is fog, which is both cheaper
    and what you would actually see.

    It shares the material, so every dial moves both, and it is hidden whenever
    the drop is small enough for the two to z-fight.
    */
    const top = BABYLON.MeshBuilder.CreateGround(
      'cloud-deck-top_nocast',
      {
        width: attrs.size,
        height: attrs.size,
        subdivisions: Math.max(1, Math.floor(attrs.subdivisions)),
      },
      scene
    )
    top.isPickable = false
    top.applyFog = false
    top.material = mat
    /*
    `g` MARKS THE SKIN: 1 on the top, 0 on the base. One shared material cannot
    carry a per-mesh uniform, and this is the channel that already exists for
    exactly this kind of per-vertex fact — so the vertex shader lifts the top
    and leaves the base alone without a second material to keep in step.
    */
    const topColors = colors.slice()
    for (let v = 1; v < topColors.length; v += 4) topColors[v] = 1
    top.setVerticesData(BABYLON.VertexBuffer.ColorKind, topColors, true)
    top.isVisible = false
    this.topMesh = top

    /*
    THE WHITEOUT IS A FOG LAYER, exactly as it is for b3d-clouds — the scene
    composites and smooths every layer together (see atmosphere.ts), so passing
    through a deck cannot fight the sea, the base fog or space, and nothing ever
    switches fogMode. That is also why a zero-thickness surface can be flown
    THROUGH at all: the pass-through is optical, not geometric.
    */
    this._removeFogLayer = owner.addFogLayer(() => {
      const st = this._fogAt(scene.activeCamera?.globalPosition)
      return st.weight <= 0 ? null : st
    })

    this._obs = scene.onBeforeRenderObservable.add(() => {
      // sceneDelta, never engine.getDeltaTime: a scene observer can run more
      // than once per frame and the engine's delta is the WHOLE frame each time.
      this._elapsed += sceneDelta(scene)
      this._sync()
    })
    this._sync()
    owner.register({ meshes: [mesh, top] })
    owner.addOriginListener(this._onShift)

    if (!isOff(attrs.shadows)) this._setupShadows(owner, scene)
  }

  /** Push the live dials at the shader. Cheap enough to do every frame. */
  private _sync(): void {
    const attrs = this as any
    const mat = this.mesh?.material as BABYLON.ShaderMaterial | undefined
    if (mat == null || this.mesh == null) return
    // Cheap enough to compare every frame; the bake only runs when it differs.
    if (this._currentBakeKey() !== this._bakeKey && this.owner?.scene != null) {
      this._bakeField(this.owner.scene)
    }
    this.mesh.position.y = attrs.altitude
    mat.setFloat('coverage', attrs.coverage)
    // ONE FIELD REPEAT PER `period` METRES — the cloud's scale is a property of
    // the weather, not of how big the sheet happens to be, so pushing the deck
    // further out no longer changes the size of the puffs.
    mat.setFloat('invTile', 1 / (attrs.period || 1))
    mat.setFloat('halfSize', (attrs.size || 1) * 0.5)
    mat.setFloat('edgeFade', Math.min(0.99, Math.max(0, attrs.edgeFade)))
    const h = (attrs.windHeadingDeg * Math.PI) / 180
    mat.setVector2('windAxis', new BABYLON.Vector2(Math.cos(h), Math.sin(h)))
    /*
    DRIFT IS A WORLD OFFSET, not a moving mesh. Moving the deck itself would
    drag its rim fade along with it and eventually slide the sheet off the
    world; offsetting the SAMPLE leaves the geometry exactly where it is and
    the sky slides forever. The whiteout and the shadows read the same offset,
    so all three stay on the same weather.
    */
    /*
    FOLLOW IN XZ, and the weather does not come with it. The shader reads world
    position, so moving the sheet slides the disc under a sky that stays put —
    which is what lets a 14 km deck cover an endless terrain without ever
    showing an edge or dragging the clouds along behind you.
    */
    const cam = this.owner?.scene?.activeCamera
    if (!isOff(attrs.follow) && cam != null) {
      /*
      SNAPPED TO THE VERTEX GRID, the same trick b3d-water uses — and here it
      is load-bearing rather than tidy. The local weather field is sampled PER
      VERTEX, so if the grid slid continuously every vertex would be over new
      ground every frame and the field would have to be re-sampled 4,600 times
      a frame. Snapped, the vertices sit on a fixed world lattice and the
      samples stay valid until the snap changes.

      The jump is invisible because nothing about the CLOUD moves with it: the
      density is read in world space and the rim is far away and faded, so what
      steps is only the sheet the sky is painted on.
      */
      const step = Math.max(1, attrs.size / Math.max(1, attrs.subdivisions))
      this.mesh.position.x = Math.round(cam.globalPosition.x / step) * step
      this.mesh.position.z = Math.round(cam.globalPosition.z / step) * step
    }
    const rise = this.topRise
    const top = this.topMesh
    this._bakeWeather()

    /*
    THE HANDOFF. Below full coverage the base IS the cloud and carries the whole
    bulge; above it, the base settles flat and the top carries it instead. The
    blend runs over the first fifth of the thickening dial so the shape moves
    from one skin to the other continuously — at the moment of handoff the top
    appears exactly where the base bulge was, so nothing jumps.

    `localDelta` is what the fragment shader needs: how much FURTHER the top
    goes than the base, which is the only thing that can separate them.
    */
    const scale = this.localScales()
    mat.setVector2('localScale', new BABYLON.Vector2(scale.base, scale.top))
    mat.setFloat('globalRise', rise)
    mat.setFloat('localDelta', scale.top - scale.base)
    mat.setFloat('stormRise', Math.max(0, attrs.stormRise ?? 0))
    mat.setVector4(
      'flashInfo',
      new BABYLON.Vector4(
        this._flash.x,
        this._flash.z,
        this._flash.r,
        this._flash.level
      )
    )
    mat.setColor3('flashColor', this._flashColor)
    this._bindWeather(mat)

    if (top != null) {
      /*
      THE SECOND SKIN ONLY EXISTS AT FULL COVERAGE. Below it there is one sheet
      and no way to see past it; above it the field is opaque everywhere, so two
      skins can exist without ever both being visible. The shader still discards
      the top where the two would coincide, which covers the first hair of the
      dial where nothing has separated them yet.
      */
      // ...or wherever a STORM goes past full cover: its tower is the top skin
      // lifted there, and the shader discards the rest (nothing separates it).
      top.isVisible = attrs.coverage >= 1 || this._stormMax > 0
      top.position.set(
        this.mesh.position.x,
        attrs.altitude + rise,
        this.mesh.position.z
      )
    }
    const t = this._elapsed
    const dx = -Math.cos(h) * attrs.wind * t + this._originX
    const dz = -Math.sin(h) * attrs.wind * t + this._originZ
    mat.setVector4(
      'drift',
      new BABYLON.Vector4(dx, dz, dx * 1.9, dz * 1.9 + t * attrs.wind * 0.35)
    )
    mat.setFloat('evolve', Math.min(1, Math.max(0, attrs.evolve)))
    this._driftX = dx
    this._driftZ = dz
    this._driftX2 = dx * 1.9
    this._driftZ2 = dz * 1.9 + t * attrs.wind * 0.35
    this._syncShadows()
    mat.setColor3('topColor', BABYLON.Color3.FromHexString(attrs.color))
    mat.setColor3('underColor', BABYLON.Color3.FromHexString(attrs.underColor))
    mat.setFloat('fringe', attrs.fringe)
    mat.setFloat('bump', attrs.bump)
    mat.setFloat('shade', attrs.shade)
    mat.setFloat('transmission', this.resolvedTransmission)
    mat.setFloat('autoLift', this.transmission >= 0 ? 0 : 1)
    mat.setFloat('underBump', Math.min(1, Math.max(0, attrs.underBump)))
    const scene = this.owner?.scene
    if (scene != null) {
      mat.setColor3('fogColorU', scene.fogColor)
      mat.setVector4(
        'fogInfos',
        new BABYLON.Vector4(
          scene.fogMode,
          scene.fogStart,
          scene.fogEnd,
          scene.fogDensity
        )
      )
      const cam = scene.activeCamera
      if (cam != null) mat.setVector3('camPos', cam.globalPosition)
    }
    this._immersion = this._immersionAt(
      this.owner?.scene?.activeCamera?.globalPosition
    )
    const sun = this.owner?.scene?.lights?.find(
      (l) => (l as BABYLON.DirectionalLight).direction != null
    ) as BABYLON.DirectionalLight | undefined
    mat.setVector3(
      'sunDir',
      sun?.direction ?? new BABYLON.Vector3(-0.4, -1, -0.3)
    )
    /*
    THE DECK IS LIT BY WHATEVER IS LIGHTING THE WORLD.

    It was not: `topColor` went straight to the framebuffer, so at midnight the
    cloud tops were the same brilliant white they are at noon — a lit overcast
    hanging over a dark landscape under a galaxy. Nothing about the shader knew
    what time it was.

    So the sun's own colour AND intensity scale both faces. `b3d-skybox` already
    drives that light from the time of day (`sunColor`, `duskColor`,
    `moonColor`, `moonIntensity`), which means dusk turns the cloud tops orange
    and moonlight turns them blue-grey for free, from the same numbers that
    light the terrain — rather than from a second time-of-day model that would
    have to be kept in step.

    The floor is small and deliberate: cloud is never truly black from outside,
    it catches skyglow. Not clamped to 1 either — a bright sun should be allowed
    to blow the tops out a little, which is exactly what they do.
    */
    const tint = sun?.diffuse ?? new BABYLON.Color3(1, 1, 1)
    const level = sun?.intensity ?? 1
    this._tint.set(
      Math.min(1.15, tint.r * level + 0.12),
      Math.min(1.15, tint.g * level + 0.12),
      Math.min(1.15, tint.b * level + 0.13)
    )
    mat.setColor3('skyTint', this._tint)
    this._applyGloom(sun ?? null)
  }

  /**
   * Bake (or re-bake) the density field.
   *
   * SEPARATE FROM SETUP, because the bake inputs are attributes and an
   * attribute that silently does nothing is worse than one that does not exist.
   * `cirrus` is the case that made this obvious: the slider moved, the element
   * accepted the value, and the sky did not change — because the field had been
   * baked once in `sceneReady` and nothing ever asked for another.
   *
   * Only the BAKE inputs live here. `coverage` and the colours are uniforms and
   * must stay that way: weather is a live dial, and nothing should regenerate
   * when it moves.
   */
  private _bakeField(scene: BABYLON.Scene): void {
    const attrs = this as any
    const size = Math.max(8, Math.floor(attrs.fieldSize))
    const field = cloudField({
      size,
      seed: attrs.seed,
      frequency: attrs.frequency,
      octaves: attrs.octaves,
      cirrus: attrs.cirrus,
    })
    this._field = field
    this._fieldSize = size
    this._bakeKey = this._currentBakeKey()
    /*
    ONE CHANNEL, eight bits. The field is a smooth mask and the threshold that
    reads it ramps over a band far wider than a quantisation step, so floating
    point here would cost four times the memory to move nothing on screen.
    */
    const bytes = new Uint8Array(field.length)
    for (let i = 0; i < field.length; i++) bytes[i] = Math.round(field[i] * 255)
    const tex = new BABYLON.RawTexture(
      bytes,
      size,
      size,
      BABYLON.Constants.TEXTUREFORMAT_R,
      scene,
      // MIPMAPS, and this is not an optimisation — it is the streaking.
      //
      // A deck is the worst case a texture can be given: an enormous plane seen
      // at a grazing angle, so a screen pixel near the horizon covers hundreds
      // of texels. Without mipmaps the sampler takes ONE of them, so the cloud
      // stops being cloud and becomes aliasing that smears along the view
      // direction — which reads exactly as stretching, and is why it looked
      // like a scaling or mirroring fault rather than a filtering one.
      true,
      false,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE
    )
    /*
    ANISOTROPIC, because the footprint at a grazing angle is not square. Plain
    trilinear has to pick one level for a footprint that is short across and
    long along, so it blurs the short axis to match the long one and the horizon
    goes soft. Sampling the long axis properly is what keeps distant cloud
    detailed instead of merely un-aliased.
    */
    tex.anisotropicFilteringLevel = 8
    // It tiles by construction — say so, or the edges clamp into streaks.
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
    this.fieldTexture?.dispose()
    this.fieldTexture = tex
    const mat = this.mesh?.material as BABYLON.ShaderMaterial | undefined
    mat?.setTexture('cloudField', tex)
    /*
    THE SHADOW SAMPLES THE SAME FIELD, and it must re-bind too. Miss this and
    the shadow's ProceduralTexture keeps sampling the DISPOSED texture — the
    deck re-renders with the new weather while the shadows go black and stay
    black, with no error anywhere (a disposed texture fails silently). This
    was exactly the reported "play with the demo a while and the shadows stop
    working": `cirrus` is in the bake key, so the first slider scrub killed
    them. One frame later nobody can see a reason.
    */
    this._shadowTex?.setTexture('cloudField', tex)
  }

  /**
   * LOCAL weather: `(x, z) → 0…1`, in logical world coordinates.
   *
   * WHAT IT DOES depends on how full the sky already is, and that is the whole
   * design rather than a special case:
   *
   * - **Below full cover** it adds to `coverage` (`localCoverage`). High ground
   *   makes MORE cloud, not a taller lump of it — which is what orographic
   *   cloud looks like under a broken sky, and it keeps the single sheet flat
   *   so it is never caught edge-on.
   * - **Above full cover** it adds HEIGHT (`localRise`), on the same none-at-1
   *   to maximum-at-2 ramp the global thickening rides. There is no more sky to
   *   cover, so the same field starts building upward instead.
   *
   * The handover needs no switch: the coverage boost cancels itself exactly
   * where it stops meaning anything, because a saturated threshold cannot be
   * saturated further.
   *
   * Set it to a province falloff for an authored thunderhead, or leave it null
   * and set `orographic` to have the deck build one from the terrain. Sampled
   * per vertex, so its resolution is the grid's: at the default 14 km over 64
   * subdivisions that is one sample every 220 m, and a feature much smaller
   * than that will alias rather than appear. Raise `subdivisions` for finer
   * weather, or carry the fine detail in the density field where it is free.
   *
   * ⚠️ It must be ORIGIN-STABLE — the same coordinates must give the same
   * answer after a floating-origin rebase, or the sky will slide off the
   * ground it belongs to. `B3dTerrain.heightSampler()` already promises this,
   * which is why `orographic` uses it rather than the render-space one.
   */
  weather: ((x: number, z: number) => number) | null = null

  /**
   * Resolve the field actually in force: an explicit `weather`, or one built
   * from the terrain for `orographic`, or nothing.
   */
  private _weatherField(): ((x: number, z: number) => number) | null {
    const own = this._ownWeatherField()
    /*
    WEATHER CELLS JOIN THE FIELD (WEATHER-DESIGN stage 2, board #1122). A
    `<tosi-b3d-weather-cell>` with `coverage` is a storm the deck should
    SHOW: its coverage sums into the field (clamped, the coverage rule), and
    because the shadow reads this same field, the storm's shadow travels with
    it for free. Cells live in RENDER space; this field is sampled in
    origin-stable coordinates, and render = field + the deck's origin offset
    (the inverse of `ox` in `_bakeWeather`).
    */
    const owner = this.owner
    if (owner == null || !this._coverageCells()) return own
    return (x, z) => {
      const base = own == null ? 0 : own(x, z)
      const c =
        owner.weatherAt(x + this._originX, z + this._originZ).coverage ?? 0
      return Math.min(1, Math.max(0, base + c))
    }
  }

  /** The storm share only: weather-cell coverage, no orographic lift. */
  private _gloomField(): ((x: number, z: number) => number) | null {
    const owner = this.owner
    if (owner == null || !this._coverageCells()) return null
    return (x, z) =>
      Math.min(
        2,
        Math.max(
          0,
          owner.weatherAt(x + this._originX, z + this._originZ).coverage ?? 0
        )
      )
  }

  /** Is any weather cell asking for coverage? */
  private _coverageCells(): boolean {
    return (this.owner?.weatherCells ?? []).some(
      (c) => c.coverage != null && (c.strength ?? 1) > 0
    )
  }

  /** A coarse signature of the coverage cells: a drifting storm re-bakes
   * about once per 10 m of travel, not every frame. */
  private _cellsKey(): string {
    return (this.owner?.weatherCells ?? [])
      .filter((c) => c.coverage != null)
      .map(
        (c) =>
          // Strength in 1% steps: a gathering storm re-bakes as it builds,
          // fine enough that the build reads as gradual rather than stepped.
          `${Math.round(c.at.x / 10)},${Math.round(c.at.z / 10)},${Math.round(
            c.radius
          )},${c.coverage!.toFixed(2)},${Math.round((c.strength ?? 1) * 100)}`
      )
      .join(';')
  }

  private _ownWeatherField(): ((x: number, z: number) => number) | null {
    if (this.weather != null) return this.weather
    const strength = Math.min(1, Math.max(0, this.orographic))
    if (strength <= 0) return null
    const height = this._terrainEl()?.heightSampler?.()
    if (height == null) return null
    const peak = Math.max(1, this.orographicPeak)
    /*
    A RIDGE, not a height map. What makes orographic cloud is air being pushed
    UP, so the interesting thing is elevation relative to what is around it —
    but a first pass on absolute height already puts the towers over the
    mountains and the clear air over the sea, which is the effect being asked
    for. Smoothstepped so a coastal plain contributes nothing rather than a
    little of everything.
    */
    return (x, z) => {
      const t = Math.min(1, Math.max(0, height(x, z) / peak))
      return strength * t * t * (3 - 2 * t)
    }
  }

  /**
   * Write the local weather field into the vertex channel.
   *
   * ONLY WHEN THE GRID HAS MOVED, which is what the snapped follow buys: the
   * vertices sit on a fixed world lattice, so between snaps every vertex is
   * over the same ground and the samples stay valid. At 14 km over 64
   * subdivisions the snap is 220 m, so at 50 m/s this runs about once every
   * four seconds rather than 4,600 samples a frame.
   */
  private _bakeWeather(force = false): void {
    const mesh = this.mesh
    const top = this.topMesh
    if (mesh == null || top == null) return
    /*
    EVERYTHING THE FIELD DEPENDS ON, not just where the grid sits. The key was
    the grid position alone, so dragging `orographic` changed the strength and
    nothing re-sampled it (Tonio: "the orographic slider doesn't seem to
    work"), and a terrain reshaped under the deck kept the old mountains' cloud
    until the camera next moved a grid step.

    COMPARED BEFORE ANYTHING IS BUILT. This runs every frame, and it used to
    build the field first — a fresh terrain height sampler per frame, usually
    thrown away — plus a DOM query and a joined string. Now it is a handful of
    field compares, and the field is built only when one of them moved.
    */
    const k = this._weatherKey
    /*
    NO FIELD IN FORCE is one fact, not six. With no custom `weather` and no
    orographic lift the channel is all zeros wherever the grid sits and
    whatever the terrain does, so it is baked ONCE and nothing else is looked
    at. Keying it like a live field re-baked zeros on every grid snap and on
    every terrain rebuild — once a frame during a terrain slider drag (0.8.3
    re-review).
    */
    const cells = this._cellsKey()
    const inactive =
      this.weather == null && !(this.orographic > 0) && cells === ''
    if (inactive) {
      if (!force && k.inactive) return
      k.inactive = true
    } else {
      const terrain = this._terrainEl()
      const gen = this.weather == null ? terrain?.generationKey ?? '' : ''
      if (
        !force &&
        !k.inactive &&
        k.x === mesh.position.x &&
        k.z === mesh.position.z &&
        k.orographic === this.orographic &&
        k.peak === this.orographicPeak &&
        k.weather === this.weather &&
        k.gen === gen &&
        k.cells === cells
      ) {
        return
      }
      k.inactive = false
      k.x = mesh.position.x
      k.z = mesh.position.z
      k.orographic = this.orographic
      k.peak = this.orographicPeak
      k.weather = this.weather
      k.gen = gen
      k.cells = cells
    }
    const field = this._weatherField()
    const gloomField = this._gloomField()
    this._liveWeather = field

    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const colors = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind)
    const topColors = top.getVerticesData(BABYLON.VertexBuffer.ColorKind)
    if (positions == null || colors == null || topColors == null) return
    const ox = mesh.position.x - this._originX
    const oz = mesh.position.z - this._originZ
    const n = Math.max(1, Math.floor(this.subdivisions)) + 1
    const raw = new Float32Array(n * n)
    const rawGloom = new Float32Array(n * n)
    const rawStorm = new Float32Array(n * n)
    for (let k = 0, i = 0; k < raw.length; k++, i += 3) {
      const x = positions[i] + ox
      const z = positions[i + 2] + oz
      const w = field == null ? 0 : field(x, z)
      raw[k] = w < 0 ? 0 : w > 1 ? 1 : w
      if (gloomField != null) {
        const g = gloomField(x, z) // 0..2: a cell past full cover is a storm
        rawGloom[k] = Math.min(1, g)
        rawStorm[k] = Math.max(0, g - 1)
      }
    }

    /*
    SMOOTHED ACROSS THE GRID, and this is the difference between cloud and a
    mirrored mountain range.

    The first version displaced each vertex by the terrain height beneath it,
    which is exactly what the description says and produces faceted triangular
    peaks hanging in the sky — recognisably the same ridgeline, upside down.
    Two things were wrong with it. A 220 m vertex spacing cannot represent a
    ridge, so it aliases into facets; and orographic lift is not a copy of the
    ground anyway — air rides up over a whole massif, so what builds is a broad
    dome over the high GROUND, not a cast of its skyline.

    Four box passes over 65x65 is a few thousand adds, it runs only when the
    grid snaps, and it turns a mountain into weather.
    */
    const src = smoothGrid(raw, n)
    /*
    ONE PASS for the cell channels, not four. The four passes turn a faceted
    ridge into weather; a weather cell is already smooth (a smoothstep over
    its radius), and four more passes flattened a 700 m storm's excess from
    0.7 to 0.18, so the tower stood 270 m instead of a kilometre. One pass
    only takes the edge off the grid.
    */
    const gloom = gloomField != null ? smoothGrid(rawGloom, n, 1) : null
    const stormy = gloomField != null ? smoothGrid(rawStorm, n, 1) : null
    let stormMax = 0
    if (stormy != null) for (const v of stormy) if (v > stormMax) stormMax = v
    this._stormMax = stormMax

    for (let k = 0, v = 0; k < src.length; k++, v += 4) {
      colors[v] = src[k]
      topColors[v] = src[k]
      const b = stormy == null ? 0 : stormy[k]
      colors[v + 2] = b
      topColors[v + 2] = b
    }
    mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors)
    top.updateVerticesData(BABYLON.VertexBuffer.ColorKind, topColors)

    /*
    AND AS A TEXTURE, because the things without vertices need it too. The
    shadow is a full-screen quad with nothing to interpolate, and a shadow blind
    to local coverage would lay shade under cloud that is not there. Same grid,
    same numbers, no second sampling of the field — the texture IS the vertex
    data, uploaded.
    */
    // Two channels: R = the whole field (coverage and rise), G = gloom
    // (storm cells only, for the underside's darkness).
    const bytes = new Uint8Array(src.length * 2)
    for (let k = 0; k < src.length; k++) {
      bytes[k * 2] = Math.round(src[k] * 255)
      bytes[k * 2 + 1] = gloom == null ? 0 : Math.round(gloom[k] * 255)
    }
    if (this._weatherTex == null || this._weatherTexSize !== n) {
      this._weatherTex?.dispose()
      this._weatherTexSize = n
      const scene = this.owner?.scene
      if (scene == null) return
      const tex = new BABYLON.RawTexture(
        bytes,
        n,
        n,
        BABYLON.Constants.TEXTUREFORMAT_RG,
        scene,
        false,
        false,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE
      )
      tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
      tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
      this._weatherTex = tex
    } else {
      this._weatherTex.update(bytes)
    }
    this._weatherMax = field == null ? 0 : 1
  }

  /**
   * Hand the local weather to a shader — the deck's material or the shadow's.
   *
   * ONE CALL FOR BOTH, because they must agree about where the cloud is. The
   * window is the deck's own grid: centred where the (snapped) mesh sits and
   * exactly `size` across, which is the extent the samples were taken over.
   */
  private _bindWeather(mat: WeatherTarget): void {
    const tex = this._weatherTex
    const mesh = this.mesh
    if (tex == null || mesh == null) return
    mat.setTexture('weatherTex', tex)
    mat.setVector4(
      'weatherWindow',
      new BABYLON.Vector4(
        mesh.position.x,
        mesh.position.z,
        1 / Math.max(1, this.size),
        0
      )
    )
    mat.setFloat('localCoverage', Math.max(0, this.localCoverage))
  }

  /** The bake inputs, as one comparable value. */
  private _currentBakeKey(): string {
    const a = this as any
    return [a.fieldSize, a.seed, a.frequency, a.octaves, a.cirrus].join('|')
  }

  /**
   * `transmission`, DERIVED from `coverage` unless explicitly set.
   *
   * Tonio: *"I'd suggest we derive transmission from cover... rather than make
   * it independent."* Right, because they are not two facts. How much light
   * gets through a cloud is a consequence of how much cloud there is, and
   * letting an author set "total overcast that is also luminous" mostly
   * produces skies that look wrong in a way they then have to go hunting for.
   * One dial that cannot contradict itself beats two that can.
   *
   * | `coverage` | `transmission` | |
   * |---|---|---|
   * | `0` | `0.70` | a clear sky: the little cloud there is, glows |
   * | `1` | `0.25` | solid overcast, dim underneath |
   * | `1.5` | `0` | thick enough that nothing comes through |
   * | `2` | `0` | and it stays there while the base descends |
   *
   * Two straight segments rather than a curve, because those numbers ARE the
   * specification and a curve through them would only add places to argue.
   * `transmission` stays settable for the deliberate case — a bright thin
   * overcast, an alien sky — and `-1`, the default, means "follow the coverage".
   */
  get resolvedTransmission(): number {
    const t = this.transmission
    if (t >= 0) return Math.min(1, t)
    const c = Math.max(0, this.coverage)
    if (c <= 1) return 0.7 - 0.45 * c
    return Math.max(0, 0.25 - 0.5 * (c - 1))
  }

  /**
   * How far past solid the deck is, `0…1` — `coverage` 1 → 2.
   *
   * ## Coverage past 1 is thickness
   *
   * At `coverage` 1 there is no sky left to cover, so more weather has to mean
   * something other than more area, and what it means is DEPTH.
   *
   * **It grows UPWARD.** The base stays at `altitude` and the top towers, which
   * is both what Tonio asked for and what the atmosphere does: a cloud base sits
   * at the condensation level, a property of how humid and how warm the air is,
   * and it does not move much. What builds is the top. A deck that thickened
   * downward would be a deck descending to meet you, which happens — but it is
   * a different event, and it is spelled by moving `altitude`.
   *
   * It also composes with everything already here rather than needing new
   * machinery, which is the sign it was the right axis: the whiteout band
   * becomes a slab instead of a plane, `transmission` is already 0 by 1.5 so
   * the underside is already black, and the gloom ramps already have the sun
   * on the way out.
   *
   * ## There is only ever ONE layer to see
   *
   * Thickening exists ONLY at full coverage, and that is a rule rather than a
   * convenience. Tonio: *"the top layer should only be positioned differently
   * from the bottom layer if cover is 100% ... showing two layers above each
   * other looks weird."*
   *
   * Below full cover the sky has gaps, so a second surface would be visible
   * through them — you would be looking through a hole in one deck at another
   * deck, which is two decks and not one cloud. So below 1 there is a single
   * infinitely thin sheet, and the whiteout band is what gives it depth: you
   * never catch it edge-on, so you never learn that it is thin.
   *
   * At and above 1 the field is opaque everywhere, so two skins can exist
   * without both ever being seen — the top from above, the base from below, and
   * whiteout in between if you are inside it.
   */
  get thickening(): number {
    const x = Math.min(1, Math.max(0, this.coverage - 1))
    /*
    EASED IN, because linear arrived far too fast. Tonio: "perhaps it comes on a
    bit too quickly." Squared spends the first quarter of the dial's travel on
    the first sixteenth of the depth, so a sky just past solid is a sky just
    past solid — the towering is the top of the dial, not the middle of it.
    */
    return x * x
  }

  /** How far the cloud TOP currently stands above `altitude`, in metres. */
  get topRise(): number {
    return this.thickening * Math.max(0, this.thickenDepth)
  }

  /**
   * How far a unit of local weather lifts each skin, in metres.
   *
   * ONE ANSWER, read by the shader and by the whiteout, because they describe
   * the same surfaces and a disagreement would put the fog somewhere the cloud
   * is not. Below full coverage the base carries the whole bulge — it IS the
   * cloud — and above it the top takes over, blended across the first fifth of
   * the thickening dial so the shape hands off with nothing jumping.
   */
  localScales(): { base: number; top: number } {
    /*
    THE BASE NEVER BULGES. Below full cover the field is spending itself on
    COVERAGE instead — more cloud over the high ground rather than a taller lump
    of it — so the one sheet there stays flat, which is also what keeps it from
    ever being caught edge-on.

    Above full cover the top's lift rides the SAME ramp as the global
    thickening: none at 1, maximum at 2. One curve for every kind of thickness
    means they cannot arrive at different times, and the tower grows out of the
    deck instead of appearing on it.
    */
    return { base: 0, top: Math.max(0, this.localRise) * this.thickening }
  }

  /**
   * The whiteout half-depth, in metres — `thickness` scaled by `coverage`.
   *
   * PASSING THROUGH ALWAYS WHITES OUT. Coverage decides for how LONG, not
   * whether. Tonio: *"I think we always whiteout passing through the layer,
   * just shrink the whiteout depth based on coverage."*
   *
   * The earlier model multiplied immersion by the cloud density right above
   * you, which is defensible — broken cloud IS mostly gaps — and it made the
   * single most important moment in the element unreliable. Whether you got a
   * whiteout depended on where you happened to be when you crossed, so the
   * feature worked in testing and not in use, and no amount of widening the
   * sampling fixed that: it only made every crossing equally grey.
   *
   * A depth is the better dial because it degrades the right way. Thin cloud
   * gives a brief flash as you punch through; overcast gives a long blind
   * climb. Neither is ever nothing, and the difference between them is legible
   * without being a coin toss.
   */
  private _halfDepth(): number {
    const cov = Math.min(1, Math.max(0, this.coverage))
    if (cov <= 0) return 0
    // Below linear, so even a thin sky has a band you can feel.
    return Math.max(1, this.thickness * 0.5) * Math.pow(cov, 0.7)
  }

  /**
   * How far inside the cloud a point is, `0…1`.
   *
   * ## You must never see it edge-on
   *
   * The deck is one flat surface, and a flat surface viewed along its own plane
   * is a LINE — the one angle at which the whole illusion is visibly a sheet.
   * Tonio: "we should give the cloud layer enough depth you never get close to
   * seeing it edge-on."
   *
   * The fix is not geometry, it is the BAND. The whiteout saturates well before
   * the plane (inside `CORE` of the half-depth) and stays saturated well past
   * it, so by the time your eye is level with the sheet there has been nothing
   * but white for a long while. You enter cloud, you are in cloud, you leave
   * cloud — and the moment that would have given the trick away happens where
   * you cannot see anything at all.
   *
   * ⚠️ **But the band is not a licence to be enormous.** It first shipped at
   * 320, which sounds harmless — no geometry has depth here, only the ramp —
   * and it is not: at half-thickness 160 you are "inside" the cloud while
   * standing plainly underneath it, so the screen whites out with the deck
   * visibly overhead and the ground visibly below. Being inside has to mean
   * being inside.
   */
  private _immersionAt(p?: BABYLON.Vector3 | null): number {
    if (p == null) return 0
    const half = this._halfDepth()
    if (half <= 0) return 0
    /*
    A SLAB, not a plane. With no thickening the two faces coincide and this is
    the old single-plane band exactly; as `coverage` goes past 1 the base
    descends and the whiteout simply spans the gap. Nothing special-cases the
    thick sky — it is the same ramp with two edges instead of one, which is why
    flying down through a thickening deck stays white for longer rather than
    behaving differently.
    */
    /*
    THE SLAB FOLLOWS THE LOCAL BULGE, so flying into a tower is flying into
    cloud. One field SAMPLE a frame — the geometry is per-vertex, but what is
    over YOUR head is a single point. The field itself is the one the last bake
    built (same inputs, same key), not a fresh one: building it constructs a
    terrain height sampler, and doing that every frame here was the cost the
    bake's key exists to avoid (0.8.3 re-review).
    */
    const field = this._liveWeather
    const w =
      field == null
        ? 0
        : Math.min(
            1,
            Math.max(0, field(p.x - this._originX, p.z - this._originZ))
          )
    const scale = this.localScales()
    const top = this.altitude + this.topRise + w * scale.top
    const bottom = this.altitude + w * scale.base
    const outside = p.y > top ? p.y - top : p.y < bottom ? bottom - p.y : 0
    const d = outside / half
    // Saturate inside the core, ramp to nothing at the band edge.
    const CORE = 0.45
    const t = Math.min(1, Math.max(0, (1 - d) / (1 - CORE)))
    if (t <= 0) return 0
    // Smoothstep so entry and exit have no crease.
    return t * t * (3 - 2 * t)
  }

  /**
   * The deck's whole contribution to the air, at a point.
   *
   * ONE LAYER DOES BOTH JOBS, because they are the same weather seen from two
   * distances. Tonio: *"it should probably set the fog to at minimum hide the
   * end of the cloud layer and at maximum white out the screen."*
   *
   * - **Minimum** — you are under an overcast. The air is the cloud's colour
   *   and `end` comes in to about half the deck, which is what hides the fact
   *   that a 4 km plane has a rim. Real skies do this; it is why you cannot see
   *   the edge of an overcast.
   * - **Maximum** — you are inside it. `end` is arm's length and the screen is
   *   white.
   *
   * `weight` and `veil` diverge here and that is the point: haze owns the air
   * completely while hiding none of the sky (you can still see straight up),
   * and only real immersion stands in front of the sky. One number could not
   * say both.
   */
  private _fogAt(p?: BABYLON.Vector3 | null): {
    weight: number
    veil: number
    color: { r: number; g: number; b: number }
    density: number
    start: number
    end: number
  } {
    const immersion = this._immersionAt(p)
    this._immersion = immersion
    /*
    GEOMETRIC IMMERSION IS NOT OPTICAL DEPTH, and the fog wants the second one.

    `_immersion` answers "how far into the slab, over how much cloud" — a
    fraction of a distance. What you can SEE saturates far faster than that: a
    few metres into real cloud and it is already total. So 0.89 geometric is
    essentially 1.0 optical, and treating them as the same number left the
    pass-through at a hundred-odd metres of visibility, which reads as thick
    haze rather than as being inside something.

    This matters more than it sounds because immersion rarely reaches 1.0 in
    broken cloud — it is the product of the vertical ramp AND the local density
    — and the whiteout should not be reserved for the exact centre of the
    thickest patch. It also fixes the composite: at a weight of 0.89 the scene's
    base fog still contributes a tenth of a kilometre of visibility, and no
    amount of tuning the layer's own `end` can get past that.
    */
    const optical = 1 - (1 - immersion) * (1 - immersion)

    const half = Math.max(1, this._halfDepth())
    const rise = this.topRise
    // Measured from the BASE, so the colour ramp covers the whole slab: black
    // at the bottom of a thick deck, whiteout at the top.
    const dy = p == null ? 0 : p.y - this.altitude
    /*
    HAZE ONLY BELOW, and only while the deck is overhead rather than a distant
    ceiling. Above it the air is clear — that is the whole reward for climbing
    out — so this is deliberately one-sided.
    */
    /*
    ONE-SIDED, and it took a probe to notice it was not.

    The intent was always "haze under the deck, clear air above it" — climbing
    out is the reward. But the distance test was written as `-dy - half`, which
    is zero for EVERY point above the base, so it read "full haze" both just
    under the deck and a kilometre over the top of it. The comment said one
    thing and the arithmetic did another, and nothing caught it because from
    under a deck the answer is right.

    Now: nothing above the top, full inside the slab and just below it, falling
    off with distance beneath the base.
    */
    const reach = Math.max(1, this.size * 0.3)
    const beneath = p != null && p.y <= this.altitude + rise
    const near =
      p != null && p.y > this.altitude + rise
        ? 0
        : 1 - Math.min(1, Math.max(0, this.altitude - (p?.y ?? 0)) / reach)
    /*
    SQUARED in coverage, because haze is not proportional to how much sky is
    covered — it is what happens when the sky is SHUT. Scattered fair-weather
    cloud puts almost nothing in the air below it and a linear term greys the
    whole world at half coverage, which is the look of a bad overcast preset
    rather than of an ordinary afternoon.
    */
    const cov = Math.min(1, Math.max(0, this.coverage))
    const haze = Math.min(1, Math.max(0, this.haze)) * near * cov * cov
    const weight = Math.max(haze, optical)

    /*
    THE COLOUR RUNS THE HEIGHT OF THE BAND — darkest underside at the bottom,
    brightest top at the top. Tonio: "the fog color should be set to the darkest
    value of the cloud underside at or below the white-out threshold and
    transition to the brightest value of the top of the layer at the top."

    So the two ends are the two things the shader actually paints: the underside
    base (no fringe — the fringe is an edge effect and there are no edges when
    you are inside) and the lit top. Climbing through therefore brightens
    continuously, which is what flying out of the top of a cloud looks like, and
    it costs no extra dial because both ends are already the material's.
    */
    /*
    VISIBILITY INTERPOLATES GEOMETRICALLY, not linearly — because that is what
    optical depth does, and the linear version does not feel like cloud at all.

    Straight-line from 1800 m to 12 m leaves you at ~200 m of visibility when
    you are 90% into the cloud, which reads as thick haze rather than as being
    inside anything. Halving the distance for each equal step in is the real
    curve, and it puts the whiteout where the cloud is instead of only at the
    exact centre of it — which matters because immersion rarely reaches 1.0 in
    broken cloud and should not have to.
    */
    const rim = Math.max(24, this.size * 0.45)
    const NEAR = 12
    const end = NEAR * Math.pow(rim / NEAR, 1 - optical)

    const top = BABYLON.Color3.FromHexString(this.color)
    const under = BABYLON.Color3.FromHexString(this.underColor)
    const darkest = BABYLON.Color3.Lerp(
      under,
      top,
      Math.min(1, this.resolvedTransmission * 0.6)
    )
    const bandPos = Math.min(1, Math.max(0, (dy + half) / (rise + half * 2)))
    const c = BABYLON.Color3.Lerp(darkest, top, bandPos)
    /*
    AND THE FOG IS LIT BY THE SAME LIGHT THE CLOUD IS.

    The two ends of this ramp are the colours the shader paints — but the shader
    then scales them by `skyTint`, the scene's own sun, and this did not. So as
    transmission fell the underside went dark while the horizon fog stayed at
    its unlit value, and the haze ended up brighter than the cloud casting it.
    Tonio: "as transmission goes to 0 the underside of the cloud deck darkens
    which means the horizon fog should darken too."

    One multiply, and it fixes dusk and night for free as well — the fog was
    equally wrong at midnight, just less obviously.
    */
    c.r *= this._tint.r
    c.g *= this._tint.g
    c.b *= this._tint.b

    return {
      weight,
      /*
      HOW MUCH SKY IS LEFT IS NOT THE SAME QUESTION AS HOW THICK THE AIR IS.

      The veil used to be `max(immersion, haze)`, and `haze` is a tunable
      scalar defaulting to 0.6 — so under a deck at FULL coverage the sky was
      only 51% hidden and you could still see the skybox sitting on the horizon
      past the deck's rim. Tonio caught it in both demos.

      But `haze` is answering "how much does the air under this take the cloud's
      colour", which an author may legitimately want dialled down. How much sky
      remains is not theirs to dial: at 100% coverage there is none, and that is
      arithmetic. So the veil reads the COVERAGE directly and the haze scalar
      only governs the air.

      Squared, so it tracks what you would actually see: at half cover the
      horizon is milky rather than closed, and it shuts completely only as the
      sky does.

      And it does NOT fade with distance below the deck the way the haze does.
      The air thins as you descend away from cloud — that is real — but the
      amount of SKY over your head does not change, because the deck is 14 km
      wide and follows you. Using the haze's own falloff here left 13% of the
      skybox showing from 550 m under a total overcast, which is the horizon
      leak Tonio reported. `veil` is still not `weight` — immersion can exceed it, and a
      layer is free to own the air without standing in front of the sky.
      */
      veil: Math.max(optical, beneath ? cov * cov : 0),
      color: { r: c.r, g: c.g, b: c.b },
      /*
      DENSITY DERIVED FROM `end`, never a constant — because which of the two
      the scene actually uses is not ours to know.

      A scene with no <tosi-b3d-fog> runs EXP2 at a whisper density (that is how
      a layer can ramp up without ever switching fogMode and recompiling every
      shader — see atmosphere.ts). Handing such a scene a flat `density: 1.0`
      composites to 0.15 at a mere 15% haze, which fogs everything within a
      hundred metres to solid. That was three separate bug reports with one
      cause: the deck rendered navy instead of its own colour (so `transmission`
      looked broken), the ground washed out (so cloud shadows had nothing to
      fall on), and the pass-through whiteout could not be told from the haze
      because both were already total.

      exp(-(d·k)²) = 0.05 at d·k = 1.73, so k = 1.73 / end makes the EXP2 curve
      reach the same visibility distance the LINEAR one does. One number, both
      modes, no assumption about which is live.
      */
      density: 1.73 / end,
      /*
      START BACK, so haze does not paint what is at your feet. Linear fog from
      zero begins the moment anything is further away than nothing, which under
      a thick deck greys the ground you are standing on — and that is where the
      cloud SHADOWS are supposed to be legible. Keeping the near fifth clear
      leaves the foreground readable while the distance still closes up; at full
      whiteout the whole scale has collapsed to arm's length anyway, so the
      fraction costs nothing there.
      */
      start: end * 0.2,
      /*
      The scene's fog is usually LINEAR, where `end` decides opacity and
      `density` is ignored. At minimum this reaches about half the deck, which
      is what puts its rim out of sight; at maximum it is arm's length, because
      a distant `end` is never opaque close up and that was the old "the
      whiteout never reaches full white" bug.
      */
      end,
    }
  }

  /**
   * Cloud shadows on the ground, from the SAME field the deck is drawn from.
   *
   * This is the third reader, and the one that makes the shade underfoot
   * actually belong to the cloud overhead rather than merely resemble it. The
   * receiving half already existed for [b3d-clouds](?b3d-clouds.ts) — a
   * material plugin sampling by world XZ, conforming to terrain, projecting
   * each fragment down the sun — and it was fed by painting blob positions into
   * a window. A deck has no blobs and no window: its field tiles, so the map
   * runs in tiled mode and samples this texture forever in every direction.
   *
   * The texture carries OPACITY, thresholded on the CPU through the shared
   * `cloudOpacity`. That is the whole reason it is baked here rather than
   * thresholded in the receiver's shader: the `coverage` curve already lives in
   * two places (this element's shader and cloud-field.ts) and a third would be
   * one too many — "why is the shadow off the cloud" is exactly the bug that
   * lives in those gaps.
   */
  private _setupShadows(owner: B3d, scene: BABYLON.Scene): void {
    const map = new CloudShadowMap(scene, this.shadowRange)
    this._shadowMap = map
    const res = resolveBudget(this.shadowResolution, 'cloudShadowSize')
    const tex = new BABYLON.ProceduralTexture(
      'cloud-deck-shadow',
      res,
      { fragmentSource: SHADOW_FRAG },
      scene,
      undefined,
      false,
      false
    )
    /*
    EVERY FRAME, because it now costs a quad. The window follows the camera, so
    a stale one would smear the shadows behind you as you fly — the old 4 Hz
    bake could only be excused because it was tiled and stationary.
    */
    tex.refreshRate = 1
    tex.setTexture('cloudField', this.fieldTexture!)
    // The window is CLAMPED: outside it there is no data, and the receiver
    // already skips fragments that fall outside rather than wrapping to garbage.
    tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
    tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    this._shadowTex = tex
    map.sourceTexture = tex
    for (const m of scene.meshes) this._maybeReceive(m)
    owner.addSceneListener(this._onAddition)
  }

  /** Push the live dials at the shadow map and its shader. */
  private _syncShadows(): void {
    const map = this._shadowMap
    const tex = this._shadowTex
    if (map == null || tex == null) return
    const attrs = this as any

    /*
    TRANSMISSION DARKENS OR LIGHTENS THE SHADOW, because it is the same fact
    seen from the other side. `transmission` says how much daylight comes
    THROUGH the cloud; light that got through is light that reached the ground,
    so a deck rendering as luminous from below cannot also be laying down a hard
    shadow. Not all the way to zero — even thin cloud dims what is under it, and
    a shadow that vanishes entirely reads as the shadows being broken rather
    than as the cloud being thin.
    */
    const strength =
      Math.min(1, Math.max(0, attrs.shadowStrength)) *
      (1 - 0.8 * this.resolvedTransmission)

    // The window follows the camera; the weather inside it does not move with it.
    const cam = this.owner?.scene?.activeCamera?.globalPosition
    const range = Math.max(100, attrs.shadowRange)
    map.worldSize = range
    if (cam != null) map.setCenter(cam.x, cam.z)

    this._bindWeather(tex)
    tex.setVector2(
      'shadowCenter',
      new BABYLON.Vector2(map.centerX, map.centerZ)
    )
    tex.setFloat('shadowWorldSize', range)
    tex.setFloat('shadowStrength', strength)
    tex.setFloat('coverage', attrs.coverage)
    tex.setFloat('invTile', 1 / (attrs.period || 1))
    const h = (attrs.windHeadingDeg * Math.PI) / 180
    tex.setVector2('windAxis', new BABYLON.Vector2(Math.cos(h), Math.sin(h)))
    tex.setVector4(
      'drift',
      new BABYLON.Vector4(
        this._driftX,
        this._driftZ,
        this._driftX2,
        this._driftZ2
      )
    )

    /*
    `groundY` is the CLOUD's altitude, not the ground's. The receiver projects
    each fragment along the sun to this plane and looks up what is there — so
    the plane has to be where the occluder is, and the shadow lands displaced by
    the sun's slant exactly as it should. Setting it to the actual ground would
    sample the cloud directly overhead and give every shadow a noon sun.
    */
    const sun = this.owner?.scene?.lights?.find(
      (l) => (l as BABYLON.DirectionalLight).direction != null
    ) as BABYLON.DirectionalLight | undefined
    const dir = sun?.direction ?? new BABYLON.Vector3(-0.4, -1, -0.3)
    map.setSun({ x: dir.x, y: dir.y, z: dir.z }, attrs.altitude)
    // Nothing above the deck can be shadowed by it.
    map.layerTop = attrs.altitude + this.topRise + this._halfDepth()
  }

  /**
   * Take the light down for anything under a thick deck — AMBIENT FIRST, then
   * the sun.
   *
   * Tonio: *"transmission first cuts ambient and then cuts the sun."* The order
   * is the whole design, and it is what makes one dial read as weather rather
   * than as a brightness slider. Thickening cloud does two different things to
   * a scene, and they are not simultaneous:
   *
   * 1. **The fill goes.** Early, from `ambientGloomBelow`. The sky stops
   *    bouncing light into every shadow, so the world gets darker and a little
   *    contrastier while the sun is still plainly there. This is an overcast
   *    building.
   * 2. **The key goes.** Late, from `sunGloomBelow`. Now there is no direct sun
   *    down here at all and the scene goes flat. This is the overcast having
   *    arrived.
   *
   * Running them together would just be a dimmer. Staggered, the light changes
   * CHARACTER on the way down, which is the thing you actually notice about
   * weather — and it is why no per-fragment shadow can stand in for it: a
   * shadow says "this patch is darker than that one", never "there is no sun".
   *
   * Both are gated on being BELOW the layer. Above it nothing is obstructed,
   * and climbing out into the light should be dramatic.
   */
  private _applyGloom(sun: BABYLON.DirectionalLight | null): void {
    const scene = this.owner?.scene
    if (scene == null) return
    const cam = scene.activeCamera?.globalPosition
    const below =
      cam != null && cam.y < this.altitude + this.topRise + this._halfDepth()
    const t = this.resolvedTransmission
    const cov = Math.max(0, Math.min(1, this.coverage))

    /*
    CLAMP THROUGH A FINITE GUARD. Not defensive habit — this blacked the whole
    scene out once. An attribute that was declared but never added to
    `initAttributes` read `undefined`; the ramp correctly produced no gloom, and
    then `1 - 0 * NaN` is NaN rather than 1, so the sun's intensity became NaN
    and every lit surface rendered black. A cosmetic dimmer must not be able to
    do that: one bad number should cost the effect, not the picture.
    */
    const num = (v: number, fallback: number) =>
      Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback

    /** How far past `threshold` the transmission has fallen, smoothed, 0…1. */
    const ramp = (threshold: number): number => {
      if (!below || threshold <= 0 || t >= threshold) return 0
      const x = Math.max(0, Math.min(1, (threshold - t) / threshold))
      return x * x * (3 - 2 * x) * cov
    }

    /*
    THICKENING TAKES THE REST. The staged ramps already have the sun most of the
    way out by the time transmission reaches 0, but "most of the way" is not
    what being inside a kilometre of cloud looks like. Past `coverage` 1 the
    remaining headroom is spent, so at full thickening the sun is gone and the
    ambient is down to a quarter — which is what makes the difference between a
    dark day and no daylight at all.
    */
    const th = this.thickening
    /*
    AND AT FULL THICKENING IT IS NIGHT. Tonio: "ambient isn't being scaled down
    enough when cover gets really high. At 200% it should basically be as dark
    as night."

    A kilometre of cloud overhead does not leave a dim day, it leaves no day —
    so the ambient has to go almost all the way rather than most of the way.
    0.9 takes a 0.5 fill down to 0.05, which is darker than this scene's actual
    night, where the fill stays put and only the moon carries the sun's half.
    */
    const ambientDepth =
      num(this.ambientGloom, 0) + (0.9 - num(this.ambientGloom, 0)) * th
    const sunDepth = num(this.sunGloom, 0) + (1 - num(this.sunGloom, 0)) * th

    const ambient = 1 - ramp(num(this.ambientGloomBelow, 0)) * ambientDepth
    const key = 1 - ramp(num(this.sunGloomBelow, 0)) * sunDepth

    for (const light of scene.lights) {
      const isSun = light === sun
      const isFill = light.getClassName() === 'HemisphericLight'
      if (!isSun && !isFill) continue
      this._dim(light, isSun ? key : ambient)
    }
    // Anything that left the scene, or stopped qualifying, gets itself back.
    for (const light of [...this._borrowed.keys()]) {
      if (scene.lights.includes(light)) continue
      this._borrowed.delete(light)
    }
  }

  /**
   * Scale a light's intensity, BORROWING rather than taking it.
   *
   * `b3d-skybox` drives the sun from the time of day, so capturing an intensity
   * once would freeze the day cycle at whatever o'clock we happened to start.
   * Remember what we last WROTE instead: if the light no longer reads that,
   * somebody else moved it and their value becomes the new base. One comparison
   * a frame, and the two systems compose instead of fighting.
   */
  private _dim(light: BABYLON.Light, factor: number): void {
    let rec = this._borrowed.get(light)
    if (rec == null || light.intensity !== rec.applied) {
      rec = { base: light.intensity, applied: light.intensity }
      this._borrowed.set(light, rec)
    }
    const next = rec.base * factor
    if (!Number.isFinite(next)) return
    light.intensity = next
    rec.applied = next
  }

  /** Give every borrowed light back exactly as it was found. */
  private _releaseLights(): void {
    for (const [light, rec] of this._borrowed) light.intensity = rec.base
    this._borrowed.clear()
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
    this._removeFogLayer?.()
    this._removeFogLayer = null
    this._field = null
    this._releaseLights()
    this.owner?.removeOriginListener(this._onShift)
    this.owner?.removeSceneListener(this._onAddition)
    this._shadowMap?.dispose()
    this._shadowMap = null
    this._shadowTex?.dispose()
    this._shadowTex = null
    this._weatherTex?.dispose()
    this._weatherTex = null
    this.fieldTexture?.dispose()
    this.fieldTexture = undefined
    this.mesh?.dispose()
    this.mesh = undefined
    this.topMesh?.dispose()
    this.topMesh = undefined
    // Memo and terrain cache both belong to the scene being left: a deck moved
    // into another <tosi-b3d> must not keep sampling the old one's terrain.
    this._weatherKey = freshWeatherKey()
    this._liveWeather = null
    this._terrain = null
    super.sceneDispose()
  }
}

export const b3dCloudDeck = B3dCloudDeck.elementCreator({
  tag: 'tosi-b3d-cloud-deck',
})
