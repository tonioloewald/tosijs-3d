/*#
# b3d-ambient

The stuff in the air, or in the water. **Bubbles and motes when you're under; rain, snow,
dust or drifting seeds when you're not.**

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
`minCount` below which it would be **a lie**, and the scene divides one shared pool
([ambient-budget](?ambient-budget.ts), sized from the measured device tier) between everyone who
wants some. Effects thin together while they can all stay honest; the moment someone would drop
under its floor, that one is switched off (lowest `priority` first) and its budget goes to the
survivors. **Better honest rain and no motes than two half-truths.**

The pool is shared because ambient effects *compete* — rain, dust and motes can each be
individually affordable and still cook the frame together. And if the frame stays over budget
anyway, the scene shrinks the pool and effects drop out on their own. That ratchet is **one-way**:
ambient that pops back in the moment the frame recovers, then out again at the next tree, is its
own broken promise.

## It arrives with the water, not on top of it

`where: 'underwater'` doesn't switch on at the surface — its emission **ramps with depth**
using the same `band()` the fog uses (see [atmosphere](?atmosphere.ts)). Submerge and the
bubbles arrive *as the water does*. Popping a cloud of bubbles into existence at a plane is
the particle version of the fog "thunk", and we already fixed that once.

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
  // `waterSize`, NOT width/height: those are not water attributes, and tosijs
  // silently DISCARDS an unknown prop (tosijs#26), so the sea stayed at its
  // 128 default beside a 2000-unit ground — "the water quad is so much smaller
  // than the land quad". `twoSided` because this demo's whole point is
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

## Presets

| preset | what it is |
|--------|------------|
| `motes` | Dust or plankton hanging in the light — near-weightless, slow drift. The cheapest way to make air (or water) feel like a *substance* rather than a vacuum |
| `bubbles` | Rise, wobble, and speed up as they go. Underwater only, really |
| `rain` | Fast, stretched, near-vertical. Add `wind` and it slants |
| `snow` | Slow, wide, wandering |
| `dust` | Blown horizontally — the wind made visible |
| `leaves` | Two-sided quads that **tumble** and blow — real oriented geometry, not a billboard, so they flip edge-on and show their back. `windX`/`windZ` stream them downwind |

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `preset` | `'motes'` | `motes` / `bubbles` / `rain` / `snow` / `dust` / `leaves` |
| `where` | `'always'` | `always` / `underwater` / `above` — emission ramps with depth, it doesn't switch |
| `count` | `auto` | Capacity to ASK for (`auto` = what the preset's look needs). You may not get it — the scene divides a shared pool |
| `minCount` | `auto` | Below this the effect is a lie, so it switches **off** instead. `auto` = the preset's floor (rain needs density; a few motes still read fine as motes) |
| `minTier` | `'low'` | Never run below this device tier, at any budget |
| `priority` | `0` | Higher survives longer when the pool is squeezed. Shed lowest-first |
| `radius` | `18` | Size of the box around the camera that particles spawn in |
| `lookAhead` | `0.35` | Push the spawn box along the VIEW, in units of `radius` — a camera sees a frustum, not a sphere, so a centred box births most of its particles behind you (#18) |
| `lead` | `0.25` | Push it along MOTION, in seconds of travel — at speed you outrun a centred box, which empties the view ahead exactly when you want it fullest (#17) |
| `speedCap` | `40` | Speed (m/s) past which `lead` stops growing |
| `rate` | `0` | Particles/sec (0 = derive from the preset) |
| `color` | `''` | Override the preset's colour |
| `size` | `0` | Scale the preset's sprite size |
| `windX` | `0` | World wind (rain slants, dust blows) |
| `windZ` | `0` | |
| `disabled` | `false` | Stop emitting |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, sceneDelta } from './b3d-utils.js';
import { band } from './atmosphere.js';
import { fillWeight, spawnBias } from './ambient-budget.js';
import { LeafField } from './ambient-leaves.js';
const V = (x, y, z) => new BABYLON.Vector3(x, y, z);
const C = (r, g, b, a) => new BABYLON.Color4(r, g, b, a);
/** Seconds to close a population deficit — how fast an effect fills in when it ramps on. */
const FILL_SECONDS = 2;
/** Fade a particle in/out over a TIME, not a fraction of its life — see `_build`. Short enough
 * that a mote drifts into view rather than materialising, long enough that it never blinks. */
