/*#
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

*/

import * as BABYLON from '@babylonjs/core'

export interface ExplodeOptions {
  /** Number of fragments to create (default: 20) */
  fragments?: number
  /** Outward force applied to fragments (default: 5) */
  force?: number
  /** Gravity acceleration for kinematic mode (default: -9.81, ignored with physics) */
  gravity?: number
  /** Random tumble rotation speed (default: 3) */
  tumble?: number
  /** Duration in seconds, or 'frustum' to dispose when all fragments leave view (default: 2) */
  duration?: number | 'frustum'
  /** Time fraction (0-1) when fragments start fading (default: 0.5) */
  fadeStart?: number
  /** Dispose the original mesh (default: true, otherwise just hides it) */
  disposeOriginal?: boolean
  /** Explosion center override (default: mesh bounding center) */
  center?: BABYLON.Vector3
  /** Restitution (bounciness) for physics fragments (default: 0.3) */
  restitution?: number
  /** Friction for physics fragments (default: 0.5) */
  friction?: number
}

interface Fragment {
  mesh: BABYLON.Mesh
  velocity: BABYLON.Vector3
  angularVelocity: BABYLON.Vector3
  aggregate?: BABYLON.PhysicsAggregate
}

/**
 * Shatter a mesh into fragments and animate them flying apart.
 * The original mesh is hidden (or disposed). Fragments are automatically
 * cleaned up after the animation completes.
 *
 * If a physics engine is active on the scene, fragments get rigid bodies
 * and bounce realistically. Otherwise, a kinematic fallback is used.
 */
