/*#
# b3d-crowd

**Many animated figures, one draw call.** The Babylon half of
[[vertex-animation]] — a baker, a material plugin that replays the bake in the
vertex shader, and thin instances so the CPU does nothing per figure per frame.

## Demo — the bench

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dGround, b3dCrowd, slider3d, label3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// BOUND, not literal. The panel is REBUILT whenever it reopens — maximising the
// demo does it — and a control whose `value` is a literal comes back holding
// that literal, so everything you had set is silently lost.
//
// A tosijs leaf passed as `value` is a boxed proxy the control reads and writes
// through, so the panel can be rebuilt any number of times and still show the
// truth. It is also what keeps the flat and in-VR panels agreeing, since both
// bind the same leaf.
//
// (Line comments. A block comment in a fence closes the enclosing doc comment.)
// ONE number, used by both. The bound default and the element's `count` are the
// same fact; written twice, the panel can show a count the crowd does not have.
const FIGURES = 400
// The clips a real rig gets baked with. Six that are different SHAPES, not six
// different speeds — see the note on legibility at distance.
const OMNI_CLIPS = 'walk,run,wave,dance,jump,salute'
const demo = tosi({ crowdBench: { figures: FIGURES, interp: true, skinned: 0, omni: false, shadows: true } })
const s = demo.crowdBench

let crowd = null
let scene = null
let sun = null

const panel = () => [
  label3d({ text: 'Crowd bench' }),
  slider3d({
    // `snap: 1` — whole figures. `step` on a log scale is in DECADES, so it
    // cannot say "integers"; `snap` quantises the value after the scale has
    // been applied, which is exactly the question being asked. Without it the
    // readout would offer 2.5 figures.
    label: 'figures', value: s.figures, min: 1, max: 200000, scale: 'log', snap: 1,
    showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.count = Math.round(v) },
  }),
  // A TOGGLE, not a select. A select needs a popup, and a popup is a second
  // gesture that can fail on its own. Two states want one click anyway.
  toggle3d({
    label: 'omnidude mesh', value: s.omni,
    handleChange: (v) => {
      s.omni = v
      if (!crowd) return
      // omnidude is 0.88m — half a person — so it is baked at twice the size.
      crowd.figureScale = v ? 2 : 1
      crowd.clips = v ? OMNI_CLIPS : ''
      crowd.url = v ? '/omnidude.glb' : ''
    },
  }),
  // SHADOWS ARE A SECOND DRAWING OF EVERY FIGURE (one pass per cascade), so
  // they belong on the bench as a switch rather than as a constant. Off is
  // `activeDistance: 0` — the sun drops every caster beyond that distance, and
  // re-adds them when it grows again. It re-evaluates once a second, so give
  // it a moment before reading the number.
  toggle3d({
    label: 'shadows', value: s.shadows,
    handleChange: (v) => { s.shadows = v; if (sun) sun.activeDistance = v ? 140 : 0 },
  }),
  toggle3d({
    label: 'interpolate frames', value: s.interp,
    handleChange: (v) => { if (crowd) crowd.interpolate = v ? 'on' : 'off' },
  }),
  slider3d({
    label: 'skinned baseline', value: s.skinned, min: 0, max: 400, step: 1, showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.skinned = Math.round(v) },
  }),
  // No instruction rows: a panel is for the controls; the page is for the
  // explanation.
]

crowd = b3dCrowd({ count: FIGURES, spread: 80, bakeFps: 10 })
// Held so the `shadows` toggle can reach it. Assigned as a statement rather
// than inline in the scene, which is the shape the rest of this demo uses.
sun = b3dSun({
  shadowMaxZ: 200, activeDistance: 140,
  shadowTextureSize: 2048, shadowDarkness: 0.25,
})

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    sceneCreated(el) {
      // Sun BEHIND the viewer: a crowd lit from the far side is a crowd of
      // silhouettes, which reads as black figures rather than as a lighting choice.
      orbitCam(el, { alphaDeg: 35.5, betaDeg: 64.2, radius: 85, target: [0, 2, 0] })
    },
  },
  // A GROUND AND A REAL SUN, because a crowd against a skybox has no scale and
  // no contact with anything: the mottle is what tells you the field is 80m
  // across, and the shadows are what put the figures ON it rather than in front
  // of it. (`activeDistance` is 140 rather than the 30m default, which is a
  // character-scale number and would shadow the middle of the field only. And
  // `_nocast` on the ground: it receives, and a ground plane casting into its
  // own shadow map is just acne.)
  sun,
  b3dSkybox({ timeOfDay: 9 }),
  // `groundColor` matters more here than intensity: Babylon's default is BLACK,
  // so every vertical surface — which is most of a standing figure — gets
  // nothing from the ambient light however far you push it.
  b3dLight({ intensity: 0.6, groundColor: '#59604a' }),
  b3dGround({
    meshName: 'ground_nocast',
    width: 160, height: 160,
    color: '#8a9070', texture: 'noise', textureTiles: 9,
  }),
  crowd
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

Drag `figures` up and watch **GPU worst**, not the wall clock. The slider is
LOGARITHMIC and goes to 200,000 on purpose: a load that never bends anything
reads as flat, and then vsync is doing the talking.

### Reading it

The reading is in the **Perf Stats panel** under **Crowd** — figures, draw
calls, this frame, the worst since you last moved the slider, and the budget it
is being judged against. `reset worst` is a button because in a headset there is
no console to clear, and because the worst you care about is the worst since the
last thing you changed.

⚠️ **`wall` is not a cost.** It is the gap between frames, and with vsync on it
reads ~16.7ms however little work you do. A flat 18ms means "we never missed a
frame" — excellent news, and no information about the crowd. `GPU` is the
number: `EXT_disjoint_timer_query` asking the hardware how long it actually
took. Where the extension is missing it says so rather than reporting zero.

⚠️ **No GPU timer in Safari.** WebKit has never shipped
`EXT_disjoint_timer_query` — it is a timing-attack surface — so the GPU line
reads `—` there and no amount of asking will change it. Chrome gives it to you.
Where it is missing the only reading available is the wall clock, which means
the bench can see cost only ONCE YOU ARE OVER BUDGET: under ~16.7ms it can tell
you that you fitted and nothing else. That is often enough (200,000 figures at
33ms is a real measurement) and it is worth knowing the floor is blind.

**Does it actually work?** The shader is the part that fails silently: a VAT
that will not compile leaves a black canvas, which looks exactly like a camera
pointing the wrong way. So **Perf Stats → Crowd** carries a `shader` line:
`READY` once the material has compiled, `compiling…` before it, and it never
leaves the second state if the vertex shader is broken.

### What it fits on a Quest 3

Eyeball readings of where frames start to limit, not instrumented frame times:

- About **750** baked omnidude figures in VR (about 1,000 flat in the headset's browser).
- About **20** skinned rigs before it gets nasty, so a scene is a handful of real actors and everything else is crowd.
- Author a crowd figure for the job (a few hundred vertices), and give it a blob [[shadow-decal]] rather than a shadow cascade.

This bench measures rendering only. Collision, steering and AI are CPU work per
figure per frame, and none of that is instanced away.

## Every figure is independent

`vatState` is per-instance — `(clipStart, clipFrames, phaseOffset,
cyclesPerSecond)` — so no two figures need share anything:

| | |
| --- | --- |
| **where in the clip** | a random phase offset; without it a crowd marches in lockstep, which reads as a bug even though every figure is correct |
| **how fast** | its own rate, scaled by the clip's duration so a 0.7s wave and a 1s walk both play as baked |
| **which clip** | `start` picks one of FOUR out of the shared bake — walk, wave, dance, jump |

The clips are chosen to be told apart **at a hundred metres**, which is the only
test that matters here and rules out most of what reads as variety close up. An
idle fails it: a figure shifting its weight and a figure walking slowly are the
same silhouette from far enough away, so a quarter of the field was doing
something nobody could see. What survives the distance is gross limb position —
legs striding, one arm above the head, both arms up, a body leaving the ground.

Getting there needed a second rotation AXIS. A swing about X is a stride, and
anything built only from it is a walk at some speed; raising an arm is a
rotation about Z, and without it the wave, the dance and the jumping jack all
collapse back into the walk. The vertical bob costs one addition per baked
vertex and carries furthest of all, because a silhouette that changes HEIGHT is
visible when the limbs inside it are a pixel wide.

Walk stays the plurality (`CLIP_MIX`) because a crowd is going somewhere; the
other three split the rest evenly, none of them being a default. And the
durations differ on purpose — identical ones would have every clip turn over
together, and four animations sharing one heartbeat look more synchronised than
one animation does.

None of it costs anything. The clips share one texture, so switching is a change
of two numbers rather than of material, and the CPU still touches nothing once
the crowd is built.

## A real rig, baked

Set `url` and the crowd bakes that GLB instead of the blocky bench figure. The
demo's **omnidude mesh** toggle switches between them live.

It is the rung that was missing. The blocky figure proves the mechanism and
`b3d-biped` is the fully-articulated top end; this is the SAME character a biped
would animate, drawn by the crowd path with no skeleton at all.

The trick is that Babylon will CPU-skin for you. `applySkeleton` writes the
posed vertices into the mesh's own buffers, so a bake is: put the animation at a
frame, ask the skeleton for its matrices, apply, read the positions back. Six of
omnidude's sixteen clips is about 6MB — and after the bake there is no skeleton,
no `AnimationGroup` and no per-figure CPU work left, which is the whole point.

| | |
| --- | --- |
| `url` | a rigged GLB to bake from; empty = the synthetic figure |
| `clips` | which of its clips, comma-separated; empty = all of them |
| `figureScale` | omnidude is 0.88m, so the demo bakes it at `2` |

Two details that are not obvious. The head and body are separate meshes sharing
one material, and they are concatenated into ONE mesh — two would be two draw
calls for the entire crowd, which would undo the only claim this module makes.
And every glTF root carries a handedness mirror, so the baked winding is
reversed to match; without that the crowd is inside-out and reads as a lighting
bug rather than as geometry.

What you give up is the seam: a baked figure cannot retarget, cannot blend to a
clip that was not baked, and has no bones to hang a sword from ([[vertex-animation]]'s
`SocketLayout` is the answer to the last one). Promoting a figure to a named
character means crossing back to a skinned rig, and that crossing wants
designing rather than discovering.

## Where it sits: the third rung of the ambient ladder

Three tiers of "many things", and they are not competitors:

| | what it draws | cost | for |
| --- | --- | --- | --- |
| [[b3d-ambient]] | camera-facing billboards — motes, rain, bubbles | almost nothing | dressing you look past |
| leaves in [[b3d-ambient]] | tumbling two-sided quads, a `SolidParticleSystem` | small | things needing a 3-D attitude |
| **this** | animated MESHES, one draw call | a texture and two fetches | things that must be ALIVE |

A bird is not a billboard: it flaps, it banks, and its silhouette changes. That
is the gap this fills — and `b3d-ambient`'s existing budget allocator is the
right thing to route it through, because it already knows how to switch an
effect OFF rather than thin it, which is the correct answer when a flock will
not fit.

**Fish are the same argument underwater, and the easiest case this substrate
has.** Nobody inspects a fish: it is looked at from ten metres through water, so
it wants ~100 vertices and two clips where a player character wants 1,380 and a
dozen. The medium supplies the LOD — underwater fog already fades the far end on
a curve that is physically motivated rather than a tuned cull distance — and a
school fills a VOLUME, so a few hundred read as far more than the same number
scattered on a field.

## The baseline is the point of comparison

`skinned` spawns N clones of a real rigged GLB, each with its own skeleton and
`AnimationGroup` — which is what a `b3d-biped` does and what the vertex-animated
path deliberately does not.

Run the two side by side at the same count and the RATIO tells you whether a
thing should be an actor or part of the crowd. Its slider stops at 400 rather
than 200,000, which is itself part of the finding.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `count` | `200` | How many figures. One draw call whatever it is |
| `spread` | `60` | Metres across the field they scatter over |
| `bakeFps` | `10` | Frames baked per second of clip — the memory knob |
| `interpolate` | `'on'` | `'off'` snaps to the nearest frame: cheaper, jerkier |
| `url` | `''` | A rigged GLB to BAKE from. Empty = the synthetic bench figure |
| `clips` | `''` | Which of its clips to bake, comma-separated. Empty = all |
| `figureScale` | `1` | Scale applied to the baked figure (omnidude is 0.88m) |
| `skinned` | `0` | How many SKINNED clones to spawn alongside, as the baseline |
| `skinnedUrl` | omnidude on the CDN (`tonio/omnidude/omnidude.glb`) | The GLB the baseline clones |

## Why a plugin and not a ShaderMaterial

A bench that skips lighting measures the wrong thing. `MaterialPluginBase`
injects into the STANDARD material, so these figures are lit, fogged and shadowed
exactly like everything else and the number means something. Same route
[[biome-plugin]] takes, for the same reason.

## What the shader does per vertex

Two texture fetches and a `mix`. Everything else — which clip, how far through
it, how fast — arrives as a per-instance attribute, and `phase` is derived from
a single `vatTime` uniform rather than written per figure per frame. That is the
whole trick: **the CPU touches nothing once the crowd is built.**

## The bench is deliberately synthetic

The figure is generated, not loaded, and its animation is a procedural walk.
That is on purpose: the question is what the RENDERING architecture costs at N,
and loading real assets would fold an asset pipeline into a measurement that is
not about one. Baking from a real skinned GLB (`url`) is the other half, and it
bakes into the same layout.
*/
/*{ "parent": "characters-and-vehicles", "order": 50 }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, sceneDelta } from './b3d-utils.js';
import { Xoshiro128 } from './mersenne-twister.js';
import { assetUrl } from './asset-url.js';
import { framesForClip, vatBytes, vatLayout, vatTexel, } from './vertex-animation.js';
/**
 * Write a bake into two float textures.
 *
 * `sample(vertexIndex, frame)` returns the position and normal for one vertex
 * of one frame; the caller decides where those come from — a procedural walk
 * here, a CPU-skinned GLB next.
 *
 * NEAREST sampling, and no mipmaps: a filtered VAT blends a vertex with its
 * NEIGHBOUR, which is a different vertex of the same figure, and the mesh comes
 * apart in a way that looks like bad weights rather than bad sampling.
 */