const FADE_IN_SECONDS = 0.5;
const FADE_OUT_SECONDS = 1.5;
/** Ceiling on the catch-up. Fill too hard and the whole cohort is born together, which means
 * it later DIES together — one population arriving fast is worth it; one pulsing forever isn't. */
const MAX_FILL_BOOST = 6;
const PRESETS = {
    // Hanging in the light. Near-weightless: the point is that they DRIFT, and drifting is
    // what makes a volume read as a substance rather than as empty space.
    motes: {
        // A speck catching the light, not a glowing orb. But don't overcorrect: below ~2cm a mote
        // is SUB-PIXEL at any real distance and simply isn't there. The "bright blurry circle"
        // failure was never the size — it was being born on the lens, and `near` fixes that
        // structurally, which is what buys the size back.
        size: [0.02, 0.07],
        // Shorter than "hanging dust" wants, on purpose: these ramp with depth, and when you
        // SURFACE the emission stops but the living particles remain — a 22s life meant they hung
        // for 20s after you left the water. A ~6-11s life drains in a few seconds, so they fade AS
        // you rise rather than lingering. (When ambient wind lands, a longer-lived air variant can
        // split off; the underwater plankton wants the quick drain.)
        life: [6, 11],
        rate: 55,
        desired: 700,
        min: 80,
        // They HANG. No gravity worth the name and almost no launch velocity — all the motion is
        // wander, which is why they read as suspended IN something rather than falling through it.
        gravity: V(0, 0, 0),
        dir1: V(-0.015, -0.01, -0.015),
        dir2: V(0.015, 0.01, 0.015),
        // Alpha-blended, for the same reason as the bubbles: ADDITIVE IS INVISIBLE AGAINST A BRIGHT
        // BACKGROUND. Additive adds light, and you cannot add brightness to a bright sky or to pale
        // underwater fog — additive motes simply vanish in daylight. (Additive is the right choice
        // for glowing embers in a DARK scene; that's a different preset, not this one.)
        color1: C(1, 1, 0.95, 0.55),
        color2: C(0.85, 0.95, 1, 0.32),
        dead: C(1, 1, 1, 0),
        additive: false,
        wander: V(0.35, 0.2, 0.35), // a shimmer, not a drift
        near: 1.5, // nothing born inside arm's reach — that's where blobs come from
    },
    // Rise, wobble, accelerate. (A bubble really does speed up as it rises and expands.)
    bubbles: {
        size: [0.04, 0.22],
        life: [5, 11],
        rate: 40,
        desired: 440,
        min: 60,
        // SLOWLY meandering up. A bubble that rises in a straight line looks like tracer fire;
        // the (mostly horizontal) wander is what makes it look like it's pushing through water.
        gravity: V(0, 0.22, 0),
        dir1: V(-0.05, 0.12, -0.05),
        dir2: V(0.05, 0.35, 0.05),
        // NOT additive, and this is the whole reason you can see them. Additive ADDS light, and
        // underwater the fog is already a bright pale blue — you cannot meaningfully add
        // brightness to something that's nearly white, so additive bubbles are invisible exactly
        // where bubbles are supposed to be. Alpha-blended near-white reads as the silvery rim of
        // a real bubble against the water.
        color1: C(0.95, 1, 1, 0.85),
        color2: C(0.75, 0.9, 1, 0.6),
        dead: C(1, 1, 1, 0),
        additive: false,
        wander: V(1.1, 0.25, 1.1), // wide sideways wander, barely any vertical
        near: 0.8, // a bubble born on the lens is a smudge, not a bubble
    },
    rain: {
        size: [0.02, 0.06],
        life: [0.6, 1.1],
        rate: 700,
        desired: 770,
        min: 400,
        gravity: V(0, -55, 0),
        dir1: V(-0.5, -14, -0.5),
        dir2: V(0.5, -18, 0.5),
        color1: C(0.75, 0.85, 0.95, 0.5),
        color2: C(0.6, 0.7, 0.85, 0.35),
        dead: C(0.7, 0.8, 0.9, 0),
        additive: false,
        wander: null, // rain is the one thing that should NOT wander
        near: 0.6, // no drops materialising on your nose
    },
    snow: {
        size: [0.06, 0.22],
        life: [4, 9],
        rate: 220,
        desired: 1980,
        min: 300,
        gravity: V(0, -0.6, 0),
        dir1: V(-0.6, -1.4, -0.6),
        dir2: V(0.6, -0.6, 0.6),
        color1: C(1, 1, 1, 0.9),
        color2: C(0.92, 0.95, 1, 0.7),
        dead: C(1, 1, 1, 0),
        additive: false,
        wander: V(0.8, 0.15, 0.8), // wandering is most of what makes snow read as snow
        near: 0.6,
    },
    dust: {
        size: [0.04, 0.16],
        life: [2.5, 5],
        rate: 160,
        desired: 800,
        min: 150,
        gravity: V(0, -0.05, 0),
        dir1: V(2, -0.2, 0),
        dir2: V(6, 0.3, 0),
        color1: C(0.85, 0.78, 0.62, 0.4),
        color2: C(0.7, 0.62, 0.5, 0.25),
        dead: C(0.8, 0.75, 0.6, 0),
        additive: false,
        wander: V(0.9, 0.4, 0.9),
        near: 0.6,
    },
    // NOT a sprite. Leaves are two-sided tumbling quads (see ambient-leaves.ts) — this entry only
    // supplies the shared numbers B3dAmbient reads: budget (desired/min), the fill weight (a leaf
    // quad is far bigger than a dot, so it rightly costs more of the pool), and the near radius.
    // The sprite-only fields (colours, dirs, gravity, wander) are inert for this preset.
    leaves: {
        size: [0.22, 0.45], // quad size in metres — big enough to read as a leaf at a glance
        life: [8, 16],
        rate: 0,
        desired: 320,
        min: 50,
        gravity: V(0, 0, 0),
        dir1: V(0, 0, 0),
        dir2: V(0, 0, 0),
        color1: C(1, 1, 1, 1),
        color2: C(1, 1, 1, 1),
        dead: C(1, 1, 1, 0),
        additive: false,
        wander: null,
        near: 1.0,
    },
};
/** Presets that render as tumbling quads (SolidParticleSystem) rather than camera-facing sprites. */
const QUAD_PRESETS = new Set(['leaves']);
/**
 * A soft round dot, drawn once. Babylon needs a particle texture, and a hard-edged square is
 * the difference between "snow" and "confetti".
 */
