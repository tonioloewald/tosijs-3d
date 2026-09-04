/*#
# make-mesh

**`el.make.box({ y: 1, color: '#c33', glow: 0.3 })`** — Babylon primitives with
the four things everyone forgets already done.

## Demo

```js
import { b3d, b3dSkybox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    glowLayerIntensity: 0.7,
    sceneCreated(el) {
      orbitCam(el, { radius: 9, target: [0, 1, 0] })
      // Every one of these casts a shadow and is ray-ready immediately.
      el.make.box({ size: 1.2, x: -2.4, y: 0.9, color: '#b8483a', glow: 0.25 })
      el.make.sphere({ diameter: 1.3, y: 1, color: '#3f7fb8' })
      el.make.cylinder({ height: 1.8, diameter: 0.9, x: 2.4, y: 0.9, color: '#c9a227', glow: 0.15 })
      el.make.torus({ diameter: 1.4, thickness: 0.28, y: 2.6, rx: 90, color: '#6ab04c' })
      // Never hand-written here — the proxy forwards to MeshBuilder.CreateIcoSphere.
      el.make.icoSphere({ radius: 0.7, subdivisions: 2, x: -2.4, y: 2.6, color: '#b07acc', glow: 0.3 })
      el.make.torusKnot({ radius: 0.5, tube: 0.16, x: 2.4, y: 2.7, color: '#e08a3c', glow: 0.2 })
    },
  },
  ...demoStage({ size: 16, tiles: 10, texture: '/tosi-warhol-testgrid.svg' }),
)

preview.append(scene)
```

`b3dBox`/`b3dSphere`/`b3dGround` cover the DECLARATIVE case. But plenty of scene
code is imperative — inside `sceneCreated`, in a spawner, in a demo — and there
the honest version of "add a cube" is:

```javascript
const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, el.scene)
box.position.set(0, 1, 0)
const mat = new BABYLON.StandardMaterial('box-mat', el.scene)
mat.diffuseColor = BABYLON.Color3.FromHexString('#c33')
box.material = mat
el.register({ meshes: [box] }) // or it casts no shadow
box.computeWorldMatrix(true) // or a ray this frame misses it
```

Six lines, of which the last two are invisible until something is subtly wrong.
This is the same shape `b3d-library` grew for content (`lib.make.scout()`), and
tosijs's `elementCreator` before that: the thing you want, named, taking the
options you'd have set anyway.

## What it does for you

| | why it matters |
| --- | --- |
| **material** from `color`/`glow`/`glowColor` | the same `primitiveMaterial` `b3dBox` uses, so the two paths cannot drift |
| **`register()`** with the owner | shadow casting, reflection probes — the scene-listener contract. A mesh nobody registered is a mesh the sun has never heard of |
| **`computeWorldMatrix(true)`** | see below — this one is a genuine trap |
| **degrees** for `rx`/`ry`/`rz` | matches `AbstractMesh`, which is degrees. Babylon is radians, so a bare number is ambiguous exactly where it hurts |

## It covers everything `MeshBuilder` has

`make` is a Proxy that forwards `make.<shape>` to `MeshBuilder.Create<Shape>`, so
all 26 are there — `icoSphere`, `torusKnot`, `polyhedron`, `tube`, `lathe`,
`geodesic`, `goldberg`, `tiledBox` — plus whatever Babylon adds later, with no
code here to keep in step. Options you don't recognise are simply forwarded, so
a shape's own parameters work exactly as they do in Babylon.

It is weightless: one Proxy, and a closure only for the names actually used.
That laziness is the point — a hand-written list of eight would be wrong the
moment somebody wanted the ninth.

`make.decal` is refused with a message, because `CreateDecal` takes a source
mesh rather than options and so doesn't fit the forwarding shape.

## Why `worldMatrix` defaults to true

A mesh that has been positioned but never RENDERED has no world matrix, so
anything that reads world space this frame — a ray, a bounding check, an
`absolutePosition` — sees it **at the origin**. It does not throw; it quietly
answers about a phantom copy somewhere else.

That is not hypothetical: it cost a debugging detour in the collision demo's
tests. A wall placed at `z=6`, shot at on the first frame, reported an impact at
`z=0.25` with a confident normal off the wrong face — the ray had started inside
the phantom at the origin and exited its far side. Plausible, wrong, and silent.

Pass `worldMatrix: false` if you are about to reposition the mesh anyway and
want to skip the work.

*/
/*{ "parent": "Core", "order": 200 }*/
import * as BABYLON from '@babylonjs/core';
import { primitiveMaterial } from './b3d-primitives.js';
import { roundedRectGeometry } from './rounded-rect.js';
const DEG = Math.PI / 180;
/** Apply the shared half: transform, material, registration, world matrix. */
function finish(mesh, owner, opts) {
    mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    if (opts.rx != null || opts.ry != null || opts.rz != null) {
        // Yaw/pitch/roll from DEGREES. Written as a quaternion because
        // AbstractMesh-managed meshes ignore `.rotation` (it sets
        // rotationQuaternion every frame), and having the two paths disagree about
        // which field is authoritative is its own long afternoon.
        mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll((opts.ry ?? 0) * DEG, (opts.rx ?? 0) * DEG, (opts.rz ?? 0) * DEG);
    }
    if (opts.parent != null)
        mesh.parent = opts.parent;
    mesh.material = primitiveMaterial(mesh.name, mesh.getScene(), {
        color: opts.color ?? '#cccccc',
        glow: opts.glow,
        glowColor: opts.glowColor,
        mirror: opts.mirror,
    });
    if (opts.pickable != null)
        mesh.isPickable = opts.pickable;
    if (opts.shadows !== false)
        owner.register?.({ meshes: [mesh] });
    if (opts.worldMatrix !== false)
        mesh.computeWorldMatrix(true);
    return mesh;
}
/*
Everything `MeshBuilder` can make, without a list of everything MeshBuilder can
make.

The first cut hand-wrote eight primitives on a plain object, on the argument
that a fixed set types better than a Proxy. Tonio: "the beauty of the proxy is
it's weightless until used." Which is true, but the decisive part is what the
laziness BUYS: a proxy forwards `make.foo` to `MeshBuilder.CreateFoo`, so it
covers all 26 — icoSphere, polyhedron, tube, lathe, geodesic, goldberg, torusKnot
— and whatever Babylon adds next, for no code and no maintenance. A hand-written
list is a list that is wrong the moment somebody wants the ninth thing.

Typing survives because `Makers` DECLARES the common shapes and falls back to an
index signature: completion and checked options where it matters, the whole
library reachable regardless.
*/
/** Options that belong to US; everything else is forwarded to MeshBuilder. */
const SHARED_KEYS = new Set([
    'name',
    'x',
    'y',
    'z',
    'rx',
    'ry',
    'rz',
    'color',
    'glow',
    'glowColor',
    'mirror',
    'parent',
    'shadows',
    'pickable',
    'worldMatrix',
]);
/**
 * Builders whose signature is NOT `(name, options, scene)`, so the forwarding
 * shape doesn't fit. Named explicitly with a way out, because the failure would
 * otherwise be a confusing argument mismatch deep inside Babylon.
 */