export function writeVatTextures(scene, layout, sample) {
    const n = layout.width * layout.height * 4;
    const pos = new Float32Array(n);
    const nor = new Float32Array(n);
    for (let f = 0; f < layout.frameCount; f++) {
        for (let v = 0; v < layout.vertexCount; v++) {
            const { x, y } = vatTexel(layout, v, f);
            const i = (y * layout.width + x) * 4;
            const s = sample(v, f);
            pos[i] = s.p[0];
            pos[i + 1] = s.p[1];
            pos[i + 2] = s.p[2];
            pos[i + 3] = 1;
            nor[i] = s.n[0];
            nor[i + 1] = s.n[1];
            nor[i + 2] = s.n[2];
            nor[i + 3] = 0;
        }
    }
    const make = (data, name) => {
        const t = new BABYLON.RawTexture(data, layout.width, layout.height, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, // no mipmaps
        false, BABYLON.Texture.NEAREST_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_FLOAT);
        t.name = name;
        t.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        return t;
    };
    return { position: make(pos, 'vat-pos'), normal: make(nor, 'vat-nor') };
}
/**
 * Replay a bake in the vertex shader.
 *
 * Injected into the standard material so the figures are lit like everything
 * else — see the note above about a bench that skips lighting.
 */
export class VatPlugin extends BABYLON.MaterialPluginBase {
    bake = null;
    /** Seconds, advanced by the owner. One uniform drives every figure. */
    time = 0;
    /** `false` snaps to the nearest frame — the cheap path for a crowd. */
    interpolate = true;
    constructor(material) {
        super(material, 'Vat', 220, { VAT: false, VAT_LERP: false });
    }
    _on = false;
    get isEnabled() {
        return this._on;
    }
    set isEnabled(v) {
        if (this._on === v)
            return;
        this._on = v;
        this.markAllDefinesAsDirty();
        this._enable(v);
    }
    prepareDefines(defines) {
        defines.VAT = this._on;
        defines.VAT_LERP = this._on && this.interpolate;
    }
    getAttributes(attributes) {
        // The vertex's own index, and the per-instance playback state. Both are
        // buffers on the mesh; neither is touched again after the crowd is built.
        attributes.push('vatIndex');
        attributes.push('vatState');
    }
    getSamplers(samplers) {
        samplers.push('vatPos', 'vatNor');
    }
    getUniforms() {
        return {
            ubo: [
                { name: 'vatInfo', size: 4, type: 'vec4' },
                { name: 'vatTime', size: 1, type: 'float' },
            ],
            vertex: `
        uniform vec4 vatInfo;
        uniform float vatTime;
      `,
        };
    }
    bindForSubMesh(uniformBuffer) {
        const b = this.bake;
        if (!this._on || b == null)
            return;
        uniformBuffer.updateFloat4('vatInfo', b.layout.width, b.layout.height, b.layout.rowsPerFrame, b.layout.vertexCount);
        uniformBuffer.updateFloat('vatTime', this.time);
        uniformBuffer.setTexture('vatPos', b.position);
        uniformBuffer.setTexture('vatNor', b.normal);
    }
    getClassName() {
        return 'VatPlugin';
    }
    getCustomCode(shaderType) {
        if (shaderType !== 'vertex')
            return null;
        return {
            CUSTOM_VERTEX_DEFINITIONS: `#ifdef VAT
        attribute float vatIndex;
        attribute vec4 vatState;
        uniform sampler2D vatPos;
        uniform sampler2D vatNor;

        // Exact texel, plus half — a VAT must never be filtered across
        // neighbours, because the neighbour is a different vertex.
        vec2 vatUv(float vIndex, float frame) {
          float w = vatInfo.x;
          float col = mod(vIndex, w);
          float rowInFrame = floor(vIndex / w);
          float y = frame * vatInfo.z + rowInFrame;
          return (vec2(col, y) + 0.5) / vec2(vatInfo.x, vatInfo.y);
        }
      #endif`,
            CUSTOM_VERTEX_UPDATE_POSITION: `#ifdef VAT
        // vatState = (clipStart, clipFrames, phaseOffset, cyclesPerSecond)
        float vatFrames = max(vatState.y, 1.0);
        float vatPhase = fract(vatState.z + vatTime * vatState.w);
        float vatScaled = vatPhase * vatFrames;
        float vatI = floor(vatScaled);
        float vatA = vatState.x + mod(vatI, vatFrames);
        #ifdef VAT_LERP
          float vatT = vatScaled - vatI;
          float vatB = vatState.x + mod(vatI + 1.0, vatFrames);
          positionUpdated = mix(
            texture2D(vatPos, vatUv(vatIndex, vatA)).xyz,
            texture2D(vatPos, vatUv(vatIndex, vatB)).xyz,
            vatT
          );
          normalUpdated = normalize(mix(
            texture2D(vatNor, vatUv(vatIndex, vatA)).xyz,
            texture2D(vatNor, vatUv(vatIndex, vatB)).xyz,
            vatT
          ));
        #else
          positionUpdated = texture2D(vatPos, vatUv(vatIndex, vatA)).xyz;
          normalUpdated = normalize(texture2D(vatNor, vatUv(vatIndex, vatA)).xyz);
        #endif
      #endif`,
        };
    }
}
/* ------------------------------------------------------------------ *
 * The synthetic figure — see the note about the bench being generated.
 * ------------------------------------------------------------------ */
