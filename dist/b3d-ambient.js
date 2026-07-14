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
import { b3d, b3dAircraft, b3dAmbient, b3dWater, b3dFog, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 30, vtolSpeed: 6, maxSpeed: 40,
})

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.6 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 11 }),
  b3dFog({ start: 200, end: 1200, color: '#bfd9f2' }),
  b3dGround({ meshName: 'ground_nocast', width: 2000, height: 2000, color: '#6b7f5e', y: -40 }),
  b3dWater({ y: 0, width: 2000, height: 2000 }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),

  // Under the surface: bubbles rising, motes hanging in the light.
  // No `count` — it adapts to the device.
  b3dAmbient({ preset: 'bubbles', where: 'underwater' }),
  b3dAmbient({ preset: 'motes', where: 'underwater' }),

  inputFocus(gameController(), aircraft),
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

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `preset` | `'motes'` | `motes` / `bubbles` / `rain` / `snow` / `dust` |
| `where` | `'always'` | `always` / `underwater` / `above` — emission ramps with depth, it doesn't switch |
| `count` | `auto` | Capacity to ASK for (`auto` = what the preset's look needs). You may not get it — the scene divides a shared pool |
| `minCount` | `auto` | Below this the effect is a lie, so it switches **off** instead. `auto` = the preset's floor (rain needs density; a few motes still read fine as motes) |
| `minTier` | `'low'` | Never run below this device tier, at any budget |
| `priority` | `0` | Higher survives longer when the pool is squeezed. Shed lowest-first |
| `radius` | `18` | Size of the box around the camera that particles spawn in |
| `rate` | `0` | Particles/sec (0 = derive from the preset) |
| `color` | `''` | Override the preset's colour |
| `size` | `0` | Override the preset's size |
| `windX` | `0` | World wind (rain slants, dust blows) |
| `windZ` | `0` | |
| `disabled` | `false` | Stop emitting |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import { band } from './atmosphere';
import { fillWeight } from './ambient-budget';
const V = (x, y, z) => new BABYLON.Vector3(x, y, z);
const C = (r, g, b, a) => new BABYLON.Color4(r, g, b, a);
const PRESETS = {
    // Hanging in the light. Near-weightless: the point is that they DRIFT, and drifting is
    // what makes a volume read as a substance rather than as empty space.
    motes: {
        size: [0.03, 0.12],
        life: [10, 22],
        rate: 55,
        desired: 1210,
        min: 80,
        // They HANG. No gravity worth the name and almost no launch velocity — all the motion is
        // wander, which is why they read as suspended IN something rather than falling through it.
        gravity: V(0, 0, 0),
        dir1: V(-0.015, -0.01, -0.015),
        dir2: V(0.015, 0.01, 0.015),
        color1: C(1, 1, 0.95, 0.5),
        color2: C(0.85, 0.95, 1, 0.35),
        dead: C(1, 1, 1, 0),
        additive: true,
        wander: V(0.35, 0.2, 0.35), // a shimmer, not a drift
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
        color1: C(0.8, 0.95, 1, 0.5),
        color2: C(0.6, 0.85, 1, 0.35),
        dead: C(1, 1, 1, 0),
        additive: true,
        wander: V(1.1, 0.25, 1.1), // wide sideways wander, barely any vertical
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
    },
};
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
export class B3dAmbient extends B3dChild {
    static initAttributes = {
        preset: 'motes',
        where: 'always',
        count: 0, // auto — ASK for the preset's natural capacity, then take what the scene grants
        minCount: 0, // auto — the preset's honesty floor
        minTier: 'low',
        priority: 0,
        radius: 18,
        rate: 0,
        color: '',
        size: 0,
        windX: 0,
        windZ: 0,
        disabled: false,
    };
    /** 0…1 — how strongly this is emitting right now (ramps, never switches). */
    get intensity() {
        return this._intensity;
    }
    /** Capacity the scene actually granted. **0 = switched off** (couldn't be honest). */
    get granted() {
        return this._granted;
    }
    _ps = null;
    _emitter = new BABYLON.Vector3(0, 0, 0);
    _intensity = 0;
    _baseRate = 0;
    _granted = 0;
    _id = `ambient-${nextAmbientId++}`;
    _offBudget = null;
    _tick = () => this._update();
    get _p() {
        return PRESETS[this.preset] ?? PRESETS.motes;
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
     * The scene's answer. `0` means we could not be given enough to be *honest* — so we switch
     * off rather than emit a thin lie. Rebuilds because Babylon bakes capacity into the
     * ParticleSystem at construction; this only runs on real changes (quality, XR entry, a shed).
     */
    applyAllocation(capacity) {
        if (capacity === this._granted)
            return;
        this._granted = capacity;
        this._teardown();
        if (capacity > 0 && this.owner != null)
            this._build(this.owner.scene, capacity);
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
        const r = this.radius;
        ps.minEmitBox = V(-r, -r, -r);
        ps.maxEmitBox = V(r, r, r);
        const c = this.color ? BABYLON.Color3.FromHexString(this.color) : null;
        ps.color1 = c ? C(c.r, c.g, c.b, p.color1.a) : p.color1;
        ps.color2 = c ? C(c.r, c.g, c.b, p.color2.a) : p.color2;
        ps.colorDead = p.dead;
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
        this._ps = ps;
        scene.registerBeforeRender(this._tick);
    }
    /** Give the GPU resources back. The noise texture is ours too — dispose it or a shed effect
     * keeps paying for the wander it no longer draws. */
    _teardown() {
        if (this._ps == null)
            return;
        this.owner?.scene.unregisterBeforeRender(this._tick);
        this._ps.noiseTexture?.dispose();
        this._ps.dispose();
        this._ps = null;
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
        const ps = this._ps;
        if (scene == null || cam == null || ps == null)
            return;
        // The box rides with you; the particles, once born, do NOT (Babylon particles live in
        // world space unless you ask otherwise). That's the whole illusion.
        const eye = cam.globalPosition;
        this._emitter.copyFrom(eye);
        // Bias the box along the wind, so windblown stuff arrives from upwind instead of
        // materialising all around you.
        this._emitter.x -= this.windX * 0.5;
        this._emitter.z -= this.windZ * 0.5;
        this._intensity = this.disabled ? 0 : this._whereWeight(eye.y);
        ps.emitRate = this._baseRate * this._intensity;
        // Wind is world-space drift, applied to the emission cone rather than to each particle.
        if (this.windX !== 0 || this.windZ !== 0) {
            const p = PRESETS[this.preset] ?? PRESETS.motes;
            ps.direction1.set(p.dir1.x + this.windX, p.dir1.y, p.dir1.z + this.windZ);
            ps.direction2.set(p.dir2.x + this.windX, p.dir2.y, p.dir2.z + this.windZ);
        }
    }
    /**
     * How much we're emitting, given where the camera is. **Ramps, never switches** — bubbles
     * arrive as the water does. A hard cut at the surface is the particle version of the fog
     * thunk, and we fixed that once already.
     */
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
export const b3dAmbient = B3dAmbient.elementCreator({
    tag: 'tosi-b3d-ambient',
});
//# sourceMappingURL=b3d-ambient.js.map