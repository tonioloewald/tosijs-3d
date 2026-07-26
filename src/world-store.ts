/*#
# world-store

A pure, Babylon-free, deterministic reference implementation of [[world-contract]].

It is the **systemic spine** of the simulation: it holds the serializable
`WorldState`, resolves systemic causality (interactions, pickups, damage) in
itself with no external blessing, emits best-effort events, and answers
queries. A Babylon scene is later a *view* reconciled from this state — the
store never imports a 3D engine, so it is fully unit-testable and can host a
headless driver.

## Demo

The store holds state; a [world-view](?world-view.ts) reconciles one mesh per entity from it every
frame — **data flows one way, `store → meshes`**. Here we spawn a few entities and move one in the
STORE; its cube follows. The render layer can never desync the sim.

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, WorldStore, WorldView } from 'tosijs-3d'

const store = new WorldStore()              // a 'player' entity exists at the origin
store.spawn({ kind: 'npc', position: { x: -3, y: 0.9, z: 1 } })
const walker = store.spawn({ kind: 'npc', position: { x: 3, y: 0.9, z: -1 } })
store.spawn({ kind: 'item', position: { x: 0, y: 0.5, z: 3 } })

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, 16, new BABYLON.Vector3(0, 0.5, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      new WorldView(el.scene, store)         // capsules for characters, boxes for objects
      let t = 0
      el.scene.onBeforeRenderObservable.add(() => {
        t += el.scene.getEngine().getDeltaTime() / 1000
        store.moveEntity(walker, { x: Math.cos(t) * 3, y: 0.9, z: Math.sin(t) * 3 })
      })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 24, height: 24, texture: 'checker', textureTiles: 12 }),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Two method groups make the boundary legible in code:

- **`WorldApi` methods** — what an external driver (e.g. a narrative engine)
  may call.
- **simulation methods** — what the engine's own gameplay systems (player
  input, an interaction system, combat) call. A driver must NOT call these;
  they represent the player and world acting.

Determinism: ids come from a counter and time advances only via `tick()` — no
`Date.now`/`Math.random` — so the same inputs always produce the same trace.
*/
/*{ "parent": "World Sim" }*/

import type {
  EntityId,
  EntityIntent,
  EventHandler,
  SimulationEvent,
  SpawnSpec,
  Unsubscribe,
  WorldEntity,
  WorldState,
  Zone,
  ZoneId,
  // coordinate-free surface (MinSimApi extends WorldApi)
  MinSimApi,
  Place,
  Portal,
  PlacedEntity,
  Anchor,
  SteerTarget,
  Choice,
  SchematicView,
  Proximity,
  EntityKind,
  PlaceId,
  PortalId,
  ChoiceId,
} from './world-contract'
import {
  proximityRung,
  routePortals,
  containmentPath,
  rungNominal,
} from './world-topology'

const PLAYER_ID: EntityId = 'player'