const INCOMPATIBLE = {
    decal: 'CreateDecal takes a SOURCE MESH, not options — call BABYLON.MeshBuilder.CreateDecal directly.',
};
const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/**
 * Shapes that are OURS, not MeshBuilder's — checked before the forwarding
 * lookup so `make.roundedPlane` works like any other name.
 */
const OWN_SHAPES = {
    roundedPlane(name, opts, scene) {
        const g = roundedRectGeometry({
            width: opts.width ?? 1,
            height: opts.height ?? 1,
            radius: opts.radius ?? 0.06,
            cornerSegments: opts.cornerSegments,
        });
        const mesh = new BABYLON.Mesh(name, scene);
        const data = new BABYLON.VertexData();
        data.positions = g.positions;
        data.indices = g.indices;
        data.uvs = g.uvs;
        data.normals = g.normals;
        data.applyToMesh(mesh);
        return mesh;
    },
};
/**
 * Build the `make` facade for an owner.
 *
 * Weightless: one Proxy, and a maker closure only for the names actually used.
 */
export function createMakers(owner) {
    return new Proxy({}, {
        get: (_t, prop) => {
            if (typeof prop !== 'string')
                return undefined;
            if (INCOMPATIBLE[prop] != null) {
                return () => {
                    console.error(`b3d make.${prop}: ${INCOMPATIBLE[prop]}`);
                    return null;
                };
            }
            const build = OWN_SHAPES[prop] ??
                BABYLON.MeshBuilder[`Create${pascal(prop)}`];
            if (typeof build !== 'function') {
                return () => {
                    console.error(`b3d make.${prop}: no BABYLON.MeshBuilder.Create${pascal(prop)}`);
                    return null;
                };
            }
            return (opts = {}) => {
                // Split ours from the shape's, so a caller writes one flat object and
                // MeshBuilder never sees `glow` or `shadows`.
                const shape = {};
                for (const k of Object.keys(opts)) {
                    if (!SHARED_KEYS.has(k))
                        shape[k] = opts[k];
                }
                return finish(build(opts.name ?? prop, shape, owner.scene), owner, opts);
            };
        },
        has: (_t, prop) => typeof prop === 'string' &&
            (OWN_SHAPES[prop] != null ||
                typeof BABYLON.MeshBuilder[`Create${pascal(prop)}`] === 'function'),
    });
}
//# sourceMappingURL=make-mesh.js.map