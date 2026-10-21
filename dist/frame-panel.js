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

Anchor presets are angular (`azimuthDeg` / `elevationDeg` / `distance` from the
eye, in the rig frame): `waist`, `left-shoulder`, `right-shoulder`, `overhead`,
`wrist`, and `system-bar` (which a `<tosi-b3d>` puts under its system bar).

## Using it

The declarative wrapper is [<tosi-b3d-panel>](?b3d-panel.ts), which has the live
demo. Prefer it; this is the imperative version.

`attachFramePanel(scene, camera, frame, spec)` returns `{ mesh, drawn, el,
setSvg, update, dispose, debug }`. In a headset it pins the panel to the frame
and reveals it as you look toward it. Flat, it shows only when asked:
`flatAnchor` (a spot in front of the camera) or `screenAnchor` (pinned to the
screen's edges, placed by [anchor-layout](?anchor-layout.ts)), which is how
system panels work. `setSvg` swaps the content on the same plane without a
blink.

## Which way a panel faces

A plane's visible face is its local −Z, so a panel is aimed by pointing −Z at
the viewer. Aiming +Z shows its back, mirrored. Every panel in the library aims
itself with the same function, so they agree.

## Dialogs are placed in the world

A camera-parented dialog is the obvious implementation and the wrong one. Depth
and collision are XR's window frame: a dialog drawn on top of everything paints
in front of the terrain and cannot be touched, because picking is geometric and
does not care what was drawn last. So a dialog is a thing at a place. It
occludes and is occluded like anything else, and it does not jitter with your
head.

It still follows you. If it has been outside a generous cone of your gaze for a
couple of seconds, it picks a new spot in front of you and eases there. Eased,
never snapped: a dialog that teleports reads as a glitch.

## Dragging a panel

A dragged panel rides a sphere around its anchor. The state is two angles and a
radius, and the radius does not change while you drag.

| | on a sphere | free in space |
| --- | --- | --- |
| distance | **constant** — it cannot be shoved into your face or out of reach | drifts every drag |
| facing | falls out — it always looks back at the centre | needs its own billboard rule |
| what you control | two angles | six degrees of freedom, by accident |
| losing it | bounded by the clamps below | trivial |

**The limits are felt, not hit.** A drag past a limit keeps following your hand
and stiffens (`bandOrbit`, `rubberBand`), and letting go springs back to the
limit (`clampOrbit`). A hard stop mid-drag reads, in a headset, as a dropped
drag. `rubberBand` is `max · (1 - e^(-over/max))`: 1:1 for a small overshoot,
stiffening smoothly, and never past `max` however hard you pull.

**The limits exist because the recovery controls are on the panel.** Elevation
stops short of straight up and well short of straight down
(`ORBIT_MAX_ELEVATION`, `ORBIT_MIN_ELEVATION`), and azimuth stops before the
panel goes behind you (`ORBIT_MAX_AZIMUTH`). Exit VR and Re-seat live in a
panel's header, so a panel behind your shoulder is one whose recovery button you
cannot reach. Straight up is also excluded because azimuth is undefined at the
pole.

## Translucent, and still in order

A panel is a flat plane, and its SVG gives it its shape: rounded corners and
a translucent theme are both the picture's alpha. Babylon does not write a
blended mesh to the depth buffer; it sorts blended meshes by distance each
frame, and panels a centimetre apart can swap as the camera moves. So the
order is never left to that sort. Screen panels in one layer are ranked (each
sits a hair nearer than the ones below it, with `alphaIndex` from the same
rank), and popups use [b3d-svg-plane](/b3d-svg-plane/)'s `transparent="depth"`,
which blends and still writes depth, with the empty corners discarded, so the
z-buffer orders them.

For a plane that should be opaque, `roundedRectGeometry({ width, height,
radius })` cuts the corners as triangles instead (`transparent="off"` with
`cornerRadius` on b3d-svg-plane, and `make.roundedPlane`). It returns
`{ positions, indices, uvs, normals }` in the XY plane facing +Z, centred, like
`MeshBuilder.CreatePlane`, with UVs over the bounding box, so a texture made
for a plain plane lands the same.

## Popups from a panel

A popup inside its panel's SVG is cropped by it: a `select3d` menu squeezed into
the room below the control, a keyboard that refuses to open on a short panel.
On a plane, a panel's popups go on their own surface in front of it instead,
bounded by nothing. Both `panelScene` and the in-scene settings panel use this.
See [popup-surface](?popup-surface.ts).
*/
/*{ "parent": "b3d-panel", "order": 10 }*/
import * as BABYLON from '@babylonjs/core';
import { anchorLayout, anchorLength, } from './anchor-layout.js';
import { SvgTexture } from './svg-texture.js';
import { markUiMesh } from './b3d-utils.js';
import { gazeReveal } from './xr-frames.js';
import { faceViewer } from './dialog-placement.js';
import { panelRim } from './panel-rim.js';
import { orbitFromAim } from './panel-orbit.js';
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1);
const DEG = Math.PI / 180;
const layers = new WeakMap();
/**
 * The scene a `ui` or `modal` panel lives in: a utility layer over `scene`,
 * drawn after it with its own depth and given the pointer first (a press that
 * hits it never reaches the world). Made in pairs, ui before modal, because a
 * newer layer is drawn later and asked first: so modal is over ui.
 */
