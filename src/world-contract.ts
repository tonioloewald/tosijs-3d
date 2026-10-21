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

/** Plain {x, y, z} vector — no Babylon dependency, matches the pure modules. */
export type Vec3 = { x: number; y: number; z: number }

export type EntityId = string
export type ZoneId = string

/**
 * Coarse, narrative-blind classification. The union documents the common
 * kinds; `(string & {})` keeps autocomplete while allowing any string, so a
 * driver can introduce new kinds without editing this file.
 */
export type EntityKind =
  | 'player'
  | 'npc'
  | 'item'
  | 'prop'
  | 'container'
  | (string & {})

// --- Components: systemic facts about an entity (engine-owned) -------------

export type HealthComponent = { current: number; max: number; dead: boolean }

/** itemId is a stable EntityId so the driver can correlate held items. */
export type InventoryEntry = { itemId: EntityId; quantity: number }

export type FactionComponent = {
  id: string
  /** -1 (hostile) .. 0 (neutral) .. 1 (friendly). Systemic, not narrative. */
  dispositionToPlayer: number
}

export type InteractableComponent = {
  /** Opaque handle for the prompt the UI shows ("talk", "open"…). */
  promptId?: string
  locked: boolean
}

export type EntityComponents = {
  health?: HealthComponent
  inventory?: InventoryEntry[]
  faction?: FactionComponent
  interactable?: InteractableComponent
}

/** An entity as the simulation knows it — physical + systemic facts only. */
export type WorldEntity = {
  id: EntityId
  kind: EntityKind
  position: Vec3
  /**
   * Opaque, driver-owned. The simulation stores and echoes it but NEVER reads
   * or interprets it — it carries no narrative meaning to the sim.
   */
  ref?: unknown
  /**
   * Systemic stamp: sim-time of the last interaction, or undefined if never.
   * Lets the driver verify engagement by query instead of trusting the lossy
   * event stream. Narrative-blind — it just means "this was interacted with".
   */
  lastInteractedAt?: number
  components: EntityComponents
}

// --- Driver-owned slice: advisory intents + driver-defined zones -----------

export type Behavior = 'idle' | 'patrol' | 'flee' | 'follow' | 'stay'

/**
 * Advisory steering the driver layers over an entity's autonomous behavior.
 * Valid-until-changed (NOT a per-frame command). The sim satisfies goals
 * smoothly; it is free to be late or to ignore an intent it cannot honor.
 */
export type EntityIntent = {
  /** Smooth navigation target. null clears it. */
  steeringGoal?: Vec3 | null
  behavior?: Behavior
  /**
   * Hard mechanical override — reserved for the rare beat that genuinely needs
   * determinism. Prefer steeringGoal/behavior; snapping looks bad in motion.
   */
  lock?: {
    disableInteraction?: boolean
    forcePosition?: Vec3 | null
  }
}

/** A driver-defined region. Crossing it is a discrete, fingerprinted event. */
export type Zone = { center: Vec3; radius: number }

// --- The shared, serializable world state ----------------------------------

export type WorldState = {
  /** Sim-time in seconds. Engine-owned; the sim is the only clock. */
  now: number
  playerId: EntityId
  /** Engine-owned facts. The player is just an entity of kind 'player'. */
  entities: Record<EntityId, WorldEntity>
  /** Driver-owned, advisory. Absent id = no intent = autonomous default. */
  intents: Record<EntityId, EntityIntent>
  /** Driver-owned, narrative-blind regions. */
  zones: Record<ZoneId, Zone>
}

// --- The discrete event stream: intentional acts, best-effort --------------

export type SimulationEvent =
  | { type: 'interaction'; at: number; actorId: EntityId; targetId: EntityId }
  | { type: 'pickup'; at: number; actorId: EntityId; itemId: EntityId }
  | { type: 'drop'; at: number; actorId: EntityId; itemId: EntityId }
  | {
      type: 'conversationChoice'
      at: number
      actorId: EntityId
      targetId: EntityId
      optionId: string
    }
  | {
      type: 'transaction'
      at: number
      sourceId: EntityId
      targetId: EntityId
      itemId: EntityId
      quantity: number
    }
  | { type: 'death'; at: number; entityId: EntityId; killerId?: EntityId }
  | { type: 'zoneEntered'; at: number; entityId: EntityId; zoneId: ZoneId }
  // --- Contract A (coordinate-free surface) — see the section at the end of this file ---
  | { type: 'placeEntered'; at: number; entityId: EntityId; placeId: PlaceId }
  | { type: 'choiceMade'; at: number; choiceId: ChoiceId; optionId: string }

