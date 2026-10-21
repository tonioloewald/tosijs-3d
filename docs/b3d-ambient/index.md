# b3d-ambient

The stuff in the air, or in the water. **Bubbles and motes when you're under; rain, snow,
dust or drifting seeds when you're not.**

## Demo — dive under

**Fly down into the sea** (W/S pitch, R/Q throttle). The fog closes in, the light dims, and
the water fills with **rising bubbles and drifting motes** — and it all fades back out as you
break the surface.

```js
import { b3d, b3dAircraft, b3dAmbient, b3dWater, b3dFog, b3dLibrary, b3dLight, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { demoSun } from 'tosijs-3d/demo-utils'

// A submersible scout. TWO things make the dive work, and it needs both:
//   `groundY: -40`   — the floor is the seabed, not the default 0 (which here is
//                      exactly the water surface).
//   `submersible`    — the floor SENSOR ignores the water. Without it the ray
//                      hits the surface mesh and calls it ground, so you stop
//                      dead at the waterline however low the floor is. That is
//                      right for a plane ditching in the sea and wrong here.
const scout = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 9, groundY: -40, submersible: true, vtolSpeed: 6, maxSpeed: 30,
})

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.6 }),
  demoSun(),
  b3dSkybox({ timeOfDay: 11 }),
  b3dFog({ start: 200, end: 1200, color: '#bfd9f2' }),
  b3dGround({ meshName: 'ground_nocast', width: 2000, height: 2000, color: '#4a5f3e', y: -40 }),
  // `waterSize`, NOT width/height: those are not water attributes, and an
  // unknown prop is ignored, so the sea would stay at its 128 default beside a
  // 2000-unit ground. `twoSided` because this demo's whole point is
  // descending THROUGH the surface and looking back up at it.
  b3dWater({ y: 0, waterSize: 2000, twoSided: true, follow: true }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),

  // Above the surface: dust motes in the air (visible right away). Below it: bubbles rising +
  // plankton drifting. Both RAMP with depth (the same `band` the fog uses), so diving through the
  // surface is a smooth handoff — the air empties, the sea fills with life. No `count` — it adapts.
  b3dAmbient({ preset: 'motes', where: 'above', radius: 12 }),
  b3dAmbient({ preset: 'bubbles', where: 'underwater', radius: 12 }),
  b3dAmbient({ preset: 'motes', where: 'underwater', radius: 12, color: '#2c4a58' }),

  inputFocus(gameController(), scout),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## How it works

One component, several presets, and one trick that makes all of them work:

> **The emitter box follows the camera. The particles do not.**

Particles are spawned in a box around your head and then live in **world space** — so rain
falls *past* you, motes drift *by* you, bubbles rise *away* from you. Emit them in your local
frame instead and they travel with you like dandruff on the lens, which is the single most
common way ambient particles are got wrong.

The box has a **hole in the middle**, and it matters: a box centred on the camera will happily
give birth to a particle *on your face*, and a few-centimetre sprite half a metre from the lens
is a big soft blob covering a chunk of the screen. That's not a mote, that's a smudge. Nothing
spawns inside the preset's `near` radius (drifting in close later is fine — it's being *born*
there that reads as dirt on the lens). Particles also **fade in**, not just out: born at full
alpha they blink into existence, which reads as sensor noise rather than as dust.

Because the box follows you, an endless snowstorm costs a **fixed** number of particles no
matter how big the world is. Nothing grows, nothing allocates.

## It switches off rather than thinning out

An ambient effect is **garnish**, and garnish plays by one rule:

> **An effect that can't be itself switches OFF. It does not thin out.**

Forty raindrops is not light rain — it's a rendering bug wearing rain's clothes. So you don't
set a `count`; you *ask*. Each effect asks for the capacity its look needs and declares a
`minCount` below which it would be **a lie**, and the scene divides one shared pool (sized from
the measured device tier) between everyone who wants some. Effects thin together while they can all stay honest; the moment someone would drop
under its floor, that one is switched off (lowest `priority` first) and its budget goes to the
survivors. **Better honest rain and no motes than two half-truths.**

The pool is shared because ambient effects *compete* — rain, dust and motes can each be
individually affordable and still cook the frame together. And if the frame stays over budget
anyway, the scene shrinks the pool and effects drop out on their own. That ratchet is **one-way**:
ambient that pops back in the moment the frame recovers, then out again at the next tree, is its
own broken promise.

The cost of an effect is **modelled**, not measured, from what actually drives particle cost: area
and blend mode (`fillWeight`). It cannot be measured per effect. Babylon's particle counter covers
the whole scene, so an effect cannot tell its own rain from an explosion's sparks; and that counter
is CPU-side while particles are GPU-bound (fill and overdraw). Timing the GPU needs
`EXT_disjoint_timer_query`, which a Quest browser tends not to offer, so a self-measured budget
would be least trustworthy on the device that needs it most. The pure allocator is
`allocateAmbient(requests, pool)`, with `ratchetPool`/`recoverPool` for the one-way shrink.

## It arrives with the water, not on top of it

`where: 'underwater'` doesn't switch on at the surface — its emission **ramps with depth**
using the same `band()` the fog uses (see [b3d-fog](/b3d-fog/)). Submerge and the
bubbles arrive *as the water does*. Popping a cloud of bubbles into existence at a plane is
the particle version of a fog "thunk".

## Presets

| preset | what it is |
|--------|------------|
| `motes` | Dust or plankton hanging in the light — near-weightless, slow drift. The cheapest way to make air (or water) feel like a *substance* rather than a vacuum |
| `bubbles` | Rise, wobble, and speed up as they go. Underwater only, really |
| `rain` | Fast, stretched, near-vertical. Add `wind` and it slants |
| `snow` | Slow, wide, wandering |
| `dust` | Blown horizontally — the wind made visible |
| `leaves` | Two-sided quads that **tumble** and blow — real oriented geometry, not a billboard, so they flip edge-on and show their back. They stream with the wind |

Leaves are the one preset that is **not a sprite**. A billboard always turns its face to you,
which is right for something round. A leaf's whole read is that it tumbles: it flashes broadside,
thins to an invisible edge, flips, shows its back. So leaves are real two-sided quads with
per-particle 3-D rotation (`LeafField`, a Babylon `SolidParticleSystem`). The camera-riding box,
the budget and the drain are the same as every other preset. Each leaf's sway is a flutter on
top of the scene's wind, so leaves stream the same way the clouds and the water do.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `preset` | `'motes'` | `motes` / `bubbles` / `rain` / `snow` / `dust` / `leaves` |
| `where` | `'always'` | `always` / `underwater` / `above` — emission ramps with depth, it doesn't switch |
| `weather` | `'off'` | `'rain'` / `'snow'`: emission follows the PRECIPITATION where the viewer is (weather cells), so a storm brings its own rain; the local temperature splits rain from snow (sleet between). `'off'` = always on |
| `count` | `auto` | Capacity to ASK for (`auto` = what the preset's look needs). You may not get it — the scene divides a shared pool |
| `minCount` | `auto` | Below this the effect is a lie, so it switches **off** instead. `auto` = the preset's floor (rain needs density; a few motes still read fine as motes) |
| `minTier` | `'low'` | Never run below this device tier, at any budget |
| `priority` | `0` | Higher survives longer when the pool is squeezed. Shed lowest-first |
| `radius` | `18` | Size of the box around the camera that particles spawn in |
| `lookAhead` | `0.35` | Push the spawn box along the VIEW, in units of `radius` — a camera sees a frustum, not a sphere, so a centred box births most of its particles behind you |
| `lead` | `0.25` | Push it along MOTION, in seconds of travel — at speed you outrun a centred box, which empties the view ahead exactly when you want it fullest |
| `speedCap` | `40` | Speed (m/s) past which `lead` stops growing |
| `rate` | `0` | Particles/sec (0 = derive from the preset) |
| `color` | `''` | Override the preset's colour |
| `size` | `0` | Scale the preset's sprite size |
| `wind` | `'scene'` | `'scene'` takes the scene's [wind](/wind/) when it has one; `'own'` uses `windX`/`windZ`. `'own'` with zero wind is how you say a place is sheltered: a courtyard that stays still while the scene blows |
| `windX` | `0` | World wind (rain slants, dust blows) |
| `windZ` | `0` | |
| `disabled` | `false` | Stop emitting |
