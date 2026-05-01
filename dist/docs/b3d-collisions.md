# b3d-collisions

Opt-in collision detection via mesh naming conventions authored in Blender.

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
    b3dLoader({ url: './scene.glb' }),
    b3dCollisions({ debug: true })
  )
)
```