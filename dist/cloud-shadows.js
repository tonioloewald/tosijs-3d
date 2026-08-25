/*#
# cloud-shadows

**Projected cloud shadows** — the classic technique, and the only one that works over real
terrain. A flat decal can't conform to hills; the shadow map can't reach a cloud at 300 m
(and would render every cloud into four cascades every frame if it could). So instead the
whole cloud field is painted **top-down into one small texture**, and any material that
receives shadows samples it **by world position** in the fragment shader. Because the
darkening happens per-pixel, it drapes over any topology — hills, valleys, a rolling sea —
for the cost of one texture sample and **zero raycasts**.

The texture is repainted only when something changes (a cloud recycles, coverage moves, the
window recentres on the camera, the sun swings) — the steady state is just the sample.

## Demo

[b3d-clouds](?b3d-clouds.ts) drives this under the hood: set `castShadows` and soft cloud shadows
drift across the ground and the crates below. Drag to orbit; watch the dark patches slide.

```js
import { b3d, b3dClouds, b3dBox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      // Altitude 115 and a bounded orbit, deliberately: the layer used to sit at 55
      // with the camera orbiting at the same radius, so tilting up put you INSIDE
      // the clouds and the whiteout fog ate the demo — "most of the time I'm not
      // seeing the objects at all, I'm just seeing the fog." Cloud SHADOWS are
      // projected, not raymarched, so lifting the deck costs the demo nothing.
      const cam = orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 55, target: [0, 0, 0] })
      cam.upperRadiusLimit = 90
    },
  },
  // On the stage — cloud shadows are DARKENING, so the scene needs a fill light
  // to darken FROM. Sun alone put every unlit face at zero and the demo read as
  // black boxes on a black floor.
  ...demoStage({ size: 160, tiles: 26, pattern: true, timeOfDay: 11, sun: { x: -0.5, y: -1, z: -0.35 } }),
  b3dClouds({ model: '/cloud.glb', altitude: 115, thickness: 18, spread: 200, size: 38, coverage: 0.5, castShadows: true, shadowStrength: 0.7, seed: 3 }),
  ...Array.from({ length: 9 }, (_, i) =>
    b3dBox({ meshName: `crate-${i}`, size: 3, x: (i % 3) * 10 - 10, y: 1.5, z: Math.floor(i / 3) * 10 - 10, color: '#7a9b6e' })
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Geometry-independent

The painter takes abstract **blobs** (`x, z, rx, rz, strength`), not meshes — so the cost is
the same whether a cloud is a squashed sphere or a 5,000-triangle sculpt. When modeled clouds
land, a per-model top-down **silhouette sprite** can be stamped instead of the soft ellipse
(`CloudShadowBlob.sprite`) for shadows that read the actual shape — still one-time per model,
still zero per-frame geometry cost.

## Who receives

`attachTo(material)` injects a tiny fragment hook (a Babylon **material plugin**) into a
`StandardMaterial` or `PBRMaterial`. [b3d-clouds](?b3d-clouds.ts) attaches it automatically to
every mesh with `receiveShadows` — the scene's existing "I receive shadows" declaration is
exactly the right opt-in. Sun-direction offset is applied at *paint* time (blob positions are
projected along the light before stamping), so the shader stays a plain straight-down lookup.
*/
/*{ "parent": "Effects" }*/
import * as BABYLON from '@babylonjs/core';
/** Where a blob's shadow lands: slide from its altitude down the sun direction to the ground
 * plane. `sunDir` is the light's TRAVEL direction (y < 0 when shining down); a sun at/below
 * the horizon throws no useful shadow, so the blob's own footprint is returned unmoved. */
export function projectShadowXZ(x, y, z, sunDir, groundY = 0) {
    if (sunDir.y >= -1e-3)
        return { x, z };
    const t = (groundY - y) / sunDir.y;
    return { x: x + sunDir.x * t, z: z + sunDir.z * t };
}
/** World XZ → texture UV inside a square window centred on (cx, cz). Matches the shader's
 * mapping (`(pos - centre) / size + 0.5`); outside 0…1 the shader skips the lookup. */
export function shadowWindowUv(px, pz, cx, cz, worldSize) {
    return {
        u: (px - cx) / worldSize + 0.5,
        v: (pz - cz) / worldSize + 0.5,
    };
}
/** The fragment hook: sample the shadow texture by world XZ and darken. One instance per
 * material; all instances read the same {@link CloudShadowMap}. Injected at MAIN_END with
 * `gl_FragColor` so the identical code serves Standard AND PBR materials. */
