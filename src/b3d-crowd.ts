/*#
# b3d-crowd

**Many animated figures, one draw call.** The Babylon half of
[[vertex-animation]] — a baker, a material plugin that replays the bake in the
vertex shader, and thin instances so the CPU does nothing per figure per frame.

## Demo — the bench

Drag `figures` up and watch **GPU worst**, not the wall clock. The slider is
LOGARITHMIC and goes to 200,000 on purpose: the first version stopped at 4000
and the answer came back "flat, 18ms at any number", which is what you measure
when the load never bends anything and vsync is doing the talking.

⚠️ **No GPU timer in Safari.** WebKit has never shipped
`EXT_disjoint_timer_query` — it is a timing-attack surface — so the GPU line
reads `—` there and no amount of asking will change it. Chrome gives it to you.
Where it is missing the only reading available is the wall clock, which means
the bench can see cost only ONCE YOU ARE OVER BUDGET: under ~16.7ms it can tell
you that you fitted and nothing else. That is often enough (200,000 figures at
33ms is a real measurement) and it is worth knowing the floor is blind.

⚠️ **`wall` is not a cost.** It is the gap between frames, and with vsync on it
reads ~16.7ms however little work you do. A flat 18ms means "we never missed a
frame" — excellent news, and no information about the crowd. `GPU` is the
number: `EXT_disjoint_timer_query` asking the hardware how long it actually
took. Where the extension is missing it says so rather than reporting zero.

The reading is in the **Perf Stats panel** under **Crowd** — figures, draw
calls, this frame, the worst since you last moved the slider, and the budget it
is being judged against. `reset worst` is a button because in a headset there is
no console to clear, and because the worst you care about is the worst since the
last thing you changed.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dGround, b3dCrowd, slider3d, select3d, label3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// BOUND, not literal. The panel is REBUILT whenever it reopens — maximising the
// demo does it — and a control whose `value` is a literal comes back holding
// that literal, so everything you had set is silently lost. Tonio: "the
// settings for the panel aren't properly bound so on refresh the current values
// get lost."
//
// A tosijs leaf passed as `value` is a boxed proxy the control reads and writes
// through, so the panel can be rebuilt any number of times and still show the
// truth. It is also what keeps the flat and in-VR panels agreeing, since both
// bind the same leaf.
//
// (Line comments. A block comment in a fence closes the enclosing doc comment —
// the third time this file has taught me that.)
// ONE number, used by both. The bound default and the element's `count` are the
// same fact, and writing it twice is how the panel came up saying 2000 over a
// crowd of 200 — a control that lies about the thing it controls, and no way to
// tell except by counting figures.
const FIGURES = 400
// The clips a real rig gets baked with. Six that are different SHAPES, not six
// different speeds — see the note on legibility at distance.
const OMNI_CLIPS = 'walk,run,wave,dance,jump,salute'
const demo = tosi({ crowdBench: { figures: FIGURES, interp: true, skinned: 0, figure: 'blocks' } })
const s = demo.crowdBench

let crowd = null
let scene = null

const panel = () => [
  label3d({ text: 'Crowd bench' }),
  slider3d({
    label: 'figures', value: s.figures, min: 1, max: 200000, scale: 'log', showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.count = Math.round(v) },
  }),
  select3d({
    label: 'figure', value: s.figure, options: ['blocks', 'omnidude'],
    handleChange: (v) => {
      s.figure = v
      if (!crowd) return
      // omnidude is 0.88m — half a person. See CLAUDE.md on scale.
      crowd.figureScale = v === 'omnidude' ? 2 : 1
      crowd.clips = v === 'omnidude' ? OMNI_CLIPS : ''
      crowd.url = v === 'omnidude' ? '/omnidude.glb' : ''
    },
  }),
  toggle3d({
    label: 'interpolate frames', value: s.interp,
    handleChange: (v) => { if (crowd) crowd.interpolate = v ? 'on' : 'off' },
  }),
  slider3d({
    label: 'skinned baseline', value: s.skinned, min: 0, max: 400, step: 1, showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.skinned = Math.round(v) },
  }),
  label3d({ text: 'Perf Stats → Crowd for the numbers', muted: true }),
  label3d({ text: 'omnidude = the SAME rig a biped uses, baked', muted: true }),
]

crowd = b3dCrowd({ count: FIGURES, spread: 80, bakeFps: 10 })

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    sceneCreated(el) {
      // Sun BEHIND the viewer. The first version had the camera looking into it,
      // and a crowd lit from the far side is a crowd of silhouettes — which
      // read as black figures rather than as a lighting choice.
      orbitCam(el, { alpha: 0.62, beta: 1.12, radius: 85, target: [0, 2, 0] })
    },
  },
  // A GROUND AND A REAL SUN, because a crowd against a skybox has no scale and
  // no contact with anything. The checker is a ruler — it is how you see that
  // the field is 80m across — and the shadows are what put the figures ON it
  // rather than in front of it. `_nocast` on the ground: it receives, and a
  // ground plane casting into its own shadow map is just acne.
  // `activeDistance` defaults to 30m, which is a character-scale scene — here
  // it would shadow the middle of the field and nothing else.
  b3dSun({
    shadowMaxZ: 200, activeDistance: 140,
    shadowTextureSize: 2048, shadowDarkness: 0.25,
  }),
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

## Does it actually work?

The shader is the part that fails silently: a VAT that will not compile leaves a
black canvas, which looks exactly like a camera pointing the wrong way.

So the demo above reports it. **Perf Stats → Crowd** carries a `shader` line —
`READY` once the material has compiled, `compiling…` before it, and it never
leaves the second state if the vertex shader is broken.

That is where the check lives now. It used to be a `test` fence with a scene of
its own, which was a mistake three times over: the block rendered EMPTY whatever
it did, it cost the page a second WebGL context (Safari counts those tightly),
and an empty rectangle under the words "does it actually work?" answers them
wrongly no matter what the paragraph beside it says. Tonio reported it blank
three times, which is the signal that documentation was not the fix.

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

Tonio: *"Can we do an intermediate version where we use vertex animation to
animate the omnidude mesh, or is that impractical?"* Entirely practical — set
`url` and the crowd bakes that GLB instead of the blocky bench figure. The
demo's **figure** control switches between them live.

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
| [[ambient-leaves]] | tumbling two-sided quads, a `SolidParticleSystem` | small | things needing a 3-D attitude |
| **this** | animated MESHES, one draw call | a texture and two fetches | things that must be ALIVE |

A bird is not a billboard: it flaps, it banks, and its silhouette changes. That
is the gap this fills — and `b3d-ambient`'s existing budget allocator is the
right thing to route it through, because it already knows how to switch an
effect OFF rather than thin it, which is the correct answer when a flock will
not fit.

## The target, and what it means that we cleared it

The game this was built to answer for is a virtual miniatures battle. Tonio's
original ran on an Amiga 500 — 7MHz, 320×200, 16 colours, about 10fps — where a
unit of regulars was 15 figures and one of irregulars 7, and an army was three
to nine units laid out three wide. So:

| | |
| --- | --- |
| largest army | 9 units × 15 = **135 figures** |
| a whole battle | **~270** |
| measured here | **200,000 at 33ms** |
| headroom | **~740×** |

That is not "we can do it". That is the constraint having moved somewhere else
entirely, which is the outcome worth acting on rather than celebrating.

**So figure COUNT should stop shaping the design.** The Amiga's answer to 270
figures was two or three animation states and 4-bit sprites; ours does not have
to be, and the budget freed should go where this project's north star says it
goes — *agents and reactions, not vertices* (`AI-DESIGN.md`). At 270 figures
every one of them can afford a real sensorium, its own equipment via
[[vertex-animation|sockets]], and a bake rate high enough that clip blending is
not a luxury reserved for wildlife.

**And the skinned baseline has now been read, which settles it the other way.**

| | figures | |
| --- | --- | --- |
| vertex-animated | **200,000** | at 33ms |
| skinned rigs | **~50** | before it gets brutal |

About **4000×**, measured by Tonio in Safari on a work laptop. I had speculated
the opposite — that 270 was so far inside the envelope a skinned `b3d-biped`
would simply handle the battle, making this substrate a fauna tool. It will not:
270 is five times past where the skinned path stops being comfortable.

So **"actors and crowd" is a real boundary**, and the vertex-animated path is
needed for the battle after all, not merely for birds.

⚠️ And ~50 is the FLOOR, not the ceiling of the problem. The baseline spawns
bare rigs — mesh, skeleton, `AnimationGroup` — with no controller, no collision,
no camera rig and no state machine. A real `b3d-biped` is 2342 lines of
per-instance update on top of that, so the number of actual bipeds is smaller
than fifty, and by an amount nobody has measured.

## ⚠️ Rendering is not the expensive part, and this bench only measures rendering

Tonio: *"I imagine things like collision detection and so on could vastly
outweigh the animation costs."* Almost certainly, and it is worth being explicit
that **this bench cannot see any of it**. One draw call is a claim about the
GPU; collision, steering and AI are CPU work per figure per frame, and that is
the cost that does not get instanced away. A result of 200,000 at 33ms says the
drawing is free. It says nothing about the thinking.

### The original game already had the answer

*"In the original game the figures were walking on a virtual game board and
basically offset within a square, so basically collision detection was just were
you trying to enter an occupied square."*

That is not a concession to a 7MHz 68000 — it is the right design, and it should
be copied rather than out-grown:

| | grid occupancy | continuous collision |
| --- | --- | --- |
| cost of a move | **O(1)** — is that cell taken? | broadphase + narrowphase against neighbours |
| cost at N figures | **O(N)** | O(N·k), and k grows with density |
| formations | fall out — a rank IS a row of cells | emergent, and fight the solver |
| "can I stand there?" | a lookup | a query with a tolerance you tune forever |

A figure being *offset within* its square is what buys the look back: the
occupancy is discrete and the pose is continuous, so it reads as a crowd rather
than as a chessboard. That separation is the whole trick, and it is worth
writing down before anyone reaches for a physics engine.

`world-topology.ts` already carries the coordinate-free half of this idea
(places, portals, containment), and `terrain-grid.ts` the tile maths. A battle
grid is closer to those than it is to `b3d-collisions`.

## The baseline is the point of comparison

`skinned` spawns N clones of a real rigged GLB, each with its own skeleton and
`AnimationGroup` — which is what a `b3d-biped` does and what the vertex-animated
path deliberately does not. Tonio: *"the old omnidude mesh had a modest vertex
count. That might let you test a skinned mesh without much effort."*

Run the two side by side at the same count and the RATIO is the answer to
whether "actors and crowd" is a real boundary or an unnecessary one. Its slider
stops at 400 rather than 200,000, which is itself part of the finding.

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
| `skinnedUrl` | `'/omnidude.glb'` | The GLB the baseline clones |

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
not about one. Baking from a real skinned GLB is the next step, and the layout
it bakes into is already fixed and tested.
*/
/*{ "parent": "Performance", "order": 119 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta } from './b3d-utils.js'
import { MersenneTwister } from './mersenne-twister.js'
import type { B3d } from './tosi-b3d.js'
import {
  framesForClip,
  vatBytes,
  vatLayout,
  vatTexel,
  type VatClip,
  type VatLayout,
} from './vertex-animation.js'

/** A baked animation set: the textures, their layout, and what is in them. */
export interface VatBake {
  layout: VatLayout
  clips: VatClip[]
  position: BABYLON.RawTexture
  normal: BABYLON.RawTexture
  /** Bytes on the GPU — the number that decides whether this scales. */
  bytes: number
}

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
export function writeVatTextures(
  scene: BABYLON.Scene,
  layout: VatLayout,
  sample: (
    vertexIndex: number,
    frame: number
  ) => { p: [number, number, number]; n: [number, number, number] }
): { position: BABYLON.RawTexture; normal: BABYLON.RawTexture } {
  const n = layout.width * layout.height * 4
  const pos = new Float32Array(n)
  const nor = new Float32Array(n)
  for (let f = 0; f < layout.frameCount; f++) {
    for (let v = 0; v < layout.vertexCount; v++) {
      const { x, y } = vatTexel(layout, v, f)
      const i = (y * layout.width + x) * 4
      const s = sample(v, f)
      pos[i] = s.p[0]
      pos[i + 1] = s.p[1]
      pos[i + 2] = s.p[2]
      pos[i + 3] = 1
      nor[i] = s.n[0]
      nor[i + 1] = s.n[1]
      nor[i + 2] = s.n[2]
      nor[i + 3] = 0
    }
  }
  const make = (data: Float32Array, name: string) => {
    const t = new BABYLON.RawTexture(
      data,
      layout.width,
      layout.height,
      BABYLON.Engine.TEXTUREFORMAT_RGBA,
      scene,
      false, // no mipmaps
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      BABYLON.Engine.TEXTURETYPE_FLOAT
    )
    t.name = name
    t.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
    t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    return t
  }
  return { position: make(pos, 'vat-pos'), normal: make(nor, 'vat-nor') }
}

