/*#
# world-contract

The boundary between the **simulation** (tosijs-3d) and an **external driver**
(an AI narrative engine, a scripted demo, anything). The simulation is the
authority on physical and systemic reality; the driver decides what any of it
*means*. These two halves never call each other's functions — they share a
serializable `WorldState`, a stream of best-effort `SimulationEvent`s, and the
`WorldApi` surface below.

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
*/
export {};
//# sourceMappingURL=world-contract.js.map