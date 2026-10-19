/*
PLAYING AN EFFECT RECIPE in a Babylon scene (EFFECTS-DESIGN.md). One player
per effect, on a node it follows; every player in a scene is driven by ONE
observer, which then settles the shared pools:

- LIGHTS: effect lights and the scene's other point and spot lights compete
  for `effectLights` slots by strength × locality (`rankLights`). An effect
  light that loses fades out rather than popping. (Lamps are counted, so an
  effect light loses to a brighter lamp nearby, but a lamp is never switched
  off by an effect: that is the known gap of step 1.)
- VOICES: at most `effectVoices` at once; over it, the quietest stops.
- PARTICLES: when the scene holds more than `effectParticles`, every effect
  emits proportionally less (what is alive is left to die out).

The world reacts: particles are carried by the wind where the effect is
(`windAt`), `land` particles settle on whatever is below them (a downward
pick, a few per frame), and sound is sampled `distance / 343` seconds late,
quieter and duller with distance.
*/
import * as BABYLON from '@babylonjs/core';
import { distanceCutoff, layerAt, rankLights, sampleCurve, soundDelay, } from './effect-recipe.js';
import { effectSprite, effectTexture } from './effect-sprites.js';
import { placeListener, startVoice } from './effect-audio.js';
import { sceneDelta } from './b3d-utils.js';
import { qualityBudgets } from './b3d-quality.js';
const perScene = new WeakMap();
function sceneEffects(scene) {
    const s = perScene.get(scene);
    if (s != null)
        return s;
    const fresh = {
        players: new Set(),
        lights: [],
        voices: new Set(),
        effectLights: new Set(),
        observer: scene.onBeforeRenderObservable.add(() => tick(scene, fresh)),
    };
    scene.onDisposeObservable.addOnce(() => perScene.delete(scene));
    perScene.set(scene, fresh);
    return fresh;
}
/** Every player, then the pools. */
function tick(scene, s) {
    const dt = Math.min(0.1, sceneDelta(scene));
    const cam = scene.activeCamera;
    if (cam != null)
        placeListener(cam);
    const budget = qualityBudgets();
    // PARTICLES: one throttle for every effect, from what is alive now.
    let alive = 0;
    for (const p of s.players)
        alive += p.particlesAlive();
    const throttle = alive > budget.effectParticles ? budget.effectParticles / alive : 1;
    s.lights.length = 0;
    for (const p of s.players)
        p.step(dt, throttle, s);
    // LIGHTS: effect lights against the scene's other lights, strength × locality.
    const eye = cam?.globalPosition ?? BABYLON.Vector3.Zero();
    const others = scene.lights.filter((l) => !s.effectLights.has(l) &&
        l.isEnabled() &&
        (l instanceof BABYLON.PointLight || l instanceof BABYLON.SpotLight));
    const candidates = [
        ...s.lights.map((l) => ({
            intensity: l.want,
            range: l.range,
            distance: BABYLON.Vector3.Distance(eye, l.light.position),
        })),
        ...others.map((l) => ({
            intensity: l.intensity,
            range: l.range,
            distance: BABYLON.Vector3.Distance(eye, l.getAbsolutePosition()),
        })),
    ];
    const won = new Set(rankLights(candidates, budget.effectLights));
    s.lights.forEach((l, i) => {
        const target = won.has(i) ? 1 : 0;
        // Fade, not pop: about a sixth of a second either way.
        l.fade += Math.sign(target - l.fade) * Math.min(Math.abs(target - l.fade), dt * 6);
        l.light._effectFade = l.fade;
        l.light.intensity = l.want * l.fade;
        l.light.range = l.range;
        l.light.setEnabled(l.fade > 0.01 && l.want > 0);
    });
    // VOICES: the quietest yields.
    if (s.voices.size > budget.effectVoices) {
        const quiet = [...s.voices].sort((a, b) => a.audible - b.audible);
        for (const v of quiet.slice(0, s.voices.size - budget.effectVoices)) {
            v.voice.stop();
            s.voices.delete(v);
        }
    }
}
const color4 = (hex) => BABYLON.Color4.FromHexString(hex.length === 7 ? `${hex}ff` : hex);
export class EffectPlayer {
    scene;
    node;
    recipe;
    /** 0 to 1: the effect's activity dial. */
    activity;
    /** Silence its sound layers (the tool's mute). */
    muted = false;
    t = 0;
    prev = -Infinity;
    playing = false;
    finished = false;
    runtimes = [];
    options;
    shared;
    constructor(scene, node, recipe, options = {}) {
        this.scene = scene;
        this.node = node;
        this.recipe = recipe;
        this.activity = recipe.activity ?? 1;
        this.options = options;
        this.shared = sceneEffects(scene);
        this.build();
        this.shared.players.add(this);
    }
    /** Seconds since `play`. */
    get time() {
        return this.t;
    }
    get isPlaying() {
        return this.playing;
    }
    /** Start from the beginning. */
    play() {
        this.t = 0;
        this.prev = -Infinity;
        this.playing = true;
        this.finished = false;
        for (const r of this.runtimes)
            r.halt();
    }
    /** Stop: no more emission, sound and light fade; what is alive dies out. */
    stop() {
        this.playing = false;
        for (const r of this.runtimes)
            r.halt();
    }
    /** Swap the recipe (the tool editing it): rebuilt, playing on from now. */
    setRecipe(recipe) {
        for (const r of this.runtimes)
            r.dispose();
        this.recipe = recipe;
        this.build();
    }
    dispose() {
        for (const r of this.runtimes)
            r.dispose();
        this.runtimes = [];
        this.shared.players.delete(this);
    }
    /** Particles alive now, for the scene's budget. */
    particlesAlive() {
        let n = 0;
        for (const r of this.runtimes)
            n += r.alive?.() ?? 0;
        return n;
    }
    /** One frame. Called by the scene's effect observer. */
    step(dt, throttle, s) {
        if (!this.playing)
            return;
        this.t += dt;
        for (const r of this.runtimes) {
            ;
            r.throttle = throttle;
            r.shared = s;
            r.update(this.t, this.prev, this.activity, dt);
        }
        this.prev = this.t;
        const d = this.recipe.duration;
        if (d != null && !this.finished) {
            const linger = Math.max(0, ...this.runtimes.map((r) => r.linger));
            if (this.t >= d + linger) {
                this.finished = true;
                this.playing = false;
                for (const r of this.runtimes)
                    r.halt();
                this.options.whenDone?.();
            }
        }
    }
    build() {
        this.runtimes = this.recipe.layers.map((l) => l.kind === 'particles'
            ? this.particles(l)
            : l.kind === 'light'
                ? this.light(l)
                : this.sound(l));
    }
    particles(l0) {
        const scene = this.scene;
        const k = this.options.scale ?? 1;
        const rk = Math.sqrt(k);
        const l = k === 1
            ? l0
            : {
                ...l0,
                emitter: { ...l0.emitter, radius: (l0.emitter.radius ?? 0) * k },
                size: [l0.size[0] * k, l0.size[1] * k],
                speed: [l0.speed[0] * rk, l0.speed[1] * rk],
                life: [l0.life[0] * rk, l0.life[1] * rk],
                // As many alive at once: a longer life, a lower rate.
                rate: l0.rate / rk,
                // Per second, on a clock that runs √k slower.
                drag: l0.drag != null ? l0.drag / rk : undefined,
                height: (l0.height ?? 0) * k,
            };
        const burst = l.burst ?? 0;
        const capacity = Math.min(4000, Math.ceil(l.rate * l.life[1] * 1.2 + burst * 1.2 + 8));
        const ps = new BABYLON.ParticleSystem(`effect-${l.name ?? 'particles'}`, capacity, scene);
        ps.particleTexture = l.texture ? effectTexture(scene, l.texture) : effectSprite(scene, l.sprite);
        ps.blendMode =
            l.blend === 'add'
                ? BABYLON.ParticleSystem.BLENDMODE_ADD
                : BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        const at = new BABYLON.Vector3();
        ps.emitter = at;
        /*
        SECONDS. Babylon ages a particle by `updateSpeed` per 60 Hz frame
        (default 0.01), so a "0.7 s" fireball lived about 3.5 s and speeds and
        gravity were in the same odd units. At 1/60 a life is seconds, a speed
        metres a second and gravity m/s², as the recipe says.
        */
        ps.updateSpeed = 1 / 60;
        ps.minLifeTime = l.life[0];
        ps.maxLifeTime = l.life[1];
        const cs = l.colors.length > 1 ? l.colors : [l.colors[0], l.colors[0]];
        /*
        SMOKE FADES IN. A covering (alpha) particle that starts at full strength
        pops into being; over its first few percent it comes up from nothing.
        Glowing (additive) ones flash on, as sparks should.
        */
        const fadeIn = l.blend === 'alpha' ? 0.08 : 0;
        if (fadeIn > 0) {
            const first = color4(cs[0]);
            ps.addColorGradient(0, new BABYLON.Color4(first.r, first.g, first.b, 0));
        }
        cs.forEach((c, i) => ps.addColorGradient(fadeIn + (1 - fadeIn) * (i / (cs.length - 1)), color4(c)));
        if (l.grow != null) {
            for (let i = 0; i <= 8; i++) {
                const k = sampleCurve(l.grow, i / 8);
                ps.addSizeGradient(i / 8, k * l.size[0], k * l.size[1]);
            }
        }
        else {
            ps.minSize = l.size[0];
            ps.maxSize = l.size[1];
        }
        if (l.drag != null && l.drag > 0) {
            ps.addDragGradient(0, l.drag);
            ps.addDragGradient(1, l.drag);
        }
        if (l.stretch)
            ps.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
        const r = l.emitter.radius ?? 0;
        const lean = ((l.emitter.angleDeg ?? 20) * Math.PI) / 180;
        switch (l.emitter.shape) {
            case 'point':
                ps.createPointEmitter(new BABYLON.Vector3(-0.15, 1, -0.15), new BABYLON.Vector3(0.15, 1, 0.15));
                break;
            case 'sphere':
                ps.createSphereEmitter(Math.max(0.001, r), 1);
                break;
            default: {
                /*
                A VENT: every particle starts on the ground at the emitter, on a disc
                (`disc`, `cone`) or its rim (`ring`), and leaves upward within the
                shape's angle: a ring throws outward, a cone spreads to its angle, a
                disc rises with a little spread. (Babylon's cone emitter spawns
                anywhere up the cone's HEIGHT, radius / tan(angle): 68 m for the
                volcano's ash, so smoke popped into being high above the vent.)
                */
                const e = new BABYLON.CustomParticleEmitter();
                const ring = l.emitter.shape === 'ring';
                const cone = l.emitter.shape === 'cone';
                e.particlePositionGenerator = (_i, p, out) => {
                    const a = Math.random() * Math.PI * 2;
                    const d = ring ? r : r * Math.sqrt(Math.random());
                    out.set(Math.cos(a) * d, 0, Math.sin(a) * d);
                    p._a = a;
                };
                e.particleDirectionGenerator = (_i, p, out) => {
                    const a = p?._a ?? Math.random() * Math.PI * 2;
                    const tilt = ring
                        ? lean * (0.6 + 0.4 * Math.random())
                        : cone
                            ? lean * Math.sqrt(Math.random())
                            : lean * 0.25 * Math.random();
                    out.set(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
                };
                ps.particleEmitterType = e;
            }
        }
        ps.emitRate = 0;
        ps.start();
        let picks = 0;
        const ground = (p) => {
            const q = p;
            // A recycled particle starts a new life: forget the old ground.
            if (q._lastAge != null && p.age < q._lastAge)
                q._g = undefined;
            q._lastAge = p.age;
            if (q._g === undefined && picks < 6) {
                picks++;
                const hit = scene.pickWithRay(new BABYLON.Ray(new BABYLON.Vector3(p.position.x, p.position.y + 30, p.position.z), BABYLON.Vector3.Down(), 400), (m) => m.isPickable && m.isEnabled() && m.isVisible);
                q._g = hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : null;
            }
            const g = q._g;
            if (g != null && p.position.y < g) {
                p.position.y = g;
                if (Math.abs(p.direction.y) < 1.5)
                    p.direction.setAll(0);
                else {
                    // One stylized bounce, then it settles.
                    p.direction.y = -p.direction.y * 0.2;
                    p.direction.x *= 0.35;
                    p.direction.z *= 0.35;
                }
            }
        };
        const rt = {
            layer: l,
            throttle: 1,
            linger: l.life[1],
            alive: () => ps.getActiveCount(),
            update: (t, prev, activity, dt) => {
                at.copyFrom(this.node.getAbsolutePosition());
                at.y += l.height ?? 0;
                const s = layerAt(l, this.recipe, t, activity, prev);
                const rate = s.channel.rate ?? 1;
                ps.emitRate = s.on ? l.rate * s.level * rate * rt.throttle : 0;
                if (ps.manualEmitCount === 0)
                    ps.manualEmitCount = -1;
                if (s.started && burst > 0)
                    ps.manualEmitCount = Math.round(burst * s.level * rt.throttle);
                const sp = s.channel.speed ?? 1;
                ps.minEmitPower = l.speed[0] * sp;
                ps.maxEmitPower = l.speed[1] * sp;
                const sz = s.channel.size ?? 1;
                ps.minScaleX = ps.maxScaleX = ps.minScaleY = ps.maxScaleY = sz;
                ps.gravity.set(0, -(l.gravity ?? 0), 0);
                /*
                CARRIED BY THE WIND: each particle's sideways speed relaxes toward
                the wind's (times how much it catches), about two thirds of the way
                in a second. A constant push instead made long-lived steam end up
                faster than the wind that carried it.
                */
                const w = l.wind ? this.options.windAt?.(at.x, at.z) : undefined;
                const catchUp = Math.min(1, dt * (l.wobble ? 4 : 1.1));
                const wx = (w?.x ?? 0) * (l.wind ?? 0);
                const wz = (w?.z ?? 0) * (l.wind ?? 0);
                if (l.land)
                    picks = 0;
                const water = l.surface ? this.options.waterLevel?.() ?? null : null;
                const wob = l.wobble ?? 0;
                if (w != null || l.land || water != null || wob > 0)
                    for (const p of ps.particles) {
                        // The sideways speed it relaxes toward: the wind, plus a bubble's
                        // zigzag (its own phase, from its id, so they do not wobble in step).
                        let tx = wx;
                        let tz = wz;
                        if (wob > 0) {
                            const ph = (p.id * 2.39996) % 6.2832;
                            tx += Math.sin(p.age * 4.1 + ph) * wob;
                            tz += Math.cos(p.age * 3.3 + ph * 1.7) * wob;
                        }
                        if (w != null || wob > 0) {
                            p.direction.x += (tx - p.direction.x) * catchUp;
                            p.direction.z += (tz - p.direction.z) * catchUp;
                        }
                        if (l.land)
                            ground(p);
                        // A bubble ends at the surface.
                        if (water != null && p.position.y >= water)
                            p.age = p.lifeTime;
                    }
            },
            halt: () => {
                ps.emitRate = 0;
                ps.manualEmitCount = -1;
            },
            // Not the texture: the sprites are shared by every effect in the
            // scene, and disposing one with the system (Babylon's default) left
            // every effect built after an edit drawing nothing.
            dispose: () => ps.dispose(false),
        };
        return rt;
    }
    light(l0) {
        const k = this.options.scale ?? 1;
        const l = k === 1 ? l0 : { ...l0, range: l0.range * k, height: (l0.height ?? 0) * k };
        const light = new BABYLON.PointLight(`effect-${l.name ?? 'light'}`, BABYLON.Vector3.Zero(), this.scene);
        light.diffuse = BABYLON.Color3.FromHexString(l.color);
        light.specular = light.diffuse.scale(0.3);
        light.intensity = 0;
        light.setEnabled(false);
        let fade = 0;
        let want = 0;
        let on = false;
        const rt = {
            layer: l,
            linger: 0,
            update: (t, prev, activity) => {
                const s = layerAt(l, this.recipe, t, activity, prev);
                const flicker = l.flicker ? 1 - l.flicker * Math.random() : 1;
                want = s.on ? l.intensity * s.level * (s.channel.intensity ?? 1) * flicker : 0;
                on = want > 0.001;
                light.position.copyFrom(this.node.getAbsolutePosition());
                light.position.y += l.height ?? 0;
                if (on && rt.shared != null) {
                    fade = light._effectFade ?? fade;
                    rt.shared.lights.push({ light, want, range: l.range * (s.channel.range ?? 1), fade });
                }
                else {
                    light.setEnabled(false);
                }
            },
            halt: () => {
                want = 0;
                light.setEnabled(false);
            },
            dispose: () => {
                this.shared.effectLights.delete(light);
                light.dispose();
            },
        };
        this.shared.effectLights.add(light);
        return rt;
    }
    sound(l0) {
        const k = this.options.scale ?? 1;
        const l = k === 1 ? l0 : { ...l0, refDistance: (l0.refDistance ?? 10) * k };
        let voice = null;
        let prevHeard = -Infinity;
        const stopVoice = () => {
            if (voice != null) {
                voice.voice.stop();
                this.shared.voices.delete(voice);
                voice = null;
            }
        };
        return {
            layer: l,
            linger: 0,
            update: (t, _prev, activity) => {
                const cam = this.scene.activeCamera;
                const at = this.node.getAbsolutePosition();
                const dist = cam != null ? BABYLON.Vector3.Distance(cam.globalPosition, at) : 0;
                // Heard late: the whole envelope, not only the onset.
                const heard = t - soundDelay(dist);
                const s = layerAt(l, this.recipe, heard, activity, prevHeard);
                prevHeard = heard;
                const gain = l.gain * s.level * (s.channel.gain ?? 1);
                if (!s.on || this.muted || gain <= 0.001) {
                    stopVoice();
                    return;
                }
                if (voice != null && !this.shared.voices.has(voice))
                    voice = null;
                if (voice == null) {
                    const v = startVoice(l.voice, { refDistance: l.refDistance, url: l.url });
                    if (v == null)
                        return;
                    voice = { voice: v, audible: 0 };
                    this.shared.voices.add(voice);
                }
                voice.voice.place(at);
                voice.voice.set(gain, (l.pitch ?? 1) * (s.channel.pitch ?? 1), s.channel.cutoff ?? 1, distanceCutoff(dist));
                const ref = l.refDistance ?? 10;
                voice.audible = gain * (dist <= ref ? 1 : ref / dist);
            },
            halt: stopVoice,
            dispose: stopVoice,
        };
    }
}
//# sourceMappingURL=effect-player.js.map