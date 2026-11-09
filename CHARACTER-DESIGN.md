# CHARACTER-DESIGN — a character creator on MakeHuman's data

> Status: **accepted; steps 0 to 2 shipped in 0.11.4, parts of 3 to 5 under
> way.** Written 2026-10-21 after a read of the rig tool, auto-rig,
> retargeting and spring chains at 0.11; revised the same day with Tonio's
> answers (style, runtime creation, swappable base meshes, ensemble as a
> consumer), then with step 0's measurements; revised 2026-10-22 with what
> building steps 0 to 2, eyes and hair decided (marked **Built:** below). The
> page is [character builder](https://3d.tosijs.net/character-builder/).
>
> 2026-11-02: merged to `main` as written on the `character-design` branch
> (last revised 2026-10-22). What has shipped since is in the changelog: the
> character as a file (`character-file`, `makeCharacter`) in 0.11.6, and the
> engine-free character core (`character-core`) in 0.12, which Dramatis, a
> separate product, consumes. Dramatis takes nothing out of tosijs-3d, so
> this design stays here; the module table below is the plan as it stood,
> and some names differ from what shipped.

**What it is:** Ensemble for people. Sliders take a body from short to tall,
thin to fat, young to old, male to female; faces are customised; skin is a
generated material with tattoos and makeup on it; it wears hair, clothes and
equipment that fit whatever body it is. The result is a rigged figure every
existing consumer (`b3d-biped`, the crowd, ensemble) takes like any loaded GLB.

**And it is a library, not just a tool.** A game can hand the whole thing to
its players: body, face, skin layers, equipment and accessory pieces, with the
same data and the same pure core the authoring tool uses. Runtime creation is
a first-class path, not an export afterthought.

**Target:** PS3–PS4 era today. That is a ~15–30k triangle body with good maps
and shading, not 500k triangles.

## Style: realism is in scope, not a priority

Tonio, 2026-10-21: realism is in scope but not the priority; we want to be
able to pursue more of it later even if we cannot manage it now. That fits the
north star (behaviour first, a style that under-promises) as long as the
architecture never caps fidelity. Concretely:

- **Only the material layer decides how much is promised.** Geometry, rig and
  fitting are identical at any style. The skin system has a `stylisation`
  axis (painterly ↔ subsurface), and each game, or each shot, picks its point.
- **Nothing hard-codes today's budget.** Texture sizes, detail-map sets and
  LOD counts are data in the base and the recipe, resolved through the
  device-tier budgets (`resolveBudget`) like terrain and shadows. A better
  skin later is a new material and better maps, not a new pipeline.
- **The data keeps more than we render.** Converted targets keep full
  precision; any quantisation for the runtime pack is a pack decision, so
  hero shots can always go back to the source.

## The data: MakeHuman, not MB-Lab

MB-Lab's meshes, morph database and textures are **AGPL**, and so is every
character made from them. MakeHuman's **assets are CC0** (since 2020): base
mesh, targets, proxies, skins. Their code is AGPL (MPFB's GPL), so the rule is:
**use their data, reimplement their logic from the file formats, copy no
code.** Community assets on their site carry their own licenses; check each
one. Only the bundled core assets are CC0.

CC0 matters more now that players will build characters at runtime: whatever
a game redistributes to its players must carry no obligations, and CC0 data
plus our own code carries none.

What hm08 (their base mesh, unchanged for a decade) gives us:

- **Fixed topology.** Every body is the same vertices moved, so weights, UVs,
  masks and proxy bindings are computed once.
- **Macro targets** blended at the corners of gender × age × muscle × weight
  (plus height, proportions, an ethnicity mix), and many face and body
  detail targets.
- **Joint cubes**: helper cubes marking every bone's head and tail. After a
  morph, the skeleton is the centroids of its cubes, so these bodies need no
  marker step and no `fitSkeleton`.
- **Helper geometry** (`helper-skirt`, tights) clothes fit against, hidden at
  render.
- **Proxies** (`.mhclo`): clothes, hair, eyes, eyebrows, teeth and low-poly
  bodies, each vertex bound to a base triangle with weights and an offset.

## Bases: one slider does not span a baby and an adult

Tonio: in his experience the single baby-to-adult slider does not work, and
we will want to swap meshes anyway, for an orc or a Vulcan. So the unit is a
**base**, and hm08 is only the first one.

A base is a topology plus everything keyed to it:

| a base carries | |
| --- | --- |
| mesh | positions, UVs, faces, region masks (head, hands, …) |
| targets | its own macro and detail targets, with each slider's valid RANGE (an adult base's age runs from late teens, not from birth) |
| rig map | how its joints become UAL's 65 (joint cubes for hm08; marker fit + `fitSkeleton` for a mesh with none) |
| weights | computed once on its rest mesh |
| correspondence | where each of its vertices sits on hm08's surface (see below) |
| material slots | which skin, eye and mouth materials it takes |

Two kinds of difference, two prices:

- **A variant** is targets on an existing base: a Vulcan is hm08 with ear,
  brow and colour targets. Cheap; everything fitted to hm08 fits it.
- **A new base** is a new topology: a child, an orc with different
  proportions and tusks, a dwarf if the targets cannot reach. Each one needs
  its own targets, rig map and weights.

**Correspondence is what keeps clothing portable.** Every garment and
accessory is authored once, against hm08. A new base registers itself to
hm08 once (wrap hm08's surface onto it: landmarks, then a smooth non-rigid
fit, offline), which gives every base vertex a point on hm08's surface. A
garment's binding is then translated through that map. A shirt made for
humans fits the orc automatically; where proportions are too far off (a
tusk, a tail), the garment declares which bases it supports, or carries a
per-base fix-up. Without this, every new base multiplies the clothing work by
the number of bases, which is the failure mode to design against from step 1.

**Decided: start with hm08, build the base abstraction from the first line,
and prove it with a child base early (step 4b),** before the clothing library
grows. The child is exactly the case the single slider fails. A **baby** base
is low priority (Tonio, 2026-10-21): its proportions and its movement are far
enough from UAL's clips that it is a separate animation problem, not just a
mesh.

## Where it lives: in tosijs-3d

Build it in tosijs-3d. It consumes the rig, the retargeting, the springs and
`buildRig` directly, and the rig tool and effect tool already show the shape:
a pure recipe, a Babylon side, a tool on its own subpath. **Ensemble is a
consumer, as it is for the rig tool** (`mountCharacterTool`, `change` /
`commit`), and so is any game's own character screen.

The boundaries worth keeping are the ones that already exist elsewhere in the
repo:

1. **Data is not code.** Converted data lives in `static-assets` as **packs**
   (a base, a set of targets, a wardrobe, an accessory kit), reached by
   `assetUrl()`, converted by a script in that repo's pipeline. A game ships
   the packs its players may use; the npm package ships logic only.
2. **Pure core, Babylon edge**, as with `rig-recipe` / `rig-recipe-babylon`:
   morphing, joint fitting, correspondence and proxy binding are pure
   functions over typed arrays, tested headless, runnable in a worker.
3. **The output is an ordinary rigged figure** on UAL's skeleton, plus a rig
   recipe for its springs. Nothing downstream knows it came from sliders.
   Whether a game bakes it to a GLB ahead of time or builds it live on a
   player's screen, the biped and the crowd see the same thing.

Modules, by the existing naming:

| module | role |
| --- | --- |
| `human-pack.ts` | Pure. The pack format: bases, sparse targets, joint groups, masks, correspondence, proxies, accessories. Reader + types + manifest of what a pack contains |
| `human-morph.ts` | Pure. Macro corner interpolation + detail targets → positions, ranges from the base. The hot loop |
| `human-rig.ts` | Pure. A base's rig map → UAL's 65 joints (`RestBone[]`, so `retarget` sees an exact match) |
| `proxy-fit.ts` | Pure. Binding a proxy to a body, through correspondence onto another base; builds bindings for new garments and LODs |
| `character-recipe.ts` | Pure. The recipe + JSON Schema + `validateCharacterRecipe`, and what a game may restrict (allowed packs, slider ranges) |
| `skin-layers.ts` | Pure. The layer stack (tattoos, makeup, scars, paint) as data: what, where on the UV, blend, colour |
| `skin-material.ts` | Material plugin: layered skin, the `stylisation` dial |
| `character-babylon.ts` | `applyCharacterRecipe(scene, packs, recipe)` → `{ mesh, skeleton, rig, read }`; `bakeCharacter` → GLB |
| `character-tool.ts` | Subpath `tosijs-3d/character-tool`: the page and `mountCharacterTool(b3d, options)`, with options to hide what a game does not offer |

## The recipe

Like rig and effect recipes: data, versioned, validated, a preset is a recipe,
and small enough to be a player's save file.

```ts
interface CharacterRecipe {
  version: number
  seed?: number                       // randomise-within-constraints reproduces
  base: string                        // 'human-adult', 'human-child', 'orc'
  body: { gender; age; muscle; weight; height; proportions; ethnicity: [n, n, n] }
  details?: Record<string, number>    // target name → weight (face, body, variant)
  skin: {
    tone; redness; age?; stylisation
    layers?: SkinLayer[]              // tattoos, makeup, scars, paint
  }
  eyes?: { iris: string; … }
  hair?: { proxy: string; color: string }
  outfit?: { proxy: string; layer?: number; color?: string }[]
  equipment?: { item: string; socket: string; pose?: Transform }[]
  accessories?: AccessoryRecipe[]     // built from pieces, see step 6
  rig?: RigRecipe                     // springs on hair and loose garments
}
```

Everything is named, never a URL, for the reason effect recipes name no URL: a
recipe must resolve in someone else's app. A name a game's packs do not have
is reported, as `applyRigRecipe` reports missing bones, never thrown.

**Restrictions are data too.** A game says which packs, bases, slider ranges
and layer kinds its players get (`CharacterRules`), and the tool and the
validator both read it, so a player's character screen is the authoring tool
with things switched off, not a second UI.

## Steps

Each step ends in something watchable, per the house rule.

### 0. Spike and measure (small)

Convert hm08 and the macro targets; load them; measure, don't guess:
vertex counts with and without helpers, packed target sizes, morph time for
all macros on a Quest, MakeHuman's units against our 1.83 m (scale in the
converter, never the person). Measure each candidate unit of loading (a
base, its macros, a face group, a garment) so the pack split in the next
section is drawn where the bytes actually are.
Confirm the CC0 notice is in the data we check out.

