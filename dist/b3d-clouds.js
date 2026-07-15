/*#
# b3d-clouds

A cloud layer you can **fly into** — and lose the world inside.

Not a skybox texture and not a shader: a few dozen soft blobs at an altitude, plus a **fog
whiteout** that ramps up as you penetrate one. Fly into a cloud and the world dissolves;
come out the other side and it snaps back.

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
| `opacity` | `0.5` | Base blob alpha (`coverage` scales it) |
| `fogDensity` | `0.05` | Fog density at full immersion (the whiteout) |
| `approach` | `0.8` | How far OUTSIDE a blob the whiteout starts (× `size`). You go white BEFORE you touch the geometry — which is what stops a crude blob from looking like a crude blob |
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
        opacity: 0.5,
        fogDensity: 0.05,
        // How far OUTSIDE a blob the whiteout begins, as a fraction of `size`. The point is to be
        // fully white before you'd ever touch the geometry — see _update().
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
    _lastCoverage = -1;
    _tick = () => this._update();
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
        scene.onBeforeCameraRenderObservable.add(this._tick);
        // The whiteout is a fog LAYER — the scene composites and smooths it, so it can't fight
        // b3d-fog or the sea, and nothing ever switches fogMode (see atmosphere.ts).
        const cloudColor = BABYLON.Color3.FromHexString(this.color);
        this._removeFogLayer = owner.addFogLayer(() => this._immersion <= 0
            ? null
            : {
                weight: this._immersion,
                color: { r: cloudColor.r, g: cloudColor.g, b: cloudColor.b },
                density: this.fogDensity,
                // Pull the linear-fog distances in too, so the whiteout works whichever mode the
                // scene's b3d-fog chose.
                start: 0,
                end: this.size * 0.6,
            });
    }
    sceneDispose() {
        this.owner?.scene.onBeforeCameraRenderObservable.removeCallback(this._tick);
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
            // Thicker sky ⇒ more opaque, darker (storm grey), and less self-lit (dark underbellies).
            const alpha = Math.min(1, this.opacity * (0.55 + 0.9 * cov));
            const dark = 1 - 0.45 * cov;
            const illum = Math.min(1, Math.max(0, this.selfIllum * (1.4 - cov)));
            this._mat.alpha = alpha;
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
            // Distance to the blob's SURFACE, roughly — its x/z radius is scaling.x.
            const d = Math.hypot(dx, dy / 0.45, dz) - blob.scaling.x;
            if (d < nearest)
                nearest = d;
        }
        // WHITEOUT ON APPROACH — not on entry.
        //
        // `nearest` is the distance to the blob's SURFACE. If the whiteout only began once you
        // were inside (nearest < 0), you'd watch yourself fly THROUGH a polygon — and these blobs
        // are crude on purpose. Instead the fog closes in over `approach` metres *outside* the
        // cloud and is total by the time you reach the skin, so you never see the geometry you're
        // entering. That's what makes cheap clouds look like weather.
        const approach = Math.max(1, this.size * this.approach);
        this._immersion = band(nearest, approach, 0);
    }
}
export const b3dClouds = B3dClouds.elementCreator({
    tag: 'tosi-b3d-clouds',
});
//# sourceMappingURL=b3d-clouds.js.map