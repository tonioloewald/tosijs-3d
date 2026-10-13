# b3d-crowd

**Many animated figures, one draw call.** The Babylon half of
[[vertex-animation]] — a baker, a material plugin that replays the bake in the
vertex shader, and thin instances so the CPU does nothing per figure per frame.

## Demo — the bench

Drag `figures` up and watch **GPU worst**, not the wall clock. The slider is
LOGARITHMIC and goes to 200,000 on purpose: the first version stopped at 4000
and the answer came back "flat, 18ms at any number", which is what you measure
when the load never bends anything and vsync is doing the talking.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dGround, b3dCrowd, slider3d, label3d, toggle3d } from 'tosijs-3d'
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
    // readout offered 2.5 figures, and the element rounded behind its back.
    label: 'figures', value: s.figures, min: 1, max: 200000, scale: 'log', snap: 1,
    showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.count = Math.round(v) },
  }),
  // A TOGGLE, not a select. A select needs a popup, and a popup is a second
  // gesture that can fail on its own — which is what it did: "when I pick
  // omnidude, nothing happens". Two states want one click anyway.
  toggle3d({
    label: 'omnidude mesh', value: s.omni,
    handleChange: (v) => {
      s.omni = v
      if (!crowd) return
      // omnidude is 0.88m — half a person. See CLAUDE.md on scale.
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
  // NO INSTRUCTION ROWS. Three muted labels used to sit here pointing at Perf
  // Stats and explaining what omnidude is — two of them saying the same thing,
  // and all three saying what the prose above already says. A panel is for the
  // controls; the page is for the explanation. Tonio: "they're not really
  // needed, I think."
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
      // Sun BEHIND the viewer. The first version had the camera looking into it,
      // and a crowd lit from the far side is a crowd of silhouettes — which
      // read as black figures rather than as a lighting choice.
      orbitCam(el, { alpha: 0.62, beta: 1.12, radius: 85, target: [0, 2, 0] })
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

**Fish are the same argument underwater, and the easiest case this substrate
has.** Nobody inspects a fish: it is looked at from ten metres through water, so
it wants ~100 vertices and two clips where a player character wants 1,380 and a
dozen. The medium supplies the LOD — underwater fog already fades the far end on
a curve that is physically motivated rather than a tuned cull distance — and a
school fills a VOLUME, so a few hundred read as far more than the same number
scattered on a field. Filed rather than built (see TODO).

## The target, and what it means that we cleared it

The game this was built to answer for is a virtual miniatures battle. Tonio's
original ran on an Amiga 500 — 7MHz, 320×200, 16 colours, about 10fps — where a
unit of regulars was 15 figures and one of irregulars 7, and an army was three
to nine units laid out three wide. So:

| | |
| --- | --- |
| largest army | 9 units × 15 = **135 figures** |
| a whole battle | **~270** |
| measured here | **200,000 blocky figures**, 60ms with shadows |
| or | **20,000 baked omnidudes** at 33ms |
| headroom | **~740×** on count, ~74× on a real rig |

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
| vertex-animated | **200,000** | blocky, 60ms with shadows (33ms without) |
| vertex-animated | **20,000** | omnidude, 33ms with shadows |
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

## What the ceiling actually is — and how I moved it without noticing

The headline used to be "200,000 at 33ms". That number is real and it no longer
describes this demo, because **I changed the scene it was measured in**: adding a
ground and a shadow-casting sun (so you could see the figures in context) put
every figure through the shadow map as well, once per cascade. Same slider, same
crowd, different question. A bench's SCENE is part of its measurement, and I
edited it without re-baselining — which is how a number outlives the thing it
described.

Tonio's readings on the current scene, with shadows:

| figure | verts each | figures | verts/frame | frame |
| --- | --- | --- | --- | --- |
| blocks | ~144 | 200,000 | ~29M | **60ms** |
| omnidude | 1,380 | 20,000 | ~28M | **33ms** |
| omnidude | 1,380 | 200,000 | ~276M | **600ms+** |

(For contrast: blocks at 200,000 was 33ms **before** the ground and sun went in.)

⚠️ **Read those as BOUNDS, not as costs.** They were taken on a laptop that may
have been driving a 30Hz display, where the floor is 33.3ms — so "20,000
omnidudes at 33ms" may well mean the crowd was FREE and the wall clock was
reporting the monitor. Likewise 60ms is two swap intervals: one missed frame,
not sixty milliseconds of work. Tonio: *"I think these figures are always going
to be rubbery unless we do proper benchmarking but we have some nice bounds
here."* That is the right reading of them.

The panel now measures the floor rather than assuming one — the fastest frame it
has seen IS the swap interval — and reports the worst as a MULTIPLE of it, so a
quantised reading is legible as quantised. `reset worst` clears the floor too,
because a display can change under you.

The readings that will actually settle the budget are a **headset** and a
**Raspberry Pi**: the first has the tightest frame budget we ship against (13.9ms,
twice, one per eye) and the second is the floor of the hardware range. Both are
in `DECISIONS.md`.

Read them together and the tidy story I had written — *cost is vertices* — is
only half right. Rows one and two are the same number of vertices and differ by
**2×**, so something other than vertex count is being paid, and the third row is
10× the vertices for 10× the time, so vertex count is clearly being paid too.

Two candidates for the gap, and Tonio named the area: *"these are figures with
shadow casting etc. added so we are torturing fill rates and buffers."*

- **Overdraw.** `spread` is fixed at 80m, so raising the count does not enlarge
  the field, it packs it. 200,000 figures on that ground is shoulder to
  shoulder; every pixel is covered many times over, in the shadow map as well as
  on screen. 20,000 is a crowd you can see between.
- **Tiny triangles.** A GPU shades in 2×2 quads, so a triangle smaller than a
  couple of pixels wastes most of the quad. 200,000 blocky figures at that
  distance are largely sub-pixel; 20,000 omnidudes are not.

Both scale with **how many separate small things** are on screen, which is
exactly the axis that differs between rows one and two.

So the honest budget has two terms — total vertices, and how finely divided they
are — and the practical advice is unchanged: the **`verts` line in the panel is
the one with a budget attached**, and the `shadows` toggle is there so the extra
passes can be measured rather than assumed. It also sharpens
[[vertex-animation]]'s "the bake IS the LOD": decimating a distant figure buys
you on both terms at once.

## MEASURED ON A QUEST 3

The section below was arithmetic. This is the reading, taken by Tonio on the
device, and it is worth putting first because two of the three numbers are worse
than the laptop would have led you to expect and one of them is much worse.

| | Quest 3 | laptop, for comparison |
| --- | --- | --- |
| baked omnidude, **in VR** | **750** — fine | 20,000 @ 33ms |
| figures, flat in the headset's browser | frames start limiting at **~1,000** | 200,000 @ 60ms |
| **skinned** `b3d-biped` rigs | **"nasty at maybe 20"** | ~50 |

Three things follow, and the first two change plans rather than merely
confirming them.

**THE SKINNED CEILING IS ~20, NOT ~50.** That is the number that matters most,
because it is the one the rest of the framework leans on. Half the desktop
figure, and it arrives with everything else a character needs still to be paid
for — controller, collision, AI, audio — none of which the bare baseline spawns.
So "a handful of real actors, and everything else is crowd" is not a stylistic
preference on this hardware; it is the budget. Anything that promotes crowd
members to skinned rigs (see "Crossing the seam") is budgeting against 20, and
should probably aim at half that.

**THE CROWD CEILING IS ~750–1,000, NOT 3,000.** The arithmetic below concluded
3,000 low-poly figures would fit comfortably. Measured, the omnidude path runs
out at 750 in VR — and since omnidude is ~1,380 verts against a ~300-vertex
soldier, the ~4.6× saving that section is built on would put an authored figure
in the right neighbourhood of 3,000. So the reasoning survives; what it did NOT
allow for is how little headroom there is to be wrong in. The conclusion below —
author the figure for the job, do not decimate a hero — is now load-bearing
rather than an optimisation.

**750 IN VR AGAINST ~1,000 FLAT ON THE SAME DEVICE** is the interesting one: a
quarter, not a half, for drawing everything twice. Whatever the extra cost is,
it is not simply "two eyes" — which is a hint that the per-frame overhead
(cull, submit, the compositor's own slice) matters more here than the vertex
count, and therefore that fewer, fatter draw calls are the right direction.
Exactly what this substrate does.

⚠️ These are eyeball readings of where it "starts to limit", not instrumented
frame times — the GPU timer is the thing to get onto the device next. Treat them
as the right order of magnitude and the right RATIOS, which is what they are
being used for.

## Would a big battle fit in a headset?

Tonio, sizing the ceiling: *"I could easily imagine wanting to quadruple the
maximum figures but that's probably the absolute limit and we're still at
what — 3000 figures. My guess is that's doable on the quest."*

Worth doing the arithmetic rather than guessing — though see the measurements
above, which arrived after this was written and tightened it considerably.

A headset draws the scene **twice**, once per eye, and a shadow-casting crowd is
drawn again per cascade. So it depends entirely on what a figure costs:

| figure | verts | 3,000 of them, both eyes + 2 cascades |
| --- | --- | --- |
| baked omnidude | 1,380 | ~16.6M verts/frame — **no** |
| a soldier authored for this | ~300 | ~3.6M — yes |
| the blocky bench figure | ~144 | ~1.7M — easily |

…against a laptop that did ~28M in *at most* 33ms, where a headset has some
fraction of that GPU and less than half the time. So the question is not whether
3,000 figures fit. It is how many vertices a soldier gets.

…and the answer to that is not a technique, it is a decision. Tonio: *"I think
we don't use anything as complex as omnidude at all."*

Which settles it, and settles it cheaply. omnidude is a PLAYER character — a
face, fingers, a silhouette meant to be looked at from two metres. A soldier in
a formation is looked at from forty, and the bench's own blocky figure (~144
verts) already reads as a person at that range. Author the figure for the job
and 3,000 of them is ~0.4M verts per pass, ~1.7M a frame with both eyes and two
cascades — comfortably inside a headset frame rather than four times outside it.

So the omnidude path is not the plan for a battle; it is the **A/B**, and a
useful one. It answers "what does a real rig cost" in one toggle, which is how
you know a simple figure is worth authoring rather than assuming it.

Two consequences worth keeping:

- **Decimation stops being load-bearing.** [[vertex-animation]]'s "the bake IS
  the LOD" is still true and still worth having for content you did not author
  (and for the far end of a big field), but it moves from *required* to *nice*.
  Authoring a 300-vertex soldier beats decimating a 1,380-vertex hero, and it
  gives a better-looking result because a human chose which detail to keep.
- **Detail moves to the SOCKETS.** A low-poly body plus instanced kit — helmet,
  spear, shield, banner ([[vertex-animation]]'s `SocketLayout`) — is how a unit
  becomes recognisable without the body getting heavier. Variety at the level
  that reads at forty metres is equipment and colour, not topology.

And **don't cast the crowd into a shadow cascade** either way: a blob decal per
figure ([[shadow-decal]]) is one quad, and at battle distance it is the same
picture. That removes half the passes for almost nothing, whatever the figure
costs.

## The roster, and why it is cheap

The content this actually needs is not one figure, it is a cast. Tonio: *"what we
will need is more figures and more animations. Assuming we have a winged
creature, heavy mounted, light mounted, heavy infantry, light infantry and some
accessories like helmets, shields, weapons."*

That lands well, and specifically it lands on the axis this substrate is cheap
on. **Draw calls scale with TYPES, not with figures**: one `b3dCrowd` per kind
is five draw calls for an entire battlefield, whatever the counts. A thousand
light infantry and eight hundred heavy are two calls, not eighteen hundred.

The memory is not the problem either. A 300-vertex soldier with eight clips
baked at 10fps is around 80 frames:

    300 × 80 × 4 channels × 2 bytes × 2 textures ≈ 0.8MB

So five types is a handful of megabytes, and doubling the clip count doubles a
number nobody will notice. `vatBytes` is there to check rather than trust —
the arithmetic turns nasty only at hero vertex counts with long clips (a
16.9-second dance at 1,380 verts is most of the omnidude bake on its own).

Three notes for when this is built rather than imagined:

- **Bake rate follows how far the silhouette moves between frames ON SCREEN** —
  which is not the same as how fast the animation is, and I had it wrong first
  time. I wrote "the winged creature needs a high bake rate, a flap is fast";
  Tonio: *"the winged creature is probably more like a dragon and has a slow
  majestic flap."* A slow flap covers its arc over more time, so it needs FEWER
  frames per second of clip, not more.

  What makes a dragon unforgiving is the other term: it fills the view. The same
  angular error between frames is a handful of pixels on a distant soldier and a
  hand's width on a wing overhead. So the rule is angular change × apparent
  size, and the two big cases pull in opposite directions — a fast flap far away
  (a flock of birds) and a slow flap up close (this) can want the same rate for
  entirely different reasons.

  A slow flap also spends most of its cycle nearly still, gliding. That is where
  a low rate is free, and it moves the real problem from frame rate to **clip
  blending**: the pop when glide becomes flap is what you would notice, and it
  is the one thing in `vertex-animation` still unbuilt.

  And a dragon is a HANDFUL, not a crowd — so it can afford whatever it wants,
  including not being baked at all. At three of them a skinned rig is fine
  (~50 is the measured ceiling); at fifty wyverns this substrate wins again.
- **Mounted is one figure, not two.** Horse and rider bake as a single mesh with
  a single clip table, because they move together and a seam between them is a
  second thing to synchronise for no gain. A rider who dismounts is a *different
  figure*, which is the same seam as promoting one to a named character.
- **Accessories are [[vertex-animation|sockets]]**, not geometry: helmet, shield
  and weapon ride as their own instanced meshes sampling the same frame. That is
  what keeps unit identity — the thing you actually read at forty metres — off
  the body's vertex budget. It is the one piece of this that is designed and not
  yet built.

## Which path a thing takes is decided by UNIT SIZE

The roster sorts itself once you ask how many of a thing stand together. Tonio:
*"a dragon unit will likely be ONE figure or maybe three."*

| unit | figures | path |
| --- | --- | --- |
| light / heavy infantry | 15 | baked crowd |
| light / heavy mounted | 7–15 | baked crowd (horse and rider as one bake) |
| **dragon** | **1–3** | **skinned rig** |

At one to three there is nothing to amortise, and everything a named entity
wants comes back: real clip blending (which the glide→flap seam actually needs),
bones to parent a rider or a breath effect to, per-instance damage state, a
skeleton for a hit probe. Baking one dragon would buy a draw call nobody was
short of and give up all of it.

So the two paths are not a ladder with the crowd at the top — they are a
**threshold**, and unit size is the test. Hundreds of a thing: bake it, and
accept that it cannot be inspected closely. One of a thing: rig it, and spend
the budget the crowd just saved you on making it worth looking at.

The seam between them is the piece to design rather than discover: a figure
promoted out of a crowd (a champion stepping forward) or demoted into one has to
cross it, and nothing does that today.

## Crossing the seam: the MECHANISM, and whose job the rest is

Tonio: *"demonstrate being able to switch a crowd mesh for a skinned mesh
seamlessly... 10,000 shambling zombies in the distance but when they get close
they swap to skinned meshes that can attack and die."*

That is the seam above with a use case attached, and it is what makes the two
paths one system instead of two.

**The pose handoff is already solved, by accident, and it is the only part we
should own.** A figure's `vatState` is `(clipStart, clipFrames, phaseOffset,
cyclesPerSecond)` — which is to say the crowd can state exactly which clip a
given figure is playing and how far through it is. So the swap is: read that
phase, start the skinned rig's `AnimationGroup` on the same clip at the same
normalised time, hide the instance. No blend, no cross-fade, no snap, because
the two are in the same pose at the same instant. The hard part of a LOD swap is
usually reconstructing that state; here it was never lost.

That conversion — instance index to `{clip, t}` — is the piece that is
impossible from outside the crowd and trivial from inside. It is the whole of
what belongs here.

**WHEN to swap is the consumer's call, and deliberately not ours.** Tonio: *"I
think we'd leave the rules for switching to skinned models to the consumer since
it will be more likely decided on specifics."* Which is right, and the three
obvious cases disagree with each other enough to prove it: a horde game promotes
whatever can reach you, a battle promotes the unit you selected regardless of
distance, and a parade promotes whoever the camera is following. Any rule shipped
here would be wrong for two of those, and worse, would be wrong *invisibly* —
policy baked into a substrate is the kind of thing adopters work around rather
than replace.

So the surface to build is a handle, not a system: *give me the pose of figure
N*, *hide figure N*, *put it back*. A consumer will probably want a budget
rather than a radius, hysteresis at whatever boundary they pick, and a rule for
what happens to a figure that dies while promoted — but those are their
decisions to get right for their game, and this module has no opinion worth
imposing.

**The demo is the deliverable, and it has to show two things.** Tonio: *"have a
crowd where they are swapped here and there and do something the crowd mesh
members can't do (and we could change their textures as a debug feature)."*

- That the swap is **invisible** — a handful of figures promoted here and there
  in a moving crowd, with nothing to see at the moment it happens.
- That the promoted ones can then **do something the crowd cannot**: turn to
  look at you, take a hit and fall, be interacted with.

And the debug toggle is the part that makes it a demo at all, because those two
goals fight. A swap done properly looks like nothing happening, so a viewer
cannot tell it from a crowd that never swapped anyone — which means the demo
needs a way to *reveal* it on demand. Tinting the promoted figures does that:
turn it on and the mechanism is visible, turn it off and the claim is that you
cannot spot them. The usual instinct is to hide a LOD transition; here the
ability to un-hide it is the feature.

**What it is worth.** Ten thousand figures of menace for one draw call, and a
handful of them — the ones you can actually reach — with collision, damage, a
sensorium and a death. That is the north star's own argument (*agents and
reactions, not vertices*) with the vertex bill itemised: the crowd is scenery
until it is close enough to matter, and the budget goes to the ones that are.

## A stadium, which needs almost none of the above

Tonio: *"we could animate the entire crowd in a superbowl game — an animated
stadium would be a cool demo."*

Worth calling out separately, because a stadium crowd is a genuinely different
SHAPE from a battle and it is the easier of the two by a wide margin:

- **Nobody is promoted.** There is no seam to cross, no collision, no AI, no
  death — a spectator is scenery that moves, which is exactly what this
  substrate is. So it exercises the crowd at full size with none of the
  machinery above.
- **Placement is a lattice, not a scatter.** Seats are a generated bowl — tier,
  row, seat — so the instance buffer is a loop rather than a distribution, and
  every figure's position carries its bearing around the bowl for free.
- **The clip set is small and seated.** Sit, clap, stand-and-cheer, wave. Four,
  maybe five, and all of them short.
- **And the interesting behaviour is CORRELATED, which is the part that is free.**
  A Mexican wave is `phaseOffset` as a function of seat bearing. That is one
  multiply in the buffer the crowd already fills — a stadium wave needs no new
  capability at all. A section reacting to a play is the same trick on clip
  choice instead of phase.

It is also the one crowd whose real-world number is not a guess: about **70,000**
people, which sits comfortably between the two figures this bench has measured.
The rendering answer is already known, in other words — what the demo would show
is the *authoring*, which is the part nobody has tried.

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
