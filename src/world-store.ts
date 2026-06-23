/*#
# world-store

A pure, Babylon-free, deterministic reference implementation of [[world-contract]].

It is the **systemic spine** of the simulation: it holds the serializable
`WorldState`, resolves systemic causality (interactions, pickups, damage) in
itself with no external blessing, emits best-effort events, and answers
queries. A Babylon scene is later a *view* reconciled from this state — the
store never imports a 3D engine, so it is fully unit-testable and can host a
headless driver.

Two method groups make the boundary legible in code:

- **`WorldApi` methods** — what an external driver (e.g. a narrative engine)
  may call.
- **simulation methods** — what the engine's own gameplay systems (player
  input, an interaction system, combat) call. A driver must NOT call these;
  they represent the player and world acting.

Determinism: ids come from a counter and time advances only via `tick()` — no
`Date.now`/`Math.random` — so the same inputs always produce the same trace.
*/

import type {
  EntityId,
  EntityIntent,
  EventHandler,
  SimulationEvent,
  SpawnSpec,
  Unsubscribe,
  WorldApi,
  WorldEntity,
  WorldState,
  Zone,
  ZoneId,
} from './world-contract'

const PLAYER_ID: EntityId = 'player'

function distance(a: { x: number; y: number; z: number }, b: typeof a): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export class WorldStore implements WorldApi {
  private state: WorldState
  private handlers = new Set<EventHandler>()
  private nextId = 1
  /** Per-entity zone membership, so we only emit on a fresh boundary crossing. */
  private occupancy = new Map<EntityId, Set<ZoneId>>()

  constructor() {
    this.state = {
      now: 0,
      playerId: PLAYER_ID,
      entities: {
        [PLAYER_ID]: {
          id: PLAYER_ID,
          kind: 'player',
          position: { x: 0, y: 0, z: 0 },
          components: {
            health: { current: 100, max: 100, dead: false },
            inventory: [],
          },
        },
      },
      intents: {},
      zones: {},
    }
  }

  // --- WorldApi: commands --------------------------------------------------

  spawn(spec: SpawnSpec): EntityId {
    const id = spec.id ?? `e${this.nextId++}`
    this.state.entities[id] = {
      id,
      kind: spec.kind,
      position: { ...spec.position },
      ref: spec.ref,
      components: spec.components ?? {},
    }
    return id
  }

  forget(id: EntityId): void {
    delete this.state.entities[id]
    delete this.state.intents[id]
    this.occupancy.delete(id)
  }

  setIntent(id: EntityId, intent: EntityIntent | null): void {
    if (intent === null) delete this.state.intents[id]
    else this.state.intents[id] = intent
  }

  defineZone(id: ZoneId, zone: Zone): void {
    this.state.zones[id] = zone
  }

  removeZone(id: ZoneId): void {
    delete this.state.zones[id]
  }

  // --- WorldApi: queries (authoritative) -----------------------------------

  getState(): Readonly<WorldState> {
    return this.state
  }

  getEntity(id: EntityId): Readonly<WorldEntity> | undefined {
    return this.state.entities[id]
  }

  query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[] {
    return Object.values(this.state.entities).filter(predicate)
  }

  // --- WorldApi: events (best-effort) --------------------------------------

  subscribe(handler: EventHandler): Unsubscribe {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /**
   * Deliver an event to current subscribers. Best-effort by contract: a real
   * engine may throttle or drop these. A handler that throws does not break
   * the simulation or starve other handlers.
   */
  private emit(event: SimulationEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch {
        // best-effort: a misbehaving consumer never destabilizes the sim
      }
    }
  }

  // --- Simulation methods: the player and world acting ---------------------

  /** Advance sim-time. The store is the only clock the driver ever sees. */
  tick(deltaSeconds: number): void {
    this.state.now += deltaSeconds
  }

  /** Move an entity, emitting zoneEntered for any newly-entered driver zone. */
  moveEntity(
    id: EntityId,
    position: { x: number; y: number; z: number }
  ): void {
    const entity = this.state.entities[id]
    if (!entity) return
    entity.position = { ...position }

    const inside = this.occupancy.get(id) ?? new Set<ZoneId>()
    for (const [zoneId, zone] of Object.entries(this.state.zones)) {
      const within = distance(entity.position, zone.center) <= zone.radius
      if (within && !inside.has(zoneId)) {
        inside.add(zoneId)
        this.emit({
          type: 'zoneEntered',
          at: this.state.now,
          entityId: id,
          zoneId,
        })
      } else if (!within && inside.has(zoneId)) {
        inside.delete(zoneId) // exit is silent — only entry is a beat
      }
    }
    this.occupancy.set(id, inside)
  }

  /**
   * A definite, intentional engagement (the commitment, not the approach).
   * Stamps lastInteractedAt and emits an interaction event referencing the
   * target's stable id — the fingerprint a driver recognizes.
   */
  interact(actorId: EntityId, targetId: EntityId): void {
    const target = this.state.entities[targetId]
    if (!target) return
    if (target.components.interactable?.locked) return
    target.lastInteractedAt = this.state.now
    this.emit({ type: 'interaction', at: this.state.now, actorId, targetId })
  }

  chooseConversation(
    actorId: EntityId,
    targetId: EntityId,
    optionId: string
  ): void {
    if (!this.state.entities[targetId]) return
    this.emit({
      type: 'conversationChoice',
      at: this.state.now,
      actorId,
      targetId,
      optionId,
    })
  }

  /** Move an item entity out of the world and into an actor's inventory. */
  pickUp(actorId: EntityId, itemId: EntityId): void {
    const actor = this.state.entities[actorId]
    const item = this.state.entities[itemId]
    if (!actor || !item) return
    const inventory = (actor.components.inventory ??= [])
    const existing = inventory.find((entry) => entry.itemId === itemId)
    if (existing) existing.quantity += 1
    else inventory.push({ itemId, quantity: 1 })
    delete this.state.entities[itemId]
    this.occupancy.delete(itemId)
    this.emit({ type: 'pickup', at: this.state.now, actorId, itemId })
  }

  /** Systemic damage. Resolves death in-engine and emits it; no blessing needed. */
  applyDamage(targetId: EntityId, amount: number, killerId?: EntityId): void {
    const target = this.state.entities[targetId]
    const health = target?.components.health
    if (!health || health.dead) return
    health.current = Math.max(0, health.current - amount)
    if (health.current === 0) {
      health.dead = true
      this.emit({
        type: 'death',
        at: this.state.now,
        entityId: targetId,
        killerId,
      })
    }
  }
}