/**
 * Replay a bake in the vertex shader.
 *
 * Injected into the standard material so the figures are lit like everything
 * else — see the note above about a bench that skips lighting.
 */
export class VatPlugin extends BABYLON.MaterialPluginBase {
  bake: VatBake | null = null
  /** Seconds, advanced by the owner. One uniform drives every figure. */
  time = 0
  /** `false` snaps to the nearest frame — the cheap path for a crowd. */
  interpolate = true

  constructor(material: BABYLON.Material) {
    super(material, 'Vat', 220, { VAT: false, VAT_LERP: false })
  }

  private _on = false
  get isEnabled(): boolean {
    return this._on
  }
  set isEnabled(v: boolean) {
    if (this._on === v) return
    this._on = v
    this.markAllDefinesAsDirty()
    this._enable(v)
  }

  prepareDefines(defines: Record<string, unknown>): void {
    defines.VAT = this._on
    defines.VAT_LERP = this._on && this.interpolate
  }

  getAttributes(attributes: string[]): void {
    // The vertex's own index, and the per-instance playback state. Both are
    // buffers on the mesh; neither is touched again after the crowd is built.
    attributes.push('vatIndex')
    attributes.push('vatState')
  }

  getSamplers(samplers: string[]): void {
    samplers.push('vatPos', 'vatNor')
  }

