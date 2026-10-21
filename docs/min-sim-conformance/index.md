# min-sim-conformance

**One contract, two stores.** The coordinate-free `MinSimApi` ([world-contract](/world-contract/) §8)
is implemented by BOTH Ariosto's reference store and tosijs-3d's [world-store](/world-store/). This
is the shared kit that proves they behave identically — the "conformance" half of the contract
package (the agreement at the seam: *the package is types + conformance kit, not a store*).

It is **framework-agnostic**: it imports no test runner (so it can ship in the library), and takes
the harness (`describe`/`test`/`expect`) as an argument. A `.test.ts` in either repo passes in its
own `bun:test` hooks and a factory for its store:

```javascript
// Subpaths, not the barrel: the barrel defines elements and needs a DOM.
import { runMinSimConformance } from 'tosijs-3d/min-sim-conformance'
import { describe, test, expect } from 'bun:test'
import { WorldStore } from 'tosijs-3d/world-store'
// runMinSimConformance(() => new WorldStore(), { describe, test, expect })
```

What it pins is the **contract behaviour**, not the geometry: place membership, portal routing
(cheapest, bidirectional, locked = impassable), the proximity ladder (a rung in-place, `elsewhere`
across places), the `SchematicView` shape, `traverse` → `placeEntered`, that steering toward an
entity actually *closes the distance*, and the **choice primitive**: a pick emits exactly one
`choiceMade`, an option that is not on the menu emits nothing, a choice is reported once, and the
sim resolves nothing. It never asserts a coordinate — coordinates never cross.

A store handed to the kit needs two simulation-side methods that are not part of `MinSimApi`:
`tick(seconds)` and `chooseOption(choiceId, optionId)` (the player's pick).