function distance(a: { x: number; y: number; z: number }, b: typeof a): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export class WorldStore implements MinSimApi {
  private state: WorldState
  private handlers = new Set<EventHandler>()
  private nextId = 1
  /** Per-entity zone membership, so we only emit on a fresh boundary crossing. */
  private occupancy = new Map<EntityId, Set<ZoneId>>()

  // --- coordinate-free surface (MinSimApi) ---------------------------------
  // The place graph + membership + relational movement/choice state. The sim-private GEOMETRY that
  // powers proximity/schematic stays on `entity.position` (a Vec3) — never crossing the contract.
  // Additive over the flat Vec3+zones surface during the transition; Vec3 retires at B-SIM-1.
  private places = new Map<PlaceId, Place>()
  private portals = new Map<PortalId, Portal>()
  private entityPlace = new Map<EntityId, PlaceId>()
  private labels = new Map<EntityId, string>()
  private steers = new Map<EntityId, SteerTarget>()
  private choices = new Map<ChoiceId, Choice>()

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
    this._resolveSteers(deltaSeconds)
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

  // --- MinSimApi: the coordinate-free surface ------------------------------
  // Topology + a qualitative distance ladder cross the seam; the geometry that computes them
  // (`entity.position`, a Vec3) never does. The pure maths lives in world-topology.ts.

  definePlace(place: Place): void {
    this.places.set(place.id, { ...place })
  }

  definePortal(portal: Portal): void {
    this.portals.set(portal.id, { ...portal })
  }

  placeEntity(
    spec: { id: EntityId; kind: EntityKind; label: string; ref?: unknown },
    at: Anchor
  ): void {
    const id = this.spawn({
      id: spec.id,
      kind: spec.kind,
      position: this._anchorPosition(at),
      ref: spec.ref,
    })
    this.entityPlace.set(id, at.place)
    this.labels.set(id, spec.label)
  }

  /** Set or (with null) clear relational steering — resolved each `tick` (approach/flee/travel). */
  steer(id: EntityId, target: SteerTarget | null): void {
    if (target == null) this.steers.delete(id)
    else this.steers.set(id, { ...target })
  }

  /** Move through a portal → change place, land near the new place's origin, emit `placeEntered`. */
  traverse(id: EntityId, portal: PortalId): void {
    const p = this.portals.get(portal)
    if (p == null || p.locked) return
    const here = this.entityPlace.get(id)
    const dest = p.from === here ? p.to : p.to === here ? p.from : null
    if (dest == null) return // portal isn't adjacent to where the entity actually is
    this.entityPlace.set(id, dest)
    const ent = this.state.entities[id]
    if (ent != null) ent.position = this._placeOrigin(dest)
    this.emit({
      type: 'placeEntered',
      at: this.state.now,
      entityId: id,
      placeId: dest,
    })
  }

  presentChoice(choice: Choice): void {
    this.choices.set(choice.id, {
      ...choice,
      options: choice.options.map((o) => ({ ...o })),
    })
  }

  /**
   * The player's pick → emits `choiceMade` (mirrors `chooseConversation`). The sim reports the
   * pick; it NEVER resolves the choice — adjudication is the driver's. Not part of `MinSimApi`
   * (which is driver-facing: `presentChoice`); this is the player-side act.
   */
  chooseOption(choiceId: ChoiceId, optionId: string): void {
    const c = this.choices.get(choiceId)
    if (c == null || !c.options.some((o) => o.id === optionId)) return
    this.choices.delete(choiceId)
    this.emit({ type: 'choiceMade', at: this.state.now, choiceId, optionId })
  }

  placeOf(id: EntityId): PlaceId {
    return this.entityPlace.get(id) ?? ''
  }

  contentsOf(place: PlaceId): PlacedEntity[] {
    const out: PlacedEntity[] = []
    for (const [id, p] of this.entityPlace)
      if (p === place) out.push(this._placed(id))
    return out
  }

  portalsOf(place: PlaceId): Portal[] {
    return [...this.portals.values()].filter(
      (p) => p.from === place || p.to === place
    )
  }

  route(
    from: PlaceId,
    to: PlaceId
  ): { portals: PortalId[]; cost: number } | null {
    return routePortals([...this.portals.values()], from, to)
  }

  proximity(a: EntityId, b: EntityId): Proximity {
    if (a === b) return 'same-spot'
    const pa = this.entityPlace.get(a)
    const pb = this.entityPlace.get(b)
    if (pa == null || pb == null || pa !== pb) return 'elsewhere'
    const ea = this.state.entities[a]
    const eb = this.state.entities[b]
    if (ea == null || eb == null) return 'elsewhere'
    const extent = this.places.get(pa)?.shape.extent ?? 'small'
    return proximityRung(distance(ea.position, eb.position), extent)
  }

  schematic(place: PlaceId, observer?: EntityId): SchematicView {
    const p = this.places.get(place)
    const shape = p?.shape ?? {
      enclosure: 'open',
      extent: 'small',
      dimensionality: 'planar',
      structure: 'natural',
    }
    const obs = observer ?? this.state.playerId
    const obsHere = this.entityPlace.get(obs) === place
    return {
      place: {
        id: place,
        label: p?.label ?? place,
        kind: p?.kind ?? 'place',
        shape,
      },
      path: containmentPath(this.places, place),
      exits: this.portalsOf(place).map((pt) => {
        const to = pt.from === place ? pt.to : pt.from
        return {
          portal: pt.id,
          label: pt.label,
          to,
          toLabel: this.places.get(to)?.label ?? to,
          locked: pt.locked,
        }
      }),
      // each thing in the place, ranked relative to the observer; if the observer isn't in this
      // place, its contents read `present` (you can see them, but you're not among them)
      contents: this.contentsOf(place).map((pe) => ({
        id: pe.id,
        kind: pe.kind,
        label: pe.label,
        proximity:
          pe.id === obs
            ? 'same-spot'
            : obsHere
            ? this.proximity(obs, pe.id)
            : 'present',
      })),
    }
  }

  // --- coordinate-free helpers (sim-private geometry) ----------------------

  private _placed(id: EntityId): PlacedEntity {
    const e = this.state.entities[id]
    return {
      id,
      place: this.entityPlace.get(id) ?? '',
      kind: (e?.kind as EntityKind) ?? 'prop',
      label: this.labels.get(id) ?? id,
      ref: e?.ref,
    }
  }

  /** A deterministic sim-private origin per place, spread far apart so places never overlap in the
   * shared internal space (absolute position is irrelevant — proximity is intra-place). */
  private _placeOrigin(place: PlaceId): { x: number; y: number; z: number } {
    let h = 0
    for (let i = 0; i < place.length; i++)
      h = (h * 31 + place.charCodeAt(i)) | 0
    return { x: (h % 997) * 1000, y: 0, z: (((h >> 5) % 997) + 997) * 1000 }
  }

  /** Turn a relational `Anchor` into a sim-private position: near an entity at a rung, else spread
   * around the place origin. Golden-angle placement keeps a crowd from stacking on one point. */
  private _anchorPosition(at: Anchor): { x: number; y: number; z: number } {
    const extent = this.places.get(at.place)?.shape.extent ?? 'small'
    const n = this.contentsOf(at.place).length
    const ang = n * 2.399963 // golden angle → even spread, deterministic in placement order
    if (at.near != null && this.entityPlace.get(at.near) === at.place) {
      const near = this.state.entities[at.near]
      if (near != null) {
        // `elsewhere` is a different-place fact, not a placement rung — default to `reach`
        const rung = at.at != null && at.at !== 'elsewhere' ? at.at : 'reach'
        const d = rungNominal(rung, extent)
        return {
          x: near.position.x + Math.cos(ang) * d,
          y: near.position.y,
          z: near.position.z + Math.sin(ang) * d,
        }
      }
    }
    const base = this._placeOrigin(at.place)
    const r = 1 + n * 0.5
    return {
      x: base.x + Math.cos(ang) * r,
      y: 0,
      z: base.z + Math.sin(ang) * r,
    }
  }

  /** Resolve active steers each tick: approach an entity, flee one, or walk toward a place (one
   * portal hop per tick). Coarse on purpose — the point is that PROXIMITY changes, not kinematics. */
  private _resolveSteers(dt: number): void {
    const SPEED = 3 // sim units / sec
    for (const [id, target] of this.steers) {
      const e = this.state.entities[id]
      if (e == null) continue

      // travel toward a place: hop the next portal on the route until we're there
      if (target.toPlace != null) {
        const here = this.entityPlace.get(id)
        if (here != null && here !== target.toPlace) {
          const r = this.route(here, target.toPlace)
          if (r != null && r.portals.length > 0) {
            this.traverse(id, r.portals[0])
            continue
          }
        }
      }

      // approach / flee an entity in the same internal space
      let goalId: EntityId | undefined
      let flee = false
      if (target.fleeFrom != null) {
        goalId = target.fleeFrom
        flee = true
      } else if (target.toEntity != null) {
        goalId = target.toEntity
      }
      const goal = goalId != null ? this.state.entities[goalId] : undefined
      if (goal == null) continue

      const dx = goal.position.x - e.position.x
      const dz = goal.position.z - e.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < 1e-6 && !flee) continue
      const step = flee ? SPEED * dt : Math.min(SPEED * dt, dist) // approach: don't overshoot
      const sign = flee ? -1 : 1
      const ux = dist < 1e-6 ? 1 : dx / dist
      const uz = dist < 1e-6 ? 0 : dz / dist
      e.position.x += ux * step * sign
      e.position.z += uz * step * sign
    }
  }
}