**Measured so far** (2026-10-21, desktop under Bun, from MakeHuman's
`master`; the Quest numbers are still owed):

| | |
| --- | --- |
| licence | the bundled assets are CC0 (`LICENSE.md` section C), and every target file says so in its header |
| hm08 | 19,158 vertices: 13,380 body (one `body` group, about 26k triangles), the rest 13 `helper-*` groups and 125 `joint-*` cubes |
| units | **decimetres**: the young male, young female and baby macros stand 17.5, 16.1 and 6.0 units tall. The converter scales by 0.1 |
| macro targets | **dense**: each moves every vertex. 225 KB as float32, 112 KB as int16 (a 0.03 mm step at their ±10.7 dm range, invisible); 98 files, about 11 MB as int16 before compression |
| morph cost | 0.03 ms per dense target. Morphing needs no worker |
| skeleton | `default.mhskel`: 163 bones (face muscles, tongue, toes, split arm and leg segments), each joint the centroid of an 8-vertex cube (326 head/tail references); `default_weights.mhw` weights 139 of them |

**Watchable:** a grey body walking from short to tall, thin to heavy.

### 1. Body, with bases from the start (small–medium)

`human-pack` + `human-morph` + the converter. The base is a parameter from day
one, even with one base. **Macro targets are dense** (every vertex moves), so
they pack as full int16 arrays, one per corner, and a recipe fetches only the
corners its gender, age and ethnicity mix touches. Detail targets (face, body
parts) are sparse and pack as index + delta. Both are summed on the CPU, at
0.03 ms per dense target, so no worker. Identity morphs are baked into
positions, not GPU morph targets: a body's build is fixed once made, and
Babylon's morph-target budget is better spent on the face.

