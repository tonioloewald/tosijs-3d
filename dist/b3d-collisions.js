/*#
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
    scenePanel: () => [
      label3d({ text: 'hail' }),
      slider3d({ label: 'stones', value: hail.rate, min: 1, max: 30, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 7, beta: Math.PI / 3.1, target: [0, 1.4, 0] })

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
        // ry is DEGREES (it was radians before 0.7.0 — this line said 140 and
        // meant it as degrees, which is exactly how that trap springs).
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
        // its world matrix — the three lines this loop used to carry.
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
*/
/*{ "parent": "Core" }*/
import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import { conventionName } from './b3d-utils.js';
export class B3dCollisions extends B3dChild {
    static preferredTagName = 'tosi-b3d-collisions';
    static initAttributes = {
        debug: false,
    };
    owner = null;
    colliders = [];
    _callback;
    debugMaterial;
    getDebugMaterial() {
        if (this.debugMaterial == null) {
            const mat = new BABYLON.StandardMaterial('collider-debug', this.owner.scene);
            mat.wireframe = true;
            mat.diffuseColor = new BABYLON.Color3(0, 1, 0);
            mat.alpha = 0.5;
            this.debugMaterial = mat;
        }
        return this.debugMaterial;
    }
    setupCollider(collider, source) {
        collider.checkCollisions = true;
        collider.isPickable = false;
        if (this.debug) {
            collider.isVisible = true;
            collider.material = this.getDebugMaterial();
        }
        else {
            collider.isVisible = false;
        }
        collider.parent = source;
        this.colliders.push(collider);
    }
    createSphereCollider(mesh) {
        const bounds = mesh.getBoundingInfo();
        const sphere = bounds.boundingSphere;
        const diameter = sphere.radius * 2;
        const collider = BABYLON.MeshBuilder.CreateSphere(mesh.name + '_collider', { diameter }, this.owner.scene);
        collider.position = sphere.center.clone();
        this.setupCollider(collider, mesh);
    }
    createBoxCollider(mesh) {
        const bounds = mesh.getBoundingInfo();
        const box = bounds.boundingBox;
        const size = box.maximum.subtract(box.minimum);
        const collider = BABYLON.MeshBuilder.CreateBox(mesh.name + '_collider', { width: size.x, height: size.y, depth: size.z }, this.owner.scene);
        collider.position = box.center.clone();
        this.setupCollider(collider, mesh);
    }
    createCylinderCollider(mesh) {
        const bounds = mesh.getBoundingInfo();
        const box = bounds.boundingBox;
        const size = box.maximum.subtract(box.minimum);
        const diameter = Math.max(size.x, size.z);
        const height = size.y;
        const collider = BABYLON.MeshBuilder.CreateCylinder(mesh.name + '_collider', { diameter, height }, this.owner.scene);
        collider.position = box.center.clone();
        this.setupCollider(collider, mesh);
    }
    getCollideType(name) {
        // `.model` (the library-export marker) is invisible to suffix parsing —
        // Hull_collideMesh.model exports AND collides.
        const lower = conventionName(name).toLowerCase();
        if (lower.includes('_collidemesh') || lower.includes('_collide_mesh'))
            return 'mesh';
        if (lower.includes('_collidesphere') || lower.includes('_collide_sphere'))
            return 'sphere';
        if (lower.includes('_collidebox') || lower.includes('_collide_box'))
            return 'box';
        if (lower.includes('_collidecylinder') ||
            lower.includes('_collide_cylinder'))
            return 'cylinder';
        // Bare _collide with no type defaults to sphere
        if (lower.includes('_collide'))
            return 'sphere';
        return null;
    }
    processAdditions(additions) {
        const { meshes } = additions;
        if (meshes == null)
            return;
        // Group meshes by their collision-annotated root.
        // Babylon splits GLB nodes into TransformNode + child Meshes.
        // We want one collider per logical object, built from combined bounds.
        const processed = new Set();
        for (const mesh of meshes) {
            const collideType = this.getCollideType(mesh.name);
            if (collideType == null)
                continue;
            if (collideType === 'mesh') {
                mesh.checkCollisions = true;
                for (const child of mesh.getChildMeshes()) {
                    child.checkCollisions = true;
                }
                continue;
            }
            /*
            Find the root of this object — but only across the SAME annotation.
      
            The point of climbing is that one logical object can be several meshes
            all annotated the same way, and it should get ONE collider rather than
            one each. It must not climb onto a DIFFERENTLY annotated parent, because
            the shape is taken from the leaf and the BOUNDS from the root, so crossing
            an annotation boundary builds the child's shape around the parent's whole
            subtree.
      
            That is not hypothetical. A pirate ship whose masts are children of the
            hull — `mainMast_collideCylinder` under `Hull_collideMesh` — climbed to
            the hull and produced a CYLINDER sized from the hull's entire subtree,
            sails included: 34.4 m across and 26 m tall, centred on the ship. One
            `processed` entry then swallowed the other two masts, so it appeared as a
            single giant squat cylinder and you could not get within twenty metres of
            the ship. Tonio: "I put a collideMesh on the hull and collideCylinders on
            each mast but the ship just seems to have a single giant squat cylinder."
      
            The name of the generated mesh was the tell — `Hull_collideMesh_collider`
            should be impossible, since `_collideMesh` returns above without building
            a primitive at all.
            */
            let root = mesh;
            while (root.parent &&
                this.getCollideType(root.parent.name) === collideType) {
                root = root.parent;
            }
            const rootName = root.name;
            if (processed.has(rootName))
                continue;
            processed.add(rootName);
            /*
            Bounds from the annotated node's OWN geometry when it has any.
      
            Combining children exists for the case the comment above describes: a GLB
            splits an object into a TransformNode with the geometry in its children,
            and the annotation lands on the node. When the annotated thing IS a mesh,
            though, its own geometry is the answer and its children are whatever was
            parented to it — which on a ship is the rigging.
      
            Measured: `mainMast_collideCylinder` is a Mesh 0.55 × 20.6 × 0.64 — a
            pole — carrying Crow's Nest, Flag, Spar and two SquareSails as children.
            Combining them gave a 10.2 m diameter cylinder around each mast, so the
            deck was still walled off even after the giant one was fixed.
            */
            const hasOwnGeometry = root instanceof BABYLON.AbstractMesh && root.getTotalVertices() > 0;
            const childMeshes = hasOwnGeometry
                ? [root]
                : root instanceof BABYLON.AbstractMesh
                    ? [root, ...root.getChildMeshes()]
                    : root.getChildMeshes();
            if (childMeshes.length === 0)
                continue;
            // Get world-space bounds across all children, then make collider in world space (no parent)
            let min = null;
            let max = null;
            for (const child of childMeshes) {
                child.computeWorldMatrix(true);
                const bi = child.getBoundingInfo();
                const bmin = bi.boundingBox.minimumWorld;
                const bmax = bi.boundingBox.maximumWorld;
                if (min == null) {
                    min = bmin.clone();
                    max = bmax.clone();
                }
                else {
                    min = BABYLON.Vector3.Minimize(min, bmin);
                    max = BABYLON.Vector3.Maximize(max, bmax);
                }
            }
            if (min == null || max == null)
                continue;
            const size = max.subtract(min);
            const center = BABYLON.Vector3.Center(min, max);
            let collider;
            if (collideType === 'sphere') {
                const diameter = Math.max(size.x, size.y, size.z);
                collider = BABYLON.MeshBuilder.CreateSphere(rootName + '_collider', { diameter }, this.owner.scene);
            }
            else if (collideType === 'box') {
                collider = BABYLON.MeshBuilder.CreateBox(rootName + '_collider', { width: size.x, height: size.y, depth: size.z }, this.owner.scene);
            }
            else {
                // cylinder
                const diameter = Math.max(size.x, size.z);
                collider = BABYLON.MeshBuilder.CreateCylinder(rootName + '_collider', { diameter, height: size.y }, this.owner.scene);
            }
            collider.position = center;
            collider.checkCollisions = true;
            collider.isPickable = false;
            if (this.debug) {
                collider.isVisible = true;
                collider.material = this.getDebugMaterial();
            }
            else {
                collider.isVisible = false;
            }
            this.colliders.push(collider);
        }
    }
    sceneReady(owner, _scene) {
        this.owner = owner;
        this._callback = this.processAdditions.bind(this);
        owner.addSceneListener(this._callback);
    }
    sceneDispose() {
        if (this.owner && this._callback) {
            this.owner.removeSceneListener(this._callback);
        }
        for (const collider of this.colliders) {
            collider.dispose();
        }
        this.colliders = [];
        if (this.debugMaterial) {
            this.debugMaterial.dispose();
            this.debugMaterial = undefined;
        }
        this.owner = null;
    }
    render() {
        super.render();
        if (!this.owner)
            return;
        for (const collider of this.colliders) {
            if (this.debug) {
                collider.isVisible = true;
                collider.material = this.getDebugMaterial();
            }
            else {
                collider.isVisible = false;
            }
        }
    }
}
export const b3dCollisions = B3dCollisions.elementCreator();
//# sourceMappingURL=b3d-collisions.js.map