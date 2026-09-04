/*#
# b3d-hud

A drop-in aircraft HUD: mounts the [hud](?hud.ts) SVG as an **additive, translucent**
overlay centred over the scene and exposes `setMeter` / `setHorizon` / `setTraces` to
drive it each frame. The heavy lifting is the pure [hud-math](?hud-math.ts) (radar
projection + horizon) and the `hud` driver; this component just handles mounting and
lifecycle. Wire it to a [b3d-aircraft](?b3d-aircraft.ts)'s state + the scene's targets.

**In-scene / cockpit mode.** `attachInScene(parent, opts)` rasterizes the SAME live
HUD SVG onto a plane in the 3D scene (via [svg-texture](?svg-texture.ts)) — so the HUD
shows in a **3D cockpit and in VR**, where a DOM overlay is invisible. `b3d-aircraft`
mounts it on the canopy automatically (banks with the airframe, not head-locked) and
shows it in the cockpit view; `setInSceneVisible(bool)` toggles it.

## Demo

Scrub the meters and attitude in the ⚙ panel; the radar traces orbit a fixed viewer,
tracking inside the ring when in the field of view and pinning to the periphery when
they swing out or behind.

```js
import { b3d, b3dHud, b3dSkybox, label3d, slider3d, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { speed: 0.62, altitude: 0.4, health: 0.9, energy: 0.7, pitch: 0, roll: 0, warn: 'none' } })
const hud = b3dHud({})

// A warning maps to a text line + the arc side that flashes red.
const warnMap = {
  'none': [],
  'PULL UP': [{ text: 'PULL UP', side: 'bottom' }],
  'MISSILE right': [{ text: 'MISSILE', side: 'right' }],
  'MISSILE left': [{ text: 'MISSILE', side: 'left' }],
  'STALL': [{ text: 'STALL', side: 'top' }],
}

const scene = b3d(
  {
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'HUD', bold: true }),
      slider3d({ label: 'speed (red)', value: s.speed, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'altitude (blue)', value: s.altitude, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'health (green)', value: s.health, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'energy (yellow)', value: s.energy, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'pitch', value: s.pitch, min: -90, max: 90, step: 1 }),
      slider3d({ label: 'roll', value: s.roll, min: -90, max: 90, step: 1 }),
      select3d({ label: 'warning', value: s.warn, options: Object.keys(warnMap), handleChange: (v) => hud.setWarnings(warnMap[v] || []) }),
    ],
  },
  b3dSkybox({ timeOfDay: 9 }),
  hud,
)
preview.append(scene)

const apply = () => {
  hud.setMeter('speed', s.speed.value)
  hud.setMeter('altitude', s.altitude.value)
  hud.setMeter('health', s.health.value)
  hud.setMeter('energy', s.energy.value)
  hud.setHorizon(s.pitch.value, s.roll.value, s.pitch.value)
  hud.setWarnings(warnMap[s.warn.value] || [])
}
for (const k of ['speed', 'altitude', 'health', 'energy', 'pitch', 'roll', 'warn']) s[k].observe(apply)
apply()

// Radar traces orbiting a fixed viewer at the origin (facing +Z).
const viewer = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }
const kinds = ['hostile', 'friendly', 'neutral', 'waypoint']
let t = 0
setInterval(() => {
  t += 0.03
  const traces = kinds.map((kind, i) => ({
    kind,
    pos: { x: Math.sin(t + i * 1.6) * 34, y: Math.sin(t * 0.7 + i) * 12, z: Math.cos(t + i * 1.6) * 34 },
  }))
  // track inside the ring (radius 84), pin OUTSIDE the gauges (pinRadius 116)
  hud.setTraces(traces, viewer, { fovH: Math.PI / 2, fovV: Math.PI / 2, radius: 84, pinRadius: 116 })
}, 32)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | Empty = the built-in code HUD (fully wired); set to a designer SVG to load one |
| `size` | `70` | HUD height as a % of the canvas's smaller dimension |
| `pxPerDeg` | `8` | Pitch-ladder pixels per degree |
*/
/*{ "parent": "UI", "order": 520 }*/
import { B3dChild } from './b3d-utils.js';
import { SvgTexture } from './svg-texture.js';
import { loadHud, buildFallbackHud, HUD_CENTER, HUD_PIN_RADIUS, } from './hud.js';
import { glassUV, hudPointFromUV, hudSizePx } from './hud-math.js';
import * as BABYLON from '@babylonjs/core';
export class B3dHud extends B3dChild {
    static preferredTagName = 'tosi-b3d-hud';
    static initAttributes = {
        // Empty = the built-in code HUD (fully wired). Set to a designer SVG to load one.
        url: '',
        // HUD height as a % of the CANVAS's smaller dimension (the HUD is square).
        size: 70,
        pxPerDeg: 8,
    };
    static lightStyleSpec = {
        ':host': {
            // Fill the canvas area and centre the square HUD inside it — so the element's
            // OWN resize (which tosijs Component observes) tracks the canvas, and
            // handleResize() can re-measure. No hand-rolled ResizeObserver to tear down.
            position: 'absolute',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            // Additive + translucent HUD glow over the scene.
            mixBlendMode: 'plus-lighter',
            opacity: '0.5',
            zIndex: '15',
        },
        ':host([hidden])': { display: 'none' },
        // --hud-size is set live (handleResize) to `size`% of the canvas's smaller side.
        ':host svg': {
            width: 'var(--hud-size, 70vmin)',
            height: 'var(--hud-size, 70vmin)',
            display: 'block',
        },
        // A threatened arc (setWarnings with a `side`) flashes red. The animation
        // origin outranks the asset's inline stroke, so it wins without !important.
        '@keyframes hud-threat': {
            '0%, 100%': { strokeOpacity: '1' },
            '50%': { strokeOpacity: '0.2' },
        },
        // Flash the gauge BORDER (frame outline) red on the threatened side — it's
        // always drawn, so it doesn't disturb the gauge fill. A class rule outranks the
        // frame's inherited stroke/width.
        ':host .hud-threat': {
            stroke: '#ff1d25',
            strokeWidth: '6',
            animation: 'hud-threat 0.5s ease-in-out infinite',
        },
    };
    controller = null;
    _meters = new Map();
    _horizon = null;
    _warnings = null;
    // In-scene ("cockpit") projection: the SAME live HUD SVG rasterized onto a plane
    // in the 3D scene (so it shows in a 3D cockpit and in VR, where the DOM overlay is
    // invisible). Built lazily once the controller's SVG exists.
    _svgTex = null;
    _plane = null;
    _planeMat = null;
    _inSceneParent = null;
    _inSceneOpts;
    _inSceneVisible = false;
    sceneReady(owner, _scene) {
        this.owner = owner;
        this._measure();
        const opts = { pxPerDeg: this.pxPerDeg };
        const url = this.url;
        // Default to the code HUD (fully wired: meters/horizon/traces/warnings); load a
        // designer SVG only when a url is given.
        const ready = url
            ? loadHud(url, opts)
            : Promise.resolve(buildFallbackHud(opts));
        ready.then((c) => {
            if (this.owner == null)
                return; // disposed while loading
            this.controller = c;
            this.replaceChildren(c.el);
            // Replay anything set before the async asset resolved.
            for (const [k, v] of this._meters)
                c.setMeter(k, v);
            if (this._horizon)
                c.setHorizon(...this._horizon);
            for (const [n, l] of this._marks)
                c.setMeterMarks?.(n, l);
            c.setHorizonVisible(this._horizonVisible);
            if (this._warnings)
                c.setWarnings(this._warnings);
            if (this._inSceneParent != null)
                this._buildInScenePlane();
        });
    }
    /**
     * Project the HUD into the 3D scene on a plane parented to `parent` — e.g. an
     * aircraft canopy, so it banks with the airframe and reads correctly in a 3D
     * cockpit and in VR (where the DOM overlay is invisible). Position is in the
     * parent's local space; default sits it a little ahead of and above the origin.
     * Call `setInSceneVisible(true)` to show it (the aircraft toggles this per view).
     */
    attachInScene(parent, opts) {
        this._inSceneParent = parent;
        this._inSceneOpts = opts;
        // Rebuild for this (possibly NEW) parent. On respawn the old plane was disposed along with
        // the old airframe, but our `_plane` reference lingered — and `_buildInScenePlane` bails when
        // `_plane != null`, so the fresh aircraft never got its HUD back. Tear down cleanly first.
        this._plane?.dispose();
        this._planeMat?.dispose();
        this._svgTex?.dispose();
        this._plane = null;
        this._planeMat = null;
        this._svgTex = null;
        if (this.controller != null)
            this._buildInScenePlane();
    }
    _buildInScenePlane() {
        if (this.owner == null ||
            this.controller == null ||
            this._inSceneParent == null ||
            this._plane != null)
            return;
        const scene = this.owner.scene;
        const svg = this.controller.el;
        this._svgTex = new SvgTexture({
            scene,
            element: svg,
            resolution: this._inSceneOpts?.resolution ?? 1024,
            updateInterval: 50,
        });
        const size = this._inSceneOpts?.size ?? 1.2;
        const plane = BABYLON.MeshBuilder.CreatePlane('hud-3d', { size, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        plane.parent = this._inSceneParent;
        plane.position =
            this._inSceneOpts?.position?.clone() ?? new BABYLON.Vector3(0, 0.9, 1.3);
        plane.isPickable = false;
        const mat = new BABYLON.StandardMaterial('hud-3d-mat', scene);
        // Unlit, self-glowing, alpha from the HUD SVG's own transparency.
        mat.emissiveTexture = this._svgTex.texture;
        mat.opacityTexture = this._svgTex.texture;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        plane.material = mat;
        plane.setEnabled(this._inSceneVisible);
        this._plane = plane;
        this._planeMat = mat;
    }
    /** Show/hide the in-scene cockpit HUD plane (independent of the DOM overlay). */
    setInSceneVisible(visible) {
        this._inSceneVisible = visible;
        this._plane?.setEnabled(visible);
    }
    /** tosijs Component calls this on resize (it owns the observer + teardown).
     * `handleResize`, not `onResize` — the `on<Event>` prefix is reserved for the
     * elements factory's event sugar and collides with a component callback. */
    handleResize() {
        this._measure();
    }
    /**
     * Size the square HUD against BOTH viewport dimensions.
     *
     * `size`% of the smaller side alone is right in landscape and pathological in
     * portrait: on a 1400x713 window it paints 36% of the width, on a 500x757 one
     * it paints 70% of it — the same rule, twice the visual weight, because in
     * portrait the small side IS the width (measured 2026-08-15, reported from a
     * phone in fullscreen).
     *
     * So it is also capped at HALF that percentage of the LONG side, which keeps
     * roughly the landscape proportion in portrait and leaves landscape itself
     * within a couple of percent of where it was. Both dimensions, not just the
     * one that happens to be smaller.
     */
    _measure() {
        const px = hudSizePx(this.clientWidth, this.clientHeight, this.size / 100);
        if (px > 0)
            this.style.setProperty('--hud-size', `${px}px`);
    }
    sceneDispose() {
        this._plane?.dispose();
        this._planeMat?.dispose();
        this._svgTex?.dispose();
        this._plane = null;
        this._planeMat = null;
        this._svgTex = null;
        this._inSceneParent = null;
        this.controller = null;
        this.replaceChildren();
        this.owner = null;
    }
    /** Fill a meter arc (`speed`/`altitude`/`health`/`energy`), level 0..1. */
    setMeter(name, level) {
        this._meters.set(name, level);
        this.controller?.setMeter(name, level);
    }
    /** Reference marks (notches) on a meter — see `hud.setMeterMarks`. */
    setMeterMarks(name, levels) {
        this._marks.set(name, levels);
        this.controller?.setMeterMarks?.(name, levels);
    }
    _marks = new Map();
    /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
    setHorizon(pitchDeg, rollDeg, angle) {
        this._horizon = [pitchDeg, rollDeg, angle];
        this.controller?.setHorizon(pitchDeg, rollDeg, angle);
    }
    /** Show/hide the whole HUD (e.g. hide it in a chase view, show it in the cockpit). */
    setVisible(visible) {
        this.hidden = !visible;
    }
    /**
     * Show/hide just the artificial horizon + pitch ladder, keeping the meters,
     * radar traces and warnings. This is what a CHASE view wants: from outside
     * the aircraft a horizon drawn level with the airframe contradicts the real
     * horizon behind it, while everything else on the HUD is still true.
     */
    setHorizonVisible(visible) {
        this._horizonVisible = visible;
        this.controller?.setHorizonVisible(visible);
    }
    _horizonVisible = true;
    /** Warning lines (PULL UP / MISSILE …); a warning's `side` flashes that arc red. */
    setWarnings(warnings) {
        this._warnings = warnings;
        this.controller?.setWarnings(warnings);
    }
    /**
     * Where a WORLD point appears ON THE HUD, in viewBox coords — using the HUD's REAL
     * geometry rather than re-deriving a projection.
     *
     * The in-scene HUD is a literal quad on the canopy (a combiner glass), so "where does
     * that target appear on the HUD" is just: cast a ray from the EYE through the target
     * and intersect it with the quad. We do it in the quad's LOCAL space (transform eye +
     * target by the plane's inverse world matrix; the plane is then the z=0 square from
     * -size/2..+size/2), which folds in the plane's position, orientation, parent and
     * scale for free — no projection matrix, no FOV, no handedness to get wrong. It
     * therefore cannot disagree with what the renderer draws through the glass.
     *
     * Returns null if the target isn't in front of the eye. `tracked` is false when the
     * hit falls OUTSIDE the glass — the caller pins those to the ring.
     */
    projectWorldToHud(world, camera) {
        const plane = this._plane;
        // Flat DOM overlay (chase view): there's no glass in the world, so use Babylon's
        // OWN screen projection and map that screen point into the overlay's rect. Same
        // principle — let the renderer do the projection, don't re-derive it.
        if (plane == null || !this._inSceneVisible) {
            return this._projectViaScreen(world, camera);
        }
        // Work in the quad's LOCAL space: the glass is then the z = 0 square spanning ±half,
        // which folds in its position/orientation/parent/scale for free.
        const inv = BABYLON.Matrix.Invert(plane.getWorldMatrix());
        const eye = BABYLON.Vector3.TransformCoordinates(camera.globalPosition, inv);
        const tgt = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(world.x, world.y, world.z), inv);
        const half = (this._inSceneOpts?.size ?? 1.2) / 2;
        const uv = glassUV(eye, tgt, half); // pure — see hud-math
        if (uv == null)
            return null;
        return hudPointFromUV(uv.u, uv.v, {
            center: HUD_CENTER,
            pinRadius: HUD_PIN_RADIUS,
        });
    }
    /** Flat-overlay projection: Babylon projects the world point to SCREEN (its real
     * projection — cannot disagree with what's drawn), then we map that screen point into
     * the overlay SVG's on-screen rect → viewBox coords. */
    _projectViaScreen(world, camera) {
        const scene = this.owner?.scene;
        const svg = this.controller?.el;
        if (scene == null || svg == null)
            return null;
        const engine = scene.getEngine();
        const canvas = engine.getRenderingCanvas();
        if (canvas == null)
            return null;
        const rw = engine.getRenderWidth();
        const rh = engine.getRenderHeight();
        const p = BABYLON.Vector3.Project(new BABYLON.Vector3(world.x, world.y, world.z), BABYLON.Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(rw, rh));
        if (p.z < 0 || p.z > 1)
            return null; // behind the eye
        const cr = canvas.getBoundingClientRect();
        const sr = svg.getBoundingClientRect();
        if (sr.width < 1 || sr.height < 1)
            return null; // overlay not laid out
        // render px → page px → normalised across the overlay (-1..1, +v up)
        const px = cr.left + (p.x / rw) * cr.width;
        const py = cr.top + (p.y / rh) * cr.height;
        const u = ((px - sr.left) / sr.width) * 2 - 1;
        const v = -(((py - sr.top) / sr.height) * 2 - 1);
        // Same placement/pinning rule as the glass path — shared so they can't drift apart.
        return hudPointFromUV(u, v, {
            center: HUD_CENTER,
            pinRadius: HUD_PIN_RADIUS,
        });
    }
    /** Replace the radar traces from WORLD positions — the HUD projects them onto its
     * own quad (see projectWorldToHud), so blips land on the targets you see. */
    setTraces(traces, camera) {
        if (this.controller == null)
            return;
        const points = [];
        for (const t of traces) {
            const p = this.projectWorldToHud(t.pos, camera);
            if (p == null)
                continue; // behind the glass — not shown
            points.push({
                x: p.x,
                y: p.y,
                kind: t.kind,
                lockProgress: t.lockProgress,
                locked: t.locked,
                tracked: p.tracked,
            });
        }
        this.controller.setTraces(points);
    }
}
export const b3dHud = B3dHud.elementCreator();
//# sourceMappingURL=b3d-hud.js.map