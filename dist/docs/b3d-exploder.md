# b3d-exploder

Shatters a mesh into fragments and animates them flying apart. Works by
extracting vertex data, partitioning triangles into spatial clusters
(Voronoi-style), creating a new mesh per cluster, then animating each
piece with outward velocity, gravity, and tumble rotation.

Call `explodeMesh(mesh, scene, options)` to shatter any mesh. The original
mesh is hidden; fragments are created, animated, then disposed.

When a physics engine is active on the scene (via `b3dPhysics()`), fragments
automatically get rigid bodies and bounce realistically. Without physics,
a kinematic fallback handles the animation.

Set `duration` to a number (seconds) or `'frustum'` to keep fragments alive
until they all leave the camera view.

## Demo

```js
import { b3d, b3dLight, b3dSkybox, b3dGround, explodeMesh } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, button, p } = elements

let sphere = null
let B = null

function createSphere() {
  sphere = B.MeshBuilder.CreateSphere(
    'target', { diameter: 2, segments: 12 }, scene.scene
  )
  sphere.position.y = 2
  const mat = new B.StandardMaterial('mat', scene.scene)
  mat.diffuseColor = new B.Color3(0.8, 0.2, 0.1)
  sphere.material = mat
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      B = BABYLON
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 12,
        new BABYLON.Vector3(0, 1, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
      createSphere()
    },
  },
  b3dLight({ y: 1, intensity: 0.8 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ diameter: 20, color: '#556644' }),
)

function doExplode() {
  if (!sphere) return
  explodeMesh(sphere, scene.scene, {
    fragments: 24,
    force: 8,
    gravity: -15,
    tumble: 5,
    fadeStart: 0.6,
    duration: 2.5,
  })
  sphere = null
  setTimeout(createSphere, 3000)
}

preview.append(
  scene,
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace; display:flex; flex-direction:column; gap:4px' },
    p('Click to shatter the sphere'),
    button({ textContent: 'Explode!', onclick: doExplode }),
  ),
)
```