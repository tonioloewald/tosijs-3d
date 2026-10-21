/*#
# world-contract

The boundary between the **simulation** (tosijs-3d) and an **external driver**
(an AI narrative engine, a scripted demo, anything). The simulation is the
authority on physical and systemic reality; the driver decides what any of it
*means*. These two halves never call each other's functions — they share a
serializable `WorldState`, a stream of best-effort `SimulationEvent`s, and the
`WorldApi` surface below.

## Example — a driver against the surface

The driver only ever touches the contract: read state, subscribe to intentional-act events, and
steer. It never reaches into the sim. (`WorldStore` is the reference implementation.)

```javascript
// The subpath, not the barrel: the barrel defines elements and needs a DOM,
// and a driver usually runs headless or in a worker.
import { WorldStore } from 'tosijs-3d/world-store'

const world = new WorldStore() // any implementation of the contract
world.subscribe((event) => {
  // events are COMMITMENTS (interacted / picked-up / chose / died) — never proximity
  if (event.type === 'death') recordConsequence(event.entityId)
})
// The driver names the entity. Across a worker boundary a command cannot
// return a value, so do not rely on the id `spawn` hands back.
world.spawn({ id: 'witness', kind: 'npc', position: { x: 5, y: 0, z: 0 } })
world.steer('witness', { fleeFrom: 'player' }) // advisory: the sim may be late or ignore it
```

`setIntent` is deprecated: the intent is stored and nothing reads it, so an entity
given only an intent does not move. `steer` is what the sim honours.

Every query (`getState`, `getEntity`, `query`) returns a **copy**. Writing to
one changes nothing, in-process or across a worker.

## Hard rules baked into these types

- **The simulation is narrative-blind.** There is no `plot`, `quest`,
  `objective`, or `mission` vocabulary here, by design. The simulation reports
  *what physically happened*; it never judges what it completed.
- **The driver is never load-bearing.** A simulation built on this contract
  runs as a complete sandbox with no driver attached. Intents are *advisory*.
- **Events are commitments, not considerations.** The stream carries
  intentional acts (interacted, picked up, chose, died) — never proximity or
  "the player walked near X". Walking past a witness is no story beat; talking
  to them is. Withholding proximity forces the driver to read engagement, not
  loitering.
- **Events are best-effort.** Delivery is not guaranteed; the stream may drop
  under load. A *dropped* event is silent (no harm). A *delivered* event the
  driver can't place is the only signal worth worrying about.
- **Query is truth; events are hints.** `subscribe` is a cheap, lossy push
  ("maybe look"). Before a consequential decision, the driver `getState`/
  `getEntity` to verify ("actually check"). That makes lossy events safe.
- **Stable identity round-trips.** The `EntityId` the driver gets from `spawn`
  is the exact id that comes back in events — so the driver recognizes its own
  fingerprints. An optional opaque `ref` rides along untouched by the sim.
- **Time crosses the boundary; the sim owns the clock.** `WorldState.now` is
  the one continuous quantity the driver needs — all inference-from-absence
  ("it's been a while and nothing happened") is built on it.
- **The simulation NEVER grows a rules engine.** Physical questions are answered
  deterministically — did the missile hit, did the round penetrate, could the
  airframe make that turn — and stay that way. (NPC *imperfection* is seeded
  randomness in a behaviour model; that is not the same thing.) The driver
  adjudicates everything **unmodeled**: the improvised, the social, the ambiguous.
  *"Just add a skill check"* is exactly how narrative vocabulary creeps into a
  narrative-blind simulation — the same failure as adding an `isClue` field. If the
  driver needs to adjudicate something the sim doesn't model, then **the driver
  adjudicates it**; the sim does not learn to.

## Running and testing a driver

A driver belongs off the frame thread, and every rule above is what makes that safe:
advisory intents survive arriving late, best-effort events can be shed rather than
queued, and "query is truth" survives the round trip. A driver can be tested as a
black box with no renderer: the real store, seeded synthetic players, and a lossy,
reordering transport. [min-sim-conformance](/min-sim-conformance/) pins the
coordinate-free surface for any implementation.
*/
/*{ "parent": "world-sim", "order": 10 }*/
export {};
//# sourceMappingURL=world-contract.js.map