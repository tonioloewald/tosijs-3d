import type { EntityId, EntityIntent, EventHandler, SpawnSpec, Unsubscribe, WorldApi, WorldEntity, WorldState, Zone, ZoneId } from './world-contract';
export declare class WorldStore implements WorldApi {
    private state;
    private handlers;
    private nextId;
    /** Per-entity zone membership, so we only emit on a fresh boundary crossing. */
    private occupancy;
    constructor();
    spawn(spec: SpawnSpec): EntityId;
    forget(id: EntityId): void;
    setIntent(id: EntityId, intent: EntityIntent | null): void;
    defineZone(id: ZoneId, zone: Zone): void;
    removeZone(id: ZoneId): void;
    getState(): Readonly<WorldState>;
    getEntity(id: EntityId): Readonly<WorldEntity> | undefined;
    query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[];
    subscribe(handler: EventHandler): Unsubscribe;
    /**
     * Deliver an event to current subscribers. Best-effort by contract: a real
     * engine may throttle or drop these. A handler that throws does not break
     * the simulation or starve other handlers.
     */
    private emit;
    /** Advance sim-time. The store is the only clock the driver ever sees. */
    tick(deltaSeconds: number): void;
    /** Move an entity, emitting zoneEntered for any newly-entered driver zone. */
    moveEntity(id: EntityId, position: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * A definite, intentional engagement (the commitment, not the approach).
     * Stamps lastInteractedAt and emits an interaction event referencing the
     * target's stable id — the fingerprint a driver recognizes.
     */
    interact(actorId: EntityId, targetId: EntityId): void;
    chooseConversation(actorId: EntityId, targetId: EntityId, optionId: string): void;
    /** Move an item entity out of the world and into an actor's inventory. */
    pickUp(actorId: EntityId, itemId: EntityId): void;
    /** Systemic damage. Resolves death in-engine and emits it; no blessing needed. */
    applyDamage(targetId: EntityId, amount: number, killerId?: EntityId): void;
}
//# sourceMappingURL=world-store.d.ts.map