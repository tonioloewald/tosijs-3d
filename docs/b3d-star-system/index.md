# b3d-star-system

Renders an individual star system with a procedural star and its planets.
Given a galaxy seed and a star's ADDRESS (`star`, stable) or index
(`starIndex`) in the [voxel galaxy](/voxel-galaxy/), it creates `b3d-star` and `b3d-planet` child components with
deterministic seeds.

Every body is a real [planet](/b3d-planet/): giants banded and ringed, rocky
worlds picked from what the generator says about each one (airless rock,
seas, a toxic hot sky, or dust; see [rocky-world](/rocky-world/)'s
`rockyWorldFor`), moons locked to their planets, and an asteroid belt where
there is room for one. Where they go is [system-layout](/system-layout/):
distances on a log scale and sizes on a square root, so the system fits on a
screen without being empty.

## Demo

```js
import { b3d, b3dLight, b3dStarSystem, spaceBackdrop, voxelGalaxy, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, p, pre } = elements

const galaxy = voxelGalaxy({ seed: 1234, brightBudget: 1000 }).view({ generatePlanets: true })

const { demo } = tosi({
  demo: {
    starIndex: 130,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
    time: 3600,
    // Which body the camera follows ('' = the whole system).
    focus: '',
  },
})

const starSystem = b3dStarSystem({
  galaxySeed: 1234,
  starCount: 1000,
  starIndex: demo.starIndex,
  scale: demo.scale,
  orbitScale: demo.orbitScale,
  // 'on'|'off' attributes, driven from the toggles' booleans below — a
  // boolean written straight into them warns (and means nothing).
  animate: 'on',
  showOrbits: 'on',
  timeScale: demo.time,
})
demo.animate.observe(() => (starSystem.animate = demo.animate.value ? 'on' : 'off'))
demo.showOrbits.observe(() => (starSystem.showOrbits = demo.showOrbits.value ? 'on' : 'off'))

// Simulated time per real second, in the unit that reads best.
const perSecond = (v) =>
  v < 60 ? `${v.toPrecision(2)} s/s`
  : v < 3600 ? `${(v / 60).toPrecision(2)} min/s`
  : v < 86400 ? `${(v / 3600).toPrecision(2)} h/s`
  : `${(v / 86400).toPrecision(3)} days/s`

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000011',
    panelTitle: 'Star system',
    scenePanel: () => [
      slider3d({ label: 'star index', value: demo.starIndex, min: 0, max: 999, step: 1 }),
      slider3d({ label: 'scale', value: demo.scale, min: 1, max: 20, step: 0.5 }),
      slider3d({ label: 'orbit scale', value: demo.orbitScale, min: 1, max: 10, step: 0.5 }),
      toggle3d({ label: 'animate', value: demo.animate }),
      slider3d({ label: 'time', value: demo.time, min: 1, max: 3.16e6, scale: 'log', format: perSecond }),
      toggle3d({ label: 'show orbits', value: demo.showOrbits }),
      // Look at one body: the camera follows it round its orbit.
      select3d({ label: 'look at', value: demo.focus, options: ['', ...starSystem.bodies.map((b) => b.name)] }),
    ],
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        100,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 1
      camera.upperRadiusLimit = 600
      camera.minZ = 0.1
      camera.maxZ = 5000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
      // FOLLOW THE CHOSEN BODY: ease the camera's target onto it each frame,
      // and on choosing, pull in to a few of its radii.
      let following = ''
      el.scene.onBeforeRenderObservable.add(() => {
        const body = starSystem.bodies.find((b) => b.name === demo.focus.value)
        const to = body ? body.node.getAbsolutePosition() : BABYLON.Vector3.Zero()
        // In place: assigning an orbit camera's target moves its distance.
        BABYLON.Vector3.LerpToRef(camera.target, to, 0.15, camera.target)
        if (demo.focus.value !== following) {
          following = demo.focus.value
          camera.radius = body ? Math.max(3, body.radius * 7) : 100
        }
      })
    },
  },
  b3dLight({ intensity: 0.2 }),
  // The star sky, without a sun: the system's own star lights it.
  ...spaceBackdrop({ sky: '/sky', sun: false }),
  starSystem,
)

const infoEl = pre({ style: 'margin:0; font-size:10px; max-height:120px; overflow-y:auto' })

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    infoEl,
  )
)
function updateInfo() {
  const sys = starSystem.getSystemData()
  if (!sys) { infoEl.textContent = ''; return }
  const lines = [sys.star.name + ' (' + sys.star.spectralType + ') HI:' + sys.star.bestHI]
  sys.planets.forEach(p => {
    let info = p.name + ' ' + p.classification + ' HI:' + p.HI
    if (p.rings > 0) info += ' rings:' + p.rings.toFixed(2)
    if (p.HI <= 2) info += ' ' + p.atmosphere
    lines.push('  ' + info)
  })
  infoEl.textContent = lines.join('\n')
}

for (const key of ['starIndex', 'scale', 'orbitScale']) {
  demo[key].observe(() => {
    starSystem.regenerate()
    demo.focus.value = ''
    updateInfo()
    // The 'look at' list is this system's bodies.
    scene.refreshScenePanel?.()
  })
}
for (const key of ['animate', 'showOrbits']) {
  demo[key].observe(() => {
    starSystem.updateOptions()
  })
}
updateInfo()
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.debug-panel pre {
  background: none;
  border: none;
  color: inherit;
  padding: 0;
  margin: 0;
}
```

> The panel's readout opts out of the doc system's `<pre>` styling. A `<pre>`
> is rendered as a CODE BLOCK there — light background, its own colour — and
> inside a panel that sets `color: white` it came out white-on-white and simply
> invisible.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `galaxySeed` | `1234` | Galaxy seed for deterministic generation |
| `starCount` | `10000` | The galaxy's bright budget (needed to regenerate the same galaxy) |
| `star` | `''` | A star's ADDRESS (`1234:bright:5021:0`, the `id` on every star). Stable, and wins over `starIndex` |
| `starIndex` | `0` | Which star to render, by position in the galaxy's view (moves if `starCount` does) |
| `scale` | `5` | Visual scale factor for star/planet sizes |
| `orbitScale` | `3` | Multiplier for orbital distances |
| `animate` | `'on'` | Animate planet orbital motion |
| `showOrbits` | `'on'` | Show orbital path lines |
| `maps` | `'off'` | `'on'`: bodies with real maps in a `system` (our own Earth, Moon and Mars, see [sol](/sol/)) are drawn from them |
| `timeScale` | `3600` | Simulated seconds per real second. Every period is real (a day, a month, a year), so this is how fast the system runs: `1` is real time, `3600` an hour a second, `3.16e6` a year in ten seconds. On top of the scene's own `timeScale` |
| `beltCount` | `1500` | Rocks drawn in the asteroid belt, when the system has one (it sits in a wide gap between the rocky planets and the first giant) |