/** Screen anchors a person has dragged a panel by (see `screenAnchorDragged`). */
const draggedAnchors = new WeakSet();
/**
 * Has a person moved a panel by this anchor (its title bar, flat)? A host that
 * re-anchors its panels leaves those where they were put.
 */
export function screenAnchorDragged(a) {
    return draggedAnchors.has(a);
}
/**
 * How much of the world `c` shows at distance `d` in front of it, in metres,
 * for a view `W` by `H` pixels. An orthographic camera shows the same at
 * every distance (its ortho box; Babylon's default is a pixel a unit), so a
 * panel placed for a perspective one would shrink to a stamp under it.
 */
export function viewSpanAt(c, d, W, H) {
    if (c.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA)
        return {
            w: (c.orthoRight ?? W / 2) - (c.orthoLeft ?? -W / 2),
            h: (c.orthoTop ?? H / 2) - (c.orthoBottom ?? -H / 2),
        };
    const t = 2 * d * Math.tan(c.fov / 2);
    return c.fovMode === BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED
        ? { w: t, h: (t * H) / W }
        : { w: (t * W) / H, h: t };
}
/** Screen panels per drawing scene, bottom first (see "STACKED"). */
const screenStacks = new WeakMap();
/** How much nearer each screen panel is than the one below, as a fraction. */
const STACK_STEP = 0.002;
export function panelLayerScene(scene, layer) {
    let pair = layers.get(scene);
    if (pair == null) {
        const make = () => {
            const u = new BABYLON.UtilityLayerRenderer(scene, true);
            // Moves and releases reach it as well as presses (a drag that leaves
            // the panel must still end on it).
            u.onlyCheckPointerDownEvents = true;
            u.utilityLayerScene.autoClearDepthAndStencil = true;
            return u;
        };
        pair = { ui: make(), modal: make() };
        layers.set(scene, pair);
        layerOfScene.set(pair.ui.utilityLayerScene, 'ui');
        layerOfScene.set(pair.modal.utilityLayerScene, 'modal');
        scene.onDisposeObservable.addOnce(() => {
            pair.ui.dispose();
            pair.modal.dispose();
            layers.delete(scene);
        });
    }
    return pair[layer].utilityLayerScene;
}
const layerOfScene = new WeakMap();
/** World-layer panel planes per scene, for `setPanelsHidden`. */
const worldPanels = new WeakMap();
/**
 * HIDE EVERY PANEL for a frame or two, and put them back: the `ui` and
 * `modal` layers stop drawing, and world-layer panels are disabled (each
 * restored to what it was). For a picture of the scene alone, such as the
 * scene panel's screenshot "scene only". Returns the undo.
 */
export function setPanelsHidden(scene) {
    const pair = layers.get(scene);
    const was = pair
        ? { ui: pair.ui.shouldRender, modal: pair.modal.shouldRender }
        : null;
    if (pair) {
        pair.ui.shouldRender = false;
        pair.modal.shouldRender = false;
    }
    const off = [];
    for (const m of worldPanels.get(scene) ?? []) {
        if (m.isDisposed() || !m.isEnabled(false))
            continue;
        m.setEnabled(false);
        off.push(m);
    }
    return () => {
        if (pair && was) {
            pair.ui.shouldRender = was.ui;
            pair.modal.shouldRender = was.modal;
        }
        for (const m of off)
            if (!m.isDisposed())
                m.setEnabled(true);
    };
}
const claimed = new WeakSet();
/**
 * Did a panel in the scene take this pointer event? For DOM listeners that
 * act on presses "on the background" (closing an overlay): a press on a
 * frame panel is not one. (`defaultPrevented` cannot say: Babylon cancels
 * every press on its canvas.)
 */