### 2. Skeleton and skin weights (small)

`human-rig` maps joint cubes to UAL's joints. Two things that sentence hides:

- **The rig map is a table, and it folds.** MakeHuman's default rig has 163
  bones; UAL has 65. Face muscles, tongue and eye bones fold into `head`,
  toes into the foot's ball bone, and the second segment of each arm and leg
  (`upperarm02`, `lowerarm02`, `upperleg02`, `lowerleg02`) into its first, with
  their weights summed. The table lives in the base, so a base with its own
  skeleton brings its own. (MakeHuman's 53-bone game-engine skeleton is
  closer to UE's names, but it is not in the core data; start from the
  default rig and the table.)
- **Joint cubes give POSITIONS, not orientations.** A clip's rotations play
  correctly only on bones whose local axes match the clip's. So the built
  bones take UAL's rest orientation per role, positioned from the cubes, and
  clips play directly; anything that does not line up goes through
  `retarget`, which already handles differing rest poses. Decide by
  measuring UAL's walk on the built rig in step 2, not in advance.

Weights are computed once per base (MakeHuman's weights folded through the
table, or bone heat on the built skeleton) and stored in the pack. If extreme bodies
deform badly, re-run `boneHeat` for that body in a worker; measure it at hm08's
size first (today it is ~0.1–0.3 s for 1–6k vertices).

**Watchable:** five random bodies doing UAL's walk, a strand ponytail from the
existing rig recipe on one.

**Built** (2026-10-22): `human-rig`'s `HM08_UAL` table places UAL's 65 joints
from the joint cubes; MakeHuman's 163 bones are not used at all.
- **Weights are bone heat's**, once per base. MakeHuman's own weights, folded
  through the table, were built, compared on the walk and found no better, so
  they were removed (code and pack). They move into the pack when it is next
  rebuilt; today they are computed once per page (about 2.3 s on a desktop).
- **The spine is UAL's straight column, not MakeHuman's S-curve**: joints keep
  their cube's height but lean as UAL1's rest pose does (`lean` in the table).
  On the curve, every clip hunched the neck forward.
- **Collarbones are axial in retargeting** (like the spine): their rest
  direction is body shape, not pose. Aligned, UAL's collarbone (back 38°)
  swung MakeHuman's (flat) into a shrug and a V in the upper back.

### 3. Faces (medium; mostly UI)

Group the face targets into controls a person can use (jaw, brow, nose,
eye spacing, lips, cheeks, ears) and add seeded randomise-within-constraints,
so "a hundred plausible villagers" is one call and a player's "randomise"
button is the same call with their game's rules.

**Supplied faces: design the seam, build none of the tools.** Tonio,
2026-10-21: consider every way a face can come from outside, but do not go
down the implementation route yet; the likely future is a tool that takes a
selfie and builds a textured head with AI help. So the work now is one
import contract, a **face pack**, that every route produces:

- **target weights** on the base's own face targets (a face made in our
  sliders, or fitted to a photo), and/or
- **extra face targets** for the base (a modder's sculpt, or a fit the
  stock targets cannot reach), carried through correspondence like any base
  data, and
- **a face texture** on the base's UV layout (painted, or projected from a
  photo), entering as a skin layer under the same untrusted-input rules as
  tattoos.

A selfie tool is then a separate, optional producer of face packs, ours or a
third party's, and the creator never knows a photo was involved. What the
core must not do is make that tool impossible: face targets stay
per-vertex and full precision, and the face's UV region is documented. The
contract is a v1 deliverable; the selfie tool is not.

