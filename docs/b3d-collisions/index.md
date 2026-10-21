# b3d-collisions

Opt-in collision detection via mesh naming conventions authored in Blender.

## Demo — where did it hit, and which way is the surface facing?

Hail falls on the scout. Each impact is found by a SWEPT RAY (the segment the
stone travelled this frame, not its position), and the marker shows both things
you actually need: the **point**, and a disc lying flat on the surface with a
stalk along the **normal**. Watch the discs tilt to follow the fuselage, and
lie flat the moment a stone misses and lands on the ground.

Misses count too — a stone that hits nothing still hits the WORLD, and a demo
that only reports the interesting case quietly teaches you that misses are free.
Ground hits are the same marker in a cooler colour and a shorter life, because
they are the common case and at equal weight they drown out the ones you care
about.

The sweep is the part worth copying. Testing "is the stone inside the rock now?"
misses anything moving faster than its own radius per frame — at 60fps a stone
falling at 12 m/s moves 0.2m, so a thin surface is a coin toss. Casting the
segment cannot tunnel.

```js
import { b3d, b3dLibrary, label3d, slider3d } from 'tosijs-3d'
import { demoStage, orbitCam, impactMarker } from 'demo-utils'
import { tosi } from 'tosijs'

const { hail } = tosi({ hail: { rate: 8, hits: 0, ground: 0 } })
const lib = b3dLibrary({ url: '/test-3.glb', type: 'vehicles' })

const readout = document.createElement('div')
readout.style.cssText = 'font: 13px ui-monospace, monospace; padding: 6px'
const paint = () => {
  readout.textContent = `scout: ${hail.hits.valueOf()}   ground: ${hail.ground.valueOf()}`
}
hail.hits.observe(paint)
hail.ground.observe(paint)
paint()

const scene = b3d(
  {
    // Bloom for the stones' emissive; the impact markers pick it up too.
    glowLayerIntensity: 0.6,
    panelTitle: 'hail',
    scenePanel: () => [
      slider3d({ label: 'stones', value: hail.rate, min: 1, max: 30, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 7, betaDeg: 58.1, target: [0, 1.4, 0] })

      const G = 9.8
      const stones = []
      // Orange with a partial glow — hot enough to read against a busy ground
      // without going full emissive, which would flatten them into discs.

      // Everything the hail can land on. The scout is a HIERARCHY, so the
      // target set is its child meshes — picking against the root would hit
      // nothing (a TransformNode has no geometry). The ground goes in the same
      // set: a stone that misses is still a collision, it just isn't a hit ON
      // anything, and a demo that only reports the interesting case teaches you
      // that misses are free.
      const targets = new Set()
      let ground = null
      lib.ready.then(() => {
        // `lib.make.<name>()` — the library's contents as callable names.
        // ry is DEGREES.
        const scout = lib.make.scout({ y: 0.9, ry: 140 })
        if (scout == null) return
        scout.scaling.setAll(3.4) // fill the frame; it is the subject here
        scout.getChildMeshes().forEach((m) => targets.add(m))
        el.register({ meshes: scout.getChildMeshes() })
        // NOT looping the cockpit animation: a hatch cycling open and shut
        // forever pulls the eye off the impacts, which are the point.
      })
      // The ground arrives with the rest of the scene, not with the library.
      el.scene.onNewMeshAddedObservable.add((m) => {
        if (m.name === 'ground') ground = m
      })
      ground = el.scene.getMeshByName('ground')

      const reset = (s) => {
        // Spread just wider than the scout: most stones should find it, or the
        // demo is mostly a ground-impact demo with a model in the background.
        s.mesh.position.set((Math.random() - 0.5) * 4.5, 6 + Math.random() * 3, (Math.random() - 0.5) * 4.5)
        s.vel = -1 - Math.random() * 2
      }
      const spawn = () => {
        // `el.make` gives it a material, registers it for shadows, and computes
        // its world matrix, three lines you would otherwise write here.
        const mesh = el.make.sphere({
          name: 'stone', diameter: 0.16, segments: 6,
          color: '#ff6b1a', glow: 0.45,
        })
        const s = { mesh, vel: 0 }
        reset(s)
        stones.push(s)
      }

      const ray = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Down(), 1)
      const canHit = (m) => targets.has(m) || m === ground
      el.scene.registerBeforeRender(() => {
        const dt = el.frameDelta
        while (stones.length < hail.rate.valueOf()) spawn()
        while (stones.length > hail.rate.valueOf()) stones.pop().mesh.dispose()
        for (const s of stones) {
          const from = s.mesh.position.clone()
          s.vel -= G * dt
          s.mesh.position.y += s.vel * dt
          const drop = from.y - s.mesh.position.y
          if (drop <= 0) continue
          // SWEEP the segment just travelled, not the new position.
          ray.origin = from
          ray.direction = BABYLON.Vector3.Down()
          ray.length = drop + 0.08
          const hit = el.scene.pickWithRay(ray, canHit)
          if (hit?.hit && hit.pickedPoint) {
            const onGround = hit.pickedMesh === ground
            impactMarker(el, hit.pickedPoint, hit.getNormal(true), {
              life: onGround ? 0.8 : 1.6,
              // Ground hits are dimmer and shorter-lived: they are the common
              // case, and at full brightness they drown out the hits you care
              // about. Same marker, different weight.
              color: onGround ? '#7fd4ff' : '#ffd34d',
              size: onGround ? 0.22 : 0.32,
            })
            if (onGround) hail.ground = hail.ground.valueOf() + 1
            else hail.hits = hail.hits.valueOf() + 1
            reset(s)
          }
        }
      })
    },
  },
  lib,
  ...demoStage({ size: 14, tiles: 12, pattern: true, timeOfDay: 9 }),
)

preview.append(scene, readout)
```

## Naming Conventions

Add these suffixes to mesh names in Blender:

| Suffix | Collider Shape |
|--------|---------------|
| `_collide` | Sphere (default) |
| `_collideSphere` | Sphere |
| `_collideBox` | Box |
| `_collideCylinder` | Cylinder |
| `_collideMesh` | Mesh (exact shape) |

Underscore variants also work: `_collide_sphere`, `_collide_box`, etc.

## Debug Mode

Set `debug: true` to show green wireframe colliders:

```javascript
import { b3d, b3dCollisions, b3dLoader } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dLoader({ url: '/scene.glb' }),
    b3dCollisions({ debug: true })
  )
)
```
