# gas-giant-material

**A gas giant you can fly round.** `createGasGiantMaterial(scene, look)` returns
a material for a sphere, drawn by the same [gas-giant](/gas-giant/) function
that draws one in a moon's sky. [`<tosi-b3d-planet gas="saturn">`](/b3d-planet/)
uses it, and so does the [star system](/b3d-star-system/) for its giants.

It lights itself: a soft terminator, a limb that darkens (which is most of
what makes a ball of gas read as a ball), and a thin bright rim of haze on the
day side. The light is the first point or directional light in the scene
unless you pass `light`.

```javascript
import { createGasGiantMaterial, resolveGasGiant } from 'tosijs-3d'

sphere.material = createGasGiantMaterial(scene, resolveGasGiant('neptune'))
```

The bands follow the sphere's own Y axis, so turning the mesh turns the
planet, and tilting it tilts the bands.
