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
import { b3d, b3dLight, b3dSkybox, b3dGround, explodeMesh, label3d, button3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let sphere = null
// Captured from sceneCreated so the delayed respawn (setTimeout below) can
// rebuild the sphere. Lowercase on purpose — aliasing BABYLON to an ALL-CAPS
// name and reassigning it trips the tjs-lang const-rewrite bug.
let babylon = null

function createSphere(B) {
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
    // The Explode button lives in the dual-presence settings panel, so you can trigger it
    // from inside VR as well as on a flat screen.
    panelTitle: 'Exploder',
    scenePanel: () => [
      button3d({ label: 'Explode!', handleClick: doExplode }),
    ],
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      const camera = orbitCam(el, {
        alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 12,
        target: [0, 1, 0], maxElevationDeg: 70,
      })
      camera.lowerRadiusLimit = 4
      camera.upperRadiusLimit = 30
      createSphere(BABYLON)
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
  setTimeout(() => createSphere(babylon), 3000)
}

preview.append(scene)
```

> Shatter the sphere from the settings panel — the same panel floats in front of
> you in VR, so this works in a headset too.
