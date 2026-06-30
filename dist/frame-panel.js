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
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core';
import { SvgTexture } from './svg-texture';
import { gazeReveal } from './xr-frames';
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1);
const DEG = Math.PI / 180;
// Kept "not too far": modest offsets so the panels sit just off the body.
const PRESETS = {
    waist: { position: [0, 1.0, 0.32], revealStartDeg: 55, revealFullDeg: 28 },
    'left-shoulder': {
        position: [-0.26, 1.5, -0.05],
        revealStartDeg: 45,
        revealFullDeg: 22,
    },
    'right-shoulder': {
        position: [0.26, 1.5, -0.05],
        revealStartDeg: 45,
        revealFullDeg: 22,
    },
};
const DEFAULT_FOCUS = [0, 1.6, 0];
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
    rect.setAttribute('stroke', 'rgba(120,170,255,0.9)');
    rect.setAttribute('stroke-width', '3');
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
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export function attachFramePanel(scene, cam, frame, spec) {
    const preset = typeof spec.anchor === 'string' ? PRESETS[spec.anchor] : null;
    const anchor = typeof spec.anchor === 'string'
        ? { ...PRESETS[spec.anchor] }
        : spec.anchor;
    const pos = anchor.position;
    const focus = anchor.focus ?? DEFAULT_FOCUS;
    const startDeg = anchor.revealStartDeg ?? preset?.revealStartDeg ?? 50;
    const fullDeg = anchor.revealFullDeg ?? preset?.revealFullDeg ?? 25;
    const cosStart = Math.cos(startDeg * DEG);
    const cosFull = Math.cos(fullDeg * DEG);
    const el = spec.svg ?? placeholderPanelSvg(spec.title ?? '');
    const vb = el.viewBox.baseVal;
    const aspect = vb.height / vb.width || 0.625;
    const width = spec.width ?? 0.26;
    const plane = BABYLON.MeshBuilder.CreatePlane('frame-panel', { width, height: width * aspect, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.parent = frame;
    plane.position.set(pos[0], pos[1], pos[2]);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    // Orient ONCE to face the focus point (your head): +Z toward it, tilted to its
    // height. The panel doesn't rotate after this — the frame carries it.
    const dx = focus[0] - pos[0];
    const dy = focus[1] - pos[1];
    const dz = focus[2] - pos[2];
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch, 0);
    const tex = new SvgTexture({
        scene,
        element: el,
        resolution: 384,
        updateInterval: 400, // near-static placeholder
    });
    const mat = new BABYLON.StandardMaterial('frame-panel-mat', scene);
    mat.backFaceCulling = false;
    mat.emissiveTexture = tex.texture;
    mat.opacityTexture = tex.texture;
    mat.diffuseColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    plane.material = mat;
    plane.visibility = 0;
    const head = new BABYLON.Vector3();
    const fwd = new BABYLON.Vector3();
    const toAnchor = new BABYLON.Vector3();
    return {
        update() {
            head.copyFrom(cam.globalPosition);
            cam.getDirectionToRef(XR_FORWARD, fwd);
            plane.getAbsolutePosition().subtractToRef(head, toAnchor);
            plane.visibility = gazeReveal(fwd, toAnchor, cosStart, cosFull);
        },
        dispose() {
            tex.dispose();
            mat.dispose();
            plane.dispose();
        },
    };
}
//# sourceMappingURL=frame-panel.js.map