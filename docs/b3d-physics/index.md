# b3d-physics

Enables Jolt physics on the scene. Add as a child of `<tosi-b3d>` to
opt in to rigid-body simulation. Other components (like the mesh exploder)
auto-detect the physics engine and use it when available.

Jolt loads asynchronously (WASM). The component exposes a `ready` promise
and dispatches a `'physics-ready'` event when initialization completes.

## Demo

```js
import { b3d, b3dPhysics, b3dLight, b3dSkybox, b3dGround, b3dSphere, explodeMesh, label3d, button3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let sphere = null
let dropSphere = null
let dropAggregate = null
let babylon = null
const physics = b3dPhysics()

function createSphere() {
  sphere = babylon.MeshBuilder.CreateSphere(
    'target', { diameter: 2, segments: 12 }, scene.scene
  )
  sphere.position.y = 4
  const mat = new babylon.StandardMaterial('mat', scene.scene)
  mat.diffuseColor = new babylon.Color3(0.8, 0.2, 0.1)
  sphere.material = mat
}

function createDropSphere() {
  dropSphere = babylon.MeshBuilder.CreateSphere(
    'dropTarget', { diameter: 1.5, segments: 12 }, scene.scene
  )
  dropSphere.position.set(4, 12, 0)
  const mat = new babylon.StandardMaterial('dropMat', scene.scene)
  mat.diffuseColor = new babylon.Color3(0.2, 0.5, 0.9)
  dropSphere.material = mat
  // Dynamic physics body — it will fall under gravity
  dropAggregate = new babylon.PhysicsAggregate(
    dropSphere, babylon.PhysicsShapeType.SPHERE,
    { mass: 2, restitution: 0.1 }, scene.scene
  )
  // Watch for impact
  let prevVelY = 0
  const checkImpact = () => {
    if (!dropSphere) { scene.scene.unregisterBeforeRender(checkImpact); return }
    const vel = new babylon.Vector3()
    dropAggregate.body.getLinearVelocityToRef(vel)
    // Detect sudden deceleration (hit something)
    if (prevVelY < -2 && Math.abs(vel.y) < Math.abs(prevVelY) * 0.5) {
      scene.scene.unregisterBeforeRender(checkImpact)
      explodeMesh(dropSphere, scene.scene, {
        fragments: 18,
        force: 8,
        tumble: 4,
        fadeStart: 0.8,
        duration: 10,
        restitution: 0.6,
      })
      dropAggregate.dispose()
      dropSphere = null
      dropAggregate = null
    }
    prevVelY = vel.y
  }
  scene.scene.registerBeforeRender(checkImpact)
}

function createObstacles(BABYLON, s) {
  const boxMat = new BABYLON.StandardMaterial('boxMat', s)
  boxMat.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.7)

  // Scattered obstacles — asymmetric layout for more interesting bounces
  const positions = [
    [-5, 1, 1], [4.5, 0.75, -2],
    [1, 1, -5], [-2, 1.25, 5],
    [-3.5, 0.5, -4], [5, 0.5, 4],
    [3, 0.75, 2], [-4, 0.4, 3],
    [0, 0.5, 6], [-6, 0.75, -1],
  ]
  const sizes = [
    [0.5, 2, 3], [1, 1.5, 1],
    [3, 2, 0.5], [0.8, 2.5, 2],
    [1.5, 1, 1.5], [1, 1, 2],
    [1.2, 1.5, 1.2], [2, 0.8, 0.8],
    [3, 1, 0.4], [0.5, 1.5, 3],
  ]
  for (let i = 0; i < positions.length; i++) {
    const [w, h, d] = sizes[i]
    const box = BABYLON.MeshBuilder.CreateBox('obstacle' + i, { width: w, height: h, depth: d }, s)
    box.position.set(positions[i][0], positions[i][1], positions[i][2])
    box.material = boxMat
    // Static physics body so fragments bounce off
    new BABYLON.PhysicsAggregate(box, BABYLON.PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, s)
  }

  // Ramp
  const ramp = BABYLON.MeshBuilder.CreateBox('ramp', { width: 4, height: 0.15, depth: 3 }, s)
  ramp.position.set(0, 0.3, 5)
  ramp.rotation.x = -0.25
  ramp.material = boxMat
  new BABYLON.PhysicsAggregate(ramp, BABYLON.PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, s)
}

const scene = b3d(
  {
    // Explode / Drop / show-colliders live in the dual-presence settings panel, so the
    // physics playground is fully controllable from inside VR too.
    panelTitle: 'Physics',
    scenePanel: () => [
      button3d({ label: 'Explode!', handleClick: doExplode }),
      button3d({ label: 'Drop!', handleClick: () => { if (!dropSphere) createDropSphere() } }),
      toggle3d({ label: 'show colliders', value: false, handleChange: (v) => { physics.debug = v } }),
    ],
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      const camera = orbitCam(el, {
        alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 14,
        target: [0, 2, 0], maxElevationDeg: 70,
      })
      camera.lowerRadiusLimit = 5
      camera.upperRadiusLimit = 40
      createSphere()
    },
  },
  physics,
  b3dLight({ y: 1, intensity: 0.8 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20, color: '#556644' }),
)

// Create obstacles once physics is ready
physics.ready.then(() => {
  createObstacles(babylon, scene.scene)
  // Also give the ground a static physics body
  const ground = scene.scene.getMeshByName('ground')
  if (ground) {
    new babylon.PhysicsAggregate(ground, babylon.PhysicsShapeType.BOX, { mass: 0, restitution: 0.3 }, scene.scene)
  }
})

function doExplode() {
  if (!sphere) return
  explodeMesh(sphere, scene.scene, {
    fragments: 24,
    force: 14,
    tumble: 6,
    fadeStart: 0.8,
    duration: 10,
    restitution: 0.5,
  })
  sphere = null
  setTimeout(createSphere, 6000)
}

preview.append(scene)
```

> The fragments are simulated by Jolt rather than animated. Controls live in the
> settings panel, which is the same panel you get floating in front of you in VR.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `gravityX` | `0` | Gravity X component |
| `gravityY` | `-9.81` | Gravity Y component |
| `gravityZ` | `0` | Gravity Z component |
| `debug` | `false` | Show wireframe physics collider shapes |