  getUniforms(): {
    ubo: Array<{ name: string; size: number; type: string }>
    vertex: string
  } {
    return {
      ubo: [
        { name: 'vatInfo', size: 4, type: 'vec4' },
        { name: 'vatTime', size: 1, type: 'float' },
      ],
      vertex: `
        uniform vec4 vatInfo;
        uniform float vatTime;
      `,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    const b = this.bake
    if (!this._on || b == null) return
    uniformBuffer.updateFloat4(
      'vatInfo',
      b.layout.width,
      b.layout.height,
      b.layout.rowsPerFrame,
      b.layout.vertexCount
    )
    uniformBuffer.updateFloat('vatTime', this.time)
    uniformBuffer.setTexture('vatPos', b.position)
    uniformBuffer.setTexture('vatNor', b.normal)
  }

  getClassName(): string {
    return 'VatPlugin'
  }

  getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== 'vertex') return null
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
    }
  }
}

/* ------------------------------------------------------------------ *
 * The synthetic figure — see the note about the bench being generated.
 * ------------------------------------------------------------------ */

/** A blocky humanoid: torso, head, two arms, two legs. ~200 vertices. */
function figureParts(): Array<{
  size: [number, number, number]
  at: [number, number, number]
  /** Which limb, so the walk can swing it. `0` = still. */
  limb: number
}> {
  return [
    { size: [0.5, 0.7, 0.3], at: [0, 1.15, 0], limb: 0 },
    { size: [0.32, 0.32, 0.32], at: [0, 1.66, 0], limb: 0 },
    { size: [0.16, 0.6, 0.16], at: [-0.36, 1.2, 0], limb: 1 },
    { size: [0.16, 0.6, 0.16], at: [0.36, 1.2, 0], limb: 2 },
    { size: [0.2, 0.8, 0.2], at: [-0.15, 0.4, 0], limb: 3 },
    { size: [0.2, 0.8, 0.2], at: [0.15, 0.4, 0], limb: 4 },
  ]
}

/**
 * The four clips, which are chosen to be told apart at a HUNDRED METRES.
 *
 * That is the only test that matters for a crowd, and it rules out most of what
 * would read as variety up close. An idle fails it — a figure shifting its
 * weight and a figure walking slowly are the same silhouette from far enough
 * away, so a quarter of the field was doing something nobody could see. What
 * survives the distance is gross limb position: legs striding, an arm above the
 * head, both arms up, a body leaving the ground.
 */
export type CrowdClip = 'walk' | 'wave' | 'dance' | 'jump'

/** A limb's angle about each axis: `x` swings it fore/aft, `z` lifts it out. */
interface LimbPose {
  x: number
  z: number
}

