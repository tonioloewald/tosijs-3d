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
/*{ "parent": "b3d-panel", "order": 10 }*/
import * as BABYLON from '@babylonjs/core';
import { anchorLayout, anchorLength, } from './anchor-layout.js';
import { SvgTexture } from './svg-texture.js';
import { markUiMesh } from './b3d-utils.js';
import { gazeReveal } from './xr-frames.js';
import { faceViewer } from './dialog-placement.js';
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
 * Make a glow layer bloom a mesh only as much as the mesh is actually visible.
 *
 * **Babylon's glow ignores opacity.** Its default emissive pick never reads
 * `mesh.visibility`, and it passes `material.alpha` through without weighting the
 * colour by it. So a full-screen emissive quad at 30% alpha (a fade-to-white
 * curtain on the way in) blooms at FULL strength, and the frame goes white while
 * the quad itself is barely there. Measured in manta-recon (board #2742): the
 * curtain at alpha 0.3 is a dim wash without glow, and with glow the background
 * goes white, the carrier washes out and the planet bleaches. The same rule is
 * why an emissive mesh hidden with `visibility = 0` still glowed.
 *
 * This installs an emissive selector that scales the colour by
 * `material.alpha × mesh.visibility`. It keeps Babylon's emissive-texture level
 * and `emissiveIntensity`, so an opaque, fully visible mesh glows exactly as before.
 * `<tosi-b3d>` applies it to the glow layer it builds; call it yourself on one you
 * build.
 */
export function opacityWeightedGlow(layer) {
    layer.customEmissiveColorSelector = (mesh, _subMesh, material, result) => {
        const m = material;
        const e = m?.emissiveColor;
        if (!e) {
            result.copyFrom(layer.neutralColor);
            return;
        }
        const alpha = m.alpha ?? 1;
        const k = (m.emissiveTexture?.level ?? 1) *
            (m.emissiveIntensity ?? 1) *
            alpha *
            (mesh.visibility ?? 1);
        result.set(e.r * k, e.g * k, e.b * k, alpha);
    };
}
/**
 * Keep a mesh out of every glow layer in the scene.
 *
 * A glow layer `<tosi-b3d>` builds weights glow by opacity (`opacityWeightedGlow`),
 * so a mesh hidden with `visibility = 0` no longer glows there. A plain Babylon
 * `GlowLayer` ignores `mesh.visibility` entirely, so under one of those an emissive
 * mesh whose visibility you animate (a gaze-revealed panel, a fading fragment) still
 * has to opt out of glow or it cannot actually hide. Exclusion is also right for
 * things that are emissive but are not light sources, like UI plaques.
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
 * The spec for ONE presentation of a panel that exists in both. Flat, a
 * `flatAnchor` stands in for the anchor and the screen pins apply; in a
 * headset the screen pins do NOT (there is no screen to pin to: they put the
 * loadout a metre ahead, sized from the flat canvas, instead of on your
 * shoulder, found by the 0.10.6 review). One rule, used by every attach site.
 */
export function presentationSpec(spec, flat) {
    if (flat)
        return spec.flatAnchor != null ? { ...spec, anchor: spec.flatAnchor } : spec;
    return spec.screenAnchor != null ? { ...spec, screenAnchor: undefined } : spec;
}
/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export function attachFramePanel(scene, cam, frame, spec) {
    const anchor = typeof spec.anchor === 'string' ? PRESETS[spec.anchor] : spec.anchor;
    const startDeg = anchor.revealStartDeg ?? 50;
    const fullDeg = anchor.revealFullDeg ?? 25;
    const cosStart = Math.cos(startDeg * DEG);
    const cosFull = Math.cos(fullDeg * DEG);
    const alwaysOn = spec.reveal === 'always';
    // Resolve position: explicit, or by azimuth/elevation/distance off the focus.
    const resolve = (a) => {
        if (a.position != null)
            return a.position;
        const f = a.focus ?? DEFAULT_FOCUS;
        const az = (a.azimuthDeg ?? 0) * DEG;
        const el = (a.elevationDeg ?? 0) * DEG;
        const d = a.distance ?? 0.5;
        const horiz = d * Math.cos(el);
        return [
            f[0] + horiz * Math.sin(az),
            f[1] + d * Math.sin(el),
            f[2] + horiz * Math.cos(az),
        ];
    };
    const el = spec.svg ?? (spec.url ? null : placeholderPanelSvg(spec.title ?? ''));
    const aspect = el
        ? el.viewBox.baseVal.height / el.viewBox.baseVal.width || 1
        : spec.aspect ?? 1;
    const width = spec.width ?? 0.26;
    // The viewBox it was built at: content that grows (a dock opening) grows
    // the plane by the same ratio, so its units keep their size.
    const baseVb = el
        ? { w: el.viewBox.baseVal.width || 1, h: el.viewBox.baseVal.height || 1 }
        : null;
    const plane = BABYLON.MeshBuilder.CreatePlane('frame-panel', { width, height: width * aspect, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.parent = frame;
    // Pointer-pickable, collision-invisible. This panel rides a head/body frame,
    // so in cockpit view it sits right in front of the airframe — and the
    // aircraft's impact sweep crashed on it. See markUiMesh.
    markUiMesh(plane);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    // Orient to face the focus point (your head), tilted to its height. The
    // panel doesn't rotate after this — the frame carries it (until focus moves
    // it, which places it again).
    //
    // `faceViewer` and not a local atan2: a plane's visible face is local -Z, so
    // aiming +Z at your head shows its BACK, which a double-sided plane renders
    // MIRRORED rather than not at all. This used to do exactly that and cancel it
    // with `tex.uScale = -1`; two wrongs that read correctly are still a trap for
    // the next panel, and the next panel (the world dialog) duly shipped mirrored.
    // Roll goes THROUGH faceViewer, which flips its sense — turning the panel
    // around reverses how a roll reads, so `rollDeg` keeps meaning what it meant.
    // (`rollDeg: 180`, which rights the grip-space anchors, is symmetric and
    // agrees either way — which is exactly why this needed a test rather than an
    // argument.)
    const placeAt = (a) => {
        const pos = resolve(a);
        const f = a.focus ?? DEFAULT_FOCUS;
        plane.position.set(pos[0], pos[1], pos[2]);
        // Flat on: oriented as a panel straight ahead of the eye would be.
        const { yaw, pitch, roll } = a.flatOn
            ? faceViewer({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, (a.rollDeg ?? 0) * DEG)
            : faceViewer({ x: pos[0], y: pos[1], z: pos[2] }, { x: f[0], y: f[1], z: f[2] }, (a.rollDeg ?? 0) * DEG);
        plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch + (a.tiltDeg ?? 0) * DEG, roll);
    };
    placeAt(anchor);
    const focusAnchor = typeof spec.focusAnchor === 'string'
        ? PRESETS[spec.focusAnchor]
        : spec.focusAnchor ?? { azimuthDeg: 0, elevationDeg: -6, distance: 0.75 };
    const focusScale = spec.focusScale ?? 1.9;
    let focused = false;
    // A focused panel nearer than the camera's near plane would be clipped away
    // (a flat follow camera's is often a metre): push it out past the plane and
    // scale it by the same ratio, so it looks the same size.
    let pushed = 1;
    const focusPlace = () => {
        const near = (scene.activeCamera ?? cam).minZ ?? 0;
        const d = focusAnchor.distance ?? 0.5;
        pushed =
            focusAnchor.position == null && d < near * 1.25 ? (near * 1.25) / d : 1;
        // A screen-pinned panel comes to the middle of the SCREEN, square to it:
        // the tilt a focus anchor below eye level gives reads as a mistake on a
        // monitor (Tonio: expand "to a flat pinned position and not the slightly
        // tilted view").
        if (spec.screenAnchor)
            return { position: [0, 0, d * pushed], flatOn: true };
        return pushed === 1 ? focusAnchor : { ...focusAnchor, distance: d * pushed };
    };
    const fit = () => {
        if (!el || !baseVb)
            return;
        const vb = el.viewBox.baseVal;
        const sx = (vb.width || baseVb.w) / baseVb.w;
        const sy = (vb.height || baseVb.h) / baseVb.h;
        let k = focused ? focusScale * pushed : screenK;
        // Focused, it fits the view (90% of it at its distance) rather than being
        // cropped by it: a monitor sees far less than a headset.
        const c = (scene.activeCamera ?? cam);
        if (focused && c.mode === BABYLON.Camera.PERSPECTIVE_CAMERA) {
            /*
            Room either side of its centre, less how far off-centre it sits, IN THE
            CAMERA'S VIEW. It used the panel's position in its frame, which is level
            while a follow camera looks down: the panel then sat lower on screen than
            the sum said, and its bottom (the end of the bag list) went off the edge.
            */
            plane.computeWorldMatrix(true);
            const p = BABYLON.Vector3.TransformCoordinates(plane.getAbsolutePosition(), c.getViewMatrix());
            const d = Math.max(0.01, p.z);
            const halfTall = d * Math.tan(c.fov / 2) * 0.92;
            const halfWide = halfTall * scene.getEngine().getAspectRatio(c);
            const tall = 2 * Math.max(0.01, halfTall - Math.abs(p.y));
            const wide = 2 * Math.max(0.01, halfWide - Math.abs(p.x));
            const w = width * sx;
            const h = width * aspect * sy;
            k = Math.min(k, tall / h, wide / w);
        }
        plane.scaling.x = k * sx;
        plane.scaling.y = k * sy;
    };
    /*
    SCREEN PLACEMENT (flat): solve the panel's rectangle on screen with the
    anchored layout at its current pixel size, then put its centre at that pixel
    on a plane `distance` in front of the eye. The frame is the head-locked
    `face` one (local +x right, +y up, +z ahead), so a pixel is a fixed offset.
    */
    let screenK = 1;
    const placeScreen = () => {
        const sa = spec.screenAnchor;
        const c = (scene.activeCamera ?? cam);
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!sa || !c || !canvas || c.mode !== BABYLON.Camera.PERSPECTIVE_CAMERA)
            return;
        const W = canvas.clientWidth || scene.getEngine().getRenderWidth();
        const H = canvas.clientHeight || scene.getEngine().getRenderHeight();
        if (!W || !H)
            return;
        const vmin = Math.min(W, H);
        const px = (v) => typeof v === 'string' && v.endsWith('vmin')
            ? (parseFloat(v) / 100) * vmin
            : v;
        const d = Math.max(sa.distance ?? 1, (c.minZ ?? 0) * 1.25);
        // Metres per pixel at that distance, by whichever axis the fov fixes.
        const perPx = c.fovMode === BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED
            ? (2 * d * Math.tan(c.fov / 2)) / W
            : (2 * d * Math.tan(c.fov / 2)) / H;
        const vb = el?.viewBox.baseVal;
        const sx = el && baseVb ? (vb.width || baseVb.w) / baseVb.w : 1;
        const sy = el && baseVb ? (vb.height || baseVb.h) / baseVb.h : 1;
        const baseW = width * sx;
        const baseH = width * aspect * sy;
        screenK =
            sa.height != null
                ? (anchorLength(px(sa.height), H) * perPx) / baseH
                : 1;
        const { boxes } = anchorLayout([
            {
                left: px(sa.left),
                right: px(sa.right),
                top: px(sa.top),
                bottom: px(sa.bottom),
                anchorX: sa.anchorX,
                anchorY: sa.anchorY,
                anchor: sa.anchor,
                width: (baseW * screenK) / perPx,
                height: (baseH * screenK) / perPx,
            },
        ], { width: W, height: H });
        const b = boxes[0];
        placeAt({
            position: [
                (b.x + b.width / 2 - W / 2) * perPx,
                (H / 2 - (b.y + b.height / 2)) * perPx,
                d,
            ],
            flatOn: true,
        });
    };
    const onFocus = (e) => {
        focused = !!e.detail?.focus;
        placeAt(focused ? focusPlace() : anchor);
        fit();
    };
    el?.addEventListener('panelfocus', onFocus);
    // Content already focused before this panel existed (a session change
    // rebuilt it): start where it is. Without this the dock stayed open on a
    // small, unfocused panel, and its tap-to-open did nothing (it was open).
    if (el?.getAttribute('data-focus') === 'true')
        onFocus(new CustomEvent('panelfocus', { detail: { focus: true } }));
    const tex = el
        ? new SvgTexture({
            scene,
            element: el,
            resolution: spec.resolution ?? 384,
            updateInterval: 400,
        })
        : new SvgTexture({
            scene,
            url: spec.url,
            resolution: spec.resolution ?? 384,
        });
    const mat = new BABYLON.StandardMaterial('frame-panel-mat', scene);
    mat.backFaceCulling = false;
    mat.emissiveTexture = tex.texture;
    mat.opacityTexture = tex.texture;
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
    /*
    POINTERS, so a panel of controls is a panel you can USE (tosijs-3d#92).
  
    A `panel3d` SVG exposes `handlePointer(kind, x, y)` in viewBox coordinates,
    and b3d-svg-plane has always routed scene picks into it — mouse, touch and
    XR rays alike, through the one scene pointer observable. This marked its
    plane pickable and routed nothing, so a menu here drew working-looking
    buttons that ignored every click, with no error: the worst failure a menu
    can have. Same routing as b3d-svg-plane: a press must land ON the plane, and
    once pressed the panel owns the gesture until release (so a slider drag
    survives leaving the track).
  
    A gaze-hidden panel does not take presses: it is not there for the user.
  
    And REPAINT NOW on a press or release, instead of waiting for the texture's
    400 ms timer. Otherwise a button's pressed state lags by up to that, which
    does not matter for a reticle and matters a lot for a menu. A move repaints
    at most once per frame.
    */
    const target = el;
    /*
    A PRESS ON THE PANEL IS NOT A PRESS ON THE WORLD. Flat, the camera's own
    controls take the same pointer, so dragging a thing across a panel orbited
    the view behind it. Hold the camera's controls for the gesture and give
    them back on release. (A headset's camera has none attached; nothing to do.)
    */
    let held = null;
    const holdCamera = () => {
        const c = scene.activeCamera;
        if (c && c.inputs?.attachedToElement) {
            c.detachControl();
            held = c;
        }
    };
    const releaseCamera = () => {
        if (held == null)
            return;
        held.attachControl(scene.getEngine().getRenderingCanvas(), true);
        held = null;
    };
    let pointerObs = null;
    if (target != null && typeof target.handlePointer === 'function' && el) {
        scene.constantlyUpdateMeshUnderPointer = true;
        const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes;
        let pressing = false;
        let hovering = false;
        let lastX = 0;
        let lastY = 0;
        let repaintQueued = false;
        const repaint = (now) => {
            if (now)
                return tex.render();
            if (repaintQueued)
                return;
            repaintQueued = true;
            scene.onAfterRenderObservable.addOnce(() => {
                repaintQueued = false;
                tex.render();
            });
        };
        pointerObs = scene.onPointerObservable.add((info) => {
            const kind = info.type === POINTERDOWN
                ? 'down'
                : info.type === POINTERUP
                    ? 'up'
                    : info.type === POINTERMOVE
                        ? 'move'
                        : '';
            if (!kind)
                return;
            const pick = info.pickInfo;
            const onPlane = !!pick?.hit && pick.pickedMesh === plane && plane.visibility > 0.5;
            const uv = onPlane && pick ? pick.getTextureCoordinates() : null;
            if (uv) {
                const vb = el.viewBox.baseVal;
                lastX = uv.x * (vb.width || 1);
                lastY = (1 - uv.y) * (vb.height || 1);
            }
            if (kind === 'down') {
                if (!uv)
                    return;
                pressing = true;
                holdCamera();
                info.event?.preventDefault?.();
                target.handlePointer('down', lastX, lastY);
                repaint(true);
            }
            else if (kind === 'move') {
                if (pressing || uv) {
                    hovering = true;
                    target.handlePointer('move', lastX, lastY);
                    repaint(false);
                }
                else if (hovering) {
                    // Off the plane: clear the hover, or a highlighted row stays lit.
                    hovering = false;
                    target.handlePointer('leave', 0, 0);
                    repaint(false);
                }
            }
            else if (pressing) {
                pressing = false;
                releaseCamera();
                target.handlePointer('up', lastX, lastY);
                repaint(true);
            }
        });
    }
    return {
        debug,
        mesh: plane,
        // `ctx.firstPerson` is the active camera view (fpv/cockpit vs chase), so a
        // panel can be limited to one. Defaults to visible if no context is given.
        update(ctx) {
            debug.updates++;
            if (spec.screenAnchor && !focused)
                placeScreen();
            fit();
            // Focused content is in front of you because you asked for it.
            if (focused) {
                plane.visibility = 1;
                debug.reveal = 1;
                return;
            }
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
            releaseCamera();
            el?.removeEventListener('panelfocus', onFocus);
            if (pointerObs != null)
                scene.onPointerObservable.remove(pointerObs);
            tex.dispose();
            mat.dispose();
            plane.dispose();
        },
    };
}
//# sourceMappingURL=frame-panel.js.map