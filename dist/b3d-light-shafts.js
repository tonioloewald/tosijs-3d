/*#
# b3d-light-shafts

**Light you can see**: shafts of sun breaking through a broken sky, and rays
fanning down from the surface when you are under the water. They are what
make a gap in the clouds, or the shallows of a sea, read as a PLACE with a
sun in it rather than a lit backdrop. Drop one into a scene with a
[cloud deck](/b3d-cloud-deck/) or [water](/b3d-water/); it needs no setup.

## Demo

Afternoon under a broken deck, looking toward the sun. Open the ⚙ menu:
`cloud cover` below 0.5 has no shafts, near 1 only slits; `time of day`
moves the sun (and the shafts with it). Drag to look away from the sun and
they fade. The full weather, terrain and all, is in
[Land and Sky](/land-and-sky/): set its cloud cover to about 0.85.

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dCloudDeck, b3dLightShafts, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { shafts } = tosi({
  shafts: { coverage: 0.85, timeOfDay: 15.2, altitude: 450, strength: 0.35, width: 40, count: 14 },
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 60, 0), el.scene)
        cam.maxZ = 20000
        cam.fov = 1.1
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
        // Start looking TOWARD the sun (once), where the shafts show.
        let aimed = false
        el.scene.onBeforeRenderObservable.add(() => {
          const sun = el.scene.lights.find((l) => l.getClassName() === 'DirectionalLight')
          if (aimed || !sun || sun.direction.y > -0.05) return
          aimed = true
          const t = sun.direction.clone().normalize().scale(-1)
          t.y *= 0.8
          cam.setTarget(cam.position.add(t.scale(1000)))
        })
      },
      scenePanel: () => [
        label3d({ text: 'Light shafts' }),
        slider3d({ label: 'cloud cover', value: shafts.coverage, min: 0.5, max: 1.2, step: 0.01 }),
        slider3d({ label: 'time of day', value: shafts.timeOfDay, min: 6, max: 19, step: 0.1 }),
        slider3d({ label: 'cloud base', value: shafts.altitude, min: 150, max: 1200, step: 10 }),
        slider3d({ label: 'strength', value: shafts.strength, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'width', value: shafts.width, min: 5, max: 200, step: 5 }),
        slider3d({ label: 'count', value: shafts.count, min: 0, max: 30, step: 1 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: shafts.timeOfDay, realtimeScale: 0 }),
    // A fill, so the ground under an overcast is not simply black.
    b3dLight({ intensity: 0.6 }),
    b3dGround({ size: 12000, color: '#5d6b4a', texture: 'noise', receiveShadows: true }),
    b3dCloudDeck({ altitude: shafts.altitude, coverage: shafts.coverage }),
    b3dLightShafts({
      strength: shafts.strength,
      width: shafts.width,
      count: shafts.count,
    }),
  )
)
```
```css
.preview { height: 100%; }
tosi-b3d { width: 100%; height: 100%; }
```

## Under the water

The same shafts from the underside of the sea. You are a few metres down,
looking up at the sky and the sun through the surface, bent and rippled by
it (the water's `undersideSky`), with the rays fanning down from the sun. Open the ⚙ menu: raise `wind` or `wave height`
and the rays multiply, narrow and flicker; calm it and a few broad ones
drift slowly. `depth` takes you down into the murk.

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dWater, b3dLightShafts, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { sea } = tosi({
  sea: { depth: 6, wind: 4, waveHeight: 0.1, timeOfDay: 9 },
})

preview.append(
  b3d(
    {
      windSpeed: sea.wind,
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, -6, 0), el.scene)
        cam.minZ = 0.1
        cam.fov = 1.1
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
        let aimed = false
        el.scene.onBeforeRenderObservable.add(() => {
          cam.position.y = -sea.depth.valueOf()
          const sun = el.scene.lights.find((l) => l.getClassName() === 'DirectionalLight')
          if (aimed || !sun || sun.direction.y > -0.05) return
          aimed = true
          // At the sun AS SEEN FROM BELOW: light bends toward vertical
          // entering water, so it sits higher than in the sky (a little
          // below it here, so the rays fan down into view from its glare).
          const t = sun.direction.clone().normalize().scale(-1)
          const h = Math.hypot(t.x, t.z)
          const sw = h / 1.33
          t.x *= sw / h
          t.z *= sw / h
          t.y = Math.sqrt(1 - sw * sw) * 0.75
          cam.setTarget(cam.position.add(t.normalize().scale(10)))
        })
      },
      scenePanel: () => [
        label3d({ text: 'Under the water' }),
        slider3d({ label: 'depth', value: sea.depth, min: 1, max: 30, step: 0.5 }),
        slider3d({ label: 'wind', value: sea.wind, min: 0, max: 25, step: 0.5 }),
        slider3d({ label: 'wave height', value: sea.waveHeight, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'time of day', value: sea.timeOfDay, min: 7, max: 18, step: 0.1 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: sea.timeOfDay, realtimeScale: 0 }),
    b3dLight({ intensity: 0.6 }),
    b3dGround({ size: 400, y: -25, color: '#8a8060', texture: 'noise' }),
    b3dWater({ y: 0, twoSided: true, waterSize: 400, waveHeight: sea.waveHeight }),
    b3dLightShafts({}),
  )
)
```
```css
.preview { height: 100%; }
tosi-b3d { width: 100%; height: 100%; }
```

## How it works

One model for both ([[light-rays]], WEATHER-DESIGN stage 4, board #1084):

- A shaft **starts at the edge the light comes through** — the underside of
  the [`<tosi-b3d-cloud-deck>`](/b3d-cloud-deck/), the underside of the
  [water](/b3d-water/) — and runs away from it along the light. They are
  **rectangular**: parallel to the sun's light, so perspective alone makes
  them radiate from the sun and widen toward you.
- It is an **additive, flat fill of the light's colour**, not a blur:
  `strength` (0.35) at the edge, falling linearly to nothing.
- It is **most prominent looking toward the sun** (light scattered forward),
  and faint looking away.
- Under cloud, only where the sky is **broken but not closed**: local
  coverage 0.5 up to 1. Clear skies and overcast have none. The cover sets
  the **width**: broad from a ragged sky, slits as it closes toward 1.
- Under water, the light is the sun's **tinted by the water's fog**, bent by
  Snell's law so the shafts lean toward vertical, and they shimmer as the
  surface moves. Only when the sun is reaching the water. **Surface
  turbulence** (the wind over the water, its `waveHeight` and `bumpHeight`)
  drives them: calm water focuses a few broad, slow rays; choppy water many
  narrow ones that flicker (`waterRoughness` reads it back).

Rain helps (it scatters the light): the strength rises with the
precipitation where you are.

`count` is the budget; `0` switches the sky shafts off, `underwater="off"`
the water ones.


## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `14` | How many sky shafts at most (the budget). `0` = off |
| `radius` | `3000` | How far from you (m) to look for gaps. Shafts read best from a distance |
| `width` | `40` | The BROADEST sky shaft at the cloud (m), at the coverage threshold (0.5); narrower as the cover closes, down to 10% of this near 1. Kept SMALL on purpose: the wider a shaft, the more obvious any mismatch with the gap it comes from |
| `spread` | `0` | Extra width per metre of length. `0`: RECTANGULAR shafts, so all the apparent widening is perspective, and they radiate from the sun because they are parallel to its light |
| `strength` | `0.35` | Brightness at the edge the light comes through; it falls linearly to 0 |
| `rainBoost` | `0.5` | How much precipitation where you are multiplies the strength |
| `color` | `''` | The light's colour; empty = the sun's (whitish by day) |
| `underwater` | `'on'` | Shafts under the water surface too |
| `underwaterCount` | `12` | Their budget |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, isOff, sceneDelta } from './b3d-utils.js';
import { hash01 } from './lightning.js';
import { fogLayerFor } from './medium.js';
import { refractDown, shaftCoverageGate, shaftWidthForCoverage, waterRayShape, waterRoughness, shaftWidthAt, sunPhase, } from './light-rays.js';
const UP = new BABYLON.Vector3(0, 1, 0);
const SHADER = 'tosiLightShaft';
/** The phase term's shape; mirrors `sunPhase` in light-rays.ts. */
const PHASE_SHARP = 6;
const PHASE_FLOOR = 0.08;
function ensureShader() {
    if (BABYLON.Effect.ShadersStore[`${SHADER}VertexShader`])
        return;
    BABYLON.Effect.ShadersStore[`${SHADER}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec4 color;
uniform mat4 world;
uniform mat4 viewProjection;
varying float vAlong;
varying vec4 vColor;
varying vec3 vWorld;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vWorld = w.xyz;
  vAlong = uv.y;
  vColor = color;
  gl_Position = viewProjection * w;
}`;
    // FLAT across, linear along, forward-scattered toward the sun: the whole
    // look is these three lines (light-rays.ts holds the same math, tested).
    BABYLON.Effect.ShadersStore[`${SHADER}FragmentShader`] = `
precision highp float;
varying float vAlong;
varying vec4 vColor;
varying vec3 vWorld;
uniform vec3 eye;
uniform vec3 toSun;
uniform float edge;
void main() {
  vec3 v = normalize(vWorld - eye);
  float c = max(dot(v, toSun), 0.0);
  float phase = ${PHASE_FLOOR.toFixed(3)} + ${(1 - PHASE_FLOOR).toFixed(3)} * pow(c, ${PHASE_SHARP.toFixed(1)});
  float along = edge * clamp(1.0 - vAlong, 0.0, 1.0);
  gl_FragColor = vec4(vColor.rgb * vColor.a * along * phase, 1.0);
}`;
}
export class B3dLightShafts extends B3dChild {
    static preferredTagName = 'tosi-b3d-light-shafts';
    static initAttributes = {
        count: 14,
        radius: 3000,
        width: 40,
        spread: 0,
        strength: 0.35,
        rainBoost: 0.5,
        color: '',
        underwater: 'on',
        underwaterCount: 12,
    };
    /** Read-only: how rough the water above you is (0–1), last time rays were
     * placed. Drives their number, width and flicker. */
    waterRoughness = 0;
    _shafts = [];
    _mats = {};
    _obs = null;
    _since = 1e9;
    _seq = 0;
    _pool = { sky: [], water: [] };
    _time = 0;
    sceneReady(owner, scene) {
        ensureShader();
        this._obs = scene.onBeforeRenderObservable.add(() => {
            try {
                this._tick(owner, scene);
            }
            catch (e) {
                // Garnish must never break the frame, but must not fail SILENTLY
                // either (an unbound method once hid every shaft this way).
                owner.logDebug?.('light-shafts', { error: String(e) });
            }
        });
    }
    _material(kind, scene) {
        const have = this._mats[kind];
        if (have != null)
            return have;
        const m = new BABYLON.ShaderMaterial(`shaft-${kind}`, scene, SHADER, {
            attributes: ['position', 'uv', 'color'],
            uniforms: ['world', 'viewProjection', 'eye', 'toSun', 'edge'],
            needAlphaBlending: true,
        });
        m.alphaMode = BABYLON.Constants.ALPHA_ONEONE;
        m.disableDepthWrite = true;
        m.backFaceCulling = false;
        this._mats[kind] = m;
        return m;
    }
    /** The light's colour, normalised so its brightest channel is 1. */
    _lightColor(sun) {
        if (this.color) {
            try {
                return BABYLON.Color3.FromHexString(this.color);
            }
            catch {
                /* fall through to the sun */
            }
        }
        const d = sun.diffuse;
        const m = Math.max(d.r, d.g, d.b, 1e-3);
        return new BABYLON.Color3(d.r / m, d.g / m, d.b / m);
    }
    _tick(owner, scene) {
        const dt = sceneDelta(scene);
        this._time += dt;
        const cam = scene.activeCamera;
        const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
        // The light's TRAVEL direction; shafts need it pointing down.
        const dir = sun?.direction.clone().normalize();
        const sunUp = sun != null && dir != null && dir.y < -0.03 && sun.intensity > 0.05;
        const deck = owner.querySelector('tosi-b3d-cloud-deck');
        const eye = cam?.globalPosition;
        const water = eye == null ? null : this._waterAbove(owner, eye);
        // Which set is live: under water, the water's; under the deck, the sky's.
        const base = deck?.altitude ?? 0;
        const skyLive = sunUp &&
            eye != null &&
            water == null &&
            deck?.opacityAbove != null &&
            eye.y < base &&
            this.count > 0;
        const waterLive = sunUp && eye != null && water != null && !isOff(this.underwater);
        this._since += dt;
        if (this._since > 0.4) {
            this._since = 0;
            const want = new Map();
            if (skyLive)
                this._placeSky(deck, eye, base, water0(owner), dir, want);
            if (waterLive)
                this._placeWater(deck, eye, dir, water, want);
            for (const s of this._shafts) {
                const w = want.get(s.key);
                s.target = w != null ? 1 : 0;
                if (w != null) {
                    s.gate = w.gate;
                    s.width = w.width;
                }
                want.delete(s.key);
            }
            for (const [key, w] of want) {
                const mesh = this._makeMesh(scene, w.kind);
                this._shafts.push({ key, mesh, level: 0, target: 1, ...w });
            }
        }
        if (!skyLive)
            for (const s of this._shafts)
                if (s.kind === 'sky')
                    s.target = 0;
        if (!waterLive)
            for (const s of this._shafts)
                if (s.kind === 'water')
                    s.target = 0;
        if (sun == null || dir == null || eye == null) {
            for (const s of this._shafts)
                s.mesh.isVisible = false;
            this._sweep();
            return;
        }
        /*
        AS BRIGHT AS THE LIGHT IS. The colour is normalised (a hue), so without
        this the MOON, which the skybox puts in the same light at night, made
        shafts as bright as noon's (Tonio: "huge and very prominent light shafts
        from the MOON"). Moonlight shafts are real, and faint.
        */
        const light = this._lightColor(sun).scale(Math.min(1, sun.intensity));
        const rain = owner.weatherHere?.().precipitation ?? 0;
        const boost = 1 + Math.max(0, this.rainBoost) * rain;
        const waterDir = water != null ? refractDown({ x: dir.x, y: dir.y, z: dir.z }) : null;
        const wDir = waterDir != null
            ? new BABYLON.Vector3(waterDir.x, waterDir.y, waterDir.z)
            : dir;
        const waterTint = water != null ? this._waterTint(light, water) : light;
        for (const kind of ['sky', 'water']) {
            const m = this._mats[kind];
            if (m == null)
                continue;
            const d = kind === 'water' ? wDir : dir;
            m.setVector3('eye', eye);
            m.setVector3('toSun', d.scale(-1));
            m.setFloat('edge', Math.max(0, this.strength) * (kind === 'sky' ? boost : 1));
        }
        for (const s of this._shafts) {
            // Water rays live for about a flicker period, so they must fade on
            // that scale too, or fast flicker piles up half-faded rays.
            const rate = s.kind === 'water' ? 4 : 1.2;
            s.level += Math.max(-1, Math.min(1, (s.target - s.level) * dt * rate));
            s.level = Math.max(0, Math.min(1, s.level));
            const d = s.kind === 'water' ? wDir : dir;
            const len = s.kind === 'water'
                ? water.reach
                : Math.max(50, s.y - water0(owner)) / Math.max(0.1, -d.y);
            const mid = new BABYLON.Vector3(s.x, s.y, s.z).add(d.scale(len / 2));
            const fog = s.kind === 'sky' ? fogFactor(scene, mid.subtract(eye).length()) : 1;
            const a = s.level * s.gate * fog;
            s.mesh.isVisible = a > 0.003;
            if (!s.mesh.isVisible)
                continue;
            const tint = s.kind === 'water' ? waterTint : light;
            this._shape(s, d, len, eye);
            const c = [tint.r, tint.g, tint.b, a];
            s.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, [
                ...c,
                ...c,
                ...c,
                ...c,
            ]);
        }
        this._sweep();
    }
    /** Drop shafts that have faded out and are no longer wanted. */
    _sweep() {
        this._shafts = this._shafts.filter((s) => {
            if (s.target === 0 && s.level <= 0.001) {
                // POOLED, not disposed: choppy water re-rolls its rays every second
                // or so, and a mesh per ray per roll is dozens of allocations a
                // second for a quad.
                s.mesh.isVisible = false;
                this._pool[s.kind].push(s.mesh);
                return false;
            }
            return true;
        });
    }
    /**
     * Under the deck: score a world-anchored grid around you. A GAP (low
     * opacity) beside CLOUD is where the sun breaks through, and only where the
     * local cover is broken (0.5 up to 1). Keep the best `count`.
     */
    _placeSky(deck, eye, base, groundY, sunDir, want) {
        // BOUND: detached, `this` is undefined inside it and it throws.
        const op = deck.opacityAbove.bind(deck);
        const cov = deck.coverageAt?.bind(deck);
        const midLen = (base - groundY) / 2 / Math.max(0.1, -sunDir.y);
        const r = Math.max(100, this.radius);
        const scored = [];
        const seen = new Set();
        /*
        TWO PASSES: a fine grid near you and a coarse one far out. With a deck
        only a little above your eye (Land and Sky: 75 m) and a high sun, the
        shafts you see TOWARD the sun hang close by; a single coarse grid that
        also skipped everything within 360 m found them nowhere (Tonio: "I'm not
        seeing any shafts in the land and sky demo").
        */
        const pass = (radius, N) => {
            const step = (2 * radius) / N;
            const gx0 = Math.floor((eye.x - radius) / step);
            const gz0 = Math.floor((eye.z - radius) / step);
            for (let i = 0; i <= N; i++) {
                for (let j = 0; j <= N; j++) {
                    const x = (gx0 + i) * step;
                    const z = (gz0 + j) * step;
                    const key = `${Math.round(x)},${Math.round(z)}`;
                    if (seen.has(key))
                        continue;
                    seen.add(key);
                    if (Math.hypot(x - eye.x, z - eye.z) > radius)
                        continue;
                    /*
                    Not THROUGH you: where the shaft crosses your eye height, it must
                    clear you by its own width. A shaft you stand in is a wash, not a
                    ray. (This replaces a flat 360 m exclusion that emptied the near
                    sky.)
                    */
                    const down = (base - eye.y) / Math.max(0.05, -sunDir.y);
                    if (down > 0 &&
                        Math.hypot(x + sunDir.x * down - eye.x, z + sunDir.z * down - eye.z) <
                            this.width * 0.6)
                        continue;
                    const c = cov == null ? 0.85 : cov(x, z);
                    const gate = shaftCoverageGate(c);
                    if (gate <= 0)
                        continue;
                    const here = op(x, z);
                    if (here > 0.4)
                        continue; // not a gap
                    const d = step * 0.5;
                    const around = Math.max(op(x + d, z), op(x - d, z), op(x, z + d), op(x, z - d));
                    // Prefer shafts you would see toward the sun: they are the ones
                    // that show (forward scatter), radiating from where it is.
                    // Weighted hard: most of the budget goes near the sun in view.
                    const mx = x + sunDir.x * midLen - eye.x;
                    const my = base + sunDir.y * midLen - eye.y;
                    const mz = z + sunDir.z * midLen - eye.z;
                    const cosSun = -(mx * sunDir.x + my * sunDir.y + mz * sunDir.z) /
                        Math.max(1e-6, Math.hypot(mx, my, mz));
                    const score = (1 - here) * around * gate * (0.05 + 2 * sunPhase(cosSun, 8, 0));
                    if (score > 0.1)
                        scored.push({ x, z, score, gate, c });
                }
            }
        };
        pass(Math.min(800, r), 20);
        pass(r, 16);
        scored.sort((a, b) => b.score - a.score);
        /*
        ONE SHAFT PER GAP. Neighbouring grid cells find the same gap, and taking
        each of them stacked overlapping shafts into tents; keep the best and
        skip anything within about a shaft width of one already chosen.
        */
        const chosen = [];
        for (const c of scored) {
            if (chosen.length >= Math.floor(this.count))
                break;
            const w = shaftWidthForCoverage(c.c, this.width);
            if (chosen.some((k) => Math.hypot(k.x - c.x, k.z - c.z) < w * 1.4))
                continue;
            chosen.push(c);
        }
        for (const c of chosen) {
            want.set(`s:${Math.round(c.x)},${Math.round(c.z)}`, {
                kind: 'sky',
                x: c.x,
                y: base,
                z: c.z,
                gate: c.gate,
                width: Math.max(1, shaftWidthForCoverage(c.c, this.width)),
            });
        }
    }
    /**
     * Under the water: shafts come down from the surface where the waves focus
     * the light. A world-anchored grid on the SURFACE, around the point your
     * view reaches it along the light; each cell lit or not by a hash that
     * changes every few seconds, so the shafts shimmer in and out.
     */
    _placeWater(deck, eye, sunDir, water, want) {
        const d = refractDown({ x: sunDir.x, y: sunDir.y, z: sunDir.z });
        // The surface point the light reaching you came through.
        const up = (water.y - eye.y) / Math.max(0.1, -d.y);
        const cx = eye.x - d.x * up;
        const cz = eye.z - d.z * up;
        // Surface turbulence drives the rays: rough water, many narrow ones that
        // flicker; calm water, a few broad slow ones.
        const shape = waterRayShape(water.roughness);
        this.waterRoughness = water.roughness;
        const cell = Math.max(1.2, shape.width * 1.6);
        const R = Math.min(30, water.reach);
        const n = Math.ceil(R / cell);
        const ix0 = Math.floor(cx / cell);
        const iz0 = Math.floor(cz / cell);
        const cands = [];
        for (let i = -n; i <= n; i++) {
            for (let j = -n; j <= n; j++) {
                const ix = ix0 + i;
                const iz = iz0 + j;
                // Each cell has its own slow clock, so they don't all change at once.
                const epoch = Math.floor(this._time / shape.period + hash01(ix, iz, 5));
                const x = (ix + hash01(ix, iz, epoch, 1)) * cell;
                const z = (iz + hash01(ix, iz, epoch, 2)) * cell;
                const dist = Math.hypot(x - cx, z - cz);
                if (dist > R)
                    continue;
                /*
                BIASED TOWARD YOU (Tonio: "very few rays in the center of the view").
                The rays in the middle of the view looking at the sun are the ones
                whose light comes down NEAR you, so cells close to the line from you
                to the sun are likelier to carry one.
                */
                const near = 1 + 1.2 * Math.exp(-((dist / 7) ** 2));
                if (hash01(ix, iz, epoch, 9) > Math.min(0.9, shape.presence * near))
                    continue;
                // Not THROUGH your face (a ray you are inside is a flat wash):
                // measured where the slanted ray passes at your depth, kept small so
                // the centre of the view is not emptied.
                if (Math.hypot(x + d.x * up - eye.x, z + d.z * up - eye.z) <
                    0.3 + shape.width * 0.6)
                    continue;
                cands.push({ x, z, key: `w:${ix},${iz},${epoch}`, dist });
            }
        }
        cands.sort((a, b) => a.dist - b.dist);
        const op = deck?.opacityAbove?.bind(deck);
        // The sun has to REACH the water: cloud overhead dims it.
        const sky = op == null ? 1 : 1 - op(cx, cz);
        if (sky <= 0.02)
            return;
        for (const c of cands.slice(0, Math.floor(this.underwaterCount))) {
            want.set(c.key, {
                kind: 'water',
                x: c.x,
                y: water.y,
                z: c.z,
                gate: sky,
                width: shape.width *
                    (0.6 + 0.8 * hash01(Math.round(c.x), Math.round(c.z), 3)),
            });
        }
    }
    /** How rough the water is here: the wind over it plus the water element's
     * own wave settings. */
    _roughness(owner) {
        const el = owner.querySelector('tosi-b3d-water');
        const w = owner.weatherHere?.().wind;
        const speed = w == null ? 0 : Math.hypot(w.x, w.z);
        return waterRoughness(speed, el?.waveHeight ?? 0, el?.bumpHeight ?? 0.1);
    }
    /** The water medium you are under, if any, with how far light carries. */
    _waterAbove(owner, eye) {
        const media = owner.media ?? [];
        for (const m of media) {
            if (m.kind !== 'plane' || m.optics == null)
                continue;
            if (eye.y >= m.y)
                continue;
            const fog = fogLayerFor({ x: eye.x, y: eye.y, z: eye.z }, m);
            return {
                y: m.y,
                color: m.optics.color ?? { r: 0, g: 0.15, b: 0.3 },
                reach: Math.max(8, Math.min(60, fog?.end ?? 25)),
                roughness: this._roughness(owner),
            };
        }
        return null;
    }
    /** Sunlight tinted by the water's fog: the fog's HUE (its brightest
     * channel at 1), leaning the white light most of the way toward it. */
    _waterTint(light, water) {
        const c = water.color;
        const m = Math.max(c.r, c.g, c.b, 1e-3);
        const hue = new BABYLON.Color3(c.r / m, c.g / m, c.b / m);
        return light.multiply(BABYLON.Color3.Lerp(BABYLON.Color3.White(), hue, 0.6));
    }
    _makeMesh(scene, kind) {
        const pooled = this._pool[kind].pop();
        if (pooled != null)
            return pooled;
        const mesh = new BABYLON.Mesh(`shaft-${kind}-${this._seq++}`, scene);
        const vd = new BABYLON.VertexData();
        vd.positions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        // v: 0 at the edge the light comes through, 1 at the far end.
        vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
        vd.colors = new Array(16).fill(0);
        vd.indices = [0, 1, 2, 0, 2, 3];
        vd.applyToMesh(mesh, true);
        mesh.material = this._material(kind, scene);
        mesh.isPickable = false;
        /*
        Drawn AFTER the deck and the water: from beneath, the shaft is between
        you and them. Babylon's default alphaIndex is Number.MAX_VALUE, so any
        finite "big" number sorts FIRST and the deck painted over every shaft
        ("behind (above) the clouds", Tonio). Infinity sorts after it; depth
        still hides a shaft behind terrain or real cloud (the deck discards its
        gaps, so it only writes depth where there is cloud).
        */
        mesh.alphaIndex = Infinity;
        mesh.alwaysSelectAsActiveMesh = true;
        return mesh;
    }
    /**
     * The shaft's shape this frame: a trapezoid hanging from its source along
     * the light (widening only if `spread` asks), turned about its own axis to
     * face you.
     */
    _shape(s, dir, len, eye) {
        const top = new BABYLON.Vector3(s.x, s.y, s.z);
        const centre = top.add(dir.scale(len / 2));
        const axis = dir.scale(-1); // local +Y points back UP toward the source
        let right = BABYLON.Vector3.Cross(axis, eye.subtract(centre));
        if (right.lengthSquared() < 1e-6)
            right = BABYLON.Vector3.Cross(axis, UP);
        right.normalize();
        const normal = BABYLON.Vector3.Cross(right, axis).normalize();
        s.mesh.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(right, axis, normal);
        s.mesh.position.copyFrom(top);
        const w0 = s.width / 2;
        const w1 = shaftWidthAt(len, s.width, s.kind === 'water' ? 0 : this.spread) / 2;
        s.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, [
            -w0,
            0,
            0,
            w0,
            0,
            0,
            w1,
            -len,
            0,
            -w1,
            -len,
            0,
        ]);
        // The bounds were computed for the empty mesh at creation.
        s.mesh.refreshBoundingInfo();
    }
    sceneDispose() {
        if (this._obs)
            this.owner?.scene.onBeforeRenderObservable.remove(this._obs);
        this._obs = null;
        for (const s of this._shafts)
            s.mesh.dispose();
        for (const k of ['sky', 'water']) {
            for (const m of this._pool[k])
                m.dispose();
            this._pool[k] = [];
        }
        this._shafts = [];
        for (const m of Object.values(this._mats))
            m?.dispose();
        this._mats = {};
    }
}
/** Where a sky shaft ends: the sea surface if there is one, else 0. */
function water0(owner) {
    const media = owner.media ?? [];
    for (const m of media)
        if (m.kind === 'plane')
            return m.y;
    return 0;
}
/** How much of an additive shaft survives the scene's fog at distance `d`.
 * Additive geometry can't be fogged by the material (fog would ADD the fog
 * colour), so it is attenuated here instead. */
function fogFactor(scene, d) {
    switch (scene.fogMode) {
        case BABYLON.Scene.FOGMODE_EXP:
            return Math.exp(-d * scene.fogDensity);
        case BABYLON.Scene.FOGMODE_EXP2:
            return Math.exp(-((d * scene.fogDensity) ** 2));
        case BABYLON.Scene.FOGMODE_LINEAR: {
            const span = scene.fogEnd - scene.fogStart;
            return span > 0 ? Math.min(1, Math.max(0, (scene.fogEnd - d) / span)) : 1;
        }
        default:
            return 1;
    }
}
export const b3dLightShafts = B3dLightShafts.elementCreator();
//# sourceMappingURL=b3d-light-shafts.js.map