A photo-made head can carry a real person's likeness, so the producer is
opt-in per game, and nothing in the core turns a photo into a face on its own.

Expressions and visemes are a separate channel: GPU morph targets on a split
head mesh. CONVERSATION-DESIGN defers lip-sync, but leave the slot, and
remember a viseme set is per base (the orc's mouth is not hm08's).

### 4. Fitting: hair, clothes, eyes, LODs (medium)

Port the `.mhclo` binding (pure): each proxy vertex is a weighted point on a
base triangle plus an offset. Morph the body; every proxy follows; weights
come from the body. Plus delete masks (no poke-through under tight clothes),
layer order and offsets, and fix-up targets for extreme bodies. LODs are
proxies too (`meshoptimizer`'s simplifier, WASM, bound like a garment).

Prove fitting on MakeHuman's CC0 clothes; real content is authored in Blender
against hm08, and `proxy-fit` computes its binding (no MakeClothes dependency).

**Watchable:** one coat on the thinnest and heaviest body, walking, no
clipping.

**Built** (2026-10-22), before any clothes:
- **Eyes** are the trivial `.mhclo` case: the low-poly eye proxy is bound
  rigidly (`verts 0`), each vertex IS a base helper vertex, so the pack
  carries them as a PART (faces and UVs over the base's own vertices) and every
  target moves them. Eyelashes likewise (the base's lash helpers). Iris drawn
  in code; gaze with saccades (`human-face`).
- **Hair comes from another base** (Quaternius' CC0 hairstyles, modelled on
  its own two heads). `hair-fit` warps that head's skin onto ours, skin to
  skin, and carries the hair with it. Fitting the hair itself to the skin
  failed: a style is one shell with no underside, so it sinks by its own
  thickness. Brows are placed from the eyes, moustaches from the lips region.

**Decided** (Tonio, 2026-10-22): **one fitter at runtime, `hair-fit` as an importer.**
`proxy-fit` (the `.mhclo` binding: a point on a base triangle plus an offset)
is THE runtime fitter: native content (MakeHuman's clothes, ours, authored in
Blender against hm08) is bound once and follows every body for free.
`hair-fit` stays the adapter for FOREIGN content, but should run once at
import, warping onto hm08 and then writing a binding, rather than per body as
it does today. Then hair, clothes and eyes are one path, `nudge` becomes an
edit to the binding's offsets, and the per-body warp (and its two reference
heads at runtime) goes away. Do this before the first garment, so clothing is
built on the one path.

### 4b. A second base (medium)

The correspondence step: register a second base (a child) to hm08, translate
garment bindings through it, and fit step 4's coat to it untouched. This is
the falsifier for the whole base design: if the coat needs hand fixing on the
child, the correspondence is not good enough, and that must be known before
the wardrobe grows.

**Watchable:** the same coat on the adult and the child, walking.

### 5. Skin, layers and materials (large; the art is the long pole)

The skin is generated, not picked: base colour from melanin and redness;
age as blended wrinkle and detail normals; tiling micro-detail; subsurface
toward the realistic end of `stylisation`. House pattern: a material plugin,
like `biome-plugin`. Eyes get their own small shader; hair cards use alpha
test + dithering or alpha-to-coverage, measured on a Quest first.

**Layers** (`skin-layers`) are where player expression lives: tattoos,
makeup, scars, war paint, as an ordered stack over the UV set, each a decal
(image or SVG, placed, scaled, rotated, coloured) or a procedural pattern.
Composited into the skin's textures once per change, not per frame. Two
traps:

- **Placement is on the body, not the UV.** A player puts a tattoo on a
  shoulder by pointing at the shoulder; the tool projects onto the surface and
  stores UV placement, and UV seams need handling (a decal crossing one is
  split, drawn on both sides).
- **Supplied art is untrusted input, and it is expected** (Tonio,
  2026-10-21: players and other consumers load their own tattoo images). An
  image is decoded, rasterised and size-limited before it reaches a texture;
  an SVG goes through the same sanitising rasteriser the effect sprites use,
  never into the page. The library offers a `whenArtSupplied` hook so a game
  can moderate, refuse or replace an image, and does no moderation itself.
  A recipe stores supplied art by content hash, with the bytes beside it, so a
  shared character carries its own tattoos.

### 6. Equipment and accessory pieces (medium)

Two things, often confused:

- **Equipment** is rigid: a sword, a helmet, a backpack. It attaches to a
  **socket** on a bone (the existing bone sockets and `weapon-fit` are the
  substrate), with a per-base socket offset so a helmet sits on an orc's head.
- **Accessories built from pieces** are what players assemble: a pauldron
  from a plate, a trim and studs; jewellery; horns; a hat with a feather. An
  accessory recipe is pieces + where each goes (a socket, or a point on the
  body surface, which then follows the morph like a proxy vertex) + colours.
  Built at apply time, merged into one mesh per accessory for draw calls.

Both are named items in packs, so a game decides which kits its players get.

### 7. Bake, export and hand over (small)

Two outputs, from one recipe:

- **Baked:** `bakeCharacter(recipe)` → one skinned mesh, its textures and its
  rig recipe, as GLB. Ensemble and NPC-heavy games use this; the crowd takes
  it through the vertex-animation bake, so a crowd is not all one person.
- **Live:** the game ships packs and the pure core, and builds the character
  from the player's recipe at load. The recipe is the save file.

**Export to the consumer**, as Tonio wants: body, face, equipment and the
accessory pieces are separable in the output too (GLB nodes per part, the
recipe beside it), so a consumer can swap a helmet without rebuilding the
person.

The runtime element is **`<tosi-b3d-figure>`** (#123, asked for by
ensemble): a model plus a rig recipe, placed and playing clips. A created
character is one more source for it (`character` = a `CharacterRecipe`
beside `model`), so a game, ensemble and the crowd all place characters the
same way. Build #123 for loaded models first; this step adds the source.

**Watchable:** ensemble places three created characters; a demo page offers a
player-style character screen restricted by a `CharacterRules`.

### 8. Loose garments on springs (small–medium)

Skirt hems, coat tails and capes are spring chains, which already exist with
sphere colliders on the head, chest and clavicles (`colliders: 'auto'`). They
need capsules and auto-colliders on hips and thighs, links between
neighbouring chains so a hem keeps its shape, and a recipe kind for a ring of
chains. Match `VRMC_springBone`'s schema where it costs nothing; VRM avatars
then import with their chains set up, as free test content.

### 9. Pattern draping (large; v2)

Marvelous-style 2D panels, sewn and draped by an XPBD solve. **Authoring
only**: a failed drape is re-run, never shipped. Drapes per body shape, then is
simplified, wrinkles baked to a normal map, and bound as in step 4. Runtime
cloth stays step 8's constrained springs. Steps 1–7 give clothed, rigged
characters without it, so the solver never blocks the creator.

### 10. Motion from a webcam (medium–large; #3843, ready, high)

Tonio, 2026-11-08: "it would be amazingly useful as a core capability."
Suggested by Dramatis's owner. The goal is to turn on the webcam and, in a
minute, give a character a pose or a few seconds of motion of your own,
aimed at part of the body and played over a base clip.

This is behaviour, not fidelity. Someone's own shrug, wave or way of standing
is exactly the "depth is systemic" the north star asks for, and it costs no
vertices.

**What it is for:**
- gestures, emotes, idles and held poses;
- one part of the body, over UAL's locomotion.

**What it is not for:** walking and running from one camera. Depth is
guessed and feet slide, and UAL already has those clips.

**One clip format throughout.** A capture is a `GlbClip` on UAL's skeleton:
[glb-clips](/glb-clips/)'s shape, with UAL's rest (`ual-rest`) as its
`GlbClipSource`. So once recorded, it is just a clip:
- it plays on any body through `bakeClip` / `retargetClip`;
- it layers through `animation-layers` with a `bone-mask`;
- it goes out in an export through `riggedBodyGlb`'s `clips`.

Nothing downstream needs a capture-specific path.

**The pipeline:**

1. **Landmarks.** MediaPipe's Pose Landmarker runs in the browser: 33 body
   points per frame, with world coordinates in metres about the hips. The
   hand landmarker adds 21 points a hand; the face landmarker adds 52
   blendshapes and a head transform. Loaded on first use only, so it costs
   nothing until someone presses capture. Video frames never leave the page;
   only rotations are kept.
2. **Solve** (pure, engine-free, in the character core), from landmarks to
   UAL bone rotations:
   - each limb's direction (shoulder to elbow to wrist, hip to knee to
     ankle, mid-hip to mid-shoulder, neck to head) turns UAL's rest
     direction onto it;
   - twist comes from a second vector per segment: the shoulder line for
     the chest, the hip line for the pelvis, the palm's normal for a hand,
     heel to toe for a foot.
   This is the retargeter's own way of working (directions since rest), so
   it is our own solver, not Kalidokit: no dependency, and it agrees with
   how clips already move. MediaPipe's frame (image axes, mirrored in a
   selfie view) is converted once, at the edge.
