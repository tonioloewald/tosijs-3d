# b3d-loader

Loads a GLB/glTF scene file into the 3D scene. Meshes named with `-ignore` are discarded.
Imported point/spot lights have their intensity scaled by `lightIntensityScale`.

[Material conventions](?b3d-utils.ts) are applied automatically to all loaded meshes.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | URL of the GLB/glTF file |
| `lightIntensityScale` | `0.05` | Scale factor for imported lights |

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLoader, b3dReflections } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span } = elements

const { demo } = tosi({ demo: { time: 10 } })

const formatTime = (v) => {
  const h = Math.floor(v)
  const m = Math.round((v % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 4, 20,
          new BABYLON.Vector3(0, 1, 0), el.scene
        )
        camera.lowerRadiusLimit = 3
        camera.upperRadiusLimit = 40
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: demo.time, realtimeScale: 0 }),
    b3dLoader({ url: './materials.glb' }),
    b3dReflections(),
  ),
  div(
    { class: 'debug-panel' },
    label(
      'time ',
      input({ type: 'range', min: 0, max: 24, step: 0.1, bindValue: demo.time }),
      ' ',
      span({
        bind: {
          value: demo.time,
          binding: (el, v) => { el.textContent = formatTime(v) },
        },
      })
    )
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.debug-panel { position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 16px; padding: 8px 20px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 6px; font-size: 14px; z-index: 10; }
.debug-panel label { display: flex; align-items: center; gap: 4px; }
```

## Usage

```javascript
import { b3d, b3dLoader } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dLoader({ url: './scene.glb' })
  )
)
```