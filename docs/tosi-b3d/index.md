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
import { demoLoadout } from 'tosijs-3d/demo-utils'
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
const person = assetUrl('quaternius/UAL1_core.glb', 2)

// Your loadout: a button on the system bar opens it under the bar, with your
// bag beside it (see inventory-box).
const loadout = demoLoadout()

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
    b3dCollisions({ debug: demo.showColliders }),
    ...loadout.panels()
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
    // The SAME control, in the settings panel — so you can change the speed while it
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
| `xrRenderScale` | `0` | In a headset: the fraction of each eye's width and height drawn. `0` is auto (from the device tier: 0.67 on the low tier). Engine hardware scaling does not reach a headset; this does. Read on entering a session |
| `xrFoveation` | `-1` | In a headset: fixed foveation, 0-1. `-1` is auto (low tier 1, medium 0.5, high 0). Read on entering a session |
| `groundDetail` | `'auto'` | The ground shader's form: `full`, `lite` (three noise samples a pixel for eight, for a GPU that cannot afford the full one), or `auto` (from the device tier: lite on the low tier, and in a headset on the medium one) |
| `no-xr` | `false` | Suppress the automatic Enter-VR button (WebXR is offered by default when an immersive-vr session is supported) |
| `gamepad` | absent | When present, mount the on-screen glass gamepad wired into the input system. Bare/`true` = full layout; a value like `"a,b,left_stick"` selects controls |
| `gamepadScale` | `1` | Scale factor for the glass gamepad clusters |
| `gamepadFade` | `'on'` | `'off'` keeps the glass gamepad visible instead of fading it once a key is pressed or a hardware pad is used (the pointer never fades it) |
| `minElevation` / `maxElevation` | `5` / `70` | Default orbit-camera elevation limits (degrees above the horizon) |
| `minDistance` / `maxDistance` | `2` / `50` | Default orbit-camera zoom limits |
| `panelTitle` | `''` | The settings panel's name, drawn in its title bar beside the move and close glyphs (so it costs the panel no row) |
| `flatUi` | `'scene'` | Where the flat view's own controls are drawn. `'scene'`: in the scene (the system bar, settings panel and pause), the same UI a headset gets. `'dom'`: the HTML corner buttons, settings panel and pause, as before 0.10.7 (and where `::part(...)` styling of them shows). Any other value warns once and means `'scene'` |
| `clearColor` | `''` | The colour behind everything (`'#000'` for space); empty keeps Babylon's default |