3. **Clean up:**
   - a one-euro filter per joint (smooth when still, responsive when moving);
   - a foot lock when a foot is near the floor and nearly still;
   - confidence gating: a landmark MediaPipe is unsure of holds its last
     good value;
   - the body-part mask: only the chosen bones are written.
4. **Record:**
   - a clip, up to about ten seconds (a pose is a frame of one: see below);
   - trimmed, with an optional loop blend at the seam;
   - previewed over the base clip, then kept or thrown away.
5. **Hands and face** (later, separate steps):
   - finger curl and spread from the hand points onto UAL's finger joints;
   - the face's blendshapes (ARKit's 52 names) onto MakeHuman's face pose
     units, through a table tuned by eye, with the head turn from the face's
     transform.

**Measured, not eyeballed.** The solver is tested with no camera, as a round
trip:
1. Pose UAL from its own clips.
2. Compute where MediaPipe's landmarks would be (joint positions, and
   offsets for nose, ears, heels and toes).
3. Solve, and report the angle error per bone (median and worst) over the
   locomotion and gesture clips.
4. Add MediaPipe-sized noise and dropouts to tune the filters.

A few real landmark sequences, as JSON with no images, become regression
fixtures.

**Where it lives:**
- `motion-capture`, pure and in the character core: the solver, the filters,
  the mask and the clip, so Dramatis's three.js side can use it too.
