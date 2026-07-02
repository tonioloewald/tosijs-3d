/*#
# b3d

The root 3D scene container. All other components (`b3dSun`, `b3dSkybox`, `b3dLoader`, etc.)
must be children of a `b3d` element.

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dSphere, b3dLoader,
  b3dBiped, b3dButton, b3dLight, b3dWater, b3dReflections, b3dCollisions,
  gameController, inputFocus, label3d, toggle3d, slider3d,
} from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span } = elements

const { demo } = tosi({
  demo: {
    showColliders: false,
    time: 19,
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
        label3d({ text: 'Scene' }),
        toggle3d({ label: 'show colliders', value: demo.showColliders }),
        slider3d({ label: 'time of day', value: demo.time, min: 0, max: 24, step: 0.1 }),
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
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 }),
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
import { panel3d, button3d } from './widgets3d';
import { SvgTexture } from './svg-texture';
import { CombatWorld } from './destroyable';
import { b3dGamepad } from './glass-gamepad';
import { XrGamepadSource } from './xr-gamepad';
import { XrFrames, EntityFrame } from './xr-frames';
import { attachFramePanel } from './frame-panel';
import { runProbe, hydrateProfileFromCache } from './b3d-probe';
import { setQuality, qualityBudgets, onQualityChange, } from './b3d-quality';
const { canvas, div, slot, button } = elements;
const noop = () => { };
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
        // Toolbar groups the gear + Enter VR at top-LEFT (demos pin text overlays
        // top-right, so the left keeps this clear of them). Flex row so children pack
        // together and a hidden one leaves no gap.
        ':host .scene-toolbar': {
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: '20',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
        },
        ':host .enter-vr-button': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            font: '600 14px system-ui, sans-serif',
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.125s',
        },
        ':host .enter-vr-button[hidden]': {
            display: 'none',
        },
        ':host .enter-vr-button:hover': {
            background: 'rgba(0,0,0,0.8)',
            transform: 'scale(1.05)',
        },
        ':host .scene-panel-gear': {
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            font: '20px system-ui, sans-serif',
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.125s',
        },
        ':host .scene-panel-gear[hidden]': {
            display: 'none',
        },
        ':host .scene-panel-gear:hover': {
            background: 'rgba(0,0,0,0.8)',
            transform: 'scale(1.05)',
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
    };
    content = [
        div({ class: 'spinner', part: 'spinner' }),
        canvas({ part: 'canvas' }),
        // Top-left toolbar grouping the gear (scene settings) and the Enter VR button
        // side by side — so VR availability is obvious, and Enter VR is never a panel
        // row that could scroll/clip. Each child reveals itself when relevant. (Both
        // live in the template — appending to the shadow root later doesn't persist.)
        div({ class: 'scene-toolbar', part: 'sceneToolbar' }, button({
            class: 'scene-panel-gear',
            part: 'scenePanelGear',
            type: 'button',
            title: 'Scene settings',
            hidden: true,
        }, '⚙'), button({
            class: 'enter-vr-button',
            part: 'enterVrButton',
            type: 'button',
            hidden: true,
        }, 'Enter VR')),
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
        return [
            { frame: 'eye', anchor: 'left-shoulder', title: 'Inventory' },
            { frame: 'eye', anchor: 'right-shoulder', title: 'Inventory' },
            { frame: 'eye', anchor: 'waist', title: 'Quick Access' },
            {
                frame: 'face',
                anchor: { position: [0, 0, 2], focus: [0, 0, 0] },
                reveal: 'always',
                blend: 'add',
                view: 'first', // crosshair only when looking through your own eyes
                url: '/reticle.svg',
                width: 0.24,
            },
            { frame: 'left-hand', anchor: 'wrist', title: 'Menu', width: 0.09 },
        ];
    };
    lastRender = 0;
    sceneListeners = [];
    pastAdditions = [];
    _sceneReady = false;
    _childObserver;
    _notifiedNodes = new WeakSet();
    _libraries = new Map();
    onSceneAddition(callback) {
        this.sceneListeners.push(callback);
        for (const additions of this.pastAdditions) {
            callback(additions);
        }
    }
    offSceneAddition(callback) {
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
    //  - onOriginShift(cb): the entity also holds world coordinates in JS (a
    //    projectile integrating its own position, remembered target positions, AI
    //    memory). It gets (dx, dz) and fixes ITSELF — node AND JS state. Such an
    //    entity must NOT also registerWorldRoot (that would shift its node twice).
    _worldRoots = new Set();
    _originShiftListeners = [];
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
    onOriginShift(callback) {
        this._originShiftListeners.push(callback);
    }
    offOriginShift(callback) {
        const idx = this._originShiftListeners.indexOf(callback);
        if (idx > -1)
            this._originShiftListeners.splice(idx, 1);
    }
    /**
     * Move every world-space thing by (-dx, -dz) so the viewpoint returns near the
     * origin with no visible motion. Called by the terrain AFTER it has rebased its
     * own tiles by (dx, dz). Shifts: the camera CARRIER (the piloted entity if one is
     * driven — the chase rig re-derives from it each frame, so shifting the rig would
     * be overwritten; else the camera's parent; else the camera), every registered
     * world root, and every onOriginShift listener (which fixes its own node + JS).
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
    _update = () => {
        if (this.scene != null && !this.hidden) {
            // Advance combat with real elapsed time (regen + scheduled chain reactions),
            // frame-rate independent and separate from the render throttle below.
            const dt = this.engine.getDeltaTime() / 1000;
            if (dt > 0)
                this.combat.tick(dt);
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
    onResize() {
        if (this.engine && !this._resizing) {
            this._resizing = true;
            this.engine.resize();
            this._resizing = false;
        }
    }
    loadScene = async (path, file, processCallback) => {
        BABYLON.SceneLoader.Append(path, file, this.scene, processCallback);
    };
    _notifyNode(node) {
        if (node instanceof HTMLElement &&
            typeof node.sceneReady === 'function' &&
            !this._notifiedNodes.has(node)) {
            this._notifiedNodes.add(node);
            node.sceneReady(this, this.scene);
        }
    }
    _disposeNode(node) {
        if (node instanceof HTMLElement &&
            this._notifiedNodes.has(node) &&
            typeof node.sceneDispose === 'function') {
            this._notifiedNodes.delete(node);
            node.sceneDispose();
        }
    }
    // Notify parent before children (document order = depth-first pre-order)
    _notifySubtree(node) {
        this._notifyNode(node);
        if (node instanceof HTMLElement) {
            for (const el of Array.from(node.querySelectorAll('*'))) {
                this._notifyNode(el);
            }
        }
    }
    // Dispose children before parent (reverse document order)
    _disposeSubtree(node) {
        if (node instanceof HTMLElement) {
            const els = Array.from(node.querySelectorAll('*'));
            for (let i = els.length - 1; i >= 0; i--) {
                this._disposeNode(els[i]);
            }
        }
        this._disposeNode(node);
    }
    // Notify all descendants in document order (parents before children)
    _notifyAllDescendants() {
        for (const el of Array.from(this.querySelectorAll('*'))) {
            this._notifyNode(el);
        }
    }
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
        this._qualityOff = onQualityChange(() => this._applyHardwareScaling(this.xrActive));
    }
    _applyHardwareScaling(xr) {
        if (this.engine == null)
            return;
        this.engine.setHardwareScalingLevel(qualityBudgets({ xr }).hardwareScaling);
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
        this._childObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (this._sceneReady) {
                        this._notifySubtree(node);
                    }
                }
                for (const node of Array.from(mutation.removedNodes)) {
                    this._disposeSubtree(node);
                }
            }
        });
        this._childObserver.observe(this, { childList: true, subtree: true });
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
            // Mount the glass gamepad (if requested) before notifying descendants, so
            // b3dInputFocus sees its source when it wires up input.
            this._setupGamepad();
            // Scene is now ready — notify all existing descendants
            this._sceneReady = true;
            this._notifyAllDescendants();
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
        focus?.inputMappedProvider?.addSource(new XrGamepadSource(controllers));
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
            vrButton.textContent = this.xrActive ? 'Exit VR' : 'Enter VR';
            if (state === BABYLON.WebXRState.IN_XR) {
                // Stereo doubles fill — drop to the XR render-scaling budget on entry, and
                // back to the flat one on exit (the cheap lever that's safe to change live).
                this._applyHardwareScaling(true);
                // Keep tosijs's rAF-batched reactive bindings flushing while in-session.
                restoreRaf ??= this._installXrRafPump(base);
                xrSession ??= this._startDefaultXrExperience(base, controllers);
            }
            else if (state === BABYLON.WebXRState.NOT_IN_XR) {
                this._applyHardwareScaling(false);
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
        const panel = this._attachXrPanel(base, frames.eye);
        // A subtle grid floor — something to stand on and judge motion against.
        const ground = BABYLON.MeshBuilder.CreateGround('xr-ground', { width: 200, height: 200 }, scene);
        ground.isPickable = false;
        // Drop a smidge BELOW y=0 so it doesn't z-fight ("z-chase") with a scene
        // ground / water / terrain at 0 — and so the real scene ground wins visually
        // (the grid only shows through where there's no ground, rather than covering
        // it). Imperceptible underfoot (you stand on the local-floor at 0).
        ground.position.y = -0.05;
        const grid = new GridMaterial('xr-ground-grid', scene);
        grid.majorUnitFrequency = 5;
        grid.minorUnitVisibility = 0.4;
        grid.gridRatio = 1;
        grid.mainColor = new BABYLON.Color3(0.09, 0.11, 0.15);
        grid.lineColor = new BABYLON.Color3(0.25, 0.45, 0.7);
        grid.opacity = 0.7;
        ground.material = grid;
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
        const SCROLL_SPEED = 600; // panel viewBox units / sec at full stick
        // Chase-cam follow state (ported from the biped's XR camera): smoothly track
        // the piloted entity's position AND facing, with head-tracking compensation.
        const chasePos = new BABYLON.Vector3();
        const yawQuat = new BABYLON.Quaternion();
        const mtx = new BABYLON.Matrix();
        let chaseYaw = 0;
        let chaseYawOffset = 0;
        let cockpitYawOffset = 0; // head yaw captured when you take the seat
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
                        // Capture the head's entry yaw so we can recenter the CAMERA to look
                        // out the nose without moving the (correctly-placed) panels.
                        cockpitYawOffset = cam.rotationQuaternion
                            ? cam.rotationQuaternion.toEulerAngles().y
                            : 0;
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
                    if (!scene.pickWithRay(scrollRay, (m) => m === panel.plane)?.hit) {
                        continue;
                    }
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
                panel.dispose();
                for (const p of bodyPanels)
                    p.dispose();
                frames.dispose();
                this.xrFrames = null;
                cam.parent = null;
                ground.dispose();
                grid.dispose();
                rig.dispose();
            },
        };
    }
    // Build a panel SVG from a row list. Each surface (overlay, in-scene) builds
    // its own with independent widget instances bound to the same reactive
    // values, so they stay in sync.
    _makePanel(rows) {
        const n = Math.max(1, rows.length);
        const height = Math.min(520, 28 + n * 48);
        return panel3d({ width: 320, height }, ...rows);
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
                offset: [0, (b.eyeHeight ?? 1.7) + 0.35, 0],
            });
            const panel = attachFramePanel(scene, cam, ef.node, {
                anchor: {
                    position: [0, 0, 0],
                    focus: [0, 0, 1], // faces +Z = toward the viewer (frame turns to face you)
                    revealStartDeg: 26,
                    revealFullDeg: 10,
                },
                title: b.id || 'NPC',
                width: 0.3,
                maxDistance: 8, // don't clutter with distant nameplates
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
                if (host.hasAttribute('hidden')) {
                    host.replaceChildren(this._makePanel(this.scenePanel(this)));
                    host.removeAttribute('hidden');
                }
                else {
                    host.setAttribute('hidden', '');
                }
            });
        }
        // Reveal the gear only when the scenePanel hook actually supplies widgets.
        // (Enter VR is a SEPARATE button grouped next to the gear — see the toolbar —
        // so XR availability no longer gates the gear.)
        if (this.scenePanel(this).length > 0) {
            gear.hidden = false;
        }
    }
    /** Rebuild the flat scene panel from the current rows, if it's open.
     * Call after async state the panel reflects has changed (e.g. a library loaded,
     * or XR availability / session state) so an already-open panel updates. */
    refreshScenePanel() {
        const host = this.parts?.scenePanelHost;
        if (host && !host.hasAttribute('hidden')) {
            host.replaceChildren(this._makePanel(this.scenePanel(this)));
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
            ...this.scenePanel(this),
        ];
        const panelEl = this._makePanel(rows);
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
        const obs = scene.onPointerObservable.add((pi) => {
            const kind = pi.type === T.POINTERDOWN
                ? 'down'
                : pi.type === T.POINTERUP
                    ? 'up'
                    : pi.type === T.POINTERMOVE
                        ? 'move'
                        : '';
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
            }
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
            dispose() {
                base.sessionManager.onXRFrameObservable.remove(frame);
                scene.onPointerObservable.remove(obs);
                tex.dispose();
                mat.dispose();
                plane.dispose();
            },
        };
    }
    disconnectedCallback() {
        if (this._qualityOff) {
            this._qualityOff();
            this._qualityOff = null;
        }
        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = undefined;
        }
        if (this._childObserver) {
            this._childObserver.disconnect();
            this._childObserver = undefined;
        }
        const els = Array.from(this.querySelectorAll('*'));
        for (let i = els.length - 1; i >= 0; i--) {
            this._disposeNode(els[i]);
        }
        this._sceneReady = false;
        super.disconnectedCallback();
    }
    render() {
        super.render();
        const intensity = this.glowLayerIntensity;
        if (intensity > 0) {
            if (!this.glowLayer) {
                this.glowLayer = new BABYLON.GlowLayer('glow', this.scene);
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