function dotTexture(scene) {
    const existing = scene.getTextureByName?.('ambient-dot');
    if (existing)
        return existing;
    const tex = new BABYLON.DynamicTexture('ambient-dot', { width: 64, height: 64 }, scene, false);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;
    return tex;
}
let nextAmbientId = 0;
/** Fallback view direction when no camera can be asked. */
const FORWARD_Z = new BABYLON.Vector3(0, 0, 1);
export class B3dAmbient extends B3dChild {
    static preferredTagName = 'tosi-b3d-ambient';
    static initAttributes = {
        preset: 'motes',
        where: 'always',
        count: 0, // auto — ASK for the preset's natural capacity, then take what the scene grants
        minCount: 0, // auto — the preset's honesty floor
        minTier: 'low',
        priority: 0,
        radius: 18,
        // Bias the spawn box toward what the camera can actually SEE and where the
        // owner is GOING. Defaults are modest: enough to fix a vehicle without
        // visibly changing a walker. 0 for either restores the centred box.
        lookAhead: 0.35,
        lead: 0.25,
        speedCap: 40,
        rate: 0,
        color: '',
        size: 0,
        windX: 0,
        windZ: 0,
        /*
        Take the SCENE's wind, or this element's own — see [[wind]].
    
        Unlike `b3d-clouds` and `b3d-water`, whose wind attributes have non-zero
        defaults, absence IS detectable here: `windX`/`windZ` default to `0`. So
        "inherit when unset" would have worked without a mode.
    
        The mode still earns its place, because `'own'` with zero wind is the only
        way to say "this place is SHELTERED" — a courtyard that stays still while
        the scene blows. Under an inherit rule that sentence is unsayable.
        */
        wind: 'scene',
        disabled: false,
    };
    /** The drift this frame: the scene's wind, or this element's own. */
    _wind() {
        if (this.wind !== 'own') {
            const scene = this.owner?.wind;
            if (scene != null && (scene.x !== 0 || scene.z !== 0)) {
                return { windX: scene.x, windZ: scene.z };
            }
        }
        return { windX: this.windX, windZ: this.windZ };
    }
    /** 0…1 — how strongly this is emitting right now (ramps, never switches). */
    get intensity() {
        return this._intensity;
    }
    /** Capacity the scene actually granted. **0 = switched off** (couldn't be honest). */
    get granted() {
        return this._granted;
    }
    /** Particles alive right now — diagnostic. `granted` but `active` 0 = built, not rendering. */
    get active() {
        if (this._leaves != null)
            return this._leaves.liveCount;
        return this._ps?.getActiveCount() ?? 0;
    }
    _ps = null;
    _leaves = null;
    _emitter = new BABYLON.Vector3(0, 0, 0);
    /** Spawn-box vertical extent, emitter-relative — clipped at the waterline. */
    _spawnLoY = -18;
    _spawnHiY = 18;
    _lastEye = new BABYLON.Vector3(0, 0, 0);
    _eyeVel = new BABYLON.Vector3(0, 0, 0);
    _intensity = 0;
    _baseRate = 0;
    _granted = 0;
    _id = `ambient-${nextAmbientId++}`;
    _offBudget = null;
    _tick = () => this._update();
    get _p() {
        return PRESETS[this.preset] ?? PRESETS.motes;
    }
    get _isQuad() {
        return QUAD_PRESETS.has(this.preset);
    }
    get _sizeScale() {
        return this.size > 0 ? this.size : 1;
    }
    /** What we're ASKING the scene for. The scene divides one pool between all comers. */
    budgetRequest() {
        const p = this._p;
        return {
            id: this._id,
            desired: this.count > 0 ? this.count : p.desired,
            min: this.minCount > 0 ? this.minCount : p.min,
            minTier: this.minTier,
            priority: this.priority,
            weight: fillWeight(p.size[1] * this._sizeScale, p.additive),
        };
    }
    /**
     * The scene's answer: the POPULATION we're allowed to sustain. `0` = switch off.
     *
     * **This must not rebuild the ParticleSystem, and it used to.** Capacity is baked in at
     * construction, so re-allocating meant tear-down + rebuild — and every re-allocation
     * (quality change, XR entry, a watchdog shed) made the whole effect vanish and visibly
     * REGENERATE in front of you. Worse, a shed to 0 deleted the particles mid-air.
     *
     * So the buffer is sized ONCE, for the effect's full desired population, and the allocation
     * drives the emission instead (see `_fillRate`). A buffer is cheap; what actually costs is
     * live particles filling pixels, and that's exactly what the population governs. Shedding to
     * 0 now stops emission and lets the existing particles LIVE OUT their lives — the effect
     * drains away instead of being snatched.
     */
    applyAllocation(capacity) {
        if (capacity === this._granted)
            return;
        this._granted = capacity;
        // Build on first non-zero grant. Never rebuild after that.
        if (capacity > 0 &&
            this.owner != null &&
            this._ps == null &&
            this._leaves == null) {
            if (this._isQuad)
                this._buildLeaves(this.owner.scene, this._budgetCapacity());
            else
                this._build(this.owner.scene, this._budgetCapacity());
        }
    }
    /** Buffer size: the effect's FULL desired population, regardless of what it's granted. */
    _budgetCapacity() {
        return this.count > 0 ? this.count : this._p.desired;
    }
    sceneReady(owner, _scene) {
        // Don't build anything yet — ask, and build only what we're granted.
        this._offBudget = owner.registerAmbient(this);
    }
    _build(scene, capacity) {
        const p = this._p;
        const ps = new BABYLON.ParticleSystem(`ambient-${this.preset}`, Math.max(1, capacity), scene);
        ps.particleTexture = dotTexture(scene);
        ps.emitter = this._emitter; // a WORLD point we move to the camera each frame
        // The box, MINUS a sphere around the eye. Without the hole, particles are born on your
        // face: a sprite a few centimetres wide at half a metre is a big soft blob filling a chunk
        // of the screen — the "bright blurry circle" failure. Anything that drifts in close later
        // is fine; it's being BORN there that reads as a smudge on the lens.
        const r = this.radius;
        const near = p.near;
        ps.startPositionFunction = (worldMatrix, positionToUpdate, _particle, isLocal) => {
            let x = 0;
            let y = 0;
            let z = 0;
            /*
            CLIP THE SPAWN BOX AT THE WATERLINE.
      
            Intensity already ramps on the CAMERA's depth, and that was never the
            problem — the box is. It is a cube of side 2r centred on the eye, so with
            the eye anywhere near the surface, half of it is in the wrong medium:
            `above` leaves are born a radius BELOW the waterline and `underwater`
            bubbles a radius above it. Swimming in third person parks the camera right
            at the surface and makes it constant, which is how Tonio found it — "a LOT
            of ambient particles including leaves (below water) and bubbles (above)".
      
            Intensity says HOW MUCH to emit; it cannot say WHERE, so this is not
            something the ramp could ever have fixed. The medium has a boundary, so
            the volume needs one too — the same lesson as the biped's plane-vs-volume
            submersion test, one layer along.
            */
            const loY = this._spawnLoY;
            const hiY = this._spawnHiY;
            // Rejection-sample out of the near-field core. Bounded — on the rare miss we just take
            // the last sample rather than spin.
            for (let i = 0; i < 8; i++) {
                x = (Math.random() * 2 - 1) * r;
                y = loY + Math.random() * (hiY - loY);
                z = (Math.random() * 2 - 1) * r;
                if (x * x + y * y + z * z >= near * near)
                    break;
            }
            if (isLocal) {
                positionToUpdate.copyFromFloats(x, y, z);
                return;
            }
            BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, worldMatrix, positionToUpdate);
        };
        const c = this.color ? BABYLON.Color3.FromHexString(this.color) : null;
        const c1 = c ? C(c.r, c.g, c.b, p.color1.a) : p.color1;
        const c2 = c ? C(c.r, c.g, c.b, p.color2.a) : p.color2;
        ps.color1 = c1;
        ps.color2 = c2;
        ps.colorDead = p.dead;
        // FADE IN, not just out. Born at full alpha, a particle BLINKS into existence — which
        // reads as sensor noise rather than as dust hanging in the air.
        //
        // But the fade must be a TIME, not a fraction of life. Babylon's gradients are keyed on
        // life fraction, and a mote lives up to 22s — so a "fade in over the first 18%" is a FOUR
        // SECOND fade, and the room appears to fill in slow motion even though the particles are
        // already there. The same 18% is a perfectly good 0.2s for rain. So pick the seconds you
        // want and convert: the fade is what the eye reads, and the eye reads seconds.
        const frac = (seconds) => Math.min(0.3, Math.max(0.01, seconds / p.life[1]));
        const inAt = frac(FADE_IN_SECONDS);
        const outAt = 1 - frac(FADE_OUT_SECONDS);
        const clear = (col) => C(col.r, col.g, col.b, 0);
        ps.addColorGradient(0, clear(c1), clear(c2));
        ps.addColorGradient(inAt, c1, c2);
        ps.addColorGradient(outAt, c1, c2);
        ps.addColorGradient(1, p.dead, p.dead);
        const scale = this._sizeScale;
        ps.minSize = p.size[0] * scale;
        ps.maxSize = p.size[1] * scale;
        ps.minLifeTime = p.life[0];
        ps.maxLifeTime = p.life[1];
        ps.gravity = p.gravity;
        ps.direction1 = p.dir1;
        ps.direction2 = p.dir2;
        ps.blendMode = p.additive
            ? BABYLON.ParticleSystem.BLENDMODE_ADD
            : BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        if (p.wander) {
            // Babylon moves particles in straight lines; a noise texture is what buys the wander.
            const noise = new BABYLON.NoiseProceduralTexture(`ambient-noise-${this.preset}`, 128, scene);
            noise.animationSpeedFactor = 1.6;
            noise.persistence = 1.4;
            noise.brightness = 0.5;
            noise.octaves = 3;
            ps.noiseTexture = noise;
            ps.noiseStrength = p.wander;
        }
        this._baseRate = this.rate > 0 ? this.rate : p.rate;
        ps.emitRate = 0; // ramped in _update — never switched on
        ps.start();
        /*
        BUBBLES POP AT THE SURFACE; LEAVES DO NOT SINK.
    
        Clipping the spawn box fixed where particles are BORN, and bubbles rise, so
        one born just under the surface crosses it a moment later and is seen in the
        air. Tonio, after that fix: "still seeing bubbles above the waterline."
    
        Birth position and lifetime are different questions and this is the second
        one. Retiring a particle at the boundary is also what actually happens — a
        bubble reaching the surface pops — so the fix and the physics agree, which
        is usually the sign of the right one.
    
        `updateFunction` wraps rather than replaces Babylon's, so emission, colour
        and size gradients keep working; setting `age = lifeTime` retires a particle
        through the engine's own path rather than teleporting or hiding it.
        */
        if (this.where !== 'always') {
            const base = ps.updateFunction.bind(ps);
            const underwater = this.where === 'underwater';
            ps.updateFunction = (particles) => {
                base(particles);
                const waterY = this._waterY();
                if (waterY == null)
                    return;
                for (const particle of particles) {
                    const wrongSide = underwater
                        ? particle.position.y > waterY
                        : particle.position.y < waterY;
                    if (wrongSide)
                        particle.age = particle.lifeTime;
                }
            };
        }
        this._ps = ps;
        scene.registerBeforeRender(this._tick);
    }
    /** The quad (leaf) path — a SolidParticleSystem, not a ParticleSystem. Same box-rides-camera,
     * grant-drives-population, fade-don't-switch contract; the tumble lives in `ambient-leaves.ts`. */
    _buildLeaves(scene, capacity) {
        const p = this._p;
        this._leaves = new LeafField(scene, {
            capacity,
            radius: this.radius,
            near: p.near,
            size: [p.size[0] * this._sizeScale, p.size[1] * this._sizeScale],
        });
        scene.registerBeforeRender(this._tick);
    }
    /** Give the GPU resources back. The noise texture is ours too — dispose it or a shed effect
     * keeps paying for the wander it no longer draws. */
    _teardown() {
        if (this._ps == null && this._leaves == null)
            return;
        this.owner?.scene.unregisterBeforeRender(this._tick);
        this._ps?.noiseTexture?.dispose();
        this._ps?.dispose();
        this._ps = null;
        this._leaves?.dispose();
        this._leaves = null;
        this._intensity = 0;
    }
    sceneDispose() {
        this._offBudget?.();
        this._offBudget = null;
        this._teardown();
    }
    _update() {
        const scene = this.owner?.scene;
        const cam = scene?.activeCamera;
        if (scene == null || cam == null)
            return;
        // The box rides with you; the particles, once born, do NOT (Babylon particles live in
        // world space unless you ask otherwise). That's the whole illusion.
        const eye = cam.globalPosition;
        this._intensity = this.disabled ? 0 : this._whereWeight(eye.y);
        this._clipSpawnBox();
        // Quad (leaf) path: population the budget×gaze allow, eased in `LeafField`.
        if (this._isQuad) {
            const leaves = this._leaves;
            if (leaves == null)
                return;
            leaves.setEmitter(eye.x, eye.y, eye.z);
            const { windX, windZ } = this._wind();
            leaves.setWind(windX, windZ);
            const cap = this._budgetCapacity();
            const share = this._granted / Math.max(1, cap);
            const dt = sceneDelta(scene);
            leaves.update(dt, cap * Math.min(1, share) * this._intensity);
            return;
        }
        const ps = this._ps;
        if (ps == null)
            return;
        this._emitter.copyFrom(eye);
        // Bias the box along the wind, so windblown stuff arrives from upwind instead of
        // materialising all around you.
        const blowing = this._wind();
        this._emitter.x -= blowing.windX * 0.5;
        this._emitter.z -= blowing.windZ * 0.5;
        // …and toward what the camera is looking at, and where it is going. Velocity
        // is measured from the eye's OWN displacement rather than asked of a vehicle:
        // this element has no owner entity, and in a chase view the camera's motion
        // is what matters anyway (it trails the craft, which is half of #17).
        const dtFrame = sceneDelta(scene);
        if (dtFrame > 1e-5) {
            const inst = eye.subtract(this._lastEye).scale(1 / dtFrame);
            // Low-passed: a single frame's displacement is noisy, and a jittering
            // spawn centre reads as flicker.
            this._eyeVel.scaleInPlace(0.85).addInPlace(inst.scale(0.15));
        }
        this._lastEye.copyFrom(eye);
        const fwd = scene.activeCamera?.getForwardRay?.(1)?.direction ?? FORWARD_Z;
        const bias = spawnBias(fwd, this._eyeVel, {
            radius: this.radius,
            lookAhead: this.lookAhead,
            lead: this.lead,
            speedCap: this.speedCap,
        });
        this._emitter.x += bias.x;
        this._emitter.y += bias.y;
        this._emitter.z += bias.z;
        ps.emitRate = this._fillRate(ps);
        // Wind is world-space drift, applied to the emission cone rather than to each particle.
        if (this.windX !== 0 || this.windZ !== 0) {
            const p = PRESETS[this.preset] ?? PRESETS.motes;
            ps.direction1.set(p.dir1.x + this.windX, p.dir1.y, p.dir1.z + this.windZ);
            ps.direction2.set(p.dir2.x + this.windX, p.dir2.y, p.dir2.z + this.windZ);
        }
    }
    /**
     * Emit toward a POPULATION, not at a fixed rate.
     *
     * A rate only reaches its steady-state population after roughly one particle lifetime — and
     * a mote lives up to 22 seconds, so a naive `rate × intensity` means you walk into an empty
     * room and watch the dust slowly arrive. You'd start with nothing every single time: on load,
     * and on every ramp-in.
     *
     * So aim at the population the look actually wants (`rate × mean life × intensity`) and, when
     * short, emit fast enough to close the gap in a couple of seconds rather than in a lifetime.
     * The boost is self-cancelling — the deficit goes to zero as the population arrives and the
     * rate settles back to natural — so this is a fill, not a permanent multiplier. Capped,
     * because an unbounded catch-up would slam the whole population out in one frame and they'd
     * then all die together in one visible pulse.
     */
    _fillRate(ps) {
        // The GRANT is a population, and it's what the budget actually bought. Scale the preset's
        // natural rate by the share we were given, so a squeezed effect emits proportionally
        // slower rather than being torn down and rebuilt at a smaller size.
        const share = this._granted / Math.max(1, this._budgetCapacity());
        const natural = this._baseRate * this._intensity * Math.min(1, share);
        // Granted 0 ⇒ stop emitting. The particles already in the air live out their lives and the
        // effect DRAINS instead of being snatched away mid-frame.
        if (natural <= 0)
            return 0;
        const p = this._p;
        const meanLife = (p.life[0] + p.life[1]) / 2;
        const target = Math.min(natural * meanLife, this._granted);
        const deficit = target - ps.getActiveCount();
        if (deficit <= 0)
            return natural;
        return Math.min(natural + deficit / FILL_SECONDS, natural * MAX_FILL_BOOST);
    }
    /**
     * How much we're emitting, given where the camera is. **Ramps, never switches** — bubbles
     * arrive as the water does. A hard cut at the surface is the particle version of the fog
     * thunk, and we fixed that once already.
     */
    /**
     * Keep the spawn box on the right side of the water. See the note in the
     * spawn function for why intensity could never have done this.
     *
     * Runs after the emitter has been placed, so it clips against where particles
     * will ACTUALLY be born rather than against the camera — the two differ by the
     * look-ahead and wind bias, which is exactly the amount that would leak.
     */
    _clipSpawnBox() {
        const r = this.radius;
        this._spawnLoY = -r;
        this._spawnHiY = r;
        if (this.where === 'always')
            return;
        const waterY = this._waterY();
        if (waterY == null)
            return;
        const surface = waterY - this._emitter.y; // emitter-relative waterline
        if (this.where === 'above')
            this._spawnLoY = Math.max(-r, surface);
        else
            this._spawnHiY = Math.min(r, surface);
        // Fully on the wrong side: leave a degenerate sliver rather than an
        // inverted box. Intensity is ~0 here anyway, so nothing is born.
        if (this._spawnLoY > this._spawnHiY)
            this._spawnLoY = this._spawnHiY;
    }
    _whereWeight(eyeY) {
        if (this.where === 'always')
            return 1;
        const waterY = this._waterY();
        if (waterY == null)
            return this.where === 'above' ? 1 : 0;
        const depth = waterY - eyeY;
        // Same band the fog uses — so they agree, and the world changes as ONE thing.
        const under = band(depth, -0.05, 0.4);
        return this.where === 'underwater' ? under : 1 - under;
    }
    _waterY() {
        const water = this.owner?.querySelector('tosi-b3d-water');
        const m = water?.mesh;
        return m ? m.absolutePosition.y : null;
    }
}
export const b3dAmbient = B3dAmbient.elementCreator();
//# sourceMappingURL=b3d-ambient.js.map