const STILL: LimbPose = { x: 0, z: 0 }

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
function limbPose(clip: CrowdClip, limb: number, phase: number): LimbPose {
  if (limb === 0) return STILL
  const t = phase * Math.PI * 2
  switch (clip) {
    case 'wave': {
      // One arm ABOVE the head, flapping; the rest of the figure still. The
      // asymmetry is the whole read — there is no other clip where one side
      // does something the other does not.
      if (limb === 2) return { x: 0, z: 2.3 + Math.sin(t) * 0.45 }
      if (limb === 1) return { x: 0, z: -0.12 }
      return STILL
    }
    case 'dance': {
      // Both arms up and swaying, legs on the OFFBEAT (twice the rate), so the
      // silhouette is wide at the top and busy at the bottom.
      if (limb === 1)
        return { x: Math.sin(t) * 0.3, z: -(1.8 + Math.sin(t) * 0.5) }
      if (limb === 2)
        return { x: -Math.sin(t) * 0.3, z: 1.8 - Math.sin(t) * 0.5 }
      if (limb === 3) return { x: Math.sin(t * 2) * 0.35, z: -0.12 }
      return { x: -Math.sin(t * 2) * 0.35, z: 0.12 }
    }
    case 'jump': {
      // A jumping jack: one sweep out and back per cycle, arms and legs
      // together. `s` runs 0 → 1 → 0, which is the star shape at its middle.
      const s = (1 - Math.cos(t)) / 2
      if (limb === 1) return { x: 0, z: -(0.1 + s * 2.5) }
      if (limb === 2) return { x: 0, z: 0.1 + s * 2.5 }
      if (limb === 3) return { x: 0, z: -s * 0.4 }
      return { x: 0, z: s * 0.4 }
    }
    default: {
      // Walk: arms oppose legs and left opposes right, which is the whole of
      // why it reads as walking rather than as limbs moving.
      if (limb === 1) return { x: Math.sin(t) * 0.5, z: 0 }
      if (limb === 2) return { x: -Math.sin(t) * 0.5, z: 0 }
      if (limb === 3) return { x: -Math.sin(t) * 0.7, z: 0 }
      return { x: Math.sin(t) * 0.7, z: 0 }
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
function bodyBob(clip: CrowdClip, phase: number): number {
  const t = phase * Math.PI * 2
  if (clip === 'jump') return ((1 - Math.cos(t)) / 2) * 0.35
  if (clip === 'dance') return ((1 - Math.cos(t * 2)) / 2) * 0.12
  if (clip === 'walk') return ((1 - Math.cos(t * 2)) / 2) * 0.04
  return 0
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
const CLIP_MIX: Record<string, number> = {
  walk: 4,
  run: 3,
  wave: 2,
  dance: 2,
  jump: 2,
}

/** Pick a clip for one figure, weighted by `CLIP_MIX`. `r` is in `[0, 1)`. */
function pickClip(clips: readonly VatClip[], r: number): VatClip {
  let total = 0
  for (const c of clips) total += CLIP_MIX[c.name] ?? 1
  let cut = r * total
  for (const c of clips) {
    cut -= CLIP_MIX[c.name] ?? 1
    if (cut < 0) return c
  }
  return clips[clips.length - 1]
}

/**
 * Build the figure mesh, and bake a walk for it.
 *
 * Returns the mesh with its `vatIndex` attribute already attached — the shader
 * needs to know which vertex it is, and WebGL1 has no `gl_VertexID`.
 */
export function buildBenchFigure(
  scene: BABYLON.Scene,
  bakeFps = 10
): { mesh: BABYLON.Mesh; bake: VatBake } {
  const parts = figureParts()
  const boxes = parts.map((p, i) => {
    const b = BABYLON.MeshBuilder.CreateBox(
      `crowd-part-${i}`,
      { width: p.size[0], height: p.size[1], depth: p.size[2] },
      scene
    )
    b.position.set(p.at[0], p.at[1], p.at[2])
    return b
  })
  const merged = BABYLON.Mesh.MergeMeshes(
    boxes,
    true,
    true,
    undefined,
    false,
    false
  )
  if (merged == null)
    throw new Error('b3d-crowd: could not build the bench figure')
  merged.name = 'crowd-figure'
  merged.isVisible = false

  const positions = merged.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
  const normals = merged.getVerticesData(BABYLON.VertexBuffer.NormalKind)!
  const vertexCount = positions.length / 3

  // Which part each vertex belongs to, so the bake can swing it. Boxes merge in
  // order and each contributes 24 vertices.
  const limbOf = new Int32Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) {
    limbOf[v] = parts[Math.min(parts.length - 1, Math.floor(v / 24))].limb
  }
  const pivotOf = (limb: number): number =>
    limb === 1 || limb === 2 ? 1.5 : limb >= 3 ? 0.8 : 0

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
  const spec: Array<{ name: CrowdClip; duration: number }> = [
    { name: 'walk', duration: 1 },
    { name: 'wave', duration: 0.7 },
    { name: 'dance', duration: 0.8 },
    { name: 'jump', duration: 0.9 },
  ]
  const clips: VatClip[] = []
  let frameCount = 0
  for (const { name, duration } of spec) {
    const frames = framesForClip(duration, bakeFps)
    clips.push({ name, start: frameCount, frames, duration, loop: true })
    frameCount += frames
  }
  // Which clip owns each frame of the bake, so the writer below is a lookup
  // rather than a chain of comparisons that has to be edited per clip.
  const clipOfFrame: VatClip[] = []
  for (const c of clips) for (let i = 0; i < c.frames; i++) clipOfFrame.push(c)
  const layout = vatLayout(vertexCount, frameCount)

  const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
    const which = clipOfFrame[f] ?? clips[0]
    const name = which.name as CrowdClip
    const phase = (f - which.start) / which.frames
    const limb = limbOf[v]
    const pose = limbPose(name, limb, phase)
    const lift = bodyBob(name, phase)
    let px = positions[v * 3]
    let py = positions[v * 3 + 1]
    let pz = positions[v * 3 + 2]
    let nx = normals[v * 3]
    let ny = normals[v * 3 + 1]
    let nz = normals[v * 3 + 2]
    // Both rotations happen about the limb's PIVOT — a hip or a shoulder, not
    // the middle of the box. X first (the stride), then Z (the lift), so a
    // raised arm swings in the plane it was raised into.
    const pivot = pivotOf(limb)
    if (pose.x !== 0) {
      const c = Math.cos(pose.x)
      const s2 = Math.sin(pose.x)
      const dy = py - pivot
      py = pivot + dy * c - pz * s2
      pz = dy * s2 + pz * c
      const my = ny
      ny = my * c - nz * s2
      nz = my * s2 + nz * c
    }
    if (pose.z !== 0) {
      const c = Math.cos(pose.z)
      const s2 = Math.sin(pose.z)
      const dy = py - pivot
      const dx = px
      px = dx * c - dy * s2
      py = pivot + dx * s2 + dy * c
      const mx = nx
      nx = mx * c - ny * s2
      ny = mx * s2 + ny * c
    }
    return { p: [px, py + lift, pz], n: [nx, ny, nz] }
  })

  const bake: VatBake = {
    layout,
    clips,
    position,
    normal,
    bytes: vatBytes(layout),
  }

  // The vertex's own index, as an attribute. Every instance shares it.
  const index = new Float32Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) index[v] = v
  merged.setVerticesData('vatIndex', index, false, 1)

  return { mesh: merged, bake }
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
export async function bakeGlbFigure(
  scene: BABYLON.Scene,
  url: string,
  options: { clips?: readonly string[]; bakeFps?: number; scale?: number } = {}
): Promise<{
  mesh: BABYLON.Mesh
  bake: VatBake
  container: BABYLON.AssetContainer
}> {
  const bakeFps = options.bakeFps ?? 10
  const scale = options.scale ?? 1
  const slash = url.lastIndexOf('/')
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    url.slice(0, slash + 1),
    url.slice(slash + 1),
    scene
  )
  container.addAllToScene()
  const sources = container.meshes.filter(
    (m) => m.skeleton != null && m.getTotalVertices() > 0
  ) as BABYLON.Mesh[]
  const skeleton = sources[0]?.skeleton
  if (skeleton == null) {
    container.dispose()
    throw new Error(`b3d-crowd: ${url} has no skinned mesh to bake`)
  }

  /*
  WHICH CLIPS, IN THE ORDER ASKED FOR. A name that is not in the file is
  SKIPPED, not defaulted — a bake silently missing the clip you asked for looks
  exactly like a bake that worked, because the other clips still play.
  */
  const wanted = options.clips ?? []
  const groups =
    wanted.length > 0
      ? (wanted
          .map((n) => container.animationGroups.find((g) => g.name === n))
          .filter((g) => g != null) as BABYLON.AnimationGroup[])
      : container.animationGroups
  if (groups.length === 0) {
    container.dispose()
    throw new Error(`b3d-crowd: ${url} has none of the clips asked for`)
  }

  const vertexCount = sources.reduce((n, m) => n + m.getTotalVertices(), 0)
  const clips: VatClip[] = []
  let frameCount = 0
  for (const g of groups) {
    // An AnimationGroup's range is in FRAMES at the animation's own rate, which
    // glTF writes as 60 — the seconds are what `framesForClip` needs.
    const fps = g.targetedAnimations[0]?.animation.framePerSecond || 60
    const duration = Math.max(0.1, (g.to - g.from) / fps)
    const frames = framesForClip(duration, bakeFps)
    clips.push({
      name: g.name,
      start: frameCount,
      frames,
      duration,
      loop: true,
    })
    frameCount += frames
  }

  // Posed vertices, one entry per baked frame. A few megabytes for the whole
  // bake — read once by `writeVatTextures` and then dropped.
  const posed: Array<{ p: Float32Array; n: Float32Array }> = []
  const tmp = new BABYLON.Vector3()
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
    const g = groups[ci]
    const clip = clips[ci]
    g.play(true)
    g.pause()
    for (let f = 0; f < clip.frames; f++) {
      g.goToFrame(g.from + ((g.to - g.from) * f) / clip.frames)
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
      skeleton.prepare(true)
      const p = new Float32Array(vertexCount * 3)
      const n = new Float32Array(vertexCount * 3)
      let o = 0
      for (const m of sources) {
        const world = m.computeWorldMatrix(true)
        // Normals do NOT transform by the world matrix — under the handedness
        // mirror every glTF root carries, that would point them backwards.
        const normalMatrix = BABYLON.Matrix.Transpose(
          BABYLON.Matrix.Invert(world)
        )
        /*
        `getPositionData(applySkeleton, applyMorph)` rather than
        `applySkeleton`: it CPU-skins into a copy and hands it back, where the
        older call bakes into the mesh's own buffers — which both destroys the
        bind pose the next frame has to skin from and carries a once-per-frame
        guard of its own.
        */
        const mp = m.getPositionData(true, true)!
        const mn = m.getNormalsData(true, true)!
        for (let v = 0; v < mp.length; v += 3) {
          BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
            mp[v],
            mp[v + 1],
            mp[v + 2],
            world,
            tmp
          )
          p[o + v] = tmp.x * scale
          p[o + v + 1] = tmp.y * scale
          p[o + v + 2] = tmp.z * scale
          BABYLON.Vector3.TransformNormalFromFloatsToRef(
            mn[v],
            mn[v + 1],
            mn[v + 2],
            normalMatrix,
            tmp
          )
          tmp.normalize()
          n[o + v] = tmp.x
          n[o + v + 1] = tmp.y
          n[o + v + 2] = tmp.z
        }
        o += mp.length
      }
      posed.push({ p, n })
    }
    g.stop()
  }

  /*
  ONE MESH OUT OF SEVERAL. omnidude is a head and a body sharing one material,
  and two meshes would be two draw calls for the whole crowd — which would
  undo the only claim this module makes. They are concatenated in the same
  order the bake walks them, so vertex `i` of the merged mesh is vertex `i` of
  the texture by construction rather than by agreement.
  */
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices: number[] = []
  positions.set(posed[0].p)
  normals.set(posed[0].n)
  let vOffset = 0
  let uvOffset = 0
  const mirrored = sources[0].computeWorldMatrix(true).determinant() < 0
  for (const m of sources) {
    const mu = m.getVerticesData(BABYLON.VertexBuffer.UVKind)
    if (mu != null) uvs.set(mu, uvOffset)
    const mi = m.getIndices() ?? []
    // A mirrored root flips the winding with it; without this the whole crowd
    // is inside-out and reads as a lighting bug.
    for (let i = 0; i < mi.length; i += 3) {
      indices.push(
        vOffset + mi[i],
        vOffset + mi[i + (mirrored ? 2 : 1)],
        vOffset + mi[i + (mirrored ? 1 : 2)]
      )
    }
    vOffset += m.getTotalVertices()
    uvOffset += m.getTotalVertices() * 2
  }

  const mesh = new BABYLON.Mesh('crowd-figure', scene)
  const data = new BABYLON.VertexData()
  data.positions = positions as unknown as number[]
  data.normals = normals as unknown as number[]
  data.uvs = uvs as unknown as number[]
  data.indices = indices
  data.applyToMesh(mesh)
  mesh.isVisible = false

  const layout = vatLayout(vertexCount, frameCount)
  const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
    const frame = posed[Math.min(posed.length - 1, f)]
    const i = v * 3
    return {
      p: [frame.p[i], frame.p[i + 1], frame.p[i + 2]],
      n: [frame.n[i], frame.n[i + 1], frame.n[i + 2]],
    }
  })

  const index = new Float32Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) index[v] = v
  mesh.setVerticesData('vatIndex', index, false, 1)

  // The source rig has done its job. Disabled rather than disposed, because the
  // MATERIAL and its texture are what the crowd is about to wear.
  for (const g of container.animationGroups) g.stop()
  for (const root of container.rootNodes) root.setEnabled(false)

  return {
    mesh,
    bake: { layout, clips, position, normal, bytes: vatBytes(layout) },
    container,
  }
}

