/*#
# b3d

The root 3D scene container. All other components (`b3dSun`, `b3dSkybox`, `b3dLoader`, etc.)
must be children of a `b3d` element.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `glowLayerIntensity` | `0` | Glow effect intensity (0 = off) |
| `frameRate` | `30` | Target frame rate |
| `no-xr` | `false` | Suppress the automatic Enter-VR button (WebXR is offered by default when an immersive-vr session is supported) |
| `minElevation` / `maxElevation` | `5` / `70` | Default orbit-camera elevation limits (degrees above the horizon) |
| `minDistance` / `maxDistance` | `2` / `50` | Default orbit-camera zoom limits |

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dSphere, b3dLoader,
  b3dBiped, b3dButton, b3dLight, b3dWater, b3dReflections, b3dCollisions,
  gameController, inputFocus,
} from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span } = elements

const { demo } = tosi({
  demo: {
    showColliders: false,
    time: 19,
  },
})

const scene = '/test-2.glb'
const omnidude = '/omnidude.glb'

const formatTime = (v) => {
  const h = Math.floor(v)
  const m = Math.round((v % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

preview.append(
  b3d(
    // no-xr: this demo drives XR itself via the biped's "Toggle XR" button
    // (cameraType: 'xr'), so the built-in Enter-VR button is suppressed to
    // avoid creating a second XR experience on the same scene.
    { glowLayerIntensity: 1, noXr: true },
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
    b3dButton({
      caption: 'Toggle XR',
      x: -2,
      y: 1.5,
      action: () => {
        const biped = document.querySelector('tosi-b3d-biped[player]')
        if (biped) {
          if (biped.cameraType !== 'xr') {
            biped.cameraType = 'xr'
          } else {
            window.location.reload()
          }
        }
      },
    }),
    b3dLight({ y: 1, z: 0.5, intensity: 0.2, diffuse: '#8080ff' }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 }),
    b3dReflections(),
    b3dCollisions({ debug: demo.showColliders })
  ),
  div(
    { class: 'debug-panel' },
    label(
      input({ type: 'checkbox', bindValue: demo.showColliders }),
      ' show colliders'
    ),
    label(
      'time ',
      input({ type: 'range', min: 0, max: 24, step: 0.1, bindValue: demo.time }),
      ' ',
      span({
        class: 'time-display',
        bind: {
          value: demo.time,
          binding: (el, v) => { el.textContent = formatTime(v) },
        },
      })
    )
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
*/
/*{ "parent": "Core" }*/

import { Component, elements } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { GridMaterial } from '@babylonjs/materials'
import '@babylonjs/loaders'
import { xrControllers, type TosiXRControllerMap } from './gamepad'
import { panel3d, button3d, type Widget3d } from './widgets3d'
import { SvgTexture } from './svg-texture'
import { GlassGamepad, parseGamepadControls } from './glass-gamepad'

const { canvas, div, slot, button } = elements

export type SceneAdditionHandler = (additions: SceneAdditions) => void

export type SceneAdditions = {
  meshes?: BABYLON.AbstractMesh[]
  lights?: BABYLON.Light[]
}

type B3dCallback =
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => void)
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => Promise<void>)

const noop = () => {}