export function explodeMesh(
  mesh: BABYLON.Mesh,
  scene: BABYLON.Scene,
  options: ExplodeOptions = {}
): void {
  const {
    fragments: fragmentCount = 20,
    force = 5,
    gravity = -9.81,
    tumble = 3,
    duration = 2,
    fadeStart = 0.5,
    disposeOriginal = true,
    center,
    restitution = 0.3,
    friction = 0.5,
  } = options

  const usePhysics = !!scene.getPhysicsEngine()

  // Get world matrix to transform vertices to world space
  const worldMatrix = mesh.computeWorldMatrix(true)

  // Extract vertex data
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
  const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
  const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)
  const indices = mesh.getIndices()

  if (!positions || !indices) return

  const triCount = indices.length / 3
  if (triCount === 0) return

  // Compute triangle centroids in world space
  const centroids: BABYLON.Vector3[] = []
  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3]
    const i1 = indices[t * 3 + 1]
    const i2 = indices[t * 3 + 2]
    const cx = (positions[i0 * 3] + positions[i1 * 3] + positions[i2 * 3]) / 3
    const cy =
      (positions[i0 * 3 + 1] + positions[i1 * 3 + 1] + positions[i2 * 3 + 1]) /
      3
    const cz =
      (positions[i0 * 3 + 2] + positions[i1 * 3 + 2] + positions[i2 * 3 + 2]) /
      3
    centroids.push(
      BABYLON.Vector3.TransformCoordinates(
        new BABYLON.Vector3(cx, cy, cz),
        worldMatrix
      )
    )
  }

  // Pick seed points for Voronoi-like partitioning
  const actualFragments = Math.min(fragmentCount, triCount)
  const seeds: BABYLON.Vector3[] = []
  const used = new Set<number>()
  for (let i = 0; i < actualFragments; i++) {
    let idx: number
    do {
      idx = Math.floor(Math.random() * triCount)
    } while (used.has(idx) && used.size < triCount)
    used.add(idx)
    seeds.push(centroids[idx].clone())
  }

  // Assign each triangle to nearest seed
  const assignment = new Int32Array(triCount)
  for (let t = 0; t < triCount; t++) {
    let bestDist = Infinity
    let bestSeed = 0
    for (let s = 0; s < seeds.length; s++) {
      const d = BABYLON.Vector3.DistanceSquared(centroids[t], seeds[s])
      if (d < bestDist) {
        bestDist = d
        bestSeed = s
      }
    }
    assignment[t] = bestSeed
  }

  // Explosion center
  const explosionCenter =
    center ?? mesh.getBoundingInfo().boundingBox.centerWorld.clone()

  // Build fragment meshes
  const fragments: Fragment[] = []
  const material = mesh.material

  for (let f = 0; f < actualFragments; f++) {
    // Collect triangles for this fragment
    const fragTris: number[] = []
    for (let t = 0; t < triCount; t++) {
      if (assignment[t] === f) fragTris.push(t)
    }
    if (fragTris.length === 0) continue

    // Build deduplicated vertex data for this fragment
    const vertMap = new Map<number, number>()
    const fragPositions: number[] = []
    const fragNormals: number[] = []
    const fragUvs: number[] = []
    const fragIndices: number[] = []

    for (const t of fragTris) {
      for (let v = 0; v < 3; v++) {
        const origIdx = indices[t * 3 + v]
        if (!vertMap.has(origIdx)) {
          const newIdx = fragPositions.length / 3
          vertMap.set(origIdx, newIdx)
          // Transform position to world space
          const localPos = new BABYLON.Vector3(
            positions[origIdx * 3],
            positions[origIdx * 3 + 1],
            positions[origIdx * 3 + 2]
          )
          const worldPos = BABYLON.Vector3.TransformCoordinates(
            localPos,
            worldMatrix
          )
          fragPositions.push(worldPos.x, worldPos.y, worldPos.z)
          if (normals) {
            const localNorm = new BABYLON.Vector3(
              normals[origIdx * 3],
              normals[origIdx * 3 + 1],
              normals[origIdx * 3 + 2]
            )
            const worldNorm = BABYLON.Vector3.TransformNormal(
              localNorm,
              worldMatrix
            )
            fragNormals.push(worldNorm.x, worldNorm.y, worldNorm.z)
          }
          if (uvs) {
            fragUvs.push(uvs[origIdx * 2], uvs[origIdx * 2 + 1])
          }
        }
        fragIndices.push(vertMap.get(origIdx)!)
      }
    }

    // Compute fragment center (average of world-space positions)
    let fcx = 0,
      fcy = 0,
      fcz = 0
    const vertCount = fragPositions.length / 3
    for (let i = 0; i < vertCount; i++) {
      fcx += fragPositions[i * 3]
      fcy += fragPositions[i * 3 + 1]
      fcz += fragPositions[i * 3 + 2]
    }
    fcx /= vertCount
    fcy /= vertCount
    fcz /= vertCount
    const fragCenter = new BABYLON.Vector3(fcx, fcy, fcz)

    // Re-center vertex positions so mesh origin is at fragment center
    // This is critical for physics — shapes are relative to mesh transform
    const centeredPositions = new Float32Array(fragPositions.length)
    for (let i = 0; i < vertCount; i++) {
      centeredPositions[i * 3] = fragPositions[i * 3] - fcx
      centeredPositions[i * 3 + 1] = fragPositions[i * 3 + 1] - fcy
      centeredPositions[i * 3 + 2] = fragPositions[i * 3 + 2] - fcz
    }

    // Create mesh positioned at fragment center
    const fragMesh = new BABYLON.Mesh(`fragment-${f}`, scene)
    const vd = new BABYLON.VertexData()
    vd.positions = centeredPositions
    vd.indices = new Uint32Array(fragIndices)
    if (fragNormals.length > 0) vd.normals = new Float32Array(fragNormals)
    if (fragUvs.length > 0) vd.uvs = new Float32Array(fragUvs)
    vd.applyToMesh(fragMesh)
    fragMesh.position.copyFrom(fragCenter)

    if (material) {
      fragMesh.material = material
    }

    // Outward direction from explosion center
    const dir = fragCenter.subtract(explosionCenter)
    if (dir.lengthSquared() < 0.0001) {
      dir.x = Math.random() - 0.5
      dir.y = Math.random()
      dir.z = Math.random() - 0.5
    }
    dir.normalize()

    // Random spread
    const spread = new BABYLON.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.5
    )

    const velocity = dir
      .scale(force * (0.5 + Math.random() * 0.5))
      .add(spread.scale(force))

    const angularVelocity = new BABYLON.Vector3(
      (Math.random() - 0.5) * tumble * 2,
      (Math.random() - 0.5) * tumble * 2,
      (Math.random() - 0.5) * tumble * 2
    )

    const frag: Fragment = { mesh: fragMesh, velocity, angularVelocity }

    // Add physics body if engine is available
    if (usePhysics) {
      const mass = Math.max(0.1, vertCount * 0.02)
      const aggregate = new BABYLON.PhysicsAggregate(
        fragMesh,
        BABYLON.PhysicsShapeType.CONVEX_HULL,
        { mass, restitution, friction },
        scene
      )
      frag.aggregate = aggregate

      // Apply linear velocity directly
      aggregate.body.setLinearVelocity(velocity)
      // Apply angular velocity
      aggregate.body.setAngularVelocity(angularVelocity)
    }

    fragments.push(frag)
  }

  // Hide or dispose original
  if (disposeOriginal) {
    mesh.dispose()
  } else {
    mesh.setEnabled(false)
  }

  // Cleanup helper
  const cleanup = () => {
    scene.unregisterBeforeRender(beforeRender)
    for (const frag of fragments) {
      if (frag.aggregate) {
        frag.aggregate.dispose()
      }
      frag.mesh.dispose()
    }
  }

  // Frustum check: are all fragments outside the camera view?
  const allOutsideFrustum = (): boolean => {
    const camera = scene.activeCamera
    if (!camera) return false
    for (const frag of fragments) {
      if (frag.mesh.isInFrustum(scene.frustumPlanes)) {
        return false
      }
    }
    return true
  }

  // Animate fragments
  const startTime = Date.now()
  const useFrustum = duration === 'frustum'
  const durationMs = useFrustum ? Infinity : (duration as number) * 1000
  const fadeStartMs = useFrustum ? Infinity : fadeStart * durationMs
  // For frustum mode, start checking after a brief delay so fragments can leave
  const frustumGraceMs = 500

  const beforeRender = () => {
    const elapsed = Date.now() - startTime

    // Time-based end
    if (!useFrustum && elapsed >= durationMs) {
      cleanup()
      return
    }

    // Frustum-based end (after grace period)
    if (useFrustum && elapsed > frustumGraceMs && allOutsideFrustum()) {
      cleanup()
      return
    }

    const dt = scene.getEngine().getDeltaTime() * 0.001

    for (const frag of fragments) {
      // Physics engine handles movement; we only handle fade
      if (!usePhysics) {
        // Kinematic: apply velocity, gravity, tumble
        frag.mesh.position.addInPlace(frag.velocity.scale(dt))
        frag.velocity.y += gravity * dt
        frag.mesh.rotation.x += frag.angularVelocity.x * dt
        frag.mesh.rotation.y += frag.angularVelocity.y * dt
        frag.mesh.rotation.z += frag.angularVelocity.z * dt
      }

      // Fade out (both modes)
      if (!useFrustum && elapsed > fadeStartMs) {
        const fadeT = (elapsed - fadeStartMs) / (durationMs - fadeStartMs)
        frag.mesh.visibility = 1 - fadeT
      }
    }
  }

  scene.registerBeforeRender(beforeRender)
}
