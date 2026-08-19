/*#
# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 17 } })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Sky' }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0, latitude: 40 }),
  // A checkered ground (receives shadows) + a few casters — scrub the time of
  // day and watch the shadows swing long at dawn/dusk and short at noon.
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  b3dBox({ meshName: 'pillar', size: 1.5, x: -3, y: 0.75, z: 1, color: '#c85a3a' }),
  b3dBox({ meshName: 'crate', size: 1, x: 2, y: 0.5, z: 3, color: '#5aa0c8' }),
  b3dSphere({ meshName: 'ball', diameter: 2, x: 3, y: 1, z: -2, color: '#c8a83a' }),
)
preview.append(scene)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `latitude` | `40` | Geographic latitude in DEGREES (affects the sun's arc) |
| `azimuth` | `0` | Sun's compass bearing as Babylon's **0–1 fraction of a full turn**, not degrees — it goes straight to `SkyMaterial.azimuth`. The one angle here that isn't degrees, because it isn't ours |
| `luminance` | `1` | Sky brightness |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials';
import { AbstractMesh } from './b3d-utils';
const DEG_TO_RAD = Math.PI / 180;
function hexToColor3(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new BABYLON.Color3(r, g, b);
}
// Shared constants so updateSky (which runs per frame while the sky animates) can
// stay allocation-free — see the reused scratch on the component.
const SKY_AXIS_X = new BABYLON.Vector3(1, 0, 0);
const SKY_AXIS_Z = new BABYLON.Vector3(0, 0, 1);
const SKY_BLUE = new BABYLON.Color3(0.55, 0.7, 0.9);
const HORIZON_WHITE = new BABYLON.Color3(0.95, 0.95, 0.97);
const NIGHT_HORIZON = new BABYLON.Color3(0.08, 0.1, 0.18);
export class B3dSkybox extends AbstractMesh {
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        turbidity: 10,
        luminance: 1,
        // ⚠️ Babylon's SkyMaterial azimuth is a 0–1 FRACTION of a turn, not an
        // angle. Passed through unchanged rather than converted, because a
        // half-translated third-party unit is worse than an honest foreign one —
        // but it is called out in the attribute table so nobody types 90 here.
        azimuth: 0,
        latitude: 40,
        realtimeScale: 10,
        updateFrequencyMs: 100,
        sunColor: '#eeeeff',
        duskColor: '#ffaa22',
        moonColor: '#6688cc',
        moonIntensity: 0.15,
        timeOfDay: 6.5,
        rayleigh: 2,
        mieDirectionalG: 0.8,
        mieCoefficient: 0.005,
        skyboxSize: 1000,
        applyFog: false,
    };
    interval = 0;
    _sizeToCamera = null;
    // Last timeOfDay the sky material was rendered for. The per-frame observer
    // re-runs updateSky when this drifts — see the note on _sizeToCamera.
    _lastSkyTime = NaN;
    sunEl = null;
    _horizonColor = new BABYLON.Color3(0.75, 0.85, 0.95);
    // Reused scratch + a parsed-color cache so updateSky allocates nothing per frame.
    _sunVec = new BABYLON.Vector3();
    _dir = new BABYLON.Vector3();
    _qLat = new BABYLON.Quaternion();
    _qTime = new BABYLON.Quaternion();
    _qTotal = new BABYLON.Quaternion();
    _horizonScratch = new BABYLON.Color3();
    _colorCache = new Map();
    /** Approximate horizon color based on current time of day / atmosphere. */
    get horizonColor() {
        return this._horizonColor;
    }
    // Parse a hex color once and cache it (source strings are stable attributes), so
    // updateSky doesn't reparse/allocate a Color3 per frame. Returned colors are
    // treated as read-only (used as Lerp sources / copied from).
    hex(hex) {
        let c = this._colorCache.get(hex);
        if (c == null) {
            c = hexToColor3(hex);
            this._colorCache.set(hex, c);
        }
        return c;
    }
    updateSky() {
        if (this.mesh?.material == null)
            return;
        const attrs = this;
        const material = this.mesh.material;
        const latitude = attrs.latitude * DEG_TO_RAD;
        const sunVector = this._sunVec.set(0, 100, 0);
        // Time rotation: noon=0, wraps through day
        const t = (((attrs.timeOfDay + 30) % 12) / 12) * 1.04 - 0.52;
        const timeAngle = t * Math.PI;
        // Latitude tilts the sun's arc away from vertical; time rotates it east-west.
        BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_X, latitude, this._qLat);
        BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_Z, timeAngle, this._qTime);
        this._qLat.multiplyToRef(this._qTime, this._qTotal);
        const isDay = attrs.timeOfDay > 6 && attrs.timeOfDay < 18;
        sunVector.rotateByQuaternionToRef(this._qTotal, sunVector);
        material.luminance = attrs.luminance;
        material.azimuth = attrs.azimuth;
        material.mieDirectionalG = attrs.mieDirectionalG;
        material.mieCoefficient = attrs.mieCoefficient;
        if (this.owner != null) {
            if (this.sunEl == null) {
                this.sunEl = this.owner.querySelector('tosi-b3d-sun');
            }
            const sunEl = this.sunEl;
            if (sunEl?.light != null) {
                const { light } = sunEl;
                // The skybox owns the day/night intensity cycle; tell the sun to stop
                // writing light.intensity itself (it would stomp this on its slower 1s
                // tick and cause a periodic flicker). We multiply by the sun's
                // underwater dimFactor so the two stay in agreement.
                sunEl.externallyLit = true;
                const dim = sunEl.dimFactor ?? 1;
                material.sunPosition = sunVector;
                sunVector.normalizeToRef(this._dir);
                light.direction.x = -this._dir.x;
                light.direction.y = -this._dir.y;
                light.direction.z = -this._dir.z;
                const intensity = Math.min(Math.abs((t + 0.52) * 10), Math.abs((t - 0.52) * 10), 1);
                if (isDay) {
                    // Blend dusk→sun straight into light.diffuse (cached parsed sources).
                    BABYLON.Color3.LerpToRef(this.hex(attrs.duskColor), this.hex(attrs.sunColor), intensity, light.diffuse);
                    light.intensity = intensity * dim;
                    material.rayleigh = attrs.rayleigh;
                    material.turbidity = attrs.turbidity;
                    // Horizon: blend light color with sky blue, then brighten toward white
                    // at high sun — written in place into _horizonColor via a scratch.
                    BABYLON.Color3.LerpToRef(light.diffuse, SKY_BLUE, 0.6, this._horizonScratch);
                    BABYLON.Color3.LerpToRef(this._horizonScratch, HORIZON_WHITE, intensity * 0.4, this._horizonColor);
                }
                else {
                    light.diffuse.copyFrom(this.hex(attrs.moonColor));
                    light.intensity = attrs.moonIntensity * dim;
                    material.rayleigh = attrs.rayleigh * 0.05;
                    material.turbidity = attrs.turbidity * 0.05;
                    // Night horizon: dark desaturated blue
                    this._horizonColor.copyFrom(NIGHT_HORIZON);
                }
            }
        }
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        this.interval = window.setInterval(() => {
            attrs.timeOfDay =
                (((attrs.timeOfDay +
                    attrs.realtimeScale * attrs.updateFrequencyMs * 1e-6) /
                    24) %
                    1) *
                    24;
        }, attrs.updateFrequencyMs);
        const material = new SkyMaterial('skybox', scene);
        material.backFaceCulling = false;
        material.useSunPosition = true;
        this.mesh = BABYLON.MeshBuilder.CreateBox('skybox_nocast', {
            size: attrs.skyboxSize,
            sideOrientation: BABYLON.Mesh.BACKSIDE,
        }, scene);
        this.mesh.material = material;
        this.mesh.applyFog = this.applyFog;
        // infiniteDistance pins the dome to the camera (translation ignored), so you
        // can fly forever without leaving it. Then scale it each frame to just inside
        // the active camera's far plane, so ALL in-view geometry (streamed terrain,
        // etc.) sits inside the dome and it renders behind everything by normal depth
        // — no fixed size to outgrow. Base box is `skyboxSize` across (half that).
        this.mesh.infiniteDistance = true;
        const baseHalf = (this.skyboxSize || 1000) * 0.5;
        this._sizeToCamera = () => {
            const cam = scene.activeCamera;
            if (cam == null || this.mesh == null)
                return;
            // Keep even the box CORNERS (at half·√3) well inside the far plane, or they
            // clip and punch holes in the sky. 0.5·maxZ → corner ≈ 0.87·maxZ, safe.
            const targetHalf = cam.maxZ * 0.5;
            this.mesh.scaling.setAll(targetHalf / baseHalf);
            // Refresh the sky material HERE (a scene onBeforeRender observer, which fires
            // in flat AND XR) rather than only from tosijs's rAF-batched render(). In an
            // immersive session window.rAF is suspended, and this component's continuous
            // realtimeScale setInterval keeps re-queuing render() so its per-element flag
            // stays stranded — freezing the sky (the "time-of-day slider does nothing in
            // XR until you exit" bug). Driving updateSky off the frame loop, gated on a
            // timeOfDay change, keeps it live everywhere.
            if (attrs.timeOfDay !== this._lastSkyTime) {
                this._lastSkyTime = attrs.timeOfDay;
                this.updateSky();
            }
        };
        scene.registerBeforeRender(this._sizeToCamera);
        this.updateSky();
        owner.register({ meshes: [this.mesh] });
    }
    sceneDispose() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = 0;
        }
        if (this._sizeToCamera && this.owner) {
            this.owner.scene.unregisterBeforeRender(this._sizeToCamera);
            this._sizeToCamera = null;
        }
        // Hand intensity ownership back to the sun before we let go of it.
        if (this.sunEl != null)
            this.sunEl.externallyLit = false;
        this.sunEl = null;
        super.sceneDispose();
    }
    render() {
        super.render();
        this.updateSky();
    }
}
export const b3dSkybox = B3dSkybox.elementCreator({ tag: 'tosi-b3d-skybox' });
//# sourceMappingURL=b3d-skybox.js.map