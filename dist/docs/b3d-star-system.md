# b3d-star-system

Renders an individual star system with a procedural star and its planets.
Given a `StarData` object (from `generateGalaxy`) or a galaxy seed + star
index, it creates `b3d-star` and `b3d-planet` child components with
deterministic seeds.

Planets orbit at scaled distances and can optionally animate.

## Demo

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dStarSystem, generateGalaxy } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, p, pre } = elements

const galaxy = generateGalaxy(1234, 1000)

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
  animate: demo.animate,
  showOrbits: demo.showOrbits,
})

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000011',
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
    label(
      'star index ',
      input({ type: 'range', min: 0, max: 999, step: 1, bindValue: demo.starIndex }),
    ),
    label(
      'scale ',
      input({ type: 'range', min: 1, max: 20, step: 0.5, bindValue: demo.scale }),
    ),
    label(
      'orbit scale ',
      input({ type: 'range', min: 1, max: 10, step: 0.5, bindValue: demo.orbitScale }),
    ),
    label(
      'animate ',
      input({ type: 'checkbox', bindValue: demo.animate }),
    ),
    label(
      'show orbits ',
      input({ type: 'checkbox', bindValue: demo.showOrbits }),
    ),
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
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `galaxySeed` | `1234` | Galaxy seed for deterministic generation |
| `starCount` | `10000` | Number of stars in galaxy (needed to regenerate same galaxy) |
| `starIndex` | `0` | Which star in the galaxy to render |
| `scale` | `5` | Visual scale factor for star/planet sizes |
| `orbitScale` | `3` | Multiplier for orbital distances |
| `animate` | `true` | Animate planet orbital motion |
| `showOrbits` | `true` | Show orbital path lines |