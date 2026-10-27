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
