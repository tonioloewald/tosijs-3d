# color3d

**A colour picker that exists in a headset.** Saturation×value square, hue
strip, optional alpha strip, and a swatch — all SVG, so it works as a flat DOM
overlay and on a panel in an immersive session without changing.

## Why this had to be built

It was the one control the SVG UI did not have, and the only two ways to pick a
colour were both DOM: `<input type="color">` (which cannot express alpha) or a
consumer injecting one, which is what [[theme-editor]] does with tosijs-ui's.
Neither exists inside a headset. So the theme editor — the thing whose whole
subject is colour — had no colour control in the presentation this library
exists to serve.

`lightEditor3d` is not a counter-example: it offers hue and saturation and
deliberately no value, because a light's value IS its intensity. That is a fact
about lights, not a colour picker.

## Layout

```
┌───────────────┬─┬─┐   square: saturation → x, value → y
│               │ │ │   strip 1: hue
│    S × V      │H│A│   strip 2: alpha (optional)
│               │ │ │
└───────────────┴─┴─┘
  #rrggbbaa  ◧            swatch, over a chequerboard when translucent
```

## Notes that cost something to learn

**Hue survives a trip to grey.** Drag value to zero and the colour is black, and
black has no hue — so a naive round trip through RGB loses where the hue handle
was and springs it back to red. The widget keeps H, S and V as its own state and
converts only on the way out. Same reason `curve3d` holds points rather than
re-deriving them from a rendered path.

**A translucent swatch needs something behind it.** A colour at alpha 0.1 over
the panel background looks like the panel background, so the swatch sits on a
chequerboard — the one piece of skeuomorphism nobody has improved on.

## Demo

Change the colour and watch the light take it. The picker drives a real lamp,
which is the only way to tell whether the colour you picked is the colour you
meant.

```js
import { b3d, b3dLight, b3dPointLight, panel3d, label3d, color3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div } = elements

let lamp = null

const picker = color3d({
  label: 'lamp colour',
  value: '#ffd7a0',
  alpha: false,
  handleChange: (hex) => { if (lamp) lamp.diffuse = hex },
})

const panel = panel3d({ width: 300 }, label3d({ text: 'Colour' }), picker)

const scene = b3d(
  {
    style: 'width:100%;height:100%',
    sceneCreated(el, BABYLON) {
      el.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1)
      const mat = new BABYLON.StandardMaterial('m', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7)
      mat.specularColor = BABYLON.Color3.Black()
      const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 14, height: 14 }, el.scene)
      floor.material = mat
      const props = [
        BABYLON.MeshBuilder.CreateSphere('s', { diameter: 1.6 }, el.scene),
        BABYLON.MeshBuilder.CreateBox('b', { width: 1.2, height: 2.2, depth: 1.2 }, el.scene),
      ]
      props[0].position.set(1.4, 0.8, 0)
      props[1].position.set(-1.6, 1.1, 0.4)
      for (const m of props) m.material = mat
      el.register({ meshes: [floor, ...props] })
      // `orbitCam`, not `scene.activeCamera.setPosition` — there is no active
      // camera yet at sceneCreated, so that throws.
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 10, target: [0, 1, 0] })
    },
  },
  b3dLight({ intensity: 0.08 })
)

lamp = b3dPointLight({ x: 0, y: 3.4, z: 0, diffuse: '#ffd7a0', intensity: 2.4, range: 14 })
scene.append(lamp)

preview.append(
  div(
    { style: 'display:flex;gap:14px;height:100%;padding:12px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'flex:0 0 320px;overflow:auto' }, panel),
    div({ style: 'flex:1;min-width:0;display:flex' }, scene)
  )
)
```
```css
.preview { height: 100%; }
```
