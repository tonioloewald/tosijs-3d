/*#
# b3d-clouds

A cloud layer you can **fly into** — and lose the world inside.

Not a skybox texture and not a shader: a few dozen **opaque** blobs at an altitude, plus a
**fog whiteout** that goes total *before* you reach one. Fly into a cloud and the world is
already gone; you're in white until you come out the far side.

## It's a TACTIC, not a texture

`insideCloud` (0…1) is exposed, so a cloud is something the game can *use*: break a radar
lock, shake a pursuer, hide a mothership until you're on top of it. That is the whole point
— **behavioural richness, not photorealism** (see AI-DESIGN.md). A cloud you can hide in is
worth more than a cloud that merely looks convincing.

## Demo

**Climb into the cloud layer** (R to throttle up, W/S pitch). Watch the world white out as
you enter, and the readout climb. Then dive back out.

```js
import { b3d, b3dAircraft, b3dClouds, b3dFog, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 40, vtolSpeed: 6, maxSpeed: 60,
})
const clouds = b3dClouds({ altitude: 140, thickness: 40, count: 40, size: 70, seed: 7 })
const readout = div({ class: 'readout' })

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.6 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dFog({ start: 400, end: 3000, color: '#bfd9f2' }),
  b3dGround({ meshName: 'ground_nocast', width: 4000, height: 4000, color: '#6b7f5e' }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  clouds,
  inputFocus(gameController(), aircraft),
)

setInterval(() => {
  const t = clouds.insideCloud
  readout.textContent = `altitude ${aircraft.altitude.toFixed(0)}   in cloud ${(t * 100).toFixed(0)}%`
  readout.style.color = t > 0.5 ? '#fff' : '#9fb'
}, 100)

preview.append(scene, readout)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.readout {
  position: absolute; bottom: 12px; left: 12px;
  padding: 6px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.55); color: #9fb;
  font: 13px ui-monospace, monospace; z-index: 10;
}
```

## How it works

- **A fixed number of blobs, recycled.** `count` soft spheres are scattered (seeded) in a
  disc around you. Fly far enough and a blob that falls behind **wraps to the far side** —
  so an endless cloudscape costs a fixed, tier-friendly number of meshes and never
  allocates. (Same discipline as the terrain tile pool.)
- **The whiteout is FOG, not a post-process.** Post-processes are expensive in XR and
  awkward in stereo; fog is per-pixel and effectively free. Immersion ramps `fogDensity` up
  and `fogColor` toward the cloud's colour, then **restores whatever `b3d-fog` had set** on
  the way out — so the two compose instead of fighting.
- **Lit, not flat.** The blobs are lit by the scene's sun, so their tops catch light and their
  undersides fall dark — which is most of what reads as *cloud* rather than a decal. `selfIllum`
  keeps a thin cloud glowing a little (the old fully-emissive look is `selfIllum: 1`); a
  thunderhead wants it near 0 so the underbelly goes properly dark.
- **The whiteout darkens as you sink.** Inside a cloud the fog colour isn't a flat white — it's
  white near the top of the layer and murkier the deeper you go, and a thick/heavy (`coverage`)
  cloud goes properly dark while a thin one barely dims. That's the difference between flying
  through a fair-weather puff and the gloom inside a thunderhead.
- **One dial from clear sky to thunderheads.** `coverage` (0…1) is the weather knob — it gates how
  many blobs are in the sky, how opaque and dark they are, and how much they self-illuminate.
  Bind it to a slider and fly from wisps to overcast. (Blob *size* is fixed at build, so that one
  needs a reload; everything else moves live.)
- **Clouds are never pickable; shadows are opt-in.** A cloud between your controller and a panel —
  or between a missile and its target — would silently break picking and swept collision, so
  `isPickable` is always off. Shadow *casting* is `castShadows` (default off): a cloud shadow is a
  big soft silhouette and only wants to exist when the sun has the shadow range to reach cloud
  altitude.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `36` | Blob POOL size (fixed — they recycle, they don't grow). `coverage` decides how many are active |
| `altitude` | `140` | Centre height of the layer |
| `thickness` | `36` | Vertical spread of the layer |
| `spread` | `1200` | Radius of the disc of cloud around you |
| `size` | `70` | Blob radius — also the distance at which whiteout is total. Set at build |
| `color` | `'#ffffff'` | Cloud (and whiteout) colour |
| `opacity` | `1` | Blob alpha. Default OPAQUE — translucent clouds read badly. Set < 1 only for deliberate wisps |
| `fogDensity` | `0.6` | Whiteout density (EXP2, the scene's mode). HIGH on purpose — inside a cloud you should see nothing but white within a few metres |
| `approach` | `0.5` | Where the whiteout BEGINS, × `size` outside the blob. It's TOTAL well before the surface (you never see the geometry edge) and stays total until you leave |
| `selfIllum` | `0.35` | Self-illumination 0…1 — `1` ≈ fully self-lit (old look), `0` = only sun-lit (dark undersides) |
| `coverage` | `0.5` | Weather dial 0…1: wisps → overcast/thunderheads. LIVE. Gates active count + opacity + darkness + self-illum |
| `castShadows` | `false` | Opt-in: register the blobs so they cast ground shadows |
| `seed` | `1` | Deterministic layout — same seed, same sky |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import { MersenneTwister } from './mersenne-twister';
import { band } from './atmosphere';
export class B3dClouds extends B3dChild {
    static initAttributes = {
        count: 36,
        altitude: 140,
        thickness: 36,
        spread: 1200,
        size: 70,
        color: '#ffffff',
        // OPAQUE by default. Translucent blobs read badly — you see through them and overlapping
        // alpha muddies. A cloud is solid; the fog is what softens the approach, not see-through
        // geometry. (You *can* set < 1 for wisps, but the default is a solid cloud.)
        opacity: 1,
        // EXP2 fog (the scene's only mode), so this is the whiteout density and it has to be HIGH
        // to be BLINDING: you shouldn't see your own aircraft from the chase cam inside a cloud.
        // ~1.0 whites out the world within ~2-3 m.
        fogDensity: 1.0,
        // How far OUTSIDE a blob the whiteout BEGINS, as a fraction of `size`. It reaches FULL well
        // before the surface (see _update) so the cloud is completely white BEFORE you'd see the
        // geometry edge — which is the real experience: fluffy from afar, blinding as you reach it.
        approach: 0.8,
        // 0…1 self-illumination. Clouds are LIT now (darker underneath, sun from above), but a thin
        // cloud glows a little on its own — this is that floor. 1 ≈ the old fully-emissive look;
        // a thunderhead wants it near 0 so its underbelly goes properly dark.
        selfIllum: 0.35,
        // 0…1 the master weather dial: virtually-no-cloud → overcast/thunderheads. Drives how many
        // blobs are active, their opacity, and how dark+un-self-lit they get. LIVE (bind it to a
        // slider). Blob SIZE is set at build, so a size change needs a reload; everything else
        // responds immediately.
        coverage: 0.5,
        // Opt-in: cast shadows on the ground. Off by default — a cloud shadow is a big soft
        // silhouette and only wants to exist when the scene is set up for it (a sun with enough
        // shadow range to reach cloud altitude). Registering the blobs is what enlists them.
        castShadows: false,
        seed: 1,
    };
    /**
     * How deep in a cloud you are, 0…1. **Gameplay reads this** — break a lock, hide a ship,
     * make the enemy lose you. It's why the component exists.
     */
    get insideCloud() {
        return this._immersion;
    }
    _blobs = [];
    _immersion = 0;
    _removeFogLayer = null;
    _mat = null;
    _baseColor = new BABYLON.Color3(1, 1, 1);
    /** Whiteout colour, recomputed each frame — white at the cloud top, murk deeper down. */
    _fogColor = new BABYLON.Color3(1, 1, 1);
    _lastCoverage = -1;
    _tick = () => this._update();
    _onShift = (dx, dz) => {
        for (const b of this._blobs) {
            b.position.x += dx;
            b.position.z += dz;
        }
    };
    sceneReady(owner, scene) {
        const rng = new MersenneTwister(this.seed);
        this._baseColor = BABYLON.Color3.FromHexString(this.color);
        const mat = new BABYLON.StandardMaterial('cloud-mat', scene);
        // LIT now — the sun rakes the tops and the undersides fall dark, which is what reads as a
        // cloud rather than a flat decal. `selfIllum` keeps it from going to a grey rock (the old
        // reason for disableLighting); `coverage` modulates all of this live in _update.
        mat.diffuseColor = this._baseColor;
        mat.emissiveColor = this._baseColor.scale(this.selfIllum);
        mat.specularColor = BABYLON.Color3.Black();
        mat.alpha = this.opacity;
        mat.backFaceCulling = false;
        this._mat = mat;
        const sizeMul = 0.7 + this.coverage * 0.6; // denser sky → bigger, more-overlapping blobs
        for (let i = 0; i < this.count; i++) {
            const blob = BABYLON.MeshBuilder.CreateSphere(`cloud-${i}`, { diameter: 2, segments: 6 }, // low-poly: it's a blob behind alpha, nobody counts facets
            scene);
            blob.material = mat;
            // ⚠️ NOT pickable. A cloud between the controller and a panel — or between a missile and
            // its target — silently breaks picking and swept collision. (Shadow CASTING is opt-in
            // below; picking must stay off regardless.)
            blob.isPickable = false;
            blob.receiveShadows = false;
            this._placeRandom(blob, rng, { x: 0, z: 0 }, sizeMul);
            this._blobs.push(blob);
        }
        // Shadow casting is opt-in: registering the blobs is what enlists them as casters (the sun
        // adds every registered mesh). Off by default — see the attribute note.
        if (this.castShadows)
            owner.register({ meshes: this._blobs });
        // Floating origin: blob positions are WORLD coordinates held in JS, so on a terrain rebase
        // they must shift with everything else or the whole sky would jump. (The per-frame recycle
        // would eventually mask it, but not without a visible lurch.)
        owner.onOriginShift(this._onShift);
        scene.onBeforeCameraRenderObservable.add(this._tick);
        // The whiteout is a fog LAYER — the scene composites and smooths it, so it can't fight
        // b3d-fog or the sea, and nothing ever switches fogMode (see atmosphere.ts). The colour is
        // computed each frame (`_fogColor`) — white near the top, darkening as you sink into a
        // thick cloud.
        this._removeFogLayer = owner.addFogLayer(() => this._immersion <= 0
            ? null
            : {
                weight: this._immersion,
                color: {
                    r: this._fogColor.r,
                    g: this._fogColor.g,
                    b: this._fogColor.b,
                },
                density: this.fogDensity,
                // The scene's fog is usually LINEAR (b3d-fog defaults to it), so DENSITY above is
                // ignored and it's `end` that decides opacity — and a big end is never opaque
                // close-up (that was the "fog never reaches full white" bug). Pull `end` right in
                // to a few metres: at full immersion the linear ramp is total within arm's reach,
                // so you cannot see your own aircraft. At partial immersion the composite lerps end
                // back out toward the base fog, which is the approach haze. Density still covers the
                // EXP2 case for scenes with no b3d-fog.
                start: 0,
                end: Math.max(4, this.size * 0.06),
            });
    }
    sceneDispose() {
        this.owner?.scene.onBeforeCameraRenderObservable.removeCallback(this._tick);
        this.owner?.offOriginShift(this._onShift);
        this._removeFogLayer?.();
        this._removeFogLayer = null;
        for (const b of this._blobs)
            b.dispose();
        this._blobs = [];
    }
    _placeRandom(blob, rng, centre, sizeMul = 1) {
        const a = rng.random() * Math.PI * 2;
        const r = Math.sqrt(rng.random()) * this.spread; // sqrt → even area density, not a clump
        const s = this.size * (0.6 + rng.random() * 0.8) * sizeMul;
        blob.position.set(centre.x + Math.cos(a) * r, this.altitude + (rng.random() - 0.5) * this.thickness, centre.z + Math.sin(a) * r);
        // Squash them: clouds are wider than they are tall, and a sphere reads as a balloon.
        blob.scaling.set(s, s * 0.45, s);
    }
    /** Apply the `coverage` weather dial: how many blobs are active, how opaque, how dark, and
     * how much they still self-illuminate. Live — cheap enough to run when coverage moves. */
    _applyCoverage() {
        const cov = Math.min(1, Math.max(0, this.coverage));
        const active = Math.max(1, Math.round(this.count * (0.25 + 0.75 * cov)));
        if (cov !== this._lastCoverage && this._mat != null) {
            this._lastCoverage = cov;
            // Thicker sky ⇒ darker (storm grey) and less self-lit (dark underbellies). Opacity is NOT
            // touched — the blobs are solid; coverage changes how MANY and how DARK, not how see-through.
            const dark = 1 - 0.45 * cov;
            const illum = Math.min(1, Math.max(0, this.selfIllum * (1.4 - cov)));
            this._mat.diffuseColor = this._baseColor.scale(dark);
            this._mat.emissiveColor = this._baseColor.scale(dark * illum);
        }
        return active;
    }
    _update() {
        const scene = this.owner?.scene;
        const cam = scene?.activeCamera;
        if (scene == null || cam == null)
            return;
        const eye = cam.globalPosition;
        const active = this._applyCoverage();
        // Recycle: a blob that falls behind wraps to the far side, so an endless cloudscape
        // costs a FIXED number of meshes. No allocation, no growth.
        let nearest = Infinity;
        for (let i = 0; i < this._blobs.length; i++) {
            const blob = this._blobs[i];
            // `coverage` gates how many of the pool are in the sky — the rest sit disabled (no draw,
            // no whiteout contribution) so "virtually no clouds" really is a near-empty sky.
            const on = i < active;
            if (blob.isEnabled() !== on)
                blob.setEnabled(on);
            if (!on)
                continue;
            const dx = blob.position.x - eye.x;
            const dz = blob.position.z - eye.z;
            const flat = Math.hypot(dx, dz);
            if (flat > this.spread) {
                blob.position.x = eye.x - dx;
                blob.position.z = eye.z - dz;
            }
            const dy = blob.position.y - eye.y;
            // True WORLD distance to the squashed-ellipsoid surface along the view ray — so the whiteout
            // builds over the same real distance from any direction. The old `hypot(dx, dy/0.45, dz) -
            // rx` put the surface in the right place but measured the APPROACH in stretched units
            // vertically, so coming at a flat cloud from above/below the fog only arrived at the last
            // moment. `nd` is the normalized ellipsoid distance (1 at the skin); dc·(nd-1)/nd is how far
            // that skin is in real metres.
            const sx = blob.scaling.x;
            const sy = blob.scaling.y;
            const dc = Math.hypot(dx, dy, dz);
            const nd = Math.hypot(dx / sx, dy / sy, dz / sx);
            const d = nd > 0 ? (dc * (nd - 1)) / nd : -sx;
            if (d < nearest)
                nearest = d;
        }
        // WHITEOUT ON APPROACH — and TOTAL BEFORE ENTRY.
        //
        // `nearest` is the distance to the blob's SURFACE. The fog begins closing in `approach`
        // metres outside the cloud and reaches FULL at `fullDist` — still OUTSIDE the geometry — so
        // you go completely white before you'd ever see the crude blob edge, and (because `band`
        // clamps to 1 for anything nearer, including negative = inside) you STAY white the whole
        // time you're in the cloud, until you come out the far side.
        const startDist = Math.max(1, this.size * this.approach);
        const fullDist = startDist * 0.3; // total whiteout this far out — well before the surface
        this._immersion = band(nearest, startDist, fullDist);
        // Whiteout COLOUR by vertical depth: white near the cloud top, darkening as you sink. The
        // top of the layer is `altitude + thickness/2`; how far below it you sit (0…thickness) sets
        // the murk, and a thick/heavy (high-`coverage`) cloud goes properly dark while a thin one
        // barely dims — the difference between a fair-weather puff and the inside of a thunderhead.
        if (this._immersion > 0) {
            const top = this.altitude + this.thickness / 2;
            const frac = this.thickness > 0
                ? Math.min(1, Math.max(0, (top - eye.y) / this.thickness))
                : 0;
            const cov = Math.min(1, Math.max(0, this.coverage));
            const shade = 1 - 0.8 * frac * (0.35 + 0.65 * cov);
            this._fogColor.copyFrom(this._baseColor).scaleInPlace(shade);
        }
    }
}
export const b3dClouds = B3dClouds.elementCreator({
    tag: 'tosi-b3d-clouds',
});
//# sourceMappingURL=b3d-clouds.js.map