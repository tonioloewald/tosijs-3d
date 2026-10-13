# b3d-star-system

Renders an individual star system with a procedural star and its planets.
Given a galaxy seed and a star's ADDRESS (`star`, stable) or index
(`starIndex`) in the [voxel galaxy](/voxel-galaxy/), it creates `b3d-star` and `b3d-planet` child components with
deterministic seeds.

Planets orbit at scaled distances and can optionally animate.

## Demo

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dStarSystem, voxelGalaxy, label3d, slider3d, toggle3d } from 'tosijs-3d'
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
})
demo.animate.observe(() => (starSystem.animate = demo.animate.value ? 'on' : 'off'))
demo.showOrbits.observe(() => (starSystem.showOrbits = demo.showOrbits.value ? 'on' : 'off'))

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000011',
    scenePanel: () => [
      label3d({ text: 'Star system' }),
      slider3d({ label: 'star index', value: demo.starIndex, min: 0, max: 999, step: 1 }),
      slider3d({ label: 'scale', value: demo.scale, min: 1, max: 20, step: 0.5 }),
      slider3d({ label: 'orbit scale', value: demo.orbitScale, min: 1, max: 10, step: 0.5 }),
      toggle3d({ label: 'animate', value: demo.animate }),
      toggle3d({ label: 'show orbits', value: demo.showOrbits }),
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
      camera.lowerRadiusLimit = 10
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.2 }),
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
    updateInfo()
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