/** A blocky humanoid: torso, head, two arms, two legs. ~200 vertices. */
function figureParts() {
    return [
        { size: [0.5, 0.7, 0.3], at: [0, 1.15, 0], limb: 0 },
        { size: [0.32, 0.32, 0.32], at: [0, 1.66, 0], limb: 0 },
        { size: [0.16, 0.6, 0.16], at: [-0.36, 1.2, 0], limb: 1 },
        { size: [0.16, 0.6, 0.16], at: [0.36, 1.2, 0], limb: 2 },
        { size: [0.2, 0.8, 0.2], at: [-0.15, 0.4, 0], limb: 3 },
        { size: [0.2, 0.8, 0.2], at: [0.15, 0.4, 0], limb: 4 },
    ];
}
const STILL = { x: 0, z: 0 };
/**
 * Pose one limb, for one clip, at one phase.
 *
 * Two axes rather than one, and that is what the extra clips needed: a swing
 * about X is a stride, and every animation built only from it is a walk at some
 * speed. Raising an arm — a wave, a dance, a jumping jack — is a rotation about
 * Z, and without it the three of them collapse back into the walk.
 *
 * Limb 1 is the LEFT arm (−x) and 2 the right, 3 the left leg and 4 the right,
 * so a positive `z` lifts an odd limb inward and an even one out. The signs
 * below are not arbitrary.
 */
function limbPose(clip, limb, phase) {
    if (limb === 0)
        return STILL;
    const t = phase * Math.PI * 2;
    switch (clip) {
        case 'wave': {
            // One arm ABOVE the head, flapping; the rest of the figure still. The
            // asymmetry is the whole read — there is no other clip where one side
            // does something the other does not.
            if (limb === 2)
                return { x: 0, z: 2.5 + Math.sin(t) * 0.4 };
            if (limb === 1)
                return { x: 0, z: -0.1 };
            return STILL;
        }
        case 'dance': {
            // Both arms up and swaying, legs on the OFFBEAT (twice the rate), so the
            // silhouette is wide at the top and busy at the bottom.
            if (limb === 1)
                return { x: Math.sin(t) * 0.3, z: -(1.8 + Math.sin(t) * 0.5) };
            if (limb === 2)
                return { x: -Math.sin(t) * 0.3, z: 1.8 - Math.sin(t) * 0.5 };
            if (limb === 3)
                return { x: Math.sin(t * 2) * 0.35, z: -0.12 };
            return { x: -Math.sin(t * 2) * 0.35, z: 0.12 };
        }
        case 'jump': {
            // A jumping jack: one sweep out and back per cycle, arms and legs
            // together. `s` runs 0 → 1 → 0, which is the star shape at its middle.
            const s = (1 - Math.cos(t)) / 2;
            if (limb === 1)
                return { x: 0, z: -(0.1 + s * 2.5) };
            if (limb === 2)
                return { x: 0, z: 0.1 + s * 2.5 };
            if (limb === 3)
                return { x: 0, z: -s * 0.55 };
            return { x: 0, z: s * 0.55 };
        }
        default: {
            // Walk: arms oppose legs and left opposes right, which is the whole of
            // why it reads as walking rather than as limbs moving.
            if (limb === 1)
                return { x: Math.sin(t) * 0.5, z: 0 };
            if (limb === 2)
                return { x: -Math.sin(t) * 0.5, z: 0 };
            if (limb === 3)
                return { x: -Math.sin(t) * 0.7, z: 0 };
            return { x: Math.sin(t) * 0.7, z: 0 };
        }
    }
}
/**
 * How far the whole figure leaves the ground.
 *
 * Cheaper than it looks — it is one addition to every baked vertex, no extra
 * frames and no extra texture — and it carries further than any limb, because
 * a silhouette that changes HEIGHT is visible when the limbs inside it are one
 * pixel wide.
 */
function bodyBob(clip, phase) {
    const t = phase * Math.PI * 2;
    if (clip === 'jump')
        return ((1 - Math.cos(t)) / 2) * 0.35;
    if (clip === 'dance')
        return ((1 - Math.cos(t * 2)) / 2) * 0.12;
    if (clip === 'walk')
        return ((1 - Math.cos(t * 2)) / 2) * 0.04;
    return 0;
}
/**
 * How much of the field does each clip, as relative weights.
 *
 * Walking stays the plurality because a crowd is going somewhere; the other
 * three are even, since none of them is the "default" a figure falls back to.
 * Lives next to the clips rather than at the call site so adding a clip is one
 * edit — a mixture that has to be updated in two places is a mixture that
 * silently stops summing.
 */
const CLIP_MIX = {
    walk: 4,
    run: 3,
    wave: 2,
    dance: 2,
    jump: 2,
};
/** Pick a clip for one figure, weighted by `CLIP_MIX`. `r` is in `[0, 1)`. */
function pickClip(clips, r) {
    let total = 0;
    for (const c of clips)
        total += CLIP_MIX[c.name] ?? 1;
    let cut = r * total;
    for (const c of clips) {
        cut -= CLIP_MIX[c.name] ?? 1;
        if (cut < 0)
            return c;
    }
    return clips[clips.length - 1];
}
/**
 * Build the figure mesh, and bake a walk for it.
 *
 * Returns the mesh with its `vatIndex` attribute already attached — the shader
 * needs to know which vertex it is, and WebGL1 has no `gl_VertexID`.
 */
export function buildBenchFigure(scene, bakeFps = 10) {
    const parts = figureParts();
    const boxes = parts.map((p, i) => {
        const b = BABYLON.MeshBuilder.CreateBox(`crowd-part-${i}`, { width: p.size[0], height: p.size[1], depth: p.size[2] }, scene);
        b.position.set(p.at[0], p.at[1], p.at[2]);
        return b;
    });
    const merged = BABYLON.Mesh.MergeMeshes(boxes, true, true, undefined, false, false);
    if (merged == null)
        throw new Error('b3d-crowd: could not build the bench figure');
    merged.name = 'crowd-figure';
    merged.isVisible = false;
    const positions = merged.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const normals = merged.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const vertexCount = positions.length / 3;
    // Which part each vertex belongs to, so the bake can swing it. Boxes merge in
    // order and each contributes 24 vertices.
    const limbOf = new Int32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
        limbOf[v] = parts[Math.min(parts.length - 1, Math.floor(v / 24))].limb;
    }
    /*
    A LIMB PIVOTS AT ITS JOINT, AND A JOINT IS A POINT — not a height.
  
    The first version returned only a Y, which is harmless for the stride (a
    rotation about X through any point on the body's centre line moves the limb
    the same way) and wrong for everything else. Raising an arm is a rotation
    about Z, and about the CENTRE LINE it swings the arm across the chest and out
    the other side instead of lifting it from the shoulder. Tonio: "some of the
    baked animations on the block guy are very messed up (hilariously so in some
    cases). Mostly arms out of whack." Hilarious is the right word — at 132° the
    waving arm ended up where the other arm should be.
    */
    /*
    The arm pivots at its INNER TOP CORNER (0.27), not its own centre line
    (0.36). The torso's edge is at 0.25, so pivoting at the arm's middle swings
    it out of the socket and leaves a finger of daylight at the shoulder — the
    difference between an arm being raised and an arm coming off.
    */
    const pivotOf = (limb) => limb === 1
        ? { x: -0.27, y: 1.5 }
        : limb === 2
            ? { x: 0.27, y: 1.5 }
            : limb === 3
                ? { x: -0.15, y: 0.8 }
                : limb === 4
                    ? { x: 0.15, y: 0.8 }
                    : { x: 0, y: 0 };
    /*
    SEVERAL CLIPS, ONE TEXTURE. `start` offsets each into the shared bake, so
    switching clip is a change of two per-instance numbers rather than a change of
    material — which is what keeps N figures doing different things at one draw
    call. `vertex-animation`'s layout was built for this; it just had nothing to
    hold until now.
  
    Durations differ deliberately. Identical ones would have every clip's phase
    turn over together, and a field of four animations sharing one heartbeat is
    more obviously synchronised than a field of one — `framesForClip` turns each
    duration into the right number of frames, so the cost of the difference is a
    few texels.
    */
    const spec = [
        { name: 'walk', duration: 1 },
        { name: 'wave', duration: 0.7 },
        { name: 'dance', duration: 0.8 },
        { name: 'jump', duration: 0.9 },
    ];
    const clips = [];
    let frameCount = 0;
    for (const { name, duration } of spec) {
        const frames = framesForClip(duration, bakeFps);
        clips.push({ name, start: frameCount, frames, duration, loop: true });
        frameCount += frames;
    }
    // Which clip owns each frame of the bake, so the writer below is a lookup
    // rather than a chain of comparisons that has to be edited per clip.
    const clipOfFrame = [];
    for (const c of clips)
        for (let i = 0; i < c.frames; i++)
            clipOfFrame.push(c);
    const layout = vatLayout(vertexCount, frameCount);
    const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
        const which = clipOfFrame[f] ?? clips[0];
        const name = which.name;
        const phase = (f - which.start) / which.frames;
        const limb = limbOf[v];
        const pose = limbPose(name, limb, phase);
        const lift = bodyBob(name, phase);
        let px = positions[v * 3];
        let py = positions[v * 3 + 1];
        let pz = positions[v * 3 + 2];
        let nx = normals[v * 3];
        let ny = normals[v * 3 + 1];
        let nz = normals[v * 3 + 2];
        // Both rotations happen about the limb's PIVOT — a hip or a shoulder, not
        // the middle of the box. X first (the stride), then Z (the lift), so a
        // raised arm swings in the plane it was raised into.
        const pivot = pivotOf(limb);
        if (pose.x !== 0) {
            const c = Math.cos(pose.x);
            const s2 = Math.sin(pose.x);
            const dy = py - pivot.y;
            py = pivot.y + dy * c - pz * s2;
            pz = dy * s2 + pz * c;
            const my = ny;
            ny = my * c - nz * s2;
            nz = my * s2 + nz * c;
        }
        if (pose.z !== 0) {
            const c = Math.cos(pose.z);
            const s2 = Math.sin(pose.z);
            const dx = px - pivot.x;
            const dy = py - pivot.y;
            px = pivot.x + dx * c - dy * s2;
            py = pivot.y + dx * s2 + dy * c;
            const mx = nx;
            nx = mx * c - ny * s2;
            ny = mx * s2 + ny * c;
        }
        return { p: [px, py + lift, pz], n: [nx, ny, nz] };
    });
    const bake = {
        layout,
        clips,
        position,
        normal,
        bytes: vatBytes(layout),
    };
    // The vertex's own index, as an attribute. Every instance shares it.
    const index = new Float32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++)
        index[v] = v;
    merged.setVerticesData('vatIndex', index, false, 1);
    return { mesh: merged, bake };
}
/**
 * Bake a REAL rigged GLB into a VAT — the intermediate rung.
 *
 * Tonio: *"Can we do an intermediate version where we use vertex animation to
 * animate the omnidude mesh, or is that impractical?"* It is entirely
 * practical, and it is the rung that matters: the blocky bench figure proves
 * the mechanism, a `b3d-biped` is the fully-articulated top end, and this is
 * the same character as the biped, drawn by the crowd path.
 *
 * The trick is that Babylon will CPU-skin a mesh for you. `applySkeleton`
 * writes the posed vertices into the mesh's own buffers, so a bake is: put the
 * animation at a frame, ask the skeleton to compute its matrices, apply it,
 * read the positions back. Sixteen clips of omnidude is a few megabytes, and
 * after it is baked there is no skeleton, no animation group and no per-figure
 * CPU work left — which is the entire point.
 *
 * What it costs is the seam. A baked figure cannot be retargeted, cannot blend
 * to a clip that was not baked, and has no bones to hang a sword from (see
 * `vertex-animation`'s `SocketLayout` for the answer to that one). Promoting a
 * figure to a named character means crossing back to a skinned rig, and that
 * crossing should be designed rather than discovered.
 */