export function pointerClaimedByPanel(e) {
    return claimed.has(e);
}
/** Mark a pointer event as taken by a panel in the scene (any in-scene UI
 * that is pressed, not only frame panels: a popup is a `b3dSvgPlane`). */
export function claimPointer(e) {
    if (e != null)
        claimed.add(e);
}
/** Which layer a mesh is in: a popup takes its opener's. */
export function panelLayerOf(mesh) {
    return (mesh && layerOfScene.get(mesh.getScene())) || 'world';
}
/**
 * What a ray hits in the panel LAYERS of `scene`, top first (modal, then ui),
 * or null: for an XR controller ray, which Babylon picks against the world
 * and its own default layer only. Never makes a layer that does not exist.
 */
export function pickPanelLayers(scene, ray) {
    const pair = layers.get(scene);
    if (pair == null)
        return null;
    for (const name of ['modal', 'ui']) {
        const ls = pair[name].utilityLayerScene;
        const pick = ls.pickWithRay(ray, (m) => m.isPickable && m.isEnabled() && m.visibility > 0.5);
        if (pick?.hit)
            return pick;
    }
    return null;
}
// Angular presets measured from the mean-eye point, all at the same comfortable
// distance (≈ the overhead menu's). Placed in the RIG frame so they're stable
// regardless of standing/sitting and don't chase the live head pose.
const PANEL_DISTANCE = 1.4;
const PRESETS = {
    // Not a rig spot: a `<tosi-b3d>` puts a system-bar panel under its system
    // bar. This is only where one lands if mounted as a pin by something else.
    'system-bar': {
        azimuthDeg: 0,
        elevationDeg: 40,
        distance: PANEL_DISTANCE,
    },
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
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '18');
    rect.setAttribute('fill', 'rgba(18,22,31,0.82)');
    svg.appendChild(rect);
    // The outline every panel wears. (It once had no border because a thin
    // stroke aliased at a distance; the shared rim is drawn heavier for that.)
    svg.appendChild(panelRim(w, h, 18));
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
    // Layers apply in a headset too: B3d puts its controller rays' picks in
    // layer order (pickLayersFirst in tosi-b3d).
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
    // `let`: `setSvg` swaps the content into the same plane and texture.
    let el = spec.svg ?? (spec.url ? null : placeholderPanelSvg(spec.title ?? ''));
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
    /*
    A LAYERED PANEL (ui, modal) is drawn in a utility layer's scene, which cannot
    hold a child of this scene's frame nodes. So `plane` stays here, invisible,
    riding its frame and doing every bit of placement as before, and `shown`,
    in the layer, takes its world pose each frame (`sync`).
    */
    const layer = spec.layer ?? 'world';
    const drawScene = layer === 'world' ? scene : panelLayerScene(scene, layer);
    const shown = layer === 'world'
        ? plane
        : BABYLON.MeshBuilder.CreatePlane('frame-panel', {
            width,
            height: width * aspect,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        }, drawScene);
    if (shown === plane) {
        let set = worldPanels.get(scene);
        if (set == null)
            worldPanels.set(scene, (set = new Set()));
        set.add(plane);
        plane.onDisposeObservable.addOnce(() => set.delete(plane));
    }
    if (shown !== plane) {
        plane.isVisible = false;
        plane.isPickable = false;
        shown.rotationQuaternion = new BABYLON.Quaternion();
        markUiMesh(shown);
    }
    const sync = () => {
        if (shown === plane)
            return;
        plane.computeWorldMatrix(true);
        plane
            .getWorldMatrix()
            .decompose(shown.scaling, shown.rotationQuaternion, shown.position);
        shown.visibility = plane.visibility;
    };
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
    // The focused scale, fitted once (see below); cleared on every focus change.
    let fitted = null;
    const fit = () => {
        if (!el || !baseVb)
            return;
        const vb = el.viewBox.baseVal;
        const sx = (vb.width || baseVb.w) / baseVb.w;
        const sy = (vb.height || baseVb.h) / baseVb.h;
        let k = focused ? focusScale * pushed : screenK;
        // Focused, it fits the view (90% of it at its distance) rather than being
        // cropped by it: a monitor sees far less than a headset.
        /*
        ONCE PER FOCUS (and per content size), not per frame. The fit reads
        where the panel sits in the camera's view, and a head is never still:
        refitted every frame, a focused panel in a headset swelled and shrank
        with every small head movement. Tonio: "jiggling in scale in vr".
        */
        const c = (scene.activeCamera ?? cam);
        const fitKey = `${sx}|${sy}|${pushed}`;
        if (focused && fitted != null && fitted.key === fitKey) {
            k = fitted.k;
        }
        else if (focused) {
            /*
            Room either side of its centre, less how far off-centre it sits, IN THE
            CAMERA'S VIEW. It used the panel's position in its frame, which is level
            while a follow camera looks down: the panel then sat lower on screen than
            the sum said, and its bottom (the end of the bag list) went off the edge.
            */
            plane.computeWorldMatrix(true);
            const p = BABYLON.Vector3.TransformCoordinates(plane.getAbsolutePosition(), c.getViewMatrix());
            const d = Math.max(0.01, p.z);
            const eng = scene.getEngine();
            const span = viewSpanAt(c, d, eng.getRenderWidth(), eng.getRenderHeight());
            const halfTall = (span.h / 2) * 0.92;
            const halfWide = (span.w / 2) * 0.92;
            const tall = 2 * Math.max(0.01, halfTall - Math.abs(p.y));
            const wide = 2 * Math.max(0.01, halfWide - Math.abs(p.x));
            const w = width * sx;
            const h = width * aspect * sy;
            k = Math.min(k, tall / h, wide / w);
            fitted = { key: fitKey, k };
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
    /*
    STACKED, so the panel drawn on top is the panel you press (tosijs-3d#115).
    Every screen panel sat at the same distance, and on a tie Babylon draws the
    LATER mesh on top while a pick keeps the FIRST it finds. So where two
    overlapped, presses went to the one underneath. It surfaced as a panel whose
    content was swapped for something taller: reopened, it was the newest and
    drawn over its neighbour, and every row over the neighbour was dead. Each
    screen panel in a layer now sits a hair nearer than the ones below it (its
    size follows the distance, so nothing moves on screen); the newest is on
    top, and a press brings a panel to the front. The pick follows the depth
    and the drawing follows `alphaIndex`, both from the same rank.
    */
    const stackKey = drawScene;
    const stacked = { raise: () => { } };
    if (spec.screenAnchor) {
        let stack = screenStacks.get(stackKey);
        if (stack == null)
            screenStacks.set(stackKey, (stack = []));
        const s = stack;
        s.push(stacked);
        stacked.raise = () => {
            const i = s.indexOf(stacked);
            if (i >= 0 && i < s.length - 1) {
                s.splice(i, 1);
                s.push(stacked);
            }
        };
    }
    const stackRank = () => screenStacks.get(stackKey)?.indexOf(stacked) ?? 0;
    // Where it last went on screen, in CSS pixels, for a drag to start from.
    let lastBox = null;
    const placeScreen = () => {
        const sa = spec.screenAnchor;
        const c = (scene.activeCamera ?? cam);
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!sa || !c || !canvas)
            return;
        const W = canvas.clientWidth || scene.getEngine().getRenderWidth();
        const H = canvas.clientHeight || scene.getEngine().getRenderHeight();
        if (!W || !H)
            return;
        const vmin = Math.min(W, H);
        const px = (v) => typeof v === 'string' && v.endsWith('vmin')
            ? (parseFloat(v) / 100) * vmin
            : v;
        const rank = Math.max(0, stackRank());
        const d = Math.max(sa.distance ?? 1, (c.minZ ?? 0) * 1.25) *
            (1 - Math.min(0.2, STACK_STEP * rank));
        // Drawn in the same order: blended meshes sort by the distance to their
        // CENTRE, which an off-centre panel loses whatever its depth.
        shown.alphaIndex = rank;
        // Metres per pixel at that distance (the same at every distance, for an
        // orthographic camera).
        const perPx = viewSpanAt(c, d, W, H).h / H;
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
        lastBox = { x: b.x, y: b.y, w: b.width, h: b.height, W, H };
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
        fitted = null;
        placeAt(focused ? focusPlace() : anchor);
        fit();
    };
    // A panel the scene places itself (a system-bar panel, under its bar)
    // does not fly front and centre when its content asks to.
    const focusable = spec.focusable !== false;
    if (focusable)
        el?.addEventListener('panelfocus', onFocus);
    // Content already focused before this panel existed (a session change
    // rebuilt it): start where it is. Without this the dock stayed open on a
    // small, unfocused panel, and its tap-to-open did nothing (it was open).
    if (focusable && el?.getAttribute('data-focus') === 'true')
        onFocus(new CustomEvent('panelfocus', { detail: { focus: true } }));
    const tex = el
        ? new SvgTexture({
            scene: drawScene,
            element: el,
            resolution: spec.resolution ?? 384,
            updateInterval: 400,
            // No dark fringe at its rounded corners (see SvgTexture).
            premultiplied: spec.blend !== 'add',
        })
        : new SvgTexture({
            scene: drawScene,
            url: spec.url,
            resolution: spec.resolution ?? 384,
        });
    const mat = new BABYLON.StandardMaterial('frame-panel-mat', drawScene);
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
    else if (el) {
        // Premultiplied blending, SRC + DST(1 - a): not ALPHA_PREMULTIPLIED, whose
        // shader multiplies by alpha again (the texture already has been).
        mat.alphaMode = BABYLON.Constants.ALPHA_SRC_DSTONEMINUSSRCALPHA;
    }
    shown.material = mat;
    plane.visibility = alwaysOn ? 1 : 0;
    // ⚠️ THE GLOW LAYER DOES NOT RESPECT `mesh.visibility` — Babylon's effect-layer code never
    // reads it. And this material is PURE EMISSIVE (black diffuse, lighting off, emissive =
    // the SVG), which is exactly what glow harvests. So a gaze-hidden panel keeps being drawn
    // by the glow pass, BEHIND visibility's back: the reveal computes perfectly and the plate
    // never goes away. It reads as a soft bloom on a monitor (easy to miss) and as a plainly
    // visible floating plaque in a headset. Exclude it — a UI plaque shouldn't bloom anyway.
    excludeFromGlow(drawScene, shown);
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
    let target = el;
    // Ends a gesture in progress on the old content (set by the pointer wiring).
    let endGesture = () => { };
    /*
    DRAGGED BY ITS TITLE BAR, on screen. A screen-anchored panel whose SVG
    says where its grip is (`gripHit`, from `panel3d({ grip })`) moves with the
    pointer, in pixels, and stays on screen. It writes `left`/`top` into the
    spec's own `screenAnchor`, so a host that hands the same object to the
    next build keeps the spot across a rebuild.
    */
    let screenDrag = null;
    const dragScreen = (e) => {
        const sa = spec.screenAnchor;
        if (screenDrag == null || sa == null || lastBox == null || e == null)
            return;
        const { w, W, H } = lastBox;
        // Keep the bar reachable: at least 48px of it on screen, top never above.
        const left = screenDrag.x + (e.clientX - screenDrag.cx);
        const top = screenDrag.y + (e.clientY - screenDrag.cy);
        draggedAnchors.add(sa);
        sa.left = Math.round(Math.max(48 - w, Math.min(W - 48, left)));
        sa.top = Math.round(Math.max(0, Math.min(H - 32, top)));
        sa.right = sa.bottom = undefined;
        sa.anchorX = sa.anchorY = undefined;
        sa.anchor = undefined;
    };
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
    /*
    DRAGGED BY ITS TITLE BAR, in space (a headset, or any panel not pinned to
    the screen): the panel slides over the sphere it sits on, to where the ray
    points. A point along the ray at the sphere's radius, not the ray's
    direction from your eyes, because the ray starts at your hand (the
    settings panel's drag learnt this; `orbitFromAim`). Only for an anchor of
    its own given by angles: a named preset is shared, and an explicit
    `position` is the author's. It writes the anchor's angles, so a host that
    hands the same anchor to the next open keeps the spot.
    */
    const aimable = spec.screenAnchor == null &&
        typeof spec.anchor !== 'string' &&
        anchor.position == null;
    let aimDrag = false;
    // Where the ray pointed when the bar was grabbed, against the anchor: the
    // panel keeps that offset rather than jumping its centre onto the ray.
    let grab = { az: 0, el: 0 };
    const aimOf = (ray) => {
        const inv = new BABYLON.Matrix();
        frame.getWorldMatrix().invertToRef(inv);
        const f = anchor.focus ?? DEFAULT_FOCUS;
        const o = BABYLON.Vector3.TransformCoordinates(ray.origin, inv);
        const d = BABYLON.Vector3.TransformNormal(ray.direction, inv);
        return orbitFromAim({ x: o.x - f[0], y: o.y - f[1], z: o.z - f[2] }, { x: d.x, y: d.y, z: d.z }, {
            azimuthDeg: anchor.azimuthDeg ?? 0,
            elevationDeg: anchor.elevationDeg ?? 0,
            radius: anchor.distance ?? 0.5,
        });
    };
    const aimGrab = (ray) => {
        const a = aimOf(ray);
        grab = {
            az: (anchor.azimuthDeg ?? 0) - a.azimuthDeg,
            el: (anchor.elevationDeg ?? 0) - a.elevationDeg,
        };
    };
    const aimAt = (ray) => {
        const a = aimOf(ray);
        anchor.azimuthDeg = a.azimuthDeg + grab.az;
        anchor.elevationDeg = Math.max(-80, Math.min(80, a.elevationDeg + grab.el));
        placeAt(anchor);
    };
    let pointerObs = null;
    let stopWheel = () => { };
    if (target != null && typeof target.handlePointer === 'function' && el) {
        scene.constantlyUpdateMeshUnderPointer = true;
        const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes;
        let pressing = false;
        let hovering = false;
        endGesture = () => {
            if (pressing || hovering)
                target?.handlePointer?.('leave', 0, 0);
            pressing = false;
            hovering = false;
        };
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
        pointerObs = drawScene.onPointerObservable.add((info) => {
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
            const onPlane = !!pick?.hit && pick.pickedMesh === shown && plane.visibility > 0.5;
            const uv = onPlane && pick ? pick.getTextureCoordinates() : null;
            if (uv) {
                const vb = el.viewBox.baseVal;
                lastX = uv.x * (vb.width || 1);
                lastY = (1 - uv.y) * (vb.height || 1);
            }
            if (screenDrag != null) {
                if (kind === 'move')
                    dragScreen(info.event);
                else if (kind === 'up') {
                    screenDrag = null;
                    releaseCamera();
                }
                return;
            }
            if (aimDrag) {
                if (kind === 'move') {
                    const ray = info.pickInfo?.ray;
                    if (ray != null)
                        aimAt(ray);
                }
                else if (kind === 'up') {
                    aimDrag = false;
                    releaseCamera();
                }
                return;
            }
            if (kind === 'down') {
                if (!uv)
                    return;
                const ev = info.event;
                if (spec.screenAnchor != null &&
                    !focused &&
                    lastBox != null &&
                    ev != null &&
                    target.gripHit?.(lastX, lastY)) {
                    stacked.raise();
                    screenDrag = {
                        cx: ev.clientX,
                        cy: ev.clientY,
                        x: lastBox.x,
                        y: lastBox.y,
                    };
                    holdCamera();
                    ev.preventDefault?.();
                    claimPointer(ev);
                    target.handlePointer('leave', 0, 0);
                    return;
                }
                const pressRay = info.pickInfo?.ray;
                if (aimable &&
                    !focused &&
                    pressRay != null &&
                    target.gripHit?.(lastX, lastY)) {
                    aimGrab(pressRay);
                    aimDrag = true;
                    holdCamera();
                    info.event?.preventDefault?.();
                    claimPointer(info.event);
                    target.handlePointer('leave', 0, 0);
                    return;
                }
                pressing = true;
                stacked.raise();
                holdCamera();
                info.event?.preventDefault?.();
                // …and say so: Babylon cancels every canvas press itself, so being
                // cancelled cannot tell a panel's press from a press on the world.
                claimPointer(info.event);
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
        /*
        THE WHEEL OVER A PANEL IS THE PANEL'S (tosijs-3d#114). The camera's own
        wheel input listens on the canvas, so a wheel over a scrolling list zoomed
        the scene behind it while drag-scroll worked. Caught on the canvas's
        parent in the capture phase, which runs before anything on the canvas
        itself: if the pointer is on this panel (the nearest thing in its layer),
        the panel scrolls, and the camera never sees it. A panel that cannot
        scroll still swallows it: the pointer is plainly on the UI. Trackpad
        two-finger scroll arrives as the same event.
        */
        const canvas = scene.getEngine().getRenderingCanvas();
        const wheelHost = canvas?.parentElement ?? canvas;
        const scrollTarget = () => el;
        const onWheel = (e) => {
            if (canvas == null || plane.visibility <= 0.5)
                return;
            const r = canvas.getBoundingClientRect();
            const pick = drawScene.pick(e.clientX - r.left, e.clientY - r.top);
            if (!pick?.hit || pick.pickedMesh !== shown)
                return;
            e.preventDefault();
            e.stopPropagation();
            const vb = el.viewBox.baseVal;
            // Viewbox units per CSS pixel, where the panel says how big it is drawn.
            const perPx = lastBox != null && lastBox.h > 0 ? (vb.height || 1) / lastBox.h : 1;
            const px = e.deltaMode === 1
                ? e.deltaY * 16
                : e.deltaMode === 2
                    ? e.deltaY * r.height
                    : e.deltaY;
            if (typeof scrollTarget().scrollBy === 'function') {
                scrollTarget().scrollBy(px * perPx);
                repaint(false);
            }
        };
        wheelHost?.addEventListener('wheel', onWheel, {
            capture: true,
            passive: false,
        });
        stopWheel = () => wheelHost?.removeEventListener('wheel', onWheel, { capture: true });
    }
    // Where it goes and how visible, this frame (the layered copy follows in sync).
    const place = (ctx) => {
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
    };
    return {
        debug,
        mesh: plane,
        drawn: shown,
        // Its SVG (null for a `url` panel): send it `panelfocus` to bring the
        // panel front and centre, as the scene's VR toolbar does.
        get el() {
            return el;
        },
        setSvg(next) {
            if (el == null || next === el)
                return;
            endGesture();
            el.removeEventListener('panelfocus', onFocus);
            el = next;
            target = next;
            if (focusable)
                el.addEventListener('panelfocus', onFocus);
            // The texture keeps the old picture until the new one is drawn.
            tex.setElement(next);
        },
        // `ctx.firstPerson` is the active camera view (fpv/cockpit vs chase), so a
        // panel can be limited to one. Defaults to visible if no context is given.
        update(ctx) {
            place(ctx);
            sync();
        },
        toClient(x, y) {
            const canvas = scene.getEngine().getRenderingCanvas();
            const c = scene.activeCamera;
            if (el == null || canvas == null || c == null)
                return null;
            if (plane.visibility <= 0.5)
                return null;
            if (c.getClassName?.() === 'WebXRCamera')
                return null;
            const vb = el.viewBox.baseVal;
            // The plane is built at its first viewBox and grows by scaling, so a
            // viewBox fraction is a fraction of the built plane.
            const u = x / (vb.width || 1);
            const v = y / (vb.height || 1);
            const local = new BABYLON.Vector3((u - 0.5) * width, (0.5 - v) * width * aspect, 0);
            sync();
            shown.computeWorldMatrix(true);
            const world = BABYLON.Vector3.TransformCoordinates(local, shown.getWorldMatrix());
            const e = scene.getEngine();
            const p = BABYLON.Vector3.Project(world, BABYLON.Matrix.IdentityReadOnly, scene.getTransformMatrix(), c.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight()));
            const r = canvas.getBoundingClientRect();
            const k = r.width / (e.getRenderWidth() || 1);
            return { x: r.left + p.x * k, y: r.top + p.y * k };
        },
        dispose() {
            releaseCamera();
            el?.removeEventListener('panelfocus', onFocus);
            if (pointerObs != null)
                drawScene.onPointerObservable.remove(pointerObs);
            stopWheel();
            const stack = screenStacks.get(stackKey);
            if (stack != null) {
                const i = stack.indexOf(stacked);
                if (i >= 0)
                    stack.splice(i, 1);
            }
            tex.dispose();
            mat.dispose();
            if (shown !== plane)
                shown.dispose();
            plane.dispose();
        },
    };
}
//# sourceMappingURL=frame-panel.js.map