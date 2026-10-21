# destroyable-behavior

The **attachable** destroyable: it makes *any* modeled element (a loaded GLB, a
biped, a vehicle) take damage and die, without being a separate
`<tosi-b3d-destroyable>` cube. It registers the host in the scene's combat world,
flashes on hits, watches for destruction from *any* cause (a direct hit or a chain
reaction resolved in the combat tick), and runs the death outcome on the host's own
mesh.

A host supplies its `mesh` (for the flash, explosion and blast origin) and an event
target; the behavior owns everything combat. `B3dDestroyable` is this wrapped around
a placeholder cube, and `b3d-loader` and `b3d-aircraft` attach one the same way. The
death outcomes (`explode`, `deathBlast`, the `whenDestroyed` hook and the bubbling
`destroyed` event) are described on [b3d-destroyable](/b3d-destroyable/), which also
has the live demos. One option is specific to the behavior: `meshOnDeath` is
`'dispose'` (default), `'hide'` or `'keep'`, for a host that swaps in its own wreck.

## Example

In your own scene element, once it has a mesh:

```javascript
import { DestroyableBehavior } from 'tosijs-3d'

// in sceneReady(owner, scene), after this.mesh exists
this.destroyable = new DestroyableBehavior(
  owner,
  this, // the host: it has `mesh` and `dispatchEvent`
  { capacity: 40, armor: 2, idBase: 'crate' },
  { explode: true, explodeForce: 8 }
)
this.destroyable.whenDestroyed = ({ id, cause }) => console.log(id, cause?.by)
this.destroyable.attach()

// elsewhere: this.destroyable.damage(10, { by: 'player' })
// in sceneDispose(): this.destroyable.dispose()
```