class CloudShadowPlugin extends BABYLON.MaterialPluginBase {
    map = null;
    _isEnabled = false;
    constructor(material) {
        super(material, 'CloudShadow', 200, { CLOUDSHADOW: false });
    }
    get isEnabled() {
        return this._isEnabled;
    }
    set isEnabled(enabled) {
        if (this._isEnabled === enabled)
            return;
        this._isEnabled = enabled;
        this.markAllDefinesAsDirty();
        this._enable(enabled);
    }
    prepareDefines(defines) {
        defines.CLOUDSHADOW = this._isEnabled && this.map != null;
    }
    getClassName() {
        return 'CloudShadowPlugin';
    }
    getSamplers(samplers) {
        samplers.push('cloudShadowSampler');
    }
    getUniforms() {
        return {
            ubo: [
                { name: 'cloudShadowWindow', size: 4, type: 'vec4' },
                { name: 'cloudShadowSun', size: 4, type: 'vec4' },
            ],
            fragment: `#ifdef CLOUDSHADOW
        uniform vec4 cloudShadowWindow;
        uniform vec4 cloudShadowSun;
      #endif`,
        };
    }
    bindForSubMesh(uniformBuffer, _scene, _engine, _subMesh) {
        const map = this.map;
        if (!this._isEnabled || map == null)
            return;
        map.bindCount++;
        uniformBuffer.updateFloat4('cloudShadowWindow', map.centerX, map.centerZ, 1 / map.worldSize, 
        // .w = cloud-layer TOP. A flat projected shadow has no occluder height, so a receiver
        // ABOVE the clouds must not be shaded (it's above everything that could cast). Ground and
        // anything flying below the layer are fine.
        map.layerTop);
        // xyz = sun travel direction, w = the shadow ground-plane Y. Lets the shader project a
        // receiver at ANY height down the sun to the same plane the blobs were projected onto —
        // so a cloud shades the aircraft flying under it, not just the ground below the aircraft.
        uniformBuffer.updateFloat4('cloudShadowSun', map.sunX, map.sunY, map.sunZ, map.groundY);
        uniformBuffer.setTexture('cloudShadowSampler', map.texture);
    }
    getCustomCode(shaderType) {
        if (shaderType !== 'fragment')
            return null;
        return {
            CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef CLOUDSHADOW
        uniform sampler2D cloudShadowSampler;
      #endif`,
            CUSTOM_FRAGMENT_MAIN_END: `#ifdef CLOUDSHADOW
      if (vPositionW.y <= cloudShadowWindow.w) {
        // Project THIS fragment down the sun to the shadow ground plane, then look it up. For the
        // ground (y≈groundY) the offset is ~0; for a mesh at altitude it finds the cloud overhead.
        float csT = (cloudShadowSun.y < -0.001)
          ? (cloudShadowSun.w - vPositionW.y) / cloudShadowSun.y
          : 0.0;
        vec2 csGround = vPositionW.xz + cloudShadowSun.xz * csT;
        vec2 csUv = (csGround - cloudShadowWindow.xy) * cloudShadowWindow.z + 0.5;
        if (csUv.x > 0.0 && csUv.x < 1.0 && csUv.y > 0.0 && csUv.y < 1.0) {
          float csShadow = texture2D(cloudShadowSampler, csUv).r;
          #ifdef FOG
            // We inject at MAIN_END, AFTER fog — so a naive multiply darkens the already-fogged
            // colour, and a projected cloud shadow shows straight THROUGH the cloud's own whiteout.
            // Fade the shadow out with the fog: a fully-fogged fragment must stay fog-coloured.
            csShadow = mix(csShadow, 1.0, clamp(1.0 - CalcFogFactor(), 0.0, 1.0));
          #endif
          gl_FragColor.rgb *= csShadow;
        }
      }
      #endif`,
        };
    }
}
/** One top-down shadow texture for a whole cloud field, shared by every receiving material. */
// Babylon can only re-instantiate a material plugin during `Material.clone()`
// if it's in the plugin registry — otherwise the clone path dereferences an
// UNDEFINED registry and throws (`Cannot read properties of undefined
// (reading 'CloudShadowPlugin')`). That aborted b3d-death's wreck-charring
// mid-sequence, so the player kept input focus and never got a respawn panel:
// a cosmetic clone took the whole death exit down with it (2026-08-11).
BABYLON.RegisterMaterialPlugin('CloudShadowPlugin', (material) => new CloudShadowPlugin(material));
export class CloudShadowMap {
    texture;
    resolution;
    /** World size (metres) of the square window the texture covers. */
    worldSize;
    centerX = 0;
    centerZ = 0;
    /** Sun TRAVEL direction (normalised, y<0 shining down) + the shadow ground-plane Y. The
     * shader projects each receiver fragment down this to sample the right cloud — see the plugin. */
    sunX = 0;
    sunY = -1;
    sunZ = 0;
    groundY = 0;
    /** Top of the cloud layer (world Y). Receivers above this get no shadow (nothing casts from
     * higher). Defaults huge so an unset map shadows everything; clouds set it to the real top. */
    layerTop = 1e9;
    _plugins = [];
    /** How many blobs the last {@link paint} stamped — a debug readout. */
    lastPaintCount = 0;
    /** Debug: how many times the shader hook has bound (0 ⇒ bindForSubMesh never runs). */
    bindCount = 0;
    /** How many materials carry the (enabled) hook — a debug readout. */
    get attachedCount() {
        return this._plugins.length;
    }
    constructor(scene, worldSize, resolution = 256) {
        this.worldSize = worldSize;
        this.resolution = resolution;
        this.texture = new BABYLON.DynamicTexture('cloud-shadow-map', { width: resolution, height: resolution }, scene, false);
        this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this.paint([]); // start fully lit
    }
    /** Inject (or re-enable) the shadow hook on a material. Idempotent. */
    attachTo(material) {
        let plugin = material.pluginManager?.getPlugin('CloudShadow');
        if (plugin == null) {
            plugin = new CloudShadowPlugin(material);
            this._plugins.push(plugin);
        }
        plugin.map = this;
        plugin.isEnabled = true;
    }
    /** Recentre the sampling window (world XZ). The caller repaints after moving it. */
    setCenter(x, z) {
        this.centerX = x;
        this.centerZ = z;
    }
    /** Sun travel direction receivers project along, and the ground plane blobs were projected to
     * (keep it the same value {@link projectShadowXZ} used when painting — default 0). */
    setSun(dir, groundY = 0) {
        this.sunX = dir.x;
        this.sunY = dir.y;
        this.sunZ = dir.z;
        this.groundY = groundY;
    }
    /** Repaint the whole field. Blob positions are WORLD XZ of where the shadow LANDS (project
     * along the sun with {@link projectShadowXZ} first). White = lit; blobs darken. */
    paint(blobs) {
        this.lastPaintCount = blobs.length;
        const res = this.resolution;
        const ctx = this.texture.getContext();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, res, res);
        const scale = res / this.worldSize; // world metres → pixels
        for (const b of blobs) {
            const px = (b.x - this.centerX) * scale + res / 2;
            // DynamicTexture's canvas is y-down with invertY on: v=1 is canvas row 0.
            const py = res / 2 - (b.z - this.centerZ) * scale;
            const rx = Math.max(1, b.rx * scale);
            const rz = Math.max(1, b.rz * scale);
            if (px + rx < 0 || px - rx > res || py + rz < 0 || py - rz > res)
                continue;
            const a = Math.min(1, Math.max(0, b.strength));
            if (a <= 0)
                continue;
            if (b.sprite) {
                ctx.globalAlpha = a;
                ctx.drawImage(b.sprite, px - rx, py - rz, rx * 2, rz * 2);
                ctx.globalAlpha = 1;
                continue;
            }
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, rz / rx);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            // Full strength at the core, a long soft shoulder. Overlapping blobs (source-over)
            // compound, so a dense patch of sky darkens harder than a lone puff — as it should.
            g.addColorStop(0, `rgba(0,0,0,${a.toFixed(3)})`);
            g.addColorStop(0.5, `rgba(0,0,0,${(a * 0.7).toFixed(3)})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        this.texture.update();
    }
    dispose() {
        for (const p of this._plugins)
            p.isEnabled = false;
        this._plugins = [];
        this.texture.dispose();
    }
}
//# sourceMappingURL=cloud-shadows.js.map