// Read-only local axes reused by the per-frame XR loops (getDirectionToRef
// reads but never mutates them), so we never allocate a Vector3 per frame.
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1)
const XR_RIGHT = new BABYLON.Vector3(1, 0, 0)

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
    gamepad: false as boolean | string,
  }

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
    ':host .enter-vr-button': {
      position: 'absolute',
      bottom: '16px',
      right: '16px',
      zIndex: '20',
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
      position: 'absolute',
      top: '12px',
      right: '12px',
      zIndex: '20',
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
      right: '12px',
      zIndex: '20',
      filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
    },
    ':host .scene-panel-overlay[hidden]': {
      display: 'none',
    },
  }

  content = [
    div({ class: 'spinner', part: 'spinner' }),
    canvas({ part: 'canvas' }),
    button(
      {
        class: 'enter-vr-button',
        part: 'enterVrButton',
        type: 'button',
        hidden: true,
      },
      'Enter VR'
    ),
    // Scene-panel surface: gear toggle + overlay host. Both live in the template
    // (dynamically appending to the shadow root doesn't reliably persist); the
    // host is populated by _setupScenePanel only when a scenePanel is supplied.
    button(
      {
        class: 'scene-panel-gear',
        part: 'scenePanelGear',
        type: 'button',
        title: 'Scene settings',
        hidden: true,
      },
      '⚙'
    ),
    div({ class: 'scene-panel-overlay', part: 'scenePanelHost', hidden: true }),
    slot(),
  ]

  engine!: BABYLON.Engine
  scene!: BABYLON.Scene
  camera?: BABYLON.Camera
  gui?: GUI.GUI3DManager
  glowLayer?: BABYLON.GlowLayer
  xrHelper?: BABYLON.WebXRDefaultExperience
  xrActive = false
  // The split touch control surface, when the `gamepad` attribute is present.
  // b3dInputFocus feeds its poll() into the active input provider.
  glassGamepad?: GlassGamepad
  BABYLON = BABYLON

  declare minElevation: number
  declare maxElevation: number
  declare minDistance: number
  declare maxDistance: number
  declare noXr: boolean

  sceneCreated: B3dCallback = noop
  update: B3dCallback = noop
  // Override the default WebXR setup entirely. When set (not noop) it runs
  // instead of the built-in Enter-VR button — call it to wire your own XR
  // experience (e.g. custom features, teleportation, controller models).
  setupXr: B3dCallback = noop
  // A dual-presence settings panel. Return the widgets to show; the SAME
  // definitions drive a DOM-overlay panel (toggled by a top-right gear icon on
  // flat screens) AND an in-scene panel floating above the viewer in XR. In XR
  // an "Exit VR" button is prepended automatically (you can't click a DOM
  // button inside a headset). Both surfaces bind to the same reactive values,
  // so they stay in sync. Defaults to a function (not undefined) so the element
  // creator recognises it as a settable callback prop, like sceneCreated/update.
  scenePanel: (host: B3d) => Widget3d[] = () => []

  private lastRender = 0
  private sceneListeners: SceneAdditionHandler[] = []
  private pastAdditions: SceneAdditions[] = []
  private _sceneReady = false
  private _childObserver?: MutationObserver
  private _notifiedNodes = new WeakSet<HTMLElement>()
  private _libraries = new Map<string, Set<any>>()

  onSceneAddition(callback: SceneAdditionHandler): void {
    this.sceneListeners.push(callback)
    for (const additions of this.pastAdditions) {
      callback(additions)
    }
  }

  offSceneAddition(callback: SceneAdditionHandler): void {
    const idx = this.sceneListeners.indexOf(callback)
    if (idx > -1) {
      this.sceneListeners.splice(idx, 1)
    }
  }

  register(additions: SceneAdditions): void {
    this.pastAdditions.push(additions)
    for (const callback of this.sceneListeners) {
      callback(additions)
    }
  }

  registerLibrary(type: string, library: any): void {
    if (!this._libraries.has(type)) {
      this._libraries.set(type, new Set())
    }
    this._libraries.get(type)!.add(library)
    this.dispatchEvent(
      new CustomEvent('library-changed', { detail: { type, library } })
    )
  }

  unregisterLibrary(type: string, library: any): void {
    const set = this._libraries.get(type)
    if (set) {
      set.delete(library)
      if (set.size === 0) this._libraries.delete(type)
    }
    this.dispatchEvent(
      new CustomEvent('library-changed', { detail: { type, library } })
    )
  }

  getLibrary(type: string): any | null {
    const set = this._libraries.get(type)
    if (!set || set.size === 0) return null
    return set.values().next().value
  }

  getLibraries(type: string): any[] {
    const set = this._libraries.get(type)
    return set ? [...set] : []
  }

  setActiveCamera(
    camera: BABYLON.Camera,
    options: { attach?: boolean; preventDefault?: boolean } = {}
  ): void {
    const { attach = true, preventDefault = false } = options
    const cnv = this.parts.canvas as HTMLCanvasElement
    if (this.camera != null) {
      this.camera.detachControl()
    }
    this.camera = camera
    this.scene.activeCamera = camera
    if (attach) {
      camera.attachControl(cnv, preventDefault)
    }
  }

  private _update = () => {
    if (this.scene != null && !this.hidden) {
      if (this.update !== noop) {
        this.update(this, BABYLON)
      }
      const now = Date.now()
      if (
        this.xrActive ||
        now - this.lastRender >= 1000 / (this as any).frameRate
      ) {
        this.lastRender = now
        if (this.scene.activeCamera !== undefined) {
          this.scene.render()
        }
      }
    }
  }

  private _resizing = false
  onResize() {
    if (this.engine && !this._resizing) {
      this._resizing = true
      this.engine.resize()
      this._resizing = false
    }
  }

  loadScene = async (
    path: string,
    file: string,
    processCallback?: (scene: BABYLON.Scene) => void
  ): Promise<void> => {
    BABYLON.SceneLoader.Append(path, file, this.scene, processCallback)
  }

  private _notifyNode(node: Node) {
    if (
      node instanceof HTMLElement &&
      typeof (node as any).sceneReady === 'function' &&
      !this._notifiedNodes.has(node)
    ) {
      this._notifiedNodes.add(node)
      ;(node as any).sceneReady(this, this.scene)
    }
  }

  private _disposeNode(node: Node) {
    if (
      node instanceof HTMLElement &&
      this._notifiedNodes.has(node) &&
      typeof (node as any).sceneDispose === 'function'
    ) {
      this._notifiedNodes.delete(node)
      ;(node as any).sceneDispose()
    }
  }

  // Notify parent before children (document order = depth-first pre-order)
  private _notifySubtree(node: Node) {
    this._notifyNode(node)
    if (node instanceof HTMLElement) {
      for (const el of Array.from(node.querySelectorAll('*'))) {
        this._notifyNode(el)
      }
    }
  }

  // Dispose children before parent (reverse document order)
  private _disposeSubtree(node: Node) {
    if (node instanceof HTMLElement) {
      const els = Array.from(node.querySelectorAll('*'))
      for (let i = els.length - 1; i >= 0; i--) {
        this._disposeNode(els[i])
      }
    }
    this._disposeNode(node)
  }

  // Notify all descendants in document order (parents before children)
  private _notifyAllDescendants() {
    for (const el of Array.from(this.querySelectorAll('*'))) {
      this._notifyNode(el)
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    const cnv = this.parts.canvas as HTMLCanvasElement
    cnv.addEventListener('wheel', (e) => e.preventDefault(), { passive: false })
    this.engine = new BABYLON.Engine(cnv, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      // Babylon 8 makes the legacy audio engine opt-in (older versions
      // defaulted it on). Without this, `new BABYLON.Sound()` silently
      // no-ops — it never even fetches the file. b3d-sound depends on it.
      audioEngine: true,
    })
    this.scene = new BABYLON.Scene(this.engine)
    this.scene.collisionsEnabled = true
    this.scene.gravity = new BABYLON.Vector3(0, -9.81 / 60, 0)

    this._childObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (this._sceneReady) {
            this._notifySubtree(node)
          }
        }
        for (const node of Array.from(mutation.removedNodes)) {
          this._disposeSubtree(node)
        }
      }
    })
    this._childObserver.observe(this, { childList: true, subtree: true })

    const init = async () => {
      if (this.sceneCreated !== noop) {
        await this.sceneCreated(this, BABYLON)
      }
      if (this.scene.activeCamera === undefined) {
        const DEG = Math.PI / 180
        const camera = new BABYLON.ArcRotateCamera(
          'default-camera',
          -Math.PI / 2, // alpha (facing -Z)
          60 * DEG, // beta (~30° elevation to start)
          8, // radius
          BABYLON.Vector3.Zero(),
          this.scene
        )
        // beta is measured from straight-up: elevation = 90° - beta. Clamp it so
        // the camera stays between min/maxElevation above the horizon (never
        // under the ground), and clamp radius so you can't zoom out to orbit or
        // in through the scene.
        camera.upperBetaLimit = (90 - this.minElevation) * DEG
        camera.lowerBetaLimit = (90 - this.maxElevation) * DEG
        camera.lowerRadiusLimit = this.minDistance
        camera.upperRadiusLimit = this.maxDistance
        camera.attachControl(cnv, false)
        this.setActiveCamera(camera)
      }
      this.gui = new GUI.GUI3DManager(this.scene)
      this.engine.runRenderLoop(this._update)

      // Mount the glass gamepad (if requested) before notifying descendants, so
      // b3dInputFocus sees its source when it wires up input.
      this._setupGamepad()

      // Scene is now ready — notify all existing descendants
      this._sceneReady = true
      this._notifyAllDescendants()

      // Offer WebXR (non-blocking — it must not delay the canvas reveal).
      void this._setupXR()

      // Mount the gear-toggled DOM-overlay settings panel (flat screens). The
      // in-scene XR copy is built on session entry.
      this._setupScenePanel()

      // Fade in canvas once all pending file loads complete and shaders compile.
      // Falls back to revealing after assets load even if shaders are still
      // compiling, to avoid an indefinitely hidden canvas.
      const spinner = this.parts.spinner as HTMLElement
      let revealed = false
      const reveal = () => {
        if (revealed) return
        revealed = true
        cnv.classList.add('ready')
        spinner.classList.add('hidden')
      }
      const checkReady = () => {
        if (this.scene.getWaitingItemsCount() === 0) {
          this.scene.executeWhenReady(reveal)
          // Fallback: reveal once assets are loaded even if some shaders
          // haven't compiled (e.g. SkyMaterial can take extra frames)
          setTimeout(reveal, 500)
        } else {
          setTimeout(checkReady, 100)
        }
      }
      // Start checking after a brief delay to let child components begin loading
      setTimeout(checkReady, 100)
    }

    init()
  }

  // WebXR is on by default. The `no-xr` attribute opts out; a `setupXr` hook
  // overrides the whole flow. Otherwise, when an immersive-vr session is
  // supported, mount a floating Enter/Exit-VR button wired to a default XR
  // experience (its own UI suppressed so the button matches the host theme).
  private async _setupXR(): Promise<void> {
    if (this.noXr) return
    if (this.setupXr !== noop) {
      await this.setupXr(this, BABYLON)
      return
    }
    if (navigator.xr == null) return
    let supported: boolean
    try {
      supported = await navigator.xr.isSessionSupported('immersive-vr')
    } catch {
      supported = false
    }
    if (!supported || this.xrHelper != null) return

    // Creating the default experience can steal scene.activeCamera (switching
    // to the XR camera on creation), which blanks the flat view before you ever
    // enter VR. Capture the flat camera and restore it; enterXRAsync swaps
    // cameras properly when you actually enter, and restores on exit.
    const flatCamera = this.scene.activeCamera
    const xr = await this.scene.createDefaultXRExperienceAsync({
      disableDefaultUI: true,
    })
    this.xrHelper = xr
    if (flatCamera != null && this.scene.activeCamera !== flatCamera) {
      this.scene.activeCamera = flatCamera
    }
    const base = xr.baseExperience
    if (base == null) return

    const vrButton = this.parts.enterVrButton as HTMLButtonElement
    vrButton.addEventListener('click', async () => {
      try {
        if (this.xrActive) {
          await base.exitXRAsync()
        } else {
          await base.enterXRAsync('immersive-vr', 'local-floor')
        }
      } catch (err) {
        console.warn('XR session change failed', err)
      }
    })
    // A live map of XR controller component states (thumbsticks/buttons), built
    // once so we don't double-register listeners across sessions.
    const controllers: TosiXRControllerMap = xrControllers(xr)
    // The default experience enables teleportation; we drive locomotion
    // ourselves, so remove it to stop the thumbstick fighting our movement.
    try {
      xr.teleportation?.dispose()
    } catch {
      /* teleportation may not have been enabled */
    }

    // In a session the WebXR headset camera takes over (Babylon switches
    // scene.activeCamera to it); the flat-screen orbit camera is restored on
    // exit. On entry we stand the viewer on a walkable floor and wire stick
    // locomotion; on exit we tear it down.
    let xrSession: { dispose: () => void } | undefined
    base.onStateChangedObservable.add((state) => {
      this.xrActive = state === BABYLON.WebXRState.IN_XR
      vrButton.textContent = this.xrActive ? 'Exit VR' : 'Enter VR'
      if (state === BABYLON.WebXRState.IN_XR) {
        xrSession ??= this._startDefaultXrExperience(base, controllers)
      } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
        xrSession?.dispose()
        xrSession = undefined
      }
    })
    // The button is part of the template (hidden) — reveal it now that an XR
    // session is actually available.
    vrButton.hidden = false
  }

  // The built-in XR experience used when no `setupXr` hook is supplied: stand
  // the viewer on a grid floor near the scene, walk with the left stick
  // (relative to head facing), and fly up/down with the right stick. A rig
  // TransformNode is the movable anchor — live head tracking applies as a local
  // transform on top. Returns a disposer that tears everything down on exit.
  private _startDefaultXrExperience(
    base: BABYLON.WebXRExperienceHelper,
    controllers: TosiXRControllerMap
  ): { dispose: () => void } {
    const scene = this.scene
    const cam = base.camera

    const rig = new BABYLON.TransformNode('xr-rig', scene)
    // Keep the flat camera's horizontal viewpoint but stand on the floor
    // (local-floor reference space adds the viewer's real head height).
    const p = this.camera?.position
    rig.position.set(p?.x ?? 0, 0, p?.z ?? -this.minDistance * 2)
    cam.parent = rig

    // The in-scene settings panel (with an Exit-VR button), floating overhead
    // relative to the head and fading in as you tilt up to use it.
    const panel = this._attachXrPanel(base)

    // A subtle grid floor — something to stand on and judge motion against.
    const ground = BABYLON.MeshBuilder.CreateGround(
      'xr-ground',
      { width: 200, height: 200 },
      scene
    )
    ground.isPickable = false
    const grid = new GridMaterial('xr-ground-grid', scene)
    grid.majorUnitFrequency = 5
    grid.minorUnitVisibility = 0.4
    grid.gridRatio = 1
    grid.mainColor = new BABYLON.Color3(0.09, 0.11, 0.15)
    grid.lineColor = new BABYLON.Color3(0.25, 0.45, 0.7)
    grid.opacity = 0.7
    ground.material = grid

    const HORIZ_SPEED = 2.5 // metres/sec
    const VERT_SPEED = 2.0
    const TURN_SPEED = 2.0 // radians/sec at full deflection
    const DEAD = 0.15
    let last = Date.now()
    // Reused scratch vectors — never allocate inside the per-frame loop (in XR
    // that runs at 72-120fps, and the garbage was driving the perf creep).
    const fwd = new BABYLON.Vector3()
    const side = new BABYLON.Vector3()
    const head = new BABYLON.Vector3()
    const tmp = new BABYLON.Vector3()
    const frame = base.sessionManager.onXRFrameObservable.add(() => {
      const now = Date.now()
      const dt = Math.min((now - last) * 0.001, 0.1)
      last = now
      const left = controllers['left']?.['xr-standard-thumbstick']?.axes
      const right = controllers['right']?.['xr-standard-thumbstick']?.axes
      if (
        left != null &&
        (Math.abs(left.x) > DEAD || Math.abs(left.y) > DEAD)
      ) {
        // Walk relative to where the head currently faces (flattened to floor).
        cam.getDirectionToRef(XR_FORWARD, fwd)
        fwd.y = 0
        fwd.normalize()
        cam.getDirectionToRef(XR_RIGHT, side)
        side.y = 0
        side.normalize()
        const step = HORIZ_SPEED * dt
        fwd.scaleToRef(-left.y * step, tmp)
        rig.position.addInPlace(tmp)
        side.scaleToRef(left.x * step, tmp)
        rig.position.addInPlace(tmp)
      }
      if (right != null && Math.abs(right.y) > DEAD) {
        rig.position.y += -right.y * VERT_SPEED * dt // push up to ascend
      }
      if (right != null && Math.abs(right.x) > DEAD) {
        // Smooth-turn around the head (not the rig origin) so you spin in place
        // rather than orbiting when you've stepped off-centre. Rotate, then nudge
        // the rig so the head's world XZ is unchanged.
        head.copyFrom(cam.globalPosition)
        rig.rotation.y += right.x * TURN_SPEED * dt // push right → turn right
        rig.computeWorldMatrix(true)
        cam.computeWorldMatrix()
        rig.position.x += head.x - cam.globalPosition.x
        rig.position.z += head.z - cam.globalPosition.z
      }
    })

    return {
      dispose() {
        base.sessionManager.onXRFrameObservable.remove(frame)
        panel.dispose()
        cam.parent = null
        ground.dispose()
        grid.dispose()
        rig.dispose()
      },
    }
  }

  // Build a panel SVG from a row list. Each surface (overlay, in-scene) builds
  // its own with independent widget instances bound to the same reactive
  // values, so they stay in sync.
  private _makePanel(rows: Widget3d[]): SVGSVGElement {
    const n = Math.max(1, rows.length)
    const height = Math.min(520, 28 + n * 48)
    return panel3d({ width: 320, height }, ...rows)
  }

  // Flat-screen surface: a top-right gear icon toggles the settings panel as a
  // DOM overlay. Only revealed when the scenePanel hook returns widgets.
  private _setupScenePanel(): void {
    const widgets = this.scenePanel(this)
    if (widgets.length === 0) return // nothing to surface on the flat overlay
    const gear = this.parts.scenePanelGear as HTMLButtonElement
    const host = this.parts.scenePanelHost as HTMLElement
    host.appendChild(this._makePanel(widgets))
    gear.addEventListener('click', () => {
      if (host.hasAttribute('hidden')) host.removeAttribute('hidden')
      else host.setAttribute('hidden', '')
    })
    gear.hidden = false
  }

  // Mount the split touch "glass" gamepad when the `gamepad` attribute is
  // present. The value selects/positions controls (parsed by
  // parseGamepadControls); b3dInputFocus feeds glassGamepad.poll() into the
  // active input provider so it drives the focused controllable.
  private _setupGamepad(): void {
    const attr = this.getAttribute('gamepad')
    const prop = (this as any).gamepad
    if (attr == null && (prop === false || prop == null)) return
    const spec = typeof prop === 'string' && prop !== '' ? prop : attr ?? ''
    const { controls } = parseGamepadControls(spec)
    this.glassGamepad = new GlassGamepad({ controls })
    ;(this.shadowRoot ?? this).appendChild(this.glassGamepad.element)
  }

  // In-scene surface: render the panel onto a plane positioned each frame in
  // WORLD space relative to the HEAD (not the rig / flat camera), floating
  // overhead in the direction you face and fading in only as you tilt your head
  // up — so it never obstructs the forward view. Picks route via the scene
  // pointer observable (mouse and XR controllers alike) into the panel's own
  // viewBox coords. Returns a disposer.
  private _attachXrPanel(base: BABYLON.WebXRExperienceHelper): {
    dispose: () => void
  } {
    const scene = this.scene
    const cam = base.camera
    // In-scene panel always carries an Exit-VR button (you can't reach a DOM
    // button inside a headset), plus any scenePanel widgets.
    const rows: Widget3d[] = [
      button3d({
        label: 'Exit VR',
        onClick: () => {
          void this.xrHelper?.baseExperience?.exitXRAsync()
        },
      }),
      ...this.scenePanel(this),
    ]
    const panelEl = this._makePanel(rows) as SVGSVGElement & {
      handlePointer?: (kind: string, x: number, y: number) => void
    }
    const vb = panelEl.viewBox.baseVal

    // Tunables. The panel floats ABOVE+FORWARD relative to the head, so it sits
    // ~50° up the sight-line, and is large enough to read and target.
    const PLANE_W = 1.0 // metres wide (height follows the panel's aspect)
    const FORWARD = 0.85 // metres ahead of the head (horizontal)
    const ABOVE = 1.2 // metres above the eye → ~55° up, well clear of the view
    // Fade window (head-forward Y = sin(pitch)): hidden at/below FADE_IN, full
    // at FADE_FULL. ~9°→~30° of upward tilt.
    const FADE_IN = 0.15
    const FADE_FULL = 0.5

    const plane = BABYLON.MeshBuilder.CreatePlane(
      'xr-panel',
      {
        width: PLANE_W,
        height: PLANE_W * (vb.height / vb.width),
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      scene
    )

    // The panel is near-static, so re-rasterising the SVG at high res every
    // 30ms (the SvgTexture default) was the main XR perf regression — throttle
    // hard and drop the resolution. A settings panel doesn't need 33fps.
    const tex = new SvgTexture({
      scene,
      element: panelEl,
      resolution: 512,
      updateInterval: 200,
    })
    const mat = new BABYLON.StandardMaterial('xr-panel-mat', scene)
    mat.backFaceCulling = false
    mat.emissiveTexture = tex.texture
    mat.opacityTexture = tex.texture
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.disableLighting = true
    plane.material = mat
    plane.visibility = 0
    // Billboard so it always faces the head, upright and un-mirrored, whatever
    // its height/position — no manual orientation math, no lookAt flip.
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL

    const fwd = new BABYLON.Vector3()
    const target = new BABYLON.Vector3()
    let firstFrame = true
    const frame = base.sessionManager.onXRFrameObservable.add(() => {
      const head = cam.globalPosition
      cam.getDirectionToRef(XR_FORWARD, fwd)
      const lookUp = fwd.y // world-space forward Y = sin(pitch); >0 looking up
      fwd.y = 0
      if (fwd.lengthSquared() < 1e-4) fwd.set(0, 0, 1) // looking straight up/down
      fwd.normalize()
      target.set(
        head.x + fwd.x * FORWARD,
        head.y + ABOVE,
        head.z + fwd.z * FORWARD
      )
      // Snap into place on the first frame (no fly-in), then leash so it
      // follows your facing without feeling glued to your face.
      if (firstFrame) {
        plane.position.copyFrom(target)
        firstFrame = false
      } else {
        BABYLON.Vector3.LerpToRef(plane.position, target, 0.2, plane.position)
      }
      plane.visibility = Math.max(
        0,
        Math.min(1, (lookUp - FADE_IN) / (FADE_FULL - FADE_IN))
      )
    })

    const T = BABYLON.PointerEventTypes
    let vx = 0
    let vy = 0
    const obs = scene.onPointerObservable.add((pi) => {
      const kind =
        pi.type === T.POINTERDOWN
          ? 'down'
          : pi.type === T.POINTERUP
          ? 'up'
          : pi.type === T.POINTERMOVE
          ? 'move'
          : ''
      // Only interactive while it's actually visible (you're looking at it).
      if (
        !kind ||
        plane.visibility < 0.5 ||
        typeof panelEl.handlePointer !== 'function'
      )
        return
      const pick = pi.pickInfo
      const uv =
        pick?.hit && pick.pickedMesh === plane
          ? pick.getTextureCoordinates()
          : null
      if (uv) {
        vx = uv.x * vb.width
        vy = (1 - uv.y) * vb.height
      }
      // Route every event; the panel manages press-capture and hover itself.
      if (kind === 'move' && !uv) panelEl.handlePointer('leave', 0, 0)
      else if (kind === 'down' && !uv) return
      else panelEl.handlePointer(kind, vx, vy)
    })

    return {
      dispose() {
        base.sessionManager.onXRFrameObservable.remove(frame)
        scene.onPointerObservable.remove(obs)
        tex.dispose()
        mat.dispose()
        plane.dispose()
      },
    }
  }

  disconnectedCallback(): void {
    if (this.glassGamepad) {
      this.glassGamepad.dispose()
      this.glassGamepad = undefined
    }
    if (this.xrHelper) {
      this.xrHelper.dispose()
      this.xrHelper = undefined
    }
    if (this._childObserver) {
      this._childObserver.disconnect()
      this._childObserver = undefined
    }
    const els = Array.from(this.querySelectorAll('*'))
    for (let i = els.length - 1; i >= 0; i--) {
      this._disposeNode(els[i])
    }
    this._sceneReady = false
    super.disconnectedCallback()
  }

  render(): void {
    super.render()
    const intensity = (this as any).glowLayerIntensity
    if (intensity > 0) {
      if (!this.glowLayer) {
        this.glowLayer = new BABYLON.GlowLayer('glow', this.scene)
      }
      this.glowLayer.intensity = intensity
    } else if (this.glowLayer) {
      this.glowLayer.dispose()
      this.glowLayer = undefined
    }
  }
}

export const b3d = B3d.elementCreator({ tag: 'tosi-b3d' })