export type EventHandler = (event: SimulationEvent) => void
/** Call to stop receiving events. */
export type Unsubscribe = () => void

/** What the driver supplies to bring an entity into the world. */
export type SpawnSpec = {
  kind: EntityKind
  position: Vec3
  /**
   * Caller-supplied id. Optional for the engine's own systems (the sim
   * generates a stable one); REQUIRED of a driver, see `WorldApi.spawn`.
   */
  id?: EntityId
  /** Opaque, echoed-but-never-read by the sim. */
  ref?: unknown
  components?: EntityComponents
}

/**
 * The surface the driver codes against. Split into three intents:
 *
 * - **commands** mutate the driver-owned slice / entity population (authoritative
 *   for spawn/forget/zones, advisory for intents),
 * - **queries** read authoritative current state (truth),
 * - **events** subscribe to the best-effort push stream (hints).
 *
 * A driver needs nothing else; it never touches Babylon or the render loop.
 */
export interface WorldApi {
  // commands
  /**
   * A driver MUST supply `spec.id`. The returned id is an in-process
   * convenience: across a worker boundary a command cannot return a value, so
   * a driver that relies on it works on the rig and breaks the day it ships.
   */
  spawn(spec: SpawnSpec): EntityId
  /** Remove an entity from the world. Symmetric with spawn; idempotent. */
  forget(id: EntityId): void
  /**
   * Set or (with null) clear advisory steering for an entity. LEGACY: the
   * intent is stored in `state.intents` and nothing reads it. `MinSimApi.steer`
   * is the path the sim honours; an entity given only an intent does not move.
   */
  setIntent(id: EntityId, intent: EntityIntent | null): void
  defineZone(id: ZoneId, zone: Zone): void
  removeZone(id: ZoneId): void

  // queries (authoritative). Each returns a COPY: writing to a result changes
  // nothing in the sim, in-process or across a worker.
  getState(): Readonly<WorldState>
  getEntity(id: EntityId): Readonly<WorldEntity> | undefined
  query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[]

  // events (best-effort)
  subscribe(handler: EventHandler): Unsubscribe
}

// ===========================================================================
// Contract A — the coordinate-free surface
// ---------------------------------------------------------------------------
// The frozen shape from Ariosto's `minimum-sim.md §8`, resolved with the SIM lane
// at the seam (2026-07-20; see ARIOSTO-SIM.md). It is **ADDITIVE**: it sits
// ALONGSIDE the flat `Vec3`/`Zone` surface above during a transition release, so
// the freeze breaks nothing in tosijs-3d. The flat surface — `Vec3`, `position`
// on `WorldEntity`, `Zone`, `zoneEntered`, `defineZone`/`removeZone`, and
// `EntityIntent.steeringGoal: Vec3` — RETIRES at `B-SIM-1`, when `WorldStore`
// migrates off coordinates onto places + proximity.
//
// The rule it expresses: **no coordinate crosses the membrane.** Space is
// TOPOLOGY (the place graph) + QUALITY (the proximity ladder). Precise geometry —
// and everything that reasons over it (NPC AI, steering, pathfinding, sensorium,
// line-of-sight, alertness) — stays wholly sim-private, or a subsystem gets
// smeared across all three parts (architecture.md rule 8 + its corollary).
//
// `WorldStore` still implements the flat `WorldApi`; `MinSimApi` (below) is the
// grown surface a coordinate-free store implements — reference (`place-graph.ts`,
// stays in Ariosto) AND real (`WorldStore` at `B-SIM-1`), proven equal by the
// shared conformance kit. One contract, two stores.
// ===========================================================================

export type PlaceId = string
export type PortalId = string
export type ChoiceId = string

/**
 * A place's QUALITATIVE shape — four adjectives; the sim DERIVES its geometry and
 * mechanics from them (the same move as `ease × score`: describe with adjectives,
 * compute the specifics). `dimensionality` is sim-internal — `discrete` is the
 * default and needs no coordinates; the finer values mean the sim keeps a private
 * coordinate frame that never crosses the membrane.
 */
export type Shape = {
  enclosure: 'open' | 'semi-open' | 'closed' | 'lockable'
  extent: 'intimate' | 'small' | 'medium' | 'large' | 'vast'
  dimensionality: 'discrete' | 'linear' | 'planar' | 'volumetric'
  structure: 'natural' | 'some-structures' | 'built' | 'enclosed'
}

