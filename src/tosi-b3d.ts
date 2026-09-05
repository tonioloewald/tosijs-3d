/*#
# b3d

The root 3D scene container. All other components (`b3dSun`, `b3dSkybox`, `b3dLoader`, etc.)
must be children of a `b3d` element.

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dSphere, b3dLoader,
  b3dBiped, ualAnimationStates, assetUrl, b3dButton, b3dLight, b3dWater, b3dReflections, b3dCollisions,
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
// A Quaternius UAL rig — 1.83 m, feet at the origin, 27 curated clips off the
// CDN (the full library is 120 clips and 20 MB; see ../static-assets). Replaces
// omnidude.glb, which measured 0.88 m: half human scale, about as tall as a
// Kenney table, while this engine's movement constants were always human
// numbers. See CLAUDE.md → "Scale: a person is 1.8 m".
//
// Real Jog_Bwd_Loop and Crouch_* clips also retire two fakes: walking backwards
// was the walk cycle in reverse, and sneaking had no crouch to hold.
const person = assetUrl('quaternius/UAL1_core.glb')

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
      b3dBiped({ url: person, animationStates: ualAnimationStates(), x: 5, ry: 135, player: true, cameraType: 'follow', initialState: 'idle' }),
    ),
    b3dBiped({ url: person, animationStates: ualAnimationStates(), x: -4, z: 3, ry: 45, initialState: 'idle' }),
    b3dBiped({ url: person, animationStates: ualAnimationStates(), x: 3, z: -2, initialState: 'dance' }),
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

## Demo — pause, start screens, and the VR entry gesture

> **⚠️ EXPERIMENTAL.** The flat behaviour below is verified; the VR half — the
> Continue tap carrying a user gesture into `enterXRAsync`, and taking the
> headset off pausing — has not been through a headset yet. That's the half the
> feature is *for*, so treat these attributes as unsettled until it has.


A second, deliberately small scene. It starts paused with its own panel, so the
first thing you see is a Start screen; backgrounding the tab pauses it again.

The reason this shape matters is not tidiness. **`enterXRAsync` requires a user
gesture** — a scene cannot enter VR on load, the browser refuses. So "come up
paused, put the headset on, press Continue" is the only arrangement that
reliably enters VR. `enterXrOnResume` closes the loop: set it on the scene below
and the button changes to "Continue in VR" on a device that has it. (Leaving VR
pauses in every scene now, not only this one — entering unpauses, so leaving has
to be its inverse or it is not a pair.)

```js
import { b3d, b3dBox, b3dSphere, label3d, button3d, select3d, sceneDelta } from 'tosijs-3d'
import { demoStage } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const demo = tosi({ pauseDemo: { state: 'paused since load', spin: 'medium' } })
// rad/s. The old values topped out at ~10s per revolution, which does not read
// as motion — it reads as a still image. `medium` is now a turn every ~3s.
// DEGREES per second — `ry` is degrees (see AbstractMesh). `medium` is one
// revolution every two seconds.
const RATE = { slow: 60, medium: 180, fast: 420 }

// `glow` is self-illumination as a fraction of `color`; `glowLayerIntensity` on
// the scene is what makes it bloom past the edges. Both, or it just looks pale.
const cube = b3dBox({ meshName: 'spinner', size: 1.4, y: 0.9, color: '#a8382c', glow: 0.26 })
const moon = b3dSphere({ meshName: 'moon', diameter: 0.5, y: 1.6, color: '#f2d98a', glow: 0.7, glowColor: '#ffd34d' })

const scene = b3d(
  {
    startPaused: true,
    // pauseWhenHidden is ON by default — switch to another tab and come back.
    frameRate: 60,
    glowLayerIntensity: 0.5,
    // Replace the built-in rows. `resume` is handed in: whatever you build has
    // to be able to let the player back in.
    pausePanel: (host, resume) => [
      label3d({ text: 'PAUSED', bold: true }),
      button3d({ label: 'Continue', handleClick: resume }),
    ],
    // The SAME control, in the ⚙ panel — so you can change the speed while it
    // is RUNNING and watch it change, instead of only while it is frozen. Both
    // panels bind the one `demo.pauseDemo.spin` value, so they never disagree.
    scenePanel: () => [
      select3d({
        label: 'spin',
        value: demo.pauseDemo.spin,
        options: ['slow', 'medium', 'fast'],
      }),
    ],
    update: (host) => {
      // Never runs while paused — that is the point. The cube freezing IS the
      // demo, so leave the readout to the events below.
      const rate = RATE[demo.pauseDemo.spin.valueOf()] ?? RATE.medium
      // `ry`, not `mesh.rotation.y` — AbstractMesh writes a rotationQuaternion
      // from rx/ry/rz every frame, so a euler write is silently overwritten.
      cube.ry += rate * host.frameDelta
    },
    sceneCreated(el) {
      // THE HONEST TEST. The cube stops because `update` isn't called — easy,
      // and it would look identical if pause did nothing but skip that one
      // callback. The moon flies on the RENDER OBSERVABLE off `sceneDelta`,
      // which is where a paused scene used to keep right on simulating: an
      // adopter measured 66m of travel during a 3-second pause. If pause is
      // real, BOTH freeze.
      let t = 0
      el.scene.registerBeforeRender(() => {
        t += sceneDelta(el.scene)
        moon.x = Math.cos(t) * 3.2
        moon.y = 1.6 + Math.sin(t * 2) * 0.5
        moon.z = Math.sin(t) * 3.2
      })
    },
  },
  ...demoStage({ texture: '/tosi-warhol-testgrid.svg', size: 40, timeOfDay: 11 }),
  cube,
  moon
)

// Both events carry what a game needs to react: `reason` distinguishes "the
// player asked" from "the tab went away".
scene.addEventListener('pause', (e) => {
  demo.pauseDemo.state = `paused (${e.detail.reason})`
})
scene.addEventListener('resume', () => {
  demo.pauseDemo.state = 'running'
})
// Orientation comes from the VIEWPORT, so it works where screen.orientation
// doesn't — rotate a phone, or make the window taller than it is wide.
scene.addEventListener('orientation', (e) => {
  demo.pauseDemo.state = `${e.detail.orientation} ${e.detail.width}x${e.detail.height}`
})

const readout = document.createElement('div')
readout.style.cssText = 'font: 13px ui-monospace, monospace; padding: 6px'
demo.pauseDemo.state.observe(() => {
  readout.textContent = `state: ${demo.pauseDemo.state.valueOf()}   ·   scene.paused: ${scene.paused}`
})
readout.textContent = 'state: paused since load'

const bar = document.createElement('div')
bar.style.cssText = 'display: flex; gap: 8px; padding: 6px'
for (const [label, fn] of [
  ['pause()', () => scene.pause('user')],
  ['resume()', () => scene.resume()],
  ['togglePause()', () => scene.togglePause()],
]) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = fn
  bar.append(b)
}

preview.append(scene, readout, bar)
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
| `gamepadFade` | `'on'` | `'off'` keeps the glass gamepad visible instead of fading it once a mouse/keyboard/hardware pad is used |
| `minElevation` / `maxElevation` | `5` / `70` | Default orbit-camera elevation limits (degrees above the horizon) |
| `minDistance` / `maxDistance` | `2` / `50` | Default orbit-camera zoom limits |
*/
/*{ "parent": "Core", "order": 100 }*/

import { Component, elements, updates } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { GridMaterial } from '@babylonjs/materials'
import '@babylonjs/loaders'
import { xrControllers, type TosiXRControllerMap } from './gamepad.js'
import {
  fitPanel,
  panel3d,
  button3d,
  iconBar3d,
  label3d,
  textBlock3d,
  type Widget3d,
} from './widgets3d.js'
import { handlerOf } from './handler-of.js'
import { panelFitWidth } from './widgets3d-layout.js'
import { w3dTheme } from './w3d-theme.js'
import type { Medium } from './medium.js'
import { SvgTexture } from './svg-texture.js'
import { b3dSvgPlane, type B3dSvgPlane } from './b3d-svg-plane.js'
import { createMakers, type Makers } from './make-mesh.js'
import {
  openPopup,
  type PopupSurface,
  type PopupSurfaceOptions,
} from './popup-surface.js'
import { cameraIsAttached, isOff, markUiMesh } from './b3d-utils.js'
import { faceViewer } from './dialog-placement.js'
import { svgIcons } from './svg-icons.js'
import { CombatWorld } from './destroyable.js'
import { b3dGamepad } from './glass-gamepad.js'
import { XrGamepadSource } from './xr-gamepad.js'
import { XrFrames, EntityFrame } from './xr-frames.js'
import {
  attachFramePanel,
  placeholderPanelSvg,
  type FramePanelSpec,
} from './frame-panel.js'
import { runProbe, hydrateProfileFromCache } from './b3d-probe.js'
import {
  compositeFog,
  approachFog,
  type FogState,
  type FogLayer,
} from './atmosphere.js'
import {
  setQuality,
  qualityBudgets,
  onQualityChange,
  effectiveTier,
  type QualitySetting,
} from './b3d-quality.js'
import {
  allocateAmbient,
  ratchetPool,
  recoverPool,
  type AmbientEffect,
} from './ambient-budget.js'

const { canvas, div, slot, button } = elements

// Site-wide opt-in for the 📊 perf overlay: a host (the doc site) calls
// `showB3dStats()` once so the toggle appears on EVERY scene without a per-scene
// attribute or a URL flag. Library consumers leave it off — their scenes stay
// uncluttered unless they set `stats` or add `#perf`.
let _statsGlobal = false
export const showB3dStats = (on = true): void => {
  _statsGlobal = on
}

// Whether the 📊 toggle should be revealed on a given scene. True when the host
// enabled it site-wide, OR `#perf` / `#debug` (or the `?perf` / `?debug` query
// form) is in the page URL — so it's reachable on a device with no console (the
// whole reason this exists). The HASH form is preferred: it survives the
// doc-browser's client-side navigation (a query string can be dropped when the
// SPA rewrites the URL between docs) and never hits the server. Guarded for
// non-browser contexts (SSR/tests).
const perfDebugEnabled = (): boolean => {
  if (_statsGlobal) return true
  if (typeof window === 'undefined' || !window.location) return false
  const { search, hash } = window.location
  return /(^|[?&])(perf|debug)\b/.test(search) || /\b(perf|debug)\b/.test(hash)
}

/**
 * A contributor to the Perf Stats panel (see `B3d.addDebugSource`). The panel is
 * dual-presence — flat overlay AND in-headset — which is the whole point: there's no
 * console in VR, and VR is where the frame budget is tightest.
 */
export type DebugPanelSource = {
  /** Short header, e.g. `'terrain'`. */
  name: string
  /** Called on every refresh — return LIVE values, not a snapshot. */
  lines: () => string[]
  /** Rendered as buttons. This is how you toggle a profiler on from inside a headset. */
  actions?: Array<{
    label: string | (() => string)
    handleClick?: () => void
    /** @deprecated use `handleClick` — removed in 0.9. */
    onClick?: () => void
  }>
  /** Icon for this source's toggle in the panel's debug icon-bar (an `iconGlyph`
   * name — see [[svg-icons]]). Defaults to `'bug'`. */
  icon?: string
}

export type SceneAdditionHandler = (additions: SceneAdditions) => void

export type SceneAdditions = {
  meshes?: BABYLON.AbstractMesh[]
  lights?: BABYLON.Light[]
}

/** Radar alignment — matches the HUD's `TraceKind` so a blip's faction maps
 * straight to a radar-trace colour/template. Extend freely; these are the seed. */
export type RadarFaction = 'friendly' | 'neutral' | 'hostile' | 'waypoint'

/** Anything detectable on radar — a target, the player's own missile, a waypoint.
 * A radar platform (e.g. the aircraft HUD) enumerates `B3d.radarBlips`, gates each
 * by its `radarProfile` against the platform's range, and plots the survivors. */
export interface RadarBlip {
  /** Detectability multiplier: 1 = detectable at the platform's nominal range,
   * 2 = out to 2× range, 0.05 = very stealthy; NEGATIVE = always detectable
   * regardless of range (e.g. waypoints). */
  radarProfile: number
  faction: RadarFaction
  /** Current world position (floating-origin-corrected), or null if not yet placed
   * (mesh still loading, etc.) — the platform skips a null. */
  radarPosition(): { x: number; y: number; z: number } | null
  /** The mesh a homing weapon should chase when this blip is locked, or null (a
   * positional-only blip like a waypoint — a missile fired at it goes ballistic). */
  radarMesh(): BABYLON.AbstractMesh | null
}

// An NPC nameplate: an entity-pinned frame + a gaze-revealed panel on it.
type Nameplate = {
  ef: EntityFrame
  panel: {
    update: (ctx?: { firstPerson?: boolean }) => void
    dispose: () => void
    readonly debug: {
      reveal: number
      cosine: number
      distance: number
      updates: number
      camera: string
    }
  }
}

type B3dCallback =
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => void)
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => Promise<void>)

const noop = () => {}
const noopRefresh = () => {}

/** A registered fog contributor: underwater, cloud, space… (see atmosphere.ts). */
type FogContributor = () => FogLayer | null

/** One debug source's live <text> nodes, so the panel can update without rebuilding. */
type LiveDebugRow = {
  /** Push the source's current lines into its text block (re-wraps at the last width). */
  update: (lines: string[]) => void
  lines: () => string[]
}

// Read-only local axes reused by the per-frame XR loops (getDirectionToRef
// reads but never mutates them), so we never allocate a Vector3 per frame.
const XR_FORWARD = new BABYLON.Vector3(0, 0, 1)
const XR_RIGHT = new BABYLON.Vector3(1, 0, 0)

export class B3d extends Component {
  static preferredTagName = 'tosi-b3d'

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
    xrGrid: 'auto' as 'on' | 'off' | 'auto',
    // Show the head-locked face crosshair (a pin target for aim-tracking UX). Opt-in:
    // 'off' (default) keeps it out of the way; 'on' shows it (e.g. a tracking weapon).
    xrReticle: 'off' as 'on' | 'off',
    // Start with the ⚙ scene-settings panel open (instead of collapsed to the gear).
    scenePanelOpen: false,
    // When present, mount the split on-screen "glass" gamepad and feed it into
    // the active input system (the unified touch control surface). The value
    // selects/positions controls, e.g. `gamepad="a,b,right_stick(40,0),menu"`;
    // an empty value shows the full default layout. Absent → no gamepad.
    gamepad: false as boolean | string,
    // Scale factor for the glass gamepad clusters. Touch-target pixel sizes vary
    // wildly across devices, so this is exposed for tuning per scene/device.
    gamepadScale: 1,
    /** `'off'` stops the glass gamepad fading when a mouse/keyboard/pad is
     * used (see b3d-gamepad's `fade`). */
    gamepadFade: 'on' as 'on' | 'off',
    // Device quality: 'auto' follows the measured/cached device profile (and, if
    // none exists, runs the probe in the background for next time); 'low' |
    // 'medium' | 'high' force a tier. Drives the `auto` defaults of shadows,
    // reflections, terrain, and the engine render scaling. See b3d-quality.
    quality: 'auto' as QualitySetting,
    // Add a "Perf stats" section to the scene panel (the ⚙ gear overlay AND the
    // in-VR panel — so it's reachable in a headset). Opt-in per scene; a global
    // `#perf` / `#debug` (or `?perf` / `?debug`) in the page URL, or a host calling
    // `showB3dStats()`, reveals it on every scene (handy on mobile, no console
    // needed). Shows `debugState` plus a one-tap hardware-scaling probe. Default off.
    stats: false,

