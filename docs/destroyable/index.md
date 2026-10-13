# destroyable

**Things that take damage, as plain state.** A `CombatWorld` holds
destroyables by id and resolves damage, armour, protection, regeneration and
chain reactions. It imports no 3D engine: a scene is a view of it, and the
same world replays the same way from the same inputs.

```javascript
import { CombatWorld } from 'tosijs-3d/destroyable'

const world = new CombatWorld()
world.add('shield', { capacity: 50, regenRate: 5, regenDelay: 3 })
world.add('reactor', {
  capacity: 100,
  armor: 2, // taken off every hit
  protectedBy: 'shield', // while the shield stands...
  protection: 10, // ...this much more is taken off
  chain: [{ target: 'hull', amount: 80 }], // what its death does
})
world.add('hull', { capacity: 200 })

world.applyDamage('reactor', 30) // 30 - 2 armour - 10 protection: 18 gets through
const events = world.tick(1 / 60) // regeneration, and chain reactions that are due
```

Health and a launcher's ammunition are the same mechanic, a [[resource]].
[[b3d-destroyable]] and [[destroyable-behavior]] attach one of these to a
mesh; [[warhead]] works out the amounts.
