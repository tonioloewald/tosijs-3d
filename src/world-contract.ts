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
/*{ "parent": "World Sim" }*/

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

export type EventHandler = (event: SimulationEvent) => void
/** Call to stop receiving events. */
export type Unsubscribe = () => void

/** What the driver supplies to bring an entity into the world. */
export type SpawnSpec = {
  kind: EntityKind
  position: Vec3
  /** Optional caller-supplied id; the sim generates a stable one otherwise. */
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
  spawn(spec: SpawnSpec): EntityId
  /** Remove an entity from the world. Symmetric with spawn; idempotent. */
  forget(id: EntityId): void
  /** Set or (with null) clear advisory steering for an entity. */
  setIntent(id: EntityId, intent: EntityIntent | null): void
  defineZone(id: ZoneId, zone: Zone): void
  removeZone(id: ZoneId): void

  // queries (authoritative)
  getState(): Readonly<WorldState>
  getEntity(id: EntityId): Readonly<WorldEntity> | undefined
  query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[]

  // events (best-effort)
  subscribe(handler: EventHandler): Unsubscribe
}