    /*
    PAUSE.

    `pauseWhenHidden` is a string enum, not a boolean, because an HTML boolean
    attribute cannot default to true — an absent attribute is false, which is
    correct HTML and would silently disable the default (tosijs now throws on a
    true-default boolean). Same reason as `gamepadFade` and friends.
    */
    /** Pause automatically when the tab/window goes to the background.
     * ⚠️ EXPERIMENTAL — see the pause demo; the VR path is unvalidated. */
    pauseWhenHidden: 'on' as 'on' | 'off',
    /** Come up paused, showing the pause panel — the "press Start" shape. */
    startPaused: false,
    /**
     * Freeze the clock while the **re-seat** dialog is up (`'on'` default).
     *
     * Re-seating is a comfort action, and being shot while you do it is unfair.
     * But freezing is a decision only a LOCAL world can make — a networked one
     * cannot stop the other players — so set `'off'` for multiplayer and the
     * dialog still gates YOUR input, which is the half that always works.
     *
     * A string enum rather than a boolean because an HTML boolean attribute
     * cannot default to true (absent ⇒ false), and this one wants to.
     */
    reseatFreeze: 'on' as 'on' | 'off',
    /**
     * On resume, enter immersive VR if the device supports it. This is why
     * starting paused matters: `enterXRAsync` REQUIRES a user gesture, and the
     * Continue tap is one. A scene that tried to enter XR on load would be
     * refused by the browser.
     *
     * The other direction — leaving VR pauses — is no longer gated on this; it
     * happens for every scene, because the pair is the point.
     */
    enterXrOnResume: 'off' as 'on' | 'off',
  }

  static shadowStyleSpec = {
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
    /*
    TOP-LEFT, inset equally — not hanging below the gear.

    It sat at `top: 60px` to clear the button that opens it, which meant the
    panel started a lozenge-height down the viewport and pushed its own content
    off the bottom on a short scene. Tonio: "since the scene panel has its own
    close box we might as well just place the panel top-left ... it just pushes
    stuff out of view."

    Covering the gear is fine precisely because the panel closes itself: the
    control that dismisses it is IN it, so the one underneath is not needed
    while it is open. Equal inset top and left so it reads as anchored to the
    corner rather than parked under something.
    */
    ':host .scene-panel-overlay': {
      position: 'absolute',
      top: '12px',
      left: '12px',
      zIndex: '20',
      filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
    },
    ':host .scene-panel-overlay[hidden]': {
      display: 'none',
    },
    // Centred, above everything, and it dims the world behind it — a modal
    // should read as one. `pointer-events` on the backdrop so a stray click
    // lands on the scrim rather than steering the camera underneath.
    ':host .pause-overlay': {
      position: 'absolute',
      inset: '0',
      zIndex: '30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)',
    },
    ':host .pause-overlay[hidden]': {
      display: 'none',
    },
    ':host .pause-overlay > svg': {
      maxWidth: 'min(90%, 420px)',
      height: 'auto',
      filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
    },
    /*
    The panel's HEADER: a right-aligned row of equal, close-sized buttons —
    the icon-bar toggles, then close. Everything that is CHROME lives here, so
    the panel body is entirely the author's controls.
    */
    ':host .scene-panel-head': {
      position: 'absolute',
      top: '4px',
      right: '4px',
      zIndex: '1',
      display: 'flex',
      gap: '4px',
    },
    ':host .scene-panel-btn': {
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
      flex: '0 0 auto',
    },
    ':host .scene-panel-btn svg': {
      width: '15px',
      height: '15px',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    ':host .scene-panel-btn:hover': {
      background: 'rgba(0,0,0,0.85)',
    },
    // A toggle that is ON reads as filled rather than as merely hovered —
    // hover and active must not compete for the same intensity.
    ':host .scene-panel-btn.active': {
      background: 'var(--xr-color, #4a9eff)',
      color: '#fff',
    },
  }

  content = [
    div({ class: 'spinner', part: 'spinner' }),
    canvas({ part: 'canvas' }),
    // Top-left lozenge holding two icon buttons side by side: scene settings
    // (opens the panel) and Enter VR (the purpose-built xrColor mark) — so VR
    // availability is obvious and Enter VR is never a panel row that could
    // scroll/clip. Each button reveals itself when relevant; the lozenge stays
    // hidden until then. (Both live in the template — appending to the shadow
    // root later doesn't persist.)
    div(
      { class: 'scene-lozenge', part: 'sceneToolbar' },
      button(
        {
          class: 'lozenge-button',
          part: 'scenePanelGear',
          type: 'button',
          title: 'Scene settings',
          hidden: true,
          // Disabled until the scene finishes loading (reveal() enables it).
          disabled: true,
        },
        // The tosijs-3d owl (goggles, no cube) rather than a gear: this is the
        // button that opens OUR panel, so it should look like us. The cube-less
        // mark reads at 20px where the full logo does not.
        //
        // The `scenePanelGear` part name stays — a consumer may be styling
        // `::part(scenePanelGear)`, and renaming it to match the artwork would
        // break that for nothing.
        svgIcons.tosiXr()
      ),
      button(
        {
          class: 'lozenge-button',
          part: 'enterVrButton',
          type: 'button',
          hidden: true,
          // Disabled until the scene finishes loading (reveal() enables it).
          disabled: true,
          title: 'Enter VR',
        },
        svgIcons.xrColor()
      )
    ),
    div({ class: 'scene-panel-overlay', part: 'scenePanelHost', hidden: true }),
    /*
    THE PAUSE PANEL, ON A FLAT SCREEN, IS DOM.

    It used to be an in-scene plane in both presentations. That is right in a
    headset — there is no DOM to put it on — and wrong on a monitor, where it
    inherits every problem of being a thing in the world: it has to find a spot
    with clear line of sight, it can be occluded, it has to be raycast to be
    clicked, and it lands wherever the geometry allows rather than where you are
    looking. Tonio: "in flat 3d the continue should be presented in the dom like
    the scene panel."

    Same rule the scene panel already follows — ONE widget list, two
    presentations — and the same reason: the flat one is a DOM overlay because
    flat HAS one.
    */
    div({ class: 'pause-overlay', part: 'pauseHost', hidden: true }),
    slot(),
  ]

  engine!: BABYLON.Engine
  scene!: BABYLON.Scene
  camera?: BABYLON.Camera
  gui?: GUI.GUI3DManager
  glowLayer?: BABYLON.GlowLayer
  xrHelper?: BABYLON.WebXRDefaultExperience
  xrActive = false

  // The scene the pointer last entered / pressed — so that when a page hosts several
  // live demos, global keyboard/gamepad input only drives the one you're interacting
  // with (see `hasInputFocus`). Null until the first interaction (then everything is
  // "focused", i.e. a lone demo just works).
  private static _active: B3d | null = null
  /** True when this scene should consume shared keyboard/gamepad input — it's the
   * active (last hovered/clicked) scene, or none has been touched yet. Controllables
   * gate their input on this so one gamepad doesn't drive every demo on a page. */
  get hasInputFocus(): boolean {
    return B3d._active === null || B3d._active === this
  }
  /** Make this the input-focused scene (also happens on pointerenter/pointerdown). */
  takeInputFocus(): void {
    B3d._active = this
  }
  /** Reference frames (world/rig/body/neck/face) for spatial UI, live only while
   * an XR session is running. Parent in-scene UI to `xrFrames.body` etc. */
  xrFrames: XrFrames | null = null
  /*
  THE ENGINE, REACHABLE FROM THE FRAMEWORK.

  Babylon is a PEER dependency: the consumer supplies it, and a second copy in
  the tree is a real bug (two `Vector3` classes that fail `instanceof` against
  each other, two engine registries). So the safest way to get a `MeshBuilder`
  is to ask the library that is already holding one, rather than to import a
  second specifier and hope the bundler dedupes it.

  Static because it is a property of the FRAMEWORK, not of any one scene —
  `B3d.BABYLON` works before a scene exists. The instance field stays as a
  convenience for the common case, where you have an `el` in hand.

  It is also re-exported from the barrel (`import { BABYLON } from 'tosijs-3d'`),
  which is the form to reach for in a doc example. Before this, examples used a
  bare `BABYLON` global that DOES NOT EXIST — `typeof BABYLON` is `undefined` on
  the page — so every one of them was one line from a ReferenceError.
  */
  static BABYLON = BABYLON
  BABYLON = BABYLON

  /*
  XR SESSION ACCOUNTING — so a headset can answer "is it us or the browser?"

  The Quest does not reliably release WebXR GPU resources between sessions, so
  after a dozen enter/exits everything degrades — including back in the flat
  view, and only a reload clears it. That is browser-level and not ours to fix,
  but it is indistinguishable IN THE HEADSET from a leak of our own, and there is
  no console in VR to check with.

  So: snapshot the scene's resource counts at the FIRST XR entry and report the
  delta in the Perf panel. Flat deltas across many sessions means our teardown is
  clean and the degradation is the browser's; growing deltas means it is ours.
  Tonio hit exactly this after ~20 sessions in one pass and had no way to tell.
  */
  private _xrSessions = 0
  private _xrBaseline: { mesh: number; mat: number; tex: number } | null = null

  private _makers?: Makers
  /**
   * Babylon primitives with the easy-to-forget parts done: material from
   * `color`/`glow`, `register()` so the sun and reflections see it, and
   * `computeWorldMatrix` so a ray this frame doesn't find it at the origin.
   *
   * `el.make.box({ y: 1, color: '#c33' })`. Same shape as a library's
   * `lib.make.scout({ y: 1 })` — one vocabulary whether you're making a
   * primitive or a model. See `make-mesh`.
   */
  get make(): Makers {
    return (this._makers ??= createMakers(this))
  }

  /**
   * Open a popup as its own SURFACE — another plane, floating above the opener,
   * rather than more rows crammed into the panel you already have.
   *
   * See `popup-surface`: it can be owned (travels and dies with its opener) or
   * torn off (promoted to world space, preserving pose, and draggable).
   */
  openPopup(opts: PopupSurfaceOptions): PopupSurface {
    return openPopup(this, opts)
  }

  declare minElevation: number
  declare maxElevation: number
  declare minDistance: number
  declare maxDistance: number
  declare noXr: boolean
  declare xrGrid: 'on' | 'off' | 'auto'
  declare xrReticle: 'on' | 'off'
  declare scenePanelOpen: boolean
  declare stats: boolean
  declare pauseWhenHidden: 'on' | 'off'
  declare startPaused: boolean
  declare reseatFreeze: 'on' | 'off'
  declare enterXrOnResume: 'on' | 'off'

  // ─── Pause ────────────────────────────────────────────────────────────────
  private _paused = false
  private _pausePanel: B3dSvgPlane | null = null
  private _pauseWatch: (() => void) | null = null
  private _cameraWasAttached = false
  // Snapshot of the flat ORBIT camera taken on XR entry, restored on exit. An
  // ArcRotateCamera orbits a target, so Babylon's default "carry the XR pose
  // back" copies your walked-to headset position into it and recomputes a low
  // orbit angle — you exit VR looking at the scene from the floor (Tonio, VR
  // pass 2). Free/walkable cameras CAN adopt an arbitrary pose, so they keep the
  // carry-back (which is the symmetric behaviour that was liked); only orbit
  // cameras, for which it's meaningless, are restored.
  private _flatOrbitState: {
    alpha: number
    beta: number
    radius: number
    target: BABYLON.Vector3
  } | null = null

  /** Is the simulation held? Rendering continues — the panel has to be drawn. */
  get paused(): boolean {
    return this._paused
  }

  /**
   * HOLD THE SIMULATION. Rendering keeps going (a frozen frame plus a panel is
   * the point; stopping the render loop would leave the panel invisible and the
   * canvas stale), but time does not advance: no combat tick, no fog, no
   * `update` hook, and `B3dControllable` sees an empty input so nothing drifts
   * while you are away.
   *
   * `reason` is carried on the `pause` event so a game can tell "the player
   * asked" from "the tab went away" — a settings menu and an interruption
   * deserve different handling.
   */
  /**
   * Modal input gate — the controls go dead, the world does NOT stop.
   *
   * For a dialog that borrows a control you also play with: the re-seat prompt
   * asks for a trigger pull, and without this that same pull fires the gun.
   * Deliberately not `pause()`: a pause raises the pause panel, can enter XR on
   * resume, and clobbers an existing pause when it lifts. Read by
   * `B3dControllable._update`.
   */
  private _inputSuppressed = false
  get inputSuppressed(): boolean {
    return this._inputSuppressed
  }
  suppressInput(on: boolean): void {
    this._inputSuppressed = on
  }

  /**
   * Stop the CLOCK for a transient modal — no pause panel, no resume semantics.
   *
   * `pause()` is a user-facing state: it raises the panel, can enter XR on
   * resume, and lifting it would clobber a pause the user set themselves. A
   * dialog that lasts two seconds wants none of that; it just wants the world
   * to hold still. This publishes `b3dFrameDelta = 0` exactly as a pause does,
   * so everything on `sceneDelta` stops, and lifts without touching pause state
   * (a scene paused underneath STAYS paused).
   *
   * **Local only, by definition.** Freezing is a decision your machine can make
   * and a networked world cannot honour — you cannot stop other players'
   * clocks. So `suppressInput` is the floor (your controls go dead, the world
   * carries on) and this is policy on top, which is why the re-seat dialog
   * always gates input and only optionally freezes (`reseatFreeze`).
   */
  private _frozen = false
  get frozen(): boolean {
    return this._frozen
  }
  freeze(on: boolean): void {
    if (on === this._frozen) return
    this._frozen = on
    // Don't hand the held time back as one giant step on the first live frame.
    if (!on) this.lastRender = Date.now()
  }

  pause(reason: 'user' | 'hidden' | 'xr' | 'start' | string = 'user'): void {
    if (this._paused) return
    this._paused = true
    this._showPausePanel()
    // The transport row reads `paused` to choose its label and icon, so the
    // panel has to be told the state moved — see `resume` for the report.
    this._repaintPanels()
    this.dispatchEvent(
      new CustomEvent('pause', { detail: { reason }, bubbles: true })
    )
  }

  /** Let time run again, and (if `enterXrOnResume`) take the user into VR —
   * this call is expected to be inside a user gesture, which is what makes
   * entering XR legal at all. */
  resume(): void {
    if (!this._paused) return
    this._paused = false
    this._hidePausePanel()
    /*
    REPAINT THE PANEL — the state it displays has changed underneath it.

    The `__pause` row picks its label and icon from `this.paused`, but nothing
    repainted the panel when that flipped, so resuming from the pause DIALOG
    left the panel still offering Play. Tonio: "If you click continue, the PLAY
    button remains visible on the panel (it doesn't update)."

    It only looked right before because the common path was pressing the panel's
    own button, which reopens the panel afterwards. A second route to the same
    state — the dialog — had no reason to.
    */
    this._repaintPanels()
    // A resume must not deliver the whole absence as one frame. `frameDelta` is
    // already clamped to 0.1s, but resetting the baseline keeps even that away.
    this.lastRender = Date.now()
    this.dispatchEvent(new CustomEvent('resume', { bubbles: true }))
    if (this.enterXrOnResume === 'on' && !this.xrActive) {
      const base = this.xrHelper?.baseExperience
      if (base != null) {
        // Flush rAF-batched work BEFORE handing the frame clock to the
        // compositor — a render queued at the moment of entry is stranded for
        // the whole session (see _installXrRafPump).
        void updates()
          .then(() => base.enterXRAsync('immersive-vr', 'local-floor'))
          .catch(() => {
            /* no headset, or the user declined — staying flat is fine */
          })
      }
    }
  }

  /**
   * The default pause panel: a title and a Continue button, centred in front of
   * the camera. Camera-relative so it works flat AND in a headset without a
   * second implementation — the same choice `b3d-death` makes.
   */
  private _showPausePanel(): void {
    if (this._pausePanel != null || this.scene == null) return
    /*
    TAKE THE CAMERA'S HANDS OFF THE POINTER FIRST.

    The panel is IN THE SCENE, so a tap on it is also a tap on the canvas — and
    the camera's own input gets it too. Reported from a phone: the first attempt
    to press Continue was read as a pinch-zoom, which moved the camera through
    the panel and hid it, so the button had to be un-zoomed back into reach
    before it could be pressed. A pause panel you have to fight the camera to
    reach is worse than no pause panel.

    Freezing the camera is also just what "paused" means. Restored on resume,
    and only if we were the ones who detached it.
    */
    /*
    Record whether the camera was REALLY attached, not merely that one exists.

    This flag used to be set to `true` whenever `this.camera != null`, which
    made the comment above it vacuous — it claimed "only if we were the ones who
    detached it" and then recorded nothing of the sort. Every gameplay camera in
    this library is installed unattached (`setActiveCamera(cam, {attach: false})`
    in b3d-biped and b3d-input-focus, and the death rig's orbit camera), so
    resuming HANDED THE CANVAS to a follow camera that was deliberately never
    given it: Babylon's FollowCamera wires arrows/wheel/drag by default, and the
    arrows are also KeyboardGamepad's right stick, so the player's own look keys
    would drive Babylon's rig at the same time. Reachable with no opt-in —
    `pauseWhenHidden` defaults on, so tab away, tab back, Continue, drag.

    Asking Babylon is better than remembering what we did, because several
    components attach or detach the camera directly without going through
    `setActiveCamera` (b3d-galaxy, b3d-svg-plane, the XR restore) and a
    remembered flag goes stale behind them.
    */
    this._cameraWasAttached = cameraIsAttached(this.camera)
    if (this._cameraWasAttached) this.camera?.detachControl()
    const rows = this.pausePanel(this, () => this.resume()) ?? [
      label3d({ text: 'Paused', bold: true }),
      button3d({
        label: this.enterXrOnResume === 'on' ? 'Continue in VR' : 'Continue',
        // The tap IS the user gesture that makes entering XR legal.
        handleClick: () => this.resume(),
      }),
    ]
    // Sized to its CONTENT — `rows` comes from the consumer's `pausePanel`
    // hook, so a guessed height is a guess about someone else's widgets.
    const { svg, height: svgH } = fitPanel(rows, { width: 320, maxHeight: 560 })

    /*
    FLAT: the DOM. IMMERSIVE: a plane in the scene.

    ONE widget list, two presentations — the scene panel's rule, applied to the
    modal that most needed it. On a monitor a DOM overlay is simply better on
    every axis that has bitten this panel: it cannot be occluded, it cannot be
    placed somewhere odd by a line-of-sight cast, it needs no raycast to be
    clicked, and it is exactly where you are already looking. All of that
    machinery exists because a HEADSET has no DOM, which is the only place it
    earns its cost.

    `panel3d` hangs `handlePointer` off the SVG for the in-scene path, but as a
    DOM node the widgets' own listeners work natively — the same element,
    unmodified, in both.
    */
    if (!this.xrActive) {
      const host = this.parts.pauseHost as HTMLElement | undefined
      if (host != null) {
        host.replaceChildren(svg)
        host.removeAttribute('hidden')
        return
      }
    }

    /*
    FIT THE VIEWPORT, don't assume a desktop one.

    A fixed 1.1-wide panel at z=2.2 is comfortable on a 16:9 monitor and TOO
    WIDE on a phone held upright: at the default ~0.8 rad vertical FOV the
    visible width there is about 0.86 world units, so the panel's edges — and
    with them the button — sit off-screen. Reported from a phone: the button had
    to be un-zoomed back into reach.

    So derive the size from the camera's actual FOV and aspect, and take the
    smaller of "as wide as it wants" and "80% of what's visible".
    */
    const z = 2.2
    const cam = this.scene.activeCamera
    const fov = (cam as BABYLON.FreeCamera)?.fov ?? 0.8
    const aspect = this.engine.getAspectRatio(cam as BABYLON.Camera) || 1.6
    const width = panelFitWidth(fov, aspect, z, 1.1)
    const plane = b3dSvgPlane({
      cameraRelative: true,
      // World-placed, like the respawn panel: a thing you read and then press
      // should not follow every glance, but must still be findable — so it
      // comes to you if you look away for ~2s. See dialog-placement.
      placement: 'world',
      width,
      height: width * (svgH / 320),
      z,
      y: 0,
      resolution: 512,
      pointerEvents: 'on',
    }) as B3dSvgPlane
    plane.svgElement = svg
    this._pausePanel = plane
    this.appendChild(plane)
  }

  private _hidePausePanel(): void {
    const host = this.parts?.pauseHost as HTMLElement | undefined
    if (host != null) {
      host.replaceChildren()
      host.setAttribute('hidden', '')
    }
    this._pausePanel?.remove()
    this._pausePanel = null
    if (this._cameraWasAttached && this.camera != null) {
      this.camera.attachControl(this.parts.canvas as HTMLCanvasElement, false)
    }
    this._cameraWasAttached = false
  }

  /**
   * Watch the things that should pause a scene without being asked.
   *
   * BACKGROUNDING: a hidden tab's rAF is throttled to nothing anyway, so the
   * value here isn't saving work — it's that the player comes back to a held
   * frame and a panel rather than to a world that carried on without them.
   *
   * ORIENTATION: reported, not acted on. A phone rotating is sometimes a pause
   * ("I put it down") and sometimes nothing at all, and only the game knows
   * which — so this dispatches `orientation` with the new value and lets the
   * game decide. Note that TILT (deviceorientation) is a different, permissioned
   * API on iOS and deliberately not touched here.
   */
  private _watchPause(): void {
    if (this._pauseWatch != null) return
    const onVisibility = () => {
      if (isOff(this.pauseWhenHidden)) return
      // NOT while immersive: some browsers report the page hidden during an XR
      // session, and pausing there would fight the headset for no reason.
      if (document.hidden && !this.xrActive) this.pause('hidden')
    }
    /*
    ORIENTATION FROM THE VIEWPORT, not from `screen.orientation`.

    The Orientation API is the obvious source and the wrong one to DEPEND on —
    it is patchy on iOS, and a scene that only listens to it hears nothing on
    the devices that rotate most. But the viewport always tells the truth: when
    the device turns, `innerWidth`/`innerHeight` swap, and that is observable
    everywhere. `screen.orientation` is still read when present, for the finer
    `type`/`angle` a game may want — as extra detail, never as the trigger.

    Deliberately the VIEWPORT and not this element's own box: an embedded scene
    in a doc page is a small rectangle whose aspect says nothing about which way
    the phone is being held. Both are reported so a game can use either.
    */
    const orientationOf = () =>
      window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape'
    let last = orientationOf()
    const onResize = () => {
      const now = orientationOf()
      if (now === last) return // a resize is not a rotation
      last = now
      this.dispatchEvent(
        new CustomEvent('orientation', {
          detail: {
            orientation: now,
            width: window.innerWidth,
            height: window.innerHeight,
            // Present on most platforms, absent on some iOS versions — which is
            // exactly why it isn't the trigger.
            type: screen.orientation?.type,
            angle: screen.orientation?.angle,
          },
          bubbles: true,
        })
      )
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    // orientationchange fires before the viewport settles on some browsers, so
    // it's a second nudge into the same debounced check, not a separate path.
    window.addEventListener('orientationchange', onResize)
    this._pauseWatch = () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }

  /** Flip it. What the default panel's button and a pause key both want. */
  togglePause(): void {
    if (this._paused) this.resume()
    else this.pause('user')
  }

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

  /**
   * The centred in-scene panel shown while paused. Return your own rows to
   * replace the default (a title and a Continue button) — a title screen, a
   * settings menu, a "you were away" summary.
   *
   * `resume` is passed in rather than left to be found: whatever you build must
   * be able to let the player back in, and a pause panel with no way out is the
   * failure mode this whole feature exists to avoid.
   *
   * Defaults to a function (not undefined) so the element creator treats it as
   * a settable prop, like `scenePanel`.
   */
  pausePanel: (host: B3d, resume: () => void) => Widget3d[] | null = () => null

  // Body-anchored XR panels for the embodied player: pinned to a reference frame
  // (default `body`) and revealed by looking toward them. Defaults to placeholder
  // inventory panels over each shoulder and a quick-access/holster panel at the
  // waist; override to supply your own (positions, presets, custom SVG). Like
  // scenePanel, defaults to a function so the element creator treats it as a prop.
  bodyPanels: (host: B3d) => FramePanelSpec[] = (host) => {
    // Declarative <tosi-b3d-panel> children, if any, take over entirely — so a
    // scene tunes its own panels. Otherwise fall back to the default set.
    const declared = Array.from(host.querySelectorAll('tosi-b3d-panel'))
      .map((el) =>
        (el as unknown as { toSpec?: () => FramePanelSpec }).toSpec?.()
      )
      .filter((s): s is FramePanelSpec => s != null)
    if (declared.length) return declared
    // Anchored in the EYE frame (your head position, rig yaw) at angular offsets,
    // so they ride your real eye through chase head-compensation and stay put as
    // you stand/sit or glance — only swinging when you actually turn.
    const panels: FramePanelSpec[] = [
      { frame: 'eye', anchor: 'left-shoulder', title: 'Inventory' },
      { frame: 'eye', anchor: 'right-shoulder', title: 'Inventory' },
      { frame: 'eye', anchor: 'waist', title: 'Quick Access' },
      { frame: 'left-hand', anchor: 'wrist', title: 'Menu', width: 0.09 },
    ]
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
      })
    }
    return panels
  }

  private lastRender = 0

  /** Seconds of wall clock since the previous rendered frame (clamped to

   * 100ms so a backgrounded tab can't teleport the sim). Use this — NOT

   * `engine.getDeltaTime()` — for anything advancing state inside a scene

   * observer; see the note in `_update`. */

  frameDelta = 1 / 60
  private sceneListeners: SceneAdditionHandler[] = []
  private pastAdditions: SceneAdditions[] = []
  private _sceneReady = false
  // Pull-model readiness: B3dChild components call whenReady() from their own
  // connectedCallback to insert themselves once the scene is up. Runs the callback
  // immediately if the scene is already ready, else queues it for the flush below.
  private _readyQueue: Array<() => void> = []
  // Durable — see whenDisposed. NOT cleared by teardown, so a handler
  // registered once still fires for the scene after next.
  private _disposeHandlers: Array<() => void> = []
  private _libraries = new Map<string, Set<any>>()

  /**
   * Run `cb` when the scene is ready — now if it already is, else on scene-ready.
   *
   * **It is a promise, not a hope.** A queued callback survives a teardown and
   * fires against the NEXT scene, because the alternative is the failure this
   * whole area specialises in: register, have the scene torn down before it was
   * ready, and your callback is dropped with no error and nothing to observe.
   * If the element is never re-added the callback is simply garbage along with
   * it, which costs nothing.
   */
  whenReady(cb: () => void): void {
    if (this._sceneReady) cb()
    else this._readyQueue.push(cb)
  }

  /**
   * Run `cb` when the scene is torn down — the other half of `whenReady`, and
   * the half that did not exist. Returns an unsubscribe.
   *
   * Anything holding a reference INTO the scene (a mesh, a material, an
   * observer, a timer closing over one) needs this: after teardown those
   * references are to a disposed scene, and Babylon's failure mode there is a
   * black material that still reports `isReady()` — silent, not loud.
   *
   * Subscriptions are durable across a rebuild; scene STATE is not. So a
   * handler registered once keeps working for every subsequent scene, and does
   * not need re-registering.
   */
  whenDisposed(cb: () => void): () => void {
    this._disposeHandlers.push(cb)
    return () => {
      const i = this._disposeHandlers.indexOf(cb)
      if (i > -1) this._disposeHandlers.splice(i, 1)
    }
  }

  addSceneListener(callback: SceneAdditionHandler): void {
    this.sceneListeners.push(callback)
    for (const additions of this.pastAdditions) {
      callback(additions)
    }
  }

  removeSceneListener(callback: SceneAdditionHandler): void {
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
  private _worldRoots = new Set<BABYLON.TransformNode>()
  private _originShiftListeners: Array<(dx: number, dz: number) => void> = []

  // Everything detectable on radar this scene (targets, the player's own missiles,
  // waypoints). A radar platform — the aircraft HUD — enumerates these each frame.
  // Blips self-register (b3d-radar-blip on connect; spawnProjectile for a missile)
  // and unregister on dispose. Position is pulled live, so movers just work.
  private _radarBlips = new Set<RadarBlip>()

  // The scene's combat state (pure, deterministic; see destroyable.ts). Combat
  // components (b3d-destroyable/warhead/launcher) find it via findB3dOwner and
  // share it; the render loop advances it (regen + chain reactions) each frame.
  readonly combat = new CombatWorld()

  // Whether the flat gear panel's click handler is wired (idempotent setup).
  private _scenePanelWired = false

  // NPC nameplates, live in flat AND XR. Keyed by biped element; a cached list is
  // iterated per frame (no per-frame allocation), and a throttled scan adds/removes
  // as bipeds' GLBs load or leave.
  private _nameplates = new Map<Element, Nameplate>()
  private _nameplateList: Nameplate[] = []
  private _nameplateScan = 0

  /**
   * CAVITIES — open air that lives INSIDE the ground (a bore, a cavern).
   *
   * Anything that navigates by "terrain is a heightfield below me" needs to
   * know when that stopped being true: a flat ground-plane floor, a downward
   * ray, a landing gate. A cavity predicate is how a volumetric patch tells
   * the rest of the engine "here, the rule is suspended" without either side
   * knowing about the other — the same shape as the origin listeners above,
   * and for the same reason.
   */
  addCavity(predicate: (x: number, y: number, z: number) => boolean): void {
    this._cavities.push(predicate)
  }

  removeCavity(predicate: (x: number, y: number, z: number) => boolean): void {
    const i = this._cavities.indexOf(predicate)
    if (i >= 0) this._cavities.splice(i, 1)
  }

  /** Is this world point inside open air within the ground? False when no
   * patch has claimed it — so a scene with no cavities pays one array-length
   * check and behaves exactly as it always did. */
  insideCavity(x: number, y: number, z: number): boolean {
    for (let i = 0; i < this._cavities.length; i++) {
      if (this._cavities[i](x, y, z)) return true
    }
    return false
  }

  private _cavities: ((x: number, y: number, z: number) => boolean)[] = []

  registerWorldRoot(node: BABYLON.TransformNode): void {
    this._worldRoots.add(node)
  }

  unregisterWorldRoot(node: BABYLON.TransformNode): void {
    this._worldRoots.delete(node)
  }

  addOriginListener(callback: (dx: number, dz: number) => void): void {
    this._originShiftListeners.push(callback)
  }

  removeOriginListener(callback: (dx: number, dz: number) => void): void {
    const idx = this._originShiftListeners.indexOf(callback)
    if (idx > -1) this._originShiftListeners.splice(idx, 1)
  }

  registerRadarBlip(blip: RadarBlip): void {
    this._radarBlips.add(blip)
  }

  unregisterRadarBlip(blip: RadarBlip): void {
    this._radarBlips.delete(blip)
  }

  /** Every radar-detectable blip in the scene (targets, own missiles, waypoints). */
  get radarBlips(): ReadonlySet<RadarBlip> {
    return this._radarBlips
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
  shiftOrigin(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return
    const shifted = new Set<any>()
    const move = (node: any) => {
      if (node == null || shifted.has(node)) return
      node.position.x -= dx
      node.position.z -= dz
      shifted.add(node)
    }
    const camera = this.scene?.activeCamera
    const focused = (this.querySelector('tosi-b3d-input-focus') as any)?.focused
    const piloted =
      (focused?.getCameraTarget?.() as BABYLON.TransformNode | null) ?? null
    const carrier = piloted ?? (camera?.parent as any) ?? camera
    move(carrier)
    for (const root of this._worldRoots) move(root)
    for (const cb of this._originShiftListeners) cb(dx, dz)
    // Instrument the floating-origin desync hypothesis (VR pass 2, 'origin'
    // tag): the phantom "collide with terrain nowhere near you" fits the piloted
    // aircraft NOT being what shiftOrigin moves — in chase view the carrier can
    // be the chase rig, leaving the plane at pre-shift coords while the tiles
    // jump. Record exactly what was moved so the next pass reads the truth
    // instead of us guessing. `carrierIsPiloted:false` while flying = confirmed.
    if (this._debugCapture.has('origin')) {
      this.logDebug('origin', {
        kind: 'shiftOrigin',
        dx,
        dz,
        carrier: (carrier as any)?.name ?? null,
        piloted: (piloted as any)?.name ?? null,
        carrierIsPiloted: carrier === piloted && piloted != null,
        carrierY: (carrier as any)?.position?.y ?? null,
        worldRoots: this._worldRoots.size,
        view: focused?.cameraView ?? null,
      })
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
  setGameplayCamera(
    camera: BABYLON.Camera,
    options: { attach?: boolean; preventDefault?: boolean } = {}
  ): boolean {
    if (this.xrActive) return false
    this.setActiveCamera(camera, options)
    return true
  }

  private _update = () => {
    this._debugFrame++
    // `_frozen` stops the clock exactly like a pause, but WITHOUT the pause
    // panel or any of pause()'s resume semantics — see `freeze()`.
    if (this._paused || this._frozen) {
      /*
      Keep RENDERING — the panel has to be visible and pickable — but stop the
      CLOCK. Publishing a frame delta of zero is what actually pauses the world:
      everything that simulates does so on the render observable via
      `sceneDelta`, so gating only this method left projectiles flying, water
      moving and aircraft coasting at cruise speed with the stick disconnected.
      Measured at 66 m of travel over a 3-second pause (#30).
      */
      this.lastRender = Date.now()
      if (this.scene != null) {
        if (this.scene.metadata == null) this.scene.metadata = {}
        this.scene.metadata.b3dFrameDelta = 0
        this.frameDelta = 0
        /*
        FOG STILL HAS TO BE RIGHT WHILE STOPPED (adopter issue #31).

        A paused frame RENDERS — that is the whole point, the panel must be
        visible — so everything the render reads must be correct, and fog is
        read by the render. `_updateFog` lives past this early return, and
        `startPaused` pauses inside the same synchronous setup block, so a scene
        that BOOTS paused had never run it once: you saw Babylon's default fog,
        not the scene's.

        `dt = 0` because the clock is stopped: this APPLIES the current fog
        state without advancing any transition. Stopping time must not mean
        rendering something the scene never asked for.
        */
        this._updateFog(0)
        if (this.scene.activeCamera != null) this.scene.render()
      }
      return
    }
    if (this.scene != null && !this.hidden) {
      // Advance combat with real elapsed time (regen + scheduled chain reactions),
      // frame-rate independent and separate from the render throttle below.
      const dt = this.engine.getDeltaTime() / 1000
      if (dt > 0) this.combat.tick(dt)
      if (dt > 0) this._updateFog(dt)
      this._ambientWatchdog()
      if (this.update !== noop) {
        this.update(this, BABYLON)
      }
      const now = Date.now()
      if (
        this.xrActive ||
        now - this.lastRender >= 1000 / (this as any).frameRate
      ) {
        // THE authoritative frame delta — wall clock between actual renders.
        // Babylon's getDeltaTime() measures the engine's rAF TICK, not the
        // gap between scene.render() calls, so anything ticking in a scene
        // observer (which only fires on render) that trusts it advances too
        // little time whenever the render throttle bites: at frameRate 60 on
        // a 120Hz display everything runs at HALF speed, at the default 30 a
        // QUARTER (measured 2026-08-11 — dropped bombs inherited half the
        // aircraft's velocity and sagged behind). jolt-plugin hit this and
        // worked around it locally; this is the shared fix.
        this.frameDelta =
          this.lastRender > 0
            ? Math.min((now - this.lastRender) / 1000, 0.1)
            : 1 / ((this as any).frameRate || 60)
        // Also published on the scene so owner-less helpers (explosionFx,
        // spawnProjectile, the exploder) can read it via `sceneDelta`.
        if (this.scene.metadata == null) this.scene.metadata = {}
        this.scene.metadata.b3dFrameDelta = this.frameDelta
        this.lastRender = now
        if (this.scene.activeCamera !== undefined) {
          this.scene.render()
        }
      }
    }
  }

  private _resizing = false
  // How many times handleResize has driven engine.resize(). A steady climb every
  // frame (rather than a couple of firings that settle) is the fingerprint of a
  // resize→reflow→resize feedback loop — surfaced in `debugState` / the 📊 overlay.
  _resizeCount = 0
  // `handleResize`, not `onResize`: tosijs reserves the `on<Event>` prefix for the
  // elements factory's event sugar (`creator({ onResize })` would attach a 'resize'
  // LISTENER), so a component callback named that way collides with it. tosijs warns
  // and points here — the same footgun as tosijs#22, now with a migration path.
  handleResize() {
    if (this.engine && !this._resizing) {
      this._resizing = true
      this.engine.resize()
      this._resizeCount++
      this._resizing = false
    }
  }

  // A cheap, allocation-light snapshot of the render pipeline's live state —
  // handy from the console, haltija, or the 📊 stats overlay (no devtools needed
  // on mobile). Reports the actual backbuffer vs CSS size (is DPR inflating it?),
  // the current hardware-scaling level and quality tier, live FPS, and the resize
  // count (loop detector). Returns nulls before the engine exists.
  get debugState() {
    const e = this.engine
    return {
      renderWidth: e ? e.getRenderWidth() : null,
      renderHeight: e ? e.getRenderHeight() : null,
      cssWidth: this.clientWidth,
      cssHeight: this.clientHeight,
      devicePixelRatio:
        typeof window !== 'undefined' ? window.devicePixelRatio : null,
      hardwareScaling: e ? e.getHardwareScalingLevel() : null,
      tier: effectiveTier({ xr: this.xrActive }),
      fps: e ? Math.round(e.getFps()) : null,
      resizeCount: this._resizeCount,
      xrActive: this.xrActive,
    }
  }

  loadScene = async (
    path: string,
    file: string,
    processCallback?: (scene: BABYLON.Scene) => void
  ): Promise<void> => {
    BABYLON.SceneLoader.Append(path, file, this.scene, processCallback)
  }

  // (Component insert/dispose is pull-model: each B3dChild self-registers via
  // whenReady() on connect and self-disposes on disconnect — b3d no longer pushes
  // sceneReady/sceneDispose or watches the subtree.)

  private _qualityOff: (() => void) | null = null
  private static _probeStarted = false

  // Seed the device quality profile and apply render scaling. Explicit `quality`
  // wins; otherwise hydrate a cached profile synchronously so children build with
  // the right budgets, and — if there's no cache and no probe on the page — run one
  // in the background (this scene uses the safe default until it caches for next
  // time). Render scaling (hardware scaling) is the one lever cheap to re-apply
  // live, so it tracks quality/XR changes.
  private _setupQuality(): void {
    const q = (this as any).quality as QualitySetting
    if (q && q !== 'auto') setQuality(q)

    // Seed synchronously from cache so children build with the right budgets now.
    const hydrated = q !== 'auto' || hydrateProfileFromCache()

    // If there's nothing cached, measure — DOM-free (runProbe mounts no element,
    // so it can't trip live-reload/doc observers) and DEFERRED (its throwaway
    // engine shouldn't share this scene's setup frame). This scene uses the safe
    // default until the probe caches for next time.
    if (q === 'auto' && !hydrated && !B3d._probeStarted) {
      B3d._probeStarted = true
      this._probeWhenIdle()
    }

    this._applyHardwareScaling(this.xrActive)
    this._qualityOff = onQualityChange(() => {
      this._applyHardwareScaling(this.xrActive)
      this._reallocAmbient() // a new tier is a new pool
    })
  }

  /**
   * Run the device probe once the scene has actually settled.
   *
   * It used to go out on `setTimeout(…, 0)`, described as "deferred" — but a 0 ms
   * timeout defers by ONE TASK, so the benchmark ran inside the host scene's
   * heaviest moment: terrain building, shaders compiling, GLBs parsing. The probe
   * times GPU and CPU work against a fixed reference, so contention inflates every
   * measurement, and `classify()` puts anything scoring below 0.6 — under ~1.67×
   * the medium baseline — in the LOW tier. The result is then cached for 30 days.
   *
   * So the machine most able to show the engine off got the most conservative
   * budgets, because it loads the biggest scene and therefore contends the most,
   * and it stayed that way for a month. (tosijs-3d#11, reported on an M5 Max
   * holding 120fps.) Measuring an idle machine is the entire point of measuring.
   *
   * A spin-up sequence would let us measure a KNOWN workload during load instead
   * of waiting for quiet — see TODO.md. This is the fix that doesn't need one.
   */
  private _probeWhenIdle(): void {
    const start = Date.now()
    let quietFrames = 0
    const tick = () => {
      if (this.engine == null || this.scene == null) return // scene went away
      // Give up waiting after 30s and measure anyway: a scene that streams
      // forever (an endless world) would otherwise never probe at all, and a
      // stale default is worse than a slightly noisy measurement.
      const timedOut = Date.now() - start > 30000
      quietFrames = this.sceneBusy ? 0 : quietFrames + 1
      // ~1s of consecutive settled frames — one quiet frame mid-load proves nothing.
      if (quietFrames < 60 && !timedOut) {
        requestAnimationFrame(tick)
        return
      }
      runProbe({ measuredWhileBusy: timedOut }).catch(() => {
        /* probing is best-effort — never let it break the host scene */
      })
    }
    requestAnimationFrame(tick)
  }

  private _applyHardwareScaling(xr: boolean): void {
    if (this.engine == null) return
    this.engine.setHardwareScalingLevel(qualityBudgets({ xr }).hardwareScaling)
  }

  // ─── Ambient budget ───────────────────────────────────────────────────────
  // Ambient effects (rain, motes, bubbles — and one day footprints and bullet holes) are
  // GARNISH: they compete for one shared pool, and an effect that can't be given its honest
  // minimum switches OFF rather than thinning into a lie. The maths is pure and lives in
  // `ambient-budget.ts`; B3d just owns the registry, the pool, and the watchdog.

  private _ambient: AmbientEffect[] = []
  /** Rationed by the watchdog: shed fast (`ratchetPool`), recovered slowly
   * (`recoverPool`) once the machine has held a good frame rate for 20 settled
   * seconds. The asymmetry is the damping — a transient must not cost the
   * session its weather, and a rebound must not cost it its frame rate. */
  private _ambientPoolScale = 1
  private _ambientSampleMs = 0
  private _ambientBadSamples = 0
  /** Sustained GOOD seconds, for the recovery path — see `_ambientWatchdog`. */
  private _ambientGoodSamples = 0
  private _ambientCooldownMs = 0
  /** Don't judge the frame rate until the scene has settled — see `_ambientWatchdog`.
   * A FLOOR, not the whole rule: `sceneBusy` holds the countdown while assets are
   * still landing, so this is the quiet time required AFTER loading finishes. */
  private _ambientWarmupMs = 4000

  /**
   * Is the scene still building itself? Any frame-rate judgement taken while this
   * is true says nothing about the hardware.
   *
   * A fixed timer can't answer this: a streaming world loads for longer than any
   * number you'd pick, and a trivial scene settles sooner. `getWaitingItemsCount`
   * is what `reveal()` already trusts for exactly this question, and terrain
   * publishes its own settle state, so this asks THEM rather than the clock.
   * (tosijs-3d#11, manta-recon: ambient was shed during the loading screen and
   * ratcheted to zero for the session, on hardware that then ran fine.)
   */
  get sceneBusy(): boolean {
    if (this.scene == null) return true
    if (this.scene.getWaitingItemsCount() > 0) return true
    // Terrain streams in AFTER the asset loader has gone quiet, so
    // getWaitingItemsCount alone would call a half-built world "settled".
    for (const t of this.querySelectorAll('tosi-b3d-terrain')) {
      if ((t as unknown as { busy?: boolean }).busy) return true
    }
    return false
  }

  /**
   * The ambient pool multiplier the watchdog has ratcheted down (1 = untouched,
   * 0 = garnish shed for the session).
   *
   * Settable because the watchdog's verdict is one-way by design, and a game may
   * legitimately know better — "that was the loading screen, try again". Manta
   * was reaching into two privates to say exactly that (#11).
   */
  get ambientPoolScale(): number {
    return this._ambientPoolScale
  }

  set ambientPoolScale(scale: number) {
    const next = Math.max(0, Math.min(1, scale))
    if (next === this._ambientPoolScale) return
    this._ambientPoolScale = next
    this._ambientBadSamples = 0
    this._reallocAmbient()
  }

  /** An ambient effect joins the scene's pool. Returns its unregister. */
  registerAmbient(effect: AmbientEffect): () => void {
    if (this._ambient.length === 0) {
      // Readable IN the headset — the only place the watchdog's damage is visible. `pool` < 1
      // means the ratchet has fired and garnish has been permanently shed this session.
      this.addDebugSource({
        name: 'Ambient',
        lines: () => [
          `pool=${this._ambientPoolScale.toFixed(2)} warmup=${Math.max(
            0,
            Math.round(this._ambientWarmupMs / 1000)
          )}s bad=${this._ambientBadSamples}`,
          ...this._ambient.map((a) => {
            const r = a.budgetRequest()
            const s = a as unknown as {
              preset: string
              granted: number
              active: number
              intensity: number
            }
            // got but live=0 ⇒ built, not rendering. live>0 but you see nothing ⇒ a LOOK
            // problem (too small/sparse/faint), not a plumbing one.
            return `${s.preset} got=${s.granted}/${r.desired} live=${
              s.active
            } i=${s.intensity.toFixed(2)}`
          }),
        ],
      })
    }
    this._ambient.push(effect)
    this._reallocAmbient()
    return () => {
      const i = this._ambient.indexOf(effect)
      if (i < 0) return
      this._ambient.splice(i, 1)
      this._reallocAmbient() // its budget goes back to the survivors
    }
  }

  /** Divide the pool and tell everyone what they got (0 = switch off). */
  private _reallocAmbient(): void {
    if (this._ambient.length === 0) return
    const xr = this.xrActive
    const pool =
      qualityBudgets({ xr }).ambientParticles * this._ambientPoolScale
    const alloc = allocateAmbient(
      this._ambient.map((a) => a.budgetRequest()),
      { pool, tier: effectiveTier({ xr }) }
    )
    for (const a of this._ambient) {
      a.applyAllocation(alloc[a.budgetRequest().id] ?? 0)
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
  private _ambientWatchdog(): void {
    /*
    A pool at ZERO still has to be watched — that is the whole recovery case.

    This used to bail on `_ambientPoolScale <= 0`, which made the recovery path
    below unreachable from exactly the state it was written for:
    `recoverPool(0)` returns 0.25 by design ("Zero is not a special case… a pool
    ratcheted to nothing recovers from a floor rather than staying dead"), and
    `ambient-budget.test.ts` pins it with "a pool shed to ZERO comes back — the
    reported bug". The model was right, the test was green, and the caller
    returned one line before it could ever run — so a scene that shed to nothing
    stayed dead for the session, which is precisely the reported symptom (no
    leaves, no bubbles, no motes, on hardware that had been drawing them a
    second earlier).

    Only the "no ambient effects at all" case is a real early-out.
    */
    if (this._ambient.length === 0) return
    if (this.engine == null) return
    const dt = this.engine.getDeltaTime()

    // WARM UP before judging. The frame rate right after load — and right after XR entry — is
    // garbage for reasons that have nothing to do with ambient: shaders compiling, textures
    // uploading, GLBs landing. Judged during that, a ONE-WAY ratchet would shed the garnish
    // for the whole session over a hitch that was already over. Grace period first.
    // Still building? Then the frame rate is about the LOADING, not the hardware,
    // and a one-way ratchet must not act on it. The clock only runs once the
    // scene is quiet — so `_ambientWarmupMs` means "settled for this long".
    if (this.sceneBusy) {
      this._ambientBadSamples = 0
      return
    }
    if (this._ambientWarmupMs > 0) {
      this._ambientWarmupMs -= dt
      this._ambientBadSamples = 0
      return
    }
    if (this._ambientCooldownMs > 0) {
      this._ambientCooldownMs -= dt
      return
    }
    this._ambientSampleMs += dt
    if (this._ambientSampleMs < 1000) return
    this._ambientSampleMs = 0

    // 0.75, not 0.85: shedding is IRREVERSIBLE, so the bar to do it has to be a frame rate
    // that's actually bad, not one that's merely short of ideal. A headset running 68 of a
    // nominal 72 is fine; it is not a reason to delete the weather for the rest of the session.
    const target = this.xrActive ? 72 : 60
    const fps = this.engine.getFps()
    if (Number.isFinite(fps) && fps > 0 && fps < target * 0.75) {
      this._ambientBadSamples++
      this._ambientGoodSamples = 0
    } else {
      this._ambientBadSamples = 0 // it must be SUSTAINED — one bad second is a hitch, not a trend
      // Comfortably above the shed bar, not merely above it — recovering at the
      // same threshold that sheds is how you build an oscillator.
      if (Number.isFinite(fps) && fps > target * 0.9) this._ambientGoodSamples++
      else this._ambientGoodSamples = 0
    }

    /*
    GIVE IT BACK, GRUDGINGLY.

    The ratchet is one-way by design and that is right on weak hardware. Its
    failure mode shows up in ordinary play instead: **a transient costs you the
    weather for the whole session.** Reported from a headset — falling into the
    water shed the pool to zero, and there were no leaves, bubbles or motes for
    the rest of the run on a device that had been rendering them a second
    earlier. Entering water fires fog, bubbles and a surface transition at once;
    the hitch ends long before you surface, and the punishment did not.

    Recovery is deliberately harder to earn than shedding: 20 good seconds
    against 6 bad ones, a higher bar than the shed threshold, and a smaller step
    (×1.35 up vs ×0.6 down). A wrong shed heals in a few intervals; a wrong
    recovery is re-shed cheaply. The asymmetry IS the damping the old TODO asked
    for — "a damped, deliberate thing, not a rebound".
    */
    if (this._ambientGoodSamples >= 20 && this._ambientPoolScale < 1) {
      this._ambientGoodSamples = 0
      this._ambientCooldownMs = 5000
      this._ambientPoolScale = recoverPool(this._ambientPoolScale)
      this._reallocAmbient()
      return
    }

    if (this._ambientBadSamples < 6) return // ~6s of genuinely bad frames, not 3

    this._ambientBadSamples = 0
    this._ambientGoodSamples = 0
    this._ambientCooldownMs = 5000 // let the frame settle before judging again
    this._ambientPoolScale = ratchetPool(this._ambientPoolScale)
    this._reallocAmbient()
  }

  private _statsBaseScale: number | null = null
  // Which debug tools (Perf Stats + registered sources) are expanded, by id. Empty
  // by default — the panel opens with the debug data collapsed to its icon bar, so
  // a demo's own controls aren't buried under diagnostics you didn't ask to see.
  private _debugOpen = new Set<string>()
  private _debugSources: DebugPanelSource[] = []
  private _liveDebug: { flat: LiveDebugRow[]; xr: LiveDebugRow[] } = {
    flat: [],
    xr: [],
  }
  private _liveDebugTimer: ReturnType<typeof setInterval> | null = null
  /** Set while an XR panel exists; rewrites its contents in place so debug numbers stay
   * live in the headset. No-op flat (the flat panel rebuilds on open). */
  private _refreshXrPanel: () => void = noopRefresh

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
   *   actions: [{ label: () => (t.profiling ? 'Profiling ON' : 'Profile'), handleClick: () => t.setProfiling(!t.profiling) }],
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
  private _fogLayers: FogContributor[] = []
  private _fogBase: FogState | null = null
  private _fogNow: FogState | null = null

  /**
   * Contribute a fog layer — underwater, inside a cloud, out in space. Return `null` (or
   * `weight: 0`) when you're not contributing. Returns an unregister function.
   *
   * `b3d-fog` sets the BASE (and the mode, once). Everyone else leans on it.
   */
  /**
   * THE MEDIA IN THIS SCENE — what things are moving through.
   *
   * A live list, not a snapshot: a water element registers itself here and
   * anything that cares (projectiles wanting drag, a vehicle wanting a regime,
   * a shader wanting depth) asks the scene rather than re-deriving the surface
   * from a mesh it had to go and find. Two subsystems deriving "am I under
   * water" separately is how they end up disagreeing at the boundary — the
   * failure that produced the fogged-sky/transparent-window conflict.
   *
   * See [[medium]] for the geometry (plane or sphere: a sea, or a planet's
   * ocean and atmosphere) and the queries.
   */
  readonly media: Medium[] = []

  /** Register a medium. Returns its unregister, like `addFogLayer`. */
  addMedium(m: Medium): () => void {
    this.media.push(m)
    return () => {
      const i = this.media.indexOf(m)
      if (i >= 0) this.media.splice(i, 1)
    }
  }

  addFogLayer(layer: FogContributor): () => void {
    this._fogLayers.push(layer)
    return () => {
      const i = this._fogLayers.indexOf(layer)
      if (i >= 0) this._fogLayers.splice(i, 1)
    }
  }

  /** The fog everything else blends FROM. `b3d-fog` owns this; without one we still keep a
   * whisper of fog on, so a layer can ramp up without ever switching the mode. */
  setFogBase(base: FogState | null): void {
    this._fogBase = base
    // Clearing the base (the <tosi-b3d-fog> was removed) must also drop the cached current fog,
    // or `_updateFog`'s "no base + live layers → auto-enable" branch can never re-fire and
    // underwater/cloud fog stays dead for the rest of the scene's life.
    if (base == null) {
      this._fogNow = null
      return
    }
    if (this._fogNow == null) {
      this._fogNow = {
        color: { ...base.color },
        density: base.density,
        start: base.start,
        end: base.end,
      }
    }
  }

  private _updateFog(dt: number): void {
    const scene = this.scene
    if (scene == null) return
    // No <tosi-b3d-fog> in the scene? Fog is STILL on, at a whisper — because a layer
    // (underwater, cloud) must be able to ramp up without ever switching fogMode, which
    // would recompile every shader. "Always on to some extent" is the whole trick.
    if (this._fogBase == null && this._fogLayers.length > 0) {
      scene.fogMode = BABYLON.Scene.FOGMODE_EXP2
      this.setFogBase({
        color: {
          r: scene.fogColor.r,
          g: scene.fogColor.g,
          b: scene.fogColor.b,
        },
        density: 0.00001,
        start: scene.fogStart,
        end: scene.fogEnd,
      })
    }
    const base = this._fogBase
    if (base == null || this._fogNow == null) return
    const layers: FogLayer[] = []
    for (const fn of this._fogLayers) {
      const l = fn()
      if (l != null && l.weight > 0) layers.push(l)
    }
    const target = compositeFog(base, layers)
    // A SHORT time constant. This exists to stop a hard pop (and to absorb a layer whose
    // weight jumps — a cloud recycling behind you, a camera teleporting), NOT to make
    // transitions leisurely. Crossing the water's surface should read as instant-but-smooth:
    // a few frames, not a fade.
    this._fogNow = approachFog(this._fogNow, target, dt, 0.07)
    const f = this._fogNow
    scene.fogColor.set(f.color.r, f.color.g, f.color.b)
    scene.fogDensity = f.density
    scene.fogStart = f.start
    scene.fogEnd = f.end
  }

  private _recenterXr: () => void = noop

  /**
   * Re-seat the head: take your CURRENT head yaw as "facing forward". The same thing the
   * headset's own recentre (holding the Meta button) asks for — we listen for that too, so
   * it now works; this is the manual door, e.g. a panel button.
   */
  recenterXr(): void {
    this._recenterXr()
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
  async snapshot(
    opts: { width?: number; height?: number } = {}
  ): Promise<string> {
    const cam = this.scene.activeCamera
    if (cam == null) throw new Error('snapshot: the scene has no active camera')
    const canvas = this.engine.getRenderingCanvas()
    const width = opts.width ?? canvas?.width ?? 1280
    const height = opts.height ?? canvas?.height ?? 720
    return BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(
      this.engine,
      cam,
      { width, height }
    )
  }

  /** Repaint BOTH presentations of the panel. The flat one rebuilds; the XR one rewrites
   * its contents in place. Unified on purpose — see `_panelWidgets`. */
  private _repaintPanels(): void {
    this.refreshScenePanel()
    this._refreshXrPanel()
  }

  addDebugSource(source: DebugPanelSource): () => void {
    this._debugSources.push(source)
    this.refreshScenePanel()
    return () => {
      const i = this._debugSources.indexOf(source)
      if (i >= 0) this._debugSources.splice(i, 1)
      this.refreshScenePanel()
    }
  }

  /*
  A tiny diagnostic ring buffer, for VR bugs you can only catch in a headset.

  There is no console in a headset and window.rAF is suspended, so the two
  normal readback paths are gone. This records structured events IN the page:
  read them back afterward at the desk with
  `document.querySelector('tosi-b3d').debugLog` (over haltija when the tab is
  reachable, or straight from DevTools). `frameNow` is a monotone counter, not a
  clock — Date.now is banned in the deterministic layer and useless for ordering
  frames anyway. Off by default; `b3d.debugCapture('origin')` arms a tag.
  Mirror-to-console is opt-in per tag because a VR frame budget can't afford a
  log line every reset.
  */
  /*
  THE CONSOLE THAT EXISTS IN A HEADSET.

  A VR-only crash is the worst shape of bug we have: there is no console, and
  the one person who can see it is wearing the thing. The guided-missile demo
  crashes on a hit in VR and NOT flat (Tonio), which is exactly the case where
  "read me the error" is impossible.

  So capture errors into the ring and surface the latest on the Perf panel. A
  PASSIVE listener — never `preventDefault()` — so behaviour is unchanged and
  this can ship on by default; an error that reaches `window` was already
  uncaught, and recording it costs nothing until one happens.

  Installed once per element, torn down with it.
  */
  private _errors: Array<{ f: number; msg: string; at: string }> = []
  private _errorCaptureOff: (() => void) | null = null
  private _installErrorCapture(): () => void {
    const onError = (e: ErrorEvent) => {
      const where = e.filename
        ? `${String(e.filename).split('/').pop()}:${e.lineno}`
        : 'unknown'
      this._errors.push({
        f: this._debugFrame,
        msg: String(e.message ?? e.error ?? 'error').slice(0, 120),
        at: where,
      })
      if (this._errors.length > 8) this._errors.shift()
      this.logDebug('error', { msg: String(e.message), at: where })
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      this._errors.push({
        f: this._debugFrame,
        msg: `unhandled: ${String(e.reason)}`.slice(0, 120),
        at: 'promise',
      })
      if (this._errors.length > 8) this._errors.shift()
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }

  private _debugRing: Array<Record<string, unknown>> = []
  private _debugCapture = new Set<string>()
  private _debugFrame = 0
  /** Monotone frame counter for ordering diagnostic events (NOT a clock). */
  get debugFrame(): number {
    return this._debugFrame
  }
  /** The captured diagnostic events, oldest first. Read over haltija/DevTools. */
  get debugLog(): ReadonlyArray<Record<string, unknown>> {
    return this._debugRing
  }
  /** Arm (or, with on=false, disarm) diagnostic capture for a tag. */
  debugCapture(tag: string, on = true): void {
    if (on) this._debugCapture.add(tag)
    else this._debugCapture.delete(tag)
  }
  /** Record a diagnostic event if its tag is armed. Cheap no-op otherwise. */
  logDebug(tag: string, event: Record<string, unknown>): void {
    if (!this._debugCapture.has(tag)) return
    this._debugRing.push({ f: this._debugFrame, tag, ...event })
    if (this._debugRing.length > 512) this._debugRing.shift()
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
  private _sourceRows(
    src: DebugPanelSource,
    bucket: LiveDebugRow[]
  ): Widget3d[] {
    let lines: string[]
    try {
      lines = src.lines()
    } catch (err) {
      lines = [`(threw: ${(err as Error)?.message ?? err})`]
    }
    // Name as a compact heading, then ONE wrapping block for the body — instead of a
    // 40px row per line that both wasted vertical space and clipped long lines.
    const block = textBlock3d({ lines, muted: true })
    const rows: Widget3d[] = [
      label3d({ text: src.name, bold: true, compact: true }),
      block,
    ]
    bucket.push({
      update: (next) => block.update(next),
      lines: () => src.lines(),
    })
    for (const action of src.actions ?? []) {
      rows.push(
        button3d({
          label:
            typeof action.label === 'function' ? action.label() : action.label,
          // A button's own label can change ('Profile tiles' → 'Profiling ON'), and a
          // button label isn't live text — so this one case does want a rebuild.
          handleClick: () => {
            handlerOf<() => void>(action, 'handleClick', 'onClick')?.()
            this._repaintPanels()
          },
        })
      )
    }
    return rows
  }

  // The debug tools the panel's icon bar offers: Perf Stats (when opted in) plus every
  // registered source, each with the icon its toggle shows. Perf Stats is core, not a
  // registered source, so it carries a fixed id + icon here; a source picks its own via
  // `DebugPanelSource.icon` (default `bug`). The icon bar toggles membership in
  // `_debugOpen`; only open tools render their rows below the bar (see `_panelWidgets`).
  /**
   * ICON-BAR GADGETS — items that FLIP something rather than expanding a
   * readout. Same bar as the debug tools (one row of small icons, one UI in
   * both presentations), different job.
   *
   * The glass gamepad's fade is production-correct and development-hostile: as
   * soon as a mouse or trackpad is present it goes away and doesn't come back,
   * so checking it on a laptop meant switching Chrome into responsive mode.
   * This is the one-tap way back, and it works in a headset too.
   */
  private _panelGadgets(): Array<{
    id: string
    name: string
    icon: string
    active: boolean
    handleClick: () => void
  }> {
    const out: Array<{
      id: string
      name: string
      icon: string
      active: boolean
      handleClick: () => void
    }> = []
    /*
    PAUSE WAS A ONE-WAY DOOR.

    The pause panel offers Continue, so pause was a state you could LEAVE and
    never ENTER: nothing in the standard panel paused a running scene (Tonio).
    `pause()`/`resume()` existed and were reachable only from JS or from
    `startPaused`, which is not a control, it is an initial condition.

    A gadget rather than a scenePanel row, so it lands in the flat panel AND the
    in-VR panel from one definition — and in a headset it is the only way to
    stop the world at all.

    `pauseWhenHidden` is deliberately untouched: that is an automatic policy,
    this is a manual act, and conflating them would make backgrounding the tab
    look like the user pressed something.
    */
    out.push({
      id: '__pause',
      name: this.paused ? 'Resume' : 'Pause',
      /*
      `play` when paused (what pressing it DOES), `pause` when running — a
      transport control shows its action, not its state.

      The BARE glyphs, not `playCircle`/`pauseCircle`: Tonio's call once both
      existed. (The solid-white-box bug was never about which variant — the
      names simply weren't in our generated icon set; see icon-names.test.ts.)
      */
      icon: this.paused ? 'play' : 'pause',
      active: this.paused,
      handleClick: () => {
        if (this.paused) this.resume()
        else this.pause('user')
        this._repaintPanels()
      },
    })
    const pad = this.querySelector('tosi-b3d-gamepad') as unknown as {
      hidden?: boolean
      setFade?: (on: boolean) => void
      fade?: string
    } | null
    if (pad?.setFade != null) {
      const forced = String(pad.fade) === 'off'
      out.push({
        id: '__gamepad',
        name: forced ? 'Gamepad: always shown' : 'Gamepad: auto-hides',
        icon: 'game',
        active: forced,
        handleClick: () => {
          pad.setFade?.(forced)
          this._repaintPanels()
        },
      })
    }
    return out
  }

  private _debugTools(): Array<{ id: string; name: string; icon: string }> {
    const tools: Array<{ id: string; name: string; icon: string }> = []
    if (perfDebugEnabled() || this.stats) {
      tools.push({ id: '__perf', name: 'Perf Stats', icon: 'barChart2' })
    }
    for (const src of this._debugSources) {
      tools.push({ id: src.name, name: src.name, icon: src.icon ?? 'bug' })
    }
    return tools
  }

  // Rewrite the debug lines' text in place. The flat panel is live DOM, so it just shows
  // the new text; the XR panel is rasterised by an SvgTexture that re-renders on its own
  // cadence (200ms), so it picks the change up for free. Cheap — a few string compares.
  private _startLiveDebug(): void {
    if (this._liveDebugTimer != null) return
    this._liveDebugTimer = setInterval(() => {
      const rows = [...this._liveDebug.flat, ...this._liveDebug.xr]
      if (rows.length === 0) {
        clearInterval(this._liveDebugTimer as ReturnType<typeof setInterval>)
        this._liveDebugTimer = null
        return
      }
      for (const row of rows) {
        let lines: string[]
        try {
          lines = row.lines()
        } catch {
          continue
        }
        // The block re-wraps in place. A source that changes its LINE COUNT still needs a
        // rebuild to reflow the rows below it; the block itself stays live regardless.
        row.update(lines)
      }
    }, 400)
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
  private _perfReadoutRows(): Widget3d[] {
    const s = this.debugState
    const scaled = this._statsBaseScale != null
    return [
      label3d({
        text: `render ${s.renderWidth}×${s.renderHeight}  (css ${s.cssWidth}×${s.cssHeight})`,
        muted: true,
      }),
      label3d({
        text: `dpr ${s.devicePixelRatio}  scale ${s.hardwareScaling?.toFixed(
          2
        )}  ${s.tier}`,
        muted: true,
      }),
      label3d({
        text: `fps ${s.fps}  resizes ${s.resizeCount}${
          s.xrActive ? '  [XR]' : ''
        }`,
        muted: true,
      }),
      // Only once XR has been entered — meaningless before, and a row that says
      // nothing is a row that costs panel space in the place with least of it.
      ...(this._xrBaseline != null
        ? [
            label3d({
              text: (() => {
                const b = this._xrBaseline!
                const d = (now: number, was: number) => {
                  const n = now - was
                  return n === 0 ? '0' : n > 0 ? `+${n}` : String(n)
                }
                return `xr ${this._xrSessions}x  since 1st: mesh ${d(
                  this.scene.meshes.length,
                  b.mesh
                )} mat ${d(this.scene.materials.length, b.mat)} tex ${d(
                  this.scene.textures.length,
                  b.tex
                )}`
              })(),
              muted: true,
            }),
          ]
        : []),
      // One-tap discriminator: swap between the engine's real hardware scaling and
      // a coarse ×3 (≈1/9th the pixels). FPS recovers → fill/RTT is the bottleneck;
      // FPS unmoved → the resize machinery is. Fable's mobile-Safari test, in-panel.
      button3d({
        label: scaled ? 'Reset scale' : 'Force scale ×3',
        handleClick: () => {
          if (this.engine == null) return
          if (this._statsBaseScale == null) {
            this._statsBaseScale = this.engine.getHardwareScalingLevel()
            this.engine.setHardwareScalingLevel(3)
          } else {
            this.engine.setHardwareScalingLevel(this._statsBaseScale)
            this._statsBaseScale = null
          }
          this._repaintPanels()
        },
      }),
    ]
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
  /**
   * The icon-bar items — diagnostics first, then gadgets.
   *
   * ONE list, two presentations, which is the panel's standing contract. Flat,
   * these render as small round buttons in the panel's header beside the close
   * button; in XR they render as an `iconBar3d` row, because a headset has no
   * DOM header to put them in. Same items, same handlers, different layout —
   * that is presentation, not divergence. What must never happen is the LIST
   * differing between the two.
   *
   * They moved out of the flat panel BODY because a full-width row per toggle
   * is a lot of panel for a thing you press once: "the graph button in the
   * standard panel is a waste of space" (Tonio).
   */
  private _barItems(): Array<{
    icon: string
    title: string
    active: boolean
    handleClick: () => void
  }> {
    return [
      ...this._debugTools().map((t) => ({
        icon: t.icon,
        title: t.name,
        active: this._debugOpen.has(t.id),
        handleClick: () => {
          if (this._debugOpen.has(t.id)) this._debugOpen.delete(t.id)
          else this._debugOpen.add(t.id)
          this._repaintPanels()
        },
      })),
      // Gadgets last: diagnostics are the bar's main job, and a toggle moving
      // position as tools appear would be worse than a fixed tail.
      ...this._panelGadgets().map((g) => ({
        icon: g.icon,
        title: g.name,
        active: g.active,
        handleClick: g.handleClick,
      })),
    ]
  }

  /*
  DISPOSE THE SET WE ARE REPLACING.

  This method is re-invoked on every `_repaintPanels()` — pause/resume, any
  icon-bar toggle, every gear open — and each call builds a FRESH widget list
  from `scenePanel(this)`. The previous list becomes garbage, but a widget that
  registered itself somewhere does not: `spinner3d` joins a module-global
  ticker, so orphans kept animating forever and each held its whole SVG subtree
  alive through the tick closure. A leak, not merely wasted CPU.

  Reaping by `el.isConnected` looks tempting and is wrong: `SvgTexture`
  serialises the panel with `XMLSerializer` and never attaches it, so an
  IN-SCENE panel's SVG is legitimately detached for its whole life and would be
  culled while visible.

  The owner knows. It built the list, it is replacing the list, so it disposes
  the list — which is also why `dispose` is on `Widget3d` rather than on the
  one widget that currently needs it.
  */
  private _disposeWidgets(key: 'flat' | 'xr'): void {
    for (const w of this._builtWidgets[key]) {
      try {
        w.dispose?.()
      } catch {
        // A consumer's dispose must not take the repaint with it.
      }
    }
    this._builtWidgets[key] = []
  }

  private _builtWidgets: { flat: Widget3d[]; xr: Widget3d[] } = {
    flat: [],
    xr: [],
  }

  private _panelWidgets(xr = false): Widget3d[] {
    const key = xr ? 'xr' : 'flat'
    this._disposeWidgets(key)
    const rows = this.scenePanel(this)
    const tools = this._debugTools()
    const items = this._barItems()
    if (items.length === 0) {
      // Nothing in the bar → nothing to stop, clear this presentation's live bucket.
      this._liveDebug[key] = []
      this._builtWidgets[key] = rows
      return rows
    }
    // NEITHER presentation gets its bar from here any more: flat renders the
    // items as header buttons, XR builds an iconBar3d that also carries Exit VR
    // and Re-seat. This returns the readouts and the author's rows only, so
    // there is exactly one place each bar is assembled.
    const out: Widget3d[] = []
    // Live text blocks for the OPEN sources are collected here and rewritten in place by
    // `_startLiveDebug` (a readout that only refreshes on reopen is useless — you'd switch
    // a profiler on and then watch frozen zeros). Collapsed tools contribute nothing.
    const bucket: LiveDebugRow[] = []
    for (const t of tools) {
      if (!this._debugOpen.has(t.id)) continue
      if (t.id === '__perf') out.push(...this._perfReadoutRows())
      else {
        const src = this._debugSources.find((s) => s.name === t.id)
        if (src) out.push(...this._sourceRows(src, bucket))
      }
    }
    this._liveDebug[key] = bucket
    this._startLiveDebug()
    const all = [...out, ...rows]
    this._builtWidgets[key] = all
    return all
  }

  // window.requestAnimationFrame stops firing during an immersive XR session (the
  // session's own frame loop drives rendering instead). tosijs batches component
  // re-renders via rAF, so REACTIVE ATTRIBUTE BINDINGS — a skybox's `timeOfDay`
  // bound to a slider, say — silently stop updating in VR (an explicit `.observe()`
  // still fires, which is why some controls worked and others didn't). Intercept
  // rAF while in-session and flush its callbacks from the XR frame loop; restore on
  // exit. Babylon renders via the XR session's rAF (not window's), so its loop is
  // untouched. Returns a restore function.
  private _installXrRafPump(base: BABYLON.WebXRExperienceHelper): () => void {
    const realRaf = window.requestAnimationFrame.bind(window)
    const realCancel = window.cancelAnimationFrame.bind(window)
    let queue: Array<{ id: number; cb: FrameRequestCallback }> = []
    let nextId = 1
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      const id = nextId++
      queue.push({ id, cb })
      return id
    }
    window.cancelAnimationFrame = (id: number): void => {
      queue = queue.filter((q) => q.id !== id)
    }
    const pump = () => {
      if (queue.length === 0) return
      const due = queue
      queue = []
      const now = performance.now()
      for (const { cb } of due) {
        try {
          cb(now)
        } catch (err) {
          console.warn('rAF callback failed during XR', err)
        }
      }
    }
    const obs = base.sessionManager.onXRFrameObservable.add(pump)
    return () => {
      base.sessionManager.onXRFrameObservable.remove(obs)
      window.requestAnimationFrame = realRaf
      window.cancelAnimationFrame = realCancel
      pump() // flush anything queued just before exit
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    /*
    A MOVE MUST NOT COST A SCENE.

    Re-parenting an element fires `disconnectedCallback` then
    `connectedCallback` in the SAME task, and this method builds an Engine and a
    Scene unconditionally — so a move built a second one. The first is then
    disposed, which disposes its materials, which deletes their shader programs,
    and the SURVIVING scene renders black while every uniform reads correct and
    `isReady()` returns true. `gl.isProgram()` is false and nothing says so.

    Reported by tosijs-3d-ensemble (#58) with the measurement that pins it: two
    Scene objects 43ms apart, a SkyMaterial rebuilt across the boundary, a
    `deleteProgram`, and NO add/remove recorded on the element itself — because
    the move was of an ancestor HOST, which disconnects everything in its shadow
    root. This is also the real cause of the intermittent black sky in #51.

    A move need not touch this element at all, and it is ordinary DOM: SPA
    routers, layout changes, re-parenting. So teardown is DEFERRED (see
    `disconnectedCallback`) and a reconnect in the same task simply cancels it —
    the scene never stopped existing, and there is nothing to rebuild.
    */
    if (this._teardownTimer != null) {
      clearTimeout(this._teardownTimer)
      this._teardownTimer = null
      return
    }
    // Reconnected after teardown already ran, or connected for the first time.
    const cnv = this.parts.canvas as HTMLCanvasElement
    cnv.addEventListener('wheel', (e) => e.preventDefault(), { passive: false })
    // Input focus follows the pointer: hovering or pressing anywhere in this scene
    // (canvas OR the glass-gamepad / panel overlays, which are siblings of the canvas)
    // makes it the one shared keyboard/gamepad input drives — see hasInputFocus. Listen
    // on the host so overlay interaction counts; pointerdown bubbles from any child.
    this.addEventListener('pointerenter', () => this.takeInputFocus())
    this.addEventListener('pointerdown', () => this.takeInputFocus())
    /*
    NEVER TWO ENGINES ON ONE CANVAS.

    Building a second WebGL context over a live one does not fail loudly: the
    first context's shader PROGRAMS become invalid while every uniform still
    reads back correctly, so the symptoms are meshes rendering white, a dark
    sky, or a half-loaded scene — four different-looking failures with one
    cause. tosijs-3d-ensemble measured exactly that (#56): correct sky uniforms
    alongside `gl.isProgram(program) === false`, `gl.getError() === 1282`, and
    two `webgl2` contexts created 207ms apart on a single load.

    `connectedCallback` should not reach here twice — a disconnect always
    schedules the teardown that a same-task reconnect cancels (#58) — but
    "should not" is what the old code relied on, and this failure is invisible
    until someone reads it off the GL context. Cheap to make impossible.
    */
    if (this.engine != null) {
      console.warn(
        'b3d: an engine already exists on this element; disposing it before ' +
          'building another. A second WebGL context silently invalidates the ' +
          "first one's shader programs — white meshes, dark sky, or a " +
          'half-loaded scene.'
      )
      this._teardown()
    }
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

    // Seed device quality BEFORE any child component builds, so terrain/shadows/
    // reflections resolve their `auto` defaults against the right budget on frame 1.
    // Never let quality setup break the scene — fall back to the safe default.
    try {
      this._setupQuality()
    } catch (err) {
      console.warn('b3d quality setup failed; using default profile', err)
    }

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

      // Mount the glass gamepad (if requested) before releasing descendants, so
      // b3dInputFocus sees its source when it wires up input.
      this._setupGamepad()

      // Scene is ready. Release any B3dChild components that connected and asked
      // (whenReady) before the scene was up — they insert themselves now. Anything
      // connecting later self-registers and runs immediately.
      // Errors, on the one readout that exists in a headset — see
      // _installErrorCapture. Registered once, with the scene.
      this._errorCaptureOff = this._installErrorCapture()
      this.addDebugSource({
        name: 'errors',
        lines: () => {
          if (this._errors.length === 0) return ['none']
          const last = this._errors[this._errors.length - 1]
          return [
            `${this._errors.length} seen · last f${last.f} @${last.at}`,
            last.msg.slice(0, 46),
          ]
        },
        actions: [
          {
            label: 'Clear',
            handleClick: () => {
              this._errors = []
              this._repaintPanels()
            },
          },
        ],
      })
      this._sceneReady = true
      // Pause plumbing: watchers first, then the initial state — so a scene
      // that comes up paused already has its panel and its listeners.
      this._watchPause()
      if (this.startPaused) this.pause('start')
      const queued = this._readyQueue
      this._readyQueue = []
      for (const cb of queued) cb()

      // Offer WebXR (non-blocking — it must not delay the canvas reveal).
      void this._setupXR()

      // Mount the gear-toggled DOM-overlay settings panel (flat screens). The
      // in-scene XR copy is built on session entry.
      this._setupScenePanel()

      // NPC nameplates (above non-player bipeds), in flat AND XR.
      this._setupNameplates()

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
        // Enable the toolbar only now the scene is up — the gear + Enter VR
        // shouldn't be clickable while the scene is still loading.
        const gearBtn = this.parts.scenePanelGear as
          | HTMLButtonElement
          | undefined
        const vrBtn = this.parts.enterVrButton as HTMLButtonElement | undefined
        if (gearBtn) gearBtn.disabled = false
        if (vrBtn) vrBtn.disabled = false
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
    base.onStateChangedObservable.add((state) => {
      if (state !== BABYLON.WebXRState.IN_XR) return
      this._xrSessions += 1
      // Baseline from the FIRST entry only — the point is the trend across
      // sessions, so re-baselining each time would hide exactly what we want.
      this._xrBaseline ??= {
        mesh: this.scene.meshes.length,
        mat: this.scene.materials.length,
        tex: this.scene.textures.length,
      }
    })

    const vrButton = this.parts.enterVrButton as HTMLButtonElement
    vrButton.addEventListener('click', async () => {
      try {
        if (this.xrActive) {
          await base.exitXRAsync()
        } else {
          // Flush any pending tosijs renders WHILE flat rAF still works, so no
          // component's per-element `_renderQueued` flag is left stranded when the
          // immersive session suspends window.requestAnimationFrame. Otherwise a
          // component with a render already queued at entry (e.g. the skybox, whose
          // realtimeScale setInterval constantly queues one) never schedules
          // another render in-session and its reactive bindings freeze — the
          // "time-of-day slider dead on first XR entry" bug.
          await updates()
          await base.enterXRAsync('immersive-vr', 'local-floor')
        }
      } catch (err) {
        console.warn('XR session change failed', err)
      }
    })
    // A live map of XR controller component states (thumbsticks/buttons), built
    // once so we don't double-register listeners across sessions.
    const controllers: TosiXRControllerMap = xrControllers(xr)

    // Feed the XR controllers through the same VirtualGamepad spine as the
    // keyboard/glass gamepad: add an XrGamepadSource to the scene's input focus,
    // so the focused controllable (biped/aircraft/car) is driven by the
    // controllers in VR through its existing mapping. No per-entity XR code.
    const focus = this.querySelector('tosi-b3d-input-focus') as {
      inputMappedProvider?: { addSource(s: unknown): void }
      focused?: { mesh?: BABYLON.AbstractMesh }
    } | null
    const xrSource = new XrGamepadSource(controllers)
    focus?.inputMappedProvider?.addSource(xrSource)
    // Standalone <tosi-b3d-controller>s self-wire their own input, so feed them the XR
    // controllers too (same VirtualGamepad spine — the VR sticks/triggers drive them).
    for (const c of Array.from(this.querySelectorAll('tosi-b3d-controller'))) {
      ;(c as any).inputMappedProvider?.addSource(xrSource)
    }
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
    let restoreRaf: (() => void) | undefined
    base.onStateChangedObservable.add((state) => {
      this.xrActive = state === BABYLON.WebXRState.IN_XR
      // Keep the xrColor icon as the button face; the title carries the state
      // (the flat button isn't visible in-session anyway). Setting textContent
      // here would wipe the icon.
      vrButton.title = this.xrActive ? 'Exit VR' : 'Enter VR'
      if (state === BABYLON.WebXRState.IN_XR) {
        /*
        ENTERING VR UNPAUSES. Putting the headset on IS the resume.

        A world you deliberately stepped INTO has no good reason to be frozen,
        and the state was actively broken: entering a paused scene showed no
        pause panel at all in-session (it exists, it is just never presented on
        a path where the pause pre-dates the session), so you arrived in a
        stopped world with no visible way out — the panel's toggle was the only
        escape, and only if you knew to look.

        This removes the state rather than teaching the panel to appear in it,
        which is the smaller and more honest fix (Tonio: "arguably entering VR
        should unpause a paused scene"). It is also symmetric with
        `enterXrOnResume`, which already couples resume → enter.

        Safe against re-entry: `xrActive` is set above, so `resume()`'s
        `enterXrOnResume && !xrActive` guard cannot fire a second entry. And you
        can still pause in VR — the panel's transport toggle does it.
        */
        if (this.paused) this.resume()
        // Snapshot the flat orbit camera so exit can restore it (see the field
        // note). Babylon only mutates the non-XR camera on the way OUT, so the
        // angles here are still the pre-entry ones.
        const fc = this.camera
        this._flatOrbitState =
          fc instanceof BABYLON.ArcRotateCamera
            ? {
                alpha: fc.alpha,
                beta: fc.beta,
                radius: fc.radius,
                target: fc.target.clone(),
              }
            : null
        // Stereo doubles fill — drop to the XR render-scaling budget on entry, and
        // back to the flat one on exit (the cheap lever that's safe to change live).
        this._applyHardwareScaling(true)
        // Same reason: the XR tier is a smaller ambient pool, so re-divide it. A snowstorm
        // that was honest on a monitor may only afford to be nothing at all in a headset.
        this._reallocAmbient()
        // And re-arm the warm-up: XR entry is the single worst frame-rate moment there is
        // (stereo shaders compiling, the session spinning up). Judging the pool there and
        // shedding IRREVERSIBLY is how you lose the weather to a hitch that's already over.
        this._ambientWarmupMs = 10000
        this._ambientBadSamples = 0
        // Keep tosijs's rAF-batched reactive bindings flushing while in-session.
        restoreRaf ??= this._installXrRafPump(base)
        xrSession ??= this._startDefaultXrExperience(base, controllers)
      } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
        // Restore the orbit camera Babylon has just carried the (low) headset
        // pose into. Runs after Babylon's restore; setting target then angles
        // overrides the setPosition() it did, and ArcRotate recomputes position
        // from these next frame. Free cameras keep the carry-back (state is null).
        const fc = this.camera
        const s = this._flatOrbitState
        if (s != null && fc instanceof BABYLON.ArcRotateCamera) {
          fc.setTarget(s.target)
          fc.alpha = s.alpha
          fc.beta = s.beta
          fc.radius = s.radius
        }
        this._flatOrbitState = null
        this._applyHardwareScaling(false)
        this._reallocAmbient()
        xrSession?.dispose()
        xrSession = undefined
        restoreRaf?.()
        restoreRaf = undefined
        /*
        LEAVING VR PAUSES — for every scene, not just the ones that opted in.

        Taking the headset off is a departure, not a view change: the world
        should not run on without you while it sits on your desk.

        This used to require `enterXrOnResume`, on the reasoning that a flat
        scene which merely VISITED XR should not suddenly acquire a pause panel
        on the way out. Superseded by the symmetry, which is the stronger
        argument (Tonio: "just as entering VR should unpause, exiting VR should
        probably pause"): one gesture means resume, its inverse means stop, and
        a rule you have to opt into is not a pair. `enterXrOnResume` still owns
        the other direction — resume → enter — so the loop it describes is
        unchanged; it just no longer gates this half.

        Guarded on `paused` so exiting a scene you paused from INSIDE the headset
        does not re-enter the pause it is already in.
        */
        if (!this.paused) this.pause('xr')
      }
    })
    // XR is available — reveal the Enter VR button (grouped next to the gear in the
    // scene toolbar, so it's obvious when VR is available and never clipped by the
    // panel's scroll).
    vrButton.hidden = false
  }

  // The built-in XR experience used when no `setupXr` hook is supplied: stand
  // the viewer on a grid floor near the scene, walk with the left stick
  // (relative to head facing), turn with the right stick, and change altitude
  // with the BUMPERS (left down / right up, analog — the same hand logic as
  // brake/accelerate on the triggers). The right stick's vertical still flies
  // when nothing is claiming it, but the bumpers are the reliable path: that
  // axis doubles as panel scroll. A rig
  // TransformNode is the movable anchor — live head tracking applies as a local
  // transform on top. Returns a disposer that tears everything down on exit.
  private _startDefaultXrExperience(
    base: BABYLON.WebXRExperienceHelper,
    controllers: TosiXRControllerMap
  ): { dispose: () => void } {
    const scene = this.scene
    const cam = base.camera

    const rig = new BABYLON.TransformNode('xr-rig', scene)
    /*
    ARRIVE WHERE YOU WERE LOOKING FROM — height included.

    This used to take the flat camera's x/z and pin y to ZERO: "stand on the
    floor". That is right for a scene you walk around in and wrong for the ones
    this framework is mostly made of, where the flat camera ORBITS a subject from
    several metres up and looks down at it. Dropping to the floor puts you under
    the thing you came to look at. Tonio: "your world position is always quite
    low."

    So seed the height too, minus a nominal eye height, because `local-floor`
    adds the viewer's REAL head height on top — the aim is for your head to land
    where the flat camera was, not the rig's origin. Floored at 0 so a camera
    that dipped below ground does not bury you.

    (Orientation is deliberately NOT seeded. Where you look is your head's
    business — pinning it fights the headset — and the height was the part that
    actually broke the framing.)
    */
    const p = this.camera?.position
    const NOMINAL_EYE = 1.6
    rig.position.set(
      p?.x ?? 0,
      Math.max(0, (p?.y ?? NOMINAL_EYE) - NOMINAL_EYE),
      p?.z ?? -this.minDistance * 2
    )
    cam.parent = rig

    // Reference frames for spatial UI (body/neck/face follow the head; rig/world
    // are locomotion/play-space). Updated each XR frame below; UI parents to one.
    const frames = new XrFrames(scene, rig, cam)
    frames.attachInput(this.xrHelper?.input) // hand/wrist frames follow the grips
    this.xrFrames = frames

    // Body-anchored panels (inventory over the shoulders, quick-access at the
    // waist), pinned to their frame and revealed by looking toward them.
    const bodyPanels = this.bodyPanels(this).map((spec) =>
      attachFramePanel(scene, cam, frames.get(spec.frame ?? 'body'), spec)
    )

    // NPC nameplates run in a GENERAL manager now (flat + XR) — see
    // _setupNameplates() — since a frame panel gaze-reveals off the active camera
    // and works on a monitor too, not just in a headset. Not created here.

    // The in-scene settings panel (with an Exit-VR button), anchored to the eye
    // frame 60° up so it sits consistently above your sight-line.
    // Rebuildable: a structural change (expanding the perf stats, a debug source adding a
    // line) DISPOSES and re-attaches, because the panel's pointer/scroll closures can't
    // survive having their widgets swapped underneath them. Live numbers don't come
    // through here — those update the <text> nodes in place.
    let panel = this._attachXrPanel(base, frames.eye)
    this._refreshXrPanel = () => {
      panel.dispose()
      panel = this._attachXrPanel(base, frames.eye)
    }

    // A subtle grid floor — something to stand on and judge motion against.
    // Show the grid when `xr-grid="on"`, or `"auto"` (default) UNLESS a player
    // entity is driving the rig — a focused controllable (biped/car/aircraft via
    // input-focus) is its own "non-default rig", so auto hides the grid there.
    // `"off"` always hides it. (A custom setupXr never reaches this code at all.)
    const focus = this.querySelector('tosi-b3d-input-focus') as {
      focused?: unknown
    } | null
    const playerDriven = focus?.focused != null
    const showGrid =
      this.xrGrid === 'on' || (this.xrGrid === 'auto' && !playerDriven)
    let ground: BABYLON.Mesh | undefined
    let grid: GridMaterial | undefined
    if (showGrid) {
      ground = BABYLON.MeshBuilder.CreateGround(
        'xr-ground',
        { width: 200, height: 200 },
        scene
      )
      ground.isPickable = false
      /*
      UNDER THE SUBJECT, not at the world origin — and not under the viewer.

      Pinned to (0,0) it was a mystery grid off in the distance for any scene
      whose subject isn't at the origin (VR-only, since it doesn't exist flat).
      Moving it under the RIG then made it "overlap but not centred": an orbit
      camera sits `radius` away from what it looks at, so a floor under your
      feet is a floor beside the volcano.

      The subject is the orbit camera's TARGET — the same point the flat view
      frames — so the grid lands under the thing the demo is about. Falls back
      to the rig for a non-orbit camera, where "under the viewer" IS the floor.
      Stays in WORLD space (not parented) so it remains a motion reference.
      */
      const flatCam = this.camera as BABYLON.ArcRotateCamera | null
      const subject = (flatCam as any)?.target as BABYLON.Vector3 | undefined
      ground.position.x = subject?.x ?? rig.position.x
      ground.position.z = subject?.z ?? rig.position.z
      // Drop a smidge BELOW y=0 so it doesn't z-fight ("z-chase") with a scene
      // ground / water / terrain at 0 — and so the real scene ground wins visually
      // (the grid only shows through where there's no ground, rather than covering
      // it). Imperceptible underfoot (you stand on the local-floor at 0).
      ground.position.y = -0.05
      grid = new GridMaterial('xr-ground-grid', scene)
      grid.majorUnitFrequency = 5
      grid.minorUnitVisibility = 0.4
      grid.gridRatio = 1
      grid.mainColor = new BABYLON.Color3(0.09, 0.11, 0.15)
      grid.lineColor = new BABYLON.Color3(0.25, 0.45, 0.7)
      grid.opacity = 0.7
      ground.material = grid
    }

    /*
    LOCOMOTION IS SCALE-BLIND — and that reads as "the left stick is broken".

    2.5 m/s is right for a room-sized demo and invisible in a landscape one. The
    volcano chunk is 128 * 4 = 512 units across and the rig sits hundreds of
    units out, so walking moved ~0.5% of the scene per second: indistinguishable
    from nothing. TURNING is angular (rad/s) and therefore scale-free, which is
    exactly why the right stick felt fine while the left felt dead — the
    symptom that sent us hunting a missing controller (Tonio, VR pass 2; the
    readout showed the left stick present and reporting 0.00).

    Scale to the orbit camera's radius, which is what the flat view already uses
    to frame the scene. The clamp floor is 1 so a small demo keeps TODAY's
    numbers exactly; the ceiling stops a galaxy-scale camera from making a step
    a light-year.
    */
    const flatRadius = (this.camera as BABYLON.ArcRotateCamera | null)?.radius
    const MOVE_SCALE = Math.min(20, Math.max(1, (flatRadius ?? 8) / 8))
    const HORIZ_SPEED = 2.5 * MOVE_SCALE // metres/sec
    const VERT_SPEED = 2.0 * MOVE_SCALE
    const TURN_SPEED = 2.0 // radians/sec at full deflection
    const DEAD = 0.15
    const CHASE_HEIGHT = 2.5 // chase-cam height above a piloted entity
    // The scene's input focus (if any): when it has a focused controllable, the
    // XR controllers drive THAT (via XrGamepadSource → its mapping) and the rig
    // chase-follows it instead of free walk/fly. Looked up once; .focused is live.
    const focusEl = this.querySelector('tosi-b3d-input-focus') as {
      focused?: {
        getCameraTarget?: () => BABYLON.Node | null
        cameraView?: string
        crashed?: boolean
        eyeHeight?: number
        cockpitForward?: number
        chaseMinHeight?: number
        chaseHeight?: number
        chaseDistance?: number
        getHeadPosition?: () => BABYLON.Vector3 | null
        /** Level position+heading node to PARENT the chase rig to — see
         * `B3dControllable.getChaseAnchor`. Absent/null ⇒ the eased
         * world-space follow below. */
        getChaseAnchor?: () => BABYLON.TransformNode | null
        lastInput?: { cameraZoom: number; cameraPeek: number }
      }
    } | null
    let last = Date.now()
    // Reused scratch vectors — never allocate inside the per-frame loop (in XR
    // that runs at 72-120fps, and the garbage was driving the perf creep).
    const fwd = new BABYLON.Vector3()
    const side = new BABYLON.Vector3()
    const head = new BABYLON.Vector3()
    const tmp = new BABYLON.Vector3()
    // Thumbstick-scroll: while a scrollable panel is gaze-visible, the RIGHT
    // stick's Y scrolls it and is withheld from vertical movement. One axis, one
    // hand — see the note at the call site for why it used to be everything.
    const SCROLL_SPEED = 1200 // panel viewBox units / sec at full stick (2× — VR thumbstick scroll felt sluggish vs the flat drag)
    // Chase-cam follow state (ported from the biped's XR camera): smoothly track
    // the piloted entity's position AND facing, with head-tracking compensation.
    const chasePos = new BABYLON.Vector3()
    const yawQuat = new BABYLON.Quaternion()
    const mtx = new BABYLON.Matrix()
    let chaseYaw = 0
    let chaseYawOffset = 0
    // Declared HERE, above `rearmYaw`, because re-seat has to re-arm this too —
    // see the note there. Kept out of the later block so the closure can never
    // reference it before initialisation.
    let chaseFirstFrame = true
    let cockpitYawOffset = 0 // head yaw captured when you take the seat
    // Deferred + re-armable, rather than captured once on entry. See the capture site.
    let yawCaptureNeeded = false
    // Same, for FREE locomotion (no piloted entity) — see the capture below.
    // Armed on entry so the first posed frame seats you facing the subject.
    let freeYawNeeded = true
    // The head yaw the free seed captured. The eye frame (which the scene panel
    // hangs off) takes its yaw from `eyeYawOffset`, NOT from the head — so it
    // must carry the same offset or the panel sits `headYaw` away from where
    // you are looking. Cockpit already does this with `cockpitYawOffset`.
    let freeYawOffset = 0

    const sm = base.sessionManager
    /** A real head pose this frame? Before one arrives the camera's rotation is stale. */
    const hasViewerPose = (): boolean => {
      const f = sm.currentFrame
      const rs = sm.referenceSpace
      if (f == null || rs == null) return false
      try {
        return f.getViewerPose(rs) != null
      } catch {
        return false
      }
    }

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
    const rearmYaw = (): void => {
      /*
      RE-SEAT MUST RE-ARM ALL THREE CAMERA PATHS — they capture yaw separately.

      There are three, and each has its own capture: COCKPIT bakes
      `cockpitYawOffset` (gated on `yawCaptureNeeded`), FREE locomotion seeds
      `rig.rotation.y` (gated on `freeYawNeeded`), and CHASE/FPV derives
      `chaseYawOffset` — gated on `chaseFirstFrame`, which re-seat used to leave
      alone. So re-seating in an aircraft's chase view did NOTHING, while the
      identical button worked in a cockpit and in an orbit demo.

      The tell was diagnostic: toggling cockpit↔chase "fixed" it, because the
      view-change path sets `chaseFirstFrame` — the repair was the toggle, not
      the button (Tonio, VR pass 2: "it did start working after I had toggled
      between cockpit and chase a bit").

      A capture added later must be re-armed here, or it inherits this bug.
      */
      yawCaptureNeeded = true
      // Orbit demos too, or the Meta button appears to do nothing in exactly
      // the scenes where you cannot fly out of a bad heading.
      freeYawNeeded = true
      // Chase/FPV. Also re-anchors `chasePos`, which is what a re-seat means
      // for a third-person camera.
      chaseFirstFrame = true
    }
    let resetSpace: XRReferenceSpace | null = null
    const bindReset = (): void => {
      resetSpace?.removeEventListener('reset', rearmYaw)
      resetSpace = sm.referenceSpace ?? null
      resetSpace?.addEventListener('reset', rearmYaw)
    }
    bindReset()
    // Babylon swaps the reference space on teleport/recentre — rebind, and re-seat.
    const refSpaceObs = sm.onXRReferenceSpaceChanged.add(() => {
      bindReset()
      rearmYaw()
    })
    /*
    RE-SEAT IS A CHICKEN-AND-EGG GESTURE — so confirm it with your head straight.

    Re-seating takes your CURRENT head yaw as forward. But to press the button
    you must LOOK AT the button, so if the panel has drifted off to the left you
    turn left to reach it and re-seat then points the rig at... where the panel
    was. The gesture defeats itself exactly when you need it (Tonio, VR pass 2).

    So the button no longer re-seats. It raises a prompt and waits for a trigger:
    "look comfortably ahead, then pull the trigger." Pull it and the yaw is
    captured from wherever you are looking THEN, which is the direction you
    actually meant.

    The prompt is pinned to the FACE frame — head-locked, `reveal: 'always'`.
    Face-locking normally fights the headset and we avoid it; here it is the
    whole point, because the instruction has to stay readable WHILE you turn your
    head to face forward. This is the one case that earns it.

    The SYSTEM recentre (holding the Meta button) still re-seats immediately —
    you were already looking where you meant, and adding a confirmation to the
    headset's own gesture would be impertinent.
    */
    let reseatPrompt: { dispose: () => void } | null = null
    let reseatArmed = false
    let triggerWasDown = true // ignore a trigger still held from pressing the button
    const clearReseatPrompt = (): void => {
      reseatPrompt?.dispose()
      reseatPrompt = null
      if (reseatArmed) {
        this.suppressInput(false)
        this.freeze(false)
      }
      reseatArmed = false
    }
    const promptReseat = (): void => {
      if (reseatArmed) {
        // Pressing it again is a cancel — never trap someone behind a prompt.
        clearReseatPrompt()
        return
      }
      reseatArmed = true
      triggerWasDown = true
      // Borrowing the trigger means the trigger must stop meaning "shoot".
      // The input gate is unconditional (and is the only half a networked world
      // could honour); the freeze is policy, default on for single player.
      this.suppressInput(true)
      if (!isOff(this.reseatFreeze)) this.freeze(true)
      const svg = panel3d(
        {
          width: 420,
          height: 210,
          // DELIBERATELY NOT `panelBg`. This prompt appears in front of the
          // scene panel you were already looking at, and two near-identical
          // translucent dark slabs read as one confusing surface. `info` is the
          // themeable status SURFACE for exactly this: opaque, so the panel
          // behind cannot show through the instruction, and distinct enough to
          // say "different thing, acting now".
          background: w3dTheme.info,
        },
        label3d({ text: 'Re-seat', bold: true }),
        label3d({ text: '1. Look comfortably ahead.' }),
        label3d({ text: '2. Pull right trigger to reseat.' }),
        label3d({ text: 'Or, pull left trigger to cancel.', muted: true })
      )
      reseatPrompt = attachFramePanel(scene, cam, frames.get('face'), {
        frame: 'face',
        // Straight ahead of the FACE frame, so it is dead centre whichever way
        // you turn — and `focus` is the frame origin, i.e. your own eyes.
        anchor: {
          azimuthDeg: 0,
          elevationDeg: 0,
          distance: 0.9,
          focus: [0, 0, 0],
        },
        // ~2x the 0.26 default: at 0.9m that is a comfortable read rather than
        // a postage stamp, and a modal should out-weigh the panel behind it.
        width: 0.55,
        reveal: 'always',
        svg,
      })
    }
    this._recenterXr = promptReseat
    /*
    XR INPUT + RIG READOUT — because a headset has no console.

    "I can rotate with the right stick but cannot move" means the free-fly
    branch IS running (turn lives in it) while `controllers['left']` is absent —
    but absent WHY is unguessable from outside the headset, and guessing is what
    this session has repeatedly paid for. So say it out loud, in the one readout
    that exists in VR: which hands are seen, whether their thumbsticks report
    axes, and where the rig ended up (including whether the entry yaw seed
    actually fired).
    */
    const squeezeDbg = (h: 'left' | 'right') =>
      ((controllers[h] as Record<string, any> | undefined)?.[
        'xr-standard-squeeze'
      ]?.value as number | undefined) ?? 0
    const xrInputDbgOff = this.addDebugSource({
      name: 'xr input',
      lines: () => {
        const fmt = (h: 'left' | 'right') => {
          const c = controllers[h] as Record<string, any> | undefined
          if (c == null) return `${h[0].toUpperCase()}:—`
          const stick = c['xr-standard-thumbstick']
          const ax = stick?.axes
          if (ax == null)
            return `${h[0].toUpperCase()}:no-stick[${Object.keys(c).join(',')}]`
          return `${h[0].toUpperCase()}:${ax.x.toFixed(2)},${ax.y.toFixed(2)}`
        }
        const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0)
        return [
          `${fmt('left')}  ${fmt('right')}`,
          `lift L${squeezeDbg('left').toFixed(1)} R${squeezeDbg(
            'right'
          ).toFixed(1)}`,
          `rig ${rig.position.x.toFixed(1)},${rig.position.y.toFixed(
            1
          )},${rig.position.z.toFixed(1)} yaw ${deg(rig.rotation.y)}°`,
          `seed ${freeYawNeeded ? 'PENDING' : 'done'} · parent ${
            rig.parent ? 'piloted' : 'world'
          } · x${MOVE_SCALE.toFixed(0)}`,
        ]
      },
    })
    let lastView = '' // re-seat when the camera view toggles
    let chaseZoom = 0.5 // 0..1 chase distance (right stick Y while piloting)
    let lastPiloted: BABYLON.TransformNode | null = null
    const ZOOM_RATE = 0.8
    const MAX_PEEK = 0.8 // radians of temporary look (right stick X), ~46°
    const frame = base.sessionManager.onXRFrameObservable.add(() => {
      const now = Date.now()
      // Re-seat confirmation: capture the yaw from where you are looking WHEN
      // YOU PULL, not from where you had to look to press the button. Either
      // hand. Edge-triggered, and `triggerWasDown` starts true so a trigger
      // still held from pressing the button doesn't fire it instantly.
      if (reseatArmed) {
        const t = (h: 'left' | 'right') =>
          ((controllers[h] as Record<string, any> | undefined)?.[
            'xr-standard-trigger'
          ]?.value ?? 0) > 0.6
        const rightDown = t('right')
        const leftDown = t('left')
        const down = rightDown || leftDown
        if (down && !triggerWasDown) {
          // RIGHT commits, LEFT cancels — two hands, no ambiguity, and no way
          // to be trapped behind the prompt.
          const commit = rightDown
          clearReseatPrompt()
          if (commit) rearmYaw()
        }
        triggerWasDown = down
      }
      const dt = Math.min((now - last) * 0.001, 0.1)
      last = now
      // Piloting a live controllable → the controllers fly it (via its mapping)
      // and the rig FOLLOWS it: positioned behind/at it AND rotated to face the
      // same way, so turning the entity turns your view (head tracking on top).
      // A crashed entity yields back to free walk/fly so you can leave the wreck.
      const entity = focusEl?.focused
      // First-person = fpv/cockpit; chase = third. Gates view-restricted panels.
      const viewCtx = {
        firstPerson: entity
          ? entity.cameraView === 'fpv' || entity.cameraView === 'cockpit'
          : true,
      }
      // Keep the body/neck/face frames tracking the head (after locomotion has
      // moved the rig last frame; before any UI reads them this frame).
      frames.update(dt)
      for (const p of bodyPanels) p.update(viewCtx)

      // getCameraTarget() (not .mesh) — the aircraft's node is `meshNode`, so
      // .mesh is undefined and it would never be chased.
      const piloted = entity?.crashed
        ? null
        : ((entity?.getCameraTarget?.() ??
            null) as BABYLON.TransformNode | null)
      if (piloted != null) {
        const view = entity?.cameraView ?? ''
        const eyeH = entity?.eyeHeight ?? 1.6
        const isFpv = view === 'fpv'
        const isCockpit = view === 'cockpit'
        const isChase = !isFpv && !isCockpit
        // Re-seat (recapture the recenter) on a view toggle as well as an entity
        // change, so cockpit↔chase doesn't snap.
        if (view !== lastView) {
          chaseFirstFrame = true
          lastView = view
        }
        // Right stick (while piloting) zooms the chase and peeks left/right.
        const zoomIn = entity?.lastInput?.cameraZoom ?? 0
        const peekIn = entity?.lastInput?.cameraPeek ?? 0
        const peekYaw = peekIn * MAX_PEEK

        // COCKPIT: LITERALLY parent the rig to the hull — Babylon composes the
        // transform, so the camera inherits the airframe's full orientation with
        // zero hand-rolled quaternions. Identity local rotation = ride the hull's
        // orientation exactly. Scale is neutralized (rig world scale → 1) so head
        // tracking and the seat offset stay 1:1. The seat offset is head-comp'd
        // so your eye lands at (0, eyeH, cockpitForward) in the hull frame.
        if (isCockpit) {
          if (rig.parent !== piloted) {
            rig.parent = piloted
            yawCaptureNeeded = true
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
              : 0
            yawCaptureNeeded = false
          }
          // Neutralize the hull's scale so head tracking & the seat offset stay
          // 1:1 (no-op once the hull is canonical, but the model isn't always).
          const s = piloted.scaling.x || 1
          rig.scaling.set(1 / s, 1 / s, 1 / s)
          // Rig local rotation = RotationY(−entryYaw): swings the head to forward.
          BABYLON.Quaternion.RotationYawPitchRollToRef(
            -cockpitYawOffset,
            0,
            0,
            yawQuat
          )
          rig.rotationQuaternion = yawQuat
          // Head-comp THROUGH that rotation so the eye still lands at the seat.
          BABYLON.Matrix.FromQuaternionToRef(yawQuat, mtx)
          BABYLON.Vector3.TransformCoordinatesToRef(cam.position, mtx, tmp)
          rig.position.set(
            -tmp.x / s,
            (eyeH - tmp.y) / s,
            ((entity?.cockpitForward ?? 0.5) - tmp.z) / s
          )
          // Counter-rotate the eye frame by +entryYaw so the panels DON'T move
          // (they were already correct) while the camera recenters.
          frames.eyeYawOffset = cockpitYawOffset
          chaseFirstFrame = true // re-seat the chase on toggle-out
          return
        }

        // Non-cockpit: ensure the rig is back in world space — unless it is
        // riding a chase ANCHOR, which is the good case (see below).
        const chaseAnchor = isFpv ? null : entity?.getChaseAnchor?.() ?? null
        if (rig.parent != null && rig.parent !== chaseAnchor) {
          // setParent(null), NOT `parent = null` — see the note in the
          // free-walk branch. Harmless here (the pose is recomputed below), but
          // spelled the same way so neither site can drift into the other.
          rig.setParent(null)
          rig.scaling.set(1, 1, 1)
          chaseFirstFrame = true
        }

        if (isChase) {
          chaseZoom = Math.max(
            0,
            Math.min(1, chaseZoom - zoomIn * dt * ZOOM_RATE)
          )
        }
        const loH = entity?.chaseMinHeight ?? eyeH
        const chaseH = entity?.chaseHeight ?? CHASE_HEIGHT
        const chaseD = entity?.chaseDistance ?? 5
        // fpv: at the head (back 0). chase: behind + above (zoomable).
        const back = isFpv ? 0 : chaseD * (0.8 + chaseZoom * 1.1)
        const up = isFpv ? eyeH : loH + (chaseH - loH) * chaseZoom
        piloted.getDirectionToRef(XR_FORWARD, fwd) // world forward
        const targetYaw = Math.atan2(fwd.x, fwd.z)
        // fpv: anchor to the actual head bone if the entity exposes it.
        const headPos = isFpv ? entity?.getHeadPosition?.() ?? null : null
        // The node ORIGIN — the vehicle convention's centred, grounded stance
        // point. NOT `getAbsolutePivotPoint()`: that returns the CoG, which is a
        // MASS centre authored off the centreline (the scout's is 0.4 units to
        // one side), so anchoring there shifts the chase sideways. Tried, and it
        // regressed the flat view.
        const targetX = headPos ? headPos.x : piloted.position.x - fwd.x * back
        const targetY = headPos ? headPos.y : piloted.position.y + up
        const targetZ = headPos ? headPos.z : piloted.position.z - fwd.z * back
        if (chaseFirstFrame || lastPiloted !== piloted) {
          // Align to where the headset is currently looking so it doesn't snap.
          chaseFirstFrame = false
          lastPiloted = piloted
          chaseYawOffset = cam.rotationQuaternion
            ? cam.rotationQuaternion.toEulerAngles().y
            : 0
          chaseYaw = targetYaw - chaseYawOffset
          chasePos.set(targetX, targetY, targetZ)
        }

        /*
        PARENTED CHASE — the rigid path, when the entity offers an anchor.

        The rig becomes a CHILD of a level position+heading node the entity
        updates in the same tick it moves. That fixes three separate faults at
        once, all measured 2026-08-26 (see TODO → "THE CHASE RIG"):

          1. ORDER. This observer is `onXRFrameObservable`, which fires BEFORE
             `scene.render()`; the entity moves in `registerBeforeRender`, which
             fires inside it. So the world-space path below positions the rig
             from LAST frame's aircraft position, every frame — and a variable
             frame time turns that fixed lag into jitter. A child's world matrix
             is resolved at render, after the move.
          2. LAG. `chasePos += (target - chasePos) * k*dt` is a first-order
             tracker, so it sits `v/k` behind — about 6.8 m at 61 m/s, and
             PROPORTIONAL TO SPEED. Tonio, in a headset: "throttle up the
             aircraft gets further away. Throttle down it gets closer." A child
             at a fixed local offset cannot drift.
          3. FRAME-RATE DEPENDENCE. `k*dt` as a lerp factor is the wrong form
             (`1 - exp(-k*dt)` is the right one), so the easing itself changed
             behaviour with frame rate.

        Level and yaw-only, exactly as the un-parented version was: parenting to
        the airframe would hand the view its attitude, and a rolling horizon in
        a headset is why this was not simply parented in the first place.

        Head compensation stays. It is not decoration — `cam.position` is the
        tracked head offset within the rig, and in a floor-level reference space
        that is your whole standing height. It mirrors the cockpit branch above,
        which has always worked this way. The residual staleness is a frame of
        HEAD motion (millimetres), not a frame of aircraft motion (metres).
        */
        if (chaseAnchor != null) {
          if (rig.parent !== chaseAnchor) {
            rig.parent = chaseAnchor
            rig.scaling.set(1, 1, 1)
          }
          BABYLON.Quaternion.RotationYawPitchRollToRef(
            peekYaw - chaseYawOffset,
            0,
            0,
            yawQuat
          )
          rig.rotationQuaternion = yawQuat
          BABYLON.Matrix.FromQuaternionToRef(yawQuat, mtx)
          BABYLON.Vector3.TransformCoordinatesToRef(cam.position, mtx, tmp)
          // Anchor-local: +Z is the entity's forward, so behind is −Z.
          rig.position.set(-tmp.x, up - tmp.y, -back - tmp.z)
          frames.eyeYawOffset = chaseYawOffset - peekYaw
          return
        }
        // Chase eases horizontally (turning doesn't snap); vertical always tracks
        // tightly so it doesn't sink below on a climb. fpv tracks tight all round.
        // `1 - exp(-k*dt)`, NOT `k*dt`: the latter is not frame-rate
        // independent, so the follow behaved differently at 72 and 90 Hz. Only
        // entities with no chase anchor still come through here (a biped, a
        // car) — an aircraft is parented above and does not ease at all.
        const posT = 1 - Math.exp(-(isChase ? 9 : 16) * dt)
        const posTy = 1 - Math.exp(-16 * dt)
        const yawT = 1 - Math.exp(-6 * dt)
        chasePos.x += (targetX - chasePos.x) * posT
        chasePos.y += (targetY - chasePos.y) * posTy
        chasePos.z += (targetZ - chasePos.z) * posT
        let yawDiff = targetYaw - chaseYawOffset - chaseYaw
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
        chaseYaw += yawDiff * yawT
        // Compensate for the head's local (tracked) offset so the HEAD lands at
        // chasePos: rig = chasePos − (headLocal rotated into the rig's yaw).
        BABYLON.Quaternion.RotationYawPitchRollToRef(
          chaseYaw + peekYaw,
          0,
          0,
          yawQuat
        )
        BABYLON.Matrix.FromQuaternionToRef(yawQuat, mtx)
        BABYLON.Vector3.TransformCoordinatesToRef(cam.position, mtx, tmp)
        rig.position.set(
          chasePos.x - tmp.x,
          chasePos.y - tmp.y,
          chasePos.z - tmp.z
        )
        rig.rotationQuaternion = yawQuat
        // Eye-frame panels align with the LOGICAL forward (entity facing), not
        // the rig's recentered yaw: cancel the recenter (and the live peek).
        frames.eyeYawOffset = chaseYawOffset - peekYaw
        return
      }

      // Free walk/fly. If we were just piloting, hand the rig's yaw back to euler
      // (a set rotationQuaternion overrides the euler the stick-turn below uses).
      chaseFirstFrame = true
      lastPiloted = null
      lastView = ''
      // Match the seed: the eye frame's yaw is rig-local, so without this the
      // panel hangs `headYaw` away from your gaze — "the panel is behind me",
      // reproducibly, whenever you happened to enter facing off-axis.
      frames.eyeYawOffset = freeYawOffset
      if (rig.parent != null) {
        /*
        `setParent(null)`, NEVER `parent = null`.

        Assigning `parent` KEEPS THE LOCAL POSE and reinterprets it as world, so
        a rig sitting at local (0, 2, −5) behind its parent teleports to (0, 2,
        −5) in the WORLD — next to the origin. `setParent` preserves the world
        transform, which is what "back to world space" was always supposed to
        mean.

        This is the path a death takes: `releaseFocus()` nulls the focused
        entity, so the next XR frame finds nothing piloted and falls through to
        here. Tonio, VR: "I collided with wreckage high up and respawned at the
        origin or starting point with the wrecked plane hanging in mid-air off
        in the distance." He was not moved away from the wreck — he was moved to
        the ORIGIN, and the wreck stayed where he died (measured: a corpse
        drifts 0.05 m in 10 s).

        The comment here used to say "came from the cockpit", and that was true:
        only the cockpit branch parented the rig, which is why TODO has carried
        "COCKPIT DEATH: … the aircraft was moved way away from me" as a
        cockpit-only oddity since 0.7.0. Parenting the CHASE rig (the jitter
        fix) made the same latent bug reachable from the view people actually
        fly in, which is how a five-month-old note finally got diagnosed.
        */
        rig.setParent(null)
        rig.scaling.set(1, 1, 1)
      }
      if (rig.rotationQuaternion != null) {
        rig.rotation.y = rig.rotationQuaternion.toEulerAngles().y
        rig.rotationQuaternion = null
      }

      /*
      FACE WHAT YOU WERE LOOKING AT — the free-locomotion case.

      Both PILOTED paths seed yaw against the head (cockpit bakes
      `cockpitYawOffset`, chase does `chaseYaw = targetYaw - chaseYawOffset`).
      Free locomotion never did, so an ORBIT demo — one with no piloted entity,
      which is most of them — dropped you in facing whichever way your head
      physically pointed, with the scene wherever the unrotated rig left it.
      Reported as the panel being "behind and left" and the subject "nowhere in
      sight" (Tonio, VR pass 2, carved-landform/volcano).

      Same shape as the cockpit capture, including the reason it waits: for the
      first frames of a session the viewer pose can be null and the camera
      reports a stale rotation, so capturing early bakes a garbage yaw. That is
      also why TOGGLING VIEWS "fixed" it — the toggle re-armed a capture on a
      frame that had a real pose.

      Forward is the flat camera's view direction (an ArcRotateCamera looks at
      its target), so you arrive looking at what you were looking at.
      */
      if (freeYawNeeded && hasViewerPose()) {
        const flat = this.camera as BABYLON.ArcRotateCamera | null
        if (flat != null) {
          const tgt = (flat as any).target as BABYLON.Vector3 | undefined
          const dx = (tgt?.x ?? 0) - flat.position.x
          const dz = (tgt?.z ?? 0) - flat.position.z
          if (Math.hypot(dx, dz) > 1e-4) {
            const headYaw = cam.rotationQuaternion
              ? cam.rotationQuaternion.toEulerAngles().y
              : 0
            rig.rotation.y = Math.atan2(dx, dz) - headYaw
            freeYawOffset = headYaw
          }
        }
        freeYawNeeded = false
      }

      const left = controllers['left']?.['xr-standard-thumbstick']?.axes
      const right = controllers['right']?.['xr-standard-thumbstick']?.axes

      /*
      PANEL SCROLL — the RIGHT stick's Y, and nothing else.

      This used to withhold BOTH sticks from locomotion whenever a scrollable
      panel was visible, and it set the withhold flags for every connected
      controller UNCONDITIONALLY — not when a stick had actually scrolled
      anything. So a scene with a scene-panel long enough to scroll had NO
      locomotion at all: left stick dead, turn dead, vertical dead. Reported as
      "I'm stuck here… it's still not allowing me to move around at all in VR",
      on demo after demo, while every control was implemented and correct.

      Scroll stays gated on GAZE rather than on the controller ray (a pick that
      breaks must not take the only escape hatch with it — that lesson holds).
      What changed is the COST: it claims one axis on one hand, so walking and
      turning are never withheld, and the most you lose while reading a panel is
      vertical movement — which you are not using while reading a panel.
      */
      let rightScroll = false
      if (panel.scrollable && panel.plane.visibility > 0.5) {
        const axes = right
        if (axes != null && Math.abs(axes.y) > DEAD) {
          panel.scrollBy(axes.y * SCROLL_SPEED * dt)
          rightScroll = true
        }
      }

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
      /*
      ALTITUDE ON THE BUMPERS: left = down, right = up.

      Tonio's mapping, and the same hand logic as the triggers (left brakes,
      right accelerates) so the pair is learned once. It is ANALOG — squeeze
      value, not a boolean — so you can ease onto a height rather than bang
      between rates.

      It exists because the right stick's vertical was not a reliable way down.
      That axis is ALSO the panel scroll, so in any scene with a scrollable
      panel open — which is most of the demos, they set `scenePanelOpen` — the
      stick scrolls and the rig does not move, and the control appears simply
      missing ("there's still no way to change your altitude"). Two dedicated
      buttons cannot be stolen by a panel.

      The stick keeps working when nothing is claiming it, so nobody who
      already knows it loses it.
      */
      const squeeze = (h: 'left' | 'right') =>
        ((controllers[h] as Record<string, any> | undefined)?.[
          'xr-standard-squeeze'
        ]?.value as number | undefined) ?? 0
      const lift = squeeze('right') - squeeze('left')
      if (Math.abs(lift) > DEAD) rig.position.y += lift * VERT_SPEED * dt
      if (right != null && !rightScroll && Math.abs(right.y) > DEAD) {
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
      dispose: () => {
        base.sessionManager.onXRFrameObservable.remove(frame)
        clearReseatPrompt()
        xrInputDbgOff()
        sm.onXRReferenceSpaceChanged.remove(refSpaceObs)
        resetSpace?.removeEventListener('reset', rearmYaw)
        this._recenterXr = noop
        this._refreshXrPanel = noopRefresh
        panel.dispose()
        for (const p of bodyPanels) p.dispose()
        frames.dispose()
        this.xrFrames = null
        cam.parent = null
        ground?.dispose()
        grid?.dispose()
        rig.dispose()
      },
    }
  }

  // Build a panel SVG from a row list. Each surface (overlay, in-scene) builds
  // its own with independent widget instances bound to the same reactive
  // values, so they stay in sync.
  /*
  SIZE TO THE CONTENT, capped — and PIN the bar.

  The height used to be guessed as `46 + rows * 48`, which assumes a row is
  about 48px tall. Most are. `lightEditor3d` is ONE row that lays out over
  1200px, so a panel holding it was built ~190px tall and you scrolled a
  postage stamp: Tonio, from the headset, "crammed into a tiny tiny view so you
  have to scroll it constantly… I didn't try messing with curves because they
  were too far down."

  `height: 'fit'` measures the widgets and takes their real total; `maxHeight`
  stops it becoming a wall. Past the cap it scrolls, as before — but now only
  when it genuinely does not fit.

  `header` keeps the icon bar out of that scroll. It carries Exit VR, and a
  control you need in order to LEAVE must not be the one that scrolls away.
  */
  private _makePanel(rows: Widget3d[], header: Widget3d[] = []): SVGSVGElement {
    return panel3d(
      {
        width: 320,
        height: 'fit',
        maxHeight: 620,
        // Extra top padding so the first row clears the × close button
        // (top-right) and the panel doesn't read footer-heavy.
        paddingTop: 34,
        header,
      },
      ...rows
    )
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
  private _setupNameplates(): void {
    const scene = this.scene
    // A `Nameplates` debug source used to hang here, reporting gaze-reveal internals
    // (xr/cam/updates/cos) to diagnose plates staying visible inside a session. That's
    // resolved, so it's gone — scaffolding kept past its bug is just a row competing for
    // panel space with whatever you're debugging NEXT. The instrumentation it read
    // (`panel.debug` in frame-panel.ts) is deliberately still there and still live, so
    // restoring the readout is one `addDebugSource` block if the reveal ever regresses.
    scene.onBeforeRenderObservable.add(() => {
      const cam = scene.activeCamera as BABYLON.TargetCamera | null
      if (cam == null) return
      // Add newly-ready bipeds / drop departed ones only occasionally (querySelector
      // + set churn shouldn't run every frame).
      if (this._nameplateScan-- <= 0) {
        this._nameplateScan = 30
        this._scanNameplates(cam)
      }
      for (let i = 0; i < this._nameplateList.length; i++) {
        this._nameplateList[i].ef.update(cam)
        this._nameplateList[i].panel.update()
      }
    })
  }

  private _scanNameplates(cam: BABYLON.TargetCamera): void {
    const scene = this.scene
    const seen = new Set<Element>()
    for (const el of Array.from(this.querySelectorAll('tosi-b3d-biped'))) {
      const b = el as any
      if (b.player || b.mesh == null) continue
      seen.add(el)
      if (this._nameplates.has(el)) continue
      const ef = new EntityFrame(scene, b.mesh, {
        offset: [0, (b.eyeHeight ?? 1.7) + 0.25, 0],
      })
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
        svg: placeholderPanelSvg((b.id as string) || '$6M biped', 280, 116),
        width: 0.6, // 2× — readable at a glance
        // No distance gate: an earlier `maxDistance: 8` hid nameplates in VR
        // (the head is easily >8m from NPCs), while flat worked. The 26° gaze
        // cone already declutters — you only see the ones you look at.
      })
      this._nameplates.set(el, { ef, panel })
    }
    // Drop nameplates whose biped is gone (removed from the DOM / disposed mesh).
    for (const [el, n] of this._nameplates) {
      if (!seen.has(el)) {
        n.panel.dispose()
        n.ef.dispose()
        this._nameplates.delete(el)
      }
    }
    this._nameplateList = [...this._nameplates.values()]
  }

  private _setupScenePanel(): void {
    const gear = this.parts.scenePanelGear as HTMLButtonElement
    const host = this.parts.scenePanelHost as HTMLElement
    if (!this._scenePanelWired) {
      this._scenePanelWired = true
      gear.addEventListener('click', () => {
        if (host.hasAttribute('hidden')) this._openScenePanel()
        else this._closeScenePanel()
      })
    }
    // Reveal the gear when the panel has any widgets — the scenePanel hook's, or
    // the opted-in perf-stats section. (Enter VR is a SEPARATE button grouped next
    // to the gear — see the toolbar — so XR availability no longer gates the gear.)
    if (this._panelWidgets().length > 0) {
      gear.hidden = false
      if ((this as any).scenePanelOpen) this._openScenePanel()
    }
  }

  /**
   * Open the flat scene panel: a header row of small round buttons pinned
   * top-right — the icon-bar items, then close — over the panel body.
   *
   * The toggles used to be a full-width `iconBar3d` row inside the body, which
   * spent a whole row of a small panel on things you press once. They are the
   * same items either way (`_barItems`); only the flat LAYOUT changed.
   */
  private _openScenePanel(): void {
    const host = this.parts.scenePanelHost as HTMLElement
    const mk = (
      title: string,
      icon: Element | string,
      onClick: () => void,
      active = false
    ): HTMLButtonElement => {
      const b = button(
        {
          class: active ? 'scene-panel-btn active' : 'scene-panel-btn',
          type: 'button',
          title,
        },
        icon
      ) as HTMLButtonElement
      b.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      return b
    }
    const buttons = this._barItems().map((it) =>
      mk(
        it.title,
        (svgIcons as Record<string, () => Element>)[it.icon]?.() ??
          svgIcons.bug(),
        it.handleClick,
        it.active
      )
    )
    buttons.push(
      mk(
        'Close',
        // In a session the flat overlay isn't visible anyway, but keep it
        // playful: a bug-eyed face for VR, the close icon on flat screens.
        this.xrActive ? '😳' : svgIcons.close(),
        () => this._closeScenePanel()
      )
    )
    host.replaceChildren(
      div({ class: 'scene-panel-head' }, ...buttons),
      this._makePanel(this._panelWidgets())
    )
    host.removeAttribute('hidden')
  }

  private _closeScenePanel(): void {
    ;(this.parts.scenePanelHost as HTMLElement).setAttribute('hidden', '')
    // Debug tools collapse again on next open — kept out of the way by default.
    this._debugOpen.clear()
  }

  /** Rebuild the flat scene panel from the current rows, if it's open.
   * Call after async state the panel reflects has changed (e.g. a library loaded,
   * or XR availability / session state) so an already-open panel updates. */
  refreshScenePanel(): void {
    const host = this.parts?.scenePanelHost as HTMLElement | undefined
    if (host && !host.hasAttribute('hidden')) {
      this._openScenePanel()
    }
  }

  // Mount the split touch "glass" gamepad when the `gamepad` attribute is
  // present, as a light-DOM child (projected over the canvas via the slot, and
  // findable by b3dInputFocus, which adds its poll() to the input provider).
  // The attribute value selects/positions controls.
  private _setupGamepad(): void {
    const attr = this.getAttribute('gamepad')
    const prop = (this as any).gamepad
    if (attr == null && (prop === false || prop == null)) return
    const spec = typeof prop === 'string' && prop !== '' ? prop : attr ?? ''
    this.appendChild(
      b3dGamepad({
        controls: spec,
        scale: (this as any).gamepadScale ?? 1,
        // Reachable opt-out: the pad fades once a real input device appears,
        // and a scene that WANTS it permanent (kiosk, screenshot, a demo about
        // the pad) had no way to say so.
        fade: (this as any).gamepadFade ?? 'on',
      })
    )
  }

  // In-scene surface: render the panel onto a plane positioned each frame in
  // WORLD space relative to the HEAD (not the rig / flat camera), floating
  // overhead in the direction you face and fading in only as you tilt your head
  // up — so it never obstructs the forward view. Picks route via the scene
  // pointer observable (mouse and XR controllers alike) into the panel's own
  // viewBox coords. Returns a disposer.
  private _attachXrPanel(
    base: BABYLON.WebXRExperienceHelper,
    anchorFrame: BABYLON.TransformNode
  ): {
    dispose: () => void
    plane: BABYLON.AbstractMesh
    scrollBy: (dy: number) => void
    scrollable: boolean
  } {
    const scene = this.scene
    // In-scene panel always carries an Exit-VR button (you can't reach a DOM
    // button inside a headset), plus any scenePanel widgets.
    // Exit VR and Re-seat ride in the ICON BAR rather than taking a full-width
    // row each. Two labelled buttons cost a third of a small panel for two
    // things you press once a session — and the panel's job in a headset is the
    // author's controls, not its own chrome. They are appended at the MOUNT
    // SITE (never branched into the shared widget list) because they are
    // genuinely XR-only: Re-seat is meaningless flat, and flat already has an
    // Exit VR in the toolbar lozenge.
    //
    // It is the PINNED header, not row 0: Exit VR scrolling out of reach is the
    // one failure this panel cannot recover from inside a headset.
    const barRow = iconBar3d({
      items: [
        {
          icon: 'logOut',
          title: 'Exit VR',
          active: false,
          handleClick: () => {
            void this.xrHelper?.baseExperience?.exitXRAsync()
          },
        },
        {
          icon: 'compass',
          title: 'Re-seat (look forward first)',
          active: false,
          handleClick: () => this.recenterXr(),
        },
        ...this._barItems(),
      ],
    })
    const rows: Widget3d[] = [...this._panelWidgets(true)]
    const panelEl = this._makePanel(rows, [barRow]) as SVGSVGElement & {
      handlePointer?: (kind: string, x: number, y: number) => void
      scrollBy?: (dy: number) => void
      scrollable?: boolean
    }
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
    const vb = panelEl.viewBox.baseVal

    // Anchored to the eye frame (origin = your head), 60° up the sight-line.
    const PLANE_W = 1.0 // metres wide (height follows the panel's aspect)
    const D = 1.4 // distance (matches the other eye-frame panels)
    const ELEV = (60 * Math.PI) / 180
    const ABOVE = D * Math.sin(ELEV) // ≈1.21 up
    const AHEAD = D * Math.cos(ELEV) // ≈0.70 ahead

    const plane = BABYLON.MeshBuilder.CreatePlane(
      'xr-panel',
      {
        width: PLANE_W,
        height: PLANE_W * (vb.height / vb.width),
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      scene
    )
    // Pointer-pickable, collision-invisible — this panel hangs in front of your
    // face, which in cockpit view is inside the aircraft's impact sweep.
    markUiMesh(plane)

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
    // The XR rig is the camera's parent. Make the panel a SECOND child of that
    // rig — the SAME coordinate space as the camera — at a FIXED local pose: the
    // head (camera) rotates within the rig to look at it, while the panel itself
    // never moves or rotates. So it's rock-steady relative to you and stays put
    // to be pointed at. No billboard (that would re-rotate it every frame). (#1)
    plane.parent = anchorFrame
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE

    let placed = false
    const frame = base.sessionManager.onXRFrameObservable.add(() => {
      if (placed) return
      placed = true
      // Seat ONCE 60° up in the eye frame (origin = head), facing back down at
      // it. `faceViewer` aims the plane's VISIBLE face (local -Z) at your head;
      // this used to aim +Z and cancel the resulting mirror twice over — once on
      // the texture and once on every pick. See dialog-placement.faceViewer.
      plane.position.set(0, ABOVE, AHEAD)
      const aim = faceViewer({ x: 0, y: ABOVE, z: AHEAD }, { x: 0, y: 0, z: 0 })
      plane.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
        aim.yaw,
        aim.pitch,
        0
      )
      plane.visibility = 1
    })

    const T = BABYLON.PointerEventTypes
    let vx = 0
    let vy = 0
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
    }
    const offDbg = this.addDebugSource({
      name: 'xr pointer',
      lines: () => [
        `events ${dbg.events}  last ${dbg.kind}  vis ${dbg.vis.toFixed(2)}`,
        `pick ${dbg.hit}`,
        `repick ${dbg.repick}  uv ${dbg.uv}`,
      ],
    })
    const obs = scene.onPointerObservable.add((pi) => {
      const kind =
        pi.type === T.POINTERDOWN
          ? 'down'
          : pi.type === T.POINTERUP
          ? 'up'
          : pi.type === T.POINTERMOVE
          ? 'move'
          : ''
      if (kind) {
        dbg.events++
        dbg.kind = kind
        dbg.vis = plane.visibility
        dbg.hit = pi.pickInfo?.pickedMesh
          ? `${pi.pickInfo.pickedMesh.name}${
              pi.pickInfo.pickedMesh === plane ? ' (PANEL)' : ''
            }`
          : pi.pickInfo?.ray
          ? 'nothing (ray ok)'
          : 'NO RAY'
      }
      // Only interactive while it's actually visible (you're looking at it).
      if (
        !kind ||
        plane.visibility < 0.5 ||
        typeof panelEl.handlePointer !== 'function'
      )
        return
      const pick = pi.pickInfo
      let uv =
        pick?.hit && pick.pickedMesh === plane
          ? pick.getTextureCoordinates()
          : null
      // The panel may be occluded (e.g. the aircraft cockpit hull blocks the
      // controller ray) — re-pick against ONLY the panel so it's still pointable.
      if (!uv && pick?.ray) {
        const p2 = scene.pickWithRay(pick.ray, (m) => m === plane)
        if (p2?.hit) uv = p2.getTextureCoordinates()
        if (kind) dbg.repick = p2?.hit ? 'HIT' : 'miss'
      } else if (kind) {
        dbg.repick = uv ? 'n/a (direct)' : 'no ray'
      }
      if (kind) dbg.uv = uv ? `${uv.x.toFixed(2)},${uv.y.toFixed(2)}` : 'none'
      if (uv) {
        // Straight through, matching `b3d-svg-plane`: u across, v flipped
        // (texture space is bottom-up). This used to need `1 - uv.x` to undo a
        // U-flipped texture on a back-facing plane — two compensations for one
        // avoidable cause, and if either had gone missing every right-aligned
        // control (slider track, toggle switch, select arrows) would have mapped
        // to the dead label zone and felt unresponsive.
        vx = uv.x * vb.width
        vy = (1 - uv.y) * vb.height
      }
      // Route every event; the panel manages press-capture and hover itself.
      if (kind === 'move' && !uv) panelEl.handlePointer('leave', 0, 0)
      else if (kind === 'down' && !uv) return
      else panelEl.handlePointer(kind, vx, vy)
    })

    return {
      plane,
      scrollable: !!panelEl.scrollable,
      scrollBy: (dy: number) => panelEl.scrollBy?.(dy),
      dispose: () => {
        base.sessionManager.onXRFrameObservable.remove(frame)
        scene.onPointerObservable.remove(obs)
        offDbg()
        this._liveDebug.xr = [] // its <text> nodes die with the panel
        tex.dispose()
        mat.dispose()
        plane.dispose()
      },
    }
  }

  disconnectedCallback(): void {
    /*
    DEFER, so a move can cancel it. See `connectedCallback`.

    `super.disconnectedCallback()` still runs immediately — tosijs owns its own
    bookkeeping and a move is normal to it; only OUR teardown (engine, timers,
    XR, the ready flag) waits to find out whether this was a removal or a move.
    */
    super.disconnectedCallback()
    if (this._teardownTimer != null) return
    this._teardownTimer = setTimeout(() => {
      this._teardownTimer = null
      this._teardown()
    }, 0) as unknown as number
  }

  private _teardownTimer: number | null = null

  private _teardown(): void {
    // Both presentations' widgets, not just the visible one — an XR panel's
    // rows outlive the session that built them otherwise.
    this._disposeWidgets('flat')
    this._disposeWidgets('xr')
    this._errorCaptureOff?.()
    this._errorCaptureOff = null
    this._pauseWatch?.()
    this._pauseWatch = null
    if (B3d._active === this) B3d._active = null
    if (this._qualityOff) {
      this._qualityOff()
      this._qualityOff = null
    }
    if (this.xrHelper) {
      this.xrHelper.dispose()
      this.xrHelper = undefined
    }
    // Kill the live-debug timer explicitly. Its self-clear only fires when BOTH row buckets are
    // empty, but `_liveDebug.flat` never empties on its own — so without this a removed scene
    // leaves a 400ms interval calling each debug source's `lines()` closure forever, pinning the
    // whole (disposed) scene from GC. A multi-demo docs page would leak one per visit. See the
    // pre-release review; this is exactly the leak class this project guards against.
    if (this._liveDebugTimer != null) {
      clearInterval(this._liveDebugTimer)
      this._liveDebugTimer = null
    }
    this._liveDebug = { flat: [], xr: [] }
    this._debugSources = []
    // Descendant B3dChild components self-dispose via their own
    // disconnectedCallback when this subtree is removed — b3d doesn't dispose them.
    this._sceneReady = false

    /*
    SUBSCRIPTIONS ARE DURABLE; SCENE STATE IS NOT. That is the whole rule.

    `_readyQueue` is deliberately NOT cleared: a callback waiting on a scene
    that got torn down before it was ready is still waiting, and dropping it
    silently is the exact bug shape this file keeps producing. It fires against
    the next scene, or never (garbage with the element), and either way nobody
    is left holding a callback that will not run.

    `pastAdditions` IS cleared, because it is scene state — meshes and lights
    belonging to the scene we just disposed. Replaying those to the next
    `addSceneListener` hands a new listener dead nodes from a dead scene.

    Handlers run BEFORE disposal so they can still read what they are releasing,
    and each is isolated: one consumer throwing must not strand the rest, nor
    abort the engine disposal below it.
    */
    for (const cb of [...this._disposeHandlers]) {
      try {
        cb()
      } catch (err) {
        console.warn('b3d whenDisposed handler failed', err)
      }
    }
    this.pastAdditions = []

    /*
    OBLITERATE THE ENGINE. A WebGL context is not memory — Chrome caps them at
    about sixteen per page and force-loses the OLDEST when you exceed it, so a
    leaked engine doesn't degrade an SPA gradually: it works for a dozen route
    changes and then a scene that was fine goes black. That is #51's symptom
    arriving by a second road, and until now this method released the XR helper,
    the quality subscription and the debug timers but never the engine or the
    scene it holds.

    Safe to be absolute here because this only runs on a GENUINE removal: a
    re-parent (an ancestor moving, which disconnects every descendant as
    collateral) cancels this in `connectedCallback` before it fires. So there is
    one rule — disconnected means gone — and no pooling, no reuse, no engine
    kept warm on the chance somebody comes back.

    Order matters: stop the loop first, or the next frame renders a scene that is
    being disposed underneath it.
    */
    this.glowLayer = undefined
    this.gui = undefined
    try {
      this.engine?.stopRenderLoop()
      this.scene?.dispose()
      this.engine?.dispose()
    } catch (err) {
      // A half-built scene (disconnected mid-init) can throw on the way down.
      // Never let teardown propagate — the element is going away regardless,
      // and a throw here would strand whatever the caller was doing.
      console.warn('b3d teardown', err)
    }
  }

  render(): void {
    super.render()
    // A render can be queued on rAF and land AFTER teardown disposed the engine.
    // Building a GlowLayer on a disposed scene is how that would surface — as a
    // GL error from a component that looks fine, which is the failure mode this
    // whole area has been generating.
    if (this.scene == null || this.scene.isDisposed) return
    const intensity = (this as any).glowLayerIntensity
    if (intensity > 0) {
      if (!this.glowLayer) {
        this.glowLayer = new BABYLON.GlowLayer('glow', this.scene)
        // A glow layer ignores `mesh.visibility` (see `excludeFromGlow`), so any panel that
        // already exists would be drawn by the glow pass even when gaze-hidden. Panels built
        // AFTER this exclude themselves on creation; these are the ones that got here first.
        for (const m of this.scene.meshes) {
          // Neither UI plaques nor leaves are light sources — keep them out of the bloom.
          if (m.name === 'frame-panel' || m.name === 'ambient-leaves')
            this.glowLayer.addExcludedMesh(m as BABYLON.Mesh)
        }
      }
      this.glowLayer.intensity = intensity
    } else if (this.glowLayer) {
      this.glowLayer.dispose()
      this.glowLayer = undefined
    }
  }
}

export const b3d = B3d.elementCreator()