export async function bakeGlbFigure(scene, url, options = {}) {
    const bakeFps = options.bakeFps ?? 10;
    const scale = options.scale ?? 1;
    const slash = url.lastIndexOf('/');
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(url.slice(0, slash + 1), url.slice(slash + 1), scene);
    container.addAllToScene();
    const sources = container.meshes.filter((m) => m.skeleton != null && m.getTotalVertices() > 0);
    const skeleton = sources[0]?.skeleton;
    if (skeleton == null) {
        container.dispose();
        throw new Error(`b3d-crowd: ${url} has no skinned mesh to bake`);
    }
    /*
    WHICH CLIPS, IN THE ORDER ASKED FOR. A name that is not in the file is
    SKIPPED, not defaulted — a bake silently missing the clip you asked for looks
    exactly like a bake that worked, because the other clips still play.
    */
    const wanted = options.clips ?? [];
    const groups = wanted.length > 0
        ? wanted
            .map((n) => container.animationGroups.find((g) => g.name === n))
            .filter((g) => g != null)
        : container.animationGroups;
    if (groups.length === 0) {
        container.dispose();
        throw new Error(`b3d-crowd: ${url} has none of the clips asked for`);
    }
    const vertexCount = sources.reduce((n, m) => n + m.getTotalVertices(), 0);
    const clips = [];
    let frameCount = 0;
    for (const g of groups) {
        // An AnimationGroup's range is in FRAMES at the animation's own rate, which
        // glTF writes as 60 — the seconds are what `framesForClip` needs.
        const fps = g.targetedAnimations[0]?.animation.framePerSecond || 60;
        const duration = Math.max(0.1, (g.to - g.from) / fps);
        const frames = framesForClip(duration, bakeFps);
        clips.push({
            name: g.name,
            start: frameCount,
            frames,
            duration,
            loop: true,
        });
        frameCount += frames;
    }
    // Posed vertices, one entry per baked frame. A few megabytes for the whole
    // bake — read once by `writeVatTextures` and then dropped.
    const posed = [];
    const tmp = new BABYLON.Vector3();
    /*
    A REFLECTION REVERSES ORIENTATION, and every glTF root carries one (Babylon
    puts the handedness flip on `__root__` as a negative scale). Mirroring the
    positions turns the triangle's winding the wrong way round, so it is reversed
    when the merged mesh is built below. Normally Babylon does that for you — it
    flips side orientation when a world matrix has a negative determinant — but a
    bake RESOLVES the transform, so the crowd mesh has an identity matrix and
    there is nothing left for it to flip.
  
    The normals are NOT negated, though it is the obvious next thought and I
    tried it: `getNormalsData` returns them in the mesh's own space and the
    inverse-transpose carries them through the mirror correctly. Negating as well
    lights the whole figure from inside — measurably darker, and it was only
    obvious side by side with a normally-skinned clone.
    */
    for (let ci = 0; ci < groups.length; ci++) {
        const g = groups[ci];
        const clip = clips[ci];
        g.play(true);
        g.pause();
        for (let f = 0; f < clip.frames; f++) {
            g.goToFrame(g.from + ((g.to - g.from) * f) / clip.frames);
            /*
            `true` IS THE WHOLE BAKE. Without it `prepare` returns immediately —
            it early-outs when it has already run for the current RENDER id, and a
            bake loop is entirely inside one render. So every frame gets the pose of
            frame zero, the texture is N copies of one pose, and the crowd renders
            perfectly and stands perfectly still. Tonio: "the omnidude is frozen".
      
            That is the failure mode to remember here: nothing throws, nothing warns,
            the shader is correct and the bake is the right size. It is only wrong
            when you LOOK at it.
            */
            skeleton.prepare(true);
            const p = new Float32Array(vertexCount * 3);
            const n = new Float32Array(vertexCount * 3);
            let o = 0;
            for (const m of sources) {
                const world = m.computeWorldMatrix(true);
                // Normals do NOT transform by the world matrix — under the handedness
                // mirror every glTF root carries, that would point them backwards.
                const normalMatrix = BABYLON.Matrix.Transpose(BABYLON.Matrix.Invert(world));
                /*
                `getPositionData(applySkeleton, applyMorph)` rather than
                `applySkeleton`: it CPU-skins into a copy and hands it back, where the
                older call bakes into the mesh's own buffers — which both destroys the
                bind pose the next frame has to skin from and carries a once-per-frame
                guard of its own.
                */
                const mp = m.getPositionData(true, true);
                const mn = m.getNormalsData(true, true);
                for (let v = 0; v < mp.length; v += 3) {
                    BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(mp[v], mp[v + 1], mp[v + 2], world, tmp);
                    p[o + v] = tmp.x * scale;
                    p[o + v + 1] = tmp.y * scale;
                    p[o + v + 2] = tmp.z * scale;
                    BABYLON.Vector3.TransformNormalFromFloatsToRef(mn[v], mn[v + 1], mn[v + 2], normalMatrix, tmp);
                    tmp.normalize();
                    n[o + v] = tmp.x;
                    n[o + v + 1] = tmp.y;
                    n[o + v + 2] = tmp.z;
                }
                o += mp.length;
            }
            posed.push({ p, n });
        }
        g.stop();
    }
    /*
    ONE MESH OUT OF SEVERAL. omnidude is a head and a body sharing one material,
    and two meshes would be two draw calls for the whole crowd — which would
    undo the only claim this module makes. They are concatenated in the same
    order the bake walks them, so vertex `i` of the merged mesh is vertex `i` of
    the texture by construction rather than by agreement.
    */
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];
    positions.set(posed[0].p);
    normals.set(posed[0].n);
    let vOffset = 0;
    let uvOffset = 0;
    /*
    THE WINDING IS LEFT ALONE, and working out why took a side-by-side render.
  
    Two flips are in play and they cancel. Babylon's glTF loader puts the
    handedness mirror on `__root__` as `scaling.z = -1`, then relies on the
    renderer flipping side orientation for a negative-determinant world matrix;
    it ALSO gives the material `ClockWiseSideOrientation`, where a
    `StandardMaterial` defaults to counter-clockwise. Baking resolves the
    transform — the crowd mesh's matrix is the identity — so the renderer's flip
    goes away, and the material swap supplies exactly one flip in its place.
  
    Reversing the indices as well is a third flip, which is a net inversion: the
    figure renders INSIDE OUT. Not subtly, either — it draws its far surface, so
    a figure facing you shows you the back of its own head. Tonio: "the omnidude
    mesh is flipped inside out". It survived two headless checks because at crowd
    distance an inverted humanoid still has a humanoid silhouette; it took one
    frame of the baked figure beside a normally-skinned clone, both at identity
    rotation, for it to be unmissable.
    */
    for (const m of sources) {
        const mu = m.getVerticesData(BABYLON.VertexBuffer.UVKind);
        if (mu != null)
            uvs.set(mu, uvOffset);
        const mi = m.getIndices() ?? [];
        for (let i = 0; i < mi.length; i++)
            indices.push(vOffset + mi[i]);
        vOffset += m.getTotalVertices();
        uvOffset += m.getTotalVertices() * 2;
    }
    const mesh = new BABYLON.Mesh('crowd-figure', scene);
    const data = new BABYLON.VertexData();
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.indices = indices;
    data.applyToMesh(mesh);
    mesh.isVisible = false;
    const layout = vatLayout(vertexCount, frameCount);
    const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
        const frame = posed[Math.min(posed.length - 1, f)];
        const i = v * 3;
        return {
            p: [frame.p[i], frame.p[i + 1], frame.p[i + 2]],
            n: [frame.n[i], frame.n[i + 1], frame.n[i + 2]],
        };
    });
    const index = new Float32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++)
        index[v] = v;
    mesh.setVerticesData('vatIndex', index, false, 1);
    // The source rig has done its job. Disabled rather than disposed, because the
    // MATERIAL and its texture are what the crowd is about to wear.
    for (const g of container.animationGroups)
        g.stop();
    for (const root of container.rootNodes)
        root.setEnabled(false);
    return {
        mesh,
        bake: { layout, clips, position, normal, bytes: vatBytes(layout) },
        container,
    };
}
/**
 * `<tosi-b3d-crowd>` — N vertex-animated figures in one draw call.
 *
 * The bench for "can we manage an army of 200 bipeds". Change `count` and watch
 * the WORST frame: an average hides the one that causes nausea.
 */
