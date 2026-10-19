# Effects — particles, light and sound on one clock

> Status: **design, agreed** (drafted and reviewed 2026-10-19; step 1 in progress). What exists:
> `b3dParticles` (one Babylon `ParticleSystem`, two colours, an emitter shape,
> `burst(n)`), the lamps' one-curve light model (`light-modulation`), `b3dSound`
> (positional audio), procedural thunder delayed by distance (`b3d-lightning`,
> `thunderDelay`), `boltPath`, the ballistic integrator, `weatherAt` wind, the
> water surface, terrain height, `landform`'s volcano, and the device budgets
> (`perf-probe`). Nothing composes them into "an explosion".

## The idea

Almost nothing worth showing is one particle system. An explosion is a flash,
a fireball, smoke, sparks and debris, each on its own clock, and a light on the
ground, and a boom that arrives late. An erupting volcano is an ash column, lava
bombs that land, a red glow at night, drifting smoke and a rumble. So the unit
is an **effect**: a list of **layers** on one timeline, written as data.

```
effect = { name, duration | 'loop', activity?, layers: [particles | light | sound, …] }
```

Same shape as rig recipes: pure data, validated headlessly, a JSON Schema from
the start (ensemble), presets are recipes, and a tool edits them.

**Look: stylized.** Bold shapes and readable silhouettes over photographic
detail. An effect under-promises in fidelity so its BEHAVIOUR (it reacts to the
wind, lands on the ground, is heard late) can over-deliver. See AI-DESIGN.md →
"North star".

## Layers

Every layer has `start` and `duration` (seconds, or `loop`) and **channels**,
each one curve over the layer's life in the lamps' model: one `[0,1] → [0,1]`
curve per channel, so attack, sustain and decay are one shape with no seams.

| kind | what it is | channels |
| --- | --- | --- |
| `particles` | a particle system: emitter shape, sprite, blend, gravity, emit power, life | emit rate, size, colour (two stops + dead), alpha, speed |
| `light` | a point light at the effect | intensity, colour, range |
| `sound` | positional audio, procedural or a sample | gain, pitch, filter cutoff |

Later kinds, each its own piece of work: `ring` (an expanding ground or water
ring), `decal` (a scorch), `dissolve` (a material plugin on a mesh, for
beaming), `distortion` (the black hole's lensing, for a wormhole).

**The activity dial.** A continuous effect has one `activity` (0 to 1) that
scales chosen channels, so dormant, semi-active and erupting are ONE volcano at
three settings, and an eruption can build. A preset says which channels follow
it and how (a curve from activity to multiplier).

**One-shots and loops.** A one-shot (`explosion`) plays once and frees itself;
`play()` restarts it, `burst()` stays for the simple case. A loop (`geyser`,
`volcano`) runs until stopped; a geyser's periodic eruption is a loop whose
activity follows its own curve.

## What reacts to the world

Where the behaviour lives, and why the presets will not look like stock effects:

- **Wind**: smoke, ash and spray drift with `weatherAt` at the emitter, not a
  scene constant.
- **Ground and water**: lava bombs and sparks fly on the ballistic integrator
  and settle or bounce on terrain height; a splash or geyser finds the water
  surface (`iceBearsAt`/water level) and puts its ring there.
- **Sun**: smoke and steam are tinted by the sun's colour (dusk smoke is
  orange), so they sit in the scene.
- **Sound arrives late**: `thunderDelay` (343 m/s) on every sound layer, so a
  distant explosion is seen, then heard. Gain falls with distance; a far sound
  is low-passed (the thunder rule: near cracks, far rumbles).
- **Volcano on a landform**: a preset can sit on `landform`'s volcano and its
  volcanism province.

## Budgets

Three pools, each resolved from the device tier (`auto`, as everywhere):

- **Particles**: a per-effect cap, and a scene-wide one shared like
  `b3d-ambient`'s pool. Over budget, the least visible effect thins first; GPU
  particles where WebGL2 allows.
- **Lights**: a small shared pool (Babylon gives a material 4 lights by
  default; every lit material pays for each one near it). The brightest and
  nearest effect lights win the pool; the rest fade out rather than pop. No
  shadows from effect lights by default.
- **Sound voices**: a cap; the quietest voice yields. Audio starts only after a
  user gesture, as thunder does: until then an effect plays silently.

## No files

- **Sprites are generated**: soft puff, smoke billow, spark streak, ember, glow,
  droplet, made into one small atlas at load (as the water normal is), so a
  recipe never names a URL that must resolve in someone else's app. A layer may
  name a texture URL instead.
- **Sparks stretch** along their velocity (Babylon's stretched billboards).
- **Soft particles** fade where they meet geometry, instead of cutting a line.
- **Sounds are synthesised** from noise and oscillators through filters and
  envelopes: rumble, roar, hiss, boom, crackle, whoosh, buzz, splash, shimmer,
  swell. A layer may name a sample (`url`) instead; CC0 packs can go on the CDN.

## Surfaces

- **`<tosi-b3d-effect preset="explosion">`** (or `recipe=`): plays an effect
  where it is, or nested in a mesh to follow it. `play()`, `stop()`,
  `activity`. A `whenDone` callback for one-shots.
- **The particle tool** (`/effect-tool/`, a subpath like the rig tool): pick a
  preset, edit layers and their curves live, replay or scrub a one-shot, the
  activity dial, a mute toggle, a "listen from" distance that shows (and plays)
  the sound delay, save, load and copy the recipe.
- **`effectRecipeSchema()`** and `validateEffectRecipe()`, pure.

## Presets, in order

**Step 1, particles, light and sound only:** volcano (one recipe; dormant,
semi-active and erupting as activity), geyser, splash (crown, drops, ring),
explosion, fireball, electrical sparks.

**Step 2, each needs a new piece:** beaming in/out (the `dissolve` layer: a
material plugin that eats a mesh away by noise, with particles from its
surface), wormhole in/out (a vortex pull and the `distortion` layer), lightning
arcs (`boltPath` between two points, sparks where it lands).

**Step 3:** boat wake. It belongs to the water: foam on the surface joined to
the water's own foam, and spray at the bow. Particles above the water would
read as a different effect.

## Decided (Tonio, 2026-10-19)

- **One light pool, lamps included.** Effect lights and `b3dPointLight`s share
  it. Priority is by **strength and locality**: how bright a light is where
  the viewer is looking from (intensity over distance, within its range), so a
  bright nearby explosion outranks a dim lamp across the map, and a lamp beside
  you outranks a far flash. Losers fade out rather than pop.
- **XR: hard edges.** No soft particles in a headset (the depth pass costs).
- **Ensemble:** a piece carrying an effect recipe, as with rig recipes. The
  schema is ours.

## What would change this

- If the layer clock cannot express a preset without special cases (a geyser's
  period, a volcano's bombs), the model is wrong: the fix is a channel or a
  curve, not code in the preset.
- If an effect looks the same in a storm and a calm, the world reactions have
  not landed, whatever the particles look like.
