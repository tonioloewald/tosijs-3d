/*#
# b3d

The root 3D scene container. All other components (`b3dSun`, `b3dSkybox`, `b3dLoader`, etc.)
must be children of a `b3d` element.

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dSphere, b3dLoader,
  b3dBiped, b3dButton, b3dLight, b3dWater, b3dReflections, b3dCollisions,
  b3dAmbient, gameController, inputFocus, toggle3d, slider3d,
} from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span } = elements

const { demo } = tosi({
  demo: {
    showColliders: false,
    time: 19,
    // Drag this UP to flood the scene and walk your biped under. The fog closes in and the
    // bubbles ramp in with the depth — neither of them switches on at the surface.
    waterLevel: -0.2,
  },
})

const scene = '/test-3.glb'
const omnidude = '/omnidude.glb'

const formatTime = (v) => {
  const h = Math.floor(v)
  const m = Math.round((v % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

preview.append(
  b3d(
    // gamepad: on-screen glass gamepad wired into the input system. XR is on by
    // default — Enter VR drives the same player biped through the unified input
    // spine (XR controllers → bipedMapping), chase-followed by the XR rig.
    {
      glowLayerIntensity: 1,
      gamepad: true,
      scenePanel: () => [
        toggle3d({ label: 'show colliders', value: demo.showColliders }),
        slider3d({ label: 'time of day', value: demo.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'water level', value: demo.waterLevel, min: -1, max: 4, step: 0.1 }),
      ],
    },
    b3dSun({ shadowTextureSize: 2048, activeDistance: 20 }),
    b3dSkybox({ timeOfDay: demo.time, realtimeScale: 100, latitude: 30, moonIntensity: 1.5 }),
    b3dSphere({ meshName: 'ref-sphere', diameter: 1, y: 1, x: -3, z: -3, color: '#aaaaaa' }),
    b3dLoader({ url: scene }),
    inputFocus(
      gameController(),
      b3dBiped({ url: omnidude, x: 5, ry: 135, player: true, cameraType: 'follow', initialState: 'look' }),
    ),
    b3dBiped({ url: omnidude, x: -4, z: 3, ry: 45, initialState: 'idle' }),
    b3dBiped({ url: omnidude, x: 3, z: -2, initialState: 'dance' }),
    b3dLight({ y: 1, z: 0.5, intensity: 0.2, diffuse: '#8080ff' }),
    b3dWater({ y: demo.waterLevel, twoSided: true, waterSize: 1024 }),
    // ABOVE the surface: leaves tumbling on the breeze — two-sided quads that flip and blow,
    // not dust. Raise the water level (scene panel) and they fade as you submerge.
    b3dAmbient({ preset: 'leaves', where: 'above', radius: 10, windX: 1.5 }),
    // BELOW it: plankton hanging in the light (motes) and bubbles rising. Both arrive AS the
    // water does — emission ramps with depth rather than switching on at the plane. The motes
    // are tinted dark green so they read as plankton and DON'T blur together with the bright
    // silvery bubbles.
    b3dAmbient({ preset: 'motes', where: 'underwater', radius: 8, color: '#3c5238' }),
    b3dAmbient({ preset: 'bubbles', where: 'underwater', radius: 8 }),
    b3dReflections(),
    b3dCollisions({ debug: demo.showColliders })
  ),
  div(
    { class: 'debug-panel' },
    span({
      class: 'time-display',
      bind: {
        value: demo.time,
        binding: (el, v) => { el.textContent = formatTime(v) },
      },
    })
  )
)

setInterval(() => {
  const skybox = document.querySelector('tosi-b3d-skybox')
  if (skybox) demo.time.value = skybox.timeOfDay
}, 1000)
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 20px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  z-index: 10;
}
.debug-panel label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.time-display {
  font-family: ui-monospace, monospace;
}
```

## Usage

```javascript
import { b3d, b3dSun, b3dSkybox, b3dLoader, b3dWater } from 'tosijs-3d'

document.body.append(
  b3d(
    { glowLayerIntensity: 1 },
    b3dSun(),
    b3dSkybox({ timeOfDay: 12 }),
    b3dLoader({ url: '/scene.glb' }),
    b3dWater({ y: -0.2 })
  )
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `glowLayerIntensity` | `0` | Glow effect intensity (0 = off) |
| `frameRate` | `30` | Target frame rate |
| `no-xr` | `false` | Suppress the automatic Enter-VR button (WebXR is offered by default when an immersive-vr session is supported) |
| `gamepad` | absent | When present, mount the on-screen glass gamepad wired into the input system. Bare/`true` = full layout; a value like `"a,b,left_stick"` selects controls |
| `gamepadScale` | `1` | Scale factor for the glass gamepad clusters |
| `minElevation` / `maxElevation` | `5` / `70` | Default orbit-camera elevation limits (degrees above the horizon) |
| `minDistance` / `maxDistance` | `2` / `50` | Default orbit-camera zoom limits |
*/
/*{ "parent": "Core" }*/
import { Component, elements, updates } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { GridMaterial } from '@babylonjs/materials';
import '@babylonjs/loaders';
import { xrControllers } from './gamepad';
import { panel3d, button3d, iconBar3d, label3d, textBlock3d, } from './widgets3d';
import { SvgTexture } from './svg-texture';
import { svgIcons } from './svg-icons';
import { CombatWorld } from './destroyable';
import { b3dGamepad } from './glass-gamepad';
import { XrGamepadSource } from './xr-gamepad';
import { XrFrames, EntityFrame } from './xr-frames';
import { attachFramePanel, placeholderPanelSvg, } from './frame-panel';
import { runProbe, hydrateProfileFromCache } from './b3d-probe';
import { compositeFog, approachFog, } from './atmosphere';
import { setQuality, qualityBudgets, onQualityChange, effectiveTier, } from './b3d-quality';
import { allocateAmbient, ratchetPool, } from './ambient-budget';
const { canvas, div, slot, button } = elements;
// Site-wide opt-in for the 📊 perf overlay: a host (the doc site) calls
// `showB3dStats()` once so the toggle appears on EVERY scene without a per-scene
// attribute or a URL flag. Library consumers leave it off — their scenes stay
// uncluttered unless they set `stats` or add `#perf`.
let _statsGlobal = false;
export const showB3dStats = (on = true) => {
    _statsGlobal = on;
};
// Whether the 📊 toggle should be revealed on a given scene. True when the host
// enabled it site-wide, OR `#perf` / `#debug` (or the `?perf` / `?debug` query
// form) is in the page URL — so it's reachable on a device with no console (the
// whole reason this exists). The HASH form is preferred: it survives the
// doc-browser's client-side navigation (a query string can be dropped when the
// SPA rewrites the URL between docs) and never hits the server. Guarded for
// non-browser contexts (SSR/tests).
const perfDebugEnabled = () => {
    if (_statsGlobal)
        return true;
    if (typeof window === 'undefined' || !window.location)
        return false;
    const { search, hash } = window.location;
    return /(^|[?&])(perf|debug)\b/.test(search) || /\b(perf|debug)\b/.test(hash);
};
const noop = () => { };
const noopRefresh = () => { };
// Read-only local axes reused by the per-frame XR loops (getDirectionToRef
// reads but never mutates them), so we never allocate a Vector3 per frame.
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1);
const XR_RIGHT = new BABYLON.Vector3(1, 0, 0);
export class B3d extends Component {
    static initAttributes = {
        glowLayerIntensity: 0,
        frameRate: 30,
        // Default orbit-camera limits (only used when no camera is supplied). They
        // stop the two constant annoyances: zooming out into orbit / in through the
        // scene, and dropping the camera under the ground. Override by providing your
        // own camera in `sceneCreated`, or tune these attributes.
        minElevation: 5, // degrees above the horizon (keeps the camera above ground)
        maxElevation: 70, // degrees (keeps it from going straight overhead)
        minDistance: 2, // closest zoom
        maxDistance: 50, // farthest zoom
        // WebXR is offered by default whenever the device/browser supports an
        // immersive-vr session: a floating "Enter VR" button appears over the
        // scene. Set the `no-xr` attribute to suppress it (e.g. demos that drive
        // XR themselves through a controllable's `cameraType: 'xr'`).
        noXr: false,
        // The subtle reference grid on the floor during an immersive session (a
        // locomotion/motion cue). `"auto"` (default) shows it for the built-in
        // free-fly XR rig, but hides it when a player entity drives the rig (a
        // focused biped/car/aircraft — its own "non-default rig") or when you supply
        // your own `setupXr` (this grid only exists in the default experience).
        // `"on"` always shows it; `"off"` always hides it.
        xrGrid: 'auto',
        // Show the head-locked face crosshair (a pin target for aim-tracking UX). Opt-in:
        // 'off' (default) keeps it out of the way; 'on' shows it (e.g. a tracking weapon).
        xrReticle: 'off',
        // Start with the ⚙ scene-settings panel open (instead of collapsed to the gear).
        scenePanelOpen: false,
        // When present, mount the split on-screen "glass" gamepad and feed it into
        // the active input system (the unified touch control surface). The value
        // selects/positions controls, e.g. `gamepad="a,b,right_stick(40,0),menu"`;
        // an empty value shows the full default layout. Absent → no gamepad.
        gamepad: false,
        // Scale factor for the glass gamepad clusters. Touch-target pixel sizes vary
        // wildly across devices, so this is exposed for tuning per scene/device.
        gamepadScale: 1,
        // Device quality: 'auto' follows the measured/cached device profile (and, if
        // none exists, runs the probe in the background for next time); 'low' |
        // 'medium' | 'high' force a tier. Drives the `auto` defaults of shadows,
        // reflections, terrain, and the engine render scaling. See b3d-quality.
        quality: 'auto',
        // Add a "Perf stats" section to the scene panel (the ⚙ gear overlay AND the
        // in-VR panel — so it's reachable in a headset). Opt-in per scene; a global
        // `#perf` / `#debug` (or `?perf` / `?debug`) in the page URL, or a host calling
        // `showB3dStats()`, reveals it on every scene (handy on mobile, no console
        // needed). Shows `debugState` plus a one-tap hardware-scaling probe. Default off.
        stats: false,
    };
    static styleSpec = {
        ':host': {
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
            background: '#000',
            height: '100%',
            maxHeight: '100vh',
        },
        ':host .spinner': {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '48px',
            height: '48px',
            marginTop: '-24px',
            marginLeft: '-24px',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'tosi-spin 0.8s linear infinite',
            transition: 'opacity 0.3s ease-out',
        },
        ':host .spinner.hidden': {
            opacity: '0',
            pointerEvents: 'none',
        },
        '@keyframes tosi-spin': {
            to: { transform: 'rotate(360deg)' },
        },
        ':host canvas': {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            opacity: '0',
            transition: 'opacity 0.5s ease-in',
        },
        ':host canvas.ready': {
            opacity: '1',
        },
        ':host .babylonVRicon': {
            height: 50,
            width: 80,
            backgroundColor: 'transparent',
            filter: 'drop-shadow(0 0 4px #000c)',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 'none',
            borderRadius: 5,
            borderStyle: 'none',
            outline: 'none',
            transition: 'transform 0.125s ease-out',
        },
        ':host .babylonVRicon:hover': {
            transform: 'scale(1.1)',
        },
        // Top-LEFT lozenge: one rounded pill holding the two icon buttons (scene
        // settings + Enter VR) side by side. Demos pin text overlays top-right, so the
        // left keeps this clear of them. Hidden until at least one button is relevant
        // (`:has`) so it never flashes as an empty pill while the scene loads. Icon
        // size is themed via the shared --tosi-icon-size var.
        ':host .scene-lozenge': {
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: '20',
            // Visible by default so the toolbar works everywhere (a browser without
            // :has() — e.g. older Firefox — must NOT lose it).
            display: 'inline-flex',
            alignItems: 'stretch',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            overflow: 'hidden',
            '--tosi-icon-size': '20px',
        },
        // Progressive enhancement: where :has() is supported, hide the pill entirely
        // while it holds no visible button (no empty-pill flash on load). Where it
        // isn't, this selector is invalid and dropped — the lozenge stays visible.
        ':host .scene-lozenge:not(:has(.lozenge-button:not([hidden])))': {
            display: 'none',
        },
        // Height-uniform, width sizes to content (with a square floor + side padding)
        // so a non-square icon like the 40×24 xrColor mark gets horizontal room
        // instead of being cramped in a fixed square.
        ':host .lozenge-button': {
            minWidth: '40px',
            height: '40px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            transition: 'background 0.15s',
        },
        ':host .lozenge-button:hover': {
            background: 'rgba(255,255,255,0.15)',
        },
        ':host .lozenge-button[hidden]': {
            display: 'none',
        },
        // A hairline divider only between two VISIBLE buttons (so a lone button reads
        // as a clean single-icon pill).
        ':host .lozenge-button:not([hidden]) + .lozenge-button:not([hidden])': {
            borderLeft: '1px solid rgba(255,255,255,0.2)',
        },
        // Buttons are disabled (dimmed, inert) until the scene has loaded.
        ':host .lozenge-button:disabled': {
            opacity: '0.4',
            cursor: 'default',
            pointerEvents: 'none',
        },
        ':host .scene-panel-overlay': {
            position: 'absolute',
            top: '60px',
            left: '12px',
            zIndex: '20',
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
        },
        ':host .scene-panel-overlay[hidden]': {
            display: 'none',
        },
        // Close (×) button pinned to the panel's top-right corner.
        ':host .scene-panel-close': {
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: '1',
            width: '26px',
            height: '26px',
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '17px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
        },
        ':host .scene-panel-close:hover': {
            background: 'rgba(0,0,0,0.85)',
        },
    };
    content = [
        div({ class: 'spinner', part: 'spinner' }),
        canvas({ part: 'canvas' }),
        // Top-left lozenge holding two icon buttons side by side: scene settings
        // (opens the panel) and Enter VR (the purpose-built xrColor mark) — so VR
        // availability is obvious and Enter VR is never a panel row that could
        // scroll/clip. Each button reveals itself when relevant; the lozenge stays
        // hidden until then. (Both live in the template — appending to the shadow
        // root later doesn't persist.)
        div({ class: 'scene-lozenge', part: 'sceneToolbar' }, button({
            class: 'lozenge-button',
            part: 'scenePanelGear',
            type: 'button',
            title: 'Scene settings',
            hidden: true,
            // Disabled until the scene finishes loading (reveal() enables it).
            disabled: true,
        }, svgIcons.settings()), button({
            class: 'lozenge-button',
            part: 'enterVrButton',
            type: 'button',
            hidden: true,
            // Disabled until the scene finishes loading (reveal() enables it).
            disabled: true,
            title: 'Enter VR',
        }, svgIcons.xrColor())),
        div({ class: 'scene-panel-overlay', part: 'scenePanelHost', hidden: true }),
        slot(),
    ];
    engine;
    scene;
    camera;
    gui;
    glowLayer;
    xrHelper;
    xrActive = false;
    // The scene the pointer last entered / pressed — so that when a page hosts several
    // live demos, global keyboard/gamepad input only drives the one you're interacting
    // with (see `hasInputFocus`). Null until the first interaction (then everything is
    // "focused", i.e. a lone demo just works).
    static _active = null;
    /** True when this scene should consume shared keyboard/gamepad input — it's the
     * active (last hovered/clicked) scene, or none has been touched yet. Controllables
     * gate their input on this so one gamepad doesn't drive every demo on a page. */
    get hasInputFocus() {
        return B3d._active === null || B3d._active === this;
    }
    /** Make this the input-focused scene (also happens on pointerenter/pointerdown). */
    takeInputFocus() {
        B3d._active = this;
    }
    /** Reference frames (world/rig/body/neck/face) for spatial UI, live only while
     * an XR session is running. Parent in-scene UI to `xrFrames.body` etc. */
    xrFrames = null;
    BABYLON = BABYLON;
    sceneCreated = noop;
    update = noop;
    // Override the default WebXR setup entirely. When set (not noop) it runs
    // instead of the built-in Enter-VR button — call it to wire your own XR
    // experience (e.g. custom features, teleportation, controller models).
    setupXr = noop;
    // A dual-presence settings panel. Return the widgets to show; the SAME
    // definitions drive a DOM-overlay panel (toggled by a top-right gear icon on
    // flat screens) AND an in-scene panel floating above the viewer in XR. In XR
    // an "Exit VR" button is prepended automatically (you can't click a DOM
    // button inside a headset). Both surfaces bind to the same reactive values,
    // so they stay in sync. Defaults to a function (not undefined) so the element
    // creator recognises it as a settable callback prop, like sceneCreated/update.
    scenePanel = () => [];
    // Body-anchored XR panels for the embodied player: pinned to a reference frame
    // (default `body`) and revealed by looking toward them. Defaults to placeholder
    // inventory panels over each shoulder and a quick-access/holster panel at the
    // waist; override to supply your own (positions, presets, custom SVG). Like
    // scenePanel, defaults to a function so the element creator treats it as a prop.
    bodyPanels = (host) => {
        // Declarative <tosi-b3d-panel> children, if any, take over entirely — so a
        // scene tunes its own panels. Otherwise fall back to the default set.
        const declared = Array.from(host.querySelectorAll('tosi-b3d-panel'))
            .map((el) => el.toSpec?.())
            .filter((s) => s != null);
        if (declared.length)
            return declared;
        // Anchored in the EYE frame (your head position, rig yaw) at angular offsets,
        // so they ride your real eye through chase head-compensation and stay put as
        // you stand/sit or glance — only swinging when you actually turn.
        const panels = [
            { frame: 'eye', anchor: 'left-shoulder', title: 'Inventory' },
            { frame: 'eye', anchor: 'right-shoulder', title: 'Inventory' },
            { frame: 'eye', anchor: 'waist', title: 'Quick Access' },
            { frame: 'left-hand', anchor: 'wrist', title: 'Menu', width: 0.09 },
        ];
        // The face crosshair is a PIN TARGET for aim-tracking UX — not something that
        // belongs on screen everywhere (no more than the quick-access bar does). Opt in
        // with `xr-reticle="on"` (e.g. when a weapon tracks it); default hides it.
        if (this.xrReticle === 'on') {
            panels.push({
                frame: 'face',
                anchor: { position: [0, 0, 2], focus: [0, 0, 0] },
                reveal: 'always',
                blend: 'add',
                view: 'first', // crosshair only when looking through your own eyes
                url: '/reticle.svg',
                width: 0.24,
            });
        }
        return panels;
    };
    lastRender = 0;
    sceneListeners = [];
    pastAdditions = [];
    _sceneReady = false;
    // Pull-model readiness: B3dChild components call whenReady() from their own
    // connectedCallback to insert themselves once the scene is up. Runs the callback
    // immediately if the scene is already ready, else queues it for the flush below.
    _readyQueue = [];
    _libraries = new Map();
    /** Run `cb` when the scene is ready — now if it already is, else on scene-ready. */
    whenReady(cb) {
        if (this._sceneReady)
            cb();
        else
            this._readyQueue.push(cb);
    }
    addSceneListener(callback) {
        this.sceneListeners.push(callback);
        for (const additions of this.pastAdditions) {
            callback(additions);
        }
    }
    removeSceneListener(callback) {
        const idx = this.sceneListeners.indexOf(callback);
        if (idx > -1) {
            this.sceneListeners.splice(idx, 1);
        }
    }
    register(additions) {
        this.pastAdditions.push(additions);
        for (const callback of this.sceneListeners) {
            callback(additions);
        }
    }
    // --- Floating origin: keeping the whole world shiftable, not just the player ---
    //
    // When the terrain rebases (see B3dTerrain.resetOrigin) the world is moved so the
    // viewpoint returns near the origin. EVERYTHING that carries a world position must
    // move by the same amount or it drifts relative to the terrain. Two ways in:
    //
    //  - registerWorldRoot(node): the entity's world position lives ENTIRELY on the
    //    node (inert targets, props, other vehicles). We move the node.
    //  - addOriginListener(cb): the entity also holds world coordinates in JS (a
    //    projectile integrating its own position, remembered target positions, AI
    //    memory). It gets (dx, dz) and fixes ITSELF — node AND JS state. Such an
    //    entity must NOT also registerWorldRoot (that would shift its node twice).
    _worldRoots = new Set();
    _originShiftListeners = [];
    // Everything detectable on radar this scene (targets, the player's own missiles,
    // waypoints). A radar platform — the aircraft HUD — enumerates these each frame.
    // Blips self-register (b3d-radar-blip on connect; spawnProjectile for a missile)
    // and unregister on dispose. Position is pulled live, so movers just work.
    _radarBlips = new Set();
    // The scene's combat state (pure, deterministic; see destroyable.ts). Combat
    // components (b3d-destroyable/warhead/launcher) find it via findB3dOwner and
    // share it; the render loop advances it (regen + chain reactions) each frame.
    combat = new CombatWorld();
    // Whether the flat gear panel's click handler is wired (idempotent setup).
    _scenePanelWired = false;
    // NPC nameplates, live in flat AND XR. Keyed by biped element; a cached list is
    // iterated per frame (no per-frame allocation), and a throttled scan adds/removes
    // as bipeds' GLBs load or leave.
    _nameplates = new Map();
    _nameplateList = [];
    _nameplateScan = 0;
    registerWorldRoot(node) {
        this._worldRoots.add(node);
    }
    unregisterWorldRoot(node) {
        this._worldRoots.delete(node);
    }
    addOriginListener(callback) {
        this._originShiftListeners.push(callback);
    }
    removeOriginListener(callback) {
        const idx = this._originShiftListeners.indexOf(callback);
        if (idx > -1)
            this._originShiftListeners.splice(idx, 1);
    }
    registerRadarBlip(blip) {
        this._radarBlips.add(blip);
    }
    unregisterRadarBlip(blip) {
        this._radarBlips.delete(blip);
    }
    /** Every radar-detectable blip in the scene (targets, own missiles, waypoints). */
    get radarBlips() {
        return this._radarBlips;
    }
    /**
     * Move every world-space thing by (-dx, -dz) so the viewpoint returns near the
     * origin with no visible motion. Called by the terrain AFTER it has rebased its
     * own tiles by (dx, dz). Shifts: the camera CARRIER (the piloted entity if one is
     * driven — the chase rig re-derives from it each frame, so shifting the rig would
     * be overwritten; else the camera's parent; else the camera), every registered
     * world root, and every addOriginListener listener (which fixes its own node + JS).
     * Skybox/water are viewer/origin-centred and intentionally NOT shifted.
     */
    shiftOrigin(dx, dz) {
        if (dx === 0 && dz === 0)
            return;
        const shifted = new Set();
        const move = (node) => {
            if (node == null || shifted.has(node))
                return;
            node.position.x -= dx;
            node.position.z -= dz;
            shifted.add(node);
        };
        const camera = this.scene?.activeCamera;
        const focused = this.querySelector('tosi-b3d-input-focus')?.focused;
        const piloted = focused?.getCameraTarget?.() ?? null;
        const carrier = piloted ?? camera?.parent ?? camera;
        move(carrier);
        for (const root of this._worldRoots)
            move(root);
        for (const cb of this._originShiftListeners)
            cb(dx, dz);
    }
    registerLibrary(type, library) {
        if (!this._libraries.has(type)) {
            this._libraries.set(type, new Set());
        }
        this._libraries.get(type).add(library);
        this.dispatchEvent(new CustomEvent('library-changed', { detail: { type, library } }));
    }
    unregisterLibrary(type, library) {
        const set = this._libraries.get(type);
        if (set) {
            set.delete(library);
            if (set.size === 0)
                this._libraries.delete(type);
        }
        this.dispatchEvent(new CustomEvent('library-changed', { detail: { type, library } }));
    }
    getLibrary(type) {
        const set = this._libraries.get(type);
        if (!set || set.size === 0)
            return null;
        return set.values().next().value;
    }
    getLibraries(type) {
        const set = this._libraries.get(type);
        return set ? [...set] : [];
    }
    setActiveCamera(camera, options = {}) {
        const { attach = true, preventDefault = false } = options;
        const cnv = this.parts.canvas;
        if (this.camera != null) {
            this.camera.detachControl();
        }
        this.camera = camera;
        this.scene.activeCamera = camera;
        if (attach) {
            camera.attachControl(cnv, preventDefault);
        }
    }
    /**
     * Switch the **gameplay viewpoint** — chase↔cockpit, a death spectator orbit, climbing into a
     * vehicle. This is the ONE sanctioned way to change what the player looks through, and the ONE
     * place that knows the XR rule:
     *
     * > **In an XR session the WebXR camera OWNS the view. Never swap `scene.activeCamera` — that
     * > steals it from the headset and blanks the display.** Instead the piloted entity moves the
     * > XR *rig* (it parents the rig to itself), so the head rides along.
     *
     * So: flat → swap to `camera` (returns `true`); XR → **no-op on the camera** (returns `false`,
     * so the caller can skip building a flat-only camera and let the rig handle the view). Every
     * gameplay camera change must route through here rather than `setActiveCamera` /
     * `scene.activeCamera` directly — that's what stops "it breaks in VR" from recurring
     * (it bit the chase camera, then the death orbit; centralising the rule is the fix).
     */
    setGameplayCamera(camera, options = {}) {
        if (this.xrActive)
            return false;
        this.setActiveCamera(camera, options);
        return true;
    }
    _update = () => {
        if (this.scene != null && !this.hidden) {
            // Advance combat with real elapsed time (regen + scheduled chain reactions),
            // frame-rate independent and separate from the render throttle below.
            const dt = this.engine.getDeltaTime() / 1000;
            if (dt > 0)
                this.combat.tick(dt);
            if (dt > 0)
                this._updateFog(dt);
            this._ambientWatchdog();
            if (this.update !== noop) {
                this.update(this, BABYLON);
            }
            const now = Date.now();
            if (this.xrActive ||
                now - this.lastRender >= 1000 / this.frameRate) {
                this.lastRender = now;
                if (this.scene.activeCamera !== undefined) {
                    this.scene.render();
                }
            }
        }
    };
    _resizing = false;
    // How many times onResize has driven engine.resize(). A steady climb every
    // frame (rather than a couple of firings that settle) is the fingerprint of a
    // resize→reflow→resize feedback loop — surfaced in `debugState` / the 📊 overlay.
    _resizeCount = 0;
    onResize() {
        if (this.engine && !this._resizing) {
            this._resizing = true;
            this.engine.resize();
            this._resizeCount++;
            this._resizing = false;
        }
    }
    // A cheap, allocation-light snapshot of the render pipeline's live state —
    // handy from the console, haltija, or the 📊 stats overlay (no devtools needed
    // on mobile). Reports the actual backbuffer vs CSS size (is DPR inflating it?),
    // the current hardware-scaling level and quality tier, live FPS, and the resize
    // count (loop detector). Returns nulls before the engine exists.
    get debugState() {
        const e = this.engine;
        return {
            renderWidth: e ? e.getRenderWidth() : null,
            renderHeight: e ? e.getRenderHeight() : null,
            cssWidth: this.clientWidth,
            cssHeight: this.clientHeight,
            devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
            hardwareScaling: e ? e.getHardwareScalingLevel() : null,
            tier: effectiveTier({ xr: this.xrActive }),
            fps: e ? Math.round(e.getFps()) : null,
            resizeCount: this._resizeCount,
            xrActive: this.xrActive,
        };
    }
    loadScene = async (path, file, processCallback) => {
        BABYLON.SceneLoader.Append(path, file, this.scene, processCallback);
    };
    // (Component insert/dispose is pull-model: each B3dChild self-registers via
    // whenReady() on connect and self-disposes on disconnect — b3d no longer pushes
    // sceneReady/sceneDispose or watches the subtree.)
    _qualityOff = null;
    static _probeStarted = false;
    // Seed the device quality profile and apply render scaling. Explicit `quality`
    // wins; otherwise hydrate a cached profile synchronously so children build with
    // the right budgets, and — if there's no cache and no probe on the page — run one
    // in the background (this scene uses the safe default until it caches for next
    // time). Render scaling (hardware scaling) is the one lever cheap to re-apply
    // live, so it tracks quality/XR changes.
    _setupQuality() {
        const q = this.quality;
        if (q && q !== 'auto')
            setQuality(q);
        // Seed synchronously from cache so children build with the right budgets now.
        const hydrated = q !== 'auto' || hydrateProfileFromCache();
        // If there's nothing cached, measure — DOM-free (runProbe mounts no element,
        // so it can't trip live-reload/doc observers) and DEFERRED (its throwaway
        // engine shouldn't share this scene's setup frame). This scene uses the safe
        // default until the probe caches for next time.
        if (q === 'auto' && !hydrated && !B3d._probeStarted) {
            B3d._probeStarted = true;
            setTimeout(() => {
                runProbe().catch(() => {
                    /* probing is best-effort — never let it break the host scene */
                });
            }, 0);
        }
        this._applyHardwareScaling(this.xrActive);
        this._qualityOff = onQualityChange(() => {
            this._applyHardwareScaling(this.xrActive);
            this._reallocAmbient(); // a new tier is a new pool
        });
    }
    _applyHardwareScaling(xr) {
        if (this.engine == null)
            return;
        this.engine.setHardwareScalingLevel(qualityBudgets({ xr }).hardwareScaling);
    }
    // ─── Ambient budget ───────────────────────────────────────────────────────
    // Ambient effects (rain, motes, bubbles — and one day footprints and bullet holes) are
    // GARNISH: they compete for one shared pool, and an effect that can't be given its honest
    // minimum switches OFF rather than thinning into a lie. The maths is pure and lives in
    // `ambient-budget.ts`; B3d just owns the registry, the pool, and the watchdog.
    _ambient = [];
    /** Shrunk by the watchdog, never grown. See `ratchetPool` — and TODO: reclaiming budget in
     * quiet moments is a real want, but it must be a damped, deliberate thing, not a rebound. */
    _ambientPoolScale = 1;
    _ambientSampleMs = 0;
    _ambientBadSamples = 0;
    _ambientCooldownMs = 0;
    /** Don't judge the frame rate until the scene has settled — see `_ambientWatchdog`. */
    _ambientWarmupMs = 10000;
    /** An ambient effect joins the scene's pool. Returns its unregister. */
    registerAmbient(effect) {
        if (this._ambient.length === 0) {
            // Readable IN the headset — the only place the watchdog's damage is visible. `pool` < 1
            // means the ratchet has fired and garnish has been permanently shed this session.
            this.addDebugSource({
                name: 'Ambient',
                lines: () => [
                    `pool=${this._ambientPoolScale.toFixed(2)} warmup=${Math.max(0, Math.round(this._ambientWarmupMs / 1000))}s bad=${this._ambientBadSamples}`,
                    ...this._ambient.map((a) => {
                        const r = a.budgetRequest();
                        const s = a;
                        // got but live=0 ⇒ built, not rendering. live>0 but you see nothing ⇒ a LOOK
                        // problem (too small/sparse/faint), not a plumbing one.
                        return `${s.preset} got=${s.granted}/${r.desired} live=${s.active} i=${s.intensity.toFixed(2)}`;
                    }),
                ],
            });
        }
        this._ambient.push(effect);
        this._reallocAmbient();
        return () => {
            const i = this._ambient.indexOf(effect);
            if (i < 0)
                return;
            this._ambient.splice(i, 1);
            this._reallocAmbient(); // its budget goes back to the survivors
        };
    }
    /** Divide the pool and tell everyone what they got (0 = switch off). */
    _reallocAmbient() {
        if (this._ambient.length === 0)
            return;
        const xr = this.xrActive;
        const pool = qualityBudgets({ xr }).ambientParticles * this._ambientPoolScale;
        const alloc = allocateAmbient(this._ambient.map((a) => a.budgetRequest()), { pool, tier: effectiveTier({ xr }) });
        for (const a of this._ambient) {
            a.applyAllocation(alloc[a.budgetRequest().id] ?? 0);
        }
    }
    /**
     * Garnish is the first thing to go. If the frame stays under target we shrink the ambient
     * pool — effects that fall below their honest minimum switch themselves off.
     *
     * This needs NO cost attribution, which is the point: we can't measure what the rain costs
     * (Babylon has no per-system counter, and the real cost is GPU fill), but we don't have to.
     * We only need to know that ambient is the cheapest thing in the scene to give up.
     */
    _ambientWatchdog() {
        if (this._ambient.length === 0 || this._ambientPoolScale <= 0)
            return;
        if (this.engine == null)
            return;
        const dt = this.engine.getDeltaTime();
        // WARM UP before judging. The frame rate right after load — and right after XR entry — is
        // garbage for reasons that have nothing to do with ambient: shaders compiling, textures
        // uploading, GLBs landing. Judged during that, a ONE-WAY ratchet would shed the garnish
        // for the whole session over a hitch that was already over. Grace period first.
        if (this._ambientWarmupMs > 0) {
            this._ambientWarmupMs -= dt;
            this._ambientBadSamples = 0;
            return;
        }
        if (this._ambientCooldownMs > 0) {
            this._ambientCooldownMs -= dt;
            return;
        }
        this._ambientSampleMs += dt;
        if (this._ambientSampleMs < 1000)
            return;
        this._ambientSampleMs = 0;
        // 0.75, not 0.85: shedding is IRREVERSIBLE, so the bar to do it has to be a frame rate
        // that's actually bad, not one that's merely short of ideal. A headset running 68 of a
        // nominal 72 is fine; it is not a reason to delete the weather for the rest of the session.
        const target = this.xrActive ? 72 : 60;
        const fps = this.engine.getFps();
        if (Number.isFinite(fps) && fps > 0 && fps < target * 0.75) {
            this._ambientBadSamples++;
        }
        else {
            this._ambientBadSamples = 0; // it must be SUSTAINED — one bad second is a hitch, not a trend
        }
        if (this._ambientBadSamples < 6)
            return; // ~6s of genuinely bad frames, not 3
        this._ambientBadSamples = 0;
        this._ambientCooldownMs = 5000; // let the frame settle before judging again
        this._ambientPoolScale = ratchetPool(this._ambientPoolScale);
        this._reallocAmbient();
    }
    _statsBaseScale = null;
    // Which debug tools (Perf Stats + registered sources) are expanded, by id. Empty
    // by default — the panel opens with the debug data collapsed to its icon bar, so
    // a demo's own controls aren't buried under diagnostics you didn't ask to see.
    _debugOpen = new Set();
    _debugSources = [];
    _liveDebug = {
        flat: [],
        xr: [],
    };
    _liveDebugTimer = null;
    /** Set while an XR panel exists; rewrites its contents in place so debug numbers stay
     * live in the headset. No-op flat (the flat panel rebuilds on open). */
    _refreshXrPanel = noopRefresh;
    /**
     * Write into the **Perf Stats panel** — the only debug readout that exists BOTH as a
     * flat overlay and as a floating panel inside a headset. There is no console in VR, so
     * without this a profiler's numbers are unreadable on the one device whose budget is
     * tightest.
     *
     * Any code can contribute: a scene child, a demo, an ad-hoc investigation. `lines()` is
     * re-called on every panel refresh, so return live values, not a snapshot. `actions`
     * become buttons — which is how you turn a profiler ON from inside a headset.
     *
     * Returns an unregister function.
     *
     * ```js
     * const off = b3d.addDebugSource({
     *   name: 'terrain',
     *   lines: () => [`worst ${t.debugState.worstFrameMs.toFixed(1)}ms`],
     *   actions: [{ label: () => (t.profiling ? 'Profiling ON' : 'Profile'), onClick: () => t.setProfiling(!t.profiling) }],
     * })
     * ```
     */
    // --- Atmosphere: fog is ALWAYS ON, and systems lean on it (see atmosphere.ts) ---
    //
    // Nothing may switch `fogMode` at runtime: it's a shader DEFINE, so toggling it recompiles
    // every material — that hitch is most of the "thunk" you feel crossing the water's surface.
    // The mode is set once; contributors modulate only the UNIFORMS (colour, density, start,
    // end), their weights ramp over a band rather than flipping at a boundary, and the result
    // is temporally smoothed.
    _fogLayers = [];
    _fogBase = null;
    _fogNow = null;
    /**
     * Contribute a fog layer — underwater, inside a cloud, out in space. Return `null` (or
     * `weight: 0`) when you're not contributing. Returns an unregister function.
     *
     * `b3d-fog` sets the BASE (and the mode, once). Everyone else leans on it.
     */
    addFogLayer(layer) {
        this._fogLayers.push(layer);
        return () => {
            const i = this._fogLayers.indexOf(layer);
            if (i >= 0)
                this._fogLayers.splice(i, 1);
        };
    }
    /** The fog everything else blends FROM. `b3d-fog` owns this; without one we still keep a
     * whisper of fog on, so a layer can ramp up without ever switching the mode. */
    setFogBase(base) {
        this._fogBase = base;
        // Clearing the base (the <tosi-b3d-fog> was removed) must also drop the cached current fog,
        // or `_updateFog`'s "no base + live layers → auto-enable" branch can never re-fire and
        // underwater/cloud fog stays dead for the rest of the scene's life.
        if (base == null) {
            this._fogNow = null;
            return;
        }
        if (this._fogNow == null) {
            this._fogNow = {
                color: { ...base.color },
                density: base.density,
                start: base.start,
                end: base.end,
            };
        }
    }
    _updateFog(dt) {
        const scene = this.scene;
        if (scene == null)
            return;
        // No <tosi-b3d-fog> in the scene? Fog is STILL on, at a whisper — because a layer
        // (underwater, cloud) must be able to ramp up without ever switching fogMode, which
        // would recompile every shader. "Always on to some extent" is the whole trick.
        if (this._fogBase == null && this._fogLayers.length > 0) {
            scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
            this.setFogBase({
                color: {
                    r: scene.fogColor.r,
                    g: scene.fogColor.g,
                    b: scene.fogColor.b,
                },
                density: 0.00001,
                start: scene.fogStart,
                end: scene.fogEnd,
            });
        }
        const base = this._fogBase;
        if (base == null || this._fogNow == null)
            return;
        const layers = [];
        for (const fn of this._fogLayers) {
            const l = fn();
            if (l != null && l.weight > 0)
                layers.push(l);
        }
        const target = compositeFog(base, layers);
        // A SHORT time constant. This exists to stop a hard pop (and to absorb a layer whose
        // weight jumps — a cloud recycling behind you, a camera teleporting), NOT to make
        // transitions leisurely. Crossing the water's surface should read as instant-but-smooth:
        // a few frames, not a fade.
        this._fogNow = approachFog(this._fogNow, target, dt, 0.07);
        const f = this._fogNow;
        scene.fogColor.set(f.color.r, f.color.g, f.color.b);
        scene.fogDensity = f.density;
        scene.fogStart = f.start;
        scene.fogEnd = f.end;
    }
    _recenterXr = noop;
    /**
     * Re-seat the head: take your CURRENT head yaw as "facing forward". The same thing the
     * headset's own recentre (holding the Meta button) asks for — we listen for that too, so
     * it now works; this is the manual door, e.g. a panel button.
     */
    recenterXr() {
        this._recenterXr();
    }
    /**
     * Capture the current view as a PNG **data URL**. Resolution-independent — it
     * renders through an offscreen render target at the requested size (default: the
     * canvas size), so you can grab a large still from a small canvas, and it never
     * depends on the drawing buffer being preserved. Works in the flat view,
     * including **in-scene 3D panels** — which is how you eyeball the SVG-texture UI
     * (the same raster path the VR panels use) without a headset.
     *
     * Returns a `data:image/png;base64,…` string (handy from the console or a dev
     * channel); for a Blob, `await (await fetch(url)).blob()`.
     */
    async snapshot(opts = {}) {
        const cam = this.scene.activeCamera;
        if (cam == null)
            throw new Error('snapshot: the scene has no active camera');
        const canvas = this.engine.getRenderingCanvas();
        const width = opts.width ?? canvas?.width ?? 1280;
        const height = opts.height ?? canvas?.height ?? 720;
        return BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(this.engine, cam, { width, height });
    }
    /** Repaint BOTH presentations of the panel. The flat one rebuilds; the XR one rewrites
     * its contents in place. Unified on purpose — see `_panelWidgets`. */
    _repaintPanels() {
        this.refreshScenePanel();
        this._refreshXrPanel();
    }
    addDebugSource(source) {
        this._debugSources.push(source);
        this.refreshScenePanel();
        return () => {
            const i = this._debugSources.indexOf(source);
            if (i >= 0)
                this._debugSources.splice(i, 1);
            this.refreshScenePanel();
        };
    }
    // Rows contributed by registered debug sources. Kept generic on purpose: the core
    // knows nothing about terrain (or whatever else) — each source decides what's worth
    // three lines on a panel you're reading through a headset.
    //
    // The lines UPDATE IN PLACE (see `_startLiveDebug`): we keep their <text> nodes and
    // rewrite the content on a timer, rather than rebuilding the panel. Rebuilding would
    // fight with interaction (a slider drag torn out from under you), and — the bug that
    // prompted this — a readout that only refreshes when you REOPEN the panel is useless:
    // you switch a profiler on, the panel rebuilds instantly with the fresh (all-zero)
    // counters, and then you sit there watching frozen zeros while you fly.
    _sourceRows(src, bucket) {
        let lines;
        try {
            lines = src.lines();
        }
        catch (err) {
            lines = [`(threw: ${err?.message ?? err})`];
        }
        // Name as a compact heading, then ONE wrapping block for the body — instead of a
        // 40px row per line that both wasted vertical space and clipped long lines.
        const block = textBlock3d({ lines, muted: true });
        const rows = [
            label3d({ text: src.name, bold: true, compact: true }),
            block,
        ];
        bucket.push({
            update: (next) => block.update(next),
            lines: () => src.lines(),
        });
        for (const action of src.actions ?? []) {
            rows.push(button3d({
                label: typeof action.label === 'function' ? action.label() : action.label,
                // A button's own label can change ('Profile tiles' → 'Profiling ON'), and a
                // button label isn't live text — so this one case does want a rebuild.
                onClick: () => {
                    action.onClick();
                    this._repaintPanels();
                },
            }));
        }
        return rows;
    }
    // The debug tools the panel's icon bar offers: Perf Stats (when opted in) plus every
    // registered source, each with the icon its toggle shows. Perf Stats is core, not a
    // registered source, so it carries a fixed id + icon here; a source picks its own via
    // `DebugPanelSource.icon` (default `bug`). The icon bar toggles membership in
    // `_debugOpen`; only open tools render their rows below the bar (see `_panelWidgets`).
    _debugTools() {
        const tools = [];
        if (perfDebugEnabled() || this.stats) {
            tools.push({ id: '__perf', name: 'Perf Stats', icon: 'barChart2' });
        }
        for (const src of this._debugSources) {
            tools.push({ id: src.name, name: src.name, icon: src.icon ?? 'bug' });
        }
        return tools;
    }
    // Rewrite the debug lines' text in place. The flat panel is live DOM, so it just shows
    // the new text; the XR panel is rasterised by an SvgTexture that re-renders on its own
    // cadence (200ms), so it picks the change up for free. Cheap — a few string compares.
    _startLiveDebug() {
        if (this._liveDebugTimer != null)
            return;
        this._liveDebugTimer = setInterval(() => {
            const rows = [...this._liveDebug.flat, ...this._liveDebug.xr];
            if (rows.length === 0) {
                clearInterval(this._liveDebugTimer);
                this._liveDebugTimer = null;
                return;
            }
            for (const row of rows) {
                let lines;
                try {
                    lines = row.lines();
                }
                catch {
                    continue;
                }
                // The block re-wraps in place. A source that changes its LINE COUNT still needs a
                // rebuild to reflow the rows below it; the block itself stays live regardless.
                row.update(lines);
            }
        }, 400);
    }
    // Perf-stats readout for the scene panel (dual-presence: flat overlay AND the in-VR
    // panel), so it's reachable in a headset too — the reason it lives here and not in the
    // flat toolbar. Rendered only when its icon-bar toggle is on; the icon owns the
    // expand/collapse, so there's no header button here (there used to be, back when the
    // section was toggled by tapping its own header).
    //
    // IDENTICAL flat and in XR. `_refreshXrPanel` rewrites the XR panel in place, so a
    // control that exists in one presentation works in both — the panel is ONE ui with two
    // presentations.
    _perfReadoutRows() {
        const s = this.debugState;
        const scaled = this._statsBaseScale != null;
        return [
            label3d({
                text: `render ${s.renderWidth}×${s.renderHeight}  (css ${s.cssWidth}×${s.cssHeight})`,
                muted: true,
            }),
            label3d({
                text: `dpr ${s.devicePixelRatio}  scale ${s.hardwareScaling?.toFixed(2)}  ${s.tier}`,
                muted: true,
            }),
            label3d({
                text: `fps ${s.fps}  resizes ${s.resizeCount}${s.xrActive ? '  [XR]' : ''}`,
                muted: true,
            }),
            // One-tap discriminator: swap between the engine's real hardware scaling and
            // a coarse ×3 (≈1/9th the pixels). FPS recovers → fill/RTT is the bottleneck;
            // FPS unmoved → the resize machinery is. Fable's mobile-Safari test, in-panel.
            button3d({
                label: scaled ? 'Reset scale' : 'Force scale ×3',
                onClick: () => {
                    if (this.engine == null)
                        return;
                    if (this._statsBaseScale == null) {
                        this._statsBaseScale = this.engine.getHardwareScalingLevel();
                        this.engine.setHardwareScalingLevel(3);
                    }
                    else {
                        this.engine.setHardwareScalingLevel(this._statsBaseScale);
                        this._statsBaseScale = null;
                    }
                    this._repaintPanels();
                },
            }),
        ];
    }
    // The scene panel's widgets: a debug icon-bar (Perf Stats + each registered source,
    // one icon apiece), the expanded content of whichever debug tools are on, then the
    // author's `scenePanel` hook. Both the flat overlay and the XR panel build from THIS
    // one list — that's the "one UI, two presentations" contract, so the icon bar and its
    // expansion behave identically flat and in a headset. Toggling an icon mutates
    // `_debugOpen` and rebuilds both panels (a structural change — see `_repaintPanels`).
    //
    // The bar comes FIRST: a demo's own controls shouldn't be buried under diagnostics, but
    // the diagnostics must be one tap away (there's no console in VR). Collapsed by default,
    // so the panel opens clean; an expanded tool's status still sits ABOVE the author rows.
    _panelWidgets(xr = false) {
        const rows = this.scenePanel(this);
        const tools = this._debugTools();
        if (tools.length === 0) {
            // No debug tools → nothing to stop, clear this presentation's live bucket.
            this._liveDebug[xr ? 'xr' : 'flat'] = [];
            return rows;
        }
        const out = [
            iconBar3d({
                items: tools.map((t) => ({
                    icon: t.icon,
                    title: t.name,
                    active: this._debugOpen.has(t.id),
                    onClick: () => {
                        if (this._debugOpen.has(t.id))
                            this._debugOpen.delete(t.id);
                        else
                            this._debugOpen.add(t.id);
                        this._repaintPanels();
                    },
                })),
            }),
        ];
        // Live text blocks for the OPEN sources are collected here and rewritten in place by
        // `_startLiveDebug` (a readout that only refreshes on reopen is useless — you'd switch
        // a profiler on and then watch frozen zeros). Collapsed tools contribute nothing.
        const bucket = [];
        for (const t of tools) {
            if (!this._debugOpen.has(t.id))
                continue;
            if (t.id === '__perf')
                out.push(...this._perfReadoutRows());
            else {
                const src = this._debugSources.find((s) => s.name === t.id);
                if (src)
                    out.push(...this._sourceRows(src, bucket));
            }
        }
        this._liveDebug[xr ? 'xr' : 'flat'] = bucket;
        this._startLiveDebug();
        return [...out, ...rows];
    }
    // window.requestAnimationFrame stops firing during an immersive XR session (the
    // session's own frame loop drives rendering instead). tosijs batches component
    // re-renders via rAF, so REACTIVE ATTRIBUTE BINDINGS — a skybox's `timeOfDay`
    // bound to a slider, say — silently stop updating in VR (an explicit `.observe()`
    // still fires, which is why some controls worked and others didn't). Intercept
    // rAF while in-session and flush its callbacks from the XR frame loop; restore on
    // exit. Babylon renders via the XR session's rAF (not window's), so its loop is
    // untouched. Returns a restore function.
    _installXrRafPump(base) {
        const realRaf = window.requestAnimationFrame.bind(window);
        const realCancel = window.cancelAnimationFrame.bind(window);
        let queue = [];
        let nextId = 1;
        window.requestAnimationFrame = (cb) => {
            const id = nextId++;
            queue.push({ id, cb });
            return id;
        };
        window.cancelAnimationFrame = (id) => {
            queue = queue.filter((q) => q.id !== id);
        };
        const pump = () => {
            if (queue.length === 0)
                return;
            const due = queue;
            queue = [];
            const now = performance.now();
            for (const { cb } of due) {
                try {
                    cb(now);
                }
                catch (err) {
                    console.warn('rAF callback failed during XR', err);
                }
            }
        };
        const obs = base.sessionManager.onXRFrameObservable.add(pump);
        return () => {
            base.sessionManager.onXRFrameObservable.remove(obs);
            window.requestAnimationFrame = realRaf;
            window.cancelAnimationFrame = realCancel;
            pump(); // flush anything queued just before exit
        };
    }
    connectedCallback() {
        super.connectedCallback();
        const cnv = this.parts.canvas;
        cnv.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
        // Input focus follows the pointer: hovering or pressing anywhere in this scene
        // (canvas OR the glass-gamepad / panel overlays, which are siblings of the canvas)
        // makes it the one shared keyboard/gamepad input drives — see hasInputFocus. Listen
        // on the host so overlay interaction counts; pointerdown bubbles from any child.
        this.addEventListener('pointerenter', () => this.takeInputFocus());
        this.addEventListener('pointerdown', () => this.takeInputFocus());
        this.engine = new BABYLON.Engine(cnv, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            // Babylon 8 makes the legacy audio engine opt-in (older versions
            // defaulted it on). Without this, `new BABYLON.Sound()` silently
            // no-ops — it never even fetches the file. b3d-sound depends on it.
            audioEngine: true,
        });
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, -9.81 / 60, 0);
        // Seed device quality BEFORE any child component builds, so terrain/shadows/
        // reflections resolve their `auto` defaults against the right budget on frame 1.
        // Never let quality setup break the scene — fall back to the safe default.
        try {
            this._setupQuality();
        }
        catch (err) {
            console.warn('b3d quality setup failed; using default profile', err);
        }
        const init = async () => {
            if (this.sceneCreated !== noop) {
                await this.sceneCreated(this, BABYLON);
            }
            if (this.scene.activeCamera === undefined) {
                const DEG = Math.PI / 180;
                const camera = new BABYLON.ArcRotateCamera('default-camera', -Math.PI / 2, // alpha (facing -Z)
                60 * DEG, // beta (~30° elevation to start)
                8, // radius
                BABYLON.Vector3.Zero(), this.scene);
                // beta is measured from straight-up: elevation = 90° - beta. Clamp it so
                // the camera stays between min/maxElevation above the horizon (never
                // under the ground), and clamp radius so you can't zoom out to orbit or
                // in through the scene.
                camera.upperBetaLimit = (90 - this.minElevation) * DEG;
                camera.lowerBetaLimit = (90 - this.maxElevation) * DEG;
                camera.lowerRadiusLimit = this.minDistance;
                camera.upperRadiusLimit = this.maxDistance;
                camera.attachControl(cnv, false);
                this.setActiveCamera(camera);
            }
            this.gui = new GUI.GUI3DManager(this.scene);
            this.engine.runRenderLoop(this._update);
            // Mount the glass gamepad (if requested) before releasing descendants, so
            // b3dInputFocus sees its source when it wires up input.
            this._setupGamepad();
            // Scene is ready. Release any B3dChild components that connected and asked
            // (whenReady) before the scene was up — they insert themselves now. Anything
            // connecting later self-registers and runs immediately.
            this._sceneReady = true;
            const queued = this._readyQueue;
            this._readyQueue = [];
            for (const cb of queued)
                cb();
            // Offer WebXR (non-blocking — it must not delay the canvas reveal).
            void this._setupXR();
            // Mount the gear-toggled DOM-overlay settings panel (flat screens). The
            // in-scene XR copy is built on session entry.
            this._setupScenePanel();
            // NPC nameplates (above non-player bipeds), in flat AND XR.
            this._setupNameplates();
            // Fade in canvas once all pending file loads complete and shaders compile.
            // Falls back to revealing after assets load even if shaders are still
            // compiling, to avoid an indefinitely hidden canvas.
            const spinner = this.parts.spinner;
            let revealed = false;
            const reveal = () => {
                if (revealed)
                    return;
                revealed = true;
                cnv.classList.add('ready');
                spinner.classList.add('hidden');
                // Enable the toolbar only now the scene is up — the gear + Enter VR
                // shouldn't be clickable while the scene is still loading.
                const gearBtn = this.parts.scenePanelGear;
                const vrBtn = this.parts.enterVrButton;
                if (gearBtn)
                    gearBtn.disabled = false;
                if (vrBtn)
                    vrBtn.disabled = false;
            };
            const checkReady = () => {
                if (this.scene.getWaitingItemsCount() === 0) {
                    this.scene.executeWhenReady(reveal);
                    // Fallback: reveal once assets are loaded even if some shaders
                    // haven't compiled (e.g. SkyMaterial can take extra frames)
                    setTimeout(reveal, 500);
                }
                else {
                    setTimeout(checkReady, 100);
                }
            };
            // Start checking after a brief delay to let child components begin loading
            setTimeout(checkReady, 100);
        };
        init();
    }
    // WebXR is on by default. The `no-xr` attribute opts out; a `setupXr` hook
    // overrides the whole flow. Otherwise, when an immersive-vr session is
    // supported, mount a floating Enter/Exit-VR button wired to a default XR
    // experience (its own UI suppressed so the button matches the host theme).
    async _setupXR() {
        if (this.noXr)
            return;
        if (this.setupXr !== noop) {
            await this.setupXr(this, BABYLON);
            return;
        }
        if (navigator.xr == null)
            return;
        let supported;
        try {
            supported = await navigator.xr.isSessionSupported('immersive-vr');
        }
        catch {
            supported = false;
        }
        if (!supported || this.xrHelper != null)
            return;
        // Creating the default experience can steal scene.activeCamera (switching
        // to the XR camera on creation), which blanks the flat view before you ever
        // enter VR. Capture the flat camera and restore it; enterXRAsync swaps
        // cameras properly when you actually enter, and restores on exit.
        const flatCamera = this.scene.activeCamera;
        const xr = await this.scene.createDefaultXRExperienceAsync({
            disableDefaultUI: true,
        });
        this.xrHelper = xr;
        if (flatCamera != null && this.scene.activeCamera !== flatCamera) {
            this.scene.activeCamera = flatCamera;
        }
        const base = xr.baseExperience;
        if (base == null)
            return;
        const vrButton = this.parts.enterVrButton;
        vrButton.addEventListener('click', async () => {
            try {
                if (this.xrActive) {
                    await base.exitXRAsync();
                }
                else {
                    // Flush any pending tosijs renders WHILE flat rAF still works, so no
                    // component's per-element `_renderQueued` flag is left stranded when the
                    // immersive session suspends window.requestAnimationFrame. Otherwise a
                    // component with a render already queued at entry (e.g. the skybox, whose
                    // realtimeScale setInterval constantly queues one) never schedules
                    // another render in-session and its reactive bindings freeze — the
                    // "time-of-day slider dead on first XR entry" bug.
                    await updates();
                    await base.enterXRAsync('immersive-vr', 'local-floor');
                }
            }
            catch (err) {
                console.warn('XR session change failed', err);
            }
        });
        // A live map of XR controller component states (thumbsticks/buttons), built
        // once so we don't double-register listeners across sessions.
        const controllers = xrControllers(xr);
        // Feed the XR controllers through the same VirtualGamepad spine as the
        // keyboard/glass gamepad: add an XrGamepadSource to the scene's input focus,
        // so the focused controllable (biped/aircraft/car) is driven by the
        // controllers in VR through its existing mapping. No per-entity XR code.
        const focus = this.querySelector('tosi-b3d-input-focus');
        const xrSource = new XrGamepadSource(controllers);
        focus?.inputMappedProvider?.addSource(xrSource);
        // Standalone <tosi-b3d-controller>s self-wire their own input, so feed them the XR
        // controllers too (same VirtualGamepad spine — the VR sticks/triggers drive them).
        for (const c of Array.from(this.querySelectorAll('tosi-b3d-controller'))) {
            ;
            c.inputMappedProvider?.addSource(xrSource);
        }
        // The default experience enables teleportation; we drive locomotion
        // ourselves, so remove it to stop the thumbstick fighting our movement.
        try {
            xr.teleportation?.dispose();
        }
        catch {
            /* teleportation may not have been enabled */
        }
        // In a session the WebXR headset camera takes over (Babylon switches
        // scene.activeCamera to it); the flat-screen orbit camera is restored on
        // exit. On entry we stand the viewer on a walkable floor and wire stick
        // locomotion; on exit we tear it down.
        let xrSession;
        let restoreRaf;
        base.onStateChangedObservable.add((state) => {
            this.xrActive = state === BABYLON.WebXRState.IN_XR;
            // Keep the xrColor icon as the button face; the title carries the state
            // (the flat button isn't visible in-session anyway). Setting textContent
            // here would wipe the icon.
            vrButton.title = this.xrActive ? 'Exit VR' : 'Enter VR';
            if (state === BABYLON.WebXRState.IN_XR) {
                // Stereo doubles fill — drop to the XR render-scaling budget on entry, and
                // back to the flat one on exit (the cheap lever that's safe to change live).
                this._applyHardwareScaling(true);
                // Same reason: the XR tier is a smaller ambient pool, so re-divide it. A snowstorm
                // that was honest on a monitor may only afford to be nothing at all in a headset.
                this._reallocAmbient();
                // And re-arm the warm-up: XR entry is the single worst frame-rate moment there is
                // (stereo shaders compiling, the session spinning up). Judging the pool there and
                // shedding IRREVERSIBLY is how you lose the weather to a hitch that's already over.
                this._ambientWarmupMs = 10000;
                this._ambientBadSamples = 0;
                // Keep tosijs's rAF-batched reactive bindings flushing while in-session.
                restoreRaf ??= this._installXrRafPump(base);
                xrSession ??= this._startDefaultXrExperience(base, controllers);
            }
            else if (state === BABYLON.WebXRState.NOT_IN_XR) {
                this._applyHardwareScaling(false);
                this._reallocAmbient();
                xrSession?.dispose();
                xrSession = undefined;
                restoreRaf?.();
                restoreRaf = undefined;
            }
        });
        // XR is available — reveal the Enter VR button (grouped next to the gear in the
        // scene toolbar, so it's obvious when VR is available and never clipped by the
        // panel's scroll).
        vrButton.hidden = false;
    }
    // The built-in XR experience used when no `setupXr` hook is supplied: stand
    // the viewer on a grid floor near the scene, walk with the left stick
    // (relative to head facing), and fly up/down with the right stick. A rig
    // TransformNode is the movable anchor — live head tracking applies as a local
    // transform on top. Returns a disposer that tears everything down on exit.
    _startDefaultXrExperience(base, controllers) {
        const scene = this.scene;
        const cam = base.camera;
        const rig = new BABYLON.TransformNode('xr-rig', scene);
        // Keep the flat camera's horizontal viewpoint but stand on the floor
        // (local-floor reference space adds the viewer's real head height).
        const p = this.camera?.position;
        rig.position.set(p?.x ?? 0, 0, p?.z ?? -this.minDistance * 2);
        cam.parent = rig;
        // Reference frames for spatial UI (body/neck/face follow the head; rig/world
        // are locomotion/play-space). Updated each XR frame below; UI parents to one.
        const frames = new XrFrames(scene, rig, cam);
        frames.attachInput(this.xrHelper?.input); // hand/wrist frames follow the grips
        this.xrFrames = frames;
        // Body-anchored panels (inventory over the shoulders, quick-access at the
        // waist), pinned to their frame and revealed by looking toward them.
        const bodyPanels = this.bodyPanels(this).map((spec) => attachFramePanel(scene, cam, frames.get(spec.frame ?? 'body'), spec));
        // NPC nameplates run in a GENERAL manager now (flat + XR) — see
        // _setupNameplates() — since a frame panel gaze-reveals off the active camera
        // and works on a monitor too, not just in a headset. Not created here.
        // The in-scene settings panel (with an Exit-VR button), anchored to the eye
        // frame 60° up so it sits consistently above your sight-line.
        // Rebuildable: a structural change (expanding the perf stats, a debug source adding a
        // line) DISPOSES and re-attaches, because the panel's pointer/scroll closures can't
        // survive having their widgets swapped underneath them. Live numbers don't come
        // through here — those update the <text> nodes in place.
        let panel = this._attachXrPanel(base, frames.eye);
        this._refreshXrPanel = () => {
            panel.dispose();
            panel = this._attachXrPanel(base, frames.eye);
        };
        // A subtle grid floor — something to stand on and judge motion against.
        // Show the grid when `xr-grid="on"`, or `"auto"` (default) UNLESS a player
        // entity is driving the rig — a focused controllable (biped/car/aircraft via
        // input-focus) is its own "non-default rig", so auto hides the grid there.
        // `"off"` always hides it. (A custom setupXr never reaches this code at all.)
        const focus = this.querySelector('tosi-b3d-input-focus');
        const playerDriven = focus?.focused != null;
        const showGrid = this.xrGrid === 'on' || (this.xrGrid === 'auto' && !playerDriven);
        let ground;
        let grid;
        if (showGrid) {
            ground = BABYLON.MeshBuilder.CreateGround('xr-ground', { width: 200, height: 200 }, scene);
            ground.isPickable = false;
            // Drop a smidge BELOW y=0 so it doesn't z-fight ("z-chase") with a scene
            // ground / water / terrain at 0 — and so the real scene ground wins visually
            // (the grid only shows through where there's no ground, rather than covering
            // it). Imperceptible underfoot (you stand on the local-floor at 0).
            ground.position.y = -0.05;
            grid = new GridMaterial('xr-ground-grid', scene);
            grid.majorUnitFrequency = 5;
            grid.minorUnitVisibility = 0.4;
            grid.gridRatio = 1;
            grid.mainColor = new BABYLON.Color3(0.09, 0.11, 0.15);
            grid.lineColor = new BABYLON.Color3(0.25, 0.45, 0.7);
            grid.opacity = 0.7;
            ground.material = grid;
        }
        const HORIZ_SPEED = 2.5; // metres/sec
        const VERT_SPEED = 2.0;
        const TURN_SPEED = 2.0; // radians/sec at full deflection
        const DEAD = 0.15;
        const CHASE_HEIGHT = 2.5; // chase-cam height above a piloted entity
        // The scene's input focus (if any): when it has a focused controllable, the
        // XR controllers drive THAT (via XrGamepadSource → its mapping) and the rig
        // chase-follows it instead of free walk/fly. Looked up once; .focused is live.
        const focusEl = this.querySelector('tosi-b3d-input-focus');
        let last = Date.now();
        // Reused scratch vectors — never allocate inside the per-frame loop (in XR
        // that runs at 72-120fps, and the garbage was driving the perf creep).
        const fwd = new BABYLON.Vector3();
        const side = new BABYLON.Vector3();
        const head = new BABYLON.Vector3();
        const tmp = new BABYLON.Vector3();
        // Thumbstick-scroll: a controller pointing at the scrollable panel scrolls it
        // with its stick (that stick is then withheld from locomotion for the frame).
        const scrollRay = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up());
        const SCROLL_SPEED = 1200; // panel viewBox units / sec at full stick (2× — VR thumbstick scroll felt sluggish vs the flat drag)
        // Chase-cam follow state (ported from the biped's XR camera): smoothly track
        // the piloted entity's position AND facing, with head-tracking compensation.
        const chasePos = new BABYLON.Vector3();
        const yawQuat = new BABYLON.Quaternion();
        const mtx = new BABYLON.Matrix();
        let chaseYaw = 0;
        let chaseYawOffset = 0;
        let cockpitYawOffset = 0; // head yaw captured when you take the seat
        // Deferred + re-armable, rather than captured once on entry. See the capture site.
        let yawCaptureNeeded = false;
        const sm = base.sessionManager;
        /** A real head pose this frame? Before one arrives the camera's rotation is stale. */
        const hasViewerPose = () => {
            const f = sm.currentFrame;
            const rs = sm.referenceSpace;
            if (f == null || rs == null)
                return false;
            try {
                return f.getViewerPose(rs) != null;
            }
            catch {
                return false;
            }
        };
        /**
         * Re-seat the head. Holding the Meta button (or any system recentre) fires `reset` on
         * the XR reference space — the runtime moves the world under you and expects the app
         * to take the new pose as forward.
         *
         * We used to bake `cockpitYawOffset` once, on entry, and then keep applying it — so a
         * system recentre changed the reference space while we went on correcting by a yaw
         * measured against the OLD one. The recentre appeared to do nothing (we were undoing
         * it), which is why the only cure was to exit and re-enter. Re-arm the capture and the
         * next posed frame re-derives it.
         */
        const rearmYaw = () => {
            yawCaptureNeeded = true;
        };
        let resetSpace = null;
        const bindReset = () => {
            resetSpace?.removeEventListener('reset', rearmYaw);
            resetSpace = sm.referenceSpace ?? null;
            resetSpace?.addEventListener('reset', rearmYaw);
        };
        bindReset();
        // Babylon swaps the reference space on teleport/recentre — rebind, and re-seat.
        const refSpaceObs = sm.onXRReferenceSpaceChanged.add(() => {
            bindReset();
            rearmYaw();
        });
        this._recenterXr = rearmYaw;
        let lastView = ''; // re-seat when the camera view toggles
        let chaseZoom = 0.5; // 0..1 chase distance (right stick Y while piloting)
        let chaseFirstFrame = true;
        let lastPiloted = null;
        const ZOOM_RATE = 0.8;
        const MAX_PEEK = 0.8; // radians of temporary look (right stick X), ~46°
        const frame = base.sessionManager.onXRFrameObservable.add(() => {
            const now = Date.now();
            const dt = Math.min((now - last) * 0.001, 0.1);
            last = now;
            // Piloting a live controllable → the controllers fly it (via its mapping)
            // and the rig FOLLOWS it: positioned behind/at it AND rotated to face the
            // same way, so turning the entity turns your view (head tracking on top).
            // A crashed entity yields back to free walk/fly so you can leave the wreck.
            const entity = focusEl?.focused;
            // First-person = fpv/cockpit; chase = third. Gates view-restricted panels.
            const viewCtx = {
                firstPerson: entity
                    ? entity.cameraView === 'fpv' || entity.cameraView === 'cockpit'
                    : true,
            };
            // Keep the body/neck/face frames tracking the head (after locomotion has
            // moved the rig last frame; before any UI reads them this frame).
            frames.update(dt);
            for (const p of bodyPanels)
                p.update(viewCtx);
            // getCameraTarget() (not .mesh) — the aircraft's node is `meshNode`, so
            // .mesh is undefined and it would never be chased.
            const piloted = entity?.crashed
                ? null
                : (entity?.getCameraTarget?.() ??
                    null);
            if (piloted != null) {
                const view = entity?.cameraView ?? '';
                const eyeH = entity?.eyeHeight ?? 1.6;
                const isFpv = view === 'fpv';
                const isCockpit = view === 'cockpit';
                const isChase = !isFpv && !isCockpit;
                // Re-seat (recapture the recenter) on a view toggle as well as an entity
                // change, so cockpit↔chase doesn't snap.
                if (view !== lastView) {
                    chaseFirstFrame = true;
                    lastView = view;
                }
                // Right stick (while piloting) zooms the chase and peeks left/right.
                const zoomIn = entity?.lastInput?.cameraZoom ?? 0;
                const peekIn = entity?.lastInput?.cameraPeek ?? 0;
                const peekYaw = peekIn * MAX_PEEK;
                // COCKPIT: LITERALLY parent the rig to the hull — Babylon composes the
                // transform, so the camera inherits the airframe's full orientation with
                // zero hand-rolled quaternions. Identity local rotation = ride the hull's
                // orientation exactly. Scale is neutralized (rig world scale → 1) so head
                // tracking and the seat offset stay 1:1. The seat offset is head-comp'd
                // so your eye lands at (0, eyeH, cockpitForward) in the hull frame.
                if (isCockpit) {
                    if (rig.parent !== piloted) {
                        rig.parent = piloted;
                        yawCaptureNeeded = true;
                    }
                    // Capture the head's entry yaw so we can recenter the CAMERA to look out the
                    // nose without moving the (correctly-placed) panels.
                    //
                    // NOT on the frame we take the seat: for the first frames of a session the
                    // viewer pose can still be null, and the camera then reports a stale/identity
                    // rotation — so we'd bake a garbage yaw and you'd be seated facing the wrong
                    // way. (The tell: exiting, holding your head still, and re-entering "fixed" it —
                    // that just bought a clean capture.) Wait for a real pose.
                    if (yawCaptureNeeded && hasViewerPose()) {
                        cockpitYawOffset = cam.rotationQuaternion
                            ? cam.rotationQuaternion.toEulerAngles().y
                            : 0;
                        yawCaptureNeeded = false;
                    }
                    // Neutralize the hull's scale so head tracking & the seat offset stay
                    // 1:1 (no-op once the hull is canonical, but the model isn't always).
                    const s = piloted.scaling.x || 1;
                    rig.scaling.set(1 / s, 1 / s, 1 / s);
                    // Rig local rotation = RotationY(−entryYaw): swings the head to forward.
                    BABYLON.Quaternion.RotationYawPitchRollToRef(-cockpitYawOffset, 0, 0, yawQuat);
                    rig.rotationQuaternion = yawQuat;
                    // Head-comp THROUGH that rotation so the eye still lands at the seat.
                    BABYLON.Matrix.FromQuaternionToRef(yawQuat, mtx);
                    BABYLON.Vector3.TransformCoordinatesToRef(cam.position, mtx, tmp);
                    rig.position.set(-tmp.x / s, (eyeH - tmp.y) / s, ((entity?.cockpitForward ?? 0.5) - tmp.z) / s);
                    // Counter-rotate the eye frame by +entryYaw so the panels DON'T move
                    // (they were already correct) while the camera recenters.
                    frames.eyeYawOffset = cockpitYawOffset;
                    chaseFirstFrame = true; // re-seat the chase on toggle-out
                    return;
                }
                // Non-cockpit: ensure the rig is back in world space.
                if (rig.parent != null) {
                    rig.parent = null;
                    rig.scaling.set(1, 1, 1);
                    chaseFirstFrame = true;
                }
                if (isChase) {
                    chaseZoom = Math.max(0, Math.min(1, chaseZoom - zoomIn * dt * ZOOM_RATE));
                }
                const loH = entity?.chaseMinHeight ?? eyeH;
                const chaseH = entity?.chaseHeight ?? CHASE_HEIGHT;
                const chaseD = entity?.chaseDistance ?? 5;
                // fpv: at the head (back 0). chase: behind + above (zoomable).
                const back = isFpv ? 0 : chaseD * (0.8 + chaseZoom * 1.1);
                const up = isFpv ? eyeH : loH + (chaseH - loH) * chaseZoom;
                piloted.getDirectionToRef(XR_FORWARD, fwd); // world forward
                const targetYaw = Math.atan2(fwd.x, fwd.z);
                // fpv: anchor to the actual head bone if the entity exposes it.
                const headPos = isFpv ? entity?.getHeadPosition?.() ?? null : null;
                const targetX = headPos ? headPos.x : piloted.position.x - fwd.x * back;
                const targetY = headPos ? headPos.y : piloted.position.y + up;
                const targetZ = headPos ? headPos.z : piloted.position.z - fwd.z * back;
                if (chaseFirstFrame || lastPiloted !== piloted) {
                    // Align to where the headset is currently looking so it doesn't snap.
                    chaseFirstFrame = false;
                    lastPiloted = piloted;
                    chaseYawOffset = cam.rotationQuaternion
                        ? cam.rotationQuaternion.toEulerAngles().y
                        : 0;
                    chaseYaw = targetYaw - chaseYawOffset;
                    chasePos.set(targetX, targetY, targetZ);
                }
                // Chase eases horizontally (turning doesn't snap); vertical always tracks
                // tightly so it doesn't sink below on a climb. fpv tracks tight all round.
                const posT = Math.min(1, (isChase ? 9 : 16) * dt);
                const posTy = Math.min(1, 16 * dt);
                const yawT = Math.min(1, 6 * dt);
                chasePos.x += (targetX - chasePos.x) * posT;
                chasePos.y += (targetY - chasePos.y) * posTy;
                chasePos.z += (targetZ - chasePos.z) * posT;
                let yawDiff = targetYaw - chaseYawOffset - chaseYaw;
                while (yawDiff > Math.PI)
                    yawDiff -= Math.PI * 2;
                while (yawDiff < -Math.PI)
                    yawDiff += Math.PI * 2;
                chaseYaw += yawDiff * yawT;
                // Compensate for the head's local (tracked) offset so the HEAD lands at
                // chasePos: rig = chasePos − (headLocal rotated into the rig's yaw).
                BABYLON.Quaternion.RotationYawPitchRollToRef(chaseYaw + peekYaw, 0, 0, yawQuat);
                BABYLON.Matrix.FromQuaternionToRef(yawQuat, mtx);
                BABYLON.Vector3.TransformCoordinatesToRef(cam.position, mtx, tmp);
                rig.position.set(chasePos.x - tmp.x, chasePos.y - tmp.y, chasePos.z - tmp.z);
                rig.rotationQuaternion = yawQuat;
                // Eye-frame panels align with the LOGICAL forward (entity facing), not
                // the rig's recentered yaw: cancel the recenter (and the live peek).
                frames.eyeYawOffset = chaseYawOffset - peekYaw;
                return;
            }
            // Free walk/fly. If we were just piloting, hand the rig's yaw back to euler
            // (a set rotationQuaternion overrides the euler the stick-turn below uses).
            chaseFirstFrame = true;
            lastPiloted = null;
            lastView = '';
            frames.eyeYawOffset = 0; // no recenter in free locomotion
            if (rig.parent != null) {
                rig.parent = null; // came from the cockpit — back to world space
                rig.scaling.set(1, 1, 1);
            }
            if (rig.rotationQuaternion != null) {
                rig.rotation.y = rig.rotationQuaternion.toEulerAngles().y;
                rig.rotationQuaternion = null;
            }
            const left = controllers['left']?.['xr-standard-thumbstick']?.axes;
            const right = controllers['right']?.['xr-standard-thumbstick']?.axes;
            // Thumbstick scroll: if a controller's ray hits the (scrollable, visible)
            // panel, its stick Y scrolls the panel and is withheld from locomotion.
            let leftScroll = false;
            let rightScroll = false;
            if (panel.scrollable && panel.plane.visibility > 0.5) {
                const inputs = this.xrHelper?.input?.controllers ?? [];
                for (const src of inputs) {
                    src.getWorldPointerRayToRef(scrollRay);
                    // Scroll is gated on GAZE (the panel is visible = you're looking at it), NOT on
                    // the controller ray hitting the panel. It used to require the pick — which made
                    // scrolling die whenever picking died, so a panel whose content ran below the
                    // fold became completely unreachable: you couldn't press anything AND you
                    // couldn't scroll to what you couldn't press. Never gate the only escape hatch
                    // on the thing that's broken.
                    const hand = src.inputSource?.handedness;
                    const axes = controllers[hand]?.['xr-standard-thumbstick']
                        ?.axes;
                    if (axes != null && Math.abs(axes.y) > DEAD) {
                        panel.scrollBy(axes.y * SCROLL_SPEED * dt);
                    }
                    if (hand === 'left')
                        leftScroll = true;
                    else if (hand === 'right')
                        rightScroll = true;
                }
            }
            if (left != null &&
                !leftScroll &&
                (Math.abs(left.x) > DEAD || Math.abs(left.y) > DEAD)) {
                // Walk relative to where the head currently faces (flattened to floor).
                cam.getDirectionToRef(XR_FORWARD, fwd);
                fwd.y = 0;
                fwd.normalize();
                cam.getDirectionToRef(XR_RIGHT, side);
                side.y = 0;
                side.normalize();
                const step = HORIZ_SPEED * dt;
                fwd.scaleToRef(-left.y * step, tmp);
                rig.position.addInPlace(tmp);
                side.scaleToRef(left.x * step, tmp);
                rig.position.addInPlace(tmp);
            }
            if (right != null && !rightScroll && Math.abs(right.y) > DEAD) {
                rig.position.y += -right.y * VERT_SPEED * dt; // push up to ascend
            }
            if (right != null && !rightScroll && Math.abs(right.x) > DEAD) {
                // Smooth-turn around the head (not the rig origin) so you spin in place
                // rather than orbiting when you've stepped off-centre. Rotate, then nudge
                // the rig so the head's world XZ is unchanged.
                head.copyFrom(cam.globalPosition);
                rig.rotation.y += right.x * TURN_SPEED * dt; // push right → turn right
                rig.computeWorldMatrix(true);
                cam.computeWorldMatrix();
                rig.position.x += head.x - cam.globalPosition.x;
                rig.position.z += head.z - cam.globalPosition.z;
            }
        });
        return {
            dispose: () => {
                base.sessionManager.onXRFrameObservable.remove(frame);
                sm.onXRReferenceSpaceChanged.remove(refSpaceObs);
                resetSpace?.removeEventListener('reset', rearmYaw);
                this._recenterXr = noop;
                this._refreshXrPanel = noopRefresh;
                panel.dispose();
                for (const p of bodyPanels)
                    p.dispose();
                frames.dispose();
                this.xrFrames = null;
                cam.parent = null;
                ground?.dispose();
                grid?.dispose();
                rig.dispose();
            },
        };
    }
    // Build a panel SVG from a row list. Each surface (overlay, in-scene) builds
    // its own with independent widget instances bound to the same reactive
    // values, so they stay in sync.
    _makePanel(rows) {
        const n = Math.max(1, rows.length);
        // Extra top padding so the first row clears the × close button (top-right)
        // and the panel doesn't read footer-heavy.
        const height = Math.min(540, 46 + n * 48);
        return panel3d({ width: 320, height, paddingTop: 34 }, ...rows);
    }
    // Flat-screen surface: a top-right gear icon toggles the settings panel as a
    // DOM overlay. Only revealed when the scenePanel hook returns widgets. The panel
    // is REBUILT each time the gear opens it (not once at setup), so a hook whose
    // contents depend on async state — e.g. a library mesh-picker list that only
    // exists after the GLB loads — is always current when you open it. (The in-XR
    // panel likewise re-invokes the hook when it's built on VR entry.)
    // NPC nameplates in ALL contexts (flat + XR): a gaze-revealed label above each
    // non-player biped. A frame panel already reveals off `scene.activeCamera`, so
    // the same code works on a monitor and in a headset — no XR-specific wiring.
    // Created lazily as bipeds' GLBs load (and disposed when they leave), updated
    // every rendered frame (onBeforeRenderObservable fires in both flat and XR).
    _setupNameplates() {
        const scene = this.scene;
        // A `Nameplates` debug source used to hang here, reporting gaze-reveal internals
        // (xr/cam/updates/cos) to diagnose plates staying visible inside a session. That's
        // resolved, so it's gone — scaffolding kept past its bug is just a row competing for
        // panel space with whatever you're debugging NEXT. The instrumentation it read
        // (`panel.debug` in frame-panel.ts) is deliberately still there and still live, so
        // restoring the readout is one `addDebugSource` block if the reveal ever regresses.
        scene.onBeforeRenderObservable.add(() => {
            const cam = scene.activeCamera;
            if (cam == null)
                return;
            // Add newly-ready bipeds / drop departed ones only occasionally (querySelector
            // + set churn shouldn't run every frame).
            if (this._nameplateScan-- <= 0) {
                this._nameplateScan = 30;
                this._scanNameplates(cam);
            }
            for (let i = 0; i < this._nameplateList.length; i++) {
                this._nameplateList[i].ef.update(cam);
                this._nameplateList[i].panel.update();
            }
        });
    }
    _scanNameplates(cam) {
        const scene = this.scene;
        const seen = new Set();
        for (const el of Array.from(this.querySelectorAll('tosi-b3d-biped'))) {
            const b = el;
            if (b.player || b.mesh == null)
                continue;
            seen.add(el);
            if (this._nameplates.has(el))
                continue;
            const ef = new EntityFrame(scene, b.mesh, {
                offset: [0, (b.eyeHeight ?? 1.7) + 0.25, 0],
            });
            const panel = attachFramePanel(scene, cam, ef.node, {
                // Aim the cone at the NPC, not at the plate floating above their head. The wide
                // 70°/40° cone that used to be here was a WORKAROUND for measuring against the plate
                // (looking at someone didn't reveal their name), and 70° is most of your field of
                // view — which is why the plates never went away. With the cone pointed at the
                // subject, a tight one behaves: look at someone, get their name; look away, lose it.
                gazeTarget: b.mesh,
                // Aim at the CHEST. A biped's node origin is at their FEET — with a tight cone aimed
                // there, standing near someone in VR puts their feet ~40° below your gaze, so looking
                // them in the eye revealed nothing at all (the plates read 0 forever). Flat hid this
                // completely: a chase camera looks DOWN at the scene, so the feet sit near the middle
                // of the screen and it all seemed fine.
                gazeOffset: [0, (b.eyeHeight ?? 1.7) * 0.6, 0],
                anchor: {
                    position: [0, 0, 0],
                    focus: [0, 0, 1], // faces +Z = toward the viewer (frame turns to face you)
                    // Not too tight: in a headset you aim with your head, not a mouse.
                    revealStartDeg: 32,
                    revealFullDeg: 14,
                },
                // Fade with distance rather than cliff-edging. A hard `maxDistance: 8` was tried and
                // removed because it snapped plates out of existence and the monitor-tuned cutoff was
                // wrong in a headset. Fade, don't switch — same lesson as the fog and the bubbles.
                // Pulled in per Tonio: plates should declutter at much closer range than the first pass.
                fadeFrom: 4,
                fadeTo: 9,
                // Compact card (280×116 vs the default 320×200) — ~50% less padding
                // around the label so the plaque hugs the name and doesn't hang low.
                svg: placeholderPanelSvg(b.id || '$6M biped', 280, 116),
                width: 0.6, // 2× — readable at a glance
                // No distance gate: an earlier `maxDistance: 8` hid nameplates in VR
                // (the head is easily >8m from NPCs), while flat worked. The 26° gaze
                // cone already declutters — you only see the ones you look at.
            });
            this._nameplates.set(el, { ef, panel });
        }
        // Drop nameplates whose biped is gone (removed from the DOM / disposed mesh).
        for (const [el, n] of this._nameplates) {
            if (!seen.has(el)) {
                n.panel.dispose();
                n.ef.dispose();
                this._nameplates.delete(el);
            }
        }
        this._nameplateList = [...this._nameplates.values()];
    }
    _setupScenePanel() {
        const gear = this.parts.scenePanelGear;
        const host = this.parts.scenePanelHost;
        if (!this._scenePanelWired) {
            this._scenePanelWired = true;
            gear.addEventListener('click', () => {
                if (host.hasAttribute('hidden'))
                    this._openScenePanel();
                else
                    this._closeScenePanel();
            });
        }
        // Reveal the gear when the panel has any widgets — the scenePanel hook's, or
        // the opted-in perf-stats section. (Enter VR is a SEPARATE button grouped next
        // to the gear — see the toolbar — so XR availability no longer gates the gear.)
        if (this._panelWidgets().length > 0) {
            gear.hidden = false;
            if (this.scenePanelOpen)
                this._openScenePanel();
        }
    }
    /** Open the flat scene panel, with a × close button pinned top-right. */
    _openScenePanel() {
        const host = this.parts.scenePanelHost;
        const close = button({ class: 'scene-panel-close', type: 'button', title: 'Close' }, 
        // In a session the flat overlay isn't visible anyway, but keep it playful:
        // a bug-eyed face for VR, the close icon on flat screens (currentColor
        // resolves in live DOM — this button is flat-only in practice).
        this.xrActive ? '😳' : svgIcons.close());
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeScenePanel();
        });
        host.replaceChildren(close, this._makePanel(this._panelWidgets()));
        host.removeAttribute('hidden');
    }
    _closeScenePanel() {
        ;
        this.parts.scenePanelHost.setAttribute('hidden', '');
        // Debug tools collapse again on next open — kept out of the way by default.
        this._debugOpen.clear();
    }
    /** Rebuild the flat scene panel from the current rows, if it's open.
     * Call after async state the panel reflects has changed (e.g. a library loaded,
     * or XR availability / session state) so an already-open panel updates. */
    refreshScenePanel() {
        const host = this.parts?.scenePanelHost;
        if (host && !host.hasAttribute('hidden')) {
            this._openScenePanel();
        }
    }
    // Mount the split touch "glass" gamepad when the `gamepad` attribute is
    // present, as a light-DOM child (projected over the canvas via the slot, and
    // findable by b3dInputFocus, which adds its poll() to the input provider).
    // The attribute value selects/positions controls.
    _setupGamepad() {
        const attr = this.getAttribute('gamepad');
        const prop = this.gamepad;
        if (attr == null && (prop === false || prop == null))
            return;
        const spec = typeof prop === 'string' && prop !== '' ? prop : attr ?? '';
        this.appendChild(b3dGamepad({ controls: spec, scale: this.gamepadScale ?? 1 }));
    }
    // In-scene surface: render the panel onto a plane positioned each frame in
    // WORLD space relative to the HEAD (not the rig / flat camera), floating
    // overhead in the direction you face and fading in only as you tilt your head
    // up — so it never obstructs the forward view. Picks route via the scene
    // pointer observable (mouse and XR controllers alike) into the panel's own
    // viewBox coords. Returns a disposer.
    _attachXrPanel(base, anchorFrame) {
        const scene = this.scene;
        // In-scene panel always carries an Exit-VR button (you can't reach a DOM
        // button inside a headset), plus any scenePanel widgets.
        const rows = [
            button3d({
                label: 'Exit VR',
                onClick: () => {
                    void this.xrHelper?.baseExperience?.exitXRAsync();
                },
            }),
            // Re-seat is XR-only because it's meaningless flat — but it must be REACHABLE from
            // inside the headset, which is the whole reason the panel exists there.
            button3d({
                label: 'Re-seat (look forward first)',
                onClick: () => this.recenterXr(),
            }),
            ...this._panelWidgets(true),
        ];
        const panelEl = this._makePanel(rows);
        // LIVE numbers in the headset. The XR panel is built once at entry, so a debug
        // readout would otherwise freeze at whatever it said when you put the headset on —
        // useless for watching a worst-frame spike as you fly. The SvgTexture re-renders
        // ⚠️ DO NOT "refresh" this panel by swapping its children.
        //
        // `panel3d` hangs `handlePointer`, `scrollBy` and `scrollable` off the SVG element as
        // CLOSURES over the widget objects it built, and the element's viewBox is sized for
        // that row count. `replaceChildren()` therefore leaves the pointer router aiming at
        // detached widgets laid out for a different height — the ray still reports a hit on
        // the panel and a plausible uv, but it maps to the WRONG control (a few px off, or
        // wildly, depending on how far the layout drifted), and scrolling dies outright
        // because `scrollBy` still drives nodes that are no longer in the tree.
        //
        // That is exactly what happened: a 500ms child-swap made the XR panel untargetable,
        // and only in scenes with a registered debug source — which is why the terrain demo
        // broke and the otherwise-identical combat demo didn't.
        //
        // Structural changes REBUILD the panel (dispose + re-attach: see `_refreshXrPanel`,
        // set where the panel is created). Live NUMBERS don't need any of that — `_startLiveDebug`
        // rewrites the <text> nodes in place, which changes no structure and no closure.
        const vb = panelEl.viewBox.baseVal;
        // Anchored to the eye frame (origin = your head), 60° up the sight-line.
        const PLANE_W = 1.0; // metres wide (height follows the panel's aspect)
        const D = 1.4; // distance (matches the other eye-frame panels)
        const ELEV = (60 * Math.PI) / 180;
        const ABOVE = D * Math.sin(ELEV); // ≈1.21 up
        const AHEAD = D * Math.cos(ELEV); // ≈0.70 ahead
        const plane = BABYLON.MeshBuilder.CreatePlane('xr-panel', {
            width: PLANE_W,
            height: PLANE_W * (vb.height / vb.width),
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        }, scene);
        // The panel is near-static, so re-rasterising the SVG at high res every
        // 30ms (the SvgTexture default) was the main XR perf regression — throttle
        // hard and drop the resolution. A settings panel doesn't need 33fps.
        const tex = new SvgTexture({
            scene,
            element: panelEl,
            resolution: 512,
            updateInterval: 200,
        });
        const mat = new BABYLON.StandardMaterial('xr-panel-mat', scene);
        mat.backFaceCulling = false;
        mat.emissiveTexture = tex.texture;
        mat.opacityTexture = tex.texture;
        // You view the plane's back (+Z faces you), which mirrors the texture
        // horizontally — flip U so the panel reads correctly.
        tex.texture.uScale = -1;
        tex.texture.uOffset = 1;
        mat.diffuseColor = BABYLON.Color3.Black();
        mat.disableLighting = true;
        plane.material = mat;
        plane.visibility = 0;
        // The XR rig is the camera's parent. Make the panel a SECOND child of that
        // rig — the SAME coordinate space as the camera — at a FIXED local pose: the
        // head (camera) rotates within the rig to look at it, while the panel itself
        // never moves or rotates. So it's rock-steady relative to you and stays put
        // to be pointed at. No billboard (that would re-rotate it every frame). (#1)
        plane.parent = anchorFrame;
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
        let placed = false;
        const frame = base.sessionManager.onXRFrameObservable.add(() => {
            if (placed)
                return;
            placed = true;
            // Seat ONCE 60° up in the eye frame (origin = head), facing back down at it.
            plane.position.set(0, ABOVE, AHEAD);
            plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI, Math.atan2(ABOVE, AHEAD), 0);
            plane.visibility = 1;
        });
        const T = BABYLON.PointerEventTypes;
        let vx = 0;
        let vy = 0;
        // XR pointer diagnostics, shown ON THE PANEL — the only way to debug a panel you
        // can't press. (The panel renders fine and its lines are live, so you can READ it in
        // the headset even when picking is broken.) Off unless something registered.
        const dbg = {
            kind: '-',
            events: 0,
            hit: '-',
            repick: '-',
            vis: 0,
            uv: '-',
        };
        const offDbg = this.addDebugSource({
            name: 'xr pointer',
            lines: () => [
                `events ${dbg.events}  last ${dbg.kind}  vis ${dbg.vis.toFixed(2)}`,
                `pick ${dbg.hit}`,
                `repick ${dbg.repick}  uv ${dbg.uv}`,
            ],
        });
        const obs = scene.onPointerObservable.add((pi) => {
            const kind = pi.type === T.POINTERDOWN
                ? 'down'
                : pi.type === T.POINTERUP
                    ? 'up'
                    : pi.type === T.POINTERMOVE
                        ? 'move'
                        : '';
            if (kind) {
                dbg.events++;
                dbg.kind = kind;
                dbg.vis = plane.visibility;
                dbg.hit = pi.pickInfo?.pickedMesh
                    ? `${pi.pickInfo.pickedMesh.name}${pi.pickInfo.pickedMesh === plane ? ' (PANEL)' : ''}`
                    : pi.pickInfo?.ray
                        ? 'nothing (ray ok)'
                        : 'NO RAY';
            }
            // Only interactive while it's actually visible (you're looking at it).
            if (!kind ||
                plane.visibility < 0.5 ||
                typeof panelEl.handlePointer !== 'function')
                return;
            const pick = pi.pickInfo;
            let uv = pick?.hit && pick.pickedMesh === plane
                ? pick.getTextureCoordinates()
                : null;
            // The panel may be occluded (e.g. the aircraft cockpit hull blocks the
            // controller ray) — re-pick against ONLY the panel so it's still pointable.
            if (!uv && pick?.ray) {
                const p2 = scene.pickWithRay(pick.ray, (m) => m === plane);
                if (p2?.hit)
                    uv = p2.getTextureCoordinates();
                if (kind)
                    dbg.repick = p2?.hit ? 'HIT' : 'miss';
            }
            else if (kind) {
                dbg.repick = uv ? 'n/a (direct)' : 'no ray';
            }
            if (kind)
                dbg.uv = uv ? `${uv.x.toFixed(2)},${uv.y.toFixed(2)}` : 'none';
            if (uv) {
                // The panel is the plane's BACK face with the texture U-flipped
                // (uScale=-1) so it READS correctly — but the pick returns the raw mesh
                // UV, so its x is mirrored relative to what you see. Undo the flip here, or
                // every right-aligned control (slider track, toggle switch, select arrows)
                // maps to the dead label zone and feels unresponsive.
                vx = (1 - uv.x) * vb.width;
                vy = (1 - uv.y) * vb.height;
            }
            // Route every event; the panel manages press-capture and hover itself.
            if (kind === 'move' && !uv)
                panelEl.handlePointer('leave', 0, 0);
            else if (kind === 'down' && !uv)
                return;
            else
                panelEl.handlePointer(kind, vx, vy);
        });
        return {
            plane,
            scrollable: !!panelEl.scrollable,
            scrollBy: (dy) => panelEl.scrollBy?.(dy),
            dispose: () => {
                base.sessionManager.onXRFrameObservable.remove(frame);
                scene.onPointerObservable.remove(obs);
                offDbg();
                this._liveDebug.xr = []; // its <text> nodes die with the panel
                tex.dispose();
                mat.dispose();
                plane.dispose();
            },
        };
    }
    disconnectedCallback() {
        if (B3d._active === this)
            B3d._active = null;
        if (this._qualityOff) {
            this._qualityOff();
            this._qualityOff = null;
        }
        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = undefined;
        }
        // Kill the live-debug timer explicitly. Its self-clear only fires when BOTH row buckets are
        // empty, but `_liveDebug.flat` never empties on its own — so without this a removed scene
        // leaves a 400ms interval calling each debug source's `lines()` closure forever, pinning the
        // whole (disposed) scene from GC. A multi-demo docs page would leak one per visit. See the
        // pre-release review; this is exactly the leak class this project guards against.
        if (this._liveDebugTimer != null) {
            clearInterval(this._liveDebugTimer);
            this._liveDebugTimer = null;
        }
        this._liveDebug = { flat: [], xr: [] };
        this._debugSources = [];
        // Descendant B3dChild components self-dispose via their own
        // disconnectedCallback when this subtree is removed — b3d doesn't dispose them.
        this._sceneReady = false;
        this._readyQueue = [];
        super.disconnectedCallback();
    }
    render() {
        super.render();
        const intensity = this.glowLayerIntensity;
        if (intensity > 0) {
            if (!this.glowLayer) {
                this.glowLayer = new BABYLON.GlowLayer('glow', this.scene);
                // A glow layer ignores `mesh.visibility` (see `excludeFromGlow`), so any panel that
                // already exists would be drawn by the glow pass even when gaze-hidden. Panels built
                // AFTER this exclude themselves on creation; these are the ones that got here first.
                for (const m of this.scene.meshes) {
                    // Neither UI plaques nor leaves are light sources — keep them out of the bloom.
                    if (m.name === 'frame-panel' || m.name === 'ambient-leaves')
                        this.glowLayer.addExcludedMesh(m);
                }
            }
            this.glowLayer.intensity = intensity;
        }
        else if (this.glowLayer) {
            this.glowLayer.dispose();
            this.glowLayer = undefined;
        }
    }
}
export const b3d = B3d.elementCreator({ tag: 'tosi-b3d' });
//# sourceMappingURL=tosi-b3d.js.map