/**
 * `<tosi-b3d-crowd>` — N vertex-animated figures in one draw call.
 *
 * The bench for "can we manage an army of 200 bipeds". Change `count` and watch
 * the WORST frame: an average hides the one that causes nausea.
 */
export class B3dCrowd extends B3dChild {
  static preferredTagName = 'tosi-b3d-crowd'

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
    skinnedUrl: '/omnidude.glb',
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
  }

  declare count: number
  declare spread: number
  declare bakeFps: number
  declare interpolate: string
  declare skinned: number
  declare skinnedUrl: string
  declare url: string
  declare clips: string
  declare figureScale: number

  private _mesh?: BABYLON.Mesh
  private _bake?: VatBake
  private _plugin?: VatPlugin
  /** Which `url` the live figure was baked from — `''` is the bench figure. */
  private _figureUrl = ''
  private _baking = false
  private _bakeNote = ''
  private _bakeContainer: BABYLON.AssetContainer | null = null
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _built = -1
  private _t = 0
  private _offDebug: (() => void) | null = null
  /*
  THE INSTRUMENT. A bench without one is a demo.

  Worst frame since the last reset, not an average: an average of sixty good
  frames and one 40ms frame looks fine and is nausea. `PERF-DESIGN.md`'s rule,
  and the reason the reset is a BUTTON — you want the worst since you moved the
  slider, not the worst since the page loaded, and in a headset there is no
  console to clear.
  */
  private _worstMs = 0
  private _lastMs = 0
  private _frames = 0
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
  private _instr?: BABYLON.EngineInstrumentation
  private _sceneInstr?: BABYLON.SceneInstrumentation
  private _worstGpu = 0

  /** What the bake costs on the GPU, for the readout. */
  get bakeBytes(): number {
    return this._bake?.bytes ?? 0
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    // The bench figure first, ALWAYS. A baked GLB is a network round trip, and
    // a crowd element that shows nothing until it arrives looks broken for as
    // long as the download takes.
    const { mesh, bake } = buildBenchFigure(scene, this.bakeFps)
    this._useFigure(owner, scene, mesh, bake)
    if (this.url !== '') void this._bakeFrom(owner, scene, this.url)

    const instr = new BABYLON.EngineInstrumentation(scene.getEngine())
    instr.captureGPUFrameTime = true
    this._instr = instr
    const sceneInstr = new BABYLON.SceneInstrumentation(scene)
    sceneInstr.captureActiveMeshesEvaluationTime = true
    this._sceneInstr = sceneInstr

    const gpuMs = (): number =>
      // Nanoseconds, and `-1` while the query has not resolved yet.
      instr.gpuFrameTimeCounter.current > 0
        ? instr.gpuFrameTimeCounter.current / 1e6
        : -1

    this._offDebug = owner.addDebugSource({
      name: 'Crowd',
      // `mesh`, because the whole claim is that a crowd IS one mesh.
      icon: 'mesh',
      lines: () => [
        `figures ${this._built}   draws 1   verts ${(
          (this._built * (this._bake?.layout.vertexCount ?? 0)) /
          1000
        ).toFixed(0)}k`,
        // GPU time is the COST. Wall time only tells you whether it fitted.
        this._worstGpu > 0
          ? `GPU ${
              gpuMs() < 0 ? '—' : gpuMs().toFixed(2)
            }ms   WORST ${this._worstGpu.toFixed(2)}ms`
          : `GPU — (no timer query on this device)`,
        `wall ${this._lastMs.toFixed(1)}ms  worst ${this._worstMs.toFixed(
          1
        )}ms  ${this._worstMs < 18 ? '(vsync — not a cost)' : ''}`,
        `meshEval ${sceneInstr.activeMeshesEvaluationTimeCounter.current.toFixed(
          2
        )}ms`,
        this._skinnedWant > 0
          ? `SKINNED ${this._skinnedRoots.length}/${this._skinnedWant} × ${this._skinnedVerts} verts`
          : 'skinned baseline off',
        this._skinnedNote,
        `figure ${
          this._figureUrl === '' ? 'blocks (synthetic)' : this._figureUrl
        }${this._baking ? ' — baking…' : ''}`,
        this._bakeNote,
        `bake ${((this._bake?.bytes ?? 0) / 1024 / 1024).toFixed(2)}MB  ${
          this._bake?.layout.frameCount ?? 0
        } frames  ${this._bake?.clips.length ?? 0} clips (${(
          this._bake?.clips ?? []
        )
          .map((c) => c.name)
          .join('/')})  interp ${this.interpolate !== 'off' ? 'on' : 'off'}`,
        // 13.9ms is a Quest frame; 16.7 is 60Hz flat. Naming the budget beside
        // the number is what makes it a measurement rather than a readout.
        `budget 13.9ms (VR) / 16.7ms (flat)`,
        // The silent failure, made loud. A vertex shader that will not compile
        // never becomes ready, and the canvas simply stays black — which is
        // indistinguishable from a camera pointing the wrong way.
        `shader ${
          this._mesh?.material?.isReady(this._mesh) === true
            ? 'READY'
            : 'compiling…'
        }`,
      ],
      actions: [
        {
          label: 'reset worst',
          handleClick: () => {
            this._worstMs = 0
            this._worstGpu = 0
            this._frames = 0
          },
        },
      ],
    })

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
      const ms = scene.getEngine().getDeltaTime()
      this._lastMs = ms
      /*
      SKIP THE FIRST FEW. A rebuild, a shader compile and the first upload all
      land in one frame, and reporting that as the worst says the crowd is
      expensive when what was expensive was building it. The bench is about the
      STEADY state.
      */
      if (++this._frames > 10 && ms > this._worstMs) this._worstMs = ms
      if (this._frames > 10) {
        const g = instr.gpuFrameTimeCounter.current / 1e6
        if (g > this._worstGpu) this._worstGpu = g
      }
      // PAUSE STOPS THEM. It did not, because this clock never consulted it —
      // and a pause that leaves four thousand figures marching is not a pause.
      if (owner.paused !== true) this._t += sceneDelta(scene)
      if (this._plugin != null) this._plugin.time = this._t
      // A change of source figure is a re-bake, and it is async — so it is
      // guarded rather than queued: the LAST url asked for wins, and one in
      // flight is never cancelled halfway through writing a texture.
      if (!this._baking && this.url !== this._figureUrl) {
        void this._bakeFrom(owner, scene, this.url)
      }
      const wantSkinned = Math.max(0, Math.round(this.skinned))
      if (this._skinnedWant !== wantSkinned) {
        void this._buildSkinned(scene, wantSkinned)
        this._worstGpu = 0
        this._worstMs = 0
        this._frames = 0
      }
      this._pumpSkinned()
      if (this._built !== Math.round(this.count)) {
        this._rebuild()
        // A change of count is a new measurement.
        this._worstMs = 0
        this._worstGpu = 0
        this._frames = 0
      }
      if (this._plugin != null) {
        const want = this.interpolate !== 'off'
        if (this._plugin.interpolate !== want) {
          this._plugin.interpolate = want
          this._plugin.markAllDefinesAsDirty()
        }
      }
    })
  }

  private _skinnedRoots: BABYLON.TransformNode[] = []
  private _skinnedBuilt = -1
  private _skinnedVerts = 0
  private _skinnedWant = 0
  private _skinnedNote = ''
  private _container: BABYLON.AssetContainer | null = null
  /**
   * Adopt a figure — mesh plus bake — as the thing the crowd draws.
   *
   * One path for both sources, because the difference between a synthetic
   * figure and a baked GLB is entirely upstream of here: by this point each is
   * a mesh, a texture pair and a clip table, and everything below (the plugin,
   * the shadow wrapper, the thin instances) is identical. Two paths would have
   * meant the GLB figure quietly missing whichever of them was added later.
   */
  private _useFigure(
    owner: B3d,
    scene: BABYLON.Scene,
    mesh: BABYLON.Mesh,
    bake: VatBake,
    source?: BABYLON.Material | null
  ): void {
    const old = this._mesh
    const oldMat = old?.material
    const oldBake = this._bake
    this._mesh = mesh
    this._bake = bake

    const mat = new BABYLON.StandardMaterial('crowd', scene)
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    mat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.55)
    /*
    THE SOURCE'S TEXTURE ON A STANDARD MATERIAL, not the source material
    itself. glTF gives you PBR, and a crowd is the one place its cost is
    multiplied by everything — two hundred thousand figures is not where you
    spend an energy-conserving BRDF. The albedo map carries the character;
    the shading model does not have to.
    */
    const albedo =
      (source as BABYLON.PBRMaterial | undefined)?.albedoTexture ??
      (source as BABYLON.StandardMaterial | undefined)?.diffuseTexture
    if (albedo != null) {
      mat.diffuseTexture = albedo
      mat.diffuseColor = BABYLON.Color3.White()
    }
    const plugin = new VatPlugin(mat)
    plugin.bake = bake
    plugin.interpolate = this.interpolate !== 'off'
    plugin.isEnabled = true
    this._plugin = plugin
    /*
    THE SHADOW HAS TO KNOW ABOUT THE BAKE TOO. A shadow map is rendered with a
    different (depth-only) shader, which knows nothing about a material plugin —
    so by default a crowd of dancers casts a crowd of bind-pose mannequins, and
    a figure mid-jump casts a shadow standing where it took off. A
    `ShadowDepthWrapper` builds the depth pass FROM this material, plugin
    included, so the shadow is the pose.
    */
    mat.shadowDepthWrapper = new BABYLON.ShadowDepthWrapper(mat, scene)
    mesh.material = mat
    mesh.isVisible = true
    // The bake already holds world-space-ish positions for the figure, and a
    // thin instance supplies the rest. Bounds must be set by hand or Babylon
    // culls the whole crowd against the ONE figure's box.
    mesh.alwaysSelectAsActiveMesh = true

    this._built = -1
    this._rebuild()
    owner.register({ meshes: [mesh] })

    if (old != null && old !== mesh) {
      old.dispose()
      // NOT the textures: an albedo map belongs to the asset container, which
      // outlives this material and may be handed to the next one.
      oldMat?.dispose()
      oldBake?.position.dispose()
      oldBake?.normal.dispose()
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
  private async _bakeFrom(
    owner: B3d,
    scene: BABYLON.Scene,
    url: string
  ): Promise<void> {
    this._baking = true
    this._figureUrl = url
    this._bakeNote = ''
    try {
      if (url === '') {
        const { mesh, bake } = buildBenchFigure(scene, this.bakeFps)
        this._useFigure(owner, scene, mesh, bake)
      } else {
        const names = this.clips
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n !== '')
        const { mesh, bake, container } = await bakeGlbFigure(scene, url, {
          clips: names,
          bakeFps: this.bakeFps,
          scale: this.figureScale,
        })
        // The scene can go away while a GLB is in flight — a doc page being
        // scrolled past is enough — and building into a disposed scene is a
        // crash rather than a wasted download.
        if (scene.isDisposed) {
          container.dispose()
          return
        }
        const previous = this._bakeContainer
        this._bakeContainer = container
        this._useFigure(owner, scene, mesh, bake, container.materials[0])
        previous?.dispose()
      }
    } catch (e) {
      this._bakeNote = `BAKE FAILED ${url}: ${String(e).slice(0, 70)}`
    } finally {
      this._baking = false
      this._worstGpu = 0
      this._worstMs = 0
      this._frames = 0
    }
  }

  private _skinnedPrng = new MersenneTwister(7)

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
  private async _buildSkinned(scene: BABYLON.Scene, n: number): Promise<void> {
    this._skinnedWant = n
    if (n < this._skinnedRoots.length) {
      for (const r of this._skinnedRoots.splice(n)) r.dispose(false, true)
    }
    if (n === 0) {
      this._skinnedNote = ''
      return
    }
    if (this._container == null) {
      /*
      SURFACE THE FAILURE. The first version did `void this._buildSkinned(...)`
      and swallowed everything — so a load that 404s or a GLB that will not
      parse produced a slider that silently did nothing, which is exactly what
      it looked like from outside. A bench must say when it cannot measure.
      */
      try {
        const slash = this.skinnedUrl.lastIndexOf('/')
        this._container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          this.skinnedUrl.slice(0, slash + 1),
          this.skinnedUrl.slice(slash + 1),
          scene
        )
        this._skinnedVerts =
          this._container.meshes
            .find((m) => m.getTotalVertices() > 0)
            ?.getTotalVertices() ?? 0
        if (this._skinnedVerts === 0) {
          this._skinnedNote = `loaded ${this.skinnedUrl} but it has no geometry`
        }
      } catch (e) {
        this._skinnedNote = `FAILED to load ${this.skinnedUrl}: ${String(
          e
        ).slice(0, 60)}`
        this._container = null
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
  private _pumpSkinned(): void {
    const container = this._container
    if (container == null) return
    const want = this._skinnedWant
    let budget = 4
    while (this._skinnedRoots.length < want && budget-- > 0) {
      const i = this._skinnedRoots.length
      const inst = container.instantiateModelsToScene(
        (name) => `${name}-${i}`,
        false
      )
      const root = inst.rootNodes[0] as BABYLON.TransformNode | undefined
      if (root == null) break
      const rnd = () => this._skinnedPrng.random()
      root.position.set(
        (rnd() - 0.5) * this.spread,
        0,
        (rnd() - 0.5) * this.spread
      )
      root.rotation.y = rnd() * Math.PI * 2
      // Human scale — omnidude is 0.88m, half a person, and half-size figures
      // scattered over 150 metres read as "nothing happened".
      root.scaling.setAll(2)
      this._skinnedRoots.push(root)
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
      })
      for (const g of inst.animationGroups) {
        g.play(true)
        g.goToFrame(g.from + (g.to - g.from) * rnd())
      }
    }
    this._skinnedBuilt = this._skinnedRoots.length
  }

  /**
   * Lay the crowd out and hand the GPU its per-instance state.
   *
   * Called only when the COUNT changes — never per frame. That is the whole
   * claim being measured: once built, the CPU does nothing per figure.
   */
  private _rebuild(): void {
    const mesh = this._mesh
    const bake = this._bake
    if (mesh == null || bake == null) return
    const n = Math.max(1, Math.round(this.count))
    this._built = n

    const matrices = new Float32Array(n * 16)
    const state = new Float32Array(n * 4)
    const m = BABYLON.Matrix.Identity()
    // A deterministic scatter — the same crowd every run, so two measurements
    // are of the same picture.
    /*
    A REAL PRNG, because the hand-rolled LCG here was broken above ~20k.

    `seed * 1103515245` is a DOUBLE multiply: past 2^53 the low bits are simply
    gone, so masking them back out with `& 0x7fffffff` reads noise that repeats.
    The visible symptom is figures landing on top of each other — Tonio: "About
    20,000 or so it doesn't seem to get more crowded", which is exactly what a
    degenerate sequence looks like from outside.

    `MersenneTwister` is already in this repo, is seeded, and does not have that
    failure. Reaching for it costs an import.
    */
    const prng = new MersenneTwister(1)
    const rnd = () => prng.random()
    const side = this.spread
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * side
      const z = (rnd() - 0.5) * side
      BABYLON.Matrix.RotationYToRef(rnd() * Math.PI * 2, m)
      m.setTranslationFromFloats(x, 0, z)
      m.copyToArray(matrices, i * 16)
      /*
      A CLIP PER FIGURE, not per crowd. The bake holds several and `start` picks
      one, so a field can be a mixture at no cost — the material never changes.

      Weighted rather than even (see `CLIP_MIX`): walking stays the plurality
      because a crowd is going somewhere, and the other three split the rest.
      */
      const clip = pickClip(bake.clips, rnd())
      state[i * 4] = clip.start
      state[i * 4 + 1] = clip.frames
      // A phase OFFSET per figure, or two hundred soldiers march in lockstep —
      // which reads as a bug even though every one of them is correct.
      state[i * 4 + 2] = rnd()
      /*
      And its own RATE. Scaled by the clip's duration so a 0.7s wave and a 1s
      walk both play at the speed they were baked at: `phase` is normalised, so
      cycles-per-second has to carry the difference or the shorter clip runs
      fast — which would look like a bug in the wave rather than an error in
      the units.
      */
      state[i * 4 + 3] =
        (0.7 + rnd() * 0.6) / (clip.duration > 0 ? clip.duration : 1)
    }
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, true)
    mesh.thinInstanceSetBuffer('vatState', state, 4, true)
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
    this._offDebug?.()
    this._offDebug = null
    for (const r of this._skinnedRoots) r.dispose(false, true)
    this._skinnedRoots = []
    this._container?.dispose()
    this._container = null
    this._bakeContainer?.dispose()
    this._bakeContainer = null
    this._instr?.dispose()
    this._sceneInstr?.dispose()
    this._instr = undefined
    this._sceneInstr = undefined
    this._bake?.position.dispose()
    this._bake?.normal.dispose()
    this._mesh?.material?.dispose()
    this._mesh?.dispose()
    this._mesh = undefined
    this._bake = undefined
    this._plugin = undefined
    super.sceneDispose()
  }
}

export const b3dCrowd = B3dCrowd.elementCreator()
