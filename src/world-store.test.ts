import { describe, test, expect } from 'bun:test'
import { WorldStore } from './world-store'
import type {
  EntityId,
  SimulationEvent,
  Vec3,
  WorldApi,
} from './world-contract'

const HOURS = 3600
const WITNESS_TIMEOUT = 2 * HOURS

/**
 * A throwaway stand-in for an external narrative driver. It only ever touches
 * the WorldApi — never the WorldStore's simulation methods — proving the
 * boundary. It seeds significant entities, recognizes its own fingerprints in
 * the event stream, ignores ambient events, and infers disinterest from
 * time + the absence of engagement (verified by query before acting).
 */
class FakeDirector {
  seeded = new Map<EntityId, { ref: unknown; seededAt: number }>()
  engaged = new Set<EntityId>()
  abandoned = new Set<EntityId>()
  ignored: SimulationEvent[] = []
  private unsubscribe: () => void

  constructor(private api: WorldApi) {
    this.unsubscribe = api.subscribe((event) => this.onEvent(event))
  }

  dispose() {
    this.unsubscribe()
  }

  seedWitness(position: Vec3, ref: unknown): EntityId {
    const id = this.api.spawn({
      kind: 'npc',
      position,
      ref,
      components: {
        interactable: { promptId: 'talk', locked: false },
        faction: { id: 'civilian', dispositionToPlayer: 0 },
      },
    })
    this.seeded.set(id, { ref, seededAt: this.api.getState().now })
    return id
  }

  private onEvent(event: SimulationEvent) {
    // Recognize a fingerprint: an intentional act against something we seeded.
    if (event.type === 'interaction' && this.seeded.has(event.targetId)) {
      this.engaged.add(event.targetId)
      // React advisorily — keep the witness put while we talk.
      this.api.setIntent(event.targetId, { behavior: 'stay' })
      return
    }
    // Anything we can't place is ambient noise to us (a random crate pickup).
    this.ignored.push(event)
  }

  /** Periodic deliberation — the driver's slow clock, not the render loop. */
  consider() {
    const { now } = this.api.getState()
    for (const [id, record] of this.seeded) {
      if (this.engaged.has(id) || this.abandoned.has(id)) continue
      if (now - record.seededAt < WITNESS_TIMEOUT) continue
      // Consequential move — verify by query rather than trust the lossy stream.
      const entity = this.api.getEntity(id)
      if (entity && entity.lastInteractedAt === undefined) {
        this.api.forget(id)
        this.abandoned.add(id)
      }
    }
  }
}

describe('world-store / fake-director loop', () => {
  test('the driver recognizes its own fingerprints', () => {
    const world = new WorldStore()
    const director = new FakeDirector(world)
    const witness = director.seedWitness(
      { x: 5, y: 0, z: 5 },
      { role: 'witness' }
    )

    // The player engages — a commitment, not a fly-by.
    world.interact(world.getState().playerId, witness)

    expect(director.engaged.has(witness)).toBe(true)
    // It reacted advisorily; the intent is readable in the driver-owned slice.
    expect(world.getState().intents[witness]?.behavior).toBe('stay')
    director.dispose()
  })

  test('approaching without engaging tells the driver nothing', () => {
    const world = new WorldStore()
    const director = new FakeDirector(world)
    const witness = director.seedWitness(
      { x: 5, y: 0, z: 5 },
      { role: 'witness' }
    )

    // Player walks right up to the witness and loiters — but never interacts.
    world.moveEntity(world.getState().playerId, { x: 5, y: 0, z: 4.9 })

    expect(director.engaged.has(witness)).toBe(false)
    expect(director.ignored).toHaveLength(0) // proximity isn't even an event
    director.dispose()
  })

  test('the driver ignores ambient events it did not seed', () => {
    const world = new WorldStore()
    const director = new FakeDirector(world)

    // The engine (not the driver) places a mundane crate the story never knew about.
    const crate = world.spawn({ kind: 'item', position: { x: 1, y: 0, z: 0 } })
    world.pickUp(world.getState().playerId, crate)

    expect(director.ignored).toHaveLength(1)
    expect(director.ignored[0].type).toBe('pickup')
    expect(director.engaged.size).toBe(0)
    director.dispose()
  })

  test('disinterest is inferred from time + absence, verified by query', () => {
    const world = new WorldStore()
    const director = new FakeDirector(world)
    const witness = director.seedWitness(
      { x: 5, y: 0, z: 5 },
      { role: 'witness' }
    )

    // Nothing happens for two hours of sim-time (the one continuous signal).
    director.consider()
    expect(world.getEntity(witness)).toBeDefined() // too soon

    world.tick(WITNESS_TIMEOUT + 1)
    director.consider()

    expect(director.abandoned.has(witness)).toBe(true)
    expect(world.getEntity(witness)).toBeUndefined() // forgotten
    director.dispose()
  })

  test('an engaged witness is never abandoned, even long after', () => {
    const world = new WorldStore()
    const director = new FakeDirector(world)
    const witness = director.seedWitness(
      { x: 5, y: 0, z: 5 },
      { role: 'witness' }
    )

    world.interact(world.getState().playerId, witness)
    world.tick(WITNESS_TIMEOUT * 5)
    director.consider()

    expect(world.getEntity(witness)).toBeDefined()
    expect(director.abandoned.has(witness)).toBe(false)
    director.dispose()
  })

  test('zone entry is a fingerprinted event; exit is silent', () => {
    const world = new WorldStore()
    const events: SimulationEvent[] = []
    world.subscribe((e) => events.push(e))
    world.defineZone('clearing', { center: { x: 10, y: 0, z: 0 }, radius: 3 })
    const player = world.getState().playerId

    world.moveEntity(player, { x: 10, y: 0, z: 0 }) // enter
    world.moveEntity(player, { x: 10, y: 0, z: 1 }) // still inside — no re-fire
    world.moveEntity(player, { x: 100, y: 0, z: 0 }) // exit — silent

    const zoneEvents = events.filter((e) => e.type === 'zoneEntered')
    expect(zoneEvents).toHaveLength(1)
  })
})

describe('world-store / standalone (no driver)', () => {
  test('the sim resolves systemic causality with no driver attached', () => {
    const world = new WorldStore()
    const player = world.getState().playerId

    const loot = world.spawn({ kind: 'item', position: { x: 0, y: 0, z: 1 } })
    world.pickUp(player, loot)
    expect(world.getEntity(loot)).toBeUndefined()
    expect(world.getEntity(player)?.components.inventory).toEqual([
      { itemId: loot, quantity: 1 },
    ])

    const guard = world.spawn({
      kind: 'npc',
      position: { x: 2, y: 0, z: 0 },
      components: { health: { current: 30, max: 30, dead: false } },
    })
    world.applyDamage(guard, 30, player)
    expect(world.getEntity(guard)?.components.health?.dead).toBe(true)
  })
})