export class B3dCrowd extends B3dChild {
    static preferredTagName = 'tosi-b3d-crowd';
    static initAttributes = {
        /** How many figures. */
        count: 200,
        /** Metres across the field they scatter over. */
        spread: 60,
        /** Frames baked per second of clip — the memory knob. */
        bakeFps: 10,
        /** `'off'` snaps to the nearest frame. */
        interpolate: 'on',
        /**
         * How many SKINNED clones to spawn alongside, as the baseline.
         *
         * The comparison that decides the architecture: a real skinned GLB with its
         * own skeleton and `AnimationGroup` per instance, against the same count of
         * vertex-animated figures. `0` is off.
         */
        skinned: 0,
        /** The GLB the baseline clones. Modest vertex count on purpose. */
        skinnedUrl: assetUrl('tonio/omnidude/omnidude.glb'),
        /**
         * A rigged GLB to BAKE from, instead of the synthetic bench figure.
         *
         * The intermediate rung: the same character a `b3d-biped` would animate
         * with a skeleton, drawn by the crowd path with none. Empty = the blocky
         * figure, which is the honest default for a bench (it has no download and
         * no licence attached to the number it produces).
         */
        url: '',
        /**
         * Which of the GLB's clips to bake, comma-separated. Empty = all of them.
         *
         * Worth naming rather than taking everything: memory is linear in frames,
         * and a rig usually carries clips a crowd has no use for.
         */
        clips: '',
        /** Scale applied to the baked figure. omnidude is 0.88m — half a person. */
        figureScale: 1,
    };
    _mesh;
    _bake;
    _plugin;
    /** Which `url` the live figure was baked from — `''` is the bench figure. */
    _figureUrl = '';
    _baking = false;
    _bakeNote = '';
    _bakeContainer = null;
    _obs = null;
    _built = -1;
    _t = 0;
    _offDebug = null;
    /*
    THE INSTRUMENT. A bench without one is a demo.
  
    Worst frame since the last reset, not an average: an average of sixty good
    frames and one 40ms frame looks fine and is nausea. `PERF-DESIGN.md`'s rule,
    and the reason the reset is a BUTTON — you want the worst since you moved the
    slider, not the worst since the page loaded, and in a headset there is no
    console to clear.
    */
    _worstMs = 0;
    _lastMs = 0;
    _frames = 0;
    /*
    THE DISPLAY'S OWN FLOOR, measured rather than assumed.
  
    The readout used to call anything under 18ms "vsync — not a cost", which bakes
    in a 60Hz monitor. Tonio: "We may also be dealing with a 30fps monitor btw so
    these figures aren't ultra comparable to the ones from previous days." On a
    30Hz display the floor is 33.3ms — so a 33ms reading means the crowd was FREE
    where the old rule called it a cost, and 60ms is two intervals, i.e. one
    missed frame rather than "60ms of work".
  
    The cheapest honest instrument is the fastest frame actually seen: nothing
    renders faster than the swap interval, so the minimum IS the floor. It needs
    no API, and it survives a browser capping the rate for its own reasons — a
    battery saver, a background tab, an external display.
    */
    _floorMs = Infinity;
    /*
    WALL TIME IS NOT COST, and the first version of this bench measured wall time.
  
    Tonio, at four thousand figures: "Performance is flat… 18ms is worst at any
    number of figures." Which is exactly right and was the wrong instrument:
    `getDeltaTime` is the gap BETWEEN frames, and with vsync on that is ~16.7ms
    however little work you do. A flat 18ms says "we never missed a frame", which
    is very good news and says nothing whatever about what the crowd costs.
  
    `EngineInstrumentation.gpuFrameTimeCounter` asks the GPU how long it actually
    took, via `EXT_disjoint_timer_query`. Where the extension is missing the
    reading says so rather than reporting zero — a bench that quietly reports 0ms
    is worse than one that admits it cannot see.
    */
    _instr;
    _sceneInstr;
    _worstGpu = 0;
    /**
     * What the wall clock is entitled to claim, given the display it is on.
     *
     * Three genuinely different cases: paused (recording nothing), sitting ON the
     * floor (we fitted, and that is ALL the wall clock knows), and above it (we
     * missed frames — the one case where the number is a cost). The old version
     * compared against a hard-wired 18ms, which is a 60Hz assumption wearing a
     * measurement's clothes.
     */
    _wallVerdict() {
        if (this.owner?.paused === true)
            return '(PAUSED — not recording)';
        if (!Number.isFinite(this._floorMs))
            return '';
        // 1.2× rather than 1.0: the floor is a minimum over noisy samples, so an
        // exact match is not something a real reading offers.
        if (this._worstMs <= this._floorMs * 1.2)
            return '(at vsync — not a cost)';
        return `(${(this._worstMs / this._floorMs).toFixed(1)}× vsync — MISSING FRAMES)`;
    }
    /** What the bake costs on the GPU, for the readout. */
    get bakeBytes() {
        return this._bake?.bytes ?? 0;
    }
    sceneReady(owner, scene) {
        // The bench figure first, ALWAYS. A baked GLB is a network round trip, and
        // a crowd element that shows nothing until it arrives looks broken for as
        // long as the download takes.
        const { mesh, bake } = buildBenchFigure(scene, this.bakeFps);
        this._useFigure(owner, scene, mesh, bake);
        if (this.url !== '')
            void this._bakeFrom(owner, scene, this.url);
        const instr = new BABYLON.EngineInstrumentation(scene.getEngine());
        instr.captureGPUFrameTime = true;
        this._instr = instr;
        const sceneInstr = new BABYLON.SceneInstrumentation(scene);
        sceneInstr.captureActiveMeshesEvaluationTime = true;
        this._sceneInstr = sceneInstr;
        const gpuMs = () => 
        // Nanoseconds, and `-1` while the query has not resolved yet.
        instr.gpuFrameTimeCounter.current > 0
            ? instr.gpuFrameTimeCounter.current / 1e6
            : -1;
        this._offDebug = owner.addDebugSource({
            name: 'Crowd',
            // `mesh`, because the whole claim is that a crowd IS one mesh.
            icon: 'mesh',
            lines: () => [
                `figures ${this._built}   draws 1   verts ${((this._built * (this._bake?.layout.vertexCount ?? 0)) /
                    1000).toFixed(0)}k`,
                // GPU time is the COST. Wall time only tells you whether it fitted.
                this._worstGpu > 0
                    ? `GPU ${gpuMs() < 0 ? '—' : gpuMs().toFixed(2)}ms   WORST ${this._worstGpu.toFixed(2)}ms`
                    : `GPU — (no timer query on this device)`,
                `wall ${this._lastMs.toFixed(1)}ms  worst ${this._worstMs.toFixed(1)}ms  ${this._wallVerdict()}`,
                /*
                THE FLOOR, AND THE WORST AS A MULTIPLE OF IT. "60ms" on a 30Hz panel is
                not sixty milliseconds of work — it is two swap intervals, so one frame
                was missed. Saying `1.8×` puts the reading in the only unit the wall
                clock actually has.
                */
                Number.isFinite(this._floorMs)
                    ? `vsync floor ${this._floorMs.toFixed(1)}ms (≈${Math.round(1000 / this._floorMs)}Hz)   worst = ${(this._worstMs / this._floorMs).toFixed(1)}× floor`
                    : 'vsync floor — (measuring)',
                `meshEval ${sceneInstr.activeMeshesEvaluationTimeCounter.current.toFixed(2)}ms`,
                this._skinnedWant > 0
                    ? `SKINNED ${this._skinnedRoots.length}/${this._skinnedWant} × ${this._skinnedVerts} verts`
                    : 'skinned baseline off',
                this._skinnedNote,
                `figure ${this._figureUrl === '' ? 'blocks (synthetic)' : this._figureUrl}${this._baking ? ' — baking…' : ''}`,
                this._bakeNote,
                `bake ${((this._bake?.bytes ?? 0) / 1024 / 1024).toFixed(2)}MB  ${this._bake?.layout.frameCount ?? 0} frames  ${this._bake?.clips.length ?? 0} clips (${(this._bake?.clips ?? [])
                    .map((c) => c.name)
                    .join('/')})  interp ${this.interpolate !== 'off' ? 'on' : 'off'}`,
                // 13.9ms is a Quest frame. Flat, the budget is whatever the display
                // gives you, which is the line above rather than a constant — naming a
                // budget beside the number is what makes it a measurement.
                `budget 13.9ms (VR) / one vsync interval (flat)`,
                // The silent failure, made loud. A vertex shader that will not compile
                // never becomes ready, and the canvas simply stays black — which is
                // indistinguishable from a camera pointing the wrong way.
                `shader ${this._mesh?.material?.isReady(this._mesh) === true
                    ? 'READY'
                    : 'compiling…'}`,
            ],
            actions: [
                {
                    label: 'reset worst',
                    handleClick: () => {
                        this._worstMs = 0;
                        this._worstGpu = 0;
                        // The floor goes too: a display can change under you (an external
                        // monitor, a battery saver dropping to 30Hz), and a floor carried
                        // over from before the change makes every later reading a lie.
                        this._floorMs = Infinity;
                        this._frames = 0;
                    },
                },
            ],
        });
        this._obs = scene.onBeforeRenderObservable.add(() => {
            /*
            TWO CLOCKS, and they are not the same one.
      
            The METRIC wants the engine's whole-frame time — that IS the frame, and
            the worst one is the question. The ANIMATION wants `sceneDelta`, because a
            scene observer can run more than once per engine frame (the render loop,
            and again per active camera) and the engine's delta is the whole frame
            EACH time. Using it to advance a clock runs everything at 2× or 4× and
            fails silently: the motion is smooth, just wrong, and it scales with how
            many cameras a scene happens to have.
      
            That is CLAUDE.md's own warning and it cost fourteen call sites in 0.7.0.
            I walked straight into it here.
            */
            const stopped = owner.paused === true || owner.frozen === true;
            const ms = scene.getEngine().getDeltaTime();
            /*
            A PAUSED FRAME IS NOT A MEASUREMENT. Tonio: "pausing kills your timer stat
            accuracy."
      
            A paused scene still renders — that is the point, the panel has to be
            there — but it renders a crowd that is not animating, into a frame whose
            wall clock is measuring how long the user sat looking at it. Both numbers
            are then about the pause rather than about the crowd, and the worst frame,
            which is the one thing this bench exists to report, gets set by the act of
            reading it.
      
            So paused frames record NOTHING and re-arm the warm-up, which also throws
            away the catch-up frame on the way back. `_frames = 0` is doing two jobs
            and both are wanted.
            */
            if (stopped) {
                this._frames = 0;
            }
            else {
                this._lastMs = ms;
                /*
                SKIP THE FIRST FEW. A rebuild, a shader compile and the first upload all
                land in one frame, and reporting that as the worst says the crowd is
                expensive when what was expensive was building it. The bench is about
                the STEADY state.
                */
                if (++this._frames > 10 && ms > this._worstMs)
                    this._worstMs = ms;
                if (this._frames > 10) {
                    if (ms > 0 && ms < this._floorMs)
                        this._floorMs = ms;
                    const g = instr.gpuFrameTimeCounter.current / 1e6;
                    if (g > this._worstGpu)
                        this._worstGpu = g;
                }
            }
            // PAUSE STOPS THEM. It did not, because this clock never consulted it —
            // and a pause that leaves four thousand figures marching is not a pause.
            if (!stopped)
                this._t += sceneDelta(scene);
            if (this._plugin != null)
                this._plugin.time = this._t;
            // A change of source figure is a re-bake, and it is async — so it is
            // guarded rather than queued: the LAST url asked for wins, and one in
            // flight is never cancelled halfway through writing a texture.
            if (!this._baking && this.url !== this._figureUrl) {
                void this._bakeFrom(owner, scene, this.url);
            }
            const wantSkinned = Math.max(0, Math.round(this.skinned));
            if (this._skinnedWant !== wantSkinned) {
                void this._buildSkinned(scene, wantSkinned);
                this._worstGpu = 0;
                this._worstMs = 0;
                this._frames = 0;
            }
            this._pumpSkinned();
            if (this._built !== Math.round(this.count)) {
                this._rebuild();
                // A change of count is a new measurement.
                this._worstMs = 0;
                this._worstGpu = 0;
                this._frames = 0;
            }
            if (this._plugin != null) {
                const want = this.interpolate !== 'off';
                if (this._plugin.interpolate !== want) {
                    this._plugin.interpolate = want;
                    this._plugin.markAllDefinesAsDirty();
                }
            }
        });
    }
    _skinnedRoots = [];
    _skinnedBuilt = -1;
    _skinnedVerts = 0;
    _skinnedWant = 0;
    _skinnedNote = '';
    _container = null;
    /**
     * Adopt a figure — mesh plus bake — as the thing the crowd draws.
     *
     * One path for both sources, because the difference between a synthetic
     * figure and a baked GLB is entirely upstream of here: by this point each is
     * a mesh, a texture pair and a clip table, and everything below (the plugin,
     * the shadow wrapper, the thin instances) is identical. Two paths would have
     * meant the GLB figure quietly missing whichever of them was added later.
     */
    _useFigure(owner, scene, mesh, bake, source) {
        const old = this._mesh;
        const oldMat = old?.material;
        const oldBake = this._bake;
        this._mesh = mesh;
        this._bake = bake;
        const mat = new BABYLON.StandardMaterial('crowd', scene);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.55);
        /*
        THE SOURCE'S TEXTURE ON A STANDARD MATERIAL, not the source material
        itself. glTF gives you PBR, and a crowd is the one place its cost is
        multiplied by everything — two hundred thousand figures is not where you
        spend an energy-conserving BRDF. The albedo map carries the character;
        the shading model does not have to.
        */
        const albedo = source?.albedoTexture ??
            source?.diffuseTexture;
        if (albedo != null) {
            mat.diffuseTexture = albedo;
            mat.diffuseColor = BABYLON.Color3.White();
        }
        const plugin = new VatPlugin(mat);
        plugin.bake = bake;
        plugin.interpolate = this.interpolate !== 'off';
        plugin.isEnabled = true;
        this._plugin = plugin;
        /*
        THE SHADOW HAS TO KNOW ABOUT THE BAKE TOO. A shadow map is rendered with a
        different (depth-only) shader, which knows nothing about a material plugin —
        so by default a crowd of dancers casts a crowd of bind-pose mannequins, and
        a figure mid-jump casts a shadow standing where it took off. A
        `ShadowDepthWrapper` builds the depth pass FROM this material, plugin
        included, so the shadow is the pose.
        */
        mat.shadowDepthWrapper = new BABYLON.ShadowDepthWrapper(mat, scene);
        mesh.material = mat;
        mesh.isVisible = true;
        // The bake already holds world-space-ish positions for the figure, and a
        // thin instance supplies the rest. Bounds must be set by hand or Babylon
        // culls the whole crowd against the ONE figure's box.
        mesh.alwaysSelectAsActiveMesh = true;
        this._built = -1;
        this._rebuild();
        owner.register({ meshes: [mesh] });
        if (old != null && old !== mesh) {
            old.dispose();
            // NOT the textures: an albedo map belongs to the asset container, which
            // outlives this material and may be handed to the next one.
            oldMat?.dispose();
            oldBake?.position.dispose();
            oldBake?.normal.dispose();
        }
    }
    /**
     * Re-bake from a different source, without the crowd disappearing meanwhile.
     *
     * Failure is REPORTED rather than thrown away — a bake that 404s or a GLB
     * with no skin leaves the previous figure on screen, which is correct and is
     * also indistinguishable from "the new one looks the same" unless the panel
     * says so.
     */
    async _bakeFrom(owner, scene, url) {
        this._baking = true;
        this._figureUrl = url;
        this._bakeNote = '';
        try {
            if (url === '') {
                const { mesh, bake } = buildBenchFigure(scene, this.bakeFps);
                this._useFigure(owner, scene, mesh, bake);
            }
            else {
                const names = this.clips
                    .split(',')
                    .map((n) => n.trim())
                    .filter((n) => n !== '');
                const { mesh, bake, container } = await bakeGlbFigure(scene, url, {
                    clips: names,
                    bakeFps: this.bakeFps,
                    scale: this.figureScale,
                });
                // The scene can go away while a GLB is in flight — a doc page being
                // scrolled past is enough — and building into a disposed scene is a
                // crash rather than a wasted download.
                if (scene.isDisposed) {
                    container.dispose();
                    return;
                }
                const previous = this._bakeContainer;
                this._bakeContainer = container;
                this._useFigure(owner, scene, mesh, bake, container.materials[0]);
                previous?.dispose();
            }
        }
        catch (e) {
            this._bakeNote = `BAKE FAILED ${url}: ${String(e).slice(0, 70)}`;
        }
        finally {
            this._baking = false;
            this._worstGpu = 0;
            this._worstMs = 0;
            this._frames = 0;
        }
    }
    _skinnedPrng = new Xoshiro128(7);
    /**
     * Spawn N SKINNED clones — the baseline the whole question turns on.
     *
     * Each carries its own skeleton and `AnimationGroup`, which is what a
     * `b3d-biped` does and what the vertex-animated path deliberately does not.
     * The comparison is the point: if the ratio is small, "actors and crowd" is
     * an unnecessary boundary; if it is large, it is a real one.
     *
     * Loaded once and CLONED, so the measurement is of drawing and animating them
     * rather than of parsing a GLB N times.
     */
    async _buildSkinned(scene, n) {
        this._skinnedWant = n;
        if (n < this._skinnedRoots.length) {
            for (const r of this._skinnedRoots.splice(n))
                r.dispose(false, true);
        }
        if (n === 0) {
            this._skinnedNote = '';
            return;
        }
        if (this._container == null) {
            /*
            SURFACE THE FAILURE. The first version did `void this._buildSkinned(...)`
            and swallowed everything — so a load that 404s or a GLB that will not
            parse produced a slider that silently did nothing, which is exactly what
            it looked like from outside. A bench must say when it cannot measure.
            */
            try {
                const slash = this.skinnedUrl.lastIndexOf('/');
                this._container = await BABYLON.SceneLoader.LoadAssetContainerAsync(this.skinnedUrl.slice(0, slash + 1), this.skinnedUrl.slice(slash + 1), scene);
                this._skinnedVerts =
                    this._container.meshes
                        .find((m) => m.getTotalVertices() > 0)
                        ?.getTotalVertices() ?? 0;
                if (this._skinnedVerts === 0) {
                    this._skinnedNote = `loaded ${this.skinnedUrl} but it has no geometry`;
                }
            }
            catch (e) {
                this._skinnedNote = `FAILED to load ${this.skinnedUrl}: ${String(e).slice(0, 60)}`;
                this._container = null;
            }
        }
    }
    /**
     * Spawn a FEW skinned rigs per frame, never a batch.
     *
     * Instantiating one clones a skeleton and its animation groups, and doing
     * three hundred of them in a loop blocks the main thread for seconds — Tonio:
     * "dragging it to 320 hung everything". That hang is itself a finding about
     * the skinned path and it is also an unusable bench, so the work is spread
     * and the readout says how far it has got.
     */
    _pumpSkinned() {
        const container = this._container;
        if (container == null)
            return;
        const want = this._skinnedWant;
        let budget = 4;
        while (this._skinnedRoots.length < want && budget-- > 0) {
            const i = this._skinnedRoots.length;
            const inst = container.instantiateModelsToScene((name) => `${name}-${i}`, false);
            const root = inst.rootNodes[0];
            if (root == null)
                break;
            const rnd = () => this._skinnedPrng.random();
            root.position.set((rnd() - 0.5) * this.spread, 0, (rnd() - 0.5) * this.spread);
            root.rotation.y = rnd() * Math.PI * 2;
            // Human scale — omnidude is 0.88m, half a person, and half-size figures
            // scattered over 150 metres read as "nothing happened".
            root.scaling.setAll(2);
            this._skinnedRoots.push(root);
            /*
            REGISTER THEM, or the baseline is not the same scene as the crowd. The sun
            learns about casters through `owner.register`, and an instantiated clone
            goes through none of the loaders that would normally do it — so the
            skinned figures stood in the crowd's shadows casting none of their own,
            which reads as a bug in the rig rather than as a missing subscription.
            Disposed clones are pruned by the sun itself (see `b3d-shadows`), so the
            slider can go back down without leaking casters into the shadow map.
            */
            this.owner?.register({
                meshes: root.getChildMeshes().filter((m) => m.getTotalVertices() > 0),
            });
            for (const g of inst.animationGroups) {
                g.play(true);
                g.goToFrame(g.from + (g.to - g.from) * rnd());
            }
        }
        this._skinnedBuilt = this._skinnedRoots.length;
    }
    /**
     * Load the rig the crowd's own figures were baked from, as a skinned asset.
     *
     * ⚠️ IT MUST BE `url`, THE FILE THE BAKE CAME FROM — not `skinnedUrl`.
     *
     * The two are different assets and only one of them has the right clips. I
     * reached for `skinnedUrl` first, because the skinned BASELINE already loads
     * it and reusing that container looked like the tidy move. It is not: the
     * baseline exists to answer "what does a real rig cost", so its file is
     * whatever you want to measure, while the bake's clip names come from `url`.
     *
     * Caught by overlaying a promoted rig on the instance it replaced instead of
     * hiding it. A default crowd is SYNTHETIC BLOCK figures whose clips are
     * generated in code, so the spawned omnidude stood in the same spot in a
     * completely different pose — two figures, two animations, visibly nothing to
     * do with each other. Numerically everything agreed: the clip resolved, the
     * phase was right, the position matched to three decimals. The claim that
     * pose transfers is only true when both sides came from one file, and there
     * is no way to check that from the numbers.
     *
     * So a SYNTHETIC crowd cannot be promoted at all, and says so rather than
     * promoting something that merely stands in the right place. Resolves `false`
     * when there is no rig to load or the load failed; the note is on the debug
     * panel either way.
     */
    async loadRig() {
        const scene = this.owner?.scene;
        if (scene == null)
            return false;
        /*
        ITS OWN CONTAINER, not the baseline's. Sharing `_container` would let
        whichever loaded first decide which file the other one got — the same bug
        as above, arriving from the other direction and just as invisible.
        */
        if (this._rigContainer != null)
            return true;
        const url = this.url;
        if (url === '') {
            this._skinnedNote =
                'no rig to promote to — this crowd is synthetic (set `url`)';
            return false;
        }
        try {
            const slash = url.lastIndexOf('/');
            this._rigContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(url.slice(0, slash + 1), url.slice(slash + 1), scene);
            return true;
        }
        catch (e) {
            this._skinnedNote = `rig load failed: ${e.message}`;
            return false;
        }
    }
    _rigContainer = null;
    /**
     * Figure `i`, as a SKINNED RIG standing exactly where it was, mid-stride.
     *
     * The convenience half of the swap, and the reason it belongs here rather
     * than in every consumer: matching the pose needs `poseOf`, matching the
     * place needs `transformOf`, and matching the CLIP needs the rig to be the
     * file the bake came from. All three live here. A consumer doing it by hand
     * gets the first two right and discovers the third when their zombie plays
     * the wrong animation.
     *
     * Hides the instance as it goes, so there is never a frame with both.
     * `dispose()` on the returned handle puts the figure back in the crowd.
     *
     * Still not a policy: WHICH figure, and when, is the caller's entire
     * business. This only makes the swap itself cheap to get right.
     */
    spawnPosed(i) {
        const container = this._rigContainer;
        const at = this.transformOf(i);
        const pose = this.poseOf(i);
        if (container == null || at == null || pose == null)
            return null;
        const inst = container.instantiateModelsToScene((name) => `${name}-swap${i}`, false);
        const root = inst.rootNodes[0];
        if (root == null)
            return null;
        root.position.set(at.x, at.y, at.z);
        root.rotation.y = at.yaw;
        root.scaling.setAll(this.figureScale);
        /*
        START IT WHERE THE INSTANCE ALREADY IS, which is the whole trick.
    
        `from`/`to` are FRAMES, so the phase — a 0..1 fraction of the clip — has to
        be converted into this group's own frame range. Starting at `from` instead
        would be a visible snap on every promotion, and the kind that reads as the
        swap being broken rather than as one line of arithmetic being missing.
        */
        const group = inst.animationGroups.find((g) => g.name.replace(/^Clone of /, '').split('-swap')[0] === pose.clip) ?? null;
        if (group != null) {
            const at0 = group.from + (group.to - group.from) * pose.t;
            /*
            AND AT ITS OWN SPEED, which is the half that is easy to miss.
      
            Every figure gets a randomised rate at build time — `0.7 + rnd * 0.6`
            cycles per second, scaled by clip duration — precisely so a crowd does not
            march in lockstep. Start the clone at speed 1 and it plays the clip at the
            speed it was AUTHORED at, so the two agree for exactly one frame and then
            drift apart in front of you.
      
            `rate` is cycles per second and the clip's own natural rate is
            `1 / duration`, so the ratio between them is `rate * duration`.
      
            Found by overlaying the rig on the instance rather than hiding it: the
            pose matched at the instant of the swap and separated visibly a second
            later, which is the one failure a still screenshot at the moment of
            promotion would have called a success.
            */
            const clip = this._bake?.clips.find((c) => c.name === pose.clip);
            const speed = clip != null && clip.duration > 0 ? pose.rate * clip.duration : 1;
            group.start(true, speed, at0, group.to);
            group.goToFrame(at0);
        }
        this.setFigureHidden(i, true);
        this.owner?.register({ meshes: root.getChildMeshes() });
        return {
            root,
            group,
            dispose: () => {
                for (const g of inst.animationGroups)
                    g.dispose();
                root.dispose(false, true);
                this.setFigureHidden(i, false);
            },
        };
    }
    /** Per-instance buffers, kept so the swap API can read and edit them. */
    _matrices = null;
    _state = null;
    /** Figures currently taken out of the crowd → the matrix they had. */
    _hidden = new Map();
    /** How many figures are in the crowd right now. Indices are `0..count-1`. */
    get figureCount() {
        return this._built > 0 ? this._built : 0;
    }
    /**
     * WHICH CLIP FIGURE `i` IS PLAYING, AND HOW FAR THROUGH — the whole point.
     *
     * This is the half of a crowd→skinned swap that only the crowd can answer,
     * and the half that normally makes such a swap look terrible. A LOD
     * transition usually founders on reconstructing pose: you know where the
     * thing is, not what it was doing. Here it was never lost — `vatState` is
     * literally `(clipStart, clipFrames, phaseOffset, cyclesPerSecond)`, so the
     * clip and the phase are a lookup and a `fract`.
     *
     * Start a skinned `AnimationGroup` on `clip` at `t` (a 0..1 fraction of the
     * clip) and the two are in the same pose at the same instant. Nothing to
     * blend, nothing to cross-fade, no snap.
     *
     * WHEN to swap is deliberately not here — see the note on `setFigureHidden`.
     */
    poseOf(i) {
        const st = this._state;
        const bake = this._bake;
        if (st == null || bake == null || i < 0 || i >= this.figureCount)
            return null;
        const start = st[i * 4];
        const clip = bake.clips.find((c) => c.start === start) ?? bake.clips[0];
        if (clip == null)
            return null;
        const phase = st[i * 4 + 2];
        const rate = st[i * 4 + 3];
        // The same expression the vertex shader runs, so the answer is the pose on
        // screen rather than a plausible reconstruction of it.
        const t = (phase + this._t * rate) % 1;
        return { clip: clip.name, t: t < 0 ? t + 1 : t, rate };
    }
    /**
     * Where figure `i` is standing, and which way it faces.
     *
     * Read out of the instance matrix rather than recomputed from the seed: the
     * buffer is the truth, and a consumer that places a rig from a recomputed
     * position gets a figure that is almost in the right place, which is worse
     * than obviously wrong.
     */
    transformOf(i) {
        const m = this._matrices;
        if (m == null || i < 0 || i >= this.figureCount)
            return null;
        const o = i * 16;
        // Column-major: translation is [12,13,14]; yaw from the forward basis.
        return {
            x: m[o + 12],
            y: m[o + 13],
            z: m[o + 14],
            yaw: Math.atan2(m[o + 8], m[o + 10]),
        };
    }
    /**
     * Take a figure out of the crowd, or put it back.
     *
     * The other half of the swap, and everything it does NOT do is deliberate.
     * There is no promotion budget here, no radius, no hysteresis and no rule
     * about what happens to a figure that dies while promoted — those depend on
     * the game. A horde promotes whatever can reach you, a battle promotes the
     * unit you selected regardless of distance, a parade promotes whoever the
     * camera is following; any rule shipped here would be wrong for two of the
     * three, and wrong invisibly. Tonio: *"leave the rules for switching to
     * skinned models to the consumer since it will be more likely decided on
     * specifics."*
     *
     * Hiding collapses the instance's matrix to zero scale, which is a
     * zero-area triangle and therefore nothing rasterised. The original matrix is
     * kept so `false` restores it exactly.
     *
     * ⚠️ IT REWRITES THE MATRIX BUFFER, so the cost is proportional to the WHOLE
     * crowd, not to the one figure: 64 bytes × count per call. At the sizes this
     * is for — promote a handful out of a few thousand — that is tens of
     * kilobytes and fine. It would not be fine on the 200,000-figure bench, and
     * the cheaper fix if that ever matters is a per-instance visibility
     * attribute, so a hide writes one float instead of sixteen.
     */
    setFigureHidden(i, hidden) {
        const m = this._matrices;
        const mesh = this._mesh;
        if (m == null || mesh == null || i < 0 || i >= this.figureCount)
            return;
        const was = this._hidden.get(i);
        if (hidden) {
            if (was != null)
                return;
            this._hidden.set(i, m.slice(i * 16, i * 16 + 16));
            for (let k = 0; k < 16; k++)
                m[i * 16 + k] = 0;
        }
        else {
            if (was == null)
                return;
            m.set(was, i * 16);
            this._hidden.delete(i);
        }
        mesh.thinInstanceBufferUpdated('matrix');
    }
    /** Is figure `i` currently taken out? */
    isFigureHidden(i) {
        return this._hidden.has(i);
    }
    /**
     * The figures nearest a point, nearest first.
     *
     * A QUERY, not a policy — it answers "who is close", not "who should be
     * promoted". It is here because the alternative is a consumer looping every
     * figure and calling `transformOf` on each, which is the O(n) mistake this
     * substrate exists to avoid: reading the buffer directly costs a subtract
     * and a compare per figure with no allocation.
     *
     * `maxDistance` is the real economy — it rejects on squared distance before
     * anything else happens, so a horde of ten thousand costs ten thousand cheap
     * rejections rather than ten thousand sorts.
     */
    nearestFigures(point, options = {}) {
        const m = this._matrices;
        const n = this.figureCount;
        if (m == null || n === 0)
            return [];
        const want = Math.max(0, Math.round(options.count ?? 8));
        if (want === 0)
            return [];
        const far = options.maxDistance ?? Infinity;
        const far2 = Number.isFinite(far) ? far * far : Infinity;
        const keepHidden = options.includeHidden === true;
        const found = [];
        for (let i = 0; i < n; i++) {
            if (!keepHidden && this._hidden.has(i))
                continue;
            const o = i * 16;
            const dx = m[o + 12] - point.x;
            const dy = m[o + 13] - point.y;
            const dz = m[o + 14] - point.z;
            const d = dx * dx + dy * dy + dz * dz;
            if (d > far2)
                continue;
            found.push({ i, d });
        }
        found.sort((a, b) => a.d - b.d);
        return found.slice(0, want).map((f) => f.i);
    }
    /**
     * Lay the crowd out and hand the GPU its per-instance state.
     *
     * Called only when the COUNT changes — never per frame. That is the whole
     * claim being measured: once built, the CPU does nothing per figure.
     */
    _rebuild() {
        const mesh = this._mesh;
        const bake = this._bake;
        if (mesh == null || bake == null)
            return;
        const n = Math.max(1, Math.round(this.count));
        this._built = n;
        const matrices = new Float32Array(n * 16);
        const state = new Float32Array(n * 4);
        // Kept, because the swap API reads them — see `poseOf`. A rebuild discards
        // whatever was hidden: the figures are new ones, and a hidden index from
        // the old layout would name a different body.
        this._matrices = matrices;
        this._state = state;
        this._hidden.clear();
        const m = BABYLON.Matrix.Identity();
        // A deterministic scatter — the same crowd every run, so two measurements
        // are of the same picture.
        /*
        A REAL PRNG, because the hand-rolled LCG here was broken above ~20k.
    
        `seed * 1103515245` is a DOUBLE multiply: past 2^53 the low bits are simply
        gone, so masking them back out with `& 0x7fffffff` reads noise that repeats.
        The visible symptom is figures landing on top of each other — Tonio: "About
        20,000 or so it doesn't seem to get more crowded", which is exactly what a
        degenerate sequence looks like from outside.
    
        A proper seeded generator does not have that failure. It was the Mersenne
        Twister; since 0.8.4 it is `Xoshiro128`, the engine behind `PRNG`, which is
        as good statistically and far cheaper to construct.
        */
        const prng = new Xoshiro128(1);
        const rnd = () => prng.random();
        const side = this.spread;
        for (let i = 0; i < n; i++) {
            const x = (rnd() - 0.5) * side;
            const z = (rnd() - 0.5) * side;
            BABYLON.Matrix.RotationYToRef(rnd() * Math.PI * 2, m);
            m.setTranslationFromFloats(x, 0, z);
            m.copyToArray(matrices, i * 16);
            /*
            A CLIP PER FIGURE, not per crowd. The bake holds several and `start` picks
            one, so a field can be a mixture at no cost — the material never changes.
      
            Weighted rather than even (see `CLIP_MIX`): walking stays the plurality
            because a crowd is going somewhere, and the other three split the rest.
            */
            const clip = pickClip(bake.clips, rnd());
            state[i * 4] = clip.start;
            state[i * 4 + 1] = clip.frames;
            // A phase OFFSET per figure, or two hundred soldiers march in lockstep —
            // which reads as a bug even though every one of them is correct.
            state[i * 4 + 2] = rnd();
            /*
            And its own RATE. Scaled by the clip's duration so a 0.7s wave and a 1s
            walk both play at the speed they were baked at: `phase` is normalised, so
            cycles-per-second has to carry the difference or the shorter clip runs
            fast — which would look like a bug in the wave rather than an error in
            the units.
            */
            state[i * 4 + 3] =
                (0.7 + rnd() * 0.6) / (clip.duration > 0 ? clip.duration : 1);
        }
        mesh.thinInstanceSetBuffer('matrix', matrices, 16, true);
        mesh.thinInstanceSetBuffer('vatState', state, 4, true);
    }
    sceneDispose() {
        const scene = this.owner?.scene;
        if (scene != null && this._obs != null) {
            scene.onBeforeRenderObservable.remove(this._obs);
        }
        this._obs = null;
        this._offDebug?.();
        this._offDebug = null;
        for (const r of this._skinnedRoots)
            r.dispose(false, true);
        this._skinnedRoots = [];
        this._container?.dispose();
        this._container = null;
        this._rigContainer?.dispose();
        this._rigContainer = null;
        this._bakeContainer?.dispose();
        this._bakeContainer = null;
        this._instr?.dispose();
        this._sceneInstr?.dispose();
        this._instr = undefined;
        this._sceneInstr = undefined;
        this._bake?.position.dispose();
        this._bake?.normal.dispose();
        this._mesh?.material?.dispose();
        this._mesh?.dispose();
        this._mesh = undefined;
        this._bake = undefined;
        this._plugin = undefined;
        super.sceneDispose();
    }
}
export const b3dCrowd = B3dCrowd.elementCreator();
//# sourceMappingURL=b3d-crowd.js.map