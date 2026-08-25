/*#
# frame-panel

A spatial UI panel pinned to an XR reference frame (see [xr-frames](?xr-frames.ts)).
You give it a frame, a position (or a preset), and a placeholder title or your own
SVG; it renders the panel there and reveals it as you look toward it (`gazeReveal`).

This is the substrate for body-anchored UI — a waist "quick access / holster"
panel revealed by looking down, inventory panels over either shoulder revealed by
glancing back. The panel is FIXED in its frame (it doesn't billboard); the frame
itself moves (e.g. `body` follows your torso), so the panel rides with you and is
oriented once to face your head.

Anchor presets (in the `body` frame, metres; y is absolute since `body` sits at
the floor): `waist`, `left-shoulder`, `right-shoulder`.

## Example

XR-only. Pins an SVG panel to an [xr-frame](?xr-frames.ts) and reveals it as you look toward it.
The declarative wrapper is [<tosi-b3d-panel>](?b3d-panel.ts) — prefer it; this is the imperative version:

```javascript
import { attachFramePanel } from 'tosijs-3d'
// attachFramePanel(frames, { frame: 'left-shoulder', preset, svg }) → a gaze-revealed panel pinned
// to your shoulder. See <tosi-b3d-panel> for the element form.
```
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core';
import { SvgTexture } from './svg-texture';
import { markUiMesh } from './b3d-utils';
import { gazeReveal } from './xr-frames';
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1);
const DEG = Math.PI / 180;
// Angular presets measured from the mean-eye point, all at the same comfortable
// distance (≈ the overhead menu's). Placed in the RIG frame so they're stable
// regardless of standing/sitting and don't chase the live head pose.
const PANEL_DISTANCE = 1.4;
const PRESETS = {
    // Quick access: 45° down (faces up at you — the opposite tilt of the overhead).
    waist: {
        azimuthDeg: 0,
        elevationDeg: -45,
        distance: PANEL_DISTANCE,
        revealStartDeg: 38,
        revealFullDeg: 16,
    },
    // Inventory: 45° up, 60° to the side.
    'left-shoulder': {
        azimuthDeg: -60,
        elevationDeg: 45,
        distance: PANEL_DISTANCE,
        revealStartDeg: 44,
        revealFullDeg: 22,
    },
    'right-shoulder': {
        azimuthDeg: 60,
        elevationDeg: 45,
        distance: PANEL_DISTANCE,
        revealStartDeg: 44,
        revealFullDeg: 22,
    },
    // Overhead/global menu: 60° up.
    overhead: {
        azimuthDeg: 0,
        elevationDeg: 60,
        distance: PANEL_DISTANCE,
        revealStartDeg: 90,
        revealFullDeg: 90,
    },
    // Watch-style, on a hand frame: sat on the back of the wrist (grip space: +Z
    // points up the forearm toward the wrist, +Y out the back of the hand), facing
    // up so you turn your wrist to read it. Starting offsets — tune in-visor.
    wrist: {
        position: [0, 0.04, -0.06],
        focus: [0, 0.5, -0.06],
        rollDeg: 180, // grip space lands it upside down without this
        revealStartDeg: 55,
        revealFullDeg: 30,
    },
};
// Eye frame origin (the head). Presets place by angle from here and face it.
const DEFAULT_FOCUS = [0, 0, 0];
/** A simple titled placeholder panel SVG (rounded card + centred label). */
export function placeholderPanelSvg(title, w = 320, h = 200) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', '4');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', String(w - 8));
    rect.setAttribute('height', String(h - 8));
    rect.setAttribute('rx', '18');
    rect.setAttribute('fill', 'rgba(18,22,31,0.82)');
    // No border — thin strokes alias badly at distance in the headset.
    svg.appendChild(rect);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(w / 2));
    text.setAttribute('y', String(h / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#cfe0ff');
    text.setAttribute('font-size', '34');
    text.setAttribute('font-family', 'system-ui, sans-serif');
    text.textContent = title;
    svg.appendChild(text);
    return svg;
}
/**
 * Keep a mesh out of every glow layer in the scene.
 *
 * **A glow layer ignores `mesh.visibility` entirely** (Babylon's effect layer never reads it),
 * so ANY emissive mesh you hide by setting `visibility = 0` will still be drawn by the glow
 * pass. Anything whose visibility you animate — a gaze-revealed panel, a fading-out fragment —
 * and which is emissive, has to opt out of glow or it cannot actually hide.
 *
 * Exported because this is a trap, not a nameplate quirk.
 */
export function excludeFromGlow(scene, mesh) {
    for (const layer of scene.effectLayers ?? []) {
        if (layer.getClassName() === 'GlowLayer') {
            ;
            layer.addExcludedMesh(mesh);
        }
    }
}
/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export function attachFramePanel(scene, cam, frame, spec) {
    const anchor = typeof spec.anchor === 'string' ? PRESETS[spec.anchor] : spec.anchor;
    const focus = anchor.focus ?? DEFAULT_FOCUS;
    const startDeg = anchor.revealStartDeg ?? 50;
    const fullDeg = anchor.revealFullDeg ?? 25;
    const cosStart = Math.cos(startDeg * DEG);
    const cosFull = Math.cos(fullDeg * DEG);
    const alwaysOn = spec.reveal === 'always';
    // Resolve position: explicit, or by azimuth/elevation/distance off the focus.
    let pos = anchor.position;
    if (pos == null) {
        const az = (anchor.azimuthDeg ?? 0) * DEG;
        const el = (anchor.elevationDeg ?? 0) * DEG;
        const d = anchor.distance ?? 0.5;
        const horiz = d * Math.cos(el);
        pos = [
            focus[0] + horiz * Math.sin(az),
            focus[1] + d * Math.sin(el),
            focus[2] + horiz * Math.cos(az),
        ];
    }
    const el = spec.svg ?? (spec.url ? null : placeholderPanelSvg(spec.title ?? ''));
    const aspect = el
        ? el.viewBox.baseVal.height / el.viewBox.baseVal.width || 1
        : spec.aspect ?? 1;
    const width = spec.width ?? 0.26;
    const plane = BABYLON.MeshBuilder.CreatePlane('frame-panel', { width, height: width * aspect, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.parent = frame;
    // Pointer-pickable, collision-invisible. This panel rides a head/body frame,
    // so in cockpit view it sits right in front of the airframe — and the
    // aircraft's impact sweep crashed on it. See markUiMesh.
    markUiMesh(plane);
    plane.position.set(pos[0], pos[1], pos[2]);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    // Orient ONCE to face the focus point (your head): +Z toward it, tilted to its
    // height. The panel doesn't rotate after this — the frame carries it.
    const dx = focus[0] - pos[0];
    const dy = focus[1] - pos[1];
    const dz = focus[2] - pos[2];
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    const roll = (anchor.rollDeg ?? 0) * DEG;
    plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch, roll);
    const tex = el
        ? new SvgTexture({
            scene,
            element: el,
            resolution: 384,
            updateInterval: 400,
        })
        : new SvgTexture({ scene, url: spec.url, resolution: 384 });
    const mat = new BABYLON.StandardMaterial('frame-panel-mat', scene);
    mat.backFaceCulling = false;
    mat.emissiveTexture = tex.texture;
    mat.opacityTexture = tex.texture;
    // The face you view is the plane's back (+Z points at you), which mirrors the
    // texture horizontally — flip U so it reads correctly.
    tex.texture.uScale = -1;
    tex.texture.uOffset = 1;
    mat.diffuseColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    // Additive for glowing HUD glyphs (reticle): dark pixels add nothing, bright
    // ones glow over the scene; don't occlude. Default composite (alpha-over).
    if (spec.blend === 'add') {
        mat.alphaMode = BABYLON.Constants.ALPHA_ADD;
        mat.disableDepthWrite = true;
    }
    plane.material = mat;
    plane.visibility = alwaysOn ? 1 : 0;
    // ⚠️ THE GLOW LAYER DOES NOT RESPECT `mesh.visibility` — Babylon's effect-layer code never
    // reads it. And this material is PURE EMISSIVE (black diffuse, lighting off, emissive =
    // the SVG), which is exactly what glow harvests. So a gaze-hidden panel keeps being drawn
    // by the glow pass, BEHIND visibility's back: the reveal computes perfectly and the plate
    // never goes away. It reads as a soft bloom on a monitor (easy to miss) and as a plainly
    // visible floating plaque in a headset. Exclude it — a UI plaque shouldn't bloom anyway.
    excludeFromGlow(scene, plane);
    const head = new BABYLON.Vector3();
    const fwd = new BABYLON.Vector3();
    const toAnchor = new BABYLON.Vector3();
    const toSubject = new BABYLON.Vector3();
    const viewMode = spec.view ?? 'both';
    const maxDist = spec.maxDistance ?? Infinity;
    const gazeTarget = spec.gazeTarget ?? null;
    const gazeOffset = spec.gazeOffset ?? [0, 0, 0];
    const fadeFrom = spec.fadeFrom ?? Infinity;
    const fadeTo = spec.fadeTo ?? Infinity;
    // `updates` is the load-bearing one: if it doesn't ADVANCE in a session, the
    // reveal isn't broken — it's simply never running, and the panel is stuck at
    // whatever visibility it was born with.
    const debug = {
        reveal: alwaysOn ? 1 : 0,
        cosine: 0,
        distance: 0,
        updates: 0,
        camera: '—',
    };
    return {
        debug,
        // `ctx.firstPerson` is the active camera view (fpv/cockpit vs chase), so a
        // panel can be limited to one. Defaults to visible if no context is given.
        update(ctx) {
            debug.updates++;
            const fp = ctx?.firstPerson ?? true;
            if ((viewMode === 'first' && !fp) || (viewMode === 'third' && fp)) {
                plane.visibility = 0;
                debug.reveal = 0;
                return;
            }
            if (alwaysOn) {
                plane.visibility = 1;
                debug.reveal = 1;
                return;
            }
            // Gaze-reveal off whatever camera is currently rendering — the flat orbit/
            // follow camera on a monitor, the headset camera in a session. This is what
            // lets frame panels (nameplates, HUD) work in NON-VR too, not just XR.
            const active = scene.activeCamera ?? cam;
            head.copyFrom(active.globalPosition);
            active.getDirectionToRef(XR_FORWARD, fwd);
            plane.getAbsolutePosition().subtractToRef(head, toAnchor);
            // Aim the cone at the SUBJECT (the NPC), not at the plate hovering above their head —
            // otherwise looking straight at someone doesn't reveal their name, and the only way to
            // fix THAT is a cone so wide it never hides anything. Distance is still measured to the
            // panel, which is what "how far away is this label" actually means.
            if (gazeTarget != null) {
                gazeTarget.getAbsolutePosition().subtractToRef(head, toSubject);
                toSubject.x += gazeOffset[0];
                toSubject.y += gazeOffset[1];
                toSubject.z += gazeOffset[2];
            }
            else {
                toSubject.copyFrom(toAnchor);
            }
            let v = gazeReveal(fwd, toSubject, cosStart, cosFull);
            // Soft distance falloff — fade, never cliff.
            const dist = toAnchor.length();
            if (v > 0 && dist > fadeFrom && fadeTo > fadeFrom) {
                v *= Math.max(0, 1 - (dist - fadeFrom) / (fadeTo - fadeFrom));
            }
            plane.visibility = dist > maxDist ? 0 : v;
            debug.reveal = plane.visibility;
            debug.camera = active.getClassName();
            debug.distance = dist;
            const fl = fwd.length() || 1;
            const sl = toSubject.length() || 1;
            debug.cosine = BABYLON.Vector3.Dot(fwd, toSubject) / (fl * sl);
        },
        dispose() {
            tex.dispose();
            mat.dispose();
            plane.dispose();
        },
    };
}
//# sourceMappingURL=frame-panel.js.map