- `webcam-capture`: the camera, the lazy MediaPipe loader and the recorder,
  as a panel widget that works flat. A headset browser has no webcam;
  capturing from a headset's own head and hands is a different source for
  the same solver output, and comes later.
- The builder's Motion section: **capture**, a body-part choice, pose or clip,
  a countdown, preview, keep.

**Licences, before anything ships:**
- MediaPipe's code (`@mediapipe/tasks-vision`, Apache 2.0);
- each model file's own terms, read from its model card, not assumed;
- the models can be mirrored to cdn.tosijs.net only if those terms allow
  it, else loaded from Google's storage, pinned.

Ruled out: OpenPose and SMPL-based models (non-commercial only), and
FreeMoCap (AGPL: study, don't copy).

**The steps:**
1. **BVH import and the clip wardrobe** (small–medium). `readBvh` → a clip;
   the wardrobe (a browser store, the character file's field, a panel) with
   BVH and file clips (Mixamo's, Meshy's) as its first contents. Tested on
   synthetic BVH written from UAL's clips (a round trip), plus real samples
   with a licence that allows a fixture.
2. **The playback controller's editing** (small–medium): trim, loop the
   trimmed range, best loop point, loop blend; a pose is a frame kept from a
   clip.
3. **Solver and round-trip harness** (pure; medium). Done when the median
   error is under 10° on UAL's gesture and idle clips.
4. **Filters, mask, layering over a base clip** (small–medium).
5. **Webcam and MediaPipe body capture in the builder, flat** (medium).
   Watchable: wave at the camera, and the character waves while it walks.
6. **Hands to fingers** (small–medium).
7. **Face to expression units** (medium; the table is the work).

Steps 1 and 2 are useful on their own before any camera work: decades of
mocap become clips a character can loop.

**Captures are like garments of your own** (Tonio, 2026-11-08: "a capture
(pose or animation) is basically much like a custom garment"). So they follow
the wardrobe's model:
- **Kept in the browser** by name (a store beside `tosijs-garments`), so any
  character on the site can use them.
- **Worn by a character:** a character file carries the ones it uses, as it
  carries its own garments' GLBs, so a save or a share is complete.
- **Made, imported, exported, forgotten** as garments are, from a panel shaped
  like the tailor's. Export is a GLB of the clip on UAL's skeleton, which
  Blender and other engines open.
- **Clips read from a file** (Mixamo's, Meshy's) are own clips too. Today
  the builder loses them on reload; under this model they are kept with
  their licence, as a garment is.

So saving and export become a clip wardrobe (step 1): a store, a character
file field, and a panel. `tailorPanel` and `GarmentStore` are the pattern to
copy.

**A pose is a frame of a clip** (Tonio, 2026-11-08: "the animation controller
is an obvious way to pull a pose from a clip precisely, so even for capturing
a pose, capturing a clip is useful"). The recorder captures clips only. A
pose is kept by scrubbing the capture in `playback3d` to the moment you want
and keeping that frame, a one-frame clip. That is more precise than holding
still for the camera, and there is one capture flow.

**Many sources, one clip.** The webcam is one recorder. Tonio, 2026-11-08,
on wearable trackers and BVH: "BVH import would likely be huge, there's a ton
of data elsewhere". BVH is the common format of mocap:
- CMU's library, and the datasets built on it;
- what tracker suits export: SlimeVR, Sony's mocopi, Rokoko;
- MakeHuman's own pose files.

So `readBvh(text)` is a source like `readGlbClips`: a pure reader giving a
`GlbClipSource`, the skeleton from its OFFSETs (rest rotations identity) and
keys from each joint's channels in their own rotation order. Its units (cm,
inches, metres) are read from the hip height, and its facing from the hip
line, so the retargeter needs no special case. A BVH clip goes into the same
clip wardrobe with its licence. Each dataset's licence is read before any is
mirrored: CMU's is permissive; several popular sets, Bandai Namco's for one,
are non-commercial only.

Live streaming from a suit is a different matter. SlimeVR and mocopi send
UDP (the VMC protocol, OSC) to native apps, which a page cannot receive, so
it needs a local bridge. Not planned; BVH files cover the data.

**The playback controller grows the editing a capture needs** (Tonio):
- **Trim:** in and out handles on `playback3d`'s scrub bar.
- **Loop the trimmed range,** to judge it as it will play.
- **Match the loop ends:**
  - find the in and out frames whose poses are closest (summed joint angle
    plus hip velocity);
  - blend the last few frames into the first (per-bone slerp, hips eased),
    so an idle or a wave loops without a pop.

All of it is pure on the clip format (`trimClip`, `bestLoop`, `loopBlend`), so
it serves captures, BVH and file clips alike. The pose-from-a-clip scrub
(above) is the same control with in = out.

**A headset is a separate source, later.** You are unlikely to be in front of
a webcam and in a headset at the same time (Tonio), so headset capture is not
a mode of this recorder. It is its own: the head, controllers or tracked
hands, solved onto the same bones and kept in the same clip format, so it
joins the same wardrobe.

### 11. Sweeps: one primitive under the tailor, a barber and a cobbler (medium; #3912, design, for review)

Tonio, 2026-11-09: "every object is a sweep of some kind … You start with a
profile and then you sweep." (After Swivel 3D, and a modeller on the Cheetah 3D
forums built the same way.) This replaces the drape as the way a garment gets
its SHAPE. The drape stays, as an optional last pass for folds.

The tailor is already two sweeps without saying so. A cut is a profile (the
outline through the body) extruded a fixed thickness along the normals. Skirt
mode is a loft: rings round the body's outline at each height. What is new is
making the sweep explicit and putting curves on it.

**A sweep is a profile, a path and curves along the path.** Three kinds cover
clothes, hair and shoes to a first approximation:

| Sweep | Profile | Path | Makes |
| --- | --- | --- | --- |
| **normal** | a region cut from the body (the tailor's outlines, a scalp, a beard) | out from the skin | tight clothes, a shoe's upper, stubble, short hair |
| **loft** | the body's cross-section at each station | along a bone, or several bones in a chain | skirts, sleeves, trouser legs, boot shafts, the foot of a shoe |
| **path** | a small shape (circle, strap, lock) | a curve, or a spring chain | ponytails, braids, straps, laces, a heel |

A loft follows the BONE, not a fixed axis, for two reasons. Its skin weights
are known before any binding: a ring belongs to a station on a bone. And its
UVs are free: the mesh is a grid of (around, along), so u is the angle and v is
the distance. Everything comes from body slices, so a sweep refits when a
slider moves, with no binding step and no settling.

**The controls are curves over the sweep** (`curve3d`, and `curveProgram3d`
where several share markers):

- **ease**: distance out from the skin along the sweep (a flared skirt, a
  puffed sleeve, a bucket top, a toe box);
- **fall**: the direction turning from the skin's normal toward gravity, so
  hair hangs and a long skirt drops;
- **length** past the profile: a hem below the knee, toe allowance, hair longer
  than the scalp;
- **taper** and **twist** (path sweeps: ponytails, braids, heels);
- a ring's **shape**: the body's slice plus ease by default, or its own (a
  pointed toe, a squared shoulder).

For hair, a path sweep's path can BE a spring chain, so the simulation moves
the shape and long hair needs no other physics.

**Ends.** Each end of a sweep is one of three things:

- a **hem**: open, given thickness with an inside wall (the tailor's hem);
- a **cap**: closed (a toe);
- a **join** to another sweep's end. The two share one ring; the one with fewer
  points round it is resampled to match.

**Joins**, easiest first:

- **straight on**: the next sweep carries on from a ring (a shaft into a bucket
  top). It is one sweep whose curves change there;
- **at an angle**: shin to foot at the ankle, the elbow in a sleeve. Rings kept
  square to each bone cross in the bend and pinch. The join is a MITRE: both
  ends cut to the ring halfway between the bones' directions, a pipe elbow.
  Rounding is an option, a number of STEPS: that many rings interpolated
  along a curve through the joint, so the rings turn gradually; 0 steps is
  the clean mitre and the default (Tonio, 2026-11-09: "A clean mitre makes it
  easy to roundtrip to a modeling tool and finesse."). The back of the ring
  needs extra length at a heel so the heel cup is not pinched;
- **branches** (the crotch, the shoulders) are not joined: they are CUT (below).

**Cuts.** The user can make explicit cuts: a line on the garment where it is
split into separate pieces, each its own sweep, meeting edge to edge at a seam.
Cuts are drawn as dashed red lines in the views. Tonio, 2026-11-09: two common
ones are CHECKBOXES, possibly checked by default:

- **at the midline**, splitting left from right. This is what removes the
  branch at the crotch: each half of a pair of trousers is one leg loft whose
  rings are open arcs over half the seat, closing into a full loop below the
  crotch, which is how a trouser pattern is cut. The same checkbox splits a
  shirt's front and back halves;
- **across the top of the foot**, where it projects in front of the lower leg:
  the shaft and the foot become two pieces, which is where a boot is really
  sewn, and the ankle needs no angled join there.

A shirt's sleeve is a cut at the armhole by the same rule (a suggestion, not
yet decided). Cuts also serve the round trip: each piece is a UV island and a
seam a modelling tool keeps, so a piece can be finessed there and brought back.

A **layer** is a sweep that starts on another's surface and leaves it (a
turned-down cuff). It is not a join: both walls show, and its open edge is a
hem.

**Worked example: a bucket-top boot** (Tonio):

1. the shaft: a loft down the shin, the leg's slice plus a little ease, from the
   upper shin to the ankle;
2. the bucket top: a second cut of the upper shin as its profile, starting flush
   with the shaft's top ring, its ease growing with height so it stands off the
   leg. Joined straight on;
3. the foot: a loft from the ankle along the foot, the foot's slice plus toe
   allowance, ending in a cap. Joined to the shaft at an angle; the sole is a
   normal sweep of its bottom outline, downward.

**Three tools, one primitive.** The tailor, a barber and a cobbler are presets
and views over sweeps; each hands back a garment as the tailor does now
(`handleDone`), worn, saved in the character file and exported by
`riggedBodyGlb` as a mesh skinned to the body.

- **Barber** (hair, beard, moustache, brows). FOUR views of the head: front,
  left, right, back. LEFT AND RIGHT ARE SYNCED by default (draw on one, the
  other mirrors), with a toggle to draw them apart for a parting or an
  asymmetric cut. The profile is a region of the scalp (the face for a beard or
  moustache), drawn as outlines in those views as the tailor draws a neckline.
  Stubble and short beards are SHELLS (layers of the region pushed out along
  the normals, a noise texture thinning each), cheap enough for a headset.
  Longer hair is a normal sweep with length and fall (Cem Yuksel's "hair
  meshes", 2009: hair modelled as a thick mesh grown from the scalp, which is
  also what the Quaternius styles are); a ponytail or braid is a path sweep on
  a spring chain. Strands and alpha cards are out of scope: transparency sorts
  badly in a headset and they pull toward realism.
- **Cobbler** (shoes, boots). The LAST is a loft along the foot from the body's
  own foot (toes merged into one smooth toe box), so it fits every body; the
  upper is cut on it and the sole swept from its bottom. Two controls are
  required: **heel height** and **toe pointiness** (how far and how sharply the
  toe extends past the foot). Heel height changes the POSE, not just the shape:
  the ankle points down, the toe joint bends up, and the body stands higher. So
  a shoe carries a foot pose that is added on top of every clip (UAL's walks
  assume a flat foot, and would pin the heel to the floor), and `groundFor`
  counts the sole and the heel. The heel itself, and a long pointed toe, are
  rigid parts on the foot bone (`proxy-rigid`), not stretched cloth.
- **Tailor**: today's cuts are normal sweeps; skirt mode becomes a loft with
  ease and fall curves; sleeves and trouser legs become lofts along the arm and
  leg bones.

**Open-source to lean on** (from memory, not a survey): nothing web-native and
permissive does hair authoring or lasts. AMD TressFX (MIT) is a strand
reference only, too heavy for a headset. Blender's curve hair is a round trip
through Blender (GPL), not an integration. MakeHuman's CC0 packs (Bodyparts
beards, shoes) are usable content now. ANSUR II (public domain) gives foot
measurements to check a generated last against. The Foot3D scans (FIND/FOUND)
are, I believe, research-use only.

**Order.** (a) the sweep core, pure: profile, path, curves, ends, straight and
angled joins, cuts, rings to mesh with weights and UVs, tested on the real pack;
(b) the barber's beard, moustache and short hair (shells and normal sweeps,
the four views); (c) the cobbler's flat shoes and boots, then heels with the
foot pose; (d) skirt mode and sleeves moved onto lofts; (e) long hair on spring
chains; (f) trousers and shirts on the midline (and armhole) cuts.

**Done when:** a bucket-top boot, a beard and a bob are made in the tools,
refit on the extreme bodies (`bun run extremes` takes sweeps), and export
through `riggedBodyGlb` clean under the Khronos validator; heels walk without
the heel sinking or pinning.

## Loading: no ceiling, one source of truth

Tonio, 2026-10-21: everything here can load lazily, so there is no absolute
size budget unless a size becomes egregious. What matters is the virtuous
circle: single sources of truth for data and code, wise factoring, efficiency.
In practice:

- **One core, one data, every consumer.** The authoring tool, ensemble, a
  game's character screen and a game loading NPCs run the same pure modules
  over the same packs, and the recipe is the only format between them. No
  "runtime subset" fork of the data or the code; a game that offers less
  loads less of the same thing.
- **Factor packs along what a person picks.** A base, its macro targets, each
  face group, each garment, each accessory kit, each skin detail set is its
  own unit, fetched the first time something asks for it. A recipe names what
  it uses, so applying one fetches exactly that.
- **Content-addressed and immutable.** Pack files are named by hash and cached
  forever, so a shared garment is downloaded once across games on the same
  CDN, and an update is a new name, never a stale cache.
- **Lazy must not mean stalling.** The cost moves from size to latency: a
  slider that fetches on its first touch must not freeze the body. The tool
  prefetches what its open panel shows, and a target that has not arrived
  yet applies when it lands rather than blocking the rest.
- **Egregious is measured, not guessed.** Step 0's numbers are what would
  flag it; the likely candidates are full-resolution detail maps, which is
  what device-tier budgets are for.

## Open questions

- **Ages in one base.** The demo's age slider runs MakeHuman's whole range,
  baby to old, against "childhood is a base" (Rejected, below). It is kept for
  now because the pack loads fast enough (Tonio, 2026-10-22: an export is only
  the final mesh, so carrying the shapes costs the tool, not the game). Step 4b
  still decides whether a child needs its own base for rigging and clothes.
  **Deferred** (Tonio, 2026-10-22): children and second bases wait until the
  core works: shaders, clothing, accessories, blinking and mouth movement if
  possible, export, and biped integration.

## Rejected

- **MB-Lab's data**: AGPL on every character made with it, which no game can
  hand to players.
- **One baby-to-adult slider**: does not work (Tonio's experience); ranges
  belong to a base, and childhood is a base.
- **Fitting every garment to every base by hand**: correspondence to hm08 or
  the wardrobe cost grows with every base.
- **Re-running the auto-rig per character**: same topology, so weights and
  joints are known; per-body rigging would only make quality vary.
- **GPU morph targets for identity**: spend them on the face.
- **A separate package**: the boundaries that matter (data vs code, pure vs
  Babylon, recipe vs rigged figure) already have homes in this repo.