/**
 * The distance ladder — the ONLY spatial quantity that crosses the membrane, and
 * it's an adjective (the spatial `ease × score`). Queried, never pushed (no
 * proximity events). Entity↔entity and INTRA-place only: across places is
 * `elsewhere`; "how far to a place" is topology (`route`), not a rung.
 */
export type Proximity =
  | 'same-spot'
  | 'contact'
  | 'reach'
  | 'obvious'
  | 'noticeable'
  | 'present'
  | 'elsewhere'

export type PlaceKind =
  | 'world'
  | 'region'
  | 'settlement'
  | 'building'
  | 'room'
  | 'place'

/** A node in the containment graph. `parent` gives the zoom path; `shape` derives the rest. */
export type Place = {
  id: PlaceId
  kind: PlaceKind
  parent?: PlaceId
  label: string
  shape: Shape
}

/** An edge in the place graph — a door, gate, road. `cost` is coarse sim-seconds (feasibility is a graph sum, not `Vec3` maths). */
export type Portal = {
  id: PortalId
  from: PlaceId
  to: PlaceId
  locked: boolean
  label: string
  cost: number
}

/** An entity as the coordinate-free surface sees it: IN a place, with a label — no position. */
export type PlacedEntity = {
  id: EntityId
  place: PlaceId
  kind: EntityKind
  label: string
  /** Opaque, driver-owned; echoed, never interpreted. */
  ref?: unknown
}

/** Relational placement — "in the study, near the table" — never a point. */
export type Anchor = { place: PlaceId; near?: EntityId; at?: Proximity }

/** Relational steering — "approach the butler" / "flee the wolf" — never a point. */
export type SteerTarget = {
  toPlace?: PlaceId
  toEntity?: EntityId
  behavior?: Behavior
  fleeFrom?: EntityId
}

/** A labelled set of options surfaced in-world (the "fight / flee" mid-air menu). The sim presents
 * and reports the pick (`choiceMade`); it NEVER resolves the choice — adjudication is the driver's. */
export type Choice = {
  id: ChoiceId
  at: PlaceId | EntityId
  options: { id: string; label: string }[]
}

/**
 * The qualitative read-model of a place — labels + topology + proximity bands,
 * NEVER coordinates. Sim-computed (it has the geometry); the contract only fixes
 * the shape. It is both a debug instrument and the AI player's spatial sensorium.
 */
export type SchematicView = {
  place: { id: PlaceId; label: string; kind: PlaceKind; shape: Shape }
  /** Containment breadcrumb, root → here. */
  path: { id: PlaceId; label: string }[]
  exits: {
    portal: PortalId
    label: string
    to: PlaceId
    toLabel: string
    locked: boolean
  }[]
  /** Everything in the place, each annotated with its rung relative to the `observer`. */
  contents: {
    id: EntityId
    kind: EntityKind
    label: string
    proximity: Proximity
  }[]
}

/**
 * The grown, coordinate-free surface. Extends `WorldApi` with the place graph, the
 * choice primitive, relational movement, and topology/quality reads. Implemented by
 * BOTH stores (Ariosto's reference `place-graph.ts` and, at `B-SIM-1`, tosijs-3d's
 * `WorldStore`); the shared conformance kit proves they behave identically.
 */
export interface MinSimApi extends WorldApi {
  // world-building — the driver stages the board ahead (off-thread-safe)
  definePlace(place: Place): void
  definePortal(portal: Portal): void
  placeEntity(
    spec: { id: EntityId; kind: EntityKind; label: string; ref?: unknown },
    at: Anchor
  ): void

  // movement — relational only; the sim owns the geometry of getting there
  steer(id: EntityId, target: SteerTarget | null): void
  /** Through a door/road → emits `placeEntered`. */
  traverse(id: EntityId, portal: PortalId): void

  // choices — present labels, report the pick (via `choiceMade`); the sim never resolves them
  presentChoice(choice: Choice): void

  // reads — topology + quality, never geometry
  placeOf(id: EntityId): PlaceId
  contentsOf(place: PlaceId): PlacedEntity[]
  portalsOf(place: PlaceId): Portal[]
  /** Portal path + coarse cost between places; null when unreachable. Feasibility as a graph fact. */
  route(
    from: PlaceId,
    to: PlaceId
  ): { portals: PortalId[]; cost: number } | null
  /** A rung on the ladder — INTRA-place, entity↔entity; a quality, not a number. */
  proximity(a: EntityId, b: EntityId): Proximity
  /** The qualitative read-model, proximities relative to `observer` (defaults to the player). */
  schematic(place: PlaceId, observer?: EntityId): SchematicView
}
